"""
Pacific Northwest Regional Banks — Trading Multiples & Balance Sheet Comp Table

Three publicly-traded regional banks with heavy Oregon/Washington exposure:
  COLB — Columbia Banking System (parent of Umpqua Bank post-Feb 2023 merger)
  BANR — Banner Corporation (Banner Bank)
  HFWA — Heritage Financial (Heritage Bank)

Data sources (all free, no auth):
  - Market multiples: Yahoo Finance via yfinance
  - Balance sheet + P&L line items: SEC EDGAR XBRL companyfacts API (data.sec.gov)

Metrics computed per bank:
  - Scale: Total Assets, Total Deposits, Net Loans, Stockholders' Equity
  - Profitability: Net Income, ROA (NI/Assets), ROE (NI/Equity)
  - Earning power: Net Interest Income, approximated NIM (NII / avg earning assets)
  - Funding: Loan-to-Deposit Ratio
  - Market: Price, Market Cap, P/E, P/B, Dividend Yield, Beta

Outputs:
  - pnw_banks_comp.xlsx (Summary + Methodology sheets)
  - Prints a formatted comp table to stdout.
"""

import json
from pathlib import Path

import requests
import xlsxwriter
import yfinance as yf

BANKS = [
    {"ticker": "COLB", "name": "Columbia Banking System", "cik": "0000887343"},
    {"ticker": "BANR", "name": "Banner Corporation",      "cik": "0000946673"},
    {"ticker": "HFWA", "name": "Heritage Financial",      "cik": "0001046025"},
]

# SEC EDGAR requires a User-Agent with a name + email
UA = "Isaac Lefohn Personal Research kiwilefohn@gmail.com"

OUTPUT = Path(__file__).parent / "pnw_banks_comp.xlsx"


# ---- SEC EDGAR helpers -----------------------------------------------------

def fetch_edgar_facts(cik):
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    return r.json()


def latest_annual(facts, tag, unit="USD"):
    """
    Return the most recent 10-K-reported annual value for a us-gaap tag.
    Returns dict: {val, fy, end} or None if tag missing.
    """
    try:
        entries = facts["facts"]["us-gaap"][tag]["units"][unit]
    except KeyError:
        return None
    annual = [e for e in entries
              if e.get("fp") == "FY" and e.get("form", "").startswith("10-K")]
    if not annual:
        return None
    return sorted(annual, key=lambda e: e["end"])[-1]


def first_available(facts, tags, unit="USD"):
    """Try multiple tag names — banks use different XBRL conventions.

    The MOST RECENT fiscal year wins, not the first tag in the list: banks switch
    tags over time, and an abandoned tag still returns its last (stale) year. Taking
    the first hit paired FY2023 BANR loans and FY2020 HFWA loans with FY2025 deposits
    (fixed October 2026). Ties on the period end go to the earlier tag in the list.
    """
    best = None
    for t in tags:
        v = latest_annual(facts, t, unit)
        if v is not None and (best is None or v["end"] > best[0]["end"]):
            best = (v, t)
    return best or (None, None)


# ---- Per-bank data extraction ----------------------------------------------

def extract_fundamentals(cik):
    """Pull balance sheet + P&L line items from SEC EDGAR for one bank."""
    f = fetch_edgar_facts(cik)

    assets          = latest_annual(f, "Assets")
    deposits        = latest_annual(f, "Deposits")
    equity          = latest_annual(f, "StockholdersEquity")
    net_income      = latest_annual(f, "NetIncomeLoss")

    # Loans — different banks report under different tags
    loans, loans_tag = first_available(f, [
        "LoansAndLeasesReceivableNetReportedAmount",
        "LoansAndLeasesReceivableNetOfDeferredIncome",
        # Current tags (2023+): COLB and HFWA use the first, BANR the second.
        "FinancingReceivableExcludingAccruedInterestAfterAllowanceForCreditLoss",
        "NotesReceivableNet",
        "LoansReceivableNet",
    ])

    # Interest income / expense — likewise variable
    interest_income, _ = first_available(f, [
        "InterestAndDividendIncomeOperating",
        "InterestIncomeOperating",
        "InterestAndFeeIncomeLoansAndLeases",
    ])
    interest_expense = latest_annual(f, "InterestExpense")

    # Net Interest Income (directly reported by some banks)
    nii_direct, _ = first_available(f, [
        "InterestIncomeExpenseNet",
        "InterestIncomeExpenseAfterProvisionForLoanLoss",
    ])

    return {
        "assets":          assets,
        "deposits":        deposits,
        "equity":          equity,
        "net_income":      net_income,
        "loans":           loans,
        "loans_tag":       loans_tag,
        "interest_income": interest_income,
        "interest_expense": interest_expense,
        "nii_direct":      nii_direct,
    }


