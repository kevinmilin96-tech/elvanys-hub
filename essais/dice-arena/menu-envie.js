// =============================================================================================== LE MENU RANGÉ PAR ENVIE (22/11)
// Validé par l'utilisateur (carte de l'application, 22/11) : au 1er étage, 4 PORTES rangées par envie + un panneau « ☀ Aujourd'hui ».
//   ⚡ Jouer vite (≤ 10 min) · 🗺 Partir à l'aventure (30-45 min, avec reprise) · 👥 Entre amis · 🏛 Ma Guilde
// Aucun mode n'est retiré : chaque porte mène à un étage qui reprend les portails d'avant.
// Validé le 22/11 : c'est le menu de tous ; menu.html?envie=0 revient à l'ancien (retenu sur le téléphone), ?envie=1 le remet.
const MENU_ENVIE = (() => {
  try {
    const q = new URLSearchParams(location.search).get('envie');
    if (q === '1' || q === '0') localStorage.setItem('guilde-menu-envie', q);
    return localStorage.getItem('guilde-menu-envie') !== '0'; // 22/11 : validé par l'utilisateur (« C'est ok pour moi ») → par défaut pour tous
  } catch (e) { return false; }
})();

// ------------------------------------------------------------------------------------- ce qui est fait aujourd'hui
const ENV_J = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
const envJourLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const envJourUTC = () => new Date().toISOString().slice(0, 10);
// 22/11 (testeurs) : les noms des défis du jour de la Défense (même liste et même calcul que defense-moteur.js, DEFIS_D)
const ENV_DEFIS_D = ['Gagner avec 4 canons au plus', 'Gagner sans jouer une seule carte', 'Poser au moins 6 pièges', 'Aucun dégât pendant la dernière vague', 'Placer au moins 5 coups de héros'];
const envDefiD = () => { const d = new Date(); return ENV_DEFIS_D[Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) % ENV_DEFIS_D.length]; };
const envIleDuJour = () => ['brulees', 'givre', 'abime'][Math.floor(Date.now() / 864e5) % 3];

