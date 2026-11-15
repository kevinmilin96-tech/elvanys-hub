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
  .am-voile { position:fixed; inset:0; background:#000c; z-index:5000; display:flex; align-items:center; justify-content:center; padding:4vw; }
  .am-fen { width:min(94vw, 460px); max-height:88vh; overflow:auto; background:#1c1838; border:2px solid #7cd4ff; border-radius:18px; padding:16px; color:#f1ecff; font:15px/1.45 Georgia, serif; }
  .am-fen h2 { margin:0 0 6px; text-align:center; color:#7cd4ff; font-size:1.2em; } .am-fen h3 { color:#f3c96b; font-size:1em; margin:14px 0 6px; }
  .am-fen .doux { color:#c9c1ea; font-size:.9em; }
  .am-code { text-align:center; font-size:1.8em; letter-spacing:.2em; color:#f3c96b; font-weight:bold; margin:4px 0; }
  .am-fen input { width:100%; font:1.05em Georgia, serif; padding:9px 12px; border-radius:12px; border:2px solid #45457a; background:#14122a; color:#f1ecff; }
  .am-fen input.code { text-transform:uppercase; letter-spacing:.2em; text-align:center; font-weight:bold; }
  .am-bt { font:bold .92em Georgia, serif; padding:8px 12px; border-radius:12px; border:1px solid #45457a; background:#221d42; color:#f1ecff; cursor:pointer; }
  .am-bt.go { background:#7cd4ff; color:#0a1a2a; border:0; } .am-bt.or { background:#f3c96b; color:#2b1d0a; border:0; } .am-bt.large { display:block; width:100%; margin-top:8px; padding:11px; }
  .am-ligne { display:flex; align-items:center; gap:8px; padding:8px; border:1px solid #2e2a55; border-radius:12px; margin:6px 0; background:#14122a; }
  .am-ligne .p { flex:1; } .am-ligne small { display:block; color:#c9c1ea; }
  .am-pt { width:11px; height:11px; border-radius:50%; background:#5a5680; flex:none; } .am-pt.on { background:#7dffb0; box-shadow:0 0 8px #7dffb0; }
  .am-invit { position:fixed; left:50%; transform:translateX(-50%); top:calc(60px + env(safe-area-inset-top)); z-index:4990; width:min(92vw, 420px); background:#14223a; border:2px solid #7cd4ff; border-radius:16px; padding:10px 12px; color:#f1ecff; font:15px Georgia, serif; box-shadow:0 8px 30px #000a; animation:amIn .4s; }
  .am-invit b { color:#7cd4ff; } .am-invit .bts { display:flex; gap:8px; margin-top:8px; } .am-invit .bts button { flex:1; }
  @keyframes amIn { from { transform:translate(-50%, -20px); opacity:0; } }`;
  if (typeof document !== 'undefined') document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
})();
async function amisApi(url, corps) {
  const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(corps) });
  let d = {}; try { d = await r.json(); } catch (e) {} return { statut:r.status, d };
}
const amisSalle = () => (typeof L !== 'undefined' && L && L.code) ? L.code : '';
const amisEsc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
async function amisAgir(action, plus) {
  if (!AMIS.carte) return null;
  try {
    const { statut, d } = await amisApi(AMIS_API + '/moi', Object.assign({ cle:AMIS.carte.cle, action, salle:amisSalle() }, plus || {}));
    if (statut === 401) { AMIS.carte = null; try { localStorage.removeItem('guilde-carte'); } catch (e) {} AMIS.etat = null; amisBouton(); return null; }
    if (statut !== 200) { amisMsg(d.message || 'Le serveur ne répond pas.'); return null; }
    AMIS.etat = d; AMIS.erreur = false; amisBouton(); amisInvitations(); return d;
  } catch (e) { AMIS.erreur = true; amisBouton(); return null; }
}
function amisMsg(t) { if (typeof bulle === 'function') { try { bulle(t, true); return; } catch (e) {} } if (typeof fhBulle === 'function') fhBulle(t); else alert(t); }
// le bouton 👥 en haut (à côté du 👤 du profil)
function amisBouton() {
  if (typeof document === 'undefined' || !document.body || window.AMIS_SANS_BOUTON) return;
  let b = document.getElementById('amis-bouton'); if (!b) { b = document.createElement('button'); b.id = 'amis-bouton'; b.onclick = amisFenetre; b.setAttribute('aria-label', 'Mes amis'); document.body.appendChild(b); }
  const E = AMIS.etat, n = E ? E.amis.filter(a => a.enLigne).length : 0, dem = E ? E.demandes.length : 0;
  b.innerHTML = `👥${dem ? `<span class="pt rouge">${dem}</span>` : n ? `<span class="pt">${n}</span>` : ''}`;
  b.title = !AMIS.carte ? 'Mes amis' : `${n} ami${n > 1 ? 's' : ''} en ligne`;
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
function amisRejoindre(salle) {
  amisAgir('oublie', { salle });
  if (location.pathname.endsWith('chroniques.html') && typeof rejoindre === 'function') { document.querySelectorAll('.am-invit').forEach(x => x.remove()); amisFermer(); rejoindre(salle, { id:'j' + Math.random().toString(36).slice(2, 10), nom:AMIS.carte.pseudo }); }
  else location.href = 'chroniques.html?salle=' + encodeURIComponent(salle);
}
// la fenêtre des amis
function amisFermer() { AMIS.ouvert = false; const f = document.getElementById('amis-fen'); if (f) f.innerHTML = ''; }
function amisFen(h) { let f = document.getElementById('amis-fen'); if (!f) { f = document.createElement('div'); f.id = 'amis-fen'; document.body.appendChild(f); }
  f.innerHTML = h ? `<div class="am-voile" onclick="if(event.target===this)amisFermer()"><div class="am-fen">${h}</div></div>` : ''; }
const amisVuTxt = t => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `vu il y a ${Math.max(1, m)} min` : m < 1440 ? `vu il y a ${Math.round(m / 60)} h` : `vu il y a ${Math.round(m / 1440)} j`; };
async function amisFenetre() {
  AMIS.ouvert = true;
  if (!AMIS.carte) {
    amisFen(`<h2>👥 Mes amis</h2><p class="doux">Crée ta carte de joueur : un <b>pseudo</b>, et tu reçois un <b>code ami</b> à donner à tes amis. Pas de compte, pas d’e-mail.</p>
      <input id="am-pseudo" maxlength="24" placeholder="Ton pseudo" value="${amisEsc(localStorage.getItem('guilde-pseudo') || '')}">
      <button class="am-bt go large" onclick="amisCree()">Créer ma carte</button><button class="am-bt large" onclick="amisFermer()">Fermer</button>`); return;
  }
  if (!AMIS.etat) { amisFen('<h2>👥 Mes amis</h2><p class="doux" style="text-align:center">Un instant…</p>'); await amisAgir('signal'); }
  amisDessine();
}
function amisDessine() {
  if (!AMIS.ouvert) return; const E = AMIS.etat;
  const foc = document.activeElement; if (foc && foc.tagName === 'INPUT' && foc.closest('#amis-fen') && foc.value) return; // on ne coupe pas la saisie
  if (!E) { amisFen(`<h2>👥 Mes amis</h2><p class="doux">${AMIS.erreur ? 'Pas de réseau, ou le serveur ne répond pas.' : 'Un instant…'}</p><button class="am-bt large" onclick="amisFermer()">Fermer</button>`); return; }
  const salle = amisSalle(), enL = E.amis.filter(a => a.enLigne);
  amisFen(`<h2>👥 Mes amis</h2>
    <p class="doux" style="text-align:center;margin:0">Ton code ami, à donner à tes amis :</p><div class="am-code">${E.code}</div>
    <p class="doux" style="text-align:center;margin:0">Ton pseudo : <b>${amisEsc(E.pseudo)}</b> <button class="am-bt" style="padding:3px 8px" onclick="amisPseudo()">changer</button></p>
    ${E.demandes.length ? `<h3>📩 Demandes d’amis</h3>${E.demandes.map(d => `<div class="am-ligne"><div class="p"><b>${amisEsc(d.pseudo)}</b><small>code ${d.code}</small></div><button class="am-bt go" onclick="amisFait('accepte','${d.code}')">Accepter</button><button class="am-bt" onclick="amisFait('refuse','${d.code}')">Non</button></div>`).join('')}` : ''}
    <h3>🟢 En ligne (${enL.length}) · ${E.amis.length} ami${E.amis.length > 1 ? 's' : ''}</h3>
    ${E.amis.length ? E.amis.map(a => `<div class="am-ligne"><span class="am-pt ${a.enLigne ? 'on' : ''}"></span><div class="p"><b>${amisEsc(a.pseudo)}</b><small>${a.enLigne ? (a.salle ? `🎲 dans la salle ${amisEsc(a.salle)}` : 'en ligne dans la Guilde') : amisVuTxt(a.vu)}</small></div>
        ${a.enLigne && a.salle && a.salle !== salle ? `<button class="am-bt go" onclick="amisRejoindre('${amisEsc(a.salle)}')">Rejoindre</button>` : ''}
        ${a.enLigne && salle && a.salle !== salle ? `<button class="am-bt or" onclick="amisInvite('${a.code}')">Inviter</button>` : ''}
        <button class="am-bt" style="padding:6px 8px" title="Retirer" onclick="if(confirm('Retirer ${amisEsc(a.pseudo).replace(/'/g, '')} de tes amis ?'))amisFait('retire','${a.code}')">✕</button></div>`).join('')
      : '<p class="doux">Pas encore d’amis : demande leur code, ou donne-leur le tien.</p>'}
    ${salle ? `<p class="doux">Tu es dans la salle <b>${salle}</b> : touche « Inviter » à côté d’un ami en ligne.</p>` : '<p class="doux">Pour jouer ensemble : ouvre une salle dans les Chroniques (🌐 Créer une partie à distance), puis invite tes amis.</p>'}
    <h3>＋ Ajouter un ami</h3>
    <div style="display:flex;gap:8px"><input id="am-ajout" class="code" maxlength="6" placeholder="CODE" autocomplete="off"><button class="am-bt go" onclick="amisAjoute()">Ajouter</button></div>
    ${location.pathname.endsWith('chroniques.html') ? '' : '<button class="am-bt or large" onclick="location.href=\'chroniques.html\'">🎲 Jouer ensemble aux Chroniques</button>'}
    <button class="am-bt large" onclick="amisFermer()">Fermer</button>`);
}
async function amisCree() {
  const p = (document.getElementById('am-pseudo').value || '').trim().slice(0, 24); if (!p) { amisMsg('Choisis un pseudo'); return; }
  try { const { statut, d } = await amisApi(AMIS_API, { pseudo:p });
    if (statut !== 200) { amisMsg(d.message || 'Le serveur ne répond pas.'); return; }
    AMIS.carte = { code:d.code, cle:d.cle, pseudo:d.pseudo }; localStorage.setItem('guilde-carte', JSON.stringify(AMIS.carte)); localStorage.setItem('guilde-pseudo', d.pseudo);
    await amisAgir('signal'); amisDessine();
  } catch (e) { amisMsg('Pas de réseau.'); }
}
async function amisAjoute() {
  const c = (document.getElementById('am-ajout').value || '').toUpperCase().replace(/[^A-Z]/g, ''); if (c.length < 6) { amisMsg('Le code ami a 6 lettres'); return; }
  const d = await amisAgir('ajoute', { code:c }); if (!d) return;
  amisMsg(d.ami ? '🤝 Vous êtes amis !' : `📩 Demande envoyée à ${d.pseudoAmi || 'ton ami'}`); amisDessine();
}
async function amisFait(action, code) { const d = await amisAgir(action, { code }); if (d && action === 'accepte') amisMsg('🤝 Vous êtes amis !'); amisDessine(); }
async function amisInvite(code) { const d = await amisAgir('invite', { code, salle:amisSalle() }); if (d) amisMsg('🎲 Invitation envoyée !'); }
async function amisPseudo() {
  amisFen(`<h2>✏️ Ton pseudo</h2><input id="am-pseudo2" maxlength="24" value="${amisEsc(AMIS.etat.pseudo)}"><button class="am-bt go large" onclick="amisPseudoOk()">Enregistrer</button><button class="am-bt large" onclick="amisDessine()">Annuler</button>`);
}
async function amisPseudoOk() { const p = (document.getElementById('am-pseudo2').value || '').trim(); if (!p) return; const d = await amisAgir('pseudo', { pseudo:p }); if (d) { AMIS.carte.pseudo = d.pseudo; localStorage.setItem('guilde-carte', JSON.stringify(AMIS.carte)); localStorage.setItem('guilde-pseudo', d.pseudo); } amisDessine(); }
// le signal de présence : tout de suite, puis toutes les 20 s quand l'écran est visible
function amisDemarre() {
  amisBouton(); if (location.protocol === 'file:') return;
  if (AMIS.carte) amisAgir('signal').then(() => { if (AMIS.ouvert) amisDessine(); });
  setInterval(() => { if (!document.hidden && AMIS.carte) amisAgir('signal').then(() => { if (AMIS.ouvert) amisDessine(); }); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && AMIS.carte) amisAgir('signal'); });
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', amisDemarre); else amisDemarre(); }
