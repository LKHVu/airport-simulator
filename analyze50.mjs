// Analyze top background-wrong cells outside VAECO zone for tractability.
// For each cell: REF distribution of background-wrong pixels + targeted sim.
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

        const CW = 101, CH = 98;

        function analyzeCell(row, col) {
          const x0=col*CW, x1=Math.min((col+1)*CW, W);
          const y0=row*CH, y1=Math.min((row+1)*CH, H);
          const refDist = {};
          let bgCorrect=0, bgWrong=0;
          let bestColor=-1, bestNet=-Infinity;

          for (let y=y0; y<y1; y++) {
            for (let x=x0; x<x1; x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d = (Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
              if (d > 20) {
                bgWrong++;
                const rb = Math.round((rR+rG+rB)/3/10)*10;
                refDist[rb] = (refDist[rb]||0)+1;
              } else {
                bgCorrect++;
              }
            }
          }

          // Sim: try adding uniform color to entire cell
          for (const targetAvg of [50, 80, 100, 120, 150, 180, 200, 210, 215, 220]) {
            let f=0, b=0;
            for (let y=y0; y<y1; y++) {
              for (let x=x0; x<x1; x++) {
                const i=(y*W+x)*4;
                const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
                if (Math.abs(oR-235)>15) continue;
                const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
                const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
                const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
                if (dB>20 && dA<=20) f++;
                else if (dB<=20 && dA>20) b++;
              }
            }
            if (f-b > bestNet) { bestNet=f-b; bestColor=targetAvg; }
          }

          return { bgWrong, bgCorrect, refDist, bestColor, bestNet };
        }

        // Analyze top non-VAECO cells
        const cells = [
          [2,0], [2,2], [2,9], [2,10],
          [3,5], [3,6], [3,7],
          [4,4], [4,6], [4,8], [4,9],
          [5,6], [5,7], [5,9],
          [6,7],
          // Also row 1 cells
          [1,0], [1,1], [1,2], [1,3],
          // Row 0
          [0,0], [0,1], [0,12],
        ];

        const analysis = {};
        for (const [r, cc] of cells) {
          analysis[`r${r}c${cc}`] = analyzeCell(r, cc);
        }

        // Total wrong
        let totalWrong = 0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        // Also: check if a wide horizontal band could help in r2 or r3
        // Try adding color=215 to full row 2 (y=196-294) - only for background pixels
        const row2_sim215 = (() => {
          let f=0, b=0;
          for (let y=196; y<294; y++) {
            for (let x=0; x<W; x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-215)+Math.abs(rG-215)+Math.abs(rB-215))/3;
              if (dB>20 && dA<=20) f++;
              else if (dB<=20 && dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        })();

        // Try adding color=215 to full row 3 (y=294-392)
        const row3_sim215 = (() => {
          let f=0, b=0;
          for (let y=294; y<392; y++) {
            for (let x=0; x<W; x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-215)+Math.abs(rG-215)+Math.abs(rB-215))/3;
              if (dB>20 && dA<=20) f++;
              else if (dB<=20 && dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        })();

        // Try color=215 for all background in full canvas
        const full_sim215 = (() => {
          let f=0, b=0;
          for (let i=0; i<W*H*4; i+=4) {
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            const dA=(Math.abs(rR-215)+Math.abs(rG-215)+Math.abs(rB-215))/3;
            if (dB>20 && dA<=20) f++;
            else if (dB<=20 && dA>20) b++;
          }
          return {fixes:f,breaks:b,net:f-b};
        })();

        resolve({ totalWrong, analysis, row2_sim215, row3_sim215, full_sim215 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong} (${(result.totalWrong/1145375*100).toFixed(2)}%)`);

console.log('\n=== Cell analysis (background-wrong, best uniform color sim) ===');
for (const [cell, data] of Object.entries(result.analysis)) {
  const refTop = Object.entries(data.refDist).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([k,v])=>`${k}:${v}`).join(', ');
  console.log(`  ${cell}: bgWrong=${data.bgWrong} bgCorrect=${data.bgCorrect} ratio=${(data.bgWrong/(data.bgWrong+data.bgCorrect)*100).toFixed(0)}% bestColor=${data.bestColor} bestNet=${data.bestNet} refTop=[${refTop}]`);
}

console.log('\n=== Full row 2 (y=196-294) sim with color=215 ===', JSON.stringify(result.row2_sim215));
console.log('=== Full row 3 (y=294-392) sim with color=215 ===', JSON.stringify(result.row3_sim215));
console.log('=== Full canvas sim with color=215 ===', JSON.stringify(result.full_sim215));

await browser.close();
