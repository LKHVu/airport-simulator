// Sim narrow rects for y=547-549 at c10/c11, y=519-520 at c10, y=442/y=421 narrow, y=373 cells, r5c8.
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

        // ===== y=547-549 at c10 (CMP x=1010-1111, y=547-550) =====
        // CMP x=1010→SVG x=926, CMP x=1111→SVG x=1019
        // CMP y=547→SVG y=538.1, CMP y=550→SVG y=541.0
        const y547_c10_narrow = simSvgRect(926, 538, 1019, 542, 17);
        // Try tighter: just y=538-540 (CMP y=547-548)
        const y547_c10_2rows = simSvgRect(926, 538, 1019, 540, 17);
        // Try with col constraint: from r5c10 cols: x=1090-1091:22 each, then 1010-1089:5 each
        // Narrow x to x=1086-1098 (CMP) → SVG x=996-1008 where cols are concentrated
        const y547_c10_xnarrow = simSvgRect(996, 538, 1009, 542, 17);

        // ===== y=547-549 at c11 (CMP x=1111-1212, y=547-550) =====
        // CMP x=1111→SVG 1019, CMP x=1212→SVG 1111
        // r5c11 cols: x=1190:30, then 1111-1189:3 each
        const y547_c11_narrow = simSvgRect(1019, 538, 1111, 542, 17);
        // Narrow x to col x=1190 ± (CMP x=1185-1196) → SVG x=1087-1098
        const y547_c11_xnarrow = simSvgRect(1087, 538, 1099, 542, 17);

        // ===== y=519-520 at c10 (CMP x=1010-1111, y=519-521) =====
        // CMP y=519→SVG y=509.9, CMP y=521→SVG y=511.9
        const y519_c10 = simSvgRect(926, 510, 1019, 513, 17);
        // Also with just x=1086-1099 (concentrated cols)
        const y519_c10_xnarrow = simSvgRect(996, 510, 1009, 513, 17);

        // ===== y=442 narrow at c10 (not covered by existing rect above CMP y=444) =====
        // Existing rect: SVG x=926, y=437, w=73, h=73 → CMP x=1010-1090, y=444-519
        // CMP y=442 (just above the rect): SVG y=434-436
        // c10 cols showed x=1090-1091:32, x=1092-1101:13
        // CMP x=1090-1101 → SVG x=999-1009
        const y442_c10_gap = simSvgRect(999, 434, 1009, 437, 17);

        // ===== y=442 at c11 narrow (CMP y=442 → SVG y=434-436) =====
        // c11 has 101px at y=442. Cols: x=1154:22, x=1111-1153:13
        const y442_c11_full = simSvgRect(1019, 434, 1111, 437, 17);
        // Narrow to col x=1154 ± (CMP x=1148-1162) → SVG x=1052-1065
        const y442_c11_xnarrow = simSvgRect(1052, 434, 1066, 437, 17);

        // ===== y=421 at c11 (49px) =====
        // CMP y=421 → SVG y=413.7 → 414
        const y421_c11 = simSvgRect(1019, 414, 1111, 417, 17);
        // CMP y=421 range: SVG y=413-416
        const y421_c11_v2 = simSvgRect(1019, 413, 1111, 416, 17);
        // Narrow x to col x=1154 zone
        const y421_c11_xnarrow = simSvgRect(1052, 413, 1066, 417, 17);

        // ===== r5c8 concentrated block =====
        // rows: 587:24, 586:20, 585:17, 577-584:15-16. cols: 908:40, 907:38, 906:34, 903-905:29-32
        // CMP x=897-909 → SVG x=822-834; CMP y=577-587 → SVG y=568-577
        const r5c8_block = simSvgRect(822, 568, 834, 578, 17);
        // Wider: CMP x=893-909, y=575-589 → SVG x=819-834, y=566-579
        const r5c8_wide = simSvgRect(819, 566, 834, 580, 17);

        // ===== y=373 cell distribution =====
        const y373_cells = {};
        for (let x=0;x<W;x++) {
          const i=(373*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            const cc=Math.floor(x/101); y373_cells[`c${cc}`]=(y373_cells[`c${cc}`]||0)+1;
          }
        }
        // y=300 cell distribution
        const y300_cells = {};
        for (let x=0;x<W;x++) {
          const i=(300*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            const cc=Math.floor(x/101); y300_cells[`c${cc}`]=(y300_cells[`c${cc}`]||0)+1;
          }
        }
        // y=356 cell distribution (top global)
        const y356_cells = {};
        for (let x=0;x<W;x++) {
          const i=(356*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            const cc=Math.floor(x/101); y356_cells[`c${cc}`]=(y356_cells[`c${cc}`]||0)+1;
          }
        }
        // y=223 cell dist
        const y223_cells = {};
        for (let x=0;x<W;x++) {
          const i=(223*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            const cc=Math.floor(x/101); y223_cells[`c${cc}`]=(y223_cells[`c${cc}`]||0)+1;
          }
        }
        // y=112 cell dist
        const y112_cells = {};
        for (let x=0;x<W;x++) {
          const i=(112*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            const cc=Math.floor(x/101); y112_cells[`c${cc}`]=(y112_cells[`c${cc}`]||0)+1;
          }
        }

        // y=471 cell dist (103px globally)
        const y471_cells = {};
        for (let x=0;x<W;x++) {
          const i=(471*W+x)*4;
          if (Math.abs(ourPx.data[i]-235)>15) continue;
          if ((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3 < 80) {
            const cc=Math.floor(x/101); y471_cells[`c${cc}`]=(y471_cells[`c${cc}`]||0)+1;
          }
        }

        // r6c8 row hist to see what's remaining below the fix
        const r6c8_below = darkRowHist(808, 620, 909, 686);
        const r6c8_cols_below = darkColHist(808, 620, 909, 686);

        // r4c5 col hist (from analyze56: top were around y=405-445)
        const r4c5_rows = darkRowHist(505, 392, 606, 490);
        const r4c5_cols = darkColHist(505, 392, 606, 490);

        // Sim r4c5 tight vertical strip at col x=505-506 (just left boundary of taxiway)
        const r4c5_col505 = simSvgRect(463, 392, 467, 430, 17);

        // ===== Extend taxiway west: CMP x=0-270, y=222-249 =====
        // This would cover the runway taxiway line west of our current band.
        // Current band starts at SVG x=247 (CMP x=270).
        // The reference taxiway west portion: CMP x=0-269.
        // But we can't just add a full wide rect here — need to know what's there.
        const r2c1_taxiway_ext = simSvgRect(0, 218, 247, 245, 17); // extend taxiway west
        // Just the narrow band at y=222-225 (CMP y=223-224 area):
        const r2c1_taxiway_narrow = simSvgRect(0, 218, 247, 222, 17);

        // ===== Extend taxiway east: CMP x=1257-1309, y=222-249 =====
        const taxiway_east_ext = simSvgRect(1152, 218, 1200, 245, 17);
        const taxiway_east_narrow = simSvgRect(1152, 218, 1200, 222, 17);

        resolve({
          y547_c10_narrow, y547_c10_2rows, y547_c10_xnarrow,
          y547_c11_narrow, y547_c11_xnarrow,
          y519_c10, y519_c10_xnarrow,
          y442_c10_gap, y442_c11_full, y442_c11_xnarrow,
          y421_c11, y421_c11_v2, y421_c11_xnarrow,
          r5c8_block, r5c8_wide,
          y373_cells, y300_cells, y356_cells, y223_cells, y112_cells, y471_cells,
          r6c8_below, r6c8_cols_below,
          r4c5_rows, r4c5_cols, r4c5_col505,
          r2c1_taxiway_ext, r2c1_taxiway_narrow,
          taxiway_east_ext, taxiway_east_narrow,
        });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

function ch(hist, label, n=12) {
  const e=Object.entries(hist).sort((a,b)=>+a[0]-+b[0]);
  const t=e.reduce((s,[,v])=>s+v,0);
  const top=e.sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>`${k}:${v}`).join(' ');
  console.log(`  ${label}(${t}): [${top}]`);
}

