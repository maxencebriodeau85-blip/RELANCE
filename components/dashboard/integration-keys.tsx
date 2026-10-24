'use client'
import { useCallback, useEffect, useState } from 'react'
type Key = {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  expires_at: string
  revoked_at: string | null
}
export function IntegrationKeys() {
  const [keys, setKeys] = useState<Key[]>([]),
    [name, setName] = useState(''),
    [write, setWrite] = useState(false),
    [token, setToken] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [hasMore, setHasMore] = useState(false)
  const load = useCallback(async (append = false, offset = 0) => {
    const r = await fetch(
      `/api/integrations/keys${append ? `?offset=${offset}` : ''}`,
      { cache: 'no-store' },
    )
    const b = await r.json()
    if (!r.ok) throw Error('Impossible de charger les clés.')
    if (!Array.isArray(b.keys)) throw Error('Réponse des clés invalide.')
    setKeys((previous) =>
      append
        ? [
            ...previous,
            ...b.keys.filter(
              (key: Key) => !previous.some((p) => p.id === key.id),
            ),
          ]
        : b.keys,
    )
    setHasMore(Boolean(b.hasMore))
    setLoaded(true)
  }, [])
  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [load])
  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setToken('')
    try {
      const r = await fetch('/api/integrations/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          scopes: write
            ? ['invoices:read', 'invoices:write']
            : ['invoices:read'],
        }),
      })
      const b = await r.json()
      if (!r.ok)
        throw Error(
          typeof b.error === 'string' ? b.error : 'Création impossible.',
        )
      setToken(b.token)
      setName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Service indisponible.')
    } finally {
      setBusy(false)
    }
  }
  async function revoke(id: string) {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/integrations/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!r.ok) throw Error('Révocation non confirmée.')
      setToken('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Service indisponible.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="text-lg font-semibold">Clés de connexion</h2>
      <p className="text-sm text-gray-600">
        Une clé donne accès aux factures de votre compte. Confiez-la uniquement
        à votre logiciel ou à votre développeur. Elle expire après un an et peut
        être révoquée ici.
      </p>
      {error && (
        <div role="alert" className="text-red-700">
          {error}{' '}
          <button
            className="underline"
            onClick={() =>
              load()
                .then(() => setError(''))
                .catch((e) => setError(e.message))
            }
          >
            Réessayer
          </button>
        </div>
      )}
      <form onSubmit={create} className="space-y-3">
        <label className="block">
          Nom du logiciel
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded border p-2 mt-1"
            placeholder="Mon logiciel de facturation"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={write}
            onChange={(e) => setWrite(e.target.checked)}
          />
          Autoriser aussi l’import et l’actualisation des soldes
        </label>
        <button
          disabled={busy}
          className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Traitement…' : 'Créer une clé'}
        </button>
      </form>
      {token && (
        <div
          role="status"
          className="rounded border border-amber-300 bg-amber-50 p-3"
        >
          <p>
            Copiez cette clé maintenant. Elle ne sera plus affichée après
            fermeture.
          </p>
          <code className="block break-all select-all py-3">{token}</code>
          <button className="underline" onClick={() => setToken('')}>
            Masquer la clé
          </button>
        </div>
      )}
      {!loaded && !error && <p>Chargement…</p>}
      {loaded && !keys.length && <p>Aucune clé créée.</p>}
      <ul className="space-y-3">
        {keys.map((k) => (
          <li
            key={k.id}
            className="border-t pt-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-medium break-all">{k.name}</p>
              <p className="text-sm text-gray-600">
                {k.key_prefix}… ·{' '}
                {k.scopes.includes('invoices:write')
                  ? 'Lecture et écriture'
                  : 'Lecture seule'}
              </p>
              <p className="text-sm">
                {k.revoked_at
                  ? 'Révoquée'
                  : `Expiration : ${new Date(k.expires_at).toLocaleDateString('fr-FR')}`}
              </p>
            </div>
            {!k.revoked_at && (
              <button
                disabled={busy}
                onClick={() => revoke(k.id)}
                className="text-red-700 underline disabled:opacity-50"
              >
                Révoquer
              </button>
            )}
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          disabled={busy}
          className="underline"
          onClick={() => {
            setBusy(true)
            load(true, keys.length)
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false))
          }}
        >
          Afficher davantage de clés
        </button>
      )}
    </section>
  )
}
