# Déploiement Encair

La refonte prépare le code ; elle ne crée pas de domaine, ne modifie pas les abonnements existants et n'applique pas de migration sur la production.

## 1. Base de données

Sauvegarder la base et tester sur une copie représentative avant production. Pour une base ayant déjà les migrations 001–014, appliquer **015_collection_workspace.sql** une seule fois, avant de déployer le nouveau code. Les migrations historiques contiennent deux fichiers préfixés `004` : vérifier l'historique Supabase avant tout `db push`, sans renuméroter aveuglément des migrations déjà appliquées.

La migration ajoute les soldes, promesses, pauses, dates de vérification et dates de règlement. Les factures existantes sont mises en pause par défaut. Les historiques restent conservés, aucune date de règlement historique n'est déduite de `updated_at`. La date d'émission devient nullable pour les imports incomplets.

Elle relève le quota `starter` à 100, ajoute l'import atomique et la réservation des relances, corrige le contexte de sécurité du trigger de protection des colonnes de facturation et protège l'attribution des factures.

## 2. Configuration

Copier les noms de `.env.example` dans l'environnement de déploiement et utiliser des valeurs réelles distinctes pour test/production.

- Supabase : URL, clé anon publique et clé service côté serveur. Mettre les URL d'authentification et de redirection à jour.
- Domaine : vérifier la marque et acquérir/configurer un domaine contrôlé avant de renseigner `NEXT_PUBLIC_APP_URL`. **Ne pas utiliser relanceflow.fr**. L'application refuse ce domaine comme cible canonique. `ENFORCE_CANONICAL_HOST=true` ne doit être activé qu'après validation DNS/TLS ; les previews en sont exclues.
- Resend : `RESEND_API_KEY`, `RESEND_FROM_EMAIL` sur un domaine vérifié, `RESEND_WEBHOOK_SECRET` pour les événements et `SUPPORT_EMAIL`. Tester délivrabilité et réponses avec ses propres adresses avant d'activer les relances clients.
- Cron : `CRON_SECRET` fort ; le scheduler doit transmettre `Authorization: Bearer …`. Le cron traite au maximum 25 tentatives par invocation et examine les 500 premières factures admissibles. Surveiller ce plafond si le volume augmente ; une file paginée sera nécessaire au-delà.
- Éditeur : `PUBLISHER_NAME`, `PUBLISHER_ADDRESS`, `PUBLISHER_REGISTRATION`. Les mentions affichent explicitement les champs manquants. Relire CGU/confidentialité selon l'entité et les traitements réels avant ouverture commerciale.

## 3. Stripe

Configurer la clé secrète et le secret de webhook. Créer un prix récurrent mensuel EUR de 1 600 centimes pour Encair et définir `STRIPE_FOUNDER_PRICE_ID`.

Le script `npm run setup:stripe` crée/réutilise ce produit/prix dans le compte correspondant à la clé fournie ; **il effectue une écriture Stripe**. L'exécuter d'abord en mode test. Il ne migre aucun abonnement existant.

Conserver `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` tant que ces anciens prix ont des abonnés. Les nouveaux achats n'offrent que le tarif fondateur. Le prix public de 29 € est une intention affichée, pas un prix actif facturé.

Le prix est annoncé HT. Configurer le régime fiscal et les taxes applicables avant lancement : un prix `tax_behavior=exclusive` ne suffit pas à collecter une taxe. Le code n'active pas automatiquement Stripe Tax.

Tester le checkout, le portail, l'annulation et les webhooks en mode test. Vérifier que le profil reçoit le bon plan. Les erreurs de mise à jour webhook doivent être retentées. Ne pas modifier manuellement les plans via le navigateur.

## 4. Envois et historique

Aucune relance réelle n'est envoyée par les tests. Pour une facture de test : confirmer le solde, lever la pause, envoyer une première étape et vérifier Resend ainsi que l'historique Encair. Le refus d'une seconde étape dans les 24 heures est attendu.

Un statut `pending` peut signifier que le fournisseur a accepté l'email sans que l'application ait reçu de confirmation. Chercher la requête dans Resend avec la clé d'idempotence `reminder-<invoiceId>-<type>`. S'il a été accepté, compléter l'historique avec l'identifiant et le statut correspondant. Ne remettre en `failed` qu'après confirmation de non-envoi. Ne jamais supprimer une réservation pour forcer un renvoi incertain. Cette réconciliation est une opération d'administration ; il n'existe pas encore d'écran opérateur dédié.

Les anciens paiements de factures reçus sur le compte Stripe plateforme doivent être identifiés et traités manuellement. Ils ne marquent plus automatiquement une dette fournisseur comme réglée.

## 5. Validation

Exécuter typecheck, tests, build, puis un parcours complet sur une préproduction configurée : inscription/connexion, import et réimport, paiement partiel, pause/litige/promesse, relance et événement Resend, abonnement et annulation. Les tests PostgreSQL embarqués vérifient un schéma minimal ; valider également la migration avec les données et politiques RLS réelles.

Le quota compte les factures actuellement présentes créées ce mois-ci : supprimer une facture libère une place. Ce n'est pas un compteur immuable d'utilisation.

## Dépendances

Next.js et Supabase SSR ont été mis à jour ; PostCSS 8.5.30 et esbuild 0.28.2 sont imposés pour leurs correctifs. L'audit final conserve 9 alertes (7 hautes, 2 modérées), liées à braces/micromatch et au parseur de sélecteurs utilisés par Tailwind 3 et ESLint. Ces outils traitent le code source au build, pas les fichiers CSV ou données clients. La migration vers Tailwind 4 nécessite un chantier séparé ; ne pas lancer `npm audit fix --force` sans adapter et revalider les styles.
