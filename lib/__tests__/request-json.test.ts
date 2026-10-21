import { describe, expect, it } from 'vitest'
import { readJsonBody } from '../request-json'
const request = (body: string, headers = {}) => new Request('https://encair.test', { method: 'POST', body, headers })
describe('Bounded JSON requests', () => {
  it('accepts JSON exactly at the byte limit', async () => {
    expect(await readJsonBody(request('"é"'), 4)).toEqual({ ok: true, value: 'é' })
  })
  it('rejects oversized content with missing or false Content-Length', async () => {
    for (const headers of [{}, { 'content-length': '1' }]) {
      expect(await readJsonBody(request('"é"', headers), 3)).toMatchObject({ ok: false, status: 413 })
    }
  })
  it('cancels a streamed request once the limit is exceeded', async () => {
    let cancelled = false
    const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(11)) }, cancel() { cancelled = true } })
    const req = new Request('https://encair.test', { method: 'POST', body, duplex: 'half' } as RequestInit)
    expect(await readJsonBody(req, 10)).toMatchObject({ status: 413 })
    expect(cancelled).toBe(true)
  })
  it('returns a client error for malformed or absent JSON', async () => {
    expect(await readJsonBody(request('{'), 10)).toMatchObject({ status: 400 })
    expect(await readJsonBody(new Request('https://encair.test'), 10)).toMatchObject({ status: 400 })
  })
})
