const test = require('node:test');
const assert = require('node:assert/strict');
const { browserRuntime, deferred } = require('./helpers/browser-runtime.cjs');

const turn = () => new Promise((resolve) => setImmediate(resolve));

function instance(runtime, Constructor) {
  const found = runtime.trackedTargets.find((target) => target instanceof Constructor);
  assert.ok(found, `Expected an instance of ${Constructor.name}`);
  return found;
}

function temporalRig(r) {
  const engine = new r.LibrasEngine();
  const signs = [];
  engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
  const sample = (letter, at) => {
    r.clock.now = at;
    engine._advanceConfirmation(letter, at);
    return engine.state.recognitionPhase;
  };
  return { engine, signs, sample };
}

test('cooldown confirma gesto estático uma vez e mantém a pose prolongada bloqueada', async () => {
  const r = await browserRuntime();
  const { engine, signs, sample } = temporalRig(r);
  assert.equal(sample('A', 100), 'STABILIZING');
  assert.equal(sample('A', 699), 'STABILIZING');
  assert.equal(sample('A', 700), 'CONFIRMED');
  for (let at = 750; at <= 3000; at += 50) sample('A', at);
  assert.deepEqual(signs, ['A']);
  assert.equal(engine.state.recognitionPhase, 'WAIT_RELEASE');
  assert.equal(r.clock.tasks.size, 0);
});

test('cooldown exige mudança estável antes de A → B, sem confirmar gesto transitório', async () => {
  const r = await browserRuntime();
  const { signs, sample } = temporalRig(r);
  sample('A', 100); sample('A', 700);
  sample('B', 750); sample('B', 850); sample('A', 900);
  sample('B', 1000); sample('B', 1250);
  assert.deepEqual(signs, ['A']);
  sample('B', 1600);
  sample('B', 2199);
  assert.deepEqual(signs, ['A']);
  sample('B', 2200);
  assert.deepEqual(signs, ['A', 'B']);
});

test('A → A requer liberação de 250 ms, inclusive quando ela ocorre no cooldown', async () => {
  const r = await browserRuntime();
  const { signs, sample } = temporalRig(r);
  sample('A', 100); sample('A', 700);
  sample(null, 800); sample(null, 1049); sample('A', 1100);
  sample('A', 1700); sample('A', 2300);
  assert.deepEqual(signs, ['A']);
  sample(null, 2400); sample(null, 2650);
  sample('A', 2700); sample('A', 3300);
  assert.deepEqual(signs, ['A', 'A']);
});

test('gestos rápidos e trajetórias antigas no cooldown não geram confirmações', async () => {
  const r = await browserRuntime();
  const { engine, signs, sample } = temporalRig(r);
  sample('A', 100); sample('A', 700);
  engine._motionKey = 'J';
  engine._motionBuffer = [{ x: 0, y: 0, t: 650 }];
  sample('B', 800); sample('B', 900); sample('A', 950);
  sample('A', 1600);
  assert.deepEqual(signs, ['A']);
  assert.equal(engine._motionBuffer.length, 0);
  sample('B', 1700); sample('B', 2000); sample('B', 2600);
  assert.deepEqual(signs, ['A', 'B']);
});

test('resetTracking limpa cooldown e candidatos de sessões anteriores', async () => {
  const r = await browserRuntime();
  const { engine, signs, sample } = temporalRig(r);
  sample('A', 100); sample('A', 700);
  engine.resetTracking();
  assert.equal(engine.state.recognitionPhase, 'READY');
  sample('B', 750); sample('B', 1349);
  assert.deepEqual(signs, ['A']);
  sample('B', 1350);
  assert.deepEqual(signs, ['A', 'B']);
});

