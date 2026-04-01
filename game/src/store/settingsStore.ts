/**
 * Zustand store for user settings.
 * Persisted to AsyncStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsStore {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  showGridLines: boolean;
  showGhostPreview: boolean;

  toggleSound: () => void;
  toggleMusic: () => void;
  toggleHaptics: () => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleGridLines: () => void;
  toggleGhostPreview: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: true,
      hapticsEnabled: true,
      soundVolume: 0.8,
      musicVolume: 0.5,
      showGridLines: true,
      showGhostPreview: true,

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(1, volume)) }),
      setMusicVolume: (volume) => set({ musicVolume: Math.max(0, Math.min(1, volume)) }),
      toggleGridLines: () => set((s) => ({ showGridLines: !s.showGridLines })),
      toggleGhostPreview: () => set((s) => ({ showGhostPreview: !s.showGhostPreview })),
    }),
    {
      name: 'color-block-blast-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
