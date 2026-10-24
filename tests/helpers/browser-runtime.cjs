const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
    this.persisted = options.persisted ?? false;
    this.key = options.key;
    this.target = null;
    this.defaultPrevented = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener, options = {}) {
    if (!listener) return;
    const records = this.listeners.get(type) || [];
    if (!records.some((record) => record.listener === listener)) {
      records.push({ listener, once: options === true || Boolean(options && options.once) });
      this.listeners.set(type, records);
    }
  }

  removeEventListener(type, listener) {
    const records = this.listeners.get(type);
    if (!records) return;
    const remaining = records.filter((record) => record.listener !== listener);
    if (remaining.length) this.listeners.set(type, remaining);
    else this.listeners.delete(type);
  }

  dispatchEvent(event) {
    if (typeof event === 'string') event = new FakeEvent(event);
    if (!event.target) event.target = this;
    const records = [...(this.listeners.get(event.type) || [])];
    for (const record of records) {
      if (typeof record.listener === 'function') record.listener.call(this, event);
      else record.listener.handleEvent(event);
      if (record.once) this.removeEventListener(event.type, record.listener);
    }
    return !event.defaultPrevented;
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }
}

class FakeClassList {
  constructor(element, initial = '') {
    this.element = element;
    this.values = new Set(initial.split(/\s+/).filter(Boolean));
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
    this._sync();
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
    this._sync();
  }

  contains(name) {
    return this.values.has(name);
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.values.has(name) : Boolean(force);
    if (shouldAdd) this.values.add(name);
    else this.values.delete(name);
    this._sync();
    return shouldAdd;
  }

  set(value) {
    this.values = new Set(String(value).split(/\s+/).filter(Boolean));
    this._sync();
  }

  toString() {
    return [...this.values].join(' ');
  }

  _sync() {
    this.element._className = this.toString();
  }
}

class FakeElement extends FakeEventTarget {
  constructor({ id = '', className = '', dataset = {}, tagName = 'div' } = {}) {
    super();
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.dataset = { ...dataset };
    this.style = {};
    this.classList = new FakeClassList(this, className);
    this._className = className;
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.hidden = false;
    this.parentElement = null;
    this.children = [];
    this.readyState = 2;
    this.currentTime = 0;
    this._srcObject = null;
    this.width = 300;
    this.height = 150;
    this.context2d = {
      clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, arc() {}, fill() {}
    };
    this.bounds = { left: 0, top: 0, right: 100, bottom: 100 };
    this.paused = true;
    this.playResult = async () => { this.paused = false; };
    this.pauseCount = 0;
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = String(value);
    this.classList.set(this._className);
  }

  get srcObject() {
    return this._srcObject;
  }

  set srcObject(value) {
    this._srcObject = value;
  }

  getContext() {
    return this.context2d;
  }

  add(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  querySelectorAll(selector) {
    if (selector === '.level-dot') return this.children.filter((child) => child.classList.contains('level-dot'));
    if (selector === '.forca-figure') return this.children.filter((child) => child.classList.contains('forca-figure'));
    return [];
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  getBoundingClientRect() {
    return { ...this.bounds };
  }

  closest(selector) {
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return this.classList.contains(className) ? this : this.parentElement?.closest(selector) || null;
    }
    return null;
  }

  click(target = this) {
    const event = new FakeEvent('click');
    event.target = target;
    this.dispatchEvent(event);
    if (this.parentElement && this.parentElement !== this) {
      this.parentElement.dispatchEvent(event);
    }
  }

  play() {
    return this.playResult();
  }

  pause() {
    this.paused = true;
    this.pauseCount++;
  }

  setAttribute(name, value) {
    this[name] = value;
  }
}

class FakeClock {
  constructor() {
    this.now = 0;
    this.nextId = 0;
    this.tasks = new Map();
  }

  setTimeout(callback, delay = 0, interval = false) {
    const id = ++this.nextId;
    this.tasks.set(id, { callback, due: this.now + Math.max(0, Number(delay) || 0), interval: interval ? Math.max(1, Number(delay) || 1) : 0 });
    return id;
  }

  clear(id) {
    this.tasks.delete(id);
  }

  advance(ms) {
    const end = this.now + ms;
    let runs = 0;
    while (true) {
      const next = [...this.tasks.entries()]
        .filter(([, task]) => task.due <= end)
        .sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!next) break;
      if (++runs > 10000) throw new Error('FakeClock exceeded 10,000 callbacks.');
      const [id, task] = next;
      this.now = task.due;
      if (task.interval) task.due += task.interval;
      else this.tasks.delete(id);
      task.callback();
    }
    this.now = end;
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function createStream(track) {
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track]
  };
}

