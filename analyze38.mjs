// Test specific white→#ebebeb changes with opacity=1 approach for markers/legend
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

        // HoldingSpotMarkers: 17 spots with opacity=0.95 → actual rendered pixels
        // opacity=0.95 on white → current OUR ≈ 242-254 (depends on background).
        // Spots: HS16(177,154), HS15(164,215), HS14(131,272), HS13(99,334),
        // HS12(264,388), HS11(227,436), HS10(199,478), HS9(170,521),
        // A1(281,215), A2(254,278), A3(232,335), A4(214,388), A5(192,430),
        // B1(399,243), B2(414,301), B3(426,376), B4(441,442)
        // All in SVG coords × 1.091/1.017 scale.
        // In CMP coords: x×1.091, y×1.017. SVG rect: (x-9,y-5)-(x+9,y+5)
        const spotsSVG = [
          {x:177,y:154},{x:164,y:215},{x:131,y:272},{x:99,y:334},
          {x:264,y:388},{x:227,y:436},{x:199,y:478},{x:170,y:521},
          {x:281,y:215},{x:254,y:278},{x:232,y:335},{x:214,y:388},{x:192,y:430},
          {x:399,y:243},{x:414,y:301},{x:426,y:376},{x:441,y:442}
        ];

        // For each spot, analyze the rectangle area (CMP coords)
        let totalFixes=0, totalBreaks=0;
        const spotDetails = [];
        for (const s of spotsSVG) {
          const cx = Math.round(s.x * 1.091), cy = Math.round(s.y * 1.017);
          const x0 = cx-10, y0 = cy-6, x1 = cx+10, y1 = cy+6;
          // Current pixel color at markers: white with opacity=0.95, so ~254 for grey bg
          // Simulate: changing from ~254 (OUR after opacity blend) → 235
          // Use a range: tol=15 to catch the opacity-blended whites (242-254 range)
          const sim = simColorChange(x0,y0,x1,y1, 250,250,250, 235,235,235, 8);
          totalFixes+=sim.fixes; totalBreaks+=sim.breaks;
          if (Math.abs(sim.net)>0) spotDetails.push({id:`(${s.x},${s.y})`, ...sim});
        }

        // Same for parking positions
        const parkSVG = [{x:690,y:285},{x:625,y:257},{x:465,y:452},{x:408,y:443}];
        let parkFixes=0, parkBreaks=0;
        for (const p of parkSVG) {
          const cx = Math.round(p.x * 1.091), cy = Math.round(p.y * 1.017);
          const x0 = cx-10, y0 = cy-6, x1 = cx+10, y1 = cy+6;
          const sim = simColorChange(x0,y0,x1,y1, 250,250,250, 235,235,235, 8);
          parkFixes+=sim.fixes; parkBreaks+=sim.breaks;
        }

        // Legend rect: translate(14,793) → SVG x=8-762, y=779-801 → CMP x=9-832, y=793-815
        // Current: white opacity=0.85 → OUR ≈ 0.85×255 + 0.15×bg
        // The background under the legend varies: could be grey (235) or dark
        // Legend fill pixels: ~224-252 depending on bg
        // Simulate: 224-252 → 235 (tol=15 catches that range)
        const legendSim = simColorChange(9, 793, 832, 815, 245, 245, 245, 235, 235, 235, 12);

        // Also test legend with wider tol (to catch opacity=0.85 over dark bg = 0.85×255+0.15×17=224)
        const legendSimWide = simColorChange(9, 793, 832, 815, 240, 240, 240, 235, 235, 235, 20);

        // CompassRose: translate(1148,28), polygon fill="white" → #ebebeb (already changed)
        // r=16 circle: CMP x≈1148-1180, y≈12-44 (SVG y=12 to 44 → CMP y=12-45)
        const compassSim = simColorChange(
          Math.round(1148*1.091)-20, Math.round(28*1.017)-20,
          Math.round(1148*1.091)+20, Math.round(28*1.017)+20,
          254,254,254, 235,235,235, 5);

        // Full canvas scan: how many white (252-255) pixels are wrong?
        let fullWhiteWrong=0, fullWhiteFix=0;
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (oR>=252 && oG>=252 && oB>=252) {
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
              if (d>20) fullWhiteWrong++;
              if (d>20 && dA<=20) fullWhiteFix++;
            }
          }
        }

        // Pixel histogram for the holding spot area
        // Let's also check what REF shows at holding spot positions
        const spotRefHist = {};
        for (const s of spotsSVG.slice(0,3)) {
          const cx = Math.round(s.x * 1.091), cy = Math.round(s.y * 1.017);
          for (let dy=-6; dy<6; dy++) {
            for (let dx=-10; dx<10; dx++) {
              const x=cx+dx, y=cy+dy;
              if (x<0||y<0||x>=W||y>=H) continue;
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              // Group by OUR brightness
              const obr = Math.round((oR+oG+oB)/3/10)*10;
              const rbr = Math.round((rR+rG+rB)/3/10)*10;
              const key = `OUR≈${obr} REF≈${rbr}`;
              spotRefHist[key]=(spotRefHist[key]||0)+1;
            }
          }
        }

        const totalWrong = (() => {
          let w=0;
          for (let i=0; i<W*H*4; i+=4) {
            const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (d>20) w++;
          }
          return w;
        })();

        resolve({ totalFixes, totalBreaks, spotDetails, parkFixes, parkBreaks,
                  legendSim, legendSimWide, compassSim,
                  fullWhiteWrong, fullWhiteFix, spotRefHist, totalWrong });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);
console.log(`\nHoldingSpotMarkers (white≈250→235): fixes=${result.totalFixes}, breaks=${result.totalBreaks}, net=${result.totalFixes-result.totalBreaks}`);
if (result.spotDetails.length) {
  console.log('Per-spot details:');
  for (const d of result.spotDetails) console.log(`  ${d.id}: fixes=${d.fixes} breaks=${d.breaks} net=${d.net}`);
}
console.log(`\nParkingPositionMarkers (white≈250→235): fixes=${result.parkFixes}, breaks=${result.parkBreaks}, net=${result.parkFixes-result.parkBreaks}`);
console.log(`\nLegend (white≈245→235, tol=12): ${JSON.stringify(result.legendSim)}`);
console.log(`Legend (white≈240→235, tol=20): ${JSON.stringify(result.legendSimWide)}`);
console.log(`\nCompassRose (254→235): ${JSON.stringify(result.compassSim)}`);
console.log(`\nFull canvas white (252-255) wrong: ${result.fullWhiteWrong}, fixable→235: ${result.fullWhiteFix}`);
console.log('\nSpot pixel distribution (first 3 spots):');
for (const [k,v] of Object.entries(result.spotRefHist).sort((a,b)=>b[1]-a[1]).slice(0,15))
  console.log(`  ${k}: ${v}px`);

await browser.close();
