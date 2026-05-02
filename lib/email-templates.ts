// Escape user-controlled strings to prevent XSS in HTML emails.
function esc(s: string): string {
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
}

function euro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function fmtDate(d: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(d))
}

function emailWrapper(content: string, accentColor: string, footerNote: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Relance de facture</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="height:4px;background:${accentColor};"></td></tr>
        <tr><td style="padding:40px 40px 32px;">${content}</td></tr>
        <tr><td style="padding:24px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
          <p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.6;">${footerNote}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function payButton(url: string, amount: number, color = '#2563EB'): string {
  if (!url) return ''
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr><td align="center">
      <a href="${esc(url)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 40px;border-radius:8px;letter-spacing:-.2px;">
        💳 &nbsp;Payer ${esc(euro(amount))} maintenant
      </a>
    </td></tr>
    <tr><td align="center" style="padding-top:8px;">
      <p style="margin:0;font-size:11px;color:#94A3B8;">Paiement 100&nbsp;% sécurisé · Stripe</p>
    </td></tr>
  </table>`
}

function invoiceBox(data: EmailTemplateData, extraRows = '', bg = '#F0F7FF', border = '#BFDBFE', headBg = '#DBEAFE', headColor = '#1E40AF', totalBg = '#EFF6FF'): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:${bg};border:1px solid ${border};border-radius:8px;margin:24px 0;overflow:hidden;">
    <tr style="background:${headBg};"><td colspan="2" style="padding:10px 16px;">
      <p style="margin:0;font-size:12px;font-weight:700;color:${headColor};text-transform:uppercase;letter-spacing:.06em;">Détails de la facture</p>
    </td></tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#475569;border-bottom:1px solid ${border};">Facture n°</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0F172A;border-bottom:1px solid ${border};text-align:right;">${esc(data.invoiceNumber)}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#475569;border-bottom:1px solid ${border};">Date d'échéance</td>
      <td style="padding:10px 16px;font-size:13px;color:#0F172A;border-bottom:1px solid ${border};text-align:right;">${fmtDate(data.dueDate)}</td>
    </tr>
    ${extraRows}
    <tr style="background:${totalBg};">
      <td style="padding:12px 16px;font-size:14px;font-weight:700;color:${headColor};">Montant TTC</td>
      <td style="padding:12px 16px;font-size:20px;font-weight:800;color:${headColor};text-align:right;">${esc(euro(data.amount))}</td>
    </tr>
  </table>`
}

// ─── Email 1 – Cordial ──────────────────────────────────────────────────────

export function getEmailCordial(data: EmailTemplateData) {
  const { creditorName, clientName, paymentUrl, amount } = data
  const subject = `Rappel amiable – Facture n°${data.invoiceNumber}`

  const body = `
    <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0F172A;">Rappel de facture</p>
    <p style="margin:0 0 24px;font-size:13px;color:#64748B;">De la part de <strong>${esc(creditorName)}</strong></p>

    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">Bonjour ${esc(clientName)},</p>

    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Nous espérons que vous allez bien. Nous nous permettons de vous contacter au sujet
      de la facture ci-dessous, dont l'échéance vient de passer. Il s'agit peut-être
      d'un simple oubli — si le paiement a déjà été effectué, veuillez ignorer ce message.
    </p>

    ${invoiceBox(data)}
    ${paymentUrl ? payButton(paymentUrl, amount) : ''}

    <p style="margin:24px 0 0;font-size:15px;color:#334155;line-height:1.7;">
      En cas de question ou pour convenir d'un délai de paiement, n'hésitez pas à
      nous contacter directement en répondant à cet email.
    </p>

    <p style="margin:24px 0 0;font-size:15px;color:#334155;">Cordialement,</p>
    <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#0F172A;">${esc(creditorName)}</p>`

  const html = emailWrapper(body, '#3B82F6',
    `Ce message concerne la facture n°${esc(data.invoiceNumber)}. Pour toute question, répondez à cet email ou contactez ${esc(creditorName)} à ${esc(data.creditorEmail)}.`)

  const text = `Bonjour ${clientName},\n\nRappel facture n°${data.invoiceNumber} (${euro(amount)}) — échéance ${fmtDate(data.dueDate)}.\n${paymentUrl ? `\nPayer en ligne : ${paymentUrl}\n` : ''}\nCordialement,\n${creditorName}`

  return { subject, html, text }
}

// ─── Email 2 – Ferme ────────────────────────────────────────────────────────

