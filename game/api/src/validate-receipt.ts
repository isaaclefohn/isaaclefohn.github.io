/**
 * Apple IAP receipt validation endpoint.
 * POST /api/validate-receipt
 * Body: { platform: "apple", receiptData: string, productId: string }
 *
 * Server contract:
 *   The server's only job is to confirm "this receipt is real and matches
 *   this product ID." Reward amounts (coins, gems, bundle contents) are
 *   product metadata that already lives in the client catalog — duplicating
 *   them here invites drift (which is exactly what happened: the previous
 *   PRODUCT_CREDITS map miscredited `starter_pack` and was missing five
 *   SKUs entirely). The client re-derives credits via `getPurchaseReward`
 *   after the server returns `{ valid: true }`.
 *
 *   This keeps the server stateless and lets the client own the
 *   "what does this purchase give the player" decision in one place.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// SKU allow-list. This must stay in sync with `src/services/purchases.ts`
// and `store-metadata.json` — the IapCatalog test (jest) pins the
// client-side parity; this server file is the third corner of the
// triangle. When you add a SKU, add it here too.
const VALID_PRODUCT_IDS: ReadonlySet<string> = new Set([
  // Coin packs
  'com.isaaclefohn.chromadrop.coins500',
  'com.isaaclefohn.chromadrop.coins2500',
  'com.isaaclefohn.chromadrop.coins10000',
  'com.isaaclefohn.chromadrop.coins50000',
  // Gem packs
  'com.isaaclefohn.chromadrop.gems100',
  'com.isaaclefohn.chromadrop.gems500',
  'com.isaaclefohn.chromadrop.gems1500',
  // Bundles
  'com.isaaclefohn.chromadrop.starter_pack',
  'com.isaaclefohn.chromadrop.power_bundle',
  'com.isaaclefohn.chromadrop.mega_bundle',
  // Premium
  'com.isaaclefohn.chromadrop.remove_ads',
  'com.isaaclefohn.chromadrop.vip_pass',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { platform, receiptData, productId } = req.body;

    if (!platform || !receiptData || !productId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!VALID_PRODUCT_IDS.has(productId)) {
      return res.status(400).json({ error: 'Unknown product ID' });
    }

    // TODO: Validate receipt with Apple's /verifyReceipt endpoint
    // TODO: Extract user from JWT in Authorization header
    // TODO: Record purchase in Supabase

    // STUB-MODE WARNING — the receipt is NOT actually validated against
    // Apple yet. Until the TODOs above land (blocked on Apple Developer
    // enrollment), this endpoint is a SKU allow-list, not a receipt
    // validator. A jailbroken or tampered client could POST any string
    // as `receiptData` and get back `valid: true`, then have
    // `creditFromProduct` run client-side. The exploit surface is bounded
    // by the client's local catalog (the worst case is a player giving
    // themselves coins on their own device), but it's a real gap. Log
    // every request loudly so the size of the exposure is visible in
    // Vercel logs while we're in this transition state.
    console.error(
      '[STUB MODE] validate-receipt accepted without Apple verification',
      JSON.stringify({
        productId,
        platform,
        receiptLen: typeof receiptData === 'string' ? receiptData.length : null,
        ts: new Date().toISOString(),
      }),
    );

    // Crediting deliberately omitted — see file header. The client owns
    // the credit table via `getPurchaseReward(productId)` and dispatches
    // through `creditFromProduct` after this returns `valid: true`.
    return res.status(200).json({
      valid: true,
      productId,
    });
  } catch (error) {
    console.error('Receipt validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
