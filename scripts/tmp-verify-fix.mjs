import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
let errs = [];
page.on('console', m => { if (/Hydration failed/i.test(m.text())) errs.push(m.text().slice(0,250)); });
page.on('pageerror', e => { if (/Hydration/i.test(String(e))) errs.push('pageerror: ' + String(e).slice(0,150)); });
await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(5000);
const info = await page.evaluate(() => ({
  perfMode: document.documentElement.getAttribute('data-perf-mode'),
  headerOk: !!document.querySelector('header[data-header-root]'),
  headerParentChildren: Array.from(document.querySelector('header[data-header-root]')?.parentElement?.children ?? []).map(c => c.tagName),
}));
console.log('fresh browser => hydrationErrors:', errs.length);
if (errs.length) console.log(errs.join('\n'));
console.log('info:', JSON.stringify(info));
await browser.close();
