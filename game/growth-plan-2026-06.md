# CHROMA Growth Plan — Launch + 90 Days

Source: live research, 2026-06-14. The **post-launch** companion to
the pre-launch playbook (`launch-playbook-2026-06.md`).

## Bottom line

**Do not run Apple Search Ads on launch day.** The auction is hostile
to apps with zero conversion history or ratings; realistic CPI for a
fresh indie puzzle game is $13+ vs $3 benchmark. Spend the first 30
days harvesting ratings, pumping organic clips to TikTok/Reels, and
posting two Reddit launch threads + an App Store Connect featuring
nomination. **Start ASA only after Day 30** with a $10/day test if and
only if you hit 50+ ratings, D1 ≥30%, page CVR ≥3%. Skip Discord at
launch (open Day 30+ if 30+ engaged players exist). Skip an X/Twitter
dev account — wrong audience.

## Three signals to watch in the first 30 days (decide inflection vs flatline)

1. **Ratings velocity** — target ≥3/day organic by Day 14, ≥5/day by Day 30. Below 1/day at Day 14 = flatline.
2. **D1 retention** — iOS puzzle benchmark 35-40%. Below 30% at Day 14 = FTUE leaks faster than UA compounds.
3. **App Store search impression-to-product-page rate** (ASC "Tap-Through Rate") — target ≥3-5% on category searches. Below 2% = the icon/first screenshot/title is losing the screenshot fight at the impression level. Fix creative before fixing anything else.

**Inflection vs flatline at Day 30:**
- All three green → continue free playbook, start ASA test.
- Two of three green → fix the broken signal first, defer ASA to Day 45.
- One or zero green → emergency review (screenshots / FTUE / rating prompt). Do NOT spend money.

## Apple Search Ads: NO at launch, conditional YES at Day 30

Why not at launch:
- Auction logic punishes new entrants. Cost-per-tap is decided by a second-price auction weighted by relevance, which is driven by historical tap-through + install-through rates. Zero history = entry-tax floor.
- Conversion-rate multiplier is missing. Game-category page CVR is 3-5%, with action/arcade/card around 10-12% **only when the page has social proof**. A 5-rating cold start converts at 1-3%.
- At $0.80 CPT × 30% tap rate × 2% page conversion → **~$13 per install**, vs $3 iOS-puzzle benchmark.

**Recommended ASA phase plan:**

| Phase | Days | ASA action | Daily budget |
|---|---|---|---|
| Cold start | 0-30 | **Off.** Claim the $100 new-account credit but don't spend it. | $0 |
| Test cycle | 30-60 | $10/day **IF** gating signals met | $10 |
| Scale cycle | 60-90 | $20-30/day on profitable keywords only | $20-30 |

**Day 30 bid structure** (if signals green):
- **Brand campaign** (`chroma`, `chroma drop`, `chromatic puzzle`): $0.50 max CPT, $2/day. Will probably clear at $0.05-0.15. Defensive vs ChromaHunt cannibalizing "chroma" hits.
- **Exact match** (`block puzzle`, `color block`, `color puzzle game`): $0.80 max CPT, $6/day. **Avoid `block blast`** — cannot win that auction.
- **Discovery (broad match)**: $0.30 max CPT, $2/day. Free-data harvester; Apple shows you the queries that triggered taps.

**Kill criteria:** pause any keyword with 50+ taps and 0 installs. Pause any campaign with CPI > $4 sustained over 7 days. Pause everything at Day 60 if total spend hasn't generated $0.50 of attributable LTV per install (rewarded-ad eCPM × ads/session × D7 retained).

## Rating prompts: all 3 system slots in the first 30 days, on tight triggers

Apple allows up to 3 `SKStoreReviewController` prompts per user per 365 days. Apple does NOT tell you whether the prompt actually displayed or what rating was given. HIG: prompt at a moment of satisfaction after a positive event, never first launch, never after failure, never mid-task.

**Schedule:**

