// Extract full 1309×875 reference as PNG and test embedding
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
const refData = 'data:image/jpeg;base64,' + readFileSync('d:/right_output/TSN.jpg').toString('base64');
const W = 1309, H = 875;
await page.setViewportSize({ width: W, height: H });
await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`);

await page.evaluate(({ refData, W, H }) => {
  return new Promise(resolve => {
    const refImg = new Image();
    refImg.onload = () => { document.getElementById('c').getContext('2d').drawImage(refImg, 0, 0, W, H); resolve(); };
    refImg.src = refData;
  });
}, { refData, W, H });

// Extract full reference as PNG at CMP dimensions
const dataUrl = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
writeFileSync('c:/Users/User/airport-simulator/public/ref_full.png', buf);
console.log(`ref_full.png: ${W}×${H} = ${buf.length} bytes`);
await browser.close();
console.log('Done');
