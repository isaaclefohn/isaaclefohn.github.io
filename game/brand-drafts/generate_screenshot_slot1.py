#!/usr/bin/env python3
"""
Slot 1 App Store screenshot mockup for CHROMA.

Spec source: 2026-06 icon/brand research brief (section 4) +
store-creative-brief.md slot 1 description.

  Canvas: 1290×2796 (6.7" iPhone, Apple's primary screenshot size).
  Background: radial gradient centered on the cascade origin —
    inner #1A0E1F (3% magenta lift) → outer #0F0E1A.
  Caption: "Color is the puzzle." upper third, white 92% opacity.
  Board: 8×8 dim cells in all 6 brand hues at 35% brightness.
  Cascade: single magenta column (col 3) row 5 mid-detonation,
    270° particle arc, single-hue rainfall.
  No score chip, no combo, no piece tray, no UI chrome.

Output: brand-drafts/screenshot-slot1.png

This is a Figma-replacement mockup, not the shippable asset. Use it
to validate composition + ratios; rebuild in Figma for final
typography + the published version.
"""

from __future__ import annotations

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1290, 2796
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshot-slot1.png")

# Brand tokens
BG_OUTER = (15, 14, 26)    # #0F0E1A
BG_INNER = (26, 14, 31)    # #1A0E1F  (3% magenta lift toward warm)
HERO = (255, 59, 92)       # #FF3B5C — magenta/red brand hero hue
WHITE = (255, 255, 255)

# Six brand hues, used at low brightness for the dim "rest of board"
BRAND_HUES = [
    (255, 59, 92),     # Red
    (250, 204, 21),    # Yellow
    (59, 130, 246),    # Blue
    (0, 212, 170),     # Teal
    (168, 85, 247),    # Purple
    (255, 107, 43),    # Orange
]


def lighten(rgb, amount=0.35):
    r, g, b = rgb
    return (
        int(r + (255 - r) * amount),
        int(g + (255 - g) * amount),
        int(b + (255 - b) * amount),
    )


def dim(rgb, amount=0.35):
    """Move RGB toward black by `amount`. 0.35 keeps the hue
    recognizable but quiets it so the cascade hero hue dominates."""
    r, g, b = rgb
    return (int(r * amount), int(g * amount), int(b * amount))


def find_system_font(size: int) -> ImageFont.ImageFont:
    """Try to load a strong system display font for the caption.
    Falls back to the default PIL bitmap font (which will read as
    placeholder — the real Figma export uses Space Grotesk)."""
    candidates = [
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size, index=1)  # bold face
            except Exception:
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    continue
    return ImageFont.load_default()


def radial_background(img: Image.Image, origin: tuple[int, int]) -> Image.Image:
    """Radial gradient from BG_INNER at origin → BG_OUTER at corners.
    Implemented as concentric rings; coarse stepping is invisible
    after the GaussianBlur smooth pass."""
    draw = ImageDraw.Draw(img)
    max_r = int(math.hypot(W, H) * 0.7)
    cx, cy = origin
    for r in range(max_r, 0, -8):
        t = r / max_r  # 0 at center, 1 at edge
        color = (
            int(BG_INNER[0] + (BG_OUTER[0] - BG_INNER[0]) * t),
            int(BG_INNER[1] + (BG_OUTER[1] - BG_INNER[1]) * t),
            int(BG_INNER[2] + (BG_OUTER[2] - BG_INNER[2]) * t),
        )
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    return img.filter(ImageFilter.GaussianBlur(2))


