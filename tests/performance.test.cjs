const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime } = require('./helpers/runtime.cjs');

test('FPS representa a última janela de 1 s, não o tamanho de um histórico', async () => {
  const r = await runtime(); const video = { currentTime: 0, readyState: 2 }; let fps;
  r.vision.startDetectionLoop(video, (_, value) => { fps = value; });
  for (let i = 1; i <= 20; i++) { video.currentTime = i; r.tick(i * 1000); }
  assert.equal(fps, 1);
});

test('snapshot mede inferência e consumidor separadamente e expira FPS parado', async () => {
  const r = await runtime({ inferenceMs: 7 }); const video = { currentTime: 1, readyState: 2 };
  assert.equal(typeof r.vision.getPerformanceMetrics, 'function');
  r.vision.startDetectionLoop(video, () => r.advance(3)); r.tick(100);
  const m = r.vision.getPerformanceMetrics();
  assert.equal(m.inferenceMs.mean, 7); assert.equal(m.inferenceMs.p95, 7);
  assert.equal(m.consumerMs.mean, 3); assert.equal(m.processedFrames, 1);
  r.advance(1100); assert.equal(r.vision.getPerformanceMetrics().fps, 0);
});

test('estatísticas mantêm no máximo 120 amostras sem perder contagem total', async () => {
  const r = await runtime(); const video = { currentTime: 0, readyState: 2 };
  assert.equal(typeof r.vision.getPerformanceMetrics, 'function');
  r.vision.startDetectionLoop(video, () => {});
  for (let i = 1; i <= 400; i++) { video.currentTime = i; r.tick(i * 50); }
  const m = r.vision.getPerformanceMetrics();
  assert.equal(m.samples, 120); assert.equal(m.processedFrames, 400); assert.equal(m.fps, 20);
});

test('início repetido mantém uma cadeia; parar dentro do callback impede reagendamento', async () => {
  const r = await runtime({ inferenceMs: 7 }); const video = { currentTime: 1, readyState: 2 };
  r.vision.startDetectionLoop(video, () => {});
  r.vision.startDetectionLoop(video, () => { r.advance(3); r.vision.stopDetectionLoop(); });
  assert.equal(r.frames.size, 1); r.tick(100); assert.equal(r.frames.size, 0);
  assert.equal(r.vision.getPerformanceMetrics().consumerMs.mean, 3);
  assert.equal(r.vision.getPerformanceMetrics().cycleMs.mean, 10);
});

test('preserva timestamps, deduplicação e intervalo de 50 ms em relação à baseline', async () => {
  const sequences = [];
  for (const baseline of [true, false]) {
    const r = await runtime({ baseline }); const video = { currentTime: 0, readyState: 2 };
    r.vision.startDetectionLoop(video, () => {});
    for (let t = 0; t <= 3000; t += 10) { video.currentTime = Math.floor(t / 33); r.tick(t); }
    sequences.push(r.calls);
  }
  assert.deepEqual(sequences[1], sequences[0]);
});

test('não reprocessa vídeo parado, e contabiliza descarte por intervalo', async () => {
  const r = await runtime(); const video = { currentTime: 1, readyState: 2 };
  assert.equal(typeof r.vision.getPerformanceMetrics, 'function');
  r.vision.startDetectionLoop(video, () => {}); r.tick(100); r.tick(150);
  video.currentTime = 2; r.tick(160); video.currentTime = 3; r.tick(180);
  assert.equal(r.calls.length, 2);
  const m = r.vision.getPerformanceMetrics();
  assert.equal(m.skippedUnchanged, 1); assert.equal(m.skippedInterval, 1);
});

test('Canvas não redefine dimensões iguais nem limpa frames vazios repetidamente', async () => {
  const r = await runtime(); r.app.resizeCanvas(); const writes = r.sizeWrites;
  r.app.resizeCanvas(); assert.equal(r.sizeWrites, writes);
  r.app.drawHands({ landmarks: [] }); r.app.drawHands({ landmarks: [] });
  assert.equal(r.drawing.filter(c => c[0] === 'clearRect').length, 0);
});

test('Canvas limpa imediatamente ao desaparecer a mão e preserva desenho/geometria', async () => {
  const hand = Array.from({ length: 21 }, (_, i) => ({ x: 0.3 + i / 100, y: 0.4 + i / 200, z: 0 }));
  const traces = [];
  for (const baseline of [true, false]) {
    const r = await runtime({ baseline }); r.app.resizeCanvas(); r.app.drawHands({ landmarks: [hand] });
    traces.push(r.drawing.slice());
    if (!baseline) {
      r.app.drawHands({ landmarks: [] }); const count = r.drawing.length;
      assert.equal(r.drawing.at(-1)[0], 'clearRect');
      r.app.drawHands({ landmarks: [] }); assert.equal(r.drawing.length, count);
    }
  }
  assert.deepEqual(traces[1], traces[0]);
});

