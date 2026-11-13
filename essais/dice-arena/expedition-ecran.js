// =============================================================================================== LES EXPÉDITIONS v2 — l'écran (13/11)
// Le port : plateau en deux rangées + la cale + le recruteur ; toucher une recrue puis une place = la déplacer (ou échanger).
// Le combat : le moteur (expedition-moteur.js) calcule tout, l'écran rejoue les événements avec les animations.
const log = () => {}, degats = () => {}, soin = () => {}, altere = () => {}, invoque = () => {}, adv = () => ({}), fin = () => {};
const CLE = 'guilde-expedition2';
let X = null, sel = null, vitesse = 1, enCours = false;
const sauve = () => localStorage.setItem(CLE, JSON.stringify(X));
const lire = () => { try { const x = JSON.parse(localStorage.getItem(CLE) || 'null'); return x && x.v === 2 ? x : null; } catch (e) { return null; } };
const fenetre = html => { document.getElementById('fen').innerHTML = `<div class="fenetre"><div>${html}</div></div>`; };
const fermer = () => { document.getElementById('fen').innerHTML = ''; };
const dodo = ms => new Promise(ok => setTimeout(ok, ms / vitesse));
const app = () => document.getElementById('app');

// ----------------------------------------------------------------------------------------------- accueil
function accueil() {
  const e = lire(); if (e && !e.fini) { X = e; port(); return; }
  app().innerHTML = `<h1>⛵ Les Expéditions</h1>
  <p class="doux" style="text-align:center">Le navire volant de la Guilde part pour six escales. Au port, tu recrutes et tu places ton équipage sur deux rangées ; à chaque escale, il combat tout seul aux dés. Trois cœurs : trois défaites et c’est fini.</p>
  <h2>Ton capitaine</h2><div class="heros6">${ORDRE.map(id => id === 'zephine' && localStorage.getItem('guilde-tuto') !== 'fait'
    ? `<button disabled style="opacity:.5"><img src="${IMG(id)}" alt="" style="filter:grayscale(1)">🔒 ${HEROS[id].nom}</button>`
    : `<button onclick="choixCapitaine('${id}')"><img src="${IMG(id)}" alt="">${HEROS[id].nom}<br><small style="color:var(--or)">${CAPITAINES[id].n}</small></button>`).join('')}</div>
  <div class="choixh"><button onclick="location.href='expeditions-v2-regles.html'">📖 Les règles</button><button onclick="records()">🏆 Mes expéditions</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`;
}
function choixCapitaine(id) {
  fenetre(`<div style="text-align:center"><img src="${IMG(id)}" alt="" style="width:90px;height:90px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px var(--or)"><h2>${HEROS[id].nom}, capitaine</h2>
    <p><b style="color:var(--or)">${CAPITAINES[id].n}</b> : ${CAPITAINES[id].d}</p></div>
    <div class="choixh"><button onclick="fermer()">Autre capitaine</button><button class="or" onclick="fermer();depart('${id}')">⛵ Larguer les amarres</button></div>`);
}
function depart(id) { X = nouvelleExpedition(id); sel = null; sauve(); chroniqueEscale(() => port()); }
// la page de l'escale qui vient (texte seulement : les choix de la v1 jouaient sur l'ancien or)
function chroniqueEscale(apres) {
  const esc = ESCALES2[X.escale]; X.lu = X.lu || {};
  if (!esc || X.lu[X.escale] || typeof CHRON_EXP === 'undefined' || !CHRON_EXP[esc.cle]) { apres(); return; }
  X.lu[X.escale] = true; sauve();
  const p = { ...CHRON_EXP[esc.cle], choix:(CHOIX_EXP2[esc.cle] || []).map(c => ({ t:c.t, d:c.d, f:() => { c.f(X); X.journal.push(`🧭 ${c.t}.`); sauve(); } })) };
  if (esc.type === 'fantome') p.texte = [...p.texte, 'Mais à l’horizon, une autre voile de la Guilde : un capitaine rival veut la même route. Il faudra passer par son équipage.'];
  chronique([p], apres);
}

