// Targeted sims: ExtraTaxiwayLines removal, TaxiwayLabel changes, dark range sims.
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

        function simToGrey(from, tol, label='') {
          let f=0, b=0;
          for (let i=0; i<W*H*4; i+=4) {
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (Math.abs(avg-from)>tol) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            const dA=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
            if (dB>20 && dA<=20) f++;
            else if (dB<=20 && dA>20) b++;
          }
          return {fixes:f,breaks:b,net:f-b};
        }

        // Dark range sims OUR≈0-100 → 235
        const darkSims = {};
        for (const [from, tol] of [[10,8],[20,8],[30,8],[40,8],[50,8],[60,8],[70,8],[80,8],[90,8]]) {
          darkSims[from] = simToGrey(from, tol);
        }

        // ExtraTaxiwayLines uses stroke='#1e1e1e'=(30,30,30), strokeWidth=5, opacity=0.9
        // At full stroke coverage: OUR = 0.9×30+0.1×235=50.5≈51. NOT 30!
        // Let me check: with g opacity=0.9 on the entire group:
        // The ASPH='#1e1e1e' is the stroke fill. With g opacity=0.9:
        // Interior (full coverage): OUR = 0.9×30+0.1×235=50.5≈51.
        // Anti-aliased edge (50%): OUR = 0.9×0.5×30+0.9×0.5×235+0.1×235=13.5+105.75+23.5=142.75≈143.
        // Outer fringe (5%): OUR = 0.9×0.05×30+0.9×0.95×235+0.1×235=1.35+200.925+23.5=225.775≈226.

        // So ExtraTaxiwayLines interior creates OUR≈51 (bin 50)
        // Let's check OUR≈51→235 sim
        const extraLinesSim_51 = simToGrey(51, 8);

        // TaxiwayLabels use fill="#444"=(68,68,68) opacity=0.9
        // Interior: OUR = 0.9×68+0.1×235=84.7≈85 (bin 80-90)
        // At row 2 area: all labels are y=130-242
        // Sim changing OUR≈85→235 in row 2 area only
        const labelInteriorSim = simToGrey(85, 8);

        // Precisely: which cells contain OUR≈50-90 wrong pixels?
        const cellMap = {};
        const CW=101, CH=98;
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (avg<10 || avg>100) continue; // focus on 10-100 range
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) {
              const r=Math.floor(y/CH), cc=Math.floor(x/CW);
              const k=`r${r}c${cc}`;
              if (!cellMap[k]) cellMap[k]={};
              const bin=Math.round(avg/10)*10;
              cellMap[k][bin]=(cellMap[k][bin]||0)+1;
            }
          }
        }
        // Top cells for OUR=10-100 wrong pixels
        const topCells10_100 = Object.entries(cellMap)
          .map(([k,v])=>({k, total:Object.values(v).reduce((a,b)=>a+b,0), bins:v}))
          .sort((a,b)=>b.total-a.total).slice(0,12);

        // Check OUR≈20,30,40 specifically
        const darkRefDist = {};
        for (let i=0; i<W*H*4; i+=4) {
          const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
          const avg=(oR+oG+oB)/3;
          if (avg>50) continue; // focus on very dark
          const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if (d>20) {
            const rb=Math.round((rR+rG+rB)/3/10)*10;
            const key=`OUR${Math.round(avg/10)*10}→REF${rb}`;
            darkRefDist[key]=(darkRefDist[key]||0)+1;
          }
        }
        const topDarkDist = Object.entries(darkRefDist).sort((a,b)=>b[1]-a[1]).slice(0,12);

        // Sim: OUR in row 2 (CMP y=196-294) range 80-230 → 235
        // This would simulate making TaxiwayLabels invisible
        let row2_labelFix=0, row2_labelBreak=0;
        for (let y=196; y<294; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (avg<75 || avg>234) continue; // skip very dark and pure background
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            const dA=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
            if (dB>20 && dA<=20) row2_labelFix++;
            else if (dB<=20 && dA>20) row2_labelBreak++;
          }
        }

        // Sim: OUR in row 1 (CMP y=98-196) range 80-220 → 235 (north labels/markers)
        let row1_labelFix=0, row1_labelBreak=0;
        for (let y=98; y<196; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (avg<75 || avg>219) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            const dA=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
            if (dB>20 && dA<=20) row1_labelFix++;
            else if (dB<=20 && dA>20) row1_labelBreak++;
          }
        }

        // Sim: OUR overall range 75-219 → 235 (excluding runway correct OUR=185-215)
        // This simulates making ALL non-runway elements invisible
        let overallLabelFix=0, overallLabelBreak=0;
        for (let i=0; i<W*H*4; i+=4) {
          const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
          const avg=(oR+oG+oB)/3;
          if (avg<75 || avg>219 || (avg>=185 && avg<=210)) continue; // skip 185-210
          const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
          const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          const dA=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
          if (dB>20 && dA<=20) overallLabelFix++;
          else if (dB<=20 && dA>20) overallLabelBreak++;
        }

        // Sample exact coordinates of OUR≈210 wrong pixels in r4c2 (CMP x=202-303, y=392-490)
        const r4c2_samples = [];
        for (let y=392; y<490 && r4c2_samples.length<20; y++) {
          for (let x=202; x<303 && r4c2_samples.length<20; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (Math.abs(avg-210)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) r4c2_samples.push({x, y, oR, oG, oB, rR, rG, rB, d: Math.round(d)});
          }
        }

        // Total wrong
        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({ totalWrong, darkSims, extraLinesSim_51, labelInteriorSim,
                  topCells10_100, topDarkDist,
                  row2_labelFix, row2_labelBreak,
                  row1_labelFix, row1_labelBreak,
                  overallLabelFix, overallLabelBreak,
                  r4c2_samples });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== Dark range sims (OUR≈10-90 → 235) ===');
