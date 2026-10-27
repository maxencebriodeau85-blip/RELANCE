import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/legal-layout'
import { ContactLink, LegalField } from '@/components/legal/legal-field'
import {
  CONTACT_EMAIL,
  PRIVACY_LAST_UPDATED,
  PUBLISHER,
  SUBPROCESSORS,
} from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Données traitées par Encair, finalités, durées de conservation, prestataires, transferts hors UE et droits.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      lastUpdated={PRIVACY_LAST_UPDATED}
    >
      <p>
        Cette politique explique quelles données personnelles Encair traite,
        pourquoi, combien de temps, et comment exercer vos droits, conformément
        au Règlement général sur la protection des données (RGPD) et à la loi
        Informatique et Libertés.
      </p>

      <h2>1. Qui est responsable de vos données ?</h2>
      <p>
        <strong>{PUBLISHER.name}</strong>, {PUBLISHER.legalForm} exerçant sous
        le nom Encair, adresse : <LegalField value={PUBLISHER.address} />,
        contact : <ContactLink email={CONTACT_EMAIL} />. Aucun délégué à la
        protection des données n’est désigné.
      </p>
      <p>Encair intervient à deux titres différents :</p>
      <ul>
        <li>
          <strong>Responsable de traitement</strong> pour les données de ses
          clients et de ses visiteurs (compte, abonnement, formulaire de
          contact). C’est l’objet de cette page.
        </li>
        <li>
          <strong>Sous-traitant</strong> pour les données des clients de nos
          clients (les débiteurs dont les factures sont importées). Pour ces
          données, c’est notre client qui est responsable de traitement ; les
          engagements d’Encair figurent dans l’
          <a href="/dpa">accord de sous-traitance</a>. Un débiteur qui souhaite
          exercer ses droits s’adresse à l’entreprise qui lui a envoyé la
          relance ; si la demande nous parvient, nous la lui transmettons.
        </li>
      </ul>

      <h2>2. Données traitées</h2>
      <ul>
        <li>
          <strong>Compte</strong> : email professionnel, nom ou raison sociale,
          mot de passe (stocké sous forme hachée, jamais en clair), date
          d’acceptation des conditions générales.
        </li>
        <li>
          <strong>Abonnement</strong> : historique des paiements et factures
          d’abonnement. Les données de carte bancaire sont traitées uniquement
          par Stripe.
        </li>
        <li>
          <strong>Contact</strong> : nom, email et contenu des messages envoyés
          par le formulaire.
        </li>
        <li>
          <strong>Sécurité</strong> : journaux de connexion et d’actions.
        </li>
        <li>
          <strong>Mesure d’audience</strong> : pages vues et indicateurs de
          performance, sans cookie et sans identifiant personnel (Vercel
          Analytics et Speed Insights).
        </li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>
          Fournir le Service et gérer votre compte : exécution du contrat.
        </li>
        <li>Gérer l’abonnement et sa facturation : exécution du contrat.</li>
        <li>
          Conserver les pièces comptables : obligation légale (article L123-22
          du Code de commerce).
        </li>
        <li>Répondre à vos messages : intérêt légitime.</li>
        <li>
          Sécuriser le Service et mesurer son audience de façon anonyme :
          intérêt légitime.
        </li>
        <li>
          Vous informer des évolutions importantes du Service : exécution du
          contrat.
        </li>
      </ul>

      <h2>4. Durées de conservation</h2>
      <ul>
        <li>Compte actif : pendant toute la durée de l’abonnement.</li>
        <li>
          Après la fin de l’abonnement : export possible pendant 30 jours, puis
          suppression dans un délai de 90 jours.
        </li>
        <li>
          Essai non converti : suppression prévue six mois après la fin de
          l’essai, traitée par l’éditeur.
        </li>
        <li>Pièces comptables liées à l’abonnement : 10 ans.</li>
        <li>
          Messages du formulaire de contact : 3 ans après le dernier échange.
        </li>
        <li>
          Journal technique des requêtes API réussies : 30 jours minimum pour
          éviter les doublons ; nettoyage lors des passages du traitement
          planifié. Les clés révoquées restent listées jusqu’à suppression du
          compte.
        </li>
      </ul>

      <p>
        Vous pouvez exporter à tout moment toutes les données de votre compte
        depuis Paramètres, rubrique « Vos données » (fichier JSON). Les demandes
        de suppression sont adressées au contact indiqué sur cette page, depuis
        l’adresse du compte : l’éditeur résilie l’abonnement éventuel puis
        supprime le compte et toutes ses données dans un délai d’un mois. Aucune
        purge automatique des comptes inactifs n’est annoncée.
      </p>

      <h2>5. Prestataires et transferts hors Union européenne</h2>
      <p>
        Vos données ne sont jamais vendues. Elles sont traitées par les
        prestataires suivants :
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Prestataire</th>
              <th className="py-2 pr-3">Rôle</th>
              <th className="py-2 pr-3">Localisation</th>
              <th className="py-2">Garanties</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((p) => (
              <tr key={p.name} className="border-b align-top">
                <td className="py-2 pr-3 font-medium text-gray-900">
                  {p.name} ({p.country})
                </td>
                <td className="py-2 pr-3">{p.purpose}</td>
                <td className="py-2 pr-3">{p.location}</td>
                <td className="py-2">{p.safeguard}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Plusieurs de ces prestataires sont des sociétés américaines : des
        données peuvent donc être accessibles depuis les États-Unis. Ces
        transferts sont encadrés par les garanties indiquées ci-dessus. Encair
        n’utilise aucun service d’intelligence artificielle pour traiter vos
        données.
      </p>

      <h2>6. Vos droits</h2>
      <p>
        Vous disposez des droits d’accès, de rectification, d’effacement, de
        limitation, d’opposition et de portabilité, ainsi que du droit de
        définir des directives sur le sort de vos données après votre décès.
        Pour les exercer : <ContactLink email={CONTACT_EMAIL} />. Nous répondons
        dans un délai d’un mois. Vous pouvez aussi introduire une réclamation
        auprès de la{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
          CNIL
        </a>
        .
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS), les données sont chiffrées au repos
        et chaque compte n’accède qu’à ses propres données grâce à des règles
        d’accès appliquées par la base de données.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Encair n’utilise qu’un cookie strictement nécessaire au maintien de
        votre connexion. La mesure d’audience fonctionne sans cookie. Sur la
        page de paiement de l’abonnement, Stripe dépose ses propres cookies,
        nécessaires à la prévention de la fraude.
      </p>

      <h2>9. Contact</h2>
      <p>
        Pour toute question sur vos données :{' '}
        <ContactLink email={CONTACT_EMAIL} />.
      </p>
    </LegalLayout>
  )
}
