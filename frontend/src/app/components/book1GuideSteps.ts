export type GuideStepId = 'turn-page' | 'first-stop' | 'hear' | 'find-letter' | 'mic' | 'drag-letter' | 'sort-picture' | 'help';

export interface GuideStep {
  id: GuideStepId;
  target: string;
  line: string;
  gesture: 'tap' | 'drag';
  dragTo?: string;
  doneWhen?: string;
  interactive: boolean;
}

// Each step lights up the first Book 1 control of its kind; the child does the real action to move on.
export const BOOK1_GUIDE_STEPS: readonly GuideStep[] = [
  { id: 'turn-page', target: '[aria-label="Next page"]:not(:disabled)', line: 'Tap the arrow to turn the page.', gesture: 'tap', interactive: true },
  { id: 'first-stop', target: '.book-map-stop:not(.is-done):not(:disabled)', line: 'Tap the glowing stop to start.', gesture: 'tap', interactive: true },
  { id: 'hear', target: '.camp-lesson .world-primary', line: 'Tap here to hear the word.', gesture: 'tap', interactive: true },
  { id: 'find-letter', target: '.camp-word button', line: 'Tap the letter in the word.', gesture: 'tap', interactive: true },
  { id: 'mic', target: '.camp-record', line: 'Tap the mic, then say the word.', gesture: 'tap', interactive: true },
  { id: 'drag-letter', target: '.book-sound-join [role=button][tabindex="0"]', line: 'Drag the letter into the box.', gesture: 'drag', dragTo: '[data-blend-slot]:not(.has-letter)', doneWhen: '[data-blend-slot].has-letter', interactive: true },
  // The orchard shuffles its pictures, so the hand always shows mango going into the m basket.
  { id: 'sort-picture', target: '.gate-orchard .gate-piece[aria-label="mango"]', line: 'Drag the picture to its letter.', gesture: 'drag', dragTo: '.gate-orchard [data-gate-drop="m"]', doneWhen: '.gate-orchard .gate-basket.is-filled', interactive: true },
  { id: 'help', target: '.reading-round-footer .reading-help-button:has(.lucide-lightbulb)', line: 'Stuck? Tap the light for help.', gesture: 'tap', interactive: false },
];

export const BOOK1_GUIDE_SKIPPED = 'book1-guide:skipped';

export function guideKey(id: GuideStepId): string {
  return `book1-guide:${id}`;
}

export function guideProgress(activities: Readonly<Record<string, boolean>>): { done: Set<GuideStepId>; skipped: boolean } {
  return { done: new Set(BOOK1_GUIDE_STEPS.filter(item => activities[guideKey(item.id)]).map(item => item.id)), skipped: Boolean(activities[BOOK1_GUIDE_SKIPPED]) };
}

// The first unfinished step whose control is on screen, so steps follow the child's own route.
export function nextGuideStep(done: ReadonlySet<GuideStepId>, skipped: boolean, isPresent: (selector: string) => boolean): GuideStep | null {
  if (skipped) return null;
  return BOOK1_GUIDE_STEPS.find(item => !done.has(item.id) && isPresent(item.target)) ?? null;
}
