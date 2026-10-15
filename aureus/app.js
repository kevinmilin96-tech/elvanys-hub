// Aureus — coffre-fort numérique, ébauche du 15/10/2026 (étape 1 : le socle + lien autodestructible).
// Ouvert depuis le hub (même adresse, même compte). Tout est chiffré ici, sur l'appareil : le serveur ne reçoit
// que des blocs illisibles (voir coffre-crypto.js). La clé du coffre ne vit qu'en mémoire, effacée au verrouillage.
import * as C from './coffre-crypto.js?v=__VERSION__';

const $ = (s, el = document) => el.querySelector(s);
const ecran = $('#ecran');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// --- Entreprise et session du hub (même règle que le hub : sous-domaine ou ?e=) --------------------------
const tous = window.HUB_ENTREPRISES || {};
const q = new URLSearchParams(location.search).get('e');
const hote = location.hostname.split('.')[0].replace(/-hub$/, '');
const ENT = (q && tous[q]) ? q : (tous[hote] ? hote : window.HUB_ENTREPRISE_PAR_DEFAUT);
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API = local ? (localStorage.getItem('hub_api') || 'http://127.0.0.1:8098') : '';
const jeton = () => localStorage.getItem('hub_session_' + ENT);

async function api(method, path, body) {
  try {
    const r = await fetch(API + path, {
      method, cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: jeton() || '' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await r.json(); } catch { /* vide */ }
    return { status: r.status, data };
  } catch {
    return { status: 0, data: { message: 'Pas de réseau.' } };
  }
}

// --- État en mémoire (effacé au verrouillage) ------------------------------------------------------------
let compte = null;          // { id, prenom }
let cle = null;             // clé du coffre (CryptoKey non exportable)
let fiches = new Map();     // id → { objet, version }
let dossiers = [];          // [{ id, nom, parent }]
let vue = { dossier: '', etiquette: '', recherche: '' };
let illisibles = 0;

// Lien magique sans extension : le QR de la page « Réception » du PC ouvre Aureus avec #envoyer=<boîte>.<clé>.
// On le garde le temps de la connexion (sessionStorage, 10 min) et on l'enlève de l'adresse.
let envoi = null;       // { id, cle, controle }
(() => {
  const m = /#envoyer=([a-z0-9]{15})\.([A-Za-z0-9_-]{43})$/.exec(location.hash);
  if (m) {
    sessionStorage.setItem('aureus_envoi', JSON.stringify({ id: m[1], cle: m[2], jusqua: Date.now() + 10 * 60000 }));
    history.replaceState(null, '', location.pathname + location.search);
  }
  try {
    const e = JSON.parse(sessionStorage.getItem('aureus_envoi') || 'null');
    if (e && e.jusqua > Date.now()) envoi = { id: e.id, cle: e.cle, controle: '' };
    else sessionStorage.removeItem('aureus_envoi');
  } catch { /* ignoré */ }
})();

const CLE_APPAREIL = () => `aureus_${ENT}_${compte.id}`;
const lireAppareil = () => { try { return JSON.parse(localStorage.getItem(CLE_APPAREIL()) || 'null'); } catch { return null; } };
const ID_DOSSIERS = 'dossiers-du-coffre';
const nouvelId = () => C.b64url(C.hasard(12));

function toast(texte) {
  const t = $('#toast');
  t.textContent = texte;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, 3200);
}

function nomAppareil() {
  const ua = navigator.userAgent;
  const sys = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Appareil';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox/.test(ua) ? 'Firefox' : /Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'navigateur';
  return `${nav} sur ${sys}`;
}

function codeTropFacile(c) {
  return /^(\d)\1+$/.test(c) || '0123456789'.includes(c) || '9876543210'.includes(c) || /^(\d\d)\1\1$/.test(c);
}

// =========================================================================================== démarrage

async function demarrer() {
  verrouiller(false);
  if (!jeton()) return ecranConnexion();
  ecran.innerHTML = '<div class="au-card au-center"><div class="au-spin"></div><p>Ouverture d’Aureus…</p></div>';
  const me = await api('GET', '/api/hub/me');
  if (me.status === 401 || me.status === 403 && !me.data.account) return ecranConnexion();
  if (me.status !== 200) return ecranMessage('Serveur injoignable', me.data.message || 'Réessayez dans un instant.');
  compte = { id: me.data.account.id, prenom: me.data.account.prenom || '' };
  const local = lireAppareil();
  const et = await api('GET', '/api/hub/aureus/etat?appareil=' + encodeURIComponent(local ? local.appareil : ''));
  if (et.status === 403) return ecranMessage('Aureus n’est pas ouvert pour vous', et.data.message);
  if (et.status !== 200) return ecranMessage('Serveur injoignable', et.data.message || 'Réessayez dans un instant.');
  if (!et.data.coffre) return ecranCreation();
  if (local && et.data.appareil === 'actif') return ecranCode(et.data.essais);
  return ecranMots(et.data.appareil === 'bloque'
    ? 'Trop d’essais de code sur cet appareil : ouvrez le coffre avec vos 12 mots, puis choisissez un nouveau code.'
    : 'Première ouverture sur cet appareil : entrez vos 12 mots de secours.');
}