for (const [k,v] of Object.entries(result.darkSims))
  console.log(`  OUR≈${k}→235: fixes=${v.fixes} breaks=${v.breaks} net=${v.net}`);

console.log('\n=== ExtraLines interior (OUR≈51→235) ===', JSON.stringify(result.extraLinesSim_51));
console.log('=== TaxiLabel interior (OUR≈85→235) ===', JSON.stringify(result.labelInteriorSim));

console.log('\n=== Dark wrong (OUR=0-50) REF distribution ===');
for (const [k,v] of result.topDarkDist) console.log(`  ${k}: ${v}px`);

console.log('\n=== Top cells with OUR≈10-100 wrong pixels ===');
for (const cell of result.topCells10_100)
  console.log(`  ${cell.k} (${cell.total} total): ${JSON.stringify(cell.bins)}`);

console.log('\n=== Row 2 non-background range (OUR=75-234 → 235) sim ===');
console.log(`  fixes=${result.row2_labelFix} breaks=${result.row2_labelBreak} net=${result.row2_labelFix - result.row2_labelBreak}`);

console.log('\n=== Row 1 non-background range (OUR=75-219 → 235) sim ===');
console.log(`  fixes=${result.row1_labelFix} breaks=${result.row1_labelBreak} net=${result.row1_labelFix - result.row1_labelBreak}`);

console.log('\n=== Overall non-runway non-background (OUR=75-219 excl 185-210 → 235) sim ===');
console.log(`  fixes=${result.overallLabelFix} breaks=${result.overallLabelBreak} net=${result.overallLabelFix - result.overallLabelBreak}`);

console.log('\n=== r4c2 OUR≈210 wrong pixel samples ===');
for (const s of result.r4c2_samples)
  console.log(`  CMP(${s.x},${s.y}) OUR=(${s.oR},${s.oG},${s.oB}) REF=(${s.rR},${s.rG},${s.rB}) diff=${s.d}`);

await browser.close();
