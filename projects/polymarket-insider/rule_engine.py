"""
Trade-suggestion rule engine.

Given a candidate trade — a (market, outcome) that one or more flagged "smart
money" wallets have recently entered — this runs a thorough, transparent
checklist before the trade is ever suggested. Every rule returns a verdict
(PASS / WARN / FAIL), a weight, and a written rationale, so the final
recommendation always ships with the *reasons*.

Design principle: a recommendation is only as good as the rule it survived.
Nothing is suggested on a single signal. The engine is deliberately
conservative — a FAIL on a gating rule (liquidity, time, stale-edge,
contradiction) blocks the trade outright regardless of how strong the smart
money looks.

Rules
-----
  R1  Smart-money consensus    >= MIN_BACKERS independent flagged wallets agree
  R2  Lead-trader quality      best backer's suspicion score clears threshold
  R3  Edge still available     current price hasn't blown past smart-money entry
  R4  Liquidity (gating)       market deep enough to enter and exit
  R5  Time-to-resolution (gate) resolves inside the actionable window
  R6  Recency (gating)         smart money entered recently, not stale
  R7  No smart contradiction   no comparably-skilled wallet on the other side
  R8  Capital commitment       backers put meaningful size behind the call
  R9  Category competence      backers have demonstrated edge in this category
  R10 Position sizing          Kelly-based suggested stake (always informational)
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

PASS, WARN, FAIL = "PASS", "WARN", "FAIL"

# Tunables — every threshold the engine uses, in one place.
MIN_BACKERS = 2
MIN_LEAD_SCORE = 45.0
MAX_PRICE_DRIFT = 0.12          # current price may be at most +12c above entry
MIN_LIQUIDITY_USD = 5000.0
MIN_DAYS_LEFT = 0.25
MAX_DAYS_LEFT = 120.0
MAX_ENTRY_AGE_DAYS = 14.0
MIN_BACKER_CAPITAL = 500.0


@dataclass
class RuleResult:
    code: str
    name: str
    verdict: str
    weight: float
    gating: bool
    detail: str


@dataclass
class TradeEvaluation:
    market_title: str
    outcome: str
    current_price: float
    slug: str = ""
    n_backers: int = 0
    lead_score: float = 0.0
    rules: list = field(default_factory=list)
    recommendation: str = ""
    score: float = 0.0
    suggested_stake_frac: float = 0.0
    summary: str = ""


def evaluate_trade(candidate: dict, trader_scores: dict) -> TradeEvaluation:
    """Run the full checklist on one candidate trade.

    candidate keys: title, outcome, slug, current_price, liquidity, days_left,
        backers [{wallet, name, entry, size_usd, entry_age_days, score, band,
                  cat_competent}], opposing [{wallet, score}]
    trader_scores: wallet -> suspicion-score dict (unused directly; kept for ext).
    """
    ev = TradeEvaluation(
        market_title=candidate.get("title", ""),
        outcome=candidate.get("outcome", ""),
        current_price=candidate.get("current_price", 0.0),
        slug=candidate.get("slug", ""),
    )
    backers = candidate.get("backers", [])
    opposing = candidate.get("opposing", [])
    rules = ev.rules

    # R1 — consensus
    n = len(backers)
    ev.n_backers = n
    rules.append(RuleResult(
        "R1", "Smart-money consensus",
        PASS if n >= MIN_BACKERS else (WARN if n == 1 else FAIL),
        0.18, gating=False,
        detail=(f"{n} flagged wallet(s) hold {ev.outcome!r}. "
                f"Need >= {MIN_BACKERS} independent backers for consensus."),
    ))

    # R2 — lead-trader quality
    lead = max(backers, key=lambda b: b["score"]) if backers else None
    lead_score = lead["score"] if lead else 0.0
    ev.lead_score = lead_score
    rules.append(RuleResult(
        "R2", "Lead-trader quality",
        PASS if lead_score >= MIN_LEAD_SCORE else WARN,
        0.20, gating=False,
        detail=(f"Top backer {(_who(lead))} scores {lead_score:.0f}/100 "
                f"({lead['band'] if lead else 'n/a'}). Threshold {MIN_LEAD_SCORE:.0f}."),
    ))

    # R3 — edge still available
    best_entry = min((b["entry"] for b in backers), default=ev.current_price)
    drift = ev.current_price - best_entry
    rules.append(RuleResult(
        "R3", "Edge still available",
        PASS if drift <= MAX_PRICE_DRIFT else FAIL,
        0.16, gating=False,
        detail=(f"Smart money entered as low as {best_entry:.2f}; price now "
                f"{ev.current_price:.2f} (drift {drift:+.2f}). "
                f"Above +{MAX_PRICE_DRIFT:.2f} means the move is likely already gone."),
    ))

    # R4 — liquidity (GATING)
    liq = candidate.get("liquidity", 0.0) or 0.0
    rules.append(RuleResult(
        "R4", "Liquidity", PASS if liq >= MIN_LIQUIDITY_USD else FAIL,
        0.10, gating=True,
        detail=(f"Market liquidity ${liq:,.0f}; need >= ${MIN_LIQUIDITY_USD:,.0f} "
                f"to enter and exit without excessive slippage."),
    ))

    # R5 — time-to-resolution (GATING)
    days = candidate.get("days_left", 0.0)
    if days < MIN_DAYS_LEFT:
        v5 = FAIL
    elif days > MAX_DAYS_LEFT:
        v5 = WARN
    else:
        v5 = PASS
    rules.append(RuleResult(
        "R5", "Time-to-resolution", v5, 0.08, gating=True,
        detail=(f"~{days:.1f} days to resolution. Window is "
                f"[{MIN_DAYS_LEFT}, {MAX_DAYS_LEFT}] days; too soon risks no fill, "
                f"too far ties up capital."),
    ))

    # R6 — recency (GATING)
    age = min((b.get("entry_age_days", 999) for b in backers), default=999)
    rules.append(RuleResult(
        "R6", "Signal recency", PASS if age <= MAX_ENTRY_AGE_DAYS else FAIL,
        0.08, gating=True,
        detail=(f"Most recent smart-money entry was {age:.1f} days ago "
                f"(max {MAX_ENTRY_AGE_DAYS:.0f}). Stale edges are usually priced in."),
    ))

    # R7 — no smart contradiction (GATING)
    strong_opp = [o for o in opposing if o.get("score", 0) >= MIN_LEAD_SCORE]
    rules.append(RuleResult(
        "R7", "No smart contradiction",
        PASS if not strong_opp else FAIL,
        0.10, gating=True,
        detail=(f"{len(strong_opp)} comparably-skilled wallet(s) hold the OPPOSITE "
                f"side. Informed disagreement is a hard veto." if strong_opp
                else "No comparably-skilled wallet is on the other side."),
    ))

    # R8 — capital commitment
    backer_cap = sum(b.get("size_usd", 0) for b in backers)
    rules.append(RuleResult(
        "R8", "Capital commitment",
        PASS if backer_cap >= MIN_BACKER_CAPITAL else WARN,
        0.05, gating=False,
        detail=(f"Backers committed ${backer_cap:,.0f} combined "
                f"(min ${MIN_BACKER_CAPITAL:,.0f}). Real size > lottery tickets."),
    ))

    # R9 — category competence
    competent = sum(1 for b in backers if b.get("cat_competent"))
    rules.append(RuleResult(
        "R9", "Category competence",
        PASS if competent >= 1 else WARN,
        0.05, gating=False,
        detail=(f"{competent}/{n} backer(s) have a demonstrated win record in this "
                f"market's category. Edge tends to be domain-specific."),
    ))

    # R10 — position sizing (informational, never blocks)
    stake = _kelly_fraction(ev.current_price, lead_score)
    ev.suggested_stake_frac = stake
    rules.append(RuleResult(
        "R10", "Suggested position size", PASS, 0.0, gating=False,
        detail=(f"Half-Kelly stake ~{stake:.1%} of bankroll, derived from the lead "
                f"backer's edge and the {ev.current_price:.2f} price. Cap per market "
                f"at 5% regardless."),
    ))

    _finalize(ev)
    return ev


def _finalize(ev: TradeEvaluation):
    # Any gating FAIL blocks the trade outright.
    gating_fail = [r for r in ev.rules if r.gating and r.verdict == FAIL]
    weighted = sum(r.weight * _v(r.verdict) for r in ev.rules)
    total_w = sum(r.weight for r in ev.rules) or 1
    ev.score = round(weighted / total_w * 100, 1)

    if gating_fail:
        ev.recommendation = "AVOID"
        ev.suggested_stake_frac = 0.0
        reasons = "; ".join(f"{r.code} {r.name}" for r in gating_fail)
        ev.summary = f"Blocked by gating rule(s): {reasons}."
        return

    n_fail = sum(1 for r in ev.rules if r.verdict == FAIL)
    # STRONG additionally demands a genuinely high-quality, corroborated signal:
    # a lead trader clearing the suspicion threshold AND real consensus.
    quality_lead = ev.lead_score >= MIN_LEAD_SCORE and ev.n_backers >= MIN_BACKERS
    if ev.score >= 80 and n_fail == 0 and quality_lead:
        ev.recommendation = "STRONG"
    elif ev.score >= 60:
        ev.recommendation = "MODERATE"
    elif ev.score >= 40:
        ev.recommendation = "WATCH"
    else:
        ev.recommendation = "AVOID"
        ev.suggested_stake_frac = 0.0

    fired = [r for r in ev.rules if r.verdict == PASS and r.weight > 0]
    ev.summary = (f"{ev.recommendation} (score {ev.score:.0f}/100). "
                  f"Passed {len(fired)} of {len([r for r in ev.rules if r.weight>0])} "
                  f"weighted rules.")


def _kelly_fraction(price: float, lead_score: float) -> float:
    """Half-Kelly on a binary contract priced `price`, with the edge implied by
    the lead backer's suspicion score mapped to a small probability uplift."""
    price = min(max(price, 0.01), 0.99)
    edge_p = min(0.15, (lead_score / 100) * 0.15)   # cap modelled edge at 15c
    p_win = min(0.99, price + edge_p)
    b = (1 - price) / price                          # net odds
    kelly = (p_win * (b + 1) - 1) / b
    return max(0.0, min(0.05, kelly * 0.5))          # half-Kelly, hard 5% cap


def _v(verdict: str) -> float:
    return {PASS: 1.0, WARN: 0.5, FAIL: 0.0}[verdict]


def _who(b) -> str:
    if not b:
        return "n/a"
    return b.get("name") or (b.get("wallet", "")[:10] + "…")
