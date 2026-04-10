/**
 * App Store rating prompt service.
 * Uses StoreReview API to prompt at optimal moments:
 * - After a 3-star level completion (positive emotion)
 * - After earning an achievement
 * - After 10+ levels completed (engaged user)
 * - Maximum once per 14 days to avoid annoyance
 *
 * Apple guidelines: max 3 prompts per 365-day period.
 * We self-limit to avoid hitting that cap.
 */

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RATING_STORAGE_KEY = 'app_rating_state';

interface RatingState {
  lastPromptDate: string | null;
  promptCount: number;
  levelsCompletedSincePrompt: number;
}

async function getRatingState(): Promise<RatingState> {
  try {
    const data = await AsyncStorage.getItem(RATING_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { lastPromptDate: null, promptCount: 0, levelsCompletedSincePrompt: 0 };
}

async function setRatingState(state: RatingState): Promise<void> {
  try {
    await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** Record a level completion and check if we should prompt */
export async function recordCompletionForRating(): Promise<void> {
  const state = await getRatingState();
  state.levelsCompletedSincePrompt++;
  await setRatingState(state);
}

/**
 * Try to show the rating prompt if conditions are met.
 * Call after positive moments: 3-star wins, achievements, milestones.
 */
export async function maybePromptRating(totalLevelsCompleted: number): Promise<boolean> {
  const available = await StoreReview.isAvailableAsync();
  if (!available) return false;

  const state = await getRatingState();
  const today = new Date().toISOString().split('T')[0];

  // Don't prompt more than 3 times total
  if (state.promptCount >= 3) return false;

  // Don't prompt within 14 days of last prompt
  if (state.lastPromptDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(state.lastPromptDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < 14) return false;
  }

  // Must have completed at least 10 levels total (engaged user)
  if (totalLevelsCompleted < 10) return false;

  // Must have completed at least 5 levels since last prompt
  if (state.levelsCompletedSincePrompt < 5) return false;

  // All conditions met — prompt!
  try {
    await StoreReview.requestReview();
    await setRatingState({
      lastPromptDate: today,
      promptCount: state.promptCount + 1,
      levelsCompletedSincePrompt: 0,
    });
    return true;
  } catch {
    return false;
  }
}
