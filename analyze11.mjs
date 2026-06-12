import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
const ourData = 'data:image/png;base64,' + readFileSync('d:/right_output/our_map_svg.png').toString('base64');
const W = 1309, H = 875;
await page.setViewportSize({ width: W, height: H });
await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);

const result = await page.evaluate(({ ourData, W, H }) => {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.getElementById('c');
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H);

      // Sample a full column at x=600 from y=60 to y=200
      const col600 = [];
      for (let y = 60; y <= 200; y++) {
        const i = (y * W + 600) * 4;
        col600.push({ y, r: px.data[i], g: px.data[i+1], b: px.data[i+2] });
      }

      // Sample a full column at x=660 from y=60 to y=200 (NS1 line position)
      const col660 = [];
      for (let y = 60; y <= 200; y++) {
        const i = (y * W + 660) * 4;
        col660.push({ y, r: px.data[i], g: px.data[i+1], b: px.data[i+2] });
      }

      // Row scan at y=90 to find grey features
      const row90 = [];
      for (let x = 0; x < W; x += 5) {
        const i = (90 * W + x) * 4;
        if (px.data[i] < 240 || px.data[i+1] < 240 || px.data[i+2] < 240) {
          row90.push({ x, r: px.data[i], g: px.data[i+1], b: px.data[i+2] });
        }
      }

      resolve({ col600, col660, row90 });
    };
    img.src = ourData;
  });
}, { ourData, W, H });

const fmt = (r,g,b) => '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');

console.log(`\nOUR column at x=600 from y=60-200 (only non-white shown):`);
for (const p of result.col600) {
  if (p.r < 235 || p.g < 235 || p.b < 235) {
    const svgY = Math.round(p.y/1.017);
    console.log(`  y=${p.y} svgY≈${svgY}: OUR:${fmt(p.r,p.g,p.b)}`);
  }
}

console.log(`\nOUR column at x=660 from y=60-200 (only non-white shown):`);
for (const p of result.col660) {
  if (p.r < 235 || p.g < 235 || p.b < 235) {
    const svgY = Math.round(p.y/1.017);
    console.log(`  y=${p.y} svgY≈${svgY}: OUR:${fmt(p.r,p.g,p.b)}`);
  }
}

console.log(`\nOUR row at y=90 (non-white pixels, step=5):`);
for (const p of result.row90) {
  const svgX = Math.round(p.x/1.091);
  console.log(`  x=${p.x} svgX≈${svgX}: OUR:${fmt(p.r,p.g,p.b)}`);
}

await browser.close();