// ----------------------------------------------------------------------------------------------- le port
function uniteHTML(u, opt) {
  if (!u) return '';
  const r = RECRUES[u.key], cap = u.key === 'capitaine', fam = u.fam ? FAMILLES[u.fam].e : '';
  const tags = [u.barriere || (r && r.barriere) ? 'Barrière' : '', (r && r.charge) || u.charge ? 'Charge' : '', r && r.poison ? 'Poison' : '', r && r.soigneur ? 'Soin' : '', r && r.soinTous ? 'Soin à tous' : '', r && r.tambour ? '+1 atq' : '', r && r.epines ? 'Épines' : ''].filter(Boolean).join(' · ');
  const a = u.a + (u.bonusA || 0), v = u.v + (u.bonusV || 0);
  return `<div class="u ${cap ? 'capitaine' : ''} ${opt && opt.ennemi ? 'ennemi' : ''} ${sel === u.id ? 'sel' : ''}" data-id="${u.id}" ${opt && opt.clic ? `onclick="toucheUnite('${u.id}', event)"` : ''}>
    ${cap ? `<img class="por" src="${IMG(u.hid)}" alt="">` : ''}<b>${u.n}${u.star ? ` <span class="st">${'★'.repeat(u.star)}</span>` : ''}</b>
    <div class="tg">${cap ? '3 dés' : `${fam} ${ROLES[u.role] || ''}`}${tags ? '<br>' + tags : ''}</div><div class="av"><span>⚔ ${a}</span><span>❤ ${v}</span></div></div>`;
}
function famillesHTML(P) {
  const c = compteFamilles(X, P || X.plateau);
  return `<div class="fams">${Object.keys(FAMILLES).map(f => { const n = c[f] || 0, p = palier(n); return `<span class="p${p}" onclick="infoFam('${f}')">${FAMILLES[f].e} ${n}/${p >= 1 ? 4 : 2}</span>`; }).join('')}</div>`;
}
function infoFam(f) { const F = FAMILLES[f], n = compteFamilles(X, X.plateau)[f] || 0;
  fenetre(`<h2>${F.e} ${F.n}</h2><p>Sur le plateau : <b>${n}</b> (la cale ne compte pas).</p><p>${n >= 2 ? '✅' : '⬜'} <b>À 2</b> : ${F.d2}</p><p>${n >= 4 ? '✅' : '⬜'} <b>À 4</b> : ${F.d4}</p>
  <p class="doux">Recrues : ${Object.keys(RECRUES).filter(k => RECRUES[k].fam === f).map(k => RECRUES[k].n).join(', ')}.</p><div class="choixh"><button onclick="fermer()">Fermer</button></div>`); }
