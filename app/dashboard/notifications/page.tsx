'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Bell, Phone, Mail, FileText, Users,
  CheckCheck, ExternalLink, RefreshCw,
} from 'lucide-react'

interface Notif {
  id: string
  title: string
  body: string | null
  type: string
  read: boolean
  action_url: string | null
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  follow_up:       { icon: Phone,    color: 'text-blue-600 bg-blue-50',    label: 'Relance' },
  reminder:        { icon: Bell,     color: 'text-amber-600 bg-amber-50',  label: 'Rappel' },
  invoice_overdue: { icon: FileText, color: 'text-red-600 bg-red-50',      label: 'Facture' },
  deal_signed:     { icon: Users,    color: 'text-green-600 bg-green-50',  label: 'Deal signé' },
  sequence_step:   { icon: Mail,     color: 'text-violet-600 bg-violet-50', label: 'Séquence' },
}

const FILTER_TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'unread', label: 'Non lues' },
  { key: 'invoice_overdue', label: 'Factures' },
  { key: 'follow_up', label: 'Relances' },
  { key: 'sequence_step', label: 'Séquences' },
]

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [markingRead, setMarkingRead] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/notifications')
      const { notifications } = await r.json()
      setNotifs(notifications || [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleMarkAllRead = async () => {
    setMarkingRead(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setNotifs(n => n.map(x => ({ ...x, read: true })))
    } catch { /* silent */ } finally {
      setMarkingRead(false)
    }
  }

  const filtered = notifs.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'all') return true
    return n.type === filter
  })

  const unreadCount = notifs.filter(n => !n.read).length

  // Group by date
  const grouped = filtered.reduce<Record<string, Notif[]>>((acc, n) => {
    const day = format(new Date(n.created_at), 'EEEE d MMMM yyyy', { locale: fr })
    const key = day.charAt(0).toUpperCase() + day.slice(1)
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {})

  return (
    <div>
      <Header
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Actualiser
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingRead}>
                <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                Tout marquer lu
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-2xl space-y-5">
        {/* Filter tabs */}
        <div className="flex gap-1 border-b pb-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                filter === tab.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border bg-white p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === 'unread' ? 'Tout est à jour 👌' : 'Les alertes apparaîtront ici au fil de votre activité.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{day}</p>
                <div className="space-y-1 rounded-xl border bg-white overflow-hidden divide-y">
                  {items.map(n => {
                    const typeInfo = TYPE_CONFIG[n.type] || TYPE_CONFIG.reminder
                    const Icon = typeInfo.icon
                    const inner = (
                      <div className={cn(
                        'flex items-start gap-3 px-4 py-3.5 transition-colors group',
                        !n.read ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-gray-50'
                      )}>
                        <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full mt-0.5', typeInfo.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-sm leading-snug', !n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-800')}>
                              {n.title}
                            </p>
                            {n.action_url && (
                              <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          {n.body && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', typeInfo.color)}>
                              {typeInfo.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                        </div>
                        {!n.read && (
                          <div className="flex-shrink-0 mt-2 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    )
                    return n.action_url ? (
                      <Link key={n.id} href={n.action_url}>{inner}</Link>
                    ) : (
                      <div key={n.id}>{inner}</div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
