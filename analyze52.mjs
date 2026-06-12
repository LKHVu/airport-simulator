// Simulate specific targeted shape additions:
// 1. Extend taxiway band y=221,h=24 to y=219,h=27
// 2. Dark rect in r4c4 (CMP 472-504, 442-463)
// 3. Dark horizontal lines in VAECO at CMP y=300 and y=356
// 4. Other candidate rects from histograms
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

        // Simulates adding a dark rect (SVG coords) with color targetAvg to background pixels only
        // SVG→CMP scale: x×1309/1200, y×875/860
        function simSvgRect(svgX0, svgY0, svgX1, svgY1, targetAvg) {
          const cmpX0 = Math.floor(svgX0 * 1309/1200);
          const cmpY0 = Math.floor(svgY0 * 875/860);
          const cmpX1 = Math.ceil(svgX1 * 1309/1200);
          const cmpY1 = Math.ceil(svgY1 * 875/860);
          let f=0, b=0;
          for (let y=cmpY0; y<Math.min(cmpY1,H); y++) {
            for (let x=cmpX0; x<Math.min(cmpX1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              // Only sim over background pixels
              if (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20 && dA<=20) f++;
              else if (dB<=20 && dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b,
            cmpRegion:`(${cmpX0}-${cmpX1},${cmpY0}-${cmpY1})`};
        }

        // Also simulate on ALL pixels (not just background) to check for interference
        function simSvgRectAll(svgX0, svgY0, svgX1, svgY1, targetAvg) {
          const cmpX0 = Math.floor(svgX0 * 1309/1200);
          const cmpY0 = Math.floor(svgY0 * 875/860);
          const cmpX1 = Math.ceil(svgX1 * 1309/1200);
          const cmpY1 = Math.ceil(svgY1 * 875/860);
          let f=0, b=0;
          for (let y=cmpY0; y<Math.min(cmpY1,H); y++) {
            for (let x=cmpX0; x<Math.min(cmpX1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20 && dA<=20) f++;
              else if (dB<=20 && dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        }

        // 1. Taxiway band extension: old was y=221,h=24 (y=221-244 SVG)
        //    New proposed: y=219,h=27 (y=219-245 SVG)
        //    The EXTENSION area is y=219-220 (top) and y=245 (bottom) added strips
        const taxiExtTop = simSvgRectAll(247, 219, 1152, 221, 17); // top extension (2px SVG)
        const taxiExtBot = simSvgRectAll(247, 245, 1152, 246, 17); // bottom extension (1px SVG)

        // Also check extension for the SECOND rect (x=875-1152) separately
        const taxi2ExtTop = simSvgRectAll(875, 219, 1152, 221, 17);
        const taxi2ExtBot = simSvgRectAll(875, 245, 1152, 246, 17);

        // 2. r4c4 dark block: CMP x=472-504, y=442-463 → SVG x=433-462, y=435-455
        const r4c4Block = simSvgRect(433, 435, 462, 455, 17);
        const r4c4BlockAll = simSvgRectAll(433, 435, 462, 455, 17);

        // Also try the y=402 line in r4c4: CMP y=402 → SVG y=395.4, ~53px wide at x=471-504→432-462
        const r4c4TopLine = simSvgRect(432, 394, 462, 396, 17);

        // 3. VAECO dark line at CMP y=300 (SVG y=295): x=808-1313 → SVG x=741-1200
        const vaeco_y300 = simSvgRect(741, 294, 1200, 296, 17); // 2px tall SVG
        const vaeco_y300_All = simSvgRectAll(741, 294, 1200, 296, 17);

        // 4. VAECO dark line at CMP y=356 (SVG y=350): x=808-1313 → SVG x=741-1200
        const vaeco_y356 = simSvgRect(741, 349, 1200, 351, 17); // 2px tall SVG
        const vaeco_y356_All = simSvgRectAll(741, 349, 1200, 351, 17);

        // 5. VAECO dark line at CMP y=373 (SVG y=366.9): 71px dark
        const vaeco_y373 = simSvgRect(741, 365, 1200, 368, 17);

        // 6. r5c9 left band: CMP x=909-919, y=490-520 (col band) → SVG x=833-844, y=482-509
        const r5c9_left = simSvgRect(833, 482, 844, 509, 17);
        const r5c9_leftAll = simSvgRectAll(833, 482, 844, 509, 17);

        // 7. r5c9 right band: CMP x=1003-1009, y=490-590 → SVG x=919-924, y=482-580
        const r5c9_right = simSvgRect(919, 482, 925, 580, 17);

        // 8. r4c9 block: CMP x=939-953, y=472-489 → SVG x=860-874, y=464-480
        const r4c9_block = simSvgRect(860, 464, 874, 480, 17);
        const r4c9_blockAll = simSvgRectAll(860, 464, 874, 480, 17);

        // 9. Check what the black rects at lines 133-140 in AirportMap.tsx cover
        // Line 134: rect x=860,y=434,w=65,h=30 → (860-925, 434-464)
        // Line 136: rect x=926,y=437,w=73,h=73 → (926-999, 437-510)
        // Line 138: rect x=843,y=511,w=18,h=69 → (843-861, 511-580)
        // Line 140: rect x=912,y=541,w=179,h=45 → (912-1091, 541-586)
        // Already added in map, so these don't appear in ourPx as background

        // 10. Extend VAECO dark rects to cover row at CMP y=356 across different widths
        // Try only x=808-1000 (western VAECO)
        const vaeco_y356_west = simSvgRect(741, 349, 917, 351, 17); // x=741-917 SVG ≈ CMP 808-1000
        const vaeco_y356_east = simSvgRect(917, 349, 1200, 351, 17); // x=917-1200 SVG ≈ CMP 1001-1313

        // Total wrong
        let totalWrong = 0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong,
          taxiExtTop, taxiExtBot, taxi2ExtTop, taxi2ExtBot,
          r4c4Block, r4c4BlockAll, r4c4TopLine,
          vaeco_y300, vaeco_y300_All, vaeco_y356, vaeco_y356_All, vaeco_y373,
          r5c9_left, r5c9_leftAll, r5c9_right,
          r4c9_block, r4c9_blockAll,
          vaeco_y356_west, vaeco_y356_east,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== Fix 1: Extend taxiway band (rect 247-1152) ===');
console.log('  Top extension (y=219-220 SVG):', JSON.stringify(result.taxiExtTop));
console.log('  Bottom extension (y=245 SVG):', JSON.stringify(result.taxiExtBot));
console.log('  SECOND rect top ext (x=875-1152, y=219-220):', JSON.stringify(result.taxi2ExtTop));
console.log('  SECOND rect bottom ext (x=875-1152, y=245):', JSON.stringify(result.taxi2ExtBot));

console.log('\n=== Fix 2: r4c4 dark block (SVG 433-462, 435-455) ===');
console.log('  Background-only sim:', JSON.stringify(result.r4c4Block));
console.log('  All-pixels sim:', JSON.stringify(result.r4c4BlockAll));
console.log('  Top line y=394-395:', JSON.stringify(result.r4c4TopLine));

console.log('\n=== Fix 3: VAECO y=300 line (SVG y=294-295) ===');
console.log('  Background-only:', JSON.stringify(result.vaeco_y300));
console.log('  All-pixels:', JSON.stringify(result.vaeco_y300_All));

console.log('\n=== Fix 4: VAECO y=356 line (SVG y=349-350) ===');
console.log('  Background-only:', JSON.stringify(result.vaeco_y356));
console.log('  All-pixels:', JSON.stringify(result.vaeco_y356_All));
console.log('  West half:', JSON.stringify(result.vaeco_y356_west));
console.log('  East half:', JSON.stringify(result.vaeco_y356_east));

console.log('\n=== Fix 5: VAECO y=373 line (SVG y=365-367) ===');
console.log('  Background-only:', JSON.stringify(result.vaeco_y373));

console.log('\n=== Fix 6: r5c9 left band (SVG 833-844, 482-509) ===');
console.log('  Background-only:', JSON.stringify(result.r5c9_left));
console.log('  All-pixels:', JSON.stringify(result.r5c9_leftAll));

console.log('\n=== Fix 7: r5c9 right band (SVG 919-925, 482-580) ===');
console.log('  Background-only:', JSON.stringify(result.r5c9_right));

console.log('\n=== Fix 8: r4c9 block (SVG 860-874, 464-480) ===');
console.log('  Background-only:', JSON.stringify(result.r4c9_block));
console.log('  All-pixels:', JSON.stringify(result.r4c9_blockAll));

await browser.close();
