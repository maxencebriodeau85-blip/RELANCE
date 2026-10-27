# Recette Stripe — cycle de vie de l'abonnement Fondateur

Script de recette manuelle, en **mode test Stripe**, sur le **déploiement de préproduction Vercel (preview)** relié au projet Supabase **encair-test**. Il prouve le parcours complet : inscription → confirmation email → essai → checkout → webhook → renouvellement → échec de paiement → annulation → reprise.

Les tests automatisés (`lib/__tests__/stripe-lifecycle.test.ts`, `stripe-webhook.test.ts`, `billing-sync.test.ts`, `checkout-route.test.ts`) couvrent la logique avec des services simulés. Cette recette vérifie la configuration réelle (clés, endpoint, portail, règles de relance Stripe) qu'aucun test local ne peut prouver.

> **Aucune valeur secrète dans ce document, dans les tickets ou dans les captures.** Masquer les clés (`sk_…`, `rk_…`, `whsec_…`), la clé `service_role` et le secret de contournement Vercel avant d'archiver une preuve.

---

## 0. Rappel du comportement attendu (référence)

| Événement Stripe | Effet sur `profiles` | Accès (`assertActiveAccess`) |
| --- | --- | --- |
| Inscription (trigger `handle_new_user`) | `plan=free_trial`, `trial_ends_at≈now+30 j`, `stripe_*` vides | Autorisé pendant 30 j / 10 factures |
| Essai écoulé (`trial_ends_at` passé) | inchangé | **Refusé** (403), consultation/export seulement |
| `checkout.session.completed` (payé) ou `checkout.session.async_payment_succeeded` | `plan=starter`, `stripe_subscription_id=sub_…` ; `trial_ends_at` **inchangé** | Autorisé |
| `customer.subscription.created/updated` statut `active` ou `trialing` | idem (si le client est celui du profil) | Autorisé |
| `invoice.paid` (renouvellement) | inchangé (`starter`) | Autorisé |
| `invoice.payment_failed` / statut `past_due` | **inchangé** (`starter`) — délai de grâce = fenêtre de relance Stripe | Autorisé |
| Statut `unpaid`, `canceled`, `paused`, `incomplete_expired`, ou `customer.subscription.deleted` | `plan=free_trial`, `stripe_subscription_id=null`, `trial_ends_at=now-1 s` | **Refusé** |
| `cancel_at_period_end=true` (résiliation programmée) puis reprise | inchangé tant que le statut reste `active` | Autorisé jusqu'à la fin de période |
| Premier paiement `incomplete` (3DS abandonné) | inchangé ; l'essai restant n'est **pas** retiré | Selon l'essai |
| Événement d'un client inconnu d'Encair / session Checkout non créée par Encair | aucun | — (réponse 200) |
| Signature absente ou invalide | aucun | — (réponse 400) |
| Erreur base de données ou API Stripe pendant le traitement | aucun | — (réponse **500**, Stripe relivre) |
| Variables Stripe absentes | aucun | — (réponse 503) |

Le webhook relit toujours l'abonnement chez Stripe (`subscriptions.retrieve`) : une livraison en double ou en retard (par ex. `updated` après `deleted`) applique l'état **courant**, jamais celui du payload.

---

## 1. Variables d'environnement (noms uniquement)

| Variable | Preview (test) | Production (live) | Remarque |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | clé test (restreinte de préférence) | clé live restreinte | Absente en production aujourd'hui → paiement indisponible |
| `STRIPE_WEBHOOK_SECRET` | secret de l'endpoint **test** | secret de l'endpoint **live** | Un secret par endpoint et par mode |
| `STRIPE_FOUNDER_PRICE_ID` | prix test 16 € HT / mois | prix live 16 € HT / mois | Le checkout refuse tout prix ≠ 1 600 c EUR mensuel |
| `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` | facultatif | uniquement s'il reste des abonnés historiques | Sinon un abonnement sur ces prix renvoie 500 (prix non reconnu) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | projet encair-test | projet de production | |
| `SUPABASE_SERVICE_ROLE_KEY` | encair-test | production | Requis par le webhook (écriture des colonnes de facturation) |
| `NEXT_PUBLIC_APP_URL` | non utilisé en preview (`VERCEL_URL`) | domaine canonique | URL de retour Checkout/portail |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | facultatif | facultatif | Non lu par le code actuel |

