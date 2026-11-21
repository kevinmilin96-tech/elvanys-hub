// =============================================================================================== LE DUEL D'ÉQUIPAGES (18/11, choix de l'utilisateur)
// Un mode du portail des Expéditions : toi contre l'ordinateur, manche après manche. Les deux recrutent au port (mêmes recrues, familles, fusions ★/★★),
// puis leurs équipages s'affrontent. 5 cœurs chacun ; le perdant d'une manche perd 1 cœur (2 à partir de la manche 5) ; égalité = personne ne perd.
// Premier à zéro : perdu. On garde les ordres du capitaine et la cible 🎯 ; pas de carte, pas de règle du voyage.
// Ce fichier se charge APRÈS expedition-moteur.js et expedition-ecran.js : il remplace seulement ce qui change (fonctions marquées « duel »).

const COEURS_DUEL = 5;
// les 3 niveaux de l'ordinateur : des pièces en plus à chaque manche (l'ordinateur ne donne pas d'ordres ni de cible : ses pièces compensent).
// Réglé au simulateur le 18/11 (joueur raisonnable : ordres + cible) : Facile 74 %, Normal 58 %, Difficile 34 %.
const NIVEAUX_DUEL = {
  facile:   { n:'Facile', e:'🌱', or:0, d:'l’ordinateur a les mêmes pièces que toi' },
  normal:   { n:'Normal', e:'⚔', or:3, d:'l’ordinateur a 3 💰 de plus par manche' },
  difficile:{ n:'Difficile', e:'💀', or:7, d:'l’ordinateur a 7 💰 de plus par manche' },
};
const pertesDuel = m => m >= 5 ? 2 : 1; // m = numéro de la manche (1, 2, 3…)

