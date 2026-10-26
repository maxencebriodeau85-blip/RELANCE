# Corrections et contrôles — 25 octobre 2026

## Base Supabase de test `encair-test`

Modifications appliquées et vérifiées dans la base de test uniquement :

- `public.handle_new_user()` : `search_path` fixé à vide, table `public.profiles` qualifiée explicitement, droit `EXECUTE` retiré à `PUBLIC`, `anon` et `authenticated` ; fonction trigger conservée.
- `public.set_user_plan(uuid,text)` : `search_path` fixé à vide et table `public.profiles` qualifiée explicitement.
- `public.update_updated_at_column()` : `search_path` fixé à vide.

**Vérification :** l'analyseur de sécurité Supabase renvoie `lints: []`. Une requête SQL confirme les chemins de recherche et les permissions. Le parcours d'inscription complet reste à tester.

## Préproduction Vercel

Le déploiement `dpl_Cp7C8MsdaKA8dWvByCKUTVjR7nrP` (commit `35a3680`) est `READY` ; la compilation Next.js a réussi et 78 pages statiques ont été générées. Les tests Vitest et les parcours Stripe/Resend ne sont pas confirmés par cette preuve.

## Suivi nécessaire

Les corrections SQL ont été exécutées directement sur `encair-test` et ne sont pas encore représentées par une migration versionnée dans le dépôt. Avant synchronisation vers une autre base, créer une migration officielle, relire les triggers et tester l'inscription. Ne pas appliquer automatiquement à la production.

Autres points : protection contre les mots de passe compromis désactivée sur `RECOUVREMENT` ; plusieurs avertissements de performance RLS et d'indexation sur les deux bases. Ne pas modifier les politiques RLS sans tests intercomptes.
