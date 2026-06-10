/**
 * Analytics opt-out toggle — the published privacy policy promises an
 * in-app opt-out ("Anonymous Analytics" in Settings). This pins the
 * contract: toggled off, the trackEvent funnel (which trackGameEvent and
 * trackScreen route through) emits nothing; toggled back on, it resumes.
 */

(global as Record<string, unknown>).__DEV__ = false;

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null },
}));
const capturePostHog = jest.fn();
jest.mock('../services/analyticsPostHog', () => ({
  initPostHog: jest.fn(),
  capturePostHog: (...args: unknown[]) => capturePostHog(...args),
  setPostHogUser: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../services/notifications', () => ({
  cancelAllNotifications: jest.fn(),
}));

import { trackEvent, trackGameEvent } from '../services/analytics';
import { useSettingsStore } from '../store/settingsStore';

describe('analytics opt-out (privacy-policy commitment)', () => {
  beforeEach(() => {
    capturePostHog.mockClear();
    useSettingsStore.setState({ analyticsEnabled: true });
  });

  it('defaults to enabled', () => {
    expect(useSettingsStore.getState().analyticsEnabled).toBe(true);
  });

  it('tracks while enabled', () => {
    trackEvent('test.event', { a: 1 });
    expect(capturePostHog).toHaveBeenCalledWith('test.event', { a: 1 });
  });

  it('emits NOTHING once toggled off — including game events', () => {
    useSettingsStore.getState().toggleAnalytics();
    expect(useSettingsStore.getState().analyticsEnabled).toBe(false);
    trackEvent('test.event');
    trackGameEvent({ type: 'level_complete', level: 3 });
    expect(capturePostHog).not.toHaveBeenCalled();
  });

  it('resumes after toggling back on', () => {
    useSettingsStore.getState().toggleAnalytics(); // off
    useSettingsStore.getState().toggleAnalytics(); // on
    trackEvent('test.resumed');
    expect(capturePostHog).toHaveBeenCalledWith('test.resumed', undefined);
  });
});
