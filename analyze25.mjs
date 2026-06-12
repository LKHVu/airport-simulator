// Simulate changing only VAECO polygon pixels from BG_VAECO to a darker color.
// VAECO polygon in SVG: x=831-1200, y=265-440 → CMP: x≈906-1309, y≈269-447
// Also simulate the INTL apron TOP section (x=582-831, y=265-400 → CMP: x≈635-907, y≈269-406)
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

        // BG_VAECO = #f4f2ed = (244,242,237)
        const VAECO_R=244, VAECO_G=242, VAECO_B=237;
        const THRESH = 15; // tolerance for "is this pixel the apron color?"

        function isApronPixel(i) {
          const r=ourPx.data[i], g=ourPx.data[i+1], b=ourPx.data[i+2];
          return Math.abs(r-VAECO_R)<THRESH && Math.abs(g-VAECO_G)<THRESH && Math.abs(b-VAECO_B)<THRESH;
        }

        // Simulate changing apron pixels in a region to a new color, count fixes vs breaks
        function simulate(x0, y0, x1, y1, newR, newG, newB) {
          let fixes=0, breaks=0, neutral=0;
          let refSum=[0,0,0], ourSum=[0,0,0], newSum=[0,0,0], cnt=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const diffBefore=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const wasBad = diffBefore > 20;

              if (isApronPixel(i)) {
                const diffAfter=(Math.abs(rR-newR)+Math.abs(rG-newG)+Math.abs(rB-newB))/3;
                const willBad = diffAfter > 20;
                if (wasBad && !willBad) fixes++;
                else if (!wasBad && willBad) breaks++;
                else neutral++;
              }
              refSum[0]+=rR; refSum[1]+=rG; refSum[2]+=rB;
              ourSum[0]+=oR; ourSum[1]+=oG; ourSum[2]+=oB;
              newSum[0]+=(isApronPixel(i)?newR:oR);
              newSum[1]+=(isApronPixel(i)?newG:oG);
              newSum[2]+=(isApronPixel(i)?newB:oB);
              cnt++;
            }
          }
          const fmt = ([r,g,b]) => '#'+[r,g,b].map(v=>Math.round(v/cnt).toString(16).padStart(2,'0')).join('');
          return { fixes, breaks, neutral, net: fixes-breaks, refAvg:fmt(refSum), ourAvg:fmt(ourSum), newAvg:fmt(newSum), cnt };
        }

        // VAECO polygon: CMP x=906-1309, y=269-447
        const v216 = simulate(906, 269, 1309, 447, 216, 216, 208); // #d8d8d0
        const v220 = simulate(906, 269, 1309, 447, 220, 220, 212); // #dcdcd4
        const v225 = simulate(906, 269, 1309, 447, 225, 224, 218); // #e1e0da
        const v230 = simulate(906, 269, 1309, 447, 230, 229, 223); // #e6e5df
        const v235 = simulate(906, 269, 1309, 447, 235, 234, 228); // #ebeae4

        // INTL apron top zone: CMP x=635-906, y=269-407
        const intl216 = simulate(635, 269, 906, 407, 216, 216, 208);
        const intl225 = simulate(635, 269, 906, 407, 225, 224, 218);
        const intl230 = simulate(635, 269, 906, 407, 230, 229, 223);
        const intl235 = simulate(635, 269, 906, 407, 235, 234, 228);

        // Also check lower INTL area (r5-r8) for reference
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
          const f = (rgb,n) => '#'+[rgb[0],rgb[1],rgb[2]].map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join('');
          return { refAvg:f([rR,rG,rB],cnt), ourAvg:f([oR,oG,oB],cnt), pct:Math.round(wrong*100/cnt), wrong, cnt };
        }

        const grid = {};
        // r3-r6, c6-c12 focus
        for (let r=3; r<=6; r++) for (let c=6; c<=12; c++) grid[`r${r}c${c}`] = sampleCell(c*101, r*98, (c+1)*101, (r+1)*98);
        // Full grid for context
        for (let r=0; r<9; r++) for (let c=0; c<13; c++) {
          if (!grid[`r${r}c${c}`]) grid[`r${r}c${c}`] = sampleCell(c*101, r*98, (c+1)*101, (r+1)*98);
        }

        resolve({ v216, v220, v225, v230, v235, intl216, intl225, intl230, intl235, grid });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== VAECO polygon simulation (CMP x=906-1309, y=269-447) ===');
for (const [label, r] of [['#d8d8d0 (216)',result.v216],['#dcdcd4 (220)',result.v220],['#e1e0da (225)',result.v225],['#e6e5df (230)',result.v230],['#ebeae4 (235)',result.v235]]) {
  console.log(`  ${label}: fixes=${r.fixes} breaks=${r.breaks} NET=${r.net} | refAvg=${r.refAvg} ourAvg=${r.ourAvg}`);
}

console.log('\n=== INTL apron TOP simulation (CMP x=635-906, y=269-407) ===');
for (const [label, r] of [['#d8d8d0 (216)',result.intl216],['#e1e0da (225)',result.intl225],['#e6e5df (230)',result.intl230],['#ebeae4 (235)',result.intl235]]) {
  console.log(`  ${label}: fixes=${r.fixes} breaks=${r.breaks} NET=${r.net} | refAvg=${r.refAvg} ourAvg=${r.ourAvg}`);
}

console.log('\n=== Grid top 20 wrong cells ===');
const sorted = Object.entries(result.grid).sort((a,b)=>b[1].wrong-a[1].wrong);
for (const [k,v] of sorted.slice(0,20)) {
  console.log(`  ${k}: REF:${v.refAvg} OUR:${v.ourAvg} ${v.pct}% (${v.wrong}/${v.cnt})`);
}

await browser.close();
