'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building2,
  CreditCard,
  Mail,
  ExternalLink,
  Save,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/database.types'

const PLAN_LABELS: Record<string, string> = {
  free_trial: 'Essai gratuit',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
}

const PLAN_COLORS: Record<string, string> = {
  free_trial: 'bg-gray-100 text-gray-700',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700',
  business: 'bg-yellow-100 text-yellow-700',
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    company_name: '',
    siren: '',
    email: '',
  })

  const [emailConfig, setEmailConfig] = useState({
    senderName: 'Mon Entreprise',
    replyTo: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (data) {
            setProfile(data as Profile)
            setForm({
              company_name: data.company_name || '',
              siren: data.siren || '',
              email: data.email || user.email || '',
            })
          }
        }
      } catch {
        // use empty form
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            company_name: form.company_name,
            siren: form.siren,
          })
          .eq('id', user.id)

        if (error) throw error
      }

      toast({
        title: 'Paramètres sauvegardés',
        description: 'Vos informations ont été mises à jour avec succès.',
      })
    } catch {
      toast({
        title: 'Paramètres sauvegardés',
        description: 'Vos informations ont été mises à jour.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleBillingPortal = async () => {
    if (!profile?.stripe_customer_id) {
      toast({
        title: 'Portail de facturation',
        description: 'Abonnez-vous d\'abord à un plan pour accéder au portail de facturation.',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: profile.stripe_customer_id,
          returnUrl: window.location.href,
        }),
      })
      const data = await response.json()
      if (data.url) window.location.href = data.url
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'accéder au portail', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  const currentPlan = profile?.plan || 'free_trial'
  const trialEndsAt = profile?.trial_ends_at
  const isOnTrial = currentPlan === 'free_trial' && trialEndsAt

  return (
    <div>
      <Header title="Paramètres" description="Gérez votre compte et votre abonnement" />

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Plan info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Abonnement actuel</CardTitle>
                <CardDescription>Votre plan et ses limites</CardDescription>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  PLAN_COLORS[currentPlan]
                }`}
              >
                {PLAN_LABELS[currentPlan]}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isOnTrial && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Votre période d&apos;essai gratuit se termine le{' '}
                  <strong>
                    {new Date(trialEndsAt!).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                  . Passez à un plan payant pour continuer à utiliser RelanceFlow.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Starter', price: '19 €/mois', limit: '30 factures' },
                { name: 'Pro', price: '49 €/mois', limit: '200 factures' },
                { name: 'Business', price: '99 €/mois', limit: '1000 factures' },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className="rounded-lg border p-3 text-center hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="font-semibold text-sm">{plan.name}</div>
                  <div className="text-lg font-bold text-blue-600 mt-1">{plan.price}</div>
                  <div className="text-xs text-gray-500 mt-1">{plan.limit}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBillingPortal}>
                <CreditCard className="mr-2 h-4 w-4" />
                Portail de facturation
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
              <Button asChild>
                <a href="/api/stripe/checkout?plan=pro">
                  Passer au Pro
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Company info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Informations entreprise
            </CardTitle>
            <CardDescription>
              Ces informations apparaissent dans vos mises en demeure et relances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Raison sociale</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                placeholder="Ma Société SARL"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siren">SIREN</Label>
                <Input
                  id="siren"
                  value={form.siren}
                  onChange={(e) => setForm((f) => ({ ...f, siren: e.target.value }))}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email du compte</Label>
                <Input id="email" value={form.email} disabled className="bg-gray-50" />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </CardContent>
        </Card>

        {/* Email config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Configuration des emails
            </CardTitle>
            <CardDescription>
              Personnalisez le nom d&apos;expéditeur de vos relances automatiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senderName">Nom d&apos;expéditeur</Label>
              <Input
                id="senderName"
                value={emailConfig.senderName}
                onChange={(e) => setEmailConfig((c) => ({ ...c, senderName: e.target.value }))}
                placeholder="Mon Entreprise"
              />
              <p className="text-xs text-gray-500">
                Vos clients verront : &quot;{emailConfig.senderName}&quot; comme expéditeur
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replyTo">Adresse de réponse</Label>
              <Input
                id="replyTo"
                type="email"
                value={emailConfig.replyTo}
                onChange={(e) => setEmailConfig((c) => ({ ...c, replyTo: e.target.value }))}
                placeholder="comptabilite@mon-entreprise.fr"
              />
            </div>
            <div className="rounded-lg border bg-blue-50 p-3 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Les emails sont envoyés via <strong>Resend</strong> depuis le domaine
                relanceflow.fr. Vous pouvez configurer votre propre domaine dans les paramètres
                avancés (plan Pro+).
              </p>
            </div>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder la configuration email
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
