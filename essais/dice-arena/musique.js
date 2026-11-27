// La Guilde des Runes — LE LECTEUR DE MUSIQUE COMMUN (13/11 soir).
// Musiques choisies par l'utilisateur sur Pixabay (liste : da/sons/musiques/recu/LISTE.md du dépôt guilde-des-runes),
// préparées dans musiques/<clé>.mp3 (3 min au plus, volume égalisé ; victoire et défaite = jingles de quelques secondes).
// GM.musique(clé) : musique de fond en boucle, fondu enchaîné · GM.ambiance(clé|null) : couche douce (feu, vent)
// GM.temporaire(clé) / GM.retour() : une musique le temps d'une page (chronique, marchand) puis on revient
// GM.jingle(clé) : victoire / défaite, une fois · GM.stop(s) · GM.bascule() · GM.bouton() : petit 🎵 en bas à droite
// Le navigateur interdit le son avant le premier toucher : on le lance au premier toucher. Coupé quand l'appli passe en arrière-plan.
// 14/11 (l'utilisateur : « un système de mise à jour comme toutes les applications : Mettre à jour ou Plus tard ») :
// chaque page vérifie version.txt (à l'ouverture, toutes les 2 min, au retour dans l'appli) ; si une version plus récente existe,
// un bandeau propose « Mettre à jour » (recharge la page avec une adresse neuve) ou « Plus tard ». Les parties en cours sont gardées.
// Duel, menu et Odyssée ont déjà leur propre bandeau (verifieVersion) : on ne double pas.
// 16/11 : le COMPTE et la SAUVEGARDE SUR LE SERVEUR (sauvegarde.js), chargés sur toutes les pages du jeu par ce lecteur commun
// 17/11 (l'utilisateur : « quand on reste appuyé sur une image », le menu du navigateur s'ouvre : télécharger, Google Lens…) :
// dans le jeu, un appui long sur une image ne fait plus rien (toutes les pages du jeu chargent ce fichier)
(() => { if (typeof document === 'undefined' || window.__sansMenuImage) return; window.__sansMenuImage = true;
  const st = document.createElement('style');
  st.textContent = 'img, svg, canvas, [style*="background-image"] { -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; -webkit-user-drag:none; }';
  (document.head || document.documentElement).appendChild(st);
  document.addEventListener('contextmenu', e => { const t = e.target; if (t && (t.tagName === 'IMG' || t.tagName === 'CANVAS' || t.tagName === 'svg' || (t.closest && t.closest('svg')))) e.preventDefault(); }, { capture:true });
  document.addEventListener('dragstart', e => { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); }, { capture:true });
})();
(() => { try { if (window.GS || document.getElementById('gs-script')) return; const v = (document.currentScript && (document.currentScript.src.match(/[?&]v=([^&]+)/) || [])[1]) || '1';
  if (!/^(\d{8}-\d{6}|[0-9a-f]{10})$/.test(v)) return; // pas sur les pages d'outils (prompts, calage…) ; 22/11 : les versions sont devenues des empreintes de 10 signes (publier.sh), le compte ne se chargeait plus
  const s = document.createElement('script'); s.id = 'gs-script'; s.src = 'sauvegarde.js?v=' + v; document.head.appendChild(s); } catch (e) {} })();
