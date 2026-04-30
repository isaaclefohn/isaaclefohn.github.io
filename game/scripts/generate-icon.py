#!/usr/bin/env python3
"""Generate Chroma Drop app icon at 1024x1024 for iOS App Store."""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import random

SIZE = 1024
BG = (15, 14, 26)        # #0F0E1A
ACCENT = (255, 59, 92)   # #FF3B5C
GOLD = (250, 204, 21)    # #FACC15

BLOCK_COLORS = [
    (255, 59, 92),    # #FF3B5C  red
    (0, 212, 170),    # #00D4AA  teal
    (59, 130, 246),   # #3B82F6  blue
    (34, 197, 94),    # #22C55E  green
    (250, 204, 21),   # #FACC15  gold
    (168, 85, 247),   # #A855F7  purple
    (255, 107, 43),   # #FF6B2B  orange
]

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=0):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def add_block_highlight(draw, x, y, size, color):
    """Add subtle 3D highlight to a block."""
    r, g, b = color
    # Top highlight
    highlight = (min(255, r + 60), min(255, g + 60), min(255, b + 60))
    shadow = (max(0, r - 40), max(0, g - 40), max(0, b - 40))

    margin = size * 0.08
    inner = size * 0.15

    # Main block
    draw_rounded_rect(draw, (x, y, x + size, y + size), size * 0.12, fill=color)
    # Top-left highlight strip
    draw_rounded_rect(draw, (x + margin, y + margin, x + size - margin, y + inner + margin),
                      size * 0.06, fill=highlight)
    # Bottom-right shadow strip
    draw_rounded_rect(draw, (x + margin, y + size - inner - margin, x + size - margin, y + size - margin),
                      size * 0.06, fill=shadow)

