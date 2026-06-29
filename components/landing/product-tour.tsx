import { FileText, Mail, CheckCircle, ArrowRight, Sparkles, Clock } from 'lucide-react'

export function ProductTourSection() {
  return (
    <section id="produit" className="py-20 px-4 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-3">
            Le produit en 3 écrans
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            De la facture à l&apos;encaissement, sans intervention
          </h2>
          <p className="text-gray-500 mt-3 text-lg max-w-2xl mx-auto">
            Un aperçu réaliste de ce qui se passe quand vous créez une facture sur RelanceFlow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1 — Invoice creation */}
          <div className="relative">
            <div className="absolute -top-3 left-6 z-10 bg-white px-3 py-1 rounded-full border border-blue-200 text-xs font-bold text-blue-700">
              1. Vous créez la facture
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              {/* fake browser chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="h-2 w-2 rounded-full bg-red-300" />
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                <span className="h-2 w-2 rounded-full bg-green-300" />
                <span className="ml-2 text-[10px] text-gray-400 font-mono">relanceflow.fr/facture/F-2026-042</span>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-bold text-gray-900">Nouvelle facture</span>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Client</span>
                    <span className="font-medium text-gray-900">Acme Corp</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">N°</span>
                    <span className="font-mono font-medium text-gray-900">F-2026-042</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Échéance</span>
                    <span className="font-medium text-gray-900">15 mars 2026</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
                    <span className="text-xs font-semibold text-gray-700">Montant TTC</span>
                    <span className="text-lg font-bold text-blue-700">2 400 €</span>
                  </div>
                </div>
                <div className="rounded-lg bg-blue-600 text-white text-center py-2 text-xs font-semibold">
                  ✓ Facture créée — PDF généré
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 px-2">
              Saisie en 30 s. PDF conforme aux mentions légales françaises généré automatiquement.
            </p>
          </div>

          {/* Step 2 — Auto reminder */}
          <div className="relative lg:mt-8">
            <div className="absolute -top-3 left-6 z-10 bg-white px-3 py-1 rounded-full border border-amber-200 text-xs font-bold text-amber-700">
              2. RelanceFlow relance (J+7)
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <Mail className="h-3 w-3 text-amber-600" />
                <span className="text-[10px] text-gray-400 font-mono truncate">Email envoyé à compta@acme.fr</span>
              </div>
              <div className="p-4 space-y-2 text-xs">
                <p className="font-semibold text-gray-900">Objet : Rappel — Facture F-2026-042</p>
                <div className="rounded border-l-2 border-amber-400 bg-amber-50/50 px-3 py-2 text-gray-700 leading-relaxed">
                  Bonjour,<br/>
                  Votre facture <strong>F-2026-042</strong> (<strong>2 400 €</strong>) est arrivée à
                  échéance le 15 mars. Merci de procéder au règlement.
                </div>
                <div className="text-center">
                  <div className="inline-block rounded-md bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5">
                    Régler en ligne →
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-gray-500">Délivré · Ouvert il y a 2h · Cliqué</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 px-2">
              Email automatique avec bouton de paiement Stripe. Vous savez quand le client l&apos;ouvre.
            </p>
          </div>

          {/* Step 3 — Payment received */}
          <div className="relative lg:mt-16">
            <div className="absolute -top-3 left-6 z-10 bg-white px-3 py-1 rounded-full border border-green-200 text-xs font-bold text-green-700">
              3. Vous êtes payé
            </div>
            <div className="rounded-2xl border border-green-200 bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-bold">Paiement reçu</span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="text-center py-2">
                  <p className="text-3xl font-extrabold text-gray-900">+ 2 400 €</p>
                  <p className="text-xs text-gray-500 mt-1">Stripe · Acme Corp · ref. F-2026-042</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Facture marquée payée automatiquement
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="h-3 w-3 text-blue-500" />
                    Relances futures annulées
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-3 w-3 text-purple-500" />
                    Notification email + in-app
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 px-2">
              Stripe Webhook synchronise tout. Vous n&apos;avez rien à faire — pas même cocher.
            </p>
          </div>
        </div>

        {/* Flow indicator on desktop */}
        <div className="hidden lg:flex items-center justify-center gap-4 mt-8 text-xs text-gray-400">
          <span className="font-mono">facture créée</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-mono">7 jours plus tard…</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-mono">paiement reçu</span>
        </div>
      </div>
    </section>
  )
}
