import { describe, expect, it, vi } from 'vitest'
import { completeOnboarding } from '../onboarding'

describe('Onboarding completion persistence', () => {
  it('waits for successful persistence before allowing dismissal or navigation', async () => {
    let resolve!: (response: Response) => void
    const request = new Promise<Response>((done) => { resolve = done })
    const fetcher = vi.fn<typeof fetch>().mockReturnValue(request)
    const navigate = vi.fn()
    const completion = completeOnboarding(fetcher).then(navigate)
    await Promise.resolve()
    expect(navigate).not.toHaveBeenCalled()
    resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    await completion
    expect(fetcher).toHaveBeenCalledWith('/api/profile/onboarding', expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) }))
    expect(navigate).toHaveBeenCalledOnce()
  })

  it.each([500, 503])('does not dismiss or navigate after HTTP %s, and permits a successful retry', async (status) => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('Service unavailable', { status }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
    const navigate = vi.fn()
    await expect(completeOnboarding(fetcher).then(navigate)).rejects.toThrow('n’a pas pu être enregistré')
    expect(navigate).not.toHaveBeenCalled()
    await completeOnboarding(fetcher).then(navigate)
    expect(navigate).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('reports an expired session instead of treating it as completion', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 401 }))
    await expect(completeOnboarding(fetcher)).rejects.toThrow('session a expiré')
  })

  it('reports a dropped connection with a retry message', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network failure'))
    await expect(completeOnboarding(fetcher)).rejects.toThrow('connexion a été interrompue')
  })
})
