// 23/11 (l'utilisateur : « je veux que le dé soit visible, 6 faces, et que chaque joueur lance le dé, comme Mario Party au début, à chaque tour ;
// pas tiré automatiquement : c'est pour le côté ludique et l'immersion ») : L'INITIATIVE SE LANCE À LA MAIN, EN LIGNE.
// Au début de chaque tour, chacun lance UN dé pour chacun de SES héros, en bas, comme les dés habituels (même dé du héros, même lancer animé ;
// 23/11, 2e retour de l'utilisateur : « prends le fonctionnement des dés normal en bas, et au lieu d'en lancer 3-4-5, tu en lances 1 »).
// Le tirage se fait sur SON téléphone, jamais par le serveur ; une barre « 🎯 Initiative » au-dessus des héros montre les résultats de chacun.
// Le plus haut joue d'abord ; à égalité, les héros à égalité relancent (comme Mario Party). Quand tout le monde a lancé : le classement, puis on joue.
// Un héros que personne ne joue, ou un joueur absent depuis 20 s : l'hôte peut lancer à sa place (un bouton, jamais tout seul).
// Rangé dans la partie : S.ini = { t:<n° du tour>, v:{ <héros>:[1er lancer, relance si égalité…] } }. Une partie « sans initiative » n'a rien de tout ça.
// Sur un seul téléphone : l'ordre libre reste (décision du 23/11).

const iniActive = () => !!(typeof L !== 'undefined' && L && S && S.heros && !S.sansIni && !S.fin && S.scen !== 'atelier');
const iniVivants = () => S.heros.map((z, i) => i).filter(i => !S.heros[i].aTerre);
const iniDuTour = () => (S.ini && S.ini.t === S.tours ? S.ini : null);
const iniPrefixe = (a, b) => a.length <= b.length && a.every((x, k) => x === b[k]);
// les héros qui doivent lancer maintenant : ceux qui n'ont pas lancé, puis ceux à égalité (leur suite de lancers est le début de celle d'un autre)
function iniBesoin() {
  const I = iniDuTour(), viv = iniVivants(); if (!I) return viv;
  const pas = viv.filter(i => !(I.v[i] || []).length); if (pas.length) return pas;
  return viv.filter(i => viv.some(j => j !== i && iniPrefixe(I.v[i], I.v[j])));
}
const iniEnCours = () => iniActive() && iniBesoin().length > 0;
// l'ordre du tour, une fois tous les dés lancés (du plus haut au plus bas ; un héros relevé en cours de tour passe à la fin)
function iniOrdre() {
  const I = iniDuTour() || { v:{} }, cmp = (a, b) => { for (let k = 0; k < Math.max(a.length, b.length); k++) { const d = (b[k] || 0) - (a[k] || 0); if (d) return d; } return 0; };
  return iniVivants().map(i => ({ i, l:I.v[i] || [] })).sort((x, y) => (y.l.length ? 1 : 0) - (x.l.length ? 1 : 0) || cmp(x.l, y.l))
    .map(x => ({ i:x.i, v:x.l.length ? x.l.join('·') : '–' }));
}
// le reste du jeu demande l'ordre par initiative() et tourDe() : pendant la phase de lancer, personne n'a la main
initiative = function () { if (!iniActive() || iniEnCours()) return null; return iniOrdre(); };
const _iniPasMonTour = pasMonTour;
pasMonTour = function (dire) { if (iniEnCours()) { if (dire !== false) bulle('🎯 D’abord l’initiative : lancez vos dés !', true); return true; } return _iniPasMonTour.apply(this, arguments); };
['acheter', 'agir', 'bouger', 'donner', 'echanger', 'fouiller', 'ouvrir', 'prendreEscalier', 'proteger', 'relever', 'soigner', 'utiliser', 'frapper', 'lancerPouvoir', 'transmuter', 'benir'].forEach(n => {
  const f = K[n]; if (typeof f !== 'function' || f.__ini) return;
  const g = function () { if (iniEnCours()) return '🎯 D’abord l’initiative : lancez vos dés !'; return f.apply(this, arguments); };
  g.__ini = true; g.__garde = f.__garde; K[n] = g;
});
// aFini passe par pasMonTour ; lanceDesH aussi (seulement en ligne) : rien d'autre à garder

