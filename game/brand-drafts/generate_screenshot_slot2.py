#!/usr/bin/env python3
"""
Slot 2 App Store screenshot mockup for CHROMA — "Clear a color.
Detonate them all." The mechanic explainer.

Three vertical panels stacked, each showing a different state of the
chromatic-clear sequence. Hero hue: cyan/teal (#00D4AA). Caption
upper third. CHROMA anchor bottom-center at 30% opacity.

Panel structure (per store-creative-brief.md slot 2):
  1. Cyan piece about to drop into place completing an all-cyan row
  2. Row clearing — flash + "CHROMATIC!" tag
  3. Every cyan cell across the rest of the board mid-detonation
"""

from __future__ import annotations

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1290, 2796
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshot-slot2.png")

BG_OUTER = (15, 14, 26)
BG_INNER = (10, 26, 30)    # cool warm-shift for teal hero hue
HERO = (0, 212, 170)       # Teal — slot 2 brand hue
WHITE = (255, 255, 255)

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
    r, g, b = rgb
    return (int(r * amount), int(g * amount), int(b * amount))


def find_font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    """System font fallback chain — Figma version uses Space Grotesk."""
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
    max_r = int(math.hypot(W, H) * 0.75)
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


def draw_mini_board(
    img: Image.Image,
    x0: int, y0: int, board_size: int,
    panel: int,
    rng: random.Random,
) -> None:
    """Render one of the three mini-boards. `panel` ∈ {0, 1, 2}:
       0 — setup: cyan piece about to complete a row
       1 — clearing: row flashes white, "CHROMATIC!" tag
       2 — detonation: every cyan cell across the board explodes
    """
    draw = ImageDraw.Draw(img, "RGBA")
    cells = 6
    cell = (board_size - (cells - 1) * 8) // cells  # 8px gap
    gap = 8

    # Pre-seed a board layout with multiple cyan cells scattered
    layout: list[list[tuple[int, int, int] | None]] = [
        [None for _ in range(cells)] for _ in range(cells)
    ]
    # Use a stable RNG state so all 3 panels show the SAME starting
    # board (continuity is the whole point of the filmstrip).
    sub_rng = random.Random(99)
    for r in range(cells):
        for c in range(cells):
            if sub_rng.random() < 0.78:
                layout[r][c] = sub_rng.choice(BRAND_HUES)

    # Force row 2 (0-indexed) to be all teal EXCEPT one missing cell
    # at column 4 — that's the "about to complete" state.
    target_row = 2
    for c in range(cells):
        layout[target_row][c] = HERO
    if panel == 0:
        # Setup state: the cell at col 4 is empty (piece about to drop)
        layout[target_row][4] = None

    # Detonation state: ALL cells of the HERO color across the board
    # get a special "exploding" treatment in panel 2.

    for r in range(cells):
        for c in range(cells):
            x = x0 + c * (cell + gap)
            y = y0 + r * (cell + gap)
            hue = layout[r][c]

            if panel == 0:
                # Normal board render — full saturation
                if hue is None:
                    draw.rounded_rectangle((x, y, x + cell, y + cell), radius=14, fill=(28, 26, 44))
                else:
                    draw.rounded_rectangle((x, y, x + cell, y + cell), radius=14, fill=hue)
            elif panel == 1:
                # Clearing — target row flashes white-bright; others normal
                if r == target_row:
                    draw.rounded_rectangle(
                        (x, y, x + cell, y + cell), radius=14,
                        fill=lighten(HERO, 0.7),
                    )
                else:
                    if hue is None:
                        draw.rounded_rectangle((x, y, x + cell, y + cell), radius=14, fill=(28, 26, 44))
                    else:
                        draw.rounded_rectangle((x, y, x + cell, y + cell), radius=14, fill=hue)
            else:  # panel == 2 — detonation
                # All teal cells go bright; non-teal cells dim to 50% so
                # the eye latches onto the chained detonation.
                if hue is None:
                    draw.rounded_rectangle((x, y, x + cell, y + cell), radius=14, fill=(28, 26, 44))
                elif hue == HERO:
                    # Exploding teal cell — bright + radial particle layer
                    draw.rounded_rectangle(
                        (x, y, x + cell, y + cell), radius=14,
                        fill=lighten(HERO, 0.55),
                    )
                else:
                    draw.rounded_rectangle(
                        (x, y, x + cell, y + cell), radius=14,
                        fill=dim(hue, 0.45),
                    )

    # ── Panel-specific overlays ──
    if panel == 0:
        # Floating piece above the empty cell
        empty_x = x0 + 4 * (cell + gap)
        empty_y = y0 + 2 * (cell + gap)
        # Single 1x1 teal piece hovering 1.5 cells above
        hover_x = empty_x
        hover_y = empty_y - int(cell * 1.6)
        draw.rounded_rectangle(
            (hover_x, hover_y, hover_x + cell, hover_y + cell),
            radius=14, fill=HERO,
        )
        # Arrow / drop hint between the floating piece and the gap
        arrow_x = hover_x + cell // 2
        for i in range(3):
            ay = hover_y + cell + 16 + i * 18
            r_dot = 4 - i  # shrinks toward the target
            draw.ellipse(
                [arrow_x - r_dot - 2, ay - r_dot - 2, arrow_x + r_dot + 2, ay + r_dot + 2],
                fill=(255, 255, 255, 180 - i * 40),
            )

    elif panel == 1:
        # "CHROMATIC!" tag overlaid on the cleared row
        tag_font = find_font(54, bold=True)
        tag_text = "CHROMATIC!"
        tag_y = y0 + target_row * (cell + gap) + cell // 2 - 28
        tag_bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
        tag_w = tag_bbox[2] - tag_bbox[0]
        tag_x = x0 + board_size // 2 - tag_w // 2
        # Dark backplate for legibility against the bright cleared row
        draw.rounded_rectangle(
            (tag_x - 18, tag_y - 10, tag_x + tag_w + 18, tag_y + 70),
            radius=10, fill=(15, 14, 26, 220),
        )
        draw.text((tag_x, tag_y), tag_text, fill=lighten(HERO, 0.5), font=tag_font)

    else:  # panel == 2
        # Add particle bursts at each detonating cyan cell
        for r in range(cells):
            for c in range(cells):
                if layout[r][c] != HERO:
                    continue
                cx = x0 + c * (cell + gap) + cell // 2
                cy = y0 + r * (cell + gap) + cell // 2
                for _ in range(8):
                    angle = rng.uniform(0, math.tau)
                    radius = rng.uniform(cell * 0.3, cell * 0.9)
                    px = int(cx + math.cos(angle) * radius)
                    py = int(cy + math.sin(angle) * radius)
                    s = rng.randint(3, 7)
                    draw.ellipse([px - s, py - s, px + s, py + s], fill=(*HERO, 220))


