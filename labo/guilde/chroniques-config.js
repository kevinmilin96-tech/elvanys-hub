// 23/11 (l'utilisateur : « on attaque le gros chantier Chroniques ») : l'accueil des Chroniques passe au CONFIGURATEUR commun (configurateur.js).
// Choix de l'utilisateur (boîtes du 23/11) : 4 modes séparés (une partie sur ce téléphone · la campagne · les aventures en scènes · chacun chez soi),
// de 1 à 4 héros cochés à l'étape 2 (retenus sur le téléphone), puis les options ; en ligne : les héros d'abord, puis « Créer une salle » ou
// « Rejoindre avec un code » (les héros cochés entrent dans la salle avec toi) ; l'initiative ne se choisit qu'en ligne.
// Ce fichier est chargé AVANT le grand script de chroniques.html : il ne lit les variables de la page (choisis, S, H…) qu'au moment des appels.
const CLE_EQUIPE = 'guilde-chroniques-equipe';
var chPre = { camp:null, sansIni:false, apporte:false }; // ce que le configurateur prépare pour creerSalle() et rejoindre()

(function () {
  const st = document.createElement('style');
  st.textContent = `.cfg .heros button { position:relative; }
  .cfg .heros .ch-n { position:absolute; top:1cqw; left:1.4cqw; background:var(--or, #ffd98a); color:#2a1400; border-radius:50%; width:5cqw; height:5cqw; line-height:5cqw; font-size:3cqw; font-weight:bold; }
  .cfg .ch-liens { display:flex; flex-wrap:wrap; gap:1.6cqw; margin-top:2cqw; }
  .cfg .ch-liens button { background:#14223a; border:1.5px solid #7cd4ff; color:#7cd4ff; border-radius:2.5cqw; padding:1.4cqw 2.4cqw; font-size:3cqw; cursor:pointer; }
  .cfg .modes .mode b { font-size:2.7cqw; }
  body:has(#cfg-bas) .voile-f { z-index:70; }`;
  document.head.appendChild(st);
  // la barre du bas du configurateur disparaît dès que la page montre autre chose (salle d'attente, partie, écran de la table, invitation d'un ami…)
  const veille = () => { const a = document.getElementById('app'); if (!a) return;
    new MutationObserver(() => { if (!a.querySelector('.cfg')) { const b = document.getElementById('cfg-bas'); if (b) b.remove(); } }).observe(a, { childList:true }); };
  if (document.getElementById('app')) veille(); else document.addEventListener('DOMContentLoaded', veille);
})();

const chEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const chEquipeTxt = () => choisis.map(nomChoix).join(', ');
function chBascule(k) {
  if (choisis.includes(k)) choisis = choisis.filter(x => x !== k);
  else if (choisis.length < 4) choisis.push(k);
  else { bulle('4 héros au plus', true); return; }
  try { localStorage.setItem(CLE_EQUIPE, JSON.stringify(choisis)); } catch (e) {}
  son('choisir'); CFG.def = defChron(); CFG.dessine();
}
// la partie gardée sur le téléphone, rangée dans son mode
const chGardee = () => { const g = gardee(); return !g ? null : { g, mode:g.aventure ? 'aventures' : g.campagne != null ? 'campagne' : 'partie' }; };