// chaque rendez-vous : [clé, émoji, nom, détail, fait ?, action]
function envieRendezVous() {
  const L = [];
  const eni = ENV_J('guilde-enigmes', {})[envJourLocal()] || {};
  const eniNiv = (new Date().getDay() + 6) % 7 + 1, eniEt = ` · ${'★'.repeat(eniNiv)}${'☆'.repeat(7 - eniNiv)} ${['', 'très facile', 'facile', 'moyenne', 'moyenne', 'corsée', 'difficile', 'redoutable'][eniNiv]}`; // même règle que enigme.js : lundi 1★ → dimanche 7★
  L.push(['enigme', '🧩', 'L’énigme du jour', (eni.ok ? 'Résolue' : eni.essais ? `${eni.essais} essai(s)` : 'Un coup parfait à trouver') + eniEt, !!eni.ok, "envieVa('duel.html?enigme=1')"]);
  const cr = (ENV_J('guilde-crypte', {}).jours || {})[envJourLocal()];
  L.push(['crypte', '🪦', 'La crypte du jour', cr ? `Score ${cr.score}` : 'La même crypte pour tout le monde', !!cr, "envieVa('crypte.html')"]);
  const ile = ENV_J('guilde-odyssee-records', []).find(r => r.graine === 'jour-' + envJourUTC());
  const ileN = ({ brulees:'les Terres brûlées', givre:'l’île du Givre', abime:'l’Abîme du Vide' })[envIleDuJour()];
  L.push(['ile', '🏝', 'L’île du jour', ile ? `${ile.gagne ? 'Gagnée' : 'Jouée'} · score ${ile.score}` : `Aujourd’hui : ${ileN}`, !!ile, 'envieIleDuJour()']);
  const vj = (ENV_J('guilde-expedition4-meta', {}) || {}).jour;
  const vf = vj && vj.j === envJourUTC() && vj.essais > 0;
  L.push(['voyage', '⛵', 'Le voyage du jour', vf ? `Meilleur score ${vj.best}` : 'Une carte, un boss pour tous', !!vf, "envieVa('expedition-v4.html?jour=1')"]);
  const de = ENV_J('guilde-defense-etoiles', {})[envJourUTC()];
  const defi = typeof defiDuJourD === 'function' ? defiDuJourD().n : envDefiD();
  L.push(['defense', '🏰', 'Le défi de la Défense', de ? '★'.repeat(de) + ' · ' + defi : 'Défi : ' + defi, !!de, "envieVa('defense.html')"]);
  const sem = typeof regleDeLaSemaine === 'function' ? regleDeLaSemaine() : null, sc = sem && ENV_J('guilde-sceaux', {})[sem.semaine];
  L.push(['semaine', '🔏', 'Le Duel de la semaine', sc ? 'Sceau gagné cette semaine' : sem ? `« ${sem.n} »` : 'Une règle nouvelle chaque semaine', !!sc, "envieVa('duel.html?semaine=1')"]);
  if (typeof lireQuetes === 'function') {
    const Q = lireQuetes(), f = Q.j.filter(q => q.fait).length, r = Q.j.filter(q => q.fait && q.recup === false).length;
    L.push(['quetes', '📜', 'Les quêtes du jour', r ? `${f}/${Q.j.length} · 🎁 ${r} à récupérer` : `${f}/${Q.j.length} faites`, f >= Q.j.length && !r, "envieVa('route.html#quetes')"]);
  }
  if (typeof butinCalcule === 'function') {
    const g = butinCalcule(), plein = g.h >= 12;
    L.push(['butin', '🎁', 'Le butin de la Guilde', plein ? 'Plein : à ramasser !' : g.h >= 1 ? `${Math.floor(g.h)} h sur 12 : tu peux ramasser` : (localStorage.getItem('guilde-butin-jour') === envJourLocal() ? 'Ramassé aujourd’hui, il se remplit' : 'Il se remplit : reviens dans 1 h'), localStorage.getItem('guilde-butin-jour') === envJourLocal() && g.h < 1, 'envieButin()']);
  }
  return L;
}
function envieVa(h) { try { sessionStorage.setItem('guilde-dans-mode', '1'); } catch (e) {} location.href = h; }
function envieIleDuJour() { const p = document.getElementById('env-auj'); if (p) p.remove(); odyMode = 'jour'; odySlot = null; if (location.hash === '#odyssee') montre('odyssee'); else location.hash = 'odyssee'; }
function envieButin() { if (typeof butinRamasse === 'function') butinRamasse(); try { localStorage.setItem('guilde-butin-jour', envJourLocal()); } catch (e) {} if (typeof GM !== 'undefined') GM.son('choisir'); const rm = document.getElementById('rangmenu'); if (rm && typeof bandeauRangHTML === 'function') rm.innerHTML = bandeauRangHTML(); envieAujourdhui(true); envieBandeau(); }

