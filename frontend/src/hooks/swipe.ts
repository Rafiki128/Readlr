// Touch swipe left or right to move between books and pages; vertical scrolling is left to the browser.
import { useRef, type MouseEvent, type PointerEvent } from 'react';

/** Swipe step: 1 for a left swipe (next), -1 for a right swipe (back), 0 when too short or mostly vertical. */
export function swipeStep(dx: number, dy: number): 1 | -1 | 0 {
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

/** Pointer handlers for touch and pen swipes; the tap that ends a swipe does not also press a button. */
export function useSwipe(move: (step: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return {
    onPointerDown: (event: PointerEvent) => {
      swiped.current = false;
      start.current = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent) => {
      const from = start.current;
      start.current = null;
      const step = from ? swipeStep(event.clientX - from.x, event.clientY - from.y) : 0;
      if (step) { swiped.current = true; move(step); }
    },
    onPointerCancel: () => { start.current = null; },
    onClickCapture: (event: MouseEvent) => {
      if (!swiped.current) return;
      swiped.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
