import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
// Use a large viewport so the SVG is definitely visible
await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Force the SVG to exactly 1309×875 and position it at top-left
await page.evaluate(() => {
  const svg = document.querySelector('svg');
  if (svg) {
    svg.style.cssText = 'position:fixed!important;top:0!important;left:0!important;width:1309px!important;height:875px!important;z-index:9999!important;margin:0!important;padding:0!important;';
  }
});

// Screenshot just the SVG area at exactly 1309×875
await page.screenshot({
  clip: { x: 0, y: 0, width: 1309, height: 875 },
  path: 'd:/right_output/our_map_svg.png'
});

// Also full page
await page.screenshot({ path: 'd:/right_output/our_map.png', fullPage: false });

await browser.close();
console.log('Done');
