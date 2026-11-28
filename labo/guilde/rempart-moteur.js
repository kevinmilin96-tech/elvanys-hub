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
  rempart:20, energieDepart:12 /* 27/11 nuit : 8 → 12, l'utilisateur manquait d'énergie au début */, energieMax:60, regenE:2.4 /* s par ◆ */, deDelai:8, desMax:3, jaugeMax:14,
  niv:[0, 1, 1.75, 2.8, 4.2], nivMax:4, etoileMax:5, etoile:0.35, pouvoirRecharge:20, pouvoirNiv:2, besaceMax:2, accalmie:25, etire:1 /* 28/11 : les temps de NIVEAUX sont écrits pour des niveaux de 4-5 min avec accalmies (avant : ×1,35) */,
  runeBonus:0.25, pv:5, nombre:3 /* 28/11 : 3 fois plus de monstres, chacun bien moins solide */, runeMax:3, puitsDelai:6, comboBonus:0.3, bowling:90,
  // 27/11 soir (plus d'action) : les runes ◆ à toucher, l'appel de la vague, le sort du héros
  suivi:0.9, cristalVie:6, cristalAuto:6 /* 28/11 : l'utilisateur : 6 s, pas de bonus au toucher */, cristalPuits:2, cristalMonstre:2, cristalChance:1 / 3, puitsDelaiC:10, appelMin:3, appelMax:8, sortRecharge:30, sortDepart:12,
};
R.regenE = 3.0; // l'énergie qui monte seule baisse d'autant (3 s par ◆ au lieu de 2,4) : le reste vient des runes ramassées
// les sortes de tours (une par face de dé) : prix en ◆, cadence (s), dégâts au niveau 1
const SORTES = {
  1:{ n:'Tour de givre', e:'❄', prix:4, cad:1.4, dg:3, d:'Ralentit sa cible de moitié pendant 2 s (les boss ne ralentissent pas).' },
  2:{ n:'Tour de poison', e:'☠', prix:4, cad:1.8, dg:2, poison:2.2, d:'Empoisonne sa cible 4 s : le poison traverse l’armure et empêche le troll de se soigner (le golem de pierre ne s’empoisonne pas).' },
  3:{ n:'Tour d’archers', e:'🏹', prix:3, cad:1.0, dg:3, fleches:2, d:'Deux flèches à chaque tir. Elle voit les chauves-souris.' },
  4:{ n:'Canon', e:'💣', prix:5, cad:2.0, dg:9, eclats:0.5, d:'Gros boulet ; les éclats touchent à moitié les monstres tout proches. Il ne touche pas les monstres qui volent.' },
  5:{ n:'Tour de foudre', e:'⚡', prix:5, cad:1.6, dg:7, saut:0.6, d:'L’éclair saute sur un monstre d’un chemin voisin. Elle voit le spectre même invisible.' },
  6:{ n:'Grande tour', e:'🗼', prix:6, cad:2.5, dg:20, perce:true, d:'Le plus gros tir sur un seul monstre ; traverse l’armure.' },
};
const PUITS = { n:'Puits de runes', e:'🔮', prix:3, d:'Il ne tire pas : toutes les 10 secondes, il fait jaillir une rune ◆ (2 ◆) à toucher. Pose-le tôt, loin des monstres. Investir ou se défendre ?' };
const EFFET_PAIRE = {
  1:{ e:'❄', d:'ses voisines ralentissent aussi leur cible' }, 2:{ e:'☠', d:'ses voisines empoisonnent aussi' },
  3:{ e:'🏹', d:'ses voisines tirent plus vite (+30 %)' }, 4:{ e:'💣', d:'les tirs de ses voisines éclatent' },
  5:{ e:'⚡', d:'les tirs de ses voisines sautent sur un chemin voisin' }, 6:{ e:'🗼', d:'les tirs de ses voisines traversent l’armure' },
};
const POUVOIRS = {
  1:{ n:'Grand gel', d:'Tous les monstres de la carte sont gelés 1 s (1,5 s au niveau 4).' }, 2:{ n:'Nuage toxique', d:'Tout son chemin est empoisonné, très fort.' },
  3:{ n:'Flèches marquantes', d:'Quatre flèches sur chaque monstre de son chemin ; les monstres touchés prennent +25 % de dégâts de toutes les tours pendant 4 s.' }, 4:{ n:'Bombardement', d:'Un très gros tir sur chaque monstre de son chemin.' },
  5:{ n:'Tempête', d:'La foudre frappe chaque monstre des 5 chemins.' }, 6:{ n:'Tir perçant', d:'Un tir énorme traverse tout son chemin, boss compris.' },
};
// les monstres (vitesse en cases par seconde ; dg = coups au rempart)
const MONSTRES = {
  dore:{ n:'Gobelin doré', e:'🪙', pv:40, vit:1.0, dg:0, d:'Il fonce sans s’arrêter et ne frappe pas le rempart. Abattu, il lâche une pluie de ◆.', contre:'Toutes les tours : vite, il est rapide !' },
  gobelin:{ n:'Gobelin', e:'👺', pv:16, vit:.55, dg:2, d:'Peu de vie, assez rapide.', contre:'N’importe quelle tour : il est fragile.' },
  sanglier:{ n:'Sanglier', e:'🐗', pv:48, vit:.32, dg:4, d:'Beaucoup de vie, lent.', contre:'Le canon 💣 et, plus tard, le poison ☠.' },
  chauve:{ n:'Chauve-souris', e:'🦇', pv:20, vit:.6, dg:2, vol:true, d:'Elle vole : les boulets du canon passent dessous.', contre:'Les archers 🏹 et le givre ❄ la touchent.' },
  bouclier:{ n:'Porte-bouclier', e:'🛡', pv:34, vit:.35, dg:3, armure:3, d:'Chaque tir sur lui fait 3 de moins.', contre:'Le poison ☠ traverse le bouclier ; les gros tirs du canon aussi.' },
  troll:{ n:'Troll', e:'🧌', pv:75, vit:.3, dg:5, regen:2.5, d:'Il se soigne sans arrêt… sauf s’il est empoisonné.', contre:'Le poison ☠ : empoisonné, il ne se soigne plus.' },
  spectre:{ n:'Spectre', e:'👻', pv:30, vit:.42, dg:3, spectre:true, d:'Il disparaît une seconde sur deux : tes tours ne le voient plus… sauf la foudre, et toutes les tours à 2 cases ou moins d’une tour de foudre, qui le voient tout le temps.', contre:'Une tour de foudre ⚡ sur son chemin (ou juste à côté) : tout autour d’elle, il ne peut plus se cacher.' },
  chaman:{ n:'Chaman', e:'🧙', pv:26, vit:.42, dg:3, soigneur:true, d:'Toutes les 2,5 s, il soigne les monstres tout près de lui… sauf s’il est empoisonné.', contre:'Abats-le en premier : la grande tour 🗼, ou le poison ☠ qui l’empêche de soigner.' },
  mineur:{ n:'Mineur', e:'⛏', pv:34, vit:.42, dg:3, mineur:true, d:'Il creuse : sur 2 cases (en haut de tes tours), il passe sous terre et aucune tour ne le voit.', contre:'Des tours en bas du chemin, près du rempart : elles le voient quand il ressort.' },
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
// 27/11 soir : le SORT du héros, posé au doigt où on veut (recharge 30 s) : c = chemin, y = hauteur (en cases)
const SORTS_R = {
  maelle:{ n:'L’enclume', e:'⚒', d:'Une enclume tombe où tu touches : un gros coup sur les monstres tout autour.' },
  gorm:{ n:'Le cor des collines', e:'📯', d:'Sur le chemin touché, les monstres reculent d’une case et demie et prennent un coup.' },
  aldric:{ n:'Le marteau de lumière', e:'🔨', d:'Un coup de lumière où tu touches : les monstres autour sont étourdis 2 s.' },
  pip:{ n:'Le mur de ronces', e:'🌿', d:'Un mur de ronces pousse où tu touches : il bloque le chemin 4 s et pique les monstres arrêtés (le boss passe au travers, ralenti).' },
  oria:{ n:'La pluie de flèches', e:'🏹', d:'Des flèches tombent sur trois chemins, autour de l’endroit touché.' },
  zephine:{ n:'Le gel', e:'❄', d:'Tout gèle autour de l’endroit touché : les monstres restent pris 3 s (le boss ralentit).' },
};
// 27/11 soir : deux SPÉCIALISATIONS au niveau 4 pour chaque sorte (choix définitif dans la fiche de la tour)
const SPE = {
  1:{ a:{ n:'Aura de givre', d:'Tous les monstres de son chemin, au-dessus d’elle et jusqu’à 4 cases, avancent moins vite.' }, b:{ n:'Lance de glace', d:'+50 % de dégâts, et le tir transperce : il touche aussi le monstre de derrière.' } },
  2:{ a:{ n:'Peste', d:'Un monstre empoisonné qui tombe passe son poison aux monstres tout près de lui.' }, b:{ n:'Acide', d:'Le poison fait 80 % de dégâts en plus, et ses tirs traversent l’armure.' } },
  3:{ a:{ n:'Tir rapide', d:'Elle tire 60 % plus vite.' }, b:{ n:'Flèches perçantes', d:'+25 % de dégâts, et les flèches traversent l’armure.' } },
  4:{ a:{ n:'Mortier', d:'Les éclats touchent aussi les chemins voisins, et plus loin.' }, b:{ n:'Gros boulet', d:'+70 % de dégâts et la cible est étourdie un instant, mais il tire un peu moins vite.' } },
  5:{ a:{ n:'Chaîne d’éclairs', d:'L’éclair saute sur trois monstres au lieu d’un.' }, b:{ n:'Paratonnerre', d:'+50 % de dégâts, et elle révèle les spectres jusqu’à 3 cases (au lieu de 2).' } },
  6:{ a:{ n:'Œil du chasseur', d:'Elle vise le monstre qui a le plus de vie au-dessus d’elle, avec +30 % de dégâts.' }, b:{ n:'Baliste', d:'Son tir traverse tout le chemin : chaque monstre au-dessus d’elle prend 60 % du coup.' } },
};
// 27/11 soir (décision de l'utilisateur) : 3 DÉFIS FIXES par niveau = 3 MÉDAILLES, en plus des 3 étoiles. Un défi se valide pendant une
// VICTOIRE ; plusieurs peuvent se valider la même partie. 100 % d'un niveau = 3 étoiles + 3 médailles. Chaque défi pousse vers une nouveauté du niveau.
const DEFIS = {
  1:[ { k:'sanscanon', n:'Sans canon', d:'Gagne sans bâtir un seul canon 💣.', ok:S => !S.batiSortes[4] },
      { k:'appel2', n:'Pressé d’en découdre', d:'Appelle 2 vagues en avance avec le bouton ⏩.', ok:S => S.appels >= 2 },
      { k:'parfait', n:'Sans une égratignure', d:'Gagne sans laisser passer un seul monstre.', ok:S => S.passes === 0 } ],
  2:[ { k:'runes15', n:'Cueilleur de runes', d:'Ramasse 15 runes ◆ du bout du doigt.', ok:S => S.ramasses >= 15 },
      { k:'puits3', n:'Source d’énergie', d:'Bâtis 3 puits de runes 🔮 dans la même partie.', ok:S => S.puitsBatis >= 3 },
      { k:'chauvegivre', n:'Ailes gelées', d:'Abats 4 chauves-souris ralenties par le givre ❄.', ok:S => (S.tues.chauveLent || 0) >= 4 } ],
  3:[ { k:'trollpoison', n:'Le troll sans soin', d:'Abats le troll pendant qu’il est empoisonné ☠.', ok:S => (S.tues.trollPoison || 0) >= 1 },
      { k:'chaman', n:'Pas de guérisseur', d:'Aucun chaman ne touche le rempart.', ok:S => !(S.passe.chaman || 0) },
      { k:'sanssort', n:'Sans magie', d:'Gagne sans utiliser le sort du héros.', ok:S => S.sorts === 0 } ],
  4:[ { k:'spectre', n:'Chasseur de fantômes', d:'Aucun spectre ne touche le rempart.', ok:S => !(S.passe.spectre || 0) },
      { k:'spe', n:'Maître bâtisseur', d:'Spécialise une tour au niveau 4.', ok:S => S.cases.some(t => t && t.spe) || S.speFaites > 0 },
      { k:'appel3', n:'Toujours plus', d:'Appelle 3 vagues en avance avec le bouton ⏩.', ok:S => S.appels >= 3 } ],
  5:[ { k:'rune', n:'Le pouvoir des runes', d:'Bâtis une Tour-rune avec une paire de dés.', ok:S => S.runesBaties > 0 },
      { k:'mineur', n:'Rien sous terre', d:'Aucun mineur ne touche le rempart.', ok:S => !(S.passe.mineur || 0) },
      { k:'sansbowling', n:'Sans boule', d:'Bats le Titan sans lancer le dé bowling 🎳.', ok:S => S.bowlings === 0 } ],
};
// les médailles gagnées pendant cette partie (seulement si elle est gagnée)
const medailles = S => S.fini === 'gagne' ? (DEFIS[S.niveau] || []).filter(D => D.ok(S)).map(D => D.k) : [];

// ------------------------------------------------------------------------------- les 5 niveaux du premier monde
// vagues : [début (s), [monstres…]] ; « * » = élite ; la dernière vague est la « grande vague » (et le boss au niveau 5)
const NIVEAUX = [
  { n:'La lisière', sortes:[3, 4], puits:false, bowling:false, runes:false, nouveau:'gobelin', f:0.68,
    debloque:'Tes premières tours : 🏹 les archers et 💣 le canon. Les dés font monter une tour de leur face.',
    vagues:[[8, ['gobelin']], [24, ['gobelin', 'gobelin']], [42, ['gobelin', 'sanglier']], [62, ['gobelin', 'gobelin', 'gobelin', 'sanglier'], true], [100, ['gobelin', 'gobelin']], [118, ['sanglier', 'gobelin']], [136, ['gobelin', 'gobelin', 'sanglier']], [158, ['sanglier', 'sanglier', 'gobelin', 'gobelin', 'gobelin'], true], [200, ['gobelin', 'gobelin', 'sanglier']], [220, ['sanglier', 'gobelin', 'gobelin', 'gobelin']], [242, ['sanglier', 'sanglier', 'sanglier', 'gobelin', 'gobelin', 'gobelin'], true]] },
  { n:'Le gué des chauves-souris', sortes:[3, 4, 1], puits:true, bowling:false, runes:false, nouveau:'chauve', f:0.92,
    debloque:'Nouveau : ❄ la tour de givre, et 🔮 le puits de runes qui produit de l’énergie.',
    vagues:[[8, ['gobelin']], [24, ['chauve', 'gobelin']], [42, ['sanglier', 'chauve']], [62, ['gobelin', 'gobelin', 'chauve', 'sanglier'], true], [102, ['chauve', 'chauve']], [120, ['sanglier', 'gobelin', 'chauve']], [140, ['gobelin', 'gobelin', 'chauve', 'chauve']], [162, ['sanglier', 'chauve', 'chauve', 'gobelin', 'gobelin'], true], [205, ['sanglier', 'gobelin', 'gobelin', 'chauve']], [225, ['chauve', 'chauve', 'sanglier', 'gobelin']], [248, ['sanglier', 'sanglier', 'chauve', 'chauve', 'gobelin', 'gobelin'], true]] },
  { n:'Le pont du troll', sortes:[3, 4, 1, 2], puits:true, bowling:true, runes:false, nouveau:'bouclier', nouveaux:['bouclier', 'chaman'], miniBoss:'troll', f:0.47,
    debloque:'Nouveau : ☠ la tour de poison et 🎳 le dé bowling (un par niveau : il écrase tout un chemin). Et attention au chaman qui soigne !',
    vagues:[[8, ['gobelin', 'gobelin']], [24, ['bouclier']], [42, ['chauve', 'bouclier', 'gobelin']], [64, ['chaman', 'sanglier', 'bouclier', 'gobelin'], true], [104, ['sanglier*', 'chauve', 'gobelin']], [124, ['bouclier', 'chaman', 'chauve']], [146, ['bouclier', 'bouclier', 'gobelin', 'gobelin']], [168, ['troll', 'chaman', 'bouclier', 'chauve'], true], [212, ['sanglier', 'bouclier', 'chaman', 'gobelin']], [234, ['chauve', 'chauve', 'bouclier*', 'gobelin']], [258, ['troll*', 'chaman', 'bouclier', 'gobelin', 'gobelin', 'chauve'], true]] },
  { n:'La brume des spectres', sortes:[3, 4, 1, 2, 5, 6], puits:true, bowling:true, runes:false, nouveau:'spectre', nouveaux:['spectre'], f:0.6,
    debloque:'Nouveau : ⚡ la tour de foudre et 🗼 la grande tour.',
    vagues:[[8, ['gobelin', 'chauve']], [24, ['spectre']], [42, ['bouclier', 'spectre']], [64, ['sanglier', 'chauve', 'spectre', 'gobelin'], true], [104, ['troll', 'gobelin', 'gobelin']], [124, ['spectre', 'spectre', 'bouclier*']], [148, ['sanglier', 'chauve', 'chauve', 'spectre']], [172, ['troll', 'sanglier*', 'spectre', 'chauve', 'gobelin'], true], [216, ['bouclier', 'spectre', 'gobelin', 'gobelin']], [238, ['troll', 'spectre', 'chauve']], [262, ['bouclier', 'bouclier', 'spectre', 'spectre', 'chauve', 'chauve'], true]] },
  { n:'Le Titan de feu', sortes:[3, 4, 1, 2, 5, 6], puits:true, bowling:true, runes:true, nouveau:'golem', nouveaux:['mineur', 'golem'], boss:'titan', f:0.5,
    debloque:'Nouveau : les Tours-runes ! Une PAIRE de dés posée sur une case libre bâtit une Tour-rune qui renforce ses voisines. Et des mineurs qui creusent sous tes tours…',
    vagues:[[8, ['gobelin', 'gobelin']], [24, ['golem']], [44, ['mineur', 'spectre', 'bouclier', 'chauve']], [66, ['troll', 'mineur', 'sanglier', 'gobelin'], true], [108, ['golem', 'spectre', 'chaman', 'gobelin']], [130, ['bouclier*', 'troll', 'mineur', 'chauve']], [154, ['golem', 'spectre', 'mineur', 'bouclier', 'gobelin'], true], [198, ['troll*', 'sanglier', 'chaman', 'chauve']], [220, ['golem', 'mineur', 'spectre', 'gobelin']], [246, ['titan', 'gobelin', 'gobelin', 'chaman', 'chauve'], true]] },
];
// ------------------------------------------------------------------------------- hasard à graine
function graine(s) { let a = (s >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let MID = 0;
const nomTour = t => t.puits ? PUITS.n : t.rune ? `Tour-rune ${EFFET_PAIRE[t.paire].e} niv. ${t.rv}` : `${SORTES[t.v].n} niv. ${t.niv}${t.spe ? ' · ' + SPE[t.v][t.spe].n : ''}${t.et ? ' ' + '★'.repeat(t.et) : ''}`;

// une partie : heros (maelle…), niveau (1-5), o = { graine, force (forceSuiveuse du héros, 1 = débutant) }
function nouvelle(heros, niveau, o) {
  o = o || {}; let L = NIVEAUX[niveau - 1]; const rng = graine(o.graine || (Date.now() & 0xffffff));
  // 28/11 : le MODE HÉROÏQUE (un niveau déjà gagné, rejoué plus dur) : monstres +80 %, une grosse vague de plus avant la dernière, la difficulté ne baisse jamais
  if (o.heroique) { const v = L.vagues, gs = v.map((w, k) => w[2] ? k : -1).filter(k => k >= 0), der = v[v.length - 1], mod = v[gs.length > 1 ? gs[1] : gs[0]];
    L = Object.assign({}, L, { vagues:[...v.slice(0, -1), [der[0], mod[1].slice(), true], [der[0] + 45, der[1], true]] }); }
  const fs = 1 + R.suivi * Math.max(0, (o.force || 1) - 1), f = L.f * R.pv * (o.pv || 1) * fs * (o.heroique ? 1.8 : 1); // la maison : les monstres suivent la force du héros (27/11 soir : R.suivi = 90 % du gain au Rempart, 40 % avant : un héros très monté écrasait tout)
  const S = { heros, niveau, L, rng, f, puiss:Math.max(1, o.force || 1), fBoss:fs * (o.pvBoss || 1), t:0, energie:R.energieDepart, eAcc:0, rempart:R.rempart, rempartMax:R.rempart,
    cases:Array(NC * NR).fill(null), monstres:[], file:[], des:[], deT:R.deDelai, jauge:0, ultimes:0, bowling:L.bowling ? 1 : 0,
    kills:0, fini:null, fx:[], log:[], effets:{}, vus:{}, puitsGratuit:heros === 'pip', gelPartout:0,
    cristaux:[], ramasses:0, perdus:0, sortT:R.sortDepart, sorts:0, evtT:30, cadeau:null, orage:0, defi:null, murs:[], pieges:[], detours:[], besace:[], deObjet:0, appels:0, bati:0, bowlings:0, perteMax:0,
    batiSortes:{}, passes:0, passe:{}, tues:{}, runesBaties:0, speFaites:0, annonce:false, vagueVue:-1,
    heroique:!!o.heroique, adapt:1, adaptOn:o.adapt !== false, vStat:L.vagues.map(() => ({ pertes:0, morts:[], vus:0, finis:0, n:0 })), adaptLog:[] };
  L.vagues.forEach((v, iv) => { S.vStat[iv].n = v[1].length; });
  if (heros === 'aldric') { S.rempart += 3; S.rempartMax += 3; }
  // la file des apparitions : chaque vague se répand sur quelques secondes, chemins au hasard
  // 28/11 (l'utilisateur : « le gobelin passe large » devant une tour niveau 1) : des monstres MOINS SOLIDES mais PLUS NOMBREUX (R.nombre), comme
  // Plants vs Zombies : une tour de base tue un monstre de base sur son chemin ; la difficulté vient du nombre et des chemins à couvrir.
  const NB = +(typeof process !== 'undefined' && process.env && process.env.NB) || R.nombre || 1;
  L.vagues.forEach(([t0, liste], iv) => { const n = Math.max(liste.length, Math.round(liste.length * (iv < 2 ? Math.min(NB, 2) : NB))), /* 27/11 nuit : les 2 premières vagues ×2 seulement, le temps de bâtir */ pas = (iv === L.vagues.length - 1 ? 1.6 : 2.6) * liste.length / n;
    for (let j = 0; j < n; j++) { const m = liste[j % liste.length]; if (j >= liste.length && /titan/.test(m)) continue; S.file.push({ t:t0 * R.etire + j * pas + rng() * 1.2, m, vague:iv }); } });
  // 27/11 nuit : une vague compte TOUS ses monstres (avec R.nombre, elle en a 3 fois plus que sa liste) ; avant, elle était jugée finie au premier tiers
  S.vStat.forEach((V, iv) => { V.n = S.file.filter(x => x.vague === iv).length; });
  // 28/11 (l'utilisateur : « les premières 30 secondes souples, avec des gobelins, pour s'installer ») : les 2 premières vagues de chaque niveau
  // (et du mode Héroïque) ne sont QUE des gobelins de base, sans le bonus héroïque ni la difficulté qui s'adapte
  S.file.forEach(x => { if (x.vague < 2) { x.m = 'gobelin'; x.doux = true; } }); S.fDoux = f / (o.heroique ? 1.8 : 1);
  S.grosses = L.vagues.map((v, k) => v[2] || k === L.vagues.length - 1 ? k : -1).filter(k => k >= 0); S.annoncees = [];
  S.file.sort((a, b) => a.t - b.t); S.nbVagues = L.vagues.length; S.fin = S.file[S.file.length - 1].t;
  S.vT = L.vagues.map((v, iv) => Math.min(...S.file.filter(x => x.vague === iv).map(x => x.t))); // le début de chaque vague (pour les drapeaux)
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
  S.energie -= p; if (v === 'puits') S.puitsBatis = (S.puitsBatis || 0) + 1; else { S.bati++; S.batiSortes[v] = (S.batiSortes[v] || 0) + 1; }
  if (v === 'puits') { S.cases[i] = { id:++MID, puits:true, acc:0, paye:p }; S.puitsGratuit = false; log(S, '🔮 Puits de runes bâti.'); }
  else { S.cases[i] = { id:++MID, v, niv:1, et:0, cd:0.3, paye:p, pw:Math.max(0, ...S.cases.filter(x => x && x.v === v && !x.puits && !x.rune).map(x => x.pw || 0)) }; /* 28/11 : une tour neuve attend la même recharge que ses sœurs */ log(S, `${SORTES[v].e} ${SORTES[v].n} bâtie.`); }
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
// un dé sur une tour de sa face : +1 niveau (au niveau 4 : une étoile ★ qui renforce aussi le pouvoir)
function poserDe(S, k, i) {
  if (S.fini) return 'Le niveau est fini.'; const d = S.des[k], t = S.cases[i];
  if (!d) return 'Choisis un dé.'; if (!t || t.puits || t.rune) return 'Un dé se pose sur une tour de sa face.';
  if (t.v !== d.v && !d.or) return `Ce dé de ${d.v} fait monter une ${SORTES[d.v].n.toLowerCase()}.`;
  if (t.niv >= R.nivMax && t.et >= R.etoileMax) return 'Cette tour est au maximum.';
  S.des.splice(k, 1);
  if (t.niv < R.nivMax) { t.niv++; log(S, `⬆ ${nomTour(t)}.`); } else { t.et++; log(S, `★ ${nomTour(t)}.`); }
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
  if (!t) { S.runesBaties++; S.cases[i] = { id:++MID, rune:true, paire:a.v, rv:1, paye:0 }; log(S, `✨ Tour-rune ${EFFET_PAIRE[a.v].e} bâtie.`); }
  else { t.rv++; log(S, `✨ ${nomTour(t)}.`); }
  fx(S, { t:'rune', i });
}
// jeter un dé (s'il ne sert à rien) : +1 ◆, et la place se libère pour le suivant
function jeterDe(S, k) { if (!S.des[k]) return 'Pas de dé.'; S.des.splice(k, 1); S.energie += 1; log(S, '🎲 Dé jeté (+1 ◆).'); }
// le dé bowling : il roule sur tout un chemin, du rempart vers le haut
function bowling(S, c) {
  if (S.fini) return 'Le niveau est fini.'; if (!S.bowling) return 'Plus de dé bowling dans ce niveau.';
  S.bowling--; S.bowlings++; fx(S, { t:'bowling', c }); log(S, `🎳 Dé bowling sur le chemin ${c + 1} !`);
  S.monstres.filter(m => m.c === c && atteint(m)).forEach(m => frappe(S, m, M(m).boss ? R.bowling * 2 : R.bowling * S.f * 2, { perce:true, voit:true, src:'bowling' }));
}
// l'Ultime du héros
function ultime(S) {
  if (S.fini) return 'Le niveau est fini.'; if (S.jauge < R.jaugeMax) return 'La jauge n’est pas pleine.';
  S.jauge = 0; S.ultimes++; const h = S.heros, vivants = S.monstres.filter(atteint), F = S.f * 10;
  const tetes = () => { const L = []; for (let c = 0; c < NC; c++) { const x = vivants.filter(m => m.c === c).sort((a, b) => a.y - b.y)[0]; if (x) L.push(x); } return L; };
  if (h === 'maelle') { const m = vivants.sort((a, b) => a.y - b.y)[0]; if (m) frappe(S, m, F * 8, { perce:true, voit:true }); S.effets.rapide = 5; }
  else if (h === 'gorm') { tetes().forEach(m => frappe(S, m, F * 4, { perce:true, voit:true })); S.effets.cri = 6; }
  else if (h === 'aldric') { vivants.forEach(m => frappe(S, m, F * 2.2, { perce:true, voit:true })); S.rempart = Math.min(S.rempartMax, S.rempart + 3); }
  else if (h === 'pip') { vivants.forEach(m => { if (!M(m).boss) m.racine = 4; frappe(S, m, F * 1.5, { perce:true, voit:true }); }); }
  else if (h === 'oria') { tetes().forEach(m => frappe(S, m, F * 2.5, { perce:true, voit:true })); S.energie += 2; }
  else if (h === 'zephine') { vivants.forEach(m => { if (!M(m).boss) m.y = Math.min(HAUT, m.y + 2); frappe(S, m, F * 1.8, { perce:true, voit:true }); }); }
  fx(S, { t:'ultime', h }); log(S, `⚡ Ultime : ${HEROS_R[h].ultime} !`);
}
// le pouvoir d'une tour : 28/11 (l'utilisateur ne dépasse presque jamais le niveau 4 en une partie) dès le NIVEAU 2, à toucher, recharge 20 s ;
// plus petit aux niveaux 2-3 (×0,6), entier au niveau 4, et chaque étoile ★ le renforce encore (+10 %)
const pouvoirPret = t => !!t && !t.puits && !t.rune && t.niv >= R.pouvoirNiv && !(t.pw > 0);
function pouvoir(S, i) {
  const t = S.cases[i]; if (!t || t.puits || t.rune || t.niv < R.pouvoirNiv) return `Le pouvoir arrive au niveau ${R.pouvoirNiv}.`; if (t.pw > 0) return 'Le pouvoir se recharge.';
  const k = (t.niv >= R.nivMax ? 1 : .6) * (1 + .1 * (t.et || 0));
  // 28/11 (l'utilisateur : « les pouvoirs sur chaque tour, ça va être un peu cheater ») : UNE recharge par sorte de tour, partagée par toutes les tours de cette sorte
  S.cases.forEach(x => { if (x && !x.puits && !x.rune && x.v === t.v) x.pw = R.pouvoirRecharge; });
  const c = i % NC, dg = degat(S, t, i) * 3 * k, chemin = S.monstres.filter(m => m.c === c && atteint(m));
  if (t.v === 1) S.monstres.filter(atteint).forEach(m => { if (!M(m).boss) m.racine = Math.max(m.racine, t.niv >= R.nivMax ? 1.5 : 1); else m.lent = Math.max(m.lent, 1.5); if (m.c === c) frappe(S, m, dg / 3, { voit:true }); });
  else if (t.v === 2) chemin.forEach(m => { frappe(S, m, dg / 3, { voit:true }); if (!M(m).antiPoison) m.poison = { dps:dg / 2, t:5 }; });
  else if (t.v === 3) chemin.forEach(m => { m.marque = 4; for (let n = 0; n < 4; n++) frappe(S, m, dg / 3, { voit:true }); });
  else if (t.v === 4) chemin.forEach(m => frappe(S, m, dg, { voit:true, perce:true }));
  else if (t.v === 5) S.monstres.filter(atteint).forEach(m => frappe(S, m, dg / 2, { voit:true }));
  else chemin.forEach(m => frappe(S, m, dg * 1.5, { voit:true, perce:true }));
  fx(S, { t:'pouvoir', i, v:t.v }); log(S, `✦ ${POUVOIRS[t.v].n} !`);
}

// 27/11 soir (retour de l'utilisateur : « l'énergie monte à 40 sans usage ») : l'énergie sert aussi à MONTER une tour (plus cher qu'un dé)
// et à ACHETER un dé (le moins cher, pour garder l'intérêt des dés). Prix pour monter : prix de la tour × niveau visé (étoile : × 5).
const PRIX_DE = 6;
const prixMonter = t => !t || t.puits || t.rune || (t.niv >= R.nivMax && t.et >= R.etoileMax) ? 0 : SORTES[t.v].prix * (t.niv < R.nivMax ? t.niv + 1 : R.nivMax + 1);
function monterEnergie(S, i) {
  if (S.fini) return 'Le niveau est fini.'; const t = S.cases[i], p = prixMonter(t); if (!p) return 'Cette tour ne monte plus.';
  if (S.energie < p) return `Il faut ${p} ◆.`; S.energie -= p; t.paye = (t.paye || 0) + Math.round(p / 2);
  if (t.niv < R.nivMax) { t.niv++; log(S, `⬆ ${nomTour(t)} (${p} ◆).`); } else { t.et++; log(S, `★ ${nomTour(t)} (${p} ◆).`); }
  fx(S, { t:'monte', i }); if (S.heros === 'gorm') voisins(i).forEach(x => { if (S.cases[x]) S.cases[x].echo = 10; });
}
function acheterDe(S) {
  if (S.fini) return 'Le niveau est fini.'; if (S.des.length >= R.desMax) return 'Ta réserve de dés est pleine.'; if (S.energie < PRIX_DE) return `Un dé coûte ${PRIX_DE} ◆.`;
  S.energie -= PRIX_DE; const v = tireDe(S); S.des.push({ id:++MID, v }); fx(S, { t:'de', v }); log(S, `🎲 Dé acheté (${PRIX_DE} ◆).`);
}
// 27/11 soir : RAMASSER une rune ◆ (toucher avant qu'elle s'éteigne)
function ramasser(S, id) {
  const k = S.cristaux.findIndex(x => x.id === id); if (k < 0) return 'Trop tard : elle s’est éteinte.';
  const x = S.cristaux.splice(k, 1)[0]; S.energie = Math.min(R.energieMax, S.energie + x.v); S.ramasses++; fx(S, { t:'ramasse', id, v:x.v, c:x.c, y:x.y });
}
function jaillit(S, c, y, v) { y = Math.min(y, HAUT - 1.6); /* 28/11 : jamais hors de l'écran, en haut */ S.cristaux.push({ id:++MID, c, y, v, t:R.cristalVie }); fx(S, { t:'cristal' }); }
// 27/11 soir : APPELER LA VAGUE en avance (entre deux vagues) : bonus ◆ = secondes gagnées / 2 (8 au plus) + un peu de jauge d'Ultime
function appelInfo(S) {
  if (S.fini || !S.file.length) return null; const iv = S.file[0].vague, t0 = Math.min(...S.file.filter(x => x.vague === iv).map(x => x.t)), gain = t0 - S.t;
  if (gain < R.appelMin) return null; return { vague:iv, gain, bonus:Math.min(R.appelMax, Math.floor(gain / 2)), jauge:Math.min(2, Math.floor(gain / 6)) };
}
function appelVague(S) {
  const A = appelInfo(S); if (!A) return 'La vague arrive déjà.';
  S.file.forEach(x => { x.t -= A.gain; }); S.vT = S.vT.map((t, k) => k >= A.vague ? t - A.gain : t); S.fin -= A.gain;
  S.energie = Math.min(R.energieMax, S.energie + A.bonus); S.jauge = Math.min(R.jaugeMax, S.jauge + A.jauge); S.appels++;
  fx(S, { t:'appel', bonus:A.bonus }); log(S, `⏩ Vague appelée en avance (+${A.bonus} ◆).`);
}
// 28/11 (idée de l'utilisateur, façon Vampire Survivors) : LA BESACE. Après chaque grosse vague, un dé à lancer ; sa face donne un OBJET DE CONTRÔLE
// rangé dans la besace (2 places). On le pose au doigt sur le plateau. Le 6 est un joker (on choisit l'objet en le posant).
const OBJETS = {
  givre:{ f:1, e:'🧊', n:'Piège de givre', d:'Posé sur un chemin : le premier monstre qui passe dessus reste gelé 4 s (le boss est ralenti).' },
  epines:{ f:2, e:'🌵', n:'Piège d’épines', d:'Posé sur un chemin : pendant 12 s, chaque monstre qui le traverse est blessé et ralenti.' },
  barricade:{ f:3, e:'🧱', n:'Barricade', d:'Un mur sur un chemin : il bloque les monstres 6 s (le boss passe, ralenti).' },
  repousse:{ f:4, e:'💨', n:'Souffle', d:'Les monstres du chemin touché remontent de 2 cases (le boss d’une demi-case).' },
  detour:{ f:5, e:'↪️', n:'Détour', d:'Les monstres du chemin touché passent sur le chemin voisin le mieux défendu, et ceux qui arrivent dans les 8 s aussi.' },
  appat:{ f:6, e:'🥩', n:'Appât', d:'Les monstres tout autour (3 cases) viennent sur le chemin touché : regroupe-les sous tes meilleures tours.' },
};
const FACE_OBJET = ['', 'givre', 'epines', 'barricade', 'repousse', 'detour', 'joker'];
function lancerObjet(S) {
  if (S.fini) return 'Le niveau est fini.'; if (!S.deObjet) return 'Pas de dé à lancer : il en vient un après chaque grosse vague.';
  if (S.besace.length >= R.besaceMax) return 'Ta besace est pleine : pose d’abord un objet.';
  const f = 1 + Math.floor(S.rng() * 6), k = FACE_OBJET[f]; S.deObjet--; S.besace.push({ id:++MID, k, f });
  log(S, `🎒 Dé de la besace : ${f} → ${k === 'joker' ? '🃏 joker (au choix)' : OBJETS[k].e + ' ' + OBJETS[k].n}.`); fx(S, { t:'objet', f, k }); return null;
}
// mieux défendu = plus de dégâts par seconde des tours du chemin
const forceChemin = (S, c) => { let x = 0; for (let r = 0; r < NR; r++) { const t = S.cases[ix(c, r)]; if (t && !t.puits && !t.rune) x += degat(S, t, ix(c, r)) / cadence(S, t, ix(c, r)); } return x; };
function voisinFort(S, c) { const v = [c - 1, c + 1].filter(x => x >= 0 && x < NC); return v.sort((a, b) => forceChemin(S, b) - forceChemin(S, a))[0]; }
function poserObjet(S, n, c, y, choix) {
  if (S.fini) return 'Le niveau est fini.'; const o = S.besace[n]; if (!o) return 'Choisis un objet de la besace.';
  const k = o.k === 'joker' ? choix : o.k; if (!OBJETS[k]) return 'Choisis l’objet du joker.';
  c = Math.max(0, Math.min(NC - 1, Math.round(c))); y = Math.max(0.3, Math.min(HAUT, y)); const vivants = S.monstres.filter(atteint);
  if (k === 'givre' || k === 'epines') S.pieges.push({ id:++MID, k, c, y, t:k === 'givre' ? 40 : 12 });
  else if (k === 'barricade') S.murs.push({ c, y, t:6, k:'barricade' });
  else if (k === 'repousse') vivants.filter(m => m.c === c).forEach(m => { m.y = Math.min(HAUT, m.y + (M(m).boss ? .5 : 2)); });
  else if (k === 'detour') { const v = voisinFort(S, c); S.detours.push({ c, v, t:8 }); vivants.filter(m => m.c === c && !M(m).boss).forEach(m => { m.c = v; }); }
  else if (k === 'appat') vivants.filter(m => !M(m).boss && Math.abs(m.y - y) <= 3).forEach(m => { m.c = c; });
  S.besace.splice(n, 1); S.objets = (S.objets || 0) + 1;
  fx(S, { t:'pose', k, c, y, v:k === 'detour' ? S.detours[S.detours.length - 1].v : null }); log(S, `${OBJETS[k].e} ${OBJETS[k].n} posé${k === 'barricade' ? 'e' : ''} (chemin ${c + 1}).`); return null;
}
// 28/11 (idée de l'utilisateur : « des choses qui pop de temps en temps pour garder le joueur à l'affût ») : LES ÉVÉNEMENTS.
// Un toutes les 25-40 s comptées hors grosses vagues (≈ 1 par minute en tout) (le premier vers 30 s), jamais pendant une grosse vague ; jamais deux fois le même de suite.
const EVTS = {
  moustache:{ e:'🐈', n:'Moustache et sa bourse', d:'Touche-le avant qu’il parte : de l’énergie ou un dé de besace.', cadeau:4 },
  aigle:{ e:'🦅', n:'L’aigle messager', d:'Touche-le : un dé d’or 🌟 qui fait monter n’importe quelle tour.', cadeau:5 },
  dore:{ e:'🪙', n:'Le gobelin doré', d:'Il fonce ! Abats-le pour une pluie de ◆ (il ne frappe pas le rempart).' },
  orage:{ e:'🌩', n:'L’orage', d:'15 s : la foudre frappe des monstres au hasard ; une tour touchée tire deux fois plus vite.' },
  charge:{ e:'🐗', n:'La charge', d:'Un chef sanglier fonce sur le chemin marqué ▼ : une barricade ou un piège l’arrête !' },
  defi:{ e:'🎯', n:'Le défi du marchand', d:'Abats 10 monstres en 20 s : un dé de besace.' },
  destin:{ e:'🎲', n:'Le dé du destin', d:'Touche-le pour le lancer ! 5-6 : tes tours frappent +40 % pendant 15 s · 3-4 : +10 ◆ · 1-2 : trois gobelins de plus.', cadeau:6 },
  etoile:{ e:'⭐', n:'L’étoile filante', d:'Touche-la : ton Ultime se remplit d’un coup.', cadeau:4 },
};
const grosseEnCours = S => S.grosses.some(k => S.t >= S.vT[k] - 8 && !(S.vStat[k] && S.vStat[k].fait));
function lanceEvt(S) {
  // 28/11 : le défi du marchand seulement s'il y a assez de monstres à abattre (pas pendant une accalmie)
  const aVenir = S.monstres.filter(atteint).length + S.file.filter(x => x.t < S.t + 16).length;
  const L = Object.keys(EVTS).filter(k => k !== S.dernierEvt && (k !== 'defi' || aVenir >= 14)), k = L[Math.floor(S.rng() * L.length)], c = Math.floor(S.rng() * NC); S.dernierEvt = k; S.evts = (S.evts || 0) + 1;
  if (EVTS[k].cadeau) S.cadeau = { id:++MID, k, t:EVTS[k].cadeau, max:EVTS[k].cadeau, y:.2 + S.rng() * .3 };
  else if (k === 'dore') { S.file.push({ t:S.t + .5, m:'dore', c, vague:-1 }); S.file.sort((a, b) => a.t - b.t); }
  else if (k === 'charge') { S.file.push({ t:S.t + 4, m:'sanglier*', c, vague:-1, charge:true }); S.file.sort((a, b) => a.t - b.t); }
  else if (k === 'orage') { S.orage = 15; S.orageAcc = 0; }
  else if (k === 'defi') S.defi = { t:20, k0:S.kills, but:10 };
  fx(S, { t:'evt', k, c }); log(S, `${EVTS[k].e} ${EVTS[k].n} !`);
}
function eclair(S) { const v = S.monstres.filter(atteint); if (v.length) { const m = v[Math.floor(S.rng() * v.length)]; frappe(S, m, S.f * 25, { perce:true, voit:true }); fx(S, { t:'eclair', id:m.id }); }
  if (S.rng() < .35) { const L = S.cases.map((t, i) => t && !t.puits && !t.rune ? i : -1).filter(i => i >= 0); if (L.length) { const i = L[Math.floor(S.rng() * L.length)]; S.cases[i].surch = 6; fx(S, { t:'surcharge', i }); } } }
function evenements(S) {
  if (S.cadeau) { S.cadeau.t -= PAS; if (S.cadeau.t <= 0) { fx(S, { t:'cadeauPerdu', k:S.cadeau.k }); S.cadeau = null; } }
  if (S.orage > 0) { S.orage -= PAS; S.orageAcc += PAS; if (S.orageAcc >= 1.5) { S.orageAcc = 0; eclair(S); } }
  if (S.defi) { S.defi.t -= PAS; if (S.kills - S.defi.k0 >= S.defi.but) { S.deObjet++; fx(S, { t:'defiOk' }); log(S, '🎯 Défi réussi : un dé de besace !'); S.defi = null; }
    else if (S.defi.t <= 0) { fx(S, { t:'defiRate' }); S.defi = null; } }
  if (S.cadeau || S.orage > 0 || S.defi || grosseEnCours(S) || S.t > S.fin) return;
  S.evtT -= PAS; if (S.evtT <= 0) { lanceEvt(S); S.evtT = 25 + S.rng() * 15; }
}
function toucherCadeau(S) {
  const x = S.cadeau; if (!x || S.fini) return null; S.cadeau = null; const r = { k:x.k };
  if (x.k === 'moustache') { if (S.rng() < .5) { S.energie = Math.min(R.energieMax, S.energie + 10); r.txt = '+10 ◆'; } else { S.deObjet++; r.txt = 'un dé de besace 🎲'; } }
  else if (x.k === 'aigle') { if (S.des.length < R.desMax) { S.des.push({ id:++MID, v:0, or:true }); r.txt = 'un dé d’or 🌟 : il monte n’importe quelle tour'; } else { S.energie = Math.min(R.energieMax, S.energie + 10); r.txt = '+10 ◆ (réserve de dés pleine)'; } }
  else if (x.k === 'etoile') { S.jauge = R.jaugeMax; r.txt = 'ton Ultime est plein !'; }
  else if (x.k === 'destin') { const f = 1 + Math.floor(S.rng() * 6); r.f = f;
    if (f >= 5) { S.effets.destin = 15; r.txt = 'tes tours frappent +40 % pendant 15 s !'; }
    else if (f >= 3) { S.energie = Math.min(R.energieMax, S.energie + 10); r.txt = '+10 ◆'; }
    else { for (let j = 0; j < 3; j++) S.file.push({ t:S.t + 1 + j * .8, m:'gobelin', vague:-1 }); S.file.sort((a, b) => a.t - b.t); r.txt = 'trois gobelins de plus… courage !'; r.mal = true; } }
  log(S, `${EVTS[x.k].e} ${EVTS[x.k].n}${r.f ? ' (' + r.f + ')' : ''} : ${r.txt}`); return r;
}
// 27/11 soir : le SORT du héros posé au doigt (c = chemin 0-4, y = hauteur en cases)
function sort(S, c, y) {
  if (S.fini) return 'Le niveau est fini.'; if (S.sortT > 0) return `Le sort se recharge (${Math.ceil(S.sortT)} s).`;
  c = Math.max(0, Math.min(NC - 1, Math.round(c))); y = Math.max(0.3, Math.min(HAUT, y));
  const h = S.heros, F = S.f * 10, vivants = S.monstres.filter(atteint), pres = (m, r) => Math.hypot(m.c - c, m.y - y) <= r;
  S.sortT = R.sortRecharge; S.sorts++;
  if (h === 'maelle') vivants.filter(m => pres(m, 1.4)).forEach(m => frappe(S, m, F * 1.8, { perce:true }));
  else if (h === 'gorm') vivants.filter(m => m.c === c).forEach(m => { if (!M(m).boss) m.y = Math.min(HAUT, m.y + 1.5); frappe(S, m, F * .9, { perce:true }); });
  else if (h === 'aldric') vivants.filter(m => pres(m, 1.4)).forEach(m => { if (!M(m).boss) m.racine = Math.max(m.racine, 2); frappe(S, m, F * 1.1, { perce:true }); });
  else if (h === 'pip') S.murs.push({ c, y, t:4 });
  else if (h === 'oria') vivants.filter(m => Math.abs(m.c - c) <= 1 && Math.abs(m.y - y) <= 1.6).forEach(m => { for (let k = 0; k < 3; k++) frappe(S, m, F * .45, { perce:true }); });
  else if (h === 'zephine') vivants.filter(m => pres(m, 1.6)).forEach(m => { if (M(m).boss) m.lent = 3; else m.racine = Math.max(m.racine, 3); frappe(S, m, F * 1, { perce:true }); });
  fx(S, { t:'sort', h, c, y }); log(S, `${SORTS_R[h].e} ${SORTS_R[h].n} !`);
}
// 27/11 soir : SPÉCIALISER une tour au niveau 4 (choix définitif)
function specialiser(S, i, k) {
  const t = S.cases[i]; if (!t || t.puits || t.rune) return 'Pas de tour ici.'; if (t.niv < R.nivMax) return 'Il faut une tour au niveau 4.';
  if (t.spe) return 'Cette tour est déjà spécialisée.'; if (k !== 'a' && k !== 'b') return 'Choisis une spécialisation.';
  t.spe = k; S.speFaites++; fx(S, { t:'monte', i }); log(S, `✦ ${nomTour(t)} : ${SPE[t.v][k].n}.`);
}

// 27/11 soir (accord de l'utilisateur) : LA DIFFICULTÉ QUI S'ADAPTE PENDANT LA PARTIE, pour gagner « de justesse », sans écraser ni souffrir.
// Quand une vague est finie (tous ses monstres abattus ou arrivés), on mesure sa pression : PV du rempart perdus, et la hauteur où ses monstres
// sont morts (en cases du rempart). Idéal : 0 à 2 PV perdus et des monstres qui tombent dans les 1-2 dernières cases. S.adapt (vie des monstres
// des vagues suivantes) monte doucement si tout est écrasé loin, descend si le rempart souffre ; bornes 0,8-1,25 (niveau 1 : jamais au-dessus de 1).
// Rien n'est montré au joueur ; une ligne « ⚖ » par vague dans le journal de la partie.
// 27/11 nuit : maxN1 vaut pour les niveaux 1 ET 2 (ils ne durcissent jamais, retour de l'utilisateur battu au niveau 2)
const ADAPT = { min:.8, max:1.6 /* 28/11 : 1,25 → 1,6, l’utilisateur gagnait le niveau 3 sans perdre un PV au plafond */, maxN1:1, monte:.08, monteDoux:.04, baisse:.07, baisseFort:.1 };
// 28/11 : après une grosse vague finie, si la suivante est encore loin, on annonce l'accalmie (le temps de bâtir)
function calme(S, iv) { if (!S.grosses.includes(iv) || iv >= S.nbVagues - 1) return; S.deObjet++; fx(S, { t:'deObjet' }); log(S, '🎲 Un dé pour la besace !');
  // une VRAIE accalmie : la vague suivante attend au moins R.accalmie s après la fin de la grosse vague (on décale toute la suite)
  const dec = Math.max(0, S.t + R.accalmie - S.vT[iv + 1]); if (dec > 0) { S.file.forEach(x => { if (x.vague > iv) x.t += dec; }); S.vT = S.vT.map((t, k) => k > iv ? t + dec : t); S.fin += dec; }
  const dt = Math.round(S.vT[iv + 1] - S.t); if (dt >= 10) { fx(S, { t:'calme', dt }); log(S, `🌿 Accalmie : ${dt} s avant la vague suivante.`); } }
// 28/11 (choix de l'utilisateur) : aussi un dé de besace toutes les 2 petites vagues finies (≈ 5-6 dés par niveau avec les grosses)
function deTous2(S, iv) { if (S.grosses.includes(iv) || iv >= S.nbVagues - 1) return; S.petites = (S.petites || 0) + 1; if (S.petites % 2 === 0) { S.deObjet++; fx(S, { t:'deObjet', petit:true }); log(S, '🎲 Un dé pour la besace !'); } }
function bilanVague(S, iv) {
  const V = S.vStat[iv]; if (V.fait) return; V.fait = true; deTous2(S, iv); if (!S.adaptOn) { calme(S, iv); return; }
  const loin = V.morts.length ? V.morts.reduce((a, y) => a + y, 0) / V.morts.length : 0, avant = S.adapt; let txt;
  if (V.pertes >= 5) { S.adapt -= ADAPT.baisseFort; txt = 'pression forte → monstres moins forts'; }
  else if (V.pertes >= 3) { S.adapt -= ADAPT.baisse; txt = 'pression assez forte → monstres un peu moins forts'; }
  else if (V.pertes === 0 && loin > 3) { S.adapt += ADAPT.monte; txt = 'pression faible → monstres un peu plus forts'; }
  else if (V.pertes === 0 && loin > 2) { S.adapt += ADAPT.monteDoux; txt = 'pression un peu faible → monstres à peine plus forts'; }
  else if (V.pertes > 0 && loin < 1.5) { S.adapt -= ADAPT.monteDoux; txt = 'le rempart souffre un peu → monstres à peine moins forts'; }
  else txt = 'bonne pression → rien ne change';
  S.adapt = Math.max(S.heroique ? 1 : ADAPT.min, Math.min(S.niveau <= 2 ? ADAPT.maxN1 : ADAPT.max, Math.round(S.adapt * 100) / 100));
  const l = `⚖ vague ${iv + 1} : ${txt} (${V.pertes} PV perdus, morts à ${loin.toFixed(1).replace('.', ',')} cases ; ×${avant.toFixed(2).replace('.', ',')} → ×${S.adapt.toFixed(2).replace('.', ',')})`;
  S.adaptLog.push({ v:iv + 1, pertes:V.pertes, loin, adapt:S.adapt }); log(S, l);
  calme(S, iv);
}
const finiVague = (S, m) => { const V = S.vStat[m.vague]; if (!V) return; V.finis++; if (V.finis >= V.n) bilanVague(S, m.vague); };
// 27/11 soir (retour de l'utilisateur : « quasiment jamais de dé flèche ») : un TIRAGE PLUS JUSTE.
// Un dé sur deux sert ce qui est bâti : tiré parmi les sortes des tours qui peuvent encore monter (pondéré par leur nombre) ;
// l'autre vient d'un SAC (chaque sorte du niveau deux fois, mélangé, rempli à nouveau quand il est vide) : pas de longues séries.
function tireDe(S) {
  const montables = S.cases.filter(t => t && t.v && !(t.niv >= R.nivMax && t.et >= R.etoileMax) && S.L.sortes.includes(t.v));
  if (montables.length && S.rng() < .5) return montables[Math.floor(S.rng() * montables.length)].v;
  if (!S.sac || !S.sac.length) { S.sac = S.L.sortes.flatMap(v => [v, v]); for (let k = S.sac.length - 1; k > 0; k--) { const j = Math.floor(S.rng() * (k + 1)); [S.sac[k], S.sac[j]] = [S.sac[j], S.sac[k]]; } }
  return S.sac.pop();
}
// ---------------------------------------------------------------------- le temps qui passe
const M = m => MONSTRES[m.t];
// un chemin défendu = au moins une tour qui tire (pas un puits, pas une Tour-rune)
const defendu = (S, c) => { for (let r = 0; r < NR; r++) { const t = S.cases[ix(c, r)]; if (t && !t.puits && !t.rune) return true; } return false; };
// 27/11 soir : le chemin du prochain monstre est annoncé 5 s avant (pour apprendre)
const ANNONCE_S = 5;
const annonceOn = () => true; // 28/11 (l'utilisateur : « aucune indication au début ») : à tous les niveaux
function annonces(S) { return S.file.filter(x => x.c != null && x.t > S.t).map(x => ({ c:x.c, dt:x.t - S.t, m:x.m.replace('*', '') })); }
function apparait(S, x) {
  const elite = x.m.endsWith('*'), t = elite ? x.m.slice(0, -1) : x.m, B = MONSTRES[t];
  const ad = x.doux ? 1 : B.boss ? Math.max(.9, Math.min(1.1, S.adapt)) : S.adapt; // la difficulté qui s'adapte (le boss : ±10 % au plus)
  const c = x.c != null ? x.c : Math.floor(S.rng() * NC), pv = Math.round(B.pv * (B.boss ? S.fBoss : x.doux ? S.fDoux : S.f) * (elite ? ELITE.pv : 1) * ad);
  const m = { id:++MID, t, c, y:HAUT, pv, pvMax:pv, elite, lent:0, poison:null, racine:0, change:B.boss ? 14 : 0, vague:x.vague, vitX:x.charge ? 2.4 : 1, charge:!!x.charge };
  S.monstres.push(m); fx(S, { t:'arrive', id:m.id });
  // 27/11 soir (l'utilisateur perdait des PV sans comprendre) : un monstre qui descend un chemin SANS tour qui tire est signalé en haut du chemin
  if (!B.boss && !defendu(S, c)) fx(S, { t:'vide', c });
  if (!S.vus[t]) { S.vus[t] = 1; fx(S, { t:'nouveau', m:t }); }
  if (x.vague === S.nbVagues - 1 && !S.grande) { S.grande = true; fx(S, { t:'grande' }); }
  if (B.boss) { fx(S, { t:'boss', m:t }); log(S, `👑 ${B.n} arrive !`); }
}
function mul(S, t, i) {
  let k = 1; const h = S.heros;
  if (h === 'maelle' && (t.v === 4 || t.v === 6)) k *= 1.25;
  if (h === 'zephine' && (t.v === 1 || t.v === 2)) k *= 1.4;
  if (t.echo > 0) k *= 1.3; if (S.effets.cri > 0) k *= 1.5; if (S.effets.destin > 0) k *= 1.4;
  const rn = runesAutour(S, i); rn.forEach(r => { k *= 1 + R.runeBonus * r.rv; });
  if (comboChemin(S, i % NC) === t.v) k *= 1 + R.comboBonus;
  if (t.spe) k *= ({ '1b':1.5, '3b':1.25, '4b':1.7, '5b':1.5, '6a':1.3 })[t.v + t.spe] || 1;
  return k;
}
const runesAutour = (S, i) => voisins(i).map(x => S.cases[x]).filter(t => t && t.rune);
const effetsPaire = (S, i) => new Set(runesAutour(S, i).map(r => r.paire));
// COMBO DE LIGNE : 3 tours de la même sorte sur un chemin
function comboChemin(S, c) { const n = {}; for (let r = 0; r < NR; r++) { const t = S.cases[ix(c, r)]; if (t && t.v) n[t.v] = (n[t.v] || 0) + 1; } const v = Object.keys(n).find(k => n[k] >= 3); return v ? +v : 0; }
// la force du héros (niveau, rang, équipement : forceSuiveuse) rend ses tours plus fortes ; les monstres suivent à 40 % (règle de la maison)
function degat(S, t, i) { return SORTES[t.v].dg * R.niv[t.niv] * (1 + R.etoile * t.et) * mul(S, t, i) * (S.puiss || 1); }
function cadence(S, t, i) { let c = SORTES[t.v].cad; if (t.spe === 'a' && t.v === 3) c /= 1.6; if (t.spe === 'b' && t.v === 4) c *= 1.25; if (S.heros === 'oria' && t.v === 3) c /= 1.12; if (effetsPaire(S, i).has(3)) c /= 1.3; if (S.effets.rapide > 0) c /= 2; if (t.surch > 0) c /= 2; return c; }
// 27/11 soir : le mineur est SOUS TERRE sur 2 cases (en haut des tours) ; le spectre n'est visible que près d'une tour de foudre
const sousTerre = m => M(m).mineur && m.y > 3 && m.y <= 5;
const atteint = m => !m.mort && !sousTerre(m);
function revele(S, m) {
  for (let i = 0; i < S.cases.length; i++) { const t = S.cases[i]; if (!t || t.v !== 5) continue;
    const portee = t.spe === 'b' ? 3 : 2; if (Math.hypot(i % NC - m.c, Math.floor(i / NC) + .5 - m.y) <= portee) return true; }
  return false;
}
const visible = (S, m, v) => atteint(m) && !(M(m).spectre && v !== 5 && !revele(S, m) && Math.floor(S.t) % 2 === 1) && !(M(m).vol && v === 4);
// la cible d'une tour : le monstre de son chemin, au-dessus d'elle, le plus proche du rempart
function cible(S, c, r, v, fort) { let b = null; for (const m of S.monstres) if (m.c === c && m.y > r + 0.5 && m.y <= HAUT && visible(S, m, v) && (!b || (fort ? m.pv > b.pv : m.y < b.y))) b = m; return b; }
function frappe(S, m, dg, o = {}) {
  if (m.mort) return; const B = M(m);
  if (B.armure && !o.perce) dg = Math.max(1, dg - B.armure * (m.elite ? 1.5 : 1));
  if ((m.elite || B.boss) && S.heros === 'aldric') dg *= 1.4;
  if (m.marque > 0) dg *= 1.25; // 28/11 : marqué par les flèches marquantes
  m.pv -= dg; m.touche = 0.25;
  if (m.pv <= 0) meurt(S, m);
}
function meurt(S, m) { m.mort = true; m.mortT = S.t; S.kills++; S.energie += 1;
  if (m.t === 'dore') { for (let j = 0; j < 4; j++) jaillit(S, Math.max(0, Math.min(NC - 1, m.c + (j % 3) - 1)), Math.max(.5, m.y + (j - 1.5) * .6), 3); fx(S, { t:'dore', id:m.id }); log(S, '🪙 Le gobelin doré est abattu : une pluie de ◆ !'); }
  if (m.t === 'chauve' && m.lent > 0) S.tues.chauveLent = (S.tues.chauveLent || 0) + 1; if (m.t === 'troll' && m.poison) S.tues.trollPoison = (S.tues.trollPoison || 0) + 1; if (S.vStat[m.vague]) S.vStat[m.vague].morts.push(m.y); finiVague(S, m);
  if (!M(m).boss && S.rng() < R.cristalChance) jaillit(S, m.c, Math.max(.4, m.y), R.cristalMonstre);
  if (m.poison && m.poison.peste) S.monstres.forEach(x => { if (atteint(x) && x !== m && !M(x).antiPoison && Math.hypot(x.c - m.c, x.y - m.y) <= 1.3) x.poison = { dps:m.poison.dps, t:4, peste:true }; }); S.jauge = Math.min(R.jaugeMax, S.jauge + (M(m).boss ? 4 : m.elite ? 2 : 1)); fx(S, { t:'meurt', id:m.id }); if (M(m).boss) log(S, `💥 ${M(m).n} est tombé !`); }
function tir(S, t, i) {
  const c = i % NC, r = Math.floor(i / NC), sp = t.spe ? t.v + t.spe : '', m = cible(S, c, r, t.v, sp === '6a'); if (!m) return false;
  const S0 = SORTES[t.v], ef = effetsPaire(S, i), dg = degat(S, t, i), perce = S0.perce || ef.has(6) || sp === '2b' || sp === '3b';
  const coup = (x, k) => {
    frappe(S, x, dg * k, { perce });
    if ((t.v === 1 || ef.has(1)) && !M(x).boss) x.lent = S.heros === 'zephine' ? 3 : 2;
    if ((t.v === 2 || ef.has(2)) && !M(x).antiPoison) x.poison = { dps:(S0.poison || 1.5) * R.niv[t.niv] * mul(S, t, i) * (sp === '2b' ? 1.8 : 1), t:4, peste:sp === '2a' };
    if (sp === '4b' && !M(x).boss) x.racine = Math.max(x.racine, .5);
  };
  const n = S0.fleches || 1; for (let k = 0; k < n; k++) coup(m, 1);
  // la lance de glace transperce (le monstre de derrière) ; la baliste traverse tout le chemin
  if (sp === '1b') { const x = S.monstres.filter(x => x !== m && x.c === c && x.y > m.y && visible(S, x, 1)).sort((a, b) => a.y - b.y)[0]; if (x) coup(x, .7); }
  if (sp === '6b') S.monstres.forEach(x => { if (x !== m && x.c === c && x.y > r + .5 && x.y <= HAUT && visible(S, x, 6)) frappe(S, x, dg * .6, { perce:true }); });
  if (t.v === 4 || ef.has(4)) { const large = sp === '4a'; S.monstres.forEach(x => { if (x !== m && Math.abs(x.c - c) <= (large ? 1 : 0) && Math.abs(x.y - m.y) < (large ? 1.5 : 1) && visible(S, x, 4)) frappe(S, x, dg * (large ? .7 : S0.eclats || .5), {}); }); }
  if (t.v === 5 || ef.has(5)) { const vs = [c - 1, c + 1, c].filter(x => x >= 0 && x < NC); let n5 = sp === '5a' ? 3 : 1;
    for (const vc of vs) { if (!n5) break; const x = vc === c ? S.monstres.filter(x => x !== m && x.c === c && visible(S, x, 5)).sort((a, b) => a.y - b.y)[0] : cible(S, vc, -1, 5); if (x && x !== m) { frappe(S, x, dg * (S0.saut || .5), {}); fx(S, { t:'saut', de:m.id, a:x.id }); n5--; } } }
  fx(S, { t:'tir', i, v:t.v, id:m.id });
  return true;
}
function etape(S) {
  if (S.fini) return; S.t = Math.round((S.t + PAS) * 1000) / 1000;
  // l'énergie qui monte seule
  S.eAcc += PAS; if (S.eAcc >= R.regenE) { S.eAcc -= R.regenE; S.energie = Math.min(R.energieMax, S.energie + 1); }
  // les dés : un toutes les 8 s, réserve de 3 (si la réserve est pleine, le dé attend)
  if (S.des.length < R.desMax) { S.deT -= PAS; if (S.deT <= 0) { S.deT = R.deDelai; const v = tireDe(S); S.des.push({ id:++MID, v }); fx(S, { t:'de', v }); } }
  for (const k in S.effets) if (S.effets[k] > 0) S.effets[k] -= PAS;
  evenements(S);
  if (S.sortT > 0) S.sortT -= PAS;
  // les runes ◆ qui flottent : elles s'éteignent après 6 s
  for (const x of S.cristaux) x.t -= PAS;
  // 28/11 (l'utilisateur : « viser une rune ouvre la fiche du monstre ») : une rune pas touchée S'ENVOLE SEULE vers le compteur au bout de 3 s ;
  // la toucher avant rapporte +1 ◆ de bonus (ramasser). Plus aucune rune perdue.
  const parties = S.cristaux.filter(x => x.t <= R.cristalVie - R.cristalAuto); if (parties.length) { S.cristaux = S.cristaux.filter(x => x.t > R.cristalVie - R.cristalAuto);
    parties.forEach(x => { S.energie = Math.min(R.energieMax, S.energie + x.v); S.autoRunes = (S.autoRunes || 0) + 1; fx(S, { t:'vole', id:x.id, v:x.v, c:x.c, y:x.y }); }); }
  for (const w of S.murs) w.t -= PAS; S.murs = S.murs.filter(w => w.t > 0);
  for (const x of S.pieges) x.t -= PAS; S.pieges = S.pieges.filter(x => x.t > 0 && !x.fini);
  for (const x of S.detours) x.t -= PAS; S.detours = S.detours.filter(x => x.t > 0);
  // les annonces de vague : « une énorme vague approche » 5 s avant la dernière
  // 28/11 : chaque GROSSE vague (3e champ « true » dans NIVEAUX) est annoncée 8 s avant ; après elle, une accalmie (voir bilanVague)
  S.grosses.forEach(k => { const tg = S.vT[k]; if (!S.annoncees.includes(k) && S.t >= tg - 8 && S.t < tg + 1) { S.annoncees.push(k); fx(S, { t:'annonce', derniere:k === S.nbVagues - 1, n:S.grosses.indexOf(k) + 1, sur:S.grosses.length }); } });
  // les apparitions (27/11 soir : chemin tiré à l'avance pour les monstres annoncés)
  for (const x of S.file) { if (x.t - S.t > ANNONCE_S) break; if (x.c == null && annonceOn(S, x)) x.c = Math.floor(S.rng() * NC); }
  while (S.file.length && S.file[0].t <= S.t) { const x = S.file.shift(); if (x.vague > S.vagueVue) { S.vagueVue = x.vague; fx(S, { t:'vague', n:x.vague + 1, sur:S.nbVagues }); } apparait(S, x); }
  // les tours
  S.cases.forEach((t, i) => {
    if (!t) return;
    if (t.puits) { t.acc += PAS * (S.heros === 'pip' ? 1.2 : 1); if (t.acc >= R.puitsDelaiC) { t.acc -= R.puitsDelaiC; jaillit(S, i % NC, Math.floor(i / NC) + .5, R.cristalPuits); fx(S, { t:'puits', i }); } return; }
    if (t.rune) return;
    if (t.spe === 'a' && t.v === 1) { const r = Math.floor(i / NC); S.monstres.forEach(m => { if (m.c === i % NC && m.y > r + .5 && m.y < r + 4.5 && atteint(m) && !M(m).boss) m.lent = Math.max(m.lent, .2); }); }
    if (t.echo > 0) t.echo -= PAS; if (t.pw > 0) t.pw -= PAS; if (t.surch > 0) t.surch -= PAS;
    t.cd -= PAS; if (t.cd <= 0) { if (tir(S, t, i)) t.cd = cadence(S, t, i); else t.cd = 0.1; }
  });
  // les monstres
  for (const m of S.monstres) {
    if (m.mort) continue; const B = M(m);
    if (m.poison) { m.pv -= m.poison.dps * PAS; m.poison.t -= PAS; if (m.poison.t <= 0) m.poison = null; if (m.pv <= 0) { meurt(S, m); continue; } }
    else if (B.regen) m.pv = Math.min(m.pvMax, m.pv + B.regen * S.f * PAS);
    if (m.touche > 0) m.touche -= PAS;
    let v = B.vit * (m.vitX || 1); if (m.lent > 0) { m.lent -= PAS; v *= .5; }
    const combo = comboChemin(S, m.c); if (combo === 1 && !B.boss) v *= .65; if (combo === 2 && !B.antiPoison && !m.poison) m.poison = { dps:1 * S.f, t:1 };
    if (m.marque > 0) m.marque -= PAS;
    if (m.racine > 0) { m.racine -= PAS; v = 0; }
    // le chaman soigne ses voisins (sauf s'il est empoisonné)
    if (B.soigneur) { m.soinT = (m.soinT || 0) + PAS; if (m.soinT >= 2.5) { m.soinT = 0; if (!m.poison && atteint(m)) { let n = 0;
      S.monstres.forEach(x => { if (x !== m && atteint(x) && !M(x).boss && x.pv < x.pvMax && Math.hypot(x.c - m.c, x.y - m.y) <= 1.6) { x.pv = Math.min(x.pvMax, x.pv + x.pvMax * .12); n++; } }); if (n) fx(S, { t:'soin', id:m.id }); } } }
    const y0 = m.y; m.y -= v * PAS;
    // le mur de ronces de Pip : arrêté (le boss passe ralenti, le mineur passe dessous)
    // 28/11 : les objets de la besace (pièges, détour)
    if (!sousTerre(m)) for (const x of S.pieges) if (x.c === m.c && !x.fini) {
      if (x.k === 'givre' && y0 >= x.y && m.y < x.y) { x.fini = true; if (B.boss) m.lent = Math.max(m.lent, 4); else m.racine = Math.max(m.racine, 4); m.y = x.y; fx(S, { t:'piege', id:m.id }); }
      else if (x.k === 'epines' && Math.abs(m.y - x.y) <= .6) { if (!(m.pique || (m.pique = [])).includes(x.id)) { m.pique.push(x.id); fx(S, { t:'pique', id:m.id }); } m.lent = Math.max(m.lent, .3); frappe(S, m, S.f * 12 * PAS, { perce:true }); } }
    if (!B.boss && m.y < HAUT - .5) for (const x of S.detours) if (x.c === m.c) m.c = x.v;
    if (!sousTerre(m)) for (const w of S.murs) if (w.c === m.c && y0 >= w.y && m.y < w.y) { if (B.boss) m.y = y0 - v * PAS * .3; else m.y = w.y; frappe(S, m, S.f * 6 * PAS, { perce:true }); }
    if (B.mineur && y0 > 5 && m.y <= 5) fx(S, { t:'creuse', id:m.id }); if (B.mineur && y0 > 3 && m.y <= 3) fx(S, { t:'ressort', id:m.id });
    if (B.boss) {
      m.change -= PAS; if (m.change <= 0 && m.y > 5.5) { m.change = 14; const n = m.c + (S.rng() < .5 ? -1 : 1); m.c = n < 0 ? 1 : n >= NC ? NC - 2 : n; fx(S, { t:'bond', id:m.id }); log(S, `👑 ${B.n} change de chemin.`); }
      // il casse la tour qu'il atteint
      for (let r = NR - 1; r >= 0; r--) { const i = ix(m.c, r); if (S.cases[i] && y0 > r + .5 && m.y <= r + .5) { log(S, `💥 ${B.n} écrase ${nomTour(S.cases[i])}.`); S.cases[i] = null; fx(S, { t:'demolit', i }); } }
    }
    if (m.y <= 0) { m.mort = true; m.mortT = S.t; m.arrive = true; const dg = Math.round(B.dg * (m.elite ? ELITE.dg : 1)); S.rempart -= dg; if (S.vStat[m.vague]) S.vStat[m.vague].pertes += dg; finiVague(S, m);
      S.passes++; S.passe[m.t] = (S.passe[m.t] || 0) + 1; fx(S, { t:'rempart', dg, id:m.id }); log(S, `🧱 ${B.n} frappe le rempart (−${dg}).`); }
  }
  S.monstres = S.monstres.filter(m => !m.mort || S.t - m.mortT < 1);
  if (S.rempart <= 0) { S.rempart = 0; S.fini = 'perdu'; log(S, '💥 Le rempart est tombé.'); }
  else if (!S.file.length && !S.monstres.some(m => !m.mort)) { S.fini = 'gagne'; log(S, '🏆 Le niveau est gagné.'); }
}
// avancer de « sec » secondes
function avance(S, sec) { const n = Math.round(sec / PAS); for (let k = 0; k < n && !S.fini; k++) etape(S); }
const etoiles = S => S.fini !== 'gagne' ? 0 : S.rempart >= S.rempartMax * .75 ? 3 : S.rempart >= S.rempartMax * .45 ? 2 : 1;
const avancement = S => Math.min(1, S.t / (S.fin + 8));
const posVague = (S, k) => Math.min(1, S.vT[k] / (S.fin + 8)); // la place du drapeau de la vague k sur la barre

const API = { EVTS, toucherCadeau, pouvoirPret, OBJETS, lancerObjet, poserObjet, voisinFort, PAS, NC, NR, HAUT, R, SORTES, PUITS, EFFET_PAIRE, POUVOIRS, MONSTRES, ELITE, HEROS_R, NIVEAUX, SORTS_R, SPE, DEFIS,
  nouvelle, batir, deplacer, demolir, rendDemolir, poserDe, poserPaire, jeterDe, bowling, ultime, pouvoir, etape, avance,
  ramasser, monterEnergie, acheterDe, prixMonter, PRIX_DE, appelInfo, appelVague, sort, specialiser, medailles, sousTerre, revele, posVague,
  annonces, defendu, etoiles, avancement, prixDe, nomTour, voisins, comboChemin, runesAutour, degat, cadence, ix };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.REMPART = API;
})(typeof window !== 'undefined' ? window : globalThis);
