"""
Banner Corporation (BANR) — Strategic Takeout Value Analysis

Quantifies the M&A optionality embedded in BANR's standalone valuation by
applying recent community-bank precedent-transaction multiples to BANR's
current tangible book value. Identifies plausible strategic acquirers and
frames the "standalone vs. strategic" value gap.

Approach:
  1. Pull BANR current financials (TBV, shares out) from SEC EDGAR.
  2. Apply a range of P/TBV takeover multiples (low / base / high) from
     published industry benchmarks for community-bank M&A (1.3x - 1.8x).
  3. Compute implied takeover prices per share and premium to current.
  4. Identify a shortlist of strategic acquirers (PNW/western-US regional
     banks of sufficient scale).
  5. Produce a football-field chart, workbook, and brief deal memo.

Deliverables:
  - banr_takeout_analysis.xlsx
  - banr_takeout_chart.png (football field)
  - banr_takeout_memo.pdf (1-page deal memo)

Data sources:
  - SEC EDGAR XBRL companyfacts API (real financials)
  - yfinance (current market price)
  - Precedent multiples are industry-standard ranges from published
    bank-M&A reporting (S&P Global, Bank Director). No specific deals
    are cited as comparables unless verifiable.
"""

import sys
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import xlsxwriter
import yfinance as yf
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Reuse pipeline from PNW banks project
sys.path.insert(0, str(Path(__file__).parent.parent / "pnw-banks"))
from build_comp_table import extract_fundamentals, extract_market, _v  # noqa: E402

HERE = Path(__file__).parent
XLSX = HERE / "banr_takeout_analysis.xlsx"
CHART = HERE / "banr_takeout_chart.png"
PDF = HERE / "banr_takeout_memo.pdf"

BLACK = "#1a1a1a"
GOLD = "#c5a572"
MUTED = "#888888"
BLUE = "#4a6fa5"
GREEN = "#4a7c59"
RED = "#b85c5c"
LIGHT = "#f5f5f5"

BANR_CIK = "0000946673"

# Precedent-transaction multiple ranges for community-bank M&A.
# Source: widely-cited industry benchmarks from recent bank M&A coverage
# in S&P Global Market Intelligence and Bank Director reporting.
# These ranges reflect deals in the $500M-$5B deal-size bracket.
SCENARIOS = [
    {"label": "Low  (distressed / capital constrained)", "pbv": 1.20, "color": MUTED},
    {"label": "Conservative (market deal)",              "pbv": 1.35, "color": BLUE},
    {"label": "Base case (healthy franchise)",           "pbv": 1.55, "color": GOLD},
    {"label": "Strategic premium (bidding war)",         "pbv": 1.80, "color": GREEN},
]

# Plausible strategic acquirers for BANR.
# Selection criteria: western-US presence, sufficient scale to absorb
# $16.4B target (roughly 1x-2x BANR's size minimum), known appetite for
# regional-bank M&A, regulatory capacity to take on a community-bank
# acquisition in the current environment.
ACQUIRERS = [
    {"ticker": "GBCI", "name": "Glacier Bancorp",          "rationale": "PNW/Mountain West-focused, conservative-culture community bank; explicit growth-via-acquisition strategy; low-cost deposit franchise overlaps well with BANR's PNW footprint."},
    {"ticker": "ZION", "name": "Zions Bancorporation",     "rationale": "Western-US regional bank, $88B assets; has done large acquisitions historically; BANR's PNW franchise would strengthen Zions' relative geographic weakness in OR/WA."},
    {"ticker": "FIBK", "name": "First Interstate Bank",    "rationale": "$30B-asset western regional; recent deal history (Great Western acquisition); similar community-banking culture makes integration risk lower."},
    {"ticker": "WAFD", "name": "WaFd Bank (Washington Federal)", "rationale": "Seattle-based $23B-asset thrift converting to commercial-banking focus; recent Luther Burbank acquisition shows M&A capability; adjacent geography."},
    {"ticker": "USB",  "name": "U.S. Bancorp",             "rationale": "Long-shot option: $685B-asset superregional; MUFG Union Bank deal showed willingness to buy PNW presence; would need regulatory concentration clearance."},
]


