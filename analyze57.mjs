// Sim: y=442 line at c10-c12, y=405 line at c4-c7, r3c7 dark lines, r6c8 extension.
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

        // y=442 gap at c10-c12: CMP x=1010-1309, y=442-445 → SVG x=926-1200, y=434-438
        const y442_c10c12 = simSvgRect(926, 434, 1200, 438, 17);
        // Narrower (just c10-c11): CMP x=1010-1212 → SVG x=926-1111
        const y442_c10c11 = simSvgRect(926, 434, 1111, 438, 17);
        // Check y=442-444 vs y=442-447 (wider height):
        const y442_wider = simSvgRect(926, 434, 1200, 441, 17);

        // Also sim y=442 at c4 (CMP x=404-471 left of fix): SVG x=370-432
        const y442_c4_left = simSvgRect(370, 434, 432, 437, 17);

        // y=405 line: CMP y=405 → SVG y=398.4
        // c4 (x=404-505): 15px → SVG x=371-463, y=397-401
        const y405_c4 = simSvgRect(371, 397, 463, 401, 17);
        // c5 (x=505-606): 101px → SVG x=463-556, y=397-401
        const y405_c5 = simSvgRect(463, 397, 556, 401, 17);
        // c5+c6 (x=505-707): SVG x=463-649, y=397-401
        const y405_c5c6 = simSvgRect(463, 397, 649, 401, 17);
        // Narrower y range for c5: y=397-400
        const y405_c5_narrow = simSvgRect(463, 397, 556, 400, 17);
        // c5 only with 1px height
        const y405_c5_1px = simSvgRect(463, 397, 556, 399, 17);

        // r3c7 y=356 (101px) and y=349 (41px): CMP x=707-808 → SVG x=649-741
        const r3c7_y356 = simSvgRect(649, 349, 741, 353, 17); // y=349-353 SVG → CMP y=354-358
        const r3c7_y349 = simSvgRect(649, 342, 741, 346, 17); // y=342-346 SVG → CMP y=348-352
        const r3c7_y362 = simSvgRect(649, 355, 741, 358, 17); // y=355-358 SVG → CMP y=360-364
        // Combined range y=349-362 (CMP)
        const r3c7_combined = simSvgRect(649, 342, 741, 358, 17);

        // r6c8 extension left of current block:
        // Current block: SVG x=815-832, y=587-607 (CMP x=889-908, y=597-617)
        // Remaining: x=881-888 (CMP) → SVG x=808-815, y=587-620 (CMP y=597-626)
        const r6c8_left_ext = simSvgRect(808, 587, 815, 620, 17);
        // Try SVG x=808-832, y=587-622:
        const r6c8_ext_combined = simSvgRect(808, 587, 832, 622, 17);

        // r3c4 y=356 (93px), y=349 (82px): CMP x=404-505 → SVG x=371-463
        // (Already found negative earlier, but let me narrow to just the right edge x=488-505)
        // r3c4 col top was x=496:51, x=490:17 → tight band at x=490-505 → SVG x=449-463
        const r3c4_tight = simSvgRect(449, 343, 463, 354, 17); // y=349-358 CMP
        const r3c4_y356_tight = simSvgRect(449, 349, 463, 352, 17);
        const r3c4_y349_tight = simSvgRect(449, 342, 463, 346, 17);

        // r4c5 y=405 (101px): same as y405_c5 above, but also check cols x=505-506
        const r4c5_col505 = simSvgRect(463, 387, 466, 480, 17); // thin vertical at x=505-507 CMP

        // r5c9 remaining at c9 (x=939-952): SVG x=860-873, y=490-580
        // r4c9 block already covers y=464-480. Check y=480-580 at x=860-873
        const r5c9_deep = simSvgRect(860, 470, 873, 590, 17);
        // Narrower: y=490-590
        const r5c9_deep2 = simSvgRect(860, 480, 873, 590, 17);

        // Total wrong
        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong,
          y442_c10c12, y442_c10c11, y442_wider, y442_c4_left,
          y405_c4, y405_c5, y405_c5c6, y405_c5_narrow, y405_c5_1px,
          r3c7_y356, r3c7_y349, r3c7_y362, r3c7_combined,
          r6c8_left_ext, r6c8_ext_combined,
          r3c4_tight, r3c4_y356_tight, r3c4_y349_tight,
          r4c5_col505,
          r5c9_deep, r5c9_deep2,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== y=442 gap (CMP x=1010+, y=442-445) ===');
console.log('  c10-c12 (x=926-1200, y=434-438):', JSON.stringify(result.y442_c10c12));
console.log('  c10-c11 (x=926-1111, y=434-438):', JSON.stringify(result.y442_c10c11));
console.log('  wider h (x=926-1200, y=434-441):', JSON.stringify(result.y442_wider));
console.log('  c4 left (x=370-432, y=434-437):', JSON.stringify(result.y442_c4_left));

console.log('\n=== y=405 line ===');
console.log('  c4 (x=371-463):', JSON.stringify(result.y405_c4));
console.log('  c5 (x=463-556):', JSON.stringify(result.y405_c5));
console.log('  c5+c6 (x=463-649):', JSON.stringify(result.y405_c5c6));
console.log('  c5 narrow (y=397-400):', JSON.stringify(result.y405_c5_narrow));
console.log('  c5 1px (y=397-399):', JSON.stringify(result.y405_c5_1px));

console.log('\n=== r3c7 dark lines ===');
console.log('  y=356 (649-741, 349-353):', JSON.stringify(result.r3c7_y356));
console.log('  y=349 (649-741, 342-346):', JSON.stringify(result.r3c7_y349));
console.log('  y=362 (649-741, 355-358):', JSON.stringify(result.r3c7_y362));
console.log('  combined (649-741, 342-358):', JSON.stringify(result.r3c7_combined));

console.log('\n=== r6c8 extension ===');
console.log('  left ext (808-815, 587-620):', JSON.stringify(result.r6c8_left_ext));
console.log('  combined (808-832, 587-622):', JSON.stringify(result.r6c8_ext_combined));

console.log('\n=== r3c4 tight (449-463) ===');
console.log('  combined y=343-354:', JSON.stringify(result.r3c4_tight));
console.log('  y=356 tight:', JSON.stringify(result.r3c4_y356_tight));
console.log('  y=349 tight:', JSON.stringify(result.r3c4_y349_tight));

console.log('\n=== r4c5 col505 ===', JSON.stringify(result.r4c5_col505));

console.log('\n=== r5c9 deep (x=860-873) ===');
console.log('  y=470-590:', JSON.stringify(result.r5c9_deep));
console.log('  y=480-590:', JSON.stringify(result.r5c9_deep2));

await browser.close();
