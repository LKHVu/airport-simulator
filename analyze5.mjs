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

        const regions = [
          // Infield between runways (SVG y=84-145 → cmp y=85-148)
          { label: 'infield x0   (cmp x=0-100,y=90-145)',   x:0,    y:90,  w:100, h:55 },
          { label: 'infield x100 (cmp x=100-200,y=90-145)', x:100,  y:90,  w:100, h:55 },
          { label: 'infield x200 (cmp x=200-300,y=90-145)', x:200,  y:90,  w:100, h:55 },
          { label: 'infield x300 (cmp x=300-400,y=90-145)', x:300,  y:90,  w:100, h:55 },
          { label: 'infield x400 (cmp x=400-500,y=90-145)', x:400,  y:90,  w:100, h:55 },
          { label: 'infield x500 (cmp x=500-600,y=90-145)', x:500,  y:90,  w:100, h:55 },
          { label: 'infield x600 (cmp x=600-700,y=90-145)', x:600,  y:90,  w:100, h:55 },
          { label: 'infield x700 (cmp x=700-800,y=90-145)', x:700,  y:90,  w:100, h:55 },
          { label: 'infield x800 (cmp x=800-900,y=90-145)', x:800,  y:90,  w:100, h:55 },
          { label: 'infield x900 (cmp x=900-1000,y=90-145)',x:900,  y:90,  w:100, h:55 },
          { label: 'infield x1000(cmp x=1000-1100,y=90-145)',x:1000, y:90,  w:100, h:55 },
          // East area detailed row 3-5 cols 9-12
          { label: 'r3c9  (cmp x=900-1000,y=291-388)',  x:900,  y:291, w:100, h:97 },
          { label: 'r3c10 (cmp x=1000-1100,y=291-388)', x:1000, y:291, w:100, h:97 },
          { label: 'r3c11 (cmp x=1100-1200,y=291-388)', x:1100, y:291, w:100, h:97 },
          { label: 'r3c12 (cmp x=1200-1309,y=291-388)', x:1200, y:291, w:109, h:97 },
          { label: 'r4c9  (cmp x=900-1000,y=388-485)',  x:900,  y:388, w:100, h:97 },
          { label: 'r4c10 (cmp x=1000-1100,y=388-485)', x:1000, y:388, w:100, h:97 },
          { label: 'r4c11 (cmp x=1100-1200,y=388-485)', x:1100, y:388, w:100, h:97 },
          { label: 'r4c12 (cmp x=1200-1309,y=388-485)', x:1200, y:388, w:109, h:97 },
          { label: 'r5c9  (cmp x=900-1000,y=485-582)',  x:900,  y:485, w:100, h:97 },
          { label: 'r5c10 (cmp x=1000-1100,y=485-582)', x:1000, y:485, w:100, h:97 },
          { label: 'r5c11 (cmp x=1100-1200,y=485-582)', x:1100, y:485, w:100, h:97 },
          { label: 'r5c12 (cmp x=1200-1309,y=485-582)', x:1200, y:485, w:109, h:97 },
          // Above and below far east (cols 10-12, row 2)
          { label: 'r2c10 (cmp x=1000-1100,y=194-291)', x:1000, y:194, w:100, h:97 },
          { label: 'r2c11 (cmp x=1100-1200,y=194-291)', x:1100, y:194, w:100, h:97 },
          { label: 'r2c12 (cmp x=1200-1309,y=194-291)', x:1200, y:194, w:109, h:97 },
        ];

        const results = regions.map(r => {
          let rR=0,rG=0,rB=0,oR=0,oG=0,oB=0,cnt=0,diffCnt=0;
          for (let y=r.y; y<Math.min(r.y+r.h,H); y++) {
            for (let x=r.x; x<Math.min(r.x+r.w,W); x++) {
              const i=(y*W+x)*4;
              rR+=refPx.data[i]; rG+=refPx.data[i+1]; rB+=refPx.data[i+2];
              oR+=ourPx.data[i]; oG+=ourPx.data[i+1]; oB+=ourPx.data[i+2];
              const d = (Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d > 20) diffCnt++;
              cnt++;
            }
          }
          const ref=[Math.round(rR/cnt),Math.round(rG/cnt),Math.round(rB/cnt)];
          const our=[Math.round(oR/cnt),Math.round(oG/cnt),Math.round(oB/cnt)];
          return { label: r.label, ref, our, diff: ref.reduce((s,v,i)=>s+Math.abs(v-our[i]),0)/3, pct: Math.round(diffCnt*100/cnt) };
        });
        resolve(results);
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

for (const r of result) {
  const rh = '#' + r.ref.map(v=>v.toString(16).padStart(2,'0')).join('');
  const oh = '#' + r.our.map(v=>v.toString(16).padStart(2,'0')).join('');
  console.log(`  ${r.label.padEnd(42)} REF:${rh} OUR:${oh} diff:${r.diff.toFixed(0)} wrong:${r.pct}%`);
}
await browser.close();
