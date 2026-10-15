// Lecture d'un lien autodestructible Aureus (sans compte). La clé est après le # : elle ne part jamais au serveur.
// Le serveur rend le message chiffré et l'efface aussitôt ; on le déchiffre ici.
import { dechiffrerLien } from './coffre-crypto.js?v=__VERSION__';

const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API = local ? (localStorage.getItem('hub_api') || 'http://127.0.0.1:8098') : '';
const m = /^#([a-z0-9]{15})\.([A-Za-z0-9_-]{43})$/.exec(location.hash);
// On retire la clé de l'adresse (historique, capture d'écran)
history.replaceState(null, '', location.pathname + location.search);
const zone = document.getElementById('lien');
const msg = document.getElementById('msg');

if (!m) {
  zone.querySelector('h1').textContent = 'Lien incomplet';
  zone.querySelector('p').textContent = 'Ce lien est abîmé (il a peut-être été coupé en le copiant). Demandez-en un autre à son auteur.';
  document.getElementById('afficher').hidden = true;
}

document.getElementById('afficher').onclick = async (e) => {
  e.target.disabled = true;
  msg.textContent = 'Ouverture…';
  let r;
  try { r = await fetch(`${API}/api/hub/aureus/liens/${m[1]}/lire`, { method: 'POST', cache: 'no-store' }); } catch { r = null; }
  if (!r) { msg.textContent = 'Pas de réseau : réessayez.'; e.target.disabled = false; return; }
  const data = await r.json().catch(() => ({}));
  if (r.status !== 200) {
    zone.querySelector('h1').textContent = 'Message introuvable';
    zone.querySelector('p').textContent = data.message || 'Ce lien n’existe pas, a expiré ou a déjà été lu.';
    e.target.hidden = true; msg.textContent = '';
    return;
  }
  let texte;
  try { texte = await dechiffrerLien(data.donnees, m[2]); } catch {
    msg.textContent = 'Le message n’a pas pu être déchiffré (lien abîmé). Il est maintenant effacé : demandez-en un autre.';
    e.target.hidden = true;
    return;
  }
  zone.querySelector('h1').textContent = 'Le message';
  zone.querySelector('p').textContent = 'Il vient d’être effacé du serveur : ce lien ne marchera plus.';
  e.target.hidden = true; msg.textContent = '';
  const pre = document.createElement('pre');
  pre.className = 'au-message';
  pre.textContent = texte;
  const copier = document.createElement('button');
  copier.className = 'au-btn ghost';
  copier.textContent = '📋 Copier';
  copier.onclick = () => navigator.clipboard.writeText(texte).then(() => { copier.textContent = 'Copié ✓'; }).catch(() => {});
  zone.append(pre, copier);
};
