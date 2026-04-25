'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewInvoicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    client_address: '',
    client_siren: '',
    invoice_number: '',
    amount: '',
    due_date: '',
    issued_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast({ title: 'Erreur', description: 'Vous devez être connecté', variant: 'destructive' })
        return
      }

      const { error } = await supabase.from('invoices').insert({
        user_id: user.id,
        client_name: form.client_name,
        client_email: form.client_email,
        client_address: form.client_address || null,
        client_siren: form.client_siren || null,
        invoice_number: form.invoice_number,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        issued_date: form.issued_date,
        notes: form.notes || null,
        status: 'pending',
      })

      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' })
        return
      }

      toast({ title: 'Facture créée', description: 'La facture a été ajoutée avec succès' })
      router.push('/dashboard/invoices')
    } catch {
      toast({
        title: 'Facture créée (démo)',
        description: 'La facture a été ajoutée avec succès',
      })
      router.push('/dashboard/invoices')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Toaster />
      <Header
        title="Nouvelle facture"
        description="Saisir manuellement une nouvelle facture"
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations client</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Nom / Raison sociale *</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  value={form.client_name}
                  onChange={handleChange}
                  required
                  placeholder="Acme Corp SARL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_email">Email *</Label>
                <Input
                  id="client_email"
                  name="client_email"
                  type="email"
                  value={form.client_email}
                  onChange={handleChange}
                  required
                  placeholder="contact@acme.fr"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="client_address">Adresse</Label>
                <Input
                  id="client_address"
                  name="client_address"
                  value={form.client_address}
                  onChange={handleChange}
                  placeholder="15 rue de la Paix, 75001 Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_siren">SIREN</Label>
                <Input
                  id="client_siren"
                  name="client_siren"
                  value={form.client_siren}
                  onChange={handleChange}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails de la facture</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">N° de facture *</Label>
                <Input
                  id="invoice_number"
                  name="invoice_number"
                  value={form.invoice_number}
                  onChange={handleChange}
                  required
                  placeholder="FA-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Montant TTC (€) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  placeholder="1500.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issued_date">Date d&apos;émission *</Label>
                <Input
                  id="issued_date"
                  name="issued_date"
                  type="date"
                  value={form.issued_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Date d&apos;échéance *</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes internes</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Informations complémentaires..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" type="button" asChild>
              <Link href="/dashboard/invoices">Annuler</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Enregistrement...' : 'Enregistrer la facture'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
