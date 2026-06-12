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

        // Average regions
        const regions = [
          { label: 'DOM apron (x:150,y:270,80x80)',     x:150, y:270, w:80, h:80 },
          { label: 'DOM apron (x:300,y:270,80x60)',     x:300, y:270, w:80, h:60 },
          { label: 'INTL apron (x:700,y:280,80x80)',    x:700, y:280, w:80, h:80 },
          { label: 'INTL apron (x:750,y:350,60x80)',    x:750, y:350, w:60, h:80 },
          { label: 'VAECO (x:920,y:280,80x80)',         x:920, y:280, w:80, h:80 },
          { label: 'VAECO (x:1000,y:350,80x80)',        x:1000,y:350, w:80, h:80 },
          { label: 'ROW4 col4 (x:420,y:420,80x80)',    x:420, y:420, w:80, h:80 },
          { label: 'ROW4 col5 (x:540,y:420,60x60)',    x:540, y:420, w:60, h:60 },
          { label: 'ROW4 col6 (x:630,y:420,60x60)',    x:630, y:420, w:60, h:60 },
          { label: 'ROW5 col10 (x:1050,y:510,80x60)', x:1050,y:510, w:80, h:60 },
          { label: 'ROW5 col9 (x:950,y:510,80x60)',   x:950, y:510, w:80, h:60 },
          { label: 'ROW3 col4 (x:440,y:320,60x60)',   x:440, y:320, w:60, h:60 },
          { label: 'ROW3 col5 (x:550,y:320,60x60)',   x:550, y:320, w:60, h:60 },
          { label: 'ROW2 west (x:100,y:230,80x60)',   x:100, y:230, w:80, h:60 },
          { label: 'ROW2 center (x:500,y:230,80x60)', x:500, y:230, w:80, h:60 },
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
  console.log(`  ${r.label.padEnd(38)} REF:${rh} OUR:${oh} diff:${r.diff.toFixed(0)} wrong:${r.pct}%`);
}
await browser.close();
