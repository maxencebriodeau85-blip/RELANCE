# Domaine encair.fr

Domaine acheté chez OVHcloud le 30 octobre 2026 (commande 261628714), pour 1 an, renouvellement en octobre 2027. Titulaire : l'éditeur, en tant que personne physique ; à transférer à la société une fois celle-ci immatriculée (changement de titulaire chez OVH).

Inclus dans la commande : DNSSEC et un compte e-mail Zimbra Starter : `contact@encair.fr`, créé le 31/10/2026 (organisation Zimbra `ENCAIR`, plateforme partagée avec `combien-media.fr`). Webmail : https://webmail.mail.ovh.net/.

Serveurs DNS : `dns103.ovh.net`, `ns103.ovh.net`. Domaine verrouillé contre le transfert.

## Qui fait quoi

| Service | Rôle | Où se règle |
| --- | --- | --- |
| OVHcloud | Registrar, serveurs DNS (zone OVH conservée), boîte `contact@encair.fr` | Espace client OVH → Noms de domaine → encair.fr → Zone DNS |
| Vercel | Site et application | Projet `relance` → Domains : `encair.fr` (principal), `www.encair.fr` → redirection 308 |
| Resend | Envoi des relances et emails transactionnels, sous-domaine `send` | Domaine `encair.fr`, région eu-west-1 |

Les serveurs DNS restent ceux d'OVH : c'est ce qui garde la boîte Zimbra (MX OVH) fonctionnelle. Ne pas déléguer la zone à Vercel.

## Enregistrements DNS attendus

| Sous-domaine | Type | Valeur | Pour |
| --- | --- | --- | --- |
| (racine) | A | `216.198.79.1` | Vercel (valeur recommandée par Vercel le 30/10/2026) |
| (racine) | A | `64.29.17.1` | Vercel |
| `www` | CNAME | `4b04bcd66b4d9a55.vercel-dns-017.com.` | Vercel (redirige vers la racine) |
| `resend._domainkey` | TXT | clé DKIM affichée par Resend | Signature des emails |
| `send` | MX 10 | `feedback-smtp.eu-west-1.amazonses.com.` | Retours (bounces) Resend |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` | SPF du sous-domaine d'envoi |
| `rsend` | CNAME | `send.forge.rmta.net.` | Resend |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:contact@encair.fr` | Rapports DMARC, à durcir (`quarantine`) après quelques semaines sans anomalie |
| (racine) | MX 1 / 5 / 50 / 100 | `mx0` / `mx1` / `mx2` / `mx3.mail.ovh.net.` | Réception de `contact@encair.fr` (Zimbra OVH) |
| (racine) | TXT | `v=spf1 include:mx.ovh.com ~all` | SPF de la racine : autorise l'envoi depuis la boîte OVH |
| `_autodiscover._tcp` | SRV | `0 0 443 zimbra1.mail.ovh.net.` | Configuration automatique des clients mail |

Valeurs e-mail OVH reprises de la zone `combien-media.fr`, déjà servie par la même plateforme Zimbra. Les signatures DKIM d'OVH (CNAME `ovhmo-selector-1/2._domainkey`) ont été ajoutées par OVH à l'ajout du domaine dans Zimbra.

**Piège** : l'ajout d'un domaine dans Zimbra en *configuration recommandée* remplace **tous** les MX de la zone, y compris le MX `send` de Resend (supprimé le 31/10/2026, remis le jour même). Après toute opération e-mail chez OVH, relire la zone et vérifier le domaine dans Resend.

Supprimés de la zone par défaut d'OVH (30/10/2026) : A `213.186.33.5` sur la racine et `www` (page de parking), TXT `1|www.encair.fr` et `3|welcome`, CNAME `ftp`, SPF `v=spf1 -all`.

Les relances partent de `send.encair.fr` (enveloppe) avec une signature DKIM `d=encair.fr` : DMARC passe par l'alignement DKIM, indépendamment du SPF de la racine.

Les valeurs Vercel sont relues avec `get_domain_config` (Vercel) ; celles de Resend dans le tableau de bord Resend ou `get-domain`. En cas de doute, ce sont ces sources qui font foi, pas ce tableau.

## État au 31/10/2026