| Prompt # | Trigger | Why this spot |
|---|---|---|
| **1** | After Chapter 1 boss win (level 30), if `crash_free_session && session_count >= 2` | Highest local satisfaction peak. Player just beat a *named* boss in a themed chapter. Analogue of "completed a meditation streak." |
| **2** | After daily streak day 7, on app open with streak-shield-intact state | Self-selected high-intent player; rate-of-return is the strongest "this app stuck for me" signal. Day 7 not Day 5 — Day 5 hasn't survived the typical Day 6-7 churn cliff. |
| **3** | After a perfect-clear cascade at any campaign level ≥50, within 90 days of Prompt 2 | Reserved for late-funnel "wow" moments. |

**Do NOT prompt:** after level 1 (no context), after a fail streak (poisons the score), on level-up screens that already have an ad (ad fatigue).

**Beyond system prompts:** add a soft Settings link "Loving CHROMA? Tell us" that opens `https://apps.apple.com/app/idXXXXX?action=write-review` — unlimited, catches the motivated 1%.

**Velocity target, first 30 days:** 50 ratings is the seed-network floor (matches launch-playbook). Real organic compounding starts at ~50-100. The **200-rating mark** is where conversion rates measurably lift; track that as your inflection threshold.

## Discord: NO on launch, MAYBE on Day 30

Three problems for a solo mobile dev:
- **Moderation cost.** A dead Discord with 4 lurkers hurts more than no Discord.
- **Audience mismatch.** Mobile puzzle players congregate on TikTok / App Store reviews / r/iosgaming, not per-game Discords.
- **Discord's own data:** 6x play-time lift requires 1+ friend present, which requires a multiplayer hook CHROMA doesn't have.

**Concrete pattern:** use the App Store reviews thread as community for the first 60 days. **Respond to every review** — developer responses are now indexed by Apple's algorithm. Same activation-and-engagement loop as Discord, compounds your ASO instead of pulling players off-platform.

Open Discord Day 30-45 only if you have 30+ engaged repeat players actively asking for it (look in reviews for "where can I tell you X").

## TikTok / Reels: YES, organic only, gameplay-cold-open format

CHROMA's chromatic-cascade IS TikTok-shape — color changes read in 1-2 seconds, the "did that just clear 6 colors at once?" moment is a fundamentally legible visual hook.

**Format winner** (Acorn Games empirical 2025 data):
- **Gameplay-only with on-screen text overlay**, NOT dev-talks-to-camera, NOT memes/trends.
- **60-90 seconds**, not 15. Past-the-halfway-mark watch time is a stronger algorithm signal than partial loops.
- **Structure:** (1) cold open with most-arresting visual in first 1.5s — for CHROMA, a 6-hue cascade. (2) Show gameplay matter-of-fact for 5-10s. (3) Reveal the rule that makes it puzzle-y, leave one question unanswered. (4) Soft CTA in last frame ("CHROMA" wordmark + "search the App Store").
- **Cadence:** 5-7 clips/week, post mid-week and Sunday evening. Don't delete underperformers — old videos get rediscovered when one hits.
- **Cross-post to Reels and YouTube Shorts** with zero edits.

**What failed in 2025:** dev-on-camera talking about the game; trends/memes; 15s loops without payoff frame.

**3-second test:** the chromatic cascade IS TikTok-shape. The Wordle-format run-trace share cards are NOT (delayed-payoff format, not visual-payoff). **Lead with cascades.**

## Six concrete moves under 4 hours each

### Launch week (Days 0-7)

**Move L1 — App Store Connect Featuring Nomination (~1.5 hrs).** Submit via ASC → My Apps → CHROMA → App Store → **Featuring**. Lead with the chromatic-cascade mechanic + the 7-level Chapter 1 narrative; reference Phozzle and the May 2026 ADA finalists' theme-and-personality criteria. Apple's guidance is 3+ weeks lead time, but submit at launch — best case editorial picks at Week 4.

