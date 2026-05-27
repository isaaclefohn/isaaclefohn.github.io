#!/usr/bin/env python3
"""
Draft app-icon generator for CHROMA. Produces four distinct concept
directions plus a 60×60 legibility test for each so we can see what
actually reads on a home screen vs the App Store listing.

Run: python3 brand-drafts/generate_icons.py

Output: brand-drafts/icon-<concept>-{1024,60}.png

Each concept is a real Pillow draw — no external font dependencies,
no SVG-to-raster gymnastics. The intent is "good enough to commit to
a direction in Figma" not "shippable v1." Once Isaac picks the
strongest concept, take it into Figma for kerning + typography pass.
"""

from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ── Brand tokens ────────────────────────────────────────────────────
# Mirrors COLORS.blocks in src/utils/constants.ts. The 6 brand hues
# (skipping Green which is a gameplay-only color) are what the
# BrandSplash uses for the wordmark drop animation.

BG_DARK = (15, 14, 26)   # #0F0E1A — app background

# Brand 6, in the canonical BrandSplash order:
BRAND_HUES = [
    (255, 59, 92),    # Red    #FF3B5C
    (250, 204, 21),   # Yellow #FACC15
    (59, 130, 246),   # Blue   #3B82F6
    (0, 212, 170),    # Teal   #00D4AA
    (168, 85, 247),   # Purple #A855F7
    (255, 107, 43),   # Orange #FF6B2B
]
RED, YELLOW, BLUE, TEAL, PURPLE, ORANGE = BRAND_HUES

SIZE = 1024
OUT_DIR = os.path.dirname(os.path.abspath(__file__))


def lighten(rgb, amount=0.35):
    """Move RGB toward white by `amount` (0..1)."""
    r, g, b = rgb
    return (
        int(r + (255 - r) * amount),
        int(g + (255 - g) * amount),
        int(b + (255 - b) * amount),
    )


def darken(rgb, amount=0.3):
    r, g, b = rgb
    return (int(r * (1 - amount)), int(g * (1 - amount)), int(b * (1 - amount)))


def new_canvas() -> Image.Image:
    """Solid near-black background. Apple wants opaque icons, no
    transparency on iOS; the dark BG is the brand floor."""
    return Image.new("RGB", (SIZE, SIZE), BG_DARK)


def add_radial_vignette(img: Image.Image, intensity: float = 0.25) -> Image.Image:
    """Tiny radial gradient pulling the corners darker — adds depth
    without making the icon look like a sticker."""
    overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    max_r = SIZE * 0.7
    cx, cy = SIZE // 2, SIZE // 2
    # Cheap radial: draw concentric translucent rings.
    for r in range(int(max_r), int(SIZE * 0.95), 6):
        t = (r - max_r) / (SIZE * 0.95 - max_r)
        alpha = int(t * 255 * intensity)
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            outline=(0, 0, 0, alpha),
            width=6,
        )
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, int, int] | tuple[int, int, int, int],
):
    """Convenience wrapper because PIL's rounded_rectangle requires
    extra args we don't care about each call."""
    draw.rounded_rectangle(box, radius=radius, fill=fill)


# ── Concept A: Cascade ─────────────────────────────────────────────
# Mid-detonation moment. 4x4 mini-grid with one chromatic row +
# particles radiating outward. Single hero hue (magenta) because the
# slot-1 screenshot is also magenta — icon and screenshot 1 share a
# visual language, so the user who taps in the App Store search
# experiences a continuous identity.

