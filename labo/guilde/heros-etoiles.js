// =============================================================================================== LES HÉROS FAÇON AFK ARENA : ÉCLATS, ÉTOILES, PRESTIGE, ARMURERIE (14/11 nuit, carte blanche)
// Demande de l'utilisateur : « quand on débloque un personnage, il évolue en 1, 2, 3 étoiles, puis prestige 1, 2, 3 », avec des doublons
// (ici : des ÉCLATS du héros, gagnés en jouant avec lui) et de l'ÉQUIPEMENT dans le profil du héros.
// Choix de Claude : la puissance gagnée ne joue QUE contre les monstres (Odyssée, Grande aventure, sans fin, Tour des épreuves) ;
// le Duel de l'Arène reste équitable. L'armurerie est commune à tous les héros ; chacun a ses 3 emplacements.
// Fusion : 3 exemplaires d'un même objet = ★★, 5 = ★★★ (plus fort). Tout reste sur le téléphone.
const ETOILES_CLE = 'guilde-etoiles';
const NIVEAUX_H = ['Recrue', '1 ★', '2 ★', '3 ★', 'Prestige 1', 'Prestige 2', 'Prestige 3'];
const COUT_NIV = [10, 20, 30, 40, 50, 60]; // éclats pour passer du niveau n au niveau n+1 (210 en tout)
const BONUS_NIVH = [null, ['❤', '+6 PV max'], ['🛡', 'Bouclier 2 au début de chaque combat'], ['◆', '+1 PC au début de chaque combat'],
  ['❤', '+10 PV max de plus'], ['🎲', 'une relance gratuite de plus à chaque tour'], ['🂠', 'une carte de plus en main au début de chaque combat']];
// ce que rapporte chaque moment fort au héros joué (appelé par guildeEvt de rang.js)
const ECLATS_EVT = { duel_gagne:2, elite:2, boss:5, escale:1, titan:5, etage:3 };
const ECLATS_QUETE = { jour:3, semaine:10 }, ECLATS_RANG = 5;
// la force des objets selon leur niveau (★, ★★, ★★★)
const EQUIP_VAL = { hache:[2, 3, 4], lame:[10, 15, 20], arc:[5, 8, 11], marteau:[1, 1, 2], cuir:[4, 6, 8], cape:[6, 9, 12], cotte:[7, 10, 13], heaume:[12, 18, 24], trefle:[1, 1, 2], bourse:[12, 18, 24], griffe:[4, 6, 8], anneau:[1, 1, 2] };

function lireEtoiles() { try { return Object.assign({ heros:{}, libres:0, armurerie:{}, equip:{} }, JSON.parse(localStorage.getItem(ETOILES_CLE) || '{}')); } catch (e) { return { heros:{}, libres:0, armurerie:{}, equip:{} }; } }
function ecrireEtoiles(d) { localStorage.setItem(ETOILES_CLE, JSON.stringify(d)); }
const etatHerosE = (d, id) => (d.heros[id] = d.heros[id] || { e:0, n:0 });
const niveauHeros = id => typeof localStorage === 'undefined' ? 0 : (lireEtoiles().heros[id] || { n:0 }).n;
const etoilesTxt = n => n <= 0 ? '' : n <= 3 ? '★'.repeat(n) : `✦P${n - 3}`;
function donneEclats(id, n, silence) {
  if (typeof localStorage === 'undefined' || !n || typeof HEROS === 'undefined' || !HEROS[id] || HEROS[id].monstre) return;
  const d = lireEtoiles(); etatHerosE(d, id).e += n; ecrireEtoiles(d);
  if (!silence && typeof annonceRang === 'function') annonceRang(`✨ +${n} éclat${n > 1 ? 's' : ''} de ${HEROS[id].nom}`);
}
function donneLibres(n) { if (typeof localStorage === 'undefined' || !n) return; const d = lireEtoiles(); d.libres += n; ecrireEtoiles(d); if (typeof annonceRang === 'function') annonceRang(`💠 +${n} éclats de Guilde`); }
// verser des éclats de Guilde sur un héros
function verseLibres(id, n) { const d = lireEtoiles(); n = Math.min(n, d.libres); if (n <= 0) return false; d.libres -= n; etatHerosE(d, id).e += n; ecrireEtoiles(d); return true; }
function peutPromouvoir(id) { const h = lireEtoiles().heros[id] || { e:0, n:0 }; return h.n < 6 && h.e >= COUT_NIV[h.n]; }
function promouvoir(id) { const d = lireEtoiles(), h = etatHerosE(d, id); if (h.n >= 6 || h.e < COUT_NIV[h.n]) return false; h.e -= COUT_NIV[h.n]; h.n++; ecrireEtoiles(d); return true; }
// les bonus d'un héros contre les monstres (cumulés)
function bonusHerosPvE(id) { const n = niveauHeros(id); return { pv:(n >= 1 ? 6 : 0) + (n >= 4 ? 10 : 0), bouclier:n >= 2 ? 2 : 0, pc:n >= 3 ? 1 : 0, relance:n >= 5 ? 1 : 0, main:n >= 6 ? 1 : 0 }; }

