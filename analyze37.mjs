// Identify source of remaining (235,234,228)-like pixels and other opportunities.
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

        function simColorChange(x0, y0, x1, y1, fR, fG, fB, tR, tG, tB, tol=8) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-fR)>tol || Math.abs(oG-fG)>tol || Math.abs(oB-fB)>tol) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-tR)+Math.abs(rG-tG)+Math.abs(rB-tB))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes,breaks,net:fixes-breaks};
        }

        // Scan r4c2 for pixels close to (235,234,228) — find their actual colors
        const r4c2_scan = {};
        for (let y=392; y<490; y++) {
          for (let x=202; x<303; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)<=8 && Math.abs(oG-234)<=8 && Math.abs(oB-228)<=8) {
              const key=`${oR},${oG},${oB}`;
              r4c2_scan[key]=(r4c2_scan[key]||0)+1;
            }
          }
        }

        // Scan r5c2 similarly
        const r5c2_scan = {};
        for (let y=490; y<588; y++) {
          for (let x=202; x<303; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)<=8 && Math.abs(oG-234)<=8 && Math.abs(oB-228)<=8) {
              const key=`${oR},${oG},${oB}`;
              r5c2_scan[key]=(r5c2_scan[key]||0)+1;
            }
          }
        }

        // Find ALL pixels close to (235,234,228) in full canvas, show their x,y distribution
        const allPx_byRow = new Array(H).fill(0);
        const allPx_byCol = new Array(W).fill(0);
        let fixablePx = 0;
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)<=8 && Math.abs(oG-234)<=8 && Math.abs(oB-228)<=8) {
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
              if (dB>20 && dA<=20) {
                allPx_byRow[y]++;
                allPx_byCol[x]++;
                fixablePx++;
              }
            }
          }
        }

        // Compress: bin by 50-pixel bands
        const rowBins = new Array(18).fill(0), colBins = new Array(27).fill(0);
        for (let y=0; y<H; y++) if(allPx_byRow[y]>0) rowBins[Math.floor(y/50)]+=allPx_byRow[y];
        for (let x=0; x<W; x++) if(allPx_byCol[x]>0) colBins[Math.floor(x/50)]+=allPx_byCol[x];

        // Also: test simColorChange for specific SVG-like colors
        // Terminal #eeefe9 = (238,239,233) → (235,235,235)
        const terminalSim = simColorChange(0,0,W,H, 238,239,233, 235,235,235, 4);
        // Runway #efefef = (239,239,239) → (235,235,235)
        const runwaySim = simColorChange(0,0,W,H, 239,239,239, 235,235,235, 4);
        // South runway #ebebeb = (235,235,235) → anything? Already same.

        // Sweep remaining colors in 240-248 range
        const lightSweep = {};
        for (const [label, [fR,fG,fB]] of Object.entries({
          '240': [240,240,240], '241': [241,241,241], '242': [242,242,242],
          '243': [243,243,243], '244': [244,244,244], '245': [245,245,245],
          '246': [246,246,246], '247': [247,247,247], '248': [248,248,248],
        })) {
          lightSweep[label] = simColorChange(0,0,W,H, fR,fG,fB, 235,235,235, 3);
        }

        // Scan for near-white (240-254) pixels that are wrong
        let nearWhiteWrong = 0, nearWhiteFix = 0;
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (oR>=240 && oG>=240 && oB>=240 && (oR+oG+oB)/3 < 254) {
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              if (d>20) { nearWhiteWrong++; }
              // Could these be fixed by changing to 235?
              const dA=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
              if (d>20 && dA<=20) nearWhiteFix++;
            }
          }
        }

        // Test #eeefe9 (238,239,233) → #ebebeb (235,235,235) with tolerance 5
        const terminal2_sim = simColorChange(0,0,W,H, 238,239,233, 235,235,235, 5);

        resolve({ r4c2_scan, r5c2_scan, fixablePx, rowBins, colBins,
                  terminalSim, runwaySim, lightSweep, nearWhiteWrong, nearWhiteFix,
                  terminal2_sim });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`\n=== r4c2 pixels at (235,234,228)±8 ===`);
for (const [k,v] of Object.entries(result.r4c2_scan).sort((a,b)=>b-a)) console.log(`  (${k}): ${v}px`);

console.log(`\n=== r5c2 pixels at (235,234,228)±8 ===`);
for (const [k,v] of Object.entries(result.r5c2_scan).sort((a,b)=>b-a)) console.log(`  (${k}): ${v}px`);

console.log(`\n=== Fixable pixels at (235,234,228)±8 → (235,235,235): total=${result.fixablePx} ===`);
console.log('Row distribution (bins of 50px):');
for (let i=0; i<18; i++) if(result.rowBins[i]>0) console.log(`  y=${i*50}-${i*50+49}: ${result.rowBins[i]}`);
console.log('Col distribution (bins of 50px):');
for (let i=0; i<27; i++) if(result.colBins[i]>0) console.log(`  x=${i*50}-${i*50+49}: ${result.colBins[i]}`);

console.log('\n=== Terminal #eeefe9 → #ebebeb (tol=4) ===', result.terminalSim);
console.log('=== Terminal #eeefe9 → #ebebeb (tol=5) ===', result.terminal2_sim);
console.log('=== North runway #efefef → #ebebeb (tol=4) ===', result.runwaySim);

console.log('\n=== Light color sweep (240-248 → 235) ===');
for (const [k,v] of Object.entries(result.lightSweep)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log(`\n=== Near-white wrong pixels (OUR=240-254): ${result.nearWhiteWrong} wrong, ${result.nearWhiteFix} fixable by →235 ===`);

await browser.close();
