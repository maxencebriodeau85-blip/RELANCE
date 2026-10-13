import { LegalLayout } from '@/components/legal/legal-layout'
export const metadata = { title: 'Mentions légales | Encair' }
export default function LegalPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated="13 octobre 2026">
      <h2>Éditeur</h2>
      <p>
        {process.env.PUBLISHER_NAME ||
          'Identité de l’éditeur à renseigner avant ouverture commerciale.'}
      </p>
      <p>
        {process.env.PUBLISHER_ADDRESS ||
          'Adresse professionnelle à renseigner.'}
      </p>
      <p>
        {process.env.PUBLISHER_REGISTRATION ||
          'Informations d’immatriculation à renseigner.'}
      </p>
      <h2>Contact</h2>
      <p>
        <a href="/contact">Contacter l’éditeur</a>
      </p>
      <h2>Hébergement et données</h2>
      <p>
        Le site utilise Vercel pour son hébergement et Supabase pour sa base de
        données. Les prestataires et les traitements sont décrits dans la{' '}
        <a href="/privacy">politique de confidentialité</a>.
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>
        Le nom, le contenu et l’interface Encair sont réservés à leur titulaire.
        Les logiciels tiers conservent leurs licences respectives.
      </p>
    </LegalLayout>
  )
}