test('J/Z usam trajetos novos depois de confirmação, cooldown e liberação', async () => {
  const r = await browserRuntime();
  for (const letter of ['J', 'Z']) {
    const { engine, signs, sample } = temporalRig(r);
    const features = { extIndex: letter === 'Z' ? 1 : 0, extMiddle: 0, extRing: 0, extPinky: letter === 'J' ? 1 : 0 };
    const points = letter === 'J'
      ? [[.2,.1],[.2,.2],[.2,.3],[.2,.4],[.2,.5],[.2,.6],[.25,.7],[.35,.75],[.45,.7],[.5,.6],[.5,.5]]
      : Array.from({ length: 25 }, (_, i) => [i <= 8 ? i*.1 : i <= 16 ? (16-i)*.1 : (i-16)*.1, .1+i*.02]);
    const runPath = (start) => {
      for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];
        const lm = Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
        const at = start + i * 50;
        sample(null, at);
        const canTrack = engine.state.recognitionPhase === 'READY' || engine.state.recognitionPhase === 'STABILIZING';
        const found = canTrack ? engine._trackMotionSigns(lm, features, 1, at) : null;
        if (found) engine._confirm(found, at);
      }
    };
    runPath(100);
    assert.deepEqual(signs, [letter]);
    assert.equal(engine._motionBuffer.length, 0);
    const confirmedAt = engine._confirmedAt;
    sample(null, confirmedAt + 950); sample(null, confirmedAt + 1200);
    assert.equal(engine.state.recognitionPhase, 'READY');
    runPath(confirmedAt + 1250);
    assert.deepEqual(signs, [letter, letter]);
  }
});

test('trajetórias J/Z passam pelo update antes da pose-base estática', async () => {
  const r = await browserRuntime();
  for (const letter of ['J', 'Z']) {
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    const points = letter === 'J'
      ? [[.2,.1],[.2,.2],[.2,.3],[.2,.4],[.2,.5],[.2,.6],[.25,.7],[.35,.75],[.45,.7],[.5,.6],[.5,.5]]
      : Array.from({ length: 25 }, (_, i) => [i <= 8 ? i*.1 : i <= 16 ? (16-i)*.1 : (i-16)*.1, .1+i*.02]);
    for (let i = 0; i < points.length; i++) {
      const [dx, dy] = points[i];
      const lm = Array.from({ length: 21 }, () => ({ x: .5, y: .75, z: 0 }));
      lm[0] = { x: .5, y: .8, z: 0 };
      for (const index of [5, 9, 13, 17]) lm[index] = { x: .5, y: .6, z: 0 };
      const mcp = letter === 'J' ? 17 : 5;
      const pip = letter === 'J' ? 18 : 6;
      const tip = letter === 'J' ? 20 : 8;
      lm[mcp] = { x: .45, y: .6, z: 0 };
      lm[pip] = { x: .45, y: .5, z: 0 };
      lm[tip] = { x: .45 + dx * .2, y: .35 + dy * .2, z: 0 };
      engine.update({ landmarks: [lm] }, 100 + i * 50, 20);
    }
    assert.deepEqual(signs, [letter], letter);
  }
});

test('pose-base imóvel continua confirmável como letra estática', async () => {
  const r = await browserRuntime();
  const engine = new r.LibrasEngine();
  const signs = [];
  engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
  const lm = Array.from({ length: 21 }, () => ({ x: .5, y: .75, z: 0 }));
  lm[0] = { x: .5, y: .8, z: 0 };
  for (const index of [5, 9, 13, 17]) lm[index] = { x: .5, y: .6, z: 0 };
  lm[5] = { x: .45, y: .6, z: 0 };
  lm[6] = { x: .45, y: .5, z: 0 };
  lm[8] = { x: .45, y: .35, z: 0 };
  engine.update({ landmarks: [lm] }, 100, 20);
  const candidate = engine.state.letter;
  for (let at = 150; at <= 750; at += 50) engine.update({ landmarks: [lm] }, at, 20);
  assert.deepEqual(signs, [candidate]);
});

