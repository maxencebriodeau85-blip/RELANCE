# Domaine encair.fr

Domaine acheté chez OVHcloud le 30 octobre 2026 (commande 261628714), pour 1 an, renouvellement en octobre 2027. Titulaire : l'éditeur, en tant que personne physique ; à transférer à la société une fois celle-ci immatriculée (changement de titulaire chez OVH).

Inclus dans la commande : DNSSEC et un compte e-mail Zimbra Starter (`contact@encair.fr`, à créer depuis l'espace client OVH : le mot de passe de la boîte est choisi par l'éditeur).

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

Valeurs e-mail OVH reprises de la zone `combien-media.fr`, déjà servie par la même plateforme Zimbra. Les signatures DKIM d'OVH (`ovhmo-selector-1/2._domainkey`) sont propres à chaque domaine : à activer depuis Zimbra une fois la boîte créée.

Supprimés de la zone par défaut d'OVH (30/10/2026) : A `213.186.33.5` sur la racine et `www` (page de parking), TXT `1|www.encair.fr` et `3|welcome`, CNAME `ftp`, SPF `v=spf1 -all`.

Les relances partent de `send.encair.fr` (enveloppe) avec une signature DKIM `d=encair.fr` : DMARC passe par l'alignement DKIM, indépendamment du SPF de la racine.

Les valeurs Vercel sont relues avec `get_domain_config` (Vercel) ; celles de Resend dans le tableau de bord Resend ou `get-domain`. En cas de doute, ce sont ces sources qui font foi, pas ce tableau.

## Bascule de l'URL canonique

À faire seulement quand `https://encair.fr` répond en HTTPS avec le bon certificat :

1. Vercel → Production : `NEXT_PUBLIC_APP_URL=https://encair.fr`, puis redéployer (la variable est figée au build).
2. Supabase Auth → URL Configuration : Site URL `https://encair.fr` ; redirections `https://encair.fr/auth/confirm`, `https://encair.fr/auth/confirm?next=/auth/reset-password&type=recovery`, `https://encair.fr/auth/reset-password`.
3. Vérifier `/`, `/sitemap.xml`, `/robots.txt`, `/.well-known/security.txt` (toutes les URL en `https://encair.fr`) et un parcours inscription → email → confirmation.
4. Seulement ensuite : `ENFORCE_CANONICAL_HOST=true` en Production, redéployer. `relance-teal.vercel.app` redirige alors en 301 vers `encair.fr` (sauf webhooks et `/api/health`).
5. Mettre à jour `PROD_URL` (secrets GitHub du monitoring) et les URL de webhooks Stripe/Resend.
