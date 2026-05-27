# CHROMA Brand Design Spec

> Last updated 2026-06-15. Living document — update as Figma drafts firm up.

Companion to `store-creative-brief.md` (6-slot screenshot plan) and the
2026-06 icon-research brief synthesized into the recommendations below.
Concrete drafts live in `brand-drafts/`.

---

## 1. Bottom line

**App icon: ship Concept E — "Detonation Bead."**
Single magenta orb, full bleed, on near-black with a thin teal corona
and three trailing dots up-right. No grid. No text. No board.
This is the only direction that survives the 29×29 Settings crush;
it is the only one that reads as a *brand* (vs a screenshot) at the
sizes that actually decide installs.

**Wordmark: ship monochrome white-on-near-black as the system-of-record.**
Build the six-hue rainbow version as a celebratory variant for the
title screen, screenshot slot 6, and the website hero — but white is
the primary, because every search-result thumbnail, share sheet, and
press logo strips colored marks back to one color anyway.

**Slot 1 screenshot: single-hue magenta cascade, board origin at col 3 row 5,
particle trails erupting in a 270° arc, dim 8×8 board behind in all six
hues at 35% brightness, radial warm-black background.**
No score chip. No UI chrome. The mechanic's moment, isolated.

---

## 2. Brand tokens

These mirror `src/utils/constants.ts → COLORS.blocks`. **Green
(`#22C55E`) exists in the game palette but is NOT a brand hue** —
do not use it in marketing surfaces, only in gameplay.

| Token | Hex | Role |
|---|---|---|
| `bg/near-black` | `#0F0E1A` | Primary surface, App Store screenshot canvas |
| `bg/warm-near-black` | `#1A0E1F` | Inner stop of slot-1 radial gradient (3% magenta lift) |
| `brand/red` | `#FF3B5C` | Hero hue. Slot 1 cascade. Icon Concept E. |
| `brand/yellow` | `#FACC15` | Slot 3 wedge headline color (palette-shrink ladder). |
| `brand/blue` | `#3B82F6` | Slot 5 ritual headline (daily puzzle). |
| `brand/teal` | `#00D4AA` | Icon E corona. Slot 4 depth headline. |
| `brand/purple` | `#A855F7` | Slot 2 mechanic headline. |
| `brand/orange` | `#FF6B2B` | Optional accent. |

Six brand hues map to six letters of CHROMA in the canonical
`BrandSplash` sequence (Red→Yellow→Blue→Teal→Purple→Orange) — see
section 4.

---

## 3. App icon — five concept drafts

All five drafts live in `brand-drafts/` at 1024×1024, 180×180,
and 60×60 sizes. The 60×60 export is the one that decides whether
the concept survives — it is the actual iOS home screen size at @2x
and the size that wins or loses installs on a crowded home screen.

| Concept | What it is | 60px verdict |
|---|---|---|
| **A — Cascade** | 4×4 mini-grid with one magenta row + radiating particles | ❌ Bunches into a purple smear. Too much detail. |
| **B — Diamond Six** | Six brand-hue rounded squares in a 2×3 honeycomb | ⚠️ Reads as candy bar / generic six-color grid. |
| **C — C Glyph** | Large "C" letterform filled with rainbow gradient | ✅ Distinctive shape but doesn't communicate "puzzle game." |
| **D — Spectrum Strip** | Row of 6 colored blocks, middle one popping upward with sparks | ✅ Reads as "color block puzzle with motion." Strong runner-up. |
| **E — Detonation Bead** | Single magenta orb, teal corona, 3 trailing dots up-right | ✅ **Winner.** Survives 29px. Distinctive. Premium read. |

### Why E wins

The 2026-06 icon research found that the strongest indie-puzzle icons
in the current App Store are **single-element compositions on a
saturated background** — Block Blast's icon, the 2025 Color Block Jam
refresh, Lyra's minimalist mark. Multi-element compositions (a board, a
grid, the wordmark inside) consistently lose to single-element peers
because they're trying to communicate the mechanic at icon size.
**That's the screenshot strip's job, not the icon's.**

