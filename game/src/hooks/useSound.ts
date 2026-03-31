/**
 * Sound effects and haptic feedback hook.
 * Wraps expo-av and expo-haptics with settings awareness.
 */

import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

type SoundType = 'place' | 'clear' | 'combo' | 'gameOver' | 'levelWin' | 'button' | 'select';

// We'll use programmatic sounds since we don't have audio assets yet.
// This hook is designed to be swapped with real audio files later.
export function useSound() {
  const { soundEnabled, hapticsEnabled } = useSettingsStore();
  const soundsRef = useRef<Map<string, Audio.Sound>>(new Map());

  /** Play a haptic feedback pattern */
  const playHaptic = useCallback(async (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    if (!hapticsEnabled) return;

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch {
      // Haptics not available (e.g., simulator)
    }
  }, [hapticsEnabled]);

  /** Play a game sound effect with corresponding haptic */
  const playSound = useCallback(async (type: SoundType) => {
    // Play haptic feedback based on sound type
    switch (type) {
      case 'place':
        await playHaptic('light');
        break;
      case 'clear':
        await playHaptic('medium');
        break;
      case 'combo':
        await playHaptic('heavy');
        break;
      case 'levelWin':
        await playHaptic('success');
        break;
      case 'gameOver':
        await playHaptic('error');
        break;
      case 'button':
      case 'select':
        await playHaptic('light');
        break;
    }

    // Audio playback will be added when sound assets are available
    if (!soundEnabled) return;

    // TODO: Load and play actual sound files
    // const sound = soundsRef.current.get(type);
    // if (sound) await sound.replayAsync();
  }, [soundEnabled, playHaptic]);

  /** Cleanup sounds on unmount */
  const cleanup = useCallback(async () => {
    for (const sound of soundsRef.current.values()) {
      await sound.unloadAsync();
    }
    soundsRef.current.clear();
  }, []);

  return { playSound, playHaptic, cleanup };
}
