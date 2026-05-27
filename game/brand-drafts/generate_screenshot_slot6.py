#!/usr/bin/env python3
"""
Slot 6 — the identity close.

Wordmark huge, all six brand hues. Subtitle below.
Small board fragment beneath, showing the same 6 hues in live cells.
This is the ONLY screenshot in the strip that uses all 6 hues at full
brightness — every other slot leads with a single hero hue. Slot 6 is
the resolution chord.

No caption above (the wordmark IS the caption). No detonation. Just
the brand mark + tagline + a small visual proof that those colors
match what the game renders.
"""

from __future__ import annotations

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1290, 2796
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshot-slot6.png")

BG_OUTER = (15, 14, 26)
BG_INNER = (24, 22, 32)   # neutral warm shift (no single hero hue dominates)
WHITE = (255, 255, 255)
MUTED = (160, 160, 180)

# Same letter→hue mapping as wordmark.svg and brand-design-spec.md
LETTERS = [
    ("C", (255, 59, 92)),     # Red
    ("H", (250, 204, 21)),    # Yellow
    ("R", (59, 130, 246)),    # Blue
    ("O", (0, 212, 170)),     # Teal
    ("M", (168, 85, 247)),    # Purple
    ("A", (255, 107, 43)),    # Orange
]
BRAND_HUES = [hue for _, hue in LETTERS]


def lighten(rgb, amount=0.35):
    r, g, b = rgb
    return (
        int(r + (255 - r) * amount),
        int(g + (255 - g) * amount),
        int(b + (255 - b) * amount),
    )


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
    max_r = int(math.hypot(W, H) * 0.8)
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
    img = radial_background(img, (W // 2, int(H * 0.45)))
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Massive wordmark, centered vertically in upper 55% ──
    wm_font = find_font(280, bold=True)
    spacing = 18
    widths = []
    for ltr, _ in LETTERS:
        bbox = draw.textbbox((0, 0), ltr, font=wm_font)
        widths.append(bbox[2] - bbox[0])
    total_w = sum(widths) + spacing * (len(LETTERS) - 1)
    wm_x = (W - total_w) // 2
    wm_y = int(H * 0.30)
    cur_x = wm_x
    for i, (ltr, hue) in enumerate(LETTERS):
        draw.text((cur_x, wm_y), ltr, fill=hue, font=wm_font)
        cur_x += widths[i] + spacing

    # ── Subtitle ──
    subtitle = "Color puzzle. Shrink palette."
    sub_font = find_font(60, bold=False)
    sub_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    sub_w = sub_bbox[2] - sub_bbox[0]
    draw.text(
        ((W - sub_w) // 2, wm_y + 360),
        subtitle, fill=(*MUTED, 230), font=sub_font,
    )

    # ── Board fragment beneath — 4×4 grid showing the 6 brand hues ──
    # The fragment shows two FULL chromatic rows (one in each of two
    # different hues) so the player intuits the mechanic before they
    # ever read the description.
    cells = 4
    cell = 180
    gap = 18
    frag_w = cells * cell + (cells - 1) * gap
    frag_x0 = (W - frag_w) // 2
    frag_y0 = int(H * 0.65)

    # Hand-craft the layout: top row all RED (chromatic),
    # second row mixed (yellow, blue, teal, purple),
    # third row all ORANGE (chromatic again — bookended),
    # fourth row mixed empty + colored
    layout = [
        [BRAND_HUES[0]] * 4,                                          # all red
        [BRAND_HUES[1], BRAND_HUES[2], BRAND_HUES[3], BRAND_HUES[4]], # rainbow
        [BRAND_HUES[5]] * 4,                                          # all orange
        [None, BRAND_HUES[3], None, BRAND_HUES[2]],                   # sparse
    ]
    for r in range(cells):
        for c in range(cells):
            x = frag_x0 + c * (cell + gap)
            y = frag_y0 + r * (cell + gap)
            hue = layout[r][c]
            if hue is None:
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=22, fill=(28, 26, 44),
                )
            else:
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=22, fill=hue,
                )
                # Highlight strip on each filled cell
                draw.rounded_rectangle(
                    (x + 20, y + 20, x + cell - 20, y + cell // 3),
                    radius=14, fill=(*lighten(hue, 0.4), 180),
                )

    # ── Subtle glow on the two chromatic rows ──
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    # Top row (all red) glow
    gd.rounded_rectangle(
        (frag_x0 - 20, frag_y0 - 20, frag_x0 + frag_w + 20, frag_y0 + cell + 20),
        radius=28, outline=(*BRAND_HUES[0], 180), width=10,
    )
    # Third row (all orange) glow
    third_y = frag_y0 + 2 * (cell + gap)
    gd.rounded_rectangle(
        (frag_x0 - 20, third_y - 20, frag_x0 + frag_w + 20, third_y + cell + 20),
        radius=28, outline=(*BRAND_HUES[5], 180), width=10,
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(12))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # ── URL bottom-center ──
    url_font = find_font(40, bold=True)
    url_text = "chroma.game"
    url_bbox = draw.textbbox((0, 0), url_text, font=url_font)
    url_w = url_bbox[2] - url_bbox[0]
    draw.text(
        ((W - url_w) // 2, int(H * 0.955)),
        url_text, fill=(0, 212, 170, 200), font=url_font,
    )

    return img.convert("RGB")


if __name__ == "__main__":
    img = render()
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}")
    thumb = img.resize((W // 4, H // 4), Image.LANCZOS)
    thumb.save(OUT.replace(".png", "-thumb.png"), "PNG", optimize=True)
    print(f"wrote thumb")
