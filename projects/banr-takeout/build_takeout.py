"""
Banner Corporation (BANR) - Strategic Takeout Value Analysis

Sizes the M&A optionality in BANR's standalone valuation by applying a range
of community-bank M&A multiples (industry ranges, not specific deals) to
BANR's tangible book value. Lists plausible strategic acquirers and frames
the "standalone vs. strategic" value gap.

Approach:
  1. BANR financials (equity, goodwill) from SEC EDGAR; price and shares
     outstanding from Yahoo Finance.
  2. Apply four assumed P/TBV takeover multiples (1.20x / 1.35x / 1.55x /
     1.80x). These are general industry ranges for community-bank deals,
     not multiples from a specific set of comparable transactions.
  3. Compute implied takeover prices per share and premium to the price.
  4. List plausible strategic acquirers (western-US regional banks).
  5. Produce a football-field chart, workbook, and two-page deal memo.

Deliverables:
  - banr_takeout_analysis.xlsx
  - banr_takeout_chart.png (football field)
  - banr_takeout_memo.pdf (two-page deal memo)

Inputs
  By default everything is rebuilt from pinned_inputs_2026-04-23.json, the
  frozen data behind the published April 23, 2026 memo, so a rebuild
  reproduces the published figures ($67.76 price, $46.44 TBV/share, 1.46x).

  python build_takeout.py          # pinned April 23, 2026 inputs (default)
  python build_takeout.py --live   # re-pull EDGAR + yfinance, date today

Data sources:
  - SEC EDGAR XBRL companyfacts API (financials)
  - yfinance (market price, shares outstanding)
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import xlsxwriter  # noqa: E402
from reportlab.lib import colors  # noqa: E402
from reportlab.lib.pagesizes import LETTER  # noqa: E402
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet  # noqa: E402
from reportlab.lib.units import inch  # noqa: E402
from reportlab.lib.utils import ImageReader  # noqa: E402
from reportlab.platypus import (  # noqa: E402
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

HERE = Path(__file__).parent
XLSX = HERE / "banr_takeout_analysis.xlsx"
CHART = HERE / "banr_takeout_chart.png"
PDF = HERE / "banr_takeout_memo.pdf"
PINNED = HERE / "pinned_inputs_2026-04-23.json"

BLACK = "#1a1a1a"
GOLD = "#c5a572"
MUTED = "#888888"
BLUE = "#4a6fa5"
GREEN = "#4a7c59"
RED = "#b85c5c"
LIGHT = "#f5f5f5"

BANR_CIK = "0000946673"

# Standalone result from the Long BANR pitch memo (April 23, 2026)
STANDALONE_TARGET = 82.02
STANDALONE_UPSIDE = 21.1

# Assumed P/TBV multiples for community-bank M&A. These are general
# industry ranges, not multiples taken from a specific set of deals or a
# specific report.
SCENARIOS = [
    {"label": "Low  (distressed / capital constrained)", "pbv": 1.20, "color": MUTED},
    {"label": "Conservative (market deal)",              "pbv": 1.35, "color": BLUE},
    {"label": "Base case (healthy franchise)",           "pbv": 1.55, "color": GOLD},
    {"label": "Strategic premium (bidding war)",         "pbv": 1.80, "color": GREEN},
]

# Plausible strategic acquirers for BANR (illustrative only).
# Selection criteria: western-US presence, enough scale to absorb a
# $16.4B-asset target, a record of bank M&A. Asset sizes are from each
# bank's latest SEC filing available on April 23, 2026 (Dec 31, 2025
# balance sheets).
ACQUIRERS = [
    {"ticker": "GBCI", "name": "Glacier Bancorp",          "rationale": "PNW/Mountain West-focused, conservative-culture community bank; explicit growth-via-acquisition strategy; low-cost deposit franchise overlaps well with BANR's PNW footprint."},
    {"ticker": "ZION", "name": "Zions Bancorporation",     "rationale": "Western-US regional bank, $89B assets; has done large acquisitions historically; BANR's PNW franchise would strengthen Zions' relative geographic weakness in OR/WA."},
    {"ticker": "FIBK", "name": "First Interstate Bank",    "rationale": "$27B-asset western regional; recent deal history (Great Western acquisition); similar community-banking culture makes integration risk lower."},
    {"ticker": "WAFD", "name": "WaFd Bank (Washington Federal)", "rationale": "Washington-based $27B-asset bank shifting toward commercial banking; recent Luther Burbank acquisition shows M&A capability; adjacent geography."},
    {"ticker": "USB",  "name": "U.S. Bancorp",             "rationale": "Long-shot option: superregional; MUFG Union Bank deal showed willingness to buy West Coast presence; would need regulatory concentration clearance."},
]


def pct(v):
    return f"{v*100:.1f}%" if v is not None else "n/a"


def dollars(v):
    return f"${v:,.2f}" if v is not None else "n/a"


# ---- Inputs -----------------------------------------------------------------

def derive(raw):
    """Per-share and ratio figures from the raw inputs."""
    equity = raw["total_equity"]
    tangible_equity = equity - raw["goodwill"] - raw["intangibles"]
    shares = raw["shares_out"]
    tbv_per_share = tangible_equity / shares if shares else None
    book_per_share = equity / shares if shares else None
    ni, assets = raw["net_income"], raw["assets"]
    price = raw["current_price"]
    return {
        **raw,
        "tangible_equity":   tangible_equity,
        "book_per_share":    book_per_share,
        "tbv_per_share":     tbv_per_share,
        "roe":               ni / equity if (ni and equity) else None,
        "roa":               ni / assets if (ni and assets) else None,
        "equity_assets":     equity / assets if (equity and assets) else None,
        "current_pbv":       price / tbv_per_share if tbv_per_share else None,
    }


def load_pinned():
    data = json.loads(PINNED.read_text())
    raw = {k: data[k] for k in ("current_price", "market_cap", "shares_out",
                                "assets", "total_equity", "net_income",
                                "goodwill", "intangibles", "pe_trailing")}
    banr = derive(raw)
    banr["memo_date"] = data["memo_date"]
    banr["price_date"] = data["memo_date"]
    banr["revision_note"] = data.get("revision_note")
    banr["other_intangibles_not_deducted"] = (
        data.get("other_intangibles_not_deducted", {}).get("value"))
    return banr


def pull_banr():
    """Old behavior: pull BANR fundamentals + current market data live."""
    sys.path.insert(0, str(HERE.parent / "pnw-banks"))
    import yfinance as yf
    from build_comp_table import (  # noqa: E402
        _v, extract_fundamentals, extract_market, fetch_edgar_facts, latest_annual)

    fund = extract_fundamentals(BANR_CIK)
    mkt = extract_market("BANR")
    facts = fetch_edgar_facts(BANR_CIK)
    goodwill_entry = latest_annual(facts, "Goodwill")
    intangibles_entry = (latest_annual(facts, "IntangibleAssetsNetExcludingGoodwill")
                         or latest_annual(facts, "OtherIntangibleAssetsNet"))
    raw = {
        "current_price": mkt["price"],
        "market_cap":    mkt["market_cap"],
        "shares_out":    yf.Ticker("BANR").info.get("sharesOutstanding"),
        "assets":        _v(fund["assets"]),
        "total_equity":  _v(fund["equity"]),
        "net_income":    _v(fund["net_income"]),
        "goodwill":      goodwill_entry["val"] if goodwill_entry else 0,
        "intangibles":   intangibles_entry["val"] if intangibles_entry else 0,
        "pe_trailing":   mkt["pe_trailing"],
    }
    banr = derive(raw)
    today = datetime.today().strftime("%B %d, %Y")
    banr["memo_date"] = today
    banr["price_date"] = today
    banr["revision_note"] = None
    banr["other_intangibles_not_deducted"] = None
    return banr


def compute_scenarios(banr):
    """Apply each P/TBV scenario to BANR's TBV to get implied takeout prices."""
    out = []
    current = banr["current_price"]
    tbv = banr["tbv_per_share"]
    for s in SCENARIOS:
        implied = tbv * s["pbv"]
        premium = (implied / current - 1) * 100
        out.append({
            **s,
            "implied_price": implied,
            "premium": premium,
        })
    return out


