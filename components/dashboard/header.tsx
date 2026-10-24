import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="flex min-h-16 flex-col items-start justify-between gap-3 border-b bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-6">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {actions}
      </div>
    </header>
  )
}
