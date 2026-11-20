// =============================================================================================== LES CHRONIQUES DE LA GUILDE (15/11, moteur v2 « façon HeroQuest »)
// Demande de l'utilisateur (15/11) : « comme HeroQuest : je ne vois pas devant, j'ai des choix à faire sur la carte ; une salle à côté, je ne la vois pas
// tant que je ne suis pas rentré dedans ; à l'intérieur des coffres, des armoires dans lesquels je peux fouiller ».
// Donc : UNE grande carte de donjon (salles + couloirs + portes). Les salles sont dans le noir jusqu'à ce qu'on ouvre leur porte ; les couloirs se
// dévoilent en avançant. Les MEUBLES se fouillent (un dé, une fois chacun) : potion, or, sablier, objet, piège, monstre caché… et les ROUAGES
// (il en faut 3, 4 sont cachés) pour réveiller l'Horloger. Plusieurs chemins mènent à la bibliothèque. La version 1 (salles séparées) : chroniques-moteur-v1.js.
// Un tour du GROUPE : chaque héros pose ses dés (bouger, frapper les sceaux, protéger, soigner, donner, relever, fouiller, agir) ;
// ouvrir une porte à côté de soi est GRATUIT. Puis les monstres réveillés font ce qu'ils ont annoncé ; le sablier perd un grain.
// Pas de dessin ici : marche aussi dans node. L'état est un JSON simple.
(function (racine) {
'use strict';

function graine(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function hasard(S) { S.rs = (S.rs + 0x6D2B79F5) >>> 0; let t = S.rs; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const de6 = S => 1 + Math.floor(hasard(S) * 6);

// ------------------------------------------------------------------ les sceaux (les mêmes que la Crypte)
function sceau(t, v, g) { return { t, v:v || 0, reste:t === 'tot' ? v : 0, ok:false, val:0, g:g || 0 }; }
function accepte(s, d, L) {
  if (s.ok) return false;
  switch (s.t) {
    case 'ex': return d === s.v; case 'min': return d >= s.v; case 'max': return d <= s.v;
    case 'pair': return d % 2 === 0; case 'imp': return d % 2 === 1; case 'tot': case 'any': return true;
    case 'dbl': { const j = L.find(x => x !== s && x.t === 'dbl' && x.g === s.g && x.ok); return !j || !j.val || j.val === d; } // 17/11 : jumeau brisé par un pouvoir (sans dé) = n'importe quel dé (avant : « = 0 », impossible)
  }
  return false;
}
function pose(s, d) { if (s.t === 'tot') { s.reste -= d; s.val += d; if (s.reste <= 0) { s.reste = 0; s.ok = true; } } else { s.ok = true; s.val = d; } }
const brise = s => { s.ok = true; s.reste = 0; };

// ------------------------------------------------------------------ les héros
const HEROS_C = {
  maelle:  { n:'Maëlle', pv:15, des:3, c:'#ff8a2a', t:'Coup de forge', d:'Quand elle frappe avec un 6, il brise DEUX sceaux.' },
  aldric:  { n:'Sire Aldric', pv:16, des:3, c:'#ffd27a', t:'Lanterne', d:'Quand il protège, son bouclier couvre aussi ses voisins.' },
  pip:     { n:'Pip', pv:12, des:3, c:'#c58bff', t:'Soins', d:'Elle peut soigner : un dé rend sa valeur en PV à elle ou à un voisin.' },
  oria:    { n:'Oria', pv:15, des:3, c:'#5ff5e6', t:'Éclaireuse', d:'+2 cases à chaque déplacement ; elle voit les pièges à 2 cases et plus loin dans les couloirs.' },
  gorm:    { n:'Gorm', pv:16, des:4, c:'#4f8bff', t:'Grand souffle', d:'Il lance 4 dés au lieu de 3.' },
  zephine: { n:'Zéphine', pv:15, des:3, c:'#ff4040', t:'Vent', d:'Elle frappe un monstre jusqu’à 2 cases de distance.' },
};
// 15/11 soir : les portraits peints des monstres de l'Horloger (portraits/m-<img>.webp) ; l'Horloger garde le sien en attendant le nouveau
const BETES = {
  rouagelin: { n:'Rouagelin', img:'rouagelin', att:1, mv:2, s:() => [sceau('any'), sceau('min', 3)], meute:true },
  gardien:   { n:'Gardien de bronze', img:'gardienbronze', att:2, mv:2, s:() => [sceau('pair'), sceau('pair'), sceau('tot', 7)], garde:.25, leviers:true, grosCoup:.3, charge:.3 },
  coucou:    { n:'Coucou furieux', img:'coucou', att:2, mv:3, s:() => [sceau('imp'), sceau('min', 4)], lache:true },
  page:      { n:'Page hurlante', img:'pagehurlante', att:1, mv:3, s:() => [sceau('imp'), sceau('imp')], fuit:.3 },
  archiviste:{ n:'Archiviste de cuivre', img:'archiviste', att:3, mv:1, s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('min', 5), sceau('tot', 10)], soin:.35, elite:true, grosCoup:.3, charge:.3 },
  mimique:   { n:'Mimique', img:'mimique', att:2, mv:2, s:() => [sceau('pair'), sceau('min', 4)], grosCoup:.2 }, // 16/11 : un meuble qui mord
  horloger:  { n:'L’Horloger', img:'horlogerboss', att:3, mv:1, s:() => [], boss:true },
  // 16/11 : les nouveaux venus (inspirés des archétypes troll, squelette, liche ; noms et règles à nous)
  colosse:   { n:'Colosse à ressort', img:'colosseressort', att:3, mv:1, s:() => [sceau('min', 5), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('tot', 10)], elite:true, regen:true, grosCoup:.3, charge:.35 },
  osclaque:  { n:'Os-qui-claque', img:'osclaque', att:1, mv:2, s:() => [sceau('pair'), sceau('max', 4)], releve:true },
  reliquaire:{ n:'Le Reliquaire', img:'reliquaire', att:0, mv:0, s:() => [sceau('ex', 2), sceau('ex', 4), sceau('ex', 6)], immobile:true },
  roios:     { n:'Le Roi des Os', img:'roios', att:3, mv:1, s:() => [], boss:true },
  // les Terres brûlées (scénario d'essai sur la carte peinte, 15/11)
  gobelin:   { n:'Gobelin des cendres', img:'gobelin', att:1, mv:2, s:() => [sceau('any'), sceau('min', 3)], fuit:.2 },
  loup:      { n:'Loup de braise', img:'loup', att:2, mv:3, s:() => [sceau('pair'), sceau('min', 4)] },
  salamandre:{ n:'Salamandre', img:'salamandre', att:2, mv:2, s:() => [sceau('imp'), sceau('tot', 7)] },
  scarabee:  { n:'Scarabée de braise', img:'scarabee', att:1, mv:1, s:() => [sceau('pair'), sceau('pair'), sceau('min', 3)], garde:.3 },
  golem:     { n:'Golem de scories', img:'golem', att:3, mv:1, s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('min', 5), sceau('tot', 10)], garde:.3, elite:true },
  elementaire:{ n:'Élémentaire de lave', img:'elementaire', att:3, mv:1, s:() => [sceau('min', 5), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('tot', 9)], soin:.25, elite:true },
  titan:     { n:'Le Titan de feu', img:'titan', att:3, mv:1, s:() => [], boss:true },
};
const CAPA = {
  meute:'Meute : +1 dégât si un autre de ses semblables est déjà au contact de la même cible.',
  lache:'Lâche : +2 dégâts contre un héros SEUL (aucun ami à côté de lui).',
  grosCoup:'Gros coup : parfois il prend son élan (⚡) ; au tour suivant il frappe de +2, sauf si on lui a brisé un sceau entre-temps.',
  charge:'Charge (⚡) : parfois il se ramasse pendant le tour des monstres ; au DÉBUT de votre tour suivant, avant que vous jouiez, il frappe de +2 tous les héros collés à lui. Pour l’éviter : éloignez-vous de lui (plus collé à la fin de votre tour) ou protégez-vous (bouclier).',
  regen:'Régénère : à la fin du tour, il referme un sceau brisé, SAUF si on lui a posé un 6 pendant ce tour.',
  releve:'Se relève : abattu, il revient au tour suivant avec un sceau, SAUF si on l’a achevé avec un 6.',
  leviers:'Il surveille les leviers : il en remonte un quand il peut.',
  immobile:'Il ne bouge pas et ne frappe pas.',
};
const PHASES = [
  { n:'Le Ressort', s:() => [sceau('min', 5), sceau('min', 5), sceau('dbl', 0, 1), sceau('dbl', 0, 1)], d:'frappe tous les héros collés à lui et appelle 2 Rouagelins' },
  { n:'Le Carillon', s:() => [sceau('pair'), sceau('imp'), sceau('tot', 12)], d:'frappe tous ceux collés à lui et sonne : l’onde frappe à 2 cases (−2), et chaque héros qui n’est pas à côté d’un ami perd son plus gros dé au prochain tour' },
  { n:'La Dernière Heure', s:() => [sceau('ex', 6), sceau('ex', 1), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('tot', 15)], d:'rejette le héros le plus blessé hors du Cœur, sur le palier (jamais le dernier debout), le frappe, puis frappe tous ceux collés à lui' },
];

// 16/11 : LE ROI DES OS (boss du Labyrinthe des Runes) : phase 2 = intouchable tant que son reliquaire, caché dans un meuble, n'est pas brisé
const PHASES_ROI = [
  { n:'L’Appel des os', s:() => [sceau('min', 4), sceau('pair'), sceau('dbl', 0, 1), sceau('dbl', 0, 1)], d:'frappe au contact et relève un Os-qui-claque à côté de lui' },
  { n:'Le Reliquaire', s:() => [], d:'ne peut plus être touché : son reliquaire est caché dans un meuble ; fouillez, brisez-le (2, 4, 6)', intouchable:true },
  { n:'La Dernière Danse', s:() => [sceau('ex', 6), sceau('imp'), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('tot', 12)], d:'frappe de 4 au contact et vole 1 PV à chaque héros à 2 cases' },
];
const phasesDe = S => S && S.R && S.R.boss && S.R.boss.b === 'roios' ? PHASES_ROI : (S && SCEN[S.scen || 'horloger'].boss === 'roios' ? PHASES_ROI : PHASES);
// ------------------------------------------------------------------ LES SCÉNARIOS (15/11) : chacun a sa carte, ses textes, son objet à trouver et son boss.
// « horloger » : la carte construite en salles et couloirs (portes) ; « brulees » : la CARTE PEINTE des Terres brûlées (decor/carte-brulees.webp)
// calée au doigt par l'utilisateur (placer-chroniques.html), brouillard « à vue » (les murs peints cachent ce qu'il y a derrière).
const SCEN = {
  horloger: { n:'Le Sommeil de l’Horloger', boss:'horloger', renfort:'rouagelin', objet:{ n:'rouage', e:'⚙️' }, axe:'l’axe de la Grande Horloge', axeE:'✹', sablier:25,
    phases:['Le Ressort', 'Le Carillon', 'La Dernière Heure'] },
  brulees: { n:'Les Terres brûlées (essai sur la carte peinte)', boss:'titan', renfort:'salamandre', objet:{ n:'braise éternelle', e:'🔥' }, axe:'le grand brasier', axeE:'🔥', sablier:28,
    phases:['Les Flammes', 'La Fumée', 'L’Éruption'], image:'decor/carte-brulees.webp', vue:5 },
  // 15/11 soir : LE LABYRINTHE DES RUNES, un donjon TIRÉ AU HASARD à chaque partie (salles, couloirs, meubles, monstres, pièges) : on rejoue sans fin
  labyrinthe: { n:'Le Labyrinthe des Runes (donjon au hasard)', boss:'roios', renfort:'osclaque', objet:{ n:'fragment de rune', e:'✦' }, axe:'l’autel des runes', axeE:'✦', sablier:30,
    phases:['L’Appel des os', 'Le Reliquaire', 'La Dernière Danse'], vue:5, hasard:true },
  // 15/11 soir : LES AVENTURES EN SCÈNES (chroniques-aventures.js) : une EMBUSCADE sur le chemin = un petit terrain ouvert, gagner = abattre tous les monstres
  // 16/11 : l'ESSAI d'une salle de l'atelier des cartes (editeur.html) : la salle seule, 2 monstres à battre
  atelier: { n:'Essai de l’atelier', boss:'titan', renfort:'rouagelin', objet:{ n:'rouage', e:'⚙️' }, axe:'', axeE:'', sablier:40, phases:['', '', ''], image:'', vue:0, hasard:true, objectif:'vaincre' },
  // 18/11 : L'ENTRAÎNEMENT DE MOUSTACHE (chroniques-entrainement.js) : un mini-donjon fait exprès, Maëlle seule, dés imposés
  entrainement: { n:'L’entraînement de Moustache', boss:'titan', renfort:'rouagelin', objet:{ n:'—', e:'🎓' }, axe:'', axeE:'', sablier:20, phases:['', '', ''], objectif:'vaincre' },
  arene: { n:'Embuscade', boss:'titan', renfort:'gobelin', objet:{ n:'—', e:'⚔' }, axe:'', axeE:'', sablier:40, phases:['', '', ''], vue:8, hasard:true, objectif:'vaincre' },
};
// la carte peinte, calée par l'utilisateur le 15/11 (28 × 36 ; . sol · # mur · ~ obstacle)
const GRILLE_BRULEES = ["############################","####..#####~####~#####~~~~##","#.......##~~#########..~~~~#","#.......########.###.....~~#","#.......#####..#.###......~#","#.......##.......###.......#","#.......##...##...##.......#","#.......##...##...##......##","#.......###......###.....###","########.####..####..#######","####..###.###..###..########","##.....##..##..###..#......#","#..........##..###.........#","#..........................#","#......##..##..###..#......#","##.....##.......##..#......#","###...###........#..########","########..#......#..########","#######..##......#..##.....#","##......###......#.........#","#.......####....#####......#","#.......#...#..#~~~........#","#.......#...#..~....~......#","#.......#...#..#....~......#","##.....##...#..............#","#########......#.....#######","#########...#..##...########","#.......#####..#####.......#","#.......#####..#####.......#","#..........................#","#..........................#","#.......#####..######......#","#.......#####..######......#","#.......#############.....##","############################","############################"];
const BRULEES = {
  depart:[[13, 31], [14, 31], [13, 32], [14, 32]], axe:[13, 7],
  murs:[[4, 1], [5, 1]], // l'arche peinte en haut du hall : un cul-de-sac
  obstacles:[[3, 3], [6, 3], [3, 6], [6, 6], [12, 15], [15, 15], [12, 19], [15, 19], [23, 29], [24, 29], [23, 30], [24, 30]], // piliers, source chaude
  // meubles : [x, y, sorte] ; les 4 braises éternelles sont cachées dans 4 d'entre eux (il en faut 3)
  meubles:[[2, 27, 'lit'], [6, 27, 'lit'], [1, 32, 'coffre'], [7, 32, 'tonneaux'], [22, 11, 'tente'], [24, 11, 'tonneaux'], [22, 15, 'coffre'],
    [23, 18, 'etagere'], [25, 18, 'etagere'], [26, 20, 'armoire'], [26, 22, 'bureau'], [21, 3, 'tonneaux'], [25, 6, 'banc'], [4, 24, 'autel'], [10, 22, 'fontaine'], [18, 25, 'cristaux']],
  caches:['2,27', '22,15', '26,20', '21,3'],
  monstres:[['gobelin', 3, 30], ['gobelin', 5, 29], ['gobelin', 24, 13], ['loup', 23, 14], ['salamandre', 23, 21], ['salamandre', 25, 23], ['golem', 22, 5],
    ['loup', 3, 12], ['loup', 5, 14], ['salamandre', 4, 21], ['scarabee', 13, 17], ['scarabee', 14, 18], ['elementaire', 17, 24], ['gobelin', 4, 5]],
  pieges:[[13, 26], [19, 12], [9, 17], [14, 10]],
};
function construitCarte(S, R) {
  const G = GRILLE_BRULEES.map(l => l.split('')), B = BRULEES, H2 = G.length, W2 = G[0].length;
  R.w = W2; R.h = H2;
  const sol = (x, y) => x >= 0 && y >= 0 && x < W2 && y < H2 && G[y][x] === '.';
  // relier les couloirs peints en biais (sinon on ne peut pas passer d'une case à sa voisine en diagonale)
  for (let y = 0; y < H2 - 1; y++) for (let x = 0; x < W2; x++) for (const dx of [1, -1]) if (sol(x, y) && sol(x + dx, y + 1) && !sol(x + dx, y) && !sol(x, y + 1) && x + dx >= 0 && x + dx < W2) G[y][x + dx] = '.';
  B.murs.forEach(([x, y]) => G[y][x] = '#'); B.obstacles.forEach(([x, y]) => G[y][x] = '~');
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (G[y][x] !== '.') R.murs[cle(x, y)] = G[y][x];
  const tirage = ['potion', 'grains', 'objet', 'piege', 'monstre', 'parchemin', 'or', 'fumee', 'rien'];
  B.meubles.forEach(([x, y, t2]) => { R.murs[cle(x, y)] = 'M'; R.obj[cle(x, y)] = { t:t2, meuble:true, fouille:false, cache:B.caches.includes(cle(x, y)) ? 'rouage' : tirage[Math.floor(hasard(S) * tirage.length)] }; });
  R.murs[cle(...B.axe)] = 'A'; R.axe = B.axe.slice(); R.bronze = true;
  B.pieges.forEach(([x, y]) => R.obj[cle(x, y)] = { t:'piege', cache:true });
  B.monstres.forEach(([b, x, y]) => ajouteMonstre(S, b, x, y));
  B.depart.forEach(([x, y], i) => { if (S.heros[i]) { S.heros[i].x = x; S.heros[i].y = y; } });
}
// ------------------------------------------------------------------ L'ESSAI D'UNE SALLE DE L'ATELIER (16/11) : la grille de la salle telle que peinte dans l'éditeur
function construitAtelier(S, R, C) {
  const W2 = C.w + 2, H2 = C.h + 2; R.w = W2; R.h = H2; R.bronze = true; R.plan = 3;
  const ty = (x, y) => { const v = (C.cases || {})[cle(x, y)]; if (v) return v; return x === 0 || y === 0 || x === W2 - 1 || y === H2 - 1 ? 'mur' : 'sol'; };
  const tirage = ['potion', 'grains', 'parchemin', 'piege', 'or', 'fumee', 'rien'];
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) { const v = ty(x, y), c = cle(x, y);
    if (v === 'mur') R.murs[c] = '#'; else if (v === 'obstacle') R.murs[c] = '~';
    else if (v === 'porte') R.portes[c] = { salle:'X', ouverte:false, essai:true };
    else if (v.startsWith('meuble')) { R.murs[c] = 'M'; R.obj[c] = { t:v.split(':')[1] || 'coffre', nom:v.split(':')[2] || undefined, meuble:true, fouille:false, cache:tirage[Math.floor(hasard(S) * tirage.length)] }; }
    else R.salle[c] = 'X';
    R.vu[c] = 1; }
  R.vuSalle.X = true;
  const libres = []; for (let y = 1; y < H2 - 1; y++) for (let x = 1; x < W2 - 1; x++) if (!R.murs[cle(x, y)]) libres.push([x, y]);
  // les héros près de la 1re porte (ou en bas à gauche), les monstres le plus loin possible
  const P = Object.keys(R.portes).map(c => c.split(',').map(Number)), p0 = P[0] || [1, H2 - 2];
  libres.sort((a, b) => (Math.abs(a[0] - p0[0]) + Math.abs(a[1] - p0[1])) - (Math.abs(b[0] - p0[0]) + Math.abs(b[1] - p0[1])));
  S.heros.forEach((h, i) => { const c = libres[i] || libres[0]; h.x = c[0]; h.y = c[1]; });
  (C.monstres || ['rouagelin', 'gobelin']).forEach((b, i) => { const c = libres[libres.length - 1 - i]; if (c && BETES[b]) ajouteMonstre(S, b, c[0], c[1]); });
}
// ------------------------------------------------------------------ L'ENTRAÎNEMENT (18/11) : 9 × 12, deux salles dans le noir et un couloir
//   y0  #########      T2 « La salle du Rouagelin » (x 1-7, y 1-2), le Rouagelin en (4,1)
//   y3  ####B####      porte de bronze (4,3), ouverte par le levier
//   y4  #....L..#      T1 « La salle du levier » (x 1-7, y 4-6), levier ≥ 4 en (5,4)
//   y7  ####D####      porte en bois (4,7)
//   y8  ###..^###      couloir (x 3-5, y 8-10) : piège à repérer en (5,8)
//   y9  ###C^.###      coffre (3,9) avec une potion ; piège caché en (4,9) sur le chemin
//   y10 ###.M.###      départ de Maëlle en (4,10)
function construitEntrainement(S, R) {
  const W2 = 9, H2 = 12; R.w = W2; R.h = H2;
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) R.murs[cle(x, y)] = '#';
  R.rectsE = { T1:[1, 4, 7, 3], T2:[1, 1, 7, 2] }; R.nomsE = { T1:'La salle du levier', T2:'La salle du Rouagelin' };
  Object.entries(R.rectsE).forEach(([id, [x0, y0, w, h]]) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { delete R.murs[cle(x, y)]; R.salle[cle(x, y)] = id; } });
  for (let y = 8; y <= 10; y++) for (let x = 3; x <= 5; x++) delete R.murs[cle(x, y)];
  delete R.murs[cle(4, 7)]; R.portes[cle(4, 7)] = { salle:'T1', ouverte:false };
  delete R.murs[cle(4, 3)]; R.portes[cle(4, 3)] = { salle:'T2', ouverte:false, bronze:true };
  R.murs[cle(3, 9)] = 'M'; R.obj[cle(3, 9)] = { t:'coffre', meuble:true, fouille:false, verrou:0, cache:'potion' };
  R.murs[cle(5, 4)] = 'L'; R.obj[cle(5, 4)] = { t:'levier', v:4 };
  R.obj[cle(4, 9)] = { t:'piege', cache:true }; R.obj[cle(5, 8)] = { t:'piege', cache:true };
  ajouteMonstre(S, 'rouagelin', 4, 1);
  S.heros.forEach((h, i) => { h.x = 4 - i; h.y = 10; });
  S.leviersBut = 1; S.objectif = 'vaincre';
  S.desForces = [[3, 2, 1], [5, 4, 2], [4, 2, 6]]; // tour 1, 2, 3 : de quoi réussir à coup sûr
}
// ------------------------------------------------------------------ L'EMBUSCADE (15/11 soir) : 12 × 10, des arbres ou des rochers, les héros en bas, les monstres en haut
function construitArene(S, R, opts) {
  const W2 = 12, H2 = 10; R.w = W2; R.h = H2; R.bronze = true;
  for (let x = 0; x < W2; x++) { R.murs[cle(x, 0)] = '#'; R.murs[cle(x, H2 - 1)] = '#'; }
  for (let y = 0; y < H2; y++) { R.murs[cle(0, y)] = '#'; R.murs[cle(W2 - 1, y)] = '#'; }
  const libreA = (x, y) => !R.murs[cle(x, y)];
  for (let i = 0, n = 0; i < 60 && n < (opts.obstacles || 9); i++) { const x = 1 + Math.floor(hasard(S) * (W2 - 2)), y = 2 + Math.floor(hasard(S) * (H2 - 5)); if (libreA(x, y)) { R.murs[cle(x, y)] = '~'; n++; } }
  S.heros.forEach((h, i) => { h.x = 4 + i; h.y = H2 - 2; delete R.murs[cle(h.x, h.y)]; });
  (opts.monstres || ['gobelin', 'gobelin', 'loup']).forEach((b, i) => { let x, y, k = 0; do { x = 1 + Math.floor(hasard(S) * (W2 - 2)); y = 1 + Math.floor(hasard(S) * 3); } while (k++ < 40 && (!libreA(x, y) || R.monstres.some(m => m.x === x && m.y === y))); ajouteMonstre(S, b, x, y); });
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) R.vu[cle(x, y)] = 1; // tout se voit : c'est une embuscade en plein air
}
// ------------------------------------------------------------------ LE LABYRINTHE DES RUNES : un donjon au hasard (15/11 soir)
// 26 × 30 : 8 salles posées sans se toucher, reliées par des couloirs (plus 2 raccourcis pour faire des boucles) ; départ dans une salle,
// l'autel des runes dans la salle la plus loin ; 14 meubles (4 cachent un fragment, il en faut 3) ; 13 monstres ; 5 pièges dans les couloirs.
function construitLabyrinthe(S, R) {
  const W2 = 26, H2 = 30, G = Array.from({ length:H2 }, () => Array(W2).fill('#')), rnd = n => Math.floor(hasard(S) * n);
  R.w = W2; R.h = H2;
  const salles = [];
  for (let essai = 0; essai < 400 && salles.length < 8; essai++) {
    const w = 4 + rnd(4), h = 3 + rnd(4), x = 1 + rnd(W2 - w - 2), y = 1 + rnd(H2 - h - 2);
    if (salles.some(s => x < s.x + s.w + 2 && x + w + 2 > s.x && y < s.y + s.h + 2 && y + h + 2 > s.y)) continue;
    salles.push({ x, y, w, h, cx:x + Math.floor(w / 2), cy:y + Math.floor(h / 2) });
  }
  salles.sort((a, b) => b.cy - a.cy); // la première salle est en bas : le départ
  salles.forEach(s => { for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) G[y][x] = '.'; });
  const couloir = (a, b) => { let x = a.cx, y = a.cy; const hFirst = hasard(S) < .5;
    const pasX = () => { while (x !== b.cx) { x += Math.sign(b.cx - x); G[y][x] = '.'; } }, pasY = () => { while (y !== b.cy) { y += Math.sign(b.cy - y); G[y][x] = '.'; } };
    if (hFirst) { pasX(); pasY(); } else { pasY(); pasX(); } };
  for (let i = 1; i < salles.length; i++) { const prec = salles.slice(0, i).sort((a, b) => Math.abs(a.cx - salles[i].cx) + Math.abs(a.cy - salles[i].cy) - Math.abs(b.cx - salles[i].cx) - Math.abs(b.cy - salles[i].cy))[0]; couloir(prec, salles[i]); }
  for (let k = 0; k < 2; k++) couloir(salles[rnd(salles.length)], salles[rnd(salles.length)]);
  const dans = (s, x, y) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
  const sol = (x, y) => x >= 0 && y >= 0 && x < W2 && y < H2 && G[y][x] === '.';
  // distances depuis le départ (pour l'autel et pour vérifier qu'un meuble ne bouche rien)
  const D0 = salles[0];
  const distances = () => { const D = {}, f = [[D0.cx, D0.cy]]; D[D0.cx + ',' + D0.cy] = 0; while (f.length) { const [x, y] = f.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (D[k] == null && sol(nx, ny)) { D[k] = D[x + ',' + y] + 1; f.push([nx, ny]); } } } return D; };
  let D = distances();
  const fin = salles.slice(1).sort((a, b) => (D[b.cx + ',' + b.cy] || 0) - (D[a.cx + ',' + a.cy] || 0))[0];
  const nbSol = () => { let n = 0; for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (G[y][x] === '.') n++; return n; };
  // les meubles : contre un mur, dans une salle (pas celle du départ), sans couper le passage
  const sortes = ['coffre', 'armoire', 'tonneaux', 'tombeau', 'etabli', 'etagere', 'bureau', 'autel', 'cristaux', 'fontaine'];
  const meubles = [];
  for (let essai = 0; essai < 300 && meubles.length < 14; essai++) {
    const s = salles[1 + rnd(salles.length - 1)], x = s.x + rnd(s.w), y = s.y + rnd(s.h);
    if (G[y][x] !== '.' || (s === fin && x === fin.cx && y === fin.cy)) continue;
    const contreMur = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !sol(x + dx, y + dy)).length >= 1;
    if (!contreMur || meubles.some(m => Math.abs(m[0] - x) + Math.abs(m[1] - y) < 2)) continue;
    G[y][x] = 'M'; const avant = Object.keys(D).length; const D2 = distances();
    if (Object.keys(D2).length < nbSol()) { G[y][x] = '.'; continue; } // il bouchait un passage
    D = D2; meubles.push([x, y, sortes[rnd(sortes.length)]]);
  }
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (G[y][x] === '#') R.murs[cle(x, y)] = '#';
  const tirage = ['potion', 'grains', 'objet', 'piege', 'monstre', 'parchemin', 'or', 'fumee', 'rien'];
  const caches = meubles.map((m, i) => i).sort(() => hasard(S) - .5).slice(0, 4);
  meubles.forEach(([x, y, t2], i) => { R.murs[cle(x, y)] = 'M'; R.obj[cle(x, y)] = { t:t2, meuble:true, fouille:false, cache:caches.includes(i) ? 'rouage' : tirage[rnd(tirage.length)] }; });
  R.murs[cle(fin.cx, fin.cy)] = 'A'; R.axe = [fin.cx, fin.cy]; R.bronze = true;
  // les pièges : dans les couloirs (hors salles)
  const couloirs = []; for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (G[y][x] === '.' && !salles.some(s => dans(s, x, y))) couloirs.push([x, y]);
  for (let i = 0; i < 5 && couloirs.length; i++) { const [x, y] = couloirs.splice(rnd(couloirs.length), 1)[0]; R.obj[cle(x, y)] = { t:'piege', cache:true }; }
  // les monstres : dans les salles (pas le départ), plus forts près de l'autel
  const faibles = ['gobelin', 'loup', 'scarabee', 'rouagelin', 'page', 'coucou', 'osclaque'], forts = ['salamandre', 'golem', 'colosse', 'elementaire', 'archiviste'];
  for (let i = 0; i < 13; i++) {
    const s = salles[1 + rnd(salles.length - 1)]; let x, y, k = 0;
    do { x = s.x + rnd(s.w); y = s.y + rnd(s.h); } while (k++ < 20 && (G[y][x] !== '.' || R.monstres.some(m => m.x === x && m.y === y) || (x === fin.cx && y === fin.cy)));
    if (G[y][x] !== '.') continue;
    const loin = (D[x + ',' + y] || 0) > 22;
    ajouteMonstre(S, loin && hasard(S) < .6 ? forts[rnd(forts.length)] : faibles[rnd(faibles.length)], x, y);
  }
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy], i) => { if (S.heros[i]) { S.heros[i].x = Math.min(D0.x + D0.w - 1, D0.cx - 1 + dx); S.heros[i].y = Math.min(D0.y + D0.h - 1, D0.cy - 1 + dy); } });
  S.salles = salles.length;
}
// le brouillard « à vue » (carte peinte) : on voit les cases à moins de N cases, si aucun mur ne cache la ligne de vue
function voirAVue(S) {
  const R = S.R, sc = SCEN[S.scen];
  S.heros.forEach(h => { const r = (sc.vue || 5) + (h.id === 'oria' ? 2 : 0);
    for (let y = h.y - r; y <= h.y + r; y++) for (let x = h.x - r; x <= h.x + r; x++) {
      if (x < 0 || y < 0 || x >= R.w || y >= R.h || (x - h.x) ** 2 + (y - h.y) ** 2 > r * r || R.vu[cle(x, y)]) continue;
      // ligne de vue (pas à pas) : un mur l'arrête, mais on voit le mur lui-même
      const n = Math.max(Math.abs(x - h.x), Math.abs(y - h.y)); let ok = true;
      for (let k = 1; k < n; k++) { const cx = Math.round(h.x + (x - h.x) * k / n), cy = Math.round(h.y + (y - h.y) * k / n), m = R.murs[cle(cx, cy)]; if (m === '#') { ok = false; break; } }
      if (ok) R.vu[cle(x, y)] = 1;
    } });
  return [];
}