test('webcam simulada mantém inferência, feedback e uma jogada por pose nos três modos', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  const engine = instance(r, r.LibrasEngine);
  const game = instance(r, r.Game);
  const forca = instance(r, r.ForcaGame);
  const hand = Array.from({ length: 21 }, (_, j) => ({ x: .7 + j / 100, y: .4 + j / 200, z: 0 }));
  r.setDetectionResult({ landmarks: [hand] });
  let videoFrame = 0;
  const frame = (at) => {
    r.clock.now = at;
    r.video.currentTime = ++videoFrame;
    r.raf.step(at);
  };
  for (let at = 50; at <= 750; at += 50) frame(at);
  assert.equal(engine.dispatchCount('signconfirmed'), 1);
  assert.equal(game.score, 0);
  assert.equal(forca.errors, 0);

  let at = 1000;
  for (const [card, mode] of [[0, 'practice'], [1, 'word'], [2, 'forca']]) {
    r.cards[card].click();
    assert.equal(engine.state.recognitionPhase, 'READY');
    const before = engine.dispatchCount('signconfirmed');
    if (mode === 'practice') game.target = 'A';
    for (let i = 0; i < 35; i++, at += 50) frame(at);
    assert.equal(engine.dispatchCount('signconfirmed'), before + 1, mode);
    assert.equal(engine.state.recognitionPhase, 'WAIT_RELEASE');
    assert.match(r.elements.get('#hint-text').textContent, /Prepare outro gesto|Preparando próxima letra/);
    if (mode === 'practice') assert.equal(game.dispatchCount('correct'), 1);
    if (mode === 'forca') assert.ok(forca.guessed.size <= 1);
    r.elements.get('#exit-btn').click();
    assert.equal(engine.state.recognitionPhase, 'READY');
    assert.equal(r.elements.get('#home').classList.contains('hidden'), false);
    at += 100;
  }
  assert.equal(r.frames.size, 1);
  assert.equal(videoFrame, 120);
  assert.equal(r.counts().detectCount, videoFrame);
  assert.equal(engine.count('signconfirmed'), 1);
});

test('pausa, retomada e gesto de voltar descartam cooldown sem duplicar recursos', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  const engine = instance(r, r.LibrasEngine);
  r.cards[1].click();
  engine._advanceConfirmation('A', 100);
  engine._advanceConfirmation('A', 700);
  assert.equal(engine.state.recognitionPhase, 'CONFIRMED');
  r.document.hidden = true;
  r.dispatchDocument('visibilitychange');
  assert.equal(engine.state.recognitionPhase, 'READY');
  assert.equal(r.frames.size, 0);
  r.document.hidden = false;
  r.dispatchDocument('visibilitychange');
  await r.settle();
  assert.equal(r.frames.size, 1);
  engine._advanceConfirmation('B', 1000);
  engine._advanceConfirmation('B', 1600);
  assert.equal(engine.dispatchCount('signconfirmed'), 2);
  engine.dispatchEvent(new r.CustomEvent('navback'));
  assert.equal(engine.state.recognitionPhase, 'READY');
  assert.equal(r.elements.get('#home').classList.contains('hidden'), false);
  assert.equal(engine.count('signconfirmed'), 1);
  assert.equal(engine.count('navback'), 1);
  assert.equal(r.frames.size, 1);
});

test('app starts once from the real button and creates one UI, camera stream and frame loop', async () => {
  const r = await browserRuntime();
  r.clickStart();
  r.clickStart();
  await r.settle();

  const game = instance(r, r.Game);
  const forca = instance(r, r.ForcaGame);
  const libras = instance(r, r.LibrasEngine);
  assert.deepEqual(r.counts(), { modelCount: 1, closeCount: 0, detectCount: 0, mediaCount: 1 });
  assert.equal(r.frames.size, 1);
  assert.equal(r.tracks[0].readyState, 'live');
  assert.equal(r.video.srcObject.getVideoTracks()[0], r.tracks[0]);
  assert.equal(r.elements.get('#stage').classList.contains('hidden'), false);
  assert.equal(r.elements.get('#boot-screen').classList.contains('hidden'), true);
  assert.equal(game.count('sessionend'), 1);
  assert.equal(forca.count('sessionend'), 1);
  assert.equal(libras.count('signconfirmed'), 1);
  assert.equal(r.document.listenerCount('visibilitychange'), 1);
  assert.equal(r.window.listenerCount('pagehide'), 1);
  assert.equal(r.window.listenerCount('pageshow'), 1);
  assert.equal(r.window.listenerCount('keydown'), 1);
  assert.equal(r.window.listenerCount('resize'), 1);
  assert.ok(r.cards.every((card) => card.listenerCount('click') === 1));
});

