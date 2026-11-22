// =============================================================================================== LES CHRONIQUES SUR GRAND ÉCRAN (22/11)
// Validé par l'utilisateur (carte de l'application, 22/11) : l'ÉCRAN DE LA TABLE (télé, PC, tablette posée au milieu) rejoint la salle
// par son code et montre la carte en grand, les héros, l'initiative, les lancers et le tour des monstres ; les téléphones jouent.
// L'écran ne fait que LIRE la partie (les mêmes salles /api/hub/guilde/partie, relues toutes les 2 s) : il ne joue jamais,
// n'envoie jamais rien, ne prend aucun héros et ne range aucune sauvegarde. Rien à changer sur le serveur.
// Entrées : chroniques.html?ecran=1 (demande le code), chroniques.html?ecran=CODE, ou « 📺 Écran de la table » dans « Rejoindre ».
let ECRAN = false;

function ecranForm() {
  fenetre(`<h2>📺 L’écran de la table</h2><p style="color:var(--doux)">Cet écran (télé, ordinateur, tablette posée au milieu) va montrer la partie en grand. Chacun joue sur son téléphone.</p>
    <p style="color:var(--doux)">Le code de la salle (4 lettres), affiché sur le téléphone de l’hôte :</p>
    <input id="eCode" maxlength="4" autocomplete="off" style="width:100%;font:bold 1.6em Georgia;text-align:center;letter-spacing:.3em;text-transform:uppercase;padding:10px;border-radius:12px;border:2px solid var(--or);background:#14122a;color:var(--texte)">
    <button class="go" onclick="ecranDemarre(($('eCode').value||'').toUpperCase())">Montrer la partie ici</button><button class="sec" onclick="fenetre('')">Annuler</button>`);
  setTimeout(() => { const i = $('eCode'); if (i) i.focus(); }, 100);
}
async function ecranDemarre(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length < 4) { bulle('Le code a 4 lettres', true); return; }
  try {
    const { statut, d } = await api('GET', `${API}/${code}`);
    if (statut !== 200) { bulle(d.message || 'Code inconnu.', true); return; }
    if (d.mode === 'duel') { bulle('Ce code est celui d’un duel : l’écran de la table sert aux Chroniques.', true); return; }
    ECRAN = true; document.body.classList.add('ecran-table'); fenetre('');
    try { history.replaceState(null, '', location.pathname + '?ecran=' + code); } catch (e) {}
    L = { code, version:d.version, joueurs:d.joueurs || [], moi:{ id:'ecran-table', nom:'📺 Écran' }, ecran:true, dernier:'' };
    if (d.etat && d.etat.lobby) { LOB = d.etat.lobby; S = null; ecranAttente(); }
    else { LOB = null; S = d.etat; actif = 0; sel = null; centrer = true; L.dernier = JSON.stringify(S); dessine(); }
    ecranBouton(); if (typeof son === 'function') son('portail');
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {} // la télé ne s'endort pas pendant la partie
  } catch (e) { bulle('Pas de réseau.', true); }
}
function ecranQuitter() { ECRAN = false; L = null; S = null; LOB = null; document.body.classList.remove('ecran-table', 'jeu'); const b = document.getElementById('ecran-quitte'); if (b) b.remove(); history.replaceState(null, '', location.pathname); fenetre(''); accueil(); }
function ecranBouton() {
  if (document.getElementById('ecran-quitte')) return;
  const b = document.createElement('button'); b.id = 'ecran-quitte'; b.textContent = '✕ Quitter l’écran'; b.onclick = () => { if (confirm('Cet écran arrête de montrer la partie ? (La partie continue sur les téléphones.)')) ecranQuitter(); };
  document.body.appendChild(b);
}
// la salle d'attente, vue de l'écran : le code en très grand, les joueurs et les héros qui arrivent
function ecranAttente() {
  document.body.classList.remove('jeu');
  const titre = LOB.camp != null ? (LOB.camp === 'nouvelle' ? CHAPITRES[0].titre : (CHAPITRES[LOB.camp] || {}).titre) : (SCX_TXT[LOB.scen] || {}).titre || '';
  const qui = id => (L.joueurs.find(j => j.id === id) || {}).nom || '';
  $('app').innerHTML = `<div class="ecran-att">
    <h1>📺 Les Chroniques de la Guilde</h1>
    <p class="code">Code de la salle<br><b>${L.code}</b></p>
    <p class="sc">📖 ${esc(titre || '…')}</p>
    <div class="eq">${(LOB.equipe || []).map(e => `<div><img src="${e.img}" onerror="this.onerror=null;this.src='${e.sec || 'portraits/maelle.webp'}'" alt="" style="box-shadow:0 0 0 4px ${e.c || '#7cd4ff'}"><b>${esc(e.nom)}</b><small>${esc(qui(e.owner))}</small></div>`).join('') || '<p class="vide">Les héros apparaîtront ici quand chacun aura choisi le sien.</p>'}</div>
    <p class="joueurs">👥 ${L.joueurs.map(j => `${j.id === LOB.hote ? '👑 ' : ''}${esc(j.nom)}`).join(' · ')}</p>
    <p class="att">⏳ L’hôte lance la partie depuis son téléphone…</p></div>`;
}
// les textes de l'histoire : affichés en grand, sans bouton, ils se ferment tout seuls (personne ne touche la télé)
function ecranDialogue(titre, lignes) {
  fenetre(`<h2>${titre}</h2>${lignes.map(l => `<div class="moust"><img src="ui/moustache.webp" alt=""><div class="lu">${l}</div></div>`).join('')}`, false);
  const n = ++ecranDialogue.n; setTimeout(() => { if (ecranDialogue.n === n && ECRAN) fenetre(''); }, Math.min(30000, 6000 + lignes.join(' ').length * 45));
}
ecranDialogue.n = 0;
// la carte remplit l'écran : on agrandit le plateau jusqu'à la place libre
function ecranZoom() {
  const V = $('vue'), P = V && V.querySelector('.plateau'); if (!P) return;
  P.style.zoom = ''; const w = P.offsetWidth, h = P.offsetHeight; if (!w || !h) return;
  const z = Math.max(.5, Math.min((V.clientWidth - 8) / w, (V.clientHeight - 8) / h, 4));
  P.style.zoom = z;
  const hv = suivi != null && S.heros[suivi] ? S.heros[suivi] : S.heros[actif], e = hv && $(`c-${hv.x}-${hv.y}`);
  if (e) { V.scrollLeft = e.offsetLeft * z - V.clientWidth / 2; V.scrollTop = e.offsetTop * z - V.clientHeight / 2; }
}

