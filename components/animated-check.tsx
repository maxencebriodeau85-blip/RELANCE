import { cn } from '@/lib/utils'

interface AnimatedCheckProps {
  size?: number
  className?: string
}

// Drawn-checkmark confirmation (DA): circle pops in (300ms), then the check
// stroke draws itself (400ms). Pure CSS keyframes — see globals.css
// (.animate-check-pop / .animate-check-draw), disabled under reduced-motion.
export function AnimatedCheck({ size = 64, className }: AnimatedCheckProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-green-100 animate-check-pop',
        className
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Confirmé"
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 12.5 9.5 18 20 6.5"
          stroke="#16a34a"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-check-draw"
        />
      </svg>
    </span>
  )
}
