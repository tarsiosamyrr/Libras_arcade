/* ==========================================================================
   vision.js — Otimizado (Ultra Leve / Resolução Baixa / 20 FPS)
   ========================================================================== */

import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let handLandmarker = null;
let rafId = null;
let lastProcessTime = 0;
let lastVideoTime = -1;
const PROCESS_INTERVAL_MS = 50; // 50ms = 20 FPS (Suficiente e super leve)

let frameTimes = [];

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

export async function startCamera(videoEl) {
  // Resolução reduzida para 320x240 (ideal) / 480x360 (máximo)
  // O MediaPipe usa 256x256 internamente, então essa resolução economiza muita RAM sem perder precisão
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

export function startDetectionLoop(videoEl, onResults) {
  const tick = (now) => {
    // Só processa se o frame da câmera mudou E se já passou o intervalo de 50ms (20 FPS)
    if (handLandmarker && videoEl.currentTime !== lastVideoTime && (now - lastProcessTime >= PROCESS_INTERVAL_MS)) {
      lastProcessTime = now;
      lastVideoTime = videoEl.currentTime;

      const results = handLandmarker.detectForVideo(videoEl, now);

      frameTimes.push(now);
      if (frameTimes.length > 20) frameTimes.shift(); // Evita reallocar memória do array
      const fps = frameTimes.length;

      onResults(results, fps);
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

export function stopDetectionLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

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