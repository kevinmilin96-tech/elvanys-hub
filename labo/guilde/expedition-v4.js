// =============================================================================================== LES EXPÉDITIONS v4 — la rejouabilité (17/11 nuit, séance « carte blanche »)
// Plan validé par l'utilisateur : ~/perso/dice-arena/Expeditions-v4-plan.md ; page de conception : expeditions-v4-proposition.html.
// Ce fichier se charge APRÈS expedition-moteur.js (v2/v3, inchangé) et le prolonge :
//  · une CARTE À EMBRANCHEMENTS : 6 étapes, 2 ou 3 escales au choix à chacune, tirées de la réserve de la mer ;
//  · des escales sans combat : ÉVÉNEMENTS à choix, TRÉSORS, PORTS FRANCS ; des ÉLITES (un gros monstre à particularité) ;
//  · un BOSS FINAL TIRÉ AU SORT (connu dès le départ, chacun sa mécanique) ;
//  · une RÈGLE DU VOYAGE tirée à chaque départ ; trois MERS (la suivante s'ouvre en gagnant la précédente) ;
//  · des RECRUES À DÉBLOQUER, l'ASCENSION (10 crans), le VOYAGE DU JOUR (même graine pour tous, score gardé sur le téléphone).
// Astuce : ESCALES2 et MONSTRES_EXP (tableaux du moteur) sont recopiés depuis la route du voyage (synchroRoute), ce qui laisse
// tout le reste du moteur et de l'écran fonctionner tel quel. Les fonctions remplacées le sont par affectation (pas par déclaration).

// ----------------------------------------------------------------------------------------------- les recrues à débloquer (une par voyage gagné, dans l'ordre)
const RECRUES_V4 = {
  pirate:    { n:'Pirate abordeur', fam:'clan', role:'lame', a:4, v:5, charge:true, t:1, verrou:1, art:'xp-pirate', d:'Charge : frappe en premier au 1er round.' },
  sirene:    { n:'Sirène des brumes', fam:'clairiere', role:'soutien', a:1, v:4, soigneur:3, t:2, verrou:2, art:'xp-sirene', d:'Soigne de 3 l’allié le plus blessé à chaque round.' },
  harpie:    { n:'Harpie des falaises', fam:'ombre', role:'tireur', a:3, v:4, t:2, verrou:3, art:'xp-harpie', d:'Tireuse de l’Ombre : son 1er tir peut faire double dégât (Embuscade).' },
  ours:      { n:'Ours des glaces', fam:'garde', role:'rempart', a:3, v:10, barriere:true, epines:1, t:2, verrou:4, art:'xp-ours', d:'Barrière et Épines 1.' },
  canonnier: { n:'Canonnier du bord', fam:'forge', role:'tireur', a:5, v:4, t:3, gros:true, verrou:5, art:'xp-canonnier', d:'Le plus gros tir de la Forge.' },
  yeti:      { n:'Yéti des cimes', fam:'clan', role:'lame', a:5, v:10, charge:true, t:3, gros:true, verrou:6, art:'xp-yeti', d:'Charge, et de quoi encaisser.' },
};
Object.assign(RECRUES, RECRUES_V4);
if (typeof ART_EXP !== 'undefined') Object.keys(RECRUES_V4).forEach(k => { ART_EXP[k] = RECRUES_V4[k].art; });

// ----------------------------------------------------------------------------------------------- les trois mers
// m : [nom, attaque, vie, étiquette] comme MONSTRES_EXP ; dur : multiplicateur de vie par étape (réglé au simulateur)
const MERS = {
  nuages: { n:'La Mer des nuages', e:'☁️', d:'La route de toujours : gobelins, loups de braise et volcans. La mer de départ.', ouvre:null, pv:1,
    decor:{ monstres:['crique', 'port', 'cratere'], fantome:['falaises', 'foret'], evenement:['falaises', 'foret'], tresor:['crique'], port:['port'], elite:['cratere'], boss:['nid'] },
    groupes:[
      { n:'La Crique des gobelins', e:'🏴‍☠️', cle:'crique', av:[['Gobelin', 3, 7], ['Gobelin chef', 3, 9]], ar:[['Gobelin lanceur', 2, 5, 'tireur']] },
      { n:'La Lande des pillards', e:'🪓', cle:'crique', av:[['Pillard', 3, 8], ['Pillard', 3, 8]], ar:[['Frondeur', 2, 5, 'tireur'], ['Chien de pillard', 2, 5, 'charge']] },
      { n:'Le Port de Marennes', e:'⚓', cle:'port', av:[['Loup de braise', 4, 11], ['Louveteau', 3, 6]], ar:[['Salamandre', 3, 8, 'tireur'], ['Chaman de braise', 2, 7, 'tireur+soigne']] },
      { n:'Les Rizières de cendre', e:'🌾', cle:'foret', av:[['Épouvantail de braise', 3, 12, 'barriere'], ['Corbeau ardent', 4, 6, 'charge']], ar:[['Salamandre', 3, 8, 'tireur'], ['Porte-étendard de cendre', 2, 8, 'etendard']] },
      { n:'Le Cratère', e:'🌋', cle:'cratere', av:[['Élémentaire de lave', 6, 18, 'barriere'], ['Golem de scories', 4, 14, 'barriere']], ar:[['Drake de cendre', 5, 14, 'tireur'], ['Invocateur de cendre', 2, 9, 'invoque'], ['Flammèche', 3, 4, 'charge']] },
    ],
    elites:[{ n:'Le Chef de guerre gobelin', e:'👺', cle:'crique', av:[['Chef de guerre', 6, 30, 'barriere+chef'], ['Gobelin chef', 3, 9]], ar:[['Gobelin lanceur', 2, 5, 'tireur'], ['Porte-étendard gobelin', 2, 7, 'etendard']], meca:'rage', d:'Rage : il gagne +1 attaque à chaque round.' },
            { n:'La Matriarche de braise', e:'🐺', cle:'port', av:[['Matriarche de braise', 5, 26, 'chef'], ['Loup de braise', 4, 11]], ar:[['Louveteau', 3, 6], ['Totem de la meute', 1, 10, 'totem']], meca:'meute', d:'Meute : quand un Louveteau tombe, la Matriarche hurle (+2 attaque).' }],
    boss:['titan', 'ignaros'] },
  glaces: { n:'La Mer des glaces', e:'❄️', d:'Le grand nord : banquise, yétis et vouivres. Les monstres encaissent plus.', ouvre:'nuages', pv:1, /* 19/11 : 1,05 avant la nouvelle carte */
    decor:{ monstres:['falaises', 'foret', 'port'], fantome:['falaises'], evenement:['foret'], tresor:['crique'], port:['port'], elite:['falaises'], boss:['nid'] },
    groupes:[
      { n:'La Banquise des pingouins-guerriers', e:'🐧', cle:'falaises', av:[['Pingouin-guerrier', 3, 8], ['Pingouin-guerrier', 3, 8]], ar:[['Lanceur de glaçons', 2, 6, 'tireur']] },
      { n:'Le Col des loups blancs', e:'🐺', cle:'falaises', av:[['Loup blanc', 4, 9, 'charge'], ['Loup blanc', 4, 9, 'charge']], ar:[['Chaman du givre', 2, 7, 'tireur']] },
      { n:'La Forêt pétrifiée', e:'🌲', cle:'foret', av:[['Ent de givre', 4, 18, 'barriere'], ['Feu follet bleu', 3, 6]], ar:[['Archer des neiges', 4, 7, 'tireur'], ['Nécromant des glaces', 2, 9, 'invoque']] },
      { n:'Le Fjord des trolls', e:'🧌', cle:'port', av:[['Troll des glaces', 6, 20, 'barriere'], ['Troll des glaces', 5, 16]], ar:[['Chaman du givre', 3, 8, 'tireur+soigne']] },
      { n:'La Faille de cristal', e:'💎', cle:'cratere', av:[['Golem de cristal', 5, 22, 'barriere'], ['Golem de cristal', 5, 18, 'barriere']], ar:[['Sorcière du blizzard', 5, 12, 'tireur'], ['Étendard de glace', 2, 9, 'etendard'], ['Éclat vivant', 3, 5, 'charge']] },
    ],
    elites:[{ n:'Le Yéti ancien', e:'🦍', cle:'falaises', av:[['Yéti ancien', 7, 34, 'barriere+chef']], ar:[['Petit yéti', 3, 8], ['Chaman du givre', 2, 8, 'tireur+soigne']], meca:'rage', d:'Rage : il gagne +1 attaque à chaque round.' },
            { n:'La Reine des neiges', e:'👸', cle:'foret', av:[['Garde de glace', 4, 14, 'barriere'], ['Garde de glace', 4, 14, 'barriere']], ar:[['La Reine des neiges', 5, 22, 'tireur+chef'], ['Totem de givre', 1, 10, 'totem']], meca:'gel', d:'Gel : un round sur deux, ta recrue la plus forte est gelée (0 attaque ce round).' }],
    boss:['vouivre', 'titan'] },
  tempetes: { n:'L’Archipel des tempêtes', e:'⛈️', d:'Pirates, harpies et krakens. La mer la plus dure, pour les équipages rodés.', ouvre:'glaces', pv:.9, /* 19/11 : 1,1 avant la nouvelle carte */
    decor:{ monstres:['crique', 'port', 'falaises'], fantome:['falaises'], evenement:['crique'], tresor:['crique'], port:['port'], elite:['port'], boss:['nid'] },
    groupes:[
      { n:'La Crique des naufrageurs', e:'🏴‍☠️', cle:'crique', av:[['Naufrageur', 3, 9], ['Naufrageur', 3, 9]], ar:[['Pistolier', 3, 5, 'tireur']] },
      { n:'Les Récifs des harpies', e:'🦅', cle:'falaises', av:[['Harpie', 4, 7, 'charge'], ['Harpie', 4, 7, 'charge']], ar:[['Harpie tireuse', 3, 6, 'tireur'], ['Harpie tireuse', 3, 6, 'tireur']] },
      { n:'Le Repaire de Barbe-Grise', e:'⚓', cle:'port', av:[['Quartier-maître', 5, 16, 'barriere'], ['Pirate', 4, 10]], ar:[['Canonnier pirate', 5, 9, 'tireur'], ['Porte-drapeau pirate', 2, 9, 'etendard']] },
      { n:'L’Œil du cyclone', e:'🌀', cle:'falaises', av:[['Élémentaire d’orage', 6, 20, 'barriere'], ['Nuée électrique', 4, 8, 'charge']], ar:[['Sorcier des vents', 4, 12, 'tireur+soigne'], ['Nuée électrique', 4, 8, 'charge']] },
      { n:'Le Cimetière des navires', e:'💀', cle:'cratere', av:[['Capitaine noyé', 6, 22, 'barriere'], ['Matelot noyé', 4, 14]], ar:[['Canonnier fantôme', 6, 12, 'tireur'], ['Nécromancien noyé', 2, 10, 'invoque'], ['Mouette spectrale', 3, 5, 'charge']] },
    ],
    elites:[{ n:'Le Capitaine Barbe-Grise', e:'🦜', cle:'port', av:[['Barbe-Grise', 7, 32, 'barriere+chef'], ['Pirate', 4, 10]], ar:[['Canonnier pirate', 5, 9, 'tireur'], ['Porte-drapeau pirate', 2, 9, 'etendard']], meca:'rage', d:'Rage : il gagne +1 attaque à chaque round.' },
            { n:'La Sirène noire', e:'🧜', cle:'crique', av:[['Matelot charmé', 4, 12], ['Matelot charmé', 4, 12]], ar:[['La Sirène noire', 4, 20, 'tireur+chef'], ['Totem des abysses', 1, 10, 'totem']], meca:'gel', d:'Chant : un round sur deux, ta recrue la plus forte est charmée (0 attaque ce round).' }],
    boss:['kraken', 'roi'] },
};
const ORDRE_MERS = ['nuages', 'glaces', 'tempetes'];

