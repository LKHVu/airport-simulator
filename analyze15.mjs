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
            refAvg: [Math.round(rR/cnt),Math.round(rG/cnt),Math.round(rB/cnt)],
            ourAvg: [Math.round(oR/cnt),Math.round(oG/cnt),Math.round(oB/cnt)],
            pct: Math.round(wrong*100/cnt), total: cnt, wrong,
          };
        }

        // Row 2 zone: scan ref averages at multiple y slices
        const r2y196_216 = {}; // top slice: y=196-216 (between lower runway and infield)
        const r2y216_236 = {}; // mid slice
        const r2y236_260 = {}; // bottom slice (grey transition)
        const r2y260_294 = {}; // lower slice
        for (let c=0; c<13; c++) {
          const cx0=c*101, cx1=(c+1)*101;
          r2y196_216[c] = sampleCell(cx0, 196, cx1, 216);
          r2y216_236[c] = sampleCell(cx0, 216, cx1, 236);
          r2y236_260[c] = sampleCell(cx0, 236, cx1, 260);
          r2y260_294[c] = sampleCell(cx0, 260, cx1, 294);
        }

        // VAECO sub-zones: scan reference averages
        const vaeco = {};
        for (let ySlice = 265; ySlice < 450; ySlice += 30) {
          vaeco[`y${ySlice}`] = sampleCell(831, ySlice, 1200, Math.min(ySlice+30, 875));
        }

        // INTL terminal sub-zones
        const intlTerm = {};
        for (let ySlice = 294; ySlice < 490; ySlice += 30) {
          intlTerm[`y${ySlice}`] = sampleCell(606, ySlice, 710, Math.min(ySlice+30, 875));
        }

        // Row at y=350 (below intl terminal, SVG y≈344)
        function rowScan(y, x0, x1, step=10) {
          const pts = [];
          for (let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if (diff>20) pts.push({x, ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]]});
          }
          return pts;
        }

        // Scan the far east zone at y=393 (row 400 wrong area beyond VAECO)
        const rowFarEast = rowScan(400, 1150, 1309, 5);
        // Scan col at x=610, y=360-430 (mystery white pixel at x=559)
        function colScan(x, y0, y1, step=2) {
          const pts = [];
          for (let y=y0; y<=y1; y+=step) {
            const i=(y*W+x)*4;
            const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            pts.push({y, ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff});
          }
          return pts;
        }
        const colX610 = colScan(610, 360, 430);
        // Row y=186 to check infield
        const rowY186 = rowScan(189, 200, 900, 5);

        resolve({ r2y196_216, r2y216_236, r2y236_260, r2y260_294, vaeco, intlTerm, rowFarEast, colX610, rowY186 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Row 2 sub-slices: REF avg / OUR avg / wrong% ===');
for (const [label, data] of [
  ['y=196-216', result.r2y196_216],
  ['y=216-236', result.r2y216_236],
  ['y=236-260', result.r2y236_260],
  ['y=260-294', result.r2y260_294],
]) {
  console.log(`\n  ${label}:`);
  for (let c=0; c<13; c++) {
    const d = data[c];
    console.log(`    c${c}: REF:${fmt(d.refAvg)} OUR:${fmt(d.ourAvg)} ${d.pct}%`);
  }
}

console.log('\n=== VAECO zone (x=831-1200) REF vs OUR averages by y-slice ===');
for (const [k, v] of Object.entries(result.vaeco)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}%`);
}

console.log('\n=== INTL terminal zone (x=606-710) REF vs OUR averages by y-slice ===');
for (const [k, v] of Object.entries(result.intlTerm)) {
  console.log(`  ${k}: REF:${fmt(v.refAvg)} OUR:${fmt(v.ourAvg)} ${v.pct}%`);
}

console.log('\n=== Far east row y=400 (x=1150-1309) wrong pixels ===');
for (const p of result.rowFarEast) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

console.log('\n=== Col x=610 (SVG x≈559) y=360-430 ===');
for (const p of result.colX610) {
  if (p.diff > 5) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff.toFixed(0)}`);
}

console.log('\n=== Row y=189 (SVG y≈186, infield W-lateral level) wrong x=200-900 ===');
for (const p of result.rowY186) console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);

await browser.close();
