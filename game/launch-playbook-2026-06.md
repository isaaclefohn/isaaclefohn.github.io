# CHROMA Launch Playbook — June 2026

Source: live research, 2026-06-14. **Apple Developer enrollment →
TestFlight → App Store**. End-to-end, with a calendar.

## Bottom line

**Soonest realistic launch date: roughly 6-8 weeks from the day you
submit Apple Developer enrollment.** Apple officially commits to 24-48
hour confirmation; 2026 reality shows actual waits of 2-7+ weeks with
no communication. Translation: submit enrollment **this week**, parallelize
EAS env setup + ASC product registration prep so the moment your
membership goes active you are 24-72 hours from a first TestFlight
build. Risk-adjusted dates:

- **Best case** (2-day approval, no rejections) → public live **late June 2026**
- **Realistic** (1-wk approval, one rejection cycle) → **mid-to-late July 2026**
- **Worst case** (4-wk approval, two rejection cycles, summer-job conflict) → **early-to-mid September 2026**

---

## 1. Apple Developer Program enrollment (individual, US)

- **Cost:** $99 USD/year, auto-renews. Oregon has no sales tax → all-in is $99.00.
- **Account type:** Enroll as **Individual / Sole Proprietor**, NOT Organization.
  - D-U-N-S only required for Org accounts.
  - Org requires a public website on a matching domain + "proof of legal binding authority" (an LLC).
  - Individual accounts list **your legal name as Seller** on the App Store. CHROMA's storefront will show "Isaac Lefohn" unless you upgrade later.
- **What Apple requires:**
  - Apple Account with 2FA, **legal name "Isaac Lefohn"** (fix at appleid.apple.com BEFORE starting — mismatches stall verification).
  - Physical address (no P.O. boxes).
  - Phone matching the account.
- **SSN / tax forms:**
  - $99 enrollment does NOT require a W-9 at this step.
  - W-9 comes later inside App Store Connect → **Agreements, Tax, and Banking**.
  - Use your SSN on the W-9 as US sole proprietor. No LLC needed. Optionally, get a free EIN from IRS.gov to keep SSN off Apple's forms (~5 min online).
  - W-8BEN is non-US only; ignore.
- **Timeline:** Apple's official 24-hr commitment vs. 2026 reality of 2-7+ wks. Plan for 1 week, hope for 24 hours, panic at day 14.

**Day-of steps:**
1. appleid.apple.com → confirm "Isaac Lefohn" legal name + 2FA on.
2. https://developer.apple.com/programs/enroll/ in Safari.
3. Select **Individual / Sole Proprietor**.
4. Confirm name, address (permanent OR address, not OSU dorm), phone.
5. Pay $99 with personal credit card. Save the Enrollment ID Apple emails.

## 2. EAS env setup for production builds

**Critical risk:** `eas.json` has no `env` block. The four `EXPO_PUBLIC_*`
vars are *inlined at build time*, not read at runtime — if missing,
the bundled JS contains `undefined`. **Silent failure**, not a crash.
TestFlight build looks fine in dev, dies in production.

EAS environment variables live in the **EAS dashboard at expo.dev**,
scoped per environment (`development` / `preview` / `production`), NOT
committed to `eas.json`.

> **Corrected 2026-06-09:** the original list here had FOUR vars; `.env`
> actually defines **NINE** `EXPO_PUBLIC_*` vars. The omitted ones included
> the three AdMob IDs — and `ads.ts` silently falls back to **Google test ad
> units** when they're blank, so a production build missing them serves test
> ads (zero revenue + AdMob policy violation). The "silent failure" warning
> above applies hardest to the vars the old list forgot.
>
> Prerequisite: `eas login` (Isaac — needs your Expo credentials; everything
> below is blocked on this single step). `eas.json` production profile already
> has `"environment": "production"` (done 2026-06-09).

All nine, from `.env` (`set -a; source .env; set +a` first, then each
`eas env:create --environment production --name <NAME> --value "$<NAME>" --visibility <vis>`):

| Var | Visibility | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | plaintext | Vercel leaderboard/daily API |
| `EXPO_PUBLIC_SUPABASE_URL` | plaintext | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | sensitive | public-by-design client key (RLS gates access) |
| `EXPO_PUBLIC_POSTHOG_KEY` | sensitive | |
| `EXPO_PUBLIC_POSTHOG_HOST` | plaintext | |
| `EXPO_PUBLIC_SENTRY_DSN` | sensitive | optional — errors silently skip if blank; set it anyway |
| `EXPO_PUBLIC_ADMOB_APP_ID` | plaintext | **REQUIRED before prod build** — blank = test ads |
| `EXPO_PUBLIC_ADMOB_REWARDED_ID` | plaintext | same; needs the AdMob account first |
| `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID` | plaintext | same |

The three AdMob values don't exist until the AdMob account/app is created —
that's fine: create the six known ones now, add AdMob's when the account
lands (or ship v1 with ads feature-flagged off; see ads research brief).

