# Suivi quotidien, clients et formats d’import

## Fonctionnalités

- `/dashboard/today` : emails absents ou invalides, soldes non vérifiés depuis sept jours, promesses dépassées (date Europe/Paris), derniers incidents d’envoi sur 30 jours. Les factures réglées sont exclues. Plusieurs motifs peuvent figurer sur la même facture, sans la dupliquer. Filtres et pagination de 30 factures.
- `/dashboard/clients` : recherche par nom/email/SIREN, regroupement par SIREN de neuf chiffres ou, à défaut, par nom et email identiques après normalisation. Sans identité exploitable, chaque facture reste séparée. Solde et règlements cumulés, factures, promesses, notes internes et historique des relances. Un lien depuis chaque facture ouvre son groupe.
- Import CSV : sauvegarde nommée des colonnes dans le compte, choix explicite au prochain import, remplacement et suppression. Les colonnes peuvent être réordonnées ; si une colonne est ajoutée, retirée ou renommée, le format n’est pas appliqué. Le fichier passe toujours par l’aperçu et la validation existants. Aucun fichier ni aucune ligne de facture n’est enregistré dans le format.

## Sécurité et limites

La nouvelle table est protégée par RLS avec contrôle du propriétaire en lecture et écriture. Le serveur utilise la session utilisateur, pas une clé administrateur. Les requêtes de mutation sont bornées à 32 Kio et validées strictement. Une limite de 100 formats est sérialisée par compte dans la base. Les erreurs de sauvegarde ne sont pas présentées comme des succès.

La vue client est une consolidation de lecture, pas une fusion de contacts : aucune identité ni aucun scénario n’est modifié. Elle ne crée pas d’email groupé et ne bloque pas automatiquement les relances de factures différentes. Les réponses aux emails ne sont pas synchronisées ; elles peuvent être consignées dans les notes. Une alerte signale les tentatives récentes pour aider à éviter les sollicitations répétées.

Les listes chargent les données par lots de 500 pour dépasser la limite de réponse Supabase. Les grandes volumétries restent à mesurer avant d’augmenter fortement les quotas commerciaux ; il ne s’agit pas d’une agrégation SQL instantanée de tout l’historique.

Les intégrations email/Stripe restent à configurer par le propriétaire. Aucun email ni paiement de recette n’a été envoyé. La protection Supabase contre les mots de passe compromis reste désactivée (avertissement préexistant) : https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Validation

- 260 tests dans 33 fichiers, TypeScript et lint réussis.
- Tests de regroupement, paiements partiels, promesses à minuit en France, solde périmé/futur, dernier statut d’envoi, pagination au-delà de 1 000 factures.
- Tests PostgreSQL locaux : persistance, isolation entre comptes, interdiction de réaffectation, limite de formats, remplacement à la limite, suppression et absence d’accès anonyme.
- Migration distante appliquée ; RLS et privilèges contrôlés ; écriture/lecture avec rôle authentifié vérifiées dans une transaction annulée.
- Build de production local réussi.
- Recette Chromium à 390 et 1440 px sur le build de production, Supabase simulé : filtre email, fiche client et total des règlements, sauvegarde des formats via la route serveur, erreur 503 visible puis nouvelle tentative, réutilisation après rechargement, colonnes modifiées refusées, suppression. Aucun débordement horizontal ni exception JavaScript. Champ de nom corrigé sur mobile après inspection visuelle.
