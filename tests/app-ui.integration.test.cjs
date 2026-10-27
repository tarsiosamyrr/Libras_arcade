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

// Landmarks sintéticos só exercitam a arbitragem temporal, não a validade dos sinais reais.
const J_PATH = [[.2,.1],[.2,.2],[.2,.3],[.2,.4],[.2,.5],[.2,.6],[.25,.7],[.35,.75],[.45,.7],[.5,.6],[.5,.5]];
const J_FAST_CURVED_PATH = [[.2,.1],[.2,.22],[.2,.34],[.2,.46],[.25,.56],
  [.4,.65],[.6,.72],[.82,.77],[1.02,.8],[1.22,.81],[1.4,.45]];
const J_SIDE_TURN_PATH = [[.2,.1],[.2,.2],[.2,.3],[.2,.4],[.2,.5],[.2,.6],
  [.25,.65],[.35,.65],[.45,.65],[.55,.65]];
const Z_PATH = Array.from({ length: 25 }, (_, i) => [i <= 8 ? i*.1 : i <= 16 ? (16-i)*.1 : (i-16)*.1, .1+i*.02]);

function pose(base, dx = 0, dy = 0) {
  const lm = Array.from({ length: 21 }, () => ({ x: .5, y: .75, z: 0 }));
  lm[0] = { x: .5, y: .8, z: 0 };
  for (const i of [5, 9, 13, 17]) lm[i] = { x: .5, y: .6, z: 0 };
  if (base === 'A') {
    lm[4] = { x: .7, y: .7, z: 0 }; // polegar distante das pontas agrupadas
    return lm;
  }
  const mcp = base === 'J' || base === 'I' ? 17 : 5;
  const pip = base === 'J' || base === 'I' ? 18 : 6;
  const tip = base === 'J' || base === 'I' ? 20 : 8;
  lm[mcp] = { x: .45, y: .6, z: 0 };
  lm[pip] = { x: .45, y: .5, z: 0 };
  lm[tip] = { x: .45 + dx * .2, y: .35 + dy * .2, z: 0 };
  return lm;
}

function recognitionRig(r) {
  const engine = new r.LibrasEngine();
  const signs = [];
  engine.addEventListener('signconfirmed', (event) => signs.push([event.detail.letter, engine._confirmedAt]));
  const frame = (base, at, dx = 0, dy = 0) => {
    r.clock.now = at;
    return engine.update({ landmarks: base ? [pose(base, dx, dy)] : [] }, at, 20);
  };
  const hold = (base, start, end, step = 50) => {
    for (let at = start; at <= end; at += step) frame(base, at);
  };
  const path = (base, start, step = 50, points = base === 'J' ? J_PATH : Z_PATH) => {
    points.forEach(([dx, dy], index) => frame(base, start + index * step, dx, dy));
  };
  return { engine, signs, frame, hold, path };
}

// A mão é espelhada nos landmarks; o rótulo físico não entra no classificador.
function twoFingerCalibrationPose({ down = false, thumbY, mirror = false, angle = 0 } = {}) {
  const wristY = down ? .2 : .8;
  const mcpY = down ? .4 : .6;
  const pipY = down ? .52 : .48;
  const tipY = down ? .72 : .28;
  const hand = Array.from({ length: 21 }, () => ({ x: .5, y: wristY, z: 0 }));
  for (const index of [5, 9, 13, 17]) hand[index] = { x: .5, y: mcpY, z: 0 };
  hand[5] = { x: .42, y: mcpY, z: 0 };
  hand[6] = { x: .38, y: pipY, z: 0 };
  hand[8] = { x: .35, y: tipY, z: 0 };
  hand[9] = { x: .58, y: mcpY, z: 0 };
  hand[10] = { x: .62, y: pipY, z: 0 };
  hand[12] = { x: .65, y: tipY, z: 0 };
  hand[4] = { x: .5, y: thumbY ?? (down ? pipY : wristY), z: 0 };
  return hand.map((point) => {
    const dx = point.x - .5, dy = point.y - wristY;
    const x = .5 + dx * Math.cos(angle) - dy * Math.sin(angle);
    const y = wristY + dx * Math.sin(angle) + dy * Math.cos(angle);
    return { x: mirror ? 1 - x : x, y, z: 0 };
  });
}

function oaCalibrationPose(letter, { mirror = false, angle = 0, scale = 1 } = {}) {
  const hand = pose('A').map((point) => ({ ...point }));
  if (letter === 'O') {
    // Aproxima as pontas do indicador/médio e do polegar na fixture geométrica.
    for (const index of [4, 8, 12]) hand[index] = { x: .5, y: .6, z: 0 };
  }
  return hand.map((point) => {
    const dx = (point.x - .5) * scale, dy = (point.y - .8) * scale;
    const x = .5 + dx * Math.cos(angle) - dy * Math.sin(angle);
    const y = .8 + dx * Math.sin(angle) + dy * Math.cos(angle);
    return { x: mirror ? 1 - x : x, y, z: point.z };
  });
}

// A pinça de O pode coexistir com os quatro dedos sem extensão e polegar afastado da base.
function ambiguousOPose({ mirror = false, width = 1, scale = 1, depth = 0 } = {}) {
  const hand = pose('A').map((point) => ({ ...point }));
  hand[4] = { x: .5, y: .75, z: 0 };
  hand[5] = { x: .43, y: .6, z: depth };
  hand[17] = { x: .58, y: .6, z: -depth };
  return hand.map((point) => ({
    x: mirror ? 1 - (.5 + (point.x - .5) * width * scale) : .5 + (point.x - .5) * width * scale,
    y: .8 + (point.y - .8) * scale,
    z: point.z * scale
  }));
}

function trueAPose({ mirror = false, width = 1, scale = 1, depth = 0 } = {}) {
  const hand = pose('A').map((point) => ({ ...point }));
  hand[4] = { x: .7, y: .7, z: depth };
  return hand.map((point) => ({
    x: mirror ? 1 - (.5 + (point.x - .5) * width * scale) : .5 + (point.x - .5) * width * scale,
    y: .8 + (point.y - .8) * scale,
    z: point.z * scale
  }));
}

// Dois dedos retos se cruzam na projeção local da palma. A separação em Z
// permite distinguir contato plausível de uma sobreposição apenas na imagem.
function crossedRPose({ mirror = false, angle = 0, yaw = 0, scale = 1, parallel = false,
  depthGap = 0, fingerDepthGap = 0, jitter = 0 } = {}) {
  const hand = Array.from({ length: 21 }, () => ({ x: .5, y: .7, z: 0 }));
  hand[0] = { x: .5, y: 1, z: 0 };
  hand[5] = { x: .43, y: .65, z: 0 };
  hand[6] = { x: parallel ? .44 : .45, y: .51, z: 0 };
  hand[7] = { x: parallel ? .45 : .49, y: .45, z: 0 };
  hand[8] = { x: (parallel ? .46 : .53) + jitter, y: .39, z: depthGap / 2 };
  hand[9] = { x: .57, y: .65, z: 0 };
  hand[10] = { x: parallel ? .56 : .55, y: .51, z: 0 };
  hand[11] = { x: parallel ? .55 : .51, y: .45, z: 0 };
  hand[12] = { x: (parallel ? .54 : .47) - jitter, y: .39, z: -depthGap / 2 };
  for (const [mcp, pip, tip, x] of [[13, 14, 16, .68], [17, 18, 20, .78]]) {
    hand[mcp] = { x, y: .65, z: 0 };
    hand[pip] = { x, y: .53, z: 0 };
    hand[tip] = { x, y: .65, z: 0 };
  }
  hand[4] = { x: .5, y: .82, z: 0 };
  // Profundidade contínua em cada dedo cruzado; depthGap altera só as pontas
  // e continua representando a sobreposição projetada do controle negativo.
  for (const [index, fraction] of [[6, .25], [7, .35], [8, .5]]) {
    hand[index].z += fingerDepthGap * fraction;
  }
  for (const [index, fraction] of [[10, .25], [11, .35], [12, .5]]) {
    hand[index].z -= fingerDepthGap * fraction;
  }
  return hand.map((point) => {
    const dx = (point.x - .5) * scale, dy = (point.y - 1) * scale;
    const x = .5 + dx * Math.cos(angle) - dy * Math.sin(angle);
    const y = 1 + dx * Math.sin(angle) + dy * Math.cos(angle);
    const side = (x - .5) * Math.cos(yaw) + point.z * scale * Math.sin(yaw);
    const depth = point.z * scale * Math.cos(yaw) - (x - .5) * Math.sin(yaw);
    return { x: mirror ? .5 - side : .5 + side, y, z: depth };
  });
}

// Controle geométrico: a abertura multiplica a distância lateral entre pontas
// relativa à distância entre MCPs. Não representa uma coleta de webcam.
function fourFingerPose({ mirror = false, spread = 1, down = false, thumbOut = false,
  pinkyBent = false, indexBent = false, foldedThree = false,
  depth = 0, jitter = 0, projection = 1, angle = 0 } = {}) {
  const hand = Array.from({ length: 21 }, () => ({ x: .5, y: .7, z: 0 }));
  hand[0] = { x: .5, y: .85, z: 0 };
  for (const [mcp, pip, dip, tip, x] of [
    [5, 6, 7, 8, .36], [9, 10, 11, 12, .45],
    [13, 14, 15, 16, .54], [17, 18, 19, 20, .63]
  ]) {
    hand[mcp] = { x, y: .6, z: 0 };
    hand[pip] = { x: .5 + (x - .5) * (1 + spread) / 2, y: .46, z: 0 };
    hand[dip] = { x: .5 + (x - .5) * spread, y: .36, z: 0 };
    hand[tip] = { x: .5 + (x - .5) * spread + jitter * (tip % 2 ? -1 : 1),
      y: .26 + (tip - 8) * .003, z: depth * (tip - 14) / 6 };
  }
  if (pinkyBent) {
    hand[18].y = .59;
    hand[19].y = .62;
    hand[20].y = .63;
  }
  if (indexBent) {
    hand[6] = { x: .36, y: .48, z: 0 };
    hand[7] = { x: .36, y: .54, z: 0 };
    hand[8] = { x: .36, y: .59, z: 0 };
  }
  if (foldedThree) {
    for (const [pip, dip, tip, x] of [[6, 7, 8, .36], [10, 11, 12, .45],
      [14, 15, 16, .54]]) {
      hand[pip] = { x, y: .47, z: 0 };
      hand[dip] = { x, y: .52, z: 0 };
      hand[tip] = { x, y: .59, z: 0 };
    }
    hand[18].y = .57;
    hand[19].y = .61;
    hand[20].y = .62;
  }
  hand[1] = { x: .4, y: .72, z: 0 };
  hand[2] = { x: .42, y: .66, z: 0 };
  hand[3] = { x: .44, y: .63, z: 0 };
  hand[4] = { x: thumbOut ? .83 : foldedThree ? .61 : indexBent ? .37 : .45,
    y: .61, z: 0 };
  return hand.map(({ x, y, z }) => {
    const dx = (x - .5) * projection, dy = y - .85;
    const rotatedX = .5 + dx * Math.cos(angle) - dy * Math.sin(angle);
    const rotatedY = .85 + dx * Math.sin(angle) + dy * Math.cos(angle);
    return { x: mirror ? 1 - rotatedX : rotatedX, y: down ? 1.1 - rotatedY : rotatedY, z };
  });
}

test('B mantém candidatura e confirmação com quatro dedos unidos em projeções espelhadas', async () => {
  for (const mirror of [false, true]) {
    for (const spread of [1, 1.7]) {
      const r = await browserRuntime();
      const engine = new r.LibrasEngine();
      const signs = [];
      engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
      for (let at = 100; at <= 750; at += 50) {
        r.clock.now = at;
        engine.update({ landmarks: [fourFingerPose({ mirror, spread, depth: .015,
          jitter: at % 100 ? .002 : -.002 })] }, at, 20);
        assert.equal(engine.state.letter, 'B', `espelho ${mirror}, abertura ${spread}, t=${at}`);
      }
      assert.deepEqual(signs, ['B']);
    }
  }
});

test('B rejeita quatro dedos separados, W, três dedos para baixo e polegar aberto', async () => {
  for (const options of [
    { spread: 3.2 }, { spread: 3.2, mirror: true },
    { spread: 1.7, pinkyBent: true },
    { spread: 1.7, pinkyBent: true, down: true },
    { foldedThree: true }, { foldedThree: true, mirror: true },
    { spread: 1.7, thumbOut: true },
    { spread: 1.7, thumbOut: true, down: true }
  ]) {
    const r = await browserRuntime();
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    for (let at = 100; at <= 750; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [fourFingerPose(options)] }, at, 20);
      assert.notEqual(engine.state.letter, 'B', JSON.stringify(options));
    }
    assert.equal(signs.includes('B'), false, JSON.stringify(options));
  }
});

test('F com pinça e W com mínimo fechado confirmam sem virar B', async () => {
  for (const mirror of [false, true]) {
    for (const [letter, options] of [
      ['F', { indexBent: true }], ['W', { pinkyBent: true, spread: 1.7 }]
    ]) {
      const r = await browserRuntime();
      const engine = new r.LibrasEngine();
      const signs = [];
      engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
      for (let at = 100; at <= 750; at += 50) {
        r.clock.now = at;
        engine.update({ landmarks: [fourFingerPose({ ...options, mirror })] }, at, 20);
        assert.notEqual(engine.state.letter, 'B');
      }
      assert.deepEqual(signs, [letter], `espelho ${mirror}, controle ${letter}`);
    }
  }
});

test('B não confirma quatro dedos com abertura lateral próxima de duas larguras', async () => {
  for (const mirror of [false, true]) {
    const r = await browserRuntime();
    const game = new r.Game();
    const engine = new r.LibrasEngine();
    new r.UI(engine, game, new r.ForcaGame());
    const diag = r.window.librasArcadeDiagnostics;
    r.cards[0].click();
    game.target = 'B';
    diag.startCalibration({ controlPose: 'four_spread',
      physicalHand: mirror ? 'left' : 'right', orientation: 'front',
      distance: 'medium', mirrored: mirror });
    for (let at = 100; at <= 800; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [fourFingerPose({ spread: 2.05, mirror,
        projection: .85, angle: .25, depth: .01, jitter: at % 100 ? .002 : -.002 })] }, at, 20);
    }
    const events = diag.stopCalibration().events;
    const frames = events.filter((event) => event.type === 'recognition' && event.handPresent);
    assert.ok(frames.some((event) => event.lateralRatioIM > 1.9 &&
      event.lateralRatioMR > 1.9 && event.lateralRatioRP > 1.9));
    assert.ok(frames.every((event) => event.scoreB < .55));
    assert.equal(events.some((event) => event.type === 'signconfirmed' && event.letter === 'B'), false);
    assert.equal(events.some((event) => event.type === 'game_decision' &&
      event.letter === 'B' && event.reason === 'accepted'), false);
  }
});

test('quatro dedos separados não sustentam W ou F nas duas projeções', async () => {
  for (const mirror of [false, true]) {
    const r = await browserRuntime();
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    const candidates = [];
    for (let at = 100; at <= 850; at += 50) {
      r.clock.now = at;
      const pose = fourFingerPose({ spread: 2.05, mirror, projection: .85,
        angle: .25, depth: .01, jitter: at % 100 ? .002 : -.002 });
      engine.update({ landmarks: [pose] }, at, 20);
      candidates.push(engine.state.letter);
    }
    assert.ok(candidates.every((letter) => !['B', 'W', 'F'].includes(letter)),
      `espelho ${mirror}: ${candidates.join(',')}`);
    assert.ok(signs.every((letter) => !['B', 'W', 'F'].includes(letter)),
      `espelho ${mirror}: ${signs.join(',')}`);
  }
});

