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

        function colScan(x, y0, y1, step=3) {
          const pts = [];
          for (let y=y0; y<=y1; y+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 20) pts.push({ y, svgY: Math.round(y/1.017), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
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

        // Row 2 current state
        const r2_y226 = rowScan(230, 0, W);  // SVG y≈226 — dark taxiway zone
        const r2_y214 = rowScan(218, 0, W);  // SVG y≈214 — above taxiway

        // r3c0 (29%): CMP x=0-101, y=294-392
        const r3c0_col30 = colScan(30, 294, 392);
        const r3c0_col60 = colScan(60, 294, 392);
        const r3c0_col90 = colScan(90, 294, 392);

        // r2c0-c2 (still high?): rows 221-244 (SVG)
        const r2_taxiway_detail = {};
        for (let c=0; c<3; c++) {
          r2_taxiway_detail[`c${c}`] = sampleCell(c*101, 225, (c+1)*101, 244);
        }

        // r2 mid zone (y=216-246) per column
        const r2_mid = {};
        for (let c=0; c<13; c++) {
          r2_mid[`c${c}`] = sampleCell(c*101, 216, (c+1)*101, 246);
        }

        // r2 top zone (y=196-216) per column
        const r2_top = {};
        for (let c=0; c<13; c++) {
          r2_top[`c${c}`] = sampleCell(c*101, 196, (c+1)*101, 216);
        }

        // r4c4 dark rect: col x=480 (SVG x≈440), scan y=385-490
        const r4c4_scan = colScan(480, 385, 490);

        // r5c6 col x=660 (SVG x≈605), scan y=490-590
        const r5c6_scan = colScan(660, 490, 590);

        // VAECO zone r3c9-c12 row scan at y=320 (inside VAECO, SVG y≈315)
        const vaeco_y320 = rowScan(320, 909, W);

        resolve({ grid, r2_y226, r2_y214, r3c0_col30, r3c0_col60, r3c0_col90, r2_taxiway_detail, r2_mid, r2_top, r4c4_scan, r5c6_scan, vaeco_y320 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Full grid wrong% (sorted) ===');
const sorted = Object.entries(result.grid).sort((a,b)=>b[1].wrong-a[1].wrong);
for (const [k,v] of sorted.slice(0,30)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong}/${v.cnt})`);
}

console.log('\n=== r2 taxiway zone (CMP y=225-244) c0-c2 ===');
for (const [k,v] of Object.entries(result.r2_taxiway_detail)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong})`);
}

console.log('\n=== r2 mid zone (CMP y=216-246) all cols ===');
for (const [k,v] of Object.entries(result.r2_mid)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong})`);
}

console.log('\n=== r2 top zone (CMP y=196-216) all cols ===');
for (const [k,v] of Object.entries(result.r2_top)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong})`);
}

console.log('\n=== Row y=230 (SVG y≈226, dark taxiway) wrong pixels ===');
for (const p of result.r2_y226) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=218 (SVG y≈214, above taxiway) wrong pixels ===');
for (const p of result.r2_y214) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r3c0 col x=30 (SVG x≈27), y=294-392 ===');
for (const p of result.r3c0_col30) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r3c0 col x=60 (SVG x≈55), y=294-392 ===');
for (const p of result.r3c0_col60) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r3c0 col x=90 (SVG x≈82), y=294-392 ===');
for (const p of result.r3c0_col90) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r4c4 col x=480 (SVG x≈440), y=385-490 wrong ===');
for (const p of result.r4c4_scan) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r5c6 col x=660 (SVG x≈605), y=490-590 wrong ===');
for (const p of result.r5c6_scan) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== VAECO zone row y=320 (SVG y≈315), x=909+ wrong ===');
for (const p of result.vaeco_y320) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

await browser.close();
