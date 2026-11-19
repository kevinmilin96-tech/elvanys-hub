// =============================================================================================== INVASION, ACTE I « L'ÉVEIL DE L'ABÎME » (13/11, d'après le livre papier)
// Chargé par duel.html. Ne fait rien hors de ce combat, sauf la Souillure (affichée et appliquée partout où elle existe).
// - les VAGUES : quand une vague tombe, la suivante arrive (les héros gardent leurs PV, Souillure retirée, +2 Cohésion) ;
// - les GARDES JUMEAUX : deux cibles séparées, voir plus bas (19/11, règle du livre) ;
// - le NÉCROMANCIEN : son aura retire 2 PV à chaque soin des héros.
const estJumeaux = P => !!(P && HEROS[P.id] && HEROS[P.id].jumeaux), estNecro = P => !!(P && HEROS[P.id] && HEROS[P.id].necro);

// 19/11 (décision de l'utilisateur : « exactement comme dans le livre », p. 34-36) : DEUX cibles séparées, le Garde A et le Garde B.
// - le héros qui frappe choisit : tout sur le Garde A, tout sur le Garde B, ou moitié-moitié (« 🎯 » sur le panneau du boss, ou dans la fenêtre « Valider ») ;
// - chaque Garde qui reçoit des dégâts lance SON dé de bouclier (4, 5 ou 6 : −2) ;
// - un Garde à 0 PV tombe en LÉTHARGIE (il ne meurt pas) ; victoire = les deux à 0 en même temps ;
// - le survivant attaque SEUL avec 3 dés ; à la FIN DU TOUR DES GARDES, s'il est encore debout, il relève son jumeau avec 15 PV.
// PV : 45 chacun (35 dans le livre ; voir Equilibrage-personnages.md).
const PV_GARDE = 45, RELEVE_GARDE = 15, NOM_G = ['Garde A', 'Garde B'];
const _degatsInv = degats;
degats = function (k, n, ignore) {
  if (!S || S.fini || !S.O || !estJumeaux(S.O) || !k || k.J !== S.O || k.u || n <= 0) return _degatsInv(k, n, ignore);
  const O = S.O; O.g = O.g || [PV_GARDE, PV_GARDE];
  let r = n, abs = 0;
  if (!ignore) { const g = Math.min(O.gardeB, r); O.gardeB -= g; r -= g; const b = Math.min(O.bouclier || 0, r); O.bouclier = (O.bouclier || 0) - b; r -= b; abs = g + b; }
  // la répartition : le choix du joueur (k.g, ou S.O.viseG), ou celui de l'ordinateur
  let v = k.g !== undefined ? k.g : (S.J && (S.J.ordi || S.auto)) ? viseAutoG(O, r) : (O.viseG !== undefined ? O.viseG : 0);
  const vivant = i => O.g[i] > 0, parts = [0, 0];
  if (v === 'deux' && vivant(0) && vivant(1)) { const f = O.g[0] <= O.g[1] ? 0 : 1; parts[f] = Math.ceil(r / 2); parts[1 - f] = Math.floor(r / 2); }
  else { if (v === 'deux') v = vivant(0) ? 0 : 1; if (!vivant(v) && vivant(1 - v)) v = 1 - v; parts[v] = r; } // un Garde déjà au tapis : le coup va sur l'autre
  const des = [];
  [0, 1].forEach(i => { if (!parts[i]) return; const d = 1 + Math.floor(Math.random() * 6); des.push(`${NOM_G[i]} 🎲 ${d}${d >= 4 ? ' : −2' : ''}`); if (d >= 4) { const a = Math.min(2, parts[i]); parts[i] -= a; abs += a; } O.g[i] -= parts[i]; if (O.g[i] <= 0 && O.g[i] + parts[i] > 0) { log(`💤 Le ${NOM_G[i]} tombe en léthargie (il se relèvera avec ${RELEVE_GARDE} PV à la fin du tour des Gardes si son jumeau tient encore).`); fx({ t:'annonce', txt:`💤 ${NOM_G[i]} en léthargie !` }); } });
  const total = parts[0] + parts[1];
  O.pv = Math.max(0, O.g[0]) + Math.max(0, O.g[1]);
  log(`Gardes jumeaux : ${total} dégât(s) (bouclier : ${des.join(' · ')}) → ${NOM_G[0]} : ${Math.max(0, O.g[0])} · ${NOM_G[1]} : ${Math.max(0, O.g[1])}.`);
  fx({ t:'degat', c:ref({ J:O }), n:total, abs, pv:O.pv, garde:O.gardeB, bouclier:O.bouclier });
  if (O.g[0] <= 0 && O.g[1] <= 0) { O.pv = 0; log('⚔ Les deux Gardes sont à terre en même temps !'); }
  fin();
};
// l'ordinateur (compagnon, simulateur) : finir un Garde s'il peut, sinon frapper le plus faible
function viseAutoG(O, r) { const a = O.g[0], b = O.g[1]; if (a <= 0) return 1; if (b <= 0) return 0; return a <= b ? 0 : 1; }
// la relève : SEULEMENT à la fin du tour des Gardes (livre p. 35-36), avec 15 PV
const _finTourInv = finTour;
finTour = function (J) {
  _finTourInv(J);
  const O = S && S.O; if (!O || !estJumeaux(O) || S.fini || J !== O) return; O.g = O.g || [PV_GARDE, PV_GARDE];
  [0, 1].forEach(i => { if (O.g[i] <= 0 && O.g[1 - i] > 0) { O.g[i] = RELEVE_GARDE; log(`🛡 Le ${NOM_G[1 - i]} relève son jumeau : ${NOM_G[i]} revient avec ${RELEVE_GARDE} PV !`); fx({ t:'annonce', txt:`🛡 ${NOM_G[i]} se relève (${RELEVE_GARDE} PV) !` }); } });
  O.pv = Math.max(0, O.g[0]) + Math.max(0, O.g[1]);
};
// le survivant attaque seul avec 3 dés (au lieu de 5)
const _debutTourJum = debutTour;
debutTour = function (J) {
  if (S && J === S.O && estJumeaux(J) && J.g && (J.g[0] <= 0 || J.g[1] <= 0)) { J.desMax = 3; _debutTourJum(J); J.desMax = 5; log(`Le Garde survivant attaque seul : 3 dés.`); return; }
  return _debutTourJum(J);
};
// le choix de la cible : « 🎯 » sur le panneau du boss, et dans la fenêtre « Valider »
function viseG(v, ev) { if (ev) ev.stopPropagation(); if (!S || !S.O) return; S.O.viseG = v; const z = document.getElementById('conf'); if (z && ciblage && ciblage.choisi) { montreConfirme(); return; } rendu(); }
const txtViseG = v => v === 'deux' ? 'moitié-moitié' : `tout sur le ${NOM_G[v]}`;
const _montreConfirmeJum = montreConfirme;
montreConfirme = function () {
  _montreConfirmeJum(); const c = ciblage, z = document.getElementById('conf');
  if (!c || !c.choisi || c.choisi.u || !estJumeaux(c.choisi.J) || !z) return;
  const O = c.choisi.J, v = O.viseG !== undefined ? O.viseG : 0;
  z.querySelector('.b') && z.querySelector('.b').insertAdjacentHTML('beforebegin', `<div class="l jumv">🎯 Répartition : <b>${txtViseG(v)}</b><div class="jumb">${[0, 1, 'deux'].map(x => `<button class="${x === v ? 'sel' : ''}" ${x !== 'deux' && O.g[x] <= 0 ? 'disabled' : ''} onclick="viseG(${x === 'deux' ? "'deux'" : x}, event)">${x === 'deux' ? '½ les deux' : `${NOM_G[x]} ❤ ${Math.max(0, O.g[x])}`}</button>`).join('')}</div><small>Chaque Garde touché lance son dé de bouclier (4-6 : −2).</small></div>`);
};
// les vagues
const _finInv = fin;
fin = function () {
  if (S && S.coop && S.vagues && !S.fini && S.O.pv <= 0 && S.vague < S.vagues.length - 1) vagueSuivante();
  return _finInv();
};
function vagueSuivante() {
  S.vague++; const id = S.vagues[S.vague], h = HEROS[id];
  if (h.phases) { h.garde = h.phases[0].garde; h.pouvoir = h.phases[0].pouvoir; }
  const O = joueur(id, true); O.desMax = 5; (h.renforts || []).forEach(r => invoque(O, { ...r })); if (h.jumeaux) { O.g = [PV_GARDE, PV_GARDE]; O.viseG = 0; }
  S.O = O; S.cohesion = Math.min(COHESION.max, S.cohesion + 2);
  S.equipe.forEach(x => { x.souillure = 0; });
  log(`🌊 Vague ${S.vague + 1} : ${O.nom} ! (Souillure retirée, +2 Cohésion)`);
  fx({ t:'annonce', txt:`🌊 Vague ${S.vague + 1} : ${O.nom}` });
}
// la Souillure (début du tour du héros) et le Poids de l'Abîme (pas de PC gagné)
const _debutTourInv = debutTour;
debutTour = function (J) {
  _debutTourInv(J);
  if (!S || S.fini || J === S.O) return;
  if (J.sansPC) { J.pc = Math.max(0, J.pc - 1); J.sansPC = false; log(`${J.nom} ne gagne pas de PC ce tour (Poids de l’Abîme).`); }
  if (J.souillure && !J.aTerre) { log(`🟢 Souillure : ${J.nom} perd ${J.souillure} PV.`); J.pv -= J.souillure; fx({ t:'degat', c:ref({ J }), n:J.souillure, abs:0, pv:Math.max(0, J.pv), mot:'Souillure', vert:true }); fin(); }
};
// l'aura du Nécromancien : les soins des héros perdent 2 PV
const _soinInv = soin;
soin = function (J, n) { if (S && S.O && estNecro(S.O) && J !== S.O) { n -= 2; if (n <= 0) { log('L’aura du Nécromancien étouffe le soin.'); return; } } return _soinInv(J, n); };
// l'affichage : les deux Gardes et la Souillure
const _barreInv = barre;
barre = function (P, haut) {
  let h = _barreInv(P, haut), plus = '';
  if (estJumeaux(P)) { const g = P.g || [PV_GARDE, PV_GARDE], v = P.viseG !== undefined ? P.viseG : 0; plus += `<span data-k="jumeaux" class="p g jum">${[0, 1].map(i => `<i class="${v === i ? 'sel' : ''} ${g[i] <= 0 ? 'terre' : ''}" onclick="viseG(${i}, event)">${v === i ? '🎯 ' : ''}${g[i] <= 0 ? '💤 ' : ''}${['A', 'B'][i]} ${Math.max(0, g[i])}</i>`).join('')}<i class="${v === 'deux' ? 'sel' : ''}" onclick="viseG('deux', event)">${v === 'deux' ? '🎯 ' : ''}½</i></span>`; }
  if (P.souillure) plus += `<span data-k="souillure" class="p al">🟢 Souillure ${P.souillure}</span>`;
  if (estNecro(P)) plus += '<span data-k="aura" class="p al">Aura : soins −2</span>';
  if (S && S.vagues && P === S.O) plus += `<span data-k="vague" class="p">🌊 Vague ${S.vague + 1}/${S.vagues.length}</span>`;
  return plus ? h.replace('<span data-k="pv"', plus + '<span data-k="pv"') : h;
};


