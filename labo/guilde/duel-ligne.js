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
  if (!DL || !S || dlJoue) return; if (dlEnvoi) { setTimeout(dlPousse, 300); return; } dlEnvoi = true;
  try { for (let k = 0; k < 3; k++) {
      const { statut, d } = await dlApi('POST', `${DL_API}/${DL.code}`, { version:DL.version, etat:S, joueurs:DL.joueurs });
      if (statut === 200) { DL.version = d.version; break; }
      if (statut === 409) { DL.version = d.version; continue; } // le duel se joue chacun son tour : notre état fait foi
      dlToast(d.message || 'Le serveur ne répond pas.'); break; } } catch (e) { dlToast('Pas de réseau : le coup n’est pas parti.'); }
  dlEnvoi = false;
}
function dlRecoit(d) {
  if (!d || !d.etat) return; if (dlJoue) { dlAttente = d; return; } // une animation de l'ami se joue : on attend qu'elle finisse
  DL.version = d.version; if (d.joueurs) DL.joueurs = d.joueurs;
  if (!d.etat.lobby && document.getElementById('dlDirect') && S && d.etat.manche === S.manche) {
    const neuves = (d.etat.fxLog || []).filter(x => x.n > (dlFxVu == null ? Infinity : dlFxVu));
    dlFxVu = Math.max(dlFxVu || 0, ...(d.etat.fxLog || []).map(x => x.n));
    if (neuves.length) {
      const vue = JSON.parse(JSON.stringify(d.etat)); const act = vue.J.joueur === DL.moi.id ? vue.O : vue.J, moi = act === vue.J ? vue.O : vue.J; vue.J = moi; vue.O = act;
      // si le tour vient de passer de mon côté, les animations ont été notées quand l'ami était encore « J » : elles restent à inverser (c'est ce que fait dlInverse)
      S = d.etat; DLOB = null; dlAttente = null; dlRejoue(neuves, vue); return;
    }
  } else if (d.etat.fxLog) dlFxVu = Math.max(dlFxVu || 0, ...d.etat.fxLog.map(x => x.n));
  if (d.etat.lobby) { DLOB = d.etat.lobby; S = null; dlSalle(); return; }
  const avant = S && S.manche; S = d.etat; DLOB = null;
  if (typeof FX !== 'undefined') { FX = []; fxApres = []; fxOn = false; }
  if (avant !== S.manche) { try { arreteMusique(); } catch (e) {} }
  dlAffiche();
}
function dlAffiche() {
  if (!S) return;
  dlDirectOff();
  if (S.fini) { document.getElementById('app').style.visibility = ''; fermer(); dessine(); rendu(); montrerFin(); return; }
  if (dlMonTour()) {
    const cle = S.J.joueur + ':' + S.J.tours;
    if (S.tourLogDe !== cle) { // 15/11 soir : un nouveau tour commence pour moi : le résumé de ce que l'ami a fait
      const lignes = S.tourLog0 != null ? S.log.slice(0, Math.max(0, S.log.length - S.tourLog0)).reverse() : [];
      S.tourLog0 = S.log.length; S.tourLogDe = cle;
      // 15/11 soir (l'utilisateur : « pas besoin du résumé si je vois chaque action ») : plus de fenêtre, on revient droit au plateau
      dlVu = 0; dlPvVu = null;
    }
    fermer(); document.getElementById('app').style.visibility = ''; dessine(); rendu(); if (typeof GM !== 'undefined') try { GM.son('portail'); } catch (e) {} return; }
  // 15/11 soir (l'utilisateur : « je veux que l'on voie tous les deux le plateau en même temps ») : pendant le tour de l'ami, LE PLATEAU
  // en direct, vu de MON côté (moi en bas), sans pouvoir toucher ; sa main reste cachée (le plateau ne montre que la main du joueur du bas).
  const J = S.J, M = S.O; fermer();
  const lignes = S.tourLog0 != null ? S.log.slice(0, Math.max(0, S.log.length - S.tourLog0)) : [];
  const nouv = lignes.length - (dlVu || 0); dlVu = lignes.length;
  if (M.pv < (dlPvVu == null ? M.pv : dlPvVu)) { try { son('coup'); } catch (e) {} }
  dlPvVu = M.pv;
  const vue = JSON.parse(JSON.stringify(S)); vue.J = vue.O; vue.O = JSON.parse(JSON.stringify(S.J)); vue.J.aLancer = false; vue.finPrevue = true;
  const vrai = S; S = vue; try { dessine(); } catch (e) { console.error(e); } finally { S = vrai; }
  document.getElementById('app').style.visibility = '';
  { const b = document.querySelector('#app .bandeau'); if (b) b.textContent = `⏳ ${J.qui} joue : regarde son tour en direct.`; // pas de consigne pour moi
    const bas = document.querySelector('#app .bas'); if (bas) bas.style.visibility = 'hidden'; }
  // 15/11 soir (l'utilisateur : « elle devrait voir les dés comme un ennemi ») : pendant son tour, le bac montre SES dés (ses faces), pas les miens
  { const bac = document.querySelector('#app .des');
    if (bac) bac.innerHTML = `<div class="dl-qui">🎲 ${J.qui}</div>` + J.des.map(d => `<div class="d ${d.pose ? 'pose' : ''} ${J.aLancer ? 'cache' : ''} dl-ennemi"><img src="${FACE(J.id, d.v || 1)}" alt="${J.aLancer ? '?' : d.v}"><div class="sac">${J.aLancer ? '' : d.pose ? 'posé' : ''}</div></div>`).join(''); }
  let z = document.getElementById('dlDirect');
  if (!z) { z = document.createElement('div'); z.id = 'dlDirect'; document.body.appendChild(z); }
  z.innerHTML = `<div class="dl-band"><b>⏳ Tour de ${J.qui}</b> <small style="color:#ff6b6b">● en direct</small>
      <button onclick="if(confirm('Quitter le duel ? (tu pourras revenir dans la salle)'))location.href='menu.html#enligne'">⌂</button>
      <div class="dl-der">${lignes.length ? lignes.slice(0, 2).map((t, i) => `<div class="${i < nouv ? 'neuf' : ''}">${dlTexte(t, J.nom)}</div>`).join('') : `${J.qui} réfléchit…`}</div></div>`;
}
function dlDirectOff() { const z = document.getElementById('dlDirect'); if (z) z.remove(); }
// 15/11 soir (l'utilisateur : « on ne voit pas l'écran en direct, on se retrouve à avoir perdu toute la vie sans rien voir ») :
// pendant mon tour, la partie part au serveur après chaque action (au plus toutes les 1,2 s) ; l'ami voit le fil des actions et les deux vies.
let dlVu = 0, dlPvVu = null, dlDirectT = null;
const dlTexte = (t, nom) => String(t).replace(/^Tu lances/, nom + ' lance').replace(/^Tu relances/, nom + ' relance').replace(/^Tu /, nom + ' : ');
function dlCarteH(H, qui) {
  const pct = Math.max(0, Math.min(100, 100 * H.pv / (H.pvMax || H.pv || 1)));
  return `<div class="dl-h"><img src="${IMG(H.id)}" alt="" style="box-shadow:0 0 0 3px ${H.c}"><small>${qui}</small><b>${H.nom}</b>
    <div class="dl-pv"><i style="width:${pct}%"></i></div><span>❤ ${Math.max(0, H.pv)}${H.bouclier ? ` · 🛡 ${H.bouclier}` : ''}</span></div>`;
}
function dlResume(lignes) {
  dlVu = 0; dlPvVu = null; const J = S.J, A = S.O;
  document.getElementById('app').style.visibility = 'hidden';
  fenetre(`<div style="text-align:center">
    <div class="dl-face">${dlCarteH(A, A.qui)}<b style="font-size:1.4em;color:#f3c96b">⚔</b>${dlCarteH(J, 'Toi')}</div>
    <h2 style="margin:6px 0">📜 Pendant le tour de ${A.qui}</h2>
    <div class="dl-fil">${lignes.map(t => `<div>${dlTexte(t, A.nom)}</div>`).join('')}</div>
    <div class="choixh"><button class="or" onclick="fermer();document.getElementById('app').style.visibility='';dessine();rendu();try{GM.son('portail')}catch(e){}">À moi de jouer</button></div></div>`, false);
}
function dlDirect() {
  if (dlDirectT) return;
  dlDirectT = setTimeout(() => { dlDirectT = null; if (S && S.ligne && DL && dlMonTour() && !S.fini) dlPousse(); }, 1200);
}
const _renduLigne = rendu;
// 15/11 soir (l'utilisateur : « je ne vois pas les animations des attaques ni des cartes jouées par l'adversaire ») : chaque animation
// du joueur actif est notée dans la partie (S.fxLog, numérotée) ; l'ami la REJOUE sur son plateau, côtés inversés, avant de le redessiner.
function dlNoteFX() {
  if (!S || !S.ligne || !DL || !dlMonTour() || !FX.length) return;
  S.fxLog = S.fxLog || []; S.fxSeq = S.fxSeq || 0;
  FX.forEach(e => { if (e._n) return; e._n = ++S.fxSeq; try { if (e.t !== 'recap' && e.t !== 'desO') S.fxLog.push({ n:e._n, e:JSON.parse(JSON.stringify(e)) }); } catch (x) {} });
  if (S.fxLog.length > 60) S.fxLog = S.fxLog.slice(-60);
}
const dlInverse = o => Array.isArray(o) ? o.map(dlInverse) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === 's' && (v === 'J' || v === 'O') ? (v === 'J' ? 'O' : 'J') : dlInverse(v)])) : o;
let dlFxVu = null, dlJoue = false, dlAttente = null;
async function dlRejoue(liste, vue) {
  dlJoue = true; const vrai = S; S = vue;
  fxVite = localStorage.getItem('guilde-vitesse') === 'rapide' ? .7 : 1.4;
  for (const x of liste) { try { await Promise.race([joue1(dlInverse(x.e)), new Promise(r => setTimeout(r, 7000))]); } catch (e) { console.error(e); } }
  S = vrai; dlJoue = false;
  if (dlAttente) { const d = dlAttente; dlAttente = null; dlRecoit(d); } else dlAffiche();
}
rendu = function () {
  if (dlJoue) return; // pendant qu'on rejoue les animations de l'ami, S est une vue inversée : ni dessin ni envoi
  dlNoteFX();
  if (S && S.ligne && DL && !S.fini && !dlMonTour()) { dlAffiche(); return; } // pendant le tour de l'ami : toujours le plateau vu de mon côté
  _renduLigne(); if (S && S.ligne && DL && !S.fini && dlMonTour()) dlDirect(); };
