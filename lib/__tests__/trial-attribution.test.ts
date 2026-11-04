import { expect, it, vi } from 'vitest'
import { trackTrialClick } from '../trial-attribution'
it('records only a closed page category, never query data or invoice/account paths',()=>{
  const emit=vi.fn();trackTrialClick('/auth/register?email=private%40example.com','/dashboard/invoices/private-id','https://encair.test',emit)
  expect(emit).toHaveBeenCalledWith('trial_cta_clicked',{surface:'other'})
  expect(JSON.stringify(emit.mock.calls)).not.toMatch(/email|private|dashboard/)
})
it('attributes home and guides, ignores external and unrelated links',()=>{
  const emit=vi.fn();trackTrialClick('/auth/register','/','https://encair.test',emit)
  trackTrialClick('/auth/register','/guides/example','https://encair.test',emit)
  trackTrialClick('https://other.test/auth/register','/','https://encair.test',emit)
  trackTrialClick('/auth/login','/','https://encair.test',emit)
  expect(emit.mock.calls).toEqual([['trial_cta_clicked',{surface:'home'}],['trial_cta_clicked',{surface:'guides'}]])
})
it('analytics failure never breaks the click',()=>{expect(()=>trackTrialClick('/auth/register','/','https://encair.test',()=>{throw Error('offline')})).not.toThrow()})
