import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ error: 'Le paiement en ligne est désactivé. Consultez les coordonnées de paiement de votre fournisseur.' }, { status: 410 })
}
