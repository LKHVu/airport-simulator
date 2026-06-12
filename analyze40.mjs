// Targeted simulation: darken VAECO/INTL zone from #ebebeb to darker greys.
// Key finding: OUR≈235 but REF≈180-210 in r3c7-r4c12 area → too bright.
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

        // Simulate changing pixels with OUR≈235 in a specific region to new grey value
        function simGrey(x0, y0, x1, y1, newV, tol=5) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              // Only change pixels that are currently at 235 grey
              if (Math.abs(oR-235)>tol || Math.abs(oG-235)>tol || Math.abs(oB-235)>tol) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
              const dA=(Math.abs(rR-newV)+Math.abs(rG-newV)+Math.abs(rB-newV))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes,breaks,net:fixes-breaks};
        }

        // VAECO polygon covers roughly SVG x=831-1200, y=265-660
        // → CMP x=907-1309, y=270-671
        // INTL overlay covers SVG x=582-649, y=265-400 → CMP x=635-708, y=270-407

        // Test various target grey values for the full VAECO+INTL zone
        // CMP: x=635-1309, y=270-671 (broad eastern zone)
        const vaecoBroadSims = {};
        for (const v of [195, 200, 205, 208, 210, 215, 220, 225, 228]) {
          vaecoBroadSims[v] = simGrey(635, 270, 1309, 671, v);
        }

        // Same for just the top VAECO strip (r3 area): y=294-392
        const vaecoTopSims = {};
        for (const v of [195, 200, 205, 208, 210, 215, 220, 225, 228]) {
          vaecoTopSims[v] = simGrey(635, 294, 1309, 392, v);
        }

        // r4c9 specifically: y=392-490, x=909-1010
        const r4c9Sims = {};
        for (const v of [195, 200, 205, 208, 210, 215, 220, 225]) {
          r4c9Sims[v] = simGrey(909, 392, 1010, 490, v);
        }

        // DOM apron zone: SVG x=0-648, y=265-481 → CMP x=0-707, y=270-489
        // Does darkening the DOM apron help too?
        const domSims = {};
        for (const v of [195, 200, 205, 208, 210, 215, 220, 225, 228]) {
          domSims[v] = simGrey(0, 270, 707, 489, v);
        }

        // Full canvas test: darken ALL #ebebeb to various values
        const fullSims = {};
        for (const v of [210, 215, 220, 225, 228]) {
          fullSims[v] = simGrey(0, 0, W, H, v);
        }

        // REF color distribution in VAECO top strip (y=294-392, x=635-1309)
        const refVaecoHist = {};
        for (let y=294; y<392; y++) {
          for (let x=635; x<W; x++) {
            const i=(y*W+x)*4;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const avg=Math.round((rR+rG+rB)/3/10)*10;
            refVaecoHist[avg]=(refVaecoHist[avg]||0)+1;
          }
        }

        // REF color distribution in DOM apron strip (y=270-489, x=0-707)
        const refDomHist = {};
        for (let y=270; y<489; y++) {
          for (let x=0; x<707; x++) {
            const i=(y*W+x)*4;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const avg=Math.round((rR+rG+rB)/3/10)*10;
            refDomHist[avg]=(refDomHist[avg]||0)+1;
          }
        }

        // OUR color distribution in VAECO top strip
        const ourVaecoHist = {};
        for (let y=294; y<392; y++) {
          for (let x=635; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=Math.round((oR+oG+oB)/3/10)*10;
            ourVaecoHist[avg]=(ourVaecoHist[avg]||0)+1;
          }
        }

        // Total wrong in test areas
        function countWrong(x0,y0,x1,y1) {
          let w=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) w++;
            }
          }
          return w;
        }
        const vaecoTopWrong = countWrong(635,294,1309,392);
        const domWrong = countWrong(0,270,707,489);

        resolve({ vaecoBroadSims, vaecoTopSims, r4c9Sims, domSims, fullSims,
                  refVaecoHist, refDomHist, ourVaecoHist, vaecoTopWrong, domWrong });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`VAECO top strip (y=294-392): wrong=${result.vaecoTopWrong}`);
console.log(`DOM apron (y=270-489): wrong=${result.domWrong}`);

console.log('\n=== VAECO broad zone (x=635-1309, y=270-671): grey 235→N ===');
for (const [v,s] of Object.entries(result.vaecoBroadSims))
  console.log(`  →${v}: fixes=${s.fixes} breaks=${s.breaks} net=${s.net}`);

console.log('\n=== VAECO top strip (x=635-1309, y=294-392): grey 235→N ===');
for (const [v,s] of Object.entries(result.vaecoTopSims))
  console.log(`  →${v}: fixes=${s.fixes} breaks=${s.breaks} net=${s.net}`);

console.log('\n=== r4c9 (x=909-1010, y=392-490): grey 235→N ===');
for (const [v,s] of Object.entries(result.r4c9Sims))
  console.log(`  →${v}: fixes=${s.fixes} breaks=${s.breaks} net=${s.net}`);

console.log('\n=== DOM apron (x=0-707, y=270-489): grey 235→N ===');
for (const [v,s] of Object.entries(result.domSims))
  console.log(`  →${v}: fixes=${s.fixes} breaks=${s.breaks} net=${s.net}`);

console.log('\n=== Full canvas: grey 235→N ===');
for (const [v,s] of Object.entries(result.fullSims))
  console.log(`  →${v}: fixes=${s.fixes} breaks=${s.breaks} net=${s.net}`);

console.log('\n=== REF color distribution: VAECO top strip ===');
for (const [k,v] of Object.entries(result.refVaecoHist).sort((a,b)=>Number(b)-Number(a)).slice(0,15))
  console.log(`  ≈${k}: ${v}px`);

console.log('\n=== OUR color distribution: VAECO top strip ===');
for (const [k,v] of Object.entries(result.ourVaecoHist).sort((a,b)=>Number(b)-Number(a)).slice(0,10))
  console.log(`  ≈${k}: ${v}px`);

console.log('\n=== REF color distribution: DOM apron ===');
for (const [k,v] of Object.entries(result.refDomHist).sort((a,b)=>Number(b)-Number(a)).slice(0,15))
  console.log(`  ≈${k}: ${v}px`);

await browser.close();
