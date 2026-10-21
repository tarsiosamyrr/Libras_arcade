import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.CustomEvent = class extends Event { constructor(type, options) { super(type); this.detail = options?.detail; } };

const asModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const dataSource = (await readFile(new URL('../js/data.js', import.meta.url), 'utf8'))
  .replace('import { SUPPORTED_LETTERS } from "./libras.js";',
    "const SUPPORTED_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');");
const dataUrl = asModule(dataSource);
const gameSource = (await readFile(new URL('../js/game.js', import.meta.url), 'utf8'))
  .replace('from "./data.js"', `from "${dataUrl}"`);
const forcaSource = (await readFile(new URL('../js/forca.js', import.meta.url), 'utf8'))
  .replace('from "./data.js"', `from "${dataUrl}"`);
const { Game } = await import(asModule(gameSource));
const { ForcaGame } = await import(asModule(forcaSource));
const uiSource = (await readFile(new URL('../js/ui.js', import.meta.url), 'utf8'))
  .replace('from "./data.js"', `from "${dataUrl}"`)
  .replace('import { MOTION_LETTERS } from "./libras.js";', 'const MOTION_LETTERS = [];');
const { UI } = await import(asModule(uiSource));
const librasSource = (await readFile(new URL('../js/libras.js', import.meta.url), 'utf8'))
  .replace('import { LM, splitHandsByRole } from "./vision.js";',
    'const LM = {}; const splitHandsByRole = () => ({ left: null, right: null });');
const { LibrasEngine } = await import(asModule(librasSource));
let visionFixtureId = 0;

async function visionFixture() {
  const source = (await readFile(new URL('../js/vision.js', import.meta.url), 'utf8'))
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@0\.10\.14";/,
      'const { HandLandmarker, FilesetResolver } = globalThis.__visionDeps;');
  let createCount = 0;
  let closeCount = 0;
  let detectCount = 0;
  let mediaCount = 0;
  const tracks = [];
  const frames = new Map();
  let nextFrame = 0;
  globalThis.__visionDeps = {
    FilesetResolver: { forVisionTasks: async () => ({}) },
    HandLandmarker: { createFromOptions: async () => {
      createCount++;
      return { detectForVideo: () => { detectCount++; return { landmarks: [] }; }, close: () => { closeCount++; } };
    } }
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => {
    mediaCount++;
    const track = { readyState: 'live', stop() { this.readyState = 'ended'; } };
    tracks.push(track);
    return { getTracks: () => [track] };
  } } } });
  globalThis.requestAnimationFrame = (fn) => { frames.set(++nextFrame, fn); return nextFrame; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  const vision = await import(`${asModule(source)}#fixture-${++visionFixtureId}`);
  const video = { srcObject: null, readyState: 2, currentTime: 1, pause() {}, play: async () => {} };
  return { vision, video, frames, tracks, step(now) {
    const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(now));
  }, counts: () => ({ createCount, closeCount, detectCount, mediaCount }) };
}

test('camera and model start once, stop tracks and dispose model', async () => {
  const f = await visionFixture();
  await Promise.all([f.vision.loadModel(), f.vision.loadModel()]);
  await Promise.all([f.vision.startCamera(f.video), f.vision.startCamera(f.video)]);
  assert.equal(f.counts().createCount, 1);
  assert.equal(f.counts().mediaCount, 1);
  f.vision.stopCamera(f.video);
  assert.equal(f.tracks[0].readyState, 'ended');
  assert.equal(f.video.srcObject, null);
  f.vision.disposeModel();
  assert.equal(f.counts().closeCount, 1);
});

test('model completing after disposal is closed instead of retained', async () => {
  const f = await visionFixture();
  let complete;
  let closes = 0;
  globalThis.__visionDeps.HandLandmarker.createFromOptions = () => new Promise((resolve) => { complete = resolve; });
  const pending = f.vision.loadModel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof complete, 'function');
  f.vision.disposeModel();
  complete({ close: () => closes++ });
  await assert.rejects(pending, /cancelado/);
  assert.equal(closes, 1);
});

test('stopping during a pending camera request releases its eventual stream', async () => {
  const f = await visionFixture();
  let provide;
  globalThis.navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => { provide = resolve; });
  const pending = f.vision.startCamera(f.video);
  f.vision.stopCamera(f.video);
  const track = { readyState: 'live', stop() { this.readyState = 'ended'; } };
  provide({ getTracks: () => [track] });
  await assert.rejects(pending);
  assert.equal(track.readyState, 'ended');
  assert.equal(f.video.srcObject, null);
});