test('quatro dedos separados não confirmam V nem K nas duas projeções', async () => {
  for (const mirror of [false, true]) {
    const r = await browserRuntime();
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    const diag = r.window.librasArcadeDiagnostics;
    diag.startCalibration({ controlPose: 'four_spread', physicalHand: mirror ? 'left' : 'right',
      orientation: 'front', distance: 'medium', mirrored: mirror });
    for (let at = 100; at <= 850; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [fourFingerPose({ spread: 2.05, mirror,
        projection: .85, angle: .25, depth: .01,
        jitter: at % 100 ? .002 : -.002 })] }, at, 20);
    }
    const events = diag.stopCalibration().events;
    const frames = events.filter((event) => event.type === 'recognition' && event.handPresent);
    assert.ok(frames.every((event) => event.scoreV < .55 && event.scoreK < .55),
      `espelho ${mirror}: V/K elegíveis`);
    assert.ok(signs.every((letter) => !['V', 'K'].includes(letter)),
      `espelho ${mirror}: confirmações ${signs.join(',')}`);
    assert.equal(events.some((event) => event.type === 'signconfirmed' &&
      ['V', 'K'].includes(event.letter)), false);
  }
});

test('controle de quatro dedos separados não confirma B, W ou F após pausa e retomada', async () => {
  const r = await browserRuntime();
  const engine = new r.LibrasEngine();
  const signs = [];
  engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
  for (let at = 100; at <= 500; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [fourFingerPose({ spread: 2.1,
      jitter: at % 100 ? .003 : -.003 })] }, at, 20);
  }
  for (let at = 550; at <= 900; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [] }, at, 20);
  }
  for (let at = 950; at <= 1750; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [fourFingerPose({ spread: 2.1, mirror: true,
      projection: .75, jitter: at % 100 ? .003 : -.003 })] }, at, 20);
  }
  assert.equal(signs.some((letter) => ['B', 'W', 'F'].includes(letter)), false);
});

test('calibração opcional registra abertura médio-anelar e escore W sem landmarks', async () => {
  const r = await browserRuntime();
  const engine = new r.LibrasEngine();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ controlPose: 'four_spread', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  r.clock.now = 100;
  engine.update({ landmarks: [fourFingerPose({ spread: 2.05 })] }, 100, 20);
  const frame = diag.stopCalibration().events.find((event) =>
    event.type === 'recognition' && event.handPresent);
  assert.equal(typeof frame.spreadMR, 'number');
  assert.equal(typeof frame.scoreW, 'number');
  assert.equal(frame.scoreW, 0);
  assert.equal('landmarks' in frame, false);
  diag.enable();
  r.clock.now = 200;
  engine.update({ landmarks: [fourFingerPose({ spread: 2.05 })] }, 200, 20);
  const ordinary = diag.read().events.find((event) => event.type === 'recognition');
  assert.equal('scoreW' in ordinary, false);
  assert.equal('spreadMR' in ordinary, false);
});

test('B unido é entregue ao Treino e Soletrar após hold; cooldown bloqueia repetição', async () => {
  for (const mode of ['practice', 'word']) {
    const r = await browserRuntime();
    const game = new r.Game();
    const engine = new r.LibrasEngine();
    new r.UI(engine, game, new r.ForcaGame());
    const diag = r.window.librasArcadeDiagnostics;
    diag.enable();
    r.cards[mode === 'practice' ? 0 : 1].click();
    game.target = mode === 'practice' ? 'B' : 'BA';
    game.wordIndex = 0;
    for (let at = 100; at <= 1250; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [fourFingerPose({ mirror: mode === 'word', spread: 1.7 })] }, at, 20);
    }
    const events = diag.read().events;
    assert.equal(events.filter((event) => event.type === 'signconfirmed' && event.letter === 'B').length, 1);
    assert.ok(events.some((event) => event.type === 'ui_received' && event.letter === 'B'));
    assert.ok(events.some((event) => event.type === 'game_decision' && event.letter === 'B' &&
      event.mode === mode && event.reason === 'accepted'));
  }
});

test('controle de quatro dedos separados recebe rótulo diagnóstico próprio e razões laterais', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  const engine = new r.LibrasEngine();
  diag.startCalibration({ controlPose: 'four_spread', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  r.clock.now = 100;
  engine.update({ landmarks: [fourFingerPose({ spread: 3.2 })] }, 100, 20);
  const result = diag.stopCalibration();
  assert.equal(result.calibration.intendedLetter, null);
  assert.equal(result.calibration.controlPose, 'four_spread');
  assert.equal(result.calibration.confirmation, 'absent');
  const frame = result.events.find((event) => event.type === 'recognition' && event.handPresent);
  assert.ok(frame.lateralRatioIM > 3 && frame.lateralRatioMR > 3 && frame.lateralRatioRP > 3);
  assert.equal(frame.scoreB, 0);
  assert.equal('landmarks' in frame, false);
  assert.throws(() => diag.startCalibration({ intendedLetter: 'B', controlPose: 'four_spread',
    physicalHand: 'right', orientation: 'front', distance: 'medium', mirrored: false }),
  /letra ou postura/);
  diag.startCalibration({ intendedLetter: 'B', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  assert.equal('controlPose' in diag.read().calibration, false);
  diag.stopCalibration();
});

test('B tolera oscilação moderada e projeção oblíqua e exige liberação para repetir', async () => {
  const r = await browserRuntime();
  const engine = new r.LibrasEngine();
  const signs = [];
  engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
  for (let at = 100; at <= 750; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [fourFingerPose({ spread: at % 100 ? 1.74 : 1.5,
      projection: .7, angle: .4, mirror: true, depth: .02 })] }, at, 20);
    assert.equal(engine.state.letter, 'B');
  }
  for (let at = 800; at <= 1250; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [] }, at, 20);
  }
  for (let at = 1650; at <= 2400; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [fourFingerPose({ spread: 1.7, projection: .7,
      angle: .4, mirror: true })] }, at, 20);
  }
  assert.deepEqual(signs, ['B', 'B']);
});

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

test('D com pequenos ajustes contínuos confirma sem o trajeto de Z', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let i = 0; i < 60; i++) {
    const dx = i % 2 ? .08 : 0;
    const state = rig.frame('Z', 100 + i * 50, dx);
    assert.equal(state.letter, 'D');
  }
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['D']);
});

test('D com oscilação horizontal de 0,15 e período de 300 ms não confirma falso Z', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let at = 0; at <= 1800; at += 50) {
    const dx = 0.15 * Math.sin(2 * Math.PI * at / 300);
    const state = rig.frame('Z', at, dx);
    assert.equal(state.letter, 'D');
    assert.equal(state.score, 1);
  }
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['D']);
  assert.ok(rig.signs[0][1] >= 600);
});

test('oscilação horizontal prolongada com deriva vertical leve não desenha Z', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let at = 0; at <= 1800; at += 50) {
    const dx = 0.15 * Math.sin(2 * Math.PI * at / 300);
    rig.frame('Z', at, dx, at / 1800 * 0.12);
  }
  assert.equal(rig.signs.some(([letter]) => letter === 'Z'), false);
  assert.equal(rig.signs.some(([letter]) => letter === 'D'), true);
});

test('vai-e-vem em dois eixos sem progressão espacial não desenha Z', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let at = 0; at <= 1800; at += 50) {
    const dx = 0.15 * Math.sin(2 * Math.PI * at / 300);
    const dy = 0.08 * Math.sin(2 * Math.PI * at / 600);
    rig.frame('Z', at, dx, dy);
  }
  assert.equal(rig.signs.some(([letter]) => letter === 'Z'), false);
  assert.equal(rig.signs.some(([letter]) => letter === 'D'), true);
});

for (const amplitude of [0.65, 1.25]) {
  test(`Z intencional com amplitude ${amplitude} continua confirmável`, async () => {
    const r = await browserRuntime();
    const rig = recognitionRig(r);
    rig.path('Z', 100, 40, Z_PATH.map(([x, y]) => [x * amplitude, y * amplitude]));
    assert.deepEqual(rig.signs.map(([letter]) => letter), ['Z']);
  });
}

test('D imóvel e prolongado confirma uma vez', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.hold('Z', 100, 2500);
  assert.deepEqual(rig.signs, [['D', 700]]);
});

test('I com pequenas oscilações confirma sem um falso J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let i = 0; i < 50; i++) rig.frame('J', 100 + i * 50, i % 2 ? .08 : 0);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['I']);
});

test('I detectado com movimento repetitivo do mindinho não perde confirmação para J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let at = 0; at <= 1800; at += 50) {
    const dx = 0.15 * Math.sin(2 * Math.PI * at / 300);
    const state = rig.frame('J', at, dx);
    assert.equal(state.letter, 'I');
  }
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['I']);
});

test('curva invertida da pose I não produz J antes do hold estático', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  const frame = (at, dx, dy) => {
    const hand = pose('J', dx, dy);
    hand[4] = { x: .5, y: .6, z: 0 }; // polegar recolhido, sem pinça O nem Y
    r.clock.now = at;
    return rig.engine.update({ landmarks: [hand] }, at, 20);
  };
  J_PATH.toReversed().forEach(([dx, dy], index) => {
    const state = frame(100 + index * 50, dx, dy);
    assert.equal(state.letter, 'I');
  });
  const [dx, dy] = J_PATH[0];
  for (let at = 650; at <= 2000; at += 50) frame(at, dx, dy);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['I']);
});

test('haste descendente seguida só de desvio lateral não confirma J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100, 50, J_SIDE_TURN_PATH);
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
  for (let at = 700; at <= 1900; at += 50) rig.frame('J', at, .55, .65);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['I']);
});

test('I tolera desvio lateral espelhado e levemente inclinado sem falso J', async () => {
  const r = await browserRuntime();
  for (const mirror of [1, -1]) {
    const rig = recognitionRig(r);
    const path = J_SIDE_TURN_PATH.map(([x, y], index) => [mirror * x + index * .005, y]);
    rig.path('J', 100, 50, path);
    const [x, y] = path[path.length - 1];
    for (let at = 700; at <= 1900; at += 50) rig.frame('J', at, x, y);
    assert.deepEqual(rig.signs.map(([letter]) => letter), ['I']);
  }
});

test('Soletrar recebe I sem J após uma haste com desvio lateral', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const engine = new r.LibrasEngine();
  new r.UI(engine, game, new r.ForcaGame());
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  r.cards[1].click();
  game.target = 'IA';
  game.wordIndex = 0;
  const frame = (at, x, y) => {
    r.clock.now = at;
    engine.update({ landmarks: [pose('J', x, y)] }, at, 20);
  };
  J_SIDE_TURN_PATH.forEach(([x, y], index) => frame(100 + index * 50, x, y));
  for (let at = 700; at <= 1900; at += 50) frame(at, .55, .65);
  assert.equal(game.wordIndex, 1);
  const events = diag.read().events;
  assert.equal(events.filter((event) => event.type === 'signconfirmed').map((event) => event.letter).join(','), 'I');
  assert.ok(events.some((event) => event.type === 'game_decision' &&
    event.letter === 'I' && event.expected === 'I' && event.reason === 'accepted'));
});

test('J com haste curta e retorno do gancho confirma em velocidades distintas', async () => {
  const r = await browserRuntime();
  const shortHook = [[.2,.1],[.2,.2],[.2,.3],[.2,.4],[.2,.5],[.25,.58],
    [.35,.6],[.45,.53],[.53,.42],[.55,.35]];
  for (const step of [35, 75]) {
    for (const mirror of [1, -1]) {
      const rig = recognitionRig(r);
      rig.path('J', 100, step, shortHook.map(([x, y], index) => [mirror * (x + index * .007), y]));
      assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
    }
  }
});

test('J rápido mantém a haste separada da curva lateral que ainda desce', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'J', physicalHand: 'right',
    orientation: 'oblique', distance: 'medium', mirrored: false });
  const rig = recognitionRig(r);
  J_FAST_CURVED_PATH.forEach(([x, y], index) => rig.frame('J', 100 + index * 33, x, y));
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
  assert.ok(diag.read().events.some((event) => event.type === 'motion_geometry' &&
    event.reason === 'accepted' && event.hookRise > 0 && event.hookSide > 0 &&
    event.stemEndIndex < event.troughIndex));
});

test('J rápido inclinado suporta cadência, zoom, orientação projetada e perda breve de I', async () => {
  const r = await browserRuntime();
  const times = [100, 132, 169, 207, 241, 281, 319, 354, 393, 431, 473];
  for (const mirror of [1, -1]) {
    const rig = recognitionRig(r);
    J_FAST_CURVED_PATH.forEach(([x, y], index) => {
      const hand = pose('J', mirror * (x + (y - .1) * .2), y);
      const scaleFactor = index % 2 ? .97 : 1.03;
      const angle = index % 2 ? .06 : -.06;
      for (const point of hand) {
        const relX = (point.x - .5) * scaleFactor;
        const relY = (point.y - .8) * scaleFactor;
        point.x = .5 + relX * Math.cos(angle) - relY * Math.sin(angle);
        point.y = .8 + relX * Math.sin(angle) + relY * Math.cos(angle);
      }
      if (index >= 9) hand[8] = { x: .5, y: .2, z: 0 };
      r.clock.now = times[index];
      rig.engine.update({ landmarks: [hand] }, times[index], 20);
    });
    assert.deepEqual(rig.signs.map(([letter]) => letter), ['J'], `espelho ${mirror}`);
  }
});

test('J curto completo em seis amostras não precisa esperar um segundo para formar gancho', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'J', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  const rig = recognitionRig(r);
  const path = [[.2,.1],[.2,.22],[.2,.39],[.24,.55],[.38,.56],[.52,.38]];
  const times = [100, 151, 205, 263, 316, 374];
  path.forEach(([x, y], index) => rig.frame('J', times[index], x, y));
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J'],
    JSON.stringify(diag.read().events.filter((event) => event.type === 'motion_geometry')));
  assert.ok(rig.signs[0][1] - times[0] < 300);
  assert.ok(diag.read().events.some((event) => event.type === 'motion_geometry' &&
    event.reason === 'accepted' && event.shortHook === true));
});

test('J curto conserva a subida terminal válida quando a média centrada a reduz', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'J', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  const rig = recognitionRig(r);
  const path = [[.2,.1],[.2,.22],[.2,.39],[.24,.55],[.38,.56],[.52,.40]];
  const times = [100, 151, 205, 263, 316, 374];
  path.forEach(([x, y], index) => rig.frame('J', times[index], x, y));
  const geometry = diag.read().events.filter((event) => event.type === 'motion_geometry');
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J'], JSON.stringify(geometry));
  assert.ok(geometry.some((event) => event.reason === 'accepted' && event.shortHook === true));
});

test('J curto com subida terminal menor mas suficiente mantém o gancho', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100, 55, [[.2,.1],[.2,.22],[.2,.39],[.24,.60],[.38,.60],[.52,.55]]);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
});

test('I descendente com apenas um salto terminal não vira J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100, 55, [[.2,.1],[.2,.22],[.2,.39],[.2,.55],[.2,.56],[.45,.40]]);
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
});

