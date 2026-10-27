import Link from 'next/link'
import { brandColors, symbolPath, wordmarkPaths } from '@/lib/brand/artwork'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'
type Variant = 'default' | 'mono-white' | 'mono-dark'
const sizes = { sm: 'h-8', md: 'h-10', lg: 'h-12' }

function Artwork({ variant, withWordmark = false }: { variant: Variant; withWordmark?: boolean }) {
  const ink = variant === 'mono-white' ? '#ffffff' : brandColors.ink
  return (
    <svg viewBox={`0 0 ${withWordmark ? 296 : 64} 64`} width="100%" height="100%" fill="none" aria-hidden="true" focusable="false">
      <path d={symbolPath} stroke={ink} strokeWidth="10.5" strokeLinecap="round" />
      <rect x="25" y="28" width="36" height="9" rx="4.5" fill={variant === 'default' ? brandColors.accent : ink} />
      {withWordmark && <g fill={ink} fillRule="evenodd">{wordmarkPaths.map((d, i) => <path key={i} d={d} />)}</g>}
    </svg>
  )
}

export function LogoMark({ size = 'md', variant = 'default', className }: {
  size?: Size
  variant?: Variant
  className?: string
}) {
  return <span className={cn('inline-flex aspect-square shrink-0', sizes[size], className)} aria-hidden="true"><Artwork variant={variant} /></span>
}

export function Logo({ href = '/', size = 'md', variant = 'default', withWordmark = true, className }: {
  href?: string | null
  size?: Size
  variant?: Variant
  withWordmark?: boolean
  className?: string
}) {
  const classes = cn('inline-flex shrink-0 items-center', sizes[size], withWordmark ? 'aspect-[296/64]' : 'aspect-square', className)
  const content = <Artwork variant={variant} withWordmark={withWordmark} />
  return href
    ? <Link href={href} aria-label="Encair — accueil" className={classes}>{content}</Link>
    : <span role="img" aria-label="Encair" className={classes}>{content}</span>
}