function nouveauDuel(heros, niveau, graine) {
  const X = nouvelleExpedition(heros, graine); X.duel = { niveau:niveau || 'normal', manche:1, coeursIA:COEURS_DUEL, bilan:[] };
  X.coeurs = X.coeursMax = COEURS_DUEL; X.journal = [`⚔ ${HEROS[heros].nom} défie un équipage rival.`];
  const R = rngDe(X.graine + '/ia'), autres = ORDRE.filter(h => h !== heros);
  const Y = nouvelleExpedition(tire(R, autres), X.graine + '/ia'); Y.estFantome = true; X.ia = Y;
  preparerIA(X); return X;
}
// l'ordinateur fait ses courses au début de chaque manche (même règles que toi : pièces, recruteur, fusions)
function preparerIA(X) { const Y = X.ia; Y.escale = X.escale; nouvelleOffre(Y); pilotePort(Y); }
// ce qui arrive à un équipage après un combat : Forge, forge du bord de Maëlle, pièces et intérêts, nouvelle offre, Louve de Pip à la manche 3
function apresManche(Z, gagne, bonusOr) {
  const out = {};
  if (gagne) {
    const fam = compteFamilles(Z, Z.plateau), forges = surPlateau(Z).filter(u => u.fam === 'forge');
    if (palier(fam.forge || 0) === 1 && forges.length) { const f = forges.sort((a, b) => a.a - b.a)[0]; f.bonusA++; out.forge = `${f.n} +1 attaque`; }
    if (palier(fam.forge || 0) === 2) { forges.forEach(f => { f.bonusA++; f.bonusV += 2; }); out.forge = 'toutes les Forges +1 attaque et +2 PV'; }
    if (Z.heros === 'maelle') { const d = Z.plateau.av.filter(u => u && u.key !== 'capitaine').sort((a, b) => (a.a + a.bonusA) - (b.a + b.bonusA))[0]; if (d) { d.bonusA++; d.bonusV = (d.bonusV || 0) + 2; out.maelle = `${d.n} +1 attaque, +2 PV`; } }
  }
  const interet = Math.min(3, Math.floor(Z.or / 5)); out.gain = Math.max(0, 8 + interet + (gagne ? 0 : 2) + (bonusOr || 0)); out.interet = interet; Z.or += out.gain;
  Z.escale = Math.min(5, Z.escale + 1); if (!Z.gel) nouvelleOffre(Z); Z.gel = false; Z.transmuOk = true;
  if (Z.heros === 'pip' && Z.escale === 2 && !toutes(Z).some(u => u.key === 'louve')) { const p = placeLibre(Z, 'av'); if (p) { poseA(Z, p, { id:uid(), key:'louve', n:'La Louve', fam:'ombre', role:'lame', a:3, v:6, star:0, bonusA:0, bonusV:0 }); out.louve = true; } }
  return out;
}
const nomIA = X => HEROS[X.ia.heros].nom;
const _advDuel = adversaire, _joueDuel = joueEscale;
adversaire = function (X) {
  if (!X.duel) return _advDuel(X);
  // 19/11 (l'utilisateur : « undefined tombe », et des recrues rivales encore debout après une manche gagnée) : on fige une COPIE de l'équipage
  // rival au moment du combat ; sinon l'écran rejouait le combat avec l'équipage déjà racheté pour la manche suivante (autres recrues, autres noms)
  const plateau = JSON.parse(JSON.stringify(X.ia.plateau)), Y = Object.assign({}, X.ia, { plateau });
  return { nom:`L’équipage de ${nomIA(X)}`, camp:{ heros:X.ia.heros, plateau, X:Y }, fantome:X.ia.heros };
};
joueEscale = function (X, R) {
  if (!X.duel) return _joueDuel(X, R);
  const D = X.duel, adv = X.advPret || adversaire(X), res = combatExp({ heros:X.heros, plateau:X.plateau, X }, adv.camp, R || hasardX(X));
  res.adv = adv; X.prochain = null; X.ordres = null; X.advPret = null; X.ciblePrio = null;
  const egal = !res.gagne && (res.restant > 0 || res.restantE === 0), perte = pertesDuel(D.manche);
  res.egal = egal; res.perte = perte; res.manche = D.manche;
  if (res.gagne) { D.coeursIA = Math.max(0, D.coeursIA - perte); X.victoires++; X.journal.push(`🏆 Manche ${D.manche} gagnée : ${nomIA(X)} perd ${perte} ❤.`); }
  else if (egal) X.journal.push(`🤝 Manche ${D.manche} : égalité, personne ne perd.`);
  else { X.coeurs = Math.max(0, X.coeurs - perte); X.journal.push(`💔 Manche ${D.manche} perdue : ${perte} ❤ de moins.`); }
  D.bilan.push(res.gagne ? 'g' : egal ? 'e' : 'p');
  if (X.coeurs <= 0) { X.fini = 'perdu'; return res; }
  if (D.coeursIA <= 0) { X.fini = 'gagne'; return res; }
  const n = NIVEAUX_DUEL[D.niveau] || NIVEAUX_DUEL.normal;
  Object.assign(res, apresManche(X, res.gagne, 0)); apresManche(X.ia, !res.gagne && !egal, n.or);
  if (res.louve) X.journal.push('🐺 La Louve rejoint l’équipage !');
  D.manche++; preparerIA(X); return res;
};
// le simulateur : les deux camps joués par le pilote (le joueur donne ses ordres et sa cible, comme un joueur raisonnable)
function simuleDuel(heros, graine, niveau) {
  const X = nouveauDuel(heros, niveau, graine);
  for (let pas = 0; pas < 40 && !X.fini; pas++) { pilotePort(X); piloteOrdres(X, hasardX(X)); piloteCible(X); joueEscale(X, hasardX(X)); }
  return { gagne:X.fini === 'gagne', manches:X.duel.manche, coeurs:X.coeurs, coeursIA:X.duel.coeursIA, ia:X.ia.heros, doubles:toutes(X).filter(u => u.star === 2).length };
}