function ecranConnexion() {
  ecran.innerHTML = `<div class="au-card au-center">
    <span class="au-badge big">AU</span><h1>Aureus</h1>
    <p>Le coffre-fort s’ouvre avec votre compte de l’espace magasin.</p>
    <a class="au-btn" href="../?rester=1">Me connecter à l’espace magasin</a>
    <a class="au-link" href="recevoir.html${local ? `?e=${ENT}` : ''}">🪄 Recevoir un mot de passe sur ce PC (sans me connecter)</a></div>`;
}

function ecranMessage(titre, texte) {
  ecran.innerHTML = `<div class="au-card au-center"><span class="au-badge big">AU</span><h1>${esc(titre)}</h1><p>${esc(texte)}</p>
    <a class="au-btn ghost" href="../?rester=1">Retour à l’espace magasin</a></div>`;
}

// ===================================================================================== création du coffre

function ecranCreation() {
  ecran.innerHTML = `<div class="au-card">
    <span class="au-badge big">AU</span>
    <h1>Votre coffre-fort</h1>
    <p>Rangez ici vos identifiants, cartes et notes sensibles. Tout est <b>chiffré sur cet appareil</b> : ni le magasin,
    ni l’administrateur, ni le serveur ne peuvent lire votre coffre.</p>
    <ul class="au-points">
      <li>🔑 <b>12 mots de secours</b> : la seule façon de récupérer le coffre (nouvel appareil, code oublié). Personne ne pourra vous les redonner.</li>
      <li>🔢 <b>Un code à 6 chiffres</b> pour l’ouvrir au quotidien sur cet appareil (5 essais).</li>
    </ul>
    <button type="button" class="au-btn" id="go-mots">Créer mon coffre</button></div>`;
  $('#go-mots').onclick = async () => afficherMots(await C.nouveauxMots());
}

function afficherMots(mots) {
  ecran.innerHTML = `<div class="au-card">
    <h1>Vos 12 mots de secours</h1>
    <p class="au-alerte">Notez-les sur papier, dans l’ordre, et rangez-les en lieu sûr (ou dans votre gestionnaire de mots de passe).
    Ne les envoyez à personne. Sans eux, un coffre perdu est perdu pour toujours.</p>
    <ol class="au-mots">${mots.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>
    <label class="au-check"><input type="checkbox" id="mots-notes"> J’ai noté mes 12 mots</label>
    <button type="button" class="au-btn" id="mots-suite" disabled>Vérifier</button></div>`;
  $('#mots-notes').onchange = (e) => { $('#mots-suite').disabled = !e.target.checked; };
  $('#mots-suite').onclick = () => verifierNotes(mots);
}

function verifierNotes(mots) {
  const pos = [];
  while (pos.length < 3) { const p = C.hasard(1)[0] % 12; if (!pos.includes(p)) pos.push(p); }
  pos.sort((a, b) => a - b);
  ecran.innerHTML = `<div class="au-card">
    <h1>Vérification</h1><p>Pour être sûr que vous les avez bien notés :</p>
    ${pos.map((p) => `<label class="au-field">Mot n° ${p + 1}<input data-pos="${p}" autocomplete="off" autocapitalize="none" spellcheck="false"></label>`).join('')}
    <p class="au-msg" id="verif-msg"></p>
    <div class="au-row"><button type="button" class="au-btn ghost" id="verif-retour">Revoir les mots</button>
    <button type="button" class="au-btn" id="verif-ok">Continuer</button></div></div>`;
  $('#verif-retour').onclick = () => afficherMots(mots);
  $('#verif-ok').onclick = () => {
    const bons = [...ecran.querySelectorAll('[data-pos]')].every((i) => C.simple(i.value) === C.simple(mots[+i.dataset.pos]));
    if (!bons) { $('#verif-msg').textContent = 'Ce n’est pas ça : revoyez vos mots.'; return; }
    choisirCode(async (code) => {
      const { cle: k, brut } = await C.nouvelleCleCoffre();
      const env = await C.envelopperParMots(mots, brut);
      const r = await api('POST', '/api/hub/aureus/coffre', env);
      if (r.status !== 200) { brut.fill(0); throw new Error(r.data.message || 'Création impossible.'); }
      await inscrireAppareil(code, brut);
      brut.fill(0);
      cle = k;
      await ouvrirCoffre();
    });
  };
}

// ================================================================================================ le code

/** Choisir un code (2 fois), puis faire « suite(code) ». */
function choisirCode(suite) {
  let premier = '';
  const etape = (titre, aide) => pave(titre, aide, async (code) => {
    if (!premier) {
      if (codeTropFacile(code)) return 'Code trop facile à deviner : choisissez-en un autre.';
      premier = code;
      etape('Encore une fois', 'Retapez le même code.');
      return null;
    }
    if (code !== premier) { premier = ''; etape('Choisissez un code', 'Les deux codes étaient différents. On recommence.'); return null; }
    try { await suite(code); } catch (e) { return e.message; }
    return null;
  });
  etape('Choisissez un code', '6 chiffres, pour ouvrir le coffre sur cet appareil. Il n’ouvre pas le coffre ailleurs.');
}

/** Inscrit cet appareil : la clé du coffre est rangée ici, chiffrée par (code + moitié du serveur). */
async function inscrireAppareil(code, brut) {
  const appareil = (lireAppareil() || {}).appareil || nouvelId();
  const sel = C.hasard(16);
  const d = await C.deriverCode(code, sel);
  const r = await api('POST', '/api/hub/aureus/appareil', { appareil, nom: nomAppareil(), preuve: d.preuve });
  if (r.status !== 200) throw new Error(r.data.message || 'Inscription de l’appareil impossible.');
  const enveloppe = await C.envelopperAppareil(brut, d.moitie, r.data.secret, sel);
  localStorage.setItem(CLE_APPAREIL(), JSON.stringify({ appareil, sel: C.b64(sel), enveloppe }));
}

