import { SOUND_CARDS, type ReadingTask } from './aralCurriculum.ts';

export type HelpHint = 'hear_point' | 'glow_tile' | 'mouth_tip' | 'fewer_choices' | 'hear_story' | 'picture' | 'hear_word' | 'show_me';

// Two gentle hints, then a last step that shows or says the answer.
export function helpLadder(task: ReadingTask, { train = false } = {}): HelpHint[] {
  if (task.kind === 'build') return train ? ['hear_word', 'mouth_tip', 'show_me'] : ['hear_point', 'glow_tile', 'show_me'];
  if (task.kind === 'meaning') return ['hear_story', 'fewer_choices', 'show_me'];
  if (task.kind === 'read') return ['picture', 'mouth_tip', 'hear_word'];
  return ['mouth_tip', 'fewer_choices', 'show_me'];
}

// These tasks lock their choices until the word is heard, so a hint must play it first.
export function hintNeedsWord(task: ReadingTask): boolean {
  return task.kind === 'repair' || task.kind === 'change' || task.kind === 'listen';
}

// The sound-card cue for the missing sound, or for the first sound when nothing is missing.
export function mouthTip(task: ReadingTask): string | null {
  const index = task.kind === 'repair' || task.kind === 'change' ? task.missing : 0;
  const letter = task.word[index];
  if (!'aeiou'.includes(letter)) return SOUND_CARDS.find(card => card.category === 'consonants' && card.letter === letter)?.cue ?? null;
  const long = /([aeiou])[^aeiou]e$/.exec(task.word)?.[1] ?? (task.word.includes('ee') ? 'e' : null);
  return SOUND_CARDS.find(card => long ? card.category === 'long' && card.letter === long : card.category === 'short' && card.letter === letter)?.cue ?? null;
}

// A wrong choice the child already tried fades first, so two real choices remain; the answer never fades.
export function fadedChoice(choices: readonly string[], answer: string, tried: readonly string[] = []): string | null {
  return choices.find(choice => choice !== answer && tried.includes(choice)) ?? choices.find(choice => choice !== answer) ?? null;
}

// Glow or fade mark for one choice; marks clear once the word is solved.
export function choiceHintClass(used: readonly HelpHint[], choices: readonly string[], answer: string, choice: string, done: boolean, tried: readonly string[] = []): 'is-hint' | 'is-faded' | undefined {
  if (done) return undefined;
  if (used.includes('show_me') && choice === answer) return 'is-hint';
  return used.includes('fewer_choices') && choice === fadedChoice(choices, answer, tried) ? 'is-faded' : undefined;
}

// Tile ids that spell the word left to right, using each tile once.
export function showMeOrder(word: string, tiles: readonly { letter: string; id: number }[]): number[] {
  const order: number[] = [];
  for (const letter of word) {
    const tile = tiles.find(item => item.letter === letter && !order.includes(item.id));
    if (tile) order.push(tile.id);
  }
  return order;
}

// Evidence flags for the hints used so far, matching the attempt record fields.
export function helpEvidence(task: ReadingTask, used: number, options: { train?: boolean } = {}) {
  const hints = helpLadder(task, options).slice(0, used);
  return {
    hintCount: hints.length,
    // A picture scene line is disclosed through the heard flag when one plays.
    modelExposed: hints.some(hint => hint === 'hear_point' || hint === 'hear_word'),
    answerExposed: hints.some(hint => hint === 'glow_tile' || hint === 'show_me'),
    reducedChoices: hints.includes('fewer_choices'),
  };
}

export function missLine(): string {
  return 'Good try! Tap the light for help.';
}

export function hintLine(hint: HelpHint, task: ReadingTask): string {
  if (hint === 'mouth_tip') return mouthTip(task) ?? 'Listen to the first sound.';
  if (hint === 'show_me') return task.kind === 'build' ? 'Watch me first. Then you try.' : 'Tap the glowing one.';
  return ({ hear_point: 'Listen. Start at the glowing space.', glow_tile: 'The glowing letter comes next.', fewer_choices: 'I took one away. Try again.', hear_story: 'Listen to the little story.', picture: 'Look at the picture.', hear_word: 'Listen, then say it with me.' } as const)[hint];
}