def concept_a_cascade() -> Image.Image:
    img = new_canvas().convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    hero = PURPLE
    glow = lighten(hero, 0.45)

    # Background glow centered on the cleared row
    glow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    cx, cy = SIZE // 2, int(SIZE * 0.5)
    for r in range(int(SIZE * 0.45), 0, -10):
        a = int(80 * (1 - r / (SIZE * 0.45)))
        glow_draw.ellipse(
            [cx - r, cy - r // 2, cx + r, cy + r // 2],
            fill=(*hero, a),
        )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(40))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # 4x4 mini-grid centered. Cell size = 130, gap = 22.
    cells_per_side = 4
    cell = 130
    gap = 22
    grid_w = cells_per_side * cell + (cells_per_side - 1) * gap
    x0 = (SIZE - grid_w) // 2
    y0 = (SIZE - grid_w) // 2

    # Fill all cells with subtle dark blocks (the board)
    for r in range(cells_per_side):
        for c in range(cells_per_side):
            x = x0 + c * (cell + gap)
            y = y0 + r * (cell + gap)
            # Hero row (r == 1 from top) is fully bright magenta;
            # others are dark "empty" cells with a hint of color.
            if r == 1:
                rounded_rect(draw, (x, y, x + cell, y + cell), 22, hero)
                # Inner highlight strip
                rounded_rect(
                    draw,
                    (x + 14, y + 14, x + cell - 14, y + cell // 3),
                    14,
                    (*lighten(hero, 0.4), 200),
                )
            else:
                # Empty grid cell — show structure without competing
                # with the hero row.
                rounded_rect(draw, (x, y, x + cell, y + cell), 22, (28, 26, 44))

    # Detonation particles — small magenta dots radiating out from
    # the hero row center.
    import random
    random.seed(7)
    for _ in range(50):
        angle = random.uniform(0, math.tau)
        radius = random.uniform(SIZE * 0.25, SIZE * 0.46)
        px = int(cx + math.cos(angle) * radius)
        py = int(cy + math.sin(angle) * radius * 0.7)
        size = random.randint(8, 28)
        a = random.randint(160, 240)
        c = glow if random.random() < 0.6 else (255, 255, 255)
        draw.ellipse([px - size, py - size, px + size, py + size], fill=(*c, a))

    return add_radial_vignette(img.convert("RGB"), 0.35)


# ── Concept B: Diamond Six ─────────────────────────────────────────
# Six brand hues in a 2x3 stacked diamond/hex pattern. Maximum brand
# load — every brand hue is present. Risk: at 60×60 it can look like
# a flag or a candy bar. Test will tell us.

def concept_b_diamond() -> Image.Image:
    img = new_canvas().convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # Hexagonal pack: 2 rows × 3 cols, with the second row offset
    # half a column for a honeycomb feel.
    cell = 240
    gap = 32
    rows = 2
    cols = 3
    grid_w = cols * cell + (cols - 1) * gap
    grid_h = rows * cell + (rows - 1) * gap
    x0 = (SIZE - grid_w) // 2
    y0 = (SIZE - grid_h) // 2

    # CHROMA letter order — Red(R), Yellow(A=amber), Blue(C=cyan),
    # Teal, Purple(M=magenta), Orange(O).
    hue_order = [RED, YELLOW, BLUE, TEAL, PURPLE, ORANGE]
    i = 0
    for r in range(rows):
        x_offset = (cell + gap) // 2 if r == 1 else 0
        for c in range(cols):
            x = x0 + c * (cell + gap) + x_offset
            y = y0 + r * (cell + gap)
            color = hue_order[i]
            # Rounded square with inner highlight
            rounded_rect(draw, (x, y, x + cell, y + cell), 44, color)
            # Inner glow strip top-left
            rounded_rect(
                draw,
                (x + 28, y + 28, x + cell - 28, y + 80),
                20,
                (*lighten(color, 0.45), 180),
            )
            i += 1

    return add_radial_vignette(img.convert("RGB"), 0.3)


# ── Concept C: C Glyph ─────────────────────────────────────────────
# Large "C" letterform filled with a horizontal rainbow gradient
# through the 6 brand hues. Minimal, identity-forward, scales clean
# to 29px because it's a single recognizable shape.

def concept_c_glyph() -> Image.Image:
    img = new_canvas().convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # Draw the C as a thick ring with a wedge cut on the right side.
    # Use a sequence of rotated arcs colored from the brand palette
    # so the C reads as a multi-hue gradient.
    cx, cy = SIZE // 2, SIZE // 2
    outer_r = int(SIZE * 0.40)
    inner_r = int(SIZE * 0.27)
    # Wedge angle: a ~110° arc removed on the right opens the C.
    start = 215  # degrees, PIL: 0° is right, increases clockwise
    end = 145    # ends near top-right

    # We'll paint the C in 60 thin segments, color sampled by t.
    segments = 60
    # Sweep from start to end going counter-clockwise (the long way)
    # which is start -> 360 -> end if start > end. Compute total sweep:
    sweep = (end - start) % 360
    if sweep == 0:
        sweep = 360
    for s in range(segments):
        t = s / max(1, segments - 1)
        # Pick gradient through hues 0..5 evenly.
        idx_f = t * (len(BRAND_HUES) - 1)
        i0 = int(idx_f)
        i1 = min(len(BRAND_HUES) - 1, i0 + 1)
        f = idx_f - i0
        a = BRAND_HUES[i0]
        b = BRAND_HUES[i1]
        color = (
            int(a[0] + (b[0] - a[0]) * f),
            int(a[1] + (b[1] - a[1]) * f),
            int(a[2] + (b[2] - a[2]) * f),
        )
        a0 = (start + sweep * s / segments) % 360
        a1 = (start + sweep * (s + 1) / segments) % 360
        draw.pieslice(
            [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
            a0, a1, fill=color,
        )
    # Punch out inner circle to make it a ring
    draw.ellipse(
        [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
        fill=BG_DARK,
    )

    # Subtle inner highlight on the ring's top edge for dimensionality
    highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hl_draw = ImageDraw.Draw(highlight)
    hl_draw.arc(
        [cx - outer_r + 6, cy - outer_r + 6, cx + outer_r - 6, cy + outer_r - 6],
        220, 320, fill=(255, 255, 255, 60), width=10,
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, highlight)

    return add_radial_vignette(img.convert("RGB"), 0.3)


# ── Concept D: Spectrum Strip ──────────────────────────────────────
# One row of 6 colored blocks with the middle one "popping" upward
# in mid-detonation. Literal visual for "color block puzzle" — reads
# instantly. The pop creates motion and signals the cascade mechanic
# without text.

def concept_d_strip() -> Image.Image:
    img = new_canvas().convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    blocks = 6
    cell = 130
    gap = 18
    strip_w = blocks * cell + (blocks - 1) * gap
    x0 = (SIZE - strip_w) // 2
    y_base = SIZE // 2 + 50
    hue_order = [RED, YELLOW, TEAL, BLUE, PURPLE, ORANGE]

    # Subtle baseline shadow under the strip
    shadow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.ellipse(
        [x0 - 30, y_base + cell - 10, x0 + strip_w + 30, y_base + cell + 60],
        fill=(0, 0, 0, 90),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(20))
    img = Image.alpha_composite(img, shadow_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    for i in range(blocks):
        x = x0 + i * (cell + gap)
        y = y_base
        # The 4th block (index 3) pops upward to signal detonation
        if i == 3:
            y -= int(cell * 0.65)
        color = hue_order[i]
        rounded_rect(draw, (x, y, x + cell, y + cell), 22, color)
        # Highlight strip on each block
        rounded_rect(
            draw,
            (x + 14, y + 14, x + cell - 14, y + cell // 3),
            14,
            (*lighten(color, 0.4), 180),
        )

    # Add a "spark" above the popped block — small radiating particles
    pop_x = x0 + 3 * (cell + gap) + cell // 2
    pop_y = y_base - int(cell * 0.65)
    spark_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sl = ImageDraw.Draw(spark_layer)
    import random
    random.seed(11)
    for _ in range(14):
        angle = random.uniform(-math.pi * 1.0, 0)  # top half only
        radius = random.uniform(40, 200)
        px = int(pop_x + math.cos(angle) * radius)
        py = int(pop_y + math.sin(angle) * radius)
        size = random.randint(6, 18)
        sl.ellipse([px - size, py - size, px + size, py + size], fill=(255, 255, 255, 200))
    spark_layer = spark_layer.filter(ImageFilter.GaussianBlur(1))
    img = Image.alpha_composite(img, spark_layer)

    return add_radial_vignette(img.convert("RGB"), 0.25)


# ── Concept E: Detonation Bead ─────────────────────────────────────
# Single magenta bead, center-frame, full bleed. Per the 2026-06
# icon-research agent's recommendation: at 29px (Settings) every
# detail under 4% of canvas vanishes, so the strongest indie-puzzle
# icons in 2025-2026 are SINGLE-element compositions on a saturated
# background. The bead has an inner highlight for dimensionality,
# three trailing dots up-right at decreasing scale/opacity to hint
# at motion, and an optional faint teal corona ring for color-theory
# complementarity. No grid. No text. No score chip. Just the bead.

def concept_e_bead() -> Image.Image:
    img = new_canvas().convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    hero = (255, 59, 92)  # #FF3B5C — the brand red (called "magenta"
                          # in the research brief; reads as hot pink/red
                          # depending on screen calibration).

    # Subtle radial background glow centered on the bead origin
    glow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    cx, cy = SIZE // 2, int(SIZE * 0.52)
    for r in range(int(SIZE * 0.55), 0, -8):
        a = int(50 * (1 - r / (SIZE * 0.55)))
        glow_draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r], fill=(*hero, a),
        )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(40))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # Optional thin teal corona — color-theory complement to the hero
    # hue. Sits OUTSIDE the bead so it reads as a halo, not a frame.
    teal = (0, 212, 170)
    corona_r = int(SIZE * 0.31)
    for dr in range(0, 14):
        a = int(50 * (1 - dr / 14))
        draw.ellipse(
            [cx - corona_r - dr, cy - corona_r - dr,
             cx + corona_r + dr, cy + corona_r + dr],
            outline=(*teal, a),
            width=2,
        )

    # The bead itself — main fill with a soft top-left highlight that
    # gives the orb dimensionality without the icon looking 3D-rendered.
    bead_r = int(SIZE * 0.29)
    draw.ellipse(
        [cx - bead_r, cy - bead_r, cx + bead_r, cy + bead_r],
        fill=hero,
    )

    # Inner highlight — offset ellipse, lighter shade, soft-edged
    hl_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hl_draw = ImageDraw.Draw(hl_layer)
    hl_cx = cx - int(bead_r * 0.28)
    hl_cy = cy - int(bead_r * 0.32)
    hl_r = int(bead_r * 0.55)
    hl_draw.ellipse(
        [hl_cx - hl_r, hl_cy - hl_r, hl_cx + hl_r, hl_cy + hl_r],
        fill=(*lighten(hero, 0.55), 140),
    )
    hl_layer = hl_layer.filter(ImageFilter.GaussianBlur(35))
    img = Image.alpha_composite(img, hl_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # Three trailing particles — diagonal up-right at decreasing scale
    # and opacity. Pulls the eye toward the upper-right corner where
    # the App Store screenshot grid usually starts the next read.
    trail_specs = [
        # (x_offset, y_offset, radius, alpha)
        (int(SIZE * 0.20), -int(SIZE * 0.18), int(SIZE * 0.045), 220),
        (int(SIZE * 0.30), -int(SIZE * 0.27), int(SIZE * 0.025), 160),
        (int(SIZE * 0.37), -int(SIZE * 0.33), int(SIZE * 0.012), 100),
    ]
    for (dx, dy, r, a) in trail_specs:
        px, py = cx + dx, cy + dy
        # Each particle is a small bead with the same hero hue.
        draw.ellipse([px - r, py - r, px + r, py + r], fill=(*hero, a))

    return add_radial_vignette(img.convert("RGB"), 0.28)


# ── Driver ─────────────────────────────────────────────────────────

CONCEPTS = {
    "a-cascade": concept_a_cascade,
    "b-diamond": concept_b_diamond,
    "c-glyph": concept_c_glyph,
    "d-strip": concept_d_strip,
    # Concept E is the research-recommended winner — single-element
    # composition that survives the 29px legibility test.
    "e-bead": concept_e_bead,
}

if __name__ == "__main__":
    for slug, fn in CONCEPTS.items():
        img = fn()
        # Save the App Store size
        path1024 = os.path.join(OUT_DIR, f"icon-{slug}-1024.png")
        img.save(path1024, "PNG", optimize=True)
        # Save 60x60 legibility test (the iOS home-screen @2x size)
        small = img.resize((60, 60), Image.LANCZOS)
        path60 = os.path.join(OUT_DIR, f"icon-{slug}-60.png")
        small.save(path60, "PNG", optimize=True)
        # And a 180x180 mid-size sanity check (iPad home screen)
        mid = img.resize((180, 180), Image.LANCZOS)
        path180 = os.path.join(OUT_DIR, f"icon-{slug}-180.png")
        mid.save(path180, "PNG", optimize=True)
        print(f"wrote {path1024}, {path180}, {path60}")
