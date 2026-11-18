// =============================================================================================== LES ENTRAÎNEMENTS DE MOUSTACHE (18/11, demande de l'utilisateur)
// « Le tuto du Duel est bien mieux que les autres, qui ne sont que des messages : dans chaque mode, une courte instance de pratique, guidée. »
// Ce fichier = le moteur commun : le PROJECTEUR (copié du tutoriel du Duel : l'écran s'assombrit, seul l'élément utile reste touchable, une main montre où toucher)
// et un déroulé d'étapes. Chaque mode a son scénario (ex. expedition-entrainement.js) et l'appelle par Entrainement.lance(cle, etapes, options).
// Une étape : { c:'texte de Moustache', g:'réponse du héros' (facultatif), cible:'sélecteur' | () => élément | [éléments], ok:() => vrai quand c'est fait,
//   montre:() => vrai quand l'étape peut s'afficher (sinon le projecteur s'efface : animation, fenêtre…), libre:true (tout reste touchable) }.
// Une étape sans « ok » a un bouton « Suivant ». La liste de tous les entraînements est dans ⚙️ Paramètres (musique.js, ENTRAINEMENTS).
const Entrainement = (() => {
  let E = null, minuteur = null;
  const fait = () => { try { return JSON.parse(localStorage.getItem('guilde-entrainements') || '{}'); } catch (e) { return {}; } };
  function el() {
    let p = document.getElementById('projoE'); if (p) return p;
    p = document.createElement('div'); p.id = 'projoE';
    p.innerHTML = '<div class="pv h"></div><div class="pv b"></div><div class="pv g"></div><div class="pv d"></div><div class="anneauP"></div><div class="main1">👆</div><div class="bulleT"></div>';
    document.body.appendChild(p);
    const st = document.createElement('style'); st.textContent = `
      #projoE { position:fixed; inset:0; z-index:4800; pointer-events:none; font-family:Georgia, serif; }
      #projoE.cache { display:none; }
      #projoE .pv { position:fixed; background:#05030cb8; pointer-events:auto; transition:all .25s; }
      #projoE.libre .pv, #projoE.libre .anneauP, #projoE.libre .main1 { display:none; }
      #projoE.seul .anneauP, #projoE.seul .main1 { display:none; }
      #projoE .anneauP { position:fixed; border-radius:14px; box-shadow:0 0 0 3px #f3c96b, 0 0 22px 6px #f3c96baa; animation:pulsePE 1.2s ease-in-out infinite; transition:all .25s; pointer-events:none; }
      @keyframes pulsePE { 50% { box-shadow:0 0 0 5px #fff6d6, 0 0 30px 10px #f3c96bcc; } }
      #projoE .main1 { position:fixed; z-index:3; pointer-events:none; font-size:34px; filter:drop-shadow(0 3px 4px #000); animation:tapeE 1s ease-in-out infinite; transition:left .25s, top .25s; }
      @keyframes tapeE { 50% { transform:translate(-4px, -8px) scale(.92); } }
      #projoE .bulleT { position:fixed; left:50%; transform:translateX(-50%); width:min(94vw, 460px); pointer-events:auto; display:flex; flex-direction:column; gap:6px; }
      #projoE .ligneT { display:flex; gap:8px; align-items:flex-start; background:#fbf6e9; color:#2a2140; border-radius:16px; padding:9px 11px; box-shadow:0 6px 18px #000a; font-size:.95em; line-height:1.35; animation:entreTE .3s ease-out; }
      #projoE .ligneT.heros { flex-direction:row-reverse; background:#e7efff; margin-left:12%; }
      #projoE .ligneT .qui { display:block; font-size:.82em; color:#6b5fb0; font-weight:bold; }
      #projoE .av { width:40px; height:40px; flex:none; border-radius:50%; background:#2a2140; box-shadow:0 0 0 2px #f3c96b; object-fit:cover; }
      #projoE .boutonsT { display:flex; justify-content:space-between; align-items:center; gap:8px; }
      #projoE .boutonsT button { font:inherit; border:0; border-radius:20px; padding:8px 18px; font-weight:bold; background:linear-gradient(#f6d77e, #c8902f); color:#2a1a08; box-shadow:0 3px 8px #000a; animation:pulseTE 1.2s ease-in-out infinite; }
      @keyframes pulseTE { 50% { transform:scale(1.06); } }
      #projoE .boutonsT a { color:#e9e3ff; font-size:.82em; text-shadow:0 1px 3px #000; }
      #projoE.libre .bulleT { pointer-events:none; } #projoE.libre .boutonsT a, #projoE.libre .boutonsT button { pointer-events:auto; }
      #projoE .bulleT.deja .ligneT { animation:none; }
      @keyframes entreTE { from { opacity:0; transform:translateY(8px); } }`;
    document.head.appendChild(st); return p;
  }
  function projette(cible, html, o) {
    const p = el(); p.classList.remove('cache'); p.classList.toggle('libre', !!o.libre); p.classList.toggle('seul', !cible);
    const W = innerWidth, H = innerHeight, m = 6, liste = Array.isArray(cible) ? cible : cible ? [cible] : [];
    const rs = liste.map(x => x.getBoundingClientRect());
    const r = rs.length ? { left:Math.min(...rs.map(x => x.left)), top:Math.min(...rs.map(x => x.top)), right:Math.max(...rs.map(x => x.right)), bottom:Math.max(...rs.map(x => x.bottom)) } : null;
    const [h, b, g, d] = p.querySelectorAll('.pv');
    if (r) { const L = Math.max(0, r.left - m), T = Math.max(0, r.top - m), R = Math.min(W, r.right + m), B = Math.min(H, r.bottom + m);
      Object.assign(h.style, { left:'0', top:'0', width:W + 'px', height:T + 'px' }); Object.assign(b.style, { left:'0', top:B + 'px', width:W + 'px', height:Math.max(0, H - B) + 'px' });
      Object.assign(g.style, { left:'0', top:T + 'px', width:L + 'px', height:(B - T) + 'px' }); Object.assign(d.style, { left:R + 'px', top:T + 'px', width:Math.max(0, W - R) + 'px', height:(B - T) + 'px' });
      Object.assign(p.querySelector('.anneauP').style, { left:L + 'px', top:T + 'px', width:(R - L) + 'px', height:(B - T) + 'px' });
      const main1 = p.querySelector('.main1'), dessous = B + 44 < H - 4; main1.textContent = dessous ? '👆' : '👇';
      Object.assign(main1.style, { left:Math.max(4, Math.min(W - 44, (L + R) / 2 - 17)) + 'px', top:(dessous ? B + 2 : Math.max(4, T - 44)) + 'px' });
      const bu = p.querySelector('.bulleT'), enHaut = (T + B) / 2 > H * .5; bu.style.top = enHaut ? '10px' : ''; bu.style.bottom = enHaut ? '' : '10px'; }
    else { Object.assign(h.style, { left:'0', top:'0', width:W + 'px', height:H + 'px' }); [b, g, d].forEach(x => Object.assign(x.style, { width:'0', height:'0' }));
      const bu = p.querySelector('.bulleT'); bu.style.top = o.libre ? '8px' : '24%'; bu.style.bottom = ''; }
    if (o.libre) { const bu = p.querySelector('.bulleT'); bu.style.top = '8px'; bu.style.bottom = ''; }
    const bu = p.querySelector('.bulleT'); if (bu.dataset.h !== html) { bu.innerHTML = html; bu.dataset.h = html; bu.classList.remove('deja'); } else bu.classList.add('deja');
  }
  const cache = () => { const p = document.getElementById('projoE'); if (p) p.classList.add('cache'); };
  // 18/11 (l'utilisateur : « plus immersif ») : la réplique du héros n'apparaît qu'après une petite flèche « › », le temps de lire Moustache
  function bulle(e) {
    const txt = typeof e.c === 'function' ? e.c() : e.c, h = E.heros, attendRep = e.g && h && E.rep !== E.i;
    return `<div class="ligneT"><img class="av" src="ui/moustache.webp?v=1" alt="Moustache"><div><span class="qui">Moustache</span>${txt}</div></div>`
      + (e.g && h && !attendRep ? `<div class="ligneT heros"><img class="av" src="${h.img}" alt=""><div><span class="qui">${h.nom}</span>${e.g}</div></div>` : '')
      + `<div class="boutonsT"><a href="#" onclick="Entrainement.passer();return false">Passer l’entraînement</a>${attendRep ? '<button onclick="Entrainement.replique()">›</button>' : e.ok ? '<span></span>' : '<button onclick="Entrainement.suivant()">Suivant ›</button>'}</div>`;
  }
  function maj() {
    if (!E) { cache(); return; }
    while (E.i < E.etapes.length && E.etapes[E.i].ok && E.etapes[E.i].ok()) E.i++;
    const e = E.etapes[E.i]; if (!e) { arrete(); if (E.fin) E.fin(); return; }
    if (e.montre && !e.montre()) { cache(); return; }
    let c = e.cible ? (typeof e.cible === 'function' ? e.cible() : document.querySelector(e.cible)) : null;
    if (e.cible && (!c || (Array.isArray(c) && !c.length))) { cache(); return; }
    if (E.vu !== E.i) { E.vu = E.i; if (typeof GM !== 'undefined' && E.i % 3 === 0) GM.son('miaou'); }
    projette(c, bulle(e), { libre:e.libre });
  }
  function arrete() { clearInterval(minuteur); minuteur = null; cache(); }
  return {
    // cle : le mode (ex. 'expedition') ; etapes : la liste ; o : { heros:{ nom, img }, fin:() => …, passer:() => … }
    lance(cle, etapes, o = {}) { E = { cle, etapes, i:0, heros:o.heros, fin:o.fin, passer:o.passer }; clearInterval(minuteur); minuteur = setInterval(maj, 250); maj(); },
    suivant() { if (!E) return; E.i++; maj(); },
    replique() { if (!E) return; E.rep = E.i; maj(); },
    maj, arrete, en:() => !!E,
    passer() { if (!E) return; const p = E.passer; arrete(); E = null; if (p) p(); },
    // à la fin : marque l'entraînement comme fait (une récompense d'XP la 1re fois) et renvoie le texte de Moustache
    termine(cle) { const f = fait(), premier = !f[cle]; f[cle] = new Date().toISOString(); localStorage.setItem('guilde-entrainements', JSON.stringify(f));
      if (premier && typeof gagneXP === 'function') gagneXP(100, 'Entraînement réussi'); E = null; arrete(); return premier; },
    fait,
  };
})();
