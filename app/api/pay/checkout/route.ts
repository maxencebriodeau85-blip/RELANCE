import { NextResponse } from 'next/server'
export async function POST() {
 return NextResponse.json({ error: 'Le paiement en ligne n’est pas disponible. Contactez votre fournisseur pour régler selon les modalités de votre facture.' }, { status: 410 })
}
