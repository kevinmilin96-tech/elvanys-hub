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
    case 'dbl': { const j = L.find(x => x !== s && x.t === 'dbl' && x.g === s.g && x.ok); return !j || j.val === d; }
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
const BETES = {
  rouagelin: { n:'Rouagelin', img:'lutin', att:1, mv:2, s:() => [sceau('any'), sceau('min', 3)] },
  gardien:   { n:'Gardien de bronze', img:'sentinelle', att:2, mv:1, s:() => [sceau('pair'), sceau('pair'), sceau('tot', 7)], garde:.33 },
  coucou:    { n:'Coucou furieux', img:'harpie', att:2, mv:3, s:() => [sceau('imp'), sceau('min', 4)] },
  page:      { n:'Page hurlante', img:'esprit', att:1, mv:3, s:() => [sceau('imp'), sceau('imp')], fuit:.3 },
  archiviste:{ n:'Archiviste de cuivre', img:'liche', att:3, mv:1, s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('min', 5), sceau('tot', 10)], soin:.35, elite:true },
  horloger:  { n:'L’Horloger', img:'horloger', att:3, mv:1, s:() => [], boss:true },
  // les Terres brûlées (scénario d'essai sur la carte peinte, 15/11)
  gobelin:   { n:'Gobelin des cendres', img:'gobelin', att:1, mv:2, s:() => [sceau('any'), sceau('min', 3)], fuit:.2 },
  loup:      { n:'Loup de braise', img:'loup', att:2, mv:3, s:() => [sceau('pair'), sceau('min', 4)] },
  salamandre:{ n:'Salamandre', img:'salamandre', att:2, mv:2, s:() => [sceau('imp'), sceau('tot', 7)] },
  scarabee:  { n:'Scarabée de braise', img:'scarabee', att:1, mv:1, s:() => [sceau('pair'), sceau('pair'), sceau('min', 3)], garde:.3 },
  golem:     { n:'Golem de scories', img:'golem', att:3, mv:1, s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('min', 5), sceau('tot', 10)], garde:.3, elite:true },
  elementaire:{ n:'Élémentaire de lave', img:'elementaire', att:3, mv:1, s:() => [sceau('min', 5), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('tot', 9)], soin:.25, elite:true },
  titan:     { n:'Le Titan de feu', img:'titan', att:3, mv:1, s:() => [], boss:true },
};
const PHASES = [
  { n:'Le Ressort', s:() => [sceau('min', 5), sceau('min', 5), sceau('dbl', 0, 1), sceau('dbl', 0, 1)], d:'frappe de 3 le héros le plus proche et appelle 2 Rouagelins' },
  { n:'Le Carillon', s:() => [sceau('pair'), sceau('imp'), sceau('tot', 12)], d:'sonne : chaque héros qui n’est pas à côté d’un ami perd son plus gros dé au prochain tour' },
  { n:'La Dernière Heure', s:() => [sceau('ex', 6), sceau('ex', 1), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('tot', 15)], d:'renvoie le héros le plus blessé dans le hall d’entrée et frappe de 4' },
];