// ------------------------------------------------------------------ LA CARTE du Sommeil de l'Horloger
// 16/11 (décision de l'utilisateur, fichier Chroniques-Conception-cartes.md) : L'HORLOGE EN ÉTAGES : sous-sol (Crypte), rez-de-chaussée
// (Hall avec la grande porte d'entrée, Réserve), 1er étage (rouages, Atelier, Bibliothèque, Cagibi), sommet (Galerie, Cœur de l'Horloge).
// Les étages sont posés les uns sous les autres sur la grille ; les ESCALIERS sont de petites zones de 2 cases dont les bouts sont RELIÉS
// (R.liens : un pas fait passer d'un étage à l'autre). Plan dessiné par outils/plan-horloger-etages.py (dépôt guilde-des-runes).
// Les parties commencées AVANT le 16/11 gardent l'ancienne carte (R sans « plan ») : SALLES_V1 sert encore à elles.
const SALLES_LU = {
  A:'« Le hall. Tout est figé, même la poussière. Derrière nous, la grande porte ; devant, l’horloge qui ne bat plus. Le sablier tourne. »',
  C:'« Une réserve pleine de vieux meubles. Si j’étais un rouage, je me cacherais là. Ou pas. »',
  G:'« Le sous-sol. Ici dorment les anciens horlogers de la Guilde. Fouillez avec respect. Et vite. »',
  B:'« Quatre leviers. Baissez-les tous ensemble : ils ouvrent la grande porte de bronze, tout en haut, au sommet. »',
  E:'« Un vieil atelier. Des outils, des ressorts… et un établi qui n’a pas été rangé depuis cent ans. »',
  F:'« Chut. C’est une bibliothèque. Le Livre des heures est tout en haut d’une étagère : il faut être deux pour l’attraper. »',
  S:'« Quatre statues de bronze autour d’un petit autel. Sur le mur, une fresque : quatre silhouettes agenouillées face à une flamme. Et… elles sont reliées par des engrenages. Tourner l’une fait tourner sa voisine. »',
  P:'« Une grille de fer. Dans le couloir, une dalle qui s’enfonce quand on marche dessus… Quelqu’un doit rester dessus pour que les autres passent. »',
  H:'« Le sommet. La Grande Horloge. Son axe attend trois rouages. Posez-les… et quelqu’un va se réveiller. »',
};
const NOMS_S = { A:'Le Hall d’entrée', C:'La Réserve', G:'La Crypte des horlogers', B:'La Salle des rouages', E:'L’Atelier abandonné', F:'La Bibliothèque des heures', S:'La Galerie des statues', P:'Le Cagibi grillagé', H:'Le Cœur de l’Horloge' };
const W = 24, H = 31;
const RECTS = { S:[4, 1, 4, 3], H:[11, 1, 10, 3], B:[3, 10, 5, 4], E:[10, 10, 3, 3], F:[14, 10, 4, 4], P:[19, 10, 2, 3], A:[3, 19, 5, 3], C:[10, 19, 4, 3], G:[11, 27, 5, 3] };
const SALLES = {}; Object.keys(RECTS).forEach(k => SALLES[k] = { n:NOMS_S[k], r:RECTS[k], lu:SALLES_LU[k] });
// l'ancienne carte (20 × 18), pour les parties commencées avant le 16/11
const SALLES_V1 = { A:[1, 1, 5, 3], C:[8, 1, 4, 3], G:[14, 1, 5, 3], B:[1, 7, 5, 4], E:[9, 7, 3, 3], F:[15, 7, 4, 4], S:[15, 14, 4, 3], P:[1, 14, 2, 3], H:[4, 14, 10, 3] };
const rectSalle = (S, id) => (S && S.R && S.R.rectsE && S.R.rectsE[id]) || (S && S.R && S.R.plan === 2 ? RECTS[id] : SALLES_V1[id]) || null;
// les couloirs et les escaliers (des zones à part, avec leur nom et leur étage)
const COULOIRS_Z2 = {
  K5:{ r:[3, 5, 18, 1], n:'Le palier du sommet' }, X2:{ r:[21, 5, 2, 1], n:'L’escalier du sommet', esc:true },
  K6:{ r:[3, 8, 18, 1], n:'Le couloir du 1er étage' }, X1h:{ r:[21, 8, 2, 1], n:'L’escalier vers le sommet', esc:true }, X1b:{ r:[1, 8, 2, 1], n:'L’escalier vers le rez-de-chaussée', esc:true },
  K7:{ r:[3, 17, 14, 1], n:'Le couloir du rez-de-chaussée' }, X0h:{ r:[1, 17, 2, 1], n:'L’escalier vers le 1er étage', esc:true }, X0b:{ r:[17, 17, 2, 1], n:'L’escalier vers le sous-sol', esc:true },
  K8:{ r:[11, 25, 8, 1], n:'Le couloir de la crypte' }, Xs:{ r:[19, 25, 2, 1], n:'L’escalier qui remonte', esc:true },
};
const LIENS2 = [[[22, 5], [22, 8]], [[1, 8], [1, 17]], [[18, 17], [20, 25]]];
const ETAGES2 = [[0, 6, 'Le sommet'], [7, 15, '1er étage'], [16, 23, 'Rez-de-chaussée'], [24, 30, 'Sous-sol']];
const etageDe = (S, y) => { if (!S || !S.R || S.R.plan !== 2) return null; const e = ETAGES2.find(([a, b]) => y >= a && y <= b); return e ? e[2] : null; };
// 16/11 : portes de la Réserve, de la Bibliothèque et de la Galerie posées sur les portes PEINTES par Gemini (décalées d'une case)
const PORTES = [[5, 4, 'S'], [15, 4, 'H', 'bronze'], [5, 9, 'B'], [11, 9, 'E'], [16, 9, 'F'], [5, 18, 'A'], [12, 18, 'C'], [13, 26, 'G'], [5, 22, 'A', 'entree']];
// la grille du Cagibi s'ouvre tant qu'un héros se tient sur la dalle du couloir ; les 4 statues de la Galerie (autel au milieu)
// les statues sur les 4 socles peints aux coins de la Galerie (dans l'ordre du tour : haut-gauche, haut-droite, bas-droite, bas-gauche) ;
// celles du haut doivent regarder vers le bas (vers l'autel), celles du bas vers le haut
const GRILLE = [20, 9], DALLE = [18, 8], AUTEL_S = [5, 2], STATUES = [[4, 1], [7, 1], [7, 3], [4, 3]], VEUT_S = [2, 2, 0, 0];
const MEUBLES = [[7, 19, 'coffre', 'A'], [3, 21, 'tonneaux', 'A'], [10, 19, 'caisse', 'C'], [13, 19, 'tonneaux', 'C'], [13, 21, 'caisse', 'C'],
  [12, 28, 'tombeau', 'G'], [14, 28, 'tombeau', 'G'], [15, 27, 'coffre', 'G'], [12, 10, 'etabli', 'E'], [12, 12, 'armoire', 'E'], [17, 14, 'etagere', 'F'], [3, 13, 'tonneaux', 'B'], [20, 3, 'cheminee', 'H'], [19, 12, 'coffre', 'P']];
const ROUAGES_CACHES = ['13,21', '14,28', '12,10', '17,14']; // 16/11 soir : celui de la Bibliothèque est dans l'étagère peinte du mur du bas
const LEVIERS = [[3, 11], [3, 12], [7, 11], [7, 12]]; // sur les deux pupitres peints de la salle (dessin salle-rouages)
const ETAGERES = [], LIVRE = [18, 11], // 16/11 (l'utilisateur) : plus d'étagères au milieu ; le livre est rangé dans la bibliothèque peinte du mur de droite
  AXE = [15, 2], MARCHAND = [10, 12]; // contre les murs, comme les étagères peintes
const DEPART = [[4, 21], [5, 21], [6, 21], [5, 20]]; // juste devant la grande porte d'entrée, comme si on venait d'entrer
const MONSTRES_DEPART = [['rouagelin', 11, 20], ['rouagelin', 14, 17], ['page', 13, 28], ['page', 17, 25], ['gardien', 5, 12], ['rouagelin', 6, 11],
  ['coucou', 9, 8], ['coucou', 19, 8], ['page', 15, 12], ['archiviste', 16, 12], ['rouagelin', 12, 5], ['rouagelin', 18, 5], ['colosse', 10, 11]];
const OBJETS = { bouclier:{ n:'Bouclier de bronze', d:'Bouclier 3 à chaque fois qu’une porte s’ouvre.' }, cle:{ n:'Clé à molette', d:'+1 dé à chaque tour.' }, lunettes:{ n:'Lunettes de l’horloger', d:'Celui qui les porte voit tous les pièges ; touche un piège pour le signaler au groupe.' } };
const MEUBLE_N = { caisse:'la caisse', coffre:'le coffre', armoire:'l’armoire', tonneaux:'les tonneaux', tombeau:'le tombeau', etabli:'l’établi', cheminee:'la cheminée', lit:'le lit de camp', tente:'la tente', etagere:'l’étagère', bureau:'le bureau', banc:'le banc', autel:'l’autel', fontaine:'la fontaine', cristaux:'les cristaux' };
const cle = (x, y) => x + ',' + y;
// t.a = angle cumulé (pour que l'image tourne toujours d'un quart de tour dans le même sens, sans repartir en arrière)
function tourneStatue(R, i) { [i, (i + 1) % 4].forEach(k => { const t = R.statues[k]; t.a = (t.a == null ? t.d : t.a) + 1; t.d = (t.d + 1) % 4; }); }