console.log('=== y=547-549 c10 sims ===');
console.log('  c10 full x (926-1019, 538-542):', JSON.stringify(result.y547_c10_narrow));
console.log('  c10 2rows (926-1019, 538-540):', JSON.stringify(result.y547_c10_2rows));
console.log('  c10 x-narrow (996-1009, 538-542):', JSON.stringify(result.y547_c10_xnarrow));

console.log('\n=== y=547-549 c11 sims ===');
console.log('  c11 full x (1019-1111, 538-542):', JSON.stringify(result.y547_c11_narrow));
console.log('  c11 x-narrow (1087-1099, 538-542):', JSON.stringify(result.y547_c11_xnarrow));

console.log('\n=== y=519-520 c10 sims ===');
console.log('  c10 full x (926-1019, 510-513):', JSON.stringify(result.y519_c10));
console.log('  c10 x-narrow (996-1009, 510-513):', JSON.stringify(result.y519_c10_xnarrow));

console.log('\n=== y=442 gap sims ===');
console.log('  c10 gap (999-1009, 434-437):', JSON.stringify(result.y442_c10_gap));
console.log('  c11 full (1019-1111, 434-437):', JSON.stringify(result.y442_c11_full));
console.log('  c11 x-narrow (1052-1066, 434-437):', JSON.stringify(result.y442_c11_xnarrow));

console.log('\n=== y=421 c11 sims ===');
console.log('  c11 (1019-1111, 414-417):', JSON.stringify(result.y421_c11));
console.log('  c11 v2 (1019-1111, 413-416):', JSON.stringify(result.y421_c11_v2));
console.log('  c11 x-narrow (1052-1066, 413-417):', JSON.stringify(result.y421_c11_xnarrow));

console.log('\n=== r5c8 block sims ===');
console.log('  block (822-834, 568-578):', JSON.stringify(result.r5c8_block));
console.log('  wide (819-834, 566-580):', JSON.stringify(result.r5c8_wide));

console.log('\n=== Cell distributions ===');
console.log('  y=356:', JSON.stringify(result.y356_cells));
console.log('  y=300:', JSON.stringify(result.y300_cells));
console.log('  y=373:', JSON.stringify(result.y373_cells));
console.log('  y=223:', JSON.stringify(result.y223_cells));
console.log('  y=112:', JSON.stringify(result.y112_cells));
console.log('  y=471:', JSON.stringify(result.y471_cells));

console.log('\n=== r6c8 below fix (y=620-686) ===');
ch(result.r6c8_below, 'rows'); ch(result.r6c8_cols_below, 'cols');

console.log('\n=== r4c5 ==='); ch(result.r4c5_rows,'rows'); ch(result.r4c5_cols,'cols');
console.log('  col505 sim (463-467, 392-430):', JSON.stringify(result.r4c5_col505));

console.log('\n=== Taxiway extension sims ===');
console.log('  west full (0-247, 218-245):', JSON.stringify(result.r2c1_taxiway_ext));
console.log('  west narrow (0-247, 218-222):', JSON.stringify(result.r2c1_taxiway_narrow));
console.log('  east full (1152-1200, 218-245):', JSON.stringify(result.taxiway_east_ext));
console.log('  east narrow (1152-1200, 218-222):', JSON.stringify(result.taxiway_east_narrow));

await browser.close();
