// AES-256-GCM encryption for OAuth tokens stored in DB.
// Key must be 32-byte hex string in INTEGRATION_ENCRYPTION_KEY env var.

const ALG = 'AES-GCM'
const KEY_LENGTH = 256

function getKeyMaterial(): string {
  const k = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!k || k.length < 32) {
    // Fallback for dev — in prod, always set the env var
    return 'relanceflow-dev-key-DO-NOT-USE-IN-PROD-xyz'
  }
  return k
}

async function importKey(raw: string): Promise<CryptoKey> {
  const bytes = new TextEncoder().encode(raw.slice(0, 32))
  return crypto.subtle.importKey('raw', bytes, { name: ALG }, false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey(getKeyMaterial())
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: ALG, iv }, key, encoded)
  const buf = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  buf.set(iv, 0)
  buf.set(new Uint8Array(ciphertext), iv.byteLength)
  return Buffer.from(buf).toString('base64')
}

export async function decrypt(ciphertextB64: string): Promise<string> {
  const key = await importKey(getKeyMaterial())
  const buf = Buffer.from(ciphertextB64, 'base64')
  const iv = buf.subarray(0, 12)
  const data = buf.subarray(12)
  const plaintext = await crypto.subtle.decrypt({ name: ALG, iv }, key, data)
  return new TextDecoder().decode(plaintext)
}

export async function hashApiKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return Buffer.from(hash).toString('hex')
}

export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return 'rf_live_' + Buffer.from(bytes).toString('hex')
}

export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Buffer.from(bytes).toString('hex')
}