// ------------------------------------------------------------------ la difficulté selon le NOMBRE DE HÉROS (15/11 : seul, l'Horloger était impossible ; à 4, trop facile)
// 1 héros : environ la moitié des monstres, sablier +15, leviers baissés 8 tours ; 2 : 70 % des monstres ; 3 : 85 % ; 4 : tous, et 3 de plus dans les couloirs.
const ADAPTE = { 1:{ garde:.5, sablier:15, levier:8 }, 2:{ garde:.7, sablier:8, levier:5 }, 3:{ garde:.85, sablier:3, levier:3 }, 4:{ garde:1, sablier:0, levier:2, renfort:3 } };
// les sceaux d'une phase du boss, selon le nombre de héros : seul −2 sceaux, à deux −1, à quatre +1 (« 4 ou plus »)
function sceauxBoss(S, k) {
  const L = phasesDe(S)[k].s(), n = S.nbHeros || S.heros.length; if (!L.length) return L;
  if (n <= 1) L.splice(-2, 2); else if (n === 2) L.pop(); else if (n >= 4) L.push(sceau('min', 4));
  if (k === 2 && S.livre) L.pop();
  if (n >= 2 && !S.ancien) L.push(sceau('tot', GRANDIT.boss * (n - 1))); // 17/11 (équilibrage mesuré) : l'Horloger grandit avec chaque héros en plus du premier
  if (S.scen === 'labyrinthe' && n <= 1 && L.length > 2) L.pop(); // seul dans un grand labyrinthe : un sceau de moins
  return L;
}
function adapte(S) {
  const R = S.R, n = Math.max(1, Math.min(4, S.heros.length)), A = ADAPTE[n];
  S.nbHeros = n; S.dureeLevier = A.levier; S.sablier += A.sablier;
  // 16/11 (retour de l'utilisateur : « pas de mise en danger » à 4) : à 3 héros et plus, chaque monstre frappe 1 de plus
  S.forceM = n >= 3 ? 1 : 0; R.monstres.forEach(m => { m.att = BETES[m.b].att + S.forceM; grandit(S, m); });
  if (S.scen === 'labyrinthe') { S.sablier += [0, 20, 10, 0, 0][n]; if (n <= 2) R.monstres = R.monstres.filter(() => hasard(S) < .7); } // un donjon plus grand : plus de temps aux petits groupes
  if (A.garde < 1 && S.scen !== 'arene') R.monstres = R.monstres.filter(m => hasard(S) < A.garde); // une embuscade garde ses monstres (écrits pour l'aventure)
  if (A.renfort) { // à 4 : quelques monstres de plus, posés dans des couloirs (cases de sol hors salle, loin du départ)
    const libres = []; for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) { const c = cle(x, y); if (!R.murs[c] && !R.salle[c] && !R.portes[c] && !R.obj[c] && !S.heros.some(h => dist(h, { x, y }) < 8) && !R.monstres.some(m => m.x === x && m.y === y)) libres.push([x, y]); }
    const sorte = S.scen === 'brulees' ? ['loup', 'gobelin', 'salamandre'] : S.scen === 'labyrinthe' ? ['gobelin', 'osclaque', 'page'] : ['rouagelin', 'coucou', 'rouagelin'];
    for (let i = 0; i < A.renfort && libres.length; i++) { const [x, y] = libres.splice(Math.floor(hasard(S) * libres.length), 1)[0]; ajouteMonstre(S, sorte[i % sorte.length], x, y); }
  }
}

// ------------------------------------------------------------------ une partie
function nouvelle(heros, s, scen, opts = {}) {
  scen = SCEN[scen] ? scen : 'horloger';
  // un héros = le nom d'une voie (« maelle »…) ou un HÉROS D'AVENTURE { voie, nom, pv, faces, desPlus, av, c } (aventuriers.js)
  if (heros.some(h => h && h.g)) heros = heros.map(h => h && h.g ? Object.assign({ __g:h.g, __B:h.B, pwSet:h.pwSet }) : h); // 15/11 : salle d'attente
  const fait = h => h && h.__g ? (B => ({ id:h.__g, pv:HEROS_C[h.__g].pv + (B.pv || 0), pvmax:HEROS_C[h.__g].pv + (B.pv || 0), objet:null, bouclier:0, att:B.att || 0, def:B.bouclier || 0, agi:B.agi || 0 }))(h.__B || {}) : typeof h === 'string' ? (B => ({ id:h, pv:HEROS_C[h].pv + B.pv, pvmax:HEROS_C[h].pv + B.pv, objet:null, bouclier:0, att:B.att || 0, def:B.bouclier || 0, agi:B.agi || 0 }))(typeof bonusHerosPvE === 'function' && !opts.sansBonus ? bonusHerosPvE(h) : { pv:0 }) // 15/11 : le système des héros (heros-etoiles.js)
    : { id:h.voie, nom:h.nom, av:h.av, c:h.c, portrait:h.portrait, faces:h.faces, bonusF:h.bonusF || null, talents:h.talents || [], desPlus:h.desPlus || 0, pv:h.pv, pvmax:h.pv, objet:null, bouclier:0, att:h.att || 0, def:h.def || 0, agi:h.agi || 0 }; // 16/11 : l'équipement (aventuriers.js)
  const S = { heros:heros.map(fait), scen, sablier:SCEN[scen].sablier, rs:graine(s), graine:s,
    livre:false, journal:[], seq:0, fin:null, score:0, tours:0, rouagesTrouves:0, etape:'jeu' };
  const R = { w:W, h:H, murs:{}, salle:{}, obj:{}, portes:{}, monstres:[], tour:0, vuSalle:{}, vu:{}, rouagesPoses:0, boss:null, bronze:false, leviersTour:{} };
  S.R = R;
  // 16/11 nuit : LES POUVOIRS DES HÉROS (pouvoirs-heros.js) : Groupe si 2 héros ou plus, sinon Solo ; sans eux (vieille partie) = comme avant
  S.pre = S.heros.length >= 2 ? 'groupe' : 'solo';
  S.heros.forEach((z, i) => { const src = heros[i]; let set = src && typeof src === 'object' && src.pwSet || null;
    if (!set && !opts.sansPouvoirs && typeof racine.pwPourMoteur === 'function') set = racine.pwPourMoteur(typeof src === 'string' ? src : (src.__g || src.av || src.voie));
    z.pw = set ? set[S.pre] : null;
    if (a_t(z, 'robuste')) { const b = 4 + pwB3(z, 'passif'); z.pv += b; z.pvmax += b; } }); // 19/11 : le talent Robuste (Passif d'un héros d'aventure)
  if (scen === 'atelier') { construitAtelier(S, R, opts.salle || { w:4, h:3 }); S.objectif = 'vaincre'; log(S, `🛠 Essai de « ${(opts.salle && opts.salle.nom) || 'la salle'} » : déplacez-vous, fouillez, battez les monstres.`); debutTour(S); return S; }
  if (scen === 'entrainement') { construitEntrainement(S, R); voir(S); log(S, '🎓 L’entraînement de Moustache : un petit donjon pour apprendre.'); debutTour(S); return S; }
  if (scen === 'arene') { construitArene(S, R, opts); adapte(S); S.objectif = 'vaincre'; log(S, '⚔ Embuscade ! Abattez tous les monstres.'); debutTour(S); return S; }
  if (scen === 'labyrinthe') { construitLabyrinthe(S, R); adapte(S); voir(S); log(S, '✦ Le Labyrinthe des Runes : un donjon jamais vu. Trouvez 3 fragments de rune dans les meubles et portez-les à l’autel, tout au fond.'); debutTour(S); return S; }
  if (scen === 'brulees') { construitCarte(S, R); adapte(S); voir(S); log(S, '🔥 Les Terres brûlées : trouvez 3 braises éternelles en fouillant les meubles et portez-les au grand brasier.'); debutTour(S); return S; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) R.murs[cle(x, y)] = '#';
  const creuse = ([x0, y0, w, h], id) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { delete R.murs[cle(x, y)]; if (id) R.salle[cle(x, y)] = id; } };
  Object.entries(SALLES).forEach(([id, D]) => creuse(D.r, id)); Object.values(COULOIRS_Z2).forEach(c => creuse(c.r));
  PORTES.forEach(([x, y, id, b]) => { delete R.murs[cle(x, y)]; R.portes[cle(x, y)] = { salle:id, ouverte:false, bronze:b === 'bronze', entree:b === 'entree' }; });
  R.plan = 2; R.depart = DEPART.map(c => c.slice()); R.liens = {}; R.lus = { A:true }; // la salle de départ est racontée au début
  LIENS2.forEach(([a, b]) => { R.liens[cle(...a)] = cle(...b); R.liens[cle(...b)] = cle(...a); });
  const tirage = ['potion', 'grains', 'objet', 'piege', 'monstre', 'parchemin', 'or', 'fumee', 'rien'];
  tirage.push('mimique'); // 16/11 (l'utilisateur) : des meubles vides, piégés… ou qui mordent
  MEUBLES.forEach(([x, y, t, id]) => { R.murs[cle(x, y)] = 'M'; R.obj[cle(x, y)] = { t, meuble:true, salle:id, fouille:false, verrou:t === 'coffre' ? 4 : 0, cache:ROUAGES_CACHES.includes(cle(x, y)) ? 'rouage' : tirage[Math.floor(hasard(S) * tirage.length)] }; });
  LEVIERS.forEach(([x, y]) => { R.murs[cle(x, y)] = 'L'; R.obj[cle(x, y)] = { t:'levier', v:2 + Math.floor(hasard(S) * 4) }; });
  const vus = []; Object.values(R.obj).filter(o => o.t === 'levier').forEach(o => { while (vus.includes(o.v)) o.v = 2 + Math.floor(hasard(S) * 4); vus.push(o.v); });
  ETAGERES.forEach(([x, y]) => R.murs[cle(x, y)] = 'B'); R.murs[cle(...LIVRE)] = 'K'; R.obj[cle(...LIVRE)] = { t:'livre' };
  R.murs[cle(...AXE)] = 'A'; R.axe = AXE.slice();
  R.murs[cle(...MARCHAND)] = 'N'; R.obj[cle(...MARCHAND)] = { t:'marchand' }; // 16/11 : le colporteur, dans l'Atelier abandonné
  [[6, 17], [12, 8], [9, 5], [15, 25]].forEach(([x, y]) => R.obj[cle(x, y)] = { t:'piege', cache:true });
  R.obj[cle(19, 12)].cache = 'potion2'; // le Cagibi : deux potions
  // la grille : la case reste « fermée » sauf quand un héros est sur la dalle
  delete R.murs[cle(...GRILLE)]; R.grille = { x:GRILLE[0], y:GRILLE[1], dx:DALLE[0], dy:DALLE[1] };
  // les statues (murs 'T') : chacune regarde N/E/S/O (0-3) ; but = toutes vers l'autel ; tourner l'une tourne aussi la suivante
  R.murs[cle(...AUTEL_S)] = 'O'; R.murs[cle(AUTEL_S[0] + 1, AUTEL_S[1])] = 'o'; const veut = VEUT_S; // 16/11 soir : le cercle peint de l'autel couvre 2 cases, on ne marche sur aucune // N de l'autel regarde S, E regarde O…
  R.statues = STATUES.map(([x, y], i) => ({ x, y, d:veut[i], veut:veut[i] }));
  for (let k = 0; k < 3; k++) { const i = Math.floor(hasard(S) * 4); tourneStatue(R, i); } // mélangées depuis la bonne position : toujours faisable
  if (R.statues.every(t => t.d === t.veut)) tourneStatue(R, 0);
  R.statues.forEach(t => R.murs[cle(t.x, t.y)] = 'T');
  MONSTRES_DEPART.forEach(([b, x, y]) => ajouteMonstre(S, b, x, y));
  adapte(S);
  DEPART.forEach(([x, y], i) => { if (S.heros[i]) { S.heros[i].x = x; S.heros[i].y = y; } });
  voir(S);
  log(S, '⏳ La grande porte se referme derrière vous. Le Sommeil de l’Horloger commence : trouvez 3 rouages dans les meubles des étages, montez au sommet, ouvrez la porte de bronze, réveillez l’Horloger.');
  debutTour(S); return S;
}
const nm = h => h.nom || HEROS_C[h.id].n;
// ------------------------------------------------------------------ LE SAC (15/11, façon HeroQuest) : des trésors trouvés en fouillant, gardés pour le bon moment, utilisés SANS dé
const SAC = {
  potion:   { e:'🧪', n:'Une potion de soin', d:'+5 PV, à toi ou à un ami à côté.' },
  parchemin:{ e:'📜', n:'Un parchemin de feu', d:'Brise 2 sceaux d’un monstre jusqu’à 4 cases.' },
  fumee:    { e:'💨', n:'Une bombe fumigène', d:'Les monstres ne frappent pas à la fin de ce tour.' },
};
// utiliser l'objet n°k du sac du héros hi ; cible : un héros (potion) ou un monstre (parchemin)
function utiliser(S, hi, k, cible) {
  const h = S.heros[hi], it = h.sac && h.sac[k], R = S.R; if (!it || h.aTerre) return 'Rien à utiliser.';
  if (it === 'potion') { const c = S.heros[cible == null ? hi : cible]; if (!c || (c !== h && !voisins(h, c))) return 'Il faut être à côté de l’ami.';
    const av = c.pv; c.pv = Math.min(c.pvmax, c.pv + 5); if (c.aTerre) { c.aTerre = false; c.pv = Math.max(c.pv, 5); } log(S, `🧪 ${nm(h)} donne une potion à ${nm(c)} : +${c.pv - av} PV.`); h.sac.splice(k, 1); return { ok:true, ev:[{ t:'soin', h:S.heros.indexOf(c) }] }; }
  if (it === 'parchemin') { const m = cible === 'boss' ? R.boss : R.monstres.find(z => z.id === cible); if (!m) return 'Touche un monstre.'; if (dist(h, m) > 4) return 'Trop loin (4 cases au plus).';
    m.sceaux.filter(s => !s.ok).slice(0, 2).forEach(brise); log(S, `📜 ${nm(h)} lit le parchemin de feu : deux sceaux de ${m.n} brûlent.`); h.sac.splice(k, 1); return { ok:true, ev:verifieMonstre(S, m) }; }
  if (it === 'fumee') { R.fumee = true; log(S, `💨 ${nm(h)} lance une bombe fumigène : les monstres ne frapperont pas ce tour-ci.`); h.sac.splice(k, 1); return { ok:true, ev:[] }; }
  return 'Rien à utiliser.';
}
const a_t = (h, k) => pwA(h, 'passif', k); // 19/11 : un TALENT de héros d'aventure = une version de son Passif (pouvoirs-heros.js, PW_TALENTS) ; il monte avec le rang du Passif // le nom affiché (héros d'aventure ou héros de la Guilde)
const log = (S, t) => { S.journal.unshift(t); S.journal.length = Math.min(S.journal.length, 40); };
// 17/11 (retour de l'utilisateur : « un tour suffit à tuer un monstre, on n'a pas peur », mesuré au simulateur) : les monstres GRANDISSENT
// avec chaque héros EN PLUS du premier (seul : rien ne change). Élites : un sceau « Σ » de 5 par héros en plus et +1 à leurs coups ;
// ordinaires : +1 sceau « n'importe quel dé » à 4 héros ; l'Horloger : un sceau « Σ » de 4 par héros en plus à chaque phase. (Equilibrage-pouvoirs-17-11.md)
const GRANDIT = { elite:5, eliteAtt:1, ordDes:4, boss:4 }; // réglé au simulateur le 17/11 (6/3/5 : 4 héros à 65 %, trop dur ; 5/4/4 : 77-92 %) // ordDes : nombre de héros à partir duquel les ordinaires ont un sceau de plus
function grandit(S, m) {
  if (!m || m.grandi || !S.nbHeros || S.ancien) return; m.grandi = true; const B = BETES[m.b], n = S.nbHeros; if (!B || B.boss || B.immobile || n < 2) return;
  if (B.elite || B.leviers) { m.sceaux.push(sceau('tot', GRANDIT.elite * (n - 1))); m.att += GRANDIT.eliteAtt; }
  else for (let i = GRANDIT.ordDes - 1; i < n; i++) m.sceaux.push(sceau('any'));
}
function ajouteMonstre(S, b, x, y) { const B = BETES[b]; const m = { id:'m' + S.seq++, b, n:B.n, img:B.img, x, y, att:B.att + (S.forceM || 0), sceaux:B.s(), it:'frappe' }; S.R.monstres.push(m); grandit(S, m); return m; }
function libre(S, x, y, sauf) { const R = S.R; if (x < 0 || y < 0 || x >= R.w || y >= R.h || R.murs[cle(x, y)]) return false;
  const p = R.portes[cle(x, y)]; if (p && !p.ouverte) return false;
  if (R.grille && x === R.grille.x && y === R.grille.y && !grilleOuverte(S)) return false;
  if (R.monstres.some(m => m !== sauf && m.x === x && m.y === y)) return false; if (R.boss && R.boss !== sauf && R.boss.x === x && R.boss.y === y) return false; return true; }
const herosEn = (S, x, y) => S.heros.find(h => h.x === x && h.y === y);
// 17/11 (l'utilisateur : « l'autre reste bloqué dedans, il faut retourner sur la dalle ») : un héros qui se tient SOUS la grille la retient ouverte
const grilleOuverte = S => !!(S.R.grille && S.heros.some(h => !h.aTerre && ((h.x === S.R.grille.dx && h.y === S.R.grille.dy) || (h.x === S.R.grille.x && h.y === S.R.grille.y))));
const voisins = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
// 16/11 (retour de l'utilisateur) : AU CONTACT = une case autour, DIAGONALES COMPRISES (pour les héros comme pour les monstres),
// sauf un coin de mur (les deux cases de côté sont des murs : on ne frappe pas à travers l'angle).
function contact(S, a, b) {
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y); if (dx + dy === 1) return true; if (dx !== 1 || dy !== 1) return false;
  const M = S && S.R ? S.R.murs : {}; return !(M[cle(a.x, b.y)] && M[cle(b.x, a.y)]);
}
// le nombre de cases qu'un dé fait marcher, avec le détail (affiché sous les dés)
function pasDe(h, v) {
  const det = [`dé ${v}`]; let n = v;
  if (h.agi) { n += h.agi; det.push(`${h.agi > 0 ? '+' : ''}${h.agi} équipement`); }
  if (h.id === 'oria') { n += 2; det.push('+2 éclaireuse'); if (pwA(h, 'passif', 'A') && pwR(h, 'passif') >= 5) { n += 1; det.push('+1 œil du cartographe'); } }
  if (h.echo) { n += 1; det.push('+1 écho du cor'); }
  if (a_t(h, 'eclaireur')) { const p = pwR(h, 'passif') >= 10 ? 2 : 1; n += p; det.push(`+${p} Pied léger`); }
  if (h.porte) { n -= 1; det.push('−1 rouage porté'); }
  return { n:Math.max(1, n), det };
}
// ---- ce qu'on voit : une salle entière dès qu'on y entre (ou qu'on ouvre sa porte) ; les couloirs en avançant
function revele(S, id) { const R = S.R; if (R.vuSalle[id]) return false; R.vuSalle[id] = true;
  const [x0, y0, w, h] = rectSalle(S, id); for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) R.vu[cle(x, y)] = 1; return true; }
// 16/11 : les parties commencées avant gardent leur carte : on y retire les étagères du milieu de la Bibliothèque et on range le livre dans le mur
function majBibliotheque(S) { const R = S.R; if (R.plan !== 2 || R.biblio2) return; R.biblio2 = true;
  ['14,11', '14,12', '17,12'].forEach(c => { if (R.murs[c] === 'B') delete R.murs[c]; });
  if (R.murs['17,11'] === 'K' && R.obj['17,11'] && R.obj['17,11'].t === 'livre') { delete R.murs['17,11']; delete R.obj['17,11']; R.murs['18,11'] = 'K'; R.obj['18,11'] = { t:'livre' }; } }
