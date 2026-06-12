// Fresh analysis after taxiway band + r4c4 + r4c9 fixes.
// Find next best improvements.
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

        // Per-cell background-wrong count
        const cellBgWrong = {};
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d = (Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
            if (d > 20) {
              const r = Math.floor(y/CH), cc = Math.floor(x/CW);
              cellBgWrong[`r${r}c${cc}`] = (cellBgWrong[`r${r}c${cc}`]||0)+1;
            }
          }
        }
        const topCells = Object.entries(cellBgWrong).sort((a,b)=>b[1]-a[1]).slice(0,20);

        // Non-standard wrong (not background)
        let nonStdWrong = 0, bgWrong = 0;
        let totalWrong = 0;
        for (let i = 0; i < W*H*4; i += 4) {
          const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
          const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
          const d = (Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if (d > 20) {
            totalWrong++;
            if (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15)
              nonStdWrong++;
            else
              bgWrong++;
          }
        }

        // Sim function: change OUR to targetAvg in SVG rect, only background pixels
        function simSvgRect(svgX0, svgY0, svgX1, svgY1, targetAvg, bgOnly=true) {
          const x0=Math.floor(svgX0*1309/1200), y0=Math.floor(svgY0*875/860);
          const x1=Math.ceil(svgX1*1309/1200), y1=Math.ceil(svgY1*875/860);
          let f=0, b=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (bgOnly && (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15)) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20 && dA<=20) f++;
              else if (dB<=20 && dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        }

        // Dark feature row histograms for top non-VAECO cells
        function darkRowHist(x0, y0, x1, y1, refThresh=80) {
          const rows = {};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const rAvg=(rR+rG+rB)/3;
              if (rAvg < refThresh) rows[y]=(rows[y]||0)+1;
            }
          }
          return rows;
        }
        function darkColHist(x0, y0, x1, y1, refThresh=80) {
          const cols = {};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const rAvg=(rR+rG+rB)/3;
              if (rAvg < refThresh) cols[x]=(cols[x]||0)+1;
            }
          }
          return cols;
        }

        // Investigate r4c4 remaining dark pixels (did our fix help?)
        const r4c4_rows = darkRowHist(404, 392, 505, 490);
        const r4c4_cols = darkColHist(404, 392, 505, 490);

        // Check r5c9 (CMP 909-1010, 490-588)
        const r5c9_rows = darkRowHist(909, 490, 1010, 588);
        const r5c9_cols = darkColHist(909, 490, 1010, 588);

        // Investigate r2c0 (CMP 0-101, 196-294) - 1941px bg wrong
        const r2c0_rows = darkRowHist(0, 196, 101, 294);
        const r2c0_cols = darkColHist(0, 196, 101, 294);

        // Investigate r4c4 at broader threshold (including medium-dark)
        const r4c4_medium = darkRowHist(404, 392, 505, 490, 150);

        // Sims for promising patterns
        // r2c0: CMP (0-101, 196-294) → SVG (0-93, 193-289)
        // Check the dark region - might be left runway/taxiway area
        const r2c0_sim = simSvgRect(0, 193, 93, 289, 17);

        // r5c9 left column sim: x=909-919 → SVG x=833-844, y=490-520 → SVG y=482-509
        // (already tried above with breaks=307, net=-291)
        // Try narrower: x=909-915 only
        const r5c9_narrow = simSvgRect(833, 482, 840, 509, 17);

        // Try: extend existing r4c9 black feature downward (SVG x=860-925, y=464-490)
        const r4c9_ext = simSvgRect(860, 464, 925, 490, 17);

        // Also try broader area around r4c4 block we added: adjacent cells
        // r4c5 (CMP 505-606, 392-490): SVG (465-555, 387-480)
        const r4c5_sim = simSvgRect(465, 387, 555, 480, 17);

        // Check grey infield rects (c0c0c0 = 192,192,192):
        // SVG x=22-44, y=221-245 and x=65-247, y=221-245
        // These show as OUR≈192. Need to check if they create non-standard wrong pixels.
        // Actually not background, so not in bgWrong category.

        // What about removing or changing those grey rects?
        // If changed to #111111, sim would be on the grey pixels (OUR≈192)
        function simGreyRect(svgX0, svgY0, svgX1, svgY1, targetAvg) {
          const x0=Math.floor(svgX0*1309/1200), y0=Math.floor(svgY0*875/860);
          const x1=Math.ceil(svgX1*1309/1200), y1=Math.ceil(svgY1*875/860);
          let f=0, b=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              // Include grey pixels (OUR≈192)
              if (Math.abs(oR-192)>20 && Math.abs(oR-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20 && dA<=20) f++;
              else if (dB<=20 && dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        }

        // Grey infield rect 1: x=22-44, y=221-245
        const greyRect1_to_dark = simGreyRect(22, 221, 44, 246, 17);
        const greyRect1_to_bg = simGreyRect(22, 221, 44, 246, 235);
        // Grey infield rect 2: x=65-247, y=221-245
        const greyRect2_to_dark = simGreyRect(65, 221, 247, 246, 17);
        const greyRect2_to_bg = simGreyRect(65, 221, 247, 246, 235);

        // r2c0 dark features: show row histogram more carefully
        // Also check what REF values exist at those positions
        const r2c0_refDist = {};
        for (let y=196; y<294; y++) {
          for (let x=0; x<101; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
            if (d>20) {
              const rb=Math.round((rR+rG+rB)/3/10)*10;
              r2c0_refDist[rb]=(r2c0_refDist[rb]||0)+1;
            }
          }
        }

        // Targeted sims for specific shapes that might help
        // Based on row histograms we'll see the best targets

        resolve({
          totalWrong, bgWrong, nonStdWrong, topCells,
          r4c4_rows, r4c4_cols, r5c9_rows, r5c9_cols,
          r2c0_rows, r2c0_cols, r4c4_medium,
          r2c0_sim, r5c9_narrow, r4c9_ext, r4c5_sim,
          greyRect1_to_dark, greyRect1_to_bg,
          greyRect2_to_dark, greyRect2_to_bg,
          r2c0_refDist,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong} (${(result.totalWrong/1145375*100).toFixed(2)}%)`);
console.log(`Background wrong: ${result.bgWrong}  Non-standard: ${result.nonStdWrong}`);

console.log('\n=== Top cells by background-wrong pixel count ===');
for (const [k,v] of result.topCells) console.log(`  ${k}: ${v}px`);

function compactHist(hist, label) {
  const entries = Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const total = entries.reduce((s,[,v])=>s+v,0);
  const top = entries.sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label} (total=${total}): top15=[${top}]`);
}

console.log('\n=== r4c4 dark row hist (remaining after fix) ===');
compactHist(result.r4c4_rows, 'rows'); compactHist(result.r4c4_cols, 'cols');
console.log('=== r4c4 medium threshold (REF<150) ===');
compactHist(result.r4c4_medium, 'rows');
console.log('=== r5c9 dark row/col hist ===');
compactHist(result.r5c9_rows, 'rows'); compactHist(result.r5c9_cols, 'cols');
console.log('=== r2c0 dark row/col hist ===');
compactHist(result.r2c0_rows, 'rows'); compactHist(result.r2c0_cols, 'cols');

console.log('\n=== REF dist for r2c0 background-wrong pixels ===');
for (const [k,v] of Object.entries(result.r2c0_refDist).sort((a,b)=>+b-+a))
  console.log(`  REF≈${k}: ${v}px`);

console.log('\n=== Targeted sims ===');
console.log('  r2c0 full cell (dark):', JSON.stringify(result.r2c0_sim));
console.log('  r5c9 narrow x=833-840:', JSON.stringify(result.r5c9_narrow));
console.log('  r4c9 ext (860-925, 464-490):', JSON.stringify(result.r4c9_ext));
console.log('  r4c5 full (465-555, 387-480):', JSON.stringify(result.r4c5_sim));
console.log('  Grey rect1 (x=22-44, y=221-246) → dark:', JSON.stringify(result.greyRect1_to_dark));
console.log('  Grey rect1 → bg(235):', JSON.stringify(result.greyRect1_to_bg));
console.log('  Grey rect2 (x=65-247, y=221-246) → dark:', JSON.stringify(result.greyRect2_to_dark));
console.log('  Grey rect2 → bg(235):', JSON.stringify(result.greyRect2_to_bg));

await browser.close();
