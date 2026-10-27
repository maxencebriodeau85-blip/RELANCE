import Link from 'next/link'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'
type Variant = 'default' | 'mono-white' | 'mono-dark'
const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }

/** E construit comme une suite de lignes, ponctuée par le signal de suivi. */
export function LogoMark({ size = 'md', variant = 'default', className }: {
  size?: Size
  variant?: Variant
  className?: string
}) {
  const light = variant === 'mono-white'
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', sizes[size], className)} aria-hidden="true">
      <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" focusable="false">
        <rect width="64" height="64" rx="15" fill={light ? '#fff' : '#182b40'} />
        <path d="M21 19v26M21 19h21M21 32h15M21 45h21" stroke={light ? '#182b40' : '#fff'} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="40" y="28.5" width="8" height="7" rx="3.5" fill={variant === 'default' ? '#ea693a' : light ? '#182b40' : '#fff'} />
      </svg>
    </span>
  )
}

export function Logo({ href = '/', size = 'md', variant = 'default', withWordmark = true, className }: {
  href?: string | null
  size?: Size
  variant?: Variant
  withWordmark?: boolean
  className?: string
}) {
  const content = <>
    <LogoMark size={size} variant={variant} />
    {withWordmark && <span className={cn('font-semibold tracking-[-.055em]', size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl', variant === 'mono-white' ? 'text-white' : 'text-[#182b40]')}>encair</span>}
  </>
  return href ? <Link href={href} aria-label="Encair — accueil" className={cn('inline-flex items-center gap-2.5', className)}>{content}</Link> : <span className={cn('inline-flex items-center gap-2.5', className)}>{content}</span>
}
