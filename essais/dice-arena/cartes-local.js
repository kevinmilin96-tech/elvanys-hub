// =============================================================================================== LES CARTES DE L'ATELIER : la copie sur cet appareil et le serveur (28/11)
// Décision de l'utilisateur : la carte (son JSON) et ses images sont enregistrées sur le SERVEUR PERSO (on la retrouve sur tous ses appareils,
// connecté à sa carte de joueur) ; une copie reste sur l'appareil (IndexedDB « guilde-editeur » : images, cartes) pour jouer hors ligne.
// Dans une salle en ligne, les amis reçoivent les images de la carte jouée par le code de la salle. Utilisé par editeur.html et chroniques.html.
(function (racine) {
'use strict';
const BASE = 'guilde-editeur', VERSION = 2, APIC = '/api/hub/guilde';
let dbP = null;
function DB() {
  if (dbP) return dbP;
  dbP = new Promise((ok, ko) => { const r = indexedDB.open(BASE, VERSION);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('img')) d.createObjectStore('img'); if (!d.objectStoreNames.contains('cartes')) d.createObjectStore('cartes'); };
    r.onsuccess = () => ok(r.result); r.onerror = () => { dbP = null; ko(r.error); }; r.onblocked = () => { dbP = null; ko(new Error('base bloquée')); }; });
  return dbP;
}
const prend = (st, cle) => DB().then(d => new Promise(ok => { try { const q = d.transaction(st).objectStore(st).get(cle); q.onsuccess = () => ok(q.result == null ? null : q.result); q.onerror = () => ok(null); } catch (e) { ok(null); } })).catch(() => null);
const met = (st, cle, v) => DB().then(d => new Promise((ok, ko) => { const t = d.transaction(st, 'readwrite'); t.objectStore(st).put(v, cle); t.oncomplete = ok; t.onerror = () => ko(t.error); }));
const ote = (st, cle) => DB().then(d => new Promise(ok => { const t = d.transaction(st, 'readwrite'); t.objectStore(st).delete(cle); t.oncomplete = ok; t.onerror = ok; }));
const tous = st => DB().then(d => new Promise(ok => { try { const q = d.transaction(st).objectStore(st).getAll(); q.onsuccess = () => ok(q.result || []); q.onerror = () => ok([]); } catch (e) { ok([]); } })).catch(() => []);
// la carte de joueur (amis.js) : sans elle, rien n'est envoyé au serveur (la carte reste sur l'appareil)
const maCle = () => { try { const c = (racine.AMIS && racine.AMIS.carte) || JSON.parse(localStorage.getItem('guilde-carte') || 'null'); return c && c.cle || null; } catch (e) { return null; } };
async function api(chemin, corps) {
  const r = await fetch(APIC + chemin, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(corps || {}) });
  let d = {}; try { d = await r.json(); } catch (e) {} return { statut:r.status, d };
}
// les images qu'une carte utilise : « img:<nom> » (les images de decor/ font partie du jeu)
function nomsImages(C) {
  const L = new Set(); (C.salles || []).forEach(s => { if (s.img && String(s.img).startsWith('img:')) L.add(s.img.slice(4)); });
  if (C.peinte && C.peinte.img && String(C.peinte.img).startsWith('img:')) L.add(C.peinte.img.slice(4)); return [...L];
}
const CL = {
  maCle, nomsImages, imgLit:k => prend('img', k), imgPose:(k, v) => met('img', k, v), imgOte:k => ote('img', k),
  // ---------------------------------------------------------------- les cartes sur cet appareil
  liste:() => tous('cartes').then(L => L.filter(c => c && c.format === 'guilde-carte').sort((a, b) => (b.maj || 0) - (a.maj || 0))),
  lire:id => prend('cartes', id),
  async ecrire(C, depuisServeur) { if (!depuisServeur) { C.maj = Date.now(); C._sale = true; } await met('cartes', C.id, C); return C; },
  async supprimer(id) { await ote('cartes', id); const k = maCle(); if (k) try { await api('/carte/supprimer', { cle:k, id }); } catch (e) {} },
  // ---------------------------------------------------------------- l'envoi au serveur perso : les images d'abord, puis le JSON (et le ménage des images retirées)
  async envoyer(C, suivi) {
    const k = maCle(); if (!k) return { ok:false, message:'Crée ta carte de joueur (👥 Mes amis) pour enregistrer tes cartes sur le serveur et les retrouver sur tes autres appareils.' };
    const noms = nomsImages(C), propre = JSON.parse(JSON.stringify(C)); delete propre._sale; delete propre._srv;
    // la carte d'abord (la 1re fois, le serveur doit la connaître avant ses images), puis les images, puis la carte avec la liste des images à garder
    let r = await api('/carte/ecrire', { cle:k, carte:propre }); if (r.statut !== 200) return { ok:false, message:r.d.message || 'Le serveur ne répond pas.' };
    const deja = (C._srvImg || {}), faites = {};
    for (let i = 0; i < noms.length; i++) { const n = noms[i], data = await prend('img', n) || await prend('img', `srv:${C.id}:${n}`);
      if (suivi) suivi(i + 1, noms.length);
      if (!data) continue; const emp = data.length + ':' + data.slice(-40); if (deja[n] === emp) { faites[n] = emp; continue; }
      const q = await api('/carte/image', { cle:k, id:C.id, nom:n, data }); if (q.statut !== 200) return { ok:false, message:q.d.message || 'Une image n’est pas partie.' }; faites[n] = emp; }
    r = await api('/carte/ecrire', { cle:k, carte:propre, garder:noms }); if (r.statut !== 200) return { ok:false, message:r.d.message || 'Le serveur ne répond pas.' };
    C._sale = false; C._srv = r.d.maj; C._srvImg = faites; await met('cartes', C.id, C); return { ok:true, maj:r.d.maj };
  },
  // ---------------------------------------------------------------- les cartes du serveur (un autre appareil) recopiées sur celui-ci
  async synchro() {
    const k = maCle(); if (!k) return { ok:false, n:0 };
    let r; try { r = await api('/cartes/liste', { cle:k }); } catch (e) { return { ok:false, n:0 }; } if (r.statut !== 200) return { ok:false, n:0 };
    let n = 0; for (const x of r.d.cartes || []) { const ici = await prend('cartes', x.id); if (ici && (ici._sale || (ici._srv || 0) >= x.maj)) continue;
      const q = await api('/carte/lire', { cle:k, id:x.id }); if (q.statut !== 200 || !q.d.carte) continue; const C = q.d.carte; C._sale = false; C._srv = x.maj; await met('cartes', C.id, C); n++; }
    return { ok:true, n, serveur:(r.d.cartes || []).map(x => x.id) };
  },
  // ---------------------------------------------------------------- une image d'une carte : decor/… tel quel ; « img:<nom> » cherché ici puis au serveur (l'auteur ou un joueur de la salle)
  async image(ref, carteId, salle) {
    if (!ref) return ''; ref = String(ref); if (!ref.startsWith('img:')) return ref; const n = ref.slice(4);
    let d = await prend('img', n); if (d) return d; d = await prend('img', `srv:${carteId}:${n}`); if (d) return d;
    const k = maCle(); if (!carteId || (!k && !salle)) return '';
    try { const q = await api('/carte/image/lire', { cle:k || undefined, salle:salle || undefined, id:carteId, nom:n }); if (q.statut === 200 && q.d.data) { await met('img', `srv:${carteId}:${n}`, q.d.data).catch(() => {}); return q.d.data; } } catch (e) {}
    return '';
  },
  // ---------------------------------------------------------------- une carte reçue avec une salle en ligne (l'ami qui n'est pas l'auteur)
  async lireSalle(id, salle) { try { const q = await api('/carte/lire', { cle:maCle() || undefined, salle, id }); return q.statut === 200 ? q.d.carte : null; } catch (e) { return null; } },
  // les recopies des scénarios écrits à la main (cartes-atelier/*.json) : ouvertes dans l'atelier comme les autres cartes
  RECOPIES:[['cartes-atelier/horloger.json', 'Le Sommeil de l’Horloger'], ['cartes-atelier/terres-brulees-v2.json', 'Les Terres brûlées · Le Cœur de Braise']],
};
racine.CARTES_LOCAL = CL;
})(typeof window !== 'undefined' ? window : globalThis);
