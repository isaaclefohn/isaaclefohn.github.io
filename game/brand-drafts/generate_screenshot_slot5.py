#!/usr/bin/env python3
"""
Slot 5 — "One puzzle. Whole world." Ritual screenshot.

Visualizes the Daily Puzzle ritual: today's seed card top-center,
leaderboard sliver below, "1 shared puzzle worldwide" microtype.
Hero hue: Purple (#A855F7) — the only screenshot that uses purple
as the lead hue.
"""

from __future__ import annotations

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1290, 2796
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshot-slot5.png")

BG_OUTER = (15, 14, 26)
BG_INNER = (24, 14, 30)
HERO = (168, 85, 247)
WHITE = (255, 255, 255)
MUTED = (160, 160, 180)


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
    img = radial_background(img, (W // 2, int(H * 0.40)))
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Caption ──
    cap_font = find_font(108, bold=True)
    for i, line in enumerate(["One puzzle.", "Whole world."]):
        bbox = draw.textbbox((0, 0), line, font=cap_font)
        text_w = bbox[2] - bbox[0]
        draw.text(
            ((W - text_w) // 2, int(H * 0.08) + i * 130),
            line, fill=(*WHITE, 235), font=cap_font,
        )

    # ── Daily Puzzle card ──
    card_x = int(W * 0.10)
    card_y = int(H * 0.30)
    card_w = W - 2 * card_x
    card_h = 540

    glass_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glass_layer)
    gd.rounded_rectangle(
        (card_x, card_y, card_x + card_w, card_y + card_h),
        radius=40, fill=(*HERO, 50),
    )
    glass_layer = glass_layer.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, glass_layer)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rounded_rectangle(
        (card_x, card_y, card_x + card_w, card_y + card_h),
        radius=40, outline=(*HERO, 200), width=4,
    )

    title_font = find_font(70, bold=True)
    draw.text(
        (card_x + 60, card_y + 50),
        "DAILY PUZZLE",
        fill=(*lighten(HERO, 0.5), 240),
        font=title_font,
    )

    date_font = find_font(44, bold=False)
    draw.text(
        (card_x + 60, card_y + 140),
        "#47 · June 15",
        fill=(*WHITE, 220),
        font=date_font,
    )

    micro_font = find_font(34, bold=False)
    draw.text(
        (card_x + 60, card_y + 200),
        "ONE SEED · WHOLE WORLD",
        fill=(*MUTED, 180),
        font=micro_font,
    )

    cells = 8
    cell = 70
    gap = 8
    frag_w = cells * cell + (cells - 1) * gap
    frag_x0 = card_x + (card_w - frag_w) // 2
    frag_y0 = card_y + 280

    BRAND_HUES = [
        (255, 59, 92), (250, 204, 21), (59, 130, 246),
        (0, 212, 170), (168, 85, 247), (255, 107, 43),
    ]
    rng = random.Random(47)
    for r in range(3):
        for c in range(cells):
            x = frag_x0 + c * (cell + gap)
            y = frag_y0 + r * (cell + gap)
            if rng.random() < 0.7:
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=10,
                    fill=rng.choice(BRAND_HUES),
                )
            else:
                draw.rounded_rectangle(
                    (x, y, x + cell, y + cell), radius=10, fill=(28, 26, 44),
                )

    # ── Leaderboard sliver ──
    lb_x = card_x
    lb_y = card_y + card_h + 60
    lb_w = card_w
    lb_h = 380

    draw.rounded_rectangle(
        (lb_x, lb_y, lb_x + lb_w, lb_y + lb_h),
        radius=30, fill=(22, 20, 36, 240), outline=(70, 60, 90, 200), width=2,
    )

    lb_title_font = find_font(44, bold=True)
    draw.text(
        (lb_x + 40, lb_y + 30),
        "WEEKLY LEADERBOARD",
        fill=(*MUTED, 220),
        font=lb_title_font,
    )

    rank_font = find_font(48, bold=True)
    score_font = find_font(48, bold=False)
    leaderboard = [
        ("1", "@neon_drift",   "42,150"),
        ("2", "@palette_pro",  "38,920"),
        ("3", "@chroma_friend", "31,470"),
    ]
    for i, (rank, name, score) in enumerate(leaderboard):
        y = lb_y + 110 + i * 80
        draw.text((lb_x + 40, y), rank, fill=(*HERO, 240), font=rank_font)
        draw.text((lb_x + 110, y), name, fill=(*WHITE, 220), font=score_font)
        score_bbox = draw.textbbox((0, 0), score, font=score_font)
        score_w = score_bbox[2] - score_bbox[0]
        draw.text(
            (lb_x + lb_w - score_w - 40, y),
            score, fill=(*WHITE, 220), font=score_font,
        )

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
