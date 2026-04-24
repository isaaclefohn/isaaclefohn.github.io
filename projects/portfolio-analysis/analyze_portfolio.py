"""
Risk-adjusted portfolio analysis vs SPY benchmark.

Portfolio: equal-weighted defensive compounders — low beta, wide-moat, dividend-paying,
stable free-cash-flow conversion. Same fundamental qualities that make WM a good DCF
target, applied across five names to measure whether quality-factor concentration
beats a broad-market benchmark on a risk-adjusted basis.

Metrics computed per holding and for the portfolio: CAGR, annualized volatility,
Sharpe ratio, maximum drawdown, and beta vs SPY.

Outputs:
  - portfolio_metrics.xlsx : formatted workbook (Summary + Methodology sheets)
  - Console summary of portfolio vs benchmark stats

Run `python3 analyze_portfolio.py` (requires: yfinance, pandas, numpy, xlsxwriter).
"""

from pathlib import Path

import numpy as np
import pandas as pd
import xlsxwriter
import yfinance as yf

# ---- Portfolio configuration (edit these to rerun on a different book) ----
TICKERS = ["WM", "BRK-B", "KO", "JNJ", "PG"]
WEIGHTS = [0.20, 0.20, 0.20, 0.20, 0.20]
BENCHMARK = "SPY"
START = "2021-04-01"
END = "2026-04-01"
RISK_FREE = 0.0425          # 10Y Treasury yield, matches WM DCF model
TRADING_DAYS = 252

OUTPUT = Path(__file__).parent / "portfolio_metrics.xlsx"


def pull_prices():
    """Download adjusted-close price history for all tickers + benchmark."""
    tickers = TICKERS + [BENCHMARK]
    df = yf.download(
        tickers, start=START, end=END, auto_adjust=True, progress=False
    )["Close"]
    return df.dropna()


def compute_returns(prices):
    """Daily returns for each ticker, the equal-weighted portfolio, and the benchmark."""
    returns = prices.pct_change().dropna()
    weights = pd.Series(WEIGHTS, index=TICKERS)
    portfolio_ret = (returns[TICKERS] * weights).sum(axis=1)
    benchmark_ret = returns[BENCHMARK]
    return returns, portfolio_ret, benchmark_ret


def compute_metrics(returns_series, benchmark_series=None):
    """CAGR, annualized vol, Sharpe, max drawdown, beta."""
    n = len(returns_series)
    cagr = (1 + returns_series).prod() ** (TRADING_DAYS / n) - 1
    vol = returns_series.std() * np.sqrt(TRADING_DAYS)
    sharpe = (cagr - RISK_FREE) / vol

    cum = (1 + returns_series).cumprod()
    max_dd = ((cum - cum.cummax()) / cum.cummax()).min()

    if benchmark_series is not None:
        cov = np.cov(returns_series, benchmark_series)[0, 1]
        beta = cov / np.var(benchmark_series)
    else:
        beta = None

    return {"cagr": cagr, "vol": vol, "sharpe": sharpe, "max_dd": max_dd, "beta": beta}


