// =============================================================================================== LA FICHE DE HÉROS COMMUNE (15/11 ~17 h 45)
// Demande de l'utilisateur : « fais l'unification, je veux un vrai système de héros » (captures d'AFK Journey).
// UNE fiche pour TOUS les héros (Guilde et aventure) : le héros au centre, ses 6 cases d'équipement autour, la puissance, les caractéristiques,
// le NIVEAU (or + poussière), le RANG (éclats), les RELIQUES de l'Odyssée, le coffre (améliorer, vendre, FUSIONNER), le forgeron.
// Besoin de : heros-etoiles.js (le système), et pour les héros d'aventure aventuriers.js ; pour les reliques : aventure.js (EQUIP, eqImg).
// La page qui l'utilise définit FH.apres = () => { … redessiner … }.
const FH = { apres:() => {}, choixRel:null };
(function () {
  const css = `
  .fh-scene { display:grid; grid-template-columns:72px 1fr 72px; gap:8px; align-items:center; padding:14px 8px 10px; border-radius:18px; margin:8px 0;
    background:radial-gradient(ellipse at 50% 70%, color-mix(in srgb, var(--hc, #c88a4a) 35%, transparent), transparent 62%), linear-gradient(180deg, #2a2240, #120f1e); border:2px solid #4b4580; box-shadow:inset 0 0 40px #000a; }
  .fh-col { display:grid; gap:10px; }
  .fh-slot { position:relative; width:70px; height:70px; border-radius:12px; border:2px solid #4b4580; background:linear-gradient(160deg, #221d42, #100c20); padding:2px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:inherit; font:inherit; cursor:pointer; }
  .fh-slot .e { font-size:27px; line-height:1; } .fh-slot .e.vide { opacity:.3; } .fh-slot small { font-size:9px; color:#c9c1ea; line-height:1.1; text-align:center; max-width:64px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .fh-slot i { position:absolute; top:2px; right:4px; font-style:normal; font-size:10px; color:#f3c96b; font-weight:bold; }
  .fh-slot.lock { opacity:.55; }
  .fh-r0 { border-color:#c9c1ea !important; } .fh-r1 { border-color:#4f8bff !important; box-shadow:0 0 10px #4f8bff66; } .fh-r2 { border-color:#c084fc !important; box-shadow:0 0 12px #c084fc88; }
  .fh-r3 { border-color:#f3c96b !important; box-shadow:0 0 14px #f3c96b99; } .fh-r4 { border-color:#ff5a5a !important; box-shadow:0 0 16px #ff5a5aaa; }
  .fh-centre { text-align:center; } .fh-centre img { width:100%; max-width:170px; aspect-ratio:1; border-radius:50%; object-fit:cover; box-shadow:0 0 0 4px var(--rc), 0 0 30px var(--rc); }
  .fh-centre b { display:block; color:#f3c96b; font-size:1.15em; margin-top:6px; } .fh-centre small { color:#c9c1ea; }
  .fh-rang { display:inline-block; margin-top:4px; padding:2px 10px; border-radius:20px; font-weight:bold; font-size:.85em; color:#120f24; background:var(--rc); }
  .fh-puiss { text-align:center; font-size:1.6em; font-weight:bold; color:#f3c96b; margin:6px 0 2px; text-shadow:0 0 10px #f3c96b66; }
  .fh-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; background:#14122a; border:1px solid #4b4580; border-radius:14px; padding:8px 4px; text-align:center; font-size:.8em; }
  .fh-stats b { display:block; font-size:1.2em; color:#f1ecff; } .fh-stats span { color:#c9c1ea; }
  .fh-bloc { background:#1c1838e6; border:1px solid #4b4580; border-radius:14px; padding:12px; margin:10px 0; }
  .fh-bloc h4 { margin:0 0 6px; color:#f3c96b; font-size:1em; }
  .fh-barre { height:8px; border-radius:4px; background:#000a; overflow:hidden; margin:6px 0 4px; } .fh-barre i { display:block; height:100%; background:linear-gradient(90deg, #f3c96b, #ffb02e); }
  .fh-bts { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
  .fh-bt { flex:1; min-width:120px; font:bold .95em Georgia, serif; padding:10px; border-radius:12px; border:1px solid #4b4580; background:#221d42; color:#f1ecff; cursor:pointer; }
  .fh-bt.or { background:#f3c96b; color:#2b1d0a; border:0; } .fh-bt[disabled] { opacity:.4; cursor:default; }
  .fh-bonus { list-style:none; padding:0; margin:6px 0 0; font-size:.88em; } .fh-bonus li { padding:2px 0; color:#8a84b0; } .fh-bonus li.on { color:#f1ecff; }
  .fh-ress { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; font-weight:bold; color:#f3c96b; margin:6px 0; }
  .fh-piece { display:flex; align-items:center; gap:10px; border:2px solid #4b4580; border-radius:12px; padding:8px; margin:6px 0; background:#14122a; }
  .fh-piece .e { font-size:26px; } .fh-piece b { display:block; } .fh-piece small { color:#c9c1ea; display:block; } .fh-piece .act { margin-left:auto; display:flex; flex-direction:column; gap:4px; }
  .fh-piece .act button { font:inherit; font-size:.85em; padding:6px 10px; border-radius:10px; border:1px solid #4b4580; background:#221d42; color:#f1ecff; cursor:pointer; }
  .fh-rel { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; } .fh-rel button { background:#14122a; border:2px solid #4b4580; border-radius:12px; padding:6px; color:inherit; font:inherit; font-size:.8em; cursor:pointer; min-height:70px; }
  .fh-rel button.sel { border-color:#f3c96b; } .fh-rel img { display:block; margin:0 auto 2px; }
  .fh-voile { position:fixed; inset:0; background:#000c; z-index:80; display:flex; align-items:center; justify-content:center; padding:4vw; }
  .fh-fen { width:min(94vw, 480px); max-height:88vh; overflow:auto; background:#1c1838; border:2px solid #f3c96b; border-radius:18px; padding:16px; color:#f1ecff; font:15px/1.4 Georgia, serif; }
  .fh-fen h2 { margin:0 0 8px; text-align:center; color:#f3c96b; font-size:1.15em; } .fh-fen .doux { color:#c9c1ea; font-size:.9em; }
  .fh-bulle { position:fixed; left:50%; top:40%; transform:translateX(-50%); z-index:90; background:#000d; color:#f3c96b; font-weight:bold; padding:10px 18px; border-radius:14px; animation:fhb 1.6s forwards; pointer-events:none; text-align:center; }
  @keyframes fhb { 0% { opacity:0; } 15% { opacity:1; } 80% { opacity:1; } 100% { opacity:0; } }
  .fh-monte { animation:fhm .7s; } @keyframes fhm { 30% { transform:scale(1.08); filter:brightness(1.5); } }`;
  if (typeof document !== 'undefined') document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
})();
const fhSon = k => { try { if (typeof GM !== 'undefined') GM.son(k); } catch (e) {} };
function fhBulle(x) { const b = document.createElement('div'); b.className = 'fh-bulle'; b.textContent = x; document.body.appendChild(b); setTimeout(() => b.remove(), 1600); }
function fhFen(h) { let f = document.getElementById('fh-fen'); if (!f) { f = document.createElement('div'); f.id = 'fh-fen'; document.body.appendChild(f); }
  f.innerHTML = h ? `<div class="fh-voile" onclick="if(event.target===this)fhFen('')"><div class="fh-fen">${h}</div></div>` : ''; }
