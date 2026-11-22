// 22/11 (configurateur validé : « j'adore le nouveau système, déploie-le aux autres modes ») : L'ENTRÉE DE L'ODYSSÉE = le configurateur commun
// (configurateur.js). 1. le mode (l'île du jour, Saison 1, sans fin, la Route du Titan ; « ▶ En cours » et la liste des parties de ce mode)
// → 2. le héros (retenu) → 3. les options (l'île, Grande aventure ou île seule, l'Ascension, l'emplacement) → ▶ Jouer.
// Le lancement passe par l'adresse (odyssee.html?…&go=<héros>&slot=<n>…) : sansfin / route / île sont lus au chargement de la page.
const ODY_CFG_HEROS = 'guilde-config-odyssee-heros';
let choixOdy = (() => { try { return localStorage.getItem(ODY_CFG_HEROS) || 'maelle'; } catch (e) { return 'maelle'; } })();
const odyCfgSuf = m => m === 'sansfin' ? '-sansfin' : m === 'route' ? '-route' : '';
const odyCfgCle = (m, n) => 'guilde-odyssee' + odyCfgSuf(m) + (n > 1 ? '-' + n : '');
const odyCfgLit = (m, n) => { try { return JSON.parse(localStorage.getItem(odyCfgCle(m, n)) || 'null'); } catch (e) { return null; } };
// le mode d'une partie gardée (l'île du jour range ses parties avec la Saison 1)
const odyCfgModeDe = r => r.route ? 'route' : r.sansfin ? 'sansfin' : String(r.graine || '').startsWith('jour-') ? 'jour' : 'saison';
const odyCfgIleJour = () => ['brulees', 'givre', 'abime'][Math.floor(Date.now() / 864e5) % 3]; // même calcul que le menu (jour UTC)
const ODY_ILE_TXT = { brulees:'🔥 Terres brûlées', givre:'❄️ Île du Givre', abime:'🌌 Abîme du Vide' };
function odyCfgHerosOk(k) {
  if (String(k).startsWith('av:')) { const i = typeof haInfo === 'function' ? haInfo(k) : null; return !!i && (i.voie !== 'zephine' || ZOK()); }
  return !!HEROS[k] && (k !== 'zephine' || ZOK());
}
function odyCfgChoisit(k) { choixOdy = k; try { localStorage.setItem(ODY_CFG_HEROS, k); } catch (e) {} CFG.dessine(); }
function odyCfgParties(m) {
  const L = [];
  for (let n = 1; n <= ODY_SLOTS; n++) { const r = odyCfgLit(m === 'jour' ? 'saison' : m, n); if (!r || !r.ile || odyCfgModeDe(r) !== m) continue;
    const ou = r.route ? `🛤 étape ${Math.min(r.route.etape, ROUTE_ETAPES)}/${ROUTE_ETAPES}` : r.sansfin ? `🪜 étage ${r.sansfin.etage || 1}` : (ODY_ILE_TXT[r.acte] || ODY_ILE_TXT.brulees) + (r.aventure ? ' · 🗺' : '');
    L.push({ texte:`${odyNom(r)} · ${ou} · ❤ ${r.pv}/${r.pvMax} <small>(emplacement ${n})</small>`, reprendre:`odyCfgReprend('${m}', ${n})`, abandonner:`localStorage.removeItem('${odyCfgCle(m === 'jour' ? 'saison' : m, n)}')` }); }
  return L;
}
function odyCfgReprend(m, n) {
  const sm = m === 'jour' ? 'saison' : m, r = odyCfgLit(sm, n);
  try { localStorage.setItem('guilde-odyssee-emplacement' + odyCfgSuf(sm), String(n)); } catch (e) {}
  location.href = 'odyssee.html?' + (sm === 'sansfin' ? 'sansfin=1&' : sm === 'route' ? 'route=1&' : '') + (r && r.acte && r.acte !== 'brulees' && sm === 'saison' ? 'ile=' + r.acte + '&' : '') + 'reprendre=' + n;
}
// les 3 emplacements du mode, pour l'option « Emplacement » (le premier vide par défaut)
function odyCfgSlots(m) {
  const sm = m === 'jour' ? 'saison' : m;
  return Array.from({ length:ODY_SLOTS }, (_, i) => { const n = i + 1, r = odyCfgLit(sm, n);
    return { v:n, n:`${n} · ${r && r.ile ? '⚠ occupé' : 'vide'}`, d:r && r.ile ? `Remplace la partie de ${odyNom(r)} (${modeRec(r)}, ❤ ${r.pv}/${r.pvMax}). Elle sera effacée.` : 'Un emplacement libre.' }; });
}
const odyCfgSlotDef = m => { const s = odyCfgSlots(m); const v = s.find(x => x.n.endsWith('vide')); return v ? v.v : 1; };
function odyCfgAsc(acte) { const M = ascMax(acte); return M ? [{ k:'asc', titre:'⛰ L’Ascension (des crans de difficulté en plus)', choix:Array.from({ length:M + 1 }, (_, n) => ({ v:n, n:n ? String(n) : 'Normal', d:n ? ASCENSION.slice(1, n + 1).map((a, i) => `${i + 1}. ${a.n}`).join(' · ') : 'La difficulté normale.' })) }] : []; }