async function browserRuntime({ cameraRequests = [], modelFactory, storage } = {}) {
  const clock = new FakeClock();
  const document = new FakeEventTarget();
  document.hidden = false;
  const window = new FakeEventTarget();
  window.innerWidth = 1280;
  window.innerHeight = 720;
  window.performance = { now: () => clock.now };

  const elements = new Map();
  const idElements = [
    'boot-gate', 'boot-core', 'boot-start-btn', 'boot-ring-progress', 'boot-percent',
    'boot-status', 'boot-log', 'boot-screen', 'stage', 'error-screen', 'error-message',
    'retry-camera-btn', 'webcam', 'overlay', 'home', 'play', 'forca-play', 'reference',
    'results', 'diag', 'diag-json', 'cursor', 'hint-text', 'exit-btn', 'feedback-toast',
    'target-card', 'target-eyebrow', 'target-letter', 'next-practice-btn', 'prev-practice-btn',
    'practice-nav', 'practice-jump', 'practice-letter-select', 'practice-all-btn', 'practice-start-btn',
    'target-word', 'schematic-hand',
    'target-tip', 'hold-fill', 'hold-label', 'timer-fill', 'forca-card', 'forca-eyebrow',
    'forca-hint', 'forca-word', 'forca-tip', 'forca-hold-fill', 'forca-hold-label',
    'forca-keyboard', 'forca-errors-count', 'hands-status', 'hand-left-state',
    'hand-right-state', 'hand-detected-letter', 'hand-detected-confidence',
    'hand-gate-status', 'hud-score', 'hud-streak', 'hud-best', 'reference-grid',
    'results-label-1', 'results-label-2', 'results-score', 'results-streak',
    'results-rounds', 'results-best', 'help-btn', 'home-guide-btn', 'reference-close',
    'results-restart', 'results-home', 'results-rankings', 'rankings',
    'home-rankings-btn', 'rankings-close', 'player-modal', 'player-name-input',
    'player-modal-start', 'hud-player', 'tel-fps', 'tel-hands'
  ];
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const id of idElements) {
    // O DOM simulado precisa corresponder ao HTML entregue, senão um ID removido passa despercebido.
    if (!htmlIds.has(id)) throw new Error(`Elemento ausente no index.html: ${id}`);
    elements.set(`#${id}`, new FakeElement({ id }));
  }
  for (const id of ['boot-core', 'boot-log', 'stage', 'error-screen', 'exit-btn',
    'next-practice-btn', 'prev-practice-btn', 'practice-nav', 'practice-jump']) {
    elements.get(`#${id}`).classList.add('hidden');
  }
  const video = elements.get('#webcam');
  const canvas = elements.get('#overlay');
  const cards = ['practice', 'word', 'forca'].map((mode) => {
    const card = new FakeElement({ className: 'mode-card', dataset: { mode } });
    for (let level = 1; level <= 3; level++) {
      card.add(new FakeElement({
        className: `level-dot${level === 1 ? ' is-active' : ''}`,
        dataset: { level: String(level) },
        tagName: 'span'
      }));
    }
    return card;
  });
  const practiceAllBtn = elements.get('#practice-all-btn');
  practiceAllBtn.classList.add('practice-all-option');
  cards[0].add(practiceAllBtn);
  const practiceStartBtn = elements.get('#practice-start-btn');
  practiceStartBtn.classList.add('practice-level-start');
  cards[0].add(practiceStartBtn);
  const lookup = (selector) => {
    if (selector.startsWith('#')) {
      if (!htmlIds.has(selector.slice(1))) return null;
      if (!elements.has(selector)) elements.set(selector, new FakeElement({ id: selector.slice(1) }));
      return elements.get(selector);
    }
    return null;
  };
  document.querySelector = lookup;
  document.querySelectorAll = (selector) => selector === '.mode-card' ? cards : [];
  document.getElementById = (id) => lookup(`#${id}`);

  const requests = cameraRequests;
  const tracks = [];
  let mediaCount = 0;
  const mediaDevices = {
    getUserMedia: async (constraints) => {
      mediaCount++;
      if (constraints.audio !== false || !constraints.video) throw new Error('Unexpected camera constraints.');
      const request = requests.shift();
      if (request) return request(constraints);
      const track = new FakeEventTarget();
      track.readyState = 'live';
      track.stopCount = 0;
      track.stop = () => { track.readyState = 'ended'; track.stopCount++; };
      tracks.push(track);
      return createStream(track);
    }
  };
  const navigator = { mediaDevices };
  const frames = new Map();
  let nextFrame = 0;
  const raf = {
    request: (callback) => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancel: (id) => frames.delete(id),
    step: (timestamp = clock.now) => {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(timestamp);
    }
  };
  const localStore = storage || new Map();
  const localStorage = {
    getItem(key) {
      if (typeof localStore.getItem === 'function') return localStore.getItem(key);
      return localStore.has(key) ? localStore.get(key) : null;
    },
    setItem(key, value) {
      if (typeof localStore.setItem === 'function') return localStore.setItem(key, value);
      localStore.set(key, String(value));
    }
  };
  const trackedTargets = [];
  const logs = { errors: [], warnings: [] };
  const testConsole = {
    ...console,
    error: (...args) => logs.errors.push(args),
    warn: (...args) => logs.warnings.push(args)
  };
  class TrackedEventTarget extends EventTarget {
    constructor() {
      super();
      this.listenerCounts = new Map();
      this.eventCounts = new Map();
      trackedTargets.push(this);
    }

    addEventListener(type, listener, options) {
      const before = this.listenerCounts.get(type) || new Set();
      before.add(listener);
      this.listenerCounts.set(type, before);
      super.addEventListener(type, listener, options);
    }

    count(type) {
      return this.listenerCounts.get(type)?.size || 0;
    }

    dispatchEvent(event) {
      this.eventCounts.set(event.type, (this.eventCounts.get(event.type) || 0) + 1);
      return super.dispatchEvent(event);
    }

    dispatchCount(type) {
      return this.eventCounts.get(type) || 0;
    }
  }
  class TestCustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  }
  class TestDate extends Date {
    static now() { return clock.now; }
  }

  const context = vm.createContext({
    console: testConsole,
    Event,
    EventTarget: TrackedEventTarget,
    CustomEvent: TestCustomEvent,
    Date: TestDate,
    Float64Array,
    Math,
    JSON,
    performance: window.performance,
    window,
    document,
    navigator,
    localStorage,
    requestAnimationFrame: raf.request,
    cancelAnimationFrame: raf.cancel,
    setTimeout: (callback, delay) => clock.setTimeout(callback, delay),
    clearTimeout: (id) => clock.clear(id),
    setInterval: (callback, delay) => clock.setTimeout(callback, delay, true),
    clearInterval: (id) => clock.clear(id)
  });
  let modelCount = 0;
  let closeCount = 0;
  let detectCount = 0;
  let modelError = null;
  let detectionError = null;
  let detectionResult = { landmarks: [], worldLandmarks: [], handednesses: [] };
  const remote = new vm.SyntheticModule(['HandLandmarker', 'FilesetResolver'], function () {
    this.setExport('FilesetResolver', {
      forVisionTasks: async () => {
        if (modelError) throw modelError;
        return {};
      }
    });
    this.setExport('HandLandmarker', {
      createFromOptions: async () => {
        modelCount++;
        if (modelFactory) return modelFactory();
        return {
          detectForVideo() {
            detectCount++;
            if (detectionError) throw detectionError;
            return detectionResult;
          },
          close() { closeCount++; }
        };
      }
    });
  }, { context, identifier: 'mediapipe-test-double' });

  const modules = new Map();
  function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file);
    const module = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { context, identifier: file });
    modules.set(file, module);
    return module;
  }
  const appModule = load(path.join(ROOT, 'js/app.js'));
  await appModule.link((specifier, referencingModule) => {
    if (specifier.startsWith('https:')) return remote;
    return load(path.resolve(path.dirname(referencingModule.identifier), specifier));
  });
  await appModule.evaluate();
  const namespace = (file) => modules.get(path.join(ROOT, 'js', file)).namespace;

  return {
    app: appModule.namespace,
    UI: namespace('ui.js').UI,
    data: namespace('data.js'),
    Game: namespace('game.js').Game,
    ForcaGame: namespace('forca.js').ForcaGame,
    LibrasEngine: namespace('libras.js').LibrasEngine,
    vision: namespace('vision.js'),
    document,
    window,
    navigator,
    video,
    canvas,
    cards,
    elements,
    frames,
    tracks,
    clock,
    raf,
    trackedTargets,
    logs,
    CustomEvent: TestCustomEvent,
    counts: () => ({ modelCount, closeCount, detectCount, mediaCount }),
    setModelError(error) { modelError = error; },
    setDetectionError(error) { detectionError = error; },
    setDetectionResult(result) { detectionResult = result; },
    getCameraRequestCount: () => mediaCount,
    clickStart: () => elements.get('#boot-start-btn').click(),
    clickRetry: () => elements.get('#retry-camera-btn').click(),
    enqueueCameraRequest: (request) => requests.push(request),
    makeStream: () => {
      const track = new FakeEventTarget();
      track.readyState = 'live';
      track.stopCount = 0;
      track.stop = () => { track.readyState = 'ended'; track.stopCount++; };
      tracks.push(track);
      return createStream(track);
    },
    dispatchDocument(type) { document.dispatchEvent(new FakeEvent(type)); },
    dispatchWindow(type, options) { window.dispatchEvent(new FakeEvent(type, options)); },
    dispatchTrack(track, type) { track.dispatchEvent(new FakeEvent(type)); },
    FakeEvent,
    async settle() {
      for (let i = 0; i < 12; i++) await Promise.resolve();
      await new Promise((resolve) => setImmediate(resolve));
      for (let i = 0; i < 4; i++) await Promise.resolve();
    }
  };
}

module.exports = { browserRuntime, deferred, FakeEvent, FakeElement, FakeEventTarget };
