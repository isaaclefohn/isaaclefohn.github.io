# CHROMA FTUE Audit — June 2026

Source: live FTUE research, 2026-06-14. The first 90 seconds for a
brand-new player traced + 3 concrete moves under 1 hour each.

## Bottom line

**The first 50 raters will be mildly frustrated, not delighted — and
the reason is not the game, it's that CHROMA's signature move is
invisible to them.** The block-puzzle loop works. The TutorialOverlay
mentions "Chroma Bonus" in step 3. But that's text on a dismiss-by-tap
modal before the player has placed a single piece. By the time they
actually trigger a chromatic clear — probabilistic on a 4-color board
~25% of first clears — they've forgotten the word and the screen
erupts with confetti, "CHROMATIC!" hype banner, gold flashes, board-
wide cascade for reasons they cannot connect to the move they just
made. That's the entire pitch of the game, and it goes unattributed.
They will rate this 3-4 stars and write *"fun blast-puzzle clone with
extra animations."* A small set of in-context labels — added in under
3 hours of work — moves them to 4-5 stars and *"wait, this is its own
thing."* That gap is the audit.

## The first 90 seconds, traced

| Time | What happens | Issue |
|---|---|---|
| 0:00-0:03 | BrandSplash — 6 colored blocks drop into wordmark + tagline | ✅ Good. 6-hue identity registers. Don't touch. |
| 0:03-0:08 | Home screen animates in: title, tagline, stats bar (0/0/0), Play, Today's Puzzle, 4 hub icons, 4 utility tiles | ⚠️ 7 CTAs around the Play button for a player who's never played. Three zero counters they have no narrative for. |
| 0:08-0:11 | Tap Play → GameScreen level 1 | OK |
| 0:11-0:35 | TutorialOverlay — 4 steps text-walls. Step 3 mentions "Chroma Bonus — Clear a line that is ALL ONE COLOR." | ⚠️ No piece placed yet. Signature move is one bullet of declarative text. ≥60% skip rate. |
| 0:35-1:30 | First placement + first clear (~60s for most users). Chromatic clear only fires if cleared line is monochrome — ~25% on 4-color board | ❌ **75% of players never see the signature mechanic in their first session.** The 25% who do see a 1.5s sensory event with NO LABEL attributing it to the move they made. |
| 1:30-2:30 | Win modal: stars, score, stats, +coins, leaderboard, Next Level. TomorrowPromise is on LOSE path, not seen by winners. | TomorrowPromise wasted on the most engaged first-session players. |
| 2:30+ | Back to home — DailyRewardModal auto-fires. First wheel spin. | OK — but the daily-reward cadence is unexplained. |

**The 3-minute test:** NO. The player does NOT understand the chromatic
clear mechanic by 3 minutes unless RNG hands them an explanatory moment.

## What's missing from onboarding

1. **The chromatic clear has no in-context explanation the first time it fires.** Highest-leverage gap. `GameScreen.tsx:358` is where the cascade celebration starts — that's where to inject a one-shot `first_chromatic` tip.
2. **The near-chromatic hint has no first-time label.** `NearChromaticHint` in `BoardEffects.tsx:385` draws a pulsing colored bar — brilliant signal, but reads as generic "you can clear this row."
3. **The 6 hues / 6 letters identity is on the splash + screenshots, never in the game.** No on-board explanation that level 1 uses 4 colors and the palette shrinks/grows by world.
4. **Boss-level theming is invisible until level 30.** Chapter 1 (Ignition / Cascade / Resonance / Convergence / Saturation / Spectrum / Singularity) is 28+ levels away — no horizon on the home screen.
5. **The daily reward modal cadence is unexplained** the first time it fires.
6. **The TutorialOverlay is fired off-board, not over the board.** Dimmer covers the board the user is being told to interact with.

## What's IN onboarding that should be cut

1. **`Tutorial.tsx` is dead code.** HomeScreen imports it, holds `showTutorial` state set to false forever, renders conditionally. ~180 lines of orphaned onboarding text that contradicts TutorialOverlay. Delete.
2. **Stats bar shows 0/0/0 to first-timers** at `HomeScreen.tsx:358-408`. Communicates nothing, primes for grind. Hide when `totalScore === 0`.
3. **Daily Puzzle banner shows for first-timers** at lines 445-482. Strongest retention hook, wasted on someone who hasn't played level 1.
4. **Hub-button row + utility row** at lines 528-577 — eight CTAs around a Play button for level 0.
5. **Notification permission prompt fires on first home view** (line 193). Apple penalizes pre-permission asks in editorial review.
6. **`generateWelcomeMessage()` seeds an inbox message immediately** (lines 140-145). Manufactured-task dopamine bait on launch.

## Three concrete moves under 1 hour each

### Move 1 (~30 min) — Teach the chromatic clear the moment it fires

