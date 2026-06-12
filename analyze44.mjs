// Targeted small-area simulations for black feature placement and other fixes.
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

        // Simulate adding a BLACK rect at specific SVG coords (affects OUR=235 → OUR=0)
        function simBlackRect(svgX0, svgY0, svgX1, svgY1) {
          const cx0=Math.round(svgX0*1.091), cy0=Math.round(svgY0*1.017);
          const cx1=Math.round(svgX1*1.091), cy1=Math.round(svgY1*1.017);
          let fixes=0, breaks=0;
          for (let y=cy0; y<Math.min(cy1,H); y++) {
            for (let x=cx0; x<Math.min(cx1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dOld=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
              const dNew=(Math.abs(rR-17)+Math.abs(rG-17)+Math.abs(rB-17))/3; // #111111
              if (dOld>20 && dNew<=20) fixes++;
              else if (dOld<=20 && dNew>20) breaks++;
            }
          }
          return {fixes,breaks,net:fixes-breaks, svgRect:`${svgX0},${svgY0},${svgX1},${svgY1}`};
        }

        // r4c9 dense area (rows 5-6, cols 3-9): approximately SVG x=860-925, y=434-464
        const r4c9_tight = simBlackRect(860, 434, 925, 464);
        // r4c9 rows 5-8: SVG x=861-925, y=434-473
        const r4c9_medium = simBlackRect(861, 434, 925, 473);
        // r4c4 top band: SVG x=398-456, y=390-413
        const r4c4_top = simBlackRect(398, 390, 456, 413);
        // r4c4 bottom-right: SVG x=426-462, y=432-471
        const r4c4_br = simBlackRect(426, 432, 462, 471);
        // r4c4 both: one combined test
        // r4c4: SVG x=404-462, y=385-468 (full bounds)

        // Dark-to-bright: r5c11 dominant dark element — SVG x=1018-1091, y=481-578
        // OUR=40 pixels at CMP x=1111-1190, y=490-588. If we LIGHTEN the black building
        // by changing #262626 → #ebebeb in that zone:
        function simLightenDark(svgX0, svgY0, svgX1, svgY1, fromV=38, toV=235, tol=10) {
          const cx0=Math.round(svgX0*1.091), cy0=Math.round(svgY0*1.017);
          const cx1=Math.round(svgX1*1.091), cy1=Math.round(svgY1*1.017);
          let fixes=0, breaks=0;
          for (let y=cy0; y<Math.min(cy1,H); y++) {
            for (let x=cx0; x<Math.min(cx1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-fromV)>tol || Math.abs(oG-fromV)>tol || Math.abs(oB-fromV)>tol) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dOld=(Math.abs(rR-fromV)+Math.abs(rG-fromV)+Math.abs(rB-fromV))/3;
              const dNew=(Math.abs(rR-toV)+Math.abs(rG-toV)+Math.abs(rB-toV))/3;
              if (dOld>20 && dNew<=20) fixes++;
              else if (dOld<=20 && dNew>20) breaks++;
            }
          }
          return {fixes,breaks,net:fixes-breaks};
        }

        // Test: remove the black building SVG x=912-1091, y=541-586
        const removeBuilding = simLightenDark(912,541,1091,586, 38,235,20);
        // Test: remove the small black band SVG x=843-861, y=511-580
        const removeSmallBand = simLightenDark(843,511,861,580, 17,235,20);
        // Test: remove the other black rect SVG x=926-999, y=437-510
        const removeBlack2 = simLightenDark(926,437,999,510, 17,235,20);

        // Test lightening the second taxiway band: SVG x=105-972, y=85-110
        const lightenTxwBand = simLightenDark(105,85,972,110, 17,235,20);

        // Scan: what OUR colors exist in the lower half (y=490+) and are wrong?
        function wrongColorScan(x0,y0,x1,y1) {
          const byOUR = {};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              if (d>20) {
                const ob=Math.round((oR+oG+oB)/3/10)*10;
                byOUR[ob]=(byOUR[ob]||0)+1;
              }
            }
          }
          return Object.entries(byOUR).sort((a,b)=>b[1]-a[1]).slice(0,8);
        }

        // Lower map scan
        const lowerWrongByOUR = wrongColorScan(0, 490, W, H);
        const upperWrongByOUR = wrongColorScan(0, 0, W, 490);

        // Check: what about the non-ASPHALT edge strokes?
        // TAXIWAY edges use different colors. Let me scan for non-235, non-68 wrong colors.
        const nonStdWrong = {};
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) {
              const ob=(oR+oG+oB)/3;
              // Exclude near-235 (background) and near-68 (asphalt)
              if (Math.abs(ob-235)<=15 || Math.abs(ob-68)<=15) continue;
              const obBin=Math.round(ob/10)*10;
              nonStdWrong[obBin]=(nonStdWrong[obBin]||0)+1;
            }
          }
        }
        const nonStdTop = Object.entries(nonStdWrong).sort((a,b)=>b[1]-a[1]).slice(0,10);

        // Try changing edge colors that create the "wrong shade" grey mismatches
        // From earlier analysis: grey mismatch cells (100-220 OUR, 100-220 REF)
        // r3c7 mismatch: OUR=210 → changed to 235. What about OUR=170-190 range?
        const midGreySims = {};
        for (const [v, from] of [[180,180],[170,170],[190,190],[200,200],[160,160]]) {
          midGreySims[v] = {
            to235: (() => {
              let f=0,b=0;
              for (let i=0; i<W*H*4; i+=4) {
                const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
                if (Math.abs(oR-from)>12 || Math.abs(oG-from)>12 || Math.abs(oB-from)>12) continue;
                const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
                const dB=(Math.abs(rR-from)+Math.abs(rG-from)+Math.abs(rB-from))/3;
                const dA=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
                if (dB>20 && dA<=20) f++;
                else if (dB<=20 && dA>20) b++;
              }
              return {fixes:f,breaks:b,net:f-b};
            })()
          };
        }

        // Total
        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({ r4c9_tight, r4c9_medium, r4c4_top, r4c4_br,
                  removeBuilding, removeSmallBand, removeBlack2, lightenTxwBand,
                  lowerWrongByOUR, upperWrongByOUR,
                  nonStdTop, midGreySims, totalWrong });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== Add black rects at focused areas ===');
