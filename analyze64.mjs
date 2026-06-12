// Investigate r6c7, r5c7, r4c6, r2c10 for tractable sub-clusters.
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

        // ===== r6c7 (CMP 707-808, 588-686): 1592 bg-wrong =====
        const r6c7_rows = darkRowHist(707, 588, 808, 686);
        const r6c7_cols = darkColHist(707, 588, 808, 686);
        // Try simming a concentrated sub-area (find from hist later)
        const r6c7_sim_full = simSvgRect(649, 581, 741, 677, 17);

        // ===== r5c7 (CMP 707-808, 490-588): 1388 bg-wrong =====
        const r5c7_rows = darkRowHist(707, 490, 808, 588);
        const r5c7_cols = darkColHist(707, 490, 808, 588);
        const r5c7_sim_full = simSvgRect(649, 482, 741, 581, 17);

        // ===== r4c6 (CMP 606-707, 392-490): 1427 bg-wrong remaining =====
        const r4c6_rows = darkRowHist(606, 392, 707, 490);
        const r4c6_cols = darkColHist(606, 392, 707, 490);
        const r4c6_sim_full = simSvgRect(556, 387, 649, 482, 17);

        // ===== r2c10 (CMP 1010-1111, 196-294): 1644 bg-wrong =====
        const r2c10_rows = darkRowHist(1010, 196, 1111, 294);
        const r2c10_cols = darkColHist(1010, 196, 1111, 294);
        const r2c10_sim = simSvgRect(926, 193, 1018, 289, 17);

        // ===== r3c5 (CMP 505-606, 294-392): 1630 bg-wrong =====
        const r3c5_rows = darkRowHist(505, 294, 606, 392);
        const r3c5_cols = darkColHist(505, 294, 606, 392);
        const r3c5_sim = simSvgRect(463, 289, 556, 387, 17);

        // ===== r3c6 (CMP 606-707, 294-392): 1659 bg-wrong =====
        const r3c6_rows = darkRowHist(606, 294, 707, 392);
        const r3c6_cols = darkColHist(606, 294, 707, 392);
        const r3c6_sim = simSvgRect(556, 289, 649, 387, 17);

        // ===== r4c8 (CMP 808-909, 392-490): 1545 bg-wrong =====
        // From analyze62: rows around 395-405, col 839:29 concentrated
        // Try: CMP x=835-845, y=395-408 → SVG x=765-775, y=389-401
        const r4c8_839 = simSvgRect(765, 389, 776, 402, 17);
        // The whole right strip: CMP x=879-889, y=392-415 → SVG x=806-816, y=387-402
        const r4c8_rightstrip = simSvgRect(806, 387, 817, 402, 17);
        // CMP x=835-845, y=393-415 → SVG 765-776, 387-403
        const r4c8_cluster = simSvgRect(765, 387, 776, 403, 17);

        // ===== r5c6 (CMP 606-707, 490-588): 1866 bg-wrong =====
        const r5c6_rows = darkRowHist(606, 490, 707, 588);
        const r5c6_cols = darkColHist(606, 490, 707, 588);
        const r5c6_sim = simSvgRect(556, 482, 649, 581, 17);

        // ===== Global row histogram fresh =====
        const globalRowHist = {};
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) globalRowHist[y]=(globalRowHist[y]||0)+1;
        }
        const topRows = Object.entries(globalRowHist).sort((a,b)=>b[1]-a[1]).slice(0,20);

        let totalWrong=0;
        for (let i=0;i<W*H*4;i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong, topRows,
          r6c7_rows, r6c7_cols, r6c7_sim_full,
          r5c7_rows, r5c7_cols, r5c7_sim_full,
          r4c6_rows, r4c6_cols, r4c6_sim_full,
          r2c10_rows, r2c10_cols, r2c10_sim,
          r3c5_rows, r3c5_cols, r3c5_sim,
          r3c6_rows, r3c6_cols, r3c6_sim,
          r4c8_839, r4c8_rightstrip, r4c8_cluster,
          r5c6_rows, r5c6_cols, r5c6_sim,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);
console.log('\n=== Top 20 global dark rows ===');
for(const [y,v] of result.topRows) console.log(`  y=${y}: ${v}px`);

function ch(hist, label, n=12) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log('\n=== r6c7 ==='); ch(result.r6c7_rows,'rows'); ch(result.r6c7_cols,'cols');
console.log('  full sim:', JSON.stringify(result.r6c7_sim_full));

console.log('\n=== r5c7 ==='); ch(result.r5c7_rows,'rows'); ch(result.r5c7_cols,'cols');
console.log('  full sim:', JSON.stringify(result.r5c7_sim_full));

console.log('\n=== r4c6 ==='); ch(result.r4c6_rows,'rows'); ch(result.r4c6_cols,'cols');
console.log('  full sim:', JSON.stringify(result.r4c6_sim_full));

console.log('\n=== r2c10 ==='); ch(result.r2c10_rows,'rows'); ch(result.r2c10_cols,'cols');
console.log('  full sim:', JSON.stringify(result.r2c10_sim));

console.log('\n=== r3c5 ==='); ch(result.r3c5_rows,'rows'); ch(result.r3c5_cols,'cols');
console.log('  full sim:', JSON.stringify(result.r3c5_sim));

console.log('\n=== r3c6 ==='); ch(result.r3c6_rows,'rows'); ch(result.r3c6_cols,'cols');
console.log('  full sim:', JSON.stringify(result.r3c6_sim));

console.log('\n=== r4c8 narrow sims ===');
console.log('  col839 (765-776, 389-402):', JSON.stringify(result.r4c8_839));
console.log('  rightstrip (806-817, 387-402):', JSON.stringify(result.r4c8_rightstrip));
console.log('  cluster (765-776, 387-403):', JSON.stringify(result.r4c8_cluster));

console.log('\n=== r5c6 ==='); ch(result.r5c6_rows,'rows'); ch(result.r5c6_cols,'cols');
console.log('  full sim:', JSON.stringify(result.r5c6_sim));

await browser.close();