// ----------------------------------------------------------------------------------------------- l'écran (seulement ce qui change)
if (typeof document !== 'undefined' && document.getElementById('app')) {
  globalThis.niveauDuel = localStorage.getItem('guilde-duel-eq-niveau') || 'normal';
  const coeursHTML = (n, max) => '❤'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, max - n));
  chroniqueEscale = apres => apres(); // pas de pages d'île dans le Duel
  accueil = function () {
    const e = lire(); if (e && !e.fini) { X = e; port(); return; }
    app().innerHTML = `<h1>⚔ Le Duel d’équipages</h1>
    <p class="doux" style="text-align:center">Toi contre l’équipage d’un capitaine rival joué par l’ordinateur. À chaque manche, vous recrutez tous les deux au port, puis vos équipages s’affrontent. <b>5 cœurs</b> chacun : le perdant d’une manche perd 1 cœur (2 à partir de la manche 5). Le premier à zéro a perdu.</p>
    <h2>Ton capitaine</h2><div class="heros6">${ORDRE.map(id => id === 'zephine' && localStorage.getItem('guilde-tuto') !== 'fait'
      ? `<button disabled style="opacity:.5"><img src="${IMG(id)}" alt="" style="filter:grayscale(1)">🔒 ${HEROS[id].nom}</button>`
      : `<button onclick="choixCapitaine('${id}')"><img src="${IMG(id)}" alt="">${HEROS[id].nom}<br><small style="color:var(--or)">${CAPITAINES[id].n}</small><br><small class="prise ${PRISE_EXP[id]}">${PRISE_TXT[PRISE_EXP[id]]}</small></button>`).join('')}${capitainesAventure()}</div>
    <div class="choixh"><button onclick="aideDuel()">📖 Les règles</button><button onclick="records()">🏆 Mes duels</button><button onclick="location.href='menu.html#expeditions'">⛵ Les Expéditions</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`;
  };
  choixCapitaine = function (id) {
    const v = haVoie(id), i = haInfo(id);
    fenetre(`<div style="text-align:center">${i ? haImg(i, 'width:90px;height:90px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px var(--or)') : `<img src="${IMG(v)}" alt="" style="width:90px;height:90px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px var(--or)">`}<h2>${i ? haEsc(i.nom) : HEROS[v].nom}, capitaine</h2>
      <p><b style="color:var(--or)">${CAPITAINES[v].n}</b> : ${CAPITAINES[v].d}</p></div>
      <p style="text-align:center;margin:.6em 0 .2em"><b>L’ordinateur</b></p>
      <div class="diffs">${Object.entries(NIVEAUX_DUEL).map(([k, d]) => `<button class="${niveauDuel === k ? 'sel' : ''}" onclick="niveauDuel='${k}';localStorage.setItem('guilde-duel-eq-niveau','${k}');choixCapitaine('${id}')">${d.e} ${d.n}<br><small>${d.d}</small></button>`).join('')}</div>
      <div class="choixh"><button onclick="fermer()">Autre capitaine</button><button class="or" onclick="fermer();depart('${id}')">⚔ Lancer le duel</button></div>`);
  };
  depart = function (id) { const i = haInfo(id); X = nouveauDuel(haVoie(id), niveauDuel);
    if (i) { X.av = i.id; const cap = X.plateau.av[1]; if (cap && cap.key === 'capitaine') { cap.n = i.nom; cap.av = i.id; } }
    sel = null; sauve(); fenetre(`<h2>⚔ Ton rival : ${nomIA(X)}</h2><p style="text-align:center"><img src="${IMG(X.ia.heros)}" alt="" style="width:90px;height:90px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px var(--mal, #c0392b)"></p><p><b style="color:var(--or)">${CAPITAINES[X.ia.heros].n}</b> : ${CAPITAINES[X.ia.heros].d}</p><p class="doux">Il recrute en même temps que toi. Tu découvriras son équipage au moment du combat.</p><div class="choixh"><button class="or" onclick="fermer();port()">⚓ Au port !</button></div>`); };
  // le port du Duel : le même que celui des Expéditions, avec les cœurs des deux camps à la place de la route des escales
  const portExp = port;
  port = function () {
    portExp(); if (!X || !X.duel) return;
    const D = X.duel, coe = document.querySelector('.entete .coeurs'); if (coe) coe.textContent = coeursHTML(X.coeurs, COEURS_DUEL);
    const r = document.querySelector('.route');
    if (r) r.outerHTML = `<div class="route duel"><div class="esc ici"><b>⚔</b>Manche ${D.manche}</div><div class="esc"><img src="${IMG(X.ia.heros)}" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;vertical-align:middle"> ${nomIA(X)}<br><span style="color:#e57373">${coeursHTML(D.coeursIA, COEURS_DUEL)}</span></div><div class="esc">${D.bilan.slice(-6).map(b => b === 'g' ? '🏆' : b === 'e' ? '🤝' : '💔').join('') || '—'}</div></div>`;
    const pr = document.querySelector('.prochain'); if (pr) pr.innerHTML = `Prochain combat : <b>l’équipage de ${nomIA(X)}</b> · perdre coûte <b>${pertesDuel(D.manche)} ❤</b>`;
    const go = document.querySelector('button.go'); if (go) go.textContent = `⚔ Combattre (manche ${D.manche})`;
  };
  partirOk = function () {
    const n = surPlateau(X).length;
    fenetre(`<h2>⚔ Manche ${X.duel.manche} contre ${nomIA(X)} ?</h2><p>Ton équipage : <b>${n} recrue${n > 1 ? 's' : ''}</b> sur le pont${X.or ? ` · il te reste <b>${X.or} 💰</b>` : ''}.</p><p class="doux">La défaite coûte ${pertesDuel(X.duel.manche)} ❤. Une fois parti, le combat se joue tout seul (garde ton doigt sur un ennemi pour en faire la cible 🎯).</p><div class="choixh"><button onclick="fermer()">Pas encore</button><button class="or" onclick="fermer();ordres()">⚔ On y va !</button></div>`);
  };
  globalThis.FIN_COMBAT_EXP = function (res) {
    if (X.fini) { setTimeout(() => finExp(), 600 / vitesse); return; }
    const l = [res.gagne ? `🏆 <b>Manche gagnée !</b> ${nomIA(X)} perd ${res.perte} ❤.` : res.egal ? '🤝 <b>Égalité</b> : personne ne perd de cœur.' : `💔 <b>Manche perdue</b> : ${res.perte} ❤ de moins.`,
      res.forge ? `⚒ Forge : ${res.forge}.` : '', res.maelle ? `⚒ La forge du bord : ${res.maelle}.` : '', res.louve ? '🐺 La Louve rejoint l’équipage !' : '', res.gain ? `💰 +${res.gain} pièces${res.interet ? ` (dont ${res.interet} d’intérêts)` : ''}.` : '',
      `<span class="doux">Toi ${coeursHTML(X.coeurs, COEURS_DUEL)} · ${nomIA(X)} ${coeursHTML(X.duel.coeursIA, COEURS_DUEL)}</span>`, X.duel.manche === 5 ? '<b>⚠ À partir de maintenant, une défaite coûte 2 ❤.</b>' : ''].filter(Boolean).map(t => `<p>${t}</p>`).join('');
    fenetre(`<h2>Manche ${res.manche}</h2>${l}<div class="choixh"><button class="or" onclick="fermer();port()">⚓ Retour au port</button></div>`);
  };
  finExp = function () {
    if (!X.journalEnvoye && typeof guildeJournal === 'function') { X.journalEnvoye = true; guildeJournal('expedition', { heros:X.heros + (X.av ? ' (aventure)' : '') + ' · duel d’équipages', resultat:X.fini, journal:X.journal || [], resume:{ manches:X.duel.manche, coeurs:X.coeurs, coeursIA:X.duel.coeursIA, rival:X.ia.heros, niveau:X.duel.niveau } }); }
    const gagne = X.fini === 'gagne', D = X.duel, n = NIVEAUX_DUEL[D.niveau] || NIVEAUX_DUEL.normal, score = gagne ? Math.round((300 + X.coeurs * 100 + Math.max(0, 12 - D.manche) * 20) * (D.niveau === 'difficile' ? 1.5 : D.niveau === 'facile' ? .7 : 1)) : D.manche * 20;
    const l = lireRec(); l.unshift({ quand:new Date().toISOString(), heros:X.heros, av:X.av || null, nom:avX() ? avX().nom : null, diff:D.niveau, gagne, parfait:gagne && X.coeurs === COEURS_DUEL, score, escales:D.manche, coeurs:X.coeurs, rival:X.ia.heros, duree:Math.round((Date.now() - X.debut) / 60000) });
    localStorage.setItem(CLE + '-records', JSON.stringify(l.slice(0, 50))); localStorage.removeItem(CLE);
    if (gagne && typeof guildeEvt === 'function') guildeEvt('escale', 1, { heros:progX(), voie:X.heros });
    const h = nomX(), riv = nomIA(X); X = null;
    fenetre(`<h2>${gagne ? '🏆 Duel gagné !' : '💀 Duel perdu'}</h2><p>${gagne ? `L’équipage de ${h} a coulé celui de ${riv} en ${D.manche} manches (${n.e} ${n.n}).` : `L’équipage de ${riv} l’emporte à la manche ${D.manche}.`}</p>
    <p style="font-size:1.5em;color:var(--or);text-align:center">${score} points</p><div class="choixh"><button class="or" onclick="fermer();accueil()">⚔ Nouveau duel</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`);
  };
  records = function () { const l = lireRec(); fenetre(`<h2>🏆 Mes duels d’équipages (${l.length})</h2>${l.length ? `<table>${l.map(r => `<tr><td>${r.gagne ? '🏆' : '💀'} ${new Date(r.quand).toLocaleDateString('fr-FR')} · ${r.nom ? haEsc(r.nom) : HEROS[r.heros].nom} contre ${HEROS[r.rival] ? HEROS[r.rival].nom : '?'} · ${(NIVEAUX_DUEL[r.diff] || NIVEAUX_DUEL.normal).e} · ${r.escales} manche${r.escales > 1 ? 's' : ''}</td><td>${r.score}</td></tr>`).join('')}</table>` : '<p>Aucun encore.</p>'}<div class="choixh"><button onclick="fermer()">Fermer</button></div>`); };
  globalThis.aideDuel = function () { fenetre(`<h2>📖 Le Duel d’équipages</h2><ul style="padding-left:1.1em">
    <li><b>Une manche</b> : tu recrutes au port (comme dans les Expéditions), tu donnes les ordres de ton capitaine, puis ton équipage combat celui du rival, tout seul aux dés.</li>
    <li><b>Gagner une manche</b> : il faut faire tomber TOUT l’équipage rival, son capitaine ET toutes ses recrues (comme dans les Expéditions).</li>
    <li><b>Les cœurs</b> : 5 chacun. Le perdant d’une manche perd 1 ❤, puis 2 ❤ à partir de la manche 5. Égalité (les deux équipages encore debout au bout de 25 rounds, ou tombés en même temps) : personne ne perd.</li>
    <li><b>Les pièces</b> : 8 💰 après chaque manche, +2 si tu as perdu, +1 par tranche de 5 gardées (3 au plus).</li>
    <li><b>Le rival</b> recrute en même temps que toi, avec les mêmes règles. Tu découvres son équipage au combat. 🎯 Garde ton doigt sur un ennemi pour en faire la cible de tout ton équipage.</li>
    <li><b>Familles, fusions ★ / ★★, Forge, Louve de Pip</b> : comme dans les Expéditions.</li>
    <li><b>L’ordinateur</b> ne donne pas d’ordres et ne choisit pas de cible ; pour compenser : 🌱 Facile (mêmes pièces que toi), ⚔ Normal (+3 💰 par manche), 💀 Difficile (+7 💰).</li></ul><div class="choixh"><button onclick="fermer()">Fermer</button></div>`); };
  accueil();
}
