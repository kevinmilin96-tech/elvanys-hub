// =============================================================================================== LE DUEL CONTRE UN AMI, À DISTANCE (15/11 ~17 h 50)
// Demande de l'utilisateur : « mettre cette fonction dans le duel d'arène : jouer contre un ami, maintenant que le moteur est en fonctionnement ».
// duel.html?ami=1 (ou ?salle=CODE, arrivée par une invitation). Même serveur que les Chroniques (/api/hub/guilde/partie, mode 'duel', labo perso).
// Une SALLE D'ATTENTE : l'hôte crée la salle, l'ami la rejoint (code ou invitation de la fenêtre des amis), chacun choisit son héros, l'hôte lance.
// Le jeu reprend le duel « à deux sur le même téléphone » (deux.js) : le joueur dont c'est le tour est en bas ; à la fin de son tour,
// la partie part au serveur et l'autre téléphone la reçoit. Pendant le tour de l'ami : un écran d'attente. Aucune règle ne change.
// Chargé APRÈS deux.js.
let DL = null, DLOB = null, dlEnvoi = false;
const DL_API = '/api/hub/guilde/partie', DL_SALLE = 'guilde-duel-salle';
function dlToast(t) { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(30px + env(safe-area-inset-bottom));z-index:6000;max-width:90vw;background:#000e;color:#f3c96b;font:bold 15px Georgia,serif;padding:10px 16px;border-radius:14px;text-align:center'; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }
async function dlApi(m, url, corps) { const r = await fetch(url, { method:m, headers:{ 'Content-Type':'application/json' }, body:corps ? JSON.stringify(corps) : undefined }); let d = {}; try { d = await r.json(); } catch (e) {} return { statut:r.status, d }; }
const dlNom = () => ((typeof AMIS !== 'undefined' && AMIS.carte && AMIS.carte.pseudo) || localStorage.getItem('guilde-pseudo') || '').trim();
const dlNomDe = id => ((DL && DL.joueurs.find(j => j.id === id)) || {}).nom || '?';
const dlHote = () => DL && DLOB && DLOB.hote === DL.moi.id;
const dlMonTour = () => S && S.ligne && S.J && S.J.joueur === DL.moi.id;
// ------------------------------------------------------------------ l'entrée
function ligneAccueil() {
  let s = null; try { s = JSON.parse(localStorage.getItem(DL_SALLE) || 'null'); } catch (e) {}
  fenetre(`<h2>🌐 Duel contre un ami</h2><p>Chacun sur son téléphone, où qu’il soit. Crée une salle et invite ton ami (ou donne-lui le code), puis chacun choisit son héros.</p>
    <p style="color:#c9c1ea;font-size:.9em;margin:6px 0 2px">Ton prénom (ou pseudo) :</p>
    <input id="dlNom" maxlength="24" value="${dlNom().replace(/"/g, '')}" style="width:100%;font:1.05em Georgia;padding:9px 12px;border-radius:12px;border:2px solid #45457a;background:#14122a;color:#f1ecff">
    <div class="choixh" style="flex-direction:column">
      <button class="or" onclick="dlCreer()">⚔ Créer une salle de duel</button>
      <button onclick="dlRejoindreForm()">🔑 Rejoindre avec un code</button>
      ${typeof amisFenetre === 'function' ? '<button onclick="amisFenetre()">👥 Mes amis</button>' : ''}
      ${s ? `<button onclick='dlRejoindre(${JSON.stringify(s.code)}, ${JSON.stringify(s.moi)})'>↩ Revenir dans la salle ${s.code}</button>` : ''}
      <button onclick="location.href='menu.html#enligne'">⌂ Menu</button></div>`);
}
const dlLitNom = () => { const i = document.getElementById('dlNom'), n = ((i && i.value) || dlNom()).trim().slice(0, 24); if (n) localStorage.setItem('guilde-pseudo', n); return n; };
async function dlCreer() {
  const nom = dlLitNom(); if (!nom) { dlToast('Ton prénom ?'); return; }
  const moi = { id:'j' + Math.random().toString(36).slice(2, 10), nom };
  DLOB = { mode:'duel', hote:moi.id, choix:{} };
  try { const { statut, d } = await dlApi('POST', DL_API, { mode:'duel', etat:{ lobby:DLOB }, joueurs:[{ id:moi.id, nom, heros:[] }] });
    if (statut !== 200) { dlToast(d.message || 'Impossible de créer la salle.'); DLOB = null; return; }
    DL = { code:d.code, version:d.version, moi, joueurs:[{ id:moi.id, nom, heros:[] }] }; window.SALLE_ACTIVE = d.code;
    localStorage.setItem(DL_SALLE, JSON.stringify({ code:d.code, moi })); dlSalle();
    if (typeof amisAgir === 'function') amisAgir('signal');
  } catch (e) { dlToast('Pas de réseau.'); DLOB = null; }
}
function dlRejoindreForm() {
  const nom = dlLitNom();
  fenetre(`<h2>🔑 Rejoindre un duel</h2><p>Le code de la salle (4 lettres) :</p>
    <input id="dlCode" maxlength="4" autocomplete="off" style="width:100%;font:bold 1.6em Georgia;text-align:center;letter-spacing:.3em;text-transform:uppercase;padding:10px;border-radius:12px;border:2px solid #f3c96b;background:#14122a;color:#f1ecff">
    <div class="choixh"><button class="or" onclick="const c=(document.getElementById('dlCode').value||'').toUpperCase().replace(/[^A-Z]/g,'');if(c.length<4){dlToast('4 lettres');return}dlRejoindre(c,{id:'j'+Math.random().toString(36).slice(2,10),nom:${JSON.stringify(nom || 'Joueur')}})">Rejoindre</button><button onclick="ligneAccueil()">Retour</button></div>`);
}
async function dlRejoindre(code, moi) {
  try { const { statut, d } = await dlApi('GET', `${DL_API}/${code}`);
    if (statut !== 200) { dlToast(d.message || 'Code inconnu.'); return; }
    if (d.mode && d.mode !== 'duel') { location.href = 'chroniques.html?salle=' + code; return; }
    DL = { code, version:d.version, moi, joueurs:d.joueurs || [] }; window.SALLE_ACTIVE = code;
    if (!DL.joueurs.some(j => j.id === moi.id)) DL.joueurs.push({ id:moi.id, nom:moi.nom, heros:[] });
    localStorage.setItem(DL_SALLE, JSON.stringify({ code, moi }));
    if (typeof amisAgir === 'function') amisAgir('signal');
    if (d.etat && d.etat.lobby) { DLOB = d.etat.lobby; if (DL.joueurs.length > 2 && !DL.joueurs.slice(0, 2).some(j => j.id === moi.id)) { dlToast('Ce duel est déjà complet : tu regardes.'); } dlSalle(); dlPousseLobby(); return; }
    dlRecoit(d);
  } catch (e) { dlToast('Pas de réseau.'); }
}
// ------------------------------------------------------------------ la salle d'attente
async function dlPousseLobby(f) {
  if (!DL || !DLOB) return; if (dlEnvoi) { setTimeout(() => dlPousseLobby(f), 300); return; } dlEnvoi = true;
  try { for (let k = 0; k < 4; k++) {
      if (f) f(DLOB); if (!DL.joueurs.some(j => j.id === DL.moi.id)) DL.joueurs.push({ id:DL.moi.id, nom:DL.moi.nom, heros:[] });
      const { statut, d } = await dlApi('POST', `${DL_API}/${DL.code}`, { version:DL.version, etat:{ lobby:DLOB }, joueurs:DL.joueurs });
      if (statut === 200) { DL.version = d.version; break; }
      if (statut === 409 && d.etat && d.etat.lobby) { DLOB = d.etat.lobby; if (d.joueurs) DL.joueurs = d.joueurs; DL.version = d.version; continue; }
      if (statut === 409) { dlEnvoi = false; dlRecoit(d); return; }
      dlToast(d.message || 'Le serveur ne répond pas.'); break; } } catch (e) { dlToast('Pas de réseau.'); }
  dlEnvoi = false; if (DLOB && !(S && S.ligne)) dlSalle();
}
function dlChoisit(id) { if (typeof GM !== 'undefined') try { GM.son('choisir'); } catch (e) {} dlPousseLobby(X => { X.choix = X.choix || {}; X.choix[DL.moi.id] = id; }); }
function dlSalle() {
  if (!DL || !DLOB) return; document.getElementById('app').style.visibility = 'hidden';
  const duo = DL.joueurs.slice(0, 2), moi = DLOB.choix[DL.moi.id], autre = duo.find(j => j.id !== DL.moi.id), sonChoix = autre && DLOB.choix[autre.id];
  const pret = duo.length === 2 && duo.every(j => DLOB.choix[j.id]);
  const E = typeof AMIS !== 'undefined' && AMIS.etat, enL = E ? E.amis.filter(x => x.enLigne && x.salle !== DL.code) : [];
  fenetre(`<h2>🌐 Duel · salle <span style="letter-spacing:.15em;color:#f3c96b">${DL.code}</span></h2>
    <p style="text-align:center;margin:2px 0">${duo.map(j => `${j.id === DLOB.hote ? '👑' : '🙂'} <b>${j.nom}</b>${j.id === DL.moi.id ? ' (toi)' : ''}${DLOB.choix[j.id] ? ` · ${HEROS[DLOB.choix[j.id]].nom}` : ' · choisit…'}`).join('<br>')}${duo.length < 2 ? '<br><span style="color:#c9c1ea">⏳ En attente d’un ami…</span>' : ''}</p>
    ${duo.length < 2 ? `<div class="choixh"><button onclick="${typeof amisFenetre === 'function' ? 'amisFenetre()' : `dlToast('Donne le code ${DL.code}')`}">👥 Inviter un ami${enL.length ? ` (${enL.length} en ligne)` : ''}</button></div><p style="text-align:center;color:#c9c1ea;font-size:.9em">ou donne-lui le code <b>${DL.code}</b> (Arène → En ligne → Rejoindre avec un code)</p>` : ''}
    <p style="margin:8px 0 4px">Ton héros :</p>
    <div class="heros6">${ORDRE.map(id => id === 'zephine' && localStorage.getItem('guilde-tuto') !== 'fait'
      ? `<button disabled style="opacity:.5"><img src="${IMG(id)}" alt="" style="filter:grayscale(1)">🔒 ${HEROS[id].nom}</button>`
      : `<button onclick="dlChoisit('${id}')" style="${moi === id ? 'outline:3px solid #7dffb0' : ''}"><img src="${IMG(id)}" alt="">${HEROS[id].nom}</button>`).join('')}</div>
    <div class="choixh" style="flex-direction:column">
      ${dlHote() ? `<button class="or" ${pret ? '' : 'disabled style="opacity:.5"'} onclick="dlLance()">▶ Lancer le duel${pret ? '' : ' (chacun choisit son héros)'}</button>`
        : `<p style="text-align:center;color:#c9c1ea">⏳ ${pret ? `En attente du lancement par <b>${dlNomDe(DLOB.hote)}</b>…` : 'Choisis ton héros ; l’hôte lancera le duel.'}</p>`}
      <button onclick="if(confirm('Quitter la salle ?')){dlQuitte()}">‹ Quitter la salle</button></div>`);
}
function dlQuitte() { DL = null; DLOB = null; window.SALLE_ACTIVE = ''; try { localStorage.removeItem(DL_SALLE); } catch (e) {} location.href = 'menu.html#enligne'; }
// l'hôte lance (et la revanche : le perdant commence)
async function dlLance(premier) {
  if (!DL) return; const duo = DL.joueurs.slice(0, 2); if (duo.length < 2) return;
  const choix = DLOB ? DLOB.choix : S.ligneChoix, a = premier || DLOB.hote, b = duo.find(j => j.id !== a).id;
  nouvellePartie(choix[a], choix[b]);
  S.deux = true; S.ligne = true; S.O.ordi = false; S.J.joueur = a; S.O.joueur = b; S.J.qui = dlNomDe(a); S.O.qui = dlNomDe(b);
  S.ligneChoix = choix; S.ligneHote = DLOB ? DLOB.hote : S.ligneHote; S.manche = Date.now();
  log('Duel à distance : ' + S.J.qui + ' contre ' + S.O.qui + '.'); DLOB = null;
  await dlPousse(); dlAffiche();
}
// ------------------------------------------------------------------ pendant la partie
async function dlPousse() {
  if (!DL || !S) return; if (dlEnvoi) { setTimeout(dlPousse, 300); return; } dlEnvoi = true;
  try { for (let k = 0; k < 3; k++) {
      const { statut, d } = await dlApi('POST', `${DL_API}/${DL.code}`, { version:DL.version, etat:S, joueurs:DL.joueurs });
      if (statut === 200) { DL.version = d.version; break; }
      if (statut === 409) { DL.version = d.version; continue; } // le duel se joue chacun son tour : notre état fait foi
      dlToast(d.message || 'Le serveur ne répond pas.'); break; } } catch (e) { dlToast('Pas de réseau : le coup n’est pas parti.'); }
  dlEnvoi = false;
}
function dlRecoit(d) {
  if (!d || !d.etat) return; DL.version = d.version; if (d.joueurs) DL.joueurs = d.joueurs;
  if (d.etat.lobby) { DLOB = d.etat.lobby; S = null; dlSalle(); return; }
  const avant = S && S.manche; S = d.etat; DLOB = null;
  if (typeof FX !== 'undefined') { FX = []; fxApres = []; fxOn = false; }
  if (avant !== S.manche) { try { arreteMusique(); } catch (e) {} }
  dlAffiche();
}
function dlAffiche() {
  if (!S) return;
  if (S.fini) { document.getElementById('app').style.visibility = ''; fermer(); dessine(); rendu(); montrerFin(); return; }
  if (dlMonTour()) { fermer(); document.getElementById('app').style.visibility = ''; dessine(); rendu(); if (S.deuxResume) dlToast(S.deuxResume); if (typeof GM !== 'undefined') try { GM.son('portail'); } catch (e) {} return; }
  // pendant le tour de l'ami : rien du jeu n'est visible (ses cartes restent secrètes)
  const J = S.J, M = S.O; document.getElementById('app').style.visibility = 'hidden';
  fenetre(`<div style="text-align:center"><img src="${IMG(J.id)}" alt="" style="width:100px;height:100px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px ${J.c},0 0 30px ${J.c}">
    <h2>⏳ Tour de ${J.qui}</h2><p>${J.nom} · ❤ ${Math.max(0, J.pv)} PV</p>
    <p style="color:#c9c1ea">Toi : ${M.nom} · ❤ ${Math.max(0, M.pv)} PV · ◆ ${M.pc} PC</p>
    <p style="color:#c9c1ea;font-size:.9em">La partie revient toute seule quand ${J.qui} a fini son tour.</p>
    <div class="choixh"><button onclick="if(confirm('Quitter le duel ? (tu pourras revenir dans la salle)'))location.href='menu.html#enligne'">⌂ Menu</button></div></div>`, false);
}
// la fin du tour : deux.js échange les camps puis appelle deuxPasse ; à distance, on envoie la partie et on attend
const _deuxPasseLigne = deuxPasse;
deuxPasse = function (premier) { if (!S || !S.ligne) return _deuxPasseLigne(premier); dlPousse().then(dlAffiche); };
// la fin : on envoie l'état final (une fois), puis l'annonce, et la revanche (l'hôte la lance, le perdant commence)
const _montrerFinLigne = montrerFin;
montrerFin = function () {
  if (!S || !S.ligne) return _montrerFinLigne();
  if (!S.ligneFin) { S.ligneFin = true; dlPousse(); }
  if (S.deuxFinVu) return; S.deuxFinVu = true;
  const g = S.J.pv > 0 ? S.J : S.O, p = g === S.J ? S.O : S.J, moiGagne = g.joueur === DL.moi.id;
  try { arreteMusique(1.2); son(moiGagne ? 'victoire' : 'defaite'); effetImage(moiGagne ? 'victoire' : 'defaite', document.getElementById('app'), 2.2); } catch (e) {}
  document.getElementById('app').style.visibility = '';
  fenetre(`<div style="text-align:center"><img src="${IMG(g.id)}" alt="" style="width:110px;height:110px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px #f3c96b,0 0 30px #f3c96b">
    <h2>${moiGagne ? '🏆 Tu gagnes !' : `💀 ${g.qui} gagne…`}</h2><p>${g.nom} (${g.qui}) bat ${p.nom} (${p.qui}) en ${Math.max(S.J.tours, S.O.tours)} tours.</p>
    <div class="choixh">${S.ligneHote === DL.moi.id ? `<button class="or" onclick="fermer();dlLance('${p.joueur}')">🔁 Revanche (${p.qui} commence)</button>` : '<p style="color:#c9c1ea">L’hôte peut lancer la revanche.</p>'}
      <button onclick="dlQuitte()">⌂ Menu</button></div></div>`);
};
// on demande l'état toutes les 2 secondes quand ce n'est pas à nous de jouer
setInterval(async () => {
  if (!DL || dlEnvoi || document.hidden) return;
  if (S && S.ligne && dlMonTour() && !S.fini) return;
  try { const { statut, d } = await dlApi('GET', `${DL_API}/${DL.code}?v=${DL.version}`); if (statut === 200 && !d.pareil) dlRecoit(d); } catch (e) {}
}, 2000);
// l'entrée : duel.html?ami=1 ou ?salle=CODE
(function () {
  if (typeof document === 'undefined') return; const q = new URLSearchParams(location.search);
  if (q.get('salle')) addEventListener('load', () => { const nom = dlNom(); if (nom) dlRejoindre(q.get('salle').toUpperCase(), { id:'j' + Math.random().toString(36).slice(2, 10), nom }); else { ligneAccueil(); } });
  else if (q.get('ami')) addEventListener('load', () => ligneAccueil());
})();
