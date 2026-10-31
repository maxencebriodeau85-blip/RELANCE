# Encair — validation avant ouverture commerciale

Ce document est une **checklist de mise en production**, pas une attestation de conformité. Chaque case nécessite une preuve (capture, journal expurgé, résultat de test ou lien de configuration). Ne pas ouvrir les inscriptions payantes tant que les critères bloquants ne sont pas validés.

## Bloquants — produit et données
- [ ] Sauvegarde Supabase restaurée avec succès sur un environnement isolé.
- [x] Migrations comparées avec l'historique distant, appliquées et testées en préproduction (ne jamais lancer `db push` aveuglément). *Preuve 27/10/2026 : encair-test à 29/29 migrations, structure identique à RECOUVREMENT (colonnes, règles d'accès, index, contraintes, déclencheurs et droits comparés par empreinte), recette `scripts/ops/recette-base.sql` 41/41.*
- [x] Deux comptes de test : aucune lecture ou écriture croisée possible (RLS, API et exports). *Preuve 27/10/2026 : RLS (contrôles 21 à 27 et E8 de `recette-base.sql`), API v1 avec de vraies clés sur encair-test (bloc 5, A1 à A11 : chaque clé limitée à son compte, clés révoquées ou expirées refusées, aucun doublon au rejeu), route `/api/v1` qui ne transmet que l'empreinte de la clé (tests `integration-api-route`), exports : fiche PDF filtrée sur la session (tests `invoice-pdf-route`), export RGPD sous RLS (tests `account-export`), export CSV construit dans le navigateur à partir des seules factures visibles du compte.*
- [x] CSV français : doublons, références contradictoires, montants négatifs, email absent et réimport couverts. *Preuve : contrôles 02 à 14 de `recette-base.sql` sur encair-test, lecture des fichiers couverte par les tests `invoice-import`.*
- [x] Paiement partiel : email et mise en demeure affichent exclusivement le solde restant dû ; paiement intégral stoppe les envois. *Preuve : contrôles 04, 06, 16, 17 et 40 de `recette-base.sql`, tests `collection` et `reminder-service` (2 869,66 − 506,51 = 2 363,15 €).*
- [ ] Litige, promesse, pause et changement de destinataire suspendent les relances comme prévu.
- [ ] Réessais et webhooks Resend : aucun double envoi lors de requêtes concurrentes ou de réponses ambiguës. *Base prouvée le 27/10/2026 (contrôles 32 à 38) ; 31/10/2026 : clé et webhook Resend de production en place, relances ouvertes (`automationReady: true`). Reste : un envoi réel avec ses événements reçus par le webhook.*
- [ ] Cron et erreurs d'envoi surveillés ; procédure écrite pour traiter les envois `pending`. *27/10/2026 : procédure et requêtes écrites (`docs/INCIDENTS.md` cas 2, `scripts/ops/envois-en-attente.sql`, vérifiées sur RECOUVREMENT). Reste : la surveillance horaire tourne dès que le dépôt est privé avec ses secrets.*

## Bloquants — parcours client et paiement
- [ ] Inscription, confirmation d'email, mot de passe oublié et reconnexion testés sur mobile.
- [x] SMTP Supabase et domaine d'envoi Resend configurés et vérifiés (SPF/DKIM/DMARC selon fournisseur). *30/10/2026 : domaine `encair.fr` vérifié dans Resend (DKIM, SPF et MX `send`), DMARC `p=none` publié. 31/10/2026 : SMTP Resend dans Supabase Auth, modèles français, email de confirmation reçu en boîte de réception (Gmail).*
- [ ] Première importation guidée ; l'utilisateur sait pourquoi ses factures sont initialement en pause.
- [ ] Essai expiré, quota atteint et échec de paiement expliqués sans perte de données. *27/10/2026 : bandeau « essai terminé », messages de quota, et bandeau « paiement échoué » avec accès direct au portail Stripe (statut enregistré par le webhook, tests `stripe-lifecycle`) ; données conservées (contrôles 28-29 de `recette-base.sql`). Reste à le voir à l'écran, connecté.*
- [ ] Checkout Stripe test : double clic, annulation, paiement réussi, webhook retardé, échec, résiliation et portail.
- [ ] Taxes applicables vérifiées avec un professionnel ; prix HT et facturation cohérents. *31/10/2026 : franchise en base de TVA retenue par l'éditeur (art. 293 B du CGI) ; prix affichés « 16 €/mois » avec la mention, `PUBLISHER_VAT_EXEMPT=true`. Paiement live ouvert le 31/10/2026 (`billingReady: true`). Reste : SIREN, puis mention sur les factures Stripe.*

## Bloquants — confiance et exploitation
- [ ] Domaine et disponibilité de la marque Encair vérifiés ; URL canonique et TLS opérationnels. *30/10/2026 : `encair.fr` acheté et servi en HTTPS, URL canonique et redirection des alias Vercel actives (`docs/DOMAINE.md`). Reste : vérification de la marque à l'INPI.*
- [ ] Mentions légales, CGU, politique de confidentialité et accord de sous-traitance RGPD revus pour l'entité exploitante.
- [ ] Durée de conservation, suppression de compte, export des données et demandes RGPD testés. *27/10/2026 : export en libre-service (tests `account-export`), suppression en cascade prouvée (bloc 3 de `recette-base.sql`), procédure et requête de conservation dans `scripts/ops/suppression-compte.sql`. Reste : un export réel depuis l'interface, connecté.*
- [x] Support opérationnel : adresse de contact, délai de réponse annoncé et procédure d'incident. *Preuve 27/10/2026 : formulaire et adresse de contact, réponse sous 48 h ouvrées annoncée, `docs/INCIDENTS.md` (gravité, interrupteur d'urgence des envois, 5 cas types dont fuite de données et notification CNIL). Adresse `contact@encair.fr` en service depuis le 31/10/2026.*
- [ ] Surveillance des erreurs, sauvegardes, rotation des secrets et alerte en cas d'échec cron configurées.
- [x] Aucun secret exposé au navigateur ou au dépôt ; audit des dépendances et analyse des risques documentés. *Preuve 27/10/2026 : `docs/SECURITE.md` (historique des 21 branches sans secret, faille critique Next.js corrigée en 15.5.28, test `security-config`).*

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
