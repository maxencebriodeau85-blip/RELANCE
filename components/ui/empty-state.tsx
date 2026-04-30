import { type LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  iconColor?: string
  iconBg?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <div className={`mx-auto w-16 h-16 ${iconBg} rounded-full flex items-center justify-center mb-4`}>
        <Icon className={`h-8 w-8 ${iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>}
      {action && <div className="flex flex-wrap gap-2 justify-center">{action}</div>}
    </div>
  )
}
