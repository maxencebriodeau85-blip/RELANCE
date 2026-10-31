import { OFFER, priceLabel } from './plans'

export type TrialReminderRow = {
  user_id: string
  email: string
  company_name: string | null
  trial_ends_at: string
  invoices: number
  outstanding: number | string
  reminders_sent: number
}

const PARIS = 'Europe/Paris'
const parisDay = (date: Date) =>
  new Intl.DateTimeFormat('fr-CA', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const longDate = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: PARIS, weekday: 'long', day: 'numeric', month: 'long' }).format(date)
const euros = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value).replace(/[\u202f\u00a0]/g, ' ')
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** « aujourd’hui », « demain » ou « le mardi 3 novembre », au calendrier de Paris. */
export function trialEndLabel(end: Date, now: Date = new Date()) {
  const day = parisDay(end)
  if (day === parisDay(now)) return 'aujourd’hui'
  if (day === parisDay(new Date(now.getTime() + 86_400_000))) return 'demain'
  return `le ${longDate(end)}`
}

export function buildTrialReminderEmail(row: TrialReminderRow, appUrl: string, now: Date = new Date()) {
  const end = new Date(row.trial_ends_at)
  const when = trialEndLabel(end, now)
  const outstanding = Number(row.outstanding) || 0
  const usage =
    row.invoices > 0
      ? `Encair suit aujourd’hui ${plural(row.invoices, 'facture')} pour ${euros(outstanding)} restant dû` +
        (row.reminders_sent > 0 ? `, et a déjà envoyé ${plural(row.reminders_sent, 'relance')}.` : '.')
      : `Vous n’avez pas encore importé de factures. Il suffit de l’export CSV de votre logiciel de facturation : ${appUrl}/dashboard/invoices/import`
  const text = [
    'Bonjour,',
    '',
    `Votre essai gratuit d’Encair se termine ${when}${when.startsWith('le ') ? '' : ` (${longDate(end)})`}.`,
    '',
    usage,
    '',
    `Pour continuer sans interruption : offre ${OFFER.name} à ${priceLabel(OFFER.price, ' par mois')}, ${OFFER.invoiceLimit} nouvelles factures par mois, sans engagement. Ce tarif vous reste acquis tant que votre abonnement est actif.`,
    `Choisir l’offre : ${appUrl}/subscription`,
    '',
    'Sans abonnement, rien n’est supprimé : vous gardez l’accès à vos factures et à leur export, mais les relances s’arrêtent.',
    '',
    'Une question ? Répondez simplement à cet email.',
    '',
    'Encair',
  ].join('\n')
  return { subject: `Votre essai Encair se termine ${when}`, text }
}
