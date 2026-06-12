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

        // Sample taxiway spine and surrounding areas
        // SVG to comparison: x*1.091, y*1.017
        const pts = [
          // On known taxiway edges
          { label: 'W4 taxiway (left edge)',    x: 22,  y: 224 },  // W4: svg(20,220) → cmp(22,224)
          { label: 'W11 node area',             x: 398, y: 189 },  // W11: svg(365,186)
          { label: 'M1_E spine',                x: 639, y: 224 },  // M1_E: svg(585,220)
          { label: 'E8 node area',              x: 907, y: 224 },  // E8: svg(831,220)
          // Above/below these taxiways (background check)
          { label: 'between taxiways (y=200)',  x: 400, y: 204 },  // svg(367,200)
          { label: 'below rwy07R clear',        x: 200, y: 200 },  // svg(183,197)
          { label: 'below rwy07R center',       x: 600, y: 200 },  // svg(550,197)
          // Reference-specific checks
          { label: 'ref row2 col0',             x:  50, y: 242 },
          { label: 'ref row2 col4',             x: 450, y: 242 },
          { label: 'ref row2 col8',             x: 850, y: 242 },
          { label: 'ref row2 col12',            x:1250, y: 242 },
          // East far zone
          { label: 'far-east x=1150 y=200',    x:1150, y: 200 },
          { label: 'far-east x=1150 y=350',    x:1150, y: 350 },
          { label: 'far-east x=1200 y=400',    x:1200, y: 400 },
          // Row 3 center (85% diff area)
          { label: 'row3 col6 (x=650,y=340)',  x: 650, y: 340 },
          { label: 'row3 col7 (x=750,y=340)',  x: 750, y: 340 },
          { label: 'row3 col4 (x=450,y=340)',  x: 450, y: 340 },
        ];

        const results = pts.map(p => {
          const sample = (px) => {
            const i = (Math.min(p.y, H-1) * W + Math.min(p.x, W-1)) * 4;
            return [px.data[i], px.data[i+1], px.data[i+2]];
          };
          const ref = sample(refPx), our = sample(ourPx);
          const diff = ref.reduce((s,v,i) => s + Math.abs(v - our[i]), 0) / 3;
          return { ...p, ref, our, diff };
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
  console.log(`  ${r.label.padEnd(32)} REF:${rh} OUR:${oh} diff:${r.diff.toFixed(0)}`);
}
await browser.close();
