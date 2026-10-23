# Encair

Encair suit les factures déjà émises : import CSV, soldes restant dus, relances email, promesses de paiement et litiges. L'identité Encair est provisoire ; marque et domaine restent à vérifier avant lancement.

## Offre

- Fondateur : **16 € HT/mois**, 100 nouvelles factures par mois calendaire UTC.
- Essai : 30 jours, sans carte bancaire, 10 nouvelles factures par mois.
- Actualiser une référence existante ne consomme pas de nouvelle place.
- Tarif public envisagé : 29 € HT/mois, pas un ancien prix barré.
- Les anciens abonnements Stripe restent inchangés tant que le client ne demande pas explicitement un changement. Le code `starter` est conservé pour compatibilité.

## Organisation GitHub

Consulter [le guide de contribution et de publication](docs/GITHUB_WORKFLOW.md) pour les branches, les contrôles CI, les pull requests et la documentation de référence.

## Développement

Node.js 22 ou supérieur.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Renseigner Supabase pour l'authentification. Ne jamais exposer la clé service dans une variable `NEXT_PUBLIC_*`. Stripe est nécessaire pour les routes d'abonnement ; Resend pour les envois réels.

```bash
npm run typecheck
npm test
npm run build
```

Les tests de migration utilisent PostgreSQL embarqué via PGlite avec un schéma de test minimal. Ils ne contactent aucun service réel et ne remplacent pas une validation des migrations sur une copie de la base existante.

## Fonctionnement

- Une nouvelle facture est importée **en pause**. Le solde doit être confirmé avant activation.
- L'import reconnaît la référence de facture de l'utilisateur. Il actualise le solde si la colonne est fournie, conserve l'historique et refuse un montant initial ou un email contradictoire.
- Une date d'émission inconnue reste vide ; elle n'est pas inventée à la date d'import.
- Les paiements partiels diminuent le montant relancé. Un règlement complet ou un litige suspend les relances.
- Les promesses suspendent jusqu'au jour promis inclus, selon le calendrier Europe/Paris.
- Toute relance exige un solde vérifié depuis moins de sept jours, un compte actif et une facture échue.
- Scénarios : standard J+7/15/30, doux J+7/21, ferme J+3/10/20. Une ancienne facture commence par la première étape manquante.
- Les envois manuels et automatiques partagent le même service. Une réservation SQL empêche deux envois simultanés sur la même facture. Une étape délivrée reste réservée ; temporisation minimale de 24 heures entre étapes.
- Une réponse ambiguë du fournisseur laisse l'envoi en attente. Le webhook signé peut réconcilier la réservation ; un rejet définitif ou un signalement spam suspend le suivi. Voir DEPLOYMENT.md.
- Les totaux et l’ancienneté des soldes sont calculés directement dans PostgreSQL, sur toutes les factures du compte.
- Les réglages des relances ne sont confirmés qu’après enregistrement ; une configuration d’envoi manquante est signalée.

## Périmètre

La navigation principale porte sur les impayés, les clients, les modèles, les scénarios et les statistiques de soldes. Les anciens modules CRM/intégrations restent dans le dépôt pour préserver les données historiques, sans être mis en avant dans la nouvelle offre.

Les liens publics d'encaissement Stripe sont désactivés : l'ancienne implémentation créditait le compte plateforme sans routage vers le fournisseur. Les paiements historiques correspondants nécessitent une réconciliation manuelle. L'abonnement au logiciel reste payable via Stripe.

Les fiches PDF sont des documents de suivi, pas un remplacement de la facture originale. Les tableaux reposent sur des montants renseignés/importés, sans synchronisation bancaire. Aucun DSO n'est présenté dans les nouvelles statistiques.

Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour la migration, la configuration des prestataires et les vérifications avant mise en service.

## Modèles et factures sans email

La personnalisation des trois relances amiables est incluse dans l’essai actif et l’offre Fondateur. L’éditeur, les aperçus et l’envoi utilisent les mêmes modèles par défaut. Sauvegarde, rechargement et réinitialisation exposent les erreurs réelles.

L’email client est facultatif pour l’import CSV et la création manuelle. Une adresse absente est stockée à `null`, sans inventer de destinataire. Le filtre « Sans email » permet de retrouver les fiches à compléter. Une adresse ajoutée ou modifiée remet la facture en pause ; les relances refusent tout destinataire absent ou invalide. Au réimport, une cellule email vide conserve l’adresse connue ; une adresse connue différente reste un conflit à examiner.

Migration additive : `20261016171736_optional_invoice_email.sql`. Sur RECOUVREMENT, elle a été appliquée sous la version `20261016172513`.