// =============================================================================================== 19/11 : LE CIBLAGE DU LIVRE (p. 28-29) et L'INTERCEPTION
// Au tour des ennemis, chaque ennemi (le boss, puis chaque créature prête) lance un dé : 1-3-5 → le héros 1, 2-4-6 → le héros 2 (s'il est à terre : l'autre).
// L'INTERCEPTION (décision de l'utilisateur) : avant les coups, l'autre héros peut dépenser 1 🤝 pour prendre le coup à sa place (il se défend avec sa Garde).
// UN SEUL CERCLE (décision) : pendant chaque coup, le cercle du bas montre le héros visé ; l'autre héros reste visible dans sa PASTILLE (visage + ❤).
function cibleDuDe(d) { const vivants = S.equipe.filter(h => !h.aTerre); if (vivants.length < 2) return vivants[0]; return S.equipe[d % 2 === 1 ? 0 : 1].aTerre ? S.equipe.find(h => !h.aTerre) : S.equipe[d % 2 === 1 ? 0 : 1]; }
function tirePlan() {
  const O = S.O, l = [{ qui:'boss', n:O.nom }, ...O.front.filter(u => u.pret && !u.louve).map(u => ({ qui:u.id, n:u.n }))];
  l.forEach(x => { x.d = 1 + Math.floor(Math.random() * 6); x.cible = cibleDuDe(x.d); x.vise = x.cible; x.inter = false; });
  return l;
}
const autreHeros = h => S.equipe.find(x => x !== h);
// le compagnon (ou le simulateur) intercepte quand le visé est en danger et lui en bonne santé
function interAuto(x, reste) { const t = x.cible, a = autreHeros(t); return a && !a.aTerre && reste >= 1 && t.pv <= 12 && a.pv >= t.pv + 10; }
function decidePlanAuto(plan) { let c = S.cohesion; plan.forEach(x => { const a = autreHeros(x.cible); if (a && !a.aTerre && (a.ordi || S.auto) && interAuto(x, c)) { x.inter = true; c--; } }); }
preparerTourEnnemis = function (suite) {
  if (!S || !S.coop || S.fini) return suite();
  const plan = tirePlan(); S.plan = plan;
  const humain = h => h && !h.ordi && !S.auto, peut = x => { const a = autreHeros(x.cible); return a && !a.aTerre && humain(a) && S.equipe.filter(h => !h.aTerre).length === 2; };
  decidePlanAuto(plan);
  if (!plan.some(peut) || S.cohesion < 1) return suite();
  // une fenêtre : qui est visé, et « 🛡 Prendre le coup (1 🤝) » pour l'autre héros
  const dessine = () => { const pris = plan.filter(x => x.inter).length;
    fenetre(`<h2>⚔ Tour de ${S.O.nom} : qui est visé ?</h2><p class="doux" style="margin:.2em 0">Chaque ennemi lance un dé : 1-3-5 → ${S.equipe[0].nom}, 2-4-6 → ${S.equipe[1].nom}.</p>
    <div class="planE">${plan.map((x, i) => { const a = autreHeros(x.cible);
      return `<div class="lp"><span>🎲 <b>${x.d}</b> ${x.d % 2 ? 'impair' : 'pair'} → <b>${x.n}</b> vise <b>${x.cible.nom}</b>${x.inter ? ` <span class="ok">· 🛡 ${a.nom} prend le coup</span>` : ''}</span>${peut(x) ? `<button class="${x.inter ? 'sel' : ''}" ${!x.inter && S.cohesion - pris < 1 ? 'disabled' : ''} onclick="basculeInter(${i})">${x.inter ? '↩ Annuler' : `🛡 ${a.nom} prend le coup (1 🤝)`}</button>` : ''}</div>`; }).join('')}</div>
    <p style="margin:.4em 0">🤝 Cohésion : <b>${S.cohesion - pris}</b> / ${COHESION.max}${pris ? ` (−${pris} pour ${pris > 1 ? 'les interceptions' : 'l’interception'})` : ''}. Celui qui prend le coup se défend avec sa propre Garde.</p>
    <div class="choixh"><button class="or" onclick="fermer();lancePlan()">${pris ? '✔ Confirmer et continuer ▶' : 'Continuer ▶'}</button></div>`); };
  window.basculeInter = i => { plan[i].inter = !plan[i].inter; dessine(); };
  window.lancePlan = () => { window.basculeInter = window.lancePlan = null; suite(); };
  dessine();
};
// le tour des ennemis : chaque attaque vise le héros du plan (S.J le temps du coup : adv(boss) = S.J)
function cibleDe(x) { if (!x.inter) return x.cible; const a = autreHeros(x.cible); if (!a || a.aTerre || S.cohesion < 1) return x.cible; S.cohesion--; log(`🛡 Interception : ${a.nom} prend le coup de ${x.n} à la place de ${x.cible.nom} (−1 🤝).`); return a; }
function montreVise(x, h) {
  { const a = autreHeros(h); S.J = h; S.viseFait = true;
    fx({ t:'vise', i:S.equipe.indexOf(h), html:barre(h, false), front:front(h, false), past:pastilleHTML(a), txt:`🎲 ${x.d} : ${x.d % 2 ? 'impair' : 'pair'} → <b>${x.n}</b> vise <b>${h.nom}</b>${x.inter ? ' (interception)' : ''}` }); }
}
const _joueOrdiInv = joueOrdi;
joueOrdi = function () {
  if (!S || !S.coop || S.fini) return _joueOrdiInv();
  if (!S.plan) { S.plan = tirePlan(); decidePlanAuto(S.plan); }
  const plan = S.plan, pv0 = S.equipe.map(h => h.pv); S.viseFait = false;
  const x0 = plan[0]; const h0 = cibleDe(x0); if (h0 && !h0.aTerre) montreVise(x0, h0);
  try { _joueOrdiInv(); } finally { S.plan = null; S.viseFait = false; }
  // le récapitulatif du tour : ce que CHAQUE héros a perdu
  const rec = [...FX].reverse().find(e => e.t === 'recap'); if (rec) { rec.perdu = S.equipe.reduce((t, h, i) => t + pv0[i] - h.pv, 0); rec.actions = [...rec.actions, ...S.equipe.map((h, i) => `${h.nom} : ${pv0[i] - h.pv > 0 ? `−${pv0[i] - h.pv} ❤` : 'aucun ❤ perdu'}`)]; }
};
const _attaquesRestantesInv = attaquesRestantes;
attaquesRestantes = function (J) {
  if (!S || !S.coop || J !== S.O || !S.plan) return _attaquesRestantesInv(J);
  J.front.filter(u => u.pret && !u.louve).forEach(u => { if (S.fini || !J.front.includes(u)) return;
    let x = S.plan.find(p => p.qui === u.id); if (!x) { x = { qui:u.id, n:u.n, d:1 + Math.floor(Math.random() * 6) }; x.cible = cibleDuDe(x.d); }
    const h = cibleDe(x); if (!h || h.aTerre) return; montreVise(x, h);
    const c = ciblesAttaque(h); attaque(J, u, c.find(y => !y.u) || [...c].sort((a, b) => a.u.v - b.u.v)[0]); });
};
// la pastille de l'autre héros (visage + vie), toujours visible dans un coin du plateau
function pastilleHTML(h) { if (!h) return ''; return `<div class="pastA ${h.aTerre ? 'terre' : ''}" id="b-A" onclick="voirEquipe()"><img src="${h.img || HEROS[h.id].img || IMG(h.id)}"${h.imgSec ? ` onerror="this.onerror=null;this.src='${h.imgSec}'"` : ''} alt=""><span class="p pv">${Math.max(0, h.pv)}</span><small>${h.aTerre ? '💀' : '❤'}</small><div class="vie"><i style="width:${Math.max(0, h.pv) / h.pvMax * 100}%"></i></div><b>${h.nom}</b></div>`; }
const _dessineInv = dessine;
dessine = function () {
  VISE_P = null; PAST_P = null; _dessineInv();
  if (!S || !S.coop) return; const pl = document.querySelector('.plateau.unique'), a = autreHeros(S.J); if (!pl || !a) return;
  const v = document.getElementById('b-A'); if (v) v.remove(); pl.insertAdjacentHTML('beforeend', pastilleHTML(a)); PAST_P = a;
};
const _joue1Inv = joue1;
joue1 = async function (e) {
  if (e.t !== 'vise') return _joue1Inv(e);
  const h = S.equipe[e.i], b = document.getElementById('b-J'), f = document.getElementById('f-J'), p = document.getElementById('b-A');
  if (b) b.outerHTML = e.html; if (f) f.outerHTML = e.front; if (p) p.outerHTML = e.past; else { const pl = document.querySelector('.plateau.unique'); if (pl) pl.insertAdjacentHTML('beforeend', e.past); }
  VISE_P = h; PAST_P = autreHeros(h); const nb = document.getElementById('b-J'); if (nb) { nb.classList.remove('vise'); void nb.offsetWidth; nb.classList.add('vise'); }
  await bandeauAction('O', e.txt, 1500);
};

