import { z } from 'zod'
const text = z.string().trim().min(1).max(1200)
const refs = z.array(z.string().min(1).max(60)).min(1).max(5)
export const inputSchema = z.object({
  period: z.string().min(1).max(80), objective: text,
  funnel: z.object({sent:z.number().int().nonnegative(),replies:z.number().int().nonnegative(),demos:z.number().int().nonnegative(),activated:z.number().int().nonnegative(),paid:z.number().int().nonnegative()}).strict(),
  facts: z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),category:z.enum(['acquisition','product','support']),observation:text}).strict()).min(1).max(30),
}).strict().superRefine((v,c)=>{
  if(new Set(v.facts.map(f=>f.id)).size!==v.facts.length)c.addIssue({code:'custom',message:'Preuves dupliquées.'})
  const f=v.funnel
  if(f.replies>f.sent||f.demos>f.replies||f.activated>f.demos||f.paid>f.activated)c.addIssue({code:'custom',message:'Fournir une même cohorte : envoyés ≥ réponses ≥ démos ≥ activations ≥ payants.'})
})
export const proposalSchema = z.object({
  findings:z.array(z.object({observation:text,evidence:refs,hypothesis:z.boolean()}).strict()).min(1).max(4),
  actions:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),title:text,rationale:text,metric:text,evidence:refs}).strict()).min(1).max(3),
  drafts:z.array(z.object({purpose:text,body:z.string().min(1).max(2400),evidence:refs}).strict()).max(2),
}).strict()
export const reviewSchema=z.object({selectedActionIds:z.array(z.string()).max(3),reservations:z.array(text).min(1).max(5)}).strict()
export type Role='acquisition'|'product'|'reviewer'
export type Input=z.infer<typeof inputSchema>
export type Proposal=z.infer<typeof proposalSchema>
export type Run={id:string;createdAt:string;status:'running'|'review'|'failed';input:Input;stages:{role:Role;status:'running'|'success'|'failed';inputTokens?:number;outputTokens?:number}[];proposals?:{acquisition:Proposal;product:Proposal};review?:z.infer<typeof reviewSchema>;error?:string}
export type Generate=(role:Role,context:unknown)=>Promise<{output:unknown;inputTokens?:number;outputTokens?:number}>
/** Three bounded calls. No shell, email, database, browser or other mutation tools. */
export async function runOperations(raw:unknown,generate:Generate,save:(r:Run)=>Promise<void>):Promise<Run>{
  const input=inputSchema.parse(raw)
  const run:Run={id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'running',input,stages:[]}
  await save(structuredClone(run))
  try{
    const proposals={} as {acquisition:Proposal;product:Proposal}
    const known=new Set(['funnel',...input.facts.map(f=>f.id)])
    for(const role of ['acquisition','product'] as const){
      const stage:Run['stages'][number]={role,status:'running'}
      run.stages.push(stage);await save(structuredClone(run))
      const result=await generate(role,input)
      const p=proposalSchema.parse(result.output)
      for(const item of [...p.findings,...p.actions,...p.drafts])if(item.evidence.some(id=>!known.has(id)))throw new Error('Unknown evidence')
      p.actions=p.actions.map(a=>({...a,id:`${role}-${a.id}`}))
      if(new Set(p.actions.map(a=>a.id)).size!==p.actions.length)throw new Error('Duplicate action')
      proposals[role]=p
      Object.assign(stage,{status:'success',inputTokens:result.inputTokens,outputTokens:result.outputTokens})
      await save(structuredClone(run))
    }
    const stage:Run['stages'][number]={role:'reviewer',status:'running'}
    run.stages.push(stage);await save(structuredClone(run))
    const result=await generate('reviewer',{input,proposals})
    const review=reviewSchema.parse(result.output)
    const ids=new Set([...proposals.acquisition.actions,...proposals.product.actions].map(a=>a.id))
    if(review.selectedActionIds.some(id=>!ids.has(id))||new Set(review.selectedActionIds).size!==review.selectedActionIds.length)throw new Error('Invalid review')
    Object.assign(stage,{status:'success',inputTokens:result.inputTokens,outputTokens:result.outputTokens})
    run.proposals=proposals;run.review=review;run.status='review'
  }catch{
    const last=run.stages.at(-1);if(last?.status==='running')last.status='failed'
    run.status='failed';run.error='Analyse interrompue : aucune recommandation validée. Vérifier le raccordement ou les sorties des agents.'
  }
  await save(structuredClone(run));return run
}
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function renderOperations(r:Run):string{
  const e=escape
  const card=(title:string,body:string)=>`<section><h2>${e(title)}</h2>${body}</section>`
  const selected=new Set(r.review?.selectedActionIds)
  const actions=r.status==='review'&&r.proposals?[...r.proposals.acquisition.actions,...r.proposals.product.actions].filter(a=>selected.has(a.id)):[]
  const f=r.input.funnel
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Encair · Direction IA</title><style>body{background:#f5f6f8;color:#18242b;font:16px system-ui;margin:auto;padding:32px;max-width:1080px}header{border-bottom:1px solid #ccd6d5;padding-bottom:20px}h1{font-size:38px;letter-spacing:-1.5px}h2{font-size:21px}small{color:#56666a}section{background:white;border:1px solid #dce3e3;border-radius:16px;padding:24px;margin:20px 0}article{border-top:1px solid #edf0f0;padding:16px 0}pre{white-space:pre-wrap;font:inherit}strong{color:#006d65}.funnel{display:flex;flex-wrap:wrap;gap:24px}.funnel b{display:block;font-size:27px}p{line-height:1.6}code{overflow-wrap:anywhere}</style><header><small>ENCAIR / DIRECTION IA · ${e(r.input.period)}</small><h1>La prochaine action utile.</h1><p>${e(r.input.objective)}</p><strong>${r.status==='review'?'Analyse IA à valider par Maxence':'Analyse incomplète — aucune recommandation validée'}</strong><p><small>${e(r.id)} · ${e(r.createdAt)}</small></p></header>${card('Parcours commercial',`<div class="funnel">${[['Envoyés',f.sent],['Réponses',f.replies],['Démos',f.demos],['Activations',f.activated],['Payants',f.paid]].map(([k,v])=>`<div><b>${v}</b>${k}</div>`).join('')}</div>`)}${card('Trois priorités maximum',actions.length?actions.map(a=>`<article><h3>${e(a.title)}</h3><p>${e(a.rationale)}</p><p><strong>Mesure :</strong> ${e(a.metric)}</p><small>Preuves : ${a.evidence.map(e).join(', ')}</small></article>`).join(''):'<p>Aucune action retenue. Examiner les réserves.</p>')}${r.status==='review'&&r.proposals?Object.entries(r.proposals).map(([role,p])=>card(role==='acquisition'?'Acquisition':'Produit et retours',p.findings.map(x=>`<p><strong>${x.hypothesis?'Hypothèse':'Observation à vérifier'} :</strong> ${e(x.observation)} <small>[${x.evidence.map(e).join(', ')}]</small></p>`).join('')+p.drafts.map(d=>`<article><h3>Brouillon · ${e(d.purpose)}</h3><pre>${e(d.body)}</pre><small>Preuves : ${d.evidence.map(e).join(', ')}</small></article>`).join(''))).join(''):''}${card('Réserves du contrôle',`<ul>${(r.review?.reservations??[r.error??'Traitement en cours.']).map(x=>`<li>${e(x)}</li>`).join('')}</ul>`)}${card('Sources fournies',r.input.facts.map(x=>`<p><code>${e(x.id)}</code> · ${e(x.observation)}</p>`).join(''))}<footer><small>Propositions uniquement. Aucun message envoyé ni compte modifié. Les références sont validées, pas la vérité des conclusions du modèle.</small></footer></html>`
}
