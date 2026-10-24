# Audit de lancement Encair — 24 octobre 2026

Ce document distingue les constats vérifiés des vérifications qui nécessitent une recette réelle. Il ne constitue pas une certification de sécurité ou de disponibilité.

## Priorité P0 : relances automatiques non prouvées
- `vercel.json` prévoit `GET /api/cron/reminders` à `0 8 * * *` (UTC).
- La route exige `CRON_SECRET`, une configuration Resend avec webhook signé et un accès Supabase.
- Le 24 octobre, la ligne `public.collection_worker` en production n'avait ni `started_at`, ni `completed_at`, ni `last_result`.
- Conséquence : aucun passage réussi n'est démontré. Ne pas annoncer les relances automatiques comme opérationnelles avant une preuve.
- Recette sans email client : vérifier d'abord le statut du déploiement, les variables de production et les logs d'invocation du cron ; effectuer ensuite un test contrôlé sur un compte de recette, avec un destinataire autorisé. **Ne pas déclencher manuellement le cron en production tant que des factures réelles sont éligibles.**

## Priorité P0 : abonnements et authentification
- Le code de checkout vérifie le prix Stripe, cherche les abonnements existants et réutilise les sessions ouvertes.
- Le webhook Stripe vérifie la signature et synchronise l'état courant de l'abonnement.
- Il reste à prouver avec des comptes de test : inscription, confirmation email, essai, checkout, webhook, renouvellement, échec de paiement, annulation et reprise.
- Les variables présentes ne prouvent pas que les identifiants Stripe et Resend sont valides.

## Priorité P1 : base et sécurité
- Les 17 tables du schéma `public` contrôlées le 24 octobre ont RLS activé.
- L'advisor Supabase signale la protection contre les mots de passe compromis désactivée : activer dans les réglages Auth après validation des conséquences pour les utilisateurs.
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- L'advisor performance signale des clés étrangères non indexées et des politiques RLS qui recalculent `auth.uid()`. Étudier les index et migrations séparément, avec EXPLAIN et tests sur une base de recette.
  https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
  https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
- Aucune modification de schéma ou de données clients n'a été appliquée dans cet audit.

## Priorité P1 : montants et notifications
- Le calcul `outstanding` soustrait les paiements partiels en centimes entiers.
- La PR #12 a ajouté les tests de non-régression sur 2 869,66 € moins 506,51 € = 2 363,15 € et le blocage des factures soldées.
- Le générateur historique de mise en demeure répond 410. Vérifier que l'interface actuelle ne présente aucun bouton mort vers cet ancien endpoint.
- Une erreur réseau de Resend peut être ambiguë : ne pas renvoyer automatiquement un email dont l'acceptation est inconnue.

## Priorité P1 : exploitation et sauvegardes
- Revoir la PR #5 avant fusion : vérifier la restauration, le chiffrement, les droits GitHub et le comportement en échec.
- Définir une alerte si le worker n'a pas terminé dans les 26 heures, si les webhooks échouent ou si les sauvegardes sont invalides.
- Vérifier les métriques opérationnelles sur des données de recette sans exposer les coordonnées clients.

## Critères de lancement
1. Déploiement de production READY, route health consultée et logs du cron vérifiés.
2. Au moins un passage contrôlé du worker enregistré avec `last_result.ok=true`.
3. Test de relance signé Resend reçu sur une boîte de recette, sans doublon.
4. Parcours Stripe de bout en bout validé en mode test.
5. Sauvegarde restaurée avec succès et alertes opérationnelles.
6. Tests, typecheck, lint et build verts dans GitHub Actions.

Les changements de ce chantier doivent passer par PR et vérifications CI avant fusion.

---

# Compléments du 24 octobre (après-midi) : causes, corrections, actions restantes

## Constats nouveaux, vérifiés en lecture seule

