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
  .fh-de-mini { display:flex; gap:4px; } .fh-de-mini span { position:relative; width:30px; } .fh-de-mini img { width:30px; height:30px; display:block; } .fh-de-mini b { position:absolute; right:-4px; bottom:-4px; font-size:11px; background:#1f4d2e; color:#7dffb0; border-radius:8px; padding:0 3px; }
  .fh-de { display:grid; grid-template-columns:repeat(6, 1fr); gap:5px; } .fh-de button { background:#15132b; border:2px solid #4b4580; border-radius:10px; padding:4px 2px; color:#fff; font:inherit; } .fh-de button img { width:100%; max-width:44px; display:block; margin:0 auto 2px; } .fh-de button.peut { border-color:#7dffb0; box-shadow:0 0 8px #7dffb066; } .fh-de button span { font-weight:bold; color:#7dffb0; }
  .fh-tal { margin:0; padding-left:1.1em; font-size:.85em; } .fh-tal li { margin:3px 0; } .fh-tal li.lock { opacity:.55; }
  .fh-zero { background:none; border:1px solid #6b5fb0; color:#c9c1ea; border-radius:20px; padding:7px 16px; font:inherit; font-size:.85em; } .fh-zero[disabled] { opacity:.45; }
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
  .fh-fen { position:relative; } .fh-x { position:sticky; top:-6px; float:right; margin:-8px -8px 0 8px; z-index:2; width:40px; height:40px; border-radius:50%; border:2px solid #f3c96b; background:#2a2650; color:#f3c96b; font:bold 22px/1 Georgia, serif; cursor:pointer; box-shadow:0 2px 8px #000a; }
  .fh-fen h2 { margin:0 0 8px; text-align:center; color:#f3c96b; font-size:1.15em; } .fh-fen .doux { color:#c9c1ea; font-size:.9em; }
  .fh-bulle { position:fixed; left:50%; top:40%; transform:translateX(-50%); z-index:90; background:#000d; color:#f3c96b; font-weight:bold; padding:10px 18px; border-radius:14px; animation:fhb 1.6s forwards; pointer-events:none; text-align:center; }
  @keyframes fhb { 0% { opacity:0; } 15% { opacity:1; } 80% { opacity:1; } 100% { opacity:0; } }
  .fh-bt.fh-pret { border-color:#ff9a3c; box-shadow:0 0 10px #ff9a3c88; animation:fgPret 1.4s ease-in-out infinite; } @keyframes fgPret { 50% { box-shadow:0 0 18px #ffb347; } }
  .fg-enclume { display:flex; justify-content:center; gap:8px; margin:10px 0 4px; padding:12px 8px 16px; border-radius:16px; background:radial-gradient(ellipse at 50% 110%, #ff7a1a55, #14122a 70%); border:2px solid #4b4580; }
  .fg-enclume.pleine { border-color:#ff9a3c; }
  .fg-enclume.frappe { animation:fgFrappe .9s; } @keyframes fgFrappe { 20%, 60% { transform:translateX(-3px); filter:brightness(1.8); } 40%, 80% { transform:translateX(3px); } 100% { filter:brightness(3); } }
  .fg-place { width:30%; min-height:78px; border:2px solid #4b4580; border-radius:12px; background:#1c1838; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:4px; }
  .fg-place span { font-size:26px; } .fg-place small { font-size:.72em; line-height:1.2; } .fg-place.vide { color:#4b4580; font-size:28px; border-style:dashed; }
  .fg-fleche { text-align:center; color:#ff9a3c; font-size:22px; }
  .fg-result { box-shadow:0 0 16px #ff9a3c66; } .fg-manque { opacity:.5; } .fg-sel { border-color:#ff9a3c !important; }
  .fg-eclat { text-align:center; font-size:58px; animation:fgEclat .8s ease-out; filter:drop-shadow(0 0 14px #ffb347); } @keyframes fgEclat { from { transform:scale(.2) rotate(-30deg); opacity:0; } }
  .fh-monte { animation:fhm .7s; } @keyframes fhm { 30% { transform:scale(1.08); filter:brightness(1.5); } }`;
  if (typeof document !== 'undefined') document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
})();
const fhSon = k => { try { if (typeof GM !== 'undefined') GM.son(k); } catch (e) {} };
function fhBulle(x) { const b = document.createElement('div'); b.className = 'fh-bulle'; b.textContent = x; document.body.appendChild(b); setTimeout(() => b.remove(), 1600); }
function fhFen(h) { let f = document.getElementById('fh-fen'); if (!f) { f = document.createElement('div'); f.id = 'fh-fen'; document.body.appendChild(f); }
  f.innerHTML = h ? `<div class="fh-voile" onclick="if(event.target===this)fhFen('')"><div class="fh-fen"><button class="fh-x" aria-label="Fermer" onclick="fhFen('')">✕</button>${h}</div></div>` : ''; }
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
      <div class="fh-centre" id="fh-portrait">${fhImg(I)}<b>${I.nom}</b><small>${I.titre}</small>${typeof PW_CLASSES !== 'undefined' && typeof classeDe === 'function' && PW_CLASSES[classeDe(id)] ? `<br><small style="color:#f3c96b">${PW_CLASSES[classeDe(id)].e} ${PW_CLASSES[classeDe(id)].n} · ${PW_CLASSES[classeDe(id)].d}</small>` : ''}<br><span class="fh-rang">${R.n}</span>${typeof avTrouve === 'function' && avTrouve(id) && typeof avMaj === 'function' ? `<br><button style="margin-top:8px;font-size:.85em;padding:6px 12px;background:#2a2550;color:#f1ecff;border:1px solid #6a5fb0;border-radius:10px;font-family:inherit" onclick="fhApparence('${id}')">🎭 Changer d’apparence</button>` : ''}</div>
      <div class="fh-col">${['torse', 'pieds', 'talisman'].map(k => slot(EQ_CASES.find(c => c.k === k))).join('')}</div>
    </div>
    <div class="fh-puiss">✊ ${fhPuissance(id)}</div>
    <div class="fh-stats">
      <div><b>${H.niv}</b><span>Niveau</span></div><div><b>${pvTot}</b><span>❤ PV</span></div><div><b>${S.att}</b><span>⚔ Attaque</span></div><div><b>${S.def}</b><span>🛡 Défense</span></div>
      <div><b>${S.agi}</b><span>🥾 Agilité</span></div><div><b>${S.bouclier}</b><span>🛡 Bouclier</span></div><div><b>${S.pc}</b><span>◆ PC</span></div><div><b>${S.relance + S.des + S.main}</b><span>🎲 Bonus</span></div>
    </div>
    <p class="doux" style="font-size:.82em;color:#c9c1ea;margin:6px 2px">Tout cela compte contre les monstres (Odyssée, Crypte, Descente, Fosse, Chroniques, Défense, épreuves). Le Duel de l’Arène reste équitable.</p>
    ${typeof pouvoirsDe === 'function' ? fhPouvoirs(id) : ''}
    ${I.av && typeof avForge === 'function' ? fhDe(I.av) : ''}
    ${fhRess()}
    <div class="fh-bloc"><h4>📈 Niveau ${H.niv} / ${R.max}</h4>
      <div class="fh-barre"><i style="width:${Math.round(100 * H.niv / R.max)}%"></i></div>
      ${etatN === 'plafond' ? `<p class="doux" style="color:#c9c1ea;margin:4px 0">Plafond atteint pour le rang ${R.n}${H.rang < RANGH_MAX ? ' : monte de rang pour aller plus haut.' : '.'}</p>` :
        `<p style="margin:4px 0;color:#c9c1ea;font-size:.9em">Niveau suivant : 🪙 ${cn.or} et 🔹 ${cn.pou}. Tous les 10 niveaux : +1 PV ; au niveau 50 : +1 Défense ; 100 : +1 Attaque ; 120 : +1 Agilité.</p>`}
      <div class="fh-bts"><button class="fh-bt or" ${etatN === 'ok' ? '' : 'disabled'} onclick="fhNiveau('${id}',1)">⬆ Monter d’un niveau</button><button class="fh-bt" ${max10 > 1 ? '' : 'disabled'} onclick="fhNiveau('${id}',10)">⬆ +${Math.max(1, max10)} niveaux</button></div></div>
    <div class="fh-bloc"><h4>${rangMedaille(R, 30) || '⭐'} Rang : ${R.n}</h4>
      ${H.rang < RANGH_MAX ? `<div class="fh-barre"><i style="width:${Math.min(100, Math.round(100 * H.e / coutR))}%"></i></div><p style="margin:4px 0;color:#c9c1ea;font-size:.9em">✨ ${H.e} / ${coutR} éclats de ${I.nom} pour passer ${RANGS[H.rang + 1].n} (niveau max ${RANGS[H.rang + 1].max}).</p>
        <div class="fh-bts"><button class="fh-bt or" ${H.e >= coutR && H.niv >= nivPourRang(H.rang + 1) ? '' : 'disabled'} onclick="fhRang('${id}')">⬆ Passer ${RANGS[H.rang + 1].n}${H.niv < nivPourRang(H.rang + 1) ? `<br><small>il faut le niveau ${nivPourRang(H.rang + 1)}</small>` : ''}</button>${lireEtoiles().libres ? `<button class="fh-bt" onclick="fhVerse('${id}')">💠 Verser des éclats de Guilde</button>` : ''}${eclatsEnTrop(id) > 0 ? `<button class="fh-bt" onclick="fhConvertit('${id}')">🔹 Changer ${eclatsEnTrop(id)} éclat${eclatsEnTrop(id) > 1 ? 's' : ''} en trop en ${eclatsEnTrop(id) * ECLAT_POU} poussière</button>` : ''}</div>` : '<p>Rang maximum : légende de la Guilde !</p>'}
      <ul class="fh-bonus">${RANGS.map((R0, r) => { if (!r) return ''; const b = BONUS_RANG.find(x => x[0] === r); /* 16/11 soir (l'utilisateur : « Ascendant ★, ★★, ★★★★ sont où ? ») : TOUS les rangs, ceux sans bonus disent ce qu'ils ouvrent */ return `<li class="${H.rang >= r ? 'on' : ''}">${H.rang >= r ? '✅' : '🔒'} <b>${R0.n}</b> : ${b ? `${b[1]} ${b[2]} · ` : ''}niveau max ${R0.max}</li>`; }).join('')}</ul>
      <p style="color:#8a84b0;font-size:.82em;margin:6px 0 0">Les éclats de ${I.nom} se gagnent en jouant avec : élite 2, boss 5, Titan 5, étage 3… Les quêtes donnent des éclats de Guilde 💠, à verser sur qui tu veux.</p></div>
    <div class="fh-bts"><button class="fh-bt" onclick="fhCoffre('${id}')">${fhIco('coffre-heros', '🎒')} Le coffre (${avSac().pieces.length})</button><button class="fh-bt${groupesFusion().length ? ' fh-pret' : ''}" onclick="fhForge('${id}')">🔥 La Forge${groupesFusion().length ? ' · prête !' : ''}</button><button class="fh-bt" onclick="fhForgeron('${id}')">⚒ Le forgeron</button></div>
    ${typeof EQUIP !== 'undefined' && typeof equipHeros === 'function' ? fhReliques(id) : ''}
    ${fhBoutonZero(id)}`;
}
function fhReliques(id) {
  const D = lireEtoiles(), eq = equipHeros(id), pl = FH.choixRel;
  const arm = Object.keys(D.armurerie).filter(k => D.armurerie[k] && EQUIP[k] && (!pl || EQUIP[k][0] === pl));
  return `<div class="fh-bloc"><h4>🏺 Les reliques <small style="color:#c9c1ea;font-weight:normal">(Odyssée, Grande aventure, Crypte…)</small></h4>
    <p class="doux" style="font-size:.82em;color:#c9c1ea;margin:0 0 6px">Gardées de tes aventures : elles comptent contre les monstres dans l’Odyssée, la Grande aventure et le Tour des épreuves (et certaines aussi dans la Crypte, la Descente et la Fosse), jamais dans le Duel de l’Arène. Touche-en une pour tout savoir.</p>
    <div class="fh-rel">${Object.keys(RELIQUES_PL).map(p => `<button class="${pl === p ? 'sel' : ''}" onclick="${eq[p] ? `fhRelique('${id}','${p}')` : `FH.choixRel = FH.choixRel === '${p}' ? null : '${p}';FH.apres()`}"><small>${RELIQUES_PL[p]}</small>${eq[p] ? `${typeof eqImg === 'function' ? eqImg(eq[p], 34) : ''}<b>${EQUIP[eq[p]][2]} ${'★'.repeat(niveauEquip(eq[p]))}</b>` : '<br><span style="opacity:.4">vide</span>'}</button>`).join('')}</div>
    ${pl ? `<p class="doux" style="color:#c9c1ea;font-size:.85em">Touche une relique pour l’équiper.${eq[pl] ? ` <button class="fh-bt" style="min-width:0;flex:none;padding:4px 10px" onclick="equipeHeros('${id}','${pl}',null);FH.apres()">Retirer</button>` : ''}</p>
      <div class="fh-rel">${arm.length ? arm.map(k => `<button onclick="equipeHeros('${id}','${pl}','${k}');FH.choixRel=null;fhSon('tour-fusion');FH.apres()">${typeof eqImg === 'function' ? eqImg(k, 34) : ''}<b>${EQUIP[k][2]}</b><small>${fusionTxt(k)}</small></button>`).join('') : '<p class="doux">Aucune relique de ce genre : elles tombent des élites et des boss de l’Odyssée. 3 exemplaires = ★★, 5 = ★★★.</p>'}</div>` : ''}</div>`;
}
// 16/11 nuit : LES POUVOIRS (pouvoirs-heros.js) : un petit bloc ; tout se choisit sur la page pouvoirs.html (la page « build »)
function fhPouvoirs(id) {
  if (!classeDe(id)) return ''; const pts = pointsPouvoirs(id), g = pouvoirsDe(id, 'groupe'), s = pouvoirsDe(id, 'solo');
  const ligne = (o, t) => `<p style="margin:4px 0;font-size:.88em">${t} ${PW_EMP.map(E => `${o[E.k].def.e} ${o[E.k].def.n}${o[E.k].rang ? ` <b style="color:#f3c96b">★${o[E.k].rang}</b>` : ''}`).join(' · ')}</p>`;
  const ici = location.pathname.split('/').pop() + location.search;
  return `<div class="fh-bloc"><h4>🃏 Ses pouvoirs ${pts ? `<span style="float:right;color:#7dffb0">⬆ ${pts} point${pts > 1 ? 's' : ''} à placer</span>` : ''}</h4>
    ${ligne(g, '👥 Groupe :')}${ligne(s, '🗡 Solo :')}
    <a href="pouvoirs.html?h=${id}&retour=${encodeURIComponent(ici)}" style="display:block;margin-top:8px;padding:14px;border-radius:14px;background:#f3c96b;color:#2b1d0a;text-align:center;font-weight:bold;text-decoration:none;font-size:1.05em">🃏 Choisir ses pouvoirs (Garde, Pouvoir, Passif, Ultime)</a></div>`;
}
// ------------------------------------------------------------------------------------------------ les actions
function fhNiveau(id, n) { const f = monteNiveau(id, n); if (f) { fhSon('tour-fusion'); fhBulle(`⬆ Niveau ${niveauH(id)} !`); FH.apres(); const p = document.getElementById('fh-portrait'); if (p) p.classList.add('fh-monte'); } else fhBulle('Pas assez d’or ou de poussière'); }
function fhConvertit(id) { const n = eclatsEnTrop(id); if (!n) return;
  if (!confirm(`Changer ${n} éclat${n > 1 ? 's' : ''} en trop en ${n * ECLAT_POU} poussière de rune ?\nTu gardes ${COUT_NIV[etatH(id).rang] || 0} éclats pour le prochain rang.`)) return;
  const p = convertitEclats(id, n); if (p) { fhSon('choisir'); fhBulle(`🔹 +${p} poussière`); FH.apres(); } }
function fhRang(id) { if (promouvoir(id)) { fhSon('victoire'); fhBulle(`⭐ ${RANGS[niveauHeros(id)].n} !`); FH.apres(); const p = document.getElementById('fh-portrait'); if (p) p.classList.add('fh-monte'); } }
function fhVerse(id) { const h = etatH(id), d = lireEtoiles(), n = Math.min(d.libres, Math.max(1, COUT_NIV[h.rang] - h.e)); if (verseLibres(id, n)) { fhSon('magie'); fhBulle(`💠 ${n} éclats versés`); FH.apres(); } }
function fhPiece(p, actions) { const C = EQ_CASES.find(c => c.k === p.slot), por = porteurDe(p.id), I = por ? fhInfo(por) : null;
  return `<div class="fh-piece fh-r${p.r}"><span class="e">${C.e}</span><div><b style="color:${EQ_RARE[p.r].c}">${p.nom} <small style="display:inline">+${p.niv}/${eqNivMax(p)}</small></b><small>${C.n} ${EQ_RARE[p.r].n} · ${eqTexte(p)}</small>${I ? `<small><span style="display:inline-block;margin-top:3px;padding:1px 8px;border-radius:9px;background:#1f4d2e;color:#7dffb0;font-weight:bold">✅ Équipé par ${I.nom}</span></small>` : ''}</div><div class="act">${actions}</div></div>`; }
function fhCase(id, k) {
  const E = equipementDe(id), p = E[k], C = EQ_CASES.find(c => c.k === k), autres = avSac().pieces.filter(x => x.slot === k && x.id !== (p && p.id)).sort((a, b) => b.r - a.r || b.niv - a.niv);
  fhFen(`<h2>${C.e} ${C.n}</h2>
    ${p ? `<p class="doux">Porté (l’amélioration reste sur la case : changer de pièce ne fait rien perdre) :</p>${fhPiece(p, `${p.niv < eqNivMax(p) ? `<button onclick="fhAmelio('${id}','${k}','${p.id}')">⬆ ${eqPrixAmelio(p)} 🪙</button>` : '<small>max : fusionne</small>'}<button onclick="fhRetire('${id}','${k}')">Retirer</button>`)}
      ${p.niv < eqNivMax(p) ? `<p class="doux">Au niveau ${p.niv + 1} : ${eqTexte(Object.assign({}, p, { niv:p.niv + 1 }))}</p>` : ''}` : '<p class="doux">Rien dans cette case.</p>'}
    ${fhForgeCase(id, k)}
    <p class="doux" style="margin-top:10px">Dans le coffre :</p>
    ${autres.length ? autres.map(x => fhPiece(x, `<button onclick="fhEquipe('${id}','${x.id}')">Équiper</button>`) + fhNoteCase(id, x, p)).join('') : '<p class="doux">Aucune pièce de ce genre. Elles tombent des boss, des élites et des meubles des Chroniques ; le forgeron en vend.</p>'}
    <button class="fh-bt or" style="width:100%;margin-top:10px" onclick="fhFen('')">Fermer</button>`);
}
// 24/11 (choix de l'utilisateur) : des messages pour le « +N » : la CASE garde son niveau, la pièce posée le prend (jusqu'au maximum de sa rareté)
function fhNoteCase(id, x, porte) { const n = nivPorte(id, x), l = [];
  if (porte && x.nom === porte.nom && x.r === porte.r) l.push('🟰 Identique à celle portée');
  const plaf = lvCase(id, x.slot) > n ? ` ; la case est à +${lvCase(id, x.slot)}, mais sa rareté s’arrête à +${n} : fusionne pour aller plus haut` : '';
  if (n > x.niv) l.push(`ici, elle passerait <b>+${n}</b> (la case garde son niveau${plaf})`);
  else if (plaf) l.push(`ici, elle reste à <b>+${n}</b>${plaf}`);
  return l.length ? `<p class="doux" style="margin:-4px 0 8px 10px;font-size:.85em">↳ ${l.join(' · ')}</p>` : ''; }
function fhEquipe(id, pid) { const x = avSac().pieces.find(q => q.id === pid), avant = x ? x.niv : 0, r = equipePiece(id, pid);
  if (r === 'ok') { fhSon('tour-fusion'); const n = x ? nivPorte(id, Object.assign({}, x, { niv:avant })) : 0; fhBulle(n > avant ? `Équipé ! La case garde son niveau : +${n}` : 'Équipé !'); fhFen(''); FH.apres(); } else fhBulle(r); }
function fhRetire(id, k) { const p = equipementDe(id)[k]; retirePiece(id, k); fhFen(''); FH.apres(); if (p && p.niv > 1) fhBulle(`Retirée. La case garde son +${p.niv} pour la prochaine pièce ; ${p.nom} retourne au coffre en +1.`); }
function fhAmelio(id, k, pid) { const r = amelioPiece(pid); if (r === 'ok') { fhSon('tour-fusion'); fhBulle('⬆ Amélioré !'); FH.apres(); if (k) fhCase(id, k); else fhCoffre(id); } else fhBulle(r); }
// 21/11 (l'utilisateur : « un bouton vendre tout par rareté, blanc, bleu… comme dans beaucoup de jeux ») : on vend (or) ou on recycle (poussière)
// d'un coup toutes les pièces NON PORTÉES d'une rareté ; confirmation avec le total
function fhVenteLot(id) {
  const libres = avSac().pieces.filter(p => !porteurDe(p.id)); if (!libres.length) return '';
  const R = EQ_RARE.map((x, r) => [r, libres.filter(p => p.r === r)]).filter(([, l]) => l.length);
  return `<div class="fh-bloc"><h4>🧹 Vider le coffre par rareté <small style="display:inline;font-weight:normal">(pièces non portées)</small></h4>${R.map(([r, l]) => `<div style="display:flex;gap:6px;align-items:center;margin:4px 0;flex-wrap:wrap"><b style="color:${EQ_RARE[r].c};min-width:7em">${l.length} ${EQ_RARE[r].n}${l.length > 1 ? 's' : ''}</b><button class="fh-bt" onclick="fhLot('${id}',${r},'or')">Vendre : ${l.reduce((t, p) => t + eqPrixVente(p), 0)} 🪙</button><button class="fh-bt" onclick="fhLot('${id}',${r},'pou')">Recycler : ${l.reduce((t, p) => t + eqPoussiereRecyclage(p), 0)} 🔹</button></div>`).join('')}</div>`;
}
function fhLot(id, r, quoi) {
  const l = avSac().pieces.filter(p => !porteurDe(p.id) && p.r === r); if (!l.length) return;
  const tot = l.reduce((t, p) => t + (quoi === 'or' ? eqPrixVente(p) : eqPoussiereRecyclage(p)), 0);
  if (!confirm(`${quoi === 'or' ? 'Vendre' : 'Recycler'} les ${l.length} pièce${l.length > 1 ? 's' : ''} ${EQ_RARE[r].n}${l.length > 1 ? 's' : ''} non portée${l.length > 1 ? 's' : ''} pour ${tot} ${quoi === 'or' ? 'or' : 'poussière'} ?`)) return;
  l.forEach(p => quoi === 'or' ? vendPiece(p.id) : recyclePiece(p.id)); fhSon('choisir'); fhBulle(`${quoi === 'or' ? '🪙' : '🔹'} +${tot}`); fhCoffre(id); FH.apres();
}
function fhCoffre(id) {
  const s = avSac(), G = groupesFusion();
  fhFen(`<h2>🎒 Le coffre des héros</h2>${fhRess()}<p class="doux">Un seul coffre pour tous tes héros. Améliore avec l’or ; pour monter de rareté, passe par <b>la Forge</b> : <b>3 pièces de la même case et de la même rareté = 1 pièce de la rareté au-dessus</b>.</p>
    <button class="fh-bt${G.length ? ' fh-pret' : ''}" style="width:100%;margin:6px 0" onclick="fhForge('${id}')">🔥 La Forge${G.length ? ` · ${G.length} fusion${G.length > 1 ? 's' : ''} possible${G.length > 1 ? 's' : ''}` : ''}</button>
    ${fhVenteLot(id)}
    ${s.pieces.filter(p => !porteurDe(p.id)).sort((x, y) => y.r - x.r || y.niv - x.niv).map(p => fhPiece(p, `<button onclick="fhEquipe('${id}','${p.id}')">Équiper</button>${p.niv < eqNivMax(p) ? `<button onclick="fhAmelio('${id}',null,'${p.id}')">⬆ ${eqPrixAmelio(p)} 🪙</button>` : ''}<button onclick="if(confirm('Revendre pour ${eqPrixVente(p)} pièces ?')){vendPiece('${p.id}');fhCoffre('${id}');FH.apres()}">Vendre ${eqPrixVente(p)} 🪙</button><button onclick="if(confirm('Recycler en ${eqPoussiereRecyclage(p)} poussière de rune ?')){recyclePiece('${p.id}');fhCoffre('${id}');FH.apres()}">Recycler ${eqPoussiereRecyclage(p)} 🔹</button>`)).join('') || '<p class="doux">Le coffre est vide.</p>'}
    ${(() => { const P = s.pieces.filter(p => porteurDe(p.id)).sort((x, y) => y.r - x.r || y.niv - x.niv); // 17/11 (l'utilisateur : « un équipement porté devrait sortir du coffre ou dire équipé par ») : les pièces portées à part, en bas
      return P.length ? `<div class="fh-bloc"><h4>✅ Déjà équipées</h4>${P.map(p => fhPiece(p, p.niv < eqNivMax(p) ? `<button onclick="fhAmelio('${id}',null,'${p.id}')">⬆ ${eqPrixAmelio(p)} 🪙</button>` : '<small>max : fusionne</small>')).join('')}</div>` : ''; })()}
    <button class="fh-bt or" style="width:100%;margin-top:10px" onclick="fhFen('')">Fermer</button>`);
}
function fhFusion(id, slot, r) { const n = fusionnePiece(slot, r); if (n) { fhSon('victoire'); fhBulle(`⚒ ${n.nom} ${EQ_RARE[n.r].n} !`); FH.apres(); fhCoffre(id); } }
// ----------------------------------------------------------------------------------------------- LA FORGE (18/11, demande de l'utilisateur : « mettre des équipements pour un supérieur, comme ailleurs »)
// La fusion existait (3 pièces de la même case et de la même rareté → la rareté au-dessus) mais était cachée dans le coffre : la voici en vraie forge.
// On touche un groupe : ses 3 meilleures pièces vont sur l'enclume, l'aperçu montre le résultat, « 🔥 Forger » confirme (règle : montrer avant d'agir).
const FORGE = { sel:null };
const fhGroupes = () => { const G = {}; avSac().pieces.forEach(p => { if (p.r >= EQ_RARE.length - 1 || !EQ_CASES.some(c => c.k === p.slot)) return; const k = p.slot + ':' + p.r; (G[k] = G[k] || []).push(p); });
  return Object.values(G).map(g => g.sort((a, b) => b.niv - a.niv)).sort((a, b) => (b.length >= 3) - (a.length >= 3) || b[0].r - a[0].r || b.length - a.length); };
function fhForgeCase(id, k) { const C = EQ_CASES.find(c => c.k === k), G = fhGroupes().filter(g => g[0].slot === k);
  if (!G.length) return '';
  return `<div class="fh-bloc"><h4>🔥 La fusion</h4>${G.map(g => { const n = Math.min(3, g.length), R = EQ_RARE[g[0].r], R2 = EQ_RARE[g[0].r + 1];
    return `<p class="doux" style="margin:3px 0"><b style="color:${R.c}">${n}/3</b> pièces <span style="color:${R.c}">${R.n}s</span> pour une pièce <b style="color:${R2.c}">${R2.n}</b>${g.length >= 3 ? ` · <a href="#" onclick="FORGE.sel='${k}:${g[0].r}';fhForge('${id}');return false">forger ›</a>` : ''}</p>`; }).join('')}</div>`; }
function fhForge(id) {
  const G = fhGroupes(), prets = G.filter(g => g.length >= 3); let sel = prets.find(g => g[0].slot + ':' + g[0].r === FORGE.sel) || null;
  const pose = sel ? sel.slice(0, 3) : [];
  const caseE = p => { const C = EQ_CASES.find(c => c.k === p.slot); return `<div class="fg-place fh-r${p.r}"><span>${C.e}</span><small style="color:${EQ_RARE[p.r].c}">${p.nom}</small><small>+${p.niv}</small></div>`; };
  let apercu = '';
  if (sel) { const C = EQ_CASES.find(c => c.k === sel[0].slot), r2 = sel[0].r + 1, n = { slot:sel[0].slot, nom:sel[0].nom, r:r2, niv:Math.min(sel[0].niv, 5 * (sel[0].r + 2)) }, por = pose.map(p => porteurDe(p.id)).find(Boolean);
    apercu = `<div class="fg-fleche">⬇</div><div class="fh-piece fh-r${r2} fg-result"><span class="e">${C.e}</span><div><b style="color:${EQ_RARE[r2].c}">${n.nom} <small style="display:inline">+${n.niv}/${eqNivMax(n)}</small></b><small>${C.n} ${EQ_RARE[r2].n} · ${eqTexte(n)}</small>${por ? `<small>Reste équipée par ${fhInfo(por).nom}.</small>` : ''}</div></div>
      <p class="doux" style="text-align:center">Les 3 pièces de l’enclume disparaissent pour donner celle-ci. On garde le meilleur niveau.</p>
      <button class="fh-bt or" style="width:100%" onclick="fhForger('${id}')">🔥 Forger</button>`; }
  fhFen(`<h2>🔥 La fusion</h2><div style="text-align:center"><img src="ui/heros/pnj-forgeron.webp?v=1" alt="" style="width:22%;max-width:90px;border-radius:50%;border:2px solid #f3c96b;box-shadow:0 0 12px #f3a04a88" onerror="this.remove()"></div>
    <p class="doux" style="text-align:center">« Trois pièces de la même sorte et de la même couleur sur l’enclume, et j’en tire une meilleure. »<br><b>Commune → rare → épique → légendaire → mythique.</b></p>
    <div class="fg-enclume ${sel ? 'pleine' : ''}" id="fg-enclume">${[0, 1, 2].map(i => pose[i] ? caseE(pose[i]) : '<div class="fg-place vide">?</div>').join('')}</div>
    ${apercu || `<p class="doux" style="text-align:center">${prets.length ? 'Touche une fusion possible ci-dessous pour la poser sur l’enclume.' : 'Aucune fusion possible pour l’instant : il faut 3 pièces de la même case et de la même rareté.'}</p>`}
    ${G.length ? `<div class="fh-bloc"><h4>Tes pièces, par sorte</h4>${G.map(g => { const C = EQ_CASES.find(c => c.k === g[0].slot), R = EQ_RARE[g[0].r], R2 = EQ_RARE[g[0].r + 1], ok = g.length >= 3, k = g[0].slot + ':' + g[0].r;
      return `<div class="fh-piece fh-r${g[0].r} ${ok ? '' : 'fg-manque'} ${sel && k === FORGE.sel ? 'fg-sel' : ''}" ${ok ? `onclick="FORGE.sel='${k}';fhForge('${id}')" style="cursor:pointer"` : ''}><span class="e">${C.e}</span><div><b>${C.n} · <span style="color:${R.c}">${R.n}</span> · ${Math.min(g.length, 3)}/3</b><small>${ok ? `→ 1 pièce <b style="display:inline;color:${R2.c}">${R2.n}</b>${g.length >= 6 ? ` (de quoi en faire ${Math.floor(g.length / 3)})` : ''}` : `il en manque ${3 - g.length}`}</small></div>${ok ? '<div class="act"><button>Poser</button></div>' : ''}</div>`; }).join('')}</div>` : ''}
    <p class="doux">Les pièces tombent des boss, des élites et des meubles des Chroniques ; le forgeron en vend.</p>
    <button class="fh-bt" style="width:100%;margin-top:6px" onclick="FORGE.sel=null;fhFen('')">Fermer</button>`);
}
function fhForger(id) {
  const [slot, r] = String(FORGE.sel || '').split(':'); if (!slot) return;
  const E = document.getElementById('fg-enclume'); if (E) E.classList.add('frappe');
  fhSon('tour-fusion');
  setTimeout(() => { const n = fusionnePiece(slot, +r); FORGE.sel = null; if (!n) { fhBulle('Impossible : il faut 3 pièces pareilles'); fhForge(id); return; }
    fhSon('victoire'); FH.apres(); const C = EQ_CASES.find(c => c.k === n.slot);
    fhFen(`<h2>🔥 Forgé !</h2><div class="fg-eclat">${C.e}</div>${fhPiece(n, '')}<p class="doux" style="text-align:center">Nouvelle pièce <b style="color:${EQ_RARE[n.r].c}">${EQ_RARE[n.r].n}</b>, rangée dans le coffre.</p>
      ${(q => q && fhInfo(q) ? `<div style="margin:8px 0;padding:10px;border-radius:12px;border:1px solid #f3c96b88;background:#2a2412;text-align:center"><p style="margin:0 0 8px">${fhInfo(q).nom} portait une des pièces fondues : sa case ${C.n} est vide.<br><b>Veux-tu l’équiper maintenant ?</b></p><div style="display:flex;gap:8px"><button class="fh-bt or" style="flex:1" onclick="fhEquipeForge('${q}','${n.id}','${id}')">✅ Oui, sur ${fhInfo(q).nom}</button><button class="fh-bt" style="flex:1" onclick="fhForge('${id}')">Plus tard</button></div></div>`
        : `<div style="display:flex;gap:8px;margin-bottom:8px"><button class="fh-bt or" style="flex:1" onclick="fhEquipeForge('${id}','${n.id}','${id}')">✅ L’équiper sur ${fhInfo(id).nom}</button></div>`)(n.porteur)}
      <div style="display:flex;gap:8px"><button class="fh-bt" style="flex:1" onclick="fhForge('${id}')">🔥 Encore</button><button class="fh-bt" style="flex:1" onclick="fhFen('')">Fermer</button></div>`); }, 900);
}
function fhEquipeForge(h, pid, id) { const r = equipePiece(h, pid); if (r === 'ok') { fhSon('tour-fusion'); fhBulle(`Équipé sur ${fhInfo(h).nom} !`); FH.apres(); fhForge(id); } else fhBulle(r);
}
function fhForgeron(id) {
  const s = avSac(); let deja = {}; try { deja = JSON.parse(localStorage.getItem('guilde-forgeron-achats') || '{}'); } catch (e) {}
  fhFen(`<h2>⚒ Le forgeron</h2><div style="text-align:center"><img src="ui/heros/pnj-forgeron.webp?v=1" alt="" style="width:30%;max-width:130px;border-radius:50%;border:2px solid #f3c96b;box-shadow:0 0 12px #f3a04a88" onerror="this.remove()"></div><p class="doux" style="text-align:center">« Trois pièces aujourd’hui, pas une de plus. Demain, autre chose. » · 🪙 ${s.or}</p>
    ${forgeronStock(id).map((x, i) => deja[x.id] ? fhPiece(x, '<small>vendu</small>') : `<div onclick="fhCompare('${id}',${i})" style="cursor:pointer">${fhPiece(x, `<button>${x.prix} 🪙</button>`)}${fhStockTxt(x)}</div>`).join('')}
    <p class="doux" style="text-align:center;margin:6px 0 0">Touche une pièce pour la comparer à celle que porte ${fhInfo(id).nom}.</p>
    <button class="fh-bt or" style="width:100%;margin-top:10px" onclick="fhFen('')">Fermer</button>`);
}
// 22/11 (l'utilisateur : « quand je touche un équipement, j'aimerais un comparatif avec celui que j'ai déjà, pour savoir si ça vaut la peine ») :
// la pièce du forgeron face à celle que porte le héros sur la même case, ce qu'on gagne et ce qu'on perd, puis « Acheter » (rien n'est payé avant)
// 22/11 (l'utilisateur : « savoir combien j'ai de pièces bleues, violettes ou légendaires dans mon coffre, pour savoir s'il faut en acheter une pour fusionner ») :
// pour chaque pièce du forgeron, combien le coffre en a déjà de la même case ET de la même rareté (3 pareilles = une fusion)
const fhMemes = x => avSac().pieces.filter(p => p.slot === x.slot && p.r === x.r).length;
function fhStockTxt(x) { const n = fhMemes(x), C = EQ_CASES.find(c => c.k === x.slot), rr = EQ_RARE[x.r];
  const fin = x.r >= EQ_RARE.length - 1 ? '(rareté la plus haute : pas de fusion)' : n % 3 === 2 ? '<b style="color:#7dffb0">→ avec celle-ci : 3, de quoi fusionner !</b>' : `(encore ${3 - (n % 3)} pour une fusion${n >= 3 ? ' ; une fusion est déjà possible' : ''})`;
  return `<small style="display:block;margin:-4px 0 8px 14px;color:#c9c1ea">🎒 Dans ton coffre : <b style="color:${rr.c}">${n}</b> ${C.n.toLowerCase()} ${rr.n}${n > 1 ? 's' : ''} ${fin}</small>`; }
function fhCompare(id, i) {
  const x = forgeronStock(id)[i]; if (!x) return; const s = avSac(), cur = equipementDe(id)[x.slot], C = EQ_CASES.find(c => c.k === x.slot);
  const a = cur ? eqStats(cur) : {}, b = eqStats(x), cles = Object.keys(EQ_ST).filter(k => a[k] || b[k]);
  const lignes = cles.map(k => { const d = (b[k] || 0) - (a[k] || 0), nom = k === 'des' ? 'dé de plus' : EQ_ST[k][1];
    return `<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #2e2a55"><span>${EQ_ST[k][0]} ${nom}</span><span>${a[k] || 0} → <b>${b[k] || 0}</b> <b style="color:${d > 0 ? '#7dffb0' : d < 0 ? '#ff8a7a' : '#c9c1ea'}">${d > 0 ? '+' + d : d < 0 ? d : '='}</b></span></div>`; }).join('');
  const mieux = cles.reduce((t, k) => t + Math.sign((b[k] || 0) - (a[k] || 0)), 0);
  const verdict = !cur ? `✨ ${fhInfo(id).nom} n’a rien sur la case ${C.n} : tout est gagné.` : mieux > 0 ? '👍 Meilleure que ta pièce actuelle.' : mieux < 0 ? '👎 Moins bonne que ta pièce actuelle.' : '⚖️ Ni mieux ni moins bien : à toi de voir.';
  fhFen(`<h2>⚒ Comparer</h2><p class="doux" style="text-align:center;margin:0 0 6px">${C.e} ${C.n} de ${fhInfo(id).nom}</p>
    <p class="doux" style="margin:4px 0">Porté aujourd’hui :</p>${cur ? fhPiece(cur, '') : '<p class="doux" style="text-align:center">— rien —</p>'}
    <p class="doux" style="margin:8px 0 4px">Chez le forgeron :</p>${fhPiece(x, '')}${fhStockTxt(x)}
    <div style="margin:10px 0;padding:8px 12px;border-radius:12px;background:#14122a">${lignes}<p style="margin:8px 0 0;text-align:center"><b>${verdict}</b></p></div>
    <div style="display:flex;gap:8px"><button class="fh-bt" style="flex:1" onclick="fhForgeron('${id}')">‹ Retour</button><button class="fh-bt or" style="flex:2" ${s.or < x.prix ? 'disabled style="flex:2;opacity:.4"' : ''} onclick="fhAchete('${id}',${i})">Acheter · ${x.prix} 🪙</button></div>
    ${s.or < x.prix ? '<p class="doux" style="text-align:center">Pas assez d’or.</p>' : ''}<p class="doux" style="text-align:center;margin-top:6px">L’achat va dans le coffre ; on l’équipe ensuite dans la fiche du héros.</p>`);
}
function fhAchete(id, i) { const r = forgeronAchete(i, id); if (r === 'ok') { fhSon('tour-fusion'); fhBulle('Acheté : dans le coffre !'); FH.apres(); fhForgeron(id); } else fhBulle(r); }

// ----------------------------------------------------------------------------------------------- 19/11 : LE DÉ ET LES TALENTS D'UN HÉROS D'AVENTURE, sur place
// (l'utilisateur : « le bouton Son dé ouvre une autre page où tout est en bas : pas ergonomique ») : un bandeau dépliable sous « Ses pouvoirs ».
// Les TALENTS sont devenus des choix du PASSIF (pouvoirs-heros.js, PW_TALENTS) ; le bonus maximum par face monte avec le rang (aventuriers.js, avBonusMax).
function fhDe(a) {
  const ouvert = FH.deOuvert === a.id, pts = avPointsForge(a), max = avBonusMax(a), voie = a.voie;
  const pas = AV_PALIERS_DE.map(([r, n], i) => `${n} +${AV_BONUS_MAX + i + 1}`).slice(0, 4).join(', ');
  const o = typeof pouvoirsDe === 'function' ? pouvoirsDe(a.id, 'groupe') : null, P = o && o.passif.def;
  return `<div class="fh-bloc fh-debloc" id="fh-de"><h4 onclick="FH.deOuvert = FH.deOuvert === '${a.id}' ? null : '${a.id}';FH.apres();setTimeout(() => { const e = document.getElementById('fh-de'); if (e) e.scrollIntoView({ block:'start', behavior:'smooth' }); }, 60)" style="cursor:pointer">🎲 Son dé et ses talents ${pts ? `<span style="color:#7dffb0">· ⚒ ${pts} point${pts > 1 ? 's' : ''}</span>` : ''}<span style="float:right">${ouvert ? '▲' : '▼'}</span></h4>
    <div class="fh-de-mini">${[1, 2, 3, 4, 5, 6].map((v, k) => `<span><img src="faces-${voie}/face-${v}.webp" alt="${v}">${a.bonus[k] ? `<b>+${a.bonus[k]}</b>` : ''}</span>`).join('')}</div>
    ${ouvert ? `<p class="doux" style="font-size:.85em;color:#c9c1ea;margin:6px 0">⚒ Un <b>point de forge</b> tous les 5 niveaux du héros. Touche une face pour lui donner <b>+1</b> : elle garde son chiffre (pour les paires et les suites), le bonus compte pour frapper les sceaux « ≥ » et « Σ » des monstres (Chroniques et Crypte ; les monstres suivent la force de ton héros, dé forgé compris). <b>+${AV_BONUS_MAX} au plus par face</b>, puis un cran de plus à chaque grand rang : ${pas}, puis +1 par étoile d’Ascendant (jusqu’à +${AV_BONUS_MAX + AV_PALIERS_DE.length}). Aujourd’hui : <b>+${max} au plus</b>, <b style="color:#7dffb0">${pts}</b> point${pts > 1 ? 's' : ''} à placer.</p>
      <div class="fh-de">${[1, 2, 3, 4, 5, 6].map((v, k) => `<button class="${pts && a.bonus[k] < max ? 'peut' : ''}" onclick="fhForgeFace('${a.id}',${k})"><img src="faces-${voie}/face-${v}.webp" alt="${v}"><span>${a.bonus[k] ? '+' + a.bonus[k] : '·'}</span></button>`).join('')}</div>
      <p style="margin:10px 0 4px"><b style="color:#f3c96b">✨ Ses talents = son Passif</b></p>
      <p class="doux" style="font-size:.85em;color:#c9c1ea;margin:0 0 6px">Les talents de la Forge sont des choix de l’emplacement <b>♾ Passif</b> de ses pouvoirs (un seul actif à la fois, il monte avec les rangs du Passif). Passif aujourd’hui : <b>${P ? P.e + ' ' + P.n : '—'}</b>.</p>
      <ul class="fh-tal">${(typeof PW_TALENTS !== 'undefined' ? PW_TALENTS : []).map(T => { const ok = typeof versionOuverte === 'function' && versionOuverte(a.id, 'passif', T); return `<li class="${ok ? '' : 'lock'}">${ok ? '' : '🔒 '}<b>${T.e} ${T.n}</b>${ok ? '' : ` <small>(niveau ${T.niv})</small>`} : ${T.chron}</li>`; }).join('')}</ul>
      <a class="fh-bt or" style="display:block;text-align:center;text-decoration:none;margin-top:6px" href="pouvoirs.html?h=${a.id}&retour=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}">♾ Choisir son Passif (talents)</a>` : ''}</div>`;
}
function fhForgeFace(id, k) { const a = avTrouve(id); if (!a) return; const pts = avPointsForge(a), max = avBonusMax(a);
  if (!pts) return fhBulle('Pas de point de forge : un point tous les 5 niveaux'); if (a.bonus[k] >= max) return fhBulle(`Cette face est déjà à +${max} : monte de rang pour aller plus haut`);
  fhFen(`<h2>⚒ Forger la face ${k + 1}</h2><p>La face <b>${k + 1}</b> passe de <b>+${a.bonus[k]}</b> à <b>+${a.bonus[k] + 1}</b> (elle garde son chiffre ${k + 1}). Ça coûte 1 point de forge (il en reste ${pts}).</p>
    <div class="fh-bts"><button class="fh-bt" onclick="fhFen('')">Annuler</button><button class="fh-bt or" onclick="fhFen('');if(avForge('${id}',${k})){fhSon('tour-fusion');fhBulle('⚒ +1 !')}FH.apres()">⚒ Forger</button></div>`); }
// le bouton « Son dé » du haut : ouvre le bandeau et y descend
function fhVaAuDe(id) { FH.deOuvert = id; FH.apres(); setTimeout(() => { const e = document.getElementById('fh-de'); if (e) e.scrollIntoView({ block:'start', behavior:'smooth' }); }, 80); }

// ----------------------------------------------------------------------------------------------- 19/11 : UNE RELIQUE, EN CLAIR (l'utilisateur : « on ne sait ni ce qu'elle fait ni à quoi elle sert »)
// où chaque relique compte VRAIMENT (vérifié dans le code le 19/11) : aventure.js equipeCombat / recompenseCombat / ileAventure, odyssee.js, progression-modes.js bonusMode
const REL_PARTOUT = ['heaume', 'cuir', 'cotte', 'trefle']; // aussi lues par la Crypte, la Descente et la Fosse (bonusMode)
function fhRelique(id, pl) {
  const eq = equipHeros(id), k = eq[pl]; if (!k) return; const e = EQUIP[k], niv = niveauEquip(k), D = lireEtoiles(), nb = D.armurerie[k] || 0;
  const autres = Object.keys(D.armurerie).filter(x => D.armurerie[x] && EQUIP[x] && EQUIP[x][0] === pl && x !== k);
  const ou = REL_PARTOUT.includes(k) ? 'l’<b>Odyssée</b> (et sans fin, Route du Titan), la <b>Grande aventure</b>, le <b>Tour des épreuves</b>, et aussi la <b>Crypte</b>, la <b>Descente</b> et la <b>Fosse aux Runes</b>'
    : 'l’<b>Odyssée</b> (et sans fin, Route du Titan), la <b>Grande aventure</b> et le <b>Tour des épreuves</b>';
  const pas = REL_PARTOUT.includes(k) ? 'les Chroniques, l’Invasion, la Défense de la porte, les Expéditions et le Duel de l’Arène (équitable)' : 'la Crypte, la Descente, la Fosse, les Chroniques, l’Invasion, la Défense, les Expéditions et le Duel de l’Arène (équitable)';
  fhFen(`<h2>${typeof eqImg === 'function' ? eqImg(k, 40) : e[1]} ${e[2]} ${'★'.repeat(niv)}</h2><p class="doux" style="text-align:center">${RELIQUES_PL[pl]}</p>
    <p>✨ <b>Effet</b> (${'★'.repeat(niv)}) : ${descEquip(k, niv)}</p>
    <p>🗺 <b>Où elle compte</b> : ${ou}.<br>🚫 <b>Où elle ne compte pas</b> : ${pas}.</p>
    <p>★ <b>Les étoiles</b> : chaque exemplaire trouvé s’ajoute à ton armurerie (tu en as <b>${nb}</b>). 3 exemplaires = ★★, 5 = ★★★ : ${[1, 2, 3].map(n => `${'★'.repeat(n)} ${descEquip(k, n).replace(/\.$/, '')}`).join(' · ')}.</p>
    <p>🎁 <b>En gagner d’autres</b> : elles tombent des élites et des boss de l’Odyssée et de la Grande aventure, tous les 5 étages du Tour des épreuves, et parfois à la victoire dans la Crypte, la Descente, la Fosse et les Chroniques.</p>
    ${autres.length ? `<p><b>Changer</b> (gratuit) :</p><div class="fh-rel">${autres.map(x => `<button onclick="fhRelChange('${id}','${pl}','${x}')">${typeof eqImg === 'function' ? eqImg(x, 30) : EQUIP[x][1]}<b>${EQUIP[x][2]} ${'★'.repeat(niveauEquip(x))}</b></button>`).join('')}</div>` : '<p class="doux">Tu n’as pas d’autre relique pour cette case.</p>'}
    <div class="fh-bts"><button class="fh-bt" onclick="fhFen('');equipeHeros('${id}','${pl}',null);FH.apres()">Retirer</button><button class="fh-bt or" onclick="fhFen('')">Fermer</button></div>`);
}
function fhRelChange(id, pl, k) { const e = EQUIP[k];
  fhFen(`<h2>🏺 Mettre ${e[2]} ?</h2><p>${descEquip(k, niveauEquip(k))}</p><p class="doux">L’ancienne relique retourne dans ton armurerie (rien n’est perdu).</p>
    <div class="fh-bts"><button class="fh-bt" onclick="fhRelique('${id}','${pl}')">Annuler</button><button class="fh-bt or" onclick="equipeHeros('${id}','${pl}','${k}');fhSon('tour-fusion');fhFen('');FH.apres()">✓ Mettre</button></div>`); }

// ----------------------------------------------------------------------------------------------- 19/11 : REMETTRE À ZÉRO (heros-etoiles.js, remetAZero)
function fhBoutonZero(id) { if (typeof remetAZero !== 'function') return ''; const ok = zeroDispo();
  return `<div style="text-align:center;margin:26px 0 8px"><button class="fh-zero" ${ok ? `onclick="fhZero('${id}')"` : 'disabled'}>🔄 Remettre à zéro${ok ? '' : ' · demain'}</button><br><small style="color:#8a84b0">Gratuit, une fois par jour (tous héros confondus).</small></div>`; }
function fhZero(id) {
  const B = bilanZero(id), I = fhInfo(id); if (B.rien) return fhBulle('Ce héros est déjà au départ : rien à rendre');
  fhFen(`<h2>🔄 Remettre ${I.nom} à zéro ?</h2><p>${I.nom} repart <b>niveau 1, rang Commun</b> (aujourd’hui : niveau ${B.niv}, ${RANGS[B.rang].n}). Tu récupères <b>tout</b> :</p>
    <ul class="fh-bonus"><li class="on">🪙 <b>${B.or}</b> pièces d’or et 🔹 <b>${B.pou}</b> poussière de rune (les niveaux)</li><li class="on">💠 <b>${B.ec}</b> éclats de Guilde, à verser sur qui tu veux (les rangs)</li>
    <li class="on">🎒 ${B.pieces.length ? `<b>${B.pieces.length}</b> pièce${B.pieces.length > 1 ? 's' : ''} au coffre, avec leur niveau : ${B.pieces.map(p => `${p.nom} +${p.niv}`).join(', ')}` : 'aucune pièce portée'}</li>
    <li class="on">🃏 les points de pouvoirs (${B.rangsPw} rang${B.rangsPw > 1 ? 's' : ''} effacé${B.rangsPw > 1 ? 's' : ''}) ${I.av ? `et ⚒ les ${B.forge} point${B.forge > 1 ? 's' : ''} de forge du dé ; son Passif (talents) repasse à choisir` : ''}</li></ul>
    <p class="doux">Restent comme avant : ses <b>reliques</b>, ses éclats pas encore dépensés, tes trophées et l’XP du rang de la Guilde${I.av ? ` ; son nom, son apparence et son histoire` : ''}.</p>
    <p style="color:#ffb36a">Une seule remise à zéro par jour, tous héros confondus.</p>
    <div class="fh-bts"><button class="fh-bt" onclick="fhFen('')">Annuler</button><button class="fh-bt or" onclick="fhZeroOk('${id}')">🔄 Remettre à zéro</button></div>`);
}
function fhZeroOk(id) { const r = remetAZero(id); fhFen(''); if (r === 'ok') { fhSon('magie'); fhBulle('🔄 Remis à zéro : tout est rendu'); } else fhBulle(r); FH.apres(); }

// 28/11 (l'utilisateur : « mon portrait reste avec Zéphine partout » puis « j'aimerais que la capitaine soit partout ») : un héros d'aventure
// choisit son apparence : les 2 portraits de sa voie, ou un des 10 portraits du profil (a.img) ; son portrait change partout
const FH_AVATARS = [['01', 'La voyageuse', 'f'], ['02', 'Le forgeron', 'h'], ['03', 'L’archer elfe', 'h'], ['04', 'La cuisinière', 'f'], ['05', 'La mage des étoiles', 'f'], ['06', 'L’écuyer', 'h'], ['07', 'Le bricoleur', 'h'], ['08', 'Le nomade', 'h'], ['09', 'La capitaine', 'f'], ['10', 'La guerrière', 'f']];
function fhApparence(id) {
  const a = avTrouve(id); if (!a) return;
  const choix = [['h', null, `portraits/av-${a.voie}-h.webp`, 'Lui'], ['f', null, `portraits/av-${a.voie}-f.webp`, 'Elle']].concat(FH_AVATARS.map(([n, nom, g]) => [g, 'avatar-' + n, `portraits/avatar-${n}.webp?v=1`, nom]));
  const v = document.createElement('div'); v.className = 'fhapp-voile'; v.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#000c;display:flex;align-items:center;justify-content:center;padding:12px';
  v.innerHTML = `<div style="background:#1b1733;border:2px solid #f3c96b;border-radius:16px;padding:14px;max-width:420px;max-height:92vh;overflow:auto;text-align:center;color:#f1ecff"><h3 style="margin:0 0 6px;color:#f3c96b">🎭 L’apparence de ${a.nom}</h3>
    <p style="margin:0 0 10px;font-size:.9em">Touche un portrait : il change partout (combats, Chroniques, profil, amis). Niveaux, équipement et pouvoirs ne bougent pas.</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${choix.map(([g, img, src, nom], k) => { const on = (a.img || null) === img && (img || a.genre === g);
      return `<button style="background:${on ? '#3a2f10' : '#2a2550'};border:2px solid ${on ? '#f3c96b' : '#6a5fb0'};border-radius:12px;padding:6px;color:#f1ecff;font-family:inherit;font-size:.78em" onclick="avMaj('${id}', x => { x.genre = '${g}'; ${img ? `x.img = '${img}'` : 'delete x.img'}; });fhProfilSuit('${id}');location.reload()"><img src="${src}" style="width:100%;aspect-ratio:1;border-radius:50%;object-fit:cover"><br>${on ? '✔ ' : ''}${nom}</button>`; }).join('')}</div>
    <button style="margin-top:12px;background:#2a2550;color:#f1ecff;border:1px solid #6a5fb0;border-radius:10px;padding:10px 16px;font-family:inherit" onclick="this.closest('.fhapp-voile').remove()">Fermer</button></div>`;
  document.body.appendChild(v);
}
// 28/11 : le choix fait dans la fiche du héros devient aussi le portrait du profil (un seul choix, pas deux)
function fhProfilSuit(id) { try { const K = 'guilde-profil', p = JSON.parse(localStorage.getItem(K) || '{}'); p.portrait = 'av:' + id; localStorage.setItem(K, JSON.stringify(p)); } catch (e) {} }