// ------------------------------------------------------------------ l'affichage : la zone des dés habituelle, avec UN dé
(function () {
  const st = document.createElement('style');
  st.textContent = `.tourbar.ini { color:var(--texte, #efe6ff); }
  .tourbar.ini .ch { display:inline-flex; align-items:center; gap:.25em; margin:0 .35em; white-space:nowrap; }
  .tourbar.ini .ch img { width:1.7em; height:1.7em; object-fit:contain; vertical-align:middle; filter:drop-shadow(0 1px 2px #000a); }
  .tourbar.ini .ch.tourne img { animation:tourneD .26s linear infinite; }
  .tourbar.ini .ch.att { color:var(--doux, #c9c1ea); }
  .tourbar.ini button { background:#ffffff18; border:1px solid #ffffff33; color:inherit; border-radius:8px; font-size:.85em; padding:.1em .5em; margin-left:.2em; cursor:pointer; }`;
  document.head.appendChild(st);
})();
var iniFusion = false; // un lancer gardé après un envoi croisé : pas de message « quelqu'un a joué en même temps »
const iniVu = {}, iniRecent = {};   // « tour:héros » → nombre de lancers déjà vus ; héros → heure du dernier lancer vu (pour le faire rouler)
let iniTour = null, iniDebut = 0, iniFermeA = 0, iniAnime = null, iniEtaitEnCours = false;
function iniPeut(i) { // ce téléphone peut-il lancer pour ce héros ?
  if (typeof ECRAN !== 'undefined' && ECRAN) return false;
  if (mesHeros().includes(i)) return true;
  return estHote() && (!proprio(i) || Date.now() - iniDebut > 20000);
}
const iniFace = (i, v) => `faces-${S.heros[i].id}/face-${v}.webp`;
// le lancer : le dé du héros roule 0,65 s dans la zone des dés (comme « 🎲 Lancer »), puis s'arrête sur sa face
function iniLance(i) {
  if (iniAnime != null || !iniActive() || !iniBesoin().includes(i) || !iniPeut(i)) return;
  iniAnime = i; son('relance'); if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
  const fin = Date.now() + 650;
  const tick = () => {
    const z = $('desH');
    if (Date.now() >= fin || !z || !S) {
      iniAnime = null; if (!S) return;
      if (!S.ini || S.ini.t !== S.tours) S.ini = { t:S.tours, v:{} };
      const v = 1 + Math.floor(Math.random() * 6);
      S.ini.v[i] = (S.ini.v[i] || []).concat(v); iniVu[S.tours + ':' + i] = S.ini.v[i].length;
      son('choisir'); bulle(`🎯 ${nomH(S.heros[i])} : ${v} !`);
      dessine(); if (typeof pousse === 'function') pousse(); return;
    }
    z.innerHTML = `<button class="de tourne"><img src="${iniFace(i, 1 + Math.floor(Math.random() * 6))}" alt=""></button>`;
    setTimeout(tick, 70);
  };
  tick();
}
// la barre « 🎯 Initiative » au-dessus des héros, et la zone des dés du héros choisi
function iniAffiche() {
  const bar = document.getElementById('ini-bar'); if (bar) bar.remove();
  if (!iniActive() || !iniEnCours() || !$('desH')) return;
  const I = iniDuTour() || { v:{} }, besoin = iniBesoin(), egal = besoin.length && besoin.every(i => (I.v[i] || []).length);
  const chips = iniVivants().map(i => { const l = I.v[i] || [], r = iniRecent[i] && Date.now() - iniRecent[i] < 650;
    const pour = besoin.includes(i) && !mesHeros().includes(i) && iniPeut(i) ? `<button onclick="iniLance(${i})">🎲 à sa place</button>` : '';
    return `<span class="ch ${l.length ? '' : 'att'} ${r ? 'tourne' : ''}">${nomH(S.heros[i]).replace('Sire ', '')} ${l.length ? `<img src="${iniFace(i, r ? 1 + Math.floor(Math.random() * 6) : l[l.length - 1])}" alt="">${l.length > 1 ? `<small>(${l.slice(0, -1).join('·')})</small>` : ''}` : '⏳'}${pour}</span>`; }).join('');
  const eq = document.querySelector('#app .equipe');
  if (eq) eq.insertAdjacentHTML('beforebegin', `<div class="tourbar ini moi" id="ini-bar">🎯 ${egal ? 'Égalité : on relance !' : 'Initiative'} · ${chips}</div>`);
  document.querySelectorAll('#app .pasinfo, #app .actions').forEach(e => { e.style.display = 'none'; });
  // la zone des dés : UN dé à lancer pour le héros choisi (pendant qu'il roule, on le laisse rouler)
  const z = $('desH');
  if (iniAnime != null) { z.innerHTML = `<button class="de tourne"><img src="${iniFace(iniAnime, 1 + Math.floor(Math.random() * 6))}" alt=""></button>`; return; }
  const i = actif, l = I.v[i] || [];
  if (L && !mesHeros().includes(i)) z.innerHTML = `<span class="aide">👤 ${nomH(S.heros[i])} : ${proprio(i) ? `${proprio(i)} lance son dé d’initiative` : 'personne ne le joue'}.</span>`;
  else if (besoin.includes(i)) z.innerHTML = `<button class="de cache" onclick="iniLance(${i})"></button><button class="lancerH" onclick="iniLance(${i})">🎯 ${l.length ? 'Relancer (égalité)' : 'Lancer l’initiative'}</button>`;
  else { const att = besoin.filter(x => !mesHeros().includes(x)).map(x => nomH(S.heros[x]).replace('Sire ', ''));
    z.innerHTML = `<button class="de"><img src="${iniFace(i, l[l.length - 1])}" alt=""></button><span class="aide">🎯 ${l[l.length - 1]} · ${att.length ? `⏳ on attend ${att.join(', ')}…` : 'à tes autres héros !'}</span>`; }
}
function iniMaj() {
  if (!iniActive()) return;
  if (iniTour !== S.tours) { iniTour = S.tours; iniDebut = Date.now(); iniFermeA = 0; iniEtaitEnCours = iniEnCours(); }
  const I = iniDuTour() || { v:{} };
  iniVivants().forEach(i => { const n = (I.v[i] || []).length, cle = S.tours + ':' + i;
    if (n > (iniVu[cle] || 0)) { iniVu[cle] = n; if (!mesHeros().includes(i) || !iniPeut(i)) { iniRecent[i] = Date.now(); son('relance'); setTimeout(() => { if (S && iniAnime == null) dessine(); }, 700); /* le résultat se lit dans la barre 🎯 */ } } });
  const enCours = iniEnCours();
  if (iniEtaitEnCours && !enCours) { // le dernier dé est tombé : l'ordre du tour, puis « À toi de jouer »
    iniEtaitEnCours = false; const med = ['🥇', '🥈', '🥉', '4.'];
    iniFermeA = Date.now() + 2600;
    setTimeout(() => bulle('🎯 ' + iniOrdre().map((x, k) => `${med[k]} ${nomH(S.heros[x.i]).replace('Sire ', '')}`).join(' › '), false, true), 1500);
    setTimeout(() => { if (S) { dessine(); if (typeof annonceTour === 'function') annonceTour(); } }, 2700);
  }
  if (enCours) iniEtaitEnCours = true;
}
// à chaque affichage : on choisit d'abord un de MES héros qui doit lancer, puis on remplace la zone des dés
{ const _d = dessine; dessine = function () {
    try { if (iniActive()) { iniMaj(); if (iniEnCours() && iniAnime == null) { const b = iniBesoin().filter(i => mesHeros().includes(i)); if (b.length && !b.includes(actif)) actif = b[0]; } } } catch (e) {}
    const r = _d.apply(this, arguments);
    try { iniAffiche(); } catch (e) { console.warn('[initiative]', e); }
    return r; }; }
