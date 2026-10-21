// Experimento isolado; nenhum Worker é adicionado ao runtime distribuído.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const workerType = process.argv[3] || 'module';
if (!['module', 'classic'].includes(workerType)) throw Error('Tipo de Worker: module ou classic');
let workerSource = `
import { HandLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
let detector;
self.onmessage = async ({data}) => {
  try {
    if(data.init) {
      const runtime = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      detector = await HandLandmarker.createFromOptions(runtime, {
        baseOptions: {modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},
        runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5
      }); postMessage({ready:true}); return;
    }
    const start=performance.now();
    try { const results=detector.detectForVideo(data.bitmap,data.timestamp);
      postMessage({inferenceMs:performance.now()-start,hands:results.landmarks.length});
    } finally {data.bitmap.close();}
  } catch(error) {postMessage({error:String(error),stack:error.stack});}
};`;
if (workerType === 'classic') workerSource = workerSource
  .replace("import { HandLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';",
    "const library = import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');")
  .replace('if(data.init) {', 'if(data.init) { const {HandLandmarker,FilesetResolver} = await library;');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': req.url === '/worker.js' ? 'text/javascript' : 'text/html' });
  res.end(req.url === '/worker.js' ? workerSource : '<!doctype html><title>Experimento local de Worker</title>');
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const result = await page.evaluate(async type => {
      const worker = new Worker('/worker.js', { type });
      const request = (data, transfer = []) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error('Timeout de 60 s no Worker')), 60000);
        worker.onmessage = ({data}) => { clearTimeout(timeout); resolve(data); };
        worker.onerror = event => { clearTimeout(timeout); reject(Error(event.message)); };
        worker.postMessage(data, transfer);
      });
      try {
        const initStart = performance.now(); const init = await request({init:true});
        if(init.error) return {supported:false,initMs:performance.now()-initStart,...init};
        const initMs = performance.now()-initStart;
        const input=document.createElement('canvas'); input.width=320;input.height=240;
        const ctx=input.getContext('2d');ctx.fillStyle='#444';ctx.fillRect(0,0,320,240);
        const samples=[];
        // Um bitmap em trânsito; cinco inferências de aquecimento, depois 60 medidas.
        for(let i=0;i<65;i++) {
          ctx.fillStyle='#888';ctx.fillRect(i,110,10,10);
          const start=performance.now(); const bitmap=await createImageBitmap(input);
          const copyMs=performance.now()-start;
          const reply=await request({bitmap,timestamp:performance.now()},[bitmap]);
          if(reply.error) return {supported:false,initMs,...reply};
          if(i>=5) samples.push({copyMs,roundTripMs:performance.now()-start,...reply});
          await new Promise(resolve=>setTimeout(resolve,50));
        }
        return {supported:true,initMs,samples};
      } catch(error) { return {supported:false,error:String(error)}; }
      finally {worker.terminate();}
    }, workerType);
    const output=path.resolve(process.argv[2] || 'docs/performance/worker.json');
    fs.mkdirSync(path.dirname(output),{recursive:true});
    const report={date:new Date().toISOString(),browser:await browser.version(),workerType,version:'0.10.14',delegate:'GPU',input:'canvas 320x240 sem mão',...result};
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({workerType,supported:result.supported,samples:result.samples?.length || 0,error:result.error}));
  } finally {await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