function defChron() {
  if (!defChron.lu) { defChron.lu = true; // l'équipe retenue la dernière fois
    try { const e = JSON.parse(localStorage.getItem(CLE_EQUIPE) || 'null'); if (Array.isArray(e)) choisis = e.filter(k => k.startsWith('av:') ? avTrouve(k.slice(3)) : H[k]).slice(0, 4); } catch (e) {} }
  choisis = choisis.filter(k => k !== 'zephine' || ZEPH_OK());
  let D = {}; try { D = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) {}
  const ADV = typeof AVENTURES !== 'undefined' ? AVENTURES : {};
  const scenChoix = () => Object.entries(SCX_TXT).map(([k, s]) => ({ v:k, n:s.titre, d:`<i>${s.duree}</i>${k === 'horloger' && D.horloger ? ` · ✓ réussi ${D.horloger} fois` : ''}<br>${s.but}` }));
  return { jeu:'chroniques', titre:'📜 Les Chroniques', retour:'menu.html', regles:'regles()', racine:'app',
    heros:() => {
      const b = (k, img, sec, nom, sous, dis, coul) => `<button class="${choisis.includes(k) ? 'on' : ''}" ${dis ? 'disabled' : ''} onclick="chBascule('${k}')">${choisis.includes(k) ? `<span class="ch-n">${choisis.indexOf(k) + 1}</span>` : ''}<img src="${img}" onerror="this.onerror=null;this.src='${sec}'" alt=""${coul ? ` style="box-shadow:0 0 0 3px ${coul}"` : ''}>${nom}<small>${sous}</small></button>`;
      return avLire().map(a => b('av:' + a.id, avPortrait(a), avPortraitSecours(a), chEsc(a.nom), `${chEsc(avTitre(a))} · niv. ${avStats(a).niveau}`, false, a.couleur)).join('')
        + Object.entries(H).map(([k, h]) => { const z = k === 'zephine' && !ZEPH_OK(); return b(k, `portraits/${k}.webp`, `portraits/${k}.webp`, h.n, z ? '🔒 tutoriel' : h.t, z); }).join('')
        + `<button onclick="location.href='aventuriers.html?retour=chroniques.html'"><b style="font-size:8cqw;display:block;line-height:1.3">＋</b>Nouveau<small>un héros d’aventure, dans la Forge</small></button>`;
    },
    fiche:() => `👥 <b>${choisis.length}/4 héros</b>${choisis.length ? ` : ${chEsc(chEquipeTxt())}` : ''}.<br>`
      + (CFG.mode === 'ligne' ? 'Ce sont les héros que <b>tu</b> amènes dans la salle ; tes amis ajoutent les leurs (4 en tout). Tu peux aussi n’en amener aucun et choisir dans la salle.'
        : 'Touche un héros pour le prendre ou le laisser. Un par joueur ; seul, tu peux en jouer plusieurs. Les monstres grandissent avec chaque héros en plus.'),
    herosOk:() => choisis.length || CFG.mode === 'ligne' ? '' : 'Choisis au moins un héros',
    modes:[
      { k:'partie', e:'⚔', n:'Une partie', img:'menu-recu/mode-chroniques.webp',
        desc:() => 'Un donjon dans le noir, un scénario, de 1 à 4 héros sur ce téléphone : passez-le à celui qui joue. Ouvrez les portes, fouillez les meubles, réveillez le boss.'
          + (localStorage.getItem('guilde-atelier') === '1' ? `<span class="ch-liens"><button onclick="location.href='editeur.html'">🛠 L’atelier des cartes</button></span>` : ''),
        pas:() => [`${Object.keys(SCX_TXT).length} scénarios`, D.horloger ? `⏳ Horloger réveillé ${D.horloger} fois` : '⏳ Horloger pas encore réveillé'],
        partie:() => { const x = chGardee(); if (!x || x.mode !== 'partie') return null; const g = x.g;
          return { texte:`${chEsc((SCX_TXT[g.scen] || {}).titre || 'Chroniques')} · ${g.heros.map(z => chEsc(nomH(z))).join(', ')} · ⌛ ${g.sablier}`, reprendre:'reprend()', abandonner:'localStorage.removeItem(CLE_PARTIE)' }; } },
      { k:'campagne', e:'📜', n:'La campagne', img:'decor/chron-horloger-debut.webp',
        desc:() => `Les 3 scénarios à la suite, avec la même équipe : ${CHAPITRES.map(c => c.titre.replace(/^Chapitre [IV]+ · /, '')).join(' → ')}. Les objets du sac se gardent, et chaque chapitre gagné rend tes héros plus solides.`,
        pas:() => ['3 chapitres', D.campagnes ? `🏆 Finie ${D.campagnes} fois` : 'Pas encore finie'],
        partie:() => { const c = lireCamp(); if (!c) return null; const x = chGardee(), dedans = x && x.mode === 'campagne';
          return { texte:`${chEsc(CHAPITRES[c.chap].titre)}${c.equipe.length ? ' · ' + chEsc(c.equipe.map(nomChoix).join(', ')) : ' (en ligne)'}`,
            reprendre:dedans ? 'reprend()' : c.equipe.length ? 'chapitre()' : "bulle('Cette campagne se joue en ligne : crée une salle dans « Chacun chez soi », elle y reprend.', true);accueil()",
            abandonner:`ecrireCamp(null)${dedans ? ';localStorage.removeItem(CLE_PARTIE)' : ''}` }; } },
      { k:'aventures', e:'📖', n:'Les aventures', img:'decor/scene-taverne.webp',
        desc:() => 'Une vraie histoire en scènes : la taverne, le récit, la carte du monde et ses embuscades, puis le donjon. Moustache raconte, vous choisissez.',
        pas:() => [`${Object.keys(ADV).length} aventure${Object.keys(ADV).length > 1 ? 's' : ''}`].concat(Object.entries(ADV).filter(([k]) => (D.aventures || {})[k]).map(([k, a]) => `✓ ${a.titre.replace(/^\S+ /, '')}`)),
        partie:() => { const av = typeof lireAV === 'function' ? lireAV() : null; if (!av || !ADV[av.id]) return null;
          return { texte:`${chEsc(ADV[av.id].titre)} · scène ${av.scene + 1}/${ADV[av.id].scenes.length}`, reprendre:'reprendAventure()', abandonner:'AV=null;sauveAV();localStorage.removeItem(CLE_PARTIE)' }; } },
      { k:'ligne', e:'🌐', n:'Chacun chez soi', img:'menu-recu/mode-enligne.webp',
        desc:() => 'Chacun sur son téléphone, où qu’il soit : une salle d’attente avec un code de 4 lettres, chacun ajoute ses héros, l’hôte choisit le scénario et lance pour tout le monde.'
          + `<span class="ch-liens"><button onclick="amisFenetre()">👥 Mes amis</button><button onclick="typeof ecranForm==='function'&&ecranForm()">📺 Montrer la partie sur une télé</button></span>`,
        pas:() => ['2 à 4 joueurs', 'avec ou sans initiative'],
        parties:() => {
          const l = [], s = salleGardee();
          if (s) l.push({ texte:`↩ Revenir dans la salle ${chEsc(s.code)}`, reprendre:'const s=salleGardee();if(s)rejoindre(s.code,s.moi)', abandonner:'localStorage.removeItem(SALLE)' });
          sauvesEnLigne().forEach(x => l.push({ texte:`💾 ${chEsc(x.titre)} · ${chEsc(x.heros)}`, reprendre:`rouvrirEnLigne('${x.id}')`, abandonner:`localStorage.setItem(CLE_ENLIGNE, JSON.stringify(sauvesEnLigne().filter(y => y.id !== '${x.id}')))` }));
          return l; } } ],
    options:m => {
      if (m === 'partie') return [{ k:'scen', titre:'📖 Le scénario', choix:scenChoix(), def:scenChoisi }];
      if (m === 'campagne') { const c = lireCamp(); return [{ k:'i', titre:'📜 Trois chapitres', aide:CHAPITRES.map(x => x.titre).join('<br>') + '<br><br>+2 PV max à chaque héros par chapitre gagné.' + (c ? '<br><b style="color:#ffb3a8">Ta campagne en cours sera remplacée par une nouvelle.</b>' : '') }]; }
      if (m === 'aventures') return [{ k:'av', titre:'📖 L’aventure', choix:Object.entries(ADV).filter(([k, a]) => typeof avOuverte !== 'function' || avOuverte(a)).map(([k, a]) => ({ v:k, n:a.titre, d:`${a.saison ? '❄ <b>Saison 1 de l’Almanach</b> · ' : ''}${a.resume}<br><i>${a.duree}</i>${(D.aventures || {})[k] ? ` · ✓ finie ${D.aventures[k]} fois` : ''}` })) }];
      const action = (CFG.opts.ligne || {}).action || 'creer', c = lireCamp();
      return [{ k:'action', titre:'🌐 Que veux-tu faire ?', choix:[
          { v:'creer', n:'👑 Créer une salle', d:'Tu es l’hôte : tu reçois un code de 4 lettres à donner à tes amis, et tu lances quand tout le monde est là.' },
          { v:'rejoindre', n:'🔑 Rejoindre avec un code', d:'Un ami t’a donné le code de sa salle : tes héros y entrent avec toi.' }] }]
        .concat(action !== 'creer' ? [] : [
          { k:'scen', titre:'📖 Le scénario', aide:'Tu pourras encore le changer dans la salle d’attente.', def:scenChoisi,
            choix:scenChoix().concat([c ? { v:'camp', n:`📜 Suite de la campagne`, d:`${CHAPITRES[c.chap].titre}, avec les sacs de ta campagne.` } : { v:'camp', n:'📜 Commencer la campagne', d:'Les 3 chapitres à la suite, entre amis.' }]) },
          { k:'ini', titre:'🎯 L’ordre de jeu', aide:'Tu pourras encore le changer dans la salle d’attente.', choix:[
            { v:'avec', n:'🎯 Avec initiative', d:'Au début de chaque tour, chacun lance son dé 🎯 pour ses héros : le plus haut joue en premier. Égalité : on relance !' },
            { v:'sans', n:'🔀 Sans initiative', d:'Chacun joue quand il veut : lancer, passer la main, revenir finir.' }] }]);
    },
    resume:(m, v) => {
      const eq = choisis.length ? `<b>${chEsc(chEquipeTxt())}</b>` : 'sans héros pour l’instant';
      if (m === 'partie') return `⚔ ${SCX_TXT[v.scen].titre} · ${eq}`;
      if (m === 'campagne') return `📜 La campagne · ${eq}`;
      if (m === 'aventures') return `${ADV[v.av] ? ADV[v.av].titre : '📖'} · ${eq}`;
      if (v.action === 'rejoindre') return `🔑 Rejoindre une salle · ${eq}`;
      return `👑 Ta salle · ${v.scen === 'camp' ? '📜 la campagne' : SCX_TXT[v.scen].titre} · ${v.ini === 'sans' ? 'sans' : 'avec'} initiative · ${eq}`;
    },
    lancer:(m, v) => {
      if (m === 'partie') { scenChoisi = v.scen; try { localStorage.removeItem(CLE_PARTIE); } catch (e) {} return commence(); }
      if (m === 'campagne') { try { const x = chGardee(); if (x && x.mode === 'campagne') localStorage.removeItem(CLE_PARTIE); } catch (e) {} return lanceCampagne(); }
      if (m === 'aventures') { try { const x = chGardee(); if (x && x.mode === 'aventures') localStorage.removeItem(CLE_PARTIE); } catch (e) {} return lanceAventure(v.av); }
      if (v.action === 'rejoindre') { chPre.apporte = true; accueil(); return rejoindreForm(); } // l'accueil d'abord : si on annule, on retrouve le configurateur
      const c = lireCamp();
      if (v.scen === 'camp') { scenChoisi = c ? CHAPITRES[c.chap].scen : 'horloger'; chPre.camp = c ? c.chap : 'nouvelle'; } else { scenChoisi = v.scen; chPre.camp = null; }
      chPre.sansIni = v.ini === 'sans';
      accueil(); creerSalle();
    } };
}
