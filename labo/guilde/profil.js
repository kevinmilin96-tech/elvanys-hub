// =============================================================================================== MON PROFIL (14/11)
// Décision de l'utilisateur (boîtes) : une page « Mon profil » ouverte depuis le menu ; on y choisit son NOM, son CADRE (un seul, autour du
// héros qu'on joue), son TITRE (affiché sous son nom en combat), et on y retrouve les TROPHÉES (les mêmes que le Panthéon).
// Les titres et les trophées sont décrits ICI une seule fois (le Panthéon les lit aussi). Chaque titre gagné débloque son cadre.
// Cadres provisoires dessinés en code (anneau de couleur + emblème), en attendant des cadres en image.
const PROFIL_CLE = 'guilde-profil';
const JL = (cle, def) => { try { return JSON.parse(localStorage.getItem(cle) || 'null') || def; } catch (e) { return def; } };
// la plus longue suite de jours d'énigmes réussies (dates « AAAA-MM-JJ » qui se suivent)
function serieMaxEnigme(eni) { const j = Object.keys(eni || {}).filter(k => eni[k] && eni[k].ok).sort(); let best = 0, n = 0, prev = null;
  for (const k of j) { const t = Date.parse(k + 'T12:00:00Z'); n = prev !== null && Math.round((t - prev) / 864e5) === 1 ? n + 1 : 1; prev = t; if (n > best) best = n; } return best; }
