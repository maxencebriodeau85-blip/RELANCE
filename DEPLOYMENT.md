# Déploiement Encair

Le build ne crée pas de domaine et n’applique pas de migration. Les opérations externes réellement effectuées sont récapitulées ci-dessous ; les abonnements existants restent inchangés.

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

## Parcours client — inscription à l’abonnement

Le parcours fonctionne ainsi : inscription → email de confirmation → espace d’essai → premiers pas (profil, import, vérification) → choix explicite de l’abonnement → Stripe → vérification serveur de l’activation. L’annulation du paiement retourne sur `/subscription`, accessible même avec un essai expiré. Aucun paramètre `checkout=success` ne donne accès au plan payant.

### Supabase Auth (configuration nécessaire dans le projet)

1. Appliquer 015, puis **016_customer_onboarding.sql**. La seconde migration reprend le nom renseigné à l’inscription et conserve une copie protégée de la version des conditions acceptées. Elle ne réinitialise aucun essai existant.
2. Activer Email/Password et la confirmation d’email. Fixer le minimum du mot de passe à 8 caractères (l’application accepte 8 à 128 caractères).
3. Configurer **Site URL** avec le domaine réellement contrôlé. Autoriser les redirections `${APP_URL}/auth/confirm` et `${APP_URL}/auth/confirm?next=/auth/reset-password&type=recovery`, ainsi que `/auth/reset-password` pour les anciens liens. Pour la préproduction, ajouter explicitement ses URLs correspondantes ; ne pas ouvrir une wildcard Vercel globale. `VERCEL_URL` sert aux liens de preview et `NEXT_PUBLIC_APP_URL` à la production.
4. Configurer un **SMTP personnalisé** dans Supabase Auth : le service email intégré est limité et ne constitue pas l’envoi commercial. `RESEND_API_KEY` dans Vercel ne configure pas le SMTP Supabase. Avec Resend : domaine d’envoi vérifié, SMTP `smtp.resend.com`, port 465/TLS, utilisateur `resend`, mot de passe = clé API Resend, expéditeur vérifié. Ne jamais mettre cette clé dans une variable `NEXT_PUBLIC_*`.
5. Coller les modèles `supabase/templates/confirmation.html` (Confirm signup) et `supabase/templates/recovery.html` (Reset password). Les liens TokenHash se valident sur un autre navigateur/appareil sans dépendre du cookie PKCE d’origine. **Ces deux modèles correspondent aux URLs RedirectTo de cette version** : confirmation sans query ; récupération avec `?next=/auth/reset-password&type=recovery`. Pour tester depuis le tableau de bord Supabase, fournir exactement ce RedirectTo ; ne pas réutiliser un RedirectTo quelconque.
6. Désactiver la réécriture/tracking des liens pour les emails d’authentification chez le fournisseur. Vérifier les dossiers spam, les paramètres DNS du domaine et les limites d’envoi du projet.

Les anciens liens PKCE et implicites restent pris en charge. La vérification automatique d’URL du client Supabase est désactivée : un seul composant consomme le token, puis le retire de l’historique. Les sessions expirées sont renouvelées dans le middleware avec des cookies renvoyés au navigateur ; l’autorisation reste vérifiée côté serveur. Les requêtes Auth sont bornées à 8 secondes par appel pour ne pas rester suspendues lors d’une panne.

### Stripe (configuration nécessaire dans le compte)