test('regressão de eventos nos três motores com sinais confirmados', async () => {
  const r = await runtime();
  const g = new r.game.Game(); g.startPractice(1); g.handleSign(g.target); assert.equal(g.score, 10); g.end();
  g.startWord(1); const word = g.target; for (const letter of word) g.handleSign(letter);
  assert.ok(g.score > word.length * 10); g.end();
  const f = new r.forca.ForcaGame(); f.start(1); const first = f.word[0]; f.handleGuess(first);
  const score = f.score; f.handleGuess(first); assert.equal(f.score, score);
  for (const letter of new Set(f.word)) f.handleGuess(letter); assert.equal(f.status, 'won'); f.end();
  f.start(1); for (const letter of r.data.LETTER_POOL.filter(c => !f.word.includes(c)).slice(0, 6)) f.handleGuess(letter);
  assert.equal(f.status, 'lost'); f.end();
});

test('respeita os limites exatos de 50 ms e 1.000 ms', async () => {
  const r = await runtime({ inferenceMs: 0 }); const video = { currentTime: 1, readyState: 2 };
  r.vision.startDetectionLoop(video, () => {});
  r.tick(49); assert.equal(r.calls.length, 0);
  r.tick(50); assert.equal(r.calls.length, 1);
  r.setClock(1049); assert.equal(r.vision.getPerformanceMetrics().fps, 1);
  r.setClock(1050); assert.equal(r.vision.getPerformanceMetrics().fps, 0);
});

test('callback antigo não reativa cadeia após reinício; estatísticas são da nova sessão', async () => {
  const r = await runtime(); const video = { currentTime: 1, readyState: 2 };
  r.vision.startDetectionLoop(video, () => {});
  const old = [...r.frames.values()][0]; r.tick(100);
  r.vision.startDetectionLoop(video, () => {}); old(200);
  assert.equal(r.frames.size, 1); assert.equal(r.vision.getPerformanceMetrics().processedFrames, 0);
  r.tick(250); assert.equal(r.vision.getPerformanceMetrics().processedFrames, 1);
});

test('estados, confirmações e cursor permanecem iguais para sequência sintética de landmarks', async () => {
  const traces = [];
  for (const baseline of [true, false]) {
    const result = { landmarks: [] };
    const r = await runtime({ baseline, result }); const engine = new r.libras.LibrasEngine();
    const video = { currentTime: 0, readyState: 2 }; const states = [], signs = [], nav = [];
    engine.addEventListener('signconfirmed', e => signs.push(e.detail.letter));
    engine.addEventListener('navback', () => nav.push(r.calls.length));
    r.vision.startDetectionLoop(video, (detected, fps) => {
      const state = engine.update(detected, r.calls.at(-1).timestamp + 4, fps);
      const copy = JSON.parse(JSON.stringify(state)); delete copy.fps;
      states.push({ state: copy, cursor: JSON.parse(JSON.stringify(r.app.computeNavState(detected))) });
    });
    for (let i = 1; i <= 90; i++) {
      // Pose artificial e deslocamento: teste diferencial de software, não validação de Libras.
      result.landmarks = i > 75 ? [] : [Array.from({ length: 21 }, (_, j) => ({
        x: .7 + j / 100 - (i > 40 ? Math.min(i-40, 20)/40 : 0), y: .4+j/200, z: 0
      }))];
      video.currentTime = i; r.tick(i*50);
    }
    assert.ok(signs.length > 0); assert.ok(nav.length > 0);
    traces.push({ states, signs, nav });
  }
  assert.deepEqual(traces[1], traces[0]);
});

test('hold e trajetórias J/Z preservam confirmações e instante em fixtures sintéticas', async () => {
  const traces = [];
  for (const baseline of [true, false]) {
    const r = await runtime({ baseline }); const events = [];
    const hold = new r.libras.LibrasEngine(); let timestamp;
    hold.addEventListener('signconfirmed', e => events.push([e.detail.letter, timestamp]));
    for (timestamp = 100; timestamp <= 750; timestamp += 50) hold._trackHold('A', timestamp);
    assert.deepEqual(events, [['A', 700]]);
    for (const letter of ['J', 'Z']) {
      const engine = new r.libras.LibrasEngine();
      const features = { extIndex: letter === 'Z' ? 1 : 0, extMiddle: 0, extRing: 0, extPinky: letter === 'J' ? 1 : 0 };
      const points = letter === 'J'
        ? [[.2,.1],[.2,.2],[.2,.3],[.2,.4],[.2,.5],[.2,.6],[.25,.7],[.35,.75],[.45,.7],[.5,.6],[.5,.5]]
        : Array.from({length:25}, (_,i) => [i<=8 ? i*.1 : i<=16 ? (16-i)*.1 : (i-16)*.1, .1+i*.02]);
      const found = [];
      for (let i=0; i<points.length; i++) {
        const [x,y] = points[i]; const lm = Array.from({length:21}, () => ({x,y,z:0}));
        const result = engine._trackMotionSigns(lm, features, 1, 100+i*50);
        if(result) found.push([result, 100+i*50]);
      }
      assert.ok(found.some(([value]) => value === letter)); events.push(...found);
    }
    traces.push(events);
  }
  assert.deepEqual(traces[1], traces[0]);
});
