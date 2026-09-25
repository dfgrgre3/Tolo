import { chromium } from '@playwright/test';
const browser = await chromium.launch();
// worst case: forced ultra-lite signals (progress widget would be disabled client-side)
const ctx = await browser.newContext();
await ctx.addInitScript(() => localStorage.setItem('tolo-device-signals', JSON.stringify({ score: 5, gpuType: 'software', effectiveType: '2g', recommended: 'ultra-lite' })));
const page = await ctx.newPage();
let errs = [];
page.on('console', m => { if (/Hydration failed/i.test(m.text())) errs.push(1); });
page.on('pageerror', e => { if (/Hydration/i.test(String(e))) errs.push(1); });
await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 55000 }).catch(()=>{});
await page.waitForTimeout(4000);
console.log('ultra-lite seeded => hydrationErrors:', errs.length, '| mode:', await page.evaluate(() => document.documentElement.getAttribute('data-perf-mode')));
await browser.close();
