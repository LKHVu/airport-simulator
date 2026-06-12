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

        // Sample specific rows in the y=196-293 band at every 10px x step
        function rowScan(y, step=10) {
          const pts = [];
          for (let x = 0; x < W; x += step) {
            const i = (y * W + x) * 4;
            const diff = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            pts.push({ x, ref: [refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our: [ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff });
          }
          return pts;
        }

        // Col scan at specific x
        function colScan(x, y0, y1, step=5) {
          const pts = [];
          for (let y = y0; y <= y1; y += step) {
            const i = (y * W + x) * 4;
            const diff = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            pts.push({ y, ref: [refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our: [ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff });
          }
          return pts;
        }

        const row200 = rowScan(200, 20);
        const row230 = rowScan(230, 20);
        const row260 = rowScan(260, 20);
        // Col scan from top to bottom at x=600 (center)
        const col600 = colScan(600, 50, 350, 5);
        // Col scan at x=200
        const col200 = colScan(200, 50, 350, 5);

        resolve({ row200, row230, row260, col600, col200 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

for (const [label, data] of [
  ['cmp y=200 (SVG y≈197)', result.row200],
  ['cmp y=230 (SVG y≈226)', result.row230],
  ['cmp y=260 (SVG y≈256)', result.row260],
]) {
  console.log(`\nRow scan ${label}:`);
  let wrongStart = null, wrongColor = null;
  for (const p of data) {
    if (p.diff > 20) {
      if (wrongStart === null) wrongStart = p.x;
      wrongColor = p.ref;
    } else if (wrongStart !== null) {
      const svgX0 = Math.round(wrongStart/1.091), svgX1 = Math.round(p.x/1.091);
      console.log(`  wrong x=${wrongStart}-${p.x-20}(svgX≈${svgX0}-${svgX1}) REF≈${fmt(wrongColor)}`);
      wrongStart = null;
    }
  }
  if (wrongStart !== null) console.log(`  wrong x=${wrongStart}-${W}(svgX≈${Math.round(wrongStart/1.091)}-1200) REF≈${fmt(wrongColor)}`);
}

console.log(`\nCol scan at cmp x=600 (SVG x≈550) y=50-350:`);
let lastWrong = false;
for (const p of result.col600) {
  const svgY = Math.round(p.y/1.017);
  if (p.diff > 20) {
    if (!lastWrong) console.log(`  cmpY=${p.y} svgY≈${svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)} START`);
    lastWrong = true;
  } else if (lastWrong) {
    const svgY2 = Math.round(p.y/1.017);
    console.log(`  cmpY=${p.y} svgY≈${svgY2}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)} END`);
    lastWrong = false;
  }
}

console.log(`\nCol scan at cmp x=200 (SVG x≈183) y=50-350:`);
lastWrong = false;
for (const p of result.col200) {
  const svgY = Math.round(p.y/1.017);
  if (p.diff > 20) {
    if (!lastWrong) console.log(`  cmpY=${p.y} svgY≈${svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)} START`);
    lastWrong = true;
  } else if (lastWrong) {
    const svgY2 = Math.round(p.y/1.017);
    console.log(`  cmpY=${p.y} svgY≈${svgY2}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)} END`);
    lastWrong = false;
  }
}

await browser.close();