function slotHTML(r, i) {
  const u = r === 'cale' ? X.cale[i] : X.plateau[r][i];
  return `<div class="slot ${sel && !u ? 'cible-ok' : ''}" onclick="toucheSlot('${r}', ${i})">${uniteHTML(u, { clic:true })}</div>`;
}
function port() {
  if (!X) { accueil(); return; }
  const esc = ESCALES2[X.escale], selU = sel && aEn(X, ouEst(X, sel) || { r:'cale', i:9 });
  const paires = k => toutes(X).filter(u => u.key === k && u.star === 0).length >= 2;
  app().innerHTML = `
  <div class="entete"><img src="${IMG(X.heros)}" alt=""><div><b>${HEROS[X.heros].nom}</b>, capitaine · <span class="p">💰 ${X.or}</span> <span class="p coeurs">${'❤'.repeat(X.coeurs)}${'🖤'.repeat(3 - X.coeurs)}</span><br><span class="doux">${CAPITAINES[X.heros].n}</span></div></div>
  <div class="route">${ESCALES2.map((x, i) => `<div class="esc ${i < X.escale ? 'faite' : i === X.escale ? 'ici' : ''}"><b>${x.type === 'fantome' ? '👻' : x.e}</b>${i + 1}</div>`).join('')}</div>
  <p class="prochain">Prochaine escale : <b>${esc.e} ${esc.n}</b> · ${esc.type === 'fantome' ? '👻 un navire rival (un autre capitaine)' : esc.type === 'boss' ? '👑 le boss' : '⚔ des monstres'}</p>
  ${famillesHTML()}
  <div class="champ">
    <div class="etiq">DEVANT · ils prennent les coups</div><div class="rangee">${[0, 1, 2].map(i => slotHTML('av', i)).join('')}</div>
    <div class="etiq">DERRIÈRE · Tireurs et Soutiens (les Lames y attendent)</div><div class="rangee">${[0, 1, 2].map(i => slotHTML('ar', i)).join('')}</div>
  </div>
  <div class="etiq">LA CALE · ne combat pas (pour garder une recrue en attendant une fusion)</div><div class="cale">${[0, 1, 2].map(i => slotHTML('cale', i)).join('')}</div>
  ${selU ? `<div class="actions"><span class="doux">${selU.n} : touche une place pour la déplacer.</span>${selU.key !== 'capitaine' ? `<button onclick="vendre()">💰 Vendre (+${selU.star ? 1 + selU.star * 2 : 1})</button>` : ''}${X.heros === 'zephine' && X.transmuOk && selU.key !== 'capitaine' ? '<button onclick="transmuter()">⚗ Transmuter</button>' : ''}<button onclick="sel=null;port()">Annuler</button></div>` : ''}
  <h2>🧭 Le recruteur <small class="doux">(3 pièces, grosses 4 · 3 pareilles = ★)</small></h2>
  <div class="boutique ${X.offre.length > 4 ? 'cinq' : ''}">${X.offre.map((k, i) => { if (!k) return '<div class="offre vide"></div>'; const r = RECRUES[k];
    return `<div class="offre ${paires(k) ? 'paire' : ''}" onclick="voirRecrue(${i})"><span class="prix">${prixRecrue(k)}</span><b>${r.n}</b><div>${FAMILLES[r.fam].e} ${ROLES[r.role]}</div><div class="av" style="display:flex;justify-content:space-between;font-weight:bold"><span>⚔${r.a}</span><span>❤${r.v}</span></div></div>`; }).join('')}</div>
  <div class="actions"><button onclick="relancer()" ${X.or >= 1 ? '' : 'disabled'}>🔄 Relancer (1)</button><button class="${X.gel ? 'on' : ''}" onclick="X.gel=!X.gel;sauve();port()">❄ ${X.gel ? 'Offre gelée' : 'Geler l’offre'}</button><button onclick="aideExp()">❓ Aide</button></div>
  <button class="go" onclick="partir()">⚔ Partir pour l’escale ${X.escale + 1}</button>
  <div class="choixh"><button onclick="journalExp()">📜 Journal</button><button onclick="quitter()">⏏ Quitter</button></div>`;
}
function voirRecrue(i) {
  const k = X.offre[i]; if (!k) return; const r = RECRUES[k], n = toutes(X).filter(u => u.key === k && u.star === 0).length;
  fenetre(`<h2>${r.n}${r.neuf ? ' <small class="doux">(nouvelle)</small>' : ''}</h2><p>${FAMILLES[r.fam].e} ${FAMILLES[r.fam].n} · ${ROLES[r.role]} · ⚔ ${r.a} · ❤ ${r.v}${r.barriere ? ' · Barrière' : ''}${r.charge ? ' · Charge (frappe en premier)' : ''}</p>${r.d ? `<p>${r.d}</p>` : ''}
    ${n ? `<p style="color:var(--ok)">Tu en as déjà ${n} : ${n === 2 ? 'en l’achetant, les trois fusionnent en une recrue ★ !' : 'encore deux pour une ★.'}</p>` : ''}
    <div class="choixh"><button onclick="fermer()">Fermer</button><button class="or" ${X.or >= prixRecrue(k) ? '' : 'disabled'} onclick="acheter(${i})">Recruter (${prixRecrue(k)} 💰)</button></div>`);
}
function acheter(i) { const r = achete(X, i); fermer(); if (!r.ok) { fenetre(`<p>${r.raison}</p><div class="choixh"><button onclick="fermer()">OK</button></div>`); return; } sauve(); port(); if (r.fusion) { const el = document.querySelector(`[data-id="${r.fusion.id}"]`); if (el) el.animate([{ transform:'scale(1.6)', filter:'brightness(2)' }, { transform:'scale(1)', filter:'none' }], { duration:700 }); } }
function relancer() { if (relance(X)) { sauve(); port(); } }
function toucheUnite(id, e) { e.stopPropagation(); if (sel && sel !== id) { const p = ouEst(X, id); deplace(X, sel, p); sel = null; sauve(); port(); return; } sel = sel === id ? null : id; port(); }
function toucheSlot(r, i) { if (!sel) return; const p = { r, i }; if (r === 'cale' && sel === surPlateau(X).find(u => u.key === 'capitaine').id) return; deplace(X, sel, p); sel = null; sauve(); port(); }
function vendre() { if (sel && vend(X, sel)) { sel = null; sauve(); port(); } }
function transmuter() { const n = transmute(X, sel); sel = null; sauve(); port(); if (n) fenetre(`<h2>⚗ Transmutation</h2><p>Ta recrue devient <b>${n.n}</b>.</p><div class="choixh"><button onclick="fermer()">OK</button></div>`); }
function aideExp() { fenetre(`<h2>❓ Le port</h2><ul style="padding-left:1.1em">
  <li><b>Recruter</b> : touche une recrue du recruteur. 3 pareilles fusionnent en une ★ (doublée) ; 3 ★ font une ★★.</li>
  <li><b>Placer</b> : touche une recrue puis une place. Devant : Remparts (Barrière) et Lames. Derrière : Tireurs (ils frappent de loin) et Soutiens (ils soignent). Une Lame derrière attend que le devant tombe.</li>
  <li><b>Les familles</b> (en haut) : 2 ou 4 recrues de la même famille sur le plateau donnent un bonus. Touche-les pour le voir.</li>
  <li><b>L’or</b> : +8 après chaque escale, +1 par tranche de 5 gardées (3 au plus). Relancer : 1. Geler : garder la même offre.</li>
  <li><b>Les cœurs</b> : perdre une escale coûte un cœur ; on continue. Le boss se rejoue tant qu’il reste un cœur.</li></ul><div class="choixh"><button onclick="fermer()">OK</button></div>`); }