test('I com ruído isolado no último ponto não confirma J', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'I', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  const rig = recognitionRig(r);
  rig.path('J', 100, 55, [[.2,.1],[.2,.22],[.2,.39],[.2,.55],[.2,.56],[.6,.35],[.2,.56]]);
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false,
    JSON.stringify(diag.read().events.filter((event) => event.type === 'motion_geometry' ||
      event.type === 'signconfirmed')));
});

test('I com retorno terminal abaixo do mínimo não confirma J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100, 55, [[.2,.1],[.2,.22],[.2,.39],[.24,.55],[.38,.56],[.52,.54]]);
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
});

test('I com curva que volta no sentido lateral não produz J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  const path = [[.2,.1],[.2,.22],[.2,.34],[.2,.46],[.4,.6],
    [.65,.7],[.8,.75],[.65,.6],[.45,.4]];
  rig.path('J', 100, 45, path);
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
});

test('seis amostras sem retorno ascendente preservam I apesar da curva lateral', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100, 50, [[.2,.1],[.2,.22],[.2,.39],[.24,.55],[.38,.56],[.52,.56]]);
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
  for (let at = 450; at <= 1800; at += 50) rig.frame('J', at, .52, .56);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['I']);
});

test('J com haste inclinada em 15 graus confirma com retorno de gancho completo', async () => {
  const r = await browserRuntime();
  for (const mirror of [1, -1]) {
    const rig = recognitionRig(r);
    const path = J_PATH.map(([x, y]) => [mirror * (x + (y - .1) * Math.tan(Math.PI / 12)), y]);
    rig.path('J', 100, 50, path);
    assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
  }
});

test('J com sete amostras úteis e cadência irregular preserva a trajetória', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  const points = [0, 2, 4, 6, 8, 9, 10].map((index) => J_PATH[index]);
  const times = [100, 160, 255, 310, 420, 490, 560];
  points.forEach(([x, y], index) => rig.frame('J', times[index], x, y));
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
});

test('seis amostras que apagam o gancho na suavização não bastam para confirmar J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  [0, 2, 4, 6, 8, 10].forEach((index, sample) => {
    const [x, y] = J_PATH[index];
    rig.frame('J', 100 + sample * 70, x, y);
  });
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
});

test('seis amostras com retorno ascendente e lateral nítido bastam para J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100, 70, [[.2,.1],[.2,.2],[.25,.35],[.3,.55],[.5,.65],[.7,.25]]);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
});

test('diagnóstico distingue haste inclinada real de ausência de deslocamento', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'J', physicalHand: 'right',
    orientation: 'oblique', distance: 'medium', mirrored: false });
  const rig = recognitionRig(r);
  const path = J_PATH.map(([x, y]) => [x + (y - .1) * Math.tan(Math.PI / 12), y]);
  rig.path('J', 100, 50, path);
  const samples = diag.read().events.filter((event) => event.type === 'motion_geometry');
  assert.ok(samples.some((event) => event.stemDescent > .25 && event.stemSide > 0 &&
    event.motionSamples >= 6));
  assert.ok(samples.some((event) => event.reason === 'accepted'));
});

test('diagnóstico nomeia a rejeição geométrica sem zerar a haste observada', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'J', physicalHand: 'right',
    orientation: 'oblique', distance: 'medium', mirrored: false });
  const rig = recognitionRig(r);
  const path = J_PATH.map(([x, y]) => [x + (y - .1) * 1.2, y]);
  rig.path('J', 100, 50, path);
  const samples = diag.read().events.filter((event) => event.type === 'motion_geometry');
  assert.ok(samples.some((event) => event.reason === 'samples_insufficient'));
  assert.ok(samples.some((event) => event.reason === 'stem_inclined' &&
    event.stemDescent > .25 && event.stemSide > event.stemDescent &&
    event.maxStemRun > 0));
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
});

test('J continua o gancho após perda breve da pose-base I sem iniciar outro trajeto', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'J', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  const rig = recognitionRig(r);
  J_PATH.forEach(([x, y], index) => {
    const hand = pose('J', x, y);
    if (index >= 8) hand[8] = { x: .5, y: .2, z: 0 }; // indicador abre; ponta do mindinho segue válida
    r.clock.now = 100 + index * 50;
    rig.engine.update({ landmarks: [hand] }, r.clock.now, 20);
  });
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
  assert.ok(diag.read().events.some((event) => event.type === 'motion_base_lost' &&
    event.reason === 'base_lost'));
});

test('diagnóstico marca histórico J obsoleto após perda prolongada da mão', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'J', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  const rig = recognitionRig(r);
  rig.path('J', 100, 50, J_PATH.slice(0, 6));
  rig.frame(null, 450);
  rig.frame(null, 700);
  assert.ok(diag.read().events.some((event) => event.type === 'motion_rejected' &&
    event.reason === 'stale_history' && event.motionLetter === 'J'));
  assert.equal(rig.engine._motionBuffer.length, 0);
});

test('perda de base sem trajetória iniciada não cria J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  J_PATH.forEach(([x, y], index) => {
    const hand = pose('J', x, y);
    hand[8] = { x: .5, y: .2, z: 0 };
    r.clock.now = 100 + index * 50;
    rig.engine.update({ landmarks: [hand] }, r.clock.now, 20);
  });
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
});

test('troca espacial abrupta da mão durante perda de base descarta o J pendente', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  J_PATH.forEach(([x, y], index) => {
    const hand = pose('J', x, y);
    if (index >= 8) {
      hand[8] = { x: .5, y: .2, z: 0 };
      for (const point of hand) point.x += .3;
    }
    r.clock.now = 100 + index * 50;
    rig.engine.update({ landmarks: [hand] }, r.clock.now, 20);
  });
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
});

test('troca espacial abrupta com pose I ainda válida descarta a trajetória antiga', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  const rig = recognitionRig(r);
  J_PATH.forEach(([x, y], index) => {
    const hand = pose('J', x, y);
    if (index >= 8) for (const point of hand) point.x += .3;
    r.clock.now = 100 + index * 50;
    rig.engine.update({ landmarks: [hand] }, r.clock.now, 20);
  });
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
  assert.equal(rig.engine._motionBuffer.length < J_PATH.length - 1, true);
  assert.ok(diag.read().events.some((event) => event.reason === 'tracking_discontinuity' &&
    event.wristStep > event.wristLimit && event.wristGapMs === 50));
});

test('J preserva pulso contínuo após um callback ausente sem aceitar salto instantâneo', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  const rig = recognitionRig(r);
  J_PATH.forEach(([x, y], index) => {
    const hand = pose('J', x, y);
    const offsetX = index < 5 ? index * .01 : .10 + (index - 5) * .01;
    for (const point of hand) point.x += offsetX;
    const at = 100 + index * 50 + (index >= 5 ? 50 : 0);
    r.clock.now = at;
    rig.engine.update({ landmarks: [hand] }, at, 20);
  });
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J'],
    JSON.stringify(diag.read().events.filter((event) => event.type === 'motion_rejected')));
  assert.equal(diag.read().events.some((event) => event.reason === 'tracking_discontinuity'), false);
});

test('J tolera variação moderada de escala projetada sem mudar a intenção', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  J_PATH.forEach(([x, y], index) => {
    const hand = pose('J', x, y);
    const factor = index % 2 === 0 ? 1.08 : .92;
    for (const point of hand) {
      point.x = .5 + (point.x - .5) * factor;
      point.y = .8 + (point.y - .8) * factor;
    }
    r.clock.now = 100 + index * 50;
    rig.engine.update({ landmarks: [hand] }, r.clock.now, 20);
  });
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
});

test('I imóvel com escala projetada variável não forma J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let index = 0; index < 40; index++) {
    const hand = pose('J');
    const factor = index % 2 === 0 ? 1.08 : .92;
    for (const point of hand) {
      point.x = .5 + (point.x - .5) * factor;
      point.y = .8 + (point.y - .8) * factor;
    }
    r.clock.now = index * 50;
    rig.engine.update({ landmarks: [hand] }, r.clock.now, 20);
  }
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
  assert.equal(rig.signs.filter(([letter]) => letter === 'I').length, 1);
});

test('I com deslocamento apenas vertical não forma J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let index = 0; index < 15; index++) {
    rig.frame('J', 100 + index * 50, 0, Math.min(.7, index * .05));
  }
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
});

test('J inclinado é emitido, recebido e aceito no Treino e no Soletrar', async () => {
  for (const mode of ['practice', 'word']) {
    const r = await browserRuntime();
    const game = new r.Game();
    const engine = new r.LibrasEngine();
    new r.UI(engine, game, new r.ForcaGame());
    const diag = r.window.librasArcadeDiagnostics;
    diag.enable();
    r.cards[mode === 'practice' ? 0 : 1].click();
    game.target = mode === 'practice' ? 'J' : 'JA';
    game.wordIndex = 0;
    const path = J_PATH.map(([x, y]) => [x + (y - .1) * Math.tan(Math.PI / 12), y]);
    path.forEach(([x, y], index) => {
      r.clock.now = 100 + index * 50;
      engine.update({ landmarks: [pose('J', x, y)] }, r.clock.now, 20);
    });
    const events = diag.read().events;
    assert.equal(events.filter((event) => event.type === 'signconfirmed' && event.letter === 'J').length, 1);
    assert.ok(events.some((event) => event.type === 'ui_received' && event.letter === 'J'));
    assert.ok(events.some((event) => event.type === 'game_decision' &&
      event.letter === 'J' && event.reason === 'accepted' && event.mode === mode));
  }
});

test('J curto completo chega ao Treino e ao Soletrar sem substituir o alvo esperado', async () => {
  const path = [[.2,.1],[.2,.22],[.2,.39],[.24,.55],[.38,.56],[.52,.38]];
  for (const mode of ['practice', 'word']) {
    const r = await browserRuntime();
    const game = new r.Game();
    const engine = new r.LibrasEngine();
    new r.UI(engine, game, new r.ForcaGame());
    const diag = r.window.librasArcadeDiagnostics;
    diag.enable();
    r.cards[mode === 'practice' ? 0 : 1].click();
    game.target = mode === 'practice' ? 'J' : 'JA';
    game.wordIndex = 0;
    path.forEach(([x, y], index) => {
      r.clock.now = 100 + index * 55;
      engine.update({ landmarks: [pose('J', x, y)] }, r.clock.now, 20);
    });
    const events = diag.read().events;
    assert.equal(events.filter((event) => event.type === 'signconfirmed' && event.letter === 'J').length, 1);
    assert.ok(events.some((event) => event.type === 'ui_received' && event.letter === 'J'));
    assert.ok(events.some((event) => event.type === 'game_decision' && event.mode === mode &&
      event.expected === 'J' && event.letter === 'J' && event.reason === 'accepted'));
  }
});

test('intervalo sem frames descarta trajetória J incompleta', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100, 50, J_PATH.slice(0, 6));
  J_PATH.slice(6).forEach(([dx, dy], index) => rig.frame('J', 800 + index * 50, dx, dy));
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
  rig.path('J', 1400);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
});

test('I após curva invertida chega ao Soletrar sem um J incorreto', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const engine = new r.LibrasEngine();
  new r.UI(engine, game, new r.ForcaGame());
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  r.cards[1].click();
  game.target = 'IA';
  game.wordIndex = 0;
  const frame = (at, dx, dy) => {
    const hand = pose('J', dx, dy);
    hand[4] = { x: .5, y: .6, z: 0 };
    r.clock.now = at;
    engine.update({ landmarks: [hand] }, at, 20);
  };
  J_PATH.toReversed().forEach(([dx, dy], index) => frame(100 + index * 50, dx, dy));
  const [dx, dy] = J_PATH[0];
  for (let at = 650; at <= 2000; at += 50) frame(at, dx, dy);
  assert.equal(game.wordIndex, 1);
  const events = diag.read().events;
  assert.equal(events.filter((event) => event.type === 'signconfirmed').map((event) => event.letter).join(','), 'I');
  assert.ok(events.some((event) => event.type === 'ui_received' && event.letter === 'I'));
  assert.ok(events.some((event) => event.type === 'game_decision' &&
    event.letter === 'I' && event.expected === 'I' && event.reason === 'accepted'));
});

test('vai-e-vem do mindinho em dois eixos não forma gancho J', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let at = 0; at <= 1800; at += 50) {
    const dx = 0.15 * Math.sin(2 * Math.PI * at / 300);
    const dy = 0.08 * Math.sin(2 * Math.PI * at / 600);
    rig.frame('J', at, dx, dy);
  }
  assert.equal(rig.signs.some(([letter]) => letter === 'J'), false);
  assert.equal(rig.signs.some(([letter]) => letter === 'I'), true);
});

test('após vai-e-vem rejeitado, pausa da ponta permite uma trajetória J nova', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  for (let at = 0; at <= 800; at += 50) {
    const dx = 0.15 * Math.sin(2 * Math.PI * at / 300);
    const dy = 0.08 * Math.sin(2 * Math.PI * at / 600);
    rig.frame('J', at, dx, dy);
  }
  rig.hold('J', 850, 1400);
  rig.path('J', 1500);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['I', 'J']);
});

test('I estático detectado é emitido e recebido pelo Treino uma vez', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  r.cards[0].click();
  const game = instance(r, r.Game);
  const engine = instance(r, r.LibrasEngine);
  game.target = 'I';
  for (let at = 100; at <= 2000; at += 50) {
    r.clock.now = at;
    r.setDetectionResult({ landmarks: [pose('J')] });
    r.video.currentTime += 1;
    r.raf.step(at);
  }
  assert.equal(engine.dispatchCount('signconfirmed'), 1);
  assert.equal(game.dispatchCount('correct'), 1);
});

test('D seguido de Z pode completar nova trajetória sem retirar a mão', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.hold('Z', 100, 700);
  rig.path('Z', 800);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['D', 'Z']);
  assert.ok(rig.signs[1][1] >= 1600);
});

test('Z seguido de D após liberação confirma nova intenção', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('Z', 100);
  rig.frame(null, 1400);
  rig.frame(null, 1650);
  rig.hold('Z', 2000, 2700);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['Z', 'D']);
});

test('Z seguido de sua pose-base residual não confirma D', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('Z', 100);
  rig.hold('Z', 1350, 3100);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['Z']);
});

test('I seguido de J pode completar nova trajetória sem retirar a mão', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.hold('J', 100, 700);
  rig.path('J', 1200);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['I', 'J']);
  assert.ok(rig.signs[1][1] >= 1600);
});

test('J seguido de I após liberação confirma nova intenção', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100);
  rig.frame(null, 700);
  rig.frame(null, 950);
  rig.hold('J', 1500, 2200);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J', 'I']);
});

test('J seguido de sua pose-base residual não confirma I', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100);
  rig.hold('J', 650, 2400);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
});

for (const [letter, speed, step] of [
  ['J', 'lenta', 100], ['J', 'rápida', 30],
  ['Z', 'lenta', 50], ['Z', 'rápida', 30]
]) {
  test(`trajetória ${letter} ${speed} confirma uma vez pelo update`, async () => {
    const r = await browserRuntime();
    const rig = recognitionRig(r);
    rig.path(letter, 100, step);
    assert.deepEqual(rig.signs.map(([value]) => value), [letter]);
  });
}

test('J intencional mantém confirmação com haste levemente inclinada e espelhada', async () => {
  const r = await browserRuntime();
  for (const mirror of [1, -1]) {
    const rig = recognitionRig(r);
    const path = J_PATH.map(([x, y], index) => [mirror * (x + Math.min(index, 5) * .02), y]);
    rig.path('J', 100, 40, path);
    assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
  }
});