const fhGuilde = id => typeof HEROS !== 'undefined' && HEROS[id] && !String(id).startsWith('av');
function fhInfo(id) {
  if (fhGuilde(id)) return { nom:HEROS[id].nom, titre:HEROS[id].titre || '', c:HEROS[id].c, img:`portraits/${id}.webp`, secours:`portraits/${id}.webp`, pvBase:HEROS[id].pv };
  const a = typeof avTrouve === 'function' ? avTrouve(id) : null; if (!a) return null;
  return { nom:a.nom, titre:avTitre(a), c:a.couleur, img:avPortrait(a), secours:avPortraitSecours(a), pvBase:avStatsBase(a).pv, av:a };
}
const fhPuissance = id => { const I = fhInfo(id); return I ? (I.av ? avPuissance(I.av) : puissanceHeros(id, I.pvBase)) : 0; };
const fhImg = (I, px) => `<img src="${I.img}" onerror="this.onerror=null;this.src='${I.secours}'" alt="" ${px ? `style="width:${px}px;height:${px}px;border-radius:50%;object-fit:cover"` : ''}>`;
// 15/11 soir : les icônes peintes (ui/heros/<nom>.webp) ; si une image manque, l'émoji reste
const fhIco = (nom, e, t) => `<img src="ui/heros/${nom}.webp?v=1" alt="" style="width:${t || '1.3em'};height:${t || '1.3em'};object-fit:contain;vertical-align:middle;filter:drop-shadow(0 1px 2px #000a)" onerror="this.replaceWith(document.createTextNode('${e}'))">`;
const fhRess = () => { const s = avSac(), d = lireEtoiles(); return `<div class="fh-ress"><span>${fhIco('ress-or', '🪙')} ${s.or}</span><span>${fhIco('ress-poussiere', '🔹')} ${d.poussiere || 0}</span><span>${fhIco('ress-eclats', '💠')} ${d.libres || 0}</span></div>`; };

