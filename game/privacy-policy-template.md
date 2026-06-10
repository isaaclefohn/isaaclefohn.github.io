# CHROMA Privacy Policy — TEMPLATE

> **➡️ SUPERSEDED 2026-06-09:** a publication-ready page now lives at
> `chroma/privacy/index.html` (repo root, this branch) — it goes live at
> `https://isaaclefohn.com/chroma/privacy/` when merged to main. The page
> CORRECTS two false claims in this template: (1) the app ships with NO ATT
> prompt (NPA-only ads — the template's ATT language described UI that does
> not exist), and (2) there is NO in-app analytics opt-out toggle (email-based
> opt-out instead; toggle queued as a feature). The lawyer/generator review
> advice below still applies before submission.

> **⚠️ THIS IS A TEMPLATE, NOT LEGAL ADVICE.**
>
> This document is a starting point grounded in what CHROMA's code
> actually collects. Before publishing as your App Store privacy
> policy URL:
>
> 1. **Have a lawyer or licensed paralegal review it** (OSU's Center
>    for Legal Studies has student-rate options; a one-hour review
>    runs ~$50-150 in Oregon).
> 2. **OR use a generator that asks the right questions and produces
>    jurisdiction-aware copy** — Termly, iubenda, Termageddon. Free
>    tiers exist; Termly's "free forever" works for indie launches.
> 3. **Verify the data list against the live code at the time of
>    publish.** Code drifts; this template reflects state on the date
>    in the footer.
>
> Apple App Store requires:
> - A working privacy-policy URL submitted in App Store Connect.
> - The privacy policy must match the **App Privacy questionnaire**
>   you fill in App Store Connect (also describes what you collect).
> - Inconsistencies between the two are a documented rejection
>   trigger.

---

**Effective date:** [TO FILL IN BEFORE PUBLISH]

**Last updated:** [TO FILL IN BEFORE PUBLISH]

**Contact:** kiwilefohn@gmail.com (replace with a dedicated support
email if you set one up — e.g., `support@chroma.game` if you secure
the domain).

## 1. About CHROMA

CHROMA ("the App") is a single-player block-puzzle game with optional
leaderboards, daily challenges, in-app purchases, and ads. Developed
and operated by **Isaac Lefohn**, Oregon, USA, as a sole proprietor.

## 2. What we collect

### Account / identity

- **Anonymous Supabase sign-in.** When the App opens, we sign you in
  anonymously to our backend (Supabase). The sign-in creates a
  randomly-generated user ID stored on your device and on our server.
  This ID is **not linked to your name, email, phone, or any real-world
  identity**. You can wipe the local copy by deleting and reinstalling
  the App.
- **Optional display name** (you choose) for leaderboards. If you set
  one, it is associated with the anonymous ID above and visible to
  other players in the leaderboard list.

### Gameplay / app usage

- **Scores, levels reached, streaks, achievements.** Stored on your
  device and synced to our backend for leaderboard and stats display.
- **Anonymized event analytics** via **PostHog (US region)**: when you
  open a screen, start/win/fail a level, watch an ad, claim a reward.
  No level seed, board state, or in-game choices are sent. PostHog's
  privacy policy: https://posthog.com/privacy

### Purchases

- If you buy in-app purchases, **Apple processes the payment** — we
  never see your payment method. Apple sends us a receipt to verify
  the purchase server-side. We store: the product ID purchased, the
  transaction timestamp, and an entitlement flag (e.g., "ad-free"
  active) tied to your anonymous user ID.

### Ads

- **Google AdMob** serves banner / interstitial / rewarded ads when
  applicable. AdMob may collect device identifiers (IDFA on iOS) for
  ad personalization, subject to the **App Tracking Transparency (ATT)**
  prompt you saw on first open. If you declined ATT, AdMob falls back
  to non-personalized ads. Google's privacy policy:
  https://policies.google.com/privacy

### Crash reports

- **Sentry** receives anonymized crash and error reports when the App
  malfunctions. These include stack traces, device model, OS version,
  and a randomized session ID. No personal data. Sentry's privacy
  policy: https://sentry.io/privacy/

