"""
Per-trader performance metrics from a wallet's resolved positions.

The central question is not "did this wallet make money" (a whale can be lucky)
but "is this wallet *more accurate than the market priced*, by an amount that is
hard to explain by chance." That is what separates skill/information from noise.

Core statistic — the calibration test
--------------------------------------
Each bet is entered at price p_i, which on Polymarket IS the market-implied
probability of that outcome. If a trader has no edge, the expected number of
winning bets across N resolved positions is simply  E[W] = sum(p_i), and the
count of wins W is the sum of independent Bernoulli(p_i) draws — a
Poisson-binomial distribution.

We compute the one-sided p-value  P(W >= w_observed)  under that null. A tiny
p-value means the trader won far more low-probability bets than the market's own
prices implied was possible — the signature of edge or non-public information.

We report:
  - n_resolved, wins, expected_wins, edge (= wins - expected_wins)
  - p_value (Poisson-binomial, exact DP)
  - realized PnL, capital deployed, ROI
  - avg entry price on winners (cheap winners are the strongest tell)
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

# A position is "resolved" when its market has settled to ~0 or ~1.
_RESOLVED_HI = 0.97
_RESOLVED_LO = 0.03


@dataclass
class TraderStats:
    wallet: str
    name: str = ""
    n_positions: int = 0
    n_resolved: int = 0
    wins: int = 0
    expected_wins: float = 0.0
    edge: float = 0.0
    p_value: float = 1.0
    win_rate: float = 0.0
    realized_pnl: float = 0.0
    capital_deployed: float = 0.0
    roi: float = 0.0
    avg_winner_entry: float = 0.0       # mean entry price on winning bets
    longshot_wins: int = 0              # wins entered under 20c
    first_ts: int = 0                   # earliest position timestamp seen
    categories: dict = field(default_factory=dict)
    resolved_bets: list = field(default_factory=list)  # raw rows for signals


def _poisson_binomial_sf(probs, k):
    """P(W >= k) for W = sum of independent Bernoulli(probs), exact via DP.

    dp[j] = probability of exactly j successes. O(N^2) — fine for N up to a
    few thousand resolved bets per wallet.
    """
    n = len(probs)
    if k <= 0:
        return 1.0
    if k > n:
        return 0.0
    dp = [1.0] + [0.0] * n
    for p in probs:
        p = min(max(p, 0.0), 1.0)
        for j in range(n, 0, -1):
            dp[j] = dp[j] * (1 - p) + dp[j - 1] * p
        dp[0] *= (1 - p)
    return sum(dp[k:])


def compute_trader_stats(wallet: str, positions: list, name: str = "") -> TraderStats:
    """Reduce a wallet's raw positions into a TraderStats record."""
    s = TraderStats(wallet=wallet, name=name)
    s.n_positions = len(positions)

    entry_probs = []          # implied prob (entry price) of the bet they took
    won_flags = []
    winner_entries = []
    now = time.time()

    for pos in positions:
        cur = _as_float(pos.get("curPrice"))
        avg = _as_float(pos.get("avgPrice"))
        size = _as_float(pos.get("size"))
        if cur is None or avg is None:
            continue

        end = _parse_end(pos.get("endDate"))
        is_resolved = (cur >= _RESOLVED_HI or cur <= _RESOLVED_LO) or (end and end < now)
        s.realized_pnl += _as_float(pos.get("cashPnl"), 0.0)
        s.capital_deployed += _as_float(pos.get("initialValue"), 0.0)

        ts = _parse_end(pos.get("endDate")) or 0
        if ts and (s.first_ts == 0 or ts < s.first_ts):
            s.first_ts = int(ts)

        if not is_resolved or size <= 0:
            continue

        # The trader holds this outcome at avg cost `avg`. It won if it settled high.
        won = cur >= 0.5
        entry_probs.append(min(max(avg, 0.0001), 0.9999))
        won_flags.append(won)

        cat = _category(pos)
        s.categories[cat] = s.categories.get(cat, 0) + 1

        if won:
            winner_entries.append(avg)
            if avg < 0.20:
                s.longshot_wins += 1

        s.resolved_bets.append({
            "title": pos.get("title", ""),
            "outcome": pos.get("outcome", ""),
            "entry": avg,
            "final": cur,
            "won": won,
            "pnl": _as_float(pos.get("cashPnl"), 0.0),
            "size_usd": _as_float(pos.get("initialValue"), 0.0),
            "category": cat,
            "endDate": pos.get("endDate", ""),
            "slug": pos.get("slug", ""),
        })

    s.n_resolved = len(entry_probs)
    s.wins = sum(won_flags)
    s.expected_wins = sum(entry_probs)
    s.edge = s.wins - s.expected_wins
    s.win_rate = (s.wins / s.n_resolved) if s.n_resolved else 0.0
    s.avg_winner_entry = (sum(winner_entries) / len(winner_entries)) if winner_entries else 0.0
    s.roi = (s.realized_pnl / s.capital_deployed) if s.capital_deployed > 0 else 0.0

    if s.n_resolved >= 1:
        s.p_value = _poisson_binomial_sf(entry_probs, s.wins)
    return s


# ---- small helpers -----------------------------------------------------
def _as_float(v, default=None):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _parse_end(v):
    if not v:
        return None
    try:
        # endDate like "2026-07-20" or ISO datetime
        from datetime import datetime, timezone
        s = str(v).replace("Z", "+00:00")
        if len(s) == 10:
            dt = datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
        else:
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except Exception:
        return None


def _category(pos) -> str:
    """Coarse category from the event slug — used to flag info-prone markets."""
    slug = (pos.get("eventSlug") or pos.get("slug") or "").lower()
    title = (pos.get("title") or "").lower()
    text = slug + " " + title
    buckets = {
        "Politics/Govt": ["election", "president", "senate", "congress", "nominee",
                          "appoint", "cabinet", "fed-", "rate-", "government", "vote"],
        "Sports": ["nba", "nfl", "mlb", "nhl", "fifa", "soccer", "ufc", "tennis",
                   "vs-", "-vs", "match", "game", "world-cup", "premier"],
        "Crypto": ["bitcoin", "btc", "ethereum", "eth", "solana", "crypto", "price-of"],
        "Corporate/M&A": ["acqui", "merger", "ipo", "earnings", "ceo", "stock", "buyout"],
        "Geopolitics": ["war", "ceasefire", "invade", "nuclear", "sanction", "treaty"],
    }
    for name, keys in buckets.items():
        if any(k in text for k in keys):
            return name
    return "Other"
