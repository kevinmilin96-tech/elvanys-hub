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
};
const NOM_EVT = { duel_gagne:'Duel gagné', duel_perdu:'Duel joué', salle:'Salle vidée', elite:'Élite vaincue', boss:'Boss vaincu', escale:'Escale gagnée', titan:'Titan vaincu',
  invasion_acte:'Acte de l’Invasion', defense_vague:'Vague tenue', enigme:'Énigme résolue', etage:'Nouvel étage', quete_jour:'Quête du jour', quete_semaine:'Quête de la semaine' };

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

function lireRang() { const d = Object.assign({ xp:0, journal:[], peau:'base' }, RJ(RANG_CLE, {})); d.info = rangDe(d.xp); return d; }
function ecrireRang(d) { const { info, ...rest } = d; localStorage.setItem(RANG_CLE, JSON.stringify(rest)); }
// récompenses gagnées : tout ce qui est sur la route jusqu'au rang atteint
const recompensesGagnees = () => { const r = lireRang().info.rang; return Object.entries(ROUTE).filter(([n]) => +n <= r).map(([n, x]) => ({ rang:+n, genre:x[0], cle:x[1], e:x[2], n:x[3], d:x[4] })); };
const rgRecompense = (genre, cle) => recompensesGagnees().some(x => x.genre === genre && x.cle === cle);
// bonus de départ de l'Odyssée (lus par nouvelleOdyssee)
function bonusDepart() { const g = recompensesGagnees().filter(x => x.genre === 'depart').map(x => x.cle); return { huile:g.includes('huile') ? 2 : 0, or:g.includes('or') ? 20 : 0, potion:g.includes('potion'), pv:g.includes('pv') ? 5 : 0, relance:g.includes('relance') ? 1 : 0 }; }

// ----------------------------------------------------------------------------------------------- les quêtes
// [clé, texte, événement compté, nombre, filtre éventuel]
const QUETES_JOUR = [
  ['dg', 'Gagne un Duel dans l’Arène', 'duel_gagne', 1],
  ['dg2', 'Gagne 2 Duels dans l’Arène', 'duel_gagne', 2],
  ['dh', 'Gagne un Duel avec %H', 'duel_gagne', 1, 'heros'],
  ['sa', 'Vide 8 salles dans l’Odyssée', 'salle', 8],
  ['el', 'Bats une élite dans l’Odyssée', 'elite', 1],
  ['es', 'Gagne 2 escales d’Expédition', 'escale', 2],
  ['en', 'Résous l’énigme du jour', 'enigme', 1],
  ['tu', 'Pose 12 tuiles dans l’Odyssée sans fin', 'tuile', 12],
  ['dv', 'Tiens 4 vagues dans la Défense de la porte', 'defense_vague', 4],
  ['or', 'Gagne 200 or dans l’Odyssée', 'or', 200],
  ['ca', 'Joue 15 cartes, tous modes confondus', 'carte', 15],
];
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
function lireQuetes() {
  const Q = RJ(QUETES_CLE, {}), j = rgJourCle(), s = semaineCle(); let change = false;
  if (Q.jour !== j) { Q.jour = j; Q.j = tireQuetes(QUETES_JOUR, 3, 'j' + j); Q.change = false; change = true; }
  if (Q.semaine !== s) { Q.semaine = s; Q.s = tireQuetes(QUETES_SEMAINE, 3, 's' + s); change = true; }
  if (change) localStorage.setItem(QUETES_CLE, JSON.stringify(Q));
  return Q;
}
const defQuete = (q, jour) => (jour ? QUETES_JOUR : QUETES_SEMAINE).find(x => x[0] === q.id);
function texteQuete(q, jour) { const d = defQuete(q, jour); return d ? d[1].replace('%H', q.heros && typeof HEROS !== 'undefined' ? HEROS[q.heros].nom : 'ton héros') : '?'; }
// changer UNE quête du jour par jour
function changeQuete(i) {
  const Q = lireQuetes(); if (Q.change || !Q.j[i] || Q.j[i].fait) return false;
  const n = tireQuetes(QUETES_JOUR, 1, 'c' + Q.jour + Date.now(), Q.j.map(q => q.id))[0]; if (!n) return false;
  Q.j[i] = n; Q.change = true; localStorage.setItem(QUETES_CLE, JSON.stringify(Q)); return true;
}

