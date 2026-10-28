'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { PublicPage } from '@/components/landing/public-page'
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
      <PublicPage>
        <div className="rf-page rf-page-narrow">
          <div className="rf-card block p-8 text-center sm:p-10" role="status">
            <CheckCircle className="mx-auto mb-4 h-10 w-10 text-[#3f6b4c]" aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight text-[#182b40]">Message envoyé</h1>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-[#4e5b68]">
              Merci pour votre message. Je réponds personnellement, en général sous 48 h ouvrées.
            </p>
            <Link href="/" className="rf-button rf-button-dark mt-6">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à l’accueil
            </Link>
          </div>
        </div>
      </PublicPage>
    )
  }

  const fieldError = (name: string) =>
    errors[name] ? (
      <p id={`${name}-erreur`} className="rf-error">
        {errors[name]}
      </p>
    ) : null
  const describedBy = (name: string) => (errors[name] ? `${name}-erreur` : undefined)

  return (
    <PublicPage>
      <div className="rf-page">
        <header className="rf-page-head">
          <span className="rf-eyebrow">Contact</span>
          <h1>Une question ? Écrivez au fondateur.</h1>
          <p>
            Import de vos factures, tarif, suggestion ou bug à signaler : votre message arrive
            directement à la personne qui développe Encair.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form onSubmit={handleSubmit} noValidate className="rf-card block space-y-5 p-6 sm:p-8 lg:col-span-2" aria-label="Formulaire de contact">
            {/* Pot de miel : invisible pour les visiteurs, rempli par les robots. */}
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="rf-field">
                <label htmlFor="contact-nom">
                  Votre nom <span aria-hidden="true" className="text-[#b42318]">*</span>
                </label>
                <input
                  id="contact-nom"
                  type="text"
                  autoComplete="name"
                  required
                  aria-required="true"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={describedBy('name')}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={100}
                />
                {fieldError('name')}
              </div>
              <div className="rf-field">
                <label htmlFor="contact-email">
                  Email <span aria-hidden="true" className="text-[#b42318]">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={describedBy('email')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={200}
                />
                {fieldError('email')}
              </div>
            </div>

            <div className="rf-field">
              <label htmlFor="contact-objet">Objet</label>
              <input
                id="contact-objet"
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ex : import de l’export CSV de mon logiciel"
                maxLength={200}
              />
            </div>

            <div className="rf-field">
              <label htmlFor="contact-message">
                Message <span aria-hidden="true" className="text-[#b42318]">*</span>
              </label>
              <textarea
                id="contact-message"
                required
                aria-required="true"
                aria-invalid={errors.message ? true : undefined}
                aria-describedby={['contact-compteur', describedBy('message')].filter(Boolean).join(' ')}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={7}
                className="resize-y"
                maxLength={5000}
              />
              {fieldError('message')}
              <p id="contact-compteur" className="rf-meta mt-1">{form.message.length} / 5000 caractères</p>
            </div>

            {globalError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#f3c1bb] bg-[#fdf1ef] p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b42318]" aria-hidden="true" />
                <p className="text-sm text-[#8f1d13]">{globalError}</p>
              </div>
            )}

            <p className="rf-meta">
              Vos nom, email et message servent uniquement à vous répondre et sont conservés 3 ans
              après le dernier échange.{' '}
              <Link href="/privacy" className="underline underline-offset-2">Politique de confidentialité</Link>
            </p>

            <button type="submit" disabled={sending} className="rf-button rf-button-dark w-full sm:w-auto">
              {sending ? (
                'Envoi en cours…'
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" /> Envoyer le message
                </>
              )}
            </button>
          </form>

          <aside className="space-y-4" aria-label="Autres moyens de contact">
            <div className="rf-card block p-6">
              <h2 className="flex items-center gap-2 font-semibold text-[#182b40]">
                <Mail className="h-4 w-4 text-[#b9522d]" aria-hidden="true" /> Par email
              </h2>
              {CONTACT_EMAIL ? (
                <a href={`mailto:${CONTACT_EMAIL}`} className="rf-link mt-2 inline-block break-all text-sm">
                  {CONTACT_EMAIL}
                </a>
              ) : (
                <p className="mt-2 text-sm text-[#4e5b68]">Utilisez le formulaire.</p>
              )}
              <p className="rf-meta mt-2">Réponse personnelle, en général sous 48 h ouvrées.</p>
            </div>
            <div className="rf-card block p-6">
              <h2 className="font-semibold text-[#182b40]">Avant d’écrire</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/#faq" className="rf-link">Questions fréquentes</Link></li>
                <li><Link href="/securite" className="rf-link">Sécurité et données</Link></li>
                <li><Link href="/guides" className="rf-link">Guides du recouvrement</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </PublicPage>
  )
}