test('fixtures sintéticas K, P e C preservam candidata e confirmação única', async () => {
  const r = await browserRuntime();
  const twoFingers = (down) => {
    const wristY = down ? .2 : .8;
    const mcpY = down ? .4 : .6;
    const pipY = down ? .52 : .48;
    const tipY = down ? .72 : .28;
    const hand = Array.from({ length: 21 }, () => ({ x: .5, y: wristY, z: 0 }));
    hand[0] = { x: .5, y: wristY, z: 0 };
    for (const index of [5, 9, 13, 17]) hand[index] = { x: .5, y: mcpY, z: 0 };
    hand[5] = { x: .42, y: mcpY, z: 0 };
    hand[6] = { x: .38, y: pipY, z: 0 };
    hand[8] = { x: .35, y: tipY, z: 0 };
    hand[9] = { x: .58, y: mcpY, z: 0 };
    hand[10] = { x: .62, y: pipY, z: 0 };
    hand[12] = { x: .65, y: tipY, z: 0 };
    hand[4] = { x: .5, y: pipY, z: 0 };
    return hand;
  };
  const curved = () => {
    // Protege a regra atual de C; não valida o sinal descrito no cadastro.
    const hand = Array.from({ length: 21 }, () => ({ x: .5, y: .8, z: 0 }));
    hand[0] = { x: .5, y: .9, z: 0 };
    for (const [mcp, pip, tip, x] of [[5, 6, 8, .38], [9, 10, 12, .46],
      [13, 14, 16, .54], [17, 18, 20, .62]]) {
      hand[mcp] = { x, y: .62, z: 0 };
      hand[pip] = { x, y: .42, z: 0 };
      hand[tip] = { x: x + (mcp === 5 ? -.2 : .2), y: .42, z: 0 };
    }
    hand[4] = { x: .66, y: .42, z: 0 };
    return hand;
  };
  for (const [letter, hand] of [['K', twoFingers(false)], ['P', twoFingers(true)], ['C', curved()]]) {
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    for (let at = 100; at <= 1000; at += 50) {
      const state = engine.update({ landmarks: [hand] }, at, 20);
      assert.equal(state.letter, letter);
    }
    assert.deepEqual(signs, [letter]);
  }
});

for (const letter of ['J', 'Z']) {
  test(`trajetória ${letter} incompleta não produz sinal dinâmico`, async () => {
    const r = await browserRuntime();
    const rig = recognitionRig(r);
    const partial = (letter === 'J' ? J_PATH : Z_PATH).slice(0, letter === 'J' ? 6 : 13);
    rig.path(letter, 100, 50, partial);
    const [dx, dy] = partial.at(-1);
    for (let at = 100 + partial.length * 50; at <= 2600; at += 50) rig.frame(letter, at, dx, dy);
    assert.equal(rig.signs.some(([value]) => value === letter), false);
    assert.ok(rig.signs.some(([value]) => value === (letter === 'J' ? 'I' : 'D')));
  });

  test(`trajetória ${letter} tolera timestamps irregulares dentro da janela`, async () => {
    const r = await browserRuntime();
    const rig = recognitionRig(r);
    let at = 100;
    for (const [dx, dy] of letter === 'J' ? J_PATH : Z_PATH) {
      rig.frame(letter, at, dx, dy);
      at += at % 3 === 0 ? 35 : 55;
    }
    assert.deepEqual(rig.signs.map(([value]) => value), [letter]);
  });

  test(`perda breve de landmarks no trajeto ${letter} não reutiliza amostras antigas`, async () => {
    const r = await browserRuntime();
    const rig = recognitionRig(r);
    const points = letter === 'J' ? J_PATH : Z_PATH;
    const gap = letter === 'J' ? 6 : 13;
    points.forEach(([dx, dy], index) => {
      const at = 100 + index * 50;
      if (index === gap) rig.frame(null, at);
      else rig.frame(letter, at, dx, dy);
    });
    assert.deepEqual(rig.signs.map(([value]) => value), [letter]);
  });

  test(`perda longa de landmarks descarta o trajeto ${letter} anterior`, async () => {
    const r = await browserRuntime();
    const rig = recognitionRig(r);
    const points = letter === 'J' ? J_PATH : Z_PATH;
    rig.path(letter, 100, 50, points.slice(0, letter === 'J' ? 6 : 13));
    rig.frame(null, 1100);
    assert.equal(rig.engine._motionBuffer.length, 0);
    const tail = points.slice(letter === 'J' ? 6 : 13);
    rig.path(letter, 1200, 50, tail);
    assert.equal(rig.signs.some(([value]) => value === letter), false);
  });
}

test('trajeto Z completo dentro do cooldown é descartado e novo trajeto rearma D', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.hold('Z', 100, 700);
  rig.path('Z', 800, 30);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['D']);
  rig.hold('Z', 1600, 2000);
  rig.path('Z', 2100);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['D', 'Z']);
});

test('trajetória observada durante cooldown não exibe hold de confirmação', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.hold('Z', 100, 700);
  Z_PATH.slice(0, 8).forEach(([dx, dy], index) => {
    const state = rig.frame('Z', 800 + index * 50, dx, dy);
    assert.equal(state.recognitionPhase, 'COOLDOWN');
    assert.equal(state.holdProgress, 0);
  });
});

test('J e Z podem seguir um ao outro após troca estável da pose-base', async () => {
  const r = await browserRuntime();
  for (const [first, second] of [['J', 'Z'], ['Z', 'J']]) {
    const rig = recognitionRig(r);
    rig.path(first, 100);
    const confirmedAt = rig.engine._confirmedAt;
    rig.hold(second, confirmedAt + 350, confirmedAt + 1050);
    rig.path(second, confirmedAt + 1150);
    assert.deepEqual(rig.signs.map(([letter]) => letter), [first, second]);
  }
});

test('J e Z consecutivos exigem novo trajeto após a pose-base estável', async () => {
  const r = await browserRuntime();
  for (const letter of ['J', 'Z']) {
    const rig = recognitionRig(r);
    rig.path(letter, 100);
    const firstAt = rig.engine._confirmedAt;
    rig.hold(letter, firstAt + 300, firstAt + 1100);
    assert.deepEqual(rig.signs.map(([value]) => value), [letter]);
    rig.path(letter, firstAt + 1200);
    assert.deepEqual(rig.signs.map(([value]) => value), [letter, letter]);
  }
});

test('reset de sessão durante trajetória descarta a parte anterior', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.path('J', 100, 50, J_PATH.slice(0, 6));
  rig.engine.resetTracking();
  assert.equal(rig.engine._motionBuffer.length, 0);
  J_PATH.slice(6).forEach(([dx, dy], index) => rig.frame('J', 450 + index * 50, dx, dy));
  assert.deepEqual(rig.signs, []);
  rig.path('J', 1000);
  assert.deepEqual(rig.signs.map(([letter]) => letter), ['J']);
});

test('troca de Treino para Forca descarta trajetória pendente e roteia só o novo J', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  r.cards[0].click();
  const engine = instance(r, r.LibrasEngine);
  const forca = instance(r, r.ForcaGame);
  let videoFrame = 0;
  const frame = (at, dx, dy) => {
    r.clock.now = at;
    r.setDetectionResult({ landmarks: [pose('J', dx, dy)] });
    r.video.currentTime = ++videoFrame;
    r.raf.step(at);
  };
  J_PATH.slice(0, 6).forEach(([dx, dy], index) => frame(100 + index * 50, dx, dy));
  r.elements.get('#exit-btn').click();
  assert.equal(engine._motionBuffer.length, 0);
  r.cards[2].click();
  J_PATH.slice(6).forEach(([dx, dy], index) => frame(450 + index * 50, dx, dy));
  assert.equal(engine.dispatchCount('signconfirmed'), 0);
  J_PATH.forEach(([dx, dy], index) => frame(1000 + index * 50, dx, dy));
  assert.equal(engine.dispatchCount('signconfirmed'), 1);
  assert.equal(forca.guessed.has('J'), true);
  assert.equal(r.frames.size, 1);
});

test('pausa e retomada descartam trajetória incompleta sem duplicar loop', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  r.cards[0].click();
  const engine = instance(r, r.LibrasEngine);
  let videoFrame = 0;
  const frame = (at, lm) => {
    r.clock.now = at;
    r.setDetectionResult({ landmarks: lm ? [lm] : [] });
    r.video.currentTime = ++videoFrame;
    r.raf.step(at);
  };
  J_PATH.slice(0, 6).forEach(([dx, dy], index) => frame(100 + index * 50, pose('J', dx, dy)));
  r.document.hidden = true;
  r.dispatchDocument('visibilitychange');
  assert.equal(engine._motionBuffer.length, 0);
  r.document.hidden = false;
  r.dispatchDocument('visibilitychange');
  await r.settle();
  J_PATH.slice(6).forEach(([dx, dy], index) => frame(450 + index * 50, pose('J', dx, dy)));
  assert.equal(engine.dispatchCount('signconfirmed'), 0);
  J_PATH.forEach(([dx, dy], index) => frame(1000 + index * 50, pose('J', dx, dy)));
  assert.equal(engine.dispatchCount('signconfirmed'), 1);
  assert.equal(r.frames.size, 1);
});

test('manter a pose após confirmação dinâmica não duplica eventos', async () => {
  const r = await browserRuntime();
  for (const letter of ['J', 'Z']) {
    const rig = recognitionRig(r);
    rig.path(letter, 100);
    const lastAt = 100 + (letter === 'J' ? J_PATH.length - 1 : Z_PATH.length - 1) * 50;
    rig.hold(letter, lastAt + 50, lastAt + 3000);
    assert.deepEqual(rig.signs.map(([value]) => value), [letter]);
  }
});

test('letra estática sem relação com J/Z mantém hold e confirmação única', async () => {
  const r = await browserRuntime();
  const rig = recognitionRig(r);
  rig.hold('A', 100, 2200);
  assert.deepEqual(rig.signs, [['A', 700]]);
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

test('Próxima letra avança imediatamente no Treino sem pontuar e fica oculta nos outros modos', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const forca = new r.ForcaGame();
  const libras = new r.LibrasEngine();
  new r.UI(libras, game, forca);
  const next = r.elements.get('#next-practice-btn');
  assert.equal(next.classList.contains('hidden'), true);
  r.cards[0].click();
  assert.equal(next.classList.contains('hidden'), false);
  r.clock.advance(500);
  assert.notEqual(r.elements.get('#timer-fill').style.width, '100%');
  libras._advanceConfirmation('A', r.clock.now);
  const before = { round: game.round, target: game.target, score: game.score, streak: game.streak };
  next.click();
  assert.equal(game.round, before.round + 1);
  assert.notEqual(game.target, before.target);
  assert.equal(game.score, before.score);
  assert.equal(game.streak, before.streak);
  assert.ok(game._timerId);
  assert.equal(r.elements.get('#timer-fill').style.width, '100%');
  assert.equal(libras.state.recognitionPhase, 'READY');
  assert.equal(game.dispatchCount('correct'), 0);
  assert.equal(game.dispatchCount('wrong'), 0);
  r.cards[1].click();
  assert.equal(next.classList.contains('hidden'), true);
  const wordRound = game.round;
  next.click();
  assert.equal(game.round, wordRound);
  r.cards[2].click();
  assert.equal(next.classList.contains('hidden'), true);
  r.elements.get('#exit-btn').click();
  assert.equal(next.classList.contains('hidden'), true);
  assert.equal(next.listenerCount('click'), 1);
});

test('avanço manual cancela progresso automático pendente e não age após pausa ou saída', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const forca = new r.ForcaGame();
  const libras = new r.LibrasEngine();
  new r.UI(libras, game, forca);
  r.cards[0].click();
  const next = r.elements.get('#next-practice-btn');
  game.handleSign(game.target);
  const score = game.score;
  next.click();
  const round = game.round;
  r.clock.advance(500);
  assert.equal(game.round, round);
  assert.equal(game.score, score);
  game.pause();
  next.click();
  assert.equal(game.round, round);
  game.resume();
  r.elements.get('#exit-btn').click();
  next.click();
  assert.equal(game.mode, null);
  assert.equal(game.round, round);
});

test('Treino completo percorre as 26 letras únicas em ordem e volta de Z para A', async () => {
  const r = await browserRuntime();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  assert.deepEqual([...r.data.LETTER_POOL], alphabet);
  const game = new r.Game();
  game.startPractice('all');
  const visited = [game.target];
  for (let i = 1; i < 26; i++) {
    assert.equal(game.skipPracticeTarget(), true);
    visited.push(game.target);
    assert.equal(game._snapshot().practicePosition, i + 1);
  }
  assert.deepEqual(visited, alphabet);
  assert.equal(new Set(visited).size, 26);
  assert.equal(game._snapshot().practiceCount, 26);
  assert.equal(game.skipPracticeTarget(), true);
  assert.equal(game.target, 'A');
  assert.equal(game._snapshot().practicePosition, 1);
  assert.equal(game.level, 1);
});

test('Anterior e seleção direta navegam o conjunto completo e respeitam os níveis tradicionais', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  game.startPractice('all');
  assert.equal(game.navigatePracticeTarget(-1), true);
  assert.equal(game.target, 'Z');
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    assert.equal(game.navigatePracticeTarget(letter), true);
    assert.equal(game.target, letter);
  }
  const round = game.round;
  assert.equal(game.navigatePracticeTarget('?'), false);
  assert.equal(game.round, round);
  for (const level of [1, 2, 3]) {
    game.startPractice(level);
    const expected = r.data.LETTER_POOL.filter((letter) => r.data.LETTERS[letter].difficulty <= level);
    const seen = [game.target];
    for (let i = 1; i < expected.length; i++) {
      game.skipPracticeTarget();
      seen.push(game.target);
    }
    assert.deepEqual([...seen].sort(), [...expected].sort());
    assert.equal(game.navigatePracticeTarget(-1), true);
    assert.equal(game.target, seen[seen.length - 2]);
    assert.equal(game.navigatePracticeTarget(expected[0]), true);
    assert.equal(game.target, expected[0]);
    if (!expected.includes('Z')) assert.equal(game.navigatePracticeTarget('Z'), false);
  }
});

test('navegação A–Z cancela avanço antigo, reinicia relógio e preserva pontuação e recorde', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  game.startPractice('all');
  game.handleSign('A');
  const before = { score: game.score, streak: game.streak, best: game.best, bestStreak: game.bestStreak };
  assert.ok(game._advanceId);
  assert.equal(game.navigatePracticeTarget('I'), true);
  assert.equal(game.target, 'I');
  assert.equal(game._advanceId, null);
  assert.equal(game.timeLeft, game._roundMs);
  assert.deepEqual(
    { score: game.score, streak: game.streak, best: game.best, bestStreak: game.bestStreak },
    before
  );
  const round = game.round;
  r.clock.advance(500);
  assert.equal(game.round, round);
  assert.equal(r.clock.tasks.size, 1);
  game.pause();
  assert.equal(game.navigatePracticeTarget(-1), false);
  game.resume();
  game.end();
  assert.equal(game.navigatePracticeTarget('Z'), false);
  assert.equal(r.clock.tasks.size, 0);
});

