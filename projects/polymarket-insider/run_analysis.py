"""
Polymarket insider-detection & smart-money tracking — main pipeline.

Stages
------
  1. DISCOVER   sample the public trade tape; collect the most active wallets,
                weighted toward larger tickets (where information shows up).
  2. SCORE      pull each wallet's positions, compute performance metrics and a
                0-100 suspicion score from the weighted insider signals.
  3. RANK       sort wallets; the top of the board is the "smart money" watchlist.
  4. TRACK      pull recent activity for flagged wallets; read their OPEN
                positions as live conviction.
  5. SUGGEST    build candidate trades (markets smart money is in) and run every
                one through the thorough rule engine before it is recommended.
  6. REPORT     write a formatted Excel workbook + a JSON snapshot.

Usage
-----
  python3 run_analysis.py --live --max-wallets 150   # fetch fresh from API
  python3 run_analysis.py                            # offline, from snapshot

Outputs: polymarket_insider.xlsx, data/snapshot.json
Nothing here is financial advice. "Suspicion" is a statistical flag, not proof
of wrongdoing.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import xlsxwriter

from polymarket_client import PolymarketClient, load_snapshot
from metrics import compute_trader_stats, _category
from insider_signals import score_trader
from rule_engine import evaluate_trade

HERE = Path(__file__).parent
XLSX = HERE / "polymarket_insider.xlsx"
SNAPSHOT = HERE / "data" / "snapshot.json"

SMART_MONEY_MIN_SCORE = 45.0
TOP_WATCHLIST = 25


# ====================================================================== #
#  STAGE 1 — discover wallets                                            #
# ====================================================================== #
def discover_wallets(client: PolymarketClient, target: int) -> list[str]:
    print(f"[1/6] Discovering wallets from the public trade tape (target {target})…")
    seen: dict[str, float] = {}
    offset = 0
    while len(seen) < target and offset < 6000:
        batch = client.recent_trades(limit=500, offset=offset)
        if not batch:
            break
        for t in batch:
            w = t.get("proxyWallet")
            usd = float(t.get("size", 0)) * float(t.get("price", 0))
            if w:
                seen[w] = max(seen.get(w, 0), usd)  # track biggest ticket
        offset += 500
    # prioritise wallets that have shown size
    ordered = sorted(seen, key=lambda w: seen[w], reverse=True)
    print(f"      found {len(ordered)} distinct wallets")
    return ordered[:target]


# ====================================================================== #
#  STAGE 2-3 — score & rank                                             #
# ====================================================================== #
def score_wallets(client: PolymarketClient, wallets: list[str]) -> list[dict]:
    print(f"[2/6] Scoring {len(wallets)} wallets (positions + signals)…")
    rows = []
    for i, w in enumerate(wallets, 1):
        positions = client.positions(w)
        if not positions:
            continue
        name = positions[0].get("name") or positions[0].get("pseudonym") or ""
        stats = compute_trader_stats(w, positions, name)
        if stats.n_resolved < 1:
            continue
        scored = score_trader(stats)
        rows.append({"stats": stats, "score": scored})
        if i % 25 == 0:
            print(f"      …{i}/{len(wallets)}")
    rows.sort(key=lambda r: r["score"]["score"], reverse=True)
    print(f"[3/6] Ranked {len(rows)} wallets with a resolved track record.")
    return rows


# ====================================================================== #
#  STAGE 4-5 — track smart money & build/evaluate candidate trades       #
# ====================================================================== #
def build_candidates(client: PolymarketClient, ranked: list[dict]) -> list:
    print("[4/6] Tracking smart money & building candidate trades…")
    smart = [r for r in ranked if r["score"]["score"] >= SMART_MONEY_MIN_SCORE]
    if not smart:
        smart = ranked[:5]  # fall back to the best available
    smart = smart[:TOP_WATCHLIST]

    score_by_wallet = {r["stats"].wallet: r for r in ranked}

    # collect OPEN positions held by smart money, grouped by market+outcome
    groups: dict[tuple, dict] = {}
    now = time.time()
    for r in smart:
        st = r["stats"]
        for pos in client.positions(st.wallet):
            cur = _f(pos.get("curPrice"))
            if cur is None or cur >= 0.97 or cur <= 0.03:
                continue  # resolved / not actionable
            cid = pos.get("conditionId")
            outcome = pos.get("outcome", "")
            key = (cid, outcome)
            g = groups.setdefault(key, {
                "conditionId": cid,
                "title": pos.get("title", ""),
                "slug": pos.get("slug", ""),
                "outcome": outcome,
                "oppositeOutcome": pos.get("oppositeOutcome", ""),
                "current_price": cur,
                "endDate": pos.get("endDate", ""),
                "backers": [],
            })
            cat = _category(pos)
            g["backers"].append({
                "wallet": st.wallet,
                "name": st.name,
                "entry": _f(pos.get("avgPrice"), cur),
                "size_usd": _f(pos.get("currentValue"), 0.0),
                "entry_age_days": _entry_age(client, st.wallet, cid, outcome, now),
                "score": r["score"]["score"],
                "band": r["score"]["band"],
                "cat_competent": _cat_competent(st, cat),
            })

    print("[5/6] Running the rule engine on candidate trades…")
    candidates = []
    for (cid, outcome), g in groups.items():
        market = client.market(cid) or {}
        liq = _f(market.get("liquidity"), 0.0) or _f(market.get("liquidityClob"), 0.0) or 0.0
        days_left = _days_left(g["endDate"], now)

        # opposing smart money: flagged wallets holding the opposite outcome
        opposing = []
        opp_key = (cid, g["oppositeOutcome"])
        for b in groups.get(opp_key, {}).get("backers", []):
            opposing.append({"wallet": b["wallet"], "score": b["score"]})

        cand = {
            "title": g["title"], "outcome": outcome, "slug": g["slug"],
            "current_price": g["current_price"], "liquidity": liq,
            "days_left": days_left, "backers": g["backers"], "opposing": opposing,
        }
        ev = evaluate_trade(cand, score_by_wallet)
        candidates.append(ev)

    # rank suggestions: recommendation tier then score
    tier = {"STRONG": 3, "MODERATE": 2, "WATCH": 1, "AVOID": 0}
    candidates.sort(key=lambda e: (tier[e.recommendation], e.score), reverse=True)
    return candidates


def _entry_age(client, wallet, cid, outcome, now):
    """Days since the wallet's most recent TRADE into this market+outcome."""
    for a in client.activity(wallet):
        if a.get("conditionId") == cid and a.get("type") == "TRADE" \
                and a.get("outcome") == outcome and a.get("side") == "BUY":
            ts = a.get("timestamp", 0)
            return max(0.0, (now - ts) / 86400)
    return 999.0


