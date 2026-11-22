// =============================================================================================== LES POUVOIRS DU BUILD DANS LES COMBATS (22/11)
// Décidé avec l'utilisateur le 22/11 (Deck-plan.md) : les versions choisies dans la page des pouvoirs (pouvoirs-heros.js : Garde, Pouvoir,
// Passif, Ultime, versions A/B/C) agissent aussi dans les combats contre les monstres : Odyssée, Grande aventure, Tour des épreuves (préréglage
// « 🗡 Solo »), Invasion et ses grands boss (préréglage « 👥 Groupe »). Le Duel entre joueurs garde les versions A (même rang pour tous : plus tard).
// La version A = la fiche du héros dans donnees.js (rien ne change). Ici : les versions B et C, et les talents des héros d'aventure (Passif).
// Les RANGS (1-10) ne comptent pas encore dans ces combats (seulement dans les Chroniques).
// Le moteur (duel.html) appelle : appliqueBuild au début du combat, ficheBuild (via hDe), et les crochets pwDegats, pwSoinN, pwSoinApres,
// pwInvoque, pwDebut, pwAvantAction, pwApresAction, pwSerment. Le joueur garde seulement J.pwv (les lettres choisies) : la partie reste
// enregistrable telle quelle (guilde-combat).
'use strict';
const _un = vs => vs.length === 1;
const _bouclier = (J, b, nom) => { b = Math.max(0, b); J.gardeB += b; log(`${J.nom} : ${nom}, Bouclier ${b}.`); return b; };
// la créature adverse la plus forte (pour les effets qui en visent une sans choix)
const _plusForte = D => D.front.filter(u => !u.cachee).sort((a, b) => atk(D, b) - atk(D, a) || b.v - a.v)[0];
const _entrave = (D, u) => { if (u) { u.entrave = true; log(`🌿 ${u.n} est entravée : elle n’attaquera pas à son prochain tour.`); } };

