'use client'
import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { resendConfirmation } from '@/app/auth/resend/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
function Send({ cooldown }: { cooldown: number }) {
  const { pending } = useFormStatus()
  return <Button className="w-full" disabled={pending || cooldown > 0}>{pending ? 'Envoi…' : cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Renvoyer la confirmation'}</Button>
}
export function ResendForm({ email = '' }: { email?: string }) {
  const [state, action] = useFormState(resendConfirmation, null)
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => { if (state?.success) setCooldown(60) }, [state])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  return <form action={action} className="space-y-4 text-left">
    <label htmlFor="resend-email" className="block text-sm font-medium">Adresse email</label>
    <Input id="resend-email" type="email" name="email" defaultValue={email} autoComplete="email" required maxLength={254} />
    {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state?.success && <p role="status" className="text-sm text-green-700">Si votre compte attend une confirmation, un nouveau lien vous sera envoyé. Vérifiez aussi vos spams.</p>}
    <Send cooldown={cooldown} />
  </form>
}