In `GameTip.tsx` add a new `TipId`:
```ts
first_chromatic: {
  title: 'CHROMATIC!',
  body: 'Single-color line = every block of that color detonates. This is the signature move. Plan your colors.',
  icon: 'sparkle',
  color: COLORS.accent,
},
```

In `GameScreen.tsx:358`, inside the chromatic celebration block:
```ts
if (!shownTips.includes('first_chromatic')) {
  setTimeout(() => {
    setActiveTip('first_chromatic');
    markTipShown('first_chromatic');
  }, 1400); // after the cascade animation lands
}
```

Add a sibling `first_near_chromatic` for the pulsing hint. Reposition
`GameTip` from `top: 100` to `top: 60` or anchor it to the board.

**This single change does more for FTUE than every other move combined.**

### Move 2 (~45 min) — Strip the home screen for first-timers

In `HomeScreen.tsx`:
- Delete `showTutorial` state + `Tutorial.tsx` import + conditional render. Delete `Tutorial.tsx` itself.
- Wrap stats bar (lines 358-408) in `{totalScore > 0 && ...}`.
- Wrap Daily Puzzle banner (lines 445-482) in `{highestLevel >= 1 && ...}`.
- Wrap hub-button row (lines 528-557) in `{highestLevel >= 1 && ...}`.
- Wrap utility row (lines 560-577) in `{highestLevel >= 1 && ...}`.
- Move `requestNotificationPermissions()` + `scheduleRetentionNotifications()` from home `useEffect` (line 186, 193) to a post-level-1-win path in `GameScreen.tsx`.
- Move `generateWelcomeMessage()` (line 140) behind a `highestLevel >= 1` guard.

Result: first-time home view = wordmark, tagline, Play, version. Visit
2 onward keeps every existing feature.

### Move 3 (~45 min) — Win-modal chromatic callout + chapter horizon

In `GameScreen.tsx` win modal (lines 1094-1108), add a row:
```tsx
{gameState.chromaticClears > 0 && (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>Chromatic</Text>
    <Text style={[styles.summaryValue, { color: COLORS.accent }]}>
      🌈 {gameState.chromaticClears}
    </Text>
  </View>
)}
```

In `HomeScreen.tsx:580` unlock-hint block, add a sibling for the
chapter horizon at levels < 30:
```tsx
{highestLevel >= 1 && highestLevel < 30 && (
  <View style={styles.unlockHint}>
    <GameIcon name="sparkle" size={12} color={COLORS.accent} />
    <Text style={[styles.unlockHintText, { color: COLORS.accent }]}>
      Chapter 1 — Chromatic: Ignition — Level 30
    </Text>
  </View>
)}
```

Plants the chapter narrative on visit 2 so the player has a 28-level
horizon they're climbing toward.

## One open design question

**Should level 1 be a procedural 4-color board (current) or a hand-
crafted "guaranteed first chromatic clear" tutorial board?**

- **(A) Keep procedural.** Honest curve, no smoke-and-mirrors. But
  ~75% of first-timers never see the signature mechanic in session 1.
  They review it as "Block Blast with confetti."
- **(B) Hand-crafted opening grid** where the first or second placement
  of the supplied piece sequence creates a chromatic clear by design.
  Every first-timer feels the cascade in-context. Trades authenticity
  for guaranteed teach. Block Blast's level 1 is engineered exactly
  this way — the first clear is essentially scripted.

Stakes: this is the difference between launch reviewers calling CHROMA
*"a blast-puzzle clone"* vs. *"the color-puzzle one with the
detonation."* Once the App Store algorithm has 50 reviews of either
flavor, you cannot re-author them.

Engineering cost for option B: ~2 hours (a `LevelTemplates.ts` entry
for `level: 1` with a fixed `seed` and a curated piecePool of three
pieces that geometrically converge to a same-color line). Half-scripted
is worse than either pure path.

## Files referenced

- `App.tsx` — splash mount
- `src/components/BrandSplash.tsx` — 6-block drop (good, leave alone)
- `src/screens/HomeScreen.tsx` — bloat at lines 358-408 (stats), 445-482 (daily), 528-557 (hubs), 560-577 (utils), 140-145 (inbox seed), 186-193 (notif perms)
- `src/screens/GameScreen.tsx` — tutorial trigger line 138, chromatic celebration 358-411, GameTip 1316-1320, win modal stats 1094-1108
- `src/components/Tutorial.tsx` — DEAD CODE, delete
- `src/components/TutorialOverlay.tsx` — 4-step text walls
- `src/components/GameTip.tsx` — extend with new TipIds
- `src/components/BoardEffects.tsx:385-448` — NearChromaticHint
- `src/components/GameBoard.tsx:60` — nearChromatic state to lift up
- `src/store/settingsStore.ts` — shownTips + markTipShown already in place
- `src/game/levels/LevelTemplates.ts` — where the hand-crafted level 1 would live for option B
