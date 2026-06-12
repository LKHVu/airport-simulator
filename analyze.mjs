import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();

const refData = 'data:image/jpeg;base64,' + readFileSync('d:/right_output/TSN.jpg').toString('base64');
const ourData = 'data:image/png;base64,' + readFileSync('d:/right_output/our_map_svg.png').toString('base64');

const W = 1309, H = 875;
await page.setViewportSize({ width: W, height: H });

// Sample key regions to identify colors
const regions = [
  // [label, x, y, w, h] in comparison coords (1309x875)
  { label: 'top-left corner',        x: 10,  y: 10,  w: 50, h: 50 },
  { label: 'infield (between RWYs)', x: 200, y: 95,  w: 100, h: 40 },
  { label: 'DOM apron area',         x: 250, y: 350, w: 100, h: 60 },
  { label: 'terminal area',          x: 650, y: 400, w: 80,  h: 60 },
  { label: 'VAECO area',             x: 930, y: 380, w: 80,  h: 60 },
  { label: 'south area (below RWY)', x: 400, y: 600, w: 100, h: 80 },
  { label: 'far south',              x: 400, y: 800, w: 100, h: 50 },
  { label: 'east of VAECO',          x: 1100,y: 400, w: 100, h: 80 },
  { label: 'north of RWY07L',        x: 400, y: 30,  w: 100, h: 40 },
  { label: 'west edge',              x: 10,  y: 400, w: 60,  h: 80 },
];

await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);

const result = await page.evaluate(({ refData, ourData, regions, W, H }) => {
  return new Promise(resolve => {
    const refImg = new Image(), ourImg = new Image();
    refImg.onload = () => {
      ourImg.onload = () => {
        const c = document.getElementById('c');
        const ctx = c.getContext('2d');

        // Draw ref scaled
        ctx.drawImage(refImg, 0, 0, W, H);
        const refPx = ctx.getImageData(0, 0, W, H);

        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(ourImg, 0, 0, W, H);
        const ourPx = ctx.getImageData(0, 0, W, H);

        const results = [];
        for (const r of regions) {
          let refR=0,refG=0,refB=0, ourR=0,ourG=0,ourB=0, count=0;
          for (let y=r.y; y<r.y+r.h && y<H; y++) {
            for (let x=r.x; x<r.x+r.w && x<W; x++) {
              const i = (y*W+x)*4;
              refR+=refPx.data[i]; refG+=refPx.data[i+1]; refB+=refPx.data[i+2];
              ourR+=ourPx.data[i]; ourG+=ourPx.data[i+1]; ourB+=ourPx.data[i+2];
              count++;
            }
          }
          results.push({
            label: r.label,
            ref: [Math.round(refR/count), Math.round(refG/count), Math.round(refB/count)],
            our: [Math.round(ourR/count), Math.round(ourG/count), Math.round(ourB/count)],
          });
        }
        resolve(results);
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, regions, W, H });

console.log('Region color analysis (comparison space 1309x875):');
for (const r of result) {
  const refHex = '#' + r.ref.map(v => v.toString(16).padStart(2,'0')).join('');
  const ourHex = '#' + r.our.map(v => v.toString(16).padStart(2,'0')).join('');
  const diff = r.ref.reduce((s,v,i) => s + Math.abs(v - r.our[i]), 0) / 3;
  console.log(`  ${r.label.padEnd(30)} REF:${refHex} OUR:${ourHex} diff:${diff.toFixed(1)}`);
}

await browser.close();
