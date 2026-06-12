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
          return { refAvg:[Math.round(rR/cnt),Math.round(rG/cnt),Math.round(rB/cnt)], ourAvg:[Math.round(oR/cnt),Math.round(oG/cnt),Math.round(oB/cnt)], pct:Math.round(wrong*100/cnt), wrong, cnt };
        }

        const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

        // R2 horizontal sub-slices at every 10px
        const r2slices = {};
        for (let y = 196; y < 294; y += 10) {
          r2slices[y] = sampleCell(0, y, W, Math.min(y+10, 294));
        }

        // R2 per-column per-sub-row (c0-c12, y=196-216, y=216-246, y=246-294)
        const r2zones = {};
        for (let c=0; c<13; c++) {
          r2zones[`c${c}`] = {
            top: sampleCell(c*101, 196, (c+1)*101, 216),
            mid: sampleCell(c*101, 216, (c+1)*101, 246),
            bot: sampleCell(c*101, 246, (c+1)*101, 294),
          };
        }

        // Row scans at key y values in r2 (step=5)
        function rowScan(y, x0, x1, step=5) {
          const pts = [];
          for (let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 20) pts.push({ x, svgX: Math.round(x/1.091), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
          }
          return pts;
        }

        // Scan y=200 (SVG y≈197), y=220 (SVG y≈216), y=260 (SVG y≈256)
        const row200 = rowScan(200, 0, W);
        const row220 = rowScan(220, 0, W);
        const row260 = rowScan(260, 0, W);
        const row280 = rowScan(280, 0, W);

        // r3c0 detail: SVG x=0-93, y=289-385
        const r3c0detail = {};
        for (let y = 294; y < 392; y += 15) {
          r3c0detail[y] = sampleCell(0, y, 101, Math.min(y+15, 392));
        }

        // r6c7/r7c7 (INTL south): cmp x=707-808, y=588-784
        const intlSouth = {};
        for (let y = 588; y < 784; y += 20) {
          intlSouth[y] = sampleCell(707, y, 808, Math.min(y+20, 784));
        }

        // Scan col at x=757 (SVG x≈694), y=550-780 — in r6c7/r7c7
        function colScan(x, y0, y1, step=5) {
          const pts = [];
          for (let y=y0; y<=y1; y+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff > 15) pts.push({ y, svgY: Math.round(y/1.017), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
          }
          return pts;
        }
        const colX757 = colScan(757, 550, 780);

        // r4c9-c12 / r5c9: VAECO zone detail
        const vaeco2 = {};
        for (let c=9; c<=12; c++) {
          for (let r=3; r<=5; r++) {
            vaeco2[`r${r}c${c}`] = sampleCell(c*101, r*98, (c+1)*101, (r+1)*98);
          }
        }

        resolve({ r2slices, r2zones, row200, row220, row260, row280, r3c0detail, intlSouth, colX757, vaeco2 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== R2 y-slices (REF avg / OUR avg / wrong%) ===');
for (const [y, v] of Object.entries(result.r2slices)) {
  console.log(`  y=${y}-${+y+10}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}% (${v.wrong}/${v.cnt})`);
}

console.log('\n=== R2 per-column zones ===');
for (const [col, zones] of Object.entries(result.r2zones)) {
  const t = zones.top, m = zones.mid, b = zones.bot;
  console.log(`  ${col}: top(196-216) REF:${fmt(t.refAvg)} OUR:${fmt(t.ourAvg)} ${t.pct}%  mid(216-246) REF:${fmt(m.refAvg)} OUR:${fmt(m.ourAvg)} ${m.pct}%  bot(246-294) REF:${fmt(b.refAvg)} OUR:${fmt(b.ourAvg)} ${b.pct}%`);
}

console.log('\n=== Row y=200 (SVG y≈197) wrong pixels ===');
for (const p of result.row200) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=220 (SVG y≈216) wrong pixels ===');
for (const p of result.row220) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=260 (SVG y≈256) wrong pixels ===');
for (const p of result.row260) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== Row y=280 (SVG y≈275) wrong pixels ===');
for (const p of result.row280) console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== r3c0 detail (SVG x=0-93, y=289-385) ===');
for (const [y, v] of Object.entries(result.r3c0detail)) {
  console.log(`  y=${y}-${+y+15}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}%`);
}

console.log('\n=== INTL south r6-r7 c7 (cmp x=707-808, y=588-784) ===');
for (const [y, v] of Object.entries(result.intlSouth)) {
  console.log(`  y=${y}-${+y+20}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}%`);
}

console.log('\n=== Col x=757 (SVG x≈694) y=550-780 wrong (diff>15) ===');
for (const p of result.colX757) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);

console.log('\n=== VAECO zone detail (r3-r5, c9-c12) ===');
for (const [k, v] of Object.entries(result.vaeco2)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}%`);
}

await browser.close();