# ---- Chart ------------------------------------------------------------------

def build_chart(banr, scenarios):
    """Football-field horizontal bar chart showing takeout ranges."""
    fig, ax = plt.subplots(figsize=(11, 5.2))

    current = banr["current_price"]
    labels = [s["label"] for s in scenarios]
    prices = [s["implied_price"] for s in scenarios]
    colors_ = [s["color"] for s in scenarios]

    y_pos = list(range(len(scenarios)))
    ax.barh(y_pos, prices, color=colors_, edgecolor=BLACK, linewidth=0.8,
            height=0.65)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels, fontsize=10, color=BLACK)
    # Inverted axis with headroom above the first bar for the price label
    ax.set_ylim(len(scenarios) - 0.5, -1.05)

    # Value labels in one column to the right of every bar and of the
    # price line, so nothing overlaps
    label_x = max(prices) + 2.5
    for y, s in zip(y_pos, scenarios):
        ax.text(label_x, y,
                f"${s['implied_price']:.2f}  ({s['premium']:+.1f}%)",
                va="center", ha="left", fontsize=10, fontweight="bold",
                color=BLACK)

    # Price reference line + label inside the axes headroom
    ax.axvline(current, color=RED, linestyle="--", linewidth=2, alpha=0.75)
    ax.text(current + 0.8, -0.72,
            f"Price {banr['price_date']}: ${current:.2f}",
            va="center", ha="left", fontsize=9, color=RED, fontweight="bold")

    ax.set_xlabel("Implied Takeout Price per Share ($)", fontsize=11, color=BLACK)
    ax.set_title("BANR — Strategic Takeout Value (Football Field)",
                 fontsize=14, fontweight="bold", color=BLACK, pad=26)
    ax.text(0.5, 1.02,
            f"Applied to TBV/share ${banr['tbv_per_share']:.2f} "
            f"(trading at {banr['current_pbv']:.2f}x P/TBV on {banr['price_date']})",
            transform=ax.transAxes, ha="center", va="bottom",
            fontsize=10, color=MUTED)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(True, axis="x", linestyle="--", alpha=0.3)
    ax.set_xlim(0, max(prices) * 1.3)

    plt.tight_layout()
    plt.savefig(CHART, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"Chart written: {CHART}")


