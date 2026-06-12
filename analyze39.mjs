// Deep scan: find wrong pixels by region and understand what SVG elements cause them.
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

        function simColorChange(x0, y0, x1, y1, fR, fG, fB, tR, tG, tB, tol=8) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-fR)>tol || Math.abs(oG-fG)>tol || Math.abs(oB-fB)>tol) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-tR)+Math.abs(rG-tG)+Math.abs(rB-tB))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes,breaks,net:fixes-breaks};
        }

        // Grid analysis: 13×9 cells, for each cell show wrong count + breakdown by OUR color range
        const CW=101, CH=98;
        const gridStats = [];
        for (let r=0; r<9; r++) {
          for (let c=0; c<13; c++) {
            const x0=c*CW, y0=r*CH, x1=Math.min((c+1)*CW,W), y1=Math.min((r+1)*CH,H);
            let wrong=0, bright=0, dark=0, mid=0;
            for (let y=y0; y<y1; y++) {
              for (let x=x0; x<x1; x++) {
                const i=(y*W+x)*4;
                const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
                const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
                const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
                if (d>20) {
                  wrong++;
                  const ob=(oR+oG+oB)/3;
                  if (ob>200) bright++;
                  else if (ob<80) dark++;
                  else mid++;
                }
              }
            }
            if (wrong>50) gridStats.push({r,c,wrong,bright,dark,mid});
          }
        }
        gridStats.sort((a,b)=>b.wrong-a.wrong);

        // Detailed OUR-vs-REF color histogram for top wrong cells
        function cellColorHist(x0,y0,x1,y1) {
          const hist = {};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              if (d>20) {
                // bin by OUR brightness and REF brightness
                const ob=Math.round((oR+oG+oB)/3/15)*15;
                const rb=Math.round((rR+rG+rB)/3/15)*15;
                const key=`OUR${ob}→REF${rb}`;
                hist[key]=(hist[key]||0)+1;
              }
            }
          }
          return Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,8);
        }

        // Get color histograms for top 5 cells
        const topCellHists = {};
        for (const s of gridStats.slice(0,5)) {
          const x0=s.c*CW, y0=s.r*CH;
          topCellHists[`r${s.r}c${s.c}`] = cellColorHist(x0,y0,x0+CW,y0+CH);
        }

        // Special scan: OUR is DARK (0-80) but REF is BRIGHT (200+) — these might be
        // SVG elements rendered with wrong color (like ASPHALT edges where REF shows light)
        let darkOurBrightRef = 0;
        const darkBrightByCells = {};
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const ob=(oR+oG+oB)/3, rb=(rR+rG+rB)/3;
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20 && ob<80 && rb>200) {
              darkOurBrightRef++;
              const key=`r${Math.floor(y/CH)}c${Math.floor(x/CW)}`;
              darkBrightByCells[key]=(darkBrightByCells[key]||0)+1;
            }
          }
        }

        // Scan: OUR is BRIGHT (200+) but REF is DARK (0-100) — our map is too light
        let brightOurDarkRef = 0;
        const brightDarkByCells = {};
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const ob=(oR+oG+oB)/3, rb=(rR+rG+rB)/3;
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20 && ob>200 && rb<100) {
              brightOurDarkRef++;
              const key=`r${Math.floor(y/CH)}c${Math.floor(x/CW)}`;
              brightDarkByCells[key]=(brightDarkByCells[key]||0)+1;
            }
          }
        }

        // Color-mismatch category: OUR is grey (160-220) REF is grey but DIFFERENT shade
        // These might be areas where our grey is wrong shade
        const greyMismatchByCells = {};
        let greyMismatch = 0;
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const ob=(oR+oG+oB)/3, rb=(rR+rG+rB)/3;
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20 && ob>100 && ob<220 && rb>100 && rb<220) {
              greyMismatch++;
              const key=`r${Math.floor(y/CH)}c${Math.floor(x/CW)}`;
              greyMismatchByCells[key]=(greyMismatchByCells[key]||0)+1;
            }
          }
        }

        // Overall wrong breakdown
        let total=0, wrongBright=0, wrongDark=0, wrongMid=0;
        for (let y=0; y<H; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if (d>20) {
              total++;
              const ob=(oR+oG+oB)/3;
              if (ob>200) wrongBright++;
              else if (ob<80) wrongDark++;
              else wrongMid++;
            }
          }
        }

        // Key sim tests
        // Test: can we reduce ASPHALT-colored wrong pixels by lightening asphalt?
        // ASPHALT = #444444 = (68,68,68). REF at those positions is bright (>200).
        // Lightening to #888 = (136,136,136) would reduce diff.
        // But we'd need to test carefully.
        const asphaltSim = simColorChange(0,0,W,H, 68,68,68, 136,136,136, 15);
        const asphalt160Sim = simColorChange(0,0,W,H, 68,68,68, 160,160,160, 15);
        const asphalt200Sim = simColorChange(0,0,W,H, 68,68,68, 200,200,200, 15);

        // Test lightening taxiway fill (taxiways have grey fill ~ #c0c0c0 to #d0d0d0?)
        // Actually: taxiways are just colored by type in our SVG.
        // TAXIWAY edges: what color do they have in OUR map?
        // Let me scan the taxiway area (r3c4 to r5c8) for dominant colors
        function colorHistArea(x0,y0,x1,y1,topN=10) {
          const hist={};
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              // Bin to nearest 10
              const R=Math.round(ourPx.data[i]/10)*10;
              const G=Math.round(ourPx.data[i+1]/10)*10;
              const B=Math.round(ourPx.data[i+2]/10)*10;
              const key=`${R},${G},${B}`;
              hist[key]=(hist[key]||0)+1;
            }
          }
          return Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,topN);
        }

        // Sample taxiway center zone
        const taxiwayColors = colorHistArea(303,294,606,490);
        const refTaxiwayColors = (() => {
          const hist={};
          for (let y=294; y<490; y++) {
            for (let x=303; x<606; x++) {
              const i=(y*W+x)*4;
              const R=Math.round(refPx.data[i]/10)*10;
              const G=Math.round(refPx.data[i+1]/10)*10;
              const B=Math.round(refPx.data[i+2]/10)*10;
              hist[`${R},${G},${B}`]=(hist[`${R},${G},${B}`]||0)+1;
            }
          }
          return Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,10);
        })();

        resolve({ gridStats, topCellHists, darkOurBrightRef, darkBrightByCells,
                  brightOurDarkRef, brightDarkByCells, greyMismatch, greyMismatchByCells,
                  total, wrongBright, wrongDark, wrongMid,
                  asphaltSim, asphalt160Sim, asphalt200Sim,
                  taxiwayColors, refTaxiwayColors });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.total} (bright:${result.wrongBright} dark:${result.wrongDark} mid:${result.wrongMid})`);

console.log('\n=== Top wrong cells (>50 wrong px) ===');
for (const s of result.gridStats.slice(0,20))
  console.log(`  r${s.r}c${s.c}: ${s.wrong} wrong (bright:${s.bright} dark:${s.dark} mid:${s.mid})`);

console.log('\n=== Top cell color histograms (wrong pixels) ===');
for (const [cell, hist] of Object.entries(result.topCellHists)) {
  console.log(`  ${cell}:`);
  for (const [k,v] of hist) console.log(`    ${k}: ${v}px`);
}

console.log(`\nDark OUR (<80) → Bright REF (>200): ${result.darkOurBrightRef} wrong pixels`);
console.log('By cell:');
for (const [k,v] of Object.entries(result.darkBrightByCells).sort((a,b)=>b[1]-a[1]).slice(0,10))
  console.log(`  ${k}: ${v}`);

console.log(`\nBright OUR (>200) → Dark REF (<100): ${result.brightOurDarkRef} wrong pixels`);
console.log('By cell:');
for (const [k,v] of Object.entries(result.brightDarkByCells).sort((a,b)=>b[1]-a[1]).slice(0,10))
  console.log(`  ${k}: ${v}`);

console.log(`\nGrey mismatch (both 100-220): ${result.greyMismatch} wrong pixels`);
console.log('By cell:');
for (const [k,v] of Object.entries(result.greyMismatchByCells).sort((a,b)=>b[1]-a[1]).slice(0,10))
  console.log(`  ${k}: ${v}`);

console.log('\n=== ASPHALT (#444 → lighter) sims ===');
console.log('→ #888 (136):', JSON.stringify(result.asphaltSim));
console.log('→ #a0a0a0 (160):', JSON.stringify(result.asphalt160Sim));
console.log('→ #c8c8c8 (200):', JSON.stringify(result.asphalt200Sim));

console.log('\n=== OUR taxiway center colors (CMP x=303-606, y=294-490) ===');
for (const [k,v] of result.taxiwayColors) console.log(`  (${k}): ${v}px`);

console.log('\n=== REF taxiway center colors (same area) ===');
for (const [k,v] of result.refTaxiwayColors) console.log(`  (${k}): ${v}px`);

await browser.close();
