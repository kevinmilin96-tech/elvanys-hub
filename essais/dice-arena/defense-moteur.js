// =============================================================================================== LA DÉFENSE DE LA PORTE · le MOTEUR (13/11)
// Proposition validée le 13/11 (defense-proposition.html, R&D rd-13-11.html) : 3 chemins, 9 cases de remparts (3 × 3), 6 vagues,
// le Titan de feu en boss (s’il atteint la porte, elle tombe), Maëlle et Gorm. La tour garde la FACE du dé et sa force DOUBLE à chaque niveau (1, 2, 4, 8, 16, 32) ;
// deux tours voisines identiques FUSIONNENT (+1) ; deux 6 donnent la RUNE du héros (choix de l'utilisateur).
// Moteur sans dessin (sert à l'écran defense.html et au simulateur outils/simuler-defense.mjs). Utilise donnees.js (HEROS, egaux, suite).
// Chiffres réglés au simulateur : ~/perso/dice-arena/Equilibrage-personnages.md (chapitre « La Défense de la porte »).

// 25/11 : VERSION 3 (defense-v3-proposition.html, choix de l'utilisateur) : chaque face de dé = une SORTE de tour (1 givre, 2 poison, 3 archers,
// 4 canon, 5 foudre, 6 grande tour) ; la force vient du NIVEAU (fusion de deux tours pareilles, ou un dé de sa face posé dessus) ;
// deux tours au niveau max qui se touchent = une RUNE, qui ne tire pas mais RENFORCE ses voisines avec le pouvoir du héros ;
// PLUS DE CARTES ; 1 PC tous les 3 monstres abattus ; les relances restent (2 par tour).
const DEF = {
  porte:20, pcDepart:2, pcMax:6, relances:2, jaugeMax:8, chemin:4, nivMax:4, killsPC:3, runeSoutien:0.5, // le chemin a 4 cases (rangées 0 à 3)
  hpVague:1.7, hpBase:3.9, coutBatir:1, repit:0, runeGorm:15, runeMaelle:0.75, // v2 : bonus de la Rune de Gorm aux voisins (× niveau au-dessus de 6) ; part des dégâts de la Rune de Maëlle sur chaque monstre du chemin // PV des monstres × hpBase × hpVague^(vague) ; bâtir (poser un dé en tour, ou dans une tour) coûte 1 PC
};
// la force d'une tour selon son niveau (1 à 4), avant le multiplicateur de sa sorte
const BASE_NIV = [0, 10, 22, 46, 95];
const SORTES = {
  1:{ n:'Tour de givre', e:'❄', mul:0.6, d:'Gèle sa cible : au prochain pas, elle avance d’une case de moins (le Titan ne gèle pas).' },
  2:{ n:'Tour de poison', e:'☠', mul:0.4, poison:0.8, d:'Empoisonne sa cible : le poison la ronge à chaque tour (il traverse l’armure, puis faiblit de moitié).' },
  3:{ n:'Tour d’archers', e:'🏹', mul:0.6, d:'Tire deux flèches, et voit les chauves-souris même en première ligne.' },
  4:{ n:'Canon', e:'💣', mul:1, eclats:0.5, d:'Touche sa cible et, à moitié, les monstres juste devant et derrière elle.' },
  5:{ n:'Tour de foudre', e:'⚡', mul:0.9, saut:0.6, d:'L’éclair saute sur le monstre de tête d’un chemin voisin.' },
  6:{ n:'Grande tour', e:'🗼', mul:1.4, perce:true, d:'Le plus gros tir sur un seul monstre ; traverse l’armure.' },
};
const ETOILES_MAX = 5, ETOILE = 0.35; // 27/11 : étoiles de maîtrise (dé de la même face sur une tour au niveau max : +20 % par étoile, effet renforcé à 5)
const NIV_MAX = DEF.nivMax, RUNE_MAX = 3, NOM_RUNE = rv => ({ 1:'Rune', 2:'Rune ancienne', 3:'Rune légendaire' })[rv] || '';
const nomTourD = t => t.rune ? NOM_RUNE(t.rv) : `${SORTES[t.v].n} niv. ${t.niv}`;
const MONSTRES = {
  gobelin:{ n:'Gobelin', e:'👺', pv:5, vit:2, dg:2, d:'Peu de PV, rapide : avance de 2 cases.' },
  sanglier:{ n:'Sanglier', e:'🐗', pv:16, vit:1, dg:4, d:'Beaucoup de PV, lent.' },
  bouclier:{ n:'Porte-bouclier', e:'🛡', pv:10, vit:1, dg:3, armure:3, d:'Chaque tir sur lui fait 3 de moins.' },
  chauve:{ n:'Chauve-souris', e:'🦇', pv:6, vit:1, dg:2, vol:true, d:'Vole : la tour de devant de sa colonne ne la voit pas.' },
  titan:{ n:'Titan de feu', e:'🌋', pv:1400, vit:1, lent:2, dg:99, boss:true, fond:true, d:'Le boss : avance d’une case tous les 2 tours et fait fondre la tour la plus faible de sa colonne (−1 niveau) à chaque tour.' },
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
// 15/11 soir (l'utilisateur : « tu fais des équilibrages généraux, pas individuels ») : LA FICHE DE RÉGLAGE DE CHAQUE HÉROS.
// Tous les chiffres propres à un héros sont ici, réglés UN PAR UN au simulateur (simuler-defense.mjs avec HEROS=… et REG=…), cible ≈ 70 % de victoires.
// Les dégâts des Pouvoirs et Ultimes sont multipliés par l'échelle des vagues (×1,7 par vague).
const REG = {
  maelle: { passif:2, acier:4, pouvoirX:3, ultime:70 },                        // 74 % (gardé)                       // passif : +2 aux canons de 5-6 (Acier trempé : +4) ; Pouvoir = pouvoirX × la somme des 3 dés
  gorm:   { echo:6, echoBonus:10, pouvoir:40, cri:2, ultime:60 },  // v3 (25/11) : 49 % → 70 %   // 90 % → 73 % // echo : bonus aux voisines à chaque fusion ; runeVoisins : par niveau de Rune au-dessus de 6
  aldric: { porte:6, porteVague:4, titan:4, /* v3 : 56 % → 71 % */ pouvoirPorte:8, pouvoirCri:12, ultime:60, ultimePorte:6 }, // 47 % → 71 %
  pip:    { ronces:1.5, pouvoir:9, ultime:40 }, // v3 (25/11) : 63 % → ≈ 70 %                                 // 63-68 % (gardé)
  oria:   { passif:1, eclat:12, ultime:20, pc:2, relance:1 }, // 93 % → 86-88 % : sa force de base vient de son paquet + Runes à pleine force (78 % sans aucune capacité), à revoir                                    // eclat : les tirs touchent aussi la tête des autres chemins (puissance ÷ eclat)
  zephine:{ passif:2, pouvoir:12, ultime:12, ultimeRecul:2 },                    // 91 % → 69 %
};
// les héros de la Défense (leurs Pouvoirs et Ultimes gardent les conditions du Duel ; les effets sont adaptés aux vagues)
const DHEROS = {
  maelle:{ passif:'Métal chaud : tes tours de foudre ⚡ et tes grandes tours 🗼 tirent +2.',
    pouvoir:{ n:'Coup d’enclume', txt:'3 dés identiques', d:'Dégâts égaux à 3 fois leur somme sur un monstre (54 dégâts avec trois 6).', cond:vs => vs.length === 3 && egaux(vs), cible:'monstre' },
    ultime:{ n:'Le Grand Martelage', txt:'3 dés de 4 ou plus', d:'70 dégâts à un monstre, et toutes tes tours tirent deux fois ce tour.', cond:vs => vs.length === 3 && vs.every(v => v >= 4), cible:'monstre' },
    rune:{ n:'Enclume runique', d:'Ses tours voisines tirent +50 %, et chacun de leurs tirs frappe aussi tous les autres monstres de leur chemin (moitié de la force).' } },
  gorm:{ passif:'Écho du cor : chaque fusion donne +2 aux tours voisines jusqu’à la fin du tour.',
    pouvoir:{ n:'Chant de guerre', txt:'4 dés tous pairs ou tous impairs', d:'20 dégâts à un monstre, et toutes tes tours +2 ce tour.', cond:vs => vs.length === 4 && (vs.every(v => v % 2 === 0) || vs.every(v => v % 2 === 1)), cible:'monstre' },
    ultime:{ n:'Le Grand Souffle', txt:'3 dés tous pairs ou tous impairs', d:'30 dégâts au monstre de tête de chaque chemin.', cond:vs => vs.length === 3 && (vs.every(v => v % 2 === 0) || vs.every(v => v % 2 === 1)) },
    rune:{ n:'Grand Cor', d:'Ses tours voisines tirent deux fois plus fort (+100 %, +200 % ancienne, +300 % légendaire).' } },
};
// 16/11 nuit (l'utilisateur : « regarde les autres modes, ce que tu peux apporter », ex. la Défense) : LES 4 AUTRES HÉROS
const deuxPaires = vs => { if (vs.length !== 4) return false; const s = [...vs].sort((a, b) => a - b); return s[0] === s[1] && s[2] === s[3]; };
Object.assign(DHEROS, {
  aldric:{ passif:'Rempart béni : la porte a +6 PV et en reprend 4 à chaque vague ; tes canons font +150 % au Titan.',
    pouvoir:{ n:'Bouclier de lumière', txt:'2 paires', d:'La porte reprend 8 PV, et tous tes canons tirent +12 ce tour.', cond:vs => deuxPaires(vs) },
    ultime:{ n:'Jugement', txt:'5 dés tous différents', d:'60 dégâts à chaque monstre, et la porte reprend 6 PV.', cond:vs => vs.length === 5 && new Set(vs).size === 5 },
    rune:{ n:'Phare sacré', d:'Ses tours voisines tirent +50 %, et la porte reprend 1 PV à chaque tour (2 ancienne, 3 légendaire).' } },
  pip:{ passif:'Ronces vivantes : tes pièges de ronces font 50 % de plus.',
    pouvoir:{ n:'Racines', txt:'2 dés qui se suivent', d:'Les monstres d’un chemin (sauf le Titan) restent sur place un tour et prennent 6 dégâts.', cond:vs => vs.length === 2 && Math.abs(vs[0] - vs[1]) === 1, cible:'monstre' },
    ultime:{ n:'Forêt vivante', txt:'4 dés tous différents', d:'Tous les monstres (sauf le Titan) restent sur place un tour, et chacun prend 30 dégâts.', cond:vs => vs.length === 4 && new Set(vs).size === 4 },
    rune:{ n:'Arbre-cœur', d:'Ses tours voisines tirent +50 %, et leurs racines retiennent leur cible un tour (sauf le Titan).' } },
  oria:{ passif:'Longue-vue : tes canons de la dernière rangée (contre la porte) tirent +1.',
    pouvoir:{ n:'Repérage', txt:'un 1 et un 6', d:'+2 PC et une relance de plus ce tour.', cond:vs => vs.length === 2 && vs.includes(1) && vs.includes(6) },
    ultime:{ n:'Pluie d’étoiles', txt:'3 dés impairs', d:'20 dégâts au premier monstre de deux chemins : celui que tu touches et son voisin.', cond:vs => vs.length === 3 && vs.every(v => v % 2 === 1), cible:'monstre' },
    rune:{ n:'Astrolabe', d:'Ses tours voisines tirent +50 %, et chacun de leurs tirs touche aussi le monstre de tête des deux autres chemins (un quart de la force).' } },
  zephine:{ passif:'Vent glacé : tes tours de givre ❄, de poison ☠ et d’archers 🏹 tirent +2.',
    pouvoir:{ n:'Rafale', txt:'3 dés qui se suivent', d:'Les monstres d’un chemin reculent d’une case et prennent 12 dégâts.', cond:vs => suite(vs, 3), cible:'monstre' },
    ultime:{ n:'Tempête', txt:'deux 6', d:'Tous les monstres (sauf le Titan) reculent de 2 cases et prennent 12 dégâts.', cond:vs => vs.length === 2 && vs[0] === 6 && vs[1] === 6 },
    rune:{ n:'Œil du cyclone', d:'Ses tours voisines tirent +50 %, et leur cible recule d’une case (sauf le Titan).' } },
});
const dgC = (D, n) => Math.round(n * echelleD(D));
// les « N dégâts » d'un Pouvoir ou d'un Ultime, à la valeur de la vague en cours
const texteCoupD = (D, t) => String(t).replace(/(\d+) dégâts/g, (x, n) => `${dgC(D, +n)} dégâts`);

// ---------------------------------------------------------------- la partie
let DID = 0;
function melangeD(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function nouvelleDefense(heros, rng) {
  rng = rng || Math.random;
  const D = { v3:true, heros, rng, porte:DEF.porte, porteMax:DEF.porte, pc:DEF.pcDepart, des:[], relance:0, sortesVues:[], killsPC:0,
    rempart:Array(9).fill(null), monstres:[], vague:0, pas:0, repit:0, tour:0, jauge:0, ultimeFait:false, deplace:false, double:false, cri:0,
    kills:0, sansDegats:0, degatsVague:0, log:[], fini:null, fx:[],
    pieges:{}, bonus:{}, choix:null, piegesPoses:0, coups:0, maxCanons:0, degatsDerniere:0 };
  if (heros === 'aldric') { D.porte += REG.aldric.porte; D.porteMax += REG.aldric.porte; }
  apparitionsD(D); debutTourD(D); return D;
}
const logD = (D, t) => { D.log.unshift(t); if (D.log.length > 120) D.log.length = 120; };
const fxD = (D, e) => { D.fx.push(e); };
function lanceD(D, d) { d.v = 1 + Math.floor(D.rng() * 6); }
function debutTourD(D) {
  D.tour++;
  if (D.tour > 1) D.pc = Math.min(DEF.pcMax, D.pc + 1);
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
function poseTour(D, c, v) { D.rempart[c] = { id:++DID, v, niv:1, rune:false, rv:0, tmp:0, bonus:0 }; if (!D.sortesVues.includes(v)) D.sortesVues.push(v); }
// bâtir : un dé sur une case libre = une tour de la sorte de sa face (niveau 1) ; sur une tour de la même sorte : elle monte d'un niveau
function batirD(D, d, c) {
  if (D.fini) return 'Partie finie.'; if (!d || d.pose) return 'Choisis un dé.';
  const t = D.rempart[c];
  if (D.pc < DEF.coutBatir) return `Bâtir coûte ${DEF.coutBatir} PC (vends un dé pour en gagner).`;
  if (t && t.rune) return 'Une Rune ne prend pas de dé : fusionne-la avec une autre Rune du même niveau.';
  if (t && t.v !== d.v) return `Cette ${SORTES[t.v].n.toLowerCase()} monte avec un dé de ${t.v}.`;
  if (t && t.niv >= NIV_MAX && (t.et || 0) >= ETOILES_MAX) return `Tour au maximum (${'★'.repeat(ETOILES_MAX)}) : elle ne peut plus monter.`;
  D.pc -= DEF.coutBatir; d.pose = true;
  if (!t) { poseTour(D, c, d.v); logD(D, `${SORTES[d.v].e} ${SORTES[d.v].n} bâtie.`); fxD(D, { t:'batit', c }); return; }
  if (t.niv >= NIV_MAX) { t.et = (t.et || 0) + 1; logD(D, `${SORTES[t.v].e} ${SORTES[t.v].n} : étoile de maîtrise ${'★'.repeat(t.et)}${t.et >= ETOILES_MAX ? ' (effet renforcé !)' : ''}.`); fxD(D, { t:'fusion', c }); echoGorm(D, c); return; }
  t.niv++; logD(D, `${SORTES[t.v].e} ${SORTES[t.v].n} : niveau ${t.niv}.`); fxD(D, { t:'fusion', c }); echoGorm(D, c); return;
}
const echoGorm = (D, c) => { if (D.heros === 'gorm') voisinsD(c).forEach(x => { if (D.rempart[x]) D.rempart[x].tmp += D.bonus.echo ? REG.gorm.echoBonus : REG.gorm.echo; }); };
// fusionner deux tours voisines : même sorte et même niveau → niveau +1 ; deux tours au niveau max (n'importe quelle sorte) → une Rune ;
// deux Runes du même niveau → Rune ancienne, puis légendaire
function fusionD(D, a, b) {
  if (D.fini) return 'Partie finie.';
  const ta = D.rempart[a], tb = D.rempart[b];
  if (!ta || !tb) return 'Il faut deux tours.'; if (!voisinsD(a).includes(b)) return 'Les deux tours doivent se toucher.';
  if (ta.rune || tb.rune) {
    if (!(ta.rune && tb.rune) || ta.rv !== tb.rv) return 'Une Rune fusionne seulement avec une Rune du même niveau.';
    if (tb.rv >= RUNE_MAX) return 'La Rune légendaire est au plus haut.';
    tb.rv++;
  } else if (ta.niv >= NIV_MAX && tb.niv >= NIV_MAX) { tb.rune = true; tb.rv = 1; tb.v = 0; tb.bonus = 0; }
  else if (ta.v !== tb.v) return 'Il faut deux tours de la même sorte (ou deux tours au niveau max pour une Rune).';
  else if (ta.niv !== tb.niv) return 'Il faut deux tours du même niveau.';
  else { tb.niv++; tb.bonus = (tb.bonus || 0) + (ta.bonus || 0); }
  D.rempart[a] = null;
  logD(D, tb.rune ? `✨ ${NOM_RUNE(tb.rv).toUpperCase()} ${DHEROS[D.heros].rune.n} !` : `Fusion : ${nomTourD(tb)}.`); fxD(D, { t:tb.rune ? 'rune' : 'fusion', c:b });
  echoGorm(D, b);
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
  if (m.pv <= 0) { D.monstres = D.monstres.filter(x => x !== m); D.kills++; if (!D.ultimeFait) D.jauge = Math.min(DEF.jaugeMax, D.jauge + 1);
    if (++D.killsPC >= DEF.killsPC) { D.killsPC = 0; if (D.pc < DEF.pcMax) { D.pc++; fxD(D, { t:'pc', n:1 }); logD(D, `◆ ${DEF.killsPC} monstres abattus : +1 PC.`); } } logD(D, `${M.e} ${M.n} tombe.`); fxD(D, { t:'mort', id:m.id }); verifieFinD(D); }
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
  return false;
}
const cibleDe = (D, quoi) => { if (quoi === 'frappe' || quoi === 'technique') return 'monstre'; if (quoi === 'vendre') return null; const H = DHEROS[D.heros]; if (quoi === 'pouvoir') return H.pouvoir.cible || null; if (quoi === 'ultime') return H.ultime.cible || null; return null; };
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
    const e = echelleD(D), colM = k && k.m ? k.m.col : 0, recule = (m, n) => { if (D.monstres.includes(m) && !MONSTRES[m.t].boss) m.row = Math.max(0, m.row - n); };
    // 15/11 soir (l'utilisateur : « Frappe avec deux dés c'est 147, les autres plus durs font quasi rien ») : tout suit l'échelle des vagues
    if (D.heros === 'maelle') blesse(D, k.m, Math.round(vs.reduce((a, b) => a + b, 0) * REG.maelle.pouvoirX * e));
    else if (D.heros === 'gorm') { blesse(D, k.m, Math.round(REG.gorm.pouvoir * e)); D.cri += REG.gorm.cri; }
    else if (D.heros === 'aldric') { D.porte = Math.min(D.porteMax, D.porte + REG.aldric.pouvoirPorte); D.cri += REG.aldric.pouvoirCri; }
    else if (D.heros === 'pip') D.monstres.filter(m => m.col === colM).forEach(m => { if (!MONSTRES[m.t].boss) m.colle = Math.max(m.colle || 0, 1); blesse(D, m, Math.round(REG.pip.pouvoir * e)); });
    else if (D.heros === 'oria') { D.pc = Math.min(DEF.pcMax, D.pc + REG.oria.pc); D.relance += REG.oria.relance; }
    else if (D.heros === 'zephine') D.monstres.filter(m => m.col === colM).forEach(m => { blesse(D, m, Math.round(REG.zephine.pouvoir * e)); recule(m, 1); });
    return; }
  if (quoi === 'ultime') { D.pc -= 3; D.ultimeFait = true; D.jauge = 0; logD(D, `⚡ ULTIME : ${H.ultime.n} !`); fxD(D, { t:'annonce', txt:H.ultime.n });
    const e = echelleD(D), tous = () => [...D.monstres];
    const u = n => Math.round(n * e);
    if (D.heros === 'maelle') { blesse(D, k.m, u(REG.maelle.ultime)); D.double = true; }
    else if (D.heros === 'gorm') [0, 1, 2].forEach(col => { const m = teteD(D, col); if (m) blesse(D, m, u(REG.gorm.ultime)); });
    else if (D.heros === 'aldric') { tous().forEach(m => blesse(D, m, u(REG.aldric.ultime))); D.porte = Math.min(D.porteMax, D.porte + REG.aldric.ultimePorte); }
    else if (D.heros === 'pip') tous().forEach(m => { if (!MONSTRES[m.t].boss) m.colle = Math.max(m.colle || 0, 1); blesse(D, m, u(REG.pip.ultime)); });
    else if (D.heros === 'oria') { const c = k.m.col, cols = [c, c === 2 ? 1 : c + 1]; cols.forEach(cc => { const m = teteD(D, cc); if (m) blesse(D, m, u(REG.oria.ultime)); }); }
    else if (D.heros === 'zephine') tous().forEach(m => { blesse(D, m, u(REG.zephine.ultime)); if (D.monstres.includes(m) && !MONSTRES[m.t].boss) m.row = Math.max(0, m.row - REG.zephine.ultimeRecul); });
    return; }
}
const teteD = (D, col, sauf) => D.monstres.filter(m => m.col === col && m !== sauf).sort((a, b) => b.row - a.row || a.id - b.id)[0];

// ---------------------------------------------------------------- la fin du tour : les tours tirent, les monstres avancent, la vague continue
function verifieFinD(D) {
  if (D.fini) return;
  if (D.porte <= 0) { D.porte = 0; D.fini = 'perdu'; logD(D, '💥 La porte est tombée…'); return; }
  if (D.sansFin) return;
  if (D.vague >= VAGUES.length && !D.monstres.length) { D.fini = 'gagne'; logD(D, '🏆 La porte a tenu !'); }
}
// les Runes voisines d'une case (elles ne tirent pas : elles renforcent)
const runesVoisD = (D, c) => voisinsD(c).map(x => D.rempart[x]).filter(u => u && u.rune);
function puissanceTour(D, c, t) {
  if (t.rune) return 0;
  let n = BASE_NIV[t.niv] + (t.bonus || 0) + (t.tmp || 0) + D.cri + (D.bonus.forge || 0);
  if (D.heros === 'maelle' && t.v >= 5) n += D.bonus.acier ? REG.maelle.acier : REG.maelle.passif;
  if (D.heros === 'oria' && rangD(c) === 2) n += REG.oria.passif;
  if (D.heros === 'zephine' && t.v <= 3) n += REG.zephine.passif;
  let mul = SORTES[t.v].mul * (1 + ETOILE * (t.et || 0));
  runesVoisD(D, c).forEach(u => { mul *= 1 + (D.heros === 'gorm' ? 1 : DEF.runeSoutien) * u.rv; });
  return Math.max(1, Math.round(n * mul));
}
// un tir d'une tour sur un monstre, avec l'effet de sa sorte et celui des Runes voisines
function tirSurD(D, c, t, m, pw) {
  const S = SORTES[t.v], boss = MONSTRES[m.t].boss, col = m.col, row = m.row, max5 = (t.et || 0) >= ETOILES_MAX;
  fxD(D, { t:'tir', c, id:m.id });
  blesse(D, m, D.heros === 'aldric' && boss ? Math.round(pw * REG.aldric.titan) : pw, !S.perce);
  const vivant = D.monstres.includes(m);
  if (S.poison && vivant) m.poison = (m.poison || 0) + Math.round(pw / S.mul * S.poison * (max5 ? 1.5 : 1));
  if (t.v === 1 && vivant && !boss) m.gel = Math.max(m.gel || 0, max5 ? 2 : 1);
  if (S.eclats) D.monstres.filter(x => x !== m && x.col === col && Math.abs(x.row - row) <= 1).forEach(x => blesse(D, x, Math.round(pw * (max5 ? 1 : S.eclats)), true));
  if (S.saut) { const os = [col - 1, col + 1].filter(x => x >= 0 && x <= 2).map(x => teteD(D, x)).filter(Boolean).sort((a, b) => b.row - a.row).slice(0, max5 ? 2 : 1); os.forEach(o => { fxD(D, { t:'tir', c, id:o.id }); blesse(D, o, Math.round(pw * S.saut), true); }); }
  if (S.perce && max5) { const o = D.monstres.filter(x => x !== m && x.col === col && x.row < row).sort((a, b) => b.row - a.row)[0]; if (o) { fxD(D, { t:'tir', c, id:o.id }); blesse(D, o, Math.round(pw * .5), false); } }
  runesVoisD(D, c).forEach(u => {
    if (D.heros === 'maelle') D.monstres.filter(x => x !== m && x.col === col).forEach(x => blesse(D, x, Math.round(pw * .5), true));
    if (D.heros === 'oria') [0, 1, 2].filter(x => x !== col).forEach(x => { const o = teteD(D, x); if (o) { fxD(D, { t:'tir', c, id:o.id }); blesse(D, o, Math.round(pw / REG.oria.eclat), true); } });
    if (D.monstres.includes(m) && !boss) { if (D.heros === 'pip') m.colle = Math.max(m.colle || 0, 1); if (D.heros === 'zephine' && !m.recule) { m.row = Math.max(0, m.row - 1); m.recule = true; } }
  });
}
function tirsD(D) {
  D.monstres.forEach(m => { m.recule = false; });
  for (let fois = 0; fois < (D.double ? 2 : 1); fois++)
    for (const r of [0, 1, 2]) for (const col of [0, 1, 2]) {
      if (D.fini) return;
      const c = r * 3 + col, t = D.rempart[c]; if (!t || t.rune) continue;
      // la chauve-souris : la tour de devant (la première de la colonne) ne la voit pas, sauf les archers
      const devant = [0, 1, 2].map(rr => rr * 3 + col).find(x => D.rempart[x] && !D.rempart[x].rune);
      const cible = () => D.monstres.filter(x => x.col === col && !(MONSTRES[x.t].vol && devant === c && t.v !== 3)).sort((a, b) => b.row - a.row || a.id - b.id)[0];
      const pw = puissanceTour(D, c, t);
      for (let k = 0; k < (t.v === 3 ? ((t.et || 0) >= ETOILES_MAX ? 3 : 2) : 1); k++) { const m = cible(); if (!m || D.fini) break; tirSurD(D, c, t, m, pw); }
    }
  if (D.fini) return;
  // le poison ronge (il traverse l'armure), puis faiblit de moitié
  [...D.monstres].forEach(m => { if (m.poison > 0) { const n = m.poison; m.poison = Math.floor(m.poison / 2); fxD(D, { t:'poison', id:m.id }); blesse(D, m, n); } });
  // le Phare sacré d'Aldric : la porte reprend des PV
  if (D.heros === 'aldric') D.rempart.forEach(u => { if (u && u.rune) D.porte = Math.min(D.porteMax, D.porte + u.rv); });
}
function avanceD(D) {
  for (const m of [...D.monstres]) {
    const M = MONSTRES[m.t];
    if (M.fond) { // le Titan fait fondre la tour la plus faible de sa colonne
      const poids = t => t.rune ? 10 + t.rv : t.niv;
      const cs = [0, 1, 2].map(r => r * 3 + m.col).filter(c => D.rempart[c]).sort((a, b) => poids(D.rempart[a]) - poids(D.rempart[b]));
      if (cs.length) { const t = D.rempart[cs[0]], nom = nomTourD(t); if (t.rune) t.rv--; else t.niv--; const reste = t.rune ? t.rv : t.niv;
        logD(D, `🌋 Le Titan fait fondre ${nom}${reste ? '' : ' : détruite'}.`); fxD(D, { t:'fond', c:cs[0] }); if (reste <= 0) D.rempart[cs[0]] = null; }
    }
    if (M.lent) { m.attente = (m.attente || 0) + 1; if (m.attente < M.lent) continue; m.attente = 0; }
    if (m.colle > 0) { m.colle--; continue; }
    const vit = M.vit - (m.gel || 0); m.gel = 0; // 25/11 (v3) : la tour de givre retire un pas
    for (let pas = 0; pas < vit && D.monstres.includes(m) && m.row < DEF.chemin; pas++) { if (marcheD(D, m)) break; }
    if (D.fini) return;
    if (!D.monstres.includes(m)) continue;
    if (m.row >= DEF.chemin) { D.monstres = D.monstres.filter(x => x !== m); D.porte -= M.dg; D.degatsVague += M.dg; if (D.vague >= VAGUES.length - 1) D.degatsDerniere += M.dg; logD(D, `🚪 ${M.e} ${M.n} frappe la porte : −${M.dg} PV.`); fxD(D, { t:'porte', n:M.dg }); verifieFinD(D); if (D.fini) return; }
  }
}
// 16/11 nuit : LE MODE SANS FIN (vagues tirées des vagues 3 à 5, de plus en plus fortes ; le Titan revient toutes les 6 vagues, plus coriace)
function vagueSansFin(D) {
  if (!D.vaguesSF) D.vaguesSF = {};
  if (!D.vaguesSF[D.vague]) { const base = VAGUES[2 + Math.floor(D.rng() * 3)].map(x => x.slice()); if ((D.vague + 1) % 6 === 0) base[0] = ['titan', ...base[0]]; D.vaguesSF[D.vague] = base; }
  return D.vaguesSF[D.vague];
}
function apparitionsD(D) {
  if (D.vague >= VAGUES.length && !D.sansFin) return;
  if (D.repit > 0) { D.repit--; return; }
  const V = D.vague < VAGUES.length ? VAGUES[D.vague] : vagueSansFin(D);
  if (D.pas === 0) { logD(D, `🌊 Vague ${D.vague + 1} sur ${VAGUES.length}${D.vague === VAGUES.length - 1 ? ' : le Titan de feu !' : ''}`); fxD(D, { t:'vague', n:D.vague + 1 }); D.degatsVague = 0; }
  const cols = melangeD([0, 1, 2], D.rng);
  (V[D.pas] || []).forEach((t, i) => { const M = MONSTRES[t]; const pv = M.boss ? Math.round(M.pv * (1 + .6 * Math.floor(D.vague / 6))) : Math.round(M.pv * DEF.hpBase * Math.pow(DEF.hpVague, D.sansFin && D.vague >= VAGUES.length ? VAGUES.length - 1 + (D.vague - VAGUES.length + 1) * .6 : D.vague)); /* le boss a des PV fixes */ const pvF = Math.round(pv * (D.fs || 1)); /* 15/11 soir : × la force du héros */ D.monstres.push({ id:++DID, t, pv:pvF, pvMax:pvF, col:cols[i % 3], row:0 }); });
  D.pas++;
  if (D.pas >= V.length) { if (!D.degatsVague) D.sansDegats++; D.vague++; if (D.heros === 'aldric') D.porte = Math.min(D.porteMax, D.porte + REG.aldric.porteVague); if (typeof guildeEvt === 'function') guildeEvt('defense_vague', 1); D.pas = 0; D.repit = DEF.repit; if (D.vague < VAGUES.length || D.sansFin) D.choix = tirageBonus(D); }
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
const echelleD = D => Math.pow(DEF.hpVague, D.sansFin && D.vague >= VAGUES.length ? VAGUES.length - 1 + (D.vague - VAGUES.length + 1) * .6 : Math.min(D.vague, VAGUES.length - 1));
// ---- 0. Les coups de héros : Frappe et Technique touchent TOUT un chemin (avant : un monstre, quelques dégâts : « ça ne sert à rien »)
const TECH_DG = [0, 0, 0, 22, 34, 50]; // 15/11 soir : avant 8 / 14 / 22, moins qu'une paire de 6 (24) alors qu'une suite est plus dure
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
  else if (p && !M.vol && p.k === 'ronces') { const n = Math.round((p.v * 3 + (D.bonus.ronces || 0)) * echelleD(D) * (D.heros === 'pip' ? REG.pip.ronces : 1)); usePiege(D, key); m.row = nr; logD(D, `🌿 Les ronces griffent ${M.n} : ${n}.`); fxD(D, { t:'ronces', r:nr, col:m.col }); blesse(D, m, n); return !D.monstres.includes(m); }
  m.row = nr;
  if (m.row >= DEF.chemin) { D.monstres = D.monstres.filter(x => x !== m); D.porte -= M.dg; D.degatsVague += M.dg; if (D.vague >= VAGUES.length - 1) D.degatsDerniere += M.dg; logD(D, `🚪 ${M.e} ${M.n} frappe la porte : −${M.dg >= 99 ? 'tout' : M.dg} PV.`); fxD(D, { t:'porte', n:M.dg }); verifieFinD(D); return true; }
  return false;
}
// ---- 1. La prochaine vague : ce qui arrive au prochain tour, et le reste de la vague en cours
function prochainesD(D) {
  if (D.vague >= VAGUES.length && !D.sansFin) return { tour:[], reste:[], vague:VAGUES.length, attente:0 };
  const V = D.vague < VAGUES.length ? VAGUES[D.vague] : vagueSansFin(D);
  return { tour:D.repit > 0 ? [] : (V[D.pas] || []), reste:V.slice(D.repit > 0 ? D.pas : D.pas + 1).flat(), vague:D.vague + 1, attente:D.repit, neuve:D.pas === 0 };
}
// ---- 3. Un bonus entre deux vagues (1 parmi 3)
const BONUS_D = {
  forge:{ e:'🔧', n:'Forge', d:'Tous tes canons tirent +2, pour toute la partie.', f:D => { D.bonus.forge = (D.bonus.forge || 0) + 2; } },
  porte:{ e:'🧱', n:'Maçons', d:'La porte récupère 5 PV.', f:D => { D.porte = Math.min(D.porteMax, D.porte + 5); } },
  pc:{ e:'◆', n:'Trésor', d:'+2 PC tout de suite.', f:D => { D.pc = Math.min(DEF.pcMax, D.pc + 2); } },
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
  { id:'sortes', n:'Bâtir au moins 4 sortes de tours différentes', ok:D => (D.sortesVues || []).length >= 4 },
  { id:'pieges', n:'Poser au moins 4 pièges', ok:D => D.piegesPoses >= 4 }, // 25/11 (l'utilisateur : « 3 pièges, impossible d'en avoir 6 »)
  { id:'boss', n:'Aucun dégât à la porte pendant la dernière vague', ok:D => D.degatsDerniere === 0 },
  { id:'coups', n:'Placer au moins 5 coups de héros', ok:D => D.coups >= 5 },
];
function defiDuJourD(date) { const d = date || new Date(), j = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); return DEFIS_D[j % DEFIS_D.length]; }
function etoilesD(D, date) { if (D.fini !== 'gagne') return [false, false, false]; return [true, D.porte >= 15, defiDuJourD(date).ok(D)]; }
