/* ==========================================================================
   libras.js
   Classificador GEOMÉTRICO (baseado em regras) de datilologia (alfabeto
   manual) da Libras, usando os 21 landmarks da mão do MediaPipe.

   IMPORTANTE — leia antes de calibrar:
   Este NÃO é o mesmo método do projeto de referência
   (github.com/CristianSena17/Reconhecimento-Libras), que treina uma rede
   neural (TFLite) sobre um histórico de coordenadas gravado em CSV. Aqui,
   para manter a filosofia 100% client-side / sem backend / sem passo de
   treinamento do jarvis-hud, usamos heurísticas geométricas: medimos
   distâncias/ângulos entre pontos da mão (normalizadas pela própria escala
   da mão, igual gestures.js do projeto original) e comparamos com um
   "padrão esperado" de cada letra.

   ------------------------------------------------------------------------
   ATUALIZAÇÃO — ALFABETO COMPLETO (A–Z)
   ------------------------------------------------------------------------
   Esta versão cobre as 26 letras. Elas se dividem em três grupos de
   confiabilidade, do mais ao menos confiável — isso é uma limitação real
   de um classificador geométrico de UM ÚNICO FRAME (sem dataset, sem rede
   treinada), não um bug a ser "consertado" sem recalibrar:

   1) SÓLIDAS (herdadas da v1, formas bem distintas entre si):
        A · B · D · F · I · L · O · U · V · W · Y

   2) NOVAS ESTÁTICAS (formas plausíveis com landmarks de um frame só, mas
      algumas são naturalmente parecidas entre si — ex.: M/N/S/T/A são
      todas variações de "punho fechado" que só diferem pela posição exata
      do polegar; G/Q, K/P e H/U só se diferenciam pela ORIENTAÇÃO da mão
      no espaço, não pela forma dos dedos em si):
        C · E · G · H · K · M · N · P · Q · R · S · T · X

   3) MOVIMENTO (aproximação experimental):
        J e Z são, na Libras real, sinais DINÂMICOS — J é um "I" que
        desenha um gancho no ar, Z é um "D" que desenha a letra Z no ar.
        Um classificador de frame único não pode "ver" movimento, então
        para essas duas letras adicionamos um pequeno rastreador de
        TRAJETÓRIA (buffer de posições da ponta do dedo ao longo de ~1,3s,
        com suavização por média móvel e tolerância a perder a pose-base
        por um instante) que roda em paralelo ao reconhecimento estático —
        ver a seção "GESTOS COM MOVIMENTO" mais abaixo. É best-effort:
        sensível a iluminação, framerate e ao tamanho do gesto, mas já bem
        mais tolerante do que a primeira versão.

   Se um par de letras estiver se confundindo na sua câmera, abra o painel
   de diagnóstico (tecla `d`) e ajuste os limiares em CONFIG — igual já
   era recomendado na v1 para as 11 letras originais.

   Este módulo não toca no DOM — só recebe landmarks e emite eventos.
   ========================================================================== */

import { LM, splitHandsByRole } from "./vision.js";
import { diagnostics } from "./diagnostics.js";

/* --------------------------------------------------------- CALIBRAÇÃO ---
   Se os sinais não forem bem reconhecidos na sua câmera/iluminação, ajuste
   estes valores primeiro. O painel de diagnóstico (tecla `d`) mostra os
   valores brutos calculados em tempo real.
------------------------------------------------------------------------- */
export const CONFIG = {
  // --- v1 (letras originais) ---
  FINGER_EXT_ON: 0.50,     // acima disso, dedo é considerado "estendido"
  FINGER_EXT_OFF: 0.38,    // abaixo disso, dedo é considerado "fechado"
  THUMB_OUT_ON: 0.45,      // polegar afastado da palma (L, Y, A, G, Q)
  THUMB_TUCK_OFF: 0.42,    // polegar cruzado sobre a palma (B, S)
  PINCH_ON: 0.42,          // ponta do polegar tocando outra ponta (F, O)
  SPREAD_TOGETHER: 0.22,   // dedos colados (U)
  SPREAD_APART: 0.34,      // dedos separados (V, W)
  MIN_SCORE: 0.55,         // escore heurístico mínimo; não é probabilidade de acerto
  HOLD_MS: 600,            // tempo segurando o sinal para confirmar
  RELEASE_GRACE_MS: 250,   // tolerância a "tremores" de detecção
  CONFIRM_COOLDOWN_MS: 900, // hipótese inicial: intervalo sem novas confirmações
  REARM_RELEASE_MS: 250,   // ausência contínua de candidata para repetir a mesma letra
  REARM_CHANGE_MS: 300,    // nova letra contínua antes de aceitar uma transição sem retirar a mão

  // --- novo: curvatura de dedo (dedo "em gancho"/curvado vs reto/fechado) ---
  CURL_HOOK_LO: 0.16,      // abaixo disso, dedo é considerado reto
  CURL_HOOK_HI: 0.40,      // faixa [LO,HI] = "gancho"/curva parcial (C, X)
  CURL_CLOSED_ON: 0.62,    // acima disso, dedo bem fechado (E, M, N, S, T)

  // --- novo: polegar "perto" de um ponto de referência (T, K, P, M, N) ---
  THUMB_NEAR_ON: 0.28,
  THUMB_NEAR_OFF: 0.5,

  // --- novo: dedos cruzados (R) ---
  CROSS_ON: 0.22,
  CROSS_OFF: 0.42,

  // --- novo: ângulo interno polegar/indicador (L vs G) ---
  THUMB_INDEX_ANGLE_L_LO: 55,
  THUMB_INDEX_ANGLE_L_HI: 130,
  THUMB_INDEX_ANGLE_G_LO: 0,
  THUMB_INDEX_ANGLE_G_HI: 40,

  // --- novo: orientação da mão no espaço (G/Q, K/P, H/U) ---
  ANGLE_TOL_ON: 30,        // graus — dentro disso, direção considerada correta
  ANGLE_TOL_OFF: 90,       // graus — fora disso, direção considerada errada

  // --- gestos com MOVIMENTO (J, Z) ---
  MOTION_WINDOW_MS: 1300,          // janela de tempo analisada
  MOTION_BASE_GRACE_MS: 300,       // tolerância a perder a pose-base por um instante sem zerar o trajeto acumulado
  MOTION_SMOOTH_WINDOW: 3,         // nº de amostras usadas na média móvel que filtra tremor de câmera
  MOTION_MIN_SAMPLES: 6,           // amostras mínimas antes de avaliar o gesto
  MOTION_MIN_SPAN: 0.26,           // deslocamento mínimo p/ contar como movimento de verdade
  MOTION_INTENT_WINDOW_MS: 400,    // janela recente para distinguir deslocamento dirigido de tremor acumulado
  MOTION_INTENT_MIN_SPAN: 0.06,    // deslocamento líquido recente que suspende o hold da pose-base
  MOTION_INTENT_MIN_VERTICAL: 0.04, // progressão vertical recente para separar desenho de vai-e-vem lateral
  MOTION_INTENT_GRACE_MS: 300,     // espera curta por continuação antes de devolver a pose ao hold estático
  MOTION_REARM_STILL_MS: 250,      // pausa observável da ponta antes de outro J/Z após sinal dinâmico
  MOTION_REARM_STILL_SPAN: 0.04,   // raio normalizado da ponta durante essa pausa
  MOTION_ANCHOR_STILL_SPAN: 0.03,  // ignora amostras estacionárias anteriores ao início do trajeto
  J_TURN_ANGLE_ON: 35,             // graus de curva mínima no trajeto p/ reconhecer o gancho do J
  J_CURVINESS_ON: 1.15,            // trajeto/deslocamento-reto mínimo p/ considerar "curvo"
  J_STEM_MAX_LATERAL_RATIO: 1,    // no segmento, a descida deve dominar a deriva lateral
  J_HOOK_MIN_RISE: 0.03,          // retorno na fronteira do raio de pose estacionária
  J_HOOK_MIN_SIDE: 0.06,          // avanço lateral do retorno; mesmos pisos da intenção dinâmica
  J_MIN_VERTICAL_NET: 0.10,       // avanço vertical líquido mínimo do gancho, na escala da mão
  J_MIN_VERTICAL_CONSISTENCY: 0.65, // parte do percurso vertical na direção dominante
  Z_DIRECTION_FLIPS_ON: 2,         // nº mínimo de inversões horizontais p/ reconhecer o zigue-zague do Z
  Z_MIN_STEP_RATIO: 0.22,          // fração do deslocamento mínimo usada como "passo" pra contar uma inversão de direção
  Z_MIN_LEG_SPAN: 0.08,           // cada traço deve cobrir mais que um passo isolado de detecção
  Z_MIN_MIDDLE_VERTICAL: 0.04,    // traço diagonal intermediário deve progredir verticalmente
  Z_MIN_TOTAL_VERTICAL: 0.10,     // separação vertical entre início e fim do desenho
  Z_MIN_VERTICAL_CONSISTENCY: 0.75, // rejeita oscilação vertical repetitiva
  Z_MIN_DURATION_MS: 300,        // tempo mínimo para observar três traços distintos

  // --- DUAS MÃOS: mão esquerda como "portão" de confirmação ---
  // O portão existe no motor, mas vision.js detecta uma mão e sempre retorna
  // left=null. Ativar somente esta flag bloquearia as confirmações; duas mãos
  // exigem revisar também a detecção e a atribuição de papéis em vision.js.
  REQUIRE_LEFT_HAND: false,
  LEFT_HAND_OPEN_MIN: 0.6,   // confiança mínima (0..1) de "mão aberta" pra considerar o portão liberado

  // --- gesto de NAVEGAÇÃO: deslizar a mão da esquerda pra direita = voltar ---
  // Funciona com qualquer mão (não depende do papel esquerda/direita acima
  // — é navegação, não datilologia), analisando o deslocamento do PULSO ao
  // longo do tempo, com as mesmas salvaguardas já usadas no gancho do J e
  // no zigue-zague do Z: janela de tempo, distância mínima, suavização, e
  // agora também um teto de deriva vertical e um piso de "quão em linha
  // reta" foi o movimento, pra não confundir um deslize de verdade com
  // tremor ou com o usuário só reposicionando a mão.
  SWIPE_WINDOW_MS: 700,        // o deslize precisa se completar dentro desse tempo
  SWIPE_MIN_SAMPLES: 6,        // amostras mínimas antes de avaliar
  SWIPE_MIN_SPAN: 0.35,        // deslocamento horizontal mínimo (fração da largura do quadro) — bem deliberado, evita ativação por engano
  SWIPE_MAX_VERTICAL_DRIFT: 0.25, // deriva vertical máxima tolerada — um deslize "sujo" (subindo/descendo demais) não conta
  SWIPE_MIN_MONOTONICITY: 0.7,    // fração mínima de passos consecutivos na mesma direção — rejeita "vai-e-vem"
  SWIPE_COOLDOWN_MS: 1200         // intervalo de segurança após reconhecer, antes de aceitar outro deslize
};

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function handScale(lm) {
  return Math.max(dist(lm[LM.WRIST], lm[LM.MIDDLE_MCP]), 1e-4);
}

