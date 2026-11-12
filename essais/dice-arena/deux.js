// =============================================================================================== DUEL À DEUX sur le même téléphone (12/11 nuit)
// duel.html?deux=1 : chaque joueur choisit son héros, puis on se passe le téléphone. Le joueur dont c'est le tour est TOUJOURS en bas :
// à la fin d'un tour, les deux camps s'échangent (S.J ↔ S.O) derrière un écran « Passe le téléphone » qui cache la main.
// Aucun changement de règle : le second joueur a 3 PC et une carte de plus au départ, comme contre l'ordinateur.

let deuxChoix = [];
function deuxAccueil() {
  deuxChoix = [];
  deuxChoisir();
}
function deuxChoisir() {
  const n = deuxChoix.length + 1;
  fenetre(`<h2>⚔ Duel à deux · Joueur ${n}</h2><p>${n === 1 ? 'Le premier joueur choisit son héros (il commence).' : `Joueur 2, à toi de choisir (contre ${HEROS[deuxChoix[0]].nom}).`}</p>
    <div class="heros6">${ORDRE.map(id => id === 'zephine' && localStorage.getItem('guilde-tuto') !== 'fait'
      ? `<button disabled style="opacity:.5"><img src="${IMG(id)}" alt="" style="filter:grayscale(1)">🔒 ${HEROS[id].nom}</button>`
      : `<button onclick="deuxPrend('${id}')" ${deuxChoix.includes(id) ? 'disabled style="opacity:.4"' : ''}><img src="${IMG(id)}" alt="">${HEROS[id].nom}</button>`).join('')}</div>
    <div class="choixh"><button onclick="location.href='menu.html#arene'">⌂ Menu</button></div>`);
}
function deuxPrend(id) {
  deuxChoix.push(id);
  if (deuxChoix.length < 2) { deuxChoisir(); return; }
  fermer(); nouvellePartie(deuxChoix[0], deuxChoix[1]);
  S.deux = true; S.O.ordi = false; S.J.qui = 'Joueur 1'; S.O.qui = 'Joueur 2';
  log('Duel à deux sur le même téléphone.');
  deuxPasse(true);
}
// l'écran de passage : rien du jeu n'est visible derrière
function deuxPasse(premier) {
  const J = S.J;
  document.getElementById('app').style.visibility = 'hidden';
  fenetre(`<div style="text-align:center"><img src="${IMG(J.id)}" alt="" style="width:110px;height:110px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px ${J.c},0 0 30px ${J.c}">
    <h2>${premier ? '' : '📱 Passe le téléphone !<br>'}Au tour de ${J.qui}</h2><p>${J.nom} · ❤ ${Math.max(0, J.pv)} PV · ◆ ${J.pc} PC</p>
    <p style="color:#c9c1ea;font-size:.9em">${premier ? 'Le joueur 2 regarde ailleurs : chacun garde ses cartes secrètes.' : `L’autre joueur détourne les yeux. ${S.deuxResume || ''}`}</p>
    <div class="choixh"><button class="or" onclick="deuxGo()">C’est moi, ${J.qui} : je joue</button></div></div>`);
}
function deuxGo() { fermer(); document.getElementById('app').style.visibility = ''; dessine(); rendu(); }

// fin de tour à deux : même fin que contre l'ordinateur, puis échange des camps
const _finDeMonTourDeux = finDeMonTour;
finDeMonTour = function () {
  if (!S || !S.deux) return _finDeMonTourDeux();
  if (S.fini || roule || fxOn) return;
  if (S.J.aLancer) { lancerMesDes(); return; }
  const J = S.J, pvAvant = S.O.pv;
  const libres = J.des.filter(d => !d.pose);
  if (libres.length) pose(J, 'vendre', libres);
  attaquesRestantes(J); if (S.fini) { rendu(); return; }
  finTour(J); sel = []; attaquant = null; ciblage = null;
  const perdu = pvAvant - S.O.pv;
  S.deuxResume = perdu > 0 ? `Pendant le tour de ${J.nom}, tu as perdu ${perdu} ❤.` : '';
  rendu();
  fxApres.push(() => { const t = S.J; S.J = S.O; S.O = t; FX = []; debutTour(S.J); deuxPasse(false); });
};
// la fin : on annonce le gagnant par son nom (S.fini est vu du joueur du bas)
const _montrerFinDeux = montrerFin;
montrerFin = function () {
  if (!S || !S.deux) return _montrerFinDeux();
  if (S.deuxFin) return; S.deuxFin = true;
  const g = S.J.pv > 0 ? S.J : S.O, p = g === S.J ? S.O : S.J;
  arreteMusique(1.2); son('victoire'); effetImage('victoire', document.getElementById('app'), 2.2);
  fenetre(`<div style="text-align:center"><img src="${IMG(g.id)}" alt="" style="width:110px;height:110px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px #f3c96b,0 0 30px #f3c96b">
    <h2>🏆 ${g.qui} gagne avec ${g.nom} !</h2><p>${p.nom} (${p.qui}) tombe après ${Math.max(S.J.tours, S.O.tours)} tours.</p>
    <div class="choixh"><button onclick="fermer();deuxRevanche('${p.id}', '${g.id}', '${p.qui}', '${g.qui}')">🔁 Revanche (le perdant commence)</button><button onclick="location.href='menu.html#arene'">⌂ Menu</button></div></div>`);
};
function deuxRevanche(a, b, qa, qb) { deuxChoix = [a, b]; fermer(); nouvellePartie(a, b); S.deux = true; S.O.ordi = false; S.J.qui = qa; S.O.qui = qb; deuxPasse(true); }
