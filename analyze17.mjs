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

        const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

        // South-center zone y=392-686 (r4-r7), x=505-808 (c5-c7)
        const southCtr = {};
        for (let r=4; r<=7; r++) {
          for (let c=5; c<=8; c++) {
            southCtr[`r${r}c${c}`] = sampleCell(c*101, r*98, (c+1)*101, (r+1)*98);
          }
        }

        // Scan the south area at various x positions
        function colScan(x, y0, y1, step=5) {
          const pts = [];
          for (let y=y0; y<=y1; y+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 15) pts.push({ y, svgY: Math.round(y/1.017), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
          }
          return pts;
        }

        // Sample south area from SVG y≈385-680, at x=650 (SVG≈596), x=720 (SVG≈660), x=760 (SVG≈697)
        const col650 = colScan(650, 392, 686);
        const col720 = colScan(720, 392, 686);
        const col760 = colScan(760, 392, 686);

        // Row scans at y=500, 550, 600 (SVG y≈492, 541, 590)
        function rowScan(y, x0, x1, step=5) {
          const pts = [];
          for (let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 20) pts.push({ x, svgX: Math.round(x/1.091), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]] });
          }
          return pts;
        }
        const row500 = rowScan(500, 505, 808);
        const row550 = rowScan(550, 505, 808);
        const row620 = rowScan(620, 505, 808);

        resolve({ southCtr, col650, col720, col760, row500, row550, row620 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== South-center grid (REF avg / OUR avg / wrong%) ===');
for (const [k, v] of Object.entries(result.southCtr)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}%`);
}

console.log('\n=== Col x=650 (SVG x≈596), y=392-686 wrong (diff>15) ===');
for (const p of result.col650) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Col x=720 (SVG x≈660), y=392-686 wrong (diff>15) ===');
for (const p of result.col720) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Col x=760 (SVG x≈697), y=392-686 wrong (diff>15) ===');
for (const p of result.col760) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=500 (SVG y≈492), x=505-808 wrong ===');
for (const p of result.row500) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== Row y=550 (SVG y≈541), x=505-808 wrong ===');
for (const p of result.row550) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== Row y=620 (SVG y≈610), x=505-808 wrong ===');
for (const p of result.row620) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.ou)}`);

await browser.close();
