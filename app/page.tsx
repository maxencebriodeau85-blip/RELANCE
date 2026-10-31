import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Upload,
  Mail,
  ListChecks,
  ShieldCheck,
  MapPin,
  LockKeyhole,
  Download,
} from 'lucide-react'
import { JsonLd } from '@/components/seo/json-ld'
import { faqJsonLd } from '@/lib/seo'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'
import { PricingSection } from '@/components/landing/pricing-section'
import { ProductPreview } from '@/components/landing/product-preview'
import { CTA_LABEL, OFFER, TRIAL_LINE, priceLabel } from '@/lib/plans'
import { CONTACT_EMAIL, PUBLISHER } from '@/lib/legal'

export const metadata = {
  alternates: { canonical: '/' },
}

const faq: [string, string][] = [
  [
    'Dois-je changer de logiciel de facturation ?',
    'Non. Exportez vos factures au format CSV depuis votre outil actuel (ou un fichier Excel enregistré en CSV), puis importez-les dans Encair. Vous continuez à établir vos factures dans votre logiciel habituel.',
  ],
  [
    'Et la facturation électronique obligatoire ?',
    'Encair n’est pas une plateforme agréée et n’émet pas de factures : vous continuez à facturer avec votre logiciel ou votre plateforme. Encair suit ce qui reste à encaisser à partir de leur export CSV, et vos relances tiennent compte des promesses, des litiges et des règlements. Le guide « Facturation électronique 2026-2027 » détaille ce qui change pour vos impayés.',
  ],
  [
    'Mon logiciel de facturation relance déjà, pourquoi Encair ?',
    'Si ses relances vous suffisent, gardez-les. Encair sert quand une relance doit tenir compte de ce que le client vous a dit : une promesse pour vendredi, un acompte versé, une facture contestée. Ces situations mettent l’envoi en pause automatiquement, et vous voyez chaque jour les factures qui demandent une action.',
  ],
  [
    'De quelle adresse partent les relances ?',
    'Elles partent au nom de votre entreprise, depuis l’adresse d’envoi d’Encair. Le bouton « Répondre » de votre client vous écrit directement, sur l’adresse email de votre compte.',
  ],
  [
    'Est-ce que les relances partent immédiatement ?',
    'Non. Les nouvelles factures sont importées en pause. Vérifiez les informations, confirmez le solde et activez les relances. Une promesse de paiement, un litige ou un solde non vérifié depuis sept jours suspend l’envoi automatique.',
  ],
  [
    'Comment les paiements sont-ils mis à jour ?',
    'Réimportez votre fichier CSV avec la colonne « Reste à payer », ou renseignez le montant encaissé sur la fiche de la facture. La connexion bancaire automatique n’est pas disponible pour l’instant.',
  ],
  [
    'Que se passe-t-il après l’essai ?',
    'Rien n’est prélevé : aucune carte bancaire n’est demandée à l’inscription. Si vous ne vous abonnez pas, les relances s’arrêtent et vous ne pouvez plus ajouter de factures, mais vous gardez l’accès à vos données pour les consulter et les exporter en CSV.',
  ],
  [
    'Et au-delà de 100 factures dans le mois ?',
    'Le quota compte les nouvelles factures ajoutées dans le mois civil. L’actualisation des factures déjà suivies n’est pas décomptée. Une fois les 100 atteintes, l’ajout de nouvelles factures reprend le 1er du mois suivant ; rien n’est facturé en plus.',
  ],
  [
    'Mon assistante ou mon expert-comptable peut-il y accéder ?',
    'L’offre fondateur comprend un seul utilisateur. Si vous avez besoin d’un accès partagé, écrivez-moi : c’est le genre de retour qui décide de la suite.',
  ],
]

