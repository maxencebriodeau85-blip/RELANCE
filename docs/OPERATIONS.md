# Exploiter Encair

## Contrôles quotidiens

- `/api/health` indique la présence de configuration, pas une preuve de réception ou de paiement.
- La page **État des relances** expose uniquement les événements du compte connecté : échecs/rejets sur 30 jours, envois en attente depuis 15 minutes, factures sans email. Ne pas relancer aveuglément un message en attente : il a pu être accepté par le prestataire.
- Côté exploitant, consulter `collection_worker` via l’accès d’administration Supabase : `started_at`, `completed_at`, `lease_until`, `last_result.ok` et compteurs. Aucun corps d’email ou secret n’est journalisé dans ce suivi.
- Déclencher une alerte d’exploitation si le dernier traitement réussi dépasse la cadence attendue, si `last_result.ok=false`, ou si une réservation dépasse 120 secondes. Le raccordement à un service d’alerte externe n’est pas configuré par ce code.

## Raccordement email : trois chaînes distinctes

La présence de variables n’atteste ni la validité des clés, ni la vérification du domaine, ni la réception. Une publication du code ne configure aucun prestataire.

| Usage | Configuration à préparer | Preuve de recette attendue |
| --- | --- | --- |
| Relances Encair, manuelles et automatiques | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` ; `CRON_SECRET` en plus pour le cron | Demande acceptée puis événement signé enregistré dans l’historique |
| Bienvenue et formulaire de contact | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPPORT_EMAIL` ; accès Auth/base pour la bienvenue | Réception sur une adresse de recette et réponse vers la boîte support |
| Confirmation d’inscription et récupération du mot de passe | SMTP personnalisé dans Supabase Auth, expéditeur vérifié et URLs de retour correctes | Réception du lien puis ouverture de la session / réinitialisation |

Procédure opérateur, à exécuter uniquement avec les accès et autorisations nécessaires :

1. Choisir un domaine d’envoi possédé et le faire vérifier par Resend avec les enregistrements DNS fournis pour ce domaine. Ne pas déduire la vérification d’un simple nom d’expéditeur.
2. Injecter les variables d’envoi côté serveur de l’environnement cible via son gestionnaire de secrets. Ne jamais placer une clé dans `NEXT_PUBLIC_*`, le dépôt ou un ticket.
3. Créer le webhook vers `<origine Encair>/api/webhooks/resend` et conserver son secret de signature dans `RESEND_WEBHOOK_SECRET`. Abonner `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.failed` et `email.suppressed`. Le code refuse une signature absente/invalide et demande une nouvelle livraison si l’écriture échoue.
4. Configurer séparément le SMTP Supabase Auth : hôte `smtp.resend.com`, port 465, utilisateur `resend`, mot de passe = clé API Resend, expéditeur du domaine vérifié. Les variables Vercel ne mettent pas à jour ces réglages Supabase. Reprendre aussi les URLs et modèles Auth de `DEPLOYMENT.md`.
5. Contrôler `/api/health` : `resend`, `emailSender`, `resendWebhook`, `supportEmail` sont des présences ; `reminderEmailConfigured` exige la chaîne de suivi des relances. `false` bloque les nouvelles relances avant réservation. Aucun de ces booléens ne vérifie le SMTP, les DNS ou la livraison.
6. Dans une recette autorisée, utiliser des comptes et destinataires possédés par l’opérateur. Vérifier inscription, récupération du mot de passe, bienvenue, contact, puis relance et événement signé. `email.sent` signifie demande acceptée ; `email.delivered` signifie remise au serveur du destinataire, pas lecture ni placement garanti en boîte principale. Confirmer aussi l’absence de doublon et la conservation des envois ambigus en attente.
7. Conserver les relances automatiques désactivées tant que cette recette n’est pas attestée. Relever l’environnement, le commit, les dates et les identifiants de recette, sans corps d’email ni secret.

