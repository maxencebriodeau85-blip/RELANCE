# Formulaire contact : diagnostic du 6 novembre 2026

## Constats et correction préparée

Le propriétaire indique que les paiements et les relances fonctionnent, mais que les messages du formulaire ne sont pas reçus. Cela ne prouve pas que la réception de la boîte support fonctionne : les relances visent d’autres destinataires.

Le code contact est identique dans main `553174c` et les branches des PR54/55. Il utilise le même transport HTTP Resend et la même configuration d’expéditeur que les relances ; il adresse le message à `SUPPORT_EMAIL` et place l’email du visiteur en `reply_to`. Aucune valeur de configuration privée n’a été lue.

Un défaut local est reproduit : un champ piège `website` rempli renvoyait HTTP200 avec `success:true`, sans appeler le fournisseur. La page affichait alors « Message envoyé ». Un outil de remplissage automatique peut renseigner ce champ hors écran, mais cela n’a pas été observé chez le propriétaire et n’est **pas une cause distante confirmée**.

Le correctif refuse explicitement cette soumission, conserve les champs visibles et vide le champ technique pour permettre un nouvel essai. La limitation distribuée demeure. La page ne confirme la prise en charge qu’après acceptation HTTP par le fournisseur avec un identifiant au format UUID ; elle distingue cette acceptation de la réception en boîte.

Chaque réponse porte une référence aléatoire. Les journaux contact ne contiennent que cette référence, un événement fermé, un statut HTTP éventuel et, pour une acceptation, l’identifiant fournisseur validé. Aucun nom, adresse, texte soumis, corps de réponse fournisseur ou secret n’y est ajouté. Ces métadonnées permettent au propriétaire de retrouver une tentative sans faire publier son contenu.

## Ce qui reste inconnu

Aucun envoi réel, historique fournisseur, journal contenant des données clients, boîte email ou secret n’a été consulté. Les refus actuels, les éventuels bounces, les règles de boîte OVH et la cause précise du signalement restent inconnus. La recette livrée mentionnée dans `docs/DOMAINE.md` est datée du 31 octobre et ne démontre pas la réception du 6 novembre.

## Preuve nécessaire pour une prochaine recette autorisée

Après revue et publication autorisées, utiliser un message de recette sans données clients et relever sa référence :

1. `submission_rejected` : aucun appel fournisseur ; le formulaire doit afficher un refus, conserver le texte et permettre un nouvel essai.
2. `configuration_unavailable`, `provider_rejected` ou `provider_response_invalid` : vérifier la configuration ou le statut fournisseur dans l’environnement concerné, sans copier les clés ni le corps du message dans un rapport.
3. `provider_unconfirmed` : le résultat est ambigu ; retrouver la tentative chez le fournisseur avant de renvoyer. Aucun renvoi automatique n’est effectué.
4. `accepted` : rapprocher référence et identifiant fournisseur, puis vérifier l’état livré/rejeté du message chez Resend et sa présence dans la boîte de recette, y compris filtres et indésirables. Une acceptation ne vaut pas preuve de réception.

Le webhook actuel suit les relances, pas une boîte de réception contact. Ce correctif ne prétend pas apporter ce suivi ni résoudre une mauvaise destination ou un filtrage distant non observé.

## Validation locale

Tests du formulaire avec fournisseur simulé : rejet du champ piège, acceptation valide, refus fournisseur, JSON invalide, identifiant absent/non textuel/avec contrôles, exception transport et absence de données sensibles dans les journaux. Aucun test local ne prouve une livraison réelle.