// ----------------------------------------------------------------------------------------------- les boss (tirés au sort parmi ceux de la mer, connus dès le départ)
const BOSS_V4 = {
  titan:   { n:'Le Titan de feu', e:'🔥', cle:'nid', av:[['Le Titan de feu', 8, 60, 'boss']], ar:[['Flammèche', 3, 5, 'charge'], ['Totem de lave', 1, 8, 'totem'], ['Cultiste du feu', 4, 10, 'tireur']],
    meca:'eruption', d:'Éruption : tous les 3 rounds, la lave frappe toute ta rangée de devant (3 dégâts).' },
  ignaros: { n:'Ignaros, le dragon ancien', e:'🐉', cle:'nid', av:[['Ignaros', 8, 58, 'boss']], ar:[['Dragonnet', 4, 8, 'tireur'], ['Prêtresse du dragon', 2, 10, 'tireur+soigne']],
    meca:'souffle', d:'Souffle : au 2e round puis tous les 3 rounds, il brûle ta rangée de DERRIÈRE (3 dégâts).' },
  vouivre: { n:'La Vouivre des glaces', e:'🐲', cle:'nid', av:[['La Vouivre', 8, 64, 'boss']], ar:[['Stalagmite vivante', 3, 10, 'barriere'], ['Totem de givre', 1, 8, 'totem']],
    meca:'gel', d:'Gel : à chaque round, ta recrue la plus forte est gelée (0 attaque ce round), un round sur deux.' },
  kraken:  { n:'Le Kraken des brumes', e:'🦑', cle:'nid', av:[['Tentacule', 3, 11, 'barriere'], ['Le Kraken', 6, 30, 'boss'], ['Tentacule', 3, 11, 'barriere']], ar:[['Tentacule', 4, 12, 'tireur'], ['Sirène du Kraken', 2, 7, 'tireur+soigne']],
    meca:'tentacules', d:'Tentacules : tous les 3 rounds, une tentacule coupée repousse (à moitié vie).' },
  roi:     { n:'Le Roi sans visage', e:'👤', cle:'nid', av:[['Le Roi sans visage', 6, 76, 'boss']], ar:[['Reflet', 3, 8, 'tireur'], ['Héraut du Roi', 2, 10, 'etendard']],
    meca:'miroir', d:'Miroir : il prend l’attaque de ta meilleure4 recrue (+2), et ses Reflets copient sa vie.' },
};

// ----------------------------------------------------------------------------------------------- les règles du voyage (une tirée à chaque départ)
const REGLES_V4 = {
  vent:     { n:'Vent arrière', e:'🌬', d:'Au 1er round de chaque combat, ta rangée de devant a Charge (frappe en premier).' },
  bourse:   { n:'Bourse pleine', e:'💰', d:'+2 💰 à chaque passage au port.' },
  enrages:  { n:'Monstres enragés', e:'😡', d:'Les monstres ont +1 attaque, mais chaque victoire rapporte +3 💰.' },
  calme:    { n:'Mer calme', e:'🌊', d:'Le navire part avec un 4e cœur.' },
  marche:   { n:'Grand marché', e:'🛒', d:'Le recruteur montre une recrue de plus.' },
  veterans: { n:'Vétérans à bord', e:'🎖', d:'Tu pars avec une recrue ★ déjà fusionnée.' },
  tempete:  { n:'Mer démontée', e:'⛈', d:'Ton équipage commence chaque combat à −1 PV, mais les escales rapportent +3 💰.' },
  rancon:   { n:'La rançon du boss', e:'👑', d:'Le boss a +15 % de vie, mais le voyage vaut double points.' },
};