test('Treino completo mantém avanço automático após acerto e tempo esgotado', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  game.startPractice('all');
  game.handleSign('A');
  r.clock.advance(450);
  assert.equal(game.target, 'B');
  const score = game.score;
  r.clock.advance(game._roundMs);
  assert.equal(game.target, 'B');
  r.clock.advance(450);
  assert.equal(game.target, 'C');
  assert.equal(game.score, score);
  assert.equal(game.streak, 0);
  assert.equal(game.level, 1);
});

test('menu abre A–Z e controles manuais limpam cooldown e trajetória sem duplicar listeners', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const forca = new r.ForcaGame();
  const libras = new r.LibrasEngine();
  const ui = new r.UI(libras, game, forca);
  const all = r.elements.get('#practice-all-btn');
  const next = r.elements.get('#next-practice-btn');
  const prev = r.elements.get('#prev-practice-btn');
  const jump = r.elements.get('#practice-letter-select');
  assert.equal(prev.classList.contains('hidden'), true);
  all.click();
  assert.equal(ui.currentScreen, 'play');
  assert.equal(game.target, 'A');
  assert.match(r.elements.get('#target-eyebrow').textContent, /1 DE 26/);
  assert.equal(prev.classList.contains('hidden'), false);
  assert.equal((jump.innerHTML.match(/<option /g) || []).length, 26);
  libras._motionBuffer = [{ x: 1, y: 1, t: 1 }];
  libras._advanceConfirmation('A', r.clock.now);
  assert.notEqual(libras.state.recognitionPhase, 'READY');
  jump.value = 'Y';
  jump.dispatchEvent('change');
  assert.equal(game.target, 'Y');
  assert.equal(libras.state.recognitionPhase, 'READY');
  assert.equal(libras._motionBuffer.length, 0);
  assert.equal(jump.value, 'Y');
  next.click();
  assert.equal(game.target, 'Z');
  prev.click();
  assert.equal(game.target, 'Y');
  assert.equal(next.listenerCount('click'), 1);
  assert.equal(prev.listenerCount('click'), 1);
  assert.equal(jump.listenerCount('change'), 1);
  r.elements.get('#exit-btn').click();
  assert.equal(prev.classList.contains('hidden'), true);
  jump.value = 'D';
  jump.dispatchEvent('change');
  assert.equal(game.mode, null);
  r.cards[0].click();
  assert.equal(game.mode, 'practice');
  assert.equal(game._snapshot().practiceSet, 'level');
  assert.equal(prev.classList.contains('hidden'), false);
  r.cards[1].click();
  assert.equal(next.classList.contains('hidden'), true);
  r.cards[2].click();
  assert.equal(ui.currentScreen, 'forca-play');
});

test('controles do Treino têm marcação acessível e largura adaptável', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const css = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'css/style.css'), 'utf8');
  assert.match(html, /<button[^>]*id="practice-all-btn"[^>]*aria-pressed="false"/);
  assert.match(html, /<button[^>]*id="practice-start-btn"[^>]*type="button"/);
  assert.match(html, /data-for="practice"[^>]*role="group"/);
  assert.match(html, /data-level="1"[^>]*aria-pressed="true"/);
  assert.match(html, /<button[^>]*id="prev-practice-btn"/);
  assert.match(html, /<button[^>]*id="next-practice-btn"/);
  assert.match(html, /<select[^>]*id="practice-letter-select"/);
  assert.match(html, /id="target-letter"[^>]*aria-live="polite"/);
  assert.match(css, /\.practice-nav\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.practice-nav-btn[^}]*min-height:\s*44px/);
  assert.match(css, /\.practice-all-option\s*\{[^}]*min-height:\s*66px/);
  assert.match(css, /\.practice-level-choice \.level-dot\{[^}]*width:44px; height:44px/);
  assert.match(css, /\.practice-all-option:focus-visible/);
  assert.match(css, /\.home\{[^}]*overflow-y:auto/);
  assert.match(css, /#play\{[^}]*overflow-y:auto/);
});

test('Todas as letras comunica seleção e os níveis oferecem ação própria por botão', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const ui = new r.UI(new r.LibrasEngine(), game, new r.ForcaGame());
  const all = r.elements.get('#practice-all-btn');
  const startLevel = r.elements.get('#practice-start-btn');
  all.click();
  assert.equal(all['aria-pressed'], 'true');
  assert.equal(all.classList.contains('is-selected'), true);
  assert.equal(game.practiceSet, 'all');
  ui.exitToHome();
  r.cards[0].children[1].click();
  assert.equal(all['aria-pressed'], 'false');
  assert.equal(r.cards[0].children[1]['aria-pressed'], 'true');
  startLevel.click();
  assert.equal(game.practiceSet, 'level');
  assert.equal(game.level, 2);
  assert.equal(startLevel.listenerCount('click'), 1);
});

test('Treino por nível mostra ambos os botões e escolha direta apenas das letras disponíveis', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const ui = new r.UI(new r.LibrasEngine(), game, new r.ForcaGame());
  const prev = r.elements.get('#prev-practice-btn');
  const next = r.elements.get('#next-practice-btn');
  const jump = r.elements.get('#practice-jump');
  const select = r.elements.get('#practice-letter-select');
  for (const level of [1, 2, 3]) {
    if (game.mode) ui.exitToHome();
    r.cards[0].children[level - 1].click();
    r.cards[0].click();
    const available = r.data.LETTER_POOL.filter((letter) => r.data.LETTERS[letter].difficulty <= level);
    assert.equal(game.level, level);
    assert.equal(prev.classList.contains('hidden'), false);
    assert.equal(next.classList.contains('hidden'), false);
    assert.equal(jump.classList.contains('hidden'), false);
    assert.equal((select.innerHTML.match(/<option /g) || []).length, available.length);
    const first = game.target;
    next.click();
    assert.notEqual(game.target, first);
    prev.click();
    assert.equal(game.target, first);
    select.value = available.at(-1);
    select.dispatchEvent('change');
    assert.equal(game.target, available.at(-1));
  }
});

test('seleção manual em nível cancela avanço antigo sem pontuar e mantém listeners únicos', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const libras = new r.LibrasEngine();
  const ui = new r.UI(libras, game, new r.ForcaGame());
  const next = r.elements.get('#next-practice-btn');
  const prev = r.elements.get('#prev-practice-btn');
  const select = r.elements.get('#practice-letter-select');
  r.cards[0].click();
  const first = game.target;
  game.handleSign(first);
  const before = { score: game.score, streak: game.streak, best: game.best };
  next.click();
  const second = game.target;
  assert.equal(game._advanceId, null);
  assert.equal(game.timeLeft, game._roundMs);
  r.clock.advance(500);
  assert.equal(game.target, second);
  prev.click();
  assert.equal(game.target, first);
  select.value = 'B';
  select.dispatchEvent('change');
  assert.equal(game.target, 'B');
  assert.deepEqual({ score: game.score, streak: game.streak, best: game.best }, before);
  assert.equal(next.listenerCount('click'), 1);
  assert.equal(prev.listenerCount('click'), 1);
  assert.equal(select.listenerCount('change'), 1);
  ui.exitToHome();
  assert.equal(prev.classList.contains('hidden'), true);
  assert.equal(next.classList.contains('hidden'), true);
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

test('Soletrar marca a última letra como concluída antes do avanço pendente', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const ui = new r.UI(new r.LibrasEngine(), game, new r.ForcaGame());
  r.cards[1].click();
  assert.equal(ui.currentScreen, 'play');
  game.target = 'AA';
  game.wordIndex = 0;
  game.handleSign('A');
  game.handleSign('A');
  assert.equal(game.wordIndex, 2);
  assert.equal((r.elements.get('#target-word').innerHTML.match(/is-done/g) || []).length, 2);
  assert.equal(game._timerId, null);
  assert.ok(game._advanceId);
});

test('Soletrar relata aceitação, letra errada, pausa e avanço sem perder o estado', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const libras = new r.LibrasEngine();
  new r.UI(libras, game, new r.ForcaGame());
  r.cards[1].click();
  game.target = 'AA';
  game.wordIndex = 0;
  assert.equal(game.handleSign('B'), 'wrong_letter');
  assert.equal(game.wordIndex, 0);
  assert.equal(game.handleSign('A'), 'accepted');
  assert.equal(game.wordIndex, 1);
  game.pause();
  assert.equal(game.handleSign('A'), 'paused');
  game.resume();
  assert.equal(game.handleSign('A'), 'accepted');
  assert.equal(game.handleSign('A'), 'round_transition');
  const round = game.round;
  r.clock.advance(450);
  assert.equal(game.round, round + 1);
  assert.equal(game.wordIndex, 0);
  game.end();
  assert.equal(game.handleSign('A'), 'no_session');
});

test('diagnóstico começa desligado e mantém somente eventos seguros e limitados', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  assert.ok(diag);
  assert.equal(diag.read().enabled, false);
  const engine = new r.LibrasEngine();
  engine.update({ landmarks: [pose('A')] }, 0, 20);
  assert.equal(diag.read().events.length, 0);
  diag.enable();
  for (let at = 50; at <= 700; at += 50) engine.update({ landmarks: [pose('A')] }, at, 20);
  assert.ok(diag.read().events.some((event) => event.type === 'signconfirmed'));
  for (let at = 750; at <= 30000; at += 50) engine.update({ landmarks: [pose('A')] }, at, 20);
  const report = diag.read();
  assert.equal(report.enabled, true);
  assert.ok(report.events.some((event) => event.type === 'recognition'));
  assert.ok(report.events.length <= 120);
  assert.equal(report.events.length, 120);
  assert.equal(report.events.some((event) => 'landmarks' in event || 'features' in event), false);
  report.events[0].type = 'altered';
  assert.notEqual(diag.read().events[0].type, 'altered');
  diag.disable();
  assert.equal(diag.read().events.length, 0);
});

test('calibração opcional exige rótulos e guarda somente escalares limitados de uma tentativa', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  assert.throws(() => diag.startCalibration({ intendedLetter: 'O', physicalHand: 'desconhecida' }), /mão|rótulo/i);
  assert.equal(diag.read().enabled, false);
  diag.startCalibration({ intendedLetter: 'O', physicalHand: 'left', orientation: 'front', distance: 'medium', mirrored: true });
  const engine = new r.LibrasEngine();
  for (let at = 100; at <= 750; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [pose('A')] }, at, 20);
  }
  const events = diag.read().events;
  const start = events.find((event) => event.type === 'calibration_start');
  const sample = events.find((event) => event.type === 'recognition');
  const confirmed = events.find((event) => event.type === 'signconfirmed');
  assert.equal(start.intendedLetter, 'O');
  assert.equal(start.physicalHand, 'left');
  assert.equal(start.orientation, 'front');
  assert.equal(start.distance, 'medium');
  assert.equal(start.mirrored, true);
  assert.equal(sample.scoreA, 1);
  assert.ok(sample.scoreO < sample.scoreA);
  assert.ok(Number.isFinite(sample.extIndex));
  assert.ok(Number.isFinite(sample.thumbMiddlePinch));
  assert.ok(Number.isFinite(confirmed.elapsedMs));
  assert.ok(!JSON.stringify(events).includes('"landmarks":'));
  const ended = diag.stopCalibration();
  assert.equal(ended.enabled, false);
  assert.equal(ended.calibrationActive, false);
  const count = ended.events.length;
  engine.update({ landmarks: [pose('A')] }, 900, 20);
  assert.equal(diag.read().events.length, count);
  diag.startCalibration({ intendedLetter: 'P', physicalHand: 'right', orientation: 'side', distance: 'far', mirrored: false });
  assert.equal(diag.read().events.filter((event) => event.type === 'calibration_start').length, 1);
  diag.clear();
  assert.equal(diag.read().calibrationActive, false);
  diag.disable();
  assert.equal(diag.read().events.length, 0);
});

test('calibração O/A e P/V/K expõe geometria complementar sem landmarks', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  const engine = new r.LibrasEngine();
  diag.startCalibration({ intendedLetter: 'O', physicalHand: 'left', orientation: 'side',
    distance: 'medium', mirrored: true });
  engine.update({ landmarks: [pose('A')] }, 100, 20);
  const sample = diag.read().events.find((event) => event.type === 'recognition');
  for (const field of ['scoreS', 'scoreE', 'palmProjectedArea', 'palmDepthSpan',
    'fingerAngleIM', 'tipClusterIMR']) {
    assert.ok(Number.isFinite(sample[field]), field);
  }
  assert.equal(sample.scoreA, 1);
  assert.ok(sample.scoreO < sample.scoreA);
  assert.equal(diag.read().events.some((event) => 'landmarks' in event), false);
  const hand = twoFingerCalibrationPose({ down: true, thumbY: .43 });
  hand[17] = { ...hand[17], z: .03 };
  diag.startCalibration({ intendedLetter: 'P', physicalHand: 'right', orientation: 'front',
    distance: 'medium', mirrored: false });
  new r.LibrasEngine().update({ landmarks: [hand] }, 200, 20);
  const original = diag.read().events.find((event) => event.type === 'recognition');
  const transformed = hand.map((point) => ({
    x: 1 - (.5 + (point.x - .5) * 1.2),
    y: .2 + (point.y - .2) * 1.2,
    z: point.z * 1.2
  }));
  diag.startCalibration({ intendedLetter: 'P', physicalHand: 'left', orientation: 'front',
    distance: 'medium', mirrored: true });
  new r.LibrasEngine().update({ landmarks: [transformed] }, 300, 20);
  const mirrored = diag.read().events.find((event) => event.type === 'recognition');
  for (const field of ['palmProjectedArea', 'palmDepthSpan', 'tipClusterIMR']) {
    assert.ok(original[field] > 0, field);
    assert.ok(Math.abs(original[field] - mirrored[field]) < 1e-9, field);
  }
  diag.disable();
  assert.equal(diag.read().events.length, 0);
});

test('calibração registra geometria escalar do J sem guardar a trajetória', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'J', physicalHand: 'right', orientation: 'front', distance: 'near', mirrored: false });
  const rig = recognitionRig(r);
  rig.path('J', 100, 50);
  const events = diag.read().events;
  const shape = events.filter((event) => event.type === 'motion_geometry' && event.motionLetter === 'J');
  assert.ok(shape.length > 0);
  assert.ok(shape.some((event) => event.hookRise >= .03 && event.hookSide >= .06));
  assert.ok(shape.every((event) => Number.isFinite(event.turnDeg) && Number.isFinite(event.pathLength)));
  assert.equal(events.filter((event) => event.type === 'signconfirmed').length, 1);
  assert.ok(!JSON.stringify(events).includes('"landmarks":'));
});

test('trilha do Soletrar separa emissão, recebimento, decisão e atualização visual', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const libras = new r.LibrasEngine();
  new r.UI(libras, game, new r.ForcaGame());
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  r.cards[1].click();
  game.target = 'AA';
  game.wordIndex = 0;
  for (let at = 100; at <= 750; at += 50) {
    r.clock.now = at;
    libras.update({ landmarks: [pose('A')] }, at, 20);
  }
  assert.equal(game.wordIndex, 1);
  const events = diag.read().events;
  for (const type of ['recognition', 'signconfirmed', 'ui_received', 'game_decision', 'ui_target']) {
    assert.ok(events.some((event) => event.type === type), type);
  }
  assert.ok(events.some((event) => event.type === 'game_decision' &&
    event.reason === 'accepted' && event.expected === 'A' && event.mode === 'word'));
  assert.equal(libras.count('signconfirmed'), 1);
});

