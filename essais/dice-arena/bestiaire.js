// =============================================================================================== LE BESTIAIRE ÉTENDU (14/11 nuit, carte blanche)
// Demande de l'utilisateur : « comme Dice Throne Adventures » : par île, une dizaine de monstres de niveau I, II, III, chacun avec SA particularité,
// et des boss qui surprennent. Chaque monstre neuf a une PARTICULARITÉ (part) jouée par le moteur du Duel :
//   part.debut(J)      au début de chacun de ses tours
//   part.recoit(J, r)  quand il va perdre r PV (après Esquive et boucliers) : renvoie les PV vraiment perdus
//   part.apres(J, r)   après avoir perdu r PV (peut le relever, invoquer, se venger…)
// Les nouveaux boss (un second par île) sortent au hasard dans l'Odyssée sans fin et dans la Tour des épreuves ; l'histoire garde les siens.
// Chargé après odyssee.js (qui a MONSTRES, BOSS, ILES, installeMonstres).
const P_ = (J, t) => { if (typeof log === 'function') log(t); if (typeof fx === 'function') fx({ t:'annonce', txt:t }); };
const G1 = (n, d, bouclier) => ({ n, txt:'1 dé', d, cond:vs => vs.length === 1, val:vs => bouclier(vs), f:(J, vs) => { J.gardeB += bouclier(vs); log(`${J.nom} : ${n}, Bouclier ${bouclier(vs)}.`); } });