// ------------------------------------------------------------------ LES SCÉNARIOS (15/11) : chacun a sa carte, ses textes, son objet à trouver et son boss.
// « horloger » : la carte construite en salles et couloirs (portes) ; « brulees » : la CARTE PEINTE des Terres brûlées (decor/carte-brulees.webp)
// calée au doigt par l'utilisateur (placer-chroniques.html), brouillard « à vue » (les murs peints cachent ce qu'il y a derrière).
const SCEN = {
  horloger: { n:'Le Sommeil de l’Horloger', boss:'horloger', renfort:'rouagelin', objet:{ n:'rouage', e:'⚙️' }, axe:'l’axe de la Grande Horloge', axeE:'✹', sablier:25,
    phases:['Le Ressort', 'Le Carillon', 'La Dernière Heure'] },
  brulees: { n:'Les Terres brûlées (essai sur la carte peinte)', boss:'titan', renfort:'salamandre', objet:{ n:'braise éternelle', e:'🔥' }, axe:'le grand brasier', axeE:'🔥', sablier:28,
    phases:['Les Flammes', 'La Fumée', 'L’Éruption'], image:'decor/carte-brulees.webp', vue:5 },
  // 15/11 soir : LE LABYRINTHE DES RUNES, un donjon TIRÉ AU HASARD à chaque partie (salles, couloirs, meubles, monstres, pièges) : on rejoue sans fin
  labyrinthe: { n:'Le Labyrinthe des Runes (donjon au hasard)', boss:'titan', renfort:'gobelin', objet:{ n:'fragment de rune', e:'✦' }, axe:'l’autel des runes', axeE:'✦', sablier:30,
    phases:['Le Réveil', 'La Colère', 'Le Dernier Souffle'], vue:5, hasard:true },
  // 15/11 soir : LES AVENTURES EN SCÈNES (chroniques-aventures.js) : une EMBUSCADE sur le chemin = un petit terrain ouvert, gagner = abattre tous les monstres
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
  const faibles = ['gobelin', 'loup', 'scarabee', 'rouagelin', 'page', 'coucou'], forts = ['salamandre', 'golem', 'gardien', 'elementaire', 'archiviste'];
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

// ------------------------------------------------------------------ LA CARTE du Sommeil de l'Horloger (20 × 18)
const W = 20, H = 18;
const SALLES = {
  A: { n:'Le Hall d’entrée', r:[1, 1, 5, 3], lu:'« Le hall. Tout est figé, même la poussière. Trois portes, des couloirs… Choisissez bien, le sablier tourne. »' },
  C: { n:'La Réserve', r:[8, 1, 4, 3], lu:'« Une réserve pleine de vieux meubles. Si j’étais un rouage, je me cacherais là. Ou pas. »' },
  G: { n:'La Crypte des horlogers', r:[14, 1, 5, 3], lu:'« Ici dorment les anciens horlogers de la Guilde. Fouillez avec respect. Et vite. »' },
  B: { n:'La Salle des rouages', r:[1, 7, 5, 4], lu:'« Quatre leviers. Baissez-les tous ensemble : ils ouvrent la grande porte de bronze, tout en bas. »' },
  E: { n:'L’Atelier abandonné', r:[9, 7, 3, 3], lu:'« Un vieil atelier. Des outils, des ressorts… et un établi qui n’a pas été rangé depuis cent ans. »' },
  F: { n:'La Bibliothèque des heures', r:[15, 7, 4, 4], lu:'« Chut. C’est une bibliothèque. Le Livre des heures est tout en haut d’une étagère : il faut être deux pour l’attraper. »' },
  H: { n:'Le Cœur de l’Horloge', r:[4, 14, 10, 3], lu:'« La Grande Horloge. Son axe attend trois rouages. Posez-les… et quelqu’un va se réveiller. »' },
};
const COULOIRS = [[1, 5, 18, 1], [1, 12, 18, 1], [7, 5, 1, 8], [13, 5, 1, 8]];
const PORTES = [[3, 4, 'A'], [10, 4, 'C'], [16, 4, 'G'], [3, 6, 'B'], [6, 9, 'B'], [8, 8, 'E'], [12, 8, 'E'], [16, 6, 'F'], [14, 9, 'F'], [8, 13, 'H', 'bronze']];
const MEUBLES = [[5, 1, 'coffre', 'A'], [1, 3, 'tonneaux', 'A'], [8, 1, 'armoire', 'C'], [11, 1, 'tonneaux', 'C'], [11, 3, 'armoire', 'C'],
  [15, 2, 'tombeau', 'G'], [17, 2, 'tombeau', 'G'], [18, 1, 'coffre', 'G'], [10, 7, 'etabli', 'E'], [11, 9, 'armoire', 'E'], [18, 10, 'coffre', 'F'], [1, 10, 'tonneaux', 'B'], [13, 16, 'cheminee', 'H']];
const ROUAGES_CACHES = ['11,3', '17,2', '10,7', '18,10'];
const LEVIERS = [[1, 7], [5, 7], [2, 9], [5, 10]];
const ETAGERES = [[16, 8], [17, 8], [16, 10]], LIVRE = [18, 8], AXE = [8, 15];
const MONSTRES_DEPART = [['rouagelin', 4, 2], ['rouagelin', 9, 2], ['page', 14, 1], ['page', 18, 3], ['gardien', 3, 9], ['rouagelin', 4, 8],
  ['coucou', 13, 7], ['coucou', 13, 10], ['page', 15, 9], ['archiviste', 17, 9], ['rouagelin', 6, 15], ['rouagelin', 11, 15]];
const OBJETS = { bouclier:{ n:'Bouclier de bronze', d:'Bouclier 3 à chaque fois qu’une porte s’ouvre.' }, cle:{ n:'Clé à molette', d:'+1 dé à chaque tour.' }, lunettes:{ n:'Lunettes de l’horloger', d:'Voit tous les pièges.' } };
const MEUBLE_N = { coffre:'le coffre', armoire:'l’armoire', tonneaux:'les tonneaux', tombeau:'le tombeau', etabli:'l’établi', cheminee:'la cheminée', lit:'le lit de camp', tente:'la tente', etagere:'l’étagère', bureau:'le bureau', banc:'le banc', autel:'l’autel', fontaine:'la fontaine', cristaux:'les cristaux' };
const cle = (x, y) => x + ',' + y;

// ------------------------------------------------------------------ la difficulté selon le NOMBRE DE HÉROS (15/11 : seul, l'Horloger était impossible ; à 4, trop facile)
// 1 héros : environ la moitié des monstres, sablier +15, leviers baissés 8 tours ; 2 : 70 % des monstres ; 3 : 85 % ; 4 : tous, et 3 de plus dans les couloirs.
const ADAPTE = { 1:{ garde:.5, sablier:15, levier:8 }, 2:{ garde:.7, sablier:8, levier:5 }, 3:{ garde:.85, sablier:3, levier:3 }, 4:{ garde:1, sablier:0, levier:2, renfort:3 } };
// les sceaux d'une phase du boss, selon le nombre de héros : seul −2 sceaux, à deux −1, à quatre +1 (« 4 ou plus »)
function sceauxBoss(S, k) {
  const L = PHASES[k].s(), n = S.nbHeros || S.heros.length;
  if (n <= 1) L.splice(-2, 2); else if (n === 2) L.pop(); else if (n >= 4) L.push(sceau('min', 4));
  if (k === 2 && S.livre) L.pop();
  if (S.scen === 'labyrinthe' && n <= 1 && L.length > 2) L.pop(); // seul dans un grand labyrinthe : un sceau de moins
  return L;
}
function adapte(S) {
  const R = S.R, n = Math.max(1, Math.min(4, S.heros.length)), A = ADAPTE[n];
  S.nbHeros = n; S.dureeLevier = A.levier; S.sablier += A.sablier;
  if (S.scen === 'labyrinthe') { S.sablier += [0, 20, 10, 0, 0][n]; if (n <= 2) R.monstres = R.monstres.filter(() => hasard(S) < .7); } // un donjon plus grand : plus de temps aux petits groupes
  if (A.garde < 1 && S.scen !== 'arene') R.monstres = R.monstres.filter(m => hasard(S) < A.garde); // une embuscade garde ses monstres (écrits pour l'aventure)
  if (A.renfort) { // à 4 : quelques monstres de plus, posés dans des couloirs (cases de sol hors salle, loin du départ)
    const libres = []; for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) { const c = cle(x, y); if (!R.murs[c] && !R.salle[c] && !R.portes[c] && !R.obj[c] && !S.heros.some(h => dist(h, { x, y }) < 8) && !R.monstres.some(m => m.x === x && m.y === y)) libres.push([x, y]); }
    const sorte = S.scen === 'brulees' ? ['loup', 'gobelin', 'salamandre'] : S.scen === 'labyrinthe' ? ['gobelin', 'loup', 'page'] : ['rouagelin', 'coucou', 'rouagelin'];
    for (let i = 0; i < A.renfort && libres.length; i++) { const [x, y] = libres.splice(Math.floor(hasard(S) * libres.length), 1)[0]; ajouteMonstre(S, sorte[i % sorte.length], x, y); }
  }
}

