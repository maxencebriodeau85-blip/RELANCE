'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { parseAmount } from '@/lib/csv-parser'
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
  const [email, setEmail] = useState(invoice.client_email || '')
  const emailChanged = (email.trim().toLowerCase() || null) !== invoice.client_email
  const [paid, setPaid] = useState(String(invoice.amount_paid || 0))
  const [promise, setPromise] = useState(invoice.promise_date || '')
  const [paused, setPaused] = useState(invoice.reminders_paused !== false)
  const [disputed, setDisputed] = useState(invoice.status === 'disputed')
  const [notes, setNotes] = useState(invoice.notes || '')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  async function save() {
    const amountPaid = parseAmount(paid)
    if (amountPaid === null || amountPaid > Number(invoice.amount)) {
      toast({
        title: 'Montant encaissé invalide',
        description:
          'Renseignez un montant entre zéro et le total TTC, avec deux décimales maximum.',
        variant: 'destructive',
      })
      return
    }
    setBusy(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/collection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paid: amountPaid,
          client_email: email.trim() || null,
          expected_updated_at: invoice.updated_at,
          promise_date: promise || null,
          reminders_paused: paused || emailChanged || !email.trim(),
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
        <div>
          <Label htmlFor="client-email">Email du client (facultatif)</Label>
          <Input id="client-email" type="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="comptabilite@client.fr" disabled={busy} />
          <p className="mt-1 text-xs text-gray-500">Nécessaire pour relancer par email. Une adresse ajoutée ou modifiée remet les relances en pause : vous pourrez les réactiver après vérification.</p>
        </div>
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
            checked={paused || emailChanged || !email.trim()}
            disabled={emailChanged || !email.trim()}
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
