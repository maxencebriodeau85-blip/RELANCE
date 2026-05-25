'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, Phone, Mail, Building2, Tag, Trash2,
  Search, X, TrendingUp, CheckCircle2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PipelineStage = 'prospect' | 'qualified' | 'proposal' | 'signed' | 'lost'

interface Contact {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  tags: string[]
  pipeline_stage: PipelineStage
  deal_amount: number | null
  created_at: string
  updated_at: string
}

const STAGES: {
  key: PipelineStage
  label: string
  color: string
  bg: string
  border: string
  accent: string
}[] = [
  { key: 'prospect',  label: 'Prospect',    color: 'text-blue-700',   bg: 'bg-blue-50/60',   border: 'border-blue-200',   accent: 'bg-blue-500' },
  { key: 'qualified', label: 'Qualifié',    color: 'text-violet-700', bg: 'bg-violet-50/60', border: 'border-violet-200', accent: 'bg-violet-500' },
  { key: 'proposal',  label: 'Proposition', color: 'text-amber-700',  bg: 'bg-amber-50/60',  border: 'border-amber-200',  accent: 'bg-amber-500' },
  { key: 'signed',    label: 'Signé',       color: 'text-green-700',  bg: 'bg-green-50/60',  border: 'border-green-200',  accent: 'bg-green-500' },
  { key: 'lost',      label: 'Perdu',       color: 'text-gray-500',   bg: 'bg-gray-50/60',   border: 'border-gray-200',   accent: 'bg-gray-400' },
]

const EMPTY_FORM = {
  name: '', company: '', email: '', phone: '',
  deal_amount: '', tags: '', pipeline_stage: 'prospect' as PipelineStage,
}