// ------------------------------------------------------------------ une partie
function nouvelle(heros, s, scen, opts = {}) {
  scen = SCEN[scen] ? scen : 'horloger';
  // un héros = le nom d'une voie (« maelle »…) ou un HÉROS D'AVENTURE { voie, nom, pv, faces, desPlus, av, c } (aventuriers.js)
  const fait = h => typeof h === 'string' ? { id:h, pv:HEROS_C[h].pv, pvmax:HEROS_C[h].pv, objet:null, bouclier:0 }
    : { id:h.voie, nom:h.nom, av:h.av, c:h.c, portrait:h.portrait, faces:h.faces, talents:h.talents || [], desPlus:h.desPlus || 0, pv:h.pv, pvmax:h.pv, objet:null, bouclier:0 };
  const S = { heros:heros.map(fait), scen, sablier:SCEN[scen].sablier, rs:graine(s), graine:s,
    livre:false, journal:[], seq:0, fin:null, score:0, tours:0, rouagesTrouves:0, etape:'jeu' };
  const R = { w:W, h:H, murs:{}, salle:{}, obj:{}, portes:{}, monstres:[], tour:0, vuSalle:{}, vu:{}, rouagesPoses:0, boss:null, bronze:false, leviersTour:{} };
  S.R = R;
  if (scen === 'arene') { construitArene(S, R, opts); adapte(S); S.objectif = 'vaincre'; log(S, '⚔ Embuscade ! Abattez tous les monstres.'); debutTour(S); return S; }
  if (scen === 'labyrinthe') { construitLabyrinthe(S, R); adapte(S); voir(S); log(S, '✦ Le Labyrinthe des Runes : un donjon jamais vu. Trouvez 3 fragments de rune dans les meubles et portez-les à l’autel, tout au fond.'); debutTour(S); return S; }
  if (scen === 'brulees') { construitCarte(S, R); adapte(S); voir(S); log(S, '🔥 Les Terres brûlées : trouvez 3 braises éternelles en fouillant les meubles et portez-les au grand brasier.'); debutTour(S); return S; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) R.murs[cle(x, y)] = '#';
  const creuse = ([x0, y0, w, h], id) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { delete R.murs[cle(x, y)]; if (id) R.salle[cle(x, y)] = id; } };
  Object.entries(SALLES).forEach(([id, D]) => creuse(D.r, id)); COULOIRS.forEach(c => creuse(c));
  PORTES.forEach(([x, y, id, b]) => { delete R.murs[cle(x, y)]; R.portes[cle(x, y)] = { salle:id, ouverte:false, bronze:!!b }; });
  const tirage = ['potion', 'grains', 'objet', 'piege', 'monstre', 'parchemin', 'or', 'fumee', 'rien'];
  MEUBLES.forEach(([x, y, t, id]) => { R.murs[cle(x, y)] = 'M'; R.obj[cle(x, y)] = { t, meuble:true, salle:id, fouille:false, cache:ROUAGES_CACHES.includes(cle(x, y)) ? 'rouage' : tirage[Math.floor(hasard(S) * tirage.length)] }; });
  LEVIERS.forEach(([x, y]) => { R.murs[cle(x, y)] = 'L'; R.obj[cle(x, y)] = { t:'levier', v:2 + Math.floor(hasard(S) * 4) }; });
  const vus = []; Object.values(R.obj).filter(o => o.t === 'levier').forEach(o => { while (vus.includes(o.v)) o.v = 2 + Math.floor(hasard(S) * 4); vus.push(o.v); });
  ETAGERES.forEach(([x, y]) => R.murs[cle(x, y)] = 'B'); R.murs[cle(...LIVRE)] = 'K'; R.obj[cle(...LIVRE)] = { t:'livre' };
  R.murs[cle(...AXE)] = 'A'; R.axe = AXE.slice();
  [[7, 7], [13, 11], [11, 12], [17, 5]].forEach(([x, y]) => R.obj[cle(x, y)] = { t:'piege', cache:true });
  MONSTRES_DEPART.forEach(([b, x, y]) => ajouteMonstre(S, b, x, y));
  adapte(S);
  [[1, 1], [2, 1], [1, 2], [2, 2]].forEach(([x, y], i) => { if (S.heros[i]) { S.heros[i].x = x; S.heros[i].y = y; } });
  voir(S);
  log(S, '⏳ Le Sommeil de l’Horloger commence. Trouvez 3 rouages en fouillant les meubles, ouvrez la porte de bronze, réveillez l’Horloger.');
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
const a_t = (h, k) => !!(h.talents && h.talents.includes(k)); // un talent de héros d'aventure (aventuriers.js, TALENTS) // le nom affiché (héros d'aventure ou héros de la Guilde)
const log = (S, t) => { S.journal.unshift(t); S.journal.length = Math.min(S.journal.length, 40); };
function ajouteMonstre(S, b, x, y) { const B = BETES[b]; const m = { id:'m' + S.seq++, b, n:B.n, img:B.img, x, y, att:B.att, sceaux:B.s(), it:'frappe' }; S.R.monstres.push(m); return m; }
function libre(S, x, y, sauf) { const R = S.R; if (x < 0 || y < 0 || x >= R.w || y >= R.h || R.murs[cle(x, y)]) return false;
  const p = R.portes[cle(x, y)]; if (p && !p.ouverte) return false;
  if (R.monstres.some(m => m !== sauf && m.x === x && m.y === y)) return false; if (R.boss && R.boss !== sauf && R.boss.x === x && R.boss.y === y) return false; return true; }
