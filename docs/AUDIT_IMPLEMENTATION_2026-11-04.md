# Correctifs de l'audit du 4 novembre 2026

Les modifications sont préparées sur une branche. Ce document n'atteste ni déploiement, ni migration distante, ni restauration ou envoi réel.

## Modifications livrées dans le code

- **Données d'exemple** : les totaux, anciennetés, priorités et le premier suivi validé excluent `is_sample`. `sample_count` reste disponible pour proposer ou retirer la démonstration. Avec 100 € réels et 2 363,15 € fictifs, les indicateurs financiers remontent 100 €.
- **Import** : une attente de 25 secondes couvre à la fois la requête et son JSON. L'annulation libère les boutons ; une confirmation interrompue demande de vérifier les factures. Aucun réessai automatique d'une écriture ambiguë.
- **Activation** : événements de première étape conservés dans Encair sous RLS, sans contenu de facture ni texte libre, exportables et supprimés avec le compte. Événements distincts : inscription, première facture réelle (import ou saisie), suivi activé, premier email accepté, abonnement actif, premier paiement positif confirmé par webhook signé. Un abonnement en essai n'est pas un paiement. Les autres étapes historiques ne sont pas inventées.
- **Acquisition** : clic d'essai mesuré par la solution d'audience déjà installée avec une catégorie fermée de page. Aucun email, identifiant de compte, paramètre UTM ou chemin de facture n'est ajouté à cet événement. Les visites/clics et les étapes du compte sont deux séries séparées, pas un suivi individuel d'un email à froid. Les cohortes d'inscription sont disponibles dans `scripts/ops/acquisition-funnel.sql` : lecture opérateur privée autorisée seulement.
- **Commercialisation** : une nouvelle session de souscription n'est pas créée et une session ouverte n'est pas réutilisée si les informations éditeur sont incomplètes. Un abonnement existant garde son portail et une session déjà payée reste synchronisable. `npm run check:commercial` liste seulement les noms des champs manquants, sans leurs valeurs.
- **Surveillance** : le workflow existant a une sonde HTTP publique sans aucun secret ni accès SQL. Les contrôles sensibles et les sauvegardes GitHub conservent leur garde-fou privé. Le choix `BACKUP_PROVIDER=supabase` ne suffit plus à annoncer une restauration : il exige une attestation manuelle récente via `BACKUP_RESTORE_VERIFIED_AT` (ISO UTC, au plus 30 jours). Cette attestation n'est pas une vérification de l'API du fournisseur. Un fournisseur inconnu est refusé.

## Conditions avant mise en production

1. Comparer les migrations avec la base cible sur un environnement isolé. Appliquer d'abord les deux nouvelles migrations `isolate_sample_overview` et `activation_metrics` en préproduction autorisée, puis tester les parcours. La nouvelle application attend `sample_count` et `activation_events` ; ne pas déployer le code seul sur l'ancien schéma.
2. Vérifier le nouvel export du compte, le rapport de cohortes et la suppression en cascade.
3. Renseigner les informations légales exactes, vérifier les documents et la mention de facture Stripe. Aucun SIREN, adresse ou statut n'a été inventé ici. Les nouvelles souscriptions resteront bloquées si ces champs manquent après déploiement ; gérer ce point avant une mise en ligne.
4. La visibilité du dépôt reste à décider et à changer avec les droits administrateur GitHub. Aucun outil disponible dans cette session ne donne ces droits. Le garde-fou des secrets n'a pas été retiré.
5. Vérifier l'offre de sauvegarde réellement souscrite et réaliser une restauration isolée. Après réussite seulement, conserver la preuve dans un emplacement privé et renseigner la date d'attestation. Ne pas confondre sonde HTTP, présence de variables, sauvegarde fournisseur et restauration prouvée.
6. Faire la recette navigateur ci-dessous avec un compte de test en préproduction. Aucun compte réel n'a été créé ou manipulé dans ce travail.

## Recette avant validation finale

| Parcours | Contrôle à consigner |
| --- | --- |
| Mobile 390 px et 768 px | Inscription, validation email, connexion, mot de passe oublié ; clavier et erreurs lisibles |
| Premier démarrage | Exemples seuls puis exemples + vrai CSV ; seuls les vrais soldes et suivis activent les indicateurs |
| Réseau lent/interrompu | Aperçu et confirmation libèrent l'interface après délai ; aucun réessai automatique ; vérifier le résultat serveur avant reprise |
| Activation | Une ligne par compte/étape, pas de contenu client, absence de fuite intercomptes ; export contient les étapes |
| Paiement test | Double clic, abandon, paiement positif, essai à zéro, webhook retardé/dupliqué, carte refusée, portail |
| Résiliation | Fin de période et immédiate selon politique choisie, accès et données conservées comme prévu, événements désordonnés |
| Remboursement test | Total/partiel, montant et statut vérifiés dans Stripe ; politique d'accès explicite (un remboursement ne résilie pas automatiquement l'abonnement) |
| Exploitation | Sonde publique distingue configuration de fonctionnement réel ; tests sensibles restent bloqués sur dépôt public ; restauration avec preuve privée |

Les tests automatisés locaux constituent des preuves de code. La recette mobile connectée, les opérations Stripe test et la restauration réelle restent des actions distinctes, à réaliser avec les accès appropriés.

## Vérification de développement

Les fonctions SQL sont exécutées dans PostgreSQL embarqué (PGlite), avec contrôles RLS, rôles, annulation transactionnelle et suppression. `supabase db advisors --local --type all --fail-on error` et `supabase migration list --local` ont été tentés : aucun serveur Supabase local n'écoute sur 127.0.0.1:54322. Ces deux contrôles CLI restent à refaire sur la préproduction isolée ; aucun projet distant n'a été utilisé en remplacement. Le build utilise uniquement les valeurs fictives de la CI.
