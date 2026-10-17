import { NextResponse, type NextRequest } from 'next/server'

// Forward query tokens to the sole client consumer. URL fragments are retained
// by the browser when the redirect destination does not specify a fragment.
export function GET(request: NextRequest) {
  const url = new URL('/auth/confirm', request.url)
  url.search = new URL(request.url).search
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}