// 16/11 soir (l'utilisateur : « je suis juste à côté, la case devrait être verte ») : les parties commencées plus tôt avaient des étagères
// à d'autres places : toute étagère restée DANS la Bibliothèque est retirée (le Livre des heures, lui, va dans le mur de droite)
function majBibliotheque3(S) { const R = S.R; if (R.plan !== 2 || R.biblio3) return; R.biblio3 = true;
  Object.keys(R.murs).forEach(c => { if (R.salle[c] !== 'F') return;
    if (R.murs[c] === 'B' && !S.livre) delete R.murs[c];
    if (R.murs[c] === 'K' && c !== '18,11') { delete R.murs[c]; const o = R.obj[c]; delete R.obj[c]; if (!R.murs['18,11']) { R.murs['18,11'] = 'K'; R.obj['18,11'] = o || { t:'livre' }; } } }); }
// 16/11 soir (l'utilisateur : « pourquoi je ne peux pas remonter ? » ; « la case à fouiller doit être sur une étagère, pas sur le sol ») :
// plus aucune étagère au milieu de la salle (même là où était le livre déjà pris), et le coffre du sol devient l'étagère peinte du mur de droite
function majBibliotheque4(S) { const R = S.R; if (R.plan !== 2 || R.biblio4) return; R.biblio4 = true;
  Object.keys(R.murs).forEach(c => { if (R.salle[c] === 'F' && R.murs[c] === 'B') delete R.murs[c]; });
  const o = R.obj['17,13']; if (o && o.meuble && o.salle === 'F' && !R.murs['18,12']) { delete R.obj['17,13']; delete R.murs['17,13']; o.t = 'etagere'; if (!o.crochete) o.verrou = 0; R.obj['18,12'] = o; R.murs['18,12'] = 'M'; } }
// 16/11 soir (2e retour : « la case jaune doit être dans la bibliothèque ») : la case à fouiller va dans la bibliothèque peinte du mur du bas,
// juste sous son ancienne place (la 4e mise à jour ne la déplaçait pas : la case du mur n'était pas vide)
function majBibliotheque5(S) { const R = S.R; if (R.plan !== 2 || R.biblio5) return; R.biblio5 = true;
  const de = ['17,13', '18,12'].find(c => R.obj[c] && R.obj[c].meuble && R.obj[c].salle === 'F');
  if (!de || (R.murs['17,14'] && R.murs['17,14'] !== '#')) return; const o = R.obj[de]; delete R.obj[de];
  if (de === '17,13') delete R.murs[de]; else R.murs[de] = '#';
  o.t = 'etagere'; if (!o.crochete) o.verrou = 0; R.obj['17,14'] = o; R.murs['17,14'] = 'M'; }
// parties commencées avant : la 2e case de l'autel de la Galerie devient infranchissable (si personne n'est dessus)
function majAutel2(S) { const R = S.R; if (R.plan !== 2 || R.autel2 || !R.statues) return; const c = cle(AUTEL_S[0] + 1, AUTEL_S[1]); if (herosEn(S, AUTEL_S[0] + 1, AUTEL_S[1]) || R.monstres.some(m => m.x === AUTEL_S[0] + 1 && m.y === AUTEL_S[1])) return; R.autel2 = true; if (!R.murs[c]) R.murs[c] = 'o'; }
function voir(S) {
  elargitPortes(S); majBibliotheque(S); majBibliotheque3(S); majBibliotheque5(S); majAutel2(S);
  if (SCEN[S.scen || 'horloger'].image || SCEN[S.scen || 'horloger'].hasard) return voirAVue(S);
  const R = S.R; let neuves = [];
  S.heros.forEach(h => {
    const ici = R.salle[cle(h.x, h.y)]; if (ici && revele(S, ici)) neuves.push(ici);
    if (ici) return; // dans une salle : on voit la salle, pas plus loin
    const loin = h.id === 'oria' ? 5 : 3; R.vu[cle(h.x, h.y)] = 1;
    // en haut (ou en bas) d'un escalier, on voit le bout relié et l'escalier de l'autre étage
    if (R.liens && R.liens[cle(h.x, h.y)]) { const [lx, ly] = R.liens[cle(h.x, h.y)].split(',').map(Number); for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) R.vu[cle(lx + dx, ly + dy)] = 1; }
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { for (let k = 1; k <= loin; k++) { const x = h.x + dx * k, y = h.y + dy * k, c = cle(x, y);
      R.vu[c] = 1; R.vu[cle(x + dy, y + dx)] = 1; R.vu[cle(x - dy, y - dx)] = 1;
      if (R.murs[c] || R.portes[c] || R.salle[c]) break; } });
  });
  return neuves;
}
const visible = (S, x, y) => !!S.R.vu[cle(x, y)];
// un monstre n'agit que si sa case est dévoilée, ou si un héros est tout près
const reveille = (S, m) => visible(S, m.x, m.y) && (!S.R.salle[cle(m.x, m.y)] || S.R.vuSalle[S.R.salle[cle(m.x, m.y)]]);

// ------------------------------------------------------------------ le tour du groupe
function debutTour(S) {
  const R = S.R, evC = []; R.tour++; S.tours++;
  // 17/11 (idée de l'utilisateur, comme Dice Throne / les intentions de Slay the Spire) : un monstre qui CHARGE frappe au début du tour des héros,
  // avant qu'ils jouent : +2, tous les héros collés à lui. On l'évite en s'éloignant ou en se protégeant pendant le tour d'avant.
  for (const m of R.monstres.slice()) { if (m.it !== 'charge') continue; m.dejaCharge = true; if (m.entrave >= R.tour - 1 || !reveille(S, m)) { m.it = 'rien'; continue; }
    const v = m.att + 2, Q = S.heros.filter(h => !h.aTerre && contact(S, m, h));
    if (!Q.length) { log(S, `⚡ La charge de ${m.n} frappe dans le vide : personne n’est resté collé à lui.`); evC.push({ t:'charge', m:m.id, vide:true }); continue; }
    evC.push({ t:'charge', m:m.id }); Q.forEach(h => { const perdu = blesseHeros(S, h, Math.max(0, v - pwMoinsCoup(S, h))); evC.push({ t:'frappe', m:m.id, h:S.heros.indexOf(h), v:perdu }); pwApresCoup(S, m, h, evC); log(S, `⚡ La charge de ${m.n} frappe ${nm(h)} avant qu’il joue (−${perdu}).`); }); }
  // 17/11 (l'utilisateur : « on peut faire des tours en boucle et se mettre 80 de bouclier ») : comme Slay the Spire / Gloomhaven, le bouclier
  // protège pendant le tour des monstres (et contre les charges juste au-dessus), puis il FOND au début du tour des héros ;
  // seule la Défense de l'équipement revient à chaque tour
  S.heros.forEach(h => { h.bouclier = h.def && !h.aTerre ? h.def : 0; }); // 🛡 la Défense de l'équipement
  S.heros.forEach(h => {
    let n = HEROS_C[h.id].des + (h.desPlus || 0) + (h.objet === 'cle' ? 1 : 0) - (S.sablier <= 0 ? 1 : 0) + (h.id === 'gorm' && pwA(h, 'passif', 'A') && h.pv < h.pvmax / 2 ? 1 : 0); // 16/11 nuit : Grand souffle
    h.des = []; if (h.aTerre) n = 0;
    for (let i = 0; i < Math.max(0, n); i++) { const r = de6(S); h.des.push({ id:'d' + S.seq++, v:h.faces ? h.faces[r - 1] : r, b:h.bonusF ? h.bonusF[r - 1] || 0 : 0 }); } // dé personnel : ses chiffres + le bonus forgé de la face (16/11 soir)
    if (h.carillon && pwSansCarillon(S, h)) { h.carillon = false; log(S, `🕊 ${nm(h)} n’entend pas le Carillon.`); }
    if (h.carillon && h.des.length) { h.des.sort((a, b) => b.v - a.v); h.des.shift(); h.carillon = false; log(S, `🔔 ${nm(h)} a perdu son plus gros dé.`); }
  });
  pwDebutTour(S);
  // 18/11 : l'entraînement impose ses dés (S.desForces[tour]) pour que la leçon marche à coup sûr
  if (S.desForces && S.desForces[R.tour - 1]) S.heros.forEach(h => { if (!h.aTerre) h.des = S.desForces[R.tour - 1].map(v => ({ id:'d' + S.seq++, v, b:0 })); });
  for (const c in R.leviersTour) { R.leviersTour[c]--; if (R.leviersTour[c] <= 0) { delete R.leviersTour[c]; if (!R.bronze) log(S, '🎚 Un levier remonte tout seul dans un claquement : il faut les baisser tous les quatre en même temps.'); } }
  // les tas d'os se relèvent (un tour après)
  (R.os || []).filter(o => o.t < R.tour).forEach(o => { if (libre(S, o.x, o.y) && !herosEn(S, o.x, o.y)) { const m = ajouteMonstre(S, 'osclaque', o.x, o.y); m.sceaux = [sceau('any')]; m.revenu = true; log(S, '🦴 Clac, clac, clac… le tas d’os se remonte : un Os-qui-claque revient (un seul sceau) !'); } });
  R.os = (R.os || []).filter(o => o.t >= R.tour);
  R.monstres.forEach(m => { const B = BETES[m.b], r = hasard(S);
    if (B.immobile) { m.it = 'rien'; return; }
    if (m.charge != null) { m.it = 'gros'; return; }
    const r2 = hasard(S); if (B.charge && !m.dejaCharge && r2 < B.charge && !S.ancien) { m.it = 'charge'; return; } m.dejaCharge = false;
    m.it = B.grosCoup && r < B.grosCoup ? 'elan' : B.garde && r < B.garde ? 'garde' : B.soin && r < B.soin && R.monstres.length > 1 ? 'soin' : B.fuit && r < B.fuit ? 'fuit' : 'frappe';
    // 16/11 : le Gardien de bronze surveille ses leviers : s'il y en a de baissés, il en remonte un (une fois sur deux)
    if (B.leviers && !R.bronze && Object.keys(R.leviersTour).length && r < .5) m.it = 'levier'; });
  if (R.boss) R.boss.it = R.boss.repos && R.boss.b === 'roios' ? 'remonte' : 'frappe';
  return evC;
}
function atteignables(S, h, v, pas) {
  const R = S.R, pasMax = pas ? v : pasDe(h, v).n, res = {}, file = [[h.x, h.y, 0]], vu = { [cle(h.x, h.y)]:1 };
  while (file.length) { const [x, y, d] = file.shift(); if (d >= pasMax) continue;
    // on s'arrête en entrant dans une salle pas encore vue (comme à HeroQuest : on découvre en entrant)
    const ici = R.salle[cle(x, y)]; if (d > 0 && ici && !R.vuSalle[ici]) continue;
    const voisinsC = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]);
    if (R.liens && R.liens[cle(x, y)]) voisinsC.push(R.liens[cle(x, y)].split(',').map(Number)); // 16/11 : un escalier mène à l'autre étage en un pas
    for (const [nx, ny] of voisinsC) { const c = cle(nx, ny); if (vu[c] || !libre(S, nx, ny) || !R.vu[c]) continue; vu[c] = 1; if (!herosEn(S, nx, ny)) res[c] = d + 1; file.push([nx, ny, d + 1]); } }
  return res;
}
// 16/11 (l'utilisateur : « mon dé de 4, c'est 4 mouvements ou 4 interactions ; il ne doit pas disparaître ») :
// fouiller, poser un rouage, tourner une statue coûtent UN PAS ; le reste du dé reste dans un dé 👣
function unPas(S, h, idDe) { const d = h.des.find(z => z.id === idDe); if (!d) return; prendDe(h, idDe); const reste = (d.pas ? d.v : pasDe(h, d.v).n) - 1; if (reste > 0) h.des.push({ id:'d' + S.seq++, v:reste, pas:true }); }
const prendDe = (h, id) => { const i = h.des.findIndex(d => d.id === id); return i < 0 ? null : h.des.splice(i, 1)[0]; };
// ---- ouvrir une porte : GRATUIT, à côté de la porte ; la salle derrière se dévoile
// 16/11 (l'utilisateur) : une porte PEINTE déborde souvent sur la case de mur voisine : on l'ouvre aussi depuis cette case-là
// 16/11 (l'utilisateur : « deux cases pour simuler la porte, pas trois ») : on note, porte par porte, de quel côté la porte PEINTE déborde
const DEBORDE = { '12,18':[11, 18], '16,9':[15, 9], '5,4':[6, 4], '15,4':[16, 4] }; // 16/11 soir : la porte de bronze du Cœur est double aussi (RÈGLE : porte peinte double = 2 cases, voir Chroniques-Conception-cartes.md) // 16/11 soir : la porte peinte de la Galerie des statues fait aussi deux cases // + la Bibliothèque (16/11) : la porte peinte couvre aussi la case de gauche // la Réserve : la porte peinte couvre aussi la case de gauche
function moitiesPorte(S, x, y) { if (S.R.plan !== 2) return []; const d = DEBORDE[cle(x, y)]; return d && S.R.murs[cle(...d)] === '#' ? [d] : []; }
// une porte peinte large, une fois OUVERTE : sa moitié de mur devient un passage (on traverse les deux cases)
function elargitPortes(S) { const R = S.R; if (R.plan !== 2) return; Object.entries(R.portes).forEach(([c, p]) => { if (!p.ouverte || p.moitie) return; const [x, y] = c.split(',').map(Number);
  moitiesPorte(S, x, y).forEach(([a, b]) => { delete R.murs[cle(a, b)]; R.portes[cle(a, b)] = { salle:p.salle, ouverte:true, moitie:true }; R.vu[cle(a, b)] = 1; }); }); }
