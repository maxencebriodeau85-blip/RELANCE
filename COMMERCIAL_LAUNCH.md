# Encair — validation avant ouverture commerciale

Ce document est une **checklist de mise en production**, pas une attestation de conformité. Chaque case nécessite une preuve (capture, journal expurgé, résultat de test ou lien de configuration). Ne pas ouvrir les inscriptions payantes tant que les critères bloquants ne sont pas validés.

## Bloquants — produit et données
- [ ] Sauvegarde Supabase restaurée avec succès sur un environnement isolé.
- [ ] Migrations comparées avec l'historique distant, appliquées et testées en préproduction (ne jamais lancer `db push` aveuglément).
- [ ] Deux comptes de test : aucune lecture ou écriture croisée possible (RLS, API et exports).
- [ ] CSV français : doublons, références contradictoires, montants négatifs, email absent et réimport couverts.
- [ ] Paiement partiel : email et mise en demeure affichent exclusivement le solde restant dû ; paiement intégral stoppe les envois.
- [ ] Litige, promesse, pause et changement de destinataire suspendent les relances comme prévu.
- [ ] Réessais et webhooks Resend : aucun double envoi lors de requêtes concurrentes ou de réponses ambiguës.
- [ ] Cron et erreurs d'envoi surveillés ; procédure écrite pour traiter les envois `pending`.

## Bloquants — parcours client et paiement
- [ ] Inscription, confirmation d'email, mot de passe oublié et reconnexion testés sur mobile.
- [ ] SMTP Supabase et domaine d'envoi Resend configurés et vérifiés (SPF/DKIM/DMARC selon fournisseur).
- [ ] Première importation guidée ; l'utilisateur sait pourquoi ses factures sont initialement en pause.
- [ ] Essai expiré, quota atteint et échec de paiement expliqués sans perte de données.
- [ ] Checkout Stripe test : double clic, annulation, paiement réussi, webhook retardé, échec, résiliation et portail.
- [ ] Taxes applicables vérifiées avec un professionnel ; prix HT et facturation cohérents.

## Bloquants — confiance et exploitation
- [ ] Domaine et disponibilité de la marque Encair vérifiés ; URL canonique et TLS opérationnels.
- [ ] Mentions légales, CGU, politique de confidentialité et accord de sous-traitance RGPD revus pour l'entité exploitante.
- [ ] Durée de conservation, suppression de compte, export des données et demandes RGPD testés.
- [ ] Support opérationnel : adresse de contact, délai de réponse annoncé et procédure d'incident.
- [ ] Surveillance des erreurs, sauvegardes, rotation des secrets et alerte en cas d'échec cron configurées.
- [ ] Aucun secret exposé au navigateur ou au dépôt ; audit des dépendances et analyse des risques documentés.

## Commandes locales
```bash
npm ci
npm run typecheck
npm test
npm run build
```

## Critère de lancement
Faire réaliser le parcours complet par **trois entreprises pilotes** sur des données consenties et contrôlées. Documenter les erreurs rencontrées et les corriger. Ne passer en vente publique qu'après validation de **tous les bloquants**, notamment le bon montant réclamé et l'absence de doublons d'envoi.

Références techniques : `README.md` et `DEPLOYMENT.md`. Les tests automatisés ne prouvent ni la délivrabilité réelle ni la conformité juridique.
