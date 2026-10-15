// Aureus — page « Réception » du PC (15/10/2026) : le lien magique SANS EXTENSION (extensions interdites au travail).
// La page ouvre une boîte de 10 minutes sur le serveur, tire une clé et affiche un QR (adresse d'Aureus + clé après le #).
// Le téléphone y dépose des secrets chiffrés ; ici on les relève, on les déchiffre et on propose « Copier ».
// Rien n'est gardé : le secret reçu s'efface de l'écran au bout de 60 secondes, la boîte est fermée en quittant.
import { qrSvg } from './qr.js';
import { nouvelleCleBoite, controleBoite, dechiffrerBoite } from './coffre-crypto.js';

const $ = (s) => document.querySelector(s);
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API = local ? (localStorage.getItem('hub_api') || 'http://127.0.0.1:8098') : '';
const ENT = new URLSearchParams(location.search).get('e');

let boite = null;     // { id, jeton, expire }
let cle = '';
let minuterie = null;
let effaceur = null;

async function demander(method, path) {
  try {
    const r = await fetch(API + path, { method, cache: 'no-store', headers: boite ? { 'X-Boite': boite.jeton } : {} });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  } catch { return { status: 0, data: {} }; }
}

async function ouvrir() {
  clearInterval(minuterie);
  $('#recu').innerHTML = '';
  $('#etat').textContent = 'Préparation…';
  if (boite) await fermer();
  const r = await (async () => {
    try {
      const x = await fetch(API + '/api/hub/aureus/boites', { method: 'POST', cache: 'no-store' });
      return { status: x.status, data: await x.json().catch(() => ({})) };
    } catch { return { status: 0, data: {} }; }
  })();
  if (r.status !== 200) { $('#etat').textContent = r.data.message || 'Serveur injoignable : réessayez.'; return; }
  boite = r.data;
  cle = nouvelleCleBoite();
  const adresse = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}index.html${ENT ? `?e=${encodeURIComponent(ENT)}` : ''}#envoyer=${boite.id}.${cle}`;
  const img = document.createElement('img');
  img.alt = 'QR à scanner avec le téléphone';
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await qrSvg(adresse));
  $('#qr').replaceChildren(img);
  $('#qr').dataset.adresse = adresse; // pour les essais automatiques
  $('#controle').textContent = await controleBoite(cle);
  $('#etat').textContent = 'En attente du téléphone…';
  minuterie = setInterval(relever, 1500);
}

async function relever() {
  if (!boite) return;
  const r = await demander('GET', '/api/hub/aureus/boites/' + boite.id);
  if (r.status === 404) { termine('Réception terminée (10 minutes passées). Touchez « Nouveau QR » pour recommencer.'); return; }
  if (r.status !== 200) return;
  const reste = Math.max(0, Math.round((new Date(String(boite.expire).replace(' ', 'T')) - Date.now()) / 60000));
  $('#etat').textContent = r.data.relie ? `📱 Téléphone relié · encore ${reste} min` : `En attente du téléphone… (${reste} min)`;
  if (r.data.donnees) {
    try { afficher(await dechiffrerBoite(cle, r.data.donnees)); } catch { $('#etat').textContent = 'Un envoi n’a pas pu être lu (mauvais QR ?).'; }
  }
}

function afficher(o) {
  clearTimeout(effaceur);
  const zone = $('#recu');
  zone.innerHTML = '';
  const carte = document.createElement('div');
  carte.className = 'au-recu';
  const titre = document.createElement('b');
  titre.textContent = `Reçu : ${o.libelle || 'secret'}${o.titre ? ' · ' + o.titre : ''}`;
  const ligne = document.createElement('span');
  ligne.className = 'au-input-row';
  const champ = document.createElement('input');
  champ.readOnly = true; champ.value = o.valeur || ''; champ.type = o.secret ? 'password' : 'text';
  champ.setAttribute('autocomplete', 'off');
  const oeil = document.createElement('button');
  oeil.type = 'button'; oeil.className = 'au-mini'; oeil.textContent = '👁'; oeil.title = 'Afficher';
  oeil.onclick = () => { champ.type = champ.type === 'password' ? 'text' : 'password'; };
  ligne.append(champ, oeil);
  const copier = document.createElement('button');
  copier.type = 'button'; copier.className = 'au-btn au-copier-grand'; copier.textContent = '📋 Copier';
  copier.onclick = async () => {
    try { await navigator.clipboard.writeText(o.valeur || ''); copier.textContent = 'Copié ✓ — collez avec Ctrl + V'; }
    catch { champ.type = 'text'; champ.select(); copier.textContent = 'Sélectionné : faites Ctrl + C'; }
  };
  const aide = document.createElement('small');
  aide.textContent = 'Effacé de cet écran dans 60 secondes.';
  carte.append(titre, ligne, copier, aide);
  zone.append(carte);
  copier.focus();
  effaceur = setTimeout(() => { zone.innerHTML = ''; }, 60000);
}

function termine(texte) {
  clearInterval(minuterie);
  boite = null;
  $('#qr').replaceChildren();
  $('#controle').textContent = '—';
  $('#etat').textContent = texte;
}

async function fermer() {
  if (!boite) return;
  const b = boite;
  boite = null;
  try { await fetch(API + '/api/hub/aureus/boites/' + b.id, { method: 'DELETE', headers: { 'X-Boite': b.jeton }, keepalive: true }); } catch { /* ignoré */ }
}

$('#nouveau').onclick = ouvrir;
$('#fin').onclick = async () => { await fermer(); termine('Réception terminée. Vous pouvez fermer cette page.'); $('#recu').innerHTML = ''; };
window.addEventListener('pagehide', () => { fermer(); });
ouvrir();
