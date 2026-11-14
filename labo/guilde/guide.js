// =============================================================================================== le guide de Moustache (14/11)
// Demande de l'utilisateur : « un guide avec Moustache sur chaque module ». Au premier passage dans un écran, Moustache montre
// chaque zone une à une (le reste est assombri). Une fois vu, il ne revient plus ; Guide.lance(cle, etapes, true) le rejoue.
// etapes = [[sélecteur CSS ou null, texte], …] ; un sélecteur absent de l'écran est sauté.
(function () {
  const st = document.createElement('style');
  st.textContent = `#guide .voile{position:fixed;inset:0;z-index:950;background:#0000}
#guide.centre .voile{background:#000b}
.guide-on{position:relative;z-index:951!important;box-shadow:0 0 0 4px #f3c96b,0 0 0 9999px #000b!important;border-radius:14px;pointer-events:none}
#guide .bulleg{position:fixed;left:50%;transform:translateX(-50%);width:min(94%,520px);z-index:952;display:flex;gap:10px;align-items:flex-start;background:#1b1838;color:#fff;border:2px solid #f3c96b;border-radius:16px;padding:10px 12px;box-shadow:0 8px 24px #000c;font:15px/1.35 Georgia,serif}
#guide .bulleg.enbas{bottom:14px} #guide .bulleg.enhaut{top:14px} #guide.centre .bulleg{top:50%;transform:translate(-50%,-50%)}
#guide .bulleg img{width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid #f3c96b;flex:none}
#guide .bulleg p{margin:0 0 8px} #guide .bulleg b{color:#f3c96b} #guide .bg{display:flex;gap:8px;justify-content:flex-end;align-items:center}
#guide .bg small{flex:1;opacity:.6}
#guide .bg button{background:#2a2350;color:#fff;border:1px solid #4b4580;border-radius:10px;padding:6px 12px;font:inherit}
#guide .bg button.or{background:#f3c96b;color:#2b1d0a;border:0;font-weight:bold}`;
  document.head.appendChild(st);
  let cle = null, etapes = [], n = 0, fini = null;
  const nettoie = () => { document.querySelectorAll('.guide-on').forEach(e => e.classList.remove('guide-on')); const g = document.getElementById('guide'); if (g) g.remove(); };
  // 14/11 : on attend que les pages de récit (#chron) et les fenêtres (#fen, .fenetre) soient fermées, sinon le guide montre des zones cachées
  const occupe = () => { if (document.getElementById('chron')) return true; return !!document.querySelector('#fen .fenetre, .fenetre:not(#guide *)'); };
  function montre() {
    if (n === 0 && occupe()) { setTimeout(montre, 600); return; }
    nettoie();
    while (n < etapes.length && etapes[n][0] && !document.querySelector(etapes[n][0])) n++;
    if (n >= etapes.length) { localStorage.setItem('guilde-guide-' + cle, '1'); if (fini) fini(); return; }
    const [sel, txt, avant] = etapes[n]; if (avant) avant();
    const el = sel && document.querySelector(sel);
    if (el) { el.classList.add('guide-on'); el.scrollIntoView({ block:'center' }); }
    const r = el && el.getBoundingClientRect(), place = !el ? '' : r.top + r.height / 2 > innerHeight / 2 ? 'enhaut' : 'enbas';
    const der = n === etapes.length - 1;
    document.body.insertAdjacentHTML('beforeend', `<div id="guide" class="${el ? '' : 'centre'}"><div class="voile"></div><div class="bulleg ${place}"><img src="ui/moustache.webp" alt="Moustache"><div><p>${txt}</p><div class="bg"><small>${n + 1}/${etapes.length}</small>${der ? '' : '<button onclick="Guide.passe()">Passer</button>'}<button class="or" onclick="Guide.suivant()">${der ? 'Compris !' : 'Suivant ›'}</button></div></div></div></div>`);
  }
  window.Guide = {
    vu:k => !!localStorage.getItem('guilde-guide-' + k),
    lance(k, e, force, apres) { if (!force && this.vu(k)) return false; if (document.getElementById('guide')) return false; cle = k; etapes = e; n = 0; fini = apres || null; setTimeout(montre, 350); return true; },
    suivant() { n++; montre(); },
    passe() { n = etapes.length; montre(); },
  };
})();
