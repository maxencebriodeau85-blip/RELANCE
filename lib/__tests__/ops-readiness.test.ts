import { expect, it } from 'vitest'
import { publicHealthIssues, REQUIRED_CONFIG } from '../../scripts/check-public-health.mjs'
import { recentRestoreAttestation } from '../../scripts/check-backup-attestation.mjs'
it('HTTP200 with incomplete config is not operational success',()=>{
  const good={service:'encair',status:'ok',checks:'configuration-presence-only',config:Object.fromEntries(REQUIRED_CONFIG.map(k=>[k,true]))}
  expect(publicHealthIssues(good)).toEqual([])
  for(const key of REQUIRED_CONFIG)expect(publicHealthIssues({...good,config:{...good.config,[key]:false}})).toHaveLength(1)
  expect(publicHealthIssues({status:'ok'})).not.toEqual([])
  expect(publicHealthIssues(null)).not.toEqual([])
})
it('managed backup cannot claim restoration without a recent explicit attestation',()=>{
  const now=Date.parse('2026-11-04T12:00:00Z')
  for(const v of [undefined,'','garbage','2027-01-01T00:00:00Z','2026-10-01T00:00:00Z'])expect(recentRestoreAttestation(v,now)).toBe(false)
  expect(recentRestoreAttestation('2026-11-03T12:00:00Z',now)).toBe(true)
  expect(recentRestoreAttestation('2026-10-05T12:00:00Z',now)).toBe(true)
})
