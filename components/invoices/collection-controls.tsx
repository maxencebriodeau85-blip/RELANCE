'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { outstanding } from '@/lib/collection'
import { formatEuro } from '@/lib/metrics'
import type { Invoice } from '@/lib/database.types'
export function CollectionControls({
  invoice,
  onSaved,
}: {
  invoice: Invoice
  onSaved: () => void
}) {
  const [paid, setPaid] = useState(String(invoice.amount_paid || 0))
  const [promise, setPromise] = useState(invoice.promise_date || '')
  const [paused, setPaused] = useState(invoice.reminders_paused !== false)
  const [disputed, setDisputed] = useState(invoice.status === 'disputed')
  const [notes, setNotes] = useState(invoice.notes || '')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  async function save() {
    setBusy(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/collection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paid: Number(paid.replace(',', '.')),
          promise_date: promise || null,
          reminders_paused: paused,
          disputed,
          notes,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      toast({
        title: 'Suivi actualisé',
        description: 'Le solde est confirmé à la date du jour.',
      })
      onSaved()
    } catch (error) {
      toast({
        title: 'Enregistrement impossible',
        description: error instanceof Error ? error.message : 'Réessayez.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suivi du règlement</CardTitle>
        <p className="text-sm text-gray-500">
          Reste à encaisser :{' '}
          <strong className="text-brand-800">
            {formatEuro(outstanding(invoice))}
          </strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="amount-paid">Montant déjà encaissé (€ TTC)</Label>
            <Input
              id="amount-paid"
              type="number"
              min="0"
              max={invoice.amount}
              step="0.01"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="promise-date">Paiement promis pour le</Label>
            <Input
              id="promise-date"
              type="date"
              value={promise}
              onChange={(e) => setPromise(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="collection-notes">Notes de suivi</Label>
          <textarea
            id="collection-notes"
            maxLength={4000}
            className="mt-1 w-full rounded-md border p-3 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dernier échange, justificatif demandé…"
          />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={disputed}
            onChange={(e) => {
              setDisputed(e.target.checked)
              if (e.target.checked) setPaused(true)
            }}
          />
          Facture en litige
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
          />
          Mettre les relances en pause
        </label>
        <p className="text-xs leading-relaxed text-gray-500">
          En enregistrant, vous confirmez le montant encaissé. Les relances
          automatiques nécessitent un solde vérifié depuis moins de sept jours
          et l’activation des automatisations dans vos paramètres.
        </p>
        <Button onClick={save} disabled={busy}>
          {busy ? 'Enregistrement…' : 'Confirmer le solde et enregistrer'}
        </Button>
      </CardContent>
    </Card>
  )
}
