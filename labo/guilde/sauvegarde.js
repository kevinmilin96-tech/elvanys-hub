// La Guilde des Runes — LE COMPTE ET LA SAUVEGARDE SUR LE SERVEUR (16/11, demande de l'utilisateur : sa conjointe a perdu une Odyssée,
// qui n'était rangée que dans le navigateur du téléphone ; « que l'on garde sur le serveur et plus sur le téléphone, avec création d'un
// compte, pseudo minimum »).
// · Le COMPTE = la carte de joueur des amis (amis.js) : un pseudo, rien d'autre ; un CODE DE RÉCUPÉRATION (12 signes) pour le retrouver
//   sur un autre téléphone ou un autre navigateur.
// · LA SAUVEGARDE : toutes les clés « guilde-… » du jeu partent sur le serveur (/api/hub/guilde/sauvegarde) quelques secondes après chaque
//   changement ; à l'ouverture d'une page, si le serveur a plus récent (un autre appareil a joué), on le recopie et la page se recharge.
//   Le navigateur n'en garde qu'une copie de travail. Hors du labo perso (fichier local, démo) : rien ne change, tout reste local.
// Chargé par musique.js sur toutes les pages du jeu.
(() => { if (window.GS) return;
  const API = '/api/hub/guilde', CARTE = 'guilde-carte', REV = 'guilde-sauve-rev', SALE = 'guilde-sauve-sale', QUAND = 'guilde-sauve-quand';
  const LS = window.localStorage; if (!LS) return;
  const set0 = Storage.prototype.setItem, del0 = Storage.prototype.removeItem;
  const aSauver = k => typeof k === 'string' && k.startsWith('guilde-') && k !== CARTE && !k.startsWith('guilde-sauve') && !k.startsWith('guilde-placer');
  const carte = () => { try { const c = JSON.parse(LS.getItem(CARTE) || 'null'); return c && c.cle ? c : null; } catch (e) { return null; } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  let minuteur = null, envoi = false, tours = 0, etat = 'local'; // local · ok · envoi · erreur
  async function api(chemin, corps) {
    const r = await fetch(API + chemin, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(corps) });
    let d = null; try { d = await r.json(); } catch (e) {} return { statut:r.status, d };
  }
  // tout changement du jeu marque la sauvegarde « à envoyer » (les autres sites de l'adresse perso ne sont pas touchés)
  Storage.prototype.setItem = function (k, v) { const avant = this === LS && aSauver(k) ? this.getItem(k) : null; set0.call(this, k, v); if (this === LS && aSauver(k) && avant !== String(v)) aEnvoyer(); };
  Storage.prototype.removeItem = function (k) { del0.call(this, k); if (this === LS && aSauver(k)) aEnvoyer(); };
  function aEnvoyer() { set0.call(LS, SALE, '1'); tours++; clearTimeout(minuteur); minuteur = setTimeout(envoyer, 2500); }
  function donnees() { const o = {}; for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (aSauver(k)) o[k] = LS.getItem(k); } return o; }
  async function envoyer() {
    const c = carte(); if (!c || envoi || !LS.getItem(SALE)) return;
    envoi = true; const t0 = tours; etat = 'envoi'; pastille();
    try {
      const { statut, d } = await api('/sauvegarde/ecrire', { cle:c.cle, base:+(LS.getItem(REV) || 0), donnees:donnees() });
      if (statut === 200 && d) { set0.call(LS, REV, String(d.rev)); set0.call(LS, QUAND, String(Date.now())); if (tours === t0) del0.call(LS, SALE); etat = 'ok'; }
      else if (statut === 409) { etat = 'erreur'; conflit(); }
      else etat = statut === 404 ? 'local' : 'erreur';
    } catch (e) { etat = 'erreur'; }
    envoi = false; pastille();
    if (LS.getItem(SALE) && etat === 'ok') { clearTimeout(minuteur); minuteur = setTimeout(envoyer, 2500); }
  }
  // recopier la sauvegarde du serveur dans le navigateur (les clés du jeu seulement), puis recharger la page une fois
  function appliquer(d, rev) {
    const garder = []; for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (aSauver(k)) garder.push(k); }
    garder.forEach(k => del0.call(LS, k));
    Object.keys(d || {}).forEach(k => { if (aSauver(k)) set0.call(LS, k, d[k]); });
    set0.call(LS, REV, String(rev)); set0.call(LS, QUAND, String(Date.now())); del0.call(LS, SALE);
  }
  async function demarrer() {
    const c = carte(); if (!c) { pastille(); return proposerCompte(); }
    try {
      const { statut, d } = await api('/sauvegarde/lire', { cle:c.cle });
      if (statut === 401) { etat = 'erreur'; pastille(); return; }
      if (statut !== 200 || !d) { etat = statut === 404 ? 'local' : 'erreur'; pastille(); return; }
      const local = +(LS.getItem(REV) || 0);
      if (d.rev > local && d.donnees) { // un autre appareil (ou un autre navigateur) a joué : le serveur l'emporte
        if (sessionStorage.getItem('guilde-sauve-recharge') === String(d.rev)) { etat = 'ok'; pastille(); return; }
        appliquer(d.donnees, d.rev); sessionStorage.setItem('guilde-sauve-recharge', String(d.rev)); location.reload(); return;
      }
      etat = 'ok'; pastille();
      if (d.rev === 0 || LS.getItem(SALE) || d.rev < local) { if (d.rev < local) set0.call(LS, REV, String(d.rev)); set0.call(LS, SALE, '1'); envoyer(); }
    } catch (e) { etat = 'erreur'; pastille(); }
  }
  async function conflit() {
    const c = carte(); if (!c) return;
    try { const { statut, d } = await api('/sauvegarde/lire', { cle:c.cle }); if (statut === 200 && d && d.donnees) {
      fen(`<h2>☁ Ta partie a avancé ailleurs</h2><p>Ton compte a joué sur un autre téléphone ou un autre navigateur. On reprend la sauvegarde la plus récente.</p><button class="gs-go" onclick="GS.recharge()">Reprendre</button>`, false);
      GS._en = d; } } catch (e) {}
  }
  // ---------------------------------------------------------------- l'écran du compte
  const style = () => { if (document.getElementById('gs-style')) return; const s = document.createElement('style'); s.id = 'gs-style';
    s.textContent = `#gs-voile{position:fixed;inset:0;z-index:2000;background:#000b;display:flex;align-items:center;justify-content:center;padding:14px}
      #gs-fen{background:#1b1838;color:#fff;border:2px solid #f3c96b;border-radius:16px;padding:16px;max-width:420px;width:100%;font:15px/1.4 Georgia,serif;max-height:92vh;overflow:auto}
      #gs-fen h2{margin:0 0 8px;color:#f3c96b;font-size:1.25em;text-align:center} #gs-fen p{margin:.4em 0} #gs-fen small{color:#c9c1ea}
      #gs-fen input{width:100%;box-sizing:border-box;font:16px Georgia;padding:10px;border-radius:10px;border:1px solid #4b4580;background:#0d0b18;color:#fff;margin:6px 0}
      #gs-fen button{display:block;width:100%;margin:6px 0;padding:11px;border-radius:12px;border:1px solid #4b4580;background:#2a2350;color:#fff;font:15px Georgia}
      #gs-fen .gs-go{background:#f3c96b;color:#2b1d0a;font-weight:bold;border:0} .gs-code{font:bold 1.5em monospace;letter-spacing:.12em;text-align:center;color:#7dffb0;background:#0d0b18;border-radius:10px;padding:10px;margin:8px 0;user-select:all}
      #gs-msg{color:#ff8a7a;text-align:center;min-height:1.2em} #gs-pastille{position:fixed;left:8px;bottom:8px;z-index:900;font-size:16px;opacity:.75;pointer-events:none}`;
    document.head.appendChild(s); };
  function fen(h, ferme = true) { style(); let v = document.getElementById('gs-voile'); if (!h) { if (v) v.remove(); return; }
    if (!v) { v = document.createElement('div'); v.id = 'gs-voile'; document.body.appendChild(v); }
    v.onclick = ferme ? (e => { if (e.target === v) fen(''); }) : null; v.innerHTML = `<div id="gs-fen">${h}</div>`; }
  const msg = t => { const m = document.getElementById('gs-msg'); if (m) m.textContent = t; };
  function pastille() { if (!document.body) return; let p = document.getElementById('gs-pastille');
    if (!p) { style(); p = document.createElement('div'); p.id = 'gs-pastille'; document.body.appendChild(p); }
    p.textContent = !carte() ? '' : etat === 'ok' ? '☁' : etat === 'envoi' ? '☁…' : etat === 'erreur' ? '☁⚠' : ''; p.title = 'Sauvegarde sur le serveur'; }
  // à la 1re ouverture du menu sans compte : créer son compte (pseudo) ou retrouver le sien (code de récupération)
  function proposerCompte(force) {
    if (!force && !/menu\.html$|\/guilde\/?$/.test(location.pathname)) return;
    if (!force && (sessionStorage.getItem('guilde-sauve-plustard') || Date.now() - (+LS.getItem('guilde-sauve-plustard') || 0) < 3 * 864e5)) return; // 22/11 (testeurs) : « Plus tard » vaut 3 jours, plus seulement la session
    fen(`<h2>☁ Ton compte de la Guilde</h2><p>Pour ne <b>jamais perdre ta progression</b> (Odyssée, héros, cartes…), elle est gardée sur le serveur. Il suffit d’un pseudo.</p>${Object.keys(donnees()).length ? '<p>✅ <b>Ce que tu as déjà joué sur ce téléphone est gardé</b> : ta progression en cours sera rattachée à ton nouveau compte.</p>' : ''}
      <input id="gs-pseudo" maxlength="24" placeholder="Ton pseudo" autocomplete="off" value="${esc(LS.getItem('guilde-pseudo') || '')}">
      <div id="gs-msg"></div><button class="gs-go" id="gs-cree" onclick="GS.creer()">Créer mon compte</button>
      <button onclick="GS.ecranRetrouver()">J’ai déjà un compte (code de récupération)</button>
      <button onclick="sessionStorage.setItem('guilde-sauve-plustard','1');try{localStorage.setItem('guilde-sauve-plustard',String(Date.now()))}catch(e){};GS.fermer()">Plus tard</button><p><small>Plus tard : tu peux jouer, et créer ton compte quand tu veux dans ⚙️ Paramètres → ☁ Mon compte ; rien de ce que tu joues d’ici là n’est perdu… tant que ce navigateur n’est pas effacé.</small></p>`, false);
  }
  function montreRecup(code, neuf) {
    fen(`<h2>🔑 Ton code de récupération</h2><p>${neuf ? 'Ton compte est créé, et tout ce que tu as déjà joué y est rattaché et part sur le serveur. ' : ''}Note ce code (dans tes notes, une photo…) : il permet de retrouver ton compte <b>sur un autre téléphone</b> ou si ce navigateur s’efface.</p>
      <div class="gs-code">${esc(code)}</div><button onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(code)}');this.textContent='Copié ✓'">Copier le code</button>
      <button class="gs-go" onclick="GS.fermer()">Je l’ai noté</button>`, false);
  }
  window.GS = {
    fermer() { fen(''); },
    recharge() { const d = GS._en; if (d) { appliquer(d.donnees, d.rev); location.reload(); } },
    async creer() {
      const p = (document.getElementById('gs-pseudo').value || '').trim().slice(0, 24); if (!p) return msg('Choisis un pseudo.');
      const b = document.getElementById('gs-cree'); if (b.disabled) return; b.disabled = true; b.textContent = 'Création…';
      try { const { statut, d } = await api('/joueur', { pseudo:p });
        if (statut !== 200 || !d || !d.cle) { b.disabled = false; b.textContent = 'Créer mon compte'; return msg((d && d.message) || 'Le serveur ne répond pas, réessaie.'); }
        GS.apresCreation(d); } catch (e) { b.disabled = false; b.textContent = 'Créer mon compte'; msg('Pas de réseau, réessaie.'); }
    },
    // aussi appelé par amis.js quand on crée sa carte depuis la fenêtre des amis
    apresCreation(d) {
      set0.call(LS, CARTE, JSON.stringify({ code:d.code, cle:d.cle, pseudo:d.pseudo })); set0.call(LS, 'guilde-pseudo', d.pseudo);
      set0.call(LS, REV, '0'); set0.call(LS, SALE, '1'); envoyer();
      if (d.recup) montreRecup(d.recup, true); else fen('');
    },
    ecranRetrouver() {
      fen(`<h2>🔑 Retrouver mon compte</h2><p>Tape le code de récupération (12 signes) que tu as noté à la création du compte.</p>
        <input id="gs-recup" maxlength="16" placeholder="XXXX-XXXX-XXXX" autocomplete="off" style="text-transform:uppercase;letter-spacing:.1em">
        <div id="gs-msg"></div><button class="gs-go" id="gs-rt" onclick="GS.retrouver()">Retrouver mon compte</button><button onclick="GS.fermer()">Annuler</button>`, false);
    },
    async retrouver() {
      const r = (document.getElementById('gs-recup').value || '').trim(); const b = document.getElementById('gs-rt'); if (b.disabled) return; b.disabled = true;
      try { const { statut, d } = await api('/joueur/retrouver', { recup:r });
        if (statut !== 200 || !d || !d.cle) { b.disabled = false; return msg((d && d.message) || 'Code refusé.'); }
        if (Object.keys(donnees()).length && !confirm('Ce navigateur a déjà une progression : elle sera remplacée par celle de ton compte. On continue ?')) { b.disabled = false; return; }
        set0.call(LS, CARTE, JSON.stringify({ code:d.code, cle:d.cle, pseudo:d.pseudo })); set0.call(LS, 'guilde-pseudo', d.pseudo); set0.call(LS, REV, '0'); del0.call(LS, SALE);
        const l = await api('/sauvegarde/lire', { cle:d.cle });
        if (l.statut === 200 && l.d && l.d.donnees) appliquer(l.d.donnees, l.d.rev);
        location.reload();
      } catch (e) { b.disabled = false; msg('Pas de réseau, réessaie.'); }
    },
    // l'écran « Mon compte » (bouton dans la fenêtre des amis)
    async ouvrir() {
      const c = carte(); if (!c) return proposerCompte(true);
      const q = +(LS.getItem(QUAND) || 0);
      fen(`<h2>☁ Mon compte</h2><p style="text-align:center">Pseudo : <b>${esc(c.pseudo)}</b> · code ami <b>${esc(c.code)}</b></p>
        <p style="text-align:center"><small>${etat === 'ok' ? '✅ Progression sauvegardée sur le serveur' : etat === 'erreur' ? '⚠ Le serveur ne répond pas : ta progression partira dès qu’il revient' : 'Sauvegarde…'}${q ? ` (${new Date(q).toLocaleString('fr-FR', { dateStyle:'short', timeStyle:'short' })})` : ''}</small></p>
        <div id="gs-msg"></div><button class="gs-go" onclick="GS.nouveauRecup()">🔑 Voir un nouveau code de récupération</button>
        <p><small>L’ancien code ne marchera plus. Les autres appareils déjà connectés restent connectés.</small></p>
        <button onclick="GS.ecranRetrouver()">Utiliser un autre compte (code de récupération)</button><button onclick="GS.fermer()">Fermer</button>`);
    },
    async nouveauRecup() {
      const c = carte(); if (!c) return;
      try { const { statut, d } = await api('/joueur/moi', { cle:c.cle, action:'recup' }); if (statut === 200 && d && d.recup) montreRecup(d.recup); else msg((d && d.message) || 'Le serveur ne répond pas.'); } catch (e) { msg('Pas de réseau.'); }
    },
    envoyer, etat:() => etat,
  };
  // avant de quitter la page : on tente d'envoyer ce qui reste
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && LS.getItem(SALE)) envoyer(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
