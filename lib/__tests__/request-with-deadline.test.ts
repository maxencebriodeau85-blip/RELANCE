import { afterEach, expect, it, vi } from 'vitest'
import { requestJsonWithDeadline, RequestDeadlineError } from '../request-with-deadline'
afterEach(()=>vi.useRealTimers())
it('aborts a hanging write, releases it once, and never retries',async()=>{
  vi.useFakeTimers(); let signal:AbortSignal|undefined
  const fetcher=vi.fn((_input,init)=>{signal=init?.signal as AbortSignal;return new Promise<Response>(()=>{})})
  const p=requestJsonWithDeadline('/import',{method:'POST'},100,fetcher)
  const assertion=expect(p).rejects.toBeInstanceOf(RequestDeadlineError)
  await vi.advanceTimersByTimeAsync(101);await assertion
  expect(signal?.aborted).toBe(true);expect(fetcher).toHaveBeenCalledTimes(1)
})
it('also bounds reading an indefinitely stalled response body',async()=>{
  vi.useFakeTimers();const fetcher=vi.fn().mockResolvedValue({json:()=>new Promise(()=>{})})
  const p=requestJsonWithDeadline('/import',{method:'POST'},100,fetcher)
  const assertion=expect(p).rejects.toBeInstanceOf(RequestDeadlineError)
  await vi.advanceTimersByTimeAsync(101);await assertion;expect(fetcher).toHaveBeenCalledTimes(1)
})
it('preserves HTTP status and payload, clears timeout after success',async()=>{
  vi.useFakeTimers();const response=new Response(JSON.stringify({error:'conflict'}),{status:409})
  const r=await requestJsonWithDeadline('/import',{method:'POST'},100,vi.fn().mockResolvedValue(response))
  expect(r.response.status).toBe(409);expect(r.data.error).toBe('conflict');expect(vi.getTimerCount()).toBe(0)
})
it('reports deadline consistently when the real transport rejects immediately on abort',async()=>{
  vi.useFakeTimers()
  const fetcher=vi.fn((_input,init)=>new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))))
  const p=requestJsonWithDeadline('/import',{method:'POST'},100,fetcher)
  const assertion=expect(p).rejects.toBeInstanceOf(RequestDeadlineError)
  await vi.advanceTimersByTimeAsync(101);await assertion
})
