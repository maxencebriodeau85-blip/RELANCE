# Brief de création du logo Encair

Créer une identité vectorielle professionnelle pour Encair, logiciel français de suivi et de relance des factures impayées destiné aux TPE. Le logo doit évoquer la clarté, la fiabilité et la continuité du suivi, avec une personnalité calme et accessible.

Concevoir un symbole simple reconnaissable seul : un « e » circulaire ouvert, dessiné comme un ruban bleu encre, traversé par une courte barre orange. Le cercle évoque la continuité du suivi et la barre apporte un repère visuel. L'associer au nom « encair » en minuscules, avec un lettrage géométrique aux contreformes ouvertes et un « a » simple étage. Le symbole doit rester identifiable en favicon et fonctionner sur fond clair et sombre, ainsi qu'en une couleur.

Palette : bleu encre #182B40, blanc et orange #EA693A ; ivoire #F7F4ED pour les fonds. Privilégier des formes nettes, une épaisseur cohérente et des espaces réguliers. Éviter les pièces de monnaie, les flèches génériques, les dégradés, les effets 3D, les ombres décoratives et les détails illisibles en petit. Livrer une version horizontale et un symbole isolé, tous deux en SVG.

## Production

La direction initiale est générée avec l'outil de création d'images intégré et conservée dans `public/brand/encair-logo-concept.png`. Le dessin final est adapté en tracés vectoriels dans `lib/brand/artwork.ts`, y compris le lettrage : aucune police externe n'est nécessaire pour afficher le logo.

Le composant partagé `components/brand/logo.tsx` couvre la navigation, les pages d'authentification et l'espace client. Les variantes monochromes conservent leur fonctionnement. Les exports téléchargeables sont `public/brand/encair-logo.svg`, `public/brand/encair-logo-blanc.svg` et `public/brand/encair-symbole.svg`.

Pour régénérer les exports et les icônes depuis la source commune : `node --import tsx scripts/generate-brand-assets.ts`.

## Prompt appliqué

Créer un logo professionnel et abouti pour Encair, logiciel français de suivi et de relance des factures pour petites entreprises. Une seule composition horizontale sur fond transparent : symbole à gauche, mot exact « encair » à droite. Symbole : un « e » minuscule sculptural, construit comme un large ruban circulaire bleu encre #182B40, avec une courte barre centrale orange #EA693A. Formes simples, courbes précises, contreformes ouvertes, personnalité calme et accessible. Lettrage sans empattement géométrique et humaniste, graisse soutenue, détails légèrement arrondis, « a » simple étage, point du « i » bleu encre, espacement optique soigné. Aucun carré autour du symbole. Aucun slogan, pièce, bouclier, flèche générique, dégradé, ombre, texture ou effet 3D. Le dessin doit être lisible à petite taille et facilement déclinable en vectoriel.
