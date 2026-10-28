import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { PublicPage } from '@/components/landing/public-page'
import { JsonLd } from '@/components/seo/json-ld'
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo'
import { CONTACT_EMAIL } from '@/lib/legal'
import { CTA_LABEL } from '@/lib/plans'

export const metadata = pageMetadata({
  title: 'Sécurité et protection des données',
  description:
    'Où sont hébergées vos données, comment chaque compte est cloisonné, comment sont protégés mots de passe, clés d’API et paiements, et comment exporter ou supprimer vos données.',
  path: '/securite',
})

/** Mise à jour du contenu de cette page (à changer avec chaque modification). */
const SECURITY_LAST_UPDATED = '28 octobre 2026'

// Chaque affirmation ci-dessous correspond à un mécanisme vérifiable dans le
// code, la configuration ou les tests (voir docs/SECURITE.md). Ne rien
// ajouter qui ne soit pas en place : ni certification, ni sauvegarde, ni
// chiffrement non vérifié.
const SECTIONS: { id: string; title: string; points: React.ReactNode[] }[] = [
  {
    id: 'hebergement',
    title: 'Où sont vos données',
    points: [
      <>La base de données et l’authentification sont hébergées par Supabase dans l’Union européenne, à Stockholm (Suède).</>,
      <>L’application tourne chez Vercel ; ses fonctions serveur sont exécutées à Paris.</>,
      <>
        Les emails partent par Resend et l’abonnement est réglé par Stripe. La liste complète des
        prestataires, leur localisation et les garanties de transfert figurent dans la{' '}
        <Link href="/privacy">politique de confidentialité</Link>.
      </>,
    ],
  },
  {
    id: 'cloisonnement',
    title: 'Chaque compte est cloisonné',
    points: [
      <>
        Les règles de sécurité de la base (Row Level Security) filtrent chaque lecture et chaque écriture
        sur le compte connecté : un compte ne peut ni voir ni modifier les factures d’un autre, même en
        connaissant leur identifiant.
      </>,
      <>
        Ce cloisonnement est vérifié par des tests automatisés sur la base, l’API et les fiches PDF,
        exécutés à chaque modification du code.
      </>,
    ],
  },
  {
    id: 'acces',
    title: 'Connexion et mots de passe',
    points: [
      <>Tout le site est servi en HTTPS, imposé au navigateur (HSTS), avec une politique de sécurité du contenu (CSP) et une interdiction d’affichage dans un cadre tiers.</>,
      <>Les mots de passe sont gérés par le service d’authentification de Supabase : ils ne sont jamais stockés en clair.</>,
      <>
        À l’inscription et à la réinitialisation, le mot de passe est comparé aux fuites connues (base
        Have I Been Pwned) sans être transmis : seuls les 5 premiers caractères de son empreinte quittent
        le serveur.
      </>,
      <>Les opérations sensibles (export du compte, formulaire de contact, API) sont limitées en fréquence.</>,
    ],
  },
  {
    id: 'api',
    title: 'Clés d’API',
    points: [
      <>
        Une clé n’est affichée qu’une fois, à sa création. Encair n’en conserve qu’une empreinte (SHA-256) :
        personne, pas même l’éditeur, ne peut la relire.
      </>,
      <>Chaque clé est limitée à la lecture ou à la lecture-écriture, expire au bout d’un an et se révoque à tout moment.</>,
    ],
  },
  {
    id: 'paiement',
    title: 'Paiement',
    points: [<>Le paiement passe par Stripe : Encair ne voit ni ne conserve jamais votre numéro de carte.</>],
  },
  {
    id: 'envois',
    title: 'Des envois sous contrôle',
    points: [
      <>Les factures importées arrivent en pause : rien ne part avant que vous ayez vérifié et activé les relances.</>,
      <>Une promesse de paiement, un litige ou un solde non confirmé depuis sept jours suspend l’envoi automatique.</>,
      <>
        Chaque relance est réservée une seule fois et transmise avec une clé d’idempotence : un incident
        réseau ne fait pas partir deux fois la même relance.
      </>,
    ],
  },
  {
    id: 'donnees',
    title: 'Vos données, votre sortie',
    points: [
      <>Export CSV de vos factures et export complet de votre compte en libre-service (Paramètres &gt; Vos données), à tout moment.</>,
      <>Suppression du compte et des données sur simple demande, dans un délai d’un mois.</>,
      <>
        Pour les données de vos propres clients, Encair agit comme sous-traitant : ses engagements figurent
        dans l’<Link href="/dpa">accord de sous-traitance</Link>.
      </>,
    ],
  },
]

export default function SecurityPage() {
  return (
    <PublicPage>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Sécurité et données', path: '/securite' }])} />
      <div className="rf-page rf-page-narrow">
        <header className="rf-page-head">
          <span className="rf-eyebrow">Sécurité et données</span>
          <h1>Ce qui protège vos factures, concrètement.</h1>
          <p>
            Encair conserve des informations sensibles pour vous : montants dus, coordonnées de vos
            clients, historique des relances. Voici comment elles sont protégées, sans promesse que le
            produit ne tient pas.
          </p>
          <p className="rf-meta">Dernière mise à jour : {SECURITY_LAST_UPDATED}</p>
        </header>

        <nav aria-label="Sommaire" className="rf-card mb-12 block p-6">
          <p className="rf-eyebrow">Sommaire</p>
          <ol className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-[#2f3f50] underline-offset-4 hover:text-[#182b40] hover:underline">
                  <span className="mr-2 text-[#a74a28]">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="rf-prose">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titre`}>
              <h2 id={`${s.id}-titre`}>{s.title}</h2>
              <ul>
                {s.points.map((point, j) => (
                  <li key={j}>{point}</li>
                ))}
              </ul>
            </section>
          ))}

          <section id="signaler" aria-labelledby="signaler-titre">
            <h2 id="signaler-titre">Signaler une faille</h2>
            <p>
              Vous pensez avoir trouvé une vulnérabilité ? Écrivez à{' '}
              {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <Link href="/contact">l’éditeur</Link>}{' '}
              en décrivant le problème, sans accéder aux données d’autres comptes. Chaque signalement reçoit
              une réponse personnelle. Les coordonnées figurent aussi dans{' '}
              <a href="/.well-known/security.txt">security.txt</a>.
            </p>
          </section>
        </div>

        <section className="rf-panel mt-14" aria-labelledby="securite-essai">
          <span className="rf-eyebrow">Essai sans engagement</span>
          <h2 id="securite-essai" className="text-2xl font-semibold tracking-tight">
            Essayez avec des factures d’exemple.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed">
            Pas de fichier sous la main ? Chargez cinq factures fictives depuis le tableau de bord : aucune
            relance n’est jamais envoyée sur un exemple, et elles se suppriment en un clic.
          </p>
          <Link href="/auth/register" className="rf-button rf-button-light mt-6">
            {CTA_LABEL} <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </PublicPage>
  )
}