function ecranCode(essais) {
  pave('Code du coffre', essais < 5 ? `Il reste ${essais} essai(s).` : `Bonjour ${compte.prenom}, entrez votre code.`, async (code) => {
    const loc = lireAppareil();
    const sel = C.deb64(loc.sel);
    const d = await C.deriverCode(code, sel);
    const r = await api('POST', '/api/hub/aureus/deverrouiller', { appareil: loc.appareil, preuve: d.preuve });
    if (r.status === 401) return `Code incorrect. Il reste ${r.data.essais} essai(s).`;
    if (r.status === 423 || r.status === 404) { ecranMots(r.data.message); return null; }
    if (r.status !== 200) return r.data.message || 'Serveur injoignable.';
    try { cle = await C.ouvrirAppareil(loc.enveloppe, d.moitie, r.data.secret, sel); }
    catch { return 'Le coffre de cet appareil ne s’ouvre pas : utilisez vos 12 mots.'; }
    await ouvrirCoffre();
    return null;
  }, { lien: 'Code oublié ? Utiliser mes 12 mots', action: () => ecranMots('Entrez vos 12 mots de secours, puis choisissez un nouveau code.') });
}

/** Pavé à 6 chiffres. valider(code) renvoie un message d'erreur ou null. */
function pave(titre, aide, valider, extra) {
  ecran.innerHTML = `<div class="au-card au-center au-pave-card">
    <span class="au-badge big">AU</span><h1>${esc(titre)}</h1><p id="pave-aide">${esc(aide)}</p>
    <div class="au-points-code" aria-hidden="true">${'<i></i>'.repeat(6)}</div>
    <p class="au-msg" id="pave-msg" role="alert"></p>
    <div class="au-pave">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-n="${n}">${n}</button>`).join('')}
      <button type="button" data-n="x" aria-label="Effacer">⌫</button><button type="button" data-n="0">0</button><span></span></div>
    ${extra ? `<button type="button" class="au-link" id="pave-extra">${esc(extra.lien)}</button>` : ''}</div>`;
  let code = '';
  let occupe = false;
  const points = [...ecran.querySelectorAll('.au-points-code i')];
  const maj = () => points.forEach((p, i) => p.classList.toggle('on', i < code.length));
  const appui = async (n) => {
    if (occupe) return;
    if (n === 'x') { code = code.slice(0, -1); maj(); return; }
    if (code.length >= 6) return;
    code += n; maj();
    if (code.length === 6) {
      occupe = true;
      $('#pave-msg').textContent = 'Un instant…';
      const msg = await valider(code);
      if (!document.body.contains(points[0])) return; // écran changé
      code = ''; maj(); occupe = false;
      $('#pave-msg').textContent = msg || '';
    }
  };
  ecran.querySelectorAll('.au-pave button').forEach((b) => { b.onclick = () => appui(b.dataset.n); });
  document.onkeydown = (e) => { if (!$('.au-pave')) return; if (/^\d$/.test(e.key)) appui(e.key); else if (e.key === 'Backspace') appui('x'); };
  if (extra) $('#pave-extra').onclick = extra.action;
}

// ================================================================================== ouverture par 12 mots

function ecranMots(message) {
  ecran.innerHTML = `<div class="au-card">
    <h1>Ouvrir avec vos 12 mots</h1><p>${esc(message || '')}</p>
    <div class="au-mots-saisie">${Array.from({ length: 12 }, (_, i) => `<label><span>${i + 1}</span><input data-i="${i}" autocomplete="off" autocapitalize="none" spellcheck="false"></label>`).join('')}</div>
    <p class="au-aide">Astuce : collez les 12 mots d’un coup dans la première case. Les accents ne sont pas obligatoires.</p>
    <p class="au-msg" id="mots-msg" role="alert"></p>
    <button type="button" class="au-btn" id="mots-ok">Ouvrir le coffre</button></div>`;
  const champs = [...ecran.querySelectorAll('[data-i]')];
  champs[0].addEventListener('paste', (e) => {
    const t = (e.clipboardData || window.clipboardData).getData('text').trim().split(/\s+/);
    if (t.length > 1) { e.preventDefault(); t.slice(0, 12).forEach((m, i) => { champs[i].value = m; }); }
  });
  $('#mots-ok').onclick = async () => {
    const msg = $('#mots-msg');
    const v = await C.verifierMots(champs.map((c) => c.value));
    if (!v.ok) { msg.textContent = v.message; return; }
    msg.textContent = 'Ouverture… (quelques secondes)';
    const r = await api('GET', '/api/hub/aureus/coffre');
    if (r.status !== 200) { msg.textContent = r.data.message || 'Serveur injoignable.'; return; }
    let ouvert;
    try { ouvert = await C.ouvrirParMots(v.mots, r.data); } catch { msg.textContent = 'Ces 12 mots n’ouvrent pas ce coffre.'; return; }
    const brut = ouvert.brut;
    choisirCode(async (code) => {
      await inscrireAppareil(code, brut);
      brut.fill(0);
      cle = ouvert.cle;
      await ouvrirCoffre();
    });
  };
}

// ============================================================================================ le coffre

async function ouvrirCoffre() {
  document.onkeydown = null;
  ecran.innerHTML = '<div class="au-card au-center"><div class="au-spin"></div><p>Déchiffrement du coffre…</p></div>';
  const r = await api('GET', '/api/hub/aureus/fiches');
  if (r.status !== 200) { verrouiller(); return ecranMessage('Serveur injoignable', r.data.message || 'Réessayez.'); }
  fiches = new Map(); dossiers = []; illisibles = 0;
  for (const f of r.data.fiches) {
    try {
      const objet = await C.dechiffrerFiche(cle, f.fiche, f.donnees);
      if (f.fiche === ID_DOSSIERS) dossiers = objet.liste || [];
      fiches.set(f.fiche, { objet, version: f.version });
    } catch { illisibles++; }
  }
  $('#top-actions').hidden = false;
  if (envoi) envoi.controle = await C.controleBoite(envoi.cle);
  activite();
  dessinerCoffre();
}

const TYPES = {
  identifiant: { ico: '🔑', nom: 'Identifiant' },
  carte: { ico: '💳', nom: 'Carte bancaire' },
  note: { ico: '📝', nom: 'Note' },
};

function sousTitre(o) {
  if (o.type === 'identifiant') return o.identifiant || o.site || '';
  if (o.type === 'carte') return o.numero ? '•••• ' + String(o.numero).replace(/\s/g, '').slice(-4) : '';
  return 'Note sécurisée'; // jamais le texte dans la liste (regards par-dessus l'épaule)
}

function cheminDossier(id) {
  const out = [];
  let d = dossiers.find((x) => x.id === id);
  while (d && out.length < 20) { out.unshift(d.nom); d = dossiers.find((x) => x.id === d.parent); }
  return out.join(' › ');
}

/** Le dossier et tous ses sous-dossiers (dossiers imbriqués sans limite). */
function descendants(id) {
  const out = new Set([id]);
  let ajout = true;
  while (ajout) { ajout = false; for (const d of dossiers) if (out.has(d.parent) && !out.has(d.id)) { out.add(d.id); ajout = true; } }
  return out;
}

function arbre(parent = '', niveau = 0) {
  return dossiers.filter((d) => (d.parent || '') === parent).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .map((d) => `<button type="button" class="au-dossier ${vue.dossier === d.id ? 'on' : ''}" data-dossier="${esc(d.id)}" data-n="${niveau}">📁 ${esc(d.nom)}</button>${arbre(d.id, niveau + 1)}`).join('');
}

function listeVisible() {
  const r = C.simple(vue.recherche);
  const dans = vue.dossier ? descendants(vue.dossier) : null;
  return [...fiches.entries()].filter(([id, f]) => id !== ID_DOSSIERS).filter(([, f]) => {
    const o = f.objet;
    if (dans && !dans.has(o.dossier || '')) return false;
    if (vue.etiquette && !(o.etiquettes || []).includes(vue.etiquette)) return false;
    if (!r) return true;
    return C.simple([o.titre, o.identifiant, o.site, o.titulaire, o.texte, (o.etiquettes || []).join(' '), cheminDossier(o.dossier)].join(' ')).includes(r);
  }).sort((a, b) => (a[1].objet.titre || '').localeCompare(b[1].objet.titre || '', 'fr'));
}

function dessinerCoffre() {
  const etiquettes = [...new Set([...fiches.values()].flatMap((f) => f.objet.etiquettes || []))].sort((a, b) => a.localeCompare(b, 'fr'));
  const liste = listeVisible();
  ecran.innerHTML = `<div class="au-coffre">
    <aside class="au-cote">
      <button type="button" class="au-dossier ${!vue.dossier ? 'on' : ''}" data-dossier="">🗂️ Tout le coffre</button>
      ${arbre()}
      <button type="button" class="au-link" id="dossier-nouveau">＋ Nouveau dossier</button>
      <a class="au-link" href="recevoir.html${local ? `?e=${ENT}` : ''}">🪄 Recevoir sur ce PC</a>
      ${etiquettes.length ? `<h3>Étiquettes</h3><div class="au-tags">${etiquettes.map((t) => `<button type="button" class="au-tag ${vue.etiquette === t ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
    </aside>
    <section class="au-liste-zone">
      ${envoi ? `<div class="au-envoi"><span>🪄 <b>Relié au PC</b> · contrôle <b>${esc(envoi.controle)}</b><small>Ouvrez une fiche et touchez 🪄 pour envoyer.</small></span><button type="button" class="au-btn ghost" id="envoi-fin">Terminer</button></div>` : ''}
      <div class="au-barre">
        <input type="search" id="recherche" placeholder="Chercher dans le coffre…" value="${esc(vue.recherche)}" autocomplete="off">
        <button type="button" class="au-btn" id="fiche-nouvelle">＋ Nouvelle fiche</button>
      </div>
      ${vue.dossier ? `<p class="au-fil">📁 ${esc(cheminDossier(vue.dossier))} <button type="button" class="au-link" id="dossier-gerer">Renommer ou supprimer</button></p>` : ''}
      ${illisibles ? `<p class="au-alerte">${illisibles} fiche(s) n’ont pas pu être déchiffrées.</p>` : ''}
      <div class="au-liste">${liste.length ? liste.map(([id, f]) => `
        <button type="button" class="au-fiche" data-fiche="${esc(id)}">
          <span class="au-fiche-ico">${TYPES[f.objet.type]?.ico || '📄'}</span>
          <span class="au-fiche-txt"><b>${esc(f.objet.titre || 'Sans titre')}</b><small>${esc(sousTitre(f.objet))}</small>
          ${(f.objet.etiquettes || []).length ? `<span class="au-mini-tags">${f.objet.etiquettes.map((t) => `<i>#${esc(t)}</i>`).join('')}</span>` : ''}</span>
          ${f.objet.dossier && !vue.dossier ? `<span class="au-fiche-dossier">📁 ${esc(cheminDossier(f.objet.dossier))}</span>` : ''}
        </button>`).join('') : `<div class="au-vide">${fiches.size > (dossiers.length || fiches.has(ID_DOSSIERS) ? 1 : 0) ? 'Rien ne correspond.' : 'Votre coffre est vide. Ajoutez votre première fiche !'}</div>`}</div>
    </section></div>`;
  // Retrait des sous-dossiers posé ici (un attribut style dans le HTML est bloqué par la règle de sécurité de la page)
  ecran.querySelectorAll('[data-n]').forEach((el) => el.style.setProperty('--n', el.dataset.n));
  const rech = $('#recherche');
  rech.oninput = () => { vue.recherche = rech.value; const pos = rech.selectionStart; dessinerCoffre(); const n = $('#recherche'); n.focus(); n.setSelectionRange(pos, pos); };
  ecran.querySelectorAll('[data-dossier]').forEach((b) => { b.onclick = () => { vue.dossier = b.dataset.dossier; dessinerCoffre(); }; });
  ecran.querySelectorAll('[data-tag]').forEach((b) => { b.onclick = () => { vue.etiquette = vue.etiquette === b.dataset.tag ? '' : b.dataset.tag; dessinerCoffre(); }; });
  ecran.querySelectorAll('[data-fiche]').forEach((b) => { b.onclick = () => ouvrirFiche(b.dataset.fiche, false); });
  $('#fiche-nouvelle').onclick = () => ouvrirFiche(null, true);
  $('#dossier-nouveau').onclick = nouveauDossier;
  if ($('#dossier-gerer')) $('#dossier-gerer').onclick = gererDossier;
  if ($('#envoi-fin')) $('#envoi-fin').onclick = () => { envoi = null; sessionStorage.removeItem('aureus_envoi'); dessinerCoffre(); };
}

// ---------------------------------------------------------------------------------------------- dossiers

async function enregistrerDossiers() {
  return enregistrer(ID_DOSSIERS, { type: 'dossiers', liste: dossiers });
}

function optionsDossiers(choisi) {
  const out = ['<option value="">— Aucun dossier —</option>'];
  const parcours = (parent, niveau) => dossiers.filter((d) => (d.parent || '') === parent).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).forEach((d) => {
    out.push(`<option value="${esc(d.id)}" ${d.id === choisi ? 'selected' : ''}>${'  '.repeat(niveau)}${niveau ? '└ ' : ''}${esc(d.nom)}</option>`);
    parcours(d.id, niveau + 1);
  });
  parcours('', 0);
  return out.join('');
}

function nouveauDossier() {
  boite(`<h2>Nouveau dossier</h2>
    <label class="au-field">Nom<input id="d-nom" maxlength="60" autocomplete="off"></label>
    <label class="au-field">Dans le dossier<select id="d-parent">${optionsDossiers(vue.dossier)}</select></label>
    <p class="au-msg" id="d-msg"></p>
    <div class="au-row"><button type="button" class="au-btn ghost" data-fermer>Annuler</button><button type="button" class="au-btn" id="d-ok">Créer</button></div>`, (b) => {
    $('#d-ok', b).onclick = async () => {
      const nom = $('#d-nom', b).value.trim();
      if (!nom) { $('#d-msg', b).textContent = 'Donnez un nom.'; return; }
      dossiers.push({ id: nouvelId(), nom, parent: $('#d-parent', b).value });
      if (await enregistrerDossiers()) { fermerBoite(); dessinerCoffre(); }
    };
  });
}

function gererDossier() {
  const d = dossiers.find((x) => x.id === vue.dossier);
  if (!d) return;
  const plein = [...fiches.values()].some((f) => f.objet.dossier === d.id) || dossiers.some((x) => x.parent === d.id);
  boite(`<h2>Dossier « ${esc(d.nom)} »</h2>
    <label class="au-field">Nom<input id="d-nom" maxlength="60" value="${esc(d.nom)}"></label>
    <div class="au-row"><button type="button" class="au-btn ghost" data-fermer>Annuler</button><button type="button" class="au-btn" id="d-ok">Renommer</button></div>
    <button type="button" class="au-btn danger" id="d-suppr" ${plein ? 'disabled' : ''}>Supprimer le dossier</button>
    ${plein ? '<p class="au-aide">Pour le supprimer, videz-le d’abord (fiches et sous-dossiers).</p>' : ''}`, (b) => {
    $('#d-ok', b).onclick = async () => { d.nom = $('#d-nom', b).value.trim() || d.nom; if (await enregistrerDossiers()) { fermerBoite(); dessinerCoffre(); } };
    $('#d-suppr', b).onclick = async () => {
      dossiers = dossiers.filter((x) => x.id !== d.id);
      vue.dossier = d.parent || '';
      if (await enregistrerDossiers()) { fermerBoite(); dessinerCoffre(); }
    };
  });
}

// ------------------------------------------------------------------------------------------------- fiches

function champsType(type, o, edition) {
  const ro = edition ? '' : 'readonly';
  const ligne = (cle, label, opts = {}) => {
    const v = o[cle] || '';
    if (!edition && !v) return '';
    const secret = opts.secret ? 'data-secret' : '';
    return `<label class="au-field">${label}<span class="au-input-row">
      <input data-k="${cle}" ${ro} value="${esc(v)}" ${opts.secret ? 'type="password"' : ''} ${secret} autocomplete="off" autocapitalize="none" spellcheck="false" ${opts.mode ? `inputmode="${opts.mode}"` : ''}>
      ${opts.secret ? '<button type="button" class="au-mini" data-voir title="Afficher">👁</button>' : ''}
      ${opts.generer && edition ? '<button type="button" class="au-mini" data-generer title="Générer un mot de passe">🎲</button>' : ''}
      ${!edition ? `<button type="button" class="au-mini" data-copier="${cle}" title="Copier">📋</button>` : ''}
      ${!edition && envoi ? `<button type="button" class="au-mini au-magique" data-envoyer="${cle}" title="Envoyer au PC">🪄</button>` : ''}</span></label>`;
  };
  const note = (edition || o.note) ? `<label class="au-field">Note<textarea data-k="note" ${ro} rows="3">${esc(o.note || '')}</textarea></label>` : '';
  if (type === 'identifiant') return ligne('identifiant', 'Identifiant') + ligne('mdp', 'Mot de passe', { secret: true, generer: true }) + ligne('site', 'Adresse du site') + note;
  if (type === 'carte') return ligne('titulaire', 'Titulaire') + ligne('numero', 'Numéro de carte', { secret: true, mode: 'numeric' }) + ligne('expiration', 'Expiration (MM/AA)') + ligne('cvv', 'Cryptogramme', { secret: true, mode: 'numeric' }) + note;
  return `<label class="au-field">Texte<textarea data-k="texte" ${ro} rows="8">${esc(o.texte || '')}</textarea></label>
    ${!edition ? `<div class="au-row"><button type="button" class="au-btn ghost" data-copier="texte">📋 Copier le texte</button>${envoi ? '<button type="button" class="au-btn ghost au-magique" data-envoyer="texte">🪄 Envoyer au PC</button>' : ''}<button type="button" class="au-btn ghost" id="f-partager">🔗 Partager par lien</button></div>` : ''}`;
}

function ouvrirFiche(id, edition) {
  const exist = id ? fiches.get(id) : null;
  const o = exist ? { ...exist.objet } : { type: 'identifiant', dossier: vue.dossier, etiquettes: vue.etiquette ? [vue.etiquette] : [] };
  const dessin = (b) => {
    b.innerHTML = `<h2>${TYPES[o.type]?.ico || ''} ${edition ? (exist ? 'Modifier la fiche' : 'Nouvelle fiche') : esc(o.titre || 'Sans titre')}</h2>
      ${edition && !exist ? `<div class="au-types">${Object.entries(TYPES).map(([t, x]) => `<button type="button" class="au-type ${o.type === t ? 'on' : ''}" data-type="${t}">${x.ico} ${x.nom}</button>`).join('')}</div>` : ''}
      ${edition ? `<label class="au-field">Titre<input data-k="titre" value="${esc(o.titre || '')}" maxlength="80" autocomplete="off"></label>` : ''}
      ${champsType(o.type, o, edition)}
      ${edition ? `<label class="au-field">Dossier<select data-k="dossier">${optionsDossiers(o.dossier || '')}</select></label>
        <label class="au-field">Étiquettes <small>(séparées par des virgules : Urgent, Finances…)</small><input data-k="etiquettes" value="${esc((o.etiquettes || []).join(', '))}" autocomplete="off"></label>`
        : `<p class="au-aide">${o.dossier ? '📁 ' + esc(cheminDossier(o.dossier)) : ''} ${(o.etiquettes || []).map((t) => '#' + esc(t)).join(' ')}</p>`}
      <p class="au-msg" id="f-msg"></p>
      <div class="au-row">${edition
        ? `<button type="button" class="au-btn ghost" data-fermer>Annuler</button><button type="button" class="au-btn" id="f-ok">Enregistrer</button>`
        : `<button type="button" class="au-btn ghost" data-fermer>Fermer</button><button type="button" class="au-btn" id="f-modif">Modifier</button>`}</div>
      ${!edition ? '<button type="button" class="au-link danger" id="f-suppr">Supprimer cette fiche</button>' : ''}`;
    b.querySelectorAll('[data-type]').forEach((x) => { x.onclick = () => { lire(b); o.type = x.dataset.type; dessin(b); }; });
    b.querySelectorAll('[data-voir]').forEach((x) => { x.onclick = () => { const i = x.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; }; });
    b.querySelectorAll('[data-generer]').forEach((x) => { x.onclick = () => { const i = x.parentNode.querySelector('input'); i.value = C.motDePasse(20); i.type = 'text'; }; });
    b.querySelectorAll('[data-copier]').forEach((x) => { x.onclick = () => copier(o[x.dataset.copier] || ''); });
    b.querySelectorAll('[data-envoyer]').forEach((x) => { x.onclick = () => envoyerAuPc(x.dataset.envoyer, o); });
    if ($('#f-modif', b)) $('#f-modif', b).onclick = () => { edition = true; dessin(b); };
    if ($('#f-partager', b)) $('#f-partager', b).onclick = () => { fermerBoite(); composerLien(o.texte || ''); };
    if ($('#f-suppr', b)) $('#f-suppr', b).onclick = async () => {
      if (!confirm('Supprimer cette fiche ? Elle ne pourra pas être récupérée.')) return;
      const r = await api('DELETE', '/api/hub/aureus/fiches/' + encodeURIComponent(id));
      if (r.status !== 200) { $('#f-msg', b).textContent = r.data.message || 'Suppression impossible.'; return; }
      fiches.delete(id); fermerBoite(); dessinerCoffre();
    };
    if ($('#f-ok', b)) $('#f-ok', b).onclick = async () => {
      lire(b);
      if (!String(o.titre || '').trim()) { $('#f-msg', b).textContent = 'Donnez un titre.'; return; }
      if (await enregistrer(id || nouvelId(), o, $('#f-msg', b))) { fermerBoite(); dessinerCoffre(); }
    };
  };
  const lire = (b) => {
    b.querySelectorAll('[data-k]').forEach((i) => {
      if (i.dataset.k === 'etiquettes') o.etiquettes = [...new Set(i.value.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 12);
      else o[i.dataset.k] = i.value;
    });
  };
  boite('', dessin);
}

/** Chiffre et envoie une fiche. En cas de modification sur un autre appareil, on recharge et on prévient. */
async function enregistrer(id, objet, msgEl) {
  const avant = fiches.get(id);
  const donnees = await C.chiffrerFiche(cle, id, objet);
  const r = await api('PUT', '/api/hub/aureus/fiches/' + encodeURIComponent(id), { donnees, version: avant ? avant.version : undefined });
  if (r.status === 409 && r.data.actuelle) {
    try { fiches.set(id, { objet: await C.dechiffrerFiche(cle, id, r.data.actuelle.donnees), version: r.data.actuelle.version }); } catch { /* ignoré */ }
    if (id === ID_DOSSIERS) dossiers = fiches.get(id)?.objet.liste || dossiers;
    const m = 'Cette fiche a changé sur un autre appareil : la version la plus récente est affichée, refaites votre modification.';
    if (msgEl) msgEl.textContent = m; else toast(m);
    return false;
  }
  if (r.status !== 200) { const m = r.data.message || 'Enregistrement impossible.'; if (msgEl) msgEl.textContent = m; else toast(m); return false; }
  fiches.set(id, { objet: { ...objet }, version: r.data.version });
  return true;
}

const LIBELLES = { identifiant: ['Identifiant'], mdp: ['Mot de passe', true], site: ['Adresse du site'], titulaire: ['Titulaire'],
  numero: ['Numéro de carte', true], expiration: ['Expiration'], cvv: ['Cryptogramme', true], texte: ['Note', true] };

/** Lien magique : chiffre le champ avec la clé du QR et le dépose dans la boîte du PC. */
async function envoyerAuPc(champ, o) {
  if (!envoi) return;
  const [libelle, secret] = LIBELLES[champ] || [champ];
  const donnees = await C.chiffrerBoite(envoi.cle, { libelle, titre: o.titre || '', valeur: o[champ] || '', secret: !!secret });
  const r = await api('POST', `/api/hub/aureus/boites/${envoi.id}/envoi`, { donnees });
  if (r.status === 200) { toast(`🪄 ${libelle} envoyé au PC`); return; }
  if (r.status === 404) { envoi = null; sessionStorage.removeItem('aureus_envoi'); fermerBoite(); dessinerCoffre(); }
  toast(r.data.message || 'Envoi impossible.');
}

async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    toast('Copié. Le presse-papiers sera vidé dans 30 secondes.');
    clearTimeout(copier.t);
    copier.t = setTimeout(() => { if (document.hasFocus()) navigator.clipboard.writeText('').catch(() => {}); }, 30000);
  } catch { toast('Copie impossible sur ce navigateur.'); }
}

// ------------------------------------------------------------------------------------ lien autodestructible

function composerLien(texte = '') {
  boite(`<h2>🔗 Lien autodestructible</h2>
    <p class="au-aide">Le message est chiffré sur cet appareil. Le lien ne s’ouvre <b>qu’une seule fois</b>, puis il est effacé du serveur.
    La clé est dans le lien lui-même : le serveur ne peut pas lire le message.</p>
    <label class="au-field">Message<textarea id="l-texte" rows="6" maxlength="10000">${esc(texte)}</textarea></label>
    <label class="au-field">Le lien expire au bout de<select id="l-duree"><option value="1">1 heure</option><option value="24" selected>1 jour</option><option value="168">7 jours</option></select></label>
    <p class="au-msg" id="l-msg"></p>
    <div id="l-resultat"></div>
    <div class="au-row"><button type="button" class="au-btn ghost" data-fermer>Fermer</button><button type="button" class="au-btn" id="l-ok">Créer le lien</button></div>`, (b) => {
    $('#l-ok', b).onclick = async () => {
      const t = $('#l-texte', b).value;
      if (!t.trim()) { $('#l-msg', b).textContent = 'Écrivez un message.'; return; }
      const { donnees, cle: k } = await C.chiffrerLien(t);
      const r = await api('POST', '/api/hub/aureus/liens', { donnees, heures: +$('#l-duree', b).value });
      if (r.status !== 200) { $('#l-msg', b).textContent = r.data.message || 'Création impossible.'; return; }
      const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}lien.html${local ? `?e=${ENT}` : ''}#${r.data.id}.${k}`;
      $('#l-msg', b).textContent = '';
      $('#l-resultat', b).innerHTML = `<label class="au-field">Votre lien (une seule lecture)<span class="au-input-row"><input readonly value="${esc(url)}"><button type="button" class="au-mini" id="l-copier">📋</button></span></label>
        <p class="au-aide">Conseil : envoyez le lien et dites par un autre moyen (téléphone, de vive voix) à quoi il sert.</p>`;
      $('#l-copier', b).onclick = () => copier(url);
      $('#l-ok', b).hidden = true;
      $('#l-texte', b).value = '';
    };
  });
}

