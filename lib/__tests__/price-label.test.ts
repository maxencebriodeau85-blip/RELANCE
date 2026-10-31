import { describe, expect, it } from 'vitest'
import { OFFER, PRICE_TAX, VAT_NOTE, priceLabel } from '../plans'
import { VAT_MENTION } from '../legal'

describe('Prix en franchise de TVA (art. 293 B du CGI)', () => {
  it('affiche les prix sans « HT », car aucune TVA ne s’y ajoute', () => {
    expect(OFFER.vatExempt).toBe(true)
    expect(PRICE_TAX).toBe('')
    expect(priceLabel(16)).toBe('16 €/mois')
    expect(priceLabel(29, ' par mois')).toBe('29 € par mois')
  })

  it('porte la mention légale cohérente sur le site et les CGU', () => {
    expect(VAT_NOTE).toBe('TVA non applicable, art. 293 B du CGI')
    expect(VAT_MENTION).toBe('TVA non applicable, art. 293 B du CGI')
  })
})
