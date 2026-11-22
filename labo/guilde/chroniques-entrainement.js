// =============================================================================================== L'ENTRAÎNEMENT DES CHRONIQUES (18/11, moteur commun : entrainement.js)
// chroniques.html?entrainement=1 : un mini-donjon fait exprès (scénario « entrainement » de chroniques-moteur.js), joué en vrai avec Maëlle seule,
// guidé par Moustache, environ 3 minutes. Dans l'ordre : lancer ses dés, marcher (et tomber dans un piège caché), chercher les pièges,
// fouiller un coffre, finir le tour (le sablier), ouvrir une porte (gratuit), le dé 👣 des pas qui restent, un levier « ≥ 4 »,
// la porte de bronze, la fiche d'un monstre (ce qu'il annonce, ses sceaux), se protéger, le tour des monstres, briser les sceaux.
// Les dés sont imposés à chaque tour (S.desForces) : on réussit à coup sûr. Rien n'est sauvegardé : la vraie partie reste telle quelle.
const ENTR_CLE_C = 'chroniques';
let ENTR_C = false; // vrai pendant l'entraînement
const eH = () => S && S.heros[0];
const eDe = v => () => { if (typeof animeH !== 'undefined' && animeH) return null; return [...document.querySelectorAll('#desH .de:not(.pas)')].find(b => { const i = b.querySelector('img'); return i && i.alt === String(v); }) || null; };
const ePas = () => document.querySelector('#desH .de.pas');
const eCase = (x, y) => () => document.getElementById(`c-${x}-${y}`);
const eSel = v => { const d = typeof deSel === 'function' && S ? deSel() : null; return !!d && !d.pas && d.v === v; };
const eSelPas = () => { const d = typeof deSel === 'function' && S ? deSel() : null; return !!d && !!d.pas; };
const eObj = c => S && S.R && S.R.obj[c];
const eFen = () => document.querySelector('#fen .fen');
const eLibre = () => S && !occupe && !(typeof animeH !== 'undefined' && animeH) && !eFen() && !document.querySelector('#perso .ps-page');
const eMonstre = () => S && S.R.monstres[0];
const eTour = () => S ? S.R.tour : 0;
const eLance = () => S && typeof lanceOK === 'function' && lanceOK(0) && !(typeof animeH !== 'undefined' && animeH);
const eBouton = (sel, txt) => () => [...document.querySelectorAll(sel)].find(b => b.textContent.includes(txt)) || null;
const eSceau = t => () => { const m = eMonstre(); if (!m || !eFen()) return null; const k = m.sceaux.findIndex(s => s.t === t && !s.ok); return k >= 0 ? document.querySelectorAll('#fen .sx')[k] : null; };
const eFiche = () => { const f = eFen(); return !!f && !!f.querySelector('.go') && /Rouagelin/.test(f.textContent) && /Ce tour-ci/.test(f.textContent); };