// titre = [clé, emblème, nom, comment l'obtenir, gagné ?, couleur du cadre]
function titresGuilde() {
  const P = typeof lirePantheon === 'function' ? lirePantheon() : { heros:{} }, exp = JL('guilde-expedition2-records', []), inv = JL('guilde-invasion', {});
  const eni = JL('guilde-enigmes', {}), serieMax = serieMaxEnigme(eni), eniDim = Object.keys(eni).filter(k => eni[k].ok && new Date(k + 'T12:00:00').getDay() === 0).length;
  return [
    ['diplome',   '🎓', 'Diplômé de la Guilde', 'Finir le tutoriel avec Moustache.', localStorage.getItem('guilde-tuto') === 'fait', '#f3c96b'],
    ['odyssee',   '🌟', 'Héros de l’Odyssée', 'Libérer les trois îles de l’Odyssée.', !!localStorage.getItem('guilde-odyssee-finie'), '#7cc8ff'],
    ['neant',     '🌑', 'Briseur de Néant', 'Inscrire un héros au Tableau d’honneur (finir l’Abîme du Vide).', Object.keys(P.heros || {}).length > 0, '#a855f7'],
    ['traversee', '🌊', 'Traversée parfaite', 'Vaincre le Titan des Expéditions sans perdre un cœur.', exp.some(r => r.parfait), '#2fd3c4'],
    ['rempart',   '⚔️', 'Rempart de la Guilde', 'Gagner les deux actes de l’Invasion.', !!(inv.eveil && inv.reveil), '#ff6b5a'],
    ['sceaux',    '🔏', 'Gardien des sceaux', 'Gagner 10 Sceaux de la semaine (Duel de la semaine).', Object.keys(JL('guilde-sceaux', {})).length >= 10, '#d08a4a'],
    // 15/11 soir : les titres des nouveaux modes
    ['profondeurs', '🗺️', 'Seigneur des profondeurs', 'Remonter d’une Descente (Crypte) : les trois étages et leurs boss.', (JL('guilde-descente', {}).victoires || 0) > 0, '#ff9a4a'],
    ['abysses',   '🕳', 'Roi des abysses', 'Gagner une Descente en profondeur 5 ou plus.', (JL('guilde-descente', {}).profMax || 0) >= 6, '#7a4aff'],
    ['chroniques', '📜', 'Héros des Chroniques', 'Finir la Campagne des Chroniques (les trois chapitres).', (JL('guilde-chroniques', {}).campagnes || 0) > 0, '#c084fc'],
    ['fosse',     '🔥', 'Tueur de Titan', 'Abattre le Titan de feu dans la Fosse aux Runes.', (JL('guilde-fosse3', {}).victoires || 0) > 0, '#ff6a3a'],
    // 21/11 (accord de l'utilisateur) : les SÉRIES de l'énigme du jour (la meilleure série jamais faite, jours qui se suivent)
    ['serie7',    '🔥', 'Fidèle de l’énigme', 'Réussir l’énigme du jour 7 jours de suite.', serieMax >= 7, '#ffb347'],
    ['serie30',   '🌙', 'Esprit affûté', 'Réussir l’énigme du jour 30 jours de suite.', serieMax >= 30, '#8ab4ff'],
    ['serie100',  '🏛', 'Grand Sphinx', 'Réussir l’énigme du jour 100 jours de suite.', serieMax >= 100, '#ffd75e'],
    // 21/11 : les titres de FIDÉLITÉ, reçus dans la boîte aux lettres aux paliers de 30 et 100 jours joués (amis.js)
    ['fidele30',  '🏅', 'Pilier de la Guilde', 'Jouer 30 jours (pas forcément à la suite) : cadeau de la boîte aux lettres.', JL('guilde-titres-boite', []).includes('fidele30'), '#e0a84a'],
    ['fidele100', '👑', 'Légende fidèle', 'Jouer 100 jours (pas forcément à la suite) : cadeau de la boîte aux lettres.', JL('guilde-titres-boite', []).includes('fidele100'), '#ffd75e'],
    // 25/11 : L'ALMANACH (palier 10 de chaque saison : un titre et son cadre)
    ['hiver1',    '❄', 'Veilleur de l’Hiver', 'Atteindre le palier 10 de l’Almanach · Saison 1 (L’Hiver des runes).', typeof almGagne === 'function' && almGagne('titre', 'hiver1'), '#9fdcff'],
    ['sphinx',    '🧩', 'Sphinx de la Guilde', 'Résoudre une énigme du dimanche (la plus redoutable de la semaine).', eniDim > 0, '#9be37a'],
    // 14/11 nuit : les titres du Rang de la Guilde (rang.js)
    // 22/11 : les titres des SUCCÈS (dernier palier) et des points de succès ; seulement ceux qui sont gagnés, pour ne pas allonger les listes
    ...(typeof succesTitres === 'function' ? succesTitres().filter(t => t[4]) : []),
    ...(typeof ROUTE !== 'undefined' ? Object.entries(ROUTE).filter(([, x]) => x[0] === 'titre').map(([n, x]) => [x[1], x[2], x[3], `Atteindre le rang ${n} de la Guilde.`, rgRecompense('titre', x[1]), COULEUR_TITRE_RANG[x[1]] || '#f3c96b']) : []),
  ];
}
// ------------------------------------------------------------------ 15/11 : L'ATELIER DU PROFIL (demande : « un crayon Modifier qui ouvre l'onglet
// de modification du profil, où on change l'image, le cadre, les dés…, à étoffer avec plein de features »)
// portrait (n'importe quel héros, ou un héros d'aventure), emblème, couleur du nom, fond de la carte, devise, vitrine de 3 titres.
// Chaque choix a sa condition : libre, un rang de la Guilde (r), ou un titre gagné (t). Rien ne donne d'avantage en jeu.
const rangGuilde = () => typeof lireRang === 'function' ? lireRang().info.rang : 1;
const titreGagne = k => titresGuilde().some(x => x[0] === k && x[4]);
const condOk = c => !c || (c.r ? rangGuilde() >= c.r : true) && (c.t ? titreGagne(c.t) : true) && (c.alm ? typeof almGagne === 'function' && almGagne(c.alm[0], c.alm[1]) : true); // 26/11 : alm = gagné dans l'Almanach
const condTxt = c => !c ? '' : c.alm ? 'Almanach, palier 30' : c.r ? `rang ${c.r} de la Guilde` : c.t ? `titre « ${(titreDe(c.t) || [])[2] || c.t} »` : '';
const FONDS = {
  nuit:['Nuit étoilée', 'url(fonds/carte-nuit.webp?v=1) center/cover, radial-gradient(ellipse at 50% 0%, #3a2a5c, #120f24 75%)'],
  forge:['La forge', 'url(fonds/carte-forge.webp?v=1) center/cover, radial-gradient(ellipse at 50% 100%, #8a3a12, #2a1208 70%)'],
  foret:['La forêt', 'url(fonds/carte-foret.webp?v=1) center/cover, linear-gradient(180deg, #1f4a2a, #0c1f12)'],
  ocean:['L’océan', 'url(fonds/carte-ocean.webp?v=1) center/cover, linear-gradient(180deg, #13406a, #081a30)'],
  aube:['L’aube', 'url(fonds/carte-aube.webp?v=1) center/cover, linear-gradient(180deg, #ff9a6a, #6a3a8a 60%, #1a1430)', { r:3 }],
  aurore:['L’aurore', 'url(fonds/carte-aurore.webp?v=1) center/cover, linear-gradient(160deg, #0a3a3a, #2a8a6a 40%, #6a3aaa 70%, #120f24)', { r:6 }],
  orage:['L’orage', 'url(fonds/carte-orage.webp?v=1) center/cover, radial-gradient(ellipse at 30% 20%, #6a7aaa, #1a2040 50%, #08080f)', { r:10 }],
  royal:['La salle du trône', 'url(fonds/carte-royal.webp?v=1) center/cover, linear-gradient(180deg, #6a1a2a, #3a0a14 50%, #c9a03a 51%, #3a0a14 53%, #1a0408)', { r:15 }],
  etoiles:['La voie lactée', 'url(fonds/carte-etoiles.webp?v=1) center/cover, radial-gradient(ellipse at 70% 30%, #fff3 0%, transparent 20%), linear-gradient(135deg, #0a0420, #3a1a6a, #0a0420)', { r:20 }],
  lave:['La lave', 'url(fonds/carte-lave.webp?v=1) center/cover, radial-gradient(ellipse at 50% 110%, #ff6a1a, #8a1a0a 40%, #1a0804 75%)', { t:'fosse' }],
  iles:['Les trois îles', 'url(fonds/carte-iles.webp?v=1) center/cover, linear-gradient(180deg, #ff8a3a 0%, #8ad4ff 50%, #3a1a6a 100%)', { t:'odyssee' }],
  grimoire:['Le grimoire', 'url(fonds/carte-grimoire.webp?v=1) center/cover, linear-gradient(90deg, #3a2814, #c9a46a 48%, #8a6a3a 50%, #c9a46a 52%, #3a2814)', { t:'chroniques' }],
  vide:['Le Néant', 'url(fonds/carte-vide.webp?v=1) center/cover, radial-gradient(circle at 50% 50%, #a855f7 0%, #2a0a4a 35%, #000 75%)', { t:'neant' }],
  enigmes:['La nuit des énigmes', 'radial-gradient(circle at 30% 30%, #9be37a33 0%, transparent 25%), radial-gradient(circle at 70% 70%, #8ab4ff33 0%, transparent 25%), linear-gradient(160deg, #0f1a2a, #1a2a4a 50%, #0a0f1a)', { t:'serie30' }],
  // 26/11 : la Saison 1 de l'Almanach (palier 30) : un fond où la neige tombe (classe fond-neige, profil.html)
  blizzard:['Le blizzard (Saison 1)', 'url(fonds/carte-blizzard.webp?v=1) center/cover, radial-gradient(ellipse at 50% 0%, #5a7aa8, #1a2640 60%, #0a0f1c)', { alm:['fond', 'blizzard'] }],
  profondeurs:['Les profondeurs', 'url(fonds/carte-profondeurs.webp?v=1) center/cover, radial-gradient(ellipse at 50% 120%, #ff9a4a55, #14100c 60%), #14100c', { t:'profondeurs' }],
};
// 25/11 : les cadres peints des titres (cadres/profil-<titre>.webp), posés par-dessus le portrait
const CADRES_PEINTS = ['diplome', 'odyssee', 'neant', 'traversee', 'rempart', 'sceaux', 'profondeurs', 'chroniques', 'fosse', 'sphinx', 'apprenti', 'compagnon', 'maitre', 'champion', 'legende', 'archimage'];
// 26/11 : les cadres qui ont un ruban peint : le mot que le jeu écrit dessus (profil.html, .ruban)
const CADRES_RUBAN = {}; // 26/11 (l'utilisateur) : pas de mot écrit par le jeu sur un ruban : rien, ou c'est Gemini qui l'écrit
// 25/11 : les emblèmes peints (ui/emblemes/emb-<clé>.webp), l'émoji sinon
const EMB_PEINTS = ['lion', 'loup', 'dragon', 'hibou', 'chat', 'epee', 'bouclier', 'etoile', 'flamme', 'eclair', 'couronne', 'diamant', 'comete'];
const emIco = (k, e, px) => EMB_PEINTS.includes(k) ? `<img src="ui/emblemes/emb-${k}.webp?v=1" alt="" style="width:${px}px;height:${px}px;object-fit:contain;vertical-align:middle;box-shadow:none;border-radius:0">` : e;
const EMBLEMES = [['aucun', '—'], ['lion', '🦁'], ['loup', '🐺'], ['dragon', '🐉'], ['hibou', '🦉'], ['chat', '🐱'], ['epee', '⚔️'], ['bouclier', '🛡️'], ['etoile', '⭐'],
  ['flamme', '🔥', { r:4 }], ['eclair', '⚡', { r:7 }], ['couronne', '👑', { r:12 }], ['diamant', '💎', { r:18 }], ['comete', '☄️', { r:25 }],
  ['flocon', '❄️', { alm:['embleme', 'flocon'] }], ['de', '🎲', { t:'diplome' }], ['vague', '🌊', { t:'traversee' }], ['crane', '💀', { t:'fosse' }], ['parchemin', '📜', { t:'chroniques' }], ['lune', '🌑', { t:'neant' }], ['sphinx', '🧩', { t:'sphinx' }], ['cle', '🗝️', { t:'serie7' }], ['oeil', '👁️', { t:'serie100' }]];