def pct(v):
    return f"{v*100:.1f}%" if v is not None else "n/a"


def dollars(v):
    return f"${v:,.2f}" if v is not None else "n/a"


def pull_banr():
    """Pull BANR fundamentals + current market data."""
    fund = extract_fundamentals(BANR_CIK)
    mkt = extract_market("BANR")

    assets = _v(fund["assets"])
    equity = _v(fund["equity"])
    ni = _v(fund["net_income"])

    # Estimate goodwill (BANR's goodwill is publicly ~$240M from 10-K);
    # using a published figure is fine, but we approximate as 0 here to
    # remain fully-derivable from EDGAR. Caveat noted in the memo.
    # For precision we pull it explicitly via a separate EDGAR tag.
    from build_comp_table import latest_annual, fetch_edgar_facts
    facts = fetch_edgar_facts(BANR_CIK)
    goodwill_entry = latest_annual(facts, "Goodwill")
    intangibles_entry = latest_annual(facts, "IntangibleAssetsNetExcludingGoodwill")
    goodwill = goodwill_entry["val"] if goodwill_entry else 0
    intangibles = intangibles_entry["val"] if intangibles_entry else 0

    tangible_equity = equity - goodwill - intangibles

    # Get shares outstanding from yfinance info
    ticker = yf.Ticker("BANR")
    shares = ticker.info.get("sharesOutstanding")

    # Compute per-share tangible book value
    tbv_per_share = tangible_equity / shares if shares else None
    book_per_share = equity / shares if shares else None

    current_price = mkt["price"]
    market_cap = mkt["market_cap"]

    return {
        "current_price":     current_price,
        "market_cap":        market_cap,
        "shares_out":        shares,
        "total_equity":      equity,
        "goodwill":          goodwill,
        "intangibles":       intangibles,
        "tangible_equity":   tangible_equity,
        "book_per_share":    book_per_share,
        "tbv_per_share":     tbv_per_share,
        "net_income":        ni,
        "roe":               ni / equity if (ni and equity) else None,
        "roa":               ni / assets if (ni and assets) else None,
        "current_pbv":       current_price / tbv_per_share if tbv_per_share else None,
        "assets":            assets,
        "pe_trailing":       mkt["pe_trailing"],
    }


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