// le bouton « ☀ Aujourd'hui » au-dessus des portes (seulement au 1er étage)
function envieBandeau() {
  let b = document.getElementById('env-bandeau');
  if (!MENU_ENVIE || (typeof courant !== 'undefined' && courant)) { if (b) b.remove(); return; }
  const L = envieRendezVous(), f = L.filter(x => x[4]).length;
  if (!b) { b = document.createElement('button'); b.id = 'env-bandeau'; b.onclick = () => envieAujourdhui(); const car = document.getElementById('car'); car.parentNode.insertBefore(b, car); }
  b.innerHTML = `<span class="sol"><img src="ui/aujourdhui.webp?v=1" alt="" onerror="this.replaceWith('☀')"></span><span class="t"><b>Aujourd’hui</b><small>${f === L.length ? 'Tout est fait, bravo !' : `${f} sur ${L.length} faits · ${L.filter(x => !x[4]).slice(0, 3).map(x => x[1]).join(' ')} t’attendent`}</small></span><span class="n">${f}/${L.length}</span>`;
}
// le panneau
function envieAujourdhui(rouvre) {
  let p = document.getElementById('env-auj'); if (p) { p.remove(); if (!rouvre) return; }
  const L = envieRendezVous(), f = L.filter(x => x[4]).length;
  p = document.createElement('div'); p.id = 'env-auj';
  p.innerHTML = `<div class="boite"><button class="x" onclick="envieAujourdhui()" aria-label="Fermer">✕</button>
    <h2><img src="ui/aujourdhui.webp?v=1" alt="" style="width:38px;height:38px;vertical-align:middle;margin-right:6px">Aujourd’hui</h2><p class="sous">Les rendez-vous du jour : la même chose pour tous, une nouvelle chaque jour. <b>${f}/${L.length}</b></p>
    ${(() => { const RAP = ['quetes', 'enigme', 'semaine', 'butin'] /* 22/11 : les quêtes du jour sont devenues des gestes courts → « Rapide » */, ligne = ([k, e, n, d, fait, a]) => `<button class="${fait ? 'fait' : ''}" onclick="${a}"><span class="e">${e}</span><span class="t"><b>${n}</b><small>${d}</small></span><span class="c">${fait ? '✓' : '›'}</span></button>`;
      return `<h3 class="grp">⚡ Rapide <small>quelques minutes</small></h3><div class="liste">${L.filter(x => RAP.includes(x[0])).map(ligne).join('')}</div><h3 class="grp">🗺 Si tu as le temps <small>une vraie partie</small></h3><div class="liste">${L.filter(x => !RAP.includes(x[0])).map(ligne).join('')}</div>`; })()}
    <div class="liste" style="display:none">${L.map(([k, e, n, d, fait, a]) => `<button class="${fait ? 'fait' : ''}" onclick="${a}"><span class="e">${e}</span><span class="t"><b>${n}</b><small>${d}</small></span><span class="c">${fait ? '✓' : '›'}</span></button>`).join('')}</div></div>`;
  p.onclick = ev => { if (ev.target === p) envieAujourdhui(); };
  document.body.appendChild(p); if (typeof GM !== 'undefined') GM.son('clic');
}