test('camera permission denial shows the localized error and retry restores the app', async () => {
  const denial = Object.assign(new Error('permission denied'), { name: 'NotAllowedError' });
  const requests = [() => Promise.reject(denial)];
  const r = await browserRuntime({ cameraRequests: requests });
  r.clickStart();
  await r.settle();

  assert.equal(r.elements.get('#error-screen').classList.contains('hidden'), false);
  assert.equal(r.elements.get('#stage').classList.contains('hidden'), true);
  assert.match(r.elements.get('#error-message').textContent, /Permissão de câmera negada/);
  assert.equal(r.frames.size, 0);

  r.clickRetry();
  await r.settle();
  assert.equal(r.getCameraRequestCount(), 2);
  assert.equal(r.elements.get('#error-screen').classList.contains('hidden'), true);
  assert.equal(r.elements.get('#stage').classList.contains('hidden'), false);
  assert.equal(r.tracks.at(-1).readyState, 'live');
  assert.equal(r.frames.size, 1);
});

test('visibility changes pause the game and camera, then resume the same session', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  const game = instance(r, r.Game);
  r.cards[0].click();
  assert.equal(game.mode, 'practice');
  r.clock.advance(100);
  const remaining = game.timeLeft;

  r.document.hidden = true;
  r.dispatchDocument('visibilitychange');
  assert.equal(r.tracks[0].readyState, 'ended');
  assert.equal(r.frames.size, 0);
  r.clock.advance(1000);
  assert.equal(game.timeLeft, remaining);

  r.document.hidden = false;
  r.dispatchDocument('visibilitychange');
  await r.settle();
  assert.equal(game.mode, 'practice');
  assert.equal(game.timeLeft, remaining);
  assert.equal(r.tracks[1].readyState, 'live');
  assert.equal(r.frames.size, 1);
  r.clock.advance(100);
  assert.equal(game.timeLeft, remaining - 100);
});

test('pagehide disposes the model and restored pages recreate one active session', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  const game = instance(r, r.Game);
  r.cards[1].click();
  assert.equal(game.mode, 'word');

  r.dispatchWindow('pagehide');
  assert.equal(r.tracks[0].readyState, 'ended');
  assert.equal(r.frames.size, 0);
  assert.equal(r.counts().closeCount, 1);
  assert.equal(r.clock.tasks.size, 0);

  r.dispatchWindow('pageshow', { persisted: true });
  await r.settle();
  assert.equal(game.mode, 'word');
  assert.equal(r.counts().modelCount, 2);
  assert.equal(r.counts().closeCount, 1);
  assert.equal(r.getCameraRequestCount(), 2);
  assert.equal(r.tracks[1].readyState, 'live');
  assert.equal(r.frames.size, 1);
});

test('camera request resolving after suspension is cancelled and its stream is released', async () => {
  const pendingCamera = deferred();
  const r = await browserRuntime({ cameraRequests: [() => pendingCamera.promise] });
  r.clickStart();
  await turn();
  assert.equal(r.getCameraRequestCount(), 1);

  r.document.hidden = true;
  r.dispatchDocument('visibilitychange');
  const cancelledStream = r.makeStream();
  pendingCamera.resolve(cancelledStream);
  await r.settle();
  assert.equal(r.tracks[0].readyState, 'ended');
  assert.equal(r.video.srcObject, null);
  assert.equal(r.frames.size, 0);

  r.document.hidden = false;
  r.dispatchDocument('visibilitychange');
  await r.settle();
  assert.equal(r.getCameraRequestCount(), 2);
  assert.equal(r.tracks[1].readyState, 'live');
  assert.equal(r.frames.size, 1);
});

test('disconnecting the active camera track displays an error and releases the stream', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  const activeTrack = r.tracks[0];
  r.dispatchTrack(activeTrack, 'ended');
  assert.equal(activeTrack.readyState, 'ended');
  assert.equal(activeTrack.stopCount, 1);
  assert.equal(r.video.srcObject, null);
  assert.equal(r.frames.size, 0);
  assert.match(r.elements.get('#error-message').textContent, /câmera foi desconectada/i);
  assert.equal(r.elements.get('#error-screen').classList.contains('hidden'), false);
});

test('detector and app consumer failures stop the loop and render recoverable errors', async (t) => {
  await t.test('detector rejects', async () => {
    const r = await browserRuntime();
    r.clickStart();
    await r.settle();
    r.setDetectionError(new Error('detector failed'));
    r.video.currentTime = 1;
    r.clock.now = 50;
    r.raf.step(50);
    assert.match(r.elements.get('#error-message').textContent, /detector failed/);
    assert.equal(r.logs.errors.length, 1);
    assert.equal(r.frames.size, 0);
    assert.equal(r.tracks[0].readyState, 'ended');
  });

  await t.test('result consumer throws while drawing', async () => {
    const r = await browserRuntime();
    r.clickStart();
    await r.settle();
    r.setDetectionResult({ landmarks: [null] });
    r.video.currentTime = 1;
    r.clock.now = 50;
    r.raf.step(50);
    assert.match(r.elements.get('#error-message').textContent, /null|length/i);
    assert.equal(r.logs.errors.length, 1);
    assert.equal(r.frames.size, 0);
    assert.equal(r.tracks[0].readyState, 'ended');
  });
});

