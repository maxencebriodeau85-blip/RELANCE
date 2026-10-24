// The legacy importer ignored balances and used credentials in URLs.
// Keep an explicit response for existing clients; never silently accept data.
export { legacyWebhookRetired as POST } from '@/lib/unavailable-features'
