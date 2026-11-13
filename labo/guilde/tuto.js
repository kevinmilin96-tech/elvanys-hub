// =============================================================================================== le TUTORIEL (12/11 nuit)
// Proposition v2 validée le 11/11 (tuto-proposition.html) : UN duel guidé, Gorm contre le Chef gobelin et son Chien de garde,
// Moustache, le chat roux de la Guilde, explique, Gorm répond. Une nouveauté par tour, des dés arrangés pour les premiers tours.
// Le PROJECTEUR (réutilisable) : l'écran s'assombrit, seul l'élément utile reste touchable, une main montre où toucher.
// Récompense : cadre « Diplômé de la Guilde » (provisoire en code) + Zéphine débloquée.
// Chargé par duel.html ; ne fait rien hors du tutoriel (sauf le petit 🎓 du diplômé sur son portrait).

const TUTO_FAIT = () => localStorage.getItem('guilde-tuto') === 'fait';
const ZEPHINE_OK = () => TUTO_FAIT() || localStorage.getItem('guilde-zephine') === '1';

// ---------------------------------------------------------------- l'ennemi du tutoriel
function installeTuto() {
  if (HEROS.tutochef || !HEROS.chefgobelin) return;
  const c = HEROS.chefgobelin;
  HEROS.tutochef = { ...c, nom:'Chef gobelin', titre:'le roi des cendres', pv:34, renforts:[],
    pouvoir:{ n:'Coup de gourdin', txt:'2 dés identiques', d:'5 dégâts à une cible.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => degats(k, 5) } };
}

// ---------------------------------------------------------------- les dés arrangés (par tour du joueur) ; au tour 2, les deux dernières valeurs servent à la relance
const TUTO_DES = { 1:[4, 4, 1], 2:[2, 3, 6, 1, 5, 5, 5], 3:[2, 5, 5, 3, 1], 5:[2, 4, 6, 2, 3], 6:[1, 3, 5, 2, 4] };
const _lanceTuto = lance;
lance = function (J, d) { if (S && S.tuto && J === S.J && S.tuto.file.length) { d.v = S.tuto.file.shift(); d.mod = false; return; } _lanceTuto(J, d); };
const _debutTourTuto = debutTour;
debutTour = function (J) {
  _debutTourTuto(J);
  if (!S || !S.tuto || J !== S.J) return;
  S.tuto.file = [...(TUTO_DES[J.tours] || [])];
  if (J.tours === 3) { const it = J.main.indexOf('tambour'); if (it >= 0) J.main.splice(it, 1); J.main.push('tambour'); J.pc = Math.max(J.pc, 2); }
  if (J.tours === 6 && !J.ultimeFait) { J.jauge = JAUGE.max; J.pc = Math.max(J.pc, 3); }
};

// ---------------------------------------------------------------- le script : une étape = une bulle, un élément à toucher (cible), une condition pour passer (ok)
const nbPoses = () => S.J.des.filter(d => d.pose).length;
const tambour = () => S.J.front.find(u => u.tambour);
const ETAPES = [
  { t:1, c:'Miaou ! Bienvenue à la Guilde. Moi, c’est Moustache, chat d’aventure. Oui, l’oreille ébréchée, c’est une longue histoire. Toi, tu es Gorm, le sonneur de cor. En face : le Chef gobelin et son Chien de garde.', g:'Hé, le matou. Je sais qui je suis.' },
  { t:1, c:'On commence : touche le gros bouton « Lancer les dés ». Non, pas moi. Je ne me lance pas. Le bouton.', cible:'.lancer', ok:() => !S.J.aLancer },
  { t:1, c:'Tes dés sont arrivés dans ton bac à dés, là, à droite. Deux 4 ! Une paire, ça fait une FRAPPE. Touche les deux 4.', cible:'.des', ok:() => sel.length === 2 && vals(sel).every(v => v === 4) || nbPoses() >= 2 },
  { t:1, c:'Maintenant l’épée, à gauche : c’est la Frappe. Elle brille en vert quand tes dés conviennent.', cible:'.ic.r1', ok:() => (ciblage && ciblage.quoi === 'frappe') || nbPoses() >= 2 },
  { t:1, c:'Vise le Chef : touche son portrait, en haut. La Frappe passe toujours par-dessus les créatures.', cible:'#b-O', ok:() => (ciblage && ciblage.choisi) || nbPoses() >= 2 },
  { t:1, c:'Avant d’attaquer, le jeu te montre ce que tu vas faire : 4 dégâts. Si ça te va, touche « Valider ».', cible:'#conf .ok', ok:() => nbPoses() >= 2 },
  { t:1, c:'Bien tapé ! Regarde le rond en lumière, en haut à droite de ta carte : c’est son coût en PC. Les PC, ce sont tes POINTS DE COMPÉTENCE : il en faut pour jouer tes cartes.', cible:() => { const c = [...document.querySelectorAll('.main .c')].pop(); return c && (c.querySelector('.cg-cout') || c); } },
  { t:1, c:'Il te reste un dé. Touche « Fin du tour » : les dés pas posés sont VENDUS tout seuls, 1 PC chacun. C’est comme ça qu’on gagne ses points de compétence.', g:'Je garde la monnaie.', cible:'.b2', ok:() => S.J.tours >= 2 },
  { t:2, c:'Aïe. Le Chef a riposté : ton anneau rouge a baissé. On va éviter que ça recommence.', g:'Une égratignure.' },
  { t:2, c:'Lance tes dés. Tu en as 4 maintenant : un de plus à chaque tour, jusqu’à 5.', cible:'.lancer', ok:() => !S.J.aLancer },
  { t:2, c:'Pas de paire. Pas grave : tu as 2 RELANCES gratuites par tour. Touche le 2 et le 1 : on garde le 3 et le 6.', cible:'.des', ok:() => (sel.length === 2 && vals(sel).sort().join() === '1,2') || S.J.relance < 2 },
  { t:2, c:'Et maintenant « Relancer », en bas.', cible:'.b1', ok:() => S.J.relance < 2 },
  { t:2, c:'Ce bouclier, à gauche, c’est ta GARDE. Chaque héros a la sienne. Celle de Gorm, la Peau épaisse : chaque dé IMPAIR (1, 3, 5) devient du bouclier. Un 2 ou un 4 ne donne rien. Un 6 donne des ÉPINES : celui qui te frappe se pique.', cible:'.ic.r3' },
  { t:2, c:'Touche le 3 dans ton bac à dés, à droite. Garde tes deux 5 : ils frapperont juste après.', cible:'.des', ok:() => (sel.length === 1 && sel[0].v === 3) || S.J.gardeFaite },
  { t:2, c:'Puis le bouclier : ton 3 devient 3 de bouclier.', cible:'.ic.r3', ok:() => S.J.gardeFaite },
  { t:2, c:'Le bouclier est posé à côté de ton cœur : il prendra les coups à ta place. Et tes deux 5 forment une paire : FRAPPE ! (les deux 5, puis l’épée). Puis « Fin du tour ».', libre:true, ok:() => S.J.tours >= 3 },
  { t:3, c:'Regarde en bas : ta MAIN. Chaque carte coûte des PC (le chiffre dans le coin) et demande un dé. Le Tambour de clan veut un dé PAIR.', g:'Mon tambour ! Enfin quelqu’un de sérieux.' },
  { t:3, c:'Lance d’abord tes dés.', cible:'.lancer', ok:() => !S.J.aLancer },
  { t:3, c:'Touche le 2.', cible:'.des', ok:() => (sel.length === 1 && sel[0].v % 2 === 0) || !!tambour() },
  { t:3, c:'Puis la carte du Tambour : elle s’agrandit. Touche-la encore pour la jouer.', cible:() => document.querySelector('.main .c.vue') || document.querySelector('.main'), ok:() => !!tambour() },
  { t:3, c:'Ton Tambour arrive sur le plateau. Il DORT ce tour (💤) : une créature attaque à partir du tour suivant. Joue le reste comme tu veux, puis « Fin du tour ».', libre:true, ok:() => S.J.tours >= 4 },
  { t:4, c:'Lance tes dés. (Tu peux aussi jouer tes créatures avant ou après : ça ne change rien.)', cible:'.lancer', ok:() => !S.J.aLancer },
  { t:4, c:'Le Tambour est réveillé : contour doré. Touche-le pour attaquer.', cible:'#f-J', ok:() => !!attaquant || !tambour() || !tambour().pret },
  { t:4, c:'Le Chien de garde a une BARRIÈRE : les créatures doivent l’attaquer d’abord. Touche-le. (Les Frappes, elles, passent par-dessus. Les règles, c’est pour les chiens. Pardon, Chien.)', cible:'#f-O', ok:() => !attaquant || !tambour() || !tambour().pret },
  { t:4, c:'Astuce : en touchant ta créature, tu peux aussi la mettre EN DÉFENSE : elle prend alors tous les coups visés vers toi. À toi de jouer ce tour, puis « Fin du tour ».', libre:true, ok:() => S.J.tours >= 5 },
  { t:5, c:'Lance. J’ai un pressentiment.', cible:'.lancer', ok:() => !S.J.aLancer },
  { t:5, c:'2, 4, 6, 2 : quatre dés PAIRS. C’est ton POUVOIR, le Chant de guerre ! Touche ces quatre dés.', cible:'.des', ok:() => (sel.length === 4 && vals(sel).every(v => v % 2 === 0)) || S.J.dernier === 'pouvoir' },
  { t:5, c:'Puis l’étoile, à gauche : le Pouvoir.', cible:'.ic.r4', ok:() => S.J.dernier === 'pouvoir' || nbPoses() >= 4 },
  { t:5, c:'10 dégâts, et tes créatures gagnent de l’attaque ce tour ! Finis ton tour comme tu veux.', g:'BWOOOOM !', libre:true, ok:() => S.J.tours >= 6 },
  { t:6, c:'Regarde l’anneau doré autour de ton portrait : il est PLEIN. Il se remplit à chaque dé posé et quand tu prends des coups. Plein + 3 PC = ULTIME, une fois par combat.', g:'Enfin. Le Grand Souffle.' },
  { t:6, c:'Lance.', cible:'.lancer', ok:() => !S.J.aLancer },
  { t:6, c:'Ton Ultime veut 3 dés tous impairs. Touche le 1, le 3 et le 5.', cible:'.des', ok:() => (sel.length === 3 && vals(sel).every(v => v % 2 === 1)) || S.J.ultimeFait },
  { t:6, c:'Et maintenant… touche ton propre portrait, Gorm. Oui, toi.', cible:'#b-J', ok:() => S.J.ultimeFait },
  { t:6, c:'Voilà, tu sais tout ce qu’il faut. À toi de finir le travail. Moi, je vais grignoter un truc.', g:'Laisse-moi faire.', libre:true, ok:() => false },
];

// ---------------------------------------------------------------- le projecteur (réutilisable : projecteur(element, html, options))
function projecteurEl() {
  let p = document.getElementById('projo');
  if (!p) {
    p = document.createElement('div'); p.id = 'projo';
    p.innerHTML = '<div class="pv h"></div><div class="pv b"></div><div class="pv g"></div><div class="pv d"></div><div class="anneauP"></div><div class="main1">👆</div><div class="bulleT"></div>';
    document.body.appendChild(p);
    const st = document.createElement('style'); st.textContent = `
      #projo { position:fixed; inset:0; z-index:60; pointer-events:none; font-family:inherit; }
      #projo.cache { display:none; }
      #projo .pv { position:fixed; background:#05030ccc; pointer-events:auto; transition:all .25s; }
      #projo.libre .pv, #projo.libre .anneauP, #projo.libre .main1 { display:none; }
      #projo.seul .anneauP, #projo.seul .main1 { display:none; }
      #projo .anneauP { position:fixed; border-radius:14px; box-shadow:0 0 0 3px #f3c96b, 0 0 22px 6px #f3c96baa; animation:pulseP 1.2s ease-in-out infinite; transition:all .25s; }
      @keyframes pulseP { 50% { box-shadow:0 0 0 5px #fff6d6, 0 0 30px 10px #f3c96bcc; } }
      #projo .main1 { position:fixed; font-size:34px; filter:drop-shadow(0 3px 4px #000); animation:tape 1s ease-in-out infinite; transition:left .25s, top .25s; }
      @keyframes tape { 50% { transform:translate(-4px, -8px) scale(.92); } }
      #projo .bulleT { position:fixed; left:50%; transform:translateX(-50%); width:min(94vw, 460px); pointer-events:auto; display:flex; flex-direction:column; gap:6px; }
      #projo .ligneT { display:flex; gap:8px; align-items:flex-start; background:#fbf6e9; color:#2a2140; border-radius:16px; padding:9px 11px; box-shadow:0 6px 18px #000a; font-size:.95em; line-height:1.35; animation:entreT .3s ease-out; }
      #projo .ligneT.gorm { flex-direction:row-reverse; background:#e7efff; margin-left:12%; }
      #projo .ligneT b { display:block; font-size:.82em; color:#6b5fb0; }
      #projo .av { width:40px; height:40px; flex:none; border-radius:50%; display:grid; place-items:center; font-size:24px; background:#2a2140; box-shadow:0 0 0 2px #f3c96b; object-fit:cover; }
      #projo .boutonsT { display:flex; justify-content:space-between; align-items:center; gap:8px; }
      #projo .boutonsT button { font:inherit; border:0; border-radius:20px; padding:8px 18px; font-weight:bold; background:linear-gradient(#f6d77e, #c8902f); color:#2a1a08; box-shadow:0 3px 8px #000a; }
      #projo .boutonsT a { color:#e9e3ff; font-size:.82em; text-shadow:0 1px 3px #000; }
      #projo.libre .bulleT { pointer-events:none; } #projo.libre .boutonsT a, #projo.libre .boutonsT button { pointer-events:auto; } #projo.libre .ligneT { opacity:.9; font-size:.86em; padding:6px 9px; }
      @keyframes entreT { from { opacity:0; transform:translateY(8px); } }
      .barre.diplome img:first-child { box-shadow:0 0 0 3px #f3c96b, 0 0 14px #f3c96b; }
      .barre.diplome::after { content:'🎓'; position:absolute; font-size:16px; left:2px; top:2px; z-index:3; filter:drop-shadow(0 1px 2px #000); }`;
    document.head.appendChild(st);
  }
  return p;
}
// el = élément à éclairer (ou null = juste une bulle) ; libre = on peut tout toucher
function projecteur(el, html, o = {}) {
  const p = projecteurEl(); p.classList.remove('cache'); p.classList.toggle('libre', !!o.libre); p.classList.toggle('seul', !el);
  const W = innerWidth, H = innerHeight, m = 6;
  let r = el ? el.getBoundingClientRect() : { left:W / 2, top:H / 2, right:W / 2, bottom:H / 2, width:0, height:0 };
  const L = Math.max(0, r.left - m), T = Math.max(0, r.top - m), R = Math.min(W, r.right + m), B = Math.min(H, r.bottom + m);
  const [h, b, g, d] = p.querySelectorAll('.pv');
  if (el) { Object.assign(h.style, { left:'0', top:'0', width:W + 'px', height:T + 'px' }); Object.assign(b.style, { left:'0', top:B + 'px', width:W + 'px', height:(H - B) + 'px' });
    Object.assign(g.style, { left:'0', top:T + 'px', width:L + 'px', height:(B - T) + 'px' }); Object.assign(d.style, { left:R + 'px', top:T + 'px', width:(W - R) + 'px', height:(B - T) + 'px' }); }
  else { Object.assign(h.style, { left:'0', top:'0', width:W + 'px', height:H + 'px' }); [b, g, d].forEach(x => Object.assign(x.style, { width:'0', height:'0' })); }
  Object.assign(p.querySelector('.anneauP').style, { left:L + 'px', top:T + 'px', width:(R - L) + 'px', height:(B - T) + 'px', pointerEvents:o.regarde ? 'auto' : 'none' });
  Object.assign(p.querySelector('.main1').style, { left:Math.min(W - 44, (L + R) / 2 + 6) + 'px', top:Math.min(H - 44, B - 14) + 'px' });
  const bu = p.querySelector('.bulleT'); if (bu.dataset.h !== html) { bu.innerHTML = html; bu.dataset.h = html; } // 13/11 soir : la bulle ne « repope » plus à chaque toucher
  // la bulle se met du côté où il y a de la place
  const haut = el ? (T + B) / 2 > H * .5 : false;
  bu.style.top = haut || !el ? (o.libre ? '8px' : (el ? '10px' : '22%')) : ''; bu.style.bottom = haut || !el ? '' : '10px';
  if (o.libre) { bu.style.top = '8px'; bu.style.bottom = ''; }
}
function projecteurCache() { const p = document.getElementById('projo'); if (p) p.classList.add('cache'); }

// ---------------------------------------------------------------- le moteur du tutoriel
function bulleTuto(e) {
  const moustache = `<div class="ligneT"><img class="av" src="ui/moustache.webp?v=1" alt="Moustache"><div><b>Moustache</b>${e.c}</div></div>`;
  const gorm = e.g ? `<div class="ligneT gorm"><img class="av" src="${IMG('gorm')}" alt=""><div><b>Gorm</b>${e.g}</div></div>` : '';
  const suite = !e.ok ? '<button onclick="tutoSuivant()">Suivant ›</button>' : '<span></span>';
  return moustache + gorm + `<div class="boutonsT"><a href="#" onclick="tutoPasser();return false">Passer le tutoriel</a>${suite}</div>`;
}
function tutoSuivant() { if (!S || !S.tuto) return; S.tuto.i++; tutoMaj(); }
function tutoMaj() {
  if (!S || !S.tuto) { projecteurCache(); return; }
  if (S.fini || fxOn || roule || fxApres.length || document.querySelector('#fen .fenetre')) { projecteurCache(); return; }
  const T = S.tuto, J = S.J;
  // on saute les étapes dépassées (tour passé) ou déjà réussies
  while (T.i < ETAPES.length) { const e = ETAPES[T.i]; if (J.tours > e.t || (e.ok && e.ok())) T.i++; else break; }
  const e = ETAPES[T.i];
  if (!e || J.tours < e.t || S.acteur === S.O) { projecteurCache(); return; }
  const el = e.cible ? (typeof e.cible === 'function' ? e.cible() : document.querySelector(e.cible)) : null;
  if (e.cible && !el) { projecteurCache(); return; }
  if (T.miaou !== T.i) { T.miaou = T.i; if (typeof GM !== 'undefined' && Date.now() - (window.__miaou || 0) > 25000) { window.__miaou = Date.now(); GM.son('miaou'); } } // miaulement : seulement quand l'étape change
  projecteur(el, bulleTuto(e), { libre:e.libre, regarde:!e.ok && !e.libre }); // étape « regarde » (bouton Suivant) : la zone en lumière ne réagit pas au toucher
}
// on éclaire à chaque dessin de l'écran
const _dessineTuto = dessine;
dessine = function () { _dessineTuto(); diplomeBadge(); if (S && S.tuto) setTimeout(tutoMaj, 30); };
addEventListener('resize', () => { if (S && S.tuto) tutoMaj(); });
function diplomeBadge() { if (TUTO_FAIT()) { const b = document.getElementById('b-J'); if (b) b.classList.add('diplome'); } }

function partieTuto() {
  installeTuto();
  const J = joueur('gorm', false, true), O = joueur('tutochef', true);
  S = { J, O, salle:{ n:'La cour d’entraînement', d:'Rien de spécial ici : on apprend.', id:'cour' }, log:[], fini:null, auto:false, tuto:{ i:0, file:[] } };
  FX = []; fxApres = []; fxOn = false; arreteMusique();
  O.pv = O.pvMax = HEROS.tutochef.pv; O.desMax = 3; O.ultimeFait = true; O.pc = 0;
  invoque(O, { n:'Chien de garde', a:1, v:6, barriere:true }, 'chien-garde'); // 13/11 soir : son image (cartes/chien-garde.webp)
  pioche(J, 4);
  log('Tutoriel : Gorm contre le Chef gobelin, dans la cour d’entraînement de la Guilde.');
  sel = []; attaquant = null; ciblage = null;
  debutTour(J);
  rendu();
}
function tutoPasser() {
  fenetre(`<h2>Passer le tutoriel ?</h2><p>Tu pourras le refaire quand tu veux depuis l’Arène. Zéphine reste verrouillée tant qu’il n’est pas fini.</p>
    <div class="choixh"><button onclick="fermer();tutoMaj()">Continuer</button><button onclick="localStorage.setItem('guilde-tuto-vu','1');location.href='menu.html#arene'">Passer</button></div>`);
  projecteurCache();
}
const _montrerFinTuto = montrerFin;
montrerFin = function () {
  if (!S || !S.tuto) return _montrerFinTuto();
  if (S.tutoFin) return; S.tutoFin = true; projecteurCache(); arreteMusique(1.2);
  if (S.fini === 'gagne') {
    const deja = TUTO_FAIT(); localStorage.setItem('guilde-tuto', 'fait'); localStorage.setItem('guilde-tuto-vu', '1');
    son('victoire'); effetImage('victoire', document.getElementById('app'), 2.2);
    fenetre(`<h2>🎓 Diplômé de la Guilde !</h2>
      <div style="display:flex;justify-content:center;margin:10px 0"><img src="${IMG('gorm')}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px #f3c96b,0 0 26px #f3c96b"></div>
      <p><b>Moustache :</b> « Bravo. Je l’avais dit. Dans ma tête. Entre deux siestes. »</p>
      ${deja ? '<p>Tu connais déjà la maison : merci d’être revenu !</p>' : `<p>Tu reçois le <b>cadre de Diplômé</b> autour de ton portrait (🎓).</p>
      <p style="display:flex;gap:10px;align-items:center"><img src="${IMG('zephine')}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px ${HEROS.zephine.c}"> <span><b>Zéphine l’alchimiste</b> rejoint la Guilde ! Elle transforme les dés : la plus difficile à jouer.</span></p>`}
      <div class="choixh"><button onclick="location.href='duel.html'">⚔ Un vrai duel</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`);
  } else {
    son('defaite');
    fenetre(`<h2>💀 Le Chef a gagné cette fois</h2><p><b>Moustache :</b> « Bon. On dira que c’était un échauffement. Moi aussi, je rate des souris. On recommence ? »</p>
      <div class="choixh"><button onclick="fermer();partieTuto()">Recommencer</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`);
  }
};
// Zéphine verrouillée : on propose le tutoriel
function tutoVerrou() {
  fenetre(`<h2>🔒 Zéphine l’alchimiste</h2><p>Zéphine rejoint la Guilde quand tu as fini le <b>tutoriel</b> (un duel guidé de 5 minutes avec Gorm et Moustache).</p>
    <div class="choixh"><button onclick="location.href='duel.html?tuto=1'">🎓 Faire le tutoriel</button><button onclick="accueil()">Retour</button></div>`);
}
// pendant les animations, les dés qui roulent et les fenêtres (résumé du tour adverse, aides), le projecteur s'efface
const _joueFXTuto = joueFX; joueFX = function () { projecteurCache(); return _joueFXTuto(); };
const _roulerTuto = rouler; rouler = function (...a) { projecteurCache(); return _roulerTuto(...a); };
const _fenetreTuto = fenetre; fenetre = function (h) { projecteurCache(); return _fenetreTuto(h); };
const _fermerTuto = fermer; fermer = function () { const r = _fermerTuto(); if (S && S.tuto) setTimeout(tutoMaj, 30); return r; };