// ----------------------------------------------------------------------------------------------- les événements à choix (escales « ❔ »)
// f(X) applique l'effet et renvoie le texte de suite ; ok(X) : le choix est-il possible ?
const EVENEMENTS_V4 = {
  passager: { n:'Le passager mystérieux', e:'🧥', cle:'port' /* 23/11 (testeurs) : il attend « sur le quai » (avant : la forêt et son golem) */, texte:'Un voyageur encapuchonné attend sur le quai. « Emmenez-moi jusqu’à la prochaine escale. Je paierai… à ma façon. »',
    choix:[{ t:'Le prendre à bord', d:'Une recrue au hasard rejoint gratuitement l’équipage (s’il reste une place).', f:X => { const k = tire(hasardX(X), recruesDispo(X).filter(k => RECRUES[k].t <= 2)), p = placeLibre(X, ['tireur', 'soutien'].includes(RECRUES[k].role) ? 'ar' : 'av'); if (!p) { X.or += 3; return 'Plus de place : il laisse 3 💰 sur la table et disparaît.'; } poseA(X, p, nouvelleRecrue(k, 0)); fusionne(X); return `Il retire sa capuche : ${RECRUES[k].n} ! « Je me battrai pour vous. »`; } },
           { t:'Lui demander de payer d’avance', d:'+4 💰.', f:X => { X.or += 4; return 'Il compte quatre pièces d’or, sans un mot, et redescend à terre.'; } }] },
  tempete: { n:'La tempête', e:'⛈', cle:'falaises', texte:'Le ciel noircit d’un coup. Les voiles claquent, le navire volant tangue.',
    choix:[{ t:'Traverser l’orage', d:'Un cœur de moins, mais tu gagnes 6 💰 (le vent te pousse vers un trésor).', ok:X => X.coeurs > 1, f:X => { X.coeurs--; X.or += 6; return 'Le mât craque, mais au-delà des nuages, une épave pleine d’or vous attend.'; } },
           { t:'Contourner prudemment', d:'Tu perds 2 💰 de vivres.', f:X => { X.or = Math.max(0, X.or - 2); return 'Le détour est long : on mange les provisions du voyage.'; } }] },
  marchand: { n:'Le marchand pirate', e:'🦜', cle:'crique', texte:'Une barque peinte en rouge accoste. « Des épées, des runes, des secrets… Tout se vend, capitaine ! »',
    choix:[{ t:'Acheter une rune d’attaque (5 💰)', d:'Ta recrue la plus forte gagne +2 attaque pour tout le voyage.', ok:X => X.or >= 5, f:X => { X.or -= 5; const u = meilleure4(X); if (u) u.bonusA += 2; return u ? `${u.n} grave la rune sur sa lame : +2 attaque.` : 'Personne pour porter la rune…'; } },
           { t:'Acheter une rune de vie (4 💰)', d:'Toute ta rangée de devant gagne +3 PV pour tout le voyage.', ok:X => X.or >= 4, f:X => { X.or -= 4; X.plateau.av.forEach(u => { if (u && u.key !== 'capitaine') u.bonusV += 3; }); return 'Les runes brillent sur les boucliers : +3 PV devant.'; } },
           { t:'Passer son chemin', d:'Rien ne change.', f:() => 'Le marchand hausse les épaules et repart en chantant.' }] },
  epave: { n:'L’épave fumante', e:'⚓', cle:'crique', texte:'Une épave flotte dans les nuages. Quelque chose bouge encore dans la cale.',
    choix:[{ t:'Fouiller la cale', d:'1 chance sur 2 : 8 💰 ; sinon un monstre caché blesse ton équipage (−1 cœur).', ok:X => X.coeurs > 1, f:X => { if (hasardX(X)() < .5) { X.or += 8; return 'Un coffre intact ! 8 pièces d’or.'; } X.coeurs--; return 'Un crabe géant jaillit de la cale ! Vous fuyez, blessés.'; } },
           { t:'Récupérer le bois', d:'+2 💰, sans risque.', f:X => { X.or += 2; return 'Du bon chêne, qui se revendra au port.'; } }] },
  autel: { n:'L’autel des vents', e:'🗿', cle:'falaises', texte:'Sur un îlot, un autel de pierre couvert de runes. Une voix murmure : « Un sacrifice, une bénédiction. »',
    choix:[{ t:'Offrir une recrue', d:'Ta recrue la plus faible disparaît ; ta plus forte devient ★ d’un cran (+attaque, +vie).', ok:X => toutes(X).filter(u => u.key !== 'capitaine').length >= 2, f:X => { const l = toutes(X).filter(u => u.key !== 'capitaine').sort((a, b) => (a.a + a.v) - (b.a + b.v)), f = l[0], m = l[l.length - 1]; poseA(X, ouEst(X, f.id), null); m.bonusA += 2; m.bonusV += 5; return `${f.n} s’efface dans le vent ; ${m.n} se relève, plus fort (+2 attaque, +5 PV).`; } },
           { t:'Prier sans rien donner', d:'+1 cœur (au plus ton maximum).', f:X => { X.coeurs = Math.min(X.coeursMax || 3, X.coeurs + 1); return 'Un vent tiède vous enveloppe : le navire se répare.'; } }] },
  sirene: { n:'Le chant de la sirène', e:'🧜', cle:'foret', texte:'Une voix magnifique monte des brumes. L’équipage veut s’approcher…',
    choix:[{ t:'Se boucher les oreilles', d:'Rien ne se passe, mais tu gèles l’offre du recruteur pour le prochain port.', f:X => { X.gel = true; return 'Le navire passe au large. Le recruteur garde ses recrues pour toi.'; } },
           { t:'Écouter le chant', d:'Le prochain combat : tout l’équipage +1 attaque (ivre de courage)… mais −1 cœur.', ok:X => X.coeurs > 1, f:X => { X.coeurs--; X.prochain = { atq:1 }; return 'Le chant vous remplit de courage… et vous jette sur les récifs.'; } }] },
};
const meilleure4 = X => toutes(X).filter(u => u.key !== 'capitaine').sort((a, b) => (b.a + b.bonusA) - (a.a + a.bonusA))[0];

// ----------------------------------------------------------------------------------------------- la progression (gardée sur le téléphone)
const CLE_META4 = 'guilde-expedition4-meta';
const lireMeta4 = () => { try { return Object.assign({ mers:{}, gagnes:0, asc:{} }, JSON.parse(localStorage.getItem(CLE_META4) || '{}')); } catch (e) { return { mers:{}, gagnes:0, asc:{} }; } };
const ecritMeta4 = m => { try { localStorage.setItem(CLE_META4, JSON.stringify(m)); } catch (e) {} };
const merOuverte = (m, k) => !MERS[k].ouvre || !!m.mers[MERS[k].ouvre] || !!globalThis.TOUT_OUVERT;
const ascMax4 = (m, k) => Math.min(10, (m.asc[k] || 0)); // cran le plus haut OUVERT sur cette mer (0 = de base)
// les recrues du recruteur : les anciennes + celles débloquées (une par voyage gagné)
function recruesDispo(X) { const g = X && X.debloques != null ? X.debloques : 99;
  return Object.keys(RECRUES).filter(k => !RECRUES[k].verrou || RECRUES[k].verrou <= g); }
// l'ascension : chaque cran ajoute un peu de difficulté (ce qui est dit dans la page de conception)
const ASC_V4 = ['De base', '+4 % de vie aux monstres', 'les élites ont +1 attaque', '−2 💰 au départ', 'le boss a +8 % de vie', 'le recruteur : une recrue de moins',
  '+5 % de vie encore', 'les monstres ont +1 attaque', 'les événements coûtent plus', 'le navire part avec 2 cœurs', 'le boss a +20 % de vie'];

