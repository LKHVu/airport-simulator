// Targeted simulations for specific small fixes.
// 1. Extend grey rect at x=22-247, y=240-260 (gap zone grey band)
// 2. White rect at x=0-15, y=265-360 (left edge of DOM apron)
// 3. Check label/marker removal effects
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

        // Simulate replacing OUR pixel with newColor if OUR is near-white (>220)
        function simReplace(x0, y0, x1, y1, newR, newG, newB, ourThresh=220) {
          let fixes=0, breaks=0;
          const samples = [];
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (oR<ourThresh || oG<ourThresh || oB<ourThresh) continue; // skip non-white pixels
              const dBefore=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dAfter=(Math.abs(rR-newR)+Math.abs(rG-newG)+Math.abs(rB-newB))/3;
              if (dBefore>20 && dAfter<=20) fixes++;
              else if (dBefore<=20 && dAfter>20) breaks++;
              if (samples.length<5 && dBefore>20) samples.push({x,y,rR,rG,rB,oR,oG,oB,dBefore:Math.round(dBefore),dAfter:Math.round(dAfter)});
            }
          }
          return {fixes,breaks,net:fixes-breaks,samples};
        }

        // Simulate replacing OUR with white where OUR is near DOM apron (#edefe1=237,239,225 ±15)
        function simApronToWhite(x0, y0, x1, y1) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              if (Math.abs(oR-237)>15 || Math.abs(oG-239)>15 || Math.abs(oB-225)>15) continue;
              const dBefore=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dAfter=(Math.abs(rR-255)+Math.abs(rG-255)+Math.abs(rB-255))/3;
              if (dBefore>20 && dAfter<=20) fixes++;
              else if (dBefore<=20 && dAfter>20) breaks++;
            }
          }
          return {fixes,breaks,net:fixes-breaks};
        }

        // 1. Grey gap zone: x=22-247 SVG → CMP x=24-269, y=240-262 SVG → CMP y=244-267
        const gapGrey_c0c0c0 = simReplace(24, 244, 269, 267, 192, 192, 192);
        const gapGrey_c8c8c8 = simReplace(24, 244, 269, 267, 200, 200, 200);
        const gapGrey_bbbbbb = simReplace(24, 244, 269, 267, 187, 187, 187);

        // Also check x=22-862 SVG → CMP x=24-940 (extending BOTH grey and dark rects)
        // But only simulate grey (c0c0c0) for the full band
        const gapGrey_full = simReplace(24, 244, 940, 267, 192, 192, 192);

        // 2. DOM apron left edge: x=0-16 SVG → CMP x=0-17, y=265-360 SVG → CMP y=270-366
        const domLeft_white = simApronToWhite(0, 270, 17, 366);

        // 3. Also simulate making AreaLabels area white (remove red GROUND 2 rect)
        // AreaLabels rect: SVG x=340-468, y=570-596 → CMP x=371-511, y=580-606
        // Simulate replacing any red (#cc0000-ish) pixel with white
        let redFixes=0, redBreaks=0;
        for (let y=580; y<606; y++) {
          for (let x=371; x<511; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            if (oR<150 || oG>50 || oB>50) continue; // skip non-red pixels
            const dBefore=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            const dAfter=(Math.abs(rR-255)+Math.abs(rG-255)+Math.abs(rB-255))/3;
            if (dBefore>20 && dAfter<=20) redFixes++;
            else if (dBefore<=20 && dAfter>20) redBreaks++;
          }
        }
        const areaLabel_noRed = {fixes:redFixes,breaks:redBreaks,net:redFixes-redBreaks};

        // 4. Row scans at key y positions for insight
        function rowScan(y, x0, x1, step=3) {
          const pts=[];
          for(let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
            if(d>20) pts.push({x,svgX:Math.round(x/1.091),ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]],our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]],diff:Math.round(d)});
          }
          return pts;
        }

        // Row y=245 full range (gap zone)
        const row245_full = rowScan(245, 0, W, 6);
        // Row y=255 full
        const row255_full = rowScan(255, 0, W, 6);
        // Row y=265 full (just at apron start)
        const row265_full = rowScan(265, 0, W, 6);

        // Check what's at x=0-17, y=270-366 in detail
        function sampleCell(x0, y0, x1, y1) {
          let rR=0,rG=0,rB=0,oR=0,oG=0,oB=0,cnt=0,wrong=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              rR+=refPx.data[i]; rG+=refPx.data[i+1]; rB+=refPx.data[i+2];
              oR+=ourPx.data[i]; oG+=ourPx.data[i+1]; oB+=ourPx.data[i+2];
              const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
              if (d>20) wrong++;
              cnt++;
            }
          }
          const f=(rgb,n)=>'#'+rgb.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join('');
          return { refAvg:f([rR,rG,rB],cnt), ourAvg:f([oR,oG,oB],cnt), pct:Math.round(wrong*100/cnt), wrong, cnt };
        }

        const domEdge = sampleCell(0, 270, 17, 366);
        const gapZoneWest = sampleCell(24, 244, 269, 267);
        const gapZoneMid = sampleCell(269, 244, 940, 267);

        resolve({ gapGrey_c0c0c0, gapGrey_c8c8c8, gapGrey_bbbbbb, gapGrey_full,
                  domLeft_white, areaLabel_noRed, domEdge, gapZoneWest, gapZoneMid,
                  row245_full, row255_full, row265_full });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v => v.toString(16).padStart(2,'0')).join('');

