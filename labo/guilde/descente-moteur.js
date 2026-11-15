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
};

// ------------------------------------------------------------------ les objets (permanents pour la descente ; les clés sont lues par crypte-moteur.js)
const OBJETS = {
  sac:      { e:'🎲', n:'Sac de dés', d:'+1 dé à chaque tour.', c:'+1 dé / tour', prix:20, rare:true, max:2 },
  gobelet:  { e:'🥤', n:'Gobelet de relance', d:'+1 relance à chaque tour.', c:'+1 relance / tour', prix:14, max:2 },
  besace:   { e:'🎒', n:'Grande besace', d:'+1 place dans ta besace.', c:'+1 place de besace', prix:10, max:2 },
  six:      { e:'6️⃣', n:'Six béni', d:'Chaque 6 posé sur un sceau te donne 1 bouclier.', c:'un 6 posé = +1 🛡', prix:12, max:3 },
  bourse:   { e:'👛', n:'Bourse jumelle', d:'Deux dés de même valeur posés dans le même tour : +1 or.', c:'paire posée = +1 🪙', prix:8, max:3 },
  aube:     { e:'🌅', n:'Fiole d’aube', d:'+4 bouclier au début de chaque combat.', c:'+4 🛡 au début du combat', prix:12, max:3 },
  trophee:  { e:'🏆', n:'Trophée de chasse', d:'+3 PV après chaque combat gagné.', c:'+3 PV après chaque victoire', prix:12, max:3 },
  prisme:   { e:'🔮', n:'Prisme', d:'Deux fois plus de dés de couleur.', c:'2× plus de dés de couleur', prix:12, max:2 },
  creusetor:{ e:'🔥', n:'Creuset doré', d:'Creuset plein : en plus de la Rune, +3 or et +3 bouclier.', c:'creuset plein = +3 🪙 +3 🛡', prix:12, max:2 },
  souffle:  { e:'🕯', n:'Dernier souffle', d:'Une fois dans la descente : quand ton héros tombe, il se relève à 10 PV.', c:'se relève à 10 PV (1 fois)', prix:18, rare:true, max:1 },
  entree:   { e:'🗡', n:'Lame d’entrée', d:'Au début de chaque combat, brise 1 sceau sur chaque monstre visible.', c:'1 sceau brisé par monstre au début', prix:16, rare:true, max:1 },
  chaineor: { e:'⛓', n:'Chaîne d’or', d:'Chaque chaîne (2 monstres ou plus dans le même tour) : +2 or.', c:'chaîne = +2 🪙', prix:10, max:2 },
  aiguise:  { e:'🪨', n:'Pierre à aiguiser', d:'Tes dés valent +1 sur les sceaux « total ».', c:'+1 sur les « total »', prix:12, max:2 },
  rune:     { e:'✦', n:'Rune de départ', d:'Commence chaque combat avec 1 Rune.', c:'1 Rune au début du combat', prix:16, rare:true, max:2 },
  talisman: { e:'🧿', n:'Talisman', d:'Ton pouvoir commence chaque combat avec 1 sceau déjà brisé.', c:'pouvoir : 1 sceau déjà brisé', prix:14, max:1 },
  diable:   { e:'😈', n:'Marché du diable', d:'+1 dé à chaque tour, mais tous les monstres frappent 1 de plus.', c:'+1 dé, monstres +1 de force', prix:6, max:1 },
};
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
// ------------------------------------------------------------------ les événements
const EVENEMENTS = {
  fontaine: { e:'⛲', n:'La fontaine aux souhaits', t:'Une fontaine de pierre murmure. On voit des pièces au fond… et elles brillent un peu trop.',
    choix:[{ n:'Boire (+12 PV)', f:R => soin(R, 12) }, { n:'Jeter 5 or : un objet au hasard', si:R => R.or >= 5, f:(R, h) => { R.or -= 5; donneObjet(R, h); } }, { n:'Passer son chemin', f:() => 'Tu passes. La fontaine soupire.' }] },
  autel:    { e:'🩸', n:'L’autel de sang', t:'Un autel réclame un peu de toi. En échange, il offre quelque chose de précieux.',
    choix:[{ n:'Donner 8 PV : un objet rare', si:R => R.pv > 8, f:(R, h) => { R.pv -= 8; donneObjet(R, h, true); } }, { n:'Donner 4 PV max : +20 or', si:R => R.pvmax > 30, f:R => { R.pvmax -= 4; R.pv = Math.min(R.pv, R.pvmax); R.or += 20; return '+20 or.'; } }, { n:'Refuser', f:() => 'Tu recules. L’autel s’éteint.' }] },
  coffre:   { e:'🧰', n:'Le coffre piégé', t:'Un coffre, et un mécanisme bizarre. Tu lances un dé : 4 ou plus, il s’ouvre ; sinon, il mord.',
    choix:[{ n:'Lancer le dé', f:(R, h) => { const d = 1 + Math.floor(h() * 6); if (d >= 4) { R.or += 15; return `🎲 ${d} : le coffre s’ouvre, +15 or !`; } R.pv = Math.max(1, R.pv - 6); return `🎲 ${d} : il mord ! −6 PV.`; } }, { n:'Le laisser', f:() => 'Prudence est mère de sûreté.' }] },
  egare:    { e:'🐾', n:'Un compagnon égaré', t:'Une petite créature te suit depuis tout à l’heure. Elle a l’air d’avoir faim, et envie d’aventure.',
    choix:[{ n:'L’adopter', f:(R, h) => donneComp(R, h) }, { n:'Lui donner à manger (−3 or, +8 PV : elle te soigne en remerciement)', si:R => R.or >= 3, f:R => { R.or -= 3; return soin(R, 8); } }, { n:'Continuer seul', f:() => 'Elle te regarde partir. Snif.' }] },
  joueur:   { e:'🎰', n:'Le joueur de dés', t:'Un squelette joue aux dés tout seul. « Une partie ? Double ou rien ! »',
    choix:[{ n:'Miser 10 or (1 chance sur 2 de doubler)', si:R => R.or >= 10, f:(R, h) => { if (h() < .5) { R.or += 10; return 'Gagné : +10 or !'; } R.or -= 10; return 'Perdu : −10 or. Le squelette ricane.'; } }, { n:'Miser 6 PV contre un objet', si:R => R.pv > 6, f:(R, h) => { if (h() < .5) return donneObjet(R, h); R.pv -= 6; return 'Perdu : −6 PV.'; } }, { n:'Non merci', f:() => '« Dommage, je m’ennuie depuis trois siècles. »' }] },
  forge:    { e:'⚒', n:'La forge oubliée', t:'Une enclume encore tiède. De quoi te renforcer un peu.',
    choix:[{ n:'+5 PV max', f:R => { R.pvmax += 5; R.pv += 5; return '+5 PV max.'; } }, { n:'Réparer ton compagnon (vie pleine)', si:R => R.comp, f:R => { R.comp.pv = C.COMPAGNONS[R.comp.id].pv; return 'Ton compagnon est comme neuf.'; } }, { n:'+8 or (tu revends des vieilleries)', f:R => { R.or += 8; return '+8 or.'; } }] },
};

