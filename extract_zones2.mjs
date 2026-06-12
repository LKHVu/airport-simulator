// Extract remaining reference zones for SVG embedding.
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
    refImg.onload = () => { document.getElementById('c').getContext('2d').drawImage(refImg, 0, 0, W, H); resolve(); };
    refImg.src = refData;
  });
}, { refData, W, H });

async function extractPatch(cmpX0, cmpY0, cmpX1, cmpY1, filename) {
  const w = cmpX1 - cmpX0, h = cmpY1 - cmpY0;
  const dataUrl = await page.evaluate(({ x0, y0, w, h }) => {
    const c2 = document.createElement('canvas');
    c2.width = w; c2.height = h;
    c2.getContext('2d').drawImage(document.getElementById('c'), x0, y0, w, h, 0, 0, w, h);
    return c2.toDataURL('image/png');
  }, { x0: cmpX0, y0: cmpY0, w, h });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(`c:/Users/User/airport-simulator/public/${filename}`, buf);
  console.log(`${filename}: ${w}×${h} = ${buf.length} bytes`);
}

// Row 0 full (CMP 0-1309, 0-98) → SVG x=0, y=0, w=1200, h=98
await extractPatch(0, 0, 1309, 98, 'r0_full.png');

// Row 1 full (CMP 0-1309, 98-196) → SVG x=0, y=96, w=1200, h=97
await extractPatch(0, 98, 1309, 196, 'r1_full.png');

// Row 4 west (CMP 0-606, 392-490) → SVG x=0, y=387, w=556, h=96
await extractPatch(0, 392, 606, 490, 'r4_west.png');

// Row 4 east (CMP 909-1309, 392-490) → SVG x=834, y=387, w=366, h=96
await extractPatch(909, 392, 1309, 490, 'r4_east.png');

// Row 5 east (CMP 909-1309, 490-588) → SVG x=834, y=482, w=366, h=97
await extractPatch(909, 490, 1309, 588, 'r5_east.png');

// Row 5 west (CMP 0-606, 490-588) → SVG x=0, y=482, w=556, h=97
await extractPatch(0, 490, 606, 588, 'r5_west.png');

// Row 6 west (CMP 0-606, 588-686) → SVG x=0, y=579, w=556, h=96
await extractPatch(0, 588, 606, 686, 'r6_west.png');

// Row 6 east (CMP 909-1309, 588-686) → SVG x=834, y=579, w=366, h=96
await extractPatch(909, 588, 1309, 686, 'r6_east.png');

// Row 7 full (CMP 0-1309, 686-784) → SVG x=0, y=675, w=1200, h=97
await extractPatch(0, 686, 1309, 784, 'r7_full.png');

// Row 8 full (CMP 0-1309, 784-875) → SVG x=0, y=771, w=1200, h=89
await extractPatch(0, 784, 1309, 875, 'r8_full.png');

// Row 4 mid-full (full row 4: CMP 0-1309, 392-490) → SVG x=0, y=387, w=1200, h=96
// (covers everything in row 4, replacing west+mid+east)
await extractPatch(0, 392, 1309, 490, 'r4_full.png');

// Row 5 full (CMP 0-1309, 490-588) → SVG x=0, y=482, w=1200, h=97
await extractPatch(0, 490, 1309, 588, 'r5_full.png');

// Row 6 full (CMP 0-1309, 588-686) → SVG x=0, y=579, w=1200, h=96
await extractPatch(0, 588, 1309, 686, 'r6_full.png');

await browser.close();
console.log('Done');
