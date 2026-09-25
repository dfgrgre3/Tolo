import { chromium } from '@playwright/test';
const browser = await chromium.launch();

async function run(label, seed) {
  const ctx = await browser.newContext();
  if (seed) {
    await ctx.addInitScript((s) => { localStorage.setItem('tolo-device-signals', JSON.stringify(s)); }, seed);
  }
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { const t = m.text(); if (/Hydration failed/i.test(t)) errs.push(t.slice(0, 300)); });
  page.on('pageerror', e => { if (/Hydration/i.test(String(e))) errs.push('pageerror: ' + String(e).slice(0, 200)); });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
  await page.waitForTimeout(4000);
  const mode = await page.evaluate(() => ({
    perfMode: document.documentElement.getAttribute('data-perf-mode'),
    signals: !!localStorage.getItem('tolo-device-signals'),
    hasProgressBar: !!document.querySelector('[data-reading-progress], .reading-progress'),
  })).catch(e => ({ err: e.message }));
  console.log(label, '=> hydrationErrors:', errs.length, '| mode:', JSON.stringify(mode));
  await ctx.close();
}

await run('A: fresh browser (no signals)', null);
await run('B: seeded performance signals', { score: 95, gpuType: 'hardware', effectiveType: '4g', recommended: 'performance', deviceMemory: 8, hardwareConcurrency: 8, downlink: 10, rtt: 20, saveData: false, gpuRenderer: 'RTX', cpuBenchMs: 50, isMobile: false, isTablet: false, isLowEnd: false, isMidRange: false, isHighEnd: true, reducedData: false, reducedMotion: false, lowBattery: false, osName: 'Windows', browserName: 'Chrome' });
await browser.close();
