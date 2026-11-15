// =============================================================================================== LA DESCENTE (15/11 soir, écrans)
// Chargé par crypte.html : la carte des étages, le marchand, le feu de camp, les événements, les récompenses, l'entrée (breloque, pacte), la fin.
// Les combats utilisent l'écran de la Crypte (dessine() de crypte.html) avec la crypte DR.S.
const D = DESCENTE;
const CLE_D = 'guilde-descente', CLE_DP = 'guilde-descente-partie';
let DR = null, choixPacte = null;
const lireD = () => { try { return Object.assign({ parties:0, victoires:0, meilleur:0, breloques:{}, equipee:null, etageMax:0 }, JSON.parse(localStorage.getItem(CLE_D) || '{}')); } catch (e) { return { parties:0, victoires:0, meilleur:0, breloques:{}, equipee:null, etageMax:0 }; } };
const ecrireD = d => { try { localStorage.setItem(CLE_D, JSON.stringify(d)); } catch (e) {} };
function sauveD() { try { if (DR && !DR.fin) localStorage.setItem(CLE_DP, JSON.stringify(DR)); else localStorage.removeItem(CLE_DP); } catch (e) {} }
function descenteGardee() { try { const p = JSON.parse(localStorage.getItem(CLE_DP) || 'null'); return p && !p.fin && p.heros ? p : null; } catch (e) { return null; } }

