"""
Generates portfolio_summary.png — cumulative-return + drawdown comparison.

Panel A: Cumulative return on a $1 investment (portfolio vs SPY).
Panel B: Drawdown from running peak (portfolio vs SPY, shaded).

Run after analyze_portfolio.py.
"""

from pathlib import Path

import matplotlib.dates as mdates
import matplotlib.pyplot as plt

from analyze_portfolio import main as run_analysis

OUTPUT = Path(__file__).parent / "portfolio_summary.png"

BLACK = "#1a1a1a"
GOLD = "#c5a572"
MUTED = "#888888"


def main():
    _, portfolio_ret, benchmark_ret, port, bench = run_analysis()

    port_cum = (1 + portfolio_ret).cumprod()
    bench_cum = (1 + benchmark_ret).cumprod()

    port_dd = (port_cum / port_cum.cummax() - 1) * 100
    bench_dd = (bench_cum / bench_cum.cummax() - 1) * 100

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    fig.patch.set_facecolor("white")

    # ---- Panel A: cumulative return ----
    ax1.plot(port_cum.index, port_cum, color=GOLD, linewidth=2.4,
             label=f"Defensive Portfolio  (CAGR {port['cagr']:.2%}, Sharpe {port['sharpe']:.2f})")
    ax1.plot(bench_cum.index, bench_cum, color=MUTED, linewidth=1.8,
             label=f"SPY Benchmark        (CAGR {bench['cagr']:.2%}, Sharpe {bench['sharpe']:.2f})")
    ax1.axhline(y=1, color=BLACK, linestyle=":", linewidth=0.6, alpha=0.5)
    ax1.set_title("Cumulative Return — $1 Initial Investment",
                  fontsize=13, fontweight="bold", color=BLACK, pad=12)
    ax1.set_ylabel("Portfolio Value ($)", fontsize=10, color=BLACK)
    ax1.legend(loc="upper left", frameon=False, fontsize=9)
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)
    ax1.grid(True, linestyle="--", alpha=0.3)
    ax1.xaxis.set_major_locator(mdates.YearLocator())
    ax1.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))

    # ---- Panel B: drawdown ----
    ax2.fill_between(port_dd.index, port_dd, 0, color=GOLD, alpha=0.55,
                     label=f"Defensive Portfolio  (Max DD {port['max_dd']:.1%})")
    ax2.fill_between(bench_dd.index, bench_dd, 0, color=MUTED, alpha=0.35,
                     label=f"SPY Benchmark        (Max DD {bench['max_dd']:.1%})")
    ax2.set_title("Drawdown from Running Peak (%)",
                  fontsize=13, fontweight="bold", color=BLACK, pad=12)
    ax2.set_ylabel("Drawdown (%)", fontsize=10, color=BLACK)
    ax2.legend(loc="lower left", frameon=False, fontsize=9)
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)
    ax2.grid(True, linestyle="--", alpha=0.3)
    ax2.xaxis.set_major_locator(mdates.YearLocator())
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))

    plt.suptitle("Defensive Compounders vs SPY — 5-Year Risk-Adjusted Performance",
                 fontsize=15, fontweight="bold", color=BLACK, y=1.02)
    plt.tight_layout()
    plt.savefig(OUTPUT, dpi=150, bbox_inches="tight", facecolor="white")
    print(f"Summary chart written to: {OUTPUT}")


if __name__ == "__main__":
    main()
