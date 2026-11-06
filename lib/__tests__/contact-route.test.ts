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
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('refuse clairement quand l’envoi n’est pas configuré, au lieu de prétendre avoir envoyé', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const response = await send(valid)
    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envoie le message au support par l’API Resend, réponse vers l’expéditeur, sans injection d’en-tête', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: '01234567-89ab-4cde-8123-456789abcdef' }), { status: 200 }))
    const response = await send(valid)
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result).toMatchObject({ success: true, delivery: 'accepted' })
    expect(result.reference).toMatch(/^[0-9a-f-]{36}$/)
    expect(console.info).toHaveBeenCalledWith('Contact delivery', {
      event: 'accepted', reference: result.reference, providerId: '01234567-89ab-4cde-8123-456789abcdef',
    })
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
    expect((await send(valid)).status).toBe(502)
  })

  it('refuse un champ piège rempli sans prétendre avoir envoyé le message', async () => {
    const response = await send({ ...valid, website: 'http://spam' })
    expect(response.status).toBe(422)
    const result = await response.json()
    expect(result.success).not.toBe(true)
    expect(result.error).toContain('conservé')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['JSON invalide', 'not json'],
    ['identifiant absent', '{}'],
    ['identifiant non textuel', JSON.stringify({ id: { token: 'provider-private-body' } })],
    ['identifiant avec contrôles', JSON.stringify({ id: 'email_1\nprivate' })],
  ])('ne confirme pas une réponse fournisseur %s', async (_label, body) => {
    fetchMock.mockResolvedValue(new Response(body, { status: 200 }))
    const response = await send(valid)
    expect(response.status).toBe(502)
    expect((await response.json()).success).not.toBe(true)
    expect(console.info).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/provider-private-body|jeanne|re_test_key|Bonjour/)
  })

  it('journalise le refus fournisseur sans corps, adresse ni clé et renvoie une référence', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'private-message jeanne@exemple.fr re_test_key' }), { status: 403 }))
    const response = await send(valid)
    expect(response.status).toBe(502)
    const result = await response.json()
    expect(console.warn).toHaveBeenCalledWith('Contact delivery', {
      event: 'provider_rejected', reference: result.reference, status: 403,
    })
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/private-message|jeanne|re_test_key/)
  })

  it('ne journalise pas le message d’une exception transport et ne réessaie pas l’envoi', async () => {
    fetchMock.mockRejectedValue(new Error('private-network-body re_test_key'))
    const response = await send(valid)
    expect(response.status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/private-network-body|re_test_key/)
  })
})