// ------------------------------------------------------------------------------------- les branchements (seulement en mode écran)
{
  const pas = nom => { const f = window[nom]; if (typeof f !== 'function') return; window[nom] = function () { if (ECRAN) return; return f.apply(this, arguments); }; };
  ['pousse', 'sauve', 'rangeEnLigne', 'touche', 'annonceTour', 'lobbyPousse', 'equipeEnLigne', 'choisitHeros', 'infoStat', 'grandeCarte'].forEach(pas);
  const _g = window.guideMode; if (typeof _g === 'function') window.guideMode = function () { if (ECRAN) return false; return _g.apply(this, arguments); };
  const _s = salleAttente; salleAttente = function () { if (ECRAN) return ecranAttente(); return _s.apply(this, arguments); };
  const _dl = dialogue; dialogue = function (t, l) { if (ECRAN) return ecranDialogue(t, l); return _dl.apply(this, arguments); };
  const _d = dessine; dessine = function () {
    if (ECRAN && S) { const c = tourDe(); if (c != null) actif = c; else { const n = S.heros.findIndex(z => !z.aTerre); if (n >= 0) actif = n; } }
    const r = _d.apply(this, arguments);
    if (ECRAN && S) { ecranBouton(); requestAnimationFrame(ecranZoom); }
    return r;
  };
  addEventListener('resize', () => { if (ECRAN && S) ecranZoom(); });
  // « Rejoindre avec un code » propose aussi l'écran de la table
  const _r = rejoindreForm; rejoindreForm = function () { const r = _r.apply(this, arguments);
    const b = document.querySelector('#fen .go'); if (b && !document.getElementById('vers-ecran')) b.insertAdjacentHTML('afterend', `<button class="sec" id="vers-ecran" onclick="const c=($('fCode').value||'').toUpperCase();c.length>=4?ecranDemarre(c):ecranForm()">📺 Cet écran est l’écran de la table<small style="display:block;font-size:.8em;opacity:.8">Il montre la partie en grand, chacun joue sur son téléphone</small></button>`);
    return r; };
  // la salle d'attente de l'hôte rappelle qu'un grand écran peut suivre la partie
  const _s2 = salleAttente; salleAttente = function () { const r = _s2.apply(this, arguments);
    // 22/11 (l'utilisateur : « le lien ne s'affiche jamais sur le téléphone ») : un encadré bien visible, juste sous le code, avec le lien
    // complet (code compris) à ouvrir sur la télé, et un bouton pour l'envoyer (partage du téléphone, sinon copie)
    if (!ECRAN && L && LOB && L.code) { const lien = location.origin + location.pathname.replace(/[^/]*$/, '') + 'chroniques.html?ecran=' + L.code;
      const ici = document.getElementById('astuce-ecran'), html = `<div id="astuce-ecran" style="margin:2cqw 0;padding:2.5cqw;border-radius:3cqw;border:2px solid #7cd4ff;background:#14223a;text-align:center">
        <b style="color:#7cd4ff">📺 La partie sur une télé ou un ordinateur</b><br><span style="font-size:.85em;color:var(--doux)">Ouvre ce lien dans son navigateur :</span>
        <div style="margin:1.5cqw 0;font:bold .95em monospace;color:var(--texte);word-break:break-all;user-select:all">${lien}</div>
        <button class="sec" style="margin:0" onclick="(navigator.share ? navigator.share({ title:'Les Chroniques sur grand écran', url:'${lien}' }) : navigator.clipboard.writeText('${lien}').then(() => bulle('Lien copié ✓'))).catch(() => {})">📤 Envoyer le lien</button></div>`;
      if (ici) ici.outerHTML = html; else { const s = document.querySelector('.acc .sous') || document.querySelector('.acc h1'); if (s) s.insertAdjacentHTML('afterend', html); } }
    return r; };
}
// la fenêtre « Rejoindre » ouverte au démarrage (portail « Rejoindre avec un code ») est arrivée avant ce fichier : on lui ajoute le bouton de l'écran
if (document.getElementById('fCode') && !document.getElementById('vers-ecran')) { const b = document.querySelector('#fen .go'); if (b) b.insertAdjacentHTML('afterend', `<button class="sec" id="vers-ecran" onclick="const c=($('fCode').value||'').toUpperCase();c.length>=4?ecranDemarre(c):ecranForm()">📺 Cet écran est l’écran de la table<small style="display:block;font-size:.8em;opacity:.8">Il montre la partie en grand, chacun joue sur son téléphone</small></button>`); }
{ const q = new URLSearchParams(location.search).get('ecran'); if (q) { if (/^[A-Za-z]{4}$/.test(q)) ecranDemarre(q); else ecranForm(); } }

