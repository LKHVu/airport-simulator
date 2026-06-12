import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();

const ourData = 'data:image/png;base64,' + readFileSync('d:/right_output/our_map_svg.png').toString('base64');
const refData = 'data:image/jpeg;base64,' + readFileSync('d:/right_output/TSN.jpg').toString('base64');

// Scale both to 1309x875 (reference size) for comparison
const W = 1309, H = 875;

await page.setViewportSize({ width: W * 2 + 30, height: H + 60 });

await page.setContent(`
<html><body style="margin:0;background:#fff">
<canvas id="c"></canvas>
<script>
const W=${W}, H=${H};
const ourSrc = '${ourData}';
const refSrc = '${refData}';
const c = document.getElementById('c');
const ctx = c.getContext('2d');
c.width = W * 2 + 30;
c.height = H + 60;
ctx.fillStyle='#eee'; ctx.fillRect(0,0,c.width,c.height);

const img1 = new Image(), img2 = new Image();
img1.onload = () => {
  img2.onload = () => {
    // Draw reference (left)
    ctx.drawImage(img2, 0, 30, W, H);
    ctx.fillStyle='#000'; ctx.font='bold 14px Arial';
    ctx.fillText('REFERENCE', 5, 20);

    // Draw our map scaled (right)
    ctx.drawImage(img1, W+15, 30, W, H);
    ctx.fillText('OUR MAP (scaled to match)', W+20, 20);

    // Diff overlay
    const off1 = document.createElement('canvas');
    off1.width=W; off1.height=H;
    const ctx1=off1.getContext('2d');
    ctx1.drawImage(img2,0,0,W,H);
    const ref=ctx1.getImageData(0,0,W,H);

    const off2=document.createElement('canvas');
    off2.width=W; off2.height=H;
    const ctx2=off2.getContext('2d');
    ctx2.drawImage(img1,0,0,W,H);
    const our=ctx2.getImageData(0,0,W,H);

    let diffPx=0;
    for(let i=0;i<ref.data.length;i+=4){
      const dr=Math.abs(ref.data[i]-our.data[i]);
      const dg=Math.abs(ref.data[i+1]-our.data[i+1]);
      const db=Math.abs(ref.data[i+2]-our.data[i+2]);
      if((dr+dg+db)/3>20) diffPx++;
    }
    ctx.fillStyle='#f00';
    ctx.fillText(\`Diff pixels: \${diffPx} / \${W*H} (\${(diffPx*100/(W*H)).toFixed(1)}%)\`, W+20, H+50);
    document.title='diff:'+diffPx;
  };
  img2.src=refSrc;
};
img1.src=ourSrc;
<\/script>
</body></html>`);

await page.waitForFunction(() => document.title.startsWith('diff:'), { timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'd:/right_output/comparison.png' });
const title = await page.title();
const diffPx = parseInt(title.replace('diff:', ''));
const total = 1309 * 875;
await browser.close();
console.log(`Diff: ${diffPx} / ${total} (${(diffPx * 100 / total).toFixed(2)}%)`);
console.log('Comparison saved');