// le bouton de l'hôte « à sa place » apparaît après 20 s : on redessine une fois à ce moment-là
setInterval(() => { try { if (typeof S !== 'undefined' && S && iniActive() && iniEnCours() && estHote() && !occupe && iniAnime == null) { const t = Date.now() - iniDebut; if (t > 20000 && t < 20600) dessine(); } } catch (e) {} }, 500);
// deux téléphones qui lancent en même temps : la partie reçue ne doit pas effacer mon lancer (on garde, pour chaque héros, la suite la plus longue)
{ const _r = recoit; recoit = function (d) {
    const mien = S && S.ini ? JSON.parse(JSON.stringify(S.ini)) : null;
    const r = _r.apply(this, arguments);
    if (mien && S && S.heros && S.tours === mien.t) {
      if (!S.ini || S.ini.t !== mien.t) S.ini = { t:mien.t, v:{} };
      let change = false;
      Object.keys(mien.v).forEach(i => { const a = mien.v[i] || [], b = S.ini.v[i] || []; if (a.length > b.length && iniPrefixe(b, a)) { S.ini.v[i] = a; change = true; } });
      if (change) { iniFusion = true; if (typeof pousse === 'function') pousse(); }
    }
    return r; }; }
// l'annonce « À toi de jouer » attend la fin des lancers
{ const _a = annonceTour; annonceTour = function () { if (iniEnCours() || Date.now() < iniFermeA) return; return _a.apply(this, arguments); }; }
