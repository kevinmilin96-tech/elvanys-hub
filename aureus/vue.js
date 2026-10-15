// Aureus — le coffre ouvert, « façon Proton Pass » (15/10/2026).
// PC : 3 colonnes sombres (menu · liste · fiche) ; téléphone : clair, tableau de bord, une page à la fois.
// Tout est déchiffré ici, en mémoire ; chaque enregistrement repart chiffré (ctx.enregistrer).
// Règle de la page (CSP) : aucun attribut style dans le HTML → couleurs et pourcentages posés par JS (data-c, data-p).
import * as C from './coffre-crypto.js?v=__VERSION__';
import * as O from './outils.js?v=__VERSION__';
import { TYPES, ORDRE_TYPES, COULEURS_COFFRE, ICONES_COFFRE } from './types.js?v=__VERSION__';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nouvelId = () => C.b64url(C.hasard(12));
const maintenantIso = () => new Date().toISOString();
const dateFr = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

// Fiches spéciales (rangées chiffrées comme les autres, jamais montrées dans la liste)
export const SPECIAUX = { coffres: 'coffres-du-compte', dossiers: 'dossiers-du-coffre', historique: 'historique-generateur', fuites: 'sante-fuites' };
const EST_SPECIALE = new Set(Object.values(SPECIAUX));
const CORBEILLE_JOURS = 30;

let ctx = null;   // { api, fiches(Map), enregistrer, effacer, toast, copier, boite, fermerBoite, envoi, prenom, local, ENT, envoyerAuPc }
let etat = null;
let racine = null;
let minuteur = null;

// ================================================================================================ données

const lire = (id, defaut) => ctx.fiches.get(id)?.objet || defaut;
const coffres = () => lire(SPECIAUX.coffres, { liste: [] }).liste;
const dossiers = () => lire(SPECIAUX.dossiers, { liste: [] }).liste;
const coffreDe = (id) => coffres().find((c) => c.id === id) || coffres()[0] || { id: '', nom: 'Coffre', couleur: '#c9962e', icone: '🔒' };

/** Les vraies fiches (ni spéciales) ; corbeille = dans la corbeille seulement. */
function elements(corbeille = false) {
  const out = [];
  for (const [id, f] of ctx.fiches) {
    if (EST_SPECIALE.has(id)) continue;
    if (!!f.objet.corbeille !== corbeille) continue;
    out.push([id, f.objet]);
  }
  return out;
}

function sousTitre(o) {
  switch (o.type) {
    case 'identifiant': case 'logiciel': return o.identifiant || O.domaine((o.sites || [])[0]) || '';
    case 'carte': return o.numero ? '•••• ' + String(o.numero).replace(/\s/g, '').slice(-4) : (o.titulaire || '');
    case 'note': return 'Note sécurisée';
    case 'identite': return [o.prenom, o.nom].filter(Boolean).join(' ');
    case 'code': return o.lieu || 'Code';
    case 'wifi': return o.ssid || 'Wi-Fi';
    case 'ssh': return [o.utilisateur, o.hote].filter(Boolean).join('@');
    case 'motdepasse': return 'Mot de passe';
    default: return `${(o.perso || []).length} champ(s)`;
  }
}

function avatar(o, grand = false) {
  const site = O.domaine((o.sites || [])[0]);
  const t = TYPES[o.type] || TYPES.perso;
  const lettre = (site || o.titre || '?').trim().charAt(0).toUpperCase();
  const avecLettre = ['identifiant', 'logiciel'].includes(o.type) && lettre;
  return `<span class="au-av${grand ? ' grand' : ''}" data-c="${avecLettre ? O.couleurDe(site || o.titre) : '#1b2333'}">${esc(avecLettre ? lettre : t.ico)}</span>`;
}

function chipCoffre(o) {
  const c = coffreDe(o.coffre);
  return `<span class="au-chip" data-c="${esc(c.couleur)}"><i class="au-point"></i>${esc(c.icone)} ${esc(c.nom)}</span>`;
}

function filtrer() {
  const r = C.simple(etat.recherche);
  const dans = etat.dossier ? descendants(etat.dossier) : null;
  let liste = elements(false).filter(([, o]) => {
    if (etat.coffre && (o.coffre || coffres()[0]?.id) !== etat.coffre) return false;
    if (etat.categorie === '2fa' ? !o.totp : etat.categorie && o.type !== etat.categorie) return false;
    if (dans && !dans.has(o.dossier || '')) return false;
    if (etat.etiquette && !(o.etiquettes || []).includes(etat.etiquette)) return false;
    if (etat.tri === 'favoris' && !o.favori) return false;
    if (etat.sante && !(ctx.sante?.[etat.sante] || new Set()).has(o._id)) return false;
    if (!r) return true;
    const texte = [o.titre, o.identifiant, (o.sites || []).join(' '), o.titulaire, o.ssid, o.lieu, o.prenom, o.nom, o.utilisateur, o.hote,
      (o.etiquettes || []).join(' '), cheminDossier(o.dossier), coffreDe(o.coffre).nom].join(' ');
    return C.simple(texte).includes(r);
  });
  liste = liste.sort((a, b) => (etat.tri === 'az'
    ? (a[1].titre || '').localeCompare(b[1].titre || '', 'fr')
    : String(b[1].modifie_le || '').localeCompare(String(a[1].modifie_le || ''))));
  return liste;
}

function cheminDossier(id) {
  const out = [];
  let d = dossiers().find((x) => x.id === id);
  while (d && out.length < 20) { out.unshift(d.nom); const p = d.parent; d = dossiers().find((x) => x.id === p); }
  return out.join(' › ');
}
function descendants(id) {
  const out = new Set([id]);
  let ajout = true;
  while (ajout) { ajout = false; for (const d of dossiers()) if (out.has(d.parent) && !out.has(d.id)) { out.add(d.id); ajout = true; } }
  return out;
}

// ================================================================================================ démarrage

/** Ouvre la vue du coffre. Les fiches sont déjà déchiffrées dans ctx.fiches. */
export async function ouvrirVue(contexte, element) {
  ctx = contexte;
  racine = element;
  etat = { coffre: '', categorie: '', dossier: '', etiquette: '', recherche: '', tri: 'recents', sante: '', detail: { kind: 'accueil' }, page: 'accueil', menu: false };
  for (const [id, f] of ctx.fiches) f.objet._id = id;
  await preparer();
  dessiner();
  clearInterval(minuteur);
  minuteur = setInterval(rafraichirCodes, 1000);
}

export function fermerVue() { clearInterval(minuteur); minuteur = null; ctx = null; }

/** Premier lancement de cette version : coffre « Personnel », anciennes fiches rangées dedans, corbeille vidée après 30 j. */
async function preparer() {
  if (!coffres().length) {
    await ctx.enregistrer(SPECIAUX.coffres, { type: 'coffres', liste: [{ id: nouvelId(), nom: 'Personnel', couleur: '#2fb37a', icone: '🏠' }] });
  }
  const premier = coffres()[0].id;
  const limite = Date.now() - CORBEILLE_JOURS * 86400000;
  for (const [id, o] of elements(true)) if (new Date(o.corbeille).getTime() < limite) await ctx.effacer(id);
  for (const [id, o] of [...elements(false), ...elements(true)]) {
    let change = false;
    if (!o.coffre || !coffres().some((c) => c.id === o.coffre)) { o.coffre = premier; change = true; }
    if (o.site && !o.sites) { o.sites = [o.site]; delete o.site; change = true; }           // ancien format (étape 1)
    if (o.type === 'identifiant' && o.note === undefined) { o.note = ''; }
    if (change) await ctx.enregistrer(id, o);
  }
  ctx.sante = await calculerSante(false);
}

// ================================================================================================ dessin

function dessiner() {
  racine.innerHTML = `<div class="au-app" data-page="${etat.page}">
    <nav class="au-menu${etat.menu ? ' ouvert' : ''}" id="menu"></nav>
    <div class="au-voile-menu" id="voile-menu"></div>
    <section class="au-colonne-liste" id="liste"></section>
    <section class="au-colonne-detail" id="detail"></section>
    <nav class="au-bas"><button type="button" data-aller="accueil" class="${etat.page === 'accueil' ? 'on' : ''}">🏠<span>Coffre</span></button>
      <button type="button" class="au-plus" data-aller="ajouter" aria-label="Ajouter">＋</button>
      <button type="button" data-aller="sante" class="${etat.detail.kind === 'sante' ? 'on' : ''}">🛡️<span>Santé</span></button></nav>
  </div>`;
  dessinerMenu(); dessinerListe(); dessinerDetail();
  racine.querySelectorAll('[data-aller]').forEach((b) => { b.onclick = () => aller(b.dataset.aller); });
  $('#voile-menu').onclick = () => { etat.menu = false; dessiner(); };
  document.body.classList.add('au-coffre-ouvert');
}

function poserStyles(el) {
  el.querySelectorAll('[data-c]').forEach((x) => x.style.setProperty('--c', x.dataset.c));
  el.querySelectorAll('[data-p]').forEach((x) => x.style.setProperty('--p', x.dataset.p));
  el.querySelectorAll('[data-n]').forEach((x) => x.style.setProperty('--n', x.dataset.n));
}

/** Aller vers une page (téléphone) / un panneau (PC). */
function aller(ou, extra) {
  etat.menu = false;
  if (ou === 'accueil') { Object.assign(etat, { detail: { kind: 'accueil' }, page: 'accueil' }); }
  else if (ou === 'liste') { Object.assign(etat, extra || {}); etat.page = 'liste'; if (!estPc()) etat.detail = { kind: 'accueil' }; }
  else { etat.detail = { kind: ou, ...(extra || {}) }; etat.page = 'detail'; }
  dessiner();
  if (!estPc()) window.scrollTo(0, 0);
}
const estPc = () => window.matchMedia('(min-width: 900px)').matches;

// --------------------------------------------------------------------------------------------------- menu

