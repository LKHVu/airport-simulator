// Analyze with symmetric grey [235,235,235] (0 breaks guaranteed) + VAECO deep scan.
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

        // Simulate overlay with configurable threshold and color
        function simOverlay(x0, y0, x1, y1, newR, newG, newB, ourThresh=230) {
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
          return {fixes,breaks,net:fixes-breaks};
        }

        function sampleCell(x0, y0, x1, y1) {
          let rSum=[0,0,0],oSum=[0,0,0],wrong=0,cnt=0;
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
          return { refAvg:f(rSum,cnt), ourAvg:f(oSum,cnt), wrong, pct:Math.round(wrong*100/cnt) };
        }

        // === Full grid sweep with symmetric grey [235,235,235] (guaranteed 0 breaks) ===
        // [235,235,235] → diff from REF=255 is exactly 20 → NOT wrong → no breaks
        const sweepSymm = [];
        for (let r=0; r<9; r++) {
          for (let c=0; c<13; c++) {
            const x0=c*101, y0=r*98, x1=(c+1)*101, y1=(r+1)*98;
            // Test at symmetric 235 — 0 breaks guaranteed for OUR=255 pixels
            const s235 = simOverlay(x0,y0,x1,y1, 235,235,235, 230);
            if (s235.net > 0) sweepSymm.push({r,c,net235:s235.net,...sampleCell(x0,y0,x1,y1)});
          }
        }
        sweepSymm.sort((a,b)=>b.net235-a.net235);

        // === VAECO background sim with low ourThresh (to include VAECO overlay pixels B=228) ===
        // VAECO zone: CMP x=907-1309, y=270-448 (SVG x=831-1200, y=265-440)
        const vaecoSims = {};
        for (const [label, [R,G,B,thresh]] of Object.entries({
          '211_t225': [211,212,203, 225],
          '215_t225': [215,216,207, 225],
          '218_t225': [218,219,211, 225],
          '220_t225': [220,220,213, 225],
          '225_t225': [225,224,218, 225],
          '228_t225': [228,228,221, 225],
          '215_t220': [215,216,207, 220],
          '220_t220': [220,220,213, 220],
          '225_t228': [225,225,218, 228],
          '228_t228': [228,228,221, 228],
          '230_t228': [230,230,223, 228],
          '232_t228': [232,232,225, 228],
        })) {
          vaecoSims[label] = simOverlay(907, 270, 1309, 448, R, G, B, thresh);
        }

        // === Test r3c9 specifically with symmetric 235 and various thresholds ===
        // r3c9: CMP x=909-1010, y=294-392
        const r3c9_sims = {};
        for (const [label, [R,G,B,thresh]] of Object.entries({
          'sym235_t230': [235,235,235, 230],
          'sym235_t225': [235,235,235, 225],
          'sym228_t225': [228,228,228, 225],
          'sym230_t225': [230,230,230, 225],
          'sym232_t225': [232,232,232, 225],
          'sym234_t225': [234,234,234, 225],
          'ebb_t225':    [235,234,228, 225],
          'ebb_t228':    [235,234,228, 228],
        })) {
          r3c9_sims[label] = simOverlay(909, 294, 1010, 392, R, G, B, thresh);
        }

        // === Directional scan: for each wrong pixel in r3c9, is OUR > REF or OUR < REF? ===
        let r3c9_tooLight=0, r3c9_tooDark=0, r3c9_refHist=[...Array(26)].map(()=>0);
        let r3c9_ourHist=[...Array(26)].map(()=>0);
        for (let y=294; y<392; y++) {
          for (let x=909; x<1010; x++) {
            const i=(y*W+x)*4;
            const oAvg=(ourPx.data[i]+ourPx.data[i+1]+ourPx.data[i+2])/3;
            const rAvg=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
            const d=Math.abs(oAvg-rAvg);
            if(d>20) {
              if(oAvg>rAvg) r3c9_tooLight++;
              else r3c9_tooDark++;
              const rBin=Math.min(25,Math.floor(rAvg/10));
              const oBin=Math.min(25,Math.floor(oAvg/10));
              r3c9_refHist[rBin]++;
              r3c9_ourHist[oBin]++;
            }
          }
        }

        // === White pixel scan in r3c5: find OUR=255 positions and their REF values ===
        const r3c5_whitePx = {refBins: [...Array(26)].map(()=>0), count:0, refAvgs:[]};
        for (let y=294; y<392; y++) {
          for (let x=505; x<606; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (oR>=230 && oG>=230 && oB>=230 && (oR+oG+oB)/3 >= 240) {
              r3c5_whitePx.count++;
              const rAvg=Math.round((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3);
              const bin=Math.min(25,Math.floor(rAvg/10));
              r3c5_whitePx.refBins[bin]++;
            }
          }
        }

        // === White pixel scan in r3c9 ===
        const r3c9_whitePx = {refBins: [...Array(26)].map(()=>0), count:0};
        for (let y=294; y<392; y++) {
          for (let x=909; x<1010; x++) {
            const i=(y*W+x)*4;
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            if (oR>=230 && oG>=230 && oB>=230 && (oR+oG+oB)/3 >= 240) {
              r3c9_whitePx.count++;
              const rAvg=Math.round((refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3);
              const bin=Math.min(25,Math.floor(rAvg/10));
              r3c9_whitePx.refBins[bin]++;
            }
          }
        }

        // === Scan for NEW opportunities: test all cells with threshold=225 ===
        const sweepT225 = [];
        for (let r=0; r<9; r++) {
          for (let c=0; c<13; c++) {
            const x0=c*101, y0=r*98, x1=(c+1)*101, y1=(r+1)*98;
            const best = Math.max(
              simOverlay(x0,y0,x1,y1, 225,225,225, 225).net,
              simOverlay(x0,y0,x1,y1, 228,228,228, 225).net,
              simOverlay(x0,y0,x1,y1, 230,230,230, 225).net,
              simOverlay(x0,y0,x1,y1, 232,232,232, 225).net,
              simOverlay(x0,y0,x1,y1, 235,235,235, 225).net,
            );
            if (best > 20) {
              const cell = sampleCell(x0,y0,x1,y1);
              sweepT225.push({r,c,best,...cell});
            }
          }
        }
        sweepT225.sort((a,b)=>b.best-a.best);

        // === r0 and r1 cells after south runway change ===
        const r0r1 = {};
        for (let r=0; r<2; r++) for (let c=0; c<13; c++) {
          const cell = sampleCell(c*101, r*98, (c+1)*101, (r+1)*98);
          if (cell.pct > 5) r0r1[`r${r}c${c}`] = cell;
        }

        // === Check if VAECO zone top row (r3c9-r3c12) has directional breakdown ===
        const vaecoTopCells = {};
        for (const [name, x0,y0,x1,y1] of [
          ['r3c9',  909,294,1010,392],
          ['r3c10',1010,294,1111,392],
          ['r3c11',1111,294,1212,392],
          ['r3c12',1212,294,1309,392],
        ]) {
          let tooLight=0, tooDark=0, refSum=0, ourSum=0, cnt=0, wrong=0;
          for (let y=y0; y<y1; y++) {
            for (let x=x0; x<x1; x++) {
              const i=(y*W+x)*4;
              const oAvg=(ourPx.data[i]+ourPx.data[i+1]+ourPx.data[i+2])/3;
              const rAvg=(refPx.data[i]+refPx.data[i+1]+refPx.data[i+2])/3;
              refSum+=rAvg; ourSum+=oAvg; cnt++;
              const d=Math.abs(oAvg-rAvg);
              if(d>20){ wrong++; if(oAvg>rAvg) tooLight++; else tooDark++; }
            }
          }
          vaecoTopCells[name]={tooLight,tooDark,wrong,
            refAvg:Math.round(refSum/cnt),ourAvg:Math.round(ourSum/cnt)};
        }

        resolve({ sweepSymm, vaecoSims, r3c9_sims, r3c9_tooLight, r3c9_tooDark,
                  r3c9_refHist, r3c9_ourHist, r3c5_whitePx, r3c9_whitePx,
                  sweepT225, r0r1, vaecoTopCells });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

console.log('\n=== Full grid sweep with symmetric [235,235,235] (NET>0) ===');
for (const r of result.sweepSymm) console.log(`  r${r.r}c${r.c}: NET=+${r.net235} wrong=${r.wrong}(${r.pct}%) REF:${r.refAvg} OUR:${r.ourAvg}`);

console.log('\n=== Full grid sweep with lower threshold (t=225) — any positive ===');
for (const r of result.sweepT225) console.log(`  r${r.r}c${r.c}: bestNET=+${r.best} wrong=${r.wrong}(${r.pct}%) REF:${r.refAvg} OUR:${r.ourAvg}`);

console.log('\n=== VAECO zone sims (CMP x=907-1309, y=270-448) ===');
for (const [k,v] of Object.entries(result.vaecoSims)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== r3c9 specific sims ===');
for (const [k,v] of Object.entries(result.r3c9_sims)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log(`\n=== r3c9 directional: tooLight=${result.r3c9_tooLight} tooDark=${result.r3c9_tooDark} ===`);
console.log('REF histogram (bins of 10):');
for (let i=0; i<26; i++) if(result.r3c9_refHist[i]>0) console.log(`  REF ${i*10}-${i*10+9}: ${result.r3c9_refHist[i]}`);
console.log('OUR histogram (bins of 10):');
for (let i=0; i<26; i++) if(result.r3c9_ourHist[i]>0) console.log(`  OUR ${i*10}-${i*10+9}: ${result.r3c9_ourHist[i]}`);

console.log(`\n=== r3c5 white pixels (OUR≥240): count=${result.r3c5_whitePx.count} ===`);
console.log('REF distribution of those whites:');
for (let i=0; i<26; i++) if(result.r3c5_whitePx.refBins[i]>0) console.log(`  REF ${i*10}-${i*10+9}: ${result.r3c5_whitePx.refBins[i]}`);

console.log(`\n=== r3c9 white pixels (OUR≥240): count=${result.r3c9_whitePx.count} ===`);
console.log('REF distribution of those whites:');
for (let i=0; i<26; i++) if(result.r3c9_whitePx.refBins[i]>0) console.log(`  REF ${i*10}-${i*10+9}: ${result.r3c9_whitePx.refBins[i]}`);

console.log('\n=== VAECO top row directionality ===');
for (const [k,v] of Object.entries(result.vaecoTopCells))
  console.log(`  ${k}: wrong=${v.wrong} tooLight=${v.tooLight}(${Math.round(v.tooLight*100/v.wrong)}%) tooDark=${v.tooDark}(${Math.round(v.tooDark*100/v.wrong)}%) REF:${v.refAvg} OUR:${v.ourAvg}`);

console.log('\n=== r0 and r1 cells (>5% wrong) ===');
for (const [k,v] of Object.entries(result.r0r1)) console.log(`  ${k}: REF:${v.refAvg} OUR:${v.ourAvg} ${v.pct}% (${v.wrong})`);

await browser.close();
