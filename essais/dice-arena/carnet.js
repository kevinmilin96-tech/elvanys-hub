// 23/11 (l'utilisateur : « on a deux endroits : Aujourd'hui, quêtes du jour, quêtes de la semaine… il faut tout regrouper ») :
// LE CARNET DE LA GUILDE = un seul endroit, deux onglets : ☀ Aujourd'hui (les rendez-vous du jour + les 3 quêtes du jour, récupérées sur place)
// et 🗓️ Cette semaine (les 3 quêtes de la semaine, le Duel de la semaine, la Chasse au boss). Sur le menu, UN bandeau (le butin garde le sien, choix de l'utilisateur).
// APERÇU d'abord : menu.html?carnet=1 (retenu sur le téléphone ; ?carnet=0 pour revenir). Les autres joueurs gardent l'ancien affichage.
(function () {
  const q = new URLSearchParams(location.search);
  try { if (q.get('carnet') === '1') localStorage.setItem('guilde-carnet', '1'); if (q.get('carnet') === '0') localStorage.removeItem('guilde-carnet'); } catch (e) {}
  window.CARNET = localStorage.getItem('guilde-carnet') === '1';
  if (!window.CARNET || typeof envieRendezVous !== 'function') return;

  const st = document.createElement('style');
  st.textContent = `
  .bandeau-quetes { display:none !important; }
  #env-auj .ongl { display:flex; gap:6px; margin:0 0 10px; } #env-auj .ongl button { flex:1; border:1px solid #6b5fb0; background:#1d1838; color:#d9d0ff; border-radius:12px; padding:9px 4px; font:bold 14px Georgia, serif; }
  #env-auj .ongl button.on { background:linear-gradient(#f3c96b, #d99a2b); color:#2a1a00; border-color:#f3c96b; }
  #env-auj .ongl button i { font-style:normal; font-size:11px; margin-left:4px; opacity:.85; }
  #env-auj .qt { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:#1d1838; border:1px solid #4b4580; border-radius:12px; padding:9px 10px; margin-bottom:6px; color:#f1ecff; font:14px Georgia, serif; box-sizing:border-box; }
  #env-auj .qt.fait { background:#133024; border-color:#2fbf47; } #env-auj .qt .e { font-size:20px; } #env-auj .qt .t { flex:1; min-width:0; } #env-auj .qt .t small { display:block; color:#b9b1e0; font-size:12px; }
  #env-auj .qt .barre { height:5px; background:#0d0b1f; border-radius:3px; margin-top:4px; overflow:hidden; } #env-auj .qt .barre i { display:block; height:100%; background:linear-gradient(90deg, #c78a2c, #f3c96b); }
  #env-auj .qt .rec { border:0; border-radius:10px; padding:7px 10px; font:bold 13px Georgia, serif; background:linear-gradient(#7dff8a, #2fbf47); color:#0b3a12; white-space:nowrap; animation:halo 1s ease-in-out infinite alternate; }
  #env-auj .qt .ok { color:#7ff0a8; font-size:18px; }`;
  document.head.appendChild(st);

  // les quêtes (rang.js) : une ligne = le texte, la barre, ce qu'elle rapporte, et « Récupérer » sur place
  const quetesHTML = jour => {
    if (typeof lireQuetes !== 'function') return '';
    const Q = lireQuetes(), L = jour ? Q.j : Q.s, g = (typeof GAIN_QUETE !== 'undefined' && GAIN_QUETE[jour ? 'jour' : 'semaine']) || {};
    return L.map((qq, i) => { const def = defQuete(qq, jour) || ['', '', '', 1], va = !qq.fait && typeof QUETE_VA !== 'undefined' && QUETE_VA[def[2]], aRec = qq.fait && qq.recup === false;
      return `<div class="qt ${qq.fait && !aRec ? 'fait' : ''}"${va ? ` onclick="envieVa('${va}')" style="cursor:pointer"` : ''}><span class="e">${qq.fait ? '✅' : '📜'}</span><span class="t"><b>${texteQuete(qq, jour)}</b>
        <small>${qq.prog || 0} / ${def[3]} · +${g.xp || 0} XP${g.or ? ` · 🪙 ${g.or}` : ''}</small><span class="barre"><i style="width:${Math.min(100, Math.round((qq.prog || 0) / def[3] * 100))}%"></i></span></span>
        ${aRec ? `<button class="rec" onclick="event.stopPropagation();carnetRecup(${jour}, ${i})">🎁 Récupérer</button>` : qq.fait ? '<span class="ok">✓</span>' : '<span class="ok" style="color:#f3c96b">›</span>'}</div>`; }).join('');
  };
  window.carnetRecup = (jour, i) => { const g = typeof recupQuete === 'function' && recupQuete(!!jour, i);
    if (g && typeof annonceRang === 'function') annonceRang(`🎁 Quête récupérée : +${g.xp} XP${g.or ? ` · 🪙 +${g.or}` : ''}`, true);
    if (typeof GM !== 'undefined') try { GM.son('pieces'); } catch (e) {} carnetOuvre(jour ? 'jour' : 'semaine'); envieBandeau(); };

  const ligne = ([k, e, n, d, fait, a]) => `<button class="${fait ? 'fait' : ''}" onclick="${a}"><span class="e">${e}</span><span class="t"><b>${n}</b><small>${d}</small></span><span class="c">${fait ? '✓' : '›'}</span></button>`;
  const compte = () => { const L = envieRendezVous().filter(x => x[0] !== 'quetes'), Q = typeof lireQuetes === 'function' ? lireQuetes() : { j:[], s:[] };
    const sem = typeof regleDeLaSemaine === 'function' ? regleDeLaSemaine() : null, sc = sem && ENV_J('guilde-sceaux', {})[sem.semaine];
    const jf = L.filter(x => x[4]).length + Q.j.filter(x => x.fait).length, jn = L.length + Q.j.length, sf = Q.s.filter(x => x.fait).length + (sc ? 1 : 0), sn = Q.s.length + 1;
    return { jf, jn, sf, sn, rec:[...Q.j, ...Q.s].filter(x => x.fait && x.recup === false).length, sem, sc }; };

  let onglet = 'jour';
  window.carnetOuvre = function (o) {
    if (o) onglet = o; let p = document.getElementById('env-auj'); if (p) p.remove();
    const C = compte(), L = envieRendezVous().filter(x => x[0] !== 'quetes'), RAP = ['enigme', 'flashcrypte', 'flashvoyage', 'eclair', 'butin'];
    p = document.createElement('div'); p.id = 'env-auj';
    const corps = onglet === 'jour'
      ? `<h3 class="grp">⚡ Rapide <small>quelques minutes</small></h3><div class="liste">${L.filter(x => RAP.includes(x[0])).map(ligne).join('')}</div>
         <h3 class="grp">📜 Les quêtes du jour <small>elles changent à minuit</small></h3>${quetesHTML(true)}
         <h3 class="grp">🗺 Si tu as le temps <small>une vraie partie</small></h3><div class="liste">${L.filter(x => !RAP.includes(x[0])).map(ligne).join('')}</div>`
      : `<h3 class="grp">📜 Les quêtes de la semaine <small>elles changent le lundi</small></h3>${quetesHTML(false)}
         <h3 class="grp">🗓️ Les rendez-vous de la semaine <small>jusqu’à dimanche soir</small></h3><div class="liste">
         ${ligne(['semaine', '🔏', 'Le Duel de la semaine', C.sc ? 'Sceau gagné cette semaine' : C.sem ? `« ${C.sem.n} » : gagne pour le Sceau` : 'Une règle nouvelle chaque semaine', !!C.sc, "envieVa('duel.html?semaine=1')"])}
         ${ligne(['chasse', '🎯', 'La Chasse au boss de la semaine', 'Le même boss pour tous, jusqu’à dimanche', false, "envieVa('epreuves.html')"])}</div>`;
    p.innerHTML = `<div class="boite"><button class="x" onclick="document.getElementById('env-auj').remove()" aria-label="Fermer">✕</button>
      <h2>📜 Le carnet de la Guilde</h2>
      <div class="ongl"><button class="${onglet === 'jour' ? 'on' : ''}" onclick="carnetOuvre('jour')">☀ Aujourd’hui<i>${C.jf}/${C.jn}</i></button><button class="${onglet === 'semaine' ? 'on' : ''}" onclick="carnetOuvre('semaine')">🗓️ Cette semaine<i>${C.sf}/${C.sn}</i></button></div>
      ${corps}</div>`;
    p.onclick = ev => { if (ev.target === p) p.remove(); };
    document.body.appendChild(p);
  };
  window.envieAujourdhui = function (rouvre) { const p = document.getElementById('env-auj'); if (p && !rouvre) { p.remove(); return; } carnetOuvre(); };

  // le bandeau du menu : un seul, pour le jour et la semaine
  const _band = envieBandeau;
  window.envieBandeau = envieBandeau = function () {
    _band(); const b = document.getElementById('env-bandeau'); if (!b) return; const C = compte();
    b.innerHTML = `<span class="sol" style="font-size:28px">📜</span><span class="t"><b>Le carnet de la Guilde</b><small>Aujourd’hui <b style="color:#ffd27a">${C.jf}/${C.jn}</b> · Semaine <b style="color:#ffd27a">${C.sf}/${C.sn}</b>${C.rec ? ` · <b style="color:#7dff8a">🎁 ${C.rec} à récupérer</b>` : ''}</small></span><span class="n">${C.jf}/${C.jn}</span>`;
  };
})();