**NB on visibility:** `EXPO_PUBLIC_*` vars are always shipped to the
client by design. Supabase anon key is meant to be public (RLS gates
access). Don't put a Supabase service-role key in `EXPO_PUBLIC_*`, ever.

Verify before burning a build credit:
```bash
eas env:pull --environment production   # writes .env.production locally
cat .env.production                     # eyeball all four are set
```

## 3. IAP catalog setup in App Store Connect

Your 12 products are already reconciled across `purchases.ts` / `.web.ts` / `store-metadata.json` (commit 748e388). Types:

| Product | Type |
|---|---|
| coins500 / coins2500 / coins10000 / coins50000 | Consumable |
| gems100 / gems500 / gems1500 | Consumable |
| starter_pack | Non-Consumable |
| power_bundle / mega_bundle | Consumable |
| remove_ads | Non-Consumable |
| vip_pass | Non-Consumable (if one-time) or Auto-Renewable Subscription |

**Pick deliberately — Apple does not let you change type after creation.**

**Required fields per product:**
| Field | Constraint |
|---|---|
| Reference Name | ≤64 chars, internal, editable |
| Product ID | ≤100 chars, **immutable, never reusable across any of your apps even after deletion** |
| Type | **immutable** |
| Price Tier | Required |
| Display Name (per locale) | 2-30 chars |
| Description (per locale) | ≤45 chars |
| App Review Screenshot | Required for review (PNG/JPG of offer in your UI) |
| Review Notes | ≤4000 chars; put test instructions here |

**Critical:** burn a Product ID, it's gone forever for every app on
your account.

**Where:** ASC → CHROMA → **Monetization** sidebar → **In-App Purchases**.

**Before any IAP earns money:** complete ASC → **Agreements, Tax, and
Banking**:
1. Sign Paid Applications Agreement.
2. Enter banking info (US checking, routing + account).
3. Complete W-9 (legal name + SSN or EIN).
4. Wait for status to flip **Pending → Active**. Until active, sandbox
   purchases work but production purchases fail at the store layer.

**Sandbox testers:** ASC → Users and Access → Sandbox → Testers. Use
throwaway emails (`kiwilefohn+sandbox1@gmail.com`). Once an email is
sandbox-burned it cannot become a real Apple ID.

**Receipt validation end-to-end:**

> **Superseded 2026-06-09 — see `iap-implementation-plan-2026-06.md`.** The
> `/verifyReceipt` + `21007` dual-path described here is Apple's DEPRECATED
> legacy flow; do not build it. The current plan: react-native-iap v15 hands
> the StoreKit 2 **JWS** as `purchase.purchaseToken`; the server verifies it
> locally with `@apple/app-store-server-library` (no call to Apple needed).
> Also note the CRITICAL pre-step: `purchases.ts` is written against the v12
> API and must be migrated to v15 (`transactionReceipt` no longer exists) or
> every real purchase charges without crediting.

1. Phase 0 (client v15 migration + StoreKit config file) and Phase 1 (JWS
   validator) per the IAP plan doc.
2. On device + sandbox account: buy a coin pack; confirm server validates the
   JWS and the credit lands once (replay a second POST → 400, no double-credit).
3. Run all 12 product IDs through this. Yes, all 12.

## 4. TestFlight 1.0 pipeline

