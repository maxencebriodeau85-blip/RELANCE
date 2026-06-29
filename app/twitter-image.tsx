// Twitter card uses the same image as Open Graph.
// Next.js requires static literal values for `runtime`, so we duplicate
// the metadata constants instead of re-exporting.
import OgImage from './opengraph-image'

export const runtime = 'edge'
export const alt = 'RelanceFlow — Automatisez vos relances de factures impayées'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default OgImage
