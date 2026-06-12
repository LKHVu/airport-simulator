// Re-analyze after terminal change. Focus on remaining high-wrong cells.
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

        function wrongColorHist(x0,y0,x1,y1) {
          const hist = {};
          let total=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              if (d>20) {
                total++;
                const ob=Math.round((oR+oG+oB)/3/10)*10;
                const rb=Math.round((rR+rG+rB)/3/10)*10;
                const key=`OUR${ob}→REF${rb}`;
                hist[key]=(hist[key]||0)+1;
              }
            }
          }
          return {total, hist: Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,10)};
        }

        // Grid scan: top 20 worst cells
        const CW=101, CH=98;
        const gridStats = [];
        for (let r=0; r<9; r++) {
          for (let c=0; c<13; c++) {
            const x0=c*CW, y0=r*CH, x1=Math.min((c+1)*CW,W), y1=Math.min((r+1)*CH,H);
            let wrong=0;
            for (let y=y0; y<y1; y++) {
              for (let x=x0; x<x1; x++) {
                const i=(y*W+x)*4;
                const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
                if (d>20) wrong++;
              }
            }
            if (wrong>100) gridStats.push({r,c,wrong});
          }
        }
        gridStats.sort((a,b)=>b.wrong-a.wrong);

        // Analyze top problematic cells
        const cellHists = {};
        for (const s of gridStats.slice(0,12)) {
          cellHists[`r${s.r}c${s.c}`] = wrongColorHist(s.c*CW, s.r*CH, (s.c+1)*CW, (s.r+1)*CH);
        }

        // r4c4 specifically: what's there? Sim: add black elements
        // SVG x=370-463, y=385-481. OUR=235 (grey bg) but REF=0 (black).
        // Could we place a black rect there?
        const r4c4_sim_addBlack = simColorChange(404, 392, 505, 490, 235, 235, 235, 0, 0, 0, 5);
        // But this would be terrible — makes all grey→black, breaks all REF=255.

        // More targeted: what if we just look at exactly what cells have a specific SVG element?
        // The VAECO east taxiway edges pass through many cells. What color are VAECO taxiway edges?
        // SVG taxiway type: I know TAXIWAY edges exist with color from EdgeType.
        // Let me scan OUR colors in r3c9-r3c12 area
        function ourColorDist(x0,y0,x1,y1) {
          const hist={};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const ob=Math.round((ourPx.data[i]+ourPx.data[i+1]+ourPx.data[i+2])/3/10)*10;
              hist[ob]=(hist[ob]||0)+1;
            }
          }
          return Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,8);
        }

        // Check r3c9-r3c12 OUR distribution
        const r3c9_our = ourColorDist(909,294,1010,392);
        const r3c11_our = ourColorDist(1111,294,1212,392);

        // Check if taxiway color in those cells can be targeted
        // The VAECO taxiway edges appear to have OUR≈50-130 (dark grey/ASPHALT)
        // Test: what if we change a specific non-#444 dark grey in eastern strip?

        // Scan for OUR≈70-130 wrong pixels in the r3c9-r3c12 INTL/VAECO zone
        let taxiway_wrong = 0;
        const taxiway_refDist = {};
        for (let y=294; y<392; y++) {
          for (let x=909; x<1309; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const ob=(oR+oG+oB)/3;
            if (ob>=50 && ob<=150) {
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              if (d>20) {
                taxiway_wrong++;
                const rb=Math.round((rR+rG+rB)/3/10)*10;
                taxiway_refDist[rb]=(taxiway_refDist[rb]||0)+1;
              }
            }
          }
        }

        // What if the #d8d9d0 appears in r3c6 as well? Let's see current OUR=210 wrong pixels remaining
        const r3c6_hist = wrongColorHist(606,294,707,392);
        const r3c5_hist = wrongColorHist(505,294,606,392);
        const r4c5_hist = wrongColorHist(505,392,606,490);

        // r2c0 strip: what IS at SVG x=0-93, y=193-289?
        // OUR dist shows 240:8355 (most are background) and 190:1214 (some mid-grey)
        // What's at OUR=190 there?
        const r2c0_190sim = simColorChange(0,196,101,294, 190,190,190, 235,235,235, 8);
        const r2c1_190sim = simColorChange(101,196,202,294, 190,190,190, 235,235,235, 8);

        // Total wrong
        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({ totalWrong, gridStats: gridStats.slice(0,20), cellHists,
                  r4c4_sim_addBlack, r3c9_our, r3c11_our,
                  taxiway_wrong, taxiway_refDist,
                  r3c6_hist, r3c5_hist, r4c5_hist,
                  r2c0_190sim, r2c1_190sim });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== Top wrong cells ===');
for (const s of result.gridStats) console.log(`  r${s.r}c${s.c}: ${s.wrong}`);

console.log('\n=== Cell histograms (wrong pixels) ===');
for (const [cell, h] of Object.entries(result.cellHists)) {
  console.log(`  ${cell} (${h.total} wrong):`);
  for (const [k,v] of h.hist) console.log(`    ${k}: ${v}px`);
}

console.log('\n=== r3c9 OUR distribution ===');
for (const [k,v] of result.r3c9_our) console.log(`  ≈${k}: ${v}px`);

console.log('\n=== r3c11 OUR distribution ===');
for (const [k,v] of result.r3c11_our) console.log(`  ≈${k}: ${v}px`);

console.log(`\nEastern strip (y=294-392, x=909-1309) mid-dark (50-150) wrong pixels: ${result.taxiway_wrong}`);
console.log('REF dist for those:');
for (const [k,v] of Object.entries(result.taxiway_refDist).sort((a,b)=>b[1]-a[1]).slice(0,8))
  console.log(`  REF≈${k}: ${v}`);

console.log('\n=== r3c6 wrong ===');
console.log(result.r3c6_hist.total, result.r3c6_hist.hist.map(([k,v])=>`${k}:${v}`).join(', '));
console.log('\n=== r3c5 wrong ===');
console.log(result.r3c5_hist.total, result.r3c5_hist.hist.map(([k,v])=>`${k}:${v}`).join(', '));
console.log('\n=== r4c5 wrong ===');
console.log(result.r4c5_hist.total, result.r4c5_hist.hist.map(([k,v])=>`${k}:${v}`).join(', '));

console.log('\n=== r2c0 OUR≈190 → 235 sim ===', JSON.stringify(result.r2c0_190sim));
console.log('=== r2c1 OUR≈190 → 235 sim ===', JSON.stringify(result.r2c1_190sim));

await browser.close();
