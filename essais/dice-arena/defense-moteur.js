// =============================================================================================== LA DÉFENSE DE LA PORTE · le MOTEUR (13/11)
// Proposition validée le 13/11 (defense-proposition.html, R&D rd-13-11.html) : 3 chemins, 9 cases de remparts (3 × 3), 6 vagues,
// le Titan de feu en boss (s’il atteint la porte, elle tombe), Maëlle et Gorm. La tour garde la FACE du dé et sa force DOUBLE à chaque niveau (1, 2, 4, 8, 16, 32) ;
// deux tours voisines identiques FUSIONNENT (+1) ; deux 6 donnent la RUNE du héros (choix de l'utilisateur).
// Moteur sans dessin (sert à l'écran defense.html et au simulateur outils/simuler-defense.mjs). Utilise donnees.js (HEROS, egaux, suite).
// Chiffres réglés au simulateur : ~/perso/dice-arena/Equilibrage-personnages.md (chapitre « La Défense de la porte »).

const DEF = {
  porte:20, pcDepart:2, pcMax:6, mainDepart:3, mainMax:5, relances:2, jaugeMax:8, chemin:4, // le chemin a 4 cases (rangées 0 à 3)
  hpVague:1.7, hpBase:3.4, coutBatir:1, repit:0, runeGorm:15, runeMaelle:0.75, // v2 : bonus de la Rune de Gorm aux voisins (× niveau au-dessus de 6) ; part des dégâts de la Rune de Maëlle sur chaque monstre du chemin // PV des monstres × hpBase × hpVague^(vague) ; bâtir (poser un dé en tour, ou dans une tour) coûte 1 PC
};
const PUISSANCE = v => v >= 7 ? 32 * Math.pow(2, v - 7) : Math.pow(2, v - 1); // 1, 2, 4, 8, 16, 32 ; la Rune (7) 32 + son pouvoir, la Rune ancienne (8) 64, la Rune légendaire (9) 128
// 14/11 (v2, remarque de l'utilisateur : « à la fin toutes mes tourelles sont au max ») : deux Runes de même niveau fusionnent encore, jusqu'au niveau 9
const NIV_MAX = 9, NOM_RUNE = v => ({ 7:'Rune', 8:'Rune ancienne', 9:'Rune légendaire' })[v] || '';
const MONSTRES = {
  gobelin:{ n:'Gobelin', e:'👺', pv:5, vit:2, dg:2, d:'Peu de PV, rapide : avance de 2 cases.' },
  sanglier:{ n:'Sanglier', e:'🐗', pv:16, vit:1, dg:4, d:'Beaucoup de PV, lent.' },
  bouclier:{ n:'Porte-bouclier', e:'🛡', pv:10, vit:1, dg:3, armure:3, d:'Chaque tir sur lui fait 3 de moins.' },
  chauve:{ n:'Chauve-souris', e:'🦇', pv:6, vit:1, dg:2, vol:true, d:'Vole : la tour de devant de sa colonne ne la voit pas.' },
  titan:{ n:'Titan de feu', e:'🌋', pv:1100, vit:1, lent:2, dg:99, boss:true, fond:true, d:'Le boss : avance d’une case tous les 2 tours et fait fondre la tour la plus faible de sa colonne (−1 niveau) à chaque tour.' },
};
// une vague = une liste de tours ; chaque tour = les monstres qui apparaissent en haut (colonne au hasard)
const VAGUES = [
  [['gobelin'], ['gobelin', 'gobelin'], ['gobelin'], ['sanglier']],
  [['gobelin', 'gobelin'], ['sanglier'], ['chauve', 'gobelin'], ['sanglier', 'gobelin']],
  [['chauve', 'chauve'], ['bouclier', 'gobelin'], ['sanglier', 'chauve'], ['bouclier', 'bouclier']],
  [['sanglier', 'gobelin', 'gobelin'], ['bouclier', 'chauve'], ['sanglier', 'sanglier'], ['chauve', 'chauve', 'bouclier']],
  [['sanglier', 'bouclier', 'gobelin'], ['chauve', 'chauve', 'sanglier'], ['bouclier', 'bouclier', 'gobelin'], ['sanglier', 'sanglier', 'chauve']],
  [['titan', 'gobelin'], ['bouclier', 'chauve'], ['sanglier', 'gobelin', 'gobelin'], ['chauve', 'chauve', 'bouclier']],
];
// les héros de la Défense (leurs Pouvoirs et Ultimes gardent les conditions du Duel ; les effets sont adaptés aux vagues)
const DHEROS = {
  maelle:{ passif:'Métal chaud : tes tours de 5 et de 6 tirent +2.',
    pouvoir:{ n:'Coup d’enclume', txt:'3 dés identiques', d:'Dégâts égaux à leur somme sur un monstre.', cond:vs => vs.length === 3 && egaux(vs), cible:'monstre' },
    ultime:{ n:'Le Grand Martelage', txt:'3 dés de 4 ou plus', d:'16 dégâts à un monstre, et toutes tes tours tirent deux fois ce tour.', cond:vs => vs.length === 3 && vs.every(v => v >= 4), cible:'monstre' },
    rune:{ n:'Enclume runique', d:'Frappe TOUS les monstres de son chemin (les trois quarts de sa force). Deux Runes du même niveau fusionnent : ancienne, puis légendaire.' },
    deck:['marteau', 'marteau', 'etincelles', 'etincelles', 'lame', 'retremper', 'retremper', 'torche', 'ajuste', 'pierre', 'mortier'] },
  gorm:{ passif:'Écho du cor : chaque fusion donne +3 aux tours voisines jusqu’à la fin du tour.',
    pouvoir:{ n:'Chant de guerre', txt:'4 dés tous pairs ou tous impairs', d:'10 dégâts à un monstre, et toutes tes tours +2 ce tour.', cond:vs => vs.length === 4 && (vs.every(v => v % 2 === 0) || vs.every(v => v % 2 === 1)), cible:'monstre' },
    ultime:{ n:'Le Grand Souffle', txt:'3 dés tous pairs ou tous impairs', d:'14 dégâts au monstre de tête de chaque chemin.', cond:vs => vs.length === 3 && (vs.every(v => v % 2 === 0) || vs.every(v => v % 2 === 1)) },
    rune:{ n:'Grand Cor', d:'Tire, et donne +15 aux canons voisins (+30 ancienne, +45 légendaire).' },
    deck:['trancheV', 'trancheV', 'aigue', 'aigue', 'torche', 'ajuste', 'ajuste', 'pierre', 'pierre', 'mortier', 'etincelles'] },
};
// les cartes de la Défense (noms et conditions du Duel ; effets adaptés). cible : monstre | tour | de | (rien)
const DCARTES = {
  marteau:{ n:'Marteau de forge', c:2, txt:'dé = 6', d:'10 dégâts à un monstre.', cond:vs => vs.length === 1 && vs[0] === 6, cible:'monstre', f:(D, vs, k) => blesse(D, k.m, 10) },
  etincelles:{ n:'Étincelles', c:0, txt:'dé ≤ 2', d:'2 dégâts à chaque monstre.', cond:vs => vs.length === 1 && vs[0] <= 2, f:D => [...D.monstres].forEach(m => blesse(D, m, 2)) },
  lame:{ n:'Lame trempée', c:1, txt:'dé ≥ 4', d:'Une de tes tours tire + la valeur du dé, pour toute la partie.', cond:vs => vs.length === 1 && vs[0] >= 4, cible:'tour', f:(D, vs, k) => { k.t.bonus = (k.t.bonus || 0) + vs[0]; } },
  retremper:{ n:'Retremper', c:1, txt:'1 dé', d:'Un autre de tes dés gagne +2 (6 au plus).', cond:vs => vs.length === 1, cible:'de', f:(D, vs, k) => { k.d.v = Math.min(6, k.d.v + 2); } },
  torche:{ n:'Torche', c:1, txt:'dé ≥ 4', d:'4 dégâts à un monstre (6 à une chauve-souris).', cond:vs => vs.length === 1 && vs[0] >= 4, cible:'monstre', f:(D, vs, k) => blesse(D, k.m, MONSTRES[k.m.t].vol ? 6 : 4) },
  ajuste:{ n:'Pierre d’ajustement', c:0, txt:'1 dé', d:'Un autre de tes dés gagne +1 ou −1 (tu choisis).', cond:vs => vs.length === 1, cible:'de', f:(D, vs, k) => { k.d.v = Math.max(1, Math.min(6, k.d.v + (k.sens || 1))); } },
  pierre:{ n:'Pierre à aiguiser', c:1, txt:'1 dé', d:'Une de tes tours tire +2, pour toute la partie.', cond:vs => vs.length === 1, cible:'tour', f:(D, vs, k) => { k.t.bonus = (k.t.bonus || 0) + 2; } },
  mortier:{ n:'Mortier frais', c:1, txt:'1 dé', d:'Répare la porte : + la valeur du dé + 2 PV.', cond:vs => vs.length === 1, f:(D, vs) => { D.porte = Math.min(D.porteMax, D.porte + vs[0] + 2); } },
  trancheV:{ n:'Tranche-vent', c:2, txt:'3, 4 ou 5 identiques', d:'7, 10 ou 15 dégâts à un monstre.', cond:vs => vs.length >= 3 && egaux(vs), cible:'monstre', f:(D, vs, k) => blesse(D, k.m, [0, 0, 0, 7, 10, 15][vs.length]) },
  aigue:{ n:'Note aiguë', c:0, txt:'dé impair', d:'Une de tes tours tire + la valeur du dé ce tour.', cond:vs => vs.length === 1 && vs[0] % 2 === 1, cible:'tour', f:(D, vs, k) => { k.t.tmp = (k.t.tmp || 0) + vs[0]; } },
};

