'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle, AlertCircle, RefreshCw, Trash2, Plus, Copy,
  Eye, EyeOff, ExternalLink, Zap, Globe, Key, Clock, ArrowRight, Info,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Integration {
  id: string
  provider: string
  status: 'active' | 'error' | 'disconnected'
  last_sync_at: string | null
  last_sync_count: number
  last_error: string | null
  created_at: string
}

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
}

const CONNECTORS = [
  {
    id: 'pennylane',
    name: 'Pennylane',
    description: 'Synchronise automatiquement vos factures clients impayées depuis Pennylane.',
    logo: '🟣',
    color: 'from-purple-500 to-purple-700',
    available: true,
    authUrl: '/api/integrations/pennylane',
    docs: 'https://pennylane.readme.io',
  },
  {
    id: 'sage',
    name: 'Sage Business Cloud',
    description: 'Import automatique des factures depuis Sage Accounting (France & International).',
    logo: '🟢',
    color: 'from-green-500 to-green-700',
    available: false,
  },
  {
    id: 'ebp',
    name: 'EBP',
    description: 'Connexion native aux dossiers EBP Comptabilité et EBP Gestion commerciale.',
    logo: '🔵',
    color: 'from-blue-500 to-brand-700',
    available: false,
  },
  {
    id: 'cegid',
    name: 'Cegid',
    description: "Synchronisation avec Cegid Quadra Entreprise et Cegid Loop.",
    logo: '🔴',
    color: 'from-red-500 to-red-700',
    available: false,
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Importe en continu les factures impayées depuis QuickBooks Online.',
    logo: '🟤',
    color: 'from-emerald-500 to-emerald-700',
    available: false,
  },
]

function WaitlistButton({ name }: { name: string }) {
  const { toast } = useToast()
  return (
    <button
      onClick={() =>
        toast({ title: `Liste d'attente ${name}`, description: 'Nous vous notifierons dès que cette intégration sera disponible.' })
      }
      className="text-xs text-gray-400 hover:text-brand-600 underline underline-offset-2 transition-colors"
    >
      M&apos;avertir à la sortie
    </button>
  )
}