// ----------------------------------------------------------------------------------------------- l'armurerie
const niveauEquip = k => { if (typeof localStorage === 'undefined') return 1; const c = lireEtoiles().armurerie[k] || 0; return c >= 5 ? 3 : c >= 3 ? 2 : 1; };
const valEquip = (k, niv) => (EQUIP_VAL[k] || [0, 0, 0])[(niv || niveauEquip(k)) - 1];
// la phrase d'un objet à son niveau (les chiffres changent avec les étoiles)
function descEquip(k, niv) {
  const v = valEquip(k, niv);
  return { hache:`+${v} PC au premier tour de chaque combat.`, lame:`L’ennemi commence chaque combat avec ${v} % de vie en moins.`, arc:`${v} dégâts à l’ennemi avant le premier tour.`,
    marteau:`${v} carte${v > 1 ? 's' : ''} de plus en main au début de chaque combat.`, cuir:`Bouclier ${v} au début de chaque combat.`, cape:`+${v} huile en arrivant sur chaque île.`,
    cotte:`Bouclier ${v} au début de chaque combat.`, heaume:`+${v} PV max tant que tu le portes.`, trefle:`${v} relance${v > 1 ? 's' : ''} gratuite${v > 1 ? 's' : ''} de plus à chaque tour.`,
    bourse:`+${v} or à chaque combat gagné.`, griffe:`Rend ${v} PV après chaque combat gagné.`, anneau:`+${v} PC au début de chaque combat.` }[k] || '';
}
function armurerieAjoute(k, silence) {
  if (typeof localStorage === 'undefined' || !EQUIP[k]) return; const d = lireEtoiles(), avant = niveauEquip(k); d.armurerie[k] = (d.armurerie[k] || 0) + 1; ecrireEtoiles(d);
  const apres = niveauEquip(k); if (!silence && typeof annonceRang === 'function') annonceRang(apres > avant ? `⚒ ${EQUIP[k][2]} fusionne : ${'★'.repeat(apres)} !` : `🎒 ${EQUIP[k][2]} rejoint ton armurerie`, apres > avant);
}
const equipHeros = id => Object.assign({ arme:null, armure:null, talisman:null }, lireEtoiles().equip[id] || {});
function equipeHeros(id, pl, k) { const d = lireEtoiles(); if (k && !d.armurerie[k]) return false; d.equip[id] = Object.assign({ arme:null, armure:null, talisman:null }, d.equip[id] || {}); d.equip[id][pl] = k || null; ecrireEtoiles(d); return true; }
// prochain exemplaire pour la fusion : « 2 / 3 »
function fusionTxt(k) { const c = lireEtoiles().armurerie[k] || 0; return c >= 5 ? '★★★ (au maximum)' : c >= 3 ? `★★ · ${c} / 5 pour ★★★` : `★ · ${c} / 3 pour ★★`; }
