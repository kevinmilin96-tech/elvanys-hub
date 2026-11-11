// La Guilde des Runes — LES PAGES DE CHRONIQUE (10/11 soir) : le récit façon grimoire (parchemin, cadre de cristal, illustration, texte,
// « Tourner la page »), partagé par l'Odyssée, les Expéditions et le Campement. Textes originaux de Claude (choix de l'utilisateur), ton épique.
// Illustration : decor/chron-<cle>.webp si l'image existe (prompts Gemini à écrire), sinon un fond coloré avec un symbole.
const CHRON_CSS = `
.chron { position:fixed; inset:0; z-index:40; background:#07060c; display:flex; align-items:center; justify-content:center; padding:10px; }
.chron .page { position:relative; width:min(96vw, 520px); max-height:94vh; overflow:auto; border-radius:14px; padding:18px 18px 14px; color:#2b2117; font-family:Georgia, 'Times New Roman', serif;
  background:radial-gradient(ellipse at 30% 20%, #f6ead0, #e6d3a8 60%, #d2b985 100%); box-shadow:0 0 0 4px #4a2a7a, 0 0 0 7px #8b5cf6, 0 0 40px #8b5cf6aa, inset 0 0 40px #b8955a88; animation:tourne .55s ease-out; transform-origin:left center; }
@keyframes tourne { from { transform:perspective(900px) rotateY(-70deg); opacity:0; } to { transform:none; opacity:1; } }
.chron .page.part { animation:tournePart .4s ease-in forwards; } @keyframes tournePart { to { transform:perspective(900px) rotateY(70deg); opacity:0; } }
.chron .coin { position:absolute; width:34px; height:34px; background:radial-gradient(circle at 40% 40%, #c084fc, #4a2a7a 70%); clip-path:polygon(50% 0, 100% 35%, 80% 100%, 20% 100%, 0 35%); opacity:.9; }
.chron .coin.a { left:-10px; top:-10px; } .chron .coin.b { right:-10px; top:-10px; } .chron .coin.c { left:-10px; bottom:-10px; } .chron .coin.d { right:-10px; bottom:-10px; }
.chron .sur { text-align:center; color:#7a5a2a; letter-spacing:.25em; font-size:.72em; text-transform:uppercase; }
.chron h1 { text-align:center; font-size:1.35em; margin:.2em 0 .4em; color:#4a2a7a; text-shadow:0 1px 0 #fff8; }
.chron .orn { text-align:center; color:#b8955a; letter-spacing:.4em; margin:.1em 0 .5em; }
.chron .illu { width:100%; aspect-ratio:16 / 9; border-radius:10px; margin:6px 0 10px; display:flex; align-items:center; justify-content:center; font-size:3.6em; box-shadow:inset 0 0 0 2px #b8955a, inset 0 0 30px #0008, 0 2px 8px #0006; background-size:cover; background-position:center; }
.chron p { font-size:.98em; line-height:1.5; margin:.5em 0; text-align:justify; }
.chron p.cit { font-style:italic; text-align:center; color:#6b4a1a; }
.chron .choix button { display:block; width:100%; text-align:left; margin:6px 0; padding:9px 12px; border-radius:10px; border:2px solid #8b5cf6; background:#f3e9d2; color:#2b2117; font:inherit; cursor:pointer; }
.chron .choix button small { display:block; color:#6b4a1a; }
.chron .choix button:disabled { opacity:.45; }
.chron .suite { display:block; margin:12px auto 0; padding:10px 22px; border-radius:14px; border:0; background:linear-gradient(135deg, #8b5cf6, #4a2a7a); color:#fff; font:inherit; font-weight:bold; cursor:pointer; box-shadow:0 3px 10px #0006; }
.chron .num { position:absolute; right:14px; bottom:6px; font-size:.7em; color:#7a5a2a; }
`;
if (typeof document !== 'undefined') document.head.insertAdjacentHTML('beforeend', '<style>' + CHRON_CSS + '</style>');
const ILLU_FOND = { feu:'linear-gradient(160deg, #3a0a0a, #a8341a 55%, #f7a23a)', cendre:'linear-gradient(160deg, #2a2a33, #6b5a4a 60%, #c9a56b)', vide:'linear-gradient(160deg, #0b0520, #4a1a8a 60%, #c084fc)', mer:'linear-gradient(160deg, #06142a, #1a4a7a 60%, #5ff5e6)', foret:'linear-gradient(160deg, #06160c, #1f5a2a 60%, #8df0a0)', brume:'linear-gradient(160deg, #1a1f1a, #4a5a4a 60%, #c9d4c9)', or:'linear-gradient(160deg, #3a2a0a, #b7832a 60%, #ffe9a8)', pierre:'linear-gradient(160deg, #1a1a22, #4a4a5a 60%, #a8a8b8)' };
// Montre une suite de pages. page = { sur, titre, illu:{ cle, fond, sym }, texte:[...], cit, choix:[{ t, d, ok?, f }], bouton }
// apres(resultat) est appelé à la fin ; un choix appelle son f() puis passe à la page suivante.
let chronPages = [], chronI = 0, chronApres = null;
function chronique(pages, apres) { chronPages = pages.filter(Boolean); chronI = 0; chronApres = apres; if (!chronPages.length) { if (apres) apres(); return; } chronMontre(); }
function chronMontre() {
  const p = chronPages[chronI]; let z = document.getElementById('chron'); if (!z) { z = document.createElement('div'); z.id = 'chron'; z.className = 'chron'; document.body.appendChild(z); }
  const il = p.illu || {}; const img = il.cle ? `decor/chron-${il.cle}.webp` : null;
  z.innerHTML = `<div class="page" id="chronPage"><div class="coin a"></div><div class="coin b"></div><div class="coin c"></div><div class="coin d"></div>
    ${p.sur ? `<div class="sur">${p.sur}</div>` : ''}<h1>${p.titre}</h1><div class="orn">✦ ◆ ✦</div>
    <div class="illu" style="background:${img ? `url('${img}?v=1') center/cover, ` : ''}${ILLU_FOND[il.fond] || ILLU_FOND.cendre}">${img ? '' : (il.sym || '')}</div>
    ${(p.texte || []).map(t => `<p>${t}</p>`).join('')}${p.cit ? `<p class="cit">${p.cit}</p>` : ''}
    ${p.choix ? `<div class="choix">${p.choix.map((c, i) => `<button ${c.ok === false ? 'disabled' : ''} onclick="chronChoix(${i})">${c.t}<small>${c.d || ''}</small></button>`).join('')}</div>` : `<button class="suite" onclick="chronSuite()">${p.bouton || (chronI < chronPages.length - 1 ? 'Tourner la page ›' : 'Refermer le livre')}</button>`}
    <div class="num">— ${chronI + 1} / ${chronPages.length} —</div></div>`;
  if (img) { const t = new Image(); t.onerror = () => { const d = z.querySelector('.illu'); if (d) { d.style.background = ILLU_FOND[il.fond] || ILLU_FOND.cendre; d.textContent = il.sym || ''; } }; t.src = img + '?v=1'; }
}
function chronChoix(i) { const p = chronPages[chronI], c = p.choix[i]; if (!c || c.ok === false) return; const r = c.f ? c.f() : null; if (r && r.texte) { chronPages.splice(chronI + 1, 0, { sur:p.sur, titre:r.titre || p.titre, illu:p.illu, texte:[r.texte], bouton:r.bouton }); } chronSuite(); }
function chronSuite() {
  const pg = document.getElementById('chronPage'); chronI++;
  if (chronI < chronPages.length) { if (pg) { pg.classList.add('part'); setTimeout(chronMontre, 380); } else chronMontre(); return; }
  const z = document.getElementById('chron'); if (pg) pg.classList.add('part'); setTimeout(() => { if (z) z.remove(); if (chronApres) { const a = chronApres; chronApres = null; a(); } }, 380);
}