export function getEmailFerme(data: EmailTemplateData) {
  const { creditorName, clientName, daysOverdue, paymentUrl, amount } = data
  const subject = `Relance – Facture n°${data.invoiceNumber} en attente de règlement`

  const extraRow = `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#475569;border-bottom:1px solid #BFDBFE;">Jours de retard</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#DC2626;border-bottom:1px solid #BFDBFE;text-align:right;">${daysOverdue} jours</td>
    </tr>`

  const body = `
    <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0F172A;">Deuxième relance</p>
    <p style="margin:0 0 24px;font-size:13px;color:#64748B;">De la part de <strong>${esc(creditorName)}</strong></p>

    <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400E;">
        ⚠️ <strong>Facture en souffrance depuis ${daysOverdue} jours</strong> — pénalités de retard applicables (art.&nbsp;L441-10 C.&nbsp;com.).
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">Bonjour ${esc(clientName)},</p>

    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de la facture
      suivante, dont l'échéance est dépassée depuis <strong>${daysOverdue} jours</strong>.
    </p>

    ${invoiceBox(data, extraRow)}
    ${paymentUrl ? payButton(paymentUrl, amount, '#D97706') : ''}

    <p style="margin:24px 0 0;font-size:15px;color:#334155;line-height:1.7;">
      <strong>Nous vous demandons de procéder au règlement dans les 8 jours.</strong>
      Si le paiement a déjà été effectué, merci de nous en informer par retour de mail.
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#64748B;line-height:1.7;">
      À défaut de règlement ou de contact de votre part, nous serons contraints de prendre
      les mesures nécessaires pour recouvrer cette créance.
    </p>

    <p style="margin:24px 0 0;font-size:15px;color:#334155;">Cordialement,</p>
    <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#0F172A;">${esc(creditorName)}</p>`

  const html = emailWrapper(body, '#F59E0B',
    `Art. L441-10 à L441-12 C. com. — pénalités au taux BCE + 10 points. Facture n°${esc(data.invoiceNumber)}.`)

  const text = `Bonjour ${clientName},\n\nDeuxième relance — Facture n°${data.invoiceNumber} (${euro(amount)}) en retard de ${daysOverdue} jours.\n${paymentUrl ? `\nPayer en ligne : ${paymentUrl}\n` : ''}\nRèglement demandé sous 8 jours.\n\nCordialement,\n${creditorName}`

  return { subject, html, text }
}

// ─── Email 3 – Pré-contentieux ──────────────────────────────────────────────

export function getEmailPrecontentieux(data: EmailTemplateData) {
  const { creditorName, clientName, daysOverdue, paymentUrl, amount } = data
  const subject = `⚠️ URGENT – Dernière relance avant mise en demeure – Facture n°${data.invoiceNumber}`

  const extraRows = `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#991B1B;border-bottom:1px solid #FECACA;">Jours de retard</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#DC2626;border-bottom:1px solid #FECACA;text-align:right;">${daysOverdue} jours</td>
    </tr>
    <tr style="background:#FFF1F1;">
      <td style="padding:10px 16px;font-size:13px;color:#991B1B;border-bottom:1px solid #FECACA;">Indemnité forfaitaire légale</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#DC2626;border-bottom:1px solid #FECACA;text-align:right;">+ 40,00 €</td>
    </tr>`

  const body = `
    <div style="background:#FEF2F2;border:2px solid #DC2626;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:14px;font-weight:800;color:#991B1B;">🚨 DERNIER AVERTISSEMENT AVANT MISE EN DEMEURE</p>
      <p style="margin:6px 0 0;font-size:13px;color:#DC2626;">De la part de <strong>${esc(creditorName)}</strong></p>
    </div>

    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">Bonjour ${esc(clientName)},</p>

    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      Malgré nos relances précédentes, nous n'avons toujours pas reçu le règlement de la
      facture ci-dessous, en souffrance depuis <strong>${daysOverdue} jours</strong>.
    </p>

    ${invoiceBox(data, extraRows, '#FFF5F5', '#FECACA', '#FEE2E2', '#991B1B', '#FFF1F1')}
    ${paymentUrl ? payButton(paymentUrl, amount, '#DC2626') : ''}

    <div style="background:#FFF7ED;border:1px solid #FCD34D;border-radius:8px;padding:16px 18px;margin:24px 0;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#92400E;line-height:1.7;">
        Sans règlement intégral ou contact de votre part sous <u>8 jours calendaires</u>,
        nous procéderons à l'envoi d'une <strong>mise en demeure par lettre recommandée AR</strong>,
        préalable à toute action judiciaire de recouvrement.
      </p>
    </div>

    <p style="margin:0;font-size:14px;color:#64748B;line-height:1.7;">
      Cette procédure engendrera des frais supplémentaires à votre charge.
      Pour tout accord de paiement ou question urgente, répondez à cet email immédiatement.
    </p>

    <p style="margin:24px 0 0;font-size:15px;color:#334155;">Le Service Comptabilité,</p>
    <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#0F172A;">${esc(creditorName)}</p>`

  const html = emailWrapper(body, '#DC2626',
    `Art. L441-10 à L441-12 C. com. — indemnité forfaitaire 40 € (art. D441-5). Ce courrier constitue une mise en garde formelle. Facture n°${esc(data.invoiceNumber)}.`)

  const text = `DERNIER AVERTISSEMENT AVANT MISE EN DEMEURE\n\nBonjour ${clientName},\n\nFacture n°${data.invoiceNumber} — ${euro(amount)} — retard de ${daysOverdue} jours.\n${paymentUrl ? `\nRégulariser maintenant : ${paymentUrl}\n` : ''}\nSans règlement sous 8 jours : mise en demeure par LRAR.\n\n${creditorName}`

  return { subject, html, text }
}

// ─── Router ─────────────────────────────────────────────────────────────────

export function getEmailTemplate(
  type: 'email_1' | 'email_2' | 'email_3' | 'formal_notice',
  data: EmailTemplateData
): { subject: string; html: string; text: string } {
  switch (type) {
    case 'email_1': return getEmailCordial(data)
    case 'email_2': return getEmailFerme(data)
    case 'email_3':
    case 'formal_notice': return getEmailPrecontentieux(data)
    default: return getEmailCordial(data)
  }
}

export const EMAIL_SUBJECTS = {
  email_cordial: (n: string) => `Rappel amiable – Facture n°${n}`,
  email_ferme: (n: string) => `Relance – Facture n°${n} en attente de règlement`,
  email_precontentieux: (n: string) => `⚠️ URGENT – Dernière relance avant mise en demeure – Facture n°${n}`,
  formal_notice: (n: string) => `MISE EN DEMEURE – Facture n°${n}`,
}