def _cat_competent(stats, cat) -> bool:
    wins = sum(1 for b in stats.resolved_bets if b["category"] == cat and b["won"])
    return wins >= 2


# ====================================================================== #
#  STAGE 6 — report                                                      #
# ====================================================================== #
def write_excel(ranked, candidates):
    print(f"[6/6] Writing {XLSX.name}…")
    wb = xlsxwriter.Workbook(str(XLSX))
    money = wb.add_format({"num_format": "$#,##0"})
    pct = wb.add_format({"num_format": "0.0%"})
    sci = wb.add_format({"num_format": "0.00E+00"})
    hdr = wb.add_format({"bold": True, "bg_color": "#1a1a1a", "font_color": "#c5a572",
                         "border": 1})
    title = wb.add_format({"bold": True, "font_size": 14})
    wrap = wb.add_format({"text_wrap": True, "valign": "top"})

    # --- Sheet 1: Watchlist / suspicion board ---
    ws = wb.add_worksheet("Suspicion Board")
    ws.set_column(0, 0, 22); ws.set_column(1, 1, 16); ws.set_column(2, 12, 12)
    cols = ["Trader", "Wallet", "Score", "Band", "Resolved", "Wins",
            "Exp. Wins", "Edge", "Win%", "p-value", "Longshot W", "PnL ($)", "ROI"]
    for c, h in enumerate(cols):
        ws.write(0, c, h, hdr)
    for i, r in enumerate(ranked[:60], 1):
        s, sc = r["stats"], r["score"]
        ws.write(i, 0, s.name or "(anon)")
        ws.write(i, 1, s.wallet[:12] + "…")
        ws.write(i, 2, sc["score"])
        ws.write(i, 3, sc["band"])
        ws.write(i, 4, s.n_resolved)
        ws.write(i, 5, s.wins)
        ws.write(i, 6, round(s.expected_wins, 1))
        ws.write(i, 7, round(s.edge, 1))
        ws.write(i, 8, s.win_rate, pct)
        ws.write(i, 9, s.p_value, sci)
        ws.write(i, 10, s.longshot_wins)
        ws.write(i, 11, s.realized_pnl, money)
        ws.write(i, 12, s.roi, pct)

    # --- Sheet 2: Suggested trades + rule rationale ---
    ws2 = wb.add_worksheet("Suggested Trades")
    ws2.set_column(0, 0, 40); ws2.set_column(1, 1, 14); ws2.set_column(2, 5, 12)
    ws2.set_column(6, 6, 60)
    h2 = ["Market / Outcome", "Recommend", "Score", "Price", "Backers",
          "Stake %", "Why (rule support)"]
    for c, h in enumerate(h2):
        ws2.write(0, c, h, hdr)
    row = 1
    for ev in candidates[:40]:
        support = " | ".join(f"{r.code}:{r.verdict}" for r in ev.rules if r.weight > 0)
        ws2.write(row, 0, f"{ev.market_title} → {ev.outcome}")
        ws2.write(row, 1, ev.recommendation)
        ws2.write(row, 2, ev.score)
        ws2.write(row, 3, round(ev.current_price, 3))
        ws2.write(row, 4, ev.n_backers)
        ws2.write(row, 5, ev.suggested_stake_frac, pct)
        ws2.write(row, 6, ev.summary + "  [" + support + "]", wrap)
        row += 1

    # --- Sheet 3: deep-dive rule detail for top suggestions ---
    ws3 = wb.add_worksheet("Rule Detail")
    ws3.set_column(0, 0, 40); ws3.set_column(1, 2, 10); ws3.set_column(3, 3, 90)
    r = 0
    for ev in [e for e in candidates if e.recommendation in ("STRONG", "MODERATE")][:12]:
        ws3.write(r, 0, f"{ev.market_title} → {ev.outcome}", title); r += 1
        ws3.write(r, 0, ev.summary, wrap); r += 1
        for c, h in enumerate(["Rule", "Verdict", "Wt", "Rationale"]):
            ws3.write(r, c, h, hdr)
        r += 1
        for rule in ev.rules:
            ws3.write(r, 0, f"{rule.code} {rule.name}")
            ws3.write(r, 1, rule.verdict)
            ws3.write(r, 2, rule.weight)
            ws3.write(r, 3, rule.detail, wrap)
            r += 1
        r += 1

    # --- Sheet 4: methodology ---
    ws4 = wb.add_worksheet("Methodology")
    ws4.set_column(0, 0, 110)
    for i, line in enumerate(_methodology()):
        ws4.write(i, 0, line, wrap if line.startswith("  ") else None)

    wb.close()


