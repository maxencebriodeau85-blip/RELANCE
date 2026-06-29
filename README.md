# RelanceFlow

> Logiciel français de relance automatique des factures impayées, conçu pour les indépendants, consultants et TPE.

[![Site](https://img.shields.io/badge/site-relanceflow.fr-4F46E5)](https://relanceflow.fr) [![Stack](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org) [![Stack](https://img.shields.io/badge/Supabase-Postgres-3ECF8E)](https://supabase.com) [![Stack](https://img.shields.io/badge/Stripe-Checkout-635BFF)](https://stripe.com)

## Ce que ça fait

- **Pipeline CRM** kanban 5 étapes (prospect → signé → payé) avec drag-and-drop
- **Factures** créées en 2 clics, conformes aux mentions légales françaises (TVA art. 293B CGI, désignation prestation), exportables en PDF
- **Relances email automatiques** à J+7 / J+15 / J+30 avec bouton de paiement Stripe intégré (taux de paiement +9 j plus vite vs sans)
- **Templates personnalisables** par utilisateur — variables `{{client_name}}`, `{{amount}}`, etc., preview live dans l'éditeur
- **Mise en demeure légale** conforme art. 1344 C.civ. et L441-10 C.com., avec calcul automatique des pénalités (taux BCE + 10 points + indemnité forfaitaire 40 €)
- **Tracking d'engagement** Resend (delivered / opened / clicked / bounced) affiché dans la timeline de chaque facture
- **Calculateur de pénalités** public (outil SEO + lead magnet)
- **Multi-plans** Stripe (Starter 19 € / Pro 49 € / Business 99 €) avec essai 30 j sans CB

## Stack technique

- **Framework** : Next.js 14 (app router, Server Components, Edge runtime pour OG image)
- **DB** : Supabase Postgres + Row Level Security + 10 migrations versionnées
- **Auth** : Supabase Auth (email/password + magic link), middleware sync (zero round-trip)
- **Email** : Resend (SDK v3.2) + Idempotency-Key + webhook Svix-verified
- **Paiement** : Stripe Checkout + webhooks signature-verified
- **PDF** : `@react-pdf/renderer` en runtime Node (route `/api/invoices/[id]/pdf`)
- **Style** : Tailwind CSS + shadcn/ui + identité brand custom (palette indigo, Plus Jakarta Sans)
- **Hosting** : Vercel (région CDG1, hébergement Europe)

## Démarrage local

```bash
# Pré-requis : Node 18.17+, compte Supabase, compte Stripe (mode test)
cp .env.example .env.local   # remplir les clés

npm install
npm run dev                  # http://localhost:3000
```

### Variables d'environnement essentielles

| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin Supabase (server, webhooks) |
| `NEXT_PUBLIC_APP_URL` | URL de l'app pour les liens dans emails |
| `STRIPE_SECRET_KEY` / `STRIPE_*_PRICE_ID` | Stripe Checkout + plans |
| `RESEND_API_KEY` | Envoi des emails |
| `RESEND_WEBHOOK_SECRET` | Vérification signature webhook Resend (Svix) |
| `CRON_SECRET` | Auth des cron jobs (relances quotidiennes) |

## Scripts utiles

```bash
npm run dev          # serveur de développement
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run setup:stripe # crée les prix Stripe (idempotent)
```

## Structure

```
app/
  ├── (landing)      page.tsx, about, guides, modeles, calculateur-penalites, contact, changelog
  ├── auth/          login, register, confirm, reset-password, forgot-password
  ├── dashboard/     page.tsx, invoices, pipeline, contacts, scenarios, templates, stats, settings…
  ├── api/           invoices, contacts, profile, webhooks, stripe, cron, health
  └── pay/[token]/   page publique de paiement client (lien dans les emails)

components/
  ├── brand/         Logo (SVG signature)
  ├── landing/       SiteNav, SiteFooter, PricingSection, TestimonialsSection, ResultsSection, ProductTour, ComparisonSection, FAQSection, TrustStrip
  ├── dashboard/     Sidebar, CommandPalette (⌘K), Header, OnboardingWizard, LineChart…
  └── ui/            shadcn/ui primitives

lib/
  ├── supabase/      client.ts (browser), server.ts (server + admin)
  ├── email-templates.ts   4 templates de relance + interpolation custom
  ├── invoice-pdf.tsx      composant PDF @react-pdf/renderer
  ├── validation.ts        isValidEmail, isValidDate, escapeHtml, sanitizeHeaderValue
  ├── metrics.ts           calculateDashboardMetrics, calculateDSO, PLAN_LIMITS, formatEuro
  └── stripe.ts            STRIPE_PLANS (source of truth)

supabase/migrations/   10 migrations SQL idempotentes
```

## Licence

Propriétaire — tous droits réservés. Voir [mentions légales](https://relanceflow.fr/mentions-legales) et [CGU](https://relanceflow.fr/cgu).

---

Made in Paris.
