// Post-fix: check r6c9 lower remaining, r5c9 cluster, and any new opportunities.
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

        function simSvgRect(svgX0, svgY0, svgX1, svgY1, targetAvg) {
          const x0=Math.floor(svgX0*1309/1200), y0=Math.floor(svgY0*875/860);
          const x1=Math.ceil(svgX1*1309/1200), y1=Math.ceil(svgY1*875/860);
          let f=0, b=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-235)>15||Math.abs(oG-235)>15||Math.abs(oB-235)>15) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-targetAvg)+Math.abs(rG-targetAvg)+Math.abs(rB-targetAvg))/3;
              if (dB>20&&dA<=20) f++;
              else if (dB<=20&&dA>20) b++;
            }
          }
          return {fixes:f,breaks:b,net:f-b};
        }

        function darkRowHist(x0, y0, x1, y1, thresh=80) {
          const h={};
          for (let y=y0;y<Math.min(y1,H);y++) for (let x=x0;x<Math.min(x1,W);x++) {
            const i=(y*W+x)*4;
            if (Math.abs(ourPx.data[i]-235)>15) continue;
            if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < thresh) h[y]=(h[y]||0)+1;
          }
          return h;
        }
        function darkColHist(x0, y0, x1, y1, thresh=80) {
          const h={};
          for (let y=y0;y<Math.min(y1,H);y++) for (let x=x0;x<Math.min(x1,W);x++) {
            const i=(y*W+x)*4;
            if (Math.abs(ourPx.data[i]-235)>15) continue;
            if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < thresh) h[x]=(h[x]||0)+1;
          }
          return h;
        }

        // ===== r6c9 lower (after tall fix at 580-598) =====
        // Check remaining dark in r6c9 below y=598 CMP
        const r6c9_lower_rows = darkRowHist(909, 598, 1010, 686);
        const r6c9_lower_cols = darkColHist(909, 598, 1010, 686);
        const r6c9_lower_sim = simSvgRect(833, 590, 844, 620, 17); // CMP y=598-627
        const r6c9_medium = simSvgRect(833, 580, 844, 620, 17); // extend tall down to 620

        // ===== r5c9 concentrated cluster at CMP x=939-945, y=490-505 =====
        // SVG x: 939×1200/1309=861.1→861; 945×1200/1309=866.6→867; +1→868
        // SVG y: 490×860/875=481.5→482; 505×860/875=496.3→497
        const r5c9_cluster = simSvgRect(861, 482, 868, 497, 17);
        // Wider: include more cols
        const r5c9_cluster_wide = simSvgRect(858, 481, 872, 498, 17); // CMP x=936-948
        // Full column range at these rows:
        const r5c9_toprows = simSvgRect(832, 481, 926, 498, 17);

        // r5c9 full investigation
        const r5c9_rows = darkRowHist(909, 490, 1010, 588);
        const r5c9_cols = darkColHist(909, 490, 1010, 588);

        // ===== r6c9 full area after fix =====
        const r6c9_rows = darkRowHist(909, 588, 1010, 686);
        const r6c9_cols = darkColHist(909, 588, 1010, 686);

        // ===== r4c9 area (just above our black block) =====
        // Currently the black block at SVG 860, y=434, w=65, h=30 covers CMP 938-1009, 442-464
        // What's at CMP x=909-938, y=442-490 (before the block)?
        const r4c9_left_rows = darkRowHist(909, 440, 938, 490);
        const r4c9_left_cols = darkColHist(909, 440, 938, 490);
        const r4c9_left_sim = simSvgRect(832, 434, 860, 482, 17);

        // ===== Global sweep for any cells with concentrated clusters we missed =====
        // Check r6c10 (CMP 1010-1111, 588-686)
        const r6c10_rows = darkRowHist(1010, 588, 1111, 686);
        const r6c10_cols = darkColHist(1010, 588, 1111, 686);
        const r6c10_sim = simSvgRect(926, 581, 1018, 677, 17);
        const r6c10_narrow = simSvgRect(996, 581, 1009, 680, 17); // just concentrated cols

        // r6c11 (CMP 1111-1212, 588-686)
        const r6c11_rows = darkRowHist(1111, 588, 1212, 686);
        const r6c11_cols = darkColHist(1111, 588, 1212, 686);
        const r6c11_sim = simSvgRect(1018, 581, 1111, 677, 17);

        // r5c12 (CMP 1212-1309, 490-588)
        const r5c12_rows = darkRowHist(1212, 490, 1309, 588);
        const r5c12_cols = darkColHist(1212, 490, 1309, 588);
        const r5c12_sim = simSvgRect(1111, 482, 1200, 581, 17);

        // r6c12 (CMP 1212-1309, 588-686)
        const r6c12_rows = darkRowHist(1212, 588, 1309, 686);
        const r6c12_sim = simSvgRect(1111, 581, 1200, 677, 17);

        // r7c9 (CMP 909-1010, 686-784)
        const r7c9_rows = darkRowHist(909, 686, 1010, 784);

        // ===== Per-cell bg-wrong count (fresh) =====
        const bgCells = {};
        let totalWrong=0;
        for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
          const i=(y*W+x)*4;
          const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
          const rR=refPx.data[i],rG=refPx.data[i+1],rB=refPx.data[i+2];
          const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
          if(d>20){
            totalWrong++;
            if(Math.abs(oR-235)<=15&&Math.abs(oG-235)<=15&&Math.abs(oB-235)<=15){
              const r=Math.floor(y/98), cc=Math.floor(x/101);
              bgCells[`r${r}c${cc}`]=(bgCells[`r${r}c${cc}`]||0)+1;
            }
          }
        }
        const topBg=Object.entries(bgCells).sort((a,b)=>b[1]-a[1]).slice(0,20);

        resolve({
          totalWrong, topBg,
          r6c9_lower_rows, r6c9_lower_cols, r6c9_lower_sim, r6c9_medium,
          r5c9_cluster, r5c9_cluster_wide, r5c9_toprows,
          r5c9_rows, r5c9_cols,
          r6c9_rows, r6c9_cols,
          r4c9_left_rows, r4c9_left_cols, r4c9_left_sim,
          r6c10_rows, r6c10_cols, r6c10_sim, r6c10_narrow,
          r6c11_rows, r6c11_cols, r6c11_sim,
          r5c12_rows, r5c12_cols, r5c12_sim,
          r6c12_rows, r6c12_sim,
          r7c9_rows,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);
console.log('\n=== Top 20 bg-wrong cells ===');
for(const [k,v] of result.topBg) console.log(`  ${k}: ${v}`);

function ch(hist, label, n=12) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log('\n=== r6c9 lower (after tall fix) ===');
ch(result.r6c9_lower_rows,'rows'); ch(result.r6c9_lower_cols,'cols');
console.log('  lower (833-844, 590-620):', JSON.stringify(result.r6c9_lower_sim));
console.log('  medium (833-844, 580-620):', JSON.stringify(result.r6c9_medium));

console.log('\n=== r5c9 cluster ===');
console.log('  tight (861-868, 482-497):', JSON.stringify(result.r5c9_cluster));
console.log('  wide (858-872, 481-498):', JSON.stringify(result.r5c9_cluster_wide));
console.log('  toprows (832-926, 481-498):', JSON.stringify(result.r5c9_toprows));
ch(result.r5c9_rows,'r5c9_rows'); ch(result.r5c9_cols,'r5c9_cols');

console.log('\n=== r6c9 remaining ==='); ch(result.r6c9_rows,'rows'); ch(result.r6c9_cols,'cols');

console.log('\n=== r4c9 left area ==='); ch(result.r4c9_left_rows,'rows'); ch(result.r4c9_left_cols,'cols');
console.log('  sim (832-860, 434-482):', JSON.stringify(result.r4c9_left_sim));

console.log('\n=== r6c10 ==='); ch(result.r6c10_rows,'rows'); ch(result.r6c10_cols,'cols');
console.log('  sim:', JSON.stringify(result.r6c10_sim));
console.log('  narrow (996-1009, 581-680):', JSON.stringify(result.r6c10_narrow));

console.log('\n=== r6c11 ==='); ch(result.r6c11_rows,'rows'); ch(result.r6c11_cols,'cols');
console.log('  sim:', JSON.stringify(result.r6c11_sim));

console.log('\n=== r5c12 ==='); ch(result.r5c12_rows,'rows'); ch(result.r5c12_cols,'cols');
console.log('  sim:', JSON.stringify(result.r5c12_sim));

console.log('\n=== r6c12 ==='); ch(result.r6c12_rows,'rows');
console.log('  sim:', JSON.stringify(result.r6c12_sim));

console.log('\n=== r7c9 ==='); ch(result.r7c9_rows,'rows');

await browser.close();
