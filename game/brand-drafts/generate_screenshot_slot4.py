#!/usr/bin/env python3
"""
Slot 4 — "Chain the cascades." Depth screenshot.

Visualizes the combo peak moment: a chromatic clear chaining INTO
another chromatic clear, score odometer mid-tick, x4 combo chip
glowing, particle wake trailing.

Hero hue: Orange (#FF6B2B). The creative brief originally said
green; the icon research correctly noted Green is NOT a brand hue.
Orange reads as "chained heat" + matches the "cascade" framing.
"""

from __future__ import annotations

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1290, 2796
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshot-slot4.png")

BG_OUTER = (15, 14, 26)
BG_INNER = (28, 16, 8)  # warm orange-tinted near-black
HERO = (255, 107, 43)   # Orange — slot 4 hero
WHITE = (255, 255, 255)
MUTED = (160, 160, 180)

BRAND_HUES = [
    (255, 59, 92), (250, 204, 21), (59, 130, 246),
    (0, 212, 170), (168, 85, 247), (255, 107, 43),
]


def lighten(rgb, amount=0.35):
    r, g, b = rgb
    return (
        int(r + (255 - r) * amount),
        int(g + (255 - g) * amount),
        int(b + (255 - b) * amount),
    )


def dim(rgb, amount=0.35):
    r, g, b = rgb
    return (int(r * amount), int(g * amount), int(b * amount))


def find_font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                idx = 1 if bold else 0
                return ImageFont.truetype(p, size, index=idx)
            except Exception:
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    continue
    return ImageFont.load_default()


def radial_background(img: Image.Image, origin: tuple[int, int]) -> Image.Image:
    draw = ImageDraw.Draw(img)
    max_r = int(math.hypot(W, H) * 0.78)
    cx, cy = origin
    for r in range(max_r, 0, -8):
        t = r / max_r
        color = (
            int(BG_INNER[0] + (BG_OUTER[0] - BG_INNER[0]) * t),
            int(BG_INNER[1] + (BG_OUTER[1] - BG_INNER[1]) * t),
            int(BG_INNER[2] + (BG_OUTER[2] - BG_INNER[2]) * t),
        )
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    return img.filter(ImageFilter.GaussianBlur(2))


