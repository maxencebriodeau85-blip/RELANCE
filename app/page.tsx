import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Upload,
  Mail,
  ListChecks,
  ShieldCheck,
  CornerDownRight,
} from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'
import { PricingSection } from '@/components/landing/pricing-section'
import { ProductPreview } from '@/components/landing/product-preview'

const faq = [
  [
    'Dois-je changer de logiciel de facturation ?',
    'Non. Exportez vos factures au format CSV depuis votre outil actuel, puis importez-les dans Encair. Vous continuez à établir vos factures dans votre logiciel habituel.',
  ],
  [
    'Comment les paiements sont-ils mis à jour ?',
    'Actualisez votre fichier CSV avec la colonne « Reste à payer », ou renseignez le montant déjà encaissé sur la fiche de la facture. La connexion bancaire automatique ne fait pas partie de cette offre.',
  ],
  [
    'Est-ce que les relances partent immédiatement ?',
    'Les nouvelles factures sont importées en pause. Vérifiez les informations, confirmez le solde et activez les relances. Une promesse de paiement, un litige ou un solde non vérifié depuis sept jours suspend l’envoi automatique.',
  ],
  [
    'Que comprend le tarif fondateur ?',
    '100 nouvelles factures par mois, l’actualisation des factures existantes, les relances email, leurs modèles et le suivi des paiements. Le tarif de 16 € HT/mois est conservé tant que l’abonnement reste actif. Le tarif public prévu est de 29 € HT/mois.',
  ],
  [
    'Puis-je essayer avant de payer ?',
    'Oui : 30 jours d’essai sans carte bancaire, avec 10 factures. Aucun abonnement n’est déclenché automatiquement à la fin de l’essai.',
  ],
]
export default function HomePage() {
  return (
    <div className="rf-site">
      <SiteNav />
      <main id="main-content">
        <section className="rf-hero">
          <div className="rf-hero-copy">
            <div className="rf-launch">
              <span /> Pour les petites entreprises qui veulent garder le fil
            </div>
            <h1>
              Vos factures attendent.
              <br />
              <em>Votre activité, non.</em>
            </h1>
            <p>
              Importez vos impayés, préparez vos relances et suivez chaque
              promesse de paiement. Retrouvez une vue claire sur l’argent qui
              vous est dû.
            </p>
            <div className="rf-hero-actions">
              <Link className="rf-button rf-button-dark" href="/auth/register">
                Essayer gratuitement <ArrowUpRight size={19} />
              </Link>
              <a href="#produit" className="rf-text-link">
                Découvrir le produit <ArrowRight size={17} />
              </a>
            </div>
            <div className="rf-hero-proof">
              <span>
                <Check size={15} />
                30 jours sans carte bancaire
              </span>
              <span>
                <Check size={15} />
                Puis 16 € HT/mois
              </span>
            </div>
          </div>
          <div className="rf-hero-aside" aria-hidden="true">
            <span className="rf-aside-line" />
            <p>
              Moins de « je vous relance ».
              <br />
              <b>Plus de visibilité.</b>
            </p>
            <CornerDownRight size={34} />
          </div>
        </section>
        <section id="produit" className="rf-product-wrap">
          <ProductPreview />
        </section>
        <div className="rf-principles">
          <span>Votre logiciel de facturation reste le même.</span>
          <span>
            <ShieldCheck size={17} />
            Vous gardez la main sur les envois.
          </span>
          <span>Un tarif. L’essentiel.</span>
        </div>
        <section id="fonctionnalites" className="rf-section">
          <div className="rf-section-heading">
            <div>
              <span className="rf-eyebrow">DU FICHIER À L’ACTION</span>
              <h2>
                Un suivi qui avance.
                <br />
                Avec vous.
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
                title: 'Rassemblez vos impayés.',
                text: 'Importez votre CSV et associez ses colonnes. Réimportez ensuite les soldes pour actualiser les factures existantes.',
              },
              {
                n: '02',
                icon: Mail,
                title: 'Trouvez les bons mots.',
                text: 'Personnalisez vos modèles et choisissez un rythme de relance. Consultez l’historique des envois sur chaque facture.',
              },
              {
                n: '03',
                icon: ListChecks,
                title: 'Gardez une longueur d’avance.',
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
            <span className="rf-eyebrow">AUTOMATISER AVEC DISCERNEMENT</span>
            <h2>
              La bonne relance.
              <br />
              Au bon moment.
            </h2>
            <p>
              Les paiements ne se devinent pas. Encair vous demande des soldes à
              jour et met les envois en pause quand une vérification est
              nécessaire.
            </p>
            <Link href="/auth/register" className="rf-button rf-button-light">
              Reprendre le contrôle <ArrowUpRight size={18} />
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
        <section id="faq" className="rf-section rf-faq">
          <div>
            <span className="rf-eyebrow">EN TOUTE CLARTÉ</span>
            <h2>
              Avant de
              <br />
              vous lancer.
            </h2>
          </div>
          <div>
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
            Créer mon espace <ArrowUpRight size={18} />
          </Link>
          <p>30 jours gratuits · Sans carte bancaire</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