const PW_DUEL = {
  pip:{
    garde:{
      B:{ n:'Mousse douce', txt:'1 dé', d:'Bouclier = la moitié de la valeur (arrondie au-dessus), et ton héros se soigne d’autant.', cond:_un, val:vs => Math.ceil(vs[0] / 2) * 2,
        f:(J, vs) => { const b = Math.ceil(vs[0] / 2); _bouclier(J, b, 'Mousse douce'); soin(J, b); } },
      C:{ n:'Ronce-garde', txt:'1 dé', d:'Un 1, 2 ou 3 : Bouclier = la valeur × 2. Un 4, 5 ou 6 : Bouclier = la valeur, et la créature adverse la plus forte est Entravée.', cond:_un, val:vs => vs[0] <= 3 ? vs[0] * 2 : vs[0] + 2,
        f:(J, vs) => { if (vs[0] <= 3) _bouclier(J, vs[0] * 2, 'Ronce-garde'); else { _bouclier(J, vs[0], 'Ronce-garde'); _entrave(adv(J), _plusForte(adv(J))); } } },
    },
    pouvoir:{
      B:{ n:'Cercle de vie', txt:'3 dés qui se suivent', d:'Ton héros se soigne de 6 et chacune de tes créatures de 3.', cond:vs => vs.length === 3 && suite(vs, 3),
        f:J => { soin(J, 6); J.front.forEach(u => soinCible({ J, u }, 3)); } },
      C:{ n:'Ronces vives', txt:'3 dés de 3 ou moins', d:'Les 2 créatures adverses les plus fortes sont Entravées ; ton héros gagne Épines 2 et 3 dégâts partent au héros adverse.', cond:vs => vs.length === 3 && vs.every(v => v <= 3),
        f:J => { const D = adv(J); D.front.filter(u => !u.cachee).sort((a, b) => atk(D, b) - atk(D, a)).slice(0, 2).forEach(u => _entrave(D, u)); J.gardeE += 2; degats({ J:D }, 3); } },
    },
    passif:{
      B:{ n:'Ronces vivantes', d:'Chaque 6 que tu lances pique le héros adverse : 2 dégâts. Ton héros a toujours Épines 2, et tes créatures Épines 1.' },
      C:{ n:'Sève partagée', d:'Chaque fois que ton héros se soigne, il gagne aussi un Bouclier de 3 ; au début de ton tour, il se soigne de 1.' },
    },
    ultime:{
      B:{ n:'La Grande Chasse', txt:'3 dés de 5 ou plus', d:'La Louve arrive tout de suite en Alpha (6 / 10) et attaque deux fois.', cond:vs => vs.length === 3 && vs.every(v => v >= 5),
        f:J => { let l = J.front.find(u => u.louve);
          if (!l) { if (J.front.length >= 5) { degats({ J:adv(J) }, 10); log('La ligne de front est pleine : la Louve mord le héros adverse en passant (10).'); return; }
            invoque(J, { n:'La Louve alpha', a:6, v:10, louve:true }); l = J.front.find(u => u.louve); log('🐺 La Louve alpha arrive !'); }
          else { l.a = Math.max(l.a, 6); l.v = Math.max(l.v, 10); l.vmax = Math.max(l.vmax, 10); }
          for (let i = 0; i < 2 && !S.fini; i++) { l.pret = true; attaqueLouve(J); } } },
    },
  },
  maelle:{
    garde:{
      B:{ n:'Fer rouge', txt:'1 dé', d:'Bouclier = la valeur −1, et ta prochaine attaque fait +2 dégâts.', cond:_un, val:vs => vs[0] + 1,
        f:(J, vs) => { _bouclier(J, vs[0] - 1, 'Fer rouge'); J.bonusAtk = (J.bonusAtk || 0) + 2; J.bonusSrc = 'Fer rouge'; log('🔥 Prochaine attaque : +2 dégâts.'); } },
      C:{ n:'Armure partagée', txt:'1 dé', d:'Bouclier = la valeur pour ton héros, et la même chose pour une de tes créatures (la plus abîmée).', cond:_un, val:vs => vs[0] + 1,
        f:(J, vs) => { _bouclier(J, vs[0], 'Armure partagée'); const u = [...J.front].sort((a, b) => a.v - b.v)[0]; if (u) { u.bouclier = (u.bouclier || 0) + vs[0]; log(`${u.n} gagne aussi Bouclier ${vs[0]}.`); } } },
    },
    pouvoir:{
      B:{ n:'Marteau-pilon', txt:'3 dés de 5 ou plus', d:'12 dégâts à une cible, qui passent à travers les boucliers.', cond:vs => vs.length === 3 && vs.every(v => v >= 5), cible:'ennemi',
        f:(J, vs, k) => degats(k, 12, true) },
      C:{ n:'Forge de campagne', txt:'3 dés qui se suivent', d:'Tes créatures gagnent +2 attaque pour toute la partie, et ton héros un Bouclier de 3.', cond:vs => vs.length === 3 && suite(vs, 3),
        f:J => { J.front.forEach(u => u.a += 2); J.bouclier += 3; log(`⚒ Forge de campagne : +2 attaque à ${J.front.length} créature(s), Bouclier 3.`); } },
    },
    passif:{
      B:{ n:'Rancune', d:'Chaque fois qu’on lui fait perdre des PV, sa prochaine attaque gagne +1 dégât (3 au plus).' },
      C:{ n:'Coup de forge', d:'Une Frappe, une Technique, un Pouvoir ou un Ultime qui utilise au moins un 6 fait +2 dégâts.' },
    },
    ultime:{
      B:{ n:'Rempart vivant', txt:'3 dés identiques', d:'Pendant 2 tours de l’adversaire, ton héros et tes créatures ne prennent que la moitié des dégâts.', cond:vs => vs.length === 3 && egaux(vs),
        f:J => { J.rempart = 2; log('🛡 Rempart vivant : moitié des dégâts pendant 2 tours.'); } },
    },
  },
  aldric:{
    garde:{
      B:{ n:'Contre-attaque', txt:'1 dé', d:'Bouclier = la valeur ; le prochain qui te frappe reçoit 2 dégâts en retour.', cond:_un, val:vs => vs[0] + 2,
        f:(J, vs) => { _bouclier(J, vs[0], 'Contre-attaque'); J.riposte = 2; } },
      C:{ n:'Bannière', txt:'1 dé', d:'Bouclier = la valeur −1 pour ton héros ET pour chacune de tes créatures.', cond:_un, val:vs => (vs[0] - 1) * (1 + S.J.front.length),
        f:(J, vs) => { const b = Math.max(0, vs[0] - 1); _bouclier(J, b, 'Bannière'); J.front.forEach(u => u.bouclier = (u.bouclier || 0) + b); if (J.front.length) log(`🚩 Chaque créature gagne Bouclier ${b}.`); } },
    },
    pouvoir:{
      B:{ n:'Rayon de l’aube', txt:'3 dés impairs', d:'6 dégâts à une cible, et Handicap au héros adverse (un dé de moins à son prochain tour).', cond:vs => vs.length === 3 && vs.every(v => !pair(v)), cible:'ennemi',
        f:(J, vs, k) => { degats(k, 6); altere(adv(J), 'handicap'); } },
      C:{ n:'En avant !', txt:'3 dés qui se suivent', d:'7 dégâts au héros adverse ; toutes tes créatures gagnent +1 attaque ce tour et peuvent attaquer tout de suite.', cond:vs => vs.length === 3 && suite(vs, 3),
        f:J => { degats({ J:adv(J) }, 7); J.front.forEach(u => { u.tmp = (u.tmp || 0) + 1; u.pret = true; u.entrave = false; }); log(`📯 En avant ! ${J.front.length} créature(s) prête(s) à attaquer.`); } },
    },
    passif:{
      B:{ n:'Lanterne vive', d:'Tes coups contre les créatures adverses font +2 dégâts, et ta Garde donne 1 de Bouclier de plus.' },
      C:{ n:'Serment', d:'Une fois par combat, ta première créature qui devrait tomber reste debout à 1 vie.' },
    },
    ultime:{
      B:{ n:'Bastion', txt:'3 dés de 4 ou plus', d:'Jusqu’à ton prochain tour, ni ton héros ni tes créatures ne perdent de vie.', cond:vs => vs.length === 3 && vs.every(v => v >= 4),
        f:J => { J.bastion = true; log('🏰 Bastion : personne ne perd de vie jusqu’au prochain tour.'); } },
    },
  },
  oria:{
    garde:{
      B:{ n:'Pas de côté', txt:'1 dé', d:'Bouclier = la valeur, et 1 dégât à la créature adverse la plus forte (ou au héros adverse s’il n’en a pas).', cond:_un, val:vs => vs[0] + 2,
        f:(J, vs) => { _bouclier(J, vs[0], 'Pas de côté'); const D = adv(J), u = _plusForte(D); degats(u ? { J:D, u } : { J:D }, 1); } },
      C:{ n:'Sac de voyage', txt:'1 dé', d:'Bouclier = la valeur ; sur un 5 ou un 6, pioche aussi une carte.', cond:_un, val:vs => vs[0] + (vs[0] >= 5 ? 3 : 0),
        f:(J, vs) => { _bouclier(J, vs[0], 'Sac de voyage'); if (vs[0] >= 5) { pioche(J, 1); log(`🎒 ${J.nom} pioche une carte.`); } } },
    },
    pouvoir:{
      B:{ n:'Flèche longue', txt:'2 dés de 5 ou plus', d:'7 dégâts à une cible.', cond:vs => vs.length === 2 && vs.every(v => v >= 5), cible:'ennemi',
        f:(J, vs, k) => degats(k, 7) },
      C:{ n:'Coup d’œil', txt:'3 dés pairs', d:'7 dégâts à une cible, pioche 2 cartes et gagne 1 PC.', cond:vs => vs.length === 3 && vs.every(pair), cible:'ennemi',
        f:(J, vs, k) => { degats(k, 7); pioche(J, 2); J.pc = Math.min(6, J.pc + 1); log(`👁 ${J.nom} pioche 2 cartes et gagne 1 PC.`); } },
    },
    passif:{
      B:{ n:'Archère', d:'Ta Frappe, ta Technique, ton Pouvoir et ton Ultime font +1 dégât.' },
      C:{ n:'Bonne pioche', d:'Tu commences chaque combat avec 1 PC de plus et une carte de plus.' },
    },
    ultime:{
      B:{ n:'Pluie de flèches', txt:'3 dés de 5 ou plus', d:'6 dégâts au héros adverse et à chacune de ses créatures.', cond:vs => vs.length === 3 && vs.every(v => v >= 5),
        f:J => { const D = adv(J); [...D.front].forEach(u => degats({ J:D, u }, 6)); degats({ J:D }, 6); } },
    },
  },
  gorm:{
    garde:{
      B:{ n:'Chant protecteur', txt:'1 dé', d:'Bouclier = la valeur −1 pour ton héros, et la valeur −2 pour chacune de tes créatures.', cond:_un, val:vs => vs[0] + Math.max(0, vs[0] - 2) * S.J.front.length,
        f:(J, vs) => { _bouclier(J, vs[0] - 1, 'Chant protecteur'); const b = Math.max(0, vs[0] - 2); if (b) J.front.forEach(u => u.bouclier = (u.bouclier || 0) + b); } },
      C:{ n:'Grondement', txt:'1 dé', d:'Bouclier = la valeur, et la créature adverse la plus forte perd 1 attaque pour toute la partie.', cond:_un, val:vs => vs[0] + 2,
        f:(J, vs) => { _bouclier(J, vs[0], 'Grondement'); const D = adv(J), u = _plusForte(D); if (u && u.a > 0) { u.a--; log(`📯 ${u.n} perd 1 attaque.`); } } },
    },
    pouvoir:{
      B:{ n:'Second souffle', txt:'2 dés identiques, une fois par tour', d:'6 dégâts au héros adverse, puis tous tes autres dés libres sont relancés.', cond:vs => vs.length === 2 && egaux(vs) && !(S && S.J && S.J.souffleTour === S.J.tours),
        f:J => { J.souffleTour = J.tours; degats({ J:adv(J) }, 6); const l = J.des.filter(d => !d.pose); l.forEach(d => lance(J, d)); log(`📯 Second souffle : ${l.length} dé(s) relancé(s).`); } },
      C:{ n:'Coup de tonnerre', txt:'3 dés qui se suivent', d:'4 dégâts au héros adverse et à chacune de ses créatures.', cond:vs => vs.length === 3 && suite(vs, 3),
        f:J => { const D = adv(J), z = pa(J) === 'C' ? 1 : 0; [...D.front].forEach(u => degats({ J:D, u }, 4 + z)); degats({ J:D }, 4 + z); } },
    },
    passif:{
      B:{ n:'Écho du cor', d:'Après ton Pouvoir, tes créatures gagnent +2 attaque pour ce tour.' },
      C:{ n:'Voix de la montagne', d:'Tes coups qui touchent tout le camp adverse (Grand Souffle, Coup de tonnerre) font +1 dégât à chaque cible.' },
    },
    ultime:{
      B:{ n:'Le grand cor', txt:'4 dés qui se suivent', d:'Tous tes dés reviennent et sont relancés, avec 2 relances : tu rejoues ton tour (Garde comprise).', cond:vs => vs.length === 4 && suite(vs, 4),
        f:J => { J.des.forEach(d => { d.pose = false; lance(J, d); }); J.relance = 2; J.gardeFaite = false; log('📯 Le grand cor : Gorm rejoue tout son tour !'); } },
    },
  },
  zephine:{
    garde:{
      B:{ n:'Éclair-réflexe', txt:'1 dé', d:'Bouclier = la valeur −1 ; le prochain qui te frappe reçoit 2 dégâts.', cond:_un, val:vs => vs[0] + 1,
        f:(J, vs) => { _bouclier(J, vs[0] - 1, 'Éclair-réflexe'); J.riposte = 2; } },
      C:{ n:'Bourrasque', txt:'1 dé', d:'Bouclier = la valeur ; sur un 6, la créature adverse la plus forte est renvoyée (dans la main de son joueur).', cond:_un, val:vs => vs[0] + (vs[0] === 6 ? 5 : 0),
        f:(J, vs) => { _bouclier(J, vs[0], 'Bourrasque'); if (vs[0] === 6) { const D = adv(J), u = _plusForte(D); if (u) { log('🌪 Bourrasque !'); renvoie({ J:D, u }); } } } },
    },
    pouvoir:{
      B:{ n:'Chaîne d’éclairs', txt:'3 dés qui se suivent', d:'5 dégâts au héros adverse et à 2 de ses créatures (les plus fortes).', cond:vs => vs.length === 3 && suite(vs, 3),
        f:J => { const D = adv(J); D.front.filter(u => !u.cachee).sort((a, b) => atk(D, b) - atk(D, a)).slice(0, 2).forEach(u => degats({ J:D, u }, 5)); degats({ J:D }, 5); } },
      C:{ n:'Tornade', txt:'3 dés impairs', d:'Toutes les créatures adverses sont Entravées et le héros adverse perd 4 PV.', cond:vs => vs.length === 3 && vs.every(v => !pair(v)),
        f:J => { const D = adv(J); D.front.forEach(u => { u.entrave = true; }); if (D.front.length) log('🌪 Tornade : toutes les créatures adverses sont entravées.'); degats({ J:D }, 4); } },
    },
    passif:{
      B:{ n:'Vent', d:'Ta deuxième attaque du tour (Frappe, Technique, Pouvoir ou Ultime) fait +1 dégât.' },
      C:{ n:'Œil du cyclone', d:'À chaque tour de l’adversaire, chaque coup reçu après le premier fait 1 dégât de moins.' },
    },
    ultime:{
      B:{ n:'Le grand orage', txt:'3 dés de 5 ou plus', d:'Pendant 2 tours : l’adversaire lance un dé de moins, et tous tes coups font +1 dégât.', cond:vs => vs.length === 3 && vs.every(v => v >= 5),
        f:J => { J.orage = 2; altere(adv(J), 'handicap'); log('🌩 Le grand orage gronde : 2 tours.'); } },
    },
  },
};
// les talents des héros d'aventure (ils remplacent le Passif) : leur effet dans ces combats
const PW_TALENTS_DUEL = {
  robuste:{ n:'Robuste', d:'Commence chaque combat avec un Bouclier de 4.' },
  eclaireur:{ n:'Pied léger', d:'Une relance de plus à chaque tour.' },
  protecteur:{ n:'Protecteur', d:'Ta Garde donne 2 de Bouclier de plus.' },
  chanceux:{ n:'Chanceux', d:'La première altération du combat (Poison, Saignement, Handicap) est annulée.' },
  brute:{ n:'Coup puissant', d:'Une Frappe avec un 5 ou un 6 fait +2 dégâts.' },
  guerisseur:{ n:'Herboriste', d:'Tes soins rendent 2 PV de plus.' },
};