def generate_icon():
    img = Image.new('RGBA', (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(img)

    # Background: very subtle radial glow
    for r in range(SIZE // 2, 0, -4):
        alpha = int(4 * (r / (SIZE // 2)))
        overlay = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse(
            (SIZE // 2 - r, SIZE // 2 - r + 80, SIZE // 2 + r, SIZE // 2 + r + 80),
            fill=(ACCENT[0], ACCENT[1], ACCENT[2], alpha)
        )
        img = Image.alpha_composite(img, overlay)

    draw = ImageDraw.Draw(img)

    # Grid parameters - centered with room for title
    grid_size = 5
    block_size = 120
    gap = 10
    total = grid_size * block_size + (grid_size - 1) * gap
    offset_x = (SIZE - total) // 2
    offset_y = 260  # push down for title

    # Draw subtle grid background cells
    for row in range(grid_size):
        for col in range(grid_size):
            x = offset_x + col * (block_size + gap)
            y = offset_y + row * (block_size + gap)
            draw_rounded_rect(draw, (x, y, x + block_size, y + block_size),
                              block_size * 0.15, fill=(22, 21, 36))

    # Fewer, cleaner blocks - bottom-heavy like a real game in progress
    pattern = [
        (2, 0, 2), (2, 1, 5),
        (2, 3, 1), (2, 4, 1),
        (3, 0, 2), (3, 1, 5), (3, 2, 4), (3, 3, 6), (3, 4, 6),
        (4, 0, 3), (4, 1, 3), (4, 2, 0), (4, 3, 0), (4, 4, 5),
    ]

    for row, col, ci in pattern:
        x = offset_x + col * (block_size + gap)
        y = offset_y + row * (block_size + gap)
        color = BLOCK_COLORS[ci]
        add_block_highlight(draw, x, y, block_size, color)

    # Add a falling piece (L-shaped tetromino) at the top, mid-drop
    piece_color = BLOCK_COLORS[0]  # red
    piece_block = int(block_size * 0.9)
    piece_gap = int(gap * 0.9)
    piece_x = offset_x + 2 * (block_size + gap) + (block_size - piece_block) // 2
    piece_y = offset_y - piece_block - 30

    # L-piece: 3 blocks vertical + 1 block right on bottom
    l_cells = [(0, 0), (1, 0), (2, 0), (2, 1)]
    for dr, dc in l_cells:
        px = piece_x + dc * (piece_block + piece_gap)
        py = piece_y + dr * (piece_block + piece_gap)
        # Add glow behind falling piece
        glow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rounded_rectangle(
            (px - 4, py - 4, px + piece_block + 4, py + piece_block + 4),
            radius=piece_block * 0.15,
            fill=(piece_color[0], piece_color[1], piece_color[2], 40)
        )
        img = Image.alpha_composite(img, glow)
        draw = ImageDraw.Draw(img)
        add_block_highlight(draw, px, py, piece_block, piece_color)

    # Add motion lines below the falling piece
    for i in range(3):
        lx = piece_x + piece_block // 2 - 15 + i * 15
        ly = piece_y - 15 - i * 8
        alpha = 100 - i * 30
        line_overlay = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        ld = ImageDraw.Draw(line_overlay)
        ld.rounded_rectangle(
            (lx, ly, lx + 3, ly + 20 + i * 5),
            radius=2,
            fill=(255, 255, 255, alpha)
        )
        img = Image.alpha_composite(img, line_overlay)

    draw = ImageDraw.Draw(img)

    # Title text: "CHROMA" at top, "DROP" below in accent
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 82)
        font_accent = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 108)
    except OSError:
        font_large = ImageFont.load_default()
        font_accent = font_large

    # "CHROMA" text
    text_chroma = "CHROMA"
    bbox_c = draw.textbbox((0, 0), text_chroma, font=font_large)
    tw_c = bbox_c[2] - bbox_c[0]
    tx_c = (SIZE - tw_c) // 2
    ty_c = 40

    # Text shadow
    for ox, oy in [(2, 2), (3, 3)]:
        draw.text((tx_c + ox, ty_c + oy), text_chroma, fill=(0, 0, 0, 120), font=font_large)
    draw.text((tx_c, ty_c), text_chroma, fill=(240, 240, 255), font=font_large)

    # "DROP" text with accent color
    text_drop = "DROP"
    bbox_d = draw.textbbox((0, 0), text_drop, font=font_accent)
    tw_d = bbox_d[2] - bbox_d[0]
    tx_d = (SIZE - tw_d) // 2
    ty_d = ty_c + 80

    # Glow behind DROP
    glow_drop = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_drop)
    for s in range(8, 0, -1):
        alpha = int(15 * s)
        glow_draw.text((tx_d, ty_d), text_drop,
                       fill=(ACCENT[0], ACCENT[1], ACCENT[2], alpha), font=font_accent)
    glow_drop = glow_drop.filter(ImageFilter.GaussianBlur(radius=12))
    img = Image.alpha_composite(img, glow_drop)
    draw = ImageDraw.Draw(img)

    for ox, oy in [(2, 2), (3, 3)]:
        draw.text((tx_d + ox, ty_d + oy), text_drop, fill=(0, 0, 0, 120), font=font_accent)
    draw.text((tx_d, ty_d), text_drop, fill=ACCENT, font=font_accent)

    # Bottom accent line
    line_y = SIZE - 55
    line_w = 200
    draw_rounded_rect(draw,
                      (SIZE // 2 - line_w, line_y, SIZE // 2 + line_w, line_y + 4),
                      2, fill=(*ACCENT, 120))

    # Sparkle dots in corners
    sparkles = [
        (80, 80, GOLD, 6), (940, 80, BLOCK_COLORS[1], 5),
        (75, 940, BLOCK_COLORS[5], 5), (945, 935, GOLD, 6),
        (200, 920, BLOCK_COLORS[2], 4), (820, 920, BLOCK_COLORS[3], 4),
    ]
    for sx, sy, sc, sr in sparkles:
        sparkle = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sparkle)
        sd.ellipse((sx - sr * 3, sy - sr * 3, sx + sr * 3, sy + sr * 3),
                   fill=(sc[0], sc[1], sc[2], 30))
        sd.ellipse((sx - sr, sy - sr, sx + sr, sy + sr),
                   fill=(sc[0], sc[1], sc[2], 200))
        img = Image.alpha_composite(img, sparkle)

    # Convert to RGB for PNG (iOS requires no alpha for app icon)
    final = Image.new('RGB', (SIZE, SIZE), BG)
    final.paste(img, mask=img.split()[3])

    return final


if __name__ == '__main__':
    import os

    assets_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')

    icon = generate_icon()

    # Save main icon
    icon_path = os.path.join(assets_dir, 'icon.png')
    icon.save(icon_path, 'PNG')
    print(f"Saved: {icon_path}")

    # Save adaptive icon (same for now)
    adaptive_path = os.path.join(assets_dir, 'adaptive-icon.png')
    icon.save(adaptive_path, 'PNG')
    print(f"Saved: {adaptive_path}")

    # Save splash icon (centered blocks, no text, smaller)
    splash = generate_icon()
    splash_path = os.path.join(assets_dir, 'splash-icon.png')
    splash.save(splash_path, 'PNG')
    print(f"Saved: {splash_path}")

    # Save favicon (small version)
    favicon = icon.resize((48, 48), Image.Resampling.LANCZOS)
    favicon_path = os.path.join(assets_dir, 'favicon.png')
    favicon.save(favicon_path, 'PNG')
    print(f"Saved: {favicon_path}")

    print("All icons generated successfully!")