Concept E's job is "this is the calm, premium color one in a sea of
Block Blast clones." A single magenta bead on near-black does that
better than any of the multi-element drafts.

### Alternate icon (Apple's Alternate Icons API)

**Ship Concept B as an unlockable alternate icon.** Players earn it
at 50 lifetime chromatic clears (the `chromatic_25` achievement is
nearby — surface the unlock as a milestone reward). This converts
the six-hue identity from a primary-icon legibility problem into a
*reward mechanic*, and lets the all-six identity live on the home
screen for engaged players.

iOS supports up to ~10 alternate icons per app via `setAlternateIconName`.
Adding Concept B costs ~1 hour of Figma + 1 line in `app.json`.

---

## 4. Wordmark spec

### Primary wordmark

`brand-drafts/wordmark.svg` is the working SVG. It uses six brand hues
in the BrandSplash sequence:

| Letter | Hue | Hex |
|---|---|---|
| C | Red | `#FF3B5C` |
| H | Yellow | `#FACC15` |
| R | Blue | `#3B82F6` |
| O | Teal | `#00D4AA` |
| M | Purple | `#A855F7` |
| A | Orange | `#FF6B2B` |

This sequence creates a deliberate **warm–warm–cool–cool–cool–warm**
valley through the word, which reads as composition (not random
rainbow).

### Mono variant (primary system-of-record)

Same letter shapes, all letters at `#FFFFFF` at 92% opacity (full
white reads harsh on near-black). Use this for App Store search
thumbnails, press logos, share sheets, monochrome merch, any context
where the surface is not under your control.

### Typeface

| Choice | License | When |
|---|---|---|
| **Space Grotesk Bold/ExtraBold** (recommended) | SIL OFL 1.1 | Default; geometric character without being quirky |
| **Outfit Bold** (backup) | SIL OFL 1.1 | If Space Grotesk reads too "designer" |
| **Inter ExtraBold** (placeholder) | SIL OFL 1.1 | Used in the current SVG draft — safe to ship if you can't get Space Grotesk |

All three are SIL Open Font License — free for commercial use,
redistribution, and embedding. Verify the OFL.txt ships in the app
bundle when embedding the .otf file (Expo bundles fonts under
`assets/fonts/`).

### What to AVOID

- **Montserrat** — overused for indie games, no differentiation.
- **Inter** — too utilitarian for a game (acceptable as fallback only).
- **Cal Sans** — display-only, breaks below 32px.
- **Anything with paid licensing** — Druk Wide, Founders Grotesk, etc.,
  unless / until there's budget for a foundry license.

### Lockup variant

Symbol + wordmark, where the Concept E magenta bead sits left of the
"C" with optical spacing equal to ~1.5× cap height. Use the lockup
for: App Store screenshot slot 6 footer, website nav, the About
screen in Settings, social media OG image. Use the symbol alone for:
watermark, loader, favicon, alternate-icon variant.

---

## 5. Slot 1 screenshot — composition spec