| Élément | État |
| --- | --- |
| Délégation `.fr` vers OVH | Publiée (`dns103` / `ns103.ovh.net`) |
| Vercel `encair.fr` / `www.encair.fr` | Configurés, certificat émis ; `www` → 308 vers la racine |
| `https://encair.fr` | 200 depuis l'Inde, Israël et la Suède (check-host.net) |
| `NEXT_PUBLIC_APP_URL` | `https://encair.fr` : canonique, Open Graph, sitemap (23 URL), robots, security.txt sur encair.fr |
| `ENFORCE_CANONICAL_HOST` | `true` en Production : les pages des alias `*.vercel.app` redirigent en 301 ; `/api/*` jamais |
| Resend `encair.fr` | **Vérifié** (DKIM, SPF et MX `send`, CNAME `rsend`) |
| Boîte `contact@encair.fr` | Créée le 31/10/2026 ; `SUPPORT_EMAIL` et `NEXT_PUBLIC_CONTACT_EMAIL` basculés dessus (Production et Preview) |
| Supabase Auth (Site URL, redirections) | Site URL `https://encair.fr` ; redirections `https://encair.fr/**` (+ ancien alias `/auth/callback`) ; joker `https://*.vercel.app/**` **supprimé** (tout site Vercel pouvait recevoir les liens) — 31/10/2026 |
| Supabase Auth SMTP | Resend (`smtp.resend.com:465`, utilisateur `resend`, expéditeur `Encair <contact@encair.fr>`) — 31/10/2026, mot de passe saisi par l'éditeur |
| Modèles Supabase Auth | `supabase/templates/confirmation.html` et `recovery.html` collés (objets « Confirmez votre adresse email Encair », « Réinitialisez votre mot de passe Encair ») — 31/10/2026 |
| `RESEND_FROM_EMAIL` (Production) | `relances@encair.fr` |
| `RESEND_API_KEY` (Production) | Clé `encair-production` (*Sending access*, domaine `encair.fr`), en place depuis le 31/10/2026 : formulaire `/contact` testé (livré à `contact@encair.fr`), email de bienvenue actif |
| `RESEND_WEBHOOK_SECRET` (Production) | En place depuis le 31/10/2026 (webhook `3caedff3` → `https://encair.fr/api/webhooks/resend`, 9 événements) : **relances ouvertes** (`automationReady: true`). Un appel non signé reçoit 401 |

## À faire par l'éditeur

1. ~~Clé Resend de production~~ (faite le 31/10/2026). **Clé Resend de production.** Resend → API Keys → *Create API key* : nom `encair-production`, permission *Sending access*, domaine `encair.fr`. Coller la clé directement dans Vercel → Settings → Environment Variables : `RESEND_API_KEY`, type *Sensitive*, environnement *Production* uniquement. Ne jamais la coller dans une conversation ni dans le dépôt. Puis redéployer. Effet : le formulaire `/contact` et l'email de bienvenue fonctionnent ; les relances restent verrouillées (pas de `RESEND_WEBHOOK_SECRET`).
2. ~~Supabase Auth → URL Configuration~~ (faite le 31/10/2026). Site URL `https://encair.fr` ; Redirect URLs : `https://encair.fr/auth/confirm`, `https://encair.fr/auth/confirm?next=/auth/reset-password&type=recovery`, `https://encair.fr/auth/reset-password`.
3. ~~Supabase Auth → SMTP Settings~~ (fait le 31/10/2026, avec la même clé `encair-production`) (après l'étape 1, avec une seconde clé Resend dédiée `encair-supabase-smtp`) : hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = cette clé, expéditeur `Encair <contact@encair.fr>` (les réponses arrivent dans la boîte support). Tester ensuite une inscription avec une adresse extérieure.
4. ~~Boîte `contact@encair.fr`~~ : faite le 31/10/2026, adresses du site basculées.
5. ~~Supprimer les 13 factures de test de production~~ (fait le 31/10/2026, base à 0 facture et 0 relance avant l'ouverture des relances).

## Bascule de l'URL canonique

À faire seulement quand `https://encair.fr` répond en HTTPS avec le bon certificat (étapes 1, 3 et 4 faites le 30/10/2026) :

1. Vercel → Production : `NEXT_PUBLIC_APP_URL=https://encair.fr`, puis redéployer (la variable est figée au build).
2. Supabase Auth → URL Configuration : Site URL `https://encair.fr` ; redirections `https://encair.fr/auth/confirm`, `https://encair.fr/auth/confirm?next=/auth/reset-password&type=recovery`, `https://encair.fr/auth/reset-password`.
3. Vérifier `/`, `/sitemap.xml`, `/robots.txt`, `/.well-known/security.txt` (toutes les URL en `https://encair.fr`) et un parcours inscription → email → confirmation.
4. Seulement ensuite : `ENFORCE_CANONICAL_HOST=true` en Production, redéployer. `relance-teal.vercel.app` redirige alors en 301 vers `encair.fr` (sauf webhooks et `/api/health`).
5. Mettre à jour `PROD_URL` (secrets GitHub du monitoring) et les URL de webhooks Stripe/Resend.
