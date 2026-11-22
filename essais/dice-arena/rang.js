// =============================================================================================== LE RANG DE LA GUILDE ET LES QUÊTES (14/11 nuit)
// Plan « Pourquoi revenir » (progression-proposition.html), validé par l'utilisateur le 14/11 au soir : un seul compteur d'expérience pour tout
// le jeu, 30 rangs avec une récompense chacun (route des récompenses), 3 quêtes du jour et 3 de la semaine. Tout reste sur le téléphone.
// Les modes n'appellent qu'UNE fonction : guildeEvt(type, n, info) ; ici on compte l'XP et l'avancée des quêtes.
const RANG_CLE = 'guilde-rang', QUETES_CLE = 'guilde-quetes';
const RJ = (cle, def) => { try { return JSON.parse(localStorage.getItem(cle) || 'null') || def; } catch (e) { return def; } };

// ce que rapporte chaque moment fort (XP)
const XP_EVT = {
  duel_gagne:30, duel_perdu:10,            // Arène (duel contre l'ordinateur, énigme, duel de la semaine)
  salle:5, elite:20, boss:60,             // Odyssée et sans fin : salle vidée (monstre), élite, boss
  escale:15, titan:60,                    // Expéditions
  invasion_acte:50, defense_vague:10,     // Invasion, Défense de la porte
  enigme:20,                              // énigme du jour résolue
  etage:40,                               // sans fin : descendre d'un étage
  tour_etage:15,                          // Tour des épreuves : un étage passé (14/11 nuit)
};
const NOM_EVT = { duel_gagne:'Duel gagné', duel_perdu:'Duel joué', salle:'Salle vidée', elite:'Élite vaincue', boss:'Boss vaincu', escale:'Escale gagnée', titan:'Titan vaincu',
  invasion_acte:'Acte de l’Invasion', defense_vague:'Vague tenue', enigme:'Énigme résolue', etage:'Nouvel étage', tour_etage:'Étage de la Tour', chasse:'Chasse au boss', quete_jour:'Quête du jour', quete_semaine:'Quête de la semaine' };

// XP pour passer du rang r au rang r+1 : 200, 250, 300… (rang 30 ≈ 27 000 XP ≈ deux mois de jeu régulier)
const XP_RANG = r => 150 + 50 * r, RANG_MAX = 30;
function rangDe(xp) { let r = 1, reste = xp; while (r < RANG_MAX && reste >= XP_RANG(r)) { reste -= XP_RANG(r); r++; } return { rang:r, dans:reste, besoin:r < RANG_MAX ? XP_RANG(r) : 0 }; }