def extract_market(ticker):
    """Pull market multiples from yfinance."""
    t = yf.Ticker(ticker)
    info = t.info
    # yfinance returns dividendYield inconsistently — sometimes as percentage
    # (e.g. 3.09 for 3.09%), sometimes as decimal (0.0309), sometimes missing.
    # Fall back to trailingAnnualDividendYield (always decimal).
    dy = info.get("dividendYield") or info.get("trailingAnnualDividendYield")
    if dy is not None and dy > 1:
        dy = dy / 100
    return {
        "price":        info.get("regularMarketPrice") or info.get("previousClose"),
        "market_cap":   info.get("marketCap"),
        "pe_trailing":  info.get("trailingPE"),
        "pb":           info.get("priceToBook"),
        "div_yield":    dy,
        "beta":         info.get("beta"),
        "52w_high":     info.get("fiftyTwoWeekHigh"),
        "52w_low":      info.get("fiftyTwoWeekLow"),
    }


def compute_ratios(fund, mkt):
    """Derive banking ratios from the raw line items."""
    assets    = _v(fund["assets"])
    deposits  = _v(fund["deposits"])
    equity    = _v(fund["equity"])
    ni        = _v(fund["net_income"])
    loans     = _v(fund["loans"])
    int_inc   = _v(fund["interest_income"])
    int_exp   = _v(fund["interest_expense"])
    nii_direct = _v(fund["nii_direct"])

    nii = nii_direct if nii_direct is not None else (
        int_inc - int_exp if (int_inc is not None and int_exp is not None) else None
    )

    return {
        "roa":      ni / assets    if (ni and assets) else None,
        "roe":      ni / equity    if (ni and equity) else None,
        "ldr":      loans / deposits if (loans and deposits) else None,
        "nim_est":  nii / assets   if (nii and assets) else None,
        "nii":      nii,
        "equity_assets": equity / assets if (equity and assets) else None,
    }


def _v(entry):
    """Unwrap a latest_annual dict to its value (or None)."""
    return entry["val"] if entry else None


# ---- Workbook writer -------------------------------------------------------

