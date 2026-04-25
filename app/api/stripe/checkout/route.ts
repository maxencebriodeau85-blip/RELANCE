import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createCheckoutSession, STRIPE_PLANS, type PlanKey } from '@/lib/stripe'
import type { Profile } from '@/lib/database.types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { plan } = body as { plan: PlanKey }

    if (!plan || !STRIPE_PLANS[plan]) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const profile = profileData as unknown as Profile | null
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await createCheckoutSession({
      customerId: profile?.stripe_customer_id || undefined,
      priceId: STRIPE_PLANS[plan].priceId,
      successUrl: `${appUrl}/dashboard/settings?checkout=success`,
      cancelUrl: `${appUrl}/dashboard/settings?checkout=cancelled`,
      userId: user.id,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création de la session' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const plan = searchParams.get('plan') as PlanKey

  if (!plan || !STRIPE_PLANS[plan]) {
    return NextResponse.redirect(new URL('/#pricing', request.url))
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL(`/auth/login?redirectedFrom=/api/stripe/checkout?plan=${plan}`, request.url)
      )
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const profile = profileData as unknown as Profile | null
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await createCheckoutSession({
      customerId: profile?.stripe_customer_id || undefined,
      priceId: STRIPE_PLANS[plan].priceId,
      successUrl: `${appUrl}/dashboard/settings?checkout=success`,
      cancelUrl: `${appUrl}/dashboard/settings?checkout=cancelled`,
      userId: user.id,
    })

    return NextResponse.redirect(session.url!)
  } catch (err) {
    console.error('Checkout redirect error:', err)
    return NextResponse.redirect(new URL('/#pricing', request.url))
  }
}