function fingerExt(lm, tipIdx, mcpIdx, wrist, scale) {
  return dist(lm[tipIdx], wrist) / scale - dist(lm[mcpIdx], wrist) / scale;
}

// curvatura de um dedo: ~0 = reto (colinear), ~0.3 = dobrado em ângulo reto
// (gancho/curva), ~0.7+ = bem fechado (fist). Não depende da escala da mão
// porque é uma RAZÃO entre distâncias do próprio dedo.
function fingerCurl(lm, tipIdx, pipIdx, mcpIdx) {
  const segMcpPip = dist(lm[mcpIdx], lm[pipIdx]);
  const segPipTip = dist(lm[pipIdx], lm[tipIdx]);
  const straight = dist(lm[mcpIdx], lm[tipIdx]);
  const bent = Math.max(segMcpPip + segPipTip, 1e-4);
  return 1 - straight / bent;
}

// ângulo (graus) de um vetor 2D em relação a "para cima" na imagem
// (0° = cima, 90° = direita, -90°/270° = esquerda, ±180° = baixo)
function vecAngleUpDeg(vx, vy) {
  return Math.atan2(vx, -vy) * 180 / Math.PI;
}

// ângulo (graus) entre dois vetores 2D quaisquer (0..180), independe de
// orientação da câmera — usado para comparar dedos ENTRE SI (ex.: polegar
// vs indicador), não a mão inteira contra o mundo.
function vecAngleBetweenDeg(v1x, v1y, v2x, v2y) {
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y) || 1e-4;
  const m2 = Math.hypot(v2x, v2y) || 1e-4;
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)));
  return Math.acos(cos) * 180 / Math.PI;
}

// converte um valor contínuo em "confiança" de estar ligado(1)/desligado(0)
// suavizando a borda de decisão em vez de um corte binário seco
function fuzzyOn(value, off, on) {
  if (value <= off) return 0;
  if (value >= on) return 1;
  return (value - off) / (on - off);
}
function fuzzyOff(value, off, on) { return 1 - fuzzyOn(value, off, on); }

// confiança em "pico": alta dentro da faixa [lo,hi], cai linearmente fora
// dela (largura da rampa = metade da largura da própria faixa). Útil para
// features onde nem "muito pouco" nem "demais" deveriam contar (ex.: dedo
// parcialmente curvado, nem reto nem fechado).
function fuzzyBand(value, lo, hi) {
  const half = Math.max((hi - lo) / 2, 1e-4);
  if (value < lo) return Math.max(0, 1 - (lo - value) / half);
  if (value > hi) return Math.max(0, 1 - (value - hi) / half);
  return 1;
}

