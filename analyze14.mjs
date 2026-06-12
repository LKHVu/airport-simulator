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

        function sampleCell(x0, y0, x1, y1) {
          let rR=0,rG=0,rB=0,oR=0,oG=0,oB=0,cnt=0,wrong=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              rR+=refPx.data[i]; rG+=refPx.data[i+1]; rB+=refPx.data[i+2];
              oR+=ourPx.data[i]; oG+=ourPx.data[i+1]; oB+=ourPx.data[i+2];
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) wrong++;
              cnt++;
            }
          }
          return {
            ref: [Math.round(rR/cnt),Math.round(rG/cnt),Math.round(rB/cnt)],
            our: [Math.round(oR/cnt),Math.round(oG/cnt),Math.round(oB/cnt)],
            pct: Math.round(wrong*100/cnt), total: cnt, wrong,
          };
        }

        const CW=101, CH=98;
        const grid = [];
        for (let r=0; r<9; r++) {
          const row = [];
          for (let c=0; c<13; c++) {
            row.push(sampleCell(c*CW, r*CH, (c+1)*CW, (r+1)*CH));
          }
          grid.push(row);
        }

        // Targeted scans
        function rowScan(y, step=10) {
          const pts = [];
          for (let x=0; x<W; x+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff>20) pts.push({x, ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]]});
          }
          return pts;
        }

        // Row at y=106 (in the infield black band) — where was GROUND 1 box
        const row106 = rowScan(106, 5);
        // Row at y=118 (below black band) — was GROUND 1 box border here
        const row118 = rowScan(118, 5);
        // Row at y=200 (r2 zone)
        const row200 = rowScan(200, 10);
        // Row y=400 south zone
        const row400 = rowScan(400, 10);
        // Col scans in problem areas
        function colScan(x, y0, y1, step=2) {
          const pts = [];
          for (let y=y0; y<=y1; y+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff>20) pts.push({y, ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]]});
          }
          return pts;
        }
        // Col at x=414 (GROUND 1 box center), y=86-135
        const colGround1 = colScan(414, 86, 135, 1);
        // Col at x=550 (mid infield), y=120-300
        const col550mid = colScan(550, 120, 300, 5);
        // VAECO zone col x=980, y=260-450
        const colVaeco = colScan(980, 260, 450, 3);
        // South zone: col x=420 (SVG x=385), y=360-480
        const colSouth = colScan(420, 360, 480, 3);

        resolve({ grid, row106, row118, row200, row400, colGround1, col550mid, colVaeco, colSouth });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Grid (wrong%) ===');
console.log('       c0   c1   c2   c3   c4   c5   c6   c7   c8   c9  c10  c11  c12');
for (let r=0; r<result.grid.length; r++) {
  const row = result.grid[r];
  const cells = row.map(c => String(c.pct+'%').padStart(4)).join(' ');
  console.log(`r${r}: ${cells}`);
}

console.log('\n=== Wrong at cmp y=106 (SVG y≈104, in black band) — GROUND1 box zone ===');
for (const p of result.row106) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== Wrong at cmp y=118 (SVG y≈116, below black band) ===');
for (const p of result.row118) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== GROUND1 col x=414 y=86-135 (wrong only) ===');
for (const p of result.colGround1) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== Wrong at cmp y=200 (SVG y≈197, r2 zone) ===');
let run = null;
for (const p of result.row200) {
  if (!run) { run = {x: p.x, ref: p.ref, our: p.our}; }
  else if (p.x - run.x > 20) {
    console.log(`  x=${run.x}-${p.x-10} svgX≈${Math.round(run.x/1.091)}-${Math.round((p.x-10)/1.091)}: REF:${fmt(run.ref)} OUR:${fmt(run.our)}`);
    run = {x: p.x, ref: p.ref, our: p.our};
  }
}
if (run) console.log(`  x=${run.x}+ svgX≈${Math.round(run.x/1.091)}+: REF:${fmt(run.ref)} OUR:${fmt(run.our)}`);

console.log('\n=== Col x=550 y=120-300 wrong (SVG x≈504) ===');
for (const p of result.col550mid) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== VAECO col x=980 (SVG x≈898) y=260-450 wrong ===');
for (const p of result.colVaeco) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== South col x=420 (SVG x≈385) y=360-480 wrong ===');
for (const p of result.colSouth) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== Wrong at cmp y=400 (SVG y≈393) ===');
for (const p of result.row400) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

await browser.close();
