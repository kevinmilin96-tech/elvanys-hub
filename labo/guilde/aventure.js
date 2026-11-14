// =============================================================================================== LA GRANDE AVENTURE ET L'ÉQUIPEMENT (14/11 nuit)
// Plan « Pourquoi revenir », partie 5, validé par l'utilisateur ; choix du 14/11 au soir : on garde les 6 héros, et dans la Grande aventure
// le héros trouve de l'ÉQUIPEMENT (arme, armure, talisman) gardé d'île en île. Les 3 îles se suivent (Terres brûlées → Givre → Abîme).
// Ce qui se garde : deck, niveau (+8 PV max et un bonus par île), équipement, faces forgées, sacoche, une relique. L'or repart à 30.
// Si le héros tombe : il recommence l'île en cours avec ce qu'il avait en y arrivant.
// Chargé par odyssee.html (la campagne) et duel.html (les effets en combat). Le Duel de l'Arène n'en voit jamais rien.

// [emplacement, emblème, nom, effet, rang de la Guilde qu'il faut pour le trouver (0 = toujours)]
const EQUIP = {
  hache:   ['arme', '🪓', 'Hache du bûcheron', '+2 PC au premier tour de chaque combat.', 0],
  lame:    ['arme', '🗡', 'Lame affûtée', 'L’ennemi commence chaque combat avec 10 % de vie en moins.', 0],
  arc:     ['arme', '🏹', 'Arc long', '5 dégâts à l’ennemi avant le premier tour.', 0],
  marteau: ['arme', '🔨', 'Marteau des runes', 'Chaque combat commence avec une carte de plus en main.', 0],
  cuir:    ['armure', '🦺', 'Armure de cuir', 'Bouclier 4 au début de chaque combat.', 0],
  cape:    ['armure', '🧣', 'Cape de voyage', '+6 huile en arrivant sur chaque île.', 0],
  cotte:   ['armure', '🥋', 'Cotte de mailles', 'Bouclier 7 au début de chaque combat.', 11],
  heaume:  ['armure', '⛑', 'Heaume du gardien', '+12 PV max tant que tu le portes.', 18],
  trefle:  ['talisman', '🍀', 'Trèfle à quatre feuilles', 'Une relance gratuite de plus à chaque tour.', 0],
  bourse:  ['talisman', '👛', 'Bourse sans fond', '+12 or à chaque combat gagné.', 0],
  griffe:  ['talisman', '🐾', 'Griffe de Moustache', 'Rend 4 PV après chaque combat gagné.', 0],
  anneau:  ['talisman', '💍', 'Anneau des runes', '+1 PC au début de chaque combat.', 24],
};
const EMPLACEMENTS = { arme:'⚔ Arme', armure:'🛡 Armure', talisman:'✨ Talisman' };
const SAC_EQUIP = 3; // objets portés en plus, dans le sac
// les bonus de niveau : à chaque île finie, +8 PV max et un bonus à choisir parmi deux
const BONUS_NIV = {
  relance:['🎲', 'Main sûre', 'Une relance gratuite de plus à chaque tour.'],
  pc:['◆', 'Esprit vif', '+1 PC au début de chaque combat.'],
  main:['🂠', 'Mémoire', 'Une carte de plus en main au début de chaque combat.'],
  pv:['❤', 'Robuste', '+10 PV max de plus.'],
  huile:['🪔', 'Prévoyant', '+5 huile en arrivant sur chaque île.'],
  or:['💰', 'Prospère', '+30 or en arrivant sur chaque île.'],
};
const PV_NIVEAU = 8, ACTES_AV = ['brulees', 'givre', 'abime'];
const equipDispo = () => Object.keys(EQUIP).filter(k => !EQUIP[k][4] || (typeof lireRang === 'function' && lireRang().info.rang >= EQUIP[k][4]));
const nbBonus = (r, k) => (r.aventure ? r.aventure.bonus.filter(b => b === k).length : 0);
// 14/11 nuit : l'équipement porté = celui de l'aventure, sinon celui du héros (île seule, sans fin) ; sa force dépend de ses étoiles (heros-etoiles.js)
const equipRun = r => (r && r.aventure ? r.aventure.equip : r && r.equipH) || {};
const porte = (r, k) => Object.values(equipRun(r)).includes(k);
const V = k => typeof valEquip === 'function' ? valEquip(k) : { hache:2, lame:10, arc:5, marteau:1, cuir:4, cape:6, cotte:7, heaume:12, trefle:1, bourse:12, griffe:4, anneau:1 }[k];