```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

EAS submit needs an **App Store Connect API key** (NOT your Apple ID
password). Generate: ASC → Users and Access → Integrations → App Store
Connect API → new key with "App Manager" role.

After upload, ASC processes the build for 10-30 min.

**Internal vs External testers:**

| | Internal | External |
|---|---|---|
| Cap | Up to 100 | Up to 10,000 |
| Who | ASC team members | Anyone with email or public link |
| Review required | **No** | **Yes** — first build per version (24-48 hr) |
| Lead time | Minutes after processing | 24-48 hr |

**Plan:**
1. Internal first — seed 3-5 friends. Internal-only builds expire 90 days after build.
2. After 3-7 days of internal dogfood, promote to external.
3. Submit for Beta App Review (lighter than full App Store Review, focuses on stability + IAP compliance).
4. Share public TestFlight link. Aim for 20-50 external testers.

## 5. App Store review gotchas — 2025-2026

Modern rejection patterns hitting first-time submitters hardest:

1. **Age rating overhaul (Jul 2025, enforced Jan 31 2026).** New 13+/16+/18+ tiers. New age-rating questionnaire in ASC; skipping/stalling blocks submissions.
2. **Loot-box / randomized reward disclosure (Guideline 3.1.1).** **Apps offering randomized virtual items MUST disclose odds before purchase.** Your daily wheel + any randomized bundle falls under this. Build a screen accessible from the wheel: "Chances: 70% coins, 20% gems, 10% jackpot." Generic copy won't pass. In Australia, loot-box content auto-rated 15+ regardless of other content.
3. **Notification permission timing (Guideline 5.1.1).** ✅ **Already fixed in FTUE Move 2** — notif prompt now gated on `highestLevel >= 1`, no longer fires on first home view.
4. **Misleading pricing.** ✅ Already removed strikethrough fake-discount banners in commit 380cab8.
5. **IAP that resembles gambling.** Variable jackpot tiers OK as long as: (a) odds disclosed pre-purchase, (b) currency cannot cash out for real money, (c) no leaderboards rewarding spend. Disclosed = OK. Hidden = rejected.
6. **Ad placement (Guideline 4.2 + 1.4.4).** Pattern that passes: rewarded ads (user opts in) + interstitials at natural break points with frequency cap. ✅ Already on this pattern.
7. **Crash on first launch (Guideline 2.1).** #1 indie rejection cause. The DEV STUB → `requestPurchase` switch is the #1 risk — test on real device + real Apple ID + sandbox account.
8. **AI consent (Nov 2025).** Only relevant if you send user data to external AI providers from the client. CHROMA doesn't — ignore.
9. **Xcode 26 SDK requirement, effective April 2026.** Verify EAS Build's iOS image is on Xcode 26: `eas build:inspect` or check EAS dashboard's iOS image setting. Old SDK = automatic rejection.

## 6. Launch-week sequencing checklist

Treat as **2-3 weekend pushes + nightly 1-hour windows**, not a single sprint.

### Week 1 (heads up — could be finals week)
- Day 1: submit individual enrollment ($99, individual, NOT org). Confirm Apple Account legal name = "Isaac Lefohn." Save Enrollment ID.
- Day 1-2: EAS env vars for all four `EXPO_PUBLIC_*` in production env. Update `eas.json` production profile. `eas env:pull` to verify.
- Day 2-3: prepare ASC product registration spreadsheet (12 rows × required fields). Do NOT enter into ASC yet (membership not active).
- Day 4-7: IAP Phase 0 + Phase 1 per `iap-implementation-plan-2026-06.md` —
  v15 API migration in purchases.ts (CRITICAL: v12-era calls silently break
  on-device), JWS validator with @apple/app-store-server-library, StoreKit
  config file for simulator testing. (The old "mock 21007 sandbox fallback"
  step belonged to the deprecated verifyReceipt flow — dropped.)

### Week 2 (post-finals — wait state on enrollment)
- Wait for Apple enrollment.
- Once approved: immediately complete Paid Apps Agreement + W-9 + banking in ASC.
- Once active: create the App in ASC (`com.isaaclefohn.chromadrop`, primary category Games → Puzzle).
- Register all 12 IAP products. Triple-check Product IDs match client + server + metadata.
- Add 3-5 sandbox testers.
- Generate App Store Connect API key for EAS submit.

### Week 3
- First production build: `eas build --platform ios --profile production`.
- `eas submit --platform ios --latest` → wait for processing.
- Add yourself + 3-5 friends as internal TestFlight testers.
- Run sandbox purchase against each of 12 products. Confirm receipts validate, entitlements grant.
- Build odds-disclosure screen for the daily wheel + jackpot bundles.

### Week 4
- Open external TestFlight beta. Submit first external build for Beta App Review (24-48 hr).
- Once approved, share public TestFlight link. Target 20-50 external testers (friends, OSIG, r/iosbeta).
- Collect crash reports via Sentry, IAP failures, UI bugs.

### Week 5-6
- Iterate. 2-3 builds likely. New builds after the first usually skip re-review on the same version string.
- Prepare App Store metadata: 5-10 screenshots per device size (6.7" + 6.1" iPhone required minimum in 2026), promo text, description, keywords (use `store-metadata.json` keywords), support URL, **privacy policy URL** (mandatory — Notion page hosted publicly is fine).
- Complete the new age-rating questionnaire (2025 update). Answer honestly about randomized rewards → expect 13+ rating, possibly higher in Australia.

### Week 7
- Submit for App Store Review. Typical 24-48 hr. Plan for one rejection cycle.
- Read rejection precisely; fix the specific guideline cited; resubmit.
- Plan public launch for late July or early August if all goes well.

**Apple Developer enrollment + W-9/banking = your critical-path serial sequence. Everything else can parallelize.**

**Do not submit to the App Store without explicit approval. Final submission is your call.**

## Sources
- [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)
- [Apple Developer Help — Enrollment](https://developer.apple.com/help/account/membership/program-enrollment/)
- [Apple Developer Forums — 2026 enrollment delays](https://developer.apple.com/forums/thread/822540)
- [Expo EAS env vars](https://docs.expo.dev/eas/environment-variables/)
- [Expo iOS submit](https://docs.expo.dev/submit/ios/)
- [ASC In-App Purchase reference](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information/)
- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple News — updated age ratings (ks775ehf)](https://developer.apple.com/news/?id=ks775ehf)