Contrôle : `GET https://<hôte-preview>/api/health` doit renvoyer `config.billingReady: true`, `stripeSecret`, `stripeWebhook`, `stripeFounderPrice`, `supabaseServiceRole` à `true`. Ce contrôle ne prouve **que la présence** des variables.

Enregistrer les variables comme **Sensitive** dans Vercel, limitées à l'environnement Preview (et à la branche de recette si possible). Redéployer après toute modification.

---

## 2. Préparation Stripe (mode test)

### 2.1 Prix
Vérifier dans *Catalogue de produits* que le prix Fondateur test existe (lookup key `encair_founder_monthly_16_eur_v1`, 16,00 € HT, mensuel, actif). À défaut : `npm run setup:stripe` avec une clé **test** (attention : écrit dans Stripe), puis reporter l'identifiant affiché dans `STRIPE_FOUNDER_PRICE_ID` (Preview).

### 2.2 Endpoint webhook
*Développeurs → Webhooks → Ajouter un endpoint* :

- **URL** : `https://<alias-stable-de-la-branche-preview>/api/stripe/webhook`
  - Utiliser l'alias de branche Vercel (stable), pas l'URL d'un déploiement précis.
  - Si la *Deployment Protection* Vercel est active sur les previews, Stripe recevra 401 : activer *Protection Bypass for Automation* et ajouter le paramètre `?x-vercel-protection-bypass=<secret>` à l'URL de l'endpoint (secret jamais archivé en clair).
- **Version d'API** : `2026-09-30.endive`
- **Événements à cocher (exactement)** :
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
  - `invoice.paid`
  - `invoice.payment_failed`
- `invoice.payment_succeeded` n'est **pas** nécessaire (`invoice.paid` suffit) ; s'il est coché, il est simplement acquitté.
- Copier le *secret de signature* dans `STRIPE_WEBHOOK_SECRET` (Preview) et redéployer.

### 2.3 Relance des paiements échoués (obligatoire)
*Paramètres → Billing → Abonnements et e-mails → Gérer les paiements échoués* :
- Activer les nouvelles tentatives (Smart Retries ou calendrier personnalisé). Noter la durée choisie : c'est le **délai de grâce** pendant lequel un abonné `past_due` garde l'accès.
- **Statut après échec de toutes les tentatives : « Annuler l'abonnement » ou « Marquer l'abonnement comme impayé ».** Ne **jamais** choisir « Laisser l'abonnement en retard de paiement » : le code ne retire l'accès qu'aux statuts `unpaid`/`canceled`, un abonnement laissé `past_due` garderait l'accès indéfiniment.

**Décision retenue (26 octobre 2026)** : Smart Retries avec la fenêtre par défaut de Stripe (8 tentatives sur 2 semaines), puis **« Annuler l'abonnement »**. Un abonné en échec de paiement garde donc l'accès 2 semaines au plus ; à l'annulation, ses factures et son historique de relances sont conservés (retour à l'essai, sans perte de données). Activer aussi les e-mails Stripe au client en cas d'échec de paiement, pour qu'il soit prévenu sans dépendre d'Encair.

### 2.4 Portail client
*Paramètres → Billing → Portail client* (configuration du mode test) : historique des factures, mise à jour du moyen de paiement, **résiliation en fin de période**, et autoriser la reprise d'un abonnement dont la résiliation est programmée. URL de retour gérée par le code (`/subscription`).

### 2.5 Requête SQL de contrôle (encair-test, éditeur SQL)
```sql
select id, email, plan, stripe_customer_id, stripe_subscription_id, trial_ends_at, now() as maintenant
from public.profiles
where email = '<adresse-de-recette>';
```
Exécuter après **chaque** étape et archiver le résultat.

---

## 3. Déroulé

Utiliser une adresse email dédiée par passage (par ex. `recette+stripe-AAAAMMJJ-n@<domaine-contrôlé>`). Noter pour chaque étape : heure, identifiants Stripe (`cus_`, `sub_`, `in_`, `evt_`), code HTTP de la livraison webhook (*Développeurs → Webhooks → endpoint → Livraisons*), résultat SQL, capture d'écran.

