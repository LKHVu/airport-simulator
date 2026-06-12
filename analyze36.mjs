// Test overlay color changes: #ebeae4 → #ebebeb, BG_APRON_DOM #edefe1 → #ebebeb
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

        // Simulate changing pixels from one specific color to another
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

        function sampleCell(x0, y0, x1, y1) {
          let wrong=0, cnt=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) wrong++;
              cnt++;
            }
          }
          return wrong;
        }

        // Test 1: Change VAECO overlay #ebeae4 (235,234,228) → #ebebeb (235,235,235)
        // Full canvas
        const vaeco_to_symm = simColorChange(0,0,W,H, 235,234,228, 235,235,235, 4);

        // Test 2: Change DOM apron #edefe1 (237,239,225) → #ebebeb (235,235,235)
        const dom_to_symm = simColorChange(0,0,W,H, 237,239,225, 235,235,235, 4);

        // Test 3: Change BG_VAECO #f4f2ed (244,242,237) → #ebebeb (235,235,235)
        const bgvaeco_to_symm = simColorChange(0,0,W,H, 244,242,237, 235,235,235, 4);

        // Test 4: Change DOM apron to slightly different colors
        const dom_sims = {};
        for (const [label, [tR,tG,tB]] of Object.entries({
          'sym235': [235,235,235], 'sym230': [230,230,230], 'sym225': [225,225,225],
          '235234228': [235,234,228], '237238225': [237,238,225],
        })) {
          dom_sims[label] = simColorChange(0,0,W,H, 237,239,225, tR,tG,tB, 4);
        }

        // Test 5: Change all #ebeae4 to various colors
        const vaeco_sims = {};
        for (const [label, [tR,tG,tB]] of Object.entries({
          'sym235': [235,235,235], 'sym234': [234,234,234], 'sym232': [232,232,232],
          'sym230': [230,230,230], '235234230': [235,234,230], '235234232': [235,234,232],
          '235234235': [235,234,235], // change B only
        })) {
          vaeco_sims[label] = simColorChange(0,0,W,H, 235,234,228, tR,tG,tB, 4);
        }

        // Test 6: Change BG_APRON_DOM to symmetric
        // BG_APRON_DOM = #edefe1 = (237,239,225). But current DOM apron might be shown as-is.
        // Let's scan what colors actually appear in DOM apron area
        function colorHist(x0,y0,x1,y1) {
          const hist = {};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const key=`${ourPx.data[i]},${ourPx.data[i+1]},${ourPx.data[i+2]}`;
              hist[key]=(hist[key]||0)+1;
            }
          }
          // Return top 10
          return Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,10);
        }

        // DOM apron: SVG x=0-582, y=265-360 → CMP x=0-635, y=270-366
        const domColors = colorHist(0, 270, 635, 366);
        // VAECO overlay zone: SVG x=831-1200, y=265-440 → CMP x=907-1309, y=270-448
        const vaecoColors = colorHist(907, 270, 1309, 370);

        // Grid scan with per-cell breakdown for key changes
        const gridVaeco = {};
        for (let r=0; r<9; r++) {
          for (let c=0; c<13; c++) {
            const v = simColorChange(c*101,r*98,(c+1)*101,(r+1)*98, 235,234,228, 235,235,235, 4);
            if (Math.abs(v.net) > 5) gridVaeco[`r${r}c${c}`] = v;
          }
        }

        const gridDom = {};
        for (let r=0; r<9; r++) {
          for (let c=0; c<13; c++) {
            const v = simColorChange(c*101,r*98,(c+1)*101,(r+1)*98, 237,239,225, 235,235,235, 4);
            if (Math.abs(v.net) > 5) gridDom[`r${r}c${c}`] = v;
          }
        }

        // Also test BG_OUTER pixels (235,235,235) that were just changed
        // These are now 235. Can we do better? Try changing them to other values.
        const bgOuter_sims = {};
        for (const [label, [tR,tG,tB]] of Object.entries({
          'sym230': [230,230,230], 'sym232': [232,232,232], 'sym228': [228,228,228],
        })) {
          bgOuter_sims[label] = simColorChange(0,0,W,H, 235,235,235, tR,tG,tB, 3);
        }

        // Total wrong
        const totalWrong = sampleCell(0,0,W,H);

        resolve({ vaeco_to_symm, dom_to_symm, bgvaeco_to_symm, dom_sims, vaeco_sims,
                  domColors, vaecoColors, gridVaeco, gridDom, bgOuter_sims, totalWrong });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`\nTotal wrong pixels: ${result.totalWrong}`);

console.log('\n=== Change #ebeae4 (235,234,228) → #ebebeb (235,235,235) [full canvas] ===');
console.log(JSON.stringify(result.vaeco_to_symm));

console.log('\n=== Change #edefe1 (237,239,225) → #ebebeb (235,235,235) [full canvas] ===');
console.log(JSON.stringify(result.dom_to_symm));

console.log('\n=== Change #f4f2ed (244,242,237) → #ebebeb (235,235,235) [full canvas] ===');
console.log(JSON.stringify(result.bgvaeco_to_symm));

console.log('\n=== VAECO overlay sims (from 235,234,228 to various) ===');
for (const [k,v] of Object.entries(result.vaeco_sims)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== DOM apron sims (from 237,239,225 to various) ===');
for (const [k,v] of Object.entries(result.dom_sims)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== BG_OUTER (235,235,235) → darker sims ===');
for (const [k,v] of Object.entries(result.bgOuter_sims)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== Grid breakdown: #ebeae4 → #ebebeb ===');
for (const [k,v] of Object.entries(result.gridVaeco).sort((a,b)=>b[1].net-a[1].net))
  console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== Grid breakdown: DOM apron #edefe1 → #ebebeb ===');
for (const [k,v] of Object.entries(result.gridDom).sort((a,b)=>b[1].net-a[1].net))
  console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== DOM apron top colors ===');
for (const [k,v] of result.domColors) console.log(`  (${k}): ${v}px`);

console.log('\n=== VAECO overlay top colors ===');
for (const [k,v] of result.vaecoColors) console.log(`  (${k}): ${v}px`);

await browser.close();
