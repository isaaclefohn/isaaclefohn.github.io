// ==========================================================================
// Projects data — single source of truth for the /projects.html page.
//
// To add/edit a project:
//   1. Edit this file only (no HTML changes needed).
//   2. Set status: 'draft' to show an "In Progress" ribbon, 'published' to hide it.
//   3. `details` accepts HTML — use it for the expandable "View details" section.
// ==========================================================================

const PROJECTS = [
    {
        id: 'dcf-valuation',
        type: 'Valuation',
        title: 'DCF Valuation — Waste Management (NYSE: WM)',
        hook: 'Five-year DCF on WM: WACC build, FCFF projection, terminal value, and sensitivity grid. Model is parameterized in Python and outputs a formatted Excel workbook.',
        tools: ['Python', 'Excel', 'Financial Modeling', 'WACC / CAPM', 'Sensitivity Analysis'],
        status: 'published',
        details: `
            <p><strong>Why WM:</strong> Waste Management is a textbook DCF target — defensive (beta 0.55), capital-intensive, pricing power via CPI-linked contract escalators, and stable FCF conversion. Lets the model focus on valuation mechanics instead of wrestling with volatile revenue.</p>
            <img src="projects/dcf-wm/wm_dcf_summary.png" alt="WM DCF summary chart showing FCFF projection and sensitivity grid" loading="lazy">
            <div class="project-kpis">
                <div class="project-kpi"><span class="project-kpi-label">WACC</span><span class="project-kpi-value">6.58%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Terminal g</span><span class="project-kpi-value">2.50%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Implied Price</span><span class="project-kpi-value">$122.72</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Market Price</span><span class="project-kpi-value">$232.80</span></div>
            </div>
            <p><strong>Finding:</strong> Base-case intrinsic value sits ~47% below the current market price. The gap isn't a &ldquo;sell&rdquo; call — it's the market paying a premium for defensive qualities (low beta, recession-resistant demand) and regulatory moats that a mechanical DCF doesn't capture. A buy case requires believing terminal growth exceeds 3.3% or EBIT margins expand toward 20%+, both of which the sensitivity grid makes visible.</p>
            <p><strong>Approach:</strong> Pulled four years of real financials (10-K data via yfinance), projected revenue forward with a Stericycle-synergy fade (8% → 5%), expanded EBIT margin 130 bps on operating leverage, built WACC from CAPM (risk-free 4.25%, ERP 5.5%, beta 0.55) plus after-tax cost of debt, and applied Gordon-growth terminal value. All assumptions sit in a single Assumptions tab — flex any input to re-run the model.</p>
            <div class="project-links">
                <a href="projects/dcf-wm/wm_dcf_model.xlsx" download>Download Excel model (.xlsx)</a>
                <a href="https://github.com/isaaclefohn/isaaclefohn.github.io/blob/main/projects/dcf-wm/build_model.py" target="_blank" rel="noopener">View Python source</a>
            </div>
        `
    },
    {
        id: 'python-portfolio',
        type: 'Python Analysis',
        title: 'Defensive Compounders vs SPY — 5-Year Risk-Adjusted Performance',
        hook: 'Equal-weighted 5-stock quality portfolio (WM, BRK.B, KO, JNJ, PG) analyzed against SPY. Full pipeline in Python: yfinance pull, CAGR / volatility / Sharpe / max drawdown / beta, formatted Excel output.',
        tools: ['Python', 'pandas', 'NumPy', 'yfinance', 'matplotlib', 'Sharpe Ratio', 'Beta'],
        status: 'published',
        details: `
            <p><strong>Thesis:</strong> The same fundamental traits that make Waste Management a good DCF target — low beta, wide moat, stable FCF conversion, dividend-paying — should, concentrated across five names, deliver a better <em>risk-adjusted</em> return than the S&amp;P 500. Not better absolute return in a bull market; better Sharpe.</p>
            <img src="projects/portfolio-analysis/portfolio_summary.png" alt="Cumulative return and drawdown comparison: defensive compounder portfolio vs SPY over five years" loading="lazy">
            <div class="project-kpis">
                <div class="project-kpi"><span class="project-kpi-label">Portfolio CAGR</span><span class="project-kpi-value">11.49%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">SPY CAGR</span><span class="project-kpi-value">11.75%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Portfolio Sharpe</span><span class="project-kpi-value">0.58</span></div>
                <div class="project-kpi"><span class="project-kpi-label">SPY Sharpe</span><span class="project-kpi-value">0.44</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Portfolio Max DD</span><span class="project-kpi-value">&minus;15.7%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">SPY Max DD</span><span class="project-kpi-value">&minus;24.5%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Portfolio Beta</span><span class="project-kpi-value">0.36</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Volatility Δ</span><span class="project-kpi-value">&minus;4.5 pp</span></div>
            </div>
            <p><strong>Finding:</strong> The defensive book delivered essentially the same CAGR as SPY (11.49% vs 11.75%) with 27% less annualized volatility, a 36% smaller peak drawdown, and a beta of 0.36. Result: a Sharpe of 0.58 vs SPY's 0.44 — a third more return per unit of risk. The 2022 bear market is where the spread opens: SPY troughed at &minus;24.5%, the portfolio at &minus;15.7%.</p>
            <p><strong>Approach:</strong> Five years of daily adjusted closes via yfinance (Apr 2021 – Apr 2026), simple returns, equal-weighted portfolio construction (deliberate — no optimization look-ahead). Annualized on the standard 252-trading-day convention. Sharpe uses a 4.25% risk-free rate (10Y Treasury, matches the WM DCF). Beta computed as cov(stock, SPY) / var(SPY). Tickers and weights are parameters at the top of <code>analyze_portfolio.py</code> — swap the book, rerun, get a new workbook and chart.</p>
            <div class="project-links">
                <a href="projects/portfolio-analysis/portfolio_metrics.xlsx" download>Download Excel output (.xlsx)</a>
                <a href="https://github.com/isaaclefohn/isaaclefohn.github.io/blob/main/projects/portfolio-analysis/analyze_portfolio.py" target="_blank" rel="noopener">View Python source</a>
            </div>
        `
    },
    {
        id: 'pnw-banks',
        type: 'Sector Research',
        title: 'Pacific NW Regional Banks — Comparative Writeup (COLB, BANR, HFWA)',
        hook: 'Trading-multiples and balance-sheet comp of three PNW regional banks. Fundamentals pulled live from SEC EDGAR XBRL, market data from yfinance — no hand-keying. Focus: which balance sheet would I rather own in 2026?',
        tools: ['Python', 'SEC EDGAR API', 'yfinance', 'Bank Analysis', 'Trading Comps', 'XBRL'],
        status: 'published',
        details: `
            <p><strong>Setup:</strong> Three publicly-traded banks with heavy Oregon/Washington exposure: Columbia Banking (COLB, $66.8B assets, post-Umpqua merger), Banner Corp (BANR, $16.4B, organic-growth community bank), and Heritage Financial (HFWA, $7.0B, smallest/most conservatively capitalized). Different strategies, same geography.</p>
            <img src="projects/pnw-banks/pnw_banks_summary.png" alt="Profitability ratios and five-year total return comparison for COLB, BANR, HFWA vs the KRE regional bank ETF" loading="lazy">
            <div class="project-kpis">
                <div class="project-kpi"><span class="project-kpi-label">BANR ROE</span><span class="project-kpi-value">10.04%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">BANR 5Y Return</span><span class="project-kpi-value">+32.8%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">BANR P/E</span><span class="project-kpi-value">11.4×</span></div>
                <div class="project-kpi"><span class="project-kpi-label">COLB ROE</span><span class="project-kpi-value">7.02%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">COLB 5Y Return</span><span class="project-kpi-value">&minus;18.0%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">HFWA Equity / Assets</span><span class="project-kpi-value">13.23%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">HFWA Beta</span><span class="project-kpi-value">0.48</span></div>
                <div class="project-kpi"><span class="project-kpi-label">KRE 5Y Return</span><span class="project-kpi-value">+11.7%</span></div>
            </div>
            <p><strong>View:</strong> BANR is the standout. It leads on every profitability measure (ROA 1.19%, ROE 10.04%, Est. NIM 3.59%), trades at the lowest P/E of the three (11.4×), and delivered +32.8% five-year total return vs the KRE regional-bank ETF at +11.7%. That's compounding shareholder value without needing scale or M&amp;A — exactly what you want from a community-bank management team.</p>
            <p><strong>COLB</strong> is the scale leader but the Umpqua integration shows up in the numbers: the lowest ROE in the set (7.02%) and a &minus;18.0% five-year total return. The cost-synergy thesis is still in front of it — and if NIM keeps compressing, the patience required to reach the run-rate earnings story gets harder to underwrite.</p>
            <p><strong>HFWA</strong> is the defensive option: smallest by assets but highest equity/assets (13.23%) and lowest beta (0.48). Return tracked the benchmark (+10.6% vs +11.7%). Not a growth story — a "preserve capital through credit stress" story. Relevant if you're worried about CRE rolling over in 2026.</p>
            <p><strong>Approach:</strong> All fundamentals pulled live from SEC EDGAR's XBRL companyfacts API (<code>data.sec.gov</code>) — the same structured 10-K data that Bloomberg and FactSet license. Handles multiple XBRL tag names per concept (banks file loans under 3–4 different tags) with fallback logic in <code>first_available()</code>. Market multiples via yfinance. Swap the tickers at the top of <code>build_comp_table.py</code> and rerun — the workbook and chart regenerate end-to-end.</p>
            <div class="project-links">
                <a href="projects/pnw-banks/pnw_banks_comp.xlsx" download>Download comp table (.xlsx)</a>
                <a href="https://github.com/isaaclefohn/isaaclefohn.github.io/blob/main/projects/pnw-banks/build_comp_table.py" target="_blank" rel="noopener">View Python source</a>
            </div>
        `
    },
    {
        id: 'stock-pitch-banr',
        type: 'Stock Pitch',
        title: 'Long BANR — Buy-Side Pitch Memo (Banner Corporation)',
        hook: 'Formal 2-page buy-side pitch with triangulated price target. Extends the PNW regional-bank screen into an actionable long recommendation — best-in-class ROE, discount to peers, capital strength, and M&A optionality.',
        tools: ['Python', 'ReportLab', 'SEC EDGAR API', 'Valuation', 'Comparable Analysis', 'Pitch Memo'],
        status: 'published',
        details: `
            <p><strong>Thesis in one line:</strong> The market is applying a blanket regional-bank discount to a structurally superior franchise — BANR's ROE is 43% higher than COLB's yet it trades at a 12% discount on P/E.</p>
            <img src="projects/stock-pitch-banr/banr_pitch_chart.png" alt="BANR 5-year price rebased to 100 vs KRE regional-bank ETF, and peer P/E comparison showing BANR trades at discount" loading="lazy">
            <div class="project-kpis">
                <div class="project-kpi"><span class="project-kpi-label">Rating</span><span class="project-kpi-value">BUY</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Current Price</span><span class="project-kpi-value">$67.76</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Price Target</span><span class="project-kpi-value">$82.02</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Upside</span><span class="project-kpi-value">+21.1%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">P/E (trailing)</span><span class="project-kpi-value">11.4×</span></div>
                <div class="project-kpi"><span class="project-kpi-label">ROE</span><span class="project-kpi-value">10.04%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">5Y Return vs KRE</span><span class="project-kpi-value">+32.8% vs +11.7%</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Div Yield</span><span class="project-kpi-value">3.09%</span></div>
            </div>
            <p><strong>Valuation — triangulated to $82.02:</strong> Three independent methods converge on a similar range, reinforcing conviction. (1) Peer P/E re-rate to 13.5× average → $80.22. (2) Historical BANR P/E mean ~13.5× → $80.22. (3) P/B re-rate to 1.5× for a 10%-ROE bank → $85.42. Blended target = $82.02 (+21.1% upside).</p>
            <p><strong>Four-part thesis:</strong> (1) Best-in-class ROE trading at a discount — quality should trade at or above peers, not below. (2) Organic-growth franchise with no integration drag — structurally lower-risk than COLB's post-merger synergy execution. (3) Equity/assets of 11.9% provides capital buffer for dividends, buybacks, and M&A optionality. (4) 3.09% dividend yield is well-covered and provides real income while waiting for multiple re-rating.</p>
            <p><strong>Risks &amp; mitigants:</strong> CRE stress (community-bank CRE is a different risk profile than money-center exposure), deposit outflow (LDR of 78% leaves funding room), regional-bank contagion (capital ratios materially above SVB-type failures), NIM compression (affects peers equally — relative position preserved).</p>
            <p><strong>Approach:</strong> Pitch-memo format follows sell-side convention: recommendation header box (rating/target/upside), situation paragraph, numbered thesis, catalysts (6–12 month), triangulated valuation table, risks &amp; mitigants table, peer metrics snapshot, bottom line, disclosures. All financial inputs flow live from SEC EDGAR XBRL + yfinance via the reused PNW-banks pipeline — rerun <code>build_pitch.py</code> and the whole memo regenerates end-to-end with current data.</p>
            <div class="project-links">
                <a href="projects/stock-pitch-banr/banr_pitch.pdf" target="_blank" rel="noopener">Read pitch memo (PDF)</a>
                <a href="https://github.com/isaaclefohn/isaaclefohn.github.io/blob/main/projects/stock-pitch-banr/build_pitch.py" target="_blank" rel="noopener">View Python source</a>
            </div>
        `
    },
    {
        id: 'banr-takeout',
        type: 'M&A Analysis',
        title: 'BANR Strategic Takeout — Precedent-Multiples Cross-Check on the Long Thesis',
        hook: 'Applies community-bank M&A multiples to BANR\u2019s tangible book to see where a strategic acquirer would price the franchise. Football-field across four P/TBV scenarios, plus a plausible-acquirer shortlist.',
        tools: ['Python', 'SEC EDGAR API', 'ReportLab', 'M&A Analysis', 'Precedent Transactions', 'P/TBV'],
        status: 'published',
        details: `
            <p><strong>Why this exists:</strong> The BANR long pitch targets $82 via peer re-rate and historical P/E. This memo asks a different question: would an acquirer rationally pay there? Precedent multiples on tangible book are the standard bank-M&amp;A metric \u2014 they reveal whether the standalone thesis stacks <em>additional</em> upside or whether two unrelated methods just triangulate to the same answer.</p>
            <img src="projects/banr-takeout/banr_takeout_chart.png" alt="Football-field chart showing BANR implied takeout prices across four P/TBV scenarios from 1.20x to 1.80x, with the current $67.76 price reference line" loading="lazy">
            <div class="project-kpis">
                <div class="project-kpi"><span class="project-kpi-label">Current Price</span><span class="project-kpi-value">$67.76</span></div>
                <div class="project-kpi"><span class="project-kpi-label">TBV / Share</span><span class="project-kpi-value">$46.44</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Current P/TBV</span><span class="project-kpi-value">1.46\u00d7</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Low (1.20\u00d7)</span><span class="project-kpi-value">$55.73</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Conservative (1.35\u00d7)</span><span class="project-kpi-value">$62.69</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Base (1.55\u00d7)</span><span class="project-kpi-value">$71.98</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Strategic (1.80\u00d7)</span><span class="project-kpi-value">$83.59</span></div>
                <div class="project-kpi"><span class="project-kpi-label">Standalone Target</span><span class="project-kpi-value">$82.02</span></div>
            </div>
            <p><strong>Finding \u2014 convergence, not incremental upside:</strong> BANR already trades at 1.46\u00d7 P/TBV, <em>above</em> routine deal multiples (~1.35\u00d7), meaning the market already embeds some M&amp;A premium. The base-case takeout of $71.98 is actually <em>below</em> the standalone $82 target. Only the <strong>strategic-premium scenario ($83.59)</strong> converges with the long thesis. The useful takeaway: two unrelated valuation methods \u2014 earnings-based re-rate and franchise-based M&amp;A multiple \u2014 arrive at ~$82\u2013$84 only under a bidding-war scenario. M&amp;A is optionality, not additional thesis.</p>
            <p><strong>Why BANR is a realistic M&amp;A target:</strong> (1) Attractive size \u2014 $16.4B assets, meaningful but not HSR-encumbered. (2) Scarce franchise \u2014 OR/WA/ID community-banking presence that can\u2019t be built organically. (3) Best-in-class profitability \u2014 10.04% ROE, 1.19% ROA (acquirers pay more for higher-ROE targets because purchase accounting write-ups lever their own earnings). (4) Clean balance sheet \u2014 no regulatory overhangs, CRE within community-bank norms.</p>
            <p><strong>Plausible acquirer shortlist:</strong> GBCI (PNW/Mountain West culture match), ZION (western regional with strategic gap in OR/WA), FIBK (recent Great Western acquisition shows appetite), WAFD (Seattle-based, recent Luther Burbank deal), USB (long-shot superregional, MUFG-Union precedent).</p>
            <p><strong>Approach:</strong> Pulled BANR fundamentals from SEC EDGAR XBRL (same pipeline as the PNW-banks project \u2014 imports <code>extract_fundamentals</code> directly rather than duplicating the EDGAR fetcher). Stripped goodwill and intangibles from equity to get tangible equity, divided by shares outstanding for TBV/share. Applied four P/TBV scenarios reflecting published reporting on recent community-bank M&amp;A (S&amp;P Global Market Intelligence, Bank Director). Generated a football-field chart with matplotlib, a three-sheet workbook (Summary / Acquirers / Methodology), and a one-page deal memo PDF with ReportLab.</p>
            <p><strong>Caveats:</strong> Framework analysis, not an M&amp;A pitch \u2014 no real deal is announced or rumored. Bank Holding Company Act prevents PE from owning &gt;24.99% of a commercial bank, which is why this is a <em>strategic</em>-acquirer analysis rather than an LBO model. Acquirer-specific accretion/dilution not modeled \u2014 a full deal analysis would require pulling the acquirer\u2019s financials, modeling purchase accounting, and layering synergies and financing mix.</p>
            <div class="project-links">
                <a href="projects/banr-takeout/banr_takeout_memo.pdf" target="_blank" rel="noopener">Read deal memo (PDF)</a>
                <a href="projects/banr-takeout/banr_takeout_analysis.xlsx" download>Download Excel workbook (.xlsx)</a>
                <a href="https://github.com/isaaclefohn/isaaclefohn.github.io/blob/main/projects/banr-takeout/build_takeout.py" target="_blank" rel="noopener">View Python source</a>
            </div>
        `
    }
];
