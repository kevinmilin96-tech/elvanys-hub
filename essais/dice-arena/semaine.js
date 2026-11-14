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
];
// la semaine = le lundi de la date ; le rang de la règle tourne de 3 en 3 (8 règles : on les voit toutes en 8 semaines, jamais deux fois de suite)
function lundiDe(d) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
const isoJour = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function regleDeLaSemaine(d) {
  const l = lundiDe(d || new Date()), n = Math.round((l - new Date('2026-11-09T12:00:00')) / 6048e5);
  const r = REGLES_SEMAINE[(((n * 3) % 8) + 8) % 8];
  return Object.assign({ semaine:isoJour(l) }, r);
}
const SCEAUX_CLE = 'guilde-sceaux';
// 14/11 : le Sceau peint par Gemini a un creux vide ; le jeu y pose la VRAIE face 6 du dé du héros (Gemini n'arrive pas à peindre nos dés)
const sceauHTML = (heros, px) => `<span style="position:relative;display:inline-block;width:${px}px;height:${px}px;vertical-align:middle"><img src="portraits/sceau-semaine.webp?v=1" alt="" style="width:100%;height:100%"><img src="faces-${heros || 'gorm'}/face-6.webp" alt="" style="position:absolute;left:29%;top:29%;width:42%;height:42%;border-radius:12%"></span>`;
const lesSceaux = () => { try { return JSON.parse(localStorage.getItem(SCEAUX_CLE) || '{}'); } catch (e) { return {}; } };

// ---------------------------------------------------------------- branchements dans le Duel (seulement quand S.semaine est posé)
if (typeof nouvellePartie === 'function') {
  let SEMAINE_ACTIVE = false;
  const sem = id => typeof S !== 'undefined' && S && S.semaine && S.salle && S.salle.id === id;
  const _np = nouvellePartie;
  nouvellePartie = function (id, idO, auto) {
    if (!SEMAINE_ACTIVE) return _np(id, idO, auto);
    const r = regleDeLaSemaine(), garde = SALLES.slice();
    SALLES.length = 0; SALLES.push({ id:r.id, n:`Règle de la semaine : ${r.n}`, d:r.d });
    // la partie démarre avec la règle déjà en place (le premier tour en tient compte) ; le deck préparé dans la Tour des héros est gardé
    try { _np(id, idO, auto); } finally { SALLES.length = 0; SALLES.push(...garde); }
    S.semaine = r.semaine;
    if (r.id === 'sem-relance') { S.J.relance = Math.max(0, S.J.relance - 1); S.J.pc = Math.min(6, S.J.pc + 1); }
    if (!auto) rendu();
  };
  const _dtSem = debutTour;
  debutTour = function (J) { _dtSem(J); if (sem('sem-relance') && J.tours > 1) { J.relance = Math.max(0, J.relance - 1); J.pc = Math.min(6, J.pc + 1); } };
  const _remplitSem = remplit;
  remplit = function (J, n) { return _remplitSem(J, sem('sem-orage') ? n * 2 : n); };
  const _dgSem = FRAPPE.dg;
  FRAPPE.dg = vs => _dgSem(vs) + (sem('sem-pairs') && vs.every(v => v % 2 === 0) ? 2 : 0);
  const _finSem = montrerFin;
  montrerFin = function () {
    if (S && S.semaine && !S.sceauVu) {
      S.sceauVu = true;
      if (S.fini === 'gagne') { const m = lesSceaux(), neuf = !m[S.semaine]; if (neuf) { m[S.semaine] = { regle:regleDeLaSemaine().n, heros:S.J.id }; try { localStorage.setItem(SCEAUX_CLE, JSON.stringify(m)); } catch (e) {} }
        _finSem(); if (neuf) setTimeout(() => fenetre(`<div style="text-align:center">${sceauHTML(S.J.id, 120)}</div><h2>🔏 Le Sceau de la semaine !</h2><p>« ${regleDeLaSemaine().n} » rejoint ta collection : ${Object.keys(lesSceaux()).length} sceau${Object.keys(lesSceaux()).length > 1 ? 'x' : ''} au Panthéon.</p><div class="corbin" style="font-style:italic">Moustache : « Un sceau de plus. Tu vas finir par en faire une collection. Oh, attends. »</div><div class="choixh"><button onclick="fermer();nouvellePartie(S.J.id, S.O.id)">Rejouer</button><button onclick="location.href='pantheon.html'">🏛 Le Panthéon</button></div>`), 2600);
        return; }
    }
    _finSem();
  };
  window.semaineActive = v => { SEMAINE_ACTIVE = !!v; }; // pour le simulateur
  window.partieSemaine = function () {
    SEMAINE_ACTIVE = true; const r = regleDeLaSemaine(), m = lesSceaux();
    accueil();
    fenetre(`<h2>🗓️ Le Duel de la semaine</h2><p><b>${r.n}</b> : ${r.d}</p><p class="doux">La règle vaut pour toi ET pour l’ordinateur, jusqu’à dimanche soir. Gagne un duel pour le Sceau de la semaine${m[r.semaine] ? ' (déjà gagné ✅)' : ''}.</p><p style="font-style:italic">Moustache : « ${r.corbin} »</p><div class="choixh"><button onclick="fermer()">Choisir mon héros</button></div>`);
  };
}
