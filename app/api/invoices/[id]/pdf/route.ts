import { createElement, type FunctionComponent } from 'react'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/invoice-pdf'
import { sanitizeHeaderValue } from '@/lib/validation'
import type { Invoice, Profile } from '@/lib/database.types'

// Force Node.js runtime — @react-pdf/renderer is not edge-compatible.
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: invoiceData, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', (await params).id)
      .eq('user_id', user.id)
      .single()

    if (invErr || !invoiceData) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('company_name, address, postal_code, city, siren, email, phone')
      .eq('id', user.id)
      .single()

    if (profileError || !profileData) return NextResponse.json({ error: 'Profil indisponible pour le document.' }, { status: 503 })
    const invoice = invoiceData as Invoice
    const profile = (profileData as Pick<
      Profile,
      'company_name' | 'address' | 'postal_code' | 'city' | 'siren' | 'email' | 'phone'
    > | null) ?? {
      company_name: 'Mon Entreprise',
      address: null,
      postal_code: null,
      city: null,
      siren: null,
      email: user.email ?? '',
      phone: null,
    }

    // @react-pdf and React have incompatible Style typings — cast through unknown.
    type InvoicePDFProps = {
      invoice: Invoice
      profile: Pick<Profile, 'company_name' | 'address' | 'postal_code' | 'city' | 'siren' | 'email' | 'phone'>
    }
    const element = createElement(
      InvoicePDF as unknown as FunctionComponent<InvoicePDFProps>,
      { invoice, profile }
    )
    const buffer = await renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0])

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="suivi-${sanitizeHeaderValue(invoice.invoice_number)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Erreur de génération PDF' }, { status: 500 })
  }
}
