export interface NotificationItem {
  id: string
  title: string
  body: string | null
  type: string
  read: boolean
  action_url: string | null
  created_at: string
}
export function notificationLink(value: string | null) {
  return value && /^\/dashboard\/(invoices|contacts)\/[0-9a-f-]+$/i.test(value) ? value : null
}
export async function loadNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  const response = await fetch('/api/notifications', { cache: 'no-store' })
  const body = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(body?.notifications) || typeof body.unreadCount !== 'number')
    throw new Error('Impossible de charger les notifications. Réessayez.')
  return body
}
export async function markNotificationsRead() {
  const response = await fetch('/api/notifications', { method: 'PATCH' })
  const body = await response.json().catch(() => null)
  if (!response.ok || body?.success !== true) throw new Error('La lecture des notifications n’a pas été enregistrée.')
}
