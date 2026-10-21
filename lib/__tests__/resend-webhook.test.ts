import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
const mock = vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/supabase/server',()=>({createAdminClient:async()=>({rpc:mock.rpc})}))
import { POST } from '@/app/api/webhooks/resend/route'
const secret=Buffer.from('test-secret-for-signing-only').toString('base64')
const claim='00000000-0000-4000-8000-000000000001'
const invoice='00000000-0000-4000-8000-000000000002'
function send({valid=true,offset=0,type='email.delivered'}={}) {
  const body=JSON.stringify({type,created_at:'2026-10-15T08:00:00Z',data:{email_id:'provider-1',tags:{reminder_id:claim,invoice_id:invoice,type:'email_1'}}})
  const timestamp=String(Math.floor(Date.now()/1000)+offset)
  const signature=createHmac('sha256',Buffer.from(secret,'base64')).update(`event-1.${timestamp}.${body}`).digest('base64')
  return POST(new Request('https://encair.test/api/webhooks/resend',{method:'POST',body,headers:{'svix-id':'event-1','svix-timestamp':timestamp,'svix-signature':valid?`v1,${signature}`:'v1,invalid'}}))
}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('RESEND_WEBHOOK_SECRET',`whsec_${secret}`);mock.rpc.mockResolvedValue({data:true,error:null})})
afterEach(()=>vi.unstubAllEnvs())
describe('Verified Resend event ingestion',()=>{
  it('rejects tampered or replayed events before touching data',async()=>{
    expect((await send({valid:false})).status).toBe(401)
    expect((await send({offset:-600})).status).toBe(401)
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it('passes the signed claim metadata for reconciliation',async()=>{
    expect((await send()).status).toBe(200)
    expect(mock.rpc).toHaveBeenCalledWith('record_collection_email_event',expect.objectContaining({p_claim_id:claim,p_invoice_id:invoice,p_reminder_type:'email_1',p_occurred_at:'2026-10-15T08:00:00.000Z'}))
  })
  it('requests a provider retry when persistence fails',async()=>{
    mock.rpc.mockResolvedValue({data:null,error:{message:'offline'}})
    expect((await send()).status).toBe(503)
  })
  it('handles accepted emails and suppression events',async()=>{
    expect((await send({type:'email.sent'})).status).toBe(200)
    expect((await send({type:'email.suppressed'})).status).toBe(200)
    expect(mock.rpc).toHaveBeenCalledTimes(2)
  })
})
