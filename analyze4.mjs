import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
const refData = 'data:image/jpeg;base64,' + readFileSync('d:/right_output/TSN.jpg').toString('base64');
const W = 1309, H = 875;
await page.setViewportSize({ width: W, height: H });
await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);

const result = await page.evaluate(({ refData, W, H }) => {
  return new Promise(resolve => {
    const refImg = new Image();
    refImg.onload = () => {
      const c = document.getElementById('c');
      const ctx = c.getContext('2d');
      ctx.drawImage(refImg, 0, 0, W, H);
      const refPx = ctx.getImageData(0, 0, W, H);

      // Sample at x=300 (left DOM apron) at various y values
      const results = [];
      for (let y = 170; y <= 600; y += 20) {
        let r=0,g=0,b=0, cnt=0;
        for (let x = 280; x <= 350; x++) {
          const i = (y * W + x) * 4;
          r += refPx.data[i]; g += refPx.data[i+1]; b += refPx.data[i+2];
          cnt++;
        }
        const hex = '#' + [r,g,b].map(v=>Math.round(v/cnt).toString(16).padStart(2,'0')).join('');
        results.push({ y, hex, rgb: [Math.round(r/cnt), Math.round(g/cnt), Math.round(b/cnt)] });
      }
      resolve(results);
    };
    refImg.src = refData;
  });
}, { refData, W, H });

console.log('REF color gradient at x≈300 (DOM apron area):');
for (const r of result) {
  const svgY = Math.round(r.y / 1.017);
  console.log(`  comparison y=${r.y} (SVG y≈${svgY}): ${r.hex} rgb(${r.rgb.join(',')})`);
}

await browser.close();
