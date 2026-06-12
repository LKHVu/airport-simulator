// Simulate runway color changes and other targeted sims.
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

        // Simulate changing pixels with specific OUR color to new color
        function simColorChange(x0, y0, x1, y1, fromR, fromG, fromB, toR, toG, toB, tol=15) {
          let fixes=0, breaks=0;
          for (let y=y0; y<Math.min(y1,H); y++) {
            for (let x=x0; x<Math.min(x1,W); x++) {
              const i=(y*W+x)*4;
              const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
              if (Math.abs(oR-fromR)>tol || Math.abs(oG-fromG)>tol || Math.abs(oB-fromB)>tol) continue;
              const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
              const dB=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
              const dA=(Math.abs(rR-toR)+Math.abs(rG-toG)+Math.abs(rB-toB))/3;
              if (dB>20 && dA<=20) fixes++;
              else if (dB<=20 && dA>20) breaks++;
            }
          }
          return {fixes,breaks,net:fixes-breaks};
        }

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
          return { refAvg:f([rR,rG,rB],cnt), ourAvg:f([oR,oG,oB],cnt), pct:Math.round(wrong*100/cnt), wrong };
        }

        // South runway: SVG x=62-1177, y=145-167 → CMP x=68-1283, y=147-170
        // Currently fill=#ffffff (255). Simulate changing to various greys.
        const sRwy = {};
        for (const [label, to] of [
          ['215', [215,215,215]], ['220', [220,220,220]], ['225', [225,225,225]],
          ['228', [228,228,228]], ['230', [230,230,230]], ['235', [235,235,235]],
          ['240', [240,240,240]],
        ]) {
          sRwy[label] = simColorChange(68, 147, 1283, 170, 255, 255, 255, ...to);
        }

        // North runway: SVG x=20-1120, y=62-84 → CMP x=22-1222, y=63-85
        // Currently fill=#efefef (239,239,239). Simulate changing to various greys.
        const nRwy = {};
        for (const [label, to] of [
          ['215', [215,215,215]], ['220', [220,220,220]], ['225', [225,225,225]],
          ['230', [230,230,230]], ['235', [235,235,235]],
        ]) {
          nRwy[label] = simColorChange(22, 63, 1222, 85, 239, 239, 239, ...to);
        }

        // Row scan of south runway at y=157 (center) to see OUR vs REF
        function rowScan(y, x0, x1, step=10) {
          const pts=[];
          for(let x=x0; x<x1; x+=step) {
            const i=(y*W+x)*4;
            pts.push({x,svgX:Math.round(x/1.091),
              ref:[refPx.data[i],refPx.data[i+1],refPx.data[i+2]],
              our:[ourPx.data[i],ourPx.data[i+1],ourPx.data[i+2]]});
          }
          return pts;
        }
        const sRwyRow = rowScan(158, 68, 1283, 30); // CMP y=158 = center south runway

        // r0 cells for north runway
        const r0cells = {};
        for (let c=0; c<13; c++) r0cells[`r0c${c}`] = sampleCell(c*101,0,(c+1)*101,98);

        // r1 cells
        const r1cells = {};
        for (let c=0; c<13; c++) r1cells[`r1c${c}`] = sampleCell(c*101,98,(c+1)*101,196);

        // Also: simulate changing south runway to 235 (matching #efefef of north runway)
        const sRwyToEfef = simColorChange(68, 147, 1283, 170, 255, 255, 255, 239, 239, 239);

        // Simulate: BOTH runways set to 220
        const bothRwy220 = {
          north: simColorChange(22, 63, 1222, 85, 239, 239, 239, 220, 220, 220),
          south: simColorChange(68, 147, 1283, 170, 255, 255, 255, 220, 220, 220),
        };

        resolve({ sRwy, nRwy, sRwyRow, r0cells, r1cells, sRwyToEfef, bothRwy220 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + rgb.map(v => v.toString(16).padStart(2,'0')).join('');

console.log('\n=== South runway color change sims ===');
for (const [k,v] of Object.entries(result.sRwy)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== North runway color change sims ===');
for (const [k,v] of Object.entries(result.nRwy)) console.log(`  ${k}: ${JSON.stringify(v)}`);

console.log('\n=== South runway → #efefef (239) ===');
console.log(JSON.stringify(result.sRwyToEfef));

console.log('\n=== Both runways → 220 ===');
console.log('north:', JSON.stringify(result.bothRwy220.north));
console.log('south:', JSON.stringify(result.bothRwy220.south));

console.log('\n=== r0 cells (north runway area) ===');
for (const [k,v] of Object.entries(result.r0cells)) if (v.pct > 5) console.log(`  ${k}: REF:${v.refAvg} OUR:${v.ourAvg} ${v.pct}% (${v.wrong})`);

console.log('\n=== r1 cells (south runway area) ===');
for (const [k,v] of Object.entries(result.r1cells)) if (v.pct > 5) console.log(`  ${k}: REF:${v.refAvg} OUR:${v.ourAvg} ${v.pct}% (${v.wrong})`);

console.log('\n=== South runway row y=158 (center) ===');
for(const p of result.sRwyRow) console.log(`  x=${p.x}(svg${p.svgX}) OUR:${fmt(p.our)} REF:${fmt(p.ref)}`);

await browser.close();
