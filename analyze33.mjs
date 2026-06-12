// Comprehensive grid sweep: test each cell at 4 overlay colors, report net > 20.
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

        function simCell(x0, y0, x1, y1, newR, newG, newB, ourThresh=230) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (oR<ourThresh || oG<ourThresh || oB<ourThresh) continue;
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-newR)+Math.abs(rG-newG)+Math.abs(rB-newB))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return fixes-breaks;
        }

        function sampleCell(x0, y0, x1, y1) {
          let rSum=[0,0,0], oSum=[0,0,0], wrong=0, cnt=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              rSum[0]+=refPx.data[i]; rSum[1]+=refPx.data[i+1]; rSum[2]+=refPx.data[i+2];
              oSum[0]+=ourPx.data[i]; oSum[1]+=ourPx.data[i+1]; oSum[2]+=ourPx.data[i+2];
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) wrong++;
              cnt++;
            }
          }
          const f=(rgb,n)=>'#'+rgb.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join('');
          return { refAvg:f(rSum,cnt), ourAvg:f(oSum,cnt), wrong, refAvgR:Math.round(rSum[0]/cnt) };
        }

        // Test colors: 220, 225, 230, 235 (the useful range)
        const COLORS = [[220,220,213],[225,224,218],[230,229,223],[235,234,228]];
        const LABELS = ['220','225','230','235'];

        const results = [];
        for (let r=0; r<9; r++) {
          for (let c=0; c<13; c++) {
            const x0=c*101, y0=r*98, x1=(c+1)*101, y1=(r+1)*98;
            const cell = sampleCell(x0, y0, x1, y1);
            const bestNet = Math.max(...COLORS.map(([R,G,B]) => simCell(x0,y0,x1,y1,R,G,B)));
            const bestLabel = LABELS[COLORS.findIndex(([R,G,B]) => simCell(x0,y0,x1,y1,R,G,B)===bestNet)];
            if (bestNet > 20) results.push({r,c,bestNet,bestLabel,wrong:cell.wrong,refAvg:cell.refAvg,ourAvg:cell.ourAvg});
          }
        }

        // Sort by bestNet descending
        results.sort((a,b)=>b.bestNet-a.bestNet);

        resolve({results});
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log('\n=== Cells with positive overlay sim (net > 20) ===');
for (const r of result.results) {
  console.log(`  r${r.r}c${r.c}: bestColor=${r.bestLabel} NET=+${r.bestNet} wrong=${r.wrong} REF:${r.refAvg} OUR:${r.ourAvg}`);
}
console.log(`\n  Total positive candidates: ${result.results.length}`);

await browser.close();