// ----------------------------------------------------------------------------------------------- la carte du voyage
// 19/11 (décision de l'utilisateur, après ses essais : « on pouvait atteindre le boss sans aucun combat ») : NOUVELLE CARTE.
// 4 POINTS DE CHOIX (les escales sans combat : ❔ événement, 💎 trésor, 🏝 port franc) ; entre deux points de choix, une SUITE OBLIGATOIRE
// de 2 ou 3 combats dont UNE ÉLITE (la dernière de la suite) ; au bout, le boss (une seule chance). 10 ou 11 escales avant le boss.
// SUITES_V4 : pour chaque suite, les combats avant l'élite ([sortes possibles, groupes de monstres possibles, multiplicateur de vie]) puis l'élite.
// Réglé au simulateur le 19/11 (40 voyages par capitaine) : avec 7 à 8 combats et 4 escales calmes, l'équipage gagne bien plus d'or et de ★★
// qu'avant (≈ 2,4 ★★ par voyage au lieu de 0,6) : les vies des monstres sont donc environ deux fois plus grandes qu'avec l'ancienne carte.
const SUITES_V4 = [
  { combats:[[['monstres'], [0, 1], 2.2]], elite:1.6 }, // 27/11 soir : 1re élite 2,0 → 1,6 (« je me suis fait défoncer » : le Chef de guerre gobelin, 1re cause de défaite au simulateur) ; 24/11 : début adouci (2,6 / 2,6 avant : on butait sur la 1re élite)
  { combats:[[['monstres'], [1, 2], 3.92], [['monstres', 'fantome'], [2, 3], 4.19]], elite:4.19, troisieme:true }, // 27/11 soir : ×1,35 (avant 2,9 / 3,1 / 3,1) : le capitaine progresse maintenant
  { combats:[[['monstres'], [3], 4.73]], elite:5.0 }, // 27/11 soir : ×1,35 (avant 3,5 / 3,7)
];
let DUR_BOSS4 = +(2.05 * 1.02 * 1.3 * 1.25 * 1.35).toFixed(3); /* 27/11 soir : ×1,35 avec la progression du capitaine */ // 24/11 : ×1,25 pour compenser le début adouci (simulateur ≈ 77 %, les défaites à la fin et plus à la 1re élite) // le boss : une seule chance (avant : ×2,09 et on le rejouait tant qu'il restait un cœur)
const DUR_V4 = [1.35, 1.3, 1.55, 1.5, 1.9, 2.05].map(x => +(x * 1.02).toFixed(3)); // ancienne carte (voyages commencés avant le 19/11)
const CHOIX_V4 = ['evenement', 'evenement', 'tresor', 'port', 'forge']; // 27/11 soir : + la forge du capitaine (décision de l'utilisateur)
function escaleDe(X, type, etape, R, tiers, dur) {
  const M = MERS[X.mer], cle = tire(R, M.decor[type] || ['crique']);
  if (type === 'monstres') { const tier = Math.min(4, tiers ? tire(R, tiers) : etape === 0 ? tire(R, [0, 1]) : etape === 1 ? 1 : etape === 2 ? tire(R, [2, 3]) : etape === 3 ? 3 : 4); const g = M.groupes[tier]; return { type, etape, n:g.n, e:g.e, cle:g.cle, g:tier, dur }; }
  if (type === 'elite') { const i = Math.floor(R() * M.elites.length), g = M.elites[i]; return { type, etape, n:g.n, e:g.e, cle:g.cle, el:i, dur }; }
  if (type === 'fantome') return { type, etape, n:'Un navire rival', e:'👻', cle, dur };
  if (type === 'evenement') { const k = tire(R, Object.keys(EVENEMENTS_V4)), ev = EVENEMENTS_V4[k]; return { type, etape, n:ev.n, e:'❔', cle:ev.cle, ev:k }; }
  if (type === 'tresor') return { type, etape, n:'L’île au trésor', e:'💎', cle };
  if (type === 'port') return { type, etape, n:'Le port franc', e:'🏝', cle:'port' };
  if (type === 'forge') return { type, etape, n:'La forge du capitaine', e:'⚒', cle:'port' };
  return { type:'boss', etape, n:BOSS_V4[X.boss].n, e:BOSS_V4[X.boss].e, cle:'nid' };
}
// un point de choix : 2 ou 3 escales sans combat, de sortes différentes (deux événements possibles, jamais le même) ; pas de port franc au départ
function pointDeChoix(X, etape, R, premier) {
  const n = premier ? 2 : (R() < .5 ? 2 : 3), l = [], vus = new Set();
  for (let essai = 0; essai < 30 && l.length < n; essai++) {
    const t = tire(R, CHOIX_V4.filter(x => !(premier && x === 'port'))); if (t !== 'evenement' && vus.has(t)) continue;
    const o = escaleDe(X, t, etape, R); if (t === 'evenement' && l.some(x => x.ev === o.ev)) continue; vus.add(t); l.push(o); }
  return l.map(o => Object.assign(o, { choix:true }));
}
function carteV4(X) {
  const R = rngDe(X.graine + '/carte4'), C = [], deja = new Set(), M = MERS[X.mer], elites = [...M.elites.keys()].sort(() => R() - .5);
  SUITES_V4.forEach((S, s) => {
    C.push(pointDeChoix(X, C.length, R, s === 0));
    const combats = S.combats.slice(0, S.troisieme && R() < .5 ? 2 : 1); // la suite du milieu : 2 ou 3 combats (élite comprise)
    combats.forEach(([sortes, tiers, dur]) => { const t2 = tiers.filter(t => !deja.has(t)); const o = escaleDe(X, tire(R, sortes), C.length, R, t2.length ? t2 : tiers, dur); if (o.g != null) deja.add(o.g); C.push([Object.assign(o, { suite:s })]); }); // jamais deux fois le même groupe de monstres
    const el = escaleDe(X, 'elite', C.length, R, null, S.elite); const k = elites[s % elites.length]; const g = M.elites[k];
    C.push([Object.assign(el, { el:k, n:g.n, e:g.e, cle:g.cle, suite:s })]);
  });
  C.push(pointDeChoix(X, C.length, R, false));
  C.push([escaleDe(X, 'boss', C.length, R)]);
  return C;
}
// 23/11 : LE FLASH DU JOUR (≈ 3 minutes, le même pour tous aujourd'hui) : 12 💰 au départ, 2 cœurs, une règle simple,
// puis 3 combats à la suite (des monstres, une élite, le boss). FLASH_DUR = la vie des ennemis de chaque combat (réglée au simulateur)
let FLASH_DUR = [1.3, 1.75, 1.25]; // 27/11 soir : élite et boss plus solides (le capitaine progresse après chaque victoire) ; // simulateur 23/11 (/tmp/cfg/sim-expf.mjs, 60 voyages par héros) : 63-87 % de victoires, 42-75 % sans perdre de cœur
const FLASH_REGLES = ['vent', 'marche', 'veterans', 'enrages'];
// 25/11 (l'utilisateur, choix « défis du jour ») : les défis du FLASH ; 2 tirés chaque jour (defis-jour.js), +★ par défi réussi
const bordFlash = X => [...X.plateau.av, ...X.plateau.ar, ...X.cale].filter(Boolean);
const FLASH_DEFIS_EXP = {
  sansCoeur: { e:'❤', n:'Ne perdre aucun cœur', ok:X => X.coeurs >= X.coeursMax },
  tresor:    { e:'💰', n:'Arriver avec 6 💰 ou plus', ok:X => X.or >= 6 },
  fusion:    { e:'★', n:'Avoir une recrue ★ à bord (fusion)', ok:X => bordFlash(X).some(u => u.star >= 1) },
  familles:  { e:'🧭', n:'Avoir 3 familles différentes à bord', ok:X => new Set(bordFlash(X).map(u => u.fam)).size >= 3 },
  avant:     { e:'⚔', n:'Finir avec la rangée de devant complète', ok:X => X.plateau.av.every(Boolean) },
  econome:   { e:'🪙', n:'Ne recruter que 3 recrues ou moins', ok:X => bordFlash(X).length <= 3 },
};
function carteFlash(X) {
  const R = rngDe(X.graine + '/flash');
  return [[escaleDe(X, 'monstres', 0, R, [0, 1], FLASH_DUR[0])], [escaleDe(X, 'elite', 1, R, null, FLASH_DUR[1])], [escaleDe(X, 'boss', 2, R)]];
}
// une étape de la carte est-elle un point de choix (escales sans combat) ?
const estChoix4 = opts => opts.length > 1 || (opts[0] && opts[0].choix);
// la route jouée → les tableaux du moteur (l'écran lit ESCALES2[X.escale])
function synchroRoute(X) {
  if (!X || X.v !== 4) return;
  // 19/11 : une étape à une seule escale (combat d'une suite obligatoire, boss) se prend toute seule, sans passer par la carte
  X.carte.forEach((o, k) => { if (k <= X.escale && o.length === 1 && !X.route[k]) X.route[k] = o[0]; });
  const l = X.carte.map((opts, k) => X.route[k] || (opts.length === 1 ? opts[0] : { type:'?', n:'Au choix', e:'❔', cle:'falaises', etape:k }));
  ESCALES2.splice(0, ESCALES2.length, ...l);
}
const ESCALE_COMBAT = t => ['monstres', 'elite', 'fantome', 'boss'].includes(t);