// LA ROUTE DES RÉCOMPENSES : une par rang (genre, clé, emblème, nom, explication)
// genres : titre (titre + cadre dans le profil), des (apparence des dés), depart (bonus au départ de l'Odyssée et du sans fin),
//          carte (carte nouvelle dans la collection, cartes-nouvelles.js), equip (équipement de la Grande aventure)
const ROUTE = {
  2:['des', 'bronze', '🟫', 'Dés de bronze', 'Une nouvelle apparence pour tes dés (Mon profil).'],
  3:['titre', 'apprenti', '📘', 'Apprenti de la Guilde', 'Un titre et son cadre.'],
  4:['depart', 'huile', '🪔', 'Lanterne remplie', 'Odyssée : +2 huile au départ.'],
  5:['carte', 'n_maelle', '🂠', 'Nouvelle carte', 'Une carte qu’on ne trouve nulle part ailleurs.'],
  6:['titre', 'compagnon', '🛡', 'Compagnon de la Guilde', 'Un titre et son cadre.'],
  7:['des', 'jade', '🟩', 'Dés de jade', 'Une nouvelle apparence pour tes dés.'],
  8:['depart', 'or', '💰', 'Bourse de départ', 'Odyssée : +20 or au départ.'],
  9:['carte', 'n_pip', '🂠', 'Nouvelle carte', 'Une carte qu’on ne trouve nulle part ailleurs.'],
  10:['titre', 'veteran', '⚔️', 'Vétéran de la Guilde', 'Un titre et son cadre.'],
  11:['equip', 'cotte', '🥋', 'Cotte de mailles', 'Grande aventure : un équipement de plus à trouver.'],
  12:['des', 'cristal', '💠', 'Dés de cristal', 'Une nouvelle apparence pour tes dés.'],
  13:['carte', 'n_oria', '🂠', 'Nouvelle carte', 'Une carte qu’on ne trouve nulle part ailleurs.'],
  14:['depart', 'potion', '🧪', 'Potion de départ', 'Odyssée : une potion de soin dans la sacoche au départ.'],
  15:['titre', 'maitre', '🔮', 'Maître des runes', 'Un titre et son cadre.'],
  16:['carte', 'n_aldric', '🂠', 'Nouvelle carte', 'Une carte qu’on ne trouve nulle part ailleurs.'],
  17:['des', 'obsidienne', '⬛', 'Dés d’obsidienne', 'Une nouvelle apparence pour tes dés.'],
  18:['equip', 'heaume', '⛑', 'Heaume du gardien', 'Grande aventure : un équipement de plus à trouver.'],
  19:['carte', 'n_gorm', '🂠', 'Nouvelle carte', 'Une carte qu’on ne trouve nulle part ailleurs.'],
  20:['titre', 'champion', '🏅', 'Champion de la Guilde', 'Un titre et son cadre.'],
  21:['depart', 'pv', '❤', 'Cœur solide', 'Odyssée : +5 PV max au départ.'],
  22:['carte', 'n_zephine', '🂠', 'Nouvelle carte', 'Une carte qu’on ne trouve nulle part ailleurs.'],
  23:['des', 'braise', '🟥', 'Dés de braise', 'Une nouvelle apparence pour tes dés.'],
  24:['equip', 'anneau', '💍', 'Anneau des runes', 'Grande aventure : un équipement de plus à trouver.'],
  25:['titre', 'legende', '🌠', 'Légende de la Guilde', 'Un titre et son cadre.'],
  26:['carte', 'n_guilde', '🂠', 'Nouvelle carte', 'Une carte qu’on ne trouve nulle part ailleurs.'],
  27:['des', 'givre', '🟦', 'Dés de givre', 'Une nouvelle apparence pour tes dés.'],
  28:['depart', 'relance', '🎲', 'Main sûre', 'Odyssée : une relance gratuite de plus à chaque tour de combat.'],
  29:['des', 'or', '🟨', 'Dés d’or', 'Une nouvelle apparence pour tes dés.'],
  30:['titre', 'archimage', '👑', 'Archimage de la Guilde', 'Le titre le plus haut, et son cadre doré.'],
};
// couleur des cadres des titres de rang
const COULEUR_TITRE_RANG = { apprenti:'#8fb3ff', compagnon:'#7dffb0', veteran:'#ff9a5a', maitre:'#c08bff', champion:'#ffd166', legende:'#ff6bd6', archimage:'#fff1a8' };
// apparences des dés : un filtre posé sur les images des faces (aucune image à refaire)
const PEAUX_DES = {
  base:['Dés du héros', ''], bronze:['Dés de bronze', 'sepia(.7) saturate(1.6) hue-rotate(-12deg) brightness(.95)'],
  jade:['Dés de jade', 'hue-rotate(95deg) saturate(1.3)'], cristal:['Dés de cristal', 'hue-rotate(170deg) saturate(.7) brightness(1.25) contrast(1.1)'],
  obsidienne:['Dés d’obsidienne', 'grayscale(.85) brightness(.7) contrast(1.4)'], braise:['Dés de braise', 'sepia(.6) saturate(3) hue-rotate(-35deg) brightness(1.05)'],
  givre:['Dés de givre', 'hue-rotate(185deg) saturate(.5) brightness(1.35)'], or:['Dés d’or', 'sepia(1) saturate(2.6) hue-rotate(-5deg) brightness(1.15) contrast(1.1)'],
};

function lireRang() { const d = Object.assign({ xp:0, journal:[], peau:'base' }, RJ(RANG_CLE, {})); d.info = rangDe(d.xp);
  // 18/11 (l'utilisateur, « comme un battle pass ») : chaque récompense de la route se RÉCUPÈRE d'un toucher ; ce qui était déjà gagné avant reste acquis
  if (!Array.isArray(d.recup)) { d.recup = Object.keys(ROUTE).map(Number).filter(n => n <= d.info.rang); try { const { info, ...rest } = d; localStorage.setItem(RANG_CLE, JSON.stringify(rest)); } catch (e) {} }
  return d; }
