'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
export function PaymentPending() {
  const router = useRouter()
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (attempt >= 6) return
    const timer = setTimeout(() => { setAttempt(value => value + 1); router.refresh() }, 4000)
    return () => clearTimeout(timer)
  }, [attempt, router])
  return <div role="status" className="space-y-4 text-sm text-gray-600">
    <p>{attempt < 6 ? 'Nous attendons la confirmation du paiement. Cette page se met à jour automatiquement.' : 'La confirmation prend plus de temps que prévu. Ne payez pas une seconde fois. Vous pouvez revenir plus tard ou réessayer la vérification.'}</p>
    {attempt >= 6 && <button onClick={() => { setAttempt(0); router.refresh() }} className="rf-button">Vérifier à nouveau</button>}
  </div>
}
