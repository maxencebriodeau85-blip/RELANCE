import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(()=>({user:vi.fn(),read:vi.fn(),write:vi.fn(),saved:vi.fn(),filter:vi.fn()}))
vi.mock('@/lib/supabase/server',()=>({ createClient:async()=>({
  auth:{getUser:mock.user}, from:()=>({
    select:()=>({eq:()=>({single:mock.read})}),
    update:(value:unknown)=>{mock.write(value); return {eq:(...args:unknown[])=>{mock.filter(...args);return {select:()=>({single:mock.saved})}}}},
  }),
})}))
import { GET, PATCH } from '@/app/api/profile/reminders/route'
const send=(body:unknown)=>PATCH(new Request('https://encair.test/api/profile/reminders',{method:'PATCH',body:JSON.stringify(body)}))
beforeEach(()=>{
  vi.clearAllMocks()
  mock.user.mockResolvedValue({data:{user:{id:'owner'}}})
  mock.read.mockResolvedValue({data:{auto_reminders:false,active_scenario:'standard',plan:'starter'},error:null})
  mock.saved.mockResolvedValue({data:{auto_reminders:false,active_scenario:'firm'},error:null})
  vi.stubEnv('RESEND_API_KEY','re_valid');vi.stubEnv('RESEND_FROM_EMAIL','relances@example.test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','valid');vi.stubEnv('CRON_SECRET','valid');vi.stubEnv('RESEND_WEBHOOK_SECRET','whsec_qa-only')
})
afterEach(()=>vi.unstubAllEnvs())
describe('Reliable reminder settings',()=>{
  it('requires a user for reads and writes',async()=>{
    mock.user.mockResolvedValue({data:{user:null}})
    expect((await GET()).status).toBe(401)
    expect((await send({auto_reminders:true})).status).toBe(401)
    expect(mock.write).not.toHaveBeenCalled()
  })
  it('rejects unknown settings and invalid scenarios',async()=>{
    for(const body of [{plan:'business'},{active_scenario:'unknown'},{auto_reminders:'true'},null,{}]) expect((await send(body)).status).toBe(422)
    expect(mock.write).not.toHaveBeenCalled()
  })
  it('never reports a failed database write as saved',async()=>{
    mock.saved.mockResolvedValue({data:null,error:{message:'offline'}})
    expect((await send({active_scenario:'firm'})).status).toBe(503)
  })
  it('only returns the persisted state for this user',async()=>{
    const response=await send({active_scenario:'firm'})
    expect(response.status).toBe(200)
    expect((await response.json()).settings).toEqual({auto_reminders:false,active_scenario:'firm'})
    expect(mock.filter).toHaveBeenCalledWith('id','owner')
  })
  it('does not enable unavailable delivery',async()=>{
    vi.stubEnv('CRON_SECRET','')
    expect((await send({auto_reminders:true})).status).toBe(503)
    expect(mock.write).not.toHaveBeenCalled()
    expect((await (await GET()).json()).capabilities.automationAvailable).toBe(false)
  })
  it('does not enable automation without signed email callbacks, but still allows stopping',async()=>{
    vi.stubEnv('RESEND_WEBHOOK_SECRET','')
    expect((await send({auto_reminders:true})).status).toBe(503)
    expect(mock.write).not.toHaveBeenCalled()
    expect((await (await GET()).json()).capabilities).toEqual({emailAvailable:false,automationAvailable:false})
    expect((await send({auto_reminders:false})).status).toBe(200)
  })
  it('lets an expired account stop automatic sends, but not enable them',async()=>{
    mock.read.mockResolvedValue({data:{plan:'free_trial',trial_ends_at:'2020-01-01T00:00:00Z'},error:null})
    expect((await send({auto_reminders:false})).status).toBe(200)
    expect((await send({auto_reminders:true})).status).toBe(403)
    expect((await send({auto_reminders:false,active_scenario:'firm'})).status).toBe(403)
  })
})