// ------------------------------------------------------------------------------------- les étages
function envieInstalle(E, PRO) {
  if (!MENU_ENVIE) return;
  Object.assign(PRO, {
    vite:['⚡', 'linear-gradient(180deg, #2a1a5c 0%, #6d28d9 40%, #f59e0b 100%)', '#ffe08a'],
    aventure:['🗺', 'linear-gradient(180deg, #2b1d4a 0%, #a8432c 45%, #1c2b4a 58%, #0f1a33 100%)', '#ffb347'],
    entreamis:['👥', 'linear-gradient(180deg, #0a1a3a 0%, #1a4a7a 45%, #2a8ac9 70%, #0a1430 100%)', '#7dffb0'],
    maguilde:['🏛', 'linear-gradient(180deg, #1a1433 0%, #3a2a5c 50%, #c8902f 100%)', '#f3c96b'],
    decks:['🂠', 'linear-gradient(180deg, #0f0c29 0%, #302b63 60%, #24243e 100%)', '#f3c96b'],
    pouvoirs:['🃏', 'linear-gradient(180deg, #1e0b3a 0%, #6d28d9 60%, #24243e 100%)', '#c084fc'],
    forgeron:['⚒', 'linear-gradient(180deg, #1a0d08 0%, #7a2f12 50%, #f59e0b 100%)', '#ffb347'],
    aventuriers:['🧭', 'linear-gradient(180deg, #14281d 0%, #1f3b2b 50%, #c99a5b 100%)', '#7dffb0'],
    profil:['👤', 'linear-gradient(180deg, #14213d 0%, #2b3a67 50%, #c8902f 100%)', '#f3c96b'],
    chasse:['🎯', 'linear-gradient(180deg, #3a0a0a 0%, #7a1f1a 55%, #2a1a0a 100%)', '#ff7a4a'],
    descente:['🕯', 'linear-gradient(180deg, #05020d 0%, #2a1a0a 50%, #c2411e 100%)', '#ffb070'],
    rangs:['🎖', 'linear-gradient(180deg, #2a1a5c 0%, #5a2a6a 50%, #c8902f 100%)', '#ffd27a'],
    duelequip:['🪽', 'linear-gradient(180deg, #7cc8ff 0%, #2a5a9a 50%, #0f1a33 100%)', '#fff3c4'],
  });
  // 22/11 : les portails peints par Gemini (menu-recu/mode-*.webp) ; la Descente attend encore son image
  if (typeof PRO_IMG !== 'undefined') ['vite', 'aventure', 'entreamis', 'maguilde', 'decks', 'pouvoirs', 'forgeron', 'aventuriers', 'profil', 'chasse', 'rangs', 'duelequip'].forEach(k => { PRO_IMG[k] = 'mode-' + k; });
  const S = typeof regleDeLaSemaine === 'function' ? regleDeLaSemaine().n : '';
  const zok = localStorage.getItem('guilde-tuto') === 'fait';
  E[''] = { titre:'Le monde de la Guilde', sous:'De quoi as-tu envie ?', portes:[
    { nom:'Jouer vite', pro:'vite', vers:'vite', desc:'10 minutes ou moins : un duel, une énigme, une crypte, une partie de Fosse.' },
    { nom:'Partir à l’aventure', pro:'aventure', vers:'aventure', desc:'30 à 45 minutes, à reprendre quand tu veux : l’Odyssée, l’Expédition, la Descente, la Défense.' },
    { nom:'Entre amis', pro:'entreamis', vers:'amis', desc:'Les Chroniques, le duel contre un ami, l’Invasion à deux, tes amis et leurs salles.' },
    { nom:'Ma Guilde', pro:'maguilde', vers:'guilde', desc:'Tes héros, leurs decks et leurs pouvoirs, le Forgeron, ton profil, le Panthéon et la route des rangs.' },
  ] };
  E.vite = { titre:'⚡ Jouer vite', sous:'10 minutes ou moins.', portes:[
    { nom:'Duel contre l’ordinateur', pro:'ordinateur', href:'duel.html', desc:'Choisis ton héros et affronte l’automate de la Guilde.' },
    { nom:'Le Duel de la semaine', pro:'semaine', href:'duel.html?semaine=1', desc:`Cette semaine : « ${S} ». Gagne pour le Sceau de la semaine.` },
    { nom:'L’énigme du jour', pro:'enigme', href:'duel.html?enigme=1', desc:'Trouve le coup parfait qui fait tomber l’adversaire en un seul tour. Une nouvelle chaque jour.' },
    { nom:'La Crypte aux Sceaux', pro:'crypte', href:'crypte.html', desc:'Un solitaire de dés : brise les sceaux des monstres. Et la crypte du jour, la même pour tous.' },
    { nom:'La Fosse aux Runes', pro:'fosse', href:'fosse.html', desc:'Tes balles sont des dés : renvoie-les, forme des combos, tiens 5 minutes jusqu’au Titan.' },
    { nom:'La Chasse au boss', pro:'chasse', href:'epreuves.html#chasse', desc:'Le boss de la semaine : un combat, un score, recommence pour faire mieux.' },
    { nom:'Duel d’équipages', pro:'duelequip', href:'expedition-duel.html', desc:'Ton équipage contre celui de l’ordinateur, en plusieurs manches, avec des cœurs.' },
    { nom:'La Tour des épreuves', pro:'epreuves', href:'epreuves.html', desc:'Un étage, un combat : monte aussi haut que tu peux.' },
    { nom:'Le tutoriel', pro:'tuto', href:'duel.html?tuto=1', desc:zok ? 'Le premier duel guidé par Moustache, à refaire quand tu veux.' : 'Un premier duel guidé par Moustache (5 minutes). À la clé : Zéphine et le cadre de Diplômé.' },
  ] };
  E.aventure = { titre:'🗺 Partir à l’aventure', sous:'30 à 45 minutes, ta partie est gardée.', portes:[
    { nom:'L’Odyssée', pro:'odyssee', vers:'odyssee', desc:'Seul sur une île : explore case par case, fais grandir ton deck, vaincs le gardien de l’île.' },
    { nom:'L’Expédition', pro:'expeditions', vers:'expeditions', desc:'Le navire volant : recrute ton équipage, choisis ta route sur la carte, affronte un boss tiré au sort.' },
    { nom:'La Descente', pro:'descente', href:'crypte.html#descente', desc:'Le grand voyage en 3 étages sous la Crypte : tu choisis tes salles, ton compagnon, tes objets.' },
    { nom:'Défense de la porte', pro:'defense', href:'defense.html', desc:'Tes dés deviennent des tours qui fusionnent : tiens la porte face aux vagues de monstres.' },
  ] };
  E.amis = { titre:'👥 Entre amis', sous:'Chacun sur son téléphone, ou à plusieurs sur le même.', portes:[
    { nom:'Les Chroniques', pro:'chroniques', href:'chroniques.html', desc:'La soirée entre amis : jusqu’à 4 héros, un donjon dans le noir, des portes, des meubles à fouiller.' },
    { nom:'Duel contre un ami', pro:'duelami', href:'duel.html?ami=1', desc:'Chacun sur son téléphone : une salle, un code ou une invitation.' },
    { nom:'Contre un proche', pro:'proche', href:'duel.html?deux=1', desc:'À deux sur le même téléphone : chacun son héros, on se passe le téléphone à chaque tour.' },
    { nom:'L’Invasion', pro:'invasion', vers:'invasion', desc:'À deux contre les vagues du livre : l’Éveil de l’Abîme, le Réveil des Primordiaux, les grands boss.' },
    { nom:'Mes amis', pro:'amis', href:'menu.html?amis=1#amis', desc:'Ton code ami, tes amis en ligne, leurs salles, et les invitations.' },
    { nom:'Rejoindre avec un code', pro:'codesalle', href:'chroniques.html?code=1', desc:'Un ami t’a donné un code de salle (duel ou Chroniques) : entre-le ici.' },
  ] };
  E.guilde = { titre:'🏛 Ma Guilde', sous:'Tout ce qui est à toi.', portes:[
    { nom:'Mes héros', pro:'tour', href:'mes-heros.html', desc:'Tous tes héros : niveau, rang, équipement, histoire.' },
    { nom:'Mes decks', pro:'decks', href:'mes-decks.html', desc:'Trois decks par héros : choisis celui qui part au combat.' },
    { nom:'Les pouvoirs', pro:'pouvoirs', href:'pouvoirs.html?retour=menu.html', desc:'Le build de chaque héros : Garde, Pouvoir, Passif et Ultime.' },
    { nom:'Le Forgeron', pro:'forgeron', href:'forge.html', desc:'Acheter, améliorer et fusionner l’équipement de tes héros.' },
    { nom:'Héros d’aventure', pro:'aventuriers', href:'aventuriers.html', desc:'L’atelier des héros d’aventure : crée et fais grandir les tiens.' },
    { nom:'Profil et succès', pro:'profil', href:'profil.html', desc:'Ta carte de joueur, ton parcours et la bibliothèque des succès.' },
    { nom:'Le Panthéon', pro:'pantheon', href:'pantheon.html', desc:'Le Tableau d’honneur, tes titres et tes trophées de tous les modes.' },
    { nom:'Route des rangs et quêtes', pro:'rangs', href:'route.html', desc:'Les 30 rangs de la Guilde et leurs récompenses, les quêtes du jour et de la semaine.' },
  ] };
  // les étages « Entre amis » et « Arène » d'avant restent joignables par leur adresse, mais ne sont plus au menu
}
// « Retour » d'un étage du fond remonte à sa porte
const ENVIE_REMPLACE = { arene:'vite', enligne:'amis' }; // 22/11 (testeurs) : une adresse menu.html#arene ou #enligne d'une page mène à la nouvelle porte
const ENVIE_PARENT = { odyssee:'aventure', expeditions:'aventure', invasion:'amis', enligne:'amis', arene:'vite' };
// la grille 🌀 « Tous les portails » : tous les portails des 4 portes, sans doublon
function envieGrille(E) {
  const vus = new Set(), L = [];
  ['vite', 'aventure', 'amis', 'guilde'].forEach(k => (E[k] ? E[k].portes : []).forEach(p => { const id = p.href || p.vers; if (!vus.has(id)) { vus.add(id); L.push(p); } }));
  return L;
}

