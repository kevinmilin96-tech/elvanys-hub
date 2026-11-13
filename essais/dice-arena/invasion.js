// =============================================================================================== INVASION, ACTE I « L'ÉVEIL DE L'ABÎME » (13/11, d'après le livre papier)
// Chargé par duel.html. Ne fait rien hors de ce combat, sauf la Souillure (affichée et appliquée partout où elle existe).
// - les VAGUES : quand une vague tombe, la suivante arrive (les héros gardent leurs PV, Souillure retirée, +2 Cohésion) ;
// - les GARDES JUMEAUX (Lien d'ombre) : les dégâts sont partagés entre les deux Gardes (45 PV chacun ; 35 dans le livre), chaque part lance un dé de bouclier
//   (4, 5 ou 6 : −2 dégâts) ; à la fin de chaque tour, un Garde à 0 PV se relève avec 20 PV si son jumeau est encore debout ;
// - le NÉCROMANCIEN : son aura retire 2 PV à chaque soin des héros.
const estJumeaux = P => !!(P && HEROS[P.id] && HEROS[P.id].jumeaux), estNecro = P => !!(P && HEROS[P.id] && HEROS[P.id].necro);

const _degatsInv = degats;
degats = function (k, n, ignore) {
  if (!S || S.fini || !S.O || !estJumeaux(S.O) || !k || k.J !== S.O || k.u || n <= 0) return _degatsInv(k, n, ignore);
  const O = S.O; O.g = O.g || [45, 45];
  let r = n, abs = 0;
  if (!ignore) { const g = Math.min(O.gardeB, r); O.gardeB -= g; r -= g; const b = Math.min(O.bouclier || 0, r); O.bouclier = (O.bouclier || 0) - b; r -= b; abs = g + b; }
  // le Lien d'ombre : deux parts égales, la plus grosse au Garde le plus vaillant ; chaque part lance son dé de bouclier
  const fort = O.g[0] >= O.g[1] ? 0 : 1, parts = [0, 0]; parts[fort] = Math.ceil(r / 2); parts[1 - fort] = Math.floor(r / 2);
  const des = [];
  [0, 1].forEach(i => { if (O.g[i] <= 0 && parts[i]) { parts[1 - i] += parts[i]; parts[i] = 0; } });
  [0, 1].forEach(i => { if (!parts[i]) return; const d = 1 + Math.floor(Math.random() * 6); des.push(d); if (d >= 4) { const a = Math.min(2, parts[i]); parts[i] -= a; abs += a; } O.g[i] -= parts[i]; });
  const total = parts[0] + parts[1];
  O.pv = Math.max(0, O.g[0]) + Math.max(0, O.g[1]);
  log(`Lien d’ombre : ${total} dégât(s) partagés (bouclier ${des.join(', ')}) → Garde 1 : ${Math.max(0, O.g[0])} · Garde 2 : ${Math.max(0, O.g[1])}.`);
  fx({ t:'degat', c:ref({ J:O }), n:total, abs, pv:O.pv, garde:O.gardeB, bouclier:O.bouclier });
  if (O.g[0] <= 0 && O.g[1] <= 0) { O.pv = 0; log('⚔ Les deux Gardes tombent ensemble !'); }
  fin();
};
// à la fin de chaque tour (héros ou Gardes) : le Garde au tapis se relève si son jumeau tient encore
const _finTourInv = finTour;
finTour = function (J) {
  _finTourInv(J);
  const O = S && S.O; if (!O || !estJumeaux(O) || S.fini) return; O.g = O.g || [45, 45];
  [0, 1].forEach(i => { if (O.g[i] <= 0 && O.g[1 - i] > 0) { O.g[i] = 20; log(`🛡 Le Garde ${i + 1} se relève avec 20 PV : son jumeau tenait encore !`); fx({ t:'annonce', txt:`🛡 Le Garde ${i + 1} se relève !` }); } });
  O.pv = Math.max(0, O.g[0]) + Math.max(0, O.g[1]);
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
  const O = joueur(id, true); O.desMax = 5; (h.renforts || []).forEach(r => invoque(O, { ...r })); if (h.jumeaux) O.g = [45, 45];
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
  if (estJumeaux(P)) plus += `<span data-k="jumeaux" class="p g">🛡 Gardes ${Math.max(0, (P.g || [45])[0])} | ${Math.max(0, (P.g || [45, 45])[1])}</span>`;
  if (P.souillure) plus += `<span data-k="souillure" class="p al">🟢 Souillure ${P.souillure}</span>`;
  if (estNecro(P)) plus += '<span data-k="aura" class="p al">Aura : soins −2</span>';
  if (S && S.vagues && P === S.O) plus += `<span data-k="vague" class="p">🌊 Vague ${S.vague + 1}/${S.vagues.length}</span>`;
  return plus ? h.replace('<span data-k="pv"', plus + '<span data-k="pv"') : h;
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
    if (k.J === O && !k.u && O.ombre === 5) { n = Math.max(0, n - 3); if (!n) { log('🌑 Peau de l’Abîme : tout est absorbé.'); return; } }
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