const COULEURS_NOM = [['blanc', '#f1ecff'], ['or', '#f3c96b'], ['ciel', '#7cd4ff'], ['menthe', '#7dffb0'], ['rose', '#ff8ad4', { r:5 }], ['braise', '#ff7a3a', { r:8 }],
  ['amethyste', '#c084fc', { r:11 }], ['arcenciel', 'linear-gradient(90deg,#ff5a5a,#f3c96b,#7dffb0,#7cd4ff,#c084fc)', { r:22 }]];
const DEVISES = ['Ce qui est forgé ne casse pas.', 'Un dé, une chance.', 'Toujours un 6 dans la manche.', 'La Guilde avant tout.', 'Je lance, donc je suis.',
  'Ni peur, ni reproche.', 'Le sort sourit aux audacieux.', 'Pas de sieste avant le boss.', 'Moustache a toujours raison.', 'Une rune à la fois.', 'Au bout du donjon, la gloire.', 'Les dés sont jetés.'];
function nomStyle(p) { const c = (COULEURS_NOM.find(x => x[0] === p.couleur) || COULEURS_NOM[0])[1]; return c.startsWith('linear') ? `background:${c};-webkit-background-clip:text;background-clip:text;color:transparent` : `color:${c}`; }
// 24/11 : 10 AVATARS DE PROFIL (Gemini, portraits/avatar-NN.webp) : des aventuriers qui ne sont pas des héros ; n° 2 refait le 24/11 (barbe sans tresses)
const AVATARS_PROFIL = [['01', 'La voyageuse'], ['02', 'Le forgeron'], ['03', 'L’archer elfe'], ['04', 'La cuisinière'], ['05', 'La mage des étoiles'], ['06', 'L’écuyer'], ['07', 'Le bricoleur'], ['08', 'Le nomade'], ['09', 'La capitaine'], ['10', 'La guerrière']];
function portraitProfil(p) {
  if (p.portrait && p.portrait.startsWith('av:') && typeof avTrouve === 'function') { const a = avTrouve(p.portrait.slice(3)); if (a) return [avPortrait(a), avPortraitSecours(a)]; }
  if (p.portrait && /^avatar-\d\d$/.test(p.portrait)) return [`portraits/${p.portrait}.webp?v=1`, 'portraits/gorm.webp']; // 24/11 : les avatars de profil (personnages qui ne sont pas des héros)
  const id = p.portrait && typeof HEROS !== 'undefined' && HEROS[p.portrait] ? p.portrait : null;
  if (id) return [`portraits/${id}.webp`, `portraits/${id}.webp`];
  return [null, null];
}
function lireProfil() {
  const p = Object.assign({ nom:'', cadre:null, titre:null, portrait:null, embleme:'aucun', couleur:'blanc', fond:'nuit', devise:'', vitrine:[] }, JL(PROFIL_CLE, {}));
  const gagnes = titresGuilde().filter(t => t[4]).map(t => t[0]);
  if (p.cadre === null) p.cadre = gagnes.includes('diplome') ? 'diplome' : 'aucun'; // avant le profil, le diplôme se posait tout seul : on garde ça par défaut
  if (p.cadre !== 'aucun' && !gagnes.includes(p.cadre)) p.cadre = 'aucun';
  if (p.titre && !gagnes.includes(p.titre)) p.titre = null;
  const em = EMBLEMES.find(x => x[0] === p.embleme); if (!em || !condOk(em[2])) p.embleme = 'aucun';
  const co = COULEURS_NOM.find(x => x[0] === p.couleur); if (!co || !condOk(co[2])) p.couleur = 'blanc';
  if (!FONDS[p.fond] || !condOk(FONDS[p.fond][2])) p.fond = 'nuit';
  p.vitrine = (p.vitrine || []).filter(k => gagnes.includes(k)).slice(0, 3);
  // 15/11 (l'utilisateur : « il y a écrit Toi, je devrais retrouver mon pseudo en ligne ») : sans nom choisi, le pseudo de la carte de joueur
  if (!(p.nom || '').trim()) { try { const c = JSON.parse(localStorage.getItem('guilde-carte') || 'null'); p.nom = (c && c.pseudo) || localStorage.getItem('guilde-pseudo') || ''; } catch (e) {} }
  return p;
}
function ecrireProfil(p) { localStorage.setItem(PROFIL_CLE, JSON.stringify({ nom:(p.nom || '').trim().slice(0, 18), cadre:p.cadre, titre:p.titre, portrait:p.portrait || null,
  embleme:p.embleme, couleur:p.couleur, fond:p.fond, devise:String(p.devise || '').slice(0, 60), vitrine:(p.vitrine || []).slice(0, 3) })); }
