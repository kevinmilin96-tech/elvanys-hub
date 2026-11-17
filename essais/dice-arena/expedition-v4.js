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
  pirate:    { n:'Pirate abordeur', fam:'clan', role:'lame', a:4, v:5, charge:true, t:1, verrou:1, art:'milicien', d:'Charge : frappe en premier au 1er round.' },
  sirene:    { n:'Sirène des brumes', fam:'clairiere', role:'soutien', a:1, v:4, soigneur:3, t:2, verrou:2, art:'faon', d:'Soigne de 3 l’allié le plus blessé à chaque round.' },
  harpie:    { n:'Harpie des falaises', fam:'ombre', role:'tireur', a:3, v:4, t:2, verrou:3, art:'lynx', d:'Tireuse de l’Ombre : son 1er tir peut faire double dégât (Embuscade).' },
  ours:      { n:'Ours des glaces', fam:'garde', role:'rempart', a:3, v:10, barriere:true, epines:1, t:2, verrou:4, art:'gardien', d:'Barrière et Épines 1.' },
  canonnier: { n:'Canonnier du bord', fam:'forge', role:'tireur', a:5, v:4, t:3, gros:true, verrou:5, art:'automate', d:'Le plus gros tir de la Forge.' },
  yeti:      { n:'Yéti des cimes', fam:'clan', role:'lame', a:5, v:10, charge:true, t:3, gros:true, verrou:6, art:'colosse', d:'Charge, et de quoi encaisser.' },
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
      { n:'Le Port de Marennes', e:'⚓', cle:'port', av:[['Loup de braise', 4, 11], ['Louveteau', 3, 6]], ar:[['Salamandre', 3, 8, 'tireur'], ['Louveteau', 3, 6]] },
      { n:'Les Rizières de cendre', e:'🌾', cle:'foret', av:[['Épouvantail de braise', 3, 12, 'barriere'], ['Corbeau ardent', 4, 6, 'charge']], ar:[['Salamandre', 3, 8, 'tireur'], ['Corbeau ardent', 4, 6, 'charge']] },
      { n:'Le Cratère', e:'🌋', cle:'cratere', av:[['Élémentaire de lave', 6, 18, 'barriere'], ['Golem de scories', 4, 14, 'barriere']], ar:[['Drake de cendre', 5, 14, 'tireur'], ['Flammèche', 3, 4, 'charge'], ['Flammèche', 3, 4, 'charge']] },
    ],
    elites:[{ n:'Le Chef de guerre gobelin', e:'👺', cle:'crique', av:[['Chef de guerre', 6, 30, 'barriere'], ['Gobelin chef', 3, 9]], ar:[['Gobelin lanceur', 2, 5, 'tireur'], ['Tambour gobelin', 2, 6, 'tireur']], meca:'rage', d:'Rage : il gagne +1 attaque à chaque round.' },
            { n:'La Matriarche de braise', e:'🐺', cle:'port', av:[['Matriarche de braise', 5, 26], ['Loup de braise', 4, 11]], ar:[['Louveteau', 3, 6], ['Louveteau', 3, 6]], meca:'meute', d:'Meute : quand un Louveteau tombe, la Matriarche hurle (+2 attaque).' }],
    boss:['titan', 'ignaros'] },
  glaces: { n:'La Mer des glaces', e:'❄️', d:'Le grand nord : banquise, yétis et vouivres. Les monstres encaissent plus.', ouvre:'nuages', pv:1.12,
    decor:{ monstres:['falaises', 'foret', 'port'], fantome:['falaises'], evenement:['foret'], tresor:['crique'], port:['port'], elite:['falaises'], boss:['nid'] },
    groupes:[
      { n:'La Banquise des pingouins-guerriers', e:'🐧', cle:'falaises', av:[['Pingouin-guerrier', 3, 8], ['Pingouin-guerrier', 3, 8]], ar:[['Lanceur de glaçons', 2, 6, 'tireur']] },
      { n:'Le Col des loups blancs', e:'🐺', cle:'falaises', av:[['Loup blanc', 4, 9, 'charge'], ['Loup blanc', 4, 9, 'charge']], ar:[['Chaman du givre', 2, 7, 'tireur']] },
      { n:'La Forêt pétrifiée', e:'🌲', cle:'foret', av:[['Ent de givre', 4, 18, 'barriere'], ['Feu follet bleu', 3, 6]], ar:[['Archer des neiges', 4, 7, 'tireur'], ['Feu follet bleu', 3, 6]] },
      { n:'Le Fjord des trolls', e:'🧌', cle:'port', av:[['Troll des glaces', 6, 20, 'barriere'], ['Troll des glaces', 5, 16]], ar:[['Chaman du givre', 3, 8, 'tireur']] },
      { n:'La Faille de cristal', e:'💎', cle:'cratere', av:[['Golem de cristal', 5, 22, 'barriere'], ['Golem de cristal', 5, 18, 'barriere']], ar:[['Sorcière du blizzard', 5, 12, 'tireur'], ['Éclat vivant', 3, 5, 'charge'], ['Éclat vivant', 3, 5, 'charge']] },
    ],
    elites:[{ n:'Le Yéti ancien', e:'🦍', cle:'falaises', av:[['Yéti ancien', 7, 34, 'barriere']], ar:[['Petit yéti', 3, 8], ['Petit yéti', 3, 8]], meca:'rage', d:'Rage : il gagne +1 attaque à chaque round.' },
            { n:'La Reine des neiges', e:'👸', cle:'foret', av:[['Garde de glace', 4, 14, 'barriere'], ['Garde de glace', 4, 14, 'barriere']], ar:[['La Reine des neiges', 5, 22, 'tireur']], meca:'gel', d:'Gel : à chaque round, ta recrue la plus forte est gelée (0 attaque ce round).' }],
    boss:['vouivre', 'titan'] },
  tempetes: { n:'L’Archipel des tempêtes', e:'⛈️', d:'Pirates, harpies et krakens. La mer la plus dure, pour les équipages rodés.', ouvre:'glaces', pv:1.25,
    decor:{ monstres:['crique', 'port', 'falaises'], fantome:['falaises'], evenement:['crique'], tresor:['crique'], port:['port'], elite:['port'], boss:['nid'] },
    groupes:[
      { n:'La Crique des naufrageurs', e:'🏴‍☠️', cle:'crique', av:[['Naufrageur', 3, 9], ['Naufrageur', 3, 9]], ar:[['Pistolier', 3, 5, 'tireur']] },
      { n:'Les Récifs des harpies', e:'🦅', cle:'falaises', av:[['Harpie', 4, 7, 'charge'], ['Harpie', 4, 7, 'charge']], ar:[['Harpie tireuse', 3, 6, 'tireur'], ['Harpie tireuse', 3, 6, 'tireur']] },
      { n:'Le Repaire de Barbe-Grise', e:'⚓', cle:'port', av:[['Quartier-maître', 5, 16, 'barriere'], ['Pirate', 4, 10]], ar:[['Canonnier pirate', 5, 9, 'tireur'], ['Pirate', 4, 10]] },
      { n:'L’Œil du cyclone', e:'🌀', cle:'falaises', av:[['Élémentaire d’orage', 6, 20, 'barriere'], ['Nuée électrique', 4, 8, 'charge']], ar:[['Sorcier des vents', 5, 12, 'tireur'], ['Nuée électrique', 4, 8, 'charge']] },
      { n:'Le Cimetière des navires', e:'💀', cle:'cratere', av:[['Capitaine noyé', 6, 22, 'barriere'], ['Matelot noyé', 4, 14]], ar:[['Canonnier fantôme', 6, 12, 'tireur'], ['Mouette spectrale', 3, 5, 'charge'], ['Mouette spectrale', 3, 5, 'charge']] },
    ],
    elites:[{ n:'Le Capitaine Barbe-Grise', e:'🦜', cle:'port', av:[['Barbe-Grise', 7, 32, 'barriere'], ['Pirate', 4, 10]], ar:[['Canonnier pirate', 5, 9, 'tireur']], meca:'rage', d:'Rage : il gagne +1 attaque à chaque round.' },
            { n:'La Sirène noire', e:'🧜', cle:'crique', av:[['Matelot charmé', 4, 12], ['Matelot charmé', 4, 12]], ar:[['La Sirène noire', 4, 20, 'tireur']], meca:'gel', d:'Chant : à chaque round, ta recrue la plus forte est charmée (0 attaque ce round).' }],
    boss:['kraken', 'roi'] },
};
const ORDRE_MERS = ['nuages', 'glaces', 'tempetes'];

