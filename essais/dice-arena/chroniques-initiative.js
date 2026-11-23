// 23/11 (l'utilisateur : « je veux que le dé soit visible, 6 faces, et que chaque joueur lance le dé, comme Mario Party au début, à chaque tour ;
// pas tiré automatiquement : c'est pour le côté ludique et l'immersion ») : L'INITIATIVE SE LANCE À LA MAIN, EN LIGNE.
// Au début de chaque tour, un panneau 🎯 s'ouvre sur tous les téléphones : un vrai dé à 6 faces en relief par héros ; chacun touche « Lancer »
// pour SES héros (le tirage se fait sur SON téléphone, jamais par le serveur), les autres voient le dé rouler chez eux.
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

// ------------------------------------------------------------------ le dé : LE DÉ DU HÉROS (ses faces faces-<héros>/face-N.webp), comme dans la zone des dés
// 23/11 (l'utilisateur : « l'idée que chaque joueur voie le dé des autres, avec l'attente des autres, c'est important : que chacun sache où il se situe ;
// c'est juste ton dé blanc et rouge qui ne correspond pas aux dés des joueurs ») : le panneau reste, avec les vrais dés des héros
let iniPose = 0; // tant qu'un dé roule : ni « Égalité », ni boutons, ni classement (pas de surprise gâchée)
const iniFace = (i, v) => `faces-${S.heros[i].id}/face-${v}.webp`;
const iniDe = i => `<div class="ini-de cache" id="ini-d${i}"><img alt="" style="visibility:hidden"></div>`;
// le dé roule 1 s (faces qui changent, comme le lancer habituel), puis s'arrête sur sa face
function iniRoule(i, v) {
  const el = document.getElementById('ini-d' + i); if (!el) return; const img = el.querySelector('img');
  el.classList.remove('cache'); el.classList.add('tourne'); img.style.visibility = 'visible';
  const fin = Date.now() + 1000; iniPose = Math.max(iniPose, fin + 80); setTimeout(() => { try { iniMaj(); } catch (e) {} }, 1100);
  const tick = () => { if (!document.body.contains(el)) return;
    if (Date.now() >= fin) { el.classList.remove('tourne'); el.classList.add('pose'); img.src = iniFace(i, v); return; }
    img.src = iniFace(i, 1 + Math.floor(Math.random() * 6)); setTimeout(tick, 70); };
  tick();
}
(function () {
  const st = document.createElement('style');
  st.textContent = `#ini { position:fixed; inset:0; z-index:45; background:radial-gradient(circle at 50% 35%, #2a1f5cee, #0b0918f5); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4vw; box-sizing:border-box; animation:iniEntre .35s ease-out; }
  @keyframes iniEntre { from { opacity:0; transform:scale(1.05); } to { opacity:1; transform:none; } }
  #ini > div { max-width:560px; width:100%; container-type:inline-size; }
  #ini h2 { text-align:center; color:var(--or, #ffd98a); font:bold 7cqw Georgia, serif; margin:0; }
  #ini .ini-st { text-align:center; color:var(--doux, #c9c1ea); font-size:3.6cqw; margin:1.5cqw 0 4cqw; min-height:5cqw; }
  #ini .ini-cartes { display:grid; grid-template-columns:1fr 1fr; gap:3cqw; }
  #ini .ini-c, #ini .ini-c * { box-sizing:border-box; } #ini .ini-c > div { display:block; } #ini .ini-c { display:block; background:#ffffff0d; border:2px solid #ffffff22; border-radius:4cqw; padding:3cqw 2cqw; text-align:center; position:relative; }
  #ini .ini-c.moi { border-color:#7ff0a8; } #ini .ini-c.attend { box-shadow:0 0 5cqw #ffd98a33; }
  #ini .ini-c .ini-n { font:bold 3.8cqw Georgia, serif; color:#efe6ff; } #ini .ini-c .ini-q { font-size:2.8cqw; color:var(--doux, #c9c1ea); min-height:3.6cqw; }
  #ini .ini-c img.ini-po { width:10cqw; height:10cqw; border-radius:50%; object-fit:cover; position:absolute; top:2cqw; left:2cqw; box-shadow:0 0 0 2px #ffffff44; }
  #ini .ini-c .ini-rang { position:absolute; top:2cqw; right:2.5cqw; font:bold 5cqw Georgia, serif; color:var(--or, #ffd98a); text-shadow:0 0 3cqw #ffd98a; }
  #ini .ini-c button { margin-top:2cqw; width:100%; border:0; border-radius:3cqw; padding:2.4cqw; font:bold 3.8cqw Georgia, serif; cursor:pointer; background:linear-gradient(#f7b23a, #e07a12); color:#2a1400; animation:iniPulse 1.2s ease-in-out infinite; }
  #ini h2 .ini-emb { width:11cqw; height:11cqw; vertical-align:middle; margin-right:1cqw; filter:drop-shadow(0 0 2cqw #ffd98a66); }
  #ini .ini-c { background:url('ui/ini/carte.webp?v=1') center/100% 100% no-repeat !important; border:0 !important; padding:5cqw 4cqw 4cqw !important; border-radius:0 !important; }
  #ini .ini-c.moi { filter:drop-shadow(0 0 2.5cqw #7ff0a8); } #ini .ini-c.attend { box-shadow:none !important; filter:drop-shadow(0 0 3cqw #ffd98a88); }
  #ini .ini-c img.ini-po { top:4.5cqw !important; left:4cqw !important; }
  #ini .ini-c .ini-rang { top:3cqw !important; right:3cqw !important; } #ini .ini-c .ini-rang img.ini-med { width:11cqw; height:11cqw; display:block; filter:drop-shadow(0 1cqw 1.5cqw #000a); animation:iniMed .5s ease-out; }
  @keyframes iniMed { from { transform:scale(2.2) rotate(-20deg); opacity:0; } }
  #ini .ini-c button.pour { background:#ffffff18; color:#efe6ff; animation:none; font-size:3cqw; }
  @keyframes iniPulse { 50% { transform:scale(1.05); } }
  #ini .ini-val { font:bold 4.4cqw Georgia, serif; color:#ffe9b0; min-height:5.6cqw; margin-top:1.5cqw; }
  #ini .ini-de { width:20cqw; height:20cqw; margin:3cqw auto 1cqw; border-radius:3cqw; position:relative; }
  #ini .ini-de img { width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 1.4cqw 1.4cqw #000a); }
  #ini .ini-de.cache { background:radial-gradient(circle at 35% 30%, #5a4e8a, #2a2448); box-shadow:inset 0 0 0 .6cqw #8a7ec4, 0 1.4cqw 1.6cqw #000a; }
  #ini .ini-de.cache::after { content:'?'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:8cqw; color:#c9c1ea88; font-weight:bold; }
  #ini .ini-de.tourne img { animation:tourneD .26s linear infinite; }
  #ini .ini-de.pose img { animation:iniPose .35s ease-out; } @keyframes iniPose { 0% { transform:scale(1.25); } 100% { transform:none; } }
  #ini .ini-ordre { text-align:center; margin-top:4cqw; font-size:4cqw; color:#ffe9b0; line-height:1.6; }
  body.ecran-table #ini .ini-cartes { grid-template-columns:repeat(4, 1fr); } body.ecran-table #ini > div { max-width:1100px; }`;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------------ le panneau
var iniFusion = false; // un lancer gardé après un envoi croisé : pas de message « quelqu'un a joué en même temps »
const iniVu = {};          // ce qui est déjà montré : « tour:héros » → nombre de lancers déjà animés
let iniTour = null, iniDebut = 0, iniFermeA = 0;
function iniPeut(i) { // ce téléphone peut-il lancer pour ce héros ?
  if (typeof ECRAN !== 'undefined' && ECRAN) return false;
  if (mesHeros().includes(i)) return true;
  return estHote() && (!proprio(i) || Date.now() - iniDebut > 20000);
}
function iniLance(i) {
  if (!iniActive() || !iniBesoin().includes(i) || !iniPeut(i)) return;
  if (!S.ini || S.ini.t !== S.tours) S.ini = { t:S.tours, v:{} };
  const v = 1 + Math.floor(Math.random() * 6);
  S.ini.v[i] = (S.ini.v[i] || []).concat(v);
  son('relance'); if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
  iniMaj(); if (typeof pousse === 'function') pousse();
}
function iniMaj() {
  let P = document.getElementById('ini');
  // le dernier dé vient d'être lancé : le panneau reste encore un peu pour montrer le classement
  if (P && iniTour === (S && S.tours) && !iniFermeA && iniActive() && !iniEnCours()) iniFermeA = Date.now() + 4300;
  const montrer = iniActive() && !occupe && (iniEnCours() || Date.now() < iniFermeA);
  if (!montrer) { if (P) P.remove(); return; }
  if (iniTour !== S.tours || !P) {
    if (iniTour !== S.tours) { iniTour = S.tours; iniDebut = Date.now(); iniFermeA = 0; }
    if (P) P.remove();
    P = document.createElement('div'); P.id = 'ini';
    P.innerHTML = `<div><h2><img class="ini-emb" src="ui/ini/embleme.webp?v=1" alt=""> L’initiative · tour ${Math.max(1, S.tours)}</h2><div class="ini-st" id="ini-st"></div><div class="ini-cartes">${iniVivants().map(i => { const z = S.heros[i];
      return `<div class="ini-c" id="ini-c${i}"><span class="ini-rang" id="ini-r${i}"></span>${z.portrait ? `<img class="ini-po" src="${z.portrait}" alt="" onerror="this.remove()">` : (typeof H !== 'undefined' && H[z.id] ? `<img class="ini-po" src="portraits/${z.id}.webp" alt="" onerror="this.remove()">` : '')}
        <div class="ini-n">${nomH(z)}</div><div class="ini-q" id="ini-q${i}"></div>${iniDe(i)}<div class="ini-val" id="ini-v${i}"></div><div id="ini-b${i}"></div></div>`; }).join('')}</div><div class="ini-ordre" id="ini-o"></div></div>`;
    document.body.appendChild(P);
  }
  const roule = Date.now() < iniPose;
  const I = iniDuTour() || { v:{} }, besoin = iniBesoin(), egalite = besoin.length && besoin.every(i => (I.v[i] || []).length);
  iniVivants().forEach(i => {
    const c = document.getElementById('ini-c' + i); if (!c) return;
    const l = I.v[i] || [], cle = S.tours + ':' + i, deja = iniVu[cle] || 0, moi = mesHeros().includes(i), doit = besoin.includes(i);
    if (l.length > deja) { iniVu[cle] = l.length; iniRoule(i, l[l.length - 1]); if (!mesHeros().includes(i)) son('relance'); setTimeout(() => { const v = document.getElementById('ini-v' + i); if (v) v.textContent = l.join(' · '); son('choisir'); }, 1050); }
    else if (!l.length) { const v = document.getElementById('ini-v' + i); if (v) v.textContent = ''; }
    c.classList.toggle('moi', moi); c.classList.toggle('attend', doit);
    document.getElementById('ini-q' + i).textContent = moi ? 'ton héros' : proprio(i) ? 'joué par ' + proprio(i) : 'personne ne le joue';
    const b = document.getElementById('ini-b' + i), html = !roule && doit && iniPeut(i) ? (moi ? `<button onclick="iniLance(${i})">🎲 ${l.length ? 'Relancer' : 'Lancer'}</button>` : `<button class="pour" onclick="iniLance(${i})">🎲 Lancer à sa place</button>`) : '';
    if (b.innerHTML !== html) b.innerHTML = html;
  });
  const st = document.getElementById('ini-st'), o = document.getElementById('ini-o');
  if (roule) { st.textContent = '🎲 …'; return; }
  if (besoin.length) {
    const mien = besoin.some(i => iniPeut(i) && mesHeros().includes(i));
    st.textContent = egalite ? '⚖ Égalité ! Les héros à égalité relancent leur dé.' : mien ? 'À toi : touche « Lancer » sous ton héros !' : '⏳ On attend les autres joueurs…';
    o.innerHTML = '';
  } else {
    if (!iniMaj.prog || iniMaj.prog !== S.tours) { iniMaj.prog = S.tours; if (!iniFermeA) iniFermeA = Date.now() + 3200; setTimeout(() => { iniMaj(); if (typeof dessine === 'function') dessine(); if (typeof annonceTour === 'function') annonceTour(); }, 3300); }
    // 23/11 : les médailles peintes (or, argent, bronze) à la place des émojis
    const ordre = iniOrdre(), med = ['🥇', '🥈', '🥉', '4'], MED = ['or', 'argent', 'bronze'];
    ordre.forEach((x, k) => { const r = document.getElementById('ini-r' + x.i); if (r) r.innerHTML = MED[k] ? `<img class="ini-med" src="ui/ini/med-${MED[k]}.webp?v=1" alt="${med[k]}">` : (k + 1); });
    st.textContent = 'Tous les dés sont lancés !';
    setTimeout(() => { if (o) o.innerHTML = ordre.map((x, k) => `${med[k] || k + 1} <b>${nomH(S.heros[x.i])}</b>`).join(' › '); }, 1500);
  }
}
// on recalcule après chaque affichage, à chaque réception, et toutes les demi-secondes (fin d'une animation des monstres, bouton de l'hôte après 20 s)
{ const _d = dessine; dessine = function () { const r = _d.apply(this, arguments); try { iniMaj(); } catch (e) { console.warn('[initiative]', e); } return r; }; }
setInterval(() => { try { if (typeof S !== 'undefined' && S) iniMaj(); else { const P = document.getElementById('ini'); if (P) P.remove(); } } catch (e) {} }, 500);
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
    try { iniMaj(); } catch (e) {}
    return r; }; }
// l'annonce « À toi de jouer » attend la fin des lancers
{ const _a = annonceTour; annonceTour = function () { if (iniEnCours() || Date.now() < iniFermeA) return; return _a.apply(this, arguments); }; }
