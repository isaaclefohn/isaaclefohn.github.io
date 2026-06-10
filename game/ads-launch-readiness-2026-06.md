# Rewarded ads decision + launch-readiness checklist (research 2026-06-09)

## A. Decision: ship v1 with rewarded ads LIVE (do not feature-flag off)

Counter to the usual "defer ads" advice, because the work is already in the
binary: `react-native-google-mobile-ads` 16.3.2 is a real dependency, the
config plugin is wired in app.json, and `ios/` is prebuilt with
`GADApplicationIdentifier` injected. `src/services/ads.ts` is NOT a stub — it
is fully wired (prod/dev branching, reward-denial on SDK failure, 30s safety
timeout). There are **five** rewarded placements (streak-shield refill, free
power-up, wheel re-spin, extra-life and double-coins in GameScreen), all
hidden via `canShowRewarded()`. Ripping ads out is more churn than leaving
them; hiding them removes economy faucets the balance was designed around.

Honest framing: **week-1 ad revenue ≈ $0 either way** — AdMob's app-readiness
review only completes after the app is live and linked
([app readiness](https://support.google.com/admob/answer/10564477)), so fill
is limited at launch regardless. Shipping at v1 starts AdMob's clock so fill/
eCPM ramp BEFORE traffic arrives. Rewarded = opt-in, Apple-safe; interstitials
already conservative (lose-path only, every 3 events, 2-min gap).

**Condition:** add a remote kill switch — a boolean fetched from the Vercel
API or a static JSON on isaaclefohn.com, checked in `shouldShowAds()`, so ads
can be disabled without an app update.

- SDK choice: stay AdMob-solo (only first-party Expo config plugin; the SDK-54
  plugin breakage was v16.0.3, repo is on 16.3.2 and prebuilt clean). Mediation
  (MAX/LevelPlay) pointless under ~1k DAU.
- eCPM expectations: US iOS rewarded benchmark $15-25; brand-new app should
  expect $5-12 for weeks. At 50 DAU → under $1/day. Calibration, not income.
- ATT: current NPA-only/no-ATT design is valid and Apple-safe (GMA uses a
  rotating SDK instance ID; ads serve without IDFA). Revenue penalty ~20-40%
  eCPM — acceptable v1; add `expo-tracking-transparency` + pre-prompt in v1.1.
  Consistency rule: App Privacy label must declare NOTHING "used to track,"
  and the privacy policy must not describe an ATT prompt (page fixed 2026-06-09).

## B. Launch-readiness checklist (status as of 2026-06-09)

| # | Requirement | Status |
|---|---|---|
| 1 | Privacy policy live at `isaaclefohn.com/chroma/privacy/` | **STAGED 2026-06-09** — page built at `chroma/privacy/index.html` on the game branch (corrected: no ATT prompt, no banner ads, accurate backend description). **Goes live when Isaac merges to main.** Until merged: still 404 → still blocks submission. |
| 2 | App Privacy label — AdMob (no-ATT config): Identifiers (device), Coarse Location (IP), Advertising Data, Diagnostics, Product Interaction → purposes 3rd-Party Advertising + Analytics; several "linked"; **none "used to track"** ([Google disclosure doc](https://developers.google.com/admob/ios/privacy/data-disclosure)) | To do in ASC (no repo artifact). |
| 3 | App Privacy label — Supabase/PostHog/Sentry: User ID (linked), User Content (display name + scores, linked), Usage Data (gameplay events; `setPostHogUser` links distinct_id to Supabase id), Diagnostics | To do in ASC. |
| 4 | **FALSE in-app claim:** SettingsScreen:323-327 says "All data is stored locally... No data is sent to external servers" — contradicts Supabase/PostHog/Sentry/AdMob | **NOT MET — code fix queued (5.1.1 rejection vector).** |
| 5 | Age rating questionnaire (2025 overhaul, enforced 2026-01-31): daily wheel = no wager, no purchasable spins, odds disclosed → answer "None" simulated gambling, "No" purchasable loot boxes → **4+ holds**. To keep ad content 4+: set `maxAdContentRating:'G'` in ads.ts | Design MET; `maxAdContentRating` **code fix queued**. |
| 6 | Export compliance `ITSAppUsesNonExemptEncryption=false` | **DONE 2026-06-09** (app.json + ios/Chroma/Info.plist). |
| 7 | **EU DSA trader status** (since 2025-02-17; non-verified apps removed from EU App Store). Trader = must publicly display address/phone/email on the EU listing | **ISAAC DECISION:** (a) declare trader + publish contact info (home-address privacy concern), or (b) exclude EU territories at v1, add later. Blocks EU distribution either way until decided. |
| 8 | `app-ads.txt` at isaaclefohn.com root (mandatory for new AdMob apps since 2025-01) | **STAGED 2026-06-09** at repo root on the branch (`google.com, pub-9923892524770034, DIRECT, f08c47fec0942fa0`). Live on merge to main; AdMob crawl up to 24h after. |
| 9 | EAS production env vars (else: test ad IDs = zero revenue; analytics/Sentry/API silently off) | Blocked on `eas login` (Isaac). Full 9-var table in launch-playbook §2. |
| 10 | AdMob app ID is **identical for iOS and Android** in app.json — AdMob IDs are per-platform; a wrong `GADApplicationIdentifier` hard-crashes the GMA SDK at init | **ISAAC VERIFY in AdMob console:** register the iOS app if only one platform exists; fix app.json + Info.plist with the real iOS ID. |
| 11 | SKAdNetwork IDs missing (depresses iOS bids/eCPM) | Code/config task queued — pull the current list from [Google's doc](https://developers.google.com/admob/ios/ios14#skadnetwork) (JS-rendered; needs a browser), add `skAdNetworkItems` to the plugin config + prebuilt Info.plist. Not a launch blocker. |
| 12 | `woodoku` (Tripledot trademark) in store-metadata keywords — Guideline 2.3.7 metadata rejection | **DONE 2026-06-09** — replaced with `color`. |
| 13 | eas.json submit block empty (appleId/ascAppId/teamId) | Post-enrollment, self-documented in file. |

Also queued from this research: a small "ad not available right now" toast on
the rewarded `false`/no-fill path (all five placements currently fail silently
— during launch week's limited-serving window, buttons appear then silently
deny), and the remote ads kill switch.

Sources: [AdMob app readiness](https://support.google.com/admob/answer/10564477) ·
[app-ads.txt requirement](https://support.google.com/admob/answer/14538460) ·
[ad serving limits](https://support.google.com/admob/answer/9493252) ·
[Google iOS privacy strategies](https://support.google.com/admob/answer/9997589) ·
[AdMob data disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure) ·
[Apple age ratings](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/) ·
[Apple DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/) ·
[Export compliance](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations) ·
[Tenjin 2026 ad-mon report](https://tenjin.com/blog/ad-mon-gaming-2026/)
