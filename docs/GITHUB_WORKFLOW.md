# Organisation du dépôt Encair

## Branches et publication
- `main` : code destiné à la production. Une fusion peut déclencher un déploiement Vercel.
- `fix/<sujet>`, `feat/<sujet>`, `chore/<sujet>` : branches courtes, avec pull request vers `main`.
- Ne pas fusionner une PR dont les vérifications sont rouges ou non exécutées. La compilation réussie ne remplace pas une recette Stripe, Supabase et Resend.

## Contrôles de qualité
- Workflow unique `.github/workflows/verify.yml` : installation, TypeScript, tests, lint, build.
- Les variables du workflow sont fictives. Les tests qui nécessitent des services réels doivent être effectués séparément, avec autorisation et données de test.
- Configurer dans GitHub les règles de protection de `main` et rendre le contrôle `Verify Encair / verify` obligatoire. La présence du workflow seule n'impose pas cette protection.

## Répertoires
| Emplacement | Rôle |
| --- | --- |
| `app/` | Pages et routes API Next.js |
| `components/` | Composants d'interface |
| `lib/` | Règles métier, intégrations et tests |
| `supabase/migrations/` | Évolution du schéma SQL |
| `scripts/` | Outils de maintenance et de vérification |
| `docs/` | Exploitation, recette et décisions |
| `.github/workflows/` | Automatisation CI |

## Documentation de référence
- `README.md` : présentation et développement.
- `DEPLOYMENT.md` : configuration et déploiement.
- `docs/OPERATIONS.md` : suivi des relances, incidents, email.
- `COMMERCIAL_LAUNCH.md` : recette avant vente.

## Nettoyage des anciennes PR
- PR #8 (onboarding) et #9 (suivi email) : fermées car leurs changements ont été repris dans la PR #10, fusionnée dans `main`. Ne pas les fusionner à nouveau.
- PR #5 (sauvegarde et alertes) : conserver ouverte pour revue de sécurité, restauration, secrets et coûts avant fusion. La présence d'un workflow de sauvegarde ne prouve pas qu'une sauvegarde fonctionne.
- Ne pas supprimer de branches historiques tant que les changements et leur traçabilité ne sont pas confirmés.

## Checklist d'une PR
- [ ] Périmètre précis et changements documentés
- [ ] Typecheck, tests, lint et build réussis
- [ ] Vérification des secrets, permissions, RLS et régressions
- [ ] Plan de retour arrière si modification risquée
- [ ] Validation explicite avant publication des changements impactant les clients
