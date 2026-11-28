// =============================================================================================== LA DESCENTE (15/11 soir, moteur)
// Le « roguelike » de la Crypte aux Sceaux, sur le modèle de Dice & Fold (mécaniques seulement, rien de copié) :
// 3 étages, à chaque étape tu CHOISIS ta prochaine salle (combat, élite, marchand, feu de camp, événement, trésor), puis le boss de l'étage.
// Pièces d'or, OBJETS (permanents pour la descente), COMPAGNONS, DÉS DE COULEUR, monstres à règles, Maître des cryptes ;
// les BRELOQUES gagnées sur les boss restent d'une descente à l'autre ; les PACTES rendent tout plus dur contre plus de points.
// Les combats eux-mêmes sont des cryptes (crypte-moteur.js) en plus petit. Aucun dessin ici : marche aussi dans node.
(function (racine) {
'use strict';
const C = typeof module !== 'undefined' && module.exports ? require('./crypte-moteur.js') : racine.CRYPTE;

const ETAPES = 8, ETAGES = 3;
function RR(R) { return () => { R.rs = (R.rs + 0x6D2B79F5) >>> 0; let t = R.rs; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (h, l) => l[Math.floor(h() * l.length)];
const melange = (h, l) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(h() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ------------------------------------------------------------------ les salles
const SALLES = {
  combat:   { e:'⚔', n:'Combat', d:'Une petite crypte à vider. Des pièces d’or, et une récompense au choix.' },
  elite:    { e:'★', n:'Élite', d:'Plus dur : un monstre d’élite au fond d’une colonne. Récompense : un objet rare au choix.' },
  marchand: { e:'🛒', n:'Marchand', d:'Dépense ton or : objets, compagnon, soins.' },
  feu:      { e:'🔥', n:'Feu de camp', d:'Repose-toi (soin), ou renforce-toi.' },
  evenement:{ e:'❓', n:'Événement', d:'Une rencontre étrange. Un choix à faire.' },
  tresor:   { e:'💰', n:'Trésor', d:'Un coffre. Sans combat.' },
  boss:     { e:'♛', n:'Boss de l’étage', d:'Le gardien de l’étage. Une breloque à la clé.' },
  // 15/11 soir : deux salles rares (débloquées par la renommée)
  enclume:  { e:'⚒', n:'Forge des dés', d:'Renforce une face de tes dés, pour toute la descente.' },
  defi:     { e:'🏅', n:'Salle du défi', d:'Un combat avec une contrainte. Réussi : un gros butin.' },
};
// ------------------------------------------------------------------ LES DÉFIS (15/11 soir) : la contrainte de la salle du défi (tirée sur la carte, visible avant d'y aller)
// ok(R, S) : le défi est-il réussi ? (appelé après une victoire)
const DEFIS = {
  sansbesace: { e:'🎒', n:'Sans besace', d:'Ta besace est fermée pendant ce combat.', ok:() => true },
  tours5:     { e:'⏱', n:'En 5 tours', d:'Gagne avant la fin du 5e tour.', ok:(R, S) => S.tour <= 5 },
  blesse:     { e:'🩹', n:'Sans te faire mal', d:'Ne perds pas plus de 15 PV pendant ce combat.', ok:(R, S) => R.pv - S.pv <= 15 },
  rage:       { e:'😡', n:'Monstres enragés', d:'Tous les monstres frappent 1 de plus.', ok:() => true },
};
// ------------------------------------------------------------------ LES THÈMES D'ÉTAGE (15/11 soir) : chaque étage tire un thème (ses monstres, sa règle, son boss).
// Les identifiants sont ceux des portraits déjà peints (portraits/m-<id>.webp).
const THEMES = {
  cendres: { e:'🔥', n:'Les Cendres', fond:'#3a1a0a',
    betes:[['gobelin', 'Gobelin des cendres'], ['loup', 'Loup de braise'], ['salamandre', 'Salamandre'], ['scarabee', 'Scarabée de braise'], ['golem', 'Golem de scories'], ['bombelave', 'Bombe de lave'], ['brasero', 'Brasero vivant']],
    elites:[['seigneurbraise', 'Seigneur des braises'], ['drake', 'Drake'], ['chefgobelin', 'Chef gobelin']],
    boss:[['titan', 'Le Titan de feu'], ['ignaros', 'Ignaros'], ['phenix', 'Le Phénix']],
    regle:{ e:'🌋', n:'Sol brûlant', d:'Les monstres frappent 1 de plus, mais chaque victoire rapporte 4 or de plus.' } },
  glace:   { e:'❄', n:'La Glace', fond:'#0a2236',
    betes:[['renardneige', 'Renard des neiges'], ['givrelin', 'Givrelin'], ['yeti', 'Yéti'], ['ours', 'Ours des glaces'], ['loupblanc', 'Loup blanc'], ['morse', 'Morse des glaces'], ['golemglace', 'Golem de glace']],
    elites:[['reinefrimas', 'Reine des frimas'], ['mammouth', 'Mammouth']],
    boss:[['vouivre', 'La Vouivre des glaces'], ['hiver', 'Le Cœur de l’Hiver']],
    regle:{ e:'🧊', n:'Grand froid', d:'+6 bouclier au début de chaque combat, mais un monstre sur cinq a le Gel ❄️ (1 dé de moins).' } },
  foret:   { e:'🌲', n:'La Forêt profonde', fond:'#0c2614',
    betes:[['lutin', 'Lutin farceur'], ['harpie', 'Harpie'], ['tisseuse', 'Tisseuse'], ['sangsue', 'Sangsue'], ['rongeur', 'Rongeur des bois'], ['eclaireurs', 'Éclaireurs'], ['meute', 'La Meute']],
    elites:[['chaman', 'Chaman'], ['colosseracines', 'Colosse des racines']],
    boss:[['colosse', 'Le Colosse'], ['hydre', 'L’Hydre']],
    regle:{ e:'🌿', n:'Sève vivante', d:'+5 PV après chaque victoire, mais un monstre sur quatre a Repousse 🌱.' } },
  horloge: { e:'⏰', n:'L’Horlogerie', fond:'#2a2010',
    betes:[['rouagelin', 'Rouagelin'], ['coucou', 'Coucou mécanique'], ['sentinelle', 'Sentinelle'], ['ombretemps', 'Ombre du temps'], ['archiviste', 'Archiviste']],
    elites:[['gardienbronze', 'Gardien de bronze'], ['chevalier', 'Chevalier déchu'], ['heraut', 'Héraut']],
    boss:[['horloger', 'L’Horloger'], ['gardien', 'Le Gardien']],
    regle:{ e:'⏳', n:'Temps compté', d:'+1 relance à chaque tour, mais le Maître des cryptes arrive 2 tours plus tôt.' } },
  neant:   { e:'🌑', n:'Le Néant', fond:'#160a2a',
    betes:[['larve', 'Larve du Vide'], ['oeil', 'Œil du Vide'], ['ombre', 'Ombre'], ['cultiste', 'Cultiste'], ['esprit', 'Esprit errant'], ['pagehurlante', 'Page hurlante'], ['miroir', 'Miroir']],
    elites:[['liche', 'Liche'], ['necro', 'Nécromancien'], ['archonte', 'Archonte']],
    boss:[['roi', 'Le Roi sans visage'], ['colossevide', 'Le Colosse du Vide'], ['devoreur', 'Le Dévoreur']],
    regle:{ e:'🌀', n:'Brume du Vide', d:'Deux fois plus de dés de couleur, mais ta besace a 1 place de moins.' } },
};
// ------------------------------------------------------------------ LA RENOMMÉE (15/11 soir) : gagnée à chaque descente (même perdue), gardée par l'écran (localStorage).
// Chaque palier ajoute des objets, compagnons, salles, événements ou thèmes à la réserve. Ce qui n'est pas dans la liste du palier 0 est verrouillé au début.
// Le palier 3 (250) contient TOUT ce qui existait avant le 15/11 soir : les anciens joueurs y commencent (rien ne leur est retiré).
const PALIERS = [
  { ren:0,   n:'Apprenti des cryptes', obj:['gobelet', 'besace', 'six', 'bourse', 'aube', 'trophee', 'aiguise', 'chaineor', 'talisman'], comp:['moustache', 'braise', 'caillou'],
    ev:['fontaine', 'autel', 'coffre', 'egare', 'joueur', 'forge'], themes:['cendres', 'glace', 'foret', 'horloge'], salles:[] },
  { ren:40,  n:'Explorateur', obj:['sac', 'prisme', 'braise'], comp:['luciole'], salles:['enclume'] },
  { ren:120, n:'Pilleur de tombes', obj:['souffle', 'rune'], comp:['renard'], salles:['defi'] },
  { ren:250, n:'Briseur de sceaux', obj:['entree', 'creusetor', 'diable'], comp:['chouette'], ev:['pont', 'statue', 'bibli', 'mendiant'] },
  { ren:400, n:'Seigneur des profondeurs', obj:['pioche'], themes:['neant'] },
  { ren:600, n:'Légende de la Descente', elite4:true, plus:'Les élites t’offrent 4 objets au choix au lieu de 3.' },
];
const palierDe = ren => { let i = 0; PALIERS.forEach((p, k) => { if (ren >= p.ren) i = k; }); return i; };
// ce qui est ouvert pour cette descente (R.ren absent = tout : anciennes sauvegardes et descente du jour, la même pour tous)
function debloque(R) {
  const tout = R.ren == null, D = { obj:new Set(), comp:new Set(), ev:new Set(), themes:new Set(), salles:new Set(), elite4:false };
  PALIERS.forEach(p => { if (!tout && R.ren < p.ren) return; ['obj', 'comp', 'ev', 'themes', 'salles'].forEach(c => (p[c] || []).forEach(x => D[c].add(x))); if (p.elite4) D.elite4 = true; });
  return D;
}
// la renommée gagnée par une descente finie : 5 par étage atteint, 5 par combat gagné, 20 par boss battu, 30 si victoire ; × la profondeur
function renommeeGagnee(R) {
  const etage = R.fin === 'gagne' ? 3 : R.etage;
  return Math.round((5 * etage + 5 * (R.victoires || 0) + 20 * (R.boss || 0) + (R.fin === 'gagne' ? 30 : 0)) * (1 + .1 * (R.prof || 0)));
}

// ------------------------------------------------------------------ les objets (permanents pour la descente ; les clés sont lues par crypte-moteur.js)
const OBJETS = {
  sac:      { f:'chance', e:'🎲', n:'Sac de dés', d:'+1 dé à chaque tour.', c:'+1 dé / tour', prix:20, rare:true, max:2 },
  gobelet:  { f:'chance', e:'🥤', n:'Gobelet de relance', d:'+1 relance à chaque tour.', c:'+1 relance / tour', prix:14, max:2 },
  besace:   { f:'chance', e:'🎒', n:'Grande besace', d:'+1 place dans ta besace.', c:'+1 place de besace', prix:10, max:2 },
  six:      { f:'garde', e:'6️⃣', n:'Six béni', d:'Chaque 6 posé sur un sceau te donne 1 bouclier.', c:'un 6 posé = +1 🛡', prix:12, max:3 },
  bourse:   { f:'or', e:'👛', n:'Bourse jumelle', d:'Deux dés de même valeur posés dans le même tour : +1 or.', c:'paire posée = +1 🪙', prix:8, max:3 },
  aube:     { f:'garde', e:'🌅', n:'Fiole d’aube', d:'+4 bouclier au début de chaque combat.', c:'+4 🛡 au début du combat', prix:12, max:3 },
  trophee:  { f:'garde', e:'🏆', n:'Trophée de chasse', d:'+3 PV après chaque combat gagné.', c:'+3 PV après chaque victoire', prix:12, max:3 },
  prisme:   { f:'chance', e:'🔮', n:'Prisme', d:'Deux fois plus de dés de couleur.', c:'2× plus de dés de couleur', prix:12, max:2 },
  creusetor:{ f:'runes', e:'🔥', n:'Creuset doré', d:'Creuset plein : en plus de la Rune, +3 or et +3 bouclier.', c:'creuset plein = +3 🪙 +3 🛡', prix:12, max:2 },
  souffle:  { f:'garde', e:'🕯', n:'Dernier souffle', d:'Une fois dans la descente : quand ton héros tombe, il se relève à 10 PV.', c:'se relève à 10 PV (1 fois)', prix:18, rare:true, max:1 },
  entree:   { f:'feu', e:'🗡', n:'Lame d’entrée', d:'Au début de chaque combat, brise 1 sceau sur chaque monstre visible.', c:'1 sceau brisé par monstre au début', prix:16, rare:true, max:1 },
  chaineor: { f:'or', e:'⛓', n:'Chaîne d’or', d:'Chaque chaîne (2 monstres ou plus dans le même tour) : +2 or.', c:'chaîne = +2 🪙', prix:10, max:2 },
  aiguise:  { f:'feu', e:'🪨', n:'Pierre à aiguiser', d:'Tes dés valent +1 sur les sceaux « total ».', c:'+1 sur les « total »', prix:12, max:2 },
  rune:     { f:'runes', e:'✦', n:'Rune de départ', d:'Commence chaque combat avec 1 Rune.', c:'1 Rune au début du combat', prix:16, rare:true, max:2 },
  talisman: { f:'runes', e:'🧿', n:'Talisman', d:'Ton pouvoir commence chaque combat avec 1 sceau déjà brisé.', c:'pouvoir : 1 sceau déjà brisé', prix:14, max:1 },
  diable:   { f:'feu', e:'😈', n:'Marché du diable', d:'+1 dé à chaque tour, mais tous les monstres frappent 1 de plus.', c:'+1 dé, monstres +1 de force', prix:6, max:1 },
  // 15/11 soir : 2 objets de plus (débloqués par la renommée), pour que chaque famille en ait au moins 3
  braise:   { f:'feu', e:'🌋', n:'Braise ardente', d:'Les élites et les boss commencent chaque combat avec 1 sceau déjà brisé.', c:'élites et boss : 1 sceau brisé', prix:14, rare:true, max:1 },
  pioche:   { f:'or', e:'⛏', n:'Pied-de-biche', d:'+2 or après chaque combat gagné, et +8 or dans chaque trésor.', c:'+2 🪙 par victoire, +8 aux trésors', prix:10, max:2 },
};
// ------------------------------------------------------------------ LES FAMILLES D'OBJETS (15/11 soir) : chaque objet a une famille ;
// 2 objets DIFFÉRENTS d'une même famille donnent un petit bonus, 3 un plus gros (les deux s'ajoutent).
const FAMILLES = {
  feu:    { e:'🔥', n:'Feu', coul:'#ff7a4a', d2:'+1 sur les sceaux « total »', d3:'+1 dé à chaque tour' },
  or:     { e:'🪙', n:'Or', coul:'#f3c96b', d2:'+3 or après chaque combat gagné', d3:'tout est 20 % moins cher chez le marchand' },
  garde:  { e:'🛡', n:'Garde', coul:'#7ab8ff', d2:'+3 bouclier au début de chaque combat', d3:'encore +3 bouclier, et +3 PV après chaque victoire' },
  chance: { e:'🍀', n:'Chance', coul:'#7dffb0', d2:'+1 relance à chaque tour', d3:'deux fois plus de dés de couleur' },
  runes:  { e:'✦', n:'Runes', coul:'#c084fc', d2:'ton pouvoir commence chaque combat avec 1 sceau brisé', d3:'+1 Rune au début de chaque combat' },
};
// combien d'objets DIFFÉRENTS de chaque famille tu portes
function familles(R) { const n = {}; Object.keys(FAMILLES).forEach(f => n[f] = 0); Object.keys(R.obj || {}).forEach(k => { if (R.obj[k] > 0 && OBJETS[k] && OBJETS[k].f) n[OBJETS[k].f]++; }); return n; }
// les bonus de famille actifs : [{ f, niv:2|3, d }]
function bonusFamilles(R) { const n = familles(R), l = []; Object.keys(FAMILLES).forEach(f => { if (n[f] >= 2) l.push({ f, niv:2, d:FAMILLES[f].d2 }); if (n[f] >= 3) l.push({ f, niv:3, d:FAMILLES[f].d3 }); }); return l; }
const fam = (R, f, niv) => familles(R)[f] >= niv;
// ------------------------------------------------------------------ les breloques (gagnées sur les boss, gardées entre les descentes ; on en équipe une)
const BRELOQUES = {
  coeur:  { e:'❤', n:'Cœur de braise', d:'Commence avec +10 PV max.' },
  bourse: { e:'🪙', n:'Bourse pleine', d:'Commence avec 20 pièces d’or.' },
  sifflet:{ e:'🐾', n:'Sifflet', d:'Commence avec un compagnon au hasard.' },
  sac:    { e:'🎁', n:'Sac du pèlerin', d:'Commence avec un objet au hasard.' },
  eveil:  { e:'🧿', n:'Pierre d’éveil', d:'Ton pouvoir commence chaque combat avec 1 sceau brisé.' },
  remise: { e:'🏷', n:'Sceau du marchand', d:'Tout est 25 % moins cher chez le marchand.' },
  prisme: { e:'🌈', n:'Éclat de prisme', d:'Deux fois plus de dés de couleur.' },
  rune:   { e:'✦', n:'Rune ancienne', d:'Commence chaque combat avec 1 Rune.' },
};
// ------------------------------------------------------------------ les pactes (au départ, facultatifs : plus dur, plus de points)
const PACTES = {
  sang:  { e:'🩸', n:'Pacte du sang', d:'+25 or au départ, mais tous les monstres frappent 1 de plus.', score:1.3 },
  verre: { e:'🥀', n:'Pacte de verre', d:'+1 dé à chaque tour, mais ton héros n’a que 70 % de sa vie.', score:1.25 },
  nuit:  { e:'🌑', n:'Pacte de la nuit', d:'Trois fois plus de dés de couleur, mais plus aucun feu de camp.', score:1.2 },
};
// ------------------------------------------------------------------ LA PROFONDEUR (15/11 soir) : chaque descente gagnée ouvre un niveau plus dur (comme l'Ascension).
// Les difficultés s'additionnent ; le score est multiplié par 1 + 0,1 × profondeur.
const PROFONDEURS = [
  '', 'Les boss frappent 1 de plus.', 'Le marchand est 20 % plus cher.', 'Ton héros commence avec 5 PV de moins.', 'Le Maître des cryptes arrive 1 tour plus tôt.',
  'Les élites ont 1 sceau de plus.', 'Les monstres lâchent moins d’or.', 'Aux étages 2 et 3, tous les monstres frappent 1 de plus.', 'Plus de +2 PV après une victoire.',
  'Moitié moins de dés de couleur.', 'Les boss ont 2 sceaux de plus.',
];
// ------------------------------------------------------------------ les événements
const EVENEMENTS = {
  fontaine: { e:'⛲', n:'La fontaine aux souhaits', t:'Une fontaine de pierre murmure. On voit des pièces au fond… et elles brillent un peu trop.',
    choix:[{ n:'Boire (+12 PV)', f:R => soin(R, 12) }, { n:'Jeter 5 or : un objet au hasard', si:R => R.or >= 5, f:(R, h) => { R.or -= 5; return donneObjet(R, h); } }, { n:'Passer son chemin', f:() => 'Tu passes. La fontaine soupire.' }] },
  autel:    { e:'🩸', n:'L’autel de sang', t:'Un autel réclame un peu de toi. En échange, il offre quelque chose de précieux.',
    choix:[{ n:'Donner 8 PV : un objet rare', si:R => R.pv > 8, f:(R, h) => { R.pv -= 8; return donneObjet(R, h, true); } }, { n:'Donner 4 PV max : +20 or', si:R => R.pvmax > 30, f:R => { R.pvmax -= 4; R.pv = Math.min(R.pv, R.pvmax); R.or += 20; return '+20 or.'; } }, { n:'Refuser', f:() => 'Tu recules. L’autel s’éteint.' }] },
  coffre:   { e:'🧰', n:'Le coffre piégé', t:'Un coffre, et un mécanisme bizarre. Tu lances un dé : 4 ou plus, il s’ouvre ; sinon, il mord.',
    choix:[{ n:'Lancer le dé', f:(R, h) => { const d = 1 + Math.floor(h() * 6); if (d >= 4) { R.or += 15; return `🎲 ${d} : le coffre s’ouvre, +15 or !`; } R.pv = Math.max(1, R.pv - 6); return `🎲 ${d} : il mord ! −6 PV.`; } }, { n:'Le laisser', f:() => 'Prudence est mère de sûreté.' }] },
  egare:    { e:'🐾', n:'Un compagnon égaré', t:'Une petite créature te suit depuis tout à l’heure. Elle a l’air d’avoir faim, et envie d’aventure.',
    choix:[{ n:'L’adopter', f:(R, h) => donneComp(R, h) }, { n:'Lui donner à manger (−3 or, +8 PV : elle te soigne en remerciement)', si:R => R.or >= 3, f:R => { R.or -= 3; return soin(R, 8); } }, { n:'Continuer seul', f:() => 'Elle te regarde partir. Snif.' }] },
  joueur:   { e:'🎰', n:'Le joueur de dés', t:'Un squelette joue aux dés tout seul. « Une partie ? Double ou rien ! »',
    choix:[{ n:'Miser 10 or (1 chance sur 2 de doubler)', si:R => R.or >= 10, f:(R, h) => { if (h() < .5) { R.or += 10; return 'Gagné : +10 or !'; } R.or -= 10; return 'Perdu : −10 or. Le squelette ricane.'; } }, { n:'Miser 6 PV contre un objet', si:R => R.pv > 6, f:(R, h) => { if (h() < .5) return donneObjet(R, h); R.pv -= 6; return 'Perdu : −6 PV.'; } }, { n:'Non merci', f:() => '« Dommage, je m’ennuie depuis trois siècles. »' }] },
  forge:    { e:'⚒', n:'La forge oubliée', t:'Une enclume encore tiède. De quoi te renforcer un peu.',
    choix:[{ n:'+5 PV max', f:R => { R.pvmax += 5; R.pv += 5; return '+5 PV max.'; } }, { n:'Réparer ton compagnon (vie pleine)', si:R => R.comp, f:R => { R.comp.pv = C.COMPAGNONS[R.comp.id].pv; return 'Ton compagnon est comme neuf.'; } }, { n:'+8 or (tu revends des vieilleries)', f:R => { R.or += 8; return '+8 or.'; } }] },
  // 15/11 soir : 4 événements de plus
  pont:     { e:'🌉', n:'Le pont fragile', t:'Un vieux pont de cordes au-dessus du vide. De l’autre côté, un sac oublié. Tu lances un dé : 3 ou plus, tu passes.',
    choix:[{ n:'Traverser (un dé)', f:(R, h) => { const d = 1 + Math.floor(h() * 6); if (d >= 3) { R.or += 12; return `🎲 ${d} : tu passes ! Le sac contient 12 or.`; } R.pv = Math.max(1, R.pv - 7); return `🎲 ${d} : une planche cède ! −7 PV.`; } }, { n:'Faire le tour (rien ne se passe)', f:() => 'Tu fais le grand tour. Prudent.' }] },
  statue:   { e:'🗿', n:'La statue qui parle', t:'« Donne-moi ce que tu as de plus précieux… ou rien du tout. Je suis une statue, je ne juge pas. »',
    choix:[{ n:'Lui donner un objet au hasard : +10 PV max', si:R => Object.keys(R.obj).some(k => R.obj[k] > 0 && k !== 'pactesang'), f:(R, h) => { const l = Object.keys(R.obj).filter(k => R.obj[k] > 0 && OBJETS[k]); const k = l[Math.floor(h() * l.length)]; R.obj[k]--; R.pvmax += 10; R.pv += 10; return `Tu donnes ${OBJETS[k].n}. +10 PV max.`; } }, { n:'Lui donner 15 or : un objet rare', si:R => R.or >= 15, f:(R, h) => { R.or -= 15; return donneObjet(R, h, true); } }, { n:'Rien du tout', f:() => '« Je ne juge pas. » (Elle juge un peu.)' }] },
  bibli:    { e:'📚', n:'La bibliothèque engloutie', t:'Des livres trempés, mais un grimoire est encore lisible. Il parle de dés et de sceaux.',
    choix:[{ n:'Apprendre le Talisman (ton pouvoir commence chargé d’un sceau)', si:R => !(R.obj.talisman >= 1), f:R => { R.obj.talisman = 1; return '🧿 Talisman appris.'; } }, { n:'Apprendre la Pierre à aiguiser (+1 sur les « total »)', si:R => !(R.obj.aiguise >= 2), f:R => { R.obj.aiguise = (R.obj.aiguise || 0) + 1; return '🪨 Pierre à aiguiser.'; } }, { n:'Revendre le grimoire (+10 or)', f:R => { R.or += 10; return '+10 or.'; } }] },
  mendiant: { e:'🧙', n:'Le vieux mendiant', t:'Un vieillard tend la main. « Une pièce pour un vieux fou ? Je te dirai un secret. »',
    choix:[{ n:'Donner 5 or', si:R => R.or >= 5, f:(R, h) => { R.or -= 5; if (h() < .5) { R.obj.souffle = Math.max(R.obj.souffle || 0, 1); return '« Le secret ? Ne meurs pas. » Il te glisse une bougie : 🕯 Dernier souffle !'; } R.pv = R.pvmax; return '« Le secret ? Bois de l’eau. » Tu te sens mieux : vie pleine.'; } }, { n:'Passer', f:() => '« Radin ! » crie-t-il. Puis il rit tout seul.' }] },
};

// ------------------------------------------------------------------ outils
function soin(R, n) { const a = R.pv; R.pv = Math.min(R.pvmax, R.pv + n); return `+${R.pv - a} PV.`; }
// 15/11 soir : les objets et compagnons tirés au hasard ne viennent que de la réserve débloquée
const objetsOuverts = R => { const D = debloque(R); return Object.keys(OBJETS).filter(k => D.obj.has(k)); };
const compsOuverts = R => { const D = debloque(R); const l = Object.keys(C.COMPAGNONS).filter(k => D.comp.has(k)); return l.length ? l : Object.keys(C.COMPAGNONS); };
// 28/11 (l'utilisateur : « le journal n'est pas complet ») : chaque étape de la descente s'écrit dans R.journal
function log(R, t) { R.journal = R.journal || []; R.journal.push(t); if (R.journal.length > 300) R.journal.shift(); }
function donneObjet(R, h, rare) {
  const liste = objetsOuverts(R).filter(k => (R.obj[k] || 0) < OBJETS[k].max && (!rare || OBJETS[k].rare || h() < .4) && k !== 'diable');
  if (!liste.length) { R.or += 10; return '+10 or (plus rien à donner).'; }
  const k = pick(h, liste); R.obj[k] = (R.obj[k] || 0) + 1; return `${OBJETS[k].e} ${OBJETS[k].n} : ${OBJETS[k].d}`;
}
// 28/11 (l'utilisateur : « j'aimerais pouvoir changer si j'en récupère plusieurs ») : une RÉSERVE de compagnons (2 places) ; un nouveau compagnon
// prend la place active et l'ancien va en réserve ; on les échange quand on veut sur la carte.
function poseComp(R, id) { R.reserve = R.reserve || []; if (R.comp && R.comp.id !== id) { R.reserve = R.reserve.filter(x => x.id !== R.comp.id); R.reserve.unshift(R.comp); R.reserve = R.reserve.slice(0, 2); }
  const deja = R.reserve.find(x => x.id === id); R.reserve = R.reserve.filter(x => x.id !== id); R.comp = deja || { id, pv:C.COMPAGNONS[id].pv }; }
function changerComp(R, i) { const x = (R.reserve || [])[i]; if (!x || R.ecran === 'combat') return null; R.reserve.splice(i, 1); if (R.comp) R.reserve.unshift(R.comp); R.comp = x; log(R, `🐾 ${C.COMPAGNONS[x.id].n} reprend sa place.`); return x; }
function donneComp(R, h) {
  const k = pick(h, compsOuverts(R)); poseComp(R, k); return `${C.COMPAGNONS[k].e} ${C.COMPAGNONS[k].n} te rejoint : ${C.COMPAGNONS[k].d}`;
}
const prix = (R, p) => Math.round(p * 1.4 * (R.breloque === 'remise' ? .75 : 1) * (R.prof >= 2 ? 1.2 : 1) * (fam(R, 'or', 3) ? .8 : 1));
// relancer l'étal du marchand : le prix monte à chaque relance (6, 11, 17… or)
const prixRelance = R => prix(R, 4 + 4 * ((R.salle && R.salle.relances) || 0));
const theme = R => R.themes ? THEMES[R.themes[R.etage - 1]] || null : null;

// ------------------------------------------------------------------ LA FORGE DES DÉS (15/11 soir)
// R.forge = { face: 'plus' | couleur } : quand un dé tombe sur cette face, il vaut 1 de plus (faces 1 à 5), ou il devient un dé de cette couleur.
// crypte-moteur.js ne connaît pas la forge : on « enveloppe » ses fonctions qui tirent de nouveaux dés (fin de tour, relance, pouvoir de Gorm,
// compagnon, consommable) pour transformer les dés neufs juste après. Un dé transformé est marqué (fg) : jamais deux fois. Les dés de la besace (garde) gardent leur valeur.
function forgeDes(S) {
  const F = S && S.forge; if (!F || !S.des) return;
  S.des.forEach(d => { if (d.garde || d.fg) return; d.fg = 1; const q = F[d.v]; if (!q) return; if (q === 'plus') { if (d.v < 6) d.v++; } else if (!d.c && C.COULEURS[q]) d.c = q; });
}
if (!C._forgeDescente) {
  C._forgeDescente = true;
  ['finTour', 'competence', 'conso'].forEach(f => { const o = C[f]; C[f] = function (S) { const r = o.apply(this, arguments); forgeDes(S); return r; }; });
  const rl = C.relancer; C.relancer = function (S) { const r = rl.apply(this, arguments); if (r && S.forge) { S.des.forEach(d => { if (!d.garde) d.fg = 0; }); forgeDes(S); } return r; };
  const pv = C.pouvoir; C.pouvoir = function (S) { const g = S && S.heros === 'gorm', r = pv.apply(this, arguments); if (r && S.forge) { if (g) S.des.forEach(d => { d.fg = 0; }); forgeDes(S); } return r; };
}
const FORGE_CHOIX = ['plus', 'rouge', 'bleu', 'gris', 'orange'];

// ------------------------------------------------------------------ une descente
// bonus : la progression du héros (étoiles, équipement) ; opts : { breloque, pacte }
function nouvelle(heros, graine, bonus = {}, opts = {}) {
  const R = { bene:{}, heros, graine, rs:0, etage:1, pas:0, pvmax:C.PV_HEROS + (bonus.pv || 0), pv:0, or:0, obj:{}, comp:null, bonus,
    breloque:opts.breloque || null, pacte:opts.pacte || null, prof:Math.max(0, Math.min(10, opts.profondeur || 0)), consos:['potion'], ecran:'carte', choix:[], salle:null, S:null, fin:null, score:0, journal:[], combats:0, chemin:[], souffleUtilise:false };
  const h0 = C.rng(graine); R.rs = Math.floor(h0() * 4294967296); const h = RR(R);
  // 15/11 soir : renommée (null = tout ouvert : la descente du jour est la même pour tout le monde), thèmes des 3 étages (tirés par la graine), forge des dés
  R.ren = opts.renommee == null ? null : Math.max(0, opts.renommee); R.forge = {}; R.victoires = 0; R.boss = 0;
  const thOk = Object.keys(THEMES).filter(k => debloque(R).themes.has(k));
  R.themes = melange(h, thOk).slice(0, ETAGES); while (R.themes.length < ETAGES) R.themes.push(pick(h, thOk));
  R.themeBoss = R.themes.map(k => Math.floor(h() * THEMES[k].boss.length));
  if (R.breloque === 'coeur') R.pvmax += 10;
  if (R.pacte === 'verre') { R.pvmax = Math.round(R.pvmax * .7); R.obj.sac = 1; }
  if (R.prof >= 3) R.pvmax -= 5;
  R.pv = R.pvmax;
  if (R.breloque === 'bourse') R.or += 20;
  if (R.pacte === 'sang') R.or += 25;
  if (R.breloque === 'sifflet') donneComp(R, h);
  if (R.breloque === 'sac') donneObjet(R, h);
  tireChoix(R); etapeComp(R); return R;
}
// les 2-3 salles proposées à l'étape suivante
// 15/11 soir (retour de l'utilisateur : « j'ai pu aller au boss sans un seul combat ») : les COMBATS sont obligatoires.
// Un étage = 8 étapes : ⚔ ⚔ (repos) ⚔ ⚔ (repos) ⚔ (repos avant le boss) puis ♛. Aux étapes de combat, on choisit seulement
// combat OU élite (plus dur, meilleure récompense) ; aux étapes de repos, 3 salles au choix sans combat (marchand, feu, événement, trésor).
const PLAN = ['', 'c', 'c', 'r', 'c', 'c', 'r', 'c', 'r'];
// 15/11 soir (l'utilisateur, avec une capture : « la carte, c'est plusieurs chemins avec des élites, combats normaux, magasin… ») :
// UNE VRAIE CARTE À EMBRANCHEMENTS par étage : 8 rangées de 2 à 4 cases, chaque case reliée à 1 ou 2 cases de la rangée suivante ;
// les rangées « c » ne contiennent que des combats (combat ou élite : les combats restent obligatoires), les rangées « r » des haltes ; le boss en haut.
function typeCase(R, p, h) {
  if (PLAN[p] === 'c') return p <= 2 ? (p === 1 || h() < .8 ? 'combat' : 'elite') : h() < .25 ? 'elite' : 'combat';
  const pool = ['marchand', 'feu', 'feu', 'evenement', 'evenement', 'tresor'].filter(x => !(x === 'feu' && R.pacte === 'nuit'));
  const D = debloque(R); if (D.salles.has('enclume')) pool.push('enclume'); if (D.salles.has('defi')) pool.push('defi'); // 15/11 soir : salles rares
  if (p === ETAPES) return R.pacte === 'nuit' ? 'marchand' : h() < .55 ? 'feu' : 'marchand';
  return pick(h, pool);
}
function genCarte(R) {
  const h = RR(R), rows = [];
  for (let p = 1; p <= ETAPES; p++) {
    const n = p === 1 ? 3 : 2 + Math.floor(h() * 3), row = [];
    for (let c = 0; c < n; c++) row.push({ t:typeCase(R, p, h), x:Math.round(100 * ((c + .5) / n + (h() - .5) * .1)) / 100, next:[] });
    // une rangée de combats (après la 1re) a toujours au moins une élite et un combat normal : le choix existe sur la carte
    if (p === ETAPES && n >= 2) { row[0].t = R.pacte === 'nuit' ? 'marchand' : 'feu'; row[1].t = 'marchand'; } // avant le boss : un feu ET un marchand
    if (PLAN[p] === 'c' && p > 1) { if (!row.some(x => x.t === 'elite')) row[Math.floor(h() * n)].t = 'elite'; if (!row.some(x => x.t === 'combat')) row[(row.findIndex(x => x.t === 'elite') + 1) % n].t = 'combat'; }
    row.forEach(x => { if (x.t === 'defi') x.defi = pick(h, Object.keys(DEFIS)); }); // la contrainte du défi se voit avant d'y aller
    rows.push(row);
  }
  for (let r = 0; r < rows.length - 1; r++) {
    const A = rows[r], B = rows[r + 1];
    A.forEach(a => { const tri = B.map((b, k) => [Math.abs(b.x - a.x), k]).sort((u, v) => u[0] - v[0]); a.next = [tri[0][1]]; if (tri[1] && h() < .45) a.next.push(tri[1][1]); });
    B.forEach((b, k) => { if (!A.some(a => a.next.includes(k))) { const a = A.slice().sort((u, v) => Math.abs(u.x - b.x) - Math.abs(v.x - b.x))[0]; a.next.push(k); } });
  }
  R.carte = { etage:R.etage, rows, pos:null, chemin:[] };
}
function tireChoix(R) {
  const p = R.pas + 1;
  if (!R.carte || R.carte.etage !== R.etage) genCarte(R);
  if (p > ETAPES) { R.choix = ['boss']; R.choixIdx = [0]; R.choixDefi = [null]; return; }
  const row = R.carte.rows[p - 1], idx = R.carte.pos == null ? row.map((_, k) => k) : R.carte.rows[p - 2][R.carte.pos].next.slice().sort((a, b) => a - b);
  R.choixIdx = idx; R.choix = idx.map(k => row[k].t); R.choixDefi = idx.map(k => row[k].defi || null);
}
// les réglages du combat (pour CRYPTE.nouvelle)
function optsCombat(R, type) {
  const h = RR(R), e = R.etage;
  const niv = () => e === 1 ? pick(h, [1, 2, 2]) : e === 2 ? pick(h, [2, 2, 3, 3]) : pick(h, [2, 2, 3, 3]);
  let cols;
  if (type === 'boss') cols = null;
  else {
    const n = [0, 4, 5, 6][e] + (type === 'defi' ? 1 : 0); cols = [[], [], []];
    for (let i = 0; i < n; i++) cols[i % 3].push(niv());
    cols.forEach(c => c.sort((a, b) => b - a)); // le plus fort au fond
    if (type === 'elite') cols[Math.floor(h() * 3)].unshift(4);
  }
  const obj = Object.assign({}, R.obj);
  if (R.breloque === 'eveil') obj.talisman = (obj.talisman || 0) + 1;
  if (R.breloque === 'rune') obj.rune = (obj.rune || 0) + 1;
  if (R.breloque === 'prisme') obj.prisme = (obj.prisme || 0) + 1;
  if (R.pacte === 'sang') obj.pactesang = 1;
  if (R.prof >= 1 && type === 'boss') obj.forcePlus = (obj.forcePlus || 0) + 1;
  if (R.prof >= 7 && e >= 2) obj.forcePlus = (obj.forcePlus || 0) + 1;
  if (R.prof >= 5 && type === 'elite') obj.eliteDur = 1;
  if (R.prof >= 6) obj.moinsOr = 1;
  if (R.prof >= 10 && type === 'boss') obj.bossDur = 2;
  Object.entries(R.bene || {}).forEach(([k, n]) => { const B = BENES[k]; if (B && B.o) Object.entries(B.o).forEach(([o, v]) => { obj[o] = (obj[o] || 0) + v * n; }); });
  // 28/11 : plus tu portes d'objets et de bénédictions, plus les monstres frappent (+1 tous les 5) : la descente reste un défi jusqu'au bout
  { const n = Object.values(R.obj || {}).reduce((a, x) => a + (x > 0 ? x : 0), 0) + Object.values(R.bene || {}).reduce((a, x) => a + x, 0); obj.forcePlus = (obj.forcePlus || 0) + Math.floor(n / 5); }
  // 15/11 soir : les bonus de FAMILLE (traduits en clés que crypte-moteur.js sait lire)
  if (fam(R, 'feu', 2)) obj.aiguise = (obj.aiguise || 0) + 1;
  if (fam(R, 'feu', 3)) obj.sac = (obj.sac || 0) + 1;
  if (fam(R, 'chance', 2)) obj.gobelet = (obj.gobelet || 0) + 1;
  if (fam(R, 'chance', 3)) obj.prisme = (obj.prisme || 0) + 1;
  if (fam(R, 'runes', 2)) obj.talisman = (obj.talisman || 0) + 1;
  if (fam(R, 'runes', 3)) obj.rune = (obj.rune || 0) + 1;
  // 15/11 soir : la règle du THÈME de l'étage
  const th = R.themes && R.themes[e - 1];
  let maitre = (type === 'boss' ? 9 : type === 'elite' || type === 'defi' ? 7 : 6) - (R.prof >= 4 ? 1 : 0), couleur = .08 * (R.pacte === 'nuit' ? 3 : 1) * (R.prof >= 9 ? .5 : 1);
  if (th === 'cendres') obj.forcePlus = (obj.forcePlus || 0) + 1;
  if (th === 'horloge') { obj.gobelet = (obj.gobelet || 0) + 1; maitre = Math.max(2, maitre - 2); }
  if (th === 'neant') { couleur *= 2; obj.besace = (obj.besace || 0) - 1; }
  // 15/11 soir : la contrainte de la SALLE DU DÉFI
  const df = type === 'defi' && R.salle && R.salle.defi;
  if (df === 'sansbesace') obj.besace = -C.RESERVE;
  if (df === 'rage') obj.forcePlus = (obj.forcePlus || 0) + 1;
  obj.besace = Math.max(-C.RESERVE, obj.besace || 0); // jamais moins de 0 place (sinon le moteur plante)
  return { cols, gardien:type === 'boss' ? 'seul' : false, etage:e, vies:type === 'boss' ? [0, 2, 3, 3][e] : 1, pv:R.pv, pvmax:R.pvmax, obj, comp:R.comp && R.comp.pv > 0 ? R.comp : null, or:R.or,
    maitre, couleur, secours:!!R.obj.souffle && !R.souffleUtilise, consos:R.consos || [], regle:R.regle || null };
}
// 15/11 soir : ce que crypte-moteur.js ne sait pas faire, ajouté juste après la création du combat : les monstres et le boss du thème,
// le Gel / la Repousse des thèmes, le bouclier de la Garde et de la Glace, la Braise ardente, la forge des dés.
// Règle de sûreté : on ne brise jamais le DERNIER sceau d'une carte (sinon elle resterait bloquée sans tomber).
function prepareCombat(R, S, type) {
  const h = RR(R), k = R.themes && R.themes[R.etage - 1], T = THEMES[k];
  const cartes = []; (S.cols || []).forEach(col => col.forEach(c => { if (!c.special) cartes.push(c); })); // (les cartes spéciales de la Crypte restent telles quelles)
  if (T) {
    cartes.forEach(c => { const [m, nom] = pick(h, c.elite ? T.elites : T.betes); c.m = m; c.nom = nom; });
    if (S.gardien) { const [m, nom] = T.boss[(R.themeBoss && R.themeBoss[R.etage - 1]) || 0] || T.boss[0]; S.gardien.m = m; S.gardien.nom = nom; }
    if (k === 'glace') { S.bouclier += 6; cartes.forEach(c => { if (!c.trait && !c.elite && h() < .2) c.trait = 'gel'; }); }
    if (k === 'foret') cartes.forEach(c => { if (!c.trait && c.niv >= 2 && h() < .25) c.trait = 'repousse'; });
  }
  if (R.bene && R.bene.vapeur) S.bouclier += 2; // (la Vapeur : +4 de l'aube +2 = +6)
  if (fam(R, 'garde', 2)) S.bouclier += 3;
  if (fam(R, 'garde', 3)) S.bouclier += 3;
  const brise1 = c => { const l = c.sceaux.filter(s => !s.ok); if (l.length < 2) return; const s = l[0]; s.ok = true; s.reste = 0; if (!s.val) s.val = s.t === 'ex' ? s.v : 0; };
  if (R.obj.braise) { cartes.filter(c => c.elite).forEach(brise1); if (S.gardien) brise1(S.gardien); }
  if (S.pouvoir && S.pouvoir.length && S.pouvoir.every(s => s.ok)) S.pret = true; // talisman + bonus des Runes : le pouvoir peut être chargé d'avance
  S.forge = Object.assign({}, R.forge || {}); forgeDes(S);
  if (T) S.journal.unshift(`${T.e} ${T.n} · ${T.regle.e} ${T.regle.n}`);
  if (type === 'defi' && DEFIS[R.salle.defi]) S.journal.unshift(`🏅 Défi : ${DEFIS[R.salle.defi].n}. ${DEFIS[R.salle.defi].d}`);
  return S;
}
// choisir la salle k parmi les choix ; pour un combat, R.S est la crypte à jouer (écran de combat de crypte.html)
function choisir(R, k) {
  if (R.fin || R.ecran !== 'carte') return false;
  const t = R.choix[k]; if (!t) return false; const h = RR(R);
  const df = (R.choixDefi && R.choixDefi[k]) || null;
  if (R.carte && t !== 'boss') { R.carte.pos = R.choixIdx[k]; R.carte.chemin.push([R.pas, R.carte.pos]); }
  R.pas++; R.salle = { type:t }; R.chemin.push(t); log(R, `— Étage ${R.etage} · salle ${R.pas} : ${(SALLES[t] && SALLES[t].n) || t} (❤ ${R.pv}/${R.pvmax}, 🪙 ${R.or})`);
  if (t === 'defi') R.salle.defi = df || pick(h, Object.keys(DEFIS));
  if (t === 'combat' || t === 'elite' || t === 'boss' || t === 'defi') { R.ecran = 'combat'; R.S = prepareCombat(R, C.nouvelle(R.heros, R.graine + '-' + R.etage + '-' + R.pas, R.bonus, optsCombat(R, t)), t); return true; }
  if (t === 'marchand') { R.ecran = 'marchand'; R.salle.etal = etal(R, h); R.salle.relances = 0; return true; }
  if (t === 'feu') { R.ecran = 'feu'; return true; }
  if (t === 'enclume') { R.ecran = 'enclume'; return true; }
  if (t === 'evenement') { const D = debloque(R); const l = Object.keys(EVENEMENTS).filter(x => D.ev.has(x)); R.ecran = 'evenement'; R.salle.ev = pick(h, l.length ? l : Object.keys(EVENEMENTS)); return true; }
  if (t === 'tresor') { const or = 6 + 4 * R.etage + Math.floor(h() * 6) + 8 * (R.obj.pioche || 0); R.or += or; R.ecran = 'recompense'; R.salle.texte = `💰 Le coffre contient ${or} pièces d’or.`; R.salle.recomp = h() < .5 ? [{ t:'objet', k:tireObjets(R, h, 1)[0] }].filter(x => x.k) : []; if (!R.salle.recomp.length) R.salle.recomp = [{ t:'or', n:6 }]; return true; }
  return false;
}
function tireObjets(R, h, n, rare) {
  const l = objetsOuverts(R).filter(k => (R.obj[k] || 0) < OBJETS[k].max && (!rare || OBJETS[k].rare || k === 'diable'));
  return melange(h, l).slice(0, n);
}
function etal(R, h) {
  const l = tireObjets(R, h, 4).map(k => ({ t:'objet', k, prix:prix(R, OBJETS[k].prix + 2 * (R.etage - 1)) }));
  if (!R.comp || R.comp.pv <= 0) { const k = pick(h, compsOuverts(R)); l.push({ t:'comp', k, prix:prix(R, 16) }); }
  else if (R.comp.pv < C.COMPAGNONS[R.comp.id].pv) l.push({ t:'reparer', prix:prix(R, 5) });
  melange(h, Object.keys(C.CONSOS)).slice(0, 2).forEach(k => l.push({ t:'conso', k, prix:prix(R, 5) }));
  l.push({ t:'soin', n:12, prix:prix(R, 8) });
  return l;
}
// 15/11 soir : relancer l'étal (nouveaux objets) contre un peu d'or ; le prix monte à chaque fois
function relancerEtal(R) {
  if (R.ecran !== 'marchand') return 'non';
  const p = prixRelance(R); if (R.or < p) return 'Pas assez d’or.';
  R.or -= p; R.salle.relances = (R.salle.relances || 0) + 1; R.salle.etal = etal(R, RR(R)); return 'ok';
}
function acheter(R, i) {
  if (R.ecran !== 'marchand') return 'non';
  const x = R.salle.etal[i]; if (!x || x.vendu) return 'non'; if (R.or < x.prix) return 'Pas assez d’or.';
  R.or -= x.prix; x.vendu = x.t !== 'soin'; log(R, `🛒 Achat : ${x.t === 'objet' ? OBJETS[x.k].n : x.t === 'comp' ? C.COMPAGNONS[x.k].n : x.t} (${x.prix} 🪙)`);
  if (x.t === 'conso') { if ((R.consos || []).length >= 3) { R.or += x.prix; x.vendu = false; return 'Ta poche est pleine (3).'; } R.consos = R.consos || []; R.consos.push(x.k); x.vendu = false; }
  if (x.t === 'objet') R.obj[x.k] = (R.obj[x.k] || 0) + 1;
  if (x.t === 'comp') poseComp(R, x.k);
  if (x.t === 'reparer') R.comp.pv = C.COMPAGNONS[R.comp.id].pv;
  if (x.t === 'soin') soin(R, x.n);
  return 'ok';
}
// 15/11 soir : la forge des dés. face = 1 à 6, quoi = 'plus' (faces 1 à 5) ou une couleur ; une seule amélioration par face ; quoi = null : partir sans rien
function forger(R, face, quoi) {
  if (R.ecran !== 'enclume') return false;
  R.forge = R.forge || {};
  if (quoi != null) {
    if (!(face >= 1 && face <= 6) || R.forge[face] || !FORGE_CHOIX.includes(quoi) || (quoi === 'plus' && face >= 6)) return false;
    R.forge[face] = quoi;
  }
  return suite(R);
}
// le feu de camp : 0 = se reposer (30 % de la vie), 1 = s'entraîner (+4 PV max), 2 = soigner le compagnon (ou le ramener)
function feu(R, k) {
  if (R.ecran !== 'feu') return false;
  if (k === 0) soin(R, Math.round(R.pvmax * .3));
  if (k === 1) { R.pvmax += 4; R.pv += 4; }
  if (k === 2) { if (!R.comp) return false; R.comp.pv = C.COMPAGNONS[R.comp.id].pv; }
  return suite(R);
}
function evenement(R, k) {
  if (R.ecran !== 'evenement') return null;
  const E = EVENEMENTS[R.salle.ev], c = E.choix[k]; if (!c || (c.si && !c.si(R))) return null;
  const t = c.f(R, RR(R)) || ''; log(R, `${E.e} ${E.n} → ${c.n} : ${t}`); R.ecran = 'recompense'; R.salle.texte = `${E.e} ${t}`; R.salle.recomp = []; return t;
}
// fin d'un combat (R.S.fin posé) : on reprend la vie, l'or, le compagnon ; puis la récompense
function apresCombat(R) {
  const S = R.S; if (!S || !S.fin) return false;
  R.or = S.or; R.combats++; R.score += S.score; if (S.consos) R.consos = S.consos.slice();
  if (S.secoursUtilise) R.souffleUtilise = true;
  if (R.comp && S.comp) R.comp.pv = S.comp.pv;
  log(R, `⚔ Combat ${S.fin === 'gagne' ? 'gagné' : 'perdu'} en ${S.tour || '?'} tours · ❤ ${S.pv} · 🛡 restant ${S.bouclier || 0}${S.comp ? ` · compagnon ❤ ${S.comp.pv}` : ''}`);
  if (S.fin === 'perdu') { R.pv = 0; R.fin = 'perdu'; R.ecran = 'fin'; R.S = null; return true; }
  const h = RR(R), t = R.salle.type, th = R.themes && R.themes[R.etage - 1];
  R.victoires = (R.victoires || 0) + 1; if (t === 'boss') R.boss = (R.boss || 0) + 1; R.beneDue = true;
  const pvAvant = R.pv; // (pour le défi « sans te faire mal »)
  // 15/11 soir : bonus après une victoire (familles Or et Garde, Pied-de-biche, thèmes Cendres et Forêt)
  let orPlus = 3 * (fam(R, 'or', 2) ? 1 : 0) + 2 * (R.obj.pioche || 0) + (th === 'cendres' ? 4 : 0);
  const pvPlus = (fam(R, 'garde', 3) ? 3 : 0) + (th === 'foret' ? 5 : 0);
  R.pv = S.pv + (R.prof >= 8 ? 0 : 2) + 3 * (R.obj.trophee || 0) + pvPlus + Object.entries(R.bene || {}).reduce((a, [k, n]) => a + ((BENES[k] && BENES[k].soin) || 0) * n, 0); R.pv = Math.min(R.pv, R.pvmax); // on souffle un peu après chaque victoire (+2)
  R.salle.texte = `Victoire ! +${S.orGagne} or ramassés${orPlus ? ` (+${orPlus} de bonus)` : ''}.`;
  if (t === 'combat') R.salle.recomp = [{ t:'or', n:4 + 2 * R.etage }, h() < .5 ? { t:'soin', n:8 } : { t:'conso', k:pick(h, Object.keys(C.CONSOS)) }, ...tireObjets(R, h, 1).map(k => ({ t:'objet', k }))];
  if (t === 'elite') R.salle.recomp = tireObjets(R, h, debloque(R).elite4 ? 4 : 3, true).map(k => ({ t:'objet', k }));
  if (t === 'defi') {
    const D = DEFIS[R.salle.defi], reussi = D ? D.ok({ pv:pvAvant }, S) : true; R.salle.defiReussi = reussi;
    if (reussi) { orPlus += 15; R.salle.texte = `🏅 Défi réussi${D ? ` (${D.n})` : ''} ! +15 or, et un objet rare au choix.`; R.salle.recomp = tireObjets(R, h, 3, true).map(k => ({ t:'objet', k })); }
    else { R.salle.texte = `Victoire… mais le défi est raté (${D.n}). Pas de gros butin cette fois.`; R.salle.recomp = [{ t:'or', n:6 }]; }
  }
  R.or += orPlus;
  if (t === 'boss') { R.salle.recomp = melange(h, Object.keys(BRELOQUES)).slice(0, 3).map(k => ({ t:'breloque', k })); R.pv = Math.min(R.pvmax, R.pv + Math.round((R.pvmax - R.pv) / 2)); R.salle.texte += ' Tu reprends ton souffle (moitié de la vie perdue).'; }
  if (!R.salle.recomp.length) R.salle.recomp = [{ t:'or', n:10 }];
  R.ecran = 'recompense'; R.S = null; return true;
}
// prendre une récompense (k) ou passer (k = -1) ; renvoie la breloque gagnée s'il y en a une (à ranger par l'écran, elle reste entre les descentes)
function recompense(R, k) {
  if (R.ecran !== 'recompense') return null;
  const x = R.salle.recomp && R.salle.recomp[k]; let gain = null;
  if (x) log(R, `🎁 Pris : ${x.t === 'objet' ? OBJETS[x.k].n : x.t === 'breloque' ? 'breloque ' + x.k : x.t === 'conso' ? 'consommable ' + x.k : x.t + ' ' + (x.n || '')}`);
  if (x) { if (x.t === 'or') R.or += x.n; if (x.t === 'soin') soin(R, x.n); if (x.t === 'objet') R.obj[x.k] = (R.obj[x.k] || 0) + 1; if (x.t === 'conso') { R.consos = R.consos || []; if (R.consos.length < 3) R.consos.push(x.k); } if (x.t === 'breloque') gain = x.k; }
  suite(R); return gain;
}
// passer à l'étape suivante (ou à l'étage suivant, ou à la victoire)
// 28/11 (choix de l'utilisateur « 1+2 », façon Hades) : LES BÉNÉDICTIONS. Après chaque combat gagné : 1 bénédiction parmi 3 (relance du tirage
// contre de l'or). Trois écoles (🔥 Braise attaque, ❄ Givre défense, 🌙 Ombre dés) ; avec 2 bénédictions dans deux écoles, une bénédiction DOUBLE peut sortir.
// Chaque bénédiction se traduit en clés d'objets que crypte-moteur.js sait lire (o), ou en effet direct (pvmax, soin après victoire).
const ECOLES = { braise:{ e:'🔥', n:'Braise', coul:'#ff7a4a' }, givre:{ e:'❄', n:'Givre', coul:'#7ad8ff' }, ombre:{ e:'🌙', n:'Ombre', coul:'#c084fc' } };
const BENES = {
  tranchant:{ ec:'braise', e:'🗡', n:'Tranchant', d:'Tes dés valent +1 sur les sceaux « total ».', o:{ aiguise:1 }, max:2 },
  premier:  { ec:'braise', e:'⚔', n:'Premier sang', d:'Au début de chaque combat, brise 1 sceau sur chaque monstre visible.', o:{ entree:1 }, max:1 },
  traque:   { ec:'braise', e:'🎯', n:'Traque', d:'Élites et boss commencent chaque combat avec 1 sceau déjà brisé.', o:{ braise:1 }, max:1 },
  furie:    { ec:'braise', e:'🔥', n:'Furie', d:'+1 dé à chaque tour, mais −6 PV max.', o:{ sac:1 }, pvmax:-6, max:1, rare:true },
  bouclier: { ec:'givre', e:'🛡', n:'Peau de givre', d:'+4 bouclier au début de chaque combat.', o:{ aube:1 }, max:3 },
  sixglace: { ec:'givre', e:'❄', n:'Six de glace', d:'Chaque 6 posé sur un sceau te donne 1 bouclier.', o:{ six:1 }, max:3 },
  souffle:  { ec:'givre', e:'💧', n:'Second souffle', d:'+4 PV après chaque combat gagné.', soin:4, max:3 },
  roc:      { ec:'givre', e:'🪨', n:'Cœur de roc', d:'+8 PV max (et +8 PV).', pvmax:8, max:2 },
  relance:  { ec:'ombre', e:'🌙', n:'Main d’ombre', d:'+1 relance à chaque tour.', o:{ gobelet:1 }, max:2 },
  poche:    { ec:'ombre', e:'🎒', n:'Poche secrète', d:'+1 place dans ta besace (garder un dé).', o:{ besace:1 }, max:2 },
  reflets:  { ec:'ombre', e:'🔮', n:'Reflets', d:'Deux fois plus de dés de couleur.', o:{ prisme:1 }, max:1 },
  eveil:    { ec:'ombre', e:'✦', n:'Éveil', d:'Ton pouvoir commence chaque combat avec 1 sceau déjà brisé.', o:{ talisman:1 }, max:1, rare:true },
  // les DOUBLES (2 bénédictions dans chacune des deux écoles)
  vapeur:   { ec:'braise+givre', e:'♨', n:'Vapeur', d:'Début de combat : +6 bouclier et 1 sceau brisé sur chaque monstre visible.', o:{ aube:1, entree:1 }, bouclier:2, max:1, dbl:['braise', 'givre'] },
  braisenoire:{ ec:'braise+ombre', e:'🌑', n:'Braise noire', d:'+1 dé et +1 relance à chaque tour.', o:{ sac:1, gobelet:1 }, max:1, dbl:['braise', 'ombre'] },
  lunegelee:{ ec:'givre+ombre', e:'🌘', n:'Lune gelée', d:'Chaque combat commence avec 1 Rune, et +5 PV après chaque victoire.', o:{ rune:1 }, soin:5, max:1, dbl:['givre', 'ombre'] },
};
const nbEcole = (R, ec) => Object.entries(R.bene || {}).reduce((a, [k, n]) => a + (BENES[k] && BENES[k].ec === ec ? n : 0), 0);
function offreBene(R) { const h = RR(R), dispo = Object.keys(BENES).filter(k => (R.bene[k] || 0) < BENES[k].max && (!BENES[k].dbl || BENES[k].dbl.every(ec => nbEcole(R, ec) >= 2)));
  const dbl = dispo.filter(k => BENES[k].dbl), simples = dispo.filter(k => !BENES[k].dbl), l = [];
  if (dbl.length && h() < .6) l.push(pick(h, dbl));
  const pond = []; simples.forEach(k => { for (let i = 0; i < (BENES[k].rare ? 1 : 3); i++) pond.push(k); });
  while (l.length < 3 && pond.length) { const k = pick(h, pond); if (!l.includes(k)) l.push(k); if (pond.every(x => l.includes(x))) break; }
  return l; }
function etapeBene(R) { R.ecran = 'benediction'; R.salle = { type:'benediction', offre:offreBene(R), relances:0 }; }
const prixBene = R => prix(R, 4 + 4 * ((R.salle && R.salle.relances) || 0));
function relancerBene(R) { if (R.ecran !== 'benediction') return null; const p = prixBene(R); if (R.or < p) return 'Pas assez d’or.'; R.or -= p; R.salle.relances++; R.salle.offre = offreBene(R); return null; }
function choisirBene(R, k) {
  if (R.ecran !== 'benediction') return null; let txt = 'Tu continues sans bénédiction.';
  if (k != null && k >= 0) { const id = R.salle.offre[k], B = BENES[id]; if (!B) return null; R.bene[id] = (R.bene[id] || 0) + 1;
    if (B.pvmax) { R.pvmax = Math.max(10, R.pvmax + B.pvmax); R.pv = Math.max(1, Math.min(R.pvmax, R.pv + Math.max(0, B.pvmax))); }
    txt = `${B.e} ${B.n} : ${B.d}`; }
  log(R, '✨ Bénédiction : ' + txt);
  R.salle = null; R.ecran = 'carte'; R.apresBene = true; suite(R); return txt;
}
// 28/11 (l'utilisateur, d'après Dice & Fold) : L'ÉTAPE COMPAGNON au début de chaque étage : 1 compagnon parmi 3 (il remplace l'actuel),
// ou garder le sien (vie pleine) ; sans compagnon, « continuer seul » rend 8 PV.
function etapeComp(R) { const h = RR(R), l = melange(h, compsOuverts(R).filter(k => !R.comp || k !== R.comp.id)).slice(0, 3); R.ecran = 'compagnon'; R.salle = { type:'compagnon', offre:l }; }
function choisirComp(R, k) {
  if (R.ecran !== 'compagnon') return null; let txt;
  if (k === 'garder') { if (R.comp) { R.comp.pv = C.COMPAGNONS[R.comp.id].pv; txt = `${C.COMPAGNONS[R.comp.id].e} ${C.COMPAGNONS[R.comp.id].n} reste avec toi, soigné.`; } else txt = 'Tu continues seul : ' + soin(R, 8); }
  else { const id = R.salle.offre[k]; if (!id) return null; const avant = R.comp ? C.COMPAGNONS[R.comp.id].n : null; poseComp(R, id);
    txt = `${C.COMPAGNONS[id].e} ${C.COMPAGNONS[id].n} te rejoint${avant ? ` (${avant} passe en réserve)` : ''}.`; }
  log(R, '🐾 ' + txt); R.salle = null; R.ecran = 'carte'; tireChoix(R); return txt;
}
function suite(R) {
  if (R.beneDue && !R.fin) { R.beneDue = false; R.salleAvant = R.salle; etapeBene(R); return true; }
  if (R.apresBene) { R.apresBene = false; R.salle = R.salleAvant || null; R.salleAvant = null; }
  if (R.salle && R.salle.type === 'boss') {
    if (R.etage >= ETAGES) { R.fin = 'gagne'; R.ecran = 'fin'; R.score = Math.round((R.score + 50 * R.pv + 10 * R.or) * (R.pacte ? PACTES[R.pacte].score : 1) * (1 + .1 * R.prof)); return true; }
    R.etage++; R.pas = 0; R.salle = null; tireChoix(R); etapeComp(R); return true;
  }
  R.salle = null; R.ecran = 'carte'; tireChoix(R); return true;
}
const etoiles = R => R.fin !== 'gagne' ? 0 : 1 + (R.pv >= R.pvmax * .3 ? 1 : 0) + (R.pv >= R.pvmax * .6 ? 1 : 0);
// 15/11 soir : la rareté visible d'un objet (une gemme de couleur et le mot)
const rarete = k => OBJETS[k] && OBJETS[k].rare ? { n:'Rare', coul:'#4aa8ff' } : { n:'Commun', coul:'#b8c0d0' };

const API = { changerComp, BENES, ECOLES, nbEcole, choisirBene, relancerBene, prixBene, choisirComp, PROFONDEURS, ETAPES, ETAGES, SALLES, OBJETS, BRELOQUES, PACTES, EVENEMENTS, nouvelle, choisir, acheter, feu, evenement, apresCombat, recompense, suite, etoiles, prix,
  FAMILLES, familles, bonusFamilles, THEMES, theme, PALIERS, palierDe, debloque, renommeeGagnee, DEFIS, FORGE_CHOIX, forger, relancerEtal, prixRelance, rarete };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.DESCENTE = API;
})(typeof window !== 'undefined' ? window : globalThis);
