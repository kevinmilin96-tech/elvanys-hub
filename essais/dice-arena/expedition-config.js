// 22/11 (configurateur validé : « déploie-le aux autres modes ») : L'ENTRÉE DES EXPÉDITIONS = le configurateur commun (configurateur.js).
// 1. le mode (l'Expédition, le voyage du jour, le Duel d'équipages) → 2. le capitaine (retenu) → 3. les options (la mer, l'Ascension ; le niveau
// de l'ordinateur pour le Duel) → ▶ Jouer. Chargé par expedition-v4.html après expedition-v4-ecran.js ; le Duel est sur sa page
// (expedition-duel.html?go=<capitaine>&niv=<niveau>), sa partie se reprend là-bas.
const EXP_CFG_HEROS = 'guilde-config-expeditions-heros';
let choixExp = (() => { try { return localStorage.getItem(EXP_CFG_HEROS) || 'maelle'; } catch (e) { return 'maelle'; } })();
const expCfgOk = k => { const z = localStorage.getItem('guilde-tuto') === 'fait'; if (String(k).startsWith('av:')) { const i = haInfo(k); return !!i && (i.voie !== 'zephine' || z); } return !!HEROS[k] && (k !== 'zephine' || z); };
function expCfgChoisit(k) { choixExp = k; try { localStorage.setItem(EXP_CFG_HEROS, k); } catch (e) {} CFG.dessine(); }
const expCfgDuel = () => { try { const x = JSON.parse(localStorage.getItem('guilde-duel-equipages') || 'null'); return x && !x.fini ? x : null; } catch (e) { return null; } };
const expCfgNom = x => x.av && haInfo('av:' + x.av) ? haEsc(haInfo('av:' + x.av).nom) : HEROS[x.heros] ? HEROS[x.heros].nom : 'Capitaine';
function expCfgReprend() { X = lire(); if (!X) return accueil(); sel = null; reprendre(); }
var flashChoisi = false; // 23/11 : le flash du jour
const NIV_DUEL_CFG = { facile:{ n:'Facile', e:'🌱', d:'L’ordinateur a les mêmes pièces que toi.' }, normal:{ n:'Normal', e:'⚔', d:'L’ordinateur a 3 💰 de plus par manche.' }, difficile:{ n:'Difficile', e:'💀', d:'L’ordinateur a 7 💰 de plus par manche.' } };

