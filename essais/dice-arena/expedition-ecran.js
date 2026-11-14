// =============================================================================================== LES EXPÉDITIONS v2 — l'écran (13/11)
// Le port : plateau en deux rangées + la cale + le recruteur ; toucher une recrue puis une place = la déplacer (ou échanger).
// Le combat : le moteur (expedition-moteur.js) calcule tout, l'écran rejoue les événements avec les animations.
const log = () => {}, degats = () => {}, soin = () => {}, altere = () => {}, invoque = () => {}, adv = () => ({}), fin = () => {};
const CLE = 'guilde-expedition2';
let X = null, sel = null, vitesse = 1, enCours = false, tiroir = true;
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
// 14/11 (l'utilisateur : « je ne peux pas cliquer sur les créatures, ni sur les étiquettes ; plus sympa que des cases jaunes ; sur une page ») :
// de vraies cartes (illustration en fond, ce que fait la carte en un mot), une FICHE au toucher, tout l'écran du port sans défilement.
const ART_EXP = { chien:'chien-garde' }; // illustrations : cartes/<clé>.webp (même nom que la carte du Duel, sauf exceptions)
const ROLE_COURT = { rempart:'🛡 garde', lame:'⚔ mêlée', tireur:'🏹 tire', soutien:'✚ aide + frappe', capitaine:'🎲 3 dés' };
const ROLE_LONG = {
  rempart:'🛡 <b>Rempart</b> : se place DEVANT et prend les coups. Il attaque aussi, au corps à corps.',
  lame:'⚔ <b>Lame</b> : attaque au corps à corps depuis le DEVANT. Placée derrière, elle attend que le devant tombe pour avancer.',
  tireur:'🏹 <b>Tireur</b> : tire de loin, DERRIÈRE (ou devant). Il frappe chaque round, même protégé par le devant.',
  soutien:'✚ <b>Soutien</b> : depuis DERRIÈRE, il aide l’équipage (bonus, soins) ET frappe avec sa petite attaque. Les bonus d’attaque du Clan et des Tambours sont pour les autres (sauf le Clan à 4).',
  capitaine:'🎲 <b>Capitaine</b> : lance 3 dés à chaque round et frappe avec le meilleur. S’il tombe, le combat continue sans lui.' };
const ETIQ = { 'Barrière':'Les ennemis doivent le frapper avant les autres.', 'Charge':'Frappe en premier, avant tout le monde.', 'Poison':'Sa cible perd 1 PV à chaque round.',
  'Soin':'Soigne de 2 l’allié le plus blessé à chaque round.', 'Soin à tous':'Soigne de 1 tout l’équipage à chaque round.', '+1 atq':'Tous les autres membres de l’équipage ont +1 attaque (plusieurs Tambours ne s’additionnent pas).',
  'Épines':'Qui le frappe perd 1 PV.' };
function etiquettes(u) { const r = RECRUES[u.key] || {};
  return [u.barriere || r.barriere ? 'Barrière' : '', r.charge || u.charge ? 'Charge' : '', r.poison ? 'Poison' : '', r.soigneur ? 'Soin' : '', r.soinTous ? 'Soin à tous' : '', r.tambour ? '+1 atq' : '', r.epines ? 'Épines' : ''].filter(Boolean); }
