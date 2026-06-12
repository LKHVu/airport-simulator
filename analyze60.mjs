// Investigate y=112 horizontal band, y=356 sub-ranges, y=300 east, y=471 c12.
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

        function simSvgRect(svgX0, svgY0, svgX1, svgY1, targetAvg) {
          const x0=Math.floor(svgX0*1309/1200), y0=Math.floor(svgY0*875/860);
          const x1=Math.ceil(svgX1*1309/1200), y1=Math.ceil(svgY1*875/860);
          let f=0, b=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15||Math.abs(oG-235)>15||Math.abs(oB-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20&&dA<=20) f++;
              else if (dB<=20&&dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        }

        function darkRowHist(x0, y0, x1, y1, thresh=80) {
          const h={};
          for (let y=y0;y<Math.min(y1,H);y++) for (let x=x0;x<Math.min(x1,W);x++) {
            const i=(y*W+x)*4;
            if (Math.abs(ourPx.data[i]-235)>15) continue;
            if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < thresh) h[y]=(h[y]||0)+1;
          }
          return h;
        }
        function darkColHist(x0, y0, x1, y1, thresh=80) {
          const h={};
          for (let y=y0;y<Math.min(y1,H);y++) for (let x=x0;x<Math.min(x1,W);x++) {
            const i=(y*W+x)*4;
            if (Math.abs(ourPx.data[i]-235)>15) continue;
            if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < thresh) h[x]=(h[x]||0)+1;
          }
          return h;
        }

        // ===== y=112 band investigation =====
        // Cell dist: c0:16, c1:101, c2:101, c3:69, c4:83, c8:2, c9:32
        // c1 (CMP x=101-202): full 101px width. SVG x=93-185
        // c2 (CMP x=202-303): full 101px. SVG x=185-278
        // c3 (CMP x=303-404): 69px. SVG x=278-370
        // c4 (CMP x=404-505): 83px. SVG x=370-463
        // CMP y=112 → SVG y=110.1
        // Check a few y heights: just y=111-113 (CMP) → SVG y=109-112

        // Row/col hist in y=105-120 area for c1-c4:
        const y112_band_rows = darkRowHist(93, 105, 463, 120);
        const y112_band_cols = darkColHist(93, 105, 463, 120);

        // Also check c9 (CMP x=909-1010) area:
        const y112_c9_rows = darkRowHist(832, 100, 926, 125);

        // Sims: narrow rects covering just the dark rows
        // c1+c2 (SVG x=93-278): y=109-112
        const y112_c1c2 = simSvgRect(93, 109, 278, 113, 17);
        // c1 only (SVG x=93-185):
        const y112_c1 = simSvgRect(93, 109, 185, 113, 17);
        // c2 only (SVG x=185-278):
        const y112_c2 = simSvgRect(185, 109, 278, 113, 17);
        // c1+c2+c3+c4 full (SVG x=93-463):
        const y112_c1c4 = simSvgRect(93, 109, 463, 113, 17);
        // c3+c4 only (SVG x=278-463):
        const y112_c3c4 = simSvgRect(278, 109, 463, 113, 17);
        // Try 1px height: y=110-111 (SVG)
        const y112_c1c2_1px = simSvgRect(93, 110, 278, 111, 17);
        // Try 2px height: y=110-112
        const y112_c1c2_2px = simSvgRect(93, 110, 278, 112, 17);
        // Try height=5: y=108-113
        const y112_c1c4_tall = simSvgRect(93, 108, 463, 114, 17);

        // ===== y=356 sub-range analysis =====
        // y=356 global: c0:37, c1:79, c2:101, c3:97, c4:93, c5:101, c6:101, c7:101, c8:84, c9:101, c10:101, c11:101, c12:19
        // This is almost exactly 101px per cell → a full-width horizontal line!
        // Total ~1116px. Why are all sims negative?
        // Let's check adjacent rows too:
        const y356_multirow = darkRowHist(0, 350, 1309, 360);
        // And get exact breakdown by row + by some specific cells
        const y356_c2_rows = darkRowHist(202, 349, 303, 358);
        const y356_c5_rows = darkRowHist(505, 349, 606, 358);
        // Also check what OUR pixels look like at y=356 — are some already dark?
        const y356_our_check = {};
        for (let x=0;x<W;x++) {
          const i=(356*W+x)*4;
          const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
          const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if (d>20) {
            const isBg = Math.abs(oR-235)<=15&&Math.abs(oG-235)<=15&&Math.abs(oB-235)<=15;
            const oAvg=Math.round((oR+oG+oB)/3), rAvg=Math.round((rR+rG+rB)/3);
            if (!y356_our_check[`${isBg?'bg':'non'}`]) y356_our_check[`${isBg?'bg':'non'}`]=[];
            if (y356_our_check[`${isBg?'bg':'non'}`].length<5) y356_our_check[`${isBg?'bg':'non'}`].push({x,oAvg,rAvg});
          }
        }

        // Narrow band sim for y=356: try height=1 SVG across different x ranges
        const y356_1px_c2c4 = simSvgRect(185, 349, 463, 351, 17); // c2-c4
        const y356_1px_c5c7 = simSvgRect(463, 349, 741, 351, 17); // c5-c7

        // Try grey (mid tone) instead of black for y=356 lines:
        // Ref avg of dark pixels at y=356 — check actual REF values
        const y356_ref_vals = [];
        for (let x=0;x<W;x++) {
          const i=(356*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            y356_ref_vals.push((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3);
          }
        }
        const y356_avg_dark = y356_ref_vals.length ? Math.round(y356_ref_vals.reduce((a,b)=>a+b)/y356_ref_vals.length) : 0;

        // Check the OUR pixel values at y=356 — maybe we already have partial dark coverage
        // and simming more dark breaks those pixels
        let y356_ourDark=0, y356_ourBg=0;
        for (let x=0;x<W;x++) {
          const i=(356*W+x)*4;
          const oAvg=(ourPx.data[i]+ourPx.data[i+1]+ourPx.data[i+2])/3;
          if (oAvg<100) y356_ourDark++;
          else if (Math.abs(oAvg-235)<20) y356_ourBg++;
        }

        // ===== y=300 east side: c9:87, c10:92, c11:96, c12:72 =====
        // CMP y=300 → SVG y=295.3
        const y300_east_rows = darkRowHist(832, 293, 1309, 308);
        // Narrow sim for c9-c12 at y=300 (1px):
        const y300_c9c12_narrow = simSvgRect(832, 294, 1200, 297, 17);
        const y300_c9c12_2px = simSvgRect(832, 294, 1200, 299, 17);
        // c9 only:
        const y300_c9 = simSvgRect(832, 294, 926, 297, 17);

        // ===== y=471 c12 (83px) =====
        // CMP y=471 → SVG y=463.5; c12 = CMP x=1212-1309 → SVG x=1111-1200
        const y471_c12 = simSvgRect(1111, 462, 1200, 466, 17);
        // Check rows around y=471 in c12:
        const y471_c12_rows = darkRowHist(1212, 460, 1309, 480);

        // ===== y=373 c12 (83px) =====
        // CMP y=373 → SVG y=366.7; c12 = CMP x=1212-1309 → SVG x=1111-1200
        const y373_c12 = simSvgRect(1111, 365, 1200, 369, 17);
        const y373_c12_rows = darkRowHist(1212, 362, 1309, 378);

        // ===== Extended r5c8+r6c8 area: check what remains =====
        // After our r5c8 fix covers 575-589, what's in 490-575?
        const r5c8_upper_rows = darkRowHist(808, 490, 909, 575);
        const r5c8_upper_cols = darkColHist(808, 490, 909, 575);

        // Total wrong
        let totalWrong=0;
        for (let i=0;i<W*H*4;i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong,
          y112_band_rows, y112_band_cols, y112_c9_rows,
          y112_c1c2, y112_c1, y112_c2, y112_c1c4, y112_c3c4,
          y112_c1c2_1px, y112_c1c2_2px, y112_c1c4_tall,
          y356_multirow, y356_c2_rows, y356_c5_rows,
          y356_our_check, y356_1px_c2c4, y356_1px_c5c7,
          y356_ref_vals: y356_ref_vals.slice(0,10), y356_avg_dark,
          y356_ourDark, y356_ourBg,
          y300_east_rows, y300_c9c12_narrow, y300_c9c12_2px, y300_c9,
          y471_c12, y471_c12_rows,
          y373_c12, y373_c12_rows,
          r5c8_upper_rows, r5c8_upper_cols,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

function ch(hist, label, n=15) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log('\n=== y=112 band ===');
ch(result.y112_band_rows,'rows_c1c4'); ch(result.y112_band_cols,'cols_c1c4');
ch(result.y112_c9_rows,'rows_c9');
console.log('  c1c2 (93-278, 109-113):', JSON.stringify(result.y112_c1c2));
console.log('  c1 only (93-185, 109-113):', JSON.stringify(result.y112_c1));
console.log('  c2 only (185-278, 109-113):', JSON.stringify(result.y112_c2));
console.log('  c1-c4 (93-463, 109-113):', JSON.stringify(result.y112_c1c4));
console.log('  c3c4 (278-463, 109-113):', JSON.stringify(result.y112_c3c4));
console.log('  c1c2 1px (109-111):', JSON.stringify(result.y112_c1c2_1px));
console.log('  c1c2 2px (110-112):', JSON.stringify(result.y112_c1c2_2px));
console.log('  c1-c4 tall (108-114):', JSON.stringify(result.y112_c1c4_tall));

console.log('\n=== y=356 deep analysis ===');
ch(result.y356_multirow,'rows'); ch(result.y356_c2_rows,'c2rows'); ch(result.y356_c5_rows,'c5rows');
console.log('  our_dark:', result.y356_ourDark, 'our_bg:', result.y356_ourBg);
console.log('  avg REF dark value:', result.y356_avg_dark, 'sample:', JSON.stringify(result.y356_ref_vals));
console.log('  OUR wrong samples:', JSON.stringify(result.y356_our_check));
console.log('  1px c2-c4 (185-463, 349-351):', JSON.stringify(result.y356_1px_c2c4));
console.log('  1px c5-c7 (463-741, 349-351):', JSON.stringify(result.y356_1px_c5c7));

console.log('\n=== y=300 east sims ===');
ch(result.y300_east_rows,'rows');
console.log('  c9-c12 narrow (832-1200, 294-297):', JSON.stringify(result.y300_c9c12_narrow));
console.log('  c9-c12 2px (832-1200, 294-299):', JSON.stringify(result.y300_c9c12_2px));
console.log('  c9 only (832-926, 294-297):', JSON.stringify(result.y300_c9));

console.log('\n=== y=471 c12 ===');
ch(result.y471_c12_rows,'rows');
console.log('  sim (1111-1200, 462-466):', JSON.stringify(result.y471_c12));

console.log('\n=== y=373 c12 ===');
ch(result.y373_c12_rows,'rows');
console.log('  sim (1111-1200, 365-369):', JSON.stringify(result.y373_c12));

console.log('\n=== r5c8 upper (490-575) ===');
ch(result.r5c8_upper_rows,'rows'); ch(result.r5c8_upper_cols,'cols');

await browser.close();