(() => { try {
  let moi = document.currentScript && (document.currentScript.src.match(/[?&]v=([^&]+)/) || [])[1];
  // 15/11 nuit : pages d'outils (prompts, R&D…) chargées avec ?v=1 : jamais de bandeau (il revenait en boucle) ; et l'adresse ?v= de la page compte aussi
  if (!moi || !/^\d{8}-\d{6}$/.test(moi)) return;
  { const pv = new URLSearchParams(location.search).get('v'); if (pv && pv > moi) moi = pv; }
  let plusTard = null;
  const verifie = () => { if (typeof window.verifieVersion === 'function' || document.getElementById('majbar')) return;
    fetch('version.txt?t=' + Date.now(), { cache:'no-store' }).then(r => r.ok ? r.text() : '').then(v => {
      v = (v || '').trim(); if (!v || v <= moi || v === plusTard || document.getElementById('majbar')) return;
      const b = document.createElement('div'); b.id = 'majbar';
      b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:8px;z-index:999;width:min(94%,520px);display:flex;gap:8px;align-items:center;background:#1b1838;color:#fff;border:2px solid #f3c96b;border-radius:14px;padding:8px 10px;box-shadow:0 6px 18px #000c;font:14px/1.3 Georgia,serif';
      b.innerHTML = '<span style="flex:1">✨ <b style="color:#f3c96b">Nouvelle version du jeu</b><br><small>Ta partie en cours est gardée.</small></span><button style="background:#2a2350;color:#fff;border:1px solid #4b4580;border-radius:10px;padding:6px 10px;font:inherit">Plus tard</button><button style="background:#f3c96b;color:#2b1d0a;border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:bold;animation:majPulseP 1.3s ease-in-out infinite">Mettre à jour</button>';
      const [tard, maj] = b.querySelectorAll('button');
      tard.onclick = () => { plusTard = v; b.remove(); };
      maj.onclick = () => { const q = new URLSearchParams(location.search); q.set('v', v); location.replace(location.pathname + '?' + q + location.hash); };
      document.body.appendChild(b);
    }).catch(() => {}); };
  addEventListener('load', () => setTimeout(verifie, 1500)); setInterval(verifie, 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) verifie(); });
} catch (e) {} })();
// 14/11 (l'utilisateur : « on peut bouger l'arrière-plan derrière la narration ») : quand une fenêtre ou une page de récit est ouverte,
// la page derrière ne défile plus (seule la fenêtre défile si son texte est long).
(() => { try {
  const st = document.createElement('style'); st.textContent = 'html.bloque, html.bloque body { overflow:hidden !important; overscroll-behavior:none; } .fenetre, .fenetre > div, #chron { overscroll-behavior:contain; }';
  document.head.appendChild(st);
  const maj = () => document.documentElement.classList.toggle('bloque', !!document.querySelector('.fenetre, #chron, #guide'));
  addEventListener('DOMContentLoaded', () => { maj(); new MutationObserver(maj).observe(document.body, { childList:true, subtree:true }); });
} catch (e) {} })();
// 22/11 (l'utilisateur : « une ligne Mise à jour dans les Paramètres avec un numéro, et un POINT ROUGE quand il y a quelque chose de nouveau ») :
// GuildeMaj connaît la version de la page (meta guilde-version) et celle en ligne (version.txt) ; le point rouge s'allume sur ⚙️ (barre du bas,
// tuile du grand menu, bouton flottant) tant qu'une mise à jour attend OU que la dernière version n'a pas encore été vue dans les Paramètres.
// « Quoi de neuf » : nouveautes.json, écrit par publier.sh à chaque mise en ligne.
window.GuildeMaj = (() => {
  const meta = document.querySelector && document.querySelector('meta[name="guilde-version"]');
  const ici = (meta && meta.getAttribute('content')) || '';
  let enLigne = '', neufV = ''; // neufV = la version de la dernière vraie nouveauté (nouveautes.json)
  const vu = () => { try { return localStorage.getItem('guilde-param-vu') || ''; } catch (e) { return ''; } };
  const fmt = v => /^\d{8}-\d{6}$/.test(v || '') ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)} · ${+v.slice(9, 11)} h ${v.slice(11, 13)}` : '—';
  const attend = () => !!(enLigne && ici && enLigne > ici);
  const nouveau = () => !!(neufV && vu() < neufV);
  const aVoir = () => attend() || nouveau() || (typeof appliAttend === 'function' && appliAttend());
  function points() {
    const on = aVoir();
    document.querySelectorAll('#bb-param, #gm-bouton, [data-param]').forEach(b => b.classList.toggle('point-rouge', on));
  }
  function verifie() { if (typeof fetch === 'undefined' || !ici) return;
    fetch('version.txt?t=' + Date.now(), { cache:'no-store' }).then(r => r.ok ? r.text() : '').then(t => { const v = String(t || '').trim(); if (/^\d{8}-\d{6}$/.test(v)) enLigne = v; points(); }).catch(() => {});
    fetch('nouveautes.json?t=' + Date.now(), { cache:'no-store' }).then(r => r.ok ? r.json() : []).then(l => { neufV = (l && l[0] && l[0].v) || ''; points(); }).catch(() => {});
    if (window.GuildeAppli) fetch('appli/version.txt?t=' + Date.now(), { cache:'no-store' }).then(r => r.ok ? r.text() : '').then(t => { appliEnLigne = String(t || '').trim(); points(); }).catch(() => {}); }
  if (document.head) { const st = document.createElement('style');
    st.textContent = '.point-rouge{position:relative}.point-rouge::after{content:"";position:absolute;top:3px;right:calc(50% - 22px);width:11px;height:11px;border-radius:50%;background:#ff3b3b;box-shadow:0 0 0 2px #120f24, 0 0 8px #ff3b3b;animation:prPulse 1.6s ease-in-out infinite;pointer-events:none}#gm-bouton.point-rouge::after{top:-2px;right:-2px}@keyframes prPulse{50%{transform:scale(1.25)}}';
    document.head.appendChild(st); }
  addEventListener('load', () => { points(); setTimeout(verifie, 1200); new MutationObserver(() => { if (document.querySelector('#bb-param:not(.point-rouge), [data-param]:not(.point-rouge)') && aVoir()) points(); }).observe(document.body, { childList:true, subtree:true }); });
  setInterval(verifie, 120000); document.addEventListener('visibilitychange', () => { if (!document.hidden) verifie(); });
  const majMaintenant = () => { const v = enLigne || ici, q = new URLSearchParams(location.search); q.set('v', v); location.replace(location.pathname + '?' + q + location.hash); };
  const marqueVu = () => { try { const m = [ici, neufV, vu()].sort().pop(); if (m) localStorage.setItem('guilde-param-vu', m); } catch (e) {} points(); };
  // le bloc en haut des Paramètres
  function bloc() {
    return `<div class="maj${attend() ? ' neuve' : ''}"><div data-k="ver"><b data-k="ver">📦 Version du jeu</b><br><small>${fmt(ici)}</small></div>${attend()
      ? `<button class="majb" data-k="maj">✨ Mettre à jour<br><small>version du ${fmt(enLigne)}</small></button>` : '<span class="ok">✅ À jour</span>'}</div>
      ${appliIci() ? `<div class="maj${appliAttend() ? ' neuve' : ''}"><div><b>📱 Appli Android</b><br><small>version ${appliIci()}</small></div>${appliAttend() ? `<a class="majb" href="appli/la-guilde-${appliEnLigne}.apk" style="text-decoration:none">📥 Nouvelle appli ${appliEnLigne}</a>` : '<span class="ok">✅ À jour</span>'}</div>` : ''}
      <details class="neuf"><summary>🆕 Quoi de neuf${nouveau() ? ' <span class="nv">nouveau</span>' : ''}</summary><div id="neuf-liste"><small>Chargement…</small></div></details>`;
  }
  function chargeNeuf() { const z = document.getElementById('neuf-liste'); if (!z) return;
    fetch('nouveautes.json?t=' + Date.now(), { cache:'no-store' }).then(r => r.ok ? r.json() : []).then(l => {
      z.innerHTML = (l || []).slice(0, 8).map(x => `<p><small style="color:#f3c96b">${fmt(x.v)}</small><br>${String(x.m || '').replace(/</g, '&lt;')}</p>`).join('') || '<small>Rien de noté pour le moment.</small>';
    }).catch(() => { z.innerHTML = '<small>Pas de réseau.</small>'; }); }
  // 22/11 : installer le jeu comme une appli (plein écran, sans barres du navigateur)
  let invite = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); invite = e; });
  const installe = () => !!window.GuildeAppli || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const appliIci = () => { try { return window.GuildeAppli ? String(GuildeAppli.version()) : ''; } catch (e) { return ''; } };
  let appliEnLigne = '';
  const vNum = v => String(v || '0').split('.').map(Number).reduce((t, x) => t * 1000 + (x || 0), 0);
  const appliAttend = () => !!(appliIci() && appliEnLigne && vNum(appliEnLigne) > vNum(appliIci()));
  const iphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function aideInstall() {
    if (installe()) return '<p>✅ Le jeu est déjà installé : tu l’as ouvert depuis son icône, sans les barres du navigateur.</p>';
    if (iphone()) return `<p><b>Sur iPhone (avec Safari)</b> :</p><ol style="padding-left:1.2em;line-height:1.6"><li>Touche le bouton <b>Partager</b> (le carré avec une flèche ⬆, en bas ou en haut de Safari).</li>
      <li>Descends et touche <b>« Sur l’écran d’accueil »</b>.</li><li>Touche <b>Ajouter</b>.</li></ol><p>L’icône de Moustache apparaît : ouvre le jeu par elle, il prend tout l’écran, sans les barres de Safari.</p>
      <p style="color:#c9c1ea;font-size:.88em">Avec Chrome sur iPhone : menu ⋯ puis « Ajouter à l’écran d’accueil ».</p>`;
    return `<p><b>Sur Android, le mieux : l’appli « La Guilde »</b> (plein écran, le bouton retour du téléphone marche dans le jeu).</p><a class="f" style="display:block;text-align:center;text-decoration:none" href="installer.html">📥 Télécharger l’appli Android</a><p style="margin-top:14px"><b>Ou sans appli</b>, l’icône sur l’écran d’accueil :</p>${invite ? '<button class="f" data-k="installer">📲 Installer maintenant</button>' : ''}<ol style="padding-left:1.2em;line-height:1.6"><li>Touche le menu <b>⋮</b> en haut à droite.</li>
      <li>Touche <b>« Installer l’application »</b> (ou « Ajouter à l’écran d’accueil »).</li><li>Confirme.</li></ol><p>L’icône de Moustache apparaît : ouvre le jeu par elle, il prend tout l’écran, sans les barres du navigateur.</p>`;
  }
  async function installer() { if (!invite) return false; invite.prompt(); const r = await invite.userChoice.catch(() => null); invite = null; return !!(r && r.outcome === 'accepted'); }
  return { appliIci, appliAttend, installe, aideInstall, installer, ici:() => ici, enLigne:() => enLigne, attend, aVoir, points, verifie, bloc, chargeNeuf, marqueVu, majMaintenant, fmt };
})();
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
    parametres() { // 18/11 : ENTRAINEMENTS (plus bas) = la liste des entraînements guidés, un par mode
      let z = document.getElementById('gm-param'); if (z) { z.remove(); return; }
      if (!document.getElementById('gm-param-css')) { const st = document.createElement('style'); st.id = 'gm-param-css'; st.textContent = `
        #gm-param{position:fixed;inset:0;z-index:950;background:#05030ccc;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Georgia,serif}
        #gm-param .p{width:100%;max-width:400px;max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain;background:#1d1838;border:1px solid #f3c96b66;border-radius:18px;padding:16px 16px 12px;color:#efe9ff;box-shadow:0 10px 30px #000c}
        #gm-param h2{margin:0 0 10px;color:#f3c96b;font-size:1.3em;text-align:center}
        #gm-param .l{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid #ffffff14}
        #gm-param .l>span{flex:1;min-width:0;display:flex;flex-direction:column;align-items:stretch} #gm-param input[type=range]{display:block;width:100% !important;max-width:100%;box-sizing:border-box;accent-color:#f3c96b;margin:6px 0 0} #gm-param .l>button{flex:none} #gm-param .neuf p, #gm-param .neuf{white-space:normal;overflow-wrap:anywhere} /* 22/11 (l'utilisateur) : la barre du son sous son titre, jamais derrière le bouton ; les nouveautés vont à la ligne */
        #gm-param .t{min-width:76px;border:none;border-radius:20px;padding:7px 12px;font:bold 14px Georgia;background:#3a3570;color:#fff} #gm-param .t.on{background:#f3c96b;color:#2a1a08}
        #gm-param .a{display:block;margin:12px 0 0;padding:11px;border-radius:12px;background:#2a2650;border:1px solid #4b4580;color:#fff;text-decoration:none;text-align:center}
        #gm-param button.a{width:100%;font:15px Georgia;cursor:pointer;white-space:normal;overflow-wrap:break-word} #gm-param .a.q{background:#4a1b24;border-color:#a3404a}
        #gm-param .maj{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:#ffffff0c;margin-bottom:6px} #gm-param .maj{flex-wrap:wrap} #gm-param .maj>div{flex:1 1 150px;min-width:0} #gm-param .maj small{white-space:nowrap} #gm-param .majb{flex:1 1 170px} /* 22/11 (l'utilisateur) : l'heure de la version n'est plus coupée ; le bouton passe dessous s'il manque de place */ #gm-param .maj small{color:#c9c1ea} #gm-param .maj .ok{color:#7ee07e;font-size:.9em}
        #gm-param .maj.neuve{border:1px solid #f3c96b;box-shadow:0 0 12px #f3c96b55} #gm-param .majb{border:none;border-radius:12px;padding:8px 10px;background:#f3c96b;color:#2a1a08;font:bold 14px Georgia;cursor:pointer} #gm-param .majb small{color:#5a3c08;font-weight:normal} #gm-param .majb{display:block;text-align:center;box-sizing:border-box;padding:12px 10px;transition:transform .1s;animation:majPulseP 1.3s ease-in-out infinite;-webkit-tap-highlight-color:transparent} #gm-param .majb:active{transform:scale(.94);filter:brightness(1.1)} @keyframes majPulseP{0%,100%{box-shadow:0 0 0 0 #f3c96baa}50%{box-shadow:0 0 0 7px #f3c96b00}} /* 23/11 : tout le bouton se touche, il bat doucement et s'enfonce au toucher */
        #gm-param .neuf{margin:0 0 4px;padding:4px 10px;border-radius:12px;background:#ffffff08} #gm-param .neuf summary{cursor:pointer;padding:4px 0} #gm-param .neuf p{margin:6px 0;font-size:.9em} #gm-param .nv{background:#ff3b3b;color:#fff;border-radius:8px;padding:0 6px;font-size:.75em}
        #gm-param .f{display:block;width:100%;margin-top:12px;padding:10px;border:none;border-radius:12px;background:#f3c96b;color:#2a1a08;font:bold 15px Georgia}`; document.head.appendChild(st); }
      const sonOn = () => localStorage.getItem('guilde-son') !== '0', rapide = () => localStorage.getItem('guilde-vitesse') === 'rapide';
      z = document.createElement('div'); z.id = 'gm-param';
      const dessine = () => { z.innerHTML = `<div class="p"><h2>⚙️ Paramètres</h2>${window.GuildeMaj ? GuildeMaj.bloc() : ''}
        <div class="l"><span>🎵 Musique<input type="range" min="0" max="100" value="${Math.round(volM() * 100)}" data-v="guilde-vol-musique"></span><button class="t ${actif ? 'on' : ''}" data-k="m">${actif ? 'Allumée' : 'Éteinte'}</button></div>
        <div class="l"><span>🔊 Bruitages<input type="range" min="0" max="100" value="${Math.round(volS() * 100)}" data-v="guilde-vol-sons"></span><button class="t ${sonOn() ? 'on' : ''}" data-k="s">${sonOn() ? 'Allumés' : 'Éteints'}</button></div>
        <div class="l"><span>⚡ Vitesse des animations</span><button class="t on" data-k="v">${rapide() ? 'Rapide' : 'Normale'}</button></div>
        <div class="l"><span>✅ Confirmer les actions en combat</span><button class="t ${localStorage.getItem('guilde-confirme-actions') !== 'non' ? 'on' : ''}" data-k="c">${localStorage.getItem('guilde-confirme-actions') !== 'non' ? 'Oui' : 'Non'}</button></div>
        ${window.GM_RECOMMENCER ? `<button class="a" data-k="rec">↺ ${window.GM_RECOMMENCER.t}</button>` : ''}        ${window.GM_QUITTER ? `<button class="a q" data-k="q">🚪 ${window.GM_QUITTER.t}</button>` : ''}
        ${window.Guide && Guide.dernier && Guide.dernier() ? '<button class="a" data-k="g">🐱 Le guide de cet écran</button>' : ''}
        ${window.GS ? `<button class="a" data-k="compte">☁ Mon compte et ma sauvegarde</button>` : ''}
        ${window.GuildeMaj && !GuildeMaj.installe() ? '<button class="a" data-k="inst">📲 Installer le jeu sur ton téléphone</button>' : ''}
        <button class="a" data-k="p">📜 Mes parties (le journal de chaque partie)</button>
        <button class="a" data-k="entr">🎓 Les entraînements de Moustache</button>
        ${localStorage.getItem('guilde-atelier') === '1' ? `<a class="a" href="a-valider.html">🛠 Pages de travail : à valider</a>${location.hostname === 'perso.elvanys.fr' ? '<a class="a" href="/">🛠 Le laboratoire perso</a>' : ''}` : ''}
        <a class="a" href="#" onclick="Object.keys(localStorage).filter(k => k.startsWith('guilde-guide-') || k === 'guilde-exp-guide').forEach(k => localStorage.removeItem(k)); this.textContent = '🐱 C’est fait : Moustache vous guidera à nouveau'; return false">🐱 Revoir les guides de Moustache</a>
        <button class="f" data-k="x">Fermer</button></div>`; };
      dessine(); document.body.appendChild(z); if (window.GuildeMaj) { GuildeMaj.chargeNeuf(); setTimeout(() => GuildeMaj.marqueVu(), 400); }
      z.addEventListener('click', e => {
        if (e.target === z) { z.remove(); return; }
        const k = e.target.dataset && e.target.dataset.k; if (!k) return;
        if (k === 'x') { z.remove(); return; }
        // 22/11 : les pages de travail sont cachées aux joueurs ; 7 touchers sur « Version du jeu » les montrent (ou les recachent) sur ce téléphone
        if (k === 'ver') { z._ver = (z._ver || 0) + 1; if (z._ver >= 7) { z._ver = 0; const on = localStorage.getItem('guilde-atelier') === '1'; localStorage.setItem('guilde-atelier', on ? '0' : '1'); dessine(); if (window.GuildeMaj) GuildeMaj.chargeNeuf(); } return; }
        if (k === 'maj') { GuildeMaj.majMaintenant(); return; } // 22/11 : la mise à jour depuis les Paramètres
        if (k === 'inst') { z.querySelector('.p').innerHTML = `<h2>📲 Installer le jeu</h2>${GuildeMaj.aideInstall()}<button class="f" data-k="x">Fermer</button>`; return; }
        if (k === 'installer') { GuildeMaj.installer().then(ok => { if (ok) z.remove(); }); return; }
        if (k === 'compte') { z.remove(); GS.ouvrir(); return; } // 16/11 (l'utilisateur : « dans Paramètres comme beaucoup de jeux ») : le compte, la sauvegarde, le code de récupération
        if (k === 'p') { z.remove(); Carnet.ouvrir(); return; }
        if (k === 'entr') { const f = (() => { try { return JSON.parse(localStorage.getItem('guilde-entrainements') || '{}'); } catch (e) { return {}; } })(); f.duel = f.duel || localStorage.getItem('guilde-tuto') === 'fait';
          z.querySelector('.p').innerHTML = `<h2>🎓 Les entraînements de Moustache</h2><p style="color:#c9c1ea;font-size:.88em;margin:0 0 6px">Une courte partie guidée pour chaque mode. Refais celle que tu veux, quand tu veux.</p>`
            + ENTRAINEMENTS.map(([c, n, h]) => h ? `<a class="a" href="${h}">${f[c] ? '✅' : '🎓'} ${n}</a>` : `<span class="a" style="opacity:.45">⏳ ${n} · bientôt</span>`).join('') + '<button class="f" data-k="x">Fermer</button>'; return; } // 18/11 : la liste des entraînements // 15/11 nuit : le carnet commun à tous les modes
        if (k === 'g') { z.remove(); Guide.rejoue(); return; } // 15/11 soir : Moustache réexplique l'écran en cours
        if (k === 'rec') { z.remove(); window.GM_RECOMMENCER.f(); return; } // 20/11 (l'utilisateur) : recommencer tout de suite (énigme du jour…), posé par la page
        if (k === 'q') { z.remove(); window.GM_QUITTER.f(); return; } // 14/11 : quitter une partie en cours (posé par la page du combat)
        if (k === 'm') api.bascule();
        if (k === 's') { localStorage.setItem('guilde-son', sonOn() ? '0' : '1'); api.son('ok'); }
        if (k === 'v') localStorage.setItem('guilde-vitesse', rapide() ? 'normale' : 'rapide');
        if (k === 'c') localStorage.setItem('guilde-confirme-actions', localStorage.getItem('guilde-confirme-actions') !== 'non' ? 'non' : 'oui'); // 15/11
        dessine(); if (window.GuildeMaj) GuildeMaj.chargeNeuf();
      });
      z.addEventListener('change', e => { const v = e.target.dataset && e.target.dataset.v; if (!v) return; localStorage.setItem(v, e.target.value);
        if (v === 'guilde-vol-musique') { [cur, amb].forEach(p => p && fondu(p, p.vol * volM(), .3)); } else api.son('ok'); });
    },
    bouton(o = {}) {
      if (document.getElementById('gm-bouton')) return;
      // 21/11 (l'utilisateur : « les Paramètres sont dans le menu principal, pas besoin de les voir partout ») : pas de ⚙️ flottant sur les pages
      // de collection (héros, profil, route des rangs, forge, pouvoirs, Panthéon) ; il reste dans les parties (Quitter, Mes parties, volumes)
      // 21/11 soir (2e retour : « dans l'Expédition je retrouve l'icône Paramètres ») : plus de ⚙️ flottant nulle part ; les Paramètres sont dans la
      // barre du bas du menu, et les combats ont leur propre bouton ⚙ dans leur barre (GM.parametres() reste appelable).
      // Gardé seulement là où il n'y a pas d'autre moyen de quitter en pleine partie (Fosse en temps réel, Campement / Invasion, épreuves).
      if (!/(fosse|campement|epreuves)\.html$/.test(location.pathname)) return;
      const st = document.createElement('style');
      st.textContent = '#gm-bouton{position:fixed;right:10px;top:calc(10px + env(safe-area-inset-top));z-index:900;width:38px;height:38px;border-radius:50%;border:1px solid #f3c96b88;background:#15132bcc;color:#f3c96b;font-size:18px;line-height:36px;text-align:center;padding:0;cursor:pointer}';
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
  // 22/11 (l'utilisateur : « le retour en haut à gauche, comme dans les jeux ») : UN bouton « ‹ Retour » commun, fixe en haut à gauche,
  // posé par l'écran d'accueil de chaque mode. GM.retour(adresse ou fonction, texte) le pose ; GM.retour(null) le retire (la partie commence).
  // La page reçoit la classe gm-retour-on : les titres qui en ont besoin se décalent (règle .gm-retour-on … dans la page).
  api.retour = (ou, texte) => {
    if (!document.body) { addEventListener('DOMContentLoaded', () => api.retour(ou, texte)); return; }
    let b = document.getElementById('gm-retour');
    if (!ou) { if (b) b.remove(); document.body.classList.remove('gm-retour-on'); return; }
    if (!b) { b = document.createElement('button'); b.id = 'gm-retour'; b.type = 'button';
      b.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top));left:8px;z-index:920;padding:6px 12px;border-radius:999px;border:1px solid #f3c96b88;background:#15132bdd;color:#f3c96b;font:inherit;font-size:15px;line-height:1.2;cursor:pointer;box-shadow:0 2px 8px #0008';
      document.body.appendChild(b); }
    b.textContent = '‹ ' + (texte || 'Retour');
    b.onclick = () => { api.son && api.son('ok'); if (typeof ou === 'function') ou(); else { if (/^menu\.html/.test(ou)) sessionStorage.setItem('guilde-dans-mode', '1'); location.href = ou; } }; // 26/11 (l'utilisateur) : un Retour vers le menu ne repasse pas par « Toucher pour entrer »
    document.body.classList.add('gm-retour-on');
  };
  // 22/11 : le BOUTON RETOUR DU TÉLÉPHONE dans l'appli Android (android/ du dépôt guilde-des-runes) : d'abord fermer ce qui est ouvert
  // par-dessus (paramètres, grand menu, fenêtre), sinon le « ‹ Retour » du jeu. Renvoie true si le jeu s'en est occupé.
  api.retourAppli = () => {
    for (const id of ['gm-param', 'grand-menu', 'grille-p', 'profil-menu']) { const z = document.getElementById(id); if (z) { z.remove(); return true; } }
    const x = document.querySelector('.fenetre .xferme, .fenetre .fh-x, .fen .x, #fen .x');
    if (x) { x.click(); return true; }
    const f = document.getElementById('fen'); if (f && f.textContent.trim()) { if (typeof fermer === 'function') fermer(); else f.innerHTML = ''; return true; }
    const r = document.getElementById('gm-retour'); if (r) { r.click(); return true; }
    return false;
  };
  return api;
})();