function entrainementChroniques() {
  ENTR_C = true; fenetre(''); $('perso') && ($('perso').innerHTML = '');
  S = K.nouvelle(['maelle'], 'entrainement-moustache', 'entrainement', { sansBonus:true, sansPouvoirs:true });
  S.textes = { titre:'🎓 L’entraînement', duree:'', ouverture:'', entree:() => '',
    but:'Entraînement : suis Moustache. Ouvre les portes, baisse le levier, bats le Rouagelin.', porter:'', gagne:['🎓 Entraînement réussi', ''] };
  actif = 0; sel = null; centrer = true; petit = false; dessine();
  Entrainement.lance(ENTR_CLE_C, [
    // ---------------------------------------------------------------- tour 1 : marcher, le piège, chercher, fouiller, finir le tour
    { c:'Miaou ! Bienvenue dans les <b>Chroniques</b>. Ici, on joue comme à un jeu de plateau : le donjon est dans le noir, on ouvre des portes, on fouille les meubles, et tout se fait avec des <b>dés</b>. Je t’ai préparé un tout petit donjon. Trois tours, promis.', g:'Un donjon miniature ? Je l’aurais forgé plus grand.', montre:eLibre },
    { c:'Au début de chaque tour, tes dés sont cachés. Touche « <b>🎲 Lancer</b> ».', cible:'#desH .lancerH', ok:eLance, montre:() => S && !occupe },
    { c:'Un dé sert à tout : <b>marcher</b> (1 case par point), fouiller, frapper, protéger… Pour avancer, touche le <b>3</b>.', cible:eDe(3), ok:() => eSel(3) || eObj('4,9').trouve, montre:eLibre },
    { c:'Les cases claires : là où ton 3 peut t’emmener. Touche la case <b>juste devant la porte</b>, en haut.', cible:eCase(4, 8), ok:() => eObj('4,9').trouve, montre:eLibre },
    { c:'Aïe ! Un <b>PIÈGE caché</b>. Personne ne le voyait : quand on passe dessus, il part (<b>−3 ❤</b>), on s’arrête net, et le reste du dé est perdu. Bonne nouvelle : un piège ne sert qu’une fois.', g:'Ma cheville… Qui pose des pièges dans un couloir ?', montre:eLibre },
    { c:'Pour les voir AVANT de marcher dessus : choisis le <b>2</b>, puis touche « <b>🔍 Pièges</b> ». Maëlle fouille du regard 2 cases autour d’elle.', cible:eDe(2), ok:() => eSel(2) || eObj('5,8').vu, montre:eLibre },
    { c:'Maintenant, touche « <b>🔍 Pièges (2 cases)</b> ».', cible:eBouton('.actions button', 'Pièges'), ok:() => eObj('5,8').vu, montre:eLibre },
    { c:'Là ! Un piège repéré : <b>⚠</b>. Un piège vu se voit de tout le groupe ; en marchant, le chemin passe <b>à côté</b> tout seul. Ne t’arrête jamais dessus, c’est tout.', g:'Noté. Je regarderai où je mets mes bottes.', cible:eCase(5, 8), montre:eLibre },
    { c:'Ce <b>coffre</b>, juste à côté de toi : un meuble se fouille avec un dé (1 pas suffit). Choisis le <b>1</b>…', cible:eDe(1), ok:() => eSel(1) || eObj('3,9').fouille, montre:eLibre },
    { c:'…et touche le coffre.', cible:eCase(3, 9), ok:() => eObj('3,9').fouille, montre:eLibre },
    { c:'Une <b>potion de soin</b> ! Elle va dans ton sac : pour la boire, touche le portrait de Maëlle en bas (sa fiche). Chaque meuble ne se fouille qu’<b>une fois</b>, et il peut cacher n’importe quoi : de l’or, un objet… ou un piège.', g:'Une potion. Ça sent le sirop pour la toux.', montre:eLibre },
    { c:'Tu n’as plus de dés. Touche « <b>✋ Maëlle a fini ▶ les monstres</b> » : les monstres jouent, puis un nouveau tour commence.', cible:'.actions .fin', ok:() => eTour() >= 2, montre:eLibre },
    // ---------------------------------------------------------------- tour 2 : porte, pas qui restent, levier, porte de bronze, monstre, bouclier
    { c:'Rien n’a bougé : un monstre caché dans une salle encore noire <b>dort</b>. Regarde le <b>⌛ sablier</b>, en haut : il perd un grain à chaque tour. À zéro, chaque héros a un dé de moins. Alors on ne traîne pas !', cible:'.haut .hsab', montre:eLibre },
    { c:'Nouveau tour, nouveaux dés : « <b>🎲 Lancer</b> ».', cible:'#desH .lancerH', ok:eLance, montre:() => S && !occupe },
    { c:'Choisis le <b>5</b>.', cible:eDe(5), ok:() => eSel(5) || eH().y <= 8, montre:eLibre },
    { c:'Avance devant la porte (le chemin évite le piège ⚠ tout seul).', cible:eCase(4, 8), ok:() => eH().y <= 8, montre:eLibre },
    { c:'Tu n’as fait qu’un pas : les 4 pas qui restent deviennent un petit dé <b>👣 4</b>. Il sert à marcher ou à fouiller encore. Et maintenant : ouvrir une porte <b>juste à côté de soi</b>, c’est <b>GRATUIT</b>. Touche la porte.', cible:eCase(4, 7), ok:() => S.R.portes['4,7'].ouverte, montre:eLibre },
    { c:'Comme à HeroQuest : une salle reste noire tant qu’on n’a pas ouvert sa porte, puis elle se dévoile en entier. Au fond : un <b>levier</b> et une porte de bronze 🔒. Prends ton <b>👣 4</b>…', g:'Un levier ! Enfin un mécanisme que je comprends.', cible:ePas, ok:() => eSelPas() || eH().y <= 4, montre:eLibre },
    { c:'…et va juste devant la porte de bronze.', cible:eCase(4, 4), ok:() => eH().y <= 4, montre:eLibre },
    { c:'Ce levier affiche « <b>≥ 4</b> » : il demande un dé de <b>4, 5 ou 6</b>. Ton 2 ne suffirait pas ; ton 4, oui. Choisis le <b>4</b>…', cible:eDe(4), ok:() => eSel(4) || S.R.bronze, montre:eLibre },
    { c:'…et touche le levier.', cible:eCase(5, 4), ok:() => S.R.bronze, montre:eLibre },
    { c:'CLONK ! La porte de bronze est déverrouillée. Ouvre-la (gratuit, tu es juste à côté).', cible:eCase(4, 3), ok:() => S.R.portes['4,3'].ouverte, montre:eLibre },
    { c:'Un <b>Rouagelin</b> ! Touche-le (sans choisir de dé) pour lire sa fiche.', g:'Un tas de ferraille qui marche. Je connais mon métier.', cible:() => { const m = eMonstre(); return m ? document.getElementById(`c-${m.x}-${m.y}`) : null; }, ok:() => eFiche() || (eH().bouclier || 0) > 0, montre:eLibre },
    { c:'Le petit <b>⚔ 1</b> sur lui, c’est ce qu’il <b>ANNONCE</b> : au tour des monstres, il avancera et frappera de 1. Le <b>🔒 2</b> : ses deux <b>SCEAUX</b>. Pour l’abattre, il faut tous les briser avec des dés. Touche « <b>Compris</b> ».', cible:'#fen .go', ok:() => !eFen(), montre:eFiche },
    { c:'Il va venir te frapper : <b>protège-toi</b>. Choisis le <b>2</b>…', cible:eDe(2), ok:() => eSel(2) || (eH().bouclier || 0) > 0, montre:eLibre },
    { c:'…puis touche <b>Maëlle</b> elle-même.', cible:eCase(4, 4), ok:() => !!eBouton('#fen button', 'Protéger')() || (eH().bouclier || 0) > 0, montre:eLibre },
    { c:'« <b>🛡 Protéger</b> » : un bouclier qui prend les coups à ta place.', cible:eBouton('#fen button', 'Protéger'), ok:() => (eH().bouclier || 0) > 0, montre:() => !!eFen() },
    { c:'<b>🛡 2</b> : pendant le tour des monstres, le bouclier prend les coups ; au début de ton tour suivant, il <b>fond</b>. Fin du tour : « <b>✋ Maëlle a fini</b> ».', cible:'.actions .fin', ok:() => eTour() >= 3, montre:eLibre },
    // ---------------------------------------------------------------- tour 3 : briser les sceaux
    { c:'Tu as vu ? Il a fait <b>exactement ce qu’il annonçait</b> : il a avancé, puis frappé… dans ton bouclier. Zéro dégât. Les monstres jouent toujours <b>après</b> vous.', g:'Il frappe comme une enclume en plume.', montre:eLibre },
    { c:'« <b>🎲 Lancer</b> », et on le démonte.', cible:'#desH .lancerH', ok:eLance, montre:() => S && !occupe },
    { c:'Il est collé à toi (une case autour, diagonales comprises) : on peut <b>frapper</b>. Choisis le <b>4</b>…', cible:eDe(4), ok:() => eSel(4) || (eMonstre() && eMonstre().sceaux.some(s => s.t === 'min' && s.ok)) || !eMonstre(), montre:eLibre },
    { c:'…et touche le Rouagelin.', cible:() => { const m = eMonstre(); return m ? document.getElementById(`c-${m.x}-${m.y}`) : null; }, ok:() => !!eSceau('min')() || !eMonstre() || eMonstre().sceaux.some(s => s.t === 'min' && s.ok), montre:eLibre },
    { c:'Ses sceaux : en <b>vert</b>, ceux qui acceptent ton dé. « <b>≥ 3</b> » veut un 3 ou plus : pose ton 4 dessus.', cible:eSceau('min'), ok:() => !eMonstre() || eMonstre().sceaux.some(s => s.t === 'min' && s.ok), montre:() => !!eFen() },
    { c:'Il reste « <b>✶</b> » : n’importe quel dé. Choisis le <b>2</b>… (Astuce : un <b>6</b> de Maëlle, son Coup de forge, brise DEUX sceaux d’un coup.)', cible:eDe(2), ok:() => eSel(2) || !eMonstre(), montre:eLibre },
    { c:'…touche le Rouagelin…', cible:() => { const m = eMonstre(); return m ? document.getElementById(`c-${m.x}-${m.y}`) : null; }, ok:() => !!eSceau('any')() || !eMonstre(), montre:eLibre },
    { c:'…et pose ton 2 sur le sceau « ✶ ».', cible:eSceau('any'), ok:() => !eMonstre(), montre:() => !!eFen() },
  ], { heros:{ nom:'Maëlle', img:'portraits/maelle.webp' }, passer:() => { ENTR_C = false; S = null; location.href = 'chroniques.html'; } });
}
// la fin : le Rouagelin tombe → Moustache conclut (rien n'est envoyé au carnet, aucune récompense de partie, seulement +100 XP la 1re fois)
const _finPartieEntr = finPartie;
finPartie = function () {
  if (!S || S.scen !== 'entrainement') return _finPartieEntr.apply(this, arguments);
  const g = S.fin === 'gagne'; S = null; ENTR_C = false; sessionStorage.removeItem('chron-en-jeu');
  const premier = g ? Entrainement.termine(ENTR_CLE_C) : (Entrainement.arrete(), false);
  if (g) { son('victoire'); try { GM.jingle('victoire'); } catch (e) {} }
  fenetre(g ? `<div style="text-align:center"><img src="ui/moustache.webp?v=1" alt="" style="width:84px;height:84px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px #f3c96b"></div>
    <h2>🎓 Entraînement réussi !</h2><p><b>Moustache :</b> « Bien joué, forgeronne. Lancer tes dés, marcher, repérer les pièges, fouiller, ouvrir les portes, baisser un levier, lire ce qu’un monstre annonce, te protéger, briser ses sceaux : tu sais tout. Dans un vrai donjon, plusieurs héros jouent dans l’ordre qu’ils veulent, chacun touche “a fini”, puis les monstres jouent. »</p>
    ${premier ? '<p style="text-align:center">🏆 +100 XP pour ton rang de la Guilde.</p>' : ''}
    <p><b>Moustache :</b> « Et si jamais tu as besoin, retrouve-moi dans les <b>Paramètres</b> pour refaire une session ensemble. »</p>
    <div class="choixh"><button class="or" onclick="fenetre('');accueil()">📜 Une vraie partie</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`
  : `<h2>💀 Raté, cette fois</h2><p><b>Moustache :</b> « Ça arrive même aux meilleurs chats. On recommence ? »</p><div class="choixh"><button class="or" onclick="entrainementChroniques()">🔄 Recommencer</button><button onclick="fenetre('');accueil()">Plus tard</button></div>`, false);
};
// « ‹ Quitter » pendant l'entraînement = passer l'entraînement (rien n'est gardé)
const _quitterEntr = quitter;
quitter = function () { if (S && S.scen === 'entrainement') { Entrainement.passer(); return; } return _quitterEntr.apply(this, arguments); };
// pendant l'entraînement, les guides de Moustache de l'écran se taisent (c'est déjà lui qui guide)
const _guideModeEntr = guideMode;
guideMode = function () { if (ENTR_C || (S && S.scen === 'entrainement')) return false; return _guideModeEntr.apply(this, arguments); };
// au premier passage dans le mode : Moustache propose l'entraînement (avec « Passer »)
function proposeEntrC() {
  // 22/11 (l'utilisateur : « Rejoindre avec un code m'amène sur la proposition d'entraînement ») : l'adresse ?code= est effacée
  // avant ce moment ; on ne propose donc rien si une fenêtre est déjà ouverte (le code, une salle…) ou si on est dans une salle
  if (S || Entrainement.fait()[ENTR_CLE_C] || localStorage.getItem('guilde-chron-entr-propose') || location.search) return;
  if ((typeof L !== 'undefined' && L) || (typeof LOB !== 'undefined' && LOB) || (document.getElementById('fen') && document.getElementById('fen').innerHTML.trim())) return;
  localStorage.setItem('guilde-chron-entr-propose', '1');
  fenetre(`<div style="text-align:center"><img src="ui/moustache.webp?v=1" alt="" style="width:84px;height:84px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 3px #f3c96b"></div><h2>Premières Chroniques ?</h2>
    <p><b>Moustache :</b> « On visite un petit donjon d’entraînement ensemble ? Trois minutes, et tu sais tout : marcher, les pièges, fouiller, les portes, les leviers, battre un monstre. »</p>
    <div class="choixh"><button class="or" onclick="entrainementChroniques()">🎓 L’entraînement (3 min)</button><button onclick="fenetre('')">Passer</button></div>`);
}
if (/entrainement=1/.test(location.search)) setTimeout(() => { history.replaceState(null, '', location.pathname); entrainementChroniques(); }, 300);
else proposeEntrC();
