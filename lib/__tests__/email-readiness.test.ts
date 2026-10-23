import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/health/route'
import { serviceCapabilities } from '../service-capabilities'
const emailVars = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_WEBHOOK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPPORT_EMAIL', 'CRON_SECRET'] as const
const setup = () => {
  vi.stubEnv('RESEND_API_KEY', 're_test-only')
  vi.stubEnv('RESEND_FROM_EMAIL', 'sender@example.invalid')
  vi.stubEnv('RESEND_WEBHOOK_SECRET', 'whsec_test-only')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'qa-only')
  vi.stubEnv('CRON_SECRET', 'qa-cron')
}
beforeEach(() => { for (const name of emailVars) vi.stubEnv(name, '') })
afterEach(() => vi.unstubAllEnvs())
describe('Email configuration diagnosis', () => {
  it.each(['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_WEBHOOK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'] as const)('cannot mark reminders configured when %s is absent', async variable => {
    setup()
    vi.stubEnv(variable, '')
    expect(serviceCapabilities()).toEqual({ emailAvailable: false, automationAvailable: false })
    expect((await GET().json()).config.reminderEmailConfigured).toBe(false)
  })
  it('reports configured reminder tracking without claiming delivery or Auth SMTP', async () => {
    setup()
    const response = await GET().json()
    expect(response.checks).toBe('configuration-presence-only')
    expect(response.config).toMatchObject({ resend: true, resendWebhook: true, emailSender: true, reminderEmailConfigured: true, supportEmail: false })
    expect(Object.values(response.config).every(value => typeof value === 'boolean')).toBe(true)
    expect(response.config).not.toHaveProperty('smtpReady')
    expect(JSON.stringify(response)).not.toContain('whsec_test-only')
    expect(JSON.stringify(response)).not.toContain('sender@example.invalid')
  })
  it('keeps cron availability separate from manual delivery configuration', () => {
    setup()
    vi.stubEnv('CRON_SECRET', '')
    expect(serviceCapabilities()).toEqual({ emailAvailable: true, automationAvailable: false })
  })
})
