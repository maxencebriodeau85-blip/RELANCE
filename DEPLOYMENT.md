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
    "appUrl": false,
    "cronSecret": false
  }
}
```

- `authReady: false` → variables Supabase manquantes → **étape 1**.
- `authReady: true` mais connexion impossible → **étape 2** (config Auth Supabase),
  puis **étape 0 bis** ci-dessous (base Supabase en pause).

### 0 bis. « La connexion remarche plus » alors que rien n'a changé

Symptôme : le site répond, `/api/health` renvoie `authReady: true`, mais toute
connexion échoue. Cause la plus probable : **le projet Supabase s'est mis en
pause automatiquement**.

Vérifier : Supabase → le projet doit être `ACTIVE_HEALTHY`. S'il est `INACTIVE`,
cliquer **Restore** — la connexion remarche quelques minutes après.

Pourquoi ça arrive, et pourquoi ça revient :

1. Un projet Supabase **plan Free** se met en pause après ~7 jours **sans
   aucune activité sur la base**.
2. Le seul trafic régulier qui touche Postgres est le cron quotidien
   `/api/cron/reminders` (08:00).
3. Ce cron **fail-closed** : si `CRON_SECRET` n'est pas défini côté Vercel, il
   répond `401` **avant** d'ouvrir la moindre connexion à la base (c'est
   volontaire : sans ce garde-fou, n'importe qui pourrait déclencher un envoi
   d'emails en masse).
4. Résultat : le cron échoue en silence tous les jours, la base ne voit jamais
   de trafic, elle se met en pause au bout d'une semaine, **et le login tombe
   pour tout le monde**.

Donc : `cronSecret: false` dans `/api/health` = la panne de connexion va
**revenir toute seule** dans ~7 jours. Corriger en définissant `CRON_SECRET`
(tableau de l'étape 1), ce qui suffit à garder la base active en continu.

> Pour un usage réellement commercial, le plan Free Supabase n'est de toute
> façon pas adapté (mise en pause automatique, pas de sauvegardes longues) :
> voir « Plans requis pour la mise en production » en fin de document.

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

> **Produits Stripe déjà créés** (compte "environnement de test RelanceFlow", mode test) —
> colle ces 3 valeurs directement dans les variables `STRIPE_STARTER_PRICE_ID` / `_PRO_` / `_BUSINESS_` :
> - Starter (19 €/mois) → `price_1TqHKAClFPaDnX9xW2c7NOlf`
> - Pro (49 €/mois) → `price_1TqHKDClFPaDnX9x7kMBEIBH`
> - Business (99 €/mois) → `price_1TqHKFClFPaDnX9xZzM6qPa3`
>
> Ce sont des IDs de **mode test** — corrects pour valider le parcours de bout en
> bout sans vraie carte bancaire (utilise le numéro de test Stripe `4242 4242 4242 4242`,
> n'importe quelle date future, n'importe quel CVC). Avant un vrai lancement
> commercial, recrée les mêmes produits en **mode live** dans Stripe et remplace
> ces valeurs par les IDs `price_...` du mode live.
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
- `014_reminders_dedupe_race.sql` — **bloquant** : sans cette migration, une
  relance (cron `/api/cron/reminders`) relancée deux fois par Vercel peut
  envoyer le même email — y compris une mise en demeure — deux fois au même
  débiteur.

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

## Plans requis pour la mise en production

Deux limites de plan bloquent une exploitation réellement commerciale. Elles
n'ont rien à voir avec le code — le code est prêt — mais elles sont bloquantes.

**Vercel : passer de Hobby à Pro (~20 $/mois).** Les *Terms of Service* de
Vercel réservent le plan Hobby à un usage **personnel et non commercial**. Dès
que le site encaisse des abonnements, il faut le plan Pro. Effet de bord utile :
la rétention des logs passe de 1 h à 24 h, ce qui rend les incidents
diagnosticables après coup (sur Hobby, un cron qui échoue la nuit est
introuvable le lendemain matin).

**Supabase : passer de Free à Pro (~25 $/mois).** Le plan Free met le projet en
pause après ~7 jours d'inactivité (voir étape 0 bis) et ne conserve pas de
sauvegardes exploitables. Pour une base qui contient des factures clients et
des mises en demeure, la mise en pause automatique et l'absence de sauvegarde
sont rédhibitoires.

## Checklist « je peux me connecter »

- [ ] `/api/health` → `authReady: true`
- [ ] `/api/health` → `cronSecret: true` (sinon la base retombera en pause)
- [ ] Projet Supabase en `ACTIVE_HEALTHY` (pas `INACTIVE`)
- [ ] Site URL + Redirect URLs configurés dans Supabase
- [ ] « Confirm email » désactivé (test) **ou** SMTP configuré (prod)
- [ ] Migrations 011 + 012 + 014 exécutées
- [ ] Redeploy effectué après chaque changement de variable

## Checklist « je peux vendre »

- [ ] Vercel sur plan **Pro** (Hobby interdit l'usage commercial)
- [ ] Supabase sur plan **Pro** (pas de mise en pause auto)
- [ ] `/api/health` → `stripeSecret: true` et `stripeWebhook: true`
- [ ] `/api/health` → `resend: true` (sans ça **aucune relance n'est envoyée** —
      c'est la fonction principale du produit)
- [ ] Un paiement test de bout en bout a bien mis à jour le plan du compte