// ---------------------------------------------------------------- la fiche du héros propre à un joueur (mise en cache)
const _FICHES = {};
function ficheBuild(J) {
  const v = J.pwv; if (!v) return null; const cle = J.id + JSON.stringify(v); if (_FICHES[cle]) return _FICHES[cle];
  const base = HEROS[J.id], D = PW_DUEL[J.id]; if (!base || !D) return null;
  const o = { ...base };
  ['garde', 'pouvoir', 'ultime'].forEach(e => { if (v[e] && v[e] !== 'A' && D[e] && D[e][v[e]]) o[e] = D[e][v[e]]; });
  if (v.passif && v.passif !== 'A') { const p = (D.passif && D.passif[v.passif]) || PW_TALENTS_DUEL[v.passif]; if (p) o.passif = `${p.n} : ${p.d}`; if (J.id === 'zephine') o.action = null; }
  return (_FICHES[cle] = o);
}
// au début d'un combat : lire le build (préréglage « solo » ou « groupe ») et poser les effets de départ
function appliqueBuild(J, pre) {
  if (!J || typeof pouvoirsDe !== 'function' || !PW_DUEL[J.id]) return;
  let o = null; try { o = pouvoirsDe(J.av || J.id, pre || 'solo'); } catch (e) { return; } if (!o) return;
  const v = { garde:o.garde.v, pouvoir:o.pouvoir.v, passif:o.passif.v, ultime:o.ultime.v };
  if (Object.values(v).every(x => x === 'A')) return; // rien de changé : la fiche commune
  J.pwv = v;
  const p = v.passif;
  if (p === 'C' && J.id === 'oria') { J.pc = Math.min(6, J.pc + 1); pioche(J, 1); }
  if (p === 'robuste') J.bouclier = (J.bouclier || 0) + 4;
  if (p === 'chanceux') J.purete = (J.purete || 0) + 1;
  const n = [v.garde, v.pouvoir, v.passif, v.ultime].filter(x => x !== 'A').length;
  log(`✨ Le build de ${J.nom} est en jeu (${n} pouvoir${n > 1 ? 's' : ''} choisi${n > 1 ? 's' : ''} dans la page des pouvoirs).`);
}

