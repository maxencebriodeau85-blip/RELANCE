'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, FileText, Kanban, BarChart3, Bell, Settings, Plus, Upload,
  AlertTriangle, Mail, Plug, ArrowRight, Zap,
} from 'lucide-react'

interface Action {
  id: string
  label: string
  hint?: string
  icon: typeof Search
  shortcut?: string
  run: (router: ReturnType<typeof useRouter>) => void
  keywords?: string[]
}

const ACTIONS: Action[] = [
  { id: 'go-dashboard', label: 'Tableau de bord', icon: BarChart3, shortcut: 'g d', run: (r) => r.push('/dashboard'), keywords: ['home', 'accueil', 'kpi'] },
  { id: 'go-invoices', label: 'Factures', icon: FileText, shortcut: 'g i', run: (r) => r.push('/dashboard/invoices'), keywords: ['invoice', 'facturation'] },
  { id: 'go-pipeline', label: 'Pipeline', icon: Kanban, shortcut: 'g p', run: (r) => r.push('/dashboard/pipeline'), keywords: ['crm', 'kanban', 'deals'] },
  { id: 'go-scenarios', label: 'Scénarios de relance', icon: Bell, shortcut: 'g s', run: (r) => r.push('/dashboard/scenarios'), keywords: ['rules', 'automation'] },
  { id: 'go-templates', label: 'Templates email', icon: Mail, shortcut: 'g t', run: (r) => r.push('/dashboard/templates'), keywords: ['emails', 'modèles'] },
  { id: 'go-stats', label: 'Statistiques', icon: BarChart3, shortcut: 'g a', run: (r) => r.push('/dashboard/stats'), keywords: ['analytics', 'graphiques'] },
  { id: 'go-formal', label: 'Mises en demeure', icon: AlertTriangle, shortcut: 'g m', run: (r) => r.push('/dashboard/mise-en-demeure'), keywords: ['legal', 'contentieux'] },
  { id: 'go-integrations', label: 'Intégrations', icon: Plug, run: (r) => r.push('/dashboard/integrations'), keywords: ['api', 'webhook', 'pennylane'] },
  { id: 'go-settings', label: 'Paramètres', icon: Settings, shortcut: 'g ,', run: (r) => r.push('/dashboard/settings'), keywords: ['compte', 'plan', 'billing'] },
  { id: 'new-invoice', label: 'Nouvelle facture', hint: 'Créer une facture', icon: Plus, shortcut: 'n', run: (r) => r.push('/dashboard/invoices/new'), keywords: ['create', 'add'] },
  { id: 'import-csv', label: 'Importer un CSV de factures', icon: Upload, run: (r) => r.push('/dashboard/invoices/import'), keywords: ['bulk', 'csv'] },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  // Toggle on Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        setActive(0)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ACTIONS
    return ACTIONS.filter((a) => {
      const hay = [a.label, a.hint, ...(a.keywords ?? [])].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [query])

  // Reset active when filtered changes
  useEffect(() => { setActive(0) }, [query])

  if (!open) return null

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const a = filtered[active]
      if (a) {
        setOpen(false)
        a.run(router)
      }
    }
  }

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
      className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100"
           onKeyDown={onListKey}>
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Aller à… ou tapez une action"
            className="flex-1 h-12 outline-none text-sm placeholder:text-gray-400"
          />
          <kbd className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Aucun résultat pour « {query} »
            </p>
          ) : (
            filtered.map((a, i) => {
              const Icon = a.icon
              const isActive = i === active
              return (
                <button
                  key={a.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { setOpen(false); a.run(router) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-900' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                  <span className="flex-1">
                    {a.label}
                    {a.hint && <span className="text-xs text-gray-400 ml-2">{a.hint}</span>}
                  </span>
                  {a.shortcut && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-mono">
                      {a.shortcut.split(' ').map((k, j) => (
                        <kbd key={j} className="bg-gray-100 px-1.5 py-0.5 rounded">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  )}
                  {isActive && <ArrowRight className="h-3 w-3 text-brand-500" />}
                </button>
              )
            })
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between text-[10px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            RelanceFlow
          </span>
          <span className="flex items-center gap-3">
            <span><kbd className="bg-gray-100 px-1 rounded font-mono">↑↓</kbd> naviguer</span>
            <span><kbd className="bg-gray-100 px-1 rounded font-mono">↵</kbd> ouvrir</span>
          </span>
        </div>
      </div>
    </div>
  )
}
