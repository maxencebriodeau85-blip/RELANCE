import { NextResponse } from 'next/server'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

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
        const plan = getPlanFromPriceId(priceId) || 'starter'

        const { error } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan,
          } as never)
          .eq('id', userId)

        if (error) console.error('checkout.session.completed update error:', error)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id
        const plan = getPlanFromPriceId(priceId) || 'starter'

        // Single UPDATE by stripe_customer_id — no N+1 loop
        const { error } = await supabase
          .from('profiles')
          .update({ plan, stripe_subscription_id: subscription.id } as never)
          .eq('stripe_customer_id', customerId)

        if (error) console.error('subscription.updated error:', error)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error } = await supabase
          .from('profiles')
          .update({ plan: 'free_trial', stripe_subscription_id: null } as never)
          .eq('stripe_customer_id', customerId)

        if (error) console.error('subscription.deleted error:', error)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
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
