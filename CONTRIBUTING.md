# Contribuer au contenu

**Le plus simple : la page `/proposer` du site.** Ses formulaires génèrent le contenu exactement au format attendu, avec un lien GitHub pré-rempli. Ce document décrit le format sous-jacent, pour qui préfère éditer les fichiers à la main. Et si vous préférez, envoyez simplement votre texte au Head of Membership (ticket Discord catégorie « Membership ») — il s'occupe du reste.

## Le principe

- Tout le contenu vit dans `/content`. Publier = fusionner sur `main`.
- Chaque PR est validée automatiquement (`npm run validate`) : schéma du frontmatter et du YAML, unicité des slugs et des ids. Une PR au mauvais format est bloquée avant publication.
- Le Head of Membership relit chaque proposition et peut ajuster le ton pour garder une voix cohérente.

## Envoyer la rubrique de son équipe (Point vACC)

C'est la voie normale pour un référent : chaque équipe envoie **sa** rubrique, sans attendre les autres — le Head of Membership assemble ensuite l'édition complète depuis l'Espace Membership. Le formulaire `/proposer` génère ce fichier tout seul ; à la main, créez `content/point-vacc/drafts/<slug>/<équipe>.yaml` :

- `<slug>` est l'édition visée (ex. `2026-q3`) ;
- le nom du fichier est le nom de l'équipe en minuscules-tirets (ex. `nav-team.yaml`, `training-department.yaml`) — la validation le vérifie ;
- le fichier contient **une seule rubrique**, au même format qu'une section d'édition :

```yaml
name: "Nav Team"
notes: >-            # optionnel : commentaire libre en markdown
  Le mot de l'équipe sur le trimestre.
done:
  - "Chose terminée ce trimestre"
in_progress:
  - "Chose en cours"
next:
  - "Chose prévue"
help_wanted:         # optionnel
  - "Coup de main recherché"
images:              # optionnel — mêmes règles que pour une édition
  - src: "/images/point-vacc/2026-q3/capture.png"
    caption: "Ce que montre la capture"
```

Les images se téléversent dans `public/images/point-vacc/<slug>/` **avant** de fusionner le brouillon (la validation échoue si une image référencée manque). Après publication de l'édition, les brouillons du trimestre se suppriment — l'Espace Membership le rappelle.

## Ajouter ou modifier une édition du Point vACC

L'édition complète est normalement **assemblée par le Head of Membership** à partir des rubriques reçues (outil « Assembler le Point vACC » de l'Espace Membership). Pour l'écrire ou la retoucher à la main : créez `content/point-vacc/<slug>.md` — le nom du fichier **doit** être égal au slug (minuscules, chiffres, tirets). Exemple complet :

```markdown
---
title: "Point vACC — T3 2026"
slug: "2026-q3"
published: 2026-09-30
intro: >-
  Texte d'introduction du Head of Membership.
departments:
  - name: "Nav Team"
    done:
      - "Chose terminée ce trimestre"
    in_progress:
      - "Chose en cours"
    next:
      - "Chose prévue"
    help_wanted:            # optionnel
      - "Coup de main recherché"
  - name: "Event Team"
    done:
      - "…"
---

Texte de conclusion optionnel, en markdown, affiché après les sections des équipes.
```

Règles :

- `name` doit être une équipe de la liste `src/config/departments.ts` (`Nav Team`, `Doc Team`, `Event Team`, `Digital Team`, `Training Department`, `vACC Directors`, `Membership`), alignée sur le document officiel « Fonctionnement des équipes » (catégorie Membership ajoutée en complément). L'ordre d'affichage sur le site suit cette liste, pas l'ordre du fichier.
- `done`, `in_progress`, `next`, `help_wanted` sont tous optionnels — n'indiquez que ce qui existe. Une équipe sans aucun item n'apparaît ni sur le site ni dans l'export Discord.
- `notes` (optionnel) : un **commentaire libre** en markdown pour l'équipe qui veut raconter un peu plus que des puces — affiché en tête de sa rubrique, repris dans l'export Discord :

  ```yaml
  - name: "Nav Team"
    notes: >-
      Quelques phrases libres sur le trimestre de l'équipe,
      en markdown si besoin.
    done:
      - "…"
  ```
- Chaque équipe peut joindre des **captures d'écran** :

  ```yaml
  - name: "Nav Team"
    done:
      - "…"
    images:
      - src: "/images/point-vacc/2026-q3/secteurs-lfmm.png"
        caption: "Nouveau découpage secteurs"   # optionnel, sert aussi de texte alternatif
  ```

  Les fichiers se téléversent dans `public/images/point-vacc/<slug>/` (glisser-déposer sur GitHub — le formulaire `/proposer` fournit le lien direct). La validation échoue si une image référencée manque : téléversez les images **avant** de créer le fichier de l'édition. Les URLs `https://` sont aussi acceptées.
- Phrases courtes, orientées résultat : elles sont affichées telles quelles en puces, sur le site comme sur Discord.

## Ajouter un besoin au tableau Contribuer

Ajoutez un item au tableau dans `content/contribuer/needs.yaml` :

```yaml
- id: "nav-relecture-lfpg"      # unique, en kebab-case
  type: "ponctuel"              # ponctuel | poste
  title: "Relecture documentation LFPG"
  department: "Nav Team"        # une équipe de src/config/departments.ts
  description: "Relire et commenter la nouvelle doc avant publication."
  skills: ["Connaissances ATC"] # optionnel
  time_estimate: "2–3 h"        # optionnel mais recommandé
  contact: "Ticket Membership ou @pseudo sur Discord"
  status: "open"                # open | filled | closed
  posted: 2026-08-01
```

Quand un besoin est pourvu, passez son `status` à `"filled"` (ou `"closed"` s'il est abandonné) plutôt que de le supprimer, et ajoutez la **date de pourvoi** — c'est elle qui alimente le KPI « délai de pourvoi » :

```yaml
  status: "filled"
  filled_at: 2026-09-15
  filled_via: "ticket"   # optionnel : ticket | discord | direct — jamais de nom
```

Un fichier vide (ou ne contenant que des commentaires) est accepté : le site affiche alors simplement un tableau vide.

## Journal des sollicitations Membership (statistiques)

En attendant un lien automatique avec Discord, le suivi des sollicitations se fait **à la main** dans `content/membership/tickets-log.yaml`. Ce fichier ne contient **aucune donnée personnelle** : uniquement l'équipe concernée et des horodatages. Il alimente le bloc « Statistiques du Membership » de la page Point vACC.

```yaml
- id: "2026-06-01-nav"          # unique, en kebab-case
  department: "Nav Team"        # une équipe de src/config/departments.ts
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
