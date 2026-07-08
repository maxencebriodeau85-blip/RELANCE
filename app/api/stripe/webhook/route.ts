import { NextResponse } from 'next/server'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

// Reverts a Stripe customer's profile to the unpaid free_trial state.
// Shared by `customer.subscription.deleted` and the terminal-status branch
// of `customer.subscription.updated` — Stripe fires BOTH events for every
// cancellation with no ordering guarantee, so both handlers must apply the
// exact same revert (see the comment at the `updated` call site).
//
// Only reverts if `subscriptionId` matches the profile's currently-recorded
// subscription: a Stripe customer could in principle have more than one
// subscription object (a retried checkout, a manual dashboard action) — a
// stray, unrelated one going terminal must not wipe access granted by a
// different subscription that's still active.
async function revertToFreeTrial(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  customerId: string,
  subscriptionId: string,
  logLabel: string
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .single()

  const activeSubscriptionId = (profile as { stripe_subscription_id: string | null } | null)
    ?.stripe_subscription_id

  if (activeSubscriptionId && activeSubscriptionId !== subscriptionId) {
    console.warn(
      `Stripe webhook (${logLabel}): terminal subscription ${subscriptionId} for customer ` +
        `${customerId} does not match the profile's active subscription ` +
        `${activeSubscriptionId} — not reverting.`
    )
    return
  }

  // Revert to free_trial AND stamp trial_ends_at in the past so the
  // dashboard gate blocks access immediately. Without this, a cancelled
  // account whose trial_ends_at was null (legacy rows) would fall through
  // the `plan==='free_trial' && trial_ends_at && …` gate and keep free
  // access. Data is preserved — only new actions are blocked.
  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'free_trial',
      stripe_subscription_id: null,
      trial_ends_at: new Date(Date.now() - 1000).toISOString(),
    } as never)
    .eq('stripe_customer_id', customerId)

  if (error) console.error(`${logLabel} error:`, error)
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // ── Case A: debtor paying an invoice directly ──────────────────────
        const invoiceId = session.metadata?.invoice_id
        if (invoiceId && session.mode === 'payment') {
          const { error } = await supabase
            .from('invoices')
            .update({ status: 'paid' } as never)
            .eq('id', invoiceId)
          if (error) console.error('invoice payment update error:', error)
          break
        }

        // ── Case B: user subscribing to a plan ────────────────────────────
        const userId = session.metadata?.userId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!userId || !subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        if (subscription.customer !== customerId) {
          console.error('Stripe customer mismatch in webhook')
          break
        }

        const priceId = subscription.items.data[0]?.price.id
        const plan = getPlanFromPriceId(priceId)

        // NEVER silently default an unrecognized price to 'starter': that
        // would downgrade a paying Business/Pro customer to the cheapest
        // tier's limits the moment STRIPE_*_PRICE_ID drifts from what's
        // actually configured in Stripe (a typo, a live/test mode mismatch,
        // a price ID rotated in the dashboard) — the exact kind of mistake a
        // human copy-pasting IDs into Vercel is likely to make. Record the
        // subscription regardless (so the checkout isn't silently lost), but
        // only touch `plan` when we're certain which one was purchased.
        if (!plan) {
          console.error(
            `Stripe webhook: unrecognized price ID "${priceId}" for user ${userId} — ` +
              'plan left unchanged. Check STRIPE_STARTER_PRICE_ID / STRIPE_PRO_PRICE_ID / ' +
              'STRIPE_BUSINESS_PRICE_ID against the Stripe dashboard.'
          )
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            ...(plan ? { plan } : {}),
          } as never)
          .eq('id', userId)

        if (error) console.error('checkout.session.completed update error:', error)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Stripe doesn't guarantee event order: cancelling a subscription
        // fires BOTH `customer.subscription.updated` (status -> canceled)
        // and `customer.subscription.deleted`, and `updated` can be
        // delivered AFTER `deleted` already reverted the account to
        // free_trial. Without this guard, that late `updated` event would
        // silently resurrect paid access by re-matching the stale price ID
        // and rewriting plan + stripe_subscription_id. Mirror the `deleted`
        // handler for any terminal status so ordering can't matter.
        if (
          subscription.status === 'canceled' ||
          subscription.status === 'unpaid' ||
          subscription.status === 'incomplete_expired'
        ) {
          await revertToFreeTrial(supabase, customerId, subscription.id, 'subscription.updated (terminal status)')
          break
        }

        const priceId = subscription.items.data[0]?.price.id
        const plan = getPlanFromPriceId(priceId)

        if (!plan) {
          console.error(
            `Stripe webhook: unrecognized price ID "${priceId}" for Stripe customer ` +
              `${customerId} — plan left unchanged. Check STRIPE_STARTER_PRICE_ID / ` +
              'STRIPE_PRO_PRICE_ID / STRIPE_BUSINESS_PRICE_ID against the Stripe dashboard.'
          )
        }

        // Single UPDATE by stripe_customer_id — no N+1 loop
        const { error } = await supabase
          .from('profiles')
          .update({
            stripe_subscription_id: subscription.id,
            ...(plan ? { plan } : {}),
          } as never)
          .eq('stripe_customer_id', customerId)

        if (error) console.error('subscription.updated error:', error)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await revertToFreeTrial(supabase, customerId, subscription.id, 'subscription.deleted')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // Log for now; Stripe retries (dunning) over several days before it
        // fires subscription.deleted, which is where access is actually cut.
        // TODO post-launch: set a past_due flag + notify the user.
        console.warn(`Payment failed for Stripe customer ${invoice.customer}`)
        break
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
