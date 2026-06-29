/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Invoice, Profile } from './database.types'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1F2937',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  brand: {
    flexDirection: 'column',
  },
  brandName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 9,
    color: '#6B7280',
  },
  invoiceTitle: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  invoiceLabel: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    letterSpacing: 1,
  },
  invoiceNumber: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2563EB',
    marginTop: 4,
  },
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  partyBlock: {
    width: '45%',
  },
  partyLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 9,
    color: '#4B5563',
    marginBottom: 2,
  },
  datesBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    padding: 12,
    marginBottom: 24,
    justifyContent: 'space-around',
  },
  dateCol: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 8,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  table: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 10,
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
  },
  colDesc: { flex: 5 },
  colQty: { flex: 1, textAlign: 'center' },
  colTotal: { flex: 2, textAlign: 'right' },
  tableCellText: {
    fontSize: 10,
    color: '#1F2937',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 28,
  },
  totalBox: {
    width: '50%',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: '#374151',
  },
  totalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1F2937',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1E3A8A',
  },
  grandTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1E3A8A',
  },
  vatMention: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: 10,
    marginBottom: 24,
    fontSize: 9,
    color: '#78350F',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 9,
    color: '#4B5563',
  },
  legalFooter: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  legalText: {
    fontSize: 7,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  paymentBox: {
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  paymentBoxTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  paymentBoxUrl: {
    fontSize: 9,
    color: '#2563EB',
    textDecoration: 'underline',
  },
})

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatDate(s: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(s))
}

export interface InvoicePDFProps {
  invoice: Invoice
  profile: Pick<Profile, 'company_name' | 'address' | 'postal_code' | 'city' | 'siren' | 'email' | 'phone'>
  paymentUrl?: string
}

export function InvoicePDF({ invoice, profile, paymentUrl }: InvoicePDFProps) {
  const ttc = Number(invoice.amount)

  return (
    <Document
      title={`Facture ${invoice.invoice_number}`}
      author={profile.company_name || 'RelanceFlow'}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>{profile.company_name || 'Mon Entreprise'}</Text>
            {profile.address && <Text style={styles.brandSubtitle}>{profile.address}</Text>}
            {(profile.postal_code || profile.city) && (
              <Text style={styles.brandSubtitle}>
                {[profile.postal_code, profile.city].filter(Boolean).join(' ')}
              </Text>
            )}
            {profile.siren && <Text style={styles.brandSubtitle}>SIREN : {profile.siren}</Text>}
            {profile.email && <Text style={styles.brandSubtitle}>{profile.email}</Text>}
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.invoiceLabel}>FACTURE</Text>
            <Text style={styles.invoiceNumber}>N° {invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Émetteur</Text>
            <Text style={styles.partyName}>{profile.company_name || 'Mon Entreprise'}</Text>
            {profile.email && <Text style={styles.partyDetail}>{profile.email}</Text>}
            {profile.phone && <Text style={styles.partyDetail}>{profile.phone}</Text>}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Facturé à</Text>
            <Text style={styles.partyName}>{invoice.client_name}</Text>
            {invoice.client_address && (
              <Text style={styles.partyDetail}>{invoice.client_address}</Text>
            )}
            <Text style={styles.partyDetail}>{invoice.client_email}</Text>
            {invoice.client_siren && (
              <Text style={styles.partyDetail}>SIREN : {invoice.client_siren}</Text>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesBox}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Date d&apos;émission</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.issued_date)}</Text>
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Date d&apos;échéance</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.due_date)}</Text>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Désignation</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total HT</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellText, styles.colDesc]}>
              {invoice.description || 'Prestation de service'}
            </Text>
            <Text style={[styles.tableCellText, styles.colQty]}>1</Text>
            <Text style={[styles.tableCellText, styles.colTotal]}>{formatEuro(ttc)}</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total</Text>
              <Text style={styles.totalValue}>{formatEuro(ttc)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA</Text>
              <Text style={styles.totalValue}>—</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total TTC</Text>
              <Text style={styles.grandTotalValue}>{formatEuro(ttc)}</Text>
            </View>
          </View>
        </View>

        {/* TVA mention (mention légale) */}
        <View style={styles.vatMention}>
          <Text>{invoice.vat_mention || 'TVA non applicable, art. 293B du CGI'}</Text>
        </View>

        {/* Payment URL */}
        {paymentUrl && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentBoxTitle}>Payer en ligne</Text>
            <Text style={styles.paymentBoxUrl}>{paymentUrl}</Text>
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Legal footer */}
        <View style={styles.legalFooter} fixed>
          <Text style={styles.legalText}>
            En cas de retard de paiement : pénalités de retard au taux d&apos;intérêt légal majoré de 10 points
            (art. L441-10 C.com.) et indemnité forfaitaire de recouvrement de 40 € (art. D441-5 C.com.).
          </Text>
          <Text style={styles.legalText}>
            Aucun escompte pour paiement anticipé. Facture éditée le {formatDate(invoice.issued_date)}.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
