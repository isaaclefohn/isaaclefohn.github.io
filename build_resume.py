"""
Isaac Lefohn — one-page finance resume.

Regenerates Isaac_Lefohn_Resume.pdf from the content dictionaries below, so the
PDF and the website stay in sync from a single source of truth. Edit the data
at the top, rerun the script, and the whole document rebuilds:

    python3 build_resume.py

Layout targets a single US Letter page. If content grows past one page the
script exits non-zero rather than silently spilling onto a second page.

Output: Isaac_Lefohn_Resume.pdf
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT = Path(__file__).parent / "Isaac_Lefohn_Resume.pdf"

BLACK = colors.HexColor("#1a1a1a")
GRAY = colors.HexColor("#555555")
NAVY = colors.HexColor("#000333")

MARGIN = 49.2
CONTENT_WIDTH = LETTER[0] - 2 * MARGIN

NAME = "ISAAC LEFOHN"
CONTACT = (
    "Corvallis, OR&nbsp; |&nbsp; (503) 847-7976&nbsp; |&nbsp; kiwilefohn@gmail.com"
    "&nbsp; |&nbsp; linkedin.com/in/isaac-lefohn-472a152b0&nbsp; |&nbsp; isaaclefohn.com"
)

EDUCATION = {
    "degree": "Bachelor of Science in Finance, Honors Scholar",
    "school": "Oregon State University, College of Business — Corvallis, OR",
    "date": "Expected December 2027",
}

COURSEWORK = [
    (
        "Core Finance &amp; Business",
        [
            "Financial Accounting",
            "Managerial Accounting",
            "Finance",
            "Business Process Management",
            "Technical Writing",
        ],
    ),
    (
        "Economics &amp; Quantitative",
        [
            "Principles of Microeconomics",
            "Principles of Macroeconomics",
            "Differential Calculus",
            "Integral Calculus",
            "Statistics I &amp; II",
        ],
    ),
    (
        "Upcoming Coursework",
        [
            "Investments (FIN 341)",
            "Advanced Financial Management (FIN 342)",
            "Business Information Systems",
        ],
    ),
]

PROJECTS = [
    {
        "title": "Long Banner Financial Corp (NASDAQ: BANR) — Equity Research Pitch",
        "date": "April 2026",
        "org": "Independent project — isaaclefohn.com/projects/stock-pitch-banr",
        "bullets": [
            "BUY recommendation with $82.02 price target (+21.1% upside) triangulated across DCF, "
            "comparable companies, and dividend discount model",
            "Built integrated Python pipeline pulling SEC EDGAR XBRL filings and yfinance to drive "
            "5-year forecast and sensitivity tables",
            "Cross-validated thesis with precedent M&amp;A multiples on PNW regional bank takeouts; "
            "published full write-up with reproducible code",
        ],
    },
    {
        "title": "DCF Valuation — Waste Management, Inc. (NYSE: WM)",
        "date": "March 2026",
        "org": "Independent project — isaaclefohn.com/projects/dcf-wm",
        "bullets": [
            "5-year DCF with 6.58% WACC; arrived at $122.72 implied intrinsic value vs. $232.80 "
            "market price (overvalued)",
            "Modeled FCF, terminal value, and sensitivity grid on WACC and terminal growth; output "
            "as 12-page PDF report",
        ],
    },
    {
        "title": "Pacific Northwest Regional Banks — Comparable Companies Analysis",
        "date": "March 2026",
        "org": "Independent project — isaaclefohn.com/projects/pnw-banks",
        "bullets": [
            "Sector comp on Columbia Banking, Banner Financial, Heritage Financial across NIM, "
            "ROTCE, efficiency, trading multiples; identified BANR as relative-value standout, "
            "seeding the equity research pitch",
        ],
    },
]

EXPERIENCE = [
    {
        "title": "Cashier Team Member, Front End Service (Seasonal)",
        "date": "July 2026 – Present",
        "org": "Whole Foods Market, Bridgeport — Tigard, OR",
        "bullets": [
            "Ring high-volume front-end transactions in a flagship-format store, handling cash and "
            "card tender accurately at pace through peak grocery hours",
            "Resolve pricing questions, returns, and customer escalations at the register, "
            "escalating to the team lead when an issue exceeds register-level authority",
        ],
    },
    {
        "title": "Facility Manager",
        "date": "June 2025 – Present",
        "org": "Portland Indoor / Lil’ Kickers — Portland, OR",
        "bullets": [
            "Run daily operations of a multi-field indoor sports facility: opening/closing, "
            "scheduling, and customer intake",
            "Reconcile point-of-sale transactions against deposits at shift close; flag variances "
            "to ownership for follow-up",
            "Cross-train staff on cash-handling, safety, and customer-service protocols for "
            "consistency across shifts",
        ],
    },
    {
        "title": "Independent Contractor — Video Editor",
        "date": "March 2020 – Present",
        "org": "Virtuosity.Online — Tigard, OR",
        "bullets": [
            "Operate a sole-proprietor video-editing business end to end: intake, scoping, "
            "contracts, invoicing, and tax reporting",
            "Manage concurrent client projects with overlapping deadlines and maintain long-term "
            "client relationships through scope control and quality delivery",
        ],
    },
    {
        "title": "Sales Associate",
        "date": "May 2021 – August 2025",
        "org": "RocketFizz — Beaverton, OR",
        "bullets": [
            "Opened and closed the store independently, including full daily cash reconciliation, "
            "bank deposits, and end-of-day reporting",
            "Maintained inventory accuracy through receiving, pricing, and cycle counts; reordered "
            "based on sell-through patterns",
        ],
    },
    {
        "title": "Sales Associate",
        "date": "June – September 2024",
        "org": "Nordstrom — Tigard, OR",
        "bullets": [
            "Processed transactions and supported end-of-shift register reconciliation in a "
            "high-volume department through peak summer traffic",
        ],
    },
]

SKILLS = [
    (
        "Financial &amp; Analytical",
        "Valuation (DCF, Comparables, Precedent Transactions), 3-Statement Modeling, "
        "Equity Research, Financial Statement Analysis",
    ),
    (
        "Technical",
        "Excel (Financial Modeling), Python (pandas, numpy, yfinance), SEC EDGAR XBRL, Git / GitHub",
    ),
    (
        "Professional",
        "Client Relationship Management, Business Communication, Project &amp; Deadline Management",
    ),
]

ACTIVITIES = (
    "Intramural Soccer, Oregon State University &nbsp; • &nbsp; "
    "Personal Portfolio Site, isaaclefohn.com"
)


# --- styles ---------------------------------------------------------------

S_NAME = ParagraphStyle(
    "name", fontName="Times-Roman", fontSize=22, leading=26,
    alignment=TA_CENTER, textColor=BLACK,
)
S_CONTACT = ParagraphStyle(
    "contact", fontName="Helvetica", fontSize=8.5, leading=11,
    alignment=TA_CENTER, textColor=GRAY,
)
S_SECTION = ParagraphStyle(
    "section", fontName="Helvetica-Bold", fontSize=8.5, leading=10, textColor=BLACK,
)
S_TITLE = ParagraphStyle(
    "title", fontName="Helvetica-Bold", fontSize=9, leading=10.5, textColor=BLACK,
)
S_ORG = ParagraphStyle(
    "org", fontName="Helvetica-Oblique", fontSize=8.5, leading=9.8, textColor=BLACK,
)
S_DATE = ParagraphStyle(
    "date", fontName="Helvetica", fontSize=8.5, leading=11,
    alignment=2, textColor=GRAY,
)
S_BULLET = ParagraphStyle(
    "bullet", fontName="Helvetica", fontSize=8, leading=9.0,
    textColor=NAVY, leftIndent=9, bulletIndent=1, spaceBefore=0.5,
)
S_SUBHEAD = ParagraphStyle(
    "subhead", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=BLACK,
)
S_BODY = ParagraphStyle(
    "body", fontName="Helvetica", fontSize=8, leading=9.6, textColor=NAVY,
)


def section(label):
    """Section header plus its underline rule."""
    return [
        Spacer(1, 3.5),
        Paragraph(label, S_SECTION),
        Spacer(1, 1.5),
        HRFlowable(width="100%", thickness=0.8, color=BLACK, spaceAfter=3),
    ]


def header_row(left_flowables, date):
    """Two-column row: entry heading on the left, right-aligned date on the right."""
    table = Table(
        [[left_flowables, Paragraph(date, S_DATE)]],
        colWidths=[CONTENT_WIDTH - 120, 120],
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def entry(item, first=False):
    """One project or job: heading + date, org line, bullets."""
    block = [
        header_row([Paragraph(item["title"], S_TITLE)], item["date"]),
        Paragraph(item["org"], S_ORG),
    ]
    block += [Paragraph(b, S_BULLET, bulletText="•") for b in item["bullets"]]
    return [Spacer(1, 0 if first else 2.5), KeepTogether(block)]


def coursework_block():
    """Coursework laid out in two columns."""
    columns = [[], []]
    for i, (heading, courses) in enumerate(COURSEWORK):
        col = columns[i % 2]
        if col:
            col.append(Spacer(1, 4))
        col.append(Paragraph(heading, S_SUBHEAD))
        col += [Paragraph(c, S_BULLET, bulletText="•") for c in courses]

    table = Table([columns], colWidths=[CONTENT_WIDTH / 2] * 2)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (1, 0), (1, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def build():
    story = [
        Paragraph(NAME, S_NAME),
        Paragraph(CONTACT, S_CONTACT),
        Spacer(1, 3),
        HRFlowable(width="100%", thickness=1.2, color=BLACK),
    ]

    story += section("EDUCATION")
    story.append(header_row(
        [Paragraph(EDUCATION["degree"], S_TITLE), Paragraph(EDUCATION["school"], S_ORG)],
        EDUCATION["date"],
    ))
    story.append(Spacer(1, 4))
    story.append(coursework_block())

    story += section("EQUITY RESEARCH &amp; VALUATION PROJECTS")
    for i, project in enumerate(PROJECTS):
        story += entry(project, first=(i == 0))

    story += section("PROFESSIONAL EXPERIENCE")
    for i, job in enumerate(EXPERIENCE):
        story += entry(job, first=(i == 0))

    story += section("SKILLS")
    for label, items in SKILLS:
        story.append(Paragraph(f"<b>{label}:</b> {items}", S_BODY))

    story += section("LEADERSHIP &amp; ACTIVITIES")
    story.append(Paragraph(ACTIVITIES, S_BODY))

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=LETTER,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=48,
        bottomMargin=30,
        title="Isaac Lefohn Resume",
        author="Isaac Lefohn",
    )
    doc.build(story)
    return doc.page


if __name__ == "__main__":
    pages = build()
    print(f"Wrote {OUTPUT.name} ({pages} page{'s' if pages != 1 else ''})")
    if pages != 1:
        raise SystemExit(f"Resume must fit one page; got {pages}. Trim content or tighten leading.")