// 15/11 soir (l'utilisateur : « j'ai besoin que tu puisses voir tous les matchs ou jeux pour corriger les problèmes ») : LE CARNET DES PARTIES.
// Chaque partie finie envoie son journal au serveur du laboratoire perso (POST /api/hub/guilde/journal) ; Claude les relit depuis l'atelier.
// Seulement sur perso.elvanys.fr ; aucun compte : le pseudo tapé par le joueur. Un envoi raté ne gêne jamais le jeu.
function guildeJournal(mode, info) {
  try { Carnet.garde(mode, info || {}); } catch (e) { /* jamais bloquant */ }
  try {
    if (!/^(perso\.elvanys\.fr|localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    info = info || {};
    const pseudo = ((typeof AMIS !== 'undefined' && AMIS && AMIS.carte && AMIS.carte.pseudo) || localStorage.getItem('guilde-pseudo') || '').slice(0, 40);
    // 21/11 : la clé de la carte de joueur part avec le journal → le serveur compte ce jour comme « joué » (fidélité, colis du lundi)
    let cle = ''; try { cle = (typeof AMIS !== 'undefined' && AMIS && AMIS.carte && AMIS.carte.cle) || (JSON.parse(localStorage.getItem('guilde-carte') || 'null') || {}).cle || ''; } catch (e) { cle = ''; }
    const corps = JSON.stringify({ mode, heros:String(info.heros || ''), resultat:String(info.resultat || ''), joueur:pseudo, cle:cle || undefined,
      version:typeof VERSION !== 'undefined' ? VERSION : '', resume:info.resume || {}, journal:(info.journal || []).map(String).slice(-3000) });
    fetch('/api/hub/guilde/journal', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:corps, keepalive:corps.length < 60000 }).catch(() => {});
  } catch (e) { /* jamais bloquant */ }
}

// 15/11 nuit (l'utilisateur : « l'historique des combats du Duel, le même principe dans CHAQUE mode, pour bien voir les problèmes ») :
// LE CARNET COMMUN « 📜 Mes parties ». Chaque partie finie (guildeJournal) est aussi gardée sur le téléphone (les 60 dernières) ;
// on l'ouvre depuis ⚙️ dans tous les modes, ou par la pastille qui apparaît à la fin d'une partie. Filtre par mode, détail tour par tour,
// « Copier pour Claude » (une partie ou toutes celles du filtre). Les anciens duels (« guilde-parties » du Duel) y sont repris une fois.
const Carnet = (() => {
  const CLE = 'guilde-carnet', MAX = 60;
  const FAM = [ // [famille, nom affiché, modes du carnet]
    ['duel', '⚔️ Duels', ['duel', 'duel-ami', 'duel-deux', 'duel-semaine', 'enigme', 'tutoriel']],
    ['odyssee', '🗺️ Odyssée', ['odyssee', 'odyssee-combat', 'odyssee-route', 'odyssee-sansfin', 'grande-aventure', 'epreuve']],
    ['crypte', '🕯️ Crypte et Descente', ['crypte', 'descente-combat', 'descente']],
    ['defense', '🏰 Défense', ['defense', 'defense-sansfin']],
    ['fosse', '🕳️ Fosse', ['fosse']],
    ['chroniques', '📖 Chroniques', ['chroniques', 'chroniques-aventure']],
    ['autres', '⛵ Expéditions et Invasion', ['expedition', 'invasion']]];
  const NOMS = { duel:'Duel', 'duel-ami':'Duel contre un ami', 'duel-deux':'Duel à deux (un téléphone)', 'duel-semaine':'Duel de la semaine', enigme:'Énigme du jour', tutoriel:'Tutoriel',
    odyssee:'Odyssée', 'odyssee-combat':'Combat de l’Odyssée', 'odyssee-route':'Route du Titan', 'odyssee-sansfin':'Odyssée sans fin', 'grande-aventure':'Grande aventure', epreuve:'Épreuve',
    crypte:'Crypte aux Sceaux', 'descente-combat':'Combat de la Descente', descente:'Descente', defense:'Défense de la porte', 'defense-sansfin':'Défense sans fin', fosse:'Fosse aux Runes',
    chroniques:'Chroniques', 'chroniques-aventure':'Aventure des Chroniques', expedition:'Expédition', invasion:'Invasion' };
  const famDe = m => (FAM.find(f => f[2].includes(m)) || ['autres'])[0];
  const lit = () => { try { const l = JSON.parse(localStorage.getItem(CLE) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }; // 24/11 : jamais autre chose qu'une liste
  const ecrit = l => { try { localStorage.setItem(CLE, JSON.stringify(l.slice(0, MAX))); } catch (e) { // trop gros : on raccourcit les journaux
    try { localStorage.setItem(CLE, JSON.stringify(l.slice(0, 30).map(p => ({ ...p, journal:(p.journal || []).slice(-150) })))); } catch (e2) {} } };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const DATEF = iso => { try { return new Date(iso).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); } catch (e) { return ''; } };
  const gagne = r => /gagn|victoire|win/i.test(String(r || ''));
  const resTxt = r => gagne(r) ? 'GAGNÉ' : /perd|defaite|défaite|mort/i.test(String(r || '')) ? 'PERDU' : (r ? String(r).toUpperCase() : 'FINI');
  const resumeTxt = o => Object.entries(o || {}).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k} ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
  function reprendAnciens() { // une fois : les duels de l'ancien historique du Duel
    if (localStorage.getItem('guilde-carnet-repris')) return; localStorage.setItem('guilde-carnet-repris', '1');
    let v = []; try { v = JSON.parse(localStorage.getItem('guilde-parties') || '[]'); } catch (e) {}
    if (!v.length) return; const l = lit();
    v.forEach(p => l.push({ quand:p.quand, mode:'duel', heros:p.moi, resultat:p.resultat, version:p.version || '',
      resume:{ contre:p.ordi, tours:p.tours, pvMoi:p.pvMoi, pvContre:p.pvOrdi, salle:p.salle }, journal:p.journal || [] }));
    l.sort((a, b) => String(b.quand).localeCompare(String(a.quand))); ecrit(l);
  }
  function garde(mode, info) {
    reprendAnciens();
    const l = lit(); l.unshift({ quand:new Date().toISOString(), mode, heros:String(info.heros || ''), resultat:String(info.resultat || ''),
      version:typeof VERSION !== 'undefined' ? VERSION : '', resume:info.resume || {}, journal:(info.journal || []).map(String).slice(-400) });
    ecrit(l); pastille();
  }
  function pastille() { // à la fin d'une partie : une pastille discrète pour relire le journal tout de suite
    if (!document.body) return; let b = document.getElementById('carnet-pastille'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'carnet-pastille';
    b.style.cssText = 'position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:950;display:flex;gap:4px;align-items:center;background:#1b1838ee;border:1px solid #f3c96b88;border-radius:20px;padding:4px 6px 4px 12px;font:14px Georgia,serif;color:#f3c96b;box-shadow:0 4px 12px #000a';
    b.innerHTML = '<span style="cursor:pointer">📜 Journal de la partie</span><button style="background:none;border:none;color:#c9c1ea;font-size:16px;padding:2px 6px;cursor:pointer" aria-label="Fermer">✕</button>';
    b.firstChild.onclick = () => { b.remove(); ouvrir(null, 0); }; b.lastChild.onclick = () => b.remove();
    document.body.appendChild(b); setTimeout(() => b.isConnected && b.remove(), 60000);
  }
  let filtre = null, z = null;
  function styles() { if (document.getElementById('carnet-st')) return; const st = document.createElement('style'); st.id = 'carnet-st';
    st.textContent = `#carnet{position:fixed;inset:0;z-index:1001;background:#000b;display:flex;align-items:center;justify-content:center;padding:10px;font:15px/1.4 Georgia,serif}
      #carnet .p{width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;background:#1d1838;border:1px solid #f3c96b66;border-radius:18px;padding:14px;color:#efe9ff;box-shadow:0 10px 30px #000c}
      #carnet h2{margin:0 0 8px;color:#f3c96b;font-size:1.25em;text-align:center}
      #carnet .fil{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px} #carnet .fil button{border:1px solid #4b4580;background:#2a2650;color:#fff;border-radius:14px;padding:4px 9px;font:13px Georgia}
      #carnet .fil button.on{background:#f3c96b;color:#2a1a08;border-color:#f3c96b}
      #carnet .liste{overflow:auto;flex:1;min-height:80px} #carnet .ligne{display:block;width:100%;text-align:left;margin:3px 0;padding:8px 10px;border-radius:10px;border:1px solid #3a3570;background:#241f45;color:#efe9ff;font:14px Georgia}
      #carnet .ligne small{color:#b9b1e0} #carnet .j{overflow:auto;flex:1;background:#120f24;border-radius:10px;padding:8px;font:13px/1.45 system-ui,sans-serif;color:#ddd6fe}
      #carnet .j div{padding:2px 0;border-bottom:1px solid #ffffff0d} #carnet .doux{color:#b9b1e0;font-size:.88em;text-align:center;margin:4px 0}
      #carnet .bts{display:flex;gap:6px;margin-top:10px} #carnet .bts button{flex:1;padding:10px;border-radius:12px;border:1px solid #4b4580;background:#2a2650;color:#fff;font:14px Georgia}
      #carnet .bts button.f{background:#f3c96b;color:#2a1a08;border:none;font-weight:bold} #carnet .ok{color:#7dffb0;text-align:center;font-size:.9em;min-height:1.2em;margin:4px 0 0}`;
    document.head.appendChild(st); }
  const fenetre = h => { styles(); if (!z) { z = document.createElement('div'); z.id = 'carnet'; z.addEventListener('click', e => { if (e.target === z) fermer(); }); } z.innerHTML = `<div class="p">${h}</div>`; if (!z.isConnected) document.body.appendChild(z); };
  const fermer = () => { if (z) z.remove(); };
  const choisis = () => filtre ? lit().map((p, i) => ({ p, i })).filter(x => famDe(x.p.mode) === filtre) : lit().map((p, i) => ({ p, i }));
  function liste() {
    reprendAnciens(); const tout = lit(), l = choisis(), g = l.filter(x => gagne(x.p.resultat)).length;
    const chips = `<button data-f="" class="${filtre ? '' : 'on'}">Tout (${tout.length})</button>` + FAM.map(([k, n]) => { const c = tout.filter(p => famDe(p.mode) === k).length;
      return c ? `<button data-f="${k}" class="${filtre === k ? 'on' : ''}">${n} (${c})</button>` : ''; }).join('');
    fenetre(`<h2>📜 Mes parties</h2><div class="fil">${chips}</div>
      ${l.length ? `<p class="doux">${l.length} partie${l.length > 1 ? 's' : ''} · ${g} gagnée${g > 1 ? 's' : ''} · touche une partie pour la relire tour par tour</p>
      <div class="liste">${l.map(({ p, i }) => `<button class="ligne" data-i="${i}">${gagne(p.resultat) ? '🏆' : '💀'} <b>${esc(NOMS[p.mode] || p.mode)}</b> · ${esc(p.heros)}<br><small>${DATEF(p.quand)} · ${resTxt(p.resultat)} · ${(p.journal || []).length} lignes ›</small></button>`).join('')}</div>`
      : '<p class="doux">Aucune partie terminée ici pour l’instant. Chaque partie finie viendra s’ajouter à ce carnet.</p><div class="liste"></div>'}
      <div class="bts">${l.length ? '<button data-c="tout">📋 Copier tout (pour Claude)</button>' : ''}<button class="f" data-x="1">Fermer</button></div><p class="ok" id="carnet-ok"></p>`);
    z.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtre = b.dataset.f || null; liste(); });
    z.querySelectorAll('[data-i]').forEach(b => b.onclick = () => une(+b.dataset.i));
    const c = z.querySelector('[data-c]'); if (c) c.onclick = () => copie(l.map(x => x.p));
    z.querySelector('[data-x]').onclick = fermer;
  }
  function une(i) {
    const p = lit()[i]; if (!p) return liste();
    fenetre(`<h2>${gagne(p.resultat) ? '🏆' : '💀'} ${esc(NOMS[p.mode] || p.mode)}</h2>
      <p class="doux">${esc(p.heros)} · ${DATEF(p.quand)} · ${resTxt(p.resultat)}${p.version ? ' · v' + esc(p.version) : ''}</p>
      ${resumeTxt(p.resume) ? `<p class="doux" style="text-align:left">${esc(resumeTxt(p.resume))}</p>` : ''}
      <div class="j">${(p.journal || []).length ? p.journal.map(t => `<div>${esc(t)}</div>`).join('') : '<div>(Ce mode n’envoie qu’un résumé, pas de journal tour par tour.)</div>'}</div>
      <div class="bts"><button data-c="1">📋 Copier pour Claude</button><button data-r="1">‹ Retour</button><button class="f" data-x="1">Fermer</button></div><p class="ok" id="carnet-ok"></p>`);
    z.querySelector('[data-c]').onclick = () => copie([p]); z.querySelector('[data-r]').onclick = liste; z.querySelector('[data-x]').onclick = fermer;
  }
  function texte(l) {
    return `La Guilde des Runes · mes parties (${l.length})\n` + l.map(p => `\n=== ${DATEF(p.quand)} · ${NOMS[p.mode] || p.mode} · ${p.heros} · ${resTxt(p.resultat)}${p.version ? ' · v' + p.version : ''}\n`
      + (resumeTxt(p.resume) ? `Résumé : ${resumeTxt(p.resume)}\n` : '') + (p.journal || []).map(t => '  ' + t).join('\n')).join('\n');
  }
  function copie(l) {
    const t = texte(l), ok = m => { const e = document.getElementById('carnet-ok'); if (e) e.textContent = m; };
    const secours = () => { try { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); const r = document.execCommand('copy'); a.remove(); return r; } catch (e) { return false; } };
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => ok('Copié ✓ : colle-le dans la discussion avec Claude.'))
      .catch(() => ok(secours() ? 'Copié ✓ : colle-le dans la discussion avec Claude.' : 'Copie impossible sur ce téléphone.'));
  }
  function ouvrir(f, i) { // f : famille (duel, odyssee…) ; sans f : celle de la page ouverte ; i : ouvrir directement la partie n° i
    if (f === undefined || f === null) { const page = location.pathname.split('/').pop();
      f = /^duel/.test(page) ? 'duel' : /^odyssee|^epreuves/.test(page) ? 'odyssee' : /^crypte/.test(page) ? 'crypte' : /^defense/.test(page) ? 'defense' : /^fosse/.test(page) ? 'fosse'
        : /^chroniques/.test(page) ? 'chroniques' : /^expedition|^campement/.test(page) ? 'autres' : null; }
    reprendAnciens(); filtre = f && lit().some(p => famDe(p.mode) === f) ? f : null;
    if (typeof i === 'number') une(i); else liste();
  }
  return { garde, ouvrir, lit };
})();

