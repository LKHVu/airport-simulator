// Directional wrong-pixel analysis: for each top cell, count
//   OUR_too_bright: avg(OUR) > avg(REF) + 20 → we're drawing too light
//   OUR_too_dark: avg(OUR) < avg(REF) - 20 → we're drawing too dark
// Also do row/col concentration and sample worst pixels.
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

        function analyzeCell(x0, y0, x1, y1) {
          let tooBright=0, tooDark=0, total=0, wrongCnt=0;
          const wrongSamples=[];
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oA=(ourPx.data[i]+ourPx.data[i+1]+ourPx.data[i+2])/3;
              const rA=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              total++;
              if (d>20) {
                wrongCnt++;
                if (oA > rA) tooBright++;
                else tooDark++;
                if (wrongSamples.length<8) wrongSamples.push({x,y,rA:Math.round(rA),oA:Math.round(oA),d:Math.round(d),dir:oA>rA?'bright':'dark'});
              }
            }
          }
          return {tooBright, tooDark, total, wrongCnt, wrongSamples};
        }

        // Row scan: find columns where wrong pixels cluster (to find specific features)
        function colScan(x0, y0, x1, y1) {
          const cols=[];
          for (let x=x0; x<Math.min(x1,W); x++) {
            let wrong=0, cnt=0, sumOurR=0, sumRefR=0;
            for (let y=y0; y<Math.min(y1,H); y++) {
              const i=(y*W+x)*4;
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) wrong++;
              sumOurR+=ourPx.data[i]; sumRefR+=refPx.data[i]; cnt++;
            }
            if (wrong > 10) cols.push({x, svgX:Math.round(x/1.091), wrong, pct:Math.round(wrong*100/cnt), ourAvg:Math.round(sumOurR/cnt), refAvg:Math.round(sumRefR/cnt)});
          }
          return cols.sort((a,b)=>b.wrong-a.wrong).slice(0,12);
        }

        function rowScan(x0, y0, x1, y1) {
          const rows=[];
          for (let y=y0; y<Math.min(y1,H); y++) {
            let wrong=0, cnt=0, sumOurR=0, sumRefR=0;
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) wrong++;
              sumOurR+=ourPx.data[i]; sumRefR+=refPx.data[i]; cnt++;
            }
            if (wrong > 5) rows.push({y, svgY:Math.round(y/1.017), wrong, pct:Math.round(wrong*100/cnt), ourAvg:Math.round(sumOurR/cnt), refAvg:Math.round(sumRefR/cnt)});
          }
          return rows.sort((a,b)=>b.wrong-a.wrong).slice(0,12);
        }

        // Also simulate adding a rect with simOverlay (ourThresh=230 for nearly-white pixels)
        function simOverlayHigh(x0, y0, x1, y1, newR, newG, newB) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (oR<230 || oG<230 || oB<230) continue;
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-newR)+Math.abs(rG-newG)+Math.abs(rB-newB))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes, breaks, net:fixes-breaks};
        }

        // r3c7: CMP x=707-808, y=294-392 → SVG x=648-741, y=289-386
        const r3c7 = analyzeCell(707, 294, 808, 392);
        const r3c7_cols = colScan(707, 294, 808, 392);
        const r3c7_rows = rowScan(707, 294, 808, 392);

        // r4c6: CMP x=606-707, y=392-490
        const r4c6 = analyzeCell(606, 392, 707, 490);
        const r4c6_cols = colScan(606, 392, 707, 490);
        const r4c6_rows = rowScan(606, 392, 707, 490);

        // r3c6: CMP x=606-707, y=294-392
        const r3c6 = analyzeCell(606, 294, 707, 392);
        const r3c6_cols = colScan(606, 294, 707, 392);

        // r4c4: CMP x=404-505, y=392-490 → SVG x=370-463, y=386-482
        const r4c4 = analyzeCell(404, 392, 505, 490);
        const r4c4_cols = colScan(404, 392, 505, 490);
        const r4c4_rows = rowScan(404, 392, 505, 490);

        // r2c0: CMP x=0-101, y=196-294 → SVG x=0-93, y=193-289
        const r2c0 = analyzeCell(0, 196, 101, 294);
        const r2c0_cols = colScan(0, 196, 101, 294);

        // r3c0: CMP x=0-101, y=294-392
        const r3c0 = analyzeCell(0, 294, 101, 392);

        // r5c6: CMP x=606-707, y=490-588
        const r5c6 = analyzeCell(606, 490, 707, 588);
        const r5c6_rows = rowScan(606, 490, 707, 588);

        // r4c12: CMP x=1212-1309, y=392-490
        const r4c12 = analyzeCell(1212, 392, 1309, 490);

        // r5c9: CMP x=909-1010, y=490-588
        const r5c9 = analyzeCell(909, 490, 1010, 588);
        const r5c9_rows = rowScan(909, 490, 1010, 588);

        // r6c7: CMP x=707-808, y=588-686
        const r6c7 = analyzeCell(707, 588, 808, 686);
        const r6c7_rows = rowScan(707, 588, 808, 686);

        // Simulate making r4c6 apron slightly darker (currently BG_APRON_DOM area?)
        // r4c6: SVG x=555-648, y=386-482 — inside DOM apron south extension (x=385-582, y=360-431)
        // DOM apron = #edefe1 (237,239,225). Ref avg = 228. diff = 10 → correct. But 27% wrong!
        // Let's check if OUR-too-bright pixels can be fixed
        const r4c6_sim220 = simOverlayHigh(606, 392, 707, 490, 220, 220, 213);
        const r4c6_sim228 = simOverlayHigh(606, 392, 707, 490, 228, 228, 220);
        const r4c6_sim232 = simOverlayHigh(606, 392, 707, 490, 232, 231, 224);

        // Simulate making r3c6 zone darker
        const r3c6_sim220 = simOverlayHigh(606, 294, 707, 392, 220, 220, 213);
        const r3c6_sim228 = simOverlayHigh(606, 294, 707, 392, 228, 228, 220);

        // r3c7 zone
        const r3c7_sim225 = simOverlayHigh(707, 294, 808, 392, 225, 224, 218);
        const r3c7_sim220 = simOverlayHigh(707, 294, 808, 392, 220, 220, 213);

        // r4c4 area
        const r4c4_sim220 = simOverlayHigh(404, 392, 505, 490, 220, 220, 213);
        const r4c4_sim228 = simOverlayHigh(404, 392, 505, 490, 228, 228, 220);

        // r2c0 area (SVG x=0-93, y=193-289 — between taxiways, near-white ref?)
        const r2c0_sim220 = simOverlayHigh(0, 196, 101, 294, 220, 220, 213);
        const r2c0_sim228 = simOverlayHigh(0, 196, 101, 294, 228, 228, 220);

        resolve({ r3c7, r3c7_cols, r3c7_rows, r4c6, r4c6_cols, r4c6_rows,
                  r3c6, r3c6_cols, r4c4, r4c4_cols, r4c4_rows,
                  r2c0, r2c0_cols, r3c0, r5c6, r5c6_rows, r4c12, r5c9, r5c9_rows, r6c7, r6c7_rows,
                  r4c6_sim220, r4c6_sim228, r4c6_sim232,
                  r3c6_sim220, r3c6_sim228,
                  r3c7_sim225, r3c7_sim220,
                  r4c4_sim220, r4c4_sim228,
                  r2c0_sim220, r2c0_sim228 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

function printCell(label, data) {
  const {tooBright, tooDark, total, wrongCnt} = data;
  console.log(`  ${label}: wrong=${wrongCnt} bright=${tooBright}(${Math.round(tooBright*100/wrongCnt)}%) dark=${tooDark}(${Math.round(tooDark*100/wrongCnt)}%)`);
  console.log(`    samples:`, data.wrongSamples.slice(0,4).map(s=>`x=${s.x},y=${s.y} rA=${s.rA} oA=${s.oA} d=${s.d} ${s.dir}`).join(' | '));
}

console.log('\n=== Directional wrong-pixel breakdown ===');
printCell('r3c7', result.r3c7);
printCell('r4c6', result.r4c6);
printCell('r3c6', result.r3c6);
printCell('r4c4', result.r4c4);
printCell('r2c0', result.r2c0);
printCell('r3c0', result.r3c0);
printCell('r5c6', result.r5c6);
printCell('r4c12', result.r4c12);
printCell('r5c9', result.r5c9);
printCell('r6c7', result.r6c7);

console.log('\n=== r3c7 top cols (x cluster) ===');
for (const c of result.r3c7_cols.slice(0,8)) console.log(`  x=${c.x}(svg${c.svgX}): wrong=${c.wrong} ${c.pct}% ourA=${c.ourAvg} refA=${c.refAvg}`);
console.log('  top rows:');
for (const r of result.r3c7_rows.slice(0,8)) console.log(`  y=${r.y}(svg${r.svgY}): wrong=${r.wrong} ${r.pct}% ourA=${r.ourAvg} refA=${r.refAvg}`);

console.log('\n=== r4c6 top cols ===');
for (const c of result.r4c6_cols.slice(0,8)) console.log(`  x=${c.x}(svg${c.svgX}): wrong=${c.wrong} ${c.pct}% ourA=${c.ourAvg} refA=${c.refAvg}`);
console.log('  top rows:');
for (const r of result.r4c6_rows.slice(0,8)) console.log(`  y=${r.y}(svg${r.svgY}): wrong=${r.wrong} ${r.pct}% ourA=${r.ourAvg} refA=${r.refAvg}`);

console.log('\n=== r3c6 top cols ===');
for (const c of result.r3c6_cols.slice(0,8)) console.log(`  x=${c.x}(svg${c.svgX}): wrong=${c.wrong} ${c.pct}% ourA=${c.ourAvg} refA=${c.refAvg}`);

console.log('\n=== r4c4 top cols/rows ===');
for (const c of result.r4c4_cols.slice(0,8)) console.log(`  x=${c.x}(svg${c.svgX}): wrong=${c.wrong} ${c.pct}% ourA=${c.ourAvg} refA=${c.refAvg}`);
for (const r of result.r4c4_rows.slice(0,8)) console.log(`  y=${r.y}(svg${r.svgY}): wrong=${r.wrong} ${r.pct}% ourA=${r.ourAvg} refA=${r.refAvg}`);

console.log('\n=== r2c0 top cols ===');
for (const c of result.r2c0_cols.slice(0,8)) console.log(`  x=${c.x}(svg${c.svgX}): wrong=${c.wrong} ${c.pct}% ourA=${c.ourAvg} refA=${c.refAvg}`);

console.log('\n=== r5c9 rows ===');
for (const r of result.r5c9_rows.slice(0,8)) console.log(`  y=${r.y}(svg${r.svgY}): wrong=${r.wrong} ${r.pct}% ourA=${r.ourAvg} refA=${r.refAvg}`);

console.log('\n=== r6c7 rows ===');
for (const r of result.r6c7_rows.slice(0,8)) console.log(`  y=${r.y}(svg${r.svgY}): wrong=${r.wrong} ${r.pct}% ourA=${r.ourAvg} refA=${r.refAvg}`);

console.log('\n=== Overlay simulations ===');
console.log('r4c6 sim 220:', JSON.stringify(result.r4c6_sim220));
console.log('r4c6 sim 228:', JSON.stringify(result.r4c6_sim228));
console.log('r4c6 sim 232:', JSON.stringify(result.r4c6_sim232));
console.log('r3c6 sim 220:', JSON.stringify(result.r3c6_sim220));
console.log('r3c6 sim 228:', JSON.stringify(result.r3c6_sim228));
console.log('r3c7 sim 225:', JSON.stringify(result.r3c7_sim225));
console.log('r3c7 sim 220:', JSON.stringify(result.r3c7_sim220));
console.log('r4c4 sim 220:', JSON.stringify(result.r4c4_sim220));
console.log('r4c4 sim 228:', JSON.stringify(result.r4c4_sim228));
console.log('r2c0 sim 220:', JSON.stringify(result.r2c0_sim220));
console.log('r2c0 sim 228:', JSON.stringify(result.r2c0_sim228));

await browser.close();
