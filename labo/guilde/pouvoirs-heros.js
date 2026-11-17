// =============================================================================================== LES POUVOIRS DES HÉROS (16/11 nuit)
// Décidé avec l'utilisateur (16/11, Arbre-competences-proposition.md) : pas de grand arbre à côté. Chaque héros a 4 EMPLACEMENTS
// (Garde, Pouvoir, Passif, Ultime) ; chacun propose 2 ou 3 VERSIONS (A = celle d'aujourd'hui). On choisit hors partie, gratuitement.
// Un seul système : le NIVEAU du héros donne 1 point par niveau, qui fait monter le RANG (1 à 10) d'un emplacement.
// Deux préréglages par héros : « 👥 Groupe » (Chroniques à 2 héros ou plus) et « 🗡 Solo » (le reste).
// Stockage : guilde-etoiles → heros[id].pw = { groupe:{ garde:'B', … }, solo:{ … }, rangs:{ garde:3, … } }.
// Besoin de heros-etoiles.js (lireEtoiles, ecrireEtoiles, etatHerosE, niveauH) ; marche aussi dans node (catalogue seul).
(function (racine) {
'use strict';
// les 4 emplacements et le niveau qui ouvre le CHOIX (avant : version A imposée)
const PW_EMP = [
  { k:'garde', n:'Garde', e:'🛡', niv:5, d:'un dé pour protéger' },
  { k:'pouvoir', n:'Pouvoir', e:'✨', niv:10, d:'une combinaison de dés' },
  { k:'passif', n:'Passif', e:'♾', niv:20, d:'toujours actif' },
  { k:'ultime', n:'Ultime', e:'🌟', niv:100, d:'une combinaison rare, quand la jauge ⚡ est pleine' },
];
const PW_RANG_MAX = 10;
// les rôles classiques (demande de l'utilisateur, 16/11 nuit : « pour ne pas perdre les joueurs »)
const PW_ROLES = { tank:['🛡', 'Tank'], soin:['🌿', 'Soin'], degats:['⚔', 'Dégâts'], controle:['🌀', 'Contrôle'], soutien:['🎵', 'Soutien'] };
// la classe connue de chaque héros, en plus de son nom
const PW_CLASSES = {
  maelle:{ n:'Guerrière', d:'forgeronne', e:'⚒' }, aldric:{ n:'Paladin', d:'protecteur', e:'🏮' }, pip:{ n:'Druidesse', d:'soigneuse', e:'🌿' },
  oria:{ n:'Rôdeuse', d:'éclaireuse, archère', e:'🏹' }, gorm:{ n:'Barde', d:'chant de guerre', e:'📯' }, zephine:{ n:'Mage', d:'tempête et alchimie', e:'🌩' },
};
// les combinaisons (le moteur des Chroniques a les mêmes clés)
const PW_COMBOS = {
  paire:'une paire', paire45:'une paire de 4 ou de 5', paire56:'une paire de 5 ou de 6', brelan:'trois dés identiques', suite3:'une suite de 3',
  suite4:'une suite de 4', pairs3:'trois dés pairs', impairs3:'trois dés impairs', pi3:'trois dés pairs ou trois impairs', diff3:'trois dés différents',
  bas3:'trois dés de 3 ou moins', haut3:'trois dés de 5 ou plus', haut34:'trois dés de 4 ou plus', somme12:'trois dés qui font 12 ou plus',
};
// P(version, nom, rôle, animation, couleur, émoji, combinaison, Duel, Chroniques, sujet de l'image)
const P = (v, n, r, a, c, e, co, duel, chron, img) => ({ v, n, r, a, c, e, co:co || null, duel, chron, img });
const POUVOIRS_H = {
  // ------------------------------------------------------------------ PIP, la Druidesse (Forêt) : soin · contrôle (ronces) · dégâts (la louve)
  pip:{
    garde:[
      P('A', 'Écorce bénie', 'controle', 'ronces', '#5fd36a', '🌳', null, 'Un 1 ou un 2 → Épines 3 ; sinon Bouclier = la valeur.', 'Protéger : bouclier = la valeur du dé ; sur un 1 ou un 2, le protégé gagne aussi des Épines (le prochain monstre qui le frappe perd un sceau).', 'a shield of living tree bark covered in small thorns'),
      P('B', 'Mousse douce', 'soin', 'soin', '#9be38f', '🍃', null, 'Bouclier = la moitié de la valeur, et soigne autant.', 'Protéger : bouclier = la moitié du dé, et le protégé reprend 2 PV.', 'a soft cushion of glowing green moss with tiny healing sparkles'),
      P('C', 'Ronce-garde', 'controle', 'ronces', '#3fa34d', '🌵', null, 'Un 1 à 3 → Bouclier = valeur × 2 ; un 4 à 6 → Bouclier = valeur et une unité adverse est Enracinée.', 'Protéger : bouclier = la valeur ; sur un 1 à 3, le monstre le plus proche du protégé est entravé 1 tour (il ne fait rien).', 'a ring of thorny brambles rising from the ground like a wall'),
    ],
    pouvoir:[
      P('A', 'Appel de la Louve', 'degats', 'louve', '#c58bff', '🐺', 'paire45', '4 dés de 4 ou 5 → 7 dégâts, Bouclier 3, +1 marqueur de Meute.', 'Une paire de 4 ou de 5 → la louve mord : un sceau d’un monstre collé à Pip se brise, et Pip gagne bouclier 3.', 'a spectral violet wolf head howling with glowing eyes'),
      P('B', 'Cercle de vie', 'soin', 'soin', '#7dffb0', '🌸', 'suite3', 'Suite de 3 → soigne ton héros de 6 et chacune de tes unités de 3.', 'Une suite de 3 → Pip et chaque allié à 2 cases reprennent 3 PV (rang 5 : 4 PV ; rang 10 : jusqu’à 3 cases).', 'a glowing circle of blooming flowers with rising green light'),
      P('C', 'Ronces vives', 'controle', 'ronces', '#2f8f3f', '🌿', 'pairs3', '3 dés de 3 ou moins → 2 unités adverses Enracinées et Épines 2 sur ton héros.', 'Trois dés pairs → tous les monstres à 4 cases de Pip sont entravés 1 tour (rang 10 : 2 tours).', 'thick living vines bursting out of the ground and wrapping around'),
    ],
    passif:[
      P('A', 'L’Appel de l’Alpha', 'degats', 'louve', '#b07cff', '🐾', null, 'Chaque 6 lancé pose un marqueur de Meute ; à 3, la Louve arrive et attaque seule à chaque tour.', 'Chaque 6 lancé par Pip pose un marqueur ; à 3 (rang 10 : 2), la louve rejoint Pip pour 3 tours : à chaque fin de tour, elle brise un sceau d’un monstre collé à Pip. Puis elle repart (les marqueurs recommencent à zéro).', 'three glowing wolf paw prints on mossy stone'),
      P('B', 'Ronces vivantes', 'controle', 'ronces', '#4caf50', '🥀', null, 'Tes unités ont Épines 1.', 'Un monstre qui frappe Pip perd un sceau et reste pris dans les ronces : il ne fait rien au tour suivant (sauf le boss).', 'a thorny rose vine coiled like a protective bracelet'),
      P('C', 'Sève partagée', 'soin', 'soin', '#b5f58a', '💧', null, 'Chaque soin donne aussi +1 bouclier à la cible.', 'Chaque soin de Pip donne aussi bouclier 3 à l’allié soigné.', 'a glowing drop of golden-green tree sap'),
    ],
    ultime:[
      P('A', 'L’Éveil du Grand Arbre', 'soin', 'soin', '#7dffb0', '🌳', 'bas3', '3 dés de 3 ou moins → ton héros se soigne de 15, tes unités retrouvent toute leur vie.', 'Trois dés de 3 ou moins → tout le groupe revient à ses PV max ; les héros à terre se relèvent.', 'an immense ancient tree awakening with glowing green light in its branches'),
      P('B', 'La Grande Chasse', 'degats', 'louve', '#a46bff', '🌕', 'haut34', '3 dés de 5 ou plus → la Louve arrive tout de suite en Alpha (6 / 10) et attaque deux fois.', 'Trois dés de 4 ou plus → pendant 3 tours (rang 10 : 4), une louve géante accompagne Pip : à chaque fin de tour, elle brise un sceau de chaque monstre collé à Pip.', 'a giant spectral wolf leaping under a full moon'),
    ],
  },
  // ------------------------------------------------------------------ MAËLLE, la Guerrière (Forge) : dégâts · tank · soutien (la forge)
  maelle:{
    garde:[
      P('A', 'Enclume', 'tank', 'halo', '#ff9a3a', '🛡', null, 'Bouclier = valeur, +2 sur 5-6.', 'Protéger : bouclier = la valeur du dé, +2 sur un 5 ou un 6.', 'a heavy iron anvil glowing hot at the edges'),
      P('B', 'Fer rouge', 'degats', 'feu', '#ff5a2a', '🔥', null, 'Bouclier = valeur −1 et la prochaine attaque +2.', 'Protéger : bouclier = la valeur −1, et +1 sur son prochain sceau « ≥ » ou « Σ ».', 'a glowing red-hot iron bar with sparks'),
      P('C', 'Armure partagée', 'soutien', 'halo', '#ffc06a', '⚙', null, 'Bouclier = valeur, partagé avec une unité.', 'Protéger un allié : lui ET Maëlle reçoivent chacun la moitié du dé (arrondi au-dessus) en bouclier.', 'two interlocking metal pauldrons joined by a chain'),
    ],
    pouvoir:[
      P('A', 'Coup d’enclume', 'degats', 'feu', '#ff8a2a', '🔨', 'paire', '3 identiques → dégâts = la somme.', 'Une paire → un sceau d’un monstre collé à Maëlle se brise ; une paire de 6 en brise deux.', 'a forge hammer striking with a burst of orange sparks'),
      P('B', 'Marteau-pilon', 'degats', 'feu', '#ff4a1a', '⚒', 'paire56', '3 dés de 5+ → 12 dégâts, ignore le bouclier.', 'Une paire de 5 ou de 6 → tous les sceaux « ≥ » d’un monstre collé se brisent (s’il n’en a pas : deux sceaux).', 'a giant steam-powered drop hammer slamming down'),
      P('C', 'Forge de campagne', 'soutien', 'feu', '#ffb84a', '⚙', 'suite3', 'Suite de 3 → tes unités +2 attaque et Bouclier 3.', 'Une suite de 3 → Maëlle et chaque allié collé à elle ont +1 sur les sceaux « ≥ » et « Σ » pendant 3 tours.', 'a small portable forge with glowing coals and tools'),
    ],
    passif:[
      P('A', 'Métal chaud', 'soutien', 'feu', '#ff9a3a', '♨', null, 'Un 6 sur une carte = 1 Braise, 3 Braises = Équipement gratuit.', 'Chaque 6 posé sur un sceau donne une braise ; à 3 braises, tout le groupe gagne bouclier 3.', 'three glowing embers floating above an ingot'),
      P('B', 'Rancune', 'tank', 'halo', '#ff6a3a', '💢', null, 'Frappé → +1 au prochain dé.', 'Chaque fois qu’elle est frappée : +1 sur son prochain sceau « ≥ » ou « Σ » (3 au plus).', 'a dented steel breastplate glowing with angry red light'),
      P('C', 'Coup de forge', 'degats', 'feu', '#ffd27a', '💥', null, 'Tes 6 font +2.', 'Le trait de Maëlle, renforcé : un 6 brise deux sceaux, et au rang 10 un 5 aussi.', 'a hammer head wrapped in golden fire'),
    ],
    ultime:[
      P('A', 'Le Grand Martelage', 'degats', 'feu', '#ff7a1a', '🌋', 'haut34', '3 dés de 4+ → 16 dégâts, unités +2 attaque.', 'Trois dés de 4 ou plus → trois sceaux d’un monstre collé se brisent (le boss d’abord s’il est collé).', 'a colossal glowing hammer coming down in a shower of molten sparks'),
      P('B', 'Rempart vivant', 'tank', 'halo', '#ffc06a', '🏰', 'haut34', '3 dés identiques → tout le groupe ne prend que la moitié des coups 2 tours.', 'Trois dés de 4 ou plus → pendant 2 tours, tout le groupe ne prend que la moitié des coups.', 'a wall of interlocking shields forged from glowing metal'),
    ],
  },
  // ------------------------------------------------------------------ ALDRIC, le Paladin (Lanterne) : tank · lumière (dégâts sacrés) · soutien (commander)
  aldric:{
    garde:[
      P('A', 'Parade de fer', 'tank', 'halo', '#ffd27a', '🛡', null, 'Paire → bouclier × 2, sinon le plus haut.', 'Protéger : bouclier = la valeur ; si un autre de ses dés a la même valeur, il est utilisé aussi et le bouclier double. (Son trait couvre aussi ses voisins.)', 'a polished steel kite shield deflecting a strike with a flash'),
      P('B', 'Contre-attaque', 'degats', 'lumiere', '#fff1a8', '☀', null, 'Bouclier = valeur, renvoie 2 dégâts au prochain coup reçu.', 'Protéger : bouclier habituel, et les protégés gagnent des Épines (le prochain monstre qui les frappe perd un sceau).', 'a shield with a sunburst emblem radiating a counterstrike of light'),
      P('C', 'Bannière', 'soutien', 'lumiere', '#ffe08a', '🚩', null, 'Bouclier = valeur −1 à chacune de tes unités.', 'Protéger : Aldric et chaque allié à 2 cases reçoivent bouclier = la moitié du dé + 1.', 'a tall golden banner with a lantern emblem waving'),
    ],
    pouvoir:[
      P('A', 'Mur de lumière', 'tank', 'lumiere', '#fff6c0', '🧱', 'paire56', 'Deux paires → dégâts, unités Barrière.', 'Une paire de 5 ou de 6 → un mur de lumière : aucun monstre ne frappe à la fin de ce tour.', 'a shimmering wall of golden holy light'),
      P('B', 'Rayon de l’aube', 'degats', 'lumiere', '#ffe36a', '🌅', 'impairs3', '3 dés impairs → 10 dégâts et Handicap.', 'Trois dés impairs → un rayon brise un sceau d’un monstre à 3 cases.', 'a piercing beam of dawn light from a lantern'),
      P('C', 'En avant !', 'soutien', 'onde', '#ffd27a', '📣', 'suite3', 'Suite de 3 → toutes tes unités attaquent tout de suite +1.', 'Une suite de 3 → chaque allié debout reçoit un dé 👣 de 2 pas et +1 sur son prochain sceau « ≥ » ou « Σ ».', 'a raised knight sword pointing forward with golden light trails'),
    ],
    passif:[
      P('A', 'Pureté', 'soutien', 'lumiere', '#fffbe0', '🕊', null, 'Deux 6 → jeton anti-altération.', 'Le Carillon de l’Horloger ne touche jamais Aldric ni les alliés à côté de lui (ils gardent leur plus gros dé).', 'a white dove made of soft light'),
      P('B', 'Lanterne vive', 'degats', 'lumiere', '#ffd96a', '🏮', null, 'Tes dégâts contre les unités Cachées +2.', 'Ses dés comptent +1 sur les sceaux « ≥ » et « Σ » des élites et des boss.', 'a bright brass lantern blazing with holy light'),
      P('C', 'Serment', 'tank', 'halo', '#ffe9a8', '🤝', null, 'Une fois par combat, une unité qui tombe reste à 1 PV.', 'Une fois par partie, Aldric ou un allié à côté de lui qui devait tomber reste à 1 PV.', 'a knight hand on a sword hilt swearing an oath with a golden glow'),
    ],
    ultime:[
      P('A', 'La Lame de l’Aube', 'degats', 'lumiere', '#fff1a8', '⚔', 'haut34', '3 identiques → 16 dégâts et Handicap.', 'Trois dés de 4 ou plus → deux sceaux d’un monstre collé se brisent et il est entravé 1 tour.', 'a radiant longsword blazing like the rising sun'),
      P('B', 'Bastion', 'tank', 'halo', '#ffe08a', '🏯', 'haut34', '3 dés de 4+ → personne ne prend de dégât pendant un tour.', 'Trois dés de 4 ou plus → personne du groupe ne prend de dégât jusqu’au prochain tour.', 'a fortress tower of golden light rising around the party'),
    ],
  },
  // ------------------------------------------------------------------ ORIA, la Rôdeuse (Carte) : contrôle (prévoir) · dégâts à distance · soutien (trésors)
  oria:{
    garde:[
      P('A', 'Repli', 'controle', 'vent', '#5ff5e6', '🌀', null, 'Impair → Esquive, pair → bouclier.', 'Protéger : sur un dé impair, le prochain coup reçu par le protégé est divisé par 2 ; sur un dé pair, bouclier = la valeur.', 'a swirling cloak of wind blurring a figure'),
      P('B', 'Pas de côté', 'degats', 'fleches', '#6fe0ff', '👣', null, 'Bouclier = valeur et 1 dégât à une unité.', 'Protéger Oria : bouclier = la valeur −1, et elle gagne un dé 👣 de 1 pas.', 'a light leather boot leaping sideways with motion lines'),
      P('C', 'Sac de voyage', 'soutien', 'etoile', '#ffd27a', '🎒', null, 'Bouclier = valeur, et pioche une carte sur un 6.', 'Protéger : bouclier = la valeur ; sur un 6, Oria trouve 5 pièces d’or (bourse du groupe).', 'a traveler backpack overflowing with maps and a few gold coins'),
    ],
    pouvoir:[
      P('A', 'Tracé parfait', 'controle', 'etoile', '#7fe9ff', '🧭', 'paire', 'Suite de 4 → choisir une face, 2 cartes, 12 dégâts.', 'Une paire → chaque allié debout : son plus petit dé devient un 5.', 'a glowing compass rose drawing a perfect golden path'),
      P('B', 'Flèche longue', 'degats', 'fleches', '#5ff5e6', '🏹', 'paire', 'Paire de 5+ → 9 dégâts à une unité cachée ou au héros.', 'Une paire → une flèche brise un sceau d’un monstre à 4 cases.', 'a single long arrow flying with a cyan light trail'),
      P('C', 'Coup d’œil', 'soutien', 'etoile', '#a8f5ff', '👁', 'pairs3', 'Tout pair → pioche 3 cartes.', 'Trois dés pairs → Oria voit ce que cachent les meubles à 4 cases (écrit dans le journal) et tous les pièges à 4 cases.', 'a sharp keen eye reflected in a spyglass lens'),
    ],
    passif:[
      P('A', 'Œil du cartographe', 'controle', 'vent', '#5ff5e6', '🗺', null, 'Voit les 2 prochaines faces.', 'Son trait (+2 cases, voit les pièges à 2 cases), renforcé : au rang 5, +1 case de plus à chaque déplacement.', 'an unrolled explorer map with a glowing route'),
      P('B', 'Archère', 'degats', 'fleches', '#4fd6ff', '🎯', null, '+1 dégât à distance.', 'Elle frappe un monstre jusqu’à 2 cases de distance.', 'a curved hunting bow with a nocked arrow'),
      P('C', 'Bonne pioche', 'soutien', 'etoile', '#ffd27a', '🪙', null, '+1 PC au début.', 'Chaque meuble qu’elle fouille donne +2 or au groupe, et sa fouille ne fait jamais de bruit.', 'a small open treasure pouch with gold coins'),
    ],
    ultime:[
      P('A', 'La Carte du monde', 'controle', 'etoile', '#7fe9ff', '🌍', 'suite3', 'Suite de 3 → 15 dégâts et Silence.', 'Une suite de 3 → tous les pièges de la carte se dévoilent et le sablier gagne 3 grains.', 'a huge glowing world map unfolding in the air'),
      P('B', 'Pluie de flèches', 'degats', 'fleches', '#5ff5e6', '☔', 'haut34', '3 dés de 5+ → 6 dégâts à chaque ennemi.', 'Trois dés de 4 ou plus → une pluie de flèches brise un sceau de chaque monstre à 4 cases.', 'a rain of glowing arrows falling from the sky'),
    ],
  },
  // ------------------------------------------------------------------ GORM, le Barde (Cor) : soutien (chant) · tank (dés en plus) · contrôle (tonnerre)
  gorm:{
    garde:[
      P('A', 'Peau épaisse', 'tank', 'halo', '#4f8bff', '🐻', null, 'Bouclier = somme des impairs, 6 → Épines 2.', 'Protéger : bouclier = la valeur, +1 sur un dé impair ; sur un 6, le protégé gagne aussi des Épines.', 'a thick bear-fur cloak with a bronze clasp'),
      P('B', 'Chant protecteur', 'soutien', 'onde', '#6fa8ff', '🎶', null, 'Bouclier = valeur à chaque unité −2.', 'Protéger : Gorm et chaque allié à 2 cases reçoivent bouclier = la moitié du dé.', 'glowing blue musical waves forming a protective dome'),
      P('C', 'Grondement', 'controle', 'onde', '#3f6bff', '🌩', null, 'Bouclier = valeur et l’unité en face perd 1 attaque.', 'Protéger Gorm : bouclier = la valeur, et le monstre collé le plus proche est repoussé d’une case.', 'a deep rumbling sound wave cracking the ground'),
    ],
    pouvoir:[
      P('A', 'Chant de guerre', 'soutien', 'onde', '#4f8bff', '📯', 'pi3', '4 pairs ou impairs → dégâts, unités +2.', 'Trois dés pairs ou trois impairs → tout le groupe a +1 sur les sceaux « ≥ » et « Σ » jusqu’à la fin du tour.', 'a great war horn blowing powerful blue sound waves'),
      P('B', 'Second souffle', 'tank', 'onde', '#8ab4ff', '🎲', 'paire', 'Paire → relance tous tes autres dés.', 'Une paire → Gorm relance ses autres dés, avec 1 dé de plus (une fois par tour).', 'a bard taking a deep breath with swirling blue air around'),
      P('C', 'Coup de tonnerre', 'controle', 'eclair', '#7fa0ff', '⚡', 'suite3', 'Suite de 3 → 4 dégâts à chaque unité adverse.', 'Une suite de 3 → un sceau de 2 monstres collés à Gorm se brise (les deux plus proches de tomber).', 'a thunderclap shockwave bursting from a drum'),
    ],
    passif:[
      P('A', 'Grand souffle', 'tank', 'onde', '#4f8bff', '🌬', null, 'Moins de PV → Pouvoir +2.', 'Son trait (4 dés), renforcé : sous la moitié de ses PV, il lance un 5e dé.', 'a mighty gust of wind coming out of a horn'),
      P('B', 'Écho du cor', 'soutien', 'onde', '#9ec0ff', '🔊', null, 'Une fusion ou un Pouvoir donne +2 aux voisins.', 'Ses alliés à 2 cases ont +1 case à chaque déplacement.', 'an echoing horn with concentric blue rings'),
      P('C', 'Voix de la montagne', 'controle', 'onde', '#5f7fff', '⛰', null, '+1 dégât à chaque attaque de zone.', 'Le Carillon ne le touche pas, et ses dés comptent +1 sur les sceaux « Σ ».', 'a snowy mountain peak with a voice echoing as blue waves'),
    ],
    ultime:[
      P('A', 'Le Grand Souffle', 'controle', 'eclair', '#4f8bff', '🌪', 'pi3', '3 pairs ou impairs → 14 dégâts et 4 à chaque unité.', 'Trois dés pairs ou trois impairs → un sceau de chaque monstre à 3 cases se brise (deux à l’Horloger).', 'a colossal blast of wind and thunder from a giant horn'),
      P('B', 'Le grand cor', 'soutien', 'onde', '#8ab4ff', '🎺', 'suite3', 'Suite de 4 → rejoue tout son tour.', 'Une suite de 3 → tout le groupe relance ses dés (ceux qui lui restent).', 'a giant ornate horn glowing with golden and blue light'),
    ],
  },
  // ------------------------------------------------------------------ ZÉPHINE, la Mage (Tempête) : soutien (alchimie) · dégâts (foudre) · contrôle (vent)
  zephine:{
    garde:[
      P('A', 'Fumée', 'soutien', 'alchimie', '#c58bff', '💨', null, 'Bouclier = valeur, +3 si le dé a été modifié.', 'Protéger : bouclier = la valeur, +2 si ce dé a été changé (retourné, Tracé parfait, Grand œuvre).', 'a puff of violet alchemical smoke from a flask'),
      P('B', 'Éclair-réflexe', 'degats', 'eclair', '#ff4a6a', '⚡', null, 'Bouclier = valeur −1, 2 dégâts à l’attaquant.', 'Protéger Zéphine : bouclier = la valeur −1, et elle gagne des Épines (le prochain monstre qui la frappe perd un sceau).', 'a crackling red lightning aura around raised hands'),
      P('C', 'Bourrasque', 'controle', 'vent', '#ff8a9a', '🌬', null, 'Bouclier = valeur, renvoie une unité sur un 6.', 'Protéger : bouclier = la valeur, et le monstre collé le plus proche du protégé est repoussé de 2 cases.', 'a violent gust of wind pushing everything back'),
    ],
    pouvoir:[
      P('A', 'Grand œuvre', 'soutien', 'alchimie', '#d08bff', '⚗', 'diff3', '5 différents → 6 dégâts et tous tes dés au choix au prochain tour.', 'Trois dés différents → l’allié à 2 cases qui a le plus petit dé (ou Zéphine) : ce dé devient un 6.', 'a bubbling alchemical flask turning into gold'),
      P('B', 'Chaîne d’éclairs', 'degats', 'eclair', '#ff4040', '🌩', 'suite3', 'Suite de 3 → 5 dégâts à 3 cibles.', 'Une suite de 3 → un éclair saute et brise un sceau sur 3 monstres à 3 cases.', 'a chain of red lightning jumping between three points'),
      P('C', 'Tornade', 'controle', 'vent', '#ff7a8a', '🌪', 'impairs3', 'Tout impair → les unités adverses reculent.', 'Trois dés impairs → jusqu’à 3 monstres à 3 cases sont repoussés de 2 cases.', 'a small fierce tornado spinning with red sparks'),
    ],
    passif:[
      P('A', 'Transmutation', 'soutien', 'alchimie', '#c58bff', '🔄', null, 'Retourne un dé (1↔6…) une fois par tour.', 'Une fois par tour, elle retourne un de ses dés (1↔6, 2↔5, 3↔4) : bouton ⚗ sous ses dés.', 'a glowing alchemical symbol of transformation in a circle of light'),
      P('B', 'Vent', 'degats', 'eclair', '#ff4040', '🌩', null, '+1 dégât à la 2e attaque du tour.', 'Son trait (frappe à 2 cases), renforcé : au rang 10, jusqu’à 3 cases.', 'a red storm cloud with a lightning bolt'),
      P('C', 'Œil du cyclone', 'controle', 'vent', '#ffa0b0', '🌀', null, '−1 dégât par attaque reçue au-delà de la première.', 'Quand 2 monstres ou plus lui sont collés, chaque coup qu’elle reçoit fait 1 de moins.', 'the calm eye at the center of a swirling storm'),
    ],
    ultime:[
      P('A', 'La Pierre philosophale', 'soutien', 'alchimie', '#e0a0ff', '💎', 'somme12', 'Somme 12 → 12 dégâts, Poison 4, unités 1 / 1.', 'Trois dés qui font 12 ou plus → chaque monstre à 4 cases perd tous ses sceaux « Σ ».', 'a radiant red philosopher stone floating above a flask'),
      P('B', 'Le grand orage', 'degats', 'eclair', '#ff3030', '⛈', 'haut34', '3 dés de 5+ → 2 tours : −1 dé à l’adversaire, +1 dégât à toi.', 'Trois dés de 4 ou plus → pendant 2 tours, les monstres frappent de 1 de moins et le groupe a +1 sur les sceaux « ≥ » et « Σ ».', 'a huge thunderstorm with many red lightning bolts'),
    ],
  },
};

// ------------------------------------------------------------------ le stockage (guilde-etoiles)
const aLs = () => typeof localStorage !== 'undefined' && typeof lireEtoiles === 'function';
function classeDe(id) {
  if (POUVOIRS_H[id]) return id;
  if (typeof avTrouve === 'function') { const a = avTrouve(id); if (a && POUVOIRS_H[a.voie]) return a.voie; }
  return null;
}
const pwBrut = id => { if (!aLs()) return {}; const h = lireEtoiles().heros[id]; return (h && h.pw) || {}; };
const nivDe = id => typeof niveauH === 'function' ? niveauH(id) || 1 : 1;
const empDe = k => PW_EMP.find(e => e.k === k);
// 16/11 nuit : le MODE ESSAI (interrupteur de la page des pouvoirs) ouvre tous les choix, le temps de les tester ; les rangs, eux, restent payés en points
const pwEssai = () => { try { return typeof localStorage !== 'undefined' && localStorage.getItem('guilde-pw-essai') === '1'; } catch (e) { return false; } };
const pwOuvert = (id, emp) => pwEssai() || nivDe(id) >= empDe(emp).niv;
// les 4 pouvoirs actifs d'un héros pour un préréglage : { garde:{ v, rang, def }, … }
function pouvoirsDe(id, pre) {
  const c = classeDe(id); if (!c) return null;
  const P0 = pwBrut(id), ch = P0[pre === 'groupe' ? 'groupe' : 'solo'] || {}, R = P0.rangs || {}, o = {};
  PW_EMP.forEach(E => { const L = POUVOIRS_H[c][E.k]; const v = pwOuvert(id, E.k) && ch[E.k] && L.some(x => x.v === ch[E.k]) ? ch[E.k] : 'A';
    o[E.k] = { v, rang:Math.min(PW_RANG_MAX, R[E.k] || 0), def:L.find(x => x.v === v) }; });
  return o;
}
// ce que reçoit le moteur des Chroniques (petit, pour le jeu à distance) : les deux préréglages
function pwPourMoteur(id) {
  const f = pre => { const o = pouvoirsDe(id, pre); if (!o) return null; const r = {}; PW_EMP.forEach(E => r[E.k] = { v:o[E.k].v, rang:o[E.k].rang }); return r; };
  const g = f('groupe'); return g ? { groupe:g, solo:f('solo') } : null;
}
// 17/11 (l'utilisateur : « 40 points pour tout maxer, c'est rapide ? » ; choix : de plus en plus cher) : le rang N coûte 1 point (rangs 1-4),
// 2 points (rangs 5-7), 3 points (rangs 8-10) : 19 points par emplacement, 76 pour les 4 (tout au maximum vers le niveau 77)
const coutRang = n => n <= 4 ? 1 : n <= 7 ? 2 : 3;
const coutJusqua = r => { let t = 0; for (let n = 1; n <= r; n++) t += coutRang(n); return t; };
const rangsTotal = id => Object.values(pwBrut(id).rangs || {}).reduce((t, v) => t + coutJusqua(v || 0), 0); // points déjà dépensés
const pointsPouvoirs = id => Math.max(0, nivDe(id) - 1 - rangsTotal(id));
function pwEcrit(id, f) { const d = lireEtoiles(), h = etatHerosE(d, id); h.pw = h.pw || {}; ['groupe', 'solo'].forEach(k => h.pw[k] = h.pw[k] || {}); h.pw.rangs = h.pw.rangs || {}; f(h.pw); ecrireEtoiles(d); }
// choisir une version (gratuit, hors partie) ; renvoie 'ok' ou une phrase qui dit pourquoi
function choisirPouvoir(id, pre, emp, v) {
  const c = classeDe(id), E = empDe(emp); if (!c || !E) return 'Héros inconnu.';
  if (!POUVOIRS_H[c][emp].some(x => x.v === v)) return 'Version inconnue.';
  if (v !== 'A' && !pwOuvert(id, emp)) return `Le choix du ${E.n.toLowerCase()} s’ouvre au niveau ${E.niv}.`;
  pwEcrit(id, P0 => { P0[pre === 'groupe' ? 'groupe' : 'solo'][emp] = v; }); return 'ok';
}
function monterRang(id, emp) {
  if (!empDe(emp)) return 'Emplacement inconnu.'; if ((pwBrut(id).rangs || {})[emp] >= PW_RANG_MAX) return 'Déjà au rang 10.';
  const cout = coutRang(((pwBrut(id).rangs || {})[emp] || 0) + 1); if (pointsPouvoirs(id) < cout) return `Il faut ${cout} point${cout > 1 ? 's' : ''} pour ce rang : monte le niveau du héros.`;
  pwEcrit(id, P0 => { P0.rangs[emp] = (P0.rangs[emp] || 0) + 1; }); return 'ok';
}
// le préréglage selon la partie : Chroniques à 2 héros ou plus = Groupe ; le reste = Solo
const prereglagePour = nb => nb >= 2 ? 'groupe' : 'solo';
// le nom du build (ex. « Pip soigneuse ») : le rôle le plus présent
function nomBuild(id, pre) {
  const o = pouvoirsDe(id, pre); if (!o) return ''; const n = {}; PW_EMP.forEach(E => { const r = o[E.k].def.r; n[r] = (n[r] || 0) + 1; });
  const r = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
  return { tank:'protectrice', soin:'soigneuse', degats:'frappeuse', controle:'stratège', soutien:'meneuse' }[r] || '';
}
// l'icône peinte du pouvoir (decor/pw-<classe>-<emp>-<v>.webp) si elle existe, sinon l'émoji
const pwIcone = (c, emp, d, px) => `<img src="decor/pw-${c}-${emp}-${d.v.toLowerCase()}.webp?v=1" alt="" style="width:${px || 34}px;height:${px || 34}px;object-fit:contain;vertical-align:middle;border-radius:8px" onerror="this.replaceWith(document.createTextNode('${d.e}'))">`;

const API = { PW_EMP, PW_RANG_MAX, PW_ROLES, PW_CLASSES, PW_COMBOS, POUVOIRS_H, classeDe, pouvoirsDe, pwPourMoteur, pointsPouvoirs, choisirPouvoir, monterRang, coutRang, coutJusqua, prereglagePour, nomBuild, pwIcone, pwOuvert, pwEssai };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else Object.assign(racine, API);
})(typeof window !== 'undefined' ? window : globalThis);
