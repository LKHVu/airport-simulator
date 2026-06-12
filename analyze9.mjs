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
            pct: Math.round(wrong*100/cnt), total: cnt,
          };
        }

        // Row scan to see ref color at key rows in the south zone
        function rowScan(y, x0, x1, step) {
          const pts = [];
          for (let x=x0; x<=x1; x+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            pts.push({ x, ref: [refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our: [ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff });
          }
          return pts;
        }

        // r4c4-6 zone
        const r4c4 = sampleCell(404, 392, 505, 490);
        const r4c5 = sampleCell(505, 392, 606, 490);
        const r4c6 = sampleCell(606, 392, 707, 490);
        const r4c9 = sampleCell(909, 392, 1010, 490);

        // r5-7 cols 6-7
        const r5c6 = sampleCell(606, 490, 707, 588);
        const r5c7 = sampleCell(707, 490, 808, 588);
        const r6c6 = sampleCell(606, 588, 707, 686);
        const r6c7 = sampleCell(707, 588, 808, 686);
        const r7c6 = sampleCell(606, 686, 707, 784);
        const r7c7 = sampleCell(707, 686, 808, 784);

        // Row scans
        const row440 = rowScan(440, 300, 900, 20); // center zone y=440 (apron south)
        const row540 = rowScan(540, 300, 900, 20); // y=540
        const row640 = rowScan(640, 300, 900, 20); // y=640

        resolve({ r4c4, r4c5, r4c6, r4c9, r5c6, r5c7, r6c6, r6c7, r7c6, r7c7, row440, row540, row640 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
const cell = (label, r) => console.log(`  ${label.padEnd(12)}: REF:${fmt(r.ref)} OUR:${fmt(r.our)} diff:${Math.round(r.ref.reduce((s,v,i)=>s+Math.abs(v-r.our[i]),0)/3)} wrong:${r.pct}% (${r.total}px)`);

console.log('\nSouth-center cells (cmp y=392-490):');
cell('r4c4(x=404)', result.r4c4);
cell('r4c5(x=505)', result.r4c5);
cell('r4c6(x=606)', result.r4c6);
cell('r4c9(x=909)', result.r4c9);

console.log('\nFar-south cells:');
cell('r5c6', result.r5c6);
cell('r5c7', result.r5c7);
cell('r6c6', result.r6c6);
cell('r6c7', result.r6c7);
cell('r7c6', result.r7c6);
cell('r7c7', result.r7c7);

console.log('\nRow scan at cmp y=440 (SVG y≈433) x=300-900:');
for (const p of result.row440) {
  const svgX = Math.round(p.x/1.091), svgY = Math.round(440/1.017);
  if (p.diff > 20) console.log(`  x=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)}`);
}

console.log('\nRow scan at cmp y=540 (SVG y≈531) x=300-900:');
for (const p of result.row540) {
  const svgX = Math.round(p.x/1.091);
  if (p.diff > 20) console.log(`  x=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)}`);
}

console.log('\nRow scan at cmp y=640 (SVG y≈629) x=300-900:');
for (const p of result.row640) {
  const svgX = Math.round(p.x/1.091);
  if (p.diff > 20) console.log(`  x=${p.x} svgX≈${svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)}`);
}

await browser.close();
