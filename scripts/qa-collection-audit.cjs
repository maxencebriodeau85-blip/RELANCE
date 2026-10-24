// Run against a build configured for the local fixture API; never uses customer data.
const http = require('node:http')
const fs = require('node:fs')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.ENCAIR_PLAYWRIGHT_MODULE || 'playwright')
const owner = '00000000-0000-4000-8000-000000000099'
const now = new Date().toISOString()
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'owner@example.invalid', app_metadata: {}, user_metadata: {}, created_at: now }
const profile = { id: owner, email: user.email, company_name: 'Entreprise test', plan: 'starter', trial_ends_at: null, auto_reminders: false }
const invoice = { id: '00000000-0000-4000-8000-000000000001', user_id: owner, client_name: 'Boulangerie', client_email: 'client@example.invalid', invoice_number: 'TEST-BOULANGERIE', amount: 2869.66, amount_paid: 506.51, due_date: '2026-01-01', status: 'pending', issued_date: null, created_at: now, updated_at: now, balance_checked_at: now, reminders_paused: false, notes: 'SECRET INTERNE', reminder_scenario: 'standard' }
const invoices = [invoice, { ...invoice, id: '00000000-0000-4000-8000-000000000002', invoice_number: 'TEST-PAID', client_name: 'Client réglé', amount: 100, amount_paid: 100, status: 'paid' }]
const fixture = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', '*')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
  const url = new URL(req.url, 'http://127.0.0.1:3031')
  let data = []
  if (url.pathname.includes('/auth/v1/user')) data = user
  else if (url.pathname.includes('/profiles')) data = profile
  else if (url.pathname.includes('/invoices')) data = url.searchParams.has('id') ? invoices.find(i => 'eq.' + i.id === url.searchParams.get('id')) : invoices
  else if (url.pathname.includes('email_template_overrides')) data = null
  res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data))
})
async function main() {
  await new Promise(resolve => fixture.listen(3031, '127.0.0.1', resolve))
  const browser = await chromium.launch({ executablePath: process.env.ENCAIR_QA_CHROME, headless: true, args: ['--no-sandbox'] })
  const results = []
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, bypassCSP: true })
      const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated', role: 'authenticated' })).toString('base64url'), 'qa-signature'].join('.')
      const session = { access_token: jwt, refresh_token: 'qa-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }
      await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), domain: 'localhost', path: '/' }])
      const page = await context.newPage(), errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/api/notifications**', route => route.fulfill({ json: { notifications: [], unreadCount: 0 } }))
      let sends = 0
      await page.route('**/api/invoices/*/remind', async route => {
        assert.match(route.request().postDataJSON().confirmation, /^\d{13}\.[a-f0-9]{64}$/)
        sends++; await route.fulfill({ json: { status: 200, success: true } })
      })
      await page.goto('http://localhost:3020/dashboard/invoices')
      await page.locator('text=TEST-BOULANGERIE').locator('visible=true').first().waitFor()
      const cookie = page.getByRole('button', { name: 'Compris', exact: true }); if (await cookie.isVisible()) await cookie.click()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      const add = await page.getByRole('link', { name: /Ajouter/ }).boundingBox()
      if (add) assert.ok(add.x + add.width <= width)
      await page.screenshot({ path: `/tmp/encair-list-${width}.png`, fullPage: true })
      await page.goto(`http://localhost:3020/dashboard/invoices/${invoice.id}`)
      await page.getByRole('button', { name: 'Prévisualiser la relance' }).click()
      await page.getByRole('dialog').getByText(invoice.client_email, { exact: true }).waitFor()
      assert.ok((await page.getByLabel('Texte de l’email').innerText()).includes('2 363,15'))
      assert.equal(sends, 0)
      await page.screenshot({ path: `/tmp/encair-preview-${width}.png`, fullPage: true })
      await page.getByRole('button', { name: 'Fermer', exact: true }).first().click(); assert.equal(sends, 0)
      await page.getByRole('button', { name: 'Prévisualiser la relance' }).click()
      await page.getByRole('button', { name: 'Confirmer l’envoi de cet email' }).click()
      await page.getByText('Relance envoyée.', { exact: true }).waitFor(); assert.equal(sends, 1)
      const pdf = await context.request.get(`http://localhost:3020/api/invoices/${invoice.id}/pdf`)
      assert.equal(pdf.status(), 200); const bytes = await pdf.body(); assert.equal(bytes.subarray(0, 4).toString(), '%PDF')
      fs.writeFileSync('/tmp/encair-followup.pdf', bytes)
      const noToken = await context.request.post(`http://localhost:3020/api/invoices/${invoice.id}/remind`, { data: { type: 'email_1' } })
      assert.equal(noToken.status(), 409); assert.deepEqual(errors, [])
      results.push({ width, preview: 'no send before confirmation', pdfBytes: bytes.length, missingConfirmation: noToken.status() })
      await context.close()
    }
    console.log(JSON.stringify(results))
  } finally { await browser.close(); fixture.close() }
}
main().catch(error => { console.error(error); fixture.close(); process.exitCode = 1 })
