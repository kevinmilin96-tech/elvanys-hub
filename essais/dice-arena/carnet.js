// 23/11 (l'utilisateur : « on a deux endroits : Aujourd'hui, quêtes du jour, quêtes de la semaine… il faut tout regrouper ») :
// LE CARNET DE LA GUILDE = un seul endroit, deux onglets : ☀ Aujourd'hui (les rendez-vous du jour + les 3 quêtes du jour, récupérées sur place)
// et 🗓️ Cette semaine (les 3 quêtes de la semaine, le Duel de la semaine, la Chasse au boss). Sur le menu, UN bandeau (le butin garde le sien, choix de l'utilisateur).
// 24/11 : POUR TOUS (d'abord en aperçu). menu.html?carnet=0 = l'ancien affichage sur ce téléphone, ?carnet=1 pour revenir au carnet.
(function () {
  const q = new URLSearchParams(location.search);
  // 25/11 : menu.html?ouvrir=carnet ouvre le carnet (tuile Quêtes, ancienne adresse route.html#quetes)
  if (q.get('ouvrir') === 'carnet') { try { sessionStorage.setItem('guilde-dans-mode', '1'); } catch (e) {} history.replaceState(null, '', location.pathname + location.hash); addEventListener('load', () => setTimeout(() => { if (typeof carnetOuvre === 'function') carnetOuvre(); }, 300)); }
  try { if (q.get('carnet') === '1') localStorage.setItem('guilde-carnet-apercu', '1'); if (q.get('carnet') === '0') localStorage.setItem('guilde-carnet-apercu', 'non'); } catch (e) {}
  // 24/11 : l'aperçu avait la clé « guilde-carnet », déjà prise par le journal des parties (musique.js) : il l'écrasait et le profil restait vide
  try { if (localStorage.getItem('guilde-carnet') === '1') { localStorage.setItem('guilde-carnet-apercu', '1'); localStorage.removeItem('guilde-carnet'); } } catch (e) {}
  window.CARNET = localStorage.getItem('guilde-carnet-apercu') !== 'non'; // 24/11 ~20 h : le carnet est POUR TOUS (accord de l'utilisateur) ; ?carnet=0 = l'ancien affichage, ce téléphone seulement
  // 24/11 : sans le carnet (joueurs hors aperçu), les récompenses des flashs et de l'énigme ne restent pas bloquées : elles sont données à l'ouverture du menu
  if (!window.CARNET) { try { const J = c => { try { return JSON.parse(localStorage.getItem(c) || 'null') || {}; } catch (e) { return {}; } };
    const jl = typeof envJourLocal === 'function' ? envJourLocal() : null, ju = typeof envJourUTC === 'function' ? envJourUTC() : jl; let xp = 0, or = 0;
    [['guilde-crypte', o => o.flash], ['guilde-expedition4-meta', o => o.flash], ['guilde-eclair', o => o], ['guilde-enigmes', o => o]].forEach(([cle, acc]) => {
      const o = J(cle), m = acc(o) || {}; let chg = false;
      Object.keys(m).forEach(k => { const f = m[k]; if (f && f.rec && f.recup === false) { f.recup = true; xp += f.rec.xp | 0; or += f.rec.or | 0; chg = true; } });
      if (chg) localStorage.setItem(cle, JSON.stringify(o)); });
    if (xp && typeof gagneXP === 'function') gagneXP(xp, 'Rendez-vous du jour'); if (or && typeof donneRessources === 'function') donneRessources(or, 0);
    if ((xp || or) && typeof annonceRang === 'function') setTimeout(() => annonceRang(`🎁 Rendez-vous du jour : +${xp} XP${or ? ` · 🪙 +${or}` : ''}`, true), 1500);
  } catch (e) {} }
  if (!window.CARNET || typeof envieRendezVous !== 'function') return;

  const st = document.createElement('style');
  st.textContent = `
  .bandeau-quetes { display:none !important; }
  /* 23/11 (l'utilisateur : « bizarre de passer de l'un à l'autre et voir le menu descendre plus petit ») : le carnet garde TOUJOURS la même hauteur */
  #env-auj .boite { height:88vh; height:88dvh; max-height:none; }
  #env-auj .ongl { display:flex; gap:6px; margin:0 0 10px; } #env-auj .ongl button { flex:1; border:1px solid #6b5fb0; background:#1d1838; color:#d9d0ff; border-radius:12px; padding:9px 4px; font:bold 14px Georgia, serif; }
  #env-auj .ongl button.on { background:linear-gradient(#f3c96b, #d99a2b); color:#2a1a00; border-color:#f3c96b; }
  #env-auj .ongl button i { font-style:normal; font-size:11px; margin-left:4px; opacity:.85; }
  #env-auj .qt { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:#1d1838; border:1px solid #4b4580; border-radius:12px; padding:9px 10px; margin-bottom:6px; color:#f1ecff; font:14px Georgia, serif; box-sizing:border-box; }
  #env-auj .qt.fait { background:#133024; border-color:#2fbf47; } #env-auj .qt .e { font-size:20px; } #env-auj .qt .t { flex:1; min-width:0; } #env-auj .qt .t small { display:block; color:#b9b1e0; font-size:12px; }
  #env-auj .qt .barre { height:5px; background:#0d0b1f; border-radius:3px; margin-top:4px; overflow:hidden; } #env-auj .qt .barre i { display:block; height:100%; background:linear-gradient(90deg, #c78a2c, #f3c96b); }
  #env-auj .qt .rec, #env-auj .liste .rec { border:0; border-radius:10px; padding:7px 10px; font:bold 13px Georgia, serif; background:linear-gradient(#7dff8a, #2fbf47); color:#0b3a12; white-space:nowrap; animation:halo 1s ease-in-out infinite alternate; }
  #env-auj .qt .ok { color:#7ff0a8; font-size:18px; }`;
  document.head.appendChild(st);

  // les quêtes (rang.js) : une ligne = le texte, la barre, ce qu'elle rapporte, et « Récupérer » sur place
  const quetesHTML = jour => {
    if (typeof lireQuetes !== 'function') return '';
    const Q = lireQuetes(), L = jour === 'z' ? Q.z || [] : jour ? Q.j : Q.s, g = (typeof GAIN_QUETE !== 'undefined' && GAIN_QUETE[jour === 'z' ? 'saison' : jour ? 'jour' : 'semaine']) || {};
    return L.map((qq, i) => { const def = defQuete(qq, jour) || ['', '', '', 1], va = !qq.fait && typeof QUETE_VA !== 'undefined' && QUETE_VA[def[2]], aRec = qq.fait && qq.recup === false;
      return `<div class="qt ${qq.fait && !aRec ? 'fait' : ''}"${va ? ` onclick="envieVa('${va}')" style="cursor:pointer"` : ''}><span class="e">${qq.fait ? '✅' : jour === 'z' ? '❄' : '📜'}</span><span class="t"><b>${texteQuete(qq, jour).replace(/^❄ /, '')}</b>
        <small>${qq.prog || 0} / ${def[3]} · ${qq.fait && !aRec ? '<b style="color:#7ff0a8">récompense déjà récupérée</b>' : `+${g.xp || 0} XP${g.or ? ` · 🪙 ${g.or}` : ''}`}</small><span class="barre"><i style="width:${Math.min(100, Math.round((qq.prog || 0) / def[3] * 100))}%"></i></span></span>
        ${aRec ? `<button class="rec" onclick="event.stopPropagation();carnetRecup(${jour === 'z' ? "'z'" : jour}, ${i})">🎁 Récupérer</button>` : qq.fait ? '<span class="ok">✓</span>' : '<span class="ok" style="color:#f3c96b">›</span>'}</div>`; }).join('');
  };
  window.carnetRecup = (jour, i) => { const g = typeof recupQuete === 'function' && recupQuete(jour === 'z' ? 'z' : !!jour, i);
    if (g && typeof annonceRang === 'function') annonceRang(`🎁 Quête récupérée : +${g.xp} XP${g.or ? ` · 🪙 +${g.or}` : ''}`, true);
    if (typeof GM !== 'undefined') try { GM.son('pieces'); } catch (e) {} carnetOuvre(jour === true ? 'jour' : 'semaine'); envieBandeau(); };

  // 24/11 (l'utilisateur : « récupérer les récompenses directement dans cette fenêtre avec le bouton cadeau ») : le butin se ramasse sur place
  // 24/11 : après les 3 ramassages de la quête, le bouton ne revient que pour au moins une heure de butin (pas pour 3 pièces)
  const butinDispo = () => { if (typeof butinCalcule !== 'function') return false; const g = butinCalcule(), n = typeof butinFois === 'function' ? butinFois() : 0;
    return (g.xp >= 1 || g.eclats >= 1 || g.or >= 1) && (n < 3 || g.h >= 1); };
  window.carnetButin = () => { const g = typeof butinRamasse === 'function' ? butinRamasse() : null;
    try { localStorage.setItem('guilde-butin-jour', envJourLocal()); } catch (e) {} if (typeof GM !== 'undefined') GM.son('choisir');
    if (g && typeof annonceRang === 'function') annonceRang(`🎁 Butin ramassé${g.or ? ` · 🪙 +${g.or}` : ''}${g.pou ? ` · 🔹 +${g.pou}` : ''}${g.xp ? ` · +${g.xp} XP` : ''}`, true);
    const rm = document.getElementById('rangmenu'); if (rm && typeof bandeauRangHTML === 'function') rm.innerHTML = bandeauRangHTML() + (typeof butinHTML === 'function' ? butinHTML() : '');
    setTimeout(() => { carnetOuvre(onglet); if (typeof envieBandeau === 'function') envieBandeau(); }, 60); };
  // 24/11 : la récompense des flashs du jour se récupère ici
  const FLASH = { flashcrypte:() => [ENV_J('guilde-crypte', {}), 'guilde-crypte', o => (o.flash || {}), envJourLocal()],
    flashvoyage:() => [ENV_J('guilde-expedition4-meta', {}) || {}, 'guilde-expedition4-meta', o => (o.flash || {}), envJourUTC()],
    eclair:() => [ENV_J('guilde-eclair', {}), 'guilde-eclair', o => o, envJourLocal()],
    enigme:() => [ENV_J('guilde-enigmes', {}), 'guilde-enigmes', o => o, envJourLocal()] }; // 24/11 : l'énigme du jour aussi
  const flashRec = k => { if (!FLASH[k]) return null; const [o, , acc, j] = FLASH[k](); const f = acc(o)[j]; return f && f.rec && f.recup === false ? f : null; };
  window.carnetFlash = k => { const [o, cle, acc, j] = FLASH[k](), f = acc(o)[j]; if (!f || !f.rec || f.recup !== false) return;
    f.recup = true; try { localStorage.setItem(cle, JSON.stringify(o)); } catch (e) { return; }
    const nom = k === 'enigme' ? 'Énigme du jour' : 'Flash du jour';
    if (typeof gagneXP === 'function') try { gagneXP(f.rec.xp, nom); } catch (e) {}
    if (f.rec.or && typeof donneRessources === 'function') try { donneRessources(f.rec.or, 0); } catch (e) {}
    if (typeof GM !== 'undefined') GM.son('choisir');
    if (typeof annonceRang === 'function') annonceRang(`🎁 ${nom} : +${f.rec.xp} XP${f.rec.or ? ` · 🪙 +${f.rec.or}` : ''}`, true);
    setTimeout(() => { carnetOuvre(onglet); if (typeof envieBandeau === 'function') envieBandeau(); }, 60); };
  // 25/11 (choix de l'utilisateur) : « Si tu as le temps » (crypte du jour, île du jour, voyage du jour, défi de la Défense) : la 1re partie du jour
  // de chacun donne +30 XP, 🪙 30 et 🔹 20 poussière, à récupérer ici avec le cadeau
  const TEMPS = ['crypte', 'ile', 'voyage', 'defense'], TEMPS_REC = { xp:30, or:30, pou:20 }, TEMPS_CLE = 'guilde-temps-rec';
  const tempsJour = () => new Date().toISOString().slice(0, 10);
  const tempsPris = () => { try { return (JSON.parse(localStorage.getItem(TEMPS_CLE) || '{}'))[tempsJour()] || []; } catch (e) { return []; } };
  const tempsRec = (k, fait) => TEMPS.includes(k) && fait && !tempsPris().includes(k);
  window.carnetTemps = k => { const L = envieRendezVous(), x = L.find(y => y[0] === k); if (!x || !tempsRec(k, x[4])) return;
    let o = {}; try { o = JSON.parse(localStorage.getItem(TEMPS_CLE) || '{}'); } catch (e) {} const j = tempsJour(); o[j] = (o[j] || []).concat(k);
    Object.keys(o).sort().slice(0, -7).forEach(d => delete o[d]); try { localStorage.setItem(TEMPS_CLE, JSON.stringify(o)); } catch (e) { return; }
    if (typeof gagneXP === 'function') try { gagneXP(TEMPS_REC.xp, x[2]); } catch (e) {}
    if (typeof donneRessources === 'function') try { donneRessources(TEMPS_REC.or, TEMPS_REC.pou, true); } catch (e) {}
    if (typeof GM !== 'undefined') GM.son('choisir');
    if (typeof annonceRang === 'function') annonceRang(`🎁 ${x[2]} : +${TEMPS_REC.xp} XP · 🪙 +${TEMPS_REC.or} · 🔹 +${TEMPS_REC.pou}`, true);
    setTimeout(() => { carnetOuvre(onglet); if (typeof envieBandeau === 'function') envieBandeau(); }, 60); };
  // 25/11 (l'utilisateur : « pas eu la validation et le cadeau ») : la Chasse au boss de la semaine : ✓ quand on a chassé cette semaine,
  // et les paliers atteints (40, 80, 130 dégâts) ou le boss tombé (jusqu'à la mort) attendent ici, « 🎁 Récupérer »
  const CH_PAL = [[40, 4, 30], [80, 8, 60], [130, 15, 100]], CH_TUE = [10, 200];
  const chasseLit = () => { const c = ENV_J('guilde-chasse', {}) || {}; return c.semaine === (typeof semaineCle === 'function' ? semaineCle() : '') ? c : null; };
  window.carnetChasse = () => { const c = chasseLit(); if (!c || !(c.aRec || []).length) return; let xp = 0, ecl = 0;
    c.aRec.forEach(i => { const g = i === 'tue' ? CH_TUE : [CH_PAL[i][1], CH_PAL[i][2]]; ecl += g[0]; xp += g[1]; }); c.aRec = [];
    try { localStorage.setItem('guilde-chasse', JSON.stringify(c)); } catch (e) { return; }
    if (typeof gagneXP === 'function') try { gagneXP(xp, 'Chasse au boss'); } catch (e) {} if (typeof donneLibres === 'function') try { donneLibres(ecl); } catch (e) {}
    if (typeof GM !== 'undefined') GM.son('choisir');
    if (typeof annonceRang === 'function') annonceRang(`🎁 Chasse au boss : +${xp} XP · 💠 +${ecl}`, true);
    setTimeout(() => { carnetOuvre(onglet); if (typeof envieBandeau === 'function') envieBandeau(); }, 60); };
  const chasseLigne = () => { const c = chasseLit(), fait = !!c && ((c.meilleur || 0) > 0 || (c.mortMax || 0) > 0), rec = c && (c.aRec || []).length;
    const d = !c ? 'Le même boss pour tous, jusqu’à dimanche' : `Meilleur : ${c.meilleur || 0} dégâts${c.mortMax ? ` · jusqu’à la mort : ${c.tue ? 'tombé ✅' : c.mortMax}` : ''}${(c.paliers || []).length ? ` · paliers ${c.paliers.length}/3${(c.aRec || []).length ? '' : ' · récompenses déjà reçues'}` : ''}`;
    if (rec) return `<button onclick="carnetChasse()"><span class="e">🎯</span><span class="t"><b>La Chasse au boss de la semaine</b><small>${d}</small></span><span class="rec" style="flex:none">🎁 Récupérer</span></button>`;
    return ligne(['chasse', '🎯', 'La Chasse au boss de la semaine', d, fait, "envieVa('epreuves.html#chasse')"]); };
  // 24/11 (choix de l'utilisateur) : un ❓ explique ce que rapportent les flashs et l'énigme
  window.carnetAide = () => { if (document.getElementById('carnet-aide')) return; const a = document.createElement('div'); a.id = 'carnet-aide';
    a.innerHTML = `<div class="boite"><button class="x" onclick="document.getElementById('carnet-aide').remove()" aria-label="Fermer">✕</button><h2>❓ Ce que rapportent les rendez-vous rapides</h2>
      <p>Les <b>3 flashs du jour</b> (Crypte, Expéditions, duel éclair) rapportent la même chose, <b>au 1er essai du jour</b> :</p>
      <table><tr><th>Résultat</th><th>XP</th><th>🪙 Or</th></tr><tr><td>Perdu</td><td>+10</td><td>0</td></tr><tr><td>★</td><td>+15</td><td>+5</td></tr><tr><td>★★</td><td>+20</td><td>+10</td></tr><tr><td>★★★</td><td>+25</td><td>+15</td></tr></table>
      <p>Les essais suivants sont « pour le plaisir » : ils ne rapportent rien de plus.</p>
      <p>🧩 <b>L’énigme du jour</b> résolue : <b>+${typeof XP_EVT !== 'undefined' && XP_EVT.enigme || 20} XP</b>, et ta série de jours avance (titres à 7, 30 et 100 jours).</p>
      <p>🗺 <b>Si tu as le temps</b> (crypte du jour, île du jour, voyage du jour, défi de la Défense) : la 1re partie du jour de chacun rapporte <b>+30 XP, 🪙 30 et 🔹 20 poussière</b>.</p>
      <p>La récompense <b>attend ici</b> : touche « 🎁 Récupérer » sur la ligne.</p>
      <details class="gains"><summary><b>Ce que rapporte chaque partie</b></summary><p>Chaque partie rapporte de l’expérience, même perdue : duel gagné 30 (perdu 10), salle vidée 5, élite 20, boss 60, escale 15, Titan 60, acte de l’Invasion 50, vague tenue 10, énigme 20, quête du jour 40, quête de la semaine 150.</p>${(() => { const d = typeof lireRang === 'function' ? lireRang() : null; return d && d.journal && d.journal.length ? `<p><b>Mes derniers gains</b></p>${d.journal.slice(0, 12).map(j => `<div>+${j.xp} · ${j.raison} <small>${new Date(j.q).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</small></div>`).join('')}` : ''; })()}</details></div>`;
    a.onclick = ev => { if (ev.target === a) a.remove(); }; document.body.appendChild(a); };
  const ligne = ([k, e, n, d, fait, a]) => { if (tempsRec(k, fait)) return `<button onclick="carnetTemps('${k}')"><span class="e">${e}</span><span class="t"><b>${n}</b><small>${d} · +${TEMPS_REC.xp} XP · 🪙 ${TEMPS_REC.or} · 🔹 ${TEMPS_REC.pou}</small></span><span class="rec" style="flex:none">🎁 Récupérer</span></button>`;
    if (flashRec(k)) return `<button onclick="carnetFlash('${k}')"><span class="e">${e}</span><span class="t"><b>${n}</b><small>${d}</small></span><span class="rec" style="flex:none">🎁 Récupérer</span></button>`;
    const rec = k === 'butin' && !fait && butinDispo(); // 25/11 (l'utilisateur) : 3/3 = quête finie, plus de bouton (le butin se ramasse encore depuis le menu)
    return `<button class="${fait && !rec ? 'fait' : ''}" onclick="${rec ? 'carnetButin()' : a}"><span class="e">${e}</span><span class="t"><b>${n}</b><small>${d}</small></span>${rec ? '<span class="rec" style="flex:none">🎁 Récupérer</span>' : `<span class="c">${fait ? '✓' : '›'}</span>`}</button>`; };
  const compte = () => { const L = envieRendezVous().filter(x => x[0] !== 'quetes'), Q = typeof lireQuetes === 'function' ? lireQuetes() : { j:[], s:[] };
    const sem = typeof regleDeLaSemaine === 'function' ? regleDeLaSemaine() : null, sc = sem && ENV_J('guilde-sceaux', {})[sem.semaine];
    const jf = L.filter(x => x[4]).length + Q.j.filter(x => x.fait).length, jn = L.length + Q.j.length, ch = chasseLit(), sf = Q.s.filter(x => x.fait).length + (Q.z || []).filter(x => x.fait).length + (sc ? 1 : 0) + (ch && ((ch.meilleur || 0) > 0 || (ch.mortMax || 0) > 0) ? 1 : 0), sn = Q.s.length + (Q.z || []).length + 2;
    return { jf, jn, sf, sn, rec:[...Q.j, ...Q.s, ...(Q.z || [])].filter(x => x.fait && x.recup === false).length + (ch && (ch.aRec || []).length ? 1 : 0), sem, sc }; };

  let onglet = 'jour';
  window.carnetOuvre = function (o) {
    const memeOnglet = !o || o === onglet; // 25/11 (l'utilisateur : « quand je clique sur récupérer ça remonte en haut ») : même onglet = on garde la place
    if (o) onglet = o; let p = document.getElementById('env-auj'); const garde = p && o; // changer d'onglet : on remplace le contenu sans refaire la fenêtre (ni animation, ni saut)
    const haut = garde ? p.querySelector('.boite').scrollTop : 0; if (p && !garde) p.remove();
    const C = compte(), L = envieRendezVous().filter(x => x[0] !== 'quetes'), RAP = ['enigme', 'flashcrypte', 'flashvoyage', 'eclair', 'butin'];
    if (!garde) { p = document.createElement('div'); p.id = 'env-auj'; }
    const corps = onglet === 'jour'
      ? `<h3 class="grp">⚡ Rapide <small>quelques minutes</small><button class="aide-rec" onclick="carnetAide()" aria-label="Ce que ça rapporte">❓</button></h3><div class="liste">${L.filter(x => RAP.includes(x[0])).map(ligne).join('')}</div>
         <h3 class="grp">📜 Les quêtes du jour <small>elles changent à minuit</small></h3>${quetesHTML(true)}
         <h3 class="grp">🗺 Si tu as le temps <small>une vraie partie</small></h3><div class="liste">${L.filter(x => !RAP.includes(x[0])).map(ligne).join('')}</div>`
      : `${(lireQuetes().z || []).length ? `<h3 class="grp">❄ Les quêtes de la saison <small>L’Hiver des runes · elles changent le lundi</small></h3>${quetesHTML('z')}` : ''}<h3 class="grp">📜 Les quêtes de la semaine <small>elles changent le lundi</small></h3>${quetesHTML(false)}
         <h3 class="grp">🗓️ Les rendez-vous de la semaine <small>jusqu’à dimanche soir</small></h3><div class="liste">
         ${ligne(['semaine', '🔏', 'Le Duel de la semaine', C.sc ? 'Sceau gagné cette semaine' : C.sem ? `« ${C.sem.n} » : gagne pour le Sceau` : 'Une règle nouvelle chaque semaine', !!C.sc, "envieVa('duel.html?semaine=1')"])}
         ${chasseLigne()}</div>`;
    const html = `<div class="boite"><button class="x" onclick="document.getElementById('env-auj').remove()" aria-label="Fermer">✕</button>
      <h2><img src="ui/barre/ui-carnet.webp?v=1" alt="" style="width:34px;height:34px;object-fit:contain;vertical-align:middle" onerror="this.outerHTML='📜'"> Le carnet de la Guilde</h2>
      <div class="ongl"><button class="${onglet === 'jour' ? 'on' : ''}" onclick="carnetOuvre('jour')">☀ Aujourd’hui<i>${C.jf}/${C.jn}</i></button><button class="${onglet === 'semaine' ? 'on' : ''}" onclick="carnetOuvre('semaine')">🗓️ Cette semaine<i>${C.sf}/${C.sn}</i></button></div>
      ${corps}</div>`;
    if (garde) { const b = p.querySelector('.boite'), t = document.createElement('div'); t.innerHTML = html; b.innerHTML = t.firstElementChild.innerHTML; b.scrollTop = memeOnglet ? haut : 0; return; }
    p.innerHTML = html; p.onclick = ev => { if (ev.target === p) p.remove(); };
    document.body.appendChild(p);
  };
  window.envieAujourdhui = function (rouvre) { const p = document.getElementById('env-auj'); if (p && !rouvre) { p.remove(); return; } carnetOuvre(); };

  // le bandeau du menu : un seul, pour le jour et la semaine
  const _band = envieBandeau;
  window.envieBandeau = envieBandeau = function () {
    _band(); const b = document.getElementById('env-bandeau'); if (!b) return; const C = compte();
    b.innerHTML = `<span class="sol" style="font-size:28px"><img src="ui/barre/ui-carnet.webp?v=1" alt="" draggable="false" style="width:40px;height:40px;object-fit:contain;display:block" onerror="this.outerHTML='📜'"></span><span class="t"><b>Le carnet de la Guilde</b><small>Aujourd’hui <b style="color:#ffd27a">${C.jf}/${C.jn}</b> · Semaine <b style="color:#ffd27a">${C.sf}/${C.sn}</b>${C.rec ? ` · <b style="color:#7dff8a">🎁 ${C.rec} à récupérer</b>` : ''}</small></span><span class="n">${C.jf}/${C.jn}</span>`;
  };
})();
