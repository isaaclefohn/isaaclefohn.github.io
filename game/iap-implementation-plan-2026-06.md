# IAP: stub → App-Store-approvable — implementation plan (research 2026-06-09)

**Recommendation: keep `react-native-iap`, upgrade to ^15.3.1, fix the v12→v15
API drift in `src/services/purchases.ts`, and validate the StoreKit 2 JWS
server-side with Apple's official `@apple/app-store-server-library` (^3.1.0)
in the existing Vercel handler. Skip RevenueCat at launch.**

## CRITICAL finding — the stub will fail on a real device today

`react-native-iap` **15.0.1 is already installed** (nitro-modules peer dep
satisfied, config plugin in app.json, native side proven by the successful
simulator build). But `purchases.ts` was written against the **v12-era API**:

| Stub call (v12-style) | Installed v15 reality | Effect if unfixed |
|---|---|---|
| `purchase.transactionReceipt` | does not exist; replaced by unified `purchaseToken` (iOS = JWS) | listener early-returns at `if (!receipt)` → **user pays, no credit, no finishTransaction — purchase hangs in Apple's queue. Worst possible failure.** |
| `IAP.getProducts({skus})` | `fetchProducts({skus, type:'in-app'})` | throws/undefined |
| `IAP.requestPurchase({sku, andDangerouslyFinishTransactionAutomaticallyIOS})` | `requestPurchase({request:{apple:{sku, andDangerouslyFinishTransactionAutomatically:false}}, type:'in-app'})` | throws/wrong args |
| `purchaseUpdatedListener` / `purchaseErrorListener` / `initConnection` / `finishTransaction({purchase,isConsumable})` / `getAvailablePurchases()` / `transactionId` | **unchanged** | architecture survives intact |

Verified against `node_modules/react-native-iap/lib/typescript/src/types.d.ts`.

Second footgun: production builds without `EXPO_PUBLIC_API_URL` make
`validateReceipt` return `{valid:false, transient:false}` → transaction
finalized WITHOUT crediting. (EAS env work tracked in launch-playbook §2.)

## Why react-native-iap (not expo-iap, not RevenueCat)

- rn-iap did NOT die with the 2025 deprecation scare: it moved into the
  [OpenIAP monorepo](https://github.com/hyodotdev/openiap); npm releases
  continue (15.3.1, 2026-05-19). v14+ is StoreKit 2 on iOS, Nitro-bridged.
- [expo-iap](https://github.com/hyochan/expo-iap): same maintainer, same
  OpenIAP API — switching later is nearly mechanical; buys nothing now.
- [RevenueCat](https://www.revenuecat.com/pricing): free to $2.5k MTR then 1%;
  subscription-centric — for a 9/12-consumable catalog we'd still write the
  same creditFromProduct + dedup, while discarding the built validator. Right
  tool if subscriptions arrive later or the server becomes a burden.

## Validation: StoreKit 2 JWS, NOT verifyReceipt

Apple's legacy `/verifyReceipt` is
[deprecated](https://developer.apple.com/documentation/appstorereceipts/verify-receipt)
(no EOL announced, but no updates; Apple says migrate). rn-iap v15 hands the
JWS directly as `purchase.purchaseToken`. Server verifies **locally** with
[`@apple/app-store-server-library`](https://github.com/apple/app-store-server-library-node):
`SignedDataVerifier.verifyAndDecodeTransaction()` — certificate chain to Apple
roots, no ASC API key, no network call to Apple. Ideal on Vercel serverless.

Server checks for a consumable: (1) JWS chains to Apple roots; (2) bundleId
matches; (3) decoded productId == claimed AND in allow-list; (4) decoded
transactionId == claimed; (5) no `revocationDate`; (6) right `environment`;
(7) **server-side idempotency** — unique-insert transactionId into a Supabase
`iap_transactions` table (client ledger only stops same-device replays).

## Testing

- **Now, no Apple account:** Xcode **StoreKit configuration file** — define
  all 12 SKUs in a `chroma.storekit`, enable in the scheme, full
  purchase/restore/refund simulation in the simulator
  ([docs](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode/)).
  Caveat: Xcode-local JWS is signed by a local test cert → server validation
  fails BY DESIGN; keep a `DEV_SKIP_APPLE_VERIFY` flag in the validator.
- **After enrollment:** sandbox testers (ASC → Users and Access → Sandbox);
  TestFlight runs IAP in sandbox automatically — testers never charged.
  Sandbox works only after Paid Apps Agreement + banking/tax are Active.

## Review gotchas

- Restore (3.1.1): built (`restorePurchases` + `applyEntitlementOnly`); verify on-device.
- **Price display:** catalog hardcodes `'$0.99'` strings — Shop must render
  store-fetched localized `displayPrice`; hardcoded USD breaks non-US
  storefronts (soft-rejection magnet). Keep strings as pre-fetch placeholders only.
- Family Sharing: optional, irreversible once enabled in ASC — skip at launch.
- ASSN V2 / refunds: NOT required for approval; add a `REFUND` +
  `CONSUMPTION_REQUEST` handler post-launch.
- All three ad-free SKUs (remove_ads / starter_pack / vip_pass) must actually
  suppress ads in the review build.

## Phases

- **Phase 0 (now, no Apple account):** upgrade to rn-iap ^15.3.1; fix the
  three API-drift call sites in purchases.ts (everything else unchanged);
  client `validateReceipt` body → `{platform:'apple', jws, productId,
  transactionId}`; add `chroma.storekit` + scheme config; simulator test.
- **Phase 1 (server):** `api/`: add `@apple/app-store-server-library`;
  rewrite `validate-receipt.ts` per the 7 checks; Apple-reject → 400
  (client-permanent), infra error → 503 (client-transient — semantics already
  match); env: `APPLE_BUNDLE_ID`, `APPLE_APP_APPLE_ID`, `APPLE_ENV`,
  `DEV_SKIP_APPLE_VERIFY`; bundle Apple Root CA certs
  ([Apple PKI](https://www.apple.com/certificateauthority/)).
- **Phase 2 (post-enrollment):** ASC records per `asc-iap-registration-sheet.md`;
  sandbox device pass incl. interrupted-purchase and airplane-mode redelivery;
  TestFlight; attach IAPs to first version submission.
- **Phase 3 (post-launch):** ASSN V2 endpoint for REFUND / CONSUMPTION_REQUEST.

## Isaac-only decisions

1. Apple Developer enrollment ($99/yr) — gates Phases 2-3.
2. Self-hosted validation (recommended) vs RevenueCat account.
3. Final ASC price points for all 12 SKUs (catalog $ strings are proposals).
4. Family Sharing on remove_ads/vip_pass (irreversible).
5. Paid Apps Agreement + banking + W-9 (legal/financial).
6. `appAccountToken` linkage to Supabase IDs (cross-device sync; deferrable).
7. Catalog rationalization (three overlapping ad-free SKUs; $39.99 top pack).

Full sources in the research transcript; key ones:
[OpenIAP](https://github.com/hyodotdev/openiap) ·
[rn-iap docs](https://hyochan.github.io/react-native-iap/docs/intro/) ·
[App Store Server Library (node)](https://github.com/apple/app-store-server-library-node) ·
[StoreKit Testing in Xcode](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode/) ·
[TestFlight IAP](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight/) ·
[ASSN V2](https://developer.apple.com/documentation/AppStoreServerNotifications/App-Store-Server-Notifications-V2)
