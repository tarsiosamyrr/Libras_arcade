/* ==========================================================================
   app.js — Inicialização, desenho da mão e conexão entre visão e interface.
   O callback é direto, mas reconhecimento e UI ainda alocam objetos/eventos.
   ========================================================================== */

import { loadModel, startCamera, stopCamera, startDetectionLoop, disposeModel, HAND_CONNECTIONS, LM } from "./vision.js";
import { LibrasEngine } from "./libras.js";
import { Game } from "./game.js";
import { ForcaGame } from "./forca.js";
import { UI } from "./ui.js";
import { diagnostics } from "./diagnostics.js";

/** API local para diagnóstico voluntário no console; dados não são persistidos. */
window.librasArcadeDiagnostics = Object.freeze({
  enable: () => diagnostics.enable(),
  disable: () => diagnostics.disable(),
  clear: () => diagnostics.clear(),
  read: () => diagnostics.read()
});

const bootGate = document.getElementById('boot-gate');
const bootCore = document.getElementById('boot-core');
const bootStartBtn = document.getElementById('boot-start-btn');
const bootRing = document.getElementById('boot-ring-progress');
const bootPercent = document.getElementById('boot-percent');
const bootStatus = document.getElementById('boot-status');
const bootLog = document.getElementById('boot-log');
const bootScreen = document.getElementById('boot-screen');
const stage = document.getElementById('stage');
const errorScreen = document.getElementById('error-screen');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-camera-btn');

const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
let overlayHasHands = false;

const RING_CIRC = 565.48;

function setBootProgress(pct, label) {
  bootRing.style.strokeDashoffset = String(RING_CIRC * (1 - pct / 100));
  bootPercent.textContent = `${Math.round(pct)}%`;
  if (label) { bootStatus.textContent = label; bootLog.textContent = label; }
}

// Atribuir dimensões iguais também apaga o bitmap e reinicia o contexto 2D.
function resizeCanvas() {
  if (canvas.width !== 640 || canvas.height !== 480) {
    canvas.width = 640;
    canvas.height = 480;
    overlayHasHands = false;
  }
}
window.addEventListener('resize', resizeCanvas);

// Estilos de cores pré-alocados
const STROKE_COLOR = 'rgba(75, 216, 255, 0.45)';
const FILL_TIP_COLOR = 'rgba(75, 216, 255, 0.9)';
const FILL_JOINT_COLOR = 'rgba(75, 216, 255, 0.55)';

function drawHands(results) {
  const hands = results?.landmarks;
  const hasHands = !!hands?.length;
  // Limpa no desaparecimento da mão, mas evita trabalho quando já está vazio.
  if (hasHands || overlayHasHands) ctx.clearRect(0, 0, canvas.width, canvas.height);
  overlayHasHands = hasHands;
  if (!hasHands) return;

  const w = canvas.width;
  const h = canvas.height;

  for (let hIdx = 0; hIdx < hands.length; hIdx++) {
    const lm = hands[hIdx];

    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
      const conn = HAND_CONNECTIONS[i];
      const ptA = lm[conn[0]];
      const ptB = lm[conn[1]];
      ctx.moveTo((1 - ptA.x) * w, ptA.y * h);
      ctx.lineTo((1 - ptB.x) * w, ptB.y * h);
    }
    ctx.stroke();

    for (let i = 0; i < lm.length; i++) {
      const pt = lm[i];
      const isTip = (i === 4 || i === 8 || i === 12 || i === 16 || i === 20);
      ctx.beginPath();
      ctx.arc((1 - pt.x) * w, pt.y * h, isTip ? 4 : 2.2, 0, 6.28318);
      ctx.fillStyle = isTip ? FILL_TIP_COLOR : FILL_JOINT_COLOR;
      ctx.fill();
    }
  }
}

/** Confere a estrutura dos 21 pontos somente durante diagnóstico ativo. */
function validLandmarks(results) {
  const hands = results?.landmarks;
  if (!Array.isArray(hands)) return false;
  for (const hand of hands) {
    if (!Array.isArray(hand) || hand.length !== 21) return false;
    for (const point of hand) {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
    }
  }
  return true;
}

function dist(a, b) { 
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0)); 
}

function computeNavState(results) {
  const hands = results?.landmarks;
  if (!hands || hands.length === 0) return { cursor: null, pinch: false, fist: false };

  const lm = hands[0];
  const scale = Math.max(dist(lm[LM.WRIST], lm[LM.MIDDLE_MCP]), 1e-4);
  const pinchDist = dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) / scale;

  const extOf = (tip, mcp) => dist(lm[tip], lm[LM.WRIST]) / scale - dist(lm[mcp], lm[LM.WRIST]) / scale;
  const avgExt = (
    extOf(LM.INDEX_TIP, LM.INDEX_MCP) +
    extOf(LM.MIDDLE_TIP, LM.MIDDLE_MCP) +
    extOf(LM.RING_TIP, LM.RING_MCP) +
    extOf(LM.PINKY_TIP, LM.PINKY_MCP)
  ) * 0.25;

  return {
    cursor: { x: 1 - lm[LM.INDEX_TIP].x, y: lm[LM.INDEX_TIP].y },
    pinch: pinchDist < 0.42,
    fist: avgExt < 0.32
  };
}

let runtime = null;
let bootPromise = null;
let started = false;
let pageActive = true;
let cameraTrack = null;
let cameraEndedHandler = null;