// ---------------------------------------------------------------- les crochets appelés par le moteur
// avant les dégâts : bonus de celui qui frappe, protections de celui qui est touché ; renvoie les dégâts à infliger
function pwDegats(k, n) {
  const A = S.acteur, T = k.J;
  if (A && A !== T && A.pwv) {
    if (A.bonusAction) n += A.bonusAction;
    if (A.bonusAtk) { n += A.bonusAtk; log(`🔥 +${A.bonusAtk} dégâts (${A.bonusSrc || 'bonus'}).`); A.bonusSrc = ''; A.bonusAtk = 0; }
    if (A.orage > 0) n += 1;
    if (k.u && pa(A) === 'B' && A.id === 'aldric') n += 2;
  }
  if (T.pwv) {
    if (T.bastion) { log(`🏰 Bastion : ${k.u ? k.u.n : T.nom} ne perd rien.`); return 0; }
    if (T.rempart > 0) n = Math.ceil(n / 2);
    if (!k.u && pa(T) === 'C' && T.id === 'zephine' && A && A !== T) { T.coupsRecus = (T.coupsRecus || 0) + 1; if (T.coupsRecus > 1 && n > 0) { n--; log('🌀 Œil du cyclone : 1 dégât de moins.'); } }
    if (!k.u && n > 0 && pa(T) === 'B' && T.id === 'maelle' && (T.bonusAtk || 0) < 3) { T.bonusAtk = (T.bonusAtk || 0) + 1; T.bonusSrc = T.bonusSrc && T.bonusSrc !== 'Rancune' ? T.bonusSrc + ' et Rancune' : 'Rancune'; }
    if (!k.u && T.riposte && A && A !== T) { const r = T.riposte; T.riposte = 0; const u = S.uAtt && A.front.includes(S.uAtt) ? S.uAtt : null;
      log(`⚡ ${T.nom} riposte : ${r} dégâts à ${u ? u.n : A.nom}.`); const a0 = S.acteur; S.acteur = T; degats(u ? { J:A, u } : { J:A }, r, true); S.acteur = a0; }
  }
  return n;
}
const pwSoinN = (J, n) => n + (pa(J) === 'guerisseur' ? 2 : 0);
function pwSoinApres(J, gagne) { if (gagne > 0 && J.pwv && pa(J) === 'C' && J.id === 'pip') { J.bouclier = (J.bouclier || 0) + 3; log('💧 Sève partagée : Bouclier +3.'); } }
function pwInvoque(J, u) { if (J.pwv && pa(J) === 'B' && J.id === 'pip') u.epines = (u.epines || 0) + 1; }
// au début du tour d'un joueur : ses effets qui s'usent ; et ceux de son adversaire qui duraient « jusqu'à mon prochain tour »
function pwDebut(J) {
  if (J.pwv) {
    J.bastion = false;
    if (J.orage > 0) { J.orage--; if (J.orage > 0) altere(adv(J), 'handicap'); }
    if (pa(J) === 'eclaireur') J.relance++;
    if (pa(J) === 'B' && J.id === 'pip') J.gardeE += 2;
    if (pa(J) === 'C' && J.id === 'pip' && J.pv > 0 && J.pv < J.pvMax) soin(J, 1);
  }
  const D = adv(J); if (D && D.pwv) { if (D.rempart > 0) D.rempart--; D.coupsRecus = 0; }
  J.attaquesTour = 0;
}
const ATTAQUES = ['frappe', 'technique', 'pouvoir', 'ultime'];
function pwAvantAction(J, quoi, vs) {
  if (!J.pwv || !vs) return; J.bonusAction = 0;
  if (quoi === 'garde' && (pa(J) === 'protecteur' || (pa(J) === 'B' && J.id === 'aldric'))) J.gardeProt = pa(J) === 'protecteur' ? 2 : 1;
  if (!ATTAQUES.includes(quoi)) return;
  J.attaquesTour = (J.attaquesTour || 0) + 1; const p = pa(J);
  if (p === 'B' && J.id === 'oria') J.bonusAction += 1;
  if (p === 'C' && J.id === 'maelle' && vs.includes(6)) J.bonusAction += 2;
  if (p === 'B' && J.id === 'zephine' && J.attaquesTour === 2) J.bonusAction += 1;
  if (p === 'brute' && quoi === 'frappe' && vs.some(v => v >= 5)) J.bonusAction += 2;
  if (p === 'C' && J.id === 'gorm' && quoi === 'ultime' && (!J.pwv.ultime || J.pwv.ultime === 'A')) J.bonusAction += 1; // le Grand Souffle touche tout le camp
}
function pwApresAction(J, quoi) {
  if (!J.pwv) return; J.bonusAction = 0;
  if (J.gardeProt) { const g = J.gardeProt; J.gardeProt = 0; if (quoi === 'garde') { J.gardeB += g; log(`🛡 ${pa(J) === 'protecteur' ? 'Protecteur' : 'Lanterne vive'} : +${g} de Bouclier.`); } }
  if (quoi === 'pouvoir' && pa(J) === 'B' && J.id === 'gorm' && J.front.length) { J.front.forEach(u => u.tmp = (u.tmp || 0) + 2); log('📯 Écho du cor : +2 attaque à tes créatures ce tour.'); }
}
// une créature qui devrait tomber : le Serment d'Aldric la garde debout une fois par combat
function pwSerment(k) { const J = k.J; if (!J.pwv || pa(J) !== 'C' || J.id !== 'aldric' || J.sermentFait) return false; J.sermentFait = true; k.u.v = 1; log(`⚜ Serment : ${k.u.n} reste debout à 1 vie.`); return true; }