function presDePorte(S, h, x, y) { return dist(h, { x, y }) === 1 || (S.R.plan === 2 && moitiesPorte(S, x, y).some(([a, b]) => dist(h, { x:a, y:b }) === 1 && !S.R.murs[cle(h.x, h.y)])); }
function ouvrir(S, hi, x, y) {
  const h = S.heros[hi], R = S.R, p = R.portes[cle(x, y)];
  if (!p || p.ouverte) return 'Pas de porte fermée ici.'; if (h.aTerre || !presDePorte(S, h, x, y)) return 'Il faut être juste à côté de la porte.';
  if (p.entree) return 'Dehors, la ville est figée dans le temps : on ne repartira pas sans avoir réveillé l’Horloger.';
  if (p.essai) return 'Essai de l’atelier : cette porte mènera à la suite du donjon quand les salles seront assemblées (étape B).';
  if (p.bronze && !R.bronze) return S.leviersBut ? 'Cette porte de bronze est verrouillée : baisse d’abord le levier de la salle.' : 'La porte de bronze est verrouillée : baissez ensemble les 4 leviers de la Salle des rouages.';
  p.ouverte = true; R.vu[cle(x, y)] = 1;
  // on regarde DERRIÈRE la porte, dans le sens où on l'ouvre : une salle se dévoile en entier, un couloir sur 3 cases
  const dx = x - h.x, dy = y - h.y, apres = cle(x + dx, y + dy); let neuve = false;
  if (R.salle[apres]) neuve = revele(S, R.salle[apres]);
  else for (let k = 1; k <= 3; k++) { const cx = x + dx * k, cy = y + dy * k, c = cle(cx, cy); R.vu[c] = 1; R.vu[cle(cx + dy, cy + dx)] = 1; R.vu[cle(cx - dy, cy - dx)] = 1; if (R.murs[c] || R.portes[c]) break; }
  const salleOuverte = R.salle[apres] || p.salle; voir(S);
  S.heros.forEach(z => { if (z.objet === 'bouclier') z.bouclier += 3; });
  log(S, R.salle[apres] ? `🚪 ${nm(h)} ouvre la porte : ${(SALLES[R.salle[apres]] || { n:(R.nomsE && R.nomsE[R.salle[apres]]) || 'une salle' }).n}.` : `🚪 ${nm(h)} ouvre la porte : un couloir.`);
  // 16/11 (l'utilisateur : « sinon on se fait spoiler ») : Moustache ne raconte la salle qu'au PREMIER PAS dedans (voir bouger)
  return { ok:true, ev:[], point:true };
}
// 17/11 (l'utilisateur : « dans le couloir, Louve est passée sur le piège sans le prendre, moi oui après elle ») : le piège ne partait
// que si l'on S'ARRÊTAIT dessus. Maintenant on suit le CHEMIN case par case (le plus court, qui évite les pièges déjà repérés si possible) :
// le premier piège caché sur le chemin arrête le héros dessus (comme à HeroQuest).
function chemin(S, h, x, y, pasMax, eviter) {
  const R = S.R, par = { [cle(h.x, h.y)]:null }, file = [[h.x, h.y, 0]], but = cle(x, y);
  const piegeVu = c => { const o = R.obj[c]; return o && o.t === 'piege' && !o.trouve && (!o.cache || o.vu); };
  while (file.length) { const [cx, cy, d] = file.shift(); if (cle(cx, cy) === but) break; if (d >= pasMax) continue;
    const ici = R.salle[cle(cx, cy)]; if (d > 0 && ici && !R.vuSalle[ici]) continue;
    const vs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]);
    if (R.liens && R.liens[cle(cx, cy)]) vs.push(R.liens[cle(cx, cy)].split(',').map(Number));
    for (const [nx, ny] of vs) { const c = cle(nx, ny); if (c in par || !libre(S, nx, ny) || !R.vu[c]) continue; if (eviter && c !== but && piegeVu(c)) continue;
      par[c] = cle(cx, cy); file.push([nx, ny, d + 1]); } }
  if (!(but in par)) return null;
  const l = []; for (let c = but; c && c !== cle(h.x, h.y); c = par[c]) l.unshift(c); return l;
}
function bouger(S, hi, idDe, x, y) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe); if (!d || h.aTerre) return 'Ce héros ne peut pas bouger.';
  const A = atteignables(S, h, d.v, d.pas), fait = A[cle(x, y)]; if (!fait) return 'Trop loin pour ce dé.';
  const total = d.pas ? d.v : pasDe(h, d.v).n, reste = total - fait;
  // le piège caché sur le chemin (avant la case d'arrivée) arrête le héros dessus
  let piegeEnRoute = false;
  { const ch = chemin(S, h, x, y, fait, true) || chemin(S, h, x, y, fait, false) || [];
    const k = ch.findIndex((c, i) => i < ch.length - 1 && S.R.obj[c] && S.R.obj[c].t === 'piege' && !S.R.obj[c].trouve && !herosEn(S, ...c.split(',').map(Number)));
    if (k >= 0) { [x, y] = ch[k].split(',').map(Number); piegeEnRoute = true; } }
  prendDe(h, idDe); const de0 = [h.x, h.y]; h.x = x; h.y = y; const ev = [{ t:'marche', h:hi, de:de0 }];
  // 16/11 (l'utilisateur : « je suis toujours là ») : marcher SUR le bout d'un escalier fait passer à l'autre étage, sans pas en plus
  { const l = S.R.liens && S.R.liens[cle(x, y)], venu = S.R.liens && S.R.liens[cle(...de0)] === cle(x, y);
    if (l && !venu && !piegeEnRoute) { const [lx, ly] = l.split(',').map(Number); if (libre(S, lx, ly) && !herosEn(S, lx, ly)) { h.x = lx; h.y = ly; ev.push({ t:'etage', h:hi }); log(S, `${ly < y ? '⬆' : '⬇'} ${nm(h)} ${ly < y ? 'monte' : 'descend'} : ${etageDe(S, ly)}.`); } } }
  // 16/11 (retour de l'utilisateur : « un dé de 4 = 4 actions ») : les PAS PAS UTILISÉS restent dans un petit dé 👣
  // qui sert à marcher encore ou à agir (fouiller, levier, porte, axe, livre) ; il ne frappe pas et ne se donne pas.
  if (reste > 0 && !piegeEnRoute) h.des.push({ id:'d' + S.seq++, v:reste, pas:true });
  const o = S.R.obj[cle(x, y)];
  if (o && o.t === 'piege' && !o.trouve) { o.trouve = true; o.cache = false; blesseHeros(S, h, 3); ev.push({ t:'piege', h:hi }); log(S, piegeEnRoute ? `⚠ ${nm(h)} marche sur un piège caché en chemin : −3 PV, et s’arrête là.` : `⚠ ${nm(h)} tombe dans un piège : −3 PV.`); }
  if (o && o.t === 'rouage' && !h.porte) { delete S.R.obj[cle(x, y)]; h.porte = true; log(S, `⚙ ${nm(h)} ramasse un rouage.`); }
  else if (o && o.t === 'rouage') log(S, `⚙ ${nm(h)} porte déjà un rouage : il en laisse un par terre (un seul à la fois).`);
  if (S.R.grille && x === S.R.grille.dx && y === S.R.grille.dy) { log(S, `⬇ ${nm(h)} monte sur la dalle : CLONK… la grille du Cagibi remonte. Tant que ${nm(h)} reste dessus, elle reste ouverte.`); ev.push({ t:'grille' }); }
  else if (S.R.grille && x === S.R.grille.x && y === S.R.grille.y) log(S, `✋ ${nm(h)} se tient sous la grille et la retient : elle reste ouverte tant qu’il ou elle est dessous.`);
  if (S.R.grille && ((de0[0] === S.R.grille.dx && de0[1] === S.R.grille.dy) || (de0[0] === S.R.grille.x && de0[1] === S.R.grille.y)) && !grilleOuverte(S)) log(S, `⬆ ${nm(h)} s’en va : la grille retombe dans un grand bruit de fer.`);
  else if (S.R.grille && de0[0] === S.R.grille.dx && de0[1] === S.R.grille.dy && grilleOuverte(S)) log(S, `⬆ ${nm(h)} quitte la dalle, mais la grille reste ouverte : quelqu’un la retient.`);
  voir(S); { const R = S.R, ici = R.salle[cle(x, y)]; if (!R.lus) R.lus = Object.assign({}, R.vuSalle); if (ici && !R.lus[ici]) { R.lus[ici] = true; ev.push({ t:'salle', salle:ici }); } }
  return { ok:true, ev };
}
function frapper(S, hi, idDe, mid, k) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), R = S.R;
  const m = mid === 'boss' ? R.boss : R.monstres.find(z => z.id === mid); if (!d || !m) return 'Rien à frapper.';
  if (d.pas) return 'Un dé 👣 (des pas qui restent) sert à marcher ou à agir, pas à frapper.';
  if (!aPortee(S, h, m)) return h.id === 'zephine' ? 'Trop loin (2 cases au plus).' : 'Il faut être au contact du monstre (une case autour, diagonales comprises).';
  const flam = m === R.boss && h.flamme ? 1 : 0; // 16/11 soir : la bénédiction du feu de la Galerie (+1 contre l'Horloger)
  const s = m.sceaux[k], pwB = s && (s.t === 'min' || s.t === 'tot') ? pwBonusSceau(S, h, m, s) : 0, bonus = s && (s.t === 'min' || s.t === 'tot') ? (h.att || 0) + flam + (d.b || 0) + pwB : 0, vA = d.v + bonus; // + les pouvoirs (16/11 nuit) // + le bonus forgé de la face // ⚔ l'Attaque de l'équipement compte sur les sceaux « ≥ » et « Σ »
  if (!s || !accepte(s, vA, m.sceaux)) return 'Ce dé ne va pas sur ce sceau.';
  if (m === R.boss && phasesDe(S)[m.phase].intouchable) return 'Il est intouchable : trouvez et brisez son reliquaire.';
  prendDe(h, idDe); remplit(S, h, 1); pose(s, vA); m.dernier = d.v; if (d.v === 6) m.six = R.tour; if (pwB) h.bonusP = 0;
  log(S, `⚔ ${nm(h)} pose un ${d.v}${bonus ? ` +${bonus} (${[h.att ? 'équipement' : '', flam ? 'flamme' : '', d.b ? 'dé forgé' : '', pwB ? 'pouvoir' : ''].filter(Boolean).join(', ')}) = ${vA}` : ''} sur ${m.n}.`);
  const evPw = pwApresFrappe(S, hi, d);
  if ((h.id === 'maelle' && (d.v === 6 || (d.v === 5 && pwA(h, 'passif', 'C') && pwR(h, 'passif') >= 10))) || (a_t(h, 'brute') && d.v >= (pwR(h, 'passif') >= 10 ? 4 : 5))) { const s2 = m.sceaux.find(z => !z.ok); if (s2) { brise(s2); log(S, `🔨 ${h.id === 'maelle' ? 'Coup de forge (un 6 de Maëlle)' : 'Brute (un 5 ou un 6)'} : un DEUXIÈME sceau se brise !`); } }
  // 16/11 soir : actions légendaires (comme les boss de D&D 5e) : la 1re fois qu'un héros frappe l'Horloger dans le tour, il riposte (−2, perçant)
  const riposte = m === R.boss && m.b !== 'roios' && !(m.riposte || {})[hi] && contact(S, m, h); if (riposte) { m.riposte = m.riposte || {}; m.riposte[hi] = true; }
  R.frappeurs = R.frappeurs || {}; R.frappeurs[m.id] = (R.frappeurs[m.id] || []); if (!R.frappeurs[m.id].includes(hi)) R.frappeurs[m.id].push(hi);
  const ev = verifieMonstre(S, m).concat(evPw);
  if (riposte && R.boss === m && !h.aTerre) { const perdu = blesseHeros(S, h, 2, true); log(S, `⚡ L’Horloger riposte sur ${nm(h)} (−${perdu}).`); ev.push({ t:'frappe', m:'boss', h:hi, v:perdu }); }
  return { ok:true, ev };
}
const aPortee = (S, h, m) => { const p = h.id === 'zephine' ? (pwA(h, 'passif', 'B') && pwR(h, 'passif') >= 10 ? 3 : 2) : h.id === 'oria' && pwA(h, 'passif', 'B') ? 2 : 0; return p ? (contact(S, h, m) || dist(h, m) <= p) : contact(S, h, m); }; // 16/11 nuit : Archère, Vent renforcé
function verifieMonstre(S, m) {
  const R = S.R, ev = [];
  if (!m.sceaux.length || !m.sceaux.every(s => s.ok)) return ev;
  if (m === R.boss) return bossPhaseSuivante(S, ev);
  if (m.b === 'reliquaire') { R.monstres = R.monstres.filter(z => z !== m); S.score += 60; log(S, '💥 Le Reliquaire éclate en mille éclats d’os !'); ev.push({ t:'tombe', m:m.id }); if (R.boss && phasesDe(S)[R.boss.phase].intouchable) bossPhaseSuivante(S, ev); return ev; }
  if (BETES[m.b].releve && m.dernier !== 6 && !m.revenu) { (R.os = R.os || []).push({ x:m.x, y:m.y, t:R.tour }); log(S, `🦴 ${m.n} s’effondre en tas d’os… qui frémit encore (achevez-les avec un 6, la prochaine fois).`); }
  R.monstres = R.monstres.filter(z => z !== m); S.score += BETES[m.b].elite ? 60 : 20; S.orAv = (S.orAv || 0) + (BETES[m.b].elite ? 5 : 2); // 16/11 : un peu d'or sur chaque monstre
  const duo = (R.frappeurs && R.frappeurs[m.id] || []).length >= 2; if (duo) { S.score += 25; log(S, `🤝 ${m.n} abattu à deux : +25 !`); }
  ev.push({ t:'tombe', m:m.id, duo }); log(S, `💀 ${m.n} tombe.`);
  if (S.objectif === 'vaincre' && !R.monstres.length && !R.boss) { S.fin = 'gagne'; S.score += 100; log(S, S.scen === 'entrainement' ? '🏆 Le Rouagelin est vaincu : entraînement réussi !' : '🏆 L’embuscade est repoussée !'); }
  return ev;
}
function bossPhaseSuivante(S, ev) {
  const R = S.R, P = phasesDe(S), roi = R.boss.b === 'roios';
  R.boss.phase++; ev.push({ t:'phase', m:'boss' });
  if (R.boss.phase >= P.length) { R.boss = null; S.fin = 'gagne'; S.score += 500 + S.sablier * 10; log(S, roi ? '🏆 Le Roi des Os tombe en poussière… et le Labyrinthe se tait.' : '🏆 L’Horloger s’arrête… et s’excuse !'); return ev; }
  if (!roi) { S.heros.filter(h => !h.aTerre).forEach(h => { h.bouclier = Math.floor(h.bouclier / 2); }); log(S, '⏳ Le temps s’accélère : tous les boucliers fondent de moitié.'); } // 16/11 soir
  R.boss.sceaux = sceauxBoss(S, R.boss.phase); if (!roi && R.boss.phase === 2 && S.livre) log(S, '📕 Le Livre des heures : un sceau de moins pour la Dernière Heure.');
  log(S, `${roi ? '💀' : '⏰'} ${R.boss.n} passe à la phase « ${P[R.boss.phase].n} » : il ${P[R.boss.phase].d}.`);
  if (P[R.boss.phase].intouchable) cacheReliquaire(S);
  return ev;
}
// le reliquaire va dans le meuble pas fouillé le plus proche du boss (sinon il roule à côté de lui)
function cacheReliquaire(S) {
  const R = S.R, B = R.boss; let best = null;
  Object.entries(R.obj).forEach(([c, o]) => { if (!o.meuble || o.fouille) return; const [x, y] = c.split(',').map(Number), d = Math.abs(x - B.x) + Math.abs(y - B.y); if (!best || d < best.d) best = { o, d, x, y }; });
  if (best && best.d <= 14) { best.o.cache = 'reliquaire'; R.vu[cle(best.x, best.y)] = 1; log(S, '💀 « Mon cœur est caché, petits vivants… » Le reliquaire est dans un meuble pas encore fouillé, tout près.'); }
  else { const p = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1]].map(([dx, dy]) => [B.x + dx, B.y + dy]).find(([x, y]) => libre(S, x, y) && !herosEn(S, x, y)); if (p) { ajouteMonstre(S, 'reliquaire', p[0], p[1]).att = 0; R.vu[cle(p[0], p[1])] = 1; } log(S, '💀 Le reliquaire du Roi apparaît sur le sol : brisez-le (un 2, un 4, un 6) !'); }
}
function proteger(S, hi, idDe, cibleI) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), c = S.heros[cibleI]; if (!d || !c) return 'Personne à protéger.'; if (d.pas) return 'Un dé 👣 sert à marcher ou à agir, pas à protéger.';
  if (c !== h && !voisins(h, c)) return 'Il faut être à côté de l’ami.';
  if (h.pw) { remplit(S, h, 1); return pwProteger(S, hi, idDe, cibleI); }
  prendDe(h, idDe); const b = Math.ceil(d.v / 2) + 1 + (a_t(h, 'protecteur') ? 2 + pwB3(h, 'passif') : 0);
  const qui = h.id === 'aldric' ? S.heros.filter(z => z === c || z === h || voisins(z, h)) : [c];
  qui.forEach(z => z.bouclier += b); log(S, `🛡 ${nm(h)} protège ${qui.map(z => nm(z)).join(', ')} (bouclier ${b}).`);
  return { ok:true, ev:[] };
}
function soigner(S, hi, idDe, cibleI) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), c = S.heros[cibleI]; // 17/11 (choix de l'utilisateur) : tout héros soigne un ami à côté de la moitié d'un dé ; Pip, du dé entier (et ses bonus)
  if (!d || !c || (c !== h && !voisins(h, c))) return 'Il faut être à côté de l’ami.'; if (d.pas) return 'Un dé 👣 sert à marcher ou à agir, pas à soigner.';
  prendDe(h, idDe); remplit(S, h, 1); const av = c.pv; c.pv = Math.min(c.pvmax, c.pv + (h.id === 'pip' ? d.v : Math.ceil(d.v / 2) + (a_t(h, 'guerisseur') ? 2 + pwB3(h, 'passif') : 0))); if (c.aTerre && c.pv > 0) c.aTerre = false;
  const ev = [{ t:'soin', h:cibleI }]; if (h.id === 'pip' && pwA(h, 'passif', 'C')) { const b = 3 + pwB3(h, 'passif'); c.bouclier += b; ev.push(pwEv(h, hi, 'passif', ['h' + cibleI])); log(S, `💧 Sève partagée : ${nm(c)} gagne aussi bouclier ${b}.`); }
  log(S, `🌿 ${nm(h)} soigne ${nm(c)} : +${c.pv - av} PV.`); return { ok:true, ev };
}
function donner(S, hi, idDe, cibleI) {
  const h = S.heros[hi], c = S.heros[cibleI]; if (!c || c === h || !voisins(h, c)) return 'Il faut être à côté de l’ami.';
  const d0 = h.des.find(z => z.id === idDe); if (d0 && d0.pas) return 'Un dé 👣 ne se donne pas.'; const d = prendDe(h, idDe); if (!d) return 'Pas de dé.'; c.des.push(d); log(S, `🤝 ${nm(h)} donne un ${d.v} à ${nm(c)}.`);
  return { ok:true, ev:[] };
}
function relever(S, hi, idDe, cibleI) {
  const h = S.heros[hi], c = S.heros[cibleI]; if (!c || !c.aTerre || !voisins(h, c)) return 'Il faut être à côté de l’ami à terre.';
  if ((S.releves || 0) >= 3) return 'Plus de relève possible : 3 par partie, c’est déjà fait. Une potion peut encore aider.'; // 16/11 (l'utilisateur)
  if (!prendDe(h, idDe)) return 'Pas de dé.'; remplit(S, h, 1); S.releves = (S.releves || 0) + 1; c.aTerre = false; c.pv = 4; log(S, `✋ ${nm(h)} relève ${nm(c)}.`); return { ok:true, ev:[{ t:'soin', h:cibleI }] };
}
// chercher les pièges autour de soi (2 cases)
function fouiller(S, hi, idDe) {
  const h = S.heros[hi]; if (!prendDe(h, idDe)) return 'Pas de dé.'; let n = 0;
  Object.entries(S.R.obj).forEach(([c, o]) => { const [x, y] = c.split(',').map(Number); if (o.t === 'piege' && o.cache && Math.abs(x - h.x) + Math.abs(y - h.y) <= 2) { o.cache = false; o.vu = true; n++; } });
  log(S, n ? `🔍 ${nm(h)} repère ${n} piège${n > 1 ? 's' : ''} (2 cases autour d’elle ou de lui).` : `🔍 ${nm(h)} cherche des pièges sur 2 cases autour… rien.`); return { ok:true, ev:[] };
}
// agir sur la case (x, y) à côté : porte, MEUBLE à fouiller, levier, livre, axe
// 16/11 soir (choix de l'utilisateur : « bénédiction contre l'Horloger », comme les autels de Diablo) : une fois les statues tournées,
// chaque héros à côté du feu de la Galerie peut le toucher (gratuit, une fois) : +1 sur les sceaux « ≥ » et « Σ » de l'Horloger
function benir(S, hi) { const h = S.heros[hi], R = S.R;
  if (!R.statuesOk) return 'Le feu ne s’allume que quand les quatre statues regardent l’autel.';
  if (h.flamme) return `${nm(h)} porte déjà la flamme.`;
  const [ax, ay] = AUTEL_S; if (!contact(S, h, { x:ax, y:ay }) && !contact(S, h, { x:ax + 1, y:ay })) return 'Il faut être juste à côté du feu.';
  h.flamme = true; S.score += 10; log(S, `🔥 ${nm(h)} touche le feu sacré : sa main garde une petite flamme. +1 contre l’Horloger (sceaux « ≥ » et « Σ »).`);
  return { ok:true, ev:[{ t:'flamme', h:hi }] }; }
