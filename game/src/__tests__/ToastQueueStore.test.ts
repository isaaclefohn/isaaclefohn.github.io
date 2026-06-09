/**
 * Tests for the achievement-unlock toast queue.
 *
 * The store is tiny but the dedup + FIFO behaviour is load-bearing:
 *   - `checkAchievements` can fire twice on the same render boundary
 *     (e.g. wave-up + game-over checking the same milestones), so the
 *     queue MUST dedup by id to avoid showing the same toast back-to-back.
 *   - The component drains the head and pops; multiple unlocks need to
 *     come out in the order they went in.
 */

import { useToastQueueStore } from '../store/toastQueueStore';
import type { Achievement } from '../store/playerStore';

const mkAchievement = (id: string, name = id): Achievement => ({
  id,
  name,
  description: `${name} description`,
  icon: 'star',
  reward: { coins: 10 },
  check: () => false,
});

describe('toastQueueStore', () => {
  beforeEach(() => {
    // Drain any state left over from a previous test.
    useToastQueueStore.setState({ queue: [] });
  });

  it('starts empty', () => {
    expect(useToastQueueStore.getState().queue).toEqual([]);
  });

  it('enqueue appends to the tail in insertion order', () => {
    const { enqueue, queue: _initial } = useToastQueueStore.getState();
    enqueue(mkAchievement('a'));
    enqueue(mkAchievement('b'));
    enqueue(mkAchievement('c'));
    const ids = useToastQueueStore.getState().queue.map((a) => a.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('enqueue is idempotent by achievement id', () => {
    // The double-fire scenario the dedup defends against: wave-up trigger
    // and game-over both call checkAchievements before either return value
    // has been popped, and they pass the same newly-met milestone twice.
    const { enqueue } = useToastQueueStore.getState();
    enqueue(mkAchievement('first_clear'));
    enqueue(mkAchievement('first_clear'));
    enqueue(mkAchievement('first_clear'));
    expect(useToastQueueStore.getState().queue.length).toBe(1);
  });

  it('dedup is shallow — different ids stay distinct even with same name', () => {
    const { enqueue } = useToastQueueStore.getState();
    enqueue(mkAchievement('alpha', 'Same Name'));
    enqueue(mkAchievement('beta', 'Same Name'));
    expect(useToastQueueStore.getState().queue.length).toBe(2);
  });

  it('dequeue pops the head and preserves the rest', () => {
    const { enqueue, dequeue } = useToastQueueStore.getState();
    enqueue(mkAchievement('a'));
    enqueue(mkAchievement('b'));
    enqueue(mkAchievement('c'));
    dequeue();
    expect(useToastQueueStore.getState().queue.map((a) => a.id)).toEqual(['b', 'c']);
    dequeue();
    expect(useToastQueueStore.getState().queue.map((a) => a.id)).toEqual(['c']);
    dequeue();
    expect(useToastQueueStore.getState().queue).toEqual([]);
  });

  it('dequeue on an empty queue is a no-op', () => {
    const { dequeue } = useToastQueueStore.getState();
    expect(() => dequeue()).not.toThrow();
    expect(useToastQueueStore.getState().queue).toEqual([]);
  });

  it('re-enqueue after dequeue works (covers the toast component drain cycle)', () => {
    const { enqueue, dequeue } = useToastQueueStore.getState();
    enqueue(mkAchievement('a'));
    dequeue();
    // After dequeue, the queue is empty — a future enqueue should land fresh,
    // not be silently rejected as "already seen."
    enqueue(mkAchievement('a'));
    expect(useToastQueueStore.getState().queue.map((a) => a.id)).toEqual(['a']);
  });
});

describe('toastQueueStore modal-suspension depth', () => {
  beforeEach(() => useToastQueueStore.setState({ queue: [], modalDepth: 0 }));

  it('tracks nested modals (open/open/close/close)', () => {
    const s = () => useToastQueueStore.getState();
    s().modalOpened();
    s().modalOpened(); // a modal stacked over a modal
    expect(s().modalDepth).toBe(2);
    s().modalClosed();
    expect(s().modalDepth).toBe(1); // still suspended — one modal remains
    s().modalClosed();
    expect(s().modalDepth).toBe(0); // playback resumes
  });

  it('clamps at 0 on unbalanced closes (a never-shown modal unmounting cannot wedge playback)', () => {
    const s = () => useToastQueueStore.getState();
    s().modalClosed();
    s().modalClosed();
    expect(s().modalDepth).toBe(0);
    s().modalOpened();
    expect(s().modalDepth).toBe(1); // counting still coherent afterward
  });

  it('suspension does not touch the queue — game-over unlocks stay queued under the modal', () => {
    const s = () => useToastQueueStore.getState();
    s().modalOpened(); // the win/lose modal is up
    s().enqueue(mkAchievement('stamped_at_game_over'));
    expect(s().queue).toHaveLength(1); // queued, not dropped
    s().modalClosed();
    // Still the head when the modal closes — the component plays it now,
    // in full view, instead of having self-dequeued unseen underneath.
    expect(s().queue.map((a) => a.id)).toEqual(['stamped_at_game_over']);
  });
});
