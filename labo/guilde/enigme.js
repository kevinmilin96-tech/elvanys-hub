// =============================================================================================== L'ÉNIGME DU JOUR (13/11)
// Décisions de l'utilisateur (boîtes, 13/11) : dés déjà lancés et FIGÉS (pas de relance) ; une énigme NEUVE chaque jour,
// fabriquée par le jeu à partir de la date et VÉRIFIÉE par un solveur ; difficulté qui monte du lundi (1) au dimanche (7) ;
// essais illimités, indice de Moustache après 2 échecs, solution après 5 ; série de jours réussis + trophée au Panthéon,
// aucun avantage en combat. La même énigme pour tout le monde le même jour (graine = la date), rien sur un serveur.
// But : faire tomber le héros adverse PENDANT CE TOUR. Ses PV = le maximum de dégâts possible : il faut trouver le coup parfait.
// Héros des énigmes : Maëlle, Aldric, Oria, Gorm (Pip : la Louve lance ses propres dés ; Zéphine : se débloque au tutoriel).
// Chargé par duel.html ; ne fait rien hors de duel.html?enigme=…

const ENI_HEROS = ['maelle', 'aldric', 'oria', 'gorm'];
const ENI_ADV = ['maelle', 'aldric', 'pip', 'oria', 'gorm'];
// cartes jamais tirées : hasard (relances, pioche), soins et réactions de Garde (inutiles pour gagner en un tour)
const ENI_EXCLU = ['chance', 'raccourci', 'longuevue', 'tresor', 'rosee', 'purif', 'soins', 'serment', 'seve', 'potion', 'brume', 'soufre',
  'paillasse', 'contre', 'piege', 'cor', 'fournaise', 'boussole', 'grave', 'rond', 'releve', 'hurlement', 'lien', 'parchemin'];
// créatures adverses possibles (nom, attaque, vie, mots-clés)
const ENI_GARDES = [
  { n:'Chien de garde', a:2, v:3, barriere:true }, { n:'Écuyer', a:2, v:5, barriere:true }, { n:'Ronces', a:0, v:4, barriere:true, epines:1 },
  { n:'Guetteur', a:2, v:6, barriere:true }, { n:'Milicien', a:2, v:2 }, { n:'Faon', a:2, v:3 }, { n:'Lynx des fourrés', a:3, v:2, cachee:true },
  { n:'Apprenti', a:2, v:3 }, { n:'Golem', a:5, v:8, barriere:true }, { n:'Gardien', a:3, v:7, barriere:true },
];
// tes créatures possibles déjà sur le plateau (prêtes à attaquer)
const ENI_ALLIES = [
  { n:'Tambour', a:2, v:4, tambour:true }, { n:'Flûtiste', a:3, v:3 }, { n:'Écuyer', a:2, v:5, barriere:true }, { n:'Éclaireuse', a:3, v:3, cachee:true },
  { n:'Renard du col', a:2, v:3, cachee:true }, { n:'Apprenti', a:2, v:3, apprenti:true }, { n:'Guetteur', a:2, v:6, barriere:true }, { n:'Chien', a:2, v:3, barriere:true },
];
const ENI_JOURS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const ENI_NIV = ['', 'Très facile', 'Facile', 'Moyenne', 'Moyenne', 'Corsée', 'Difficile', 'Redoutable'];

