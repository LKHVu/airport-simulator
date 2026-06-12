// Sim r6c9 cluster, verify r5c8 extension, probe more cells.
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

        // ===== r6c9: concentrated at CMP x=909-920, y=590-601 =====
        // CMP x=909→SVG 833.4; CMP x=920→SVG 843.5; CMP x=921→SVG 844.4
        // CMP y=590→SVG 579.9; CMP y=601→SVG 590.7
        const r6c9_tight = simSvgRect(833, 580, 844, 591, 17);
        // Wider: include more cols and rows
        const r6c9_wide = simSvgRect(833, 578, 846, 595, 17);
        // Even wider at y (590-606):
        const r6c9_tall = simSvgRect(833, 580, 844, 598, 17);
        // Full column range c9 (909-1010) at y=590-600:
        const r6c9_fullx = simSvgRect(833, 580, 926, 591, 17);

        // ===== r5c8 upper — verify combined =====
        // Existing rect: SVG x=819-834, y=566-580. Want to extend to 548.
        // Combined would be SVG x=819-834, y=548-580 (h=32).
        // But currently at y=566-580 our pixels are already dark (not bg),
        // so only y=548-566 contributes new improvement.
        const r5c8_upper_only = simSvgRect(819, 548, 834, 566, 17);
        const r5c8_combined = simSvgRect(819, 548, 834, 580, 17);

        // Also check: what is at SVG 819-834, y=580-620 (below our existing lower rect)?
        const r5c8_below = simSvgRect(819, 580, 834, 620, 17);

        // ===== Extended column band to the right of r6c9 =====
        // r6c9 cols: 909:39, 910:38, 911:35, 912:33... tapering right
        // Check if extending further right still positive:
        const r6c9_rightward = simSvgRect(833, 580, 860, 591, 17);
        // Try including more height downward (y=601-620):
        const r6c9_lower = simSvgRect(833, 591, 844, 615, 17);

        // ===== r6c9 full area investigation =====
        const r6c9_rows_full = darkRowHist(909, 588, 1010, 686);
        const r6c9_cols_full = darkColHist(909, 588, 1010, 686);

        // ===== r5c9 area (909-1010, 490-588) — remaining dark =====
        const r5c9_rows = darkRowHist(909, 490, 1010, 588);
        const r5c9_cols = darkColHist(909, 490, 1010, 588);

        // ===== r3c8 — check for any narrow positive sims =====
        // rows: y=356:84, y=349:46, y=332-333:20 each
        // Col top: x=813:22, x=839:22, x=819:16...
        // CMP x=813 → SVG x=745; CMP x=839 → SVG x=769
        // Try thin rects at the two concentrated columns:
        const r3c8_col813 = simSvgRect(744, 294, 748, 392, 17); // CMP x=813-817
        const r3c8_col839 = simSvgRect(769, 294, 773, 392, 17); // CMP x=839-843
        // Combined narrow band x=810-845 (SVG 743-776), y=349-358 (SVG 349-352):
        const r3c8_narrow = simSvgRect(743, 343, 776, 357, 17);

        // ===== Check if any area in r2 range has positive sims =====
        // r2c0 (CMP 0-101, 196-294): 1941 bg-wrong
        // From analyze58: r2c0_col21: scattered. Full cell sim was very negative.
        // Try a different approach: check if there's a concentrated spot
        const r2c0_rows = darkRowHist(0, 196, 101, 294);
        const r2c0_cols = darkColHist(0, 196, 101, 294);
        const r2c0_sim = simSvgRect(0, 193, 93, 289, 17);

        // r2c9 (CMP 909-1010, 196-294): 1656 bg-wrong. Check distribution.
        const r2c9_rows = darkRowHist(909, 196, 1010, 294);
        const r2c9_cols = darkColHist(909, 196, 1010, 294);
        const r2c9_sim = simSvgRect(832, 193, 926, 289, 17);

        // r4c8 (CMP 808-909, 392-490): 1545 bg-wrong. Check distribution.
        const r4c8_rows = darkRowHist(808, 392, 909, 490);
        const r4c8_cols = darkColHist(808, 392, 909, 490);
        const r4c8_sim = simSvgRect(742, 387, 832, 482, 17);
        // Narrow top portion (y=392-415 CMP, SVG y=387-402):
        const r4c8_top_sim = simSvgRect(742, 387, 832, 403, 17);

        let totalWrong=0;
        for (let i=0;i<W*H*4;i+=4) {
          const d=(Math.abs(refPx.data[i]-ourPx.data[i])+Math.abs(refPx.data[i+1]-ourPx.data[i+1])+Math.abs(refPx.data[i+2]-ourPx.data[i+2]))/3;
          if (d>20) totalWrong++;
        }

        resolve({
          totalWrong,
          r6c9_tight, r6c9_wide, r6c9_tall, r6c9_fullx,
          r5c8_upper_only, r5c8_combined, r5c8_below,
          r6c9_rightward, r6c9_lower,
          r6c9_rows_full, r6c9_cols_full,
          r5c9_rows, r5c9_cols,
          r3c8_col813, r3c8_col839, r3c8_narrow,
          r2c0_rows, r2c0_cols, r2c0_sim,
          r2c9_rows, r2c9_cols, r2c9_sim,
          r4c8_rows, r4c8_cols, r4c8_sim, r4c8_top_sim,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log(`Total wrong: ${result.totalWrong}`);

function ch(hist, label, n=12) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log('\n=== r6c9 sims ===');
console.log('  tight (833-844, 580-591):', JSON.stringify(result.r6c9_tight));
console.log('  wide (833-846, 578-595):', JSON.stringify(result.r6c9_wide));
console.log('  tall (833-844, 580-598):', JSON.stringify(result.r6c9_tall));
console.log('  full-x (833-926, 580-591):', JSON.stringify(result.r6c9_fullx));
console.log('  rightward (833-860, 580-591):', JSON.stringify(result.r6c9_rightward));
console.log('  lower (833-844, 591-615):', JSON.stringify(result.r6c9_lower));

console.log('\n=== r5c8 extension sims ===');
console.log('  upper only (819-834, 548-566):', JSON.stringify(result.r5c8_upper_only));
console.log('  combined (819-834, 548-580):', JSON.stringify(result.r5c8_combined));
console.log('  below (819-834, 580-620):', JSON.stringify(result.r5c8_below));

console.log('\n=== r6c9 area ==='); ch(result.r6c9_rows_full,'rows'); ch(result.r6c9_cols_full,'cols');
console.log('\n=== r5c9 remaining ==='); ch(result.r5c9_rows,'rows'); ch(result.r5c9_cols,'cols');

console.log('\n=== r3c8 col sims ===');
console.log('  col813 (744-748, 294-392):', JSON.stringify(result.r3c8_col813));
console.log('  col839 (769-773, 294-392):', JSON.stringify(result.r3c8_col839));
console.log('  narrow band (743-776, 343-357):', JSON.stringify(result.r3c8_narrow));

console.log('\n=== r2c0 ==='); ch(result.r2c0_rows,'rows'); ch(result.r2c0_cols,'cols');
console.log('  sim:', JSON.stringify(result.r2c0_sim));

console.log('\n=== r2c9 ==='); ch(result.r2c9_rows,'rows'); ch(result.r2c9_cols,'cols');
console.log('  sim:', JSON.stringify(result.r2c9_sim));

console.log('\n=== r4c8 ==='); ch(result.r4c8_rows,'rows'); ch(result.r4c8_cols,'cols');
console.log('  full sim:', JSON.stringify(result.r4c8_sim));
console.log('  top sim (387-403):', JSON.stringify(result.r4c8_top_sim));

await browser.close();
