#!/usr/bin/env python3
"""
Assemble the CHROMA press kit zip.

Produces `brand-drafts/chroma-press-kit.zip` containing every asset
a journalist, App Store editorial reviewer, TestFlight tester, or
community-poster would need to write/share about CHROMA without
emailing back-and-forth for assets.

Contents:
  icon-1024.png            — App Store icon (Concept E)
  wordmark/                — 3 variants
  screenshots/             — slot 1-6 at full 1290x2796
  og-card.png              — Twitter/LinkedIn share image
  README.md                — what's inside + license + permissions
  fact-sheet.txt           — plain-text press info (name, tagline,
                             pricing, platforms, dev info, key copy)
  description.txt          — short + long-form game description
  features.txt             — bullet list of game features

Re-run after any visual/copy change. The zip is overwritten in place.
"""

from __future__ import annotations

import os
import shutil
import zipfile

DRAFTS_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_ZIP = os.path.join(DRAFTS_DIR, "chroma-press-kit.zip")
STAGING = os.path.join(DRAFTS_DIR, "_press_kit_staging")


# ── Plain-text content ────────────────────────────────────────────

FACT_SHEET = """\
CHROMA — Press Fact Sheet
=========================

Name:           CHROMA
Tagline:        Fewer colors. Harder choices.
Category:       Games / Puzzle (iOS)
Pricing:        Free with optional in-app purchases (Remove Ads $2.99)
Platforms:      iOS (TBD on launch); Android consideration post-launch
Developer:      Isaac Lefohn — solo dev, OSU undergraduate
Contact:        kiwilefohn@gmail.com
Website:        chroma.game
App Store:      [TBD on submission]
Launch date:    [TBD — see launch-playbook-2026-06.md for date range]

The 30-second pitch
-------------------
CHROMA is a block-puzzle game where color, not shape, is the
signature mechanic. When you clear a line of all one color, every
block of that color across the board detonates with it — chained
cascade explosions that turn a familiar genre into a color-strategy
game. The palette shrinks as you progress: fewer colors mean harder
choices about which chromatic lines to build.

What makes it different
-----------------------
- The "chromatic clear" — clear a same-color line, detonate every
  same-color block board-wide. The signature mechanic that gives
  CHROMA its name.
- Palette shrinks across the campaign: 6 hues at Level 1 → 3 hues
  at the late chapter levels. The brand grammar in one rule.
- Chapter 1: "Chromatic" — 7 themed chapter levels (Ignition,
  Cascade, Resonance, Convergence, Saturation, Spectrum,
  Singularity) where the WIN condition is chromatic clears, not
  score.
- Daily Puzzle: one shared seed worldwide. Wordle-style share cards.
- Calm minimalist aesthetic in a category dominated by loud
  juice-maxxed Block Blast clones.

Dev info
--------
Isaac Lefohn is an Oregon State University Finance undergraduate
solo-developing CHROMA in his nights and weekends. The game is
written in Expo / React Native, ships with a Supabase + Vercel
backend, and is designed around the ethical line that retention
mechanics should reward play, not weaponize loss-aversion.

Suggested article angles
------------------------
1. "The color-puzzle alternative to Block Blast" —
   differentiation in a saturated category.
2. "Indie dev builds the Wordle of block puzzles" —
   the daily-puzzle social loop.
3. "How a chromatic cascade became a 6-letter brand" —
   the CHROMA wordmark's six hues mapped to the six letters.

Permissions
-----------
All assets in this kit are licensed for editorial coverage of
CHROMA. Redistribution outside coverage requires written permission.
Brand colors and wordmark are subject to evolving spec; check
brand-design-spec.md in the source for the latest.
"""


DESCRIPTION_SHORT = """\
CHROMA — Fewer colors. Harder choices.

A block-puzzle game where color is the signature mechanic. Clear
a single-color line and every block of that color detonates with
it — chained cascade explosions. The palette shrinks as you
progress, making every placement a chromatic decision.
"""

DESCRIPTION_LONG = """\
CHROMA is the block puzzle where color is the puzzle.

Every level shrinks your palette until clearing a line becomes a
chromatic decision. Master the chromatic clear — line up a single
color and trigger a board-wide detonation that explodes every
same-color block on the grid.

FEATURES:
- The chromatic clear — your line clears, every same-color block detonates
- 500+ levels with shrinking palettes — fewer colors, harder choices
- Daily Puzzle — one shared seed worldwide, share your run
- Combo chains, board-wide cascades, layered haptic feel
- Power-ups: Bombs, Row Clears, Color Clears
- Endless mode and multiple themes
- Free to play, with optional in-app purchases

Clone the falling blocks and you have cloned nothing — the game is
the color.
"""


