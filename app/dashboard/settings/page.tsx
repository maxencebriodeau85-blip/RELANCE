'use client'

import { CheckoutButton } from '@/components/auth/checkout-button'
import { OFFER, PRICE_TAX } from '@/lib/plans'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Bell,
  BellOff,
  Shield,
  Zap,
  Star,
  Rocket,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/database.types'
import { AccountData } from '@/components/dashboard/account-data'

const PLAN_LABELS: Record<string, string> = {
  free_trial: 'Essai gratuit',
  starter: 'Offre active',
  pro: 'Pro',
  business: 'Business',
}

const PLAN_COLORS: Record<string, string> = {
  free_trial: 'bg-gray-100 text-gray-700 border-gray-200',
  starter: 'bg-brand-100 text-brand-700 border-brand-200',
  pro: 'bg-[#fbf3ec] text-[#a74a28] border-[#f0dece]',
  business: 'bg-amber-100 text-amber-700 border-amber-200',
}

const PLANS = [{ id: OFFER.key, name: OFFER.name, price: String(OFFER.price), limit: '100 nouvelles factures / mois', features: [...OFFER.features], icon: Zap, color: 'text-[#182b40]', border: 'border-[#dacaba]', recommended: false }]

function SettingsPageInner() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)

  const [form, setForm] = useState({
    company_name: '',
    siren: '',
    address: '',
    postal_code: '',
    city: '',
    phone: '',
  })

  const [autoReminders, setAutoReminders] = useState(false)
  const [savedAutoReminders, setSavedAutoReminders] = useState(false)
  const [capabilities, setCapabilities] = useState<{ emailAvailable: boolean; automationAvailable: boolean } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.assign('/auth/login?redirectedFrom=/dashboard/settings'); return }
        setUserEmail(user.email || '')

        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (error || !data) throw new Error('Profil indisponible')
        if (data) {
          const p = data as Profile
          setProfile(p)
          setForm({
            company_name: p.company_name || '',
            siren: p.siren || '',
            address: p.address || '',
            postal_code: p.postal_code || '',
            city: p.city || '',
            phone: p.phone || '',
          })
          setAutoReminders(p.auto_reminders ?? false)
          setSavedAutoReminders(p.auto_reminders ?? false)
          const settingsResponse = await fetch('/api/profile/reminders', { cache: 'no-store' })
          const settings = await settingsResponse.json()
          if (settingsResponse.ok) setCapabilities(settings.capabilities)
        }
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (!checkout) return

    if (checkout === 'success') {
      toast({
        title: 'Vérification de l’abonnement',
        description: 'Le statut affiché dans votre compte fait foi.',
      })
    } else if (checkout === 'cancelled') {
      toast({
        title: 'Paiement annulé',
        description: "Aucun changement n'a été effectué sur votre abonnement.",
      })
    }

    router.replace('/dashboard/settings')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSaveProfile = async () => {
    if (form.siren && !/^\d{9}$/.test(form.siren.replace(/\s/g, ''))) {
      toast({ title: 'SIREN invalide', description: 'Le SIREN doit contenir exactement 9 chiffres.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const { data: updated, error } = await supabase.from('profiles').update({
        company_name: form.company_name || null,
        siren: form.siren.replace(/\s/g, '') || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        phone: form.phone || null,
      } as never).eq('id', user.id).select('*').single()

      if (error || !updated) throw new Error('Enregistrement impossible')
      setProfile(updated as Profile)

      toast({ title: 'Profil sauvegardé', description: 'Vos informations ont été mises à jour.' })
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSavingNotif(true)
    try {
      const response = await fetch('/api/profile/reminders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_reminders: autoReminders }),
      })
      const result = await response.json()
      if (!response.ok || !result.settings) throw new Error(result.error || 'Enregistrement impossible.')
      setAutoReminders(result.settings.auto_reminders)
      setSavedAutoReminders(result.settings.auto_reminders)
      setCapabilities(result.capabilities)
      toast({
        title: result.settings.auto_reminders ? 'Relances automatiques activées' : 'Relances automatiques désactivées',
        description: result.settings.auto_reminders
          ? 'Le scénario sera appliqué aux factures vérifiées et actives.'
          : 'Les prochaines relances automatiques sont suspendues. Un envoi déjà en cours peut encore aboutir.',
      })
    } catch (error) {
      setAutoReminders(savedAutoReminders)
      toast({ title: 'Réglages non enregistrés', description: error instanceof Error ? error.message : 'Réessayez.', variant: 'destructive' })
    } finally {
      setSavingNotif(false)
    }
  }

  const handleBillingPortal = async () => {
    if (!profile?.stripe_customer_id) {
      toast({
        title: 'Mes factures et mon abonnement',
        description: "Abonnez-vous d'abord à un plan payant.",
        variant: 'destructive',
      })
      return
    }
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: '/dashboard/settings' }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Portail indisponible')
      window.location.href = data.url
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'accéder au portail.", variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Chargement des paramètres…
      </div>
    )
  }

  if (loadError) return <div className="p-6 space-y-4"><p role="alert">Impossible de charger votre profil pour le moment.</p><Button onClick={() => window.location.reload()}>Réessayer</Button></div>

  const currentPlan = profile?.plan || 'free_trial'
  const trialEndsAt = profile?.trial_ends_at
  const isOnTrial = currentPlan === 'free_trial' && !!trialEndsAt
  const trialDaysLeft = isOnTrial
    ? Math.max(0, Math.ceil((new Date(trialEndsAt!).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div>
      <Header title="Paramètres" description="Gérez votre compte, abonnement et notifications" />

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Trial banner */}
        {isOnTrial && (
          <Alert className="border-amber-200 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Essai gratuit</strong> — il vous reste{' '}
              <strong>{trialDaysLeft} jour{trialDaysLeft !== 1 ? 's' : ''}</strong>. Passez à un plan
              payant pour ne pas interrompre vos relances.
            </AlertDescription>
          </Alert>
        )}

        {/* Current plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Abonnement</CardTitle>
                <CardDescription>Gérez votre plan et votre facturation</CardDescription>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${PLAN_COLORS[currentPlan]}`}>
                {PLAN_LABELS[currentPlan]}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPlan === 'starter' && !profile?.stripe_customer_id && !profile?.stripe_subscription_id && <p className="text-sm text-brand-800 rounded-lg bg-brand-50 p-3">Accès Fondateur accordé à ce compte pour les tests. Aucun prélèvement automatique n’est associé à cet accès.</p>}
            {profile?.subscription_status === 'trialing' && trialEndsAt && (
              <p className="text-sm text-brand-800 rounded-lg bg-brand-50 p-3">
                Essai en cours : premier prélèvement de {OFFER.price} €{PRICE_TAX} le{' '}
                {new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' }).format(new Date(trialEndsAt))}.
                Vous pouvez annuler sans frais d’ici là.
              </p>
            )}
            {/* Plan cards */}
            <div className="grid grid-cols-1 gap-3">
              {PLANS.map((plan) => {
                const Icon = plan.icon
                const isCurrent = currentPlan === plan.id
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl border-2 p-4 transition-all ${plan.border} ${isCurrent ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    {plan.recommended && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="bg-[#b9522d] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">Recommandé</span>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    <Icon className={`h-5 w-5 mb-2 ${plan.color}`} />
                    <div className="font-bold text-gray-900">{plan.name}</div>
                    <div className={`text-xl font-bold mt-1 ${plan.color}`}>{plan.price} €<span className="text-xs text-gray-400 font-normal">{PRICE_TAX}/mois</span></div>

                    <ul className="space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-gray-600 flex items-start gap-1">
                          <CheckCircle className="h-3 w-3 text-[#b9522d] mt-0.5 flex-shrink-0" aria-hidden="true" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && (
                      <div className="mt-4"><CheckoutButton /></div>
                    )}
                  </div>
                )
              })}
            </div>

            {profile?.stripe_customer_id && (
              <div className="space-y-2">
                <Button variant="outline" onClick={handleBillingPortal} className="w-full sm:w-auto">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Mes factures et mon abonnement
                  <ExternalLink className="ml-2 h-3.5 w-3.5 text-gray-400" />
                </Button>
                <p className="text-xs text-gray-500">
                  Sur l’espace sécurisé Stripe : téléchargez vos factures en PDF, changez de carte ou résiliez.
                </p>
              </div>
            )}
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
              Utilisées dans vos mises en demeure et emails de relance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="company_name">Raison sociale</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                  placeholder="Ma Société SARL"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siren">SIREN</Label>
                <Input
                  id="siren"
                  value={form.siren}
                  onChange={(e) => setForm((f) => ({ ...f, siren: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="01 23 45 67 89"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="15 rue de la République"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postal_code">Code postal</Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                  placeholder="75001"
                  maxLength={5}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Paris"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email_display">Email du compte</Label>
                <Input id="email_display" value={userEmail} disabled className="bg-gray-50 text-gray-500" />
                <p className="text-xs text-gray-400">Modifiable depuis votre fournisseur d&apos;authentification.</p>
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Sauvegarde…' : 'Sauvegarder les informations'}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications / Automation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Relances automatiques
            </CardTitle>
            <CardDescription>
              Encair peut envoyer vos relances automatiquement chaque matin selon votre scénario actif
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!capabilities?.emailAvailable && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{capabilities ? 'Le service email est en cours de configuration. Les envois sont indisponibles ; vous pouvez préparer les modèles et suivre vos règlements.' : 'Disponibilité du service email non vérifiée. Rechargez la page pour réessayer.'}</p>}
            <div className="flex items-center gap-4 rounded-xl border p-4">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                  autoReminders ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                {autoReminders ? (
                  <Bell className="h-5 w-5 text-green-600" />
                ) : (
                  <BellOff className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {!capabilities?.automationAvailable ? 'Automatisation indisponible' : savedAutoReminders ? 'Relances automatiques activées' : 'Relances automatiques désactivées'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {capabilities?.automationAvailable && savedAutoReminders
                    ? 'Envoi quotidien à 8h UTC (10h en été, 9h en hiver en France).'
                    : 'Préparez votre scénario et complétez les coordonnées de vos clients.'}
                </div>
              </div>
              <button
                role="switch"
                aria-label="Activer les relances automatiques"
                aria-checked={autoReminders}
                disabled={savingNotif || (!autoReminders && !capabilities?.automationAvailable)}
                onClick={() => setAutoReminders(!autoReminders)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  autoReminders ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    autoReminders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="rounded-lg border bg-brand-50 p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-brand-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-brand-700">
                Les relances utilisent votre nom d’entreprise. Les réponses sont adressées à l’email de votre compte.
              </p>
            </div>

            <Button onClick={handleSaveNotifications} disabled={savingNotif || autoReminders === savedAutoReminders || (autoReminders && !capabilities?.automationAvailable)} variant={autoReminders ? 'default' : 'outline'}>
              <Save className="mr-2 h-4 w-4" />
              {savingNotif ? 'Sauvegarde…' : 'Sauvegarder les préférences'}
            </Button>
          </CardContent>
        </Card>

        {/* Email sender config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Configuration de l&apos;expéditeur
            </CardTitle>
            <CardDescription>
              Le nom de votre entreprise sera utilisé comme expéditeur dans tous vos emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-gray-50 border p-3">
              <div className="text-xs text-gray-500 mb-1">Aperçu — ce que voit votre client :</div>
              <div className="font-mono text-sm text-gray-800">
                De : <strong>{profile?.company_name || 'Votre Entreprise'}</strong> via le domaine d’envoi configuré
              </div>
              <div className="font-mono text-sm text-gray-500">
                Répondre à : {userEmail || 'votre@email.fr'}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Le nom d&apos;expéditeur est automatiquement déduit de votre raison sociale. Sauvegardez vos informations entreprise ci-dessus pour le mettre à jour.
            </p>
          </CardContent>
        </Card>

        <AccountData accountEmail={userEmail || null} />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          Chargement des paramètres…
        </div>
      }
    >
      <SettingsPageInner />
    </Suspense>
  )
}
