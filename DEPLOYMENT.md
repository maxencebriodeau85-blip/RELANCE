# Déploiement Encair

Le build ne crée pas de domaine et n’applique pas de migration. Les opérations externes réellement effectuées sont récapitulées ci-dessous ; les abonnements existants restent inchangés.

## 1. Base de données

Sauvegarder la base et tester sur une copie représentative avant production. Pour une base ayant déjà les migrations 001–014, appliquer **015_collection_workspace.sql** une seule fois, avant de déployer le nouveau code. Les migrations historiques contiennent deux fichiers préfixés `004` : vérifier l'historique Supabase avant tout `db push`, sans renuméroter aveuglément des migrations déjà appliquées.

La migration ajoute les soldes, promesses, pauses, dates de vérification et dates de règlement. Les factures existantes sont mises en pause par défaut. Les historiques restent conservés, aucune date de règlement historique n'est déduite de `updated_at`. La date d'émission devient nullable pour les imports incomplets.

Elle relève le quota `starter` à 100, ajoute l'import atomique et la réservation des relances, corrige le contexte de sécurité du trigger de protection des colonnes de facturation et protège l'attribution des factures.

## 2. Configuration

Copier les noms de `.env.example` dans l'environnement de déploiement et utiliser des valeurs réelles distinctes pour test/production.

- Supabase : URL, clé anon publique et clé service côté serveur. Mettre les URL d'authentification et de redirection à jour.
- Domaine : `encair.fr`, acheté chez OVH le 30/10/2026 ; zone, enregistrements et procédure de bascule dans `docs/DOMAINE.md`. Ne renseigner `NEXT_PUBLIC_APP_URL` qu'une fois le domaine servi en HTTPS. **Ne pas utiliser relanceflow.fr**. L'application refuse ce domaine comme cible canonique. `ENFORCE_CANONICAL_HOST=true` ne doit être activé qu'après validation DNS/TLS ; les previews en sont exclues.
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

Un statut `pending` peut signifier que le fournisseur a accepté l'email sans que l'application ait reçu de confirmation. Chercher la requête dans Resend avec la clé d'idempotence `reminder-<invoiceId>-<type>`. S'il a été accepté, compléter l'historique avec l'identifiant et le statut correspondant. Ne remettre en `failed` qu'après confirmation de non-envoi. Ne jamais supprimer une réservation pour forcer un renvoi incertain. Cette réconciliation est une opération d'administration : suivre `docs/INCIDENTS.md` (cas 2) avec les requêtes de `scripts/ops/envois-en-attente.sql`.

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


## Import et gestion des factures — 15 octobre 2026

Migration `20261015060325_invoice_import_and_actions.sql` appliquée à RECOUVREMENT après contrôle de l’absence de références dupliquées. Elle crée un index unique par propriétaire/référence (espaces de bord ignorés), renforce l’import atomique et ajoute les actions groupées `apply_invoice_action`, sous RLS, sans accès anonyme. Aucun nettoyage ni suppression de facture existante.

- Import limité à 500 lignes et 5 Mo, lecture UTF-8/UTF-16/Windows-1252, séparateurs Excel, détection des en-têtes et références répétés. Correspondance unique des colonnes.
- Validation partagée navigateur/API : dates réelles, montants en centimes, longueurs et SIREN. Un solde vide conserve les règlements existants ; zéro solde signifie facture réglée.
- Vérification serveur avant confirmation : nouvelles factures, soldes actualisés ou confirmés, références inchangées et conflits montant/email. Les erreurs bloquent l’ensemble du fichier : aucune ligne n’est écartée silencieusement.
- L’import conserve la version de chaque facture affichée dans l’aperçu. Une modification ou suppression intermédiaire annule l’import complet. Les appels historiques sans version restent compatibles au niveau RPC ; le nouvel écran/API exigent un aperçu.
- Actions de règlement, litige et suppression désormais transmises à une API avec contrôle du plan, du propriétaire et des versions. Les lots sont limités à 100 factures et entièrement annulés en cas de conflit. La confirmation de suppression reste obligatoire dans l’interface.
- Le formulaire de suivi transmet la version chargée dans l’onglet et refuse un montant encaissé vide. La création manuelle refuse les montants partiellement numériques et gère les doublons concurrents.
- La liste charge les factures par pages de 500 pour éviter la troncature implicite aux 1 000 premières lignes. Une panne de lecture est affichée comme une erreur, pas comme une liste vide.