### Étape 1 — Inscription et confirmation email
1. Sur la preview, `/auth/register` : raison sociale, consentements, mot de passe ≥ 8 caractères.
2. Recevoir l'email de confirmation, ouvrir le lien (idéalement sur un autre appareil).
3. **Attendu UI** : arrivée sur `/dashboard`, jours d'essai restants affichés dans la barre latérale (≈ 30) ; Paramètres → bandeau « Essai gratuit ».
4. **Attendu SQL** : `plan=free_trial`, `trial_ends_at ≈ inscription + 30 j`, `stripe_customer_id` et `stripe_subscription_id` vides.

### Étape 2 — Essai et fin d'essai
1. Créer une facture : succès.
2. Simuler la fin d'essai dans encair-test (le trigger de protection ne bloque que le rôle `authenticated`, l'éditeur SQL passe) :
   ```sql
   update public.profiles set trial_ends_at = now() - interval '1 minute' where email = '<adresse-de-recette>';
   ```
3. **Attendu UI** : bandeau « Votre essai est terminé… Voir l'abonnement » ; créer une facture → refus « Votre période d'essai est terminée… » (403) ; consultation et export possibles. `/subscription` affiche « Votre période d'essai est terminée ».

### Étape 3 — Checkout refusé puis 3DS
1. `/subscription` → bouton d'abonnement → Stripe Checkout (prix 16,00 € HT / mois affiché).
2. Payer avec `4000 0025 0000 3155` (date future, CVC quelconque), et dans la fenêtre 3DS choisir **Échec**.
3. **Attendu** : pas d'activation, SQL inchangé (`free_trial`), `stripe_customer_id` maintenant renseigné (`cus_…`). Re-cliquer sur le bouton d'abonnement rouvre **la même** session Checkout (pas de second client ni de seconde session).
4. Payer à nouveau avec `4000 0025 0000 3155` et choisir **Valider** l'authentification.

### Étape 4 — Activation (checkout + webhook)
1. Retour sur `/subscription/return?session_id=cs_…` puis redirection `/dashboard`.
2. **Attendu webhook** : `checkout.session.completed`, `customer.subscription.created`, `invoice.paid` livrés en **200**.
3. **Attendu SQL** : `plan=starter`, `stripe_subscription_id=sub_…`, `stripe_customer_id=cus_…`, `trial_ends_at` **inchangé** par rapport à l'étape 2.
4. **Attendu UI** : plus de bandeau d'essai ; création de facture autorisée ; `/subscription` redirige vers `/dashboard` ; Paramètres affiche « Portail de facturation ».
5. Re-cliquer « S'abonner » depuis un ancien onglet : redirection vers le portail, **jamais** un second abonnement (vérifier dans Stripe : un seul abonnement pour le client).

Variante sans 3DS : refaire un passage complet avec `4242 4242 4242 4242`.

### Étape 5 — Renouvellement, échec et reprise (test clocks)
Les horloges de test ne s'attachent qu'à un client **créé avec l'horloge**. Le code réutilise `profiles.stripe_customer_id` s'il existe, d'où la préparation suivante sur un **nouveau compte de recette** (refaire l'étape 1) :

1. Stripe → *Billing → Horloges de test* → créer une horloge (heure = maintenant) puis, depuis l'horloge, créer un client avec l'email du compte de recette.
2. Rattacher ce client au profil (encair-test) :
   ```sql
   update public.profiles set stripe_customer_id = '<cus_de_l_horloge>' where email = '<adresse-de-recette>' and stripe_customer_id is null;
   ```
3. Souscrire depuis l'application avec `4242 4242 4242 4242` → étape 4 attendue.
   *Repli si Checkout refuse le client d'horloge* : créer l'abonnement depuis la fiche client Stripe (prix Fondateur, métadonnée `userId=<uuid du profil>`) ; `customer.subscription.created` doit activer le profil.

**5a — Renouvellement réussi**
- Avancer l'horloge de **1 mois + 2 heures** (finalisation et paiement de la facture).
- **Attendu** : `invoice.paid` en 200, SQL inchangé (`starter`, même `sub_…`), accès conservé.

