import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Invoice, Profile } from './database.types'
import { outstanding } from './collection'
import { formatDate, formatEuro } from './metrics'

export interface InvoicePDFProps {
  invoice: Invoice
  profile: Pick<Profile, 'company_name' | 'address' | 'postal_code' | 'city' | 'siren' | 'email' | 'phone'>
}
export function invoiceSummary({ invoice, profile }: InvoicePDFProps): [string, string][] {
  return [
    ['Émetteur', profile.company_name || 'Entreprise'],
    ['Coordonnées', [profile.address, profile.postal_code, profile.city, profile.email, profile.phone].filter(Boolean).join(' · ')],
    ['Client', invoice.client_name],
    ['Adresse client', invoice.client_address || 'Non renseignée'],
    ['Email client', invoice.client_email || 'Non renseigné'],
    ['Référence', invoice.invoice_number],
    ['Échéance', formatDate(invoice.due_date)],
    ['Montant initial TTC', formatEuro(invoice.amount)],
    ['Règlements enregistrés', formatEuro(invoice.amount - outstanding(invoice))],
    ['Reste à payer', formatEuro(outstanding(invoice))],
    ['Solde vérifié le', invoice.balance_checked_at ? formatDate(invoice.balance_checked_at) : 'Non confirmé'],
    ['Statut', invoice.status === 'paid' ? 'Réglée' : invoice.status === 'disputed' ? 'En litige' : 'En cours de suivi'],
    ...(invoice.promise_date ? [['Paiement promis pour le', formatDate(invoice.promise_date)] as [string, string]] : []),
  ]
}
export async function renderInvoicePDF(props: InvoicePDFProps): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(await readFile(path.join(process.cwd(), 'assets/fonts/DejaVuSans.ttf')), { subset: true })
  doc.setTitle(`Fiche de suivi ${props.invoice.invoice_number}`)
  doc.setAuthor(props.profile.company_name || 'Entreprise')
  const ink = rgb(.12, .2, .27), muted = rgb(.38, .43, .48), accent = rgb(.92, .35, .17)
  let page = doc.addPage([595.28, 841.89]), y = 750
  function nextPage() { page = doc.addPage([595.28, 841.89]); y = 770 }
  function line(text: string, size = 11, color = ink) {
    if (y < 75) nextPage()
    page.drawText(text.replace(/[\u0000-\u001f\u007f]/g, ''), { x: 48, y, font, size, color })
    y -= size + 7
  }
  function paragraph(text: string, size = 11, color = ink) {
    for (const original of text.normalize('NFC').split('\n')) {
      let remaining = original
      while (remaining) {
        let count = 0
        for (const char of remaining) {
          if (font.widthOfTextAtSize(remaining.slice(0, count) + char, size) > 499) break
          count += char.length
        }
        if (!count) count = Array.from(remaining)[0].length
        if (count < remaining.length) {
          const space = remaining.lastIndexOf(' ', count)
          if (space > 0) count = space
        }
        line(remaining.slice(0, count), size, color)
        remaining = remaining.slice(count).trimStart()
      }
    }
  }
  page.drawRectangle({ x: 48, y: 790, width: 40, height: 4, color: accent })
  line('ENCAIR', 12, accent)
  line('Fiche de suivi de paiement', 23)
  y -= 12
  for (const [label, value] of invoiceSummary(props)) {
    if (y < 120) nextPage()
    line(label.toLocaleUpperCase('fr'), 9, muted)
    paragraph(value, label === 'Reste à payer' ? 19 : 11)
    y -= 8
  }
  paragraph('Document de suivi établi à partir des informations enregistrées. Il ne remplace pas la facture originale et ne constitue pas une mise en demeure.', 9, muted)
  doc.getPages().forEach((sheet, index) => sheet.drawText(`Encair · Suivi du paiement                                      ${index + 1} / ${doc.getPageCount()}`, { x: 48, y: 36, size: 8, font, color: muted }))
  return Buffer.from(await doc.save())
}
