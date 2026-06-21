"""
Generates polymarket_insider_summary.png — the project's headline visual.

Panel A: "Beating the market's own prices" — every scored trader plotted as
         actual wins (y) vs market-implied expected wins (x). The diagonal is the
         no-edge line; points above it won more than the market priced. Marker
         colour = suspicion score, size = resolved sample.
Panel B: Suspicion board — top wallets by score, as a horizontal bar annotated
         with each one's Poisson-binomial p-value.

Reads data/snapshot.json (produced by run_analysis.py), so it regenerates
offline without touching the network.
"""

from pathlib import Path
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

HERE = Path(__file__).parent
SNAP = HERE / "data" / "snapshot.json"
OUTPUT = HERE / "polymarket_insider_summary.png"

BLACK = "#1a1a1a"
GOLD = "#c5a572"
MUTED = "#888888"
RED = "#b4452f"


def main():
    data = json.loads(SNAP.read_text())
    traders = data["traders"]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    fig.patch.set_facecolor("white")

    # ---- Panel A: actual vs market-implied wins ----
    xs = [t["expected_wins"] for t in traders]
    ys = [t["wins"] for t in traders]
    sc = [t["score"] for t in traders]
    sizes = [min(300, 20 + t["n_resolved"]) for t in traders]
    sp = ax1.scatter(xs, ys, c=sc, s=sizes, cmap="YlOrBr", edgecolors=BLACK,
                     linewidths=0.5, vmin=0, vmax=100, alpha=0.9, zorder=3)
    lim = max(max(xs, default=1), max(ys, default=1)) * 1.08
    ax1.plot([0, lim], [0, lim], color=MUTED, linestyle="--", linewidth=1.4,
             label="No-edge line (wins = market-implied)", zorder=2)
    ax1.set_xlim(0, lim); ax1.set_ylim(0, lim)
    ax1.set_xlabel("Market-implied expected wins  (Σ entry prices)")
    ax1.set_ylabel("Actual winning bets")
    ax1.set_title("Who beats the market's own prices", fontweight="bold", color=BLACK)
    ax1.legend(loc="upper left", fontsize=9, frameon=False)
    cb = fig.colorbar(sp, ax=ax1, fraction=0.046, pad=0.04)
    cb.set_label("Suspicion score (0–100)", fontsize=9)
    ax1.grid(alpha=0.25)

    # ---- Panel B: suspicion board (top by score) ----
    top = traders[:12][::-1]
    labels = [(t["name"] or t["wallet"][:8] + "…")[:16] for t in top]
    scores = [t["score"] for t in top]
    bars = ax2.barh(range(len(top)), scores, color=GOLD, edgecolor=BLACK, height=0.7)
    ax2.set_yticks(range(len(top)))
    ax2.set_yticklabels(labels, fontsize=9)
    ax2.set_xlabel("Suspicion score (0–100)")
    ax2.set_xlim(0, max(scores + [10]) * 1.35)
    ax2.set_title("Most statistically anomalous wallets", fontweight="bold", color=BLACK)
    for i, t in enumerate(top):
        ax2.text(t["score"] + 1, i, f"p={t['p_value']:.0e}  ·  edge {t['edge']:+.0f}",
                 va="center", fontsize=8, color=BLACK)
    ax2.grid(alpha=0.25, axis="x")

    fig.suptitle(
        f"Polymarket Insider-Detection — {len(traders)} scored wallets · "
        f"{len(data['suggestions'])} rule-checked trade signals",
        fontsize=13, fontweight="bold", color=BLACK, y=1.0,
    )
    fig.tight_layout(rect=[0, 0, 1, 0.97])
    fig.savefig(OUTPUT, dpi=140, bbox_inches="tight", facecolor="white")
    print(f"wrote {OUTPUT.name}")


if __name__ == "__main__":
    main()