// ----------------------------------------------------------------------------------------------- la campagne
// l'état du héros qui passe d'une île à l'autre
function etatHeros(r) { return JSON.parse(JSON.stringify({ deck:r.deck, pvMax:r.pvMax, reliques:r.reliques, sacoche:r.sacoche, benes:r.benes, males:r.males, forge:r.forge || null, aventure:{ ...r.aventure, retour:null } })); }
// une île de l'aventure, avec l'état du héros (rien = début de l'aventure)
function ileAventure(heros, acte, etat) {
  const r = nouvelleOdyssee(heros, null, acte, 0, true); if (!r) return null;
  if (etat) { Object.assign(r, { deck:etat.deck, pvMax:etat.pvMax, pv:etat.pvMax, reliques:etat.reliques, sacoche:etat.sacoche, benes:etat.benes, males:etat.males, forge:etat.forge }); r.aventure = etat.aventure; }
  else { r.aventure = { chapitre:1, niveau:1, equip:{ arme:null, armure:null, talisman:null }, sac:[], bonus:[], ameliore:[], essais:0, debut:Date.now() };
    // 14/11 nuit : l'aventure part avec l'équipement du héros (son profil, armurerie) ; heros-etoiles.js
    if (typeof equipHeros === 'function' && typeof localStorage !== 'undefined') { const eh = equipHeros(heros); r.aventure.equip = { ...eh }; if (eh.armure === 'heaume') r.pvMax += valEquip('heaume'); const b = bonusHerosPvE(heros); r.pvMax += b.pv; r.pv = r.pvMax; } }
  r.aventure.chapitre = ACTES_AV.indexOf(acte) + 1;
  // ce qui se gagne en arrivant sur l'île
  const A = r.aventure; let plus = [];
  if (porte(r, 'cape')) { const v = V('cape'); r.vivres += v; plus.push(`+${v} huile (Cape de voyage)`); }
  if (nbBonus(r, 'huile')) { r.vivres += 5 * nbBonus(r, 'huile'); plus.push(`+${5 * nbBonus(r, 'huile')} huile`); }
  if (nbBonus(r, 'or')) { r.or += 30 * nbBonus(r, 'or'); plus.push(`+${30 * nbBonus(r, 'or')} or`); }
  r.journal.unshift(`🗺 Grande aventure · chapitre ${A.chapitre} sur 3 · ${HEROS[heros].nom} niveau ${A.niveau}${plus.length ? ' · ' + plus.join(', ') : ''}.`);
  A.retour = etatHeros(r); // si le héros tombe, il repart d'ici
  return r;
}
const nouvelleAventure = heros => ileAventure(heros, 'brulees', null);
// le héros est tombé : on recommence l'île en cours, avec ce qu'on avait en y arrivant
function recommenceIle(r) { const et = r.aventure.retour; et.aventure.essais = (r.aventure.essais || 0) + 1; return ileAventure(r.heros, r.acte, et); }
// l'île est finie : niveau +1 (+8 PV max), et on passe à la suivante (après les choix du camp)
function niveauSuivant(r, bonus) { const A = r.aventure; A.niveau++; r.pvMax += PV_NIVEAU; if (bonus) { A.bonus.push(bonus); if (bonus === 'pv') r.pvMax += 10; } r.pv = r.pvMax; }
function ileSuivante(r) { const i = ACTES_AV.indexOf(r.acte); if (i >= 2) return null; return ileAventure(r.heros, ACTES_AV[i + 1], etatHeros(r)); }
// l'équipement : mettre un objet (l'ancien va au sac), ranger, jeter
function equipe(r, k) {
  const A = r.aventure, e = EQUIP[k]; if (!e) return false; const pl = e[0], ancien = A.equip[pl];
  A.sac = A.sac.filter(x => x !== k);
  if (ancien) { if (ancien === 'heaume') { r.pvMax -= V('heaume'); r.pv = Math.min(r.pv, r.pvMax); } A.sac.push(ancien); }
  A.equip[pl] = k; if (k === 'heaume') { r.pvMax += V('heaume'); r.pv += V('heaume'); }
  r.journal.push(`${e[1]} ${e[2]} équipé${ancien ? ` (${EQUIP[ancien][2]} au sac)` : ''}.`);
  while (A.sac.length > SAC_EQUIP) A.sac.shift();
  return true;
}
function auSac(r, k) { const A = r.aventure; if (A.sac.length >= SAC_EQUIP) return false; A.sac.push(k); r.journal.push(`🎒 ${EQUIP[k][2]} rangé dans le sac.`); return true; }
function jette(r, k) { r.aventure.sac = r.aventure.sac.filter(x => x !== k); }
// un équipement trouvé : parmi ceux qu'on n'a pas encore
function equipTrouve(r, n) {
  const A = r.aventure, deja = [...Object.values(A.equip), ...A.sac], l = equipDispo().filter(k => !deja.includes(k));
  const R = hasard(r); return brasse(R, l).slice(0, n || 1);
}
// après un combat gagné : effets de l'équipement (appelé par recompenseCombat)
function equipVictoire(r, out) {
  if (porte(r, 'bourse')) { r.or += V('bourse'); out.or += V('bourse'); }
  if (porte(r, 'griffe')) { const a = r.pv; r.pv = Math.min(r.pvMax, r.pv + V('griffe')); if (r.pv > a) r.journal.push(`🐾 Griffe de Moustache : +${r.pv - a} PV.`); }
  // une élite peut laisser tomber un équipement (aventure : une chance sur deux ; ailleurs : une sur trois, rangée dans l'armurerie)
  if (out.type === 'elite' && Math.random() < (r.aventure ? .5 : .34)) {
    if (r.aventure) { const l = equipTrouve(r, 1); if (l.length) { out.equip = l[0]; if (typeof armurerieAjoute === 'function' && !r.simu) armurerieAjoute(l[0], true); } }
    else { const k = brasse(hasard(r), equipDispo())[0]; if (k) { out.equipArm = k; if (typeof armurerieAjoute === 'function') armurerieAjoute(k, true); } } }
}
// en combat : appelé par duel.html juste après la préparation de l'ennemi
function equipeCombat(J, O, run, log) {
  if (!run) return;
  const A = run.aventure || { bonus:[], ameliore:[] }, eq = k => porte(run, k), L = [];
  J.ameliorees = [...(A.ameliore || [])];
  // les étoiles du héros (heros-etoiles.js) : seulement contre les monstres
  if (typeof bonusHerosPvE === 'function' && typeof localStorage !== 'undefined' && !run.simu) { const b = bonusHerosPvE(run.heros);
    if (b.bouclier) { J.bouclier = (J.bouclier || 0) + b.bouclier; L.push(`⭐ Bouclier ${b.bouclier}`); } if (b.pc) { J.pc = Math.min(6, J.pc + b.pc); L.push(`⭐ +${b.pc} PC`); }
    if (b.relance) { J.relanceRang = (J.relanceRang || 0) + b.relance; L.push('⭐ +1 relance par tour'); } if (b.main && typeof pioche === 'function') { pioche(J, b.main); L.push('⭐ +1 carte'); } }
  if (eq('hache')) { J.pc = Math.min(6, J.pc + V('hache')); L.push(`🪓 Hache : +${V('hache')} PC`); }
  if (eq('anneau')) { J.pc = Math.min(6, J.pc + V('anneau')); L.push(`💍 Anneau des runes : +${V('anneau')} PC`); }
  if (nbBonus(run, 'pc')) { J.pc = Math.min(6, J.pc + nbBonus(run, 'pc')); L.push(`◆ Esprit vif : +${nbBonus(run, 'pc')} PC`); }
  if (eq('cuir')) { J.bouclier = (J.bouclier || 0) + V('cuir'); L.push(`🦺 Armure de cuir : Bouclier ${V('cuir')}`); }
  if (eq('cotte')) { J.bouclier = (J.bouclier || 0) + V('cotte'); L.push(`🥋 Cotte de mailles : Bouclier ${V('cotte')}`); }
  const relances = (eq('trefle') ? V('trefle') : 0) + nbBonus(run, 'relance'); if (relances) { J.relanceRang = (J.relanceRang || 0) + relances; L.push(`🎲 +${relances} relance${relances > 1 ? 's' : ''} à chaque tour`); }
  const mains = (eq('marteau') ? V('marteau') : 0) + nbBonus(run, 'main'); if (mains && typeof pioche === 'function') { pioche(J, mains); L.push(`🂠 +${mains} carte${mains > 1 ? 's' : ''} en main`); }
  if (eq('lame')) { O.pvMax = Math.round(O.pvMax * (1 - V('lame') / 100)); O.pv = Math.min(O.pv, O.pvMax); L.push(`🗡 Lame affûtée : l’ennemi −${V('lame')} % de vie`); }
  if (eq('arc')) { O.pv = Math.max(1, O.pv - V('arc')); L.push(`🏹 Arc long : ${V('arc')} dégâts`); }
  if (L.length && log) log(`🎒 Ton équipement et tes étoiles · ${L.join(' · ')}.`);
}
// au camp : améliorer une carte (elle coûte 1 PC de moins pour toute l'aventure ; une par camp)
function ameliore(r, k) { const A = r.aventure; A.ameliore = A.ameliore || []; if (!CARTES[k] || CARTES[k].c < 1 || A.ameliore.includes(k)) return false; A.ameliore.push(k); r.journal.push(`⭐ ${CARTES[k].n} améliorée : 1 PC de moins.`); return true; }

// 14/11 nuit : les icônes peintes par Gemini (ui/equip/eq-<clé>.webp)
const eqImg = (k, px = 34) => `<img src="ui/equip/eq-${k}.webp?v=1" alt="" style="width:${px}px;height:${px}px;object-fit:contain;vertical-align:middle">`;
