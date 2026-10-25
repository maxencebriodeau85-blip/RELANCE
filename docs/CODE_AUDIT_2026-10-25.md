# Audit transversal du code — 25 octobre 2026

> Revue statique ciblée, **non exhaustive**. Les contrôles n'ont pas exécuté les services externes. Aucun outil de délégation à plusieurs agents indépendants n'était disponible dans cette session. Les axes ci-dessous ont été examinés en parallèle par lecture des fichiers GitHub.

## P0 — vérifications bloquantes

1. **État réel des prestataires non démontré** — `app/api/health/route.ts` expose `status: ok` tout en précisant `configuration-presence-only`. Les booléens indiquent seulement la présence des variables, pas la validité des clés ni l'envoi réel. **Risque :** faux sentiment de disponibilité si la supervision ne lit que `status`. Vérifier avec une sonde de bout en bout séparée, sans divulguer les secrets.
2. **Webhook Stripe : état `past_due` non révoqué explicitement** — `app/api/stripe/webhook/route.ts` ne synchronise que `active`/`trialing`, et révoque `canceled`/`unpaid`/`paused`/`incomplete_expired`. Une transition vers `past_due` laisse potentiellement le plan payé en base. **Décision métier nécessaire** : définir la période de grâce et la tester ; ne pas révoquer arbitrairement sans politique validée.
3. **Lancement non démontré** — `DEPLOYMENT.md` et `COMMERCIAL_LAUNCH.md` requièrent encore SMTP Auth, Resend, Stripe test, RLS intercomptes, sauvegarde/restauration, mentions et CGU. **Risque :** ouvrir la vente sur des parcours non validés.

## P1 — anomalies / limites à confirmer par tests

4. **Webhooks Resend : rejets de payloads malformés renvoyés 500** — `app/api/webhooks/resend/route.ts` intercepte aussi l'erreur `JSON.parse` dans un `catch` global et répond 500. Les payloads malformés signés devraient produire 400, et les erreurs temporaires de base rester 5xx.
5. **Cron : limite de traitement et reprise** — `app/api/cron/reminders/route.ts` lit au plus 100 factures et tente 25 envois par passage ; `finish_collection_worker` assure le curseur. Tester la rotation réelle des comptes, les longues séries de factures non éligibles, les pannes du fournisseur et la reprise après expiration de bail.
6. **Import : cohérence aperçu / confirmation** — `app/api/invoices/import/route.ts` accepte `expected_updated_at` fourni par le client et délègue le contrôle transactionnel à `import_collection_invoices`. Vérifier côté SQL que le client ne peut pas contourner les invariants en falsifiant la charge utile, et que l'absence de nouvelle facture n'évite pas abusivement les quotas.
7. **Checkout : pagination Stripe bornée** — `app/api/stripe/checkout/route.ts` inspecte au plus 100 abonnements et 100 sessions. Vérifier le comportement d'un compte historique volumineux avant d'affirmer l'absence de doublons.
8. **CSP : `unsafe-inline` et `unsafe-eval`** — `next.config.js` autorise les deux en `script-src`. Évaluer une politique à nonce/hachage compatible avec Next.js et Stripe ; ne pas supprimer à l'aveugle sans recette.

## Points positifs observés dans les fichiers examinés

- Signature Stripe vérifiée avant traitement du webhook.
- Webhook Resend exige un secret, vérifie signature et fenêtre temporelle, puis passe par une RPC SQL.
- Cron exige un bearer secret et s'appuie sur un bail de travail.
- Import : validation commune, limite de volume, aperçu et RPC transactionnelle.
- Checkout : prix Stripe relu, vérification de montant/devise/périodicité, idempotence.
- Les relances manuelles passent par un service commun ; leur sécurité effective dépend aussi de ce service et des politiques SQL, non entièrement audités ici.

## Fichiers inspectés

`app/api/stripe/webhook/route.ts`, `app/api/stripe/checkout/route.ts`, `app/api/cron/reminders/route.ts`, `app/api/invoices/import/route.ts`, `app/api/invoices/[id]/remind/route.ts`, `app/api/auth/login/route.ts`, `app/api/health/route.ts`, `app/api/webhooks/resend/route.ts`, `next.config.js`, `package.json`, `README.md`, `DEPLOYMENT.md`, `COMMERCIAL_LAUNCH.md`, `docs/GITHUB_WORKFLOW.md`, `.github/workflows/verify.yml`.

## Portée et prochaine étape

Ce document n'est pas un inventaire de **chaque erreur** du dépôt. Les autres routes, services métier, composants UI, migrations SQL et politiques RLS doivent encore être parcourus, puis vérifiés par tests locaux et tests d'intégration sur préproduction. Aucun lancement commercial ne doit se baser uniquement sur cette revue.