// ----------------------------------------------------------------------------------------------- 17/11 nuit (l'utilisateur : « le scroll à travers les fenêtres, c'est partout ») :
// dès qu'une fenêtre plein écran est ouverte (voile sombre, fenêtre, page de récit, carnet, paramètres…), la page derrière ne défile plus.
// Règle commune à tous les modes : un élément « fixe » qui couvre tout l'écran, visible, touchable et avec un fond = une fenêtre.
(() => {
  if (typeof document === 'undefined' || window.__verrouFenetres) return; window.__verrouFenetres = true;
  const st = document.createElement('style');
  st.textContent = 'html.fen-ouverte, html.fen-ouverte body { overflow:hidden !important; }'; // 18/11 : sans « overscroll-behavior » sur le contenu (il empêchait la grille des portails de défiler)
  document.head.appendChild(st);
  const opaque = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return c && c !== 'transparent' && c !== 'none'; const p = m[1].split(',').map(Number); return p.length < 4 || p[3] > .25; };
  const estFenetre = el => {
    if (!(el instanceof HTMLElement) || el.id === 'barre-bas') return false;
    const s = getComputedStyle(el); if (s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05 || s.pointerEvents === 'none') return false;
    const r = el.getBoundingClientRect(); if (r.width < innerWidth * .95 || r.height < innerHeight * .9) return false;
    return opaque(s.backgroundColor) || (s.backgroundImage && s.backgroundImage !== 'none');
  };
  let prevu = false;
  const verifie = () => { prevu = false; let ok = false;
    const cand = []; for (const a of document.body.children) { cand.push(a); for (const b of a.children) { cand.push(b); for (const c of b.children) cand.push(c); } }
    document.querySelectorAll('.fen-voile').forEach(e => e.classList.remove('fen-voile'));
    for (const el of cand) if (estFenetre(el)) { ok = true; el.classList.add('fen-voile'); }
    document.documentElement.classList.toggle('fen-ouverte', ok); };
  const plus_tard = () => { if (!prevu) { prevu = true; setTimeout(verifie, 120); } };
  const go = () => { new MutationObserver(plus_tard).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class', 'style', 'hidden'] }); addEventListener('resize', plus_tard); ['animationend', 'transitionend'].forEach(t => document.addEventListener(t, plus_tard, true)); verifie(); }; // une fenêtre qui s'efface en fondu
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
})();

