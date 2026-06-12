// Find exact positions of dark REF features in background-wrong cells.
// Goal: identify shapes to draw (rows/columns of dark pixels that form lines/rects).
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

        // For each background-wrong pixel, bucket by REF value and get row/column histograms
        function cellDarkMap(x0, y0, x1, y1, refThresh=80) {
          // Returns row histogram (y→count) and col histogram (x→count) for REF < refThresh
          const rows = {};
          const cols = {};
          const bands = []; // continuous x-runs of dark pixels at each y
          for (let y=y0; y<Math.min(y1,H); y++) {
            let runStart = -1;
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15) { if (runStart>=0) { bands.push({y,x0:runStart,x1:x-1}); runStart=-1; } continue; }
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const rAvg=(rR+rG+rB)/3;
              if (rAvg < refThresh) {
                rows[y]=(rows[y]||0)+1;
                cols[x]=(cols[x]||0)+1;
                if (runStart<0) runStart=x;
              } else {
                if (runStart>=0) { bands.push({y,x0:runStart,x1:x-1}); runStart=-1; }
              }
            }
            if (runStart>=0) { bands.push({y,x0:runStart,x1:x1-1}); runStart=-1; }
          }
          return { rows, cols, bands };
        }

        // Investigate r4c4 (CMP x=404-505, y=392-490): has 658px REF≈0 wrong pixels
        const r4c4 = cellDarkMap(404, 392, 505, 490, 50);

        // Investigate r5c9 (CMP x=909-1010, y=490-588): has 803px REF≈0 wrong pixels
        const r5c9 = cellDarkMap(909, 490, 1010, 588, 50);

        // Investigate r2c9 (CMP x=909-1010, y=196-294): has 206px REF≈0 wrong pixels
        const r2c9 = cellDarkMap(909, 196, 1010, 294, 50);

        // Investigate r2c10 (CMP x=1010-1111, y=196-294): has 159px REF≈0 wrong pixels
        const r2c10 = cellDarkMap(1010, 196, 1111, 294, 50);

        // Investigate r4c9 (CMP x=909-1010, y=392-490): has 310px REF≈0 wrong pixels
        const r4c9 = cellDarkMap(909, 392, 1010, 490, 50);

        // Investigate r2c0 (CMP x=0-101, y=196-294): has 340px REF≈190 wrong pixels
        const r2c0_light = cellDarkMap(0, 196, 101, 294, 215);

        // Also: look for dark LINES (many pixels at same y) in VAECO area r3c8-r3c12
        const vaeco_r3_dark = cellDarkMap(808, 294, 1313, 392, 50);

        // Sim: targeted dark feature rects based on patterns
        // Try: draw black line at CMP y=294, x=808-1313 (top edge of VAECO r3 zone)
        function simAddLine(x0, y0, x1, y1_range, targetAvg) {
          let f=0, b=0;
          for (let y=y0; y<=y1_range; y++) {
            for (let x=x0; x<=x1; x++) {
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
          return {fixes:f,breaks:b,net:f-b};
        }

        // Check if VAECO row has concentrated dark lines (horizontal bands)
        // Row histograms for VAECO dark pixels
        const vaeco_r3_rowHist = vaeco_r3_dark.rows;
        const vaeco_r3_colHist = vaeco_r3_dark.cols;

        // r4c4 row histogram
        const r4c4_rowHist = r4c4.rows;
        const r4c4_colHist = r4c4.cols;

        // r5c9 row histogram
        const r5c9_rowHist = r5c9.rows;
        const r5c9_colHist = r5c9.cols;

        // Total wrong
        let totalWrong = 0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong,
          r4c4_rowHist, r4c4_colHist,
          r5c9_rowHist, r5c9_colHist,
          r2c9: { rows: r2c9.rows, cols: r2c9.cols },
          r2c10: { rows: r2c10.rows, cols: r2c10.cols },
          r4c9: { rows: r4c9.rows, cols: r4c9.cols },
          r2c0_light: { rows: r2c0_light.rows, cols: r2c0_light.cols },
          vaeco_r3_rowHist, vaeco_r3_colHist,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

function printHist(label, hist, topN=20) {
  const entries = Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const total = entries.reduce((s,[,v])=>s+v,0);
  console.log(`\n${label} (total dark: ${total} pixels):`);
  // Compact: show 10 at a time
  for (let i=0; i<entries.length; i+=10) {
    const chunk = entries.slice(i,i+10).map(([k,v])=>`${k}:${v}`).join(' ');
    console.log(`  [${i}-${i+9}]: ${chunk}`);
  }
}

printHist('r4c4 row histogram (y→dark count)', result.r4c4_rowHist);
printHist('r4c4 col histogram (x→dark count)', result.r4c4_colHist);
printHist('r5c9 row histogram (y→dark count)', result.r5c9_rowHist);
printHist('r5c9 col histogram (x→dark count)', result.r5c9_colHist);
printHist('r2c9 row histogram (y→dark count)', result.r2c9.rows);
printHist('r2c9 col histogram (x→dark count)', result.r2c9.cols);
printHist('r2c10 row histogram (y→dark count)', result.r2c10.rows);
printHist('r2c10 col histogram (x→dark count)', result.r2c10.cols);
printHist('r4c9 row histogram (y→dark count)', result.r4c9.rows);
printHist('VAECO r3 row histogram (y→dark count)', result.vaeco_r3_rowHist);
printHist('VAECO r3 col histogram (x→dark count)', result.vaeco_r3_colHist);

await browser.close();