if (typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.textContent = `
  body.ecran-table #app { max-width:none; container-type:normal; }
  body.ecran-table.jeu #app { height:100dvh; padding:1vh 1.2vw; box-sizing:border-box; font-size:clamp(14px, 1.5vw, 26px);
    display:grid !important; grid-template-columns:minmax(0, 1fr) clamp(220px, 24vw, 460px); grid-template-rows:auto auto minmax(0, 1fr) auto; column-gap:1.2vw; align-content:stretch; }
  body.ecran-table.jeu #app > * { grid-column:2; min-width:0; }
  body.ecran-table #app > .haut { grid-column:1 / -1; grid-row:1; }
  body.ecran-table #app > .zonebar { grid-column:1; grid-row:2; }
  body.ecran-table #app > div[style*="position:relative"] { grid-column:1; grid-row:3 / span 2; min-height:0; display:flex; flex-direction:column; }
  body.ecran-table .vue { height:auto !important; flex:1; min-height:0; overflow:hidden; }
  body.ecran-table #app > .des, body.ecran-table #app > .actions, body.ecran-table #app > .pasinfo, body.ecran-table .haut a, body.ecran-table .zonebar button, body.ecran-table #gm-bouton { display:none !important; }
  body.ecran-table #app { pointer-events:none; } body.ecran-table #fen { pointer-events:none; }
  body.ecran-table .haut { font-size:clamp(14px, 1.6vw, 28px); padding:.6vh 0; gap:.8vw; } body.ecran-table .haut button { padding:.3vh .8vw; }
  body.ecran-table .haut button[onclick*="regles"], body.ecran-table .haut button[onclick*="voirJournal"], body.ecran-table .haut button[onclick*="parametres"], body.ecran-table .haut button[onclick*="voirQuetes"] { display:none; }
  body.ecran-table .zonebar { font-size:clamp(14px, 1.6vw, 28px); }
  body.ecran-table .equipe { flex-direction:column; gap:.8vh; margin:0; overflow:hidden; }
  body.ecran-table .equipe button { flex:none; width:100%; font-size:clamp(13px, 1.25vw, 22px); border-radius:12px; padding:.6vh .6vw; display:grid; grid-template-columns:auto 1fr; column-gap:.8vw; align-items:center; text-align:left; }
  body.ecran-table .equipe img { width:clamp(44px, 5vw, 96px); height:clamp(44px, 5vw, 96px); margin:0; grid-row:1 / span 4; }
  body.ecran-table .equipe .jg { height:.8vh; margin:.4vh 0 0; border-radius:6px; }
  body.ecran-table .tourbar { font-size:1em; }
  #ecran-quitte { position:fixed; right:10px; bottom:10px; z-index:3000; font:13px Georgia, serif; padding:6px 10px; border-radius:10px; border:1px solid #45457a; background:#14122acc; color:#b9b1e0; opacity:.45; }
  #ecran-quitte:hover { opacity:1; }
  .ecran-att { min-height:100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2vh; text-align:center; font-family:Georgia, serif; color:var(--texte); }
  .ecran-att h1 { color:var(--or); font-size:clamp(28px, 4vw, 64px); margin:0; } .ecran-att .code { font-size:clamp(18px, 2vw, 32px); color:var(--doux); margin:0; }
  .ecran-att .code b { display:block; font-size:clamp(60px, 10vw, 180px); letter-spacing:.2em; color:var(--or); text-shadow:0 0 30px #f3c96b66; }
  .ecran-att .sc { font-size:clamp(18px, 2.2vw, 36px); margin:0; }
  .ecran-att .eq { display:flex; gap:3vw; flex-wrap:wrap; justify-content:center; } .ecran-att .eq div { display:flex; flex-direction:column; align-items:center; gap:.5vh; font-size:clamp(14px, 1.6vw, 28px); }
  .ecran-att .eq img { width:clamp(80px, 11vw, 200px); height:clamp(80px, 11vw, 200px); border-radius:50%; object-fit:cover; } .ecran-att .eq small { color:var(--doux); }
  .ecran-att .joueurs, .ecran-att .vide { color:var(--doux); font-size:clamp(14px, 1.6vw, 26px); } .ecran-att .att { color:var(--or); animation:ecranPulse 2s ease-in-out infinite; font-size:clamp(16px, 1.8vw, 30px); }
  @keyframes ecranPulse { 50% { opacity:.4; } }
  body.ecran-table #fen .moust .lu { font-size:clamp(16px, 1.8vw, 30px); } body.ecran-table #fen h2 { font-size:clamp(22px, 2.6vw, 44px); }`;
  document.head.appendChild(st);
}

