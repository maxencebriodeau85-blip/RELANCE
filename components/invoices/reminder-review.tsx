'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatEuro } from '@/lib/metrics'

type ReminderKind = 'email_1' | 'email_2' | 'email_3'
type Preview = { to: string; replyTo: string; amount: number; subject: string; text: string; confirmation: string }
export function ReminderReview({ ids, type = 'email_1', disabled, onSent, label = 'Prévisualiser la relance' }: {
  ids: string[]; type?: ReminderKind; disabled?: boolean; onSent: () => void | Promise<void>; label?: string
}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [preview, setPreview] = useState<Preview | null>(null)
  const [index, setIndex] = useState(0), [done, setDone] = useState(false)
  const queue = useRef<string[]>([]), chosenType = useRef(type), locked = useRef(false), changed = useRef(false)
  async function load(next: number) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError(''); setPreview(null); setDone(false); setIndex(next)
    try {
      const response = await fetch(`/api/invoices/${queue.current[next]}/remind/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: chosenType.current }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Aperçu indisponible.')
      setPreview(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Aperçu indisponible.') }
    finally { locked.current = false; setBusy(false) }
  }
  function changeOpen(value: boolean) {
    if (locked.current) return
    setOpen(value)
    if (!value && changed.current) { changed.current = false; void onSent() }
  }
  async function confirm() {
    if (!preview || locked.current) return
    locked.current = true; setBusy(true); setError('')
    try {
      const response = await fetch(`/api/invoices/${queue.current[index]}/remind`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: chosenType.current, confirmation: preview.confirmation }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Envoi non confirmé. Consultez l’historique.')
      changed.current = true; setDone(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Envoi non confirmé. Consultez l’historique avant de réessayer.') }
    finally { setPreview(null); locked.current = false; setBusy(false) }
  }
  return <>
    <Button disabled={disabled || !ids.length} onClick={() => { queue.current = [...ids]; chosenType.current = type; changed.current = false; setOpen(true); void load(0) }}>{label}</Button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vérifier la relance</DialogTitle>
          <DialogDescription>Message {index + 1} sur {queue.current.length}. Chaque email nécessite votre confirmation.</DialogDescription>
        </DialogHeader>
        {busy && <p role="status">Chargement…</p>}
        {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {done && <p role="status" className="rounded bg-green-50 p-3 text-green-800">Relance envoyée.</p>}
        {preview && <>
          <dl className="space-y-2 break-words text-sm">
            <div><dt className="font-semibold">Destinataire</dt><dd>{preview.to}</dd></div>
            <div><dt className="font-semibold">Adresse de réponse</dt><dd>{preview.replyTo}</dd></div>
            <div><dt className="font-semibold">Reste à payer</dt><dd>{formatEuro(preview.amount)}</dd></div>
            <div><dt className="font-semibold">Objet</dt><dd>{preview.subject}</dd></div>
          </dl>
          <div aria-label="Texte de l’email" className="whitespace-pre-wrap break-words rounded border bg-gray-50 p-4 text-sm">{preview.text}</div>
          <p className="text-xs text-gray-500">Version texte de l’email. Vérifiez vos mentions personnalisées : les pénalités et frais réservés aux professionnels ne s’appliquent pas aux particuliers.</p>
        </>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => changeOpen(false)}>Fermer</Button>
          {!preview && !done && !busy && <Button variant="outline" onClick={() => void load(index)}>Actualiser l’aperçu</Button>}
          {index + 1 < queue.current.length && <Button variant="outline" disabled={busy} onClick={() => void load(index + 1)}>{done ? 'Message suivant' : 'Passer cette facture'}</Button>}
          {preview && <Button disabled={busy} onClick={() => void confirm()}>Confirmer l’envoi de cet email</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>
}