Object.assign(MONSTRES, {
  // ---------------------------------------------------------------- les Terres brûlées
  scarabee: { nom:'Scarabée de braise', titre:'la carapace', emoji:'🪲', c:'#b8501a', pv:11, part:{ n:'Carapace', d:'Un coup de 3 dégâts ou moins ne lui en fait qu’un seul.', recoit:(J, r) => r > 0 && r <= 3 ? 1 : r },
    role:'Particularité · Carapace : les petits coups (3 ou moins) ne lui font qu’1 dégât. Frappe fort, ou en une seule fois.', cit:'« Clic. Clic. Clic. »',
    garde:G1('Rouler en boule', 'Bouclier 2.', () => 2),
    pouvoir:{ n:'Mandibules', txt:'2 dés pairs', d:'4 dégâts à une cible.', cond:vs => vs.length === 2 && vs.every(v => v % 2 === 0), cible:'ennemi', f:(J, vs, k) => degats(k, 4) }, renforts:[] },
  brasero: { nom:'Brasero vivant', titre:'la chaleur', emoji:'🔥', c:'#e8661a', pv:14, part:{ n:'Chaleur', d:'Au début de chacun de ses tours, 1 dégât à ton héros (rien ne l’arrête).', debut:J => { log(`🔥 Chaleur du ${J.nom} : 1 dégât.`); degats({ J:adv(J) }, 1, true); } },
    role:'Particularité · Chaleur : chaque tour où il est en vie te coûte 1 PV. Ne traîne pas.', cit:'« Approche… réchauffe-toi… »',
    garde:G1('Flamme haute', 'Bouclier = la moitié du dé.', vs => Math.ceil(vs[0] / 2)),
    pouvoir:{ n:'Jet de braises', txt:'2 dés identiques', d:'5 dégâts à une cible.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => degats(k, 5) }, renforts:[] },
  bombelave: { nom:'Bombe de lave', titre:'le compte à rebours', emoji:'💣', c:'#ff3a1a', pv:15, part:{ n:'Compte à rebours', d:'Au début de son 4e tour, elle EXPLOSE : 12 dégâts à ton héros (et elle disparaît). Abats-la avant !',
      debut:J => { const t = J.tours; if (t < 4) { P_(J, `💣 Compte à rebours : ${4 - t}…`); return; } P_(J, '💥 La Bombe de lave explose !'); degats({ J:adv(J) }, 12, true); J.pv = 0; if (typeof fin === 'function') fin(); } },
    role:'Particularité · Compte à rebours : elle explose à son 4e tour (12 dégâts). La course contre la montre.', cit:'« Tic… tac… »',
    garde:G1('Croûte', 'Bouclier 3.', () => 3),
    pouvoir:{ n:'Éclaboussure', txt:'3 dés', d:'4 dégâts à une cible.', cond:vs => vs.length === 3, cible:'ennemi', f:(J, vs, k) => degats(k, 4) }, renforts:[] },
  phenix: { nom:'Phénix de cendre', titre:'l’immortel', emoji:'🐦‍🔥', c:'#ff8a1a', pv:16, part:{ n:'Renaissance', d:'La première fois qu’il tombe, il renaît de ses cendres avec 8 PV.',
      apres:J => { if (J.pv <= 0 && !J.renait) { J.renait = true; J.pv = 8; P_(J, '🐦‍🔥 Le Phénix renaît de ses cendres (8 PV) !'); } } },
    role:'Particularité · Renaissance : il faut le battre DEUX fois (il revient avec 8 PV).', cit:'« Encore. Et encore. »',
    garde:{ n:'Ailes de feu', txt:'1 dé pair', d:'Esquive.', cond:vs => vs.length === 1 && vs[0] % 2 === 0, val:() => 4, f:J => { J.esquive = true; log(`${J.nom} : Esquive.`); } },
    pouvoir:{ n:'Piqué enflammé', txt:'3 dés de 3 ou plus', d:'7 dégâts et Saignement.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 7); altere(adv(J), 'saigne'); } }, renforts:[] },
  seigneurbraise: { nom:'Seigneur des braises', titre:'la forge vivante', emoji:'👹', c:'#a8200a', pv:26, majeur:true, part:{ n:'Forge vivante', d:'Chaque fois qu’il est blessé, il gagne 1 Bouclier qui reste (jusqu’à 6).',
      apres:(J, r) => { if (r > 0 && J.pv > 0 && (J.bouclier || 0) < 6) { J.bouclier = (J.bouclier || 0) + 1; log(`👹 Forge vivante : Bouclier ${J.bouclier}.`); } } },
    role:'Particularité · Forge vivante : chaque blessure le durcit (Bouclier permanent). Les gros coups valent mieux que beaucoup de petits.', cit:'« Frappe. Je deviens plus dur. »',
    garde:G1('Enclume', 'Bouclier = la valeur du dé.', vs => vs[0]),
    pouvoir:{ n:'Marteau rougi', txt:'2 dés identiques de 4 ou plus', d:'9 dégâts et 1 Brûlure.', cond:vs => vs.length === 2 && vs[0] === vs[1] && vs[0] >= 4, cible:'ennemi', f:(J, vs, k) => { degats(k, 9); if (typeof braiseTitan === 'function') braiseTitan(adv(J)); } },
    renforts:[{ n:'Apprenti forgeron', a:2, v:4 }] },
  // ---------------------------------------------------------------- l'île du Givre
  renardneige: { nom:'Renard des neiges', titre:'l’insaisissable', emoji:'🦊', c:'#dfe8f5', pv:12, ile:'givre', part:{ n:'Insaisissable', d:'Un coup sur deux qu’il reçoit est divisé par deux.',
      recoit:(J, r) => { J.insais = !J.insais; if (J.insais && r > 1) { log('🦊 Insaisissable : il esquive à moitié.'); return Math.ceil(r / 2); } return r; } },
    role:'Particularité · Insaisissable : un coup sur deux ne lui fait que la moitié.', cit:'« Attrape-moi ! »',
    garde:G1('Fourrure', 'Bouclier 2.', () => 2),
    pouvoir:{ n:'Coup de dents', txt:'2 dés impairs', d:'4 dégâts à une cible.', cond:vs => vs.length === 2 && vs.every(v => v % 2 === 1), cible:'ennemi', f:(J, vs, k) => degats(k, 4) }, renforts:[] },
  givrelin: { nom:'Givrelin', titre:'le glaçon', emoji:'🧊', c:'#9fd8ff', pv:11, ile:'givre', part:{ n:'Givre qui monte', d:'Au début de chacun de ses tours, +2 Bouclier qui reste.',
      debut:J => { J.bouclier = (J.bouclier || 0) + 2; log(`🧊 Givre qui monte : Bouclier ${J.bouclier}.`); } },
    role:'Particularité · Givre qui monte : son Bouclier grandit à chaque tour. Plus tu attends, plus il est dur.', cit:'« Brr… brr… »',
    garde:G1('Glaçon', 'Bouclier 1.', () => 1),
    pouvoir:{ n:'Éclat gelé', txt:'2 dés identiques', d:'3 dégâts et Handicap.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 3); altere(adv(J), 'handicap'); } }, renforts:[] },
  morse: { nom:'Morse des glaces', titre:'le colosse placide', emoji:'🦭', c:'#7a8aa0', pv:22, ile:'givre', part:{ n:'Peau épaisse', d:'Ne perd jamais plus de 7 PV d’un seul coup.',
      recoit:(J, r) => { if (r > 7) { log(`🦭 Peau épaisse : ${r} dégâts réduits à 7.`); return 7; } return r; } },
    role:'Particularité · Peau épaisse : jamais plus de 7 PV perdus d’un coup. Multiplie les attaques.', cit:'« Hrrmmmf. »',
    garde:G1('Graisse', 'Bouclier = la valeur du dé.', vs => vs[0]),
    pouvoir:{ n:'Coup de défense', txt:'2 dés de 4 ou plus', d:'7 dégâts à une cible.', cond:vs => vs.length === 2 && vs.every(v => v >= 4), cible:'ennemi', f:(J, vs, k) => degats(k, 7) }, renforts:[] },
  dameblanche: { nom:'Dame blanche', titre:'la lamentation', emoji:'👻', c:'#e8f0ff', pv:15, ile:'givre', part:{ n:'Lamentation', d:'Au début de chacun de ses tours, ton héros perd 1 PC.',
      debut:J => { const D = adv(J); if (D.pc > 0) { D.pc--; log(`👻 Lamentation : ${D.nom} perd 1 PC.`); } } },
    role:'Particularité · Lamentation : elle te vole 1 PC à chaque tour. Joue tes cartes vite.', cit:'« Pourquoi… pourquoi… »',
    garde:{ n:'Brume', txt:'1 dé impair', d:'Esquive.', cond:vs => vs.length === 1 && vs[0] % 2 === 1, val:() => 4, f:J => { J.esquive = true; log(`${J.nom} : Esquive.`); } },
    pouvoir:{ n:'Cri glacé', txt:'3 dés différents', d:'5 dégâts au héros.', cond:vs => vs.length === 3 && new Set(vs).size === 3, cible:'ennemi', f:J => degats({ J:adv(J) }, 5) }, renforts:[] },
  mammouth: { nom:'Mammouth laineux', titre:'la colère', emoji:'🦣', c:'#8a5a3a', pv:24, ile:'givre', part:{ n:'Colère', d:'Sous la moitié de ses PV, il entre en colère : un dé de plus à chaque tour.',
      apres:J => { if (!J.colere && J.pv > 0 && J.pv <= J.pvMax / 2) { J.colere = true; J.desMax = Math.min(6, (J.desMax || 5) + 1); P_(J, '🦣 Le Mammouth entre en COLÈRE : un dé de plus !'); } } },
    role:'Particularité · Colère : blessé à moitié, il lance un dé de plus. Achève-le d’un coup si tu peux.', cit:'« BRAAAÂÂH ! »',
    garde:G1('Laine épaisse', 'Bouclier = la valeur du dé + 1.', vs => vs[0] + 1),
    pouvoir:{ n:'Charge', txt:'3 dés de 3 ou plus', d:'9 dégâts à une cible.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => degats(k, 9) }, renforts:[] },
  reinefrimas: { nom:'Reine du Frimas', titre:'le miroir de glace', emoji:'👸', c:'#bfe6ff', pv:26, majeur:true, ile:'givre', part:{ n:'Miroir de glace', d:'Elle renvoie à ton héros le tiers des dégâts qu’elle subit.',
      apres:(J, r) => { const m = Math.floor(r / 3); if (m > 0 && J.pv > 0) { log(`👸 Miroir de glace : ${m} dégâts renvoyés.`); degats({ J:adv(J) }, m, true); } } },
    role:'Particularité · Miroir de glace : un tiers de tes dégâts te reviennent. Garde de la vie.', cit:'« Tu te frappes toi-même. »',
    garde:G1('Mur de glace', 'Bouclier = la valeur du dé + 1.', vs => vs[0] + 1),
    pouvoir:{ n:'Tempête de neige', txt:'2 dés identiques', d:'6 dégâts et Handicap.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 6); altere(adv(J), 'handicap'); } },
    renforts:[{ n:'Garde de glace', a:2, v:5, barriere:true }] },
  // ---------------------------------------------------------------- l'Abîme du Vide
  larve: { nom:'Larve du Vide', titre:'la division', emoji:'🐛', c:'#7a4aa8', pv:14, ile:'abime', part:{ n:'Division', d:'La première fois qu’elle passe sous la moitié de ses PV, elle se divise : une Larvette 2 / 3 apparaît.',
      apres:J => { if (!J.divise && J.pv > 0 && J.pv <= J.pvMax / 2) { J.divise = true; invoque(J, { n:'Larvette', a:2, v:3 }); P_(J, '🐛 La Larve se divise !'); } } },
    role:'Particularité · Division : blessée à moitié, elle se dédouble.', cit:'« Grrsss… »',
    garde:G1('Mue', 'Bouclier 3.', () => 3),
    pouvoir:{ n:'Morsure du Vide', txt:'2 dés identiques', d:'3 dégâts et 1 Corruption.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 3); if (typeof corrompt === 'function') corrompt(adv(J)); } }, renforts:[] },
  sangsue: { nom:'Sangsue du Vide', titre:'la goulue', emoji:'🪱', c:'#5a2a6a', pv:15, ile:'abime', part:{ n:'Festin', d:'Au début de chacun de ses tours, elle regagne 2 PV, plus 2 par Corruption de ton héros.',
      debut:J => { const g = 2 + 2 * (adv(J).corruption || 0), a = J.pv; J.pv = Math.min(J.pvMax, J.pv + g); if (J.pv > a) log(`🪱 Festin : ${J.nom} regagne ${J.pv - a} PV.`); } },
    role:'Particularité · Festin : elle se soigne à chaque tour (encore plus si tu es corrompu).', cit:'« Slurp. »',
    garde:G1('Viscosité', 'Bouclier 2.', () => 2),
    pouvoir:{ n:'Succion', txt:'3 dés', d:'4 dégâts au héros et 1 Corruption.', cond:vs => vs.length === 3, cible:'ennemi', f:J => { degats({ J:adv(J) }, 4); if (typeof corrompt === 'function') corrompt(adv(J)); } }, renforts:[] },
  horloger: { nom:'Horloger fou', titre:'minuit', emoji:'🕰️', c:'#8a6a3a', pv:18, ile:'abime', part:{ n:'Minuit', d:'Au début de son 5e tour, les douze coups sonnent : 15 dégâts à ton héros (une seule fois).',
      debut:J => { if (J.tours < 5) { P_(J, `🕰️ ${['Il est onze heures…', 'Onze heures et quart…', 'Onze heures et demie…', 'Minuit moins le quart…'][J.tours - 1] || ''}`); return; } if (!J.minuit) { J.minuit = true; P_(J, '🕰️ MINUIT ! Les douze coups sonnent.'); degats({ J:adv(J) }, 15, true); } } },
    role:'Particularité · Minuit : à son 5e tour, 15 dégâts d’un coup. Bats-le avant, ou garde de la vie.', cit:'« Tic, tac, tic, tac… »',
    garde:G1('Rouages', 'Bouclier = la valeur du dé.', vs => vs[0]),
    pouvoir:{ n:'Aiguille', txt:'2 dés qui se suivent', d:'5 dégâts à une cible.', cond:vs => vs.length === 2 && Math.abs(vs[0] - vs[1]) === 1, cible:'ennemi', f:(J, vs, k) => degats(k, 5) }, renforts:[] },
  liche: { nom:'Liche', titre:'le phylactère', emoji:'💀', c:'#4a2a7a', pv:20, ile:'abime', part:{ n:'Phylactère', d:'Tant que son Phylactère (0 / 8, Barrière) est debout, la Liche ne peut pas tomber : elle reste à 1 PV. Brise-le d’abord !',
      apres:J => { if (J.pv <= 0 && J.front.some(u => u.n === 'Phylactère')) { J.pv = 1; P_(J, '💀 Le Phylactère protège la Liche : elle reste à 1 PV !'); } } },
    role:'Particularité · Phylactère : impossible à tuer tant que son Phylactère tient. Vise-le.', cit:'« La mort ? Je l’ai rangée dans une boîte. »',
    garde:G1('Os', 'Bouclier = la valeur du dé.', vs => vs[0]),
    pouvoir:{ n:'Rayon de mort', txt:'3 dés de 3 ou plus', d:'8 dégâts et 1 Corruption.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 8); if (typeof corrompt === 'function') corrompt(adv(J)); } },
    renforts:[{ n:'Phylactère', a:0, v:8, barriere:true }] },
  archonte: { nom:'Archonte brisé', titre:'le premier coup', emoji:'🗿', c:'#6a3ab8', pv:28, majeur:true, ile:'abime', part:{ n:'Bouclier du Vide', d:'Le premier coup qu’il reçoit à chacun de tes tours ne lui fait rien.',
      debut:J => { J.immu = true; }, recoit:(J, r) => { if (J.immu && r > 0) { J.immu = false; log('🗿 Bouclier du Vide : le premier coup ne lui fait rien.'); return 0; } return r; } },
    role:'Particularité · Bouclier du Vide : ton premier coup de chaque tour est perdu. Ouvre avec un petit coup.', cit:'« Le premier coup ne compte jamais. »',
    garde:G1('Fragment', 'Bouclier = la valeur du dé.', vs => vs[0]),
    pouvoir:{ n:'Jugement', txt:'2 dés identiques de 4 ou plus', d:'10 dégâts et 1 Corruption.', cond:vs => vs.length === 2 && vs[0] === vs[1] && vs[0] >= 4, cible:'ennemi', f:(J, vs, k) => { degats(k, 10); if (typeof corrompt === 'function') corrompt(adv(J)); } },
    renforts:[] },
});

// ---------------------------------------------------------------- les seconds boss (sans fin, Tour des épreuves)
Object.assign(BOSS, {
  hydre: { nom:'L’Hydre de magma', titre:'les trois têtes', emoji:'🐍', c:'#e8401a', pv:36, boss:true, part:{ n:'Têtes qui repoussent', d:'Trois Têtes la protègent. Tant qu’elle a ses 3 Têtes, elle ne prend que la moitié des dégâts. Au début de son tour, une Tête tombée repousse (une fois sur deux).',
      recoit:(J, r) => J.front.filter(u => u.n === 'Tête').length >= 3 ? Math.ceil(r / 2) : r,
      debut:J => { const n = J.front.filter(u => u.n === 'Tête').length; J.repousse = !J.repousse; if (n < 3 && J.repousse) { invoque(J, { n:'Tête', a:2, v:5 }); P_(J, '🐍 Une Tête de l’Hydre repousse !'); } } },
    role:'Particularité · Trois têtes : coupe une Tête pour l’atteindre vraiment (moitié des dégâts tant qu’elle a ses 3 Têtes).', cit:'« Coupe-m’en une… »',
    garde:G1('Écailles', 'Bouclier = la valeur du dé.', vs => vs[0]),
    pouvoir:{ n:'Triple morsure', txt:'3 dés de 3 ou plus', d:'9 dégâts et 1 Brûlure.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 9); if (typeof braiseTitan === 'function') braiseTitan(adv(J)); } },
    ultime:{ n:'Geyser de magma', txt:'3 dés', d:'14 dégâts au héros.', cond:vs => vs.length === 3, cible:'ennemi', f:J => degats({ J:adv(J) }, 14) },
    renforts:[{ n:'Tête', a:2, v:5 }, { n:'Tête', a:2, v:5 }, { n:'Tête', a:2, v:5 }] },
  hiver: { nom:'Le Cœur de l’Hiver', titre:'le blizzard', emoji:'❄️', c:'#8fd0ff', pv:44, boss:true, ile:'givre', part:{ n:'Blizzard', d:'Tous les 3 tours, le blizzard souffle : ton héros perd un dé au prochain tour et toutes tes créatures perdent 2 vie. Il regagne 2 PV à chacun de ses tours.',
      debut:J => { const a = J.pv; J.pv = Math.min(J.pvMax, J.pv + 2); if (J.pv > a) log(`❄️ ${J.nom} regagne ${J.pv - a} PV.`);
        if (J.tours % 3 === 0) { const D = adv(J); P_(J, '❄️ BLIZZARD !'); altere(D, 'handicap'); [...D.front].forEach(u => degats({ J:D, u }, 2)); } } },
    role:'Particularité · Blizzard : tous les 3 tours, un dé de moins et 2 dégâts à tes créatures ; il se soigne de 2 à chaque tour.', cit:'« Le printemps ne viendra pas. »',
    garde:G1('Glace éternelle', 'Bouclier = la valeur du dé + 2.', vs => vs[0] + 2),
    pouvoir:{ n:'Lance de glace', txt:'2 dés identiques', d:'8 dégâts à une cible.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => degats(k, 8) },
    ultime:{ n:'Hiver sans fin', txt:'3 dés', d:'13 dégâts au héros et Handicap.', cond:vs => vs.length === 3, cible:'ennemi', f:J => { degats({ J:adv(J) }, 13); altere(adv(J), 'handicap'); } },
    renforts:[{ n:'Stalagmite', a:1, v:7, barriere:true }] },
  devoreur: { nom:'Le Dévoreur d’étoiles', titre:'la faim sans fin', emoji:'🌌', c:'#5a2aa8', pv:50, boss:true, ile:'abime', part:{ n:'Faim sans fin', d:'Chaque fois qu’il perd 8 PV ou plus d’un coup, il dévore une carte de ta main. Au début de son tour, ta créature la plus forte perd 3 vie.',
      apres:(J, r) => { const D = adv(J); if (r >= 8 && D.main && D.main.length && J.pv > 0) { const k = D.main.splice(Math.floor(Math.random() * D.main.length), 1)[0]; P_(J, `🌌 Le Dévoreur avale ${CARTES[k] ? CARTES[k].n : 'une carte'} !`); } },
      debut:J => { const D = adv(J), u = [...D.front].sort((a, b) => b.a - a.a)[0]; if (u) { log(`🌌 Trou noir : ${u.n} perd 3 vie.`); degats({ J:D, u }, 3); } } },
    role:'Particularité · Faim sans fin : tes gros coups lui font perdre des PV… et toi des cartes. Il aspire tes créatures.', cit:'« J’ai mangé des soleils. »',
    garde:G1('Horizon', 'Bouclier = la valeur du dé + 1.', vs => vs[0] + 1),
    pouvoir:{ n:'Gravité', txt:'2 dés identiques', d:'8 dégâts et 1 Corruption.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 8); if (typeof corrompt === 'function') corrompt(adv(J)); } },
    ultime:{ n:'Singularité', txt:'3 dés', d:'15 dégâts au héros.', cond:vs => vs.length === 3, cible:'ennemi', f:J => degats({ J:adv(J) }, 15) },
    renforts:[] },
});

// les îles reçoivent leurs nouveaux habitants (niveaux I, II, III), une élite de plus et un second boss
ILES.brulees.pools[0].push('scarabee'); ILES.brulees.pools[1].push('brasero', 'bombelave'); ILES.brulees.pools[2].push('phenix', 'bombelave'); ILES.brulees.elites.push('seigneurbraise'); ILES.brulees.boss2 = 'hydre';
ILES.givre.pools[0].push('renardneige', 'givrelin'); ILES.givre.pools[1].push('dameblanche', 'morse'); ILES.givre.pools[2].push('mammouth', 'morse'); ILES.givre.elites.push('reinefrimas'); ILES.givre.boss2 = 'hiver';
if (ILES.abime) { ILES.abime.pools[0].push('larve'); ILES.abime.pools[1].push('sangsue', 'horloger'); ILES.abime.pools[2].push('liche', 'horloger'); ILES.abime.elites.push('archonte'); ILES.abime.boss2 = 'devoreur'; }
installeMonstres();
// la particularité d'un monstre (lue par le moteur du Duel)
const particularite = J => J && HEROS[J.id] && HEROS[J.id].part;
