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

        const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

        // Detailed scan at y=200 from x=700-1000, step=1
        const detailY200 = [];
        for (let x=700; x<=1000; x++) {
          const i=(200*W+x)*4;
          const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (diff > 20) detailY200.push({ x, ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
        }

        // Scan col at x=800 (SVG x≈733), y=180-220
        const col800 = [];
        for (let y=180; y<=220; y++) {
          const i=(y*W+800)*4;
          const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          col800.push({ y, ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
        }

        // Scan VAECO area labels zone: x=870-930, y=380-410
        const vaecoLabel = [];
        for (let y=380; y<=410; y+=2) {
          const i=(y*W+900)*4;
          const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          vaecoLabel.push({ y, svgY: Math.round(y/1.017), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]], diff: Math.round(diff) });
        }

        // Row y=200 scan from x=30-250 (dark zone at left)
        const leftDark = [];
        for (let x=30; x<=260; x+=5) {
          const i=(200*W+x)*4;
          const diff=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (diff>20) leftDark.push({ x, svgX: Math.round(x/1.091), ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]], our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]] });
        }

        resolve({ detailY200, col800, vaecoLabel, leftDark });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Wrong pixels at y=200, x=700-1000 (detail) ===');
for (const p of result.detailY200) {
  console.log(`  x=${p.x} svgX≈${Math.round(p.x/1.091)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);
}

console.log('\n=== Col x=800 (SVG x≈733), y=180-220 ===');
for (const p of result.col800) {
  if (p.diff > 5) console.log(`  y=${p.y} svgY≈${Math.round(p.y/1.017)}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);
}

console.log('\n=== VAECO label zone x=900, y=380-410 ===');
for (const p of result.vaecoLabel) {
  if (p.diff > 10) console.log(`  y=${p.y} svgY≈${p.svgY}: REF:${fmt(p.ref)} OUR:${fmt(p.our)} diff:${p.diff}`);
}

console.log('\n=== Left dark zone y=200, x=30-260 ===');
for (const p of result.leftDark) {
  console.log(`  x=${p.x} svgX≈${p.svgX}: REF:${fmt(p.ref)} OUR:${fmt(p.our)}`);
}

await browser.close();
