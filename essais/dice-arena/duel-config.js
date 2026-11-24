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
  return { jeu:'duel', racine:'cfg-duel', titre:'⚔ Le Duel', retour:'menu.html', retourFixe:window.DUEL_RETOUR || null, regles:'voileDuel(false);regles()',
    heros:() => ORDRE.map(id => id === 'zephine' && !z ? `<button disabled><img src="${IMG(id)}" alt="" style="filter:grayscale(1)">🔒 ${HEROS[id].nom}<small>Fais le tutoriel</small></button>`
      : `<button class="${choixDuel === id ? 'on' : ''}" onclick="choisitDuel('${id}')"><img src="${IMG(id)}" alt="">${HEROS[id].nom}</button>`).join(''),
    fiche:() => { const H = HEROS[choixDuel] || HEROS.maelle; return `⚔ <b>${H.nom}</b><br>${H.role || ""}<br>❤ ${H.pv} PV au départ du Duel.`; },
    modes:[
      { k:'ordi', e:'🗿', n:'Contre l’ordinateur', img:'menu-recu/arene-ordinateur.webp', desc:() => 'Choisis ton héros et ton deck, et affronte l’automate de la Guilde.' },
      { k:'semaine', e:'🔏', n:'Duel de la semaine', img:'menu-recu/mode-semaine.webp', desc:() => sem ? `Cette semaine : <b>${sem.n}</b>. ${sem.d} La règle vaut pour toi ET pour l’ordinateur, jusqu’à dimanche soir.` : 'Une règle nouvelle chaque semaine.',
        pas:() => [sem && sceaux[sem.semaine] ? '✅ Sceau de la semaine gagné' : '🔏 Gagne un duel pour le Sceau de la semaine'] },
      { k:'eclair', e:'⚡', n:'Duel éclair du jour', img:'menu-recu/arene-ordinateur.webp', sansHeros:true, desc:() => { const d = eclairDuJour(); return `≈ 3 minutes : <b>${HEROS[d.h].nom}</b> contre <b>${HEROS[d.o].nom}</b>, les deux à moitié de leurs PV. Le même pour tout le monde aujourd’hui. Ton premier essai compte (étoiles, XP, or) ; ensuite, rejoue pour le plaisir.`; },
        pas:() => { const f = eclairFait(); return f ? [`Aujourd’hui : ${f.gagne ? '★'.repeat(f.etoiles) + '☆'.repeat(3 - f.etoiles) : 'perdu'}`, 'Rejouable pour le plaisir'] : ['Pas encore tenté aujourd’hui']; } },
      { k:'enigme', e:'🧩', n:'Énigme du jour', img:'menu-recu/mode-enigme.webp', sansHeros:true, desc:() => 'Trouve le coup parfait qui fait tomber l’adversaire en un seul tour. Une nouvelle chaque jour, la même pour tous.' },
      { k:'tuto', e:'🐱', n:'Le tutoriel', img:'menu-recu/arene-tuto.webp', sansHeros:true, desc:() => z ? 'Le premier duel guidé par Moustache, à refaire quand tu veux.' : 'Un premier duel guidé par Moustache (5 minutes). À la clé : Zéphine et le cadre « Diplômé de la Guilde ».' } ],
    options:m => m === 'eclair' ? [{ k:'i', titre:'⚡ Héros et adversaire du jour', verrou:'les mêmes pour tous', aide:'★ : gagner · ★★ : finir avec 40 % de tes PV ou plus · ★★★ : 70 % ou plus.' }]
      : m === 'enigme' ? [{ k:'i', titre:'🧩 L’énigme du jour', verrou:'la même pour tous', aide:'Le héros, les cartes et l’adversaire sont imposés : à toi de trouver le bon ordre.' }]
      : m === 'tuto' ? [{ k:'i', titre:'🐱 Avec Gorm et Moustache', verrou:'guidé', aide:'Moustache te montre chaque geste, un tour après l’autre.' }]
      : (m === 'semaine' && sem ? [{ k:'r', titre:`🔏 La règle : ${sem.n}`, verrou:'cette semaine', aide:sem.d }] : []).concat(optionsDuel()),
    resume:(m, v) => m === 'enigme' ? '🧩 L’énigme du jour' : m === 'tuto' ? '🐱 Le tutoriel' : `${m === 'semaine' ? '🔏 Duel de la semaine' : '🗿 Contre l’ordinateur'} · <b>${HEROS[choixDuel].nom}</b> contre ${v.adv === 'hasard' ? 'un adversaire au hasard' : v.adv === 'roi' ? 'le Roi sans visage' : HEROS[v.adv].nom}`,
    lancer:(m, v) => {
      voileDuel(false);
      if (m === 'enigme') return partieEnigme('1');
      if (m === 'tuto') return partieTuto();
      window.REGLE_FORCEE = null;
      if (m === 'eclair') { const d = eclairDuJour(); window.REGLE_FORCEE = 'sem-eclair'; if (typeof window.semaineActive === 'function') window.semaineActive(true);
        monHeros = d.h; fermer(); nouvellePartie(d.h, d.o); S.eclairJour = eclairFait() ? 'plaisir' : 'compte'; regles(true); return; }
      if (!okDuel(choixDuel)) { voileDuel(true); alert('Choisis ton héros.'); return CFG.ouvre(defDuel(), { etape:2 }); }
      // 23/11 (l'utilisateur : « j'ai gagné le Duel de la semaine et je n'ai rien eu ») : SEMAINE_ACTIVE est enfermée dans semaine.js, invisible d'ici ;
      // depuis le configurateur (22/11), la règle de la semaine ne s'allumait donc JAMAIS. On passe par la porte prévue.
      if (typeof window.semaineActive === 'function') window.semaineActive(m === 'semaine');
      monHeros = choixDuel;
      if (v.deck !== undefined && typeof lireDecks === 'function') { const D = lireDecks(monHeros); D.actif = v.deck; ecrisDecks(monHeros, D); }
      fermer(); nouvellePartie(monHeros, v.adv === 'hasard' ? undefined : v.adv); regles(true);
    } };
}
// 23/11 (10e rendez-vous rapide, choisi par l'utilisateur) : LE DUEL ÉCLAIR DU JOUR : héros et adversaire tirés pour la journée (les mêmes pour tous),
// règle « Duel éclair » (moitié des PV, réglée au simulateur pour le Duel de la semaine) ; 1er essai compté comme les flashs
function eclairJour() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function eclairDuJour() { const L = ORDRE.filter(x => x !== 'zephine'), j = eclairJour(); let h = 2166136261; for (const c of j + 'eclair') { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0;
  const a = h % L.length, b = (a + 1 + (Math.floor(h / 7) % (L.length - 1))) % L.length; return { h:L[a], o:L[b] }; }
function eclairFait() { try { return (JSON.parse(localStorage.getItem('guilde-eclair') || '{}'))[eclairJour()] || null; } catch (e) { return null; } }
{ const _finE = montrerFin;
  montrerFin = function () {
    _finE();
    if (!S || !S.eclairJour || S.eclairVu) return; S.eclairVu = true;
    const gagne = S.fini === 'gagne', r = S.J.pv / (S.J.pvMax || 1), et = gagne ? (r >= .7 ? 3 : r >= .4 ? 2 : 1) : 0;
    let txt;
    if (S.eclairJour === 'compte' && !eclairFait()) {
      const xp = 10 + 5 * et, or = 5 * et; // 24/11 : à récupérer dans le carnet
      const m = (() => { try { return JSON.parse(localStorage.getItem('guilde-eclair') || '{}'); } catch (e) { return {}; } })(); m[eclairJour()] = { gagne, etoiles:et, heros:S.J.id, rec:{ xp, or }, recup:false };
      Object.keys(m).sort().slice(0, -30).forEach(k => delete m[k]); try { localStorage.setItem('guilde-eclair', JSON.stringify(m)); } catch (e) {}
      if (typeof guildeEvt === 'function') try { guildeEvt('flash', 1); } catch (e) {}
      txt = `⚡ <b>Duel éclair du jour compté</b> : ${gagne ? '★'.repeat(et) + '☆'.repeat(3 - et) : 'perdu'} · +${xp} XP${or ? ` · 🪙 +${or}` : ''} <b>à récupérer</b> dans 📜 le carnet. Reviens demain pour le prochain !`;
    } else txt = '⚡ Essai pour le plaisir : ton duel éclair du jour était déjà compté.';
    const f = document.querySelector('#fen .fenetre > div'); if (f) f.insertAdjacentHTML('afterbegin', `<p style="text-align:center;background:#2a2150;border:1px solid #f3c96b88;border-radius:10px;padding:8px">${txt}</p>`);
  }; }
accueil = function (o) { fermer(); if (!okDuel(choixDuel)) choixDuel = 'maelle'; voileDuel(true); try { GM.retour(null); } catch (e) {} CFG.ouvre(defDuel(), o); };
window.partieSemaine = function () { accueil({ mode:'semaine' }); };
// au chargement sans paramètre particulier, l'ancien accueil vient de s'ouvrir : on le remplace par le configurateur
{ const q = new URLSearchParams(location.search); if (q.get('eclair')) setTimeout(() => accueil({ mode:'eclair' }), 0);
  // 23/11 (l'utilisateur : « Jouer avec Pip » depuis Mes decks : directement le choix de l'adversaire ; fermer ramène à Mes decks) :
  // duel.html?h=<héros>&retour=decks ouvre le configurateur à l'étape des options, mode « contre l'ordinateur », héros présélectionné
  if (q.get('h') && typeof HEROS !== 'undefined' && HEROS[q.get('h')]) { const h = q.get('h'); if (q.get('retour') === 'decks') window.DUEL_RETOUR = { href:`mes-decks.html?heros=${h}`, n:'Mes decks' };
    setTimeout(() => { if (okDuel(h)) choixDuel = h; accueil({ mode:'ordi', etape:3 }); }, 0); } if (!['tuto', 'enigme', 'semaine', 'eclair', 'deux', 'ami', 'salle', 'odyssee', 'campement', 'parties', 'h'].some(k => q.get(k))) accueil(); }
