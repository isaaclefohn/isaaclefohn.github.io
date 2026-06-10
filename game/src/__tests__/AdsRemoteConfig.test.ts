/**
 * Remote ads kill switch — fail-open semantics.
 *
 * The switch exists so ads can be disabled without an app update (a static
 * JSON on isaaclefohn.com). The load-bearing property is FAIL-OPEN: the
 * config file won't even exist until the branch merges to main, and a
 * network blip at launch must never silently turn off the ad economy. Only
 * an explicit {"adsEnabled": false} may flip it.
 */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null },
}));
jest.mock('../services/analytics', () => ({
  trackEvent: jest.fn(),
  trackGameEvent: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { refreshRemoteAdsConfig, shouldShowAds } from '../services/ads';
import { usePlayerStore } from '../store/playerStore';

const mockFetch = (impl: () => Promise<unknown>) => {
  (global as { fetch?: unknown }).fetch = jest.fn(impl);
};

describe('refreshRemoteAdsConfig (fail-open kill switch)', () => {
  beforeEach(() => {
    usePlayerStore.setState({ adFree: false });
  });

  afterEach(async () => {
    // Restore the open state so test order can't leak a closed switch.
    mockFetch(async () => ({ ok: true, json: async () => ({ adsEnabled: true }) }));
    await refreshRemoteAdsConfig('https://test/config.json');
  });

  it('explicit adsEnabled:false disables ads', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ adsEnabled: false }) }));
    expect(await refreshRemoteAdsConfig('https://test/config.json')).toBe(false);
    expect(shouldShowAds()).toBe(false);
  });

  it('adsEnabled:true re-enables after a disable', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ adsEnabled: false }) }));
    await refreshRemoteAdsConfig('https://test/config.json');
    mockFetch(async () => ({ ok: true, json: async () => ({ adsEnabled: true }) }));
    expect(await refreshRemoteAdsConfig('https://test/config.json')).toBe(true);
    expect(shouldShowAds()).toBe(true);
  });

  it('HTTP 404 fails OPEN (config not yet published)', async () => {
    mockFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    expect(await refreshRemoteAdsConfig('https://test/config.json')).toBe(true);
    expect(shouldShowAds()).toBe(true);
  });

  it('network error fails OPEN', async () => {
    mockFetch(async () => {
      throw new Error('network down');
    });
    expect(await refreshRemoteAdsConfig('https://test/config.json')).toBe(true);
    expect(shouldShowAds()).toBe(true);
  });

  it('malformed body (missing key) stays OPEN — only explicit false closes', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ something: 'else' }) }));
    expect(await refreshRemoteAdsConfig('https://test/config.json')).toBe(true);
  });

  it('kill switch composes with the adFree entitlement', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ adsEnabled: true }) }));
    await refreshRemoteAdsConfig('https://test/config.json');
    usePlayerStore.setState({ adFree: true });
    expect(shouldShowAds()).toBe(false); // ad-free wins even with switch open
  });
});
