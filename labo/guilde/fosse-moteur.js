// =============================================================================================== LA FOSSE AUX RUNES (15/11, moteur)
// Un CASSE-BRIQUES DE DÉS. Inspiration (mécaniques seulement) : BALL x PIT (grille qui descend, balles qui se combinent et fusionnent).
// Règle en une phrase : les monstres descendent vers ton rempart ; chaque dé est une balle que tu tires dans la colonne de ton choix ;
// sa VALEUR est sa force, elle traverse les monstres qu'elle tue et RICOCHE en haut dans la colonne voisine.
// Bonus : un dé tiré dans la colonne de SON chiffre (1 à 5) frappe deux fois plus fort ; un 6 est fort partout.
// Ce fichier n'a AUCUN dessin : il marche aussi dans node (outils/simuler-fosse.mjs). L'état est un objet JSON simple (copiable).
(function (racine) {
'use strict';
const COL = 5, RANGS = 7, PV_HEROS = 30, SAC = 4, TOURS_AVANT_BOSS = 15, BUTIN_TOUS = 3;

// ------------------------------------------------------------------ hasard à graine, gardé DANS l'état (pour copier une partie)
function graine(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function hasard(S) { S.rs = (S.rs + 0x6D2B79F5) >>> 0; let t = S.rs; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const de6 = S => 1 + Math.floor(hasard(S) * 6);
const pick = (S, l) => l[Math.floor(hasard(S) * l.length)];

// ------------------------------------------------------------------ les balles spéciales (chaque balle du sac = un dé de plus, de sa couleur)
const BALLES = {
  feu:     { e:'🔥', n:'Balle de feu', c:'#ff6a2a', d:n => `Les monstres touchés brûlent : ${n} dégât${n > 1 ? 's' : ''} à la fin de chaque tour.` },
  foudre:  { e:'⚡', n:'Balle de foudre', c:'#ffe14a', d:n => `Chaque monstre touché électrise ses voisins de gauche et de droite (${n} dégât${n > 1 ? 's' : ''}).` },
  glace:   { e:'❄️', n:'Balle de glace', c:'#7cd4ff', d:n => `Les monstres touchés gèlent : ils ne descendent pas pendant ${n} tour${n > 1 ? 's' : ''}.` },
  perce:   { e:'🗡️', n:'Balle perçante', c:'#7dffb0', d:n => `Elle ne s’arrête pas aux ${n} premier${n > 1 ? 's' : ''} monstre${n > 1 ? 's' : ''} qui survivent : elle continue avec toute sa force.` },
  bombe:   { e:'💣', n:'Balle bombe', c:'#ff9f2a', d:n => `Là où elle s’arrête, elle explose : ${n + 1} dégâts à toutes les cases autour.` },
  lumiere: { e:'✨', n:'Balle de lumière', c:'#fff3c4', d:n => `Chaque monstre qu’elle abat te rend ${n} PV.` },
};
// recettes de fusion (deux balles au niveau 3) : un nom de la Guilde ; sinon « Balle runique »
const FUSIONS = { 'feu+foudre':'Balle de plasma', 'glace+perce':'Lance de givre', 'bombe+feu':'Météore', 'foudre+glace':'Tempête de grêle', 'lumiere+perce':'Rayon de l’aube', 'bombe+foudre':'Orage tonnant' };
const nomFusion = l => FUSIONS[l.slice().sort().join('+')] || 'Balle runique';

// ------------------------------------------------------------------ les héros (un talent chacun dans la Fosse)
const TALENTS = {
  maelle:  { n:'Tir de forgeronne', d:'Un dé tiré dans la colonne de son chiffre frappe 2 fois plus fort, +1.' },
  aldric:  { n:'Rempart de lumière', d:'Le premier monstre qui atteint le rempart à chaque tour ne te fait rien.' },
  pip:     { n:'Ronces', d:'À la fin de chaque tour, les ronces font 5 dégâts à chaque monstre posé juste devant le rempart.' },
  oria:    { n:'Œil du cartographe', d:'2 relances par tour, et tes 4 et tes 5 frappent aussi fort qu’un 6.' },
  gorm:    { n:'Grand souffle', d:'Tu lances 4 dés simples au lieu de 3, mais sans relance.' },
  zephine: { n:'Rebond de tempête', d:'Tes balles gagnent +3 de force quand elles ricochent.' },
};

// ------------------------------------------------------------------ les monstres de la Fosse (portraits de l'Odyssée)
const PETITS = ['gobelin', 'loup', 'salamandre', 'scarabee', 'harpie', 'lutin', 'larve', 'sangsue', 'rongeur', 'givrelin', 'tisseuse', 'oeil', 'ombre', 'esprit', 'cultiste'];
const ELITES = ['golem', 'chefgobelin', 'drake', 'yeti', 'ours', 'liche', 'chevalier', 'mammouth'];
const BOSS = [['titan', 'Le Titan de feu'], ['vouivre', 'La Vouivre des glaces'], ['roi', 'Le Roi sans visage'], ['hydre', 'L’Hydre'], ['kraken', 'Le Kraken des brumes']];

function nouvelle(heros, s) {
  const S = { heros, rs:graine(s), grille:Array.from({ length:RANGS }, () => Array(COL).fill(null)), boss:null, pv:PV_HEROS, pvmax:PV_HEROS,
    tour:0, des:[], relances:0, sac:[], butin:null, prochaine:null, score:0, tues:0, tuesTour:0, fin:null, journal:[], seq:0 };
  S.grille[1] = rangee(S, 1); S.grille[0] = rangee(S, 2); S.prochaine = rangee(S, 3);
  debutTour(S); return S;
}
const log = (S, t) => { S.journal.unshift(t); S.journal.length = Math.min(S.journal.length, 30); };
function monstre(S, t, elite) {
  const base = 4 + t * 1.3 + Math.floor(hasard(S) * 4);
  const pv = Math.round(elite ? base * 2.6 : base);
  return { id:'m' + S.seq++, m:elite ? pick(S, ELITES) : pick(S, PETITS), pv, pvmax:pv, att:elite ? 4 : 1 + Math.floor(t / 5), elite:!!elite, brule:0, gele:0 };
}
// la rangée qui va arriver au tour t (on la tire d'avance : Oria la voit)
function rangee(S, t) {
  if (t > TOURS_AVANT_BOSS) return Array(COL).fill(null);
  const n = Math.min(COL, 1 + Math.floor(t / 4) + (hasard(S) < .5 ? 1 : 0));
  const cases = [0, 1, 2, 3, 4]; for (let i = cases.length - 1; i > 0; i--) { const j = Math.floor(hasard(S) * (i + 1)); [cases[i], cases[j]] = [cases[j], cases[i]]; }
  const R = Array(COL).fill(null); cases.slice(0, n).forEach((c, k) => R[c] = monstre(S, t, t % 5 === 0 && k === 0));
  return R;
}
function arrivee(S) { S.prochaine.forEach((m, c) => { if (m && !S.grille[0][c]) S.grille[0][c] = m; }); }

function debutTour(S) {
  S.tour++; S.tuesTour = 0; S.relances = S.heros === 'oria' ? 2 : S.heros === 'gorm' ? 0 : 1;
  const base = S.heros === 'gorm' ? 4 : 3;
  S.des = [];
  for (let i = 0; i < base; i++) S.des.push({ id:'d' + S.seq++, v:de6(S), b:null });
  S.sac.forEach((b, k) => S.des.push({ id:'d' + S.seq++, v:de6(S), b:k }));
}
function relancer(S) { if (S.fin || S.butin || S.relances < 1 || !S.des.length) return false; S.relances--; S.des.forEach(d => d.v = de6(S)); return true; }

// ------------------------------------------------------------------ un tir
const niveauEffet = (b, cle) => b ? (b.fx[cle] || 0) : 0;
function forceDe(S, d, c) {
  if (d.v === 6 || (d.v >= 4 && S.heros === 'oria')) return 9; // le 6 : fort partout (comme un « tir porté » de 4,5)
  return d.v === c + 1 ? d.v * 2 + (S.heros === 'maelle' ? 1 : 0) : d.v;
}
// tire le dé id dans la colonne c (0 à 4) ; renvoie le trajet pour l'animation : [{ r, c, dmg, mort, rebond }]
function tirer(S, idDe, c) {
  if (S.fin || S.butin) return null;
  const i = S.des.findIndex(d => d.id === idDe); if (i < 0 || c < 0 || c >= COL) return null;
  const d = S.des.splice(i, 1)[0], b = d.b != null ? S.sac[d.b] : null;
  let F = forceDe(S, d, c), perce = niveauEffet(b, 'perce');
  const trajet = [{ depart:true, c, force:F }];
  let dernier = null, rebond = false, col = c;
  const frappe = (r, cc) => { // frappe la case (r, cc) ; renvoie true si la balle continue
    const m = S.grille[r][cc]; if (!m) return true;
    const dmg = Math.min(F, m.pv); blesse(S, m, dmg, r, cc, b, trajet);
    if (m.pv <= 0) { F -= dmg; dernier = [r, cc]; return F > 0; }
    dernier = [r, cc];
    if (perce > 0) { perce--; return true; }
    F = 0; return false;
  };
  // montée : du rempart vers le haut
  let continue_ = true;
  for (let r = RANGS - 1; r >= 0 && continue_; r--) { if (S.boss && r === S.boss.r) { continue_ = frappeBoss(S, () => F, v => F = v, trajet, r, col); if (!continue_) dernier = [r, col]; break; } continue_ = frappe(r, col); }
  // ricochet en haut : on redescend dans la colonne voisine (vers celle qui a le plus de monstres)
  if (continue_ && F > 0 && !S.boss) {
    const voisins = [col - 1, col + 1].filter(x => x >= 0 && x < COL);
    const nb = x => S.grille.reduce((t, R) => t + (R[x] ? 1 : 0), 0);
    col = voisins.sort((a, b2) => nb(b2) - nb(a))[0]; rebond = true;
    if (S.heros === 'zephine') F += 3;
    trajet.push({ rebond:true, c:col, force:F });
    for (let r = 0; r < RANGS && continue_; r++) continue_ = frappe(r, col);
  }
  // la bombe explose là où la balle s'arrête
  const bombe = niveauEffet(b, 'bombe');
  if (bombe && dernier) { const [r0, c0] = dernier; trajet.push({ boum:true, r:r0, c:c0 });
    for (let r = r0 - 1; r <= r0 + 1; r++) for (let cc = c0 - 1; cc <= c0 + 1; cc++) { if (r < 0 || r >= RANGS || cc < 0 || cc >= COL || (r === r0 && cc === c0)) continue; const m = S.grille[r][cc]; if (m) blesse(S, m, bombe + 1, r, cc, null, trajet); } }
  return trajet;
}
function frappeBoss(S, getF, setF, trajet, r, c) {
  const B = S.boss, F = getF(), dmg = Math.min(F, B.pv); B.pv -= dmg; S.score += dmg; trajet.push({ r, c, dmg, boss:true, mort:B.pv <= 0 }); setF(0);
  if (B.pv <= 0) { S.boss = null; S.fin = 'gagne'; S.score += 300 + 10 * S.pv; log(S, `🏆 ${B.nom} s’effondre !`); }
  return false;
}
function blesse(S, m, dmg, r, c, b, trajet) {
  if (dmg <= 0 || !S.grille[r][c]) return;
  m.pv -= dmg; S.score += dmg; const mort = m.pv <= 0;
  trajet.push({ r, c, dmg, mort });
  if (b) { if (b.fx.feu) m.brule = Math.max(m.brule, b.fx.feu); if (b.fx.glace) m.gele = Math.max(m.gele, b.fx.glace); }
  if (mort) { S.grille[r][c] = null; S.tues++; S.tuesTour++; S.score += m.elite ? 30 : 10; if (b && b.fx.lumiere) S.pv = Math.min(S.pvmax, S.pv + b.fx.lumiere); }
  if (b && b.fx.foudre) { const n = b.fx.foudre; // l'électricité ne se propage qu'une fois (pas de nouvelle balle)
    [c - 1, c + 1].forEach(cc => { const v = cc >= 0 && cc < COL ? S.grille[r][cc] : null; if (v) blesse(S, v, n, r, cc, null, trajet); }); }
}

// ------------------------------------------------------------------ la fin du tour : brûlures, descente, rempart, nouvelle rangée
function finTour(S) {
  if (S.fin || S.butin) return [];
  const ev = [];
  // brûlures
  S.grille.forEach((R, r) => R.forEach((m, c) => { if (m && m.brule) { m.pv -= m.brule; S.score += m.brule; ev.push({ r, c, dmg:m.brule, feu:true, mort:m.pv <= 0 }); if (m.pv <= 0) { R[c] = null; S.tues++; S.tuesTour++; S.score += 10; } } }));
  if (S.heros === 'pip') S.grille[RANGS - 1].forEach((m, c) => { if (m) { m.pv -= 5; S.score += 5; ev.push({ r:RANGS - 1, c, dmg:5, ronce:true, mort:m.pv <= 0 }); if (m.pv <= 0) { S.grille[RANGS - 1][c] = null; S.tues++; S.score += 10; } } });
  // descente (du bas vers le haut)
  let protege = S.heros === 'aldric' ? 1 : 0, perdu = 0;
  for (let r = RANGS - 1; r >= 0; r--) for (let c = 0; c < COL; c++) {
    const m = S.grille[r][c]; if (!m) continue;
    if (m.gele > 0) { m.gele--; continue; }
    if (r === RANGS - 1) { S.grille[r][c] = null; if (protege > 0) { protege--; log(S, '🛡 Rempart de lumière : un monstre repoussé.'); ev.push({ r, c, rempart:true, bloque:true }); continue; } perdu += m.att + (m.elite ? 0 : 0); ev.push({ r, c, rempart:true, att:m.att }); }
    else if (!S.grille[r + 1][c]) { S.grille[r + 1][c] = m; S.grille[r][c] = null; }
  }
  if (perdu) { S.pv -= perdu; log(S, `💥 Les monstres frappent le rempart : −${perdu} PV.`); }
  // le boss descend d'un rang tous les 2 tours ; au rempart, il écrase tout
  if (S.boss) { S.boss.pas++; if (S.boss.pas % 2 === 0) S.boss.r++; if (S.boss.r >= RANGS - 1) { S.pv = 0; log(S, `☠ ${S.boss.nom} a atteint le rempart.`); } }
  if (S.pv <= 0) { S.pv = 0; S.fin = 'perdu'; log(S, '☠ Le rempart est tombé.'); return ev; }
  // nouvelle rangée, ou le boss
  if (S.tour === TOURS_AVANT_BOSS + 2 && !S.boss) { const [m, nom] = pick(S, BOSS); const pv = 130; S.boss = { m, nom, pv, pvmax:pv, r:0, pas:0 }; log(S, `🔥 ${nom} sort de la Fosse !`); ev.push({ boss:true }); }
  else if (!S.boss) { arrivee(S); S.prochaine = rangee(S, S.tour + 2); }
  // le butin tous les 3 tours
  if (S.tour % BUTIN_TOUS === 0 && !S.boss) S.butin = offres(S);
  debutTour(S);
  return ev;
}

// ------------------------------------------------------------------ le butin : 1 choix parmi 3
function offres(S) {
  const O = [], prises = S.sac.map(b => b.cle).filter(Boolean);
  const niv3 = S.sac.map((b, k) => b.fusion ? -1 : (b.niv >= 3 ? k : -1)).filter(k => k >= 0);
  if (niv3.length >= 2) O.push({ t:'fusion', a:niv3[0], b:niv3[1] });
  const cles = Object.keys(BALLES).filter(k => !prises.includes(k) || S.sac.some(b => b.cle === k && b.niv < 3));
  while (O.length < 3 && cles.length) { const k = cles.splice(Math.floor(hasard(S) * cles.length), 1)[0]; const deja = S.sac.find(b => b.cle === k);
    if (deja) O.push({ t:'niveau', cle:k }); else if (S.sac.length < SAC) O.push({ t:'balle', cle:k }); }
  if (O.length < 3) O.push({ t:'soin' });
  return O;
}
function choisirButin(S, k) {
  const o = S.butin && S.butin[k]; if (!o) return false;
  if (o.t === 'balle') S.sac.push({ cle:o.cle, niv:1, fx:{ [o.cle]:1 } });
  else if (o.t === 'niveau') { const b = S.sac.find(x => x.cle === o.cle); b.niv++; b.fx[o.cle] = b.niv; }
  else if (o.t === 'soin') S.pv = Math.min(S.pvmax, S.pv + 8);
  else if (o.t === 'fusion') { const A = S.sac[o.a], B = S.sac[o.b]; const f = { cle:null, fusion:true, niv:3, nom:nomFusion([A.cle, B.cle]), fx:Object.assign({}, A.fx, B.fx), sources:[A.cle, B.cle] };
    S.sac = S.sac.filter((x, i) => i !== o.a && i !== o.b); S.sac.push(f); log(S, `✨ Fusion : ${f.nom} !`); }
  S.butin = null; debutTour(S); S.tour--; // on relance les dés avec le nouveau sac, sans compter un tour de plus
  return true;
}
const nomBalle = b => b.fusion ? b.nom : BALLES[b.cle].n + (b.niv > 1 ? ' ' + 'I'.repeat(b.niv) : '');
const couleurBalle = b => b.fusion ? '#e6a8ff' : BALLES[b.cle].c;
const emojiBalle = b => b.fusion ? Object.keys(b.fx).map(k => BALLES[k].e).join('') : BALLES[b.cle].e;
const texteBalle = b => Object.entries(b.fx).map(([k, n]) => BALLES[k].d(n)).join(' ');
const etoiles = S => S.fin !== 'gagne' ? 0 : 1 + (S.pv >= 10 ? 1 : 0) + (S.pv >= 20 ? 1 : 0);

const API = { COL, RANGS, PV_HEROS, SAC, TOURS_AVANT_BOSS, BALLES, TALENTS, FUSIONS,
  nouvelle, relancer, tirer, finTour, choisirButin, forceDe, nomBalle, couleurBalle, emojiBalle, texteBalle, etoiles };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.FOSSE = API;
})(typeof window !== 'undefined' ? window : globalThis);