test('repeated suspend and resume cycles do not duplicate UI or camera-track listeners', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  const game = instance(r, r.Game);
  const forca = instance(r, r.ForcaGame);
  const libras = instance(r, r.LibrasEngine);
  for (let i = 0; i < 4; i++) {
    const activeTrack = r.tracks.at(-1);
    assert.equal(activeTrack.listenerCount('ended'), 1);
    r.document.hidden = true;
    r.dispatchDocument('visibilitychange');
    assert.equal(activeTrack.listenerCount('ended'), 0);
    r.document.hidden = false;
    r.dispatchDocument('visibilitychange');
    await r.settle();
    assert.equal(r.frames.size, 1);
  }
  assert.equal(game.count('sessionend'), 1);
  assert.equal(forca.count('sessionend'), 1);
  assert.equal(libras.count('signconfirmed'), 1);
  assert.equal(r.document.listenerCount('visibilitychange'), 1);
  assert.equal(r.window.listenerCount('pagehide'), 1);
  assert.equal(r.window.listenerCount('pageshow'), 1);
  assert.equal(r.window.listenerCount('keydown'), 1);
  assert.equal(r.window.listenerCount('resize'), 1);
  assert.equal(r.tracks.at(-1).listenerCount('ended'), 1);
});

test('real UI navigates all modes, forwards confirmed signs and cancels the previous round', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const forca = new r.ForcaGame();
  const libras = new r.LibrasEngine();
  let resets = 0;
  const resetTracking = libras.resetTracking.bind(libras);
  libras.resetTracking = () => { resets++; resetTracking(); };
  const ui = new r.UI(libras, game, forca);

  r.cards[0].click();
  assert.equal(game.mode, 'practice');
  assert.equal(r.elements.get('#play').classList.contains('is-open'), true);
  assert.equal(r.elements.get('#home').classList.contains('hidden'), true);
  const practiceRound = game.round;
  game.handleSign(game.target);
  r.cards[1].click();
  assert.equal(game.mode, 'word');
  const wordRound = game.round;
  r.clock.advance(1000);
  assert.equal(game.round, wordRound);
  assert.notEqual(game.round, practiceRound + 1);

  const scoreBefore = game.score;
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: game.target[0] } }));
  assert.ok(game.score > scoreBefore);
  r.cards[2].click();
  assert.equal(game.mode, null);
  assert.equal(forca.status, 'playing');
  assert.equal(r.elements.get('#play').classList.contains('is-open'), false);
  assert.equal(r.elements.get('#forca-play').classList.contains('is-open'), true);
  const guessedLetter = forca.word[0];
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: guessedLetter } }));
  assert.ok(forca.guessed.has(guessedLetter));

  for (const letter of new Set(forca.word)) forca.handleGuess(letter);
  assert.equal(forca.status, 'won');
  const forcaRound = forca.round;
  r.cards[0].click();
  assert.equal(forca.status, 'idle');
  assert.equal(game.mode, 'practice');
  assert.equal(r.elements.get('#play').classList.contains('is-open'), true);
  r.clock.advance(2000);
  assert.equal(forca.round, forcaRound);
  assert.equal(r.elements.get('#forca-play').classList.contains('is-open'), false);
  assert.ok(resets >= 5);
  assert.equal(game.count('start'), 1);
  assert.equal(forca.count('start'), 1);
  assert.equal(libras.count('signconfirmed'), 1);
  assert.equal(ui.currentScreen, 'play');
});

