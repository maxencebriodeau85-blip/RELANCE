import Link from 'next/link'
import { ResendForm } from '@/components/auth/resend-form'
import { Logo } from '@/components/brand/logo'
export default function ResendPage() {
  return <main id="main-content" tabIndex={-1} className="outline-none min-h-screen flex items-center justify-center bg-[#f7f4ed] p-6"><div className="w-full max-w-md rounded-2xl border bg-white p-8 space-y-6">
    <Logo size="sm" /><h1 className="text-2xl font-semibold">Confirmer votre adresse</h1>
    <p className="text-sm text-gray-600">Un lien expiré ou un email introuvable ? Recevez une nouvelle confirmation.</p>
    <ResendForm /><Link className="block text-sm text-brand-700 underline" href="/auth/login">Retour à la connexion</Link>
  </div></main>
}