// 18/11 : les entraînements guidés de Moustache (un par mode ; null = pas encore fait). Ordre choisi avec l'utilisateur.
const ENTRAINEMENTS = [['duel', 'Le Duel (le tutoriel)', 'duel.html?tuto=1'], ['expedition', 'Les Expéditions', 'expedition.html?entrainement=1'], ['chroniques', 'Les Chroniques', 'chroniques.html?entrainement=1'], ['odyssee', 'L’Odyssée', null],
  ['crypte', 'La Crypte aux Sceaux', null], ['descente', 'La Descente', null], ['invasion', 'L’Invasion', null], ['defense', 'La Défense de la porte', null], ['fosse', 'La Fosse aux Runes', null]];

// 21/11 (l'utilisateur : « on garde la croix et on supprime le bouton Fermer ; s'il n'y a pas de croix, on en met une ») : pour TOUTES les fenêtres du jeu,
// une croix ✕ en haut à droite (elle ferme comme un toucher à côté de la fenêtre), et les boutons qui disent seulement « Fermer » disparaissent.
// Les fenêtres qu'on ne doit pas pouvoir fermer d'un toucher à côté (choix obligatoire) ne reçoivent pas de croix et gardent leurs boutons.
(function () {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const st = document.createElement('style');
  st.textContent = '.xferme { position:sticky; top:0; float:right; z-index:5; width:38px; height:38px; margin:-4px -6px 0 8px; border-radius:50%; border:1px solid #f3c96b; background:#1c1838; color:#f3c96b; font-size:18px; line-height:1; padding:0; cursor:pointer; box-shadow:0 2px 6px #0008; }';
  document.head.appendChild(st);
  const traite = () => {
    document.querySelectorAll('.fenetre > div, .voile-f > .fen, .fh-fen').forEach(f => {
      const voile = f.parentElement; if (!voile) return;
      const fermable = f.classList.contains('fh-fen') || (voile.getAttribute('onclick') || '').includes('event.target===this');
      if (!fermable) return;
      // le bouton « Fermer » de la fenêtre est caché (pas supprimé) : la croix le déclenche, pour garder ce qu'il fait en plus (redessiner…)
      let fb = null; f.querySelectorAll('button').forEach(b => { if (b.classList.contains('xferme') || b.classList.contains('fh-x')) return; if (/^fermer$/i.test(b.textContent.trim())) { fb = fb || b; b.style.display = 'none'; const p = b.parentElement; if (p && p.classList.contains('choixh') && ![...p.querySelectorAll('button')].some(x => x.style.display !== 'none')) p.style.display = 'none'; } });
      const fx = f.querySelector(':scope > .fh-x'); if (fx && fb && !fx.dataset.relie) { fx.dataset.relie = '1'; fx.onclick = e => { e.stopPropagation(); fb.click(); }; }
      // 27/11 (l'utilisateur : « une croix dessinée sous l'autre ») : si la fenêtre a déjà SA croix (✕ propre à la page), on n'en ajoute pas une deuxième
      const aSaCroix = [...f.querySelectorAll('button')].some(x => !x.classList.contains('xferme') && /^[✕×✖]$/.test(x.textContent.trim()));
      f.querySelectorAll(':scope > .xferme').forEach(x => { if (aSaCroix) x.remove(); });
      if (!aSaCroix && !f.querySelector(':scope > .fh-x, :scope > .xferme')) { const b = document.createElement('button'); b.className = 'xferme'; b.setAttribute('aria-label', 'Fermer'); b.textContent = '✕'; b.onclick = e => { e.stopPropagation(); const h = [...f.querySelectorAll('button')].find(x => x.style.display === 'none' && /^fermer$/i.test(x.textContent.trim())); if (h) h.click(); else voile.click(); }; f.prepend(b); }
    });
  };
  const go = () => { traite(); new MutationObserver(traite).observe(document.body, { childList:true, subtree:true }); };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
})();