def build_chart(banr, scenarios):
    """Football-field horizontal bar chart showing takeout ranges."""
    fig, ax = plt.subplots(figsize=(11, 5))

    current = banr["current_price"]
    labels = [s["label"] for s in scenarios]
    prices = [s["implied_price"] for s in scenarios]
    colors_ = [s["color"] for s in scenarios]

    y_pos = range(len(scenarios))
    bars = ax.barh(y_pos, prices, color=colors_, edgecolor=BLACK, linewidth=0.8,
                   height=0.65)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels, fontsize=10, color=BLACK)
    ax.invert_yaxis()

    # Annotate each bar with price + premium
    for bar, s in zip(bars, scenarios):
        w = bar.get_width()
        ax.text(w + 1.5, bar.get_y() + bar.get_height() / 2,
                f"  ${w:.2f}  ({s['premium']:+.1f}%)",
                va="center", fontsize=10, fontweight="bold", color=BLACK)

    # Current price reference line
    ax.axvline(current, color=RED, linestyle="--", linewidth=2, alpha=0.75,
               label=f"Current: ${current:.2f}")
    ax.text(current + 0.4, -0.6, f"Current ${current:.2f}",
            fontsize=9, color=RED, fontweight="bold")

    ax.set_xlabel("Implied Takeout Price per Share ($)", fontsize=11, color=BLACK)
    ax.set_title("BANR — Strategic Takeout Value (Football Field)",
                 fontsize=14, fontweight="bold", color=BLACK, pad=14)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(True, axis="x", linestyle="--", alpha=0.3)
    ax.set_xlim(0, max(prices) * 1.3)

    plt.suptitle(f"Applied to TBV/share ${banr['tbv_per_share']:.2f} "
                 f"(current trading at {banr['current_pbv']:.2f}x P/TBV)",
                 fontsize=10, color=MUTED, y=0.92)

    plt.tight_layout()
    plt.savefig(CHART, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"Chart written: {CHART}")


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
    ws.write("A2", "Applied recent community-bank M&A multiples to BANR's TBV.", sub)

    ws.write("A4", "Current Valuation Inputs", wb.add_format({"bold": True,
            "bg_color": GOLD, "align": "left", "border": 1, "font_color": BLACK}))
    inputs = [
        ("Current Share Price",       banr["current_price"],    dol),
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
              "to absorb BANR ($16.4B assets).", sub)

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
        "of a bank's tangible book value. Goodwill is excluded because an acquirer",
        "cannot use it to generate future earnings.",
        "",
        "Multiple ranges applied:",
        "  Low (1.20x):         Distressed seller or capital-constrained acquirer",
        "  Conservative (1.35x): Routine in-market deal, limited synergies",
        "  Base case (1.55x):   Typical healthy community-bank deal, cost synergies priced in",
        "  Strategic (1.80x):   Competitive bidding, scarce franchise, revenue synergies credited",
        "",
        "These ranges reflect published reporting on recent community-bank M&A",
        "(S&P Global Market Intelligence, Bank Director annual M&A surveys).",
        "Actual deal multiples vary materially by deal size, geography, regulatory",
        "environment, and target-specific franchise quality.",
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
        "  - Market data:      Yahoo Finance via yfinance",
        "  - Multiple ranges:  Published industry reporting (cited above)",
    ]
    for i, line in enumerate(notes):
        fmt = wb.add_format({"bold": True}) if i == 0 else None
        ws3.write(i, 0, line, fmt)

    wb.close()
    print(f"Workbook written: {XLSX}")


