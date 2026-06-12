// Fresh analysis after gate/stand node color changes.
// Goals: identify OUR≈230, OUR≈210, and other ranges causing wrong pixels.
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

        function simColorChange(fR, fG, fB, tR, tG, tB, tol=8) {
          let fixes=0, breaks=0;
          for (let i=0; i<W*H*4; i+=4) {
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (Math.abs(oR-fR)>tol || Math.abs(oG-fG)>tol || Math.abs(oB-fB)>tol) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            const dA=(Math.abs(rR-tR)+Math.abs(rG-tG)+Math.abs(rB-tB))/3;
            if (dB>20 && dA<=20) fixes++;
            else if (dB<=20 && dA>20) breaks++;
          }
          return {fixes,breaks,net:fixes-breaks};
        }

        // Non-standard OUR wrong colors
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
        const nonStdTop = Object.entries(nonStdWrong).sort((a,b)=>b[1]-a[1]).slice(0,16);

        // Grey range → 235 sims
        const greyRangeSims = {};
        for (const [label, from, tol] of [
          ['230', 230, 5],
          ['220', 220, 5],
          ['210', 210, 10],
          ['200', 200, 10],
          ['190', 190, 10],
          ['180', 180, 10],
          ['170', 170, 10],
          ['160', 160, 10],
          ['150', 150, 10],
          ['140', 140, 10],
          ['130', 130, 10],
          ['120', 120, 10],
          ['110', 110, 10],
          ['100', 100, 10],
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

        // For each wrong OUR range: show spatial distribution (which grid cells?)
        // Focus on OUR≈230 and OUR≈210
        const CW=101, CH=98;
        function wrongCellMap(fromBin, tol=10) {
          const cells = {};
          for (let y=0; y<H; y++) {
            for (let x=0; x<W; x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const avg=(oR+oG+oB)/3;
              if (Math.abs(avg-fromBin)>tol) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              if (d>20) {
                const r=Math.floor(y/CH), c=Math.floor(x/CW);
                const key=`r${r}c${c}`;
                cells[key]=(cells[key]||0)+1;
              }
            }
          }
          return Object.entries(cells).sort((a,b)=>b[1]-a[1]).slice(0,10);
        }
        const map230 = wrongCellMap(230, 5);
        const map210 = wrongCellMap(210, 10);
        const map180 = wrongCellMap(180, 10);
        const map160 = wrongCellMap(160, 10);
        const map140 = wrongCellMap(140, 10);
        const map130 = wrongCellMap(130, 10);
        const map120 = wrongCellMap(120, 10);

        // Detailed: for OUR≈230 wrong pixels, show their REF values distribution
        const ref230dist = {};
        for (let i=0; i<W*H*4; i+=4) {
          const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
          const avg=(oR+oG+oB)/3;
          if (Math.abs(avg-230)>5) continue;
          const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if (d>20) {
            const rb=Math.round((rR+rG+rB)/3/10)*10;
            ref230dist[rb]=(ref230dist[rb]||0)+1;
          }
        }

        // Total wrong
        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        // Total background wrong (OUR≈235, REF dark)
        let bgWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
          if (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15) continue;
          const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
          const d=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
          if (d>20) bgWrong++;
        }

        resolve({ totalWrong, bgWrong, nonStdTop, greyRangeSims,
                  map230, map210, map180, map160, map140, map130, map120,
                  ref230dist });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong} (${(result.totalWrong/1145375*100).toFixed(2)}%)`);
console.log(`Background (OUR≈235) wrong: ${result.bgWrong}`);
console.log(`Non-standard wrong: ${result.totalWrong - result.bgWrong}`);

console.log('\n=== Non-standard OUR wrong colors (excluding 235±15 background) ===');
for (const [k,v] of result.nonStdTop) console.log(`  OUR≈${k}: ${v}px`);

console.log('\n=== Grey range → 235 sims ===');
for (const [k,v] of Object.entries(result.greyRangeSims))
  console.log(`  OUR≈${k}→235: fixes=${v.fixes} breaks=${v.breaks} net=${v.net}`);

console.log('\n=== REF dist for OUR≈230 wrong pixels ===');
for (const [k,v] of Object.entries(result.ref230dist).sort((a,b)=>b[1]-a[1]).slice(0,8))
  console.log(`  REF≈${k}: ${v}px`);

console.log('\n=== Spatial distribution of OUR≈230 wrong pixels ===');
for (const [k,v] of result.map230) console.log(`  ${k}: ${v}px`);

console.log('\n=== Spatial distribution of OUR≈210 wrong pixels ===');
for (const [k,v] of result.map210) console.log(`  ${k}: ${v}px`);

console.log('\n=== Spatial distribution of OUR≈180 wrong pixels ===');
for (const [k,v] of result.map180) console.log(`  ${k}: ${v}px`);

console.log('\n=== Spatial distribution of OUR≈160 wrong pixels ===');
for (const [k,v] of result.map160) console.log(`  ${k}: ${v}px`);

console.log('\n=== Spatial distribution of OUR≈140 wrong pixels ===');
for (const [k,v] of result.map140) console.log(`  ${k}: ${v}px`);

console.log('\n=== Spatial distribution of OUR≈130 wrong pixels ===');
for (const [k,v] of result.map130) console.log(`  ${k}: ${v}px`);

console.log('\n=== Spatial distribution of OUR≈120 wrong pixels ===');
for (const [k,v] of result.map120) console.log(`  ${k}: ${v}px`);

await browser.close();
