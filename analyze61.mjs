// Sim r5c8 upper block, and probe remaining cells for positives.
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

        function simSvgRect(svgX0, svgY0, svgX1, svgY1, targetAvg) {
          const x0=Math.floor(svgX0*1309/1200), y0=Math.floor(svgY0*875/860);
          const x1=Math.ceil(svgX1*1309/1200), y1=Math.ceil(svgY1*875/860);
          let f=0, b=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15||Math.abs(oG-235)>15||Math.abs(oB-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20&&dA<=20) f++;
              else if (dB<=20&&dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        }

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

        // ===== r5c8 upper block (CMP x=894-909, y=557-575) =====
        // SVG x: 894×1200/1309=819.6→820; 909×1200/1309=833.4→834
        // SVG y: 557×860/875=547.3→548; 575×860/875=565.1→566
        const r5c8_upper = simSvgRect(820, 548, 834, 566, 17);
        // Try wider x (include down to 894):
        const r5c8_upper_wide = simSvgRect(819, 546, 834, 568, 17);
        // Narrower (just cols 900-909 in CMP → SVG 824-834):
        const r5c8_upper_xnarrow = simSvgRect(824, 548, 834, 566, 17);
        // With tighter y (CMP y=560-575 → SVG y=550-566):
        const r5c8_upper_ytight = simSvgRect(820, 550, 834, 566, 17);

        // Combined upper+lower r5c8 in one rect:
        const r5c8_full = simSvgRect(819, 548, 834, 580, 17);

        // ===== r6c8 remaining wedge (y=620-630, tapering) =====
        // Already confirmed 130px total but tapering. Try just top rows:
        const r6c8_wedge = simSvgRect(815, 607, 832, 632, 17);

        // ===== Check non-standard wrong pixels in some cells =====
        // Total non-standard wrong by cell
        const nstdCells = {};
        const bgCells = {};
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
          const rR=refPx.data[i],rG=refPx.data[i+1],rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if(d>20){
            const isBg=Math.abs(oR-235)<=15&&Math.abs(oG-235)<=15&&Math.abs(oB-235)<=15;
            const r=Math.floor(y/98),cc=Math.floor(x/101);
            const key=`r${r}c${cc}`;
            if(isBg) bgCells[key]=(bgCells[key]||0)+1;
            else nstdCells[key]=(nstdCells[key]||0)+1;
          }
        }
        const topNstd=Object.entries(nstdCells).sort((a,b)=>b[1]-a[1]).slice(0,15);
        const topBg=Object.entries(bgCells).sort((a,b)=>b[1]-a[1]).slice(0,15);
        let totalWrong=0, totalBg=0, totalNstd=0;
        for (let i=0;i<W*H*4;i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20){ totalWrong++; const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
            if(Math.abs(oR-235)<=15&&Math.abs(oG-235)<=15&&Math.abs(oB-235)<=15) totalBg++;
            else totalNstd++;
          }
        }

        // ===== Look for any remaining sims with positive net we haven't tried =====
        // r4c9 upper area (CMP 909-1010, 392-437) — above the existing black block
        const r4c9_top_rows = darkRowHist(909, 392, 1010, 437);
        const r4c9_top_sim = simSvgRect(832, 387, 926, 434, 17);

        // r3c8 (CMP 808-909, 294-392) — check for concentrated dark
        const r3c8_rows = darkRowHist(808, 294, 909, 392);
        const r3c8_cols = darkColHist(808, 294, 909, 392);

        // r3c9 (CMP 909-1010, 294-392) — right of VAECO area
        const r3c9_rows = darkRowHist(909, 294, 1010, 392);
        const r3c9_cols = darkColHist(909, 294, 1010, 392);
        const r3c9_sim = simSvgRect(832, 289, 926, 387, 17);

        // r4c3 (CMP 303-404, 392-490)
        const r4c3_rows = darkRowHist(303, 392, 404, 490);
        const r4c3_cols = darkColHist(303, 392, 404, 490);

        // r3c3 (CMP 303-404, 294-392)
        const r3c3_rows = darkRowHist(303, 294, 404, 392);
        const r3c3_cols = darkColHist(303, 294, 404, 392);

        // r7c8 (CMP 808-909, 686-784) — south of VAECO
        const r7c8_rows = darkRowHist(808, 686, 909, 784);
        const r7c8_cols = darkColHist(808, 686, 909, 784);

        // r6c9 (CMP 909-1010, 588-686)
        const r6c9_rows = darkRowHist(909, 588, 1010, 686);
        const r6c9_cols = darkColHist(909, 588, 1010, 686);

        // Global per-row non-standard wrong count (to understand where nstd pixels are)
        const nstdRowHist = {};
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
          if (Math.abs(oR-235)<=15&&Math.abs(oG-235)<=15&&Math.abs(oB-235)<=15) continue;
          const rR=refPx.data[i],rG=refPx.data[i+1],rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if (d>20) nstdRowHist[y]=(nstdRowHist[y]||0)+1;
        }
        const topNstdRows = Object.entries(nstdRowHist).sort((a,b)=>b[1]-a[1]).slice(0,20);

        resolve({
          totalWrong, totalBg, totalNstd,
          topNstd, topBg,
          r5c8_upper, r5c8_upper_wide, r5c8_upper_xnarrow, r5c8_upper_ytight, r5c8_full,
          r6c8_wedge,
          r4c9_top_rows, r4c9_top_sim,
          r3c8_rows, r3c8_cols,
          r3c9_rows, r3c9_cols, r3c9_sim,
          r4c3_rows, r4c3_cols,
          r3c3_rows, r3c3_cols,
          r7c8_rows, r7c8_cols,
          r6c9_rows, r6c9_cols,
          topNstdRows,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong} (bg: ${result.totalBg}, nstd: ${result.totalNstd})`);
console.log('\n=== Top 15 bg-wrong cells ===');
for (const [k,v] of result.topBg) console.log(`  ${k}: ${v}`);
console.log('\n=== Top 15 nstd-wrong cells ===');
for (const [k,v] of result.topNstd) console.log(`  ${k}: ${v}`);
console.log('\n=== Top 20 nstd rows ===');
for (const [y,v] of result.topNstdRows) console.log(`  y=${y}: ${v}px`);

console.log('\n=== r5c8 upper sims ===');
console.log('  upper (820-834, 548-566):', JSON.stringify(result.r5c8_upper));
console.log('  upper wide (819-834, 546-568):', JSON.stringify(result.r5c8_upper_wide));
console.log('  upper xnarrow (824-834, 548-566):', JSON.stringify(result.r5c8_upper_xnarrow));
console.log('  upper ytight (820-834, 550-566):', JSON.stringify(result.r5c8_upper_ytight));
console.log('  full r5c8 (819-834, 548-580):', JSON.stringify(result.r5c8_full));
console.log('\n=== r6c8 wedge (815-832, 607-632) ===', JSON.stringify(result.r6c8_wedge));

function ch(hist, label, n=12) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log('\n=== r4c9 top ==='); ch(result.r4c9_top_rows,'rows');
console.log('  sim (832-926, 387-434):', JSON.stringify(result.r4c9_top_sim));

console.log('\n=== r3c8 ==='); ch(result.r3c8_rows,'rows'); ch(result.r3c8_cols,'cols');
console.log('\n=== r3c9 ==='); ch(result.r3c9_rows,'rows'); ch(result.r3c9_cols,'cols');
console.log('  sim (832-926, 289-387):', JSON.stringify(result.r3c9_sim));
console.log('\n=== r4c3 ==='); ch(result.r4c3_rows,'rows'); ch(result.r4c3_cols,'cols');
console.log('\n=== r3c3 ==='); ch(result.r3c3_rows,'rows'); ch(result.r3c3_cols,'cols');
console.log('\n=== r7c8 ==='); ch(result.r7c8_rows,'rows'); ch(result.r7c8_cols,'cols');
console.log('\n=== r6c9 ==='); ch(result.r6c9_rows,'rows'); ch(result.r6c9_cols,'cols');

await browser.close();