# ---- Workbook ---------------------------------------------------------------

def build_workbook(banr, scenarios):
    wb = xlsxwriter.Workbook(str(XLSX))

    title = wb.add_format({"bold": True, "font_size": 14, "font_color": BLACK})
    sub = wb.add_format({"italic": True, "font_size": 9, "font_color": "#555555"})
    header = wb.add_format({
        "bold": True, "bg_color": BLACK, "font_color": "white",
        "align": "center", "valign": "vcenter", "border": 1, "text_wrap": True,
    })
    lbl = wb.add_format({"bold": True, "align": "left", "border": 1, "bg_color": LIGHT})
    cell = wb.add_format({"align": "center", "border": 1})
    dol = wb.add_format({"align": "center", "border": 1, "num_format": "$#,##0.00"})
    dolM = wb.add_format({"align": "center", "border": 1, "num_format": "$#,##0"})
    pct_fmt = wb.add_format({"align": "center", "border": 1, "num_format": "0.00%"})
    mult = wb.add_format({"align": "center", "border": 1, "num_format": "0.00\"x\""})
    highlight = wb.add_format({
        "bold": True, "align": "center", "border": 1, "bg_color": "#fff8e5",
        "num_format": "$#,##0.00",
    })

    # ---- Sheet 1: Summary ----
    ws = wb.add_worksheet("Takeout Summary")
    ws.set_column(0, 0, 34)
    ws.set_column(1, 4, 18)

    ws.write("A1", "BANR — Strategic Takeout Analysis", title)
    ws.write("A2", "Applied community-bank M&A multiples (industry ranges, not "
                   f"specific deals) to BANR's TBV. Market data as of {banr['price_date']}.", sub)

    ws.write("A4", "Current Valuation Inputs", wb.add_format({"bold": True,
            "bg_color": GOLD, "align": "left", "border": 1, "font_color": BLACK}))
    inputs = [
        (f"Share Price ({banr['price_date']})", banr["current_price"], dol),
        ("Market Cap",                banr["market_cap"],       dolM),
        ("Shares Outstanding",        banr["shares_out"],       cell),
        ("Book Value per Share",      banr["book_per_share"],   dol),
        ("Tangible Book per Share",   banr["tbv_per_share"],    dol),
        ("Current P/TBV",             banr["current_pbv"],      mult),
        ("ROE",                       banr["roe"],              pct_fmt),
        ("ROA",                       banr["roa"],              pct_fmt),
    ]
    for i, (label, val, fmt) in enumerate(inputs, start=5):
        ws.write(f"A{i}", label, lbl)
        if val is not None:
            ws.write(f"B{i}", val, fmt)
        else:
            ws.write(f"B{i}", "n/a", cell)

    ws.write("A14", "Scenario Analysis", wb.add_format({"bold": True,
            "bg_color": GOLD, "align": "left", "border": 1, "font_color": BLACK}))
    hdr_row = ["Scenario", "P/TBV Applied", "Implied Price", "Premium vs. Current"]
    for i, h in enumerate(hdr_row):
        ws.write(14, i, h, header)
    ws.set_row(14, 28)

    for i, s in enumerate(scenarios):
        r = 15 + i
        ws.write(r, 0, s["label"], lbl)
        ws.write(r, 1, s["pbv"], mult)
        ws.write(r, 2, s["implied_price"], highlight if "Base" in s["label"] else dol)
        ws.write(r, 3, s["premium"] / 100, pct_fmt)

    # ---- Sheet 2: Strategic Acquirers ----
    ws2 = wb.add_worksheet("Strategic Acquirers")
    ws2.set_column(0, 0, 10)
    ws2.set_column(1, 1, 30)
    ws2.set_column(2, 2, 100)

    ws2.write("A1", "BANR — Potential Strategic Acquirer Shortlist", title)
    ws2.write("A2",
              "Western-US regional banks with scale and M&A history sufficient "
              "to absorb BANR ($16.4B assets). Illustrative only; no actual or "
              "reported interest.", sub)

    ws2.write(3, 0, "Ticker", header)
    ws2.write(3, 1, "Name", header)
    ws2.write(3, 2, "Strategic Rationale", header)

    for i, a in enumerate(ACQUIRERS):
        r = 4 + i
        ws2.write(r, 0, a["ticker"], cell)
        ws2.write(r, 1, a["name"], lbl)
        ws2.write(r, 2, a["rationale"],
                  wb.add_format({"align": "left", "border": 1, "text_wrap": True, "valign": "top"}))
        ws2.set_row(r, 52)

    # ---- Sheet 3: Methodology ----
    ws3 = wb.add_worksheet("Methodology")
    ws3.set_column(0, 0, 110)
    notes = [
        "Methodology & Key Caveats",
        "",
        "P/TBV is the standard valuation multiple for bank M&A — acquirers pay for",
        "the franchise (deposits, customer relationships, branch network) on top",
        "of a bank's tangible book value. Goodwill is excluded because it is not",
        "tangible capital.",
        "",
        "Multiple ranges applied:",
        "  Low (1.20x):         Distressed seller or capital-constrained acquirer",
        "  Conservative (1.35x): Routine in-market deal, limited synergies",
        "  Base case (1.55x):   Typical healthy community-bank deal, cost synergies priced in",
        "  Strategic (1.80x):   Competitive bidding, scarce franchise, revenue synergies credited",
        "",
        "These are assumed industry ranges for community-bank M&A, not multiples",
        "taken from specific comparable deals or a specific report. Actual deal",
        "multiples vary materially by deal size, geography, regulatory",
        "environment, and target-specific franchise quality.",
        "",
        "Tangible book value = fiscal 2025 10-K stockholders' equity less goodwill.",
        "Banner's other intangibles ($1.5M at Dec 31, 2025) were not deducted; the",
        "effect is about $0.04 per share.",
        "",
        "Caveats:",
        "  - This is an ILLUSTRATIVE framework, not an M&A pitch.",
        "  - No real deal is currently announced or rumored between BANR and any acquirer.",
        "  - Bank holding company regulations (Bank Holding Company Act, concentration",
        "    limits) constrain which entities can realistically bid.",
        "  - Acquirer-specific accretion/dilution analysis is not included here — a",
        "    full M&A model requires pulling the acquirer's financials and modeling",
        "    purchase accounting, synergies, and financing mix.",
        "",
        "Data sources:",
        "  - Fundamentals:     SEC EDGAR XBRL companyfacts API",
        f"  - Market data:      Yahoo Finance via yfinance (as of {banr['price_date']})",
        "  - Multiple ranges:  Assumed industry ranges (not specific deals)",
    ]
    for i, line in enumerate(notes):
        fmt = wb.add_format({"bold": True}) if i == 0 else None
        ws3.write(i, 0, line, fmt)

    wb.close()
    print(f"Workbook written: {XLSX}")


