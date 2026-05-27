#!/usr/bin/env python3
"""
Generate the favicon + apple-touch-icon set for CHROMA from the
existing Concept E bead at 1024×1024.

These ship on the website (when chroma.game goes live), in any
embedded share preview, and as the iOS "add to home screen" icon
for Safari shortcuts.

Output sizes:
  16×16   — browser tab favicon (legacy)
  32×32   — browser tab favicon (modern, 1×/2× retina)
  64×64   — high-DPI browser favicon / desktop
  180×180 — apple-touch-icon (iPhone Safari add-to-home)
  512×512 — Web App Manifest icon
  1024×1024 — already exists, just copies via for completeness
"""

from __future__ import annotations

import os
from PIL import Image

SRC = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "icon-e-bead-1024.png",
)
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

SIZES = [16, 32, 64, 180, 512]


def main() -> None:
    if not os.path.exists(SRC):
        raise SystemExit(
            f"missing source {SRC}; run generate_icons.py first to produce "
            "icon-e-bead-1024.png"
        )
    base = Image.open(SRC).convert("RGBA")
    for size in SIZES:
        # Lanczos for downscale — best quality preservation. At
        # 16 / 32 px the detail collapses; that's expected and ok —
        # the bead silhouette + magenta-on-dark contrast still reads.
        out = base.resize((size, size), Image.LANCZOS)
        path = os.path.join(OUT_DIR, f"favicon-{size}.png")
        out.save(path, "PNG", optimize=True)
        print(f"wrote {path}")

    # Also produce a multi-resolution .ico file containing 16, 32, 64.
    # This is what most web frameworks expect at /favicon.ico — one
    # file with multiple embedded sizes; browsers pick the best fit.
    ico_path = os.path.join(OUT_DIR, "favicon.ico")
    ico_sizes = [(16, 16), (32, 32), (64, 64)]
    ico_imgs = [base.resize(s, Image.LANCZOS) for s in ico_sizes]
    # Pillow's ICO writer encodes all provided sizes into one file.
    ico_imgs[0].save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"wrote {ico_path}")


if __name__ == "__main__":
    main()