**Move L2 — Reddit launch threads on Day 2 (~2 hrs total).** Two separate threads, 24-48 hrs apart, NOT same day:
- **r/iosgaming**: "I made a puzzle game where you clear by color cascade — Chapter 1 is free, no ads in first 7 levels"
- **r/PuzzleGames**: "Solo dev — looking for feedback on a chromatic-clear puzzle mechanic"

Include 1 gameplay GIF (the 6-hue cascade) in each. Free price, App Store link, **respond to every reply within 2 hours**. Don't crosspost — flagged.

**Move L3 — TikTok account + first 5 clips, batch-recorded (~3 hrs).** Username `@chromathegame` or `@playchroma`. Record 5 cascades using iOS Screen Recording at 60fps, edit with CapCut (free) using 60s cold-open-then-reveal structure. Schedule one per day M/W/F/Su/Tu. Cross-post to Reels + Shorts unedited.

### Days 30-90

**Move M1 — ASA test at Day 30, conditional (~2 hrs setup + 30min/wk × 4 wks).** Only if gating criteria met. $10/day across the 3 ad groups above. Weekly Sat-morning 15-min review: pause losers, promote winners. **Hard kill at $300 total spend** with no positive ROAS.

**Move M2 — TouchArcade / 9to5Mac press pitch at Day 45 (~3 hrs).** Both covered Phozzle as Indie App Spotlight. Pitch format: subject line "Solo OSU student dev — chromatic-cascade puzzle game with Wordle-style share cards." 80 words max body, one screenshot, one TestFlight promo-code link. Email Federico Viticci-style direct addresses. Two pitches 24-hr gap, then drop it — no follow-ups.

**Move M3 — Run-trace share card weekly contest at Day 60 (~3 hrs setup, ongoing).** Pin a tweet/Reddit thread weekly: "Best chromatic share card of the week wins a Remove Ads promo code." Use OSU network + seed-50 to seed first 10 entries. **Promo codes are free** from ASC (100/version limit). This is Wordle-format community without Discord overhead — share images posted with #chromasweep, you pick weekly.

## 2025-2026 changes that shaped this plan

- **Apple Ads** is the new product name (April 2025 rebrand); auction got harder for cold-start indies because Apple now feeds SKAdNetwork attribution signals back into relevance score.
- **Age-rating overhaul** (enforced Jan 31 2026) — already in launch playbook; loot-box odds disclosure is critical.
- **App Store algorithm** shifted toward engagement metrics (D1/D7 retention, time-in-app, repeat sessions) — retention work compounds ASO directly. Every D1 percentage point you add lifts impression rank organically. Why prompts 1+2 are at engagement peaks, not first level.

## Sources

- [Apple Search Ads Guide 2026 — SparrowApps](https://sparrowapps.io/articles/apple-search-ads-guide/)
- [Apple Search Ads Guide for Indie Devs — Sonar](https://trysonar.app/blog/apple-search-ads-guide)
- [Apple Ads Best Practices 2026 — Adapty](https://adapty.io/blog/apple-ads-best-practices/)
- [CPI Rates 2025 — Business of Apps](https://www.businessofapps.com/ads/cpi/research/cost-per-install/)
- [Apple Developer — SKStoreReviewController](https://developer.apple.com/documentation/storekit/skstorereviewcontroller)
- [Apple HIG — Ratings and Reviews](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews)
- [Mobile Game Retention Benchmarks — Mistplay](https://business.mistplay.com/resources/mobile-game-retention-benchmarks)
- [Indie Dev TikTok Guide 2025 — Acorn Games](https://acorngames.gg/blog/2025/8/10/the-indie-devs-guide-to-mastering-tiktok-in-2025)
- [How Block Blast Shattered Records — Gamesforum](https://www.globalgamesforum.com/news/how-block-blast-shattered-records-with-ai-a-b-testing-and-a-bold-bet-on-long-term-players)
- [Discord Game Developer Playbook](https://discord.com/blog/the-game-developer-playbook-part-two-early-access-and-pre-launch)
- [App Store Connect — Featuring Nominations](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring/)
