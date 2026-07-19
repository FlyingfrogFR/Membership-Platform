// Every user-facing string lives here, even though only French ships for now.

export const fr = {
  site: {
    name: 'Membership · vACC France',
    tagline: 'Faire le lien entre le vACC et ses membres.',
    metaDescription:
      'Le Point vACC, le tableau Contribuer et le pôle Membership du vACC France (VATSIM France) : toute l’activité du vACC, rendue visible.',
  },
  a11y: {
    skipToContent: 'Aller au contenu',
    mainNav: 'Navigation principale',
  },
  nav: {
    home: 'Accueil',
    pointVacc: 'Point vACC',
    contribuer: 'Contribuer',
    aPropos: 'À propos',
  },
  footer: {
    disclaimer: 'Plateforme du pôle Membership du vACC France — VATSIM France.',
    vatsimFr: 'vatsim.fr',
    source: 'Code source',
  },
  home: {
    eyebrow: 'VATSIM France · pôle Membership',
    heroTitle: 'Faire le lien entre le vACC et ses membres',
    heroText:
      'L’activité ne manque pas au vACC France : espace aérien, formation, événements, outils… mais elle est éparpillée. Ce site la rend visible, et vous aide à y prendre part — tout est bon à prendre, même deux heures de votre temps.',
    ctaContribuer: 'Donner un coup de main',
    ctaLatest: 'Lire le dernier Point vACC',
    latestTitle: 'Dernier Point vACC',
    latestEmpty: 'Aucune édition publiée pour le moment — la première arrive bientôt.',
    readEdition: 'Lire l’édition complète',
    allEditions: 'Toutes les éditions',
    contactTitle: 'Contacter le Membership',
    contactText:
      'Une question, une idée, un souci ? Le plus simple : un ticket sur le Discord du vACC, catégorie « Membership ». On vous répond vite, et ça reste entre nous si besoin.',
    contactCta: 'Rejoindre le Discord du vACC',
  },
  pointVacc: {
    title: 'Point vACC',
    lede: 'Tous les trimestres, un tour d’horizon de ce que chaque pôle a fait, fait et prépare — pour ne plus avoir besoin de suivre dix canaux Discord pour savoir où va le vACC.',
    empty: 'Aucune édition pour le moment — la première arrive bientôt.',
    publishedOn: 'Publié le',
    readEdition: 'Lire l’édition',
    backToArchive: 'Toutes les éditions',
    notFoundTitle: 'Édition introuvable',
    notFoundText: 'Cette édition n’existe pas (ou pas encore).',
  },
  edition: {
    done: 'Fait',
    inProgress: 'En cours',
    next: 'À venir',
    helpWanted: 'Coup de main recherché',
  },
  discord: {
    copy: 'Copier pour Discord',
    copied: 'Copié !',
    copyChunk: (i: number, n: number) => `Copier le message ${i}/${n}`,
    chunkTitle: (i: number, n: number) => `Message ${i}/${n}`,
    multiInfo: (n: number) =>
      `Discord limite chaque message à 2000 caractères : cette édition est découpée en ${n} messages, à coller l’un après l’autre.`,
    manualFallback: 'La copie automatique a échoué — sélectionnez le texte ci-dessous et copiez-le à la main.',
    partSuffix: (i: number, n: number) => `*(message ${i}/${n})*`,
  },
  contribuer: {
    title: 'Contribuer',
    lede: 'Envie de donner un coup de main ? Voici les postes ouverts et les besoins ponctuels des pôles du vACC. Pas besoin de s’engager pour un an : tout est bon à prendre.',
    tabPostes: 'Postes ouverts',
    tabPonctuels: 'Besoins ponctuels',
    filterDepartment: 'Pôle',
    filterTime: 'Temps estimé',
    filterAll: 'Tous',
    empty: 'Rien ne correspond à ces filtres pour le moment — revenez bientôt, ça bouge vite.',
    resultsCount: (n: number) =>
      n === 0 ? 'Aucun résultat' : n === 1 ? '1 résultat affiché' : `${n} résultats affichés`,
    skills: 'Compétences',
    timeEstimate: 'Temps estimé',
    contact: 'Contact',
    postedOn: 'Publié le',
    status: { open: 'Ouvert', filled: 'Pourvu', closed: 'Clos' } as const,
    type: { poste: 'Poste', ponctuel: 'Ponctuel' } as const,
    proposeTitle: 'Un besoin dans votre pôle ?',
    proposeText:
      'Chefs de pôle : envoyez votre besoin au Head of Membership (ticket ou message Discord), ou proposez-le directement par pull request sur le dépôt — le format est décrit dans le CONTRIBUTING.',
    proposeCta: 'Voir le dépôt',
  },
  aPropos: {
    title: 'À propos du Membership',
    lede: 'Le pôle Membership ne crée pas l’activité du vACC — elle existe déjà, et elle est riche. Son rôle : la rendre visible, la coordonner, et la traduire pour les membres.',
    mandateTitle: 'Le mandat',
    mandateText:
      'Le Head of Membership est nommé pour un mandat d’environ un an. Sa feuille de route tient en quatre piliers, présentés ci-dessous — et ce site est l’outil qui les porte.',
    pillarsTitle: 'Les quatre piliers',
    pillars: [
      {
        title: 'Visibilité',
        text: 'Un Point vACC trimestriel : ce que chaque pôle a fait, fait et prépare, relié à la feuille de route présentée en Town Hall.',
      },
      {
        title: 'Contact',
        text: 'Une porte d’entrée clairement identifiée : un ticket Discord, catégorie « Membership », et une réponse rapide — en toute confidentialité si besoin.',
      },
      {
        title: 'Contribution',
        text: 'Un tableau Contribuer toujours à jour : postes ouverts et besoins ponctuels, pour que chacun trouve où aider, même deux heures.',
      },
      {
        title: 'Coordination',
        text: 'Un point mensuel asynchrone avec les chefs de pôle, collecté en privé, pour garder tout le monde aligné entre deux Points vACC.',
      },
    ],
    contactTitle: 'Le joindre',
    contactText:
      'Un ticket sur le Discord du vACC, catégorie « Membership », reste le canal officiel — pour une question, une idée, un désaccord à désamorcer ou juste dire bonjour.',
    contactCta: 'Rejoindre le Discord du vACC',
  },
  notFound: {
    title: 'Page introuvable',
    text: 'Cette page n’existe pas — le cap est peut-être erroné.',
    backHome: 'Retour à l’accueil',
  },
}
