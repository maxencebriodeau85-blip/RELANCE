# Corrections de la recette utilisateur — 20 octobre 2026

## Changements

- La fiche PDF utilise pdf-lib et une police Unicode embarquée, sans rendu React. Montant initial, règlements et reste dû sont séparés ; notes internes exclues.
- Aperçu serveur obligatoire pour les relances manuelles, individuelles ou groupées. Chaque message nécessite une confirmation. Signature de dix minutes liée au propriétaire, à la version de facture, au destinataire, à l’expéditeur et au contenu. Contrôle serveur avant réservation/envoi ; relecture de la facture avant appel fournisseur.
- Préheader honnête avec solde restant. Suppression des anciens emails menaçants et du calculateur historique de mise en demeure inutilisé. La route juridique reste retirée (410), la page l’explique : aucune restauration de cette fonctionnalité.
- Cartes de factures sur téléphone ; reste à payer et total restant à encaisser, centimes systématiques et aucun retard pour une facture réglée.
- Accords singuliers, doublons de l’abonnement, champs désignation/TVA retirés du formulaire de suivi, erreurs CSV lisibles et compteur corrigé en cas de conflits.
- /login redirige vers /auth/login ; Pipeline et Contacts vers Clients. Connexions décrit déjà les API disponibles sans présenter un connecteur Pennylane prêt à l’emploi.
- Avertissement dans les modèles personnalisés sur les mentions réservées aux relations entre professionnels. Les modèles par défaut restent amiables ; les textes enregistrés des utilisateurs ne sont pas écrasés.

Le taux de référence du calculateur public est déjà de 12,40 % pour S2 2026, distinct du taux d’intérêt légal. Source : https://entreprendre.service-public.gouv.fr/vosdroits/F23211 . Périmètre des frais entre professionnels : https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/recouvrement-amiable-de-creances-les-regles-connaitre .

## Vérification

260 tests dans 34 fichiers ; TypeScript, lint et build de production réussis. Police présente dans le manifeste de la route PDF. Recette Chromium du build à 390 et 1440 px : liste sans débordement, aperçu sans envoi, fermeture sans envoi, confirmation explicite, PDF 200 et refus 409 sans confirmation. Données Supabase simulées localement ; appel d’envoi intercepté. Aucun email réel envoyé, aucune facture TEST du compte COMBIEN modifiée.

Le PDF extrait et rendu contient 2 869,66 € initiaux, 506,51 € réglés et 2 363,15 € restants. Aucun contenu de notes internes.

Pour reproduire : construire et lancer Next avec NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3031, NEXT_PUBLIC_SUPABASE_ANON_KEY=qa-only-key, SUPABASE_SERVICE_ROLE_KEY=qa-only-secret. Lancer le serveur sur localhost:3020 puis scripts/qa-collection-audit.cjs avec ENCAIR_PLAYWRIGHT_MODULE et ENCAIR_QA_CHROME correspondant à l’installation locale. Le script crée les fixtures sur le port 3031.

## Publication et limites

Cible : branche codex/encair-customer-journey, PR #4, préversion Vercel. La production historique n’est pas mise à jour par ce commit de branche. Aucun changement de base ni de configuration Resend/Stripe. La séparation des bases préversion/production reste à réaliser. Les tests simulés ne remplacent pas une validation de réception email dans l’environnement cible.