test('diagnóstico distingue menu, letra errada e rodada em transição sem listeners extras', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const libras = new r.LibrasEngine();
  const forca = new r.ForcaGame();
  new r.UI(libras, game, forca);
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: 'A' } }));
  r.cards[1].click();
  game.target = 'AA';
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: 'B' } }));
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: 'A' } }));
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: 'A' } }));
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: 'A' } }));
  r.elements.get('#exit-btn').click();
  r.cards[2].click();
  libras.dispatchEvent(new r.CustomEvent('signconfirmed', { detail: { letter: forca.word[0] } }));
  const reasons = diag.read().events.filter((event) => event.type === 'game_decision').map((event) => event.reason);
  for (const reason of ['inactive_screen', 'wrong_letter', 'accepted', 'round_transition']) {
    assert.ok(reasons.includes(reason), reason);
  }
  assert.equal(libras.count('signconfirmed'), 1);
});

test('Soletrar com letras iguais exige liberação e timeout descarta avanço anterior', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const libras = new r.LibrasEngine();
  new r.UI(libras, game, new r.ForcaGame());
  r.cards[1].click();
  game.target = 'AA';
  game.wordIndex = 0;
  for (let at = 100; at <= 750; at += 50) {
    r.clock.now = at;
    libras.update({ landmarks: [pose('A')] }, at, 20);
  }
  assert.equal(game.wordIndex, 1);
  for (let at = 800; at <= 1500; at += 50) {
    r.clock.now = at;
    libras.update({ landmarks: [pose('A')] }, at, 20);
  }
  assert.equal(game.wordIndex, 1);
  for (let at = 1550; at <= 1850; at += 50) {
    r.clock.now = at;
    libras.update({ landmarks: [] }, at, 20);
  }
  for (let at = 1900; at <= 2600; at += 50) {
    r.clock.now = at;
    libras.update({ landmarks: [pose('A')] }, at, 20);
  }
  assert.equal(game.wordIndex, 2);
  const round = game.round;
  r.clock.advance(450);
  assert.equal(game.round, round + 1);
  const nextRound = game.round;
  r.clock.advance(game._roundMs + 450);
  assert.equal(game.round, nextRound + 1);
  assert.equal(game.wordIndex, 0);
});

test('landmarks inválidos são registrados sem derrubar o loop quando diagnóstico está ativo', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  r.setDetectionResult({ landmarks: [[{ x: 0.5, y: 0.5 }]] });
  r.video.currentTime = 1;
  r.clock.now = 100;
  r.raf.step(100);
  assert.ok(diag.read().events.some((event) => event.type === 'input_invalid' && event.landmarksValid === false));
  assert.ok(diag.read().events.some((event) => event.type === 'recognition' &&
    event.landmarksValid === false && event.reason === 'invalid_landmarks'));
  assert.equal(r.frames.size, 1);
  assert.equal(r.logs.errors.length, 0);
});

test('Soletrar registra timeout ocorrido durante cooldown após uma letra errada', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const libras = new r.LibrasEngine();
  new r.UI(libras, game, new r.ForcaGame());
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  r.cards[1].click();
  game.target = 'B';
  game.wordIndex = 0;
  r.clock.advance(game._roundMs - 1100);
  for (let i = 0; i <= 13; i++) {
    r.clock.advance(50);
    libras.update({ landmarks: [pose('A')] }, r.clock.now, 20);
  }
  assert.ok(diag.read().events.some((event) => event.type === 'game_decision' && event.reason === 'wrong_letter'));
  r.clock.advance(50);
  libras.update({ landmarks: [pose('A')] }, r.clock.now, 20);
  assert.equal(libras.state.recognitionPhase, 'COOLDOWN');
  r.clock.advance(game.timeLeft);
  const timeout = diag.read().events.find((event) => event.type === 'game_timeout');
  assert.equal(timeout?.phase, 'COOLDOWN');
  assert.equal(timeout?.reason, 'timer_expired');
  assert.equal(game._timerId, null);
  assert.ok(game._advanceId);
});

test('diagnóstico distingue trajetória J de pose-base e registra pausa e retomada', async () => {
  const r = await browserRuntime();
  r.clickStart();
  await r.settle();
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  r.cards[1].click();
  const engine = instance(r, r.LibrasEngine);
  J_PATH.forEach(([dx, dy], i) => {
    const at = 100 + i * 50;
    r.clock.now = at;
    engine.update({ landmarks: [pose('J', dx, dy)] }, at, 20);
  });
  const before = diag.read().events;
  assert.ok(before.some((event) => event.type === 'recognition' && event.motionLetter === 'J' && event.motionProgress > 0));
  assert.ok(before.some((event) => event.type === 'signconfirmed' && event.letter === 'J'));
  r.document.hidden = true;
  r.dispatchDocument('visibilitychange');
  r.document.hidden = false;
  r.dispatchDocument('visibilitychange');
  await r.settle();
  const types = diag.read().events.map((event) => event.type);
  assert.ok(types.includes('app_pause'));
  assert.ok(types.includes('tracking_reset'));
  assert.ok(types.includes('app_resume'));
  assert.equal(r.frames.size, 1);
});

test('Soletrar troca rapidamente de banco e cancela o avanço da palavra anterior', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  game.startWord(1);
  assert.ok(r.data.wordBank(1).includes(game.target));
  game.target = 'A';
  assert.equal(game.handleSign('A'), 'accepted');
  const staleAdvance = game._advanceId;
  assert.ok(staleAdvance);
  game.startWord(2);
  assert.ok(r.data.wordBank(2).includes(game.target));
  assert.equal(game.wordIndex, 0);
  assert.equal(game.round, 1);
  assert.equal(r.clock.tasks.has(staleAdvance), false);
  r.clock.advance(450);
  assert.equal(game.round, 1);
  game.end();
  assert.equal(r.clock.tasks.size, 0);
});

test('painel diagnóstico limita escrita no DOM e desliga a captura pela tecla d', async () => {
  const r = await browserRuntime();
  const engine = new r.LibrasEngine();
  new r.UI(engine, new r.Game(), new r.ForcaGame());
  const diag = r.window.librasArcadeDiagnostics;
  const panel = r.elements.get('#diag-json');
  let writes = 0;
  let value = '';
  Object.defineProperty(panel, 'textContent', {
    get: () => value,
    set: (next) => { writes++; value = next; }
  });
  r.dispatchWindow('keydown', { key: 'd' });
  assert.equal(diag.read().enabled, true);
  for (let at = 50; at <= 500; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [pose('A')] }, at, 20);
  }
  assert.ok(writes >= 2 && writes <= 4, `escritas: ${writes}`);
  r.dispatchWindow('keydown', { key: 'd' });
  assert.equal(diag.read().enabled, false);
  assert.equal(diag.read().events.length, 0);
});

test('diagnóstico expõe o empate heurístico I/Y sem tratá-lo como probabilidade', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  const engine = new r.LibrasEngine();
  const hand = pose('J');
  hand[4] = { x: .8, y: .75, z: 0 }; // afasta a pinça de O mantendo o polegar aberto de Y
  engine.update({ landmarks: [hand] }, 100, 20);
  const sample = diag.read().events.find((event) => event.type === 'recognition');
  assert.equal(sample.candidate, 'I');
  assert.equal(sample.second, 'Y');
  assert.equal(sample.gap, 0);
  assert.equal(sample.candidateEligible, true);
});

test('pinça reduz A na configuração ambígua e preserva O distinto', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  new r.LibrasEngine().update({ landmarks: [ambiguousOPose()] }, 100, 20);
  const ambiguous = diag.read().events.find((event) => event.type === 'recognition');
  assert.equal(ambiguous.candidate, 'O');
  assert.equal(ambiguous.second, 'A');
  assert.equal(ambiguous.score, 1);
  assert.ok(ambiguous.secondScore < 1);
  assert.ok(ambiguous.gap > 0);

  diag.clear();
  const hand = pose('A');
  hand[4] = { x: .5, y: .6, z: 0 };
  hand[12] = { x: .5, y: .6, z: 0 };
  new r.LibrasEngine().update({ landmarks: [hand] }, 200, 20);
  const distinct = diag.read().events.find((event) => event.type === 'recognition');
  assert.equal(distinct.candidate, 'O');
  assert.equal(distinct.score, 1);
  assert.ok(distinct.gap > 0);
});

test('A e O sintéticos mantêm confirmação sob espelho, rotação e escala moderada', async () => {
  const r = await browserRuntime();
  for (const letter of ['A', 'O']) {
    for (const mirror of [false, true]) {
      for (const [angle, scale] of [[0, 1], [Math.PI / 4, .85], [Math.PI / 3, 1.15]]) {
        const engine = new r.LibrasEngine();
        const signs = [];
        engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
        const hand = oaCalibrationPose(letter, { mirror, angle, scale });
        for (let at = 100; at <= 750; at += 50) {
          r.clock.now = at;
          engine.update({ landmarks: [hand] }, at, 20);
        }
        assert.deepEqual(signs, [letter], `${letter}, espelho=${mirror}, ângulo=${angle}`);
      }
    }
  }
});

test('V não exige orientação; polegar e direção distinguem fixtures P e K', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  const handFor = (down, thumbNear, mirror) => {
    const wristY = down ? .2 : .8;
    const mcpY = down ? .4 : .6;
    const pipY = down ? .52 : .48;
    const tipY = down ? .72 : .28;
    const hand = Array.from({ length: 21 }, () => ({ x: .5, y: wristY, z: 0 }));
    hand[0] = { x: .5, y: wristY, z: 0 };
    for (const index of [5, 9, 13, 17]) hand[index] = { x: .5, y: mcpY, z: 0 };
    hand[5] = { x: .42, y: mcpY, z: 0 };
    hand[6] = { x: .38, y: pipY, z: 0 };
    hand[8] = { x: .35, y: tipY, z: 0 };
    hand[9] = { x: .58, y: mcpY, z: 0 };
    hand[10] = { x: .62, y: pipY, z: 0 };
    hand[12] = { x: .65, y: tipY, z: 0 };
    hand[4] = { x: .5, y: thumbNear ? pipY : wristY, z: 0 };
    return mirror ? hand.map((point) => ({ ...point, x: 1 - point.x })) : hand;
  };
  for (const mirror of [false, true]) {
    for (const [down, thumbNear, expected] of [
      [false, false, 'V'], [true, false, 'V'], [false, true, 'K'], [true, true, 'P']
    ]) {
      diag.startCalibration({ intendedLetter: expected, physicalHand: mirror ? 'left' : 'right',
        orientation: 'front', distance: 'medium', mirrored: mirror });
      const engine = new r.LibrasEngine();
      engine.update({ landmarks: [handFor(down, thumbNear, mirror)] }, 100, 20);
      const sample = diag.read().events.find((event) => event.type === 'recognition');
      assert.equal(sample.candidate, expected);
      if (!thumbNear) assert.equal(sample.scoreV, 1);
      if (down && !thumbNear) assert.ok(sample.scoreP < sample.scoreV);
    }
    const angled = handFor(false, false, mirror).map((point) => {
      const dx = point.x - .5, dy = point.y - .8;
      return { x: .5 + dx * Math.SQRT1_2 - dy * Math.SQRT1_2,
        y: .8 + dx * Math.SQRT1_2 + dy * Math.SQRT1_2, z: 0 };
    });
    diag.startCalibration({ intendedLetter: 'V', physicalHand: mirror ? 'left' : 'right',
      orientation: 'front', distance: 'medium', mirrored: mirror });
    new r.LibrasEngine().update({ landmarks: [angled] }, 100, 20);
    const oblique = diag.read().events.find((event) => event.type === 'recognition');
    assert.equal(oblique.scoreV, 1);
  }
});

test('P com polegar projetado perto do limite não confirma V em nenhuma mão simulada', async () => {
  const r = await browserRuntime();
  for (const mirror of [false, true]) {
    const diag = r.window.librasArcadeDiagnostics;
    diag.startCalibration({ intendedLetter: 'P', physicalHand: mirror ? 'left' : 'right',
      orientation: 'oblique', distance: 'medium', mirrored: mirror });
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    const hand = twoFingerCalibrationPose({ down: true, thumbY: .43, mirror });
    for (let at = 100; at <= 750; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [hand] }, at, 20);
    }
    const sample = diag.read().events.find((event) => event.type === 'recognition');
    assert.ok(sample.scoreP > sample.scoreV, `P=${sample.scoreP}, V=${sample.scoreV}`);
    assert.deepEqual(signs, ['P'], `espelho ${mirror}`);
    diag.stopCalibration();
  }
});

test('P, V e K mantêm decisão estável com espelho, inclinação e ruído pequeno', async () => {
  const r = await browserRuntime();
  for (const mirror of [false, true]) {
    for (const [letter, down, thumbY, angle] of [
      ['P', true, .52, Math.PI / 9],
      ['V', false, .8, Math.PI / 4],
      ['K', false, .48, -Math.PI / 12]
    ]) {
      const engine = new r.LibrasEngine();
      const signs = [];
      engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
      for (let at = 100; at <= 850; at += 50) {
        r.clock.now = at;
        const jitter = ((at / 50) % 3 - 1) * .003;
        const hand = twoFingerCalibrationPose({ down, thumbY: thumbY + jitter, mirror, angle });
        engine.update({ landmarks: [hand] }, at, 20);
      }
      assert.deepEqual(signs, [letter], `${letter}, espelho=${mirror}`);
    }
  }
});

test('V e K chegam ao Treino e Soletrar nas duas projeções após o hold', async () => {
  for (const mode of ['practice', 'word']) {
    for (const letter of ['V', 'K']) {
      for (const mirror of [false, true]) {
        const r = await browserRuntime();
        const game = new r.Game();
        const engine = new r.LibrasEngine();
        new r.UI(engine, game, new r.ForcaGame());
        const diag = r.window.librasArcadeDiagnostics;
        diag.enable();
        r.cards[mode === 'practice' ? 0 : 1].click();
        game.target = mode === 'practice' ? letter : `${letter}A`;
        if (mode === 'word') game.wordIndex = 0;
        for (let at = 100; at <= 1300; at += 50) {
          r.clock.now = at;
          const jitter = ((at / 50) % 3 - 1) * .003;
          const hand = twoFingerCalibrationPose({ thumbY: (letter === 'V' ? .8 : .48) + jitter,
            mirror, angle: .12 });
          engine.update({ landmarks: [hand] }, at, 20);
        }
        const events = diag.read().events;
        assert.equal(events.filter((event) => event.type === 'signconfirmed' &&
          event.letter === letter).length, 1, `${mode}, ${letter}, espelho ${mirror}`);
        assert.ok(events.some((event) => event.type === 'ui_received' &&
          event.letter === letter));
        assert.ok(events.some((event) => event.type === 'game_decision' &&
          event.letter === letter && event.mode === mode && event.reason === 'accepted'));
      }
    }
  }
});

test('V e K exigem liberação e novo hold para repetir após cooldown', async () => {
  for (const letter of ['V', 'K']) {
    const r = await browserRuntime();
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    const hand = twoFingerCalibrationPose({ thumbY: letter === 'V' ? .8 : .48 });
    for (let at = 100; at <= 1300; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [hand] }, at, 20);
    }
    assert.deepEqual(signs, [letter]);
    for (let at = 1350; at <= 1700; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [] }, at, 20);
    }
    for (let at = 1750; at <= 2500; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [hand] }, at, 20);
    }
    assert.deepEqual(signs, [letter, letter]);
  }
});