const titreDe = k => titresGuilde().find(t => t[0] === k);
// le portrait du joueur en combat : cadre + nom + titre (appelé après chaque dessin du Duel)
function appliqueProfil() {
  const b = document.getElementById('b-J'); if (!b || typeof S === 'undefined' || !S || S.deux || S.coop) return;
  const p = lireProfil(), c = p.cadre !== 'aucun' && titreDe(p.cadre);
  b.classList.toggle('cadreP', !!c); if (c) { b.style.setProperty('--cc', c[5]); b.dataset.e = c[1]; }
  const n = b.querySelector('.nom'); if (n && (p.nom || p.titre)) { n.classList.add('nomP'); const t = p.titre && titreDe(p.titre); const em = (EMBLEMES.find(x => x[0] === p.embleme) || [])[1]; n.innerHTML = `${em && em !== '—' ? em + ' ' : ''}<span style="${nomStyle(p)}">${p.nom || 'Toi'}</span>${t ? ` <small>${t[1]} ${t[2]}</small>` : ''}`; }
}
if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = `
  .barre.cadreP img:first-child { box-shadow:0 0 0 3px var(--cc), 0 0 16px var(--cc); }
  .barre.cadreP::after { content:attr(data-e); position:absolute; font-size:16px; left:2px; top:2px; z-index:3; filter:drop-shadow(0 1px 2px #000); }
  .unique .barre.cadreP::after { display:none; } /* 14/11 : plus d'émoji sur le portrait (le titre est dans le panneau de droite) */
  .unique #b-J .nom.nomP { display:block !important; top:auto !important; bottom:calc(100% - 1.5cqw) !important; font-size:2.8cqw; }
  .nom.nomP small { color:#f3c96b; font-size:.85em; }`; document.head.appendChild(st); }

