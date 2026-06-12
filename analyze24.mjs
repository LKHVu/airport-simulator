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
          return { refAvg:[Math.round(rR/cnt),Math.round(rG/cnt),Math.round(rB/cnt)], ourAvg:[Math.round(oR/cnt),Math.round(oG/cnt),Math.round(oB/cnt)], pct:Math.round(wrong*100/cnt), wrong, cnt };
        }

        function rowScan(y, x0, x1, step=3) {
          const pts = [];
          for (let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 20) pts.push({ x, svgX: Math.round(x/1.091), svgY: 'N/A', ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
          }
          return pts;
        }

        function colScan(x, y0, y1, step=3) {
          const pts = [];
          for (let y=y0; y<y1; y+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 20) pts.push({ y, svgY: Math.round(y/1.017), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
          }
          return pts;
        }

        const grid = {};
        for (let r=0; r<9; r++) for (let c=0; c<13; c++) grid[`r${r}c${c}`] = sampleCell(c*101, r*98, (c+1)*101, (r+1)*98);

        // r1 analysis (CMP y=98-196) top wrong cells
        const r1_detail = {};
        for (let c=0; c<13; c++) r1_detail[`c${c}`] = sampleCell(c*101, 98, (c+1)*101, 196);

        // r0 analysis
        const r0_detail = {};
        for (let c=0; c<13; c++) r0_detail[`c${c}`] = sampleCell(c*101, 0, (c+1)*101, 98);

        // Row scans at key y values
        const row80  = rowScan(80, 0, W);
        const row100 = rowScan(100, 0, W);
        const row120 = rowScan(120, 0, W);
        const row128 = rowScan(128, 0, W);  // was the runway label rect zone
        const row140 = rowScan(140, 0, W);  // just above south runway

        // Col scan on VAECO area
        const vaeco_c910 = colScan(950, 294, 490);
        const vaeco_c1010 = colScan(1010, 294, 490);

        resolve({ grid, r1_detail, r0_detail, row80, row100, row120, row128, row140, vaeco_c910, vaeco_c1010 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Grid top 25 wrong cells ===');
const sorted = Object.entries(result.grid).sort((a,b)=>b[1].wrong-a[1].wrong);
for (const [k,v] of sorted.slice(0,25)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong}/${v.cnt})`);
}

console.log('\n=== r0 per-column ===');
for (let c=0; c<13; c++) {
  const v=result.r0_detail[`c${c}`];
  if(v.pct>10) console.log(`  r0c${c}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong})`);
}

console.log('\n=== r1 per-column ===');
for (let c=0; c<13; c++) {
  const v=result.r1_detail[`c${c}`];
  if(v.pct>10) console.log(`  r1c${c}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong})`);
}

console.log('\n=== Row y=80 wrong ===');
for (const p of result.row80) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=100 wrong ===');
for (const p of result.row100) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=120 wrong ===');
for (const p of result.row120) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=128 (was runway label zone) wrong ===');
for (const p of result.row128) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=140 (just above south runway) wrong ===');
for (const p of result.row140) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== VAECO col x=950, y=294-490 wrong ===');
for (const p of result.vaeco_c910) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== VAECO col x=1010, y=294-490 wrong ===');
for (const p of result.vaeco_c1010) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

await browser.close();