def render() -> Image.Image:
    img = Image.new("RGB", (W, H), BG_OUTER)
    # Cascade origin is lower-middle so the radial glow centers there
    cascade_cx, cascade_cy = W // 2, int(H * 0.62)
    img = radial_background(img, (cascade_cx, cascade_cy))
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Caption ──
    cap_font = find_font(110, bold=True)
    caption = "Chain the cascades."
    cap_bbox = draw.textbbox((0, 0), caption, font=cap_font)
    cap_w = cap_bbox[2] - cap_bbox[0]
    draw.text(((W - cap_w) // 2, int(H * 0.10)), caption, fill=(*WHITE, 235), font=cap_font)

    # ── Score odometer (mid-tick) ──
    # Render two consecutive numbers stacked to suggest motion:
    # the score is rolling from 12,400 → 28,900 during a cascade.
    score_font = find_font(150, bold=True)
    score_text = "28,900"
    score_bbox = draw.textbbox((0, 0), score_text, font=score_font)
    score_w = score_bbox[2] - score_bbox[0]
    score_x = (W - score_w) // 2
    score_y = int(H * 0.21)
    # Ghost of previous number behind, low opacity, slight offset
    draw.text((score_x, score_y + 40), "12,400", fill=(*MUTED, 70), font=score_font)
    draw.text((score_x, score_y), score_text, fill=(*lighten(HERO, 0.4), 255), font=score_font)

    # ── x4 combo chip on the upper-right ──
    chip_font = find_font(56, bold=True)
    chip_text = "x4 COMBO"
    chip_bbox = draw.textbbox((0, 0), chip_text, font=chip_font)
    chip_w = chip_bbox[2] - chip_bbox[0]
    chip_h = chip_bbox[3] - chip_bbox[1]
    chip_x = W - chip_w - 100
    chip_y = int(H * 0.36)
    # Chip background with glow
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    gd.rounded_rectangle(
        (chip_x - 24, chip_y - 16, chip_x + chip_w + 24, chip_y + chip_h + 28),
        radius=30, fill=(*HERO, 220),
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(8))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rounded_rectangle(
        (chip_x - 20, chip_y - 12, chip_x + chip_w + 20, chip_y + chip_h + 24),
        radius=26, fill=HERO,
    )
    draw.text((chip_x, chip_y), chip_text, fill=WHITE, font=chip_font)

    # ── Board with mid-cascade state: lower half cleared, top half intact ──
    cells = 8
    cell = 130
    gap = 14
    board_w = cells * cell + (cells - 1) * gap
    board_x0 = (W - board_w) // 2
    board_y0 = int(H * 0.46)

    rng = random.Random(73)
    # Top 4 rows: full board with mixed hues
    # Row 4: bright orange row mid-detonation
    # Rows 5-7: trailing particle haze, mostly empty
    for r in range(cells):
        for c in range(cells):
            x = board_x0 + c * (cell + gap)
            y = board_y0 + r * (cell + gap)
            if r < 4:
                # Mixed board — biased orange to set up the chain
                if rng.random() < 0.75:
                    if rng.random() < 0.45:
                        hue = HERO
                    else:
                        hue = rng.choice([h for h in BRAND_HUES if h != HERO])
                    draw.rounded_rectangle(
                        (x, y, x + cell, y + cell), radius=16, fill=hue,
                    )
                else:
                    draw.rounded_rectangle(
                        (x, y, x + cell, y + cell), radius=16, fill=(28, 26, 44),
                    )
            elif r == 4:
                # Bright orange cascade row
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=16,
                    fill=lighten(HERO, 0.45),
                )
            elif r == 5:
                # Fragmenting — small orange dots inside dim cells
                draw.rounded_rectangle(
                    (x + 22, y + 22, x + cell - 22, y + cell - 22),
                    radius=12, fill=HERO,
                )
            else:
                # Particle trail — random small dots
                for _ in range(5):
                    px = x + rng.randint(0, cell)
                    py = y + rng.randint(0, cell)
                    draw.ellipse(
                        [px - 7, py - 7, px + 7, py + 7],
                        fill=(*lighten(HERO, 0.4), 200),
                    )

    # ── Detonation particles ──
    particle_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pl = ImageDraw.Draw(particle_layer)
    for _ in range(180):
        angle = rng.uniform(-3 * math.pi / 4, 3 * math.pi / 4)
        radius = rng.uniform(200, 1100)
        px = int(cascade_cx + math.cos(angle) * radius)
        py = int(cascade_cy + math.sin(angle) * radius)
        size = rng.randint(6, 22)
        a = rng.randint(140, 230)
        color = HERO if rng.random() < 0.7 else lighten(HERO, 0.8)
        pl.ellipse([px - size, py - size, px + size, py + size], fill=(*color, a))
    particle_layer = particle_layer.filter(ImageFilter.GaussianBlur(1.5))
    img = Image.alpha_composite(img, particle_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Wordmark anchor ──
    wm_font = find_font(54, bold=True)
    wm_text = "CHROMA"
    wm_bbox = draw.textbbox((0, 0), wm_text, font=wm_font)
    wm_w = wm_bbox[2] - wm_bbox[0]
    draw.text(
        ((W - wm_w) // 2, int(H * 0.965)),
        wm_text, fill=(255, 255, 255, 80), font=wm_font,
    )

    return img.convert("RGB")


if __name__ == "__main__":
    img = render()
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}")
    img.resize((W // 4, H // 4), Image.LANCZOS).save(
        OUT.replace(".png", "-thumb.png"), "PNG", optimize=True,
    )
    print("wrote thumb")