// ----------------------------------------------------------------------------------------------- un nouveau voyage
// opts : { mer, asc, jour (true = voyage du jour), graine }
function nouveauVoyage(heros, opts) {
  opts = opts || {}; const meta = typeof localStorage !== 'undefined' ? lireMeta4() : { gagnes:99 };
  const graine = opts.graine || (opts.flash ? 'flash-' + new Date().toISOString().slice(0, 10) : opts.jour ? 'jour-' + new Date().toISOString().slice(0, 10) : uid());
  const X = nouvelleExpedition(heros, graine);
  const R = rngDe(graine + '/v4');
  X.v = 4; X.mer = opts.mer || 'nuages'; X.asc = opts.asc || 0; X.jour = !!opts.jour; X.debloques = opts.debloques != null ? opts.debloques : meta.gagnes;
  // 25/11 (choix de l'utilisateur : « trop de choix de monstres dans mon magasin ») : le recruteur ne propose que 6 SORTES de recrues par voyage
  // (3 de base, 2 moyennes, 1 forte), tirées au départ : on retrouve plus souvent les mêmes, donc plus de fusions
  if (!globalThis.SANS_SORTES) { const R2 = rngDe(graine + '/sortes'), d = recruesDispo(X); X.sortes = [];
    // 2 FAMILLES par voyage (toutes leurs recrues) : moins de sortes donc plus de fusions, et les bonus de famille restent possibles
    const fams = [...new Set(d.map(k => RECRUES[k].fam).filter(f => f && d.some(k => RECRUES[k].fam === f && RECRUES[k].t === 1)))], choisies = [];
    for (let i = 0; i < 2 && fams.length; i++) choisies.push(fams.splice(Math.floor(R2() * fams.length), 1)[0]);
    X.sortes = d.filter(k => choisies.includes(RECRUES[k].fam)); X.familles = choisies;
    if (globalThis.SORTES_SIX) { X.sortes = []; X.familles = null; const prend = l => { if (l.length) X.sortes.push(l.splice(Math.floor(R2() * l.length), 1)[0]); };
      [['rempart'], ['lame'], ['tireur', 'soutien']].forEach(roles => prend(d.filter(k => RECRUES[k].t === 1 && roles.includes(RECRUES[k].role) && !X.sortes.includes(k))));
      [[2, 2], [3, 1]].forEach(([t, n]) => { const l = d.filter(k => RECRUES[k].t === t); for (let i = 0; i < n; i++) prend(l); }); } }
  X.boss = tire(R, MERS[X.mer].boss);
  // 26/11 (l'utilisateur : « je n'ai qu'Ignaros dans le flash ») : le boss du flash change chaque jour parmi les 5 boss (le même pour tous ce jour-là)
  if (opts.flash) { const L = Object.keys(BOSS_V4), j = Math.floor(Date.UTC(...new Date().toISOString().slice(0, 10).split('-').map((v, i) => i === 1 ? v - 1 : +v)) / 864e5); X.boss = opts.flashBoss || L[j % L.length]; }
  X.regle = opts.regle || tire(R, opts.flash ? FLASH_REGLES : Object.keys(REGLES_V4));
  X.coeursMax = 3; X.route = []; X.carte4b = true; X.carte = carteV4(X);
  if (opts.flash) { X.flash = true; if (typeof defisJourTire === 'function') X.fdefis = defisJourTire('expedition', FLASH_DEFIS_EXP); X.carte = carteFlash(X); X.coeurs = X.coeursMax = 2; X.or = 12; }
  if (X.regle === 'calme') { X.coeurs = 4; X.coeursMax = 4; }
  if (X.asc >= 9) { X.coeurs = Math.min(X.coeurs, 2); X.coeursMax = Math.min(X.coeursMax, 2); }
  if (X.asc >= 3) X.or = Math.max(0, X.or - 2);
  if (X.regle === 'veterans') { const k = tire(R, (X.sortes && X.sortes.length ? X.sortes : recruesDispo(X)).filter(k => RECRUES[k].t === 1)), p = placeLibre(X, ['tireur', 'soutien'].includes(RECRUES[k].role) ? 'ar' : 'av'); if (p) poseA(X, p, nouvelleRecrue(k, 1)); }
  X.journal = [`Le navire de ${HEROS[heros].nom} quitte la Guilde pour ${MERS[X.mer].n}. Règle du voyage : ${REGLES_V4[X.regle].e} ${REGLES_V4[X.regle].n}.`, `🧭 Le recruteur de ce voyage propose : ${(X.sortes || []).map(k => RECRUES[k].n).join(', ')}.`];
  nouvelleOffre(X); synchroRoute(X); return X;
}
// choisir l'escale de l'étape en cours (parmi les options de la carte)
function choisitEscale(X, i) { const o = X.carte[X.escale][i]; if (!o) return false; X.route[X.escale] = o; X.journal.push(`🧭 Cap sur ${o.e} ${o.n}.`); synchroRoute(X); return true; }
const doitChoisir = X => X && X.v === 4 && !X.fini && !X.route[X.escale] && X.carte[X.escale] && X.carte[X.escale].length > 1;