// ---------------------------------------------------------------------------------------------- réglages

async function reglages() {
  const r = await api('GET', '/api/hub/aureus/appareils');
  const moi = (lireAppareil() || {}).appareil;
  const liste = r.status === 200 ? r.data.appareils : [];
  boite(`<h2>⚙️ Réglages du coffre</h2>
    <h3>Appareils qui ouvrent le coffre</h3>
    <div class="au-appareils">${liste.map((a) => `<div class="au-appareil"><span>${a.appareil === moi ? '📍 ' : ''}${esc(a.nom || 'Appareil')}${a.bloque ? ' · <b class="danger">bloqué</b>' : ''}<small>${a.vu_le ? 'Vu le ' + new Date(a.vu_le.replace(' ', 'T')).toLocaleDateString('fr-FR') : ''}</small></span>
      <button type="button" class="au-link danger" data-oublier="${esc(a.appareil)}">Oublier</button></div>`).join('') || '<p class="au-aide">Aucun.</p>'}</div>
    <p class="au-aide">« Oublier » un appareil perdu : il ne pourra plus ouvrir le coffre avec son code (les 12 mots restent valables).</p>
    <h3>Vos 12 mots</h3>
    <p class="au-aide">Ils ne sont gardés nulle part en clair, même pas ici. Si vous les perdez ET oubliez votre code, le coffre est perdu.</p>
    <div class="au-row"><button type="button" class="au-btn ghost" data-fermer>Fermer</button></div>`, (b) => {
    b.querySelectorAll('[data-oublier]').forEach((x) => {
      x.onclick = async () => {
        const ici = x.dataset.oublier === moi;
        if (!confirm(ici ? 'Oublier CET appareil ? Il faudra vos 12 mots pour rouvrir le coffre ici.' : 'Oublier cet appareil ?')) return;
        await api('DELETE', '/api/hub/aureus/appareils/' + encodeURIComponent(x.dataset.oublier));
        if (ici) { localStorage.removeItem(CLE_APPAREIL()); fermerBoite(); demarrer(); return; }
        fermerBoite(); reglages();
      };
    });
  });
}