// ----------------------------------------------------------------------------------------------- l'entrée commune : un moment fort
function gagneXP(xp, raison) {
  if (!xp || typeof localStorage === 'undefined') return;
  const d = lireRang(), avant = d.info.rang; d.xp += xp; d.journal.unshift({ q:Date.now(), xp, raison }); d.journal = d.journal.slice(0, 40); ecrireRang(d);
  const apres = rangDe(d.xp).rang; annonceRang(`+${xp} XP · ${raison}`);
  for (let r = avant + 1; r <= apres; r++) { const x = ROUTE[r]; annonceRang(`🏆 Rang ${r} de la Guilde !${x ? ` ${x[2]} ${x[3]}` : ''}`, true); }
}
function guildeEvt(type, n = 1, info = {}) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (XP_EVT[type]) gagneXP(XP_EVT[type] * (type === 'salle' || type === 'defense_vague' ? n : 1), NOM_EVT[type]);
    const Q = lireQuetes(); let fini = [];
    [['j', true], ['s', false]].forEach(([k, jour]) => Q[k].forEach(q => {
      const d = defQuete(q, jour); if (!d || q.fait || d[2] !== type) return;
      if (d[4] === 'heros' && info.heros !== q.heros) return;
      q.prog = d[4] === 'max' ? Math.max(q.prog, n) : q.prog + n;
      if (q.prog >= d[3]) { q.prog = d[3]; q.fait = true; fini.push([texteQuete(q, jour), jour]); }
    }));
    localStorage.setItem(QUETES_CLE, JSON.stringify(Q));
    fini.forEach(([t, jour]) => { annonceRang(`📜 Quête accomplie : ${t}`, true); gagneXP(jour ? 40 : 150, jour ? NOM_EVT.quete_jour : NOM_EVT.quete_semaine); });
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

// le petit bandeau du menu : rang, barre, quêtes du jour
function bandeauRangHTML() {
  const d = lireRang(), i = d.info, Q = lireQuetes(), fj = Q.j.filter(q => q.fait).length, fs = Q.s.filter(q => q.fait).length;
  return `<a class="bandeau-rang" href="profil.html#rang"><b>🏆 Rang ${i.rang}</b><span class="barre-rang"><i style="width:${i.besoin ? Math.round(i.dans / i.besoin * 100) : 100}%"></i></span><small>${i.besoin ? `${i.dans} / ${i.besoin} XP` : 'rang max'}</small><em>📜 ${fj}/3 · ${fs}/3</em></a>`;
}

if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = `
  .annonce-rang { position:fixed; left:50%; top:calc(10px + env(safe-area-inset-top)); transform:translate(-50%, -8px); opacity:0; z-index:9999; background:#1d1838f2; color:#f1ecff; border:1px solid #f3c96b88; border-radius:14px; padding:7px 14px; font:14px Georgia, serif; box-shadow:0 6px 22px #0009; animation:annRang .3s forwards; pointer-events:none; max-width:92vw; text-align:center; }
  .annonce-rang.fort { border-color:#f3c96b; color:#f3c96b; font-weight:bold; font-size:15px; box-shadow:0 0 22px #f3c96b66, 0 6px 22px #0009; }
  .annonce-rang.part { transition:.4s; opacity:0; transform:translate(-50%, -14px); }
  @keyframes annRang { to { opacity:1; transform:translate(-50%, 0); } }
  .bandeau-rang { display:flex; align-items:center; gap:8px; text-decoration:none; color:#f1ecff; background:#1d1838e6; border:1px solid #f3c96b66; border-radius:14px; padding:6px 10px; font:13px Georgia, serif; }
  .bandeau-rang b { color:#f3c96b; white-space:nowrap; } .bandeau-rang small { color:#c9c1ea; white-space:nowrap; font-size:.85em; } .bandeau-rang em { font-style:normal; white-space:nowrap; color:#f3c96b; }
  .barre-rang { flex:1; min-width:40px; height:8px; background:#0d0b1f; border-radius:6px; overflow:hidden; } .barre-rang i { display:block; height:100%; background:linear-gradient(90deg, #c78a2c, #f3c96b); border-radius:6px; }`;
  document.head.appendChild(st);
  appliquePeau();
}
