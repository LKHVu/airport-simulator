import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
const refData = 'data:image/jpeg;base64,' + readFileSync('d:/right_output/TSN.jpg').toString('base64');
const ourData = 'data:image/png;base64,' + readFileSync('d:/right_output/our_map_svg.png').toString('base64');
const W = 1309, H = 875;
await page.setViewportSize({ width: W, height: H });
await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);

const result = await page.evaluate(({ refData, ourData, W, H }) => {
  return new Promise(resolve => {
    const refImg = new Image(), ourImg = new Image();
    refImg.onload = () => {
      ourImg.onload = () => {
        const c = document.getElementById('c');
        const ctx = c.getContext('2d');
        ctx.drawImage(refImg, 0, 0, W, H);
        const refPx = ctx.getImageData(0, 0, W, H);
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(ourImg, 0, 0, W, H);
        const ourPx = ctx.getImageData(0, 0, W, H);

        // Sample individual pixel columns at y=510 (center of row5)
        // to see exact per-pixel colors across x
        const y = 510;
        const pixelSamples = [];
        for (let x = 850; x <= 1250; x += 10) {
          const i = (y * W + x) * 4;
          pixelSamples.push({
            x, y,
            ref: [refPx.data[i], refPx.data[i+1], refPx.data[i+2]],
            our: [ourPx.data[i], ourPx.data[i+1], ourPx.data[i+2]],
          });
        }

        // Also sample at y=430 (within VAECO)
        const y2 = 430;
        const pixelSamples2 = [];
        for (let x = 850; x <= 1250; x += 10) {
          const i = (y2 * W + x) * 4;
          pixelSamples2.push({
            x, y: y2,
            ref: [refPx.data[i], refPx.data[i+1], refPx.data[i+2]],
            our: [ourPx.data[i], ourPx.data[i+1], ourPx.data[i+2]],
          });
        }

        // Sample at y=100 (infield area)
        const y3 = 100;
        const pixelSamples3 = [];
        for (let x = 50; x <= 1250; x += 50) {
          const i = (y3 * W + x) * 4;
          pixelSamples3.push({
            x, y: y3,
            ref: [refPx.data[i], refPx.data[i+1], refPx.data[i+2]],
            our: [ourPx.data[i], ourPx.data[i+1], ourPx.data[i+2]],
          });
        }

        resolve({ pixelSamples, pixelSamples2, pixelSamples3 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log(`\nPixel row at comparison y=510 (SVG y≈501) across x=850-1250:`);
for (const p of result.pixelSamples) {
  const svgX = Math.round(p.x / 1.091);
  const diff = p.ref.reduce((s,v,i)=>s+Math.abs(v-p.our[i]),0)/3;
  console.log(`  cmpX=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${diff.toFixed(0)}`);
}

console.log(`\nPixel row at comparison y=430 (SVG y≈423) across x=850-1250 (VAECO zone):`);
for (const p of result.pixelSamples2) {
  const svgX = Math.round(p.x / 1.091);
  const diff = p.ref.reduce((s,v,i)=>s+Math.abs(v-p.our[i]),0)/3;
  console.log(`  cmpX=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${diff.toFixed(0)}`);
}

console.log(`\nPixel row at comparison y=100 (SVG y≈98) across x=50-1250 (infield):`);
for (const p of result.pixelSamples3) {
  const svgX = Math.round(p.x / 1.091);
  const diff = p.ref.reduce((s,v,i)=>s+Math.abs(v-p.our[i]),0)/3;
  console.log(`  cmpX=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${diff.toFixed(0)}`);
}

await browser.close();