test('real UI ignores confirmed signs in the menu and returns cleanly from each game', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const forca = new r.ForcaGame();
  const libras = new r.LibrasEngine();
  const ui = new r.UI(libras, game, forca);
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: 'A' } }));
  assert.equal(game.score, 0);

  for (const [index, mode] of [[0, 'practice'], [1, 'word'], [2, 'forca']]) {
    r.cards[index].click();
    assert.equal(mode === 'forca' ? forca.status : game.mode, mode === 'forca' ? 'playing' : mode);
    r.elements.get('#exit-btn').click();
    assert.equal(r.elements.get('#home').classList.contains('hidden'), false);
    assert.equal(r.elements.get('#play').classList.contains('is-open'), false);
    assert.equal(r.elements.get('#forca-play').classList.contains('is-open'), false);
    assert.equal(game.mode, null);
    assert.equal(forca.status, 'idle');
  }
  assert.equal(r.cards[0].listenerCount('click'), 1);
  assert.equal(r.cards[1].listenerCount('click'), 1);
  assert.equal(r.cards[2].listenerCount('click'), 1);
  assert.equal(game.count('sessionend'), 1);
  assert.equal(forca.count('sessionend'), 1);
  assert.equal(libras.count('signconfirmed'), 1);
  assert.equal(ui.currentScreen, 'home');
});

test('real UI returns to menu on storage failures and persists the record after recovery', async () => {
  const records = new Map();
  let unavailable = true;
  const storage = {
    getItem(key) {
      if (unavailable) throw new Error('storage temporarily unavailable');
      return records.get(key) ?? null;
    },
    setItem(key, value) {
      if (unavailable) throw new Error('storage temporarily unavailable');
      records.set(key, value);
    }
  };
  const r = await browserRuntime({ storage });
  const game = new r.Game();
  const forca = new r.ForcaGame();
  const libras = new r.LibrasEngine();
  const ui = new r.UI(libras, game, forca);
  r.cards[0].click();
  game.handleSign(game.target);
  r.elements.get('#exit-btn').click();
  assert.equal(ui.currentScreen, 'home');
  assert.equal(game.mode, null);
  assert.equal(game.best, 10);

  unavailable = false;
  r.cards[1].click();
  r.elements.get('#exit-btn').click();
  assert.equal(ui.currentScreen, 'home');
  assert.equal(records.get('libras-arcade:best-score'), '10');
  assert.equal(game.bestStreak, 0);
  assert.ok(r.logs.warnings.length >= 2);
});

test('real UI routes the same gesture confirmation only once after screen changes', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const forca = new r.ForcaGame();
  const libras = new r.LibrasEngine();
  new r.UI(libras, game, forca);

  r.cards[0].click();
  const scoreBefore = game.score;
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: game.target } }));
  assert.equal(game.score, scoreBefore + 10);
  r.elements.get('#exit-btn').click();
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: 'A' } }));
  assert.equal(game.score, scoreBefore + 10);
  assert.equal(libras.count('signconfirmed'), 1);
  assert.equal(game.dispatchCount('correct'), 1);
});

test('real UI renders the results screen and current-session statistics on a natural end', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const forca = new r.ForcaGame();
  const libras = new r.LibrasEngine();
  const ui = new r.UI(libras, game, forca);
  r.cards[0].click();
  game.handleSign(game.target);
  game.end();

  assert.equal(ui.currentScreen, 'results');
  assert.equal(r.elements.get('#results').classList.contains('is-open'), true);
  assert.equal(r.elements.get('#results-score').textContent, game.score);
  assert.equal(r.elements.get('#results-streak').textContent, game.bestStreak);
  assert.equal(r.elements.get('#results-rounds').textContent, game.round);
  assert.equal(r.elements.get('#results-best').textContent, game.best);
});

test('pending model initialization is cancelled on pagehide and retried after restoration', async () => {
  const modelPending = deferred();
  let modelRequests = 0;
  const r = await browserRuntime({
    modelFactory: () => {
      modelRequests++;
      if (modelRequests === 1) return modelPending.promise;
      return Promise.resolve({
        detectForVideo: () => ({ landmarks: [] }),
        close() {}
      });
    }
  });
  r.clickStart();
  await turn();
  assert.equal(modelRequests, 1);
  r.dispatchWindow('pagehide');
  r.dispatchWindow('pageshow', { persisted: true });
  modelPending.resolve({ detectForVideo: () => ({ landmarks: [] }), close() {} });
  await r.settle();
  assert.equal(modelRequests, 2);
  assert.equal(r.getCameraRequestCount(), 1);
  assert.equal(r.frames.size, 1);
});
