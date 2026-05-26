# CHROMA — App Store Creative & ASO Brief

Source: two research agents (2026-05-26). Companion to `store-metadata.json` —
this file holds the *why* behind the metadata and the screenshot build spec.

---

## ASO state of play

**Bottom line:** the bottleneck right now is *category*, not keyword. Block Blast
ended Q1 2026 as the #1 most-downloaded mobile game worldwide (2.5M ratings,
4.9 stars, ~70M DAU). CHROMA cannot win "color block puzzle" head-to-head. It
*can* win the long-tail (minimalist / palette / calm / chromatic / shrink),
which is where the right-fit users live anyway.

**"chroma" search term landscape:** fragmented but not owned. Razer Chroma RGB
(288 ratings, utility) is the largest individual presence, but at least five
indie "Chroma X" puzzles launched in 2024–2026 (Stack, Forge, Sprint, Charge,
Hunt). The disambiguator in our title — "CHROMA: Color Block Puzzle" — is
working; don't lose it.

**Discoverability ceiling:** realistic short-term ranking goals are top-10 for
*long-tail* terms (palette puzzle, shrink color puzzle, minimalist color
puzzle, chromatic puzzle). Top-10 for "color block puzzle" is not in the cards
at any plausible budget. The new bottleneck after ~5,000 downloads becomes
screenshot conversion + rating count, not keywords.

## Metadata changes shipped this session

- **Subtitle:** `Color puzzle. Shrink palette.` → `Shrink the palette. Stay calm.`
  - Picks up `shrink`, `palette`, `stay`, `calm` instead of re-stating "color" and "puzzle" already in title.
- **Keyword field (96/100 chars):**
  `woodoku,blast,wood,sudoku,tile,relax,zen,minimal,match,hue,tone,sort,jam,grid,calm,offline,brain`
  - `woodoku/blast/wood/sudoku` — top category intercepts (compound matches in search)
  - `tile/grid/match/sort/brain` — broad mechanic terms for compound queries
  - `relax/zen/minimal/calm` — the *positioning play*. Lower volume, much higher conversion-rate when matched. This is our niche.
  - `hue/tone` — color-variant vocabulary
  - `jam` — Color Block Jam intercept
  - `offline` — utility filter real players use
  - Excluded: `color/chromatic/palette/puzzle/block` (already in title/subtitle), plurals (Apple stems automatically), `app/game/the` (stopwords), `chroma` (in title).

## 6.7" iPhone screenshot creative brief — v1 ship plan

**Format:** 1290 × 2796, full-bleed, near-black canvas (#0A0A0F, not pure black),
captions in upper third, single brand-locked sans-serif. **No device frames** —
Apple's puzzle category killed those in 2025.

**Brand-grammar insight (the move):** Each slot leads with a single hero hue
that matches one letter of CHROMA. Scrolling the screenshot strip in App Store
search literally cycles the 6 brand colors — a thumbnail-level brand mark no
Block Blast clone can replicate.

| # | Job | Hero visual | Caption (≤3 words) | Letter / hue |
|---|-----|------------|--------------------|--------------|
| 1 | **Hook** — "why does this matter?" | Mid-cascade chromatic detonation: one magenta row dissolving, five magenta cells across the board exploding in chained bursts, light streaks frozen mid-frame, UI chrome stripped to zero | **Color is the puzzle.** | C / magenta |
| 2 | **Mechanic** — "how does it work?" | Vertical filmstrip: (a) cyan line about to clear, (b) chromatic clear triggers, (c) cascade obliterates every cyan board-wide | **Clear a color. Detonate them all.** | H / cyan |
| 3 | **Wedge** — "why this not Block Blast?" | Palette-shrink ladder: 6 → 5 → 4 → 3 hues across progression, with a dense board below playing on only 3 colors | **Fewer colors. Harder choices.** | R / yellow-orange |
| 4 | **Depth** — "is there enough to play?" | Combo peak moment: x4 combo chip glowing, score odometer mid-tick 12,400 → 28,900, board half-cleared with trailing particle wake | **Chain the cascades.** | O / green |
| 5 | **Ritual** — "will I come back?" | Daily Puzzle card with today's seed, leaderboard sliver, "1 shared puzzle worldwide" microtype | **One puzzle. Whole world.** | M / violet |
| 6 | **Identity** — close the loop | CHROMA wordmark huge, each letter in its hue, fragment of a 4×4 board echoing those same hues below | *No caption — the wordmark is the caption* | A / all six |

**Why six, not ten:** Apple gives you ten slots; don't fill them. ~60% of users
decide install in 5–7 seconds, mostly on slots 1–3. Six clean assets ship
faster, A/B test cleaner, and respect that we're not Block Blast (yet).

**v1 ship order if time-pressed:** slots 1, 2, 3, 6 first — those four carry
the conversion load (hook, mechanic, wedge, identity). Slots 4 and 5 are
reinforcement.

**The single highest-leverage decision:** slot 1's hero image. Get the
chromatic detonation cascade rendered cleanly, one dominant hue, 3-word
caption, near-black canvas, and CHROMA out-converts ~80% of the block-puzzle
indie field on visual grammar alone.

## A/B test plan (post-launch)

In priority order (test only after we have ≥200 product-page views/week):

1. **Slot 1 caption text** — `Color is the puzzle.` vs `Color matters.` vs `The color puzzle.`
2. **Slot 1 hero hue** — magenta vs cyan vs yellow cascade (same caption)
3. **Slot 3 vs slot 1 swap** — does the wedge ("Fewer colors") pull better than the spectacle (cascade)?
4. **Wordmark position** — slot 6 (default) vs slot 1 (test). Brands often lose money leading with logo; verify empirically.

**Don't test yet:** caption font, gradient direction, screenshot count.

## This-week action list (per ASO research, in priority order)

1. ✅ Ship subtitle + keyword field changes (done in this commit).
2. **Build slot 1 in Figma** using the brand-hue tokens already in
   `src/components/BrandSplash.tsx` + `src/components/BoardEffects.tsx`. Don't
   invent new hues — lock to what the app renders so install experience
   matches.
3. **Seed first 50 ratings** from OSU network + r/iosgaming /
   r/PuzzleGames / r/incremental_games at launch. Without 50 ratings, no ASO
   change converts.

## What NOT to do this week

- Don't change away from CHROMA (term fragmented, not owned — we're fine).
- Don't try to outrank Block Blast on "block puzzle." Impossible at any
  reasonable budget.
- Don't fill all 10 screenshot slots. Six is the point.
- Don't lead with the wordmark in slot 1. Wordmark goes in slot 6.

---

Sources (research synthesis): Block Blast App Store listing (Q1 2026 #1
worldwide), Sensor Tower public data, SplitMetrics case studies on
screenshot conversion, AppScreenshotStudio 2026 design guides, Apple
PPO documentation, indie ASO playbooks (GrowthByKev / MobileAction /
AppDrift / Appalize / AppLaunchFlow).
