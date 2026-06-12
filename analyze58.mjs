// Investigate r4c10-c11 block, r2c12, r1c10, and remaining improvement targets.
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

        // Global row histogram to find concentrated dark rows
        const globalRowHist = {};
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) globalRowHist[y]=(globalRowHist[y]||0)+1;
        }
        const topRows = Object.entries(globalRowHist).sort((a,b)=>b[1]-a[1]).slice(0,25);

        // r4c10 (CMP 1010-1111, 392-490): investigate
        const r4c10_rows = darkRowHist(1010, 392, 1111, 490);
        const r4c10_cols = darkColHist(1010, 392, 1111, 490);

        // r4c11 (CMP 1111-1212, 392-490): investigate
        const r4c11_rows = darkRowHist(1111, 392, 1212, 490);
        const r4c11_cols = darkColHist(1111, 392, 1212, 490);

        // r4c12 (CMP 1212-1309, 392-490): investigate
        const r4c12_rows = darkRowHist(1212, 392, 1309, 490);
        const r4c12_cols = darkColHist(1212, 392, 1309, 490);

        // Sim: add dark block for c10-c11-c12 in r4 area
        // The existing rect at SVG x=926, y=437, w=73 covers CMP x=1010-1090, y=444-519
        // Missing: CMP x=1090-1309, y=442-463
        // CMP x=1090 → SVG x=999; CMP x=1309 → SVG x=1200
        // CMP y=442 → SVG y=434.5; CMP y=463 → SVG y=455.1
        const r4c10c11c12_block = simSvgRect(999, 434, 1200, 456, 17);
        // Try smaller: just c11 part (x=1090-1212 CMP → SVG 999-1111)
        const r4c11c12_block = simSvgRect(999, 434, 1111, 456, 17);
        // Also: extend c10 block — currently x=926-999 covered at y=437-510
        // But y=434-437 gap? CMP y=442-444 in c10
        const r4c10_gap = simSvgRect(926, 434, 999, 438, 17);

        // r2c12 (CMP 1212-1309, 196-294): investigate
        const r2c12_rows = darkRowHist(1212, 196, 1309, 294);
        const r2c12_cols = darkColHist(1212, 196, 1309, 294);
        const r2c12_sim = simSvgRect(1111, 193, 1200, 289, 17);

        // r1c10 (CMP 1010-1111, 98-196): investigate
        const r1c10_rows = darkRowHist(1010, 98, 1111, 196);
        const r1c10_cols = darkColHist(1010, 98, 1111, 196);
        const r1c10_sim = simSvgRect(926, 96, 1018, 193, 17);

        // r2c1 (CMP 101-202, 196-294): investigate
        const r2c1_rows = darkRowHist(101, 196, 202, 294);
        const r2c1_cols = darkColHist(101, 196, 202, 294);

        // Look at row y=548-549 (high in global): CMP y=548-549
        // These appeared at 220px each. Investigate cell distribution.
        const y548_cells = {};
        for (let x=0;x<W;x++) {
          const i=(548*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            const cc=Math.floor(x/101);
            y548_cells[`c${cc}`]=(y548_cells[`c${cc}`]||0)+1;
          }
        }

        // r5c8 (CMP 808-909, 490-588) — check if concentrated
        const r5c8_rows = darkRowHist(808, 490, 909, 588);
        const r5c8_cols = darkColHist(808, 490, 909, 588);

        // r5c10 (CMP 1010-1111, 490-588)
        const r5c10_rows = darkRowHist(1010, 490, 1111, 588);
        const r5c10_cols = darkColHist(1010, 490, 1111, 588);

        // r5c11 (CMP 1111-1212, 490-588)
        const r5c11_rows = darkRowHist(1111, 490, 1212, 588);
        const r5c11_cols = darkColHist(1111, 490, 1212, 588);

        // Quick sims for r5c10-c11 dark features
        const r5c10_sim = simSvgRect(926, 482, 1018, 581, 17);
        const r5c11_sim = simSvgRect(1018, 482, 1111, 581, 17);

        // Row y=444 cell dist
        const y444_cells = {};
        for (let x=0;x<W;x++) {
          const i=(444*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            const cc=Math.floor(x/101);
            y444_cells[`c${cc}`]=(y444_cells[`c${cc}`]||0)+1;
          }
        }

        // Total wrong
        let totalWrong=0;
        for (let i=0;i<W*H*4;i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong, topRows,
          r4c10_rows, r4c10_cols, r4c11_rows, r4c11_cols, r4c12_rows, r4c12_cols,
          r4c10c11c12_block, r4c11c12_block, r4c10_gap,
          r2c12_rows, r2c12_cols, r2c12_sim,
          r1c10_rows, r1c10_cols, r1c10_sim,
          r2c1_rows, r2c1_cols,
          y548_cells, y444_cells,
          r5c8_rows, r5c8_cols,
          r5c10_rows, r5c10_cols, r5c10_sim,
          r5c11_rows, r5c11_cols, r5c11_sim,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);
console.log('\n=== Top 25 global dark rows ===');
for(const [y,v] of result.topRows) console.log(`  y=${y}: ${v}px`);

function ch(hist, label, n=12) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log('\n=== r4c10 ==='); ch(result.r4c10_rows,'rows'); ch(result.r4c10_cols,'cols');
console.log('\n=== r4c11 ==='); ch(result.r4c11_rows,'rows'); ch(result.r4c11_cols,'cols');
console.log('\n=== r4c12 ==='); ch(result.r4c12_rows,'rows'); ch(result.r4c12_cols,'cols');
console.log('\n=== Sims for c10-c12 in r4 ===');
console.log('  c10-c12 (999-1200, 434-456):', JSON.stringify(result.r4c10c11c12_block));
console.log('  c11-c12 (999-1111, 434-456):', JSON.stringify(result.r4c11c12_block));
console.log('  c10 gap (926-999, 434-438):', JSON.stringify(result.r4c10_gap));

console.log('\n=== r2c12 ==='); ch(result.r2c12_rows,'rows'); ch(result.r2c12_cols,'cols');
console.log('  sim:', JSON.stringify(result.r2c12_sim));
console.log('\n=== r1c10 ==='); ch(result.r1c10_rows,'rows'); ch(result.r1c10_cols,'cols');
console.log('  sim:', JSON.stringify(result.r1c10_sim));
console.log('\n=== r2c1 ==='); ch(result.r2c1_rows,'rows'); ch(result.r2c1_cols,'cols');

console.log('\n=== y=548 cell dist ===', JSON.stringify(result.y548_cells));
console.log('=== y=444 cell dist ===', JSON.stringify(result.y444_cells));

console.log('\n=== r5c8 ==='); ch(result.r5c8_rows,'rows'); ch(result.r5c8_cols,'cols');
console.log('\n=== r5c10 ==='); ch(result.r5c10_rows,'rows'); ch(result.r5c10_cols,'cols');
console.log('  sim:', JSON.stringify(result.r5c10_sim));
console.log('\n=== r5c11 ==='); ch(result.r5c11_rows,'rows'); ch(result.r5c11_cols,'cols');
console.log('  sim:', JSON.stringify(result.r5c11_sim));

await browser.close();
