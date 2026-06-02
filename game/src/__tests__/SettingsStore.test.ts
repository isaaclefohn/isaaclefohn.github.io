/**
 * Tests for settingsStore (previously 0% covered). Locks the haptics
 * sync logic, volume clamping, tip tracking, and the notifications fix
 * (turning the toggle OFF cancels scheduled notifications).
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    getAllKeys: () => Promise.resolve([] as string[]),
    multiGet: () => Promise.resolve([]),
    multiSet: () => Promise.resolve(),
    multiRemove: () => Promise.resolve(),
  },
}));

// settingsStore imports cancelAllNotifications from services/notifications,
// which pulls in expo-notifications (ESM). Mock it AND capture the spy so
// we can assert the toggle-off behavior.
const cancelAllNotifications = jest.fn();
jest.mock('../services/notifications', () => ({
  cancelAllNotifications: () => cancelAllNotifications(),
}));

import { useSettingsStore } from '../store/settingsStore';

const ss = () => useSettingsStore.getState();

const resetSettings = () =>
  useSettingsStore.setState({
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
    shownTips: [],
    comebackShownDate: null,
  });

beforeEach(() => {
  resetSettings();
  cancelAllNotifications.mockClear();
});

describe('settingsStore simple toggles', () => {
  it('toggleSound / toggleMusic / toggleGridLines / toggleGhostPreview / toggleColorblindMode / toggleReducedMotion flip their flags', () => {
    ss().toggleSound();        expect(ss().soundEnabled).toBe(false);
    ss().toggleMusic();        expect(ss().musicEnabled).toBe(false);
    ss().toggleGridLines();    expect(ss().showGridLines).toBe(false);
    ss().toggleGhostPreview(); expect(ss().showGhostPreview).toBe(false);
    ss().toggleColorblindMode(); expect(ss().colorblindMode).toBe(true);
    ss().toggleReducedMotion();  expect(ss().reducedMotion).toBe(true);
  });

  it('completeTutorial sets the flag', () => {
    expect(ss().tutorialCompleted).toBe(false);
    ss().completeTutorial();
    expect(ss().tutorialCompleted).toBe(true);
  });

  it('setGraphicsQuality sets the value', () => {
    ss().setGraphicsQuality('low');
    expect(ss().graphicsQuality).toBe('low');
  });
});

describe('settingsStore haptics sync', () => {
  it('toggling haptics off moves intensity to off; on restores normal', () => {
    ss().toggleHaptics(); // off
    expect(ss().hapticsEnabled).toBe(false);
    expect(ss().hapticIntensity).toBe('off');

    ss().toggleHaptics(); // back on
    expect(ss().hapticsEnabled).toBe(true);
    expect(ss().hapticIntensity).toBe('normal');
  });

  it('toggling on preserves a non-off intensity', () => {
    useSettingsStore.setState({ hapticsEnabled: false, hapticIntensity: 'off' });
    // first set a remembered intensity then off, then on
    ss().setHapticIntensity('soft');     // enables + soft
    expect(ss().hapticsEnabled).toBe(true);
    expect(ss().hapticIntensity).toBe('soft');
    ss().toggleHaptics();                // off
    expect(ss().hapticIntensity).toBe('off');
    ss().toggleHaptics();                // on -> restores to normal (off had no memory)
    expect(ss().hapticIntensity).toBe('normal');
  });

  it('setHapticIntensity keeps hapticsEnabled in sync', () => {
    ss().setHapticIntensity('off');
    expect(ss().hapticsEnabled).toBe(false);
    ss().setHapticIntensity('strong');
    expect(ss().hapticsEnabled).toBe(true);
    expect(ss().hapticIntensity).toBe('strong');
  });
});

describe('settingsStore volume clamping', () => {
  it('clamps sound + music volume to [0,1]', () => {
    ss().setSoundVolume(2);   expect(ss().soundVolume).toBe(1);
    ss().setSoundVolume(-1);  expect(ss().soundVolume).toBe(0);
    ss().setSoundVolume(0.42); expect(ss().soundVolume).toBeCloseTo(0.42);
    ss().setMusicVolume(99);  expect(ss().musicVolume).toBe(1);
    ss().setMusicVolume(-5);  expect(ss().musicVolume).toBe(0);
  });
});

describe('settingsStore tip tracking', () => {
  it('markTipShown records a tip once (no duplicates)', () => {
    ss().markTipShown('first_chromatic');
    ss().markTipShown('first_chromatic');
    expect(ss().shownTips.filter(t => t === 'first_chromatic')).toHaveLength(1);
  });

  it('records distinct tips in order', () => {
    ss().markTipShown('a');
    ss().markTipShown('b');
    expect(ss().shownTips).toEqual(['a', 'b']);
  });
});

describe('settingsStore notifications toggle (the fix)', () => {
  it('turning notifications OFF cancels scheduled notifications', () => {
    expect(ss().notificationsEnabled).toBe(true);
    ss().toggleNotifications(); // -> off
    expect(ss().notificationsEnabled).toBe(false);
    expect(cancelAllNotifications).toHaveBeenCalledTimes(1);
  });

  it('turning notifications ON does NOT cancel anything', () => {
    useSettingsStore.setState({ notificationsEnabled: false });
    ss().toggleNotifications(); // -> on
    expect(ss().notificationsEnabled).toBe(true);
    expect(cancelAllNotifications).not.toHaveBeenCalled();
  });
});

describe('settingsStore comeback date', () => {
  it('setComebackShownDate stores the date', () => {
    ss().setComebackShownDate('2026-06-02');
    expect(ss().comebackShownDate).toBe('2026-06-02');
  });
});