def write_workbook(rows):
    wb = xlsxwriter.Workbook(str(OUTPUT))

    title = wb.add_format({"bold": True, "font_size": 14, "font_color": "#1a1a1a"})
    sub = wb.add_format({"italic": True, "font_size": 9, "font_color": "#555555"})
    header = wb.add_format({
        "bold": True, "bg_color": "#1a1a1a", "font_color": "white",
        "align": "center", "valign": "vcenter", "border": 1, "text_wrap": True,
    })
    row_lbl = wb.add_format({"bold": True, "align": "left", "border": 1, "bg_color": "#f5f5f5"})
    cell = wb.add_format({"align": "center", "border": 1})
    dollars = wb.add_format({"align": "center", "border": 1, "num_format": "$#,##0"})
    pct = wb.add_format({"align": "center", "border": 1, "num_format": "0.00%"})
    num = wb.add_format({"align": "center", "border": 1, "num_format": "0.00"})

    ws = wb.add_worksheet("Comp Table")
    ws.set_column(0, 0, 32)
    ws.set_column(1, len(rows), 17)

    ws.write("A1", "Pacific Northwest Regional Banks — Comp Table", title)
    ws.write("A2", "Fundamentals: SEC EDGAR XBRL (most recent 10-K). Market: Yahoo Finance.", sub)

    # Header row: metric | ticker1 | ticker2 | ticker3
    ws.write(3, 0, "Metric", header)
    for i, r in enumerate(rows):
        ws.write(3, i + 1, f"{r['ticker']}\n{r['name']}", header)

    # Rows
    def row(label, key, fmt, section=False):
        nonlocal row_idx
        if section:
            ws.merge_range(row_idx, 0, row_idx, len(rows),
                           label, wb.add_format({
                               "bold": True, "bg_color": "#c5a572",
                               "font_color": "#1a1a1a", "align": "left", "border": 1,
                           }))
            row_idx += 1
            return
        ws.write(row_idx, 0, label, row_lbl)
        for i, r in enumerate(rows):
            v = r.get(key)
            if v is None:
                ws.write(row_idx, i + 1, "n/a", cell)
            else:
                ws.write(row_idx, i + 1, v, fmt)
        row_idx += 1

    row_idx = 4
    row("Scale ($M, most recent FY)", None, None, section=True)
    row("Total Assets",              "assets_m",     dollars)
    row("Total Deposits",            "deposits_m",   dollars)
    row("Net Loans",                 "loans_m",      dollars)
    row("Stockholders' Equity",      "equity_m",     dollars)
    row("Net Income",                "net_income_m", dollars)
    row("Net Interest Income",       "nii_m",        dollars)

    row("Profitability & Balance Sheet Ratios", None, None, section=True)
    row("ROA",                   "roa",        pct)
    row("ROE",                   "roe",        pct)
    row("Loan-to-Deposit",       "ldr",        pct)
    row("Equity / Assets (Lev.)", "equity_assets", pct)
    row("Est. NIM (NII / Assets)", "nim_est", pct)

    row("Market Multiples (current)", None, None, section=True)
    row("Share Price ($)",       "price",      num)
    row("Market Cap ($M)",       "market_cap_m", dollars)
    row("P/E (trailing)",        "pe_trailing", num)
    row("P/B",                   "pb",         num)
    row("Dividend Yield",        "div_yield",  pct)
    row("Beta",                  "beta",       num)

    # Methodology sheet
    ws2 = wb.add_worksheet("Methodology")
    ws2.set_column(0, 0, 120)
    methodology = [
        "Data Sources",
        "  Balance sheet + P&L:  SEC EDGAR XBRL companyfacts API (data.sec.gov, free, no auth)",
        "  Market multiples:     Yahoo Finance (yfinance)",
        "",
        "Metric Definitions",
        "  ROA           = Net Income / Total Assets",
        "  ROE           = Net Income / Stockholders' Equity",
        "  Loan/Deposit  = Net Loans / Total Deposits",
        "  Equity/Assets = Stockholders' Equity / Total Assets  (simple leverage proxy)",
        "  Est. NIM      = Net Interest Income / Total Assets   (approximation; true NIM uses average earning assets)",
        "",
        "Notes",
        "  'n/a' indicates the XBRL tag was not found or reported differently; banks",
        "  sometimes file loans under different us-gaap tags. See first_available() in",
        "  build_comp_table.py for the fallback tag list.",
        "",
        "  Fiscal-year fields come from the most recent annual 10-K filing per bank.",
        "  All three PNW banks report on a calendar-year basis.",
    ]
    for i, line in enumerate(methodology):
        ws2.write(i, 0, line)

    wb.close()
    print(f"Workbook written to: {OUTPUT}")


# ---- Pretty-print helpers --------------------------------------------------

def fmt_money(v):
    if v is None: return "n/a"
    if abs(v) >= 1e9:  return f"${v/1e9:,.2f}B"
    if abs(v) >= 1e6:  return f"${v/1e6:,.0f}M"
    return f"${v:,.0f}"


def fmt_pct(v):
    return f"{v:.2%}" if v is not None else "n/a"