// ----------------------------------------------------------------------------------------------- remplacements dans le moteur
const _offre3 = nouvelleOffre, _adv3 = adversaire, _joue3 = joueEscale;
nouvelleOffre = function (X) {
  if (X.v !== 4) return _offre3(X);
  const R = hasardX(X), e6 = X.carte4b ? X.escale * 6 / X.carte.length : X.escale, tier = Math.min(3, 1 + Math.floor(e6 / 2)), pool = (X.sortes && X.sortes.length ? X.sortes : recruesDispo(X)).filter(k => RECRUES[k].t <= tier);
  const n = (X.heros === 'oria' ? 5 : 4) + (X.regle === 'marche' ? 1 : 0) - (X.asc >= 5 ? 1 : 0);
  X.offre = Array.from({ length:n }, () => tire(R, pool));
};
// 25/11 : avec le recruteur à 2 familles, l'équipage est bien plus fort (fusions + bonus de famille) : les monstres ont plus de vie (réglé au simulateur)
const DUR_FAM = 1.35; // simulateur 25/11 : 1,3 → ≈ 83 %, 1,45 → ≈ 75 %
function plateauV4(X, def, mul) {
  if (X.familles && !X.flash) mul *= (globalThis.DURF || DUR_FAM);
  mul *= X.fsE || 1; // 27/11 soir : le héros monté
  const P = { av:[null, null, null], ar:[null, null, null] }, M = MERS[X.mer];
  const asc = 1 + (X.asc >= 1 ? .04 : 0) + (X.asc >= 6 ? .05 : 0), atq = (X.regle === 'enrages' ? 1 : 0) + (X.asc >= 7 ? 1 : 0);
  const fait = ([n, a, v, tag]) => ({ id:uid(), key:'m', n, a:a + atq, v:Math.round(v * mul * M.pv * asc), star:0, bonusA:0, bonusV:0, ...tagsMonstre(tag) });
  def.av.forEach((x, i) => { P.av[i] = fait(x); }); def.ar.forEach((x, i) => { P.ar[i] = fait(x); });
  return P;
}
adversaire = function (X) {
  if (X.v !== 4) return _adv3(X);
  const esc = X.route[X.escale] || ESCALES2[X.escale], M = MERS[X.mer];
  if (esc.type === 'fantome') { const f = fantome(X, X.carte4b ? Math.round(X.escale * 6 / X.carte.length) : X.escale); const k = M.pv * (1 + (X.asc >= 1 ? .04 : 0) + (X.asc >= 6 ? .05 : 0)); [...f.plateau.av, ...f.plateau.ar].forEach(u => { if (u) u.v = Math.round(u.v * k); });
    return { nom:`Le navire de ${HEROS[f.heros].nom}`, camp:{ heros:f.heros, plateau:f.plateau, X:f.X }, fantome:f.heros }; }
  if (esc.type === 'elite') { const g = M.elites[esc.el || 0], P = plateauV4(X, g, esc.dur || DUR_V4[X.escale]); if (X.asc >= 2) [...P.av, ...P.ar].forEach(u => { if (u) u.a++; });
    return { nom:g.n, camp:{ heros:null, plateau:P, X:null, meca:g.meca }, meca:g.meca, mecaTxt:g.d }; }
  if (esc.type === 'boss') { const B = BOSS_V4[X.boss], P = plateauV4(X, B, (X.flash ? FLASH_DUR[2] : X.carte4b ? DUR_BOSS4 : DUR_V4[5]) * (X.regle === 'rancon' ? 1.15 : 1) * (X.asc >= 10 ? 1.2 : X.asc >= 4 ? 1.08 : 1));
    if (B.meca === 'miroir') { const m = meilleure4(X), a = m ? m.a + m.bonusA + 2 : 6, roi = P.av[0]; roi.a = Math.max(roi.a, a); P.ar.forEach(u => { if (u && u.n === 'Reflet') u.v = Math.round(roi.v / 4); }); }
    return { nom:B.n, camp:{ heros:null, plateau:P, X:null, meca:B.meca }, meca:B.meca, mecaTxt:B.d }; }
  const g = M.groupes[esc.g || 0]; return { nom:g.n, camp:{ heros:null, plateau:plateauV4(X, g, esc.dur || DUR_V4[X.escale]), X:null } };
};
// les mécaniques des boss et des élites : appelées au début de chaque round par combatExp (crochet campE.tour)
const MECAS_V4 = {
  rage(r, J, E, ev) { const b = E.liste.find(u => !u.mort && u.barriere) || E.liste.find(u => !u.mort); if (b && r > 1) { b.a++; ev.push({ t:'meca', id:b.id, txt:'😡 Rage : +1 attaque' }); } },
  meute(r, J, E, ev) { const m = E.liste[0]; if (!m || m.mort) return; const morts = E.liste.filter(u => u.mort && /Louveteau/.test(u.n)).length; if (morts > (E.meuteVu || 0)) { m.a += 2 * (morts - (E.meuteVu || 0)); E.meuteVu = morts; ev.push({ t:'meca', id:m.id, txt:'🐺 La meute hurle : +2 attaque' }); } },
  eruption(r, J, E, ev, tue) { if (r % 3) return; ev.push({ t:'meca', id:E.liste[0].id, txt:'🌋 Éruption !' }); J.liste.filter(u => !u.mort && u.rang === 'av').forEach(u => { u.v -= 3; ev.push({ t:'epines', id:u.id, n:3, v:u.v }); tue(J, u); }); },
  souffle(r, J, E, ev, tue) { if (r !== 2 && (r < 2 || (r - 2) % 3)) return; ev.push({ t:'meca', id:E.liste[0].id, txt:'🐉 Souffle de feu sur l’arrière !' }); J.liste.filter(u => !u.mort && u.rang === 'ar').forEach(u => { u.v -= 3; ev.push({ t:'epines', id:u.id, n:3, v:u.v }); tue(J, u); }); },
  gel(r, J, E, ev) { J.liste.forEach(u => { if (u.gele) { u.a = u.aAvantGel; u.gele = false; } }); if (r % 2 === 0) return; const c = J.liste.filter(u => !u.mort).sort((a, b) => b.a - a.a)[0]; if (c) { c.aAvantGel = c.a; c.a = 0; c.gele = true; ev.push({ t:'meca', id:c.id, txt:'❄ Gelé ce round' }); } },
  tentacules(r, J, E, ev) { if (r < 3 || r % 3) return; const t = E.liste.find(u => u.mort && /Tentacule/.test(u.n)); if (t && E.liste.some(u => !u.mort && u.boss)) { t.mort = false; t.v = Math.ceil(t.vmax / 2); ev.push({ t:'releve', id:t.id, v:t.v, txt:'🦑 La tentacule repousse !' }); } },
  miroir() {},
};
// les règles du voyage et les mécaniques passent par le camp : on enveloppe joueEscale
joueEscale = function (X, R) {
  if (X.v !== 4) return _joue3(X, R);
  synchroRoute(X);
  const esc = X.route[X.escale]; if (!esc || !ESCALE_COMBAT(esc.type)) throw new Error('escale sans combat : passer par resoutEscale');
  const orAvant = X.or, res = _joue3(X, R);
  if (res.gagne && X.regle === 'enrages') { X.or += 3; res.gain = (res.gain || 0) + 3; }
  if (!X.fini && X.regle === 'bourse') { X.or += 2; res.gain = (res.gain || 0) + 2; }
  if (!X.fini && X.regle === 'tempete') { X.or += 3; res.gain = (res.gain || 0) + 3; }
  if (res.gagne && esc.type === 'elite') { X.or += 4; res.elite = '+4 💰 (prime de l’élite)'; }
  if (res.gagne && !X.fini && esc.type !== 'boss') { X.capChoix = offreCapitaine(X); res.capChoix = true; } // 27/11 soir : le capitaine progresse
  // 19/11 (décision de l'utilisateur) : perdre contre le boss = FIN DU VOYAGE (plus de nouvel essai avec les cœurs qui restent)
  // 24/11 (décision de l'utilisateur) : le boss aussi se rejoue tant qu'il reste des cœurs (comme tous les combats)
  if (X.coeurs > X.coeursMax) X.coeurs = X.coeursMax;
  synchroRoute(X); return res;
};
// le crochet du combat : combatExp ne le connaît pas, on le pose en enveloppant combatExp
const _combat3 = combatExp;
combatExp = function (campJ, campE, R) {
  const X = campJ.X; if (!X || X.v !== 4) return _combat3(campJ, campE, R);
  // règle : Mer démontée (−2 PV au départ) et Vent arrière (Charge au 1er round) → passées par les ordres du capitaine
  const od = X.ordres || { u:{}, tous:null };
  if (X.regle === 'tempete') od.tous = { a:(od.tous && od.tous.a) || 0, v:((od.tous && od.tous.v) || 0) - 1 };
  X.ordres = od; if (X.regle === 'vent') X.prochain = Object.assign({}, X.prochain, { charge:true });
  globalThis.__MECA4 = campE.meca ? MECAS_V4[campE.meca] : null;
  try { return _combat3(campJ, campE, R); } finally { globalThis.__MECA4 = null; }
};

