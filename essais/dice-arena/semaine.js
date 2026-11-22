// =============================================================================================== LES RÈGLES DE LA SEMAINE (13/11)
// Proposition validée le 13/11 (semaine-proposition.html, idée n° 1 de la R&D) : un « Duel de la semaine » (duel.html?semaine=1),
// une règle qui change chaque LUNDI (la même pour tous, tirée d'après la date, jamais deux semaines de suite la même),
// appliquée aux DEUX joueurs, à la place de la « salle » du Duel. Gagner = le Sceau de la semaine (Panthéon, collection).
// Chargé par duel.html (et menu.html / pantheon.html pour le nom de la règle) ; ne change rien hors du Duel de la semaine.

const REGLES_SEMAINE = [
  { id:'sem-relance', n:'Une seule relance, mais riche', d:'1 relance gratuite au lieu de 2, et +1 PC à chaque tour.', corbin:'Une seule relance ? Pense avant de lancer. Moi, je pense toujours. Enfin, entre deux siestes.' },
  { id:'sem-pairs', n:'La fête des pairs', d:'Une Frappe faite avec des dés pairs fait +2.', corbin:'Les pairs font la fête. Les impairs boudent dans leur coin.' },
  { id:'sem-suites', n:'Suites généreuses', d:'Une suite de 3 dés compte comme une suite de 4 : la Technique fait 7 au lieu de 4.', corbin:'1-2-3, et hop, 7 dégâts. C’est presque de la triche. J’adore.' },
  { id:'sem-marche', n:'Le marché noir', d:'Vendre un dé rapporte 2 PC au lieu de 1.', corbin:'Psst. Tu veux vendre un dé ? Je connais un gars. Il paie double.' },
  { id:'sem-charge', n:'Créatures pressées', d:'Toutes les créatures ont Charge : elles attaquent dès leur arrivée.', corbin:'Personne ne dort cette semaine. Pas même les créatures. Surtout pas les créatures.' },
  { id:'echos', n:'Les soldes de la Guilde', d:'La première carte de chaque tour coûte 1 PC de moins.', corbin:'Les soldes ! La première carte de chaque tour est moins chère. Profites-en, moi je n’ai pas de poches.' },
  { id:'sem-orage', n:'L’orage d’Ultime', d:'La jauge d’Ultime se remplit deux fois plus vite.', corbin:'Ça sent l’orage. Les Ultimes vont pleuvoir. Mets-toi à l’abri. Sous un meuble, par exemple. C’est ce que je fais.' },
  { id:'sem-boucliers', n:'Boucliers épais', d:'Chaque Garde donne +2 de Bouclier.', corbin:'Tout le monde a forgé des boucliers. Les duels vont durer. Pense à grignoter. Moi, je grignote déjà.' },
  // 17/11 (choix de l'utilisateur) : 8 règles de plus, 16 en tout
  { id:'sem-chance', n:'Le dé chanceux', d:'À chaque tour, le premier 1 lancé devient un 6.', corbin:'Un 1 ? Pouf, un 6. La chance te sourit. Moi, elle me sourit tout le temps : je suis un chat.' },
  { id:'sem-brouillard', n:'Brouillard de guerre', d:'Toutes les créatures arrivent Cachées.', corbin:'On n’y voit rien. Les créatures se cachent dans la brume. Moi aussi, d’ailleurs. Tu ne me trouveras pas.' },
  { id:'sem-soif', n:'Soif de sang', d:'Chaque Frappe qui fait perdre des PV au héros adverse te soigne de 1 PV.', corbin:'Chaque coup qui porte te rend 1 PV. C’est un peu comme un bol de lait après une bagarre.' },
  { id:'sem-jumeaux', n:'Les jumeaux', d:'Une Frappe faite avec exactement 2 dés identiques (une paire) fait +2 dégâts.', corbin:'Deux dés pareils, +2 dégâts. Les jumeaux, c’est toujours plus fort à deux. Sauf pour partager les croquettes.' },
  { id:'sem-main', n:'Main pleine', d:'Une carte de plus au départ, et une carte de plus piochée au 3e tour.', corbin:'Plein de cartes ! Ne les fais pas tomber. Moi, je les ferais tomber. Exprès.' },
  { id:'sem-riposte', n:'Riposte', d:'Chaque Garde inflige aussi 1 dégât au héros adverse (ni Bouclier ni Esquive ne l’arrêtent).', corbin:'Même en te protégeant, tu piques. Comme un hérisson. Un hérisson très bien coiffé.' },
  { id:'sem-eclair', n:'Duel éclair', d:'Les deux héros commencent avec la moitié de leurs PV (arrondie au-dessus).', corbin:'Moitié de vie, moitié de temps. Ça va aller vite. Ne cligne pas des yeux.' },
  { id:'sem-sang', n:'Le prix du sang', d:'Une fois par tour, tu peux payer 3 PV pour gagner 1 PC (bouton 🩸).', corbin:'3 PV contre 1 PC. Un marché de sorcière. Je ne juge pas. Enfin, un peu.' },
];
// la semaine = le lundi de la date ; le rang de la règle tourne de 3 en 3 (16 règles depuis le 17/11 ; 3 et 16 premiers entre eux :
// on les voit toutes en 16 semaines, jamais deux fois de suite). Même origine qu'avant : la semaine du 16/11 garde « Le marché noir ».
function lundiDe(d) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
const isoJour = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function regleDeLaSemaine(d) {
  const l = lundiDe(d || new Date()), n = Math.round((l - new Date('2026-11-09T12:00:00')) / 6048e5);
  const N = REGLES_SEMAINE.length, r = REGLES_SEMAINE[(((n * 3) % N) + N) % N];
  return Object.assign({ semaine:isoJour(l) }, r);
}
// 17/11 : pour le simulateur et les essais, une règle peut être forcée (window.REGLE_FORCEE = 'sem-…') ; elle ne donne jamais de Sceau
function regleActive() { const f = typeof window !== 'undefined' && window.REGLE_FORCEE && REGLES_SEMAINE.find(x => x.id === window.REGLE_FORCEE);
  return f ? Object.assign({ semaine:isoJour(lundiDe(new Date())), forcee:true }, f) : regleDeLaSemaine(); }