const aRecuperer = () => { const d = lireRang(); return Object.keys(ROUTE).map(Number).filter(n => n <= d.info.rang && !d.recup.includes(n)); };
function recupererRang(n) { const d = lireRang(); n = +n; if (n > d.info.rang || d.recup.includes(n) || !ROUTE[n]) return null; d.recup.push(n); ecrireRang(d); syncRecompenses();
  const x = ROUTE[n]; if (typeof annonceRang === 'function') annonceRang(`${x[2]} ${x[3]} récupéré !`, true); return x; }
function ecrireRang(d) { const { info, ...rest } = d; localStorage.setItem(RANG_CLE, JSON.stringify(rest)); }
// récompenses gagnées : tout ce qui est sur la route jusqu'au rang atteint
const recompensesGagnees = () => { const d = lireRang(), r = d.info.rang; return Object.entries(ROUTE).filter(([n]) => +n <= r && d.recup.includes(+n)).map(([n, x]) => ({ rang:+n, genre:x[0], cle:x[1], e:x[2], n:x[3], d:x[4] })); };
const rgRecompense = (genre, cle) => recompensesGagnees().some(x => x.genre === genre && x.cle === cle);
// bonus de départ de l'Odyssée (lus par nouvelleOdyssee)
function bonusDepart() { const g = recompensesGagnees().filter(x => x.genre === 'depart').map(x => x.cle); return { huile:g.includes('huile') ? 2 : 0, or:g.includes('or') ? 20 : 0, potion:g.includes('potion'), pv:g.includes('pv') ? 5 : 0, relance:g.includes('relance') ? 1 : 0 }; }

// ----------------------------------------------------------------------------------------------- les quêtes
// [clé, texte, événement compté, nombre, filtre éventuel]
// 22/11 (l'utilisateur : « en quêtes du jour, dans beaucoup de jeux c'est connexion journalière, envoie 3 cœurs, des gestes simples ;
// quand on touche la quête, on est envoyé dans la bonne rubrique ») : toujours « Passe à la Guilde » + 2 gestes courts tirés au hasard ;
// QUETE_VA dit où mène chaque quête (route.html). Les anciennes quêtes longues restent dans celles de la SEMAINE.
const QUETES_JOUR = [
  ['cx', 'Passe à la Guilde aujourd’hui', 'connexion', 1],
  ['bu', 'Ramasse le butin de la Guilde', 'butin', 1],
  ['co', 'Envoie un cœur à un ami', 'coeur', 1],
  ['en', 'Résous l’énigme du jour', 'enigme', 1],
  ['dg', 'Gagne un Duel dans l’Arène', 'duel_gagne', 1],
  ['ca5', 'Joue 5 cartes, tous modes confondus', 'carte', 5],
  ['es1', 'Gagne 1 escale d’Expédition', 'escale', 1],
  ['cr3', 'Fais tomber 3 monstres dans la Crypte aux Sceaux', 'crypte_tombe', 3], // 22/11 (l'utilisateur : « 3 salles d'Odyssée, c'est long ») : la Crypte, 2-3 minutes
  ['dv2', 'Tiens 2 vagues dans la Défense de la porte', 'defense_vague', 2],
  ['to1', 'Passe 1 étage de la Tour des épreuves', 'tour_etage', 1],
];
const QUETE_VA = { butin:'menu.html', coeur:'menu.html?amis=1', enigme:'duel.html?enigme=1', duel_gagne:'duel.html', carte:'duel.html', escale:'expedition-v4.html',
  crypte_tombe:'crypte.html', salle:'menu.html#odyssee', elite:'menu.html#odyssee', boss:'menu.html#odyssee', defense_vague:'defense.html', tour_etage:'epreuves.html', titan:'expedition-v4.html',
  invasion_acte:'menu.html#invasion', etage_atteint:'menu.html#odyssee', chasse:'epreuves.html#chasse', tuile:'menu.html#odyssee', or:'menu.html#odyssee' };
