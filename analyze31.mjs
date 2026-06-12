// Quick grid scan + targeted sims after stroke removal.
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
          const f=(rgb,n)=>'#'+rgb.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join('');
          return { refAvg:f([rR,rG,rB],cnt), ourAvg:f([oR,oG,oB],cnt), pct:Math.round(wrong*100/cnt), wrong, cnt };
        }

        function simOverlay(x0, y0, x1, y1, newR, newG, newB, ourThresh=230) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (oR<ourThresh || oG<ourThresh || oB<ourThresh) continue;
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-newR)+Math.abs(rG-newG)+Math.abs(rB-newB))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes, breaks, net:fixes-breaks};
        }

        // Grid
        const grid = {};
        for (let r=0; r<9; r++) for (let c=0; c<13; c++) grid[`r${r}c${c}`] = sampleCell(c*101,r*98,(c+1)*101,(r+1)*98);

        // Re-run key sims now that stroke is gone
        // r6c7 at 235
        const r6c7_235 = simOverlay(707, 588, 808, 686, 235, 234, 228, 230);
        const r6c7_232 = simOverlay(707, 588, 808, 686, 232, 231, 225, 230);

        // r5c7 at 235
        const r5c7_235 = simOverlay(707, 490, 808, 588, 235, 234, 228, 230);

        // r4c7 at 235
        const r4c7_235 = simOverlay(707, 392, 808, 490, 235, 234, 228, 230);

        // r6c8 at 235
        const r6c8_235 = simOverlay(808, 588, 909, 686, 235, 234, 228, 230);

        // r5c8 at 235
        const r5c8_235 = simOverlay(808, 490, 909, 588, 235, 234, 228, 230);

        // Combined INTL c7 lower (r4-r7) at 235
        const intlC7lower_235 = simOverlay(707, 392, 808, 686, 235, 234, 228, 230);

        // Combined INTL lower (c6-c8, r4-r7) at 235
        const intlLower_235 = simOverlay(606, 392, 909, 686, 235, 234, 228, 230);

        // DOM apron: r3c0, r3c1, r4c0 (now that stroke is gone)
        const r3c0_dom = simOverlay(0, 294, 101, 392, 220, 222, 210, 230);
        const r4c0_dom = simOverlay(0, 392, 101, 490, 220, 222, 210, 230);

        // Row scans for x=632-637 to check if stroke is really gone
        function rowScan(y, x0, x1) {
          const pts=[];
          for(let x=x0; x<=x1; x++) {
            const i=(y*W+x)*4;
            pts.push({x, R:ourPx.data[i], G:ourPx.data[i+1], B:ourPx.data[i+2],
                     rR:refPx.data[i], rG:refPx.data[i+1], rB:refPx.data[i+2]});
          }
          return pts;
        }
        const strokeCheck = rowScan(450, 630, 640);

        resolve({ grid, r6c7_235, r6c7_232, r5c7_235, r4c7_235, r6c8_235, r5c8_235,
                  intlC7lower_235, intlLower_235, r3c0_dom, r4c0_dom, strokeCheck });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log('\n=== Grid top 25 wrong ===');
const sorted = Object.entries(result.grid).sort((a,b)=>b[1].wrong-a[1].wrong);
for (const [k,v] of sorted.slice(0,25)) console.log(`  ${k}: REF:${v.refAvg} OUR:${v.ourAvg} ${v.pct}% (${v.wrong})`);
console.log(`  TOTAL: ${Object.values(result.grid).reduce((s,v)=>s+v.wrong,0)}`);

console.log('\n=== INTL lower overlay sims ===');
console.log('r6c7@235:', JSON.stringify(result.r6c7_235));
console.log('r6c7@232:', JSON.stringify(result.r6c7_232));
console.log('r5c7@235:', JSON.stringify(result.r5c7_235));
console.log('r4c7@235:', JSON.stringify(result.r4c7_235));
console.log('r6c8@235:', JSON.stringify(result.r6c8_235));
console.log('r5c8@235:', JSON.stringify(result.r5c8_235));
console.log('intlC7lower (r4-r7)@235:', JSON.stringify(result.intlC7lower_235));
console.log('intlLower (r4-r7,c6-c8)@235:', JSON.stringify(result.intlLower_235));

console.log('\n=== DOM area sims ===');
console.log('r3c0@220:', JSON.stringify(result.r3c0_dom));
console.log('r4c0@220:', JSON.stringify(result.r4c0_dom));

console.log('\n=== Stroke check at y=450 x=630-640 ===');
for(const p of result.strokeCheck) console.log(`  x=${p.x}: OUR=(${p.R},${p.G},${p.B}) REF=(${p.rR},${p.rG},${p.rB})`);

await browser.close();
