import { track } from '@vercel/analytics'
/** Closed labels only: never send an email, account ID, invoice URL, UTM or free text. */
export function trackTrialClick(href: string, pathname: string, origin: string, emit: typeof track = track) {
  try {
    const url = new URL(href, origin)
    if (url.origin !== origin || url.pathname !== '/auth/register') return
    const surface = pathname === '/' ? 'home' : pathname === '/guides' || pathname.startsWith('/guides/') ? 'guides' : pathname.startsWith('/modeles') ? 'templates' : 'other'
    emit('trial_cta_clicked', { surface })
  } catch { /* Analytics must never prevent navigation. */ }
}