function IntegrationCard({ connector, integration, onSync, onDisconnect, syncing }: {
  connector: typeof CONNECTORS[0]
  integration?: Integration
  onSync: (provider: string) => void
  onDisconnect: (provider: string) => void
  syncing: boolean
}) {
  const isConnected = integration?.status === 'active'
  const hasError = integration?.status === 'error'

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${isConnected ? 'border-green-200' : hasError ? 'border-red-200' : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl bg-gradient-to-br ${connector.color} shadow-sm`}>
              {connector.logo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{connector.name}</p>
                {isConnected && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" /> Connecté
                  </span>
                )}
                {hasError && (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3 w-3" /> Erreur
                  </span>
                )}
                {!connector.available && !integration && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Bientôt</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{connector.description}</p>
            </div>
          </div>
        </div>

        {integration && (
          <div className="mb-3 rounded-lg bg-gray-50 border p-3 space-y-1">
            {integration.last_sync_at && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                Dernière synchro : {new Date(integration.last_sync_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {integration.last_sync_count > 0 && (
                  <span className="text-green-600 font-medium">· {integration.last_sync_count} factures</span>
                )}
              </div>
            )}
            {integration.last_error && (
              <p className="text-xs text-red-600 flex items-start gap-1">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {integration.last_error}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {!integration && connector.available && (
            <Button size="sm" asChild>
              <a href={connector.authUrl}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Connecter
              </a>
            </Button>
          )}
          {isConnected && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSync(connector.id)}
                disabled={syncing}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Synchroniser
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDisconnect(connector.id)}
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Déconnecter
              </Button>
            </>
          )}
          {hasError && connector.available && (
            <Button size="sm" variant="outline" className="border-red-200 text-red-700" asChild>
              <a href={connector.authUrl}>Reconnecter</a>
            </Button>
          )}
          {!connector.available && !integration && <WaitlistButton name={connector.name} />}
        </div>
      </div>
    </div>
  )
}

function IntegrationsPageInner() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [intRes, keysRes, profileRes] = await Promise.all([
        supabase.from('integrations').select('*').eq('user_id', user.id),
        fetch('/api/integrations/api-keys').then((r) => r.json()),
        supabase.from('profiles').select('webhook_secret').eq('id', user.id).single(),
      ])

      setIntegrations((intRes.data as Integration[]) || [])
      setApiKeys(keysRes.keys || [])
      setWebhookSecret((profileRes.data as any)?.webhook_secret || null)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Handle OAuth redirect callbacks
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) {
      toast({ title: `${connected} connecté !`, description: 'Synchronisation des factures en cours…' })
      loadData()
    }
    if (error) {
      const messages: Record<string, string> = {
        pennylane_denied:         'Connexion annulée.',
        pennylane_invalid:        'Paramètres OAuth invalides.',
        pennylane_state_mismatch: 'Session expirée, réessayez.',
        pennylane_token:          'Erreur lors de l\'échange du token.',
      }
      toast({ title: 'Erreur de connexion', description: messages[error] || error, variant: 'destructive' })
    }
  }, [searchParams, toast, loadData])

  const handleSync = async (provider: string) => {
    setSyncing(provider)
    try {
      const res = await fetch(`/api/integrations/${provider}/sync`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Synchronisation terminée', description: `${data.imported} factures importées, ${data.skipped} ignorées.` })
        loadData()
      } else {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' })
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Déconnecter ${provider} ? Les factures déjà importées seront conservées.`)) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('integrations').delete().eq('user_id', user.id).eq('provider', provider)
    toast({ title: `${provider} déconnecté` })
    loadData()
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const res = await fetch('/api/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setNewKeyValue(data.key)
        setNewKeyName('')
        loadData()
        toast({ title: 'Clé API créée', description: 'Copiez-la maintenant — elle ne sera plus affichée.' })
      } else {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' })
      }
    } finally {
      setCreatingKey(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Révoquer cette clé API ? Elle ne fonctionnera plus immédiatement.')) return
    const res = await fetch('/api/integrations/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast({ title: 'Clé révoquée' })
      loadData()
    }
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const webhookUrl = webhookSecret ? `${appUrl}/api/integrations/webhook?secret=${webhookSecret}` : ''

  return (
    <div>
      <Header title="Intégrations" description="Connectez vos logiciels comptables et outils tiers" />

      <div className="p-6 space-y-8 max-w-4xl">
        {/* Connectors */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Logiciels comptables</h2>
            <span className="text-xs text-gray-400">
              {integrations.filter((i) => i.status === 'active').length} connecté(s)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CONNECTORS.map((connector) => (
              <IntegrationCard
                key={connector.id}
                connector={connector}
                integration={integrations.find((i) => i.provider === connector.id)}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
                syncing={syncing === connector.id}
              />
            ))}
          </div>
        </div>

        {/* Webhook */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              Webhook universel
            </CardTitle>
            <CardDescription>
              Compatible <strong>Zapier</strong>, <strong>Make</strong>, <strong>n8n</strong> et tout outil HTTP. Créez une automatisation pour envoyer vos factures vers cette URL dès qu&apos;elles sont émises.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhookUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 min-w-0">
                    <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <code className="text-xs text-gray-700 truncate">{showSecret ? webhookUrl : webhookUrl.replace(/secret=.*/, 'secret=••••••••••••••••••')}</code>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowSecret((s) => !s)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(webhookUrl)
                    toast({ title: 'URL copiée !' })
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400">Méthode : <code className="bg-gray-100 px-1 rounded">POST</code> · Content-Type : <code className="bg-gray-100 px-1 rounded">application/json</code></p>
              </div>
            )}

            {/* Payload example */}
            <div className="rounded-lg bg-gray-900 p-4">
              <p className="text-xs text-gray-400 mb-2">Exemple de payload :</p>
              <pre className="text-xs text-green-400 overflow-x-auto">{`{
  "client_name":    "Acme Corp SARL",
  "client_email":   "compta@acme.fr",
  "invoice_number": "FA-2024-001",
  "amount":         1500.00,
  "due_date":       "2024-03-15",
  "issued_date":    "2024-02-15",
  "client_siren":   "123456789"
}`}</pre>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-200 p-3">
              <Info className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-700">
                Le webhook accepte aussi un tableau de factures <code className="bg-orange-100 px-1 rounded">[{'{'}...{'}'}, {'{'}...{'}'}]</code> jusqu&apos;à 100 par appel. Les doublons (même <code className="bg-orange-100 px-1 rounded">invoice_number</code>) sont ignorés automatiquement.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-gray-600" />
              Clés API
            </CardTitle>
            <CardDescription>
              Créez des clés pour intégrer RelanceFlow dans vos propres scripts ou outils internes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {newKeyValue && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Copiez cette clé maintenant</strong> — elle ne sera plus affichée.
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 text-xs bg-white border border-green-200 rounded px-2 py-1 break-all">{newKeyValue}</code>
                    <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => {
                      navigator.clipboard.writeText(newKeyValue)
                      toast({ title: 'Clé copiée !' })
                    }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Existing keys */}
            {apiKeys.length > 0 && (
              <div className="divide-y border rounded-lg overflow-hidden">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{k.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{k.key_prefix}••••••••••••••••••••</p>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {k.last_used_at
                        ? `Utilisée ${new Date(k.last_used_at).toLocaleDateString('fr-FR')}`
                        : 'Jamais utilisée'}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteKey(k.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* New key form */}
            {apiKeys.length < 5 && (
              <div className="flex gap-2">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Nom de la clé (ex : Script comptable)"
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateKey() }}
                />
                <Button onClick={handleCreateKey} disabled={creatingKey || !newKeyName.trim()}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {creatingKey ? 'Création…' : 'Créer'}
                </Button>
              </div>
            )}

            <div className="rounded-lg bg-gray-50 border p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Utilisation dans vos requêtes :</p>
              <pre className="text-xs text-gray-700 overflow-x-auto">{`curl -X POST ${appUrl}/api/integrations/webhook?secret=VOTRE_WEBHOOK_SECRET \\
  -H "Content-Type: application/json" \\
  -d '{"client_name":"Acme","client_email":"a@b.fr","invoice_number":"001","amount":500,"due_date":"2024-03-15"}'`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="flex-1 p-8 animate-pulse bg-gray-50" />}>
      <IntegrationsPageInner />
    </Suspense>
  )
}
