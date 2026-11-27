// =============================================================================================== LE REMPART DES RUNES · le MOTEUR (27/11)
// Tower defense EN TEMPS RÉEL façon Plants vs Zombies (règles : ~/perso/dice-arena/Rempart-des-runes-regles.md, décisions du 27/11).
// 5 chemins verticaux, 5 cases de tours par chemin au-dessus du rempart. Les monstres descendent en continu ; chaque tour tire tout droit
// vers le haut, sur son chemin. On ACHÈTE les tours avec l'énergie ◆ ; les DÉS (un toutes les 8 s, réserve de 3) font MONTER une tour de leur face ;
// une PAIRE de dés = une Tour-rune. Le PUITS DE RUNES produit de l'énergie. Moteur pur, sans dessin, déterministe par graine
// (écran : rempart.html ; simulateur : ~/perso/dice-arena/outils/simuler-rempart.mjs). La Défense de la porte (defense-moteur.js) n'est pas touchée :
// ses sortes de tours et ses monstres sont recopiés ici, avec des chiffres pour le temps réel.
(function (racine) {
'use strict';
const PAS = 0.1;                    // pas de temps fixe (secondes)
const NC = 5, NR = 5;               // 5 chemins, 5 cases de tours par chemin (rangée 0 = contre le rempart, 4 = la plus haute)
const HAUT = 10;                    // les monstres naissent à y = 10 (cases), le rempart est à y = 0 ; les tours sont entre 0 et 5
const R = {
  rempart:20, energieDepart:8, energieMax:60, regenE:2.4 /* s par ◆ */, deDelai:8, desMax:3, jaugeMax:14,
  niv:[0, 1, 1.75, 2.8, 4.2], nivMax:4, etoileMax:5, etoile:0.35, pouvoirRecharge:20,
  runeBonus:0.25, pv:5, runeMax:3, puitsDelai:6, comboBonus:0.3, bowling:90,
};
// les sortes de tours (une par face de dé) : prix en ◆, cadence (s), dégâts au niveau 1
const SORTES = {
  1:{ n:'Tour de givre', e:'❄', prix:4, cad:1.4, dg:3, d:'Ralentit sa cible de moitié pendant 2 s (les boss ne ralentissent pas).' },
  2:{ n:'Tour de poison', e:'☠', prix:4, cad:1.8, dg:2, poison:2.2, d:'Empoisonne sa cible 4 s : le poison traverse l’armure et empêche le troll de se soigner (le golem de pierre ne s’empoisonne pas).' },
  3:{ n:'Tour d’archers', e:'🏹', prix:3, cad:1.0, dg:3, fleches:2, d:'Deux flèches à chaque tir. Elle voit les chauves-souris.' },
  4:{ n:'Canon', e:'💣', prix:5, cad:2.0, dg:9, eclats:0.5, d:'Gros boulet ; les éclats touchent à moitié les monstres tout proches. Il ne touche pas les monstres qui volent.' },
  5:{ n:'Tour de foudre', e:'⚡', prix:5, cad:1.6, dg:7, saut:0.6, d:'L’éclair saute sur un monstre d’un chemin voisin. Elle voit le spectre même invisible.' },
  6:{ n:'Grande tour', e:'🗼', prix:6, cad:2.5, dg:20, perce:true, d:'Le plus gros tir sur un seul monstre ; traverse l’armure.' },
};
const PUITS = { n:'Puits de runes', e:'🔮', prix:3, d:'Ne tire pas : produit 1 ◆ toutes les 6 secondes. Investir ou se défendre ?' };
const EFFET_PAIRE = {
  1:{ e:'❄', d:'ses voisines ralentissent aussi leur cible' }, 2:{ e:'☠', d:'ses voisines empoisonnent aussi' },
  3:{ e:'🏹', d:'ses voisines tirent plus vite (+30 %)' }, 4:{ e:'💣', d:'les tirs de ses voisines éclatent' },
  5:{ e:'⚡', d:'les tirs de ses voisines sautent sur un chemin voisin' }, 6:{ e:'🗼', d:'les tirs de ses voisines traversent l’armure' },
};
const POUVOIRS = {
  1:{ n:'Blizzard', d:'Tout son chemin est gelé 3 s.' }, 2:{ n:'Nuage toxique', d:'Tout son chemin est empoisonné, très fort.' },
  3:{ n:'Pluie de flèches', d:'Quatre flèches sur chaque monstre de son chemin.' }, 4:{ n:'Bombardement', d:'Un très gros tir sur chaque monstre de son chemin.' },
  5:{ n:'Tempête', d:'La foudre frappe chaque monstre des 5 chemins.' }, 6:{ n:'Tir perçant', d:'Un tir énorme traverse tout son chemin, boss compris.' },
};
// les monstres (vitesse en cases par seconde ; dg = coups au rempart)
const MONSTRES = {
  gobelin:{ n:'Gobelin', e:'👺', pv:16, vit:.55, dg:2, d:'Peu de vie, assez rapide.', contre:'N’importe quelle tour : il est fragile.' },
  sanglier:{ n:'Sanglier', e:'🐗', pv:48, vit:.32, dg:4, d:'Beaucoup de vie, lent.', contre:'Le canon 💣 et, plus tard, le poison ☠.' },
  chauve:{ n:'Chauve-souris', e:'🦇', pv:20, vit:.6, dg:2, vol:true, d:'Elle vole : les boulets du canon passent dessous.', contre:'Les archers 🏹 et le givre ❄ la touchent.' },
  bouclier:{ n:'Porte-bouclier', e:'🛡', pv:34, vit:.35, dg:3, armure:3, d:'Chaque tir sur lui fait 3 de moins.', contre:'Le poison ☠ traverse le bouclier ; les gros tirs du canon aussi.' },
  troll:{ n:'Troll', e:'🧌', pv:75, vit:.3, dg:5, regen:2.5, d:'Il se soigne sans arrêt… sauf s’il est empoisonné.', contre:'Le poison ☠ : empoisonné, il ne se soigne plus.' },
  spectre:{ n:'Spectre', e:'👻', pv:30, vit:.42, dg:3, spectre:true, d:'Invisible une seconde sur deux : tes tours ne le voient pas… sauf la foudre.', contre:'La foudre ⚡ le voit toujours.' },
  golem:{ n:'Golem de pierre', e:'🗿', pv:130, vit:.2, dg:6, antiPoison:true, d:'Très résistant et lent. Le poison ne prend pas sur la pierre.', contre:'La grande tour 🗼 et le canon 💣.' },
  titan:{ n:'Titan de feu', e:'🌋', pv:1600, vit:.13, dg:99, boss:true, d:'Le boss : il change de chemin et casse la tour qu’il atteint. S’il touche le rempart, le rempart tombe.', contre:'Toutes tes plus grosses tours, ta Tour-rune, ton Ultime et le dé bowling.' },
};
// ÉLITES (cadre doré) : ×1,8 vie, frappent 1,5 fois plus fort
const ELITE = { pv:1.8, dg:1.5 };
// 6 héros : un PASSIF et un ULTIME chacun (la jauge se remplit en abattant des monstres)
const HEROS_R = {
  maelle:{ passif:'Métal chaud : tes canons 💣 et tes grandes tours 🗼 frappent 25 % plus fort.', ultime:'Le Grand Martelage', ud:'Un énorme coup sur le monstre le plus proche du rempart, et toutes tes tours tirent deux fois plus vite pendant 5 s.' },
  gorm:{ passif:'Écho du cor : quand une tour monte avec un dé, ses voisines frappent 30 % plus fort pendant 10 s.', ultime:'Le Grand Souffle', ud:'Un gros coup sur le premier monstre de chaque chemin, et tes tours frappent 50 % plus fort pendant 6 s.' },
  aldric:{ passif:'Rempart béni : le rempart a 3 PV de plus, et tes tours frappent 40 % plus fort les élites et le boss.', ultime:'Jugement', ud:'Chaque monstre prend un coup, et le rempart reprend 3 PV.' },
  pip:{ passif:'Graines de rune : tes puits produisent 20 % plus vite, et ton premier puits est gratuit.', ultime:'Forêt vivante', ud:'Les monstres (sauf le boss) restent pris dans les ronces 4 s et prennent un coup.' },
  oria:{ passif:'Œil de faucon : tes tours d’archers 🏹 tirent 12 % plus vite.', ultime:'Pluie d’étoiles', ud:'Un gros coup sur le premier monstre de chaque chemin, et +2 ◆.' },
  zephine:{ passif:'Vent glacé : tes tours de givre ❄ et de poison ☠ frappent 40 % plus fort, et le givre dure plus longtemps.', ultime:'Tempête de neige', ud:'Les monstres (sauf le boss) reculent de 2 cases et prennent un coup.' },
};
// ------------------------------------------------------------------------------- les 5 niveaux du premier monde
// vagues : [début (s), [monstres…]] ; « * » = élite ; la dernière vague est la « grande vague » (et le boss au niveau 5)
const NIVEAUX = [
  { n:'La lisière', sortes:[3, 4], puits:false, bowling:false, runes:false, nouveau:'gobelin', f:2.7,
    debloque:'Tes premières tours : 🏹 les archers et 💣 le canon. Les dés font monter une tour de leur face.',
    vagues:[[6, ['gobelin']], [20, ['gobelin', 'gobelin']], [38, ['gobelin', 'sanglier']], [58, ['gobelin', 'gobelin', 'gobelin']], [80, ['sanglier', 'gobelin', 'gobelin']], [104, ['sanglier', 'sanglier', 'gobelin', 'gobelin', 'gobelin']]] },
  { n:'Le gué des chauves-souris', sortes:[3, 4, 1], puits:true, bowling:false, runes:false, nouveau:'chauve', f:2.35,
    debloque:'Nouveau : ❄ la tour de givre, et 🔮 le puits de runes qui produit de l’énergie.',
    vagues:[[6, ['gobelin']], [18, ['chauve', 'gobelin']], [34, ['sanglier', 'chauve']], [52, ['gobelin', 'gobelin', 'chauve']], [72, ['sanglier', 'chauve', 'chauve']], [94, ['sanglier', 'gobelin', 'gobelin', 'chauve']], [118, ['sanglier', 'sanglier', 'chauve', 'chauve', 'gobelin', 'gobelin']]] },
  { n:'Le pont du troll', sortes:[3, 4, 1, 2], puits:true, bowling:true, runes:false, nouveau:'bouclier', miniBoss:'troll', f:1.24,
    debloque:'Nouveau : ☠ la tour de poison et 🎳 le dé bowling (un par niveau : il écrase tout un chemin).',
    vagues:[[6, ['gobelin', 'gobelin']], [20, ['bouclier']], [36, ['chauve', 'bouclier', 'gobelin']], [54, ['sanglier', 'bouclier']], [74, ['sanglier*', 'chauve', 'gobelin']], [96, ['bouclier', 'bouclier', 'chauve']], [120, ['troll*', 'bouclier', 'gobelin', 'gobelin', 'chauve']]] },
  { n:'La brume des spectres', sortes:[3, 4, 1, 2, 5, 6], puits:true, bowling:true, runes:false, nouveau:'spectre', f:1.22,
    debloque:'Nouveau : ⚡ la tour de foudre et 🗼 la grande tour.',
    vagues:[[6, ['gobelin', 'chauve']], [20, ['spectre']], [36, ['bouclier', 'spectre']], [54, ['sanglier', 'chauve', 'spectre']], [74, ['troll', 'gobelin', 'gobelin']], [96, ['spectre', 'spectre', 'bouclier*']], [120, ['troll', 'sanglier*', 'spectre', 'chauve', 'gobelin', 'gobelin']], [146, ['bouclier', 'bouclier', 'spectre', 'spectre', 'chauve', 'chauve']]] },
  { n:'Le Titan de feu', sortes:[3, 4, 1, 2, 5, 6], puits:true, bowling:true, runes:true, nouveau:'golem', boss:'titan', f:1.15,
    debloque:'Nouveau : les Tours-runes ! Une PAIRE de dés posée sur une case libre bâtit une Tour-rune qui renforce ses voisines.',
    vagues:[[6, ['gobelin', 'gobelin']], [20, ['golem']], [38, ['spectre', 'bouclier', 'chauve']], [58, ['troll', 'sanglier']], [80, ['golem', 'spectre', 'gobelin', 'gobelin']], [104, ['bouclier*', 'troll', 'chauve', 'chauve']], [130, ['titan', 'gobelin', 'gobelin']], [150, ['golem', 'spectre', 'bouclier']], [172, ['troll*', 'sanglier', 'chauve', 'gobelin']]] },
];
// ------------------------------------------------------------------------------- hasard à graine
function graine(s) { let a = (s >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let MID = 0;
const nomTour = t => t.puits ? PUITS.n : t.rune ? `Tour-rune ${EFFET_PAIRE[t.paire].e} niv. ${t.rv}` : `${SORTES[t.v].n} niv. ${t.niv}${t.et ? ' ' + '★'.repeat(t.et) : ''}`;

// une partie : heros (maelle…), niveau (1-5), o = { graine, force (forceSuiveuse du héros, 1 = débutant) }
function nouvelle(heros, niveau, o) {
  o = o || {}; const L = NIVEAUX[niveau - 1], rng = graine(o.graine || (Date.now() & 0xffffff));
  const fs = 1 + 0.4 * Math.max(0, (o.force || 1) - 1), f = L.f * R.pv * (o.pv || 1) * fs; // la maison : les monstres suivent la force du héros (40 % du gain)
  const S = { heros, niveau, L, rng, f, puiss:Math.max(1, o.force || 1), fBoss:fs * (o.pvBoss || 1), t:0, energie:R.energieDepart, eAcc:0, rempart:R.rempart, rempartMax:R.rempart,
    cases:Array(NC * NR).fill(null), monstres:[], file:[], des:[], deT:R.deDelai, jauge:0, ultimes:0, bowling:L.bowling ? 1 : 0,
    kills:0, fini:null, fx:[], log:[], effets:{}, vus:{}, puitsGratuit:heros === 'pip', gelPartout:0 };
  if (heros === 'aldric') { S.rempart += 3; S.rempartMax += 3; }
  // la file des apparitions : chaque vague se répand sur quelques secondes, chemins au hasard
  L.vagues.forEach(([t0, liste], iv) => liste.forEach((m, j) => S.file.push({ t:t0 + j * (iv === L.vagues.length - 1 ? 1.6 : 2.6) + rng() * 1.2, m, vague:iv })));
  S.file.sort((a, b) => a.t - b.t); S.nbVagues = L.vagues.length; S.fin = S.file[S.file.length - 1].t;
  return S;
}
const log = (S, t) => { S.log.unshift(`${S.t.toFixed(0)} s · ${t}`); if (S.log.length > 160) S.log.length = 160; };
const fx = (S, e) => { S.fx.push(e); };
const ix = (c, r) => r * NC + c;
const voisins = i => { const c = i % NC, r = Math.floor(i / NC), L = []; if (c > 0) L.push(i - 1); if (c < NC - 1) L.push(i + 1); if (r > 0) L.push(i - NC); if (r < NR - 1) L.push(i + NC); return L; };
const sortesOk = S => S.L.sortes;
const tourDe = (S, i) => S.cases[i];

// ---------------------------------------------------------------------- actions du joueur (renvoient un message d'erreur, ou rien si c'est fait)
function prixDe(S, v) { return v === 'puits' ? (S.puitsGratuit ? 0 : PUITS.prix) : SORTES[v].prix; }
function batir(S, v, i) {
  if (S.fini) return 'Le niveau est fini.';
  if (v === 'puits' ? !S.L.puits : !sortesOk(S).includes(v)) return 'Pas encore débloqué.';
  if (S.cases[i]) return 'Cette case est prise.';
  const p = prixDe(S, v); if (S.energie < p) return `Il faut ${p} ◆.`;
  S.energie -= p;
  if (v === 'puits') { S.cases[i] = { id:++MID, puits:true, acc:0, paye:p }; S.puitsGratuit = false; log(S, '🔮 Puits de runes bâti.'); }
  else { S.cases[i] = { id:++MID, v, niv:1, et:0, cd:0.3, paye:p, pw:0 }; log(S, `${SORTES[v].e} ${SORTES[v].n} bâtie.`); }
  fx(S, { t:'batit', i });
}
function deplacer(S, a, b) {
  if (S.fini) return 'Le niveau est fini.'; const t = S.cases[a];
  if (!t) return 'Pas de tour ici.'; if (S.cases[b]) return 'Choisis une case libre.'; if (S.energie < 1) return 'Déplacer coûte 1 ◆.';
  S.energie -= 1; S.cases[b] = t; S.cases[a] = null; fx(S, { t:'batit', i:b }); log(S, `↔ ${nomTour(t)} déplacée.`);
}
function demolir(S, i) {
  const t = S.cases[i]; if (!t) return 'Pas de tour ici.';
  const r = Math.floor((t.paye || 0) / 2); S.energie += r; S.cases[i] = null; fx(S, { t:'demolit', i }); log(S, `🔨 ${nomTour(t)} démolie (+${r} ◆).`);
  return null;
}
const rendDemolir = t => Math.floor((t.paye || 0) / 2);
// un dé sur une tour de sa face : +1 niveau (au niveau 4 : une étoile ; à 5 ★ : le pouvoir)
function poserDe(S, k, i) {
  if (S.fini) return 'Le niveau est fini.'; const d = S.des[k], t = S.cases[i];
  if (!d) return 'Choisis un dé.'; if (!t || t.puits || t.rune) return 'Un dé se pose sur une tour de sa face.';
  if (t.v !== d.v) return `Ce dé de ${d.v} fait monter une ${SORTES[d.v].n.toLowerCase()}.`;
  if (t.niv >= R.nivMax && t.et >= R.etoileMax) return 'Cette tour est au maximum.';
  S.des.splice(k, 1);
  if (t.niv < R.nivMax) { t.niv++; log(S, `⬆ ${nomTour(t)}.`); } else { t.et++; log(S, `★ ${nomTour(t)}${t.et >= R.etoileMax ? ' : son pouvoir est prêt !' : ''}.`); }
  fx(S, { t:'monte', i });
  if (S.heros === 'gorm') voisins(i).forEach(x => { if (S.cases[x]) S.cases[x].echo = 10; });
}
// une PAIRE de dés : une Tour-rune sur une case libre, ou +1 niveau sur une Tour-rune de la même valeur
function poserPaire(S, k1, k2, i) {
  if (S.fini) return 'Le niveau est fini.'; if (!S.L.runes) return 'Les Tours-runes arrivent au niveau 5.';
  const a = S.des[k1], b = S.des[k2]; if (!a || !b || k1 === k2) return 'Choisis deux dés.'; if (a.v !== b.v) return 'Il faut deux dés pareils.';
  const t = S.cases[i];
  if (t && !t.rune) return 'Une paire se pose sur une case libre ou sur une Tour-rune de la même valeur.';
  if (t && t.paire !== a.v) return `Cette Tour-rune monte avec une paire de ${t.paire}.`;
  if (t && t.rv >= R.runeMax) return 'Cette Tour-rune est au plus haut.';
  [k1, k2].sort((x, y) => y - x).forEach(k => S.des.splice(k, 1));
  if (!t) { S.cases[i] = { id:++MID, rune:true, paire:a.v, rv:1, paye:0 }; log(S, `✨ Tour-rune ${EFFET_PAIRE[a.v].e} bâtie.`); }
  else { t.rv++; log(S, `✨ ${nomTour(t)}.`); }
  fx(S, { t:'rune', i });
}
// jeter un dé (s'il ne sert à rien) : +1 ◆, et la place se libère pour le suivant
function jeterDe(S, k) { if (!S.des[k]) return 'Pas de dé.'; S.des.splice(k, 1); S.energie += 1; log(S, '🎲 Dé jeté (+1 ◆).'); }
// le dé bowling : il roule sur tout un chemin, du rempart vers le haut
function bowling(S, c) {
  if (S.fini) return 'Le niveau est fini.'; if (!S.bowling) return 'Plus de dé bowling dans ce niveau.';
  S.bowling--; fx(S, { t:'bowling', c }); log(S, `🎳 Dé bowling sur le chemin ${c + 1} !`);
  S.monstres.filter(m => m.c === c && !m.mort).forEach(m => frappe(S, m, M(m).boss ? R.bowling * 2 : R.bowling * S.f * 2, { perce:true, voit:true, src:'bowling' }));
}
// l'Ultime du héros
function ultime(S) {
  if (S.fini) return 'Le niveau est fini.'; if (S.jauge < R.jaugeMax) return 'La jauge n’est pas pleine.';
  S.jauge = 0; S.ultimes++; const h = S.heros, vivants = S.monstres.filter(m => !m.mort), F = S.f * 10;
  const tetes = () => { const L = []; for (let c = 0; c < NC; c++) { const x = vivants.filter(m => m.c === c).sort((a, b) => a.y - b.y)[0]; if (x) L.push(x); } return L; };
  if (h === 'maelle') { const m = vivants.sort((a, b) => a.y - b.y)[0]; if (m) frappe(S, m, F * 8, { perce:true, voit:true }); S.effets.rapide = 5; }
  else if (h === 'gorm') { tetes().forEach(m => frappe(S, m, F * 4, { perce:true, voit:true })); S.effets.cri = 6; }
  else if (h === 'aldric') { vivants.forEach(m => frappe(S, m, F * 2.2, { perce:true, voit:true })); S.rempart = Math.min(S.rempartMax, S.rempart + 3); }
  else if (h === 'pip') { vivants.forEach(m => { if (!M(m).boss) m.racine = 4; frappe(S, m, F * 1.5, { perce:true, voit:true }); }); }
  else if (h === 'oria') { tetes().forEach(m => frappe(S, m, F * 2.5, { perce:true, voit:true })); S.energie += 2; }
  else if (h === 'zephine') { vivants.forEach(m => { if (!M(m).boss) m.y = Math.min(HAUT, m.y + 2); frappe(S, m, F * 1.8, { perce:true, voit:true }); }); }
  fx(S, { t:'ultime', h }); log(S, `⚡ Ultime : ${HEROS_R[h].ultime} !`);
}
// le pouvoir d'une tour à 5 ★
function pouvoir(S, i) {
  const t = S.cases[i]; if (!t || t.puits || t.rune || t.et < R.etoileMax) return 'Il faut une tour à 5 ★.'; if (t.pw > 0) return 'Le pouvoir se recharge.';
  t.pw = R.pouvoirRecharge; const c = i % NC, dg = degat(S, t, i) * 3, chemin = S.monstres.filter(m => m.c === c && !m.mort);
  if (t.v === 1) chemin.forEach(m => { if (!M(m).boss) m.racine = 3; frappe(S, m, dg / 2, { voit:true }); });
  else if (t.v === 2) chemin.forEach(m => { frappe(S, m, dg / 3, { voit:true }); if (!M(m).antiPoison) m.poison = { dps:dg / 2, t:5 }; });
  else if (t.v === 3) chemin.forEach(m => { for (let k = 0; k < 4; k++) frappe(S, m, dg / 3, { voit:true }); });
  else if (t.v === 4) chemin.forEach(m => frappe(S, m, dg, { voit:true, perce:true }));
  else if (t.v === 5) S.monstres.filter(m => !m.mort).forEach(m => frappe(S, m, dg / 2, { voit:true }));
  else chemin.forEach(m => frappe(S, m, dg * 1.5, { voit:true, perce:true }));
  fx(S, { t:'pouvoir', i, v:t.v }); log(S, `✦ ${POUVOIRS[t.v].n} !`);
}

// ---------------------------------------------------------------------- le temps qui passe
const M = m => MONSTRES[m.t];
function apparait(S, x) {
  const elite = x.m.endsWith('*'), t = elite ? x.m.slice(0, -1) : x.m, B = MONSTRES[t];
  const c = Math.floor(S.rng() * NC), pv = Math.round(B.pv * (B.boss ? S.fBoss : S.f) * (elite ? ELITE.pv : 1));
  const m = { id:++MID, t, c, y:HAUT, pv, pvMax:pv, elite, lent:0, poison:null, racine:0, change:B.boss ? 14 : 0, vague:x.vague };
  S.monstres.push(m); fx(S, { t:'arrive', id:m.id });
  if (!S.vus[t]) { S.vus[t] = 1; fx(S, { t:'nouveau', m:t }); }
  if (x.vague === S.nbVagues - 1 && !S.grande) { S.grande = true; fx(S, { t:'grande' }); }
  if (B.boss) { fx(S, { t:'boss', m:t }); log(S, `👑 ${B.n} arrive !`); }
}
function mul(S, t, i) {
  let k = 1; const h = S.heros;
  if (h === 'maelle' && (t.v === 4 || t.v === 6)) k *= 1.25;
  if (h === 'zephine' && (t.v === 1 || t.v === 2)) k *= 1.4;
  if (t.echo > 0) k *= 1.3; if (S.effets.cri > 0) k *= 1.5;
  const rn = runesAutour(S, i); rn.forEach(r => { k *= 1 + R.runeBonus * r.rv; });
  if (comboChemin(S, i % NC) === t.v) k *= 1 + R.comboBonus;
  return k;
}
const runesAutour = (S, i) => voisins(i).map(x => S.cases[x]).filter(t => t && t.rune);
const effetsPaire = (S, i) => new Set(runesAutour(S, i).map(r => r.paire));
// COMBO DE LIGNE : 3 tours de la même sorte sur un chemin
function comboChemin(S, c) { const n = {}; for (let r = 0; r < NR; r++) { const t = S.cases[ix(c, r)]; if (t && t.v) n[t.v] = (n[t.v] || 0) + 1; } const v = Object.keys(n).find(k => n[k] >= 3); return v ? +v : 0; }
// la force du héros (niveau, rang, équipement : forceSuiveuse) rend ses tours plus fortes ; les monstres suivent à 40 % (règle de la maison)
function degat(S, t, i) { return SORTES[t.v].dg * R.niv[t.niv] * (1 + R.etoile * t.et) * mul(S, t, i) * (S.puiss || 1); }
function cadence(S, t, i) { let c = SORTES[t.v].cad; if (S.heros === 'oria' && t.v === 3) c /= 1.12; if (effetsPaire(S, i).has(3)) c /= 1.3; if (S.effets.rapide > 0) c /= 2; return c; }
const visible = (S, m, v) => !m.mort && !(M(m).spectre && Math.floor(S.t) % 2 === 1 && v !== 5) && !(M(m).vol && v === 4);
// la cible d'une tour : le monstre de son chemin, au-dessus d'elle, le plus proche du rempart
function cible(S, c, r, v) { let b = null; for (const m of S.monstres) if (m.c === c && m.y > r + 0.5 && m.y <= HAUT && visible(S, m, v) && (!b || m.y < b.y)) b = m; return b; }
function frappe(S, m, dg, o = {}) {
  if (m.mort) return; const B = M(m);
  if (B.armure && !o.perce) dg = Math.max(1, dg - B.armure * (m.elite ? 1.5 : 1));
  if ((m.elite || B.boss) && S.heros === 'aldric') dg *= 1.4;
  m.pv -= dg; m.touche = 0.25;
  if (m.pv <= 0) meurt(S, m);
}
function meurt(S, m) { m.mort = true; m.mortT = S.t; S.kills++; S.energie += 1; S.jauge = Math.min(R.jaugeMax, S.jauge + (M(m).boss ? 4 : m.elite ? 2 : 1)); fx(S, { t:'meurt', id:m.id }); if (M(m).boss) log(S, `💥 ${M(m).n} est tombé !`); }
function tir(S, t, i) {
  const c = i % NC, r = Math.floor(i / NC), m = cible(S, c, r, t.v); if (!m) return false;
  const S0 = SORTES[t.v], ef = effetsPaire(S, i), dg = degat(S, t, i), perce = S0.perce || ef.has(6);
  const coup = (x, k) => {
    frappe(S, x, dg * k, { perce });
    if ((t.v === 1 || ef.has(1)) && !M(x).boss) x.lent = S.heros === 'zephine' ? 3 : 2;
    if ((t.v === 2 || ef.has(2)) && !M(x).antiPoison) x.poison = { dps:(S0.poison || 1.5) * R.niv[t.niv] * mul(S, t, i), t:4 };
  };
  const n = S0.fleches || 1; for (let k = 0; k < n; k++) coup(m, 1);
  if (t.v === 4 || ef.has(4)) S.monstres.forEach(x => { if (x !== m && x.c === c && Math.abs(x.y - m.y) < 1 && visible(S, x, 4)) frappe(S, x, dg * S0.eclats || dg * .5, {}); });
  if (t.v === 5 || ef.has(5)) { const vs = [c - 1, c + 1].filter(x => x >= 0 && x < NC); for (const vc of vs) { const x = cible(S, vc, -1, 5); if (x) { frappe(S, x, dg * (S0.saut || .5), {}); fx(S, { t:'saut', de:m.id, a:x.id }); break; } } }
  fx(S, { t:'tir', i, v:t.v, id:m.id });
  return true;
}
function etape(S) {
  if (S.fini) return; S.t = Math.round((S.t + PAS) * 1000) / 1000;
  // l'énergie qui monte seule
  S.eAcc += PAS; if (S.eAcc >= R.regenE) { S.eAcc -= R.regenE; S.energie = Math.min(R.energieMax, S.energie + 1); }
  // les dés : un toutes les 8 s, réserve de 3 (si la réserve est pleine, le dé attend)
  if (S.des.length < R.desMax) { S.deT -= PAS; if (S.deT <= 0) { S.deT = R.deDelai; const so = S.L.sortes; const v = so[Math.floor(S.rng() * so.length)]; S.des.push({ id:++MID, v }); fx(S, { t:'de', v }); } }
  for (const k in S.effets) if (S.effets[k] > 0) S.effets[k] -= PAS;
  // les apparitions
  while (S.file.length && S.file[0].t <= S.t) apparait(S, S.file.shift());
  // les tours
  S.cases.forEach((t, i) => {
    if (!t) return;
    if (t.puits) { t.acc += PAS * (S.heros === 'pip' ? 1.2 : 1); if (t.acc >= R.puitsDelai) { t.acc -= R.puitsDelai; S.energie = Math.min(R.energieMax, S.energie + 1); fx(S, { t:'puits', i }); } return; }
    if (t.rune) return;
    if (t.echo > 0) t.echo -= PAS; if (t.pw > 0) t.pw -= PAS;
    t.cd -= PAS; if (t.cd <= 0) { if (tir(S, t, i)) t.cd = cadence(S, t, i); else t.cd = 0.1; }
  });
  // les monstres
  for (const m of S.monstres) {
    if (m.mort) continue; const B = M(m);
    if (m.poison) { m.pv -= m.poison.dps * PAS; m.poison.t -= PAS; if (m.poison.t <= 0) m.poison = null; if (m.pv <= 0) { meurt(S, m); continue; } }
    else if (B.regen) m.pv = Math.min(m.pvMax, m.pv + B.regen * S.f * PAS);
    if (m.touche > 0) m.touche -= PAS;
    let v = B.vit; if (m.lent > 0) { m.lent -= PAS; v *= .5; }
    const combo = comboChemin(S, m.c); if (combo === 1 && !B.boss) v *= .65; if (combo === 2 && !B.antiPoison && !m.poison) m.poison = { dps:1 * S.f, t:1 };
    if (m.racine > 0) { m.racine -= PAS; v = 0; }
    const y0 = m.y; m.y -= v * PAS;
    if (B.boss) {
      m.change -= PAS; if (m.change <= 0 && m.y > 5.5) { m.change = 14; const n = m.c + (S.rng() < .5 ? -1 : 1); m.c = n < 0 ? 1 : n >= NC ? NC - 2 : n; fx(S, { t:'bond', id:m.id }); log(S, `👑 ${B.n} change de chemin.`); }
      // il casse la tour qu'il atteint
      for (let r = NR - 1; r >= 0; r--) { const i = ix(m.c, r); if (S.cases[i] && y0 > r + .5 && m.y <= r + .5) { log(S, `💥 ${B.n} écrase ${nomTour(S.cases[i])}.`); S.cases[i] = null; fx(S, { t:'demolit', i }); } }
    }
    if (m.y <= 0) { m.mort = true; m.mortT = S.t; m.arrive = true; const dg = Math.round(B.dg * (m.elite ? ELITE.dg : 1)); S.rempart -= dg; fx(S, { t:'rempart', dg, id:m.id }); log(S, `🧱 ${B.n} frappe le rempart (−${dg}).`); }
  }
  S.monstres = S.monstres.filter(m => !m.mort || S.t - m.mortT < 1);
  if (S.rempart <= 0) { S.rempart = 0; S.fini = 'perdu'; log(S, '💥 Le rempart est tombé.'); }
  else if (!S.file.length && !S.monstres.some(m => !m.mort)) { S.fini = 'gagne'; log(S, '🏆 Le niveau est gagné.'); }
}
// avancer de « sec » secondes
function avance(S, sec) { const n = Math.round(sec / PAS); for (let k = 0; k < n && !S.fini; k++) etape(S); }
const etoiles = S => S.fini !== 'gagne' ? 0 : S.rempart >= S.rempartMax * .75 ? 3 : S.rempart >= S.rempartMax * .45 ? 2 : 1;
const avancement = S => Math.min(1, S.t / (S.fin + 8));

const API = { PAS, NC, NR, HAUT, R, SORTES, PUITS, EFFET_PAIRE, POUVOIRS, MONSTRES, ELITE, HEROS_R, NIVEAUX,
  nouvelle, batir, deplacer, demolir, rendDemolir, poserDe, poserPaire, jeterDe, bowling, ultime, pouvoir, etape, avance,
  etoiles, avancement, prixDe, nomTour, voisins, comboChemin, runesAutour, degat, cadence, ix };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.REMPART = API;
})(typeof window !== 'undefined' ? window : globalThis);