console.log('r4c9 tight (SVG 860-925, 434-464):', JSON.stringify(result.r4c9_tight));
console.log('r4c9 medium (SVG 861-925, 434-473):', JSON.stringify(result.r4c9_medium));
console.log('r4c4 top band (SVG 398-456, 390-413):', JSON.stringify(result.r4c4_top));
console.log('r4c4 bottom-right (SVG 426-462, 432-471):', JSON.stringify(result.r4c4_br));

console.log('\n=== Lighten dark elements ===');
console.log('Remove building (#262626, SVG 912-1091, 541-586):', JSON.stringify(result.removeBuilding));
console.log('Remove small band (#111111, SVG 843-861, 511-580):', JSON.stringify(result.removeSmallBand));
console.log('Remove other black (SVG 926-999, 437-510):', JSON.stringify(result.removeBlack2));
console.log('Lighten taxiway band (SVG 105-972, 85-110):', JSON.stringify(result.lightenTxwBand));

console.log('\n=== Wrong pixels by OUR color: upper half (y=0-490) ===');
for (const [k,v] of result.upperWrongByOUR) console.log(`  OUR≈${k}: ${v}px`);

console.log('\n=== Wrong pixels by OUR color: lower half (y=490+) ===');
for (const [k,v] of result.lowerWrongByOUR) console.log(`  OUR≈${k}: ${v}px`);

console.log('\n=== Non-standard OUR wrong colors (excluding 235±15 and 68±15) ===');
for (const [k,v] of result.nonStdTop) console.log(`  OUR≈${k}: ${v}px`);

console.log('\n=== Mid-grey OUR → 235 sims ===');
for (const [k,v] of Object.entries(result.midGreySims)) console.log(`  OUR≈${k}→235: ${JSON.stringify(v.to235)}`);

await browser.close();