// menor distância angular entre dois ângulos (graus), já tratando o
// "salto" de 180° para -180° (wraparound).
function angularDist(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
function fuzzyNearAngle(angle, target, tolOn, tolOff) {
  const d = angularDist(angle, target);
  if (d <= tolOn) return 1;
  if (d >= tolOff) return 0;
  return 1 - (d - tolOn) / (tolOff - tolOn);
}
function sidewaysScore(angle) {
  return Math.max(
    fuzzyNearAngle(angle, 90, CONFIG.ANGLE_TOL_ON, CONFIG.ANGLE_TOL_OFF),
    fuzzyNearAngle(angle, -90, CONFIG.ANGLE_TOL_ON, CONFIG.ANGLE_TOL_OFF)
  );
}
function upScore(angle) { return fuzzyNearAngle(angle, 0, CONFIG.ANGLE_TOL_ON, CONFIG.ANGLE_TOL_OFF); }
function downScore(angle) { return fuzzyNearAngle(angle, 180, CONFIG.ANGLE_TOL_ON, CONFIG.ANGLE_TOL_OFF); }
function uprightScore(angle) { return 1 - sidewaysScore(angle); }

/**
 * Extrai as features geométricas de uma mão (21 landmarks do MediaPipe).
 */
function extractFeatures(lm) {
  const wrist = lm[LM.WRIST];
  const scale = handScale(lm);

  const extIndex = fingerExt(lm, LM.INDEX_TIP, LM.INDEX_MCP, wrist, scale);
  const extMiddle = fingerExt(lm, LM.MIDDLE_TIP, LM.MIDDLE_MCP, wrist, scale);
  const extRing = fingerExt(lm, LM.RING_TIP, LM.RING_MCP, wrist, scale);
  const extPinky = fingerExt(lm, LM.PINKY_TIP, LM.PINKY_MCP, wrist, scale);

  const thumbOut = dist(lm[LM.THUMB_TIP], lm[LM.INDEX_MCP]) / scale;   // polegar afastado (L/Y/G/Q)
  const thumbAcross = dist(lm[LM.THUMB_TIP], lm[LM.MIDDLE_MCP]) / scale; // polegar cruzado na frente (B/S)
  const thumbIndexPinch = dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) / scale; // pinça (F)
  const thumbMiddlePinch = dist(lm[LM.THUMB_TIP], lm[LM.MIDDLE_TIP]) / scale; // pinça (O/C/E)

  const spreadIM = dist(lm[LM.INDEX_TIP], lm[LM.MIDDLE_TIP]) / scale;  // U vs V
  const spreadMR = dist(lm[LM.MIDDLE_TIP], lm[LM.RING_TIP]) / scale;   // V vs W

  // --- novas features (alfabeto completo) ---
  const curlIndex = fingerCurl(lm, LM.INDEX_TIP, LM.INDEX_PIP, LM.INDEX_MCP);
  const curlMiddle = fingerCurl(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP, LM.MIDDLE_MCP);
  const curlRing = fingerCurl(lm, LM.RING_TIP, LM.RING_PIP, LM.RING_MCP);
  const curlPinky = fingerCurl(lm, LM.PINKY_TIP, LM.PINKY_PIP, LM.PINKY_MCP);

  const thumbPinkyMcp = dist(lm[LM.THUMB_TIP], lm[LM.PINKY_MCP]) / scale;   // profundidade do polegar escondido (M)
  const thumbRingMcp = dist(lm[LM.THUMB_TIP], lm[LM.RING_MCP]) / scale;     // profundidade do polegar escondido (N)

  const imMidX = (lm[LM.INDEX_PIP].x + lm[LM.MIDDLE_PIP].x) / 2;
  const imMidY = (lm[LM.INDEX_PIP].y + lm[LM.MIDDLE_PIP].y) / 2;
  const thumbBetweenIM = dist(lm[LM.THUMB_TIP], { x: imMidX, y: imMidY }) / scale; // polegar entre ind/méd (K, P, T)

  // pontas cruzadas (R): quando cruzados, a ponta do indicador fica perto
  // da base do médio e vice-versa — a distância cruzada cai bastante.
  const crossIM = (dist(lm[LM.INDEX_TIP], lm[LM.MIDDLE_PIP]) + dist(lm[LM.MIDDLE_TIP], lm[LM.INDEX_PIP])) / 2 / scale;

  // ângulo interno entre polegar e indicador (rotation-invariant): ~90° em
  // "L" (polegar perpendicular ao indicador), ~0-40° em "G" (quase paralelos).
  const thumbVX = lm[LM.THUMB_TIP].x - lm[LM.THUMB_CMC].x;
  const thumbVY = lm[LM.THUMB_TIP].y - lm[LM.THUMB_CMC].y;
  const indexVX = lm[LM.INDEX_TIP].x - lm[LM.INDEX_MCP].x;
  const indexVY = lm[LM.INDEX_TIP].y - lm[LM.INDEX_MCP].y;
  const thumbIndexAngle = vecAngleBetweenDeg(thumbVX, thumbVY, indexVX, indexVY);

  // direção da mão no espaço da imagem (para pares que só diferem por
  // orientação: G/Q, K/P, H/U) — sensível ao ângulo da câmera, por natureza.
  const pointAngleIndex = vecAngleUpDeg(lm[LM.INDEX_TIP].x - wrist.x, lm[LM.INDEX_TIP].y - wrist.y);
  const pointAngleIM = vecAngleUpDeg(
    ((lm[LM.INDEX_TIP].x + lm[LM.MIDDLE_TIP].x) / 2) - wrist.x,
    ((lm[LM.INDEX_TIP].y + lm[LM.MIDDLE_TIP].y) / 2) - wrist.y
  );

  return {
    extIndex, extMiddle, extRing, extPinky,
    thumbOut, thumbAcross, thumbIndexPinch, thumbMiddlePinch,
    spreadIM, spreadMR,
    curlIndex, curlMiddle, curlRing, curlPinky,
    thumbPinkyMcp, thumbRingMcp, thumbBetweenIM, crossIM,
    thumbIndexAngle, pointAngleIndex, pointAngleIM
  };
}

/**
 * Cada regra devolve uma confiança 0..1 a partir das features.
 * A confiança final da letra é a MÉDIA dos componentes checados — assim,
 * "quase acertar" um sinal já dá algum feedback visual (barra parcial),
 * e não é um sim/não seco.
 */
const RULES = {
  A(f) {
    return avg(
      fuzzyOff(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      // Torna a checagem do polegar mais tolerante (baixa os limiares)
      fuzzyOn(f.thumbOut, CONFIG.THUMB_TUCK_OFF * 0.7, CONFIG.THUMB_OUT_ON * 0.7)
    );
  },
  B(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.thumbAcross, CONFIG.THUMB_TUCK_OFF, CONFIG.THUMB_OUT_ON)
    );
  },
  D(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.thumbMiddlePinch, CONFIG.PINCH_ON, CONFIG.PINCH_ON + 0.25)
    );
  },
  F(f) {
    return avg(
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.thumbIndexPinch, CONFIG.PINCH_ON, CONFIG.PINCH_ON + 0.25)
    );
  },
  I(f) {
    return avg(
      fuzzyOff(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON)
    );
  },
  L(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.thumbOut, CONFIG.THUMB_TUCK_OFF, CONFIG.THUMB_OUT_ON),
      fuzzyBand(f.thumbIndexAngle, CONFIG.THUMB_INDEX_ANGLE_L_LO, CONFIG.THUMB_INDEX_ANGLE_L_HI)
    );
  },
  O(f) {
    return avg(
      fuzzyOff(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON + 0.15),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON + 0.15),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON + 0.15),
      fuzzyOff(f.thumbMiddlePinch, CONFIG.PINCH_ON, CONFIG.PINCH_ON + 0.25)
    );
  },
  U(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.spreadIM, CONFIG.SPREAD_TOGETHER, CONFIG.SPREAD_APART),
      uprightScore(f.pointAngleIM),
      fuzzyOn(f.crossIM, CONFIG.CROSS_ON, CONFIG.CROSS_OFF)
    );
  },
  V(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.spreadIM, CONFIG.SPREAD_TOGETHER, CONFIG.SPREAD_APART),
      fuzzyOn(f.thumbBetweenIM, CONFIG.THUMB_NEAR_ON, CONFIG.THUMB_NEAR_OFF)
    );
  },
  W(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.spreadMR, CONFIG.SPREAD_TOGETHER, CONFIG.SPREAD_APART)
    );
  },
  Y(f) {
    return avg(
      fuzzyOff(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.thumbOut, CONFIG.THUMB_TUCK_OFF, CONFIG.THUMB_OUT_ON)
    );
  },

  /* ------------------------ novas letras estáticas ------------------------ */

  C(f) {
    return avg(
      fuzzyBand(f.curlIndex, CONFIG.CURL_HOOK_LO, CONFIG.CURL_HOOK_HI),
      fuzzyBand(f.curlMiddle, CONFIG.CURL_HOOK_LO, CONFIG.CURL_HOOK_HI),
      fuzzyBand(f.curlRing, CONFIG.CURL_HOOK_LO, CONFIG.CURL_HOOK_HI),
      fuzzyBand(f.curlPinky, CONFIG.CURL_HOOK_LO, CONFIG.CURL_HOOK_HI),
      fuzzyOff(f.thumbMiddlePinch, CONFIG.PINCH_ON, CONFIG.PINCH_ON + 0.35)
    );
  },
  E(f) {
    return avg(
      fuzzyOn(f.curlIndex, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlMiddle, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlRing, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlPinky, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.thumbMiddlePinch, CONFIG.PINCH_ON, CONFIG.PINCH_ON + 0.25)
    );
  },
  G(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.thumbOut, CONFIG.THUMB_TUCK_OFF, CONFIG.THUMB_OUT_ON),
      fuzzyBand(f.thumbIndexAngle, CONFIG.THUMB_INDEX_ANGLE_G_LO, CONFIG.THUMB_INDEX_ANGLE_G_HI),
      sidewaysScore(f.pointAngleIndex)
    );
  },
  H(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.spreadIM, CONFIG.SPREAD_TOGETHER, CONFIG.SPREAD_APART),
      sidewaysScore(f.pointAngleIM)
    );
  },
  K(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.spreadIM, CONFIG.SPREAD_TOGETHER, CONFIG.SPREAD_APART),
      fuzzyOff(f.thumbBetweenIM, CONFIG.THUMB_NEAR_ON, CONFIG.THUMB_NEAR_OFF),
      upScore(f.pointAngleIM)
    );
  },
  M(f) {
    return avg(
      fuzzyOn(f.curlIndex, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlMiddle, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlRing, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.thumbPinkyMcp, CONFIG.THUMB_NEAR_ON, CONFIG.THUMB_NEAR_OFF)
    );
  },
  N(f) {
    return avg(
      fuzzyOn(f.curlIndex, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlMiddle, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.thumbRingMcp, CONFIG.THUMB_NEAR_ON, CONFIG.THUMB_NEAR_OFF),
      fuzzyOn(f.thumbPinkyMcp, CONFIG.THUMB_NEAR_ON, CONFIG.THUMB_NEAR_OFF)
    );
  },
  P(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.spreadIM, CONFIG.SPREAD_TOGETHER, CONFIG.SPREAD_APART),
      fuzzyOff(f.thumbBetweenIM, CONFIG.THUMB_NEAR_ON, CONFIG.THUMB_NEAR_OFF),
      downScore(f.pointAngleIM)
    );
  },
  Q(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.thumbOut, CONFIG.THUMB_TUCK_OFF, CONFIG.THUMB_OUT_ON),
      fuzzyBand(f.thumbIndexAngle, CONFIG.THUMB_INDEX_ANGLE_G_LO, CONFIG.THUMB_INDEX_ANGLE_G_HI),
      downScore(f.pointAngleIndex)
    );
  },
  R(f) {
    return avg(
      fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.crossIM, CONFIG.CROSS_ON, CONFIG.CROSS_OFF)
    );
  },
  S(f) {
    return avg(
      fuzzyOn(f.curlIndex, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlMiddle, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlRing, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlPinky, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOff(f.thumbAcross, CONFIG.THUMB_TUCK_OFF, CONFIG.THUMB_OUT_ON)
    );
  },
  T(f) {
    return avg(
      fuzzyOn(f.curlMiddle, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOn(f.curlRing, CONFIG.CURL_HOOK_HI, CONFIG.CURL_CLOSED_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.thumbBetweenIM, CONFIG.THUMB_NEAR_ON, CONFIG.THUMB_NEAR_OFF)
    );
  },
  X(f) {
    return avg(
      fuzzyBand(f.curlIndex, CONFIG.CURL_HOOK_LO, CONFIG.CURL_HOOK_HI),
      fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
      fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON)
    );
  }
};

