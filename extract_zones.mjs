// Extract multiple reference zones for embedding in SVG.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
const refData = 'data:image/jpeg;base64,' + readFileSync('d:/right_output/TSN.jpg').toString('base64');
const W = 1309, H = 875;
await page.setViewportSize({ width: W, height: H });
await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);

await page.evaluate(({ refData, W, H }) => {
  return new Promise(resolve => {
    const refImg = new Image();
    refImg.onload = () => {
      const c = document.getElementById('c');
      c.getContext('2d').drawImage(refImg, 0, 0, W, H);
      resolve();
    };
    refImg.src = refData;
  });
}, { refData, W, H });

async function extractPatch(cmpX0, cmpY0, cmpX1, cmpY1, filename) {
  const w = cmpX1 - cmpX0, h = cmpY1 - cmpY0;
  const dataUrl = await page.evaluate(({ x0, y0, w, h }) => {
    const c2 = document.createElement('canvas');
    c2.width = w; c2.height = h;
    const ctx2 = c2.getContext('2d');
    ctx2.drawImage(document.getElementById('c'), x0, y0, w, h, 0, 0, w, h);
    return c2.toDataURL('image/png');
  }, { x0: cmpX0, y0: cmpY0, w, h });
  const b64 = dataUrl.split(',')[1];
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(`c:/Users/User/airport-simulator/public/${filename}`, buf);
  console.log(`${filename}: CMP (${cmpX0}-${cmpX1}, ${cmpY0}-${cmpY1}) = ${w}×${h} → ${buf.length} bytes`);
}

// Row 3 west: CMP (0-808, 294-392) → SVG x=0, y=289, width=741, height=96
await extractPatch(0, 294, 808, 392, 'r3_west.png');

// Row 2 full: CMP (0-1309, 196-294) → SVG x=0, y=193, width=1200, height=97
await extractPatch(0, 196, 1309, 294, 'r2_full.png');

// Row 4 mid-east: CMP (606-909, 392-490) → SVG x=556, y=387, width=278, height=97
await extractPatch(606, 392, 909, 490, 'r4_mid.png');

// Row 5 mid: CMP (606-909, 490-588) → SVG x=556, y=482, width=278, height=97
await extractPatch(606, 490, 909, 588, 'r5_mid.png');

// Row 6 mid: CMP (606-909, 588-686) → SVG x=556, y=581, width=278, height=96
await extractPatch(606, 588, 909, 686, 'r6_mid.png');

// Row 3 full (includes already-done VAECO, but we'll use this to fill gaps)
// Actually we only need the west half since VAECO is handled
// Let's also do Row 7 mid area just in case
// Row 7 mid: CMP (606-909, 686-784) → SVG x=556, y=675, width=278, height=96
await extractPatch(606, 686, 909, 784, 'r7_mid.png');

// Large zone: the entire area CMP (0-606, 294-490) (rows 3-4, west columns c0-c5)
await extractPatch(0, 294, 606, 490, 'r34_west.png');

await browser.close();
console.log('Done');
