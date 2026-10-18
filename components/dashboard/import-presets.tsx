'use client'
import { useEffect, useState } from 'react'
import type { ColumnMapping } from '@/lib/csv-parser'
import {
  cleanMapping,
  compatiblePreset,
  importPresetSchema,
  type ImportPreset,
} from '@/lib/import-presets'
export function ImportPresets({
  headers,
  mapping,
  onApply,
}: {
  headers: string[]
  mapping: Partial<ColumnMapping>
  onApply: (mapping: Partial<ColumnMapping>) => void
}) {
  const [presets, setPresets] = useState<ImportPreset[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selection, setSelection] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/invoices/import/presets', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw Error(data.error || 'Chargement impossible.')
        setPresets(
          (data.presets || []).filter(
            (p: unknown) => importPresetSchema.safeParse(p).success,
          ),
        )
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e.message || 'Formats indisponibles.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])
  async function save(remove = false) {
    setError('')
    setMessage('')
    const payload = importPresetSchema.safeParse({
      name,
      headers,
      mapping: cleanMapping(mapping),
    })
    if (!remove && !payload.success) {
      setError(
        'Renseignez le nom du logiciel et associez les quatre champs obligatoires à des colonnes distinctes.',
      )
      return
    }
    if (remove && !selection) return
    setBusy(true)
    try {
      const response = await fetch('/api/invoices/import/presets', {
        method: remove ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          remove ? { name: selection } : payload.success ? payload.data : null,
        ),
      })
      const data = await response.json()
      if (!response.ok) throw Error(data.error || 'Enregistrement impossible.')
      if (remove) {
        setPresets((items) => items.filter((p) => p.name !== selection))
        setSelection('')
        setName('')
        setMessage('Format supprimé.')
      } else {
        setPresets((items) =>
          [
            ...items.filter((p) => p.name !== data.preset.name),
            data.preset,
          ].sort((a, b) => a.name.localeCompare(b.name)),
        )
        setSelection(data.preset.name)
        setName(data.preset.name)
        setMessage(
          'Format enregistré dans votre compte. Vous pourrez le réutiliser au prochain import.',
        )
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Enregistrement impossible. Réessayez.',
      )
    } finally {
      setBusy(false)
    }
  }
  const replaces = presets.some((p) => p.name === name.trim())
  return (
    <section
      className="space-y-3 rounded-xl border bg-brand-50 p-4"
      aria-label="Formats d’import enregistrés"
    >
      <h3 className="font-medium">Retrouver les colonnes de mon logiciel</h3>
      <p className="text-sm text-gray-600">
        Enregistrez la correspondance puis choisissez votre logiciel au prochain
        import. Les formats sont partagés entre vos appareils. Vérifiez toujours
        l’aperçu avant de valider.
      </p>
      <label className="block text-sm">
        Format enregistré
        <select
          aria-label="Format enregistré"
          className="mt-1 block w-full rounded border bg-white p-2"
          disabled={busy || loading}
          value={selection}
          onChange={(event) => {
            const selected = presets.find((p) => p.name === event.target.value)
            setSelection(event.target.value)
            setName(selected?.name || '')
            setError('')
            setMessage('')
            if (!selected) return
            if (!compatiblePreset(selected, headers)) {
              setError(
                'Les colonnes de ce fichier ont changé. Le format n’a pas été appliqué : vérifiez la correspondance puis enregistrez sa nouvelle version.',
              )
              return
            }
            onApply(selected.mapping)
            setMessage(
              `Format « ${selected.name} » appliqué. Vérifiez les colonnes et les montants dans l’aperçu.`,
            )
          }}
        >
          <option value="">
            {loading ? 'Chargement…' : 'Choisir un format'}
          </option>
          {presets.map((p) => (
            <option value={p.name} key={p.name}>
              {p.name}
              {compatiblePreset(p, headers) ? '' : ' — colonnes différentes'}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-0 text-sm sm:min-w-48 sm:flex-1">
          Nom du logiciel ou du format
          <input
            aria-label="Nom du logiciel ou du format"
            value={name}
            maxLength={80}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. : export mensuel EBP"
            className="mt-1 block w-full rounded border p-2"
          />
        </label>
        <button
          type="button"
          disabled={busy || loading || !name.trim()}
          onClick={() => save()}
          className="rf-button rf-button-dark disabled:opacity-50"
        >
          {busy
            ? 'En cours…'
            : replaces
              ? 'Remplacer ce format'
              : 'Enregistrer le format'}
        </button>
        {selection && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Supprimer le format « ${selection} » ?`))
                void save(true)
            }}
            className="rf-button border"
          >
            Supprimer
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-brand-800">
          {message}
        </p>
      )}
    </section>
  )
}
