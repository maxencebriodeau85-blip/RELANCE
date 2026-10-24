import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { isPasswordCompromised } from '../password-security'
import { supabaseAuthError } from '../auth-errors'

const sha1 = (value: string) => createHash('sha1').update(value).digest('hex').toUpperCase()
const reply = (body: string, status = 200) =>
  vi.fn().mockResolvedValue(new Response(body, { status })) as unknown as typeof fetch

describe('Compromised password check', () => {
  it('sends only the 5-character hash prefix with padding', async () => {
    const fetcher = reply('')
    await isPasswordCompromised('Motdepasse123', fetcher)
    const [url, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${sha1('Motdepasse123').slice(0, 5)}`)
    expect(String(url)).not.toContain(sha1('Motdepasse123').slice(5))
    expect(init.headers['Add-Padding']).toBe('true')
  })
  it('flags a password whose suffix is listed', async () => {
    const suffix = sha1('password').slice(5)
    expect(await isPasswordCompromised('password', reply(`0000000000000000000000000000000000A:3\r\n${suffix}:9659365\r\n`))).toBe(true)
  })
  it('ignores padding entries with a zero count', async () => {
    const suffix = sha1('rare-passphrase').slice(5)
    expect(await isPasswordCompromised('rare-passphrase', reply(`${suffix}:0\r\n`))).toBe(false)
  })
  it('accepts a password that is not listed', async () => {
    expect(await isPasswordCompromised('rare-passphrase', reply('0123456789ABCDEF0123456789ABCDEF012:4'))).toBe(false)
  })
  it('fails open when the service errors or is unreachable', async () => {
    expect(await isPasswordCompromised('password', reply('', 503))).toBeNull()
    expect(await isPasswordCompromised('password', vi.fn().mockRejectedValue(new Error('timeout')) as unknown as typeof fetch)).toBeNull()
  })
  it('translates the Supabase leaked password error', () => {
    expect(supabaseAuthError('Password is known to be weak and easy to guess, please choose a different one.', 422)).toContain('fuites')
  })
})
