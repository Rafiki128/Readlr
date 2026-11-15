import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { interruptNow, leave, SPEAKER_GAP_MS, stopSpeaker, waitTurn } from '../src/hooks/speaker.ts';

test('automatic lines play one at a time with a short pause between them', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  stopSpeaker();
  const order: string[] = [];
  const first = await waitTurn({}, () => {});
  order.push('first');
  const second = waitTurn({}, () => {}).then(release => { order.push('second'); return release; });
  await Promise.resolve();
  assert.deepEqual(order, ['first']);
  first();
  t.mock.timers.tick(SPEAKER_GAP_MS - 1);
  await Promise.resolve();
  assert.deepEqual(order, ['first']);
  t.mock.timers.tick(1);
  (await second)();
  assert.deepEqual(order, ['first', 'second']);
});

test('a tapped sound stops the current line and drops the waiting ones', async () => {
  stopSpeaker();
  let stopped = 0;
  waitTurn({}, () => { stopped++; });
  const waiting = waitTurn({}, () => {});
  const release = interruptNow({}, () => {});
  assert.equal(stopped, 1);
  await assert.rejects(waiting, { name: 'AbortError' });
  release();
});

test('a closed screen loses its waiting lines and frees its turn', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  stopSpeaker();
  const screen = {};
  await waitTurn(screen, () => {});
  const mine = waitTurn(screen, () => {});
  let otherStarted = false;
  const other = waitTurn({}, () => {}).then(release => { otherStarted = true; release(); });
  leave(screen);
  await assert.rejects(mine, { name: 'AbortError' });
  t.mock.timers.tick(SPEAKER_GAP_MS);
  await other;
  assert.equal(otherStarted, true);
});

test('releasing an old turn after being interrupted does not free the new one', async () => {
  stopSpeaker();
  const old = await waitTurn({}, () => {});
  interruptNow({}, () => {});
  old();
  let queued = false;
  const waiting = waitTurn({}, () => {}).then(() => { queued = true; });
  await Promise.resolve();
  assert.equal(queued, false);
  stopSpeaker();
  await assert.rejects(waiting, { name: 'AbortError' });
});

test('first-time tour and Book 1 guide wait for Milo to finish before moving on', () => {
  const tour = readFileSync(new URL('../src/app/components/ReadingWorldTour.tsx', import.meta.url), 'utf8');
  assert.match(tour, /className="reading-tour-next" disabled=\{heard!==stop\.id\}/);
  assert.match(tour, /reading-tour-skip/);
  const guide = readFileSync(new URL('../src/app/components/Book1Guide.tsx', import.meta.url), 'utf8');
  assert.match(guide, /book1-guide__ok" disabled=\{!heard\}/);
  assert.match(guide, /\(!step\.interactive \|\| !heard\) && <div className="book1-guide__shade book1-guide__shade--look"/);
});

const EXEMPT =['hooks/speaker.ts', 'hooks/backgroundMusic.ts', 'app/components/AdminStudy.tsx'];
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return name === 'dev' ? [] : sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

test('every child-facing sound goes through the shared speaker', () => {
  const root = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  for (const file of sources(root)) {
    const relative = file.slice(root.length + 1);
    if (EXEMPT.includes(relative)) continue;
    const source = readFileSync(file, 'utf8');
    if (/new Audio\(|speechSynthesis\.speak\(|current\?\.play\(\)/.test(source)) {
      assert.match(source, /from ['"][./]*(hooks\/)?speaker['"]/, `${relative} plays audio without the shared speaker`);
    }
  }
});
