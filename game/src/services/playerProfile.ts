/**
 * Player profile sync service.
 * Syncs local Zustand player store with Supabase profiles table.
 */

import { getSupabase } from './supabase';

export interface CloudProfile {
  display_name: string;
  coins: number;
  gems: number;
  total_score: number;
  highest_level: number;
  ad_free: boolean;
  current_streak: number;
  longest_streak: number;
}

/** Fetch the player's cloud profile */
export async function fetchProfile(userId: string): Promise<CloudProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, coins, gems, total_score, highest_level, ad_free, current_streak, longest_streak')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as CloudProfile;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
}

/** Update the player's cloud profile */
export async function updateProfile(
  userId: string,
  updates: Partial<CloudProfile>
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update profile:', error);
    return false;
  }
}

/** Sync local player state to cloud (merge strategy: take the higher value) */
export async function syncProfile(
  userId: string,
  localData: CloudProfile
): Promise<CloudProfile> {
  const cloudData = await fetchProfile(userId);

  if (!cloudData) {
    // No cloud data, push local
    await updateProfile(userId, localData);
    return localData;
  }

  // Merge: take the max of each numeric field
  const merged: CloudProfile = {
    display_name: localData.display_name || cloudData.display_name,
    coins: Math.max(localData.coins, cloudData.coins),
    gems: Math.max(localData.gems, cloudData.gems),
    total_score: Math.max(localData.total_score, cloudData.total_score),
    highest_level: Math.max(localData.highest_level, cloudData.highest_level),
    ad_free: localData.ad_free || cloudData.ad_free,
    current_streak: Math.max(localData.current_streak, cloudData.current_streak),
    longest_streak: Math.max(localData.longest_streak, cloudData.longest_streak),
  };

  await updateProfile(userId, merged);
  return merged;
}