// ----------------------------------------------------------------------------------------------- le combat rejoué
function rangees(P, ennemi) {
  const r = (rr) => `<div class="rangee">${[0, 1, 2].map(i => `<div class="slot" style="border-style:solid;border-color:#0000">${uniteHTML(P[rr][i], { ennemi })}</div>`).join('')}</div>`;
  return ennemi ? r('ar') + r('av') : r('av') + r('ar');
}
const elU = id => document.querySelector(`[data-id="${id}"]`);
function flotteU(id, txt, cls) { const el = elU(id); if (!el) return; const d = document.createElement('div'); d.className = cls || 'dg'; d.textContent = txt; el.appendChild(d); setTimeout(() => d.remove(), 900 / vitesse); }
function vieU(id, v) { const el = elU(id); if (!el) return; const s = el.querySelector('.av span:last-child'); if (s) s.textContent = '❤ ' + Math.max(0, v); }
function deU(id, de) { const el = elU(id); if (!el) return; let d = el.querySelector('.de'); if (!d) { d = document.createElement('div'); d.className = 'de'; el.appendChild(d); } d.textContent = Array.isArray(de) ? de.join('') : de; }
async function anim(id, cls, ms) { const el = elU(id); if (!el) return; el.classList.add(cls); await dodo(ms || 300); el.classList.remove(cls); }
async function partir() {
  if (enCours) return; enCours = true; sel = null;
  const esc = ESCALES2[X.escale], avant = JSON.parse(JSON.stringify(X));
  const res = joueEscale(X, hasardX(X)); sauve();
  // les unités du combat portent les mêmes identifiants que celles du plateau : on dessine l'état d'avant
  const A = res.adv.camp.plateau, noms = {}; [...avant.plateau.av, ...avant.plateau.ar, ...A.av, ...A.ar].filter(Boolean).forEach(u => { noms[u.id] = u.n; });
  app().innerHTML = `<div class="entete"><div style="flex:1;text-align:center"><b>${esc.e} ${res.adv.nom}</b>${res.adv.fantome ? `<br><span class="doux">capitaine rival : ${HEROS[res.adv.fantome].nom} · ${CAPITAINES[res.adv.fantome].n}</span>` : ''}</div></div>
  <div class="champ lieu-${esc.cle}">${rangees(A, true)}<div class="milieu">⚔ ✦ ⚔</div>${rangees(avant.plateau, false)}
  <div class="vitesse">Vitesse : ${[1, 2, 4].map(v => `<button class="${vitesse === v ? 'sel' : ''}" onclick="vitesse=${v};document.querySelectorAll('.vitesse button').forEach(b=>b.classList.toggle('sel', b.textContent==='×${v}'))">×${v}</button>`).join('')}</div></div>
  <div class="journal" id="jc"></div>`;
  const J = []; const jl = t => { J.unshift(t); const j = document.getElementById('jc'); if (j) j.innerHTML = J.slice(0, 40).map(x => `<div>${x}</div>`).join(''); };
  await dodo(500);
  for (const e of res.ev) {
    if (e.t === 'round') { jl(`— Round ${e.n}`); await dodo(250); continue; }
    if (e.t === 'coup') { if (e.de) deU(e.src, e.de); await anim(e.src, 'frappe', 260); if (e.dg > 0) { vieU(e.id, e.v); flotteU(e.id, '−' + e.dg); await anim(e.id, 'touche', 260); } jl(`${noms[e.src]} → ${noms[e.id]} : ${e.dg > 0 ? e.dg : 'raté'}${e.txt ? ' (' + e.txt + ')' : ''}`); await dodo(150); continue; }
    if (e.t === 'esquive') { await anim(e.src, 'frappe', 220); await anim(e.id, 'esq', 300); jl(`${noms[e.id]} esquive (Ombre).`); continue; }
    if (e.t === 'soin') { flotteU(e.id, '+' + e.n, 'sv'); const el = elU(e.id); if (el) { const s = el.querySelector('.av span:last-child'); if (s) s.textContent = '❤ ' + (Math.max(0, +s.textContent.replace(/\D/g, '')) + e.n); } await dodo(120); continue; }
    if (e.t === 'epines') { vieU(e.id, e.v); flotteU(e.id, '−' + e.n); jl(`${noms[e.id]} se pique aux Épines (−${e.n}).`); await dodo(150); continue; }
    if (e.t === 'poison') { vieU(e.id, e.v); flotteU(e.id, '−' + e.n); jl(`${noms[e.id]} : Poison −${e.n}.`); await dodo(150); continue; }
    if (e.t === 'mort') { const el = elU(e.id); if (el) el.classList.add('mort'); jl(`💀 ${noms[e.id]} tombe.`); await dodo(200); continue; }
    if (e.t === 'serment') { flotteU(e.id, '🛡 Serment', 'sv'); jl(`🛡 Serment d’Aldric : ${noms[e.id]} reste debout à 1 PV !`); await dodo(400); continue; }
    if (e.t === 'avance') { jl(`${noms[e.id]} avance au premier rang.`); continue; }
  }
  enCours = false;
  const g = res.gagne;
  const lignes = [g ? '🏆 <b>Victoire !</b>' : '💔 <b>Défaite</b> : un cœur de moins.', res.forge ? `⚒ Forge : ${res.forge}.` : '', res.maelle ? `⚒ La forge du bord : ${res.maelle}.` : '', res.louve ? '🐺 La Louve rejoint l’équipage !' : '', !X.fini && res.gain ? `💰 +${res.gain} pièces${res.interet ? ` (dont ${res.interet} d’intérêts)` : ''}.` : ''].filter(Boolean).map(t => `<p>${t}</p>`).join('');
  if (X.fini) { setTimeout(() => finExp(), 600 / vitesse); return; }
  fenetre(`<h2>${g ? '🏆' : '💔'} ${esc.n}</h2>${lignes}<p class="doux">Les recrues tombées se relèvent au port : chaque combat commence à pleine vie.</p><div class="choixh"><button class="or" onclick="fermer();chroniqueEscale(() => port())">⚓ Au port</button></div>`);
}