const SCEAUX_CLE = 'guilde-sceaux';
// 14/11 : le Sceau peint par Gemini a un creux vide ; le jeu y pose la VRAIE face 6 du dé du héros (Gemini n'arrive pas à peindre nos dés)
// 17/11 (choix de l'utilisateur) : un sceau dessiné par RÈGLE (portraits/sceau-<id de la règle>.webp) ; tant qu'il n'est pas arrivé, l'ancien sceau commun
// 22/11 (l'utilisateur : « mettre un gros dé dessus, ça casse le visuel ») : le sceau peint seul, sans la face du dé ; le héros est écrit à côté
const sceauHTML = (heros, px, regle) => `<img src="${regle ? `portraits/sceau-${regle}.webp?v=2` : 'portraits/sceau-semaine.webp?v=1'}" onerror="this.onerror=null;this.src='portraits/sceau-semaine.webp?v=1'" alt="" style="width:${px}px;height:${px}px;vertical-align:middle">`;
const lesSceaux = () => { try { return JSON.parse(localStorage.getItem(SCEAUX_CLE) || '{}'); } catch (e) { return {}; } };

// ---------------------------------------------------------------- branchements dans le Duel (seulement quand S.semaine est posé)
if (typeof nouvellePartie === 'function') {
  let SEMAINE_ACTIVE = false;
  // 17/11 : la salle porte aussi « sem » (posée avant le premier tour) : la règle vaut dès le tour 1 (le dé chanceux du premier lancer…)
  const sem = id => typeof S !== 'undefined' && S && (S.semaine || (S.salle && S.salle.sem)) && S.salle && S.salle.id === id;
  const _np = nouvellePartie;
  nouvellePartie = function (id, idO, auto) {
    if (!SEMAINE_ACTIVE) return _np(id, idO, auto);
    const r = regleActive(), garde = SALLES.slice();
    SALLES.length = 0; SALLES.push({ id:r.id, n:`Règle de la semaine : ${r.n}`, d:r.d, sem:true });
    // la partie démarre avec la règle déjà en place (le premier tour en tient compte) ; le deck préparé dans la Tour des héros est gardé
    try { _np(id, idO, auto); } finally { SALLES.length = 0; SALLES.push(...garde); }
    S.semaine = r.semaine;
    if (r.id === 'sem-relance') { S.J.relance = Math.max(0, S.J.relance - 1); S.J.pc = Math.min(6, S.J.pc + 1); }
    if (r.id === 'sem-main') { pioche(S.J, 1); pioche(S.O, 1); log('🂠 Main pleine : une carte de plus pour chacun.'); }
    if (r.id === 'sem-eclair') { [S.J, S.O].forEach(P => { P.pvMax = Math.ceil(P.pvMax / ECLAIR); P.pv = P.pvMax; }); log('⚡ Duel éclair : les deux héros commencent à moitié de leurs PV.'); }
    if (!auto) rendu();
  };
  const ECLAIR = 2;
  // --- Le dé chanceux : à chaque tour, le premier 1 lancé devient un 6 (relances comprises)
  const _lanceSem = lance;
  lance = function (J, d) { _lanceSem(J, d);
    if (sem('sem-chance') && d.v === 1 && J.chanceT !== J.tours) { J.chanceT = J.tours; d.v = 6; log(`🍀 Le dé chanceux : le 1 de ${J.nom} devient un 6 !`); fx({ t:'annonce', txt:`🍀 Le dé chanceux : ${J === S.J ? 'ton' : 'son'} 1 devient un 6 !` }); if (J.id === 'pip') ajouteMeute(J, 1); } };
  // --- Brouillard de guerre : toute créature qui arrive est Cachée
  const _invSem = invoque;
  invoque = function (J, base, key) { const n0 = J.front.length; _invSem(J, base, key); if (sem('sem-brouillard') && J.front.length > n0) J.front[J.front.length - 1].cachee = true; };
  // --- Les jumeaux : une Frappe faite avec exactement 2 dés identiques (la paire) fait +2
  const _dgJum = FRAPPE.dg;
  const JUMEAUX = 2; // 17/11 : +3 demandé, ramené à +2 au simulateur (Zéphine montait à 68 %)
  FRAPPE.dg = vs => _dgJum(vs) + (sem('sem-jumeaux') && vs.length === 2 ? JUMEAUX : 0);
  // --- Soif de sang : une Frappe qui fait perdre des PV au héros adverse soigne de 1 PV
  const _fSoif = FRAPPE.f;
  FRAPPE.f = (J, vs, k) => { const pv0 = k && !k.u ? k.J.pv : null; _fSoif(J, vs, k);
    if (sem('sem-soif') && pv0 !== null && k.J.pv < pv0 && J.pv > 0) { log(`🩸 Soif de sang : ${J.nom} reprend 1 PV.`); soin(J, 1); } };
  // --- Garde : Boucliers épais (+2 de Bouclier ; 17/11 : n'était pas branché) et Riposte (1 dégât au héros adverse)
  const _poseSem = pose;
  pose = function (J, quoi, ds, k, im) { _poseSem(J, quoi, ds, k, im);
    if (quoi !== 'garde' || S.fini) return;
    if (sem('sem-boucliers')) { J.gardeB += 2; log(`🛡 Boucliers épais : +2 de Bouclier pour ${J.nom}.`); }
    if (sem('sem-riposte')) { log(`↩ Riposte : la Garde de ${J.nom} inflige 1 dégât.`); fx({ t:'annonce', txt:`↩ Riposte : 1 dégât à ${adv(J).nom}` }); degats({ J:adv(J) }, 1, true); } };
  // --- Le prix du sang : une fois par tour, 3 PV contre 1 PC
  const sangPossible = J => sem('sem-sang') && !S.fini && J.sangT !== J.tours && J.pv > 3 && J.pc < 6;
  function payeSang(J) { if (!sangPossible(J)) return false; J.sangT = J.tours; J.pv -= 3; J.pc = Math.min(6, J.pc + 1);
    log(`🩸 Le prix du sang : ${J.nom} paie 3 PV et gagne 1 PC.`); fx({ t:'degat', c:ref({ J }), n:3, abs:0, pv:J.pv, mot:'Prix du sang' }); fx({ t:'pc', s:J === S.J ? 'J' : 'O', n:1, nb:0 }); bilan(J, 'actions', '🩸 Prix du sang : 3 PV → 1 PC'); return true; }
  // l'ordinateur paie s'il lui manque juste 1 PC pour une carte jouable avec ses dés, et qu'il a plus de 10 PV
  const _achSem = achatsAuto;
  achatsAuto = function (J) { _achSem(J);
    if (!sangPossible(J) || J.pv <= SANG_PV_MIN) return;
    const libres = J.des.filter(d => !d.pose); let utile = false;
    J.pc++; try { utile = J.main.some(k => coutCarte(J, k) === J.pc && sousEnsembles(libres).some(ds => permis(J, k, vals(ds), ds))); } finally { J.pc--; }
    if (utile) payeSang(J); };
  const SANG_PV_MIN = 10;
  window.sangDemande = function () { const J = S.J;
    if (!sangPossible(J)) { fenetre(`<h2>🩸 Le prix du sang</h2><p>${J.sangT === J.tours ? 'Déjà payé ce tour-ci : une fois par tour.' : J.pc >= 6 ? 'Tu as déjà 6 PC (le plafond).' : 'Il te faut plus de 3 PV.'}</p><div class="choixh"><button onclick="fermer()">Compris</button></div>`); return; }
    fenetre(`<h2>🩸 Le prix du sang</h2><p>Tu paies <b>3 PV</b> pour gagner <b>1 PC</b> (une fois par tour).</p><p>❤ ${J.pv} → <b>${J.pv - 3}</b> PV · ◆ ${J.pc} → <b>${J.pc + 1}</b> PC</p><div class="choixh"><button onclick="fermer()">Annuler</button><button onclick="fermer();sangValide()">Valider</button></div>`); };
  window.sangValide = function () { if (payeSang(S.J)) rendu(); };
  // le bouton 🩸 apparaît sur le plateau pendant ton tour
  const _desSem = dessine;
  dessine = function () { _desSem.apply(this, arguments); let b = document.getElementById('btSang');
    const voir = sem('sem-sang') && !S.fini && !S.auto && !fxOn;
    if (!voir) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('button'); b.id = 'btSang'; b.onclick = () => sangDemande(); document.body.appendChild(b); }
    const ok = sangPossible(S.J); b.innerHTML = `🩸 3 PV → 1 PC${ok ? '' : ` <small>(${S.J.sangT === S.J.tours ? 'fait ce tour' : 'impossible'})</small>`}`;
    b.style.cssText = `position:fixed;z-index:30;left:6px;bottom:58px;padding:5px 10px;border-radius:14px;border:2px solid #b91c1c;background:${ok ? '#7f1d1d' : '#44403c'};color:#fff;font:bold 14px system-ui;opacity:${ok ? 1 : .6};box-shadow:0 2px 8px #0008`; };
  const _dtSem = debutTour;
  debutTour = function (J) { _dtSem(J); if (sem('sem-relance') && J.tours > 1) { J.relance = Math.max(0, J.relance - 1); J.pc = Math.min(6, J.pc + 1); }
    if (sem('sem-main') && J.tours === 3 && !S.fini) { pioche(J, 1); log(`🂠 Main pleine : ${J.nom} pioche une carte de plus.`); } };
  const _remplitSem = remplit;
  remplit = function (J, n) { return _remplitSem(J, sem('sem-orage') ? n * 2 : n); };
  const _dgSem = FRAPPE.dg;
  FRAPPE.dg = vs => _dgSem(vs) + (sem('sem-pairs') && vs.every(v => v % 2 === 0) ? 2 : 0);
  const _finSem = montrerFin;
  montrerFin = function () {
    if (S && S.semaine && !S.sceauVu && !regleActive().forcee) {
      S.sceauVu = true;
      if (S.fini === 'gagne') { const m = lesSceaux(), neuf = !m[S.semaine]; if (neuf) { m[S.semaine] = { regle:regleDeLaSemaine().n, id:regleDeLaSemaine().id, heros:S.J.id }; try { localStorage.setItem(SCEAUX_CLE, JSON.stringify(m)); } catch (e) {} }
        _finSem(); if (neuf) setTimeout(() => fenetre(`<div style="text-align:center">${sceauHTML(S.J.id, 120, regleDeLaSemaine().id)}</div><h2>🔏 Le Sceau de la semaine !</h2><p>« ${regleDeLaSemaine().n} », gagné avec ${(typeof HEROS !== 'undefined' && HEROS[S.J.id] && HEROS[S.J.id].nom) || 'ton héros'}, rejoint ta collection : ${Object.keys(lesSceaux()).length} sceau${Object.keys(lesSceaux()).length > 1 ? 'x' : ''} au Panthéon.</p><div class="corbin" style="font-style:italic">Moustache : « Un sceau de plus. Tu vas finir par en faire une collection. Oh, attends. »</div><div class="choixh"><button onclick="fermer();nouvellePartie(S.J.id, S.O.id)">Rejouer</button><button onclick="location.href='pantheon.html'">🏛 Le Panthéon</button><button onclick="location.href='menu.html'">⌂ Menu</button></div>`) || (() => { const f = document.querySelector('#fen .fenetre'); if (f) f.onclick = null; })(), 2600); // 17/11 : + Menu, et la fenêtre ne se ferme plus à côté
        return; }
    }
    _finSem();
  };
  window.semaineActive = v => { SEMAINE_ACTIVE = !!v; }; // pour le simulateur
  window.partieSemaine = function () {
    SEMAINE_ACTIVE = true; const r = regleActive(), m = lesSceaux();
    accueil();
    fenetre(`<h2>🗓️ Le Duel de la semaine</h2><p><b>${r.n}</b> : ${r.d}</p><p class="doux">La règle vaut pour toi ET pour l’ordinateur, jusqu’à dimanche soir. Gagne un duel pour le Sceau de la semaine${m[r.semaine] ? ' (déjà gagné ✅)' : ''}.</p><p style="font-style:italic">Moustache : « ${r.corbin} »</p><div class="choixh"><button onclick="accueil()">Choisir mon héros</button></div>`);
  };
}