def build_memo(banr, scenarios):
    """One-page strategic takeout memo PDF."""
    base = next(s for s in scenarios if "Base" in s["label"])
    low = scenarios[0]
    high = scenarios[-1]

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

    story = []

    # Header
    header = [[
        Paragraph("<b>BANR — Strategic Takeout Analysis</b><br/>"
                  "<font size='8'>Cross-check on the standalone long thesis</font>", h2),
        Paragraph(f"<b>Takeout range: ${low['implied_price']:.2f} – ${high['implied_price']:.2f}</b><br/>"
                  f"<font size='8'>Base case {base['pbv']:.2f}x: <b>${base['implied_price']:.2f}</b> "
                  f"({base['premium']:+.1f}% vs. current)</font><br/>"
                  f"<font size='8' color='#4a7c59'><b>Strategic premium "
                  f"${high['implied_price']:.2f}</b> converges with standalone $82 target</font>", h2),
    ]]
    htbl = Table(header, colWidths=[4.0*inch, 3.3*inch])
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
        f"BANR's standalone case (see <b>Project 4: Long BANR Pitch</b>) values the stock at "
        f"${82.02:.2f} / +21.1% upside via peer re-rate and historical P/E. "
        f"This memo tests whether <b>strategic takeout value</b> arrives at a similar place "
        f"using a different method — applying recent community-bank M&A multiples to "
        f"BANR's tangible book value. "
        f"At current {banr['current_pbv']:.2f}x P/TBV, BANR <b>already trades above</b> "
        f"routine deal multiples (~1.35x), meaning the market embeds some M&A premium. "
        f"But a genuine strategic bid — scarce PNW franchise, best-in-class ROE — would "
        f"clear <b>{high['pbv']:.2f}x P/TBV or roughly ${high['implied_price']:.2f}</b>, "
        f"a level that <i>converges with</i> the standalone thesis price target.",
        body))

    story.append(Paragraph("Why BANR Is a Realistic M&A Target", h1))
    targets = [
        f"<b>Attractive size:</b> $16.4B assets — large enough to be meaningful, small enough "
        f"to avoid Hart-Scott-Rodino complications common in superregional deals.",
        f"<b>Scarce franchise:</b> OR/WA/ID community-banking presence with strong "
        f"relationship-banking culture. Difficult to build organically; must be acquired.",
        f"<b>Best-in-class profitability:</b> {banr['roe']*100:.1f}% ROE, {banr['roa']*100:.2f}% ROA "
        f"— acquirers pay more for higher-ROE targets because purchase accounting "
        f"write-ups lever their own earnings.",
        f"<b>Clean balance sheet:</b> No significant regulatory overhangs; CRE exposure "
        f"within community-bank norms; ample capital buffer.",
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
    story.append(Paragraph(
        "<i>Applied to BANR's current TBV per share of "
        f"${banr['tbv_per_share']:.2f}. Multiples reflect published reporting on "
        "recent community-bank M&A (S&P Global, Bank Director). Goodwill and "
        f"intangibles excluded from equity (goodwill ${banr['goodwill']/1e6:,.0f}M "
        f"stripped for TBV).</i>", small))

    # Chart
    if CHART.exists():
        story.append(Spacer(1, 4))
        story.append(Image(str(CHART), width=6.8*inch, height=3.1*inch))

    # Potential Acquirers
    story.append(Paragraph("Plausible Strategic Acquirers (Shortlist)", h1))
    acq_data = [["Ticker", "Name", "Rationale"]]
    for a in ACQUIRERS[:4]:  # Top 4 to fit on page
        acq_data.append([a["ticker"], a["name"], a["rationale"]])
    acq_tbl = Table(acq_data, colWidths=[0.7*inch, 1.7*inch, 4.4*inch])
    acq_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK_C),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER_C),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(acq_tbl)

    # Conclusion
    story.append(Spacer(1, 6))
    story.append(Paragraph("Conclusion — Convergence, Not Incremental Upside", h1))
    story.append(Paragraph(
        f"The standalone pitch targets <b>${82.02:.2f} (+21.1%)</b> via peer re-rate and "
        f"historical P/E. Applying community-bank M&A multiples to BANR's TBV produces a "
        f"different picture: the <b>base case ${base['implied_price']:.2f}</b> sits "
        f"<b>{(base['implied_price']/82.02 - 1)*100:+.1f}%</b> below the standalone target, "
        f"and only the <b>strategic-premium scenario ${high['implied_price']:.2f}</b> "
        f"<i>converges</i> with the standalone thesis. The useful takeaway is that two "
        f"unrelated valuation methods — an earnings-based re-rate and a franchise-based "
        f"M&A multiple — triangulate at roughly the same level (~$82-$84) only under a "
        f"bidding-war scenario. Below that, standalone value leads. This doesn't stack "
        f"additional upside onto the pitch; it says the pitch's target already captures "
        f"most of what a strategic acquirer would rationally pay. M&A is optionality, "
        f"not incremental thesis.",
        body))

    # Disclosure
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"<b>Analyst:</b> Isaac Lefohn  |  <b>Date:</b> "
        f"{datetime.today().strftime('%B %d, %Y')}  |  "
        f"Oregon State University, BS Finance (Class of 2027)", small))
    story.append(Paragraph(
        "<b>Disclosures:</b> Framework analysis only — not an M&A pitch, not a deal "
        "prediction, not investment advice. No material non-public information used; "
        "all inputs from SEC EDGAR and Yahoo Finance. Acquirer shortlist is "
        "illustrative and does not represent any actual or reported interest.",
        small))

    doc.build(story)
    print(f"Memo written: {PDF}")


def main():
    print("Pulling BANR data...")
    banr = pull_banr()

    print("\nBANR snapshot:")
    print(f"  Current price:  ${banr['current_price']:.2f}")
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