**5b — Échec de paiement au renouvellement**
- Portail de facturation (Paramètres) → ajouter la carte `4000 0000 0000 0341` (l'attachement réussit, les débits échouent), la définir par défaut, supprimer la 4242.
- Avancer l'horloge de **1 mois + 2 heures**.
- **Attendu** : `invoice.payment_failed` et `customer.subscription.updated` (statut `past_due`) en 200 ; SQL : plan **inchangé** (`starter`), `subscription_status = 'past_due'` ; accès **conservé** pendant la fenêtre de relance (délai de grâce, cf. §2.3) ; bandeau rouge « Le dernier paiement de votre abonnement a échoué » dans l'espace client, dont le bouton ouvre le portail Stripe. Après paiement : `subscription_status = 'active'`, bandeau disparu.

**5c — Fin des relances**
- Avancer l'horloge au-delà de la durée de relance configurée (par ex. +3 semaines pour un calendrier de 2 semaines), par paliers si besoin.
- **Attendu** selon le réglage §2.3 :
  - « Annuler » : `customer.subscription.updated` (`canceled`) + `customer.subscription.deleted` en 200 ;
  - « Impayé » : `customer.subscription.updated` (`unpaid`) en 200.
- **Attendu SQL** : `plan=free_trial`, `stripe_subscription_id` vide, `trial_ends_at` ≈ heure du traitement (passé).
- **Attendu UI** : bandeau d'essai terminé, création refusée (403), données consultables.

**5d — Reprise après impayé** (uniquement avec le réglage « Impayé »)
- Portail → remettre `4242 4242 4242 4242` par défaut ; Stripe → facture ouverte → *Payer* (ou attendre la tentative suivante).
- **Attendu** : `invoice.paid` en 200, statut `active`, SQL `starter` + même `sub_…`, accès rétabli.
- Avec le réglage « Annuler », la reprise passe par un **nouveau** checkout depuis `/subscription` : un nouvel `sub_…` est enregistré.

### Étape 6 — Résiliation en fin de période puis reprise (portail)
Sur un compte actif (étape 4) :
1. Paramètres → Portail de facturation → *Annuler l'abonnement* (fin de période).
2. **Attendu** : `customer.subscription.updated` (`cancel_at_period_end=true`, statut `active`) en 200 ; SQL inchangé ; accès **conservé**.
3. Portail → *Renouveler / Ne pas annuler*.
4. **Attendu** : `customer.subscription.updated` (`cancel_at_period_end=false`) en 200 ; SQL inchangé ; accès conservé.
5. Résilier à nouveau, puis (compte sur horloge de test) avancer au-delà de la fin de période — ou, sans horloge, *Annuler immédiatement* depuis le Dashboard Stripe.
6. **Attendu** : `customer.subscription.deleted` en 200 ; SQL `free_trial`, `stripe_subscription_id` vide, `trial_ends_at` passé ; accès refusé ; `/subscription` propose de souscrire à nouveau.

### Étape 7 — Garanties de livraison
1. **Livraison en retard** : dans *Webhooks → Livraisons*, renvoyer (*Renvoyer*) un ancien `customer.subscription.updated` en statut `active` d'un abonnement désormais annulé. **Attendu** : 200, SQL toujours `free_trial`.
2. **Doublon** : renvoyer deux fois le dernier `invoice.paid` d'un abonnement actif. **Attendu** : 200 ×2, SQL identique.
3. **Client inconnu** : Dashboard Stripe → créer un client sans compte Encair et un abonnement (n'importe quel prix). **Attendu** : 200, aucune ligne `profiles` modifiée.
4. **Signature** :
   ```bash
   curl -i -X POST https://<hôte-preview>/api/stripe/webhook -d '{}'                              # 400 No signature
   curl -i -X POST https://<hôte-preview>/api/stripe/webhook -H 'stripe-signature: t=1,v1=00' -d '{}'  # 400 signature invalide
   ```
5. **Erreur transitoire** (facultatif, préproduction uniquement) : remplacer temporairement `SUPABASE_SERVICE_ROLE_KEY` (Preview) par une valeur invalide, redéployer, déclencher une étape (par ex. résiliation immédiate). **Attendu** : livraison en **500** côté Stripe, SQL inchangé. Restaurer la vraie valeur, redéployer, *Renvoyer* l'événement : 200 et état attendu. Ne jamais faire ce test en production.

---

## 4. Preuves à archiver (checklist)

- [ ] SHA du commit déployé sur la preview (`/api/health` → `version`) et date/heure du passage.
- [ ] Capture `/api/health` (`billingReady: true`).
- [ ] Capture de l'endpoint webhook : URL (secret de contournement masqué), version d'API `2026-09-30.endive`, liste des 9 événements.
- [ ] Capture du réglage « Gérer les paiements échoués » (durée de relance + statut final) et de la configuration du portail.
- [ ] Étape 1 : email de confirmation reçu, résultat SQL.
- [ ] Étape 2 : refus 403 de création, bandeau UI, résultat SQL.
- [ ] Étape 3 : échec 3DS sans activation, réutilisation de la session ouverte.
- [ ] Étape 4 : `evt_` + code 200 des 3 événements, SQL `starter`, un seul abonnement côté Stripe.
- [ ] Étape 5a/5b/5c/5d : identifiant de l'horloge, `in_` de chaque facture, statut Stripe, code 200, SQL et UI après chaque avance.
- [ ] Étape 6 : `cancel_at_period_end` vrai puis faux, puis `deleted` ; SQL et UI à chaque fois.
- [ ] Étape 7 : codes HTTP des renvois, de la requête `curl`, et (si fait) 500 puis 200 de l'erreur transitoire.
- [ ] Aucune livraison en échec restante sur l'endpoint à la fin (hors test 7.5 rejoué).
- [ ] Nettoyage : horloges de test supprimées, comptes de recette identifiés.

---

## 5. Mise en production (go-live)

État connu : l'environnement Production Vercel n'a **ni** `STRIPE_SECRET_KEY`, **ni** `STRIPE_WEBHOOK_SECRET`, **ni** `STRIPE_FOUNDER_PRICE_ID` → `/api/stripe/checkout` répond 503 (« Les abonnements ne sont pas encore ouverts ») et le webhook 503. Ne passer en production qu'après une recette complète (§3) validée.

1. **Compte Stripe live activé** (identité, IBAN de versement, raison sociale, adresse, mentions sur relevé). Régime TVA tranché ; si TVA collectée, configurer Stripe Tax ou les taux : le prix `tax_behavior=exclusive` ne calcule rien seul.
2. **Prix live** : exécuter `npm run setup:stripe` avec la clé **live** (écriture Stripe ; idempotent via la lookup key) ou créer le prix manuellement (1 600 c EUR, mensuel, HT). Ne jamais réutiliser un identifiant test.
3. **Clé live restreinte** : permissions lecture/écriture *Customers*, *Checkout Sessions*, *Subscriptions*, *Customer portal*, lecture *Prices*. Pas de clé secrète complète si une clé restreinte suffit.
4. **Endpoint webhook live** : `https://<domaine-canonique>/api/stripe/webhook`, version `2026-09-30.endive`, **les mêmes 9 événements** qu'au §2.2. L'endpoint est exclu de la redirection canonique et de l'authentification (`middleware.ts`).
5. **Réglages live** (distincts du mode test) : relance des paiements échoués avec statut final « Annuler » ou « Impayé » (§2.3) ; portail client live (§2.4).
6. **Vercel → Production** (variables *Sensitive*, environnement Production uniquement) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_FOUNDER_PRICE_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` ; anciens `STRIPE_*_PRICE_ID` seulement s'il existe des abonnés historiques. Redéployer la production.
7. **Contrôles** : `/api/health` → `billingReady: true` ; `curl` sans signature → 400 ; dans Stripe, *Envoyer un événement test* → livraison 200 (acquittée sans écriture).
8. **Paiement réel de contrôle** : compte interne, vraie carte, checkout → `starter` en base ; résiliation immédiate depuis le Dashboard → `free_trial` ; rembourser le paiement. Archiver les mêmes preuves qu'au §4.
9. Surveiller pendant 72 h *Webhooks → Livraisons* (aucun échec persistant) et les logs Vercel (`Webhook handler error`, `unrecognized price ID`).

Retour arrière : il n'existe pas d'interrupteur dédié. Retirer `STRIPE_FOUNDER_PRICE_ID` de Production ferme le checkout (503) mais fait aussi échouer en 500 (prix non reconnu, relivré par Stripe) les renouvellements des abonnés au prix Fondateur ; les résiliations restent synchronisées. À n'utiliser que quelques heures, en gardant l'endpoint webhook actif, puis remettre la variable pour que Stripe rejoue les événements en attente.
