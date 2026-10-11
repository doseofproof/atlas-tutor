import type { ReviewItem } from '@/types';

/**
 * SM-2 spaced repetition scheduler (the Anki algorithm family).
 * Review items come from the tutor chat ("NEW ITEMS") and from
 * missed questions — every error becomes future review material.
 */

const DAY = 86_400_000;

export function newReviewItem(
  subjectId: string,
  front: string,
  back: string,
  note?: string
): ReviewItem {
  return {
    id: `rv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subjectId,
    front,
    back,
    note,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: Date.now(),
    createdAt: Date.now(),
  };
}

/** quality: 0 = forgot, 3 = hard, 5 = easy */
export function schedule(item: ReviewItem, quality: 0 | 3 | 5, now = Date.now()): ReviewItem {
  const next = { ...item };
  if (quality === 0) {
    next.repetitions = 0;
    next.intervalDays = 0;
    next.ease = Math.max(1.3, next.ease - 0.2);
    next.dueAt = now + 10 * 60 * 1000; // relearn: back in 10 minutes
  } else {
    next.repetitions += 1;
    if (next.repetitions === 1) next.intervalDays = 1;
    else if (next.repetitions === 2) next.intervalDays = 3;
    else next.intervalDays = Math.round(next.intervalDays * next.ease);
    if (quality === 3) {
      next.intervalDays = Math.max(1, Math.round(next.intervalDays * 0.85));
      next.ease = Math.max(1.3, next.ease - 0.15);
    } else {
      next.ease += 0.15;
    }
    next.dueAt = now + next.intervalDays * DAY;
  }
  return next;
}
