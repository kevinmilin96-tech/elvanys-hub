// La Guilde des Runes — LE LECTEUR DE MUSIQUE COMMUN (13/11 soir).
// Musiques choisies par l'utilisateur sur Pixabay (liste : da/sons/musiques/recu/LISTE.md du dépôt guilde-des-runes),
// préparées dans musiques/<clé>.mp3 (3 min au plus, volume égalisé ; victoire et défaite = jingles de quelques secondes).
// GM.musique(clé) : musique de fond en boucle, fondu enchaîné · GM.ambiance(clé|null) : couche douce (feu, vent)
// GM.temporaire(clé) / GM.retour() : une musique le temps d'une page (chronique, marchand) puis on revient
// GM.jingle(clé) : victoire / défaite, une fois · GM.stop(s) · GM.bascule() · GM.bouton() : petit 🎵 en bas à droite
// Le navigateur interdit le son avant le premier toucher : on le lance au premier toucher. Coupé quand l'appli passe en arrière-plan.
const GM = (() => {
  const VOL = { titre:.5, menu:.45, heros:.45, duel:.4, elite:.42, boss:.45, carte:.45, recit:.45, marchand:.45, campement:.45, expeditions:.45, tuto:.45, mer:.45, victoire:.6, defaite:.6, feu:.5, vent:.45 };
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
  function demarre(p) { const r = p.a.play(); if (r && r.then) r.then(() => fondu(p, p.vol, 1.5)).catch(() => {}); else fondu(p, p.vol, 1.5); }
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
      tampon(f).then(b => { if (!b) return; const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol || VOL_SON[cle] || .85; s.connect(g).connect(c.destination); s.start(); }); return true; },
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
    bouton() {
      if (document.getElementById('gm-bouton')) return;
      const st = document.createElement('style');
      st.textContent = '#gm-bouton{position:fixed;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:900;width:38px;height:38px;border-radius:50%;border:1px solid #f3c96b88;background:#15132bcc;color:#f3c96b;font-size:18px;line-height:36px;text-align:center;padding:0;cursor:pointer}#gm-bouton.off{opacity:.55}#gm-bouton.off::after{content:"";position:absolute;left:8px;right:8px;top:18px;height:2px;background:#f3c96b;transform:rotate(-45deg)}';
      document.head.appendChild(st);
      const b = document.createElement('button'); b.id = 'gm-bouton'; b.type = 'button'; b.title = 'Musique'; b.setAttribute('aria-label', 'Musique'); b.textContent = '🎵';
      if (!actif) b.classList.add('off'); b.onclick = e => { e.stopPropagation(); api.bascule(); };
      (document.body || document.documentElement).appendChild(b);
    },
  };
  addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b || b.id === 'gm-bouton') return; const t = Date.now();
    setTimeout(() => { if (dernierSon < t) api.son('clic'); }, 40); }, true);
  addEventListener('DOMContentLoaded', () => { const fen = document.getElementById('fen'); if (!fen) return; let plein = !!fen.textContent.trim();
    new MutationObserver(() => { const p = !!fen.textContent.trim(); if (p !== plein) { plein = p; const t = Date.now(); setTimeout(() => { if (dernierSon < t || !p) api.son(p ? 'ouvrir' : 'fermer'); }, 30); } }).observe(fen, { childList:true, subtree:true }); });
  return api;
})();