function uniteHTML(u, opt) {
  if (!u) return '';
  const cap = u.key === 'capitaine', fam = u.fam && FAMILLES[u.fam] ? FAMILLES[u.fam].e : '', tags = etiquettes(u);
  const a = u.a + (u.bonusA || 0), v = u.v + (u.bonusV || 0), ennemi = opt && opt.ennemi;
  const art = cap ? IMG(u.hid) : u.key === 'm' ? '' : `cartes/${ART_EXP[u.key] || u.key}.webp`;
  const clic = opt && opt.clic ? `onclick="toucheUnite('${u.id}', event)"` : `onclick="ficheUnite('${u.id}', event)"`;
  return `<div class="u carte ${cap ? 'capitaine' : ''} ${ennemi ? 'ennemi' : ''} ${u.role === 'soutien' ? 'soutien' : ''} ${sel === u.id ? 'sel' : ''}" data-id="${u.id}" ${clic} style="${art ? `background-image:url('${art}')` : ''}">
    ${art ? '' : `<span class="sansart">${ennemi ? '👹' : '❔'}</span>`}<span class="nm">${u.n}${u.star ? ` <span class="st">${'★'.repeat(u.star)}</span>` : ''}</span>${fam ? `<span class="fm">${fam}</span>` : ''}
    <span class="rl">${ROLE_COURT[u.role] || ''}${tags.length ? '<br>' + tags.join(' · ') : ''}</span>
    <div class="av"><span>⚔ ${a}</span><span>❤ ${v}</span></div></div>`;
}
// la fiche d'une unité (au port, en combat, chez le recruteur)
function ficheHTML(u, r) {
  const cap = u.key === 'capitaine', tags = etiquettes(u), art = cap ? IMG(u.hid) : u.key === 'm' ? '' : `cartes/${ART_EXP[u.key] || u.key}.webp`;
  return `<div class="fiche">${art ? `<img src="${art}" alt="">` : ''}<div><h2>${u.n}${u.star ? ` <span class="st">${'★'.repeat(u.star)}</span>` : ''}</h2>
    <p class="doux">${u.fam && FAMILLES[u.fam] ? `${FAMILLES[u.fam].e} ${FAMILLES[u.fam].n} · ` : ''}⚔ ${u.a + (u.bonusA || 0)} · ❤ ${u.v + (u.bonusV || 0)}</p></div></div>
    <p>${ROLE_LONG[u.role] || (u.tireur ? ROLE_LONG.tireur : ROLE_LONG.lame)}</p>
    ${cap && CAPITAINES[u.hid] ? `<p>🧭 <b>${CAPITAINES[u.hid].n}</b> : ${CAPITAINES[u.hid].d}</p>` : ''}
    ${tags.map(t => `<p>🏷 <b>${t}</b> : ${ETIQ[t] || ''}</p>`).join('')}${r && r.d && !tags.length ? `<p>${r.d}</p>` : ''}
    ${u.star ? `<p class="doux">★ = trois recrues pareilles fusionnées : attaque et vie doublées.</p>` : ''}`;
}
let ficheDe = {};
function ficheUnite(id, e) { if (e) e.stopPropagation(); const u = ficheDe[id] || (X && toutes(X).find(x => x.id === id)); if (!u) return;
  fenetre(`${ficheHTML(u, RECRUES[u.key])}<div class="choixh"><button onclick="fermer()">Fermer</button></div>`); }
