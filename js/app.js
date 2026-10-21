/* ==========================================================================
   app.js — Inicialização, desenho da mão e conexão entre visão e interface.
   O callback é direto, mas reconhecimento e UI ainda alocam objetos/eventos.
   ========================================================================== */

import { loadModel, startCamera, startDetectionLoop, HAND_CONNECTIONS, LM } from "./vision.js";
import { LibrasEngine } from "./libras.js";
import { Game } from "./game.js";
import { ForcaGame } from "./forca.js";
import { UI } from "./ui.js";

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

async function boot() {
  try {
    resizeCanvas();
    setBootProgress(5, 'Inicializando…');

    await loadModel((pct, label) => setBootProgress(pct, label));

    setBootProgress(90, 'Solicitando permissão de câmera…');
    await startCamera(video);

    setBootProgress(100, 'Pronto.');
    await new Promise((r) => setTimeout(r, 350));

    bootScreen.classList.add('hidden');
    stage.classList.remove('hidden');

    const libras = new LibrasEngine();
    const game = new Game();
    const forca = new ForcaGame();
    const ui = new UI(libras, game, forca);

    // O cursor usa chamada direta; LibrasEngine continua emitindo eventos por frame.
    startDetectionLoop(video, (results, fps) => {
      drawHands(results);
      libras.update(results, performance.now(), fps);
      ui._onCursorFrame(computeNavState(results));
    });

  } catch (err) {
    console.error(err);
    bootScreen.classList.add('hidden');
    errorScreen.classList.remove('hidden');
    errorMessage.textContent = err?.message || 'Erro desconhecido.';
  }
}

bootStartBtn.addEventListener('click', () => {
  bootGate.classList.add('hidden');
  bootCore.classList.remove('hidden');
  bootLog.classList.remove('hidden');
  boot();
});
