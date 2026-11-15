// =============================================================================================== LES AVENTURES EN SCÈNES (15/11 soir)
// Demande de l'utilisateur : « je suis à la taverne, je vais voir un personnage de quête, il raconte l'histoire ; on sort, on arrive dans un autre monde,
// un chemin, si on avance une embuscade, on finit le chemin, on va dans une tour… que ce ne soit pas figé sur l'écran ».
// Choix (boîtes) : l'utilisateur raconte, Claude écrit les aventures ; la première est inventée par Claude ; le chemin = une CARTE DU MONDE
// où l'on voit le groupe avancer étape par étape.
// Une aventure = une suite de SCÈNES :
//   taverne  : un lieu, un personnage de quête, ses répliques une par une, puis des choix (questions, accepter)
//   recit    : une page de récit (transition)
//   carte    : une carte du monde, un chemin en étapes (route, source, événement à choix, EMBUSCADE = combat, arrivée)
//   donjon   : un donjon des Chroniques (le moteur habituel), avec les textes de l'aventure
//   fin      : la fin, la récompense
// Les combats et le donjon utilisent l'écran des Chroniques (chroniques.html) ; la vie et les sacs des héros passent d'une scène à l'autre.
const AVENTURES = {
  brumes: {
    titre:'🗝 La Clé des Brumes', resume:'Une tour est sortie du marais en une nuit, et un brouillard gris vole les couleurs du pays. Un vieux cartographe a un plan.', duree:'45-75 min',
    scenes:[
      { t:'taverne', lieu:'La taverne du Chaudron Fêlé', fond:'taverne', pnj:{ n:'Anselme, le vieux cartographe', e:'🧓', img:'pnj-anselme' },
        lignes:[
          '« Ah ! Des aventuriers. Enfin. Asseyez-vous, la soupe est tiède mais l’histoire est brûlante. »',
          '« Il y a trois nuits, une TOUR est sortie du Marais des Saules. D’un coup, comme un champignon. Depuis, un brouillard gris rampe vers nos villages… et là où il passe, les couleurs disparaissent. »',
          '« J’ai lu dans mes vieilles cartes qu’une telle tour se ferme avec la CLÉ DES BRUMES. Elle est cassée en trois fragments, cachés quelque part dans la tour. »',
          '« Le chemin passe par la Route des Saules. Méfiez-vous : des gobelins rôdent, et le brouillard rend les loups nerveux. »',
        ],
        questions:[
          { n:'« Pourquoi nous ? »', r:'« Parce que vous êtes les seuls clients qui ne dorment pas sur la table. Et parce que votre chat a l’air de savoir se battre. »' },
          { n:'« Et Moustache, il vient ? »', r:'Moustache, depuis le comptoir : « Je viens. Mais je ne porte rien, je ne mouille pas mes pattes, et je veux une part du butin. En poisson. »' },
        ],
        accepter:'Accepter la quête' },
      { t:'recit', titre:'La porte de la taverne', fond:'brume', texte:'Vous poussez la porte… et le monde a changé. Le ciel est gris, l’herbe est grise, même le soleil semble délavé. Au loin, au-dessus des saules, une tour noire perce le brouillard. Moustache frissonne : « Je déteste quand le monde perd ses couleurs. On dirait un vieux tableau. »' },
      { t:'carte', titre:'La Route des Saules', fond:'marais', etapes:[
        { t:'route', n:'Le pont de pierre', txt:'Un vieux pont de pierre enjambe un ruisseau gris. Moustache le traverse en courant, la queue en l’air. « Vite, vite, l’eau me regarde. »' },
        { t:'source', n:'La source claire', txt:'Une petite source a gardé sa couleur : un bleu vif, presque insolent. Vous buvez : chaque héros reprend 5 PV.', soin:5 },
        { t:'embuscade', n:'Les buissons qui bougent', txt:'Les buissons bougent. Trop. Des gobelins des brumes jaillissent, couteaux tirés, avec un loup qui grogne derrière eux. « Embuscade ! » crie Moustache, déjà perché sur un rocher.', monstres:['gobelin', 'gobelin', 'loup'], obstacles:8 },
        { t:'evenement', n:'Le marchand ambulant', txt:'Un marchand à la charrette grise vous fait signe. « J’ai sauvé deux choses du brouillard. Une seule pour vous, je ne suis pas riche. »',
          choix:[{ n:'🧪 Une potion de soin', sac:'potion' }, { n:'📜 Un parchemin de feu', sac:'parchemin' }, { n:'💨 Une bombe fumigène', sac:'fumee' }] },
        { t:'route', n:'Les saules pleureurs', txt:'Les saules pleurent des gouttes grises. Le brouillard s’épaissit. Moustache se colle à vos jambes : « Je ne marche pas devant. Pas parce que j’ai peur. Pour vous laisser la gloire. »' },
        { t:'embuscade', n:'La meute du marais', txt:'Des yeux jaunes dans la brume. Une meute de loups vous encercle, menée par une salamandre qui crache des étincelles grises.', monstres:['loup', 'loup', 'salamandre', 'scarabee'], obstacles:10 },
        { t:'fin', n:'Le pied de la tour', txt:'La tour est là, immense, noire, couverte de lierre gris. Sa porte est entrouverte. Une odeur de vieille pierre et de pluie en sort. « Bon, » dit Moustache, « c’est le moment où je vous attends dehors. »' },
      ] },
      { t:'donjon', scen:'labyrinthe', textes:{
        titre:'🏰 La Tour des Brumes', duree:'',
        ouverture:'« La tour est plus grande dedans que dehors. Évidemment. Quelque part, dans ces salles, dorment trois fragments de la Clé des Brumes. Fouillez les meubles, et rapportez-les à l’autel tout en haut. »',
        entree:() => '« On ne voit que ce qui est devant nous. Le brouillard cache le reste. Avancez ensemble. »',
        but:'Fouillez les meubles (un dé) pour trouver <b>3 fragments de la Clé des Brumes ✦</b>, puis portez-les à <b>l’autel</b>, au fond de la tour.',
        porter:'Portez les fragments jusqu’à l’autel ✦, au fond de la tour.',
        gagne:['🗝 La Clé des Brumes est reformée !', '« La clé tourne toute seule dans l’autel. Un grand souffle traverse la tour… et le gardien de pierre tombe en poussière. Dehors, on entend les couleurs revenir. Oui, on les entend. Ça fait comme une chanson. »'] } },
      { t:'fin', titre:'Les couleurs reviennent', fond:'aube', texte:'Quand vous sortez, le soleil est jaune, l’herbe est verte, et les saules ont repris leur air triste mais coloré. À la taverne, Anselme a déjà déplié une nouvelle carte. « Bravo. Mais regardez ça : une autre tour, au nord… » Moustache soupire : « Je commande d’abord un poisson. »', xp:150 },
    ] },
};

