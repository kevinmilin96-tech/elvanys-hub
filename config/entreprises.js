// Hub Elvanys — une fiche par entreprise : identité visuelle, profils et applications proposées.
// L'entreprise affichée est choisie par l'adresse (blaye.elvanys.fr → « blaye ») ou par ?e=blaye.
// Les profils servent seulement à trier les tuiles : chaque application garde sa propre connexion.
// « court » (facultatif) : nom abrégé du profil pour le bouton en haut de page.

window.HUB_ENTREPRISES = {
  blaye: {
    nom: 'E.Leclerc Blaye',
    societe: 'Blaye Distribution',
    accueil: 'L’espace numérique de votre magasin : toutes vos applications au même endroit.',
    logo: {
      clair: 'assets/entreprises/blaye/blaye-bleu.png',
      sombre: 'assets/entreprises/blaye/blaye-or.png',
    },
    pastille: 'assets/entreprises/blaye/leclerc-pastille.png',
    couleurs: {
      clair: { principale: '#0e70b5', accent: '#e8891c' },
      sombre: { principale: '#4ea3e6', accent: '#f4a245' },
    },
    contact: 'Une question ? Adressez-vous à l’accueil du magasin ou à votre responsable.',
    contactApi: '/api/hub/contact', // contact réglé dans Vigilys (Paramètres > Hub du magasin)
    profils: [
      { id: 'collaborateur', nom: 'Collaborateur', detail: 'Salarié du magasin' },
      { id: 'agent', nom: 'Agent de sécurité / Agent de maintenance', court: 'Agent', detail: 'Sécurité et maintenance du site' },
      { id: 'direction', nom: 'Direction', detail: 'Direction et encadrement' },
    ],
    applications: [
      {
        id: 'boost',
        nom: 'Boost',
        description: 'Questionnaires anonymes, quiz et défis d’équipe.',
        url: 'https://demo-boost.elvanys.fr',
        icone: 'boost',
        couleur: 'boost',
        pour: ['collaborateur', 'direction'],
        public: 'Tous les collaborateurs',
      },
      {
        id: 'vigilys',
        nom: 'Vigilys',
        description: 'Main courante, rondes, incidents et maintenance du site.',
        url: 'https://demo-securlog.elvanys.fr',
        icone: 'vigilys',
        couleur: 'principale',
        pour: ['agent', 'direction'],
        public: 'Sécurité, maintenance et direction',
      },
    ],
  },
};

window.HUB_ENTREPRISE_PAR_DEFAUT = 'blaye';