const herosEn = (S, x, y) => S.heros.find(h => h.x === x && h.y === y);
const voisins = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
// ---- ce qu'on voit : une salle entière dès qu'on y entre (ou qu'on ouvre sa porte) ; les couloirs en avançant
function revele(S, id) { const R = S.R; if (R.vuSalle[id]) return false; R.vuSalle[id] = true;
  const [x0, y0, w, h] = SALLES[id].r; for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) R.vu[cle(x, y)] = 1; return true; }
function voir(S) {
  if (SCEN[S.scen || 'horloger'].image || SCEN[S.scen || 'horloger'].hasard) return voirAVue(S);
  const R = S.R; let neuves = [];
  S.heros.forEach(h => {
    const ici = R.salle[cle(h.x, h.y)]; if (ici && revele(S, ici)) neuves.push(ici);
    if (ici) return; // dans une salle : on voit la salle, pas plus loin
    const loin = h.id === 'oria' ? 5 : 3; R.vu[cle(h.x, h.y)] = 1;
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
  const R = S.R; R.tour++; S.tours++;
  S.heros.forEach(h => {
    let n = HEROS_C[h.id].des + (h.desPlus || 0) + (h.objet === 'cle' ? 1 : 0) - (S.sablier <= 0 ? 1 : 0);
    h.des = []; if (h.aTerre) n = 0;
    for (let i = 0; i < Math.max(0, n); i++) { const r = de6(S); h.des.push({ id:'d' + S.seq++, v:h.faces ? h.faces[r - 1] : r }); } // dé personnel : ses faces forgées
    if (h.carillon && h.des.length) { h.des.sort((a, b) => b.v - a.v); h.des.shift(); h.carillon = false; log(S, `🔔 ${nm(h)} a perdu son plus gros dé.`); }
  });
  for (const c in R.leviersTour) { R.leviersTour[c]--; if (R.leviersTour[c] <= 0) delete R.leviersTour[c]; }
  R.monstres.forEach(m => { const B = BETES[m.b], r = hasard(S); m.it = B.garde && r < B.garde ? 'garde' : B.soin && r < B.soin && R.monstres.length > 1 ? 'soin' : B.fuit && r < B.fuit ? 'fuit' : 'frappe'; });
  if (R.boss) R.boss.it = R.boss.repos ? 'remonte' : 'frappe';
}
function atteignables(S, h, v) {
  const R = S.R, pasMax = v + (h.id === 'oria' ? 2 : 0) + (a_t(h, 'eclaireur') ? 1 : 0) - (h.porte ? 1 : 0), res = {}, file = [[h.x, h.y, 0]], vu = { [cle(h.x, h.y)]:1 };
  while (file.length) { const [x, y, d] = file.shift(); if (d >= pasMax) continue;
    // on s'arrête en entrant dans une salle pas encore vue (comme à HeroQuest : on découvre en entrant)
    const ici = R.salle[cle(x, y)]; if (d > 0 && ici && !R.vuSalle[ici]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, c = cle(nx, ny); if (vu[c] || !libre(S, nx, ny) || !R.vu[c]) continue; vu[c] = 1; if (!herosEn(S, nx, ny)) res[c] = d + 1; file.push([nx, ny, d + 1]); } }
  return res;
}
const prendDe = (h, id) => { const i = h.des.findIndex(d => d.id === id); return i < 0 ? null : h.des.splice(i, 1)[0]; };
// ---- ouvrir une porte : GRATUIT, à côté de la porte ; la salle derrière se dévoile
function ouvrir(S, hi, x, y) {
  const h = S.heros[hi], R = S.R, p = R.portes[cle(x, y)];
  if (!p || p.ouverte) return 'Pas de porte fermée ici.'; if (h.aTerre || dist(h, { x, y }) !== 1) return 'Il faut être juste à côté de la porte.';
  if (p.bronze && !R.bronze) return 'La porte de bronze est verrouillée : baissez ensemble les 4 leviers de la Salle des rouages.';
  p.ouverte = true; R.vu[cle(x, y)] = 1;
  // on regarde DERRIÈRE la porte, dans le sens où on l'ouvre : une salle se dévoile en entier, un couloir sur 3 cases
  const dx = x - h.x, dy = y - h.y, apres = cle(x + dx, y + dy); let neuve = false;
  if (R.salle[apres]) neuve = revele(S, R.salle[apres]);
  else for (let k = 1; k <= 3; k++) { const cx = x + dx * k, cy = y + dy * k, c = cle(cx, cy); R.vu[c] = 1; R.vu[cle(cx + dy, cy + dx)] = 1; R.vu[cle(cx - dy, cy - dx)] = 1; if (R.murs[c] || R.portes[c]) break; }
  const salleOuverte = R.salle[apres] || p.salle; voir(S);
  S.heros.forEach(z => { if (z.objet === 'bouclier') z.bouclier += 3; });
  log(S, R.salle[apres] ? `🚪 ${nm(h)} ouvre la porte : ${SALLES[R.salle[apres]].n}.` : `🚪 ${nm(h)} ouvre la porte : un couloir.`);
  return { ok:true, ev:neuve ? [{ t:'salle', salle:salleOuverte }] : [], point:true };
}
function bouger(S, hi, idDe, x, y) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe); if (!d || h.aTerre) return 'Ce héros ne peut pas bouger.';
  if (!atteignables(S, h, d.v)[cle(x, y)]) return 'Trop loin pour ce dé.';
  prendDe(h, idDe); h.x = x; h.y = y; const ev = [];
  const o = S.R.obj[cle(x, y)];
  if (o && o.t === 'piege' && !o.trouve) { o.trouve = true; o.cache = false; blesseHeros(S, h, 3); ev.push({ t:'piege', h:hi }); log(S, `⚠ ${nm(h)} tombe dans un piège : −3 PV.`); }
  if (o && o.t === 'rouage' && !h.porte) { delete S.R.obj[cle(x, y)]; h.porte = true; log(S, `⚙ ${nm(h)} ramasse un rouage.`); }
  voir(S).forEach(s => ev.push({ t:'salle', salle:s }));
  return { ok:true, ev };
}
function frapper(S, hi, idDe, mid, k) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), R = S.R;
  const m = mid === 'boss' ? R.boss : R.monstres.find(z => z.id === mid); if (!d || !m) return 'Rien à frapper.';
  const portee = h.id === 'zephine' ? 2 : 1;
  if (dist(h, m) > portee) return portee > 1 ? 'Trop loin (2 cases au plus).' : 'Il faut être à côté du monstre.';
  const s = m.sceaux[k]; if (!s || !accepte(s, d.v, m.sceaux)) return 'Ce dé ne va pas sur ce sceau.';
  prendDe(h, idDe); pose(s, d.v);
  if ((h.id === 'maelle' && d.v === 6) || (a_t(h, 'brute') && d.v >= 5)) { const s2 = m.sceaux.find(z => !z.ok); if (s2) { brise(s2); log(S, '🔨 Coup de forge : deux sceaux d’un coup !'); } }
  R.frappeurs = R.frappeurs || {}; R.frappeurs[m.id] = (R.frappeurs[m.id] || []); if (!R.frappeurs[m.id].includes(hi)) R.frappeurs[m.id].push(hi);
  return { ok:true, ev:verifieMonstre(S, m) };
}
function verifieMonstre(S, m) {
  const R = S.R, ev = [];
  if (!m.sceaux.every(s => s.ok)) return ev;
  if (m === R.boss) {
    R.boss.phase++; ev.push({ t:'phase', m:m.id });
    if (R.boss.phase >= PHASES.length) { R.boss = null; S.fin = 'gagne'; S.score += 500 + S.sablier * 10; log(S, '🏆 L’Horloger s’arrête… et s’excuse !'); return ev; }
    R.boss.sceaux = sceauxBoss(S, R.boss.phase); if (R.boss.phase === 2 && S.livre) log(S, '📕 Le Livre des heures : un sceau de moins pour la Dernière Heure.');
    log(S, `⏰ L’Horloger passe à la phase « ${PHASES[R.boss.phase].n} » : il ${PHASES[R.boss.phase].d}.`); return ev;
  }
  R.monstres = R.monstres.filter(z => z !== m); S.score += BETES[m.b].elite ? 60 : 20;
  const duo = (R.frappeurs && R.frappeurs[m.id] || []).length >= 2; if (duo) { S.score += 25; log(S, `🤝 ${m.n} abattu à deux : +25 !`); }
  ev.push({ t:'tombe', m:m.id, duo }); log(S, `💀 ${m.n} tombe.`);
  if (S.objectif === 'vaincre' && !R.monstres.length && !R.boss) { S.fin = 'gagne'; S.score += 100; log(S, '🏆 L’embuscade est repoussée !'); }
  return ev;
}
function proteger(S, hi, idDe, cibleI) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), c = S.heros[cibleI]; if (!d || !c) return 'Personne à protéger.';
  if (c !== h && !voisins(h, c)) return 'Il faut être à côté de l’ami.';
  prendDe(h, idDe); const b = Math.ceil(d.v / 2) + 1 + (a_t(h, 'protecteur') ? 2 : 0);
  const qui = h.id === 'aldric' ? S.heros.filter(z => z === c || z === h || voisins(z, h)) : [c];
  qui.forEach(z => z.bouclier += b); log(S, `🛡 ${nm(h)} protège ${qui.map(z => nm(z)).join(', ')} (bouclier ${b}).`);
  return { ok:true, ev:[] };
}
function soigner(S, hi, idDe, cibleI) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), c = S.heros[cibleI]; if (h.id !== 'pip' && !a_t(h, 'guerisseur')) return 'Ce héros ne sait pas soigner.';
  if (!d || !c || (c !== h && !voisins(h, c))) return 'Il faut être à côté de l’ami.';
  prendDe(h, idDe); const av = c.pv; c.pv = Math.min(c.pvmax, c.pv + (h.id === 'pip' ? d.v : Math.ceil(d.v / 2))); if (c.aTerre && c.pv > 0) c.aTerre = false;
  log(S, `🌿 ${nm(h)} soigne ${nm(c)} : +${c.pv - av} PV.`); return { ok:true, ev:[{ t:'soin', h:cibleI }] };
}
function donner(S, hi, idDe, cibleI) {
  const h = S.heros[hi], c = S.heros[cibleI]; if (!c || c === h || !voisins(h, c)) return 'Il faut être à côté de l’ami.';
  const d = prendDe(h, idDe); if (!d) return 'Pas de dé.'; c.des.push(d); log(S, `🤝 ${nm(h)} donne un ${d.v} à ${nm(c)}.`);
  return { ok:true, ev:[] };
}
function relever(S, hi, idDe, cibleI) {
  const h = S.heros[hi], c = S.heros[cibleI]; if (!c || !c.aTerre || !voisins(h, c)) return 'Il faut être à côté de l’ami à terre.';
  if (!prendDe(h, idDe)) return 'Pas de dé.'; c.aTerre = false; c.pv = 4; log(S, `✋ ${nm(h)} relève ${nm(c)}.`); return { ok:true, ev:[{ t:'soin', h:cibleI }] };
}
// chercher les pièges autour de soi (2 cases)
function fouiller(S, hi, idDe) {
  const h = S.heros[hi]; if (!prendDe(h, idDe)) return 'Pas de dé.'; let n = 0;
  Object.entries(S.R.obj).forEach(([c, o]) => { const [x, y] = c.split(',').map(Number); if (o.t === 'piege' && o.cache && Math.abs(x - h.x) + Math.abs(y - h.y) <= 2) { o.cache = false; o.vu = true; n++; } });
  log(S, n ? `🔍 ${nm(h)} repère ${n} piège${n > 1 ? 's' : ''}.` : `🔍 ${nm(h)} cherche des pièges autour… rien.`); return { ok:true, ev:[] };
}
// agir sur la case (x, y) à côté : porte, MEUBLE à fouiller, levier, livre, axe
function agir(S, hi, idDe, x, y) {
  const h = S.heros[hi], R = S.R, o = R.obj[cle(x, y)], p = R.portes[cle(x, y)];
  if (p && !p.ouverte) return ouvrir(S, hi, x, y);
  const d = h.des.find(z => z.id === idDe); if (!d) return 'Choisis d’abord un dé.';
  if (R.axe && x === R.axe[0] && y === R.axe[1]) {
    if (!h.porte) return 'Il faut porter un rouage (on les trouve en fouillant les meubles).'; if (dist(h, { x, y }) !== 1) return 'Il faut être à côté de l’axe.';
    prendDe(h, idDe); h.porte = false; R.rouagesPoses++; S.sablier += 2; log(S, `⚙ Rouage posé sur l’axe (${R.rouagesPoses}/3) : +2 grains.`);
    if (R.rouagesPoses >= 3) reveilBoss(S); return { ok:true, ev:[{ t:'rouage', boss:R.rouagesPoses >= 3 }] };
  }
  if (!o) return 'Rien à faire ici.';
  if (dist(h, { x, y }) > 1) return 'Il faut être à côté.';
  if (o.meuble) return fouilleMeuble(S, hi, idDe, x, y, o);
  if (o.t === 'levier') { if (d.v < o.v) return `Ce levier demande un ${o.v} ou plus.`; if (R.leviersTour[cle(x, y)]) return 'Ce levier est déjà baissé.';
    prendDe(h, idDe); R.leviersTour[cle(x, y)] = S.dureeLevier || 2; const n = Object.keys(R.leviersTour).length; log(S, `🎚 Levier baissé (${n}/4).`);
    if (n >= 4 && !R.bronze) { R.bronze = true; S.sablier += 3; log(S, '🎚🎚🎚🎚 Les 4 leviers ensemble : un grondement… la PORTE DE BRONZE s’est déverrouillée (+3 grains) !'); }
    return { ok:true, ev:[{ t:'levier', bronze:R.bronze && n >= 4 }] }; }
  if (o.t === 'livre') { if (d.v < 4) return 'Il faut un dé de 4 ou plus.';
    const aides = S.heros.filter(z => z !== h && !z.aTerre && dist(z, { x, y }) === 1); if (!aides.length) return 'Il faut un deuxième héros à côté du livre pour faire la courte échelle.';
    prendDe(h, idDe); delete R.obj[cle(x, y)]; R.murs[cle(x, y)] = 'B'; S.livre = true; log(S, '📕 Le Livre des heures ! Le point faible de l’Horloger est noté.'); return { ok:true, ev:[{ t:'livre' }] }; }
  return 'Rien à faire ici.';
}
// ce que cache un meuble (une seule fouille)
function fouilleMeuble(S, hi, idDe, x, y, o) {
  const h = S.heros[hi], R = S.R; if (o.fouille) return `On a déjà fouillé ${MEUBLE_N[o.t]}.`;
  if (o.cache === 'rouage' && h.porte) return `${nm(h)} porte déjà un rouage : qu’un autre héros fouille.`;
  prendDe(h, idDe); o.fouille = true; const nom = nm(h), ev = { t:'fouille', quoi:o.cache, meuble:o.t, h:hi };
  const Le = MEUBLE_N[o.t][0].toUpperCase() + MEUBLE_N[o.t].slice(1);
  switch (o.cache) {
    case 'rouage': { h.porte = true; S.rouagesTrouves++; const sc = SCEN[S.scen || 'horloger']; log(S, `${sc.objet.e} ${nom} trouve ${sc.objet.n === 'rouage' ? 'un ROUAGE' : 'une BRAISE ÉTERNELLE'} dans ${MEUBLE_N[o.t] || 'le meuble'} ! À porter jusqu’à ${sc.axe}.`); break; }
    case 'potion': case 'parchemin': case 'fumee': (h.sac = h.sac || []).push(o.cache); log(S, `🎒 ${nom} met ${SAC[o.cache].n.toLowerCase()} dans son sac (trouvée dans ${MEUBLE_N[o.t]}).`); break;
    case 'grains': S.sablier += 3; log(S, `⌛ Un petit sablier dans ${MEUBLE_N[o.t]} : +3 grains !`); break;
    case 'or': S.score += 50; log(S, `💰 Des pièces d’or dans ${MEUBLE_N[o.t]} : +50.`); break;
    case 'objet': { if (h.objet) { S.score += 30; ev.quoi = 'or'; log(S, `💰 Un petit trésor dans ${MEUBLE_N[o.t]} : +30.`); break; }
      const k = ['bouclier', 'cle', 'lunettes'][Math.floor(hasard(S) * 3)]; h.objet = k; ev.objet = k; log(S, `🎁 ${nom} trouve ${OBJETS[k].n} : ${OBJETS[k].d}`); break; }
    case 'piege': if (a_t(h, 'chanceux')) { log(S, `🍀 ${nm(h)} évite le piège caché dans ${MEUBLE_N[o.t]}.`); break; } blesseHeros(S, h, 2); log(S, `⚠ ${Le} était piégé : ${nom} −2 PV.`); break;
    case 'monstre': { const p = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => libre(S, a, b) && !herosEn(S, a, b));
      if (p) { const m = ajouteMonstre(S, S.scen === 'horloger' || !S.scen ? 'rouagelin' : 'gobelin', p[0], p[1]); m.it = 'frappe'; R.vu[cle(p[0], p[1])] = 1; } log(S, `👹 Un Rouagelin jaillit de ${MEUBLE_N[o.t]} !`); break; }
    default: log(S, `🔍 ${nom} fouille ${MEUBLE_N[o.t]}… de la poussière, rien d’autre.`);
  }
  return { ok:true, ev:[ev] };
}
function reveilBoss(S) {
  const R = S.R, [ax, ay] = R.axe;
  const pos = [[ax, ay - 1], [ax + 1, ay], [ax - 1, ay], [ax, ay + 1]].find(([x, y]) => libre(S, x, y) && !herosEn(S, x, y)) || [ax + 2, ay];
  const sc = SCEN[S.scen || 'horloger'], Bb = BETES[sc.boss];
  R.boss = { id:'boss', b:sc.boss, n:Bb.n, img:Bb.img, x:pos[0], y:pos[1], att:(S.nbHeros || 4) <= 2 ? 2 : 3, phase:0, sceaux:sceauxBoss(S, 0), repos:false, it:'frappe' };
  log(S, S.scen === 'labyrinthe' ? '✦ Les trois fragments s’emboîtent sur l’autel… le sol tremble : LE TITAN DES RUNES se réveille !' : S.scen === 'brulees' ? '🔥 Les trois braises rallument le grand brasier… LE TITAN DE FEU en sort, furieux !' : '⏰ Les trois rouages tournent… L’HORLOGER se réveille, furieux !');
}
function repousse(S, m, h, n) { for (let i = 0; i < n; i++) { const dx = Math.sign(m.x - h.x), dy = Math.sign(m.y - h.y); const nx = m.x + (Math.abs(m.x - h.x) >= Math.abs(m.y - h.y) ? dx || 1 : 0), ny = m.y + (Math.abs(m.x - h.x) < Math.abs(m.y - h.y) ? dy || 1 : 0); if (libre(S, nx, ny, m) && !herosEn(S, nx, ny)) { m.x = nx; m.y = ny; } } }
function blesseHeros(S, h, n) {
  if (h.aTerre || n <= 0) return 0; const b = Math.min(h.bouclier, n); h.bouclier -= b; n -= b; h.pv -= n;
  if (h.pv <= 0) { h.pv = 0; h.aTerre = true; h.des = [];
    if (h.porte) { h.porte = false; const c = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [h.x + dx, h.y + dy]).find(([x, y]) => libre(S, x, y) && !S.R.obj[cle(x, y)]); if (c) S.R.obj[cle(c[0], c[1])] = { t:'rouage' }; }
    log(S, `💫 ${nm(h)} est à terre ! Un ami à côté peut le relever (un dé).`); }
  return n;
}