// =============================================================================================== ACTE II « LE RÉVEIL DES PRIMORDIAUX » (13/11, livre papier pages 39-47)
const estH = (P, k) => !!(P && HEROS[P.id] && HEROS[P.id][k]);
// Peau de granit (Titan : −3, −4 quand l'Arbre est contaminé) et Lien de terre (Colosse : −3 tant qu'une Micro-racine vit) ; une racine qui meurt = choc de 5, et elle repousse une fois
const _degatsReveil = degats;
degats = function (k, n, ignore) {
  if (S && !S.fini && k && k.J === S.O && !k.u && n > 0) {
    if (estH(S.O, 'granit')) { const r = 3 + (S.seve !== undefined && S.seve <= 49 ? 1 : 0); n = Math.max(0, n - r); log(`Peau de granit : −${r}.`); if (!n) return; }
    if (estH(S.O, 'racines') && S.O.front.some(u => u.n === 'Micro-racine')) { n = Math.max(0, n - 3); log('Lien de terre : −3 (une Micro-racine tient encore).'); if (!n) return; }
  }
  const racine = k && k.u && k.u.n === 'Micro-racine' && S && S.O && k.J === S.O ? k.u : null;
  _degatsReveil(k, n, ignore);
  if (racine && !S.O.front.includes(racine) && !S.fini) {
    log('🌱 La Micro-racine se brise : choc de Sève, 5 dégâts au Colosse !'); _degatsReveil({ J:S.O }, 5, true);
    if (!racine.repoussee && !S.fini) { invoque(S.O, { n:'Micro-racine', a:0, v:5, barriere:true }); const u = S.O.front[S.O.front.length - 1]; if (u) u.repoussee = true; log('🌱 Elle repousse avec 5 PV.'); }
  }
};
// la Poussière de pierre : le prochain soin perd 2 PV par pile (6 au plus), puis elle retombe
const _soinReveil = soin;
soin = function (J, n) { if (J && J.poussiere) { const r = J.poussiere * 2; J.poussiere = 0; n -= r; log(`🪨 Poussière : le soin perd ${r}.`); if (n <= 0) return; } return _soinReveil(J, n); };
// début des tours : la Sève (tour du Titan), l'Appel de la pierre, l'Agonie de l'Arbre, l'Étreinte (une seule relance)
const _debutTourReveil = debutTour;
debutTour = function (J) {
  _debutTourReveil(J);
  if (!S || S.fini) return;
  if (J === S.O && estH(S.O, 'stase')) {
    seve(-5);
    if (!S.fini && !S.O.front.length) { invoque(S.O, { n:'Éclaireur de silex', a:3, v:12 }); log('⛰ Appel de la pierre : un Éclaireur de silex surgit.'); }
  }
  if (J !== S.O && S.seve !== undefined && S.seve <= 24 && !J.aTerre) { log(`🌳 Agonie de l’Arbre : ${J.nom} perd 1 PV.`); J.pv -= 1; fin(); }
  if (J.entrave1) { J.relance = Math.min(J.relance, 1); J.entrave1 = false; log(`${J.nom} est pris dans l’Étreinte : une seule relance.`); }
};
// soigner l'Arbre : 2 PC → +10 % de Sève (le héros dont c'est le tour)
function soigneArbre(J) { J = J || S.J; if (!S || S.seve === undefined || S.fini || J.pc < 2 || S.seve >= 100) return; J.pc -= 2; log(`🌳 ${J.nom} soigne l’Arbre-Monde (2 PC).`); seve(10); fx({ t:'annonce', txt:`🌳 Sève +10 % (${S.seve} %)` }); rendu(); }
const _equipeHTMLReveil = equipeHTML;
equipeHTML = function () {
  const h = _equipeHTMLReveil(); if (!S || S.seve === undefined) return h;
  return h + `<div class="coh"><b>🌳 Sève de l’Arbre-Monde : ${S.seve} %</b> <small>à 0 %, le monde est pétrifié</small><div class="cohb"><button onclick="fermer();soigneArbre()" ${S.J.pc >= 2 && S.seve < 100 ? '' : 'disabled'}>Soigner l’Arbre : 2 PC → +10 %</button></div></div>`;
};
// le compagnon (et le simulateur) soigne l'Arbre quand la Sève baisse trop
const _joueAutoReveil = joueAuto;
joueAuto = function (J) { if (S && S.coop && S.seve !== undefined && J !== S.O && S.seve <= 45 && J.pc >= 2 && !S.fini) { J.pc -= 2; seve(10); log(`🌳 ${J.nom} soigne l’Arbre-Monde.`); } return _joueAutoReveil(J); };
// l'étiquette de la Sève sur le boss
const _barreReveil = barre;
barre = function (P, haut) { const h = _barreReveil(P, haut); return S && S.seve !== undefined && P === S.O ? h.replace('<span data-k="pv"', `<span data-k="seve" class="p ${S.seve <= 24 ? 'al' : 'g'}">🌳 Sève ${S.seve} %</span><span data-k="pv"`) : h; };

