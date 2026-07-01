import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  href?: string | null
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'mono-white' | 'mono-dark'
  withWordmark?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: { box: 'h-7 w-7', icon: 14, text: 'text-base' },
  md: { box: 'h-9 w-9', icon: 18, text: 'text-lg' },
  lg: { box: 'h-12 w-12', icon: 24, text: 'text-2xl' },
} as const

export function LogoMark({
  size = 'md',
  variant = 'default',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'mono-white' | 'mono-dark'
  className?: string
}) {
  const dims = SIZE_MAP[size]
  const gradientId = `rf-grad-${variant}`
  return (
    <span
      className={cn(
        // DA 2026-07 : icône éclair dans un CERCLE, dégradé violet→bleu.
        // Déclinaisons : plein gradient (default), fond blanc (mono-white),
        // contour seul sur fond sombre (mono-dark).
        'inline-flex items-center justify-center rounded-full',
        dims.box,
        variant === 'default' && 'bg-brand-gradient text-white shadow-sm shadow-brand-500/30',
        variant === 'mono-white' && 'bg-white text-brand-600 shadow-sm',
        variant === 'mono-dark' && 'bg-transparent text-white border-2 border-white/70',
        className
      )}
      aria-hidden="true"
    >
      <svg
        width={dims.icon}
        height={dims.icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="currentColor" />
            <stop offset="1" stopColor="currentColor" />
          </linearGradient>
        </defs>
        {/* Circular flow ring (relance loop) */}
        <path
          d="M20.5 12a8.5 8.5 0 1 1-2.49-6.01"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
        {/* Arrow tip closing the loop */}
        <path
          d="M16 3v5h5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.55"
        />
        {/* Lightning bolt — the "flow" energy at the center */}
        <path
          d="M13 6.5 9 13h3l-1 4.5L15 11h-3l1-4.5Z"
          fill={`url(#${gradientId})`}
          stroke="currentColor"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function Logo({
  href = '/',
  size = 'md',
  variant = 'default',
  withWordmark = true,
  className,
}: LogoProps) {
  const dims = SIZE_MAP[size]
  const Wrapper = href ? Link : 'span'
  const props = href ? { href } : {}

  return (
    <Wrapper
      {...(props as { href: string })}
      className={cn('inline-flex items-center gap-2.5 group', className)}
    >
      <LogoMark size={size} variant={variant} className="group-hover:scale-105 transition-transform" />
      {withWordmark && (
        <span
          className={cn(
            'font-display font-bold tracking-tight',
            dims.text,
            variant === 'mono-white' && 'text-white',
            variant === 'mono-dark' && 'text-brand-950',
            variant === 'default' && 'text-gray-900'
          )}
        >
          Relance<span className="text-brand-gradient">Flow</span>
        </span>
      )}
    </Wrapper>
  )
}
