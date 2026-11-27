// =============================================================================================== LA DÉFENSE DE LA PORTE · le MOTEUR (13/11)
// Proposition validée le 13/11 (defense-proposition.html, R&D rd-13-11.html) : 3 chemins, 9 cases de remparts (3 × 3), 6 vagues,
// le Titan de feu en boss (s’il atteint la porte, elle tombe), Maëlle et Gorm. La tour garde la FACE du dé et sa force DOUBLE à chaque niveau (1, 2, 4, 8, 16, 32) ;
// deux tours voisines identiques FUSIONNENT (+1) ; deux 6 donnent la RUNE du héros (choix de l'utilisateur).
// Moteur sans dessin (sert à l'écran defense.html et au simulateur outils/simuler-defense.mjs). Utilise donnees.js (HEROS, egaux, suite).
// Chiffres réglés au simulateur : ~/perso/dice-arena/Equilibrage-personnages.md (chapitre « La Défense de la porte »).

// 25/11 : VERSION 3 (defense-v3-proposition.html, choix de l'utilisateur) : chaque face de dé = une SORTE de tour (1 givre, 2 poison, 3 archers,
// 4 canon, 5 foudre, 6 grande tour) ; la force vient du NIVEAU (fusion de deux tours pareilles, ou un dé de sa face posé dessus) ;
// (27/11 : la Rune fusionnée est remplacée par la TOUR-RUNE bâtie avec une paire de dés, voir batirRuneD) ;
// PLUS DE CARTES ; 1 PC tous les 3 monstres abattus ; les relances restent (2 par tour).
const DEF = {
  porte:20, pcDepart:2, pcMax:6, relances:2, jaugeMax:8, pouvoirRecharge:3, chemin:4, nivMax:4, killsPC:3, runeSoutien:0.25, coutRune:2, /* 27/11 : la TOUR-RUNE (paire de dés) : +25 % par niveau à ses voisines, 2 PC */ // le chemin a 4 cases (rangées 0 à 3)
  hpVague:1.7, hpBase:16, /* 27/11 : 3,9 → 3,6 avec les 8 nouveaux monstres, puis 6,5 avec les pouvoirs des tours et l'Ultime qui se recharge, puis 16 avec les Tours-runes (« tout en étoiles » gagnait 98-100 %) (simulateur) */ coutBatir:1, coutDeplace:1, sortieMineur:2, sfPas:.5, /* vagues sans fin : la force monte de 1,7^sfPas par vague après la 6e */ repit:0, runeGorm:15, runeMaelle:0.75, // v2 : bonus de la Rune de Gorm aux voisins (× niveau au-dessus de 6) ; part des dégâts de la Rune de Maëlle sur chaque monstre du chemin // PV des monstres × hpBase × hpVague^(vague) ; bâtir (poser un dé en tour, ou dans une tour) coûte 1 PC
};
// la force d'une tour selon son niveau (1 à 4), avant le multiplicateur de sa sorte
const BASE_NIV = [0, 10, 22, 46, 95];
const SORTES = {
  1:{ n:'Tour de givre', e:'❄', mul:0.6, d:'Gèle sa cible : au prochain pas, elle avance d’une case de moins (les boss ne gèlent pas ; le feu follet, lui, recule d’une case).' },
  2:{ n:'Tour de poison', e:'☠', mul:0.4, poison:0.8, d:'Empoisonne sa cible : le poison la ronge à chaque tour (il traverse l’armure, puis faiblit de moitié). Un monstre empoisonné ne se soigne plus (troll, Colosse) ; le poison ne prend pas sur le golem de pierre.' },
  3:{ n:'Tour d’archers', e:'🏹', mul:0.6, d:'Tire deux flèches, voit les chauves-souris même en première ligne, et vise d’abord le chaman de son chemin.' },
  4:{ n:'Canon', e:'💣', mul:1, eclats:0.5, d:'Touche sa cible et, à moitié, les monstres juste devant et derrière elle, même le mineur sous terre.' },
  5:{ n:'Tour de foudre', e:'⚡', mul:0.9, saut:0.6, d:'L’éclair saute sur le monstre de tête d’un chemin voisin, et voit le spectre même invisible.' },
  6:{ n:'Grande tour', e:'🗼', mul:1.4, perce:true, d:'Le plus gros tir sur un seul monstre ; traverse l’armure.' },
};
const ETOILES_MAX = 5; let ETOILE = 0.35; // 27/11 : étoiles de maîtrise (dé de la même face sur une tour au niveau max : +20 % par étoile, effet renforcé à 5)
// 27/11 (décision de l'utilisateur) : la Rune fusionnée est REMPLACÉE par la TOUR-RUNE, bâtie avec une PAIRE de dés identiques.
// Elle ne tire pas : ses tours voisines tirent +25 % par niveau ET gagnent l'effet de la sorte de sa paire (EFFET_PAIRE) ; au niveau 3, les voisines
// en diagonale aussi. Elle monte d'un niveau avec une autre paire de la même valeur (jamais un dé seul, jamais d'étoiles). Son pouvoir à recharge = POUVOIRS_RUNE.
const NIV_MAX = DEF.nivMax, RUNE_MAX = 3, NOM_RUNE = rv => `Tour-rune niv. ${rv}`;
const EFFET_PAIRE = {
  1:{ e:'❄', n:'givre', d:'elles gèlent aussi leur cible (un pas de moins ; le feu follet recule, les boss ne gèlent pas)' },
  2:{ e:'☠', n:'poison', d:'elles empoisonnent aussi leur cible (sauf le golem de pierre)' },
  3:{ e:'🏹', n:'flèches', d:'elles tirent une fois de plus' },
  4:{ e:'💣', n:'éclats', d:'leurs tirs éclatent sur les monstres juste devant et derrière la cible (moitié de la force, même sous terre)' },
  5:{ e:'⚡', n:'foudre', d:'leur tir saute aussi sur le premier monstre d’un chemin voisin (moitié de la force)' },
  6:{ e:'🗼', n:'perce-armure', d:'leurs tirs traversent l’armure' },
};
const nomTourD = t => t.rune ? `Tour-rune ${(EFFET_PAIRE[t.paire] || EFFET_PAIRE[6]).e} niv. ${t.rv}` : `${SORTES[t.v].n} niv. ${t.niv}`;
const MONSTRES = {
  gobelin:{ n:'Gobelin', e:'👺', pv:5, vit:2, dg:2, d:'Peu de PV, rapide : avance de 2 cases.', ic:['💨'], contre:'Le givre ❄ (il perd un pas), les pièges, n’importe quelle tour : il a peu de vie.', rate:'Rien : il est fragile.' },
  sanglier:{ n:'Sanglier', e:'🐗', pv:16, vit:1, dg:4, d:'Beaucoup de PV, lent.', ic:[], contre:'Le poison ☠ (il ronge longtemps) et la grande tour 🗼.', rate:'Rien de spécial : il encaisse.' },
  bouclier:{ n:'Porte-bouclier', e:'🛡', pv:10, vit:1, dg:3, armure:3, d:'Chaque tir de tour sur lui fait 3 de moins.', ic:['🛡'], contre:'Le poison ☠ et la grande tour 🗼 traversent son bouclier ; le Tir perçant aussi.', rate:'Les petits tirs (archers niveau 1) : 3 de moins à chaque flèche.' },
  chauve:{ n:'Chauve-souris', e:'🦇', pv:6, vit:1, dg:2, vol:true, d:'Vole : la tour de devant de sa colonne ne la voit pas. Passe au-dessus de la boue et des ronces.', ic:['🪽'], contre:'Les archers 🏹 la voient toujours ; les tours de 2e et 3e rangée aussi.', rate:'La tour de devant de son chemin (sauf archers), la boue et les ronces.' },
  // 27/11 (décision de l'utilisateur) : 8 monstres de plus. RÈGLE D'OR : une résistance bloque seulement l'EFFET d'une sorte de tour, jamais le tir ;
  // chaque monstre a au moins une tour qui le contre bien.
  rat:{ n:'Rat', e:'🐀', pv:6, vit:1, dg:2, fuit:true, d:'Quand il est blessé sans tomber, il file sur un chemin voisin (une fois par tour).', ic:['🔀'], contre:'La foudre ⚡ (elle saute sur les chemins voisins), le canon 💣, un gros tir qui l’achève d’un coup.', rate:'Les petits tirs qui le blessent sans le tuer : il change de chemin.' },
  feufollet:{ n:'Feu follet', e:'🔥', pv:6, vit:2, dg:2, nonGel:true, d:'Rapide (2 cases). Il ne gèle pas, mais le givre le fait RECULER d’une case.', ic:['💨', '❄↩'], contre:'La tour de givre ❄ : chaque tir le repousse d’une case.', rate:'Rien ne le ralentit à part le givre (les autres tours le blessent normalement).' },
  mineur:{ n:'Mineur', e:'⛏', pv:9, vit:1, dg:3, sous:true, d:'Il creuse sous terre et ressort à mi-chemin (3e case). Sous terre, aucune tour ne le voit et il passe sous les pièges.', ic:['⛏'], contre:'Les éclats du canon 💣 le touchent même sous terre ; un piège juste après sa sortie ; le givre ❄ quand il ressort.', rate:'Toutes les tours tant qu’il est sous terre (sauf les éclats du canon), et les pièges des deux premières cases.' },
  chaman:{ n:'Chaman', e:'✚', pv:9, vit:1, dg:2, soigne:0.1, d:'À chaque tour, il soigne les autres monstres de son chemin (10 % de leur vie).', ic:['✚'], contre:'Les archers 🏹 le visent en premier sur leur chemin ; la grande tour 🗼.', rate:'Laisser les autres monstres de son chemin à moitié morts : il les remet sur pied.' },
  troll:{ n:'Troll', e:'🧌', pv:15, vit:1, dg:5, regen:0.08, d:'Il reprend 8 % de sa vie à chaque tour… sauf s’il est empoisonné.', ic:['💚'], contre:'Le poison ☠ : tant qu’il est empoisonné, il ne se soigne plus.', rate:'Les petits tirs épars : il les rattrape en se soignant.' },
  spectre:{ n:'Spectre', e:'👻', pv:8, vit:1, dg:3, spectre:true, d:'Invisible un tour sur deux : ce tour-là, tes tours ne le voient pas… sauf la foudre.', ic:['👻'], contre:'La foudre ⚡ (et sa Tempête) le voit toujours.', rate:'Toutes les autres tours, le tour où il est invisible (regarde s’il est pâle).' },
  etendard:{ n:'Porte-étendard', e:'🚩', pv:11, vit:1, dg:3, etendard:true, d:'Les monstres DERRIÈRE lui sur son chemin avancent d’une case de plus.', ic:['🚩'], contre:'La grande tour 🗼 : il est souvent en tête, abats-le vite et les autres ralentissent.', rate:'Le givre ❄ sur ceux qui le suivent : son étendard compense le pas perdu.' },
  golem:{ n:'Golem de pierre', e:'🗿', pv:22, vit:1, lent:2, dg:6, antiPoison:true, d:'Très résistant et lent (avance un tour sur deux). Le poison ne prend pas sur la pierre.', ic:['🐢', '🚫☠'], contre:'La grande tour 🗼 et le canon 💣 (gros tirs), et ton Ultime : il te laisse le temps.', rate:'Le poison ☠ : le tir le touche, mais le poison ne reste pas.' },
  squelette:{ n:'Squelette', e:'💀', pv:6, vit:1, dg:2, invoque:true, d:'Relevé par le Roi des Os.', ic:[], contre:'N’importe quelle tour : il a peu de vie.', rate:'Rien.' },
  // les BOSS : le Titan dans le mode 6 vagues ; en vagues sans fin, un boss différent toutes les 6 vagues
  titan:{ n:'Titan de feu', e:'🌋', pv:1500, /* 27/11 : 1400 → 1150, les vagues d'avant sont plus dures ; puis 1500 avec les Tours-runes */ vit:1, lent:2, dg:99, boss:true, fond:true, d:'Le boss : avance d’une case tous les 2 tours et fait fondre la tour la plus faible de sa colonne (−1 niveau) à chaque tour. S’il touche la porte, elle tombe.', ic:['🔥'], contre:'Toutes tes plus grosses tours sur son chemin, les Runes, ton Ultime. Garde une tour faible devant lui pour qu’il fonde celle-là.', rate:'Le givre, la boue, les reculs : rien ne le ralentit.' },
  colosse:{ n:'Colosse des racines', e:'🌳', pv:1500, vit:1, lent:2, dg:99, boss:true, racines:0.03, d:'Le boss : avance un tour sur deux et ses racines boivent la terre : il reprend 3 % de sa vie à chaque tour, sauf si le poison le ronge.', ic:['💚'], contre:'Le poison ☠ : empoisonné, il ne se soigne plus. Puis tes gros tirs.', rate:'Les dégâts trop lents sans poison : il les efface.' },
  roios:{ n:'Roi des Os', e:'👑', pv:1200, vit:1, lent:2, dg:99, boss:true, releve:2, d:'Le boss : avance un tour sur deux et, un tour sur deux, relève deux squelettes sur les autres chemins.', ic:['💀'], contre:'Des tours sur TOUS les chemins (les squelettes), et tes gros tirs sur le sien.', rate:'Tout miser sur un seul chemin : les squelettes passent ailleurs.' },
  roihiver:{ n:'Roi de l’Hiver', e:'❄', pv:1400, vit:1, lent:2, dg:99, boss:true, blizzard:true, d:'Le boss : avance un tour sur deux ; son blizzard gèle un de tes dés à chaque tour (il ne sert plus qu’à être vendu).', ic:['🧊'], contre:'Les relances pour trouver d’autres dés ; vends le dé gelé (+1 PC).', rate:'Le givre ❄ et les reculs : rien ne le ralentit.' },
};
const BOSS_SF = ['titan', 'colosse', 'roios', 'roihiver']; // l'ordre des boss en vagues sans fin (un toutes les 6 vagues)
// 27/11 : les ÉLITES (dès la vague 3) : cadre doré, ×1,8 PV, frappent la porte 1,5 fois plus fort, et un pouvoir en plus
const ELITE = { pv:1.8, dg:1.5 };
const POUVOIRS_ELITE = {
  armure:{ n:'Armure', e:'🛡', d:'chaque tir de tour sur lui fait 3 de moins (le poison et la grande tour traversent)' },
  regen:{ n:'Régénération', e:'💚', d:'il reprend 8 % de sa vie à chaque tour, sauf s’il est empoisonné' },
  meneur:{ n:'Meneur', e:'💨', d:'les monstres derrière lui sur son chemin avancent d’une case de plus' },
};
// une vague = une liste de tours ; chaque tour = les monstres qui apparaissent en haut (colonne au hasard) ; « * » = une ÉLITE
// 27/11 : un ou deux nouveaux monstres par vague (rat à la 2, feu follet à la 3, mineur et chaman à la 4, troll et spectre à la 5, porte-étendard et golem avec le Titan)
const VAGUES = [
  [['gobelin'], ['gobelin', 'gobelin'], ['gobelin'], ['sanglier']],
  [['gobelin', 'gobelin'], ['sanglier'], ['chauve', 'rat'], ['sanglier', 'rat']],
  [['chauve', 'chauve'], ['bouclier', 'feufollet'], ['sanglier*', 'chauve'], ['bouclier', 'feufollet']],
  [['sanglier', 'mineur'], ['bouclier', 'chaman', 'gobelin'], ['sanglier', 'mineur'], ['chauve', 'rat', 'bouclier*']],
  [['troll', 'bouclier'], ['spectre', 'chauve', 'sanglier'], ['bouclier', 'chaman', 'gobelin'], ['troll', 'spectre', 'chauve*']],
  [['titan', 'gobelin'], ['etendard', 'chauve'], ['golem', 'gobelin'], ['spectre', 'bouclier*']],
];
// 15/11 soir (l'utilisateur : « tu fais des équilibrages généraux, pas individuels ») : LA FICHE DE RÉGLAGE DE CHAQUE HÉROS.
// Tous les chiffres propres à un héros sont ici, réglés UN PAR UN au simulateur (simuler-defense.mjs avec HEROS=… et REG=…), cible ≈ 70 % de victoires.
// Les dégâts des Ultimes sont multipliés par l'échelle des vagues (×1,7 par vague).
const REG = {
  // 27/11 (sans Pouvoir, Ultime au toucher qui se recharge, pouvoirs des tours) : réglé au simulateur, voir Equilibrage-personnages.md
  maelle: { passif:2, acier:4, ultime:60 },                              // passif : +2 aux tours de 5-6 (Acier trempé : +4)
  gorm:   { echo:6, echoBonus:10, ultime:40, ultimeCri:2 },              // echo : bonus aux voisines à chaque fusion
  aldric: { porte:2, porteVague:0, titan:1.4, ultime:10, ultimePorte:2 }, 
  pip:    { ronces:1.5, ultime:12 },
  oria:   { passif:4, eclat:12, ultime:40, pc:2 },                      // eclat : les tirs touchent aussi la tête des autres chemins (puissance ÷ eclat)
  zephine:{ passif:2, ultime:10, ultimeRecul:2 },
};
// les héros de la Défense. 27/11 (décision de l'utilisateur : « on concentre le jeu sur les dés et la gestion des tours ») :
// plus de Pouvoir ni de coups à combinaisons de dés ; l'identité d'un héros = son PASSIF + sa RUNE + son ULTIME.
// L'Ultime se lance d'un toucher quand la jauge est pleine (elle se remplit en abattant des monstres), puis la jauge repart de zéro.
// Les textes lisent la fiche REG (les « N dégâts » sont ensuite mis à la valeur de la vague par texteCoupD).
const DHEROS = {
  maelle:{ get passif() { return `Métal chaud : tes tours de foudre ⚡ et tes grandes tours 🗼 tirent +${REG.maelle.passif}.`; },
    ultime:{ n:'Le Grand Martelage', cible:'monstre', get d() { return `${REG.maelle.ultime} dégâts à un monstre, et toutes tes tours tirent deux fois à la fin du tour.`; } },
    rune:{ n:'Enclume runique', get d() { return `Pouvoir : ${POUVOIRS_RUNE.maelle.n}. ${POUVOIRS_RUNE.maelle.d(1)}`; } } },
  gorm:{ get passif() { return `Écho du cor : chaque fusion ou montée de niveau donne +${REG.gorm.echo} aux tours voisines jusqu’à la fin du tour.`; },
    ultime:{ n:'Le Grand Souffle', get d() { return `${REG.gorm.ultime} dégâts au monstre de tête de chaque chemin, et toutes tes tours tirent +${REG.gorm.ultimeCri} ce tour.`; } },
    rune:{ n:'Grand Cor', get d() { return `Pouvoir : ${POUVOIRS_RUNE.gorm.n}. ${POUVOIRS_RUNE.gorm.d(1)}`; } } },
};
Object.assign(DHEROS, {
  aldric:{ get passif() { return `Rempart béni : la porte a +${REG.aldric.porte} PV${REG.aldric.porteVague ? ` et en reprend ${REG.aldric.porteVague} à chaque vague` : ''} ; tes tours font ×${REG.aldric.titan} aux boss.`; },
    ultime:{ n:'Jugement', get d() { return `${REG.aldric.ultime} dégâts à chaque monstre, et la porte reprend ${REG.aldric.ultimePorte} PV.`; } },
    rune:{ n:'Phare sacré', get d() { return `Pouvoir : ${POUVOIRS_RUNE.aldric.n}. ${POUVOIRS_RUNE.aldric.d(1)}`; } } },
  pip:{ get passif() { return `Ronces vivantes : tes pièges de ronces font ${Math.round((REG.pip.ronces - 1) * 100)} % de plus.`; },
    ultime:{ n:'Forêt vivante', get d() { return `Tous les monstres (sauf les boss) restent sur place un tour, et chacun prend ${REG.pip.ultime} dégâts.`; } },
    rune:{ n:'Arbre-cœur', get d() { return `Pouvoir : ${POUVOIRS_RUNE.pip.n}. ${POUVOIRS_RUNE.pip.d(1)}`; } } },
  oria:{ get passif() { return `Longue-vue : tes tours de la dernière rangée (contre la porte) tirent +${REG.oria.passif}.`; },
    ultime:{ n:'Pluie d’étoiles', cible:'monstre', get d() { return `${REG.oria.ultime} dégâts au premier monstre de deux chemins (celui que tu touches et son voisin), et +${REG.oria.pc} PC.`; } },
    rune:{ n:'Astrolabe', get d() { return `Pouvoir : ${POUVOIRS_RUNE.oria.n}. ${POUVOIRS_RUNE.oria.d(1)}`; } } },
  zephine:{ get passif() { return `Vent glacé : tes tours de givre ❄, de poison ☠ et d’archers 🏹 tirent +${REG.zephine.passif}.`; },
    ultime:{ n:'Tempête de neige', get d() { return `Tous les monstres (sauf les boss) reculent de ${REG.zephine.ultimeRecul} cases et prennent ${REG.zephine.ultime} dégâts.`; } },
    rune:{ n:'Œil du cyclone', get d() { return `Pouvoir : ${POUVOIRS_RUNE.zephine.n}. ${POUVOIRS_RUNE.zephine.d(1)}`; } } },
});
// 27/11 (décision de l'utilisateur, façon Bloons TD 6) : LES POUVOIRS DES TOURS. Une tour à 5 ★ gagne un pouvoir ACTIF propre à sa sorte,
// lancé quand on veut (pendant son tour), puis il se recharge pendant 3 tours. Les cibles suivent les règles de vue de la tour
// (sous terre : seul le Bombardement ; invisible : seule la Tempête) ; règle d'or : une résistance bloque l'EFFET, jamais les dégâts.
// En vagues sans fin, les étoiles au-delà de 5 rendent la tour plus forte (donc le pouvoir aussi) et raccourcissent la recharge (7 ★ : 2 tours, 9 ★ : 1 tour).
const POUVOIRS_T = {
  1:{ n:'Blizzard', e:'❄', mul:1.5, d:'Gèle tout son chemin : chaque monstre prend un tir et reste sur place au prochain tour (les boss ne gèlent pas ; le feu follet recule de 2 cases).' },
  2:{ n:'Nuage toxique', e:'☠', mul:1.5, poison:3, d:'Empoisonne tout son chemin : chaque monstre prend un tir et un poison trois fois plus fort qu’un tir normal (le golem de pierre ne s’empoisonne pas, mais prend le tir).' },
  3:{ n:'Pluie de flèches', e:'🏹', mul:1, fleches:4, d:'Quatre flèches sur chaque monstre de son chemin, chauves-souris comprises.' },
  4:{ n:'Bombardement', e:'💣', mul:3, cible:'case', d:'Tu choisis un point sur n’importe quel chemin : la case, celle de devant et celle de derrière prennent un très gros tir, même le mineur sous terre.' },
  5:{ n:'Tempête', e:'⚡', mul:1.5, d:'La foudre frappe chaque monstre des 3 chemins, même le spectre invisible.' },
  6:{ n:'Tir perçant', e:'🗼', mul:3, d:'Un tir énorme traverse tout son chemin et l’armure : chaque monstre du chemin est touché, boss compris.' },
};
const dgC = (D, n) => Math.round(n * echelleD(D));
// les « N dégâts » d'un Pouvoir ou d'un Ultime, à la valeur de la vague en cours
const texteCoupD = (D, t) => String(t).replace(/(\d+) dégâts/g, (x, n) => `${dgC(D, +n)} dégâts`);