// les trophées de tous les modes (page Panthéon et page Mon profil)
function tropheesHTML() {
  const parties = JL('guilde-parties', []), actes = JL('guilde-actes', {}), asc = JL('guilde-ascension', {}), exp = JL('guilde-expedition2-records', []), inv = JL('guilde-invasion', {}), def = JL('guilde-defense', []), sc = JL('guilde-sceaux', {});
  const v = id => parties.filter(p => p.moi === id && p.resultat === 'gagne').length;
  const eni = JL('guilde-enigmes', {}), eniOk = Object.keys(eni).filter(k => eni[k].ok).sort();
  const eniDim = eniOk.filter(k => new Date(k + 'T12:00:00').getDay() === 0).length, eniPremier = eniOk.filter(k => eni[k].essais === 1).length;
  let eniSerieMax = 0, eniS = 0, eniAvant = null; eniOk.forEach(k => { const d = new Date(k + 'T12:00:00'); eniS = eniAvant && (d - eniAvant) / 864e5 === 1 ? eniS + 1 : 1; eniAvant = d; eniSerieMax = Math.max(eniSerieMax, eniS); });
  const s = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`, nemV = +(localStorage.getItem('guilde-nemesis-vaincues') || 0), nbSc = Object.keys(sc).length;
  return `<div class="tro">
    <div><b>⚔️ L’Arène</b>${parties.filter(p => p.resultat === 'gagne').length} duels gagnés sur ${parties.length}<br><small>${ORDRE.filter(id => v(id)).map(id => `${HEROS[id].nom} ${v(id)}`).join(' · ') || '—'}</small></div>
    <div><b>🏰 L’Odyssée</b>${['brulees', 'givre', 'abime'].map(a => `${a === 'brulees' ? 'Terres brûlées' : a === 'givre' ? 'Givre' : 'Abîme'} ${actes[a] ? '✅' : '⬜'}${asc[a] ? ` ⛰${asc[a]}` : ''}`).join('<br>')}</div>
    <div><b>⛵ Les Expéditions</b>${s(exp.filter(r => r.gagne).length, 'gagnée')} sur ${exp.length}<br><small>meilleur score : ${exp.length ? Math.max(...exp.map(r => r.score)) : '—'}</small></div>
    <div><b>😈 Les Némésis</b>${s(nemV, 'vaincue')}<br><small>${Object.entries(JL('guilde-nemesis', {})).map(([h, n]) => `${HEROS[h].nom} ← ${HEROS[n.rival].nom} (niv. ${n.niv})`).join(' · ') || 'aucune en cours'}</small></div>
    <div><b>🏰 La Défense de la porte</b>${s(def.filter(x => x.gagne).length, 'victoire')} sur ${def.length}<br><small>meilleur score : ${Math.max(0, ...def.map(x => x.score)) || '—'}</small></div>
    <div><b>🔏 Les Sceaux de la semaine</b>${nbSc} sceau${nbSc > 1 ? 'x' : ''}<br><small>${Object.entries(sc).sort().reverse().slice(0, 8).map(([k, x]) => `<img src="portraits/sceau-${x.id || 'semaine'}.webp?v=2" onerror="this.onerror=null;this.src='portraits/sceau-semaine.webp?v=1'" title="${k.slice(8, 10)}/${k.slice(5, 7)} · ${x.regle}${x.heros && typeof HEROS !== 'undefined' && HEROS[x.heros] ? ' · ' + HEROS[x.heros].nom : ''}" alt="" style="width:40px;height:40px;vertical-align:middle;margin:2px">`).join('') || 'aucun pour l’instant'}</small></div>
    <div><b>🧩 L’énigme du jour</b>${s(eniOk.length, 'résolue')} · ${eniPremier} du premier coup<br><small>meilleure série : ${eniSerieMax} jour${eniSerieMax > 1 ? 's' : ''} · dimanches : ${eniDim}</small></div>
    ${(() => { const cr = JL('guilde-crypte', {}), de = JL('guilde-descente', {}), fo = JL('guilde-fosse3', {}), ch = JL('guilde-chroniques', {});
      return `<div><b>🪦 La Crypte aux Sceaux</b>${s(cr.victoires || 0, 'crypte')} vidée${(cr.victoires || 0) > 1 ? 's' : ''} sur ${cr.parties || 0}<br><small>meilleur score : ${cr.meilleur || '—'}</small></div>
    <div><b>🗺️ La Descente</b>${s(de.victoires || 0, 'victoire')} sur ${de.parties || 0} · profondeur ${Math.max(0, (de.profMax || 1) - 1)}<br><small>breloques : ${Object.keys(de.breloques || {}).length}/8 · meilleur score : ${de.meilleur || '—'}</small></div>
    <div><b>🕳️ La Fosse aux Runes</b>${s(fo.victoires || 0, 'Titan')} abattu${(fo.victoires || 0) > 1 ? 's' : ''} sur ${fo.parties || 0}<br><small>meilleur score : ${fo.meilleur || '—'}</small></div>
    <div><b>📜 Les Chroniques</b>${s(ch.horloger || 0, 'scénario')} gagné${(ch.horloger || 0) > 1 ? 's' : ''}<br><small>campagnes finies : ${ch.campagnes || 0}${ch.gardiens ? ' · 🏅 Gardiens du temps' : ''}</small></div>`; })()}
    <div><b>🛡 L’Invasion</b>Acte I ${inv.eveil ? '✅' : '⬜'} · Acte II ${inv.reveil ? '✅' : '⬜'}<br><small>grands boss : ${['colosseracines', 'kraken', 'ignaros'].filter(k => inv[k]).map(k => HEROS[k].nom.split(',')[0]).join(', ') || '—'}</small></div>
  </div>`;
}
