interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="flex min-h-20 flex-col items-start justify-between gap-4 border-b border-[#e8e6e0] bg-[#fcfbf8] px-5 py-5 sm:flex-row sm:items-center sm:px-8">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-.025em] text-[#182b40]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#576574]">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
    </header>
  )
}
