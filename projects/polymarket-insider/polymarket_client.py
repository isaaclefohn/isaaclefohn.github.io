"""
Thin client for Polymarket's PUBLIC, read-only data APIs.

All data used by this project is public: on-chain trades settled on Polygon and
surfaced through Polymarket's hosted endpoints. No authentication, no private
keys, no order placement — this is a research/analytics tool, not a trading bot.

Endpoints used
--------------
  data-api.polymarket.com/trades       global trade tape (wallet discovery)
  data-api.polymarket.com/positions    a wallet's positions w/ PnL + resolution
  data-api.polymarket.com/activity      a wallet's full event ledger (timing)
  gamma-api.polymarket.com/markets      market metadata + resolution status

The client adds polite rate-limiting, retry-with-backoff, and an on-disk JSON
cache so a full run can be reproduced offline. If the network is unavailable it
falls back to a bundled snapshot (data/snapshot.json) so the pipeline — and the
artifacts on the portfolio page — remain reproducible.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests

DATA_API = "https://data-api.polymarket.com"
GAMMA_API = "https://gamma-api.polymarket.com"

CACHE_DIR = Path(__file__).parent / "data" / "cache"
SNAPSHOT = Path(__file__).parent / "data" / "snapshot.json"

# Be a good citizen: small delay between live calls, bounded retries.
_MIN_INTERVAL = 0.25
_MAX_RETRIES = 4
_TIMEOUT = 20


class PolymarketClient:
    def __init__(self, use_cache: bool = True, offline: bool = False):
        self.use_cache = use_cache
        self.offline = offline
        self._last_call = 0.0
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": "polymarket-insider-research/1.0"})
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # ---- low-level GET with caching, throttling, retry ------------------
    def _cache_path(self, key: str) -> Path:
        safe = "".join(c if c.isalnum() else "_" for c in key)[:180]
        return CACHE_DIR / f"{safe}.json"

    def _get(self, base: str, path: str, params: dict, cache_key: str):
        if self.use_cache:
            cp = self._cache_path(cache_key)
            if cp.exists():
                return json.loads(cp.read_text())

        if self.offline:
            return None

        # throttle
        elapsed = time.time() - self._last_call
        if elapsed < _MIN_INTERVAL:
            time.sleep(_MIN_INTERVAL - elapsed)

        url = f"{base}{path}"
        last_err = None
        for attempt in range(_MAX_RETRIES):
            try:
                r = self._session.get(url, params=params, timeout=_TIMEOUT)
                self._last_call = time.time()
                if r.status_code == 429:
                    time.sleep(2 ** attempt)
                    continue
                r.raise_for_status()
                data = r.json()
                if self.use_cache:
                    self._cache_path(cache_key).write_text(json.dumps(data))
                return data
            except (requests.RequestException, ValueError) as e:  # network / json
                last_err = e
                time.sleep(2 ** attempt)
        print(f"  ! request failed after retries: {url} ({last_err})")
        return None

    # ---- public endpoints ----------------------------------------------
    def recent_trades(self, limit: int = 500, offset: int = 0) -> list:
        """Global trade tape — used to discover active wallets."""
        data = self._get(
            DATA_API, "/trades",
            {"limit": limit, "offset": offset, "takerOnly": "false"},
            f"trades_{limit}_{offset}",
        )
        return data or []

    def positions(self, wallet: str, limit: int = 500) -> list:
        """A wallet's positions, including realized PnL and resolution price."""
        data = self._get(
            DATA_API, "/positions",
            {"user": wallet, "limit": limit, "sortBy": "CURRENT", "sortDirection": "DESC"},
            f"positions_{wallet}_{limit}",
        )
        return data or []

    def activity(self, wallet: str, limit: int = 500) -> list:
        """A wallet's event ledger (TRADE/REDEEM/...) — used for entry timing."""
        data = self._get(
            DATA_API, "/activity",
            {"user": wallet, "limit": limit},
            f"activity_{wallet}_{limit}",
        )
        return data or []

    def market(self, condition_id: str) -> dict | None:
        """Market metadata + resolution status by conditionId."""
        data = self._get(
            GAMMA_API, "/markets",
            {"condition_ids": condition_id},
            f"market_{condition_id}",
        )
        if isinstance(data, list) and data:
            return data[0]
        return None


def load_snapshot() -> dict | None:
    """Bundled offline dataset captured from a prior live run."""
    if SNAPSHOT.exists():
        return json.loads(SNAPSHOT.read_text())
    return None
