// =============================================================================================== LES AMIS (15/11 ~17 h 40)
// Demande de l'utilisateur : « une fenêtre Amis dans le menu, voir les amis connectés, comme un lobby ».
// Pas de compte : une CARTE DE JOUEUR gardée sur le téléphone (code ami public de 6 lettres + clé secrète), créée avec un pseudo.
// Le téléphone se signale toutes les 20 s (et dit dans quelle salle des Chroniques il est) ; « en ligne » = vu il y a moins d'une minute.
// On ajoute un ami par son code (il accepte), on voit qui est en ligne et dans quelle salle, on l'invite dans la sienne d'un toucher.
// Serveur : /api/hub/guilde/joueur (labo perso seulement). Sans serveur (fichier ouvert en local), le bouton dit simplement « hors ligne ».
const AMIS = { carte:null, etat:null, ouvert:false, vu:{}, erreur:false };
const AMIS_API = '/api/hub/guilde/joueur';
(function () {
  try { AMIS.carte = JSON.parse(localStorage.getItem('guilde-carte') || 'null'); } catch (e) {}
  try { AMIS.vu = JSON.parse(sessionStorage.getItem('guilde-invit-vues') || '{}'); } catch (e) {}
  const css = `
  #amis-bouton { position:fixed; left:56px; top:calc(10px + env(safe-area-inset-top)); z-index:900; height:38px; min-width:38px; padding:0 10px; border-radius:19px; border:1px solid #7cd4ff88; background:#15132bcc; color:#7cd4ff; font:bold 15px Georgia, serif; cursor:pointer; }
  #amis-bouton .pt { display:inline-block; min-width:18px; height:18px; line-height:18px; border-radius:9px; background:#7dffb0; color:#0a2a14; font-size:11px; margin-left:4px; padding:0 4px; }
  #amis-bouton .pt.rouge { background:#ff5a5a; color:#fff; }
  #boite-bouton { position:fixed; left:10px; top:calc(54px + env(safe-area-inset-top)); z-index:900; height:38px; min-width:38px; padding:0 8px; border-radius:19px; border:1px solid #f3c96b88; background:#15132bcc; color:#f3c96b; font:bold 17px Georgia, serif; cursor:pointer; }
  #boite-bouton .pt.or { display:inline-block; min-width:18px; height:18px; line-height:18px; border-radius:9px; background:#f3c96b; color:#2b1d0a; font-size:11px; margin-left:3px; padding:0 4px; box-shadow:0 0 8px #f3c96b; }
  .am-voile { position:fixed; inset:0; background:#000c; z-index:5000; display:flex; align-items:center; justify-content:center; padding:4vw; }
  /* 17/11 : le décor derrière la fenêtre ne défile plus : règle commune dans musique.js (html.fen-ouverte) */
  .am-x { position:sticky; top:0; float:right; margin:-6px -6px 0 0; width:38px; height:38px; border-radius:50%; border:1px solid #45457a; background:#221d42; color:#f1ecff; font:bold 18px Georgia, serif; cursor:pointer; z-index:2; }
  .am-fen { width:min(94vw, 460px); max-height:88vh; max-height:85dvh; overflow:auto; touch-action:pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; background:#1c1838; border:2px solid #7cd4ff; border-radius:18px; padding:16px; color:#f1ecff; font:15px/1.45 Georgia, serif; }
  .am-fen h2 { margin:0 0 6px; text-align:center; color:#7cd4ff; font-size:1.2em; } .am-fen h3 { color:#f3c96b; font-size:1em; margin:14px 0 6px; }
  .am-fen .doux { color:#c9c1ea; font-size:.9em; }
  .am-code { text-align:center; font-size:1.8em; letter-spacing:.2em; color:#f3c96b; font-weight:bold; margin:4px 0; }
  .am-fen input { width:100%; font:16px Georgia, serif; padding:9px 12px; border-radius:12px; border:2px solid #45457a; background:#14122a; color:#f1ecff; }
  .am-fen input.code { text-transform:uppercase; letter-spacing:.2em; text-align:center; font-weight:bold; }
  .am-bt { font:bold .92em Georgia, serif; padding:10px 14px; min-height:44px; border-radius:12px; border:1px solid #45457a; background:#221d42; color:#f1ecff; cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:#7cd4ff55; }
  .am-bt.go { background:#7cd4ff; color:#0a1a2a; border:0; } .am-bt.or { background:#f3c96b; color:#2b1d0a; border:0; } .am-bt.large { display:block; width:100%; margin-top:8px; padding:11px; }
  .am-ligne { display:flex; align-items:center; gap:8px; padding:8px; border:1px solid #2e2a55; border-radius:12px; margin:6px 0; background:#14122a; }
  .am-coeurs { display:flex; align-items:center; gap:10px; padding:10px; border:1px solid #ff7aa055; border-radius:12px; background:#2a1430; margin:6px 0; } .am-coeurs > div { flex:1; }
  .am-jauge { height:7px; border-radius:4px; background:#0d0b18; margin-top:5px; overflow:hidden; } .am-jauge i { display:block; height:100%; background:linear-gradient(90deg, #ff5a8a, #ffb0c8); }
  .am-coeur { flex:none; width:44px; height:44px; border-radius:50%; border:1px solid #ff7aa088; background:#3a1630; color:#ff5a8a; font-size:20px; cursor:pointer; padding:0; } .am-coeur.fait { display:grid; place-items:center; opacity:.6; border-color:transparent; background:none; }
  .am-ligne .p { flex:1; } .am-ligne small { display:block; color:#c9c1ea; }
  .am-pt { width:11px; height:11px; border-radius:50%; background:#5a5680; flex:none; } .am-pt.on { background:#7dffb0; box-shadow:0 0 8px #7dffb0; }
  .am-invit { position:fixed; left:50%; transform:translateX(-50%); top:calc(60px + env(safe-area-inset-top)); z-index:4990; width:min(92vw, 420px); background:#14223a; border:2px solid #7cd4ff; border-radius:16px; padding:10px 12px; color:#f1ecff; font:15px Georgia, serif; box-shadow:0 8px 30px #000a; animation:amIn .4s; }
  .am-msg { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(24px + env(safe-area-inset-bottom)); z-index:6000; max-width:90vw; background:#000e; color:#f3c96b; font:bold 15px Georgia, serif; padding:10px 16px; border-radius:14px; text-align:center; }
  #am-info { color:#ff9a7a; font-size:.9em; min-height:1.2em; margin:6px 0 0; text-align:center; }
  .am-invit b { color:#7cd4ff; } .am-invit .bts { display:flex; gap:8px; margin-top:8px; } .am-invit .bts button { flex:1; }
  @keyframes amIn { from { transform:translate(-50%, -20px); opacity:0; } }`;
  if (typeof document !== 'undefined') document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
})();
async function amisApi(url, corps) {
  const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(corps) });
  let d = {}; try { d = await r.json(); } catch (e) {} return { statut:r.status, d };
}
const amisSalle = () => window.SALLE_ACTIVE || ((typeof L !== 'undefined' && L && L.code) ? L.code : '');
const amisEsc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
// 15/11 (accord de l'utilisateur) : MA CARTE DE PROFIL, vue par mes amis (profil.js doit être chargé ; sinon rien n'est envoyé)
// 15/11 soir : la crypte du jour (score et étoiles), pour la comparer entre amis
amisCrypteJour.aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function amisCrypteJour() { try { const d = new Date(), j = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, x = (JSON.parse(localStorage.getItem('guilde-crypte') || '{}').jours || {})[j]; return x ? { d:j, s:x.score | 0, e:x.etoiles | 0 } : null; } catch (e) { return null; } }
function amisMonProfil() {
  if (typeof lireProfil !== 'function') return null;
  try {
    const p = lireProfil(), m = x => x ? { t:`${x[1]} ${x[2]}`, c:x[5] } : null;
    let portrait = p.portrait || '';
    if (portrait.startsWith('av:')) { const a = typeof avTrouve === 'function' ? avTrouve(portrait.slice(3)) : null; portrait = a ? `av-${a.voie}-${a.genre}` : ''; }
    if (!portrait) { try { const l = JSON.parse(localStorage.getItem('guilde-parties') || '[]'); portrait = (l.length && l[l.length - 1].moi) || ''; } catch (e) {} }
    const em = typeof EMBLEMES !== 'undefined' ? (EMBLEMES.find(x => x[0] === p.embleme) || [])[1] : '';
    let puissance = 0; if (typeof puissanceHeros === 'function') ['maelle', 'aldric', 'pip', 'oria', 'gorm', 'zephine'].forEach(id => { puissance = Math.max(puissance, puissanceHeros(id)); });
    return { portrait, fond:p.fond, couleur:p.couleur, embleme:em && em !== '—' ? em : '', cadre:p.cadre !== 'aucun' ? m(titreDe(p.cadre)) : null, titre:p.titre ? m(titreDe(p.titre)) : null,
      devise:p.devise || '', vitrine:(p.vitrine || []).map(k => m(titreDe(k))).filter(Boolean), rang:typeof rangGuilde === 'function' ? rangGuilde() : 0, puissance, crypte:amisCrypteJour() };
  } catch (e) { return null; }
}
async function amisAgir(action, plus) {
  if (!AMIS.carte) return null;
  let envoiProfil = null;
  if (action === 'signal') { const pr = amisMonProfil(), j = pr && JSON.stringify(pr); if (j && j !== localStorage.getItem('guilde-profil-envoye')) { envoiProfil = j; plus = Object.assign({ profil:pr }, plus || {}); } }
  try {
    const { statut, d } = await amisApi(AMIS_API + '/moi', Object.assign({ cle:AMIS.carte.cle, action, salle:amisSalle() }, plus || {}));
    if (statut === 401) { AMIS.carte = null; try { localStorage.removeItem('guilde-carte'); } catch (e) {} AMIS.etat = null; amisBouton(); return null; }
    if (statut !== 200) { amisMsg(d.message || 'Le serveur ne répond pas.'); return null; }
    if (envoiProfil) try { localStorage.setItem('guilde-profil-envoye', envoiProfil); } catch (e) {}
    AMIS.etat = d; AMIS.erreur = false; amisBouton(); amisInvitations(); return d;
  } catch (e) { AMIS.erreur = true; amisBouton(); return null; }
}
// 15/11 (l'utilisateur : « créer ma carte ne fonctionne pas ») : les messages s'affichaient DERRIÈRE la fenêtre des amis ; maintenant un bandeau au-dessus de tout
function amisMsg(t) { const d = document.createElement('div'); d.className = 'am-msg'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3500);
  const z = document.getElementById('am-info'); if (z) z.textContent = t; }
