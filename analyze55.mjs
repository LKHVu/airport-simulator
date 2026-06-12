// Sim specific dark features: r5c9 lower, r6c8 block, r4c6 y=405, r3c4 block, y=356/349 lines.
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
              if (Math.abs(oR-235)>15 || Math.abs(oG-235)>15 || Math.abs(oB-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20 && dA<=20) f++;
              else if (dB<=20 && dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        }

        // r5c9 lower band: SVG x=833-852, y=505-580 → already confirmed +471 net
        const r5c9_lower = simSvgRect(833, 505, 852, 580, 17);

        // r6c8 block: CMP x=894-908, y=599-615 → SVG x=820-832, y=589-605
        const r6c8_block = simSvgRect(820, 589, 832, 605, 17);
        // Wider coverage: CMP x=888-908, y=596-617 → SVG 815-832, 587-607
        const r6c8_wide = simSvgRect(815, 587, 832, 607, 17);
        // Even wider: also include CMP x=843-888 for bottom r6c8 zone
        const r6c8_full = simSvgRect(741, 587, 832, 686, 17);

        // r4c6 y=405 line: SVG x=556-649, y=397-401 (CMP x=606-707, y=404-408)
        const r4c6_y405 = simSvgRect(556, 397, 649, 401, 17);
        // Also try the block area y=422-435, x=664-678 → SVG 611-622, 415-427
        const r4c6_block = simSvgRect(611, 415, 622, 427, 17);
        // Combined: y=397-427, x=556-622
        const r4c6_combined = simSvgRect(556, 397, 622, 427, 17);

        // r3c4 block: CMP x=490-505, y=349-357 → SVG x=449-462, y=343-351
        const r3c4_block = simSvgRect(449, 343, 463, 352, 17);
        // Also try including y=349 alone across wider x
        const r3c4_y349 = simSvgRect(404, 343, 463, 347, 17);
        const r3c4_y356 = simSvgRect(404, 349, 463, 353, 17);

        // Global y=356 line: CMP y=356 → SVG y=350.2
        // Try different x ranges
        const y356_full = simSvgRect(0, 349, 1200, 352, 17);
        const y356_west = simSvgRect(0, 349, 600, 352, 17); // SVG x=0-600
        const y356_mid = simSvgRect(600, 349, 830, 352, 17); // SVG x=600-830
        const y356_east = simSvgRect(830, 349, 1200, 352, 17); // SVG x=830-1200

        // Global y=349 line: CMP y=349 → SVG y=343.2
        const y349_full = simSvgRect(0, 342, 1200, 345, 17);
        const y349_west = simSvgRect(0, 342, 600, 345, 17);
        const y349_mid = simSvgRect(600, 342, 830, 345, 17);
        const y349_east = simSvgRect(830, 342, 1200, 345, 17);

        // Global y=223 line: CMP y=223 → SVG y=219.0
        // (Already partially addressed by taxiway band; check remaining)
        const y223_full = simSvgRect(0, 218, 1200, 220, 17);
        const y223_west_pretaxi = simSvgRect(0, 218, 247, 220, 17); // SVG x=0-247 (CMP x=0-269, before taxiway band)
        const y223_taxi_zone = simSvgRect(247, 218, 1152, 220, 17); // SVG x=247-1152 (taxiway band zone)

        // y=112 line (423px globally): CMP y=112 → SVG y=110.1
        // This is in the black band area (SVG y=85-110)
        // Our black band at SVG y=85, h=25 → covers y=85-109. y=112→SVG y=110 is JUST OUTSIDE!
        const y112_full = simSvgRect(0, 109, 1200, 112, 17);
        const y112_targeted = simSvgRect(105, 109, 972, 112, 17); // match existing black band x range

        // r2c2 y=223 line: CMP x=202-303, y=223
        // The taxiway band starts at SVG x=247 (CMP x=270). So CMP x=202-269 has no dark coverage.
        // Sim: dark rect at SVG x=185-247, y=219-221 (CMP x=202-270, y=222-224)
        const r2c2_top_ext = simSvgRect(185, 218, 247, 221, 17);

        // Also: what about extending the grey infield rect to be dark?
        // SVG x=65-247, y=221 → currently grey (#c0c0c0). What if dark at just y=219-220?
        const grey_top_ext = simSvgRect(65, 218, 247, 220, 17);

        // Total wrong
        let totalWrong = 0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong,
          r5c9_lower, r6c8_block, r6c8_wide, r6c8_full,
          r4c6_y405, r4c6_block, r4c6_combined,
          r3c4_block, r3c4_y349, r3c4_y356,
          y356_full, y356_west, y356_mid, y356_east,
          y349_full, y349_west, y349_mid, y349_east,
          y223_full, y223_west_pretaxi, y223_taxi_zone,
          y112_full, y112_targeted,
          r2c2_top_ext, grey_top_ext,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

console.log('\n=== r5c9 lower band (SVG 833-852, 505-580) ===', JSON.stringify(result.r5c9_lower));
console.log('\n=== r6c8 dark block ===');
console.log('  Block (820-832, 589-605):', JSON.stringify(result.r6c8_block));
console.log('  Wide (815-832, 587-607):', JSON.stringify(result.r6c8_wide));
console.log('  Full lower VAECO (741-832, 587-686):', JSON.stringify(result.r6c8_full));

console.log('\n=== r4c6 dark features ===');
console.log('  y=405 line (556-649, 397-401):', JSON.stringify(result.r4c6_y405));
console.log('  block (611-622, 415-427):', JSON.stringify(result.r4c6_block));
console.log('  combined (556-622, 397-427):', JSON.stringify(result.r4c6_combined));

console.log('\n=== r3c4 dark block ===');
console.log('  block (449-463, 343-352):', JSON.stringify(result.r3c4_block));
console.log('  y349 wide (404-463, 343-347):', JSON.stringify(result.r3c4_y349));
console.log('  y356 wide (404-463, 349-353):', JSON.stringify(result.r3c4_y356));

console.log('\n=== Global y=356 (SVG y=349-352) sims ===');
console.log('  full:', JSON.stringify(result.y356_full));
console.log('  west (x=0-600):', JSON.stringify(result.y356_west));
console.log('  mid (x=600-830):', JSON.stringify(result.y356_mid));
console.log('  east (x=830-1200):', JSON.stringify(result.y356_east));

console.log('\n=== Global y=349 (SVG y=342-345) sims ===');
console.log('  full:', JSON.stringify(result.y349_full));
console.log('  west (x=0-600):', JSON.stringify(result.y349_west));
console.log('  mid (x=600-830):', JSON.stringify(result.y349_mid));
console.log('  east (x=830-1200):', JSON.stringify(result.y349_east));

console.log('\n=== Global y=223 (SVG y=218-220) sims ===');
console.log('  full:', JSON.stringify(result.y223_full));
console.log('  west pre-taxiway (x=0-247):', JSON.stringify(result.y223_west_pretaxi));
console.log('  taxiway zone (x=247-1152):', JSON.stringify(result.y223_taxi_zone));

console.log('\n=== y=112 (SVG y=109-112) sims ===');
console.log('  full:', JSON.stringify(result.y112_full));
console.log('  targeted x=105-972:', JSON.stringify(result.y112_targeted));

console.log('\n=== r2c2 top ext (SVG 185-247, 218-221) ===', JSON.stringify(result.r2c2_top_ext));
console.log('=== grey top ext (SVG 65-247, 218-220) ===', JSON.stringify(result.grey_top_ext));

await browser.close();
