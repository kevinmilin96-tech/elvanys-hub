// =============================================================================================== LA DESCENTE (15/11 soir, écrans)
// Chargé par crypte.html : la carte des étages, le marchand, le feu de camp, les événements, les récompenses, l'entrée (breloque, pacte), la fin.
// Les combats utilisent l'écran de la Crypte (dessine() de crypte.html) avec la crypte DR.S.
const D = DESCENTE;
const CLE_D = 'guilde-descente', CLE_DP = 'guilde-descente-partie';
let DR = null, choixPacte = null, choixProf = 0;
// 15/11 soir : une image (si elle existe déjà : prompts.html) sinon l'émoji
const ico = (src, e, cl = 'ico') => `<img class="${cl}" src="${src}" alt="" onerror="this.outerHTML='${e}'">`;
const SALLE_IMG = ['combat', 'elite', 'marchand', 'feu', 'evenement', 'tresor', 'boss', 'enclume', 'defi']; // 25/11 : toutes les cases de la carte sont peintes
const icoObj = k => ico(`objets/objet-${k}.webp?v=6`, D.OBJETS[k].e), icoBrel = k => ico(`objets/brel-${k}.webp?v=3`, D.BRELOQUES[k].e), icoConso = k => ico(`objets/conso-${k}.webp?v=1`, C.CONSOS[k].e), icoPacte = k => ico(`objets/pacte-${k}.webp?v=1`, D.PACTES[k].e), icoComp = k => ico(`portraits/comp-${k}.webp?v=2`, C.COMPAGNONS[k].e, 'ico rond');
const lireD = () => { try { return Object.assign({ parties:0, victoires:0, meilleur:0, breloques:{}, equipee:null, etageMax:0 }, JSON.parse(localStorage.getItem(CLE_D) || '{}')); } catch (e) { return { parties:0, victoires:0, meilleur:0, breloques:{}, equipee:null, etageMax:0 }; } };
const ecrireD = d => { try { localStorage.setItem(CLE_D, JSON.stringify(d)); } catch (e) {} };
function sauveD() { try { if (DR && !DR.fin) localStorage.setItem(CLE_DP, JSON.stringify(DR)); else localStorage.removeItem(CLE_DP); } catch (e) {} }
function descenteGardee() { try { const p = JSON.parse(localStorage.getItem(CLE_DP) || 'null'); return p && !p.fin && p.heros ? p : null; } catch (e) { return null; } }
// ------------------------------------------------------------------ 15/11 soir : LA RENOMMÉE (gardée d'une partie à l'autre)
// Un joueur qui a déjà joué (parties, breloques ou descente en cours) commence au palier 3 : tout ce qui existait avant reste ouvert.
const CLE_REN = 'guilde-descente-renommee';
function ecrireRen(n) { try { localStorage.setItem(CLE_REN, String(Math.max(0, Math.round(n)))); } catch (e) {} }
function lireRen() {
  let v = null; try { v = localStorage.getItem(CLE_REN); } catch (e) {}
  if (v == null) { const E = lireD(); const ancien = E.parties > 0 || Object.keys(E.breloques || {}).some(k => E.breloques[k] > 0) || !!descenteGardee(); const n = ancien ? D.PALIERS[3].ren : 0; ecrireRen(n); return n; }
  return Math.max(0, parseInt(v, 10) || 0);
}
// petites étiquettes : famille (pastille de couleur) et rareté (gemme + mot)
const pastFam = k => { const f = D.OBJETS[k] && D.FAMILLES[D.OBJETS[k].f]; return f ? `<span class="fam" style="--f:${f.coul}">${f.e}</span>` : ''; };
const etiqObj = k => { const r = D.rarete(k), f = D.OBJETS[k] && D.FAMILLES[D.OBJETS[k].f]; return `<span class="etq"><span class="gem" style="--g:${r.coul}"></span>${r.n}${f ? ` · <span style="color:${f.coul}">${f.e} ${f.n}</span>` : ''}</span>`; };
// une confirmation : montre l'effet, attend « Valider » (règle du jeu : rien ne coûte au premier toucher)
function confirmeD(titre, texte, action) {
  window._confD = action;
  fenetre(`<h2>${titre}</h2><div style="text-align:center;margin:2cqw 0">${texte}</div>
    <button class="go" onclick="const f=window._confD;window._confD=null;fenetre('');if(f)f()">Valider</button>
    <button class="go" style="background:#221d42;color:var(--texte);border:1.5px solid #4b4580;margin-top:2cqw" onclick="window._confD=null;fenetre('')">Annuler</button>`);
}

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
  .sac span { background:#1d1934; border:1px solid #4b4580; border-radius:2cqw; padding:.6cqw 1.6cqw; font-size:3.2cqw; cursor:pointer; } .sac span small { font-size:2.6cqw; color:var(--doux); }
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
  .ico { width:1.25em; height:1.25em; object-fit:contain; vertical-align:middle; } .ico.rond { border-radius:50%; object-fit:cover; }
  .carteD { max-height:62vh; overflow:auto; border-radius:3cqw; background:radial-gradient(ellipse at 50% 0%, #3a2a1a, #14100c 80%), #14100c; border:1.5px solid #5a4a2a; padding:2cqw; }
  .carteD .pulse circle { animation:pulseC 1s ease-in-out infinite; } @keyframes pulseC { 50% { stroke-width:2.4; filter:drop-shadow(0 0 2px #7dffb0); } }
  .breloques { display:grid; grid-template-columns:repeat(2, 1fr); gap:2cqw; }
  .breloques button { border-radius:3cqw; padding:2cqw; border:1.5px solid #4b4580; background:#221d42; text-align:left; font-size:3cqw; }
  .breloques button.on { border-color:var(--or); background:#3a2f12; } .breloques button b { color:var(--or); display:block; font-size:3.4cqw; }
  /* 15/11 soir : familles, rareté, thème, renommée, forge */
  .fam { display:inline-flex; align-items:center; justify-content:center; width:1.5em; height:1.5em; border-radius:50%; font-size:.7em; background:color-mix(in srgb, var(--f) 30%, #120f22); border:1px solid var(--f); vertical-align:middle; margin-right:.3em; }
  .gem { display:inline-block; width:.7em; height:.7em; background:var(--g); transform:rotate(45deg); margin:0 .45em 0 .15em; box-shadow:0 0 .5em var(--g); vertical-align:middle; }
  .etq { display:block; font-size:2.7cqw; color:var(--doux); margin-top:.4cqw; }
  .famL { display:flex; flex-wrap:wrap; justify-content:center; gap:1.2cqw; margin:-1cqw 0 2cqw; font-size:3cqw; cursor:pointer; }
  .famL span { border-radius:2cqw; padding:.3cqw 1.6cqw; border:1px solid #3a3260; color:var(--doux); } .famL span.on { border-color:var(--f); color:var(--texte); background:color-mix(in srgb, var(--f) 22%, #120f22); }
  .themeB { border-radius:3cqw; padding:2cqw 3cqw; margin:0 0 2cqw; border:1.5px solid #6a5a8a; cursor:pointer; font-size:3.6cqw; } .themeB b { color:var(--or); } .themeB small { display:block; color:#e8e0ff; font-size:3cqw; margin-top:.6cqw; }
  .renB { display:block; width:100%; text-align:left; border-radius:3cqw; padding:2.2cqw 3cqw; border:1.5px solid #b98a2a; background:#2a2010; color:var(--texte); font-size:3.4cqw; margin:2cqw 0; }
  .renB b { color:var(--or); } .renB small { display:block; color:var(--doux); font-size:2.9cqw; }
  .barre { height:2.2cqw; border-radius:2cqw; background:#1a1630; overflow:hidden; margin:1cqw 0; } .barre i { display:block; height:100%; background:linear-gradient(90deg, #b98a2a, #f3c96b); }
  .paliers { text-align:left; font-size:3.1cqw; max-height:52vh; overflow:auto; } .paliers div { border-radius:2.4cqw; padding:1.6cqw 2.4cqw; margin:1.2cqw 0; border:1px solid #3a3260; background:#1a1630; }
  .paliers div.ok { border-color:#3a8a5a; background:#13261c; } .paliers div b { color:var(--or); }
  .patron { display:grid; grid-template-columns:repeat(3, 17cqw); grid-template-rows:repeat(4, 17cqw); gap:1.4cqw; justify-content:center; margin:3cqw 0; }
  .patron button { position:relative; padding:0; border-radius:2.4cqw; border:2px solid #4b4580; background:#1d1934; } .patron button img { width:100%; height:100%; object-fit:contain; display:block; }
  .patron button.sel { border-color:#7dffb0; box-shadow:0 0 2.4cqw #7dffb088; } .patron button.forge { border-color:var(--or); }
  .patron button .bad { position:absolute; right:-1.4cqw; top:-1.4cqw; background:#3a2f12; border:1px solid var(--or); border-radius:2cqw; padding:0 1cqw; font-size:3cqw; color:var(--or); }
  .optF { display:grid; grid-template-columns:1fr 1fr; gap:1.6cqw; } .optF button { border-radius:2.6cqw; padding:2cqw; border:1.5px solid #4b4580; background:#221d42; text-align:left; font-size:2.9cqw; color:var(--doux); }
  .optF button b { display:block; color:var(--texte); font-size:3.3cqw; } .optF button.on { border-color:#7dffb0; background:#163a2a; }
  `;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------------ l'entrée de la descente
function descenteAccueil() {
  DR = null; S = null; const E = lireD();
  choixH = haValide(choixH, ZEPH_OK()); // 15/11 soir : un héros d'aventure supprimé ou verrouillé → Maëlle
  const mesB = Object.keys(E.breloques).filter(k => E.breloques[k] > 0);
  $('jeu').innerHTML = `<div class="dsc">
    <div class="haut"><a href="#" onclick="S=null;DR=null;accueil();return false">‹ Retour</a><span class="titre"></span><button onclick="descenteRegles()">❓ Règles</button></div>
    <img src="menu-recu/mode-descente.webp?v=1" alt="" style="display:block;width:46%;max-width:220px;margin:6px auto 0;border-radius:14px;box-shadow:0 0 18px #ff9a4a55" onerror="this.remove()"><h1>🗺️ La Descente</h1>
    <p class="sous">Trois étages de cryptes : <b>des combats obligatoires</b> (combat ou élite, à toi de voir), des <b>haltes</b> au choix (marchand, feu de camp, événement, trésor), puis le boss de l’étage. Ta vie ne remonte presque pas toute seule !</p>
    ${(() => { const ren = lireRen(), i = D.palierDe(ren), P = D.PALIERS, suiv = P[i + 1];
      return `<button class="renB" onclick="descenteRenommee()">🏅 Renommée : <b>${ren}</b> · ${P[i].n}<small>${suiv ? `Prochain palier à ${suiv.ren} : de nouveaux trésors dans la réserve. Touche pour voir.` : 'Tous les paliers sont atteints ! Touche pour revoir.'}</small>${suiv ? `<div class="barre"><i style="width:${Math.round(100 * (ren - P[i].ren) / (suiv.ren - P[i].ren))}%"></i></div>` : ''}</button>`; })()}
    <div class="heros">${choixHerosHTML('descenteAccueil')}</div>
    <div class="pv-h">${haInfo(choixH) ? `⚔ <b>${haEsc(haInfo(choixH).nom)}</b>, ${haEsc(haInfo(choixH).titre)} · la voie de ${HER[vJ()].n}.<br>` : ''}⚡ <b>${C.POUVOIRS[vJ()].n}</b> : ${C.POUVOIRS[vJ()].d}<br>✨ ${texteBonus(pJ())}</div>
    <h3 style="color:var(--or);margin:3cqw 0 1.5cqw">🔮 Ta breloque <small style="color:var(--doux);font-weight:normal">(gagnées sur les boss, elles restent)</small></h3>
    ${mesB.length ? `<div class="breloques"><button class="${!E.equipee ? 'on' : ''}" onclick="equipe(null)"><b>Aucune</b>Descendre les mains vides.</button>${mesB.map(k => `<button class="${E.equipee === k ? 'on' : ''}" onclick="equipe('${k}')"><b>${icoBrel(k)} ${D.BRELOQUES[k].n}</b>${D.BRELOQUES[k].d}</button>`).join('')}</div>` : '<p class="pv-h">Pas encore de breloque : bats un boss d’étage pour en gagner une.</p>'}
    <h3 style="color:var(--or);margin:3cqw 0 1.5cqw">🩸 Un pacte ? <small style="color:var(--doux);font-weight:normal">(plus dur, plus de points)</small></h3>
    <div class="breloques"><button class="${!choixPacte ? 'on' : ''}" onclick="choixPacte=null;descenteAccueil()"><b>Pas de pacte</b>La descente normale.</button>${Object.entries(D.PACTES).map(([k, p]) => `<button class="${choixPacte === k ? 'on' : ''}" onclick="choixPacte='${k}';descenteAccueil()"><b>${icoPacte(k)} ${p.n}</b>${p.d} <i>Score ×${p.score}</i></button>`).join('')}</div>
    ${(E.profMax || 0) > 0 ? `<h3 style="color:var(--or);margin:3cqw 0 1.5cqw">🕳 Profondeur <small style="color:var(--doux);font-weight:normal">(une descente gagnée ouvre la suivante)</small></h3>
    <div class="etages">${Array.from({ length:Math.min(10, E.profMax) + 1 }, (_, p) => `<span class="${choixProf === p ? 'ici' : ''}" onclick="choixProf=${p};descenteAccueil()" style="cursor:pointer">${p}</span>`).join('')}</div>
    <p class="pv-h">${choixProf ? `Profondeur ${choixProf} · score ×${(1 + .1 * choixProf).toFixed(1)} :<br>${D.PROFONDEURS.slice(1, choixProf + 1).map((x, i) => `${i + 1}. ${x}`).join('<br>')}` : 'Profondeur 0 : la descente normale.'}</p>` : ''}
    <div class="choix">
      ${descenteGardee() ? `<button onclick="reprendDescente()" style="border-color:var(--ok);color:var(--ok);background:#163a2a">▶ Reprendre ta descente<small>${haEsc(herosS(descenteGardee()).nom)} · étage ${descenteGardee().etage} · ❤ ${descenteGardee().S ? descenteGardee().S.pv : descenteGardee().pv}</small></button><button onclick="if(confirm('Abandonner cette partie ? Elle sera effacée.')){try{localStorage.removeItem('guilde-descente-partie')}catch(e){};descenteAccueil()}" style="display:block;margin:0 auto;background:none;border:0;color:var(--doux);font-size:3cqw;text-decoration:underline;padding:1cqw;text-align:center">✕ abandonner cette partie</button>` : ''}
      <button onclick="lanceDescente(true)">🗓️ La descente du jour<small>${(r => `${r.e} Règle du jour : <b>${r.n}</b> (${r.d}) · `)(C.REGLES[C.regleDuJour('descente-' + jour())])}La même pour tout le monde aujourd’hui (toute la réserve est ouverte). ${(E.jours || {})[jour()] ? `Ton record du jour : ${E.jours[jour()].score} ${'★'.repeat(E.jours[jour()].etoiles)}${E.jours[jour()].etage ? ' · étage ' + E.jours[jour()].etage : ''}` : 'Pas encore tentée.'}${descenteGardee() ? ' (ta descente en cours sera abandonnée)' : ''}</small></button>
      <button class="b2" onclick="lanceDescente(false)">🗺️ Une descente au hasard<small>${descenteGardee() ? 'Attention : ta descente en cours sera abandonnée.' : '3 étages · 5 combats, 3 haltes et un boss par étage.'}</small></button>
    </div>
    <p class="record">Meilleur score : ${E.meilleur} · ${E.victoires} victoire${E.victoires > 1 ? 's' : ''} sur ${E.parties} · étage le plus profond : ${E.etageMax || '—'}</p>
  </div>`;
}
function equipe(k) { const E = lireD(); E.equipee = k; ecrireD(E); descenteAccueil(); }
function lanceDescente(duJ) {
  if (!rangeActive()) return;
  const E = lireD(); const L = lire(); L.heros = choixH; ecrire(L);
  // 15/11 soir : la descente du jour ouvre toute la réserve (renommée ignorée), pour qu'elle soit la même pour tout le monde
  // 15/11 soir : le moteur joue la VOIE (vJ) ; la progression vient du héros d'aventure (pJ) ; DR.av le garde dans la sauvegarde
  DR = D.nouvelle(vJ(), duJ ? 'descente-jour-' + jour() : 'descente-' + Date.now() + Math.random(), bonusMode(pJ()), { breloque:E.equipee, pacte:choixPacte, profondeur:choixProf, renommee:duJ ? null : lireRen() });
  DR.av = haInfo(choixH) ? haInfo(choixH).id : null;
  DR.duJour = !!duJ; if (duJ) DR.regle = C.regleDuJour('descente-' + jour());
  son('melange'); descenteEcran();
  if (!localStorage.getItem('guilde-descente-guide')) { localStorage.setItem('guilde-descente-guide', '1'); descenteRegles(); }
}
// 28/11 (l'utilisateur : « trois emplacements, si je veux jouer avec un autre perso ») : jusqu'à 3 DESCENTES EN COURS : la partie active
// (CLE_DP) + 2 rangées (CLE_DPR). Lancer une nouvelle descente range l'ancienne au lieu de l'effacer ; reprendre une rangée l'échange avec l'active.
const CLE_DPR = 'guilde-descente-rangees';
const descentesRangees = () => { try { const l = JSON.parse(localStorage.getItem(CLE_DPR) || '[]'); return Array.isArray(l) ? l.filter(p => p && !p.fin && p.heros) : []; } catch (e) { return []; } };
const ecrireRangees = l => { try { localStorage.setItem(CLE_DPR, JSON.stringify(l.slice(0, 2))); } catch (e) {} };
function rangeActive() { const g = descenteGardee(); if (!g) return true; const l = descentesRangees();
  if (l.length >= 2 && !confirm('Tu as déjà 3 descentes en cours. Lancer celle-ci efface la plus ancienne (' + haEsc(herosS(l[l.length - 1]).nom) + ', étage ' + l[l.length - 1].etage + '). On continue ?')) return false;
  l.unshift(g); ecrireRangees(l); try { localStorage.removeItem(CLE_DP); } catch (e) {} return true; }
function oublieRangee(k) { const l = descentesRangees(); l.splice(k, 1); ecrireRangees(l); }
function reprendDescente(k) {
  if (k != null) { const l = descentesRangees(), x = l[k]; if (!x) return; l.splice(k, 1); const g = descenteGardee(); if (g) l.unshift(g); ecrireRangees(l); try { localStorage.setItem(CLE_DP, JSON.stringify(x)); } catch (e) {} }
  DR = descenteGardee(); if (!DR) return; S = DR.S || null; sel = null; mode = null; descenteEcran(); }

// ------------------------------------------------------------------ l'écran selon l'étape
function descenteEcran() {
  sauveD();
  if (!DR) return descenteAccueil();
  if (DR.ecran === 'combat') { S = DR.S; S.des.forEach(d => d.neuf = true); C.visibles(S).forEach(c => c.neuve = true); sel = null; mode = null; return dessine(); }
  S = null;
  const tete = `<div class="haut"><a href="#" onclick="if(confirm('Quitter ? Ta descente est gardée, tu pourras la reprendre.')){DR=null;descenteAccueil()}return false">‹ Quitter</a><span class="titre">🗺️ Étage ${DR.etage} · salle ${Math.min(DR.pas + (DR.ecran === 'carte' ? 1 : 0), D.ETAPES + 1)}/${D.ETAPES + 1}</span><button onclick="descenteRegles()">❓</button></div>
    <div class="ressources"><span>❤ <b>${DR.pv}</b>/${DR.pvmax}</span><span>🪙 <b>${DR.or}</b></span>${DR.comp ? `<span>${icoComp(DR.comp.id)} <b>${DR.comp.pv}</b>/${C.COMPAGNONS[DR.comp.id].pv}</span>` : ''}${DR.breloque ? `<span>${icoBrel(DR.breloque)}</span>` : ''}${(DR.consos || []).length ? `<span>🎒 ${DR.consos.map(k => C.CONSOS[k].e).join('')}</span>` : ''}${DR.pacte ? `<span>${D.PACTES[DR.pacte].e}</span>` : ''}${DR.regle ? `<span onclick="bulle('${C.REGLES[DR.regle].n}')">${C.REGLES[DR.regle].e}</span>` : ''}${D.theme(DR) ? `<span onclick="infoTheme()" style="cursor:pointer">${D.theme(DR).e}</span>` : ''}${Object.keys(DR.forge || {}).length ? `<span onclick="infoForge()" style="cursor:pointer">⚒</span>` : ''}</div>
    ${sacHTML()}`;
  let corps = '';
  if (DR.ecran === 'carte') {
    // la carte à embranchements : des rangées de cases, les chemins entre elles ; les cases où l'on peut aller clignotent
    const Cm = DR.carte, rows = Cm ? Cm.rows : [], nR = rows.length, HH = 22 * (nR + 1) + 12;
    const Y = r => HH - 10 - r * 22, X = x => 8 + x * 84;
    const ICO = { combat:'⚔', elite:'★', marchand:'🛒', feu:'🔥', evenement:'❓', tresor:'💰', boss:'♛', enclume:'⚒', defi:'🏅' };
    const COUL = { combat:'#c9c1ea', elite:'#f3c96b', marchand:'#7dffb0', feu:'#ff9a4a', evenement:'#c084fc', tresor:'#ffd27a', enclume:'#9ad0ff', defi:'#ff6a8a' };
    const T = D.theme(DR);
    const vu = new Set((Cm ? Cm.chemin : []).map(([r, k]) => r + ',' + k)), peut = new Set((DR.choixIdx || []).map(k => DR.pas + ',' + k));
    let liens = '';
    rows.forEach((row, r) => row.forEach((n, k) => { if (r < nR - 1) n.next.forEach(k2 => { const fait = vu.has(r + ',' + k) && vu.has((r + 1) + ',' + k2);
      liens += `<line x1="${X(n.x)}" y1="${Y(r)}" x2="${X(rows[r + 1][k2].x)}" y2="${Y(r + 1)}" stroke="${fait ? '#f3c96b' : '#6a5a8a'}" stroke-width="${fait ? 1.4 : .7}" stroke-dasharray="${fait ? '' : '1.6 1.2'}"/>`; });
      else liens += `<line x1="${X(n.x)}" y1="${Y(r)}" x2="50" y2="${Y(nR)}" stroke="#6a5a8a" stroke-width=".6" stroke-dasharray="1.6 1.2"/>`; }));
    const cases = rows.map((row, r) => row.map((n, k) => { const ok = peut.has(r + ',' + k) && DR.choix[0] !== 'boss', fait = vu.has(r + ',' + k), ki = (DR.choixIdx || []).indexOf(k);
      return `<g ${ok ? `onclick="allerSalle(${ki})" style="cursor:pointer"` : ''} class="${ok ? 'pulse' : ''}"><circle cx="${X(n.x)}" cy="${Y(r)}" r="${ok ? 6.2 : 5.2}" fill="${fait ? '#3a2f12' : ok ? '#2a2448' : '#1a1630'}" stroke="${ok ? '#7dffb0' : fait ? '#f3c96b' : COUL[n.t]}" stroke-width="${ok ? 1.4 : .8}" opacity="${r < DR.pas && !fait ? .35 : 1}"/><text x="${X(n.x)}" y="${Y(r) + 2}" font-size="5.4" text-anchor="middle" opacity="${r < DR.pas && !fait ? .35 : 1}">${SALLE_IMG.includes(n.t) ? '' : ICO[n.t]}</text>${SALLE_IMG.includes(n.t) ? `<image href="ui/salle-${n.t}.webp?v=${n.t === 'enclume' || n.t === 'defi' ? 2 : 1}" x="${X(n.x) - 5}" y="${Y(r) - 5}" width="10" height="10" opacity="${r < DR.pas && !fait ? .35 : 1}" pointer-events="none"/>` : ''}</g>`; }).join('')).join('');
    const bossOk = DR.choix[0] === 'boss';
    const boss = `<g ${bossOk ? `onclick="allerSalle(0)" style="cursor:pointer" class="pulse"` : ''}><circle cx="50" cy="${Y(nR)}" r="8.5" fill="#3a1a12" stroke="${bossOk ? '#7dffb0' : '#ff7a4a'}" stroke-width="1.4"/><text x="50" y="${Y(nR) + 3}" font-size="8" text-anchor="middle">♛</text></g>`;
    // 15/11 soir : le thème de l'étage en bandeau (toucher = ses monstres, son boss, sa règle)
    const bandeau = T ? `<div class="themeB" style="background:linear-gradient(90deg, ${T.fond}, #14100c)" onclick="infoTheme()">${T.e} <b>Étage ${DR.etage} : ${T.n}</b><small>${T.regle.e} ${T.regle.n} : ${T.regle.d}</small></div>` : '';
    const dfTxt = k => { const df = DR.choixDefi && DR.choixDefi[k] && D.DEFIS[DR.choixDefi[k]]; return df ? `Défi : ${df.e} ${df.n}. ${df.d}` : D.SALLES.defi.d; };
    corps = `${bandeau}<p style="text-align:center;color:var(--doux);font-size:3.2cqw;margin:1cqw 0 2cqw">Touche une case qui clignote en vert. ⚔ combat · ★ élite · 🛒 marchand · 🔥 feu · ❓ événement · 💰 trésor · ⚒ forge · 🏅 défi · ♛ boss</p>
      <div class="carteD" id="carteD" ${T ? `style="background:radial-gradient(ellipse at 50% 0%, ${T.fond}, #14100c 85%)"` : ''}><svg viewBox="0 0 100 ${HH}" style="width:100%;display:block">${liens}${cases}${boss}</svg></div>
      ${DR.choix.length === 1 || bossOk ? '' : `<div class="salles" style="margin-top:3cqw">${DR.choix.map((t, k) => `<button class="${t === 'boss' ? 'boss' : ''}" onclick="allerSalle(${k})"><span class="e">${D.SALLES[t].e}</span><span><b>${D.SALLES[t].n}</b><small>${t === 'defi' ? dfTxt(k) : D.SALLES[t].d}</small></span></button>`).join('')}</div>`}
      ${bossOk ? `<div class="salles" style="margin-top:3cqw"><button class="boss" onclick="allerSalle(0)"><span class="e">♛</span><span><b>${D.SALLES.boss.n}${T ? ' : ' + T.boss[(DR.themeBoss || [])[DR.etage - 1] || 0][1] : ''}</b><small>${D.SALLES.boss.d}</small></span></button></div>` : ''}`;
  }
  if (DR.ecran === 'marchand') {
    const lig = x => x.t === 'objet' ? [icoObj(x.k), D.OBJETS[x.k].n, D.OBJETS[x.k].d] : x.t === 'comp' ? [icoComp(x.k), 'Compagnon : ' + C.COMPAGNONS[x.k].n, `${C.COMPAGNONS[x.k].pv} PV · ${C.COMPAGNONS[x.k].d}`] : x.t === 'reparer' ? ['🩹', 'Soigner ton compagnon', 'Sa vie redevient pleine.'] : x.t === 'conso' ? [icoConso(x.k), 'Consommable : ' + C.CONSOS[x.k].n, C.CONSOS[x.k].d + ' (dans ta poche, 3 au plus, à utiliser en combat)'] : ['🍖', `Un bon repas (+${x.n} PV)`, 'À volonté, tant que tu as de l’or.'];
    corps = `<div class="moust"><img src="ui/moustache.webp" alt=""><p>« Un marchand… dans une crypte ? Bon. Ne me demande pas d’où viennent ses objets. »</p></div>
      <div class="etal">${DR.salle.etal.map((x, i) => { const [e, n, d] = lig(x); return `<button class="${x.vendu ? 'vendu' : ''}" ${x.vendu || DR.or < x.prix ? 'disabled' : ''} onclick="acheteD(${i})"><span class="e">${e}</span><span><b>${n}</b><small>${d}</small>${x.t === 'objet' ? etiqObj(x.k) : ''}</span><span class="p">🪙 ${x.prix}</span></button>`; }).join('')}</div>
      <button class="grosbtn b2" ${DR.or < D.prixRelance(DR) ? 'disabled style="opacity:.4"' : ''} onclick="relanceEtalD()">🔄 Nouvel étal (🪙 ${D.prixRelance(DR)})<small style="display:block;font-weight:normal;font-size:2.9cqw;color:var(--doux)">Le marchand remballe et sort d’autres objets. Plus cher à chaque fois.</small></button>
      <button class="grosbtn" onclick="D.suite(DR);son('choisir');descenteEcran()">Continuer la descente ▶</button>`;
  }
  // 15/11 soir : la FORGE DES DÉS : les 6 faces du dé à plat (patron en croix), on en choisit une, puis ce qu'on lui fait
  if (DR.ecran === 'enclume') {
    const F = DR.forge || {}, fs = window._forgeSel || (window._forgeSel = { face:null, quoi:null });
    const POS = { 1:'1 / 2', 2:'2 / 1', 3:'2 / 2', 4:'2 / 3', 5:'3 / 2', 6:'4 / 2' };
    const badge = q => q === 'plus' ? '+1' : q ? C.COULEURS[q].e : '';
    const patron = [1, 2, 3, 4, 5, 6].map(f => `<button style="grid-area:${POS[f]}" class="${fs.face === f ? 'sel' : ''} ${F[f] ? 'forge' : ''}" onclick="forgeFace(${f})"><img src="faces-${DR.heros}/face-${f}.webp" alt="${f}" onerror="this.outerHTML='<b style=&quot;font-size:8cqw&quot;>${f}</b>'">${F[f] ? `<span class="bad">${badge(F[f])}</span>` : ''}</button>`).join('');
    let opts = '';
    if (fs.face && F[fs.face]) opts = `<p class="pv-h" style="text-align:center">Cette face est déjà forgée (${F[fs.face] === 'plus' ? `elle vaut ${fs.face + 1}` : C.COULEURS[F[fs.face]].n}). Choisis-en une autre.</p>`;
    else if (fs.face) opts = `<div class="optF">${D.FORGE_CHOIX.filter(q => !(q === 'plus' && fs.face >= 6)).map(q => `<button class="${fs.quoi === q ? 'on' : ''}" onclick="forgeQuoi('${q}')">${q === 'plus' ? `<b>➕ +1</b>Ce ${fs.face} vaudra ${fs.face + 1}.` : `<b>${C.COULEURS[q].e} ${C.COULEURS[q].n}</b>Ce ${fs.face} sera un ${C.COULEURS[q].n.toLowerCase()} : ${C.COULEURS[q].d}.`}</button>`).join('')}</div>`;
    corps = `<div class="moust"><img src="ui/moustache.webp" alt=""><p>« Une enclume ! Choisis une face de ton dé : je la renforce pour toute la descente. Une seule, hein. »</p></div>
      <div class="patron">${patron}</div>
      ${fs.face ? '' : '<p class="pv-h" style="text-align:center">Touche une face du dé.</p>'}${opts}
      <button class="grosbtn" ${fs.face && fs.quoi && !F[fs.face] ? '' : 'disabled style="opacity:.4"'} onclick="forgeValide()">Valider ⚒</button>
      <button class="grosbtn b2" onclick="confirmeD('⚒ Partir sans forger ?', 'La forge restera derrière toi.', () => { window._forgeSel = null; D.forger(DR, 0, null); descenteEcran(); })">Partir sans rien</button>`;
  }
  if (DR.ecran === 'feu') corps = `<div class="moust"><img src="ui/moustache.webp" alt=""><p>« Un feu ! Enfin. Je me mets là, tu ne bouges plus. »</p></div>
    <div class="salles">
      <button onclick="feuD(0)"><span class="e">😴</span><span><b>Se reposer</b><small>+${Math.round(DR.pvmax * .3)} PV (30 % de ta vie).</small></span></button>
      <button onclick="feuD(1)"><span class="e">⚔</span><span><b>S’entraîner</b><small>+4 PV max (et +4 PV).</small></span></button>
      ${DR.comp ? `<button onclick="feuD(2)"><span class="e">${C.COMPAGNONS[DR.comp.id].e}</span><span><b>Soigner ${C.COMPAGNONS[DR.comp.id].n}</b><small>Sa vie redevient pleine${DR.comp.pv <= 0 ? ' : il se relève !' : '.'}</small></span></button>` : ''}
    </div>`;
  if (DR.ecran === 'evenement') { const E = D.EVENEMENTS[DR.salle.ev];
    corps = `<img src="ui/evt/evt-${DR.salle.ev}.webp?v=1" alt="" style="display:block;width:42cqw;height:42cqw;object-fit:contain;margin:0 auto -1cqw" onerror="this.remove()"><h2 style="text-align:center;color:var(--or)">${E.n}</h2><p class="pv-h" style="font-size:3.4cqw">${E.t}</p>
      <div class="salles">${E.choix.map((c, k) => `<button ${c.si && !c.si(DR) ? 'disabled style="opacity:.35"' : ''} onclick="evenementD(${k})"><span class="e">▸</span><span><b>${c.n}</b></span></button>`).join('')}</div>`; }
  if (DR.ecran === 'recompense') {
    const r = DR.salle.recomp || [];
    const lig = x => x.t === 'or' ? ['🪙', `+${x.n} pièces d’or`, ''] : x.t === 'soin' ? ['❤', `+${x.n} PV`, ''] : x.t === 'objet' ? [icoObj(x.k), D.OBJETS[x.k].n, D.OBJETS[x.k].d + etiqObj(x.k)] : x.t === 'conso' ? [icoConso(x.k), 'Consommable : ' + C.CONSOS[x.k].n, C.CONSOS[x.k].d] : [icoBrel(x.k), 'Breloque : ' + D.BRELOQUES[x.k].n, D.BRELOQUES[x.k].d + ' (elle reste pour tes prochaines descentes)'];
    corps = `<p class="pv-h" style="font-size:3.6cqw;text-align:center">${DR.salle.texte || ''}</p>
      ${r.length ? `<h3 style="text-align:center;color:var(--or)">${DR.salle.type === 'boss' ? '♛ Choisis une breloque' : r.length > 1 ? 'Choisis ta récompense' : 'Ta récompense'}</h3>
      <div class="etal">${r.map((x, k) => { const [e, n, d] = lig(x); return `<button onclick="prendD(${k})"><span class="e">${e}</span><span><b>${n}</b><small>${d}</small></span><span class="p">Prendre</span></button>`; }).join('')}</div>` : ''}
      <button class="grosbtn ${r.length ? 'b2' : ''}" onclick="prendD(-1)">${r.length ? 'Ne rien prendre' : 'Continuer ▶'}</button>`;
  }
  if (DR.ecran === 'fin') return descenteFin();
  $('jeu').innerHTML = `<div class="dsc">${tete}${corps}</div>`;
  const cd = $('carteD'); if (cd) cd.scrollTop = cd.scrollHeight * Math.max(0, 1 - (DR.pas + 2.5) / (D.ETAPES + 1)) - cd.clientHeight / 2;
}
function sacHTML() {
  const o = Object.entries(DR.obj).filter(([k, n]) => n && D.OBJETS[k]);
  // 15/11 soir (l'utilisateur : « une description courte de ce que fait l'objet ») : icône + ce qu'il fait en quelques mots ; toucher = le détail
  // 15/11 soir : la pastille de FAMILLE devant chaque objet, et une ligne des familles (allumée quand le bonus marche) ; toucher = l'explication
  if (!o.length) return '';
  const n = D.familles(DR), fams = Object.keys(D.FAMILLES).filter(f => n[f] > 0);
  return `<div class="sac">${o.map(([k, q]) => `<span onclick="infoObjet('${k}')">${pastFam(k)}${icoObj(k)}${q > 1 ? '×' + q : ''} <small>${D.OBJETS[k].c || D.OBJETS[k].n}</small></span>`).join('')}</div>
    <div class="famL" onclick="infoFamilles()">${fams.map(f => `<span class="${n[f] >= 2 ? 'on' : ''}" style="--f:${D.FAMILLES[f].coul}">${D.FAMILLES[f].e} ${D.FAMILLES[f].n} ${n[f]}${n[f] >= 3 ? ' ✓✓' : n[f] >= 2 ? ' ✓' : ''}</span>`).join('')}</div>`;
}
function infoObjet(k) { const O = D.OBJETS[k], F = D.FAMILLES[O.f]; fenetre(`<h2>${icoObj(k)} ${O.n}</h2><p style="text-align:center">${O.d}</p><p style="text-align:center">${etiqObj(k)}</p>${F ? `<p style="text-align:center;color:var(--doux);font-size:.9em">Famille ${F.e} ${F.n} : 2 objets différents = ${F.d2} ; 3 = ${F.d3}.</p>` : ''}${DR && DR.obj[k] > 1 ? `<p style="text-align:center;color:var(--doux)">Tu en as ${DR.obj[k]} : l’effet s’additionne.</p>` : ''}<button class="go" onclick="fenetre('')">Compris</button>`); }
// 15/11 soir : l'explication des familles
function infoFamilles() {
  const n = DR ? D.familles(DR) : {};
  fenetre(`<h2>Les familles d’objets</h2><p style="text-align:center;color:var(--doux);font-size:.9em">Porte 2 objets <b>différents</b> d’une même famille : petit bonus. 3 : un bonus de plus.</p>
    <div class="paliers">${Object.entries(D.FAMILLES).map(([f, F]) => { const objs = Object.keys(D.OBJETS).filter(k => D.OBJETS[k].f === f);
      return `<div class="${(n[f] || 0) >= 2 ? 'ok' : ''}"><b style="color:${F.coul}">${F.e} ${F.n}</b> · tu en as ${n[f] || 0}<br>${objs.map(k => `${DR && DR.obj[k] > 0 ? '<b>' : ''}${D.OBJETS[k].e} ${D.OBJETS[k].n}${DR && DR.obj[k] > 0 ? '</b>' : ''}`).join(' · ')}<br>${(n[f] || 0) >= 2 ? '✓' : '2 :'} ${F.d2}<br>${(n[f] || 0) >= 3 ? '✓' : '3 :'} ${F.d3}</div>`; }).join('')}</div>
    <button class="go" onclick="fenetre('')">Compris</button>`);
}
// 15/11 soir : le thème de l'étage (ses monstres, son boss, sa règle)
function infoTheme() {
  const T = D.theme(DR); if (!T) return;
  const b = T.boss[(DR.themeBoss || [])[DR.etage - 1] || 0];
  const por = ([m, nom], w) => `<span style="display:inline-block;width:${w}cqw;text-align:center;font-size:2.6cqw;vertical-align:top"><img src="portraits/m-${m}.webp" alt="" style="width:${w}cqw;height:${w}cqw;object-fit:cover;border-radius:2cqw;display:block">${nom}</span>`;
  fenetre(`<h2>${T.e} ${T.n}</h2><p style="text-align:center"><b>${T.regle.e} ${T.regle.n}</b> : ${T.regle.d}</p>
    <p style="text-align:center;color:var(--or);margin:2cqw 0 1cqw">♛ Le boss de l’étage</p><div style="text-align:center">${por(b, 26)}</div>
    <p style="text-align:center;color:var(--doux);margin:2cqw 0 1cqw">Les monstres d’ici</p><div style="text-align:center;display:flex;flex-wrap:wrap;gap:1.4cqw;justify-content:center">${T.betes.concat(T.elites).map(x => por(x, 14)).join('')}</div>
    <button class="go" onclick="fenetre('')">Compris</button>`);
}
// 15/11 soir : la forge déjà faite (lecture seule)
function infoForge() {
  const F = DR.forge || {}, l = Object.keys(F).sort();
  fenetre(`<h2>⚒ Ton dé forgé</h2><p style="text-align:center">${l.map(f => F[f] === 'plus' ? `Face ${f} : vaut ${+f + 1}` : `Face ${f} : ${C.COULEURS[F[f]].e} ${C.COULEURS[F[f]].n}`).join('<br>') || 'Rien encore.'}</p><p style="text-align:center;color:var(--doux);font-size:.9em">Vaut pour tous tes dés, pendant toute la descente (pas pour ceux gardés dans la besace).</p><button class="go" onclick="fenetre('')">Compris</button>`);
}
function forgeFace(f) { window._forgeSel = { face:f, quoi:null }; son('choisir'); descenteEcran(); }
function forgeQuoi(q) { if (window._forgeSel) window._forgeSel.quoi = q; descenteEcran(); }
function forgeValide() {
  const fs = window._forgeSel; if (!fs || !fs.face || !fs.quoi) return;
  if (D.forger(DR, fs.face, fs.quoi)) { window._forgeSel = null; son('rune'); bulle(`⚒ Face ${fs.face} forgée !`); }
  descenteEcran();
}
// 15/11 soir : la descente, ce qu'elle a débloqué et ce qui vient
function descenteRenommee() {
  const ren = lireRen(), i = D.palierDe(ren), P = D.PALIERS;
  const contenu = p => [
    ...(p.obj || []).map(k => `${D.OBJETS[k].e} ${D.OBJETS[k].n}`), ...(p.comp || []).map(k => `${C.COMPAGNONS[k].e} ${C.COMPAGNONS[k].n} (compagnon)`),
    ...(p.salles || []).map(k => `${D.SALLES[k].e} ${D.SALLES[k].n} (salle)`), ...(p.themes || []).map(k => `${D.THEMES[k].e} ${D.THEMES[k].n} (étage)`),
    ...((p.ev || []).length ? [`❓ ${p.ev.length} événements`] : []), ...(p.plus ? [`★ ${p.plus}`] : []),
  ].join(' · ');
  fenetre(`<h2>🏅 Ta renommée : ${ren}</h2>
    <p style="text-align:center;color:var(--doux);font-size:.9em">Chaque descente en rapporte, même perdue : 5 par étage atteint, 5 par combat gagné, 20 par boss, 30 si tu remontes. Chaque palier ajoute des trésors à la réserve. (La descente du jour, elle, ouvre tout.)</p>
    ${P[i + 1] ? `<div class="barre"><i style="width:${Math.round(100 * (ren - P[i].ren) / (P[i + 1].ren - P[i].ren))}%"></i></div><p style="text-align:center;font-size:.9em">Encore <b>${P[i + 1].ren - ren}</b> pour « ${P[i + 1].n} »</p>` : ''}
    <div class="paliers">${P.map((p, k) => `<div class="${k <= i ? 'ok' : ''}">${k <= i ? '✓' : '🔒'} <b>${p.n}</b> <small>(${p.ren})</small><br>${contenu(p) || 'Ta première réserve.'}</div>`).join('')}</div>
    <button class="go" onclick="fenetre('')">Compris</button>`);
}
function allerSalle(k) {
  const t = DR.choix[k];
  // 15/11 soir : la salle du défi se confirme (la contrainte est rappelée)
  if (t === 'defi' && !allerSalle.ok) { const df = D.DEFIS[(DR.choixDefi || [])[k]]; return confirmeD('🏅 Salle du défi', `${df ? `<b>${df.e} ${df.n}</b><br>${df.d}<br><br>` : ''}Un combat un peu plus dur. Réussi : +15 or et un objet rare au choix. Raté (mais gagné) : 6 or.`, () => { allerSalle.ok = true; allerSalle(k); allerSalle.ok = false; }); }
  if (!D.choisir(DR, k)) return;
  son(t === 'boss' ? 'vague' : 'choisir');
  if (DR.ecran === 'combat') { bulle(t === 'defi' && D.DEFIS[DR.salle.defi] ? `🏅 ${D.DEFIS[DR.salle.defi].n}` : `${D.SALLES[t].e} ${D.SALLES[t].n}`); if (t === 'boss') try { GM.musique('boss'); } catch (e) {} }
  if (DR.ecran === 'enclume') window._forgeSel = null;
  descenteEcran();
}
// 15/11 soir : un achat se confirme (on voit ce qu'on prend et l'or qui restera)
function acheteD(i) {
  const x = DR.salle.etal[i]; if (!x) return;
  const nom = x.t === 'objet' ? `${D.OBJETS[x.k].e} ${D.OBJETS[x.k].n}` : x.t === 'comp' ? `${C.COMPAGNONS[x.k].e} ${C.COMPAGNONS[x.k].n}` : x.t === 'conso' ? `${C.CONSOS[x.k].e} ${C.CONSOS[x.k].n}` : x.t === 'reparer' ? '🩹 Soigner ton compagnon' : `🍖 Un bon repas`;
  const eff = x.t === 'objet' ? D.OBJETS[x.k].d : x.t === 'comp' ? `${C.COMPAGNONS[x.k].d}${DR.comp && DR.comp.pv > 0 ? ' (il remplace ton compagnon actuel)' : ''}` : x.t === 'conso' ? C.CONSOS[x.k].d : x.t === 'reparer' ? 'Sa vie redevient pleine.' : `+${x.n} PV (tu as ${DR.pv}/${DR.pvmax}).`;
  confirmeD(`Acheter ${nom} ?`, `${eff}<br><br>🪙 ${x.prix} · il te restera <b>${DR.or - x.prix}</b> or.`, () => {
    const r = D.acheter(DR, i); if (r === 'ok') { son('pioche'); bulle('Acheté !'); } else if (r && r.length > 3) { son('erreur'); bulle(r, true); } descenteEcran(); });
}
function relanceEtalD() {
  const p = D.prixRelance(DR);
  confirmeD('🔄 Un nouvel étal ?', `Le marchand range tout et sort d’autres objets.<br><br>🪙 ${p} · il te restera <b>${DR.or - p}</b> or.<br><small style="color:var(--doux)">La prochaine fois, ce sera plus cher.</small>`, () => {
    const r = D.relancerEtal(DR); if (r === 'ok') { son('melange'); bulle('Nouvel étal !'); } else { son('erreur'); bulle(r, true); } descenteEcran(); });
}
function feuD(k) { D.feu(DR, k); son('soin'); descenteEcran(); }
// 15/11 soir : un choix d'événement se confirme (certains coûtent de l'or ou des PV)
function evenementD(k) {
  const E = D.EVENEMENTS[DR.salle.ev], c = E && E.choix[k]; if (!c || (c.si && !c.si(DR))) return;
  confirmeD(`${E.e} Tu es sûr ?`, `Tu choisis : <b>${c.n}</b><br><small style="color:var(--doux)">❤ ${DR.pv}/${DR.pvmax} · 🪙 ${DR.or}</small>`, () => { const t = D.evenement(DR, k); if (t != null) son('magie'); descenteEcran(); });
}
function prendD(k) {
  const b = D.recompense(DR, k);
  if (b) { const E = lireD(); E.breloques[b] = (E.breloques[b] || 0) + 1; ecrireD(E); bulle(`${D.BRELOQUES[b].e} ${D.BRELOQUES[b].n} !`); son('rune'); }
  else if (k >= 0) son('pioche');
  descenteEcran();
}
// fin d'un combat de la descente (appelé par finPartie() de crypte.html)
function descenteFinCombat() {
  const gagne = S.fin === 'gagne', type = DR.salle.type;
  if (gagne) { son('victoire'); if (typeof guildeEvt === 'function') guildeEvt(type === 'boss' ? 'boss' : 'salle', 1, { heros:herosS(S).prog, voie:S.heros }); }
  D.apresCombat(DR); S = null;
  setTimeout(descenteEcran, gagne ? 500 : 900);
}
function descenteFin() {
  lireRen(); // (avant de compter la partie : un tout nouveau joueur ne doit pas être pris pour un ancien)
  const E = lireD(), gagne = DR.fin === 'gagne', et = D.etoiles(DR);
  E.parties++; if (gagne) E.victoires++; E.meilleur = Math.max(E.meilleur, DR.score); E.etageMax = Math.max(E.etageMax || 0, gagne ? 4 : DR.etage); if (gagne && (DR.prof || 0) >= (E.profMax || 0)) { E.profMax = Math.min(10, (DR.prof || 0) + 1); setTimeout(() => bulle(`🕳 Profondeur ${E.profMax} ouverte !`), 1200); }
  if (DR.duJour) { E.jours = E.jours || {}; const j = E.jours[jour()]; const sc = gagne ? DR.score : DR.etage * 100 + DR.pas * 10; if (!j || sc > j.score) E.jours[jour()] = { score:sc, etoiles:et, etage:gagne ? 0 : DR.etage }; }
  ecrireD(E);
  // 15/11 nuit : la Descente entière va aussi au carnet des parties (les combats y sont déjà, un par un, sous « Combat de la Descente »)
  if (!DR.journalEnvoye && typeof guildeJournal === 'function') { DR.journalEnvoye = true; guildeJournal('descente', { heros:DR.heros, resultat:DR.fin,
    journal:[...(DR.journal || []).slice().reverse(), `— Fin : étage ${DR.etage}, salle ${DR.pas}, or ${DR.or}, PV ${DR.pv}/${DR.pvmax}`, `Objets : ${Object.entries(DR.obj || {}).map(([k, n]) => n > 1 ? k + ' ×' + n : k).join(', ') || 'aucun'} · compagnon : ${DR.comp ? (DR.comp.id || DR.comp) : 'aucun'}`, `Breloque : ${DR.breloque || 'aucune'} · pacte : ${DR.pacte || 'aucun'} · profondeur ${DR.prof || 0} · combats ${DR.combats || 0}`],
    resume:{ score:DR.score, etage:DR.etage, etoiles:et, duJour:!!DR.duJour, profondeur:DR.prof || 0 } }); }
  // 15/11 soir : la renommée gagnée (comptée une seule fois, même si l'écran de fin se redessine)
  let renTxt = '';
  { const avant = lireRen(); if (DR.renGain == null) { DR.renGain = D.renommeeGagnee(DR); DR.renAvant = avant; ecrireRen(avant + DR.renGain); }
    const a = DR.renAvant, apres = a + DR.renGain, P = D.PALIERS, ia = D.palierDe(a), ib = D.palierDe(apres);
    renTxt = `<p class="pv-h" style="text-align:center;font-size:3.4cqw" onclick="descenteRenommee()">🏅 +${DR.renGain} renommée (total ${apres})${ib > ia ? `<br><b style="color:var(--or)">Nouveau palier : ${P[ib].n} !</b> De nouveaux trésors rejoignent la réserve (touche pour voir).` : P[ib + 1] ? `<br><small>Encore ${P[ib + 1].ren - apres} pour « ${P[ib + 1].n} ».</small>` : ''}</p>`; }
  let objet = null;
  if (gagne) { try { GM.jingle('victoire'); } catch (e) {} if (typeof gagneXP === 'function') gagneXP(150, 'Descente réussie'); objet = butinArmurerie(et, DR.score); }
  else { try { GM.jingle('defaite'); } catch (e) {} if (typeof gagneXP === 'function') gagneXP(20 * DR.etage, 'Descente'); }
  try { localStorage.removeItem(CLE_DP); } catch (e) {}
  $('jeu').innerHTML = `<div class="dsc"><div class="haut"><a href="#" onclick="DR=null;descenteAccueil();return false">‹ Entrée</a><span class="titre"></span></div>
    <h1>${gagne ? '🏆 Tu es remonté des profondeurs !' : '☠ La descente s’arrête ici…'}</h1>
    <p style="text-align:center;font-size:2em;margin:6px 0">${gagne ? '★'.repeat(et) + '☆'.repeat(3 - et) : ''}</p>
    <p class="pv-h" style="font-size:3.6cqw;text-align:center">${gagne ? `Les trois étages sont vaincus. Score : <b style="color:var(--or)">${DR.score}</b>` : `Tombé à l’étage ${DR.etage}, salle ${DR.pas}.`} · ${DR.combats} combats · 🪙 ${DR.or} or</p>
    ${sacHTML()}
    ${renTxt}
    ${gagne ? `<p style="text-align:center">✨ +150 XP de Guilde${objet ? ` · 🎒 <b>${objet}</b> rejoint ton armurerie` : ''}</p>` : '<p style="text-align:center;color:var(--doux)">Astuce : ta vie ne remonte pas toute seule. Les feux de camp et le marchand sont tes amis avant le boss.</p>'}
    <button class="grosbtn" onclick="DR=null;descenteAccueil()">Recommencer une descente</button>
    <button class="grosbtn b2" onclick="DR=null;S=null;accueil()">Retour à la Crypte</button></div>`;
}
function descenteRegles() {
  fenetre(`<h2>🗺️ La Descente</h2>
    <div class="moust"><img src="ui/moustache.webp" alt=""><p>« Trois étages, un boss à chaque fond d’étage. Et ta vie ne remonte pas toute seule. Choisis bien ton chemin. Miaou. »</p></div>
    <ol>
      <li><b>Les combats sont obligatoires</b> : 5 par étage. À chaque combat, tu choisis ⚔ <b>combat</b> ou ★ <b>élite</b> (plus dur, mais un objet rare au choix). Après deux combats, une <b>halte</b> : 🛒 marchand, 🔥 feu de camp, ❓ événement ou 💰 trésor (3 au choix). Puis le ♛ <b>boss</b> de l’étage.</li>
      <li><b>Les combats</b> sont des cryptes en plus petit (même règles : pose tes dés sur les sceaux). Une salle est gagnée quand ses colonnes sont vides.</li>
      <li><b>🪙 L’or</b> tombe des monstres : dépense-le chez le marchand. Les <b>objets</b> durent toute la descente.</li>
      <li><b>Dés de couleur</b> : de temps en temps un dé brille. Il sert comme un dé normal, OU pour son effet (bouton « Effet ») : ❤ rouge soigne de sa valeur, ⚡ bleu brise un sceau de ton pouvoir, 🔻 orange affaiblit le monstre le plus fort, 🛡 gris donne du bouclier.</li>
      <li><b>Compagnon</b> : il a sa vie, et sa compétence se charge avec des dés (comme ton pouvoir). Certains monstres le visent 🐾.</li>
      <li><b>👹 Le Maître des cryptes</b> : si un combat traîne (6 tours, 7 pour une élite, 9 pour un boss), tous les monstres prennent +1 de force à chaque tour. Joue vite !</li>
      <li><b>Monstres à règles</b> : lis leur pastille (🤝 meneur, 🌵 épines, ⛓ pas de 5 ni de 6, 🤐 silence, ⏰ horloge, 🐛 mue, 🪙 voleur, 🎯 point faible…).</li>
      <li><b>Familles</b> : chaque objet a une famille (🔥 Feu, 🪙 Or, 🛡 Garde, 🍀 Chance, ✦ Runes). 2 objets différents d’une famille = un bonus, 3 = un bonus de plus. La gemme dit s’il est commun ou rare.</li>
      <li><b>Thèmes</b> : chaque étage a son thème (Cendres, Glace, Forêt, Horlogerie…) : ses monstres, son boss et une règle en plus. Touche le bandeau de la carte.</li>
      <li><b>Salles rares</b> : ⚒ la <b>forge des dés</b> renforce une face de ton dé ; 🏅 la <b>salle du défi</b> est un combat avec une contrainte, et un gros butin si tu la respectes. Chez le marchand, 🔄 tu peux payer pour un nouvel étal.</li>
      <li><b>Renommée</b> : chaque descente en rapporte (même perdue). Les paliers ajoutent des objets, des compagnons, des salles et des étages à la réserve.</li>
      <li><b>Breloques</b> : chaque boss vaincu t’en offre une, au choix. Elles <b>restent</b> : tu en équipes une au début de la descente suivante. Les <b>pactes</b> rendent tout plus dur, mais multiplient le score.</li>
    </ol>
    <button class="go" onclick="fenetre('')">En route !</button>`);
}