// ------------------------------------------------------------------ la fin du tour : monstres réveillés, sablier
function finTour(S) {
  const R = S.R, ev = []; if (!R || S.fin) return ev;
  const debout = () => S.heros.filter(h => !h.aTerre);
  const plusProche = m => debout().sort((a, b) => dist(a, m) - dist(b, m))[0];
  const marche = (m, cible, n) => { for (let i = 0; i < n; i++) { if (!cible || dist(m, cible) <= 1) return;
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => libre(S, x, y, m) && !herosEn(S, x, y) && R.vu[cle(x, y)] && !(R.portes[cle(x, y)] && !R.portes[cle(x, y)].ouverte));
    if (!opts.length) return; opts.sort((a, b) => dist({ x:a[0], y:a[1] }, cible) - dist({ x:b[0], y:b[1] }, cible));
    if (dist({ x:opts[0][0], y:opts[0][1] }, cible) >= dist(m, cible)) return; [m.x, m.y] = opts[0]; } };
  const fumee = R.fumee; R.fumee = false;
  for (const m of R.monstres.slice()) {
    if (fumee) break;
    if (!reveille(S, m)) continue;
    const B = BETES[m.b], c = plusProche(m); if (!c || dist(m, c) > 8) continue;
    if (m.it === 'garde') { const s = m.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; } ev.push({ t:'garde', m:m.id }); continue; }
    if (m.it === 'soin') { const o = R.monstres.find(z => z !== m && z.sceaux.some(s => s.ok) && dist(z, m) <= 4); if (o) { const s = o.sceaux.find(x => x.ok); s.ok = false; s.val = 0; s.reste = s.t === 'tot' ? s.v : 0; log(S, `💚 ${m.n} répare ${o.n}.`); } ev.push({ t:'soin', m:m.id }); continue; }
    if (m.it === 'fuit') { repousse(S, m, c, 2); ev.push({ t:'fuit', m:m.id }); continue; }
    marche(m, c, B.mv);
    if (dist(m, c) <= 1) { const perdu = blesseHeros(S, c, m.att); ev.push({ t:'frappe', m:m.id, h:S.heros.indexOf(c), v:perdu }); log(S, `⚔ ${m.n} frappe ${nm(c)} (−${perdu}).`); }
  }
  if (R.boss && !S.fin) {
    const Bo = R.boss;
    if (Bo.repos) { const s = Bo.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; } log(S, '⏰ L’Horloger remonte son ressort (un sceau se referme).'); ev.push({ t:'garde', m:'boss' }); }
    else {
      const c = plusProche(Bo);
      if (Bo.phase === 0) { marche(Bo, c, 1); if (c && dist(Bo, c) <= 2) blesseHeros(S, c, Bo.att); for (let i = 0; i < 2; i++) { const p = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => [Bo.x + dx, Bo.y + dy]).find(([x, y]) => libre(S, x, y) && !herosEn(S, x, y)); if (p) ajouteMonstre(S, SCEN[S.scen || 'horloger'].renfort, p[0], p[1]); } log(S, `⏰ ${SCEN[S.scen || 'horloger'].phases[0]} : un coup de 3 et deux renforts !`); }
      else if (Bo.phase === 1) { debout().forEach(h => { if (!S.heros.some(z => z !== h && !z.aTerre && voisins(z, h))) h.carillon = true; }); log(S, '🔔 Le Carillon sonne ! Ceux qui sont seuls perdront leur plus gros dé.'); }
      else { const bl = debout().sort((a, b) => a.pv - b.pv)[0]; if (bl) { const p = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 1], [3, 2]].find(([x, y]) => !herosEn(S, x, y) && libre(S, x, y)) || [1, 1]; bl.x = p[0]; bl.y = p[1]; blesseHeros(S, bl, Bo.att + 1); log(S, `⏳ La Dernière Heure : ${nm(bl)} est renvoyé dans le hall d’entrée (−4).`); } }
      ev.push({ t:'boss' });
    }
    Bo.repos = !Bo.repos;
  }
  S.sablier = Math.max(0, S.sablier - 1); if (S.sablier === 0) log(S, '⌛ Le sablier est vide : le temps se fige, chaque héros a un dé de moins.');
  if (!debout().length) { S.fin = 'perdu'; log(S, '❄ Tous les héros sont à terre…'); return ev; }
  R.frappeurs = {}; voir(S);
  debutTour(S); return ev;
}

const API = { SAC, utiliser, SCEN, HEROS_C, BETES, PHASES, SALLES, OBJETS, MEUBLE_N, nouvelle, atteignables, bouger, frapper, proteger, soigner, donner, relever, fouiller, agir, ouvrir,
  finTour, visible, accepte, voisins, dist, herosEn, cle, libre, reveille };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.CHRON = API;
})(typeof window !== 'undefined' ? window : globalThis);
