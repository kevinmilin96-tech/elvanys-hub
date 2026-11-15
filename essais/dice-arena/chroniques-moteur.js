// =============================================================================================== LES CHRONIQUES DE LA GUILDE (15/11, moteur)
// Coopération jusqu'à 4 héros sur un plateau à cases, scénario « Le Sommeil de l'Horloger » (validé par l'utilisateur, page chroniques-horloger.html).
// Un tour du GROUPE : chaque héros lance ses dés et les pose (bouger, frapper les sceaux d'un monstre, protéger, soigner, donner un dé à un voisin,
// fouiller, agir sur un objet) ; puis les monstres font ce qu'ils ont annoncé ; puis la salle agit (balanciers, engrenages, aiguilles) ;
// le SABLIER perd un grain. Pas de dessin ici : marche aussi dans node. L'état est un JSON simple (sauvegarde au début de chaque salle).
(function (racine) {
'use strict';

// ------------------------------------------------------------------ hasard à graine (dans l'état)
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

// ------------------------------------------------------------------ les héros (PV d'aventure ≈ un tiers du Duel ; un talent chacun)
const HEROS_C = {
  maelle:  { n:'Maëlle', pv:15, des:3, c:'#ff8a2a', t:'Coup de forge', d:'Quand elle frappe avec un 6, il brise DEUX sceaux.' },
  aldric:  { n:'Sire Aldric', pv:16, des:3, c:'#ffd27a', t:'Lanterne', d:'Quand il protège, son bouclier couvre aussi ses voisins.' },
  pip:     { n:'Pip', pv:12, des:3, c:'#c58bff', t:'Soins', d:'Elle peut soigner : un dé rend sa valeur en PV à elle ou à un voisin.' },
  oria:    { n:'Oria', pv:15, des:3, c:'#5ff5e6', t:'Éclaireuse', d:'+2 cases à chaque déplacement ; elle voit les pièges à 2 cases.' },
  gorm:    { n:'Gorm', pv:16, des:4, c:'#4f8bff', t:'Grand souffle', d:'Il lance 4 dés au lieu de 3.' },
  zephine: { n:'Zéphine', pv:15, des:3, c:'#ff4040', t:'Vent', d:'Elle frappe un monstre jusqu’à 2 cases de distance.' },
};

// ------------------------------------------------------------------ les monstres
const BETES = {
  rouagelin: { n:'Rouagelin', img:'lutin', att:1, mv:2, s:() => [sceau('any'), sceau('min', 3)] },
  gardien:   { n:'Gardien de bronze', img:'sentinelle', att:2, mv:1, s:() => [sceau('pair'), sceau('pair'), sceau('tot', 7)], garde:.33 },
  coucou:    { n:'Coucou furieux', img:'harpie', att:2, mv:3, s:() => [sceau('imp'), sceau('min', 4)] },
  page:      { n:'Page hurlante', img:'esprit', att:1, mv:3, vol:true, s:() => [sceau('imp'), sceau('imp')], fuit:.3 },
  archiviste:{ n:'Archiviste de cuivre', img:'liche', att:3, mv:1, s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('min', 5), sceau('tot', 10)], soin:.35, elite:true },
  ombre:     { n:'Ombre du temps', img:'ombre', att:2, mv:2, s:() => [sceau('any'), sceau('any')], immortel:true },
  horloger:  { n:'L’Horloger', img:'horloger', att:3, mv:1, s:() => [], boss:true },
};
const PHASES = [
  { n:'Le Ressort', s:() => [sceau('min', 5), sceau('min', 5), sceau('dbl', 0, 1), sceau('dbl', 0, 1)], d:'frappe de 3 le héros le plus proche et appelle 2 Rouagelins' },
  { n:'Le Carillon', s:() => [sceau('pair'), sceau('imp'), sceau('tot', 12)], d:'sonne : chaque héros qui n’est pas à côté d’un ami perd son plus gros dé au prochain tour' },
  { n:'La Dernière Heure', s:() => [sceau('ex', 6), sceau('ex', 1), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('tot', 15)], d:'renvoie le héros le plus blessé à l’entrée de la salle et frappe de 4' },
];

// ------------------------------------------------------------------ les salles (# mur · . sol · E entrée · S sortie · C coffre · x objet caché · L levier
//   G engrenage · Q trappe · T piège caché · B étagère · K livre · A axe · O rouage à porter · lettres minuscules : monstres)
const SALLES = {
  hall: { n:'Le Hall des balanciers', carte:[
    '##########',
    '#EE.....C#',
    '#EE......#',
    '#..r...r.#',
    '#...g....#',
    '#.r......#',
    '#.......x#',
    '####S#####'], balanciers:[3, 4, 5], but:'Abattez les monstres pour ouvrir la porte. Attention aux balanciers : la rangée en rouge sera balayée (2 dégâts).',
    lu:'« Tic… … tac. Les balanciers bougent encore, mais tout seuls. Attention à vos têtes : le bronze, ça ne pardonne pas. »' },
  rouages: { n:'La Salle des rouages', carte:[
    '##########',
    '#EE.L..L.#',
    '#EE.GGGG.#',
    '#...GGGGQ#',
    '#...T....#',
    '#.L....L.#',
    '#....r.rQ#',
    '#####S####'], renforts:{ tour:3, b:'rouagelin', n:2 }, but:'Baissez les 4 leviers en même temps : chacun demande un dé de tant ou plus, et reste baissé jusqu’à la fin du tour suivant (on peut se donner des dés). Les engrenages (↻) déplacent ce qui est dessus.',
    lu:'« Quatre leviers, quatre héros. C’est un signe. Ou alors l’Horloger aimait les jeux à quatre. Moi je compte, vous tirez. »' },
  coucous: { n:'Le Couloir des coucous', carte:[
    '########',
    '#EE....#',
    '#EE.c..#',
    '#....c.#',
    '#.c..c.#',
    '#......#',
    '###S####'], but:'Abattez les Coucous furieux pour passer.', lu:'« Coucou ! COUCOU ! Ils sont mignons. Ils mordent. »' },
  atelier: { n:'L’Atelier abandonné', choix:true, lu:'« Un vieil atelier. De la poussière, des outils… et des trucs utiles, peut-être. Chacun prend un objet. »' },
  biblio: { n:'La Bibliothèque des heures', carte:[
    '##########',
    '#EE.B..p.#',
    '#EE.B.BB.#',
    '#...B..K.#',
    '#.BB..B..#',
    '#..p..B.a#',
    '#.B..BB..#',
    '#....T...#',
    '####S#####'], brume:3, but:'Abattez les gardiens des livres. Le Livre des heures (📕) est tout en haut : il faut DEUX héros à côté de lui pour l’attraper (un dé de 4 ou plus).',
    lu:'« Chut. C’est une bibliothèque. Même les monstres chuchotent. Enfin… sauf ceux-là. »' },
  coeur: { n:'Le Cœur de l’Horloge', carte:[
    '##########',
    '#EE.....O#',
    '#EE......#',
    '#........#',
    '#.......o#',
    '#....A...#',
    '#........#',
    '#........#',
    '#O......O#',
    '##########'], aiguilles:true, but:'Portez les 3 rouages (⚙) jusqu’à l’axe (✹) : marchez dessus pour en prendre un, puis « Poser » à côté de l’axe. Évitez les aiguilles (en rouge) et l’Ombre du temps.',
    lu:'« Tic. Tac. Tic. Ça repart ! Et… ça va réveiller quelqu’un. »' },
};
const ORDRE = ['hall', 'rouages', 'carrefour', 'biblio', 'coeur'];
const OBJETS = { bouclier:{ n:'Bouclier de bronze', d:'Bouclier 3 au début de chaque salle.' }, cle:{ n:'Clé à molette', d:'+1 dé à chaque tour.' }, lunettes:{ n:'Lunettes de l’horloger', d:'Voit tous les pièges et objets cachés.' } };
const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

// ------------------------------------------------------------------ une partie
function nouvelle(heros, s) {
  const S = { heros:heros.map(h => ({ id:h, pv:HEROS_C[h].pv, pvmax:HEROS_C[h].pv, objet:null })), sablier:12, salle:0, rs:graine(s), graine:s,
    livre:false, figes:0, journal:[], seq:0, fin:null, chemin:null, score:0, tours:0 };
  entrer(S, 0); return S;
}
const log = (S, t) => { S.journal.unshift(t); S.journal.length = Math.min(S.journal.length, 40); };
const cle = (x, y) => x + ',' + y;
function salleCourante(S) { const k = ORDRE[S.salle]; return k === 'carrefour' ? (S.chemin || 'carrefour') : k; }
// entrer dans la salle n (sauvegarde : l'état au moment d'entrer suffit pour la recommencer)
function entrer(S, n) {
  S.salle = n; const k = salleCourante(S); S.R = null;
  if (k === 'carrefour') { S.etape = 'carrefour'; return; }
  const D = SALLES[k]; if (D.choix) { S.etape = 'atelier'; return; }
  const R = { k, n:D.n, w:D.carte[0].length, h:D.carte.length, murs:{}, obj:{}, monstres:[], tour:0, porte:false, vu:{}, leviers:{}, rouagesPoses:0, aig:0, boss:null };
  const entrees = [];
  D.carte.forEach((ligne, y) => [...ligne].forEach((ch, x) => {
    const c = cle(x, y);
    if (ch === '#' || ch === 'B') R.murs[c] = ch;
    if (ch === 'E') entrees.push([x, y]);
    if (ch === 'S') { R.murs[c] = 'S'; R.sortie = [x, y]; }
    if (ch === 'C') R.obj[c] = { t:'coffre' };
    if (ch === 'x') R.obj[c] = { t:'cache' };
    if (ch === 'T') R.obj[c] = { t:'piege', cache:true };
    if (ch === 'G') R.obj[c] = { t:'engrenage' };
    if (ch === 'Q') R.obj[c] = { t:'trappe' };
    if (ch === 'K') { R.murs[c] = 'K'; R.obj[c] = { t:'livre' }; }
    if (ch === 'A') { R.murs[c] = 'A'; R.axe = [x, y]; }
    if (ch === 'O') R.obj[c] = { t:'rouage' };
    if (ch === 'L') { R.obj[c] = { t:'levier', v:2 + Math.floor(hasard(S) * 4) }; }
    const b = { r:'rouagelin', g:'gardien', c:'coucou', p:'page', a:'archiviste', o:'ombre' }[ch];
    if (b) ajouteMonstre(S, R, b, x, y);
  }));
  // leviers : jamais deux fois la même valeur (sinon trop facile)
  const vus = []; Object.values(R.obj).filter(o => o.t === 'levier').forEach(o => { while (vus.includes(o.v)) o.v = 2 + Math.floor(hasard(S) * 4); vus.push(o.v); });
  S.R = R; S.etape = 'jeu';
  S.heros.forEach((h, i) => { const [x, y] = entrees[i % entrees.length]; h.x = x; h.y = y; h.bouclier = h.objet === 'bouclier' ? 3 : 0; h.porte = false; if (h.pv <= 0) h.pv = 3; h.aTerre = false; });
  log(S, `🚪 ${D.n}`);
  debutTour(S);
}
function ajouteMonstre(S, R, b, x, y) { const B = BETES[b]; const m = { id:'m' + S.seq++, b, n:B.n, img:B.img, x, y, att:B.att, sceaux:B.s(), it:'frappe' }; R.monstres.push(m); return m; }
const libre = (S, x, y, sauf) => { const R = S.R; if (x < 0 || y < 0 || x >= R.w || y >= R.h || R.murs[cle(x, y)]) return false;
  if (R.monstres.some(m => m !== sauf && m.x === x && m.y === y)) return false; if (R.boss && R.boss.x === x && R.boss.y === y) return false; return true; };
const herosEn = (S, x, y) => S.heros.find(h => h.x === x && h.y === y);
const voisins = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// ------------------------------------------------------------------ le tour du groupe
function debutTour(S) {
  const R = S.R; R.tour++; S.tours++;
  S.heros.forEach(h => {
    let n = HEROS_C[h.id].des + (h.objet === 'cle' ? 1 : 0) - (S.sablier <= 0 ? 1 : 0);
    h.des = []; if (h.aTerre) n = 0;
    for (let i = 0; i < Math.max(0, n); i++) h.des.push({ id:'d' + S.seq++, v:de6(S) });
    if (h.carillon && h.des.length) { h.des.sort((a, b) => b.v - a.v); h.des.shift(); h.carillon = false; log(S, `🔔 ${HEROS_C[h.id].n} a perdu son plus gros dé.`); }
    h.protege = 0;
  });
  // 15/11 : un levier tiré reste baissé jusqu'à la fin du tour SUIVANT (sinon les 4 dans le même tour était presque impossible)
  R.leviersTour = R.leviersTour || {}; for (const c in R.leviersTour) { R.leviersTour[c]--; if (R.leviersTour[c] <= 0) delete R.leviersTour[c]; }
  // intentions des monstres
  R.monstres.forEach(m => { const B = BETES[m.b], r = hasard(S); m.it = B.garde && r < B.garde ? 'garde' : B.soin && r < B.soin && R.monstres.length > 1 ? 'soin' : B.fuit && r < B.fuit ? 'fuit' : 'frappe'; });
  if (R.boss) R.boss.it = R.boss.repos ? 'remonte' : 'frappe';
}
// cases atteignables avec un dé de valeur v (on traverse les amis, pas les monstres ni les murs)
function atteignables(S, h, v) {
  const R = S.R, pasMax = v + (h.id === 'oria' ? 2 : 0) - (h.porte ? 1 : 0), res = {}, file = [[h.x, h.y, 0]], vu = { [cle(h.x, h.y)]:1 };
  while (file.length) { const [x, y, d] = file.shift(); if (d >= pasMax) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, c = cle(nx, ny); if (vu[c] || !libre(S, nx, ny)) continue; vu[c] = 1; if (!herosEn(S, nx, ny)) res[c] = d + 1; file.push([nx, ny, d + 1]); } }
  return res;
}
const prendDe = (h, id) => { const i = h.des.findIndex(d => d.id === id); return i < 0 ? null : h.des.splice(i, 1)[0]; };
// ---- les actions d'un dé (renvoient un texte d'erreur, ou un objet { ok, ev })
function bouger(S, hi, idDe, x, y) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe); if (!d || h.aTerre) return 'Ce héros ne peut pas bouger.';
  if (!atteignables(S, h, d.v)[cle(x, y)]) return 'Trop loin pour ce dé.';
  prendDe(h, idDe); h.x = x; h.y = y; const ev = [];
  const o = S.R.obj[cle(x, y)];
  if (o && o.t === 'piege' && !o.trouve) { o.trouve = true; o.cache = false; blesseHeros(S, h, 3); ev.push({ t:'piege', h:hi }); log(S, `⚠ ${HEROS_C[h.id].n} tombe dans un piège : −3 PV.`); }
  if (o && o.t === 'rouage' && !h.porte) { delete S.R.obj[cle(x, y)]; h.porte = true; ev.push({ t:'prend' }); log(S, `⚙ ${HEROS_C[h.id].n} porte un rouage.`); }
  sortieEtVue(S); return { ok:true, ev };
}
function frapper(S, hi, idDe, mid, k) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), R = S.R;
  const m = mid === 'boss' ? R.boss : R.monstres.find(z => z.id === mid); if (!d || !m) return 'Rien à frapper.';
  const portee = h.id === 'zephine' ? 2 : 1;
  if (dist(h, m) > portee) return portee > 1 ? 'Trop loin (2 cases au plus).' : 'Il faut être à côté du monstre.';
  if (BETES[m.b].immortel) { prendDe(h, idDe); repousse(S, m, h, 3); log(S, '🌑 L’Ombre recule de 3 cases.'); return { ok:true, ev:[{ t:'recule' }] }; }
  const s = m.sceaux[k]; if (!s || !accepte(s, d.v, m.sceaux)) return 'Ce dé ne va pas sur ce sceau.';
  prendDe(h, idDe); pose(s, d.v);
  if (h.id === 'maelle' && d.v === 6) { const s2 = m.sceaux.find(z => !z.ok); if (s2) { brise(s2); log(S, '🔨 Coup de forge : deux sceaux d’un coup !'); } }
  R.frappeurs = R.frappeurs || {}; R.frappeurs[m.id] = (R.frappeurs[m.id] || []); if (!R.frappeurs[m.id].includes(hi)) R.frappeurs[m.id].push(hi);
  return { ok:true, ev:verifieMonstre(S, m) };
}
function verifieMonstre(S, m) {
  const R = S.R, ev = [];
  if (!m.sceaux.every(s => s.ok)) return ev;
  if (m === R.boss) { // phase suivante
    R.boss.phase++; ev.push({ t:'phase', m:m.id });
    if (R.boss.phase >= PHASES.length) { R.boss = null; S.fin = 'gagne'; S.score += 500 + S.sablier * 20; log(S, '🏆 L’Horloger s’arrête… et s’excuse !'); return ev; }
    R.boss.sceaux = PHASES[R.boss.phase].s(); if (R.boss.phase === 2 && S.livre) { R.boss.sceaux.pop(); log(S, '📕 Le Livre des heures : un sceau de moins pour la Dernière Heure.'); }
    log(S, `⏰ L’Horloger passe à la phase « ${PHASES[R.boss.phase].n} » : il ${PHASES[R.boss.phase].d}.`); return ev;
  }
  R.monstres = R.monstres.filter(z => z !== m); S.score += BETES[m.b].elite ? 60 : 20;
  const duo = (R.frappeurs && R.frappeurs[m.id] || []).length >= 2; if (duo) { S.score += 25; log(S, `🤝 ${m.n} abattu à deux : +25 !`); }
  ev.push({ t:'tombe', m:m.id, duo }); log(S, `💀 ${m.n} tombe.`);
  sortieEtVue(S); return ev;
}
function proteger(S, hi, idDe, cibleI) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), c = S.heros[cibleI]; if (!d || !c) return 'Personne à protéger.';
  if (c !== h && !voisins(h, c)) return 'Il faut être à côté de l’ami.';
  prendDe(h, idDe); const b = Math.ceil(d.v / 2) + 1;
  const qui = h.id === 'aldric' ? S.heros.filter(z => z === c || z === h || voisins(z, h)) : [c];
  qui.forEach(z => z.bouclier += b); log(S, `🛡 ${HEROS_C[h.id].n} protège ${qui.map(z => HEROS_C[z.id].n).join(', ')} (bouclier ${b}).`);
  return { ok:true, ev:[] };
}
function soigner(S, hi, idDe, cibleI) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), c = S.heros[cibleI]; if (h.id !== 'pip') return 'Seule Pip sait soigner.';
  if (!d || !c || (c !== h && !voisins(h, c))) return 'Il faut être à côté de l’ami.';
  prendDe(h, idDe); const av = c.pv; c.pv = Math.min(c.pvmax, c.pv + d.v); if (c.aTerre && c.pv > 0) c.aTerre = false;
  log(S, `🌿 Pip soigne ${HEROS_C[c.id].n} : +${c.pv - av} PV.`); return { ok:true, ev:[{ t:'soin', h:cibleI }] };
}
function donner(S, hi, idDe, cibleI) {
  const h = S.heros[hi], c = S.heros[cibleI]; if (!c || c === h || !voisins(h, c)) return 'Il faut être à côté de l’ami.';
  const d = prendDe(h, idDe); if (!d) return 'Pas de dé.'; c.des.push(d); log(S, `🤝 ${HEROS_C[h.id].n} donne un ${d.v} à ${HEROS_C[c.id].n}.`);
  return { ok:true, ev:[] };
}
function relever(S, hi, idDe, cibleI) {
  const h = S.heros[hi], c = S.heros[cibleI]; if (!c || !c.aTerre || !voisins(h, c)) return 'Il faut être à côté de l’ami à terre.';
  if (!prendDe(h, idDe)) return 'Pas de dé.'; c.aTerre = false; c.pv = 4; log(S, `✋ ${HEROS_C[h.id].n} relève ${HEROS_C[c.id].n}.`); return { ok:true, ev:[{ t:'soin', h:cibleI }] };
}
function fouiller(S, hi, idDe) {
  const h = S.heros[hi]; if (!prendDe(h, idDe)) return 'Pas de dé.'; let n = 0;
  Object.entries(S.R.obj).forEach(([c, o]) => { const [x, y] = c.split(',').map(Number); if (Math.abs(x - h.x) + Math.abs(y - h.y) <= 2 && (o.cache || o.t === 'cache')) {
    if (o.t === 'piege') { o.cache = false; o.trouve = false; o.vu = true; n++; } if (o.t === 'cache') { delete S.R.obj[c]; S.sablier += 3; n++; log(S, '⚙ Un rouage doré, caché dans le mur : +3 grains de sablier !'); } } });
  if (!n) log(S, `🔍 ${HEROS_C[h.id].n} fouille… rien.`); else log(S, `🔍 ${HEROS_C[h.id].n} a trouvé quelque chose.`);
  return { ok:true, ev:[] };
}
// agir sur la case (x, y) à côté : coffre, levier, livre, poser un rouage sur l'axe
function agir(S, hi, idDe, x, y) {
  const h = S.heros[hi], d = h.des.find(z => z.id === idDe), R = S.R, o = R.obj[cle(x, y)];
  if (!d) return 'Pas de dé.';
  if (R.axe && x === R.axe[0] && y === R.axe[1]) {
    if (!h.porte) return 'Il faut porter un rouage.'; if (dist(h, { x, y }) !== 1) return 'Il faut être à côté de l’axe.';
    prendDe(h, idDe); h.porte = false; R.rouagesPoses++; S.sablier += 2; log(S, `⚙ Rouage posé (${R.rouagesPoses}/3) : +2 grains.`);
    if (R.rouagesPoses >= 3) reveilBoss(S); return { ok:true, ev:[{ t:'rouage' }] };
  }
  if (!o) return 'Rien à faire ici.';
  const pres = dist(h, { x, y }) <= 1;
  if (o.t === 'coffre') { if (!pres) return 'Il faut être à côté.'; prendDe(h, idDe); delete R.obj[cle(x, y)]; h.pv = Math.min(h.pvmax + 5, h.pv + 5); log(S, `💰 Le coffre : une potion, ${HEROS_C[h.id].n} +5 PV.`); return { ok:true, ev:[{ t:'soin', h:hi }] }; }
  if (o.t === 'levier') { if (!pres) return 'Il faut être à côté du levier.'; if (d.v < o.v) return `Ce levier demande un ${o.v} ou plus.`; if (R.leviersTour[cle(x, y)]) return 'Ce levier est déjà baissé.';
    prendDe(h, idDe); R.leviersTour[cle(x, y)] = 2; const n = Object.keys(R.leviersTour).length; log(S, `🎚 Levier tiré (${n}/4).`);
    if (n >= 4 && !R.porte) { R.porte = true; S.sablier += 2; log(S, '🎚🎚🎚🎚 Les 4 leviers baissés ensemble : le pont descend, la porte s’ouvre (+2 grains) !'); }
    return { ok:true, ev:[{ t:'levier' }] }; }
  if (o.t === 'livre') { if (!pres) return 'Il faut être à côté du livre.'; if (d.v < 4) return 'Il faut un dé de 4 ou plus.';
    const aides = S.heros.filter(z => z !== h && !z.aTerre && dist(z, { x, y }) === 1); if (!aides.length) return 'Il faut un deuxième héros à côté du livre pour faire la courte échelle.';
    prendDe(h, idDe); delete R.obj[cle(x, y)]; R.murs[cle(x, y)] = 'B'; S.livre = true; log(S, '📕 Le Livre des heures ! Le point faible de l’Horloger est noté.'); return { ok:true, ev:[{ t:'livre' }] }; }
  return 'Rien à faire ici.';
}
function reveilBoss(S) {
  const R = S.R; R.aiguillesStop = true; const [ax, ay] = R.axe;
  const pos = [[ax, ay - 1], [ax + 1, ay], [ax - 1, ay], [ax, ay + 1]].find(([x, y]) => libre(S, x, y) && !herosEn(S, x, y)) || [ax, ay - 1];
  R.boss = { id:'boss', b:'horloger', n:'L’Horloger', img:'horloger', x:pos[0], y:pos[1], att:3, phase:0, sceaux:PHASES[0].s(), repos:false, it:'frappe' };
  R.monstres = R.monstres.filter(m => m.b !== 'ombre');
  log(S, '⏰ Les trois rouages tournent… L’HORLOGER se réveille, furieux !');
}
function repousse(S, m, h, n) { for (let i = 0; i < n; i++) { const dx = Math.sign(m.x - h.x), dy = Math.sign(m.y - h.y); const nx = m.x + (Math.abs(m.x - h.x) >= Math.abs(m.y - h.y) ? dx || 1 : 0), ny = m.y + (Math.abs(m.x - h.x) < Math.abs(m.y - h.y) ? dy || 1 : 0); if (libre(S, nx, ny, m) && !herosEn(S, nx, ny)) { m.x = nx; m.y = ny; } } }
function sortieEtVue(S) {
  const R = S.R; if (!R) return;
  if (!R.porte && ['hall', 'coucous', 'biblio'].includes(R.k) && !R.monstres.length) { R.porte = true; log(S, '🚪 La porte s’ouvre ! Allez sur la sortie.'); }
}
function blesseHeros(S, h, n) {
  if (h.aTerre || n <= 0) return 0; const b = Math.min(h.bouclier, n); h.bouclier -= b; n -= b; h.pv -= n;
  if (h.pv <= 0) { h.pv = 0; h.aTerre = true; h.des = []; if (h.porte) { h.porte = false; S.R.obj[cle(h.x, h.y)] = { t:'rouage' }; } log(S, `💫 ${HEROS_C[h.id].n} est à terre ! Un ami à côté peut le relever (un dé).`); }
  return n;
}
// la sortie : tous les héros debout dessus ou à côté → salle suivante
function peutSortir(S) { const R = S.R; if (!R || !R.porte || !R.sortie) return false; const [x, y] = R.sortie; return S.heros.filter(h => !h.aTerre).some(h => Math.abs(h.x - x) + Math.abs(h.y - y) <= 1); }
function sortir(S) { if (!peutSortir(S)) return false; S.score += 50; entrer(S, S.salle + 1); return true; }

