/**
 * Level progress sync service.
 * Syncs level completion data between local storage and Supabase.
 */

import { getSupabase } from './supabase';

export interface LevelProgressRecord {
  level_number: number;
  stars: number;
  high_score: number;
}

/** Save or update level progress to cloud */
export async function saveLevelProgress(
  userId: string,
  levelNumber: number,
  stars: number,
  highScore: number
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('level_progress')
      .upsert(
        {
          user_id: userId,
          level_number: levelNumber,
          stars,
          high_score: highScore,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,level_number' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to save level progress:', error);
    return false;
  }
}

/** Fetch all level progress from cloud */
export async function fetchAllProgress(
  userId: string
): Promise<LevelProgressRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('level_progress')
      .select('level_number, stars, high_score')
      .eq('user_id', userId)
      .order('level_number', { ascending: true });

    if (error) throw error;
    return (data ?? []) as LevelProgressRecord[];
  } catch (error) {
    console.error('Failed to fetch progress:', error);
    return [];
  }
}

/** Sync local progress with cloud (take the best of each) */
export async function syncProgress(
  userId: string,
  localStars: Record<number, number>,
  localScores: Record<number, number>
): Promise<{ stars: Record<number, number>; scores: Record<number, number> }> {
  const cloudProgress = await fetchAllProgress(userId);

  const mergedStars = { ...localStars };
  const mergedScores = { ...localScores };

  for (const record of cloudProgress) {
    const level = record.level_number;
    mergedStars[level] = Math.max(mergedStars[level] ?? 0, record.stars);
    mergedScores[level] = Math.max(mergedScores[level] ?? 0, record.high_score);
  }

  // Push any local improvements back to cloud
  const levelsToUpdate = new Set([
    ...Object.keys(localStars).map(Number),
    ...cloudProgress.map((r) => r.level_number),
  ]);

  for (const level of levelsToUpdate) {
    const localStar = localStars[level] ?? 0;
    const localScore = localScores[level] ?? 0;
    const cloudRecord = cloudProgress.find((r) => r.level_number === level);

    if (
      localStar > (cloudRecord?.stars ?? 0) ||
      localScore > (cloudRecord?.high_score ?? 0)
    ) {
      await saveLevelProgress(userId, level, mergedStars[level], mergedScores[level]);
    }
  }

  return { stars: mergedStars, scores: mergedScores };
}
