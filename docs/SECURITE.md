# Sécurité d'Encair : audit du 27 octobre 2026

À refaire avant chaque ouverture importante (nouveaux clients, changement de prestataire) et au moins une fois par mois : `npm audit`, recherche de secrets, `npm test` (contrôles `security-config`).

## Secrets

- **Dépôt** : historique complet des 21 branches parcouru le 27/10/2026 à la recherche de clés Stripe (`sk_`, `rk_`, `whsec_`), Resend (`re_`), JWT Supabase de service et chaînes de connexion PostgreSQL. **Aucune valeur trouvée.** L'ancien `vercel.json` (avril 2026) ne contenait que des références `@nom`, pas de valeurs.
- **Navigateur** : seules les variables publiques sont exposées (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, et la clé publiable Stripe si elle est définie). Le test `security-config` échoue si une autre variable `NEXT_PUBLIC_` apparaît.
- **Vercel** : les secrets (clé de service Supabase, `CRON_SECRET`, Stripe, Resend) sont en variables *Sensitive*, illisibles une fois enregistrées.
- Le dépôt est encore **public** : le passer en privé reste nécessaire pour les sauvegardes (voir `docs/exploitation.md`), même sans secret dans le code.

## Dépendances (`npm audit`)

| Paquet | Gravité | Faille | Traitement |
| --- | --- | --- | --- |
| next ≤ 15.5.27 | **Critique** | Exécution de code à distance via l'optimiseur d'images et des SVG ([GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw)) | **Corrigé** : passage en 15.5.28. L'optimiseur, inutilisé, est en plus coupé et n'accepte plus aucune image distante (il acceptait `*.supabase.co`, donc n'importe quel projet Supabase). |
| next ≤ 15.5.27 | Haute | Déni de service via les Server Actions ([GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r)) | **Corrigé** : 15.5.28. |
| zod < 4.6.6 | Haute | Mémoire saturée en validant une très grande collection ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) | **Non exploitable ici** : chaque corps de requête validé par zod est plafonné par `readJsonBody` (32 Ko au plus pour les formats d'import), donc aucune grande collection n'atteint zod. Le passage à zod 4 est un changement majeur, à prévoir hors urgence. |
| vitest ≤ 4.1.11 | Modérée | Injection via l'enregistrement de mocks ([advisories vitest](https://github.com/vitest-dev/vitest/security/advisories)) | Outil de test seulement, jamais déployé ni exposé. La mise à jour en 4.1.12 bute sur un bug de npm 10.9 (`edgesOut`) ; à refaire avec une version suivante de npm. |

Après correctif : 0 faille critique, 1 haute non exploitable (zod) dans les dépendances de production.

## Analyse de risques (résumé)

| Risque | Protection en place | Reste à faire |
| --- | --- | --- |
| Un client voit les données d'un autre | RLS sur toutes les tables, fonctions SQL vérifiant le propriétaire ; prouvé par `scripts/ops/recette-base.sql` (contrôles 21 à 27) | Tester les routes HTTP `/api/v1` et les exports |
| Relance envoyée deux fois ou avec un mauvais montant | Réservation SQL par facture, délai de 24 h, solde vérifié de moins de 7 jours, montant = reste dû (contrôles 04, 32 à 40 et tests `reminder-service`) | Envoi réel signé Resend, après le domaine |
| Client qui s'attribue un abonnement | Garde SQL sur les colonnes de facturation (contrôle 18), plan fixé par le webhook Stripe signé | Recette Stripe en mode test |
| Fuite par le dépôt public | Aucun secret dans l'historique (voir plus haut) | Dépôt privé |
| Perte de données | Sauvegarde quotidienne chiffrée et restaurée (workflows prêts) | Dépôt privé + secrets GitHub, puis premier passage réel ; Supabase Pro pour le PITR |
| Script injecté dans les pages | CSP stricte sur les origines | Retirer `unsafe-inline`/`unsafe-eval` demande une recette dans le navigateur, connecté |
