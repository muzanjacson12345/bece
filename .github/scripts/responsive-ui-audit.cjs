'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE = (process.env.SITE_URL || 'https://muzanjacson12345.github.io/bece').replace(/\\/+$/, '');
const EXPECTED_VIEWPORT = 'content="width=device-width, initial-scale=1, viewport-fit=cover"';
const ROUTES = [
  { name: 'home', hash: '#/', screen: 'home' },
  { name: 'practice', hash: '#/practice', screen: 'setup' },
  { name: 'friends', hash: '#/friends', screen: 'friends' },
  { name: 'notes', hash: '#/notes', screen: 'notes' },
  { name: 'essays', hash: '#/essays', screen: 'essays' },
];
const VIEWPORTS = [
  { name: 'phone-320', width: 320, height: 780, mobile: true },
  { name: 'phone-360', width: 360, height: 800, mobile: true },
  { name: 'phone-390', width: 390, height: 844, mobile: true },
  { name: 'phone-430', width: 430, height: 932, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'laptop-1024', width: 1024, height: 768, mobile: false },
  { name: 'desktop-1366', width: 1366, height: 900, mobile: false },
  { name: 'wide-1920', width: 1920, height: 1080, mobile: false },
];

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForLatestDeployment() {
  for (let attempt = 1; attempt <= 24; attempt++) {
    try {
      const response = await fetch(`${BASE}/?ui-audit=${Date.now()}`, { cache: 'no-store' });
      const html = await response.text();
      if (response.ok && html.includes(EXPECTED_VIEWPORT)) return;
    } catch {}
    console.log(`Waiting for the latest GitHub Pages deployment (${attempt}/24)…`);
    await pause(10000);
  }
  throw new Error('The updated GitHub Pages version did not appear within four minutes.');
}

async function main() {
  fs.mkdirSync('artifacts/ui-audit/screenshots', { recursive: true });
  await waitForLatestDeployment();

  const browser = await chromium.launch({ headless: true });
  const report = {
    site: BASE,
    createdAt: new Date().toISOString(),
    expectedRoutes: ROUTES.length,
    viewportCount: VIEWPORTS.length,
    screenshots: [],
    checks: [],
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    failures: [],
  };

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.mobile ? 2 : 1,
        isMobile: viewport.mobile,
        hasTouch: viewport.mobile,
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      });
      const page = await context.newPage();

      page.on('pageerror', error => report.pageErrors.push({
        viewport: viewport.name, message: String(error),
      }));
      page.on('console', message => {
        if (message.type() === 'error') report.consoleErrors.push({
          viewport: viewport.name, message: message.text().slice(0, 500),
        });
      });
      page.on('requestfailed', request => report.failedRequests.push({
        viewport: viewport.name, url: request.url().slice(0, 300),
        error: request.failure()?.errorText || 'request failed',
      }));

      for (const route of ROUTES) {
        const target = `${BASE}/${route.hash}`;
        try {
          await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForFunction(
            expected => document.body?.dataset?.screen === expected,
            route.screen,
            { timeout: 30000 }
          );
          await page.waitForTimeout(450);

          const diagnostics = await page.evaluate(() => {
            const root = document.documentElement;
            const body = document.body;
            const active = [...document.querySelectorAll('.screen')].find(node => !node.hidden);
            const viewportMeta = document.querySelector('meta[name="viewport"]')?.content || '';
            const horizontalOverflow = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;

            const outOfBounds = [];
            for (const node of document.querySelectorAll('body *')) {
              if (outOfBounds.length >= 12 || node.closest('[hidden]')) continue;
              const style = getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden') continue;
              const rect = node.getBoundingClientRect();
              if (rect.width < 1 || rect.height < 1) continue;
              const scrollParent = node.closest(
                '.topic-list,.chip-row,.adm-subs,.note-table,.table-scroll,.f-tabs,.board-seg,.segmented,[data-horizontal-scroll]'
              );
              if (!scrollParent && (rect.left < -2 || rect.right > window.innerWidth + 2)) {
                outOfBounds.push({
                  tag: node.tagName.toLowerCase(),
                  className: String(node.className || '').slice(0, 90),
                  left: Math.round(rect.left), right: Math.round(rect.right),
                  width: Math.round(rect.width),
                });
              }
            }

            const clipped = [];
            for (const node of document.querySelectorAll('body *')) {
              if (clipped.length >= 12 || node.closest('[hidden]')) continue;
              const style = getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden') continue;
              if (!['hidden', 'clip'].includes(style.overflowY)) continue;
              if (node.clientHeight < 20 || node.scrollHeight <= node.clientHeight + 8) continue;
              if (node.matches('input,textarea,select,pre')) continue;
              clipped.push({
                tag: node.tagName.toLowerCase(),
                className: String(node.className || '').slice(0, 90),
                clientHeight: node.clientHeight,
                scrollHeight: node.scrollHeight,
              });
            }

            return {
              screen: body.dataset.screen || null,
              activeScreenId: active?.id || null,
              viewportWidth: window.innerWidth,
              documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
              horizontalOverflow,
              viewportMeta,
              zoomDisabled: /user-scalable\\s*=\\s*no|max(?:imum)?-scale\\s*=\\s*1(?:\\.0)?/i.test(viewportMeta),
              outOfBounds,
              clipped,
              title: document.title,
            };
          });

          const key = `${viewport.name}/${route.name}`;
          report.checks.push({ key, ...diagnostics });
          if (diagnostics.screen !== route.screen) {
            report.failures.push(`${key}: expected screen ${route.screen}, found ${diagnostics.screen}`);
          }
          if (diagnostics.horizontalOverflow > 2) {
            report.failures.push(`${key}: document has ${diagnostics.horizontalOverflow}px horizontal overflow`);
          }
          if (diagnostics.zoomDisabled) report.failures.push(`${key}: mobile zoom is disabled by the viewport meta tag`);

          const screenshot = path.join('artifacts/ui-audit/screenshots', viewport.name, `${route.name}.png`);
          fs.mkdirSync(path.dirname(screenshot), { recursive: true });
          await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
          report.screenshots.push(screenshot);
          console.log(`Captured ${key} — ${diagnostics.viewportWidth}px wide, overflow ${diagnostics.horizontalOverflow}px`);
        } catch (error) {
          report.failures.push(`${viewport.name}/${route.name}: ${String(error)}`);
          const fallback = path.join('artifacts/ui-audit/screenshots', viewport.name, `${route.name}-error.png`);
          try {
            fs.mkdirSync(path.dirname(fallback), { recursive: true });
            await page.screenshot({ path: fallback, fullPage: true, animations: 'disabled' });
            report.screenshots.push(fallback);
          } catch {}
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync('artifacts/ui-audit/report.json', JSON.stringify(report, null, 2));
  console.log(`Saved ${report.screenshots.length} screenshots.`);
  console.log(`Page errors: ${report.pageErrors.length}; console errors: ${report.consoleErrors.length}; failed requests: ${report.failedRequests.length}`);
  console.log(`Layout failures: ${report.failures.length}`);
  if (report.failures.length) {
    for (const failure of report.failures) console.error(`FAIL: ${failure}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
