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
  const { creditorName, clientName, invoiceNumber, amount, dueDate } = data
  const subject = EMAIL_SUBJECTS.email_cordial(invoiceNumber)

  // Escape all user-controlled values
  const eName = escapeHtml(creditorName)
  const eClient = escapeHtml(clientName)
  const eInvoice = escapeHtml(invoiceNumber)

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #3B82F6; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="color: #1E40AF; margin: 0;">${eName}</h2>
  </div>

  <p>Bonjour ${eClient},</p>

  <p>Nous espérons que vous allez bien. Nous nous permettons de vous contacter concernant la facture référencée ci-dessous, dont l'échéance est passée.</p>

  <div style="background: #F0F9FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <p style="margin: 4px 0;"><strong>Facture n° :</strong> ${eInvoice}</p>
    <p style="margin: 4px 0;"><strong>Montant TTC :</strong> ${formatEuro(amount)}</p>
    <p style="margin: 4px 0;"><strong>Date d'échéance :</strong> ${formatDate(dueDate)}</p>
  </div>

  <p>Il est possible que ce paiement ait été effectué ou soit en cours de traitement, auquel cas nous vous prions de ne pas tenir compte de ce message.</p>

  <p>Dans le cas contraire, nous vous serions reconnaissants de bien vouloir procéder au règlement de cette somme dans les meilleurs délais, ou de nous contacter si vous avez des questions concernant cette facture.</p>

  <p>Nous restons disponibles pour tout renseignement complémentaire.</p>

  <p>Cordialement,<br><strong>${eName}</strong></p>

  <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9CA3AF;">
    <p>Ce message est généré automatiquement par RelanceFlow. Pour toute question, contactez directement ${eName}.</p>
  </div>
</body>
</html>`

  const text = `Bonjour ${clientName},

Nous espérons que vous allez bien. Nous nous permettons de vous contacter concernant la facture référencée ci-dessous, dont l'échéance est passée.

Facture n° : ${invoiceNumber}
Montant TTC : ${formatEuro(amount)}
Date d'échéance : ${formatDate(dueDate)}

Il est possible que ce paiement ait été effectué ou soit en cours de traitement, auquel cas nous vous prions de ne pas tenir compte de ce message.

Dans le cas contraire, nous vous serions reconnaissants de bien vouloir procéder au règlement de cette somme dans les meilleurs délais, ou de nous contacter si vous avez des questions concernant cette facture.

Nous restons disponibles pour tout renseignement complémentaire.

Cordialement,
${creditorName}`

  return { subject, html, text }
}

export function getEmailFerme(data: EmailTemplateData): {
  subject: string
  html: string
  text: string
} {
  const { creditorName, clientName, invoiceNumber, amount, dueDate, daysOverdue } = data
  const subject = EMAIL_SUBJECTS.email_ferme(invoiceNumber)

  const eName = escapeHtml(creditorName)
  const eClient = escapeHtml(clientName)
  const eInvoice = escapeHtml(invoiceNumber)

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
    <p style="margin: 4px 0;"><strong>Montant TTC :</strong> <span style="color: #DC2626; font-size: 18px; font-weight: bold;">${formatEuro(amount)}</span></p>
    <p style="margin: 4px 0;"><strong>Échéance :</strong> ${formatDate(dueDate)}</p>
    <p style="margin: 4px 0;"><strong>Jours de retard :</strong> ${daysOverdue} jour(s)</p>
  </div>

  <p>Nous vous rappelons que conformément aux dispositions légales en vigueur (articles L441-10 et suivants du Code de commerce), des pénalités de retard sont applicables à compter du jour suivant la date d'échéance.</p>

  <p><strong>Nous vous demandons de bien vouloir procéder au règlement de cette somme dans un délai de 8 jours.</strong></p>

  <p>Si le paiement a déjà été effectué, veuillez nous en informer afin que nous puissions mettre à jour nos dossiers.</p>

  <p>Dans le cas contraire, nous serons dans l'obligation de prendre les mesures nécessaires pour recouvrer cette créance.</p>

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

Nous vous rappelons que conformément aux dispositions légales en vigueur (articles L441-10 et suivants du Code de commerce), des pénalités de retard sont applicables à compter du jour suivant la date d'échéance.

Nous vous demandons de bien vouloir procéder au règlement de cette somme dans un délai de 8 jours.

Si le paiement a déjà été effectué, veuillez nous en informer afin que nous puissions mettre à jour nos dossiers.

Cordialement,
${creditorName}`

  return { subject, html, text }
}

export function getEmailPrecontentieux(data: EmailTemplateData): {
  subject: string
  html: string
  text: string
} {
  const { creditorName, clientName, invoiceNumber, amount, dueDate, daysOverdue } = data
  const subject = EMAIL_SUBJECTS.email_precontentieux(invoiceNumber)

  const eName = escapeHtml(creditorName)
  const eClient = escapeHtml(clientName)
  const eInvoice = escapeHtml(invoiceNumber)

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
    case 'formal_notice':
      return getEmailPrecontentieux(data)
    default:
      return getEmailCordial(data)
  }
}
