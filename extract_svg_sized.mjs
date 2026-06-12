// Extract patches at EXACT SVG dimensions to minimize rendering interpolation.
// Single upscale (SVG→CMP ×1.091) instead of double-scale (CMP→SVG→CMP).
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

// Extract from CMP region and save at dstW×dstH (SVG element size)
async function extractSVG(cmpX0, cmpY0, cmpX1, cmpY1, dstW, dstH, filename) {
  const srcW = cmpX1 - cmpX0, srcH = cmpY1 - cmpY0;
  const dataUrl = await page.evaluate(({ x0, y0, sw, sh, dw, dh }) => {
    const c2 = document.createElement('canvas');
    c2.width = dw; c2.height = dh;
    c2.getContext('2d').drawImage(document.getElementById('c'), x0, y0, sw, sh, 0, 0, dw, dh);
    return c2.toDataURL('image/png');
  }, { x0: cmpX0, y0: cmpY0, sw: srcW, sh: srcH, dw: dstW, dh: dstH });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(`c:/Users/User/airport-simulator/public/${filename}`, buf);
  console.log(`${filename}: CMP(${srcW}×${srcH}) → SVG(${dstW}×${dstH}) = ${buf.length} bytes`);
}

// All patches at SVG dimensions
// (dstW = SVG width, dstH = SVG height from element attributes)
await extractSVG(0,    0,   1309,  98,  1200,  96, 'r0_full_svg.png');
await extractSVG(0,   98,  1309, 196,  1200,  97, 'r1_full_svg.png');
await extractSVG(0,  196,  1309, 294,  1200,  96, 'r2_full_svg.png');
await extractSVG(0,  294,   808, 392,   741,  96, 'r3_west_svg.png');
await extractSVG(808, 294,  1309, 392,   459,  96, 'vaeco_bg_svg2.png');
await extractSVG(0,  392,  1309, 490,  1200,  96, 'r4_full_svg.png');
await extractSVG(0,  490,  1309, 588,  1200,  97, 'r5_full_svg.png');
await extractSVG(0,  588,  1309, 686,  1200,  96, 'r6_full_svg.png');
await extractSVG(0,  686,  1309, 784,  1200,  96, 'r7_full_svg.png');
await extractSVG(0,  784,  1309, 875,  1200,  89, 'r8_full_svg.png');

await browser.close();
console.log('Done — all patches at SVG dimensions');
