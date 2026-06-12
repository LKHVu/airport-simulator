// Test: (1) r6c7 overlay options, (2) DOM apron stroke removal sim,
//       (3) INTL lower apron overlay (r5c7, r6c7, r7c7 area)
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

        // Simulate overlay: for pixels in zone where OUR > ourThresh, change to newColor
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

        // Simulate DOM polygon stroke removal:
        // The stroke at x=582 SVG (CMP x=635) runs vertically through the apron boundary.
        // Simulate: for pixels at CMP x=633-637, any OUR pixel (any brightness) → replace with white
        function simStrokeRemoval(x0, x1, y0, y1) {
          let fixes=0, breaks=0;
          for (let x=x0; x<Math.min(x1,W); x++) {
            for (let y=y0; y<Math.min(y1,H); y++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              // Only affect pixels that look like the stroke color (c8b898 ≈ 200,184,152)
              if (Math.abs(oR-200)>40 || Math.abs(oG-184)>40 || Math.abs(oB-152)>40) continue;
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-255)+Math.abs(rG-255)+Math.abs(rB-255))/3; // replace with white
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes, breaks, net:fixes-breaks};
        }

        // More general: simulate replacing OUR stroke-colored pixels anywhere in canvas
        function simStrokeRemovalFull() {
          let fixes=0, breaks=0, cnt=0;
          for (let y=0; y<H; y++) {
            for (let x=0; x<W; x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (Math.abs(oR-200)>30 || Math.abs(oG-184)>30 || Math.abs(oB-152)>30) continue;
              cnt++;
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              // Replace with INTL apron color (#ebeae4 = 235,234,228)
              const dA_intl=(Math.abs(rR-235)+Math.abs(rG-234)+Math.abs(rB-228))/3;
              const dA_white=(Math.abs(rR-255)+Math.abs(rG-255)+Math.abs(rB-255))/3;
              const dA=Math.min(dA_intl,dA_white);
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes, breaks, net:fixes-breaks, cnt};
        }

        // r6c7 overlay tests (CMP x=707-808, y=588-686 → SVG x=648-741, y=578-675)
        // This is in the lower INTL apron area
        const r6c7_220 = simOverlay(707, 588, 808, 686, 220, 219, 213, 230);
        const r6c7_225 = simOverlay(707, 588, 808, 686, 225, 224, 218, 230);
        const r6c7_228 = simOverlay(707, 588, 808, 686, 228, 227, 221, 230);
        const r6c7_232 = simOverlay(707, 588, 808, 686, 232, 231, 225, 230);
        const r6c7_235 = simOverlay(707, 588, 808, 686, 235, 234, 228, 230);

        // Test INTL apron lower zone (y=400-686) — is it all OUR-too-bright?
        // CMP x=635-909, y=407-686 → SVG x=582-833, y=400-675
        const intlLower_228 = simOverlay(635, 407, 909, 686, 228, 227, 221, 230);
        const intlLower_232 = simOverlay(635, 407, 909, 686, 232, 231, 225, 230);
        const intlLower_235 = simOverlay(635, 407, 909, 686, 235, 234, 228, 230);

        // INTL entire column (y=265-686)
        const intlFull_232 = simOverlay(635, 269, 909, 686, 232, 231, 225, 230);
        const intlFull_228 = simOverlay(635, 269, 909, 686, 228, 227, 221, 230);

        // DOM polygon stroke removal full canvas
        const strokeRem = simStrokeRemovalFull();

        // Stroke area specific: x=632-637 (svg 580-583), full y range
        const strokeArea_r3c6 = simStrokeRemoval(632, 638, 294, 392);
        const strokeArea_r4c6 = simStrokeRemoval(632, 638, 392, 490);
        const strokeArea_r5c6 = simStrokeRemoval(632, 638, 490, 588);
        const strokeArea_full = simStrokeRemoval(632, 638, 0, H);

        // Simulate making grey stripe at x=632-637 → white
        function simToWhite(x0, x1, y0, y1) {
          let fixes=0, breaks=0;
          for (let x=x0; x<Math.min(x1,W); x++) {
            for (let y=y0; y<Math.min(y1,H); y++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (oR>230) continue; // only affect dark-ish pixels
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-255)+Math.abs(rG-255)+Math.abs(rB-255))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes, breaks, net:fixes-breaks};
        }

        // Simulate setting x=633-636 (svg 580-582) to white (removing DOM apron left edge)
        const strokeWhite_r3c6 = simToWhite(632, 637, 294, 392);
        const strokeWhite_r4c6 = simToWhite(632, 637, 392, 490);
        const strokeWhite_r5c6 = simToWhite(632, 637, 490, 588);
        const strokeWhite_full = simToWhite(632, 637, 270, 680);

        // Also test making the VAECO polygon stroke removal (stroke #c8b898)
        const vaecostroke = simStrokeRemoval(0, W, 0, H);

        // Test: widen INTL overlay to cover full y
        // VAECO border is at x=831 (SVG). The INTL apron rect covers x=582-831, y=265-865.
        // At y>400 (SVG), the INTL apron currently shows #f4f2ed (244).
        // Target: darker INTL for y=400-760 (lower portion) to help r5c7, r6c7, r7c7
        const intlMid_232 = simOverlay(635, 407, 909, 760, 232, 231, 225, 230);
        const intlMid_228 = simOverlay(635, 407, 909, 760, 228, 227, 221, 230);

        // Grid scan to get latest state
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

        // Sample INTL apron rows to see REF progression with depth
        const intlRows = {};
        for (const r of [3,4,5,6,7,8]) for (const col of [7,8]) {
          intlRows[`r${r}c${col}`] = sampleCell(col*101, r*98, (col+1)*101, (r+1)*98);
        }

        resolve({ r6c7_220, r6c7_225, r6c7_228, r6c7_232, r6c7_235,
                  intlLower_228, intlLower_232, intlLower_235, intlFull_232, intlFull_228,
                  strokeRem, strokeArea_r3c6, strokeArea_r4c6, strokeArea_r5c6, strokeArea_full,
                  strokeWhite_r3c6, strokeWhite_r4c6, strokeWhite_r5c6, strokeWhite_full,
                  intlMid_232, intlMid_228, vaecostroke, intlRows });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log('\n=== r6c7 overlay simulations ===');
