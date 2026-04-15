/**
 * Sound effects and haptic feedback hook.
 * Wraps expo-av and expo-haptics with settings awareness.
 *
 * Loads audio files from assets/sounds/ if available,
 * always plays haptic feedback as a fallback.
 */

import { useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useSettingsStore, HapticIntensity } from '../store/settingsStore';

type SoundType = 'place' | 'clear' | 'combo' | 'gameOver' | 'levelWin' | 'button' | 'select';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

/**
 * Map the nominal haptic tier to a concrete ImpactFeedbackStyle based on the
 * user's intensity preference. Soft downgrades everything to Light; Strong
 * upgrades Light → Medium and Medium → Heavy for more tactile emphasis.
 */
function scaleImpact(tier: 'light' | 'medium' | 'heavy', intensity: HapticIntensity): Haptics.ImpactFeedbackStyle | null {
  if (intensity === 'off') return null;
  if (intensity === 'soft') return Haptics.ImpactFeedbackStyle.Light;
  if (intensity === 'strong') {
    if (tier === 'light') return Haptics.ImpactFeedbackStyle.Medium;
    return Haptics.ImpactFeedbackStyle.Heavy;
  }
  // normal
  return tier === 'light'
    ? Haptics.ImpactFeedbackStyle.Light
    : tier === 'medium'
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Heavy;
}

// Map of sound types to their haptic feedback
const HAPTIC_MAP: Record<SoundType, HapticType> = {
  place: 'light',
  clear: 'medium',
  combo: 'heavy',
  levelWin: 'success',
  gameOver: 'error',
  button: 'light',
  select: 'light',
};

// Sound asset map — each SoundType points to its bundled WAV file.
// Generated procedurally by scripts/generate-sounds.js into assets/sounds/;
// the filenames are stable so higher-quality CC0 assets can replace them
// later without touching this file. require() lets Metro bundle them with
// the app. If a file ever goes missing the Audio.Sound.createAsync call
// below will throw and we skip that slot — haptics still fire.
const SOUND_ASSETS: Partial<Record<SoundType, number>> = {
  place: require('../../assets/sounds/place.wav'),
  clear: require('../../assets/sounds/clear.wav'),
  combo: require('../../assets/sounds/combo.wav'),
  gameOver: require('../../assets/sounds/game-over.wav'),
  levelWin: require('../../assets/sounds/level-win.wav'),
  button: require('../../assets/sounds/button.wav'),
  select: require('../../assets/sounds/select.wav'),
};

export function useSound() {
  const { soundEnabled, hapticsEnabled, hapticIntensity, soundVolume } = useSettingsStore();
  const soundsRef = useRef<Map<SoundType, Audio.Sound>>(new Map());
  const loadedRef = useRef(false);

  // Preload audio assets on mount
  useEffect(() => {
    if (loadedRef.current || !soundEnabled) return;

    let cancelled = false;

    async function loadSounds() {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      for (const [type, asset] of Object.entries(SOUND_ASSETS)) {
        if (cancelled) return;
        try {
          const { sound } = await Audio.Sound.createAsync(asset as number, {
            volume: soundVolume,
            shouldPlay: false,
          });
          soundsRef.current.set(type as SoundType, sound);
        } catch {
          // Asset not found or load failed — skip this sound
        }
      }
      loadedRef.current = true;
    }

    loadSounds();

    return () => {
      cancelled = true;
    };
  }, [soundEnabled, soundVolume]);

  // Update volume when settings change
  useEffect(() => {
    for (const sound of soundsRef.current.values()) {
      sound.setVolumeAsync(soundVolume).catch(() => {});
    }
  }, [soundVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const sound of soundsRef.current.values()) {
        sound.unloadAsync().catch(() => {});
      }
      soundsRef.current.clear();
      loadedRef.current = false;
    };
  }, []);

  /** Play a haptic feedback pattern, scaled by the user's intensity setting. */
  const playHaptic = useCallback(async (type: HapticType) => {
    if (!hapticsEnabled || hapticIntensity === 'off') return;

    try {
      switch (type) {
        case 'light':
        case 'medium':
        case 'heavy': {
          const style = scaleImpact(type, hapticIntensity);
          if (style) await Haptics.impactAsync(style);
          break;
        }
        case 'success':
          // 'soft' intensity downgrades notifications to light impact so the
          // user still gets a pulse without the louder system vibration.
          if (hapticIntensity === 'soft') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          break;
        case 'error':
          if (hapticIntensity === 'soft') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          break;
      }
    } catch {
      // Haptics not available (e.g., simulator)
    }
  }, [hapticsEnabled, hapticIntensity]);

  /** Play a game sound effect with corresponding haptic */
  const playSound = useCallback(async (type: SoundType) => {
    // Always play haptic
    await playHaptic(HAPTIC_MAP[type]);

    // Play audio if enabled and loaded
    if (!soundEnabled) return;

    const sound = soundsRef.current.get(type);
    if (sound) {
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {
        // Playback error — ignore
      }
    }
  }, [soundEnabled, playHaptic]);

  /** Play a placement sound with haptic variation based on column (spatial feedback) */
  const playPlacement = useCallback(async (col: number, gridSize: number) => {
    if (hapticsEnabled && hapticIntensity !== 'off') {
      // Vary the base tier based on column position, then let scaleImpact
      // apply the user's intensity preference on top.
      const ratio = col / Math.max(1, gridSize - 1);
      const tier: 'light' | 'medium' | 'heavy' =
        ratio < 0.33 ? 'light' : ratio < 0.66 ? 'medium' : 'heavy';
      try {
        const style = scaleImpact(tier, hapticIntensity);
        if (style) await Haptics.impactAsync(style);
      } catch {}
    }

    // Play audio if available
    if (!soundEnabled) return;
    const sound = soundsRef.current.get('place');
    if (sound) {
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {}
    }
  }, [hapticsEnabled, hapticIntensity, soundEnabled]);

  return { playSound, playHaptic, playPlacement };
}