Validation : 130 tests automatisés réussis, typecheck, lint et build de production. Recette SQL sur la base distante, dans une transaction annulée : import avec solde partiel, refus d’un aperçu périmé, règlement et droits anonymes. Les tests PostgreSQL embarqués vérifient aussi l’isolation entre comptes et l’annulation d’un lot en conflit. Le diagnostic Supabase ne signale aucun problème de sécurité SQL ; l’avertissement Auth sur les mots de passe compromis reste inchangé.

Cette version ne fournit pas encore un journal comptable des encaissements ni l’import natif XLSX/PDF. Elle gère un cumul encaissé et des exports CSV. Les limites de configuration emails/Stripe/Vercel décrites plus haut restent à résoudre avant une recette commerciale complète.

## Fiabilité des relances et des totaux — 16 octobre 2026

### Changements livrés

- Les scénarios et le réglage d'automatisation des paramètres utilisent `/api/profile/reminders`. L'interface n'annonce un succès qu'après relecture de l'écriture. Une erreur conserve le scénario affiché ; une panne de chargement propose de réessayer. L'activation est refusée si les variables d'envoi/cron sont absentes ; la désactivation reste possible avec un essai expiré. La présence des variables ne prouve pas la délivrabilité.
- Le tableau de bord et les statistiques utilisent `collection_overview()`, une agrégation dans un même instantané PostgreSQL sous les droits RLS de l'utilisateur. Les totaux portent sur toutes les factures, sans troncature aux 1 000/2 000 premières lignes. Seule la liste des priorités reste limitée à 12 éléments.
- Chaque demande d'email porte l'identifiant de sa réservation. Le webhook Resend signé peut ainsi réconcilier un envoi resté `pending` même si la réponse HTTP initiale n'a pas été enregistrée. Les callbacks concurrents sont sérialisés ; un événement tardif ne rétrograde pas le statut. Un échec de persistance renvoie 503 pour solliciter une nouvelle livraison du webhook.
- Les événements `email.bounced`, `email.complained` et `email.suppressed` suspendent les relances de la facture. Un callback ne réactive jamais un suivi.
- Le cron revérifie l'activation du compte et de l'automatisation avant l'envoi. Une panne de fournisseur/base retourne 503 au lieu d'être masquée par un résultat réussi. La limite de débit de 25 tentatives et de 500 factures candidates par passage reste en place ; elle doit être revue avant de dépasser ce volume.

### Migrations appliquées et vérifiées

| Fichier local | Version distante RECOUVREMENT |
| --- | --- |
| `20261015214719_collection_overview.sql` | `20261016072406` |
| `20261016071846_reminder_delivery_events.sql` | `20261016072412` |
| `20261016073442_protect_reminder_history.sql` | `20261016155718` |

Aucun changement de donnée métier par ces migrations additives. Sur la base distante, les totaux ont été comparés sous le rôle `authenticated` avec une requête directe sur les factures du compte. Les permissions interdisent la lecture anonyme du récapitulatif et l'écriture d'événements email aux utilisateurs.

Une recette transactionnelle avec une réservation temporaire a vérifié : rattachement d'un envoi en attente, conservation du statut malgré un callback ancien et pause sur rejet. La transaction a été annulée. Avant/après : 3 comptes, 3 profils, 1 facture, 1 relance. Aucun email envoyé. Le diagnostic SQL ne signale pas de problème de sécurité ; la protection des mots de passe compromis reste désactivée côté Auth ([réglage](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).

Dans Resend, abonner le webhook à `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.failed` et `email.suppressed`. Les anciennes réservations sans les nouveaux tags restent réconciliables via `resend_id` s'il est connu ; les anciens envois ambigus sans identifiant nécessitent encore la vérification manuelle décrite plus haut. Les nouvelles clés d'idempotence ont le format `reminder-<reminderId>`.

