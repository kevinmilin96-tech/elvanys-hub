// =============================================================================================== LA CRYPTE AUX SCEAUX (15/11, moteur)
// Un SOLITAIRE DE DÉS. Inspirations (mécaniques seulement) : le solitaire (colonnes de cartes, la carte du dessous se retourne),
// Dice & Fold (des cases de dés sur les monstres), Balatro (les chaînes qui multiplient le score).
// Règle en une phrase : lance tes dés, pose-les sur les SCEAUX des monstres visibles ; un monstre dont tous les sceaux sont brisés
// tombe et la carte du dessous se retourne. À la fin du tour, chaque monstre visible frappe. Vide les 3 colonnes, puis bats le Gardien.
// 15/11 soir (demande de l'utilisateur : « je n'ai pas encore vu les fonctionnalités de Dice & Fold ») : DÉS DE COULEUR, PIÈCES D'OR,
// monstres à RÈGLES (voisins, épines, plafond, silence, horloge, mue, voleur, faiblesse), MAÎTRE DES CRYPTES après N tours,
// COMPAGNON (sa propre vie, sa compétence chargée par les dés), OBJETS de la Descente (descente-moteur.js).
// Ce fichier n'a AUCUN dessin : il marche aussi dans node (outils/simuler-crypte.mjs, simuler-descente.mjs).
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
function pose(s, d, bonusTot) {
  if (s.t === 'tot') { const v = d + (bonusTot || 0); s.reste -= v; s.val += v; if (s.reste <= 0) { s.reste = 0; s.ok = true; } }
  else { s.ok = true; s.val = d; }
}
const brise = s => { s.ok = true; s.reste = 0; if (!s.val) s.val = s.t === 'ex' ? s.v : 0; };

// ------------------------------------------------------------------ les dés de couleur (Dice & Fold) : un dé normal, OU un effet spécial
const COULEURS = {
  rouge:  { e:'❤', n:'Dé rouge', d:'soigne ton héros de sa valeur' },
  bleu:   { e:'⚡', n:'Dé bleu', d:'brise d’un coup un sceau de ton pouvoir (ou de ton compagnon)' },
  orange: { e:'🔻', n:'Dé orange', d:'le monstre qui frappe le plus fort perd 1 de force (pour toujours)' },
  gris:   { e:'🛡', n:'Dé gris', d:'ajoute sa valeur à ton bouclier' },
};

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
  // 15/11 soir : les règles écrites sur les cartes de Dice & Fold (mécaniques seulement)
  voisins: { e:'🤝', n:'Meneur', d:'Ses voisins de gauche et de droite frappent 1 de plus (la place des cartes compte !).' },
  epines:  { e:'🌵', n:'Épines', d:'Chaque dé posé sur lui te coûte 1 PV.' },
  plafond: { e:'⛓', n:'Chaînes lourdes', d:'Tant qu’il est visible, les dés de 5 et 6 ne se posent sur aucun sceau (creuset et besace, oui).' },
  silence: { e:'🤐', n:'Silence', d:'Tant qu’il est visible, ton pouvoir et ton compagnon ne peuvent pas agir.' },
  horloge: { e:'⏰', n:'Horloge', d:'S’il est encore là à la fin de son 4e tour visible, il frappe de 8 d’un coup.' },
  mue:     { e:'🐛', n:'Mue', d:'Quand il tombe, une petite bête à 2 sceaux sort de sa carcasse.' },
  voleur:  { e:'🪙', n:'Voleur', d:'À chaque fin de tour, il te vole 1 pièce d’or.' },
  faible:  { e:'🎯', n:'Point faible', d:'Un dé ROUGE posé sur un de ses sceaux le fait tomber d’un coup.' },
};
const TRAITS_FACILES = ['furie', 'repousse', 'chef', 'gel', 'rancune', 'tresor', 'voisins', 'epines', 'mue', 'faible', 'voleur'];
const TRAITS_DURS = ['furie', 'repousse', 'chef', 'rancune', 'voisins', 'plafond', 'silence', 'horloge', 'mue'];