// ----------------------------------------------------------------------------------------------- les textes de l'Odyssée (les Terres brûlées)
const CHRON_ODY = {
  arrivee: h => ({ sur:'L’Odyssée · Acte I', titre:'Les Terres brûlées', illu:{ cle:'terres-brulees', fond:'feu', sym:'🌋' }, texte:[
    `Le navire de la Guilde dépose ${h} sur une grève de cendre tiède, puis repart sans attendre : aucun équipage ne reste ancré ici après la tombée du jour.`,
    'Au-dessus de l’île, le ciel est un orage immobile, couleur de braise. Au loin, le cratère gronde comme une forge qu’on aurait laissée allumée depuis mille ans. Les anciens de la Guilde disent qu’un Titan de feu garde le seuil, et que nul n’en revient sans brûlure.',
    'Vingt jours de vivres, une potion, un deck de cartes : c’est tout ce que la Guilde a pu donner. L’île, elle, ne donne rien. Elle se fouille.' ],
    cit:'« On n’entre pas dans les Terres brûlées pour gagner. On y entre pour voir ce qu’il reste de nous à la fin. »' }),
  elite: ({ sur:'Chronique de l’île', titre:'Une ombre dans la cendre', illu:{ cle:'ombre-cendre', fond:'cendre', sym:'💀' }, texte:[
    'Quelque chose vous observe depuis les rochers. Ce n’est pas une bête de l’île : ça se tient droit, ça attend, ça a choisi son terrain.',
    'Les élites des Terres brûlées portent chacune un fragment de la rune du seuil. Il en faut deux pour ouvrir la porte du Titan. Il y en a trois sur l’île : à vous de choisir vos combats.' ],
    cit:'« Les forts ne cherchent pas la bagarre. Ils gardent quelque chose. »' }),
  porte: ({ sur:'Chronique de l’île', titre:'La porte du seuil', illu:{ cle:'porte-seuil', fond:'or', sym:'🚪' }, texte:[
    'Deux fragments de rune, deux serrures. Quand ils se touchent, la pierre chante une note grave et la porte s’entrouvre sur une chaleur de fournaise.',
    'Vous bivouaquez une dernière fois devant le seuil. Le feu du camp paraît dérisoire à côté de celui qui gronde derrière la porte. Il ne se combat qu’une fois.' ],
    cit:'« Soigne-toi, mange, dors. Demain, le Titan. »' }),
  boss: h => ({ sur:'L’Odyssée · Acte I', titre:'Le Titan de feu', illu:{ cle:'titan-feu', fond:'feu', sym:'🔥' }, texte:[
    'Le gardien du seuil n’est pas fait de pierre froide, mais de roche en fusion et de magma qui hurle. Il émerge d’un monde en ruine, lentement, comme s’il avait tout le temps du monde.',
    `Ses coups posent des braises sur ${h}. À trois braises, elles explosent. Il change de visage à mesure qu’il perd son sang de lave : plus il faiblit, plus il frappe fort.` ],
    cit:'« Nul ne franchit le seuil sans brûler. »' }),
  victoire: h => ({ sur:'L’Odyssée · Acte I', titre:'L’île libre', illu:{ cle:'ile-libre', fond:'or', sym:'🏆' }, texte:[
    `Le Titan s’effondre dans son cratère et, pour la première fois depuis mille ans, le ciel des Terres brûlées se déchire. Un rayon de soleil tombe sur la cendre. ${h} reste debout.`,
    'Les cartes rencontrées sur l’île rejoignent la collection de la Guilde. Et quelque part, au-delà de l’horizon, une autre île attend : on dit qu’elle est de givre.' ],
    cit:'« Ce qui est forgé ne casse pas. »' }),
  defaite: h => ({ sur:'L’Odyssée · Acte I', titre:'Les cendres', illu:{ cle:'cendres', fond:'cendre', sym:'🕯' }, texte:[
    `${h} tombe dans la cendre tiède. L’île referme son brouillard, les braises s’éteignent une à une.`,
    'Mais la Guilde n’oublie personne : les cartes rencontrées restent dans la collection, et le navire repassera. Il repasse toujours.' ],
    cit:'« Ils reviennent toujours. »' }),
};
// ----------------------------------------------------------------------------------------------- les textes des Expéditions (le navire volant)
// choix : f() modifie l'expédition et peut renvoyer { texte } (page de suite). Effets possibles : E.or, soin, ennemis plus faibles / plus forts (E.bonus).
const CHRON_EXP = {
  crique: ({ sur:'Expédition · Escale 1', titre:'La Crique des gobelins', illu:{ cle:'crique', fond:'mer', sym:'🏴‍☠️' }, texte:[
    'Le navire volant descend entre deux falaises noires et se pose sur une eau d’huile. Des feux brillent sur la plage : des gobelins des cendres, qui pillent les épaves et chantent faux.',
    'Ils n’ont pas vu le navire. Pas encore.' ], choix:[
    { t:'Débarquer en force, torches allumées', d:'Combat normal. Les gobelins paniquent : +20 or sur le butin.', f:() => { E.bonus = { or:20 }; } },
    { t:'Se faufiler par les rochers à la nuit', d:'Les gobelins arrivent à moitié endormis : ils ont 3 PV de moins. Mais on laisse une partie du butin.', f:() => { E.bonus = { ennemisPV:-3, or:-15 }; } },
    { t:'Leur proposer un marché (20 or)', d:'Ils ouvrent la crique sans combat ? Non : ils prennent l’or ET attaquent. Mais l’un d’eux change de camp.', f:() => { E.or = Math.max(0, E.or - 20); E.bonus = { recrue:'milicien' }; return { texte:'Le plus petit des gobelins empoche la bourse, regarde ses frères, et vient se cacher derrière le capitaine. « Moi, je suis avec vous, maintenant. » Une recrue, et un combat quand même.' }; } } ] }),
  falaises: ({ sur:'Expédition · Escale 2', titre:'Les Falaises hurlantes', illu:{ cle:'falaises', fond:'pierre', sym:'🌬' }, texte:[
    'Le vent entre dans les grottes des falaises et en ressort en hurlant. Les loups de braise chassent ici, avec les salamandres qui lèchent la roche chaude.',
    'Le navire tangue. Il faudra accoster vite.' ], choix:[
    { t:'Accoster sur la corniche haute', d:'On domine le combat : vos unités frappent les premières ce round-ci (toutes ont Charge).', f:() => { E.bonus = { charge:true }; } },
    { t:'Accoster en bas, près de l’eau', d:'Plus sûr pour le navire : l’équipage est soigné de 5 avant le combat.', f:() => { E.equipage.forEach(u => { u.v = Math.min(u.vmax, u.v + 5); }); } },
    { t:'Fouiller les grottes d’abord', d:'Un vieux coffre : +40 or. Mais les loups ont le temps d’appeler la meute (+1 louveteau).', f:() => { E.or += 40; E.bonus = { renfortEnnemi:{ n:'Louveteau', a:2, v:3 } }; } } ] }),
  port: ({ sur:'Expédition · Escale 3', titre:'Le Port de Marennes', illu:{ cle:'port', fond:'or', sym:'⚓' }, texte:[
    'Un port tranquille, des lanternes sur l’eau, l’odeur du pain. Le seul endroit de la route où personne ne veut vous tuer.',
    'Les gens de Marennes connaissent la Guilde : on vous soigne, on vous nourrit, on vous raconte que le cratère n’a jamais été aussi rouge.' ], choix:[
    { t:'Se reposer à l’auberge', d:'Tout l’équipage est soigné, +30 or de la Guilde.', f:() => { E.equipage.forEach(u => { u.v = u.vmax; }); E.or += 30; } },
    { t:'Faire affûter les armes chez le forgeron', d:'Tout l’équipage est soigné, et le capitaine gagne +1 attaque.', f:() => { E.equipage.forEach(u => { u.v = u.vmax; }); const c = E.equipage.find(u => u.heros); if (c) c.a++; } },
    { t:'Écouter les marins à la taverne', d:'Tout l’équipage est soigné, et vous apprenez le point faible du Titan (−5 PV au boss).', f:() => { E.equipage.forEach(u => { u.v = u.vmax; }); E.titanFaible = true; } } ] }),
  foret: ({ sur:'Expédition · Escale 4', titre:'La Forêt-racine', illu:{ cle:'foret', fond:'foret', sym:'🌲' }, texte:[
    'Des arbres si vieux que leurs racines sortent du sol comme des bras. Des cultistes du feu y ont dressé un autel, et un golem de scories monte la garde, immobile depuis des années.',
    'Il se réveille quand le navire passe au-dessus.' ], choix:[
    { t:'Brûler l’autel avant qu’ils réagissent', d:'Les cultistes perdent leur Flammèche de départ. Le golem, lui, est furieux (+2 attaque).', f:() => { E.bonus = { sansRenforts:true, ennemisA:2 }; } },
    { t:'Attendre la nuit dans les branches', d:'L’équipage se repose (+6 PV chacun). Le combat sera normal.', f:() => { E.equipage.forEach(u => { u.v = Math.min(u.vmax, u.v + 6); }); } },
    { t:'Négocier avec les racines (Pip saurait)', d:'Une racine se laisse convaincre : elle rejoint l’équipage comme Barrière 1 / 5.', f:() => { E.bonus = { recrueUnite:{ n:'Racine amie', a:1, v:5, barriere:true } }; } } ] }),
  cratere: ({ sur:'Expédition · Escale 5', titre:'Le Cratère', illu:{ cle:'cratere', fond:'feu', sym:'🌋' }, texte:[
    'La coque du navire fume. En bas, la lave coule en rivières lentes, et quelque chose nage dedans : un élémentaire, suivi d’un drake de cendre qui tourne au-dessus.',
    'C’est la dernière escale avant le nid. Tout ce qu’on perd ici ne se remplace plus.' ], choix:[
    { t:'Attaquer le drake en vol, depuis le navire', d:'Il arrive au combat blessé (−6 PV). L’élémentaire, lui, a eu le temps de grandir (+4 PV).', f:() => { E.bonus = { drakePV:-6, elementairePV:4 }; } },
    { t:'Se poser et attendre qu’ils viennent', d:'Combat normal, mais l’équipage est prêt : +2 PV à chacun.', f:() => { E.equipage.forEach(u => { u.v = Math.min(u.vmax, u.v + 2); }); } } ] }),
  nid: ({ sur:'Expédition · Escale 6', titre:'Le Nid du Titan', illu:{ cle:'titan-feu', fond:'feu', sym:'👑' }, texte:[
    'Au fond du cratère, un nid de roche fondue. Le Titan de feu dort là, et le navire volant n’a plus de ciel où fuir.',
    'Tout l’équipage se tait. Même Corbin.' ], choix:[
    { t:'Sonner la charge', d:'Toutes vos unités frappent les premières au premier round.', f:() => { E.bonus = { ...(E.bonus || {}), charge:true }; } },
    { t:'Former le mur de boucliers', d:'Vos unités Barrière gagnent +3 PV. Les autres attendent derrière.', f:() => { E.equipage.forEach(u => { if (u.barriere) { u.v += 3; u.vmax += 3; } }); } } ] }),
};
// ----------------------------------------------------------------------------------------------- le Campement
const CHRON_CAMP = {
  intro: (a, b) => ({ sur:'Le Campement', titre:'Le feu dans la brume', illu:{ cle:'campement', fond:'brume', sym:'🔥' }, texte:[
    `${a} et ${b} ont allumé un feu de camp au bord de la Forêt-racine. La brume monte, épaisse, et les arbres craquent comme s’ils marchaient.`,
    'Ils marchent. Le Colosse des racines, le Primordial, vient de se réveiller : un géant d’écorce dont les racines repoussent sans cesse, et qui se retourne toujours contre le dernier qui l’a frappé.',
    'Deux héros, un feu, une réserve de Cohésion. Se serrer les coudes, ou tomber ensemble.' ],
    cit:'« Vous avez réveillé la forêt. »' }),
  victoire: ({ sur:'Le Campement', titre:'Le géant abattu', illu:{ cle:'colosse-abattu', fond:'foret', sym:'🏆' }, texte:[ 'Le Colosse s’écroule dans un fracas de branches. Autour du feu, la brume se dissipe. On ne parle pas tout de suite : on respire.', 'La Guilde se souviendra de cette nuit.' ] }),
  defaite: ({ sur:'Le Campement', titre:'Le feu s’éteint', illu:{ cle:'feu-eteint', fond:'brume', sym:'🕯' }, texte:[ 'Les racines recouvrent le camp. Le feu s’éteint sous la brume. Mais la forêt n’a pas tout pris : demain, d’autres héros allumeront un feu au même endroit.' ] }),
};
