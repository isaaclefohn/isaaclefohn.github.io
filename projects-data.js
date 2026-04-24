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
        title: 'DCF Valuation — [Sample Public Company]',
        hook: 'Full discounted-cash-flow model with five-year projection, WACC build-up, and terminal-value sensitivity.',
        tools: ['Excel', 'Financial Modeling', 'WACC', 'Sensitivity Analysis'],
        status: 'draft',
        details: `
            <p><strong>Scope:</strong> Revenue drivers, operating-margin assumptions, capex and working-capital schedules, and a WACC build using current risk-free rate and industry beta.</p>
            <p><strong>Output:</strong> Implied share price vs. current market price, with a sensitivity table on terminal growth rate and discount rate.</p>
            <p><em>Writeup and spreadsheet link coming soon.</em></p>
        `
    },
    {
        id: 'python-portfolio',
        type: 'Python Analysis',
        title: 'Python Portfolio Analysis Tool',
        hook: 'Pulls historical price data via yfinance, computes rolling returns, volatility, and Sharpe ratio across a sample portfolio.',
        tools: ['Python', 'pandas', 'yfinance', 'matplotlib'],
        status: 'draft',
        details: `
            <p><strong>Scope:</strong> Script ingests a user-defined ticker list, downloads five years of daily closes, and computes rolling 30-day return, annualized volatility, and Sharpe ratio.</p>
            <p><strong>Output:</strong> Summary table plus matplotlib visualization comparing portfolio vs. SPY benchmark.</p>
            <p><em>Repo and notebook link coming soon.</em></p>
        `
    },
    {
        id: 'pnw-banks',
        type: 'Sector Research',
        title: 'Pacific NW Regional Banks — Comparative Writeup',
        hook: 'Comparative analysis of regional banks with Oregon exposure: loan-book composition, NIM trends, and deposit beta.',
        tools: ['Fundamental Analysis', '10-K Reading', 'Excel', 'Sector Comparables'],
        status: 'draft',
        details: `
            <p><strong>Scope:</strong> Read most recent 10-Ks and investor presentations for three regional banks. Pull key metrics: net interest margin, efficiency ratio, loan-to-deposit, and uninsured-deposit exposure.</p>
            <p><strong>Output:</strong> Side-by-side comp table plus a short memo on which balance sheet I'd rather own in a rising-rate environment.</p>
            <p><em>Memo coming soon.</em></p>
        `
    }
];