// ----------------------------------------------------------------------------------------------- les escales sans combat
// renvoie { titre, texte, choix:[{t, d, possible}] } ; puis resoutChoix(X, i) → texte de suite, et l'escale est passée
function escaleSansCombat(X) {
  const esc = X.route[X.escale];
  if (esc.type === 'evenement') { const ev = EVENEMENTS_V4[esc.ev]; return { titre:`${ev.e} ${ev.n}`, texte:ev.texte, choix:ev.choix.map(c => ({ t:c.t, d:c.d + (X.asc >= 8 && /💰/.test(c.t) ? ' (Ascension : +1 💰)' : ''), possible:!c.ok || c.ok(X) })) }; }
  if (esc.type === 'tresor') return { titre:'💎 L’île au trésor', texte:'Une île minuscule, une croix peinte sur un rocher. Trois pistes mènent au trésor.', choix:[
    { t:'Le coffre doré', d:'+7 💰.', possible:true }, { t:'La caisse d’armes', d:'Une recrue ★ gratuite de ta famille la plus nombreuse (s’il reste une place).', possible:!!placeLibre(X) }, { t:'La carte ancienne', d:'Tu verras toutes les escales du reste du voyage, et +3 💰.', possible:true }] };
  if (esc.type === 'forge') { const c = capitaineDe(X), p = PRIX_FORGE_CAP;
    return { titre:'⚒ La forge du capitaine', texte:`Un vieux forgeron nain tend la main vers ${c ? c.n : 'le capitaine'} : « Ton équipage se bat bien. Toi, tu te bats nu. Paie, et je te refais. »`, choix:[
      { t:`Une lame de maître (${p.lame} 💰)`, d:`Le capitaine : +${FORGE_CAP.lame} attaque pour tout le voyage.`, possible:X.or >= p.lame },
      { t:`Une armure de capitaine (${p.armure} 💰)`, d:`Le capitaine : +${FORGE_CAP.armure} vie pour tout le voyage.`, possible:X.or >= p.armure },
      { t:'Repartir sans rien', d:'+2 💰 (tu revends de la ferraille).', possible:true }] }; }
  return { titre:'🏝 Le port franc', texte:'Un port neutre, sans monstres ni rivaux. On y répare, on y recrute, on y boit.', choix:[
    { t:'Réparer la coque', d:'+1 cœur.', possible:X.coeurs < X.coeursMax }, { t:'Recruter à la taverne', d:'+5 💰 et une nouvelle offre au recruteur.', possible:true }] };
}
function resoutChoix(X, i) {
  const esc = X.route[X.escale]; let txt = '';
  if (esc.type === 'evenement') { const c = EVENEMENTS_V4[esc.ev].choix[i]; if (c.ok && !c.ok(X)) return null; if (X.asc >= 8) { const m = /\((\d+) 💰\)/.exec(c.t); if (m && X.or < +m[1] + 1) return null; if (m) X.or--; } txt = c.f(X); }
  else if (esc.type === 'tresor') {
    if (i === 0) { X.or += 7; txt = 'Le coffre déborde : 7 pièces d’or !'; }
    else if (i === 1) { const fam = compteFamilles(X, X.plateau), top = Object.keys(fam).sort((a, b) => fam[b] - fam[a])[0], R = hasardX(X), l = recruesDispo(X).filter(k => (!top || RECRUES[k].fam === top) && RECRUES[k].t <= 2), k = tire(R, l.length ? l : recruesDispo(X)), p = placeLibre(X, ['tireur', 'soutien'].includes(RECRUES[k].role) ? 'ar' : 'av');
      if (!p) return null; poseA(X, p, nouvelleRecrue(k, 1)); fusionne(X); txt = `Dans la caisse, ${RECRUES[k].n} ★ attendait son capitaine.`; }
    else { X.or += 3; X.carteVue = true; txt = 'La carte montre toute la route jusqu’au boss. Et quelques pièces dans le rouleau.'; } }
  else if (esc.type === 'forge') { const c = capitaineDe(X), p = PRIX_FORGE_CAP;
    if (i === 0) { if (X.or < p.lame || !c) return null; X.or -= p.lame; c.bonusA += FORGE_CAP.lame; X.capForge = (X.capForge || 0) + 1; txt = `Une lame de maître : ${c.n} +${FORGE_CAP.lame} attaque.`; }
    else if (i === 1) { if (X.or < p.armure || !c) return null; X.or -= p.armure; c.bonusV += FORGE_CAP.armure; X.capForge = (X.capForge || 0) + 1; txt = `Une armure de capitaine : ${c.n} +${FORGE_CAP.armure} vie.`; }
    else { X.or += 2; txt = 'Le forgeron rachète ta ferraille : 2 pièces.'; } }
  else { if (i === 0) { if (X.coeurs >= X.coeursMax) return null; X.coeurs++; txt = 'Les charpentiers du port font des miracles : un cœur de plus.'; } else { X.or += 5; nouvelleOffre(X); txt = 'La taverne est pleine de volontaires : nouvelle offre au recruteur, et 5 💰 de pourboires.'; } }
  X.journal.push(`${esc.e} ${esc.n} : ${txt}`);
  // l'escale est passée : on avance, on gagne la paie du port (moitié : on n'a pas combattu)
  X.escale++; const gain = 4 + (X.regle === 'bourse' ? 2 : 0); X.or += gain; if (!X.gel) nouvelleOffre(X); X.gel = false; X.transmuOk = true;
  synchroRoute(X); return { texte:txt, gain };
}

// ----------------------------------------------------------------------------------------------- le score et la fin
function scoreV4(X) {
  const gagne = X.fini === 'gagne', parfait = gagne && X.coeurs === X.coeursMax;
  const base = X.victoires * 100 + X.coeurs * 100 + X.or + (gagne ? 300 : 0) + (parfait ? 200 : 0);
  const k = ((DIFF_EXP[X.diff] || DIFF_EXP.normal).pts) * (1 + ORDRE_MERS.indexOf(X.mer) * .25) * (1 + X.asc * .1) * (X.regle === 'rancon' && gagne ? 2 : 1);
  return Math.round(base * k);
}
// à la fin d'un voyage gagné : mer suivante ouverte, cran d'ascension suivant, une recrue débloquée
function finVoyageMeta(X) {
  const m = lireMeta4(), apport = [];
  // 23/11 : le flash du jour : son 1er essai compte (étoiles, panneau « Aujourd'hui », quête, petite récompense) ; il n'ouvre ni mer ni Ascension
  if (X.flash) {
    const j = new Date().toISOString().slice(0, 10), gagne = X.fini === 'gagne', et = !gagne ? 0 : 1 + (X.fdefis ? X.fdefis.filter(k => FLASH_DEFIS_EXP[k] && FLASH_DEFIS_EXP[k].ok(X)).length : (X.coeurs >= X.coeursMax ? 1 : 0) + (X.coeurs >= X.coeursMax && X.or >= 6 ? 1 : 0));
    m.flash = m.flash || {};
    if (!m.flash[j] && !X.flashLibre) {
      const xp = 10 + 5 * et, or = 5 * et; // 24/11 : à récupérer dans le carnet
      m.flash[j] = { gagne, etoiles:et, score:scoreV4(X), rec:{ xp, or }, recup:false }; Object.keys(m.flash).sort().slice(0, -30).forEach(k => delete m.flash[k]);
      if (typeof guildeEvt === 'function') try { guildeEvt('flash', 1); } catch (e) {}
      apport.push(`⚡ Flash du jour compté : ${gagne ? '★'.repeat(et) + '☆'.repeat(3 - et) : 'perdu'} · +${xp} XP${or ? ` · 🪙 +${or}` : ''} à récupérer dans 📜 le carnet. Reviens demain !`);
      if (X.fdefis && typeof defisJourTexte === 'function') apport.push(defisJourTexte(FLASH_DEFIS_EXP, X.fdefis, X));
    } else apport.push('⚡ Essai pour le plaisir : ton flash du jour était déjà compté.');
    if (gagne) apport.push('★★ : sans perdre de cœur · ★★★ : sans perdre de cœur, et 6 💰 ou plus à l’arrivée.');
    ecritMeta4(m); return apport;
  }
  if (X.fini === 'gagne') {
    if (!m.mers[X.mer]) { m.mers[X.mer] = 1; const s = ORDRE_MERS[ORDRE_MERS.indexOf(X.mer) + 1]; if (s) apport.push(`🗺 Nouvelle mer ouverte : ${MERS[s].e} ${MERS[s].n} !`); } else m.mers[X.mer]++;
    if (X.asc >= ascMax4(m, X.mer) && X.asc < 10) { m.asc[X.mer] = X.asc + 1; apport.push(`⛰ Ascension ${X.asc + 1} ouverte sur ${MERS[X.mer].n}.`); }
    m.bossVus = Array.from(new Set((m.bossVus || []).concat(X.boss && (X.boss.n || X.boss.id || X.boss) || []))); // 22/11 : succès « Chasseur de boss »
    m.gagnes = (m.gagnes || 0) + 1; const nv = Object.entries(RECRUES_V4).find(([, r]) => r.verrou === m.gagnes); if (nv) apport.push(`🎖 Nouvelle recrue au recruteur : ${nv[1].n} !`);
  }
  if (X.jour) { const j = new Date().toISOString().slice(0, 10), s = scoreV4(X); m.jour = m.jour && m.jour.j === j ? m.jour : { j, best:0, essais:0 }; m.jour.essais++; if (s > m.jour.best) { m.jour.best = s; apport.push(`📅 Meilleur score du voyage du jour : ${s} !`); } }
  ecritMeta4(m); return apport;
}

