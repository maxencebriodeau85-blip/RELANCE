import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/legal-layout'
import { ContactLink, LegalField } from '@/components/legal/legal-field'
import { CONTACT_EMAIL, HOST, LEGAL_LAST_UPDATED, PUBLISHER, VAT_MENTION } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Éditeur, directeur de la publication et hébergeur du site Encair.',
  alternates: { canonical: '/mentions-legales' },
}

export default function LegalPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated={LEGAL_LAST_UPDATED}>
      <h2>Éditeur du site</h2>
      <ul>
        <li>
          <strong>{PUBLISHER.name}</strong>, {PUBLISHER.legalForm.toLowerCase()}, exerçant sous le
          nom commercial <strong>{PUBLISHER.tradeName}</strong>
        </li>
        <li>
          Adresse : <LegalField value={PUBLISHER.address} />
        </li>
        <li>
          SIREN : <LegalField value={PUBLISHER.siren} />
          {PUBLISHER.siren ? ' — immatriculé au Registre national des entreprises' : null}
        </li>
        <li>{VAT_MENTION}</li>
        <li>
          Email : <ContactLink email={CONTACT_EMAIL} />
        </li>
        <li>
          Téléphone : <LegalField value={PUBLISHER.phone} />
        </li>
      </ul>

      <h2>Directeur de la publication</h2>
      <p>{PUBLISHER.name}</p>

      <h2>Hébergement</h2>
      <p>
        <strong>{HOST.name}</strong>, {HOST.address} —{' '}
        <a href={HOST.site} target="_blank" rel="noopener noreferrer">
          vercel.com
        </a>
        . {HOST.note}
      </p>
      <p>
        La base de données est hébergée par <strong>Supabase, Inc.</strong> dans l’Union
        européenne (Suède). La liste complète des prestataires figure dans la{' '}
        <a href="/privacy">politique de confidentialité</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le nom Encair, les textes, l’interface et le code du site sont la propriété de{' '}
        {PUBLISHER.name}. Toute reproduction sans autorisation est interdite. Les logiciels
        tiers conservent leurs licences respectives.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Les traitements de données sont décrits dans la{' '}
        <a href="/privacy">politique de confidentialité</a> et, pour les données de vos
        clients importées dans Encair, dans l’<a href="/dpa">accord de sous-traitance</a>.
      </p>
    </LegalLayout>
  )
}
