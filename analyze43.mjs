// Map exact positions of REF=0 pixels in r4c9, r5c9, r4c4 to find shapes to add.
// Also check r4c4 black feature shape.
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

        // Map REF dark pixels (REF<80) in our key cells where OUR=235
        // For each cell, produce a spatial density map (10×10 sub-regions)
        function mapDarkRef(x0,y0,x1,y1, darkThresh=80) {
          const W_=x1-x0, H_=y1-y0;
          const bx=10, by=10; // 10×10 blocks
          const bW=Math.ceil(W_/bx), bH=Math.ceil(H_/by);
          const blocks=[];
          for (let by_=0; by_<by; by_++) {
            const row=[];
            for (let bx_=0; bx_<bx; bx_++) {
              let dark=0, total=0;
              for (let dy=0; dy<bH; dy++) {
                for (let dx=0; dx<bW; dx++) {
                  const x=x0+bx_*bW+dx, y=y0+by_*bH+dy;
                  if (x>=x1||y>=y1||x>=W||y>=H) continue;
                  const i=(y*W+x)*4;
                  const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
                  // Only look at pixels where OUR≈235 (background)
                  if (Math.abs(oR-235)>10 || Math.abs(oG-235)>10 || Math.abs(oB-235)>10) { total++; continue; }
                  const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
                  const rb=(rR+rG+rB)/3;
                  if (rb<darkThresh) dark++;
                  total++;
                }
              }
              row.push(dark>0 ? Math.min(9,Math.round(dark/Math.max(1,total)*10)) : 0);
            }
            blocks.push(row);
          }
          return blocks;
        }

        // r4c9: CMP x=909-1010, y=392-490
        const r4c9_map = mapDarkRef(909,392,1010,490, 60);
        // r5c9: CMP x=909-1010, y=490-588
        const r5c9_map = mapDarkRef(909,490,1010,588, 60);
        // r4c4: CMP x=404-505, y=392-490
        const r4c4_map = mapDarkRef(404,392,505,490, 60);
        // r4c8: CMP x=808-909, y=392-490
        const r4c8_map = mapDarkRef(808,392,909,490, 60);
        // r3c8: CMP x=808-909, y=294-392
        const r3c8_map = mapDarkRef(808,294,909,392, 60);

        // Also show exact bounding box of dark REF pixels in each cell
        function darkRefBounds(x0,y0,x1,y1, darkThresh=60) {
          let minX=x1,maxX=x0,minY=y1,maxY=y0, count=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>10 || Math.abs(oG-235)>10 || Math.abs(oB-235)>10) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const rb=(rR+rG+rB)/3;
              if (rb<darkThresh) {
                if (x<minX) minX=x; if (x>maxX) maxX=x;
                if (y<minY) minY=y; if (y>maxY) maxY=y;
                count++;
              }
            }
          }
          if (count===0) return null;
          // Convert CMP→SVG: x/1.091, y/1.017
          return {
            cmpX0:minX, cmpY0:minY, cmpX1:maxX, cmpY1:maxY, count,
            svgX0:Math.round(minX/1.091), svgY0:Math.round(minY/1.017),
            svgX1:Math.round(maxX/1.091), svgY1:Math.round(maxY/1.017),
          };
        }

        const r4c9_bounds = darkRefBounds(909,392,1010,490);
        const r5c9_bounds = darkRefBounds(909,490,1010,588);
        const r4c4_bounds = darkRefBounds(404,392,505,490);
        const r4c8_bounds = darkRefBounds(808,392,909,490);
        const r3c8_bounds = darkRefBounds(808,294,909,392);
        const r5c6_bounds = darkRefBounds(606,490,707,588);
        const r6c7_bounds = darkRefBounds(707,588,808,686);

        // Check if adding a specific rect would net positive
        function simAddRect(svgX0, svgY0, svgX1, svgY1) {
          // Convert SVG to CMP
          const cx0=Math.round(svgX0*1.091), cy0=Math.round(svgY0*1.017);
          const cx1=Math.round(svgX1*1.091), cy1=Math.round(svgY1*1.017);
          let fixes=0, breaks=0;
          for (let y=cy0; y<Math.min(cy1,H); y++) {
            for (let x=cx0; x<Math.min(cx1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              // Only affect OUR≈235 pixels (background that would be covered by black rect)
              if (Math.abs(oR-235)>10 || Math.abs(oG-235)>10 || Math.abs(oB-235)>10) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dOld=(Math.abs(rR-235)+Math.abs(rG-235)+Math.abs(rB-235))/3;
              const dNew=(Math.abs(rR-0)+Math.abs(rG-0)+Math.abs(rB-0))/3;
              if (dOld>20 && dNew<=20) fixes++;
              else if (dOld<=20 && dNew>20) breaks++;
            }
          }
          return {fixes,breaks,net:fixes-breaks};
        }

        // Simulate adding black rects at r4c9 bounds and nearby
        const r4c9_rectSim = r4c9_bounds ? simAddRect(r4c9_bounds.svgX0, r4c9_bounds.svgY0, r4c9_bounds.svgX1+1, r4c9_bounds.svgY1+1) : null;
        const r5c9_rectSim = r5c9_bounds ? simAddRect(r5c9_bounds.svgX0, r5c9_bounds.svgY0, r5c9_bounds.svgX1+1, r5c9_bounds.svgY1+1) : null;
        const r4c4_rectSim = r4c4_bounds ? simAddRect(r4c4_bounds.svgX0, r4c4_bounds.svgY0, r4c4_bounds.svgX1+1, r4c4_bounds.svgY1+1) : null;

        // Also check: what does adding the existing black building (SVG x=912-1091, y=541-586) sim show?
        // It's already in the SVG, so let's check: what additional area would help?
        // Try extending it upward: y=385-586
        const extendBlack_up = simAddRect(912, 385, 1091, 541);
        // Try a larger region around r4c9 center
        const bigBlack = simAddRect(833, 385, 1091, 580);

        // Total wrong
        let totalWrong=0;
        for (let i=0; i<W*H*4; i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({ r4c9_map, r5c9_map, r4c4_map, r4c8_map, r3c8_map,
                  r4c9_bounds, r5c9_bounds, r4c4_bounds, r4c8_bounds, r3c8_bounds,
                  r5c6_bounds, r6c7_bounds,
                  r4c9_rectSim, r5c9_rectSim, r4c4_rectSim,
                  extendBlack_up, bigBlack, totalWrong });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

function printMap(m, label) {
  console.log(`\n${label} (dark ref density, 0-9 scale, 10×10 blocks):`);
  for (const row of m) console.log('  ' + row.map(v=>v===0?'.':(v<3?'+':(v<7?'#':'█'))).join(''));
}

console.log(`Total wrong: ${result.totalWrong}`);

printMap(result.r4c9_map, 'r4c9 dark REF density');
printMap(result.r5c9_map, 'r5c9 dark REF density');
printMap(result.r4c4_map, 'r4c4 dark REF density');
printMap(result.r4c8_map, 'r4c8 dark REF density');
printMap(result.r3c8_map, 'r3c8 dark REF density');

console.log('\n=== Bounds of dark REF pixels (where OUR=235 but REF<60) ===');
for (const [label, b] of [['r4c9',result.r4c9_bounds],['r5c9',result.r5c9_bounds],['r4c4',result.r4c4_bounds],['r4c8',result.r4c8_bounds],['r3c8',result.r3c8_bounds]]) {
  if (!b) { console.log(`  ${label}: none`); continue; }
  console.log(`  ${label}: CMP (${b.cmpX0}-${b.cmpX1}, ${b.cmpY0}-${b.cmpY1}) SVG (${b.svgX0}-${b.svgX1}, ${b.svgY0}-${b.svgY1}) count=${b.count}`);
  if (result[`${label}_rectSim`]) console.log(`    → rect sim: ${JSON.stringify(result[`${label}_rectSim`])}`);
}
for (const [label, b] of [['r5c6',result.r5c6_bounds],['r6c7',result.r6c7_bounds]]) {
  if (!b) { console.log(`  ${label}: none`); continue; }
  console.log(`  ${label}: CMP (${b.cmpX0}-${b.cmpX1}, ${b.cmpY0}-${b.cmpY1}) SVG (${b.svgX0}-${b.svgX1}, ${b.svgY0}-${b.svgY1}) count=${b.count}`);
}

console.log('\n=== Extend black building upward: SVG x=912-1091, y=385-541 ===');
console.log(JSON.stringify(result.extendBlack_up));
console.log('\n=== Big black: SVG x=833-1091, y=385-580 ===');
console.log(JSON.stringify(result.bigBlack));

await browser.close();
