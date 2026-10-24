/* Registro local e temporário. Nunca recebe imagens, vídeos ou landmarks. */
const CAPACITY = 120;
const SAMPLE_MS = 200;
const SAFE_FIELDS = new Set([
  'handPresent', 'landmarksValid', 'candidate', 'candidateEligible', 'score', 'second', 'secondScore',
  'gap', 'phase', 'stabilizingMs', 'cooldownRemainingMs', 'motionLetter',
  'motionSamples', 'motionProgress', 'motionStatus', 'reason', 'letter',
  'mode', 'screen', 'expected', 'wordIndex', 'round', 'timeLeft', 'accepted',
  'uiUpdated'
]);

class RecognitionDiagnostics {
  constructor() {
    this.enabled = false;
    this._events = new Array(CAPACITY);
    this._next = 0;
    this._size = 0;
    this._lastSampleAt = -Infinity;
    this._lastSampleKey = null;
    this._mode = null;
    this._screen = 'home';
  }

  /** Ativa uma captura nova e limitada, somente na memória desta aba. */
  enable() {
    this.clear();
    this.enabled = true;
  }

  /** Desativa e apaga imediatamente os eventos coletados. */
  disable() {
    this.enabled = false;
    this.clear();
  }

  /** Apaga eventos sem alterar o estado de ativação. */
  clear() {
    this._events.fill(undefined);
    this._next = 0;
    this._size = 0;
    this._lastSampleAt = -Infinity;
    this._lastSampleKey = null;
  }

  /** Atualiza contexto de navegação sem criar evento ou trabalho por frame. */
  setContext(mode, screen) {
    this._mode = mode;
    this._screen = screen;
  }

  /** Guarda somente escalares autorizados; chaves biométricas são descartadas. */
  record(type, details = {}, at = performance.now()) {
    if (!this.enabled) return;
    const entry = { at, type, mode: this._mode, screen: this._screen };
    for (const [key, value] of Object.entries(details)) {
      if (SAFE_FIELDS.has(key) && (value === null || typeof value === 'boolean' ||
          typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))) {
        entry[key] = value;
      }
    }
    this._events[this._next] = entry;
    this._next = (this._next + 1) % CAPACITY;
    this._size = Math.min(CAPACITY, this._size + 1);
  }

  /** Amostra o reconhecimento a cada 200 ms ou quando muda o motivo/estado/candidata. */
  observe(details, at) {
    if (!this.enabled) return;
    const key = `${details.candidate}:${details.phase}:${details.reason}:${details.motionStatus}`;
    if (key === this._lastSampleKey && at - this._lastSampleAt < SAMPLE_MS) return;
    this._lastSampleAt = at;
    this._lastSampleKey = key;
    this.record('recognition', details, at);
  }

  /** Devolve cópias em ordem cronológica; nenhuma referência interna escapa. */
  read() {
    const events = [];
    for (let i = 0; i < this._size; i++) {
      events.push({ ...this._events[(this._next - this._size + i + CAPACITY) % CAPACITY] });
    }
    return { enabled: this.enabled, capacity: CAPACITY, events };
  }
}

export const diagnostics = new RecognitionDiagnostics();
