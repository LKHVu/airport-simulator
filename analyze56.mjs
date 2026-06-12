// Fresh analysis after r5c9+r6c8+r4c6 fixes. Find next improvements.
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

        const CW=101, CH=98;

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
          for (let y=y0;y<Math.min(y1,H);y++) {
            for (let x=x0;x<Math.min(x1,W);x++) {
              const i=(y*W+x)*4;
              if (Math.abs(ourPx.data[i]-235)>15) continue;
              const rAvg=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
              if (rAvg<thresh) h[y]=(h[y]||0)+1;
            }
          }
          return h;
        }
        function darkColHist(x0, y0, x1, y1, thresh=80) {
          const h={};
          for (let y=y0;y<Math.min(y1,H);y++) {
            for (let x=x0;x<Math.min(x1,W);x++) {
              const i=(y*W+x)*4;
              if (Math.abs(ourPx.data[i]-235)>15) continue;
              const rAvg=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
              if (rAvg<thresh) h[x]=(h[x]||0)+1;
            }
          }
          return h;
        }

        // Per-cell background-wrong count
        const cellBgWrong = {};
        let totalWrong=0, bgWrong=0, nonStd=0;
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
          const rR=refPx.data[i],rG=refPx.data[i+1],rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if(d>20){
            totalWrong++;
            if(Math.abs(oR-235)<=15&&Math.abs(oG-235)<=15&&Math.abs(oB-235)<=15){
              bgWrong++;
              const r=Math.floor(y/CH), cc=Math.floor(x/CW);
              cellBgWrong[`r${r}c${cc}`]=(cellBgWrong[`r${r}c${cc}`]||0)+1;
            } else nonStd++;
          }
        }
        const topCells=Object.entries(cellBgWrong).sort((a,b)=>b[1]-a[1]).slice(0,20);

        // r4c8 investigation
        const r4c8_rows = darkRowHist(808, 392, 909, 490);
        const r4c8_cols = darkColHist(808, 392, 909, 490);

        // r4c8 targeted sims: vertical band at col x=839 (SVG x=769)
        const r4c8_col839 = simSvgRect(768, 387, 771, 408, 17); // SVG 768-771 → CMP 836-843
        // Wider band at CMP x=808-850 (SVG 742-778), y=392-408 (SVG 387-402)
        const r4c8_topband = simSvgRect(742, 387, 778, 404, 17);
        // row y=395-405 at x=808-909 (SVG 742-832, y=388-401)
        const r4c8_rows_sim = simSvgRect(742, 388, 832, 402, 17);

        // r6c8 remaining
        const r6c8_rows = darkRowHist(808, 588, 909, 686);
        const r6c8_cols = darkColHist(808, 588, 909, 686);
        // Lower r6c8 (below the block we added, y=607-686 SVG)
        const r6c8_lower = simSvgRect(742, 607, 832, 686, 17);

        // r5c9 remaining (after our fix)
        const r5c9_rows = darkRowHist(909, 490, 1010, 588);
        const r5c9_cols = darkColHist(909, 490, 1010, 588);

        // r2c0 dark features at x=21, 27, 62 (columns):
        // x=21 → SVG x=19.3; x=27 → SVG x=24.7; x=62 → SVG x=56.8
        // These are tiny dark columns. Check if there's a pattern
        const r2c0_col21 = darkRowHist(18, 196, 30, 294, 80);
        const r2c0_col62 = darkRowHist(58, 196, 70, 294, 80);

        // Try drawing very thin dark lines at those column positions
        const r2c0_col21_sim = simSvgRect(18, 193, 28, 289, 17);
        const r2c0_col62_sim = simSvgRect(55, 193, 67, 289, 17);

        // Global row y=442 (257px): beyond our r4c4 fix
        // In which cells are these remaining dark pixels?
        const y442_cells = {};
        for (let x=0;x<W;x++) {
          const y=442;
          const i=(y*W+x)*4;
          if(Math.abs(ourPx.data[i]-235)>15) continue;
          const rAvg=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
          if(rAvg<80){
            const cc=Math.floor(x/CW);
            y442_cells[`c${cc}`]=(y442_cells[`c${cc}`]||0)+1;
          }
        }

        // Global row y=405 (235px): check cell distribution
        const y405_cells = {};
        for (let x=0;x<W;x++) {
          const y=405;
          const i=(y*W+x)*4;
          if(Math.abs(ourPx.data[i]-235)>15) continue;
          const rAvg=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
          if(rAvg<80){
            const cc=Math.floor(x/CW);
            y405_cells[`c${cc}`]=(y405_cells[`c${cc}`]||0)+1;
          }
        }

        // Check r5c6 (CMP 606-707, 490-588) for any concentrated features
        const r5c6_rows = darkRowHist(606, 490, 707, 588);
        const r5c6_cols = darkColHist(606, 490, 707, 588);

        // Check if there are any positive sims we missed in r5c6 area
        // From hist: rows around 533:14, cols around 665:13 — very scattered, skip

        // Check r4c5 (CMP 505-606, 392-490): any concentrated dark?
        const r4c5_rows = darkRowHist(505, 392, 606, 490);
        const r4c5_cols = darkColHist(505, 392, 606, 490);

        // r3c7 (CMP 707-808, 294-392): investigate
        const r3c7_rows = darkRowHist(707, 294, 808, 392);
        const r3c7_cols = darkColHist(707, 294, 808, 392);

        // Try some sims for untested small dark blocks that might be positive
        // r4c8 specific cols: x=881-887 (CMP) had 9-10px each for 7 cols
        const r4c8_rightband = simSvgRect(810, 387, 825, 410, 17); // CMP x=882-901, y=392-415

        // r6c7 (CMP 707-808, 588-686) investigation
        const r6c7_rows = darkRowHist(707, 588, 808, 686);
        const r6c7_cols = darkColHist(707, 588, 808, 686);

        resolve({
          totalWrong, bgWrong, nonStd, topCells,
          r4c8_rows, r4c8_cols, r4c8_col839, r4c8_topband, r4c8_rows_sim, r4c8_rightband,
          r6c8_rows, r6c8_cols, r6c8_lower,
          r5c9_rows, r5c9_cols,
          r2c0_col21, r2c0_col62, r2c0_col21_sim, r2c0_col62_sim,
          y442_cells, y405_cells,
          r5c6_rows, r5c6_cols,
          r4c5_rows, r4c5_cols,
          r3c7_rows, r3c7_cols,
          r6c7_rows, r6c7_cols,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong} (${(result.totalWrong/1145375*100).toFixed(2)}%)`);
console.log(`BG wrong: ${result.bgWrong}  NonStd: ${result.nonStd}`);

console.log('\n=== Top 20 cells ===');
for(const[k,v] of result.topCells) console.log(`  ${k}: ${v}px`);

function ch(hist, label) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log('\n=== r4c8 ==='); ch(result.r4c8_rows,'rows'); ch(result.r4c8_cols,'cols');
console.log('  col839 sim:', JSON.stringify(result.r4c8_col839));
console.log('  topband sim:', JSON.stringify(result.r4c8_topband));
console.log('  rows_sim:', JSON.stringify(result.r4c8_rows_sim));
console.log('  rightband sim:', JSON.stringify(result.r4c8_rightband));

console.log('\n=== r6c8 remaining ==='); ch(result.r6c8_rows,'rows'); ch(result.r6c8_cols,'cols');
console.log('  lower sim (607-686):', JSON.stringify(result.r6c8_lower));

console.log('\n=== r5c9 remaining ==='); ch(result.r5c9_rows,'rows'); ch(result.r5c9_cols,'cols');

console.log('\n=== r2c0 col features ===');
console.log('  col x=18-30 row hist:', JSON.stringify(Object.entries(result.r2c0_col21).sort((a,b)=>b[1]-a[1]).slice(0,10)));
console.log('  col x=58-70 row hist:', JSON.stringify(Object.entries(result.r2c0_col62).sort((a,b)=>b[1]-a[1]).slice(0,10)));
console.log('  col x=18-28 sim:', JSON.stringify(result.r2c0_col21_sim));
console.log('  col x=55-67 sim:', JSON.stringify(result.r2c0_col62_sim));

console.log('\n=== y=442 dark pixel cell dist ===');
console.log(JSON.stringify(result.y442_cells));
console.log('\n=== y=405 dark pixel cell dist ===');
console.log(JSON.stringify(result.y405_cells));

console.log('\n=== r5c6 ==='); ch(result.r5c6_rows,'rows'); ch(result.r5c6_cols,'cols');
console.log('\n=== r4c5 ==='); ch(result.r4c5_rows,'rows'); ch(result.r4c5_cols,'cols');
console.log('\n=== r3c7 ==='); ch(result.r3c7_rows,'rows'); ch(result.r3c7_cols,'cols');
console.log('\n=== r6c7 ==='); ch(result.r6c7_rows,'rows'); ch(result.r6c7_cols,'cols');

await browser.close();