FEATURES = """\
CHROMA — Feature List
=====================

CORE GAMEPLAY
- Block-placement puzzle on an 8x8 / 10x10 grid
- 500+ levels across 7 themed worlds
- Endless / Zen mode for relaxed play
- 4 themes with unlockable variants

THE SIGNATURE MECHANIC: CHROMATIC CLEAR
- Clear a same-color line → every same-color block board-wide detonates
- Cascade chains: detonations can trigger more chromatic clears
- Visible "one-piece-away" hints when you're close to a chromatic line
- Variable jackpot tiers (10% mini / 30% normal / ~7% big / ~3% jackpot)
  with N=22 pity timer ensuring no unlucky streaks

CAMPAIGN: CHAPTER 1 — CHROMATIC
- 7 themed boss levels at L30/L60/L90/L120/L155/L180/L210
- Ignition → Cascade → Resonance → Convergence → Saturation →
  Spectrum → Singularity
- Win condition is chromatic clears, not score (stars still come
  off score so the 1/2/3-star economy is preserved)

RETENTION TRIAD
- Streak shield: free 1-day-miss recovery, earned every 5 streak days
- Variable daily-reward wheel: 4 tiles + 10% rare jackpot
- Tomorrow-Promise card: forward-looking peek at the next reward,
  shown on session end

SOCIAL
- Wordle-style run-trace share cards
- Live leaderboards (Supabase + Upstash backend)
- Daily Puzzle: one shared seed worldwide

POLISH
- Floating "+N" delta on currency gains with intensity-scaled haptic
- 90ms-spaced layered haptic patterns on chromatic cascades
- Hand-crafted Level 1 that guarantees the chromatic teach (palette 2)

ETHICAL DESIGN
- No FOMO-trigger-on-failure
- No fake-discount banners
- No timer-pressure on agreement screens
- Variable rewards transparent (odds disclosed pre-spin)
- Streak shield is FREE and FINITE, never monetized
"""


README = """\
# CHROMA Press Kit

This zip is intended for editorial coverage, App Store editorial
review, and TestFlight tester onboarding. It contains everything
you need to write about, review, or share CHROMA without emailing
back-and-forth for assets.

## Contents

- `icon-1024.png` — App Store icon (Concept E — Detonation Bead)
- `wordmark/wordmark-multihue-dark.png` — six-hue wordmark on dark
- `wordmark/wordmark-mono-dark.png` — monochrome white wordmark on dark
- `wordmark/wordmark-multihue-transparent.png` — for compositing
- `wordmark/wordmark.svg` — source SVG, scales to any size
- `screenshots/slot-1...6.png` — App Store screenshots at 1290x2796
- `og-card.png` — 1200x630 social-share card
- `fact-sheet.txt` — plain-text press info
- `description.txt` — short + long-form game descriptions
- `features.txt` — full feature list

## Brand colors

- Background: `#0F0E1A`
- Red `#FF3B5C` / Yellow `#FACC15` / Blue `#3B82F6` / Teal `#00D4AA` /
  Purple `#A855F7` / Orange `#FF6B2B`
- Green (`#22C55E`) is a gameplay color, NOT a brand color.

## Letter-to-hue mapping

`C`=Red · `H`=Yellow · `R`=Blue · `O`=Teal · `M`=Purple · `A`=Orange

## Typography

Primary: **Space Grotesk Bold** (SIL OFL, free for commercial use).
Backup: Outfit Bold (also SIL OFL).

## Contact

Isaac Lefohn — kiwilefohn@gmail.com — chroma.game

## License

All assets licensed for editorial coverage of CHROMA. Redistribution
outside coverage requires written permission.
"""


# ── Build pipeline ────────────────────────────────────────────────

def stage(staging: str) -> None:
    """Copy the right asset set into the staging directory."""
    if os.path.exists(staging):
        shutil.rmtree(staging)
    os.makedirs(staging, exist_ok=True)

    # Icon
    shutil.copy(
        os.path.join(DRAFTS_DIR, "icon-e-bead-1024.png"),
        os.path.join(staging, "icon-1024.png"),
    )

    # Wordmark variants
    wm_dir = os.path.join(staging, "wordmark")
    os.makedirs(wm_dir, exist_ok=True)
    for fn in (
        "wordmark-multihue-dark.png",
        "wordmark-mono-dark.png",
        "wordmark-multihue-transparent.png",
        "wordmark.svg",
    ):
        src = os.path.join(DRAFTS_DIR, fn)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(wm_dir, fn))

    # Screenshots
    ss_dir = os.path.join(staging, "screenshots")
    os.makedirs(ss_dir, exist_ok=True)
    for slot in (1, 2, 3, 4, 5, 6):
        src = os.path.join(DRAFTS_DIR, f"screenshot-slot{slot}.png")
        if os.path.exists(src):
            shutil.copy(src, os.path.join(ss_dir, f"slot-{slot}.png"))

    # OG card
    og_src = os.path.join(DRAFTS_DIR, "og-card.png")
    if os.path.exists(og_src):
        shutil.copy(og_src, os.path.join(staging, "og-card.png"))

    # Text files
    for fn, content in [
        ("README.md", README),
        ("fact-sheet.txt", FACT_SHEET),
        ("description.txt", f"{DESCRIPTION_SHORT}\n\n---\n\n{DESCRIPTION_LONG}"),
        ("features.txt", FEATURES),
    ]:
        with open(os.path.join(staging, fn), "w") as f:
            f.write(content)


def zip_staging(staging: str, out_zip: str) -> None:
    """Pack the staging directory into a zip, removing the staging
    dir afterward so brand-drafts/ stays clean."""
    if os.path.exists(out_zip):
        os.remove(out_zip)
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(staging):
            for name in files:
                full = os.path.join(root, name)
                # arcname = path inside the zip, relative to staging
                arc = os.path.relpath(full, staging)
                zf.write(full, arcname=arc)
    shutil.rmtree(staging)


if __name__ == "__main__":
    stage(STAGING)
    zip_staging(STAGING, OUT_ZIP)
    size_kb = os.path.getsize(OUT_ZIP) // 1024
    print(f"wrote {OUT_ZIP} ({size_kb} KB)")