function agir(S, hi, idDe, x, y) {
  const h = S.heros[hi], R = S.R, o = R.obj[cle(x, y)], p = R.portes[cle(x, y)];
  if (p && !p.ouverte) return ouvrir(S, hi, x, y);
  const d = h.des.find(z => z.id === idDe); if (!d) return 'Choisis d’abord un dé.';
  if (R.axe && x === R.axe[0] && y === R.axe[1]) {
    if (!h.porte) return 'Il faut porter un rouage (on les trouve en fouillant les meubles).'; if (dist(h, { x, y }) !== 1) return 'Il faut être à côté de l’axe.';
    unPas(S, h, idDe); h.porte = false; R.rouagesPoses++; S.sablier += 2; log(S, `⚙ Rouage posé sur l’axe (${R.rouagesPoses}/3) : +2 grains.`);
    if (R.rouagesPoses >= 3) reveilBoss(S); return { ok:true, ev:[{ t:'rouage', boss:R.rouagesPoses >= 3 }] };
  }
  const st = R.statues ? R.statues.findIndex(t => t.x === x && t.y === y) : -1;
  if (st >= 0) {
    if (R.statuesOk) return 'Les statues regardent déjà l’autel.'; if (R.salle[cle(h.x, h.y)] !== R.salle[cle(x, y)]) return 'Il faut être dans la Galerie des statues.'; // 16/11 : depuis n'importe quelle case de la Galerie (une statue était coincée entre les autres)
    unPas(S, h, idDe); tourneStatue(R, st); const bonnes = R.statues.filter(t => t.d === t.veut).length;
    log(S, `🗿 ${nm(h)} pousse une statue : elle pivote d’un quart de tour… et sa voisine (${['en haut à droite', 'en bas à droite', 'en bas à gauche', 'en haut à gauche'][st]}) tourne avec elle. ${bonnes}/4 regardent l’autel.`);
    if (R.statues.every(t => t.d === t.veut)) { R.statuesOk = true; S.score += 80; S.sablier += 3;
      const k = ['bouclier', 'cle', 'lunettes'].find(z => !S.heros.some(w => w.objet === z)); if (k && !h.objet) { h.objet = k; log(S, `✨ Les quatre statues s’agenouillent vers l’autel ! Une niche s’ouvre : ${nm(h)} trouve ${OBJETS[k].n} (${OBJETS[k].d})  ; +3 grains, +80. Le feu sacré s’allume : chaque héros qui le touche emporte sa flamme (+1 contre l’Horloger).`); }
      else log(S, '✨ Les quatre statues s’agenouillent vers l’autel ! Une niche s’ouvre : +3 grains et +80 points. Le feu sacré s’allume : chaque héros qui le touche emporte sa flamme (+1 contre l’Horloger).');
      return { ok:true, ev:[{ t:'enigme' }] }; }
    return { ok:true, ev:[{ t:'statue', i:st, j:(st + 1) % 4 }] };
  }
  if (!o) return 'Rien à faire ici.';
  if (dist(h, { x, y }) > 1) return 'Il faut être à côté.';
  if (o.meuble) return fouilleMeuble(S, hi, idDe, x, y, o);
  if (o.t === 'levier') { if (d.v < o.v) return `Ce levier demande un ${o.v} ou plus.`; if (R.leviersTour[cle(x, y)]) return 'Ce levier est déjà baissé.';
    prendDe(h, idDe); remplit(S, h, 1); R.leviersTour[cle(x, y)] = S.dureeLevier || 2; const n = Object.keys(R.leviersTour).length;
    const LV = [`${nm(h)} s’arc-boute sur le levier… CLAC ! Quelque part sous le sol, un engrenage se met à tourner`, `${nm(h)} tire le levier de tout son poids : un long grincement court dans les murs`, `${nm(h)} abaisse le levier : une aiguille de cuivre avance d’un cran au-dessus de la porte de bronze`, `${nm(h)} pousse le levier jusqu’en bas : les tuyaux crachent un jet de vapeur`];
    log(S, `🎚 ${LV[(n - 1) % LV.length]} (${n}/4 baissés, il tient ${S.dureeLevier || 2} tour${(S.dureeLevier || 2) > 1 ? 's' : ''}).`);
    if (S.leviersBut && n >= S.leviersBut && !R.bronze) { R.bronze = true; log(S, '🎚 CLONK ! Un verrou claque dans la porte de bronze : elle est déverrouillée.'); return { ok:true, ev:[{ t:'levier', bronze:true }] }; }
    if (n >= 4 && !R.bronze) { R.bronze = true; S.sablier += 3; log(S, '🎚🎚🎚🎚 Les quatre leviers sont baissés ensemble : un grondement sourd… la PORTE DE BRONZE s’est déverrouillée (+3 grains) !'); }
    return { ok:true, ev:[{ t:'levier', bronze:R.bronze && n >= 4 }] }; }
  if (o.t === 'livre') { if (d.v < 4) return 'Il faut un dé de 4 ou plus.';
    // 16/11 (l'utilisateur : « je ne comprends pas ») : la courte échelle se fait par un ami juste à côté de celui qui grimpe (ou du livre)
    const aides = S.heros.filter(z => z !== h && !z.aTerre && (dist(z, h) === 1 || dist(z, { x, y }) === 1)); if (!aides.length) return 'Il faut un ami juste à côté de toi pour te faire la courte échelle jusqu’au livre.';
    prendDe(h, idDe); delete R.obj[cle(x, y)]; R.murs[cle(x, y)] = 'B'; S.livre = true; log(S, '📕 Le Livre des heures ! Le point faible de l’Horloger est noté.'); return { ok:true, ev:[{ t:'livre' }] }; }
  return 'Rien à faire ici.';
}
// ce que cache un meuble (une seule fouille)
function fouilleMeuble(S, hi, idDe, x, y, o) {
  const h = S.heros[hi], R = S.R; if (o.fouille) return `On a déjà fouillé ${MEUBLE_N[o.t]}.`;
  if (o.cache === 'rouage' && h.porte) { log(S, `⚙ ${nm(h)} sent un rouage dans ${MEUBLE_N[o.t]}, mais ses mains sont prises : un héros ne porte qu’UN rouage à la fois.`); return `${nm(h)} porte déjà un rouage (un seul à la fois) : qu’un autre héros fouille ici.`; }
  // 🔒 crochetage (16/11) : un meuble verrouillé demande un vrai dé de N ou plus, qui est utilisé en entier
  if (o.verrou && !o.crochete) { const d = h.des.find(z => z.id === idDe); if (!d || d.pas || d.v < o.verrou) return `🔒 ${MEUBLE_N[o.t][0].toUpperCase() + MEUBLE_N[o.t].slice(1)} est verrouillé : il faut un dé de ${o.verrou} ou plus pour le crocheter (le dé est utilisé en entier).`;
    prendDe(h, idDe); o.crochete = true; log(S, `🔓 ${nm(h)} crochète ${MEUBLE_N[o.t]}… CLIC !`); } else unPas(S, h, idDe);
  o.fouille = true; const nom = nm(h), ev = { t:'fouille', quoi:o.cache, meuble:o.t, h:hi };
  const Le = MEUBLE_N[o.t][0].toUpperCase() + MEUBLE_N[o.t].slice(1);
  switch (o.cache) {
    case 'rouage': { h.porte = true; S.rouagesTrouves++; const sc = SCEN[S.scen || 'horloger']; log(S, `${sc.objet.e} ${nom} trouve ${sc.objet.n === 'rouage' ? 'un ROUAGE' : 'une BRAISE ÉTERNELLE'} dans ${MEUBLE_N[o.t] || 'le meuble'} ! À porter jusqu’à ${sc.axe}.`); break; }
    case 'potion': case 'parchemin': case 'fumee': (h.sac = h.sac || []).push(o.cache); log(S, `🎒 ${nom} met ${SAC[o.cache].n.toLowerCase()} dans son sac (trouvée dans ${MEUBLE_N[o.t]}).`); break;
    case 'potion2': (h.sac = h.sac || []).push('potion', 'potion'); ev.quoi = 'potion'; log(S, `🎒 ${nom} trouve DEUX potions de soin dans ${MEUBLE_N[o.t]} ! (dans son sac)`); break;
    case 'reliquaire': { const p = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => libre(S, a, b) && !herosEn(S, a, b)) || [h.x, h.y];
      const m = ajouteMonstre(S, 'reliquaire', p[0], p[1]); m.att = 0; R.vu[cle(p[0], p[1])] = 1; ev.quoi = 'monstre';
      log(S, `💀 ${nom} renverse ${MEUBLE_N[o.t]} : LE RELIQUAIRE du Roi des Os roule sur le sol ! Brisez-le (un 2, un 4, un 6).`); break; }
    case 'grains': S.sablier += 3; log(S, `⌛ Un petit sablier dans ${MEUBLE_N[o.t]} : +3 grains !`); break;
    case 'or': S.score += 50; S.orAv = (S.orAv || 0) + 10; log(S, `💰 Des pièces d’or dans ${MEUBLE_N[o.t]} : +10 or dans la bourse du groupe.`); break;
    case 'objet': { if (hasard(S) < (h.av ? .6 : .35)) { S.equipTrouve = (S.equipTrouve || 0) + 1; ev.quoi = 'equip'; log(S, `🗡 ${nom} trouve une PIÈCE D’ÉQUIPEMENT dans ${MEUBLE_N[o.t]} ! (elle t’attend dans le coffre des héros)`); break; }
      if (h.objet) { S.score += 30; ev.quoi = 'or'; log(S, `💰 Un petit trésor dans ${MEUBLE_N[o.t]} : +30.`); break; }
      const k = ['bouclier', 'cle', 'lunettes'][Math.floor(hasard(S) * 3)]; h.objet = k; ev.objet = k; log(S, `🎁 ${nom} trouve ${OBJETS[k].n} : ${OBJETS[k].d}`); break; }
    case 'piege': if (a_t(h, 'chanceux')) { log(S, `🍀 ${nm(h)} évite le piège caché dans ${MEUBLE_N[o.t]}.`); break; } blesseHeros(S, h, 2); log(S, `⚠ ${Le} était piégé : ${nom} −2 PV.`); break;
    case 'monstre': { const p = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => libre(S, a, b) && !herosEn(S, a, b));
      if (p) { const m = ajouteMonstre(S, S.scen === 'horloger' || !S.scen ? 'rouagelin' : 'gobelin', p[0], p[1]); m.it = 'frappe'; R.vu[cle(p[0], p[1])] = 1; } log(S, `👹 Un Rouagelin jaillit de ${MEUBLE_N[o.t]} !`); break; }
    case 'mimique': { const p = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => libre(S, a, b) && !herosEn(S, a, b));
      if (p) { const m = ajouteMonstre(S, 'mimique', p[0], p[1]); m.it = 'frappe'; R.vu[cle(p[0], p[1])] = 1; } log(S, `👄 ${Le} ouvre une gueule pleine de dents : c’est une MIMIQUE !`); ev.mimique = true; break; }
    default: log(S, `🔍 ${nom} fouille ${MEUBLE_N[o.t]}… de la poussière, rien d’autre.`);
  }
  // ⌛ le temps file (16/11) : toutes les 2 fouilles, le sablier perd un grain
  S.fouilles = (S.fouilles || 0) + 1; if (S.scen !== 'atelier' && S.scen !== 'entrainement' && S.fouilles % 2 === 0) { S.sablier = Math.max(0, S.sablier - 1); log(S, '⌛ Fouiller prend du temps : le sablier perd un grain.'); }
  // 🔊 le bruit (16/11, façon « monstres errants ») : 1 fois sur 3, le monstre le plus proche du même étage accourt de 2 cases
  const pioche = h.id === 'oria' && pwA(h, 'passif', 'C'); if (pioche) { S.orAv = (S.orAv || 0) + 2; log(S, '🪙 Bonne pioche : +2 or, sans un bruit.'); }
  if (!ev.mimique && !pioche && S.scen !== 'entrainement' && hasard(S) < 1 / 3) { const P = R.monstres.filter(m => !BETES[m.b].immobile && (!R.plan || etageDe(S, m.y) === etageDe(S, h.y)) && dist(m, h) > 1 && dist(m, h) <= 10).sort((a, b) => dist(a, h) - dist(b, h))[0];
    if (P) { for (let k = 0; k < 2; k++) { const o2 = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [P.x + dx, P.y + dy]).filter(([a, b]) => libre(S, a, b, P) && !herosEn(S, a, b) && !(R.portes[cle(a, b)] && !R.portes[cle(a, b)].ouverte)).sort((a, b) => dist({ x:a[0], y:a[1] }, h) - dist({ x:b[0], y:b[1] }, h))[0];
        if (!o2 || dist({ x:o2[0], y:o2[1] }, h) >= dist(P, h)) break; [P.x, P.y] = o2; }
      R.vu[cle(P.x, P.y)] = 1; log(S, `🔊 Le bruit de la fouille attire ${P.n} !`); ev.bruit = P.id; } }
  return { ok:true, ev:[ev] };
}
function reveilBoss(S) {
  const R = S.R, [ax, ay] = R.axe;
  const pos = [[ax, ay - 1], [ax + 1, ay], [ax - 1, ay], [ax, ay + 1]].find(([x, y]) => libre(S, x, y) && !herosEn(S, x, y)) || [ax + 2, ay];
  const sc = SCEN[S.scen || 'horloger'], Bb = BETES[sc.boss];
  R.boss = { id:'boss', b:sc.boss, n:Bb.n, img:Bb.img, x:pos[0], y:pos[1], att:(S.nbHeros || 4) <= 2 ? 2 : (S.nbHeros || 4) >= 4 ? 4 : 3, phase:0, sceaux:sceauxBoss(S, 0), repos:false, it:'frappe' };
  log(S, S.scen === 'labyrinthe' ? '✦ Les trois fragments s’emboîtent sur l’autel… les os du sol se mettent à claquer : LE ROI DES OS se lève de son trône !' : S.scen === 'brulees' ? '🔥 Les trois braises rallument le grand brasier… LE TITAN DE FEU en sort, furieux !' : '⏰ Les trois rouages tournent… L’HORLOGER se réveille, furieux !');
}
function repousse(S, m, h, n) { for (let i = 0; i < n; i++) { const dx = Math.sign(m.x - h.x), dy = Math.sign(m.y - h.y); const nx = m.x + (Math.abs(m.x - h.x) >= Math.abs(m.y - h.y) ? dx || 1 : 0), ny = m.y + (Math.abs(m.x - h.x) < Math.abs(m.y - h.y) ? dy || 1 : 0); if (libre(S, nx, ny, m) && !herosEn(S, nx, ny)) { m.x = nx; m.y = ny; } } }
// 16/11 soir (l'utilisateur : « beaucoup trop facile ») : les coups de l'Horloger sont PERÇANTS (le bouclier n'en arrête que la moitié)
function blesseHeros(S, h, n, percant) {
  if (h.aTerre || n <= 0) return 0;
  if (S.bastion === S.R.tour) return 0; // 16/11 nuit : Bastion d'Aldric
  if (S.rempart >= S.R.tour) n = Math.ceil(n / 2); // Rempart vivant de Maëlle
  if (h.demi) { n = Math.ceil(n / 2); h.demi = false; } // Repli d'Oria
  const b = Math.min(h.bouclier, percant ? Math.floor(n / 2) : n); h.bouclier -= b; n -= b; h.pv -= n;
  if (n > 0 && h.pw) { h.pertes = (h.pertes || 0) + n; const k = Math.floor(h.pertes / 3); if (k) { h.pertes -= 3 * k; remplit(S, h, k); } }
  if (h.pv <= 0 && !S.serment) { const al = S.heros.find(z => z.id === 'aldric' && !z.aTerre && pwA(z, 'passif', 'C') && (z === h || voisins(z, h))); if (al) { S.serment = true; h.pv = 1; log(S, `🤝 Le Serment d’Aldric : ${nm(h)} reste debout à 1 PV !`); (S.evPw = S.evPw || []).push(pwEv(al, S.heros.indexOf(al), 'passif', ['h' + S.heros.indexOf(h)])); } }
  if (h.pv <= 0) { h.pv = 0; h.aTerre = true; h.des = [];
    if (h.porte) { h.porte = false; const c = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [h.x + dx, h.y + dy]).find(([x, y]) => libre(S, x, y) && !S.R.obj[cle(x, y)]); if (c) S.R.obj[cle(c[0], c[1])] = { t:'rouage' }; }
    log(S, `💫 ${nm(h)} est à terre ! Un ami à côté peut le relever (un dé).`); }
  return n;
}

// ------------------------------------------------------------------ la fin du tour : monstres réveillés, sablier
function finTour(S) {
  const R = S.R, ev = []; if (!R || S.fin) return ev;
  const debout = () => S.heros.filter(h => !h.aTerre);
  const memeEtage = (h, m) => !R.plan || etageDe(S, h.y) === etageDe(S, m.y); // 16/11 : un monstre ne voit que son étage
  const plusProche = m => debout().filter(h => memeEtage(h, m)).sort((a, b) => dist(a, m) - dist(b, m))[0];
  const marche = (m, cible, n) => { const de = [m.x, m.y]; marche1(m, cible, n); if (m.x !== de[0] || m.y !== de[1]) ev.push({ t:'pas', m:m.id, de }); };
  const marche1 = (m, cible, n) => { for (let i = 0; i < n; i++) { if (!cible || contact(S, m, cible)) return;
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => libre(S, x, y, m) && !herosEn(S, x, y) && R.vu[cle(x, y)] && !(R.portes[cle(x, y)] && !R.portes[cle(x, y)].ouverte) && !(R.liens && R.liens[cle(x, y)]));
    if (!opts.length) return; opts.sort((a, b) => dist({ x:a[0], y:a[1] }, cible) - dist({ x:b[0], y:b[1] }, cible));
    if (dist({ x:opts[0][0], y:opts[0][1] }, cible) >= dist(m, cible)) return; [m.x, m.y] = opts[0]; } };
  const fumee = R.fumee; R.fumee = false;
  // 17/11 (bug mesuré) : un monstre posé sur un bout d'escalier ne voyait plus personne et bloquait le passage : il en descend d'une case
  if (R.liens) for (const m of R.monstres) { if (!R.liens[cle(m.x, m.y)] || BETES[m.b].immobile) continue; const c = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [m.x + dx, m.y + dy]).find(([x, y]) => libre(S, x, y, m) && !herosEn(S, x, y) && !R.liens[cle(x, y)]); if (c) [m.x, m.y] = c; }
  pwLouves(S, ev); // 16/11 nuit : la louve de Pip mord avant que les monstres jouent
  for (const m of R.monstres.slice()) {
    if (fumee) break;
    if (!R.monstres.includes(m)) continue;
    if (!reveille(S, m)) continue;
    if (m.entrave >= R.tour) { log(S, `🌵 ${m.n} est entravé : il ne fait rien.`); continue; }
    const B = BETES[m.b];
    if (B.immobile) continue;
    // ♻ régénère : un sceau se referme, sauf si on lui a posé un 6 ce tour
    if (B.regen && m.six !== R.tour) { const s = m.sceaux.find(x => x.ok); if (s) { s.ok = false; s.val = 0; s.reste = s.t === 'tot' ? s.v : 0; log(S, `♻ ${m.n} se remonte : un sceau se referme (il fallait lui poser un 6).`); ev.push({ t:'garde', m:m.id }); } }
    // le lâche choisit un héros SEUL s'il en voit un pas trop loin
    const seul = B.lache ? debout().filter(h => memeEtage(h, m) && !S.heros.some(z => z !== h && !z.aTerre && voisins(z, h))).sort((a, b) => dist(a, m) - dist(b, m))[0] : null;
    const c = seul && dist(seul, m) <= B.mv + 2 ? seul : plusProche(m);
    if (!c || dist(m, c) > 8) continue;
    if (m.it === 'charge') { log(S, `⚡ ${m.n} se ramasse pour charger : au début de votre tour, il frappera ${m.att + 2} chaque héros collé à lui (éloignez-vous ou protégez-vous).`); ev.push({ t:'elan', m:m.id }); continue; }
    if (m.it === 'elan') { m.charge = m.sceaux.filter(s => s.ok).length; log(S, `⚡ ${m.n} prend son élan… au prochain tour, il frappera de +2, sauf si vous lui brisez un sceau d’ici là !`); ev.push({ t:'elan', m:m.id }); marche(m, c, 1); continue; }
    if (m.it === 'garde') { const s = m.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; } ev.push({ t:'garde', m:m.id }); continue; }
    if (m.it === 'soin') { const o = R.monstres.find(z => z !== m && z.sceaux.some(s => s.ok) && dist(z, m) <= 4); if (o) { const s = o.sceaux.find(x => x.ok); s.ok = false; s.val = 0; s.reste = s.t === 'tot' ? s.v : 0; log(S, `💚 ${m.n} répare ${o.n}.`); } ev.push({ t:'soin', m:m.id }); continue; }
    if (m.it === 'fuit') { const de = [m.x, m.y]; repousse(S, m, c, 2); ev.push({ t:'pas', m:m.id, de }); ev.push({ t:'fuit', m:m.id }); continue; }
    if (m.it === 'levier') { const k = Object.keys(R.leviersTour)[0]; delete R.leviersTour[k];
      const P = ['« Clac ! Personne ne touche à MES leviers. »', '« Grrr… ces leviers restent levés ! »', '« Le Maître dort. Les leviers restent en haut. »'];
      log(S, `🗿 ${m.n} grince ${P[Math.floor(hasard(S) * P.length)]} Il remonte un levier (${Object.keys(R.leviersTour).length}/4 baissés).`); ev.push({ t:'levierRemonte', m:m.id }); continue; }
    marche(m, c, B.mv);
    let plus = 0, pourquoi = [];
    if (m.it === 'gros') { const casse = m.sceaux.filter(s => s.ok).length > m.charge; m.charge = null; if (casse) log(S, `💥 Le gros coup de ${m.n} est brisé : vous lui avez cassé un sceau à temps !`); else { plus += 2; pourquoi.push('gros coup +2'); } }
    if (B.meute && R.monstres.some(z => z !== m && z.b === m.b && contact(S, z, c))) { plus += 1; pourquoi.push('meute +1'); }
    if (B.lache && !S.heros.some(z => z !== c && !z.aTerre && voisins(z, c))) { plus += 2; pourquoi.push('héros seul +2'); }
    if (contact(S, m, c)) { const perdu = blesseHeros(S, c, Math.max(0, m.att + plus - pwMoinsCoup(S, c))); ev.push({ t:'frappe', m:m.id, h:S.heros.indexOf(c), v:perdu }); log(S, `⚔ ${m.n} frappe ${nm(c)} (−${perdu}${pourquoi.length ? ' : ' + pourquoi.join(', ') : ''}).`); pwApresCoup(S, m, c, ev); }
  }
  if (R.boss && !S.fin && (S.mur === R.tour || R.boss.entrave >= R.tour)) log(S, S.mur === R.tour ? '🧱 Le mur de lumière tient : le boss ne frappe pas ce tour.' : '🌵 Le boss est entravé : il ne fait rien ce tour.');
  else if (R.boss && !S.fin) {
    const Bo = R.boss;
    if (Bo.repos) { const s = Bo.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; } log(S, Bo.b === 'roios' ? '💀 Le Roi des Os reprend son souffle (un sceau se referme).' : '⏰ L’Horloger remonte son ressort (un sceau se referme)… et frappe quand même.'); ev.push({ t:'garde', m:'boss' }); }
    // 16/11 soir : l'Horloger ne se repose plus (comme les boss de Gloomhaven, il agit à chaque tour) ; il frappe TOUS les héros collés à lui (coup de balancier)
    const balancier = n => debout().filter(h => contact(S, Bo, h)).forEach(h => { const perdu = blesseHeros(S, h, Math.max(0, n - pwMoinsCoup(S, h)), true); pwApresCoup(S, Bo, h, ev); ev.push({ t:'frappe', m:'boss', h:S.heros.indexOf(h), v:perdu }); log(S, `⚔ Coup de balancier sur ${nm(h)} (−${perdu}, perce la moitié du bouclier).`); });
    if (Bo.repos && Bo.b === 'roios') {}
    else if (Bo.b === 'roios') {
      const c = plusProche(Bo); marche(Bo, c, 1);
      const coup = n => { if (c && contact(S, Bo, c)) { const perdu = blesseHeros(S, c, Math.max(0, n - pwMoinsCoup(S, c))); pwApresCoup(S, Bo, c, ev); ev.push({ t:'frappe', m:'boss', h:S.heros.indexOf(c), v:perdu }); log(S, `⚔ ${Bo.n} frappe ${nm(c)} (−${perdu}).`); } };
      if (Bo.phase === 0) { coup(Bo.att); const p = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => [Bo.x + dx, Bo.y + dy]).find(([x, y]) => libre(S, x, y) && !herosEn(S, x, y)); if (p) { ajouteMonstre(S, 'osclaque', p[0], p[1]); R.vu[cle(p[0], p[1])] = 1; } log(S, '💀 L’Appel des os : un Os-qui-claque sort du sol !'); }
      else if (Bo.phase === 1) { coup(Bo.att); log(S, '💀 « Tant que mon cœur bat, je ne crains rien ! »'); }
      else { coup(Bo.att + 1); debout().filter(h => h !== c && dist(h, Bo) <= 2).forEach(h => { blesseHeros(S, h, 1); Bo.vol = true; }); if (Bo.vol) log(S, '💀 La Dernière Danse : le Roi aspire la vie des héros proches (−1).'); Bo.vol = false; }
      ev.push({ t:'boss' });
    }
    else {
      const c = plusProche(Bo);
      if (Bo.phase === 0) { marche(Bo, c, 1); balancier(Bo.att); for (let i = 0; i < 2; i++) { const p = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => [Bo.x + dx, Bo.y + dy]).find(([x, y]) => libre(S, x, y) && !herosEn(S, x, y)); if (p) ajouteMonstre(S, SCEN[S.scen || 'horloger'].renfort, p[0], p[1]); } log(S, `⏰ ${SCEN[S.scen || 'horloger'].phases[0]} : deux renforts !`); }
      else if (Bo.phase === 1) { marche(Bo, c, 1); balancier(Bo.att); debout().filter(h => !contact(S, Bo, h) && dist(h, Bo) <= 2).forEach(h => { const perdu = blesseHeros(S, h, 2, true); ev.push({ t:'frappe', m:'boss', h:S.heros.indexOf(h), v:perdu }); });
        debout().forEach(h => { if (!S.heros.some(z => z !== h && !z.aTerre && voisins(z, h))) h.carillon = true; }); log(S, '🔔 Le Carillon sonne ! L’onde frappe à 2 cases (−2) ; ceux qui sont seuls perdront leur plus gros dé.'); }
      else { const bl = debout().length >= 2 ? debout().sort((a, b) => a.pv - b.pv)[0] : null; // 17/11 (bug mesuré) : le dernier héros debout n'est jamais renvoyé ; on renvoie sur le PALIER DU SOMMET, plus dans le hall
        if (bl) { const pal = []; if (R.plan === 2) for (let x = 3; x <= 20; x++) if (libre(S, x, 5) && !herosEn(S, x, 5)) pal.push([x, 5]); pal.sort((a, b) => Math.abs(a[0] - 15) - Math.abs(b[0] - 15));
          const p = pal[0] || (R.depart || [[1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [3, 2]]).find(([x, y]) => !herosEn(S, x, y) && libre(S, x, y)) || (R.depart ? R.depart[0] : [1, 1]); bl.x = p[0]; bl.y = p[1]; blesseHeros(S, bl, Bo.att + 1, true); log(S, `⏳ La Dernière Heure : ${nm(bl)} est rejeté hors du Cœur, sur le palier (−${Bo.att + 1}).`); }
        marche(Bo, plusProche(Bo), 1); balancier(Bo.att); }
      ev.push({ t:'boss' });
    }
    Bo.repos = !Bo.repos; Bo.riposte = {};
  }
  if (S.evPw) { ev.push(...S.evPw); S.evPw = null; }
  S.sablier = Math.max(0, S.sablier - 1); if (S.sablier === 0) log(S, '⌛ Le sablier est vide : le temps se fige, chaque héros a un dé de moins.');
  if (!debout().length) { S.fin = 'perdu'; log(S, '❄ Tous les héros sont à terre…'); return ev; }
  R.frappeurs = {}; voir(S);
  ev.push(...(debutTour(S) || [])); return ev;
}