### What we DO NOT collect

- We do not collect your name, email address, phone number, photos,
  contacts, location, microphone audio, camera images, health data,
  or any other personal information beyond what is listed above.
- We do not sell or rent any data to anyone.
- We do not use AI providers or send any user data to LLMs.

## 3. How we use what we collect

- **Run the leaderboards** (display anonymous scores to other players).
- **Sync your progress across devices** (if you ever add Apple sign-in
  later — currently not implemented).
- **Validate purchases** so you actually receive what you paid for.
- **Detect and fix crashes** via Sentry.
- **Understand what features players use** via PostHog analytics —
  e.g., "how many people finish level 5?" — so we can improve the
  game.
- **Serve ads** that pay for development.

We do **not** use any of this data for personalized advertising
outside the App, sell it to third parties, or train AI models on it.

## 4. Third-party services

CHROMA uses the following third-party services. Each has its own
privacy policy linked above:

- **Supabase** (backend database and auth) — https://supabase.com/privacy
- **Upstash Redis** (leaderboard storage) — https://upstash.com/trust/privacy
- **Vercel** (API hosting) — https://vercel.com/legal/privacy-policy
- **PostHog (US region)** (analytics) — https://posthog.com/privacy
- **Google AdMob** (ads) — https://policies.google.com/privacy
- **Sentry** (crash reporting) — https://sentry.io/privacy/
- **Apple** (App Store and IAP) — https://www.apple.com/legal/privacy/

## 5. Data retention

- **Local data** lives on your device until you delete the App.
- **Backend data** (anonymous user ID, scores, leaderboard entries,
  purchase records) is kept for as long as the App is operating, or
  up to **24 months** after your last play session, after which we
  anonymize or delete it.
- **Crash reports** are retained for **90 days** then deleted.
- **Analytics events** are retained per PostHog's default policy
  (currently 7 years for cohort analysis, but rolling for individual
  events).

## 6. Your rights

- **Delete your data.** Email kiwilefohn@gmail.com from any address
  including your display name (if you set one) or anonymous user ID
  (visible in Settings → About once that screen exists). We will
  delete the corresponding backend records within 30 days.
- **Opt out of analytics.** Disable in Settings → Privacy → Analytics
  (toggle exists in code).
- **Opt out of personalized ads.** iOS Settings → Privacy → Tracking →
  toggle CHROMA off. Apple controls this; we honor whatever you set.
- **EU residents (GDPR):** you have the rights of access, rectification,
  erasure, restriction, portability, and objection under Articles 15-22.
  Email us to exercise any of these.
- **California residents (CCPA):** you have the rights of disclosure
  and deletion. Same contact email; we do not sell personal information
  so there is no "Do Not Sell" link to provide.

## 7. Children

CHROMA is rated [INSERT AGE RATING after completing App Store age
questionnaire]. If the rating is 13+, we do **not** knowingly collect
data from children under 13 (COPPA). If you believe a child under 13
has used the App and provided data, email us and we will delete it.

## 8. Changes to this policy

We may update this policy when we add features, change vendors, or
adapt to new regulations. The "Last updated" date at the top reflects
the most recent change. Material changes will be announced in-App on
the first launch after the change.

## 9. Contact

Questions, requests, or concerns: **kiwilefohn@gmail.com**

---

**Hosting:** Apple requires this policy at a publicly-reachable URL.
Easy options:

- **Notion page set to "Share to web"** — free, no server. URL looks
  like `notion.so/Privacy-Policy-XXXX`. Apple accepts this.
- **GitHub Pages** — put a `privacy.html` (rendered from this markdown)
  on `isaaclefohn.com/chroma/privacy/`. Looks more professional.
- **Termly / iubenda hosted page** — comes with their template.

Confirm the URL renders publicly (no login required) before pasting
into App Store Connect. Apple's automated checks fetch it.

---

**Template version:** 0.1 (2026-06-14, generated from CHROMA's code
state on branch `claude/mobile-game-ios-OoTpg`).
