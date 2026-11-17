'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE = (process.env.SITE_URL || 'https://muzanjacson12345.github.io/bece').replace(/\/+$/, '');
const EXPECTED_VIEWPORT = 'content="width=device-width, initial-scale=1, viewport-fit=cover"';
const EXPECTED_BUILD = 'mobile-subject-picker-polish-2026-11-17-r1';
const ROUTES = [
  { name: 'home', hash: '#/', screen: 'home' },
  { name: 'practice', hash: '#/practice', screen: 'setup' },
  { name: 'friends', hash: '#/friends', screen: 'friends' },
  { name: 'duels', hash: '#/duels', screen: 'duels' },
  { name: 'notes', hash: '#/notes', screen: 'notes' },
  { name: 'essays', hash: '#/essays', screen: 'notes' },
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
      if (response.ok && html.includes(EXPECTED_VIEWPORT) && html.includes(`<meta name="bece-build" content="${EXPECTED_BUILD}">`)) return;
    } catch {}
    console.log(`Waiting for the latest GitHub Pages deployment (${attempt}/24)…`);
    await pause(10000);
  }
  throw new Error(`GitHub Pages did not publish build ${EXPECTED_BUILD} within four minutes.`);
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
    staffPanelChecks: [],
    pageErrors: [],
    consoleErrors: [],
    httpErrors: [],
    loadingTimeouts: [],
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
        viewport: viewport.name, message: String(error), stack: error.stack || '',
      }));
      page.on('console', message => {
        if (message.type() === 'error') report.consoleErrors.push({
          viewport: viewport.name, message: message.text().slice(0, 500),
        });
      });
      page.on('response', response => {
        if (response.status() >= 400) report.httpErrors.push({
          viewport: viewport.name, status: response.status(),
          url: response.url().slice(0, 500),
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
          await page.locator('#ann-pop button').filter({ hasText: 'Got it' }).click({ timeout: 1500 }).catch(() => {});
          if (route.screen === 'friends') {
            try {
              await page.waitForFunction(() => {
                const host = document.querySelector('#friends-body');
                return !host || !host.querySelector('.skeleton-wrap');
              }, null, { timeout: 10000 });
            } catch {
              report.loadingTimeouts.push(`${viewport.name}/friends remained in its loading state`);
            }
          }
          await page.waitForTimeout(650);

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
              zoomDisabled: /user-scalable\s*=\s*no|max(?:imum)?-scale\s*=\s*1(?:\.0)?/i.test(viewportMeta),
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

          // Close an owner announcement overlay before exercising the controls beneath it.
          const announcementDismiss = page.getByRole('button', { name: 'Got it', exact: true });
          if (await announcementDismiss.isVisible().catch(() => false)) {
            await announcementDismiss.click({ timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(150);
          }

          // Check and capture the last Practice subject at every responsive width.
          if (route.screen === 'setup') {
            const countOne = page.locator('#quiz-subject-count button[data-subject-count="1"]');
            const countTwo = page.locator('#quiz-subject-count button[data-subject-count="2"]');
            const countMultiple = page.locator('#quiz-subject-count button[data-subject-count="multiple"]');
            if (await page.locator('#quiz-subject-count button').count() !== 6) {
              report.failures.push(`${viewport.name}/practice: expected six compact subject-count choices`);
            }
            // Prove that a learner can replace the default subject with a different single subject.
            await countOne.click();
            const social = page.locator('[data-setup-sub="social"]');
            const maths = page.locator('[data-setup-sub="maths"]');
            await social.click();
            if (await page.locator('[data-setup-sub][aria-pressed="true"]').count() !== 0 ||
                !(await page.locator('#setup-start').isDisabled())) {
              report.failures.push(`${viewport.name}/practice: a one-subject choice must allow an empty intermediate selection`);
            }
            await maths.click();
            if (await maths.getAttribute('aria-pressed') !== 'true' ||
                await page.locator('[data-setup-sub][aria-pressed="true"]').count() !== 1 ||
                await page.locator('#setup-start').isDisabled()) {
              report.failures.push(`${viewport.name}/practice: choose-one subject selection did not enforce exactly one`);
            }
            // Two subjects: the Start button must remain disabled until the second is selected.
            await countTwo.click();
            if (!(await page.locator('#setup-start').isDisabled())) {
              report.failures.push(`${viewport.name}/practice: choose-two should wait for the second subject`);
            }
            await page.locator('[data-setup-sub="arts"]').click();
            if (await page.locator('[data-setup-sub][aria-pressed="true"]').count() !== 2 ||
                await page.locator('#setup-start').isDisabled()) {
              report.failures.push(`${viewport.name}/practice: choose-two did not enable Start at exactly two subjects`);
            }
            // Multiple means any two or more subjects, not only all subjects.
            await countMultiple.click();
            await page.locator('[data-setup-sub="integratedScience"]').click();
            if (await page.locator('[data-setup-sub][aria-pressed="true"]').count() !== 3 ||
                await page.locator('#setup-start').isDisabled()) {
              report.failures.push(`${viewport.name}/practice: Multiple must allow any selection of at least two subjects`);
            }
            const subjectShot = path.join('artifacts/ui-audit/screenshots', viewport.name, 'practice-multi-subject.png');
            await page.screenshot({ path: subjectShot, fullPage: true, animations: 'disabled' });
            report.screenshots.push(subjectShot);
          }

          if (route.screen === 'duels') {
            const duelCreate = page.locator('.duel-modes button').filter({ hasText: 'Create' });
            await duelCreate.click({ timeout: 12000 });
            const countTwo = page.locator('.duel-create-pane .duel-subject-count button[data-count="2"]');
            const countMultiple = page.locator('.duel-create-pane .duel-subject-count button[data-count="multiple"]');
            await countTwo.waitFor({ state: 'visible', timeout: 12000 });
            if (await page.locator('.duel-create-pane .duel-subject-count button').count() !== 6) {
              report.failures.push(`${viewport.name}/duels: expected six compact subject-count choices`);
            }
            if (await page.locator('.duel-create-pane #duel-create-button').count()) {
              // Current markup does not require a fixed ID; use the create-pane button below.
            }
            const createDuel = page.locator('.duel-create-pane > button.btn-primary');
            await countTwo.click();
            if (!(await createDuel.isDisabled())) {
              report.failures.push(`${viewport.name}/duels: choose-two should wait for the second subject`);
            }
            await page.locator('.duel-subject-picks button[data-subject="arts"]').click();
            if (await page.locator('.duel-subject-picks button[aria-pressed="true"]').count() !== 2 ||
                await createDuel.isDisabled()) {
              report.failures.push(`${viewport.name}/duels: choose-two did not enable creation at exactly two subjects`);
            }
            await countMultiple.click();
            await page.locator('.duel-subject-picks button[data-subject="integratedScience"]').click();
            if (await page.locator('.duel-subject-picks button[aria-pressed="true"]').count() !== 3 ||
                await createDuel.isDisabled()) {
              report.failures.push(`${viewport.name}/duels: Multiple must allow any two or more subjects`);
            }
            const duelShot = path.join('artifacts/ui-audit/screenshots', viewport.name, 'duels-subject-picker.png');
            await page.screenshot({ path: duelShot, fullPage: true, animations: 'disabled' });
            report.screenshots.push(duelShot);
          }

          if (route.screen === 'home') {
            for (const key of ['social', 'arts', 'maths', 'computing', 'rme', 'integratedScience', 'french', 'careerTechnology']) {
              const countText = await page.locator(`[data-count="${key}"]`).textContent();
              if (!/200 questions/.test(countText || '')) {
                report.failures.push(`${viewport.name}/home: ${key} does not show its 200-question bank`);
              }
            }
            for (const key of ['social', 'arts', 'maths', 'computing', 'rme', 'integratedScience', 'french', 'careerTechnology']) {
              if (await page.locator(`#flash-subject option[value="${key}"]`).count() !== 1) {
                report.failures.push(`${viewport.name}/home: ${key} is missing from the flashcard subject selector`);
              }
            }
          }

          if (route.name === 'notes') {
            for (const key of ['social', 'arts', 'maths', 'computing', 'rme', 'integratedScience', 'french', 'careerTechnology']) {
              await page.locator(`[data-notes-sub="${key}"]`).click();
              const noteCount = await page.locator('#notes-sidebar .topic-item').count();
              if (noteCount < 1) {
                report.failures.push(`${viewport.name}/notes: ${key} has no visible revision notes`);
              }
            }
          }

          if (route.name === 'essays') {
            const essayQuestion = page.locator('#sb-q');
            if (!(await essayQuestion.isVisible()) || !(await essayQuestion.textContent())?.trim()) {
              report.failures.push(`${viewport.name}/essays: the essay question content did not appear`);
            }
          }

          // Visit all Friends tabs; a tab can be present but its content can still overflow.
          if (route.screen === 'friends') {
            const gotIt = page.getByRole('button', { name: 'Got it', exact: true });
            if (await gotIt.isVisible().catch(() => false)) {
              await gotIt.click().catch(() => {});
              await page.waitForTimeout(150);
            }
            const tabButtons = page.locator('.f-tabs > button');
            const tabCount = await tabButtons.count();
            const tabLayout = await page.evaluate(() => {
              const buttons = [...document.querySelectorAll('.f-tabs > button')];
              const tops = buttons.map(b => Math.round(b.getBoundingClientRect().top));
              return { count: buttons.length, rows: new Set(tops).size, keys: buttons.map(b => b.dataset.k) };
            });
            if (tabLayout.rows > 1) {
              report.failures.push(`${viewport.name}/friends: Friends tabs wrap onto ${tabLayout.rows} rows`);
            }
            for (let tabIndex = 0; tabIndex < tabCount; tabIndex++) {
              const tab = tabButtons.nth(tabIndex);
              const keyName = await tab.getAttribute('data-k');
              await tab.click();
              await page.waitForTimeout(250);
              const selectedKey = await page.locator('.f-tabs > button[aria-selected="true"]').getAttribute('data-k');
              if (selectedKey !== keyName) {
                report.failures.push(`${viewport.name}/friends: failed to open ${keyName} tab`);
              }
              const tabDiagnostics = await page.evaluate(() => ({
                width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
                viewport: window.innerWidth,
              }));
              if (tabDiagnostics.width - tabDiagnostics.viewport > 2) {
                report.failures.push(`${viewport.name}/friends-${keyName}: horizontal overflow ${tabDiagnostics.width - tabDiagnostics.viewport}px`);
              }
              const tabShot = path.join('artifacts/ui-audit/screenshots', viewport.name, `friends-${keyName}.png`);
              await page.screenshot({ path: tabShot, fullPage: true, animations: 'disabled' });
              report.screenshots.push(tabShot);
            }

            // Exercise all three Me sub-tabs and verify they remain a single row at phone widths.
            const meButton = page.locator('.f-tabs > button[data-k="me"]');
            if (await meButton.count()) {
              await meButton.click();
              await page.waitForTimeout(200);
              const profileTabs = page.locator('#cz-panel > .cz-tabs > button');
              const profileCount = await profileTabs.count();
              const profileLayout = await page.evaluate(() => {
                const buttons = [...document.querySelectorAll('#cz-panel > .cz-tabs > button')];
                const rects = buttons.map(b => b.getBoundingClientRect());
                const clipped = buttons.filter((b, i) => {
                  const range = document.createRange();
                  range.selectNodeContents(b);
                  const textRect = range.getBoundingClientRect();
                  const buttonRect = rects[i];
                  return textRect.width > 0 &&
                    (textRect.left < buttonRect.left - 1 || textRect.right > buttonRect.right + 1);
                }).map(b => b.textContent.trim());
                return {
                  count: buttons.length,
                  rows: new Set(rects.map(r => Math.round(r.top))).size,
                  widths: rects.map(r => Math.round(r.width)),
                  labels: buttons.map(b => b.textContent.trim()),
                  clipped,
                };
              });
              if (profileCount !== 3) {
                report.failures.push(`${viewport.name}/friends-me: expected 3 profile tabs, found ${profileCount}`);
              }
              if (profileLayout.rows > 1) {
                report.failures.push(`${viewport.name}/friends-me: Avatar, Theme and About me wrap onto ${profileLayout.rows} rows`);
              }
              if (profileLayout.clipped.length) {
                report.failures.push(`${viewport.name}/friends-me: profile tab labels are clipped: ${profileLayout.clipped.join(', ')}`);
              }
              const profilePanels = {
                avatar: '.cz-avatar-panel',
                theme: '.cz-theme-panel',
                about: '.cz-about-panel',
              };
              for (let profileIndex = 0; profileIndex < Math.min(profileCount, 3); profileIndex++) {
                const tab = profileTabs.nth(profileIndex);
                const tabId = (await tab.getAttribute('id') || '').replace('cz-tab-', '');
                await tab.click();
                await page.waitForTimeout(220);
                if (await tab.getAttribute('aria-selected') !== 'true') {
                  report.failures.push(`${viewport.name}/friends-me: failed to select ${tabId}`);
                }
                if (!profilePanels[tabId] || !(await page.locator(`#cz-panel ${profilePanels[tabId]}`).count())) {
                  report.failures.push(`${viewport.name}/friends-me: ${tabId} panel content did not appear`);
                }
                if (tabId === 'avatar' && !(await page.locator('#cz-panel .emoji-grid .emoji-pick').count())) {
                  report.failures.push(`${viewport.name}/friends-me: avatar choices did not render`);
                }
                if (tabId === 'theme' && await page.locator('#cz-panel .mode-seg button[data-mode]').count() !== 3) {
                  report.failures.push(`${viewport.name}/friends-me: Light/Dark/Auto controls did not render`);
                }
                if (tabId === 'about') {
                  if (!(await page.locator('#display-name').count()) || !(await page.locator('#bio-input').count())) {
                    report.failures.push(`${viewport.name}/friends-me: name or status-line editor is missing`);
                  }
                }
                const profileShot = path.join('artifacts/ui-audit/screenshots', viewport.name, `friends-me-${tabId}.png`);
                await page.screenshot({ path: profileShot, fullPage: true, animations: 'disabled' });
                report.screenshots.push(profileShot);
              }

              // Exercise both appearance modes without writing to any player document.
              const originalMode = await page.evaluate(() => document.documentElement.dataset.theme || 'light');
              const darkMode = page.locator('#cz-panel .mode-seg button[data-mode="dark"]');
              const lightMode = page.locator('#cz-panel .mode-seg button[data-mode="light"]');
              await page.locator('#cz-tab-theme').click();
              if (await darkMode.count() && await lightMode.count()) {
                await darkMode.click();
                await page.waitForTimeout(180);
                if (await page.evaluate(() => document.documentElement.dataset.theme) !== 'dark') {
                  report.failures.push(`${viewport.name}/friends-me: Dark mode control did not apply`);
                }
                if (['phone-390', 'desktop-1366'].includes(viewport.name)) {
                  const darkShot = path.join('artifacts/ui-audit/screenshots', viewport.name, 'friends-me-theme-dark.png');
                  await page.screenshot({ path: darkShot, fullPage: true, animations: 'disabled' });
                  report.screenshots.push(darkShot);
                }
                await lightMode.click();
                await page.waitForTimeout(180);
                if (await page.evaluate(() => document.documentElement.dataset.theme) === 'dark') {
                  report.failures.push(`${viewport.name}/friends-me: Light mode control did not apply`);
                }
                if (['phone-390', 'desktop-1366'].includes(viewport.name)) {
                  const lightShot = path.join('artifacts/ui-audit/screenshots', viewport.name, 'friends-me-theme-light.png');
                  await page.screenshot({ path: lightShot, fullPage: true, animations: 'disabled' });
                  report.screenshots.push(lightShot);
                }
                if (originalMode === 'dark') await darkMode.click();
                else await lightMode.click();
              }
            }

            // The audit browser has no staff login by default. When a staff session is available,
            // exercise each Owner/Admin section and save a real browser screenshot of it.
            const staffTab = page.locator('.f-tabs > button[data-k="admin"]');
            if (await staffTab.count()) {
              await staffTab.click();
              await page.waitForTimeout(250);
              const staffButtons = page.locator('.adm-subs > button');
              const staffCount = await staffButtons.count();
              for (let staffIndex = 0; staffIndex < staffCount; staffIndex++) {
                const staffButton = staffButtons.nth(staffIndex);
                const staffKey = await staffButton.getAttribute('data-k');
                await staffButton.click();
                await page.waitForTimeout(180);
                if (await staffButton.getAttribute('aria-selected') !== 'true') {
                  report.failures.push(`${viewport.name}/staff: failed to select ${staffKey}`);
                }
                const staffShot = path.join('artifacts/ui-audit/screenshots', viewport.name, `staff-${staffKey}.png`);
                await page.screenshot({ path: staffShot, fullPage: true, animations: 'disabled' });
                report.screenshots.push(staffShot);
              }
              report.staffPanelChecks.push({ viewport: viewport.name, available: true, tabCount: staffCount });
            } else {
              report.staffPanelChecks.push({ viewport: viewport.name, available: false, note: 'No staff session is present in the audit browser context.' });
            }
          }
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

  for (const error of report.pageErrors) report.failures.push(`${error.viewport}: uncaught browser exception: ${error.message}`);
  fs.writeFileSync('artifacts/ui-audit/report.json', JSON.stringify(report, null, 2));
  console.log(`Saved ${report.screenshots.length} screenshots.`);
  console.log(`Page errors: ${report.pageErrors.length}; console errors: ${report.consoleErrors.length}; failed requests: ${report.failedRequests.length}`);
  console.log(`Layout failures: ${report.failures.length}`);
  for (const failure of report.httpErrors) {
    try {
      if (new URL(failure.url).origin === new URL(BASE).origin) {
        report.failures.push(`${failure.viewport}: HTTP ${failure.status} ${failure.url}`);
      }
    } catch {}
  }
  for (const timeout of report.loadingTimeouts) report.failures.push(timeout);
  if (report.failures.length) {
    for (const failure of report.failures) console.error(`FAIL: ${failure}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