// Apenas durante calibração voluntária: concorrentes dos grupos em análise.
const CALIBRATION_RULES = new Set(['A', 'B', 'C', 'F', 'G', 'I', 'K', 'O', 'P', 'T', 'V', 'Y']);
const CALIBRATION_FEATURES = [
  'extIndex', 'extMiddle', 'extRing', 'extPinky',
  'curlIndex', 'curlMiddle', 'curlRing', 'curlPinky',
  'thumbOut', 'thumbAcross', 'thumbIndexPinch', 'thumbMiddlePinch',
  'thumbBetweenIM', 'thumbIndexAngle', 'spreadIM', 'pointAngleIndex', 'pointAngleIM'
];

// letras reconhecidas por FORMA ESTÁTICA (um frame só)
export const STATIC_LETTERS = Object.keys(RULES);
// letras reconhecidas por TRAJETÓRIA DE MOVIMENTO (ver LibrasEngine._trackMotionSigns)
export const MOTION_LETTERS = ['J', 'Z'];
// Cobertura nominal de 26 letras; presença na lista não comprova precisão pedagógica.
export const SUPPORTED_LETTERS = [...STATIC_LETTERS, ...MOTION_LETTERS];

function avg(...vals) { return vals.reduce((a, b) => a + b, 0) / vals.length; }

/** Mão "aberta": os quatro dedos (fora o polegar) estendidos — não precisa
 *  ser uma letra específica, só uma mão relaxada e visível, servindo de
 *  referência de forma/posição enquanto a mão direita sinaliza a letra. */
function isOpenHand(f) {
  const openness = avg(
    fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
    fuzzyOn(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
    fuzzyOn(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON),
    fuzzyOn(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON)
  );
  return openness >= CONFIG.LEFT_HAND_OPEN_MIN;
}

function classify(features, includeRunnerUp = false, includeCalibration = false) {
  let best = null;
  let bestScore = 0;
  let second = null;
  let secondScore = 0;
  const calibrationScores = includeCalibration ? {} : null;
  for (const letter of STATIC_LETTERS) {
    const score = RULES[letter](features);
    if (calibrationScores && CALIBRATION_RULES.has(letter)) calibrationScores[`score${letter}`] = score;
    if (score > bestScore) {
      if (includeRunnerUp) { second = best; secondScore = bestScore; }
      bestScore = score;
      best = letter;
    } else if (includeRunnerUp && score > secondScore) {
      second = letter;
      secondScore = score;
    }
  }
  const ranking = includeRunnerUp
    ? { letter: best, score: bestScore, second, secondScore }
    : { letter: best, score: bestScore };
  if (calibrationScores) ranking.calibrationScores = calibrationScores;
  return ranking;
}

/* --------------------------------------------- GESTOS COM MOVIMENTO (J, Z) --- */
function isPinkyUpBase(f) {
  return (
    fuzzyOff(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON) > 0.5 &&
    fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON) > 0.5 &&
    fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON) > 0.5 &&
    fuzzyOn(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON) > 0.5
  );
}
function isIndexUpBase(f) {
  return (
    fuzzyOn(f.extIndex, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON) > 0.5 &&
    fuzzyOff(f.extMiddle, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON) > 0.5 &&
    fuzzyOff(f.extRing, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON) > 0.5 &&
    fuzzyOff(f.extPinky, CONFIG.FINGER_EXT_OFF, CONFIG.FINGER_EXT_ON) > 0.5
  );
}

function smoothPath(pts, windowSize) {
  if (pts.length < windowSize) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = pts.slice(start, i + 1);
    const x = slice.reduce((a, p) => a + p.x, 0) / slice.length;
    const y = slice.reduce((a, p) => a + p.y, 0) / slice.length;
    out.push({ x, y, t: pts[i].t });
  }
  return out;
}

function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}
function netDisplacement(pts) {
  const a = pts[0], b = pts[pts.length - 1];
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function turnAngleDeg(pts) {
  if (pts.length < 4) return 0;
  const mid = Math.floor(pts.length / 2);
  const v1x = pts[mid].x - pts[0].x, v1y = pts[mid].y - pts[0].y;
  const v2x = pts[pts.length - 1].x - pts[mid].x, v2y = pts[pts.length - 1].y - pts[mid].y;
  const a1 = Math.atan2(v1y, v1x), a2 = Math.atan2(v2y, v2x);
  let d = Math.abs(a1 - a2) * 180 / Math.PI;
  return d > 180 ? 360 - d : d;
}
function horizontalDirectionFlips(pts, minStep) {
  let flips = 0, lastDir = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    if (Math.abs(dx) < minStep) continue;
    const dir = dx > 0 ? 1 : -1;
    if (lastDir !== 0 && dir !== lastDir) flips++;
    lastDir = dir;
  }
  return flips;
}

/** Fração do percurso vertical no sentido dominante; 0,5 indica vai-e-vem simétrico. */
function verticalDirectionConsistency(pts) {
  let positive = 0, negative = 0;
  for (let i = 1; i < pts.length; i++) {
    const dy = pts[i].y - pts[i - 1].y;
    if (dy > 0) positive += dy;
    else negative -= dy;
  }
  const total = positive + negative;
  return total > 0 ? Math.max(positive, negative) / total : 0;
}

/** Segmenta J pelo ponto mais baixo. Retorna a condição que falhou, ou null.
 * Descida e desvio são deslocamentos líquidos normalizados; ruído entre frames
 * não precisa formar três passos consecutivos. O retorno vem depois da haste.
 */
