// =============================================================================================== L'ENTRAÎNEMENT DES EXPÉDITIONS (18/11, moteur commun : entrainement.js)
// expedition.html?entrainement=1 : une escale jouée en vrai, guidée par Moustache : recruter (un Tireur, un Rempart), voir les deux rangées,
// partir, les ordres du capitaine (les dés), le combat et LA CIBLE DU CAPITAINE (doigt maintenu sur le Chaman qui soigne). Environ 2 minutes.
// La vraie expédition en cours est mise de côté pendant l'entraînement, puis remise telle quelle.
const ENTR_CLE = 'expedition', ENTR_RESERVE = 'guilde-exp-reserve-entrainement';
function entrRestaure() { const r = localStorage.getItem(ENTR_RESERVE); if (r === null) return; if (r) localStorage.setItem(CLE, r); else localStorage.removeItem(CLE); localStorage.removeItem(ENTR_RESERVE); }
if (localStorage.getItem(ENTR_RESERVE) !== null && !/entrainement=1/.test(location.search)) entrRestaure(); // un entraînement quitté en route
let ENTR_CHAMAN = null;
function entrainementExpedition() {
  if (localStorage.getItem(ENTR_RESERVE) === null) localStorage.setItem(ENTR_RESERVE, localStorage.getItem(CLE) || '');
  localStorage.setItem('guilde-exp-guide', '1'); fermer();
  X = nouvelleExpedition('gorm', 'entrainement'); X.entr = true; X.or = 10; X.offre = ['ecuyer', 'flute', 'milicien', 'faon']; X.diff = 'facile';
  // l'escale d'entraînement : un gobelin devant, et derrière un CHAMAN qui soigne et un lanceur
  const m = (n, a, v, tag) => ({ id:uid(), key:'m', n, a, v, star:0, bonusA:0, bonusV:0, ...tagsMonstre(tag) });
  const P = { av:[null, m('Gobelin', 2, 9), null], ar:[m('Chaman gobelin', 1, 8, 'tireur+soigne'), null, m('Gobelin lanceur', 1, 5, 'tireur')] };
  ENTR_CHAMAN = P.ar[0].id; X.advPret = { nom:'La crique d’entraînement', camp:{ heros:null, plateau:P, X:null } };
  sauve(); port();
  const fen = () => document.querySelector('#fen .fenetre'), btnFen = t => () => { const f = fen(); return f && [...f.querySelectorAll('button')].find(b => b.textContent.includes(t)); };
  const offre = k => () => { const f = fen(); if (f) return [...f.querySelectorAll('button')].find(b => b.textContent.includes('Recruter')); const i = X.offre.indexOf(k); return i >= 0 ? document.querySelectorAll('.boutique .offre')[i] : null; };
  const a = k => toutes(X).some(u => u.key === k), dansPort = () => !!document.querySelector('.champ') && !fen();
  window.PAUSE_EXP = e => X && X.entr && e.t === 'round' && e.n === 1 && !(CIBLE && (CIBLE.att || CIBLE.id));
  Entrainement.lance(ENTR_CLE, [
    { c:'Miaou ! Bienvenue au port du navire volant. Une expédition, c’est des escales : au port tu recrutes ton équipage, puis il combat tout seul aux dés. On s’entraîne sur une seule escale, promis, c’est court.', g:'Un bateau qui vole. Il manquait plus que ça.' },
    { c:'Voici le <b>recruteur</b>. Touche la <b>Joueuse de flûte</b> : c’est une 🏹 <b>Tireuse</b>.', cible:offre('flute'), ok:() => a('flute') || !!fen(), montre:() => !fen() },
    { c:'Sa fiche : touche « <b>Recruter</b> » (3 💰).', cible:btnFen('Recruter'), ok:() => a('flute'), montre:() => !!fen() },
    { c:'Elle s’est placée toute seule <b>DERRIÈRE</b>. Retiens bien : les 🏹 Tireurs visent la rangée de <b>derrière</b> des ennemis, les autres frappent celle de <b>devant</b>.', cible:'.champ', montre:dansPort },
    { c:'Il te faut quelqu’un pour encaisser devant : touche l’<b>Écuyer</b> (🛡 Rempart, il a Barrière : les ennemis le frappent en premier), puis Recruter.', cible:offre('ecuyer'), ok:() => a('ecuyer') },
    { c:'Ton équipage est prêt. Touche « <b>Partir</b> ».', cible:'.go', ok:() => !!btnFen('On y va')() || !!document.querySelector('.ordres') || !!document.getElementById('scene'), montre:dansPort },
    { c:'Confirme : « <b>On y va !</b> »', cible:btnFen('On y va'), ok:() => !!document.querySelector('.ordres') || !!document.getElementById('scene') },
    { c:'Avant chaque escale, le capitaine donne ses <b>ordres</b> : 3 dés à poser sur tes recrues. Lance-les !', cible:() => { const b = document.querySelector('.ordres .choixh button.or'); return b && typeof OD !== 'undefined' && OD && !OD.lance ? b : null; }, ok:() => typeof OD !== 'undefined' && OD && OD.lance || !!document.getElementById('scene') },
    { c:'Touche un dé, puis une recrue : 1-2 = <b>+3 ❤</b>, 3-4 = <b>+2 ⚔</b>, 5-6 = <b>coup sûr</b>. Pose les trois.', cible:() => [document.querySelector('.dords'), document.querySelector('.rords')].filter(Boolean), ok:() => (typeof OD !== 'undefined' && OD && OD.sur.filter(Boolean).length === 3) || !!document.getElementById('scene') },
    { c:'Parfait. « <b>Au combat !</b> »', cible:() => [...document.querySelectorAll('.ordres .choixh button')].find(b => b.textContent.includes('Au combat')), ok:() => !!document.getElementById('scene') },
    { c:'Avant le premier coup : <b>comment se calcule une attaque</b>. Chaque recrue lance <b>UN dé</b>. Le chiffre ne s’ajoute pas : il dit seulement si le coup porte.<br>🎲 <b>1</b> : raté, 0 dégât.<br>🎲 <b>2, 3, 4 ou 5</b> : coup normal = <b>toute</b> son attaque ⚔.<br>🎲 <b>6</b> : critique = attaque <b>×2</b>.', montre:() => !!document.getElementById('scene') },
    { c:'Ce qui peut changer les dégâts : une Lame ou un Rempart placé <b>DERRIÈRE</b> frappe à <b>moitié</b> (les Tireurs, eux, frappent plein de derrière). Ton dé posé en ordre 3-4 donne <b>+2 ⚔</b>, un 5-6 rend le premier coup <b>critique</b> à coup sûr. Un ennemi 🚩 Étendard donne +1 aux siens, un 🗿 Totem divise par deux les coups sur son chef.', g:'Et moi, le capitaine ?', montre:() => !!document.getElementById('scene') },
    { c:'Toi, tu lances <b>3 dés</b> : un <b>brelan</b> = le chiffre + 3 · une <b>paire</b> = le chiffre de la paire · une <b>suite</b> (1-2-3…) = 4 · sinon le plus fort − 2 (au moins 1). Et le tout + ton bonus d’attaque. Le journal en bas te montre chaque dé : 🎲.', g:'Un brelan de 6, alors. Noté.', montre:() => !!document.getElementById('scene') },
    { c:'Regarde derrière le gobelin : ce <b>Chaman</b> porte un <b>✚</b> : il <b>soigne</b> ses amis à chaque round. Il faut l’abattre en premier ! <b>Maintiens ton doigt sur lui</b> jusqu’à voir la 🎯 cible.', g:'On tape le guérisseur. Classique.',
      cible:() => ENTR_CHAMAN && document.querySelector(`[data-id="${ENTR_CHAMAN}"]`), ok:() => CIBLE && (CIBLE.att === ENTR_CHAMAN || CIBLE.id === ENTR_CHAMAN), montre:() => !!document.getElementById('scene') },
    { c:'🎯 Tout l’équipage vise le Chaman ! Regarde le combat. (Tu peux changer de cible à tout moment, de la même façon.)', libre:true, ok:() => !!fen() || !document.getElementById('scene'), montre:() => !!document.getElementById('scene') },
  ], { heros:{ nom:'Gorm', img:IMG('gorm') }, passer:() => { window.PAUSE_EXP = null; entrRestaure(); location.href = 'expedition.html'; } });
}
// la fin : après la fenêtre du combat (« Lever l'ancre »), Moustache conclut ; la vraie expédition est remise
const _voyageEntr = voyage;
voyage = async function () {
  if (!X || !X.entr) return _voyageEntr();
  const g = X.victoires > 0; window.PAUSE_EXP = null; X = null; entrRestaure();
  const premier = g ? Entrainement.termine(ENTR_CLE) : (Entrainement.arrete(), false);
  fenetre(g ? `<div style="text-align:center"><img src="ui/moustache.webp?v=1" alt="" style="width:84px;height:84px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px #f3c96b"></div>
    <h2>🎓 Entraînement réussi !</h2><p><b>Moustache :</b> « Bien joué, capitaine. Recruter, placer devant ou derrière, donner tes ordres, viser le soigneur : tu sais tout. Le reste, c’est de la pratique. »</p>
    ${premier ? '<p>🏆 +100 XP pour ton rang de la Guilde.</p>' : ''}
    <p><b>Moustache :</b> « Et si jamais tu as besoin, retrouve-moi dans les <b>Paramètres</b> pour refaire une session ensemble. »</p>
    <div class="choixh"><button class="or" onclick="fermer();accueil()">⛵ Une vraie expédition</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`
  : `<h2>💀 Raté, cette fois</h2><p><b>Moustache :</b> « Ça arrive même aux meilleurs chats. On recommence ? »</p><div class="choixh"><button class="or" onclick="fermer();entrainementExpedition()">🔄 Recommencer</button><button onclick="fermer();accueil()">Plus tard</button></div>`);
};
// au premier passage dans le mode : Moustache propose l'entraînement (avec « Passer »)
const _accueilEntr = accueil;
accueil = function () { _accueilEntr(); proposeEntr(); };
function proposeEntr() {
  if (X || Entrainement.fait()[ENTR_CLE] || localStorage.getItem('guilde-exp-entr-propose') || /entrainement=1/.test(location.search)) return;
  localStorage.setItem('guilde-exp-entr-propose', '1');
  fenetre(`<div style="text-align:center"><img src="ui/moustache.webp?v=1" alt="" style="width:84px;height:84px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px #f3c96b"></div><h2>Première expédition ?</h2>
    <p><b>Moustache :</b> « On fait une escale d’entraînement ensemble ? Deux minutes, et tu sais tout : recruter, placer, donner tes ordres, choisir ta cible. »</p>
    <div class="choixh"><button class="or" onclick="entrainementExpedition()">🎓 L’entraînement (2 min)</button><button onclick="fermer()">Passer</button></div>`);
};
proposeEntr(); // l'accueil a déjà été dessiné par expedition-ecran.js
if (/entrainement=1/.test(location.search)) setTimeout(() => { history.replaceState(null, '', location.pathname); entrainementExpedition(); }, 300);