test('camera play failure and cancellation while waiting for video data release tracks', async () => {
  const f = await visionFixture();
  f.video.play = async () => { throw new Error('play blocked'); };
  await assert.rejects(f.vision.startCamera(f.video), /play blocked/);
  assert.equal(f.tracks[0].readyState, 'ended');
  assert.equal(f.video.srcObject, null);

  const listeners = new Map();
  f.video.readyState = 0;
  f.video.addEventListener = (event, listener) => listeners.set(event, listener);
  f.video.removeEventListener = (event) => listeners.delete(event);
  const pending = f.vision.startCamera(f.video);
  await Promise.resolve();
  f.vision.stopCamera(f.video);
  await assert.rejects(pending, /cancelada/);
  assert.equal(f.tracks[1].readyState, 'ended');
  assert.equal(listeners.size, 0);
});

test('camera cancellation interrupts a pending play promise', { timeout: 1000 }, async () => {
  const f = await visionFixture();
  f.video.play = () => new Promise(() => {});
  const pending = f.vision.startCamera(f.video);
  await new Promise((resolve) => setImmediate(resolve));
  f.vision.stopCamera(f.video);
  await assert.rejects(pending, /cancelada/);
  assert.equal(f.tracks[0].readyState, 'ended');
});

test('detection loop stays single and resets frame state on restart', async () => {
  const f = await visionFixture();
  await f.vision.loadModel();
  let callbacks = 0;
  f.vision.startDetectionLoop(f.video, () => callbacks++);
  f.vision.startDetectionLoop(f.video, () => callbacks++);
  assert.equal(f.frames.size, 1);
  f.step(100);
  assert.equal(callbacks, 1);
  f.vision.stopDetectionLoop();
  assert.equal(f.frames.size, 0);
  f.vision.startDetectionLoop(f.video, () => callbacks++);
  f.step(200);
  assert.equal(callbacks, 2);
  f.vision.stopDetectionLoop();
});

test('camera restart preserves bounded metrics and starts a fresh inference session', async () => {
  const f = await visionFixture();
  await f.vision.loadModel();
  await f.vision.startCamera(f.video);
  f.vision.startDetectionLoop(f.video, () => {});
  f.step(100);
  assert.equal(f.vision.getPerformanceMetrics().processedFrames, 1);
  f.vision.stopCamera(f.video);
  assert.equal(f.frames.size, 0);
  assert.equal(f.tracks[0].readyState, 'ended');

  await f.vision.startCamera(f.video);
  f.vision.startDetectionLoop(f.video, () => {});
  f.step(200);
  const metrics = f.vision.getPerformanceMetrics();
  assert.equal(metrics.processedFrames, 1);
  assert.equal(metrics.samples, 1);
  assert.equal(f.counts().detectCount, 2);
  assert.equal(f.frames.size, 1);
  f.vision.stopCamera(f.video);
});

test('consumer failure stops the loop and is reported once', async () => {
  const f = await visionFixture();
  await f.vision.loadModel();
  let errors = 0;
  f.vision.startDetectionLoop(f.video, () => { throw new Error('render failed'); }, () => errors++);
  f.step(100);
  assert.equal(errors, 1);
  assert.equal(f.frames.size, 0);
});

test('detector failure stops the loop without delivering stale results', async () => {
  const f = await visionFixture();
  globalThis.__visionDeps.HandLandmarker.createFromOptions = async () => ({
    detectForVideo: () => { throw new Error('falha de inferência'); },
    close() {}
  });
  await f.vision.loadModel();
  let results = 0;
  let errors = 0;
  f.vision.startDetectionLoop(f.video, () => results++, () => errors++);
  f.step(100);
  assert.equal(results, 0);
  assert.equal(errors, 1);
  assert.equal(f.frames.size, 0);
  assert.equal(f.vision.getPerformanceMetrics().processedFrames, 0);
});

test('screen suspension clears partial signs and navigation history', () => {
  const engine = new LibrasEngine();
  engine._holdKey = 'A';
  engine._motionKey = 'J';
  engine._motionBuffer = [{ x: 1 }];
  engine._navBuffer = [{ x: 1 }];
  engine.state.letter = 'A';
  engine.state.hands = 1;
  engine.resetTracking();
  assert.equal(engine.state.letter, null);
  assert.equal(engine.state.hands, 0);
  assert.equal(engine._holdKey, null);
  assert.equal(engine._motionKey, null);
  assert.deepEqual(engine._navBuffer, []);
});

