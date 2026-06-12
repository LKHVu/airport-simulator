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

        function colScan(x, y0, y1, step=3) {
          const pts = [];
          for (let y=y0; y<=y1; y+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 18) pts.push({ y, svgY: Math.round(y/1.017), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
          }
          return pts;
        }

        function rowScan(y, x0, x1, step=3) {
          const pts = [];
          for (let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 18) pts.push({ x, svgX: Math.round(x/1.091), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
          }
          return pts;
        }

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

        // r4c4: SVG x=370-462, y=385-481 → CMP x=404-505, y=392-490
        // Scan multiple columns within r4c4
        const r4c4_col385 = colScan(420, 392, 490);  // CMP x=420, SVG x≈385
        const r4c4_col440 = colScan(480, 392, 490);  // CMP x=480, SVG x≈440

        // r4c6: SVG x=555-648, y=385-481 → CMP x=606-707, y=392-490
        const r4c6_col606 = colScan(620, 392, 490);  // CMP x=620, SVG x≈568
        const r4c6_col660 = colScan(660, 392, 490);  // CMP x=660, SVG x≈605

        // r5c6: SVG x=555-648, y=481-578 → CMP x=606-707, y=490-588
        const r5c6_col606 = colScan(620, 490, 588);
        const r5c6_col660 = colScan(660, 490, 588);

        // r2 mid zone: check the dark taxiway zone y=225-244 (CMP), horizontal scans
        const r2_y230 = rowScan(230, 0, W);  // SVG y≈226 — just inside dark taxiway
        const r2_y238 = rowScan(238, 0, W);  // SVG y≈234 — mid dark zone

        // r2 top zone: check y=216-225 (above dark taxiway)
        const r2_y218 = rowScan(218, 0, W);  // SVG y≈214 — just above taxiway

        // r3c6 (25%): CMP x=606-707, y=294-392 → SVG x=555-648, y=289-385
        const r3c6_col620 = colScan(620, 294, 392);
        const r3c6_col640 = colScan(640, 294, 392);

        // Overall summary of r3-r5 c4-c8
        const r3_r5_summary = {};
        for (let r=3; r<=5; r++) {
          for (let c=4; c<=8; c++) {
            r3_r5_summary[`r${r}c${c}`] = sampleCell(c*101, r*98, (c+1)*101, (r+1)*98);
          }
        }

        resolve({ r4c4_col385, r4c4_col440, r4c6_col606, r4c6_col660, r5c6_col606, r5c6_col660, r2_y230, r2_y238, r2_y218, r3c6_col620, r3c6_col640, r3_r5_summary });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== r4c4 col x=420 (SVG x≈385), y=392-490 wrong (diff>18) ===');
for (const p of result.r4c4_col385) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r4c4 col x=480 (SVG x≈440), y=392-490 wrong (diff>18) ===');
for (const p of result.r4c4_col440) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r4c6 col x=620 (SVG x≈568), y=392-490 wrong (diff>18) ===');
for (const p of result.r4c6_col606) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r4c6 col x=660 (SVG x≈605), y=392-490 wrong (diff>18) ===');
for (const p of result.r4c6_col660) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r5c6 col x=620 (SVG x≈568), y=490-588 wrong (diff>18) ===');
for (const p of result.r5c6_col606) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r5c6 col x=660 (SVG x≈605), y=490-588 wrong (diff>18) ===');
for (const p of result.r5c6_col660) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=230 (SVG y≈226, dark taxiway zone) wrong pixels ===');
for (const p of result.r2_y230) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=238 (SVG y≈234) wrong pixels ===');
for (const p of result.r2_y238) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=218 (SVG y≈214, above taxiway) wrong pixels ===');
for (const p of result.r2_y218) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r3c6 col x=620 (SVG x≈568), y=294-392 wrong ===');
for (const p of result.r3c6_col620) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r3c6 col x=640 (SVG x≈587), y=294-392 wrong ===');
for (const p of result.r3c6_col640) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r3-r5 c4-c8 summary ===');
for (const [k, v] of Object.entries(result.r3_r5_summary)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}%`);
}

await browser.close();
