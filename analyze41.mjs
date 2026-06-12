// Targeted sim: terminal building #d8d9d0 → #ebebeb, and other specific element changes
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

        // Terminal first rect: SVG x=582-710, y=344-418 → CMP x=635-775, y=350-425
        // fill=#d8d9d0 = (216,217,208)
        // Test changing to various lighter colors
        const termSims = {};
        for (const [label, [tR,tG,tB]] of Object.entries({
          '#ebebeb': [235,235,235],
          '#e8e8e8': [232,232,232],
          '#e0e0e0': [224,224,224],
          '#d8d9d0_base': [216,217,208], // sanity check (no change)
          '#e2e2e2': [226,226,226],
        })) {
          termSims[label] = simColorChange(635, 350, 775, 425, 216, 217, 208, tR, tG, tB, 12);
        }

        // r3c7 full cell analysis: CMP x=707-808, y=294-392
        // What colors are wrong there?
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
          return {total, hist: Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,12)};
        }

        const r3c7_hist = wrongColorHist(707,294,808,392);
        const r3c6_hist = wrongColorHist(606,294,707,392);
        const r4c7_hist = wrongColorHist(707,392,808,490);
        const r4c6_hist = wrongColorHist(606,392,707,490);

        // Terminal area specifically: wrong pixels
        const term_hist = wrongColorHist(635,350,775,425);

        // r2c0: CMP x=0-101, y=196-294 → wrong distribution
        const r2c0_hist = wrongColorHist(0,196,101,294);

        // r2c2: CMP x=202-303, y=196-294
        const r2c2_hist = wrongColorHist(202,196,303,294);

        // r5c11 (dark→bright): CMP x=1111-1212, y=490-588
        const r5c11_hist = wrongColorHist(1111,490,1212,588);

        // r6c11: CMP x=1111-1212, y=588-686
        const r6c11_hist = wrongColorHist(1111,588,1212,686);

        // Check: what SVG color is at r2c0? Let's see OUR distribution there
        function ourColorHist(x0,y0,x1,y1) {
          const hist={};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const ob=Math.round((oR+oG+oB)/3/10)*10;
              hist[ob]=(hist[ob]||0)+1;
            }
          }
          return Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k}:${v}`).join(', ');
        }

        const r2c0_our = ourColorHist(0,196,101,294);
        const r2c2_our = ourColorHist(202,196,303,294);
        const r5c11_our = ourColorHist(1111,490,1212,588);

        // Also check what r4c4 (wrong=2300, mid:361) looks like
        const r4c4_hist = wrongColorHist(404,392,505,490);

        // r6c7 (wrong=1592, all bright): CMP x=707-808, y=588-686
        const r6c7_hist = wrongColorHist(707,588,808,686);

        // r4c8 (wrong=1545, all bright): CMP x=808-909, y=392-490
        const r4c8_hist = wrongColorHist(808,392,909,490);

        // r2c9 (wrong=2271): CMP x=909-1010, y=196-294
        const r2c9_hist = wrongColorHist(909,196,1010,294);

        // r2c0 → does changing from 235 to anything help?
        const r2c0sims = {};
        for (const v of [200, 210, 215, 220, 225]) {
          r2c0sims[v] = simColorChange(0,196,101,294, 235,235,235, v,v,v, 5);
        }

        // TOTAL wrong
        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({ termSims, r3c7_hist, r3c6_hist, r4c7_hist, r4c6_hist, term_hist,
                  r2c0_hist, r2c2_hist, r5c11_hist, r6c11_hist,
                  r2c0_our, r2c2_our, r5c11_our, r4c4_hist, r6c7_hist, r4c8_hist, r2c9_hist,
                  r2c0sims, totalWrong });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== Terminal first rect #d8d9d0 → lighter ===');
for (const [k,v] of Object.entries(result.termSims))
  console.log(`  ${k}: fixes=${v.fixes} breaks=${v.breaks} net=${v.net}`);

console.log('\n=== Terminal area (x=635-775, y=350-425) wrong pixels ===');
console.log('  Total:', result.term_hist.total);
for (const [k,v] of result.term_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r3c7 wrong pixels ===');
console.log('  Total:', result.r3c7_hist.total);
for (const [k,v] of result.r3c7_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r3c6 wrong pixels ===');
console.log('  Total:', result.r3c6_hist.total);
for (const [k,v] of result.r3c6_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r4c7 wrong pixels ===');
console.log('  Total:', result.r4c7_hist.total);
for (const [k,v] of result.r4c7_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r4c6 wrong pixels ===');
console.log('  Total:', result.r4c6_hist.total);
for (const [k,v] of result.r4c6_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r2c0 (OUR dist):', result.r2c0_our);
console.log('=== r2c0 wrong pixels ===');
console.log('  Total:', result.r2c0_hist.total);
for (const [k,v] of result.r2c0_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r2c0 sims (235→N) ===');
for (const [v,s] of Object.entries(result.r2c0sims)) console.log(`  →${v}: ${JSON.stringify(s)}`);

console.log('\n=== r2c2 (OUR dist):', result.r2c2_our);
console.log('=== r2c2 wrong pixels ===');
console.log('  Total:', result.r2c2_hist.total);
for (const [k,v] of result.r2c2_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r5c11 (OUR dist):', result.r5c11_our);
console.log('=== r5c11 wrong pixels (dark→bright) ===');
console.log('  Total:', result.r5c11_hist.total);
for (const [k,v] of result.r5c11_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r6c11 wrong pixels ===');
console.log('  Total:', result.r6c11_hist.total);
for (const [k,v] of result.r6c11_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r4c4 wrong pixels ===');
console.log('  Total:', result.r4c4_hist.total);
for (const [k,v] of result.r4c4_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r6c7 wrong pixels ===');
console.log('  Total:', result.r6c7_hist.total);
for (const [k,v] of result.r6c7_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r4c8 wrong pixels ===');
console.log('  Total:', result.r4c8_hist.total);
for (const [k,v] of result.r4c8_hist.hist) console.log(`  ${k}: ${v}px`);

console.log('\n=== r2c9 wrong pixels ===');
console.log('  Total:', result.r2c9_hist.total);
for (const [k,v] of result.r2c9_hist.hist) console.log(`  ${k}: ${v}px`);

await browser.close();