test('game stops an old round delay when restarting and pauses its clock', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const game = new Game();
  game.startPractice();
  game.handleSign(game.target);
  game.startWord();
  const target = game.target;
  t.mock.timers.tick(500);
  assert.equal(game.target, target);
  game.pause();
  const left = game.timeLeft;
  t.mock.timers.tick(2000);
  assert.equal(game.timeLeft, left);
  game.resume();
  t.mock.timers.tick(100);
  assert.equal(game.timeLeft, left - 100);
  game.end();
});

test('forca pending advance is cancelled by end and held while paused', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const forca = new ForcaGame();
  forca.start();
  forca._onWin();
  const round = forca.round;
  forca.pause();
  t.mock.timers.tick(2000);
  assert.equal(forca.round, round);
  forca.resume();
  t.mock.timers.tick(1600);
  assert.equal(forca.round, round + 1);
  forca._onWin();
  forca.end();
  t.mock.timers.tick(2000);
  assert.equal(forca.round, round + 1);
});

function withStorage(t, storage) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  t.after(() => { globalThis.localStorage = previous; });
}

function resultsUi(t, game, forca, screen) {
  const previous = globalThis.document;
  const elements = new Map();
  const element = (selector) => {
    if (!elements.has(selector)) {
      const classes = new Set();
      elements.set(selector, {
        textContent: '',
        classList: {
          toggle(name, active) { if (active) classes.add(name); else classes.delete(name); },
          contains: (name) => classes.has(name)
        }
      });
    }
    return elements.get(selector);
  };
  globalThis.document = { querySelector: element };
  t.after(() => { globalThis.document = previous; });
  const ui = Object.create(UI.prototype);
  Object.assign(ui, {
    game, forca, currentScreen: screen, _exitingManually: false,
    libras: { resetTracking() {} },
    homeEl: element('#home'), playEl: element('#play'),
    forcaPlayEl: element('#forca-play'), resultsEl: element('#results'),
    exitBtn: element('#exit-btn'), hintEl: element('#hint-text')
  });
  ui._bindGameEvents();
  ui._bindForcaEvents();
  return { ui, element };
}

test('getItem failure does not prevent creating and ending either game', (t) => {
  withStorage(t, { getItem() { throw new Error('storage blocked'); }, setItem() {} });
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const game = new Game();
  const forca = new ForcaGame();
  let gameEnds = 0;
  let forcaEnds = 0;
  game.addEventListener('sessionend', () => gameEnds++);
  forca.addEventListener('sessionend', () => forcaEnds++);
  game.startPractice();
  forca.start();
  game.end();
  forca.end();
  assert.equal(game.mode, null);
  assert.equal(forca.status, 'idle');
  assert.equal(gameEnds, 1);
  assert.equal(forcaEnds, 1);
  assert.ok(warnings.length >= 2);
});

test('QuotaExceededError keeps the game record in memory and still emits sessionend', (t) => {
  const saved = new Map([['libras-arcade:best-score', '5']]);
  withStorage(t, {
    getItem: (key) => saved.get(key) ?? null,
    setItem() { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }
  });
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const game = new Game();
  let detail;
  game.addEventListener('sessionend', (event) => { detail = event.detail; });
  game.startPractice();
  game.handleSign(game.target);
  game.end();
  assert.equal(game.best, 10);
  assert.equal(detail.best, 10);
  assert.equal(game.mode, null);
  assert.equal(saved.get('libras-arcade:best-score'), '5');
  assert.equal(warnings[0][1].name, 'QuotaExceededError');
  assert.match(warnings[0][0], /recorde/);
  assert.doesNotMatch(warnings[0][0], /câmera/);
});

test('a later session retries a failed record write without losing the higher value', (t) => {
  const saved = new Map();
  let blocked = true;
  withStorage(t, {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => { if (blocked) throw new Error('temporarily blocked'); saved.set(key, value); }
  });
  t.mock.method(console, 'warn', () => {});
  const game = new Game();
  game.startPractice();
  game.handleSign(game.target);
  game.end();
  assert.equal(game.best, 10);
  assert.equal(saved.size, 0);
  blocked = false;
  game.startWord();
  game.end();
  assert.equal(saved.get('libras-arcade:best-score'), '10');
  assert.equal(game.best, 10);
});