// 22/11 (l'utilisateur voyait encore d'anciennes pages après les mises en ligne) : à l'ouverture d'une page, si une version plus récente existe
// (version.txt, jamais gardée en mémoire), la page se recharge UNE fois toute seule. Seulement au chargement : jamais en pleine partie.
(function () {
  try {
    const m = document.querySelector('meta[name="guilde-version"]'); if (!m || typeof fetch === 'undefined') return;
    const ici = m.getAttribute('content');
    fetch('version.txt?t=' + Date.now(), { cache:'no-store' }).then(r => r.ok ? r.text() : '').then(t => {
      const v = String(t || '').trim(); if (!v || v === ici || sessionStorage.getItem('guilde-recharge-' + v)) return;
      sessionStorage.setItem('guilde-recharge-' + v, '1'); location.reload();
    }).catch(() => {});
  } catch (e) {}
})();

// 26/11 (choix de l'utilisateur, « comme LoL ») : LES SKINS DE SAISON. Chaque saison de l'Almanach met un héros en avant et donne son costume
// au palier 30 (Saison 1 : Maëlle en hiver). Un skin porté remplace le portrait du héros PARTOUT (images et fonds), sans toucher au code des modes.
// guilde-skins = { maelle:'hiver' } (porté), guilde-skins-gagnes = ['maelle-hiver'] ; rien d'autre ne change en jeu.
(function () {
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return;
  let S = {}; try { S = JSON.parse(localStorage.getItem('guilde-skins') || '{}') || {}; } catch (e) {}
  const H = Object.keys(S).filter(h => S[h]); if (!H.length) return;
  const re = new RegExp('portraits/(' + H.join('|') + ')\\.webp(\\?[^"\')\\s]*)?', 'g');
  const remplace = s => s.replace(re, (m, h) => `portraits/skin-${h}-${S[h]}.webp?v=1`);
  const traite = el => { if (el.nodeType !== 1) return;
    const un = n => { if (n.tagName === 'IMG' && n.getAttribute('src') && re.test(n.getAttribute('src'))) { re.lastIndex = 0; n.setAttribute('src', remplace(n.getAttribute('src'))); } re.lastIndex = 0;
      const st = n.getAttribute && n.getAttribute('style'); if (st && st.includes('portraits/') && re.test(st)) { re.lastIndex = 0; n.setAttribute('style', remplace(st)); } re.lastIndex = 0; };
    un(el); if (el.querySelectorAll) el.querySelectorAll('img[src*="portraits/"], [style*="portraits/"]').forEach(un); };
  const go = () => { traite(document.body); new MutationObserver(L => L.forEach(m => { if (m.type === 'attributes') traite(m.target); else m.addedNodes.forEach(traite); })).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['src', 'style'] }); };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
})();
