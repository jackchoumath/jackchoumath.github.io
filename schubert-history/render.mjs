// Deterministic frame renderer: loads reel.html in headless Chromium, calls
// window.seek(t) for every (sub-)frame and streams lossless captures, in
// order, into ffmpeg.
//
//   node render.mjs [--fps 60] [--from 0] [--to 15] [--workers 3] [--blur 4]
//                   [--audio out/score.wav] [--crf 18] [--grain 5]
//                   [--out out/schubert-calculus.mp4]
//   node render.mjs --stills 1.2,4.5        (PNGs into out/stills)
//
// --blur N renders N sub-frames per frame across a 180-degree shutter and
// averages them (real motion blur). Grain is added by ffmpeg after the
// average so it stays crisp; the page is loaded with ?nograin.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
  return acc;
}, []));

const W = 1920, H = 1080;
const fps = Number(args.fps ?? 60);
const from = Number(args.from ?? 0);
const to = Number(args.to ?? 15);
const workers = Number(args.workers ?? 3);
const blur = Number(args.blur ?? 1);
const grain = Number(args.grain ?? 5);
const crf = String(args.crf ?? 18);
const out = path.resolve(here, args.out ?? 'out/preview.mp4');
const pageUrl = pathToFileURL(path.join(here, args.html ?? 'reel.html')).href;
const extraQuery = args.q ? String(args.q) : '';

async function openPage(browser, query = '') {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  const q = [query.replace(/^\?/, ''), extraQuery].filter(Boolean).join('&');
  await page.goto(pageUrl + (q ? '?' + q : ''));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  const cdp = await page.context().newCDPSession(page);
  page.capture = async t => {
    await page.evaluate(tt => window.seek(tt), t);
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(r.data, 'base64');
  };
  return page;
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none', '--hide-scrollbars'],
});

if (args.stills) {
  const dir = path.join(here, 'out', args.dir ?? 'stills');
  mkdirSync(dir, { recursive: true });
  const page = await openPage(browser);
  for (const s of String(args.stills).split(',')) {
    const t = Number(s);
    const name = path.join(dir, `${args.prefix ?? ''}t${t.toFixed(2).padStart(5, '0')}.png`);
    writeFileSync(name, await page.capture(t));
    console.log(name);
  }
  await browser.close();
  process.exit(0);
}

mkdirSync(path.dirname(out), { recursive: true });
const nFrames = Math.round((to - from) * fps);
const jobs = [];
for (let f = 0; f < nFrames; f++) {
  for (let s = 0; s < blur; s++) {
    // 180-degree shutter centred on the frame time.
    const off = blur === 1 ? 0 : ((s + 0.5) / blur - 0.5) * 0.5 / fps;
    jobs.push(Math.max(0, from + f / fps + off));
  }
}

// ffmpeg: average sub-frames, convert to BT.709 4:2:0, add grain, mux audio.
const vf = [
  blur > 1 ? `tmix=frames=${blur}:weights='${Array(blur).fill(1).join(' ')}',select='eq(mod(n\\,${blur})\\,${blur - 1})',setpts=N/${fps}/TB` : null,
  'scale=out_color_matrix=bt709:out_range=tv',
  'format=yuv420p',
  grain > 0 ? `noise=c0s=${grain}:c0f=t+u` : null,
].filter(Boolean).join(',');
const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * blur), '-c:v', 'png', '-i', '-'];
if (args.audio) ffArgs.push('-i', path.resolve(here, args.audio));
ffArgs.push('-vf', vf, '-r', String(fps), '-c:v', 'libx264', '-preset', args.preset ?? 'slow', '-crf', crf,
  '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-x264-params', 'colormatrix=bt709', '-movflags', '+faststart');
if (args.audio) ffArgs.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
ffArgs.push(out);
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exited ' + c))));

// Workers render out of order; a writer feeds ffmpeg strictly in order.
const results = new Map();
let nextJob = 0, nextWrite = 0, wake = null;
const t0 = Date.now();
async function writer() {
  while (nextWrite < jobs.length) {
    if (!results.has(nextWrite)) { await new Promise(r => (wake = r)); continue; }
    const buf = results.get(nextWrite);
    results.delete(nextWrite);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    nextWrite++;
    if (nextWrite % 60 === 0) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`  ${nextWrite}/${jobs.length}  ${(nextWrite / el).toFixed(1)} img/s\r`);
    }
  }
  ff.stdin.end();
}
async function worker() {
  const page = await openPage(browser, grain > 0 ? '?nograin' : '');
  while (nextJob < jobs.length) {
    // Bound the reorder buffer.
    while (nextJob - nextWrite > workers * 4) await new Promise(r => setTimeout(r, 5));
    const j = nextJob++;
    results.set(j, await page.capture(jobs[j]));
    if (wake) { const w = wake; wake = null; w(); }
  }
}
await Promise.all([writer(), ...Array.from({ length: workers }, worker)]);
await browser.close();
await ffDone;
console.log(`\nwrote ${out}: ${jobs.length} images in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