def fmt_num(v, digits=2):
    return f"{v:.{digits}f}" if v is not None else "n/a"


def print_table(rows):
    print(f"\n{'='*80}")
    print(f"  Pacific Northwest Regional Banks — Comp Table")
    print(f"{'='*80}")
    print(f"  {'Metric':<32} {rows[0]['ticker']:>12} {rows[1]['ticker']:>12} {rows[2]['ticker']:>12}")
    print("-" * 80)

    def line(label, key, fmt):
        vals = [fmt(r.get(key)) for r in rows]
        print(f"  {label:<32} {vals[0]:>12} {vals[1]:>12} {vals[2]:>12}")

    print("\n  -- Scale (most recent FY) --")
    line("Total Assets",          "assets",          fmt_money)
    line("Total Deposits",        "deposits",        fmt_money)
    line("Net Loans",             "loans",           fmt_money)
    line("Stockholders' Equity",  "equity",          fmt_money)
    line("Net Income",            "net_income",      fmt_money)
    line("Net Interest Income",   "nii",             fmt_money)

    print("\n  -- Profitability & Balance Sheet --")
    line("ROA",                   "roa",             fmt_pct)
    line("ROE",                   "roe",             fmt_pct)
    line("Loan-to-Deposit",       "ldr",             fmt_pct)
    line("Equity / Assets",       "equity_assets",   fmt_pct)
    line("Est. NIM",              "nim_est",         fmt_pct)

    print("\n  -- Market --")
    line("Share Price",           "price",           lambda v: f"${v:.2f}" if v else "n/a")
    line("Market Cap",            "market_cap",      fmt_money)
    line("P/E (trailing)",        "pe_trailing",     lambda v: fmt_num(v, 1))
    line("P/B",                   "pb",              lambda v: fmt_num(v, 2))
    line("Dividend Yield",        "div_yield",       fmt_pct)
    line("Beta",                  "beta",            lambda v: fmt_num(v, 2))
    print("=" * 80)


# ---- Main ------------------------------------------------------------------

def main():
    rows = []
    for bank in BANKS:
        print(f"Pulling {bank['ticker']} ({bank['name']})...")
        fund = extract_fundamentals(bank["cik"])
        mkt = extract_market(bank["ticker"])
        ratios = compute_ratios(fund, mkt)

        row = {
            "ticker": bank["ticker"],
            "name":   bank["name"],
            # Raw (full magnitude) for print
            "assets":     _v(fund["assets"]),
            "deposits":   _v(fund["deposits"]),
            "loans":      _v(fund["loans"]),
            "equity":     _v(fund["equity"]),
            "net_income": _v(fund["net_income"]),
            "nii":        ratios["nii"],
            # Millions for Excel
            "assets_m":     _v(fund["assets"])     / 1e6 if fund["assets"]     else None,
            "deposits_m":   _v(fund["deposits"])   / 1e6 if fund["deposits"]   else None,
            "loans_m":      _v(fund["loans"])      / 1e6 if fund["loans"]      else None,
            "equity_m":     _v(fund["equity"])     / 1e6 if fund["equity"]     else None,
            "net_income_m": _v(fund["net_income"]) / 1e6 if fund["net_income"] else None,
            "nii_m":        ratios["nii"]          / 1e6 if ratios["nii"]      else None,
            "market_cap_m": mkt["market_cap"]      / 1e6 if mkt["market_cap"]  else None,
            # Ratios (already unitless)
            "roa":            ratios["roa"],
            "roe":            ratios["roe"],
            "ldr":            ratios["ldr"],
            "equity_assets":  ratios["equity_assets"],
            "nim_est":        ratios["nim_est"],
            # Market
            "price":        mkt["price"],
            "market_cap":   mkt["market_cap"],
            "pe_trailing":  mkt["pe_trailing"],
            "pb":           mkt["pb"],
            "div_yield":    mkt["div_yield"],
            "beta":         mkt["beta"],
        }
        rows.append(row)

    print_table(rows)
    write_workbook(rows)
    return rows


if __name__ == "__main__":
    main()
