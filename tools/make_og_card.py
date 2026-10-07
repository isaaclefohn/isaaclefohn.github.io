#!/usr/bin/env python3
"""Draw the site's link-preview card and icons (October 2026 "Ledger" look).

Outputs (written to the repo root unless --out-dir is given):
  og-card-2026-10.png   1200x630 navy card used by og:image / twitter:image
  favicon.ico           16, 32 and 48 px
  apple-touch-icon.png  180x180

Run from anywhere:  python3 tools/make_og_card.py
Needs Pillow and the macOS system fonts (Iowan Old Style, Helvetica Neue).

iMessage builds its preview from og:image and og:title only, and crops the
edges, so every line sits inside a centred 1000x500 safe area (x 100-1100,
y 65-565). If the wording changes, bump the filename (and every og:image /
twitter:image tag) so cached previews refresh.
"""

import argparse
import os

from PIL import Image, ImageDraw, ImageFont

# Copy (no em dashes; keep in step with the hero, the footer and og:image:alt)
NAME = "Isaac Lefohn"
CREDENTIAL = "B.S. Finance · Oregon State University · Expected Dec 2027"
ASK = "Seeking a Summer 2027 finance internship, especially in wealth and asset management"
DOMAIN = "isaaclefohn.com"

# Colours (contrast on NAVY: white 12.12, LIGHT 9.65, GOLD_TEXT 7.28)
NAVY = (0x1B, 0x36, 0x5D)
WHITE = (0xFF, 0xFF, 0xFF)
LIGHT = (0xDF, 0xE6, 0xF0)
BRASS = (0xC9, 0xA8, 0x6A)
GOLD_TEXT = (0xE3, 0xC5, 0x8A)

W, H = 1200, 630
SAFE_X0, SAFE_X1 = 100, 1100
SAFE_Y0, SAFE_Y1 = 65, 565

IOWAN = "/System/Library/Fonts/Supplemental/Iowan Old Style.ttc"   # 0 Roman, 1 Bold
HELVETICA_NEUE = "/System/Library/Fonts/HelveticaNeue.ttc"         # 0 Regular, 10 Medium


def font(path, size, index):
    return ImageFont.truetype(path, size, index=index)


def balanced_two_lines(draw, text, fnt, max_width):
    """One line if it fits; otherwise the 2-line split with the shortest longest line."""
    if draw.textlength(text, font=fnt) <= max_width:
        return [text]
    words = text.split()
    best = None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        widest = max(draw.textlength(a, font=fnt), draw.textlength(b, font=fnt))
        if widest <= max_width and (best is None or widest < best[0]):
            best = (widest, [a, b])
    assert best, "ask line does not fit in two lines"
    return best[1]


def make_og_card(path):
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    max_w = SAFE_X1 - SAFE_X0

    f_name = font(IOWAN, 88, 1)            # Iowan Old Style Bold
    f_cred = font(HELVETICA_NEUE, 32, 0)   # Helvetica Neue Regular
    f_ask = font(HELVETICA_NEUE, 40, 10)   # Helvetica Neue Medium; larger than the spec's 32px
                                           # so it stays legible in a ~280pt-wide iMessage card
    f_dom = font(HELVETICA_NEUE, 24, 0)

    x = SAFE_X0
    y = 122
    # Name (anchor "ls" = left, baseline)
    name_base = y + f_name.getmetrics()[0]
    d.text((x, name_base), NAME, font=f_name, fill=WHITE, anchor="ls")

    # Brass rule, 96 x 3
    rule_y = name_base + 34
    d.rectangle([x, rule_y, x + 96 - 1, rule_y + 3 - 1], fill=BRASS)

    # Credential line
    cred_base = rule_y + 3 + 30 + f_cred.getmetrics()[0]
    assert d.textlength(CREDENTIAL, font=f_cred) <= max_w, "credential line too wide"
    d.text((x, cred_base), CREDENTIAL, font=f_cred, fill=LIGHT, anchor="ls")

    # Ask line (wraps to 2 balanced lines)
    ask_lines = balanced_two_lines(d, ASK, f_ask, max_w)
    line_h = 54
    ask_base = cred_base + 66
    for i, line in enumerate(ask_lines):
        d.text((x, ask_base + i * line_h), line, font=f_ask, fill=GOLD_TEXT, anchor="ls")

    # Footer: domain at the bottom of the safe area
    dom_base = SAFE_Y1 - 22
    d.text((x, dom_base), DOMAIN, font=f_dom, fill=LIGHT, anchor="ls")

    last_ask_base = ask_base + (len(ask_lines) - 1) * line_h
    assert last_ask_base + 12 < dom_base - 40, "ask line runs into the footer"
    assert name_base - f_name.getmetrics()[0] >= SAFE_Y0, "name above the safe area"

    img = img.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    img.save(path, optimize=True)
    return path


def icon_image(size):
    """Navy square, white serif "IL", brass rule (rule dropped below 32px)."""
    scale = 8 if size < 64 else 2           # supersample, then downscale
    s = size * scale
    img = Image.new("RGB", (s, s), NAVY)
    d = ImageDraw.Draw(img)
    f = font(IOWAN, int(s * (0.56 if size >= 32 else 0.78)), 1)   # bigger glyphs at 16px
    text = "IL"
    bbox = d.textbbox((0, 0), text, font=f, anchor="ls")
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    show_rule = size >= 32
    rule_h = max(1, round(s * 0.035))
    gap = round(s * 0.07)
    block_h = th + (gap + rule_h if show_rule else 0)
    top = (s - block_h) / 2
    base = top + th
    d.text(((s - tw) / 2 - bbox[0], base), text, font=f, fill=WHITE, anchor="ls")
    if show_rule:
        rw = round(s * 0.34)
        ry = round(base + gap)
        d.rectangle([(s - rw) // 2, ry, (s - rw) // 2 + rw - 1, ry + rule_h - 1], fill=BRASS)
    return img.resize((size, size), Image.LANCZOS)


def make_icons(out_dir):
    ico = os.path.join(out_dir, "favicon.ico")
    big = icon_image(48)
    big.save(ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)],
             append_images=[icon_image(16), icon_image(32)])
    touch = os.path.join(out_dir, "apple-touch-icon.png")
    icon_image(180).save(touch, optimize=True)
    return ico, touch


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out-dir", default=os.path.dirname(here), help="default: repo root")
    ap.add_argument("--og-only", action="store_true", help="skip favicon.ico and apple-touch-icon.png")
    args = ap.parse_args()

    card = make_og_card(os.path.join(args.out_dir, "og-card-2026-10.png"))
    size = os.path.getsize(card)
    assert size < 200_000, f"og card is {size} bytes; must stay under 200KB"
    print(f"{card}: {Image.open(card).size[0]}x{Image.open(card).size[1]}, {size:,} bytes")
    if not args.og_only:
        for p in make_icons(args.out_dir):
            print(f"{p}: {os.path.getsize(p):,} bytes")


if __name__ == "__main__":
    main()