// ------------------------------------------------------------------ outils
function soin(R, n) { const a = R.pv; R.pv = Math.min(R.pvmax, R.pv + n); return `+${R.pv - a} PV.`; }
function donneObjet(R, h, rare) {
  const liste = Object.keys(OBJETS).filter(k => (R.obj[k] || 0) < OBJETS[k].max && (!rare || OBJETS[k].rare || h() < .4) && k !== 'diable');
  if (!liste.length) { R.or += 10; return '+10 or (plus rien à donner).'; }
  const k = pick(h, liste); R.obj[k] = (R.obj[k] || 0) + 1; return `${OBJETS[k].e} ${OBJETS[k].n} : ${OBJETS[k].d}`;
}
function donneComp(R, h) {
  const k = pick(h, Object.keys(C.COMPAGNONS)); R.comp = { id:k, pv:C.COMPAGNONS[k].pv }; return `${C.COMPAGNONS[k].e} ${C.COMPAGNONS[k].n} te rejoint : ${C.COMPAGNONS[k].d}`;
}
const prix = (R, p) => Math.round(p * 1.4 * (R.breloque === 'remise' ? .75 : 1));

// ------------------------------------------------------------------ une descente
// bonus : la progression du héros (étoiles, équipement) ; opts : { breloque, pacte }
function nouvelle(heros, graine, bonus = {}, opts = {}) {
  const R = { heros, graine, rs:0, etage:1, pas:0, pvmax:C.PV_HEROS + (bonus.pv || 0), pv:0, or:0, obj:{}, comp:null, bonus,
    breloque:opts.breloque || null, pacte:opts.pacte || null, ecran:'carte', choix:[], salle:null, S:null, fin:null, score:0, journal:[], combats:0, chemin:[], souffleUtilise:false };
  const h0 = C.rng(graine); R.rs = Math.floor(h0() * 4294967296); const h = RR(R);
  if (R.breloque === 'coeur') R.pvmax += 10;
  if (R.pacte === 'verre') { R.pvmax = Math.round(R.pvmax * .7); R.obj.sac = 1; }
  R.pv = R.pvmax;
  if (R.breloque === 'bourse') R.or += 20;
  if (R.pacte === 'sang') R.or += 25;
  if (R.breloque === 'sifflet') donneComp(R, h);
  if (R.breloque === 'sac') donneObjet(R, h);
  tireChoix(R); return R;
}
// les 2-3 salles proposées à l'étape suivante
// 15/11 soir (retour de l'utilisateur : « j'ai pu aller au boss sans un seul combat ») : les COMBATS sont obligatoires.
// Un étage = 8 étapes : ⚔ ⚔ (repos) ⚔ ⚔ (repos) ⚔ (repos avant le boss) puis ♛. Aux étapes de combat, on choisit seulement
// combat OU élite (plus dur, meilleure récompense) ; aux étapes de repos, 3 salles au choix sans combat (marchand, feu, événement, trésor).
const PLAN = ['', 'c', 'c', 'r', 'c', 'c', 'r', 'c', 'r'];
function tireChoix(R) {
  const h = RR(R), p = R.pas + 1;
  if (p > ETAPES) { R.choix = ['boss']; return; }
  if (PLAN[p] === 'c') { R.choix = p === 1 ? ['combat'] : ['combat', 'elite']; return; }
  const pool = ['marchand', 'feu', 'evenement', 'tresor'].filter(t => !(t === 'feu' && R.pacte === 'nuit'));
  let ch = melange(h, pool).slice(0, 3);
  if (p === ETAPES) { const repos = R.pacte === 'nuit' ? 'marchand' : 'feu'; if (!ch.includes(repos)) ch[0] = repos; if (!ch.includes('marchand')) ch[1] = 'marchand'; }
  R.choix = ch;
}
// les réglages du combat (pour CRYPTE.nouvelle)
function optsCombat(R, type) {
  const h = RR(R), e = R.etage;
  const niv = () => e === 1 ? pick(h, [1, 2, 2]) : e === 2 ? pick(h, [2, 2, 3, 3]) : pick(h, [2, 2, 3, 3]);
  let cols;
  if (type === 'boss') cols = null;
  else {
    const n = [0, 4, 6, 7][e]; cols = [[], [], []];
    for (let i = 0; i < n; i++) cols[i % 3].push(niv());
    cols.forEach(c => c.sort((a, b) => b - a)); // le plus fort au fond
    if (type === 'elite') cols[Math.floor(h() * 3)].unshift(4);
  }
  const obj = Object.assign({}, R.obj);
  if (R.breloque === 'eveil') obj.talisman = (obj.talisman || 0) + 1;
  if (R.breloque === 'rune') obj.rune = (obj.rune || 0) + 1;
  if (R.breloque === 'prisme') obj.prisme = (obj.prisme || 0) + 1;
  if (R.pacte === 'sang') obj.pactesang = 1;
  return { cols, gardien:type === 'boss' ? 'seul' : false, etage:e, pv:R.pv, pvmax:R.pvmax, obj, comp:R.comp && R.comp.pv > 0 ? R.comp : null, or:R.or,
    maitre:type === 'boss' ? 9 : type === 'elite' ? 7 : 6, couleur:.08 * (R.pacte === 'nuit' ? 3 : 1), secours:!!R.obj.souffle && !R.souffleUtilise };
}
// choisir la salle k parmi les choix ; pour un combat, R.S est la crypte à jouer (écran de combat de crypte.html)
function choisir(R, k) {
  if (R.fin || R.ecran !== 'carte') return false;
  const t = R.choix[k]; if (!t) return false; const h = RR(R);
  R.pas++; R.salle = { type:t }; R.chemin.push(t);
  if (t === 'combat' || t === 'elite' || t === 'boss') { R.ecran = 'combat'; R.S = C.nouvelle(R.heros, R.graine + '-' + R.etage + '-' + R.pas, R.bonus, optsCombat(R, t)); return true; }
  if (t === 'marchand') { R.ecran = 'marchand'; R.salle.etal = etal(R, h); return true; }
  if (t === 'feu') { R.ecran = 'feu'; return true; }
  if (t === 'evenement') { R.ecran = 'evenement'; R.salle.ev = pick(h, Object.keys(EVENEMENTS)); return true; }
  if (t === 'tresor') { const or = 6 + 4 * R.etage + Math.floor(h() * 6); R.or += or; R.ecran = 'recompense'; R.salle.texte = `💰 Le coffre contient ${or} pièces d’or.`; R.salle.recomp = h() < .5 ? [{ t:'objet', k:tireObjets(R, h, 1)[0] }].filter(x => x.k) : []; if (!R.salle.recomp.length) R.salle.recomp = [{ t:'or', n:6 }]; return true; }
  return false;
}
function tireObjets(R, h, n, rare) {
  const l = Object.keys(OBJETS).filter(k => (R.obj[k] || 0) < OBJETS[k].max && (!rare || OBJETS[k].rare || k === 'diable'));
  return melange(h, l).slice(0, n);
}
function etal(R, h) {
  const l = tireObjets(R, h, 4).map(k => ({ t:'objet', k, prix:prix(R, OBJETS[k].prix + 2 * (R.etage - 1)) }));
  if (!R.comp || R.comp.pv <= 0) { const k = pick(h, Object.keys(C.COMPAGNONS)); l.push({ t:'comp', k, prix:prix(R, 16) }); }
  else if (R.comp.pv < C.COMPAGNONS[R.comp.id].pv) l.push({ t:'reparer', prix:prix(R, 5) });
  l.push({ t:'soin', n:12, prix:prix(R, 8) });
  return l;
}
function acheter(R, i) {
  if (R.ecran !== 'marchand') return 'non';
  const x = R.salle.etal[i]; if (!x || x.vendu) return 'non'; if (R.or < x.prix) return 'Pas assez d’or.';
  R.or -= x.prix; x.vendu = x.t !== 'soin';
  if (x.t === 'objet') R.obj[x.k] = (R.obj[x.k] || 0) + 1;
  if (x.t === 'comp') R.comp = { id:x.k, pv:C.COMPAGNONS[x.k].pv };
  if (x.t === 'reparer') R.comp.pv = C.COMPAGNONS[R.comp.id].pv;
  if (x.t === 'soin') soin(R, x.n);
  return 'ok';
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
  const t = c.f(R, RR(R)) || ''; R.ecran = 'recompense'; R.salle.texte = `${E.e} ${t}`; R.salle.recomp = []; return t;
}
// fin d'un combat (R.S.fin posé) : on reprend la vie, l'or, le compagnon ; puis la récompense
function apresCombat(R) {
  const S = R.S; if (!S || !S.fin) return false;
  R.or = S.or; R.combats++; R.score += S.score;
  if (S.secoursUtilise) R.souffleUtilise = true;
  if (R.comp && S.comp) R.comp.pv = S.comp.pv;
  if (S.fin === 'perdu') { R.pv = 0; R.fin = 'perdu'; R.ecran = 'fin'; R.S = null; return true; }
  R.pv = S.pv + 2 + 3 * (R.obj.trophee || 0); // on souffle un peu après chaque victoire (+2) R.pv = Math.min(R.pv, R.pvmax);
  const h = RR(R), t = R.salle.type;
  R.salle.texte = `Victoire ! +${S.orGagne} or ramassés.`;
  if (t === 'combat') R.salle.recomp = [{ t:'or', n:4 + 2 * R.etage }, { t:'soin', n:8 }, ...tireObjets(R, h, 1).map(k => ({ t:'objet', k }))];
  if (t === 'elite') R.salle.recomp = tireObjets(R, h, 3, true).map(k => ({ t:'objet', k }));
  if (t === 'boss') { R.salle.recomp = melange(h, Object.keys(BRELOQUES)).slice(0, 3).map(k => ({ t:'breloque', k })); R.pv = Math.min(R.pvmax, R.pv + Math.round((R.pvmax - R.pv) / 2)); R.salle.texte += ' Tu reprends ton souffle (moitié de la vie perdue).'; }
  if (!R.salle.recomp.length) R.salle.recomp = [{ t:'or', n:10 }];
  R.ecran = 'recompense'; R.S = null; return true;
}
// prendre une récompense (k) ou passer (k = -1) ; renvoie la breloque gagnée s'il y en a une (à ranger par l'écran, elle reste entre les descentes)
function recompense(R, k) {
  if (R.ecran !== 'recompense') return null;
  const x = R.salle.recomp && R.salle.recomp[k]; let gain = null;
  if (x) { if (x.t === 'or') R.or += x.n; if (x.t === 'soin') soin(R, x.n); if (x.t === 'objet') R.obj[x.k] = (R.obj[x.k] || 0) + 1; if (x.t === 'breloque') gain = x.k; }
  suite(R); return gain;
}
// passer à l'étape suivante (ou à l'étage suivant, ou à la victoire)
function suite(R) {
  if (R.salle && R.salle.type === 'boss') {
    if (R.etage >= ETAGES) { R.fin = 'gagne'; R.ecran = 'fin'; R.score = Math.round((R.score + 50 * R.pv + 10 * R.or) * (R.pacte ? PACTES[R.pacte].score : 1)); return true; }
    R.etage++; R.pas = 0;
  }
  R.salle = null; R.ecran = 'carte'; tireChoix(R); return true;
}
const etoiles = R => R.fin !== 'gagne' ? 0 : 1 + (R.pv >= R.pvmax * .3 ? 1 : 0) + (R.pv >= R.pvmax * .6 ? 1 : 0);

const API = { ETAPES, ETAGES, SALLES, OBJETS, BRELOQUES, PACTES, EVENEMENTS, nouvelle, choisir, acheter, feu, evenement, apresCombat, recompense, suite, etoiles, prix };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.DESCENTE = API;
})(typeof window !== 'undefined' ? window : globalThis);