def _methodology():
    return [
        "POLYMARKET INSIDER-DETECTION & SMART-MONEY TRACKER — METHODOLOGY",
        "",
        "DATA: 100% public. On-chain trades settled on Polygon, surfaced via",
        "Polymarket's read-only data + gamma APIs. No auth, no keys, no order placement.",
        "",
        "SUSPICION SCORE (0-100): weighted blend of signals, each auditable —",
        "  S1 Statistical implausibility (34%): one-sided Poisson-binomial p-value.",
        "     On Polymarket the entry price IS the market-implied probability, so an",
        "     uninformed trader's expected wins = sum(entry prices). Winning far more",
        "     than that, across enough bets, is hard to explain by luck.",
        "  S2 Longshot-winner profile (22%): repeatedly winning bets bought under 20c.",
        "  S3 Calibration edge (18%): wins minus market-implied expected wins, per bet.",
        "  S4 Information-prone categories (10%): politics / corporate / geopolitics.",
        "  S5 Conviction sizing (8%): average ticket behind resolved winners.",
        "  S6 Realised ROI (8%): realised PnL over capital deployed.",
        "  Small samples (<8 resolved bets) are down-weighted so flukes can't top the board.",
        "",
        "TRADE RULE ENGINE: a candidate is a market a flagged wallet is currently in.",
        "Before anything is suggested it must survive a 10-rule checklist. Four rules",
        "are GATING — a single FAIL blocks the trade outright:",
        "  R4 Liquidity, R5 Time-to-resolution, R6 Signal recency, R7 No smart contradiction.",
        "Non-gating rules (consensus, lead-trader quality, edge-still-available, capital,",
        "category competence) feed a weighted score. R10 sizes a half-Kelly stake, hard-",
        "capped at 5% of bankroll. Tiers: STRONG >=80, MODERATE >=60, WATCH >=40, else AVOID.",
        "",
        "LIMITATIONS: a high score is a statistical flag, NOT proof of insider trading.",
        "Wallets can be linked/sybil; resolution snapshots are point-in-time; the data",
        "API returns current positions, so fully-redeemed history may be undercounted.",
        "Nothing here is financial advice.",
    ]


