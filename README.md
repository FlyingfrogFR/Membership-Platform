# Membership · vACC France

Plateforme du pôle Membership de la vACC France (VATSIM France). Un site public, rapide et en lecture seule, qui porte les quatre piliers du mandat :

1. **Visibilité** — le **Point vACC**, un digest trimestriel de l'avancement de chaque équipe.
2. **Contact** — une porte d'entrée clairement identifiée (les tickets restent sur Discord, catégorie « Membership »).
3. **Contribution** — le tableau **Contribuer** : postes ouverts et besoins ponctuels, toujours à jour.
4. **Coordination** — des points mensuels asynchrones avec les référents d'équipe (phase 2, privé).

Tout le contenu vit dans ce dépôt sous forme de fichiers (`/content`) : publier = fusionner sur `main`. Pas de base de données, pas de serveur.

## Proposer du contenu aujourd'hui (référents d'équipe)

Trois façons de faire, de la plus simple à la plus directe :

1. **Le formulaire** : la page **`/proposer`** du site génère le contenu au bon format — un clic ouvre GitHub pré-rempli pour créer la proposition, ou copiez le résultat et envoyez-le au Head of Membership sur Discord. Pour le Point vACC, **chaque équipe envoie sa rubrique séparément** (un petit fichier de brouillon sous `content/point-vacc/drafts/`) sans attendre les autres ; le Head of Membership assemble ensuite l'édition complète. Les saisies sont **enregistrées automatiquement dans le navigateur** : on peut fermer la page et reprendre plus tard. Un fichier `.yaml` téléchargé (ou reçu d'un référent) peut être **réimporté** dans le formulaire pour re-remplir les champs.
2. **Le message** : envoyez votre texte brut au Head of Membership (ticket Discord catégorie « Membership », ou message direct). Il le met en forme et l'intègre.
3. **La pull request à la main** : modifiez directement les fichiers de `/content` — le format exact est décrit dans [CONTRIBUTING.md](CONTRIBUTING.md). La validation tourne sur chaque PR : si le format n'est pas bon, la PR le signale avant publication.

Dans tous les cas, le Head of Membership relit et harmonise le ton avant publication. La page **`/admin`** lui sert de tableau de bord : **alertes** (besoins qui vieillissent, journal muet, édition en retard, brouillons oubliés, données d'exemple restantes), **pilotage du Point vACC** (compte à rebours de la prochaine édition, checklist datée, matrice de participation par équipe, messages de relance prêts à coller), **assemblage de l'édition** à partir des rubriques reçues, **export Discord du tableau Contribuer**, **suivi Coordination** (points mensuels reçus par équipe + relances), **indicateurs KPI** (trimestre vs trimestre, export markdown, tendances) et enregistrement des sollicitations. Ces pages ne stockent rien : les droits réels restent ceux de GitHub.

## Connexion VATSIM France (SSO)

Le site sait s'authentifier auprès du broker d'identité de la vACC (`auth.vatsim.fr`, OpenID Connect). Le site étant 100 % statique, il agit comme **client public avec PKCE** : aucun secret, nulle part. Le bouton « Se connecter avec VATSIM France » n'apparaît sur les pages internes que lorsque le client est configuré :

1. Demander à l'équipe Digital un client OIDC **public** (PKCE S256) dans le realm `frenchvacc_prod`, avec :
   - redirect URI : `https://<domaine du site>/auth/callback` (+ `http://localhost:5173/auth/callback` pour le dev) ;
   - web origins (CORS) : l'origine du site (nécessaire pour l'échange de code depuis le navigateur) ;
   - deux rôles, à assigner aux bonnes personnes : `membership-admin` (Espace Membership + formulaires) et `membership-referent` (formulaires `/proposer`). Rôles de realm ou de client : les deux sont lus.
2. Renseigner sur Vercel : `VITE_OIDC_CLIENT_ID` (et `VITE_OIDC_ISSUER` si le realm change — défaut : `https://auth.vatsim.fr/realms/frenchvacc_prod`).

À la connexion, le site lit les rôles dans les jetons et déverrouille les pages correspondantes pour la session. Le mot de passe reste disponible en secours (référent sans compte, indisponibilité du broker). Un troisième niveau `member` existe côté code (tout compte VATSIM France connecté, sans rôle) — aucune page ne l'utilise encore.

### Envoi direct depuis les formulaires (fonctions serverless)

En complément du SSO, deux fonctions Vercel (`api/submit-section.ts`, `api/submit-need.ts`) permettent aux référents connectés d'envoyer leur rubrique ou un besoin **en un clic, sans compte GitHub** : la fonction vérifie cryptographiquement le jeton VATSIM France (signature JWKS, émetteur, rôle Membership), compose le fichier au bon format et **ouvre elle-même la pull request** que le Head of Membership relit — puis prévient sur Discord si un webhook est configuré. Rien n'est stocké côté serveur : le dépôt reste la seule source de vérité.

Variables d'environnement Vercel :

