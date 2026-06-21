# Polymarket Insider-Detection & Smart-Money Tracker

Runs through **public** Polymarket trade records, scores every wallet on how hard
its track record is to explain by luck, surfaces the wallets that look like
informed/insider flow, and runs every candidate trade those wallets are in
through a thorough, transparent rule checklist before suggesting it — always with
the reasons attached.

> **This is a research/analytics tool, not financial advice, and not an
> accusation.** A high "suspicion score" is a *statistical flag* — it measures
> how improbable a wallet's accuracy is given the market's own prices. It is not
> proof of wrongdoing. All data is public on-chain activity surfaced through
> Polymarket's read-only APIs; no authentication, no private keys, no order
> placement.

## How it works

```
recent trades ──► discover active wallets
                     │
                     ▼
            pull each wallet's positions  ──►  per-trader metrics + suspicion score
                     │                              (statistical core below)
                     ▼
            rank → "smart money" watchlist
                     │
                     ▼
            their OPEN positions = candidate trades
                     │
                     ▼
            10-rule engine  ──►  STRONG / MODERATE / WATCH / AVOID  (+ full rationale)
                     │
                     ▼
            polymarket_insider.xlsx  +  data/snapshot.json
```

## The statistical core (why a score means something)

On Polymarket the **price of an outcome *is* the market-implied probability**.
So for an uninformed trader the expected number of winning bets across *N*
resolved positions is just the sum of the entry prices, and the win count is a
sum of independent Bernoulli draws — a **Poisson-binomial** distribution. The
detector computes the exact one-sided p-value `P(W ≥ observed)`. A tiny p-value
means the wallet won far more low-probability bets than the market thought
possible — the fingerprint of edge or non-public information.

The 0–100 suspicion score blends that with five corroborating signals
(longshot-winner profile, calibration edge, information-prone categories,
conviction sizing, realised ROI), each individually explained. Small samples are
down-weighted so a 3-for-3 fluke can't top the board.

## The trade rule engine (the "thorough check")

A candidate is a market a flagged wallet is currently holding. Before it is ever
suggested it must survive **ten rules**; four are **gating** — a single FAIL
blocks the trade outright:

| Rule | Gating | Checks |
|------|:------:|--------|
| R1 Smart-money consensus | | ≥2 independent flagged wallets agree |
| R2 Lead-trader quality | | best backer clears the suspicion threshold |
| R3 Edge still available | | price hasn't blown past smart-money entry |
| **R4 Liquidity** | ✓ | deep enough to enter and exit |
| **R5 Time-to-resolution** | ✓ | resolves inside an actionable window |
| **R6 Signal recency** | ✓ | smart money entered recently, not stale |
| **R7 No smart contradiction** | ✓ | no comparably-skilled wallet on the other side |
| R8 Capital commitment | | backers put real size behind it |
| R9 Category competence | | backers have a win record in this category |
| R10 Position sizing | | half-Kelly stake, hard-capped at 5% of bankroll |

`STRONG` additionally requires a quality, corroborated lead. Every rule returns
PASS / WARN / FAIL with a written rationale, so each recommendation ships with
its support.

## Running it

```bash
pip install pandas numpy requests xlsxwriter matplotlib

python3 run_analysis.py --live --max-wallets 220   # fetch fresh from the public API
python3 run_analysis.py                            # offline, from bundled snapshot
python3 build_summary_chart.py                     # regenerate the summary PNG
```

Outputs `polymarket_insider.xlsx` (Suspicion Board · Suggested Trades · Rule
Detail · Methodology) and `data/snapshot.json`. Every threshold the system uses
is a named constant at the top of `insider_signals.py` and `rule_engine.py`.

## Files

| File | Role |
|------|------|
| `polymarket_client.py` | read-only client for Polymarket's data + gamma APIs (cache + retry) |
| `metrics.py` | per-trader performance + exact Poisson-binomial calibration test |
| `insider_signals.py` | the weighted, explainable 0–100 suspicion score |
| `rule_engine.py` | the 10-rule trade-evaluation checklist |
| `run_analysis.py` | end-to-end pipeline + Excel/JSON reporting |
| `build_summary_chart.py` | headline visualization |

## Limitations

Wallets can be linked or sybil; the positions API reports current holdings, so
fully-redeemed history may be undercounted; resolution snapshots are
point-in-time. Treat outputs as leads for investigation, not conclusions.
