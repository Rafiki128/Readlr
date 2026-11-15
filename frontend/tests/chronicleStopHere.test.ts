import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the trail marks the stop to play next with a glow and a Milo badge', () => {
  const world = readFileSync(new URL('../src/app/components/ChronicleBookWorld.tsx', import.meta.url), 'utf8');
  assert.match(world, /const hereId=nextStop\?\.id;/);
  assert.match(world, /stop\.id===hereId\?'is-here':''/);
  assert.match(world, /aria-current=\{stop\.id===hereId\?'step':undefined\}/);
  assert.match(world, /className="book-map-here" aria-hidden="true"><CharacterCompanion/);
  const css = readFileSync(new URL('../src/app/components/chroniclePages.css', import.meta.url), 'utf8');
  assert.match(css, /\.book-map-stop\.is-here \.book-map-token\{box-shadow:0 0 0 6px #ffd76a/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.book-map-stop\.is-here \.book-map-token\{animation:none\}/);
});