// ------------------------------------------------------------------------------------------------ la fiche
function ficheHerosHTML(id) {
  const I = fhInfo(id); if (!I) return '<p>Héros introuvable.</p>';
  const H = etatH(id), S = statsHeros(id), R = RANGS[H.rang], E = equipementDe(id), pvTot = I.pvBase + S.pv;
  const slot = c => { const p = E[c.k], lock = c.niv && H.niv < c.niv;
    return `<button class="fh-slot ${p ? 'fh-r' + p.r : ''} ${lock ? 'lock' : ''}" onclick="${lock ? `fhBulle('Cette case s’ouvre au niveau ${c.niv}')` : `fhCase('${id}','${c.k}')`}">${lock ? `<span class="e">🔒</span><small>niveau ${c.niv}</small>` : p ? `<span class="e">${fhIco('eq-' + c.k, c.e, '1.6em')}</span><small>${p.nom}</small><i>+${p.niv}</i>` : `<span class="e vide">${fhIco('eq-' + c.k, c.e, '1.6em')}</span><small>${c.n}</small>`}</button>`; };
  const cn = coutNiveau(H.niv), etatN = peutMonterNiveau(id), coutR = COUT_NIV[H.rang];
  const max10 = (() => { let n = H.niv, or = avSac().or, pou = poussiereH(), k = 0; while (k < 10 && n < R.max) { const c = coutNiveau(n); if (or < c.or || pou < c.pou) break; or -= c.or; pou -= c.pou; n++; k++; } return k; })();
  return `<div class="fh-scene" style="--hc:${I.c};--rc:${R.c}">
      <div class="fh-col">${['arme', 'tete', 'anneau'].map(k => slot(EQ_CASES.find(c => c.k === k))).join('')}</div>
      <div class="fh-centre" id="fh-portrait">${fhImg(I)}<b>${I.nom}</b><small>${I.titre}</small><br><span class="fh-rang">${R.n}</span></div>
      <div class="fh-col">${['torse', 'pieds', 'talisman'].map(k => slot(EQ_CASES.find(c => c.k === k))).join('')}</div>
    </div>
    <div class="fh-puiss">✊ ${fhPuissance(id)}</div>
    <div class="fh-stats">
      <div><b>${H.niv}</b><span>Niveau</span></div><div><b>${pvTot}</b><span>❤ PV</span></div><div><b>${S.att}</b><span>⚔ Attaque</span></div><div><b>${S.def}</b><span>🛡 Défense</span></div>
      <div><b>${S.agi}</b><span>🥾 Agilité</span></div><div><b>${S.bouclier}</b><span>🛡 Bouclier</span></div><div><b>${S.pc}</b><span>◆ PC</span></div><div><b>${S.relance + S.des + S.main}</b><span>🎲 Bonus</span></div>
    </div>
    <p class="doux" style="font-size:.82em;color:#c9c1ea;margin:6px 2px">Tout cela compte contre les monstres (Odyssée, Crypte, Descente, Fosse, Chroniques, Défense, épreuves). Le Duel de l’Arène reste équitable.</p>
    ${fhRess()}
    <div class="fh-bloc"><h4>📈 Niveau ${H.niv} / ${R.max}</h4>
      <div class="fh-barre"><i style="width:${Math.round(100 * H.niv / R.max)}%"></i></div>
      ${etatN === 'plafond' ? `<p class="doux" style="color:#c9c1ea;margin:4px 0">Plafond atteint pour le rang ${R.n}${H.rang < RANGH_MAX ? ' : monte de rang pour aller plus haut.' : '.'}</p>` :
        `<p style="margin:4px 0;color:#c9c1ea;font-size:.9em">Niveau suivant : 🪙 ${cn.or} et 🔹 ${cn.pou}. Tous les 10 niveaux : +1 PV ; au niveau 50 : +1 Défense ; 100 : +1 Attaque ; 120 : +1 Agilité.</p>`}
      <div class="fh-bts"><button class="fh-bt or" ${etatN === 'ok' ? '' : 'disabled'} onclick="fhNiveau('${id}',1)">⬆ Monter d’un niveau</button><button class="fh-bt" ${max10 > 1 ? '' : 'disabled'} onclick="fhNiveau('${id}',10)">⬆ +${Math.max(1, max10)} niveaux</button></div></div>
    <div class="fh-bloc"><h4>⭐ Rang : ${R.n}</h4>
      ${H.rang < RANGH_MAX ? `<div class="fh-barre"><i style="width:${Math.min(100, Math.round(100 * H.e / coutR))}%"></i></div><p style="margin:4px 0;color:#c9c1ea;font-size:.9em">✨ ${H.e} / ${coutR} éclats de ${I.nom} pour passer ${RANGS[H.rang + 1].n} (niveau max ${RANGS[H.rang + 1].max}).</p>
        <div class="fh-bts"><button class="fh-bt or" ${H.e >= coutR ? '' : 'disabled'} onclick="fhRang('${id}')">⬆ Passer ${RANGS[H.rang + 1].n}</button>${lireEtoiles().libres ? `<button class="fh-bt" onclick="fhVerse('${id}')">💠 Verser des éclats de Guilde</button>` : ''}</div>` : '<p>Rang maximum : légende de la Guilde !</p>'}
      <ul class="fh-bonus">${BONUS_RANG.map(([r, e, t]) => `<li class="${H.rang >= r ? 'on' : ''}">${H.rang >= r ? '✅' : '🔒'} <b>${RANGS[r].n}</b> : ${e} ${t}</li>`).join('')}</ul>
      <p style="color:#8a84b0;font-size:.82em;margin:6px 0 0">Les éclats de ${I.nom} se gagnent en jouant avec : élite 2, boss 5, Titan 5, étage 3… Les quêtes donnent des éclats de Guilde 💠, à verser sur qui tu veux.</p></div>
    <div class="fh-bts"><button class="fh-bt" onclick="fhCoffre('${id}')">${fhIco('coffre-heros', '🎒')} Le coffre (${avSac().pieces.length})${groupesFusion().length ? ' · ⚒ fusion !' : ''}</button><button class="fh-bt" onclick="fhForgeron('${id}')">⚒ Le forgeron</button></div>
    ${typeof EQUIP !== 'undefined' && typeof equipHeros === 'function' ? fhReliques(id) : ''}`;
}
function fhReliques(id) {
  const D = lireEtoiles(), eq = equipHeros(id), pl = FH.choixRel;
  const arm = Object.keys(D.armurerie).filter(k => D.armurerie[k] && EQUIP[k] && (!pl || EQUIP[k][0] === pl));
  return `<div class="fh-bloc"><h4>🏺 Les reliques <small style="color:#c9c1ea;font-weight:normal">(Odyssée, Grande aventure, Crypte…)</small></h4>
    <div class="fh-rel">${Object.keys(RELIQUES_PL).map(p => `<button class="${pl === p ? 'sel' : ''}" onclick="FH.choixRel = FH.choixRel === '${p}' ? null : '${p}';FH.apres()"><small>${RELIQUES_PL[p]}</small>${eq[p] ? `${typeof eqImg === 'function' ? eqImg(eq[p], 34) : ''}<b>${EQUIP[eq[p]][2]} ${'★'.repeat(niveauEquip(eq[p]))}</b>` : '<br><span style="opacity:.4">vide</span>'}</button>`).join('')}</div>
    ${pl ? `<p class="doux" style="color:#c9c1ea;font-size:.85em">Touche une relique pour l’équiper.${eq[pl] ? ` <button class="fh-bt" style="min-width:0;flex:none;padding:4px 10px" onclick="equipeHeros('${id}','${pl}',null);FH.apres()">Retirer</button>` : ''}</p>
      <div class="fh-rel">${arm.length ? arm.map(k => `<button onclick="equipeHeros('${id}','${pl}','${k}');FH.choixRel=null;fhSon('tour-fusion');FH.apres()">${typeof eqImg === 'function' ? eqImg(k, 34) : ''}<b>${EQUIP[k][2]}</b><small>${fusionTxt(k)}</small></button>`).join('') : '<p class="doux">Aucune relique de ce genre : elles tombent des élites et des boss de l’Odyssée. 3 exemplaires = ★★, 5 = ★★★.</p>'}</div>` : ''}</div>`;
}
// ------------------------------------------------------------------------------------------------ les actions
function fhNiveau(id, n) { const f = monteNiveau(id, n); if (f) { fhSon('tour-fusion'); fhBulle(`⬆ Niveau ${niveauH(id)} !`); FH.apres(); const p = document.getElementById('fh-portrait'); if (p) p.classList.add('fh-monte'); } else fhBulle('Pas assez d’or ou de poussière'); }
function fhRang(id) { if (promouvoir(id)) { fhSon('victoire'); fhBulle(`⭐ ${RANGS[niveauHeros(id)].n} !`); FH.apres(); const p = document.getElementById('fh-portrait'); if (p) p.classList.add('fh-monte'); } }
function fhVerse(id) { const h = etatH(id), d = lireEtoiles(), n = Math.min(d.libres, Math.max(1, COUT_NIV[h.rang] - h.e)); if (verseLibres(id, n)) { fhSon('magie'); fhBulle(`💠 ${n} éclats versés`); FH.apres(); } }
function fhPiece(p, actions) { const C = EQ_CASES.find(c => c.k === p.slot), por = porteurDe(p.id), I = por ? fhInfo(por) : null;
  return `<div class="fh-piece fh-r${p.r}"><span class="e">${C.e}</span><div><b style="color:${EQ_RARE[p.r].c}">${p.nom} <small style="display:inline">+${p.niv}/${eqNivMax(p)}</small></b><small>${C.n} ${EQ_RARE[p.r].n} · ${eqTexte(p)}</small>${I ? `<small>porté par ${I.nom}</small>` : ''}</div><div class="act">${actions}</div></div>`; }
