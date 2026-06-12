// Analysis after expanded row patches. Find top remaining bg-wrong and nstd-wrong cells.
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

        const bgCells = {}, nstdCells = {};
        let totalWrong=0, totalBg=0, totalNstd=0;
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
          const rR=refPx.data[i],rG=refPx.data[i+1],rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if(d>20){
            totalWrong++;
            const isBg=Math.abs(oR-235)<=15&&Math.abs(oG-235)<=15&&Math.abs(oB-235)<=15;
            const r=Math.floor(y/98), cc=Math.floor(x/101);
            const key=`r${r}c${cc}`;
            if(isBg){ totalBg++; bgCells[key]=(bgCells[key]||0)+1; }
            else { totalNstd++; nstdCells[key]=(nstdCells[key]||0)+1; }
          }
        }
        const topBg=Object.entries(bgCells).sort((a,b)=>b[1]-a[1]).slice(0,25);
        const topNstd=Object.entries(nstdCells).sort((a,b)=>b[1]-a[1]).slice(0,25);

        // Row histograms for top remaining bg-wrong
        const rowHist = {};
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
          const rR=refPx.data[i],rG=refPx.data[i+1],rB=refPx.data[i+2];
          if (Math.abs(oR-235)>15) continue;
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if(d>20) rowHist[y]=(rowHist[y]||0)+1;
        }
        const topRows=Object.entries(rowHist).sort((a,b)=>b[1]-a[1]).slice(0,20);

        // Per-row totals for bg-wrong
        const rowTotals = {};
        for (const [y, v] of Object.entries(rowHist)) {
          const r = Math.floor(+y/98);
          rowTotals[`r${r}`] = (rowTotals[`r${r}`] || 0) + v;
        }

        // Nstd breakdown by row
        const nstdRow = {};
        for (const [cell, v] of Object.entries(nstdCells)) {
          const r = cell.replace(/c\d+/, '');
          nstdRow[r] = (nstdRow[r] || 0) + v;
        }

        resolve({ totalWrong, totalBg, totalNstd, topBg, topNstd, topRows, rowTotals, nstdRow });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong} (bg: ${result.totalBg}, nstd: ${result.totalNstd})`);
console.log('\n=== Top 25 bg-wrong cells ===');
for(const [k,v] of result.topBg) console.log(`  ${k}: ${v}`);
console.log('\n=== Top 25 nstd-wrong cells ===');
for(const [k,v] of result.topNstd) console.log(`  ${k}: ${v}`);
console.log('\n=== Top 20 bg-wrong rows ===');
for(const [y,v] of result.topRows) console.log(`  y=${y}: ${v}px`);
console.log('\n=== bg-wrong by row ===');
const rowSorted = Object.entries(result.rowTotals).sort((a,b)=>b[1]-a[1]);
for(const [r,v] of rowSorted) console.log(`  ${r}: ${v}`);
console.log('\n=== nstd-wrong by row ===');
const nstdRowSorted = Object.entries(result.nstdRow).sort((a,b)=>b[1]-a[1]);
for(const [r,v] of nstdRowSorted) console.log(`  ${r}: ${v}`);

await browser.close();
