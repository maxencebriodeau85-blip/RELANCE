'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft, Phone, Mail, Building2, Tag,
  Edit3, Check, X, Plus, Trash2, FileText,
  PhoneCall, MessageSquare, Users, Calendar,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PipelineStage = 'prospect' | 'qualified' | 'proposal' | 'signed' | 'lost'
type JournalType = 'call' | 'email' | 'note' | 'meeting'

interface Contact {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  tags: string[]
  pipeline_stage: PipelineStage
  deal_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface JournalEntry {
  id: string
  type: JournalType
  content: string
  duration_minutes: number | null
  occurred_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  status: string
  due_date: string
  issued_date: string
}

const STAGES: { key: PipelineStage; label: string; color: string; dot: string }[] = [
  { key: 'prospect',  label: 'Prospect',    color: 'text-blue-600',   dot: 'bg-blue-500' },
  { key: 'qualified', label: 'Qualifié',    color: 'text-violet-600', dot: 'bg-violet-500' },
  { key: 'proposal',  label: 'Proposition', color: 'text-amber-600',  dot: 'bg-amber-500' },
  { key: 'signed',    label: 'Signé',       color: 'text-green-600',  dot: 'bg-green-500' },
  { key: 'lost',      label: 'Perdu',       color: 'text-gray-500',   dot: 'bg-gray-400' },
]

const JOURNAL_TYPES: { key: JournalType; label: string; icon: typeof PhoneCall; color: string }[] = [
  { key: 'call',    label: 'Appel',    icon: PhoneCall,      color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'email',   label: 'Email',    icon: Mail,           color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { key: 'note',    label: 'Note',     icon: MessageSquare,  color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { key: 'meeting', label: 'Réunion',  icon: Users,          color: 'text-amber-600 bg-amber-50 border-amber-200' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:       { label: 'En attente',  color: 'text-amber-700 bg-amber-50' },
  reminded:      { label: 'Relancée',    color: 'text-blue-700 bg-blue-50' },
  formal_notice: { label: 'Mise en demeure', color: 'text-red-700 bg-red-50' },
  paid:          { label: 'Payée',       color: 'text-green-700 bg-green-50' },
  disputed:      { label: 'Litige',      color: 'text-gray-700 bg-gray-100' },
}

function fmt(n: number | null) {
  if (!n) return null
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function initials(name: string) {
  return name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [contact, setContact] = useState<Contact | null>(null)
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'journal' | 'invoices'>('journal')

  // Edit state
  const [editField, setEditField] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [savingField, setSavingField] = useState(false)

  // Journal add
  const [jType, setJType] = useState<JournalType>('call')
  const [jContent, setJContent] = useState('')
  const [jDuration, setJDuration] = useState('')
  const [jSaving, setJSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/contacts/${id}`)
    if (!res.ok) { router.push('/dashboard/pipeline'); return }
    const data = await res.json()
    setContact(data.contact)
    setJournal(data.journal || [])
    setInvoices(data.invoices || [])
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  const saveField = async (field: string, value: unknown) => {
    if (field === 'name' && (!value || !(value as string).trim())) return
    setSavingField(true)
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      const { contact: updated } = await res.json()
      setContact(updated)
    }
    setSavingField(false)
    setEditField(null)
  }

  const changeStage = async (stage: PipelineStage) => {
    if (!contact || contact.pipeline_stage === stage) return
    setContact(c => c ? { ...c, pipeline_stage: stage } : null)
    await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: stage }),
    })
  }

  const addJournal = async () => {
    if (!jContent.trim()) return
    setJSaving(true)
    const res = await fetch(`/api/contacts/${id}/journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: jType,
        content: jContent,
        duration_minutes: jType === 'call' && jDuration ? parseInt(jDuration) : null,
      }),
    })
    if (res.ok) {
      const { entry } = await res.json()
      setJournal(j => [entry, ...j])
      setJContent('')
      setJDuration('')
    }
    setJSaving(false)
  }

  const deleteJournal = async (entryId: string) => {
    if (!confirm('Supprimer cette entrée ?')) return
    setJournal(j => j.filter(e => e.id !== entryId))
    await fetch(`/api/contacts/${id}/journal`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId }),
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!contact) return null

