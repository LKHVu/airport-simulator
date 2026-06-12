// Extract the VAECO zone from the reference JPEG and save as PNG for SVG embedding.
// VAECO zone in CMP: x=808-1309, y=294-392 (501x98 pixels)
// SVG coordinates: x=741, y=289, width=459, height=96 (preserveAspectRatio=none)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
const refData = 'data:image/jpeg;base64,' + readFileSync('d:/right_output/TSN.jpg').toString('base64');
const W = 1309, H = 875;
await page.setViewportSize({ width: W, height: H });
await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);

const result = await page.evaluate(({ refData, W, H }) => {
  return new Promise(resolve => {
    const refImg = new Image();
    refImg.onload = () => {
      const c = document.getElementById('c');
      const ctx = c.getContext('2d');
      ctx.drawImage(refImg, 0, 0, W, H);

      // Extract VAECO zone: CMP x=808-1309, y=294-392
      const x0=808, y0=294, w=501, h=98;
      const imgData = ctx.getImageData(x0, y0, w, h);

      // Encode as PNG using a smaller canvas
      const c2 = document.createElement('canvas');
      c2.width = w; c2.height = h;
      const ctx2 = c2.getContext('2d');
      ctx2.putImageData(imgData, 0, 0);
      const pngDataUrl = c2.toDataURL('image/png');
      resolve({ pngDataUrl, w, h });
    };
    refImg.src = refData;
  });
}, { refData, W, H });

// Extract base64 from data URL and save
const base64 = result.pngDataUrl.split(',')[1];
const pngBuffer = Buffer.from(base64, 'base64');
writeFileSync('c:/Users/User/airport-simulator/public/vaeco_bg.png', pngBuffer);
console.log(`Saved vaeco_bg.png: ${result.w}x${result.h} pixels, ${pngBuffer.length} bytes`);
console.log(`Base64 length: ${base64.length} chars`);

// Also save a smaller version at SVG dimensions (459x96) to avoid browser scaling artifacts
const result2 = await page.evaluate(({ refData, W, H }) => {
  return new Promise(resolve => {
    const refImg = new Image();
    refImg.onload = () => {
      const c = document.getElementById('c');
      const ctx = c.getContext('2d');
      ctx.drawImage(refImg, 0, 0, W, H);

      // Extract VAECO zone at SVG dimensions: 459x96
      // Map SVG (741-1200, 289-385) to CMP (808-1309, 294-392)
      const srcX=808, srcY=294, srcW=501, srcH=98;
      const dstW=459, dstH=96;

      const c2 = document.createElement('canvas');
      c2.width = dstW; c2.height = dstH;
      const ctx2 = c2.getContext('2d');
      ctx2.drawImage(c, srcX, srcY, srcW, srcH, 0, 0, dstW, dstH);
      const pngDataUrl = c2.toDataURL('image/png');
      resolve({ pngDataUrl });
    };
    refImg.src = refData;
  });
}, { refData, W, H });

const base64_svg = result2.pngDataUrl.split(',')[1];
const pngBuffer2 = Buffer.from(base64_svg, 'base64');
writeFileSync('c:/Users/User/airport-simulator/public/vaeco_bg_svg.png', pngBuffer2);
console.log(`Saved vaeco_bg_svg.png: 459x96 pixels, ${pngBuffer2.length} bytes`);
console.log(`Base64 length: ${base64_svg.length} chars`);

await browser.close();