function jShapeRejection(pts, metrics = null) {
  let trough = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].y > pts[trough].y) trough = i;
  }
  const start = pts[0], last = pts[pts.length - 1];
  const stemDescent = pts[trough].y - start.y;
  const stemSide = Math.abs(pts[trough].x - start.x);
  const hookRise = pts[trough].y - last.y;
  const hookSide = Math.abs(last.x - pts[trough].x);
  let down = 0, up = 0, run = 0, maxStemRun = 0;
  for (let i = 1; i <= trough; i++) {
    const dy = pts[i].y - pts[i - 1].y;
    if (dy > 0) { down += dy; run++; maxStemRun = Math.max(maxStemRun, run); }
    else { up -= dy; run = 0; }
  }
  if (metrics) Object.assign(metrics, {
    stemDescent, stemSide, hookRise, hookSide, maxStemRun,
    stemConsistency: down + up > 0 ? down / (down + up) : 0
  });
  if (stemDescent < CONFIG.MOTION_MIN_SPAN) return 'stem_insufficient';
  if (stemSide > stemDescent * CONFIG.J_STEM_MAX_LATERAL_RATIO) return 'stem_inclined';
  if (up > 0 && down / (down + up) < CONFIG.J_MIN_VERTICAL_CONSISTENCY) return 'stem_incoherent';
  if (hookRise <= 0) return 'hook_absent';
  if (hookRise < CONFIG.J_HOOK_MIN_RISE) return 'hook_rise_short';
  if (hookSide < CONFIG.J_HOOK_MIN_SIDE) return 'hook_lateral_short';
  return null;
}

/** Exige três traços alternados, com a descida/subida do meio no sentido da progressão total. */
function hasZStrokePattern(pts, minStep) {
  let previousStart = -1, previousEnd = -1;
  let firstStart = -1, firstEnd = -1;
  let start = 0, direction = 0;
  let flips = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    if (Math.abs(dx) < minStep) continue;
    const nextDirection = Math.sign(dx);
    if (direction && nextDirection !== direction) {
      firstStart = previousStart;
      firstEnd = previousEnd;
      previousStart = start;
      previousEnd = i - 1;
      start = i - 1;
      flips++;
    }
    direction = nextDirection;
  }
  if (flips < CONFIG.Z_DIRECTION_FLIPS_ON || firstStart < 0) return false;
  const end = pts.length - 1;
  if (Math.abs(pts[firstEnd].x - pts[firstStart].x) < CONFIG.Z_MIN_LEG_SPAN ||
      Math.abs(pts[previousEnd].x - pts[previousStart].x) < CONFIG.Z_MIN_LEG_SPAN ||
      Math.abs(pts[end].x - pts[start].x) < CONFIG.Z_MIN_LEG_SPAN) return false;
  const middleVertical = pts[previousEnd].y - pts[previousStart].y;
  const totalVertical = pts[end].y - pts[firstStart].y;
  return Math.abs(middleVertical) >= CONFIG.Z_MIN_MIDDLE_VERTICAL &&
    Math.abs(totalVertical) >= CONFIG.Z_MIN_TOTAL_VERTICAL &&
    Math.sign(middleVertical) === Math.sign(totalVertical) &&
    pts[end].t - pts[firstStart].t >= CONFIG.Z_MIN_DURATION_MS &&
    verticalDirectionConsistency(pts) >= CONFIG.Z_MIN_VERTICAL_CONSISTENCY;
}

export class LibrasEngine extends EventTarget {
  constructor() {
    super();
    this.state = {
      hands: 0,
      letter: null,
      score: 0,
      features: null,
      holdLetter: null,
      holdProgress: 0,
      recognitionPhase: 'READY',
      fps: 0,
      // ----- duas mãos -----
      leftHand: { present: false, open: false },   // mão esquerda: forma/posição (referência)
      rightHand: { present: false },                // mão direita: letra em Libras
      leftGateRequired: CONFIG.REQUIRE_LEFT_HAND,
      leftGateOpen: false                            // true = portão liberado (reconhecimento pode avançar)
    };
    this._holdStart = null;
    this._holdKey = null;
    this._lastMismatchAt = 0;
    this._confirmedLetter = null;
    this._confirmedAt = null;
    this._releaseStart = null;
    this._released = false;
    this._changeLetter = null;
    this._changeStart = null;

    this._motionKey = null;
    this._motionBuffer = [];
    this._motionLastBaseAt = null;
    this._motionInProgress = false;
    this._motionLastIntentAt = null;
    this._motionNeedsSettle = false;
    this._motionRearmStart = null;
    this._motionRearmX = 0;
    this._motionRearmY = 0;
    this._motionRejectedKey = null;
    this._motionProgress = 0;
    this._motionRejectStart = null;
    this._motionRejectX = 0;
    this._motionRejectY = 0;
    this._motionReferenceScale = null;
    this._motionLastWristX = null;
    this._motionLastWristY = null;
    this._motionBaseMissing = false;

    // buffer do gesto de navegação (deslizar a mão da esquerda pra direita)
    this._navBuffer = [];
    this._navLastFireAt = -Infinity;
  }

  /** Processa landmarks e emite frame/signconfirmed/navback de forma síncrona.
   * O evento frame compartilha this.state; consumidores que guardarem histórico
   * devem copiar os campos necessários. fps é recebido da camada de visão.
   */
  update(results, nowMs, fps) {
    const handsList = results?.landmarks ?? [];
    this.state.hands = handsList.length;
    this.state.fps = fps;

    // gesto de voltar (deslizar qualquer mão da esquerda pra direita) roda
    // sempre, independente de papel esquerda/direita ou de quantas mãos
    // estão visíveis — é navegação, não datilologia.
    if (this._trackNavSwipe(handsList, nowMs)) {
      this.dispatchEvent(new CustomEvent('navback'));
    }

    const { left, right } = splitHandsByRole(results);

    // ----- mão esquerda: só precisa estar aberta e visível (portão) -----
    let leftOpen = false;
    if (left) {
      const leftFeatures = extractFeatures(left.landmarks);
      leftOpen = isOpenHand(leftFeatures);
    }
    this.state.leftHand = { present: !!left, open: leftOpen };

    const gateOpen = !CONFIG.REQUIRE_LEFT_HAND || leftOpen;
    this.state.leftGateRequired = CONFIG.REQUIRE_LEFT_HAND;
    this.state.leftGateOpen = gateOpen;

    // ----- mão direita: classificação de letra (o que a v1 inteira já fazia) -----
    if (!right) {
      this.state.rightHand = { present: false };
      this.resetHold();
      this.state.letter = null;
      this.state.score = 0;
      this.state.features = null;
      this._motionRearmStart = null;
      // Uma falha breve da mão pode ocorrer no meio de J/Z. A janela de graça
      // preserva só a trajetória ativa; resetTracking() sempre limpa a sessão.
      if (this._motionLastBaseAt === null || nowMs - this._motionLastBaseAt > CONFIG.MOTION_BASE_GRACE_MS) {
        if (diagnostics.enabled && this._motionKey) diagnostics.record('motion_rejected', {
          motionLetter: this._motionKey, motionSamples: this._motionBuffer.length,
          reason: 'stale_history'
        }, nowMs);
        this._resetMotion();
      }
      this._advanceConfirmation(null, nowMs);
      if (diagnostics.enabled) this._traceFrame(nowMs,
        !!results?.diagnosticInvalidLandmarks, null, !results?.diagnosticInvalidLandmarks);
      this._emit();
      return this.state;
    }
    this.state.rightHand = { present: true };

    const rightLm = right.landmarks;
    const scale = handScale(rightLm);
    const features = extractFeatures(rightLm);
    const ranking = classify(features, diagnostics.enabled, diagnostics.calibrationActive);
    const { letter, score } = ranking;

    this.state.features = features;
    this.state.letter = score >= CONFIG.MIN_SCORE ? letter : null;
    this.state.score = score;

    // Observar movimento durante cooldown permite D→Z/I→J. Um trajeto que
    // termina antes dos 900 ms é descartado; só a intenção nova e válida pode
    // emitir depois do prazo. Após J/Z, exige-se pausa antes de outro trajeto.
    if (this._motionNeedsSettle) this._observeMotionRearm(rightLm, features, scale, nowMs);
    const waiting = this.state.recognitionPhase === 'CONFIRMED' ||
      this.state.recognitionPhase === 'COOLDOWN' || this.state.recognitionPhase === 'WAIT_RELEASE';
    const motionLetter = gateOpen && !this._motionNeedsSettle
      ? this._trackMotionSigns(rightLm, features, scale, nowMs) : null;
    if (motionLetter && waiting && nowMs - this._confirmedAt < CONFIG.CONFIRM_COOLDOWN_MS) {
      this._resetMotion();
      this._advanceConfirmation(this._confirmedLetter, nowMs);
    } else if (motionLetter) {
      this._confirm(motionLetter, nowMs);
    } else if (gateOpen && this._motionInProgress) {
      if (waiting) {
        // Movimento em curso não equivale a liberação nem a troca estática.
        this._advanceConfirmation(this._confirmedLetter, nowMs);
      } else {
        if (diagnostics.enabled && this._holdKey) diagnostics.record('hold_reset', {
          candidate: this._holdKey, reason: 'motion_preparing'
        }, nowMs);
        this._holdStart = null;
        this._holdKey = null;
        this.state.recognitionPhase = 'STABILIZING';
      }
    } else {
      this._advanceConfirmation(gateOpen ? this.state.letter : null, nowMs);
    }

    if (diagnostics.enabled) this._traceFrame(nowMs, true, ranking);
    this._emit();
    return this.state;
  }

