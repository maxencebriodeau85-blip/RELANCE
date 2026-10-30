import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/distributed-rate-limit', () => ({ distributedRateLimit: async () => ({ allowed: true, retryAfterSec: 0 }) }))

import { POST } from '@/app/api/contact/route'

const send = (body: Record<string, unknown>) =>
  POST(new Request('https://encair.test/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
const valid = { name: 'Jeanne\r\nBcc: x@y.z', email: 'jeanne@exemple.fr', subject: 'Import\r\nCSV', message: 'Bonjour, une question sur l’import CSV.', website: '' }

describe('Formulaire de contact', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'contact@encair.test')
    vi.stubEnv('SUPPORT_EMAIL', 'support@encair.test')
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('refuse clairement quand l’envoi n’est pas configuré, au lieu de prétendre avoir envoyé', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const response = await send(valid)
    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envoie le message au support par l’API Resend, réponse vers l’expéditeur, sans injection d’en-tête', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'email_1' }), { status: 200 }))
    const response = await send(valid)
    expect(response.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer re_test_key')
    const payload = JSON.parse(init.body)
    expect(payload.to).toEqual(['support@encair.test'])
    expect(payload.reply_to).toBe('jeanne@exemple.fr')
    expect(payload.subject).toBe('[Contact] Import  CSV')
    expect(payload.text).toContain('Nom : JeanneBcc: x@y.z')
    expect(payload.text).not.toMatch(/Jeanne\r?\n/)
  })

  it('signale un échec si Resend refuse le message', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'invalid' }), { status: 422 }))
    expect((await send(valid)).status).toBe(500)
  })

  it('ignore silencieusement les robots (pot de miel) sans rien envoyer', async () => {
    const response = await send({ ...valid, website: 'http://spam' })
    expect(response.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
