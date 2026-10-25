/* Registro local e temporário. Nunca recebe imagens, vídeos ou landmarks. */
const CAPACITY = 120;
const SAMPLE_MS = 200;
const PHYSICAL_HANDS = new Set(['left', 'right']);
const ORIENTATIONS = new Set(['front', 'oblique', 'side']);
const DISTANCES = new Set(['near', 'medium', 'far']);
const SAFE_FIELDS = new Set([
  'handPresent', 'landmarksValid', 'candidate', 'candidateEligible', 'score', 'second', 'secondScore',
  'gap', 'phase', 'stabilizingMs', 'cooldownRemainingMs', 'motionLetter',
  'motionSamples', 'motionProgress', 'motionStatus', 'reason', 'letter',
  'mode', 'screen', 'expected', 'wordIndex', 'round', 'timeLeft', 'accepted',
  'uiUpdated', 'intendedLetter', 'physicalHand', 'orientation', 'distance', 'mirrored',
  'elapsedMs', 'extIndex', 'extMiddle', 'extRing', 'extPinky',
  'curlIndex', 'curlMiddle', 'curlRing', 'curlPinky', 'thumbOut',
  'thumbAcross', 'thumbIndexPinch', 'thumbMiddlePinch', 'thumbBetweenIM',
  'thumbIndexAngle', 'spreadIM', 'pointAngleIndex', 'pointAngleIM',
  'scoreA', 'scoreB', 'scoreC', 'scoreF', 'scoreG', 'scoreI', 'scoreK',
  'scoreO', 'scoreP', 'scoreT', 'scoreV', 'scoreY',
  'stemDescent', 'stemSide', 'stemConsistency', 'maxStemRun',
  'stemEndIndex', 'troughIndex', 'shortHook',
  'wristStep', 'wristGapMs', 'wristLimit',
  'hookRise', 'hookSide', 'turnDeg', 'pathLength',
  'netVertical', 'curviness', 'motionDurationMs', 'shapeValid'
]);

class RecognitionDiagnostics {
  constructor() {
    this.enabled = false;
    this._events = new Array(CAPACITY);
    this._next = 0;
    this._size = 0;
    this._lastSampleAt = -Infinity;
    this._lastSampleKey = null;
    this._lastMotionSampleAt = -Infinity;
    this._lastMotionReason = null;
    this._mode = null;
    this._screen = 'home';
    this._calibration = null;
  }

  get calibrationActive() { return this._calibration !== null; }

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

  /** Inicia uma única tentativa rotulada, voluntária e sem persistência. */
  startCalibration({ intendedLetter, physicalHand, orientation, distance, mirrored } = {}) {
    if (typeof intendedLetter !== 'string' || !/^[A-Z]$/.test(intendedLetter) ||
        !PHYSICAL_HANDS.has(physicalHand) || !ORIENTATIONS.has(orientation) ||
        !DISTANCES.has(distance) || typeof mirrored !== 'boolean') {
      throw new TypeError('Informe letra, mão, orientação, distância e espelhamento válidos para a calibração.');
    }
    this.enable();
    const at = performance.now();
    this._calibration = { at };
    this.record('calibration_start', { intendedLetter, physicalHand, orientation, distance, mirrored }, at);
  }

  /** Encerra a tentativa e mantém a leitura disponível até clear()/disable(). */
  stopCalibration() {
    if (this._calibration) this.record('calibration_end', {
      elapsedMs: Math.max(0, performance.now() - this._calibration.at)
    });
    this._calibration = null;
    this.enabled = false;
    return this.read();
  }

  /** Apaga eventos e encerra o rótulo atual sem alterar a ativação genérica. */
  clear() {
    this._events.fill(undefined);
    this._next = 0;
    this._size = 0;
    this._lastSampleAt = -Infinity;
    this._lastSampleKey = null;
    this._lastMotionSampleAt = -Infinity;
    this._lastMotionReason = null;
    this._calibration = null;
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
    if (this._calibration && type === 'signconfirmed') {
      entry.elapsedMs = Math.max(0, at - this._calibration.at);
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

  /** Amostra apenas a geometria escalar da trajetória J na captura rotulada. */
  observeMotion(details, at, force = false) {
    if (!this._calibration || (!force && details.reason === this._lastMotionReason &&
        at - this._lastMotionSampleAt < SAMPLE_MS)) return;
    this._lastMotionSampleAt = at;
    this._lastMotionReason = details.reason;
    this.record('motion_geometry', details, at);
  }

  /** Devolve cópias em ordem cronológica; nenhuma referência interna escapa. */
  read() {
    const events = [];
    for (let i = 0; i < this._size; i++) {
      events.push({ ...this._events[(this._next - this._size + i + CAPACITY) % CAPACITY] });
    }
    return { enabled: this.enabled, calibrationActive: this.calibrationActive,
      capacity: CAPACITY, events };
  }
}

export const diagnostics = new RecognitionDiagnostics();
