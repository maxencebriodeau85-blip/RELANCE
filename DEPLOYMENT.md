# Déploiement & configuration RelanceFlow

Runbook complet pour mettre le site en ligne et **faire fonctionner la connexion**.
Suis les étapes dans l'ordre. Après chaque changement de variable sur Vercel, il
faut **redéployer** (les variables ne sont lues qu'au build).

## 0. Diagnostic express

Ouvre `https://<ton-url>/api/health`. Le champ `config` te dit tout :

```json
{
  "config": {
    "authReady": false,        // ← si false, la connexion NE PEUT PAS marcher (étape 1)
    "supabaseUrl": false,
    "supabaseAnonKey": false,
    "supabaseServiceRole": false,
    "stripeSecret": false,
    "stripeWebhook": false,
    "resend": false,
    "appUrl": false
  }
}
```

- `authReady: false` → variables Supabase manquantes → **étape 1**.
- `authReady: true` mais connexion impossible → **étape 2** (config Auth Supabase).

## 1. Variables d'environnement Vercel  *(bloquant pour le login)*

Vercel → projet `relance` → **Settings → Environment Variables**. Ajoute (scope
*Production* + *Preview*) — valeurs depuis Supabase → **Project Settings → API** :

| Variable | Où la trouver | Bloque quoi si absente |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL | **Login/inscription** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → `anon` `public` | **Login/inscription** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` (secret) | Dashboard, cron, paiement facture |
| `NEXT_PUBLIC_APP_URL` | `https://<ton-url>` | Liens dans les emails |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys | Abonnement & paiement |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → API keys | Checkout |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks (étape 4) | Confirmation paiement |
| `STRIPE_STARTER_PRICE_ID` / `_PRO_` / `_BUSINESS_` | Stripe → Products | Choix du plan |
| `RESEND_API_KEY` | resend.com → API Keys | Envoi des relances |
| `RESEND_FROM_EMAIL` | ex. `relances@tondomaine.fr` (domaine vérifié Resend) | Envoi des relances |
| `CRON_SECRET` | une chaîne aléatoire que tu choisis | Sécurise le cron de relances |

→ **Redeploy** (Deployments → ⋯ → Redeploy) après ajout.

## 2. Configuration Auth Supabase  *(si authReady = true mais login KO)*

Supabase → **Authentication → URL Configuration** :
- **Site URL** = `https://<ton-url>` (exacte, sans slash final).
- **Redirect URLs** : ajoute `https://<ton-url>/auth/confirm` et
  `https://<ton-url>/auth/callback`.

Supabase → **Authentication → Providers → Email** :
- Si **« Confirm email » est activé** sans serveur SMTP, l'email de
  confirmation n'arrive pas (limites très basses du mailer intégré) → tu ne
  peux jamais te connecter après inscription.
- Pour **tester rapidement** : désactive « Confirm email », crée un compte,
  connecte-toi immédiatement.
- Pour la **prod** : configure un SMTP (Resend) dans Supabase → Auth → SMTP
  Settings, puis réactive « Confirm email ».

## 3. Migrations base de données

Supabase → **SQL Editor** → exécute dans l'ordre les fichiers de
`supabase/migrations/` qui ne sont pas encore appliqués. En particulier :
- `011_lock_profile_columns.sql` — verrouille les colonnes de facturation.
- `012_enforce_invoice_quota.sql` — quota de factures atomique (anti-triche
  d'abonnement).

Ou, avec la CLI Supabase liée au projet : `supabase db push`.

## 4. Webhook Stripe

Stripe → **Developers → Webhooks → Add endpoint** :
- URL : `https://<ton-url>/api/stripe/webhook`
- Événements : `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`.
- Copie le **Signing secret** (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET` (étape 1),
  puis redeploy.

## 5. Domaine personnalisé (optionnel, pour plus tard)

1. Achète `relanceflow.fr` (ou autre) et ajoute-le dans Vercel → Settings → Domains.
2. Mets `NEXT_PUBLIC_APP_URL=https://relanceflow.fr` et l'URL dans Supabase Auth (étape 2).
3. Ajoute `ENFORCE_CANONICAL_HOST=true` pour rediriger les URLs `*.vercel.app`
   vers le domaine (laisse cette variable **absente** tant que le domaine n'est
   pas actif, sinon le site devient inaccessible via l'URL Vercel).

## Checklist « je peux me connecter »

- [ ] `/api/health` → `authReady: true`
- [ ] Site URL + Redirect URLs configurés dans Supabase
- [ ] « Confirm email » désactivé (test) **ou** SMTP configuré (prod)
- [ ] Migrations 011 + 012 exécutées
- [ ] Redeploy effectué après chaque changement de variable
