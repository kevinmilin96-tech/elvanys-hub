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
        description: 'Main courante, rondes, incidents et maintenance du site.',
        url: 'https://blaye-vigilys.elvanys.fr',
        icone: 'vigilys',
        couleur: 'vigilys',
        pour: ['agent', 'direction'],
        public: 'Sécurité, maintenance et direction',
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
  description: 'Bien manger, cuisiner malin le dimanche, avancer à deux : poids, mensurations, recettes de saison.',
  url: 'https://demo-hub.elvanys.fr/hopla/index.html',
  icone: 'hopla',
  couleur: 'hopla',
  pour: [],
  public: 'Personnel',
});

window.HUB_ENTREPRISE_PAR_DEFAUT = 'blaye';
