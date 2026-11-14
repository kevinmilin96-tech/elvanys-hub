// La Guilde des Runes — LE LECTEUR DE MUSIQUE COMMUN (13/11 soir).
// Musiques choisies par l'utilisateur sur Pixabay (liste : da/sons/musiques/recu/LISTE.md du dépôt guilde-des-runes),
// préparées dans musiques/<clé>.mp3 (3 min au plus, volume égalisé ; victoire et défaite = jingles de quelques secondes).
// GM.musique(clé) : musique de fond en boucle, fondu enchaîné · GM.ambiance(clé|null) : couche douce (feu, vent)
// GM.temporaire(clé) / GM.retour() : une musique le temps d'une page (chronique, marchand) puis on revient
// GM.jingle(clé) : victoire / défaite, une fois · GM.stop(s) · GM.bascule() · GM.bouton() : petit 🎵 en bas à droite
// Le navigateur interdit le son avant le premier toucher : on le lance au premier toucher. Coupé quand l'appli passe en arrière-plan.
const GM = (() => {
  const VOL = { titre:.5, menu:.45, heros:.45, duel:.4, elite:.42, boss:.45, carte:.45, recit:.45, marchand:.45, campement:.45, expeditions:.45, tuto:.45, mer:.45, victoire:.6, defaite:.6, feu:.5, vent:.45 };
  const volM = () => +(localStorage.getItem('guilde-vol-musique') || 100) / 100, volS = () => +(localStorage.getItem('guilde-vol-sons') || 100) / 100;
  let actif = localStorage.getItem('guilde-musique') !== '0', ctx = null, cur = null, amb = null, voulu = null, ambVoulue = null, pile = [];
  function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  function piste(cle, boucle) {
    const a = new Audio(`musiques/${cle}.mp3?v=1`); a.loop = boucle; a.preload = 'auto';
    const p = { a, cle, vol:VOL[cle] || .45, g:null }, c = ac();
    if (c) { try { const s = c.createMediaElementSource(a); p.g = c.createGain(); p.g.gain.value = 0; s.connect(p.g).connect(c.destination); } catch (e) { p.g = null; } }
    if (!p.g) a.volume = 0;
    return p;
  }
  function fondu(p, cible, sec) {
    if (!p) return;
    if (p.g && ctx) { const t = ctx.currentTime; p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.linearRampToValueAtTime(cible, t + sec); return; }
    const de = p.a.volume, n = Math.max(1, Math.round(sec * 20)); let i = 0; clearInterval(p.iv);
    p.iv = setInterval(() => { i++; try { p.a.volume = Math.max(0, Math.min(1, de + (cible - de) * i / n)); } catch (e) {} if (i >= n) clearInterval(p.iv); }, 50);
  }
  function eteins(p, sec) { if (!p) return; fondu(p, 0, sec); setTimeout(() => { try { p.a.pause(); p.a.removeAttribute('src'); p.a.load(); } catch (e) {} }, sec * 1000 + 150); }
  // 14/11 (demande de l'utilisateur) : la carte de musique du téléphone (écran verrouillé, volet) montre Moustache et le nom du jeu, plus le logo de Chrome
  const ICONES = [96, 192, 512].map(n => ({ src:new URL(`icone-${n}.png?v=1`, location.href).href, sizes:`${n}x${n}`, type:'image/png' }));
  function carteTelephone() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const mode = document.title.replace(/^La Guilde des Runes\s*·?\s*/, '').replace(/\s*\(.*\)\s*$/, '') || 'Menu';
    try { navigator.mediaSession.metadata = new MediaMetadata({ title:mode, artist:'La Guilde des Runes', album:'La Guilde des Runes', artwork:ICONES }); } catch (e) {}
  }
  if (!document.querySelector('link[rel="icon"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="icon" href="icone-96.png?v=1"><link rel="apple-touch-icon" href="icone-192.png?v=1">');
  function demarre(p) { carteTelephone(); const r = p.a.play(); if (r && r.then) r.then(() => fondu(p, p.vol * volM(), 1.5)).catch(() => {}); else fondu(p, p.vol * volM(), 1.5); }
  function joueVoulu() {
    if (!actif || document.hidden) return;
    if (voulu && (!cur || cur.cle !== voulu || cur.a.paused)) { if (!cur || cur.cle !== voulu) { eteins(cur, 1.2); cur = piste(voulu, true); } demarre(cur); }
    if (ambVoulue && (!amb || amb.cle !== ambVoulue || amb.a.paused)) { if (!amb || amb.cle !== ambVoulue) { eteins(amb, 1.2); amb = piste(ambVoulue, true); } demarre(amb); }
  }
  // premier toucher : le navigateur autorise enfin le son
  const debloque = () => { ac(); joueVoulu(); };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, debloque, { capture:true, passive:true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { [cur, amb].forEach(p => { if (p) try { p.a.pause(); } catch (e) {} }); }
    else joueVoulu();
  });
  // 13/11 soir : LES BRUITAGES choisis par l'utilisateur (ecoute-bruitages.html : Kenney CC0 et Mixkit), un seul endroit pour tout le jeu
  const SONS = { coup:'mk-coup-2', gros:'mk-gros-coup-3', bouclier:'mk-bouclier-1', garde:'mk-bouclier-1', 'bouclier-casse':'mk-bouclier-casse-2', griffe:'mk-griffe-1',
    tombe:'mk-tombe-3', tir:'mk-tir-1', soin:'mk-soin-3', magie:'mk-magie-1', poison:'mk-poison-2', ultime:'mk-ultime-3', jauge:'mk-jauge-2', louve:'mk-louve-2',
    vague:'mk-vague-1', portail:'mk-portail-1', miaou:'mk-corbin-3', victoire:'mk-victoire-4',
    carte:'card-shove-1', pioche:'card-slide-3', melange:'card-shuffle', agrandir:'cards-pack-take-out-1', vendre:'chips-stack-1',
    relance:'dice-shake-2', choisir:'dice-grab-1', poser:'die-throw-1', 'tour-batir':'impactplank-medium-000', 'tour-fusion':'glass-002', rune:'impactbell-heavy-000',
    porte:'dooropen-2', pas:'footstep04', livre:'bookflip2', erreur:'error-006', ok:'confirmation-002',
    // 13/11 soir, 2e bilan : les moments qui n'avaient pas de son
    'porte-frappee':'mk-porte-frappee-3', 'titan-pas':'impactmining-003', 'monstre-touche':'mk-monstre-touche-3', coffre:'mk-coffre-3', marchand:'mk-marchand-3',
    des:'oga-des-1', clic:'mk-clic-1', ouvrir:'mk-ouvrir-1', fermer:'mk-fermer-1', defaite:'mk-defaite-6' };
  const VOL_SON = { pas:.5, choisir:.6, livre:.7, ok:.6, erreur:.6, miaou:.8, poser:.7, clic:.4, ouvrir:.55, fermer:.5, 'monstre-touche':.6 };
  let dernierSon = 0;
  let sonActif = localStorage.getItem('guilde-son') !== '0'; const BUFS = {};
  function tampon(f) { const c = ac(); if (!c) return Promise.resolve(null); return BUFS[f] || (BUFS[f] = fetch(`sons/fx/${f}.mp3?v=1`).then(r => r.arrayBuffer()).then(b => new Promise((ok, ko) => c.decodeAudioData(b, ok, ko))).catch(() => null)); }
  const api = {
    get actif() { return actif; },
    aSon(cle) { return !!SONS[cle]; },
    son(cle, vol) { sonActif = localStorage.getItem('guilde-son') !== '0'; const f = SONS[cle]; if (!f || !sonActif || document.hidden) return false; const c = ac(); if (!c) return false; dernierSon = Date.now();
      tampon(f).then(b => { if (!b) return; const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = (vol || VOL_SON[cle] || .85) * volS(); s.connect(g).connect(c.destination); s.start(); }); return true; },
    precharge(...cles) { cles.forEach(k => SONS[k] && tampon(SONS[k])); },
    musique(cle) { voulu = cle; pile = []; if (cur && cur.cle === cle && !cur.a.paused) return; joueVoulu(); },
    ambiance(cle) { ambVoulue = cle || null; if (!ambVoulue) { eteins(amb, 1.2); amb = null; return; } joueVoulu(); },
    temporaire(cle) { if (voulu === cle) return; pile.push(voulu); voulu = cle; joueVoulu(); },
    retour() { if (!pile.length) return; voulu = pile.pop(); if (!voulu) { eteins(cur, 1.2); cur = null; return; } joueVoulu(); },
    jingle(cle) { voulu = null; pile = []; eteins(cur, .8); cur = null; eteins(amb, .8); amb = null; ambVoulue = null;
      if (!actif || document.hidden) return; const p = piste(cle, false); p.vol = VOL[cle] || .6; setTimeout(() => { demarre(p); p.a.onended = () => eteins(p, .1); }, cle === 'victoire' || cle === 'defaite' ? 2500 : 500); },
    stop(sec) { voulu = null; pile = []; eteins(cur, sec || .6); cur = null; },
    bascule() {
      actif = !actif; localStorage.setItem('guilde-musique', actif ? '1' : '0');
      if (actif) joueVoulu(); else { eteins(cur, .4); eteins(amb, .4); cur = null; amb = null; }
      const b = document.getElementById('gm-bouton'); if (b) b.classList.toggle('off', !actif);
      return actif;
    },
    // 13/11 soir : l'écran des PARAMÈTRES (demande de l'utilisateur) : musique, bruitages, volumes, vitesse des animations, rejouer le tutoriel
    parametres() {
      let z = document.getElementById('gm-param'); if (z) { z.remove(); return; }
      if (!document.getElementById('gm-param-css')) { const st = document.createElement('style'); st.id = 'gm-param-css'; st.textContent = `
        #gm-param{position:fixed;inset:0;z-index:950;background:#05030ccc;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Georgia,serif}
        #gm-param .p{width:100%;max-width:400px;background:#1d1838;border:1px solid #f3c96b66;border-radius:18px;padding:16px 16px 12px;color:#efe9ff;box-shadow:0 10px 30px #000c}
        #gm-param h2{margin:0 0 10px;color:#f3c96b;font-size:1.3em;text-align:center}
        #gm-param .l{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid #ffffff14}
        #gm-param .l>span{flex:1} #gm-param input[type=range]{width:100%;accent-color:#f3c96b;margin:4px 0 0}
        #gm-param .t{min-width:76px;border:none;border-radius:20px;padding:7px 12px;font:bold 14px Georgia;background:#3a3570;color:#fff} #gm-param .t.on{background:#f3c96b;color:#2a1a08}
        #gm-param .a{display:block;margin:12px 0 0;padding:11px;border-radius:12px;background:#2a2650;border:1px solid #4b4580;color:#fff;text-decoration:none;text-align:center}
        #gm-param button.a{width:100%;font:15px Georgia;cursor:pointer;white-space:normal;overflow-wrap:break-word} #gm-param .a.q{background:#4a1b24;border-color:#a3404a}
        #gm-param .f{display:block;width:100%;margin-top:12px;padding:10px;border:none;border-radius:12px;background:#f3c96b;color:#2a1a08;font:bold 15px Georgia}`; document.head.appendChild(st); }
      const sonOn = () => localStorage.getItem('guilde-son') !== '0', rapide = () => localStorage.getItem('guilde-vitesse') === 'rapide';
      z = document.createElement('div'); z.id = 'gm-param';
      const dessine = () => { z.innerHTML = `<div class="p"><h2>⚙️ Paramètres</h2>
        <div class="l"><span>🎵 Musique<input type="range" min="0" max="100" value="${Math.round(volM() * 100)}" data-v="guilde-vol-musique"></span><button class="t ${actif ? 'on' : ''}" data-k="m">${actif ? 'Allumée' : 'Éteinte'}</button></div>
        <div class="l"><span>🔊 Bruitages<input type="range" min="0" max="100" value="${Math.round(volS() * 100)}" data-v="guilde-vol-sons"></span><button class="t ${sonOn() ? 'on' : ''}" data-k="s">${sonOn() ? 'Allumés' : 'Éteints'}</button></div>
        <div class="l"><span>⚡ Vitesse des animations</span><button class="t on" data-k="v">${rapide() ? 'Rapide' : 'Normale'}</button></div>
        ${window.GM_QUITTER ? `<button class="a q" data-k="q">🚪 ${window.GM_QUITTER.t}</button>` : ''}
        <a class="a" href="duel.html?tuto=1">🎓 Rejouer le tutoriel</a>
        <button class="f" data-k="x">Fermer</button></div>`; };
      dessine(); document.body.appendChild(z);
      z.addEventListener('click', e => {
        if (e.target === z) { z.remove(); return; }
        const k = e.target.dataset && e.target.dataset.k; if (!k) return;
        if (k === 'x') { z.remove(); return; }
        if (k === 'q') { z.remove(); window.GM_QUITTER.f(); return; } // 14/11 : quitter une partie en cours (posé par la page du combat)
        if (k === 'm') api.bascule();
        if (k === 's') { localStorage.setItem('guilde-son', sonOn() ? '0' : '1'); api.son('ok'); }
        if (k === 'v') localStorage.setItem('guilde-vitesse', rapide() ? 'normale' : 'rapide');
        dessine();
      });
      z.addEventListener('change', e => { const v = e.target.dataset && e.target.dataset.v; if (!v) return; localStorage.setItem(v, e.target.value);
        if (v === 'guilde-vol-musique') { [cur, amb].forEach(p => p && fondu(p, p.vol * volM(), .3)); } else api.son('ok'); });
    },
    bouton(o = {}) {
      if (document.getElementById('gm-bouton')) return;
      const st = document.createElement('style');
      st.textContent = '#gm-bouton{position:fixed;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:900;width:38px;height:38px;border-radius:50%;border:1px solid #f3c96b88;background:#15132bcc;color:#f3c96b;font-size:18px;line-height:36px;text-align:center;padding:0;cursor:pointer}';
      document.head.appendChild(st);
      const b = document.createElement('button'); b.id = 'gm-bouton'; b.type = 'button'; b.title = 'Musique'; b.setAttribute('aria-label', 'Musique'); b.textContent = '⚙️'; b.title = 'Paramètres'; b.setAttribute('aria-label', 'Paramètres');
      if (o.haut) { b.style.bottom = 'auto'; b.style.top = 'calc(10px + env(safe-area-inset-top))'; } // le menu : en haut à droite, pour ne cacher aucun bouton
      b.onclick = e => { e.stopPropagation(); api.parametres(); };
      (document.body || document.documentElement).appendChild(b);
    },
  };
  addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b || b.id === 'gm-bouton') return; const t = Date.now();
    setTimeout(() => { if (dernierSon < t) api.son('clic'); }, 40); }, true);
  addEventListener('DOMContentLoaded', () => { const fen = document.getElementById('fen'); if (!fen) return; let plein = !!fen.textContent.trim();
    new MutationObserver(() => { const p = !!fen.textContent.trim(); if (p !== plein) { plein = p; const t = Date.now(); setTimeout(() => { if (dernierSon < t || !p) api.son(p ? 'ouvrir' : 'fermer'); }, 30); } }).observe(fen, { childList:true, subtree:true }); });
  // 13/11 soir (remarque de l'utilisateur : « les deux-points en début de ligne ») : typographie française, espace INSÉCABLE avant : ; ! ? »
  // et après « dans tout texte affiché (y compris écrit à la volée : bulles, fenêtres, chroniques) ; jamais dans le code, les champs ou les styles
  const NB = '\u00a0', SAUTE = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE)$/;
  function insecables(racine) {
    if (!racine) return; const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const p = n.parentNode; if (p && SAUTE.test(p.nodeName)) continue;
      const t = n.data, u = t.replace(/[ \t]+([:;!?»])/g, NB + '$1').replace(/«[ \t]+/g, '«' + NB); if (u !== t) n.data = u; }
  }
  addEventListener('DOMContentLoaded', () => { insecables(document.body);
    new MutationObserver(ms => ms.forEach(x => { if (x.type === 'characterData') { const p = x.target.parentNode; if (p) insecables(p); } else x.addedNodes.forEach(a => insecables(a.nodeType === 3 ? a.parentNode : a)); }))
      .observe(document.body, { childList:true, subtree:true, characterData:true }); });
  return api;
})();