/** Impede listeners repetidos na mesma trilha após tentativas de retomada. */
function detachCameraTrack() {
  if (cameraTrack && cameraEndedHandler) cameraTrack.removeEventListener('ended', cameraEndedHandler);
  cameraTrack = null;
  cameraEndedHandler = null;
}

function cameraErrorMessage(error) {
  switch (error?.name) {
    case 'NotAllowedError': return 'Permissão de câmera negada. Libere o acesso nas configurações do navegador e tente novamente.';
    case 'NotFoundError': return 'Nenhuma câmera foi encontrada. Conecte uma webcam e tente novamente.';
    case 'NotReadableError': return 'A câmera está ocupada ou indisponível. Feche outros aplicativos que a estejam usando.';
    case 'OverconstrainedError': return 'A câmera não atende aos requisitos de captura. Tente outra webcam.';
    case 'SecurityError': return 'Acesso à câmera bloqueado. Abra o aplicativo em localhost ou HTTPS.';
    default: return error?.message || 'Não foi possível acessar a câmera.';
  }
}

/** Congela processamento e rodada antes de liberar a câmera da aba. */
function suspend() {
  if (diagnostics.enabled) diagnostics.record('app_pause', { reason: 'camera_suspended' });
  detachCameraTrack();
  stopCamera(video);
  if (overlayHasHands) ctx.clearRect(0, 0, canvas.width, canvas.height);
  overlayHasHands = false;
  runtime?.libras.resetTracking();
  runtime?.game.pause();
  runtime?.forca.pause();
  runtime?.ui._onCursorFrame({ cursor: null, pinch: false, fist: false });
}

/** Mantém a sessão pausada para que a tentativa de câmera possa retomá-la. */
function showError(error) {
  console.error(error);
  suspend();
  bootScreen.classList.add('hidden');
  stage.classList.add('hidden');
  errorScreen.classList.remove('hidden');
  errorMessage.textContent = cameraErrorMessage(error);
}

/** Boot e retomada compartilham a mesma instância de UI, câmera e modelo. */
async function boot() {
  if (bootPromise) {
    try { await bootPromise; } catch { /* A tentativa proprietária trata a falha. */ }
    return;
  }
  const pending = (async () => {
    resizeCanvas();
    setBootProgress(5, 'Inicializando…');
    await loadModel((pct, label) => setBootProgress(pct, label));
    if (document.hidden || !pageActive) return;
    setBootProgress(90, 'Solicitando permissão de câmera…');
    const stream = await startCamera(video);
    if (document.hidden || !pageActive) { suspend(); return; }
    const track = stream.getVideoTracks?.()[0];
    if (track && track !== cameraTrack) {
      detachCameraTrack();
      cameraTrack = track;
      cameraEndedHandler = () => {
        if (video.srcObject === stream) showError(new Error('A câmera foi desconectada. Conecte-a e tente novamente.'));
      };
      track.addEventListener('ended', cameraEndedHandler);
    }
    setBootProgress(100, 'Pronto.');
    bootScreen.classList.add('hidden');
    errorScreen.classList.add('hidden');
    stage.classList.remove('hidden');
    if (!runtime) {
      const libras = new LibrasEngine();
      const game = new Game();
      const forca = new ForcaGame();
      runtime = { libras, game, forca, ui: new UI(libras, game, forca) };
    }
    runtime.game.resume();
    runtime.forca.resume();
    if (diagnostics.enabled) diagnostics.record('app_resume', { reason: 'camera_resumed' });
    // O cursor usa chamada direta; LibrasEngine continua emitindo eventos por frame.
    startDetectionLoop(video, (results, fps) => {
      const valid = !diagnostics.enabled || validLandmarks(results);
      const safeResults = valid ? results : { landmarks: [], diagnosticInvalidLandmarks: true };
      drawHands(safeResults);
      const now = performance.now();
      if (!valid) diagnostics.record('input_invalid', {
        handPresent: !!results?.landmarks?.length,
        landmarksValid: false, reason: 'invalid_landmarks'
      }, now);
      runtime.libras.update(safeResults, now, fps);
      runtime.ui._onCursorFrame(computeNavState(safeResults));
    }, showError);
  })();
  bootPromise = pending;
  let retryCanceled = false;
  try { await pending; }
  catch (error) {
    if (!document.hidden && pageActive) {
      if (/^(Inicialização da câmera|Carregamento do modelo) cancelad/.test(error?.message || '')) retryCanceled = true;
      else showError(error);
    }
  }
  finally {
    if (bootPromise === pending) bootPromise = null;
    if (retryCanceled && started && pageActive && !document.hidden) boot();
  }
}

bootStartBtn.addEventListener('click', () => {
  if (started) return;
  started = true;
  bootGate.classList.add('hidden');
  bootCore.classList.remove('hidden');
  bootLog.classList.remove('hidden');
  boot();
});
retryBtn?.addEventListener('click', () => { if (!document.hidden) boot(); });
document.addEventListener('visibilitychange', () => {
  if (!started) return;
  if (document.hidden) suspend();
  else boot();
});
window.addEventListener('pagehide', () => {
  pageActive = false;
  if (started) { suspend(); disposeModel(); }
});
window.addEventListener('pageshow', (event) => {
  pageActive = true;
  if (started && event.persisted) boot();
});
