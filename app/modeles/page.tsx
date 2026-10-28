import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Info } from 'lucide-react'
import { PublicPage } from '@/components/landing/public-page'
import { JsonLd } from '@/components/seo/json-ld'
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo'
import { CTA_LABEL, TRIAL_LINE } from '@/lib/plans'
import { PUBLISHER } from '@/lib/legal'
import { REMINDER_TEMPLATES } from '@/lib/reminder-templates'

export const metadata = pageMetadata({
  title: 'Modèles de relance de facture — trois rappels amiables',
  description:
    'Trois modèles de relance de facture impayée à copier : premier rappel, suivi du règlement et dernier rappel amiable, à adapter au solde réel de chaque facture.',
  path: '/modeles',
  ogTitle: 'Modèles de relance de facture gratuits',
})

export default function ModelesPage() {
  return (
    <PublicPage>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Modèles de relance', path: '/modeles' }])} />
      <div className="rf-page rf-page-narrow">
        <header className="rf-page-head">
          <span className="rf-eyebrow">Modèles gratuits</span>
          <h1>Trois modèles de relance amiable, prêts à adapter.</h1>
          <p>
            Proposés par {PUBLISHER.name}, fondateur d’Encair : ce sont les mêmes modèles de base que
            dans l’application. Vérifiez le destinataire et le solde restant avant chaque envoi, et
            choisissez une cadence adaptée à votre client.
          </p>
        </header>

        <ol className="space-y-6">
          {REMINDER_TEMPLATES.map((template, index) => (
            <li key={template.type} className="rf-card block overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe6dc] px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-[#182b40] text-sm font-semibold text-white" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h2 className="font-semibold text-[#182b40]">{template.label}</h2>
                </div>
                <span className="rf-chip">{template.tone}</span>
              </div>
              <div className="border-b border-[#ebe6dc] bg-[#fbf9f4] px-6 py-3 text-sm">
                <span className="mr-2 font-semibold text-[#5b6570]">Objet :</span>
                <span className="font-medium text-[#182b40]">{template.defaultSubject}</span>
              </div>
              <pre className="whitespace-pre-wrap px-6 py-5 font-sans text-[15px] leading-relaxed text-[#2f3f50]">
                {template.defaultBody}
              </pre>
              <p className="flex items-start gap-2 border-t border-[#ebe6dc] bg-[#fbf9f4] px-6 py-3 text-xs leading-relaxed text-[#5b6570]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a74a28]" aria-hidden="true" />
                Remplacez les variables entre accolades. Pénalités de retard et indemnité de 40 € :
                clients professionnels uniquement.
              </p>
            </li>
          ))}
        </ol>

        <aside className="rf-callout mt-8">
          <strong>Et la mise en demeure ?</strong> Elle produit des effets juridiques : elle n’est pas
          fournie comme modèle. Le{' '}
          <Link href="/guides/mise-en-demeure-guide-complet">guide de la mise en demeure</Link> détaille
          les éléments à y faire figurer ; faites-la relire si l’enjeu est important.
        </aside>

        <section className="rf-panel mt-12" aria-labelledby="essai-modeles">
          <span className="rf-eyebrow">Moins de copier-coller</span>
          <h2 id="essai-modeles" className="text-2xl font-semibold tracking-tight">
            Encair remplit ces modèles pour chaque facture.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed">
            Numéro, échéance et solde restant sont repris de la facture. Vous vérifiez chaque relance
            avant un envoi manuel ou l’activation d’un scénario automatique.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <Link href="/auth/register" className="rf-button rf-button-light">
              {CTA_LABEL} <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/guides/relance-clients-ton-progressif" className="inline-flex items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline">
              Choisir le bon ton de relance <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-4 text-xs">{TRIAL_LINE}</p>
        </section>
      </div>
    </PublicPage>
  )
}
