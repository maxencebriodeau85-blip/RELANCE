export interface FormalNoticeData {
  // Creditor (créancier)
  creditorName: string
  creditorAddress: string
  creditorSiren?: string
  creditorEmail: string
  creditorPhone?: string
  // Debtor (débiteur)
  debtorName: string
  debtorAddress: string
  debtorSiren?: string
  // Invoice details
  invoiceNumber: string
  invoiceAmount: number
  invoiceDueDate: string
  invoiceIssuedDate: string
  daysOverdue: number
  // Date of formal notice
  noticeDate?: string
}

export interface FormalNoticeResult {
  content: string
  penalties: PenaltiesResult
  totalAmount: number
}

export interface PenaltiesResult {
  principal: number
  penaltyRate: number
  penaltyAmount: number
  fixedIndemnity: number
  totalPenalties: number
  totalDue: number
}

/**
 * BCE (Banque Centrale Européenne) reference rate + 10 points for B2B (art. L441-10)
 * As of 2024, BCE rate is approximately 4.50%, so penalty rate = 14.50%
 * In practice the rate is updated twice a year. We use a representative value.
 */
const BCE_RATE = 4.5 // percent
const PENALTY_RATE = BCE_RATE + 10 // = 14.5%
const FIXED_INDEMNITY = 40 // euros (art. D441-5)
const DAYS_PER_YEAR = 365

export function calculatePenalties(data: FormalNoticeData): PenaltiesResult {
  const { invoiceAmount, daysOverdue } = data

  const penaltyRate = PENALTY_RATE
  const penaltyAmount = (invoiceAmount * penaltyRate * daysOverdue) / (100 * DAYS_PER_YEAR)
  const totalPenalties = penaltyAmount + FIXED_INDEMNITY
  const totalDue = invoiceAmount + totalPenalties

  return {
    principal: invoiceAmount,
    penaltyRate,
    penaltyAmount: Math.round(penaltyAmount * 100) / 100,
    fixedIndemnity: FIXED_INDEMNITY,
    totalPenalties: Math.round(totalPenalties * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
  }
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function generateFormalNotice(data: FormalNoticeData): FormalNoticeResult {
  const penalties = calculatePenalties(data)
  const noticeDate = data.noticeDate || new Date().toISOString().split('T')[0]

  const content = `
MISE EN DEMEURE DE PAYER
(Article 1344 du Code civil – Articles L441-10 à L441-12 du Code de commerce)

Fait à ${data.creditorAddress ? data.creditorAddress.split(',')[0] || '' : ''}, le ${formatDate(noticeDate)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRÉANCIER :
${data.creditorName}
${data.creditorAddress}${data.creditorSiren ? `\nSIREN : ${data.creditorSiren}` : ''}
Email : ${data.creditorEmail}${data.creditorPhone ? `\nTél. : ${data.creditorPhone}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DÉBITEUR :
${data.debtorName}
${data.debtorAddress}${data.debtorSiren ? `\nSIREN : ${data.debtorSiren}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJET : MISE EN DEMEURE DE PAYER – Facture n°${data.invoiceNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Madame, Monsieur,

Par la présente lettre, envoyée en recommandé avec accusé de réception conformément aux usages en matière commerciale, nous avons l'honneur de vous mettre en demeure de régler dans un délai de HUIT (8) JOURS à compter de la réception du présent courrier, la somme dont le détail figure ci-après.

──────────────────────────────────────────────────────────────
DÉTAIL DE LA CRÉANCE
──────────────────────────────────────────────────────────────

Facture n°          : ${data.invoiceNumber}
Date d'émission     : ${formatDate(data.invoiceIssuedDate)}
Date d'échéance     : ${formatDate(data.invoiceDueDate)}
Jours de retard     : ${data.daysOverdue} jour(s)

Montant principal   : ${formatEuro(penalties.principal)}

Pénalités de retard :
  Taux applicable   : ${penalties.penaltyRate}% l'an
  (taux de refinancement BCE + 10 points, art. L441-10 C. com.)
  Base de calcul    : ${formatEuro(penalties.principal)} × ${penalties.penaltyRate}% × ${data.daysOverdue}j / 365j
  Montant pénalités : ${formatEuro(penalties.penaltyAmount)}

Indemnité forfaitaire de recouvrement (art. D441-5 C. com.) :
                      ${formatEuro(penalties.fixedIndemnity)}

──────────────────────────────────────────────────────────────
TOTAL DÛ            : ${formatEuro(penalties.totalDue)}
──────────────────────────────────────────────────────────────

En conséquence, nous vous mettons en demeure de nous régler la somme totale de ${formatEuro(penalties.totalDue)} (${numberToWords(penalties.totalDue)} euros) dans un délai de huit (8) jours à compter de la réception des présentes.

À défaut de règlement ou de réponse motivée de votre part dans ce délai, nous nous verrons contraints d'engager sans autre préavis :
  – Une procédure d'injonction de payer (articles 1405 et suivants du Code de procédure civile) ;
  – Et/ou toute autre action judiciaire que nous jugerons opportune pour le recouvrement de notre créance ;

Ces procédures seront à vos frais exclusifs.

Nous vous prions de croire, Madame, Monsieur, à l'expression de nos salutations distinguées.

${data.creditorName}

──────────────────────────────────────────────────────────────
RÉFÉRENCES LÉGALES
• Art. 1344 du Code civil : mise en demeure
• Art. L441-10 du Code de commerce : pénalités de retard entre professionnels
• Art. D441-5 du Code de commerce : indemnité forfaitaire de 40 €
• Art. L111-8 du Code des procédures civiles d'exécution

Note : Ce document doit être envoyé par lettre recommandée avec accusé de réception (LRAR) pour avoir valeur légale de mise en demeure.
──────────────────────────────────────────────────────────────
`.trim()

  return {
    content,
    penalties,
    totalAmount: penalties.totalDue,
  }
}

function numberToWords(amount: number): string {
  const intPart = Math.floor(amount)
  const centsPart = Math.round((amount - intPart) * 100)

  const ones = [
    '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
  ]
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

  function convertBelow1000(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) {
      const ten = Math.floor(n / 10)
      const one = n % 10
      if (ten === 7 || ten === 9) {
        return tens[ten] + (one === 1 && ten === 7 ? '-et-' : '-') + ones[10 + one]
      }
      return tens[ten] + (one > 0 ? (one === 1 && ten !== 8 ? '-et-un' : '-' + ones[one]) : (ten === 8 ? 's' : ''))
    }
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    const hundredWord = (hundred === 1 ? 'cent' : ones[hundred] + ' cent') + (rest === 0 && hundred > 1 ? 's' : '')
    return hundredWord + (rest > 0 ? ' ' + convertBelow1000(rest) : '')
  }

  let result = ''
  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000)
    const rest = intPart % 1000
    result = (thousands === 1 ? 'mille' : convertBelow1000(thousands) + ' mille') + (rest > 0 ? ' ' + convertBelow1000(rest) : '')
  } else {
    result = convertBelow1000(intPart)
  }

  if (centsPart > 0) {
    result += ' et ' + convertBelow1000(centsPart) + ' centime' + (centsPart > 1 ? 's' : '')
  }

  return result || 'zéro'
}
