// Diagnose why grey rect at y=240-265 causes regression.
// Compare current state (our_map_svg.png = 10.64%) with a grey rect version.
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

        const fmt = (rgb) => '#' + rgb.map(v=>v.toString(16).padStart(2,'0')).join('');

        // Sample a rectangle, collecting per-pixel OUR vs REF at y=244-270 (gap zone in CMP)
        // For each pixel in gap zone, check: if OUR -> grey(200), does diff improve or worsen?
        const GREY = 200;
        const gapY0=244, gapY1=270;

        let greyFixes=0, greyBreaks=0, greyNeutral=0;
        // Also track by column
        const byCols = Array(13).fill(null).map((_,c)=>({fixes:0,breaks:0,neutral:0,c}));

        const wrongBefore = []; // pixels currently wrong (diff>20)
        const wrongAfter  = []; // pixels that would become wrong with grey
        const newWrong    = []; // currently right, would become wrong
        const fixedWrong  = []; // currently wrong, would become right

        for (let y=gapY0; y<gapY1; y++) {
          for (let x=0; x<W; x++) {
            const i=(y*W+x)*4;
            const rR=refPx.data[i], rG=refPx.data[i+1], rB=refPx.data[i+2];
            const oR=ourPx.data[i], oG=ourPx.data[i+1], oB=ourPx.data[i+2];
            const diffBefore=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            const diffAfter=(Math.abs(rR-GREY)+Math.abs(rG-GREY)+Math.abs(rB-GREY))/3;
            const wasBad = diffBefore>20;
            const willBad = diffAfter>20;
            const col=Math.floor(x/101);
            if (wasBad && !willBad) { greyFixes++; fixedWrong.push({x,y,rR,rG,rB,oR,oG,oB,diffBefore:Math.round(diffBefore),diffAfter:Math.round(diffAfter)}); byCols[col].fixes++; }
            else if (!wasBad && willBad) { greyBreaks++; newWrong.push({x,y,rR,rG,rB,oR,oG,oB,diffBefore:Math.round(diffBefore),diffAfter:Math.round(diffAfter)}); byCols[col].breaks++; }
            else greyNeutral++;
          }
        }

        // Also analyze what OUR values look like in the gap zone by column
        const colStats = Array(13).fill(null).map((_,c)=>{
          let sumR=0,sumG=0,sumB=0,cnt=0;
          for (let y=gapY0; y<gapY1; y++) {
            for (let x=c*101; x<Math.min((c+1)*101,W); x++) {
              const i=(y*W+x)*4;
              sumR+=ourPx.data[i]; sumG+=ourPx.data[i+1]; sumB+=ourPx.data[i+2];
              cnt++;
            }
          }
          return { r:Math.round(sumR/cnt), g:Math.round(sumG/cnt), b:Math.round(sumB/cnt), cnt };
        });

        // Sample specific rows in gap zone
        function rowScan(y, x0, x1) {
          const pts=[];
          for(let x=x0; x<x1; x+=3) {
            const i=(y*W+x)*4;
            const rR=refPx.data[i],rG=refPx.data[i+1],rB=refPx.data[i+2];
            const oR=ourPx.data[i],oG=ourPx.data[i+1],oB=ourPx.data[i+2];
            const d=(Math.abs(rR-oR)+Math.abs(rG-oG)+Math.abs(rB-oB))/3;
            if(d>20) pts.push({x,svgX:Math.round(x/1.091),ref:[rR,rG,rB],our:[oR,oG,oB],diff:Math.round(d)});
          }
          return pts;
        }

        // Key rows within gap zone (CMP y=244-270)
        const r245 = rowScan(245, 0, W);
        const r250 = rowScan(250, 0, W);
        const r255 = rowScan(255, 0, W);
        const r260 = rowScan(260, 0, W);
        const r265 = rowScan(265, 0, W);

        resolve({ greyFixes, greyBreaks, greyNeutral, byCols, colStats, fixedWrong:fixedWrong.slice(0,20), newWrong:newWrong.slice(0,50), r245, r250, r255, r260, r265 });
      };
      ourImg.src = ourData;
    };
    refImg.src = refData;
  });
}, { refData, ourData, W, H });

const fmt = (rgb) => '#' + ([rgb[0],rgb[1],rgb[2]]).map(v=>v.toString(16).padStart(2,'0')).join('');

console.log(`\n=== Grey rect (#c8c8c8=200) effect on gap zone (CMP y=244-270) ===`);
console.log(`  Fixes (was wrong, now right): ${result.greyFixes}`);
console.log(`  Breaks (was right, now wrong): ${result.greyBreaks}`);
console.log(`  Neutral (no change): ${result.greyNeutral}`);
console.log(`  Net: ${result.greyFixes - result.greyBreaks} (positive=good)`);

console.log('\n=== Per-column breakdown ===');
for (const {c,fixes,breaks,neutral} of result.byCols) {
  const net=fixes-breaks;
  if(fixes>0||breaks>0) console.log(`  c${c}: fixes=${fixes} breaks=${breaks} net=${net}`);
}

console.log('\n=== OUR avg color in gap zone by column ===');
for(let c=0; c<13; c++) {
  const s=result.colStats[c];
  console.log(`  c${c}: OUR_avg=${fmt([s.r,s.g,s.b])}`);
}

console.log('\n=== First 20 sample "breaks" (was right, becomes wrong with grey) ===');
for(const p of result.newWrong.slice(0,20)) {
  console.log(`  CMP(${p.x},${p.y}) svgX≈${Math.round(p.x/1.091)}: REF=${fmt([p.rR,p.rG,p.rB])} OUR=${fmt([p.oR,p.oG,p.oB])} before=${p.diffBefore} after=${p.diffAfter}`);
}

console.log('\n=== Row y=245 wrong ===');
for(const p of result.r245) console.log(`  x=${p.x} svgX≈${p.svgX}: REF=${fmt(p.ref)} OUR=${fmt(p.our)} diff=${p.diff}`);

console.log('\n=== Row y=250 wrong ===');
for(const p of result.r250) console.log(`  x=${p.x} svgX≈${p.svgX}: REF=${fmt(p.ref)} OUR=${fmt(p.our)} diff=${p.diff}`);

console.log('\n=== Row y=255 wrong ===');
for(const p of result.r255) console.log(`  x=${p.x} svgX≈${p.svgX}: REF=${fmt(p.ref)} OUR=${fmt(p.our)} diff=${p.diff}`);

console.log('\n=== Row y=260 wrong ===');
for(const p of result.r260) console.log(`  x=${p.x} svgX≈${p.svgX}: REF=${fmt(p.ref)} OUR=${fmt(p.our)} diff=${p.diff}`);

console.log('\n=== Row y=265 wrong ===');
for(const p of result.r265) console.log(`  x=${p.x} svgX≈${p.svgX}: REF=${fmt(p.ref)} OUR=${fmt(p.our)} diff=${p.diff}`);

await browser.close();
