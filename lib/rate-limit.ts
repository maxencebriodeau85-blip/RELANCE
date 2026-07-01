// Simple in-memory rate limiter for public API routes.
//
// LIMITATION: state lives in the current Node process only. On Vercel, each
// serverless instance has its own Map — a determined attacker can bypass by
// hitting multiple regions. This is intentional: it stops casual spam and
// naive scripts (99% of the threat model for a small SaaS), without the
// operational cost of Redis. Upgrade to Upstash / Vercel KV when you have
// abuse in production.
//
// Cleanup: entries older than the window are cleared lazily on the next hit.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitOptions {
  /** Unique namespace for this limiter (e.g., 'contact-form') */
  key: string
  /** Max requests allowed per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSec: number
}

export function rateLimit(
  ident: string,
  opts: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const bucketKey = `${opts.key}:${ident}`
  const existing = buckets.get(bucketKey)

  if (!existing || existing.resetAt <= now) {
    // fresh window
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs })
    return {
      allowed: true,
      remaining: opts.limit - 1,
      resetAt: now + opts.windowMs,
      retryAfterSec: 0,
    }
  }

  if (existing.count >= opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSec: 0,
  }
}

// Extract the caller's IP from Vercel / proxy headers.
export function getIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}