// ------------------------------------------------------------------ la fin du tour : monstres, salle, sablier
function finTour(S) {
  const R = S.R, ev = []; if (!R || S.fin) return ev;
  const debout = () => S.heros.filter(h => !h.aTerre);
  const plusProche = m => debout().sort((a, b) => dist(a, m) - dist(b, m))[0];
  const marche = (m, cible, n) => { for (let i = 0; i < n; i++) { if (!cible || dist(m, cible) <= 1) return; const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => (libre(S, x, y, m) || BETES[m.b].vol && x > 0 && y > 0 && x < R.w - 1 && y < R.h - 1 && !/[#SKA]/.test(R.murs[cle(x, y)] || '')) && !herosEn(S, x, y) && !R.monstres.some(z => z !== m && z.x === x && z.y === y)); if (!opts.length) return; opts.sort((a, b) => dist({ x:a[0], y:a[1] }, cible) - dist({ x:b[0], y:b[1] }, cible)); [m.x, m.y] = opts[0]; } };
  for (const m of R.monstres.slice()) {
    const B = BETES[m.b];
    if (m.it === 'garde') { const s = m.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; } ev.push({ t:'garde', m:m.id }); log(S, `🛡 ${m.n} referme un sceau.`); continue; }
    if (m.it === 'soin') { const o = R.monstres.find(z => z !== m && z.sceaux.some(s => s.ok)); if (o) { const s = o.sceaux.find(x => x.ok); s.ok = false; s.val = 0; s.reste = s.t === 'tot' ? s.v : 0; log(S, `💚 ${m.n} répare ${o.n}.`); } ev.push({ t:'soin', m:m.id }); continue; }
    if (m.it === 'fuit') { const c = plusProche(m); if (c) { const avant = { x:m.x, y:m.y }; repousse(S, m, c, 2); } ev.push({ t:'fuit', m:m.id }); continue; }
    // frappe : l'Ombre vise celui qui porte un rouage
    const cible = B.immortel ? (debout().find(h => h.porte) || plusProche(m)) : plusProche(m);
    marche(m, cible, B.mv);
    if (cible && dist(m, cible) <= 1) { const perdu = blesseHeros(S, cible, m.att); ev.push({ t:'frappe', m:m.id, h:S.heros.indexOf(cible), v:perdu });
      if (B.immortel && cible.porte === false && perdu >= 0) {} log(S, `⚔ ${m.n} frappe ${HEROS_C[cible.id].n} (−${perdu}).`); }
    else ev.push({ t:'avance', m:m.id });
  }
  // l'Horloger joue un tour sur deux
  if (R.boss && !S.fin) {
    const Bo = R.boss;
    if (Bo.repos) { const s = Bo.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; } log(S, '⏰ L’Horloger remonte son ressort (un sceau se referme).'); ev.push({ t:'garde', m:'boss' }); }
    else {
      const c = plusProche(Bo);
      if (Bo.phase === 0) { marche(Bo, c, 1); if (c && dist(Bo, c) <= 2) blesseHeros(S, c, 3); for (let i = 0; i < 2; i++) { const p = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => [Bo.x + dx, Bo.y + dy]).find(([x, y]) => libre(S, x, y) && !herosEn(S, x, y)); if (p) ajouteMonstre(S, R, 'rouagelin', p[0], p[1]); } log(S, '⏰ Le Ressort : un coup de 3 et deux Rouagelins !'); }
      else if (Bo.phase === 1) { debout().forEach(h => { if (!S.heros.some(z => z !== h && !z.aTerre && voisins(z, h))) h.carillon = true; }); log(S, '🔔 Le Carillon sonne ! Ceux qui sont seuls perdront leur plus gros dé.'); }
      else { const blesse = debout().sort((a, b) => a.pv - b.pv)[0]; if (blesse) { const p = [[1, 1], [2, 1], [1, 2], [2, 2]].find(([x, y]) => !herosEn(S, x, y) && libre(S, x, y)) || [1, 1]; blesse.x = p[0]; blesse.y = p[1]; blesseHeros(S, blesse, 4); log(S, `⏳ La Dernière Heure : ${HEROS_C[blesse.id].n} est renvoyé à l’entrée (−4).`); } }
      ev.push({ t:'boss' });
    }
    Bo.repos = !Bo.repos;
  }
  // la salle agit
  if (SALLES[R.k] && SALLES[R.k].balanciers) { const B = SALLES[R.k].balanciers, y = B[R.tour % B.length]; debout().forEach(h => { if (h.y === y) { blesseHeros(S, h, 2); ev.push({ t:'balancier', h:S.heros.indexOf(h) }); log(S, `🔔 Un balancier balaie ${HEROS_C[h.id].n} (−2).`); } }); }
  if (R.k === 'rouages') { // engrenages : un pas vers la droite
    const bouge = o => { const o2 = R.obj[cle(o.x, o.y)]; if (o2 && o2.t === 'engrenage' && libre(S, o.x + 1, o.y, o) && !herosEn(S, o.x + 1, o.y)) o.x++; };
    S.heros.forEach(bouge); R.monstres.forEach(bouge);
    const Rf = SALLES.rouages.renforts; if (R.tour === Rf.tour) { Object.entries(R.obj).filter(([, o]) => o.t === 'trappe').forEach(([c]) => { const [x, y] = c.split(',').map(Number); if (libre(S, x, y) && !herosEn(S, x, y)) ajouteMonstre(S, R, Rf.b, x, y); }); log(S, '🕳 Les trappes s’ouvrent : des Rouagelins !'); ev.push({ t:'renfort' }); }
  }
  if (SALLES[R.k] && SALLES[R.k].aiguilles && !R.aiguillesStop) { aiguilleCases(S).forEach(c => { const h = S.heros.find(z => !z.aTerre && cle(z.x, z.y) === c); if (h) { blesseHeros(S, h, 3); ev.push({ t:'aiguille', h:S.heros.indexOf(h) }); log(S, `🕛 Une aiguille frappe ${HEROS_C[h.id].n} (−3).`); } }); R.aig = (R.aig + 1) % 4; }
  // le sablier
  S.sablier = Math.max(0, S.sablier - 1); if (S.sablier === 0) log(S, '⌛ Le sablier est vide : le temps se fige, chaque héros a un dé de moins.');
  if (!debout().length) { S.fin = 'perdu'; log(S, '❄ Tous les héros sont à terre…'); return ev; }
  R.frappeurs = {};
  debutTour(S); return ev;
}
// les cases que balaient les aiguilles à la fin de CE tour (montrées en rouge)
function aiguilleCases(S) {
  const R = S.R; if (!R || !R.axe || R.aiguillesStop) return [];
  const [ax, ay] = R.axe, res = []; [R.aig, R.aig + 4].forEach(i => { const [dx, dy] = DIRS[i % 8]; for (let k = 1; k <= 4; k++) { const x = ax + dx * k, y = ay + dy * k; if (!R.murs[cle(x, y)]) res.push(cle(x, y)); } });
  return res;
}
function rangeeBalancier(S) { const R = S.R; if (!R || !SALLES[R.k] || !SALLES[R.k].balanciers) return null; const B = SALLES[R.k].balanciers; return B[R.tour % B.length]; }
// la visibilité (bibliothèque : on ne voit qu'à 3 cases d'un héros)
function visible(S, x, y) { const R = S.R, b = SALLES[R.k] && SALLES[R.k].brume; if (!b) return true; return S.heros.some(h => Math.abs(h.x - x) + Math.abs(h.y - y) <= b); }
// le carrefour et l'atelier
function choisirChemin(S, c) { S.chemin = c; if (c === 'atelier') S.sablier = Math.max(0, S.sablier - 2); entrer(S, S.salle); }
function choisirObjets(S, liste) { S.heros.forEach((h, i) => h.objet = liste[i] || null); S.chemin = 'fait'; entrer(S, S.salle + 1); }

const API = { HEROS_C, BETES, PHASES, SALLES, ORDRE, OBJETS, nouvelle, entrer, salleCourante, atteignables, bouger, frapper, proteger, soigner, donner, relever, fouiller, agir,
  finTour, peutSortir, sortir, aiguilleCases, rangeeBalancier, visible, choisirChemin, choisirObjets, accepte, voisins, dist, herosEn, cle };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.CHRON = API;
})(typeof window !== 'undefined' ? window : globalThis);