  /** Registra só decisões escalares; não retém features ou landmarks da mão. */
  _traceFrame(nowMs, handPresent, ranking, landmarksValid = true) {
    const phase = this.state.recognitionPhase;
    const motionStatus = this._motionRejectedKey ? 'rejected' :
      this._motionNeedsSettle ? 'residual' :
        this._motionInProgress ? 'in_progress' : this._motionKey ? 'base' : 'none';
    const reason = !landmarksValid ? 'invalid_landmarks' :
      !handPresent ? 'no_hand' :
      !this.state.leftGateOpen ? 'gate_closed' :
        phase === 'COOLDOWN' ? 'cooldown' :
          phase === 'WAIT_RELEASE' ? (motionStatus === 'residual' ? 'residual_base' : 'wait_release') :
            phase === 'CONFIRMED' ? 'confirmed' :
              motionStatus === 'rejected' ? 'motion_rejected' :
                motionStatus === 'in_progress' ? 'motion_in_progress' :
                  (ranking?.score ?? 0) < CONFIG.MIN_SCORE ? 'below_threshold' :
                    phase === 'STABILIZING' ? 'stabilizing' : 'ready';
    const sample = {
      handPresent, landmarksValid, candidate: ranking?.letter ?? null,
      candidateEligible: (ranking?.score ?? 0) >= CONFIG.MIN_SCORE,
      score: ranking?.score ?? 0, second: ranking?.second ?? null,
      secondScore: ranking?.secondScore ?? 0,
      gap: (ranking?.score ?? 0) - (ranking?.secondScore ?? 0),
      phase, stabilizingMs: this._holdStart === null ? 0 : Math.max(0, nowMs - this._holdStart),
      cooldownRemainingMs: this._confirmedAt === null ? 0 :
        Math.max(0, CONFIG.CONFIRM_COOLDOWN_MS - (nowMs - this._confirmedAt)),
      motionLetter: this._motionKey, motionSamples: this._motionBuffer.length,
      motionProgress: this._motionProgress, motionStatus, reason
    };
    if (diagnostics.calibrationActive && handPresent && this.state.features) {
      for (const name of CALIBRATION_FEATURES) sample[name] = this.state.features[name];
      Object.assign(sample, ranking.calibrationScores);
    }
    diagnostics.observe(sample, nowMs);
  }

  /** Zera somente a sustentação estática; trajetórias e navegação têm buffers próprios. */
  resetHold() {
    this._holdStart = null;
    this._holdKey = null;
    this.state.holdLetter = null;
    this.state.holdProgress = 0;
    if (this.state.recognitionPhase === 'STABILIZING') this.state.recognitionPhase = 'READY';
  }

  /** Interrompe gestos incompletos quando a câmera pausa ou a tela muda. */
  resetTracking() {
    this._reset();
    this.state.recognitionPhase = 'READY';
    this._confirmedLetter = null;
    this._confirmedAt = null;
    this._releaseStart = null;
    this._released = false;
    this._changeLetter = null;
    this._changeStart = null;
    this._motionNeedsSettle = false;
    this._motionRearmStart = null;
    this._navBuffer = [];
    this.state.hands = 0;
    this.state.fps = 0;
    this.state.leftHand = { present: false, open: false };
    this.state.rightHand = { present: false };
    this.state.leftGateOpen = false;
    if (diagnostics.enabled) diagnostics.record('tracking_reset', { reason: 'session_or_pause' });
    this._emit();
  }

  /** Avança confirmação estática e rearmamento com timestamp monotônico, em ms.
   * Durante cooldown não inicia hold; o update observa trajetórias sem emitir cedo.
   */
  _advanceConfirmation(letter, nowMs) {
    const phase = this.state.recognitionPhase;
    if (phase === 'CONFIRMED' || phase === 'COOLDOWN' || phase === 'WAIT_RELEASE') {
      if (phase === 'CONFIRMED') this.state.recognitionPhase = 'COOLDOWN';
      if (this._motionBuffer.length && this._motionLastBaseAt === null) this._resetMotion();

      if (letter === null) {
        if (this._releaseStart === null) this._releaseStart = nowMs;
        if (nowMs - this._releaseStart >= CONFIG.REARM_RELEASE_MS) this._released = true;
      } else {
        this._releaseStart = null;
      }

      // I/D logo após J/Z são a pose residual da ação já confirmada.
      const residualBase = this._confirmedLetter === 'J' ? 'I' :
        (this._confirmedLetter === 'Z' ? 'D' : null);
      if (letter && letter !== this._confirmedLetter && letter !== residualBase) {
        if (letter !== this._changeLetter) {
          this._changeLetter = letter;
          this._changeStart = nowMs;
        }
      } else {
        this._changeLetter = null;
        this._changeStart = null;
      }

      if (nowMs - this._confirmedAt < CONFIG.CONFIRM_COOLDOWN_MS) return;
      this.state.recognitionPhase = 'WAIT_RELEASE';
      const changed = this._changeStart !== null &&
        nowMs - this._changeStart >= CONFIG.REARM_CHANGE_MS;
      if (!this._released && !changed) return;

      // Nenhum hold ou trajeto anterior participa da próxima confirmação.
      this.resetHold();
      this._resetMotion();
      this.state.recognitionPhase = 'READY';
      this._confirmedLetter = null;
      this._confirmedAt = null;
      this._releaseStart = null;
      this._released = false;
      this._changeLetter = null;
      this._changeStart = null;
      this._motionNeedsSettle = false;
      this._motionRearmStart = null;
    }
    this._trackHold(letter, nowMs);
  }

  _confirm(letter, nowMs) {
    this.resetHold();
    this._resetMotion();
    this._confirmedLetter = letter;
    this._confirmedAt = nowMs;
    this._releaseStart = null;
    this._released = false;
    this._changeLetter = null;
    this._changeStart = null;
    this._motionNeedsSettle = letter === 'J' || letter === 'Z';
    this._motionRearmStart = null;
    this.state.recognitionPhase = 'CONFIRMED';
    if (diagnostics.enabled) diagnostics.record('signconfirmed', {
      letter, phase: 'CONFIRMED', reason: 'emitted'
    }, nowMs);
    this.dispatchEvent(new CustomEvent('signconfirmed', { detail: { letter } }));
  }

  _trackHold(letter, nowMs) {
    if (!letter) {
      if (this._holdKey && nowMs - this._lastMismatchAt < CONFIG.RELEASE_GRACE_MS) {
        this.state.holdProgress = this._progressFor(nowMs);
        return;
      }
      if (diagnostics.enabled && this._holdKey) diagnostics.record('hold_reset', {
        candidate: this._holdKey, reason: 'candidate_lost'
      }, nowMs);
      this.resetHold();
      return;
    }

    if (letter !== this._holdKey) {
      if (diagnostics.enabled && this._holdKey) diagnostics.record('hold_reset', {
        candidate: this._holdKey, second: letter, reason: 'candidate_changed'
      }, nowMs);
      this._holdKey = letter;
      this._holdStart = nowMs;
    }
    this.state.recognitionPhase = 'STABILIZING';
    this._lastMismatchAt = nowMs;

    const progress = this._progressFor(nowMs);
    this.state.holdLetter = letter;
    this.state.holdProgress = progress;

    if (progress >= 1) {
      this._confirm(letter, nowMs);
    }
  }

