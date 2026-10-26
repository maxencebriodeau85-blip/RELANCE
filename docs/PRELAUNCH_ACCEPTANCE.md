# Encair — recette de préproduction et décision de lancement

**Statut : NO-GO tant que les preuves P0 ne sont pas réunies.** Ce document ne certifie pas le fonctionnement réel des prestataires.

## Contrôles automatiques
La PR déclenche `Verify Encair` (TypeScript, Vitest, lint, build et vérification syntaxique du script smoke). Pour vérifier les pages publiques d'un environnement de préproduction, exécuter :

```bash
ENCAIR_BASE_URL=https://DOMAINE-DE-PREPRODUCTION node scripts/smoke-public.mjs
```

Le script n'envoie aucun email, ne crée aucun compte et ne déclenche aucun paiement. Il échoue sur les pages publiques inaccessibles ou redirigées. Il ne teste ni les contenus juridiques, ni les parcours authentifiés.

## Scénarios P0 à consigner (date, environnement, opérateur, résultat, preuve expurgée)

| ID | Scénario | Critère de réussite |
| --- | --- | --- |
| AUTH-01 | Inscription, confirmation sur autre navigateur, reconnexion, récupération | Session valide, aucune boucle, email reçu |
| AUTH-02 | Deux comptes A et B, accès API et export croisés | Toute lecture/écriture croisée refusée |
| CSV-01 | CSV français, doublons, email absent, réimport | Solde correct, conflits explicites, pas de doublon |
| MONEY-01 | 2 869,66 € TTC, règlement 506,51 € | Relance et PDF affichent exactement **2 363,15 €** |
| MONEY-02 | Paiement intégral puis cron | Aucune nouvelle relance |
| SEND-01 | Pause, litige, promesse, email modifié | Aucun envoi non autorisé |
| SEND-02 | Envoi concurrent, webhook répété, timeout fournisseur | Au plus un email accepté pour l'étape |
| STRIPE-01 | Checkout test, annulation, double clic, webhook retardé | Un abonnement cohérent, aucun accès prématuré |
| STRIPE-02 | Échec paiement, résiliation, portail | Statuts et droits cohérents |
| OPS-01 | Restauration d'une sauvegarde dans un projet isolé | Données restaurées et vérifiées |
| OPS-02 | Cron en erreur, alertes, secrets, rotation | Incident détectable et procédure documentée |
| LEGAL-01 | Éditeur, domaine, CGU, RGPD, taxes, support | Identité et conditions réelles validées |

Ne jamais employer de clients réels ni envoyer de relances sans autorisation explicite des destinataires de test. Utiliser Stripe en mode test. Masquer tokens, emails et données personnelles dans les preuves.

## Critères de décision
- **NO-GO** : une seule anomalie de montant, un doublon d'envoi, une fuite intercompte, ou une intégration de paiement/email non vérifiée.
- **PILOTE RESTREINT** : tous les scénarios P0 réussis en préproduction, puis trois entreprises pilotes volontaires sur des données autorisées.
- **GO PUBLIC** : retours pilotes traités, sauvegarde/restauration, support, facturation et documents légaux validés.

## Rollback
Ne pas fusionner si les contrôles CI échouent. Avant toute migration, conserver un point de restauration testé. En cas de régression après déploiement, suspendre les envois automatiques, revenir au dernier déploiement sain et traiter séparément les changements de schéma (ne pas inverser une migration destructive à l'aveugle).
