// Investigate below-VAECO zone + r2c2/r1c3 infield + other targets.
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

        function sampleCell(x0, y0, x1, y1) {
          let rR=0,rG=0,rB=0,oR=0,oG=0,oB=0,cnt=0,wrong=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              rR+=refPx.data[i]; rG+=refPx.data[i+1]; rB+=refPx.data[i+2];
              oR+=ourPx.data[i]; oG+=ourPx.data[i+1]; oB+=ourPx.data[i+2];
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) wrong++;
              cnt++;
            }
          }
          const f=(rgb,n)=>'#'+rgb.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join('');
          return { refAvg:f([rR,rG,rB],cnt), ourAvg:f([oR,oG,oB],cnt), pct:Math.round(wrong*100/cnt), wrong, cnt };
        }

        function simOverlay(x0, y0, x1, y1, newR, newG, newB, ourThresh=230) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (oR<ourThresh || oG<ourThresh || oB<ourThresh) continue;
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-newR)+Math.abs(rG-newG)+Math.abs(rB-newB))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes, breaks, net:fixes-breaks};
        }

        // === Below-VAECO grey rect: SVG x=831-1200, y=440-510 → CMP x=907-1309, y=448-519 ===
        // VAECO polygon ends at y=440 SVG. Below this is background white.
        // Test various grey fills for the below-VAECO zone.
        const belowVaeco_r4 = {};
        for (const [label, rgb] of [
          ['215', [215,214,207]], ['220', [220,220,213]], ['225', [225,225,218]],
          ['227', [227,226,219]], ['230', [230,229,222]],
        ]) {
          belowVaeco_r4[label] = simOverlay(907, 448, 1309, 519, ...rgb);
        }

        // Same but only below r4c12 x=1212-1309
        const belowVaeco_r4c12 = {};
        for (const [label, rgb] of [
          ['220', [220,220,213]], ['225', [225,225,218]], ['230', [230,229,222]], ['235', [235,234,228]],
        ]) {
          belowVaeco_r4c12[label] = simOverlay(1212, 448, 1309, 519, ...rgb);
        }

        // Below VAECO extended to y=519 (r5 cells)
        const belowVaeco_wide = {};
        for (const [label, rgb] of [
          ['220', [220,220,213]], ['225', [225,225,218]], ['230', [230,229,222]], ['235', [235,234,228]],
        ]) {
          belowVaeco_wide[label] = simOverlay(907, 448, 1309, 600, ...rgb);
        }

        // === r2c2, r1c3, r2c0 infield sims ===
        // r2c2: CMP x=202-303, y=196-294 → infield between runways
        const r2c2_sim = {};
        for (const [label, rgb] of [
          ['215', [215,215,212]], ['210', [210,210,207]], ['205', [205,205,202]],
          ['220', [220,220,217]],
        ]) {
          r2c2_sim[label] = simOverlay(202, 196, 303, 294, ...rgb);
        }

        // r1c3: CMP x=303-404, y=98-196
        const r1c3_sim = {};
        for (const [label, rgb] of [
          ['215', [215,215,212]], ['210', [210,210,207]], ['220', [220,220,217]],
        ]) {
          r1c3_sim[label] = simOverlay(303, 98, 404, 196, ...rgb);
        }

        // r2c0: CMP x=0-101, y=196-294
        const r2c0_sim = {};
        for (const [label, rgb] of [
          ['220', [220,220,217]], ['215', [215,215,212]], ['210', [210,210,207]],
        ]) {
          r2c0_sim[label] = simOverlay(0, 196, 101, 294, ...rgb);
        }

        // === r3c5 (1672 wrong): CMP x=505-606, y=294-392 ===
        const r3c5_cell = sampleCell(505, 294, 606, 392);
        const r3c5_sim = {};
        for (const [label, rgb] of [
          ['220', [220,220,213]], ['225', [225,225,218]], ['228', [228,228,221]],
          ['230', [230,229,222]], ['235', [235,234,228]],
        ]) {
          r3c5_sim[label] = simOverlay(505, 294, 606, 392, ...rgb);
        }

        // === r3c0/r3c1 DOM apron west edge ===
        const r3c0_cell = sampleCell(0, 294, 101, 392);
        const r3c1_cell = sampleCell(101, 294, 202, 392);
        // Simulate making DOM apron slightly darker
        const r3c0_sim228 = simOverlay(0, 294, 101, 392, 228, 230, 218, 230);
        const r3c0_sim232 = simOverlay(0, 294, 101, 392, 232, 234, 222, 230);

        // === Wide infield grey band ===
        // Check if a grey infield y=170-268 SVG → CMP y=173-273 would help NOW
        const greyInfield = {};
        for (const [label, rgb] of [
          ['220', [220,220,215]], ['215', [215,215,210]], ['225', [225,225,220]],
        ]) {
          greyInfield[label] = simOverlay(0, 173, 1309, 273, ...rgb);
        }

        // === Row scan to understand r4c12 below-VAECO ===
        function rowScan(y, x0, x1, step=4) {
          const pts=[];
          for(let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if(d>20) pts.push({x, svgX:Math.round(x/1.091),
              ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]],
              our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]],
              diff:Math.round(d)});
          }
          return pts;
        }

        // Row y=460 (CMP) in r4c12 zone: CMP x=1212-1309 → expecting below-VAECO background
        const row460_r4c12 = rowScan(460, 1212, 1309);
        // Row y=460 in full r4 zone
        const row460_full = rowScan(460, 909, 1309, 8);
        // Row y=500 in r5 zone
        const row500_full = rowScan(500, 909, 1309, 8);

        resolve({ belowVaeco_r4, belowVaeco_r4c12, belowVaeco_wide,
                  r2c2_sim, r1c3_sim, r2c0_sim, r3c5_sim, r3c5_cell,
                  r3c0_cell, r3c1_cell, r3c0_sim228, r3c0_sim232, greyInfield,
                  row460_r4c12, row460_full, row500_full });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v => v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Below-VAECO rect (y=448-519 CMP, full x=907-1309) ===');