// 22/11 : la quête du jour « Passe à la Guilde » se valide à l'ouverture du menu (une fois par jour)
try { if (typeof guildeEvt === 'function' && localStorage.getItem('guilde-connexion-jour') !== envJourLocal()) { localStorage.setItem('guilde-connexion-jour', envJourLocal()); setTimeout(() => guildeEvt('connexion', 1), 800); } } catch (e) {}
if (typeof document !== 'undefined' && MENU_ENVIE) {
  const st = document.createElement('style');
  st.textContent = `
  #env-bandeau { display:flex; align-items:center; gap:10px; width:calc(100% - 28px); max-width:492px; margin:6px auto 0; padding:8px 12px; box-sizing:border-box;
    border-radius:14px; border:1px solid #f3c96b99; background:linear-gradient(90deg, #3a2a10e6, #1d1838e6); color:#f1ecff; font:13px Georgia, serif; text-align:left; cursor:pointer;
    box-shadow:0 0 14px #f3c96b33; }
  #env-bandeau .sol { font-size:26px; display:inline-flex; } #env-bandeau .sol img { width:38px; height:38px; } #env-bandeau .sol { animation:envSol 6s linear infinite; filter:drop-shadow(0 0 6px #ffd27a); }
  @keyframes envSol { to { transform:rotate(360deg); } }
  #env-bandeau .t { flex:1; display:flex; flex-direction:column; } #env-bandeau .t b { color:#ffd27a; font-size:15px; } #env-bandeau small { opacity:.85; }
  #env-bandeau .n { font-weight:bold; color:#2b1d0a; background:#f3c96b; border-radius:10px; padding:3px 8px; }
  #env-auj { position:fixed; inset:0; z-index:1200; background:#05020dcc; display:flex; align-items:flex-end; justify-content:center; overscroll-behavior:contain; }
  #env-auj .boite { position:relative; width:100%; max-width:520px; max-height:88vh; overflow:auto; box-sizing:border-box; padding:18px 14px calc(18px + env(safe-area-inset-bottom));
    background:linear-gradient(180deg, #2a1f0f, #15132b 40%); border-top:2px solid #f3c96b; border-radius:20px 20px 0 0; color:#f1ecff; font-family:Georgia, serif; animation:envMonte .25s ease-out; }
  @keyframes envMonte { from { transform:translateY(40%); opacity:0; } }
  #env-auj h2 { margin:0 0 4px; color:#ffd27a; text-align:center; } #env-auj .sous { margin:0 0 12px; text-align:center; font-size:13px; opacity:.85; } #env-auj .sous b { color:#ffd27a; }
  #env-auj .x { position:absolute; right:12px; top:10px; width:34px; height:34px; border-radius:50%; border:1px solid #f3c96b88; background:#15132b; color:#f3c96b; font-size:16px; }
  #env-auj h3.grp { margin:12px 2px 6px; color:#ffd27a; font-size:15px; } #env-auj h3.grp small { color:#b9b1e0; font-weight:normal; font-size:12px; margin-left:6px; }
  #env-auj .liste { display:flex; flex-direction:column; gap:8px; }
  #env-auj .liste button { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; border:1px solid #4b4580; background:#1d1838; color:#f1ecff; text-align:left; font:14px Georgia, serif; }
  #env-auj .liste .e { font-size:24px; width:32px; text-align:center; } #env-auj .liste .t { flex:1; display:flex; flex-direction:column; } #env-auj .liste small { opacity:.75; font-size:12px; }
  #env-auj .liste .c { font-size:18px; color:#f3c96b; }
  #env-auj .liste button.fait { border-color:#3f7a4a; background:#13261c; } #env-auj .liste button.fait .c { color:#7dffb0; } #env-auj .liste button.fait b { color:#a8f0bf; }`;
  document.head.appendChild(st);
}
