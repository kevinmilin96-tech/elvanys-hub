// 22/11 (idée de l'utilisateur, page configurateur-proposition.html validée « d'accord avec tous les points ») :
// LE CONFIGURATEUR DE PARTIE, commun à tous les jeux. Trois écrans à la suite : 1. le mode (grandes cartes illustrées, la carte
// touchée s'affiche en grand avec sa description, « ▶ Reprendre » seulement sur le mode qui a une partie en cours) → 2. le héros
// (retenu par jeu : c'est le jeu qui le garde) → 3. les options du mode → ▶ Jouer.
// Chaque jeu ne donne que sa description (CFG.ouvre(def)) :
//   def = { jeu, titre, retour:'menu.html', regles:'regles()', heros:()=>html des boutons, fiche:()=>html,
//           modes:[{ k, e, n, img, desc:()=>html, pas:()=>[texte…], partie:()=>null|{ texte, reprendre:'code', abandonner:'code' } }],
//           options:(mode)=>[{ k, titre, aide?, verrou?:texte, choix?:[{ v, n, d? }], def? }],
//           resume:(mode, opts)=>texte, lancer:(mode, opts)=>{} }
// Le dernier mode et les options choisies sont gardés sur le téléphone (clé guilde-config-<jeu>).
(function () {
  const css = document.createElement('style');
  css.textContent = `
  .cfg-boite { max-width:520px; margin:0 auto; container-type:inline-size; padding:0 2cqw; }
  .cfg { padding-bottom:30cqw; }
  .cfg .haut { display:flex; justify-content:space-between; align-items:center; padding:2cqw 0; font-size:3.4cqw; }
  .cfg .haut a, .cfg .haut button { color:var(--doux, #c9c1ea); background:none; border:0; font-size:3.4cqw; text-decoration:none; cursor:pointer; }
  .cfg h1 { text-align:center; color:var(--or, #ffd98a); margin:1cqw 0; font-size:6.4cqw; font-family:Georgia, serif; }
  .cfg .fil { display:flex; justify-content:center; gap:1.5cqw; margin:1cqw 0 1.5cqw; }
  .cfg .fil span { width:15cqw; height:1.4cqw; border-radius:1cqw; background:#ffffff22; }
  .cfg .fil span.on { background:var(--or, #ffd98a); } .cfg .fil span.fait { background:#5fb84a; }
  .cfg .etape { text-align:center; color:var(--doux, #c9c1ea); font-size:3.3cqw; margin-bottom:2.5cqw; }
  .cfg .modes { display:flex; gap:2cqw; }
  .cfg .mode { flex:1; border-radius:3.5cqw; overflow:hidden; border:2px solid #ffffff22; background:#00000055; position:relative; cursor:pointer; padding:0; color:inherit; text-align:center; }
  .cfg .mode img { width:100%; height:24cqw; object-fit:cover; display:block; filter:brightness(.7) saturate(.8); }
  .cfg .mode b { display:block; padding:1.4cqw 1cqw 2cqw; font-size:3cqw; }
  .cfg .mode.on { border-color:var(--or, #ffd98a); box-shadow:0 0 4cqw #ffd98a55; } .cfg .mode.on img { filter:none; }
  /* 22/11 (l'utilisateur : « le bouton Reprendre gêne en haut à droite ») : petite pastille posée en bas de l'image, juste au-dessus du nom */
  .cfg .mode .rep { position:absolute; top:19.5cqw; left:50%; transform:translateX(-50%); white-space:nowrap; background:#163a2aee; border:1px solid #5fdc8f; color:#7ff0a8; border-radius:3cqw; font-size:2.4cqw; padding:.3cqw 1.8cqw; font-weight:bold; z-index:2; }
  .cfg .grand { border-radius:4cqw; overflow:hidden; border:2px solid var(--or, #ffd98a); margin-top:3cqw; background:#1a1230; animation:cfgEntre .35s ease-out; }
  .cfg .grand img { width:100%; height:44cqw; object-fit:cover; display:block; }
  .cfg .grand .t { padding:2.5cqw 3cqw 3cqw; } .cfg .grand .t b { color:var(--or, #ffd98a); font-size:4.4cqw; }
  .cfg .grand .t p { margin:1.2cqw 0 0; font-size:3.3cqw; color:#ddd3ff; line-height:1.35; }
  .cfg .pas { display:inline-block; background:#ffffff14; border-radius:2cqw; padding:.5cqw 2cqw; margin:1.4cqw 1.2cqw 0 0; font-size:2.9cqw; }
  @keyframes cfgEntre { from { opacity:.3; transform:scale(.96); } to { opacity:1; transform:none; } }
  .cfg .heros { display:grid; grid-template-columns:repeat(3, 1fr); gap:2cqw; }
  .cfg .heros button { background:#221d42; border:2px solid #4b4580; border-radius:3cqw; padding:2cqw 1cqw; font-size:3.2cqw; color:#efe6ff; cursor:pointer; }
  .cfg .heros button.on { border-color:var(--or, #ffd98a); background:#3a2f12; } .cfg .heros button:disabled { opacity:.35; }
  .cfg .heros img { width:16cqw; height:16cqw; border-radius:50%; object-fit:cover; display:block; margin:0 auto 1cqw; }
  .cfg .heros small { display:block; font-size:2.5cqw; color:var(--doux, #c9c1ea); }
  .cfg .fiche { display:block !important; text-align:left; background:#ffffff0d; border-radius:3cqw; padding:2.5cqw 3cqw; margin-top:3cqw; font-size:3.2cqw; color:#ddd3ff; line-height:1.4; }
  .cfg .opt { background:#ffffff0c; border:1px solid #ffffff1c; border-radius:3cqw; padding:2.4cqw 3cqw; margin-bottom:2.4cqw; }
  .cfg .opt h4 { margin:0 0 1.5cqw; font-size:3.7cqw; color:var(--or, #ffd98a); } .cfg .opt h4 i { font-style:normal; font-weight:normal; color:var(--doux, #c9c1ea); font-size:2.9cqw; }
  .cfg .opt .aide { font-size:3cqw; color:var(--doux, #c9c1ea); line-height:1.35; }
  .cfg .ch { display:flex; gap:1.6cqw; flex-wrap:wrap; }
  .cfg .ch button { background:#ffffff12; border:1.5px solid #ffffff2a; border-radius:2.5cqw; padding:1.6cqw 2.6cqw; font-size:3.1cqw; color:inherit; cursor:pointer; }
  .cfg .ch button.on { border-color:var(--or, #ffd98a); background:#3a2f12; color:#ffe9b0; font-weight:bold; }
  .cfg .ch-d { margin-top:1.6cqw; font-size:3cqw; color:#ddd3ff; line-height:1.35; }
  .cfg-bas { position:fixed; left:0; right:0; bottom:0; z-index:60 !important; padding:2.5cqw 3cqw calc(2.5cqw + env(safe-area-inset-bottom)); background:linear-gradient(transparent, #0d0a18 30%); z-index:20; }
  .cfg-bas > div { max-width:520px; margin:0 auto; container-type:inline-size; }
  .cfg-bas .recap { background:#ffffff10; border-radius:3cqw; padding:1.6cqw 3cqw; font-size:3cqw; margin-bottom:2cqw; color:#ddd3ff; }
  .cfg-bas button { display:block; width:100%; border-radius:4cqw; padding:3.2cqw; font-size:4.6cqw; font-weight:bold; border:0; cursor:pointer; margin-top:1.6cqw; }
  .cfg-bas .go { background:linear-gradient(#f7b23a, #e07a12); color:#2a1400; }
  .cfg-bas .go2 { background:#163a2a; border:2px solid #5fdc8f; color:#7ff0a8; }
  .cfg-bas .go3 { background:#ffffff18; color:#efe6ff; }
  .cfg-bas .go:disabled { background:#ffffff18; color:var(--doux, #c9c1ea); font-size:3.6cqw; }
  .cfg-bas .lig { display:flex; gap:2cqw; align-items:center; } .cfg-bas .lig .go2 { flex:1; text-align:left; font-size:3.6cqw; padding:2.4cqw 3cqw; } .cfg-bas .lig .x { width:auto; flex:none; background:none; color:var(--doux, #c9c1ea); font-size:4cqw; padding:2cqw; margin:0; }
  .cfg .ch button:disabled { opacity:.45; }
  .cfg-bas .ab { background:none; color:var(--doux, #c9c1ea); font-size:3cqw; font-weight:normal; text-decoration:underline; padding:1cqw; margin:0; }`;
  document.head.appendChild(css);

  const CFG = window.CFG = { def:null, etape:1, mode:null, opts:{} };
  const cle = () => 'guilde-config-' + CFG.def.jeu;
  const garde = () => { try { localStorage.setItem(cle(), JSON.stringify({ mode:CFG.mode, opts:CFG.opts })); } catch (e) {} };
  const leMode = () => CFG.def.modes.find(m => m.k === CFG.mode) || CFG.def.modes[0];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const bip = k => { try { if (typeof son === 'function') son(k); } catch (e) {} };

  // ouvre le configurateur (def), en gardant l'étape si on redessine le même jeu ; o.mode = mode présélectionné, o.etape = étape
  CFG.ouvre = function (def, o) {
    o = o || {};
    if (!CFG.def || CFG.def.jeu !== def.jeu) {
      CFG.etape = 1; let m = null;
      try { m = JSON.parse(localStorage.getItem('guilde-config-' + def.jeu) || 'null'); } catch (e) {}
      CFG.mode = m && def.modes.some(x => x.k === m.mode) ? m.mode : def.modes[0].k; CFG.opts = (m && m.opts) || {};
    }
    CFG.def = def;
    if (o.mode && def.modes.some(x => x.k === o.mode)) { CFG.mode = o.mode; CFG.etape = 1; }
    if (o.etape) CFG.etape = o.etape;
    CFG.dessine();
  };
  CFG.mode_ = k => { if (CFG.mode !== k) bip('choisir'); CFG.mode = k; garde(); CFG.dessine(); };
  // un mode sans choix du héros (sansHeros : l'énigme, le tutoriel) saute l'étape 2
  CFG.va = n => { const M = leMode(); if (n === 2 && M.sansHeros) n = CFG.etape === 3 ? 1 : 3; CFG.etape = n; bip('choisir'); CFG.dessine(); try { window.scrollTo(0, 0); } catch (e) {} };
  CFG.choix = (k, v) => { const o = CFG.opts[CFG.mode] = CFG.opts[CFG.mode] || {}; o[k] = v; garde(); bip('choisir'); CFG.dessine(); };
  // les options du mode, avec leur valeur (gardée, ou celle par défaut)
  CFG.valeurs = function () {
    const L = CFG.def.options ? CFG.def.options(CFG.mode) : [], o = CFG.opts[CFG.mode] || {}, r = {};
    L.forEach(x => { if (!x.choix) return; const v = o[x.k]; const ok = x.choix.filter(c => !c.dis), t = ok.find(c => String(c.v) === String(v)); r[x.k] = t ? t.v : (x.def !== undefined && ok.some(c => c.v === x.def) ? x.def : (ok[0] || x.choix[0]).v); });
    return r;
  };
  CFG.jouer = function () { const v = CFG.valeurs(); bip('melange'); CFG.ferme(); CFG.def.lancer(CFG.mode, v); };
  // quand le jeu s'affiche : la barre du bas disparaît, et au retour on repart du choix du mode
  CFG.ferme = function () { const b = document.getElementById('cfg-bas'); if (b) b.remove(); CFG.etape = 1; };

  CFG.dessine = function () {
    const D = CFG.def, M = leMode(), E = CFG.etape, jeu = document.getElementById(D.racine || 'jeu');
    const fil = `<div class="fil">${(M.sansHeros ? [1, 3] : [1, 2, 3]).map(i => `<span class="${i < E ? 'fait' : i === E ? 'on' : ''}"></span>`).join('')}</div>`;
    const retour = E === 1 ? `<a href="${D.retour || 'menu.html'}">‹ Retour</a>` : `<button onclick="CFG.va(${E - 1})">‹ ${E === 2 || M.sansHeros ? 'Mode' : 'Héros'}</button>`;
    let corps = '', bas = '';
    // une partie en cours (partie) ou plusieurs (parties : les emplacements de l'Odyssée) ; un mode fermé (verrou) ne va pas plus loin
    const parties = M.parties ? M.parties() : M.partie && M.partie() ? [M.partie()] : [], partie = parties[0] || null, verrou = M.verrou ? M.verrou() : null;
    const enCours = m => (m.parties ? m.parties().length : m.partie && m.partie()) ? '<span class="rep">▶ En cours</span>' : '';
    if (E === 1) {
      corps = `<div class="etape">1 · Choisis ton mode</div>
        <div class="modes">${D.modes.map(m => `<button class="mode ${m.k === M.k ? 'on' : ''}" onclick="CFG.mode_('${m.k}')">${enCours(m)}<img src="${m.img}" alt="" onerror="this.style.visibility='hidden'"><b>${m.e} ${esc(m.n)}</b></button>`).join('')}</div>
        <div class="grand" id="cfg-grand"><img src="${M.img}" alt="" onerror="this.remove()"><div class="t"><b>${M.e} ${esc(M.n)}</b><p>${M.desc ? M.desc() : ''}</p>${(M.pas ? M.pas() : []).map(p => `<span class="pas">${p}</span>`).join('')}${parties.length === 1 ? `<span class="pas" style="background:#163a2a;color:#7ff0a8">Partie en cours : ${partie.texte}</span>` : ''}${verrou ? `<span class="pas" style="background:#3a1a1a;color:#ffb3a8">🔒 ${verrou}</span>` : ''}</div></div>`;
      bas = verrou && !parties.length ? `<button class="go" disabled>🔒 ${verrou}</button>`
        : parties.length > 1 ? parties.map(x => `<div class="lig"><button class="go2" onclick="CFG.ferme();${x.reprendre}">▶ ${x.texte}</button><button class="x" onclick="if(confirm('Effacer cette partie ? Elle sera perdue.')){${x.abandonner};CFG.dessine()}">✕</button></div>`).join('') + (verrou ? '' : `<button class="go3" onclick="CFG.va(2)">Nouvelle partie ›</button>`)
        : partie ? `<button class="go2" onclick="CFG.ferme();${partie.reprendre}">▶ Reprendre</button><button class="go3" onclick="CFG.va(2)">Nouvelle partie ›</button><button class="ab" onclick="if(confirm('Abandonner cette partie ? Elle sera effacée.')){${partie.abandonner};CFG.dessine()}">✕ abandonner la partie en cours</button>`
        : `<button class="go" onclick="CFG.va(2)">Suivant ›</button>`;
    } else if (E === 2) {
      corps = `<div class="etape">2 · Avec qui ?</div><div class="heros">${D.heros()}</div>${D.fiche ? `<div class="fiche">${D.fiche()}</div>` : ''}`;
      bas = `<button class="go" onclick="CFG.va(3)">Suivant ›</button>`;
    } else {
      const L = D.options ? D.options(M.k) : [], V = CFG.valeurs();
      corps = `<div class="etape">3 · Les options</div>${L.length ? L.map(x => {
        if (!x.choix) return `<div class="opt"><h4>${x.titre}${x.verrou ? ` <i>🔒 ${x.verrou}</i>` : ''}</h4>${x.aide ? `<div class="aide">${x.aide}</div>` : ''}</div>`;
        const c = x.choix.find(c => c.v === V[x.k]);
        return `<div class="opt"><h4>${x.titre}</h4>${x.aide ? `<div class="aide" style="margin-bottom:1.6cqw">${x.aide}</div>` : ''}<div class="ch">${x.choix.map(c => `<button class="${c.v === V[x.k] ? 'on' : ''}" ${c.dis ? 'disabled' : ''} onclick='CFG.choix(${JSON.stringify(x.k)}, ${JSON.stringify(c.v)})'>${c.dis ? '🔒 ' : ''}${c.n}</button>`).join('')}</div>${c && c.d ? `<div class="ch-d">${c.d}</div>` : ''}</div>`;
      }).join('') : '<div class="opt"><div class="aide">Pas d’option pour ce mode.</div></div>'}`;
      bas = `<div class="recap">${D.resume ? D.resume(M.k, V) : ''}</div>${partie && !D.plusieurs ? '<div class="recap" style="color:#ffb3a8">⚠ Ta partie en cours sera abandonnée.</div>' : ''}<button class="go" onclick="CFG.jouer()">▶ Jouer</button>`;
    }
    jeu.innerHTML = `<div class="cfg-boite"><div class="cfg"><div class="haut">${retour}<span></span><button onclick="${D.regles || ''}">❓ Règles</button></div><h1>${D.titre}</h1>${fil}${corps}</div></div>`;
    let b = document.getElementById('cfg-bas');
    if (!b) { b = document.createElement('div'); b.id = 'cfg-bas'; b.className = 'cfg-bas'; document.body.appendChild(b); }
    b.innerHTML = `<div>${bas}</div>`;
  };
})();
