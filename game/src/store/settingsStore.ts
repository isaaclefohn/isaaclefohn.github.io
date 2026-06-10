/**
 * Zustand store for user settings.
 * Persisted to AsyncStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelAllNotifications } from '../services/notifications';

/**
 * Graphics quality presets. 'low' disables the per-cell highlight/innerGlow
 * decorative Views for a battery-friendly flat look on older devices;
 * 'high' keeps the premium chrome. Future presets (ultra) can add extras.
 */
export type GraphicsQuality = 'low' | 'high';

/**
 * Haptic intensity tiers. 'off' disables haptics entirely (alias for the
 * existing hapticsEnabled false). 'soft' uses only light feedback; 'normal'
 * uses the current mix of light/medium/heavy; 'strong' upgrades light → medium
 * and medium → heavy for emphatic tactile feedback on premium devices.
 */
export type HapticIntensity = 'off' | 'soft' | 'normal' | 'strong';

interface SettingsStore {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  hapticIntensity: HapticIntensity;
  soundVolume: number;
  musicVolume: number;
  showGridLines: boolean;
  showGhostPreview: boolean;
  graphicsQuality: GraphicsQuality;
  tutorialCompleted: boolean;
  colorblindMode: boolean;
  reducedMotion: boolean;
  notificationsEnabled: boolean;
  /** Anonymous usage analytics opt-out (privacy-policy commitment: the
   *  published policy describes an in-app analytics opt-out). Gates the
   *  trackEvent funnel in services/analytics; crash reporting is separate
   *  and disclosed separately. Default ON. */
  analyticsEnabled: boolean;
  /** Track which tutorial tips have been shown (one-time each) */
  shownTips: string[];
  /** Whether comeback bonus was already shown this session */
  comebackShownDate: string | null;

  toggleSound: () => void;
  toggleMusic: () => void;
  toggleHaptics: () => void;
  setHapticIntensity: (intensity: HapticIntensity) => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleGridLines: () => void;
  toggleGhostPreview: () => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  completeTutorial: () => void;
  toggleColorblindMode: () => void;
  toggleReducedMotion: () => void;
  toggleNotifications: () => void;
  toggleAnalytics: () => void;
  markTipShown: (tipId: string) => void;
  hasTipBeenShown: (tipId: string) => boolean;
  setComebackShownDate: (date: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      musicEnabled: true,
      hapticsEnabled: true,
      hapticIntensity: 'normal',
      soundVolume: 0.8,
      musicVolume: 0.5,
      showGridLines: true,
      showGhostPreview: true,
      graphicsQuality: 'high',
      tutorialCompleted: false,
      colorblindMode: false,
      reducedMotion: false,
      notificationsEnabled: true,
      analyticsEnabled: true,
      shownTips: [],
      comebackShownDate: null,

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      toggleHaptics: () =>
        set((s) => {
          const enabled = !s.hapticsEnabled;
          return {
            hapticsEnabled: enabled,
            // Keep the two settings in sync: turning haptics off also moves
            // the intensity to 'off' so any code that reads intensity alone
            // still respects the user's choice.
            hapticIntensity: enabled
              ? s.hapticIntensity === 'off'
                ? 'normal'
                : s.hapticIntensity
              : 'off',
          };
        }),
      setHapticIntensity: (intensity) =>
        set({
          hapticIntensity: intensity,
          hapticsEnabled: intensity !== 'off',
        }),
      setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(1, volume)) }),
      setMusicVolume: (volume) => set({ musicVolume: Math.max(0, Math.min(1, volume)) }),
      toggleGridLines: () => set((s) => ({ showGridLines: !s.showGridLines })),
      toggleGhostPreview: () => set((s) => ({ showGhostPreview: !s.showGhostPreview })),
      setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
      completeTutorial: () => set({ tutorialCompleted: true }),
      toggleColorblindMode: () => set((s) => ({ colorblindMode: !s.colorblindMode })),
      toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
      toggleNotifications: () => {
        const next = !get().notificationsEnabled;
        set({ notificationsEnabled: next });
        if (!next) {
          // When the player turns notifications OFF, actually cancel any
          // already-scheduled daily-reward / streak / retention reminders
          // — the previous version just flipped the boolean and let the
          // queued notifications keep firing. Fire-and-forget; the helper
          // silently no-ops if the platform doesn't support notifications.
          void cancelAllNotifications();
        }
      },
      toggleAnalytics: () => set((s) => ({ analyticsEnabled: !s.analyticsEnabled })),
      markTipShown: (tipId: string) => set((s) => ({
        shownTips: s.shownTips.includes(tipId) ? s.shownTips : [...s.shownTips, tipId],
      })),
      hasTipBeenShown: (tipId: string) => {
        // This is a getter, not a setter — but zustand pattern uses get()
        // We'll check via the state directly in components
        return false; // Placeholder; components check shownTips directly
      },
      setComebackShownDate: (date: string) => set({ comebackShownDate: date }),
    }),
    {
      name: 'chroma-drop-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