`brand-drafts/screenshot-slot1.png` is the working Pillow mockup
(1290×2796, Apple's 6.7" iPhone primary size). The final Figma
version should match this composition pixel-for-pixel; only the
typography and finish-pass details (per-cell shadows, particle
motion blur) need a real design pass.

### Layout

```
┌─────────────────────────────────┐
│                                 │  ← upper 20%: empty (status bar safe area)
│        "Color is the puzzle."   │  ← cap_y = 20% from top
│                                 │
│      ╭─────────────────────╮    │
│      │ . . . . . . . .     │    │
│      │ . . . . . . . .     │    │  ← 8×8 board centered horizontally
│      │ . . . . . . . .     │    │     starts at 42% from top
│      │ . . ▓ ▓ █ ▒ · ·     │    │  ← cascade row (row 5 = idx 4)
│      │ . . . . . . . .     │    │     col 3 (idx 2) is the origin
│      │ . . . . . . . .     │    │
│      │ . . . . . . . .     │    │
│      ╰─────────────────────╯    │
│                                 │
│           CHROMA                │  ← bottom-center wordmark, 31% opacity
└─────────────────────────────────┘
```

### Cascade detail (the magic moment)

Origin cell: **col 3, row 5** (1-indexed visible board). Cascade
row reads left→right as five distinct cell states:

| Col | State | Render |
|---|---|---|
| 1-2 | Intact | Solid magenta cell with top-edge highlight strip |
| 3 (origin) | Mid-pulse | Lightened magenta + ambient glow |
| 4 | Fragmenting | Inset magenta block (smaller than the cell box) |
| 5-6 | Particle trail | Random magenta + light-magenta dots only |
| 7-8 | Empty | Dim grid cell, structure visible |

### Particle arc

120 particles erupt from the origin cell in a **270° arc** —
suppressing the bottom-left quadrant so particles don't crash into
the device bezel. Radii range 180–900px. Sizes 6–26px. Mix is 65%
hero hue, 35% lightened hero hue (no white particles — keeps the
single-hue rainfall narrative intact).

### Background

Radial gradient centered on the cascade origin:
- Inner stop: `#1A0E1F` (3% magenta lift toward warm)
- Outer stop: `#0F0E1A` (brand near-black)
- Radius: 140% of canvas diagonal

The gradient is invisible work that makes the cascade *feel* hot
without ever using a hot color in the actual background.

### NOT in slot 1

- No score chip, no combo bubble, no piece tray, no HUD.
- No "Tap to play" CTA.
- No floating "+15" delta.
- Wordmark is bottom-center at 30% opacity ONLY — first-glance is the
  cascade, second-glance is the brand.

---

## 6. The "what to do this weekend" handoff

Three weekend moves, each under 4 hours:

### Move 1 (3 hrs, Saturday morning) — Icon in Figma

Open `brand-drafts/icon-e-bead-1024.png` in Figma. Convert each
element to a vector layer:
1. Background: 1024×1024 frame, fill `#0F0E1A`.
2. Magenta bead: ellipse 600×600 centered. Fill `#FF3B5C`. Add inner
   gradient overlay (top-left highlight `#FF8FA8` 60% → bottom-right
   `#C72A47` 100%) for the dimensional read.
3. Teal corona: 8px stroke ring `#00D4AA` at 8% opacity sitting just
   outside the bead. Soft-blur the stroke if Figma supports it.
4. Three trailing dots up-right on a diagonal: 60px, 30px, 12px at
   50%, 25%, 12% opacity respectively.

Export at **1024×1024 PNG** (App Store), **180×180** (iPhone 3x),
and **29×29** PNG.

**Put the 29×29 export on your iPhone home screen next to Block Blast
for one week.** If it doesn't read at a glance after seven days,
iterate. If it does, ship.

### Move 2 (2 hrs, Saturday afternoon) — Wordmark + lockup

Type `CHROMA` in **Space Grotesk Bold** at 240px on near-black.
Letter-spacing -2% (six letters need a touch of negative tracking
to read as a single word).

Build three variants:
1. **Mono white** (primary): all letters `#FFFFFF` at 92% opacity.
2. **Six-hue** (celebratory): per-letter colors from section 4 table.
3. **Lockup**: Move 1 bead at 1.2× cap height, sitting 1.5 cap-heights
   left of the C. Both mono + six-hue lockup variants.

Export each as SVG + PNG at 3× resolution.

### Move 3 (3.5 hrs, Sunday) — Slot 1 screenshot

Open `brand-drafts/screenshot-slot1.png` in Figma at 1290×2796.
Replace each Pillow-drawn element with native Figma vectors using the
spec in section 5. Specifically:

- Make the board cell a **Figma component with 6 color variants** —
  instance it 64 times across an auto-layout grid.
- Build the magenta cascade by hand-placing 5 cell states + an
  ellipse cluster for the particle arc.
- Radial background gradient: Figma's native fill, two stops.
- Typography: **Space Grotesk Medium 64-72px** for the caption, white
  92% opacity.

Export at 1290×2796 PNG, sRGB color profile.

### What NOT to do

- **Do not hire a freelancer** for any of this. Figma's free tier
  covers the entire workflow.
- **Do not commission a $500 logo.** The bead + Space Grotesk wordmark
  is the right indie spend.
- **Do not skip the 29×29 home-screen test.** It is the single most
  predictive validation step in icon design.

---

## 7. Drafts inventory (in `brand-drafts/`)

| File | Purpose | Status |
|---|---|---|
| `generate_icons.py` | Reproducible icon concept renderer (5 concepts × 3 sizes each) | ✅ Drafted |
| `icon-a-cascade-{1024,180,60}.png` | Concept A — 4×4 grid w/ chromatic row | ❌ 60px fails |
| `icon-b-diamond-{1024,180,60}.png` | Concept B — six brand hues honeycomb | ⚠️ Alternate icon candidate |
| `icon-c-glyph-{1024,180,60}.png` | Concept C — C letterform w/ gradient | ✅ Backup primary |
| `icon-d-strip-{1024,180,60}.png` | Concept D — row w/ popping block | ✅ Strong runner-up |
| `icon-e-bead-{1024,180,60}.png` | Concept E — single magenta bead | ✅ **Recommended primary** |
| `wordmark.svg` | CHROMA six-hue wordmark, Figma-importable | ✅ Drafted (needs Space Grotesk pass) |
| `generate_screenshot_slot1.py` | Reproducible slot 1 mockup renderer | ✅ Drafted |
| `screenshot-slot1.png` | Slot 1 composition mockup at 1290×2796 | ✅ Drafted |
| `screenshot-slot1-thumb.png` | 4× downscaled preview | ✅ Drafted |
| `generate_screenshot_slot2.py` | Reproducible slot 2 (3-panel mechanic explainer) | ✅ Drafted |
| `screenshot-slot2.png` | Slot 2 mockup — "Clear a color. Detonate them all." | ✅ Drafted |
| `screenshot-slot2-thumb.png` | 4× downscaled preview | ✅ Drafted |
| `generate_og_card.py` | Reproducible Open Graph card renderer (1200×630) | ✅ Drafted |
| `og-card.png` | OG / Twitter card image for social sharing | ✅ Drafted (Figma needs to pull bead inward 30px) |
| `generate_screenshot_slot3.py` | Slot 3 (wedge — palette-shrink ladder + 3-color dense board) | ✅ Drafted |
| `screenshot-slot3.png` / `-thumb.png` | "Fewer colors. Harder choices." composition | ✅ Drafted |
| `generate_screenshot_slot6.py` | Slot 6 (identity close — huge wordmark + board fragment) | ✅ Drafted |
| `screenshot-slot6.png` / `-thumb.png` | Wordmark close at 280px (Figma needs ~5% inset) | ✅ Drafted |
| `generate_favicons.py` | Favicon + apple-touch-icon set from icon-e-bead | ✅ Drafted |
| `favicon-{16,32,64,180,512}.png` | Browser favicon + iOS add-to-home + manifest icon | ✅ Drafted |
| `favicon.ico` | Multi-resolution .ico (16/32/64) for legacy `/favicon.ico` | ✅ Drafted |

**Still TODO** (use the existing slot 1/2/3/6 generators as the pattern):
- Slot 4 (depth) — combo peak + odometer mid-tick + particle wake. Hero hue: green is NOT a brand hue per the research; use **Orange** (#FF6B2B) to read as "chained heat." Caption: "Chain the cascades."
- Slot 5 (ritual) — daily puzzle card + leaderboard sliver. Hero hue: **Purple** (#A855F7). Caption: "One puzzle. Whole world."
- Splash screen variants (1242×2688 iPhone) — derive from the BrandSplash component
- Press kit zip — icon set + wordmark variants + 6 screenshots + tagline + dev bio + plain-text fact sheet

---

## 8. Cross-asset alignment

When you ship, every brand surface should share three things:

1. **Near-black canvas** (`#0F0E1A` baseline; `#1A0E1F` warm shift
   for hero moments).
2. **Single dominant hue per surface.** Slot 1 = magenta. Slot 2 =
   cyan. Icon E = magenta (same as slot 1, deliberate continuity).
3. **Space Grotesk** as the only typeface.

When the user taps an App Store result, scrolls the screenshot strip,
opens the app, and sees the splash, they should feel one continuous
identity — not five different posters from five different designers.
That continuity is what separates indie launches that "look like a
real game" from ones that don't.
