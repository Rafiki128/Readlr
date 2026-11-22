import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = (name: string) => readFileSync(new URL(`../src/app/components/${name}`, import.meta.url), 'utf8');

test('book words without a picture use their spelling instead of an unrelated top', () => {
  const source = component('CvcArt.tsx');
  assert.match(source, /case 'mat':/);
  assert.match(source, /\[\.\.\.word\]\.map/);
  const library = component('CurriculumSoundLibrary.tsx');
  assert.match(library, /<ReadingAnchorArt word=\{word\}/);
  assert.match(component('ReadingAnchorArt.tsx'), /if \(!shapes\[word\]\) return <WordObject word=\{word\}/);
});

test('Camp scenery is contained by its complete scrolling content', () => {
  assert.match(component('SoundLearningCamp.tsx'), /<div className="camp-world-content">\s*<AdventureBackdrop/);
  assert.match(component('soundLearningCamp.css'), /camp-world-content\{[^}]*position:relative/);
  assert.match(component('soundLearningCamp.css'), /camp-world-content>\.adventure-backdrop\{height:100%/);
});

test('world and loading artwork share the detailed landmark illustrations', () => {
  const source = component('WorldLandmarkArt.tsx');
  for (const kind of ['camp', 'sound', 'progress', 'stickers', 'storybook', 'dojo', 'garden']) {
    assert.ok(source.includes(`'${kind}'`));
  }
  assert.match(component('WelcomeScreen.tsx'), /<WorldLandmarkArt kind="storybook"/);
  assert.match(component('AdventureArt.tsx'), /<WorldLandmarkArt kind=\{kind\}/);
});

test('the reading trail expands below home and collapses on upward scroll', () => {
  const source = component('ChronicleHome.tsx');
  const css = component('chronicleWorld.css');
  assert.match(source, /aria-expanded=\{trailOpen\} aria-controls="home-reading-trail" onClick=\{\(\)=>setTrailOpen\(open=>!open\)\}/);
  assert.match(source, /className="book-trail-reveal-inner" inert=\{!trailOpen\}/);
  assert.match(source, /event\.key!=='Escape'/);
  assert.match(source, /onClick=\{\(\)=>\{focusBook\(i\);setTrailOpen\(false\)/);
  assert.match(source, /home\.scrollTo\(\{top:home\.scrollHeight-home\.clientHeight/);
  assert.match(source, /furthestDown-home\.scrollTop>=24\)closeTrail\(\)/);
  assert.match(source, /home-trail-hint[^\n]+\n\s*<\/div>\s*<div className="book-trail-reveal"/);
  assert.match(css, /\.book-trail\{position:relative/);
  assert.match(css, /\.book-trail-reveal\{[^}]*grid-template-rows:0fr[^}]*transition:grid-template-rows/);
  assert.match(css, /prefers-reduced-motion:reduce[^\n]*book-trail-spark\{animation:none\}/);
});

test('admin overview uses book checkpoints and account curriculum activity', () => {
  const source = component('AdminDashboard.tsx');
  assert.match(source, /learner\.readingChapters\?\?0/);
  assert.match(source, /curriculum\.campPractices/);
  assert.match(source, /curriculum\.guidedStops/);
  assert.doesNotMatch(source, /stickerSummary|stageNames/);
  assert.match(source, /learner\.readingChapters != null/);
});
