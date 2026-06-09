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
  /**
   * Number of native modals currently visible (win/lose modal, shop offers,
   * settings — anything going through components/common/Modal). React Native's
   * native Modal renders in a window ABOVE the entire root view, so no zIndex
   * can put the toast over it: a toast that plays while a modal is up gets
   * ~100-300ms of mid-slide visibility, is covered for its whole hold, and
   * self-dequeues UNSEEN. Since most achievements stamp exactly at game-over —
   * 400-600ms before the win/lose modal mounts — the unlock celebration was
   * being lost at its primary moment. The toast component suspends playback
   * while this is > 0 and drains the queue the moment the last modal closes.
   */
  modalDepth: number;
  /** Push a newly-unlocked achievement onto the queue. Idempotent —
   *  re-adding the same id is a no-op so a double-fired checkAchievements
   *  doesn't render duplicate toasts. */
  enqueue: (achievement: Achievement) => void;
  /** Pop the head of the queue. Called by the toast component when it
   *  finishes its dismiss animation. */
  dequeue: () => void;
  /** A native modal became visible — suspend toast playback. */
  modalOpened: () => void;
  /** A native modal hid/unmounted. Clamped at 0 so an unbalanced close
   *  (e.g. a modal unmounting while never shown) can't wedge playback. */
  modalClosed: () => void;
}

export const useToastQueueStore = create<ToastQueueStore>((set) => ({
  queue: [],
  modalDepth: 0,
  enqueue: (achievement) =>
    set((s) =>
      s.queue.some((a) => a.id === achievement.id)
        ? s
        : { queue: [...s.queue, achievement] },
    ),
  dequeue: () => set((s) => ({ queue: s.queue.slice(1) })),
  modalOpened: () => set((s) => ({ modalDepth: s.modalDepth + 1 })),
  modalClosed: () => set((s) => ({ modalDepth: Math.max(0, s.modalDepth - 1) })),
}));
