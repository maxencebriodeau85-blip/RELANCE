import Link from 'next/link'
import { ArrowUpRight, Check } from 'lucide-react'
import { CTA_LABEL, OFFER, TRIAL_LINE } from '@/lib/plans'

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
            Un seul abonnement pour suivre vos impayés. Pendant l’essai,
            importez vos {OFFER.trialInvoiceLimit} plus gros retards et voyez-les avancer.
          </p>
          <p className="rf-note">{TRIAL_LINE}</p>
        </div>
        <div className="rf-price-card">
          <span className="rf-tag">Tarif fondateur</span>
          <div className="rf-price">
            {OFFER.price}
            <span>€ HT / mois</span>
          </div>
          <p>Tarif public prévu : {OFFER.publicPrice} € HT/mois.</p>
          <p className="rf-note">
            {OFFER.price} € HT/mois conservés tant que votre abonnement reste
            actif, même quand le tarif public s’appliquera. Sans engagement.
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
            {CTA_LABEL} <ArrowUpRight size={18} />
          </Link>
          <p className="rf-note">
            Un utilisateur · Assistance par email · Résiliation en ligne
          </p>
        </div>
      </div>
    </section>
  )
}