// ----------------------------------------------------------------------------------------------- les boss (tirés au sort parmi ceux de la mer, connus dès le départ)
const BOSS_V4 = {
  titan:   { n:'Le Titan de feu', e:'🔥', cle:'nid', av:[['Le Titan de feu', 8, 60, 'boss']], ar:[['Flammèche', 3, 5, 'charge'], ['Cultiste du feu', 4, 10, 'tireur'], ['Flammèche', 3, 5, 'charge']],
    meca:'eruption', d:'Éruption : tous les 3 rounds, la lave frappe toute ta rangée de devant (3 dégâts).' },
  ignaros: { n:'Ignaros, le dragon ancien', e:'🐉', cle:'nid', av:[['Ignaros', 9, 66, 'boss']], ar:[['Dragonnet', 4, 8, 'tireur'], ['Dragonnet', 4, 8, 'tireur']],
    meca:'souffle', d:'Souffle : au 2e round puis tous les 3 rounds, il brûle ta rangée de DERRIÈRE (4 dégâts).' },
  vouivre: { n:'La Vouivre des glaces', e:'🐲', cle:'nid', av:[['La Vouivre', 8, 64, 'boss']], ar:[['Stalagmite vivante', 3, 10, 'barriere'], ['Givrelin', 3, 7, 'tireur']],
    meca:'gel', d:'Gel : à chaque round, ta recrue la plus forte est gelée (0 attaque ce round).' },
  kraken:  { n:'Le Kraken des brumes', e:'🦑', cle:'nid', av:[['Tentacule', 4, 14, 'barriere'], ['Le Kraken', 7, 58, 'boss'], ['Tentacule', 4, 14, 'barriere']], ar:[['Tentacule', 4, 12, 'tireur']],
    meca:'tentacules', d:'Tentacules : tous les 2 rounds, une tentacule coupée repousse (à moitié vie).' },
  roi:     { n:'Le Roi sans visage', e:'👤', cle:'nid', av:[['Le Roi sans visage', 6, 62, 'boss']], ar:[['Reflet', 3, 8, 'tireur'], ['Reflet', 3, 8, 'tireur']],
    meca:'miroir', d:'Miroir : il prend l’attaque de ta meilleure recrue (+2), et ses Reflets copient sa vie.' },
};