| Domaine | Constat vérifié | Conséquence |
| --- | --- | --- |
| Relances automatiques | En production Vercel, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` et `RESEND_WEBHOOK_SECRET` sont **absents** (définis seulement pour la préversion `codex/encair-customer-journey`). `CRON_SECRET` est présent. | `automationAvailable` est faux : le cron répond 503 **avant** de réserver le worker, d'où `collection_worker` entièrement vide. C'est la cause la plus probable du « passage non démontré ». |
| Relances automatiques | Le plan Vercel Hobby ne conserve qu'1 h de journaux. | Un 503 ou un 401 du cron était invisible, d'où l'ajout d'une trace en base et de `/api/cron/status`. |
| Stripe | En production, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `STRIPE_FOUNDER_PRICE_ID` sont **absents**. | Checkout et webhook répondent 503 : l'abonnement est impossible en production aujourd'hui. |
| Authentification | L'organisation Supabase est en offre **Free**. La protection contre les mots de passe compromis (HaveIBeenPwned) de Supabase est réservée à l'offre Pro. | L'option ne peut pas être activée en l'état. Un contrôle équivalent est désormais fait par l'application (voir plus bas). |
| Base de recette | `encair-test` n'a que 10 migrations sur 29 (pas de `collection_worker`, ni la plupart des migrations d'octobre). Elle est vide (0 utilisateur, 0 facture). | Toute recette sur préversion échouerait contre un schéma obsolète. **À mettre à niveau avant la recette Stripe et relances.** |
| Sauvegardes | Le dépôt GitHub `RELANCE` est **public**. | La PR #5 publierait des artefacts de sauvegarde de production (emails, empreintes de mots de passe) protégés par une simple phrase de passe. La PR #13 désactive les jobs **sans alerte**. Aucune des deux ne doit être fusionnée en l'état. |
| Sauvegardes | Le test de restauration de la PR #5 s'exécute à la racine du dépôt : `supabase start` y rejoue d'abord les migrations du dépôt, puis la restauration entre en collision avec ces objets. `config.toml` indique aussi PG15 alors que la production est en PG17. | La restauration aurait très probablement échoué : elle n'est pas prouvée. |
| Montants | Aucun bouton de l'interface ne pointe vers les endpoints retirés (`/formal-notice`, `/api/pay/*`, qui répondent 410). | Point de l'audit levé. |
| Resend | Une erreur réseau ou 5xx laisse la relance `pending` (clé d'idempotence `reminder-<id>`) : pas de renvoi automatique. | Point de l'audit confirmé conforme. |

## Corrections apportées (branche `claude/busy-mccarthy-cuum7r`)

1. **Observabilité du worker** (`20261024151000_collection_worker_attempts.sql`, `app/api/cron/reminders`, `app/api/cron/status`)
   - Un passage bloqué (configuration absente, réservation impossible) est désormais tracé dans `collection_worker.last_attempt_at` et `last_blocked_reason`.
   - `GET /api/cron/status` est protégé par `CRON_SECRET` et ne renvoie aucune donnée client. Il répond 503 dans quatre cas : automatisation non configurée, aucun passage terminé depuis 26 h, dernier passage en échec, état illisible. Il peut être branché sur une surveillance externe.
   - `/api/health` expose aussi `automationReady`.
2. **Mots de passe compromis** (`lib/password-security.ts`)
   - Inscription et réinitialisation refusent les mots de passe présents dans HaveIBeenPwned, par k-anonymat : seuls 5 caractères du SHA-1 sortent du serveur.
   - En cas d'indisponibilité du service, le contrôle laisse passer.
   - Le message d'erreur Supabase équivalent est traduit, en prévision de l'offre Pro.
3. **Performances SQL** (`20261024150000_rls_initplan_fk_indexes.sql`)
   - Les 24 policies signalées passent à `(select auth.uid())` via `ALTER POLICY` : même sémantique, aucun instant sans policy.
   - 6 index de clés étrangères sont ajoutés. Aucun index « inutilisé » n'est supprimé.
4. **Stripe** (`app/api/stripe/webhook`, `docs/RECETTE-STRIPE.md`)
   - Deux réponses 500 sont corrigées : client inconnu d'Encair avec un prix étranger, session Checkout non créée par Encair. Stripe les aurait relivrées pendant 3 jours et aurait pu désactiver l'endpoint.
   - 30 tests de cycle de vie sont ajoutés : essai, checkout, 3DS, renouvellement, `past_due`, `unpaid`, annulation, pause et reprise, livraisons en double ou désordonnées.
   - Un script de recette manuelle est rédigé en mode test, avec horloges de test Stripe.
5. **Sauvegardes et alertes** : refonte de la PR #13 (voir la section dédiée de `docs/exploitation.md` une fois intégrée).

Vérifications locales : `npm run typecheck`, `npm test` (373 tests), `npm run lint`. Les migrations sont testées dans PGlite. **Rien n'a été appliqué en production.**

## Actions restantes pour l'exploitant (non automatisables sans vos accès)

| Priorité | Action | Critère de fin |
| --- | --- | --- |
| P0 | Passer le dépôt GitHub en **privé** avant de créer tout secret de sauvegarde. | `gh api repos/<owner>/RELANCE --jq .private` vaut `true`. |
| P0 | Mettre à niveau `encair-test` avec les migrations du dépôt (`supabase db push` sur la base de recette, ou application par l'assistant avec votre confirmation). | Les 29 migrations sont présentes et les advisors sont propres sur `encair-test`. |
| P0 | Vérifier un domaine d'envoi dans Resend, puis ajouter en **production** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` et `RESEND_WEBHOOK_SECRET`, et créer le webhook Resend de production. | `/api/health` renvoie `automationReady: true`. |
| P0 | Appliquer en production les deux migrations du 24 octobre **avant** de déployer le code (sinon `/api/cron/status` répond 503). | `collection_worker` possède `last_attempt_at`. |
| P0 | Dérouler `docs/RECETTE-STRIPE.md` en mode test, puis la mise en production Stripe (section 5). | Preuves archivées pour chaque étape. |
| P0 | Recette des relances sur préversion avec un destinataire possédé, sans facture réelle éligible. | `last_result.ok=true`, un email reçu, aucun doublon. |
| P1 | Brancher une surveillance externe sur `/api/cron/status` (en-tête `Authorization: Bearer …`) et sur `/api/health`. | Une alerte est reçue lors d'un test volontaire. |
| P1 | Passer Supabase en offre Pro avant le lancement commercial : protection native des mots de passe, sauvegardes gérées et PITR. Sur Free, la sauvegarde GitHub est la seule existante. | Advisor `auth_leaked_password_protection` résolu. |
| P1 | Décider du délai de grâce `past_due`, et régler Stripe « après échec de toutes les relances » sur *Annuler* ou *Marquer impayé*. | Réglage noté dans `RECETTE-STRIPE.md`. |
| P2 | Remplacer `maxence.briodeau85@gmail.com` par `contact@encair.fr` dans `SUPPORT_EMAIL` et `NEXT_PUBLIC_CONTACT_EMAIL`, comme l'indique le commentaire de la variable. | Adresse professionnelle affichée. |
