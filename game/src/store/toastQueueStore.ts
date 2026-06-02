/**
 * Tiny global queue for achievement-unlock toasts.
 *
 * Why this exists: `playerStore.checkAchievements()` returns the array
 * of newly-unlocked achievements, but every caller (`GameScreen.tsx`,
 * `HomeScreen.tsx`) was throwing the return value away. Players who
 * unlocked an achievement during a wave-up or game-over got the coins/
 * gems silently — no acknowledgement until they happened to open the
 * Achievements modal hours later. The dopamine arc of "I just earned
 * a thing" was missing.
 *
 * This is a tiny dedicated store — not a slice of playerStore — so:
 *   - Toast state doesn't get persisted (it's ephemeral by nature).
 *   - `checkAchievements()` can enqueue without rendering subscribers
 *     to playerStore re-render every time a toast pops.
 *   - The AchievementUnlockToast component subscribes ONLY to this
 *     store, isolating its render cost.
 */

import { create } from 'zustand';
import type { Achievement } from './playerStore';

interface ToastQueueStore {
  queue: Achievement[];
  /** Push a newly-unlocked achievement onto the queue. Idempotent —
   *  re-adding the same id is a no-op so a double-fired checkAchievements
   *  doesn't render duplicate toasts. */
  enqueue: (achievement: Achievement) => void;
  /** Pop the head of the queue. Called by the toast component when it
   *  finishes its dismiss animation. */
  dequeue: () => void;
}

export const useToastQueueStore = create<ToastQueueStore>((set) => ({
  queue: [],
  enqueue: (achievement) =>
    set((s) =>
      s.queue.some((a) => a.id === achievement.id)
        ? s
        : { queue: [...s.queue, achievement] },
    ),
  dequeue: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
