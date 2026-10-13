import Link from 'next/link'
import { ArrowUpRight, Check } from 'lucide-react'
import { OFFER } from '@/lib/plans'

export function PricingSection() {
  return (
    <section id="pricing" className="rf-section">
      <div className="rf-price-layout">
        <div>
          <span className="rf-eyebrow">L’offre de lancement</span>
          <h2>
            Petit abonnement.
            <br />
            Grand soulagement.
          </h2>
          <p className="rf-lead">
            Un seul abonnement pour garder le fil de vos impayés. Essayez avec
            vos propres factures pendant {OFFER.trialDays} jours.
          </p>
          <p className="rf-note">
            10 factures pendant l’essai · Sans carte bancaire
          </p>
        </div>
        <div className="rf-price-card">
          <span className="rf-tag">Tarif fondateur</span>
          <div className="rf-price">
            {OFFER.price}
            <span>€ HT / mois</span>
          </div>
          <p>Tarif public prévu : {OFFER.publicPrice} € HT/mois.</p>
          <p className="rf-note">
            16 € HT/mois conservés tant que votre abonnement reste actif. Sans
            engagement.
          </p>
          <ul>
            {OFFER.features.map((feature) => (
              <li key={feature}>
                <Check size={17} />
                {feature}
              </li>
            ))}
          </ul>
          <Link href="/auth/register" className="rf-button rf-button-dark">
            Commencer mes 30 jours d’essai <ArrowUpRight size={18} />
          </Link>
          <p className="rf-note">
            Un utilisateur · Assistance par email · Résiliation en ligne
          </p>
        </div>
      </div>
    </section>
  )
}
