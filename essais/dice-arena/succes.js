// =============================================================================================== LES SUCCÈS (22/11/2026)
// Décision de l'utilisateur (page succes-proposition.html, validée le 22/11) : une BIBLIOTHÈQUE DES SUCCÈS façon Guild Wars 2 / League of Legends.
// · chaque succès a jusqu'à 5 paliers (I à V) ; chaque palier donne des points (5, 10, 15, 20, 30) et une récompense :
//   I 150 or · II 400 or · III 150 poussière · IV 10 éclats · le DERNIER palier donne un TITRE de profil (et son cadre).
// · un COFFRE des succès tous les 100 points (300 or, 150 poussière, 10 éclats) ; tous les 500 points, un titre rare en plus.
// · rien ne se gagne en silence : un palier atteint s'allume avec « 🎁 Récupérer » (pastille sur le Profil).
// · tes parties passées comptent dès l'ouverture quand le jeu les gardait ; le reste se compte à partir de l'ouverture
//   (compteurs de rang.js : succesCompte, et guildeEvt qui compte chaque moment fort).
// Stockage (rang.js) : guilde-succes = { c:{compteurs}, base:{valeur de départ}, max:{valeurs gardées}, recup:{id:paliers récupérés}, coffres }.
(function () {
const JS = (cle, def) => { try { return JSON.parse(localStorage.getItem(cle) || 'null') || def; } catch (e) { return def; } };
const POINTS = [5, 10, 15, 20, 30];
const GAINS = [{ or:150 }, { or:400 }, { pou:150 }, { eclats:10 }];
const COFFRE = { or:300, pou:150, eclats:10 }, COFFRE_PTS = 100;
const TITRES_COFFRE = [[500, '📚', 'Chasseur de succès'], [1000, '🗝️', 'Collectionneur de la Guilde'], [2000, '📜', 'Archiviste de la Guilde'], [3000, '🌌', 'Grand Archiviste']];

const D = () => lireSucces();
const parties = () => JS('guilde-parties', []), recOdy = () => JS('guilde-odyssee-records', []), meta4 = () => JS('guilde-expedition4-meta', {});
const ev = (k) => (D().c[k] || 0);
// une valeur « de départ + compteur » : la valeur de départ est lue une seule fois, à l'ouverture des succès
const baseEv = (id, base, k) => { const d = D(); if (d.base[id] == null) { d.base[id] = base(); localStorage.setItem(SUCCES_CLE, JSON.stringify(d)); } return d.base[id] + (d.c[k] || 0); };
const eni = () => { const e = JS('guilde-enigmes', {}); return Object.keys(e).filter(k => e[k] && e[k].ok).sort().map(k => [k, e[k]]); };
const serie = () => { let best = 0, n = 0, prev = null; eni().forEach(([k]) => { const t = Date.parse(k + 'T12:00:00Z'); n = prev !== null && Math.round((t - prev) / 864e5) === 1 ? n + 1 : 1; prev = t; best = Math.max(best, n); }); return best; };
const herosE = () => { try { return Object.values(lireEtoiles().heros || {}); } catch (e) { return []; } };
const pieces = () => { try { return avSac().pieces || []; } catch (e) { return []; } };

// [id, famille, nom, description, paliers, valeur(), titre final [emblème, nom]]
const FAMILLES = [['arene', '⚔️', 'L’Arène'], ['odyssee', '🏰', 'L’Odyssée'], ['exp', '⛵', 'Les Expéditions'], ['inv', '🛡', 'L’Invasion et la Défense'],
  ['crypte', '🪦', 'La Crypte, la Descente, la Fosse'], ['chron', '📜', 'Les Chroniques'], ['enigme', '🧩', 'L’énigme du jour'], ['heros', '🧙', 'Les héros et la collection'],
  ['amis', '👥', 'Les amis'], ['guilde', '🌟', 'La Guilde']];
const SUCCES = [
  ['duels', 'arene', 'Duels gagnés', 'Gagner des duels contre l’ordinateur.', [5, 25, 50, 100, 250], () => baseEv('duels', () => parties().filter(p => p.resultat === 'gagne' && p.ordi).length, 'duel_arene'), ['⚔️', 'Gladiateur de l’Arène']],
  ['tousheros', 'arene', 'Tous les héros', 'Gagner au moins un duel avec chacun des héros de la Guilde.', [1, 2, 3, 4, 6], () => new Set(parties().filter(p => p.resultat === 'gagne').map(p => p.moi).concat(D().max.heros_duel || [])).size, ['🎭', 'Maître des six voies']],
  ['duelami', 'arene', 'Duels gagnés contre un ami', 'Gagner un duel en ligne contre un ami.', [1, 5, 15, 30, 60], () => ev('duel_ami'), ['🤺', 'Rival redouté']],
  ['eclair', 'arene', 'Victoire éclair', 'Gagner un duel en 8 tours ou moins.', [1, 5, 15, 30, 60], () => baseEv('eclair', () => parties().filter(p => p.resultat === 'gagne' && (p.tours | 0) <= 8 && p.ordi).length, 'duel_eclair'), ['⚡', 'Foudre de l’Arène']],
  ['sceaux', 'arene', 'Sceaux de la semaine', 'Gagner le Duel de la semaine. Au palier IV : les 16 sceaux.', [1, 5, 10, 16, 30], () => Object.keys(JS('guilde-sceaux', {})).length, ['🔏', 'Grand Gardien des sceaux']],

  ['iles', 'odyssee', 'Îles libérées', 'Libérer les Terres brûlées, le Givre, puis l’Abîme.', [1, 2, 3], () => Object.values(JS('guilde-actes', {})).filter(Boolean).length, ['🗺️', 'Libérateur des îles']],
  ['odys', 'odyssee', 'Odyssées gagnées', 'Gagner des Odyssées (Saison 1, île seule, Grande aventure).', [1, 5, 15, 30, 60], () => baseEv('odys', () => recOdy().filter(r => r.gagne && !r.sansfin && !r.route && !String(r.graine || '').startsWith('jour-')).length, 'ody_gagne'), ['⛵', 'Grand voyageur']],
  ['asc', 'odyssee', 'Ascension', 'Le plus haut cran d’Ascension gagné.', [1, 3, 5, 7, 10], () => Math.max(0, ...Object.values(JS('guilde-ascension', {})).map(Number).filter(n => !isNaN(n))), ['⛰️', 'Maître de l’Ascension']],
  ['ilejour', 'odyssee', 'Île du jour', 'Gagner l’île du jour.', [1, 7, 30, 60, 100], () => baseEv('ilejour', () => recOdy().filter(r => r.gagne && String(r.graine || '').startsWith('jour-')).length, 'ody_jour'), ['🗓️', 'Fidèle de l’île du jour']],
  ['sansfin', 'odyssee', 'Odyssée sans fin', 'L’étage le plus profond atteint.', [3, 5, 10, 15, 20], () => Math.max(0, ...recOdy().filter(r => r.sansfin).map(r => r.etage | 0)), ['🧩', 'Bâtisseur de l’infini']],
  ['route', 'odyssee', 'Route du Titan', 'Vaincre le Titan au bout de la Route.', [1, 5, 15, 30, 60], () => baseEv('route', () => recOdy().filter(r => r.gagne && r.route).length, 'ody_route'), ['🛤', 'Pourfendeur de Titans']],
  ['nemesis', 'odyssee', 'Némésis vaincues', 'Vaincre les rivaux qui reviennent te chercher.', [1, 5, 15, 30, 60], () => +(localStorage.getItem('guilde-nemesis-vaincues') || 0), ['😈', 'Fléau des Némésis']],

  ['voyages', 'exp', 'Voyages gagnés', 'Vaincre le boss de la mer.', [1, 5, 15, 30, 60], () => (meta4().gagnes || 0) + JS('guilde-expedition2-records', []).filter(r => r.gagne).length, ['🧭', 'Capitaine légendaire']],
  ['chasseur', 'exp', 'Chasseur de boss', 'Vaincre les boss différents des mers, une fois chacun.', [1, 2, 3, 4, 5], () => (meta4().bossVus || []).length, ['🐙', 'Terreur des mers']],
  ['mers', 'exp', 'Mers conquises', 'Gagner un voyage sur chaque mer.', [1, 2, 3], () => Object.keys(meta4().mers || {}).length, ['🌊', 'Seigneur des trois mers']],
  ['equipages', 'exp', 'Duel d’équipages', 'Gagner des Duels d’équipages contre l’ordinateur.', [1, 5, 15, 30, 60], () => ev('eq_gagne'), ['🏴‍☠️', 'Amiral de la Guilde']],

  ['actes', 'inv', 'Actes de l’Invasion', 'L’Éveil de l’Abîme, le Réveil des Primordiaux.', [1, 2], () => { const i = JS('guilde-invasion', {}); return (i.eveil ? 1 : 0) + (i.reveil ? 1 : 0); }, ['⚔️', 'Rempart des actes']],
  ['grandsboss', 'inv', 'Grands boss', 'Colosse des racines, Kraken, Ignaros.', [1, 2, 3], () => { const i = JS('guilde-invasion', {}); return ['colosseracines', 'kraken', 'ignaros'].filter(k => i[k]).length; }, ['🐉', 'Tueur de géants']],
  ['invasions', 'inv', 'Invasions gagnées', 'Gagner un acte de l’Invasion.', [1, 5, 15, 30, 60], () => ev('invasion_acte'), ['🛡️', 'Bouclier de la Guilde']],
  ['defense', 'inv', 'Défense de la porte', 'Gagner la Défense de la porte.', [1, 5, 15, 30, 60], () => JS('guilde-defense', []).filter(x => x.gagne).length, ['🏯', 'Gardien de la porte']],
  ['vagues', 'inv', 'Vagues sans fin', 'La vague la plus haute tenue en mode sans fin.', [10, 20, 30, 40, 50], () => JS('guilde-defense-sansfin', {}).vague | 0, ['🌊', 'Inébranlable']],

  ['cryptes', 'crypte', 'Cryptes vidées', 'Battre le Gardien de la Crypte.', [1, 5, 15, 30, 60], () => JS('guilde-crypte', {}).victoires | 0, ['🪦', 'Pilleur de cryptes']],
  ['descentes', 'crypte', 'Descentes gagnées', 'Remonter d’une Descente.', [1, 5, 15, 30, 60], () => JS('guilde-descente', {}).victoires | 0, ['🗺️', 'Seigneur des profondeurs']],
  ['profondeur', 'crypte', 'Profondeur', 'La profondeur la plus grande gagnée dans la Descente.', [2, 4, 6, 8, 10], () => Math.max(0, (JS('guilde-descente', {}).profMax || 1) - 1), ['🕳', 'Roi des abysses']],
  ['breloques', 'crypte', 'Breloques', 'Les 8 breloques de la Descente.', [2, 4, 6, 8], () => Object.keys(JS('guilde-descente', {}).breloques || {}).length, ['🧿', 'Collectionneur de breloques']],
  ['fosse', 'crypte', 'Titans de la Fosse', 'Abattre le Titan de feu dans la Fosse aux Runes.', [1, 5, 15, 30, 60], () => JS('guilde-fosse3', {}).victoires | 0, ['🔥', 'Briseur de Titans']],

  ['scenarios', 'chron', 'Scénarios gagnés', 'Gagner un scénario des Chroniques.', [1, 5, 15, 30, 60], () => JS('guilde-chroniques', {}).horloger | 0, ['📜', 'Héros des Chroniques']],
  ['campagnes', 'chron', 'Campagnes finies', 'Finir les trois chapitres à la suite.', [1, 3, 5], () => JS('guilde-chroniques', {}).campagnes | 0, ['📖', 'Conteur de légendes']],
  ['plusieurs', 'chron', 'À plusieurs', 'Gagner les Chroniques avec au moins un ami.', [1, 5, 15, 30, 60], () => ev('chron_amis'), ['🤝', 'Frère d’armes']],

  ['enigmes', 'enigme', 'Énigmes résolues', 'Résoudre l’énigme du jour.', [1, 10, 50, 100, 365], () => eni().length, ['🧩', 'Grand Sphinx']],
  ['premier', 'enigme', 'Du premier coup', 'Résoudre l’énigme du jour au premier essai.', [1, 10, 30, 60, 100], () => eni().filter(([, x]) => x.essais === 1).length, ['🎯', 'Esprit fulgurant']],
  ['serie', 'enigme', 'Série', 'La plus longue série de jours qui se suivent.', [3, 7, 30, 60, 100], serie, ['🔥', 'Flamme éternelle']],
  ['dimanche', 'enigme', 'Énigmes du dimanche', 'Résoudre les énigmes les plus redoutables de la semaine.', [1, 5, 15, 30, 52], () => eni().filter(([k]) => new Date(k + 'T12:00:00').getDay() === 0).length, ['🌙', 'Oracle du dimanche']],

  ['collection', 'heros', 'Collection de cartes', 'Les cartes de ta collection.', [25, 50, 100, 150, 200], () => JS('guilde-collection', []).length, ['🃏', 'Grand collectionneur']],
  ['legendaires', 'heros', 'Héros légendaires', 'Héros montés au moins au rang Légendaire.', [1, 2, 3, 4, 6], () => herosE().filter(h => (h.rang | 0) >= 5).length, ['🌟', 'Mentor des héros']],
  ['niveaux', 'heros', 'Niveaux des héros', 'La somme des niveaux de tous tes héros.', [50, 150, 300, 600, 1000], () => herosE().reduce((t, h) => t + (h.niv | 0), 0), ['📈', 'Entraîneur de la Guilde']],
  ['forgeron', 'heros', 'Forgeron', 'Fusionner des pièces à la Forge.', [1, 10, 25, 50, 100], () => ev('forge_fusion'), ['⚒', 'Maître forgeron']],
  ['legendaire', 'heros', 'Légendaire', 'Avoir des pièces d’équipement légendaires ou mythiques.', [1, 3, 6, 12, 36], () => pieces().filter(p => (p.r | 0) >= 3).length, ['💎', 'Trésor vivant']],

  ['coeurs', 'amis', 'Cœurs envoyés', 'Envoyer un cœur à tes amis, chaque jour.', [10, 50, 150, 300, 500], () => +(localStorage.getItem('guilde-coeurs-env') || 0), ['💝', 'Cœur de la Guilde']],
  ['enligne', 'amis', 'Parties en ligne', 'Finir des parties avec des amis.', [1, 10, 25, 50, 100], () => ev('en_ligne'), ['🌐', 'Âme de la Guilde']],

  ['rang', 'guilde', 'Rang de la Guilde', 'Monter les rangs de la Guilde.', [5, 10, 15, 20, 30], () => { try { return lireRang().info.rang; } catch (e) { return 0; } }, ['👑', 'Pilier de la Guilde']],
  ['jours', 'guilde', 'Jours joués', 'Finir au moins une partie dans la journée (pas forcément à la suite).', [7, 30, 60, 100, 365], () => +(localStorage.getItem('guilde-jours-joues') || 0), ['🏅', 'Légende fidèle']],
  ['quetes', 'guilde', 'Quêtes du jour', 'Accomplir des quêtes du jour.', [10, 50, 150, 300, 500], () => ev('quete_jour'), ['📜', 'Infatigable']],
  ['semaines', 'guilde', 'Semaines parfaites', 'Accomplir toutes les quêtes de la semaine.', [1, 5, 10, 25, 52], () => ev('semaine_parfaite'), ['🏆', 'Semaine parfaite']],
];

// la valeur d'un succès (jamais en baisse : le jeu ne garde parfois que les dernières parties)
function valeur(s) { let v = 0; try { v = Math.max(0, Number(s[5]()) || 0); } catch (e) { v = 0; }
  const d = D(); if (v > (d.max[s[0]] || 0)) { d.max[s[0]] = v; localStorage.setItem(SUCCES_CLE, JSON.stringify(d)); } return Math.max(v, d.max[s[0]] || 0); }
const atteints = (s, v) => s[4].filter(p => v >= p).length;
const recuperes = (s) => D().recup[s[0]] | 0;
const ROM = ['I', 'II', 'III', 'IV', 'V'];
const gainDe = (s, i) => i === s[4].length - 1 ? { titre:s[0] } : GAINS[i];
function points() { return SUCCES.reduce((t, s) => { const r = recuperes(s); return t + POINTS.slice(0, r).reduce((a, b) => a + b, 0); }, 0); }
function aRecuperer() { return SUCCES.reduce((t, s) => t + Math.max(0, atteints(s, valeur(s)) - recuperes(s)), 0) + Math.max(0, Math.floor(points() / COFFRE_PTS) - (D().coffres | 0)); }
const gainTxt = g => g.titre ? `🏅 titre « ${SUCCES.find(s => s[0] === g.titre)[6][1]} »` : g.or ? `🪙 ${g.or} or` : g.pou ? `🔹 ${g.pou} poussière` : `💠 ${g.eclats} éclats`;
function donne(g) {
  if (g.or && typeof avGagne === 'function') avGagne(g.or, 0);
  if (g.pou && typeof lireEtoiles === 'function') { const e = lireEtoiles(); e.poussiere = (e.poussiere || 0) + g.pou; ecrireEtoiles(e); }
  if (g.eclats && typeof donneLibres === 'function') donneLibres(g.eclats);
}
// récupère le palier suivant d'un succès → le texte de la récompense, ou null
function recuperePalier(id) {
  const s = SUCCES.find(x => x[0] === id); if (!s) return null; const r = recuperes(s); if (r >= atteints(s, valeur(s))) return null;
  const g = gainDe(s, r); donne(g); const d = D(); d.recup[id] = r + 1; localStorage.setItem(SUCCES_CLE, JSON.stringify(d));
  return `${s[2]} ${ROM[r]} : +${POINTS[r]} points · ${gainTxt(g)}`;
}
function recupereCoffre() { const d = D(), dus = Math.floor(points() / COFFRE_PTS); if ((d.coffres | 0) >= dus) return null; d.coffres = (d.coffres | 0) + 1; localStorage.setItem(SUCCES_CLE, JSON.stringify(d)); donne(COFFRE); return `🎁 Coffre des succès : 🪙 ${COFFRE.or} or, 🔹 ${COFFRE.pou} poussière, 💠 ${COFFRE.eclats} éclats`; }
// les titres de profil gagnés par les succès (lus par titresGuilde de profil.js) : [clé, emblème, nom, comment, gagné, couleur]
function succesTitres() {
  const pts = points();
  return SUCCES.map(s => ['s-' + s[0], s[6][0], s[6][1], `Succès « ${s[2]} » : dernier palier (${s[4][s[4].length - 1]}).`, recuperes(s) >= s[4].length, '#f3c96b'])
    .concat(TITRES_COFFRE.map(([n, e, t]) => ['sp-' + n, e, t, `Récupérer ${n} points de succès.`, pts >= n, '#c084fc']));
}
Object.assign(window, { SUCCES, FAMILLES_SUCCES:FAMILLES, POINTS_SUCCES:POINTS, COFFRE_SUCCES:COFFRE, COFFRE_PTS, succesValeur:valeur, succesAtteints:atteints, succesRecuperes:recuperes,
  succesPoints:points, succesARecuperer:aRecuperer, succesGainTxt:(s, i) => gainTxt(gainDe(s, i)), recuperePalier, recupereCoffre, succesTitres, TITRES_COFFRE });
})();
