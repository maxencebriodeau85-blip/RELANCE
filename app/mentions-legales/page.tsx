import { LegalLayout } from '@/components/legal/legal-layout'

export const metadata = {
  title: 'Mentions légales | RelanceFlow',
  description: 'Mentions légales de RelanceFlow.',
}

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated="29 avril 2026">
      <h2>Éditeur du site</h2>
      <p>
        <strong>RelanceFlow SAS</strong>
        <br />
        Société par Actions Simplifiée au capital de 1 000 €<br />
        Siège social : Paris, France<br />
        RCS Paris (en cours d&apos;immatriculation)<br />
        Email : <a href="mailto:hello@relanceflow.fr">hello@relanceflow.fr</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>Le directeur de la publication est le représentant légal de RelanceFlow SAS.</p>

      <h2>Hébergement</h2>
      <p>
        Le service RelanceFlow est hébergé par :
      </p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> — 340 Pine Street, Suite 701, San Francisco, CA 94104, USA
          (infrastructure edge en Europe — région Paris CDG1)
        </li>
        <li>
          <strong>Supabase Inc.</strong> — base de données hébergée dans l&apos;Union Européenne
        </li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du contenu du site RelanceFlow (textes, logos, icônes, code source,
        structure) est protégé par le droit d&apos;auteur et appartient à RelanceFlow SAS ou à ses
        partenaires. Toute reproduction, représentation ou diffusion, même partielle, est interdite
        sans autorisation préalable écrite.
      </p>

      <h2>Protection des données personnelles</h2>
      <p>
        Le traitement des données personnelles des utilisateurs est décrit dans notre{' '}
        <a href="/privacy">Politique de confidentialité</a>. Conformément à la loi Informatique et
        Libertés du 6 janvier 1978 modifiée et au RGPD, vous disposez d&apos;un droit
        d&apos;accès, de rectification et de suppression de vos données en contactant{' '}
        <a href="mailto:privacy@relanceflow.fr">privacy@relanceflow.fr</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site utilise uniquement des cookies de session nécessaires au fonctionnement du service.
        Aucun cookie publicitaire n&apos;est déposé.
      </p>

      <h2>Limitation de responsabilité</h2>
      <p>
        RelanceFlow SAS ne saurait être tenu responsable des dommages directs ou indirects résultant
        de l&apos;utilisation du site ou de l&apos;impossibilité d&apos;y accéder. Les informations
        présentes sur le site sont fournies à titre indicatif et peuvent évoluer sans préavis.
      </p>

      <h2>Liens hypertextes</h2>
      <p>
        Le site peut contenir des liens vers des sites tiers. RelanceFlow SAS n&apos;exerce aucun
        contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Les présentes mentions légales sont soumises au droit français. Tout litige relèvera de la
        compétence exclusive des tribunaux de Paris.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question : <a href="mailto:hello@relanceflow.fr">hello@relanceflow.fr</a>
        <br />
        Ou via notre <a href="/support">page de support</a>.
      </p>
    </LegalLayout>
  )
}