# ---- snapshot for offline reproducibility ------------------------------
def save_snapshot(ranked, candidates):
    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
        "traders": [{
            "wallet": r["stats"].wallet, "name": r["stats"].name,
            "score": r["score"]["score"], "band": r["score"]["band"],
            "n_resolved": r["stats"].n_resolved, "wins": r["stats"].wins,
            "expected_wins": round(r["stats"].expected_wins, 2),
            "edge": round(r["stats"].edge, 2), "win_rate": round(r["stats"].win_rate, 4),
            "p_value": r["stats"].p_value, "longshot_wins": r["stats"].longshot_wins,
            "realized_pnl": round(r["stats"].realized_pnl, 2),
            "roi": round(r["stats"].roi, 4),
            "fired": [s.code for s in r["score"]["fired"]],
        } for r in ranked[:80]],
        "suggestions": [{
            "title": e.market_title, "outcome": e.outcome, "slug": e.slug,
            "recommendation": e.recommendation, "score": e.score,
            "price": round(e.current_price, 3), "n_backers": e.n_backers,
            "lead_score": e.lead_score,
            "stake_frac": round(e.suggested_stake_frac, 4),
            "summary": e.summary,
            "rules": [{"code": r.code, "name": r.name, "verdict": r.verdict,
                       "gating": r.gating, "detail": r.detail} for r in e.rules],
        } for e in candidates[:40]],
    }
    SNAPSHOT.write_text(json.dumps(payload, indent=2))
    print(f"      snapshot saved → {SNAPSHOT.name}")
    return payload


def _f(v, default=None):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _days_left(end, now):
    from metrics import _parse_end
    ts = _parse_end(end)
    return max(0.0, (ts - now) / 86400) if ts else 999.0


# ====================================================================== #
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true", help="fetch fresh from the API")
    ap.add_argument("--max-wallets", type=int, default=150)
    ap.add_argument("--no-cache", action="store_true")
    args = ap.parse_args()

    if not args.live:
        snap = load_snapshot()
        if snap:
            print("Offline mode — loaded bundled snapshot.")
            print(f"  {len(snap['traders'])} traders, "
                  f"{len(snap['suggestions'])} suggestions "
                  f"(generated {snap.get('generated')}).")
            return snap
        print("No snapshot found; run with --live first.")
        return None

    client = PolymarketClient(use_cache=not args.no_cache)
    wallets = discover_wallets(client, args.max_wallets)
    ranked = score_wallets(client, wallets)
    candidates = build_candidates(client, ranked)
    write_excel(ranked, candidates)
    return save_snapshot(ranked, candidates)


if __name__ == "__main__":
    main()
