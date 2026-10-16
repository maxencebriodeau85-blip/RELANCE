/** One source for the editor, preview and actual outgoing reminders. */
export const REMINDER_TEMPLATES = [
  {
    type: 'email_1', label: '1re relance', tone: 'Premier rappel',
    defaultSubject: 'Rappel — Facture n°{{invoice_number}}',
    defaultBody: `Bonjour {{client_name}},

Sauf erreur de notre part, la facture n°{{invoice_number}}, arrivée à échéance le {{due_date}}, présente un solde de {{amount}} à régler.

Pouvez-vous nous confirmer la date prévue de règlement ? Si le paiement a déjà été effectué, merci de nous le signaler afin de mettre notre suivi à jour.

Cordialement,
{{creditor_name}}
{{creditor_email}}`,
  },
  {
    type: 'email_2', label: '2e relance', tone: 'Suivi du règlement',
    defaultSubject: 'Suivi du règlement — Facture n°{{invoice_number}}',
    defaultBody: `Bonjour {{client_name}},

Nous revenons vers vous concernant la facture n°{{invoice_number}}, échue le {{due_date}}. Le solde restant à régler est de {{amount}}.

Merci de nous indiquer une date de paiement ou de nous contacter si une difficulté empêche le règlement. Si vous avez déjà payé, transmettez-nous la référence du règlement.

Cordialement,
{{creditor_name}}
{{creditor_email}}`,
  },
  {
    type: 'email_3', label: '3e relance', tone: 'Dernier rappel amiable',
    defaultSubject: 'Dernier rappel amiable — Facture n°{{invoice_number}}',
    defaultBody: `Bonjour {{client_name}},

La facture n°{{invoice_number}}, échue le {{due_date}}, présente toujours un solde de {{amount}} après nos précédents rappels.

Merci de procéder au règlement ou de nous contacter pour convenir d’une date de paiement. En cas de contestation ou de règlement déjà effectué, répondez à ce message pour que nous puissions vérifier la situation.

Cordialement,
{{creditor_name}}
{{creditor_email}}`,
  },
] as const

export type EditableReminderType = typeof REMINDER_TEMPLATES[number]['type']
export const TEMPLATE_VARIABLES = [
  { name: 'client_name', desc: 'Nom du client' },
  { name: 'invoice_number', desc: 'Numéro de facture' },
  { name: 'amount', desc: 'Solde restant à régler, TTC' },
  { name: 'due_date', desc: 'Date d’échéance' },
  { name: 'days_overdue', desc: 'Jours de retard' },
  { name: 'creditor_name', desc: 'Votre nom commercial' },
  { name: 'creditor_email', desc: 'Votre adresse de réponse' },
  { name: 'description', desc: 'Désignation de la prestation' },
] as const
