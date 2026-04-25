import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createBillingPortalSession } from '@/lib/stripe'

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
    const { customerId, returnUrl } = body

    if (!customerId) {
      return NextResponse.json({ error: 'ID client Stripe manquant' }, { status: 400 })
    }

    const session = await createBillingPortalSession({
      customerId,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du portail' }, { status: 500 })
  }
}
