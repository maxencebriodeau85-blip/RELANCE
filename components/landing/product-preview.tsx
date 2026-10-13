'use client'
import { useState } from 'react'
import { ArrowUpRight, Check, Clock3, Mail, MoreHorizontal } from 'lucide-react'
const invoices = [
  {
    name: 'Studio Rivage',
    initials: 'SR',
    ref: 'FAC-2026-041',
    amount: '2 400 €',
    state: 'À relancer',
    color: 'orange',
    note: 'Échéance dépassée de 12 jours',
    action: 'Préparer la relance',
    text: 'Bonjour, sauf erreur de notre part, la facture FAC-2026-041 de 2 400 € reste à régler. Pouvez-vous nous confirmer la date de règlement prévue ? Merci !',
  },
  {
    name: 'Maison Auguste',
    initials: 'MA',
    ref: 'FAC-2026-038',
    amount: '1 850 €',
    state: 'Promesse reçue',
    color: 'green',
    note: 'Règlement annoncé pour vendredi',
    action: 'Voir la promesse',
    text: 'Maison Auguste a annoncé un règlement vendredi. Les relances sont suspendues jusqu’à cette date. Vous pourrez vérifier le paiement à l’échéance.',
  },
  {
    name: 'Atelier Nord',
    initials: 'AN',
    ref: 'FAC-2026-032',
    amount: '960 €',
    state: 'En litige',
    color: 'gray',
    note: 'Bon de commande demandé',
    action: 'Voir le suivi',
    text: 'Le client demande une copie du bon de commande. La facture reste visible dans vos encours ; les relances sont suspendues pendant le traitement du litige.',
  },
]
export function ProductPreview() {
  const [selected, setSelected] = useState(0)
  const [opened, setOpened] = useState(false)
  const invoice = invoices[selected]
  return (
    <div
      className="rf-preview"
      aria-label="Aperçu interactif avec des données fictives"
    >
      <div className="rf-preview-top">
        <div className="rf-mini-brand">
          <span>e↗</span> Votre espace de suivi
        </div>
        <span className="rf-demo-label">Données de démonstration</span>
      </div>
      <div className="rf-preview-body">
        <div className="rf-preview-heading">
          <div>
            <span className="rf-eyebrow">VOTRE TRÉSORERIE, AU CLAIR</span>
            <h3>Chaque paiement a sa suite.</h3>
          </div>
          <span className="rf-avatar">MB</span>
        </div>
        <div className="rf-demo-kpis">
          <div>
            <span>Reste à encaisser</span>
            <strong>
              5 210 <small>€</small>
            </strong>
            <p>3 factures suivies</p>
          </div>
          <div>
            <span>À relancer</span>
            <strong>
              2 400 <small>€</small>
            </strong>
            <p className="rf-orange">1 action à préparer</p>
          </div>
          <div>
            <span>Paiement promis</span>
            <strong>
              1 850 <small>€</small>
            </strong>
            <p>À vérifier vendredi</p>
          </div>
        </div>
        <div className="rf-demo-grid">
          <div>
            <div className="rf-table-title">
              Vos priorités <MoreHorizontal size={18} />
            </div>
            {invoices.map((item, i) => (
              <button
                key={item.ref}
                onClick={() => {
                  setSelected(i)
                  setOpened(false)
                }}
                className={`rf-invoice-row ${selected === i ? 'is-selected' : ''}`}
                aria-pressed={selected === i}
              >
                <span className={`rf-client-avatar ${item.color}`}>
                  {item.initials}
                </span>
                <span className="rf-client-name">
                  <b>{item.name}</b>
                  <small>{item.ref}</small>
                </span>
                <span className="rf-client-amount">
                  <b>{item.amount}</b>
                  <small className={`rf-state ${item.color}`}>
                    {item.state}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <aside className="rf-next-action">
            <div className="rf-action-icon">
              {selected === 0 ? (
                <Mail size={20} />
              ) : selected === 1 ? (
                <Clock3 size={20} />
              ) : (
                <MoreHorizontal size={20} />
              )}
            </div>
            <span className="rf-eyebrow">Prochaine action</span>
            <h4>{invoice.name}</h4>
            <p>{opened ? invoice.text : invoice.note}</p>
            <button onClick={() => setOpened(!opened)}>
              {opened ? 'Revenir au suivi' : invoice.action}
              {opened ? <Check size={15} /> : <ArrowUpRight size={15} />}
            </button>
          </aside>
        </div>
        <p className="rf-preview-foot">
          Cliquez sur un client pour explorer le suivi. Aucun email n’est
          envoyé.
        </p>
      </div>
    </div>
  )
}