// ----------------------------------------------------------------------------------------------- fin, journal, records
function finExp() {
  const gagne = X.fini === 'gagne', parfait = gagne && X.coeurs === 3, score = X.victoires * 100 + X.coeurs * 100 + X.or + (gagne ? 300 : 0) + (parfait ? 200 : 0);
  const l = lireRec(); l.unshift({ quand:new Date().toISOString(), heros:X.heros, gagne, parfait, score, escales:X.victoires, coeurs:X.coeurs, duree:Math.round((Date.now() - X.debut) / 60000) });
  localStorage.setItem(CLE + '-records', JSON.stringify(l.slice(0, 50))); localStorage.removeItem(CLE);
  const h = HEROS[X.heros].nom; X = null;
  fenetre(`<h2>${parfait ? '🌟 Traversée parfaite !' : gagne ? '🏆 Le Titan est tombé !' : '💀 Le navire rentre au port'}</h2><p>${gagne ? `L’équipage de ${h} a vaincu le Nid du Titan${parfait ? ' sans perdre un seul cœur' : ''}.` : `Plus de cœurs : l’équipage de ${h} rentre à la Guilde.`}</p>
  <p style="font-size:1.5em;color:var(--or);text-align:center">${score} points</p><div class="choixh"><button class="or" onclick="fermer();accueil()">⛵ Nouvelle expédition</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`);
}
function journalExp() { fenetre(`<h2>📜 Journal de bord</h2><div class="journal">${[...X.journal].reverse().map(t => `<div>${t}</div>`).join('')}</div><div class="choixh"><button onclick="fermer()">Fermer</button></div>`); }
function quitter() { fenetre('<h2>⏏ Quitter</h2><p>L’expédition est gardée sur ce téléphone. Ou on l’abandonne (comptée perdue).</p><div class="choixh"><button onclick="location.href=\'menu.html\'">⌂ Menu, je reprendrai</button><button onclick="X.fini=\'perdu\';X.coeurs=0;fermer();finExp()">Abandonner</button></div>'); }
const lireRec = () => { try { return JSON.parse(localStorage.getItem(CLE + '-records') || '[]'); } catch (e) { return []; } };
function records() { const l = lireRec(); fenetre(`<h2>🏆 Mes expéditions (${l.length})</h2>${l.length ? `<table>${l.map(r => `<tr><td>${r.parfait ? '🌟' : r.gagne ? '🏆' : '💀'} ${new Date(r.quand).toLocaleDateString('fr-FR')} · ${HEROS[r.heros].nom} · ${r.escales} victoire${r.escales > 1 ? 's' : ''}</td><td>${r.score}</td></tr>`).join('')}</table>` : '<p>Aucune encore.</p>'}<div class="choixh"><button onclick="fermer()">Fermer</button></div>`); }
if (document.getElementById('app')) accueil();
