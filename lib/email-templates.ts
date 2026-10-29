import { REMINDER_TEMPLATES } from './reminder-templates'

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

// Invisible preheader text shown by inbox clients as the email preview line
// (Gmail, Apple Mail, Outlook). Padded with zero-width chars to push the
// rest of the body out of the preview window.
function preheader(text: string): string {
  const padding = '&#847; &#8204;'.repeat(60)
  return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(text)}${padding}</div>`
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

export function getEmailTemplate(
  type: 'email_1' | 'email_2' | 'email_3' | 'formal_notice',
  data: EmailTemplateData
): { subject: string; html: string; text: string } {
  const template = REMINDER_TEMPLATES.find(t => t.type === type)
  if (!template) throw new Error('Le générateur de mise en demeure est retiré.')
  const subject = interpolateTemplate(template.defaultSubject, data)
  const body = interpolateTemplate(template.defaultBody, data)
  return { subject, ...wrapCustomBody(body, data, subject) }
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

// Mise en page HTML des relances. L'email part au nom du créancier : sobre,
// neutre (pas aux couleurs d'Encair), lisible sur mobile et dans Outlook
// (tableaux et styles en ligne), avec un récapitulatif chiffré toujours exact
// quel que soit le texte personnalisé. Toute donnée saisie est échappée.
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const INK = '#1f2a37'
const MUTED = '#5b6570'
const LINE = '#e3e1dc'

function recapRow(label: string, value: string, strong = false): string {
  return `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid ${LINE};font:14px/1.4 ${FONT};color:${MUTED};white-space:nowrap;vertical-align:top;">${label}</td><td align="right" style="padding:8px 0;border-top:1px solid ${LINE};font:${strong ? '600 16px' : '14px'}/1.4 ${FONT};color:${INK};">${value}</td></tr>`
}

export function wrapCustomBody(
  body: string,
  data: EmailTemplateData,
  subject?: string,
): { html: string; text: string } {
  const escapedBody = escapeHtml(body).replace(/\r?\n/g, '<br>')
  const eName = escapeHtml(data.creditorName)
  const amount = escapeHtml(formatEuro(data.amount))
  const description = data.description?.trim()
  const paymentButton = data.paymentUrl
    ? `<tr><td style="padding:8px 32px 24px;"><a href="${escapeHtml(data.paymentUrl)}" style="display:inline-block;background:${INK};color:#ffffff;padding:13px 24px;border-radius:6px;text-decoration:none;font:600 15px/1.2 ${FONT};">Régler la facture en ligne</a></td></tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject ?? `Facture ${data.invoiceNumber}`)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f3ef;">
${preheader(`Facture ${data.invoiceNumber} : solde restant à régler ${formatEuro(data.amount)}.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ef;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:8px;">
<tr><td style="padding:24px 32px 16px;border-bottom:1px solid ${LINE};font:600 18px/1.3 ${FONT};color:${INK};">${eName}</td></tr>
<tr><td style="padding:24px 32px 8px;font:15px/1.65 ${FONT};color:${INK};">${escapedBody}</td></tr>
${paymentButton}
<tr><td style="padding:8px 32px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf9f6;border:1px solid ${LINE};border-radius:6px;">
<tr><td style="padding:14px 16px 6px;font:600 12px/1.3 ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${MUTED};">Récapitulatif</td></tr>
<tr><td style="padding:0 16px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${recapRow('Facture', `n° ${escapeHtml(data.invoiceNumber)}`)}
${description ? recapRow('Objet', escapeHtml(description.length > 120 ? `${description.slice(0, 117)}…` : description)) : ''}
${recapRow('Échéance', escapeHtml(formatDate(data.dueDate)))}
${recapRow('Reste à régler', amount, true)}
</table>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid ${LINE};font:12px/1.6 ${FONT};color:${MUTED};">
Message adressé par ${eName}. Pour toute question ou si le règlement est déjà parti, répondez simplement à cet email.<br>Envoyé avec Encair.
</td></tr>
</table>
</td></tr>
</table>
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
    const { html, text } = wrapCustomBody(body, data, subject)
    return { subject, html, text }
  }
  return getEmailTemplate(type, data)
}
