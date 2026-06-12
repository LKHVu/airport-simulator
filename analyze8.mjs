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

        // Row at y=570 (center of dark grey zone at x=1050)
        const row570 = [];
        for (let x = 850; x <= 1200; x += 5) {
          const y = 570;
          const i = (y * W + x) * 4;
          const diff = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          row570.push({ x, ref: [refPx.data[i], refPx.data[i+1], refPx.data[i+2]], our: [ourPx.data[i], ourPx.data[i+1], ourPx.data[i+2]], diff });
        }

        // Row at y=560
        const row560 = [];
        for (let x = 850; x <= 1200; x += 5) {
          const y = 560;
          const i = (y * W + x) * 4;
          const diff = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          row560.push({ x, ref: [refPx.data[i], refPx.data[i+1], refPx.data[i+2]], our: [ourPx.data[i], ourPx.data[i+1], ourPx.data[i+2]], diff });
        }

        // Also: r5c9 detail at y=545-565 across x=900-1020
        const col925 = [];
        for (let y = 480; y <= 620; y += 5) {
          const x = 925; // SVG x≈848
          const i = (y * W + x) * 4;
          const diff = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          col925.push({ y, ref: [refPx.data[i], refPx.data[i+1], refPx.data[i+2]], our: [ourPx.data[i], ourPx.data[i+1], ourPx.data[i+2]], diff });
        }

        resolve({ row570, row560, col925 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log(`\nRow at cmp y=570 (SVG y≈560) across x=850-1200:`);
for (const p of result.row570) {
  const svgX = Math.round(p.x / 1.091);
  if (p.diff > 15) console.log(`  cmpX=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)}`);
}

console.log(`\nRow at cmp y=560 (SVG y≈550) across x=850-1200:`);
for (const p of result.row560) {
  const svgX = Math.round(p.x / 1.091);
  if (p.diff > 15) console.log(`  cmpX=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)}`);
}

console.log(`\nColumn at cmp x=925 (SVG x≈848) from y=480-620:`);
for (const p of result.col925) {
  const svgY = Math.round(p.y / 1.017);
  if (p.diff > 15) console.log(`  cmpY=${p.y} svgY≈${svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)}`);
}

await browser.close();