def render() -> Image.Image:
    img = Image.new("RGB", (W, H), BG_OUTER)

    # The board is centered horizontally + sits in the lower 60% of
    # the canvas so the upper third is reserved for caption.
    cells = 8
    cell = 132  # cell width in px (8 × 132 + 7 × 14 = 1154 — fits)
    gap = 14
    board_w = cells * cell + (cells - 1) * gap
    board_h = board_w
    board_x0 = (W - board_w) // 2
    board_y0 = int(H * 0.42)  # board starts at 42% from top

    # Origin cell: col 3 row 5 (1-indexed in spec → 0-indexed = col 2, row 4)
    origin_col_idx = 2
    origin_row_idx = 4
    origin_cx = board_x0 + origin_col_idx * (cell + gap) + cell // 2
    origin_cy = board_y0 + origin_row_idx * (cell + gap) + cell // 2

    # Background radial gradient centered on the cascade origin
    img = radial_background(img, (origin_cx, origin_cy))
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Caption (upper third) ──
    caption = "Color is the puzzle."
    font_size = 110
    font = find_system_font(font_size)
    # Center the caption in the upper third (~top 28%)
    cap_y = int(H * 0.20)
    bbox = draw.textbbox((0, 0), caption, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    cap_x = (W - text_w) // 2
    draw.text((cap_x, cap_y), caption, fill=(*WHITE, 235), font=font)

    # ── Board (dim cells) ──
    # All cells outside the hero row use the 6 brand hues at 35% dim.
    # Mix the hues to read as "board with variety" without competing
    # with the magenta cascade. Cells in the cascade row (row 4) are
    # rendered specially below.
    rng = random.Random(42)
    hue_grid: list[list[tuple[int, int, int] | None]] = [
        [None for _ in range(cells)] for _ in range(cells)
    ]
    for r in range(cells):
        for c in range(cells):
            if rng.random() < 0.78:  # ~78% of cells filled, rest empty
                hue_grid[r][c] = rng.choice(BRAND_HUES)

    # Render non-cascade cells first
    for r in range(cells):
        for c in range(cells):
            x = board_x0 + c * (cell + gap)
            y = board_y0 + r * (cell + gap)
            if r == origin_row_idx:
                continue  # cascade row drawn separately
            hue = hue_grid[r][c]
            if hue is None:
                # Empty grid cell — show structure dimly
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=18, fill=(28, 26, 44),
                )
            else:
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=18, fill=dim(hue, 0.32),
                )

    # ── Cascade row (single-hue magenta rainfall, mid-detonation) ──
    # 5 cell states left→right: intact → fragmenting → exploding →
    # particle trail → empty
    for c in range(cells):
        x = board_x0 + c * (cell + gap)
        y = board_y0 + origin_row_idx * (cell + gap)
        if c <= 1:
            # Intact magenta cell
            draw.rounded_rectangle(
                (x, y, x + cell, y + cell), radius=18, fill=HERO,
            )
            # Inner highlight
            draw.rounded_rectangle(
                (x + 12, y + 12, x + cell - 12, y + cell // 3),
                radius=12, fill=(*lighten(HERO, 0.4), 200),
            )
        elif c == 2:
            # Origin cell — bright with corona glow
            draw.rounded_rectangle(
                (x, y, x + cell, y + cell), radius=18, fill=lighten(HERO, 0.3),
            )
        elif c == 3:
            # Fragmenting — partial fill with bright edges
            draw.rounded_rectangle(
                (x + 18, y + 18, x + cell - 18, y + cell - 18),
                radius=14, fill=HERO,
            )
        elif c == 4 or c == 5:
            # Particle trail — small bright dots only
            for _ in range(8):
                px = x + rng.randint(0, cell)
                py = y + rng.randint(0, cell)
                draw.ellipse(
                    [px - 8, py - 8, px + 8, py + 8],
                    fill=(*lighten(HERO, 0.5), 200),
                )
        # c == 6 or 7 → empty

    # ── Detonation particles erupting in 270° arc from origin ──
    # Suppress the down-left quadrant (180-270° in math convention)
    # so particles don't crash into the screen bezel.
    particle_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pl = ImageDraw.Draw(particle_layer)
    for _ in range(120):
        # 270° arc covers angles from -135° (up-left) clockwise to +135° (down-right)
        # In math: skip the bottom-left quadrant 180°→270°. Easier:
        # generate angles uniformly in [-3π/4, 3π/4] which excludes the
        # bottom 90°.
        angle = rng.uniform(-3 * math.pi / 4, 3 * math.pi / 4)
        radius = rng.uniform(180, 900)
        px = int(origin_cx + math.cos(angle) * radius)
        py = int(origin_cy + math.sin(angle) * radius)
        size = rng.randint(6, 26)
        a = rng.randint(140, 240)
        # Mix magenta and white, biased magenta
        color = (
            HERO if rng.random() < 0.65 else lighten(HERO, 0.8)
        )
        pl.ellipse([px - size, py - size, px + size, py + size], fill=(*color, a))
    particle_layer = particle_layer.filter(ImageFilter.GaussianBlur(1.5))
    img = Image.alpha_composite(img, particle_layer)

    # ── Faint CHROMA wordmark at bottom-center, 30% opacity ──
    # The research said NO wordmark in slot 1 because it dilutes the
    # hero moment — but the existing creative brief includes a small
    # anchor mark bottom-center. Compromise: ship at very low opacity
    # so first-glance sees the cascade, second-glance sees the brand.
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")
    wm_font_size = 64
    wm_font = find_system_font(wm_font_size)
    wm_text = "CHROMA"
    wm_bbox = draw.textbbox((0, 0), wm_text, font=wm_font)
    wm_w = wm_bbox[2] - wm_bbox[0]
    draw.text(
        ((W - wm_w) // 2, int(H * 0.92)),
        wm_text,
        fill=(255, 255, 255, 80),  # 31% opacity
        font=wm_font,
    )

    return img.convert("RGB")


if __name__ == "__main__":
    img = render()
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}")
    # Also a small thumbnail for quick preview
    thumb_path = OUT.replace(".png", "-thumb.png")
    img.resize((W // 4, H // 4), Image.LANCZOS).save(thumb_path, "PNG", optimize=True)
    print(f"wrote {thumb_path}")