function fhCase(id, k) {
  const E = equipementDe(id), p = E[k], C = EQ_CASES.find(c => c.k === k), autres = avSac().pieces.filter(x => x.slot === k && x.id !== (p && p.id)).sort((a, b) => b.r - a.r || b.niv - a.niv);
  fhFen(`<h2>${C.e} ${C.n}</h2>
    ${p ? `<p class="doux">Porté :</p>${fhPiece(p, `${p.niv < eqNivMax(p) ? `<button onclick="fhAmelio('${id}','${k}','${p.id}')">⬆ ${eqPrixAmelio(p)} 🪙</button>` : '<small>max : fusionne</small>'}<button onclick="retirePiece('${id}','${k}');fhFen('');FH.apres()">Retirer</button>`)}
      ${p.niv < eqNivMax(p) ? `<p class="doux">Au niveau ${p.niv + 1} : ${eqTexte(Object.assign({}, p, { niv:p.niv + 1 }))}</p>` : ''}` : '<p class="doux">Rien dans cette case.</p>'}
    <p class="doux" style="margin-top:10px">Dans le coffre :</p>
    ${autres.length ? autres.map(x => fhPiece(x, `<button onclick="fhEquipe('${id}','${x.id}')">Équiper</button>`)).join('') : '<p class="doux">Aucune pièce de ce genre. Elles tombent des boss, des élites et des meubles des Chroniques ; le forgeron en vend.</p>'}
    <button class="fh-bt or" style="width:100%;margin-top:10px" onclick="fhFen('')">Fermer</button>`);
}
function fhEquipe(id, pid) { const r = equipePiece(id, pid); if (r === 'ok') { fhSon('tour-fusion'); fhBulle('Équipé !'); fhFen(''); FH.apres(); } else fhBulle(r); }
function fhAmelio(id, k, pid) { const r = amelioPiece(pid); if (r === 'ok') { fhSon('tour-fusion'); fhBulle('⬆ Amélioré !'); FH.apres(); if (k) fhCase(id, k); else fhCoffre(id); } else fhBulle(r); }
function fhCoffre(id) {
  const s = avSac(), G = groupesFusion();
  fhFen(`<h2>🎒 Le coffre des héros</h2>${fhRess()}<p class="doux">Un seul coffre pour tous tes héros. Améliore avec l’or ; quand une pièce est au maximum de sa rareté, FUSIONNE-la : <b>3 pièces de la même case et de la même rareté = 1 pièce de la rareté au-dessus</b> (commune → rare → épique → légendaire → mythique).</p>
    ${G.length ? `<div class="fh-bloc"><h4>⚒ Fusions possibles</h4>${G.map(g => { const C = EQ_CASES.find(c => c.k === g[0].slot); return `<div class="fh-piece fh-r${g[0].r + 1}"><span class="e">${C.e}</span><div><b>${g.length} × ${C.n} ${EQ_RARE[g[0].r].n}${g.length > 1 ? 's' : ''}</b><small>3 → 1 ${C.n.toLowerCase()} <b style="display:inline;color:${EQ_RARE[g[0].r + 1].c}">${EQ_RARE[g[0].r + 1].n}</b></small></div><div class="act"><button onclick="fhFusion('${id}','${g[0].slot}',${g[0].r})">⚒ Fusionner</button></div></div>`; }).join('')}</div>` : ''}
    ${s.pieces.slice().sort((x, y) => y.r - x.r || y.niv - x.niv).map(p => fhPiece(p, `<button onclick="fhEquipe('${id}','${p.id}')">Équiper</button>${p.niv < eqNivMax(p) ? `<button onclick="fhAmelio('${id}',null,'${p.id}')">⬆ ${eqPrixAmelio(p)} 🪙</button>` : ''}<button onclick="if(confirm('Revendre pour ${eqPrixVente(p)} pièces ?')){vendPiece('${p.id}');fhCoffre('${id}');FH.apres()}">Vendre ${eqPrixVente(p)}</button>`)).join('') || '<p class="doux">Le coffre est vide.</p>'}
    <button class="fh-bt or" style="width:100%;margin-top:10px" onclick="fhFen('')">Fermer</button>`);
}
function fhFusion(id, slot, r) { const n = fusionnePiece(slot, r); if (n) { fhSon('victoire'); fhBulle(`⚒ ${n.nom} ${EQ_RARE[n.r].n} !`); FH.apres(); fhCoffre(id); } }
function fhForgeron(id) {
  const s = avSac(); let deja = {}; try { deja = JSON.parse(localStorage.getItem('guilde-forgeron-achats') || '{}'); } catch (e) {}
  fhFen(`<h2>⚒ Le forgeron</h2><p class="doux" style="text-align:center">« Trois pièces aujourd’hui, pas une de plus. Demain, autre chose. » · 🪙 ${s.or}</p>
    ${forgeronStock(id).map((x, i) => fhPiece(x, deja[x.id] ? '<small>vendu</small>' : `<button ${s.or < x.prix ? 'disabled style="opacity:.4"' : ''} onclick="fhAchete('${id}',${i})">${x.prix} 🪙</button>`)).join('')}
    <button class="fh-bt or" style="width:100%;margin-top:10px" onclick="fhFen('')">Fermer</button>`);
}
function fhAchete(id, i) { const r = forgeronAchete(i, id); if (r === 'ok') { fhSon('tour-fusion'); fhBulle('Acheté : dans le coffre !'); FH.apres(); fhForgeron(id); } else fhBulle(r); }
