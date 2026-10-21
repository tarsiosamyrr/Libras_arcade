// Benchmark local: MediaPipe real, vídeo gerado sem pessoas e instrumentação só nas respostas HTTP.
// Requer Playwright disponível no ambiente; não instala dependências nem acessa a webcam.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const BASE = '9063154f5661c50fc7312059aa769709615b3e70';
const variant = process.argv[2] || 'current';
if (!['baseline', 'current', 'rvfc'].includes(variant)) throw Error('Variante: baseline, current ou rvfc');
const output = path.resolve(process.argv[3] || `docs/performance/${variant}.json`);
const seconds = Number(process.env.BENCH_SECONDS || 4);
const repeats = Number(process.env.BENCH_REPEATS || 3);
const source = file => variant === 'baseline' || variant === 'rvfc'
  ? execFileSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8' })
  : fs.readFileSync(path.join(ROOT, file), 'utf8');

const server = http.createServer((req, res) => {
  const file = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html';
  // Lista fechada: não servir a cópia aninhada nem arquivos do usuário.
  if (!/^(index\.html|js\/[a-z]+\.js|css\/style\.css)$/.test(file)) { res.writeHead(404).end(); return; }
  try {
    let body = source(file);
    if (file === 'js/app.js') body = body.replace('const ui = new UI(libras, game, forca);',
      'const ui = new UI(libras, game, forca); window.__app = {libras, game, forca, ui};');
    if (file === 'js/vision.js') {
      body = body.replace('const tick = (now) => {', 'const tick = (now) => { if(window.__bench) window.__bench.callbacks++;');
      body = body.replace('const results = handLandmarker.detectForVideo(videoEl, now);',
        'const benchStart = performance.now(); const results = handLandmarker.detectForVideo(videoEl, now); const benchInference = performance.now() - benchStart;');
      body = body.replace('onResults(results, fps);', `const benchConsumer = performance.now(); onResults(results, fps);
        if(window.__bench) { window.__bench.inference.push(benchInference); window.__bench.consumer.push(performance.now()-benchConsumer);
        window.__bench.timestamps.push(performance.now()); window.__bench.hands += results.landmarks.length; window.__bench.displayedFps = fps; }`);
      if (variant === 'rvfc') body = body.replaceAll('requestAnimationFrame(tick)', 'videoEl.requestVideoFrameCallback(tick)');
    }
    res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' }).end(body);
  } catch (error) { res.writeHead(500).end(String(error)); }
});

