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
