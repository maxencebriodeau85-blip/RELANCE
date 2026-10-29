import { describe, expect, it } from 'vitest'
import { getEmailTemplate, resolveEmailTemplate, wrapCustomBody } from '../email-templates'

const data = {
  creditorName: 'Roy & Fils <script>',
  creditorEmail: 'compta@roy.fr',
  clientName: 'SCI "Atlantique"',
  invoiceNumber: 'FA-42<b>',
  amount: 1850.4,
  dueDate: '2026-10-10',
  daysOverdue: 19,
  description: '<img src=x onerror=alert(1)>',
}

describe('Mise en page des relances', () => {
  it('échappe toute donnée saisie : créancier, client, numéro, objet et texte personnalisé', () => {
    const { html } = wrapCustomBody('Bonjour <a href="javascript:x">ici</a>', data, 'Objet <i>')
    for (const raw of ['<script>', '<b>', '<img', '<a href="javascript', '<i>']) expect(html).not.toContain(raw)
    expect(html).toContain('Roy &amp; Fils &lt;script&gt;')
    expect(html).toContain('<title>Objet &lt;i&gt;</title>')
  })

  it('affiche un récapitulatif exact : numéro, échéance et reste à régler', () => {
    const { html } = getEmailTemplate('email_1', { ...data, creditorName: 'Roy', invoiceNumber: 'FA-42', description: null })
    expect(html).toMatch(/Récapitulatif/)
    expect(html).toMatch(/n° FA-42/)
    expect(html).toMatch(/10\/10\/2026/)
    expect(html).toMatch(/Reste à régler[\s\S]*1[\s  ]850,40[\s  ]€/)
    expect(html).not.toMatch(/>Objet</)
  })

  it('tronque un objet de facture trop long', () => {
    const { html } = wrapCustomBody('Texte', { ...data, description: 'x'.repeat(300) })
    expect(html).toContain(`${'x'.repeat(117)}…`)
    expect(html).not.toContain('x'.repeat(118))
  })

  it('reste neutre : aux couleurs du créancier, ni bleu ni logo Encair, et dit qui écrit', () => {
    const { html } = getEmailTemplate('email_2', { ...data, creditorName: 'Roy' })
    expect(html).not.toMatch(/#3B82F6|#1E40AF/i)
    expect(html).toMatch(/Message adressé par Roy\. Pour toute question/)
    expect(html).toMatch(/<html lang="fr">/)
    expect(html).toMatch(/role="presentation"/)
  })

  it('garde le texte brut identique au corps saisi (version texte de l’email)', () => {
    const override = { subject: 'Rappel {{invoice_number}}', body: 'Bonjour {{client_name}},\nSolde : {{amount}}', enabled: true }
    const { subject, text, html } = resolveEmailTemplate('email_1', { ...data, clientName: 'Client', invoiceNumber: 'F1' }, override)
    expect(subject).toBe('Rappel F1')
    expect(text).toMatch(/^Bonjour Client,\nSolde : 1[\s  ]850,40[\s  ]€$/)
    expect(html).toContain('Bonjour Client,<br>Solde')
  })

  it('n’affiche le bouton de paiement que si un lien est fourni, et l’échappe', () => {
    expect(wrapCustomBody('x', data).html).not.toContain('Régler la facture en ligne')
    const { html } = wrapCustomBody('x', { ...data, paymentUrl: 'https://pay.example/"><x>' })
    expect(html).toContain('Régler la facture en ligne')
    expect(html).toContain('https://pay.example/&quot;&gt;&lt;x&gt;')
  })
})
