import Link from 'next/link'
import { cn } from '@/lib/utils'
type Size = 'sm' | 'md' | 'lg'
type Variant = 'default' | 'mono-white' | 'mono-dark'
const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }
export function LogoMark({
  size = 'md',
  variant = 'default',
  className,
}: {
  size?: Size
  variant?: Variant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg',
        sizes[size],
        variant === 'default'
          ? 'bg-[#ea693a] text-[#15283d]'
          : 'bg-white text-[#15283d]',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
        <path
          d="M7 10h12M7 16h10M7 22h7M19 23l7-7m-7 0h7v7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
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
}: {
  href?: string | null
  size?: Size
  variant?: Variant
  withWordmark?: boolean
  className?: string
}) {
  const content = (
    <>
      <LogoMark size={size} variant={variant} />
      {withWordmark && (
        <span
          className={cn(
            'font-semibold tracking-[-.055em]',
            size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl',
            variant === 'mono-white' ? 'text-white' : 'text-[#15283d]',
          )}
        >
          encair<span className="text-[#ea693a]">.</span>
        </span>
      )}
    </>
  )
  return href ? (
    <Link
      href={href}
      aria-label="Encair — accueil"
      className={cn('inline-flex items-center gap-2.5', className)}
    >
      {content}
    </Link>
  ) : (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {content}
    </span>
  )
}
