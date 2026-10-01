// Run against Vite with a Playwright module path as the first argument.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('auth_token', 'test-session'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const open = { mode: 'open', stage: null, message: '', surveyUrl: '' };
    let state = { policy: open, overrides: {}, revision: 0, updated_at: new Date().toISOString() };
    const writes = [];
    const journeyWrites = [];
    const savedProgress = { 1: 0, 2: 0, 3: 0 };
    let failStage2 = false;
    let role = 'admin';
    let conflict = false;
    let unavailable = false;
    await page.route('**/api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const pathname = url.pathname;
      let data = {};
      let status = 200;
      if (pathname.endsWith('/auth/profile')) data = { user: { id: 7, email: 'd.sabandal@admin.readlr.com', role, name: 'Test Admin' } };
      else if (pathname.endsWith('/admin/learners')) data = { learners: [{ id: 11, name: 'Test Student', email: 'test.student@example.com', avatar: '', grade: 1, createdAt: '2026-09-30T00:00:00Z', lastActivity: null, presence: { stage: 2, level: 7, screen: 'bridge-challenge', last_seen: new Date().toISOString() }, progress: [1,2,3].map(stageId => ({ stageId, completedLevels: savedProgress[stageId], totalLevels: 20, completionPercentage: savedProgress[stageId] * 5, lastUpdated: '2026-09-30' })) }] };
      else if (pathname.endsWith('/frames/me')) data = { frames: [] };
      else if (pathname.endsWith('/admin/classroom/me')) {
        status = unavailable ? 503 : 200;
        data = { policy: state.policy, revision: state.revision };
      } else if (pathname.endsWith('/admin/classroom')) {
        if (request.method() === 'PUT') {
          const body = request.postDataJSON();
          writes.push(body);
          if (conflict) { status = 409; data = { message: 'Controls changed in another admin session. Refresh before saving.' }; }
          else {
            if (body.target === 'class') state.policy = body.policy;
            else if (body.policy === null) delete state.overrides[body.target];
            else state.overrides[body.target] = body.policy;
            state.revision++;
            data = state;
          }
        } else data = state;
      } else if (pathname.endsWith('/learner/user/7')) data = { id: 15, name: 'Test Student', avatar: '' };
      else if (pathname.endsWith('/learner/me')) data = { learner: { id: 15 } };
      else if (pathname.endsWith('/progress/me')) data = { stages: [1,2,3].map(stage => ({ stage_id: stage + 100, stage_number: stage, completed_levels: savedProgress[stage], total_levels: 20 })) };
      else if (pathname.endsWith('/progress/me/stages/1') && request.method() === 'PUT') {
        if (state.policy.mode !== 'open' && !(state.policy.mode === 'stage' && state.policy.stage === 1)) {
          status = 403; data = { code: 'classroom_restricted' };
        } else {
          savedProgress[1] = Math.max(savedProgress[1], request.postDataJSON().completed_levels);
          data = { completed_levels: savedProgress[1], unlocked_frames: [] };
        }
      }
      else if (pathname.endsWith('/progress/me/journeys')) data = { journeys: [] };
      else if (/\/progress\/me\/journeys\/[23]$/.test(pathname) && request.method() === 'PUT') {
        const stage = Number(pathname.split('/').at(-1));
        journeyWrites.push(stage);
        if (state.policy.mode !== 'open' && !(state.policy.mode === 'stage' && state.policy.stage === stage)) {
          status = 403; data = { code: 'classroom_restricted' };
        } else if (stage === 2 && failStage2) { status = 500; data = { error: 'Temporary sync failure' }; }
        else {
          savedProgress[stage] = Math.max(savedProgress[stage], request.postDataJSON().completed);
          data = { journey: { ...request.postDataJSON(), stage_number: stage }, unlocked_frames: [] };
        }
      }
      await route.fulfill({ status, json: data });
    });
    page.on('dialog', dialog => dialog.accept());
    await page.goto('http://127.0.0.1:5173/admin/learners');
    await page.getByRole('button', { name: 'Classroom controls', exact: true }).click();
    await page.getByRole('heading', { name: 'Classroom controls' }).waitFor();
    await page.getByRole('combobox', { name: 'Access', exact: true }).click();
    await page.getByRole('option', { name: 'Unlock selected stages' }).click();
    await page.getByRole('checkbox', { name: 'Stage 1 Valley of Vowels' }).uncheck();
    await page.getByRole('checkbox', { name: 'Stage 2 Blending Bridges' }).check();
    await page.getByRole('button', { name: 'Apply controls' }).click();
    await page.getByRole('alertdialog').waitFor();
    await page.getByRole('button', { name: 'Keep current settings' }).click();
    assert.equal(writes.length, 0);
    await page.getByRole('button', { name: 'Apply controls' }).click();
    await page.getByRole('alertdialog').evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
    await page.getByRole('button', { name: 'Keep current settings' }).hover();
    assert.notEqual(await page.getByRole('button', { name: 'Keep current settings' }).evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
    await page.getByRole('button', { name: 'Confirm changes' }).hover();
    assert.equal(await page.getByRole('button', { name: 'Confirm changes' }).evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
    if (process.argv[3]) await page.screenshot({ path: path.join(process.argv[3], 'admin-confirm.png') });
    await page.getByRole('button', { name: 'Confirm changes' }).click();
    await page.getByRole('status').filter({ hasText: 'Applied.' }).waitFor();
    assert.equal(writes.at(-1).target, 'class');
    assert.deepEqual(writes.at(-1).policy.stages, [2]);
    await page.locator('.admin-target-list button').filter({ hasText: 'Test Student' }).click();
    await page.getByRole('combobox', { name: 'Access', exact: true }).click();
    await page.getByRole('option', { name: 'Pause activities' }).click();
    await page.getByRole('button', { name: 'Apply controls' }).click();
    await page.getByRole('button', { name: 'Confirm changes' }).click();
    await page.getByText('1 individual overrides. Revision 2.', { exact: false }).waitFor();
    assert.equal(state.overrides[11].mode, 'paused');
    await page.getByRole('combobox', { name: 'Access', exact: true }).click();
    await page.getByRole('option', { name: 'Use class setting' }).click();
    await page.getByRole('button', { name: 'Apply controls' }).click();
    await page.getByRole('button', { name: 'Confirm changes' }).click();
    await page.getByText('0 individual overrides. Revision 3.', { exact: false }).waitFor();
    assert.equal(writes.at(-1).policy, null);
    conflict = true;
    await page.getByRole('button', { name: 'Apply controls' }).click();
    await page.getByRole('button', { name: 'Confirm changes' }).click();
    await page.getByRole('status').filter({ hasText: 'another admin session' }).waitFor();
    assert.equal(state.revision, 3);
    if (process.argv[3]) await page.screenshot({ path: path.join(process.argv[3], 'admin-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 393, height: 852 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (process.argv[3]) await page.screenshot({ path: path.join(process.argv[3], 'admin-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Learner overview', exact: true }).click();
    await page.locator('.admin-access').filter({ hasText: 'Stages 2 unlocked' }).waitFor();
    if (process.argv[3]) await page.screenshot({ path: path.join(process.argv[3], 'admin-overview-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (process.argv[3]) await page.screenshot({ path: path.join(process.argv[3], 'admin-overview-desktop.png'), fullPage: true });
    role = 'learner'; state.policy = { ...open, mode: 'stages', stages: [2,3] };
    await page.evaluate(() => localStorage.setItem('readlr_introduction_v1_15', 'done'));
    await page.goto('http://127.0.0.1:5173/home');
    await page.getByRole('button', { name: 'Start Adventure' }).click();
    const stage2 = page.getByRole('button').filter({ hasText: 'Blending Bridges' });
    const stage3 = page.getByRole('button').filter({ hasText: 'CVC Kingdom' });
    await stage2.waitFor({ timeout: 5000 }).catch(async error => { console.error(errors, await page.locator('body').innerText()); throw error; });
    assert.equal(await stage2.isEnabled(), true);
    await stage3.waitFor({ timeout: 5000 }).catch(async error => { console.error(await page.locator('body').innerText()); throw error; });
    assert.equal(await stage3.isEnabled(), true);
    assert.equal(await page.getByRole('button').filter({ hasText: 'Valley of Vowels' }).isDisabled(), true);
    assert.deepEqual(savedProgress, { 1: 0, 2: 0, 3: 0 });
    state.policy = { ...open, mode: 'stages', stages: [1,2,3] };
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.getByRole('button', { name: 'Sound Library' }).click();
    await page.getByRole('heading', { name: 'Sound Library', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Your next activity is ready' }).count(), 0);
    state.policy = { ...state.policy, message: 'Try the bridges today.' };
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.getByRole('dialog', { name: 'A message from your teacher' }).waitFor();
    if (process.argv[3]) {
      await page.getByRole('dialog').evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
      await page.screenshot({ path: path.join(process.argv[3], 'classroom-message.png') });
    }
    await page.getByRole('button', { name: 'Got it!' }).click();
    await page.getByRole('dialog', { name: 'A message from your teacher' }).waitFor({ state: 'hidden' });
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    assert.equal(await page.getByRole('dialog', { name: 'A message from your teacher' }).count(), 0);
    state.policy = { ...open, mode: 'paused', message: 'Please wait for our class.' };
    await page.goto('http://127.0.0.1:5173/stages');
    await page.getByRole('dialog', { name: 'A message from your teacher' }).waitFor();
    await page.getByRole('button', { name: 'Got it!' }).click();
    await page.getByRole('dialog', { name: 'A message from your teacher' }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByText('Please wait for our class.').count(), 1);
    await page.getByRole('heading', { name: 'Time for a little break' }).waitFor();
    state.policy = { ...open, mode: 'survey', surveyUrl: 'https://forms.gle/test' };
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.getByRole('link', { name: 'Open check-in' }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Open check-in' }).getAttribute('href'), 'https://forms.gle/test');
    assert.equal(new URL(page.url()).hostname, '127.0.0.1');
    state.policy = { ...open, mode: 'stage', stage: 2 };
    // The existing screen is not a stage, so open an explicitly restricted stage route.
    await page.evaluate(() => {
      history.pushState({}, '', '/stage-1/chapters');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new Event('online'));
    });
    await page.getByRole('button', { name: 'Go to Stage 2' }).waitFor();
    await page.getByRole('button', { name: 'Go to Stage 2' }).click();
    await page.getByRole('button', { name: 'Go to Stage 2' }).waitFor({ state: 'hidden' });
    assert.match(page.url(), /stage-2/);
    unavailable = true;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.getByRole('heading', { name: 'Let us reconnect' }).waitFor();
    unavailable = false; state.policy = { ...open, mode: 'stage', stage: 3 };
    const savedStage3 = page.waitForResponse(response => response.url().endsWith('/progress/me/journeys/3') && response.status() === 200);
    await page.evaluate(() => {
      localStorage.setItem('readlr_bridge_v2_learner_15', JSON.stringify({ version: 3, training: [1], crossings: [] }));
      localStorage.setItem('readlr_cvc_magic_v1_15', JSON.stringify({ version: 1, completed: 1, jewels: 0 }));
      window.dispatchEvent(new CustomEvent('readlr:journey-changed', { detail: 15 }));
      window.dispatchEvent(new Event('online'));
    });
    await savedStage3;
    assert.deepEqual(journeyWrites.slice(-2), [2, 3]);
    state.policy = open; failStage2 = true;
    const completedStage3 = page.waitForResponse(response => response.url().endsWith('/progress/me/journeys/3') && response.status() === 200);
    await page.evaluate(() => {
      localStorage.setItem('readlr_progress_user_7', JSON.stringify({ 1: 20, 2: 20, 3: 20 }));
      localStorage.setItem('readlr_bridge_v2_learner_15', JSON.stringify({ version: 3, training: [1,2,3,4,5], crossings: Array.from({ length: 15 }, (_, i) => i + 1) }));
      localStorage.setItem('readlr_cvc_magic_v1_15', JSON.stringify({ version: 1, completed: 20, jewels: 3 }));
      window.dispatchEvent(new CustomEvent('readlr:journey-changed', { detail: 15 }));
    });
    await completedStage3;
    assert.equal(savedProgress[1], 20);
    assert.equal(savedProgress[3], 20);
    assert.equal(savedProgress[2], 0);
    failStage2 = false;
    const completedStage2 = page.waitForResponse(response => response.url().endsWith('/progress/me/journeys/2') && response.status() === 200);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await completedStage2;
    assert.deepEqual(savedProgress, { 1: 20, 2: 20, 3: 20 });
    role = 'admin';
    await page.goto('http://127.0.0.1:5173/admin/learners');
    await page.getByText('Stage 3: 20 / 20 - complete', { exact: true }).waitFor();
    assert.equal(await page.locator('.admin-completion strong').innerText(), '100%');
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    assert.equal(await page.locator('.admin-learner-row').count(), 1);
    await page.getByRole('textbox', { name: 'Search learners' }).fill('no matching name');
    await page.getByText('No matching learners', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Search learners' }).fill('');
    await page.getByRole('button', { name: 'Details for Test Student' }).click();
    await page.getByRole('heading', { name: 'Sticker collection' }).waitFor();
    await page.getByRole('button', { name: 'Manage Test Student' }).click();
    assert.match(await page.locator('.admin-editor-toolbar h3').innerText(), /Test Student/);
    await page.getByRole('combobox', { name: 'Access', exact: true }).click();
    await page.getByRole('option', { name: 'Unlock selected stages' }).click();
    await page.getByRole('button', { name: 'Unlock all stages' }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Stage 3 CVC Kingdom' }).isChecked(), true);
    await page.getByRole('button', { name: 'Discard edits' }).click();
    await page.getByRole('combobox', { name: 'Access', exact: true }).click();
    await page.getByRole('option', { name: 'Use class setting' }).click();
    assert.match(await page.getByRole('combobox', { name: 'Access', exact: true }).innerText(), /Use class setting/);
    await page.route('**/api/admin/learners', route => route.fulfill({ json: { learners: Array.from({ length: 18 }, (_, i) => ({
      id: i + 100, name: 'Learner ' + String(i + 1).padStart(2, '0'), email: 'learner' + i + '@example.com', avatar: '', grade: 1,
      createdAt: '2026-09-30', lastActivity: null, presence: null,
      progress: [1,2,3].map(stageId => ({ stageId, completedLevels: 20, totalLevels: 20, completionPercentage: 100, lastUpdated: '2026-09-30' })),
    })) } }));
    await page.getByRole('button', { name: 'Learner overview', exact: true }).click();
    await page.getByRole('button', { name: 'Refresh learners' }).click();
    await page.getByText('Page 1 of 2', { exact: true }).waitFor();
    assert.equal(await page.locator('.admin-learner-row').count(), 15);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    assert.equal(await page.locator('.admin-learner-row').count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('Admin controls, learner restrictions, all-stage completion backfill, failure retries and admin 100% display passed.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
