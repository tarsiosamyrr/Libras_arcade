/* ==========================================================================
   vision.js — Modelo remoto, captura local e agendamento da inferência.
   O intervalo limita tentativas; não garante FPS nem latência de processamento.
   ========================================================================== */

import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let handLandmarker = null;
let rafId = null;
let loopGeneration = 0;
let metricsGeneration = 0;
let lastProcessTime = 0;
let lastVideoTime = -1;
const PROCESS_INTERVAL_MS = 50; // Teto nominal de 20 inferências/s; depende de vídeo e rAF.

// Buffers circulares: 120 amostras (~6 s no teto), sem shift/alocação por inferência.
const SAMPLE_LIMIT = 120;
const frameTimes = new Float64Array(SAMPLE_LIMIT);
const inferenceTimes = new Float64Array(SAMPLE_LIMIT);
const consumerTimes = new Float64Array(SAMPLE_LIMIT);
const cycleTimes = new Float64Array(SAMPLE_LIMIT);
let sampleIndex = 0;
let sampleCount = 0;
let processedFrames = 0;
let callbacks = 0;
let skippedUnchanged = 0;
let skippedInterval = 0;

function recentFps(now) {
  let count = 0;
  for (let i = 0; i < sampleCount; i++) {
    const index = (sampleIndex - 1 - i + SAMPLE_LIMIT) % SAMPLE_LIMIT;
    if (frameTimes[index] <= now - 1000) break;
    count++;
  }
  return count;
}

function summarize(buffer) {
  // Ordenação ocorre apenas sob consulta, fora do caminho normal de desenho.
  const values = Array.from(buffer.subarray(0, sampleCount)).sort((a, b) => a - b);
  return {
    mean: values.reduce((sum, value) => sum + value, 0) / (sampleCount || 1),
    p95: values[Math.max(0, Math.ceil(sampleCount * 0.95) - 1)] || 0,
    max: values[sampleCount - 1] || 0
  };
}

/**
 * Snapshot local, sem imagens: FPS na janela (agora - 1000 ms, agora]; tempos em ms
 * nas últimas 120 inferências. Skips contam callbacks, não frames perdidos da câmera.
 * Consultar também quando o vídeo estiver parado para obter FPS zero após 1 s.
 */
export function getPerformanceMetrics() {
  return {
    fps: recentFps(performance.now()), samples: sampleCount, processedFrames, callbacks,
    skippedUnchanged, skippedInterval,
    inferenceMs: summarize(inferenceTimes), consumerMs: summarize(consumerTimes),
    cycleMs: summarize(cycleTimes)
  };
}

/** Carrega WASM e modelo, solicitando GPU; não há fallback explícito para CPU. */
export async function loadModel(onProgress) {
  onProgress?.(10, 'Baixando runtime WASM…');
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);

  onProgress?.(55, 'Carregando modelo de detecção de mãos…');
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1, // 1 mão para economizar memória
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  onProgress?.(85, 'Modelo carregado. Preparando câmera…');
}

/** Associa o stream ao vídeo; o encerramento das tracks ainda precisa ser integrado. */
export async function startCamera(videoEl) {
  // Resolução reduzida para 320x240 (ideal) / 480x360 (máximo)
  // São restrições solicitadas à câmera; o impacto em memória e precisão não foi medido.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { 
      width: { ideal: 320, max: 480 }, 
      height: { ideal: 240, max: 360 },
      frameRate: { ideal: 30, max: 30 }
    },
    audio: false
  });

  videoEl.srcObject = stream;

  return new Promise((resolve) => {
    videoEl.onloadeddata = () => {
      videoEl.play();
      resolve(stream);
    };
    if (videoEl.readyState >= 2) {
      videoEl.play();
      resolve(stream);
    }
  });
}

/** Uma cadeia de rAF por vez; mantém deduplicação, timestamps e intervalo original. */
export function startDetectionLoop(videoEl, onResults) {
  stopDetectionLoop();
  const generation = loopGeneration;
  const metricsSession = ++metricsGeneration;
  lastProcessTime = 0;
  lastVideoTime = -1;
  sampleIndex = sampleCount = processedFrames = callbacks = skippedUnchanged = skippedInterval = 0;
  const tick = (now) => {
    if (generation !== loopGeneration) return;
    rafId = null;
    callbacks++;
    // Só processa se o frame da câmera mudou E se já passou o intervalo de 50ms (20 FPS)
    if (handLandmarker && videoEl.currentTime !== lastVideoTime && (now - lastProcessTime >= PROCESS_INTERVAL_MS)) {
      lastProcessTime = now;
      lastVideoTime = videoEl.currentTime;

      const inferenceStart = performance.now();
      const results = handLandmarker.detectForVideo(videoEl, now);
      const inferenceEnd = performance.now();
      const fps = recentFps(inferenceEnd) + 1;
      const index = sampleIndex;
      frameTimes[index] = inferenceEnd;
      inferenceTimes[index] = inferenceEnd - inferenceStart;
      consumerTimes[index] = cycleTimes[index] = 0;
      sampleIndex = (sampleIndex + 1) % SAMPLE_LIMIT;
      sampleCount = Math.min(sampleCount + 1, SAMPLE_LIMIT);
      processedFrames++;

      const consumerStart = performance.now();
      onResults(results, fps);
      // Parar finaliza a amostra; reiniciar não pode contaminar a nova sessão.
      if (metricsSession !== metricsGeneration) return;
      const consumerEnd = performance.now();
      consumerTimes[index] = consumerEnd - consumerStart;
      cycleTimes[index] = consumerEnd - inferenceStart;
    } else if (handLandmarker) {
      if (videoEl.currentTime === lastVideoTime) skippedUnchanged++;
      else skippedInterval++;
    }
    if (generation === loopGeneration) rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

/** Cancela o loop e invalida reagendamentos antigos; câmera/modelo têm ciclo separado. */
export function stopDetectionLoop() {
  loopGeneration++;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

/** A primeira mão assume o papel lógico "right"; a lateralidade não é consultada. */
export function splitHandsByRole(results) {
  const landmarksList = results?.landmarks ?? [];
  if (landmarksList.length === 0) return { left: null, right: null };
  return { left: null, right: { landmarks: landmarksList[0], index: 0, score: 1.0 } };
}

export const LM = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
};

export const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];
