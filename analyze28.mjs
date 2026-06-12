// Targeted simulation for r3c9 and surrounding VAECO cells.
// Find optimal color for targeted overlay in the high-wrong zones.
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

        // Simulate changing OUR near-apron pixels (>220) in a zone to a new color
        function simOverlay(x0, y0, x1, y1, newR, newG, newB, ourThresh=220) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (oR<ourThresh || oG<ourThresh || oB<ourThresh) continue;
              const dBefore=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dAfter=(Math.abs(rR-newR)+Math.abs(rG-newG)+Math.abs(rB-newB))/3;
              if (dBefore>20 && dAfter<=20) fixes++;
              else if (dBefore<=20 && dAfter>20) breaks++;
            }
          }
          return {fixes, breaks, net:fixes-breaks};
        }

        // Test r3c9 zone: CMP x=909-1010, y=294-392 → SVG x=833-926, y=289-386
        const r3c9_test = {};
        for (const [label, rgb] of [
          ['220', [220,220,213]], ['215', [215,214,207]], ['212', [212,212,205]],
          ['210', [210,210,203]], ['208', [208,208,201]], ['205', [205,204,197]],
        ]) {
          r3c9_test[label] = simOverlay(909, 294, 1010, 392, ...rgb);
        }

        // Test r3c10 zone: CMP x=1010-1111, y=294-392
        const r3c10_test = {};
        for (const [label, rgb] of [
          ['225', [225,225,218]], ['220', [220,220,213]], ['218', [218,218,211]],
          ['215', [215,214,207]], ['210', [210,210,203]],
        ]) {
          r3c10_test[label] = simOverlay(1010, 294, 1111, 392, ...rgb);
        }

        // Test r3c11 zone: CMP x=1111-1212, y=294-392
        const r3c11_test = {};
        for (const [label, rgb] of [
          ['220', [220,220,213]], ['215', [215,214,207]], ['212', [212,212,205]], ['210', [210,210,203]],
        ]) {
          r3c11_test[label] = simOverlay(1111, 294, 1212, 392, ...rgb);
        }

        // Combined test: all r3c9-c11 together with one color
        const r3c9_11_test = {};
        for (const [label, rgb] of [
          ['220', [220,220,213]], ['215', [215,214,207]], ['212', [212,212,205]], ['210', [210,210,203]],
          ['208', [208,208,201]], ['225', [225,225,218]],
        ]) {
          r3c9_11_test[label] = simOverlay(909, 294, 1212, 392, ...rgb);
        }

        // Also test r3c12 (rightmost cell): CMP x=1212-1309, y=294-392
        const r3c12_test = {};
        for (const [label, rgb] of [
          ['220', [220,220,213]], ['215', [215,214,207]], ['212', [212,212,205]], ['218', [218,218,211]],
        ]) {
          r3c12_test[label] = simOverlay(1212, 294, 1309, 392, ...rgb);
        }

        // Check r4c9 zone: CMP x=909-1010, y=392-490 → lower VAECO zone
        const r4c9_test = {};
        for (const [label, rgb] of [
          ['215', [215,214,207]], ['210', [210,210,203]], ['205', [205,204,197]], ['200', [200,199,192]],
          ['225', [225,225,218]], ['230', [230,229,222]],
        ]) {
          r4c9_test[label] = simOverlay(909, 392, 1010, 490, ...rgb);
        }

        // Check VAECO-zone r2c9 (upper VAECO): CMP x=909-1010, y=196-294
        const r2c9_test = {};
        for (const [label, rgb] of [
          ['210', [210,210,203]], ['205', [205,204,197]], ['200', [200,199,192]],
        ]) {
          r2c9_test[label] = simOverlay(909, 196, 1010, 294, ...rgb);
        }

        // Full VAECO zone x=833-1200 SVG → CMP x=909-1309, y=269-447 with darker overlay
        // (but now OUR is already at #ebeae4=235, so ourThresh should be lower)
        const fullVaeco_thresh220 = {};
        for (const [label, rgb] of [
          ['220', [220,220,213]], ['215', [215,214,207]], ['210', [210,210,203]],
        ]) {
          fullVaeco_thresh220[label] = simOverlay(909, 294, 1309, 392, ...rgb, 220);
        }

        // Grid
        const grid = {};
        for (let r=0; r<9; r++) for (let c=0; c<13; c++) grid[`r${r}c${c}`] = sampleCell(c*101,r*98,(c+1)*101,(r+1)*98);

        resolve({ r3c9_test, r3c10_test, r3c11_test, r3c9_11_test, r3c12_test, r4c9_test, r2c9_test, fullVaeco_thresh220, grid });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log('\n=== r3c9 overlay simulations ===');
for (const [k,v] of Object.entries(result.r3c9_test)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r3c10 overlay simulations ===');
for (const [k,v] of Object.entries(result.r3c10_test)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r3c11 overlay simulations ===');
for (const [k,v] of Object.entries(result.r3c11_test)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r3c9-c11 combined ===');
for (const [k,v] of Object.entries(result.r3c9_11_test)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r3c12 overlay simulations ===');
for (const [k,v] of Object.entries(result.r3c12_test)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r4c9 overlay simulations ===');
for (const [k,v] of Object.entries(result.r4c9_test)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r2c9 overlay simulations ===');
for (const [k,v] of Object.entries(result.r2c9_test)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== VAECO r3 zone (x=909-1309, y=294-392) darker overlay ===');
for (const [k,v] of Object.entries(result.fullVaeco_thresh220)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== Grid top 20 wrong ===');
const sorted = Object.entries(result.grid).sort((a,b)=>b[1].wrong-a[1].wrong);
for (const [k,v] of sorted.slice(0,20)) console.log(`  ${k}: REF:${v.refAvg} OUR:${v.ourAvg} ${v.pct}% (${v.wrong})`);
console.log(`  TOTAL: ${Object.values(result.grid).reduce((s,v)=>s+v.wrong,0)}`);

await browser.close();
