#!/usr/bin/env python3
"""
Splash screen assets for CHROMA.

Two outputs:
  - splash-icon-1024.png: 1024x1024 bead-centered image, the kind
    Expo's splash plugin uses (`splash.image` in app.json). Expo
    composites it on top of `splash.backgroundColor` and handles
    centering + safe-area on every device size automatically.
  - splash-1284x2778.png: full-canvas splash variant for older
    setups that need a per-device image. Adds the wordmark below
    the bead for the richer "brand moment" version — use this
    in any custom splash flow that doesn't run through Expo.

The composition mirrors Icon Concept E (single magenta bead, teal
corona, 3 trailing dots up-right) so the transition icon → splash
→ first screen reads as one continuous identity per the brand spec.
"""

from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

BG_DARK = (15, 14, 26)
HERO = (255, 59, 92)
TEAL = (0, 212, 170)
MUTED = (160, 160, 180)
WHITE = (255, 255, 255)

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


def draw_bead(img: Image.Image, cx: int, cy: int, bead_r: int) -> Image.Image:
    """Draw the Concept E bead at (cx, cy) with radius bead_r. Returns
    the composited image — call repeatedly to layer effects."""
    draw = ImageDraw.Draw(img, "RGBA")

    # Background glow centered on the bead
    glow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    for r in range(int(bead_r * 1.9), 0, -8):
        t = r / (bead_r * 1.9)
        a = int(70 * (1 - t))
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*HERO, a))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(40))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # Teal corona ring
    corona_r = int(bead_r * 1.10)
    for dr in range(0, 14):
        a = int(60 * (1 - dr / 14))
        draw.ellipse(
            [cx - corona_r - dr, cy - corona_r - dr,
             cx + corona_r + dr, cy + corona_r + dr],
            outline=(*TEAL, a), width=2,
        )

    # The bead
    draw.ellipse(
        [cx - bead_r, cy - bead_r, cx + bead_r, cy + bead_r],
        fill=HERO,
    )

    # Inner highlight
    hl_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl_layer)
    hl_cx = cx - int(bead_r * 0.28)
    hl_cy = cy - int(bead_r * 0.32)
    hl_r = int(bead_r * 0.55)
    hd.ellipse(
        [hl_cx - hl_r, hl_cy - hl_r, hl_cx + hl_r, hl_cy + hl_r],
        fill=(*lighten(HERO, 0.55), 140),
    )
    hl_layer = hl_layer.filter(ImageFilter.GaussianBlur(35))
    img = Image.alpha_composite(img, hl_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # Three trailing dots up-right
    for (dx, dy, r, a) in [
        (int(bead_r * 0.85), -int(bead_r * 0.85), int(bead_r * 0.16), 200),
        (int(bead_r * 1.20), -int(bead_r * 1.25), int(bead_r * 0.09), 150),
        (int(bead_r * 1.45), -int(bead_r * 1.48), int(bead_r * 0.05), 100),
    ]:
        px, py = cx + dx, cy + dy
        draw.ellipse([px - r, py - r, px + r, py + r], fill=(*HERO, a))

    return img


def render_splash_icon_1024() -> Image.Image:
    """Expo `splash.image` — bead centered on a 1024x1024 dark
    canvas. Expo handles device-size compositing automatically."""
    img = Image.new("RGB", (1024, 1024), BG_DARK).convert("RGBA")
    img = draw_bead(img, 512, 512, int(1024 * 0.22))
    return img.convert("RGB")


def render_splash_full() -> Image.Image:
    """Full 1284x2778 splash with wordmark beneath the bead. Useful
    for custom splash setups outside Expo's plugin (e.g., a brief
    splash served by a web wrapper)."""
    W, H = 1284, 2778
    img = Image.new("RGB", (W, H), BG_DARK).convert("RGBA")

    # Bead, centered horizontally, sitting at ~35% from top
    bead_cx, bead_cy = W // 2, int(H * 0.36)
    bead_r = int(W * 0.18)
    img = draw_bead(img, bead_cx, bead_cy, bead_r)

    # Wordmark beneath
    draw = ImageDraw.Draw(img, "RGBA")
    wm_font = find_font(170, bold=True)
    spacing = 12
    widths = []
    for ltr, _ in LETTERS:
        bbox = draw.textbbox((0, 0), ltr, font=wm_font)
        widths.append(bbox[2] - bbox[0])
    total_w = sum(widths) + spacing * (len(LETTERS) - 1)
    wm_x = (W - total_w) // 2
    wm_y = int(H * 0.62)
    cur_x = wm_x
    for i, (ltr, hue) in enumerate(LETTERS):
        draw.text((cur_x, wm_y), ltr, fill=hue, font=wm_font)
        cur_x += widths[i] + spacing

    # Tagline
    tag_font = find_font(48, bold=False)
    tagline = "Fewer colors. Harder choices."
    tag_bbox = draw.textbbox((0, 0), tagline, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    draw.text(
        ((W - tag_w) // 2, wm_y + 240),
        tagline, fill=(*MUTED, 230), font=tag_font,
    )

    return img.convert("RGB")


if __name__ == "__main__":
    icon = render_splash_icon_1024()
    icon_path = os.path.join(OUT_DIR, "splash-icon-1024.png")
    icon.save(icon_path, "PNG", optimize=True)
    print(f"wrote {icon_path}")

    full = render_splash_full()
    full_path = os.path.join(OUT_DIR, "splash-1284x2778.png")
    full.save(full_path, "PNG", optimize=True)
    print(f"wrote {full_path}")

    # Thumbnail of the full splash so the README preview is small
    full.resize((full.width // 4, full.height // 4), Image.LANCZOS).save(
        full_path.replace(".png", "-thumb.png"), "PNG", optimize=True,
    )
    print("wrote splash-1284x2778-thumb.png")