function dessinerMenu() {
  const m = $('#menu');
  const tous = elements(false);
  const parCoffre = (id) => tous.filter(([, o]) => o.coffre === id).length;
  const parType = (t) => tous.filter(([, o]) => (t === '2fa' ? o.totp : o.type === t)).length;
  const etiquettes = [...new Set(tous.flatMap(([, o]) => o.etiquettes || []))].sort((a, b) => a.localeCompare(b, 'fr'));
  const arbre = (parent = '', n = 0) => dossiers().filter((d) => (d.parent || '') === parent && (!etat.coffre || !d.coffre || d.coffre === etat.coffre))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .map((d) => `<button type="button" class="au-lig${etat.dossier === d.id ? ' on' : ''}" data-dossier="${esc(d.id)}" data-n="${n}">📁 ${esc(d.nom)}</button>${arbre(d.id, n + 1)}`).join('');
  m.innerHTML = `
    <div class="au-moi"><img src="logo.svg?v=__VERSION__" alt="" class="au-logo"><div><b>${esc(ctx.prenom || 'Mon coffre')}</b><small>Coffre ouvert · se ferme seul</small></div></div>
    <h4>Coffres</h4>
    <button type="button" class="au-lig${!etat.coffre ? ' on' : ''}" data-coffre=""><i class="au-point" data-c="#c9962e"></i>Tous les coffres<span>${tous.length}</span></button>
    ${coffres().map((c) => `<div class="au-lig-groupe"><button type="button" class="au-lig${etat.coffre === c.id ? ' on' : ''}" data-coffre="${esc(c.id)}"><i class="au-point" data-c="${esc(c.couleur)}"></i>${esc(c.icone)} ${esc(c.nom)}<span>${parCoffre(c.id)}</span></button>
      ${etat.coffre === c.id ? `<button type="button" class="au-mini-btn" data-regler-coffre="${esc(c.id)}" title="Modifier ce coffre">✏️</button>` : ''}</div>`).join('')}
    <button type="button" class="au-lig au-ajout" id="coffre-nouveau">＋ Nouveau coffre</button>
    <h4>Catégories</h4>
    ${ORDRE_TYPES.filter((t) => parType(t)).map((t) => `<button type="button" class="au-lig${etat.categorie === t ? ' on' : ''}" data-categorie="${t}">${TYPES[t].ico} ${esc(TYPES[t].nom)}<span>${parType(t)}</span></button>`).join('')}
    ${parType('2fa') ? `<button type="button" class="au-lig${etat.categorie === '2fa' ? ' on' : ''}" data-categorie="2fa">⏱️ Avec code 2FA<span>${parType('2fa')}</span></button>` : ''}
    ${dossiers().length ? `<h4>Dossiers</h4>${arbre()}` : ''}
    <button type="button" class="au-lig au-ajout" id="dossier-nouveau">＋ Nouveau dossier</button>
    ${etiquettes.length ? `<h4>Étiquettes</h4><div class="au-tags">${etiquettes.map((t) => `<button type="button" class="au-tag${etat.etiquette === t ? ' on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
    <h4>Outils</h4>
    <button type="button" class="au-lig" data-outil="codes">⏱️ Authentificateur</button>
    <button type="button" class="au-lig" data-outil="generateur">🎲 Générateur</button>
    <button type="button" class="au-lig" data-outil="sante">🛡️ Santé du coffre<span class="or">${ctx.sante ? ctx.sante.score + ' %' : ''}</span></button>
    <button type="button" class="au-lig" data-outil="lien">🔗 Lien à lecture unique</button>
    <a class="au-lig" href="recevoir.html${ctx.local ? `?e=${ctx.ENT}` : ''}">🪄 Recevoir sur ce PC</a>
    <button type="button" class="au-lig" data-outil="import">📥 Importer (Proton Pass…)</button>
    <button type="button" class="au-lig" data-outil="corbeille">🗑️ Corbeille<span>${elements(true).length || ''}</span></button>
    <button type="button" class="au-lig" data-outil="reglages">⚙️ Réglages</button>`;
  poserStyles(m);
  const filtreListe = (f) => aller('liste', { coffre: etat.coffre, categorie: '', dossier: '', etiquette: '', sante: '', ...f });
  m.querySelectorAll('[data-coffre]').forEach((b) => { b.onclick = () => filtreListe({ coffre: b.dataset.coffre }); });
  m.querySelectorAll('[data-categorie]').forEach((b) => { b.onclick = () => filtreListe({ categorie: etat.categorie === b.dataset.categorie ? '' : b.dataset.categorie }); });
  m.querySelectorAll('[data-dossier]').forEach((b) => { b.onclick = () => filtreListe({ dossier: etat.dossier === b.dataset.dossier ? '' : b.dataset.dossier }); });
  m.querySelectorAll('[data-tag]').forEach((b) => { b.onclick = () => filtreListe({ etiquette: etat.etiquette === b.dataset.tag ? '' : b.dataset.tag }); });
  m.querySelectorAll('[data-outil]').forEach((b) => { b.onclick = () => aller(b.dataset.outil); });
  m.querySelectorAll('[data-regler-coffre]').forEach((b) => { b.onclick = () => reglerCoffre(b.dataset.reglerCoffre); });
  $('#coffre-nouveau', m).onclick = () => reglerCoffre(null);
  $('#dossier-nouveau', m).onclick = nouveauDossier;
}

// -------------------------------------------------------------------------------------------------- liste

function titreListe() {
  if (etat.sante) return { faibles: 'Mots de passe faibles', reutilises: 'Mots de passe réutilisés', fuites: 'Retrouvés dans des fuites', sans2fa: 'Sans code 2FA' }[etat.sante];
  const morceaux = [];
  if (etat.coffre) morceaux.push(coffreDe(etat.coffre).nom);
  if (etat.categorie) morceaux.push(etat.categorie === '2fa' ? 'Avec code 2FA' : TYPES[etat.categorie].nom);
  if (etat.dossier) morceaux.push(cheminDossier(etat.dossier));
  if (etat.etiquette) morceaux.push('#' + etat.etiquette);
  return morceaux.join(' · ') || 'Tout le coffre';
}

function dessinerListe() {
  const z = $('#liste');
  const envoi = ctx.envoi;
  z.innerHTML = `
    <div class="au-liste-tete">
      <button type="button" class="au-rond au-tel-seul" id="liste-retour" aria-label="Retour">←</button>
      <b class="au-liste-titre">${esc(titreListe())}</b>
      <button type="button" class="au-rond au-tel-seul" id="liste-menu" aria-label="Menu">☰</button>
    </div>
    ${envoi ? `<div class="au-envoi"><span>🪄 <b>Relié au PC</b> · contrôle <b>${esc(envoi.controle)}</b><small>Ouvrez une fiche et touchez 🪄.</small></span><button type="button" class="au-btn ghost petit" id="envoi-fin">Terminer</button></div>` : ''}
    <div class="au-rech"><input type="search" id="recherche" placeholder="Chercher : site, identifiant, note…" value="${esc(etat.recherche)}" autocomplete="off"><span>⌕</span></div>
    <div class="au-filtres">${[['recents', 'Récents'], ['az', 'A → Z'], ['favoris', '★ Favoris']].map(([k, l]) => `<button type="button" class="${etat.tri === k ? 'on' : ''}" data-tri="${k}">${l}</button>`).join('')}
      ${etat.coffre || etat.categorie || etat.dossier || etat.etiquette || etat.sante ? '<button type="button" id="filtre-effacer">✕ Tout voir</button>' : ''}</div>
    <div class="au-items" id="items"></div>
    <button type="button" class="au-fab au-pc-seul" data-aller-detail="ajouter" aria-label="Ajouter">＋</button>`;
  dessinerItems();
  const rech = $('#recherche', z);
  rech.oninput = () => { etat.recherche = rech.value; dessinerItems(); };
  z.querySelectorAll('[data-tri]').forEach((b) => { b.onclick = () => { etat.tri = b.dataset.tri; dessinerListe(); }; });
  if ($('#filtre-effacer', z)) $('#filtre-effacer', z).onclick = () => aller('liste', { coffre: '', categorie: '', dossier: '', etiquette: '', sante: '' });
  $('#liste-retour', z).onclick = () => aller('accueil');
  $('#liste-menu', z).onclick = () => { etat.menu = true; dessiner(); };
  $('[data-aller-detail]', z).onclick = () => aller('ajouter');
  if ($('#envoi-fin', z)) $('#envoi-fin', z).onclick = () => { ctx.finEnvoi(); dessiner(); };
}

function dessinerItems() {
  const z = $('#items');
  const liste = filtrer();
  const choisi = etat.detail.kind === 'fiche' ? etat.detail.id : '';
  z.innerHTML = liste.length ? liste.map(([id, o]) => `
    <button type="button" class="au-item${id === choisi ? ' on' : ''}" data-fiche="${esc(id)}">
      ${avatar(o)}<span class="au-item-txt"><b>${o.favori ? '★ ' : ''}${esc(o.titre || 'Sans titre')}</b><small>${esc(sousTitre(o))}</small></span>
      ${o.totp ? '<i class="au-badge-2fa" title="Code 2FA">2FA</i>' : ''}<i class="au-point" data-c="${esc(coffreDe(o.coffre).couleur)}" title="${esc(coffreDe(o.coffre).nom)}"></i>
    </button>`).join('') : `<div class="au-vide">${elements(false).length ? 'Rien ne correspond.' : 'Votre coffre est vide. Touchez ＋ pour ajouter votre première fiche, ou importez votre Proton Pass.'}</div>`;
  poserStyles(z);
  z.querySelectorAll('[data-fiche]').forEach((b) => { b.onclick = () => aller('fiche', { id: b.dataset.fiche, edition: false }); });
}

// ------------------------------------------------------------------------------------------------- détail

function dessinerDetail() {
  const z = $('#detail');
  const k = etat.detail.kind;
  const vues = { accueil: vueAccueil, fiche: vueFiche, ajouter: vueAjouter, codes: vueCodes, generateur: vueGenerateur, sante: vueSante,
    corbeille: vueCorbeille, import: vueImport, lien: vueLien, reglages: vueReglages };
  (vues[k] || vueAccueil)(z);
  poserStyles(z);
  // ← et ☰ branchés sur le panneau lui-même : ils marchent même quand une page se redessine seule (générateur…)
  z.onclick = (e) => {
    if (e.target.closest('[data-menu-tel]')) { etat.menu = true; dessiner(); return; }
    if (e.target.closest('[data-retour]')) { if (etat.detail.kind === 'fiche' && etat.page === 'detail') aller('liste'); else aller('accueil'); }
  };
  rafraichirCodes();
}

const enTete = (titre, droite = '') => `<div class="au-detail-tete"><button type="button" class="au-rond au-tel-seul" data-retour aria-label="Retour">←</button><h2>${titre}</h2><span class="au-droite">${droite}<button type="button" class="au-rond au-tel-seul" data-menu-tel aria-label="Menu">☰</button></span></div>`;

// ----- accueil (tableau de bord)
function vueAccueil(z) {
  const tous = elements(false);
  const s = ctx.sante;
  const recents = [...tous].sort((a, b) => String(b[1].modifie_le || '').localeCompare(String(a[1].modifie_le || ''))).slice(0, 5);
  const heure = new Date().getHours();
  z.innerHTML = `<div class="au-accueil">
    <div class="au-accueil-haut au-tel-seul"><button type="button" class="au-rond" id="acc-menu" aria-label="Menu">☰</button><span class="au-marque"><img src="logo.svg?v=__VERSION__" alt="" class="au-logo petit">Aureus</span><span class="au-rond au-fantome"></span></div>
    <div class="au-salut"><small>${heure < 18 && heure >= 5 ? 'Bonjour' : 'Bonsoir'},</small><b>${esc(ctx.prenom || '')} 👋</b>
      <span class="${s && s.alertes ? 'alerte' : 'ok'}">● ${s && s.alertes ? `${s.alertes} point(s) à voir dans la santé du coffre` : 'Votre coffre est protégé'}</span></div>
    ${ctx.envoi ? `<div class="au-envoi"><span>🪄 <b>Relié au PC</b> · contrôle <b>${esc(ctx.envoi.controle)}</b><small>Ouvrez une fiche et touchez 🪄.</small></span><button type="button" class="au-btn ghost petit" id="envoi-fin-acc">Terminer</button></div>` : ''}
    <button type="button" class="au-rech-tel" id="acc-rech">Chercher un mot de passe…<span>⌕</span></button>
    <div class="au-cartes2">
      <button type="button" class="au-carte-total" id="acc-tout"><small>Éléments</small><b>${tous.length}</b><small>dans ${coffres().length} coffre(s)</small></button>
      <button type="button" class="au-carte-score" id="acc-sante"><small>Santé ›</small><b>${s ? s.score : '—'} %</b><span class="au-jauge"><i data-p="${s ? s.score : 0}"></i></span><small>${s ? s.texte : ''}</small></button>
    </div>
    <div class="au-sous"><b>Mes coffres</b><button type="button" class="au-lien" id="acc-nouveau-coffre">＋ Nouveau</button></div>
    <div class="au-coffres">${coffres().map((c) => `<button type="button" data-coffre-acc="${esc(c.id)}" data-c="${esc(c.couleur)}"><span>${esc(c.icone)}</span><b>${esc(c.nom)}</b><small>${tous.filter(([, o]) => o.coffre === c.id).length}</small></button>`).join('')}</div>
    <div class="au-types-rapides">
      ${[['identifiant', '🔑', 'Identifiants'], ['carte', '💳', 'Cartes'], ['note', '📝', 'Notes']].map(([t, i, l]) => `<button type="button" data-type-acc="${t}"><b>${i}</b>${l}<small>${tous.filter(([, o]) => o.type === t).length}</small></button>`).join('')}
      <button type="button" data-outil-acc="codes"><b>⏱️</b>Codes 2FA<small>${tous.filter(([, o]) => o.totp).length}</small></button>
    </div>
    <div class="au-sous"><b>Récents</b></div>
    <div class="au-recents">${recents.length ? recents.map(([id, o]) => `<button type="button" class="au-item" data-fiche-acc="${esc(id)}">${avatar(o)}<span class="au-item-txt"><b>${esc(o.titre || 'Sans titre')}</b><small>${esc(coffreDe(o.coffre).nom)}</small></span><i class="au-type-chip">${esc(TYPES[o.type]?.nom || '')}</i></button>`).join('') : '<p class="au-aide">Rien pour l’instant : touchez ＋ pour ajouter une fiche.</p>'}</div>
    <div class="au-pc-seul au-raccourcis"><button type="button" class="au-btn" data-outil-acc="ajouter">＋ Ajouter</button><button type="button" class="au-btn ghost" data-outil-acc="codes">⏱️ Authentificateur</button><button type="button" class="au-btn ghost" data-outil-acc="generateur">🎲 Générateur</button><button type="button" class="au-btn ghost" data-outil-acc="import">📥 Importer</button></div>
  </div>`;
  if ($('#envoi-fin-acc', z)) $('#envoi-fin-acc', z).onclick = () => { ctx.finEnvoi(); dessiner(); };
  if ($('#acc-menu', z)) $('#acc-menu', z).onclick = () => { etat.menu = true; dessiner(); };
  $('#acc-rech', z).onclick = () => { aller('liste', { coffre: '', categorie: '', dossier: '', etiquette: '', sante: '' }); $('#recherche')?.focus(); };
  $('#acc-tout', z).onclick = () => aller('liste', { coffre: '', categorie: '', dossier: '', etiquette: '', sante: '' });
  $('#acc-sante', z).onclick = () => aller('sante');
  $('#acc-nouveau-coffre', z).onclick = () => reglerCoffre(null);
  z.querySelectorAll('[data-coffre-acc]').forEach((b) => { b.onclick = () => aller('liste', { coffre: b.dataset.coffreAcc, categorie: '', dossier: '', etiquette: '', sante: '' }); });
  z.querySelectorAll('[data-type-acc]').forEach((b) => { b.onclick = () => aller('liste', { coffre: '', categorie: b.dataset.typeAcc, dossier: '', etiquette: '', sante: '' }); });
  z.querySelectorAll('[data-outil-acc]').forEach((b) => { b.onclick = () => aller(b.dataset.outilAcc); });
  z.querySelectorAll('[data-fiche-acc]').forEach((b) => { b.onclick = () => aller('fiche', { id: b.dataset.ficheAcc, edition: false }); });
}

// ----- une fiche (lecture et modification)
function valeurAffichee(o, ch) {
  const v = o[ch.k];
  if (ch.liste) return (v || []).filter(Boolean);
  return v == null ? '' : String(v);
}

function ligneLecture(cle, libelle, valeur, opts = {}) {
  if (!valeur) return '';
  const id = `v-${cle}`;
  const champ = opts.long
    ? `<textarea readonly rows="${Math.min(10, String(valeur).split('\n').length + 1)}" id="${id}" class="${opts.secret ? 'masque' : ''}">${esc(valeur)}</textarea>`
    : `<input readonly id="${id}" value="${esc(valeur)}" type="${opts.secret ? 'password' : 'text'}" autocomplete="off">`;
  return `<div class="au-champ"><label for="${id}">${esc(libelle)}</label><div class="au-valeur">${champ}
    ${opts.secret ? `<button type="button" class="au-ico" data-voir="${id}" title="Afficher">👁</button>` : ''}
    <button type="button" class="au-ico" data-copier-val="${esc(cle)}" title="Copier">📋</button>
    ${ctx.envoi ? `<button type="button" class="au-ico or" data-envoyer-val="${esc(cle)}" title="Envoyer au PC">🪄</button>` : ''}</div></div>`;
}

function vueFiche(z) {
  const id = etat.detail.id;
  const f = id ? ctx.fiches.get(id) : null;
  if (etat.detail.edition) return vueEdition(z, id, f ? { ...f.objet } : { type: etat.detail.type || 'identifiant', coffre: etat.detail.coffre || etat.coffre || coffres()[0].id, dossier: etat.dossier, etiquettes: etat.etiquette ? [etat.etiquette] : [], perso: [] });
  if (!f) { vueAccueil(z); return; }
  const o = f.objet;
  const t = TYPES[o.type] || TYPES.perso;
  const valeurs = {}; // clé → valeur (pour copier / envoyer)
  let lignes = '';
  for (const ch of t.champs) {
    if (ch.totp) {
      if (!o.totp) continue;
      lignes += `<div class="au-champ"><label>${esc(ch.l)}</label><div class="au-valeur"><span class="au-totp" data-totp="${esc(id)}">··· ···</span><span class="au-anneau" data-totp-anneau="${esc(id)}"></span>
        <button type="button" class="au-ico" data-copier-totp="${esc(id)}" title="Copier le code">📋</button>${ctx.envoi ? `<button type="button" class="au-ico or" data-envoyer-totp="${esc(id)}" title="Envoyer au PC">🪄</button>` : ''}</div></div>`;
      continue;
    }
    if (ch.liste) {
      valeurAffichee(o, ch).forEach((v, i) => { valeurs[`${ch.k}.${i}`] = v; lignes += ligneLecture(`${ch.k}.${i}`, i ? `${ch.l} (${i + 1})` : ch.l, v); });
      continue;
    }
    const v = valeurAffichee(o, ch);
    valeurs[ch.k] = v;
    lignes += ligneLecture(ch.k, ch.l, v, { secret: ch.secret, long: ch.long });
  }
  (o.perso || []).forEach((p, i) => { valeurs[`perso.${i}`] = p.valeur; lignes += ligneLecture(`perso.${i}`, p.nom || 'Champ', p.valeur, { secret: p.secret }); });
  if (o.note) { valeurs.note = o.note; lignes += ligneLecture('note', 'Note', o.note, { long: true }); }
  const solide = o.mdp ? O.solidite(o.mdp) : null;
  const fuite = ctx.sante?.fuites?.has(id);
  z.innerHTML = `${enTete('', `<button type="button" class="au-ico" id="f-favori" title="Favori">${o.favori ? '★' : '☆'}</button><button type="button" class="au-ico" id="f-modif" title="Modifier">✏️</button>${o.type === 'note' ? '<button type="button" class="au-ico" id="f-lien" title="Partager par lien à lecture unique">🔗</button>' : ''}<button type="button" class="au-ico" id="f-corbeille" title="Mettre à la corbeille">🗑️</button>`)}
    <div class="au-fiche-tete">${avatar(o, true)}<div><h3>${esc(o.titre || 'Sans titre')}</h3><small>${esc(t.nom)}${o.sites?.[0] ? ' · ' + esc(O.domaine(o.sites[0])) : ''}</small></div></div>
    <div class="au-chips">${chipCoffre(o)}${o.dossier ? `<span class="au-chip neutre">📁 ${esc(cheminDossier(o.dossier))}</span>` : ''}${(o.etiquettes || []).map((e) => `<span class="au-chip neutre">#${esc(e)}</span>`).join('')}</div>
    ${fuite ? '<p class="au-alerte">⚠️ Ce mot de passe a été retrouvé dans des fuites sur internet : changez-le sur le site, puis ici.</p>' : ''}
    ${solide && solide.niveau < 2 ? `<p class="au-alerte">Mot de passe ${esc(solide.texte.toLowerCase())} : pensez à le remplacer (🎲 dans « Modifier »).</p>` : ''}
    <div class="au-champs">${lignes || '<p class="au-aide">Fiche vide.</p>'}</div>
    <p class="au-pied">${o.cree_le ? 'Créée le ' + dateFr(o.cree_le) : ''}${o.modifie_le ? ' · modifiée le ' + dateFr(o.modifie_le) : ''}</p>`;
  z.querySelectorAll('[data-voir]').forEach((b) => { b.onclick = () => { const el = $('#' + b.dataset.voir, z); if (el.tagName === 'TEXTAREA') el.classList.toggle('masque'); else el.type = el.type === 'password' ? 'text' : 'password'; }; });
  z.querySelectorAll('[data-copier-val]').forEach((b) => { b.onclick = () => ctx.copier(valeurs[b.dataset.copierVal] || ''); });
  z.querySelectorAll('[data-envoyer-val]').forEach((b) => {
    b.onclick = () => { const k = b.dataset.envoyerVal; const lib = b.closest('.au-champ').querySelector('label').textContent; ctx.envoyerAuPc(lib, o.titre, valeurs[k] || '', /mdp|numero|cvv|pin|code|secu|passeport|permis|cle_privee|phrase|perso/.test(k)); };
  });
  z.querySelectorAll('[data-copier-totp]').forEach((b) => { b.onclick = async () => { const c = await codeDe(id); if (c) ctx.copier(c.code); }; });
  z.querySelectorAll('[data-envoyer-totp]').forEach((b) => { b.onclick = async () => { const c = await codeDe(id); if (c) ctx.envoyerAuPc('Code 2FA', o.titre, c.code, false); }; });
  $('#f-favori', z).onclick = async () => { o.favori = !o.favori; if (await sauver(id, o)) dessiner(); };
  $('#f-modif', z).onclick = () => aller('fiche', { id, edition: true });
  if ($('#f-lien', z)) $('#f-lien', z).onclick = () => aller('lien', { texte: o.texte || '' });
  $('#f-corbeille', z).onclick = async () => {
    o.corbeille = maintenantIso();
    if (await sauver(id, o)) { ctx.toast(`« ${o.titre} » est dans la corbeille (30 jours).`); aller(estPc() ? 'accueil' : 'liste'); }
  };
}

function vueEdition(z, id, o) {
  const nouveau = !id;
  const t = TYPES[o.type] || TYPES.perso;
  const optionsDossiers = () => {
    const out = ['<option value="">— Aucun dossier —</option>'];
    const parcours = (parent, n) => dossiers().filter((d) => (d.parent || '') === parent).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).forEach((d) => {
      out.push(`<option value="${esc(d.id)}" ${d.id === o.dossier ? 'selected' : ''}>${'  '.repeat(n)}${n ? '└ ' : ''}${esc(d.nom)}</option>`); parcours(d.id, n + 1);
    });
    parcours('', 0);
    return out.join('');
  };
  const champ = (ch) => {
    const v = o[ch.k];
    if (ch.totp) {
      return `<label class="au-champ-ed">${esc(ch.l)}<span class="au-valeur"><input data-k="totp" value="${esc(v || '')}" placeholder="Clé secrète ou adresse otpauth://" autocomplete="off" autocapitalize="none" spellcheck="false">
        <button type="button" class="au-ico" id="totp-scanner" title="Scanner le QR">📷</button></span><small class="au-aide" id="totp-etat"></small></label>`;
    }
    if (ch.choix) return `<label class="au-champ-ed">${esc(ch.l)}<select data-k="${ch.k}">${ch.choix.map((c) => `<option ${c === v ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
    if (ch.liste) return `<label class="au-champ-ed">${esc(ch.l)} <small>(un par ligne)</small><textarea data-k="${ch.k}" data-liste rows="2" autocapitalize="none" spellcheck="false">${esc((v || []).join('\n'))}</textarea></label>`;
    if (ch.long) return `<label class="au-champ-ed">${esc(ch.l)}<textarea data-k="${ch.k}" rows="${ch.k === 'texte' ? 8 : 4}" spellcheck="false" class="${ch.secret ? 'masque' : ''}">${esc(v || '')}</textarea>${ch.secret ? `<button type="button" class="au-lien" data-voir-ta="${ch.k}">👁 Afficher</button>` : ''}</label>`;
    return `<label class="au-champ-ed">${esc(ch.l)}<span class="au-valeur"><input data-k="${ch.k}" value="${esc(v || '')}" ${ch.secret ? 'type="password"' : ''} ${ch.mode ? `inputmode="${ch.mode}"` : ''} autocomplete="off" autocapitalize="none" spellcheck="false">
      ${ch.secret ? '<button type="button" class="au-ico" data-voir-ed title="Afficher">👁</button>' : ''}${ch.gen ? '<button type="button" class="au-ico" data-generer title="Générer">🎲</button>' : ''}</span>
      ${ch.k === 'mdp' ? '<span class="au-force" id="force"><i></i><i></i><i></i><i></i></span><small class="au-aide" id="force-txt"></small>' : ''}</label>`;
  };
  const perso = (p, i) => `<div class="au-perso" data-perso="${i}"><input data-pk="nom" value="${esc(p.nom || '')}" placeholder="Nom du champ"><input data-pk="valeur" value="${esc(p.valeur || '')}" placeholder="Valeur" ${p.secret ? 'type="password"' : ''} autocomplete="off">
    <label class="au-check-mini"><input type="checkbox" data-pk="secret" ${p.secret ? 'checked' : ''}>secret</label><button type="button" class="au-ico" data-perso-suppr="${i}" title="Retirer">✕</button></div>`;
  z.innerHTML = `${enTete(nouveau ? `${t.ico} Nouvelle fiche · ${esc(t.nom)}` : `${t.ico} Modifier`)}
    <div class="au-form">
      <label class="au-champ-ed">Titre<input data-k="titre" value="${esc(o.titre || '')}" maxlength="80" autocomplete="off" placeholder="${o.type === 'identifiant' ? 'Ex. Steeple, Gmail…' : ''}"></label>
      <div class="au-deux"><label class="au-champ-ed">Coffre<select data-k="coffre">${coffres().map((c) => `<option value="${esc(c.id)}" ${c.id === o.coffre ? 'selected' : ''}>${esc(c.icone)} ${esc(c.nom)}</option>`).join('')}</select></label>
        <label class="au-champ-ed">Dossier<select data-k="dossier">${optionsDossiers()}</select></label></div>
      ${t.champs.map(champ).join('')}
      <div class="au-sous-form"><b>Champs personnalisés</b><button type="button" class="au-lien" id="perso-ajout">＋ Ajouter un champ</button></div>
      <div id="persos">${(o.perso || []).map(perso).join('')}</div>
      <label class="au-champ-ed">Note<textarea data-k="note" rows="3">${esc(o.note || '')}</textarea></label>
      <label class="au-champ-ed">Étiquettes <small>(séparées par des virgules : Urgent, Finances…)</small><input data-k="etiquettes" value="${esc((o.etiquettes || []).join(', '))}" autocomplete="off"></label>
      <label class="au-check"><input type="checkbox" data-k="favori" ${o.favori ? 'checked' : ''}> ★ Favori</label>
      <p class="au-msg" id="f-msg" role="alert"></p>
      <div class="au-rangee"><button type="button" class="au-btn ghost" id="f-annuler">Annuler</button><button type="button" class="au-btn" id="f-ok">Enregistrer</button></div>
    </div>`;
  const lire = () => {
    z.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k;
      if (k === 'etiquettes') o.etiquettes = [...new Set(el.value.split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 12);
      else if (k === 'favori') o.favori = el.checked;
      else if (el.hasAttribute('data-liste')) o[k] = el.value.split('\n').map((x) => x.trim()).filter(Boolean);
      else o[k] = el.value;
    });
    o.perso = [...z.querySelectorAll('[data-perso]')].map((r) => ({ nom: $('[data-pk="nom"]', r).value.trim(), valeur: $('[data-pk="valeur"]', r).value, secret: $('[data-pk="secret"]', r).checked })).filter((p) => p.nom || p.valeur);
  };
  const force = () => {
    const el = $('[data-k="mdp"]', z); if (!el || !$('#force', z)) return;
    const s = O.solidite(el.value);
    $('#force', z).dataset.niveau = el.value ? s.niveau : '-1';
    $('#force-txt', z).textContent = el.value ? `${s.texte} (≈ ${s.bits} bits)` : '';
  };
  const etatTotp = () => {
    const el = $('[data-k="totp"]', z); if (!el) return;
    const cfg = O.lireTotp(el.value);
    $('#totp-etat', z).textContent = !el.value ? 'Facultatif : scannez le QR que le site affiche quand vous activez la double authentification.' : cfg ? `✓ Clé reconnue${cfg.emetteur ? ' · ' + cfg.emetteur : ''}` : '✗ Clé non reconnue';
  };
  force(); etatTotp();
  $('[data-k="mdp"]', z)?.addEventListener('input', force);
  $('[data-k="totp"]', z)?.addEventListener('input', etatTotp);
  z.querySelectorAll('[data-voir-ed]').forEach((b) => { b.onclick = () => { const i = b.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; }; });
  z.querySelectorAll('[data-voir-ta]').forEach((b) => { b.onclick = () => $(`[data-k="${b.dataset.voirTa}"]`, z).classList.toggle('masque'); });
  z.querySelectorAll('[data-generer]').forEach((b) => { b.onclick = () => { const i = b.parentNode.querySelector('input'); i.value = O.generer(ctx.genMode || 'aleatoire', ctx.genReglages || O.REGLAGES_GEN.aleatoire); i.type = 'text'; force(); }; });
  if ($('#totp-scanner', z)) $('#totp-scanner', z).onclick = () => scanner((texte) => { $('[data-k="totp"]', z).value = texte; etatTotp(); const cfg = O.lireTotp(texte); if (cfg) { const ti = $('[data-k="titre"]', z); if (!ti.value) ti.value = cfg.emetteur; const ii = $('[data-k="identifiant"]', z); if (ii && !ii.value) ii.value = cfg.compte; } });
  $('#perso-ajout', z).onclick = () => { lire(); o.perso = [...(o.perso || []), { nom: '', valeur: '', secret: false }]; vueEdition(z, id, o); poserStyles(z); };
  z.querySelectorAll('[data-perso-suppr]').forEach((b) => { b.onclick = () => { lire(); o.perso.splice(+b.dataset.persoSuppr, 1); vueEdition(z, id, o); }; });
  z.querySelectorAll('[data-pk="secret"]').forEach((c) => { c.onchange = () => { c.closest('[data-perso]').querySelector('[data-pk="valeur"]').type = c.checked ? 'password' : 'text'; }; });
  $('#f-annuler', z).onclick = () => (nouveau ? aller(estPc() ? 'accueil' : 'ajouter') : aller('fiche', { id, edition: false }));
  $('#f-ok', z).onclick = async () => {
    lire();
    if (!String(o.titre || '').trim()) { $('#f-msg', z).textContent = 'Donnez un titre.'; return; }
    if (o.totp && !O.lireTotp(o.totp)) { $('#f-msg', z).textContent = 'La clé 2FA n’est pas reconnue (ou videz le champ).'; return; }
    const nid = id || nouvelId();
    if (!o.cree_le) o.cree_le = maintenantIso();
    if (await sauver(nid, o, $('#f-msg', z))) { ctx.sante = await calculerSante(false); aller('fiche', { id: nid, edition: false }); }
  };
}

async function sauver(id, o, msg) {
  o.modifie_le = maintenantIso();
  delete o._id;
  const ok = await ctx.enregistrer(id, o, msg);
  const f = ctx.fiches.get(id);
  if (f) f.objet._id = id;
  return ok;
}

// ----- ajouter (choix du type)
function vueAjouter(z) {
  z.innerHTML = `${enTete('Ajouter')}
    <label class="au-champ-ed">Dans le coffre<select id="aj-coffre">${coffres().map((c) => `<option value="${esc(c.id)}" ${c.id === (etat.coffre || coffres()[0].id) ? 'selected' : ''}>${esc(c.icone)} ${esc(c.nom)}</option>`).join('')}</select></label>
    <div class="au-types-ajout">${ORDRE_TYPES.map((t) => `<button type="button" data-type="${t}"><i>${TYPES[t].ico}</i><span><b>${esc(TYPES[t].nom)}</b><small>${esc(TYPES[t].aide)}</small></span></button>`).join('')}
      <button type="button" data-scanner><i>📷</i><span><b>Code 2FA</b><small>scanner un QR</small></span></button></div>
    <p class="au-aide">Plus tard : alias d’e-mail, pièces jointes chiffrées.</p>`;
  z.querySelectorAll('[data-type]').forEach((b) => { b.onclick = () => aller('fiche', { id: null, edition: true, type: b.dataset.type, coffre: $('#aj-coffre', z).value }); });
  $('[data-scanner]', z).onclick = () => scanner((texte) => nouvelleDepuisQr(texte, $('#aj-coffre', z)?.value));
}
function nouvelleDepuisQr(texte, coffreId) {
  const cfg = O.lireTotp(texte);
  if (!cfg) { ctx.toast('Ce QR n’est pas un code de double authentification.'); return; }
  aller('fiche', { id: null, edition: true, type: 'identifiant', coffre: coffreId });
  const z = $('#detail');
  $('[data-k="totp"]', z).value = texte; $('[data-k="totp"]', z).dispatchEvent(new Event('input'));
  $('[data-k="titre"]', z).value = cfg.emetteur || '';
  $('[data-k="identifiant"]', z).value = cfg.compte || '';
}

// ----- authentificateur
async function codeDe(id) {
  const o = ctx.fiches.get(id)?.objet;
  const cfg = o && O.lireTotp(o.totp);
  return cfg ? O.codeTotp(cfg) : null;
}

async function rafraichirCodes() {
  if (!racine) return;
  const cibles = [...document.querySelectorAll('[data-totp]')];
  for (const el of cibles) {
    const c = await codeDe(el.dataset.totp);
    if (!c) continue;
    el.textContent = O.joliCode(c.code);
    const an = document.querySelector(`[data-totp-anneau="${CSS.escape(el.dataset.totp)}"]`);
    if (an) { an.style.setProperty('--p', Math.round((c.reste / c.periode) * 100)); an.textContent = c.reste; an.classList.toggle('bientot', c.reste <= 5); }
  }
}

function vueCodes(z) {
  const avec = elements(false).filter(([, o]) => o.totp && O.lireTotp(o.totp)).sort((a, b) => (a[1].titre || '').localeCompare(b[1].titre || '', 'fr'));
  z.innerHTML = `${enTete('⏱️ Authentificateur')}
    <button type="button" class="au-scan" id="c-scan">📷 Scanner le QR d’un site<small>ou choisir une capture d’écran du QR, ou coller la clé</small></button>
    <div class="au-codes">${avec.length ? avec.map(([id, o]) => `<button type="button" class="au-code" data-code="${esc(id)}">${avatar(o)}<span class="au-item-txt"><b>${esc(o.titre)}</b><small>${esc(o.identifiant || coffreDe(o.coffre).nom)}</small></span>
      <span class="au-totp" data-totp="${esc(id)}">··· ···</span><span class="au-anneau" data-totp-anneau="${esc(id)}"></span></button>`).join('')
      : '<p class="au-aide">Aucun code pour l’instant. Quand un site propose la « double authentification » (2FA), il affiche un QR : scannez-le ici.</p>'}</div>
    <p class="au-aide">Toucher un code le copie. ⚠️ Un code 2FA rangé dans le même coffre que son mot de passe protège moins : pour les comptes très sensibles, rangez-le dans un autre coffre.</p>`;
  $('#c-scan', z).onclick = () => scanner((texte) => nouvelleDepuisQr(texte, etat.coffre || coffres()[0].id));
  z.querySelectorAll('[data-code]').forEach((b) => { b.onclick = async () => { const c = await codeDe(b.dataset.code); if (c) ctx.copier(c.code); }; });
}

/** Caméra (téléphone) ou image (PC) ou clé collée → texte du QR. */
function scanner(suite) {
  let flux = null; let arret = false;
  const finir = (texte) => { arret = true; if (flux) flux.getTracks().forEach((t) => t.stop()); ctx.fermerBoite(); if (texte) suite(texte); };
  ctx.boite(`<h2>📷 Scanner un QR</h2>
    <div class="au-camera"><video id="sc-video" playsinline muted></video><p class="au-aide" id="sc-etat">Ouverture de la caméra…</p></div>
    <label class="au-btn ghost">🖼️ Choisir une image du QR<input type="file" accept="image/*" id="sc-image" hidden></label>
    <label class="au-champ-ed">…ou coller la clé secrète<input id="sc-cle" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="JBSW Y3DP EHPK 3PXP ou otpauth://…"></label>
    <div class="au-rangee"><button type="button" class="au-btn ghost" id="sc-fermer">Fermer</button><button type="button" class="au-btn" id="sc-ok">Utiliser la clé</button></div>`, async (b) => {
    const { lireQr } = await import('./lecteur-qr.js?v=__VERSION__');
    const toile = document.createElement('canvas');
    const decoder = (source, l, h) => { toile.width = l; toile.height = h; const c2 = toile.getContext('2d', { willReadFrequently: true }); c2.drawImage(source, 0, 0, l, h); const d = c2.getImageData(0, 0, l, h); return lireQr(d.data, l, h)?.data || null; };
    $('#sc-fermer', b).onclick = () => finir(null);
    $('#sc-ok', b).onclick = () => { const v = $('#sc-cle', b).value.trim(); if (O.lireTotp(v)) finir(v); else $('#sc-etat', b).textContent = 'Clé non reconnue.'; };
    $('#sc-image', b).onchange = async (e) => {
      const fichier = e.target.files[0]; if (!fichier) return;
      const img = await createImageBitmap(fichier);
      const texte = decoder(img, img.width, img.height);
      if (texte) finir(texte); else $('#sc-etat', b).textContent = 'Aucun QR trouvé dans cette image.';
    };
    try {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = $('#sc-video', b); v.srcObject = flux; await v.play();
      $('#sc-etat', b).textContent = 'Visez le QR du site.';
      const boucle = () => { if (arret) return; if (v.videoWidth) { const t = decoder(v, v.videoWidth, v.videoHeight); if (t) { finir(t); return; } } setTimeout(boucle, 250); };
      boucle();
    } catch { $('#sc-etat', b).textContent = 'Pas de caméra : choisissez une image du QR ou collez la clé.'; $('#sc-video', b).hidden = true; }
  });
}

// ----- générateur
function vueGenerateur(z) {
  ctx.genMode = ctx.genMode || 'phrase';
  ctx.genTous = ctx.genTous || JSON.parse(JSON.stringify(O.REGLAGES_GEN));
  const mode = ctx.genMode; const r = ctx.genTous[mode];
  ctx.genReglages = r;
  const mdp = O.generer(mode, r);
  const s = O.solidite(mdp);
  const histo = lire(SPECIAUX.historique, { liste: [] }).liste;
  const reglages = {
    aleatoire: `<label class="au-reglage">Longueur · <b>${r.longueur}</b><input type="range" min="8" max="64" value="${r.longueur}" data-r="longueur"></label>
      ${[['majuscules', 'Majuscules'], ['chiffres', 'Chiffres'], ['symboles', 'Symboles (!?@#…)']].map(([k, l]) => `<label class="au-reglage">${l}<input type="checkbox" data-r="${k}" ${r[k] ? 'checked' : ''}></label>`).join('')}`,
    phrase: `<label class="au-reglage">Nombre de mots · <b>${r.mots}</b><input type="range" min="3" max="10" value="${r.mots}" data-r="mots"></label>
      <label class="au-reglage">Séparateur<select data-r="separateur">${[['-', 'tiret -'], [' ', 'espace'], ['.', 'point .'], ['_', 'souligné _']].map(([v, l]) => `<option value="${v}" ${r.separateur === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="au-reglage">Majuscules<input type="checkbox" data-r="majuscules" ${r.majuscules ? 'checked' : ''}></label>
      <label class="au-reglage">Ajouter un nombre<input type="checkbox" data-r="nombre" ${r.nombre ? 'checked' : ''}></label>`,
    pin: `<label class="au-reglage">Nombre de chiffres · <b>${r.longueur}</b><input type="range" min="4" max="12" value="${r.longueur}" data-r="longueur"></label>`,
  };
  z.innerHTML = `${enTete('🎲 Générateur')}
    <div class="au-onglets">${[['aleatoire', 'Aléatoire'], ['phrase', 'Phrase'], ['pin', 'Code PIN']].map(([k, l]) => `<button type="button" class="${k === mode ? 'on' : ''}" data-mode="${k}">${l}</button>`).join('')}</div>
    <div class="au-mdp-gen" id="g-mdp">${esc(mdp)}</div>
    <span class="au-force" data-niveau="${s.niveau}"><i></i><i></i><i></i><i></i></span>
    <small class="au-aide">${esc(s.texte)}${mode === 'phrase' ? ' · facile à retenir' : ''} (≈ ${s.bits} bits)</small>
    <div class="au-reglages">${reglages[mode]}</div>
    <div class="au-rangee"><button type="button" class="au-btn ghost" id="g-autre">🔄 Autre</button><button type="button" class="au-btn" id="g-copier">📋 Copier</button></div>
    ${histo.length ? `<h4 class="au-h4">Derniers mots de passe copiés</h4><div class="au-histo">${histo.slice(0, 10).map((h, i) => `<div class="au-valeur"><input readonly type="password" value="${esc(h.mdp)}" id="h-${i}"><button type="button" class="au-ico" data-voir-h="h-${i}">👁</button><button type="button" class="au-ico" data-copier-h="${i}">📋</button></div>`).join('')}</div>` : ''}`;
  z.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { ctx.genMode = b.dataset.mode; vueGenerateur(z); }; });
  z.querySelectorAll('[data-r]').forEach((el) => {
    el.oninput = el.onchange = () => { r[el.dataset.r] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value; vueGenerateur(z); };
  });
  $('#g-autre', z).onclick = () => vueGenerateur(z);
  $('#g-copier', z).onclick = async () => {
    ctx.copier(mdp);
    const liste = [{ mdp, le: maintenantIso() }, ...histo.filter((h) => h.mdp !== mdp)].slice(0, 20);
    await ctx.enregistrer(SPECIAUX.historique, { type: 'historique', liste });
  };
  z.querySelectorAll('[data-voir-h]').forEach((b) => { b.onclick = () => { const i = $('#' + b.dataset.voirH, z); i.type = i.type === 'password' ? 'text' : 'password'; }; });
  z.querySelectorAll('[data-copier-h]').forEach((b) => { b.onclick = () => ctx.copier(histo[+b.dataset.copierH].mdp); });
}

// ----- santé du coffre et fuites
async function calculerSante(avecFuites) {
  const avecMdp = elements(false).filter(([, o]) => o.mdp);
  const faibles = new Set(avecMdp.filter(([, o]) => O.solidite(o.mdp).niveau < 2).map(([id]) => id));
  const parMdp = new Map();
  for (const [id, o] of avecMdp) parMdp.set(o.mdp, [...(parMdp.get(o.mdp) || []), id]);
  const reutilises = new Set([...parMdp.values()].filter((l) => l.length > 1).flat());
  const sans2fa = new Set(elements(false).filter(([, o]) => ['identifiant', 'logiciel'].includes(o.type) && !o.totp).map(([id]) => id));
  let res = lire(SPECIAUX.fuites, { le: '', resultats: {} });
  if (avecFuites) {
    const resultats = {};
    const cache = new Map();
    for (const [id, o] of avecMdp) {
      if (!cache.has(o.mdp)) cache.set(o.mdp, await O.vuDansFuites(o.mdp, async (p) => { const r = await ctx.api('GET', '/api/hub/aureus/fuites/' + p, null, true); return r.status === 200 ? r.texte : null; }));
      const n = cache.get(o.mdp);
      if (n == null) throw new Error('Service des fuites injoignable : réessayez plus tard.');
      if (n > 0) resultats[id] = n;
    }
    res = { le: maintenantIso(), resultats };
    await ctx.enregistrer(SPECIAUX.fuites, { type: 'fuites', ...res });
  }
  const fuites = new Set(Object.keys(res.resultats || {}).filter((id) => ctx.fiches.has(id) && ctx.fiches.get(id).objet.mdp));
  const mauvais = new Set([...faibles, ...reutilises, ...fuites]);
  const score = avecMdp.length ? Math.round(100 * (avecMdp.length - mauvais.size) / avecMdp.length) : 100;
  return {
    score, faibles, reutilises, fuites, sans2fa, verifieLe: res.le, vus: res.resultats || {},
    alertes: (faibles.size ? 1 : 0) + (reutilises.size ? 1 : 0) + (fuites.size ? 1 : 0),
    texte: score >= 90 ? 'Excellente' : score >= 75 ? 'Très bonne' : score >= 50 ? 'Moyenne' : 'À améliorer',
  };
}

function vueSante(z) {
  const s = ctx.sante;
  const reco = (cle, ico, titre, sous) => `<button type="button" class="au-reco" data-sante="${cle}"><span class="au-ico sombre">${ico}</span><span><b>${titre}</b><small>${sous}</small></span></button>`;
  z.innerHTML = `<div class="au-vague">${enTete('Santé du coffre')}<small>Ce qui mérite votre attention</small></div>
    <div class="au-score"><span class="au-bouclier" data-p="${s.score}"></span><div><small>Score global</small><b>${s.score} %</b><span class="au-chip neutre">${s.texte}</span></div></div>
    <div class="au-tuiles3"><button type="button" data-sante="faibles" class="${s.faibles.size ? 'alerte' : ''}">Faibles<b>${s.faibles.size}</b>${s.faibles.size ? 'À changer' : 'Aucun'}</button>
      <button type="button" data-sante="reutilises" class="${s.reutilises.size ? 'alerte' : ''}">Réutilisés<b>${s.reutilises.size}</b>${s.reutilises.size ? 'Un par site' : 'Aucun'}</button>
      <button type="button" data-sante="fuites" class="${s.fuites.size ? 'alerte' : ''}">Fuites<b>${s.fuites.size}</b>${s.verifieLe ? 'Vérifié' : 'Pas vérifié'}</button></div>
    <h4 class="au-h4">Recommandations</h4>
    ${s.fuites.size ? reco('fuites', '⚠️', `${s.fuites.size} mot(s) de passe retrouvé(s) dans des fuites`, 'Changez-les tout de suite') : ''}
    ${s.faibles.size ? reco('faibles', '🔑', `${s.faibles.size} mot(s) de passe faible(s)`, 'Générez des mots de passe solides') : ''}
    ${s.reutilises.size ? reco('reutilises', '♻️', `${s.reutilises.size} mot(s) de passe réutilisé(s)`, 'Un mot de passe par site, c’est plus sûr') : ''}
    ${s.sans2fa.size ? reco('sans2fa', '⏱️', `${s.sans2fa.size} identifiant(s) sans code 2FA`, 'Activez la double authentification quand le site la propose') : ''}
    <div class="au-fuites-carte"><b>🌐 Fuites sur internet</b><small>${s.verifieLe ? 'Dernière vérification : ' + dateFr(s.verifieLe) + ' à ' + new Date(s.verifieLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Jamais vérifié'} · vos mots de passe ne quittent jamais l’appareil (seuls 5 caractères de leur empreinte partent).</small>
      <button type="button" class="au-btn" id="s-verifier">🔎 Vérifier maintenant</button><p class="au-msg" id="s-msg"></p></div>
    <p class="au-aide">Recherche des fuites d’adresses e-mail : option payante, plus tard.</p>`;
  z.querySelectorAll('[data-sante]').forEach((b) => { b.onclick = () => aller('liste', { sante: b.dataset.sante, coffre: '', categorie: '', dossier: '', etiquette: '' }); });
  $('#s-verifier', z).onclick = async (e) => {
    e.target.disabled = true; $('#s-msg', z).textContent = 'Vérification…';
    try { ctx.sante = await calculerSante(true); dessiner(); ctx.toast(ctx.sante.fuites.size ? `⚠️ ${ctx.sante.fuites.size} mot(s) de passe retrouvé(s) dans des fuites.` : '✅ Aucun mot de passe retrouvé dans les fuites connues.'); }
    catch (err) { $('#s-msg', z).textContent = err.message; e.target.disabled = false; }
  };
}

// ----- corbeille
function vueCorbeille(z) {
  const liste = elements(true).sort((a, b) => String(b[1].corbeille).localeCompare(String(a[1].corbeille)));
  z.innerHTML = `${enTete('🗑️ Corbeille')}<p class="au-aide">Les fiches restent ${CORBEILLE_JOURS} jours dans la corbeille, puis sont effacées pour toujours.</p>
    <div class="au-items">${liste.length ? liste.map(([id, o]) => `<div class="au-item">${avatar(o)}<span class="au-item-txt"><b>${esc(o.titre || 'Sans titre')}</b><small>Supprimée le ${dateFr(o.corbeille)}</small></span>
      <button type="button" class="au-btn ghost petit" data-restaurer="${esc(id)}">Restaurer</button><button type="button" class="au-ico" data-effacer="${esc(id)}" title="Effacer pour toujours">✕</button></div>`).join('') : '<p class="au-aide">La corbeille est vide.</p>'}</div>
    ${liste.length ? '<button type="button" class="au-btn danger" id="cb-vider">Vider la corbeille</button>' : ''}`;
  z.querySelectorAll('[data-restaurer]').forEach((b) => { b.onclick = async () => { const o = ctx.fiches.get(b.dataset.restaurer).objet; delete o.corbeille; if (await sauver(b.dataset.restaurer, o)) { ctx.toast('Fiche restaurée.'); dessiner(); } }; });
  z.querySelectorAll('[data-effacer]').forEach((b) => { b.onclick = async () => { if (!confirm('Effacer cette fiche pour toujours ?')) return; await ctx.effacer(b.dataset.effacer); dessiner(); }; });
  if ($('#cb-vider', z)) $('#cb-vider', z).onclick = async () => { if (!confirm('Vider la corbeille ? Ces fiches seront effacées pour toujours.')) return; for (const [id] of liste) await ctx.effacer(id); dessiner(); };
}

// ----- lien à lecture unique
function vueLien(z) {
  z.innerHTML = `${enTete('🔗 Lien à lecture unique')}
    <p class="au-aide">Le message est chiffré sur cet appareil. Le lien ne s’ouvre <b>qu’une seule fois</b>, puis il est effacé du serveur. La clé est dans le lien : le serveur ne peut pas lire le message.</p>
    <label class="au-champ-ed">Message<textarea id="l-texte" rows="6" maxlength="10000">${esc(etat.detail.texte || '')}</textarea></label>
    <label class="au-champ-ed">Le lien expire au bout de<select id="l-duree"><option value="1">1 heure</option><option value="24" selected>1 jour</option><option value="168">7 jours</option></select></label>
    <p class="au-msg" id="l-msg"></p><div id="l-resultat"></div>
    <button type="button" class="au-btn" id="l-ok">Créer le lien</button>`;
  $('#l-ok', z).onclick = async () => {
    const t = $('#l-texte', z).value;
    if (!t.trim()) { $('#l-msg', z).textContent = 'Écrivez un message.'; return; }
    const { donnees, cle } = await C.chiffrerLien(t);
    const r = await ctx.api('POST', '/api/hub/aureus/liens', { donnees, heures: +$('#l-duree', z).value });
    if (r.status !== 200) { $('#l-msg', z).textContent = r.data.message || 'Création impossible.'; return; }
    const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}lien.html${ctx.local ? `?e=${ctx.ENT}` : ''}#${r.data.id}.${cle}`;
    $('#l-msg', z).textContent = '';
    $('#l-resultat', z).innerHTML = `<label class="au-champ-ed">Votre lien (une seule lecture)<span class="au-valeur"><input readonly value="${esc(url)}" id="l-url"><button type="button" class="au-ico" id="l-copier">📋</button></span></label>
      <p class="au-aide">Conseil : envoyez le lien, et dites par un autre moyen (téléphone, de vive voix) à quoi il sert.</p>`;
    $('#l-copier', z).onclick = () => ctx.copier(url);
    $('#l-ok', z).hidden = true; $('#l-texte', z).value = '';
  };
}

// ----- import (Proton Pass, ou tout fichier CSV de mots de passe)
function vueImport(z) {
  z.innerHTML = `${enTete('📥 Importer')}
    <div class="au-etapes"><p><b>Depuis Proton Pass</b> : Paramètres → Exporter → choisissez <b>CSV</b> (ou le .zip, puis ouvrez-le et prenez le fichier <b>data.json</b>).</p>
    <p>Marche aussi avec un fichier CSV d’un autre gestionnaire (Bitwarden, Chrome, Firefox…).</p>
    <p class="au-alerte">Ce fichier contient vos mots de passe EN CLAIR. Il est lu ici, sur cet appareil, chiffré, puis rien n’en reste. <b>Supprimez-le ensuite</b> (et videz la corbeille de l’ordinateur).</p></div>
    <label class="au-btn">📄 Choisir le fichier (.csv ou .json)<input type="file" accept=".csv,.json,text/csv,application/json" id="im-fichier" hidden></label>
    <div id="im-apercu"></div>`;
  $('#im-fichier', z).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    let res;
    try { res = analyserImport(await f.text(), f.name); } catch (err) { $('#im-apercu', z).innerHTML = `<p class="au-msg">${esc(err.message)}</p>`; return; }
    e.target.value = '';
    const parCoffre = new Map();
    for (const it of res) parCoffre.set(it.coffre || 'Importé', (parCoffre.get(it.coffre || 'Importé') || 0) + 1);
    $('#im-apercu', z).innerHTML = `<div class="au-fuites-carte"><b>${res.length} élément(s) trouvé(s)</b>
      <small>${[...parCoffre].map(([n, k]) => `${esc(n)} : ${k}`).join(' · ')}</small>
      <small>Chaque coffre de l’export devient un coffre d’Aureus (vous pourrez le renommer).</small>
      <button type="button" class="au-btn" id="im-ok">Importer dans Aureus</button><p class="au-aide" id="im-etat"></p></div>`;
    $('#im-ok', z).onclick = async (ev) => {
      ev.target.disabled = true;
      const liste = coffres();
      const idDe = new Map(liste.map((c) => [C.simple(c.nom), c.id]));
      let i = 0;
      for (const nom of parCoffre.keys()) {
        if (!idDe.has(C.simple(nom))) { const c = { id: nouvelId(), nom, couleur: COULEURS_COFFRE[(liste.length + i++) % COULEURS_COFFRE.length], icone: '📦' }; liste.push(c); idDe.set(C.simple(nom), c.id); }
      }
      await ctx.enregistrer(SPECIAUX.coffres, { type: 'coffres', liste });
      let n = 0;
      for (const it of res) {
        const { coffre, ...o } = it;
        o.coffre = idDe.get(C.simple(coffre || 'Importé'));
        o.cree_le = o.cree_le || maintenantIso(); o.modifie_le = o.modifie_le || o.cree_le;
        if (await ctx.enregistrer(nouvelId(), o)) n++;
        if (n % 5 === 0) $('#im-etat', z).textContent = `Chiffrement et envoi… ${n} / ${res.length}`;
      }
      for (const [id, f2] of ctx.fiches) f2.objet._id = id;
      ctx.sante = await calculerSante(false);
      ctx.toast(`✅ ${n} élément(s) importé(s). Pensez à supprimer le fichier d’export.`);
      aller('liste', { coffre: '', categorie: '', dossier: '', etiquette: '', sante: '' });
    };
  };
}

/** CSV (Proton Pass, Bitwarden, Chrome…) ou data.json de Proton Pass → fiches Aureus (+ nom du coffre d'origine). */
export function analyserImport(texte, nom = '') {
  const t = texte.replace(/^﻿/, '');
  if (/\.json$/i.test(nom) || /^\s*\{/.test(t)) return depuisProtonJson(JSON.parse(t));
  const lignes = lireCsv(t);
  if (lignes.length < 2) throw new Error('Fichier vide ou illisible.');
  const tete = lignes[0].map((h) => h.trim().toLowerCase());
  const col = (...noms) => { for (const n of noms) { const i = tete.indexOf(n); if (i >= 0) return i; } return -1; };
  const c = {
    type: col('type'), nom: col('name', 'title', 'nom'), url: col('url', 'login_uri', 'website', 'site'), email: col('email'),
    user: col('username', 'login_username', 'login', 'user'), mdp: col('password', 'login_password', 'mot de passe'),
    note: col('note', 'notes', 'extra'), totp: col('totp', 'login_totp', 'otpauth'), coffre: col('vault', 'folder', 'group', 'grouping'),
    cree: col('createtime'), modif: col('modifytime'),
  };
  if (c.mdp < 0 && c.note < 0) throw new Error('Ce fichier ne ressemble pas à un export de mots de passe (pas de colonne « password »).');
  const v = (l, i) => (i >= 0 ? String(l[i] || '').trim() : '');
  const date = (x) => { const n = Number(x); return n ? new Date(n * (n < 1e12 ? 1000 : 1)).toISOString() : ''; };
  return lignes.slice(1).filter((l) => l.some((x) => x)).map((l) => {
    const type = v(l, c.type).toLowerCase();
    const base = { titre: v(l, c.nom) || O.domaine(v(l, c.url)) || 'Sans titre', note: v(l, c.note), coffre: v(l, c.coffre) || 'Importé', etiquettes: [], perso: [], cree_le: date(v(l, c.cree)), modifie_le: date(v(l, c.modif)) };
    if (type === 'note') return { ...base, type: 'note', texte: base.note, note: '' };
    if (type === 'creditcard') return { ...base, type: 'carte' };
    if (type === 'identity') return { ...base, type: 'identite' };
    const user = v(l, c.user), email = v(l, c.email);
    const o = { ...base, type: 'identifiant', identifiant: user || email, mdp: v(l, c.mdp), sites: v(l, c.url).split(/[,\s]+/).filter(Boolean), totp: v(l, c.totp) };
    if (user && email && user !== email) o.perso.push({ nom: 'E-mail', valeur: email, secret: false });
    return o;
  });
}

function depuisProtonJson(data) {
  const out = [];
  for (const coffre of Object.values(data.vaults || {})) {
    for (const it of coffre.items || []) {
      const d = it.data || {}; const m = d.metadata || {}; const k = d.content || {};
      const extra = (d.extraFields || []).map((x) => ({ nom: x.fieldName || 'Champ', valeur: x.data?.content || '', secret: x.type === 'hidden' })).filter((x) => x.valeur);
      const base = { titre: m.name || 'Sans titre', note: m.note || '', coffre: coffre.name || 'Importé', etiquettes: [], perso: extra, favori: !!it.pinned,
        cree_le: it.createTime ? new Date(it.createTime * 1000).toISOString() : '', modifie_le: it.modifyTime ? new Date(it.modifyTime * 1000).toISOString() : '' };
      if (it.state === 2) base.corbeille = maintenantIso();
      switch (d.type) {
        case 'login': out.push({ ...base, type: 'identifiant', identifiant: k.itemUsername || k.username || k.itemEmail || '', mdp: k.password || '', sites: k.urls || [], totp: k.totpUri || '',
          perso: [...extra, ...(k.itemEmail && k.itemUsername ? [{ nom: 'E-mail', valeur: k.itemEmail, secret: false }] : [])] }); break;
        case 'note': out.push({ ...base, type: 'note', texte: m.note || '', note: '' }); break;
        case 'creditCard': out.push({ ...base, type: 'carte', titulaire: k.cardholderName || '', numero: k.number || '', expiration: k.expirationDate || '', cvv: k.verificationNumber || '', pin: k.pin || '' }); break;
        case 'identity': out.push({ ...base, type: 'identite', prenom: k.firstName || '', nom: k.lastName || k.fullName || '', naissance: k.birthdate || '', telephone: k.phoneNumber || '', email: k.email || '',
          adresse: [k.streetAddress, k.zipOrPostalCode, k.city, k.countryOrRegion].filter(Boolean).join('\n'), secu: k.socialSecurityNumber || '', passeport: k.passportNumber || '', permis: k.licenseNumber || '' }); break;
        case 'wifi': out.push({ ...base, type: 'wifi', ssid: k.ssid || '', mdp: k.password || '', securite: 'WPA' }); break;
        case 'sshKey': out.push({ ...base, type: 'ssh', cle_privee: k.privateKey || '', cle_publique: k.publicKey || '' }); break;
        case 'alias': break; // les alias d'e-mail n'existent pas (encore) dans Aureus
        default: out.push({ ...base, type: 'perso' });
      }
    }
  }
  if (!out.length) throw new Error('Aucun élément trouvé dans ce fichier.');
  return out;
}

function lireCsv(t) {
  const lignes = []; let l = []; let champ = ''; let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (guillemets) {
      if (ch === '"') { if (t[i + 1] === '"') { champ += '"'; i++; } else guillemets = false; } else champ += ch;
    } else if (ch === '"') guillemets = true;
    else if (ch === ',') { l.push(champ); champ = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; l.push(champ); lignes.push(l); l = []; champ = ''; }
    else champ += ch;
  }
  if (champ || l.length) { l.push(champ); lignes.push(l); }
  return lignes;
}

// ----- réglages
async function vueReglages(z) {
  z.innerHTML = `${enTete('⚙️ Réglages')}<p class="au-aide">Chargement…</p>`;
  const r = await ctx.api('GET', '/api/hub/aureus/appareils');
  const moi = ctx.monAppareil();
  const liste = r.status === 200 ? r.data.appareils : [];
  z.innerHTML = `${enTete('⚙️ Réglages')}
    <h4 class="au-h4">Appareils qui ouvrent le coffre</h4>
    <div class="au-items">${liste.map((a) => `<div class="au-item"><span class="au-av" data-c="#1b2333">${a.appareil === moi ? '📍' : '📱'}</span><span class="au-item-txt"><b>${esc(a.nom || 'Appareil')}${a.bloque ? ' · bloqué' : ''}</b><small>${a.appareil === moi ? 'Cet appareil · ' : ''}${a.vu_le ? 'vu le ' + dateFr(a.vu_le.replace(' ', 'T')) : ''}</small></span>
      <button type="button" class="au-btn ghost petit" data-oublier="${esc(a.appareil)}">Oublier</button></div>`).join('') || '<p class="au-aide">Aucun.</p>'}</div>
    <p class="au-aide">« Oublier » un appareil perdu : il ne pourra plus ouvrir le coffre avec son code (les 12 mots restent valables).</p>
    <h4 class="au-h4">Vos 12 mots de secours</h4>
    <p class="au-aide">Ils ne sont gardés nulle part en clair, même pas ici. Si vous les perdez ET oubliez votre code, le coffre est perdu.</p>`;
  poserStyles(z);
  z.querySelectorAll('[data-oublier]').forEach((x) => {
    x.onclick = async () => {
      const ici = x.dataset.oublier === moi;
      if (!confirm(ici ? 'Oublier CET appareil ? Il faudra vos 12 mots pour rouvrir le coffre ici.' : 'Oublier cet appareil ?')) return;
      await ctx.api('DELETE', '/api/hub/aureus/appareils/' + encodeURIComponent(x.dataset.oublier));
      if (ici) { ctx.oublierIci(); return; }
      vueReglages(z);
    };
  });
}

// ----- coffres et dossiers (boîtes)
function reglerCoffre(id) {
  const liste = coffres();
  const c = id ? liste.find((x) => x.id === id) : { id: nouvelId(), nom: '', couleur: COULEURS_COFFRE[liste.length % COULEURS_COFFRE.length], icone: ICONES_COFFRE[1] };
  const plein = id && elements(false).some(([, o]) => o.coffre === id);
  ctx.boite(`<h2>${id ? 'Modifier le coffre' : 'Nouveau coffre'}</h2>
    <label class="au-champ-ed">Nom<input id="c-nom" maxlength="40" value="${esc(c.nom)}" placeholder="Ex. Leclerc Blaye, Elvanys, Perso" autocomplete="off"></label>
    <div class="au-champ-ed">Couleur<div class="au-couleurs">${COULEURS_COFFRE.map((x) => `<button type="button" data-couleur="${x}" data-c="${x}" class="${x === c.couleur ? 'on' : ''}" aria-label="Couleur ${x}"></button>`).join('')}</div></div>
    <div class="au-champ-ed">Icône<div class="au-icones">${ICONES_COFFRE.map((x) => `<button type="button" data-icone="${x}" class="${x === c.icone ? 'on' : ''}">${x}</button>`).join('')}</div></div>
    <p class="au-msg" id="c-msg"></p>
    <div class="au-rangee"><button type="button" class="au-btn ghost" data-fermer>Annuler</button><button type="button" class="au-btn" id="c-ok">${id ? 'Enregistrer' : 'Créer le coffre'}</button></div>
    ${id && liste.length > 1 ? `<button type="button" class="au-lien danger" id="c-suppr" ${plein ? 'disabled' : ''}>Supprimer ce coffre</button>${plein ? '<p class="au-aide">Pour le supprimer, déplacez d’abord ses fiches dans un autre coffre.</p>' : ''}` : ''}`, (b) => {
    poserStyles(b);
    b.querySelectorAll('[data-couleur]').forEach((x) => { x.onclick = () => { c.couleur = x.dataset.couleur; b.querySelectorAll('[data-couleur]').forEach((y) => y.classList.toggle('on', y === x)); }; });
    b.querySelectorAll('[data-icone]').forEach((x) => { x.onclick = () => { c.icone = x.dataset.icone; b.querySelectorAll('[data-icone]').forEach((y) => y.classList.toggle('on', y === x)); }; });
    $('#c-ok', b).onclick = async () => {
      c.nom = $('#c-nom', b).value.trim();
      if (!c.nom) { $('#c-msg', b).textContent = 'Donnez un nom.'; return; }
      const nouvelle = id ? liste.map((x) => (x.id === id ? c : x)) : [...liste, c];
      if (await ctx.enregistrer(SPECIAUX.coffres, { type: 'coffres', liste: nouvelle })) { ctx.fermerBoite(); aller('liste', { coffre: c.id, categorie: '', dossier: '', etiquette: '', sante: '' }); }
    };
    if ($('#c-suppr', b)) $('#c-suppr', b).onclick = async () => {
      if (!confirm(`Supprimer le coffre « ${c.nom} » ?`)) return;
      if (await ctx.enregistrer(SPECIAUX.coffres, { type: 'coffres', liste: liste.filter((x) => x.id !== id) })) { ctx.fermerBoite(); etat.coffre = ''; aller('accueil'); }
    };
  });
}

function nouveauDossier() {
  ctx.boite(`<h2>Nouveau dossier</h2>
    <label class="au-champ-ed">Nom<input id="d-nom" maxlength="60" autocomplete="off"></label>
    <label class="au-champ-ed">Dans le dossier<select id="d-parent"><option value="">— Aucun —</option>${dossiers().map((d) => `<option value="${esc(d.id)}" ${d.id === etat.dossier ? 'selected' : ''}>${esc(cheminDossier(d.id))}</option>`).join('')}</select></label>
    <p class="au-msg" id="d-msg"></p>
    <div class="au-rangee"><button type="button" class="au-btn ghost" data-fermer>Annuler</button><button type="button" class="au-btn" id="d-ok">Créer</button></div>
    ${etat.dossier ? '<button type="button" class="au-lien" id="d-gerer">Renommer ou supprimer le dossier ouvert</button>' : ''}`, (b) => {
    $('#d-ok', b).onclick = async () => {
      const nom = $('#d-nom', b).value.trim();
      if (!nom) { $('#d-msg', b).textContent = 'Donnez un nom.'; return; }
      const liste = [...dossiers(), { id: nouvelId(), nom, parent: $('#d-parent', b).value, coffre: etat.coffre || '' }];
      if (await ctx.enregistrer(SPECIAUX.dossiers, { type: 'dossiers', liste })) { ctx.fermerBoite(); etat.menu = false; dessiner(); }
    };
    if ($('#d-gerer', b)) $('#d-gerer', b).onclick = () => gererDossier();
  });
}

function gererDossier() {
  const d = dossiers().find((x) => x.id === etat.dossier);
  if (!d) return;
  const plein = elements(false).some(([, o]) => o.dossier === d.id) || dossiers().some((x) => x.parent === d.id);
  ctx.boite(`<h2>Dossier « ${esc(d.nom)} »</h2>
    <label class="au-champ-ed">Nom<input id="d-nom" maxlength="60" value="${esc(d.nom)}"></label>
    <div class="au-rangee"><button type="button" class="au-btn ghost" data-fermer>Annuler</button><button type="button" class="au-btn" id="d-ok">Renommer</button></div>
    <button type="button" class="au-btn danger" id="d-suppr" ${plein ? 'disabled' : ''}>Supprimer le dossier</button>
    ${plein ? '<p class="au-aide">Pour le supprimer, videz-le d’abord (fiches et sous-dossiers).</p>' : ''}`, (b) => {
    $('#d-ok', b).onclick = async () => { const liste = dossiers().map((x) => (x.id === d.id ? { ...x, nom: $('#d-nom', b).value.trim() || x.nom } : x)); if (await ctx.enregistrer(SPECIAUX.dossiers, { type: 'dossiers', liste })) { ctx.fermerBoite(); dessiner(); } };
    $('#d-suppr', b).onclick = async () => { const liste = dossiers().filter((x) => x.id !== d.id); etat.dossier = d.parent || ''; if (await ctx.enregistrer(SPECIAUX.dossiers, { type: 'dossiers', liste })) { ctx.fermerBoite(); dessiner(); } };
  });
}
