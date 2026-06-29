// Escape user-controlled strings before inserting into HTML to prevent XSS.
// Email clients render HTML, so any unescaped data is a live attack surface.
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface EmailTemplateData {
  creditorName: string
  creditorEmail: string
  clientName: string
  invoiceNumber: string
  amount: number
  dueDate: string
  daysOverdue: number
  invoiceId?: string
  paymentUrl?: string
  description?: string | null
  vat_mention?: string | null
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export const EMAIL_SUBJECTS = {
  email_cordial: (invoiceNumber: string) =>
    `Rappel amiable – Facture n°${invoiceNumber}`,
  email_ferme: (invoiceNumber: string) =>
    `Relance – Facture n°${invoiceNumber} en attente de règlement`,
  email_precontentieux: (invoiceNumber: string) =>
    `URGENT – Dernière relance avant mise en demeure – Facture n°${invoiceNumber}`,
  formal_notice: (invoiceNumber: string) =>
    `MISE EN DEMEURE – Facture n°${invoiceNumber}`,
}

export function getEmailCordial(data: EmailTemplateData): {
  subject: string
  html: string
  text: string
} {
  const { creditorName, clientName, invoiceNumber, amount, dueDate, description, paymentUrl } = data
  const subject = EMAIL_SUBJECTS.email_cordial(invoiceNumber)

  const eName = escapeHtml(creditorName)
  const eClient = escapeHtml(clientName)
  const eInvoice = escapeHtml(invoiceNumber)
  const eDesc = description ? escapeHtml(description) : null

  const paymentButton = paymentUrl
    ? `<div style="text-align:center;margin:24px 0;"><a href="${escapeHtml(paymentUrl)}" style="background:#3B82F6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">Régler la facture en ligne</a></div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #3B82F6; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="color: #1E40AF; margin: 0;">${eName}</h2>
  </div>

  <p>Bonjour ${eClient},</p>

  <p>Nous nous permettons de vous contacter concernant la facture référencée ci-dessous, dont l'échéance est passée.</p>

  <div style="background: #F0F9FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <p style="margin: 4px 0;"><strong>Facture n° :</strong> ${eInvoice}</p>
    ${eDesc ? `<p style="margin: 4px 0;"><strong>Objet :</strong> ${eDesc}</p>` : ''}
    <p style="margin: 4px 0;"><strong>Montant TTC :</strong> ${formatEuro(amount)}</p>
    <p style="margin: 4px 0;"><strong>Date d'échéance :</strong> ${formatDate(dueDate)}</p>
  </div>

  ${paymentButton}

  <p>Il est possible que ce paiement ait été effectué ou soit en cours de traitement, auquel cas nous vous prions de ne pas tenir compte de ce message.</p>

  <p>Dans le cas contraire, nous vous serions reconnaissants de bien vouloir procéder au règlement de cette somme dans les meilleurs délais, ou de nous contacter si vous avez des questions.</p>

  <p>Cordialement,<br><strong>${eName}</strong></p>

  <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9CA3AF;">
    <p>Ce message est généré automatiquement par RelanceFlow. Pour toute question, contactez directement ${eName}.</p>
  </div>
</body>
</html>`

  const text = `Bonjour ${clientName},

Nous nous permettons de vous contacter concernant la facture référencée ci-dessous, dont l'échéance est passée.

Facture n° : ${invoiceNumber}
Montant TTC : ${formatEuro(amount)}
Date d'échéance : ${formatDate(dueDate)}
${paymentUrl ? `\nRégler en ligne : ${paymentUrl}\n` : ''}
Il est possible que ce paiement ait été effectué ou soit en cours de traitement, auquel cas nous vous prions de ne pas tenir compte de ce message.

Dans le cas contraire, nous vous serions reconnaissants de bien vouloir procéder au règlement de cette somme dans les meilleurs délais.

Cordialement,
${creditorName}`

  return { subject, html, text }
}

export function getEmailFerme(data: EmailTemplateData): {
  subject: string
  html: string
  text: string
} {
  const { creditorName, clientName, invoiceNumber, amount, dueDate, daysOverdue, description, paymentUrl } = data
  const subject = EMAIL_SUBJECTS.email_ferme(invoiceNumber)

  const eName = escapeHtml(creditorName)
  const eClient = escapeHtml(clientName)
  const eInvoice = escapeHtml(invoiceNumber)
  const eDesc = description ? escapeHtml(description) : null

  const paymentButton = paymentUrl
    ? `<div style="text-align:center;margin:24px 0;"><a href="${escapeHtml(paymentUrl)}" style="background:#F59E0B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">Payer ${formatEuro(amount)} maintenant</a></div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #F59E0B; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="color: #92400E; margin: 0;">${eName}</h2>
    <p style="color: #D97706; margin: 4px 0; font-size: 14px;">RELANCE – Facture impayée</p>
  </div>

  <p>Bonjour ${eClient},</p>

  <p>Sauf erreur ou omission de notre part, nous n'avons pas encore reçu le paiement de la facture suivante, dont l'échéance est dépassée depuis <strong>${daysOverdue} jour(s)</strong>.</p>

  <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <p style="margin: 4px 0;"><strong>Facture n° :</strong> ${eInvoice}</p>
    ${eDesc ? `<p style="margin: 4px 0;"><strong>Objet :</strong> ${eDesc}</p>` : ''}
    <p style="margin: 4px 0;"><strong>Montant TTC :</strong> <span style="color: #DC2626; font-size: 18px; font-weight: bold;">${formatEuro(amount)}</span></p>
    <p style="margin: 4px 0;"><strong>Échéance :</strong> ${formatDate(dueDate)}</p>
    <p style="margin: 4px 0;"><strong>Jours de retard :</strong> ${daysOverdue} jour(s)</p>
  </div>

  ${paymentButton}

  <p>Nous vous rappelons que conformément aux dispositions légales (art. L441-10 C.com.), des <strong>pénalités de retard</strong> sont applicables à compter du jour suivant la date d'échéance.</p>

  <p><strong>Merci de bien vouloir procéder au règlement dans un délai de 8 jours.</strong> Sans réponse de votre part, nous serons contraints d'engager les procédures de recouvrement nécessaires.</p>

  <p>Si le paiement a déjà été effectué, veuillez nous en informer.</p>

  <p>Cordialement,<br><strong>${eName}</strong></p>

  <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9CA3AF;">
    <p>Ce message est généré automatiquement par RelanceFlow.</p>
  </div>
</body>
</html>`

  const text = `Bonjour ${clientName},

Sauf erreur ou omission de notre part, nous n'avons pas encore reçu le paiement de la facture suivante, dont l'échéance est dépassée depuis ${daysOverdue} jour(s).

Facture n° : ${invoiceNumber}
Montant TTC : ${formatEuro(amount)}
Échéance : ${formatDate(dueDate)}
Jours de retard : ${daysOverdue} jour(s)
${paymentUrl ? `\nPayer maintenant : ${paymentUrl}\n` : ''}
Des pénalités de retard (art. L441-10 C.com.) sont applicables.

Merci de bien vouloir procéder au règlement dans un délai de 8 jours. Sans réponse de votre part, nous serons contraints d'engager les procédures de recouvrement nécessaires.

Cordialement,
${creditorName}`

  return { subject, html, text }
}

export function getEmailPrecontentieux(data: EmailTemplateData): {
  subject: string
  html: string
  text: string
} {
  const { creditorName, clientName, invoiceNumber, amount, dueDate, daysOverdue, description } = data
  const subject = EMAIL_SUBJECTS.email_precontentieux(invoiceNumber)

  const eName = escapeHtml(creditorName)
  const eClient = escapeHtml(clientName)
  const eInvoice = escapeHtml(invoiceNumber)
  const eDesc = description ? escapeHtml(description) : null

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #FEF2F2; border: 2px solid #DC2626; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
    <h2 style="color: #991B1B; margin: 0;">&#9888;&#65039; DERNIER AVERTISSEMENT AVANT MISE EN DEMEURE</h2>
    <p style="color: #DC2626; margin: 4px 0; font-weight: bold;">${eName}</p>
  </div>

  <p>Bonjour ${eClient},</p>

  <p>Malgré nos relances précédentes, nous n'avons toujours pas reçu le règlement de la facture suivante, en souffrance depuis <strong>${daysOverdue} jours</strong>.</p>

  <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <p style="margin: 4px 0;"><strong>Facture n° :</strong> ${eInvoice}</p>
    ${eDesc ? `<p style="margin: 4px 0;"><strong>Objet :</strong> ${eDesc}</p>` : ''}
    <p style="margin: 4px 0;"><strong>Montant principal :</strong> <span style="color: #DC2626; font-size: 20px; font-weight: bold;">${formatEuro(amount)}</span></p>
    <p style="margin: 4px 0;"><strong>Échéance initiale :</strong> ${formatDate(dueDate)}</p>
    <p style="margin: 4px 0;"><strong>Retard :</strong> ${daysOverdue} jours</p>
    <p style="margin: 8px 0 4px 0; color: #DC2626;"><strong>+ Pénalités de retard et indemnité forfaitaire de 40 € applicables</strong></p>
  </div>

  <div style="background: #FFF7ED; border: 1px solid #F59E0B; padding: 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0; font-weight: bold; color: #92400E;">
      Sans règlement intégral de votre dette sous <u>8 jours calendaires</u> à compter de la réception de ce message, nous procéderons à l'envoi d'une mise en demeure par lettre recommandée avec accusé de réception, préalable à toute action judiciaire de recouvrement.
    </p>
  </div>

  <p>Cette procédure engendrera des frais supplémentaires à votre charge. Nous vous encourageons vivement à régulariser votre situation sans délai.</p>

  <p>Pour tout règlement ou accord de paiement, contactez-nous immédiatement.</p>

  <p>Le Service Comptabilité,<br><strong>${eName}</strong></p>

  <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9CA3AF;">
    <p>Références légales : Art. L441-10 à L441-12 du Code de commerce. Ce courrier électronique constitue une mise en garde formelle.</p>
  </div>
</body>
</html>`

  const text = `DERNIER AVERTISSEMENT AVANT MISE EN DEMEURE

Bonjour ${clientName},

Malgré nos relances précédentes, nous n'avons toujours pas reçu le règlement de la facture suivante, en souffrance depuis ${daysOverdue} jours.

Facture n° : ${invoiceNumber}
Montant principal : ${formatEuro(amount)}
Échéance initiale : ${formatDate(dueDate)}
Retard : ${daysOverdue} jours
+ Pénalités de retard et indemnité forfaitaire de 40 € applicables

Sans règlement intégral de votre dette sous 8 jours calendaires à compter de la réception de ce message, nous procéderons à l'envoi d'une mise en demeure par lettre recommandée avec accusé de réception, préalable à toute action judiciaire de recouvrement.

Cette procédure engendrera des frais supplémentaires à votre charge. Nous vous encourageons vivement à régulariser votre situation sans délai.

Le Service Comptabilité,
${creditorName}`

  return { subject, html, text }
}

export function getEmailFormalNotice(data: EmailTemplateData): {
  subject: string
  html: string
  text: string
} {
  const { creditorName, creditorEmail, clientName, invoiceNumber, amount, dueDate, daysOverdue, description, paymentUrl } = data
  const subject = EMAIL_SUBJECTS.formal_notice(invoiceNumber)

  const eName = escapeHtml(creditorName)
  const eClient = escapeHtml(clientName)
  const eInvoice = escapeHtml(invoiceNumber)
  const eDesc = description ? escapeHtml(description) : null
  const eEmail = escapeHtml(creditorEmail)

  const paymentButton = paymentUrl
    ? `<div style="text-align:center;margin:24px 0;"><a href="${escapeHtml(paymentUrl)}" style="background:#DC2626;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">Régler la facture maintenant</a></div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #991B1B; padding: 16px; margin-bottom: 24px; border-radius: 8px; text-align:center;">
    <h2 style="color: #FFF; margin: 0; font-size:18px; letter-spacing:1px;">MISE EN DEMEURE</h2>
    <p style="color: #FCA5A5; margin: 4px 0; font-size:13px;">${eName}</p>
  </div>

  <p>Bonjour ${eClient},</p>

  <p>Par la présente, nous vous adressons une <strong>mise en demeure</strong> de régler la créance suivante, demeurée impayée depuis <strong>${daysOverdue} jours</strong> malgré nos relances successives.</p>

  <div style="background: #FEF2F2; border: 2px solid #DC2626; padding: 16px; margin: 24px 0; border-radius: 6px;">
    <p style="margin: 4px 0;"><strong>Facture n° :</strong> ${eInvoice}</p>
    ${eDesc ? `<p style="margin: 4px 0;"><strong>Objet :</strong> ${eDesc}</p>` : ''}
    <p style="margin: 4px 0;"><strong>Échéance contractuelle :</strong> ${formatDate(dueDate)}</p>
    <p style="margin: 4px 0;"><strong>Retard :</strong> ${daysOverdue} jours</p>
    <p style="margin: 8px 0 4px 0;"><strong>Montant principal dû :</strong> <span style="color:#DC2626;font-size:20px;font-weight:bold;">${formatEuro(amount)}</span></p>
    <p style="margin: 4px 0; font-size:12px; color:#6B7280;">+ pénalités de retard (taux BCE + 10 points) et indemnité forfaitaire de recouvrement de 40 € (art. L441-10 C.com.)</p>
  </div>

  <p>Vous êtes mis en demeure de procéder au règlement intégral de cette somme dans un délai de <strong>8 jours</strong> à compter de la réception de cet avis.</p>

  ${paymentButton}

  <div style="background: #FFF7ED; border: 1px solid #F59E0B; padding: 16px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 0; font-size:13px; color:#92400E;">
      À défaut de règlement dans ce délai, nous nous réserverons le droit d'engager toute procédure judiciaire de recouvrement (injonction de payer, assignation en référé) sans autre avertissement préalable, les frais et dépens étant mis à votre charge.
    </p>
  </div>

  <p>Si vous estimez cette créance injustifiée, contactez-nous immédiatement à <a href="mailto:${eEmail}">${eEmail}</a> en joignant les justificatifs correspondants.</p>

  <p>Le Service Comptabilité,<br><strong>${eName}</strong></p>

  <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9CA3AF;">
    <p>Ce courrier électronique a valeur de mise en demeure au sens de l'article 1344 du Code civil. Réf. légale : art. L441-10 à L441-12 du Code de commerce.</p>
  </div>
</body>
</html>`

  const text = `MISE EN DEMEURE

Bonjour ${clientName},

Par la présente, nous vous adressons une mise en demeure de régler la créance suivante, demeurée impayée depuis ${daysOverdue} jours malgré nos relances successives.

Facture n° : ${invoiceNumber}
Montant principal dû : ${formatEuro(amount)}
Échéance contractuelle : ${formatDate(dueDate)}
Retard : ${daysOverdue} jours
+ pénalités de retard et indemnité forfaitaire de 40 €

Vous êtes mis en demeure de procéder au règlement intégral de cette somme dans un délai de 8 jours à compter de la réception de cet avis.
${paymentUrl ? `\nRégler en ligne : ${paymentUrl}\n` : ''}
À défaut de règlement dans ce délai, nous nous réserverons le droit d'engager toute procédure judiciaire de recouvrement, les frais et dépens étant mis à votre charge.

Si vous estimez cette créance injustifiée, contactez-nous immédiatement à ${creditorEmail}.

Le Service Comptabilité,
${creditorName}

Ce courrier a valeur de mise en demeure (art. 1344 C.civ.). Réf. : art. L441-10 à L441-12 C.com.`

  return { subject, html, text }
}

export function getEmailTemplate(
  type: 'email_1' | 'email_2' | 'email_3' | 'formal_notice',
  data: EmailTemplateData
): { subject: string; html: string; text: string } {
  switch (type) {
    case 'email_1':
      return getEmailCordial(data)
    case 'email_2':
      return getEmailFerme(data)
    case 'email_3':
      return getEmailPrecontentieux(data)
    case 'formal_notice':
      return getEmailFormalNotice(data)
    default:
      return getEmailCordial(data)
  }
}

// Variable interpolation for user-customized templates.
// Replaces {{var}} placeholders with actual values.
export function interpolateTemplate(template: string, data: EmailTemplateData): string {
  const vars: Record<string, string> = {
    client_name: data.clientName,
    invoice_number: data.invoiceNumber,
    amount: formatEuro(data.amount),
    due_date: formatDate(data.dueDate),
    days_overdue: String(data.daysOverdue),
    creditor_name: data.creditorName,
    creditor_email: data.creditorEmail,
    payment_url: data.paymentUrl ?? '',
    description: data.description ?? '',
  }
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match)
}

// Wrap a user-customized plain-text body into a simple branded HTML email,
// keeping the payment button if a URL is available.
export function wrapCustomBody(
  body: string,
  data: EmailTemplateData
): { html: string; text: string } {
  const escapedBody = escapeHtml(body).replace(/\n/g, '<br>')
  const paymentButton = data.paymentUrl
    ? `<div style="text-align:center;margin:24px 0;"><a href="${escapeHtml(data.paymentUrl)}" style="background:#3B82F6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">Régler la facture en ligne</a></div>`
    : ''
  const eName = escapeHtml(data.creditorName)

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #3B82F6; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="color: #1E40AF; margin: 0;">${eName}</h2>
  </div>
  <div style="font-size: 14px;">${escapedBody}</div>
  ${paymentButton}
  <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9CA3AF;">
    <p>Envoyé par RelanceFlow pour ${eName}.</p>
  </div>
</body>
</html>`

  return { html, text: body }
}

// Resolves the final email content for a given reminder type.
// If the user has a custom enabled template, use it; otherwise fall back
// to the default template baked into the codebase.
export function resolveEmailTemplate(
  type: 'email_1' | 'email_2' | 'email_3' | 'formal_notice',
  data: EmailTemplateData,
  override?: { subject: string; body: string; enabled: boolean } | null
): { subject: string; html: string; text: string } {
  if (override && override.enabled) {
    const subject = interpolateTemplate(override.subject, data)
    const body = interpolateTemplate(override.body, data)
    const { html, text } = wrapCustomBody(body, data)
    return { subject, html, text }
  }
  return getEmailTemplate(type, data)
}
