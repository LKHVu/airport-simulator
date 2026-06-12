// Targeted analysis of untouched high-wrong cells + r5c9 lower band.
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
              if (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20 && dA<=20) f++;
              else if (dB<=20 && dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        }

        function darkRowHist(x0, y0, x1, y1, refThresh=80) {
          const rows = {};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i];
              if (Math.abs(oR-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if ((rR+rG+rB)/3 < refThresh) rows[y]=(rows[y]||0)+1;
            }
          }
          return rows;
        }
        function darkColHist(x0, y0, x1, y1, refThresh=80) {
          const cols = {};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i];
              if (Math.abs(oR-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if ((rR+rG+rB)/3 < refThresh) cols[x]=(cols[x]||0)+1;
            }
          }
          return cols;
        }

        // r5c6 (CMP 606-707, 490-588)
        const r5c6_rows = darkRowHist(606, 490, 707, 588);
        const r5c6_cols = darkColHist(606, 490, 707, 588);
        const r5c6_sim = simSvgRect(558, 482, 649, 581, 17);

        // r6c7 (CMP 707-808, 588-686)
        const r6c7_rows = darkRowHist(707, 588, 808, 686);
        const r6c7_cols = darkColHist(707, 588, 808, 686);

        // r4c8 (CMP 808-909, 392-490)
        const r4c8_rows = darkRowHist(808, 392, 909, 490);
        const r4c8_cols = darkColHist(808, 392, 909, 490);

        // r2c2 (CMP 202-303, 196-294)
        const r2c2_rows = darkRowHist(202, 196, 303, 294);
        const r2c2_cols = darkColHist(202, 196, 303, 294);

        // r6c8 (CMP 808-909, 588-686)
        const r6c8_rows = darkRowHist(808, 588, 909, 686);
        const r6c8_cols = darkColHist(808, 588, 909, 686);

        // r3c4 (CMP 404-505, 294-392)
        const r3c4_rows = darkRowHist(404, 294, 505, 392);
        const r3c4_cols = darkColHist(404, 294, 505, 392);

        // r5c9 lower column (SVG x=833-842, y=505-580 → CMP x=909-918, y=513-580)
        const r5c9_lower_col = simSvgRect(833, 505, 842, 580, 17);
        // Same at full width to x=852 (CMP 920):
        const r5c9_lower_wide = simSvgRect(833, 505, 852, 580, 17);

        // Global row histogram of dark background-wrong pixels
        const globalRowHist = {};
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i];
            if (Math.abs(oR-235)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            if ((rR+rG+rB)/3 < 80) globalRowHist[y]=(globalRowHist[y]||0)+1;
          }
        }
        const topRows = Object.entries(globalRowHist).sort((a,b)=>b[1]-a[1]).slice(0,30);

        // r4c6 (CMP 606-707, 392-490)
        const r4c6_rows = darkRowHist(606, 392, 707, 490);
        const r4c6_cols = darkColHist(606, 392, 707, 490);

        // Total wrong
        let totalWrong = 0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong, topRows,
          r5c6_rows, r5c6_cols, r5c6_sim,
          r6c7_rows, r6c7_cols,
          r4c8_rows, r4c8_cols,
          r2c2_rows, r2c2_cols,
          r6c8_rows, r6c8_cols,
          r3c4_rows, r3c4_cols,
          r4c6_rows, r4c6_cols,
          r5c9_lower_col, r5c9_lower_wide,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== Top 30 rows by dark background-wrong pixel count ===');
for (const [y,v] of result.topRows) console.log(`  y=${y}: ${v}px`);

function compactHist(hist, label, n=15) {
  const entries = Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const total = entries.reduce((s,[,v])=>s+v,0);
  const top = entries.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label} (total=${total}): [${top}]`);
}

console.log('\n=== r5c6 (CMP 606-707, 490-588) ===');
compactHist(result.r5c6_rows,'rows'); compactHist(result.r5c6_cols,'cols');
console.log('  Full cell dark sim:', JSON.stringify(result.r5c6_sim));

console.log('\n=== r6c7 (CMP 707-808, 588-686) ===');
compactHist(result.r6c7_rows,'rows'); compactHist(result.r6c7_cols,'cols');

console.log('\n=== r4c8 (CMP 808-909, 392-490) ===');
compactHist(result.r4c8_rows,'rows'); compactHist(result.r4c8_cols,'cols');

console.log('\n=== r2c2 (CMP 202-303, 196-294) ===');
compactHist(result.r2c2_rows,'rows'); compactHist(result.r2c2_cols,'cols');

console.log('\n=== r6c8 (CMP 808-909, 588-686) ===');
compactHist(result.r6c8_rows,'rows'); compactHist(result.r6c8_cols,'cols');

console.log('\n=== r3c4 (CMP 404-505, 294-392) ===');
compactHist(result.r3c4_rows,'rows'); compactHist(result.r3c4_cols,'cols');

console.log('\n=== r4c6 (CMP 606-707, 392-490) ===');
compactHist(result.r4c6_rows,'rows'); compactHist(result.r4c6_cols,'cols');

console.log('\n=== r5c9 lower col sim ===');
console.log('  x=833-842, y=505-580:', JSON.stringify(result.r5c9_lower_col));
console.log('  x=833-852, y=505-580:', JSON.stringify(result.r5c9_lower_wide));

await browser.close();
