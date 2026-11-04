import { expect, it, vi } from 'vitest'
import { inputSchema, renderOperations, runOperations, type Run } from '../ai-operations'
const input={period:'Test fictif',objective:'Tester la conversion',funnel:{sent:20,replies:5,demos:3,activated:1,paid:0},facts:[{id:'f1',category:'product',observation:'Retour fictif sur import.'}]}
const proposal=()=>({findings:[{observation:'Hypothèse de friction',evidence:['f1'],hypothesis:true}],actions:[{id:'one',title:'Tester import guidé',rationale:'Retour fourni',metric:'Premier import terminé',evidence:['f1']}],drafts:[{purpose:'Réponse à relire',body:'Voici le guide.',evidence:['f1']}]})
it('runs exactly three ordered roles with durable stages and human review',async()=>{
  const g=vi.fn().mockResolvedValueOnce({output:proposal(),inputTokens:10,outputTokens:20}).mockResolvedValueOnce({output:proposal()}).mockResolvedValueOnce({output:{selectedActionIds:['product-one'],reservations:['Hypothèse à tester.']}})
  const history:Run[]=[];const r=await runOperations(input,g,async x=>{history.push(x)})
  expect(g.mock.calls.map(c=>c[0])).toEqual(['acquisition','product','reviewer'])
  expect(r.status).toBe('review');expect(r.stages.every(s=>s.status==='success')).toBe(true)
  expect(r.stages[0].outputTokens).toBe(20);expect(history[0].stages).toEqual([])
  expect(history.at(-1)?.status).toBe('review');expect(renderOperations(r)).toContain('Analyse IA à valider par Maxence')
})
it('rejects unknown evidence before another role or recommendations are saved',async()=>{
  const p=proposal();p.actions[0].evidence=['invented'];const g=vi.fn().mockResolvedValue({output:p})
  const r=await runOperations(input,g,async()=>{});expect(r.status).toBe('failed');expect(r.proposals).toBeUndefined();expect(g).toHaveBeenCalledTimes(1)
})
it.each([{ids:['unknown']},{ids:['product-one','product-one']}])('rejects invalid review $ids',async ({ids})=>{
  const g=vi.fn().mockResolvedValueOnce({output:proposal()}).mockResolvedValueOnce({output:proposal()}).mockResolvedValueOnce({output:{selectedActionIds:ids,reservations:['À vérifier.']}})
  expect((await runOperations(input,g,async()=>{})).status).toBe('failed')
})
it('redacts upstream errors, stops without retry or false validation',async()=>{
  const g=vi.fn().mockRejectedValue(new Error('secret-provider-body'));const r=await runOperations(input,g,async()=>{})
  expect(JSON.stringify(r)).not.toContain('secret-provider-body');expect(r.stages[0].status).toBe('failed');expect(g).toHaveBeenCalledTimes(1)
  expect(renderOperations(r)).toContain('aucune recommandation validée')
})
it('invalid cohorts and duplicate facts never call a model',async()=>{
  const g=vi.fn();await expect(runOperations({...input,funnel:{...input.funnel,replies:40}},g,async()=>{})).rejects.toThrow()
  expect(inputSchema.safeParse({...input,facts:[input.facts[0],input.facts[0]]}).success).toBe(false);expect(g).not.toHaveBeenCalled()
})
it('failed critic hides unreviewed proposals',async()=>{
  const g=vi.fn().mockResolvedValueOnce({output:proposal()}).mockResolvedValueOnce({output:proposal()}).mockRejectedValueOnce(new Error('timeout'))
  const r=await runOperations(input,g,async()=>{});expect(r.proposals).toBeUndefined();expect(renderOperations(r)).not.toContain('Voici le guide.')
})
it('escapes HTML and permits zero selected actions',async()=>{
  const p=proposal();p.drafts[0].body='<script>alert(1)</script>'
  const g=vi.fn().mockResolvedValueOnce({output:p}).mockResolvedValueOnce({output:p}).mockResolvedValueOnce({output:{selectedActionIds:[],reservations:['Preuve insuffisante.']}})
  const r=await runOperations({...input,objective:'<img src=x onerror=alert(1)>'},g,async()=>{});const html=renderOperations(r)
  expect(r.status).toBe('review');expect(html).not.toContain('<script>');expect(html).not.toContain('<img ');expect(html).toContain('&lt;script&gt;');expect(html).toContain('Aucune action retenue')
})
it('rejects duplicate actions and invalid model structure',async()=>{
  const p=proposal();p.actions.push(p.actions[0])
  for(const output of [p,{wrong:true}])expect((await runOperations(input,async()=>({output}),async()=>{})).status).toBe('failed')
})