- Configurer une clé restreinte avec les permissions nécessaires (clients, prix, abonnements, Checkout et portail), le prix fondateur et l’endpoint `/api/stripe/webhook`, API **2026-09-30.endive** et événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`. Le client et le script utilisent Stripe Node **23.0.0**. Version vérifiée dans la [documentation Stripe](https://docs.stripe.com/api/versioning) le 14 octobre 2026 ; l’API par défaut du compte n’a pas été modifiée.
- Activer le portail client Stripe : consultation des factures, moyen de paiement et résiliation. Vérifier les règles de fin de période et de relance des paiements échoués dans Stripe.
- Le checkout exige clés, webhook et prix configurés. Il crée un client Stripe lié au profil, réutilise un paiement ouvert et dirige un abonné existant vers le portail. Deux demandes concurrentes utilisent une même clé d’idempotence. Un retour de paiement vérifie propriétaire, abonnement et prix auprès de Stripe avant d’activer le profil, même si le webhook n’est pas encore arrivé.
- L’activation dans Supabase doit réussir : une erreur retourne un échec à Stripe pour permettre une nouvelle livraison. Le retour attend puis offre une nouvelle vérification sans inviter à payer à nouveau.
- Stripe conserve les clés d’idempotence pendant une durée limitée ; les sessions ouvertes et abonnements existants sont également consultés. Les abonnements historiques multiples doivent être régularisés dans Stripe, pas supprimés automatiquement par le site.

### Recette réelle avant ouverture

Utiliser ses propres adresses de test et Stripe test :
- Inscription avec consentements → nom conservé → email reçu → ouverture du lien sur un autre appareil → tableau de bord et essai de 30 jours/10 factures.
- Email déjà enregistré, mot de passe incorrect, renvoi du lien, lien expiré, mot de passe oublié, ancien lien PKCE.
- Fermeture/réouverture du navigateur et navigation après expiration du jeton ; aucune boucle de connexion.
- Import initial → suivi en pause → confirmation du solde → activation volontaire.
- Checkout annulé, double clic, essai expiré, paiement validé avant réception du webhook, échec de paiement et résiliation.

`/api/health` indique seulement la présence des variables, **pas** la validité des clés, la disponibilité de la base, le SMTP ou la livraison des emails. Les tests locaux utilisent des services simulés ; ils ne remplacent pas cette recette sur le vrai projet. Aucune migration ni configuration externe n’est appliquée par `npm run build`.

Références de configuration : [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [modèles Auth](https://supabase.com/docs/guides/auth/auth-email-templates), [URLs de redirection](https://supabase.com/docs/guides/auth/redirect-urls), [Resend SMTP](https://resend.com/features/smtp-service).


## État vérifié le 14 octobre 2026

### Base RECOUVREMENT (`ernphhgmmkntlhdgnrnn`)

- Le schéma 015 était déjà présent ; il n’a pas été réexécuté.
- `016_customer_onboarding.sql` appliqué sous la version distante **20261014161733** (`customer_onboarding`).
- `20261014161850_harden_collection_import.sql` appliqué sous la version distante **20261014161850** : import en contexte utilisateur avec RLS, exécution anonyme révoquée, validation email/champs obligatoires corrigée, chemin SQL du trigger d’attribution fixé.
- Vérification sur PostgreSQL distant dans une transaction annulée : création du profil/nom/essai de 30 jours, protection du plan et des conditions déclarées, import/réimport avec paiements partiels, isolation entre deux comptes et interdiction anonyme. Les effectifs avant/après sont identiques : 2 comptes, 2 profils, 1 facture et 1 relance.
- Aucun avertissement de sécurité de schéma restant. L’avertissement Auth `Leaked Password Protection Disabled` reste à traiter dans les paramètres Auth selon le plan disponible ; aucun forfait payant activé.
- **Ne pas lancer `db push` aveuglément** : les versions historiques locales et distantes diffèrent. Comparer l’historique et le schéma avant réparation ; ne pas réappliquer 015 sur ce projet.

### Stripe — compte de test sélectionné

Compte `acct_1TqGm2ClFPaDnX9x`, mode test uniquement :

| Ressource | Identifiant / état |
| --- | --- |
| Produit Encair Fondateur | `prod_VROMi1xzS66spm` |
| `STRIPE_FOUNDER_PRICE_ID` | `price_1UQVZlClFPaDnX9xbhD44hCf` |
| Clé de recherche | `encair_founder_monthly_16_eur_v1` |
| Montant | 1 600 centimes EUR / mois, hors taxes |
| Portail par défaut actif | `bpc_1UQVa5ClFPaDnX9xrhuiwK9u` |
| Portail : fonctions | Historique, carte, coordonnées fiscales, résiliation en fin de période |
| Webhook distant | Aucun endpoint présent ; à créer avec l’URL de préproduction vérifiée |

Les anciens produits/prix ont été conservés. Aucun paiement, client ou abonnement de test n’a été créé. Le prix et le portail ont été relus après création. Ces identifiants ne doivent pas être utilisés avec des clés de production. La configuration HT ne calcule pas la TVA ; renseigner le régime et les inscriptions fiscales avant toute collecte avec Stripe Tax.

### Ce qui empêche encore une recette de bout en bout

- Le connecteur Vercel renvoie **403** pour l’équipe `maxencebriodeau85-blips-projects` / projet `relance`. Les variables Stripe, le secret de webhook et les paramètres d’envoi n’ont donc pas pu être raccordés au site.
- Les outils Supabase disponibles ne permettent pas d’administrer les paramètres Auth/SMTP. La Site URL, les redirections, les modèles et la réception effective des emails restent à configurer/vérifier dans le tableau de bord.
- Conserver les secrets dans les variables **Sensitive** de Vercel, jamais dans le dépôt ou les logs. Utiliser des clés distinctes par environnement.
- Les 110 tests automatisés, typecheck et lint passent. Le test réel navigateur → email → connexion → paiement Stripe → mise à jour Supabase reste nécessaire ; un build réussi ne prouve pas ce parcours.
