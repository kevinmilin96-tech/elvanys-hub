// Aureus — les types de fiche (15/10/2026, « comme le + de Proton Pass »). Chaque champ : k = clé, l = libellé,
// secret = masqué avec 👁, gen = bouton 🎲, liste = plusieurs valeurs (une par ligne), long = zone de texte,
// totp = clé 2FA (QR ou clé), mode = clavier du téléphone, choix = liste fermée.
// Tous les types ont en plus : note, champs personnalisés (perso), coffre, dossier, étiquettes, favori.
const ID = { k: 'identifiant', l: 'Identifiant ou e-mail' };
const MDP = { k: 'mdp', l: 'Mot de passe', secret: true, gen: true };
const TOTP = { k: 'totp', l: 'Code de double authentification (2FA)', totp: true };

export const TYPES = {
  identifiant: { ico: '🔑', nom: 'Identifiant', aide: 'sites, mot de passe, 2FA', champs: [ID, MDP, { k: 'sites', l: 'Sites', liste: true }, TOTP] },
  carte: { ico: '💳', nom: 'Carte bancaire', aide: 'avec son code PIN', champs: [
    { k: 'titulaire', l: 'Titulaire' }, { k: 'numero', l: 'Numéro de carte', secret: true, mode: 'numeric' },
    { k: 'expiration', l: 'Expiration (MM/AA)' }, { k: 'cvv', l: 'Cryptogramme', secret: true, mode: 'numeric' },
    { k: 'pin', l: 'Code PIN', secret: true, mode: 'numeric' }] },
  note: { ico: '📝', nom: 'Note', aide: 'texte protégé', champs: [{ k: 'texte', l: 'Texte', long: true }] },
  identite: { ico: '🪪', nom: 'Identité', aide: 'adresse, papiers…', champs: [
    { k: 'prenom', l: 'Prénom' }, { k: 'nom', l: 'Nom' }, { k: 'naissance', l: 'Date de naissance' },
    { k: 'telephone', l: 'Téléphone', mode: 'tel' }, { k: 'email', l: 'E-mail', mode: 'email' }, { k: 'adresse', l: 'Adresse', long: true },
    { k: 'secu', l: 'N° de sécurité sociale', secret: true }, { k: 'passeport', l: 'N° de passeport', secret: true },
    { k: 'permis', l: 'N° de permis de conduire', secret: true }] },
  code: { ico: '🔢', nom: 'Code', aide: 'digicode, alarme…', champs: [{ k: 'code', l: 'Code', secret: true }, { k: 'lieu', l: 'Où (porte, alarme, cadenas…)' }] },
  wifi: { ico: '📶', nom: 'Wi-Fi', aide: 'réseau et mot de passe', champs: [
    { k: 'ssid', l: 'Nom du réseau' }, { ...MDP }, { k: 'securite', l: 'Sécurité', choix: ['WPA', 'WEP', 'Aucune'] }] },
  logiciel: { ico: '🏢', nom: 'Accès logiciel', aide: 'adresse + support', champs: [
    { k: 'sites', l: 'Adresse du logiciel', liste: true }, ID, MDP, TOTP, { k: 'support', l: 'Support (téléphone, e-mail)' }] },
  motdepasse: { ico: '🎲', nom: 'Mot de passe', aide: 'généré ou à retenir', champs: [MDP] },
  ssh: { ico: '🖥️', nom: 'Clé SSH', aide: 'serveurs', champs: [
    { k: 'hote', l: 'Serveur' }, { k: 'utilisateur', l: 'Utilisateur' }, { k: 'cle_privee', l: 'Clé privée', long: true, secret: true },
    { k: 'cle_publique', l: 'Clé publique', long: true }, { k: 'phrase', l: 'Phrase de la clé', secret: true }] },
  perso: { ico: '🧩', nom: 'Personnalisé', aide: 'vos propres champs', champs: [] },
};

export const ORDRE_TYPES = ['identifiant', 'carte', 'note', 'identite', 'code', 'wifi', 'logiciel', 'motdepasse', 'ssh', 'perso'];

export const COULEURS_COFFRE = ['#2a7fc1', '#7c5cff', '#2fb37a', '#c9962e', '#e5262c', '#f7862a', '#0e9fb5', '#d6336c', '#1b2333'];
export const ICONES_COFFRE = ['🏠', '🛒', '🧩', '💼', '🏦', '🎓', '🛠️', '🚗', '❤️', '✈️', '🎮', '📦', '🏥', '⚖️', '🌿', '⭐'];
