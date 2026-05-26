/**
 * Regression guard for the IAP catalog. App Store Connect rejects
 * submissions where the in-code SKU doesn't exist in App Store
 * Connect's registered products — and the server's receipt validation
 * also expects matching IDs. We keep three places in sync:
 *
 *   - `src/services/purchases.ts` (native client catalog)
 *   - `src/services/purchases.web.ts` (web stub catalog)
 *   - `store-metadata.json` (the spec we paste into App Store Connect)
 *
 * This test fails the build if any of them drift.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PRODUCTS as NATIVE_PRODUCTS } from '../services/purchases.web';

// NB: we import from purchases.web because purchases.ts requires
// `react-native-iap` which jest's node runtime can't load. The web
// stub mirrors the native catalog by design — that mirror is itself
// pinned by `nativeMatchesWeb` below using a fs read.

interface MetadataProduct {
  id: string;
  name: string;
  price: string;
  type: string;
}

function readMetadata(): MetadataProduct[] {
  const metadataPath = path.join(__dirname, '..', '..', 'store-metadata.json');
  const json = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  return json.inAppPurchases as MetadataProduct[];
}

function readNativeCatalogIds(): string[] {
  // Plain regex scan because importing purchases.ts requires native
  // bindings. Matches lines like `id: 'com.isaaclefohn.chromadrop.foo',`
  // — both the native and web variants share this pattern, so the
  // same scan works on both files.
  const nativePath = path.join(__dirname, '..', 'services', 'purchases.ts');
  const src = fs.readFileSync(nativePath, 'utf8');
  const ids: string[] = [];
  for (const match of src.matchAll(/id:\s*'(com\.isaaclefohn\.chromadrop\.[a-z0-9_]+)'/g)) {
    ids.push(match[1]);
  }
  return ids;
}

describe('IAP catalog parity', () => {
  it('store-metadata.json and purchases.web.ts have the same SKU set', () => {
    const metadataIds = new Set(readMetadata().map((p) => p.id));
    const webIds = new Set(NATIVE_PRODUCTS.map((p) => p.id));
    expect([...metadataIds].sort()).toEqual([...webIds].sort());
  });

  it('purchases.ts and purchases.web.ts share the same SKU set', () => {
    const nativeIds = new Set(readNativeCatalogIds());
    const webIds = new Set(NATIVE_PRODUCTS.map((p) => p.id));
    expect([...nativeIds].sort()).toEqual([...webIds].sort());
  });

  it('prices in store-metadata.json match the client catalog exactly', () => {
    // Prices in metadata are the source of truth for App Store Connect.
    // Client-side prices are display-only (Apple sends the real price at
    // runtime via fetchStoreProducts), but they must agree at build time
    // so the dev-stub purchase flow does not over- or under-promise.
    const metadataById = new Map(readMetadata().map((p) => [p.id, p.price] as const));
    for (const product of NATIVE_PRODUCTS) {
      expect(metadataById.get(product.id)).toBe(product.price);
    }
  });

  it('every product ID uses the bundle-id prefix', () => {
    // App Store Connect rejects products whose ID does not start with
    // the bundle ID. Cheap-but-effective guard against accidental typos.
    const prefix = 'com.isaaclefohn.chromadrop.';
    for (const product of NATIVE_PRODUCTS) {
      expect(product.id.startsWith(prefix)).toBe(true);
    }
    for (const product of readMetadata()) {
      expect(product.id.startsWith(prefix)).toBe(true);
    }
  });

  it('the ad-removal SKU has the canonical id `remove_ads`', () => {
    // History note: the client briefly used `chromadrop.adfree` while
    // the server and metadata used `chromadrop.remove_ads`. This
    // mismatch would have failed receipt validation in production.
    // Pin the agreed-upon canonical ID so it cannot regress.
    const adRemovalIds = NATIVE_PRODUCTS
      .filter((p) => p.reward.type === 'ad_free')
      .map((p) => p.id);
    expect(adRemovalIds).toEqual(['com.isaaclefohn.chromadrop.remove_ads']);
  });
});