test('a recovered read merges the stored record before a pending write', (t) => {
  const saved = new Map([['libras-arcade:best-score', '100']]);
  let blocked = true;
  withStorage(t, {
    getItem: (key) => { if (blocked) throw new Error('read blocked'); return saved.get(key) ?? null; },
    setItem: (key, value) => saved.set(key, value)
  });
  t.mock.method(console, 'warn', () => {});
  const game = new Game();
  game.startPractice();
  game.handleSign(game.target);
  game.end();
  assert.equal(game.best, 10);
  blocked = false;
  game.startPractice();
  game.end();
  assert.equal(game.best, 100);
  assert.equal(saved.get('libras-arcade:best-score'), '100');
});

test('forca continues after failed setItem and retries on end', (t) => {
  const saved = new Map();
  let blocked = true;
  withStorage(t, {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => { if (blocked) throw new Error('write blocked'); saved.set(key, value); }
  });
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const forca = new ForcaGame();
  let wins = 0;
  let ends = 0;
  forca.addEventListener('win', () => wins++);
  forca.addEventListener('sessionend', () => ends++);
  forca.start();
  forca._onWin();
  assert.equal(wins, 1);
  assert.ok(forca.best > 0);
  assert.equal(saved.size, 0);
  t.mock.timers.tick(1600);
  assert.equal(forca.round, 2);
  blocked = false;
  forca.end();
  assert.equal(ends, 1);
  assert.equal(forca.status, 'idle');
  assert.equal(saved.get('libras-arcade:best-score-forca'), String(forca.best));
  assert.match(warnings[0][0], /recorde da Forca/);
});

test('working storage preserves both independent records across instances', (t) => {
  const saved = new Map();
  withStorage(t, {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value)
  });
  const game = new Game();
  game.startPractice();
  game.handleSign(game.target);
  game.end();
  const forca = new ForcaGame();
  forca.start();
  for (const letter of new Set(forca.word)) forca.handleGuess(letter);
  forca.end();
  assert.equal(saved.get('libras-arcade:best-score'), '10');
  assert.equal(saved.get('libras-arcade:best-score-forca'), String(forca.best));
  assert.equal(new Game().best, 10);
  assert.equal(new ForcaGame().best, forca.best);
});

test('manual exit reaches the menu with storage unavailable in all three modes', (t) => {
  withStorage(t, { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  t.mock.method(console, 'warn', () => {});
  for (const mode of ['practice', 'word', 'forca']) {
    const game = new Game();
    const forca = new ForcaGame();
    if (mode === 'practice') game.startPractice();
    else if (mode === 'word') game.startWord();
    else forca.start();
    const { ui } = resultsUi(t, game, forca, mode === 'forca' ? 'forca-play' : 'play');
    if (mode !== 'forca') game.handleSign(game.mode === 'practice' ? game.target : game.target[0]);
    else forca._onWin();
    ui.exitToHome();
    assert.equal(ui.currentScreen, 'home');
    assert.equal(ui._exitingManually, false);
    assert.equal(game.mode, null);
    assert.equal(forca.status, 'idle');
  }
});

test('bestStreak and results belong to the newly started practice or word session', (t) => {
  withStorage(t, { getItem: () => null, setItem() {} });
  for (const mode of ['word', 'practice']) {
    const game = new Game();
    const forca = new ForcaGame();
    if (mode === 'word') game.startPractice();
    else game.startWord();
    game.handleSign(mode === 'word' ? game.target : game.target[0]);
    game.end();
    if (mode === 'word') game.startWord();
    else game.startPractice();
    assert.equal(game.bestStreak, 0);
    const { ui, element } = resultsUi(t, game, forca, 'play');
    game.end();
    assert.equal(ui.currentScreen, 'results');
    assert.equal(element('#results-streak').textContent, 0);
  }
});

test('forca results show wins from the current session', (t) => {
  withStorage(t, { getItem: () => null, setItem() {} });
  const game = new Game();
  const forca = new ForcaGame();
  forca.start();
  forca._onWin();
  forca.end();
  forca.start();
  const { ui, element } = resultsUi(t, game, forca, 'forca-play');
  forca.end();
  assert.equal(ui.currentScreen, 'results');
  assert.equal(element('#results-streak').textContent, 0);
});