// ----------------------------------------------------------------------------------------------- 27/11 soir : LE CAPITAINE PROGRESSE (décision de l'utilisateur : « les deux »)
// (a) après chaque combat gagné (sauf le boss) : 1 petite amélioration parmi 3 ; (b) une escale « ⚒ La forge du capitaine » sur la carte, où l'on paie
// pour une grosse amélioration. (c) Le héros monté compte : son capitaine part avec une partie de ce que le héros a gagné (PV, attaque), et les
// monstres suivent un peu (EXP_SUIVI), pour qu'un héros très monté garde une avance sans tout écraser. Réglé au simulateur (Equilibrage-personnages.md).
const AMELIO_CAP = {
  atq:   { e:'⚔', n:'Bras de fer', d:'+1 attaque', f:c => { c.bonusA += 1; } },
  vie:   { e:'❤', n:'Cuir épais', d:'+5 vie', f:c => { c.bonusV += 5; } },
  maitre:{ e:'🎯', n:'Coup de maître', d:'sa 1re frappe de chaque combat fait +3 (cumulable)', f:(c, X) => { X.capMaitre = (X.capMaitre || 0) + 3; } },
  cri:   { e:'📣', n:'Cri de ralliement', d:'au 1er round, toute ta rangée de devant +1 attaque (cumulable, 2 au plus)', ok:X => (X.capCri || 0) < 2, f:(c, X) => { X.capCri = (X.capCri || 0) + 1; } },
  garde: { e:'🛡', n:'Mur de boucliers', d:'tes Remparts et le capitaine +2 vie (pour tout le voyage)', f:(c, X) => { toutes(X).filter(u => u.key === 'capitaine' || (RECRUES[u.key] || {}).role === 'rempart').forEach(u => { u.bonusV += 2; }); } },
};
let FORGE_CAP = { lame:3, armure:15 }, PRIX_FORGE_CAP = { lame:6, armure:5 };
let EXP_SUIVI = { vie:0.15, cap:0.6 }; // vie des monstres : +15 % du gain de force ; le capitaine reçoit 60 % des PV gagnés par le héros
const capitaineDe = X => toutes(X).find(u => u && u.key === 'capitaine');
function offreCapitaine(X) { const R = hasardX(X), l = Object.keys(AMELIO_CAP).filter(k => !AMELIO_CAP[k].ok || AMELIO_CAP[k].ok(X)); const o = [];
  while (o.length < 3 && l.length) o.push(l.splice(Math.floor(R() * l.length), 1)[0]); return o; }
function choisitCapitaine(X, i) { const k = X.capChoix && X.capChoix[i], c = capitaineDe(X); X.capChoix = null; if (!k || !c) return null;
  AMELIO_CAP[k].f(c, X); (X.capAmelio = X.capAmelio || []).push(k); X.journal.push(`${AMELIO_CAP[k].e} Le capitaine progresse : ${AMELIO_CAP[k].n} (${AMELIO_CAP[k].d}).`); return k; }
const piloteCap = X => { const l = X.capChoix || []; const pref = ['atq', 'vie', 'maitre', 'cri', 'garde']; let b = 0; l.forEach((k, i) => { if (pref.indexOf(k) < pref.indexOf(l[b])) b = i; }); return b; };
// le héros monté (statsHeros / forceSuiveuse de heros-etoiles.js) : b = bonusHerosPvE(id), f = forceSuiveuse(id)
function appliqueHerosExp(X, b, f) { const c = capitaineDe(X); if (!c || !b) return;
  const v = Math.round(EXP_SUIVI.cap * (b.pv || 0) + 2 * (b.bouclier || 0) / 3), a = (b.att || 0) + ((b.main || 0) > 0 ? 1 : 0);
  c.bonusV += v; c.bonusA += a; X.fsE = f > 1.05 ? Math.round((1 + EXP_SUIVI.vie * (f - 1)) * 100) / 100 : 1; X.capHeros = { v, a };
  if (v || a) X.journal.push(`🎖 Le capitaine part avec son expérience de héros : +${a} attaque, +${v} vie.${X.fsE > 1 ? ` Les monstres de ce voyage sont plus solides (×${X.fsE}).` : ''}`); }

// ----------------------------------------------------------------------------------------------- le pilote du simulateur (choix de route et d'événements)
function piloteRoute(X, R) {
  const o = X.carte[X.escale]; if (o.length === 1) return choisitEscale(X, 0);
  // un joueur raisonnable : port franc si blessé, sinon combat facile ou trésor, élite si l'équipage est costaud
  const force = surPlateau(X).reduce((s, u) => s + u.a + u.v + (u.star || 0) * 8, 0), note = e => e.type === 'port' ? (X.coeurs < X.coeursMax ? 9 : 2) : e.type === 'tresor' ? 6 : e.type === 'evenement' ? 4 : e.type === 'elite' ? (force > 70 + X.escale * 12 ? 7 : 1) : e.type === 'fantome' ? 3 : e.type === 'forge' ? (X.or >= PRIX_FORGE_CAP.armure ? 6 : 1) : 5;
  const i = o.map((e, k) => [note(e) + R() * 2, k]).sort((a, b) => b[0] - a[0])[0][1]; return choisitEscale(X, i);
}
function simuleVoyage(heros, graine, opts) {
  const X = nouveauVoyage(heros, Object.assign({ graine, debloques:0 }, opts || {})); if (globalThis.DIFF_SIM) X.diff = globalThis.DIFF_SIM;
  if (opts && opts.hb) appliqueHerosExp(X, opts.hb, opts.hf || 1); // 27/11 soir : un héros monté fictif (simulateur)
  const types = [];
  for (let pas = 0; pas < 20 && !X.fini; pas++) {
    if (doitChoisir(X)) piloteRoute(X, hasardX(X));
    const esc = X.route[X.escale]; types.push(esc.type);
    if (!ESCALE_COMBAT(esc.type)) { const s = escaleSansCombat(X); let i = s.choix.findIndex(c => c.possible); if (esc.type === 'tresor' && s.choix[1].possible) i = 1; if (esc.type === 'forge') i = s.choix[0].possible ? 0 : s.choix[1].possible ? 1 : 2; resoutChoix(X, Math.max(0, i)); continue; }
    if (X.capChoix) choisitCapitaine(X, piloteCap(X));
    pilotePort(X); piloteOrdres(X, hasardX(X)); piloteCible(X); joueEscale(X, hasardX(X));
    if (X.capChoix && !X.fini) choisitCapitaine(X, piloteCap(X));
  }
  return { gagne:X.fini === 'gagne', coeurs:X.coeurs, escale:X.escale, victoires:X.victoires, boss:X.boss, regle:X.regle, types, score:scoreV4(X), fusions:toutes(X).filter(u => u.star).length, doubles:toutes(X).filter(u => u.star === 2).length };
}