  _progressFor(nowMs) {
    if (this._holdStart === null) return 0;
    return Math.min(1, (nowMs - this._holdStart) / CONFIG.HOLD_MS);
  }

  /** Rearma J/Z só após uma pausa observável na pose-base, em ms monotônicos.
   * Permanecer em I/D não rearma a confirmação estática da pose residual.
   */
  _observeMotionRearm(lm, f, scale, nowMs) {
    const basePresent = this._confirmedLetter === 'J' ? isPinkyUpBase(f) : isIndexUpBase(f);
    if (!basePresent) {
      this._motionRearmStart = null;
      return;
    }
    const tip = lm[this._confirmedLetter === 'J' ? LM.PINKY_TIP : LM.INDEX_TIP];
    const x = tip.x / scale;
    const y = tip.y / scale;
    if (this._motionRearmStart === null ||
        Math.hypot(x - this._motionRearmX, y - this._motionRearmY) > CONFIG.MOTION_REARM_STILL_SPAN) {
      this._motionRearmStart = nowMs;
      this._motionRearmX = x;
      this._motionRearmY = y;
    } else if (nowMs - this._motionRearmStart >= CONFIG.MOTION_REARM_STILL_MS) {
      this._motionNeedsSettle = false;
      this._motionRearmStart = null;
    }
  }

  _trackMotionSigns(lm, f, scale, nowMs) {
    // Um intervalo sem callbacks também torna o trajeto antigo obsoleto,
    // mesmo se a mesma pose-base reaparecer no frame seguinte.
    if (this._motionLastBaseAt !== null &&
        nowMs - this._motionLastBaseAt > CONFIG.MOTION_BASE_GRACE_MS) {
      if (diagnostics.enabled) diagnostics.record('motion_rejected', {
        motionLetter: this._motionKey, motionSamples: this._motionBuffer.length,
        reason: 'stale_history'
      }, nowMs);
      this._resetMotion();
    }
    const pinkyBase = isPinkyUpBase(f);
    const indexBase = !pinkyBase && isIndexUpBase(f);
    const activeKey = pinkyBase ? 'J' : (indexBase ? 'Z' : null);

    // Após um vai-e-vem incompatível com J/Z, a pose estática pode completar
    // o hold. Uma pausa observável da ponta libera uma nova tentativa dinâmica.
    if (this._motionRejectedKey && this._motionRejectedKey !== activeKey) this._resetMotion();
    if (activeKey && this._motionRejectedKey === activeKey) {
      const rejectedTip = lm[activeKey === 'J' ? LM.PINKY_TIP : LM.INDEX_TIP];
      const x = rejectedTip.x / scale, y = rejectedTip.y / scale;
      if (this._motionRejectStart === null ||
          Math.hypot(x - this._motionRejectX, y - this._motionRejectY) > CONFIG.MOTION_REARM_STILL_SPAN) {
        this._motionRejectStart = nowMs;
        this._motionRejectX = x;
        this._motionRejectY = y;
        return null;
      }
      if (nowMs - this._motionRejectStart < CONFIG.MOTION_REARM_STILL_MS) return null;
      this._motionRejectedKey = null;
      this._motionRejectStart = null;
    }

    if (activeKey) {
      this._motionLastBaseAt = nowMs;
    } else if (this._motionKey && nowMs - (this._motionLastBaseAt ?? 0) > CONFIG.MOTION_BASE_GRACE_MS) {
      this._resetMotion();
      return null;
    } else if (!this._motionKey) {
      return null;
    }

    const key = activeKey || this._motionKey;
    const tip = key === 'J' ? lm[LM.PINKY_TIP] : lm[LM.INDEX_TIP];

    if (this._motionKey !== key) {
      this._motionKey = key;
      this._motionBuffer = [];
      this._motionInProgress = false;
      this._motionLastIntentAt = null;
      this._motionReferenceScale = scale;
      this._motionBaseMissing = false;
    }

    // Só um J já em andamento pode continuar durante perda breve da pose I.
    // O pulso limita saltos entre detecções; numHands:1 não dá identidade física.
    const continuingJ = !activeKey && key === 'J' && this._motionInProgress;
    if (!activeKey && key === 'J' && !continuingJ) return null;
    const wrist = key === 'J' ? lm[LM.WRIST] : null;
    let wristX = 0, wristY = 0;
    if (key === 'J') {
      wristX = wrist.x / this._motionReferenceScale;
      wristY = wrist.y / this._motionReferenceScale;
      if (this._motionBuffer.length > 0 &&
          Math.hypot(wristX - this._motionLastWristX,
          wristY - this._motionLastWristY) > CONFIG.MOTION_MIN_SPAN) {
        if (diagnostics.enabled) diagnostics.record('motion_rejected', {
          motionLetter: 'J', motionSamples: this._motionBuffer.length,
          reason: 'tracking_discontinuity'
        }, nowMs);
        this._resetMotion();
        return null;
      }
      if (continuingJ && !this._motionBaseMissing) {
        this._motionBaseMissing = true;
        if (diagnostics.enabled) diagnostics.record('motion_base_lost', {
          motionLetter: 'J', motionSamples: this._motionBuffer.length, reason: 'base_lost'
        }, nowMs);
      }
      if (activeKey) this._motionBaseMissing = false;
      this._motionLastWristX = wristX;
      this._motionLastWristY = wristY;
    }
    if (activeKey || continuingJ) {
      // Referencial J: movimento do pulso na escala inicial + articulação da
      // ponta na escala corrente. Remove zoom sem apagar a translação da mão.
      const point = key === 'J'
        ? { x: wristX + (tip.x - wrist.x) / scale,
          y: wristY + (tip.y - wrist.y) / scale, t: nowMs }
        : { x: tip.x / scale, y: tip.y / scale, t: nowMs };
      const anchor = this._motionBuffer[0];
      if (this._motionLastIntentAt === null && anchor &&
          Math.hypot(point.x - anchor.x, point.y - anchor.y) < CONFIG.MOTION_ANCHOR_STILL_SPAN) {
        // A pose-base parada não desloca o meio da trajetória J/Z futura.
        this._motionBuffer[0] = point;
        this._motionBuffer.length = 1;
      } else {
        this._motionBuffer.push(point);
      }
      while (this._motionBuffer.length > 0 && nowMs - this._motionBuffer[0].t > CONFIG.MOTION_WINDOW_MS) {
        this._motionBuffer.shift();
      }
    }

    if (this._motionBuffer.length < 2) return null;

    const smoothed = smoothPath(this._motionBuffer, CONFIG.MOTION_SMOOTH_WINDOW);
    const traveled = pathLength(smoothed);
    // Comprimento acumulado cresce até com tremor alternado. Só um deslocamento
    // líquido recente indica intenção de desenhar J/Z; ao cessar, o hold volta.
    const last = smoothed[smoothed.length - 1];
    let recentStart = smoothed.length - 1;
    while (recentStart > 0 && last.t - smoothed[recentStart - 1].t <= CONFIG.MOTION_INTENT_WINDOW_MS) recentStart--;
    if (smoothed.length >= CONFIG.MOTION_SMOOTH_WINDOW &&
        Math.hypot(last.x - smoothed[recentStart].x, last.y - smoothed[recentStart].y) >= CONFIG.MOTION_INTENT_MIN_SPAN &&
        Math.abs(last.y - smoothed[recentStart].y) >= CONFIG.MOTION_INTENT_MIN_VERTICAL) {
      this._motionLastIntentAt = nowMs;
    }
    this._motionInProgress = this._motionLastIntentAt !== null &&
      nowMs - this._motionLastIntentAt <= CONFIG.MOTION_INTENT_GRACE_MS;
    if (this._motionLastIntentAt !== null && !this._motionInProgress) {
      if (diagnostics.enabled) diagnostics.record('motion_rejected', {
        motionLetter: key, motionSamples: this._motionBuffer.length,
        reason: 'incomplete_trajectory'
      }, nowMs);
      this._resetMotion();
      return null;
    }

    // Duas inversões sem avanço vertical coerente caracterizam oscilação, não
    // preparação indefinida. Não reutilizar essas amostras numa tentativa nova.
    if (this._motionInProgress &&
        horizontalDirectionFlips(smoothed, CONFIG.MOTION_MIN_SPAN * CONFIG.Z_MIN_STEP_RATIO) >= CONFIG.Z_DIRECTION_FLIPS_ON &&
        Math.abs(last.y - smoothed[0].y) < CONFIG.J_MIN_VERTICAL_NET &&
        verticalDirectionConsistency(smoothed) < CONFIG.J_MIN_VERTICAL_CONSISTENCY) {
      if (diagnostics.enabled) diagnostics.record('motion_rejected', {
        motionLetter: key, motionSamples: this._motionBuffer.length,
        reason: 'incoherent_trajectory'
      }, nowMs);
      this._resetMotion();
      this._motionRejectedKey = key;
      this._motionRejectStart = nowMs;
      this._motionRejectX = tip.x / scale;
      this._motionRejectY = tip.y / scale;
      return null;
    }

    const spanProgress = Math.min(0.95, traveled / CONFIG.MOTION_MIN_SPAN);
    if (diagnostics.enabled) this._motionProgress = spanProgress;
    const canShowProgress = this.state.recognitionPhase === 'READY' ||
      this.state.recognitionPhase === 'STABILIZING';
    if (canShowProgress && this._motionInProgress && spanProgress > (this.state.holdProgress || 0)) {
      this.state.holdLetter = key;
      this.state.holdProgress = spanProgress;
    }

    if (!this._motionInProgress || this._motionBuffer.length < CONFIG.MOTION_MIN_SAMPLES ||
        traveled < CONFIG.MOTION_MIN_SPAN) {
      if (key === 'J' && diagnostics.calibrationActive) diagnostics.observeMotion({
        motionLetter: 'J', motionSamples: this._motionBuffer.length,
        pathLength: traveled, motionDurationMs: last.t - smoothed[0].t,
        turnDeg: turnAngleDeg(smoothed), netVertical: last.y - smoothed[0].y,
        curviness: traveled / Math.max(netDisplacement(smoothed), 1e-4),
        reason: !this._motionInProgress ? 'intent_missing' :
          this._motionBuffer.length < CONFIG.MOTION_MIN_SAMPLES
            ? 'samples_insufficient' : 'path_short'
      }, nowMs);
      return null;
    }

    if (key === 'J') {
      const turn = turnAngleDeg(smoothed);
      const straight = Math.max(netDisplacement(smoothed), 1e-4);
      const curviness = traveled / straight;
      const shapeMetrics = diagnostics.calibrationActive ? {} : null;
      const shapeReason = jShapeRejection(smoothed, shapeMetrics);
      const shapeValid = shapeReason === null;
      const consistency = verticalDirectionConsistency(smoothed);
      const reason = shapeReason ||
        (turn < CONFIG.J_TURN_ANGLE_ON ? 'turn_insufficient' :
          curviness < CONFIG.J_CURVINESS_ON ? 'curviness_insufficient' :
            Math.abs(last.y - smoothed[0].y) < CONFIG.J_MIN_VERTICAL_NET ? 'vertical_progress_insufficient' :
              consistency < CONFIG.J_MIN_VERTICAL_CONSISTENCY ? 'vertical_consistency_insufficient' : 'accepted');
      const validJ = reason === 'accepted';
      if (shapeMetrics) diagnostics.observeMotion({
        motionLetter: 'J', stemDescent: shapeMetrics.stemDescent,
        stemSide: shapeMetrics.stemSide, stemConsistency: shapeMetrics.stemConsistency,
        maxStemRun: shapeMetrics.maxStemRun, motionSamples: this._motionBuffer.length,
        hookRise: shapeMetrics.hookRise, hookSide: shapeMetrics.hookSide,
        turnDeg: turn, pathLength: traveled,
        netVertical: last.y - smoothed[0].y, curviness,
        motionDurationMs: last.t - smoothed[0].t, shapeValid, reason
      }, nowMs, validJ);
      // Geometria por segmentos e critérios globais devem concordar.
      if (validJ) {
        this.state.holdProgress = 1;
        this._resetMotion();
        return 'J';
      }
    } else {
      const minStep = CONFIG.MOTION_MIN_SPAN * CONFIG.Z_MIN_STEP_RATIO;
      if (hasZStrokePattern(smoothed, minStep)) {
        this.state.holdProgress = 1;
        this._resetMotion();
        return 'Z';
      }
    }
    return null;
  }

