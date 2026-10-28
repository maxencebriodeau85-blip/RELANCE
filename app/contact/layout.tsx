import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Contact',
  description:
    'Une question sur Encair, l’import de vos factures ou le tarif ? Écrivez directement au fondateur : réponse personnelle, en général sous 48 h ouvrées.',
  path: '/contact',
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
