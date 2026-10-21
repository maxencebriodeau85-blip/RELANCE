# Exploiter Encair

## Contrôles quotidiens

- `/api/health` indique la présence de configuration, pas une preuve de réception ou de paiement.
- La page **État des relances** expose uniquement les événements du compte connecté : échecs/rejets sur 30 jours, envois en attente depuis 15 minutes, factures sans email. Ne pas relancer aveuglément un message en attente : il a pu être accepté par le prestataire.
- Côté exploitant, consulter `collection_worker` via l’accès d’administration Supabase : `started_at`, `completed_at`, `lease_until`, `last_result.ok` et compteurs. Aucun corps d’email ou secret n’est journalisé dans ce suivi.
- Déclencher une alerte d’exploitation si le dernier traitement réussi dépasse la cadence attendue, si `last_result.ok=false`, ou si une réservation dépasse 120 secondes. Le raccordement à un service d’alerte externe n’est pas configuré par ce code.

## Progression et capacité

Un verrou avec bail de 120 secondes empêche deux traitements simultanés. Le cron parcourt les factures éligibles par UUID, conserve le dernier identifiant examiné et reprend au passage suivant. Il passe les factures déjà traitées ou bloquées, et avance après un échec prestataire afin de ne pas bloquer tous les autres comptes. En fin de liste, le curseur revient au début. L’historique est chargé par lot.

Chaque passage examine au plus 100 candidats et tente au plus 25 envois dans un budget de 40 secondes. La réservation de chaque relance reste indépendante et empêche les doublons lors d’une reprise. Le cron actuel Vercel est quotidien à 08:00 UTC : sa capacité globale est donc limitée. Avant d’accueillir un volume qui la dépasse, configurer un plan/scheduler autorisant des passages plus fréquents et vérifier sa capacité. Aucun changement payant de plan n’a été effectué.

En cas d’arrêt brutal, le bail expire ; les réservations d’envoi protègent les messages déjà tentés. Ne jamais effacer leurs traces pour « débloquer » un envoi sans vérifier le statut chez Resend.

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
