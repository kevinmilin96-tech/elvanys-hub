// =============================================================================================== LA CRYPTE AUX SCEAUX (15/11, moteur)
// Un SOLITAIRE DE DÉS. Inspirations (mécaniques seulement) : le solitaire (colonnes de cartes, la carte du dessous se retourne),
// Dice & Fold (des cases de dés sur les monstres), Balatro (les chaînes qui multiplient le score).
// Règle en une phrase : lance tes dés, pose-les sur les SCEAUX des monstres visibles ; un monstre dont tous les sceaux sont brisés
// tombe et la carte du dessous se retourne. À la fin du tour, chaque monstre visible frappe. Vide les 3 colonnes, puis bats le Gardien.
// 15/11 soir (demande de l'utilisateur : « je n'ai pas encore vu les fonctionnalités de Dice & Fold ») : DÉS DE COULEUR, PIÈCES D'OR,
// monstres à RÈGLES (voisins, épines, plafond, silence, horloge, mue, voleur, faiblesse), MAÎTRE DES CRYPTES après N tours,
// COMPAGNON (sa propre vie, sa compétence chargée par les dés), OBJETS de la Descente (descente-moteur.js).
// Ce fichier n'a AUCUN dessin : il marche aussi dans node (outils/simuler-crypte.mjs, simuler-descente.mjs).
(function (racine) {
'use strict';

const NB_DES = 5, NB_COL = 3, PROF = 4, RESERVE = 2, RUNES_MAX = 3, PV_HEROS = 55;

// ------------------------------------------------------------------ hasard à graine (la même crypte pour tout le monde le même jour)
function rng(graine) {
  let h = 2166136261; for (const c of String(graine)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const de6 = R => 1 + Math.floor(R() * 6);
// 15/11 : le hasard de la partie vit DANS l'état (S.rs), pour sauvegarder une crypte en cours (JSON simple)
function RS(S) { return () => { S.rs = (S.rs + 0x6D2B79F5) >>> 0; let t = S.rs; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (R, l) => l[Math.floor(R() * l.length)];

// ------------------------------------------------------------------ les sceaux (les cases de dés)
// t : ex (valeur exacte) · min (v ou plus) · max (v ou moins) · pair · imp · tot (somme de plusieurs dés) · dbl (deux sceaux jumeaux, même valeur) · any
const SCEAU_TXT = { ex:'exactement', min:'ou plus', max:'ou moins', pair:'un dé pair', imp:'un dé impair', tot:'total', dbl:'jumeaux', any:'n’importe quel dé' };
function sceau(t, v, g) { return { t, v:v || 0, reste:t === 'tot' ? v : 0, ok:false, val:0, g:g || 0 }; }
// le dé d peut-il aller sur le sceau s ? (S = tous les sceaux de la carte, pour les jumeaux)
// 22/11 : b = le bonus forgé de la face (héros d'aventure), qui compte seulement pour les sceaux « ≥ » et « Σ » des monstres (comme dans les Chroniques)
function accepte(s, d, S, b) {
  if (s.ok) return false;
  switch (s.t) {
    case 'ex': return d === s.v;
    case 'min': return d + (b || 0) >= s.v;
    case 'max': return d <= s.v;
    case 'pair': return d % 2 === 0;
    case 'imp': return d % 2 === 1;
    case 'tot': case 'any': return true;
    case 'dbl': { const j = S.find(x => x !== s && x.t === 'dbl' && x.g === s.g && x.ok); return !j || !j.val || j.val === d; } // 27/11 soir : un jumeau brisé SANS dé (Tempête, Rune, bombe…) laisse son jumeau libre = n'importe quel dé (avant : « = 0 », impossible, même sur le Gardien)
  }
  return false;
}
function pose(s, d, bonusTot) {
  if (s.t === 'tot') { const v = d + (bonusTot || 0); s.reste -= v; s.val += v; if (s.reste <= 0) { s.reste = 0; s.ok = true; } }
  else { s.ok = true; s.val = d; }
}
const brise = s => { s.ok = true; s.reste = 0; if (!s.val) s.val = s.t === 'ex' ? s.v : 0; };

// ------------------------------------------------------------------ les dés de couleur (Dice & Fold) : un dé normal, OU un effet spécial
const COULEURS = {
  rouge:  { e:'❤', n:'Dé rouge', d:'soigne ton héros de sa valeur' },
  bleu:   { e:'⚡', n:'Dé bleu', d:'brise d’un coup un sceau de ton pouvoir (ou de ton compagnon)' },
  orange: { e:'🔻', n:'Dé orange', d:'le monstre qui frappe le plus fort perd 1 de force (pour toujours)' },
  gris:   { e:'🛡', n:'Dé gris', d:'ajoute sa valeur à ton bouclier' },
};

// ------------------------------------------------------------------ les monstres de la crypte (portraits déjà peints pour l'Odyssée)
const BETES = [
  ['gobelin', 'Gobelin des cendres'], ['loup', 'Loup de braise'], ['golem', 'Golem de scories'], ['salamandre', 'Salamandre'], ['scarabee', 'Scarabée de braise'],
  ['harpie', 'Harpie'], ['lutin', 'Lutin farceur'], ['larve', 'Larve du Vide'], ['sangsue', 'Sangsue'], ['rongeur', 'Rongeur des cryptes'],
  ['renardneige', 'Renard des neiges'], ['givrelin', 'Givrelin'], ['tisseuse', 'Tisseuse'], ['oeil', 'Œil du Vide'], ['ombre', 'Ombre'],
  ['cultiste', 'Cultiste'], ['esprit', 'Esprit errant'], ['sentinelle', 'Sentinelle'], ['yeti', 'Yéti'], ['ours', 'Ours des glaces'],
];
const ELITES = [['chefgobelin', 'Chef gobelin'], ['drake', 'Drake'], ['liche', 'Liche'], ['seigneurbraise', 'Seigneur des braises'], ['reinefrimas', 'Reine des frimas'], ['chevalier', 'Chevalier déchu'], ['mammouth', 'Mammouth']];
const GARDIENS = [['titan', 'Le Titan de feu'], ['vouivre', 'La Vouivre des glaces'], ['roi', 'Le Roi sans visage'], ['hydre', 'L’Hydre'], ['devoreur', 'Le Dévoreur'], ['hiver', 'Le Cœur de l’Hiver']];

// les particularités (une seule par carte, toujours écrite en clair sur la carte)
const TRAITS = {
  furie:   { e:'😡', n:'Furie', d:'Son attaque monte de 1 à chaque fin de tour.' },
  repousse:{ e:'🌱', n:'Repousse', d:'Au début de ton tour, un de ses sceaux brisés se referme.' },
  chef:    { e:'👑', n:'Chef', d:'Les autres monstres visibles frappent 1 de plus.' },
  gel:     { e:'❄️', n:'Gel', d:'Tant qu’il est visible, tu lances 1 dé de moins.' },
  rancune: { e:'💢', n:'Rancune', d:'Quand il tombe, il frappe une dernière fois.' },
  tresor:  { e:'💎', n:'Trésor', d:'Quand il tombe, il remplit une case de ton creuset.' },
  // 15/11 soir : les règles écrites sur les cartes de Dice & Fold (mécaniques seulement)
  voisins: { e:'🤝', n:'Meneur', d:'Ses voisins de gauche et de droite frappent 1 de plus (la place des cartes compte !).' },
  epines:  { e:'🌵', n:'Épines', d:'Chaque dé posé sur lui te coûte 1 PV.' },
  plafond: { e:'⛓', n:'Chaînes lourdes', d:'Tant qu’il est visible, les dés de 5 et 6 ne se posent sur aucun sceau (creuset et besace, oui).' },
  silence: { e:'🤐', n:'Silence', d:'Tant qu’il est visible, ton pouvoir et ton compagnon ne peuvent pas agir.' },
  horloge: { e:'⏰', n:'Horloge', d:'S’il est encore là à la fin de son 4e tour visible, il frappe de 8 d’un coup.' },
  mue:     { e:'🐛', n:'Mue', d:'Quand il tombe, une petite bête à 2 sceaux sort de sa carcasse.' },
  voleur:  { e:'🪙', n:'Voleur', d:'À chaque fin de tour, il te vole 1 pièce d’or.' },
  faible:  { e:'🎯', n:'Point faible', d:'Un dé ROUGE posé sur un de ses sceaux le fait tomber d’un coup.' },
};
const TRAITS_FACILES = ['furie', 'repousse', 'chef', 'gel', 'rancune', 'tresor', 'voisins', 'epines', 'mue', 'faible', 'voleur'];
const TRAITS_DURS = ['furie', 'repousse', 'chef', 'rancune', 'voisins', 'plafond', 'silence', 'horloge', 'mue'];

function sceauxNiveau(R, niv) {
  const facile = () => pick(R, [sceau('any'), sceau('min', 3), sceau('max', 4), sceau('pair'), sceau('imp')]);
  const moyen = () => pick(R, [sceau('min', 4), sceau('max', 3), sceau('pair'), sceau('imp'), sceau('ex', de6(R))]);
  const dur = () => pick(R, [sceau('min', 5), sceau('max', 2), sceau('ex', de6(R)), sceau('tot', 8 + Math.floor(R() * 3))]);
  const jumeaux = g => [sceau('dbl', 0, g), sceau('dbl', 0, g)];
  if (niv <= 0) return [facile(), facile()];
  if (niv === 1) return [facile(), facile()];
  if (niv === 2) return [facile(), moyen(), moyen()];
  if (niv === 3) return R() < .5 ? [moyen(), ...jumeaux(1)] : [moyen(), moyen(), dur()];
  return [dur(), ...jumeaux(1), pick(R, [moyen(), sceau('tot', 10 + Math.floor(R() * 3))])];
}
function carte(R, niv, n, plus = 0) {
  const [m, nom] = niv === 4 ? pick(R, ELITES) : pick(R, BETES);
  const trait = niv >= 2 && R() < .55 ? pick(R, niv === 4 ? TRAITS_DURS.filter(t => t !== 'horloge') : niv === 3 ? TRAITS_DURS : TRAITS_FACILES) : null;
  const att = [0, [1, 1, 2], [1, 2, 2], [2, 2, 3], [2, 3, 3]][Math.min(4, Math.max(1, niv))][Math.floor(R() * 3)] + plus; // 15/11 : chaque monstre a SA force
  return { id:'c' + n, m, nom, niv, att, trait, sceaux:sceauxNiveau(R, niv), vue:false, elite:niv === 4, age:0 };
}
function sceauxGardien(R, etage) {
  const sc = [sceau('ex', de6(R)), sceau('ex', de6(R)), sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('min', 5), sceau('tot', 14)];
  if (etage >= 2) sc.push(sceau('max', 2)), sc.push(sceau('tot', 12));
  if (etage >= 3) sc.push(sceau('dbl', 0, 2)), sc.push(sceau('dbl', 0, 2));
  return sc;
}
// 15/11 soir (l'utilisateur : « le boss de la Descente, super simple, il est tombé en deux trois tours ») : un gardien peut avoir PLUSIEURS VIES ;
// quand tous ses sceaux sont brisés, il se relève avec de nouveaux sceaux et frappe 1 de plus.
const PHASE3 = { titan:['rancune', 'son cœur de magma va exploser !'], vouivre:['furie', 'folle de rage !'], roi:['repousse', 'son masque se reforme sans cesse !'],
  hydre:['epines', 'couverte d’écailles tranchantes !'], devoreur:['rancune', 'son ventre gronde, prêt à tout recracher !'], hiver:['gel', 'l’hiver éternel tombe !'] };
// 22/11 : la 2e phase de chaque Gardien (une particularité déjà connue du jeu, qui remplace sa Furie)
const PHASE2 = { titan:['epines', 'la lave coule de ses blessures !'], vouivre:['gel', 'son souffle glace tout !'], roi:['silence', 'son masque se fend et le silence tombe !'],
  hydre:['repousse', 'deux têtes repoussent à la place d’une !'], devoreur:['voleur', 'sa gueule s’ouvre sur ton or !'], hiver:['plafond', 'des chaînes de glace se referment !'] };
function gardien(R, etage = 0, vies = 1, fsPlus = 0) {
  const [m, nom] = pick(R, GARDIENS);
  // 22/11 : dans la Crypte classique (étage 0, 2 phases), la 1re phase est plus courte (4 sceaux) et la frappe de départ reste de 2
  const deuxPhases = !etage && vies >= 2, sc = sceauxGardien(R, etage); if (deuxPhases) sc.splice(4, 2);
  return { id:'g', m, nom, niv:5, att:(vies > 1 && !deuxPhases ? 3 : 2) + Math.max(0, etage - 1) + fsPlus, trait:'furie', gardien:true, vue:true, sceaux:sc, age:0, vies, viesMax:vies };
}

// ------------------------------------------------------------------ LA REJOUABILITÉ DU SOLITAIRE (15/11 soir, choix de l'utilisateur)
// 1) VARIANTES DE PLATEAU : la disposition des cartes change (la crypte du jour en tire une par la date) ; toujours 12 cartes.
const VARIANTES = {
  classique:{ e:'🂠', n:'Trois colonnes', d:'La crypte classique : 3 colonnes de 4 cartes.', plan:[[4, 3, 2, 1], [4, 3, 2, 1], [4, 3, 2, 1]] },
  quatre:   { e:'🃏', n:'Quatre colonnes', d:'4 colonnes de 3 cartes : plus de monstres visibles à la fois, mais des colonnes plus courtes.', plan:[[4, 2, 1], [3, 2, 1], [3, 2, 1], [4, 2, 1]] },
  escalier: { e:'🪜', n:'L’escalier', d:'Des colonnes de 5, 4 et 3 cartes : la grande colonne cache sa meilleure élite tout au fond. Les monstres forts (◆◆◆ et élites) frappent 1 de plus.', force:1, plan:[[4, 3, 3, 2, 1], [4, 2, 2, 1], [3, 2, 1]] },
  tours:    { e:'🗼', n:'Les deux tours', d:'2 colonnes de 6 cartes : seulement 2 monstres visibles, mais il faut percer haut. Les monstres forts (◆◆◆ et élites) frappent 2 de plus.', force:2, plan:[[4, 3, 3, 2, 2, 1], [4, 3, 2, 2, 1, 1]] },
};
const varianteDuJour = jour => { let h = 7; for (const c of String(jour)) h = (h * 33 + c.charCodeAt(0)) >>> 0; const k = Object.keys(VARIANTES); return k[h % k.length]; };
// 2) CARTES SPÉCIALES : dans les colonnes, des cartes qui ne sont pas des monstres. On brise leurs sceaux comme ceux d'un monstre.
const SPECIALES = {
  coffre:{ e:'🧰', n:'Coffre scellé', d:'Ne frappe pas. Ouvert (sceaux brisés), il donne ce qui est écrit dessus.' },
  autel: { e:'🕯️', n:'Autel des runes', d:'Ne frappe pas. Ses sceaux brisés, il charge entièrement le pouvoir de ton héros.' },
  piege: { e:'⚙️', n:'Piège à ressort', d:'Frappe de 2 à chaque fin de tour tant qu’il est visible. Désamorcé : +3 or.' },
};
const GAINS_COFFRE = { rune:{ e:'✦', n:'une Rune' }, soin:{ e:'❤', n:'+10 PV' }, bouclier:{ e:'🛡', n:'+6 bouclier' }, or:{ e:'🪙', n:'+6 or' } };
function speciale(R, k, n) {
  const c = { id:'s' + n, m:null, special:k, nom:SPECIALES[k].n, e:SPECIALES[k].e, niv:1, att:k === 'piege' ? 2 : 0, trait:null, vue:false, elite:false, age:0 };
  if (k === 'coffre') { c.sceaux = [sceau('dbl', 0, 1), sceau('dbl', 0, 1)]; c.gain = pick(R, Object.keys(GAINS_COFFRE)); }
  if (k === 'autel') c.sceaux = [sceau('min', 4), sceau('min', 4)];
  if (k === 'piege') c.sceaux = [sceau('ex', de6(R)), sceau('ex', de6(R))];
  return c;
}
// 3) LES DÉFIS À ÉTOILES : chaque crypte en tire 3 ; une victoire + un défi réussi = une étoile. (Réglés au simulateur.)
const DEFIS = {
  robuste:   { e:'❤', n:'Increvable', d:'Gagner avec 22 PV ou plus.', ok:S => S.pv >= 22 },
  rapide:    { e:'⚡', n:'Éclair', d:'Gagner en 11 tours ou moins.', ok:S => S.tour <= 11 },
  sansBesace:{ e:'🎒', n:'Mains vides', d:'Ne jamais ranger de dé dans la besace.', ok:S => !st(S).besace },
  sansRune:  { e:'✦', n:'Sans magie', d:'Ne jamais utiliser de Rune.', ok:S => !st(S).runes },
  chaine:    { e:'⛓', n:'Carambolage', d:'Faire tomber 3 cartes dans le même tour.', ok:S => S.chaineMax >= 3 },
  sansRelance:{ e:'🎲', n:'Du premier coup', d:'Ne jamais relancer les dés.', ok:S => !st(S).relances },
  heroique:  { e:'⚡', n:'Héroïque', d:'Utiliser 3 fois le pouvoir de ton héros.', ok:S => (st(S).pouvoir || 0) >= 3 },
  prudent:   { e:'🛡', n:'Prudent', d:'Ne jamais descendre sous 15 PV.', ok:S => (st(S).pvMin == null ? S.pv : st(S).pvMin) >= 15 },
};
// 25/11 (l'utilisateur, choix « défis du jour ») : les défis du FLASH ; 2 tirés chaque jour (defis-jour.js), +★ par défi réussi
const FLASH_DEFIS = {
  sansBesace: { e:'🎒', n:'Ne jamais ranger de dé dans la besace', ok:S => !st(S).besace },
  sansRune:   { e:'✦', n:'Ne jamais utiliser de Rune', ok:S => !st(S).runes },
  sansRelance:{ e:'🎲', n:'Ne jamais relancer les dés', ok:S => !st(S).relances },
  chaine:     { e:'⛓', n:'Faire tomber 2 cartes dans le même tour', ok:S => S.chaineMax >= 2 },
  heroique:   { e:'⚡', n:'Utiliser 2 fois le pouvoir de ton héros', ok:S => (st(S).pouvoir || 0) >= 2 },
  rapide:     { e:'⏱', n:'Gagner en 6 tours ou moins', ok:S => S.tour <= 6 },
};
const st = S => S.st || (S.st = {});
const compte = (S, k) => { st(S)[k] = (st(S)[k] || 0) + 1; };
// l'état de chaque défi de la partie : [{ k, e, n, d, ok }]
const defisEtat = S => (S.defis || []).map(k => Object.assign({ k }, DEFIS[k], { ok:S.fin === 'gagne' && DEFIS[k].ok(S), enCours:!S.fin ? DEFIS[k].ok(S) : null }));

// ------------------------------------------------------------------ les héros : un pouvoir qui se charge avec des dés
const POUVOIRS = {
  maelle:  { n:'Coup d’enclume', d:'Brise 3 sceaux d’un monstre (tu choisis le monstre).', s:() => [sceau('min', 5), sceau('min', 5)], cible:true },
  aldric:  { n:'Mur de lumière', d:'Aucun monstre ne frappe à la fin de ce tour.', s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1)] },
  pip:     { n:'Sève de la forêt', d:'Soigne 6 PV.', s:() => [sceau('max', 3), sceau('max', 3)] },
  oria:    { n:'Longue-vue', d:'Tu gagnes une Rune, et tu vois les cartes cachées jusqu’à la fin de la crypte.', s:() => [sceau('pair'), sceau('imp')] },
  gorm:    { n:'Second souffle', d:'Relance tous tes dés pas encore posés, avec 2 dés de plus.', s:() => [sceau('any'), sceau('any')] }, // 15/11 soir : 2 sceaux au lieu de 3 (Gorm était le plus faible partout)
  zephine: { n:'Tempête', d:'Brise 1 sceau sur chaque monstre visible.', s:() => [sceau('imp'), sceau('imp')] },
};
// ------------------------------------------------------------------ les compagnons (Dice & Fold) : une 2e carte à côté du héros, sa vie, sa compétence
const COMPAGNONS = {
  moustache:{ e:'🐱', n:'Moustache', pv:8,  d:'+1 relance ce tour, et un dé de plus.', s:() => [sceau('imp'), sceau('pair')] },
  braise:   { e:'🦎', n:'Braise', pv:10, d:'Brise 2 sceaux du monstre qui frappe le plus fort.', s:() => [sceau('min', 4), sceau('min', 4)] },
  caillou:  { e:'🪨', n:'Caillou', pv:20, d:'+6 au bouclier. (Il est lent, mais il encaisse.)', s:() => [sceau('tot', 10)] },
  luciole:  { e:'✨', n:'Luciole', pv:6,  d:'Soigne ton héros de 5.', s:() => [sceau('max', 2), sceau('max', 2)] },
  renard:   { e:'🦊', n:'Filou', pv:9,  d:'+3 pièces d’or et un dé de couleur au hasard.', s:() => [sceau('ex', 6)] },
  chouette: { e:'🦉', n:'Chouette', pv:8, d:'Fait taire tous les monstres : ils ne font rien à la fin de ce tour.', s:() => [sceau('dbl', 0, 1), sceau('dbl', 0, 1), sceau('any')] },
};

// ------------------------------------------------------------------ LA RÈGLE DU JOUR (15/11 soir) : la crypte du jour et la descente du jour ont une règle en plus,
// la même pour tout le monde ce jour-là (tirée de la date).
const REGLES = {
  riche:   { e:'🪙', n:'Jour de fortune', d:'Les monstres lâchent deux fois plus d’or.' },
  chaos:   { e:'🌈', n:'Pluie de couleurs', d:'Trois fois plus de dés de couleur.' },
  presse:  { e:'⏳', n:'Le Maître est pressé', d:'Le Maître des cryptes arrive 2 tours plus tôt (au tour 6 dans la crypte du jour).' },
  lourd:   { e:'🏋', n:'Main lourde', d:'Un dé de plus à chaque tour, mais tous les monstres frappent 1 de plus.' },
  precis:  { e:'🎯', n:'Main sûre', d:'Pas de relance, mais tu commences chaque combat avec 2 Runes.' },
  creuset: { e:'🔥', n:'Creuset bouillant', d:'Le creuset plein donne 2 Runes au lieu d’une.' },
  chaines: { e:'⛓', n:'Chaînes d’or', d:'Chaque chaîne (2 monstres ou plus dans le même tour) soigne 3 PV.' },
};
const regleDuJour = jour => { let h = 0; for (const c of String(jour)) h = (h * 31 + c.charCodeAt(0)) >>> 0; const k = Object.keys(REGLES); return k[h % k.length]; };

// ------------------------------------------------------------------ les CONSOMMABLES (15/11 soir, la Descente) : dans la poche (3 au plus), utilisés une fois, sans dé
const CONSOS = {
  potion: { e:'🧪', n:'Potion', d:'+12 PV.' },
  bombe:  { e:'💣', n:'Bombe', d:'Brise 2 sceaux du monstre qui frappe le plus fort.' },
  de6:    { e:'🎲', n:'Dé d’or', d:'Ajoute un dé de 6 à ce tour.' },
  fumee:  { e:'💨', n:'Fumigène', d:'Les monstres ne font rien à la fin de ce tour.' },
  rune:   { e:'✦', n:'Éclat de rune', d:'+1 Rune.' },
};
function conso(S, i) {
  if (S.fin || !S.consos || !S.consos[i]) return 'Rien ici.';
  const k = S.consos[i];
  if (k === 'de6' && S.aLancer) return 'Lance d’abord tes dés !';
  if (k === 'potion') { const a = S.pv; S.pv = Math.min(S.pvmax, S.pv + 12); log(S, `🧪 Potion : +${S.pv - a} PV.`); }
  if (k === 'bombe') { const V = visibles(S).slice().sort((a, b) => force(S, b) - force(S, a)); if (!V[0]) return 'Aucun monstre.'; V[0].sceaux.filter(s => !s.ok).slice(0, 2).forEach(brise); log(S, `💣 Bombe sur ${V[0].nom} !`); S.consos.splice(i, 1); verifie(S, V[0]); return 'ok'; }
  if (k === 'de6') { S.des.push({ id:'d' + S.seq++, v:6 }); log(S, '🎲 Dé d’or : un 6 de plus.'); }
  if (k === 'fumee') { S.taire = true; log(S, '💨 Fumigène : les monstres ne verront rien ce tour-ci.'); }
  if (k === 'rune') { if (S.runes >= RUNES_MAX) return 'Tu as déjà 3 Runes.'; S.runes++; log(S, '✦ Éclat de rune : +1 Rune.'); }
  S.consos.splice(i, 1); return 'ok';
}

// ------------------------------------------------------------------ les intentions (15/11, retour de l'utilisateur : « ça ressemblait pas à Dice & Fold »)
const INTENTIONS = {
  frappe:{ e:'⚔', n:'Frappe', d:'frappe ton héros de sa force' },
  charge:{ e:'⏳', n:'Prépare un gros coup', d:'ne frappe pas ce tour-ci, mais frappera DOUBLE au tour suivant' },
  garde: { e:'🛡', n:'Se protège', d:'ne frappe pas, mais referme un de ses sceaux brisés' },
  soin:  { e:'💚', n:'Soigne', d:'ne frappe pas, mais referme un sceau brisé d’un monstre voisin' },
  rien:  { e:'💤', n:'Se tait', d:'ne fait rien ce tour-ci' },
};
function intention(S, c) {
  c.vise = null;
  if (c.special) { c.it = c.special === 'piege' ? 'frappe' : 'rien'; c.double = false; return; } // 15/11 soir : les cartes spéciales
  if (c.charge) { c.it = 'frappe'; c.double = true; c.charge = false; }
  else {
    c.double = false; const r = RS(S)();
    if (c.niv <= 1) c.it = 'frappe';
    else {
      const table = c.gardien ? [['frappe', .6], ['charge', .2], ['garde', .2]] : c.niv === 2 ? [['frappe', .7], ['charge', .15], ['garde', .15]] : [['frappe', .55], ['charge', .15], ['garde', .15], ['soin', .15]];
      let a = 0; c.it = 'frappe'; for (const [k, p] of table) { a += p; if (r < a) { c.it = k; break; } }
    }
  }
  // un monstre sur trois vise le compagnon (s'il en a un, vivant)
  if (c.it === 'frappe' && S.comp && S.comp.pv > 0 && RS(S)() < .33) c.vise = 'comp';
}
// la force d'un monstre ce tour-ci (chef, meneur, maître, marché du diable)
function force(S, c, V) {
  V = V || visibles(S);
  let f = c.att + V.filter(x => x !== c && x.trait === 'chef').length + (S.obj && S.obj.diable ? 1 : 0) + (S.obj && S.obj.pactesang ? 1 : 0) + (S.obj && S.obj.forcePlus || 0);
  if (!S.gardien) { const i = V.indexOf(c), col = k => V[k]; [i - 1, i + 1].forEach(k => { if (col(k) && col(k).trait === 'voisins') f++; }); }
  return Math.round(f * (S.fd || 1)) * (c.double ? 2 : 1); // 27/11 soir : S.fd = les coups suivent les PV gagnés par le héros
}
// ce que chaque monstre visible fera à la fin du tour (pour l'écran : « Gobelin 2 + Harpie 1 »)
function intentions(S) {
  const V = visibles(S);
  return V.map(c => { const it = S.taire || (c.special && c.special !== 'piege') ? 'rien' : (c.it || 'frappe'); return { id:c.id, nom:c.nom, it, vise:c.vise, v:it === 'frappe' && !S.voile ? force(S, c, V) : 0 }; });
}

// ------------------------------------------------------------------ une partie
// bonus (optionnel) : ce que le héros apporte de sa progression (étoiles, équipement) : { pv, bouclier, relance, des }
// opts (optionnel, la Descente) : { cols:[[niv du fond…, niv du dessus], …], gardien:'fin'|'seul'|false, etage, pv, pvmax, obj:{}, comp:{id,pv}, or,
//   maitre:N (le Maître des cryptes arrive après N tours), couleur:chance de dé de couleur }
// 15/11 soir : le suivi de la force du héros dans la Crypte (réglé au simulateur) : +SUIVI_FORCE de force par point de facteur au-dessus de 1,
// +1 sceau par tranche de SUIVI_SCEAU (3 au plus)
// 27/11 soir (l'utilisateur : « mon personnage a +200 PV, certains modes sont faciles ») : les COUPS des monstres suivent aussi les PV gagnés
// par le héros (S.fd = 1 + SUIVI_COUPS × PV gagnés / PV de base, au plus FD_MAX) : ses PV en plus ne rendent plus la Crypte triviale
let SUIVI_COUPS = 0.7, FD_MAX = 2; // simulateur 27/11 soir (héros façon Fez : +60 PV) : 0 → 89 % (Zéphine 100 %), 0,6 → 87 %, 0,8 → 78 %, 0,7 retenu
let SUIVI_FORCE = 0.75, SUIVI_SCEAU = 3; // simulateur : héros montés 87-89 % (débutant 82 %)
function nouvelle(heros, graine, bonus = {}, opts = {}) {
  const R = rng(graine); let n = 0;
  // 15/11 soir : les monstres suivent la force du héros (bonus.fs, voir heros-etoiles.js) : +1 de force par tranche de 0,5
  const fsPlus = Math.max(0, Math.round(((bonus.fs || 1) - 1) * SUIVI_FORCE));
  const etage = opts.etage || 0, plus = Math.max(0, etage - 1) + fsPlus;
  const cols = [];
  if (opts.gardien !== 'seul') {
    const plan = opts.cols || (opts.variante && VARIANTES[opts.variante] ? VARIANTES[opts.variante].plan : Array.from({ length:NB_COL }, () => [4, 3, 2, 1]));
    const fv = opts.variante && VARIANTES[opts.variante] ? VARIANTES[opts.variante].force || 0 : 0;
    // 15/11 soir : les monstres suivent aussi par leurs SCEAUX (un héros très monté a plus de dés) : +1 sceau par tranche de 1,5 de force, 3 au plus
    const fsSceaux = Math.min(3, Math.floor(((bonus.fs || 1) - 1) / SUIVI_SCEAU));
    for (const p of plan) { const col = p.map(niv => { const c = carte(R, niv, n++, plus + (niv >= 3 ? fv : 0)); for (let k = 0; k < fsSceaux; k++) c.sceaux.push(sceau('min', 3 + Math.min(2, niv >> 1))); return c; }); if (col.length) col[col.length - 1].vue = true; cols.push(col); }
    // 15/11 soir : des cartes spéciales cachées dans les colonnes (jamais au fond ni sur le dessus)
    if (opts.speciales) { const places = []; cols.forEach((col, i) => col.forEach((c, j) => { if (j > 0 && j < col.length - 1) places.push([i, j]); }));
      const sortes = ['coffre', 'autel', 'piege', 'coffre']; for (let k = 0; k < opts.speciales && places.length; k++) { const [i, j] = places.splice(Math.floor(R() * places.length), 1)[0]; places.forEach(q => { if (q[0] === i && q[1] >= j) q[1]++; }); cols[i].splice(j, 0, speciale(R, sortes[(k + Math.floor(R() * 3)) % sortes.length], n++)); } } // ajoutées EN PLUS des monstres (sinon la crypte devenait trop facile)
  }
  const pvmax = opts.pvmax || PV_HEROS + (bonus.pv || 0);
  const obj = opts.obj || {};
  const S = { combosOn:!!opts.combos, heros, graine, cols, gardien:null, pv:opts.pv != null ? opts.pv : pvmax, pvmax, tour:0, des:[], relance:1, reserve:Array(Math.max(0, RESERVE + (obj.besace || 0))).fill(null),
    bouclier:Math.min(14, (bonus.bouclier || 0) + 4 * (obj.aube || 0)), /* 28/11 : bouclier de départ plafonné (il n'avait plus jamais perdu un PV) */ relanceBase:1 + (bonus.relance || 0) + (obj.gobelet || 0), desPlus:(bonus.des || 0) + (obj.sac || 0) + (obj.diable || 0),
    creuset:Array(6).fill(false), runes:Math.min(RUNES_MAX, obj.rune || 0), pouvoir:POUVOIRS[heros].s(), pret:false, voile:false, taire:false, voitTout:false, score:0, chaine:0, chaineMax:0,
    tombes:0, fin:null, journal:[], seq:0, rs:Math.floor(R() * 4294967296),
    // la Descente
    or:opts.or || 0, orGagne:0, obj, etage, maitre:opts.maitre || 0, couleur:opts.couleur != null ? opts.couleur : .07, gardienMode:opts.gardien == null ? 'fin' : opts.gardien,
    bonusF:Array.isArray(opts.bonusF) && opts.bonusF.some(Boolean) ? opts.bonusF.slice(0, 6).map(x => x | 0) : null, vies:opts.vies || (opts.gardien == null ? 3 : 1), regle:opts.regle || null, consos:opts.consos ? opts.consos.slice() : null, comp:opts.comp && COMPAGNONS[opts.comp.id] ? { id:opts.comp.id, pv:opts.comp.pv, pvmax:COMPAGNONS[opts.comp.id].pv, sceaux:COMPAGNONS[opts.comp.id].s(), pret:false } : null,
    secours:!!opts.secours, paires:{}, variante:opts.variante || null, st:{}, nbSpeciales:cols.reduce((t, k) => t + k.filter(c => c.special).length, 0),
    defis:opts.defis ? (() => { const l = Object.keys(DEFIS).slice(); const out = []; while (out.length < 3) out.push(l.splice(Math.floor(R() * l.length), 1)[0]); return out; })() : null };
  if (S.couleur && obj.prisme) S.couleur *= 1 + obj.prisme;
  // la règle du jour
  const rg = S.regle;
  if (rg === 'chaos') S.couleur = (S.couleur || .07) * 3;
  if (rg === 'presse') S.maitre = Math.max(2, (S.maitre || 8) - 2);
  if (rg === 'lourd') { S.desPlus++; obj.forcePlus = (obj.forcePlus || 0) + 1; }
  if (rg === 'precis') { S.relanceBase = 0; S.runes = Math.min(RUNES_MAX, S.runes + 2); }
  if (fsPlus) S.fsPlus = fsPlus;
  if (bonus.pv > 0 && !opts.pvmax) S.fd = Math.round(Math.min(FD_MAX, 1 + SUIVI_COUPS * bonus.pv / PV_HEROS) * 100) / 100;
  if (opts.gardien === 'seul') { S.gardien = gardien(R, etage, S.vies, S.fsPlus || 0); S.gardien.it = 'frappe'; for (let k = 0; k < (obj.bossDur || 0); k++) S.gardien.sceaux.push(sceau('min', 4)); }
  if (obj.eliteDur) cols.forEach(col => col.forEach(c => { if (c.elite) c.sceaux.push(sceau('tot', 9)); }));
  if (obj.talisman) { S.pouvoir.slice(0, obj.talisman).forEach(brise); if (S.pouvoir.every(x => x.ok)) S.pret = true; } // 15/11 soir : tout brisé = prêt
  if (obj.entree) visibles(S).forEach(c => { const s = c.sceaux.find(x => !x.ok); if (s) brise(s); });
  debutTour(S); return S;
}
const log = (S, t) => { S.journal.unshift(t); S.journal.length = Math.min(S.journal.length, 30); };
const visibles = S => S.gardien ? [S.gardien] : S.cols.filter(c => c.length).map(c => c[c.length - 1]);
const trouve = (S, id) => visibles(S).find(c => c.id === id);
// 28/11 (l'utilisateur : « j'avais tellement de dés que je relançais en boucle ») : 7 dés par tour au plus
const DES_MAX = 7;
const nbDes = S => Math.min(DES_MAX, NB_DES + (S.desPlus || 0)) - visibles(S).filter(c => c.trait === 'gel').length;
const tire = S => { const R = RS(S), d = { id:'d' + S.seq++, v:de6(R) }; if (R() < S.couleur) d.c = pick(R, Object.keys(COULEURS)); return d; };
const silence = S => visibles(S).some(c => c.trait === 'silence');
const plafond = S => visibles(S).some(c => c.trait === 'plafond');

function debutTour(S) {
  S.tour++; S.relance = S.relanceBase == null ? 1 : S.relanceBase; // 15/11 soir : 0 relance = vraiment 0 (« Main sûre »)
  S.chaine = 0; S.voile = false; S.taire = false; S.paires = {}; S.combos = {}; S.posesTour = []; // 28/11 : cette remise à zéro était tombée dans le commentaire au-dessus (mur d'Aldric et silence de la Chouette duraient tout le combat)
  // le Maître des cryptes (Dice & Fold) : après N tours, chaque nouveau tour rend tous les monstres plus forts
  if (S.maitre && S.tour > S.maitre) { visibles(S).forEach(c => c.att++); log(S, `👹 Le Maître des cryptes s’impatiente : tous les monstres +1 de force.`); S.maitreLa = true; }
  visibles(S).forEach(c => intention(S, c));
  visibles(S).forEach(c => { if (c.trait === 'repousse') { const s = c.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; log(S, `🌱 ${c.nom} : un sceau se referme.`); } } });
  const garde = S.reserve.filter(x => x != null); S.reserve = Array(Math.max(0, RESERVE + (S.obj.besace || 0))).fill(null);
  S.aLancer = true; // 15/11 soir : les dés restent cachés jusqu'à ce que le joueur les lance (il voit le lancer)
  S.des = garde.map(g => Object.assign({ id:'d' + S.seq++, garde:true }, typeof g === 'object' ? g : { v:g }));
  for (let i = 0; i < nbDes(S); i++) S.des.push(tire(S));
}
// lancer les dés du tour (ils sont déjà tirés, cachés : le lancer les montre)
function lancer(S) { if (S.fin || !S.aLancer) return false; S.aLancer = false; return true; }
// relancer : tous les dés pas encore posés, sauf ceux sortis de la besace (un dé de couleur relancé garde sa couleur)
function relancer(S) {
  if (S.fin || S.relance < 1 || S.aLancer) return false;
  S.relance--; compte(S, 'relances'); S.des.forEach(d => { if (!d.garde) d.v = de6(RS(S)); }); return true;
}
function gagneOr(S, n, pourquoi) { if (n <= 0) return; if (S.regle === 'riche') n *= 2; S.or += n; S.orGagne += n; if (pourquoi) log(S, `🪙 +${n} or (${pourquoi}).`); }
// 24/11 (l'utilisateur) : creuset plein = choisir une Rune OU 🛡 +6 ; l'écran pose S.choixCreuset = true (les simulateurs, non : Rune d'office)
function creusetPlein(S) {
  if (S.choixCreuset) { S.creuset = Array(6).fill(false); compte(S, 'creusets'); S.creusetAChoisir = (S.creusetAChoisir || 0) + 1; log(S, '✦ Le creuset est plein : une Rune ou du bouclier ?');
    if (S.obj.creusetor) { gagneOr(S, 3 * S.obj.creusetor, 'creuset doré'); S.bouclier += 3 * S.obj.creusetor; } return; }
  S.creuset = Array(6).fill(false); compte(S, 'creusets'); if (S.runes < RUNES_MAX) S.runes++; if (S.regle === 'creuset' && S.runes < RUNES_MAX) S.runes++; log(S, S.regle === 'creuset' ? '✦ Creuset bouillant : deux Runes !' : '✦ Le creuset est plein : une Rune !');
  if (S.obj.creusetor) { gagneOr(S, 3 * S.obj.creusetor, 'creuset doré'); S.bouclier += 3 * S.obj.creusetor; }
}
function choisirCreuset(S, quoi) {
  if (!S.creusetAChoisir) return false; S.creusetAChoisir--;
  const fois = S.regle === 'creuset' ? 2 : 1;
  if (quoi === 'bouclier') { S.bouclier += 6 * fois; log(S, `🛡 Le creuset te protège : +${6 * fois} de bouclier.`); }
  else { for (let k = 0; k < fois; k++) if (S.runes < RUNES_MAX) S.runes++; log(S, fois > 1 ? '✦ Creuset bouillant : deux Runes !' : '✦ Une Rune !'); }
  return true;
}
// 28/11 (choix de l'utilisateur, façon Balatro) : LES COMBOS DE DÉS (Descente : opts.combos). Un dé ne va toujours que sur un sceau,
// mais les dés POSÉS dans le même tour (sur les monstres, le pouvoir, le compagnon) forment des combos ; chacun ne compte qu'une fois par tour.
const COMBOS = [
  { k:'paire', e:'👯', n:'Paire', d:'+2 bouclier', ok:c => Math.max(...c) >= 2 },
  { k:'suite3', e:'📶', n:'Petite suite', d:'+1 relance', ok:(c, v) => suiteDe(v, 3) },
  { k:'brelan', e:'🎲', n:'Brelan', d:'brise 1 sceau du monstre le plus fort', ok:c => Math.max(...c) >= 3 },
  { k:'carre', e:'💎', n:'Carré', d:'+1 Rune', ok:c => Math.max(...c) >= 4 },
  { k:'suite5', e:'🌈', n:'Grande suite', d:'brise 1 sceau sur chaque monstre visible', ok:(c, v) => suiteDe(v, 5) },
];
function suiteDe(v, n) { const u = [...new Set(v)].sort((a, b) => a - b); let l = 1, m = 1; for (let i = 1; i < u.length; i++) { l = u[i] === u[i - 1] + 1 ? l + 1 : 1; m = Math.max(m, l); } return m >= n; }
function combos(S, v) {
  if (!S.combosOn) return; S.posesTour = S.posesTour || []; S.posesTour.push(v); S.combos = S.combos || {};
  const cpt = {}; S.posesTour.forEach(x => cpt[x] = (cpt[x] || 0) + 1); const n = Object.values(cpt);
  for (const C of COMBOS) { if (S.combos[C.k] || !C.ok(n, S.posesTour)) continue; S.combos[C.k] = true; S.nbCombos = (S.nbCombos || 0) + 1;
    if (C.k === 'paire') S.bouclier += 2;
    else if (C.k === 'suite3') S.relance++;
    else if (C.k === 'brelan') { const m = visibles(S).filter(c => c.sceaux.some(x => !x.ok)).sort((a, b) => b.att - a.att)[0]; if (m) { brise(m.sceaux.find(x => !x.ok)); verifie(S, m); } }
    else if (C.k === 'carre') { if (S.runes < RUNES_MAX) S.runes++; }
    else if (C.k === 'suite5') { visibles(S).forEach(c => { const x = c.sceaux.find(y => !y.ok); if (x) brise(x); }); visibles(S).slice().forEach(c => verifie(S, c)); }
    log(S, `${C.e} Combo ${C.n} : ${C.d} !`); (S.comboFx = S.comboFx || []).push(C.k); } }
// poser le dé id sur : { carte:id, s:index } · { pouvoir:index } · { comp:index } · { creuset:true } · { reserve:true } · { couleur:true } (effet spécial)
function placer(S, idDe, ou) {
  if (S.fin) return 'fin';
  if (S.aLancer) return 'Lance d’abord tes dés !';
  const i = S.des.findIndex(d => d.id === idDe); if (i < 0) return 'de';
  const D = S.des[i], v = D.v;
  if (ou.couleur) return effetCouleur(S, i);
  if (ou.creuset) { if (S.creuset[v - 1]) return 'Cette case du creuset est déjà pleine.'; S.creuset[v - 1] = true; S.des.splice(i, 1);
    if (S.creuset.every(Boolean)) { creusetPlein(S); return 'rune'; } return 'ok'; }
  if (ou.reserve) { const k = S.reserve.indexOf(null); if (k < 0) return 'La besace est pleine.'; S.reserve[k] = D.c ? { v, c:D.c } : v; S.des.splice(i, 1); compte(S, 'besace'); return 'ok'; }
  if (plafond(S) && v >= 5) return 'Chaînes lourdes : pas de 5 ni de 6 !';
  if (ou.pouvoir != null) { const s = S.pouvoir[ou.pouvoir]; if (!s || !accepte(s, v, S.pouvoir)) return 'Ce dé ne va pas sur ce sceau.'; pose(s, v, S.obj.aiguise); S.des.splice(i, 1); combos(S, v);
    if (S.pouvoir.every(x => x.ok)) { S.pret = true; log(S, `⚡ ${POUVOIRS[S.heros].n} est prêt !`); } return 'ok'; }
  if (ou.comp != null) { const C = S.comp; if (!C || C.pv <= 0) return 'Pas de compagnon.'; const s = C.sceaux[ou.comp]; if (!s || !accepte(s, v, C.sceaux)) return 'Ce dé ne va pas sur ce sceau.'; pose(s, v, S.obj.aiguise); S.des.splice(i, 1); combos(S, v);
    if (C.sceaux.every(x => x.ok)) { C.pret = true; log(S, `${COMPAGNONS[C.id].e} ${COMPAGNONS[C.id].n} est prêt !`); } return 'ok'; }
  const c = trouve(S, ou.carte); if (!c) return 'Ce monstre est caché.';
  const s = c.sceaux[ou.s], fb = S.bonusF ? S.bonusF[v - 1] | 0 : 0; if (!s || !accepte(s, v, c.sceaux, fb)) return 'Ce dé ne va pas sur ce sceau.';
  pose(s, v, (S.obj.aiguise || 0) + (s.t === 'tot' ? fb : 0)); S.des.splice(i, 1); if (fb && (s.t === 'min' || s.t === 'tot')) log(S, `⚒ Dé forgé : ${v} +${fb} = ${v + fb}.`);
  if (c.trait === 'epines') { degats(S, 1); log(S, `🌵 Épines : −1 PV.`); }
  if (c.trait === 'faible' && D.c === 'rouge') { c.sceaux.forEach(brise); log(S, `🎯 Point faible ! ${c.nom} s’effondre.`); }
  if (v === 6 && S.obj.six) S.bouclier += S.obj.six;
  S.paires[v] = (S.paires[v] || 0) + 1; if (S.paires[v] === 2 && S.obj.bourse) gagneOr(S, S.obj.bourse, 'paire');
  verifie(S, c); combos(S, v); return 'ok';
}
// un dé de couleur utilisé pour son effet spécial
function effetCouleur(S, i) {
  const D = S.des[i], v = D.v;
  if (!D.c) return 'Ce dé n’a pas de couleur.';
  if (D.c === 'rouge') { const a = S.pv; S.pv = Math.min(S.pvmax, S.pv + v); log(S, `❤ Dé rouge : +${S.pv - a} PV.`); }
  if (D.c === 'gris') { S.bouclier += v; log(S, `🛡 Dé gris : bouclier +${v}.`); }
  if (D.c === 'orange') { const V = visibles(S).slice().sort((a, b) => force(S, b) - force(S, a)); if (!V.length) return 'Aucun monstre.'; V[0].att = Math.max(0, V[0].att - 1); log(S, `🔻 Dé orange : ${V[0].nom} perd 1 de force.`); }
  if (D.c === 'bleu') {
    let s = !S.pret && S.pouvoir.find(x => !x.ok), quoi = 'pouvoir';
    if (!s && S.comp && S.comp.pv > 0 && !S.comp.pret) { s = S.comp.sceaux.find(x => !x.ok); quoi = 'comp'; }
    if (!s) return 'Rien à charger.';
    brise(s); log(S, '⚡ Dé bleu : un sceau se brise.');
    if (quoi === 'pouvoir' && S.pouvoir.every(x => x.ok)) S.pret = true;
    if (quoi === 'comp' && S.comp.sceaux.every(x => x.ok)) S.comp.pret = true;
  }
  S.des.splice(i, 1); return 'ok';
}
function verifie(S, c) {
  if (!c.sceaux.every(s => s.ok)) return;
  S.chaine++; S.chaineMax = Math.max(S.chaineMax, S.chaine); S.tombes++;
  const gain = 10 * c.niv * S.chaine; S.score += gain;
  log(S, `💀 ${c.nom} tombe${S.chaine > 1 ? ` · chaîne ×${S.chaine}` : ''} (+${gain}).`);
  gagneOr(S, S.obj.moinsOr ? (c.gardien ? 6 + 3 * S.etage : c.elite ? 3 : 1) : c.gardien ? ((c.vies || 1) > 1 ? 2 : 8 + 4 * S.etage) : c.elite ? 5 : c.niv >= 3 ? 2 : 1);
  if (S.chaine >= 2 && S.obj.chaineor) gagneOr(S, 2 * S.obj.chaineor, 'chaîne d’or');
  if (S.chaine >= 2 && S.regle === 'chaines') { S.pv = Math.min(S.pvmax, S.pv + 3); log(S, '⛓ Chaîne : +3 PV.'); }
  if (c.special) compte(S, 'speciales');
  if (c.special === 'coffre') { const g = c.gain; if (g === 'rune') S.runes = Math.min(RUNES_MAX, S.runes + 1); if (g === 'soin') S.pv = Math.min(S.pvmax, S.pv + 10); if (g === 'bouclier') S.bouclier += 6; if (g === 'or') gagneOr(S, 6); log(S, `🧰 Le coffre s’ouvre : ${GAINS_COFFRE[g].n} !`); }
  if (c.special === 'autel') { S.pret = true; S.pouvoir.forEach(brise); log(S, `🕯️ L’autel s’illumine : ${POUVOIRS[S.heros].n} est prêt !`); }
  if (c.special === 'piege') { gagneOr(S, 3, 'piège désamorcé'); log(S, '⚙️ Le piège est désamorcé.'); }
  if (c.trait === 'rancune') { degats(S, c.att); log(S, `💢 Rancune : ${c.nom} frappe en tombant (${c.att}).`); }
  if (c.trait === 'tresor') { const vides = S.creuset.map((x, k) => x ? -1 : k).filter(k => k >= 0); if (vides.length) { S.creuset[pick(RS(S), vides)] = true; log(S, '💎 Trésor : une case du creuset se remplit.');
      if (S.creuset.every(Boolean)) creusetPlein(S); } }
  if (c.gardien && (c.vies || 1) > 1) {
    c.vies--; c.sceaux = sceauxGardien(RS(S), S.etage + (S.etage ? 1 : 0)); if (!S.etage) c.sceaux.splice(c.viesMax - c.vies >= 2 ? 3 : 4, 9); c.att = S.etage ? c.att + 1 : 3; c.relevé = true; // 22/11 : Crypte classique : 2e phase à 5 sceaux, sa Furie repart de 3
    // 22/11 (l'utilisateur : « dommage que le boss n'ait qu'une seule phase ») : à sa 2e phase, chaque Gardien change de comportement
    // 22/11 (l'utilisateur : « normalement c'est toujours 3 phases ») : 3e phase, une seconde arme
    const P3 = !S.etage && PHASE3[c.m]; if (P3 && c.viesMax - c.vies === 2) { c.trait = P3[0]; c.phase = 3; log(S, `♛ ${c.nom} se relève une dernière fois, ${P3[1]} Nouveaux sceaux, et une nouvelle arme : ${TRAITS[P3[0]].e} ${TRAITS[P3[0]].n} : ${TRAITS[P3[0]].d}`); return; }
    const P2 = PHASE2[c.m]; if (P2 && c.viesMax - c.vies === 1) { c.trait = P2[0]; c.phase = 2; log(S, `♛ ${c.nom} se relève, ${P2[1]} Nouveaux sceaux, et une nouvelle arme : ${TRAITS[P2[0]].e} ${TRAITS[P2[0]].n} : ${TRAITS[P2[0]].d}`); return; }
    log(S, `♛ ${c.nom} se relève ! Nouveaux sceaux, et il frappe 1 de plus (encore ${c.vies} vie${c.vies > 1 ? 's' : ''}).`); return;
  }
  if (c.gardien) { S.gardien = null; S.score += 200 + 10 * S.pv; S.fin = 'gagne'; log(S, '🏆 Le Gardien est vaincu !'); return; }
  const col = S.cols.find(k => k[k.length - 1] === c); col.pop();
  if (c.trait === 'mue') { const b = carte(RS(S), 1, 'm' + S.seq++); b.nom = 'Larve de ' + c.nom.split(' ')[0]; b.m = 'larve'; b.vue = true; b.it = 'frappe'; b.mueDe = true; col.push(b); log(S, `🐛 Mue : une larve sort de ${c.nom} !`); }
  else if (col.length) { col[col.length - 1].vue = true; col[col.length - 1].it = col[col.length - 1].special && col[col.length - 1].special !== 'piege' ? 'rien' : 'frappe'; log(S, `🂠 Une carte se retourne : ${col[col.length - 1].nom}.`); }
  if (S.cols.every(k => !k.length)) {
    if (S.gardienMode === false) { S.fin = 'gagne'; S.score += 5 * S.pv; log(S, '🏆 La salle est vidée !'); return; }
    S.gardien = gardien(RS(S), S.etage, S.vies, S.fsPlus || 0); S.gardien.it = 'frappe'; log(S, `🔥 Les colonnes sont vides… ${S.gardien.nom} se réveille !`);
  }
}
// la Rune : brise n'importe quel sceau d'un monstre visible
function rune(S, idCarte, k) {
  if (S.fin || S.runes < 1) return false; const c = trouve(S, idCarte); if (!c || !c.sceaux[k] || c.sceaux[k].ok) return false;
  S.runes--; compte(S, 'runes'); brise(c.sceaux[k]); log(S, `✦ Rune : un sceau de ${c.nom} vole en éclats.`); verifie(S, c); return true;
}
// le pouvoir du héros (une fois chargé)
function pouvoir(S, opt = {}) {
  if (S.fin || !S.pret) return false; if (silence(S)) { log(S, '🤐 Silence : ton pouvoir ne peut pas agir.'); return false; }
  const P = POUVOIRS[S.heros];
  if (S.heros === 'maelle') { const c = trouve(S, opt.carte); if (!c) return false; c.sceaux.filter(s => !s.ok).slice(0, 3).forEach(brise); log(S, `🔨 Coup d’enclume sur ${c.nom}.`); verifie(S, c); }
  else if (S.heros === 'aldric') { S.voile = true; log(S, '🛡 Mur de lumière : personne ne frappe à ce tour.'); }
  else if (S.heros === 'pip') { const av = S.pv; S.pv = Math.min(S.pvmax, S.pv + 6); log(S, `🌿 Sève : +${S.pv - av} PV.`); }
  else if (S.heros === 'oria') { S.runes = Math.min(RUNES_MAX, S.runes + 1); S.voitTout = true; log(S, '🧭 Longue-vue : une Rune, et les cartes cachées se dévoilent.'); }
  else if (S.heros === 'gorm') { S.des.forEach(d => { d.v = de6(RS(S)); d.garde = false; }); for (let k = 0; k < 2; k++) S.des.push(tire(S)); log(S, '📯 Second souffle : nouveaux dés, et deux de plus !'); }
  else if (S.heros === 'zephine') { visibles(S).forEach(c => { const s = c.sceaux.find(x => !x.ok); if (s) brise(s); }); log(S, '🌪 Tempête : un sceau saute sur chaque monstre.'); visibles(S).slice().forEach(c => verifie(S, c)); }
  S.pret = false; S.pouvoir = P.s(); compte(S, 'pouvoir'); return true;
}
// la compétence du compagnon (une fois chargée)
function competence(S) {
  const C = S.comp; if (S.fin || !C || C.pv <= 0 || !C.pret) return false; if (silence(S)) { log(S, '🤐 Silence : ton compagnon ne peut pas agir.'); return false; }
  const K = COMPAGNONS[C.id];
  if (C.id === 'moustache') { S.relance++; S.des.push(tire(S)); }
  if (C.id === 'braise') { const V = visibles(S).slice().sort((a, b) => force(S, b) - force(S, a)); if (V[0]) { V[0].sceaux.filter(s => !s.ok).slice(0, 2).forEach(brise); verifie(S, V[0]); } }
  if (C.id === 'caillou') S.bouclier += 6;
  if (C.id === 'luciole') S.pv = Math.min(S.pvmax, S.pv + 5);
  if (C.id === 'renard') { gagneOr(S, 3); const d = tire(S); d.c = pick(RS(S), Object.keys(COULEURS)); S.des.push(d); }
  if (C.id === 'chouette') S.taire = true;
  log(S, `${K.e} ${K.n} : ${K.d}`);
  C.pret = false; C.sceaux = K.s(); return true;
}
function degats(S, n) {
  if (n <= 0 || S.fin) return; S.pv -= n; st(S).pvMin = Math.min(st(S).pvMin == null ? 999 : st(S).pvMin, Math.max(0, S.pv));
  if (S.pv <= 0 && S.secours) { S.secours = false; S.secoursUtilise = true; S.pv = 10; log(S, '🕯 Dernier souffle : ton héros se relève à 10 PV !'); return; }
  if (S.pv <= 0) { S.pv = 0; S.fin = 'perdu'; log(S, '☠ Ton héros tombe dans la crypte.'); }
}
// combien vont frapper les monstres à la fin de ce tour (affiché en direct) : sur le héros seulement (le compagnon à part)
function menace(S) { return S.voile ? 0 : intentions(S).filter(x => x.vise !== 'comp').reduce((t, x) => t + x.v, 0); }
function menaceComp(S) { return S.voile ? 0 : intentions(S).filter(x => x.vise === 'comp').reduce((t, x) => t + x.v, 0); }
function finTour(S) {
  if (S.fin) return;
  let m = menace(S), mc = menaceComp(S);
  if (mc && S.comp && S.comp.pv > 0) { S.comp.pv = Math.max(0, S.comp.pv - mc); log(S, `🐾 ${COMPAGNONS[S.comp.id].n} encaisse ${mc}${S.comp.pv ? '' : ' et tombe…'}.`); }
  if (m && S.bouclier > 0) { const b = Math.min(S.bouclier, m); S.bouclier -= b; m -= b; log(S, `🛡 Ton bouclier encaisse ${b}.`); }
  if (m) { degats(S, m); log(S, `⚔ Les monstres frappent : −${m} PV.`); }
  if (S.fin) return;
  const V = visibles(S);
  if (!S.taire) V.forEach((c, i) => {
    if (c.it === 'charge') { c.charge = true; log(S, `⏳ ${c.nom} prépare un gros coup…`); }
    if (c.it === 'garde') { const s = c.sceaux.find(x => x.ok && x.t !== 'tot'); if (s) { s.ok = false; s.val = 0; log(S, `🛡 ${c.nom} referme un sceau.`); } }
    if (c.it === 'soin') { const v = [V[i - 1], V[i + 1]].filter(Boolean).map(x => [x, x.sceaux.find(s => s.ok && s.t !== 'tot')]).find(([, s]) => s); if (v) { v[1].ok = false; v[1].val = 0; log(S, `💚 ${c.nom} soigne ${v[0].nom} : un sceau se referme.`); } }
  });
  V.forEach(c => {
    c.age = (c.age || 0) + 1;
    if (c.trait === 'furie') c.att++;
    if (c.trait === 'voleur' && S.or > 0) { S.or--; log(S, `🪙 ${c.nom} te vole 1 pièce.`); }
    if (c.trait === 'horloge' && c.age === 4) { degats(S, 8); log(S, `⏰ ${c.nom} sonne : −8 PV !`); }
  });
  if (S.fin) return;
  S.des = []; debutTour(S);
}
// les étoiles d'une victoire
// 15/11 soir : avec des défis, une étoile par défi réussi (victoire obligatoire) ; sinon l'ancienne règle (la Descente)
const etoiles = S => S.fin !== 'gagne' ? 0 : S.defis ? defisEtat(S).filter(x => x.ok).length : S.flash ? 1 + (S.fdefis ? S.fdefis.filter(k => FLASH_DEFIS[k] && FLASH_DEFIS[k].ok(S)).length : (S.pv >= 10 ? 1 : 0) + (S.tour <= 6 ? 1 : 0)) /* 23/11 : le flash du jour (30 PV) ; 24/11 (l'utilisateur) : 3e étoile = gagner en 6 tours ou moins */ : 1 + (S.pv >= 12 ? 1 : 0) + (S.pv >= 25 ? 1 : 0);

const API = { COMBOS, choisirCreuset, reglerSuivi:(f, sc, co) => { SUIVI_FORCE = f; SUIVI_SCEAU = sc; if (co != null) SUIVI_COUPS = co; }, INTENTIONS, intentions, NB_DES, NB_COL, PROF, RESERVE, RUNES_MAX, PV_HEROS, SCEAU_TXT, TRAITS, POUVOIRS, COMPAGNONS, COULEURS,
  FLASH_DEFIS, REGLES, regleDuJour, VARIANTES, varianteDuJour, SPECIALES, GAINS_COFFRE, DEFIS, defisEtat, CONSOS, conso, nouvelle, lancer, relancer, placer, rune, pouvoir, competence, finTour, visibles, menace, menaceComp, accepte, etoiles, trouve, force, silence, plafond, rng };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.CRYPTE = API;
})(typeof window !== 'undefined' ? window : globalThis);
