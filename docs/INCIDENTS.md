# Incidents et support

À garder sous la main. Chaque incident se traite dans l'ordre : **arrêter le mal, prévenir, corriger, vérifier, noter.**

## Support au quotidien

- **Adresse** : celle de `SUPPORT_EMAIL` et `NEXT_PUBLIC_CONTACT_EMAIL` dans Vercel (aujourd'hui l'adresse Gmail de l'éditeur ; `encair.fr` est acheté depuis le 30/10/2026, l'adresse passe à `contact@encair.fr` dès que la boîte Zimbra est créée et testée, voir `docs/DOMAINE.md`). Le formulaire `/contact` et les réponses aux emails d'Encair y arrivent.
- **Délai annoncé** : réponse personnelle, en général sous **48 h ouvrées** (page Contact). Tenir ce délai ; si une absence le rend impossible, le dire sur la page Contact.
- **Demandes RGPD** : export en libre-service (Paramètres > Vos données) ; suppression sous un mois selon `scripts/ops/suppression-compte.sql`.
- **Où regarder pour un client** : Supabase > RECOUVREMENT (tables `invoices`, `reminders`), page **État des relances** de son compte, journaux Vercel.

## Interrupteur d'urgence : couper tous les envois

Les relances automatiques, les relances manuelles et les emails de fin d'essai exigent une configuration Resend complète. Sans elle, Encair refuse **avant** de réserver quoi que ce soit (réponse 503, rien n'est envoyé ni marqué).

1. **Immédiat** : Resend > API Keys > désactiver ou supprimer la clé de production. Les envois suivants échouent, sont marqués `failed` et rien ne part.
2. **Durable** : Vercel > relance > Settings > Environment Variables > `RESEND_API_KEY` (Production) : la supprimer, puis Deployments > dernier déploiement > **Redeploy**. `/api/health` affiche alors `automationReady: false`.
3. Pour rétablir : recréer une clé Resend, la remettre dans Vercel, redéployer, vérifier `/api/health`.

## Gravité

| Niveau | Exemples | Délai d'action |
| --- | --- | --- |
| **Critique** | Relance envoyée avec un mauvais montant ou au mauvais destinataire, données d'un client visibles par un autre, fuite de secret | Immédiat : interrupteur ci-dessus si des envois sont en cause |
| **Majeur** | Site indisponible, relances quotidiennes arrêtées, abonnements Stripe non synchronisés, sauvegarde en échec | Dans la journée |
| **Mineur** | Bug d'affichage, lenteur, email de bienvenue manquant | Sous une semaine |

## Cas 1 : relance erronée envoyée à des clients

1. Couper les envois (interrupteur d'urgence).
2. Lister les relances concernées : `select r.id, r.created_at, i.invoice_number, i.client_email, r.subject from public.reminders r join public.invoices i on i.id = r.invoice_id where r.created_at > now() - interval '1 day' and r.status not in ('pending','failed') order by r.created_at;`
3. Prévenir chaque compte client concerné **le jour même**, avec la liste exacte des emails partis et une proposition de message correctif à envoyer à ses propres clients.
4. Corriger, ajouter un test qui reproduit l'erreur, rejouer `scripts/ops/recette-base.sql` sur encair-test, déployer, puis rétablir les envois.

## Cas 2 : envois restés « en attente »

Alerte « Relances bloquées » de la surveillance, ou bloc « En attente » de la page État des relances.

1. Lancer le diagnostic de `scripts/ops/envois-en-attente.sql`.
2. Pour chaque relance, chercher dans Resend (Emails) le destinataire à l'heure de la réservation.
3. Email trouvé : correction 2a (statut `sent` avec son identifiant `re_…`). Aucun email : correction 2b (statut `failed`, la relance repartira au prochain passage si elle est toujours due).
4. **Ne jamais supprimer** une réservation ni renvoyer à la main tant que le doute n'est pas levé : un client relancé deux fois pour la même facture est le pire scénario.
5. Contrôle final du script : `envois_bloques = 0`.

## Cas 3 : site ou relances quotidiennes arrêtés

1. `/api/health` : `status` doit être `ok`, et `automationReady` doit être à `true` une fois Resend branché.
2. Vercel > relance > Deployments : dernier déploiement en erreur ? **Instant Rollback** vers le précédent.
3. Relances : `GET /api/cron/status` avec `Authorization: Bearer <CRON_SECRET>`. Un 503 avec `last_blocked_reason` indique la cause (configuration absente, réservation impossible). Vercel > relance > Settings > Cron Jobs montre les derniers passages.
4. Base : Supabase > RECOUVREMENT > Logs. Un projet en pause (offre gratuite inactive) se relance depuis le tableau de bord.

## Cas 4 : abonnements Stripe non synchronisés

1. Stripe > Développeurs > Webhooks > l'endpoint Encair : événements en échec ?
2. Corriger la cause (secret `STRIPE_WEBHOOK_SECRET`, prix `STRIPE_FOUNDER_PRICE_ID`), puis **renvoyer** les événements en échec depuis Stripe : le webhook relit l'état réel de chaque abonnement, sans risque de doublon.
3. Détail des cas dans `docs/RECETTE-STRIPE.md`.

## Cas 5 : fuite de données possible

1. Arrêter la fuite : révoquer le secret ou la clé concernée (Supabase, Stripe, Resend, Vercel), redéployer.
2. Évaluer : quelles données, quels comptes, depuis quand (journaux Vercel et Supabase).
3. Si des données personnelles ont pu être exposées avec un risque pour les personnes : **notification à la CNIL sous 72 heures** (notifications.cnil.fr) et information des clients concernés, qui sont responsables de traitement pour les données de leurs propres clients (voir `/dpa`).
4. Consigner l'incident même sans notification : c'est une obligation (registre des violations).

## Après chaque incident critique ou majeur

Une note courte dans `docs/` : date, durée, impact (comptes et emails concernés), cause, correction, ce qui empêchera la récidive.
