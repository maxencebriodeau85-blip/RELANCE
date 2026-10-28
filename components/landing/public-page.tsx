import { SiteNav } from './site-nav'
import { SiteFooter } from './site-footer'
import { cn } from '@/lib/utils'

/**
 * Coque commune de toutes les pages publiques : même navigation, même papier,
 * même pied de page. Le <main id="main-content"> est la cible du lien
 * « Aller au contenu principal » du layout racine.
 */
export function PublicPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="rf-site flex min-h-screen flex-col">
      <SiteNav />
      <main id="main-content" tabIndex={-1} className={cn('flex-1 outline-none', className)}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