// le bouton 👥 en haut (à côté du 👤 du profil)
function amisBouton() {
  if (typeof document === 'undefined' || !document.body) return;
  if (window.AMIS_SANS_BOUTON) { if (typeof window.amisPastille === 'function') { const E = AMIS.etat; window.amisPastille(E ? E.amis.filter(a => a.enLigne).length : 0, E ? E.demandes.length : 0); } amisBoiteBouton(); return; }
  let b = document.getElementById('amis-bouton'); if (!b) { b = document.createElement('button'); b.id = 'amis-bouton'; b.onclick = amisFenetre; b.setAttribute('aria-label', 'Mes amis'); document.body.appendChild(b); }
  const E = AMIS.etat, n = E ? E.amis.filter(a => a.enLigne).length : 0, dem = E ? E.demandes.length : 0;
  b.innerHTML = `👥${dem ? `<span class="pt rouge">${dem}</span>` : n ? `<span class="pt">${n}</span>` : ''}`;
  b.title = !AMIS.carte ? 'Mes amis' : `${n} ami${n > 1 ? 's' : ''} en ligne`;
  amisBoiteBouton();
}
// 17/11 (l'utilisateur : « la boîte devrait être une icône, pas cachée dans mes amis ; un cadeau = une pastille d'une autre couleur ») :
// l'icône 📬, sous le 👤 ; dans le menu toujours, ailleurs seulement quand un cadeau attend ; pastille DORÉE
function amisBoiteBouton() {
  if (typeof document === 'undefined' || !document.body) return;
  // 19/11 (l'utilisateur : « le 📬 s'affiche par-dessus le plateau en plein combat ») : l'icône flottante n'existe plus que dans le menu ;
  // ailleurs (Duel, Chroniques, Crypte…), un cadeau qui arrive est annoncé par un petit bandeau, une seule fois
  const n = (AMIS.boite || []).length, menu = /menu\.html$|\/guilde\/?$/.test(location.pathname), voir = !!AMIS.carte && menu;
  if (!menu) { let vu = 0; try { vu = +sessionStorage.getItem('guilde-boite-annoncee') || 0; } catch (e) {}
    if (n > vu) amisMsg(`📬 ${n > 1 ? n + ' cadeaux t’attendent' : 'Un cadeau t’attend'} dans la boîte aux lettres du menu.`);
    try { sessionStorage.setItem('guilde-boite-annoncee', String(n)); } catch (e) {} }
  if (typeof window.boitePastille === 'function') window.boitePastille(n); // 17/11 : la barre du bas du menu
  let b = document.getElementById('boite-bouton');
  if (!voir) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('button'); b.id = 'boite-bouton'; b.onclick = amisBoite; b.setAttribute('aria-label', 'Boîte aux lettres'); document.body.appendChild(b); }
  b.innerHTML = `📬${n ? `<span class="pt or">${n}</span>` : ''}`; b.title = n ? `${n} cadeau${n > 1 ? 'x' : ''} à récupérer` : 'Boîte aux lettres';
}
// les invitations reçues : un bandeau en haut de l'écran
function amisInvitations() {
  const E = AMIS.etat; if (!E || !E.invitations.length) return;
  const i = E.invitations.filter(x => !AMIS.vu[x.salle + x.quand] && x.salle !== amisSalle()).slice(-1)[0]; if (!i) return;
  AMIS.vu[i.salle + i.quand] = 1; try { sessionStorage.setItem('guilde-invit-vues', JSON.stringify(AMIS.vu)); } catch (e) {}
  const d = document.createElement('div'); d.className = 'am-invit';
  d.innerHTML = `🎲 <b>${amisEsc(i.pseudo)}</b> t’invite dans sa salle des Chroniques <b>${amisEsc(i.salle)}</b> !<div class="bts"><button class="am-bt go" onclick="amisRejoindre('${amisEsc(i.salle)}')">▶ Rejoindre</button><button class="am-bt" onclick="this.closest('.am-invit').remove();amisAgir('oublie',{salle:'${amisEsc(i.salle)}'})">Plus tard</button></div>`;
  document.body.appendChild(d); try { if (typeof GM !== 'undefined') GM.son('portail'); } catch (e) {}
  setTimeout(() => d.remove(), 30000);
}
async function amisRejoindre(salle) {
  amisAgir('oublie', { salle });
  // 15/11 : une salle de DUEL ou des CHRONIQUES ? on demande au serveur
  let mode = 'chroniques'; try { const r = await fetch('/api/hub/guilde/partie/' + encodeURIComponent(salle)); const d = await r.json(); if (d && d.mode) mode = d.mode; } catch (e) {}
  if (mode === 'duel') { if (location.pathname.endsWith('duel.html') && typeof dlRejoindre === 'function') { document.querySelectorAll('.am-invit').forEach(x => x.remove()); amisFermer(); dlRejoindre(salle, { id:'j' + Math.random().toString(36).slice(2, 10), nom:AMIS.carte.pseudo }); } else location.href = 'duel.html?salle=' + encodeURIComponent(salle); return; }
  if (location.pathname.endsWith('chroniques.html') && typeof rejoindre === 'function') { document.querySelectorAll('.am-invit').forEach(x => x.remove()); amisFermer(); rejoindre(salle, { id:'j' + Math.random().toString(36).slice(2, 10), nom:AMIS.carte.pseudo }); }
  else location.href = 'chroniques.html?salle=' + encodeURIComponent(salle);
}
// la fenêtre des amis
function amisFermer() { AMIS.ouvert = false; amisDernierHTML = null; const f = document.getElementById('amis-fen'); if (f) f.innerHTML = ''; }
// 17/11 (un ami sur iPhone : « Accepter » ne répond pas) : la fenêtre était REDESSINÉE toutes les 20 s même sans changement ; sur iPhone,
// un toucher pendant ce redessin est perdu. On ne redessine plus si rien n'a changé, ni pendant (et juste après) un toucher.
let amisDernierHTML = null, amisToucheA = 0;
document.addEventListener('touchstart', e => { if (e.target && e.target.closest && e.target.closest('#amis-fen')) amisToucheA = Date.now(); }, { passive:true, capture:true });
let amisAttente = null, AMIS_RAFRAICHI = false;
function amisFen(h) { let f = document.getElementById('amis-fen'); if (!f) { f = document.createElement('div'); f.id = 'amis-fen'; document.body.appendChild(f); }
  if (h && h === amisDernierHTML && f.innerHTML) return;
  if (AMIS_RAFRAICHI && h && f.innerHTML && Date.now() - amisToucheA < 1500) { // rafraîchissement automatique pendant un toucher : plus tard
    const premier = amisAttente === null; amisAttente = h;
    if (premier) setTimeout(() => { const x = amisAttente; amisAttente = null; if (x && AMIS.ouvert) amisFen(x); }, 1600); return; }
  amisAttente = null;
  amisDernierHTML = h || null;
  f.innerHTML = h ? `<div class="am-voile" onclick="if(event.target===this)amisFermer()"><div class="am-fen"><button class="am-x" onclick="amisFermer()" aria-label="Fermer">✕</button>${h}</div></div>` : ''; } // 17/11 : une croix en haut à droite au lieu d'un « Fermer » tout en bas