// ----------------------------------------------------------------------------------------- boîte de dialogue

function boite(html, init) {
  fermerBoite();
  const d = document.createElement('dialog');
  d.className = 'au-boite';
  d.innerHTML = `<div class="au-boite-in">${html}</div>`;
  document.body.appendChild(d);
  const inner = d.firstChild;
  inner.addEventListener('click', (e) => { if (e.target.closest('[data-fermer]')) fermerBoite(); });
  d.addEventListener('cancel', () => setTimeout(fermerBoite));
  if (init) init(inner);
  d.showModal();
}
function fermerBoite() { document.querySelectorAll('dialog.au-boite').forEach((d) => { d.close(); d.remove(); }); }

// ------------------------------------------------------------------------------------------- verrouillage

function verrouiller(redemarrer = true) {
  cle = null; fiches = new Map(); dossiers = []; vue = { dossier: '', etiquette: '', recherche: '' };
  fermerBoite();
  $('#top-actions').hidden = true;
  if (redemarrer) demarrer();
}

// 5 minutes sans activité, ou 1 minute en arrière-plan : le coffre se referme
let derniere = Date.now();
let cachee = 0;
function activite() { derniere = Date.now(); }
['pointerdown', 'keydown', 'scroll'].forEach((ev) => document.addEventListener(ev, activite, { passive: true }));
// Protection des regards (15/10) : une page web ne peut pas interdire les captures d'écran (l'appli Android le fera),
// mais on masque le coffre dès qu'on quitte l'onglet ou l'appli (aperçu des applis ouvertes, partage d'écran).
const voile = document.createElement('div');
voile.className = 'au-voile';
voile.innerHTML = '<span class="au-badge big">AU</span><b>Aureus</b>';
document.body.appendChild(voile);
const masquer = (oui) => document.body.classList.toggle('au-masque', oui && !!cle);
window.addEventListener('blur', () => masquer(true));
window.addEventListener('focus', () => masquer(false));
document.addEventListener('visibilitychange', () => {
  masquer(document.hidden);
  if (document.hidden) cachee = Date.now();
  else if (cle && cachee && Date.now() - cachee > 60000) verrouiller();
});
setInterval(() => { if (cle && Date.now() - derniere > 5 * 60000) verrouiller(); }, 15000);

$('#btn-verrou').onclick = () => verrouiller();
$('#btn-lien').onclick = () => composerLien();
$('#btn-reglages').onclick = reglages;

demarrer();
