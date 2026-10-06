// Dump the film's cue sheet (event times) to out/cues.json for audio.py.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(here, 'reel.html')).href);
await page.waitForFunction(() => window.__ready === true);
const cues = await page.evaluate(() => window.__film.cues);
await browser.close();
mkdirSync(path.join(here, 'out'), { recursive: true });
writeFileSync(path.join(here, 'out', 'cues.json'), JSON.stringify(cues, null, 1));
console.log(JSON.stringify(cues));