// ------------------------------------------------------------------------------------- LE TÉLÉPHONE QUAND LA CARTE EST SUR LA TÉLÉ (22/11)
// Validé : « téléphone = télécommande : mes héros en gros + une icône pour la fiche des monstres d'en face, étiquettes expliquées ».
// 1) le bouton 👹 en haut (toujours, en ligne ou pas) : les monstres qu'on voit, ceux de la salle regardée d'abord, avec ce qu'ils vont faire ;
//    toucher un monstre ouvre sa fiche complète (sceaux, intention, explications) ;
// 2) le MODE TÉLÉCOMMANDE (bouton 📺 dans la fenêtre 🌐 de la salle) : la carte devient petite (elle sert encore à se déplacer),
//    seuls MES héros restent dans la barre, en gros. Retenu sur le téléphone.
const ECR_IT = { frappe:m => `⚔ va frapper (${m.att})`, garde:() => '🛡 va refermer un sceau', soin:() => '💚 va soigner un monstre', fuit:() => '🏃 va s’enfuir', remonte:() => '⏳ reprend son souffle',
  levier:() => '🎚 va remonter un levier', elan:() => '⚡ prend son élan', charge:m => `⚡ CHARGE : ${m.att + 2} au début de votre tour`, gros:m => `💥 gros coup de ${m.att + 2}`, rien:() => 'ne fait rien' };
