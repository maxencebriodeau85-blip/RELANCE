import { NextResponse } from 'next/server'
import { syncCheckout } from '@/lib/billing-sync'
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
  logLabel: string,
) {
  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (readError) throw readError
  if (!profile) return

  const activeSubscriptionId = (
    profile as { stripe_subscription_id: string | null } | null
  )?.stripe_subscription_id

  if (activeSubscriptionId && activeSubscriptionId !== subscriptionId) {
    console.warn(
      `Stripe webhook (${logLabel}): terminal subscription ${subscriptionId} for customer ` +
        `${customerId} does not match the profile's active subscription ` +
        `${activeSubscriptionId} — not reverting.`,
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
    .eq('stripe_subscription_id', subscriptionId)

  if (error) throw error
}

async function syncSubscriptionStatus(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscriptionId: string,
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
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
    subscription.status === 'paused' ||
    subscription.status === 'incomplete_expired'
  ) {
    await revertToFreeTrial(
      supabase,
      customerId,
      subscription.id,
      'subscription.updated (terminal status)',
    )
    return
  }

  if (!['active', 'trialing'].includes(subscription.status)) return
  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanFromPriceId(priceId)

  if (!plan) {
    console.error(
      `Stripe webhook: unrecognized price ID "${priceId}" for Stripe customer ` +
        `${customerId} — plan left unchanged. Check STRIPE_STARTER_PRICE_ID / ` +
        'STRIPE_FOUNDER_PRICE_ID / STRIPE_PRO_PRICE_ID / STRIPE_BUSINESS_PRICE_ID against the Stripe dashboard.',
    )
    throw new Error('Unrecognized subscription price')
  }

  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('id, stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (readError) throw readError
  if (!profile) return // Event belongs to a customer outside Encair.
  if (
    profile.stripe_subscription_id &&
    profile.stripe_subscription_id !== subscription.id
  )
    return

  // Single UPDATE by stripe_customer_id — no N+1 loop
  let update = supabase
    .from('profiles')
    .update({
      stripe_subscription_id: subscription.id,
      ...(plan ? { plan } : {}),
    } as never)
    .eq('stripe_customer_id', customerId)

  update = profile.stripe_subscription_id
    ? update.eq('stripe_subscription_id', profile.stripe_subscription_id)
    : update.is('stripe_subscription_id', null)
  const { error } = await update
  if (error) throw error
}

export async function POST(request: Request) {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
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
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature invalid' },
      { status: 400 },
    )
  }

  const supabase = await createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session

        // ── Case A: debtor paying an invoice directly ──────────────────────
        const invoiceId = session.metadata?.invoice_id
        if (invoiceId && session.mode === 'payment') {
          // Legacy payments reached the platform, not the creditor. Reconcile manually.
          console.warn(
            'Legacy invoice payment requires manual reconciliation:',
            session.id,
          )
          break
        }

        await syncCheckout(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.resumed':
      case 'customer.subscription.paused':
      case 'customer.subscription.deleted': {
        await syncSubscriptionStatus(
          supabase,
          (event.data.object as Stripe.Subscription).id,
        )
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // Supports both legacy endpoint payloads and the pinned Endive API.
        const legacy = invoice as unknown as {
          subscription?: string | { id: string } | null
        }
        const subscription =
          invoice.parent?.subscription_details?.subscription ??
          legacy.subscription
        if (subscription)
          await syncSubscriptionStatus(
            supabase,
            typeof subscription === 'string' ? subscription : subscription.id,
          )
        break
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
