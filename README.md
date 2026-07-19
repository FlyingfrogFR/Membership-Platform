# Membership · vACC France

Plateforme du pôle Membership du vACC France (VATSIM France). Un site public, rapide et en lecture seule, qui porte les quatre piliers du mandat :

1. **Visibilité** — le **Point vACC**, un digest trimestriel de l'avancement de chaque pôle.
2. **Contact** — une porte d'entrée clairement identifiée (les tickets restent sur Discord, catégorie « Membership »).
3. **Contribution** — le tableau **Contribuer** : postes ouverts et besoins ponctuels, toujours à jour.
4. **Coordination** — des points mensuels asynchrones avec les chefs de pôle (phase 2, privé).

Tout le contenu vit dans ce dépôt sous forme de fichiers (`/content`) : publier = fusionner sur `main`. Pas de base de données, pas de serveur.

## Proposer du contenu aujourd'hui (chefs de pôle)

En attendant les formulaires de la phase 2, deux façons de faire :

1. **La plus simple** : envoyez votre texte au Head of Membership (ticket Discord catégorie « Membership », ou message direct). Il le met en forme et l'intègre.
2. **La plus directe** : ouvrez une pull request qui modifie les fichiers de `/content`. Le format exact (et des exemples complets) est décrit dans [CONTRIBUTING.md](CONTRIBUTING.md). La validation tourne automatiquement sur chaque PR : si le format n'est pas bon, la PR le signale avant publication.

Dans les deux cas, le Head of Membership relit et harmonise le ton avant publication.

## Structure du contenu

- `content/point-vacc/<slug>.md` — une édition du Point vACC par fichier (frontmatter YAML : intro du HoM + une section par pôle : fait / en cours / à venir / coup de main recherché).
- `content/contribuer/needs.yaml` — le tableau Contribuer : un tableau d'items (`poste` ou `ponctuel`).

La liste des pôles et leur ordre d'affichage sont définis à un seul endroit : `src/config/departments.ts`.

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

- **React + Vite + TypeScript + Tailwind CSS**, sortie 100 % statique.
- Le contenu est chargé **au build** depuis `/content` (frontmatter YAML + `js-yaml`), validé par des schémas Zod partagés entre l'app et le script de validation (`src/lib/schemas.ts`).
- La logique métier (parsing, export Discord, formats) vit dans `src/lib`, les composants sont autonomes, les couleurs dans un seul fichier de thème (`src/index.css`) et toutes les chaînes d'interface dans `src/i18n/fr.ts` — pour pouvoir, à terme, intégrer ces pages à vatsim.fr sans tout réécrire.
- Export Discord : sur chaque édition, « Copier pour Discord » produit une version markdown Discord de l'édition, découpée en messages numérotés sous la limite des 2000 caractères.

## Déploiement

Sortie statique dans `dist/`, déployable telle quelle sur Vercel (config fournie dans `vercel.json`), Netlify ou GitHub Pages. Par défaut : Vercel, en attendant la réponse sur l'hébergement (voir ci-dessous).

## Décisions (tranchées par Pierre)

1. **Liste des pôles** : confirmée telle quelle — NAV, Training ATC, Pilot Training, Digital Services, Documentation, CDM, Events, Membership, dans cet ordre (`src/config/departments.ts`).
2. **Thème** : palette officielle du vACC (vatsim.fr) appliquée aux tokens de `src/index.css` (reflexblue `#0055A4`, dorian `#E4F2FC`, navy `#0B1A31`…), assombrie là où le contraste WCAG l'exige.
3. **Fusion à terme dans vatsim.fr** : c'est l'objectif à long terme. L'architecture est donc gardée « portable » (logique dans `src/lib`, composants présentationnels autonomes, thème et i18n centralisés). À noter : vatsim.fr tourne sous **Angular + Tailwind**, alors que cette plateforme est en **React + Vite + Tailwind** (stack habituelle de Pierre, cf. brief §8) — une fusion réelle impliquera soit d'embarquer ce build, soit de porter les composants ; les tokens de thème sont d'ores et déjà alignés.
4. **VATSIM Connect (phase 2)** : reporté à l'ouverture de la phase 2 (qui demande les identifiants OAuth2 sera décidé à ce moment-là).

## Questions encore ouvertes

1. **Hébergement et domaine** : sous-domaine vatsim.fr ou site autonome ? À confirmer avec Digital Services — défaut Vercel (statique) en attendant.
2. **Lien Discord** : URL exacte vers la catégorie de tickets « Membership » (`src/config/site.ts`, actuellement pointé sur vatsim.fr en placeholder).
3. **Logo/favicon définitifs** : le placeholder reprend désormais les couleurs officielles, mais un logo vACC propre reste le bienvenu (`public/favicon.svg`).

## Contenu d'exemple

L'édition et les besoins livrés avec le dépôt sont préfixés `EXEMPLE —` : rien de fictif ne doit passer pour une vraie annonce. Les remplacer avant la mise en ligne.
