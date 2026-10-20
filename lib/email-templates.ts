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
  return { subject, ...wrapCustomBody(body, data) }
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
  ${preheader(`Facture ${data.invoiceNumber} : solde restant à régler ${formatEuro(data.amount)}.`)}
  <div style="border-bottom: 2px solid #3B82F6; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="color: #1E40AF; margin: 0;">${eName}</h2>
  </div>
  <div style="font-size: 14px;">${escapedBody}</div>
  ${paymentButton}
  <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9CA3AF;">
    <p>Envoyé par Encair pour ${eName}.</p>
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