console.log('\n=== Gap zone grey extension (CMP x=24-269, y=244-267) ===');
console.log(`  #c0c0c0 (192): ${JSON.stringify(result.gapGrey_c0c0c0)}`);
console.log(`  #c8c8c8 (200): ${JSON.stringify(result.gapGrey_c8c8c8)}`);
console.log(`  #bbbbbb (187): ${JSON.stringify(result.gapGrey_bbbbbb)}`);
console.log(`  #c0c0c0 full band (x=24-940): ${JSON.stringify(result.gapGrey_full)}`);

console.log('\n=== DOM apron left edge fix (x=0-17, y=270-366) → white ===');
console.log(`  ${JSON.stringify(result.domLeft_white)}`);
console.log(`  Zone stats: REF:${result.domEdge.refAvg} OUR:${result.domEdge.ourAvg} wrong:${result.domEdge.wrong} (${result.domEdge.pct}%)`);

console.log('\n=== Area label red rect removal ===');
console.log(`  ${JSON.stringify(result.areaLabel_noRed)}`);

console.log('\n=== Gap zone analysis ===');
console.log(`  West (x=24-269): REF:${result.gapZoneWest.refAvg} OUR:${result.gapZoneWest.ourAvg} wrong:${result.gapZoneWest.wrong} (${result.gapZoneWest.pct}%)`);
console.log(`  Mid (x=269-940): REF:${result.gapZoneMid.refAvg} OUR:${result.gapZoneMid.ourAvg} wrong:${result.gapZoneMid.wrong} (${result.gapZoneMid.pct}%)`);

console.log('\n=== Row y=245 wrong (full range, step=6) ===');
for(const p of result.row245_full) console.log(`  x=${p.x}(svg${p.svgX}): REF:${fmt(p.ref)} OUR:${fmt(p.our)} d:${p.diff}`);

console.log('\n=== Row y=255 wrong ===');
for(const p of result.row255_full) console.log(`  x=${p.x}(svg${p.svgX}): REF:${fmt(p.ref)} OUR:${fmt(p.our)} d:${p.diff}`);

console.log('\n=== Row y=265 wrong ===');
for(const p of result.row265_full) console.log(`  x=${p.x}(svg${p.svgX}): REF:${fmt(p.ref)} OUR:${fmt(p.our)} d:${p.diff}`);

await browser.close();
