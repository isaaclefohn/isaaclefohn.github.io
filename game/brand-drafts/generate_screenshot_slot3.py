#!/usr/bin/env python3
"""
Slot 3 App Store screenshot — "Fewer colors. Harder choices."

The wedge screenshot — the visual proof that CHROMA isn't another
Block Blast clone. Two halves:
  Top 40%: palette-shrink ladder showing 6 → 5 → 4 → 3 hues as the
           campaign progresses. Each row labeled with the level number.
  Bottom 60%: dense board playing with only 3 colors, with several
           near-chromatic alignment hints glowing (the player can
           SEE the chromatic opportunities — that's the wedge).

Hero hue: yellow→orange transition because this slot is about the
palette ITSELF, and the warm hues read as the "spotlight on color"
metaphor better than a single cool hue.

The research brief was specific: do NOT show all 6 hues equally —
pick one to lead, others as supporting cast. Yellow leads.
"""

from __future__ import annotations

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1290, 2796
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshot-slot3.png")

BG_OUTER = (15, 14, 26)
BG_INNER = (24, 22, 8)   # warm yellow-tinted near-black
HERO = (250, 204, 21)    # Yellow
WHITE = (255, 255, 255)
MUTED = (160, 160, 180)

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


def render() -> Image.Image:
    img = Image.new("RGB", (W, H), BG_OUTER)
    img = radial_background(img, (W // 2, int(H * 0.65)))
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Caption (upper third) ──
    font = find_font(100, bold=True)
    cap_y = int(H * 0.08)
    for i, line in enumerate(["Fewer colors.", "Harder choices."]):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        draw.text(
            ((W - text_w) // 2, cap_y + i * 120),
            line, fill=(*WHITE, 235), font=font,
        )

    # ── Palette-shrink ladder ──
    # Four rows showing 6 → 5 → 4 → 3 hues, labeled "Lv 1", "Lv 30",
    # "Lv 60", "Lv 100" (matches the actual paletteSize curve in the
    # codebase: L1=2, L2-5=3, L6-20=4, L21-100=5, L101+=6 — but for
    # the visual story we reverse the perception, showing the shrink
    # as the player progresses).
    ladder_y0 = int(H * 0.27)
    ladder_y_spacing = 130
    label_font = find_font(40, bold=True)
    dot_size = 80
    dot_gap = 18

    rows = [
        ("Lv 1", 6, [0, 1, 2, 3, 4, 5]),
        ("Lv 30", 5, [0, 1, 2, 3, 5]),
        ("Lv 60", 4, [0, 1, 2, 5]),
        ("Lv 100", 3, [0, 1, 5]),
    ]

    for i, (label, n, hue_indices) in enumerate(rows):
        y = ladder_y0 + i * ladder_y_spacing

        # Label on the left
        draw.text((W // 2 - 460, y + 20), label, fill=(*MUTED, 220), font=label_font)

        # Row of colored dots, centered around mid-canvas
        total_w = n * dot_size + (n - 1) * dot_gap
        x_start = W // 2 - total_w // 2 + 60  # offset right of label
        for j, hue_idx in enumerate(hue_indices):
            x = x_start + j * (dot_size + dot_gap)
            hue = BRAND_HUES[hue_idx]
            draw.rounded_rectangle(
                (x, y, x + dot_size, y + dot_size),
                radius=18, fill=hue,
            )
        # Faint "removed" cells trailing right at low opacity for
        # rows that shrank — visualizes the dropped hues.
        if n < 6:
            for j in range(n, 6):
                x = x_start + j * (dot_size + dot_gap)
                # Use a generic dim grey to show "absent"
                draw.rounded_rectangle(
                    (x, y, x + dot_size, y + dot_size),
                    radius=18, outline=(60, 56, 80), width=2,
                )

    # ── Bottom half: dense 8×8 board playing with only 3 colors ──
    # Hues used: red, yellow, purple (a deliberate cool-warm-warm
    # palette that maximizes chromatic-line opportunities visually).
    only_3 = [BRAND_HUES[0], BRAND_HUES[1], BRAND_HUES[4]]

    cells = 8
    cell = 110
    gap = 12
    board_w = cells * cell + (cells - 1) * gap
    board_x0 = (W - board_w) // 2
    board_y0 = int(H * 0.62)

    rng = random.Random(31)
    # Plan the board so 2-3 rows/cols are NEARLY chromatic — leaves
    # the player one move from cascade. Visually communicates the
    # "harder choices" line: with only 3 colors, every placement is a
    # decision about which chromatic line you're building.
    board_state: list[list[tuple[int, int, int] | None]] = []
    for r in range(cells):
        row = []
        for c in range(cells):
            if rng.random() < 0.85:
                row.append(rng.choice(only_3))
            else:
                row.append(None)
        board_state.append(row)

    # Force row 3 to be all-yellow except one cell (near-chromatic)
    for c in range(cells):
        board_state[3][c] = BRAND_HUES[1]
    board_state[3][5] = None

    # Force col 5 to be mostly red (another near-chromatic)
    for r in range(cells):
        if r != 3:
            board_state[r][1] = BRAND_HUES[0]
    board_state[6][1] = None

    # Render the board cells
    for r in range(cells):
        for c in range(cells):
            x = board_x0 + c * (cell + gap)
            y = board_y0 + r * (cell + gap)
            hue = board_state[r][c]
            if hue is None:
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=14, fill=(28, 26, 44),
                )
            else:
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=14, fill=hue,
                )

    # ── Near-chromatic glow on the two highlighted lines ──
    # Yellow row 3 glow
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    row3_y = board_y0 + 3 * (cell + gap)
    gd.rounded_rectangle(
        (board_x0 - 10, row3_y - 10, board_x0 + board_w + 10, row3_y + cell + 10),
        radius=20, outline=(*BRAND_HUES[1], 200), width=8,
    )
    # Red col 1 glow
    col1_x = board_x0 + 1 * (cell + gap)
    gd.rounded_rectangle(
        (col1_x - 10, board_y0 - 10, col1_x + cell + 10, board_y0 + board_w + 10),
        radius=20, outline=(*BRAND_HUES[0], 200), width=8,
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(8))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Wordmark anchor bottom-center, 31% opacity ──
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
    thumb = img.resize((W // 4, H // 4), Image.LANCZOS)
    thumb.save(OUT.replace(".png", "-thumb.png"), "PNG", optimize=True)
    print(f"wrote thumb")