// ---------------------------------------------------------------- hasard réglé par la date (le même partout)
function eniRng(graine) { let a = graine >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function eniHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
const eniIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const eniNiveau = iso => { const d = new Date(iso + 'T12:00:00'); return (d.getDay() + 6) % 7 + 1; };

// ---------------------------------------------------------------- le solveur (sur des copies de S, sans animation)
function eniCle() {
  const J = S.J, O = S.O;
  return JSON.stringify([J.des.map(d => d.v + (d.pose ? 'p' : '') + (d.mod ? 'm' : '')), J.pc, J.main, J.jauge, J.ultimeFait, J.banniere, J.catalyseur, J.dernierSort && J.dernierSort.key, J.braise, J.forgeGratuite, J.six, J.purete,
    J.front.map(u => [u.n, u.a, u.v, u.pret, u.tmp || 0, !!u.cachee, !!u.barriere]), O.pv, O.gardeB, O.bouclier, O.front.map(u => [u.n, u.v, u.bouclier || 0, !!u.cachee, !!u.barriere, !!u.defense])]);
}
// tous les coups possibles maintenant : { q, d:[indices des dés], im, t:{ s, ui } | { de, sens }, att }
function eniCoups() {
  const J = S.J, out = [], vus = new Set();
  const libres = J.des.map((d, i) => i).filter(i => !J.des[i].pose);
  const subs = sousEnsembles(libres);
  const quois = ['frappe', 'technique', 'pouvoir', 'ultime', 'vendre'];
  J.main.forEach((k, i) => quois.push('c' + i));
  for (const q0 of quois) for (const di of subs) {
    const ds = di.map(i => J.des[i]), vs = vals(ds);
    const q = q0[0] === 'c' && q0 !== 'c' ? J.main[+q0.slice(1)] : q0, im = q0[0] === 'c' ? +q0.slice(1) : undefined;
    if (q0 === 'vendre' && di.length > 1) continue;
    const cle = q + '|' + ds.map(d => d.v + (d.mod ? 'm' : '')).sort().join(',');
    if (vus.has(cle)) continue;
    if (!permis(J, q, vs, ds)) continue;
    vus.add(cle);
    const def = q === 'vendre' ? null : defDe(J, q), t = def && def.cible;
    if (t === 'de') {
      libres.filter(i => !di.includes(i)).forEach(i => {
        if (q === 'ajuste') [-1, 1].forEach(sens => { const v = J.des[i].v + sens; if (v >= 1 && v <= 6) out.push({ q, d:di, im, t:{ de:i, sens } }); });
        else out.push({ q, d:di, im, t:{ de:i } });
      });
    } else if (t) ciblesPossibles(J, t).forEach(k => out.push({ q, d:di, im, t:{ s:k.J === S.J ? 'J' : 'O', ui:k.u ? k.J.front.indexOf(k.u) : -1 } }));
    else out.push({ q, d:di, im, t:null });
  }
  J.front.forEach((u, i) => { if (!u.pret || u.louve) return; ciblesAttaque(S.O).forEach(k => out.push({ att:i, t:{ s:'O', ui:k.u ? S.O.front.indexOf(k.u) : -1 } })); });
  return out;
}
function eniJoue(c) {
  const J = S.J; let k = null;
  if (c.t) { if (c.t.de !== undefined) k = { d:J.des[c.t.de], sens:c.t.sens }; else { const P = c.t.s === 'J' ? S.J : S.O; k = c.t.ui < 0 ? { J:P } : { J:P, u:P.front[c.t.ui] }; } }
  if (c.att !== undefined) { attaque(J, J.front[c.att], k); return; }
  pose(J, c.q, c.d.map(i => J.des[i]), k, c.im);
}
// fin du tour comme à l'écran : les créatures prêtes et visibles qui n'ont pas attaqué frappent toutes seules
function eniFinTour() {
  const J = S.J;
  J.front.filter(u => u.pret && !u.louve && !u.cachee).forEach(u => { if (S.fini || !J.front.includes(u)) return; const c = ciblesAttaque(S.O); attaque(J, u, c.find(x => !x.u) || [...c].sort((a, b) => a.u.v - b.u.v)[0]); });
}
// le meilleur total de dégâts au héros adverse ce tour, avec le chemin qui y mène
function eniResous(etat, limite) {
  const garde = S, memo = new Map(), pv0 = etat.O.pv; let noeuds = 0;
  const copie = e => { const c = structuredClone(e); c.log = []; return c; };
  function dfs(e) {
    S = e; const cle = eniCle(); if (memo.has(cle)) return memo.get(cle);
    if (++noeuds > limite) throw new Error('trop long');
    let best = { v:-1, p:[] };
    { S = copie(e); eniFinTour(); best = { v:pv0 - S.O.pv, p:[] }; }
    S = e;
    if (!S.fini) for (const c of eniCoups()) {
      S = copie(e); eniJoue(c); const apres = S;
      const r = S.fini ? { v:pv0 - S.O.pv, p:[] } : dfs(apres);
      if (r.v > best.v || (r.v === best.v && r.p.length + 1 < best.p.length)) best = { v:r.v, p:[c, ...r.p] };
      S = e;
    }
    memo.set(cle, best); return best;
  }
  try { return Object.assign(dfs(copie(etat)), { noeuds }); } catch (err) { return null; } finally { S = garde; }
}
// le joueur « pressé » : à chaque fois, le coup qui fait le plus mal tout de suite (sert à refuser les énigmes trop évidentes)
function eniGlouton(etat) {
  const garde = S; let e = structuredClone(etat); const pv0 = e.O.pv;
  try {
    for (let n = 0; n < 12; n++) {
      S = e; if (S.fini) break; let mieux = null;
      for (const c of eniCoups()) { S = structuredClone(e); eniJoue(c); const v = pv0 - S.O.pv; if (!mieux || v > mieux.v) mieux = { v, e:S }; S = e; }
      if (!mieux || mieux.v <= pv0 - e.O.pv) break; e = mieux.e;
    }
    S = e; if (!S.fini) eniFinTour(); return pv0 - S.O.pv;
  } finally { S = garde; }
}

// ---------------------------------------------------------------- la fabrique : une situation tirée au hasard (graine), gardée si le solveur la valide
function eniFabrique(iso, depuis) {
  const niv = eniNiveau(iso);
  const P = { des:[3, 3, 4, 4, 4, 5, 5][niv - 1], main:[2, 3, 3, 4, 4, 5, 5][niv - 1], pc:[2, 3, 3, 4, 4, 5, 5][niv - 1], dmin:[5, 6, 8, 9, 11, 12, 14][niv - 1], coups:[1, 2, 2, 2, 3, 3, 4][niv - 1], ecart:[0, 1, 2, 3, 3, 4, 5][niv - 1] };
  // ENI_TABLE (enigme-table.js) : pour chaque jour, le bon essai, ses PV et sa solution, trouvés d'avance → le téléphone ne calcule rien
  const connu = !depuis && typeof ENI_TABLE === 'object' ? ENI_TABLE[iso] : null;
  const d0 = depuis || (connu && connu.e) || 0;
  for (let essai = d0; essai < d0 + 400; essai++) {
    const r = eniRng(eniHash(iso + '#' + essai)), tire = a => a[Math.floor(r() * a.length)];
    const h = tire(ENI_HEROS), o = tire(ENI_ADV.filter(x => x !== h));
    nouvellePartie(h, o, true);
    S.salle = { id:'aucune', n:'', d:'' }; S.log = []; S.auto = true;
    const J = S.J, O = S.O;
    J.tours = P.des - 2; J.relance = 0; J.aLancer = false; J.deck = []; J.meute = 0;
    J.des = Array.from({ length:P.des }, (_, i) => ({ sac:[], v:1 + Math.floor(r() * 6), pose:false, mod:false, i }));
    const pot = [...new Set([...HEROS[h].deck, ...GUILDE])].filter(k => !ENI_EXCLU.includes(k));
    J.main = []; while (J.main.length < P.main) J.main.push(tire(pot));
    J.pc = 1 + Math.floor(r() * P.pc);
    J.jauge = niv >= 4 && r() < .45 ? JAUGE.max : Math.floor(r() * 12);
    J.front = [];
    const nA = niv >= 3 ? Math.floor(r() * (niv >= 6 ? 3 : 2)) : 0;
    for (let i = 0; i < nA; i++) J.front.push({ ...tire(ENI_ALLIES), id:'a' + i, pret:true, vmax:0 });
    J.front.forEach(u => u.vmax = u.v);
    O.front = [];
    const nO = niv === 1 ? 0 : niv === 2 ? Math.floor(r() * 2) : 1 + Math.floor(r() * (niv >= 5 ? 3 : 2));
    for (let i = 0; i < nO; i++) O.front.push({ ...tire(ENI_GARDES), id:'o' + i, pret:false });
    O.front.forEach(u => u.vmax = u.v);
    if (niv >= 5 && O.front.length && r() < .35) O.front[0].defense = true;
    O.gardeB = niv >= 4 && r() < .4 ? 2 + Math.floor(r() * 5) : 0; O.bouclier = 0;
    O.main = []; O.deck = []; O.pv = O.pvMax;
    const etat = structuredClone(S);
    if (connu && essai === connu.e) { etat.O.pv = connu.m; etat.auto = false; etat.log = []; return { iso, niv, essai, etat, sol:connu.s, max:connu.m, noeuds:0 }; }
    const sol = eniResous(etat, 40000);
    if (!sol || sol.v < P.dmin || sol.v >= O.pvMax) continue;
    if (sol.p.length < P.coups) continue; // la solution demande assez de coups (plus le jour avance, plus il en faut)
    if (niv >= 2 && eniGlouton(etat) > sol.v - P.ecart) continue; // le joueur « pressé » doit rester loin du compte
    etat.O.pv = sol.v; etat.auto = false; etat.log = [];
    return { iso, niv, essai, etat, sol:sol.p, max:sol.v, noeuds:sol.noeuds };
  }
  return null;
}

// ---------------------------------------------------------------- les mots pour dire un coup (indice et solution)
function eniDit(etat, c) {
  const J = etat.J, cib = t => !t ? '' : t.de !== undefined ? ` sur le dé ${J.des[t.de].v}${t.sens ? (t.sens > 0 ? ' (+1)' : ' (−1)') : ''}` : t.s === 'O' ? (t.ui < 0 ? ` sur ${etat.O.nom}` : ` sur ${etat.O.front[t.ui].n}`) : (t.ui < 0 ? ' sur toi' : ` sur ${J.front[t.ui].n}`);
  if (c.att !== undefined) return `${J.front[c.att].n} attaque${cib(c.t)}`;
  const vs = c.d.map(i => J.des[i].v).join('-');
  const nom = { frappe:'Frappe', technique:'Technique', pouvoir:`Pouvoir (${HEROS[J.id].pouvoir.n})`, ultime:`Ultime (${HEROS[J.id].ultime.n})`, vendre:'Vendre' }[c.q] || CARTES[c.q].n;
  return `${nom} avec ${c.d.length > 1 ? 'les dés' : 'le dé'} ${vs}${cib(c.t)}`;
}
// la solution est rejouée pas à pas pour écrire les valeurs des dés au moment où on les pose
function eniSolutionTexte(p) {
  const garde = S; const lignes = []; let e = structuredClone(p.etat); e.auto = true;
  try { for (const c of p.sol) { lignes.push(eniDit(e, c)); S = e; eniJoue(c); e = S; } } finally { S = garde; }
  if (e.J.front.some(u => u.pret && !u.cachee)) lignes.push('Fin du tour : tes créatures encore prêtes attaquent toutes seules.');
  return lignes;
}

// ---------------------------------------------------------------- souvenirs (sur le téléphone) : { iso: { ok, essais } }
const ENI_CLE = 'guilde-enigmes';
const eniMem = () => { try { return JSON.parse(localStorage.getItem(ENI_CLE) || '{}'); } catch (e) { return {}; } };
const eniEcrit = m => { try { localStorage.setItem(ENI_CLE, JSON.stringify(m)); } catch (e) {} };
function eniSerie() { const m = eniMem(); let n = 0; const d = new Date(); if (!(m[eniIso(d)] || {}).ok) d.setDate(d.getDate() - 1); while ((m[eniIso(d)] || {}).ok) { n++; d.setDate(d.getDate() - 1); } return n; }
const eniReussies = () => Object.values(eniMem()).filter(x => x.ok).length;

// ---------------------------------------------------------------- l'écran
let ENI = null; // { p, iso } l'énigme en cours
function eniCache(iso) {
  const v = 'v3'; // à changer si la fabrique change (sinon l'ancienne énigme du jour reste gardée)
  try { const c = JSON.parse(localStorage.getItem('guilde-enigme-cache') || 'null'); if (c && c.iso === iso && c.v === v) return c.p; } catch (e) {}
  const p = eniFabrique(iso); if (p) try { localStorage.setItem('guilde-enigme-cache', JSON.stringify({ iso, v, p })); } catch (e) {}
  return p;
}
function partieEnigme(iso) {
  const auj = eniIso(new Date());
  if (!iso || iso === '1' || iso > auj) iso = auj;
  document.getElementById('app').innerHTML = '<div style="padding:30vh 8vw;text-align:center;color:#e8dcc0;font-size:5vw">🐾 Moustache prépare l’énigme…</div>';
  setTimeout(() => {
    const p = eniCache(iso);
    if (!p) { fenetre('<h2>Pas d’énigme aujourd’hui</h2><p>Moustache n’a rien trouvé de bon. Il a dormi toute la nuit. Reviens demain !</p><div class="choixh"><button onclick="location.href=\'menu.html\'">⌂ Menu</button></div>'); return; }
    ENI = { p, iso }; eniAccueil();
  }, 30);
}
function eniDemarre() {
  const p = ENI.p; FX = []; fxApres = []; fxOn = false;
  S = structuredClone(p.etat); S.auto = false; S.enigme = true; S.fini = null; S.log = ['— Énigme du ' + eniDateTxt(ENI.iso) + ' : fais tomber ' + S.O.nom + ' pendant ce tour.'];
  sel = []; attaquant = null; ciblage = null; fermer(); document.body.classList.add('enigme'); rendu();
}
const eniDateTxt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
function eniAccueil() {
  const p = ENI.p, m = eniMem(), moi = m[ENI.iso] || {}, auj = new Date();
  const jours = []; for (let i = 6; i >= 1; i--) { const d = new Date(auj); d.setDate(d.getDate() - i); jours.push(eniIso(d)); }
  const pastille = iso => { const x = m[iso] || {}; return `<button onclick="location.href='duel.html?enigme=${iso}'" style="padding:1.5vw 2vw;font-size:3.2vw">${ENI_JOURS[eniNiveau(iso)].slice(0, 3)}. ${x.ok ? '✅' : x.essais ? '…' : ''}</button>`; };
  fenetre(`<h2>🧩 L’énigme du ${eniDateTxt(ENI.iso)}</h2>
    <p><b>${'★'.repeat(p.niv)}${'☆'.repeat(7 - p.niv)}</b> · ${ENI_NIV[p.niv]}</p>
    <p>Tu joues <b>${HEROS[p.etat.J.id].nom}</b>. En face, <b>${p.etat.O.nom}</b> n’a plus que <b>${p.max} PV</b>.</p>
    <p>Tes dés sont déjà lancés et ne se relancent pas. <b>Fais-le tomber pendant ce tour.</b> Ses PV sont exactement le maximum de dégâts possible : il faut trouver le coup parfait.</p>
    ${moi.ok ? '<p>✅ Déjà réussie' + (moi.essais > 1 ? ` (en ${moi.essais} essais)` : ' du premier coup !') + '</p>' : moi.essais ? `<p>Essais : ${moi.essais}</p>` : ''}
    <p>🔥 Série : <b>${eniSerie()}</b> jour(s) · ${eniReussies()} énigme(s) réussie(s)</p>
    <div class="choixh"><button onclick="eniDemarre()">▶ ${moi.essais ? 'Rejouer' : 'Jouer'}</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>
    <p style="margin-top:3vw;font-size:3.2vw;opacity:.8">Les jours d’avant :</p><div class="choixh" style="flex-wrap:wrap;gap:1.5vw">${jours.map(pastille).join('')}</div>`);
}
function eniResultat() {
  const m = eniMem(), x = m[ENI.iso] || { ok:false, essais:0 };
  if (!x.ok) x.essais = (x.essais || 0) + 1;
  const gagne = S.fini === 'gagne' || S.O.pv <= 0;
  if (gagne && !x.ok) x.ok = true;
  m[ENI.iso] = x; eniEcrit(m);
  arreteMusique(.8); son(gagne ? 'victoire' : 'defaite');
  if (gagne) {
    effetImage('victoire', document.getElementById('app'), 2.2);
    fenetre(`<h2>🏆 Énigme résolue !</h2><p>${x.essais > 1 ? `En ${x.essais} essais.` : 'Du premier coup !'} 🔥 Série : <b>${eniSerie()}</b> jour(s).</p>
      <p style="font-style:italic">Moustache : « ${['Pas mal, pour quelqu’un sans moustaches.', 'Miaou ! Je l’aurais trouvé aussi. Après ma sieste. Peut-être.', 'Propre. Net. Presque élégant.', 'Tu vois ? Réfléchir, ça ne fait pas mal.'][x.essais % 4]} »</p>
      <div class="choixh"><button onclick="eniAccueil()">🧩 Les autres jours</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`);
    return;
  }
  const reste = Math.max(0, S.O.pv);
  let aide = '';
  if (x.essais >= 5) aide = `<p><b>La solution :</b></p><ol style="text-align:left;font-size:3.4vw">${eniSolutionTexte(ENI.p).map(l => `<li>${l}</li>`).join('')}</ol>`;
  else if (x.essais >= 2) aide = `<p style="font-style:italic">Moustache : « Psst. Moi, je commencerais par : <b>${eniDit(ENI.p.etat, ENI.p.sol[0])}</b>. Mais je dis ça, je dis rien. »</p>`;
  else aide = '<p style="font-style:italic">Moustache : « Raté. Regarde bien tes cartes : il y a peut-être un ordre qui change tout. »</p>';
  fenetre(`<h2>💨 Raté… il lui reste ${reste} PV</h2><p>Essai ${x.essais}.${x.essais < 2 ? ' Un indice arrive au 2e essai raté.' : x.essais < 5 ? ` La solution arrive au 5e essai raté.` : ''}</p>${aide}
    <div class="choixh"><button onclick="eniDemarre()">↺ Recommencer</button><button onclick="eniAccueil()">🧩 L’énigme</button></div>`);
}

{ const st = document.createElement('style'); st.textContent = 'body.enigme .b1 { visibility:hidden; }'; document.head.appendChild(st); }
// ---------------------------------------------------------------- branchements dans le Duel (seulement pendant une énigme)
if (typeof finDeMonTour === 'function') {
  const _finEni = finDeMonTour;
  finDeMonTour = function () {
    if (!S || !S.enigme) return _finEni();
    if (S.fini || roule) return;
    attaquesRestantes(S.J);
    sel = []; attaquant = null; ciblage = null;
    if (S.fini) { rendu(); return; } // la victoire passe par montrerFin
    fxApres.push(eniResultat); rendu(); // rendu() lance eniResultat après les animations
  };
  const _montrerEni = montrerFin;
  montrerFin = function () { if (S && S.enigme) { if (!S.eniFin) { S.eniFin = true; eniResultat(); } return; } _montrerEni(); };
  const _relancerEni = relancer;
  relancer = function () { if (S && S.enigme) { fenetre('<h2>Pas de relance</h2><p>Dans une énigme, les dés sont figés : tout se joue avec ceux-là.</p><div class="choixh"><button onclick="fermer()">Compris</button></div>'); return; } _relancerEni(); };
}