function fmt(n: number | null) {
  if (!n) return null
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function initials(name: string) {
  return name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function stageTotal(contacts: Contact[]) {
  return contacts.reduce((s, c) => s + (c.deal_amount || 0), 0)
}

export default function PipelinePage() {
  const [byStage, setByStage] = useState<Record<PipelineStage, Contact[]>>({
    prospect: [], qualified: [], proposal: [], signed: [], lost: [],
  })
  const [loading, setLoading] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<PipelineStage | null>(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/contacts')
    if (!res.ok) return
    const { contacts } = await res.json()
    const grouped: Record<PipelineStage, Contact[]> = {
      prospect: [], qualified: [], proposal: [], signed: [], lost: [],
    }
    for (const c of contacts || []) {
      grouped[c.pipeline_stage as PipelineStage]?.push(c)
    }
    setByStage(grouped)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Drag handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(stage)
  }

  const onDrop = async (e: React.DragEvent, target: PipelineStage) => {
    e.preventDefault()
    if (!draggedId) return

    let moved: Contact | null = null
    let from: PipelineStage | null = null
    for (const [s, cards] of Object.entries(byStage)) {
      const found = cards.find(c => c.id === draggedId)
      if (found) { moved = found; from = s as PipelineStage; break }
    }

    setDraggedId(null)
    setDragOver(null)

    if (!moved || from === target) return

    // Optimistic
    setByStage(prev => {
      const next = { ...prev }
      next[from!] = next[from!].filter(c => c.id !== draggedId)
      next[target] = [{ ...moved!, pipeline_stage: target }, ...next[target]]
      return next
    })

    await fetch(`/api/contacts/${draggedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: target }),
    })
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { setFormErr('Le nom est requis'); return }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormErr('Email invalide')
      return
    }
    if (form.deal_amount && parseFloat(form.deal_amount) <= 0) {
      setFormErr('Le montant doit être supérieur à 0')
      return
    }
    setSaving(true)
    setFormErr('')
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        deal_amount: form.deal_amount ? parseFloat(form.deal_amount) : null,
        tags,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const { error } = await res.json()
      setFormErr(error || 'Erreur')
      return
    }
    setShowAdd(false)
    setForm(EMPTY_FORM)
    load()
  }

  const handleDelete = async (id: string, stage: PipelineStage) => {
    if (!confirm('Supprimer ce contact définitivement ?')) return
    setByStage(prev => ({ ...prev, [stage]: prev[stage].filter(c => c.id !== id) }))
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
  }

  // Stats
  const totalContacts = Object.values(byStage).flat().length
  const pipelineValue = Object.entries(byStage)
    .filter(([s]) => s !== 'lost')
    .reduce((sum, [, cs]) => sum + stageTotal(cs), 0)
  const signedValue = stageTotal(byStage.signed)

  const filteredByStage = (stage: PipelineStage) => {
    if (!search) return byStage[stage]
    const q = search.toLowerCase()
    return byStage[stage].filter(
      c => c.name.toLowerCase().includes(q) ||
           c.company?.toLowerCase().includes(q) ||
           c.email?.toLowerCase().includes(q)
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalContacts} contact{totalContacts > 1 ? 's' : ''} · {fmt(pipelineValue)} en cours
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-48 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => { setShowAdd(true); setFormErr('') }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-3 flex gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span className="font-semibold text-gray-900">{fmt(signedValue) || '0 €'}</span>
            <span>signés</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-semibold text-gray-900">{byStage.signed.length}</span>
            <span>deals closés</span>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-3 p-4 min-w-max">
          {STAGES.map(stage => {
            const cards = filteredByStage(stage.key)
            const total = stageTotal(byStage[stage.key])
            const isOver = dragOver === stage.key

            return (
              <div
                key={stage.key}
                className={cn(
                  'flex flex-col w-72 rounded-xl border transition-colors',
                  stage.bg, stage.border,
                  isOver && 'ring-2 ring-blue-400 ring-offset-1'
                )}
                onDragOver={e => onDragOver(e, stage.key)}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => onDrop(e, stage.key)}
              >
                {/* Column header */}
                <div className="flex-shrink-0 px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full', stage.accent)} />
                      <span className={cn('text-xs font-semibold uppercase tracking-wide', stage.color)}>
                        {stage.label}
                      </span>
                      <span className={cn(
                        'flex h-5 min-w-[20px] items-center justify-center rounded-full text-xs font-semibold px-1.5',
                        stage.color, 'bg-white/70'
                      )}>
                        {byStage[stage.key].length}
                      </span>
                    </div>
                    <button
                      onClick={() => { setForm({ ...EMPTY_FORM, pipeline_stage: stage.key }); setShowAdd(true); setFormErr('') }}
                      className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {total > 0 && (
                    <p className="text-xs text-gray-500 font-medium">{fmt(total)}</p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[120px]">
                  {loading ? (
                    <div className="space-y-2 px-1">
                      {[1,2].map(i => (
                        <div key={i} className="h-20 rounded-lg bg-white/60 animate-pulse" />
                      ))}
                    </div>
                  ) : cards.length === 0 ? (
                    <div className={cn(
                      'flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs text-gray-400',
                      isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                    )}>
                      {isOver ? 'Déposer ici' : 'Glisser une carte ici'}
                    </div>
                  ) : (
                    cards.map(contact => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        isDragging={draggedId === contact.id}
                        onDragStart={onDragStart}
                        onDelete={() => handleDelete(contact.id, stage.key)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Nouveau contact</h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1 hover:bg-gray-100 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700">Nom *</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jean Martin"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Entreprise</label>
                  <input
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Acme Corp"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Montant du deal</label>
                  <input
                    type="number"
                    value={form.deal_amount}
                    onChange={e => setForm(f => ({ ...f, deal_amount: e.target.value }))}
                    placeholder="5000"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jean@acme.fr"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Téléphone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="06 12 34 56 78"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700">Étape</label>
                  <select
                    value={form.pipeline_stage}
                    onChange={e => setForm(f => ({ ...f, pipeline_stage: e.target.value as PipelineStage }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-700">Tags (séparés par virgule)</label>
                  <input
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="consultant, urgent, freelance"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {formErr && <p className="text-xs text-red-500">{formErr}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                {saving ? 'Création...' : 'Créer le contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactCard({
  contact,
  isDragging,
  onDragStart,
  onDelete,
}: {
  contact: Contact
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onDelete: () => void
}) {
  const [menu, setMenu] = useState(false)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, contact.id)}
      onDragEnd={() => {}}
      className={cn(
        'group relative rounded-xl bg-white border border-gray-100 p-3 shadow-sm cursor-grab active:cursor-grabbing select-none transition-all',
        isDragging ? 'opacity-40 scale-95 shadow-none' : 'hover:shadow-md hover:border-gray-200'
      )}
    >
      {/* Menu button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={e => { e.preventDefault(); setMenu(m => !m) }}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400"
          >
            <span className="text-lg leading-none">···</span>
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-36 rounded-xl bg-white shadow-lg border border-gray-100 py-1">
                <Link
                  href={`/dashboard/contacts/${contact.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenu(false)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Ouvrir la fiche
                </Link>
                <button
                  onClick={() => { setMenu(false); onDelete() }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card content */}
      <Link href={`/dashboard/contacts/${contact.id}`} className="block">
        <div className="flex items-start gap-2.5 mb-2 pr-6">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-bold">
            {initials(contact.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{contact.name}</p>
            {contact.company && (
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5" />
                {contact.company}
              </p>
            )}
          </div>
        </div>

        {contact.deal_amount && (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
              {fmt(contact.deal_amount)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {contact.tags.slice(0, 3).map(tag => (
            <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          {contact.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
            </span>
          )}
          <span className="ml-auto">
            {formatDistanceToNow(new Date(contact.updated_at), { addSuffix: true, locale: fr })}
          </span>
        </div>
      </Link>
    </div>
  )
}