function defExpeditions() {
  const m = lireMeta4(), x = lire(), enCours = x && !x.fini ? x : null, d = expCfgDuel();
  const j = new Date().toISOString().slice(0, 10), mj = m.jour && m.jour.j === j ? m.jour : null;
  const fj = (m.flash || {})[j];
  const partieX = jour => enCours && (jour === 'flash' ? !!enCours.flash : !enCours.flash && !!enCours.jour === jour) ? { texte:`${expCfgNom(enCours)} · escale ${(enCours.escale || 0) + 1} · ${'❤'.repeat(Math.max(0, enCours.coeurs || 0))}`, reprendre:'expCfgReprend()', abandonner:`localStorage.removeItem('${CLE}')` } : null;
  const z = localStorage.getItem('guilde-tuto') === 'fait';
  return { jeu:'expeditions', racine:'app', titre:'⛵ Les Expéditions', retour:'menu.html', regles:"location.href='expeditions-v4-proposition.html'",
    heros:() => ORDRE.map(id => id === 'zephine' && !z ? `<button disabled><img src="${IMG(id)}" alt="" style="filter:grayscale(1)">🔒 ${HEROS[id].nom}</button>`
        : `<button class="${choixExp === id ? 'on' : ''}" onclick="expCfgChoisit('${id}')"><img src="${IMG(id)}" alt="">${HEROS[id].nom}<small>${CAPITAINES[id].n}</small></button>`).join('')
      + haListe().map(a => haInfo('av:' + a.id)).filter(i => i && (i.voie !== 'zephine' || z)).map(i => `<button class="${choixExp === i.cle ? 'on' : ''}" onclick="expCfgChoisit('${i.cle}')">${haImg(i, `box-shadow:0 0 0 2px ${i.couleur}`)}${haEsc(i.nom)}<small>${CAPITAINES[i.voie].n}</small></button>`).join(''),
    fiche:() => { const v = haVoie(choixExp), i = haInfo(choixExp); return `⚓ <b>${i ? haEsc(i.nom) : HEROS[v].nom}</b>, capitaine${i ? ` · la voie de ${HEROS[v].nom}` : ''}<br><b style="color:var(--or)">${CAPITAINES[v].n}</b> : ${CAPITAINES[v].d}<br><span class="prise ${PRISE_EXP[v]}">${PRISE_TXT[PRISE_EXP[v]]}</span> · ${PRISE_DIT[PRISE_EXP[v]]}`; },
    modes:[
      { k:'voyage', e:'⛵', n:'L’Expédition', img:'menu-recu/mode-expeditions.webp', desc:() => 'Le navire volant part à l’aventure : tu recrutes ton équipage au port, tu choisis ta route sur la carte, une règle du voyage est tirée au départ et le boss final change. Gagne une mer pour ouvrir la suivante.',
        pas:() => ORDRE_MERS.map(k => `${merOuverte(m, k) ? MERS[k].e : '🔒'} ${MERS[k].n.replace(/^La /, '').replace(/^L’/, '')}${m.mers[k] ? ' 🏆' + m.mers[k] : ''}`), partie:() => partieX(false) },
      { k:'jour', e:'🗓️', n:'Voyage du jour', img:'menu-recu/mode-expeditions.webp', desc:() => 'La même carte, la même règle du voyage et le même boss pour tout le monde aujourd’hui, sur la Mer des nuages, sans Ascension. Un voyage, un score à comparer.',
        pas:() => [mj ? `Ton meilleur score du jour : ${mj.best} (${mj.essais} essai${mj.essais > 1 ? 's' : ''})` : 'Pas encore tenté aujourd’hui'], partie:() => partieX(true) },
      { k:'flash', e:'⚡', n:'Flash du jour', img:'menu-recu/mode-flash.webp?v=1', desc:() => '≈ 3 minutes : 12 💰 pour recruter, 2 cœurs, puis 3 combats à la suite (des monstres, une élite, le boss). Le même pour tout le monde aujourd’hui. Ton premier essai compte ; ensuite, rejoue pour le plaisir.',
        pas:() => fj ? [`Aujourd’hui : ${fj.gagne ? '★'.repeat(fj.etoiles) + '☆'.repeat(3 - fj.etoiles) : 'perdu'}`, 'Rejouable pour le plaisir'] : ['Pas encore tenté aujourd’hui'], partie:() => partieX('flash') },
      { k:'duel', e:'⚔', n:'Duel d’équipages', img:'menu-recu/mode-duelequip.webp', desc:() => 'Ton équipage contre celui d’un capitaine rival joué par l’ordinateur, en plusieurs manches. 5 cœurs chacun : le premier à zéro a perdu.',
        partie:() => d ? { texte:`${expCfgNom(d)} · manche ${d.duel ? d.duel.manche : 1} · ❤ ${d.coeurs} contre ${d.duel ? d.duel.coeursIA : 5}`, reprendre:"location.href='expedition-duel.html'", abandonner:"localStorage.removeItem('guilde-duel-equipages')" } : null } ],
    options:mode => {
      if (mode === 'flash') return [{ k:'f', titre:'⚡ Le flash du jour', verrou:'imposé', aide:`Mer des nuages · 12 💰 · 2 cœurs · des monstres, une élite, le boss. <br>${defisJourTexte(FLASH_DEFIS_EXP, defisJourTire('expedition', FLASH_DEFIS_EXP), null, '<br>')}${fj ? '<br>Ton essai du jour est déjà compté : celui-ci est pour le plaisir.' : ''}` }];
      if (mode === 'jour') return [{ k:'i', titre:'☁️ La Mer des nuages', verrou:'imposée aujourd’hui', aide:'La règle du voyage et le boss sont tirés par la date : les mêmes pour tous.' }];
      if (mode === 'duel') return [{ k:'niv', titre:'🤖 Le niveau de l’ordinateur', choix:Object.entries(NIV_DUEL_CFG).map(([k, n]) => ({ v:k, n:`${n.e} ${n.n}`, d:n.d })), def:localStorage.getItem('guilde-duel-eq-niveau') || 'normal' }];
      const o = CFG.opts.voyage || {}, mer = ORDRE_MERS.includes(o.mer) && merOuverte(m, o.mer) ? o.mer : (merOuverte(m, merChoisie) ? merChoisie : 'nuages'), am = ascMax4(m, mer);
      return [{ k:'mer', titre:'🌊 La mer', def:mer, choix:ORDRE_MERS.map(k => ({ v:k, n:`${MERS[k].e} ${MERS[k].n.replace('La Mer ', 'Mer ').replace('La mer ', 'Mer ')}`, dis:!merOuverte(m, k), d:merOuverte(m, k) ? MERS[k].d : `Gagne ${MERS[MERS[k].ouvre].n} pour l’ouvrir.` })) }]
        .concat(am ? [{ k:'asc', titre:'⛰ L’Ascension', choix:Array.from({ length:am + 1 }, (_, n) => ({ v:n, n:n ? String(n) : 'De base', d:n ? `Cran ${n} : ${ASC_V4.slice(1, n + 1).join(' · ')}.` : 'De base. Gagne pour ouvrir le cran suivant.' })) }] : [{ k:'a', titre:'⛰ L’Ascension', aide:'Gagne un voyage sur cette mer pour ouvrir le premier cran.' }]);
    },
    resume:(mode, v) => { const n = haInfo(choixExp) ? haEsc(haInfo(choixExp).nom) : HEROS[haVoie(choixExp)].nom;
      if (mode === 'flash') return `⚡ Flash du jour · <b>${n}</b>${fj ? ' · pour le plaisir' : ''}`;
      return mode === 'duel' ? `⚔ Duel d’équipages · <b>${n}</b> · ${NIV_DUEL_CFG[v.niv].n}` : mode === 'jour' ? `🗓️ Voyage du jour · <b>${n}</b>` : `⛵ ${MERS[v.mer].n} · <b>${n}</b>${v.asc ? ' · ⛰ ' + v.asc : ''}`; },
    lancer:(mode, v) => {
      if (!expCfgOk(choixExp)) { alert('Choisis ton capitaine.'); return CFG.va(2); }
      if (mode === 'duel') { try { localStorage.setItem('guilde-duel-eq-niveau', v.niv); localStorage.removeItem('guilde-duel-equipages'); } catch (e) {} location.href = `expedition-duel.html?go=${encodeURIComponent(choixExp)}&niv=${v.niv}`; return; }
      flashChoisi = mode === 'flash'; jourChoisi = mode === 'jour'; if (!jourChoisi && !flashChoisi) { merChoisie = v.mer; try { localStorage.setItem('guilde-exp4-mer', v.mer); } catch (e) {} ascChoisi = v.asc || 0; }
      try { localStorage.removeItem(CLE); } catch (e) {} depart(choixExp);
    } };
}
accueil = function () {
  X = null; sel = null; if (!expCfgOk(choixExp)) choixExp = 'maelle';
  const q = new URLSearchParams(location.search), mo = q.get('jour') === '1' ? 'jour' : q.get('flash') === '1' ? 'flash' : q.get('mode');
  CFG.ouvre(defExpeditions(), mo ? { mode:mo } : null);
};
accueil();
