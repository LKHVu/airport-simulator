// Analyze remaining top wrong cells in detail.
// Look for: (1) where wrong pixels concentrate by x/y within each cell
//            (2) what OUR/REF values look like
//            (3) simulate adding a grey infield rect
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

        // Scan rows/cols within a cell to find where wrong pixels concentrate
        function cellScan(x0, y0, x1, y1, step=2) {
          const rows={}, cols={};
          for (let y=y0; y<Math.min(y1,H); y+=step) {
            let rWrong=0, rCnt=0;
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) rWrong++;
              rCnt++;
            }
            if (rWrong>5) rows[y]={svgY:Math.round(y/1.017), wrong:rWrong, pct:Math.round(rWrong*100/rCnt)};
          }
          for (let x=x0; x<Math.min(x1,W); x+=step) {
            let cWrong=0, cCnt=0;
            for (let y=y0; y<Math.min(y1,H); y++) {
              const i=(y*W+x)*4;
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) cWrong++;
              cCnt++;
            }
            if (cWrong>5) cols[x]={svgX:Math.round(x/1.091), wrong:cWrong, pct:Math.round(cWrong*100/cCnt)};
          }
          return {rows,cols};
        }

        // Simulate painting a grey rect over a zone — for each pixel in zone that's currently OUR≈white (>230),
        // replace with new color and count fixes/breaks
        function simGrey(x0, y0, x1, y1, newR, newG, newB) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (oR < 230 && oG < 230 && oB < 230) continue; // skip non-white pixels (they have content on top)
              const dBefore=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dAfter=(Math.abs(rR-newR)+Math.abs(rG-newG)+Math.abs(rB-newB))/3;
              if (dBefore>20 && dAfter<=20) fixes++;
              else if (dBefore<=20 && dAfter>20) breaks++;
            }
          }
          return {fixes, breaks, net:fixes-breaks};
        }

        // Full grid
        const grid = {};
        for (let r=0; r<9; r++) for (let c=0; c<13; c++) grid[`r${r}c${c}`] = sampleCell(c*101,r*98,(c+1)*101,(r+1)*98);

        // Detailed scan of top cells
        const scan_r2c0 = cellScan(0, 196, 101, 294);
        const scan_r2c9 = cellScan(909, 196, 1010, 294);
        const scan_r4c4 = cellScan(404, 392, 505, 490);
        const scan_r3c0 = cellScan(0, 294, 101, 392);

        // Simulate grey infield between south runway and apron
        // SVG y=163-265 → CMP y=166-270; x=0-1200 → CMP x=0-1309
        // But avoid the runway itself (SVG y=145-168 → CMP y=147-171)
        // So infield grey: CMP x=0-1309, y=171-270
        const greyInfield_220 = simGrey(0, 171, 1309, 270, 220, 220, 215); // #dcdcd7
        const greyInfield_215 = simGrey(0, 171, 1309, 270, 215, 215, 210); // #d7d7d2
        const greyInfield_225 = simGrey(0, 171, 1309, 270, 225, 225, 220); // #e1e1dc
        const greyInfield_230 = simGrey(0, 171, 1309, 270, 230, 229, 224); // #e6e5e0

        // Also try grey for north-of-apron infield: CMP y=171-294 (wider)
        const greyFull_225 = simGrey(0, 171, 1309, 294, 225, 225, 220);

        // Simulate grey for the western infield area between runways (CMP x=0-200, y=80-170)
        const greyWest_220 = simGrey(0, 80, 200, 170, 220, 220, 215);

        // Row scans at key y values to see what's there
        function rowScan(y, x0, x1, step=3) {
          const pts=[];
          for(let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if(d>20) pts.push({x,svgX:Math.round(x/1.091),ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]],our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]],diff:Math.round(d)});
          }
          return pts;
        }
        const row200 = rowScan(200, 0, W);
        const row245 = rowScan(245, 0, W);
        const row275 = rowScan(275, 0, W);
        const row330 = rowScan(330, 0, W);
        const row400 = rowScan(400, 0, W);
        const row440 = rowScan(440, 0, W);

        resolve({ grid, scan_r2c0, scan_r2c9, scan_r4c4, scan_r3c0,
                  greyInfield_220, greyInfield_215, greyInfield_225, greyInfield_230, greyFull_225, greyWest_220,
                  row200, row245, row275, row330, row400, row440 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v => v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Full grid top 25 wrong ===');
const sorted = Object.entries(result.grid).sort((a,b)=>b[1].wrong-a[1].wrong);
for (const [k,v] of sorted.slice(0,25)) {
  console.log(`  ${k}: REF:${v.refAvg} OUR:${v.ourAvg} ${v.pct}% (${v.wrong})`);
}
console.log(`  TOTAL wrong: ${Object.values(result.grid).reduce((s,v)=>s+v.wrong,0)}`);

console.log('\n=== Grey infield simulations (CMP y=171-270, all x) ===');
console.log(`  #dcdcd7 (220): ${JSON.stringify(result.greyInfield_220)}`);
console.log(`  #d7d7d2 (215): ${JSON.stringify(result.greyInfield_215)}`);
console.log(`  #e1e1dc (225): ${JSON.stringify(result.greyInfield_225)}`);
console.log(`  #e6e5e0 (230): ${JSON.stringify(result.greyInfield_230)}`);
console.log(`  Full y=171-294 #e1e1dc (225): ${JSON.stringify(result.greyFull_225)}`);
console.log(`  West (x=0-200, y=80-170) #dcdcd7 (220): ${JSON.stringify(result.greyWest_220)}`);

console.log('\n=== r2c0 scan (rows/cols with >5 wrong) ===');
const r2c0_rows = Object.entries(result.scan_r2c0.rows).sort((a,b)=>b[1].wrong-a[1].wrong).slice(0,8);
console.log('  Top rows:', r2c0_rows.map(([y,v])=>`y=${y}(svg${v.svgY}):${v.wrong}px`).join(' '));
const r2c0_cols = Object.entries(result.scan_r2c0.cols).sort((a,b)=>b[1].wrong-a[1].wrong).slice(0,8);
console.log('  Top cols:', r2c0_cols.map(([x,v])=>`x=${x}(svg${v.svgX}):${v.wrong}px`).join(' '));

console.log('\n=== r2c9 scan ===');
const r2c9_rows = Object.entries(result.scan_r2c9.rows).sort((a,b)=>b[1].wrong-a[1].wrong).slice(0,8);
console.log('  Top rows:', r2c9_rows.map(([y,v])=>`y=${y}(svg${v.svgY}):${v.wrong}px`).join(' '));

console.log('\n=== r4c4 scan ===');
const r4c4_rows = Object.entries(result.scan_r4c4.rows).sort((a,b)=>b[1].wrong-a[1].wrong).slice(0,8);
console.log('  Top rows:', r4c4_rows.map(([y,v])=>`y=${y}(svg${v.svgY}):${v.wrong}px`).join(' '));

console.log('\n=== r3c0 scan ===');
const r3c0_rows = Object.entries(result.scan_r3c0.rows).sort((a,b)=>b[1].wrong-a[1].wrong).slice(0,8);
console.log('  Top rows:', r3c0_rows.map(([y,v])=>`y=${y}(svg${v.svgY}):${v.wrong}px`).join(' '));

console.log('\n=== Row y=200 wrong ===');
for(const p of result.row200.slice(0,20)) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=245 wrong ===');
for(const p of result.row245.slice(0,20)) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=275 wrong ===');
for(const p of result.row275.slice(0,20)) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=330 wrong ===');
for(const p of result.row330.slice(0,20)) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=400 wrong ===');
for(const p of result.row400.slice(0,15)) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=440 wrong ===');
for(const p of result.row440.slice(0,15)) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

await browser.close();