test('P reconhecido chega à UI e é aceito no Treino e no Soletrar uma única vez', async () => {
  for (const mode of ['practice', 'word']) {
    const r = await browserRuntime();
    const game = new r.Game();
    const engine = new r.LibrasEngine();
    new r.UI(engine, game, new r.ForcaGame());
    const diag = r.window.librasArcadeDiagnostics;
    diag.enable();
    r.cards[mode === 'practice' ? 0 : 1].click();
    game.target = mode === 'practice' ? 'P' : 'PA';
    if (mode === 'word') game.wordIndex = 0;
    for (let at = 100; at <= 1700; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [twoFingerCalibrationPose({ down: true, thumbY: .43 })] }, at, 20);
    }
    const events = diag.read().events;
    assert.equal(events.filter((event) => event.type === 'signconfirmed' && event.letter === 'P').length, 1);
    assert.ok(events.some((event) => event.type === 'ui_received' && event.letter === 'P'));
    assert.ok(events.some((event) => event.type === 'game_decision' && event.letter === 'P' &&
      event.reason === 'accepted' && event.mode === mode));
    if (mode === 'word') assert.equal(game.wordIndex, 1);
  }
});

test('Treino rejeita V verdadeiro quando espera P e aceita P após liberação', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const engine = new r.LibrasEngine();
  new r.UI(engine, game, new r.ForcaGame());
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  r.cards[0].click();
  game.target = 'P';
  const frame = (at, hand) => {
    r.clock.now = at;
    engine.update({ landmarks: hand ? [hand] : [] }, at, 20);
  };
  for (let at = 100; at <= 750; at += 50) frame(at, twoFingerCalibrationPose({ thumbY: .8 }));
  for (let at = 800; at <= 1100; at += 50) frame(at, null);
  for (let at = 1150; at <= 2500; at += 50) frame(at, twoFingerCalibrationPose({ down: true, thumbY: .43 }));
  const decisions = diag.read().events.filter((event) => event.type === 'game_decision');
  assert.ok(decisions.some((event) => event.letter === 'V' && event.expected === 'P' &&
    event.reason === 'wrong_letter'));
  assert.ok(decisions.some((event) => event.letter === 'P' && event.expected === 'P' &&
    event.reason === 'accepted'));
});

test('pinça separa O de A sob espelhamento e rotação sintética da mão', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  const base = ambiguousOPose();
  for (const angle of [0, Math.PI / 3]) {
    for (const mirror of [false, true]) {
      const hand = base.map((point) => {
        const dx = point.x - .5, dy = point.y - .8;
        const x = .5 + dx * Math.cos(angle) - dy * Math.sin(angle);
        return { x: mirror ? 1 - x : x, y: .8 + dx * Math.sin(angle) + dy * Math.cos(angle), z: 0 };
      });
      diag.startCalibration({ intendedLetter: 'O', physicalHand: mirror ? 'left' : 'right',
        orientation: 'front', distance: 'medium', mirrored: mirror });
      new r.LibrasEngine().update({ landmarks: [hand] }, 100, 20);
      const sample = diag.read().events.find((event) => event.type === 'recognition');
      assert.ok(sample.scoreA < sample.scoreO);
      assert.equal(sample.scoreO, 1);
      assert.equal(sample.candidate, 'O');
    }
  }
});

test('Soletrar rejeita A verdadeira quando O é alvo e aceita O após liberação', async () => {
  const r = await browserRuntime();
  const game = new r.Game();
  const engine = new r.LibrasEngine();
  new r.UI(engine, game, new r.ForcaGame());
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  r.cards[1].click();
  game.target = 'OA';
  game.wordIndex = 0;
  const frame = (at, hand) => {
    r.clock.now = at;
    engine.update({ landmarks: hand ? [hand] : [] }, at, 20);
  };
  for (let at = 100; at <= 750; at += 50) frame(at, pose('A'));
  assert.equal(game.wordIndex, 0);
  for (let at = 800; at <= 1100; at += 50) frame(at, null);
  const oHand = pose('A');
  oHand[4] = { x: .5, y: .6, z: 0 };
  oHand[12] = { x: .5, y: .6, z: 0 };
  for (let at = 1150; at <= 2300; at += 50) frame(at, oHand);
  assert.equal(game.wordIndex, 1);
  const decisions = diag.read().events.filter((event) => event.type === 'game_decision');
  assert.ok(decisions.some((event) => event.letter === 'A' && event.expected === 'O' && event.reason === 'wrong_letter'));
  assert.ok(decisions.some((event) => event.letter === 'O' && event.expected === 'O' && event.reason === 'accepted'));
  assert.equal(diag.read().events.filter((event) => event.type === 'signconfirmed').length, 2);
});

test('diagnóstico informa troca de candidata e rejeição de trajetória incoerente', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.enable();
  const engine = new r.LibrasEngine();
  engine.update({ landmarks: [pose('A')] }, 100, 20);
  engine.update({ landmarks: [pose('J')] }, 200, 20);
  assert.ok(diag.read().events.some((event) => event.type === 'hold_reset' &&
    event.reason === 'candidate_changed' && event.candidate === 'A' && event.second === 'I'));
  const motion = new r.LibrasEngine();
  for (let at = 0; at <= 800; at += 50) {
    const dx = .15 * Math.sin(2 * Math.PI * at / 300);
    const dy = .08 * Math.sin(2 * Math.PI * at / 600);
    motion.update({ landmarks: [pose('J', dx, dy)] }, at, 20);
  }
  assert.ok(diag.read().events.some((event) => event.type === 'motion_rejected' &&
    event.reason === 'incoherent_trajectory'));
});

test('O com pinça vence A sob projeção frontal e lateral, espelho e escala', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  for (const mirror of [false, true]) {
    for (const [width, scale, depth] of [[1, 1, 0], [.35, .8, .06], [.65, 1.2, .03]]) {
      diag.startCalibration({ intendedLetter: 'O', physicalHand: mirror ? 'left' : 'right',
        orientation: width === 1 ? 'front' : 'side', distance: 'medium', mirrored: mirror });
      const engine = new r.LibrasEngine();
      const signs = [];
      engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
      const hand = ambiguousOPose({ mirror, width, scale, depth });
      for (let at = 100; at <= 750; at += 50) {
        r.clock.now = at;
        engine.update({ landmarks: [hand] }, at, 20);
      }
      const sample = diag.read().events.find((event) => event.type === 'recognition');
      assert.ok(sample.scoreO > sample.scoreA, `O=${sample.scoreO}, A=${sample.scoreA}`);
      assert.deepEqual(signs, ['O'], `espelho=${mirror}, largura=${width}`);
      assert.equal(diag.stopCalibration().calibration.confirmation, 'correct');
    }
  }
});

test('A com polegar separado permanece A sob projeção e profundidade variadas', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  for (const mirror of [false, true]) {
    for (const [width, scale, depth] of [[1, 1, 0], [.35, .8, .15], [.65, 1.2, .12]]) {
      diag.startCalibration({ intendedLetter: 'A', physicalHand: mirror ? 'left' : 'right',
        orientation: width === 1 ? 'front' : 'side', distance: 'far', mirrored: mirror });
      const engine = new r.LibrasEngine();
      const signs = [];
      engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
      const hand = trueAPose({ mirror, width, scale, depth });
      for (let at = 100; at <= 750; at += 50) {
        r.clock.now = at;
        engine.update({ landmarks: [hand] }, at, 20);
      }
      const sample = diag.read().events.find((event) => event.type === 'recognition');
      assert.ok(sample.scoreA > sample.scoreO, `A=${sample.scoreA}, O=${sample.scoreO}`);
      assert.deepEqual(signs, ['A'], `espelho=${mirror}, largura=${width}`);
      diag.stopCalibration();
    }
  }
});

test('O ambíguo é aceito pelo Treino e Soletrar uma vez no tempo do hold', async () => {
  for (const mode of ['practice', 'word']) {
    const r = await browserRuntime();
    const game = new r.Game();
    const engine = new r.LibrasEngine();
    new r.UI(engine, game, new r.ForcaGame());
    const diag = r.window.librasArcadeDiagnostics;
    diag.enable();
    r.cards[mode === 'practice' ? 0 : 1].click();
    game.target = mode === 'practice' ? 'O' : 'OA';
    if (mode === 'word') game.wordIndex = 0;
    const hand = ambiguousOPose({ width: .35, depth: .06 });
    for (let at = 100; at <= 2100; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [hand] }, at, 20);
    }
    const events = diag.read().events;
    assert.equal(events.filter((event) => event.type === 'signconfirmed').length, 1);
    assert.ok(events.some((event) => event.type === 'signconfirmed' && event.letter === 'O' && event.at === 700));
    assert.ok(events.some((event) => event.type === 'game_decision' && event.letter === 'O' &&
      event.reason === 'accepted'));
  }
});

test('rótulos e desfecho da tentativa sobrevivem ao anel de 120 eventos e são apagados', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  assert.throws(() => diag.startCalibration({ intendedLetter: 'A', physicalHand: 'left',
    distance: 'far', mirrored: true }), /orientação/);
  diag.startCalibration({ intendedLetter: 'A', physicalHand: 'left', orientation: 'side',
    distance: 'far', mirrored: true });
  const engine = new r.LibrasEngine();
  const hand = trueAPose({ mirror: true, width: .35, depth: .15 });
  for (let at = 100; at <= 33000; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [hand] }, at, 20);
  }
  const active = diag.read();
  assert.equal(active.events.length, 120);
  assert.equal(active.events.some((event) => event.type === 'calibration_start'), false);
  assert.equal(active.calibration.orientation, 'side');
  assert.equal(active.calibration.physicalHand, 'left');
  assert.equal(active.calibration.confirmation, 'correct');
  const stopped = diag.stopCalibration();
  assert.equal(stopped.calibration.intendedLetter, 'A');
  assert.equal(stopped.calibration.distance, 'far');
  assert.equal(stopped.calibration.mirrored, true);
  assert.equal(stopped.calibration.confirmation, 'correct');
  stopped.calibration.orientation = 'front';
  assert.equal(diag.read().calibration.orientation, 'side');
  diag.startCalibration({ intendedLetter: 'O', physicalHand: 'right', orientation: 'oblique',
    distance: 'near', mirrored: false });
  assert.equal(diag.stopCalibration().calibration.confirmation, 'absent');
  diag.clear();
  assert.equal(diag.read().calibration, null);
  diag.disable();
  assert.equal(diag.read().calibration, null);
});

test('captura rotulada registra confirmação incorreta sem usar o alvo do jogo', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'O', physicalHand: 'right', orientation: 'side',
    distance: 'medium', mirrored: false });
  const engine = new r.LibrasEngine();
  const hand = trueAPose();
  for (let at = 100; at <= 750; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [hand] }, at, 20);
  }
  const result = diag.stopCalibration();
  assert.equal(result.calibration.confirmation, 'incorrect');
  assert.equal(result.calibration.firstConfirmedLetter, 'A');
});

test('controle V/K ascendente mantém V sem desconto e confirma K nas duas projeções espelhadas', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  for (const mirror of [false, true]) {
    diag.startCalibration({ intendedLetter: 'K', physicalHand: mirror ? 'left' : 'right',
      orientation: 'front', distance: 'medium', mirrored: mirror });
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    const hand = twoFingerCalibrationPose({ thumbY: .48, mirror });
    for (let at = 100; at <= 750; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [hand] }, at, 20);
    }
    const sample = diag.read().events.find((event) => event.type === 'recognition');
    assert.equal(sample.scoreV, 5 / 6); // direção ascendente não ativa o desconto de V
    assert.ok(sample.scoreK > sample.scoreV);
    assert.deepEqual(signs, ['K']);
    diag.stopCalibration();
  }
});

test('R reto e cruzado supera U sob espelho, rotação e escala', async () => {
  for (const mirror of [false, true]) {
    for (const [angle, scale] of [[0, 1], [.12, .85], [-.10, 1.15]]) {
      const r = await browserRuntime();
      const diag = r.window.librasArcadeDiagnostics;
      diag.startCalibration({ intendedLetter: 'R', physicalHand: mirror ? 'left' : 'right',
        orientation: 'front', distance: 'medium', mirrored: mirror });
      const engine = new r.LibrasEngine();
      const signs = [];
      engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
      for (let at = 100; at <= 750; at += 50) {
        r.clock.now = at;
        engine.update({ landmarks: [crossedRPose({ mirror, angle, scale,
          jitter: at % 100 ? .002 : -.002 })] }, at, 20);
      }
      const sample = diag.read().events.find((event) => event.type === 'recognition');
      assert.equal(sample.candidate, 'R', `espelho=${mirror}, ângulo=${angle}, escala=${scale}`);
      assert.ok(sample.scoreR > sample.scoreU);
      assert.ok(sample.crossOrderIM > 0);
      assert.deepEqual(signs, ['R']);
    }
  }
});

test('U paralelo e sobreposição distante em profundidade não confirmam R', async () => {
  for (const hand of [crossedRPose({ parallel: true }),
    crossedRPose({ parallel: true, angle: .8 }),
    crossedRPose({ parallel: true, yaw: 55 * Math.PI / 180 }),
    crossedRPose({ depthGap: .5 }),
    crossedRPose({ depthGap: .5, angle: .8 }),
    crossedRPose({ fingerDepthGap: .18 })]) {
    const r = await browserRuntime();
    const diag = r.window.librasArcadeDiagnostics;
    diag.startCalibration({ intendedLetter: 'U', physicalHand: 'right',
      orientation: 'front', distance: 'medium', mirrored: false });
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    for (let at = 100; at <= 750; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [hand] }, at, 20);
    }
    assert.equal(signs.includes('R'), false);
    const sample = diag.read().events.find((event) => event.type === 'recognition');
    assert.ok(sample.scoreR < .55, `R não deve ser elegível sem cruzamento confiável: ${sample.scoreR}`);
    assert.ok(sample.crossDepthIM === null || sample.crossDepthIM > .34);
  }
});

test('R cruzado com profundidade gradual atravessa a fronteira de spreadIM', async () => {
  for (const fingerDepthGap of [0, .05, .07, .085, .10]) {
    const r = await browserRuntime();
    const diag = r.window.librasArcadeDiagnostics;
    diag.startCalibration({ intendedLetter: 'R', physicalHand: 'right',
      orientation: 'front', distance: 'medium', mirrored: false });
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    for (let at = 100; at <= 750; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [crossedRPose({ fingerDepthGap })] }, at, 20);
    }
    const sample = diag.read().events.find((event) => event.type === 'recognition');
    assert.ok(sample.crossOrderIM > 0);
    assert.ok(Number.isFinite(sample.crossDepthIM));
    if (fingerDepthGap >= .07) assert.ok(sample.spreadIM > .22 && sample.spreadIM < .34);
    assert.ok(sample.crossDepthIM < .22);
    assert.ok(sample.scoreR > sample.scoreU);
    assert.deepEqual(signs, ['R']);
  }
});