// passer d'un étage à l'autre quand on est DÉJÀ sur le bout d'un escalier : gratuit
function prendreEscalier(S, hi) {
  const h = S.heros[hi], l = S.R.liens && S.R.liens[cle(h.x, h.y)]; if (!l || h.aTerre) return 'Pas d’escalier ici.';
  const [lx, ly] = l.split(',').map(Number); if (!libre(S, lx, ly) || herosEn(S, lx, ly)) return 'L’autre bout de l’escalier est occupé.';
  const de0 = [h.x, h.y]; h.x = lx; h.y = ly; log(S, `${ly < de0[1] ? '⬆' : '⬇'} ${nm(h)} ${ly < de0[1] ? 'monte' : 'descend'} : ${etageDe(S, ly)}.`); voir(S);
  return { ok:true, ev:[{ t:'etage', h:hi }] };
}
// 16/11 (l'utilisateur : « bloqué par Maëlle dans le couloir ») : changer de place avec un allié juste à côté, pour 1 pas
// (comme traverser un allié dans D&D, ou l'échange de place de Baldur's Gate 3 / Gloomhaven)
// 17/11 (l'utilisateur : « le changement de place se fait un par un, ça demande trop de gestes ») : on change de place avec N'IMPORTE
// QUEL allié que le dé permet d'atteindre ; on paie les pas du trajet ; les alliés dépassés reculent chacun d'une case (le groupe se décale).
function coutEchange(S, hi, idDe, ci) {
  const h = S.heros[hi], z = S.heros[ci], d = h && h.des.find(x => x.id === idDe); if (!z || z === h || h.aTerre || z.aTerre || !d) return null;
  const total = d.pas ? d.v : pasDe(h, d.v).n, ch = chemin(S, h, z.x, z.y, total, true) || chemin(S, h, z.x, z.y, total, false);
  return ch && ch.length <= total ? ch.length : null;
}
function echanger(S, hi, idDe, ci) {
  const h = S.heros[hi], z = S.heros[ci]; if (!z || z === h || h.aTerre) return 'Personne avec qui changer de place.';
  const d = h.des.find(x => x.id === idDe); if (!d) return 'Choisis d’abord un dé.';
  const total = d.pas ? d.v : pasDe(h, d.v).n, ch = chemin(S, h, z.x, z.y, total, true) || chemin(S, h, z.x, z.y, total, false);
  if (!ch || ch.length > total) return 'Trop loin pour ce dé.';
  // un piège caché sur le chemin : on s'y arrête, comme en marchant (pas d'échange)
  const k = ch.findIndex((c, i) => i < ch.length - 1 && S.R.obj[c] && S.R.obj[c].t === 'piege' && !S.R.obj[c].trouve && !herosEn(S, ...c.split(',').map(Number)));
  if (k >= 0) { const [tx, ty] = ch[k].split(',').map(Number); return bouger(S, hi, idDe, tx, ty); }
  prendDe(h, idDe); const reste = total - ch.length; if (reste > 0) h.des.push({ id:'d' + S.seq++, v:reste, pas:true });
  const cases = [cle(h.x, h.y)].concat(ch), ev = [{ t:'marche', h:hi, de:[h.x, h.y] }], recule = [];
  // les héros posés sur le chemin reculent d'une case (tous en même temps)
  ch.forEach((c, i) => { const [cx, cy] = c.split(',').map(Number); S.heros.forEach((y, j) => { if (y !== h && y.x === cx && y.y === cy) recule.push([j, cases[i]]); }); });
  const [fx, fy] = ch[ch.length - 1].split(',').map(Number); h.x = fx; h.y = fy;
  recule.forEach(([j, c]) => { const y = S.heros[j], de = [y.x, y.y]; [y.x, y.y] = c.split(',').map(Number); ev.push({ t:'marche', h:j, de }); });
  const noms = recule.map(([j]) => nm(S.heros[j]));
  log(S, ch.length === 1 ? `↔ ${nm(h)} et ${nm(z)} changent de place.` : `↔ ${nm(h)} passe devant (${ch.length} pas) : ${noms.join(', ')} recule${noms.length > 1 ? 'nt' : ''} d’une case.`); voir(S);
  return { ok:true, ev };
}
// 16/11 (choix de l'utilisateur) : LE COLPORTEUR (comme le marchand de Slay the Spire / le colporteur de Darkest Dungeon) : on paie avec la bourse du groupe
const ETAL = { potion:12, parchemin:15, fumee:10 };
function acheter(S, hi, k) {
  const h = S.heros[hi], R = S.R, p = ETAL[k]; if (!p) return 'Le colporteur ne vend pas ça.';
  const M = Object.entries(R.obj).find(([c, o]) => o.t === 'marchand'); if (!M) return 'Pas de colporteur ici.'; const [mx, my] = M[0].split(',').map(Number);
  if (h.aTerre || dist(h, { x:mx, y:my }) !== 1) return 'Il faut être juste à côté du colporteur.';
  if ((S.orAv || 0) < p) return `Pas assez d’or : il faut ${p} pièces.`; if ((h.sac || []).length >= 4) return 'Le sac est plein (4 objets).';
  S.orAv -= p; (h.sac = h.sac || []).push(k); log(S, `🧳 ${nm(h)} achète ${SAC[k].n.toLowerCase()} au colporteur (−${p} or).`); return { ok:true, ev:[] };
}
// 16/11 : LA PAUSE AU FEU DE CAMP (comme le repos court de D&D / le feu de camp de Darkest Dungeon) : 2 fois par partie, +4 PV à chacun, le sablier perd 3 grains
function pause(S) {
  const R = S.R; if ((S.pauses || 0) >= 2) return 'Plus de pause possible : 2 par partie.';
  const proche = R.monstres.some(m => reveille(S, m) && S.heros.some(h => !h.aTerre && dist(h, m) <= 5 && (!R.plan || etageDe(S, h.y) === etageDe(S, m.y))));
  if (proche) return 'Des monstres rôdent trop près : impossible de se reposer.';
  S.pauses = (S.pauses || 0) + 1; S.sablier = Math.max(0, S.sablier - 3);
  S.heros.forEach(h => { if (!h.aTerre) h.pv = Math.min(h.pvmax, h.pv + 4); });
  log(S, `🔥 Le groupe fait une pause au feu de camp : +4 PV à chacun, le sablier perd 3 grains (${2 - S.pauses} pause${2 - S.pauses > 1 ? 's' : ''} restante${2 - S.pauses > 1 ? 's' : ''}).`);
  return { ok:true, ev:[{ t:'pause' }] };
}
// =============================================================================================== LES POUVOIRS DES HÉROS DANS LES CHRONIQUES (16/11 nuit)
// Chaque héros arrive avec h.pw = { garde:{ v, rang }, pouvoir, passif, ultime } (pouvoirs-heros.js, préréglage Groupe ou Solo).
// Garde = la façon de PROTÉGER ; Pouvoir = une COMBINAISON de dés (bouton ✨) ; Passif = toujours actif ; Ultime = une combinaison, UNE fois par partie.
// Le rang (0 à 10) ajoute +1 tous les 2 rangs au chiffre principal (sauf texte contraire ; 17/11, choix de l'utilisateur : avant, tous les 3 rangs, on ne voyait rien). Sans h.pw (vieille partie) : rien ne change.
// 17/11 (choix de l'utilisateur, mesuré : « une fois par partie » était trop peu) : LA JAUGE D'ULTIME, comme le Duel : +1 par dé posé
// (frapper, protéger, soigner, relever, levier, pouvoir) et +1 tous les 3 PV perdus ; pleine (12) = l'ultime est prêt ; il la vide.
const JAUGE_ULT = 12;
const jaugeMax = S => S && S.jaugeMax || JAUGE_ULT;
function remplit(S, h, n) { if (!h || !h.pw || !h.pw.ultime || h.aTerre || !n) return; const av = h.jauge || 0; h.jauge = Math.min(jaugeMax(S), av + n); if (av < jaugeMax(S) && h.jauge >= jaugeMax(S)) { log(S, `⚡ La jauge d’Ultime de ${nm(h)} est pleine !`); (S.evPw = S.evPw || []).push({ t:'jauge', h:S.heros.indexOf(h) }); } }
const pwV = (h, e) => h && h.pw && h.pw[e] ? h.pw[e].v : null;
const pwA = (h, e, v) => pwV(h, e) === v;
const pwR = (h, e) => h && h.pw && h.pw[e] ? h.pw[e].rang || 0 : 0;
const pwB3 = (h, e) => Math.floor(pwR(h, e) / 2); // le nom reste « B3 » (ancien +1 tous les 3 rangs)
const pwEv = (h, hi, emp, cibles) => ({ t:'pouvoir', cl:h.id, emp, v:pwV(h, emp), h:hi, cibles:cibles || [] });
const COMBOS = ['paire', 'paire45', 'paire56', 'brelan', 'suite3', 'suite4', 'pairs3', 'impairs3', 'pi3', 'diff3', 'bas3', 'haut3', 'haut34', 'somme12'];
// la combinaison de chaque pouvoir et ultime (les mêmes que le catalogue pouvoirs-heros.js)
const PW_CO = {
  pip:{ pouvoir:{ A:'paire45', B:'suite3', C:'pairs3' }, ultime:{ A:'bas3', B:'haut34' } }, // 17/11 : les ultimes trop rares → trois dés de 4 ou plus
  maelle:{ pouvoir:{ A:'paire', B:'paire56', C:'suite3' }, ultime:{ A:'haut34', B:'haut34' } },
  aldric:{ pouvoir:{ A:'paire56', B:'impairs3', C:'suite3' }, ultime:{ A:'haut34', B:'haut34' } },
  oria:{ pouvoir:{ A:'paire', B:'paire', C:'pairs3' }, ultime:{ A:'suite3', B:'haut34' } },
  gorm:{ pouvoir:{ A:'pi3', B:'paire', C:'suite3' }, ultime:{ A:'pi3', B:'suite3' } },
  zephine:{ pouvoir:{ A:'diff3', B:'suite3', C:'impairs3' }, ultime:{ A:'somme12', B:'haut34' } },
};
// les dés qui forment la combinaison (ou null)
function trouveCombo(des, co) {
  const D = (des || []).filter(d => !d.pas), pick = (f, n) => { const L = D.filter(d => f(d.v)); return L.length >= n ? L.slice(0, n) : null; };
  const grp = (n, ok) => { const by = {}; D.forEach(d => (by[d.v] = by[d.v] || []).push(d)); for (const v of Object.keys(by).map(Number).sort((a, b) => b - a)) if ((!ok || ok(v)) && by[v].length >= n) return by[v].slice(0, n); return null; };
  const suite = n => { for (let a = 6 - n + 1; a >= 1; a--) { const L = []; for (let v = a; v < a + n; v++) { const d = D.find(z => z.v === v); if (!d) break; L.push(d); } if (L.length === n) return L; } return null; };
  switch (co) {
    case 'paire': return grp(2); case 'paire45': return grp(2, v => v === 4 || v === 5); case 'paire56': return grp(2, v => v >= 5); case 'brelan': return grp(3);
    case 'suite3': return suite(3); case 'suite4': return suite(4);
    case 'pairs3': return pick(v => v % 2 === 0, 3); case 'impairs3': return pick(v => v % 2 === 1, 3); case 'pi3': return pick(v => v % 2 === 0, 3) || pick(v => v % 2 === 1, 3);
    case 'diff3': { const L = []; D.forEach(d => { if (L.length < 3 && !L.some(z => z.v === d.v)) L.push(d); }); return L.length === 3 ? L : null; }
    case 'bas3': return pick(v => v <= 3, 3); case 'haut3': return pick(v => v >= 5, 3); case 'haut34': return pick(v => v >= 4, 3);
    case 'somme12': { const L = D.slice().sort((a, b) => b.v - a.v).slice(0, 3); return L.length === 3 && L.reduce((t, d) => t + d.v, 0) >= 12 ? L : null; }
  }
  return null;
}
// les monstres
const touchable = (S, m) => m && m.sceaux && m.sceaux.some(s => !s.ok) && !(m === S.R.boss && phasesDe(S)[m.phase].intouchable);
const tousMonstres = S => S.R.monstres.concat(S.R.boss ? [S.R.boss] : []);
const collesA = (S, h) => tousMonstres(S).filter(m => touchable(S, m) && contact(S, h, m)).sort((a, b) => (b === S.R.boss) - (a === S.R.boss) || a.sceaux.filter(s => !s.ok).length - b.sceaux.filter(s => !s.ok).length);
const aDist = (S, h, n) => tousMonstres(S).filter(m => touchable(S, m) && visible(S, m.x, m.y) && dist(h, m) <= n).sort((a, b) => dist(h, a) - dist(h, b));
const idM = (S, m) => m === S.R.boss ? 'boss' : m.id;
function briseN(S, m, n, f, ev) { let k = 0; for (const s of m.sceaux) { if (k >= n) break; if (!s.ok && (!f || f(s))) { brise(s); k++; } } if (k) ev.push(...verifieMonstre(S, m)); return k; }
const entrave = (S, m, n) => { m.entrave = S.R.tour + n - 1; };
// la Garde choisie (remplace « protéger » quand le héros a ses pouvoirs)
function pwProteger(S, hi, idDe, cibleI) {
  const h = S.heros[hi], d = prendDe(h, idDe), c = S.heros[cibleI], v = d.v, g = pwV(h, 'garde'), bo = pwB3(h, 'garde') + (a_t(h, 'protecteur') ? 2 + pwB3(h, 'passif') : 0), R = S.R, ev = [];
  let qui = h.id === 'aldric' ? S.heros.filter(z => z === c || z === h || voisins(z, h)) : [c], val = Math.ceil(v / 2) + 1, plus = '';
  const proche = z => collesA(S, z).filter(m => m !== R.boss)[0];
  switch (h.id + g) {
    case 'pipA': val = v; if (v <= 2) { c.epines = 1; plus = ' + épines'; } break;
    case 'pipB': val = Math.ceil(v / 2); { const av = c.pv; c.pv = Math.min(c.pvmax, c.pv + 2 + bo); plus = ` + ${c.pv - av} PV`; } break;
    case 'pipC': val = v; if (v <= 3) { const m = proche(c); if (m) { entrave(S, m, 1); plus = ` · ${m.n} entravé`; } } break;
    case 'maelleA': val = v + (v >= 5 ? 2 : 0); break;
    case 'maelleB': qui = [h]; val = Math.max(0, v - 1); h.bonusP = (h.bonusP || 0) + 1; plus = ' · +1 au prochain sceau'; break;
    case 'maelleC': qui = c === h ? [h] : [c, h]; val = Math.ceil(v / 2); break;
    case 'aldricA': { val = v; const j = h.des.find(z => !z.pas && z.v === v); if (j) { prendDe(h, j.id); val *= 2; plus = ' · paire : doublé'; } } break;
    case 'aldricB': qui.forEach(z => z.epines = 1); plus = ' + épines'; break;
    case 'aldricC': qui = S.heros.filter(z => !z.aTerre && (z === h || dist(z, h) <= 2)); val = Math.ceil(v / 2) + 1; break;
    case 'oriaA': if (v % 2) { c.demi = true; val = 0; plus = ' : le prochain coup sera divisé par 2'; } else val = v; break;
    case 'oriaB': qui = [h]; val = Math.max(0, v - 1); h.des.push({ id:'d' + S.seq++, v:1, pas:true }); plus = ' + 1 pas'; break;
    case 'oriaC': val = v; if (v === 6) { S.orAv = (S.orAv || 0) + 5; plus = ' · +5 or'; } break;
    case 'gormA': val = v + (v % 2 ? 1 : 0); if (v === 6) { c.epines = 1; plus = ' + épines'; } break;
    case 'gormB': qui = S.heros.filter(z => !z.aTerre && (z === h || dist(z, h) <= 2)); val = Math.ceil(v / 2); break;
    case 'gormC': qui = [h]; val = v; { const m = proche(h); if (m) { repousse(S, m, h, 1); plus = ` · ${m.n} repoussé`; } } break;
    case 'zephineA': val = v + (d.mod ? 2 : 0); if (d.mod) plus = ' (dé changé +2)'; break;
    case 'zephineB': qui = [h]; val = Math.max(0, v - 1); h.epines = 1; plus = ' + épines'; break;
    case 'zephineC': val = v; { const m = proche(c); if (m) { repousse(S, m, c, 2); plus = ` · ${m.n} repoussé de 2`; } } break;
  }
  if (h.id + g !== 'pipB') val += bo;
  qui.forEach(z => z.bouclier += val);
  log(S, `🛡 ${nm(h)} protège ${qui.map(z => nm(z)).join(', ')}${val ? ` (bouclier ${val})` : ''}${plus}.`);
  ev.push(pwEv(h, hi, 'garde', qui.map(z => 'h' + S.heros.indexOf(z))));
  return { ok:true, ev };
}
// les bonus sur un sceau « ≥ » ou « Σ »
function pwBonusSceau(S, h, m, s) {
  const R = S.R; let b = (h.bonusP || 0) + (h.bonusT && h.bonusT.fin >= R.tour ? h.bonusT.v : 0) + (S.orage >= R.tour ? 1 : 0);
  if (h.id === 'aldric' && pwA(h, 'passif', 'B') && (m === R.boss || BETES[m.b].elite)) b += 1;
  if (h.id === 'gorm' && pwA(h, 'passif', 'C') && s.t === 'tot') b += 1;
  return b;
}
function pwApresFrappe(S, hi, d) {
  const h = S.heros[hi], ev = [];
  if (h.id === 'maelle' && pwA(h, 'passif', 'A') && d.v === 6) { h.braises = (h.braises || 0) + 1; log(S, `♨ Métal chaud : braise ${h.braises}/3.`);
    if (h.braises >= 3) { h.braises = 0; const b = 3 + pwB3(h, 'passif'); S.heros.filter(z => !z.aTerre).forEach(z => z.bouclier += b); log(S, `♨ Trois braises : tout le groupe gagne bouclier ${b} !`); ev.push(pwEv(h, hi, 'passif', S.heros.map((z, i) => 'h' + i))); } }
  return ev;
}
// ce qui retire des dégâts à un coup de monstre
function pwMoinsCoup(S, c) {
  let n = S.orage >= S.R.tour ? 1 : 0;
  if (c.id === 'zephine' && pwA(c, 'passif', 'C') && tousMonstres(S).filter(m => contact(S, c, m)).length >= 2) n += 1;
  return n;
}
// après un coup reçu : épines, ronces vivantes, rancune
function pwApresCoup(S, m, c, ev) {
  const hi = S.heros.indexOf(c);
  if (c.epines && touchable(S, m)) { c.epines = 0; briseN(S, m, 1, null, ev); log(S, `🌵 Les épines de ${nm(c)} : ${m.n} perd un sceau.`); ev.push({ t:'pouvoir', cl:c.id, emp:'garde', v:pwV(c, 'garde'), h:hi, cibles:[idM(S, m)] }); }
  else if (c.id === 'pip' && pwA(c, 'passif', 'B') && touchable(S, m)) { briseN(S, m, 1, null, ev); if (m !== S.R.boss) entrave(S, m, 2); log(S, `🥀 Ronces vivantes : ${m.n} perd un sceau en frappant Pip${m !== S.R.boss ? ' et reste pris dans les ronces au prochain tour' : ''}.`); ev.push(pwEv(c, hi, 'passif', [idM(S, m)])); }
  if (c.id === 'maelle' && pwA(c, 'passif', 'B') && !c.aTerre) c.bonusP = Math.min(3, (c.bonusP || 0) + 1);
}
const pwSansCarillon = (S, h) => (h.id === 'gorm' && pwA(h, 'passif', 'C')) || S.heros.some(z => z.id === 'aldric' && !z.aTerre && pwA(z, 'passif', 'A') && (z === h || voisins(z, h)));
// au début du tour : la meute de Pip, l'écho du cor
function pwDebutTour(S) {
  S.heros.forEach((h, i) => {
    h.echo = !h.aTerre && S.heros.some(g => g !== h && g.id === 'gorm' && !g.aTerre && pwA(g, 'passif', 'B') && dist(g, h) <= 2);
    if (h.id === 'pip' && pwA(h, 'passif', 'A') && !(h.louve >= S.R.tour) && !h.aTerre) { const six = h.des.filter(d => d.v === 6).length; if (six) { h.meute = (h.meute || 0) + six; const besoin = pwR(h, 'passif') >= 10 ? 2 : 3;
      log(S, `🐾 L’Appel de l’Alpha : ${Math.min(h.meute, besoin)}/${besoin} marqueurs.`); if (h.meute >= besoin) { h.louve = S.R.tour + 2; h.meute = 0; log(S, '🐺 La louve rejoint Pip pour 3 tours ! À chaque fin de tour, elle mord un monstre collé à Pip.'); (S.evPw = S.evPw || []).push(pwEv(h, i, 'passif', ['h' + i])); } } }
  });
}
// à la fin du tour, avant les monstres : la louve (passif) et la louve géante (ultime) de Pip
function pwLouves(S, ev) {
  S.heros.forEach((h, i) => { if (h.aTerre) return;
    if (h.chasse >= S.R.tour) { const L = collesA(S, h); L.forEach(m => briseN(S, m, 1, null, ev)); if (L.length) { log(S, `🌕 La louve géante mord ${L.map(m => m.n).join(', ')}.`); ev.push(pwEv(h, i, 'ultime', L.map(m => idM(S, m)))); } }
    else if (h.louve >= S.R.tour) { const m = collesA(S, h)[0]; if (m) { briseN(S, m, 1, null, ev); log(S, `🐺 La louve mord ${m.n} : un sceau se brise.`); ev.push(pwEv(h, i, 'passif', [idM(S, m)])); } }
  });
}
// ce qu'un pouvoir ou l'ultime ferait maintenant : { ok, raison, des, cible }
function pwInfo(S, hi, emp) {
  const h = S.heros[hi]; if (!h || !h.pw || h.aTerre) return { ok:false, raison:'Pas de pouvoir.' };
  const v = pwV(h, emp), co = ((PW_CO[h.id] || {})[emp] || {})[v]; if (!co) return { ok:false, raison:'Pas de pouvoir.' };
  if (emp === 'ultime' && (h.jauge || 0) < jaugeMax(S)) return { ok:false, co, raison:`La jauge d’Ultime n’est pas pleine (${h.jauge || 0} / ${jaugeMax(S)}) : +1 par dé posé, +1 tous les 3 PV perdus.` };
  if (emp === 'pouvoir' && h.id === 'gorm' && v === 'B' && h.souffleT === S.R.tour) return { ok:false, co, raison:'Le Second souffle sert une fois par tour.' };
  const des = trouveCombo(h.des, co); if (!des) return { ok:false, co, raison:'Les dés ne forment pas la combinaison.' };
  const r = pwEffet(S, hi, emp, des, true); return Object.assign({ co, des:des.map(d => d.id) }, r);
}
// déclencher (après « Valider ») : les dés de la combinaison sont utilisés
function lancerPouvoir(S, hi, emp) {
  const I = pwInfo(S, hi, emp); if (!I.ok) return I.raison;
  const h = S.heros[hi], des = I.des.map(id => prendDe(h, id)); if (emp === 'ultime') { h.jauge = 0; h.ultUsed = true; } else remplit(S, h, des.length); if (emp === 'pouvoir' && h.id === 'gorm') h.souffleT = S.R.tour;
  return pwEffet(S, hi, emp, des, false);
}
// l'effet de chaque pouvoir et ultime ; essai = true : on regarde seulement (rien ne change)
function pwEffet(S, hi, emp, des, essai) {
  const h = S.heros[hi], R = S.R, v = pwV(h, emp), r = pwR(h, emp), b3 = Math.floor(r / 2), ev = [], k = `${h.id}:${emp}:${v}`;
  const vals = des.map(d => d.v), debout = S.heros.filter(z => !z.aTerre), non = raison => ({ ok:false, raison });
  const fin = (cibles, texte) => { if (essai) return { ok:true, cible:texte }; ev.unshift(pwEv(h, hi, emp, cibles)); log(S, `✨ ${nm(h)} : ${texte}`); return { ok:true, ev }; };
  const unColle = () => collesA(S, h)[0];
  switch (k) {
    case 'pip:pouvoir:A': { const m = unColle(); if (!m) return non('Aucun monstre collé à Pip.'); if (!essai) { briseN(S, m, 1, null, ev); h.bouclier += 3 + b3; } return fin([idM(S, m)], `la louve mord ${m.n} (un sceau) et Pip gagne bouclier ${3 + b3}.`); }
    case 'pip:pouvoir:B': { const ray = r >= 10 ? 3 : 2, n = r >= 5 ? 4 : 3, Q = debout.filter(z => z === h || dist(z, h) <= ray); if (!essai) Q.forEach(z => z.pv = Math.min(z.pvmax, z.pv + n)); return fin(Q.map(z => 'h' + S.heros.indexOf(z)), `+${n} PV pour ${Q.map(z => nm(z)).join(', ')}.`); }
    case 'pip:pouvoir:C': { const L = aDist(S, h, 4).filter(m => m !== R.boss); if (!L.length) return non('Aucun monstre à 4 cases.'); if (!essai) L.forEach(m => entrave(S, m, r >= 10 ? 2 : 1)); return fin(L.map(m => m.id), `${L.map(m => m.n).join(', ')} entravé${L.length > 1 ? 's' : ''} ${r >= 10 ? '2 tours' : '1 tour'}.`); }
    case 'pip:ultime:A': { if (!essai) S.heros.forEach(z => { z.pv = z.pvmax; z.aTerre = false; }); return fin(S.heros.map((z, i) => 'h' + i), 'tout le groupe revient à ses PV max.'); }
    case 'pip:ultime:B': { const t = r >= 10 ? 4 : 3; if (!essai) h.chasse = R.tour + t - 1; return fin(['h' + hi], `une louve géante accompagne Pip ${t} tours.`); }
    case 'maelle:pouvoir:A': { const m = unColle(); if (!m) return non('Aucun monstre collé à Maëlle.'); const n = vals[0] === 6 ? 2 : 1; if (!essai) briseN(S, m, n, null, ev); return fin([idM(S, m)], `coup d’enclume sur ${m.n} : ${n} sceau${n > 1 ? 'x' : ''}.`); }
    case 'maelle:pouvoir:B': { const m = unColle(); if (!m) return non('Aucun monstre collé à Maëlle.'); const nMin = m.sceaux.filter(s => !s.ok && s.t === 'min').length; if (!essai) { if (nMin) briseN(S, m, 9, s => s.t === 'min', ev); else briseN(S, m, 2, null, ev); } return fin([idM(S, m)], nMin ? `tous les sceaux « ≥ » de ${m.n} se brisent (${nMin}).` : `deux sceaux de ${m.n} se brisent.`); }
    case 'maelle:pouvoir:C': { const Q = debout.filter(z => z === h || voisins(z, h)); if (!essai) Q.forEach(z => z.bonusT = { v:1 + b3, fin:R.tour + 2 }); return fin(Q.map(z => 'h' + S.heros.indexOf(z)), `+${1 + b3} sur les sceaux « ≥ » et « Σ » pendant 3 tours pour ${Q.map(z => nm(z)).join(', ')}.`); }
    case 'maelle:ultime:A': { const m = unColle(); if (!m) return non('Aucun monstre collé à Maëlle.'); if (!essai) briseN(S, m, 3, null, ev); return fin([idM(S, m)], `le Grand Martelage brise 3 sceaux de ${m.n}.`); }
    case 'maelle:ultime:B': { if (!essai) S.rempart = R.tour + 1; return fin(S.heros.map((z, i) => 'h' + i), 'pendant 2 tours, le groupe ne prend que la moitié des coups.'); }
    case 'aldric:pouvoir:A': { if (!essai) { R.fumee = true; S.mur = R.tour; } return fin(S.heros.map((z, i) => 'h' + i), 'un mur de lumière : aucun monstre ne frappe à la fin de ce tour.'); }
    case 'aldric:pouvoir:B': { const m = aDist(S, h, 3)[0]; if (!m) return non('Aucun monstre à 3 cases.'); if (!essai) briseN(S, m, 1, null, ev); return fin([idM(S, m)], `le rayon de l’aube brise un sceau de ${m.n}.`); }
    case 'aldric:pouvoir:C': { if (!essai) debout.forEach(z => { z.des.push({ id:'d' + S.seq++, v:2 + b3, pas:true }); z.bonusP = (z.bonusP || 0) + 1; }); return fin(debout.map(z => 'h' + S.heros.indexOf(z)), `En avant ! Chacun reçoit 👣 ${2 + b3} pas et +1 sur son prochain sceau.`); }
    case 'aldric:ultime:A': { const m = unColle(); if (!m) return non('Aucun monstre collé à Aldric.'); if (!essai) { briseN(S, m, 2, null, ev); entrave(S, m, 1); } return fin([idM(S, m)], `la Lame de l’Aube brise 2 sceaux de ${m.n} et l’entrave 1 tour.`); }
    case 'aldric:ultime:B': { if (!essai) S.bastion = R.tour; return fin(S.heros.map((z, i) => 'h' + i), 'Bastion : personne ne prend de dégât jusqu’au prochain tour.'); }
    case 'oria:pouvoir:A': { const Q = debout.map(z => ({ z, d:z.des.filter(d => !d.pas && !des.includes(d)).sort((a, b) => a.v - b.v)[0] })).filter(q => q.d && q.d.v < 5); if (!Q.length) return non('Personne n’a un dé à changer.'); if (!essai) Q.forEach(q => { q.d.v = 5; q.d.mod = true; }); return fin(Q.map(q => 'h' + S.heros.indexOf(q.z)), `le plus petit dé de ${Q.map(q => nm(q.z)).join(', ')} devient un 5.`); }
    case 'oria:pouvoir:B': { const m = aDist(S, h, 4)[0]; if (!m) return non('Aucun monstre à 4 cases.'); if (!essai) briseN(S, m, 1, null, ev); return fin([idM(S, m)], `une flèche brise un sceau de ${m.n}.`); }
    case 'oria:pouvoir:C': { const M = [], P2 = []; Object.entries(R.obj).forEach(([c, o]) => { const [x, y] = c.split(',').map(Number); if (dist(h, { x, y }) > 4) return; if (o.meuble && !o.fouille) M.push(o); if (o.t === 'piege' && !o.trouve) P2.push(o); });
      if (!M.length && !P2.length) return non('Rien à voir à 4 cases.');
      const quoi = M.map(o => `${MEUBLE_N[o.t] || 'le meuble'} : ${{ rouage:SCEN[S.scen || 'horloger'].objet.n, potion:'une potion', potion2:'deux potions', parchemin:'un parchemin', fumee:'un fumigène', grains:'un sablier', or:'de l’or', objet:'un objet', piege:'un piège', monstre:'un monstre', mimique:'une MIMIQUE', reliquaire:'le reliquaire', rien:'rien' }[o.cache] || 'rien'}`);
      if (!essai) { P2.forEach(o => o.vu = true); M.forEach(o => o.vuContenu = true); } return fin([], `Coup d’œil : ${quoi.join(' · ') || 'aucun meuble'}${P2.length ? ` ; ${P2.length} piège${P2.length > 1 ? 's' : ''} repéré${P2.length > 1 ? 's' : ''}` : ''}.`); }
    case 'oria:ultime:A': { const P2 = Object.values(R.obj).filter(o => o.t === 'piege' && !o.trouve); if (!essai) { P2.forEach(o => o.vu = true); S.sablier += 3; } return fin([], `la Carte du monde : ${P2.length} piège${P2.length > 1 ? 's' : ''} dévoilé${P2.length > 1 ? 's' : ''}, +3 grains au sablier.`); }
    case 'oria:ultime:B': { const L = aDist(S, h, 4); if (!L.length) return non('Aucun monstre à 4 cases.'); if (!essai) L.forEach(m => briseN(S, m, 1, null, ev)); return fin(L.map(m => idM(S, m)), `une pluie de flèches : un sceau de ${L.map(m => m.n).join(', ')}.`); }
    case 'gorm:pouvoir:A': { if (!essai) debout.forEach(z => z.bonusT = { v:1 + b3, fin:R.tour }); return fin(debout.map(z => 'h' + S.heros.indexOf(z)), `chant de guerre : +${1 + b3} sur les sceaux « ≥ » et « Σ » pour tout le groupe ce tour.`); }
    case 'gorm:pouvoir:B': { if (h.souffleT === R.tour) return non('Le Second souffle sert une fois par tour.'); const n = h.des.filter(d => !d.pas && !des.includes(d)).length + 1; if (!essai) { h.des = h.des.filter(d => d.pas); for (let i = 0; i < n; i++) h.des.push({ id:'d' + S.seq++, v:de6(S), b:0 }); } return fin(['h' + hi], `Gorm relance ${n} dés.`); } // 17/11 : Second souffle une fois par tour, +1 dé (avant : +2, sans limite)
    case 'gorm:pouvoir:C': { const L = collesA(S, h).slice(0, 2); if (!L.length) return non('Aucun monstre collé à Gorm.'); if (!essai) L.forEach(m => briseN(S, m, 1, null, ev)); return fin(L.map(m => idM(S, m)), `coup de tonnerre : un sceau de ${L.map(m => m.n).join(', ')}.`); }
    case 'gorm:ultime:A': { const L = aDist(S, h, 3); if (!L.length) return non('Aucun monstre à 3 cases.'); if (!essai) L.forEach(m => briseN(S, m, m === R.boss ? 2 : 1, null, ev)); return fin(L.map(m => idM(S, m)), `le Grand Souffle brise un sceau de ${L.map(m => m.n).join(', ')}${L.includes(R.boss) ? ' (deux à l’Horloger)' : ''}.`); } // 17/11 : avant, 2 sceaux à chacun
    case 'gorm:ultime:B': { if (!essai) debout.forEach(z => { const n = z.des.filter(d => !d.pas && !des.includes(d)).length; z.des = z.des.filter(d => d.pas); for (let i = 0; i < n; i++) z.des.push({ id:'d' + S.seq++, v:de6(S), b:0 }); }); return fin(debout.map(z => 'h' + S.heros.indexOf(z)), 'le grand cor : tout le groupe relance ses dés.'); }
    case 'zephine:pouvoir:A': { let best = null; debout.filter(z => z === h || dist(z, h) <= 2).forEach(z => z.des.forEach(d => { if (!d.pas && !des.includes(d) && d.v < 6 && (!best || d.v < best.d.v)) best = { z, d }; })); if (!best) return non('Personne à 2 cases n’a un dé à changer.'); const av0 = best.d.v; if (!essai) { best.d.v = 6; best.d.mod = true; } return fin(['h' + S.heros.indexOf(best.z)], `le ${av0} de ${nm(best.z)} devient un 6.`); }
    case 'zephine:pouvoir:B': { const L = aDist(S, h, 3).slice(0, 3); if (!L.length) return non('Aucun monstre à 3 cases.'); if (!essai) L.forEach(m => briseN(S, m, 1, null, ev)); return fin(L.map(m => idM(S, m)), `la chaîne d’éclairs brise un sceau de ${L.map(m => m.n).join(', ')}.`); }
    case 'zephine:pouvoir:C': { const L = aDist(S, h, 3).filter(m => m !== R.boss).slice(0, 3); if (!L.length) return non('Aucun monstre à 3 cases.'); if (!essai) L.forEach(m => repousse(S, m, h, 2)); return fin(L.map(m => m.id), `la tornade repousse ${L.map(m => m.n).join(', ')} de 2 cases.`); }
    case 'zephine:ultime:A': { const L = aDist(S, h, 4).filter(m => m.sceaux.some(s => !s.ok && s.t === 'tot')); if (!L.length) return non('Aucun monstre à 4 cases n’a de sceau « Σ ».'); if (!essai) L.forEach(m => briseN(S, m, 9, s => s.t === 'tot', ev)); return fin(L.map(m => idM(S, m)), `la Pierre philosophale efface les sceaux « Σ » de ${L.map(m => m.n).join(', ')}.`); }
    case 'zephine:ultime:B': { if (!essai) S.orage = R.tour + 1; return fin(S.heros.map((z, i) => 'h' + i), 'le grand orage : 2 tours, les monstres frappent de 1 de moins et le groupe a +1 sur les sceaux.'); }
  }
  return non('Pouvoir inconnu.');
}
// Zéphine, Transmutation : une fois par tour, retourner un dé (1↔6, 2↔5, 3↔4)
function transmuter(S, hi, idDe) {
  const h = S.heros[hi], d = h && h.des.find(z => z.id === idDe); if (!d || d.pas) return 'Choisis d’abord un dé (pas un dé 👣).';
  if (h.id !== 'zephine' || !pwA(h, 'passif', 'A')) return 'Seule Zéphine (Transmutation) sait retourner un dé.'; if (h.transT === S.R.tour) return 'Une fois par tour.';
  const av = d.v; d.v = 7 - d.v; d.mod = true; h.transT = S.R.tour; log(S, `🔄 Transmutation : le ${av} de Zéphine devient un ${d.v}.`); return { ok:true, ev:[pwEv(h, hi, 'passif', ['h' + hi])] };
}
const API = { JAUGE_ULT, GRANDIT, miseAJour:S => { if (S && S.R && S.R.plan === 2) { elargitPortes(S); majBibliotheque(S); majBibliotheque3(S); majBibliotheque5(S); majAutel2(S); } return S; }, benir, ETAL, acheter, pause, echanger, prendreEscalier, moitiesPorte, presDePorte, rectSalle, etageDe, COULOIRS_Z2, CAPA, phasesDe, grilleOuverte, contact, pasDe, aPortee, SAC, utiliser, SCEN, HEROS_C, BETES, PHASES, SALLES, OBJETS, MEUBLE_N, nouvelle, atteignables, bouger, frapper, proteger, soigner, donner, relever, fouiller, agir, ouvrir,
  finTour, visible, accepte, coutEchange, voisins, dist, herosEn, cle, libre, reveille, pwInfo, lancerPouvoir, transmuter, trouveCombo, PW_CO, COMBOS };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.CHRON = API;
})(typeof window !== 'undefined' ? window : globalThis);
