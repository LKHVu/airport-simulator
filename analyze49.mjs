// Analyze VAECO zone (r3c8-r3c12) and other high-background-wrong areas.
// Goal: understand REF values in background-wrong zones, simulate adding dark shapes.
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

        // Total wrong
        let totalWrong = 0;
        for (let i = 0; i < W*H*4; i += 4) {
          const d = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d > 20) totalWrong++;
        }

        const CW = 101, CH = 98;

        // Per-cell background-wrong count (OUR≈235, REF dark)
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
              const k = `r${r}c${cc}`;
              cellBgWrong[k] = (cellBgWrong[k]||0)+1;
            }
          }
        }
        const topCells = Object.entries(cellBgWrong).sort((a,b)=>b[1]-a[1]).slice(0,20);

        // For VAECO zone r3c8-r3c12: sample REF distribution
        // CMP: r3 = y=294-392, c8-c12 = x=808-1313
        const vaeco_refDist = {};
        for (let y = 294; y < 392; y++) {
          for (let x = 808; x < 1313; x++) {
            const i = (y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)>15) continue; // only background-wrong pixels
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d = (Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
            if (d > 20) {
              const rb = Math.round((rR+rG+rB)/3/10)*10;
              vaeco_refDist[rb] = (vaeco_refDist[rb]||0)+1;
            }
          }
        }

        // Sim: add dark rect in VAECO zone at CMP (808,294)-(1313,392) with color matching REF avg
        // Simulate adding color=80 (our=80, matching REF≈80 range)
        function simAddRect(x0, y0, x1, y1, targetAvg, tol=15) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i = (y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15) continue; // only change background pixels
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB = (Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              // After change OUR→targetAvg
              const dA = (Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes, breaks, net: fixes-breaks};
        }

        // Try full VAECO r3 zone (808-1313, 294-392) with different target colors
        const vaeco_sim80 = simAddRect(808, 294, 1313, 392, 80);
        const vaeco_sim100 = simAddRect(808, 294, 1313, 392, 100);
        const vaeco_sim120 = simAddRect(808, 294, 1313, 392, 120);
        const vaeco_sim150 = simAddRect(808, 294, 1313, 392, 150);
        const vaeco_sim170 = simAddRect(808, 294, 1313, 392, 170);
        const vaeco_sim200 = simAddRect(808, 294, 1313, 392, 200);

        // Try narrower range: only pixels where REF avg < 150 (the truly dark ones)
        // Simulate a TARGETED color change: if REF<150, set OUR=80; only on background pixels
        let targetedFixes=0, targetedBreaks=0;
        for (let y=294; y<392; y++) {
          for (let x=808; x<1313; x++) {
            const i = (y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const rAvg = (rR+rG+rB)/3;
            const dB = (Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            const targetAvg = rAvg; // match REF exactly
            const dA = (Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
            if (rAvg < 215) { // would become non-background
              if (dB > 20 && dA <= 20) targetedFixes++;
              else if (dB <= 20 && dA > 20) targetedBreaks++;
            }
          }
        }

        // Sample REF at specific subregions of VAECO r3 for shape guidance
        // Divide VAECO into 5 columns (c8-c12) × vertical thirds (r3 top/mid/bot)
        const vaeco_grid = {};
        for (let r = 0; r < 3; r++) {
          for (let cc = 8; cc <= 12; cc++) {
            const x0 = cc*CW, x1 = (cc+1)*CW;
            const y0 = 294 + r*Math.floor(98/3);
            const y1 = 294 + (r+1)*Math.floor(98/3);
            let darkCount=0, lightCount=0;
            for (let y=y0; y<Math.min(y1,H); y++) {
              for (let x=x0; x<Math.min(x1,W); x++) {
                const i=(y*W+x)*4;
                const rAvg=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
                if (rAvg < 150) darkCount++;
                else lightCount++;
              }
            }
            vaeco_grid[`r3${r}_c${cc}`] = {dark: darkCount, light: lightCount, total: darkCount+lightCount};
          }
        }

        // Also check row 4 for r4c8-r4c12 background wrong pixels
        const r4_c8to12_bg = {};
        for (let cc = 8; cc <= 12; cc++) {
          const x0=cc*CW, x1=(cc+1)*CW;
          let bgWrong=0, total=0;
          for (let y=392; y<490; y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              total++;
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
              if (d>20) bgWrong++;
            }
          }
          r4_c8to12_bg[`r4c${cc}`] = bgWrong;
        }

        // Sample 20 background-wrong pixels in VAECO zone with their exact CMP coords and REF values
        const vaeco_samples = [];
        for (let y=294; y<392 && vaeco_samples.length<30; y++) {
          for (let x=808; x<1313 && vaeco_samples.length<30; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-235)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
            if (d>20) vaeco_samples.push({x,y,oR,oG,oB,rR,rG,rB,rAvg:Math.round((rR+rG+rB)/3)});
          }
        }

        resolve({
          totalWrong, topCells,
          vaeco_refDist,
          vaeco_sim80, vaeco_sim100, vaeco_sim120, vaeco_sim150, vaeco_sim170, vaeco_sim200,
          targetedFixes, targetedBreaks,
          vaeco_grid, r4_c8to12_bg,
          vaeco_samples,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong} (${(result.totalWrong/1145375*100).toFixed(2)}%)`);

console.log('\n=== Top cells by background-wrong pixel count ===');
for (const [k,v] of result.topCells) console.log(`  ${k}: ${v}px`);

console.log('\n=== REF distribution for VAECO r3 background-wrong pixels (OUR=235, REF dark) ===');
for (const [k,v] of Object.entries(result.vaeco_refDist).sort((a,b)=>+b-+a))
  console.log(`  REF≈${k}: ${v}px`);

console.log('\n=== Sim: add uniform color to VAECO r3 (CMP 808-1313, 294-392) ===');
console.log('  color=80:', JSON.stringify(result.vaeco_sim80));
console.log('  color=100:', JSON.stringify(result.vaeco_sim100));
console.log('  color=120:', JSON.stringify(result.vaeco_sim120));
console.log('  color=150:', JSON.stringify(result.vaeco_sim150));
console.log('  color=170:', JSON.stringify(result.vaeco_sim170));
console.log('  color=200:', JSON.stringify(result.vaeco_sim200));

console.log('\n=== Targeted sim: match REF exactly for all dark pixels in VAECO r3 ===');
console.log(`  fixes=${result.targetedFixes} breaks=${result.targetedBreaks} net=${result.targetedFixes-result.targetedBreaks}`);

console.log('\n=== VAECO r3 sub-grid: dark vs light pixel counts in REF ===');
for (const [k,v] of Object.entries(result.vaeco_grid))
  console.log(`  ${k}: dark=${v.dark} light=${v.light} (${Math.round(v.dark/v.total*100)}% dark)`);

console.log('\n=== r4c8-r4c12 background-wrong counts ===');
for (const [k,v] of Object.entries(result.r4_c8to12_bg))
  console.log(`  ${k}: ${v}px`);

console.log('\n=== Sample VAECO background-wrong pixels ===');
for (const s of result.vaeco_samples)
  console.log(`  CMP(${s.x},${s.y}) OUR=(${s.oR},${s.oG},${s.oB}) REF=(${s.rR},${s.rG},${s.rB}) rAvg=${s.rAvg}`);

await browser.close();
