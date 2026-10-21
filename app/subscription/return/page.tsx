import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { stripe, billingConfigured } from '@/lib/stripe'
import { syncCheckout } from '@/lib/billing-sync'
import { PaymentPending } from '@/components/auth/payment-pending'
export default async function PaymentReturn({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/auth/login?redirectedFrom=' + encodeURIComponent(`/subscription/return?session_id=${session_id || ''}`))
  let active = false
  let retry = false
  if (session_id?.startsWith('cs_') && billingConfigured()) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id)
      if (session.metadata?.userId === user.id) {
        active = await syncCheckout(session, user.id)
        retry = !active
      }
    } catch { retry = true }
  }
  if (active) redirect('/dashboard')
  return <main className="min-h-screen flex items-center justify-center bg-brand-50 p-6"><div className="max-w-md rounded-2xl border bg-white p-8 space-y-5">
    <h1 className="text-2xl font-semibold">Vérification de votre abonnement</h1>
    {retry ? <PaymentPending /> : <p>Ce retour de paiement ne permet pas de vérifier votre abonnement. Retrouvez votre compte ci-dessous.</p>}
    <Link className="block underline" href="/subscription">Retour à mon compte</Link>
  </div></main>
}