export default function HomePage() {
  return (
    <div className="rf-site rf-home">
      <JsonLd data={faqJsonLd(faq)} />
      <SiteNav />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <section className="rf-hero">
          <div className="rf-hero-copy">
            <div className="rf-launch">
              <span /> Pour les TPE qui ont plusieurs factures en retard
            </div>
            <h1>
              Vos factures impayées,
              <br />
              <em>suivies et relancées.</em>
            </h1>
            <p>
              Sans changer de logiciel de facturation. Exportez vos factures en
              CSV et importez-les : Encair vous montre chaque jour qui relancer,
              qui a promis de payer et quelles factures sont en litige.
            </p>
            <div className="rf-hero-actions">
              <Link className="rf-button rf-button-dark" href="/auth/register">
                {CTA_LABEL} <ArrowUpRight size={19} />
              </Link>
              <a href="#produit" className="rf-text-link">
                Découvrir le produit <ArrowRight size={17} />
              </a>
            </div>
            <div className="rf-hero-proof">
              <span>
                <Check size={15} />
                {OFFER.trialDays} jours gratuits · {OFFER.trialInvoiceLimit} factures
              </span>
              <span>
                <Check size={15} />
                Sans carte bancaire · aucun prélèvement automatique
              </span>
            </div>
          </div>
          <div id="produit" className="rf-product-wrap">
            <ProductPreview />
          </div>
        </section>
        <div className="rf-principles">
          <span>Votre logiciel de facturation reste le même.</span>
          <span>
            <ShieldCheck size={17} />
            Vous gardez la main sur les envois.
          </span>
          <span>{priceLabel(OFFER.price)}, sans engagement.</span>
        </div>
        <section id="fonctionnalites" className="rf-section">
          <div className="rf-section-heading">
            <div>
              <span className="rf-eyebrow">DU FICHIER À L’ACTION</span>
              <h2>
                Du CSV à la relance,
                <br />
                en trois étapes.
              </h2>
            </div>
            <p>
              Finis les rappels éparpillés entre un tableur, une boîte mail et
              votre mémoire.
            </p>
          </div>
          <div className="rf-feature-grid">
            {[
              {
                n: '01',
                icon: Upload,
                title: 'Importez vos impayés.',
                text: 'Importez l’export CSV de votre logiciel de facturation (ou un fichier Excel enregistré en CSV) et associez ses colonnes. Réimportez ensuite les soldes pour actualiser les factures existantes.',
              },
              {
                n: '02',
                icon: Mail,
                title: 'Relancez avec vos propres modèles.',
                text: 'Personnalisez vos modèles et choisissez un rythme de relance. Les emails partent à votre nom et l’historique des envois reste sur chaque facture.',
              },
              {
                n: '03',
                icon: ListChecks,
                title: 'Promesses, acomptes, litiges : tout est suivi.',
                text: 'Un règlement partiel, une promesse pour vendredi, une facture contestée : chaque situation reste visible et exploitable.',
              },
            ].map((f) => (
              <article className="rf-feature" key={f.n}>
                <div>
                  <f.icon size={24} />
                  <span>{f.n}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="rf-control">
          <div>
            <span className="rf-eyebrow">AUCUNE RELANCE GÊNANTE</span>
            <h2>
              Des soldes vérifiés
              <br />
              avant de relancer.
            </h2>
            <p>
              Actualisez les règlements reçus : Encair ne consulte pas votre banque. Sans solde confirmé depuis sept jours, rien ne part. Une promesse,
              un litige ou un règlement complet enregistré mettent les envois en pause
              automatiquement.
            </p>
            <Link href="/auth/register" className="rf-button rf-button-light">
              {CTA_LABEL} <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="rf-control-list">
            {[
              ['01', 'Paiement reçu', 'Le solde à zéro arrête les relances.'],
              [
                '02',
                'Promesse enregistrée',
                'La relance attend la date annoncée.',
              ],
              ['03', 'Facture contestée', 'Le litige suspend les envois.'],
              [
                '04',
                'Solde à vérifier',
                'Après sept jours, l’automatisation attend votre validation.',
              ],
            ].map(([n, title, text]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <Check size={18} />
              </div>
            ))}
          </div>
        </section>
        <PricingSection />
        <section className="rf-section" aria-labelledby="securite-titre">
          <div className="rf-section-heading">
            <div>
              <span className="rf-eyebrow">SÉCURITÉ ET DONNÉES</span>
              <h2 id="securite-titre">
                Vos factures restent
                <br />
                les vôtres.
              </h2>
            </div>
            <p>
              Montants dus, coordonnées de vos clients : des données sensibles,
              protégées et exportables à tout moment.{' '}
              <Link href="/securite" className="rf-link">
                Le détail des mesures
              </Link>
            </p>
          </div>
          <div className="rf-feature-grid">
            {[
              {
                icon: MapPin,
                title: 'Hébergement européen.',
                text: 'Base de données dans l’Union européenne (Suède), application exécutée à Paris, connexion chiffrée (HTTPS) imposée.',
              },
              {
                icon: LockKeyhole,
                title: 'Chaque compte est cloisonné.',
                text: 'Un compte ne voit que ses propres factures. Ce cloisonnement est vérifié par des tests automatisés à chaque modification du code.',
              },
              {
                icon: Download,
                title: 'Sortie libre, sans condition.',
                text: 'Export CSV de vos factures et export complet de votre compte en libre-service, même après l’essai. Suppression sur simple demande.',
              },
            ].map((f) => (
              <article className="rf-feature" key={f.title}>
                <div>
                  <f.icon size={24} aria-hidden="true" />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="rf-section rf-faq rf-founder" aria-labelledby="fondateur">
          <div>
            <span className="rf-eyebrow">QUI EST DERRIÈRE</span>
            <h2 id="fondateur">
              Un fondateur,
              <br />
              joignable.
            </h2>
          </div>
          <div>
            <p className="rf-lead">
              Encair est conçu par {PUBLISHER.name}, alternant en cabinet
              d’expertise comptable. J’y vois chaque semaine des petites
              entreprises perdre du temps à relancer, faute de savoir qui a
              promis quoi.
            </p>
            <p className="rf-lead">
              Encair est en lancement : vous faites partie des premiers
              utilisateurs, et je lis chaque retour.{' '}
              {CONTACT_EMAIL ? (
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              ) : (
                <Link href="/contact">Me poser une question</Link>
              )}
            </p>
          </div>
        </section>
        <section id="faq" className="rf-section rf-faq rf-questions">
          <div>
            <span className="rf-eyebrow">EN TOUTE CLARTÉ</span>
            <h2>Avant de vous lancer.</h2>
          </div>
          <div className="rf-question-grid">
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="rf-final">
          <span className="rf-eyebrow">VOTRE PROCHAINE ÉTAPE</span>
          <h2>
            Votre première facture suivie.
            <br />
            Dès aujourd’hui.
          </h2>
          <Link href="/auth/register" className="rf-button rf-button-dark">
            {CTA_LABEL} <ArrowUpRight size={18} />
          </Link>
          <p>{TRIAL_LINE}</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