for (const [k,v] of Object.entries(result.belowVaeco_r4)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== Below-VAECO r4c12 only (x=1212-1309, y=448-519) ===');
for (const [k,v] of Object.entries(result.belowVaeco_r4c12)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== Below-VAECO wide (y=448-600 CMP, x=907-1309) ===');
for (const [k,v] of Object.entries(result.belowVaeco_wide)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r2c2 infield sims ===');
for (const [k,v] of Object.entries(result.r2c2_sim)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r1c3 infield sims ===');
for (const [k,v] of Object.entries(result.r1c3_sim)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r2c0 infield sims ===');
for (const [k,v] of Object.entries(result.r2c0_sim)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r3c5 sims ===', result.r3c5_cell);
for (const [k,v] of Object.entries(result.r3c5_sim)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r3c0 & r3c1 cells ===', result.r3c0_cell, result.r3c1_cell);
console.log('  sim228:', JSON.stringify(result.r3c0_sim228));
console.log('  sim232:', JSON.stringify(result.r3c0_sim232));

console.log('\n=== Grey infield (y=173-273 CMP, full x) ===');
for (const [k,v] of Object.entries(result.greyInfield)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== Row y=460 in r4c12 zone (x=1212-1309) ===');
for(const p of result.row460_r4c12) console.log(`  x=${p.x}(svg${p.svgX}) REF:${fmt(p.ref)} OUR:${fmt(p.our)} d=${p.diff}`);

console.log('\n=== Row y=460 full r4 (x=909-1309, step=8) ===');
for(const p of result.row460_full) console.log(`  x=${p.x}(svg${p.svgX}) REF:${fmt(p.ref)} OUR:${fmt(p.our)} d=${p.diff}`);

console.log('\n=== Row y=500 full r5 (x=909-1309, step=8) ===');
for(const p of result.row500_full) console.log(`  x=${p.x}(svg${p.svgX}) REF:${fmt(p.ref)} OUR:${fmt(p.our)} d=${p.diff}`);

await browser.close();
