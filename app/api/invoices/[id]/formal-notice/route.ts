import { NextResponse } from 'next/server'
export function GET() {
  return NextResponse.json({ error: 'Le générateur historique de mise en demeure est retiré. Utilisez la fiche de suivi de la facture.', code: 'FORMAL_NOTICE_RETIRED' }, { status: 410 })
}
