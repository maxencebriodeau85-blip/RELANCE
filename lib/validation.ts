// Shared validators used across API routes and client forms.
// Keep regexes here so a single fix propagates everywhere.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s)
}

export function isValidDate(s: string): boolean {
  return DATE_RE.test(s) && !isNaN(Date.parse(s))
}

// Escape user-controlled strings before inserting into HTML to prevent XSS.
// Email clients render HTML, so any unescaped data is a live attack surface.
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Strip CR/LF, double-quotes, and any non-printable ASCII from values inserted
// into HTTP headers (e.g. filenames in Content-Disposition). Prevents header
// injection (CRLF) and breakouts via quote characters. Keeps printable ASCII
// except `"` (0x22) and `\` (0x5c).
export function sanitizeHeaderValue(s: string): string {
  return String(s).replace(/[^\x20-\x21\x23-\x5b\x5d-\x7e]/g, '_')
}
