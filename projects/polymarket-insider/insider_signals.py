"""
Insider / suspicious-accuracy scoring.

This turns a TraderStats record into a 0-100 "suspicion score" built from
weighted, individually-explainable signals. The score is a research flag, NOT an
accusation: it measures how hard a wallet's track record is to explain by luck
and how closely it fits the behavioural fingerprint of trading on non-public
information.

Each signal returns (points, weight, explanation). The composite is the
weight-normalised sum, scaled to 0-100, with the firing explanations attached so
every score is fully auditable.

Signals
-------
S1  Statistical implausibility   tiny Poisson-binomial p-value (the backbone)
S2  Longshot-winner profile      repeatedly wins bets entered cheap (<20c)
S3  Calibration edge             wins far exceed market-implied expected wins
S4  Information-prone categories  wins concentrated in politics/corp/geo markets
S5  Concentration                 large average ticket on resolved winners
S6  Conviction / ROI              high realised ROI on real capital
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class Signal:
    code: str
    name: str
    points: float        # 0..1 contribution
    weight: float
    explanation: str
    fired: bool


# Minimum resolved sample before the statistical signals are trustworthy.
MIN_SAMPLE = 8


def score_trader(s) -> dict:
    """Return suspicion score + list of Signal objects for a TraderStats `s`."""
    signals: list[Signal] = []

    # --- S1: statistical implausibility (backbone) ----------------------
    if s.n_resolved >= MIN_SAMPLE and s.p_value > 0:
        # map p-value to 0..1 via -log10; p=1 ->0, p=1e-6 ->1 (capped)
        neglog = -math.log10(max(s.p_value, 1e-12))
        pts = _clamp(neglog / 6.0)
        fired = s.p_value < 0.01
        expl = (f"Won {s.wins}/{s.n_resolved} resolved bets where the market priced "
                f"only ~{s.expected_wins:.1f} winners. One-sided Poisson-binomial "
                f"p-value = {s.p_value:.2e} "
                f"({'implausible by chance' if fired else 'within normal range'}).")
    else:
        pts, fired = 0.0, False
        expl = (f"Only {s.n_resolved} resolved bets — below the {MIN_SAMPLE}-bet "
                f"minimum for a reliable calibration test.")
    signals.append(Signal("S1", "Statistical implausibility", pts, 0.34, expl, fired))

    # --- S2: longshot-winner profile ------------------------------------
    lw_rate = (s.longshot_wins / s.wins) if s.wins else 0.0
    pts = _clamp(lw_rate * 1.4)
    fired = s.longshot_wins >= 3 and lw_rate >= 0.25
    expl = (f"{s.longshot_wins} winning bets were entered under 20c "
            f"({lw_rate:.0%} of all winners; avg winner entry {s.avg_winner_entry:.2f}). "
            f"Consistently buying cheap outcomes that hit is the clearest tell.")
    signals.append(Signal("S2", "Longshot-winner profile", pts, 0.22, expl, fired))

    # --- S3: calibration edge -------------------------------------------
    edge_per_bet = (s.edge / s.n_resolved) if s.n_resolved else 0.0
    pts = _clamp(edge_per_bet * 3.0)
    fired = s.n_resolved >= MIN_SAMPLE and edge_per_bet > 0.10
    expl = (f"Beat market-implied expectation by {s.edge:+.1f} wins "
            f"({edge_per_bet:+.2f} per bet). Positive, persistent edge over the "
            f"market's own prices indicates skill or information.")
    signals.append(Signal("S3", "Calibration edge", pts, 0.18, expl, fired))

    # --- S4: information-prone categories -------------------------------
    info_cats = ("Politics/Govt", "Corporate/M&A", "Geopolitics")
    info_n = sum(v for k, v in s.categories.items() if k in info_cats)
    total_cat = sum(s.categories.values()) or 1
    info_share = info_n / total_cat
    pts = _clamp(info_share * 1.1)
    fired = info_n >= 4 and info_share >= 0.4
    top = max(s.categories.items(), key=lambda kv: kv[1])[0] if s.categories else "n/a"
    expl = (f"{info_share:.0%} of resolved bets are in information-sensitive "
            f"categories (politics / corporate / geopolitics); top category: {top}. "
            f"These are where non-public information has the most edge.")
    signals.append(Signal("S4", "Information-prone categories", pts, 0.10, expl, fired))

    # --- S5: concentration / ticket size --------------------------------
    avg_ticket = (s.capital_deployed / s.n_resolved) if s.n_resolved else 0.0
    pts = _clamp(math.log10(avg_ticket + 1) / 4.0)  # $10k avg -> ~1.0
    fired = avg_ticket >= 1000
    expl = (f"Average resolved ticket ~${avg_ticket:,.0f} on "
            f"${s.capital_deployed:,.0f} total deployed. Large size behind accurate "
            f"calls signals conviction rather than lottery-ticket spraying.")
    signals.append(Signal("S5", "Conviction sizing", pts, 0.08, expl, fired))

    # --- S6: realised ROI -----------------------------------------------
    pts = _clamp(s.roi / 2.0)  # 200% ROI -> 1.0
    fired = s.roi > 0.5 and s.capital_deployed > 200
    expl = (f"Realised ROI {s.roi:+.0%} on ${s.capital_deployed:,.0f} of capital "
            f"(${s.realized_pnl:+,.0f} PnL).")
    signals.append(Signal("S6", "Realised ROI", pts, 0.08, expl, fired))

    # --- composite -------------------------------------------------------
    wsum = sum(sig.weight for sig in signals)
    raw = sum(sig.points * sig.weight for sig in signals) / wsum
    score = round(raw * 100, 1)

    # Penalise tiny samples so a 3-for-3 fluke can't top the board.
    if s.n_resolved < MIN_SAMPLE:
        score *= s.n_resolved / MIN_SAMPLE

    return {
        "score": round(score, 1),
        "band": _band(score),
        "signals": signals,
        "fired": [sig for sig in signals if sig.fired],
    }


def _band(score: float) -> str:
    if score >= 70:
        return "HIGH — strong statistical anomaly"
    if score >= 45:
        return "ELEVATED — notable edge"
    if score >= 25:
        return "MODERATE — above average"
    return "LOW — consistent with luck/skill"


def _clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))
