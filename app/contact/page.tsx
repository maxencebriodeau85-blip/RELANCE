'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, MessageCircle, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { SiteFooter } from '@/components/landing/footer'
import { Logo } from '@/components/brand/logo'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '', // honeypot
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setErrors({})
    setGlobalError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (res.status === 422 && data.fields) {
        setErrors(data.fields)
        setSending(false)
        return
      }
      if (!res.ok) {
        setGlobalError(data.error || "Impossible d'envoyer le message.")
        setSending(false)
        return
      }

      setSent(true)
    } catch {
      setGlobalError('Erreur réseau. Veuillez réessayer.')
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-md px-4 py-20">
          <div className="text-center bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Message envoyé !</h1>
            <p className="text-gray-600 text-sm mb-6">
              Merci de nous avoir contactés. Nous répondons généralement sous 24 h ouvrées.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient text-white font-semibold px-5 py-2.5 text-sm transition-all hover:shadow-lg hover:shadow-brand-500/30"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            href="/auth/register"
            className="rounded-lg bg-brand-gradient text-white text-sm font-semibold px-4 py-2 transition-all hover:shadow-md hover:scale-[1.02]"
          >
            Essai gratuit
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white mb-4 shadow-lg shadow-brand-500/30">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            Contactez-nous
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Une question, une suggestion ou un bug à signaler ? Vous parlez directement au
            fondateur, pas à un chatbot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="md:col-span-2 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4">
            {/* Honeypot — hidden from real users */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute -left-[9999px] opacity-0 pointer-events-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Votre nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                  maxLength={100}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-200'
                  }`}
                  maxLength={200}
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Objet
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ex : Question sur le plan Pro"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                  errors.message ? 'border-red-300' : 'border-gray-200'
                }`}
                maxLength={5000}
              />
              {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
              <p className="text-[11px] text-gray-400 mt-1">{form.message.length} / 5000</p>
            </div>

            {globalError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{globalError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient disabled:opacity-60 text-white font-semibold px-6 py-3 text-sm transition-all hover:shadow-lg hover:shadow-brand-500/30"
            >
              {sending ? (
                'Envoi en cours…'
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer le message
                </>
              )}
            </button>
          </form>

          {/* Info side */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Email direct</h3>
              </div>
              <a
                href="mailto:hello@relanceflow.fr"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                hello@relanceflow.fr
              </a>
              <p className="text-xs text-gray-500 mt-2">Réponse sous 24 h ouvrées.</p>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
              <h3 className="text-sm font-bold text-blue-900 mb-2">Question fréquente ?</h3>
              <p className="text-xs text-blue-800 mb-3">
                Consultez la FAQ avant d&apos;écrire — la réponse y est peut-être déjà.
              </p>
              <Link
                href="/#faq"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:gap-1.5 transition-all"
              >
                Voir la FAQ →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