// =============================================================================================== 13/11 : les OMBRES MAJEURES et l'ANOMALIE (Odyssée)
const _degatsOmbre = degats;
degats = function (k, n, ignore) {
  if (S && S.O && k && !S.fini && n > 0) {
    const O = S.O;
    if (k.J === O && !k.u && O.voile) { log('🌑 Voile d’invisibilité : aucun dégât avant son premier tour.'); return; }
    if (k.J === O && !k.u && O.ombre === 5) { const n0 = n; n = Math.max(0, n - 3); if (!n) { log('🌑 Peau de l’Abîme : tout est absorbé.'); return; } log(`🌑 Peau de l’Abîme : ${n0} dégâts réduits à ${n} (−3).`); }
    if (S.acteur === O && k.J !== O) { if (O.ombre === 4) n += 3; if ((O.anomalie || 0) >= 2) n += 5; }
  }
  const drain = S && S.O && S.O.ombre === 3 && S.acteur === S.O && k && k.J && k.J !== S.O && !k.u, avant = drain ? k.J.pv : 0;
  _degatsOmbre(k, n, ignore);
  if (drain && !S.fini) { const r = avant - k.J.pv; if (r > 1) { const g = Math.floor(r / 2); S.O.pv = Math.min(S.O.pvMax, S.O.pv + g); log(`🌑 Drain de vitalité : ${S.O.nom} regagne ${g} PV.`); } }
};
const _debutTourOmbre = debutTour;
debutTour = function (J) { if (S && J === S.O && S.O.voile) { S.O.voile = false; log('🌑 Le Voile d’invisibilité se déchire.'); } _debutTourOmbre(J); };
const _finTourOmbre = finTour;
finTour = function (J) { _finTourOmbre(J); if (S && J === S.O && S.O.ombre === 4 && !S.fini) { S.O.pv -= 5; log(`🌑 Frénésie : ${S.O.nom} perd 5 PV.`); fin(); } };
const _barreOmbre = barre;
barre = function (P, haut) { const h = _barreOmbre(P, haut); if (!(S && P === S.O && (P.ombre || P.anomalie))) return h; const t = `${P.ombre ? `<span data-k="ombre" class="p al">🌑 ${OMBRES[P.ombre].n}${P.voile ? ' (actif)' : ''}</span>` : ''}${P.anomalie ? `<span data-k="anomalie" class="p al">🌀 Anomalie ${P.anomalie}</span>` : ''}`; return h.replace('<span data-k="pv"', t + '<span data-k="pv"'); };
