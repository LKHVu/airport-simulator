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

        // Full-width row scan at y=96 (SVG y≈94) — infield black band
        const row96ref = [];
        const row96our = [];
        for (let x = 0; x < W; x += 5) {
          const y = 96;
          const ri = (y * W + x) * 4;
          row96ref.push([refPx.data[ri], refPx.data[ri+1], refPx.data[ri+2]]);
          row96our.push([ourPx.data[ri], ourPx.data[ri+1], ourPx.data[ri+2]]);
        }

        // Row scan at y=103 to confirm band
        const row103ref = [];
        for (let x = 0; x < W; x += 5) {
          const ri = (103 * W + x) * 4;
          row103ref.push([refPx.data[ri], refPx.data[ri+1], refPx.data[ri+2]]);
        }

        // Row scan at y=120 (just above infield center)
        const row120 = [];
        for (let x = 0; x < W; x += 10) {
          const y = 120;
          const ri = (y * W + x) * 4;
          const oi = (y * W + x) * 4;
          const diff = (Math.abs(refPx.data[ri]-ourPx.data[oi])+Math.abs(refPx.data[ri+1]-ourPx.data[oi+1])+Math.abs(refPx.data[ri+2]-ourPx.data[oi+2]))/3;
          if (diff > 20) row120.push({x, ref:[refPx.data[ri],refPx.data[ri+1],refPx.data[ri+2]], our:[ourPx.data[oi],ourPx.data[oi+1],ourPx.data[oi+2]]});
        }

        // Vertical scan at x=600 (SVG x≈550), full infield y=60-200
        const col600full = [];
        for (let y = 60; y <= 200; y++) {
          const ri = (y * W + 600) * 4;
          const oi = (y * W + 600) * 4;
          const diff = (Math.abs(refPx.data[ri]-ourPx.data[oi])+Math.abs(refPx.data[ri+1]-ourPx.data[oi+1])+Math.abs(refPx.data[ri+2]-ourPx.data[oi+2]))/3;
          if (diff > 20) col600full.push({y, ref:[refPx.data[ri],refPx.data[ri+1],refPx.data[ri+2]], our:[ourPx.data[oi],ourPx.data[oi+1],ourPx.data[oi+2]]});
        }

        // Row scan at y=150 (lower runway zone)
        const row150 = [];
        for (let x = 0; x < W; x += 10) {
          const y = 150;
          const ri = (y * W + x) * 4;
          const oi = (y * W + x) * 4;
          const diff = (Math.abs(refPx.data[ri]-ourPx.data[oi])+Math.abs(refPx.data[ri+1]-ourPx.data[oi+1])+Math.abs(refPx.data[ri+2]-ourPx.data[oi+2]))/3;
          if (diff > 20) row150.push({x, ref:[refPx.data[ri],refPx.data[ri+1],refPx.data[ri+2]], our:[ourPx.data[oi],ourPx.data[oi+1],ourPx.data[oi+2]]});
        }

        // Row scan at y=175 (between runways, below lower runway)
        const row175 = [];
        for (let x = 0; x < W; x += 10) {
          const y = 175;
          const ri = (y * W + x) * 4;
          const oi = (y * W + x) * 4;
          const diff = (Math.abs(refPx.data[ri]-ourPx.data[oi])+Math.abs(refPx.data[ri+1]-ourPx.data[oi+1])+Math.abs(refPx.data[ri+2]-ourPx.data[oi+2]))/3;
          if (diff > 20) row175.push({x, ref:[refPx.data[ri],refPx.data[ri+1],refPx.data[ri+2]], our:[ourPx.data[oi],ourPx.data[oi+1],ourPx.data[oi+2]]});
        }

        // South grey zone: row scan at y=420 and y=460 (SVG y≈413,452)
        function rowScanFull(y) {
          const pts = [];
          for (let x = 0; x < W; x += 10) {
            const ri = (y * W + x) * 4;
            const diff = (Math.abs(refPx.data[ri]-ourPx.data[ri])+Math.abs(refPx.data[ri+1]-ourPx.data[ri+1])+Math.abs(refPx.data[ri+2]-ourPx.data[ri+2]))/3;
            if (diff > 20) pts.push({x, ref:[refPx.data[ri],refPx.data[ri+1],refPx.data[ri+2]], our:[ourPx.data[ri],ourPx.data[ri+1],ourPx.data[ri+2]]});
          }
          return pts;
        }
        const row420 = rowScanFull(420);
        const row460 = rowScanFull(460);
        const row250 = rowScanFull(250);

        resolve({ row96ref, row96our, row103ref, row120, col600full, row150, row175, row420, row460, row250 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

// Show row96 as compact: highlight non-white runs
console.log('\nREF row y=96 (SVG y≈94) — dark regions (non-white, step=5):');
let darkStart = null;
for (let i = 0; i < result.row96ref.length; i++) {
  const [r,g,b] = result.row96ref[i];
  const isDark = r < 200;
  const x = i*5;
  if (isDark && darkStart === null) darkStart = x;
  else if (!isDark && darkStart !== null) {
    const svgX0 = Math.round(darkStart/1.091), svgX1 = Math.round(x/1.091);
    console.log(`  cmpX ${darkStart}-${x-5} (SVG x≈${svgX0}-${svgX1}): REF avg=${Math.round((result.row96ref[Math.round(darkStart/5)][0]+result.row96ref[Math.round(darkStart/5)][1]+result.row96ref[Math.round(darkStart/5)][2])/3)}`);
    darkStart = null;
  }
}
if (darkStart !== null) console.log(`  cmpX ${darkStart}-end`);

console.log('\nREF row y=103 (SVG y≈101) — dark regions (step=5):');
darkStart = null;
for (let i = 0; i < result.row103ref.length; i++) {
  const [r,g,b] = result.row103ref[i];
  const isDark = r < 200;
  const x = i*5;
  if (isDark && darkStart === null) darkStart = x;
  else if (!isDark && darkStart !== null) {
    const svgX0 = Math.round(darkStart/1.091), svgX1 = Math.round(x/1.091);
    console.log(`  cmpX ${darkStart}-${x-5} (SVG x≈${svgX0}-${svgX1})`);
    darkStart = null;
  }
}
if (darkStart !== null) console.log(`  cmpX ${darkStart}-end`);

console.log('\nWrong at cmp y=120 (SVG y≈118):');
for (const p of result.row120) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\nWrong at cmp y=150 (SVG y≈147):');
for (const p of result.row150) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\nWrong at cmp y=175 (SVG y≈172):');
for (const p of result.row175) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\nWrong at col x=600 y=60-200 (SVG x≈550):');
for (const p of result.col600full) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\nWrong at cmp y=250 (SVG y≈246):');
for (const p of result.row250) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\nWrong at cmp y=420 (SVG y≈413):');
for (const p of result.row420) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\nWrong at cmp y=460 (SVG y≈452):');
for (const p of result.row460) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

await browser.close();
