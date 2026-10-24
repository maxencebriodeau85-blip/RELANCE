import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server',()=>({ createClient: () => { throw new Error('Must not access user data') } }))
import { POST as webhook } from '@/app/api/integrations/webhook/route'
import { POST as sync } from '@/app/api/integrations/pennylane/sync/route'
import { GET as oauth } from '@/app/api/integrations/pennylane/route'
import { GET as callback } from '@/app/api/integrations/pennylane/callback/route'
import { GET as formalNotice } from '@/app/api/invoices/[id]/formal-notice/route'
import { POST as createKey } from '@/app/api/integrations/api-keys/route'
describe('Unavailable features cannot pretend to import or connect', () => {
  it('retires the unsafe old webhook and document generator', () => {
    expect(webhook().status).toBe(410)
    expect(formalNotice().status).toBe(410)
  })
  it('does not exchange tokens, sync invoices or create unusable keys', async () => {
    for (const action of [sync,oauth,callback,createKey]) expect((await action()).status).toBe(503)
  })
})