function monstresEnFace() {
  if (!S || !S.R) return [];
  const R = S.R, tous = R.monstres.concat(R.boss ? [R.boss] : []).filter(m => R.vu[K.cle(m.x, m.y)] && !m.mort);
  const z = typeof zoneVue !== 'undefined' ? zoneVue : null;
  const ici = z ? tous.filter(m => zoneDe(R, m.x, m.y) === z) : [];
  return ici.length ? ici : tous;
}
function ficheMonstres() {
  const L2 = monstresEnFace();
  fenetre(`<h2>👹 Les monstres d’en face</h2>${L2.length ? `<p style="text-align:center;color:var(--doux);font-size:.9em;margin:0 0 .6em">Touche un monstre pour sa fiche complète : ses sceaux et ce qu’ils demandent.</p>` : '<p style="text-align:center;color:var(--doux)">Aucun monstre en vue.</p>'}
    <div class="fm-liste">${L2.map(m => { const i = R_IDX(m), reste = (m.sceaux || []).filter(s => !s.ok).length, f = ECR_IT[m.it];
      return `<button onclick="infoMonstre(${i})"><img src="portraits/m-${m.img}.webp" alt="" onerror="this.onerror=null;this.src='portraits/m-gobelin.webp'"><span><b>${esc(m.n)}</b><small>${f ? f(m) : ''}</small></span><span class="sx">🔒 ${reste}</span></button>`; }).join('')}</div>
    <button class="go" onclick="fenetre('')">Fermer</button>`);
}
// infoMonstre reçoit un objet ; depuis la liste, on passe par un numéro (le boss = -1)
const R_IDX = m => m === S.R.boss ? -1 : S.R.monstres.indexOf(m);
{ const _i = infoMonstre; infoMonstre = function (m) { if (typeof m === 'number') m = m < 0 ? S.R.boss : S.R.monstres[m]; return m ? _i.call(this, m) : undefined; }; }
let TELECO = (() => { try { return localStorage.getItem('guilde-chron-teleco') === '1'; } catch (e) { return false; } })();
function teleco(on) { TELECO = on; try { localStorage.setItem('guilde-chron-teleco', on ? '1' : '0'); } catch (e) {} fenetre(''); centrer = true; dessine();
  bulle(on ? '📺 Mode télécommande : la grande carte est sur la télé, tes héros sont en gros ici.' : '📱 Retour à l’écran complet.'); }
{
  const _d = dessine; dessine = function () { const r = _d.apply(this, arguments);
    if (!ECRAN && S && document.body.classList.contains('jeu')) {
      const n = monstresEnFace().length, h = document.querySelector('#app .haut');
      if (h && !h.querySelector('.b-monstres')) { const b = document.createElement('button'); b.className = 'b-monstres'; b.title = 'Les monstres d’en face'; b.innerHTML = `👹${n ? ` <b>${n}</b>` : ''}`; b.onclick = ficheMonstres; const ref = h.querySelector('.hsab'); ref ? h.insertBefore(b, ref) : h.appendChild(b); }
      const tc = !!(TELECO && L); document.body.classList.toggle('telecommande', tc);
      if (tc) document.querySelectorAll('#app .equipe > button').forEach(b => { const i = +((b.getAttribute('onclick') || '').match(/choisitHeros\((\d+)\)/) || [])[1]; if (!mesHeros().includes(i)) b.style.display = 'none'; });
    } else document.body.classList.remove('telecommande');
    return r; };
  const _e = equipeEnLigne; equipeEnLigne = function () { const r = _e.apply(this, arguments);
    const g = document.querySelector('#fen .go'); if (!ECRAN && g && !document.getElementById('b-teleco')) g.insertAdjacentHTML('beforebegin', `<button class="sec" id="b-teleco" onclick="teleco(${!TELECO})">${TELECO ? '📱 Revenir à l’écran complet' : '📺 Mode télécommande'}<small style="display:block;font-size:.8em;opacity:.8">${TELECO ? 'La carte redevient grande sur ce téléphone' : 'La grande carte est sur la télé (écran de la table) : ici, tes héros en gros'}</small></button>`);
    return r; };
  const st = document.createElement('style');
  st.textContent = `
  .fm-liste { display:flex; flex-direction:column; gap:8px; margin-bottom:10px; }
  .fm-liste button { display:flex; align-items:center; gap:10px; text-align:left; padding:8px 10px; border-radius:12px; border:1px solid #6a2a2a; background:#2a1414; color:var(--texte); font:1em Georgia, serif; }
  .fm-liste img { width:52px; height:52px; border-radius:50%; object-fit:cover; box-shadow:0 0 0 2px #ff7a4a; } .fm-liste span { flex:1; display:flex; flex-direction:column; } .fm-liste small { color:var(--doux); font-size:.85em; }
  .fm-liste .sx { flex:none; color:#ffb0b0; font-weight:bold; }
  .haut .b-monstres b { color:#ff9f8a; }
  body.telecommande .vue { height:34vh !important; flex:none !important; } body.telecommande #app > div[style*="position:relative"] { flex:none !important; }
  body.telecommande .equipe { flex-wrap:wrap; } body.telecommande .equipe > button { font-size:4.2cqw; padding:2cqw 1cqw; } body.telecommande .equipe img { width:24cqw; height:24cqw; }
  body.telecommande .des { min-height:16cqw; } body.telecommande .des .de, body.telecommande .des button { transform:scale(1.15); }`;
  document.head.appendChild(st);
}
// 22/11 (testeurs + choix de l'utilisateur E1) : le bouton de l'écran de la table en haut de l'accueil des Chroniques, plus tout en bas
{ const _a = accueil; accueil = function () { const r = _a.apply(this, arguments);
    if (!ECRAN && !S && !LOB) { const s = document.querySelector('#app .acc .sous') || document.querySelector('#app .acc h1'); if (s && !document.getElementById('acc-ecran'))
      s.insertAdjacentHTML('afterend', `<button id="acc-ecran" class="gros" style="background:#14223a;border-color:#7cd4ff;color:#7cd4ff;margin:2cqw 0" onclick="ecranForm()">📺 Montrer la partie sur une télé<small>Cet écran (télé, ordinateur) affiche la partie d’une salle en grand ; chacun joue sur son téléphone.</small></button>`); }
    return r; }; }
if (!S && !ECRAN && document.querySelector('#app .acc')) accueil();
