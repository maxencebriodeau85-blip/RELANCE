import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadNotifications, markNotificationsRead, notificationLink } from '../notifications-client'
afterEach(() => vi.unstubAllGlobals())
describe('Notification UI confirmations', () => {
  it('does not turn service failures into an empty list', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({ error:'offline' },{status:503})))
    await expect(loadNotifications()).rejects.toThrow('charger')
    await expect(markNotificationsRead()).rejects.toThrow('enregistrée')
  })
  it('requires an explicit write acknowledgement', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({})))
    await expect(markNotificationsRead()).rejects.toThrow()
  })
  it('only permits local invoice and contact links', () => {
    expect(notificationLink('/dashboard/invoices/00000000-0000-4000-8000-000000000001')).toBeTruthy()
    for (const value of ['javascript:alert(1)','//external.test','https://external.test','/auth/logout',null]) expect(notificationLink(value)).toBeNull()
  })
})
