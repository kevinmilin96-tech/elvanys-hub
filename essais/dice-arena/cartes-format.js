// =============================================================================================== LE FORMAT DES CARTES DE L'ATELIER (28/11)
// Décisions de l'utilisateur (Chroniques-Conception-cartes.md, section 15) : l'atelier des cartes (editeur.html) fabrique une CARTE :
//   · « salles reliées » : des étages, sur chacun un grand plan quadrillé où l'on pose les salles de « Mes salles » et peint les couloirs ;
//     une porte qui touche un couloir ou une autre salle est reliée toute seule ; les escaliers (2 cases) relient deux étages ;
//   · ou « grande carte peinte » d'un seul tenant (comme les Terres brûlées) : une image, une grille calée dessus, des cases marquées.
// Puis les PIÈCES SPÉCIALES (départ, meubles, monstres, boss, autel, colporteur, fontaine, statues, leviers…) : elles ne font que poser
// les mêmes choses que les scénarios écrits à la main (rien n'est reprogrammé) ; les RÈGLES d'un scénario existant donnent le boss et le but.
// Ce fichier ne dessine rien : il marche dans le jeu, dans l'atelier ET dans le simulateur (node). Il « compile » la carte en un PLAN
// que le moteur lit (CHRON.nouvelle(…, { carte })) exactement comme il lit ses cartes écrites à la main.
(function (racine) {
'use strict';
const k = (x, y) => x + ',' + y;
const de = c => c.split(',').map(Number);
// les règles qu'une carte peut prendre (un scénario existant : son boss, son but, son objet à trouver)
const REGLES = {
  horloger:{ n:'Le Sommeil de l’Horloger', d:'Trouver 3 rouages dans les meubles, les porter à l’axe ; l’Horloger se réveille (3 phases). Leviers → porte de bronze.', nbObj:3, boss:true },
  brulees:{ n:'Les Terres brûlées', d:'La Clé de basalte du chef gobelin, l’Eau sacrée de la fontaine, 3 gardiens qui lâchent les braises, le grand brasier, puis le Titan de feu (Flammes, Fumée, Éruption).', nbObj:3, boss:true, vue:true },
  labyrinthe:{ n:'Le Labyrinthe des Runes', d:'Trouver 3 fragments de rune dans les meubles, les porter à l’autel ; le Roi des Os se lève (3 phases).', nbObj:3, boss:true, vue:true },
  cloitre:{ n:'Le Cloître gelé (sans boss)', d:'Trouver la corde dans un meuble et sonner la cloche. Le froid : un dé qui fait 1 gèle.', nbObj:1, boss:false, vue:true },
  vaincre:{ n:'Vaincre tous les monstres', d:'Pas d’objet à trouver : la partie est gagnée quand tous les monstres sont tombés.', nbObj:0, boss:false },
};
// les contenus possibles d'un meuble (ce que la fouille trouve) : les mêmes que les scénarios écrits à la main
const CONTENUS = { hasard:'Au hasard (comme les scénarios)', quete:'L’objet de quête (rouage, fragment, corde…)', potion:'Une potion de soin', potion2:'Deux potions', parchemin:'Un parchemin', fumee:'Un fumigène',
  or:'De l’or (+10)', grains:'Un sablier (+3 grains)', objet:'Un objet ou une pièce d’équipement', piege:'Un piège (−2 PV)', monstre:'Un monstre caché', mimique:'Une mimique (le meuble mord)', rien:'Rien', journal:'Le journal du gardien (Terres brûlées)', page:'La page des runes (Terres brûlées)' };
const TIRAGE = { horloger:['potion', 'grains', 'objet', 'piege', 'monstre', 'parchemin', 'or', 'fumee', 'rien', 'mimique'], brulees:['potion', 'grains', 'or', 'piege', 'monstre', 'parchemin', 'fumee', 'rien', 'potion', 'or'] };
const tirageDe = r => TIRAGE[r] || TIRAGE.horloger;
// la bibliothèque des pièces spéciales : t = la sorte, n = le nom montré dans l'atelier, regles = celles avec lesquelles elle agit (vide : toutes)
const PIECES = {
  depart:{ n:'Départ des héros', e:'🧭', d:'Une case de départ (posez-en 1 à 4, dans l’ordre des héros).' },
  monstre:{ n:'Monstre', e:'👹', d:'Un monstre ; « à partir de N héros » pour en ajouter seulement aux grands groupes.' },
  piege:{ n:'Piège caché', e:'⚠️', d:'Un piège caché sur le sol (−2 PV), qu’on repère avec « 🔍 Pièges ».' },
  axe:{ n:'Autel des objets', e:'✹', d:'Là où l’on porte les objets de quête (l’axe, l’autel, le brasier, la cloche) ; le boss se lève à côté.' },
  bosspos:{ n:'Place du boss', e:'👑', d:'Là où le boss apparaît (sinon à côté de l’autel).' },
  marchand:{ n:'Colporteur', e:'🧳', d:'Le colporteur : potion 12, parchemin 15, fumigène 10 (or de la bourse).' },
  levier:{ n:'Levier', e:'🕹', d:'Un levier (un dé, de 2 à 5 au hasard) ; tous baissés ensemble = la porte de bronze s’ouvre.', regles:['horloger'] },
  livre:{ n:'Livre des heures', e:'📕', d:'Le livre (il faut être deux) : une phase du boss plus courte.', regles:['horloger'] },
  grille:{ n:'Grille', e:'🪤', d:'Une grille qui s’ouvre tant qu’un héros est sur la dalle (posez aussi la dalle).', regles:['horloger'] },
  dalle:{ n:'Dalle de la grille', e:'⬜', d:'La dalle qui ouvre la grille.', regles:['horloger'] },
  statue:{ n:'Statue à tourner', e:'🗿', d:'4 statues reliées par des engrenages (tourner l’une tourne la suivante) ; toutes vers l’autel du feu = le feu sacré.', regles:['horloger'] },
  feu:{ n:'Autel du feu sacré', e:'🕯️', d:'L’autel des statues (2 cases, on ne marche pas dessus).', regles:['horloger'] },
  fontaine:{ n:'Fontaine aux dés', e:'⛲', d:'Les 3 vasques (pair, impair, la somme) : l’Eau sacrée.', regles:['brulees'] },
  source:{ n:'Source chaude', e:'♨', d:'+5 PV une fois par héros.', regles:['brulees'] },
  rune:{ n:'Rune du cercle', e:'🔥', d:'4 runes à éteindre dans l’ordre de la page (le Chaman des cendres).', regles:['brulees'] },
  cristal:{ n:'Cristal bleu', e:'💎', d:'Un cristal qui refroidit le Golem de magma (un sceau).', regles:['brulees'] },
  lave:{ n:'Fissure de lave', e:'🌋', d:'−2 PV à qui s’y arrête (−3 pendant l’Éruption).', regles:['brulees'] },
  lave2:{ n:'Lave de l’Éruption', e:'💥', d:'Une fissure qui s’ouvre seulement pendant l’Éruption du Titan.', regles:['brulees'] },
};
const MONSTRES_LISTE = ['rouagelin', 'coucou', 'page', 'archiviste', 'gardien', 'colosse', 'gobelin', 'chefgobelin', 'loup', 'salamandre', 'scarabee', 'elementaire', 'reinesal', 'chaman', 'golemmagma', 'osclaque', 'spectregivre', 'loupblanc', 'goule', 'mimique'];
// une porte peut être : en bois, de bronze (les leviers), de basalte (la clé du chef gobelin), la grande porte d'entrée (ne s'ouvre pas)
const PORTES_T = { bois:'Porte en bois', bronze:'Porte de bronze (s’ouvre avec les leviers)', basalte:'Porte de basalte (la Clé du chef gobelin)', entree:'Grande porte d’entrée (on n’en sort pas)' };

// ------------------------------------------------------------------ une salle de l'atelier : sa grille (w + 2) × (h + 2), la bordure = les murs
const bordS = (s, x, y) => x === 0 || y === 0 || x === s.w + 1 || y === s.h + 1;
function typeSalle(s, x, y) { const v = (s.cases || {})[k(x, y)]; if (v) return v.split(':')[0]; return bordS(s, x, y) ? 'mur' : 'sol'; }
// une carte neuve, vide
function nouvelleCarte(sorte, titre) {
  const c = { format:'guilde-carte', v:1, id:'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), titre:titre || 'Ma carte', maj:Date.now(), sorte:sorte || 'salles', regles:'vaincre', sablier:null,
    textes:{ ouverture:'', but:'', gagne:'', perdu:'' }, etages:[{ id:'e1', nom:'Le donjon', w:24, h:16 }], salles:[], couloirs:[], liens:[], pieces:{}, zones:[], portesT:{}, peinte:null };
  if (sorte === 'peinte') { c.etages = [{ id:'e1', nom:'La carte', w:24, h:20 }]; c.peinte = { w:24, h:20, img:null, cases:{} }; }
  return c;
}
// la place d'une case du plan : « e1:x,y »
const P_ = (e, x, y) => e + ':' + k(x, y);
const deP = s => { const i = s.indexOf(':'); const [x, y] = de(s.slice(i + 1).split('#')[0]); return { e:s.slice(0, i), x, y }; }; // « e1:x,y#2 » : une 2e pièce sur la même case

// ------------------------------------------------------------------ LA COMPILATION : la carte de l'atelier → le PLAN que lit le moteur
// Le plan : une seule grille (les étages posés les uns sous les autres, comme l'Horloge) ; murs { 'x,y': '#'|'~' }, sol des salles,
// salles (rectangle intérieur, nom, image…), couloirs et escaliers (zones), portes, liens d'escalier, meubles, pièces.
function compile(C) {
  const err = [], aver = [], P = { regles:REGLES[C.regles] ? C.regles : 'vaincre', titre:C.titre || 'Ma carte', id:C.id, recopie:C.recopie || null, sablier:C.sablier || null, murs:{}, sol:{}, salle:{}, salles:{}, couloirsZ:{}, etages:[], portes:[], deborde:{},
    liens:[], meubles:[], pieges:[], depart:[], monstres:[], leviers:[], fontaine:null, source:null, runes:[], cristaux:[], lave:[], laveEruption:[], zones:{}, textes:C.textes || {} };
  const off = {}; let W = 0, Y = 0;
  if (C.sorte === 'peinte') { const pe = C.peinte || { w:20, h:20, cases:{} }; off.e1 = 0; W = pe.w; Y = pe.h; P.etages.push([0, pe.h - 1, (C.etages[0] || {}).nom || 'La carte']); P.image = pe.img || null; P.vision = 'vue'; }
  else (C.etages || []).forEach(E => { off[E.id] = Y; P.etages.push([Y, Y + E.h - 1, E.nom || 'Un étage']); Y += E.h; W = Math.max(W, E.w); });
  P.w = W; P.h = Y; P.sorte = C.sorte === 'peinte' ? 'peinte' : 'salles'; P.plan = P.sorte === 'peinte' ? 3 : 2;
  const G = (e, x, y) => k(x, y + (off[e] || 0)); // case globale
  const porteCases = {}; // 'x,y' global → { salle, moitie }
  if (P.sorte === 'peinte') {
    const pe = C.peinte; for (let y = 0; y < pe.h; y++) for (let x = 0; x < pe.w; x++) { const v = (pe.cases || {})[k(x, y)] || 'sol', t = v.split(':')[0], c = k(x, y);
      if (t === 'mur') P.murs[c] = '#'; else if (t === 'obstacle') P.murs[c] = '~';
      else if (t === 'porte') porteCases[c] = { salle:null, seule:true, pk:P_('e1', x, y) };
      else if (t === 'meuble') P.meubles.push({ x, y, t:v.split(':')[1] || 'coffre', nom:v.split(':')[2] || undefined });
      else P.sol[c] = 1; }
    (C.zones || []).forEach(z => { if (z && z.id && z.r) P.zones[z.id] = [z.r[0], z.r[1], z.r[2], z.r[3], z.nom || 'Une salle']; });
  } else {
    // les salles posées : l'intérieur = sol de la salle (avec son id), la bordure = murs, sauf portes et meubles peints
    const occupe = {};
    (C.salles || []).forEach(s => { if (s.etage == null || s.x == null || !off.hasOwnProperty(s.etage)) return; const id = s.sid || s.id;
      P.salles[id] = { n:s.nom || 'Une salle', r:[s.x + 1, s.y + 1 + off[s.etage], s.w, s.h], lu:s.lu || '', img:s.img || null, sombre:s.lumiere === 'sombre', son:s.son || '', etage:s.etage };
      for (let y = 0; y < s.h + 2; y++) for (let x = 0; x < s.w + 2; x++) { const gx = s.x + x, gy = s.y + y, c = G(s.etage, gx, gy), t = typeSalle(s, x, y), v = (s.cases || {})[k(x, y)] || '';
        if (gx < 0 || gy < 0 || gx >= W || gy - 0 >= (C.etages.find(e => e.id === s.etage) || {}).h) { err.push(`La salle « ${s.nom} » dépasse du bord de l’étage.`); continue; }
        if (!bordS(s, x, y)) { if (occupe[c]) err.push(`Les salles « ${occupe[c]} » et « ${s.nom} » se chevauchent.`); occupe[c] = s.nom; P.salle[c] = id; P.sol[c] = 1;
          if (t === 'obstacle') P.murs[c] = '~'; }
        else if (t === 'porte') porteCases[c] = { salle:id, moitie:v.split(':')[1] === 'moitie', pk:P_(s.etage, gx, gy) };
        else if (occupe[c] && P.sol[c]) err.push(`Le mur de « ${s.nom} » passe sur le sol de « ${occupe[c]} ».`);
        if (t === 'meuble') P.meubles.push({ x:gx, y:gy + off[s.etage], t:v.split(':')[1] || 'coffre', nom:v.split(':')[2] || undefined, salle:id }); } });
    // les couloirs et les escaliers : des zones à part
    (C.couloirs || []).forEach(z => { if (!off.hasOwnProperty(z.etage)) return; const L = (z.cases || []).map(de); if (!L.length) return;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; L.forEach(([x, y]) => { const c = G(z.etage, x, y); if (P.salle[c]) err.push(`Le couloir « ${z.nom || 'couloir'} » passe dans une salle.`); P.sol[c] = 1; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      P.couloirsZ[z.id] = Object.assign({ r:[x0, y0 + off[z.etage], x1 - x0 + 1, y1 - y0 + 1], n:z.nom || (z.esc ? 'L’escalier' : 'Le couloir') }, z.esc ? { esc:true } : {}, L.length !== (x1 - x0 + 1) * (y1 - y0 + 1) ? { cases:L.map(([x, y]) => G(z.etage, x, y)) } : {});
      if (z.esc && L.length !== 2) err.push(`Un escalier fait exactement 2 cases (« ${z.nom || 'escalier'} » en a ${L.length}).`); });
    (C.liens || []).forEach(([a, b]) => { const A = deP(a), B = deP(b); if (!off.hasOwnProperty(A.e) || !off.hasOwnProperty(B.e)) return; P.liens.push([[A.x, A.y + off[A.e]], [B.x, B.y + off[B.e]]]); });
  }
  // tout ce qui n'est pas du sol est un mur (salles reliées) ; une porte n'est jamais un mur
  if (P.sorte === 'salles') for (let y = 0; y < P.h; y++) for (let x = 0; x < W; x++) { const c = k(x, y); if (!P.sol[c] && !porteCases[c] && !P.murs[c]) P.murs[c] = '#'; }
  // les portes : une case = une porte ; deux cases côte à côte = une grande porte (la 2e moitié reste un mur peint, DEBORDE)
  const vu = new Set();
  Object.keys(porteCases).forEach(c => { if (vu.has(c)) return; vu.add(c); const [x, y] = de(c); const g = [c];
    if (!porteCases[c].seule) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const q = k(x + dx, y + dy); if (porteCases[q] && !porteCases[q].seule && !vu.has(q)) { vu.add(q); g.push(q); } }); // une grande carte peinte : chaque case de porte est une porte
    if (g.length > 2) err.push('Une porte de plus de 2 cases : une porte fait 1 case, une grande porte 2.');
    const main = g.find(q => !porteCases[q].moitie) || g[0], autre = g.find(q => q !== main);
    const T = C.portesT || {}, pt = T[porteCases[main].pk] || (autre && T[porteCases[autre].pk]) || {};
    P.portes.push([...de(main), Object.assign({ salle:pt.salle || porteCases[main].salle || (autre && porteCases[autre].salle) || null }, pt.t && pt.t !== 'bois' ? { [pt.t]:true } : {})]);
    if (autre) { P.murs[autre] = '#'; P.deborde[main] = de(autre); } });
  // les pièces spéciales, posées sur des cases du plan (« e1:x,y »)
  const pieces = Object.entries(C.pieces || {}).map(([p, v]) => { const D = deP(p); return Object.assign({ gx:D.x, gy:D.y + (off[D.e] || 0) }, v); });
  const parT = t => pieces.filter(q => q.t === t);
  // les meubles : ce qu'ils cachent, s'ils sont verrouillés, leur nom (une pièce « meuble » posée sur la case du meuble)
  P.meubles.forEach(m => { const q = pieces.find(z => z.t === 'meuble' && z.gx === m.x && z.gy === m.y); if (!q) return; if (q.nom) m.nom = q.nom; if (q.verrou != null && q.verrou !== '') m.verrou = +q.verrou;
    if (q.cache && q.cache !== 'hasard') m.cache = q.cache === 'quete' ? 'rouage' : q.cache; if (q.tire) m.tire = true; if (q.sorte) m.t = q.sorte; });
  P.meubles.forEach((m, i) => { const q = pieces.find(z => z.t === 'meuble' && z.gx === m.x && z.gy === m.y); m._o = q && q.ordre != null ? +q.ordre : 1e6 + i; }); // l'ordre des fouilles tirées au hasard
  P.meubles.sort((a, b) => a._o - b._o).forEach(m => delete m._o);
  P.depart = parT('depart').sort((a, b) => (a.n || 9) - (b.n || 9)).map(q => [q.gx, q.gy]);
  P.monstres = parT('monstre').sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map(q => [q.b || 'gobelin', q.gx, q.gy, +q.nmin || 1]);
  P.pieges = parT('piege').map(q => [q.gx, q.gy]);
  const un = t => { const L = parT(t); if (L.length > 1) aver.push(`Il y a ${L.length} « ${PIECES[t].n} » : seule la première compte.`); return L[0] ? [L[0].gx, L[0].gy] : null; };
  P.axe = un('axe'); P.marchand = un('marchand'); P.livre = un('livre'); P.fontaine = un('fontaine'); P.source = un('source');
  P.bossPos = parT('bosspos').sort((a, b) => (a.n || 9) - (b.n || 9)).map(q => [q.gx, q.gy]);
  if (C.options && C.options.palier) P.palier = Object.assign({}, C.options.palier);
  P.leviers = parT('levier').map(q => [q.gx, q.gy]);
  const gr = un('grille'), da = un('dalle'); if (gr && da) P.grille = { x:gr[0], y:gr[1], dx:da[0], dy:da[1] }; else if (gr || da) err.push('La grille et sa dalle vont ensemble : posez les deux.');
  const st = parT('statue'), fe = parT('feu');
  if (st.length || fe.length) { if (st.length !== 4 || !fe.length) err.push('Les statues vont par 4, avec l’autel du feu sacré.');
    else P.statues = { cases:st.sort((a, b) => (a.n || 9) - (b.n || 9)).map(q => [q.gx, q.gy]), veut:st.map(q => +q.veut || 0), autel:[fe[0].gx, fe[0].gy] }; }
  P.runes = parT('rune').sort((a, b) => (a.n || 9) - (b.n || 9)).map(q => [q.gx, q.gy]); P.cristaux = parT('cristal').map(q => [q.gx, q.gy]);
  P.lave = parT('lave').map(q => [q.gx, q.gy]); P.laveEruption = parT('lave2').map(q => [q.gx, q.gy]);
  // dans les Terres brûlées sur salles reliées, chaque salle est une « zone » (embuscades, noms)
  if (P.sorte === 'salles') Object.entries(P.salles).forEach(([id, s]) => { const [x, y, w, h] = s.r; P.zones[id] = [x, y, x + w - 1, y + h - 1, s.n]; });
  return { P, err, aver };
}

// ------------------------------------------------------------------ LA VÉRIFICATION avant de jouer : départ, but possible, tout atteignable
function verifie(C) {
  const { P, err, aver } = compile(C), E = err.slice(), A = aver.slice(), RG = REGLES[P.regles];
  if (!P.depart.length) E.push('Posez au moins une case de départ des héros (🧭).');
  const n4 = P.depart.length; if (n4 && n4 < 4) A.push(`Seulement ${n4} case${n4 > 1 ? 's' : ''} de départ : les autres héros partiront à côté.`);
  const quetes = P.meubles.filter(m => m.cache === 'rouage').length;
  if (RG.nbObj && P.regles !== 'brulees' && quetes < RG.nbObj) E.push(`Ces règles demandent ${RG.nbObj} objet${RG.nbObj > 1 ? 's' : ''} de quête caché${RG.nbObj > 1 ? 's' : ''} dans des meubles (il y en a ${quetes}) : touchez un meuble, contenu « L’objet de quête ».`);
  if (P.regles !== 'vaincre' && !P.axe) E.push('Posez l’autel des objets (✹) : là où l’on porte les objets de quête.');
  if (P.regles === 'vaincre' && !P.monstres.length) E.push('« Vaincre tous les monstres » : posez au moins un monstre.');
  if (P.regles === 'brulees') { ['chefgobelin', 'reinesal', 'chaman', 'golemmagma'].forEach(b => { if (!P.monstres.some(m => m[0] === b)) A.push(`Les Terres brûlées attendent ${b === 'chefgobelin' ? 'le chef gobelin (il porte la Clé de basalte)' : 'les trois gardiens'} : il manque « ${b} ».`); });
    if (P.runes.length && P.runes.length !== 4) E.push('Le cercle rituel a 4 runes.'); if (!P.fontaine) A.push('Pas de fontaine aux dés : pas d’Eau sacrée (le bouclier du Titan ne tombera qu’avec un dé posé sur le brasier).'); }
  if (P.leviers.length && !P.portes.some(p => p[2].bronze)) A.push('Des leviers, mais aucune porte de bronze à ouvrir.');
  if (P.portes.some(p => p[2].bronze) && !P.leviers.length) E.push('Une porte de bronze sans levier : elle ne s’ouvrira jamais.');
  // tout est-il atteignable depuis le départ ? (portes passables, sauf l'entrée ; escaliers)
  if (P.depart.length) {
    const porte = {}; P.portes.forEach(([x, y, o]) => porte[k(x, y)] = o); const lien = {}; P.liens.forEach(([a, b]) => { lien[k(...a)] = k(...b); lien[k(...b)] = k(...a); });
    const pieceBloque = {}; [P.axe, P.marchand, P.fontaine, P.source, P.livre].concat(P.runes, P.cristaux, P.leviers, P.statues ? P.statues.cases.concat([P.statues.autel]) : []).forEach(c => { if (c) pieceBloque[k(...c)] = 1; });
    const passe = c => { if (porte[c]) return !porte[c].entree; if (P.grille && c === k(P.grille.x, P.grille.y)) return true; return !P.murs[c] && !pieceBloque[c] && !P.meubles.some(m => k(m.x, m.y) === c); };
    const vu = new Set(), f = [k(...P.depart[0])]; vu.add(f[0]);
    for (let i = 0; i < f.length; i++) { const [x, y] = de(f[i]); const V = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].map(([a, b]) => k(a, b)); if (lien[f[i]]) V.push(lien[f[i]]);
      for (const c of V) { if (vu.has(c)) continue; const [a, b] = de(c); if (a < 0 || b < 0 || a >= P.w || b >= P.h || !passe(c)) continue; vu.add(c); f.push(c); } }
    const pres = ([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([a, b]) => vu.has(k(a, b)));
    const nonAtteint = [];
    P.meubles.forEach(m => { if (!pres([m.x, m.y])) nonAtteint.push(`le meuble « ${m.nom || m.t} »`); });
    if (P.axe && !pres(P.axe)) nonAtteint.push('l’autel des objets');
    P.monstres.forEach(([b, x, y]) => { if (!vu.has(k(x, y)) && !pres([x, y])) nonAtteint.push(`le monstre « ${b} »`); });
    Object.entries(P.salles).forEach(([id, s]) => { const [x, y] = s.r; let ok = false; for (let j = 0; j < s.r[3] && !ok; j++) for (let i = 0; i < s.r[2]; i++) if (vu.has(k(x + i, y + j))) { ok = true; break; } if (!ok) nonAtteint.push(`la salle « ${s.n} »`); });
    P.depart.slice(1).forEach(([x, y]) => { if (!vu.has(k(x, y))) nonAtteint.push('une case de départ'); });
    if (nonAtteint.length) E.push('On ne peut pas atteindre ' + nonAtteint.slice(0, 6).join(', ') + (nonAtteint.length > 6 ? ` (et ${nonAtteint.length - 6} de plus)` : '') + ' depuis le départ : vérifiez les portes et les couloirs.');
    // les portes qui ne mènent nulle part
    P.portes.forEach(([x, y, o]) => { if (o.entree) return; const cotes = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const c = k(x + dx, y + dy); return P.sol[c] && !P.murs[c]; }); if (cotes.length < 2) A.push(`Une porte (${x}, ${y}) ne mène nulle part : peignez un couloir devant ou collez une autre salle.`); });
  }
  return { ok:!E.length, E, A, P };
}

// ------------------------------------------------------------------ les portes reliées / qui ne mènent nulle part (pour le plan de l'atelier)
function etatPortes(C) { const { P } = compile(C), L = [];
  P.portes.forEach(([x, y, o]) => { const cotes = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const c = k(x + dx, y + dy); return P.sol[c] && !P.murs[c]; }); L.push({ x, y, ok:o.entree || cotes.length >= 2, entree:!!o.entree, deborde:P.deborde[k(x, y)] || null }); });
  return L; }

const API = { REGLES, CONTENUS, PIECES, PORTES_T, MONSTRES_LISTE, TIRAGE, tirageDe, typeSalle, nouvelleCarte, compile, verifie, etatPortes, P_, deP, cle:k };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.CARTES = API;
})(typeof window !== 'undefined' ? window : globalThis);
