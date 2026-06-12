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

        const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

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
            if (diff > 20) pts.push({ x, svgX: Math.round(x/1.091), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
          }
          return pts;
        }

        // Full grid heatmap 13×9
        const grid = {};
        for (let r=0; r<9; r++) {
          for (let c=0; c<13; c++) {
            grid[`r${r}c${c}`] = sampleCell(c*101, r*98, (c+1)*101, (r+1)*98);
          }
        }

        // Top rows (r0-r1)
        const row80  = rowScan(80,  0, W);   // inside r0-r1 boundary
        const row130 = rowScan(130, 0, W);   // inside r1
        const row165 = rowScan(165, 0, W);   // lower r1

        // r2 current state
        const row230 = rowScan(230, 0, W);   // dark taxiway
        const row260 = rowScan(260, 0, W);   // below taxiway
        const row275 = rowScan(275, 0, W);   // near apron start

        // r2 sub-zones per column
        const r2_detail = {};
        for (let c=0; c<13; c++) {
          r2_detail[`c${c}`] = {
            top: sampleCell(c*101, 196, (c+1)*101, 225),
            dark: sampleCell(c*101, 225, (c+1)*101, 245),
            gap: sampleCell(c*101, 245, (c+1)*101, 270),
          };
        }

        resolve({ grid, r2_detail, row80, row130, row165, row230, row260, row275 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Full grid wrong% (top 25, sorted by wrong count) ===');
const sorted = Object.entries(result.grid).sort((a,b)=>b[1].wrong-a[1].wrong);
for (const [k,v] of sorted.slice(0,25)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong}/${v.cnt})`);
}

console.log('\n=== r2 sub-zones (top=196-225, dark=225-245, gap=245-270 CMP) ===');
for (let c=0; c<13; c++) {
  const {top,dark,gap} = result.r2_detail[`c${c}`];
  console.log(`  c${c}: top=${top.pct}%(${top.wrong}) dark=${dark.pct}%(${dark.wrong}) gap=${gap.pct}%(${gap.wrong})`);
  console.log(`       top REF:${fmt(top.refAvg)} OUR:${fmt(top.ourAvg)} | dark REF:${fmt(dark.refAvg)} OUR:${fmt(dark.ourAvg)} | gap REF:${fmt(gap.refAvg)} OUR:${fmt(gap.ourAvg)}`);
}

console.log('\n=== Row y=80 (inside r1, SVG y≈79) wrong ===');
for (const p of result.row80) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=130 (inside r1, SVG y≈128) wrong ===');
for (const p of result.row130) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=165 (lower r1, SVG y≈162) wrong ===');
for (const p of result.row165) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=230 (dark taxiway, SVG y≈226) wrong ===');
for (const p of result.row230) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=260 (below taxiway, SVG y≈256) wrong ===');
for (const p of result.row260) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=275 (near apron, SVG y≈270) wrong ===');
for (const p of result.row275) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

await browser.close();
