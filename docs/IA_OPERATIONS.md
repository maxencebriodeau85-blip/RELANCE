# Encair — direction IA, première version

Trois rôles analysent un contexte fourni par Maxence : acquisition, produit, contrôle. Ils proposent des expériences, des améliorations et des brouillons ; ils n'envoient aucun message, ne modifient aucune facture et ne pilotent pas la production.

## Aperçu immédiat sans appel payant

```bash
npm ci
npm run ai:operations -- preview examples/encair-ai-context.json
```

Ouvrir le fichier HTML indiqué. Les chiffres d'exemple sont fictifs et l'aperçu précise qu'aucune analyse IA n'a été réalisée.

## Raccordement pour les analyses réelles

Configurer `AI_GATEWAY_API_KEY` et `ENCAIR_AI_MODEL` dans l'environnement du processus. Choisir un identifiant `provider/model` dans le catalogue actuel AI Gateway ; aucun modèle n'est imposé en dur. Ne pas mettre la clé dans une commande, un rapport ou un fichier versionné. `ENCAIR_AI_REVIEW_MODEL` peut désigner un autre modèle pour le contrôle ; sinon les trois rôles utilisent le même modèle et ne constituent pas trois IA indépendantes.

```bash
npm run ai:operations -- run contexte-anonymise.json
```

Ce mode peut être facturé par le fournisseur. Il n'a pas été activé pendant le développement. Trois appels maximum, sans réessai, 1 600 tokens de sortie maximum et 45 secondes maximum par appel. Entrée limitée à 64 Ko, 30 observations de 1 200 caractères. Il n'existe pas de plafond monétaire intégré : fixer le budget fournisseur avant activation. Configuration manquante : aucun appel effectué.

## Travail des rôles

| Rôle | Entrées | Résultat |
| --- | --- | --- |
| Acquisition | Chiffres d'une même cohorte et retours anonymisés | Expériences de message, brouillons sobres |
| Produit | Objections, difficultés d'usage, capacités prouvées | Améliorations et critères de validation |
| Contrôle | Les deux propositions et les preuves | Trois priorités maximum, réserves ; peut tout rejeter |

Chaque constat, action et brouillon cite un ID fourni ou `funnel`. Les références inconnues, sorties invalides et sélections incohérentes interrompent l'analyse. La vérification porte sur les références et la structure, pas sur la vérité sémantique de chaque affirmation : Maxence relit avant utilisation. Les sources sont traitées comme des données non fiables ; les agents ne disposent d'aucun outil de mutation.

## Mémoire et limites

Les rapports JSON et HTML sont conservés localement dans `.encair-ai/`, ignoré par Git. Identifiant unique par analyse, sauvegardes avant et après chaque étape, écritures par remplacement atomique. Une étape en échec ne présente aucune recommandation validée. Les messages d'erreur fournisseur ne sont pas recopiés. L'HTML échappe les données et n'exécute aucun script. Une analyse interrompue brutalement reste `running` dans son historique : pas encore de reprise automatique ni de verrou multi-processus. Ne pas lancer deux analyses dans le même objectif simultanément.

Les entrées sont manuelles : chiffres agrégés d'une même cohorte envoyés → réponses → démos → activations → payants, retours anonymisés et preuves. Ne pas fournir de listes nominatives, d'adresses email, de secrets ou de factures clients. Le système ne collecte aucune réponse à froid et aucune donnée de production. Les conversions sans démo nécessitent une cohorte adaptée ; ce modèle de parcours n'est pas un outil de comptabilité commerciale exhaustive.

## Boucle d'exploitation

1. Renseigner la cohorte et les objections.
2. Lancer l'analyse et relire les priorités et réserves.
3. Choisir une expérience commerciale et une amélioration produit.
4. Utiliser manuellement les brouillons après relecture, puis mesurer la cohorte suivante.

Cette version est un outil local testable, pas encore une page du cockpit ou un service actif. Pas d'intégration CRM/email, de planification supplémentaire ni de déploiement. Le raccordement des modèles, une revue indépendante et une intégration privée au cockpit restent à réaliser avant exploitation autonome.