// ---------------------------------------------------------------- la partie
let DID = 0;
function melangeD(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function nouvelleDefense(heros, rng) {
  rng = rng || Math.random;
  const D = { v3:true, heros, rng, porte:DEF.porte, porteMax:DEF.porte, pc:DEF.pcDepart, des:[], relance:0, sortesVues:[], killsPC:0,
    rempart:Array(9).fill(null), monstres:[], vague:0, pas:0, repit:0, tour:0, jauge:0, deplace:false, double:false, cri:0,
    kills:0, sansDegats:0, pouvoirsT:0, ultimes:0, degatsVague:0, log:[], fini:null, fx:[],
    pieges:{}, bonus:{}, choix:null, piegesPoses:0, maxCanons:0, degatsDerniere:0 };
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
  if (D.monstres.some(m => MONSTRES[m.t].blizzard)) { const d = D.des[Math.floor(D.rng() * 5)]; d.gele = true; logD(D, '🧊 Le blizzard du Roi de l’Hiver gèle un de tes dés (il ne sert plus qu’à être vendu).'); }
  logD(D, `— Tour ${D.tour} : ${D.des.map(d => d.v).join(' · ')}`);
}
// cases : index = rangée × 3 + colonne ; rangée 0 = devant (contre le chemin), 2 = contre la porte
const colD = c => c % 3, rangD = c => Math.floor(c / 3);
const voisinsD = c => [c - 3, c + 3, colD(c) > 0 ? c - 1 : -1, colD(c) < 2 ? c + 1 : -1].filter(x => x >= 0 && x < 9);
const libresD = D => D.des.filter(d => !d.pose);
const valsD = ds => ds.map(d => d.v);

// ---------------------------------------------------------------- les actions du joueur (renvoient un message d'erreur, ou rien si c'est fait)
function relancerD(D, ds) { if (D.fini) return 'Partie finie.'; if (!D.relance) return 'Plus de relance ce tour.'; if (!ds.length || ds.some(d => d.pose)) return 'Choisis des dés libres.'; if (ds.some(d => d.gele)) return 'Un dé gelé ne se relance pas : vends-le.'; ds.forEach(d => lanceD(D, d)); D.relance--; logD(D, `Relance : ${D.des.map(d => d.v).join(' · ')}`); }
function poseTour(D, c, v) { D.rempart[c] = { id:++DID, v, niv:1, rune:false, rv:0, tmp:0, bonus:0 }; if (!D.sortesVues.includes(v)) D.sortesVues.push(v); }
// bâtir : un dé sur une case libre = une tour de la sorte de sa face (niveau 1) ; sur une tour de la même sorte : elle monte d'un niveau
function batirD(D, d, c) {
  if (D.fini) return 'Partie finie.'; if (!d || d.pose) return 'Choisis un dé.'; if (d.gele) return 'Ce dé est gelé par le blizzard : il ne sert qu’à être vendu.';
  const t = D.rempart[c];
  if (D.pc < DEF.coutBatir) return `Bâtir coûte ${DEF.coutBatir} PC (vends un dé pour en gagner).`;
  if (t && t.rune) return `Une Tour-rune ne prend jamais un dé seul : pour la monter, choisis une paire de ${t.paire} (deux dés).`;
  if (t && t.v !== d.v) return `Cette ${SORTES[t.v].n.toLowerCase()} monte avec un dé de ${t.v}.`;
  if (t && t.niv >= NIV_MAX && !D.sansFin && (t.et || 0) >= ETOILES_MAX) return `Tour au maximum (${'★'.repeat(ETOILES_MAX)}) : elle ne peut plus monter.`;
  D.pc -= DEF.coutBatir; d.pose = true;
  if (!t) { poseTour(D, c, d.v); logD(D, `${SORTES[d.v].e} ${SORTES[d.v].n} bâtie.`); fxD(D, { t:'batit', c }); return; }
  if (t.niv >= NIV_MAX) { t.et = (t.et || 0) + 1; logD(D, `${SORTES[t.v].e} ${SORTES[t.v].n} : étoile de maîtrise ${'★'.repeat(t.et)}${t.et >= ETOILES_MAX ? ' (effet renforcé !)' : ''}.`); fxD(D, { t:'fusion', c }); echoGorm(D, c); return; }
  t.niv++; logD(D, `${SORTES[t.v].e} ${SORTES[t.v].n} : niveau ${t.niv}.`); fxD(D, { t:'fusion', c }); echoGorm(D, c); return;
}
const echoGorm = (D, c) => { if (D.heros === 'gorm') voisinsD(c).forEach(x => { if (D.rempart[x]) D.rempart[x].tmp += D.bonus.echo ? REG.gorm.echoBonus : REG.gorm.echo; }); };
// fusionner deux tours voisines : même sorte et même niveau → niveau +1 (27/11 : plus de fusion en Rune, voir la Tour-rune)
function fusionD(D, a, b) {
  if (D.fini) return 'Partie finie.';
  const ta = D.rempart[a], tb = D.rempart[b];
  if (!ta || !tb) return 'Il faut deux tours.'; if (!voisinsD(a).includes(b)) return 'Les deux tours doivent se toucher.';
  if (ta.rune || tb.rune) return 'Une Tour-rune ne fusionne pas : elle monte avec une paire de dés de sa valeur.';
  if (ta.v !== tb.v) return 'Il faut deux tours de la même sorte.';
  if (ta.niv >= NIV_MAX && tb.niv >= NIV_MAX) return `Deux tours au niveau ${NIV_MAX} ne fusionnent plus : ajoute-leur des étoiles ★ avec des dés de leur face.`;
  else if (ta.niv !== tb.niv) return 'Il faut deux tours du même niveau.';
  else { tb.niv++; tb.bonus = (tb.bonus || 0) + (ta.bonus || 0); }
  D.rempart[a] = null;
  logD(D, `Fusion : ${nomTourD(tb)}.`); fxD(D, { t:'fusion', c:b });
  echoGorm(D, b);
}
// 27/11 (décision de l'utilisateur) : BÂTIR UNE TOUR-RUNE avec une PAIRE de dés identiques (2 PC) sur une case libre,
// ou la MONTER d'un niveau (3 au plus) avec une autre paire de la même valeur posée dessus.
function batirRuneD(D, ds, c) {
  if (D.fini) return 'Partie finie.';
  if (!ds || ds.length !== 2 || ds.some(d => !d || d.pose)) return 'Choisis deux dés.';
  if (ds.some(d => d.gele)) return 'Un dé gelé par le blizzard ne sert qu’à être vendu.';
  if (ds[0].v !== ds[1].v) return 'Une Tour-rune se bâtit avec une PAIRE : deux dés identiques.';
  const v = ds[0].v, t = D.rempart[c];
  if (t && !t.rune) return 'Une paire se pose sur une case libre (nouvelle Tour-rune) ou sur une Tour-rune de la même valeur.';
  if (t && t.paire !== v) return `Cette Tour-rune monte avec une paire de ${t.paire}.`;
  if (t && t.rv >= RUNE_MAX) return `Cette Tour-rune est au niveau ${RUNE_MAX}, le plus haut.`;
  if (D.pc < DEF.coutRune) return `Une Tour-rune coûte ${DEF.coutRune} PC (vends un dé pour en gagner).`;
  D.pc -= DEF.coutRune; ds.forEach(d => { d.pose = true; }); D.runesBaties = (D.runesBaties || 0) + 1;
  if (!t) { D.rempart[c] = { id:++DID, v:0, niv:0, rune:true, rv:1, paire:v, tmp:0, bonus:0, pretT:0 }; logD(D, `✨ Tour-rune ${EFFET_PAIRE[v].e} bâtie (${DHEROS[D.heros].rune.n}).`); fxD(D, { t:'rune', c }); return; }
  t.rv++; logD(D, `✨ ${nomTourD(t)} !`); fxD(D, { t:'rune', c });
}
// les cases que renforce une Tour-rune : ses 4 voisines ; au niveau 3, aussi les diagonales
const zoneRuneD = (x, rv) => rv >= 3 ? [-4, -3, -2, -1, 1, 2, 3, 4].map(d => x + d).filter(y => y >= 0 && y < 9 && Math.abs(colD(y) - colD(x)) <= 1) : voisinsD(x);
// 27/11 : une vieille partie gardée avec des Runes fusionnées : elles deviennent des Tours-runes de 6 (même niveau)
function migreRunesD(D) { (D.rempart || []).forEach(t => { if (t && t.rune && !t.paire) { t.paire = 6; t.rv = Math.min(RUNE_MAX, t.rv || 1); t.v = 0; t.et = 0; delete t.orig; delete t.enfants; } }); }
// 27/11 (demande de l'utilisateur) : démolir une tour pour libérer sa case (on récupère 1 PC)
function demolirD(D, c) {
  if (D.fini) return 'Partie finie.'; const t = D.rempart[c]; if (!t) return 'Pas de tour ici.';
  D.rempart[c] = null; D.pc += 1; logD(D, `🔨 ${t.rune ? NOM_RUNE(t.rv) : nomTourD(t)} démolie (+1 PC).`); fxD(D, { t:'batit', c });
}
// 27/11 (décision de l'utilisateur) : le 1er déplacement du tour vers une case voisine est gratuit ; sinon, n'importe où sur le rempart pour 1 PC
const coutDeplaceD = (D, a, b) => !D.deplace && voisinsD(a).includes(b) ? 0 : DEF.coutDeplace;
function deplacerD(D, a, b) {
  if (D.fini) return 'Partie finie.';
  if (!D.rempart[a] || D.rempart[b] || a === b) return 'Déplace une tour vers une case libre du rempart.';
  const cout = coutDeplaceD(D, a, b); if (D.pc < cout) return `Ce déplacement coûte ${cout} PC (le seul gratuit : le 1er du tour, vers une case voisine).`;
  D.pc -= cout; D.rempart[b] = D.rempart[a]; D.rempart[a] = null; if (!cout) D.deplace = true; logD(D, `Une tour change de place${cout ? ` (−${cout} PC)` : ''}.`);
}
const armureM = m => (MONSTRES[m.t].armure || 0) + (m.pouv === 'armure' ? 3 : 0);
const dgM = m => m.dg || MONSTRES[m.t].dg;
function blesse(D, m, n, tir, secousse) {
  if (!m || !D.monstres.includes(m) || n <= 0) return 0;
  if (m.sous && !secousse) return 0; // 27/11 : le Mineur sous terre (seuls les éclats du canon l'atteignent)
  const M = MONSTRES[m.t]; const r = Math.max(0, n - (tir ? armureM(m) : 0));
  m.pv -= r; fxD(D, { t:'touche', id:m.id, n:r });
  if (m.pv > 0 && M.fuit && !m.fuite && r > 0) { // 27/11 : le Rat blessé file sur un chemin voisin
    const vs = [m.col - 1, m.col + 1].filter(c => c >= 0 && c <= 2).sort((a, b) => D.monstres.filter(x => x.col === a).length - D.monstres.filter(x => x.col === b).length || D.rng() - .5);
    if (vs.length) { m.col = vs[0]; m.fuite = true; logD(D, `🐀 Le Rat blessé file sur le chemin ${m.col + 1}.`); fxD(D, { t:'fuit', id:m.id }); } }
  if (m.pv <= 0) { D.monstres = D.monstres.filter(x => x !== m); D.kills++; D.jauge = Math.min(DEF.jaugeMax, D.jauge + 1);
    if (++D.killsPC >= DEF.killsPC) { D.killsPC = 0; if (D.pc < DEF.pcMax) { D.pc++; fxD(D, { t:'pc', n:1 }); logD(D, `◆ ${DEF.killsPC} monstres abattus : +1 PC.`); } } logD(D, `${M.e} ${M.n} tombe.`); fxD(D, { t:'mort', id:m.id });
    if (M.boss && D.sansFin) D.pointSauv = m.vagueB || D.vague + 1; // 27/11 : boss vaincu en sans fin = POINT DE SAUVEGARDE (l'écran l'enregistre)
    verifieFinD(D); }
  return r;
}
function utiliseD(D, ds) { ds.forEach(d => { d.pose = true; }); }
// 27/11 : les dés ne servent plus qu'à bâtir, monter, ajouter des étoiles, poser des pièges, VENDRE (et relancer). Plus de Frappe, Technique ni Pouvoir.
function permisD(D, quoi, ds) { if (!ds.length || ds.some(d => d.pose)) return false; return quoi === 'vendre'; }
function agitD(D, quoi, ds) {
  if (D.fini) return 'Partie finie.'; if (!permisD(D, quoi, ds)) return 'Ces dés ne conviennent pas.';
  utiliseD(D, ds); const g = Math.min(DEF.pcMax - D.pc, ds.length); D.pc += g; logD(D, `Vente : +${g} PC.`); fxD(D, { t:'pc', n:g });
}
// ---- L'ULTIME du héros : sans dés, d'un toucher, quand la jauge est pleine (puis elle repart de zéro)
const ultimePretD = D => !D.fini && D.jauge >= DEF.jaugeMax;
function ultimeD(D, k) {
  if (D.fini) return 'Partie finie.';
  if (!ultimePretD(D)) return `La jauge n’est pas pleine : abats encore ${DEF.jaugeMax - D.jauge} monstre${DEF.jaugeMax - D.jauge > 1 ? 's' : ''}.`;
  const H = DHEROS[D.heros];
  if (H.ultime.cible === 'monstre' && !(k && k.m && D.monstres.includes(k.m))) return 'Touche un monstre.';
  if (H.ultime.cible === 'monstre' && k.m.sous) return 'Il est sous terre : on ne peut pas le viser.';
  D.jauge = 0; D.ultimes = (D.ultimes || 0) + 1; logD(D, `⚡ ULTIME : ${H.ultime.n} !`); fxD(D, { t:'ultime', heros:D.heros, n:H.ultime.n });
  const e = echelleD(D), tous = () => [...D.monstres].filter(m => !m.sous), u = n => Math.round(n * e);
  if (D.heros === 'maelle') { blesse(D, k.m, u(REG.maelle.ultime)); D.double = true; }
  else if (D.heros === 'gorm') { [0, 1, 2].forEach(col => { const m = teteD(D, col); if (m) blesse(D, m, u(REG.gorm.ultime)); }); D.cri += REG.gorm.ultimeCri; }
  else if (D.heros === 'aldric') { tous().forEach(m => blesse(D, m, u(REG.aldric.ultime))); D.porte = Math.min(D.porteMax, D.porte + REG.aldric.ultimePorte); }
  else if (D.heros === 'pip') tous().forEach(m => { if (!MONSTRES[m.t].boss) m.colle = Math.max(m.colle || 0, 1); blesse(D, m, u(REG.pip.ultime)); });
  else if (D.heros === 'oria') { const c = k.m.col, cols = [c, c === 2 ? 1 : c + 1]; cols.forEach(cc => { const m = teteD(D, cc); if (m) blesse(D, m, u(REG.oria.ultime)); }); D.pc = Math.min(DEF.pcMax, D.pc + REG.oria.pc); }
  else if (D.heros === 'zephine') tous().forEach(m => { blesse(D, m, u(REG.zephine.ultime)); if (D.monstres.includes(m) && !MONSTRES[m.t].boss) m.row = Math.max(0, m.row - REG.zephine.ultimeRecul); });
}
// ---- LES POUVOIRS DES TOURS (tour à 5 ★)
const rechargeT = (D, t) => Math.max(1, DEF.pouvoirRecharge - Math.floor(Math.max(0, (t.et || 0) - ETOILES_MAX) / 2) - (D.bonus.recharge || 0));
const aPouvoirT = t => !!t && !t.rune && (t.et || 0) >= ETOILES_MAX;
const pouvoirPretT = (D, t) => aPouvoirT(t) && !D.fini && (t.pretT || 0) <= D.tour;
const attenteT = (D, t) => Math.max(0, (t.pretT || 0) - D.tour); // tours avant que le pouvoir soit prêt
// les monstres que touche le pouvoir de la tour de la case c (k = { r, col } pour le Bombardement)
function ciblesPouvoirT(D, c, k) {
  const t = D.rempart[c]; if (!aPouvoirT(t)) return [];
  const col = colD(c), v = t.v;
  if (v === 4) { if (!k || k.r == null || k.col == null) return []; return D.monstres.filter(m => m.col === k.col && Math.abs(m.row - k.r) <= 1); }
  if (v === 5) return D.monstres.filter(m => !m.sous);
  return D.monstres.filter(m => m.col === col && !m.sous && !m.inv);
}
function pouvoirTourD(D, c, k) {
  if (D.fini) return 'Partie finie.';
  const t = D.rempart[c]; if (!aPouvoirT(t)) return `Il faut une tour à ${ETOILES_MAX} ★ pour avoir un pouvoir.`;
  if (!pouvoirPretT(D, t)) return `Le pouvoir se recharge : encore ${attenteT(D, t)} tour${attenteT(D, t) > 1 ? 's' : ''}.`;
  const P = POUVOIRS_T[t.v], S = SORTES[t.v];
  if (P.cible === 'case' && !(k && k.r >= 0 && k.r < DEF.chemin && k.col >= 0 && k.col <= 2)) return 'Touche une case de chemin pour viser.';
  const pw = puissanceTour(D, c, t), cs = ciblesPouvoirT(D, c, k);
  t.pretT = D.tour + rechargeT(D, t); D.pouvoirsT = (D.pouvoirsT || 0) + 1;
  logD(D, `${P.e} ${P.n} (${S.n.toLowerCase()}) : ${cs.length} monstre${cs.length > 1 ? 's' : ''} touché${cs.length > 1 ? 's' : ''}.`);
  fxD(D, { t:'pouvoirT', c, v:t.v, n:P.n, k: k || null });
  const boss = m => MONSTRES[m.t].boss, coup = (m, n, tir) => { if (!D.monstres.includes(m)) return; fxD(D, { t:'tir', c, id:m.id, v:t.v, max5:true }); blesse(D, m, D.heros === 'aldric' && boss(m) ? Math.round(n * REG.aldric.titan) : n, tir, true); };
  cs.forEach(m => {
    const M = MONSTRES[m.t];
    if (t.v === 1) { coup(m, Math.round(pw * P.mul), true); if (D.monstres.includes(m) && !boss(m)) { if (M.nonGel) { m.row = Math.max(0, m.row - 2); fxD(D, { t:'recule', id:m.id }); } else m.colle = Math.max(m.colle || 0, 1); } }
    else if (t.v === 2) { coup(m, Math.round(pw * P.mul), true); if (D.monstres.includes(m)) { if (M.antiPoison) fxD(D, { t:'resiste', id:m.id, e:'🚫☠' }); else { m.poison = (m.poison || 0) + Math.round(pw / S.mul * S.poison * P.poison); m.poisonT = D.tour; } } }
    else if (t.v === 3) { for (let f = 0; f < P.fleches; f++) coup(m, pw, true); }
    else if (t.v === 4) coup(m, Math.round(pw * P.mul), true);
    else if (t.v === 5) coup(m, Math.round(pw * P.mul), true);
    else if (t.v === 6) coup(m, Math.round(pw * P.mul), false);
  });
}
const teteD = (D, col, sauf) => D.monstres.filter(m => m.col === col && m !== sauf && !m.sous).sort((a, b) => b.row - a.row || a.id - b.id)[0];

// 27/11 : LE POUVOIR DE LA TOUR-RUNE, propre au héros, comme les pouvoirs des tours à 5 ★ : lancé quand on veut pendant son tour,
// puis il se recharge pendant 3 tours (un par Tour-rune). Plus fort aux niveaux 2 et 3 (× son niveau). Chiffres réglés au simulateur.
const RUNE_P = { poison:0.8, maelle:{ part:0.5 }, aldric:{ dg:5 }, pip:{ dg:15 }, oria:{ part:0.05, min:4 }, zephine:{ dg:10 }, gorm:{ fanfare:0.3 } };
const POUVOIRS_RUNE = {
  maelle:{ n:'Coup d’enclume', e:'🔨', d:rv => `Ses tours voisines${rv >= 3 ? ' (diagonales comprises)' : ''} tirent tout de suite à ${Math.round(RUNE_P.maelle.part * (1 + .25 * (rv - 1)) * 100)}&nbsp;% de leur force, en plus de leur tir de fin de tour.` },
  gorm:{ n:'Fanfare', e:'📯', d:rv => `Jusqu’à la fin du tour, TOUTES tes tours tirent +${Math.round(rv * RUNE_P.gorm.fanfare * 100)}&nbsp;% (en plus du renfort de leurs Runes voisines).` },
  aldric:{ n:'Lumière du phare', e:'🔆', d:rv => `Un rayon frappe chaque monstre de son chemin (${RUNE_P.aldric.dg * rv} dégâts, ×${REG.aldric.titan} aux boss).` },
  pip:{ n:'Ronces de l’Arbre-cœur', e:'🌿', d:rv => `Des ronces poussent sur les 3 chemins, juste devant le premier monstre : ${RUNE_P.pip.dg * rv} dégâts (+${Math.round((REG.pip.ronces - 1) * 100)}&nbsp;% avec les ronces vivantes).` },
  oria:{ n:'Conjonction', e:'✴', d:rv => `Le premier monstre de chaque chemin prend la force de ses tours voisines réunies (${Math.round(RUNE_P.oria.part * rv * 100)}&nbsp;%, ${RUNE_P.oria.min * rv} dégâts au moins).` },
  zephine:{ n:'Bourrasque', e:'🌪', d:rv => `Le premier monstre de son chemin recule d’une case et prend ${RUNE_P.zephine.dg * rv} dégâts (pas les boss). Un monstre repoussé s’accroche : il ne recule plus pendant ${DEF.pouvoirRecharge} tours.` },
};
const aPouvoirR = t => !!t && !!t.rune;
const pouvoirPretR = (D, t) => aPouvoirR(t) && !D.fini && (t.pretT || 0) <= D.tour;
const attenteR = (D, t) => Math.max(0, (t.pretT || 0) - D.tour);
const rechargeR = D => Math.max(1, DEF.pouvoirRecharge - (D.bonus.recharge || 0));
const voisinesTiresD = (D, c) => zoneRuneD(c, D.rempart[c] ? D.rempart[c].rv : 1).filter(x => D.rempart[x] && !D.rempart[x].rune);
const forceOriaD = (D, c, rv) => Math.max(dgC(D, RUNE_P.oria.min * rv), Math.round(voisinesTiresD(D, c).reduce((a, x) => a + puissanceTour(D, x, D.rempart[x]), 0) * RUNE_P.oria.part * rv));
// le texte du pouvoir de la Rune de la case c, avec les chiffres de la vague en cours
const texteRuneD = (D, c) => { const t = D.rempart[c], P = POUVOIRS_RUNE[D.heros]; let x = P.d(t.rv);
  if (D.heros === 'aldric') x = x.replace(/\((\d+) dégâts/, (z, n) => `(${dgC(D, +n)} dégâts`);
  if (D.heros === 'pip') x = x.replace(/: (\d+) dégâts/, (z, n) => `: ${dgC(D, +n)} dégâts`);
  if (D.heros === 'oria') x += ` Ici : <b>${forceOriaD(D, c, t.rv)} dégâts</b>.`;
  return x; };
// les monstres que touche (ou aide à toucher) le pouvoir de la Rune de la case c
function ciblesPouvoirR(D, c) {
  const t = D.rempart[c]; if (!aPouvoirR(t)) return []; const col = colD(c), vis = D.monstres.filter(m => !m.sous);
  if (D.heros === 'maelle') { const cols = voisinesTiresD(D, c).map(colD); return vis.filter(m => cols.includes(m.col)); }
  if (D.heros === 'gorm') return vis;
  if (D.heros === 'aldric') return vis.filter(m => m.col === col);
  if (D.heros === 'pip') return D.monstres.filter(m => !MONSTRES[m.t].boss && !MONSTRES[m.t].vol);
  if (D.heros === 'oria') return [0, 1, 2].map(x => teteD(D, x)).filter(Boolean);
  if (D.heros === 'zephine') return D.monstres.filter(m => !MONSTRES[m.t].boss && m.col === col && m.row > 0 && !m.sous && !((m.bourT || 0) > D.tour)).sort((a, b) => b.row - a.row).slice(0, 1);
  return [];
}
function pouvoirRuneD(D, c) {
  if (D.fini) return 'Partie finie.';
  const t = D.rempart[c]; if (!aPouvoirR(t)) return 'Il faut une Tour-rune.';
  if (!pouvoirPretR(D, t)) return `Le pouvoir de la Tour-rune se recharge : encore ${attenteR(D, t)} tour${attenteR(D, t) > 1 ? 's' : ''}.`;
  const P = POUVOIRS_RUNE[D.heros], rv = t.rv, col = colD(c), boss = m => MONSTRES[m.t].boss;
  t.pretT = D.tour + rechargeR(D); D.pouvoirsR = (D.pouvoirsR || 0) + 1;
  logD(D, `✨ ${P.e} ${P.n} (${nomTourD(t)}) !`); fxD(D, { t:'pouvoirR', c, heros:D.heros, n:P.n });
  if (D.heros === 'maelle') { D.enclume = RUNE_P.maelle.part * (1 + .25 * (rv - 1)); voisinesTiresD(D, c).forEach(x => tireTourD(D, x)); D.enclume = 0; }
  else if (D.heros === 'gorm') D.fanfare = { tour:D.tour, rv };
  else if (D.heros === 'aldric') { const n = dgC(D, RUNE_P.aldric.dg * rv); D.monstres.filter(m => m.col === col && !m.sous).forEach(m => { fxD(D, { t:'tir', c, id:m.id, v:6, max5:true }); blesse(D, m, boss(m) ? Math.round(n * REG.aldric.titan) : n, false, true); }); }
  else if (D.heros === 'pip') [0, 1, 2].forEach(x => { const tt = D.monstres.filter(m => m.col === x && !boss(m)).sort((a, b) => b.row - a.row)[0];
    for (let r = tt ? tt.row + 1 : 1; r < DEF.chemin; r++) { const k = cleP(r, x); if (D.pieges[k] || D.monstres.some(m => m.row === r && m.col === x)) continue; D.pieges[k] = { k:'ronces', v:0, dg:RUNE_P.pip.dg * rv, usages:1, rune:true }; fxD(D, { t:'piege', r, col:x }); break; } });
  else if (D.heros === 'oria') { const n = forceOriaD(D, c, rv); [0, 1, 2].map(x => teteD(D, x)).filter(Boolean).forEach(m => { fxD(D, { t:'tir', c, id:m.id, v:5, max5:true }); blesse(D, m, n, true); }); }
  else if (D.heros === 'zephine') { const m = ciblesPouvoirR(D, c)[0]; if (m) { m.row = Math.max(0, m.row - 1); m.bourT = D.tour + DEF.pouvoirRecharge; fxD(D, { t:'recule', id:m.id }); if (RUNE_P.zephine.dg) { fxD(D, { t:'tir', c, id:m.id, v:1, max5:true }); blesse(D, m, dgC(D, RUNE_P.zephine.dg * rv), true); } } }
}

// ---------------------------------------------------------------- la fin du tour : les tours tirent, les monstres avancent, la vague continue
function verifieFinD(D) {
  if (D.fini) return;
  if (D.porte <= 0) { D.porte = 0; D.fini = 'perdu'; logD(D, '💥 La porte est tombée…'); return; }
  if (D.sansFin) return;
  if (D.vague >= VAGUES.length && !D.monstres.length) { D.fini = 'gagne'; logD(D, '🏆 La porte a tenu !'); }
}
// les Tours-runes qui renforcent une case (elles ne tirent pas : elles renforcent)
const runesVoisD = (D, c) => D.rempart.filter((u, x) => u && u.rune && x !== c && zoneRuneD(x, u.rv).includes(c));
const soutienRuneD = D => DEF.runeSoutien; // le renfort d’une Tour-rune par niveau (+25 %)
function puissanceTour(D, c, t) {
  if (t.rune) return 0;
  let n = BASE_NIV[t.niv] + (t.bonus || 0) + (t.tmp || 0) + D.cri + (D.bonus.forge || 0);
  if (D.heros === 'maelle' && t.v >= 5) n += D.bonus.acier ? REG.maelle.acier : REG.maelle.passif;
  if (D.heros === 'oria' && rangD(c) === 2) n += REG.oria.passif;
  if (D.heros === 'zephine' && t.v <= 3) n += REG.zephine.passif;
  let mul = SORTES[t.v].mul * (1 + ETOILE * (t.et || 0));
  const rv = runesVoisD(D, c); rv.forEach(u => { mul *= 1 + soutienRuneD(D) * u.rv; });
  if (D.fanfare && D.fanfare.tour === D.tour) mul *= 1 + RUNE_P.gorm.fanfare * D.fanfare.rv; // 27/11 : la Fanfare de la Rune de Gorm (ce tour, toutes les tours)
  return Math.max(1, Math.round(n * mul));
}
// un tir d'une tour sur un monstre, avec l'effet de sa sorte et celui des Runes voisines
function tirSurD(D, c, t, m, pw) {
  const S = SORTES[t.v], M0 = MONSTRES[m.t], boss = M0.boss, col = m.col, row = m.row, max5 = (t.et || 0) >= ETOILES_MAX;
  fxD(D, { t:'tir', c, id:m.id, v:t.v, max5 });
  blesse(D, m, D.heros === 'aldric' && boss ? Math.round(pw * REG.aldric.titan) : pw, !S.perce && !runesVoisD(D, c).some(u => u.paire === 6));
  const vivant = D.monstres.includes(m);
  if (S.poison && vivant) { if (M0.antiPoison) fxD(D, { t:'resiste', id:m.id, e:'🚫☠' }); else { m.poison = (m.poison || 0) + Math.round(pw / S.mul * S.poison * (max5 ? 1.5 : 1)); m.poisonT = D.tour; } }
  if (t.v === 1 && vivant && !boss) { if (M0.nonGel) { if (!m.reculeG) { m.row = Math.max(0, m.row - 1); m.reculeG = true; fxD(D, { t:'recule', id:m.id }); } } else m.gel = Math.max(m.gel || 0, max5 ? 2 : 1); }
  if (S.eclats) D.monstres.filter(x => x !== m && x.col === col && Math.abs(x.row - row) <= 1).forEach(x => blesse(D, x, Math.round(pw * (max5 ? 1 : S.eclats)), true, true));
  if (S.saut) { const os = [col - 1, col + 1].filter(x => x >= 0 && x <= 2).map(x => teteD(D, x)).filter(Boolean).sort((a, b) => b.row - a.row).slice(0, max5 ? 2 : 1); os.forEach(o => { fxD(D, { t:'tir', c, id:o.id, v:5, de:m.id, max5 }); blesse(D, o, Math.round(pw * S.saut), true); }); }
  if (S.perce && max5) { const o = D.monstres.filter(x => x !== m && x.col === col && x.row < row && !x.sous).sort((a, b) => b.row - a.row)[0]; if (o) { fxD(D, { t:'tir', c, id:o.id, v:6, max5 }); blesse(D, o, Math.round(pw * .5), false); } }
  // 27/11 : l'effet de la paire de chaque Tour-rune voisine (règle d'or : une résistance bloque l'EFFET, jamais le tir)
  runesVoisD(D, c).forEach(u => { const p = u.paire, vit = D.monstres.includes(m);
    if (p === 1 && vit && !boss && t.v !== 1) { if (M0.nonGel) { if (!m.reculeG) { m.row = Math.max(0, m.row - 1); m.reculeG = true; fxD(D, { t:'recule', id:m.id }); } } else m.gel = Math.max(m.gel || 0, 1); }
    if (p === 2 && vit) { if (M0.antiPoison) fxD(D, { t:'resiste', id:m.id, e:'🚫☠' }); else { m.poison = (m.poison || 0) + Math.round(pw * RUNE_P.poison); m.poisonT = D.tour; } }
    if (p === 4) D.monstres.filter(x => x !== m && x.col === col && Math.abs(x.row - row) <= 1).forEach(x => blesse(D, x, Math.round(pw * .5), true, true));
    if (p === 5) { const o = [col - 1, col + 1].filter(x => x >= 0 && x <= 2).map(x => teteD(D, x)).filter(Boolean).sort((a, b) => b.row - a.row)[0]; if (o) { fxD(D, { t:'tir', c, id:o.id, v:5, de:m.id }); blesse(D, o, Math.round(pw * .5), true); } }
  });
}
// le tir d'UNE tour (à la fin du tour, ou tout de suite avec le Coup d'enclume de la Rune de Maëlle)
function tireTourD(D, c) {
  const col = colD(c), t = D.rempart[c]; if (!t || t.rune || D.fini) return;
  // la chauve-souris : la tour de devant (la première de la colonne) ne la voit pas, sauf les archers
  const devant = [0, 1, 2].map(rr => rr * 3 + col).find(x => D.rempart[x] && !D.rempart[x].rune);
  // 27/11 : sous terre (Mineur) = personne ne le voit ; le Spectre invisible = seule la foudre le voit ; les archers visent le Chaman d'abord
  const vu = x => x.col === col && !x.sous && !(x.inv && t.v !== 5) && !(MONSTRES[x.t].vol && devant === c && t.v !== 3);
  const cible = () => { const vs = D.monstres.filter(vu); return (t.v === 3 && vs.find(x => MONSTRES[x.t].soigne)) || vs.sort((a, b) => b.row - a.row || a.id - b.id)[0]; };
  const pw = Math.max(1, Math.round(puissanceTour(D, c, t) * (D.enclume || 1)));
  const n = (t.v === 3 ? ((t.et || 0) >= ETOILES_MAX ? 3 : 2) : 1) + runesVoisD(D, c).filter(u => u.paire === 3).length; // 27/11 : une flèche de plus par Tour-rune 🏹
  for (let k = 0; k < n; k++) { const m = cible(); if (!m || D.fini) break; tirSurD(D, c, t, m, pw); }
}
function tirsD(D) {
  D.monstres.forEach(m => { m.recule = false; m.reculeG = false; m.fuite = false; });
  for (let fois = 0; fois < (D.double ? 2 : 1); fois++)
    for (const r of [0, 1, 2]) for (const col of [0, 1, 2]) { if (D.fini) return; tireTourD(D, r * 3 + col); }
  if (D.fini) return;
  // le poison ronge (il traverse l'armure), puis faiblit de moitié
  [...D.monstres].forEach(m => { if (m.poison > 0) { const n = m.poison; m.poison = Math.floor(m.poison / 2); m.poisonT = D.tour; fxD(D, { t:'poison', id:m.id }); blesse(D, m, n, false, true); } });
  if (D.fini) return;
  soinsD(D);
}
// 27/11 : les soins des monstres (Troll, élite qui se régénère, Colosse des racines : bloqués par le poison ; Chaman : soigne son chemin)
function soinsD(D) {
  const soin = (m, n, de) => { n = Math.min(Math.round(n), m.pvMax - m.pv); if (n <= 0) return; m.pv += n; fxD(D, { t:'soin', id:m.id, n, de }); };
  const empoisonne = m => m.poison > 0 || m.poisonT === D.tour;
  D.monstres.forEach(m => { const M = MONSTRES[m.t], r = M.regen || M.racines || (m.pouv === 'regen' ? 0.08 : 0); if (r && !empoisonne(m)) soin(m, m.pvMax * r); });
  D.monstres.filter(m => MONSTRES[m.t].soigne && !m.sous).forEach(ch => D.monstres.filter(x => x !== ch && x.col === ch.col && !MONSTRES[x.t].boss).forEach(x => soin(x, x.pvMax * MONSTRES[ch.t].soigne, ch.id)));
}
// le bonus de vitesse : un Porte-étendard (ou une élite « Meneur ») devant lui sur son chemin
const pressD = (D, m) => D.monstres.some(x => x !== m && x.col === m.col && x.row > m.row && (MONSTRES[x.t].etendard || x.pouv === 'meneur')) ? 1 : 0;
function avanceD(D) {
  const roi = D.monstres.find(m => MONSTRES[m.t].releve);
  if (roi && D.tour % 2 === 0) { [0, 1, 2].filter(c => c !== roi.col).forEach(c => { const pv = Math.round(MONSTRES.squelette.pv * DEF.hpBase * echelleD(D) * (D.fs || 1)); D.monstres.push({ id:++DID, t:'squelette', pv, pvMax:pv, col:c, row:0 }); });
    logD(D, '👑 Le Roi des Os relève deux squelettes.'); fxD(D, { t:'releve' }); }
  for (const m of [...D.monstres]) {
    const M = MONSTRES[m.t];
    if (M.spectre) m.inv = !m.inv; // 27/11 : le Spectre change d'état à chaque tour
    if (M.fond) { // le Titan fait fondre la tour la plus faible de sa colonne
      const poids = t => t.rune ? 10 + t.rv : t.niv;
      const cs = [0, 1, 2].map(r => r * 3 + m.col).filter(c => D.rempart[c]).sort((a, b) => poids(D.rempart[a]) - poids(D.rempart[b]));
      if (cs.length) { const t = D.rempart[cs[0]], nom = nomTourD(t); if (t.rune) t.rv--; else t.niv--; const reste = t.rune ? t.rv : t.niv;
        logD(D, `🌋 Le Titan fait fondre ${nom}${reste ? '' : ' : détruite'}.`); fxD(D, { t:'fond', c:cs[0] }); if (reste <= 0) D.rempart[cs[0]] = null; }
    }
    if (M.lent) { m.attente = (m.attente || 0) + 1; if (m.attente < M.lent) continue; m.attente = 0; }
    if (m.colle > 0) { m.colle--; continue; }
    const vit = M.vit + pressD(D, m) - (m.gel || 0); m.gel = 0; // 25/11 (v3) : la tour de givre retire un pas ; 27/11 : l'étendard en donne un
    for (let pas = 0; pas < vit && D.monstres.includes(m) && m.row < DEF.chemin; pas++) { if (marcheD(D, m)) break; }
    if (D.fini) return;
    if (!D.monstres.includes(m)) continue;
    if (m.row >= DEF.chemin) { const dg = dgM(m); D.monstres = D.monstres.filter(x => x !== m); D.porte -= dg; D.degatsVague += dg; if (D.vague >= VAGUES.length - 1) D.degatsDerniere += dg; logD(D, `🚪 ${M.e} ${M.n} frappe la porte : −${dg} PV.`); fxD(D, { t:'porte', n:dg }); verifieFinD(D); if (D.fini) return; }
  }
}
// 16/11 nuit : LE MODE SANS FIN. 27/11 : après les 6 vagues du mode normal, des vagues tirées dans TOUS les monstres déjà vus
// (plus nombreuses avec le temps), des élites de plus en plus souvent, et un BOSS DIFFÉRENT toutes les 6 vagues (Titan, Colosse, Roi des Os, Roi de l'Hiver…)
const POOL_SF = { gobelin:3, sanglier:3, bouclier:3, chauve:3, rat:2, feufollet:2, mineur:2, chaman:2, troll:2, spectre:2, etendard:1.5, golem:1 };
const bossSF = v => BOSS_SF[Math.floor(v / 6) % BOSS_SF.length];
function vagueSansFin(D) {
  if (!D.vaguesSF) D.vaguesSF = {};
  if (!D.vaguesSF[D.vague]) {
    const v = D.vague, tire = () => { const ks = Object.keys(POOL_SF), tot = ks.reduce((a, k) => a + POOL_SF[k], 0); let x = D.rng() * tot; for (const k of ks) { x -= POOL_SF[k]; if (x < 0) return k; } return ks[0]; };
    const pElite = Math.min(.3, .1 + .015 * (v - 6)), nb = () => 2 + (D.rng() < Math.min(.85, .35 + .04 * (v - 6)) ? 1 : 0) + (v >= 14 && D.rng() < .3 ? 1 : 0);
    const base = [0, 1, 2, 3].map(() => Array.from({ length:nb() }, () => tire() + (D.rng() < pElite ? '*' : '')));
    if ((v + 1) % 6 === 0) base[0] = [bossSF(v), ...base[0].slice(0, 2)];
    D.vaguesSF[v] = base;
  }
  return D.vaguesSF[D.vague];
}
const typeV = x => String(x).replace('*', '');
function apparitionsD(D) {
  if (D.vague >= VAGUES.length && !D.sansFin) return;
  if (D.repit > 0) { D.repit--; return; }
  const V = D.vague < VAGUES.length ? VAGUES[D.vague] : vagueSansFin(D);
  if (D.pas === 0) { const b = V.flat().map(typeV).find(t => MONSTRES[t].boss); logD(D, `🌊 Vague ${D.vague + 1}${D.sansFin ? '' : ` sur ${VAGUES.length}`}${b ? ` : ${MONSTRES[b].n} !` : ''}`); fxD(D, { t:'vague', n:D.vague + 1, boss:b || null }); D.degatsVague = 0; }
  const cols = melangeD([0, 1, 2], D.rng);
  (V[D.pas] || []).forEach((x, i) => { const t = typeV(x), M = MONSTRES[t], elite = String(x).endsWith('*') && !M.boss;
    const pv = M.boss ? Math.round(M.pv * Math.max(1, echelleD(D) / Math.pow(DEF.hpVague, VAGUES.length - 1))) /* 27/11 : en sans fin, le boss grandit comme les autres monstres (avant : il devenait plus faible qu'un sanglier) */ : Math.round(M.pv * DEF.hpBase * Math.pow(DEF.hpVague, D.sansFin && D.vague >= VAGUES.length ? VAGUES.length - 1 + (D.vague - VAGUES.length + 1) * DEF.sfPas : D.vague)); /* le boss a des PV fixes */
    const pvF = Math.round(pv * (D.fs || 1) * (elite ? ELITE.pv : 1)); /* 15/11 soir : × la force du héros */
    const m = { id:++DID, t, pv:pvF, pvMax:pvF, col:cols[i % 3], row:0 };
    if (M.sous) m.sous = true; if (M.boss) m.vagueB = D.vague + 1;
    if (elite) { m.elite = true; m.dg = Math.round(M.dg * ELITE.dg); const ps = Object.keys(POUVOIRS_ELITE).filter(k => !(k === 'regen' && M.regen) && !(k === 'meneur' && M.etendard)); m.pouv = ps[Math.floor(D.rng() * ps.length)]; }
    D.monstres.push(m); });
  D.pas++;
  if (D.pas >= V.length) { if (!D.degatsVague) D.sansDegats++; D.vague++; if (D.heros === 'aldric') D.porte = Math.min(D.porteMax, D.porte + REG.aldric.porteVague); if (typeof guildeEvt === 'function' && D.vague > (D.xpDes || 0)) guildeEvt('defense_vague', 1); /* 27/11 : reparti d'un point de sauvegarde, les vagues déjà récompensées ne redonnent rien */ D.pas = 0; D.repit = DEF.repit; if (D.vague < VAGUES.length || D.sansFin) D.choix = tirageBonus(D); }
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
const echelleD = D => Math.pow(DEF.hpVague, D.sansFin && D.vague >= VAGUES.length ? VAGUES.length - 1 + (D.vague - VAGUES.length + 1) * DEF.sfPas : Math.min(D.vague, VAGUES.length - 1));
// 27/11 : les coups de héros (Frappe, Technique) sont RETIRÉS de la Défense (décision de l'utilisateur).
// ---- 2. Les pièges : un dé posé sur une case de chemin vide (1 PC). 1 = boue (arrête un tour, 2 passages), 2-5 = ronces (valeur × 3), 6 = barricade (fait changer de chemin, 2 coups)
const PIEGES = {
  boue:{ n:'Boue', e:'🟫', d:'Le premier monstre qui marche dedans s’arrête un tour. Tient 2 passages.' },
  ronces:{ n:'Ronces', e:'🌿', d:'Le premier monstre qui passe prend la valeur du dé × 3 (plus fort à chaque vague).' },
  barricade:{ n:'Barricade', e:'🪨', d:'Bloque la case : le monstre part sur le chemin voisin le moins chargé. Tient 2 coups.' },
};
const sortePiege = v => v === 1 ? 'boue' : v === 6 ? 'barricade' : 'ronces';
const cleP = (r, col) => r + ',' + col;
function poserPiegeD(D, d, r, col) {
  if (D.fini) return 'Partie finie.'; if (!d || d.pose) return 'Choisis un dé.'; if (d.gele) return 'Ce dé est gelé par le blizzard : il ne sert qu’à être vendu.';
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
  const M = MONSTRES[m.t], nr = m.row + 1, key = cleP(nr, m.col), p = nr < DEF.chemin && !m.sous ? D.pieges[key] : null;
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
  else if (p && !M.vol && p.k === 'ronces') { const n = Math.round((p.dg != null ? p.dg : p.v * 3 + (D.bonus.ronces || 0)) * echelleD(D) * (D.heros === 'pip' ? REG.pip.ronces : 1)); /* p.dg : les ronces de la Rune de Pip */ usePiege(D, key); m.row = nr; logD(D, `🌿 Les ronces griffent ${M.n} : ${n}.`); fxD(D, { t:'ronces', r:nr, col:m.col }); blesse(D, m, n); return !D.monstres.includes(m); }
  m.row = nr;
  if (m.sous && m.row >= DEF.sortieMineur) { m.sous = false; logD(D, `⛏ Le Mineur sort de terre sur le chemin ${m.col + 1} !`); fxD(D, { t:'surgit', id:m.id }); return true; }
  if (m.row >= DEF.chemin) { const dg = dgM(m); D.monstres = D.monstres.filter(x => x !== m); D.porte -= dg; D.degatsVague += dg; if (D.vague >= VAGUES.length - 1) D.degatsDerniere += dg; logD(D, `🚪 ${M.e} ${M.n} frappe la porte : −${dg >= 99 ? 'tout' : dg} PV.`); fxD(D, { t:'porte', n:dg }); verifieFinD(D); return true; }
  return false;
}
// ---- 1. La prochaine vague : ce qui arrive au prochain tour, et le reste de la vague en cours
function prochainesD(D) {
  if (D.vague >= VAGUES.length && !D.sansFin) return { tour:[], reste:[], vague:VAGUES.length, attente:0 };
  const V = D.vague < VAGUES.length ? VAGUES[D.vague] : vagueSansFin(D);
  return { tour:D.repit > 0 ? [] : (V[D.pas] || []), reste:V.slice(D.repit > 0 ? D.pas : D.pas + 1).flat(), vague:D.vague + 1, attente:D.repit, neuve:D.pas === 0 }; // « * » = une élite (typeV pour le type)
}
// ---- 3. Un bonus entre deux vagues (1 parmi 3)
const BONUS_D = {
  forge:{ e:'🔧', n:'Forge', d:'Tous tes canons tirent +2, pour toute la partie.', f:D => { D.bonus.forge = (D.bonus.forge || 0) + 2; } },
  porte:{ e:'🧱', n:'Maçons', d:'La porte récupère 5 PV.', f:D => { D.porte = Math.min(D.porteMax, D.porte + 5); } },
  pc:{ e:'◆', n:'Trésor', d:'+2 PC tout de suite.', f:D => { D.pc = Math.min(DEF.pcMax, D.pc + 2); } },
  relance:{ e:'🎲', n:'Dés chanceux', d:'Une relance de plus à chaque tour.', f:D => { D.bonus.relance = (D.bonus.relance || 0) + 1; D.relance++; } },
  ronces:{ e:'🌿', n:'Épines', d:'Tes ronces font +3 (plus fort à chaque vague).', f:D => { D.bonus.ronces = (D.bonus.ronces || 0) + 3; } },
  recharge:{ e:'⚙', n:'Mécanismes huilés', d:'Les pouvoirs de tes tours à 5 ★ se rechargent un tour plus vite (1 tour au moins).', f:D => { D.bonus.recharge = (D.bonus.recharge || 0) + 1; } },
  jauge:{ e:'⚡', n:'Élan du héros', d:'Ta jauge d’Ultime se remplit de 3 d’un coup.', f:D => { D.jauge = Math.min(DEF.jaugeMax, D.jauge + 3); } },
  double:{ e:'🏹', n:'Salve', d:'Tous tes canons tirent deux fois au prochain tour.', f:D => { D.bonus.doubleProchain = true; } },
  repit:{ e:'⏳', n:'Répit', d:'La prochaine vague arrive un tour plus tard.', f:D => { D.repit += 1; } },
  boue:{ e:'🟫', n:'Marais', d:'Ta boue tient un passage de plus.', f:D => { D.bonus.boue = (D.bonus.boue || 0) + 1; } },
  acier:{ e:'🔥', n:'Acier trempé', heros:'maelle', d:'Tes canons de 5 et de 6 tirent +4 au lieu de +2.', f:D => { D.bonus.acier = true; } },
  echo:{ e:'📯', n:'Grand écho', heros:'gorm', get d() { return `Chaque fusion donne +${REG.gorm.echoBonus} aux voisins au lieu de +${REG.gorm.echo}.`; }, f:D => { D.bonus.echo = true; } },
};
function tirageBonus(D) {
  const ok = Object.keys(BONUS_D).filter(k => (!BONUS_D[k].heros || BONUS_D[k].heros === D.heros) && !((k === 'acier' || k === 'echo') && D.bonus[k]));
  return melangeD(ok, D.rng).slice(0, 3);
}
function choisirBonusD(D, k) { if (!D.choix || !D.choix.includes(k)) return 'Choisis un des bonus proposés.'; BONUS_D[k].f(D); D.choix = null; logD(D, `${BONUS_D[k].e} Bonus : ${BONUS_D[k].n}.`); }
// ---- 4. Trois étoiles : la victoire, la porte à 15 PV ou plus, le défi du jour (le même pour tout le monde ce jour-là)
const DEFIS_D = [
  { id:'canons4', n:'Gagner avec 4 tours au plus en même temps', ok:D => D.maxCanons <= 4 },
  { id:'sortes', n:'Bâtir au moins 4 sortes de tours différentes', ok:D => (D.sortesVues || []).length >= 4 },
  { id:'pieges', n:'Poser au moins 4 pièges', ok:D => D.piegesPoses >= 4 }, // 25/11 (l'utilisateur : « 3 pièges, impossible d'en avoir 6 »)
  { id:'boss', n:'Aucun dégât à la porte pendant la dernière vague', ok:D => D.degatsDerniere === 0 },
  { id:'pouvoirs', n:'Lancer au moins 3 pouvoirs de tour', ok:D => (D.pouvoirsT || 0) >= 3 },
];
function defiDuJourD(date) { const d = date || new Date(), j = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); return DEFIS_D[j % DEFIS_D.length]; }
function etoilesD(D, date) { if (D.fini !== 'gagne') return [false, false, false]; return [true, D.porte >= 15, defiDuJourD(date).ok(D)]; }
