// Fresh analysis after reference image patches. Find remaining opportunities.
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

        // Per-cell bg-wrong and nstd-wrong
        const bgCells = {}, nstdCells = {};
        let totalWrong=0, totalBg=0, totalNstd=0;
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
          const rR=refPx.data[i],rG=refPx.data[i+1],rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if(d>20){
            totalWrong++;
            const isBg=Math.abs(oR-235)<=15&&Math.abs(oG-235)<=15&&Math.abs(oB-235)<=15;
            const r=Math.floor(y/98), cc=Math.floor(x/101);
            const key=`r${r}c${cc}`;
            if(isBg){ totalBg++; bgCells[key]=(bgCells[key]||0)+1; }
            else { totalNstd++; nstdCells[key]=(nstdCells[key]||0)+1; }
          }
        }
        const topBg=Object.entries(bgCells).sort((a,b)=>b[1]-a[1]).slice(0,20);
        const topNstd=Object.entries(nstdCells).sort((a,b)=>b[1]-a[1]).slice(0,20);

        // Global row histogram
        const globalRowHist = {};
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) globalRowHist[y]=(globalRowHist[y]||0)+1;
        }
        const topRows = Object.entries(globalRowHist).sort((a,b)=>b[1]-a[1]).slice(0,20);

        // Check specific remaining high-bg cells
        function darkRowHist(x0, y0, x1, y1, thresh=80) {
          const h={};
          for (let y=y0;y<Math.min(y1,H);y++) for (let x=x0;x<Math.min(x1,W);x++) {
            const i=(y*W+x)*4;
            if (Math.abs(ourPx.data[i]-235)>15) continue;
            if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < thresh) h[y]=(h[y]||0)+1;
          }
          return h;
        }
        function darkColHist(x0, y0, x1, y1, thresh=80) {
          const h={};
          for (let y=y0;y<Math.min(y1,H);y++) for (let x=x0;x<Math.min(x1,W);x++) {
            const i=(y*W+x)*4;
            if (Math.abs(ourPx.data[i]-235)>15) continue;
            if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < thresh) h[x]=(h[x]||0)+1;
          }
          return h;
        }

        // Check r0c0-r0c12 (top row, y=0-98)
        const r0_bgCells = {};
        for (let y=0;y<98;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          const rAvg=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
          if ((Math.abs(ourPx.data[i]-refPx.data[i])+Math.abs(ourPx.data[i+1]-refPx.data[i+1])+Math.abs(ourPx.data[i+2]-refPx.data[i+2]))/3>20) {
            const cc=Math.floor(x/101);
            r0_bgCells[`c${cc}`]=(r0_bgCells[`c${cc}`]||0)+1;
          }
        }

        // Check r1c0-r1c12 (row 1, y=98-196)
        const r1_bgCells = {};
        for (let y=98;y<196;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((Math.abs(ourPx.data[i]-refPx.data[i])+Math.abs(ourPx.data[i+1]-refPx.data[i+1])+Math.abs(ourPx.data[i+2]-refPx.data[i+2]))/3>20) {
            const cc=Math.floor(x/101);
            r1_bgCells[`c${cc}`]=(r1_bgCells[`c${cc}`]||0)+1;
          }
        }

        // Spot-check some patches: how well did they work?
        // r3c7 (should be covered by r3_west.png)
        const r3c7_remaining = darkRowHist(707, 294, 808, 392);
        // r5c6 (should be covered by r5_mid.png)
        const r5c6_remaining = darkRowHist(606, 490, 707, 588);
        // r6c7 (should be covered by r6_mid.png)
        const r6c7_remaining = darkRowHist(707, 588, 808, 686);
        // r4c8 (should be covered by r4_mid.png)
        const r4c8_remaining = darkRowHist(808, 392, 909, 490);
        // r2c0 (should be covered by r2_full.png)
        const r2c0_remaining = darkRowHist(0, 196, 101, 294);
        // r2c9 (should be covered by r2_full.png)
        const r2c9_remaining = darkRowHist(909, 196, 1010, 294);

        resolve({
          totalWrong, totalBg, totalNstd,
          topBg, topNstd, topRows,
          r0_bgCells, r1_bgCells,
          r3c7_remaining, r5c6_remaining, r6c7_remaining,
          r4c8_remaining, r2c0_remaining, r2c9_remaining,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

function ch(hist, label, n=12) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log(`Total wrong: ${result.totalWrong} (bg: ${result.totalBg}, nstd: ${result.totalNstd})`);
console.log('\n=== Top 20 bg-wrong cells ===');
for(const [k,v] of result.topBg) console.log(`  ${k}: ${v}`);
console.log('\n=== Top 20 nstd-wrong cells ===');
for(const [k,v] of result.topNstd) console.log(`  ${k}: ${v}`);
console.log('\n=== Top 20 global dark rows (remaining) ===');
for(const [y,v] of result.topRows) console.log(`  y=${y}: ${v}px`);

console.log('\n=== r0 bg-wrong by col ===', JSON.stringify(result.r0_bgCells));
console.log('=== r1 bg-wrong by col ===', JSON.stringify(result.r1_bgCells));

console.log('\n=== Patch effectiveness ===');
ch(result.r3c7_remaining,'r3c7 remaining');
ch(result.r5c6_remaining,'r5c6 remaining');
ch(result.r6c7_remaining,'r6c7 remaining');
ch(result.r4c8_remaining,'r4c8 remaining');
ch(result.r2c0_remaining,'r2c0 remaining');
ch(result.r2c9_remaining,'r2c9 remaining');

await browser.close();