Références techniques consultées le 23 octobre 2026 : [signature des webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests), [événements Resend](https://resend.com/docs/webhooks/event-types), [SMTP Resend pour Supabase](https://resend.com/docs/send-with-supabase-smtp). Les tests du dépôt utilisent de faux services ; aucune configuration distante ou réception réelle n’est attestée par ces tests.

## Progression et capacité

Un verrou avec bail de 120 secondes empêche deux traitements simultanés. Le cron parcourt les factures éligibles par UUID, conserve le dernier identifiant examiné et reprend au passage suivant. Il passe les factures déjà traitées ou bloquées, et avance après un échec prestataire afin de ne pas bloquer tous les autres comptes. En fin de liste, le curseur revient au début. L’historique est chargé par lot.

Chaque passage examine au plus 100 candidats et tente au plus 25 envois dans un budget de 40 secondes. La réservation de chaque relance reste indépendante et empêche les doublons lors d’une reprise. Le cron actuel Vercel est quotidien à 08:00 UTC : sa capacité globale est donc limitée. Avant d’accueillir un volume qui la dépasse, configurer un plan/scheduler autorisant des passages plus fréquents et vérifier sa capacité. Aucun changement payant de plan n’a été effectué.

En cas d’arrêt brutal, le bail expire ; les réservations d’envoi protègent les messages déjà tentés. Ne jamais effacer leurs traces pour « débloquer » un envoi sans vérifier le statut chez Resend.

## Surveillance du worker de relances

Les journaux Vercel Hobby ne sont conservés qu’une heure : un cron qui échoue chaque jour peut passer inaperçu. Lorsqu’un passage autorisé est bloqué, `/api/cron/reminders` répond toujours 503 mais inscrit désormais dans `collection_worker` la date (`last_attempt_at`) et la cause (`last_blocked_reason`) : `automation_not_configured` (variables Resend, service role ou `CRON_SECRET` absentes) ou `claim_failed` (réservation impossible en base). Cette trace est au mieux : sans `SUPABASE_SERVICE_ROLE_KEY`, rien ne peut être écrit. Une réservation réussie efface la cause. Un 401 (secret absent ou faux) n’ouvre aucune connexion et ne laisse donc aucune trace : c’est la sonde ci-dessous qui le révèle.

Consulter l’état, sur le domaine canonique (une redirection peut retirer l’en-tête) :

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/status
```

Réponse, sans donnée client : `configured` (même condition que le cron), `last_attempt_at`, `last_blocked_reason`, `started_at`, `completed_at` (dernière fin de passage), `last_ok` (le dernier passage a-t-il tout traité sans erreur), `last_sent` (envois du dernier passage), `stale` (`true` si aucun passage terminé depuis 26 heures, ou jamais). Le seuil de 26 heures couvre le cron quotidien de 08:00 UTC avec une marge. Code HTTP : 200 si tout va bien ; 503 si `stale`, si `configured` est faux, si le dernier passage a échoué (`last_ok: false`) ou si l’état est illisible ; 401 si le secret est faux. Un passage incomplet reprend au suivant, mais il alerte pour être examiné. `/api/health` expose aussi `automationReady` (booléen, sans appel base).

Brancher une sonde externe qui alerte sur toute réponse différente de 200 : workflow GitHub Actions planifié (`schedule`) appelant l’URL avec le secret stocké en secret de dépôt, ou moniteur HTTP UptimeRobot avec en-tête personnalisé `Authorization: Bearer …`. Une vérification par jour, après 08:00 UTC, suffit. Une alerte 401 indique soit un secret de sonde différent de celui de Vercel, soit un `CRON_SECRET` absent en production, qui bloque aussi le cron : vérifier `cronSecret` dans `/api/health`.

## Protection des API

Les clés API v1 sont aléatoires (256 bits), hachées SHA-256, affichées une fois, expirent après un an et sont révocables. Le stockage serveur est inaccessible aux rôles navigateur. Le propriétaire est déduit de la clé. Droits lecture et écriture distincts. La révocation et l’écriture sont sérialisées en base.

La limite de 60 requêtes par minute est partagée entre toutes les clés d’un compte et toutes les instances serveur. La création de clés est limitée à 10 par 24 heures. Le formulaire de contact utilise aussi un compteur partagé (5/heure/IP hachée). Une panne du compteur bloque l’opération au lieu de désactiver la protection. L’authentification conserve les protections du fournisseur Supabase.

Les réponses réussies d’import sont conservées au moins 30 jours pour l’idempotence. Le nettoyage des réponses âgées de plus de 30 jours et des compteurs âgés de plus de 2 jours s’exécute au démarrage du cron. Si le cron est désactivé, cette conservation se prolonge : surveiller le stockage et ne pas annoncer une purge automatique à date exacte.

## Sauvegarde et restauration

La disponibilité de sauvegardes gérées/PITR dépend du plan Supabase et doit être vérifiée dans son tableau de bord. L’accès disponible ne permet pas d’attester la politique effective ni d’effectuer une restauration isolée. Aucun test de restauration de production n’est revendiqué.

Un outil reproductible est fourni :

```sh
# Installer les clients PostgreSQL 17 ou plus récents.
# Injecter SUPABASE_DB_URL depuis le gestionnaire de secrets, sans l’écrire dans l’historique.
python scripts/backup-database.py /destination-privee/encair.dump
```

L’outil refuse les sauvegardes dans le dépôt et l’écrasement d’un fichier, impose TLS, vérifie la structure de l’archive, produit un SHA-256 et limite les droits locaux. Chiffrer ensuite le fichier et l’envoyer dans un stockage privé distinct. Une archive SQL ne sauvegarde pas les fichiers Supabase Storage ; les copier séparément si utilisés. Les secrets d’application, le code et la configuration des prestataires ont également leur propre procédure de sauvegarde.

Recette de restauration à effectuer dans un projet isolé, jamais sur la production :

1. Vérifier le SHA-256 et la version PostgreSQL.
2. Préparer les rôles/extensions Supabase nécessaires ; restaurer avec `pg_restore --no-owner --no-acl` vers la cible isolée, en utilisant les variables PG sécurisées.
3. Vérifier tables, contraintes, volumes, clés étrangères, droits RLS et index ; comparer les nombres d’enregistrements avec la source au moment de la sauvegarde.
4. Réappliquer les suppressions de données intervenues après la sauvegarde, révoquer les clés/API sessions restaurées si nécessaire, et maintenir les emails/cron désactivés pendant la recette.
5. Tester lecture avec deux comptes, export, import idempotent et règlement partiel. Consigner date, durée et résultat. Détruire la copie de recette conformément à la politique de conservation.

## Suppressions et données personnelles

Les demandes d’accès, de suppression et de restitution restent une procédure opérateur. Vérifier l’identité et le périmètre, fournir l’export, révoquer les sessions/clés, puis supprimer selon les engagements contractuels et obligations de conservation. Ne pas lancer de suppression massive d’anciens comptes sans une revue préalable. Tenir une trace séparée des suppressions à réappliquer lors d’une restauration.

## Références vérifiées le 18 octobre 2026

- Mentions d’un entrepreneur individuel : https://entreprendre.service-public.gouv.fr/vosdroits/F31228
- Contrat de sous-traitance et responsabilités : https://www.cnil.fr/fr/responsable-de-traitement-et-sous-traitant-6-bonnes-pratiques-pour-respecter-les-donnees
- Pénalités professionnelles : https://entreprendre.service-public.gouv.fr/vosdroits/F23211 ; le taux de refinancement de référence du 1er juillet 2026 est bien 2,40 %, soit 12,40 % après majoration, même si le taux BCE a changé en septembre.
- Référence primaire du 1er juillet : https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AC_202603581

Ces vérifications ciblées ne constituent pas une validation juridique exhaustive des guides. Le site ne présente plus ses exemples comme des actes « conformes » garantis. Les coordonnées d’éditeur, l’immatriculation, la forme juridique et le régime de TVA doivent correspondre à la situation réelle avant vente.

## Dépendances

`postcss-selector-parser` est fixé à 7.1.6 pour corriger https://github.com/advisories/GHSA-rj75-hqrm-r3gf. L’avis https://github.com/advisories/GHSA-vfj7-8cjw-p6xm concerne encore `braces` et sa chaîne Tailwind 3 : aucun correctif direct n’est publié. Les motifs de compilation proviennent du dépôt, pas des CSV/API clients ; ne jamais exécuter la compilation sur des motifs arbitraires fournis par des visiteurs. Ne pas utiliser `npm audit fix --force` sans préparer une migration Tailwind et une recette visuelle.
