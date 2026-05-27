#!/usr/bin/env python3
"""
Rasterize the CHROMA wordmark from Pillow primitives so we have a
preview PNG without depending on an SVG renderer in the toolchain.

The Figma version will use Space Grotesk; this preview uses whatever
system font Pillow can find. Composition / letter colors / spacing
are the spec — typography is the Figma pass.
"""

from __future__ import annotations
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Same letter→hue mapping as brand-design-spec.md section 4
LETTERS = [
    ("C", (255, 59, 92)),    # Red
    ("H", (250, 204, 21)),   # Yellow
    ("R", (59, 130, 246)),   # Blue
    ("O", (0, 212, 170)),    # Teal
    ("M", (168, 85, 247)),   # Purple
    ("A", (255, 107, 43)),   # Orange
]

BG_DARK = (15, 14, 26)
BG_TRANSPARENT = (0, 0, 0, 0)


def find_bold(size: int) -> ImageFont.ImageFont:
    for p in [
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size, index=1)
            except Exception:
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    continue
    return ImageFont.load_default()


def render(transparent: bool = False, multi_hue: bool = True) -> Image.Image:
    W, H = 1800, 460
    if transparent:
        img = Image.new("RGBA", (W, H), BG_TRANSPARENT)
    else:
        img = Image.new("RGB", (W, H), BG_DARK).convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    font_size = 320
    font = find_bold(font_size)

    # Measure total width so we can center the lockup
    spacing = 24  # extra px between letters for the brand grammar
    widths = []
    for ltr, _ in LETTERS:
        bbox = draw.textbbox((0, 0), ltr, font=font)
        widths.append(bbox[2] - bbox[0])
    total_w = sum(widths) + spacing * (len(LETTERS) - 1)
    x = (W - total_w) // 2
    y = (H - font_size) // 2 - 20  # eyeball centering offset

    for i, (ltr, hue) in enumerate(LETTERS):
        fill = hue if multi_hue else (255, 255, 255)
        draw.text((x, y), ltr, fill=fill, font=font)
        x += widths[i] + spacing

    return img


if __name__ == "__main__":
    # Multi-hue version on dark
    multi = render(transparent=False, multi_hue=True)
    multi.save(os.path.join(OUT_DIR, "wordmark-multihue-dark.png"), "PNG", optimize=True)
    # Mono white on dark (primary system-of-record)
    mono = render(transparent=False, multi_hue=False)
    mono.save(os.path.join(OUT_DIR, "wordmark-mono-dark.png"), "PNG", optimize=True)
    # Multi-hue on transparent (for compositing elsewhere)
    multi_t = render(transparent=True, multi_hue=True)
    multi_t.save(os.path.join(OUT_DIR, "wordmark-multihue-transparent.png"), "PNG", optimize=True)
    print("wrote 3 wordmark PNG variants")
