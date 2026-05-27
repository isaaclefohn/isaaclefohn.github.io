#!/usr/bin/env python3
"""
Open Graph / Twitter card image for CHROMA.

1200×630 — the standard Open Graph + Twitter summary-card-large
size. Used when the App Store URL or the chroma.game domain is
shared on Twitter/X, LinkedIn, Discord, Slack, etc. Sites pull this
via <meta property="og:image"> + <meta name="twitter:image">.

Layout: wordmark on the left, hero "detonation bead" on the right,
tagline beneath the wordmark, URL bottom-center. Brand-near-black
canvas with a subtle radial glow centered on the bead.
"""

from __future__ import annotations

import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "og-card.png")

BG_OUTER = (15, 14, 26)
BG_INNER = (26, 14, 31)
HERO = (255, 59, 92)
TEAL = (0, 212, 170)
WHITE = (255, 255, 255)
MUTED = (160, 160, 180)

# Same letter mapping as wordmark.svg / brand-design-spec.md
LETTERS = [
    ("C", (255, 59, 92)),
    ("H", (250, 204, 21)),
    ("R", (59, 130, 246)),
    ("O", (0, 212, 170)),
    ("M", (168, 85, 247)),
    ("A", (255, 107, 43)),
]


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
    for r in range(max_r, 0, -6):
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
    # Radial glow centered on the bead position (right side, vertical
    # center). Subtle — the bead itself should be the bright moment.
    bead_cx = int(W * 0.78)
    bead_cy = int(H * 0.50)
    img = radial_background(img, (bead_cx, bead_cy))
    img = img.convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Wordmark on the left ──
    font_size = 130
    font = find_font(font_size, bold=True)
    spacing = 10

    # Measure total wordmark width
    widths = []
    for ltr, _ in LETTERS:
        bbox = draw.textbbox((0, 0), ltr, font=font)
        widths.append(bbox[2] - bbox[0])
    wm_total_w = sum(widths) + spacing * (len(LETTERS) - 1)

    wm_y = int(H * 0.27)
    wm_x = int(W * 0.07)
    cur_x = wm_x
    for i, (ltr, hue) in enumerate(LETTERS):
        draw.text((cur_x, wm_y), ltr, fill=hue, font=font)
        cur_x += widths[i] + spacing

    # ── Tagline beneath the wordmark ──
    tagline = "Fewer colors. Harder choices."
    tag_font = find_font(40, bold=False)
    tag_bbox = draw.textbbox((0, 0), tagline, font=tag_font)
    draw.text(
        (wm_x, wm_y + font_size + 30),
        tagline, fill=(*MUTED, 230), font=tag_font,
    )

    # ── Domain at the bottom of the left column ──
    url_font = find_font(28, bold=True)
    url_text = "chroma.game"
    draw.text(
        (wm_x, int(H * 0.83)),
        url_text, fill=(*TEAL, 220), font=url_font,
    )

    # ── Detonation bead on the right ──
    # Mirrors the Icon E composition: orb + corona + 3 trailing dots.
    bead_r = int(H * 0.22)

    # Background bead glow
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    for r in range(int(bead_r * 1.8), 0, -6):
        t = r / (bead_r * 1.8)
        a = int(60 * (1 - t))
        gd.ellipse(
            [bead_cx - r, bead_cy - r, bead_cx + r, bead_cy + r],
            fill=(*HERO, a),
        )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(25))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # Teal corona ring
    corona_r = int(bead_r * 1.18)
    for dr in range(0, 10):
        a = int(50 * (1 - dr / 10))
        draw.ellipse(
            [bead_cx - corona_r - dr, bead_cy - corona_r - dr,
             bead_cx + corona_r + dr, bead_cy + corona_r + dr],
            outline=(*TEAL, a), width=2,
        )

    # The bead
    draw.ellipse(
        [bead_cx - bead_r, bead_cy - bead_r, bead_cx + bead_r, bead_cy + bead_r],
        fill=HERO,
    )

    # Inner highlight
    hl_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl_layer)
    hl_cx = bead_cx - int(bead_r * 0.28)
    hl_cy = bead_cy - int(bead_r * 0.32)
    hl_r = int(bead_r * 0.55)
    hd.ellipse(
        [hl_cx - hl_r, hl_cy - hl_r, hl_cx + hl_r, hl_cy + hl_r],
        fill=(*lighten(HERO, 0.55), 140),
    )
    hl_layer = hl_layer.filter(ImageFilter.GaussianBlur(25))
    img = Image.alpha_composite(img, hl_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # Three trailing dots up-right
    for (dx, dy, r, a) in [
        (int(bead_r * 0.85), -int(bead_r * 0.85), int(bead_r * 0.18), 200),
        (int(bead_r * 1.25), -int(bead_r * 1.30), int(bead_r * 0.10), 150),
        (int(bead_r * 1.50), -int(bead_r * 1.55), int(bead_r * 0.06), 100),
    ]:
        px, py = bead_cx + dx, bead_cy + dy
        draw.ellipse([px - r, py - r, px + r, py + r], fill=(*HERO, a))

    return img.convert("RGB")


if __name__ == "__main__":
    img = render()
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}")
