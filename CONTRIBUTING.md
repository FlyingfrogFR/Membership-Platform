# Contribuer au contenu

Ce document décrit le flux « pull request » pour proposer du contenu. Si vous préférez, envoyez simplement votre texte au Head of Membership (ticket Discord catégorie « Membership ») — il s'occupe du reste.

## Le principe

- Tout le contenu vit dans `/content`. Publier = fusionner sur `main`.
- Chaque PR est validée automatiquement (`npm run validate`) : schéma du frontmatter et du YAML, unicité des slugs et des ids. Une PR au mauvais format est bloquée avant publication.
- Le Head of Membership relit chaque proposition et peut ajuster le ton pour garder une voix cohérente.

## Ajouter ou modifier une édition du Point vACC

Créez `content/point-vacc/<slug>.md` — le nom du fichier **doit** être égal au slug (minuscules, chiffres, tirets). Exemple complet :

```markdown
---
title: "Point vACC — T3 2026"
slug: "2026-q3"
published: 2026-09-30
intro: >-
  Texte d'introduction du Head of Membership.
departments:
  - name: "NAV"
    done:
      - "Chose terminée ce trimestre"
    in_progress:
      - "Chose en cours"
    next:
      - "Chose prévue"
    help_wanted:            # optionnel
      - "Coup de main recherché"
  - name: "Events"
    done:
      - "…"
---

Texte de conclusion optionnel, en markdown, affiché après les sections des pôles.
```

Règles :

- `name` doit être un pôle de la liste `src/config/departments.ts` (`NAV`, `Training ATC`, `Pilot Training`, `Digital Services`, `Documentation`, `CDM`, `Events`, `Membership`). L'ordre d'affichage sur le site suit cette liste, pas l'ordre du fichier.
- `done`, `in_progress`, `next`, `help_wanted` sont tous optionnels — n'indiquez que ce qui existe. Un pôle sans aucun item n'apparaît ni sur le site ni dans l'export Discord.
- Phrases courtes, orientées résultat : elles sont affichées telles quelles en puces, sur le site comme sur Discord.

## Ajouter un besoin au tableau Contribuer

Ajoutez un item au tableau dans `content/contribuer/needs.yaml` :

```yaml
- id: "nav-relecture-lfpg"      # unique, en kebab-case
  type: "ponctuel"              # ponctuel | poste
  title: "Relecture documentation LFPG"
  department: "NAV"             # un pôle de src/config/departments.ts
  description: "Relire et commenter la nouvelle doc avant publication."
  skills: ["Connaissances ATC"] # optionnel
  time_estimate: "2–3 h"        # optionnel mais recommandé
  contact: "Ticket Membership ou @pseudo sur Discord"
  status: "open"                # open | filled | closed
  posted: 2026-08-01
```

Quand un besoin est pourvu, passez son `status` à `"filled"` (ou `"closed"` s'il est abandonné) plutôt que de le supprimer : le tableau garde ainsi la trace de ce qui avance.

Un fichier vide (ou ne contenant que des commentaires) est accepté : le site affiche alors simplement un tableau vide.

## Journal des sollicitations Membership (statistiques)

En attendant un lien automatique avec Discord, le suivi des sollicitations se fait **à la main** dans `content/membership/tickets-log.yaml`. Ce fichier ne contient **aucune donnée personnelle** : uniquement le pôle concerné et des horodatages. Il alimente le bloc « Statistiques du Membership » de la page Point vACC.

```yaml
- id: "2026-06-01-nav"          # unique, en kebab-case
  department: "NAV"             # un pôle de src/config/departments.ts
  opened: 2026-06-01T18:30:00Z  # obligatoire (ISO 8601 avec fuseau)
  first_response: 2026-06-01T19:05:00Z  # optionnel — sert au délai de 1re réponse
  closed: 2026-06-03T20:00:00Z          # optionnel — absent = encore ouvert
  outcome: "resolved"                   # optionnel : resolved | redirected | no_response | other
```

Règles :

- **Ne mettez jamais de nom, de CID ou de contenu de message** : ce journal reste anonyme et agrégé.
- La validation vérifie l'unicité des `id` et la chronologie (`opened` ≤ `first_response` ≤ `closed`).
- Les entrées d'exemple ont un `id` qui commence par `exemple-` ; la page affiche alors un badge EXEMPLE. Remplacez-les par de vraies entrées (sans ce préfixe) pour le faire disparaître.
- Un fichier vide est accepté : la page affiche « Aucune sollicitation enregistrée pour le moment ».

## Vérifier avant d'ouvrir la PR

```bash
npm install
npm run validate   # doit afficher « All content files are valid. »
npm run dev        # pour voir le rendu en local
```

Merci ! Chaque contribution, même deux lignes, aide à faire le lien.
