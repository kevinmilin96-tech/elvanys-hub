// =============================================================================================== MON PROFIL (14/11)
// Décision de l'utilisateur (boîtes) : une page « Mon profil » ouverte depuis le menu ; on y choisit son NOM, son CADRE (un seul, autour du
// héros qu'on joue), son TITRE (affiché sous son nom en combat), et on y retrouve les TROPHÉES (les mêmes que le Panthéon).
// Les titres et les trophées sont décrits ICI une seule fois (le Panthéon les lit aussi). Chaque titre gagné débloque son cadre.
// Cadres provisoires dessinés en code (anneau de couleur + emblème), en attendant des cadres en image.
const PROFIL_CLE = 'guilde-profil';
const JL = (cle, def) => { try { return JSON.parse(localStorage.getItem(cle) || 'null') || def; } catch (e) { return def; } };
// titre = [clé, emblème, nom, comment l'obtenir, gagné ?, couleur du cadre]
function titresGuilde() {
  const P = typeof lirePantheon === 'function' ? lirePantheon() : { heros:{} }, exp = JL('guilde-expedition2-records', []), inv = JL('guilde-invasion', {});
  const eni = JL('guilde-enigmes', {}), eniDim = Object.keys(eni).filter(k => eni[k].ok && new Date(k + 'T12:00:00').getDay() === 0).length;
  return [
    ['diplome',   '🎓', 'Diplômé de la Guilde', 'Finir le tutoriel avec Moustache.', localStorage.getItem('guilde-tuto') === 'fait', '#f3c96b'],
    ['odyssee',   '🌟', 'Héros de l’Odyssée', 'Libérer les trois îles de l’Odyssée.', !!localStorage.getItem('guilde-odyssee-finie'), '#7cc8ff'],
    ['neant',     '🌑', 'Briseur de Néant', 'Inscrire un héros au Tableau d’honneur (finir l’Abîme du Vide).', Object.keys(P.heros || {}).length > 0, '#a855f7'],
    ['traversee', '🌊', 'Traversée parfaite', 'Vaincre le Titan des Expéditions sans perdre un cœur.', exp.some(r => r.parfait), '#2fd3c4'],
    ['rempart',   '⚔️', 'Rempart de la Guilde', 'Gagner les deux actes de l’Invasion.', !!(inv.eveil && inv.reveil), '#ff6b5a'],
    ['sceaux',    '🔏', 'Gardien des sceaux', 'Gagner 10 Sceaux de la semaine (Duel de la semaine).', Object.keys(JL('guilde-sceaux', {})).length >= 10, '#d08a4a'],
    ['sphinx',    '🧩', 'Sphinx de la Guilde', 'Résoudre une énigme du dimanche (la plus redoutable de la semaine).', eniDim > 0, '#9be37a'],
  ];
}
function lireProfil() {
  const p = Object.assign({ nom:'', cadre:null, titre:null }, JL(PROFIL_CLE, {}));
  const gagnes = titresGuilde().filter(t => t[4]).map(t => t[0]);
  if (p.cadre === null) p.cadre = gagnes.includes('diplome') ? 'diplome' : 'aucun'; // avant le profil, le diplôme se posait tout seul : on garde ça par défaut
  if (p.cadre !== 'aucun' && !gagnes.includes(p.cadre)) p.cadre = 'aucun';
  if (p.titre && !gagnes.includes(p.titre)) p.titre = null;
  return p;
}
function ecrireProfil(p) { localStorage.setItem(PROFIL_CLE, JSON.stringify({ nom:(p.nom || '').trim().slice(0, 18), cadre:p.cadre, titre:p.titre })); }
const titreDe = k => titresGuilde().find(t => t[0] === k);
// le portrait du joueur en combat : cadre + nom + titre (appelé après chaque dessin du Duel)
function appliqueProfil() {
  const b = document.getElementById('b-J'); if (!b || typeof S === 'undefined' || !S || S.deux || S.coop) return;
  const p = lireProfil(), c = p.cadre !== 'aucun' && titreDe(p.cadre);
  b.classList.toggle('cadreP', !!c); if (c) { b.style.setProperty('--cc', c[5]); b.dataset.e = c[1]; }
  const n = b.querySelector('.nom'); if (n && (p.nom || p.titre)) { n.classList.add('nomP'); const t = p.titre && titreDe(p.titre); n.innerHTML = `${p.nom || 'Toi'}${t ? ` <small>${t[1]} ${t[2]}</small>` : ''}`; }
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
    <div><b>🔏 Les Sceaux de la semaine</b>${nbSc} sceau${nbSc > 1 ? 'x' : ''}<br><small>${Object.entries(sc).sort().reverse().slice(0, 6).map(([k, x]) => `${k.slice(8, 10)}/${k.slice(5, 7)} ${x.regle}`).join(' · ') || 'aucun pour l’instant'}</small></div>
    <div><b>🧩 L’énigme du jour</b>${s(eniOk.length, 'résolue')} · ${eniPremier} du premier coup<br><small>meilleure série : ${eniSerieMax} jour${eniSerieMax > 1 ? 's' : ''} · dimanches : ${eniDim}</small></div>
    <div><b>🛡 L’Invasion</b>Acte I ${inv.eveil ? '✅' : '⬜'} · Acte II ${inv.reveil ? '✅' : '⬜'}<br><small>grands boss : ${['colosseracines', 'kraken', 'ignaros'].filter(k => inv[k]).map(k => HEROS[k].nom.split(',')[0]).join(', ') || '—'}</small></div>
  </div>`;
}