// ---------------------------------------------------------------- la partie
let DID = 0;
function melangeD(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function nouvelleDefense(heros, rng) {
  rng = rng || Math.random;
  const D = { heros, rng, porte:DEF.porte, porteMax:DEF.porte, pc:DEF.pcDepart, main:[], pioche:melangeD([...DHEROS[heros].deck], rng), defausse:[], des:[], relance:0,
    rempart:Array(9).fill(null), monstres:[], vague:0, pas:0, repit:0, tour:0, jauge:0, ultimeFait:false, deplace:false, double:false, cri:0,
    kills:0, sansDegats:0, degatsVague:0, log:[], fini:null, fx:[],
    pieges:{}, bonus:{}, choix:null, cartesJouees:0, piegesPoses:0, coups:0, maxCanons:0, degatsDerniere:0 };
  piocheD(D, DEF.mainDepart); apparitionsD(D); debutTourD(D); return D;
}
const logD = (D, t) => { D.log.unshift(t); if (D.log.length > 120) D.log.length = 120; };
const fxD = (D, e) => { D.fx.push(e); };
function piocheD(D, n) { for (let i = 0; i < n; i++) { if (D.main.length >= DEF.mainMax) return; if (!D.pioche.length) { D.pioche = melangeD(D.defausse, D.rng); D.defausse = []; } if (!D.pioche.length) return; D.main.push(D.pioche.pop()); } }
function lanceD(D, d) { d.v = 1 + Math.floor(D.rng() * 6); }
function debutTourD(D) {
  D.tour++;
  if (D.tour > 1) { D.pc = Math.min(DEF.pcMax, D.pc + 1); piocheD(D, 1); }
  D.des = Array.from({ length:5 }, (_, i) => ({ i, v:0, pose:false })); D.des.forEach(d => lanceD(D, d));
  D.relance = DEF.relances + (D.bonus.relance || 0); D.deplace = false; D.double = !!D.bonus.doubleProchain; D.bonus.doubleProchain = false; D.cri = 0;
  D.rempart.forEach(t => { if (t) t.tmp = 0; });
  logD(D, `— Tour ${D.tour} : ${D.des.map(d => d.v).join(' · ')}`);
}
// cases : index = rangée × 3 + colonne ; rangée 0 = devant (contre le chemin), 2 = contre la porte
const colD = c => c % 3, rangD = c => Math.floor(c / 3);
const voisinsD = c => [c - 3, c + 3, colD(c) > 0 ? c - 1 : -1, colD(c) < 2 ? c + 1 : -1].filter(x => x >= 0 && x < 9);
const libresD = D => D.des.filter(d => !d.pose);
const valsD = ds => ds.map(d => d.v);

// ---------------------------------------------------------------- les actions du joueur (renvoient un message d'erreur, ou rien si c'est fait)
function relancerD(D, ds) { if (D.fini) return 'Partie finie.'; if (!D.relance) return 'Plus de relance ce tour.'; if (!ds.length || ds.some(d => d.pose)) return 'Choisis des dés libres.'; ds.forEach(d => lanceD(D, d)); D.relance--; logD(D, `Relance : ${D.des.map(d => d.v).join(' · ')}`); }
function niveauFusion(v) { return Math.min(NIV_MAX, v + 1); } // 6 + 6 = 7 = la Rune ; 7 + 7 = 8 ; 8 + 8 = 9
function poseTour(D, c, v) { D.rempart[c] = { id:++DID, v, rune:v >= 7, tmp:0, bonus:0 }; }
// bâtir : un dé sur une case libre ; sur une tour de même valeur (pas une Rune) : fusion du dé dans la tour
function batirD(D, d, c) {
  if (D.fini) return 'Partie finie.'; if (!d || d.pose) return 'Choisis un dé.';
  const t = D.rempart[c];
  if (D.pc < DEF.coutBatir) return `Bâtir coûte ${DEF.coutBatir} PC (vends un dé pour en gagner).`;
  if (t && (t.rune || t.v !== d.v)) return t.rune ? 'Une Rune ne prend pas de dé : fusionne-la avec une autre Rune du même niveau.' : `Il faut un dé de ${t.v} pour fusionner avec ce canon.`;
  D.pc -= DEF.coutBatir;
  if (!t) { d.pose = true; poseTour(D, c, d.v); logD(D, `Tour de ${d.v} bâtie.`); fxD(D, { t:'batit', c }); return; }
  d.pose = true; fusionneD(D, c, t, null); return;
}
function fusionneD(D, c, t, depuis) {
  const v = niveauFusion(t.v); t.v = v; t.rune = v >= 7; t.bonus = (t.bonus || 0); if (depuis !== null) { const a = D.rempart[depuis]; t.bonus += a.bonus || 0; D.rempart[depuis] = null; }
  logD(D, t.rune ? `✨ ${v === 7 ? 'Deux 6' : 'Deux Runes'} : ${NOM_RUNE(v).toUpperCase()} ${DHEROS[D.heros].rune.n} !` : `Fusion : un canon de ${v}.`); fxD(D, { t:t.rune ? 'rune' : 'fusion', c });
  if (D.heros === 'gorm') voisinsD(c).forEach(x => { if (D.rempart[x]) D.rempart[x].tmp += D.bonus.echo ? 5 : 3; });
}
function fusionD(D, a, b) {
  if (D.fini) return 'Partie finie.';
  const ta = D.rempart[a], tb = D.rempart[b];
  if (!ta || !tb) return 'Il faut deux tours.'; if (!voisinsD(a).includes(b)) return 'Les deux tours doivent se toucher.';
  if (ta.v !== tb.v) return ta.rune || tb.rune ? 'Deux Runes du même niveau seulement.' : 'Il faut deux canons de même valeur.'; if (ta.v >= NIV_MAX) return 'La Rune légendaire est au plus haut.';
  fusionneD(D, b, tb, a);
}
function deplacerD(D, a, b) {
  if (D.fini) return 'Partie finie.'; if (D.deplace) return 'Une seule tour déplacée par tour.';
  if (!D.rempart[a] || D.rempart[b] || !voisinsD(a).includes(b)) return 'Déplace une tour vers une case libre voisine.';
  D.rempart[b] = D.rempart[a]; D.rempart[a] = null; D.deplace = true; logD(D, 'Une tour change de place.');
}
function blesse(D, m, n, tir) {
  if (!m || !D.monstres.includes(m) || n <= 0) return 0;
  const M = MONSTRES[m.t]; const r = Math.max(0, n - (tir && M.armure ? M.armure : 0));
  m.pv -= r; fxD(D, { t:'touche', id:m.id, n:r });
  if (m.pv <= 0) { D.monstres = D.monstres.filter(x => x !== m); D.kills++; if (!D.ultimeFait) D.jauge = Math.min(DEF.jaugeMax, D.jauge + 1); logD(D, `${M.e} ${M.n} tombe.`); fxD(D, { t:'mort', id:m.id }); verifieFinD(D); }
  return r;
}
function utiliseD(D, ds) { ds.forEach(d => { d.pose = true; }); }
// Frappe / Technique / Pouvoir / Ultime / carte / vente (quoi = 'frappe' | 'technique' | 'pouvoir' | 'ultime' | 'vendre' | index de carte)
function permisD(D, quoi, ds) {
  const vs = valsD(ds); if (!ds.length || ds.some(d => d.pose)) return false;
  if (quoi === 'vendre') return true;
  if (quoi === 'frappe') return FRAPPE.cond(vs); if (quoi === 'technique') return TECHNIQUE.cond(vs);
  const H = DHEROS[D.heros];
  if (quoi === 'pouvoir') return H.pouvoir.cond(vs);
  if (quoi === 'ultime') return !D.ultimeFait && D.jauge >= DEF.jaugeMax && D.pc >= 3 && H.ultime.cond(vs);
  const k = D.main[quoi]; if (k === undefined) return false; const c = DCARTES[k];
  return D.pc >= c.c && c.cond(vs);
}
const cibleDe = (D, quoi) => { if (quoi === 'frappe' || quoi === 'technique') return 'monstre'; if (quoi === 'vendre') return null; const H = DHEROS[D.heros]; if (quoi === 'pouvoir') return H.pouvoir.cible || null; if (quoi === 'ultime') return H.ultime.cible || null; return DCARTES[D.main[quoi]].cible || null; };
function agitD(D, quoi, ds, k) {
  if (D.fini) return 'Partie finie.';
  if (!permisD(D, quoi, ds)) return 'Ces dés ne conviennent pas.';
  const vs = valsD(ds), t = cibleDe(D, quoi);
  if (t === 'monstre' && !(k && k.m && D.monstres.includes(k.m))) return 'Touche un monstre.';
  if (t === 'tour' && !(k && k.t)) return 'Touche une de tes tours.';
  if (t === 'de' && !(k && k.d && !k.d.pose && !ds.includes(k.d))) return 'Touche un autre de tes dés.';
  if (quoi === 'vendre') { utiliseD(D, ds); const g = Math.min(DEF.pcMax - D.pc, ds.length); D.pc += g; logD(D, `Vente : +${g} PC.`); fxD(D, { t:'pc', n:g }); return; }
  utiliseD(D, ds);
  if (quoi === 'frappe' || quoi === 'technique') { coupHeros(D, quoi, vs, k.m.col); return; }
  const H = DHEROS[D.heros];
  if (quoi === 'pouvoir') { logD(D, `✦ ${H.pouvoir.n} !`); fxD(D, { t:'annonce', txt:H.pouvoir.n });
    if (D.heros === 'maelle') blesse(D, k.m, vs.reduce((a, b) => a + b, 0));
    else { blesse(D, k.m, 10); D.cri += 2; } return; }
  if (quoi === 'ultime') { D.pc -= 3; D.ultimeFait = true; D.jauge = 0; logD(D, `⚡ ULTIME : ${H.ultime.n} !`); fxD(D, { t:'annonce', txt:H.ultime.n });
    if (D.heros === 'maelle') { blesse(D, k.m, 16); D.double = true; }
    else [0, 1, 2].forEach(col => { const m = teteD(D, col); if (m) blesse(D, m, 14); }); return; }
  const key = D.main[quoi], c = DCARTES[key];
  D.pc -= c.c; D.main.splice(quoi, 1); D.defausse.push(key); D.cartesJouees++; logD(D, `🂠 ${c.n} (${vs.join('·')}).`); fxD(D, { t:'carte', n:c.n });
  c.f(D, vs, k);
}
const teteD = (D, col, sauf) => D.monstres.filter(m => m.col === col && m !== sauf).sort((a, b) => b.row - a.row || a.id - b.id)[0];

// ---------------------------------------------------------------- la fin du tour : les tours tirent, les monstres avancent, la vague continue
function verifieFinD(D) {
  if (D.fini) return;
  if (D.porte <= 0) { D.porte = 0; D.fini = 'perdu'; logD(D, '💥 La porte est tombée…'); return; }
  if (D.vague >= VAGUES.length && !D.monstres.length) { D.fini = 'gagne'; logD(D, '🏆 La porte a tenu !'); }
}
function puissanceTour(D, c, t) {
  let n = PUISSANCE(t.v) + (t.bonus || 0) + (t.tmp || 0) + D.cri + (D.bonus.forge || 0);
  if (D.heros === 'maelle' && t.v >= 5 && !t.rune) n += D.bonus.acier ? 4 : 2;
  voisinsD(c).forEach(x => { const u = D.rempart[x]; if (u && u.rune && D.heros === 'gorm') n += DEF.runeGorm * (u.v - 6); });
  return n;
}
function tirsD(D) {
  for (let fois = 0; fois < (D.double ? 2 : 1); fois++)
    for (const r of [0, 1, 2]) for (const col of [0, 1, 2]) {
      if (D.fini) return;
      const c = r * 3 + col, t = D.rempart[c]; if (!t) continue;
      if (t.rune && D.heros === 'maelle') { const ms = D.monstres.filter(m => m.col === col); if (ms.length) { fxD(D, { t:'tir', c, rune:true, ids:ms.map(m => m.id) }); ms.forEach(m => blesse(D, m, Math.round(puissanceTour(D, c, t) * DEF.runeMaelle), true)); } continue; }
      // la chauve-souris : la tour de devant (la première de la colonne) ne la voit pas
      const devant = [0, 1, 2].map(rr => rr * 3 + col).find(x => D.rempart[x]);
      const m = D.monstres.filter(x => x.col === col && !(MONSTRES[x.t].vol && devant === c)).sort((a, b) => b.row - a.row || a.id - b.id)[0];
      if (!m) continue;
      fxD(D, { t:'tir', c, id:m.id }); blesse(D, m, puissanceTour(D, c, t), true);
    }
}
function avanceD(D) {
  for (const m of [...D.monstres]) {
    const M = MONSTRES[m.t];
    if (M.fond) { // le Titan fait fondre la tour la plus faible de sa colonne
      const cs = [0, 1, 2].map(r => r * 3 + m.col).filter(c => D.rempart[c]).sort((a, b) => D.rempart[a].v - D.rempart[b].v);
      if (cs.length) { const t = D.rempart[cs[0]]; t.v--; t.rune = t.v >= 7; logD(D, `🌋 Le Titan fait fondre une tour (${t.v + 1} → ${t.v || 'détruite'}).`); fxD(D, { t:'fond', c:cs[0] }); if (t.v <= 0) D.rempart[cs[0]] = null; }
    }
    if (M.lent) { m.attente = (m.attente || 0) + 1; if (m.attente < M.lent) continue; m.attente = 0; }
    if (m.colle > 0) { m.colle--; continue; }
    for (let pas = 0; pas < M.vit && D.monstres.includes(m) && m.row < DEF.chemin; pas++) { if (marcheD(D, m)) break; }
    if (D.fini) return;
    if (!D.monstres.includes(m)) continue;
    if (m.row >= DEF.chemin) { D.monstres = D.monstres.filter(x => x !== m); D.porte -= M.dg; D.degatsVague += M.dg; if (D.vague >= VAGUES.length - 1) D.degatsDerniere += M.dg; logD(D, `🚪 ${M.e} ${M.n} frappe la porte : −${M.dg} PV.`); fxD(D, { t:'porte', n:M.dg }); verifieFinD(D); if (D.fini) return; }
  }
}
function apparitionsD(D) {
  if (D.vague >= VAGUES.length) return;
  if (D.repit > 0) { D.repit--; return; }
  const V = VAGUES[D.vague];
  if (D.pas === 0) { logD(D, `🌊 Vague ${D.vague + 1} sur ${VAGUES.length}${D.vague === VAGUES.length - 1 ? ' : le Titan de feu !' : ''}`); fxD(D, { t:'vague', n:D.vague + 1 }); D.degatsVague = 0; }
  const cols = melangeD([0, 1, 2], D.rng);
  (V[D.pas] || []).forEach((t, i) => { const M = MONSTRES[t]; const pv = M.boss ? M.pv : Math.round(M.pv * DEF.hpBase * Math.pow(DEF.hpVague, D.vague)); /* le boss a des PV fixes */ D.monstres.push({ id:++DID, t, pv, pvMax:pv, col:cols[i % 3], row:0 }); });
  D.pas++;
  if (D.pas >= V.length) { if (!D.degatsVague) D.sansDegats++; D.vague++; D.pas = 0; D.repit = DEF.repit; if (D.vague < VAGUES.length) D.choix = tirageBonus(D); }
}
function finTourD(D) {
  if (D.fini) return;
  const reste = libresD(D); if (reste.length) { const g = Math.min(DEF.pcMax - D.pc, reste.length); D.pc += g; reste.forEach(d => { d.pose = true; }); if (g) logD(D, `Dés non utilisés vendus : +${g} PC.`); }
  tirsD(D); if (D.fini) return;
  avanceD(D); if (D.fini) return;
  apparitionsD(D); verifieFinD(D); if (D.fini) return;
  D.maxCanons = Math.max(D.maxCanons, D.rempart.filter(Boolean).length);
  debutTourD(D);
}
const scoreD = D => D.porte * 10 + D.sansDegats * 25 + D.kills;


// =============================================================================================== VERSION 2 (14/11, defense-v2-proposition.html, validée par l'utilisateur)
// L'échelle suit les PV des monstres : un coup de héros ou un piège garde la même force relative à chaque vague.
const echelleD = D => Math.pow(DEF.hpVague, Math.min(D.vague, VAGUES.length - 1));
// ---- 0. Les coups de héros : Frappe et Technique touchent TOUT un chemin (avant : un monstre, quelques dégâts : « ça ne sert à rien »)
const TECH_DG = [0, 0, 0, 8, 14, 22];
function coupHeros(D, quoi, vs, col) {
  const mul = echelleD(D) * (1 + 0.25 * (D.bonus.coups || 0));
  const n = Math.round((quoi === 'frappe' ? vs[0] * vs.length * 2 : TECH_DG[vs.length]) * mul);
  const ms = D.monstres.filter(m => m.col === col);
  D.coups++; logD(D, `${quoi === 'frappe' ? '⚔ Frappe' : '⚔⚔ Technique'} (${vs.join('·')}) : ${n} sur tout le chemin${quoi === 'technique' ? ', et ils reculent' : ''}.`);
  fxD(D, { t:'coup', quoi, col, n });
  ms.forEach(m => { blesse(D, m, n); if (quoi === 'technique' && D.monstres.includes(m) && !MONSTRES[m.t].boss) m.row = Math.max(0, m.row - 1); });
}
// ---- 2. Les pièges : un dé posé sur une case de chemin vide (1 PC). 1 = boue (arrête un tour, 2 passages), 2-5 = ronces (valeur × 3), 6 = barricade (fait changer de chemin, 2 coups)
const PIEGES = {
  boue:{ n:'Boue', e:'🟫', d:'Le premier monstre qui marche dedans s’arrête un tour. Tient 2 passages.' },
  ronces:{ n:'Ronces', e:'🌿', d:'Le premier monstre qui passe prend la valeur du dé × 3 (plus fort à chaque vague).' },
  barricade:{ n:'Barricade', e:'🪨', d:'Bloque la case : le monstre part sur le chemin voisin le moins chargé. Tient 2 coups.' },
};
const sortePiege = v => v === 1 ? 'boue' : v === 6 ? 'barricade' : 'ronces';
const cleP = (r, col) => r + ',' + col;
function poserPiegeD(D, d, r, col) {
  if (D.fini) return 'Partie finie.'; if (!d || d.pose) return 'Choisis un dé.';
  if (r < 0 || r >= DEF.chemin) return 'Pose le piège sur une case de chemin.';
  if (D.pieges[cleP(r, col)]) return 'Il y a déjà un piège ici.';
  if (D.monstres.some(m => m.row === r && m.col === col)) return 'Un monstre est déjà sur cette case.';
  if (D.pc < DEF.coutBatir) return `Poser un piège coûte ${DEF.coutBatir} PC.`;
  D.pc -= DEF.coutBatir; d.pose = true; const k = sortePiege(d.v);
  D.pieges[cleP(r, col)] = { k, v:d.v, usages:k === 'boue' ? 2 + (D.bonus.boue || 0) : k === 'barricade' ? 2 : 1 };
  D.piegesPoses++; logD(D, `${PIEGES[k].e} ${PIEGES[k].n} posée sur le chemin ${col + 1}.`); fxD(D, { t:'piege', r, col });
}
const usePiege = (D, key) => { const p = D.pieges[key]; p.usages--; if (p.usages <= 0) delete D.pieges[key]; };
// un pas vers la porte ; renvoie true si le monstre s'arrête pour ce tour
function marcheD(D, m) {
  const M = MONSTRES[m.t], nr = m.row + 1, key = cleP(nr, m.col), p = nr < DEF.chemin ? D.pieges[key] : null;
  if (p && M.boss) { delete D.pieges[key]; logD(D, `🌋 Le Titan écrase ${PIEGES[p.k].n.toLowerCase()}.`); fxD(D, { t:'piegeCasse', r:nr, col:m.col }); }
  else if (p && p.k === 'barricade') {
    const voisins = [m.col - 1, m.col + 1].filter(c => c >= 0 && c <= 2 && !(D.pieges[cleP(m.row, c)] && D.pieges[cleP(m.row, c)].k === 'barricade'))
      .sort((a, b) => D.monstres.filter(x => x.col === a).length - D.monstres.filter(x => x.col === b).length || D.rng() - .5);
    usePiege(D, key); fxD(D, { t:'barricade', r:nr, col:m.col, id:m.id });
    if (voisins.length) { logD(D, `🪨 ${M.n} se heurte à la barricade et change de chemin.`); m.col = voisins[0]; }
    else logD(D, `🪨 ${M.n} cogne la barricade.`);
    return true;
  }
  else if (p && !M.vol && p.k === 'boue') { m.row = nr; m.colle = 1; usePiege(D, key); logD(D, `🟫 ${M.n} s’enlise dans la boue.`); fxD(D, { t:'boue', id:m.id }); return true; }
  else if (p && !M.vol && p.k === 'ronces') { const n = Math.round((p.v * 3 + (D.bonus.ronces || 0)) * echelleD(D)); usePiege(D, key); m.row = nr; logD(D, `🌿 Les ronces griffent ${M.n} : ${n}.`); fxD(D, { t:'ronces', r:nr, col:m.col }); blesse(D, m, n); return !D.monstres.includes(m); }
  m.row = nr;
  if (m.row >= DEF.chemin) { D.monstres = D.monstres.filter(x => x !== m); D.porte -= M.dg; D.degatsVague += M.dg; if (D.vague >= VAGUES.length - 1) D.degatsDerniere += M.dg; logD(D, `🚪 ${M.e} ${M.n} frappe la porte : −${M.dg >= 99 ? 'tout' : M.dg} PV.`); fxD(D, { t:'porte', n:M.dg }); verifieFinD(D); return true; }
  return false;
}
// ---- 1. La prochaine vague : ce qui arrive au prochain tour, et le reste de la vague en cours
function prochainesD(D) {
  if (D.vague >= VAGUES.length) return { tour:[], reste:[], vague:VAGUES.length, attente:0 };
  const V = VAGUES[D.vague];
  return { tour:D.repit > 0 ? [] : (V[D.pas] || []), reste:V.slice(D.repit > 0 ? D.pas : D.pas + 1).flat(), vague:D.vague + 1, attente:D.repit, neuve:D.pas === 0 };
}
// ---- 3. Un bonus entre deux vagues (1 parmi 3)
const BONUS_D = {
  forge:{ e:'🔧', n:'Forge', d:'Tous tes canons tirent +2, pour toute la partie.', f:D => { D.bonus.forge = (D.bonus.forge || 0) + 2; } },
  porte:{ e:'🧱', n:'Maçons', d:'La porte récupère 5 PV.', f:D => { D.porte = Math.min(D.porteMax, D.porte + 5); } },
  pc:{ e:'◆', n:'Trésor', d:'+2 PC tout de suite.', f:D => { D.pc = Math.min(DEF.pcMax, D.pc + 2); } },
  cartes:{ e:'🂠', n:'Messager', d:'Pioche 2 cartes.', f:D => piocheD(D, 2) },
  relance:{ e:'🎲', n:'Dés chanceux', d:'Une relance de plus à chaque tour.', f:D => { D.bonus.relance = (D.bonus.relance || 0) + 1; D.relance++; } },
  ronces:{ e:'🌿', n:'Épines', d:'Tes ronces font +3 (plus fort à chaque vague).', f:D => { D.bonus.ronces = (D.bonus.ronces || 0) + 3; } },
  coups:{ e:'⚔', n:'Bras de héros', d:'Tes coups de héros (Frappe, Technique) font +25 %.', f:D => { D.bonus.coups = (D.bonus.coups || 0) + 1; } },
  double:{ e:'🏹', n:'Salve', d:'Tous tes canons tirent deux fois au prochain tour.', f:D => { D.bonus.doubleProchain = true; } },
  repit:{ e:'⏳', n:'Répit', d:'La prochaine vague arrive un tour plus tard.', f:D => { D.repit += 1; } },
  boue:{ e:'🟫', n:'Marais', d:'Ta boue tient un passage de plus.', f:D => { D.bonus.boue = (D.bonus.boue || 0) + 1; } },
  acier:{ e:'🔥', n:'Acier trempé', heros:'maelle', d:'Tes canons de 5 et de 6 tirent +4 au lieu de +2.', f:D => { D.bonus.acier = true; } },
  echo:{ e:'📯', n:'Grand écho', heros:'gorm', d:'Chaque fusion donne +5 aux voisins au lieu de +3.', f:D => { D.bonus.echo = true; } },
};
function tirageBonus(D) {
  const ok = Object.keys(BONUS_D).filter(k => (!BONUS_D[k].heros || BONUS_D[k].heros === D.heros) && !((k === 'acier' || k === 'echo') && D.bonus[k]));
  return melangeD(ok, D.rng).slice(0, 3);
}
function choisirBonusD(D, k) { if (!D.choix || !D.choix.includes(k)) return 'Choisis un des bonus proposés.'; BONUS_D[k].f(D); D.choix = null; logD(D, `${BONUS_D[k].e} Bonus : ${BONUS_D[k].n}.`); }
// ---- 4. Trois étoiles : la victoire, la porte à 15 PV ou plus, le défi du jour (le même pour tout le monde ce jour-là)
const DEFIS_D = [
  { id:'canons4', n:'Gagner avec 4 canons au plus en même temps', ok:D => D.maxCanons <= 4 },
  { id:'sansCarte', n:'Gagner sans jouer une seule carte', ok:D => D.cartesJouees === 0 },
  { id:'pieges', n:'Poser au moins 6 pièges', ok:D => D.piegesPoses >= 6 },
  { id:'boss', n:'Aucun dégât à la porte pendant la dernière vague', ok:D => D.degatsDerniere === 0 },
  { id:'coups', n:'Placer au moins 5 coups de héros', ok:D => D.coups >= 5 },
];
function defiDuJourD(date) { const d = date || new Date(), j = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); return DEFIS_D[j % DEFIS_D.length]; }
function etoilesD(D, date) { if (D.fini !== 'gagne') return [false, false, false]; return [true, D.porte >= 15, defiDuJourD(date).ok(D)]; }