function sceauxNiveau(R, niv) {
  const facile = () => pick(R, [sceau('any'), sceau('min', 3), sceau('max', 4), sceau('pair'), sceau('imp')]);
  const moyen = () => pick(R, [sceau('min', 4), sceau('max', 3), sceau('pair'), sceau('imp'), sceau('ex', de6(R))]);
  const dur = () => pick(R, [sceau('min', 5), sceau('max', 2), sceau('ex', de6(R)), sceau('tot', 8 + Math.floor(R() * 3))]);
  const jumeaux = g => [sceau('dbl', 0, g), sceau('dbl', 0, g)];
  if (niv <= 0) return [facile(), facile()];
  if (niv === 1) return [facile(), facile()];
  if (niv === 2) return [facile(), moyen(), moyen()];
  if (niv === 3) return R() < .5 ? [moyen(), ...jumeaux(1)] : [moyen(), moyen(), dur()];
  return [dur(), ...jumeaux(1), pick(R, [moyen(), sceau('tot', 10 + Math.floor(R() * 3))])];
}
function carte(R, niv, n, plus = 0) {
  const [m, nom] = niv === 4 ? pick(R, ELITES) : pick(R, BETES);
  const trait = niv >= 2 && R() < .55 ? pick(R, niv === 4 ? TRAITS_DURS.filter(t => t !== 'horloge') : niv === 3 ? TRAITS_DURS : TRAITS_FACILES) : null;
  const att = [0, [1, 1, 2], [1, 2, 2], [2, 2, 3], [2, 3, 3]][Math.min(4, Math.max(1, niv))][Math.floor(R() * 3)] + plus; // 15/11 : chaque monstre a SA force
  return { id:'c' + n, m, nom, niv, att, trait, sceaux:sceauxNiveau(R, niv), vue:false, elite:niv === 4, age:0 };
}
function gardien(R, etage = 0) {
  const [m, nom] = pick(R, GARDIENS);
  const sc = [sceau('ex', de6(R)), sceau('ex', de6(R)), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('min', 5), sceau('tot', 14)];
  if (etage >= 2) sc.push(sceau('max', 2)), sc.push(sceau('tot', 12));
  if (etage >= 3) sc.push(sceau('dbl', 0, 2)), sc.push(sceau('dbl', 0, 2));
  return { id:'g', m, nom, niv:5, att:2 + Math.max(0, etage - 1), trait:'furie', gardien:true, vue:true, sceaux:sc, age:0 };
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
// ------------------------------------------------------------------ les compagnons (Dice & Fold) : une 2e carte à côté du héros, sa vie, sa compétence
const COMPAGNONS = {
  moustache:{ e:'🐱', n:'Moustache', pv:8,  d:'+1 relance ce tour, et un dé de plus.', s:() => [sceau('imp'), sceau('pair')] },
  braise:   { e:'🦎', n:'Braise', pv:10, d:'Brise 2 sceaux du monstre qui frappe le plus fort.', s:() => [sceau('min', 4), sceau('min', 4)] },
  caillou:  { e:'🪨', n:'Caillou', pv:20, d:'+6 au bouclier. (Il est lent, mais il encaisse.)', s:() => [sceau('tot', 10)] },
  luciole:  { e:'✨', n:'Luciole', pv:6,  d:'Soigne ton héros de 5.', s:() => [sceau('max', 2), sceau('max', 2)] },
  renard:   { e:'🦊', n:'Filou', pv:9,  d:'+3 pièces d’or et un dé de couleur au hasard.', s:() => [sceau('ex', 6)] },
  chouette: { e:'🦉', n:'Chouette', pv:8, d:'Fait taire tous les monstres : ils ne font rien à la fin de ce tour.', s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('any')] },
};

