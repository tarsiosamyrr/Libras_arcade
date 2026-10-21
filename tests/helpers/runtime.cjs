// Ambiente determinístico: substitui relógio, DOM e fronteira externa, não os módulos auditados.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const BASE = '9063154f5661c50fc7312059aa769709615b3e70';

async function runtime({ baseline = false, inferenceMs = 4, result = { landmarks: [], worldLandmarks: [], handednesses: [] } } = {}) {
  let clock = 0, nextId = 0;
  const frames = new Map(), timers = new Map(), events = new Map(), calls = [], drawing = [];
  const store = new Map();
  let sizeWrites = 0, width = 300, height = 150;
  const ctx = Object.fromEntries(['clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'fill'].map(k => [k, (...args) => drawing.push([k, ...args])]));
  const canvas = { getContext: () => ctx,
    get width() { return width; }, set width(v) { width = v; sizeWrites++; },
    get height() { return height; }, set height(v) { height = v; sizeWrites++; } };
  const element = { style: {}, classList: { add() {}, remove() {} }, addEventListener() {} };
  const context = vm.createContext({ console, EventTarget, CustomEvent, Float64Array,
    performance: { now: () => clock },
    requestAnimationFrame: fn => { frames.set(++nextId, fn); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: fn => { timers.set(++nextId, fn); return nextId; }, clearTimeout: id => timers.delete(id),
    setInterval: fn => { timers.set(++nextId, fn); return nextId; }, clearInterval: id => timers.delete(id),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    window: { addEventListener: (type, fn) => events.set(type, fn) },
    document: {
      hidden: false,
      addEventListener: (type, fn) => events.set(type, fn),
      getElementById: id => id === 'overlay' ? canvas : element
    }
  });
  const remote = new vm.SyntheticModule(['HandLandmarker', 'FilesetResolver'], function () {
    this.setExport('HandLandmarker', { createFromOptions: async () => ({ detectForVideo(video, timestamp) {
      calls.push({ timestamp, videoTime: video.currentTime }); clock += inferenceMs; return result;
    } }) });
    this.setExport('FilesetResolver', { forVisionTasks: async () => ({}) });
  }, { context });
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const relative = path.relative(ROOT, file).replaceAll('\\', '/');
    let source = baseline ? execFileSync('git', ['show', `${BASE}:${relative}`], { cwd: ROOT, encoding: 'utf8' }) : fs.readFileSync(file, 'utf8');
    // Exposição somente na VM, sem criar exports de teste no código distribuído.
    if (relative === 'js/app.js') source += '\nexport { drawHands, resizeCanvas, computeNavState };';
    const module = new vm.SourceTextModule(source, { context, identifier: file });
    cache.set(file, module); return module;
  }
  const app = load(path.join(ROOT, 'js/app.js'));
  await app.link((specifier, ref) => specifier.startsWith('https:') ? remote : load(path.resolve(path.dirname(ref.identifier), specifier)));
  await app.evaluate();
  const get = file => cache.get(path.join(ROOT, 'js', file)).namespace;
  await get('vision.js').loadModel();
  return { app: app.namespace, vision: get('vision.js'), libras: get('libras.js'), game: get('game.js'), forca: get('forca.js'), data: get('data.js'),
    frames, timers, calls, drawing, canvas, get sizeWrites() { return sizeWrites; },
    advance(ms) { clock += ms; }, setClock(ms) { clock = ms; },
    tick(time) {
      clock = time;
      const pending = [...frames.entries()]; frames.clear();
      for (const [, fn] of pending) fn(time);
    }
  };
}
module.exports = { runtime, ROOT, BASE };
