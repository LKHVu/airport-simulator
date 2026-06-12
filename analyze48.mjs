// Sample OUR≈120 pixels in r2c7/r2c9, and sim OUR≈250→235, check remaining text sources.
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

        function simToGrey(from, tol) {
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
          return {fixes:f,breaks:b,net:f-b};
        }

        // OUR≈250→235 sim
        const sim250 = simToGrey(250, 8);
        // OUR≈245→235
        const sim245 = simToGrey(245, 5);

        // Sample OUR≈120 wrong pixels in r2c7 (CMP x=707-808, y=196-294)
        const r2c7_120 = [];
        for (let y=196; y<294 && r2c7_120.length<15; y++) {
          for (let x=707; x<808 && r2c7_120.length<15; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (Math.abs(avg-120)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) r2c7_120.push({x,y,oR,oG,oB,rR,rG,rB,d:Math.round(d)});
          }
        }

        // Sample OUR≈120 wrong pixels in r2c9 (CMP x=909-1010, y=196-294)
        const r2c9_120 = [];
        for (let y=196; y<294 && r2c9_120.length<15; y++) {
          for (let x=909; x<1010 && r2c9_120.length<15; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (Math.abs(avg-120)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) r2c9_120.push({x,y,oR,oG,oB,rR,rG,rB,d:Math.round(d)});
          }
        }

        // Sample OUR≈120 wrong pixels in r5c3 (CMP x=303-404, y=490-588)
        const r5c3_120 = [];
        for (let y=490; y<588 && r5c3_120.length<15; y++) {
          for (let x=303; x<404 && r5c3_120.length<15; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (Math.abs(avg-120)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) r5c3_120.push({x,y,oR,oG,oB,rR,rG,rB,d:Math.round(d)});
          }
        }

        // Sample OUR≈250 wrong pixels (where are they?)
        const wrong250_samples = [];
        for (let y=0; y<H && wrong250_samples.length<20; y++) {
          for (let x=0; x<W && wrong250_samples.length<20; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (Math.abs(avg-250)>8) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) wrong250_samples.push({x,y,oR,oG,oB,rR,rG,rB,d:Math.round(d)});
          }
        }

        // Sim: removing RunwayEdgeLights = changing OUR≈247 → background=235
        // The circles are at y=61, y=85 (north), y=144, y=168 (south) with fill=white opacity=0.6
        // OUR over runway(239): 0.6×255+0.4×239=248.6≈249
        // OUR over bg(235): 0.6×255+0.4×235=247
        // OUR over black band(17): 0.6×255+0.4×17=159.8≈160
        const rwySim = simToGrey(248, 8); // captures 240-256 range

        // Sim: removing HoldingSpotMarkers (white rect opacity=0.95 over bg=235)
        // OUR = 0.95×255+0.05×235=253.8≈254
        const hsmSim = simToGrey(254, 4);

        // Sim: removing ParkingPositionMarkers (white rect opacity=0.95)
        // same as hsmSim

        // Sim: HoldingSpotMarker STROKE (#555=85 width=0.8 over bg=235)
        // At 50% coverage on the rect border: OUR=0.5×85+0.5×254=169.5→bin 170
        // Actually: stroke is on top of the rect background.
        // After crispEdges, the 0.8px stroke might still produce anti-aliased pixels.

        // Check: what OUR values exist in the area of HS4 (SVG x=517, y=260 → CMP x=564, y=265)?
        // Row 2 area
        function ourDist(x0,y0,x1,y1) {
          const hist={};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const avg=Math.round((oR+oG+oB)/3/10)*10;
              hist[avg]=(hist[avg]||0)+1;
            }
          }
          return Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,8);
        }

        // Check area around HS4 at CMP(564, 265): small 20×20 box
        const hs4_area = ourDist(554, 255, 574, 275);

        // Check area around HS5 at SVG(557,305) → CMP(607,310): 20×20 box
        const hs5_area = ourDist(597, 300, 617, 320);

        // What pixels are wrong in row 1 (y=98-196) col 1 (x=101-202) — r1c1 area?
        const r1c1_120 = [];
        for (let y=98; y<196 && r1c1_120.length<10; y++) {
          for (let x=101; x<202 && r1c1_120.length<10; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const avg=(oR+oG+oB)/3;
            if (Math.abs(avg-120)>15) continue;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) r1c1_120.push({x,y,oR,oG,oB,rR,rG,rB,d:Math.round(d)});
          }
        }

        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({ totalWrong, sim250, sim245, rwySim, hsmSim,
                  r2c7_120, r2c9_120, r5c3_120, r1c1_120,
                  wrong250_samples, hs4_area, hs5_area });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);
console.log('OUR≈250→235:', JSON.stringify(result.sim250));
console.log('OUR≈245→235:', JSON.stringify(result.sim245));
console.log('RunwayEdgeLights (OUR≈248→235):', JSON.stringify(result.rwySim));
console.log('HoldingSpotMarkers (OUR≈254→235):', JSON.stringify(result.hsmSim));

console.log('\n=== OUR≈250 wrong pixel samples (first 20) ===');
for (const s of result.wrong250_samples)
  console.log(`  CMP(${s.x},${s.y}) OUR=(${s.oR},${s.oG},${s.oB}) REF=(${s.rR},${s.rG},${s.rB}) diff=${s.d}`);

console.log('\n=== OUR≈120 wrong in r2c7 ===');
for (const s of result.r2c7_120)
  console.log(`  CMP(${s.x},${s.y}) OUR=(${s.oR},${s.oG},${s.oB}) REF=(${s.rR},${s.rG},${s.rB}) diff=${s.d}`);

console.log('\n=== OUR≈120 wrong in r2c9 ===');
for (const s of result.r2c9_120)
  console.log(`  CMP(${s.x},${s.y}) OUR=(${s.oR},${s.oG},${s.oB}) REF=(${s.rR},${s.rG},${s.rB}) diff=${s.d}`);

console.log('\n=== OUR≈120 wrong in r5c3 ===');
for (const s of result.r5c3_120)
  console.log(`  CMP(${s.x},${s.y}) OUR=(${s.oR},${s.oG},${s.oB}) REF=(${s.rR},${s.rG},${s.rB}) diff=${s.d}`);

console.log('\n=== OUR≈120 wrong in r1c1 ===');
for (const s of result.r1c1_120)
  console.log(`  CMP(${s.x},${s.y}) OUR=(${s.oR},${s.oG},${s.oB}) REF=(${s.rR},${s.rG},${s.rB}) diff=${s.d}`);

console.log('\n=== OUR dist at HS4 area (CMP 554-574, 255-275) ===');
for (const [k,v] of result.hs4_area) console.log(`  OUR≈${k}: ${v}px`);

console.log('\n=== OUR dist at HS5 area (CMP 597-617, 300-320) ===');
for (const [k,v] of result.hs5_area) console.log(`  OUR≈${k}: ${v}px`);

await browser.close();
