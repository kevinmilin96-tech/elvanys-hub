// =============================================================================================== LA CRYPTE AUX SCEAUX (15/11, moteur)
// Un SOLITAIRE DE DÉS. Inspirations (mécaniques seulement) : le solitaire (colonnes de cartes, la carte du dessous se retourne),
// Dice & Fold (des cases de dés sur les monstres), Balatro (les chaînes qui multiplient le score).
// Règle en une phrase : lance tes dés, pose-les sur les SCEAUX des monstres visibles ; un monstre dont tous les sceaux sont brisés
// tombe et la carte du dessous se retourne. À la fin du tour, chaque monstre visible frappe. Vide les 3 colonnes, puis bats le Gardien.
// Ce fichier n'a AUCUN dessin : il marche aussi dans node (outils/simuler-crypte.mjs).
(function (racine) {
'use strict';

const NB_DES = 5, NB_COL = 3, PROF = 4, RESERVE = 2, RUNES_MAX = 3, PV_HEROS = 55;

// ------------------------------------------------------------------ hasard à graine (la même crypte pour tout le monde le même jour)
function rng(graine) {
  let h = 2166136261; for (const c of String(graine)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const de6 = R => 1 + Math.floor(R() * 6);
// 15/11 : le hasard de la partie vit DANS l'état (S.rs), pour sauvegarder une crypte en cours (JSON simple)
function RS(S) { return () => { S.rs = (S.rs + 0x6D2B79F5) >>> 0; let t = S.rs; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (R, l) => l[Math.floor(R() * l.length)];

// ------------------------------------------------------------------ les sceaux (les cases de dés)
// t : ex (valeur exacte) · min (v ou plus) · max (v ou moins) · pair · imp · tot (somme de plusieurs dés) · dbl (deux sceaux jumeaux, même valeur) · any
const SCEAU_TXT = { ex:'exactement', min:'ou plus', max:'ou moins', pair:'un dé pair', imp:'un dé impair', tot:'total', dbl:'jumeaux', any:'n’importe quel dé' };
function sceau(t, v, g) { return { t, v:v || 0, reste:t === 'tot' ? v : 0, ok:false, val:0, g:g || 0 }; }
// le dé d peut-il aller sur le sceau s ? (S = tous les sceaux de la carte, pour les jumeaux)
function accepte(s, d, S) {
  if (s.ok) return false;
  switch (s.t) {
    case 'ex': return d === s.v;
    case 'min': return d >= s.v;
    case 'max': return d <= s.v;
    case 'pair': return d % 2 === 0;
    case 'imp': return d % 2 === 1;
    case 'tot': case 'any': return true;
    case 'dbl': { const j = S.find(x => x !== s && x.t === 'dbl' && x.g === s.g && x.ok); return !j || j.val === d; }
  }
  return false;
}
function pose(s, d) {
  if (s.t === 'tot') { s.reste -= d; s.val += d; if (s.reste <= 0) { s.reste = 0; s.ok = true; } }
  else { s.ok = true; s.val = d; }
}
const brise = s => { s.ok = true; s.reste = 0; if (!s.val) s.val = s.t === 'ex' ? s.v : 0; };

// ------------------------------------------------------------------ les monstres de la crypte (portraits déjà peints pour l'Odyssée)
const BETES = [
  ['gobelin', 'Gobelin des cendres'], ['loup', 'Loup de braise'], ['golem', 'Golem de scories'], ['salamandre', 'Salamandre'], ['scarabee', 'Scarabée de braise'],
  ['harpie', 'Harpie'], ['lutin', 'Lutin farceur'], ['larve', 'Larve du Vide'], ['sangsue', 'Sangsue'], ['rongeur', 'Rongeur des cryptes'],
  ['renardneige', 'Renard des neiges'], ['givrelin', 'Givrelin'], ['tisseuse', 'Tisseuse'], ['oeil', 'Œil du Vide'], ['ombre', 'Ombre'],
  ['cultiste', 'Cultiste'], ['esprit', 'Esprit errant'], ['sentinelle', 'Sentinelle'], ['yeti', 'Yéti'], ['ours', 'Ours des glaces'],
];
const ELITES = [['chefgobelin', 'Chef gobelin'], ['drake', 'Drake'], ['liche', 'Liche'], ['seigneurbraise', 'Seigneur des braises'], ['reinefrimas', 'Reine des frimas'], ['chevalier', 'Chevalier déchu'], ['mammouth', 'Mammouth']];
const GARDIENS = [['titan', 'Le Titan de feu'], ['vouivre', 'La Vouivre des glaces'], ['roi', 'Le Roi sans visage'], ['hydre', 'L’Hydre'], ['devoreur', 'Le Dévoreur'], ['hiver', 'Le Cœur de l’Hiver']];

// les particularités (une seule par carte, toujours écrite en clair sur la carte)
const TRAITS = {
  furie:   { e:'😡', n:'Furie', d:'Son attaque monte de 1 à chaque fin de tour.' },
  repousse:{ e:'🌱', n:'Repousse', d:'Au début de ton tour, un de ses sceaux brisés se referme.' },
  chef:    { e:'👑', n:'Chef', d:'Les autres monstres visibles frappent 1 de plus.' },
  gel:     { e:'❄️', n:'Gel', d:'Tant qu’il est visible, tu lances 1 dé de moins.' },
  rancune: { e:'💢', n:'Rancune', d:'Quand il tombe, il frappe une dernière fois.' },
  tresor:  { e:'💎', n:'Trésor', d:'Quand il tombe, il remplit une case de ton creuset.' },
};

function sceauxNiveau(R, niv) {
  const facile = () => pick(R, [sceau('any'), sceau('min', 3), sceau('max', 4), sceau('pair'), sceau('imp')]);
  const moyen = () => pick(R, [sceau('min', 4), sceau('max', 3), sceau('pair'), sceau('imp'), sceau('ex', de6(R))]);
  const dur = () => pick(R, [sceau('min', 5), sceau('max', 2), sceau('ex', de6(R)), sceau('tot', 8 + Math.floor(R() * 3))]);
  const jumeaux = g => [sceau('dbl', 0, g), sceau('dbl', 0, g)];
  if (niv === 1) return [facile(), facile()];
  if (niv === 2) return [facile(), moyen(), moyen()];
  if (niv === 3) return R() < .5 ? [moyen(), ...jumeaux(1)] : [moyen(), moyen(), dur()];
  return [dur(), ...jumeaux(1), pick(R, [moyen(), sceau('tot', 10 + Math.floor(R() * 3))])];
}
function carte(R, niv, n) {
  const [m, nom] = niv === 4 ? pick(R, ELITES) : pick(R, BETES);
  const trait = niv >= 2 && R() < .55 ? pick(R, niv === 4 ? ['furie', 'repousse', 'chef', 'rancune'] : Object.keys(TRAITS)) : null;
  const att = [0, [1, 1, 2], [1, 2, 2], [2, 2, 3], [2, 3, 3]][niv][Math.floor(R() * 3)]; // 15/11 : chaque monstre a SA force (retour de l'utilisateur)
  return { id:'c' + n, m, nom, niv, att, trait, sceaux:sceauxNiveau(R, niv), vue:false, elite:niv === 4 };
}
function gardien(R) {
  const [m, nom] = pick(R, GARDIENS);
  return { id:'g', m, nom, niv:5, att:2, trait:'furie', gardien:true, vue:true,
    sceaux:[sceau('ex', de6(R)), sceau('ex', de6(R)), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('min', 5), sceau('tot', 14)] };
}

// ------------------------------------------------------------------ les héros : un pouvoir qui se charge avec des dés
const POUVOIRS = {
  maelle:  { n:'Coup d’enclume', d:'Brise 3 sceaux d’un monstre (tu choisis le monstre).', s:() => [sceau('min', 5), sceau('min', 5)], cible:true },
  aldric:  { n:'Mur de lumière', d:'Aucun monstre ne frappe à la fin de ce tour.', s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1)] },
  pip:     { n:'Sève de la forêt', d:'Soigne 6 PV.', s:() => [sceau('max', 3), sceau('max', 3)] },
  oria:    { n:'Longue-vue', d:'Tu gagnes une Rune, et tu vois les cartes cachées jusqu’à la fin de la crypte.', s:() => [sceau('pair'), sceau('imp')] },
  gorm:    { n:'Second souffle', d:'Relance tous tes dés pas encore posés, avec 2 dés de plus.', s:() => [sceau('any'), sceau('any'), sceau('any')] },
  zephine: { n:'Tempête', d:'Brise 1 sceau sur chaque monstre visible.', s:() => [sceau('imp'), sceau('imp')] },
};

// ------------------------------------------------------------------ les intentions (15/11, retour de l'utilisateur : « ça ressemblait pas à Dice & Fold »)
// À chaque tour, chaque monstre visible annonce ce qu'il va faire à la fin du tour : frapper, préparer un gros coup, se protéger, soigner un voisin.
const INTENTIONS = {
  frappe:{ e:'⚔', n:'Frappe', d:'frappe ton héros de sa force' },
  charge:{ e:'⏳', n:'Prépare un gros coup', d:'ne frappe pas ce tour-ci, mais frappera DOUBLE au tour suivant' },
  garde: { e:'🛡', n:'Se protège', d:'ne frappe pas, mais referme un de ses sceaux brisés' },
  soin:  { e:'💚', n:'Soigne', d:'ne frappe pas, mais referme un sceau brisé d’un monstre voisin' },
};
function intention(S, c) {
  if (c.charge) { c.it = 'frappe'; c.double = true; c.charge = false; return; }
  c.double = false; const r = RS(S)();
  if (c.niv <= 1) { c.it = 'frappe'; return; }
  const table = c.gardien ? [['frappe', .6], ['charge', .2], ['garde', .2]] : c.niv === 2 ? [['frappe', .7], ['charge', .15], ['garde', .15]] : [['frappe', .55], ['charge', .15], ['garde', .15], ['soin', .15]];
  let a = 0; c.it = 'frappe'; for (const [k, p] of table) { a += p; if (r < a) { c.it = k; break; } }
}
// ce que chaque monstre visible fera à la fin du tour (pour l'écran : « Gobelin 2 + Harpie 1 »)
function intentions(S) {
  const V = visibles(S), chefs = V.filter(c => c.trait === 'chef').length;
  return V.map(c => ({ id:c.id, nom:c.nom, it:c.it || 'frappe', v:(c.it || 'frappe') === 'frappe' && !S.voile ? (c.att + chefs - (c.trait === 'chef' ? 1 : 0)) * (c.double ? 2 : 1) : 0 }));
}

// ------------------------------------------------------------------ une partie
// bonus (optionnel) : ce que le héros apporte de sa progression (étoiles, équipement) : { pv, bouclier, relance, des }
function nouvelle(heros, graine, bonus = {}) {
  const R = rng(graine); let n = 0;
  const cols = [];
  for (let c = 0; c < NB_COL; c++) { const col = []; for (let p = PROF; p >= 1; p--) col.push(carte(R, p, n++)); col[col.length - 1].vue = true; cols.push(col); }
  const pvmax = PV_HEROS + (bonus.pv || 0);
  const S = { heros, graine, cols, gardien:null, pv:pvmax, pvmax, tour:0, des:[], relance:1, reserve:Array(RESERVE).fill(null),
    bouclier:bonus.bouclier || 0, relanceBase:1 + (bonus.relance || 0), desPlus:bonus.des || 0,
    creuset:Array(6).fill(false), runes:0, pouvoir:POUVOIRS[heros].s(), pret:false, voile:false, voitTout:false, score:0, chaine:0, chaineMax:0,
    tombes:0, fin:null, journal:[], seq:0, rs:Math.floor(R() * 4294967296) };
  debutTour(S); return S;
}
const log = (S, t) => { S.journal.unshift(t); S.journal.length = Math.min(S.journal.length, 30); };
const visibles = S => S.gardien ? [S.gardien] : S.cols.filter(c => c.length).map(c => c[c.length - 1]);
const trouve = (S, id) => visibles(S).find(c => c.id === id);
const nbDes = S => NB_DES + (S.desPlus || 0) - visibles(S).filter(c => c.trait === 'gel').length;

function debutTour(S) {
  S.tour++; S.relance = S.relanceBase || 1; S.chaine = 0; S.voile = false;
  visibles(S).forEach(c => intention(S, c));
  visibles(S).forEach(c => { if (c.trait === 'repousse') { const s = c.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; log(S, `🌱 ${c.nom} : un sceau se referme.`); } } });
  const garde = S.reserve.filter(x => x != null); S.reserve = Array(RESERVE).fill(null);
  S.des = garde.map(v => ({ id:'d' + S.seq++, v, garde:true }));
  for (let i = 0; i < nbDes(S); i++) S.des.push({ id:'d' + S.seq++, v:de6(RS(S)) });
}
// relancer : tous les dés pas encore posés, sauf ceux sortis de la besace
function relancer(S) {
  if (S.fin || S.relance < 1) return false;
  S.relance--; S.des.forEach(d => { if (!d.garde) d.v = de6(RS(S)); }); return true;
}
// poser le dé id sur : { carte:id, s:index } · { pouvoir:index } · { creuset:true } · { reserve:true }
function placer(S, idDe, ou) {
  if (S.fin) return 'fin';
  const i = S.des.findIndex(d => d.id === idDe); if (i < 0) return 'de';
  const v = S.des[i].v;
  if (ou.creuset) { if (S.creuset[v - 1]) return 'Cette case du creuset est déjà pleine.'; S.creuset[v - 1] = true; S.des.splice(i, 1);
    if (S.creuset.every(Boolean)) { S.creuset = Array(6).fill(false); if (S.runes < RUNES_MAX) S.runes++; log(S, '✦ Le creuset est plein : une Rune !'); return 'rune'; } return 'ok'; }
  if (ou.reserve) { const k = S.reserve.indexOf(null); if (k < 0) return 'La besace est pleine.'; S.reserve[k] = v; S.des.splice(i, 1); return 'ok'; }
  if (ou.pouvoir != null) { const s = S.pouvoir[ou.pouvoir]; if (!s || !accepte(s, v, S.pouvoir)) return 'Ce dé ne va pas sur ce sceau.'; pose(s, v); S.des.splice(i, 1);
    if (S.pouvoir.every(x => x.ok)) { S.pret = true; log(S, `⚡ ${POUVOIRS[S.heros].n} est prêt !`); } return 'ok'; }
  const c = trouve(S, ou.carte); if (!c) return 'Ce monstre est caché.';
  const s = c.sceaux[ou.s]; if (!s || !accepte(s, v, c.sceaux)) return 'Ce dé ne va pas sur ce sceau.';
  pose(s, v); S.des.splice(i, 1); verifie(S, c); return 'ok';
}
function verifie(S, c) {
  if (!c.sceaux.every(s => s.ok)) return;
  S.chaine++; S.chaineMax = Math.max(S.chaineMax, S.chaine); S.tombes++;
  const gain = 10 * c.niv * S.chaine; S.score += gain;
  log(S, `💀 ${c.nom} tombe${S.chaine > 1 ? ` · chaîne ×${S.chaine}` : ''} (+${gain}).`);
  if (c.trait === 'rancune') { degats(S, c.att); log(S, `💢 Rancune : ${c.nom} frappe en tombant (${c.att}).`); }
  if (c.trait === 'tresor') { const vides = S.creuset.map((x, k) => x ? -1 : k).filter(k => k >= 0); if (vides.length) { S.creuset[pick(RS(S), vides)] = true; log(S, '💎 Trésor : une case du creuset se remplit.');
      if (S.creuset.every(Boolean)) { S.creuset = Array(6).fill(false); if (S.runes < RUNES_MAX) S.runes++; log(S, '✦ Le creuset est plein : une Rune !'); } } }
  if (c.gardien) { S.gardien = null; S.score += 200 + 10 * S.pv; S.fin = 'gagne'; log(S, '🏆 Le Gardien de la crypte est vaincu !'); return; }
  const col = S.cols.find(k => k[k.length - 1] === c); col.pop();
  if (col.length) { col[col.length - 1].vue = true; col[col.length - 1].it = 'frappe'; log(S, `🂠 Une carte se retourne : ${col[col.length - 1].nom}.`); }
  if (S.cols.every(k => !k.length)) { S.gardien = gardien(RS(S)); S.gardien.it = 'frappe'; log(S, `🔥 Les colonnes sont vides… ${S.gardien.nom} se réveille !`); }
}
// la Rune : brise n'importe quel sceau d'un monstre visible
function rune(S, idCarte, k) {
  if (S.fin || S.runes < 1) return false; const c = trouve(S, idCarte); if (!c || !c.sceaux[k] || c.sceaux[k].ok) return false;
  S.runes--; brise(c.sceaux[k]); log(S, `✦ Rune : un sceau de ${c.nom} vole en éclats.`); verifie(S, c); return true;
}
// le pouvoir du héros (une fois chargé)
function pouvoir(S, opt = {}) {
  if (S.fin || !S.pret) return false; const P = POUVOIRS[S.heros];
  if (S.heros === 'maelle') { const c = trouve(S, opt.carte); if (!c) return false; c.sceaux.filter(s => !s.ok).slice(0, 3).forEach(brise); log(S, `🔨 Coup d’enclume sur ${c.nom}.`); verifie(S, c); }
  else if (S.heros === 'aldric') { S.voile = true; log(S, '🛡 Mur de lumière : personne ne frappe à ce tour.'); }
  else if (S.heros === 'pip') { const av = S.pv; S.pv = Math.min(S.pvmax, S.pv + 6); log(S, `🌿 Sève : +${S.pv - av} PV.`); }
  else if (S.heros === 'oria') { S.runes = Math.min(RUNES_MAX, S.runes + 1); S.voitTout = true; log(S, '🧭 Longue-vue : une Rune, et les cartes cachées se dévoilent.'); }
  else if (S.heros === 'gorm') { S.des.forEach(d => { d.v = de6(RS(S)); d.garde = false; }); for (let k = 0; k < 2; k++) S.des.push({ id:'d' + S.seq++, v:de6(RS(S)) }); log(S, '📯 Second souffle : nouveaux dés, et deux de plus !'); }
  else if (S.heros === 'zephine') { visibles(S).forEach(c => { const s = c.sceaux.find(x => !x.ok); if (s) brise(s); }); log(S, '🌪 Tempête : un sceau saute sur chaque monstre.'); visibles(S).slice().forEach(c => verifie(S, c)); }
  S.pret = false; S.pouvoir = P.s(); return true;
}
function degats(S, n) { if (n <= 0 || S.fin) return; S.pv -= n; if (S.pv <= 0) { S.pv = 0; S.fin = 'perdu'; log(S, '☠ Ton héros tombe dans la crypte.'); } }
// combien vont frapper les monstres à la fin de ce tour (affiché en direct)
function menace(S) { return S.voile ? 0 : intentions(S).reduce((t, x) => t + x.v, 0); }
function finTour(S) {
  if (S.fin) return;
  let m = menace(S);
  if (m && S.bouclier > 0) { const b = Math.min(S.bouclier, m); S.bouclier -= b; m -= b; log(S, `🛡 Ton bouclier encaisse ${b}.`); }
  if (m) { degats(S, m); log(S, `⚔ Les monstres frappent : −${m} PV.`); }
  if (S.fin) return;
  const V = visibles(S);
  V.forEach((c, i) => {
    if (c.it === 'charge') { c.charge = true; log(S, `⏳ ${c.nom} prépare un gros coup…`); }
    if (c.it === 'garde') { const s = c.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; log(S, `🛡 ${c.nom} referme un sceau.`); } }
    if (c.it === 'soin') { const v = [V[i - 1], V[i + 1]].filter(Boolean).map(x => [x, x.sceaux.find(s => s.ok && s.t !== 'tot')]).find(([, s]) => s); if (v) { v[1].ok = false; v[1].val = 0; log(S, `💚 ${c.nom} soigne ${v[0].nom} : un sceau se referme.`); } }
  });
  visibles(S).forEach(c => { if (c.trait === 'furie') c.att++; });
  S.des = []; debutTour(S);
}
// les étoiles d'une victoire
const etoiles = S => S.fin !== 'gagne' ? 0 : 1 + (S.pv >= 12 ? 1 : 0) + (S.pv >= 25 ? 1 : 0);

const API = { INTENTIONS, intentions, NB_DES, NB_COL, PROF, RESERVE, RUNES_MAX, PV_HEROS, SCEAU_TXT, TRAITS, POUVOIRS,
  nouvelle, relancer, placer, rune, pouvoir, finTour, visibles, menace, accepte, etoiles, trouve };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.CRYPTE = API;
})(typeof window !== 'undefined' ? window : globalThis);
