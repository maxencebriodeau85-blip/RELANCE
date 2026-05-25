'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell, X, Phone, Mail, FileText, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Notif {
  id: string
  title: string
  body: string | null
  type: string
  read: boolean
  action_url: string | null
  created_at: string
}

const TYPE_ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  follow_up:      { icon: Phone,    color: 'text-blue-600 bg-blue-50' },
  reminder:       { icon: Bell,     color: 'text-amber-600 bg-amber-50' },
  invoice_overdue:{ icon: FileText, color: 'text-red-600 bg-red-50' },
  deal_signed:    { icon: Users,    color: 'text-green-600 bg-green-50' },
  sequence_step:  { icon: Mail,     color: 'text-violet-600 bg-violet-50' },
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [generated, setGenerated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Load notifications
  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(({ notifications, unreadCount }) => {
        setNotifs(notifications || [])
        setUnread(unreadCount || 0)
      })
      .catch(() => null)
  }, [])

  // Generate smart alerts once per session
  useEffect(() => {
    if (generated) return
    setGenerated(true)
    fetch('/api/notifications/generate', { method: 'POST' })
      .then(r => r.json())
      .then(({ created }) => {
        if (created > 0) {
          // Refresh notifications list
          return fetch('/api/notifications')
            .then(r => r.json())
            .then(({ notifications, unreadCount }) => {
              setNotifs(notifications || [])
              setUnread(unreadCount || 0)
            })
        }
      })
      .catch(() => null)
  }, [generated])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = async () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      setNotifs(n => n.map(x => ({ ...x, read: true })))
      await fetch('/api/notifications', { method: 'PATCH' })
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          open ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 hover:bg-gray-100 text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Aucune notification</p>
                <p className="text-xs text-gray-300 mt-1">Tout est à jour 👌</p>
              </div>
            ) : (
              notifs.map(n => {
                const typeInfo = TYPE_ICONS[n.type] || TYPE_ICONS.reminder
                const Icon = typeInfo.icon
                const content = (
                  <div className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50',
                    !n.read && 'bg-blue-50/50 hover:bg-blue-50'
                  )}>
                    <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', typeInfo.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                )

                return n.action_url ? (
                  <Link key={n.id} href={n.action_url} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                )
              })
            )}
          </div>

          <div className="border-t px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {notifs.filter(n => !n.read).length === 0
                ? 'Tout lu'
                : `${notifs.filter(n => !n.read).length} non lu${notifs.filter(n => !n.read).length > 1 ? 'es' : ''}`}
            </p>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Voir tout →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