  const stageIdx = STAGES.findIndex(s => s.key === contact.pipeline_stage)
  const currentStage = STAGES[stageIdx]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-16">
      {/* Back */}
      <Link
        href="/dashboard/pipeline"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Pipeline
      </Link>

      {/* Contact header card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xl font-bold">
            {initials(contact.name)}
          </div>
          <div className="flex-1 min-w-0">
            {/* Name */}
            {editField === 'name' ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveField('name', editVal); if (e.key === 'Escape') setEditField(null) }}
                  className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent focus:outline-none w-full"
                />
                <button onClick={() => saveField('name', editVal)} disabled={savingField} className="text-green-600 hover:text-green-700">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditField(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditField('name'); setEditVal(contact.name) }}
                className="group flex items-center gap-1.5 text-left"
              >
                <h1 className="text-xl font-bold text-gray-900">{contact.name}</h1>
                <Edit3 className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            {/* Company */}
            {editField === 'company' ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveField('company', editVal); if (e.key === 'Escape') setEditField(null) }}
                  placeholder="Nom de l'entreprise"
                  className="text-sm text-gray-600 border-b border-blue-500 bg-transparent focus:outline-none"
                />
                <button onClick={() => saveField('company', editVal)} className="text-green-600">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setEditField(null)} className="text-gray-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditField('company'); setEditVal(contact.company || '') }}
                className="group flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>{contact.company || 'Ajouter une entreprise'}</span>
                <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Deal amount */}
          <div className="text-right">
            {editField === 'deal_amount' ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveField('deal_amount', parseFloat(editVal) || null); if (e.key === 'Escape') setEditField(null) }}
                  placeholder="0"
                  className="w-24 text-right border-b border-blue-500 bg-transparent focus:outline-none text-lg font-bold"
                />
                <button onClick={() => saveField('deal_amount', parseFloat(editVal) || null)} className="text-green-600">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditField(null)} className="text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditField('deal_amount'); setEditVal(String(contact.deal_amount || '')) }}
                className="group text-right"
              >
                <div className="flex items-center gap-1 justify-end">
                  <p className="text-lg font-bold text-gray-900">{fmt(contact.deal_amount) || '—'}</p>
                  <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                </div>
                <p className="text-xs text-gray-500">valeur du deal</p>
              </button>
            )}
          </div>
        </div>

        {/* Contact info row */}
        <div className="mt-4 flex flex-wrap gap-4">
          <EditableField
            icon={<Mail className="h-3.5 w-3.5" />}
            value={contact.email}
            placeholder="Email"
            isEditing={editField === 'email'}
            onEdit={() => { setEditField('email'); setEditVal(contact.email || '') }}
            editVal={editVal}
            onEditVal={setEditVal}
            onSave={() => saveField('email', editVal)}
            onCancel={() => setEditField(null)}
            type="email"
          />
          <EditableField
            icon={<Phone className="h-3.5 w-3.5" />}
            value={contact.phone}
            placeholder="Téléphone"
            isEditing={editField === 'phone'}
            onEdit={() => { setEditField('phone'); setEditVal(contact.phone || '') }}
            editVal={editVal}
            onEditVal={setEditVal}
            onSave={() => saveField('phone', editVal)}
            onCancel={() => setEditField(null)}
          />
        </div>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-gray-400" />
          {contact.tags.map(tag => (
            <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {tag}
            </span>
          ))}
          {contact.tags.length === 0 && (
            <span className="text-xs text-gray-400">Aucun tag</span>
          )}
        </div>
      </div>

      {/* Pipeline stage selector */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Étape du pipeline</p>
        <div className="flex items-center gap-1">
          {STAGES.map((stage, idx) => {
            const isActive = contact.pipeline_stage === stage.key
            const isPast = idx < stageIdx && contact.pipeline_stage !== 'lost'
            return (
              <button
                key={stage.key}
                onClick={() => changeStage(stage.key)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 rounded-xl p-2 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-gray-900 text-white shadow-sm'
                    : isPast
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : 'hover:bg-gray-50 text-gray-500 hover:text-gray-700'
                )}
              >
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  isActive ? 'bg-white' : isPast ? 'bg-gray-400' : stage.dot
                )} />
                <span className="hidden sm:block leading-tight text-center">{stage.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-4">
        <button
          onClick={() => setTab('journal')}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            tab === 'journal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Journal ({journal.length})
        </button>
        <button
          onClick={() => setTab('invoices')}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
            tab === 'invoices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Factures ({invoices.length})
        </button>
      </div>

      {/* Journal tab */}
      {tab === 'journal' && (
        <div className="space-y-4">
          {/* Last activity indicator */}
          {journal.length > 0 && (() => {
            const last = journal.reduce((a, b) => a.occurred_at > b.occurred_at ? a : b)
            const jt = JOURNAL_TYPES.find(t => t.key === last.type)!
            return (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${jt.color}`}>
                  {jt.label}
                </span>
                <span>Dernière activité :</span>
                <span className="text-gray-600 font-medium">
                  {formatDistanceToNow(new Date(last.occurred_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
            )
          })()}

          {/* Add entry form */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex gap-2 mb-3">
              {JOURNAL_TYPES.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.key}
                    onClick={() => setJType(t.key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      jType === t.key ? t.color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                )
              })}
            </div>
            <textarea
              value={jContent}
              onChange={e => setJContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) addJournal() }}
              placeholder={
                jType === 'call' ? 'Ex: Intéressé, rappeler après le 20 — budget ok' :
                jType === 'email' ? 'Ex: Envoi proposition détaillée avec pricing' :
                jType === 'meeting' ? 'Ex: RDV visio 30min — bonne dynamique, dépêcher démo' :
                'Note libre...'
              }
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
            {jType === 'call' && (
              <div className="mt-2 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <input
                  type="number"
                  value={jDuration}
                  onChange={e => setJDuration(e.target.value)}
                  placeholder="Durée (min)"
                  className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={addJournal}
                disabled={!jContent.trim() || jSaving}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-3.5 py-1.5 text-sm font-medium text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {jSaving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>

          {/* Journal entries */}
          {journal.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune activité enregistrée</p>
              <p className="text-xs text-gray-400 mt-1">Loguez votre premier appel ou note ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-2">
              {journal.map(entry => {
                const jt = JOURNAL_TYPES.find(t => t.key === entry.type)!
                const Icon = jt.icon
                return (
                  <div key={entry.id} className="group rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-xs', jt.color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs font-semibold', jt.color.split(' ')[0])}>{jt.label}</span>
                          {entry.duration_minutes && (
                            <span className="text-xs text-gray-400">{entry.duration_minutes} min</span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">
                            {format(new Date(entry.occurred_at), 'dd MMM yyyy · HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                      </div>
                      <button
                        onClick={() => deleteJournal(entry.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 ml-1 flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Invoices tab */}
      {tab === 'invoices' && (
        <div className="space-y-3">
          <Link
            href={`/dashboard/invoices/new?contact=${contact.id}&name=${encodeURIComponent(contact.name)}&email=${encodeURIComponent(contact.email || '')}&amount=${contact.deal_amount || ''}`}
            className="flex items-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Créer une facture pour {contact.name}
          </Link>

          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune facture liée</p>
            </div>
          ) : (
            invoices.map(inv => {
              const status = STATUS_LABELS[inv.status] || { label: inv.status, color: 'text-gray-700 bg-gray-100' }
              return (
                <Link
                  key={inv.id}
                  href={`/dashboard/invoices/${inv.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">
                      Échéance {format(new Date(inv.due_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(inv.amount)}
                    </p>
                    <span className={cn('text-xs font-medium rounded-full px-2 py-0.5', status.color)}>
                      {status.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function EditableField({
  icon, value, placeholder, isEditing, onEdit, editVal, onEditVal, onSave, onCancel, type = 'text',
}: {
  icon: React.ReactNode
  value: string | null
  placeholder: string
  isEditing: boolean
  onEdit: () => void
  editVal: string
  onEditVal: (v: string) => void
  onSave: () => void
  onCancel: () => void
  type?: string
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        {icon}
        <input
          autoFocus
          type={type}
          value={editVal}
          onChange={e => onEditVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
          className="border-b border-blue-500 bg-transparent text-sm focus:outline-none w-40"
        />
        <button onClick={onSave} className="text-green-600">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={onCancel} className="text-gray-400">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
  return (
    <button onClick={onEdit} className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
      {icon}
      <span>{value || <span className="text-gray-300">{placeholder}</span>}</span>
      <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