console.log('220:', JSON.stringify(result.r6c7_220));
console.log('225:', JSON.stringify(result.r6c7_225));
console.log('228:', JSON.stringify(result.r6c7_228));
console.log('232:', JSON.stringify(result.r6c7_232));
console.log('235:', JSON.stringify(result.r6c7_235));

console.log('\n=== INTL lower apron overlay (y=407-686) ===');
console.log('228:', JSON.stringify(result.intlLower_228));
console.log('232:', JSON.stringify(result.intlLower_232));
console.log('235:', JSON.stringify(result.intlLower_235));

console.log('\n=== INTL mid apron overlay (y=407-760) ===');
console.log('228:', JSON.stringify(result.intlMid_228));
console.log('232:', JSON.stringify(result.intlMid_232));

console.log('\n=== INTL full apron overlay (y=269-686) ===');
console.log('228:', JSON.stringify(result.intlFull_228));
console.log('232:', JSON.stringify(result.intlFull_232));

console.log('\n=== DOM stroke removal (full canvas) ===');
console.log(JSON.stringify(result.strokeRem));
console.log('VAECO stroke:', JSON.stringify(result.vaecostroke));

console.log('\n=== Stroke-to-white sim (x=632-637) ===');
console.log('r3c6:', JSON.stringify(result.strokeWhite_r3c6));
console.log('r4c6:', JSON.stringify(result.strokeWhite_r4c6));
console.log('r5c6:', JSON.stringify(result.strokeWhite_r5c6));
console.log('full y=270-680:', JSON.stringify(result.strokeWhite_full));

console.log('\n=== INTL apron row progression (r3-r8, c7-c8) ===');
for (const [k,v] of Object.entries(result.intlRows)) console.log(`  ${k}: REF:${v.refAvg} OUR:${v.ourAvg} ${v.pct}% (${v.wrong})`);

await browser.close();
