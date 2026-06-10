# ASC In-App Purchase Registration Sheet — CHROMA

Prepared 2026-06-09 per launch-playbook §3 ("prepare ASC product registration
spreadsheet — do NOT enter into ASC until membership is active").
Copy below is pre-validated against ASC limits (Display Name 2-30 chars,
Description ≤45 chars) and matched to the ACTUAL in-game credit in
`src/services/purchases.ts` (Apple reviewers compare the description to what
the purchase delivers — include the bonus currencies or get rejected).

## Pre-flight (read before touching ASC)

1. **Product ID and Type are immutable; IDs are never reusable** across any
   app on the account, even after deletion. Enter carefully, once.
2. **`vip_pass` type question is RESOLVED in code: Non-Consumable.** VIP is a
   lifetime entitlement (`LIFETIME_VIP_DURATION_MS` = 100 years; restore
   grants the identical duration — `purchases.ts:24-34`). If a subscription
   VIP is ever wanted, that's a NEW product ID anyway, so nothing is lost.
3. Complete **Agreements, Tax, and Banking** (Paid Apps Agreement + W-9 +
   banking → status Active) before expecting production purchases to work.
   Sandbox works without it.
4. Each product needs an **App Review Screenshot** (PNG of the offer visible
   in the app UI — take all of them from ShopScreen in one simulator session;
   the screenshot column says which Shop section shows each product).
5. 2026 ASC uses **price points** (search the exact USD price in the picker),
   not the old tier numbers.

## The 12 products

| # | Product ID (`com.isaaclefohn.chromadrop.` +) | Type | Price | Display Name | Description (≤45) | Review Screenshot |
|---|---|---|---|---|---|---|
| 1 | `coins500` | Consumable | $0.99 | Coin Pouch | 500 coins | Shop → Coins |
| 2 | `coins2500` | Consumable | $3.99 | Coin Chest | 2,500 coins + 10 bonus gems | Shop → Coins |
| 3 | `coins10000` | Consumable | $9.99 | Coin Vault | 10,000 coins + 50 bonus gems | Shop → Coins |
| 4 | `coins50000` | Consumable | $39.99 | Coin Treasury | 50,000 coins + 200 bonus gems | Shop → Coins |
| 5 | `gems100` | Consumable | $1.99 | Gem Shard | 100 gems | Shop → Gems |
| 6 | `gems500` | Consumable | $7.99 | Gem Trove | 500 gems + 1,000 bonus coins | Shop → Gems |
| 7 | `gems1500` | Consumable | $19.99 | Gem Hoard | 1,500 gems + 5,000 bonus coins | Shop → Gems |
| 8 | `starter_pack` | **Non-Consumable** | $4.99 | Starter Pack | No ads, 2,000 coins, 200 gems, 3x power-ups | Shop → Bundles |
| 9 | `power_bundle` | Consumable | $6.99 | Power Bundle | 10 each: Bomb, Row Clear, Color Clear | Shop → Bundles |
| 10 | `mega_bundle` | Consumable | $24.99 | Mega Bundle | 25,000 coins, 1,000 gems, 15x power-ups | Shop → Bundles |
| 11 | `remove_ads` | **Non-Consumable** | $2.99 | Remove Ads | Permanently removes all ads | Shop → Upgrades |
| 12 | `vip_pass` | **Non-Consumable** | $9.99 | VIP Pass | Lifetime VIP: no ads, 2x daily, VIP theme | Shop → Upgrades |

Reference Names (internal, ≤64 chars — suggested): `CHROMA <Display Name>
(<product suffix>)`, e.g. `CHROMA Coin Pouch (coins500)`. Editable later, so
these are not load-bearing.

## Per-product Review Notes (paste into ASC "Review Notes" field)

- **Consumables (1-7, 9, 10):** "Consumable pack. No account or sign-in
  required — open Shop from the home screen coin/gem counter. Game is fully
  playable offline; purchases credit immediately on receipt validation."
- **starter_pack (8):** "One-time bundle: removes ads permanently and grants a
  one-time currency/power-up bonus. Restore Purchases (Settings) restores the
  ad-free entitlement; the consumable bonus is intentionally one-time."
- **remove_ads (11):** "Permanently removes ads. Restorable via Settings →
  Restore Purchases."
- **vip_pass (12):** "Lifetime (non-expiring) VIP entitlement: removes ads,
  doubles daily rewards, unlocks VIP theme, plus a one-time bonus of 5,000
  coins and 500 gems. Entitlement restorable; one-time bonus is not re-granted
  on restore (by design, documented in code)."

## Notes that prevent rejections

- Descriptions above include the bonus currencies because the in-game packs
  actually grant them; a description that says "2,500 coins" while the app
  delivers "2,500 coins + 10 gems" is a 2.3.1 metadata-accuracy risk in the
  other direction too. Keep them in sync with `purchases.ts` if pack contents
  ever change.
- Three products overlap on the ad-free entitlement (8, 11, 12). Overlap
  itself is allowed, **but as of 2026-06-09 ShopScreen renders all products
  unconditionally — no owned-state check** (`ProductCard`, ShopScreen.tsx:127+).
  A player who owns VIP can still buy Remove Ads ($2.99) and gain nothing new,
  since they're different SKUs and StoreKit will charge. **Fix before
  submission:** hide (or mark OWNED) `remove_ads` when any ad-free entitlement
  is held, and `starter_pack`/`vip_pass` when already purchased. Tracked as a
  pre-launch code task.
- The daily wheel odds-disclosure screen already exists (Guideline 3.1.1) —
  reference it in the app-level review notes, not per-product.