(function () { if (typeof document === 'undefined') return; const st = document.createElement('style');
  st.textContent = `.dl-face{display:flex;align-items:center;justify-content:center;gap:10px}.dl-h{display:flex;flex-direction:column;align-items:center;width:42%}
  .dl-h img{width:64px;height:64px;border-radius:50%;object-fit:cover}.dl-h small{color:#c9c1ea;font-size:.75em;margin-top:4px}.dl-h b{font-size:.95em}
  .dl-h span{font-size:.85em}.dl-pv{width:100%;height:8px;border-radius:4px;background:#0006;overflow:hidden;margin:3px 0}.dl-pv i{display:block;height:100%;background:linear-gradient(90deg,#e5262c,#ff8a65);transition:width .6s}
  .dl-fil{max-height:38vh;overflow:auto;text-align:left;background:#0004;border-radius:10px;padding:6px 10px;margin:8px 0;font-size:.9em}
  #dlDirect{position:fixed;inset:0;z-index:40;background:transparent}#dlDirect .dl-band{position:absolute;left:8px;right:8px;top:8px;background:#161d2cee;border:2px solid #f3c96b;border-radius:14px;padding:6px 10px;font:14px Georgia;color:#fff;box-shadow:0 4px 16px #000a}
  #dlDirect .dl-band button{float:right;background:#0006;color:#fff;border:1px solid #fff4;border-radius:10px;padding:2px 10px}#dlDirect .dl-der{font-size:.88em;margin-top:3px}#dlDirect .dl-der .neuf{color:#f3c96b;animation:dlNeuf .8s}
  #app .des .dl-ennemi{filter:drop-shadow(0 0 6px #ff4b4b)}#app .des .dl-qui{font:bold 11px Georgia;color:#ffb3b3;text-align:center;text-shadow:0 1px 2px #000}
  .dl-fil div{padding:3px 0;border-bottom:1px solid #ffffff14}.dl-fil .neuf{color:#f3c96b;animation:dlNeuf .8s}
  @keyframes dlNeuf{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`;
  document.head.appendChild(st); })();
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
