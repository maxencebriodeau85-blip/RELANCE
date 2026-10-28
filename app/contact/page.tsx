'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, MessageCircle, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { SiteFooter } from '@/components/landing/footer'
import { SiteNav } from '@/components/landing/site-nav'
import { CONTACT_EMAIL } from '@/lib/legal'

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
      <div className="rf-site min-h-screen">
        <div className="mx-auto max-w-md px-4 py-20">
          <div className="text-center bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Message envoyé !</h1>
            <p className="text-gray-600 text-sm mb-6">
              Merci pour votre message. Je réponds personnellement, en général sous 48 h ouvrées.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#182b40] text-white font-semibold px-5 py-2.5 text-sm transition-all hover:bg-[#294059]"
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
    <div className="rf-site min-h-screen">
      <SiteNav />

      <main id="main-content" className="mx-auto max-w-5xl px-5 py-8">
        <div className="text-left mb-7">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#182b40] text-white mb-4">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-3">
            Contact
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Une question sur l’import de vos factures, une suggestion ou un bug à signaler ?
            Votre message arrive directement au fondateur d’Encair.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} noValidate aria-busy={sending} className="md:col-span-2 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm space-y-4">
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
                <label htmlFor="contact-name" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Votre nom <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                  maxLength={100}
                />
                {errors.name && <p id="contact-name-error" role="alert" className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="contact-email" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-200'
                  }`}
                  maxLength={200}
                />
                {errors.email && <p id="contact-email-error" role="alert" className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Objet
              </label>
              <input
                id="contact-subject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ex : import de l’export CSV de mon logiciel"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error contact-message-length' : 'contact-message-length'}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                  errors.message ? 'border-red-300' : 'border-gray-200'
                }`}
                maxLength={5000}
              />
              {errors.message && <p id="contact-message-error" role="alert" className="text-xs text-red-600 mt-1">{errors.message}</p>}
              <p id="contact-message-length" className="text-[11px] text-gray-500 mt-1">{form.message.length} / 5000</p>
            </div>

            {globalError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{globalError}</p>
              </div>
            )}

            <p className="text-[11px] text-gray-500">
              Vos nom, email et message servent uniquement à vous répondre et sont conservés
              3 ans après le dernier échange.{' '}
              <Link href="/privacy" className="underline">Politique de confidentialité</Link>
            </p>

            <button
              type="submit"
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#182b40] disabled:opacity-60 text-white font-semibold px-6 py-3 text-sm transition-all hover:bg-[#294059]"
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
                <h3 className="text-sm font-bold text-gray-900">Par email</h3>
              </div>
              {CONTACT_EMAIL ? (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {CONTACT_EMAIL}
                </a>
              ) : (
                <p className="text-sm text-gray-600">Utilisez le formulaire ci-contre.</p>
              )}
              <p className="text-xs text-gray-500 mt-2">Réponse en général sous 48 h ouvrées.</p>
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
      </main>

      <SiteFooter />
    </div>
  )
}
