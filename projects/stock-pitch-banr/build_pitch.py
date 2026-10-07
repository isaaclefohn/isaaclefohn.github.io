"""
Banner Corporation (NASDAQ: BANR) - Long Pitch Memo

Builds a two-page pitch memo PDF:
  - Fundamentals from SEC EDGAR XBRL (via the pnw-banks pipeline)
  - Market data from Yahoo Finance (yfinance)
  - Peer valuation against the PNW regional-bank set (COLB, BANR, HFWA)

Pitch format:
  - Recommendation header (rating + price target + upside)
  - Situation
  - Investment thesis (numbered)
  - Catalysts
  - Valuation: peer P/E re-rate, normalized P/E (13.5x community-bank norm),
    and P/B re-rate, averaged into one target
  - Risks & mitigants
  - Key metrics table
  - Disclosure

Inputs
  By default the memo is rebuilt from pinned_inputs_2026-04-23.json, the
  frozen data behind the published April 23, 2026 memo, so a rebuild
  reproduces the published figures ($67.76 price, $82.02 target, +21.1%).
  In pinned mode the existing banr_pitch_chart.png is reused as-is, because
  its five-year price history is not stored in the snapshot.

  python build_pitch.py          # pinned April 23, 2026 inputs (default)
  python build_pitch.py --live   # re-pull EDGAR + yfinance, redraw chart,
                                 # and date the memo today

Output: banr_pitch.pdf
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

HERE = Path(__file__).parent
OUTPUT = HERE / "banr_pitch.pdf"
CHART = HERE / "banr_pitch_chart.png"
PINNED = HERE / "pinned_inputs_2026-04-23.json"

BLACK = colors.HexColor("#1a1a1a")
GOLD = colors.HexColor("#c5a572")
GREEN = colors.HexColor("#2e6b3f")
RED = colors.HexColor("#b83232")
LIGHT = colors.HexColor("#f5f5f5")
BORDER = colors.HexColor("#cccccc")

# Valuation assumptions (kept in the pinned file too, so they travel with it)
NORMALIZED_PE = 13.5   # fixed community-bank norm, NOT BANR's own P/E history
TARGET_PB = 1.5        # P/B judged appropriate for a ~10% ROE bank


# ---- Inputs -----------------------------------------------------------------

def load_pinned():
    """Frozen April 23, 2026 inputs (see the JSON's _about field)."""
    data = json.loads(PINNED.read_text())
    return {
        "rows": data["rows"],
        "memo_date": data["memo_date"],
        "revision_note": data.get("revision_note"),
        "returns": data["five_year_return"],
        "normalized_pe": data.get("normalized_pe", NORMALIZED_PE),
        "target_pb": data.get("target_pb", TARGET_PB),
        "market_date_label": data["memo_date"],
    }


def load_live():
    """Old behavior: re-pull EDGAR + yfinance through the pnw-banks pipeline.
    Note: this also rewrites projects/pnw-banks/pnw_banks_comp.xlsx."""
    sys.path.insert(0, str(HERE.parent / "pnw-banks"))
    from build_comp_table import main as run_comp  # noqa: E402

    print("Running PNW banks pipeline to gather comp data...")
    rows = run_comp()
    print("\nBuilding chart...")
    returns = build_chart(rows)
    today = datetime.today().strftime("%B %d, %Y")
    return {
        "rows": rows,
        "memo_date": today,
        "revision_note": None,
        "returns": returns,
        "normalized_pe": NORMALIZED_PE,
        "target_pb": TARGET_PB,
        "market_date_label": today,
    }


def build_chart(rows):
    """Two-panel figure: BANR 5Y price vs KRE, plus peer P/E comparison.
    Returns the five-year returns used in the Situation paragraph."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.dates as mdates
    import matplotlib.pyplot as plt
    import yfinance as yf

    price_data = yf.download(["BANR", "KRE"], start="2021-04-01",
                             end="2026-04-01", auto_adjust=True,
                             progress=False)["Close"]
    # Rebase to 100
    rebased = price_data / price_data.iloc[0] * 100

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.2))

    ax1.plot(rebased.index, rebased["BANR"], color="#c5a572", linewidth=2.2,
             label="BANR")
    ax1.plot(rebased.index, rebased["KRE"], color="#888888", linewidth=1.6,
             linestyle="--", label="KRE (Regional Bank ETF)")
    ax1.axhline(100, color="#1a1a1a", linestyle=":", linewidth=0.6, alpha=0.5)
    ax1.set_title("5Y Total Return (Rebased to 100)", fontsize=11,
                  fontweight="bold", color="#1a1a1a")
    ax1.set_ylabel("Index (Apr 2021 = 100)", fontsize=9)
    ax1.legend(loc="upper left", frameon=False, fontsize=9)
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)
    ax1.grid(True, linestyle="--", alpha=0.3)
    ax1.xaxis.set_major_locator(mdates.YearLocator())
    ax1.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))

    # Panel B: P/E peer comparison
    tickers = [r["ticker"] for r in rows]
    pes = [r["pe_trailing"] or 0 for r in rows]
    bar_colors = ["#c5a572" if t == "BANR" else "#bbbbbb" for t in tickers]
    bars = ax2.bar(tickers, pes, color=bar_colors, edgecolor="#1a1a1a",
                   linewidth=0.8)
    for bar, pe in zip(bars, pes):
        ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2,
                 f"{pe:.1f}x", ha="center", va="bottom", fontsize=9,
                 fontweight="bold")
    ax2.set_title("Trailing P/E — BANR Trades at Discount",
                  fontsize=11, fontweight="bold", color="#1a1a1a")
    ax2.set_ylabel("P/E (x)", fontsize=9)
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)
    ax2.grid(True, axis="y", linestyle="--", alpha=0.3)
    ax2.set_ylim(0, max(pes) * 1.25)

    plt.tight_layout()
    plt.savefig(CHART, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"Chart written to: {CHART}")

    last = rebased.iloc[-1]
    return {
        "window": "April 1, 2021 to April 1, 2026 (dividend-adjusted closes)",
        "BANR": float(last["BANR"] / 100 - 1),
        "KRE": float(last["KRE"] / 100 - 1),
    }


# ---- Formatting helpers ------------------------------------------------------

def pct(v): return f"{v*100:.2f}%" if v is not None else "n/a"
def dollars(v): return f"${v:,.2f}" if v is not None else "n/a"
def mult(v): return f"{v:.1f}x" if v is not None else "n/a"


def cell(text, style):
    """Plain-text table cell that wraps. Escapes &, <, > for ReportLab."""
    return Paragraph(escape(text), style)


def image_flowable(path, width):
    """Image scaled to a width, keeping the PNG's own aspect ratio."""
    w, h = ImageReader(str(path)).getSize()
    return Image(str(path), width=width, height=width * h / w)


# ---- Memo --------------------------------------------------------------------

def build_memo(inputs):
    """Render the pitch memo PDF."""
    rows = inputs["rows"]
    banr = next(r for r in rows if r["ticker"] == "BANR")
    colb = next(r for r in rows if r["ticker"] == "COLB")
    hfwa = next(r for r in rows if r["ticker"] == "HFWA")
    ret = inputs["returns"]

    # ---- Valuation triangulation -------------------------------------------
    peer_pe = (colb["pe_trailing"] + hfwa["pe_trailing"]) / 2
    current_price = banr["price"]
    trailing_eps = current_price / banr["pe_trailing"]

    # Method 1: Peer-multiple re-rate
    pt_peer = trailing_eps * peer_pe

    # Method 2: Normalized P/E. 13.5x is a fixed, hard-coded norm for a
    # typical community bank. It is not BANR's own historical average.
    norm_pe = inputs["normalized_pe"]
    pt_norm = trailing_eps * norm_pe

    # Method 3: Book value target, P/B of 1.5x (judged appropriate for a
    # ~10% ROE bank)
    target_pb = inputs["target_pb"]
    book_value = current_price / banr["pb"]
    pt_pb = book_value * target_pb

    price_target = (pt_peer + pt_norm + pt_pb) / 3
    upside = (price_target / current_price - 1) * 100

    # ROE premium vs. each peer, computed (not typed in)
    roe_vs_colb = (banr["roe"] / colb["roe"] - 1) * 100
    roe_vs_hfwa = (banr["roe"] / hfwa["roe"] - 1) * 100

    # ---- Document setup ----------------------------------------------------
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=LETTER,
        leftMargin=0.5*inch, rightMargin=0.5*inch,
        topMargin=0.4*inch, bottomMargin=0.4*inch,
        title="BANR Stock Pitch — Isaac Lefohn",
        author="Isaac Lefohn",
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=14,
                        textColor=BLACK, spaceAfter=4, spaceBefore=6,
                        fontName="Helvetica-Bold")
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=10,
                        textColor=BLACK, spaceAfter=3, spaceBefore=6,
                        fontName="Helvetica-Bold")
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=8.5,
                          textColor=BLACK, leading=10.5, spaceAfter=2)
    small = ParagraphStyle("small", parent=styles["BodyText"], fontSize=7.5,
                           textColor=colors.HexColor("#666666"), leading=9)
    tcell = ParagraphStyle("tcell", parent=styles["BodyText"], fontSize=8,
                           textColor=BLACK, leading=9.5)
    tcell_c = ParagraphStyle("tcell_c", parent=tcell, alignment=1)
    thead = ParagraphStyle("thead", parent=tcell, fontName="Helvetica-Bold",
                           textColor=colors.white)
    thead_c = ParagraphStyle("thead_c", parent=thead, alignment=1)
    vcell = ParagraphStyle("vcell", parent=tcell, fontSize=8.5, leading=10)
    vcell_c = ParagraphStyle("vcell_c", parent=vcell, alignment=1)
    vcell_b = ParagraphStyle("vcell_b", parent=vcell, fontName="Helvetica-Bold")
    vcell_bc = ParagraphStyle("vcell_bc", parent=vcell_b, alignment=1)
    vhead = ParagraphStyle("vhead", parent=vcell, fontName="Helvetica-Bold",
                           textColor=colors.white)
    vhead_c = ParagraphStyle("vhead_c", parent=vhead, alignment=1)

    story = []

    # ---- Header box (Recommendation + price target) ------------------------
    header_data = [
        [
            Paragraph("<b>Banner Corporation (NASDAQ: BANR)</b><br/>"
                      "<font size='8'>Pacific Northwest community bank</font>", h2),
            Paragraph("<b>Rating: BUY</b><br/>"
                      f"<font size='8'>Price Target: ${price_target:.2f}</font><br/>"
                      f"<font size='8' color='#2e6b3f'><b>Upside: {upside:+.1f}%</b></font>", h2),
            Paragraph(f"<b>Price: ${current_price:.2f}</b><br/>"
                      f"<font size='8'>As of {inputs['market_date_label']}</font><br/>"
                      f"<font size='8'>P/E: {banr['pe_trailing']:.1f}x | "
                      f"ROE: {banr['roe']*100:.1f}%</font><br/>"
                      f"<font size='8'>Mkt Cap: ${banr['market_cap']/1e9:.2f}B</font>", h2),
        ]
    ]
    header_tbl = Table(header_data, colWidths=[3.1*inch, 2.1*inch, 2.1*inch])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 1.2, BLACK),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 10))

    # ---- Situation ---------------------------------------------------------
    story.append(Paragraph("Situation", h1))
    story.append(Paragraph(
        f"Banner Corp (BANR) is a ${banr['assets']/1e9:.1f}B-asset Pacific Northwest "
        f"community bank trading at <b>{banr['pe_trailing']:.1f}x trailing earnings</b>, "
        f"a discount to its regional-bank peers even though it has the "
        f"<b>highest profitability in the peer group</b> (ROE {banr['roe']*100:.2f}%, "
        f"ROA {banr['roa']*100:.2f}%). The market is pricing BANR like an average "
        f"regional bank exposed to commercial real estate (CRE) stress. The financials "
        f"point the other way: BANR returned <b>{ret['BANR']*100:+.1f}% over 5 years vs. "
        f"{ret['KRE']*100:+.1f}% for the KRE ETF</b> and has an "
        f"<b>{banr['equity_assets']*100:.1f}%</b> equity/assets ratio. Recent growth has "
        f"been largely organic. Its last acquisitions (Skagit Bancorp in 2018 and "
        f"AltaPacific Bancorp in 2019) are well behind it, so BANR is not in the "
        f"middle of a merger integration, unlike COLB after its merger with Umpqua.",
        body))

    # ---- Thesis ------------------------------------------------------------
    story.append(Paragraph("Investment Thesis", h1))
    thesis = [
        ("<b>1. Peer-leading profitability trades at a discount.</b> BANR's "
         f"ROE of {banr['roe']*100:.2f}% is <b>{roe_vs_colb:.0f}% higher than COLB's</b> "
         f"({colb['roe']*100:.2f}%) and <b>{roe_vs_hfwa:.0f}% higher than HFWA's</b> "
         f"({hfwa['roe']*100:.2f}%), yet BANR trades at "
         f"{banr['pe_trailing']:.1f}x vs. a peer average of {peer_pe:.1f}x. "
         f"Higher-quality earnings should trade <i>at or above</i> peers, not below."),

        ("<b>2. Past acquisitions are well behind it.</b> Banner's last "
         "bank acquisitions closed in 2018 (Skagit) and 2019 (AltaPacific), and its "
         "reported goodwill has not changed since 2019. Unlike COLB (post-Umpqua "
         "merger), BANR is not absorbing a large combination; its loans and deposits "
         "come from community markets across Washington, Oregon, California and Idaho. "
         "Steady, relationship-based franchises like this are what acquirers "
         "typically pay premiums for."),

        ("<b>3. Capital strength provides downside protection.</b> Equity/assets of "
         f"{banr['equity_assets']*100:.1f}% gives BANR a meaningful capital cushion, "
         "supporting the dividend and opportunistic buybacks and, if regional-bank "
         "M&amp;A picks up, flexibility to be either an acquirer or a target."),

        ("<b>4. Dividend yield with runway.</b> The current yield of "
         f"{banr['div_yield']*100:.2f}% is well covered (payout ratio &lt; 50% of "
         "trailing EPS), providing income while waiting for a re-rating."),
    ]
    for t in thesis:
        story.append(Paragraph(t, body))

    # ---- Catalysts ---------------------------------------------------------
    story.append(Paragraph("Near-Term Catalysts (6-12 months)", h1))
    catalysts = [
        "Regional-bank M&amp;A activity resumes → BANR could command a premium as a "
        "scarce high-ROE PNW franchise (strategic optionality).",
        "Fed rate cuts → NIM expansion if deposit costs re-price faster than "
        "floating-rate loans.",
        "CRE stress proves smaller than feared → multiple re-rating as the "
        "regional-bank risk premium compresses.",
        "Continued quarterly results that keep BANR's ROE ahead of peers.",
    ]
    for c in catalysts:
        story.append(Paragraph(f"&bull; {c}", body))

    # ---- Valuation table ---------------------------------------------------
    story.append(Paragraph("Valuation — Triangulation to Price Target", h1))
    val_rows = [
        ("Peer P/E re-rate", f"EPS ${trailing_eps:.2f}",
         f"{peer_pe:.1f}x (peer avg)", pt_peer),
        ("Normalized P/E", f"EPS ${trailing_eps:.2f}",
         f"{norm_pe:.1f}x (community-bank norm)", pt_norm),
        ("P/B re-rate (quality adj.)", f"BV ${book_value:.2f}",
         f"{target_pb:.1f}x (10% ROE bank)", pt_pb),
    ]
    val_data = [[cell("Method", vhead), cell("Input", vhead_c),
                 cell("Multiple", vhead_c), cell("Implied Price", vhead_c),
                 cell("Upside", vhead_c)]]
    for method, inp, mul, pt in val_rows:
        val_data.append([
            cell(method, vcell), cell(inp, vcell_c), cell(mul, vcell_c),
            cell(f"${pt:.2f}", vcell_c),
            cell(f"{(pt/current_price-1)*100:+.1f}%", vcell_c),
        ])
    val_data.append([cell("Blended Price Target", vcell_b), "", "",
                     cell(f"${price_target:.2f}", vcell_bc),
                     cell(f"{upside:+.1f}%", vcell_bc)])
    val_tbl = Table(val_data, colWidths=[1.75*inch, 1.05*inch, 1.95*inch,
                                         1.1*inch, 0.95*inch])
    val_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("BACKGROUND", (0, -1), (-1, -1), GOLD),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(val_tbl)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<i>Price target is a simple average of the three methods. The normalized "
        f"P/E is a fixed {norm_pe:.1f}x assumption for a typical community bank, not "
        "BANR's own historical average. Because it is close to the peer average, the "
        "two P/E methods give nearly the same answer, so the P/B method and the "
        "separate takeout analysis are the real cross-checks.</i>", small))

    # ---- Chart -------------------------------------------------------------
    if CHART.exists():
        story.append(Spacer(1, 4))
        story.append(image_flowable(CHART, 6.3*inch))

    # ---- Risks -------------------------------------------------------------
    story.append(Spacer(1, 4))
    story.append(Paragraph("Risks &amp; Mitigants", h1))

    risks = [
        ("CRE exposure — PNW office/retail stress", "Medium",
         "Community-bank CRE books tend to be smaller loans, often owner-occupied, "
         "with a different risk profile than money-center office exposure. CRE "
         "concentration was not modeled in this memo."),
        ("Deposit outflow / funding cost pressure", "Medium",
         f"Loan/deposit of {banr['ldr']*100:.0f}% (fiscal 2025); community-bank core "
         "deposits tend to be less rate-sensitive than money-center deposits."),
        ("Regional-bank sector contagion (SVB-style)", "Low",
         f"Equity/assets of {banr['equity_assets']*100:.1f}% vs. SVB ~7%; deposits "
         "are spread across community markets rather than concentrated in one "
         "industry, as SVB's were."),
        ("NIM compression if Fed holds", "Medium",
         f"BANR's estimated NIM ({banr['nim_est']*100:.2f}% of assets) is above COLB "
         f"({colb['nim_est']*100:.2f}%) and HFWA ({hfwa['nim_est']*100:.2f}%); "
         "compression would hit peers too, so BANR's relative position should hold."),
    ]
    risk_data = [[cell("Risk", thead), cell("Magnitude", thead_c),
                  cell("Mitigant", thead)]]
    for r, m, mit in risks:
        risk_data.append([cell(r, tcell), cell(m, tcell_c), cell(mit, tcell)])
    risk_tbl = Table(risk_data, colWidths=[2.1*inch, 0.85*inch, 4.25*inch])
    risk_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(risk_tbl)

    # ---- Metrics snapshot --------------------------------------------------
    story.append(Spacer(1, 6))
    story.append(Paragraph("Metrics Snapshot vs. Peers", h1))
    metrics_data = [
        ["Metric", "BANR", "COLB", "HFWA"],
        ["Total Assets",
         f"${banr['assets']/1e9:.2f}B",
         f"${colb['assets']/1e9:.2f}B",
         f"${hfwa['assets']/1e9:.2f}B"],
        ["ROA",
         pct(banr["roa"]), pct(colb["roa"]), pct(hfwa["roa"])],
        ["ROE",
         pct(banr["roe"]), pct(colb["roe"]), pct(hfwa["roe"])],
        ["Equity / Assets",
         pct(banr["equity_assets"]), pct(colb["equity_assets"]), pct(hfwa["equity_assets"])],
        ["P/E (trailing)",
         mult(banr["pe_trailing"]), mult(colb["pe_trailing"]), mult(hfwa["pe_trailing"])],
        ["P/B",
         f"{banr['pb']:.2f}x", f"{colb['pb']:.2f}x", f"{hfwa['pb']:.2f}x"],
        ["Dividend Yield",
         pct(banr["div_yield"]), pct(colb["div_yield"]), pct(hfwa["div_yield"])],
        ["Beta",
         f"{banr['beta']:.2f}", f"{colb['beta']:.2f}", f"{hfwa['beta']:.2f}"],
    ]
    met_tbl = Table(metrics_data, colWidths=[2.0*inch, 1.6*inch, 1.6*inch, 1.6*inch])
    met_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (1, 1), (1, -1), colors.HexColor("#fff8e5")),  # BANR column
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]))
    story.append(met_tbl)

    # ---- Bottom Line -------------------------------------------------------
    story.append(Spacer(1, 6))
    story.append(Paragraph("Bottom Line", h1))
    story.append(Paragraph(
        f"<b>BUY BANR to an ${price_target:.2f} 12-month target ({upside:+.1f}% upside)</b>. "
        "The market is applying a broad regional-bank discount to a franchise with "
        "peer-leading profitability. Three valuation methods point to a similar range. "
        "Capital strength limits downside; profitability and M&amp;A optionality "
        f"define upside. At the {inputs['market_date_label']} price, the risk/reward "
        "is favorable.",
        body))

    # ---- Disclosures -------------------------------------------------------
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"<b>Analyst:</b> Isaac Lefohn &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>Date:</b> {inputs['memo_date']} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"Oregon State University, B.S. Finance (expected December 2027)", small))
    if inputs.get("revision_note"):
        story.append(Paragraph(f"<i>{escape(inputs['revision_note'])}</i>", small))
    story.append(Paragraph(
        f"<b>Disclosures:</b> Analyst did not own BANR as of {inputs['memo_date']}. "
        "This memo is for academic and portfolio-demonstration purposes; it is not "
        "investment advice. Data sources: SEC EDGAR XBRL companyfacts API "
        "(fiscal 2025 10-K data) and Yahoo Finance (market data as of "
        f"{inputs['market_date_label']}).", small))

    doc.build(story)
    print(f"Pitch memo written to: {OUTPUT}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--live", action="store_true",
                    help="re-pull EDGAR + yfinance data instead of the pinned "
                         "April 23, 2026 inputs")
    args = ap.parse_args()

    if args.live:
        inputs = load_live()
    else:
        print(f"Using pinned inputs: {PINNED.name} (chart PNG reused as-is)")
        inputs = load_pinned()

    print("\nBuilding pitch memo...")
    build_memo(inputs)

    print(f"\nDone. Deliverables:\n  {OUTPUT}\n  {CHART}")


if __name__ == "__main__":
    main()