// la carte de profil d'un ami (les décors viennent de profil.js s'il est chargé, sinon un fond simple)
const amisPortrait = k => { if (!k) return ['portraits/gorm.webp', 'portraits/gorm.webp']; const m = /^av-([a-z]+)-[hf]$/.exec(k); return [`portraits/${k}.webp`, `portraits/${m ? m[1] : 'gorm'}.webp`]; };
function amisCarteHTML(a) {
  const P = a.profil || {}, [src, sec] = amisPortrait(P.portrait), fond = typeof FONDS !== 'undefined' && FONDS[P.fond] ? FONDS[P.fond][1] : 'radial-gradient(ellipse at 50% 0%, #3a2a5c, #120f24 75%)';
  const coul = typeof COULEURS_NOM !== 'undefined' ? (COULEURS_NOM.find(x => x[0] === P.couleur) || [0, '#f1ecff'])[1] : '#f1ecff';
  const nomSt = String(coul).startsWith('linear') ? `background:${coul};-webkit-background-clip:text;background-clip:text;color:transparent` : `color:${coul}`;
  const cc = P.cadre && P.cadre.c ? P.cadre.c : '#4b4580';
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;background:${fond};border:2px solid ${cc};border-radius:16px;padding:16px 10px 12px;margin:8px 0">
    <div style="position:relative;width:96px;height:96px"><img src="${src}" onerror="this.onerror=null;this.src='${sec}'" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px ${cc}, 0 0 20px ${cc}">
      ${P.embleme ? `<span style="position:absolute;left:-4px;top:-4px;font-size:24px">${amisEsc(P.embleme)}</span>` : ''}${P.rang ? (typeof emblemeRang === 'function' ? `<span style="position:absolute;right:-12px;bottom:-8px">${emblemeRang(P.rang | 0, 38)}</span>` : `<span style="position:absolute;right:-14px;bottom:-4px;white-space:nowrap;background:#f3c96b;color:#2b1d0a;font-weight:bold;font-size:.8em;border-radius:12px;padding:1px 7px" title="Rang de la Guilde">RG ${P.rang | 0}</span>`) : ''}</div>
    <div style="font-size:1.2em;font-weight:bold;text-shadow:0 1px 3px #000;${nomSt}">${amisEsc(a.pseudo)}</div>
    ${P.titre ? `<div style="color:${P.titre.c || '#f3c96b'};font-size:.9em;text-shadow:0 1px 3px #000">${amisEsc(P.titre.t)}</div>` : ''}
    ${P.devise ? `<div style="font-style:italic;font-size:.88em;color:#e8e2ff;text-shadow:0 1px 3px #000">« ${amisEsc(P.devise)} »</div>` : ''}
    ${(P.vitrine || []).length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center">${P.vitrine.map(v => `<span style="border:1.5px solid ${v.c || '#f3c96b'};border-radius:14px;padding:2px 8px;font-size:.75em;background:#0008">${amisEsc(v.t)}</span>`).join('')}</div>` : ''}
    ${P.puissance ? `<div style="color:#f3c96b;font-weight:bold;font-size:.9em">✊ ${P.puissance | 0} (son meilleur héros)</div>` : ''}
    ${P.crypte && amisCrypteJour.aujourdhui() === P.crypte.d ? `<div style="font-size:.85em;color:#e8e2ff">🪦 Crypte du jour : <b style="color:#f3c96b">${P.crypte.s | 0}</b> ${'★'.repeat(P.crypte.e | 0)}</div>` : ''}
  </div>`;
}
function amisVoir(code) {
  const a = AMIS.etat && AMIS.etat.amis.find(x => x.code === code); if (!a) return; AMIS.ouvert = false;
  amisFen(`<h2>👤 ${amisEsc(a.pseudo)}</h2>${a.profil ? amisCarteHTML(a) : `<p class="doux" style="text-align:center">${amisEsc(a.pseudo)} n’a pas encore de carte de profil (elle arrive quand il ouvre le menu de la Guilde).</p>`}
    <p class="doux" style="text-align:center">${a.enLigne ? (a.salle ? `🎲 dans la salle ${amisEsc(a.salle)}` : '🟢 en ligne') : amisVuTxt(a.vu)}</p>
    ${a.enLigne && a.salle && a.salle !== amisSalle() ? `<button class="am-bt go large" onclick="amisRejoindre('${amisEsc(a.salle)}')">▶ Rejoindre sa salle</button>` : ''}
    ${a.enLigne && amisSalle() && a.salle !== amisSalle() ? `<button class="am-bt or large" onclick="amisInvite('${a.code}')">🎲 L’inviter dans ma salle</button>` : ''}
    ${!amisSalle() ? `<button class="am-bt go large" onclick="amisCreePour('${a.code}', 'chron')">🎲 Créer un salon et l’inviter</button><p class="doux" style="text-align:center">Dans le salon, tu choisis le jeu : les Chroniques ou un Duel.</p>${a.enLigne ? '' : '<p class="doux" style="text-align:center">Il n’est pas en ligne : il verra l’invitation à sa prochaine visite… s’il arrive avant qu’elle expire. Mieux vaut le prévenir.</p>'}` : ''}
    <button class="am-bt large" onclick="AMIS.ouvert=true;amisDessine()">‹ Mes amis</button>`);
}
// 28/11 (l'utilisateur : « j'aimerais inviter mon ami mais je n'arrive plus à créer un salon ») : depuis la fiche d'un ami, créer la salle
// (Duel ou Chroniques) PUIS l'inviter tout seul dès que la salle existe
function amisCreePour(code, jeu) { try { sessionStorage.setItem('amis-inviter', JSON.stringify({ code, t:Date.now() })); } catch (e) {}
  location.href = jeu === 'duel' ? 'duel.html?ami=1' : 'chroniques.html?ligne=1'; }
(function () { let x; try { x = JSON.parse(sessionStorage.getItem('amis-inviter') || 'null'); } catch (e) {} if (!x || Date.now() - x.t > 120000) return;
  // 28/11 (l'utilisateur : « l'invitation n'arrive jamais ») : attendre la salle ET la carte d'ami, se signaler dans la salle d'abord, puis inviter (3 essais)
  let n = 0, essais = 0, enCours = false; const tic = setInterval(async () => { if (++n > 120) { clearInterval(tic); amisMsg('L’invitation n’est pas partie : invite ton ami depuis la salle (👥 Inviter des amis).'); return; }
    if (enCours || !amisSalle() || !AMIS.carte) return; enCours = true;
    await amisAgir('signal'); const d = await amisAgir('invite', { code:x.code, salle:amisSalle() });
    if (d) { clearInterval(tic); sessionStorage.removeItem('amis-inviter'); amisMsg('🎲 Salle créée : invitation envoyée à ton ami !'); }
    else if (++essais >= 3) { clearInterval(tic); sessionStorage.removeItem('amis-inviter'); amisMsg('L’invitation n’est pas partie : invite ton ami depuis la salle (👥 Inviter des amis).'); }
    enCours = false; }, 1500); })();
const amisVuTxt = t => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `vu il y a ${Math.max(1, m)} min` : m < 1440 ? `vu il y a ${Math.round(m / 60)} h` : `vu il y a ${Math.round(m / 1440)} j`; };
async function amisFenetre() {
  AMIS.ouvert = true;
  if (!AMIS.carte) {
    amisFen(`<h2>👥 Mes amis</h2><p class="doux">Crée ta carte de joueur : un <b>pseudo</b>, et tu reçois un <b>code ami</b> à donner à tes amis. Pas de compte, pas d’e-mail.</p>
      <input id="am-pseudo" maxlength="24" placeholder="Ton pseudo" value="${amisEsc(localStorage.getItem('guilde-pseudo') || '')}">
      <p id="am-info"></p><button class="am-bt go large" id="am-cree" onclick="amisCree()">Créer ma carte</button>`); return;
  }
  if (!AMIS.etat) { amisFen('<h2>👥 Mes amis</h2><p class="doux" style="text-align:center">Un instant…</p>'); await amisAgir('signal'); }
  amisDessine();
}
function amisDessine() {
  if (!AMIS.ouvert) return; const E = AMIS.etat;
  const foc = document.activeElement; if (foc && foc.tagName === 'INPUT' && foc.closest('#amis-fen') && foc.value) return; // on ne coupe pas la saisie
  if (!E) { amisFen(`<h2>👥 Mes amis</h2><p class="doux">${AMIS.erreur ? 'Pas de réseau, ou le serveur ne répond pas.' : 'Un instant…'}</p>`); return; }
  const salle = amisSalle(), enL = E.amis.filter(a => a.enLigne);
  amisFen(`<h2>👥 Mes amis</h2>
    <p class="doux" style="text-align:center;margin:0">Ton code ami, à donner à tes amis :</p><div class="am-code">${E.code}</div>
    <p class="doux" style="text-align:center;margin:0">Ton pseudo : <b>${amisEsc(E.pseudo)}</b> <small>(il se change dans ton profil)</small></p>
    ${E.demandes.length ? `<h3>📩 Demandes d’amis</h3>${E.demandes.map(d => `<div class="am-ligne"><div class="p"><b>${amisEsc(d.pseudo)}</b><small>code ${d.code}</small></div><button class="am-bt go" onclick="amisFait('accepte','${d.code}')">Accepter</button><button class="am-bt" onclick="amisFait('refuse','${d.code}')">Non</button></div>`).join('')}` : ''}
    <h3>🟢 En ligne (${enL.length}) · ${E.amis.length} ami${E.amis.length > 1 ? 's' : ''}</h3>
    ${E.amis.length && E.coeurs ? (C => `<div class="am-coeurs"><div><b>❤ Les cœurs du jour</b> : ${C.envoyes}/${C.max} envoyés <small>(+5 XP chacun)</small><br><small>💝 Coffret de l’amitié : ${C.jauge}/${C.coffret} cœurs reçus${C.recusAujourdhui ? ` · ${C.recusAujourdhui} reçu${C.recusAujourdhui > 1 ? 's' : ''} aujourd’hui` : ''}</small><div class="am-jauge"><i style="width:${Math.round(100 * C.jauge / C.coffret)}%"></i></div></div>${C.envoyes < C.max && E.amis.some(a => !a.coeurEnvoye) ? '<button class="am-bt or" onclick="amisCoeur()">❤ À tous</button>' : ''}</div>`)(E.coeurs) : ''}
    ${E.amis.length ? E.amis.map(a => `<div class="am-ligne"><span class="am-pt ${a.enLigne ? 'on' : ''}"></span><img src="${amisPortrait((a.profil || {}).portrait)[0]}" onerror="this.onerror=null;this.src='${amisPortrait((a.profil || {}).portrait)[1]}'" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px ${(a.profil && a.profil.cadre && a.profil.cadre.c) || '#4b4580'};cursor:pointer" onclick="amisVoir('${a.code}')"><div class="p" style="cursor:pointer" onclick="amisVoir('${a.code}')"><b>${amisEsc(a.pseudo)}</b><small>${a.enLigne ? (a.salle ? `🎲 dans la salle ${amisEsc(a.salle)}` : 'en ligne dans la Guilde') : amisVuTxt(a.vu)}${a.coeurRecu ? ' · ❤ t’a envoyé un cœur' : ''}</small></div>
        ${E.coeurs ? (a.coeurEnvoye ? '<span class="am-coeur fait" title="Cœur envoyé aujourd’hui">💗</span>' : E.coeurs.envoyes < E.coeurs.max ? `<button class="am-coeur" title="Envoyer un cœur (+5 XP)" onclick="amisCoeur('${a.code}')">❤</button>` : '') : ''}
        ${a.enLigne && a.salle && a.salle !== salle ? `<button class="am-bt go" onclick="amisRejoindre('${amisEsc(a.salle)}')">Rejoindre</button>` : ''}
        ${a.enLigne && salle && a.salle !== salle ? `<button class="am-bt or" onclick="amisInvite('${a.code}')">Inviter</button>` : ''}
        <button class="am-bt" style="padding:6px 8px" title="Retirer" onclick="if(confirm('Retirer ${amisEsc(a.pseudo).replace(/'/g, '')} de tes amis ?'))amisFait('retire','${a.code}')">✕</button></div>`).join('')
      : '<p class="doux">Pas encore d’amis : demande leur code, ou donne-leur le tien.</p>'}
    ${salle ? `<p class="doux">Tu es dans la salle <b>${salle}</b> : touche « Inviter » à côté d’un ami en ligne.</p>` : '<button class="am-bt go large" onclick="location.href=\'chroniques.html?ligne=1\'">🎲 Créer un salon</button><p class="doux">Dans le salon : invite tes amis, puis choisissez les Chroniques, un Duel, ou reprenez une partie sauvegardée.</p>'}
    <h3>＋ Ajouter un ami</h3>
    <p id="am-info"></p><div style="display:flex;gap:8px"><input id="am-ajout" class="code" maxlength="6" placeholder="CODE" autocomplete="off"><button class="am-bt go" onclick="amisAjoute()">Ajouter</button></div>
    `);
}
async function amisCree() {
  const p = (document.getElementById('am-pseudo').value || '').trim().slice(0, 24); if (!p) { amisMsg('Choisis un pseudo'); return; }
  const bt = document.getElementById('am-cree'); if (bt) { if (bt.disabled) return; bt.disabled = true; bt.textContent = 'Création…'; }
  const remet = () => { if (bt) { bt.disabled = false; bt.textContent = 'Créer ma carte'; } };
  try { const { statut, d } = await amisApi(AMIS_API, { pseudo:p });
    if (statut !== 200) { remet(); amisMsg(statut === 501 || statut === 405 || (statut === 404 && !d.message) ? 'Les amis marchent seulement sur perso.elvanys.fr/guilde (cette page est ouverte ailleurs).' : (d.message || 'Le serveur ne répond pas.') + ` (code ${statut})`); return; }
    AMIS.carte = { code:d.code, cle:d.cle, pseudo:d.pseudo }; localStorage.setItem('guilde-carte', JSON.stringify(AMIS.carte)); localStorage.setItem('guilde-pseudo', d.pseudo);
    await amisAgir('signal'); amisDessine();
    if (window.GS) GS.apresCreation(d); // 16/11 : le compte et sa sauvegarde sur le serveur (sauvegarde.js), avec le code de récupération
  } catch (e) { remet(); amisMsg('Pas de réseau, ou la page n’a pas pu joindre le serveur : ' + (e && e.message || e)); }
}
async function amisAjoute() {
  const c = (document.getElementById('am-ajout').value || '').toUpperCase().replace(/[^A-Z]/g, ''); if (c.length < 6) { amisMsg('Le code ami a 6 lettres'); return; }
  const d = await amisAgir('ajoute', { code:c }); if (!d) return;
  amisMsg(d.ami ? '🤝 Vous êtes amis !' : `📩 Demande envoyée à ${d.pseudoAmi || 'ton ami'}`); amisDessine();
}
// 17/11 (l'utilisateur : « Gilga n'a pas eu d'équipement en fin de partie… il faut un système de messages pour récupérer les cadeaux ») :
// LA BOÎTE AUX LETTRES. À la fin d'une partie en ligne, le serveur y dépose les récompenses de chaque joueur ; on les récupère ici.
async function amisBoiteMaj() {
  if (!AMIS.carte) return;
  try { const { statut, d } = await amisApi('/api/hub/guilde/boite', { cle:AMIS.carte.cle }); if (statut === 200) { AMIS.boite = d.messages || []; AMIS.jours = d.jours || null; if (d.jours && d.jours.joues) try { localStorage.setItem('guilde-jours-joues', String(Math.max(d.jours.joues | 0, +localStorage.getItem('guilde-jours-joues') || 0))); localStorage.setItem('guilde-jours-prochain', String(d.jours.prochain | 0)); } catch (e) {} amisBouton(); } } catch (e) {}
}
// 21/11 : les nouveaux cadeaux (colis du lundi, paliers de fidélité, cadeau à tous) ajoutent des éclats de Guilde, des pièces d'une rareté
// choisie (« rarete » : 1 rare, 2 épique…) et parfois un titre de profil
const AMIS_TITRES_BOITE = { fidele30:'Pilier de la Guilde', fidele100:'Légende fidèle' };
function amisCadeauTxt(c) { const R = typeof EQ_RARE !== 'undefined' ? EQ_RARE : [], rare = c.rarete != null && R[c.rarete] ? ` ${R[c.rarete].n}${c.pieces > 1 ? 's' : ''}` : '';
  return [c.or ? `🪙 +${c.or} or` : '', c.poussiere ? `🔹 +${c.poussiere} poussière de rune` : '', c.eclats ? `💠 +${c.eclats} éclats de Guilde` : '',
    c.pieces ? `🎒 ${c.pieces} pièce${c.pieces > 1 ? 's' : ''} d’équipement${rare}` : '', c.titre && AMIS_TITRES_BOITE[c.titre] ? `🏅 titre « ${AMIS_TITRES_BOITE[c.titre]} »` : ''].filter(Boolean).join(' · '); }
// « Jours joués : N · prochain palier à M jours » (un jour compte quand on finit une partie)
function amisJoursTxt() { const j = AMIS.jours; if (!j) return ''; return `<p class="doux" style="text-align:center">🗓️ Jours joués : <b>${j.joues | 0}</b> · prochain palier à <b>${j.prochain | 0}</b> jours</p>`; }
async function amisBoite() {
  AMIS.ouvert = false; await amisBoiteMaj(); const l = AMIS.boite || [];
  amisFen(`<h2>📬 Boîte aux lettres</h2>${l.length ? l.map(m => `<div class="am-ligne"><div class="p"><b>${amisEsc(m.titre)}</b><small>${amisEsc(m.message)}</small><small style="color:#f3c96b">${amisCadeauTxt(m.cadeau || {})}</small></div><button class="am-bt go" onclick="amisRecupere('${amisEsc(m.id)}')">Récupérer</button></div>`).join('')
    : '<p class="doux">Rien pour le moment. Les récompenses des parties en ligne, le colis du lundi et les cadeaux de fidélité arrivent ici.</p>'}
  `);
}
async function amisRecupere(id) {
  if (typeof avGagne !== 'function') { amisMsg('Ouvre ta boîte depuis le menu de la Guilde pour ranger les cadeaux.'); return; }
  const { statut, d } = await amisApi('/api/hub/guilde/boite/recuperer', { cle:AMIS.carte.cle, id }).catch(() => ({ statut:0, d:{} }));
  if (statut !== 200) { amisMsg((d && d.message) || 'Pas de réseau.'); await amisBoite(); return; }
  const c = d.cadeau || {}, choisie = c.rarete != null && typeof eqNouvelle === 'function', g = avGagne(c.or | 0, choisie ? 0 : c.pieces | 0, !!c.gagne) || [];
  if (choisie && c.pieces) { const s = avSac(); for (let i = 0; i < (c.pieces | 0); i++) { const p = eqNouvelle(null, Math.max(0, Math.min(4, c.rarete | 0))); s.pieces.push(p); g.push(p); } avSacEcrire(s); }
  if (c.poussiere && typeof donneRessources === 'function') donneRessources(0, c.poussiere | 0, true);
  if (c.eclats && typeof donneLibres === 'function') donneLibres(c.eclats | 0);
  if (c.titre && AMIS_TITRES_BOITE[c.titre]) { try { const t = JSON.parse(localStorage.getItem('guilde-titres-boite') || '[]'); if (!t.includes(c.titre)) { t.push(c.titre); localStorage.setItem('guilde-titres-boite', JSON.stringify(t)); } } catch (e) {} }
  try { if (typeof GM !== 'undefined') GM.son('victoire'); } catch (e) {}
  AMIS.boite = (AMIS.boite || []).filter(m => m.id !== id); amisBouton();
  const R = typeof EQ_RARE !== 'undefined' ? EQ_RARE : [];
  amisFen(`<h2>🎁 Récupéré !</h2><p style="text-align:center">${amisCadeauTxt(c)}</p>${g.length ? `<p style="text-align:center">${g.map(p => `<b style="color:${(R[p.r] || {}).c || '#f3c96b'}">${amisEsc(p.nom)}</b>`).join(' · ')} rejoint ton coffre.</p>` : ''}
    <button class="am-bt go large" onclick="amisBoite()">📬 Retour à la boîte</button>`);
}
async function amisFait(action, code) { const d = await amisAgir(action, { code }); if (d && action === 'accepte') amisMsg('🤝 Vous êtes amis !'); amisDessine(); }
// 22/11 (décision de l'utilisateur) : LES CŒURS. Un cœur par ami et par jour (10 au plus), +5 XP de rang chacun ; tous les 10 cœurs reçus,
// le serveur dépose un « coffret de l'amitié » dans la boîte aux lettres. Le total envoyé est aussi gardé ici pour les succès.
async function amisCoeur(code) {
  const d = await amisAgir('coeur', code ? { code } : { tous:true }); if (!d) return;
  const n = d.coeursEnvoyes | 0; if (!n) { amisMsg('Plus de cœur à envoyer aujourd’hui.'); amisDessine(); return; }
  try { localStorage.setItem('guilde-coeurs-env', String((+localStorage.getItem('guilde-coeurs-env') || 0) + n)); } catch (e) {}
  if (typeof gagneXP === 'function') gagneXP(5 * n, n > 1 ? `${n} cœurs envoyés` : 'cœur envoyé');
  if (typeof guildeEvt === 'function') guildeEvt('coeur', n);
  amisMsg(n > 1 ? `❤ ${n} cœurs envoyés !` : '❤ Cœur envoyé !'); amisDessine();
}
async function amisInvite(code) { const d = await amisAgir('invite', { code, salle:amisSalle() }); if (d) amisMsg('🎲 Invitation envoyée !'); }
async function amisPseudo() {
  amisFen(`<h2>✏️ Ton pseudo</h2><input id="am-pseudo2" maxlength="24" value="${amisEsc(AMIS.etat.pseudo)}"><button class="am-bt go large" onclick="amisPseudoOk()">Enregistrer</button><button class="am-bt large" onclick="amisDessine()">Annuler</button>`);
}
async function amisPseudoOk() { const p = (document.getElementById('am-pseudo2').value || '').trim(); if (!p) return; const d = await amisAgir('pseudo', { pseudo:p }); if (d) { AMIS.carte.pseudo = d.pseudo; localStorage.setItem('guilde-carte', JSON.stringify(AMIS.carte)); localStorage.setItem('guilde-pseudo', d.pseudo); } amisDessine(); }
// le signal de présence : tout de suite, puis toutes les 20 s quand l'écran est visible
function amisDemarre() {
  amisBouton(); if (location.protocol === 'file:') return;
  if (AMIS.carte) amisAgir('signal').then(() => { if (AMIS.ouvert) { AMIS_RAFRAICHI = true; amisDessine(); AMIS_RAFRAICHI = false; } });
  amisBoiteMaj(); setInterval(() => { if (!document.hidden) amisBoiteMaj(); }, 60000);
  setInterval(() => { if (!document.hidden && AMIS.carte) amisAgir('signal').then(() => { if (AMIS.ouvert) { AMIS_RAFRAICHI = true; amisDessine(); AMIS_RAFRAICHI = false; } }); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && AMIS.carte) amisAgir('signal'); });
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', amisDemarre); else amisDemarre(); }
