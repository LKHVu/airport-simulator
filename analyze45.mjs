// Fresh analysis of remaining wrong pixels after node color + black rect changes.
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
          return {total, hist: Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,8)};
        }

        // Grid scan top 20
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
            if (wrong>500) gridStats.push({r,c,wrong});
          }
        }
        gridStats.sort((a,b)=>b.wrong-a.wrong);

        // Non-standard OUR wrong colors (after changes)
        const nonStdWrong = {};
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) {
              const ob=(oR+oG+oB)/3;
              if (Math.abs(ob-235)<=15) continue; // skip background
              const obBin=Math.round(ob/10)*10;
              nonStdWrong[obBin]=(nonStdWrong[obBin]||0)+1;
            }
          }
        }
        const nonStdTop = Object.entries(nonStdWrong).sort((a,b)=>b[1]-a[1]).slice(0,12);

        // Mid-grey sims including new values
        const greyRangeSims = {};
        for (const [label, from, tol] of [
          ['160', 160, 10], ['170', 170, 10], ['180', 180, 10],
          ['140', 140, 10], ['130', 130, 10], ['120', 120, 10],
          ['150', 150, 10], ['200', 200, 10], ['210', 210, 10],
          ['230', 230, 5],
        ]) {
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
          greyRangeSims[label]={fixes:f,breaks:b,net:f-b};
        }

        // Check node colors: gate('#c0a870')→ lighter?
        // gate: R=192,G=168,B=112. With opacity=0.75 over bg=235: R≈203, G≈185, B≈143. Avg≈177→bin 180.
        const gateSim = simColorChange(0,0,W,H, 192,168,112, 235,235,235, 15);
        // gate with opacity=0.75 over 235: (203,185,143) → 235
        const gateOpSim = simColorChange(0,0,W,H, 203,185,143, 235,235,235, 15);

        // stand('#7a6e58') with opacity=0.75 over 235: (0.75×122+59=151, 0.75×110+59=141, 0.75×88+59=125) → (151,141,125). Avg≈139.
        const standOpSim = simColorChange(0,0,W,H, 151,141,125, 235,235,235, 15);

        // runway_exit('#e06010') circle: orange. With opacity=0.75: (0.75×224+59=227, 0.75×96+59=131, 0.75×16+59=71). Avg≈143.
        const runwayExitSim = simColorChange(0,0,W,H, 227,131,71, 235,235,235, 20);

        // OUR=230→235 sim
        const grey230to235 = simColorChange(0,0,W,H, 230,230,230, 235,235,235, 5);

        // Also check: do any stand label texts create wrong pixels?
        // '#555555'=(85,85,85) text over bg=235 with opacity=0.9: would be partially blended
        // Small labels, hard to sim.

        // Total wrong
        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({ totalWrong, gridStats: gridStats.slice(0,15), nonStdTop, greyRangeSims,
                  gateSim, gateOpSim, standOpSim, runwayExitSim, grey230to235 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== Top wrong cells ===');
for (const s of result.gridStats) console.log(`  r${s.r}c${s.c}: ${s.wrong}`);

console.log('\n=== Non-standard OUR wrong colors ===');
for (const [k,v] of result.nonStdTop) console.log(`  OUR≈${k}: ${v}px`);

console.log('\n=== Grey range → 235 sims ===');
for (const [k,v] of Object.entries(result.greyRangeSims)) console.log(`  OUR≈${k}→235: ${JSON.stringify(v)}`);

console.log('\n=== Gate circle (raw fill → 235) sim ===', JSON.stringify(result.gateSim));
console.log('=== Gate circle (opacity-blended → 235) sim ===', JSON.stringify(result.gateOpSim));
console.log('=== Stand circle (opacity-blended → 235) sim ===', JSON.stringify(result.standOpSim));
console.log('=== RunwayExit circle (opacity-blended → 235) sim ===', JSON.stringify(result.runwayExitSim));
console.log('=== OUR=230→235 sim ===', JSON.stringify(result.grey230to235));

await browser.close();