function defOdyssee() {
  const A = actesFaits(), ij = odyCfgIleJour();
  const mesO = (() => { try { return JSON.parse(localStorage.getItem(RECORDS_CLE) || '[]'); } catch (e) { return []; } })();
  return { jeu:'odyssee', racine:'app', titre:'⛵ L’Odyssée', retour:'menu.html', regles:"location.href='odyssee-regles.html'", plusieurs:true,
    heros:() => ORDRE.map(id => id === 'zephine' && !ZOK() ? `<button disabled><img src="${IMG(id)}" alt="" style="filter:grayscale(1)">🔒 ${HEROS[id].nom}<br><small>Fais le tutoriel</small></button>`
        : `<button class="${choixOdy === id ? 'on' : ''}" onclick="odyCfgChoisit('${id}')"><img src="${IMG(id)}" alt="">${HEROS[id].nom}</button>`).join('')
      + (typeof haListe === 'function' ? haListe().map(a => haInfo('av:' + a.id)).filter(Boolean).map(i => i.voie === 'zephine' && !ZOK() ? ''
        : `<button class="${choixOdy === i.cle ? 'on' : ''}" onclick="odyCfgChoisit('${i.cle}')">${haImg(i, `box-shadow:0 0 0 2px ${i.couleur}`)}${haEsc(i.nom)}<small class="ha-t">⚔ ${haEsc(i.titre)}</small></button>`).join('') : ''),
    fiche:() => { const h = odyHeros(choixOdy), H = HEROS[h.voie]; return `⚔ <b>${haEsc ? haEsc(h.nom) : h.nom}</b>${h.av ? ` · la voie de ${H.nom}` : ''}<br>❤ <b>${Math.round(H.pv * (ODY_PV[h.voie] || 1.8))} PV</b> en Odyssée (la vie ne remonte presque pas toute seule).<br>🂠 Il part avec son deck ⭐ (Mes decks).`; },
    modes:[
      { k:'jour', e:'🗓', n:'L’île du jour', img:'menu-recu/ody-jour.webp?v=1', desc:() => `La même île pour tout le monde aujourd’hui : une partie, une île, un score à comparer. Ouverte à tous.`,
        pas:() => [`Aujourd’hui : ${ODY_ILE_TXT[ij]}`, 'Sans Ascension'], parties:() => odyCfgParties('jour') },
      { k:'saison', e:'📖', n:'Saison 1', img:'menu-recu/mode-odyssee.webp', desc:() => 'L’Odyssée, saison 1 : une histoire en trois chapitres. Les Terres brûlées, l’île du Givre, puis l’Abîme du Vide. Gagne une île pour ouvrir la suivante.',
        pas:() => [`🔥 ${A.brulees ? '✅' : 'ouverte'}`, `❄️ ${A.brulees ? (A.givre ? '✅' : 'ouverte') : '🔒'}`, `🌌 ${A.givre ? (localStorage.getItem('guilde-odyssee-finie') ? '✅' : 'ouverte') : '🔒'}`, `🏆 ${mesO.filter(r => r.gagne).length} victoire(s)`], parties:() => odyCfgParties('saison') },
      { k:'sansfin', e:'🧩', n:'Sans fin', img:'menu-recu/ody-sansfin.webp?v=1', desc:() => 'L’île se construit tuile par tuile ; après chaque boss, on descend d’un étage. Jusqu’où iras-tu ?',
        verrou:() => A.brulees ? null : 'S’ouvre quand tu as vaincu le Titan de feu (Terres brûlées)', parties:() => odyCfgParties('sansfin') },
      { k:'route', e:'🛤', n:'Route du Titan', img:'menu-recu/mode-route.webp', desc:() => `Les Terres brûlées vues d’en haut : tout le chemin jusqu’au Titan se voit dès le départ. ${ROUTE_ETAPES} étapes, des chemins qui se séparent et se rejoignent : à toi de choisir ta route.`,
        parties:() => odyCfgParties('route') } ],
    options:m => {
      const o = CFG.opts[m] || {};
      if (m === 'jour') return [{ k:'ile', titre:`${ODY_ILE_TXT[ij]}`, verrou:'l’île du jour', aide:'Sa carte, ses monstres et son boss changent chaque jour.' },
        { k:'slot', titre:'💾 L’emplacement (partagé avec la Saison 1)', choix:odyCfgSlots('jour'), def:odyCfgSlotDef('jour') }];
      if (m === 'saison') {
        const ile = ['brulees', 'givre', 'abime'].includes(o.ile) && (o.ile === 'brulees' || (o.ile === 'givre' ? A.brulees : A.givre)) ? o.ile : 'brulees';
        const av = ile === 'brulees' && o.voyage !== 'ile';
        return [{ k:'ile', titre:'🏝 L’île', choix:[{ v:'brulees', n:'🔥 Terres brûlées', d:'Acte I · L’île de cendre et de lave du Titan de feu.' },
            { v:'givre', n:'❄️ Givre', dis:!A.brulees, d:A.brulees ? 'Acte II · Des falaises de glace, gardées par la Vouivre des glaces.' : 'S’ouvre quand tu as vaincu le Titan de feu.' },
            { v:'abime', n:'🌌 Abîme', dis:!A.givre, d:A.givre ? 'Acte III · Une île brisée au-dessus du néant, et le Roi sans visage.' : 'S’ouvre après la Vouivre des glaces.' }] }]
          .concat(ile === 'brulees' ? [{ k:'voyage', titre:'🗺 Le voyage', choix:[{ v:'av', n:'🗺 Grande aventure', d:'Les 3 îles à la suite : ton héros garde son deck, monte de niveau et trouve de l’équipement.' }, { v:'ile', n:'🏝 Une île seule', d:'Une seule île, puis la fin de l’Odyssée.' }], def:localStorage.getItem('guilde-mode-av') === 'ile' ? 'ile' : 'av' }] : [])
          .concat(av ? [] : odyCfgAsc(ile))
          .concat([{ k:'slot', titre:'💾 L’emplacement', choix:odyCfgSlots('saison'), def:odyCfgSlotDef('saison') }]);
      }
      return odyCfgAsc('brulees').concat([{ k:'slot', titre:'💾 L’emplacement', choix:odyCfgSlots(m), def:odyCfgSlotDef(m) }]);
    },
    resume:(m, v) => { const h = odyHeros(choixOdy).nom;
      return `${{ jour:'🗓 Île du jour', saison:'📖 Saison 1', sansfin:'🧩 Sans fin', route:'🛤 Route du Titan' }[m]} · <b>${h}</b>${m === 'saison' ? ' · ' + ODY_ILE_TXT[v.ile] + (v.voyage === 'av' ? ' · Grande aventure' : '') : ''}${v.asc ? ' · ⛰ ' + v.asc : ''} · emplacement ${v.slot}`; },
    lancer:(m, v) => {
      if (!odyCfgHerosOk(choixOdy)) { alert('Choisis un héros.'); return CFG.va(2); }
      const sm = m === 'jour' ? 'saison' : m, ile = m === 'jour' ? ij : m === 'saison' ? v.ile : 'brulees';
      if (m === 'saison' && ile === 'brulees') try { localStorage.setItem('guilde-mode-av', v.voyage === 'ile' ? 'ile' : 'av'); } catch (e) {}
      try { localStorage.removeItem(odyCfgCle(sm, v.slot)); localStorage.setItem('guilde-odyssee-emplacement' + odyCfgSuf(sm), String(v.slot)); } catch (e) {}
      location.href = 'odyssee.html?' + (m === 'sansfin' ? 'sansfin=1&' : m === 'route' ? 'route=1&' : '') + (ile !== 'brulees' ? 'ile=' + ile + '&' : '') + (m === 'jour' ? 'jour=1&' : '')
        + `go=${encodeURIComponent(choixOdy)}&slot=${v.slot}&asc=${v.asc || 0}&av=${m === 'saison' && ile === 'brulees' && v.voyage !== 'ile' ? 1 : 0}`;
    } };
}
// le mode ouvert d'abord : celui de l'adresse (sans fin, Route, île du jour), sinon le dernier choisi
function odyConfig() {
  const mo = SANSFIN ? 'sansfin' : ROUTE_TITAN ? 'route' : Q.get('jour') === '1' ? 'jour' : null;
  if (!odyCfgHerosOk(choixOdy)) choixOdy = 'maelle';
  document.body.classList.remove('givre', 'abime'); try { GM.retour(null); } catch (e) {}
  CFG.ouvre(defOdyssee(), mo ? { mode:mo } : null);
}