def render() -> Image.Image:
    img = Image.new("RGB", (W, H), BG_OUTER)
    img = radial_background(img, (W // 2, int(H * 0.5)))
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Caption (upper third) ──
    # Two lines so each fits the 1290px canvas at a punchy font size
    # without spilling. The semantic split (verb / payoff) reads
    # better than a single long line anyway.
    cap_line1 = "Clear a color."
    cap_line2 = "Detonate them all."
    font = find_font(96, bold=True)
    cap_y = int(H * 0.10)
    for i, line in enumerate([cap_line1, cap_line2]):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        draw.text(
            ((W - text_w) // 2, cap_y + i * 110),
            line, fill=(*WHITE, 235), font=font,
        )

    # ── Three mini-boards stacked vertically ──
    board_size = 560  # smaller so 3 panels fit with clear separation
    board_x0 = (W - board_size) // 2

    panel_y_starts = [
        int(H * 0.27),  # panel 0
        int(H * 0.49),  # panel 1
        int(H * 0.71),  # panel 2
    ]

    # Thin horizontal dividers between panels so the eye reads 1 → 2 → 3
    for i in range(2):
        y_div = (panel_y_starts[i] + board_size + panel_y_starts[i + 1]) // 2
        draw.line(
            [(W // 5, y_div), (W * 4 // 5, y_div)],
            fill=(*WHITE, 35), width=2,
        )

    rng = random.Random(123)
    for i, y0 in enumerate(panel_y_starts):
        draw_mini_board(img, board_x0, y0, board_size, i, rng)

    # ── Step labels (1 → 2 → 3) on the left of each panel ──
    step_font = find_font(60, bold=True)
    for i, y0 in enumerate(panel_y_starts):
        label = str(i + 1)
        label_x = board_x0 - 90
        label_y = y0 + board_size // 2 - 30
        # Circle backdrop
        draw.ellipse(
            [label_x - 36, label_y - 8, label_x + 38, label_y + 66],
            outline=(*WHITE, 90), width=3,
        )
        draw.text((label_x, label_y), label, fill=(*WHITE, 200), font=step_font)

    # ── Wordmark anchor, bottom-center, 31% opacity ──
    wm_font = find_font(54, bold=True)
    wm_text = "CHROMA"
    wm_bbox = draw.textbbox((0, 0), wm_text, font=wm_font)
    wm_w = wm_bbox[2] - wm_bbox[0]
    draw.text(
        ((W - wm_w) // 2, int(H * 0.96)),
        wm_text,
        fill=(255, 255, 255, 80),
        font=wm_font,
    )

    return img.convert("RGB")


if __name__ == "__main__":
    img = render()
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}")
    thumb = img.resize((W // 4, H // 4), Image.LANCZOS)
    thumb.save(OUT.replace(".png", "-thumb.png"), "PNG", optimize=True)
    print(f"wrote thumb")
