# CHROMA Ad-First Monetization Plan — June 2026

Source: live research wave, 2026-06-14.

## Bottom line

Ship CHROMA **ads-first** with a **rewarded-heavy, interstitial-light,
no-banner** mix:

- Interstitial cadence unchanged (1 per 3 events + 2-min floor) but
  **trigger moved off level-win and onto lose-modal dismiss** — Block
  Blast Classical pattern, not Adventure. Punishing success is the
  wrong dopamine arc for a puzzle game.
- **Pour design energy into rewarded surfaces.** Already wired:
  double-coins, extra-life, free-power-up. Add:
  - **Rewarded daily-wheel re-spin** (one per day, AFTER the natural
    reward fires — never gating the dopamine).
  - **Rewarded streak-shield refill** (one per week, prevents real loss
    moments, genuine player value).
  - **Rewarded free power-up** in the Shop power-ups tab.
- **Skip banner ads at launch.** ~30x lower eCPM than rewarded; ~5-8%
  of total ARPDAU for a meaningful UX cost. Defer to a v1.1 A/B test
  if we cross 2k DAU.
- **Drop `remove_ads` to $2.99** (was $3.99). Casual puzzle take-rate
  research: 1–3% of DAU at $1.99–$2.99 vs 0.5–1% at $3.99+. Volume
  wins.

## Realistic eCPM (iOS US, 2026, casual puzzle)

| Format | Tier-1 typical eCPM | Notes |
|---|---|---|
| **Rewarded** | **$15–$25** (up to $40 optimized) | iOS US Q4 2024 baseline $19.63 |
| **Interstitial** | **$10–$15** | iOS US averaged ~$14.32 in 2025 |
| **Banner** | **$0.30–$0.60** | ~$0.45 average |

Solo dev on AdMob alone, week 1, **no historical fill data → expect
40–60% of these** until the network learns the user pool. Plan first
4 weeks at the low end ($10 rewarded, $6 interstitial, $0.25 banner).

## Where ads go, screen by screen

| Screen | Recommendation |
|---|---|
| HomeScreen | **No banner. No interstitial.** Home is the IAP funnel + next-action surface. |
| GameScreen (active) | No ads. Correct already. |
| GameScreen **lose modal** | **Rewarded** for extra life (already wired). **Interstitial** on retry/home dismiss path *only if* cap permits. **This is the highest-value ad surface in the game.** |
| GameScreen win modal | **Optional rewarded** for double-coins (already wired). **No interstitial** — don't punish success. |
| LevelSelect | Nothing. |
| DailyChallenge | Nothing on the wheel. **Rewarded re-spin once/day** *after* the natural reward celebration finishes. |
| Leaderboard | Nothing. Social/identity surface. |
| Shop | **Rewarded for free power-up** option above the coin-purchase row. **No ads on the IAP paywall** — converting IAP funnel to ad views is 1/100th the value. |
| Settings / BattlePass | Nothing. |

**Streak shield / daily wheel / tomorrow-promise triad: preserved
exactly.** No ad before, during, or immediately after the wheel spin
animation. Rewarded re-spin offer appears only after the celebration
sequence finishes.

## Launch-week revenue ceiling (week 1, no AdMob optimization yet)

Per-DAU daily revenue ≈ **$0.017** (0.8 rewarded × $10/1000 + 1.5
interstitial × $6/1000).

| DAU | Daily gross | Monthly |
|---|---|---|
| 100 | ~$1.70 | ~$50 |
| 500 | ~$8.50 | ~$255 |
| 2,000 | ~$34 | ~$1,020 |

At 2k DAU you clear the $99 Apple dev fee in your first 3 days and
hosting is rounding error. **But:** puzzle-genre benchmark is
$0.08/DAU/day (AppsFlyer 2025) — your week-1 figure is ~20% of that;
plan to grow to ~$0.04 by month 3, ~$0.06 by month 6 as AdMob learns.

**Ad revenue won't be meaningful until ~5k DAU**, which for a solo
indie launch is a 6-month-plus trajectory at best. **Launch ads are
about learning the system and proving the funnel, not paying rent.**

## What shipped this session (from this research wave)

- ✅ `remove_ads` price drop $3.99 → $2.99 (`purchases.ts` + `store-metadata.json`)
- ✅ Interstitial moved off win path → lose-modal dismiss (`GameScreen.tsx` handleRetry / handleHome)

## What's still TODO

- [ ] Rewarded daily-wheel re-spin (DailyRewardModal — appears AFTER win celebration)
- [ ] Rewarded streak-shield refill (HomeScreen modal when shield consumed)
- [ ] Rewarded free power-up (ShopScreen power-ups tab)
- [ ] **Catalog mismatch:** `purchases.ts` has 12 products, `store-metadata.json` has 7. App Store Connect rejects IAP submissions where in-code SKUs don't exist in metadata. Must reconcile before launch.
- [ ] **IAP dev stub:** `ShopScreen.handleBuyIAP` grants rewards without calling `requestPurchase`. Blocked on Apple Developer enrollment.

## Anti-patterns explicitly ruled out

(per dopamine research + ethical line from prior research synthesis)

- No FOMO triggers on failure (countdown timers, "act now or lose")
- No fake-discount banners
- No timer-pressure on agreement screens
- No subscription-only ad-removal (one-time purchase, Apple reviewer-friendly)
- No ad immediately before or during a variable-reward dopamine arc
