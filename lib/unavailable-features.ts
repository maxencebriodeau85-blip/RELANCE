import { NextResponse } from 'next/server'

export function integrationUnavailable() {
  return NextResponse.json({
    error: 'Les connexions automatiques sont en préparation. Utilisez l’import CSV pour importer et actualiser vos soldes.',
    code: 'INTEGRATION_UNAVAILABLE',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}

export function legacyWebhookRetired() {
  return NextResponse.json({
    error: 'Cet ancien webhook est retiré. Aucune facture enregistrée. Utilisez l’import CSV ; la nouvelle API sera documentée avant son ouverture.',
    code: 'LEGACY_WEBHOOK_RETIRED',
  }, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}
