/**
 * Stripe webhook handler.
 * POST /api/stripe-webhook
 * Handles checkout.session.completed events for web-based purchases.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  try {
    // TODO: Verify webhook signature with Stripe
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const event = stripe.webhooks.constructEvent(
    //   req.body, signature, process.env.STRIPE_WEBHOOK_SECRET!
    // );

    // TODO: Handle event types
    // switch (event.type) {
    //   case 'checkout.session.completed':
    //     // Credit user account
    //     break;
    // }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }
}