- `GITHUB_BOT_TOKEN` (**requis**) : un fine-grained PAT limité à ce dépôt, permissions *Contents: Read and write* et *Pull requests: Read and write* ;
- `VITE_DIRECT_SUBMIT=1` (**requis**) : affiche les boutons « Envoyer directement au Membership » (il faut aussi un moyen d'authentification : le SSO, ou le mode transitoire ci-dessous) ;
- `VITE_PASS_SUBMIT=1` (**transitoire**) : en attendant le client SSO, autorise l'envoi direct authentifié par le mot de passe référent, revérifié côté serveur à chaque envoi. À retirer dès que le SSO est actif ;
- `GITHUB_REPO` (optionnel, défaut : ce dépôt) ;
- `DISCORD_WEBHOOK_URL` (optionnel) : webhook d'un canal staff à prévenir à chaque envoi ;
- `OIDC_ISSUER` / `OIDC_CLIENT_ID` (optionnels, défaut : les valeurs `VITE_…`).

Sans ces variables, les fonctions répondent 503, les boutons n'apparaissent pas, et le site reste 100 % statique.

## Structure du contenu

- `content/point-vacc/<slug>.md` — une édition du Point vACC par fichier (frontmatter YAML : intro du HoM + une section par équipe : fait / en cours / à venir / coup de main recherché).
- `content/point-vacc/drafts/<slug>/<équipe>.yaml` — les rubriques envoyées par les équipes pour une édition à venir, en attente d'assemblage par le HoM (à supprimer après publication — une alerte de l'Espace Membership le rappelle).
- `content/contribuer/needs.yaml` — le tableau Contribuer : un tableau d'items (`poste` ou `ponctuel`).
- `content/membership/tickets-log.yaml` — journal manuel et **anonyme** des sollicitations Membership (équipe + horodatages, aucune donnée personnelle). Alimente les statistiques par équipe affichées sur la page Point vACC, en attendant l'accord pour un lien automatique avec Discord.
- `content/membership/coordination.yaml` — suivi du pilier Coordination : quelles équipes ont envoyé leur point mensuel (**booléens et dates uniquement** — jamais le contenu des points, qui reste privé).

La liste des équipes et leur ordre d'affichage sont définis à un seul endroit : `src/config/departments.ts`.

## Développement

Prérequis : Node.js 22+.

```bash
npm install
npm run dev        # serveur de développement
npm run validate   # vérifie les fichiers de /content (schémas)
npm test           # tests unitaires (export Discord, parsing)
npm run build      # validate + typecheck + build statique dans dist/
npm run preview    # sert le build de production en local
```

`npm run build` échoue si un fichier de contenu est mal formé : une édition cassée ne peut pas partir en production.

## Architecture

- **React + Vite + TypeScript + Tailwind CSS**, sortie 100 % statique — plus deux fonctions serverless optionnelles (`/api`) pour l'envoi direct, inactives tant que leurs variables d'environnement ne sont pas posées.
- Le contenu est chargé **au build** depuis `/content` (frontmatter YAML + `js-yaml`), validé par des schémas Zod partagés entre l'app et le script de validation (`src/lib/schemas.ts`).
- La logique métier (parsing, export Discord, formats) vit dans `src/lib`, les composants sont autonomes, les couleurs dans un seul fichier de thème (`src/index.css`) et toutes les chaînes d'interface dans `src/i18n/fr.ts` — pour pouvoir, à terme, intégrer ces pages à vatsim.fr sans tout réécrire.
- Export Discord : sur chaque édition, « Copier pour Discord » produit une version markdown Discord de l'édition, découpée en messages numérotés sous la limite des 2000 caractères.

## Déploiement

Sortie statique dans `dist/`, déployable telle quelle sur Vercel (config fournie dans `vercel.json`), Netlify ou GitHub Pages. Par défaut : Vercel, en attendant la réponse sur l'hébergement (voir ci-dessous).

## Décisions (tranchées par Pierre)

1. **Liste des équipes** : alignée sur la page officielle [« Organisation et rôles dans la vACC »](https://doc.vatsim.fr/fr/general/vacc-roles) — **vACC Directors, Ops & Nav, Training Department, Digital, Events, Membership** (le Membership fait partie de l'organisation officielle : visibilité trimestrielle, tickets Discord, résolution de conflits entre membres). Le tout dans `src/config/departments.ts`, à mettre à jour uniquement quand la page officielle change.
2. **Thème** : identité chaleureuse et communautaire, dans les tons de la vACC — fond bleu clair (famille dorian), primaire **bleu ciel** et accent **corail**, formes bien arrondies et ombres douces, en **Nunito** (sans-serif ronde, auto-hébergée via Fontsource : le site reste statique). Centralisé dans `src/index.css` (import de la police dans `src/main.tsx`), contrastes vérifiés WCAG AA.
3. **Fusion à terme dans vatsim.fr** : c'est l'objectif à long terme. L'architecture est donc gardée « portable » (logique dans `src/lib`, composants présentationnels autonomes, thème et i18n centralisés). À noter : vatsim.fr tourne sous **Angular + Tailwind**, alors que cette plateforme est en **React + Vite + Tailwind** (stack habituelle de Pierre, cf. brief §8) — une fusion réelle impliquera soit d'embarquer ce build, soit de porter les composants ; le thème étant centralisé dans un seul fichier, il reste réalignable sur la charte de vatsim.fr si la fusion l'exige.
4. **VATSIM Connect (phase 2)** : reporté à l'ouverture de la phase 2 (qui demande les identifiants OAuth2 sera décidé à ce moment-là).

## Questions encore ouvertes

1. **Hébergement et domaine** : sous-domaine vatsim.fr ou site autonome ? À confirmer avec Digital Services — défaut Vercel (statique) en attendant.
2. **Lien Discord** : URL exacte vers la catégorie de tickets « Membership » (`src/config/site.ts`, actuellement pointé sur vatsim.fr en placeholder).
3. **Logo/favicon définitifs** : le placeholder reprend désormais les couleurs officielles, mais un logo vACC propre reste le bienvenu (`public/favicon.svg`).

## Démarrage à vide

Le dépôt part **sans contenu** : pas d'édition, tableau Contribuer vide, journal des sollicitations vide — le site affiche des états vides propres en attendant les premières vraies publications (via `/proposer` ou les fichiers de `/content`).
