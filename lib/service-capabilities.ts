// Configuration availability, not proof of delivery. Never return secret values.
export function serviceCapabilities() {
  const configured = (value: string | undefined) => Boolean(value?.trim() && !/placeholder|your-|build.only/i.test(value))
  const emailAvailable = configured(process.env.RESEND_API_KEY) && configured(process.env.RESEND_FROM_EMAIL) && configured(process.env.SUPABASE_SERVICE_ROLE_KEY)
  return {
    emailAvailable,
    automationAvailable: emailAvailable && configured(process.env.CRON_SECRET),
  }
}