// ------------------------------------------------------------------ l'aventure en cours
const CLE_AV = 'guilde-aventure-en-cours';
let AV = null;
const lireAV = () => { try { return JSON.parse(localStorage.getItem(CLE_AV) || 'null'); } catch (e) { return null; } };
const sauveAV = () => { try { if (AV) localStorage.setItem(CLE_AV, JSON.stringify(AV)); else localStorage.removeItem(CLE_AV); } catch (e) {} };
const sceneAV = () => AV && AVENTURES[AV.id].scenes[AV.scene];

(function () {
  const st = document.createElement('style');
  st.textContent = `
  .scn { position:relative; min-height:calc(100vh - 20px); border-radius:4cqw; overflow:hidden; padding:4cqw; animation:scnIn .7s ease-out; display:flex; flex-direction:column; }
  @keyframes scnIn { from { opacity:0; transform:scale(1.04); filter:blur(6px); } to { opacity:1; transform:none; filter:none; } }
  .scn.taverne { background:radial-gradient(ellipse at 50% 30%, #6a3a12cc, #1a0d06 75%), url('decor/scene-taverne.webp') center/cover; }
  .scn.brume { background:radial-gradient(ellipse at 50% 40%, #8a8e9a, #2a2c34 80%), url('decor/scene-brume.webp') center/cover; }
  .scn.marais { background:linear-gradient(180deg, #3a4a3a, #1a221c); }
  .scn.aube { background:radial-gradient(ellipse at 50% 20%, #ffd27a, #ff8a4a 40%, #3a1a3a 90%), url('decor/scene-aube.webp') center/cover; }
  .scn h2 { color:var(--or); text-align:center; margin:2cqw 0 3cqw; text-shadow:0 0 2cqw #000; }
  .scn .lieu { text-align:center; color:#ffd9a8; font-size:3.4cqw; letter-spacing:.2cqw; text-transform:uppercase; text-shadow:0 0 2cqw #000; }
  .pnj { display:flex; flex-direction:column; align-items:center; margin:3cqw 0; }
  .pnj .tete { width:30cqw; height:30cqw; border-radius:50%; border:3px solid var(--or); box-shadow:0 0 6cqw #f3c96b55; display:flex; align-items:center; justify-content:center; font-size:18cqw; background:#2a1a10; overflow:hidden; animation:respire 3s ease-in-out infinite; }
  .pnj .tete img { width:100%; height:100%; object-fit:cover; } @keyframes respire { 50% { transform:scale(1.03); } }
  .pnj b { color:var(--or); margin-top:2cqw; font-size:3.8cqw; }
  .replique { background:#1d1530ee; border:1.5px solid #6a5aa0; border-radius:3cqw; padding:3cqw 3.4cqw; font-size:3.7cqw; font-style:italic; line-height:1.45; margin:1.5cqw 0; animation:apparait .4s; }
  .replique.vieux { opacity:.5; font-size:3.2cqw; animation:none; }
  .scn .bas-s { margin-top:auto; display:grid; gap:2cqw; padding-top:3cqw; }
  .scn .bas-s button { border-radius:3.5cqw; padding:3cqw; font:bold 3.9cqw Georgia, serif; border:2px solid var(--or); background:var(--or); color:#2b1d0a; }
  .scn .bas-s button.b2 { background:#221d42cc; color:var(--texte); border-color:#6a5aa0; font-weight:normal; }
  .page-recit { background:#f3e6c8; color:#3a2a14; border-radius:2cqw; padding:5cqw; font-size:4cqw; line-height:1.55; box-shadow:0 2cqw 6cqw #000a; margin:4cqw 0; animation:feuille .8s ease-out; font-family:Georgia, serif; }
  @keyframes feuille { from { transform:perspective(80cqw) rotateY(-40deg); opacity:0; } to { transform:none; opacity:1; } }
  .carte-m { position:relative; width:100%; aspect-ratio:3/4; border-radius:3cqw; overflow:hidden; background:#d8c8a0 url('decor/carte-route-saules.webp') center/cover; box-shadow:inset 0 0 8cqw #6a4a2a; }
  .carte-m svg { position:absolute; inset:0; width:100%; height:100%; }
  .carte-m .pion { transition:transform 1.1s cubic-bezier(.45,.05,.4,1); }
  .etape-t { background:#1d1530ee; border:1.5px solid #6a5aa0; border-radius:3cqw; padding:3cqw; font-size:3.6cqw; line-height:1.45; margin-top:3cqw; animation:apparait .4s; min-height:20cqw; }
  .etape-t b { color:var(--or); }
  .groupe-pv { display:flex; justify-content:center; gap:2cqw; flex-wrap:wrap; margin:2cqw 0 0; font-size:3cqw; }
  .groupe-pv span { background:#1d1530cc; border:1px solid #4b4580; border-radius:2cqw; padding:.4cqw 1.6cqw; }
  `;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------------ commencer, reprendre
function lanceAventure(id) {
  if (!choisis.length) { bulle('Choisis d’abord tes héros', true); return; }
  AV = { id, scene:0, etape:-1, equipe:choisis.slice(), pv:{}, sacs:{}, debut:Date.now(), vu:0 };
  sauveAV(); son('portail'); joueScene();
}
function reprendAventure() { AV = lireAV(); if (!AV) return; joueScene(); }
function abandonneAventure() { if (!confirm('Abandonner cette aventure ?')) return; AV = null; sauveAV(); S = null; accueil(); }
function sceneSuivante() { AV.scene++; AV.etape = -1; AV.vu = 0; sauveAV(); son('portail'); joueScene(); }
// les PV max d'un héros de l'équipe (héros de la Guilde : un nom ; héros d'aventure : un objet avec ses PV)
const pvMaxEq = k => { const h = versMoteur(k); return h && typeof h === 'object' ? h.pv : (K.HEROS_C[k] || {}).pv || 15; };
const imgPnj = p => `<img src="portraits/${p.img}.webp" alt="" onerror="this.outerHTML='${p.e}'">`;
function pvGroupe() {
  return `<div class="groupe-pv">${AV.equipe.map((k, i) => `<span>${nomChoix(k)} ❤ ${AV.pv[i] != null ? AV.pv[i] : pvMaxEq(k)}/${pvMaxEq(k)}</span>`).join('')}</div>`;
}

// ------------------------------------------------------------------ jouer la scène en cours
function joueScene() {
  S = null; fenetre(''); const A = AVENTURES[AV.id], sc = sceneAV();
  if (!sc) { AV = null; sauveAV(); return accueil(); }
  const tete = `<div class="haut"><a href="#" onclick="if(confirm('Quitter ? L’aventure est gardée.')){AV=null;accueil()}return false">‹ Quitter</a><span class="t">${A.titre}</span><button onclick="abandonneAventure()">✕</button></div>`;
  if (sc.t === 'taverne') {
    const n = Math.min(AV.vu, sc.lignes.length - 1), finies = AV.vu >= sc.lignes.length - 1;
    $('app').innerHTML = `${tete}<div class="scn taverne"><div class="lieu">${sc.lieu}</div>
      <div class="pnj"><div class="tete">${imgPnj(sc.pnj)}</div><b>${sc.pnj.n}</b></div>
      ${sc.lignes.slice(0, n + 1).map((l, i) => `<div class="replique ${i < n ? 'vieux' : ''}">${l}</div>`).join('')}
      ${AV.reponse ? `<div class="replique">${AV.reponse}</div>` : ''}
      <div class="bas-s">${!finies ? `<button onclick="AV.vu++;AV.reponse=null;sauveAV();son('choisir');joueScene()">Suivant ▶</button>`
        : `${(sc.questions || []).map((q, k) => `<button class="b2" onclick="AV.reponse=AVENTURES[AV.id].scenes[AV.scene].questions[${k}].r;son('choisir');joueScene()">${q.n}</button>`).join('')}<button onclick="sceneSuivante()">⚔ ${sc.accepter || 'Partir'}</button>`}</div></div>`;
    return;
  }
  if (sc.t === 'recit' || sc.t === 'fin') {
    $('app').innerHTML = `${tete}<div class="scn ${sc.fond || 'brume'}"><h2>${sc.titre}</h2><div class="page-recit">${sc.texte}</div>
      <div class="bas-s"><button onclick="${sc.t === 'fin' ? 'finAventure()' : 'sceneSuivante()'}">${sc.t === 'fin' ? '🏆 Terminer l’aventure' : 'Continuer ▶'}</button></div></div>`;
    if (sc.t === 'fin') son('victoire');
    return;
  }
  if (sc.t === 'carte') return joueCarte(sc, tete);
  if (sc.t === 'donjon') return lanceDonjonAV(sc);
}

// ------------------------------------------------------------------ la carte du monde : le chemin en étapes, le pion qui avance
function posEtape(k, n) { const y = 124 - (112 * k / Math.max(1, n - 1)); const x = 50 + (k % 2 ? 22 : -22) * (k === 0 || k === n - 1 ? .2 : 1); return [x, y]; }
function joueCarte(sc, tete) {
  const E = sc.etapes, n = E.length, ici = Math.max(0, AV.etape), P = E.map((e, k) => posEtape(k, n));
  const chemin = P.map(([x, y], k) => (k ? 'L' : 'M') + x + ' ' + y).join(' ');
  const ICO = { route:'•', source:'💧', embuscade:'⚔', evenement:'❓', fin:'🏰' };
  const e = AV.etape >= 0 ? E[AV.etape] : null;
  let txt = '', boutons = '';
  if (!e) { txt = `<b>${sc.titre}</b> : le chemin commence ici. Avancez étape par étape ; restez sur vos gardes.`; boutons = `<button onclick="avance()">Avancer ▶</button>`; }
  else {
    txt = `<b>${e.n}</b> — ${e.txt}`;
    if (e.t === 'embuscade' && !AV.fait) boutons = `<button onclick="embuscade()">⚔ Aux armes !</button>`;
    else if (e.t === 'evenement' && !AV.fait) boutons = e.choix.map((c, k) => `<button class="b2" onclick="choixEvt(${k})">${c.n}</button>`).join('');
    else if (e.t === 'fin') boutons = `<button onclick="sceneSuivante()">🏰 Entrer</button>`;
    else boutons = `<button onclick="avance()">Avancer ▶</button>`;
    if (AV.resultat) txt += `<br><br>✨ ${AV.resultat}`;
  }
  const [px, py] = P[ici];
  $('app').innerHTML = `${tete}<div class="scn ${sc.fond || 'marais'}"><h2>🗺 ${sc.titre}</h2>
    <div class="carte-m"><svg viewBox="0 0 100 133">
      <path d="${chemin}" fill="none" stroke="#6a4a2a" stroke-width="1.6" stroke-dasharray="2.4 1.6" stroke-linecap="round"/>
      ${P.map(([x, y], k) => `<g><circle cx="${x}" cy="${y}" r="${k <= ici ? 4.6 : 4}" fill="${k < ici ? '#7dbf6a' : k === ici ? '#f3c96b' : '#f3e6c8'}" stroke="#3a2a14" stroke-width=".6"/><text x="${x}" y="${y + 1.5}" font-size="4" text-anchor="middle">${ICO[E[k].t]}</text></g>`).join('')}
      <g class="pion" id="pion" style="transform:translate(${px}px, ${py - 8}px)"><circle r="4.2" fill="#2a1a10" stroke="#f3c96b" stroke-width="1"/><text y="1.6" font-size="4.6" text-anchor="middle">🛡</text></g>
    </svg></div>
    ${pvGroupe()}
    <div class="etape-t">${txt}</div>
    <div class="bas-s">${boutons}</div></div>`;
}
// le pion avance jusqu'à l'étape suivante (on le voit marcher), puis l'étape se joue
function avance() {
  const sc = sceneAV(), n = sc.etapes.length; if (AV.etape >= n - 1) return;
  const de = posEtape(Math.max(0, AV.etape), n), vers = posEtape(AV.etape + 1, n), p = $('pion');
  son('pas'); if (p) p.style.transform = `translate(${vers[0]}px, ${vers[1] - 8}px)`;
  setTimeout(() => {
    AV.etape++; AV.fait = false; AV.resultat = null;
    const e = sc.etapes[AV.etape];
    if (e.t === 'source') { AV.equipe.forEach((k, i) => { const m = pvMaxEq(k); AV.pv[i] = Math.min(m, (AV.pv[i] != null ? AV.pv[i] : m) + (e.soin || 5)); }); son('soin'); }
    if (e.t === 'embuscade') son('vague');
    sauveAV(); joueScene();
  }, p ? 1150 : 0);
}
function choixEvt(k) {
  const e = sceneAV().etapes[AV.etape], c = e.choix[k];
  if (c.sac) { AV.sacs[0] = (AV.sacs[0] || []).concat([c.sac]); AV.resultat = `${c.n} : dans le sac de ${nomChoix(AV.equipe[0])}.`; }
  AV.fait = true; son('pioche'); sauveAV(); joueScene();
}

// ------------------------------------------------------------------ l'embuscade et le donjon : l'écran des Chroniques
function prepareHeros() {
  S.heros.forEach((h, i) => { if (AV.pv[i] != null) h.pv = Math.max(1, Math.min(h.pvmax, AV.pv[i])); if (AV.sacs[i]) h.sac = AV.sacs[i].slice(); });
  S.aventure = AV.id; pointDePassage(); actif = 0; sel = null; centrer = true;
}
function embuscade() {
  const e = sceneAV().etapes[AV.etape], eq = AV.equipe.map(versMoteur).filter(Boolean);
  S = K.nouvelle(eq, 'av-' + AV.debut + '-' + AV.scene + '-' + AV.etape, 'arene', { monstres:e.monstres, obstacles:e.obstacles });
  S.textes = { titre:'⚔ ' + e.n, duree:'', ouverture:e.txt, entree:() => '« Tous ensemble ! Abattez-les tous, et on reprend la route. »',
    but:'<b>Embuscade !</b> Abattez tous les monstres pour reprendre la route.', porter:'Abattez tous les monstres.', gagne:['⚔ L’embuscade est repoussée !', '« Bien joué. On souffle un peu, et on repart. Personne n’a vu mon poil se hérisser, hein ? »'] };
  prepareHeros(); son('vague'); dessine(); dialogue(S.textes.titre, [e.txt]);
}
function lanceDonjonAV(sc) {
  const eq = AV.equipe.map(versMoteur).filter(Boolean);
  S = K.nouvelle(eq, 'av-' + AV.debut + '-' + AV.scene, sc.scen);
  S.textes = sc.textes; prepareHeros(); son('portail'); dessine();
  dialogue(sc.textes.titre, [sc.textes.ouverture, sc.textes.entree()]);
}
// appelé par finPartie() de chroniques.html quand le combat (ou le donjon) d'une aventure se termine
function aventureFinCombat() {
  if (!AV) AV = lireAV(); if (!AV) { S.aventure = null; return finPartie(); }
  const gagne = S.fin === 'gagne';
  if (!gagne) {
    fenetre(`<h2>☠ Le groupe est tombé…</h2><div class="moust"><img src="ui/moustache.webp" alt=""><div class="lu">« Aïe. On se relève, on secoue la poussière, et on réessaie ? »</div></div>
      <button class="go" onclick="recommence()">↺ Recommencer ce combat</button><button class="sec" onclick="fenetre('');abandonneAventure()">Abandonner l’aventure</button>`, false);
    return;
  }
  S.heros.forEach((h, i) => { AV.pv[i] = Math.min(h.pvmax, Math.max(1, h.pv) + 3); AV.sacs[i] = (h.sac || []).slice(); });
  let butin = ''; if (typeof avGagne === 'function' && !S.butinFait) { S.butinFait = true; const or = (S.orAv || 0) + 10, g = avGagne(or, S.equipTrouve || 0); butin = `<p style="text-align:center">⚒ 🪙 +${or} or pour la Forge${g.length ? ` · ${g.map(p => `<b style="color:${EQ_RARE[p.r].c}">${EQ_CASES.find(c => c.k === p.slot).e} ${p.nom}</b>`).join(', ')}` : ''}</p>`; }
  try { localStorage.removeItem(CLE_PARTIE); } catch (e) {}
  son('victoire'); const sc = sceneAV(), T = S.textes;
  fenetre(`<h2>${T.gagne[0]}</h2><div class="moust"><img src="ui/moustache.webp" alt=""><div class="lu">${T.gagne[1]}</div></div>${butin}
    <button class="go" onclick="fenetre('');${sc.t === 'carte' ? 'AV.fait=true;sauveAV();joueScene()' : 'sceneSuivante()'}">${sc.t === 'carte' ? 'Reprendre la route ▶' : 'Sortir de la tour ▶'}</button>`, false);
}
function finAventure() {
  const sc = sceneAV(); let niv = [];
  AV.equipe.forEach(k => { if (k.startsWith('av:') && typeof avGagneXP === 'function') { const g = avGagneXP(k.slice(3), sc.xp || 150, true); if (g) niv.push(nomChoix(k)); } });
  if (typeof gagneXP === 'function') gagneXP(sc.xp || 150, 'Aventure des Chroniques');
  const o = typeof butinArmurerie === 'function' ? butinArmurerie(3, Date.now()) : null;
  const gEq = typeof avGagne === 'function' ? avGagne(60, 1, true) : [];
  try { const D = JSON.parse(localStorage.getItem(CLE) || '{}'); D.aventures = D.aventures || {}; D.aventures[AV.id] = (D.aventures[AV.id] || 0) + 1; localStorage.setItem(CLE, JSON.stringify(D)); } catch (e) {}
  AV = null; sauveAV();
  fenetre(`<h2>🏆 Aventure terminée !</h2><p style="text-align:center">+${sc.xp || 150} XP${o ? ` · 🎒 <b>${o}</b> rejoint l’armurerie` : ''}${gEq.length ? `<br>⚒ Pour la Forge : 🪙 +60 or · <b style="color:${EQ_RARE[gEq[0].r].c}">${EQ_CASES.find(c => c.k === gEq[0].slot).e} ${gEq[0].nom}</b>` : ''}${niv.length ? `<br>⬆ Niveau gagné : ${niv.join(', ')}` : ''}</p><button class="go" onclick="fenetre('');accueil()">Retour à la Guilde</button>`, false);
}
// la liste des aventures sur l'accueil des Chroniques
function aventuresHTML() {
  const g = lireAV(); let D = {}; try { D = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) {}
  return `<h3 style="color:var(--or);margin:4cqw 0 1.5cqw">📖 Les Aventures <small style="color:var(--doux);font-weight:normal">(taverne, chemin, embuscades, donjon)</small></h3>
    ${g ? `<button class="gros" style="border-color:var(--ok);color:var(--ok);background:#14322a" onclick="reprendAventure()">▶ Reprendre : ${AVENTURES[g.id].titre}<small>${g.equipe.map(nomChoix).join(', ')} · scène ${g.scene + 1}/${AVENTURES[g.id].scenes.length}</small></button>
      <button onclick="abandonneAventure()" style="display:block;margin:0 auto;background:none;border:0;color:var(--doux);font-size:3cqw;text-decoration:underline">✕ abandonner cette aventure</button>` : ''}
    ${Object.entries(AVENTURES).map(([k, a]) => `<button class="gros" style="background:#2a1f10;border-color:#ffb070;color:#ffd9a8" ${choisis.length ? '' : 'disabled'} onclick="lanceAventure('${k}')">${a.titre}<small>${a.resume} · ${a.duree}${(D.aventures || {})[k] ? ` · ✓ ${D.aventures[k]}` : ''}${choisis.length ? '' : ' · choisis tes héros plus bas'}</small></button>`).join('')}`;
}

// la page d'accueil a été dessinée avant ce fichier : on la redessine pour montrer les aventures
if (typeof S !== 'undefined' && !S && typeof accueil === 'function') accueil();