(function () {
  const st = document.createElement('style');
  st.textContent = `
  .dsc h1 { text-align:center; color:var(--or); margin:3cqw 0 1cqw; font-size:7cqw; }
  .dsc .sous { text-align:center; color:var(--doux); font-size:3.4cqw; margin:0 3cqw 3cqw; }
  .etages { display:flex; justify-content:center; gap:1.4cqw; margin:2cqw 0; flex-wrap:wrap; }
  .etages span { min-width:7cqw; height:7cqw; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:3.4cqw; background:#221d42; border:1.5px solid #4b4580; color:var(--doux); }
  .etages span.fait { background:#163a2a; border-color:#3a8a5a; color:#7dffb0; } .etages span.ici { border-color:var(--or); color:var(--or); box-shadow:0 0 2cqw #f3c96b88; }
  .etages i { align-self:center; color:#4b4580; font-style:normal; }
  .salles { display:grid; gap:2.5cqw; margin:3cqw 0; }
  .salles button { display:grid; grid-template-columns:13cqw 1fr; gap:2cqw; align-items:center; text-align:left; border-radius:3.5cqw; padding:3cqw; border:2px solid #4b4580; background:#221d42; }
  .salles button .e { font-size:9cqw; text-align:center; } .salles button b { font-size:4.2cqw; color:var(--or); } .salles button small { display:block; color:var(--doux); font-size:3cqw; }
  .salles button.boss { border-color:#ff7a4a; background:#3a1a12; }
  .sac { display:flex; flex-wrap:wrap; gap:1.4cqw; justify-content:center; margin:2cqw 0; }
  .sac span { background:#1d1934; border:1px solid #4b4580; border-radius:2cqw; padding:.6cqw 1.6cqw; font-size:3.2cqw; }
  .ressources { display:flex; justify-content:space-around; font-size:3.8cqw; margin:2cqw 0; } .ressources b { color:var(--or); }
  .etal { display:grid; gap:2cqw; } .etal button { display:grid; grid-template-columns:10cqw 1fr auto; gap:2cqw; align-items:center; text-align:left; border-radius:3cqw; padding:2.4cqw; border:1.5px solid #4b4580; background:#221d42; }
  .etal button .e { font-size:7cqw; text-align:center; } .etal button b { color:var(--texte); font-size:3.6cqw; } .etal button small { display:block; color:var(--doux); font-size:2.9cqw; } .etal button .p { color:var(--or); font-weight:bold; font-size:3.8cqw; }
  .etal button:disabled { opacity:.35; } .etal button.vendu { opacity:.3; text-decoration:line-through; }
  .grosbtn { display:block; width:100%; border-radius:3.5cqw; padding:3cqw; font-size:4.2cqw; font-weight:bold; border:0; background:var(--or); color:#2b1d0a; margin-top:3cqw; }
  .grosbtn.b2 { background:#221d42; color:var(--texte); border:1.5px solid #4b4580; }
  .comp { display:grid; grid-template-columns:auto 1fr; gap:2cqw; align-items:center; background:#1a1630; border:1px solid #3a3260; border-radius:3cqw; padding:1.6cqw; margin-top:2cqw; }
  .comp .av { font-size:9cqw; text-align:center; position:relative; } .comp .av small { position:absolute; bottom:-1cqw; left:50%; transform:translateX(-50%); font-size:2.8cqw; background:#3a1010; border:1px solid var(--rouge); border-radius:2cqw; padding:0 1.2cqw; white-space:nowrap; }
  .comp b { color:var(--or); font-size:3.2cqw; } .comp p { margin:0 0 .6cqw; font-size:2.6cqw; color:var(--doux); } .comp .sceaux { padding:0; grid-template-columns:repeat(3, 1fr); }
  .comp.ko { opacity:.4; }
  .de.c-rouge img { filter:drop-shadow(0 0 1.6cqw #ff3a3a) drop-shadow(0 0 .6cqw #ff3a3a); } .de.c-bleu img { filter:drop-shadow(0 0 1.6cqw #3a8aff) drop-shadow(0 0 .6cqw #3a8aff); }
  .de.c-orange img { filter:drop-shadow(0 0 1.6cqw #ff9a2a) drop-shadow(0 0 .6cqw #ff9a2a); } .de.c-gris img { filter:drop-shadow(0 0 1.6cqw #cfd8e8) drop-shadow(0 0 .6cqw #cfd8e8); }
  .de .cc { position:absolute; bottom:-1.4cqw; left:50%; transform:translateX(-50%); font-size:3cqw; }
  .btn-effet { display:block; margin:0 auto 1.4cqw; border-radius:3cqw; padding:1.6cqw 3cqw; font-weight:bold; font-size:3.4cqw; border:1.5px solid var(--or); background:#3a2f12; color:var(--or); }
  .maitre { text-align:center; color:#ff9a7a; font-size:3cqw; margin:1cqw 0; }
  .objets-c { display:flex; flex-wrap:wrap; gap:1cqw; justify-content:center; margin:1.4cqw 0 0; font-size:3.6cqw; }
  .objets-c span { background:#1d1934; border:1px solid #3a3260; border-radius:1.6cqw; padding:.2cqw 1cqw; }
  .breloques { display:grid; grid-template-columns:repeat(2, 1fr); gap:2cqw; }
  .breloques button { border-radius:3cqw; padding:2cqw; border:1.5px solid #4b4580; background:#221d42; text-align:left; font-size:3cqw; }
  .breloques button.on { border-color:var(--or); background:#3a2f12; } .breloques button b { color:var(--or); display:block; font-size:3.4cqw; }
  `;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------------ l'entrée de la descente
function descenteAccueil() {
  DR = null; S = null; const E = lireD();
  if (choixH === 'zephine' && !ZEPH_OK()) choixH = 'maelle';
  const mesB = Object.keys(E.breloques).filter(k => E.breloques[k] > 0);
  $('jeu').innerHTML = `<div class="dsc">
    <div class="haut"><a href="#" onclick="S=null;DR=null;accueil();return false">‹ Crypte</a><span class="titre"></span><button onclick="descenteRegles()">❓ Règles</button></div>
    <h1>🗺️ La Descente</h1>
    <p class="sous">Trois étages de cryptes. À chaque étape, <b>tu choisis ta salle</b> : combat, élite, marchand, feu de camp, événement, trésor… puis le boss de l’étage. Ta vie ne remonte pas toute seule !</p>
    <div class="heros">${Object.entries(HER).map(([k, h]) => `<button class="${choixH === k ? 'on' : ''}" ${k === 'zephine' && !ZEPH_OK() ? 'disabled' : ''} onclick="choixH='${k}';descenteAccueil()"><img src="portraits/${k}.webp" alt="">${h.n}${k === 'zephine' && !ZEPH_OK() ? '<br>🔒 tutoriel' : ''}</button>`).join('')}</div>
    <div class="pv-h">⚡ <b>${C.POUVOIRS[choixH].n}</b> : ${C.POUVOIRS[choixH].d}<br>✨ ${texteBonus(choixH)}</div>
    <h3 style="color:var(--or);margin:3cqw 0 1.5cqw">🔮 Ta breloque <small style="color:var(--doux);font-weight:normal">(gagnées sur les boss, elles restent)</small></h3>
    ${mesB.length ? `<div class="breloques"><button class="${!E.equipee ? 'on' : ''}" onclick="equipe(null)"><b>Aucune</b>Descendre les mains vides.</button>${mesB.map(k => `<button class="${E.equipee === k ? 'on' : ''}" onclick="equipe('${k}')"><b>${D.BRELOQUES[k].e} ${D.BRELOQUES[k].n}</b>${D.BRELOQUES[k].d}</button>`).join('')}</div>` : '<p class="pv-h">Pas encore de breloque : bats un boss d’étage pour en gagner une.</p>'}
    <h3 style="color:var(--or);margin:3cqw 0 1.5cqw">🩸 Un pacte ? <small style="color:var(--doux);font-weight:normal">(plus dur, plus de points)</small></h3>
    <div class="breloques"><button class="${!choixPacte ? 'on' : ''}" onclick="choixPacte=null;descenteAccueil()"><b>Pas de pacte</b>La descente normale.</button>${Object.entries(D.PACTES).map(([k, p]) => `<button class="${choixPacte === k ? 'on' : ''}" onclick="choixPacte='${k}';descenteAccueil()"><b>${p.e} ${p.n}</b>${p.d} <i>Score ×${p.score}</i></button>`).join('')}</div>
    <div class="choix">
      ${descenteGardee() ? `<button onclick="reprendDescente()" style="border-color:var(--ok);color:var(--ok);background:#163a2a">▶ Reprendre ta descente<small>${HER[descenteGardee().heros].n} · étage ${descenteGardee().etage} · ❤ ${descenteGardee().S ? descenteGardee().S.pv : descenteGardee().pv}</small></button>` : ''}
      <button onclick="lanceDescente()">🗺️ Commencer la descente<small>${descenteGardee() ? 'Attention : ta descente en cours sera abandonnée.' : '3 étages · 6 salles + le boss par étage.'}</small></button>
    </div>
    <p class="record">Meilleur score : ${E.meilleur} · ${E.victoires} victoire${E.victoires > 1 ? 's' : ''} sur ${E.parties} · étage le plus profond : ${E.etageMax || '—'}</p>
  </div>`;
}
function equipe(k) { const E = lireD(); E.equipee = k; ecrireD(E); descenteAccueil(); }
function lanceDescente() {
  const E = lireD(); const L = lire(); L.heros = choixH; ecrire(L);
  DR = D.nouvelle(choixH, 'descente-' + Date.now() + Math.random(), bonusMode(choixH), { breloque:E.equipee, pacte:choixPacte });
  son('melange'); descenteEcran();
  if (!localStorage.getItem('guilde-descente-guide')) { localStorage.setItem('guilde-descente-guide', '1'); descenteRegles(); }
}
function reprendDescente() { DR = descenteGardee(); if (!DR) return; S = DR.S || null; sel = null; mode = null; descenteEcran(); }

// ------------------------------------------------------------------ l'écran selon l'étape
function descenteEcran() {
  sauveD();
  if (!DR) return descenteAccueil();
  if (DR.ecran === 'combat') { S = DR.S; S.des.forEach(d => d.neuf = true); C.visibles(S).forEach(c => c.neuve = true); sel = null; mode = null; return dessine(); }
  S = null;
  const tete = `<div class="haut"><a href="#" onclick="if(confirm('Quitter ? Ta descente est gardée, tu pourras la reprendre.')){DR=null;descenteAccueil()}return false">‹ Quitter</a><span class="titre">🗺️ Étage ${DR.etage} · salle ${Math.min(DR.pas + (DR.ecran === 'carte' ? 1 : 0), D.ETAPES + 1)}/${D.ETAPES + 1}</span><button onclick="descenteRegles()">❓</button></div>
    <div class="ressources"><span>❤ <b>${DR.pv}</b>/${DR.pvmax}</span><span>🪙 <b>${DR.or}</b></span>${DR.comp ? `<span>${C.COMPAGNONS[DR.comp.id].e} <b>${DR.comp.pv}</b>/${C.COMPAGNONS[DR.comp.id].pv}</span>` : ''}${DR.breloque ? `<span>${D.BRELOQUES[DR.breloque].e}</span>` : ''}${DR.pacte ? `<span>${D.PACTES[DR.pacte].e}</span>` : ''}</div>
    ${sacHTML()}`;
  let corps = '';
  if (DR.ecran === 'carte') {
    const pas = Array.from({ length:D.ETAPES + 1 }, (_, i) => `<span class="${i < DR.pas ? 'fait' : i === DR.pas ? 'ici' : ''}">${i < DR.pas ? (D.SALLES[DR.chemin[DR.chemin.length - DR.pas + i]] || { e:'✓' }).e : i === D.ETAPES ? '♛' : i + 1}</span>`).join('<i>›</i>');
    corps = `<div class="etages">${pas}</div><h3 style="text-align:center;color:var(--or);margin:3cqw 0 0">Où vas-tu ?</h3>
      <div class="salles">${DR.choix.map((t, k) => `<button class="${t === 'boss' ? 'boss' : ''}" onclick="allerSalle(${k})"><span class="e">${D.SALLES[t].e}</span><span><b>${D.SALLES[t].n}</b><small>${D.SALLES[t].d}</small></span></button>`).join('')}</div>`;
  }
  if (DR.ecran === 'marchand') {
    const lig = x => x.t === 'objet' ? [D.OBJETS[x.k].e, D.OBJETS[x.k].n, D.OBJETS[x.k].d] : x.t === 'comp' ? [C.COMPAGNONS[x.k].e, 'Compagnon : ' + C.COMPAGNONS[x.k].n, `${C.COMPAGNONS[x.k].pv} PV · ${C.COMPAGNONS[x.k].d}`] : x.t === 'reparer' ? ['🩹', 'Soigner ton compagnon', 'Sa vie redevient pleine.'] : ['🍖', `Un bon repas (+${x.n} PV)`, 'À volonté, tant que tu as de l’or.'];
    corps = `<div class="moust"><img src="ui/moustache.webp" alt=""><p>« Un marchand… dans une crypte ? Bon. Ne me demande pas d’où viennent ses objets. »</p></div>
      <div class="etal">${DR.salle.etal.map((x, i) => { const [e, n, d] = lig(x); return `<button class="${x.vendu ? 'vendu' : ''}" ${x.vendu || DR.or < x.prix ? 'disabled' : ''} onclick="acheteD(${i})"><span class="e">${e}</span><span><b>${n}</b><small>${d}</small></span><span class="p">🪙 ${x.prix}</span></button>`; }).join('')}</div>
      <button class="grosbtn" onclick="D.suite(DR);son('choisir');descenteEcran()">Continuer la descente ▶</button>`;
  }
  if (DR.ecran === 'feu') corps = `<div class="moust"><img src="ui/moustache.webp" alt=""><p>« Un feu ! Enfin. Je me mets là, tu ne bouges plus. »</p></div>
    <div class="salles">
      <button onclick="feuD(0)"><span class="e">😴</span><span><b>Se reposer</b><small>+${Math.round(DR.pvmax * .3)} PV (30 % de ta vie).</small></span></button>
      <button onclick="feuD(1)"><span class="e">⚔</span><span><b>S’entraîner</b><small>+4 PV max (et +4 PV).</small></span></button>
      ${DR.comp ? `<button onclick="feuD(2)"><span class="e">${C.COMPAGNONS[DR.comp.id].e}</span><span><b>Soigner ${C.COMPAGNONS[DR.comp.id].n}</b><small>Sa vie redevient pleine${DR.comp.pv <= 0 ? ' : il se relève !' : '.'}</small></span></button>` : ''}
    </div>`;
  if (DR.ecran === 'evenement') { const E = D.EVENEMENTS[DR.salle.ev];
    corps = `<h2 style="text-align:center;color:var(--or)">${E.e} ${E.n}</h2><p class="pv-h" style="font-size:3.4cqw">${E.t}</p>
      <div class="salles">${E.choix.map((c, k) => `<button ${c.si && !c.si(DR) ? 'disabled style="opacity:.35"' : ''} onclick="evenementD(${k})"><span class="e">▸</span><span><b>${c.n}</b></span></button>`).join('')}</div>`; }
  if (DR.ecran === 'recompense') {
    const r = DR.salle.recomp || [];
    const lig = x => x.t === 'or' ? ['🪙', `+${x.n} pièces d’or`, ''] : x.t === 'soin' ? ['❤', `+${x.n} PV`, ''] : x.t === 'objet' ? [D.OBJETS[x.k].e, D.OBJETS[x.k].n, D.OBJETS[x.k].d] : [D.BRELOQUES[x.k].e, 'Breloque : ' + D.BRELOQUES[x.k].n, D.BRELOQUES[x.k].d + ' (elle reste pour tes prochaines descentes)'];
    corps = `<p class="pv-h" style="font-size:3.6cqw;text-align:center">${DR.salle.texte || ''}</p>
      ${r.length ? `<h3 style="text-align:center;color:var(--or)">${DR.salle.type === 'boss' ? '♛ Choisis une breloque' : r.length > 1 ? 'Choisis ta récompense' : 'Ta récompense'}</h3>
      <div class="etal">${r.map((x, k) => { const [e, n, d] = lig(x); return `<button onclick="prendD(${k})"><span class="e">${e}</span><span><b>${n}</b><small>${d}</small></span><span class="p">Prendre</span></button>`; }).join('')}</div>` : ''}
      <button class="grosbtn ${r.length ? 'b2' : ''}" onclick="prendD(-1)">${r.length ? 'Ne rien prendre' : 'Continuer ▶'}</button>`;
  }
  if (DR.ecran === 'fin') return descenteFin();
  $('jeu').innerHTML = `<div class="dsc">${tete}${corps}</div>`;
}
function sacHTML() {
  const o = Object.entries(DR.obj).filter(([k, n]) => n && D.OBJETS[k]);
  return o.length ? `<div class="sac">${o.map(([k, n]) => `<span onclick="bulle('${D.OBJETS[k].n}')" title="${D.OBJETS[k].d}">${D.OBJETS[k].e}${n > 1 ? '×' + n : ''}</span>`).join('')}</div>` : '';
}
function allerSalle(k) {
  const t = DR.choix[k]; if (!D.choisir(DR, k)) return;
  son(t === 'boss' ? 'vague' : 'choisir');
  if (DR.ecran === 'combat') { bulle(`${D.SALLES[t].e} ${D.SALLES[t].n}`); if (t === 'boss') try { GM.musique('boss'); } catch (e) {} }
  descenteEcran();
}
function acheteD(i) { const r = D.acheter(DR, i); if (r === 'ok') { son('pioche'); bulle('Acheté !'); } else if (r && r.length > 3) { son('erreur'); bulle(r, true); } descenteEcran(); }
function feuD(k) { D.feu(DR, k); son('soin'); descenteEcran(); }
function evenementD(k) { const t = D.evenement(DR, k); if (t != null) son('magie'); descenteEcran(); }
function prendD(k) {
  const b = D.recompense(DR, k);
  if (b) { const E = lireD(); E.breloques[b] = (E.breloques[b] || 0) + 1; ecrireD(E); bulle(`${D.BRELOQUES[b].e} ${D.BRELOQUES[b].n} !`); son('rune'); }
  else if (k >= 0) son('pioche');
  descenteEcran();
}
// fin d'un combat de la descente (appelé par finPartie() de crypte.html)
function descenteFinCombat() {
  const gagne = S.fin === 'gagne', type = DR.salle.type;
  if (gagne) { son('victoire'); if (typeof guildeEvt === 'function') guildeEvt(type === 'boss' ? 'boss' : 'salle', 1, { heros:S.heros }); }
  D.apresCombat(DR); S = null;
  setTimeout(descenteEcran, gagne ? 500 : 900);
}
function descenteFin() {
  const E = lireD(), gagne = DR.fin === 'gagne', et = D.etoiles(DR);
  E.parties++; if (gagne) E.victoires++; E.meilleur = Math.max(E.meilleur, DR.score); E.etageMax = Math.max(E.etageMax || 0, gagne ? 4 : DR.etage); ecrireD(E);
  let objet = null;
  if (gagne) { try { GM.jingle('victoire'); } catch (e) {} if (typeof gagneXP === 'function') gagneXP(150, 'Descente réussie'); objet = butinArmurerie(et, DR.score); }
  else { try { GM.jingle('defaite'); } catch (e) {} if (typeof gagneXP === 'function') gagneXP(20 * DR.etage, 'Descente'); }
  try { localStorage.removeItem(CLE_DP); } catch (e) {}
  $('jeu').innerHTML = `<div class="dsc"><div class="haut"><a href="#" onclick="DR=null;descenteAccueil();return false">‹ Entrée</a><span class="titre"></span></div>
    <h1>${gagne ? '🏆 Tu es remonté des profondeurs !' : '☠ La descente s’arrête ici…'}</h1>
    <p style="text-align:center;font-size:2em;margin:6px 0">${gagne ? '★'.repeat(et) + '☆'.repeat(3 - et) : ''}</p>
    <p class="pv-h" style="font-size:3.6cqw;text-align:center">${gagne ? `Les trois étages sont vaincus. Score : <b style="color:var(--or)">${DR.score}</b>` : `Tombé à l’étage ${DR.etage}, salle ${DR.pas}.`} · ${DR.combats} combats · 🪙 ${DR.or} or</p>
    ${sacHTML()}
    ${gagne ? `<p style="text-align:center">✨ +150 XP de Guilde${objet ? ` · 🎒 <b>${objet}</b> rejoint ton armurerie` : ''}</p>` : '<p style="text-align:center;color:var(--doux)">Astuce : ta vie ne remonte pas toute seule. Les feux de camp et le marchand sont tes amis avant le boss.</p>'}
    <button class="grosbtn" onclick="DR=null;descenteAccueil()">Recommencer une descente</button>
    <button class="grosbtn b2" onclick="DR=null;S=null;accueil()">Retour à la Crypte</button></div>`;
}
function descenteRegles() {
  fenetre(`<h2>🗺️ La Descente</h2>
    <div class="moust"><img src="ui/moustache.webp" alt=""><p>« Trois étages, un boss à chaque fond d’étage. Et ta vie ne remonte pas toute seule. Choisis bien ton chemin. Miaou. »</p></div>
    <ol>
      <li><b>À chaque étape, choisis ta salle</b> parmi 2 ou 3 : ⚔ combat, ★ élite (plus dur, objet rare), 🛒 marchand, 🔥 feu de camp, ❓ événement, 💰 trésor. Au bout de 6 salles : le ♛ <b>boss</b> de l’étage.</li>
      <li><b>Les combats</b> sont des cryptes en plus petit (même règles : pose tes dés sur les sceaux). Une salle est gagnée quand ses colonnes sont vides.</li>
      <li><b>🪙 L’or</b> tombe des monstres : dépense-le chez le marchand. Les <b>objets</b> durent toute la descente.</li>
      <li><b>Dés de couleur</b> : de temps en temps un dé brille. Il sert comme un dé normal, OU pour son effet (bouton « Effet ») : ❤ rouge soigne de sa valeur, ⚡ bleu brise un sceau de ton pouvoir, 🔻 orange affaiblit le monstre le plus fort, 🛡 gris donne du bouclier.</li>
      <li><b>Compagnon</b> : il a sa vie, et sa compétence se charge avec des dés (comme ton pouvoir). Certains monstres le visent 🐾.</li>
      <li><b>👹 Le Maître des cryptes</b> : si un combat traîne (6 tours, 7 pour une élite, 9 pour un boss), tous les monstres prennent +1 de force à chaque tour. Joue vite !</li>
      <li><b>Monstres à règles</b> : lis leur pastille (🤝 meneur, 🌵 épines, ⛓ pas de 5 ni de 6, 🤐 silence, ⏰ horloge, 🐛 mue, 🪙 voleur, 🎯 point faible…).</li>
      <li><b>Breloques</b> : chaque boss vaincu t’en offre une, au choix. Elles <b>restent</b> : tu en équipes une au début de la descente suivante. Les <b>pactes</b> rendent tout plus dur, mais multiplient le score.</li>
    </ol>
    <button class="go" onclick="fenetre('')">En route !</button>`);
}
