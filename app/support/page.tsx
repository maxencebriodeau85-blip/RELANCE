'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, Mail, MessageCircle, FileText, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

const faqs = [
  {
    question: 'Comment importer mes factures ?',
    answer:
      'Rendez-vous dans le dashboard → Factures → Importer CSV. Vous pouvez exporter votre fichier depuis n\'importe quel logiciel de facturation (Pennylane, Sage, QuickBooks…). RelanceFlow détecte automatiquement les colonnes.',
  },
  {
    question: 'Les relances sont-elles envoyées automatiquement ?',
    answer:
      'Oui. Une fois votre scénario configuré, RelanceFlow envoie les relances selon le calendrier défini (J+15, J+30, J+45…) sans aucune action de votre part. Vous recevez une notification à chaque envoi.',
  },
  {
    question: 'La mise en demeure est-elle juridiquement valable ?',
    answer:
      'La mise en demeure générée par RelanceFlow est conforme à l\'article L441-10 du Code de commerce français. Elle inclut le calcul automatique des pénalités de retard légales. Nous vous recommandons de l\'envoyer en recommandé avec AR pour lui donner une valeur probante maximale.',
  },
  {
    question: 'Puis-je annuler mon abonnement à tout moment ?',
    answer:
      'Oui, sans engagement et sans frais. La résiliation prend effet à la fin de la période mensuelle en cours. Vous conservez l\'accès jusqu\'à cette date.',
  },
  {
    question: 'Comment modifier un scénario de relance ?',
    answer:
      'Dans le dashboard → Scénarios, cliquez sur le scénario à modifier. Vous pouvez personnaliser le délai d\'envoi, l\'objet et le corps de chaque email. Les formules {{client_name}}, {{invoice_number}}, {{amount}} sont disponibles.',
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    answer:
      'Vos données sont hébergées en Europe, chiffrées en transit (TLS 1.3) et au repos. Nous appliquons une politique d\'accès stricte (Row Level Security). Consultez notre politique de confidentialité pour tous les détails.',
  },
]

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setSubmitted(true)
    } catch {
      setSendError('Une erreur est survenue. Écrivez-nous directement à hello@relanceflow.fr')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">RelanceFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Se connecter</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/register">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-16 text-center px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Centre d&apos;aide</h1>
          <p className="text-xl text-gray-600 max-w-xl mx-auto">
            Une question ? Notre équipe répond sous 24h en jours ouvrés.
          </p>
        </section>

        {/* Contact cards */}
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="text-center p-6 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-3">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Email</h3>
                <p className="text-sm text-gray-500">Réponse sous 24h ouvrées</p>
                <a
                  href="mailto:hello@relanceflow.fr"
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  hello@relanceflow.fr
                </a>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-3">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Chat en direct</h3>
                <p className="text-sm text-gray-500">Bientôt disponible</p>
                <span className="text-sm text-gray-400">Prochainement depuis le dashboard</span>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-3">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Guides pratiques</h3>
                <p className="text-sm text-gray-500">Tutoriels et bonnes pratiques</p>
                <a href="/guides" className="text-sm text-blue-600 font-medium hover:underline">Consulter les guides</a>
              </CardContent>
            </Card>
          </div>

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Questions fréquentes
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    {openFaq === i ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t bg-gray-50">
                      <p className="pt-4">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact form */}
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Nous contacter
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Vous ne trouvez pas la réponse ? Envoyez-nous un message.
            </p>

            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Message envoyé !</h3>
                <p className="text-gray-500">
                  Nous vous répondrons sous 24h à <strong>{formState.email}</strong>.
                </p>
                <Button variant="outline" onClick={() => { setSubmitted(false); setFormState({ name: '', email: '', subject: '', message: '' }) }}>
                  Envoyer un autre message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                      id="name"
                      placeholder="Jean Dupont"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@entreprise.fr"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet</Label>
                  <Input
                    id="subject"
                    placeholder="Ex: Problème d'import CSV"
                    value={formState.subject}
                    onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder="Décrivez votre problème ou question en détail..."
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    required
                  />
                </div>
                {sendError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{sendError}</p>
                )}
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? 'Envoi…' : 'Envoyer le message'}
                </Button>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t bg-gray-50 py-8 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} RelanceFlow. Tous droits réservés.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/cgu" className="hover:text-gray-900">CGU</Link>
            <Link href="/privacy" className="hover:text-gray-900">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-gray-900">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