function stats(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return { count: sorted.length, mean: values.reduce((a, b) => a + b, 0) / (values.length || 1),
    p95: sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] || 0, max: sorted.at(-1) || 0 };
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => {
      // Movimento mínimo força novos frames, sem simular landmarks ou o detector.
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
        const input = document.createElement('canvas'); input.width = 320; input.height = 240;
        const ctx = input.getContext('2d'); let frame = 0;
        const paint = () => { ctx.fillStyle = '#444'; ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#888'; ctx.fillRect((frame++ % 280), 110, 10, 10); };
        paint(); setInterval(paint, 1000 / 30); return input.captureStream(30);
      } });
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (window.__bench && this.canvas.id === 'overlay') window.__bench.clears++;
        return clear.apply(this, args);
      };
      new PerformanceObserver(list => {
        if(window.__bench) window.__bench.longTasks.push(...list.getEntries().map(e => e.duration));
      }).observe({ type: 'longtask' });
      const refresh = () => { if(window.__bench) window.__bench.refreshes++; requestAnimationFrame(refresh); };
      requestAnimationFrame(refresh);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
    await page.locator('#boot-start-btn').click();
    await page.waitForFunction(() => window.__app, null, { timeout: 120000 });
    const environment = await page.evaluate(() => ({ userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory,
      video: { width: webcam.videoWidth, height: webcam.videoHeight },
      rvfc: typeof HTMLVideoElement.prototype.requestVideoFrameCallback,
      renderer: (() => { const gl = document.createElement('canvas').getContext('webgl2');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'indisponível'; })()
    }));
    const runs = [];
    const scenarios = [{ mode: 'home', debug: false }, { mode: 'practice', debug: false },
      { mode: 'word', debug: false }, { mode: 'forca', debug: false }, { mode: 'practice', debug: true }];
    for (let repeat = 1; repeat <= repeats; repeat++) for (const scenario of scenarios) {
      await page.keyboard.press('Escape');
      if (scenario.mode !== 'home') await page.locator(`[data-mode="${scenario.mode}"]`).click();
      if (scenario.debug) await page.keyboard.press('d');
      await page.waitForTimeout(2000);
      await page.evaluate(() => { window.__bench = { start: performance.now(), callbacks: 0, refreshes: 0, clears: 0,
        hands: 0, inference: [], consumer: [], timestamps: [], longTasks: [] }; });
      await page.waitForTimeout(seconds * 1000);
      const raw = await page.evaluate(() => {
        const b = window.__bench; window.__bench = null;
        return { ...b, durationMs: performance.now()-b.start, heapBytes: performance.memory?.usedJSHeapSize ?? null,
          screen: window.__app.ui.currentScreen };
      });
      const gaps = raw.timestamps.slice(1).map((t, i) => t-raw.timestamps[i]);
      const run = { ...scenario, repeat, durationMs: raw.durationMs, processed: raw.inference.length,
        fps: raw.inference.length*1000/raw.durationMs, displayedFps: raw.displayedFps,
        callbackHz: raw.callbacks*1000/raw.durationMs, refreshHz: raw.refreshes*1000/raw.durationMs,
        callbacks: raw.callbacks, clears: raw.clears, hands: raw.hands, screen: raw.screen,
        inferenceMs: stats(raw.inference), consumerMs: stats(raw.consumer), frameGapMs: stats(gaps),
        longTasksMs: stats(raw.longTasks), heapBytes: raw.heapBytes };
      runs.push(run); console.log(JSON.stringify({ variant, ...scenario, repeat, fps: run.fps, inferenceMs: run.inferenceMs.mean, clears: run.clears }));
      if (scenario.debug) await page.keyboard.press('d');
    }
    const regression = await page.evaluate(() => {
      const { ui, libras, game, forca } = window.__app; const checks = [];
      const check = (name, value) => { checks.push({ name, passed: !!value }); if(!value) throw Error(name); };
      const confirm = letter => libras.dispatchEvent(new CustomEvent('signconfirmed', { detail: { letter } }));
      const hudScore = () => Number(document.getElementById('hud-score').textContent);
      ui.exitToHome(); ui.startMode('practice'); confirm(game.target);
      check('Treino: evento confirmado soma pontos na tela de jogo', game.score === 10 && hudScore() === 10 && ui.playEl.classList.contains('is-open'));
      ui.exitToHome(); ui.startMode('word'); const word = game.target;
      for(const letter of word) confirm(letter);
      check('Soletrar: sequência confirmada completa palavra e bônus', game.score > word.length*10 && hudScore() === game.score && ui.playEl.classList.contains('is-open'));
      ui.exitToHome(); ui.startMode('forca'); const first=forca.word[0]; confirm(first); const score=forca.score; confirm(first);
      check('Forca: repetição não pontua novamente', forca.score === score);
      for(const letter of new Set(forca.word)) confirm(letter);
      check('Forca: vitória por eventos de reconhecimento', forca.status === 'won' && hudScore() === forca.score && ui.forcaPlayEl.classList.contains('is-open'));
      ui.exitToHome(); ui.startMode('forca');
      for(const letter of [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(c=>!forca.word.includes(c)).slice(0,6)) confirm(letter);
      check('Forca: seis erros encerram rodada', forca.status === 'lost');
      ui.exitToHome(); check('Saída retorna ao menu', ui.currentScreen === 'home' && !ui.homeEl.classList.contains('hidden'));
      return checks;
    });
    const sourceSha256 = Object.fromEntries(['js/vision.js','js/app.js','js/libras.js','js/ui.js','js/game.js','js/forca.js'].map(file =>
      [file,createHash('sha256').update(source(file)).digest('hex')]));
    const report = { date: new Date().toISOString(), variant, baseline: BASE, input: 'canvas 320x240, 30 Hz solicitado, sem mão',
      seconds, repeats, browser: await browser.version(), platform: os.platform(), cpu: os.cpus()[0].model,
      environment, errors, regression, sourceSha256, runs };
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2)+'\n');
    if(errors.length) throw Error(`Erros de página: ${errors.join('; ')}`);
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
