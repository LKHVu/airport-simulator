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

        // Sample at comparison x=1050 (center of r5c10) at many y values
        const colSamples = [];
        for (let y = 440; y <= 600; y += 5) {
          const x = 1050;
          const i = (y * W + x) * 4;
          const diff = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          colSamples.push({
            x, y,
            ref: [refPx.data[i], refPx.data[i+1], refPx.data[i+2]],
            our: [ourPx.data[i], ourPx.data[i+1], ourPx.data[i+2]],
            diff,
          });
        }

        // Sample at comparison y=530 across x=850-1200 (row of r5c10)
        const rowSamples = [];
        for (let x = 850; x <= 1200; x += 10) {
          const y = 530;
          const i = (y * W + x) * 4;
          const diff = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          rowSamples.push({
            x, y,
            ref: [refPx.data[i], refPx.data[i+1], refPx.data[i+2]],
            our: [ourPx.data[i], ourPx.data[i+1], ourPx.data[i+2]],
            diff,
          });
        }

        // Detailed cell analysis of r5c10 (comparison x=1010-1110, y=490-587)
        const cellX0=1010, cellY0=490, cellX1=1111, cellY1=588;
        let wrongBefore=0, wrongAfter=0, total=0;
        for (let y=cellY0; y<cellY1; y++) {
          for (let x=cellX0; x<cellX1; x++) {
            const i=(y*W+x)*4;
            const dr=Math.abs(refPx.data[i]-ourPx.data[i]);
            const dg=Math.abs(refPx.data[i+1]-ourPx.data[i+1]);
            const db=Math.abs(refPx.data[i+2]-ourPx.data[i+2]);
            if ((dr+dg+db)/3>20) wrongAfter++;
            total++;
          }
        }

        resolve({ colSamples, rowSamples, wrongAfter, total });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log(`\nColumn x=1050 at various y (center of r5c10):`);
for (const p of result.colSamples) {
  const svgY = Math.round(p.y / 1.017);
  const mark = p.diff > 20 ? '✗' : '✓';
  console.log(`  cmpY=${p.y} svgY≈${svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)} ${mark}`);
}

console.log(`\nRow y=530 across x=850-1200:`);
for (const p of result.rowSamples) {
  const svgX = Math.round(p.x / 1.091);
  const mark = p.diff > 20 ? '✗' : '✓';
  if (p.diff > 5) console.log(`  cmpX=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)} ${mark}`);
}

console.log(`\nr5c10 cell: ${result.wrongAfter}/${result.total} wrong = ${(result.wrongAfter*100/result.total).toFixed(1)}%`);

await browser.close();
