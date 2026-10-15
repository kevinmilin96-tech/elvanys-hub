// Aureus — coffre-fort numérique, ébauche du 15/10/2026 (étape 1 : le socle + lien autodestructible).
// Ouvert depuis le hub (même adresse, même compte). Tout est chiffré ici, sur l'appareil : le serveur ne reçoit
// que des blocs illisibles (voir coffre-crypto.js). La clé du coffre ne vit qu'en mémoire, effacée au verrouillage.
import * as C from './coffre-crypto.js?v=__VERSION__';
import { ouvrirVue, fermerVue } from './vue.js?v=__VERSION__';

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

async function api(method, path, body, texteBrut = false) {
  try {
    const r = await fetch(API + path, {
      method, cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: jeton() || '' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (texteBrut) return { status: r.status, texte: await r.text().catch(() => ''), data: {} };
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
    <img src="logo.svg?v=__VERSION__" alt="" class="au-logo grand"><h1>Aureus</h1>
    <p>Le coffre-fort s’ouvre avec votre compte de l’espace magasin.</p>
    <a class="au-btn" href="../?rester=1">Me connecter à l’espace magasin</a>
    <a class="au-link" href="recevoir.html${local ? `?e=${ENT}` : ''}">🪄 Recevoir un mot de passe sur ce PC (sans me connecter)</a></div>`;
}

function ecranMessage(titre, texte) {
  ecran.innerHTML = `<div class="au-card au-center"><img src="logo.svg?v=__VERSION__" alt="" class="au-logo grand"><h1>${esc(titre)}</h1><p>${esc(texte)}</p>
    <a class="au-btn ghost" href="../?rester=1">Retour à l’espace magasin</a></div>`;
}

// ===================================================================================== création du coffre

function ecranCreation() {
  ecran.innerHTML = `<div class="au-card">
    <img src="logo.svg?v=__VERSION__" alt="" class="au-logo grand">
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
    <button type="button" class="au-btn ghost" id="mots-copier">📋 Copier les 12 mots</button>
    <p class="au-aide">Pour les coller dans votre gestionnaire de mots de passe : le presse-papiers est vidé tout seul 30 secondes après.</p>
    <label class="au-check"><input type="checkbox" id="mots-notes"> J’ai noté mes 12 mots</label>
    <button type="button" class="au-btn" id="mots-suite" disabled>Vérifier</button></div>`;
  $('#mots-copier').onclick = () => copier(mots.join(' '));
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
    <img src="logo.svg?v=__VERSION__" alt="" class="au-logo grand"><h1>${esc(titre)}</h1><p id="pave-aide">${esc(aide)}</p>
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

/** Déchiffre toutes les fiches puis passe la main à la vue « façon Proton Pass » (vue.js). */
async function ouvrirCoffre() {
  document.onkeydown = null;
  ecran.innerHTML = '<div class="au-card au-center"><div class="au-spin"></div><p>Déchiffrement du coffre…</p></div>';
  const r = await api('GET', '/api/hub/aureus/fiches');
  if (r.status !== 200) { verrouiller(false); return ecranMessage('Serveur injoignable', r.data.message || 'Réessayez.'); }
  fiches = new Map(); illisibles = 0;
  for (const f of r.data.fiches) {
    try { fiches.set(f.fiche, { objet: await C.dechiffrerFiche(cle, f.fiche, f.donnees), version: f.version }); } catch { illisibles++; }
  }
  if (envoi) envoi.controle = await C.controleBoite(envoi.cle);
  $('#top-actions').hidden = false;
  activite();
  await ouvrirVue({
    api, fiches, enregistrer, effacer, toast, copier, boite, fermerBoite, envoyerAuPc, local, ENT,
    prenom: compte.prenom, illisibles,
    get envoi() { return envoi; },
    finEnvoi: () => { envoi = null; sessionStorage.removeItem('aureus_envoi'); },
    monAppareil: () => (lireAppareil() || {}).appareil,
    oublierIci: () => { localStorage.removeItem(CLE_APPAREIL()); fermerBoite(); demarrer(); },
  }, ecran);
  if (illisibles) toast(`${illisibles} fiche(s) n’ont pas pu être déchiffrées.`);
}

/** Chiffre et envoie une fiche. En cas de modification sur un autre appareil, on recharge et on prévient. */
async function enregistrer(id, objet, msgEl) {
  const avant = fiches.get(id);
  const propre = { ...objet };
  delete propre._id;
  const donnees = await C.chiffrerFiche(cle, id, propre);
  const r = await api('PUT', '/api/hub/aureus/fiches/' + encodeURIComponent(id), { donnees, version: avant ? avant.version : undefined });
  if (r.status === 409 && r.data.actuelle) {
    try { fiches.set(id, { objet: await C.dechiffrerFiche(cle, id, r.data.actuelle.donnees), version: r.data.actuelle.version }); } catch { /* ignoré */ }
    const m = 'Cette fiche a changé sur un autre appareil : la version la plus récente est affichée, refaites votre modification.';
    if (msgEl) msgEl.textContent = m; else toast(m);
    return false;
  }
  if (r.status !== 200) { const m = r.data.message || 'Enregistrement impossible.'; if (msgEl) msgEl.textContent = m; else toast(m); return false; }
  fiches.set(id, { objet: { ...propre, _id: id }, version: r.data.version });
  return true;
}

async function effacer(id) {
  const r = await api('DELETE', '/api/hub/aureus/fiches/' + encodeURIComponent(id));
  if (r.status === 200) fiches.delete(id); else toast(r.data.message || 'Suppression impossible.');
  return r.status === 200;
}

/** Lien magique : chiffre la valeur avec la clé du QR et la dépose dans la boîte du PC. */
async function envoyerAuPc(libelle, titre, valeur, secret) {
  if (!envoi) return;
  const donnees = await C.chiffrerBoite(envoi.cle, { libelle, titre: titre || '', valeur: valeur || '', secret: !!secret });
  const r = await api('POST', `/api/hub/aureus/boites/${envoi.id}/envoi`, { donnees });
  if (r.status === 200) { toast(`🪄 ${libelle} envoyé au PC`); return; }
  if (r.status === 404) { envoi = null; sessionStorage.removeItem('aureus_envoi'); fermerBoite(); }
  toast(r.data.message || 'Envoi impossible.');
  if (r.status === 404) document.querySelector('.au-envoi')?.remove();
}

async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    toast('Copié. Le presse-papiers sera vidé dans 30 secondes.');
    clearTimeout(copier.t);
    copier.t = setTimeout(() => { if (document.hasFocus()) navigator.clipboard.writeText('').catch(() => {}); }, 30000);
  } catch { toast('Copie impossible sur ce navigateur.'); }
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
  cle = null; fiches = new Map();
  fermerVue();
  fermerBoite();
  document.body.classList.remove('au-coffre-ouvert');
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
voile.innerHTML = '<img src="logo.svg?v=__VERSION__" alt="" class="au-logo grand"><b>Aureus</b>';
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

demarrer();
