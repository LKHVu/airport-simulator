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

        // Divide into 13x9 grid of cells (100px each)
        const COLS = 13, ROWS = 9;
        const CW = Math.ceil(W / COLS), CH = Math.ceil(H / ROWS);
        const cells = [];
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            let diffCount = 0, total = 0;
            const x0 = col * CW, y0 = row * CH;
            const x1 = Math.min(x0 + CW, W), y1 = Math.min(y0 + CH, H);
            for (let y = y0; y < y1; y++) {
              for (let x = x0; x < x1; x++) {
                const i = (y * W + x) * 4;
                const dr = Math.abs(refPx.data[i] - ourPx.data[i]);
                const dg = Math.abs(refPx.data[i+1] - ourPx.data[i+1]);
                const db = Math.abs(refPx.data[i+2] - ourPx.data[i+2]);
                if ((dr + dg + db) / 3 > 20) diffCount++;
                total++;
              }
            }
            cells.push({ row, col, pct: (diffCount * 100 / total).toFixed(0) });
          }
        }

        // Also sample specific key regions in detail
        const keyRegions = [
          { label: 'infield-west',       x:  50, y:  88, w: 80, h: 50 },
          { label: 'infield-center',     x: 600, y:  88, w: 80, h: 50 },
          { label: 'infield-east',       x:1100, y:  88, w: 80, h: 50 },
          { label: 'terminal-center',    x: 636, y: 375, w: 60, h: 60 },
          { label: 'terminal-north',     x: 636, y: 330, w: 60, h: 40 },
          { label: 'terminal-south',     x: 636, y: 440, w: 60, h: 40 },
          { label: 'above-rwy07L',       x: 400, y:  20, w:100, h: 45 },
          { label: 'rwy07L-surface',     x: 400, y:  65, w:100, h: 22 },
          { label: 'rwy07R-surface',     x: 400, y: 148, w:100, h: 22 },
          { label: 'below-rwy07R',       x: 400, y: 175, w:100, h: 40 },
          { label: 'far-east (>1100)',   x:1150, y: 300, w:100, h: 200 },
          { label: 'vaeco-apron',        x: 880, y: 350, w: 80, h: 100 },
        ];

        const regions = keyRegions.map(r => {
          let rR=0,rG=0,rB=0,oR=0,oG=0,oB=0,cnt=0;
          for (let y=r.y; y<Math.min(r.y+r.h,H); y++) {
            for (let x=r.x; x<Math.min(r.x+r.w,W); x++) {
              const i=(y*W+x)*4;
              rR+=refPx.data[i]; rG+=refPx.data[i+1]; rB+=refPx.data[i+2];
              oR+=ourPx.data[i]; oG+=ourPx.data[i+1]; oB+=ourPx.data[i+2];
              cnt++;
            }
          }
          const ref=[Math.round(rR/cnt),Math.round(rG/cnt),Math.round(rB/cnt)];
          const our=[Math.round(oR/cnt),Math.round(oG/cnt),Math.round(oB/cnt)];
          return { label: r.label, ref, our, diff: ref.reduce((s,v,i)=>s+Math.abs(v-our[i]),0)/3 };
        });

        resolve({ cells, regions });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log('\nDiff heatmap (% wrong pixels per 100px cell, 0=perfect, 100=all wrong):');
console.log('     col:  0   1   2   3   4   5   6   7   8   9  10  11  12');
for (let row = 0; row < 9; row++) {
  const rowData = result.cells.filter(c => c.row === row);
  const line = rowData.map(c => c.pct.toString().padStart(4)).join('');
  console.log(`row ${row}: ${line}`);
}

console.log('\nKey region color analysis:');
for (const r of result.regions) {
  const rh = '#' + r.ref.map(v=>v.toString(16).padStart(2,'0')).join('');
  const oh = '#' + r.our.map(v=>v.toString(16).padStart(2,'0')).join('');
  console.log(`  ${r.label.padEnd(25)} REF:${rh} OUR:${oh} diff:${r.diff.toFixed(0)}`);
}

await browser.close();