// ----------------------------------------------------------------------------------------------- les règles du voyage (une tirée à chaque départ)
const REGLES_V4 = {
  vent:     { n:'Vent arrière', e:'🌬', d:'Au 1er round de chaque combat, ta rangée de devant a Charge (frappe en premier).' },
  bourse:   { n:'Bourse pleine', e:'💰', d:'+2 💰 à chaque passage au port.' },
  enrages:  { n:'Monstres enragés', e:'😡', d:'Les monstres ont +1 attaque, mais chaque victoire rapporte +3 💰.' },
  calme:    { n:'Mer calme', e:'🌊', d:'Le navire part avec un 4e cœur.' },
  marche:   { n:'Grand marché', e:'🛒', d:'Le recruteur montre une recrue de plus.' },
  veterans: { n:'Vétérans à bord', e:'🎖', d:'Tu pars avec une recrue ★ déjà fusionnée.' },
  tempete:  { n:'Mer démontée', e:'⛈', d:'Ton équipage commence chaque combat à −2 PV, mais les escales rapportent +3 💰.' },
  rancon:   { n:'La rançon du boss', e:'👑', d:'Le boss a +20 % de vie, mais le voyage vaut double points.' },
};

// ----------------------------------------------------------------------------------------------- les événements à choix (escales « ❔ »)
// f(X) applique l'effet et renvoie le texte de suite ; ok(X) : le choix est-il possible ?
const EVENEMENTS_V4 = {
  passager: { n:'Le passager mystérieux', e:'🧥', cle:'foret', texte:'Un voyageur encapuchonné attend sur le quai. « Emmenez-moi jusqu’à la prochaine escale. Je paierai… à ma façon. »',
    choix:[{ t:'Le prendre à bord', d:'Une recrue au hasard rejoint gratuitement l’équipage (s’il reste une place).', f:X => { const k = tire(hasardX(X), recruesDispo(X).filter(k => RECRUES[k].t <= 2)), p = placeLibre(X, ['tireur', 'soutien'].includes(RECRUES[k].role) ? 'ar' : 'av'); if (!p) { X.or += 3; return 'Plus de place : il laisse 3 💰 sur la table et disparaît.'; } poseA(X, p, nouvelleRecrue(k, 0)); fusionne(X); return `Il retire sa capuche : ${RECRUES[k].n} ! « Je me battrai pour vous. »`; } },
           { t:'Lui demander de payer d’avance', d:'+4 💰.', f:X => { X.or += 4; return 'Il compte quatre pièces d’or, sans un mot, et redescend à terre.'; } }] },
  tempete: { n:'La tempête', e:'⛈', cle:'falaises', texte:'Le ciel noircit d’un coup. Les voiles claquent, le navire volant tangue.',
    choix:[{ t:'Traverser l’orage', d:'Un cœur de moins, mais tu gagnes 6 💰 (le vent te pousse vers un trésor).', ok:X => X.coeurs > 1, f:X => { X.coeurs--; X.or += 6; return 'Le mât craque, mais au-delà des nuages, une épave pleine d’or vous attend.'; } },
           { t:'Contourner prudemment', d:'Tu perds 2 💰 de vivres.', f:X => { X.or = Math.max(0, X.or - 2); return 'Le détour est long : on mange les provisions du voyage.'; } }] },
  marchand: { n:'Le marchand pirate', e:'🦜', cle:'crique', texte:'Une barque peinte en rouge accoste. « Des épées, des runes, des secrets… Tout se vend, capitaine ! »',
    choix:[{ t:'Acheter une rune d’attaque (5 💰)', d:'Ta recrue la plus forte gagne +2 attaque pour tout le voyage.', ok:X => X.or >= 5, f:X => { X.or -= 5; const u = meilleure(X); if (u) u.bonusA += 2; return u ? `${u.n} grave la rune sur sa lame : +2 attaque.` : 'Personne pour porter la rune…'; } },
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
const meilleure = X => toutes(X).filter(u => u.key !== 'capitaine').sort((a, b) => (b.a + b.bonusA) - (a.a + a.bonusA))[0];

// ----------------------------------------------------------------------------------------------- la progression (gardée sur le téléphone)
const CLE_META4 = 'guilde-expedition4-meta';
const lireMeta4 = () => { try { return Object.assign({ mers:{}, gagnes:0, asc:{} }, JSON.parse(localStorage.getItem(CLE_META4) || '{}')); } catch (e) { return { mers:{}, gagnes:0, asc:{} }; } };
const ecritMeta4 = m => { try { localStorage.setItem(CLE_META4, JSON.stringify(m)); } catch (e) {} };
const merOuverte = (m, k) => !MERS[k].ouvre || !!m.mers[MERS[k].ouvre] || !!globalThis.TOUT_OUVERT;
const ascMax = (m, k) => Math.min(10, (m.asc[k] || 0)); // cran le plus haut OUVERT sur cette mer (0 = de base)
// les recrues du recruteur : les anciennes + celles débloquées (une par voyage gagné)
function recruesDispo(X) { const g = X && X.debloques != null ? X.debloques : 99;
  return Object.keys(RECRUES).filter(k => !RECRUES[k].verrou || RECRUES[k].verrou <= g); }
// l'ascension : chaque cran ajoute un peu de difficulté (ce qui est dit dans la page de conception)
const ASC_V4 = ['De base', '+6 % de vie aux monstres', 'les élites ont +1 attaque', '−2 💰 au départ', 'le boss a +10 % de vie', 'le recruteur : une recrue de moins',
  '+6 % de vie encore', 'les monstres ont +1 attaque', 'les événements coûtent plus', 'le navire part avec 2 cœurs', 'le boss a +20 % de vie'];

// ----------------------------------------------------------------------------------------------- la carte du voyage
// 6 étapes ; à chaque étape (sauf la dernière), 2 ou 3 escales au choix. Les sortes possibles par étape (une de chaque est tirée) :
const ETAPES_V4 = [
  [['monstres'], ['monstres', 'evenement']],
  [['fantome'], ['evenement', 'tresor'], ['monstres']],
  [['monstres'], ['elite'], ['port', 'evenement']],
  [['fantome', 'monstres'], ['evenement', 'tresor'], ['elite']],
  [['monstres'], ['elite'], ['port']],
  [['boss']],
];
const TIER_ETAPE = [0, 1, 2, 3, 4, 5]; // groupe de monstres selon l'étape (0-1 faciles, 2-3 moyens, 4 durs)
const DUR_V4 = [1.35, 1.3, 1.55, 1.5, 1.9, 2.05];
function escaleDe(X, type, etape, R) {
  const M = MERS[X.mer], cle = tire(R, M.decor[type] || ['crique']);
  if (type === 'monstres') { const tier = Math.min(4, etape === 0 ? tire(R, [0, 1]) : etape === 1 ? 1 : etape === 2 ? tire(R, [2, 3]) : etape === 3 ? 3 : 4); const g = M.groupes[tier]; return { type, etape, n:g.n, e:g.e, cle:g.cle, g:tier }; }
  if (type === 'elite') { const i = Math.floor(R() * M.elites.length), g = M.elites[i]; return { type, etape, n:g.n, e:g.e, cle:g.cle, el:i }; }
  if (type === 'fantome') return { type, etape, n:'Un navire rival', e:'👻', cle };
  if (type === 'evenement') { const k = tire(R, Object.keys(EVENEMENTS_V4)), ev = EVENEMENTS_V4[k]; return { type, etape, n:ev.n, e:'❔', cle:ev.cle, ev:k }; }
  if (type === 'tresor') return { type, etape, n:'L’île au trésor', e:'💎', cle };
  if (type === 'port') return { type, etape, n:'Le port franc', e:'🏝', cle:'port' };
  return { type:'boss', etape, n:BOSS_V4[X.boss].n, e:BOSS_V4[X.boss].e, cle:'nid' };
}
function carteV4(X) {
  const R = rngDe(X.graine + '/carte4');
  return ETAPES_V4.map((sortes, etape) => sortes.map(choix => escaleDe(X, tire(R, choix), etape, R)));
}
// la route jouée → les tableaux du moteur (l'écran lit ESCALES2[X.escale])
function synchroRoute(X) {
  if (!X || X.v !== 4) return;
  const l = X.carte.map((opts, k) => X.route[k] || (opts.length === 1 ? opts[0] : { type:'?', n:'Au choix', e:'❔', cle:'falaises', etape:k }));
  ESCALES2.splice(0, ESCALES2.length, ...l);
}
const ESCALE_COMBAT = t => ['monstres', 'elite', 'fantome', 'boss'].includes(t);

// ----------------------------------------------------------------------------------------------- un nouveau voyage
// opts : { mer, asc, jour (true = voyage du jour), graine }
function nouveauVoyage(heros, opts) {
  opts = opts || {}; const meta = typeof localStorage !== 'undefined' ? lireMeta4() : { gagnes:99 };
  const graine = opts.graine || (opts.jour ? 'jour-' + new Date().toISOString().slice(0, 10) : uid());
  const X = nouvelleExpedition(heros, graine);
  const R = rngDe(graine + '/v4');
  X.v = 4; X.mer = opts.mer || 'nuages'; X.asc = opts.asc || 0; X.jour = !!opts.jour; X.debloques = opts.debloques != null ? opts.debloques : meta.gagnes;
  X.boss = tire(R, MERS[X.mer].boss); X.regle = opts.regle || tire(R, Object.keys(REGLES_V4));
  X.coeursMax = 3; X.route = []; X.carte = carteV4(X);
  if (X.regle === 'calme') { X.coeurs = 4; X.coeursMax = 4; }
  if (X.asc >= 9) { X.coeurs = Math.min(X.coeurs, 2); X.coeursMax = Math.min(X.coeursMax, 2); }
  if (X.asc >= 3) X.or = Math.max(0, X.or - 2);
  if (X.regle === 'veterans') { const k = tire(R, recruesDispo(X).filter(k => RECRUES[k].t === 1)), p = placeLibre(X, ['tireur', 'soutien'].includes(RECRUES[k].role) ? 'ar' : 'av'); if (p) poseA(X, p, nouvelleRecrue(k, 1)); }
  X.journal = [`Le navire de ${HEROS[heros].nom} quitte la Guilde pour ${MERS[X.mer].n}. Règle du voyage : ${REGLES_V4[X.regle].e} ${REGLES_V4[X.regle].n}.`];
  nouvelleOffre(X); synchroRoute(X); return X;
}
// choisir l'escale de l'étape en cours (parmi les options de la carte)
function choisitEscale(X, i) { const o = X.carte[X.escale][i]; if (!o) return false; X.route[X.escale] = o; X.journal.push(`🧭 Cap sur ${o.e} ${o.n}.`); synchroRoute(X); return true; }
const doitChoisir = X => X && X.v === 4 && !X.fini && !X.route[X.escale] && X.carte[X.escale];

// ----------------------------------------------------------------------------------------------- remplacements dans le moteur
const _offre3 = nouvelleOffre, _adv3 = adversaire, _joue3 = joueEscale;
nouvelleOffre = function (X) {
  if (X.v !== 4) return _offre3(X);
  const R = hasardX(X), tier = Math.min(3, 1 + Math.floor(X.escale / 2)), pool = recruesDispo(X).filter(k => RECRUES[k].t <= tier);
  const n = (X.heros === 'oria' ? 5 : 4) + (X.regle === 'marche' ? 1 : 0) - (X.asc >= 5 ? 1 : 0);
  X.offre = Array.from({ length:n }, () => tire(R, pool));
};
function plateauV4(X, def, mul) {
  const P = { av:[null, null, null], ar:[null, null, null] }, M = MERS[X.mer];
  const asc = 1 + (X.asc >= 1 ? .06 : 0) + (X.asc >= 6 ? .06 : 0), atq = (X.regle === 'enrages' ? 1 : 0) + (X.asc >= 7 ? 1 : 0);
  const fait = ([n, a, v, tag]) => ({ id:uid(), key:'m', n, a:a + atq, v:Math.round(v * mul * M.pv * asc), star:0, role:tag === 'tireur' ? 'tireur' : 'lame', tireur:tag === 'tireur', barriere:tag === 'barriere' || tag === 'boss', charge:tag === 'charge', boss:tag === 'boss', bonusA:0, bonusV:0 });
  def.av.forEach((x, i) => { P.av[i] = fait(x); }); def.ar.forEach((x, i) => { P.ar[i] = fait(x); });
  return P;
}
adversaire = function (X) {
  if (X.v !== 4) return _adv3(X);
  const esc = X.route[X.escale] || ESCALES2[X.escale], M = MERS[X.mer];
  if (esc.type === 'fantome') { const f = fantome(X, X.escale); const k = M.pv * (1 + (X.asc >= 1 ? .06 : 0)); [...f.plateau.av, ...f.plateau.ar].forEach(u => { if (u) u.v = Math.round(u.v * k); });
    return { nom:`Le navire de ${HEROS[f.heros].nom}`, camp:{ heros:f.heros, plateau:f.plateau, X:f.X }, fantome:f.heros }; }
  if (esc.type === 'elite') { const g = M.elites[esc.el || 0], P = plateauV4(X, g, DUR_V4[X.escale]); if (X.asc >= 2) [...P.av, ...P.ar].forEach(u => { if (u) u.a++; });
    return { nom:g.n, camp:{ heros:null, plateau:P, X:null, meca:g.meca, joueur:X }, meca:g.meca, mecaTxt:g.d }; }
  if (esc.type === 'boss') { const B = BOSS_V4[X.boss], P = plateauV4(X, B, DUR_V4[5] * (X.regle === 'rancon' ? 1.2 : 1) * (X.asc >= 10 ? 1.2 : X.asc >= 4 ? 1.1 : 1));
    if (B.meca === 'miroir') { const m = meilleure(X), a = m ? m.a + m.bonusA + 2 : 6, roi = P.av[0]; roi.a = Math.max(roi.a, a); P.ar.forEach(u => { if (u) u.v = Math.round(roi.v / 4); }); }
    return { nom:B.n, camp:{ heros:null, plateau:P, X:null, meca:B.meca, joueur:X }, meca:B.meca, mecaTxt:B.d }; }
  const g = M.groupes[esc.g || 0]; return { nom:g.n, camp:{ heros:null, plateau:plateauV4(X, g, DUR_V4[X.escale]), X:null } };
};
// les mécaniques des boss et des élites : appelées au début de chaque round par combatExp (crochet campE.tour)
const MECAS_V4 = {
  rage(r, J, E, ev) { const b = E.liste.find(u => !u.mort && u.barriere) || E.liste.find(u => !u.mort); if (b && r > 1) { b.a++; ev.push({ t:'meca', id:b.id, txt:'😡 Rage : +1 attaque' }); } },
  meute(r, J, E, ev) { const m = E.liste[0]; if (!m || m.mort) return; const morts = E.liste.filter(u => u.mort && /Louveteau/.test(u.n)).length; if (morts > (E.meuteVu || 0)) { m.a += 2 * (morts - (E.meuteVu || 0)); E.meuteVu = morts; ev.push({ t:'meca', id:m.id, txt:'🐺 La meute hurle : +2 attaque' }); } },
  eruption(r, J, E, ev, tue) { if (r % 3) return; ev.push({ t:'meca', id:E.liste[0].id, txt:'🌋 Éruption !' }); J.liste.filter(u => !u.mort && u.rang === 'av').forEach(u => { u.v -= 3; ev.push({ t:'epines', id:u.id, n:3, v:u.v }); tue(J, u); }); },
  souffle(r, J, E, ev, tue) { if (r !== 2 && (r < 2 || (r - 2) % 3)) return; ev.push({ t:'meca', id:E.liste[0].id, txt:'🐉 Souffle de feu sur l’arrière !' }); J.liste.filter(u => !u.mort && u.rang === 'ar').forEach(u => { u.v -= 4; ev.push({ t:'epines', id:u.id, n:4, v:u.v }); tue(J, u); }); },
  gel(r, J, E, ev) { J.liste.forEach(u => { if (u.gele) { u.a = u.aAvantGel; u.gele = false; } }); const c = J.liste.filter(u => !u.mort).sort((a, b) => b.a - a.a)[0]; if (c) { c.aAvantGel = c.a; c.a = 0; c.gele = true; ev.push({ t:'meca', id:c.id, txt:'❄ Gelé ce round' }); } },
  tentacules(r, J, E, ev) { if (r < 2 || r % 2) return; const t = E.liste.find(u => u.mort && /Tentacule/.test(u.n)); if (t && E.liste.some(u => !u.mort && u.boss)) { t.mort = false; t.v = Math.ceil(t.vmax / 2); ev.push({ t:'releve', id:t.id, v:t.v, txt:'🦑 La tentacule repousse !' }); } },
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
  if (X.coeurs > X.coeursMax) X.coeurs = X.coeursMax;
  synchroRoute(X); return res;
};
// le crochet du combat : combatExp ne le connaît pas, on le pose en enveloppant combatExp
const _combat3 = combatExp;
combatExp = function (campJ, campE, R) {
  const X = campJ.X; if (!X || X.v !== 4) return _combat3(campJ, campE, R);
  // règle : Mer démontée (−2 PV au départ) et Vent arrière (Charge au 1er round) → passées par les ordres du capitaine
  const od = X.ordres || { u:{}, tous:null };
  if (X.regle === 'tempete') od.tous = { a:(od.tous && od.tous.a) || 0, v:((od.tous && od.tous.v) || 0) - 2 };
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
  if (X.fini === 'gagne') {
    if (!m.mers[X.mer]) { m.mers[X.mer] = 1; const s = ORDRE_MERS[ORDRE_MERS.indexOf(X.mer) + 1]; if (s) apport.push(`🗺 Nouvelle mer ouverte : ${MERS[s].e} ${MERS[s].n} !`); } else m.mers[X.mer]++;
    if (X.asc >= ascMax(m, X.mer) && X.asc < 10) { m.asc[X.mer] = X.asc + 1; apport.push(`⛰ Ascension ${X.asc + 1} ouverte sur ${MERS[X.mer].n}.`); }
    m.gagnes = (m.gagnes || 0) + 1; const nv = Object.entries(RECRUES_V4).find(([, r]) => r.verrou === m.gagnes); if (nv) apport.push(`🎖 Nouvelle recrue au recruteur : ${nv[1].n} !`);
  }
  if (X.jour) { const j = new Date().toISOString().slice(0, 10), s = scoreV4(X); m.jour = m.jour && m.jour.j === j ? m.jour : { j, best:0, essais:0 }; m.jour.essais++; if (s > m.jour.best) { m.jour.best = s; apport.push(`📅 Meilleur score du voyage du jour : ${s} !`); } }
  ecritMeta4(m); return apport;
}

// ----------------------------------------------------------------------------------------------- le pilote du simulateur (choix de route et d'événements)
function piloteRoute(X, R) {
  const o = X.carte[X.escale]; if (o.length === 1) return choisitEscale(X, 0);
  // un joueur raisonnable : port franc si blessé, sinon combat facile ou trésor, élite si l'équipage est costaud
  const force = surPlateau(X).reduce((s, u) => s + u.a + u.v + (u.star || 0) * 8, 0), note = e => e.type === 'port' ? (X.coeurs < X.coeursMax ? 9 : 2) : e.type === 'tresor' ? 6 : e.type === 'evenement' ? 4 : e.type === 'elite' ? (force > 70 + X.escale * 12 ? 7 : 1) : e.type === 'fantome' ? 3 : 5;
  const i = o.map((e, k) => [note(e) + R() * 2, k]).sort((a, b) => b[0] - a[0])[0][1]; return choisitEscale(X, i);
}
function simuleVoyage(heros, graine, opts) {
  const X = nouveauVoyage(heros, Object.assign({ graine, debloques:0 }, opts || {})); if (globalThis.DIFF_SIM) X.diff = globalThis.DIFF_SIM;
  const types = [];
  for (let pas = 0; pas < 14 && !X.fini; pas++) {
    if (doitChoisir(X)) piloteRoute(X, hasardX(X));
    const esc = X.route[X.escale]; types.push(esc.type);
    if (!ESCALE_COMBAT(esc.type)) { const s = escaleSansCombat(X); let i = s.choix.findIndex(c => c.possible); if (esc.type === 'tresor' && s.choix[1].possible) i = 1; resoutChoix(X, Math.max(0, i)); continue; }
    pilotePort(X); piloteOrdres(X, hasardX(X)); joueEscale(X, hasardX(X));
  }
  return { gagne:X.fini === 'gagne', coeurs:X.coeurs, escale:X.escale, victoires:X.victoires, boss:X.boss, regle:X.regle, types, score:scoreV4(X) };
}