function famillesHTML(P) {
  const c = compteFamilles(X, P || X.plateau);
  return `<div class="fams">${Object.keys(FAMILLES).map(f => { const n = c[f] || 0, p = palier(n); return `<span class="p${p}" onclick="infoFam('${f}')">${FAMILLES[f].e} ${n}/${p >= 1 ? 4 : 2} ⓘ</span>`; }).join('')}</div>`;
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
  <div class="entete"><img src="${IMG(X.heros)}" alt=""><div><b>${HEROS[X.heros].nom}</b>, capitaine · <span class="p">💰 ${X.or}</span> <span class="p coeurs">${'❤'.repeat(X.coeurs)}${'🖤'.repeat(3 - X.coeurs)}</span><br><span class="doux">${CAPITAINES[X.heros].n}</span></div><span class="ic" onclick="journalExp()">📜</span><span class="ic" onclick="quitter()">⏏</span></div>
  <div class="route">${ESCALES2.map((x, i) => `<div class="esc ${i < X.escale ? 'faite' : i === X.escale ? 'ici' : ''}"><b>${x.type === 'fantome' ? '👻' : x.e}</b>${i + 1}</div>`).join('')}</div>
  <p class="prochain">Prochaine escale : <b>${esc.e} ${esc.n}</b> · ${esc.type === 'fantome' ? '👻 un navire rival (un autre capitaine)' : esc.type === 'boss' ? '👑 le boss' : '⚔ des monstres'}</p>
  ${famillesHTML()}
  <div class="champ">
    <div class="etiq">DEVANT · prennent les coups</div><div class="rangee">${[0, 1, 2].map(i => slotHTML('av', i)).join('')}</div>
    <div class="etiq">DERRIÈRE · 🏹 tirent, ✚ aident et frappent un peu</div><div class="rangee">${[0, 1, 2].map(i => slotHTML('ar', i)).join('')}</div>
  </div>
  <div class="etiq">LA CALE · ne combat pas</div><div class="cale">${[0, 1, 2].map(i => slotHTML('cale', i)).join('')}</div>
  ${selU ? `<div class="feuille">${ficheHTML(selU, RECRUES[selU.key])}<p class="ok">👉 Touche une place pour la déplacer.</p></div><div class="actions">${selU.key !== 'capitaine' ? `<button onclick="vendre()">💰 Vendre (+${selU.star ? 1 + selU.star * 2 : 1})</button>` : ''}${X.heros === 'zephine' && X.transmuOk && selU.key !== 'capitaine' ? '<button onclick="transmuter()">⚗ Transmuter</button>' : ''}<button onclick="sel=null;port()">Annuler</button></div>` : ''}
  <div class="tiroir ${tiroir ? '' : 'ferme'}"><div class="poignee" onclick="tiroir=!tiroir;port()">🧭 LE RECRUTEUR · 3 💰 · 3 pareilles = ★ <b>${tiroir ? '▼' : '▲'}</b></div>
  <div class="contenu"><div class="boutique ${X.offre.length > 4 ? 'cinq' : ''}">${X.offre.map((k, i) => { if (!k) return '<div class="offre vide"></div>'; const r = RECRUES[k];
    return `<div class="offre carte ${paires(k) ? 'paire' : ''} ${r.role === 'soutien' ? 'soutien' : ''}" onclick="voirRecrue(${i})" style="background-image:url('cartes/${ART_EXP[k] || k}.webp')"><span class="prix">${prixRecrue(k)}</span><span class="nm">${r.n}</span><span class="fm">${FAMILLES[r.fam].e}</span><span class="rl">${ROLE_COURT[r.role]}</span><div class="av"><span>⚔ ${r.a}</span><span>❤ ${r.v}</span></div></div>`; }).join('')}</div>
  <div class="actions"><button onclick="relancer()" ${X.or >= 1 ? '' : 'disabled'}>🔄 Relancer (1)</button><button class="${X.gel ? 'on' : ''}" onclick="X.gel=!X.gel;sauve();port()">❄ ${X.gel ? 'Offre gelée' : 'Geler l’offre'}</button><button onclick="aideExp()">❓ Aide</button></div></div>
  <button class="go" onclick="partirOk()">⚔ Partir pour l’escale ${X.escale + 1}</button></div>`;
  if (!localStorage.getItem('guilde-exp-guide')) guidePort(false);
  document.body.style.setProperty('--decor', `url('decor/escale-${esc.cle}.webp?v=1')`);
}
function voirRecrue(i) {
  const k = X.offre[i]; if (!k) return; const r = RECRUES[k], n = toutes(X).filter(u => u.key === k && u.star === 0).length;
  fenetre(`${ficheHTML({ key:k, n:r.n, fam:r.fam, role:r.role, a:r.a, v:r.v, star:0 }, r)}
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
  <li><b>Placer</b> : touche une recrue puis une place. Devant : Remparts (Barrière) et Lames. Derrière : Tireurs (ils frappent de loin) et Soutiens (ils aident et frappent un peu). Une Lame derrière attend que le devant tombe.</li>
  <li><b>Les familles</b> (en haut) : 2 ou 4 recrues de la même famille sur le plateau donnent un bonus. Touche-les pour le voir.</li>
  <li><b>L’or</b> : +8 après chaque escale, +1 par tranche de 5 gardées (3 au plus). Relancer : 1. Geler : garder la même offre.</li>
  <li><b>Les cœurs</b> : perdre une escale coûte un cœur ; on continue. Le boss se rejoue tant qu’il reste un cœur.</li></ul><div class="choixh"><button onclick="fermer();guidePort(true)">🐱 Revoir le guide</button><button class="or" onclick="fermer()">OK</button></div>`); }

// ----------------------------------------------------------------------------------------------- le combat rejoué
// 14/11 (décision de l'utilisateur) : le combat se regarde de haut en bas sur le décor de l'escale (Gemini) : les ennemis sur le lieu, l'équipage
// sur la proue ; chaque unité est un médaillon (la fiche complète s'ouvre au toucher).
const PORTRAIT_M = { 'Gobelin':'m-gobelin', 'Gobelin chef':'m-chefgobelin', 'Gobelin lanceur':'m-gobelin', 'Loup de braise':'m-loup', 'Louveteau':'m-loup', 'Salamandre':'m-salamandre',
  'Élémentaire de lave':'m-elementaire', 'Golem de scories':'m-golem', 'Drake de cendre':'m-drake', 'Flammèche':'m-salamandre', 'Le Titan de feu':'m-titan', 'Cultiste du feu':'m-cultiste' };
const artU = u => u.key === 'capitaine' ? IMG(u.hid) : u.key === 'm' ? (PORTRAIT_M[u.n] ? `portraits/${PORTRAIT_M[u.n]}.webp` : '') : `cartes/${ART_EXP[u.key] || u.key}.webp`;
// où se tiennent les ennemis sur chaque décor (en % de l'écran : haut de la rangée du fond, haut de la rangée de devant, décalage horizontal)
// 14/11 : les plateaux vus du dessus (s'il y en a un pour l'escale, il remplace le décor en perspective) : [rangée du fond, rangée de devant] des ennemis, puis de l'équipage
const PLATEAUX_EXP = { crique:{ enn:[10, 26], equ:[62, 78] }, falaises:{ enn:[11, 26], equ:[63, 79] }, port:{ enn:[13, 29], equ:[63, 79] }, foret:{ enn:[11, 26], equ:[64, 80] }, cratere:{ enn:[10, 26], equ:[63, 79] }, nid:{ enn:[13, 29], equ:[65, 81] } };
const fondEscale = cle => PLATEAUX_EXP[cle] ? `decor/plateau-${cle}.webp?v=1` : `decor/escale-${cle}.webp?v=1`;
const LIEU_ENN = { crique:[29, 41, 0], falaises:[27, 39, 14], port:[28, 39, 0], foret:[20, 31, 4], cratere:[25, 36, 0], nid:[18, 29, 0] };
function medHTML(u, ennemi) {
  if (!u) return '<div class="med vide"></div>';
  const art = artU(u), a = u.a + (u.bonusA || 0), v = u.v + (u.bonusV || 0);
  return `<div class="u med ${ennemi ? 'ennemi' : ''} ${u.key === 'capitaine' ? 'capitaine' : ''} ${u.boss ? 'boss' : ''}" data-id="${u.id}" onclick="ficheUnite('${u.id}', event)">
    <div class="rond" style="${art ? `background-image:url('${art}')` : ''}">${art ? '' : '👹'}</div><div class="pvb" data-max="${v}"><i style="width:100%"></i></div><span class="nm">${u.n}${u.star ? ' ' + '★'.repeat(u.star) : ''}</span><div class="av"><span>⚔ ${a}</span><span>❤ ${v}</span></div></div>`;
}
function ligneMed(P, r, ennemi, top, dx) { return `<div class="lignemed" style="top:${top}%;left:${dx}%">${[0, 1, 2].map(i => medHTML(P[r][i], ennemi)).join('')}</div>`; }
const elU = id => document.querySelector(`[data-id="${id}"]`);
function flotteU(id, txt, cls) { const el = elU(id); if (!el) return; const d = document.createElement('div'); d.className = cls || 'dg'; d.textContent = txt; el.appendChild(d); setTimeout(() => d.remove(), 900 / vitesse); }
function vieU(id, v) { const el = elU(id); if (!el) return; const s = el.querySelector('.av span:last-child'); if (s) s.textContent = '❤ ' + Math.max(0, v);
  const b = el.querySelector('.pvb'); if (b) { const m = +b.dataset.max || 1, i = b.querySelector('i'); i.style.width = Math.max(0, Math.min(100, v / m * 100)) + '%'; i.style.background = v / m > .5 ? '#3fd06a' : v / m > .25 ? '#f0b429' : '#e5452e'; } }
// 14/11 (l'utilisateur : « pas d'animation, pas de griffure, pas de perte de vie, des pions qui tremblent sans bruit ») : les effets du combat
const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.width / 2]; };
function fxPose(x, y, img, taille, ms, cls) {
  const d = document.createElement('img'); d.src = 'effets/' + img + '.webp'; d.className = 'fxe ' + (cls || ''); d.style.cssText = `left:${x}px;top:${y}px;width:${taille}px;height:${taille}px;animation-duration:${ms / vitesse}ms`;
  document.body.appendChild(d); setTimeout(() => d.remove(), ms / vitesse + 50);
}
async function coupFx(e) {
  const a = elU(e.src), c = elU(e.id); if (!a || !c) return;
  const u = ficheDe[e.src] || {}, tireur = u.role === 'tireur' || u.tireur, [ax, ay] = centre(a), [cx, cy] = centre(c);
  if (tireur) { // la flèche file vers la cible
    GM.son('tir'); const f = document.createElement('img'); f.src = 'effets/fleche.webp'; f.className = 'fxe fleche';
    const ang = Math.atan2(cy - ay, cx - ax) * 180 / Math.PI; f.style.cssText = `left:${ax}px;top:${ay}px;width:56px;height:56px;transform:translate(-50%,-50%) rotate(${ang + 45}deg)`;
    document.body.appendChild(f); a.animate([{ transform:'scale(1)' }, { transform:'scale(1.12)' }, { transform:'scale(1)' }], { duration:300 / vitesse });
    f.animate([{ left:ax + 'px', top:ay + 'px' }, { left:cx + 'px', top:cy + 'px' }], { duration:320 / vitesse, easing:'ease-in', fill:'forwards' });
    await dodo(320); f.remove();
  } else { // l'attaquant bondit vers sa cible
    const dx = (cx - ax) * .55, dy = (cy - ay) * .55;
    a.style.zIndex = 5; a.animate([{ transform:'none' }, { transform:`translate(${dx}px,${dy}px) scale(1.15)`, offset:.55 }, { transform:'none' }], { duration:420 / vitesse, easing:'ease-in-out' });
    await dodo(230); setTimeout(() => { a.style.zIndex = ''; }, 300 / vitesse);
  }
  if (e.dg > 0) {
    const gros = e.dg >= 6; GM.son(tireur ? 'monstre-touche' : gros ? 'gros' : 'griffe');
    fxPose(cx, cy, tireur ? 'impact' : 'griffe' + (1 + Math.floor(Math.random() * 3)), gros ? 120 : 92, 520);
    const r = c.querySelector('.rond'); if (r) r.animate([{ filter:'none' }, { filter:'brightness(1.8) sepia(1) hue-rotate(-40deg) saturate(5)' }, { filter:'none' }], { duration:380 / vitesse });
    c.animate([{ transform:'none' }, { transform:'translateX(-7px) rotate(-4deg)' }, { transform:'translateX(7px) rotate(4deg)' }, { transform:'none' }], { duration:320 / vitesse });
    vieU(e.id, e.v); flotteU(e.id, '−' + e.dg, 'dg' + (gros ? ' gros' : ''));
  } else { GM.son('bouclier'); flotteU(e.id, 'raté', 'dg rate'); }
}

// 14/11 : le dé lancé par l'attaquant se voit vraiment (il roule, puis montre sa face) ; capitaine = ses 3 dés de héros, recrues et monstres = un dé à points
const PIPS = { 1:[[50,50]], 2:[[28,28],[72,72]], 3:[[25,25],[50,50],[75,75]], 4:[[28,28],[72,28],[28,72],[72,72]], 5:[[25,25],[75,25],[50,50],[25,75],[75,75]], 6:[[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]] };
const deSVG = (n, rouge) => `<svg viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="18" fill="${rouge ? '#ffe3dc' : '#fff8e6'}" stroke="#2b1d0a" stroke-width="6"/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${n === 6 ? '#c2410c' : '#2b1d0a'}"/>`).join('')}</svg>`;
async function deU(id, de) {
  const el = elU(id); if (!el) return; el.querySelectorAll('.lance').forEach(x => x.remove());
  const u = ficheDe[id] || {}, ds = Array.isArray(de) ? de : [de], cap = u.key === 'capitaine';
  const face = v => cap ? `<img src="faces-${u.hid}/face-${v}.webp" alt="${v}">` : deSVG(v, !!u.key && u.key === 'm');
  const d = document.createElement('div'); d.className = 'lance'; el.appendChild(d); GM.son('relance');
  for (let t = 0; t < 4; t++) { d.innerHTML = ds.map(() => face(1 + Math.floor(Math.random() * 6))).join(''); d.classList.toggle('roule', t % 2 === 0); await dodo(70); }
  d.classList.remove('roule'); d.innerHTML = ds.map(face).join('');
  if (!cap && de === 6) d.insertAdjacentHTML('beforeend', '<b class="crit">critique !</b>'); if (!cap && de === 1) d.insertAdjacentHTML('beforeend', '<b class="crit rate">raté</b>');
  setTimeout(() => d.remove(), 1400 / vitesse);
}
async function anim(id, cls, ms) { const el = elU(id); if (!el) return; el.classList.add(cls); await dodo(ms || 300); el.classList.remove(cls); }
// 14/11 (choix de l'utilisateur, « A · Ordres du capitaine ») : avant chaque escale, le capitaine lance ses 3 dés (2 relances)
// et pose chaque dé sur une recrue : 1-2 = +3 PV, 3-4 = +2 attaque, 5-6 = coup sûr (son premier coup est un critique).
// Paire = tout l'équipage +1 attaque, brelan = +2 attaque, suite = +3 PV à tous.
let OD = null;
const BONUS_DE = v => v <= 2 ? { v:3, t:'+3 ❤', n:'Armure' } : v <= 4 ? { a:2, t:'+2 ⚔', n:'Rage' } : { sur:true, t:'coup sûr', n:'Coup sûr' };
function comboOrdres(ds) { const s = [...ds].sort((a, b) => a - b);
  if (s[0] === s[2]) return { a:2, t:'Brelan : tout l’équipage +2 ⚔' };
  if (s[0] === s[1] || s[1] === s[2]) return { a:1, t:'Paire : tout l’équipage +1 ⚔' };
  if (s[1] === s[0] + 1 && s[2] === s[1] + 1) return { v:3, t:'Suite : tout l’équipage +3 ❤' };
  return null; }
function ordres() { OD = { des:[0, 0, 0], sur:[null, null, null], sel:null, relances:2, lance:false }; dessineOrdres(); }
async function lancerOrdres() {
  const quoi = OD.lance ? OD.des.map((v, i) => OD.sel === i || (OD.sel === null && OD.sur[i] === null) ? i : -1).filter(i => i >= 0) : [0, 1, 2];
  if (OD.lance) { if (!OD.relances || !quoi.length) return; OD.relances--; }
  OD.lance = true; GM.son('relance');
  for (let t = 0; t < 6; t++) { quoi.forEach(i => { OD.des[i] = 1 + Math.floor(Math.random() * 6); }); dessineOrdres(true); await new Promise(r => setTimeout(r, 70)); }
  OD.sel = null; GM.son('poser'); dessineOrdres();
}
function toucheDeOrdre(i) { if (!OD.lance) return; OD.sel = OD.sel === i ? null : i; GM.son('choisir'); dessineOrdres(); }
function toucheRecrueOrdre(id) { if (OD.sel === null) return; OD.sur[OD.sel] = id; OD.sel = null; GM.son('poser'); dessineOrdres(); }
function dessineOrdres(roule) {
  const H = X.heros, crew = surPlateau(X), combo = OD.lance ? comboOrdres(OD.des) : null, poses = OD.sur.filter(Boolean).length;
  const de = i => `<div class="dord ${OD.sel === i ? 'sel' : ''} ${OD.sur[i] ? 'pose' : ''} ${roule ? 'roule' : ''}" onclick="toucheDeOrdre(${i})">${OD.lance ? `<img src="faces-${H}/face-${OD.des[i]}.webp" alt="${OD.des[i]}"><small>${BONUS_DE(OD.des[i]).t}</small>` : '<span>?</span>'}</div>`;
  const carteO = u => { const idx = OD.sur.map((x, i) => x === u.id ? i : -1).filter(i => i >= 0);
    return `<div class="rord ${OD.sel !== null ? 'cible' : ''}" onclick="toucheRecrueOrdre('${u.id}')"><div class="rond" style="background-image:url('${artU(u)}')"></div><b>${u.n}</b><span>⚔ ${u.a + (u.bonusA || 0)} · ❤ ${u.v + (u.bonusV || 0)}</span>${idx.map(i => `<img class="mini" src="faces-${H}/face-${OD.des[i]}.webp" alt="">`).join('')}${idx.length ? `<em>${idx.map(i => BONUS_DE(OD.des[i]).t).join(' · ')}</em>` : ''}</div>`; };
  app().innerHTML = `<div class="ordres">
    <h2>🎲 Les ordres du capitaine</h2>
    <p class="doux">${!OD.lance ? 'Lance tes 3 dés, puis pose chacun sur une recrue : il lui donne un bonus pour ce combat.' : OD.sel !== null ? '👉 Touche la recrue qui reçoit ce dé.' : poses < 3 ? 'Touche un dé, puis une recrue. Tu peux aussi relancer les dés pas encore posés.' : 'Tous tes ordres sont donnés !'}</p>
    <div class="dords">${[0, 1, 2].map(de).join('')}</div>
    <div class="legord"><span>⚀⚁ 1-2 : <b>+3 ❤</b></span><span>⚂⚃ 3-4 : <b>+2 ⚔</b></span><span>⚄⚅ 5-6 : <b>coup sûr</b> (1er coup critique)</span></div>
    ${combo ? `<p class="combo">✨ ${combo.t}</p>` : OD.lance ? '<p class="doux" style="text-align:center;font-size:.8em">Une paire, un brelan ou une suite donnent un bonus à tout l’équipage.</p>' : ''}
    <div class="rords">${crew.map(carteO).join('')}</div>
    <div class="choixh">${!OD.lance ? '<button class="or" onclick="lancerOrdres()">🎲 Lancer les dés</button>' : `<button ${OD.relances && (OD.sel !== null || poses < 3) ? '' : 'disabled'} onclick="lancerOrdres()">🔄 Relancer ${OD.sel !== null ? 'ce dé' : 'les dés libres'} (${OD.relances})</button><button class="or" onclick="valideOrdres()">⚔ Au combat !</button>`}</div>
  </div>`;
}
function valideOrdres() {
  const poses = OD.sur.filter(Boolean).length;
  if (poses < 3 && !confirm(`Il te reste ${3 - poses} dé${poses === 2 ? '' : 's'} pas posé${poses === 2 ? '' : 's'} : ${poses === 2 ? 'il sera perdu' : 'ils seront perdus'}. Partir quand même ?`)) return;
  const u = {}; OD.sur.forEach((id, i) => { if (!id) return; const b = BONUS_DE(OD.des[i]), o = u[id] || (u[id] = {}); if (b.a) o.a = (o.a || 0) + b.a; if (b.v) o.v = (o.v || 0) + b.v; if (b.sur) o.sur = true; });
  const c = comboOrdres(OD.des); X.ordres = { u, tous:c ? { a:c.a || 0, v:c.v || 0 } : null };
  X.journal.push(`🎲 Ordres du capitaine : ${OD.des.join(' · ')}${c ? ' (' + c.t + ')' : ''}.`); sauve(); OD = null; partir();
}
function partirOk() {
  const esc = ESCALES2[X.escale], n = surPlateau(X).length;
  fenetre(`<h2>⚔ Partir pour ${esc.e} ${esc.n} ?</h2><p>Ton équipage : <b>${n} recrue${n > 1 ? 's' : ''}</b> sur le pont${X.or >= 3 ? ` · il te reste <b>${X.or} 💰</b> à dépenser chez le recruteur` : ''}.</p><p class="doux">Une fois parti, le combat se joue tout seul.</p><div class="choixh"><button onclick="fermer()">Pas encore</button><button class="or" onclick="fermer();ordres()">⚔ On y va !</button></div>`);
}
async function partir() {
  if (enCours) return; enCours = true; sel = null;
  const esc = ESCALES2[X.escale], avant = JSON.parse(JSON.stringify(X));
  const res = joueEscale(X, hasardX(X)); sauve();
  // les unités du combat portent les mêmes identifiants que celles du plateau : on dessine l'état d'avant
  const A = res.adv.camp.plateau, noms = {}; [...avant.plateau.av, ...avant.plateau.ar, ...A.av, ...A.ar].filter(Boolean).forEach(u => { noms[u.id] = u.n; });
  ficheDe = {}; [...avant.plateau.av, ...avant.plateau.ar, ...A.av, ...A.ar].filter(Boolean).forEach(u => { ficheDe[u.id] = u; });
  const PL = PLATEAUX_EXP[esc.cle], L = PL ? [PL.enn[0], PL.enn[1], 0] : (LIEU_ENN[esc.cle] || [25, 36, 0]), Q = PL ? PL.equ : [63, 77];
  app().innerHTML = `<div class="scene ${PL ? 'plat' : ''}" id="scene" style="background-image:url('${fondEscale(esc.cle)}')">
    <div class="haut"><b>${esc.e} ${res.adv.nom}</b>${res.adv.fantome ? `<br><span class="doux">capitaine rival : ${HEROS[res.adv.fantome].nom} · ${CAPITAINES[res.adv.fantome].n}</span>` : ''}
    <div class="vitesse">${[1, 2, 4].map(v => `<button class="${vitesse === v ? 'sel' : ''}" onclick="vitesse=${v};document.querySelectorAll('.vitesse button').forEach(b=>b.classList.toggle('sel', b.textContent==='×${v}'))">×${v}</button>`).join('')}</div></div>
    ${ligneMed(A, 'ar', true, L[0], L[2])}${ligneMed(A, 'av', true, L[1], L[2])}
    ${ligneMed(avant.plateau, 'av', false, Q[0], 0)}${ligneMed(avant.plateau, 'ar', false, Q[1], 0)}
    <div class="journal" id="jc"></div></div>`;
  const J = []; const jl = t => { J.unshift(t); const j = document.getElementById('jc'); if (j) j.innerHTML = J.slice(0, 2).map(x => `<div>${x}</div>`).join(''); };
  await dodo(500);
  for (const e of res.ev) {
    if (e.t === 'round') { jl(`— Round ${e.n}`); await dodo(250); continue; }
    if (e.t === 'coup') { if (e.de) await deU(e.src, e.de); await coupFx(e); await dodo(260); jl(`${noms[e.src]} → ${noms[e.id]} : ${e.dg > 0 ? e.dg : 'raté'}${e.txt ? ' (' + e.txt + ')' : ''}`); await dodo(150); continue; }
    if (e.t === 'esquive') { if (e.de) await deU(e.src, e.de); await anim(e.src, 'frappe', 220); await anim(e.id, 'esq', 300); jl(`${noms[e.id]} esquive (Ombre).`); continue; }
    if (e.t === 'soin') { flotteU(e.id, '+' + e.n, 'sv'); GM.son('soin'); const el = elU(e.id); if (el) { fxPose(...centre(el), 'soin', 80, 600); const s = el.querySelector('.av span:last-child'); if (s) vieU(e.id, Math.max(0, +s.textContent.replace(/\D/g, '')) + e.n); } await dodo(220); continue; }
    if (e.t === 'epines') { vieU(e.id, e.v); flotteU(e.id, '−' + e.n); jl(`${noms[e.id]} se pique aux Épines (−${e.n}).`); await dodo(150); continue; }
    if (e.t === 'poison') { vieU(e.id, e.v); flotteU(e.id, '−' + e.n, 'dg poison'); GM.son('poison'); { const el = elU(e.id); if (el) fxPose(...centre(el), 'poison-tic', 70, 500); } jl(`${noms[e.id]} : Poison −${e.n}.`); await dodo(150); continue; }
    if (e.t === 'mort') { const el = elU(e.id); if (el) { fxPose(...centre(el), 'mort', 90, 800); el.classList.add('mort'); } GM.son('tombe'); jl(`💀 ${noms[e.id]} tombe.`); await dodo(450); continue; }
    if (e.t === 'serment') { flotteU(e.id, '🛡 Serment', 'sv'); jl(`🛡 Serment d’Aldric : ${noms[e.id]} reste debout à 1 PV !`); await dodo(400); continue; }
    if (e.t === 'avance') { jl(`${noms[e.id]} avance au premier rang.`); continue; }
  }
  enCours = false;
  const g = res.gagne;
  const lignes = [g ? '🏆 <b>Victoire !</b>' : '💔 <b>Défaite</b> : un cœur de moins.', res.forge ? `⚒ Forge : ${res.forge}.` : '', res.maelle ? `⚒ La forge du bord : ${res.maelle}.` : '', res.louve ? '🐺 La Louve rejoint l’équipage !' : '', !X.fini && res.gain ? `💰 +${res.gain} pièces${res.interet ? ` (dont ${res.interet} d’intérêts)` : ''}.` : ''].filter(Boolean).map(t => `<p>${t}</p>`).join('');
  if (X.fini) { setTimeout(() => finExp(), 600 / vitesse); return; }
  fenetre(`<h2>${g ? '🏆' : '💔'} ${esc.n}</h2>${lignes}<p class="doux">Les recrues tombées se relèvent au port : chaque combat commence à pleine vie.</p><div class="choixh"><button class="or" onclick="fermer();voyage()">⛵ Lever l’ancre</button></div>`);
}

// 14/11 : le voyage entre deux escales : le décor glisse vers le bas, les nuages passent, l'escale suivante descend du haut
async function voyage() {
  const sc = document.getElementById('scene'), suiv = ESCALES2[X.escale];
  if (!sc || !suiv) { chroniqueEscale(() => port()); return; }
  const pause = ms => new Promise(r => setTimeout(r, ms));
  sc.querySelectorAll('.lignemed, .journal, .haut').forEach(e => e.classList.add('part'));
  sc.insertAdjacentHTML('beforeend', `<div class="brouillard"></div><div class="cap">⛵ En route vers <b>${suiv.e} ${suiv.n}</b>…</div>`);
  new Image().src = fondEscale(suiv.cle);
  await pause(350); sc.classList.add('avance'); sc.querySelector('.brouillard').classList.add('monte');
  await pause(1600); sc.style.backgroundImage = `url('${fondEscale(suiv.cle)}')`; sc.classList.toggle('plat', !!PLATEAUX_EXP[suiv.cle]); sc.classList.remove('avance'); sc.classList.add('arrive');
  sc.querySelector('.brouillard').classList.remove('monte');
  await pause(2000); chroniqueEscale(() => port());
}
// 14/11 (l'utilisateur : « il faut expliquer quoi faire quand on lance l'expédition ») : Moustache guide le premier passage au port,
// une zone à la fois (le reste de l'écran est assombri). Revoir : bouton « Aide ».
const GUIDE_PORT = [
  [null, 'Bienvenue à bord, capitaine ! Ton but : traverser <b>6 escales</b> jusqu’au Nid du Titan. Tu as <b>3 cœurs</b> : chaque escale perdue en coûte un.'],
  ['.tiroir', 'Ici, <b>le recruteur</b>. Touche une recrue pour lire sa fiche, puis « Recruter » (3 💰). Elle monte toute seule sur le pont. Tu gagnes des pièces après chaque escale.'],
  ['.champ', 'Ton <b>équipage</b> se tient sur ces 6 places. <b>DEVANT</b> : ceux qui encaissent et frappent au corps à corps. <b>DERRIÈRE</b> : ceux qui tirent ou soignent. Pour déplacer une recrue : touche-la, puis touche une place.'],
  ['.cale', '<b>La cale</b>, c’est la réserve : ces recrues ne combattent pas, mais tu les gardes pour plus tard.'],
  ['.fams', '<b>Les familles</b> : 2 ou 4 recrues de la même famille donnent un bonus. Touche une pastille pour le voir. Et 3 recrues pareilles fusionnent en une plus forte ★ !'],
  ['.go', 'Quand ton équipage est prêt : <b>Partir</b> ! Le combat se joue tout seul, aux dés : tu regardes, et tu reviens au port te renforcer. Bonne traversée, miaou !'],
];
function guidePort(force) {
  if (!tiroir) { tiroir = true; port(); }
  Guide.lance('expedition', GUIDE_PORT, force !== false, () => localStorage.setItem('guilde-exp-guide', '1'));
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
function quitter() { fenetre('<h2>⏏ Quitter</h2><p>L’expédition est gardée sur ce téléphone. Ou on l’abandonne (comptée perdue).</p><div class="choixh"><button onclick="location.href=\'menu.html\'">⌂ Menu, je reprendrai</button><button onclick="X.fini=\'perdu\';X.coeurs=0;fermer();finExp()">Abandonner</button><button class="or" onclick="localStorage.removeItem(CLE);X=null;fermer();accueil()">🔄 Recommencer (sans la compter)</button></div>'); }
const lireRec = () => { try { return JSON.parse(localStorage.getItem(CLE + '-records') || '[]'); } catch (e) { return []; } };
function records() { const l = lireRec(); fenetre(`<h2>🏆 Mes expéditions (${l.length})</h2>${l.length ? `<table>${l.map(r => `<tr><td>${r.parfait ? '🌟' : r.gagne ? '🏆' : '💀'} ${new Date(r.quand).toLocaleDateString('fr-FR')} · ${HEROS[r.heros].nom} · ${r.escales} victoire${r.escales > 1 ? 's' : ''}</td><td>${r.score}</td></tr>`).join('')}</table>` : '<p>Aucune encore.</p>'}<div class="choixh"><button onclick="fermer()">Fermer</button></div>`); }
if (document.getElementById('app')) accueil();