// ------------------------------------------------------------------ les intentions (15/11, retour de l'utilisateur : « ça ressemblait pas à Dice & Fold »)
const INTENTIONS = {
  frappe:{ e:'⚔', n:'Frappe', d:'frappe ton héros de sa force' },
  charge:{ e:'⏳', n:'Prépare un gros coup', d:'ne frappe pas ce tour-ci, mais frappera DOUBLE au tour suivant' },
  garde: { e:'🛡', n:'Se protège', d:'ne frappe pas, mais referme un de ses sceaux brisés' },
  soin:  { e:'💚', n:'Soigne', d:'ne frappe pas, mais referme un sceau brisé d’un monstre voisin' },
  rien:  { e:'💤', n:'Se tait', d:'ne fait rien ce tour-ci' },
};
function intention(S, c) {
  c.vise = null;
  if (c.charge) { c.it = 'frappe'; c.double = true; c.charge = false; }
  else {
    c.double = false; const r = RS(S)();
    if (c.niv <= 1) c.it = 'frappe';
    else {
      const table = c.gardien ? [['frappe', .6], ['charge', .2], ['garde', .2]] : c.niv === 2 ? [['frappe', .7], ['charge', .15], ['garde', .15]] : [['frappe', .55], ['charge', .15], ['garde', .15], ['soin', .15]];
      let a = 0; c.it = 'frappe'; for (const [k, p] of table) { a += p; if (r < a) { c.it = k; break; } }
    }
  }
  // un monstre sur trois vise le compagnon (s'il en a un, vivant)
  if (c.it === 'frappe' && S.comp && S.comp.pv > 0 && RS(S)() < .33) c.vise = 'comp';
}
// la force d'un monstre ce tour-ci (chef, meneur, maître, marché du diable)
function force(S, c, V) {
  V = V || visibles(S);
  let f = c.att + V.filter(x => x !== c && x.trait === 'chef').length + (S.obj && S.obj.diable ? 1 : 0) + (S.obj && S.obj.pactesang ? 1 : 0) + (S.obj && S.obj.forcePlus || 0);
  if (!S.gardien) { const i = V.indexOf(c), col = k => V[k]; [i - 1, i + 1].forEach(k => { if (col(k) && col(k).trait === 'voisins') f++; }); }
  return f * (c.double ? 2 : 1);
}
// ce que chaque monstre visible fera à la fin du tour (pour l'écran : « Gobelin 2 + Harpie 1 »)
function intentions(S) {
  const V = visibles(S);
  return V.map(c => { const it = S.taire ? 'rien' : (c.it || 'frappe'); return { id:c.id, nom:c.nom, it, vise:c.vise, v:it === 'frappe' && !S.voile ? force(S, c, V) : 0 }; });
}

// ------------------------------------------------------------------ une partie
// bonus (optionnel) : ce que le héros apporte de sa progression (étoiles, équipement) : { pv, bouclier, relance, des }
// opts (optionnel, la Descente) : { cols:[[niv du fond…, niv du dessus], …], gardien:'fin'|'seul'|false, etage, pv, pvmax, obj:{}, comp:{id,pv}, or,
//   maitre:N (le Maître des cryptes arrive après N tours), couleur:chance de dé de couleur }
function nouvelle(heros, graine, bonus = {}, opts = {}) {
  const R = rng(graine); let n = 0;
  const etage = opts.etage || 0, plus = Math.max(0, etage - 1);
  const cols = [];
  if (opts.gardien !== 'seul') {
    const plan = opts.cols || Array.from({ length:NB_COL }, () => [4, 3, 2, 1]);
    for (const p of plan) { const col = p.map(niv => carte(R, niv, n++, plus)); if (col.length) col[col.length - 1].vue = true; cols.push(col); }
  }
  const pvmax = opts.pvmax || PV_HEROS + (bonus.pv || 0);
  const obj = opts.obj || {};
  const S = { heros, graine, cols, gardien:null, pv:opts.pv != null ? opts.pv : pvmax, pvmax, tour:0, des:[], relance:1, reserve:Array(RESERVE + (obj.besace || 0)).fill(null),
    bouclier:(bonus.bouclier || 0) + 4 * (obj.aube || 0), relanceBase:1 + (bonus.relance || 0) + (obj.gobelet || 0), desPlus:(bonus.des || 0) + (obj.sac || 0) + (obj.diable || 0),
    creuset:Array(6).fill(false), runes:Math.min(RUNES_MAX, obj.rune || 0), pouvoir:POUVOIRS[heros].s(), pret:false, voile:false, taire:false, voitTout:false, score:0, chaine:0, chaineMax:0,
    tombes:0, fin:null, journal:[], seq:0, rs:Math.floor(R() * 4294967296),
    // la Descente
    or:opts.or || 0, orGagne:0, obj, etage, maitre:opts.maitre || 0, couleur:opts.couleur != null ? opts.couleur : .07, gardienMode:opts.gardien == null ? 'fin' : opts.gardien,
    comp:opts.comp && COMPAGNONS[opts.comp.id] ? { id:opts.comp.id, pv:opts.comp.pv, pvmax:COMPAGNONS[opts.comp.id].pv, sceaux:COMPAGNONS[opts.comp.id].s(), pret:false } : null,
    secours:!!opts.secours, paires:{} };
  if (S.couleur && obj.prisme) S.couleur *= 1 + obj.prisme;
  if (opts.gardien === 'seul') { S.gardien = gardien(R, etage); S.gardien.it = 'frappe'; for (let k = 0; k < (obj.bossDur || 0); k++) S.gardien.sceaux.push(sceau('min', 4)); }
  if (obj.eliteDur) cols.forEach(col => col.forEach(c => { if (c.elite) c.sceaux.push(sceau('tot', 9)); }));
  if (obj.talisman) S.pouvoir.slice(0, obj.talisman).forEach(brise);
  if (obj.entree) visibles(S).forEach(c => { const s = c.sceaux.find(x => !x.ok); if (s) brise(s); });
  debutTour(S); return S;
}
const log = (S, t) => { S.journal.unshift(t); S.journal.length = Math.min(S.journal.length, 30); };
const visibles = S => S.gardien ? [S.gardien] : S.cols.filter(c => c.length).map(c => c[c.length - 1]);
const trouve = (S, id) => visibles(S).find(c => c.id === id);
const nbDes = S => NB_DES + (S.desPlus || 0) - visibles(S).filter(c => c.trait === 'gel').length;
const tire = S => { const R = RS(S), d = { id:'d' + S.seq++, v:de6(R) }; if (R() < S.couleur) d.c = pick(R, Object.keys(COULEURS)); return d; };
const silence = S => visibles(S).some(c => c.trait === 'silence');
const plafond = S => visibles(S).some(c => c.trait === 'plafond');