Références : [tags dans les callbacks Resend](https://resend.com/docs/dashboard/emails/tags), [événement email.sent](https://resend.com/docs/webhooks/emails/sent).

### Blocage de mise en vente constaté

Préversion : `https://relance-git-codex-encai-a75947-maxencebriodeau85-blips-projects.vercel.app`.

Le 16 octobre à 07:23 UTC, `/api/health` (commit `13e4d40`) indique Supabase configuré, mais `billingReady`, `stripeFounderPrice`, `stripeSecret`, `stripeWebhook`, `emailSender`, `resend` et `cronSecret` à `false`. Il ne vérifie pas le SMTP Auth ni la livraison des messages.

L'administration du projet `relance` (`prj_bkhHsaDHfiFhopjd59QajhBo4YqU`), équipe `team_VoRIT8PAxu046vbl6MclJGWM`, répond toujours 403 avec la connexion Vercel disponible. Le CLI n'a pas d'identifiants propres. Le déploiement Git de préproduction fonctionne, mais l'accès actuel ne permet pas de renseigner les variables, connecter les webhooks et valider les paiements/emails réels.

La branche de travail reste la livraison de référence ; `main` contient encore l'ancien RelanceFlow. Ne pas présenter un build réussi comme une ouverture commerciale : il reste à raccorder les prestataires, compléter les coordonnées d'éditeur réelles, valider le parcours email/paiement et déployer la version configurée en production.

Validation de cette livraison : **151 tests automatisés**, TypeScript et lint réussis. Recette navigateur du composant Scénarios à 390 et 1440 px avec API simulée : service absent → activation désactivée ; écriture refusée → scénario précédent conservé ; écriture confirmée → état enregistré affiché ; panne de lecture → message et bouton Réessayer fonctionnels. Aucun débordement horizontal à 390 px ni exception JavaScript. Les scripts de télémétrie Vercel sont inaccessibles dans cet environnement de test. La route temporaire de recette a été supprimée avant livraison. Ce contrôle d'interface ne remplace pas la recette réelle SMTP/Stripe.

La protection de l’historique est appliquée et vérifiée : les comptes clients peuvent consulter leurs relances, mais ne peuvent plus insérer, modifier ou supprimer directement des événements d’envoi. Les services de réservation/envoi/webhook conservent leurs droits.


## Correction des modèles et emails facultatifs — 16 octobre, soirée

Cause reproduite dans le code : `PUT /api/email-templates` exigeait l’ancien plan Pro, absent de l’offre publique. L’essai et Fondateur peuvent désormais personnaliser les modèles. Les échecs de lecture, d’écriture et de suppression sont remontés ; les textes saisis restent visibles en cas d’échec. Seuls les trois messages amiables effectivement envoyables apparaissent dans cet éditeur. Les anciennes personnalisations ne sont pas supprimées. L’objet et le corps par défaut proviennent maintenant de la même source côté éditeur et envoi. Les scénarios déterminent la cadence, les modèles déterminent le texte.

L’email client est maintenant facultatif en import/création. Le schéma accepte `null` et valide toute adresse fournie. Les exports sans colonne email et les cellules vides sont acceptés. Le réimport conserve les adresses connues, peut compléter une adresse manquante, et refuse le remplacement silencieux d’une adresse connue différente. La modification depuis la fiche est protégée par la version de la facture et remet les relances en pause. Le service revérifie le destinataire avant d’envoyer ; le cron exclut les factures sans adresse.

Migration `20261016171736_optional_invoice_email.sql` appliquée à RECOUVREMENT sous `20261016172513`. Vérification réelle sous `authenticated`, dans une transaction annulée : modification du scénario, écriture du modèle, import sans email, ajout d’un email, réimport sans email conservant l’adresse et actualisant le règlement partiel. Aucune ligne de recette conservée, aucune modification définitive des modèles/scénarios, aucun email envoyé. Accès aux autres comptes : zéro ligne. Aucun droit d’import anonyme.

Les paramètres affichent la disponibilité réelle de configuration de l’envoi et évitent d’annoncer une automatisation active lorsque le service manque. La sauvegarde du profil exige désormais une ligne retournée ; le nom d’expéditeur affiché utilise les informations enregistrées.

Validation : 174 tests automatisés réussis, TypeScript, lint et build de production réussis. Ces tests couvrent les API avec services simulés et PostgreSQL local ; la recette SQL distante vérifie les droits réels. Ils ne constituent pas une connexion navigateur authentifiée, une réception de message ou un paiement réel.

L’accès Fondateur a été accordé administrativement au compte de test demandé, sans client, abonnement, paiement ni prélèvement Stripe créé. Le prix public reste 16 € HT/mois et le quota Fondateur 100 nouvelles factures par mois ; les modèles sont aussi inclus dans l’essai.

Resend : aucun connecteur disponible dans la recherche de plugins. Le formulaire de création de compte a été ouvert ; l’inscription et l’acceptation des conditions nécessitent la participation du propriétaire. Le domaine expéditeur et ses DNS doivent ensuite être vérifiés. L’administration Vercel reste refusée (403), donc les clés d’envoi, webhook et cron restent absentes sur le déploiement. Ne pas annoncer la disponibilité commerciale tant que le raccordement email/SMTP et Stripe n’est pas vérifié.

Suite demandée : API pour les logiciels de facturation. L’ancienne route de webhook et les anciennes clés dans le dépôt ne constituent pas une API v1 validée. Prévoir des clés révocables et limitées au compte, import/mise à jour idempotents, règlements partiels, emails facultatifs, conflits explicites, quotas, documentation OpenAPI et tests d’isolation. Ne pas afficher les anciens connecteurs comme opérationnels avant cette recette.


## Fiabilité de la création manuelle — 17 octobre 2026

La saisie manuelle partage les règles de validation de l’import : montants à deux décimales, dates réelles, SIREN exact, email facultatif et longueurs contrôlées. Les textes trop longs et les types incorrects sont refusés, sans troncature ni conversion silencieuse. Le formulaire transmet le montant saisi sans parseFloat ; les virgules décimales sont reconnues par le validateur. Une date d’émission inconnue reste nulle ; les dates et la mention TVA ne sont plus préremplies arbitrairement. La désignation est facultative pour ce document de suivi.

Une erreur de lecture du profil, du quota ou de la référence empêche la création avec une réponse 503. Le propriétaire vient de la session, la facture est explicitement créée en pause et une écriture sans ligne retournée n’annonce pas un succès. L’index unique et le contrôle SQL de quota restent les protections contre les créations concurrentes.

Les corps JSON sont bornés pendant la lecture du flux (32 Kio en création, 5 Mio en import), même si Content-Length manque ou est mensonger. Un dépassement renvoie 413, un JSON mal formé 400. Les limites du fournisseur d’hébergement peuvent être plus basses.

Validation : 201 tests automatisés, TypeScript et lint. Aucune migration requise, aucune modification des données existantes. Configuration par navigateur interrompue à la demande de l’utilisateur ; raccordements Resend/Stripe toujours en attente.


## Audit fonctionnel — 17 octobre 2026

Voir `AUDIT-2026-10-17.md` pour la matrice des fonctionnalités, les défauts corrigés, les limites et les critères de lancement. Validation : 222 tests, TypeScript, lint et build réussis ; PDF fictif rendu et contrôlé. Aucune recette réelle de paiement ou d’email.

Migration locale `20261017083654_collection_notifications.sql` appliquée sous la version distante `20261017142418`. Fonction réservée à service_role, droits vérifiés, deux appels en transaction annulée sans erreur. Ne pas lancer un db push aveugle : les versions distantes historiques diffèrent des noms locaux.

Anciens webhook et générateur de mise en demeure retirés (410) ; Pennylane et émission de nouvelles clés indisponibles (503). Anciennes données conservées. La future API v1 reste à développer. Les raccordements Resend/SMTP/Stripe et la recette authentifiée restent des conditions de commercialisation.

## API et exploitation — 18 octobre 2026

Voir `docs/DELIVERY-2026-10-18.md` et `docs/OPERATIONS.md`. API v1 et gestion des clés disponibles dans Connexions ; documentation `/api-docs` et `/openapi.json`. Migrations locales `20261018082254_integration_api_v1.sql` et `20261018082548_collection_operations.sql` appliquées sous `20261018083533` et `20261018083603`. Recette SQL distante annulée sans donnée conservée.

249 tests, recette navigateur ciblée à 390/1440 px et compilation vérifiés. Les routes temporaires de recette sont retirées. Les raccordements email et Stripe sont expressément laissés au propriétaire. Les coordonnées juridiques réelles, la restauration isolée et l’alerte externe restent à finaliser ; cadence actuelle quotidienne, 25 tentatives de relance par passage.

### 18 octobre 2026 — actions, clients et formats CSV

Migration locale `20261018153639_import_presets.sql`, appliquée au projet
`ernphhgmmkntlhdgnrnn` sous la version distante `20261018210412`.
Ne pas rejouer cette migration : les horodatages locaux et distants diffèrent.
Elle ajoute les formats CSV privés par compte (RLS), limités à 100, sans données
de factures. La migration doit précéder la publication de la nouvelle interface.
Les routes `/dashboard/today` et `/dashboard/clients` utilisent les tables
existantes via la session utilisateur et des lectures paginées par identifiant.
