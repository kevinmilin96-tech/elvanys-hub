// Hub Elvanys — une fiche par entreprise : identité visuelle, profils et applications proposées.
// L'entreprise affichée est choisie par l'adresse (blaye-hub.elvanys.fr → « blaye ») ou par ?e=blaye.
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
    catalogue: '', // Catalogue des promotions (03/11) : site à part (boîte à outils) ; pas encore d'adresse pour Blaye → carte cachée
    profils: [
      { id: 'collaborateur', nom: 'Collaborateur', detail: 'Membre de l’équipe du magasin' },
      { id: 'agent', nom: 'Agent de sécurité / Agent de maintenance', court: 'Agent', detail: 'Sécurité et maintenance du site' },
      { id: 'direction', nom: 'Direction', detail: 'Direction et encadrement' },
    ],
    applications: [
      {
        id: 'boost',
        nom: 'Boost',
        description: 'Questionnaires anonymes, quiz et défis d’équipe.',
        url: 'https://blaye-boost.elvanys.fr',
        icone: 'boost',
        couleur: 'boost',
        sso: true, // Boost lit le passe du hub (prénom affiché, pas de seconde connexion)
        pour: ['collaborateur', 'direction'],
        public: 'Tous les collaborateurs',
      },
      {
        id: 'vigilys',
        nom: 'Vigilys',
        description: 'Main courante, consignes, clés, rondes, incidents et planning du poste de sécurité.',
        url: 'https://blaye-vigilys.elvanys.fr',
        icone: 'vigilys',
        couleur: 'vigilys',
        sso: true, // passe du Hub : l'appareil est rattaché au compte qui l'ouvre ; appli décochée = accès fermé (31/10)
        pour: ['agent', 'direction'],
        public: 'Sécurité et direction',
      },
      {
        id: 'maintys',
        nom: 'Maintys',
        description: 'Maintenance du site : parc, préventif, vérifications, interventions, contrats, stock et chantiers.',
        url: 'https://blaye-vigilys.elvanys.fr/maintys.html', // même site et même base que Vigilys (31/10) ; adresse propre plus tard
        icone: 'maintys',
        couleur: 'maintys',
        sso: true, // passe du Hub : l'appareil est rattaché au compte qui l'ouvre ; appli décochée = accès fermé (31/10)
        pour: [], // jamais cochée d'office : l'administrateur coche les comptes du service technique et de la direction
        public: 'Maintenance et administratif',
      },
      {
        id: 'registrys',
        nom: 'Registrys',
        description: 'Registre de sécurité : vérifications, observations, prestataires et plans.',
        url: 'https://blaye-vigilys.elvanys.fr/registrys.html', // page du site de Vigilys (14/10) ; adresse propre plus tard
        icone: 'registrys',
        couleur: 'registrys',
        pour: [], // jamais cochée d'office : l'administrateur choisit chaque compte (demande de l'utilisateur, 14/10)
        public: 'Incendie, maintenance et direction',
      },
      {
        id: 'aureus',
        nom: 'Aureus',
        description: 'Coffre-fort de mots de passe chiffré : coffres par entreprise, codes 2FA, cartes et notes.',
        url: 'https://blaye-hub.elvanys.fr/aureus/index.html', // page du hub (15/10, ébauche ; « /aureus/ » seul renvoie l'accueil du hub) ; adresse propre plus tard
        icone: 'aureus',
        couleur: 'aureus',
        pour: [], // jamais cochée d'office : l'administrateur choisit chaque compte
        public: 'Sur demande',
      },
    ],
  },
};

// Démo : même fiche que Blaye, avec les adresses de démonstration.
window.HUB_ENTREPRISES.demo = Object.assign({}, window.HUB_ENTREPRISES.blaye, {
  applications: window.HUB_ENTREPRISES.blaye.applications.map(function (a) {
    return Object.assign({}, a, { url: a.url.replace('://blaye-', '://demo-') });
  }),
});

// Hop-là (15/10) : appli personnelle de l'administrateur, sur la DÉMO seulement (jamais dans la fiche de Blaye).
// Code : dépôt Hop-la, construit dans le dossier hopla/ du hub. Jamais cochée d'office.
window.HUB_ENTREPRISES.demo.applications.push({
  id: 'hopla',
  nom: 'Hop-là',
  description: 'Bien manger et cuisiner malin, à deux : poids, mesures et recettes de saison.',
  url: 'https://demo-hub.elvanys.fr/hopla/index.html',
  icone: 'hopla',
  couleur: 'hopla',
  pour: [],
  public: 'Personnel',
});

// Agorys (06/11) : le réseau social du magasin, page du hub comme Hop-là, sur la DÉMO seulement pour l'instant
// (jamais dans la fiche de Blaye tant que la direction ne l'a pas décidé). Jamais cochée d'office.
// Code : dépôt elvanys-serveur (src/agorys, vite.agorys.config.js), construit dans le dossier agorys/ du hub.
window.HUB_ENTREPRISES.demo.applications.push({
  id: 'agorys',
  nom: 'Agorys',
  description: 'Le fil du magasin : l’officiel d’abord, puis la vie du magasin, l’agenda et les sondages.',
  url: 'https://demo-hub.elvanys.fr/agorys/index.html',
  icone: 'agorys',
  couleur: 'agorys',
  pour: [],
  public: 'Tout le magasin',
});

// Pointys (06/11) : le pointage des intervenants extérieurs (à la place de Sharly), page du hub comme Hop-là, sur la
// DÉMO seulement pour l'instant (jamais dans la fiche de Blaye sans accord). Jamais cochée d'office : l'administrateur
// coche « Pointys » sur les comptes de l'accueil, de la réception, de la sécurité… La borne et les QR des entrées
// (pointys/borne.html?b=…) et l'espace privé des intervenants (pointys/moi.html) sont publics, sans compte.
// Code : dépôt elvanys-serveur (src/pointys, vite.pointys.config.js), construit dans le dossier pointys/ du hub.
window.HUB_ENTREPRISES.demo.applications.push({
  id: 'pointys',
  nom: 'Pointys',
  description: 'L’accueil des intervenants extérieurs : qui est dans le magasin, visites, messages, accès.',
  url: 'https://demo-hub.elvanys.fr/pointys/index.html',
  icone: 'pointys',
  couleur: 'pointys',
  pour: [],
  public: 'Accueil, réception, sécurité',
});

// La Guilde des Runes (09/11) : jeu PERSONNEL de l'administrateur (cartes et dés), sur la DÉMO seulement, comme Hop-là.
// Code : essais/dice-arena/ du hub (prototype du Duel). Jamais cochée d'office : cocher « La Guilde des Runes » sur son compte.
window.HUB_ENTREPRISES.demo.applications.push({
  id: 'guilde',
  nom: 'La Guilde des Runes',
  description: 'Mon jeu de cartes et de dés : le Duel contre l’ordinateur, six héros, des runes et de la magie.',
  url: 'https://demo-hub.elvanys.fr/essais/dice-arena/menu.html',
  icone: 'guilde',
  couleur: 'guilde',
  pour: [],
  public: 'Personnel',
});

// Catalogue des promotions (03/11) : son propre site, servi par la même base que la démo.
window.HUB_ENTREPRISES.demo.catalogue = 'https://demo-catalogue.elvanys.fr';

window.HUB_ENTREPRISE_PAR_DEFAUT = 'blaye';
