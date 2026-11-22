// 22/11 (configurateur validé : « déploie-le aux autres modes ») : L'ENTRÉE DU DUEL = le configurateur commun (configurateur.js), sur un voile
// par-dessus le plateau : 1. le mode (contre l'ordinateur, le Duel de la semaine, l'énigme du jour, le tutoriel) → 2. le héros (retenu ;
// pas de héros d'aventure dans le Duel, décision du 15/11) → 3. les options (le deck, l'adversaire) → ▶ Jouer.
// Le duel contre un ami, contre un proche, l'Odyssée et l'Invasion gardent leur propre entrée (paramètres de l'adresse).
let choixDuel = (() => { try { return localStorage.getItem('guilde-config-duel-heros') || 'maelle'; } catch (e) { return 'maelle'; } })();
const okDuel = k => !!HEROS[k] && ORDRE.includes(k) && (k !== 'zephine' || localStorage.getItem('guilde-tuto') === 'fait');
function choisitDuel(k) { choixDuel = k; try { localStorage.setItem('guilde-config-duel-heros', k); } catch (e) {} CFG.dessine(); }
function voileDuel(ouvert) {
  let v = document.getElementById('cfg-duel');
  if (!ouvert) { if (v) v.remove(); CFG.ferme(); return; }
  if (!v) { v = document.createElement('div'); v.id = 'cfg-duel'; v.style.cssText = 'position:fixed;inset:0;z-index:55;overflow-y:auto;background:radial-gradient(circle at 50% 0,#2b1f4a,#0d0a18 70%);color:#efe6ff'; document.body.appendChild(v); }
}
// les options communes au duel contre l'ordinateur et au Duel de la semaine : le deck et l'adversaire
function optionsDuel() {
  const h = okDuel(choixDuel) ? choixDuel : 'maelle', L = [];
  if (typeof lireDecks === 'function') {
    const D = lireDecks(h), ok = D.decks.map((d, i) => deckValide(h, d.cartes) ? i : -1).filter(i => i >= 0);
    if (ok.length) L.push({ k:'deck', titre:'🂠 Ton deck', aide:'<a href="mes-decks.html?heros=' + h + '" style="color:var(--or)">Modifier mes decks ›</a>', def:ok.includes(D.actif) ? D.actif : -1,
      choix:ok.map(i => ({ v:i, n:`${D.decks[i].ic || '🂠'} ${D.decks[i].nom}`, d:`${D.decks[i].cartes.length} cartes.` })).concat([{ v:-1, n:'📜 Le deck de base', d:'Le deck de départ du héros.' }]) });
  }
  L.push({ k:'adv', titre:'🤖 Ton adversaire (l’ordinateur)', def:'hasard', choix:[{ v:'hasard', n:'🎲 Au hasard', d:'Un des autres héros, tiré au lancement.' }]
    .concat(ORDRE.filter(id => id !== h).map(id => ({ v:id, n:HEROS[id].nom })))
    .concat(typeof roiDebloque === 'function' && roiDebloque() ? [{ v:'roi', n:'👑 Le Roi sans visage', d:'Le défi du Panthéon.' }] : []) });
  return L;
}
function defDuel() {
  const z = localStorage.getItem('guilde-tuto') === 'fait';
  const sem = typeof regleActive === 'function' ? regleActive() : null, sceaux = typeof lesSceaux === 'function' ? lesSceaux() : {};
  return { jeu:'duel', racine:'cfg-duel', titre:'⚔ Le Duel', retour:'menu.html', regles:'voileDuel(false);regles()',
    heros:() => ORDRE.map(id => id === 'zephine' && !z ? `<button disabled><img src="${IMG(id)}" alt="" style="filter:grayscale(1)">🔒 ${HEROS[id].nom}<small>Fais le tutoriel</small></button>`
      : `<button class="${choixDuel === id ? 'on' : ''}" onclick="choisitDuel('${id}')"><img src="${IMG(id)}" alt="">${HEROS[id].nom}</button>`).join(''),
    fiche:() => { const H = HEROS[choixDuel] || HEROS.maelle; return `⚔ <b>${H.nom}</b><br>${H.role || ""}<br>❤ ${H.pv} PV au départ du Duel.`; },
    modes:[
      { k:'ordi', e:'🗿', n:'Contre l’ordinateur', img:'menu-recu/arene-ordinateur.webp', desc:() => 'Choisis ton héros et ton deck, et affronte l’automate de la Guilde.' },
      { k:'semaine', e:'🔏', n:'Duel de la semaine', img:'menu-recu/mode-semaine.webp', desc:() => sem ? `Cette semaine : <b>${sem.n}</b>. ${sem.d} La règle vaut pour toi ET pour l’ordinateur, jusqu’à dimanche soir.` : 'Une règle nouvelle chaque semaine.',
        pas:() => [sem && sceaux[sem.semaine] ? '✅ Sceau de la semaine gagné' : '🔏 Gagne un duel pour le Sceau de la semaine'] },
      { k:'enigme', e:'🧩', n:'Énigme du jour', img:'menu-recu/mode-enigme.webp', sansHeros:true, desc:() => 'Trouve le coup parfait qui fait tomber l’adversaire en un seul tour. Une nouvelle chaque jour, la même pour tous.' },
      { k:'tuto', e:'🐱', n:'Le tutoriel', img:'menu-recu/arene-tuto.webp', sansHeros:true, desc:() => z ? 'Le premier duel guidé par Moustache, à refaire quand tu veux.' : 'Un premier duel guidé par Moustache (5 minutes). À la clé : Zéphine et le cadre « Diplômé de la Guilde ».' } ],
    options:m => m === 'enigme' ? [{ k:'i', titre:'🧩 L’énigme du jour', verrou:'la même pour tous', aide:'Le héros, les cartes et l’adversaire sont imposés : à toi de trouver le bon ordre.' }]
      : m === 'tuto' ? [{ k:'i', titre:'🐱 Avec Gorm et Moustache', verrou:'guidé', aide:'Moustache te montre chaque geste, un tour après l’autre.' }]
      : (m === 'semaine' && sem ? [{ k:'r', titre:`🔏 La règle : ${sem.n}`, verrou:'cette semaine', aide:sem.d }] : []).concat(optionsDuel()),
    resume:(m, v) => m === 'enigme' ? '🧩 L’énigme du jour' : m === 'tuto' ? '🐱 Le tutoriel' : `${m === 'semaine' ? '🔏 Duel de la semaine' : '🗿 Contre l’ordinateur'} · <b>${HEROS[choixDuel].nom}</b> contre ${v.adv === 'hasard' ? 'un adversaire au hasard' : v.adv === 'roi' ? 'le Roi sans visage' : HEROS[v.adv].nom}`,
    lancer:(m, v) => {
      voileDuel(false);
      if (m === 'enigme') return partieEnigme('1');
      if (m === 'tuto') return partieTuto();
      if (!okDuel(choixDuel)) { voileDuel(true); alert('Choisis ton héros.'); return CFG.ouvre(defDuel(), { etape:2 }); }
      if (typeof SEMAINE_ACTIVE !== 'undefined') SEMAINE_ACTIVE = m === 'semaine';
      monHeros = choixDuel;
      if (v.deck !== undefined && typeof lireDecks === 'function') { const D = lireDecks(monHeros); D.actif = v.deck; ecrisDecks(monHeros, D); }
      fermer(); nouvellePartie(monHeros, v.adv === 'hasard' ? undefined : v.adv); regles(true);
    } };
}
accueil = function (o) { fermer(); if (!okDuel(choixDuel)) choixDuel = 'maelle'; voileDuel(true); try { GM.retour(null); } catch (e) {} CFG.ouvre(defDuel(), o); };
window.partieSemaine = function () { accueil({ mode:'semaine' }); };
// au chargement sans paramètre particulier, l'ancien accueil vient de s'ouvrir : on le remplace par le configurateur
{ const q = new URLSearchParams(location.search); if (!['tuto', 'enigme', 'semaine', 'deux', 'ami', 'salle', 'odyssee', 'campement', 'parties', 'h'].some(k => q.get(k))) accueil(); }