const QUETES_SEMAINE = [
  ['el3', 'Bats 3 élites', 'elite', 3],
  ['bo2', 'Bats 2 boss de l’Odyssée', 'boss', 2],
  ['dg7', 'Gagne 7 Duels', 'duel_gagne', 7],
  ['ti', 'Bats le Titan des Expéditions', 'titan', 1],
  ['in', 'Gagne un acte de l’Invasion', 'invasion_acte', 1],
  ['en4', 'Résous 4 énigmes du jour', 'enigme', 4],
  ['et3', 'Descends à l’étage 3 du sans fin', 'etage_atteint', 3, 'max'],
  ['sa40', 'Vide 40 salles dans l’Odyssée', 'salle', 40],
  ['dv15', 'Tiens 15 vagues dans la Défense de la porte', 'defense_vague', 15],
  ['ch100', 'Inflige 100 dégâts au boss de la Chasse', 'chasse', 100, 'max'],
  ['to5', 'Passe 5 étages de la Tour des épreuves', 'tour_etage', 5],
];
const rgJourCle = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function semaineCle(d = new Date()) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const j = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - j); const a = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-S${Math.ceil(((t - a) / 864e5 + 1) / 7)}`; }
// petit tirage déterministe (la même liste toute la journée)
function graineHasard(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
function tireQuetes(liste, n, graine, sauf = []) {
  const R = graineHasard(graine), l = liste.filter(q => !sauf.includes(q[0])).slice(), out = [];
  while (out.length < n && l.length) { const q = l.splice(Math.floor(R() * l.length), 1)[0]; const heros = q[4] === 'heros' && typeof ORDRE !== 'undefined' ? ORDRE.filter(h => h !== 'zephine')[Math.floor(R() * 5)] : null; out.push({ id:q[0], prog:0, fait:false, heros }); }
  return out;
}
// 21/11 (l'utilisateur : « un bouton Récupérer quand une quête est finie, pour la satisfaction ; et de l'or ») : la récompense d'une quête
const GAIN_QUETE = { jour:{ xp:40, or:60, pou:30 }, semaine:{ xp:150, or:250, pou:120 } };
function donneQuete(jour) { const g = GAIN_QUETE[jour ? 'jour' : 'semaine']; gagneXP(g.xp, jour ? NOM_EVT.quete_jour : NOM_EVT.quete_semaine);
  if (typeof donneLibres === 'function') donneLibres(jour ? ECLATS_QUETE.jour : ECLATS_QUETE.semaine); if (typeof donneRessources === 'function') donneRessources(g.or, g.pou); return g; }
function recupQuete(jour, i) { const Q = lireQuetes(), q = (jour ? Q.j : Q.s)[i]; if (!q || !q.fait || q.recup !== false) return null; q.recup = true; localStorage.setItem(QUETES_CLE, JSON.stringify(Q)); return donneQuete(jour); }
function lireQuetes() {
  const Q = RJ(QUETES_CLE, {}), j = rgJourCle(), s = semaineCle(); let change = false;
  // une quête finie pas récupérée avant le changement de jour / de semaine est récupérée toute seule (rien n'est perdu)
  if (Q.jour !== j && Q.j) Q.j.forEach(q => { if (q.fait && q.recup === false) { q.recup = true; donneQuete(true); } });
  if (Q.semaine !== s && Q.s) Q.s.forEach(q => { if (q.fait && q.recup === false) { q.recup = true; donneQuete(false); } });
  // 22/11 : nouvelle liste du jour (v:2) : « Passe à la Guilde » toujours, puis 2 gestes courts ; la liste d'aujourd'hui est refaite une fois
  if (Q.jour !== j || Q.vj !== 2) { const garde = Q.jour === j ? (Q.j || []).filter(q => q.fait && QUETES_JOUR.some(x => x[0] === q.id)) : [];
    Q.jour = j; Q.vj = 2; Q.j = garde.concat(tireQuetes(QUETES_JOUR.filter(q => q[0] === 'cx'), 1, 'j' + j, garde.map(q => q.id)), tireQuetes(QUETES_JOUR.filter(q => q[0] !== 'cx'), 3, 'j' + j, garde.map(q => q.id))).slice(0, 3); Q.change = false; change = true; }
  if (Q.semaine !== s) { Q.semaine = s; Q.s = tireQuetes(QUETES_SEMAINE, 3, 's' + s); change = true; }
  if (change) localStorage.setItem(QUETES_CLE, JSON.stringify(Q));
  return Q;
}
const defQuete = (q, jour) => (jour ? QUETES_JOUR : QUETES_SEMAINE).find(x => x[0] === q.id);
function texteQuete(q, jour) { const d = defQuete(q, jour); return d ? d[1].replace('%H', q.heros && typeof HEROS !== 'undefined' ? HEROS[q.heros].nom : 'ton héros') : '?'; }
// changer UNE quête du jour par jour
function changeQuete(i) {
  const Q = lireQuetes(); if (Q.change || !Q.j[i] || Q.j[i].fait || Q.j[i].id === 'cx') return false;
  const n = tireQuetes(QUETES_JOUR.filter(q => q[0] !== 'cx'), 1, 'c' + Q.jour + Date.now(), Q.j.map(q => q.id))[0]; if (!n) return false;
  Q.j[i] = n; Q.change = true; localStorage.setItem(QUETES_CLE, JSON.stringify(Q)); return true;
}

// ----------------------------------------------------------------------------------------------- l'entrée commune : un moment fort
function gagneXP(xp, raison) {
  if (!xp || typeof localStorage === 'undefined') return;
  const d = lireRang(), avant = d.info.rang; d.xp += xp; d.journal.unshift({ q:Date.now(), xp, raison }); d.journal = d.journal.slice(0, 40); ecrireRang(d);
  const apres = rangDe(d.xp).rang; annonceRang(`+${xp} XP · ${raison}`);
  for (let r = avant + 1; r <= apres; r++) { const x = ROUTE[r]; annonceRang(`🏆 Rang ${r} de la Guilde !${x ? ` 🎁 À récupérer : ${x[2]} ${x[3]}${x[0] === 'carte' && typeof CARTES !== 'undefined' && CARTES[x[1]] ? ' : ' + CARTES[x[1]].n : ''}` : ''}`, true); }
  if (apres > avant) { syncRecompenses(); if (typeof donneLibres === 'function') donneLibres(ECLATS_RANG * (apres - avant)); }
}
// les cartes gagnées avec le Rang entrent dans la collection (aussi au chargement, si le rang était déjà atteint)
function syncRecompenses() {
  try { const col = JSON.parse(localStorage.getItem('guilde-collection') || '[]'); let n = 0;
    recompensesGagnees().filter(x => x.genre === 'carte').forEach(x => { if (!col.includes(x.cle)) { col.push(x.cle); n++; } });
    if (n) localStorage.setItem('guilde-collection', JSON.stringify(col)); } catch (e) {}
}
// 22/11 (décision de l'utilisateur) : LES SUCCÈS. Un compteur commun pour ce que le jeu ne gardait pas ailleurs (succes.js lit ces compteurs).
// guildeEvt compte tout seul chaque moment fort ; les modes appellent succesCompte(cle) pour le reste (duel contre un ami, fusions…).
const SUCCES_CLE = 'guilde-succes';
function lireSucces() { try { return Object.assign({ c:{}, base:{}, max:{}, recup:{}, coffres:0 }, JSON.parse(localStorage.getItem(SUCCES_CLE) || '{}')); } catch (e) { return { c:{}, base:{}, max:{}, recup:{}, coffres:0 }; } }
function succesCompte(cle, n = 1) { if (typeof localStorage === 'undefined' || !n) return; try { const d = lireSucces(); d.c[cle] = (d.c[cle] || 0) + n; localStorage.setItem(SUCCES_CLE, JSON.stringify(d)); } catch (e) {} }
function guildeEvt(type, n = 1, info = {}) {
  if (typeof localStorage === 'undefined') return;
  succesCompte(type, n);
  try {
    if (info.heros && typeof ECLATS_EVT !== 'undefined' && ECLATS_EVT[type]) donneEclats(info.heros, ECLATS_EVT[type]); // 14/11 nuit : éclats du héros
    // 15/11 : le système des héros : de l'or 🪙 et de la poussière de rune 🔹 à chaque moment fort, et parfois une pièce d'équipement sur un boss ou une élite
    if (typeof GAINS_EVT !== 'undefined' && GAINS_EVT[type]) { const g = GAINS_EVT[type], k = type === 'salle' || type === 'defense_vague' ? Math.min(n, 5) : 1; donneRessources(g[0] * k, g[1] * k, type === 'salle' || type === 'defense_vague');
      const ch = { boss:.5, titan:.6, elite:.2, etage:.25 }[type]; if (ch && Math.random() < ch && typeof avGagne === 'function') { const p = avGagne(0, 1, type !== 'elite')[0]; if (p && typeof annonceRang === 'function') annonceRang(`⚒ Équipement trouvé : ${p.nom} (${EQ_RARE[p.r].n})`, true); } }
    if (XP_EVT[type]) gagneXP(XP_EVT[type] * (type === 'salle' || type === 'defense_vague' ? n : 1), NOM_EVT[type]);
    const Q = lireQuetes(); let fini = [];
    [['j', true], ['s', false]].forEach(([k, jour]) => Q[k].forEach(q => {
      const d = defQuete(q, jour); if (!d || q.fait || d[2] !== type) return;
      if (d[4] === 'heros' && info.heros !== q.heros && info.voie !== q.heros) return; // 15/11 soir : un héros d'aventure compte pour le héros de sa voie
      q.prog = d[4] === 'max' ? Math.max(q.prog, n) : q.prog + n;
      if (q.prog >= d[3]) { q.prog = d[3]; q.fait = true; q.recup = false; fini.push([texteQuete(q, jour), jour]); }
    }));
    fini.forEach(([, jour]) => { if (jour) succesCompte('quete_jour'); });
    if (Q.s && Q.s.length && Q.s.every(q => q.fait) && Q.sParfaite !== Q.semaine) { Q.sParfaite = Q.semaine; succesCompte('semaine_parfaite'); }
    localStorage.setItem(QUETES_CLE, JSON.stringify(Q));
    fini.forEach(([t]) => annonceRang(`📜 Quête accomplie : ${t} · va la récupérer 🎁`, true)); // 21/11 : la récompense se RÉCUPÈRE (route des rangs, onglet Quêtes)
  } catch (e) { console.error(e); }
}

// ----------------------------------------------------------------------------------------------- petites annonces en haut de l'écran
let fileRang = [], annonceEnCours = false;
function annonceRang(t, fort) {
  if (typeof document === 'undefined' || !document.body) return;
  fileRang.push([t, fort]); if (!annonceEnCours) suiteAnnonce();
}
function suiteAnnonce() {
  const x = fileRang.shift(); if (!x) { annonceEnCours = false; return; } annonceEnCours = true;
  const d = document.createElement('div'); d.className = 'annonce-rang' + (x[1] ? ' fort' : ''); d.textContent = x[0]; document.body.appendChild(d);
  setTimeout(() => d.classList.add('part'), x[1] ? 2600 : 1500); setTimeout(() => { d.remove(); suiteAnnonce(); }, x[1] ? 3000 : 1900);
}
// l'apparence des dés choisie (filtre sur toutes les faces)
function appliquePeau() {
  if (typeof document === 'undefined') return; let st = document.getElementById('peau-des'); if (!st) { st = document.createElement('style'); st.id = 'peau-des'; document.head.appendChild(st); }
  const p = lireRang().peau, f = PEAUX_DES[p] && rgPeauOk(p) ? PEAUX_DES[p][1] : '';
  st.textContent = f ? `img[src*="faces-"][src*="face-"] { filter:${f}; }` : '';
}
const rgPeauOk = p => p === 'base' || rgRecompense('des', p);
function choisirPeau(p) { const d = lireRang(); if (!rgPeauOk(p)) return; d.peau = p; ecrireRang(d); appliquePeau(); }

// 22/11 : l'emblème peint du rang (ui/rangs/rang-NN.webp, 30 images Gemini), le numéro écrit par le jeu sur la plaque du centre
function emblemeRang(r, px = 40, cls = '') { r = Math.max(1, Math.min(RANG_MAX, r | 0)); const k = String(r).padStart(2, '0');
  return `<span class="embl-rang ${cls}" style="width:${px}px;height:${px}px;font-size:${Math.round(px * .3)}px" title="Rang ${r}"><img src="ui/rangs/rang-${k}.webp?v=2" alt="" draggable="false"><b>${r}</b></span>`; }
// le petit bandeau du menu : rang, barre, quêtes du jour
function bandeauRangHTML() {
  const d = lireRang(), i = d.info, Q = lireQuetes(), fj = Q.j.filter(q => q.fait).length, fs = Q.s.filter(q => q.fait).length;
  // 18/11 (l'utilisateur : « le rang est trop caché ») : barre plus grande, un toucher ouvre la route des rangs ; les quêtes ont leur propre bouton
  const ar = aRecuperer().length, qr = [...Q.j, ...Q.s].filter(q => q.fait && q.recup === false).length;
  return `<a class="bandeau-rang gros" href="route.html">${emblemeRang(i.rang, 40)}<b>Rang ${i.rang}</b><span class="barre-rang"><i style="width:${i.besoin ? Math.round(i.dans / i.besoin * 100) : 100}%"></i><span class="txt">${i.besoin ? `${i.dans} / ${i.besoin} XP` : 'rang max'}</span></span>${ar ? `<em class="cadeau" title="Récompense à récupérer">🎁 Récupérer</em>` : '<em>›</em>'}</a>
  <a class="bandeau-quetes" href="route.html#quetes">📜 Quêtes du jour <b>${fj}/3</b> · de la semaine <b>${fs}/3</b>${qr ? ` · <b style="color:#ffd27a">🎁 ${qr} à récupérer</b>` : ''} ›</a>`;
}

if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = `
  .embl-rang { position:relative; display:inline-block; flex:none; vertical-align:middle; line-height:1; } .embl-rang img { width:100%; height:100%; object-fit:contain; display:block; -webkit-user-select:none; user-select:none; } .embl-rang b { position:absolute; left:0; right:0; top:50.5%; transform:translateY(-50%); text-align:center; font-family:Georgia, serif; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000, 0 0 3px #000, 0 0 1px #000; }
  .annonce-rang { position:fixed; left:50%; top:calc(10px + env(safe-area-inset-top)); transform:translate(-50%, -8px); opacity:0; z-index:9999; background:#1d1838f2; color:#f1ecff; border:1px solid #f3c96b88; border-radius:14px; padding:7px 14px; font:14px Georgia, serif; box-shadow:0 6px 22px #0009; animation:annRang .3s forwards; pointer-events:none; max-width:92vw; text-align:center; }
  .annonce-rang.fort { border-color:#f3c96b; color:#f3c96b; font-weight:bold; font-size:15px; box-shadow:0 0 22px #f3c96b66, 0 6px 22px #0009; }
  .annonce-rang.part { transition:.4s; opacity:0; transform:translate(-50%, -14px); }
  @keyframes annRang { to { opacity:1; transform:translate(-50%, 0); } }
  .bandeau-rang { display:flex; align-items:center; gap:8px; text-decoration:none; color:#f1ecff; background:#1d1838e6; border:1px solid #f3c96b66; border-radius:14px; padding:6px 10px; font:13px Georgia, serif; }
  .bandeau-rang b { color:#f3c96b; white-space:nowrap; } .bandeau-rang small { color:#c9c1ea; white-space:nowrap; font-size:.85em; } .bandeau-rang em { font-style:normal; white-space:nowrap; color:#f3c96b; }
  .bandeau-rang.gros { padding:9px 12px; font-size:15px; border-width:2px; } .bandeau-rang.gros .barre-rang { height:18px; position:relative; border-radius:9px; } .bandeau-rang.gros .barre-rang .txt { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:11px; color:#fff; text-shadow:0 1px 2px #000; }
  .bandeau-rang em.cadeau { white-space:nowrap; font-style:normal; font-size:.72em; padding:2px 6px !important; flex:none; background:linear-gradient(#7dff8a, #2fbf47); color:#0b3a12; box-shadow:0 2px 0 #1a7a2a, 0 0 12px #7dff8a88; border-radius:10px; padding:1px 7px; font-weight:bold; animation:cadeauR 1.2s ease-in-out infinite; } @keyframes cadeauR { 50% { transform:scale(1.15); } }
  .bandeau-quetes { display:block; text-align:center; margin-top:5px; text-decoration:none; color:#f1ecff; background:#1d1838cc; border:1px solid #6b5fb0; border-radius:12px; padding:5px 10px; font:13px Georgia, serif; } .bandeau-quetes b { color:#f3c96b; }
  .barre-rang { flex:1; min-width:40px; height:8px; background:#0d0b1f; border-radius:6px; overflow:hidden; } .barre-rang i { display:block; height:100%; background:linear-gradient(90deg, #c78a2c, #f3c96b); border-radius:6px; }`;
  document.head.appendChild(st);
  appliquePeau(); syncRecompenses();
}

// =============================================================================================== LE BUTIN DU CAMPEMENT (14/11 nuit, comme les récompenses « pendant ton absence » d'AFK Arena)
// Il se remplit tout seul : par heure, 8 XP, un demi éclat de Guilde, 30 🪙 d'or et 15 🔹 de poussière de rune, plus vite quand on monte dans la Tour
// des épreuves (+5 % par étage passé) ; 12 heures au plus. On le ramasse depuis le menu.
// 19/11 (l'utilisateur : « la récolte et le butin du campement sont deux choses à deux endroits : un seul endroit et la même chose ») :
// la « récolte du campement » de Mes héros (or + poussière, heros-etoiles.js) est fondue ICI ; recolteDispo / recolter y renvoient.
const BUTIN_CLE = 'guilde-butin', BUTIN_MAX_H = 12, BUTIN_H = { xp:8, eclats:.5, or:30, pou:15 };
function butinCalcule() {
  const b = RJ(BUTIN_CLE, null); if (!b) { localStorage.setItem(BUTIN_CLE, JSON.stringify({ depuis:Date.now() })); return { h:0, xp:0, eclats:0, or:0, pou:0 }; }
  const etages = Math.max(0, (RJ('guilde-tour-epreuves', {}).etage || 1) - 1), vit = 1 + .05 * etages;
  const h = Math.min(BUTIN_MAX_H, (Date.now() - b.depuis) / 36e5), f = k => Math.floor(h * BUTIN_H[k] * vit);
  // l'ancienne récolte pas encore ramassée est ajoutée une fois
  let or0 = 0, pou0 = 0; try { const t = +localStorage.getItem('guilde-recolte') || 0; if (t) { const hr = Math.min(12, (Date.now() - t) / 36e5); or0 = Math.floor(hr * 30); pou0 = Math.floor(hr * 15); } } catch (e) {}
  return { h, xp:f('xp'), eclats:f('eclats'), or:f('or') + or0, pou:f('pou') + pou0, vit };
}
function butinRamasse() {
  try { if (typeof guildeEvt === 'function') setTimeout(() => guildeEvt('butin', 1), 0); } catch (e) {} // 22/11 : quête du jour « Ramasse le butin »
  const g = butinCalcule(); if (g.xp < 1 && g.eclats < 1 && g.or < 1) return g;
  localStorage.setItem(BUTIN_CLE, JSON.stringify({ depuis:Date.now() })); try { localStorage.removeItem('guilde-recolte'); } catch (e) {}
  if (g.xp) gagneXP(g.xp, 'Butin de la Guilde'); if (g.eclats && typeof donneLibres === 'function') donneLibres(g.eclats);
  if ((g.or || g.pou) && typeof donneRessources === 'function') donneRessources(g.or, g.pou, true);
  return g;
}
function butinHTML() { const g = butinCalcule(), plein = g.h >= BUTIN_MAX_H;
  return `<button class="butin ${plein ? 'plein' : ''}" onclick="butinRamasse(); const rm = document.getElementById('rangmenu'); if (rm) rm.innerHTML = bandeauRangHTML() + butinHTML(); else this.outerHTML = butinHTML();">🎁 Butin de la Guilde : <span style="white-space:nowrap"><b>${g.xp} XP · 💠 ${g.eclats} · 🪙 ${g.or} · 🔹 ${g.pou}</b></span>${plein ? ' · plein !' : ` · <span style="white-space:nowrap">${Math.floor(g.h)} h / ${BUTIN_MAX_H} h</span>`}</button>`; }
if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = `.butin { display:block; width:100%; margin-top:5px; font:12.5px Georgia, serif; color:#f1ecff; background:#1d1838e6; border:1px solid #4b4580; border-radius:12px; padding:5px 8px; } .butin b { color:#f3c96b; } .butin.plein { border-color:#f3c96b; box-shadow:0 0 12px #f3c96b88; animation:butinP 1.6s ease-in-out infinite; } @keyframes butinP { 50% { box-shadow:0 0 2px #f3c96b44; } }`; document.head.appendChild(st); }