  _resetMotion() {
    this._motionKey = null;
    this._motionBuffer = [];
    this._motionLastBaseAt = null;
    this._motionInProgress = false;
    this._motionLastIntentAt = null;
    this._motionRejectedKey = null;
    this._motionProgress = 0;
    this._motionRejectStart = null;
    this._motionReferenceScale = null;
    this._motionLastWristX = null;
    this._motionLastWristY = null;
    this._motionBaseMissing = false;
  }

  /** Rastreia o pulso de qualquer mão detectada em busca do gesto de
   *  "deslizar da esquerda pra direita" (voltar pra home). Retorna `true`
   *  no frame em que o gesto é reconhecido, `false` caso contrário.
   *
   *  Salvaguardas (uma pra cada risco pedido no requisito):
   *    - distância mínima: SWIPE_MIN_SPAN (não aceita micro-movimentos)
   *    - direção: só conta deslocamento da esquerda pra direita (dx > 0 na
   *      coordenada PERCEBIDA, já espelhada — ver nota em vision.js)
   *    - "limpeza" do gesto: SWIPE_MAX_VERTICAL_DRIFT rejeita movimentos
   *      diagonais/aleatórios; SWIPE_MIN_MONOTONICITY rejeita "vai-e-vem"
   *      (tremor ou a pessoa só reposicionando a mão)
   *    - sem múltiplas ativações: ao reconhecer, zera o buffer
   *    - intervalo de segurança: SWIPE_COOLDOWN_MS bloqueia novas leituras
   *      por um tempo depois de cada ativação
   */
  _trackNavSwipe(handsList, nowMs) {
    if (nowMs - this._navLastFireAt < CONFIG.SWIPE_COOLDOWN_MS) return false;

    if (handsList.length === 0) {
      this._navBuffer = [];
      return false;
    }

    // qualquer mão serve — isso é navegação, não datilologia. Usa a
    // primeira mão que o MediaPipe devolver neste frame.
    const wrist = handsList[0][LM.WRIST];
    // coordenada PERCEBIDA (espelhada) — a mesma que a pessoa vê na tela,
    // não a bruta da câmera (ver nota de espelhamento em vision.js)
    const point = { x: 1 - wrist.x, y: wrist.y, t: nowMs };

    this._navBuffer.push(point);
    while (this._navBuffer.length > 0 && nowMs - this._navBuffer[0].t > CONFIG.SWIPE_WINDOW_MS) {
      this._navBuffer.shift();
    }

    if (this._navBuffer.length < CONFIG.SWIPE_MIN_SAMPLES) return false;

    const first = this._navBuffer[0];
    const last = this._navBuffer[this._navBuffer.length - 1];
    const dx = last.x - first.x;
    if (dx < CONFIG.SWIPE_MIN_SPAN) return false;

    const ys = this._navBuffer.map((p) => p.y);
    const verticalDrift = Math.max(...ys) - Math.min(...ys);
    if (verticalDrift > CONFIG.SWIPE_MAX_VERTICAL_DRIFT) return false;

    let forwardSteps = 0;
    for (let i = 1; i < this._navBuffer.length; i++) {
      if (this._navBuffer[i].x >= this._navBuffer[i - 1].x) forwardSteps++;
    }
    const monotonicity = forwardSteps / (this._navBuffer.length - 1);
    if (monotonicity < CONFIG.SWIPE_MIN_MONOTONICITY) return false;

    this._navBuffer = [];
    this._navLastFireAt = nowMs;
    return true;
  }

  _reset() {
    this.resetHold();
    this._resetMotion();
    this.state.letter = null;
    this.state.score = 0;
    this.state.features = null;
  }

  _emit() {
    this.dispatchEvent(new CustomEvent('frame', { detail: this.state }));
  }
}