test('R cruzado sob projeção lateral 3D conserva cruzamento observável', async () => {
  let frontalAxis;
  for (const [yawDegrees, mirror] of [[0, false], [45, false], [55, false],
    [55, true], [60, false], [65, false], [80, false]]) {
    const r = await browserRuntime();
    const diag = r.window.librasArcadeDiagnostics;
    diag.startCalibration({ intendedLetter: 'R', physicalHand: mirror ? 'left' : 'right',
      orientation: yawDegrees === 0 ? 'front' : yawDegrees >= 70 ? 'side' : 'oblique',
      distance: 'medium', mirrored: mirror });
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    const hand = crossedRPose({ yaw: yawDegrees * Math.PI / 180, mirror });
    for (let at = 100; at <= 750; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [hand] }, at, 20);
    }
    const sample = diag.read().events.find((event) => event.type === 'recognition');
    assert.ok(sample.crossOrderIM > 0);
    if (yawDegrees === 0) frontalAxis = sample.palmAxisIM;
    else assert.ok(sample.palmAxisIM < frontalAxis);
    if (yawDegrees <= 55) {
      assert.ok(sample.scoreR > sample.scoreU);
      assert.deepEqual(signs, ['R']);
    }
    if (yawDegrees === 80) assert.ok(sample.scoreR < .55);
  }
});

test('R cruzado com eixo projetado curto supera U e sustenta o hold nas duas mãos', async () => {
  for (const mirror of [false, true]) {
    const r = await browserRuntime();
    const diag = r.window.librasArcadeDiagnostics;
    diag.startCalibration({ intendedLetter: 'R', physicalHand: mirror ? 'left' : 'right',
      orientation: 'oblique', distance: 'medium', mirrored: mirror });
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    for (let at = 100; at <= 750; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [crossedRPose({ yaw: 65 * Math.PI / 180, mirror,
        jitter: at % 100 ? -.012 : .004 })] }, at, 20);
    }
    const sample = diag.read().events.find((event) => event.type === 'recognition');
    const geometry = JSON.stringify({ axis: sample.palmAxisIM, order2D: sample.crossOrder2DIM,
      order3D: sample.crossOrderIM, depth: sample.crossDepthIM,
      scoreR: sample.scoreR, scoreU: sample.scoreU });
    assert.ok(sample.crossDepthIM !== null && sample.crossDepthIM < sample.palmAxisIM / 2,
      geometry);
    assert.ok(sample.crossOrder2DIM > sample.crossDepthIM && sample.crossOrderIM > 0, geometry);
    assert.equal(sample.candidate, 'R', geometry);
    assert.ok(sample.scoreR > sample.scoreU, geometry);
    assert.deepEqual(signs, ['R']);
  }
});

test('U paralelo tolera interseção projetada isolada sem confirmar R', async () => {
  for (const mirror of [false, true]) {
    const r = await browserRuntime();
    const diag = r.window.librasArcadeDiagnostics;
    diag.startCalibration({ intendedLetter: 'U', physicalHand: mirror ? 'left' : 'right',
      orientation: 'front', distance: 'medium', mirrored: mirror });
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    const parallel = crossedRPose({ parallel: true, mirror });
    const accidental = crossedRPose({ parallel: true, mirror });
    accidental[7] = { ...accidental[7], x: mirror ? .42 : .58 };
    accidental[11] = { ...accidental[11], x: mirror ? .48 : .52 };
    for (let at = 100; at <= 1150; at += 50) {
      r.clock.now = at;
      engine.update({ landmarks: [at === 400 ? accidental : parallel] }, at, 20);
    }
    const events = diag.read().events;
    const noise = events.find((event) => event.type === 'recognition' && event.at === 400);
    assert.equal(noise.crossGap2DIM < 1e-10, true);
    assert.ok(noise.crossOrder2DIM <= 0);
    assert.deepEqual(signs, ['U']);
    assert.equal(events.some((event) => event.type === 'signconfirmed' && event.letter === 'R'), false);
  }
});

test('U com pontas próximas e pequenas oscilações permanece U sem inversão', async () => {
  for (const mirror of [false, true]) {
    const r = await browserRuntime();
    const diag = r.window.librasArcadeDiagnostics;
    diag.startCalibration({ intendedLetter: 'U', physicalHand: mirror ? 'left' : 'right',
      orientation: 'front', distance: 'medium', mirrored: mirror });
    const engine = new r.LibrasEngine();
    const signs = [];
    engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
    for (let at = 100; at <= 950; at += 50) {
      const hand = crossedRPose({ parallel: true, mirror });
      const offset = at % 100 ? .004 : .002;
      hand[8] = { ...hand[8], x: .5 + (mirror ? 1 : -1) * offset, z: .04 };
      hand[12] = { ...hand[12], x: .5 + (mirror ? -1 : 1) * offset, z: -.04 };
      r.clock.now = at;
      engine.update({ landmarks: [hand] }, at, 20);
    }
    const samples = diag.read().events.filter((event) => event.type === 'recognition');
    assert.ok(samples.every((event) => event.crossDepthIM === null));
    assert.ok(samples.every((event) => event.crossOrder2DIM < 0));
    assert.ok(samples.some((event) => event.crossGap2DIM < .03));
    assert.deepEqual(signs, ['U']);
  }
});

test('um único frame espúrio com geometria de R não supera o hold de U', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'U', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  const engine = new r.LibrasEngine();
  const signs = [];
  engine.addEventListener('signconfirmed', (event) => signs.push(event.detail.letter));
  for (let at = 100; at <= 1250; at += 50) {
    r.clock.now = at;
    engine.update({ landmarks: [at === 400
      ? crossedRPose({ yaw: 65 * Math.PI / 180 })
      : crossedRPose({ parallel: true })] }, at, 20);
  }
  const events = diag.read().events;
  assert.ok(events.some((event) => event.type === 'recognition' &&
    event.at === 400 && event.candidate === 'R'));
  assert.deepEqual(signs, ['U']);
  assert.equal(events.some((event) => event.type === 'signconfirmed' && event.letter === 'R'), false);
});

test('calibração E/M/R expõe concorrentes e escalares sem landmarks', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  const engine = new r.LibrasEngine();
  diag.startCalibration({ intendedLetter: 'R', physicalHand: 'left',
    orientation: 'oblique', distance: 'medium', mirrored: true });
  engine.update({ landmarks: [crossedRPose({ mirror: true })] }, 100, 20);
  const sample = diag.read().events.find((event) => event.type === 'recognition');
  for (const field of ['scoreE', 'scoreM', 'scoreN', 'scoreR', 'scoreS', 'scoreU',
    'scoreA', 'scoreO', 'crossIM', 'crossOrderIM', 'crossDepthIM', 'palmAxisIM', 'thumbPinkyMcp',
    'thumbRingMcp', 'thumbIndexMcp', 'thumbMiddleMcp', 'thumbRingPinch',
    'tipPalmMean', 'thumbFingerDepth', 'tipDepthIM']) {
    assert.ok(Number.isFinite(sample[field]), field);
  }
  assert.equal(diag.read().calibration.physicalHand, 'left');
  assert.equal(diag.read().events.some((event) => 'landmarks' in event), false);
});

test('calibração mede flexão por articulação e pontas sem alterar a classificação', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  const engine = new r.LibrasEngine();
  const hand = (folded, mirror = false) => {
    const lm = Array.from({ length: 21 }, () => ({ x: .5, y: .7, z: 0 }));
    lm[0] = { x: .5, y: .85, z: 0 };
    for (const [mcp, x] of [[5, .38], [9, .5], [13, .62], [17, .75]]) {
      lm[mcp] = { x, y: .6, z: 0 };
      lm[mcp + 1] = { x: folded ? x + .1 : x, y: folded ? .55 : .48, z: 0 };
      lm[mcp + 2] = { x: folded ? x + .2 : x, y: folded ? .5 : .36, z: 0 };
      lm[mcp + 3] = { x: folded ? x + .3 : x, y: folded ? .45 : .24, z: 0 };
    }
    lm[4] = { x: .48, y: .68, z: 0 };
    return mirror ? lm.map((p) => ({ ...p, x: 1 - p.x })) : lm;
  };
  const capture = (lm, intendedLetter, at, mirror = false) => {
    diag.startCalibration({ intendedLetter, physicalHand: mirror ? 'left' : 'right',
      orientation: 'front', distance: 'medium', mirrored: mirror });
    engine.update({ landmarks: [lm] }, at, 20);
    return diag.stopCalibration().events.find((event) => event.type === 'recognition');
  };
  const b = capture(hand(false), 'B', 100);
  const m = capture(hand(true), 'M', 200);
  const mirrored = capture(hand(true, true), 'M', 300, true);
  for (const sample of [b, m, mirrored]) {
    for (const field of ['mcpFoldIndex', 'mcpFoldMiddle', 'mcpFoldRing',
      'pipFoldIndex', 'pipFoldMiddle', 'pipFoldRing',
      'dipFoldIndex', 'dipFoldMiddle', 'dipFoldRing',
      'tipPalmIndex', 'tipPalmMiddle', 'tipPalmRing', 'tipPalmPinky',
      'thumbPinkyPinch']) assert.ok(Number.isFinite(sample[field]), field);
    const mean = (sample.tipPalmIndex + sample.tipPalmMiddle +
      sample.tipPalmRing + sample.tipPalmPinky) / 4;
    assert.ok(Math.abs(mean - sample.tipPalmMean) < 1e-10);
    assert.equal('landmarks' in sample, false);
  }
  assert.ok(b.mcpFoldMiddle < 1);
  assert.ok(m.mcpFoldMiddle > 50);
  assert.ok(m.extMiddle > .5);
  assert.ok(m.curlMiddle < .01);
  assert.ok(m.pipFoldMiddle < 1);
  assert.ok(m.dipFoldMiddle < 1);
  assert.ok(Math.abs(m.mcpFoldMiddle - mirrored.mcpFoldMiddle) < 1e-10);
  assert.equal('mcpFoldMiddle' in engine.state.features, false);

  diag.enable();
  engine.update({ landmarks: [hand(true)] }, 400, 20);
  const ordinary = diag.read().events.find((event) => event.type === 'recognition');
  assert.equal('mcpFoldMiddle' in ordinary, false);
  assert.equal('tipPalmMiddle' in ordinary, false);
  assert.equal(ordinary.candidate, m.candidate);
  assert.ok(Math.abs(ordinary.score - m.score) < 1e-10);
});

test('calibração distingue aproximação projetada sem interseção de U paralelo', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  const engine = new r.LibrasEngine();
  const near = crossedRPose({ parallel: true });
  near[8] = { ...near[8], x: .499, z: .04 };
  near[12] = { ...near[12], x: .501, z: -.04 };

  diag.startCalibration({ intendedLetter: 'R', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  engine.update({ landmarks: [near] }, 100, 20);
  const nearSample = diag.read().events.find((event) => event.type === 'recognition');
  assert.equal(nearSample.crossDepthIM, null);
  assert.equal(nearSample.scoreR, 0);
  for (const field of ['crossGap2DIM', 'crossGap3DIM', 'crossGap3DAt2DIM',
    'crossProgressIndex2D', 'crossProgressMiddle2D', 'crossOrder2DIM']) {
    assert.ok(Number.isFinite(nearSample[field]), field);
  }
  assert.ok(nearSample.crossGap2DIM > 0);
  assert.ok(nearSample.crossGap3DAt2DIM > nearSample.crossGap2DIM);
  assert.ok(nearSample.crossGap3DIM <= nearSample.crossGap3DAt2DIM);
  assert.ok(nearSample.crossProgressIndex2D > .5);
  assert.ok(nearSample.crossProgressMiddle2D > .5);
  assert.ok(nearSample.crossOrder2DIM < 0);

  diag.startCalibration({ intendedLetter: 'U', physicalHand: 'left',
    orientation: 'front', distance: 'medium', mirrored: true });
  engine.update({ landmarks: [crossedRPose({ parallel: true, mirror: true })] }, 300, 20);
  const parallelSample = diag.read().events.find((event) => event.type === 'recognition');
  assert.equal(parallelSample.crossDepthIM, null);
  assert.ok(parallelSample.crossGap2DIM > nearSample.crossGap2DIM);
  assert.equal(parallelSample.scoreR, 0);

  diag.enable();
  engine.update({ landmarks: [near] }, 500, 20);
  const ordinarySample = diag.read().events.find((event) => event.type === 'recognition');
  assert.equal('crossGap2DIM' in ordinarySample, false);
  assert.equal(diag.read().events.some((event) => 'landmarks' in event), false);
});

test('calibração expõe separação 3D quando os dedos se sobrepõem só na projeção', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  diag.startCalibration({ intendedLetter: 'U', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  const engine = new r.LibrasEngine();
  engine.update({ landmarks: [crossedRPose({ depthGap: .5 })] }, 100, 20);
  const sample = diag.read().events.find((event) => event.type === 'recognition');
  assert.ok(Number.isFinite(sample.crossDepthIM));
  assert.ok(sample.crossGap2DIM < 1e-10);
  assert.ok(sample.crossGap3DAt2DIM > .1);
  assert.ok(sample.crossGap3DIM <= sample.crossGap3DAt2DIM);
  assert.ok(sample.scoreR < .55);
});

test('calibração rotulada guarda frames consecutivos sem mudar a amostragem comum', async () => {
  const r = await browserRuntime();
  const diag = r.window.librasArcadeDiagnostics;
  const engine = new r.LibrasEngine();
  const hand = crossedRPose({ parallel: true });
  diag.startCalibration({ intendedLetter: 'U', physicalHand: 'right',
    orientation: 'front', distance: 'medium', mirrored: false });
  for (const at of [100, 150, 200]) engine.update({ landmarks: [hand] }, at, 20);
  assert.equal(diag.read().events.filter((event) => event.type === 'recognition').length, 3);

  diag.enable();
  for (const at of [300, 350, 400]) engine.update({ landmarks: [hand] }, at, 20);
  assert.equal(diag.read().events.filter((event) => event.type === 'recognition').length, 1);
  assert.equal(diag.read().capacity, 120);
});

test('R cruzado chega ao Treino e Soletrar uma vez após U incorreto e rearmamento', async () => {
  for (const mode of ['practice', 'word']) {
    const r = await browserRuntime();
    const game = new r.Game();
    const engine = new r.LibrasEngine();
    new r.UI(engine, game, new r.ForcaGame());
    const diag = r.window.librasArcadeDiagnostics;
    diag.enable();
    r.cards[mode === 'practice' ? 0 : 1].click();
    game.target = mode === 'practice' ? 'R' : 'RA';
    if (mode === 'word') game.wordIndex = 0;
    const frame = (at, hand) => {
      r.clock.now = at;
      engine.update({ landmarks: hand ? [hand] : [] }, at, 20);
    };
    for (let at = 100; at <= 750; at += 50) frame(at, crossedRPose({ parallel: true }));
    for (let at = 800; at <= 1100; at += 50) frame(at, null);
    for (let at = 1150; at <= 2750; at += 50) frame(at,
      crossedRPose({ yaw: 65 * Math.PI / 180, jitter: at % 100 ? -.012 : .004 }));
    const events = diag.read().events;
    const confirmed = events.filter((event) => event.type === 'signconfirmed');
    assert.deepEqual(Array.from(confirmed, (event) => event.letter), ['U', 'R']);
    assert.ok(events.some((event) => event.type === 'recognition' &&
      event.candidate === 'R' && event.phase === 'STABILIZING'));
    assert.ok(events.some((event) => event.type === 'ui_received' && event.letter === 'R'));
    assert.ok(events.some((event) => event.type === 'game_decision' &&
      event.letter === 'U' && event.expected === 'R' && event.reason === 'wrong_letter'));
    assert.ok(events.some((event) => event.type === 'game_decision' &&
      event.letter === 'R' && event.reason === 'accepted' && event.mode === mode));
    if (mode === 'word') assert.equal(game.wordIndex, 1);
  }
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
