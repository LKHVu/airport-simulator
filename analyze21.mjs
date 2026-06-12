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

        // r2 sub-zone detail
        const r2subs = {};
        for (let c=0; c<13; c++) {
          r2subs[`c${c}_top`] = sampleCell(c*101, 196, (c+1)*101, 225);   // y=196-225 CMP
          r2subs[`c${c}_mid`] = sampleCell(c*101, 225, (c+1)*101, 256);   // y=225-256 CMP (taxiway+grey band)
          r2subs[`c${c}_bot`] = sampleCell(c*101, 256, (c+1)*101, 294);   // y=256-294 CMP
        }

        // Row scans to understand key zones
        const row230 = rowScan(230, 0, W);    // dark taxiway zone
        const row218 = rowScan(218, 0, W);    // above taxiway
        const row252 = rowScan(252, 0, W);    // grey band bottom
        const row260 = rowScan(260, 0, W);    // below grey band, above apron

        // r1c3 (22% — bright area near runway) detail
        const r1c3 = sampleCell(303, 98, 404, 196);
        const r1c3_row138 = rowScan(138, 303, 404);   // inside r1c3
        const r1c3_row158 = rowScan(158, 303, 404);

        resolve({ grid, r2subs, row230, row218, row252, row260, r1c3, r1c3_row138, r1c3_row158 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Full grid wrong% (top 30, sorted by wrong count) ===');
const sorted = Object.entries(result.grid).sort((a,b)=>b[1].wrong-a[1].wrong);
for (const [k,v] of sorted.slice(0,30)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong}/${v.cnt})`);
}

console.log('\n=== r2 sub-zone: top (y=196-225), mid (y=225-256), bot (y=256-294) ===');
for (let c=0; c<13; c++) {
  const t=result.r2subs[`c${c}_top`], m=result.r2subs[`c${c}_mid`], b=result.r2subs[`c${c}_bot`];
  if (t.pct>5||m.pct>5||b.pct>5) {
    console.log(`  c${c}: top=${t.pct}%(${t.wrong}) mid=${m.pct}%(${m.wrong}) bot=${b.pct}%(${b.wrong})`);
    console.log(`       top REF:${fmt(t.refAvg)} OUR:${fmt(t.ourAvg)} | mid REF:${fmt(m.refAvg)} OUR:${fmt(m.ourAvg)} | bot REF:${fmt(b.refAvg)} OUR:${fmt(b.ourAvg)}`);
  }
}

console.log('\n=== Row y=230 (taxiway zone) wrong ===');
for (const p of result.row230) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=218 (above taxiway) wrong ===');
for (const p of result.row218) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=252 (grey band bottom, CMP y=252=SVG y≈248) wrong ===');
for (const p of result.row252) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=260 (below grey band, SVG y≈256) wrong ===');
for (const p of result.row260) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r1c3 (22%, 2210px wrong) detail ===');
console.log(`  cell: REF:${fmt(result.r1c3.refAvg)} OUR:${fmt(result.r1c3.ourAvg)} ${result.r1c3.pct}%`);
console.log('  row y=138 wrong:');
for (const p of result.r1c3_row138) console.log(`    x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);
console.log('  row y=158 wrong:');
for (const p of result.r1c3_row158) console.log(`    x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

await browser.close();
