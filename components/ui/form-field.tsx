import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CommonProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
}

type InputProps = CommonProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    as?: 'input'
  }

type TextareaProps = CommonProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
    as: 'textarea'
  }

type Props = InputProps | TextareaProps

// Single form field with label, hint, error message and consistent styling.
// Use across landing/dashboard forms instead of re-implementing the wrapper.
export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  function FormField({ label, hint, error, required, className, as = 'input', ...rest }, ref) {
    const id = (rest as { id?: string }).id || `f-${label.replace(/\s+/g, '-').toLowerCase()}`
    const inputClass = cn(
      'w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40',
      error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-brand-400',
      as === 'textarea' && 'resize-y',
      className
    )

    return (
      <div>
        <label
          htmlFor={id}
          className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          {hint && <span className="text-[10px] font-normal text-gray-400">{hint}</span>}
        </label>
        {as === 'textarea' ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            className={inputClass}
            {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={id}
            className={inputClass}
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    )
  }
)
