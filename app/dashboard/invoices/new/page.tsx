'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, AlertCircle, Euro, User, FileText } from 'lucide-react'
import Link from 'next/link'

interface FieldErrors {
  client_name?: string
  client_email?: string
  client_siren?: string
  invoice_number?: string
  amount?: string
  issued_date?: string
  due_date?: string
  [key: string]: string | undefined
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 flex-shrink-0" />{msg}</p>
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState('')

  const todayStr = today()
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    client_address: '',
    client_siren: '',
    invoice_number: '',
    amount: '',
    issued_date: todayStr,
    due_date: addDays(todayStr, 30),
    notes: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (fieldErrors[field]) setFieldErrors((fe) => ({ ...fe, [field]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    setGlobalError('')

    try {
      const res = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      })

      const data = await res.json()

      if (res.status === 422 && data.fields) {
        setFieldErrors(data.fields)
        setLoading(false)
        return
      }

      if (res.status === 403) {
        setGlobalError(data.error)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setGlobalError(data.error || 'Erreur lors de la création')
        setLoading(false)
        return
      }

      toast({ title: 'Facture créée', description: `${form.invoice_number} ajoutée avec succès.` })
      router.push(data.id ? `/dashboard/invoices/${data.id}` : '/dashboard/invoices')
    } catch {
      setGlobalError('Erreur réseau. Veuillez réessayer.')
      setLoading(false)
    }
  }

  // Auto-fill due date when issued_date changes
  const handleIssuedDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((f) => ({
      ...f,
      issued_date: val,
      due_date: val ? addDays(val, 30) : f.due_date,
    }))
  }

  const dueDays = form.issued_date && form.due_date
    ? Math.round((new Date(form.due_date).getTime() - new Date(form.issued_date).getTime()) / 86400000)
    : null

  return (
    <div>
      <Header
        title="Nouvelle facture"
        description="Saisir manuellement une facture à recouvrer"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
        }
      />

      <div className="p-6 max-w-2xl">
        {globalError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Client */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                <User className="h-4 w-4" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="client_name">Nom / Raison sociale <span className="text-red-500">*</span></Label>
                <Input
                  id="client_name"
                  value={form.client_name}
                  onChange={set('client_name')}
                  placeholder="Acme Corp SARL"
                  className={fieldErrors.client_name ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                <FieldError msg={fieldErrors.client_name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_email">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="client_email"
                  type="email"
                  value={form.client_email}
                  onChange={set('client_email')}
                  placeholder="contact@acme.fr"
                  className={fieldErrors.client_email ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                <FieldError msg={fieldErrors.client_email} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="client_address">Adresse <span className="text-gray-400 font-normal text-xs">(optionnel)</span></Label>
                <Input
                  id="client_address"
                  value={form.client_address}
                  onChange={set('client_address')}
                  placeholder="15 rue de la Paix, 75001 Paris"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_siren">SIREN <span className="text-gray-400 font-normal text-xs">(optionnel)</span></Label>
                <Input
                  id="client_siren"
                  value={form.client_siren}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 9)
                    setForm((f) => ({ ...f, client_siren: v }))
                    if (fieldErrors.client_siren) setFieldErrors((fe) => ({ ...fe, client_siren: undefined }))
                  }}
                  placeholder="123456789"
                  maxLength={9}
                  className={fieldErrors.client_siren ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                <FieldError msg={fieldErrors.client_siren} />
              </div>
            </CardContent>
          </Card>

          {/* Invoice details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                <FileText className="h-4 w-4" />
                Détails de la facture
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="invoice_number">N° de facture <span className="text-red-500">*</span></Label>
                <Input
                  id="invoice_number"
                  value={form.invoice_number}
                  onChange={set('invoice_number')}
                  placeholder="FA-2024-001"
                  className={fieldErrors.invoice_number ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                <FieldError msg={fieldErrors.invoice_number} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Montant TTC <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={set('amount')}
                    placeholder="1 500,00"
                    className={`pl-8 ${fieldErrors.amount ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  />
                </div>
                <FieldError msg={fieldErrors.amount} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="issued_date">Date d&apos;émission <span className="text-red-500">*</span></Label>
                <Input
                  id="issued_date"
                  type="date"
                  value={form.issued_date}
                  onChange={handleIssuedDateChange}
                  className={fieldErrors.issued_date ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                <FieldError msg={fieldErrors.issued_date} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due_date">
                  Date d&apos;échéance <span className="text-red-500">*</span>
                  {dueDays !== null && dueDays > 0 && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">{dueDays}j</span>
                  )}
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  min={form.issued_date}
                  onChange={set('due_date')}
                  className={fieldErrors.due_date ? 'border-red-400 focus-visible:ring-red-400' : ''}
                />
                <FieldError msg={fieldErrors.due_date} />
                {/* Quick shortcuts */}
                <div className="flex gap-1.5">
                  {[30, 45, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, due_date: addDays(f.issued_date || todayStr, d) }))}
                      className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      +{d}j
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notes internes <span className="text-gray-400 font-normal text-xs">(optionnel)</span></Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={set('notes')}
                  rows={2}
                  maxLength={1000}
                  placeholder="Informations utiles pour le suivi (non transmises au client)"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
                {form.notes.length > 800 && (
                  <p className="text-xs text-gray-400">{form.notes.length}/1000</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={loading} className="min-w-32">
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Création…' : 'Créer la facture'}
            </Button>
            <Button variant="ghost" type="button" asChild>
              <Link href="/dashboard/invoices">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
