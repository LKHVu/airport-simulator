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
          return {
            ref: [Math.round(rR/cnt),Math.round(rG/cnt),Math.round(rB/cnt)],
            our: [Math.round(oR/cnt),Math.round(oG/cnt),Math.round(oB/cnt)],
            pct: Math.round(wrong*100/cnt), total: cnt, wrong,
          };
        }

        // Scan the whole image in a coarse grid (13 cols × 9 rows)
        // CW=101, CH=98 per cell
        const CW=101, CH=98;
        const grid = [];
        for (let r=0; r<9; r++) {
          const row = [];
          for (let c=0; c<13; c++) {
            row.push(sampleCell(c*CW, r*CH, (c+1)*CW, (r+1)*CH));
          }
          grid.push(row);
        }

        // Detailed scan of row 1 (cmp y=98-196, SVG y≈96-193): infield zone
        // Focus on cols 1-4 (x=101-505)
        const infield = {};
        for (let c=1; c<=4; c++) {
          infield[`c${c}`] = sampleCell(c*CW, 98, (c+1)*CW, 196);
        }

        // Detailed scan of row 4 south (y=392-490, SVG y≈386-482)
        // Focus on cols 3-7
        const row4 = {};
        for (let c=3; c<=7; c++) {
          row4[`c${c}`] = sampleCell(c*CW, 392, (c+1)*CW, 490);
        }

        // Col scans at infield x positions to see ref vs our
        function colScan(x, y0, y1, step=5) {
          const pts = [];
          for (let y=y0; y<=y1; y+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            pts.push({y, ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff});
          }
          return pts;
        }

        // Sample infield at x=300 (SVG x≈275) and x=400 (SVG x≈367) from y=60-250
        const col300 = colScan(300, 60, 250, 5);
        const col400 = colScan(400, 60, 250, 5);

        // Sample south area at x=450 (SVG x≈412), y=350-510
        const col450south = colScan(450, 350, 510, 5);

        // Row scan at y=430 (SVG y≈423) to see south apron area
        const row430 = [];
        for (let x=0; x<W; x+=15) {
          const y=430;
          const i=(y*W+x)*4;
          const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (diff>20) row430.push({x, ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]]});
        }

        resolve({ grid, infield, row4, col300, col400, col450south, row430 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Grid overview (wrong%) ===');
console.log('       c0   c1   c2   c3   c4   c5   c6   c7   c8   c9  c10  c11  c12');
for (let r=0; r<result.grid.length; r++) {
  const row = result.grid[r];
  const cells = row.map(c => String(c.pct+'%').padStart(4)).join(' ');
  console.log(`r${r} (y${r*98}-${(r+1)*98}): ${cells}`);
}

console.log('\n=== Infield zone (row1, y=98-196) ===');
for (const [k, v] of Object.entries(result.infield)) {
  console.log(`  ${k}: REF:${fmt(v.ref)} OUR:${fmt(v.our)} wrong:${v.pct}%`);
}

console.log('\n=== Row 4 south (y=392-490) ===');
for (const [k, v] of Object.entries(result.row4)) {
  console.log(`  ${k}: REF:${fmt(v.ref)} OUR:${fmt(v.our)} wrong:${v.pct}%`);
}

console.log('\nCol x=300 (SVG x≈275) y=60-250 (wrong only):');
for (const p of result.col300) {
  if (p.diff>20) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);
}

console.log('\nCol x=400 (SVG x≈367) y=60-250 (wrong only):');
for (const p of result.col400) {
  if (p.diff>20) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);
}

console.log('\nCol x=450 (SVG x≈412) y=350-510 (wrong only):');
for (const p of result.col450south) {
  if (p.diff>20) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);
}

console.log('\nRow y=430 (SVG y≈423) wrong pixels:');
for (const p of result.row430) {
  console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);
}

await browser.close();