def write_workbook(holding_metrics, portfolio_metrics, benchmark_metrics):
    wb = xlsxwriter.Workbook(str(OUTPUT))

    title = wb.add_format({"bold": True, "font_size": 14, "font_color": "#1a1a1a"})
    header = wb.add_format({
        "bold": True, "bg_color": "#1a1a1a", "font_color": "white",
        "align": "center", "valign": "vcenter", "border": 1,
    })
    cell = wb.add_format({"align": "center", "border": 1})
    pct = wb.add_format({"align": "center", "border": 1, "num_format": "0.00%"})
    num = wb.add_format({"align": "center", "border": 1, "num_format": "0.00"})
    hi_pct = wb.add_format({
        "bold": True, "bg_color": "#c5a572", "font_color": "#1a1a1a",
        "align": "center", "border": 1, "num_format": "0.00%",
    })
    hi_num = wb.add_format({
        "bold": True, "bg_color": "#c5a572", "font_color": "#1a1a1a",
        "align": "center", "border": 1, "num_format": "0.00",
    })

    # ---- Summary sheet ----
    ws = wb.add_worksheet("Summary")
    ws.set_column(0, 0, 22)
    ws.set_column(1, 5, 14)
    ws.write("A1", "Defensive Compounders Portfolio — Risk-Adjusted Performance", title)

    for c, h in enumerate(["Holding", "CAGR", "Volatility", "Sharpe", "Max Drawdown", "Beta vs SPY"]):
        ws.write(2, c, h, header)

    row = 3
    for t in TICKERS:
        m = holding_metrics[t]
        ws.write(row, 0, t, cell)
        ws.write(row, 1, m["cagr"], pct)
        ws.write(row, 2, m["vol"], pct)
        ws.write(row, 3, m["sharpe"], num)
        ws.write(row, 4, m["max_dd"], pct)
        ws.write(row, 5, m["beta"], num)
        row += 1

    # Portfolio row (highlighted)
    ws.write(row, 0, "PORTFOLIO (equal-wt)", header)
    ws.write(row, 1, portfolio_metrics["cagr"], hi_pct)
    ws.write(row, 2, portfolio_metrics["vol"], hi_pct)
    ws.write(row, 3, portfolio_metrics["sharpe"], hi_num)
    ws.write(row, 4, portfolio_metrics["max_dd"], hi_pct)
    ws.write(row, 5, portfolio_metrics["beta"], hi_num)
    row += 1

    # Benchmark row
    ws.write(row, 0, "SPY (benchmark)", header)
    ws.write(row, 1, benchmark_metrics["cagr"], pct)
    ws.write(row, 2, benchmark_metrics["vol"], pct)
    ws.write(row, 3, benchmark_metrics["sharpe"], num)
    ws.write(row, 4, benchmark_metrics["max_dd"], pct)
    ws.write(row, 5, 1.0, num)

    # ---- Methodology sheet ----
    ws2 = wb.add_worksheet("Methodology")
    ws2.set_column(0, 0, 120)
    lines = [
        "Portfolio Construction",
        "  Equal-weighted 5-stock portfolio of defensive compounders:",
        "    WM (Waste Management), BRK-B (Berkshire Hathaway), KO (Coca-Cola),",
        "    JNJ (Johnson & Johnson), PG (Procter & Gamble).",
        "",
        "  Selection criteria: low beta (~0.4–0.8), stable FCF conversion, dividend history,",
        "  wide economic moats, non-cyclical demand profile.",
        "",
        "Data",
        f"  Adjusted-close daily prices from Yahoo Finance, {START} to {END}.",
        "  Returns computed via simple pct_change (not log returns) for additive weighting.",
        "",
        "Metric Definitions",
        "  CAGR        = (1 + r).prod() ^ (252 / N) - 1",
        "  Volatility  = std(daily returns) * sqrt(252)",
        f"  Sharpe      = (CAGR - Rf) / Volatility, with Rf = {RISK_FREE:.2%}",
        "  Max DD      = min((cum / cum.cummax()) - 1)",
        "  Beta vs SPY = cov(stock, SPY) / var(SPY)",
        "",
        "Notes",
        "  Rf matches the risk-free rate used in the WM DCF (10Y Treasury).",
        "  Equal-weighting deliberately avoids look-ahead bias from optimization.",
    ]
    for i, line in enumerate(lines):
        ws2.write(i, 0, line)

    wb.close()
    print(f"Workbook written to: {OUTPUT}")


def main():
    prices = pull_prices()
    returns, portfolio_ret, benchmark_ret = compute_returns(prices)

    holding_metrics = {t: compute_metrics(returns[t], benchmark_ret) for t in TICKERS}
    portfolio_metrics = compute_metrics(portfolio_ret, benchmark_ret)
    benchmark_metrics = compute_metrics(benchmark_ret, benchmark_ret)

    write_workbook(holding_metrics, portfolio_metrics, benchmark_metrics)

    print("\n" + "=" * 62)
    print(f"  Defensive Compounders vs SPY — {START} to {END}")
    print("=" * 62)
    print(f"  {'Metric':<14} {'Portfolio':>14} {'SPY':>14} {'Delta':>14}")
    print("-" * 62)
    for k, lbl, is_pct in [
        ("cagr", "CAGR", True),
        ("vol", "Volatility", True),
        ("sharpe", "Sharpe", False),
        ("max_dd", "Max DD", True),
        ("beta", "Beta", False),
    ]:
        p, b = portfolio_metrics[k], benchmark_metrics[k] if k != "beta" else 1.0
        if is_pct:
            print(f"  {lbl:<14} {p:>13.2%} {b:>13.2%} {p - b:>+13.2%}")
        else:
            print(f"  {lbl:<14} {p:>14.2f} {b:>14.2f} {p - b:>+14.2f}")
    print("=" * 62)

    return prices, portfolio_ret, benchmark_ret, portfolio_metrics, benchmark_metrics


if __name__ == "__main__":
    main()