# ---- Memo -------------------------------------------------------------------

def build_memo(banr, scenarios):
    """Two-page strategic takeout memo PDF."""
    base = next(s for s in scenarios if "Base" in s["label"])
    low = scenarios[0]
    high = scenarios[-1]
    pdate = banr["price_date"]

    doc = SimpleDocTemplate(
        str(PDF), pagesize=LETTER,
        leftMargin=0.5*inch, rightMargin=0.5*inch,
        topMargin=0.4*inch, bottomMargin=0.4*inch,
        title="BANR Strategic Takeout Analysis — Isaac Lefohn",
        author="Isaac Lefohn",
    )

    BLACK_C = colors.HexColor(BLACK)
    GOLD_C = colors.HexColor(GOLD)
    LIGHT_C = colors.HexColor(LIGHT)
    BORDER_C = colors.HexColor("#cccccc")

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=13,
                        textColor=BLACK_C, spaceAfter=3, spaceBefore=6,
                        fontName="Helvetica-Bold")
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=10,
                        textColor=BLACK_C, spaceAfter=3, fontName="Helvetica-Bold")
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=8.5,
                          textColor=BLACK_C, leading=10.5, spaceAfter=2)
    small = ParagraphStyle("small", parent=styles["BodyText"], fontSize=7.5,
                           textColor=colors.HexColor("#666666"), leading=9)
    tcell = ParagraphStyle("tcell", parent=styles["BodyText"], fontSize=7.5,
                           textColor=BLACK_C, leading=9)
    thead = ParagraphStyle("thead", parent=tcell, fontName="Helvetica-Bold",
                           textColor=colors.white)

    def cell(text, style=tcell):
        return Paragraph(escape(text), style)

    story = []

    # Header
    header = [[
        Paragraph("<b>BANR — Strategic Takeout Analysis</b><br/>"
                  "<font size='8'>Cross-check on the standalone long thesis</font>", h2),
        Paragraph(f"<b>Takeout range: ${low['implied_price']:.2f} – ${high['implied_price']:.2f}</b><br/>"
                  f"<font size='8'>Base case {base['pbv']:.2f}x: <b>${base['implied_price']:.2f}</b> "
                  f"({base['premium']:+.1f}% vs. ${banr['current_price']:.2f} price)</font><br/>"
                  f"<font size='8' color='#4a7c59'><b>Strategic premium "
                  f"${high['implied_price']:.2f}</b> converges with standalone "
                  f"${STANDALONE_TARGET:.0f} target</font>", h2),
    ]]
    htbl = Table(header, colWidths=[3.2*inch, 4.1*inch])
    htbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_C),
        ("BOX", (0, 0), (-1, -1), 1.2, BLACK_C),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(htbl)
    story.append(Spacer(1, 8))

    # Setup
    story.append(Paragraph("Thesis", h1))
    story.append(Paragraph(
        f"BANR's standalone case (see the <b>Long BANR pitch memo</b>) values the stock at "
        f"${STANDALONE_TARGET:.2f} / +{STANDALONE_UPSIDE:.1f}% upside using peer P/E, "
        f"normalized P/E and price-to-book re-rating. "
        f"This memo tests whether <b>strategic takeout value</b> arrives at a similar place "
        f"with a different method: applying community-bank M&amp;A multiples (industry "
        f"ranges, not specific deals) to BANR's tangible book value. "
        f"At {banr['current_pbv']:.2f}x P/TBV on {pdate}, BANR <b>already trades above</b> "
        f"a routine deal multiple (~1.35x), meaning the market embeds some M&amp;A premium. "
        f"A genuine strategic bid for a scarce PNW franchise with peer-leading ROE could "
        f"reach <b>{high['pbv']:.2f}x P/TBV, or roughly ${high['implied_price']:.2f}</b>, "
        f"a level that <i>converges with</i> the standalone price target.",
        body))

    story.append(Paragraph("Why BANR Is a Realistic M&amp;A Target", h1))
    targets = [
        f"<b>Size:</b> ${banr['assets']/1e9:.1f}B assets, large enough to matter and "
        f"small enough for a regional acquirer to absorb.",
        "<b>Scarce franchise:</b> community-banking footprint across Washington, Oregon, "
        "California and Idaho that would be hard to build from scratch.",
        f"<b>Peer-leading profitability:</b> {banr['roe']*100:.1f}% ROE, {banr['roa']*100:.2f}% ROA; "
        f"acquirers generally pay more for higher-ROE franchises.",
        f"<b>Capital:</b> equity/assets of {banr['equity_assets']*100:.1f}% "
        f"(fiscal 2025 10-K).",
    ]
    for t in targets:
        story.append(Paragraph(f"&bull; {t}", body))

    # Scenario table
    story.append(Spacer(1, 4))
    story.append(Paragraph("Takeout Valuation Football Field", h1))
    tbl_data = [["Scenario", "P/TBV", "Implied Price", "Premium"]]
    for s in scenarios:
        tbl_data.append([
            s["label"],
            f"{s['pbv']:.2f}x",
            f"${s['implied_price']:.2f}",
            f"{s['premium']:+.1f}%",
        ])
    tbl = Table(tbl_data, colWidths=[3.4*inch, 0.9*inch, 1.5*inch, 1.0*inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK_C),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 3), (-1, 3), GOLD_C),  # Base case row
        ("FONTNAME", (0, 3), (-1, 3), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER_C),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 3))
    note = (
        f"<i>Applied to BANR's TBV per share of ${banr['tbv_per_share']:.2f} "
        f"(fiscal 2025 10-K equity less goodwill of ${banr['goodwill']/1e6:,.0f}M, "
        f"divided by {banr['shares_out']/1e6:.1f}M shares). The P/TBV multiples are "
        f"community-bank M&amp;A multiples (industry ranges, not specific deals); they are "
        f"assumptions, not multiples from specific comparable transactions.")
    oi = banr.get("other_intangibles_not_deducted")
    if oi:
        note += (f" Other intangibles (${oi/1e6:.1f}M) were not deducted; the effect is "
                 f"about ${oi/banr['shares_out']:.2f} per share.")
    story.append(Paragraph(note + "</i>", small))

    # Chart
    if CHART.exists():
        story.append(Spacer(1, 4))
        w, h = ImageReader(str(CHART)).getSize()
        story.append(Image(str(CHART), width=6.8*inch, height=6.8*inch * h / w))

    # Potential Acquirers (heading kept with its table)
    acq_data = [[cell("Ticker", thead), cell("Name", thead), cell("Rationale", thead)]]
    for a in ACQUIRERS[:4]:  # Top 4 to fit on page
        acq_data.append([cell(a["ticker"]), cell(a["name"]), cell(a["rationale"])])
    acq_tbl = Table(acq_data, colWidths=[0.6*inch, 1.75*inch, 4.85*inch])
    acq_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK_C),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER_C),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(KeepTogether([
        Paragraph("Plausible Strategic Acquirers (Shortlist)", h1),
        acq_tbl,
        Spacer(1, 2),
        Paragraph("<i>Illustrative only. Asset sizes from each bank's latest SEC "
                  f"filing available on {pdate}.</i>", small),
    ]))

    # Conclusion
    story.append(Spacer(1, 6))
    story.append(Paragraph("Conclusion — Convergence, Not Incremental Upside", h1))
    story.append(Paragraph(
        f"The standalone pitch targets <b>${STANDALONE_TARGET:.2f} "
        f"(+{STANDALONE_UPSIDE:.1f}%)</b> using peer P/E, normalized P/E and P/B. "
        f"Applying community-bank M&amp;A multiples to BANR's TBV gives a different picture: "
        f"the <b>base case ${base['implied_price']:.2f}</b> sits below the standalone target "
        f"(<b>{(base['implied_price']/STANDALONE_TARGET - 1)*100:+.1f}%</b>), "
        f"and only the <b>strategic-premium scenario ${high['implied_price']:.2f}</b> "
        f"<i>converges</i> with the standalone thesis. Two different approaches, an "
        f"earnings-based re-rate and a franchise-based M&amp;A multiple, meet at roughly "
        f"the same level (~$82-$84) only under a bidding-war scenario. Below that, "
        f"standalone value leads. This does not stack extra upside onto the pitch; it says "
        f"the pitch's target already captures most of what a strategic acquirer would "
        f"rationally pay. M&amp;A is optionality, not incremental thesis.",
        body))

    # Disclosure
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"<b>Analyst:</b> Isaac Lefohn  |  <b>Date:</b> {banr['memo_date']}  |  "
        f"Oregon State University, B.S. Finance (expected December 2027)", small))
    if banr.get("revision_note"):
        story.append(Paragraph(f"<i>{escape(banr['revision_note'])}</i>", small))
    story.append(Paragraph(
        "<b>Disclosures:</b> Framework analysis only: not an M&amp;A pitch, not a deal "
        "prediction, not investment advice. No material non-public information used; "
        f"all inputs from SEC EDGAR and Yahoo Finance (market data as of {pdate}). "
        "Acquirer shortlist is illustrative and does not represent any actual or "
        "reported interest.",
        small))

    doc.build(story)
    print(f"Memo written: {PDF}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--live", action="store_true",
                    help="re-pull EDGAR + yfinance data instead of the pinned "
                         "April 23, 2026 inputs")
    args = ap.parse_args()

    if args.live:
        print("Pulling BANR data (live)...")
        banr = pull_banr()
    else:
        print(f"Using pinned inputs: {PINNED.name}")
        banr = load_pinned()

    print("\nBANR snapshot:")
    print(f"  Price:          ${banr['current_price']:.2f} ({banr['price_date']})")
    print(f"  Market cap:     ${banr['market_cap']/1e9:.2f}B")
    print(f"  Shares out:     {banr['shares_out']/1e6:.1f}M")
    print(f"  TBV / share:    ${banr['tbv_per_share']:.2f}")
    print(f"  Current P/TBV:  {banr['current_pbv']:.2f}x")
    print(f"  ROE:            {banr['roe']*100:.2f}%")

    scenarios = compute_scenarios(banr)
    print("\nTakeout scenarios:")
    for s in scenarios:
        print(f"  {s['label']:<48}  {s['pbv']:.2f}x  "
              f"→ ${s['implied_price']:.2f}  ({s['premium']:+.1f}%)")

    build_chart(banr, scenarios)
    build_workbook(banr, scenarios)
    build_memo(banr, scenarios)

    print("\nDone.")


if __name__ == "__main__":
    main()