function debutTour(S) {
  S.tour++; S.relance = S.relanceBase || 1; S.chaine = 0; S.voile = false; S.taire = false; S.paires = {};
  // le Maître des cryptes (Dice & Fold) : après N tours, chaque nouveau tour rend tous les monstres plus forts
  if (S.maitre && S.tour > S.maitre) { visibles(S).forEach(c => c.att++); log(S, `👹 Le Maître des cryptes s’impatiente : tous les monstres +1 de force.`); S.maitreLa = true; }
  visibles(S).forEach(c => intention(S, c));
  visibles(S).forEach(c => { if (c.trait === 'repousse') { const s = c.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; log(S, `🌱 ${c.nom} : un sceau se referme.`); } } });
  const garde = S.reserve.filter(x => x != null); S.reserve = Array(RESERVE + (S.obj.besace || 0)).fill(null);
  S.des = garde.map(g => Object.assign({ id:'d' + S.seq++, garde:true }, typeof g === 'object' ? g : { v:g }));
  for (let i = 0; i < nbDes(S); i++) S.des.push(tire(S));
}
// relancer : tous les dés pas encore posés, sauf ceux sortis de la besace (un dé de couleur relancé garde sa couleur)
function relancer(S) {
  if (S.fin || S.relance < 1) return false;
  S.relance--; S.des.forEach(d => { if (!d.garde) d.v = de6(RS(S)); }); return true;
}
function gagneOr(S, n, pourquoi) { if (n <= 0) return; S.or += n; S.orGagne += n; if (pourquoi) log(S, `🪙 +${n} or (${pourquoi}).`); }
function creusetPlein(S) {
  S.creuset = Array(6).fill(false); if (S.runes < RUNES_MAX) S.runes++; log(S, '✦ Le creuset est plein : une Rune !');
  if (S.obj.creusetor) { gagneOr(S, 3 * S.obj.creusetor, 'creuset doré'); S.bouclier += 3 * S.obj.creusetor; }
}
// poser le dé id sur : { carte:id, s:index } · { pouvoir:index } · { comp:index } · { creuset:true } · { reserve:true } · { couleur:true } (effet spécial)
function placer(S, idDe, ou) {
  if (S.fin) return 'fin';
  const i = S.des.findIndex(d => d.id === idDe); if (i < 0) return 'de';
  const D = S.des[i], v = D.v;
  if (ou.couleur) return effetCouleur(S, i);
  if (ou.creuset) { if (S.creuset[v - 1]) return 'Cette case du creuset est déjà pleine.'; S.creuset[v - 1] = true; S.des.splice(i, 1);
    if (S.creuset.every(Boolean)) { creusetPlein(S); return 'rune'; } return 'ok'; }
  if (ou.reserve) { const k = S.reserve.indexOf(null); if (k < 0) return 'La besace est pleine.'; S.reserve[k] = D.c ? { v, c:D.c } : v; S.des.splice(i, 1); return 'ok'; }
  if (plafond(S) && v >= 5) return 'Chaînes lourdes : pas de 5 ni de 6 !';
  if (ou.pouvoir != null) { const s = S.pouvoir[ou.pouvoir]; if (!s || !accepte(s, v, S.pouvoir)) return 'Ce dé ne va pas sur ce sceau.'; pose(s, v, S.obj.aiguise); S.des.splice(i, 1);
    if (S.pouvoir.every(x => x.ok)) { S.pret = true; log(S, `⚡ ${POUVOIRS[S.heros].n} est prêt !`); } return 'ok'; }
  if (ou.comp != null) { const C = S.comp; if (!C || C.pv <= 0) return 'Pas de compagnon.'; const s = C.sceaux[ou.comp]; if (!s || !accepte(s, v, C.sceaux)) return 'Ce dé ne va pas sur ce sceau.'; pose(s, v, S.obj.aiguise); S.des.splice(i, 1);
    if (C.sceaux.every(x => x.ok)) { C.pret = true; log(S, `${COMPAGNONS[C.id].e} ${COMPAGNONS[C.id].n} est prêt !`); } return 'ok'; }
  const c = trouve(S, ou.carte); if (!c) return 'Ce monstre est caché.';
  const s = c.sceaux[ou.s]; if (!s || !accepte(s, v, c.sceaux)) return 'Ce dé ne va pas sur ce sceau.';
  pose(s, v, S.obj.aiguise); S.des.splice(i, 1);
  if (c.trait === 'epines') { degats(S, 1); log(S, `🌵 Épines : −1 PV.`); }
  if (c.trait === 'faible' && D.c === 'rouge') { c.sceaux.forEach(brise); log(S, `🎯 Point faible ! ${c.nom} s’effondre.`); }
  if (v === 6 && S.obj.six) S.bouclier += S.obj.six;
  S.paires[v] = (S.paires[v] || 0) + 1; if (S.paires[v] === 2 && S.obj.bourse) gagneOr(S, S.obj.bourse, 'paire');
  verifie(S, c); return 'ok';
}
// un dé de couleur utilisé pour son effet spécial
function effetCouleur(S, i) {
  const D = S.des[i], v = D.v;
  if (!D.c) return 'Ce dé n’a pas de couleur.';
  if (D.c === 'rouge') { const a = S.pv; S.pv = Math.min(S.pvmax, S.pv + v); log(S, `❤ Dé rouge : +${S.pv - a} PV.`); }
  if (D.c === 'gris') { S.bouclier += v; log(S, `🛡 Dé gris : bouclier +${v}.`); }
  if (D.c === 'orange') { const V = visibles(S).slice().sort((a, b) => force(S, b) - force(S, a)); if (!V.length) return 'Aucun monstre.'; V[0].att = Math.max(0, V[0].att - 1); log(S, `🔻 Dé orange : ${V[0].nom} perd 1 de force.`); }
  if (D.c === 'bleu') {
    let s = !S.pret && S.pouvoir.find(x => !x.ok), quoi = 'pouvoir';
    if (!s && S.comp && S.comp.pv > 0 && !S.comp.pret) { s = S.comp.sceaux.find(x => !x.ok); quoi = 'comp'; }
    if (!s) return 'Rien à charger.';
    brise(s); log(S, '⚡ Dé bleu : un sceau se brise.');
    if (quoi === 'pouvoir' && S.pouvoir.every(x => x.ok)) S.pret = true;
    if (quoi === 'comp' && S.comp.sceaux.every(x => x.ok)) S.comp.pret = true;
  }
  S.des.splice(i, 1); return 'ok';
}
function verifie(S, c) {
  if (!c.sceaux.every(s => s.ok)) return;
  S.chaine++; S.chaineMax = Math.max(S.chaineMax, S.chaine); S.tombes++;
  const gain = 10 * c.niv * S.chaine; S.score += gain;
  log(S, `💀 ${c.nom} tombe${S.chaine > 1 ? ` · chaîne ×${S.chaine}` : ''} (+${gain}).`);
  gagneOr(S, S.obj.moinsOr ? (c.gardien ? 6 + 3 * S.etage : c.elite ? 3 : 1) : c.gardien ? 8 + 4 * S.etage : c.elite ? 5 : c.niv >= 3 ? 2 : 1);
  if (S.chaine >= 2 && S.obj.chaineor) gagneOr(S, 2 * S.obj.chaineor, 'chaîne d’or');
  if (c.trait === 'rancune') { degats(S, c.att); log(S, `💢 Rancune : ${c.nom} frappe en tombant (${c.att}).`); }
  if (c.trait === 'tresor') { const vides = S.creuset.map((x, k) => x ? -1 : k).filter(k => k >= 0); if (vides.length) { S.creuset[pick(RS(S), vides)] = true; log(S, '💎 Trésor : une case du creuset se remplit.');
      if (S.creuset.every(Boolean)) creusetPlein(S); } }
  if (c.gardien) { S.gardien = null; S.score += 200 + 10 * S.pv; S.fin = 'gagne'; log(S, '🏆 Le Gardien est vaincu !'); return; }
  const col = S.cols.find(k => k[k.length - 1] === c); col.pop();
  if (c.trait === 'mue') { const b = carte(RS(S), 1, 'm' + S.seq++); b.nom = 'Larve de ' + c.nom.split(' ')[0]; b.m = 'larve'; b.vue = true; b.it = 'frappe'; b.mueDe = true; col.push(b); log(S, `🐛 Mue : une larve sort de ${c.nom} !`); }
  else if (col.length) { col[col.length - 1].vue = true; col[col.length - 1].it = 'frappe'; log(S, `🂠 Une carte se retourne : ${col[col.length - 1].nom}.`); }
  if (S.cols.every(k => !k.length)) {
    if (S.gardienMode === false) { S.fin = 'gagne'; S.score += 5 * S.pv; log(S, '🏆 La salle est vidée !'); return; }
    S.gardien = gardien(RS(S), S.etage); S.gardien.it = 'frappe'; log(S, `🔥 Les colonnes sont vides… ${S.gardien.nom} se réveille !`);
  }
}
// la Rune : brise n'importe quel sceau d'un monstre visible
function rune(S, idCarte, k) {
  if (S.fin || S.runes < 1) return false; const c = trouve(S, idCarte); if (!c || !c.sceaux[k] || c.sceaux[k].ok) return false;
  S.runes--; brise(c.sceaux[k]); log(S, `✦ Rune : un sceau de ${c.nom} vole en éclats.`); verifie(S, c); return true;
}
// le pouvoir du héros (une fois chargé)
function pouvoir(S, opt = {}) {
  if (S.fin || !S.pret) return false; if (silence(S)) { log(S, '🤐 Silence : ton pouvoir ne peut pas agir.'); return false; }
  const P = POUVOIRS[S.heros];
  if (S.heros === 'maelle') { const c = trouve(S, opt.carte); if (!c) return false; c.sceaux.filter(s => !s.ok).slice(0, 3).forEach(brise); log(S, `🔨 Coup d’enclume sur ${c.nom}.`); verifie(S, c); }
  else if (S.heros === 'aldric') { S.voile = true; log(S, '🛡 Mur de lumière : personne ne frappe à ce tour.'); }
  else if (S.heros === 'pip') { const av = S.pv; S.pv = Math.min(S.pvmax, S.pv + 6); log(S, `🌿 Sève : +${S.pv - av} PV.`); }
  else if (S.heros === 'oria') { S.runes = Math.min(RUNES_MAX, S.runes + 1); S.voitTout = true; log(S, '🧭 Longue-vue : une Rune, et les cartes cachées se dévoilent.'); }
  else if (S.heros === 'gorm') { S.des.forEach(d => { d.v = de6(RS(S)); d.garde = false; }); for (let k = 0; k < 2; k++) S.des.push(tire(S)); log(S, '📯 Second souffle : nouveaux dés, et deux de plus !'); }
  else if (S.heros === 'zephine') { visibles(S).forEach(c => { const s = c.sceaux.find(x => !x.ok); if (s) brise(s); }); log(S, '🌪 Tempête : un sceau saute sur chaque monstre.'); visibles(S).slice().forEach(c => verifie(S, c)); }
  S.pret = false; S.pouvoir = P.s(); return true;
}
// la compétence du compagnon (une fois chargée)
function competence(S) {
  const C = S.comp; if (S.fin || !C || C.pv <= 0 || !C.pret) return false; if (silence(S)) { log(S, '🤐 Silence : ton compagnon ne peut pas agir.'); return false; }
  const K = COMPAGNONS[C.id];
  if (C.id === 'moustache') { S.relance++; S.des.push(tire(S)); }
  if (C.id === 'braise') { const V = visibles(S).slice().sort((a, b) => force(S, b) - force(S, a)); if (V[0]) { V[0].sceaux.filter(s => !s.ok).slice(0, 2).forEach(brise); verifie(S, V[0]); } }
  if (C.id === 'caillou') S.bouclier += 6;
  if (C.id === 'luciole') S.pv = Math.min(S.pvmax, S.pv + 5);
  if (C.id === 'renard') { gagneOr(S, 3); const d = tire(S); d.c = pick(RS(S), Object.keys(COULEURS)); S.des.push(d); }
  if (C.id === 'chouette') S.taire = true;
  log(S, `${K.e} ${K.n} : ${K.d}`);
  C.pret = false; C.sceaux = K.s(); return true;
}
function degats(S, n) {
  if (n <= 0 || S.fin) return; S.pv -= n;
  if (S.pv <= 0 && S.secours) { S.secours = false; S.secoursUtilise = true; S.pv = 10; log(S, '🕯 Dernier souffle : ton héros se relève à 10 PV !'); return; }
  if (S.pv <= 0) { S.pv = 0; S.fin = 'perdu'; log(S, '☠ Ton héros tombe dans la crypte.'); }
}
// combien vont frapper les monstres à la fin de ce tour (affiché en direct) : sur le héros seulement (le compagnon à part)
function menace(S) { return S.voile ? 0 : intentions(S).filter(x => x.vise !== 'comp').reduce((t, x) => t + x.v, 0); }
function menaceComp(S) { return S.voile ? 0 : intentions(S).filter(x => x.vise === 'comp').reduce((t, x) => t + x.v, 0); }
function finTour(S) {
  if (S.fin) return;
  let m = menace(S), mc = menaceComp(S);
  if (mc && S.comp && S.comp.pv > 0) { S.comp.pv = Math.max(0, S.comp.pv - mc); log(S, `🐾 ${COMPAGNONS[S.comp.id].n} encaisse ${mc}${S.comp.pv ? '' : ' et tombe…'}.`); }
  if (m && S.bouclier > 0) { const b = Math.min(S.bouclier, m); S.bouclier -= b; m -= b; log(S, `🛡 Ton bouclier encaisse ${b}.`); }
  if (m) { degats(S, m); log(S, `⚔ Les monstres frappent : −${m} PV.`); }
  if (S.fin) return;
  const V = visibles(S);
  if (!S.taire) V.forEach((c, i) => {
    if (c.it === 'charge') { c.charge = true; log(S, `⏳ ${c.nom} prépare un gros coup…`); }
    if (c.it === 'garde') { const s = c.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; log(S, `🛡 ${c.nom} referme un sceau.`); } }
    if (c.it === 'soin') { const v = [V[i - 1], V[i + 1]].filter(Boolean).map(x => [x, x.sceaux.find(s => s.ok && s.t !== 'tot')]).find(([, s]) => s); if (v) { v[1].ok = false; v[1].val = 0; log(S, `💚 ${c.nom} soigne ${v[0].nom} : un sceau se referme.`); } }
  });
  V.forEach(c => {
    c.age = (c.age || 0) + 1;
    if (c.trait === 'furie') c.att++;
    if (c.trait === 'voleur' && S.or > 0) { S.or--; log(S, `🪙 ${c.nom} te vole 1 pièce.`); }
    if (c.trait === 'horloge' && c.age === 4) { degats(S, 8); log(S, `⏰ ${c.nom} sonne : −8 PV !`); }
  });
  if (S.fin) return;
  S.des = []; debutTour(S);
}
// les étoiles d'une victoire
const etoiles = S => S.fin !== 'gagne' ? 0 : 1 + (S.pv >= 12 ? 1 : 0) + (S.pv >= 25 ? 1 : 0);

const API = { INTENTIONS, intentions, NB_DES, NB_COL, PROF, RESERVE, RUNES_MAX, PV_HEROS, SCEAU_TXT, TRAITS, POUVOIRS, COMPAGNONS, COULEURS,
  nouvelle, relancer, placer, rune, pouvoir, competence, finTour, visibles, menace, menaceComp, accepte, etoiles, trouve, force, silence, plafond, rng };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.CRYPTE = API;
})(typeof window !== 'undefined' ? window : globalThis);
