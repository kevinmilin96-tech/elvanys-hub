// =============================================================================================== LES HÉROS D'AVENTURE (15/11)
// Demande de l'utilisateur : « la construction du héros », comme dans Donjons et Dragons. Chaque joueur crée SON héros : une VOIE
// (les 6 façons de jouer de la Guilde), un nom, un portrait, une couleur, et un DÉ PERSONNEL dont il forge les faces en montant de niveau.
// Ils ne vont jamais dans le Duel ni l'Arène : ils sont faits pour l'aventure (les Chroniques d'abord). Tout reste sur le téléphone.
const AV_CLE = 'guilde-aventuriers';
// les 6 voies : leur héros modèle (talent, dés, portrait de secours, faces de dé)
// h = homme, f = femme (les deux portraits de la galerie)
const VOIES = {
  maelle:  { n:'Forge', h:'le Forgeron', f:'la Forgeronne', role:'Frappe fort : un 6 brise deux sceaux.' },
  aldric:  { n:'Lanterne', h:'le Chevalier', f:'la Chevalière', role:'Protège : son bouclier couvre aussi ses voisins.' },
  pip:     { n:'Forêt', h:'le Druide', f:'la Druidesse', role:'Soigne : un dé rend sa valeur en PV.' },
  oria:    { n:'Carte', h:'le Cartographe', f:'la Cartographe', role:'Explore : +2 cases, voit les pièges et plus loin.' },
  gorm:    { n:'Cor', h:'le Sonneur de cor', f:'la Sonneuse de cor', role:'Lance 4 dés au lieu de 3.' },
  zephine: { n:'Tempête', h:'le Tempétueux', f:'la Tempétueuse', role:'Frappe jusqu’à 2 cases de distance.' },
};
const AV_COULEURS = ['#ff8a2a', '#ffd27a', '#7dffb0', '#5ff5e6', '#4f8bff', '#c58bff', '#ff4040', '#ff7ac8'];
const AV_NOMS = ['Brann', 'Elva', 'Toric', 'Lysa', 'Corwin', 'Maëva', 'Hugo le Brave', 'Nora', 'Ivo', 'Selma', 'Alaric', 'Rina', 'Bastien', 'Ysolde', 'Gaspard', 'Lou', 'Edric', 'Mila', 'Fenn', 'Talia'];
// niveaux : XP pour atteindre le niveau n (1 à 6) ; chaque niveau donne +2 PV et 1 point de forge ; au niveau 4, un dé de plus
const AV_SEUILS = [0, 0, 100, 250, 450, 700, 1000];
const AV_MAX = 6;
// les TALENTS : aux niveaux 2, 4 et 6, on en choisit un sur deux (pour que deux héros de la même voie ne se ressemblent pas)
const TALENTS = {
  2:[['robuste', '💪 Robuste', '+4 PV.'], ['eclaireur', '🥾 Pied léger', '+1 case à chaque déplacement.']],
  4:[['protecteur', '🛡 Protecteur', 'Quand il protège, le bouclier donné est plus fort de 2.'], ['chanceux', '🍀 Chanceux', 'Les pièges cachés dans les meubles ne le touchent jamais.']],
  6:[['brute', '🔨 Coup puissant', 'Quand il frappe avec un 5 ou un 6, il brise DEUX sceaux.'], ['guerisseur', '🌿 Herboriste', 'Il sait soigner : un dé rend la moitié de sa valeur en PV (à lui ou à un voisin).']],
};
const avTalents = a => Object.values(a.talents || {});
function avChoisitTalent(id, niv, k) { return !!avMaj(id, a => { if (avNiv(a) < NIV_TALENT[niv]) return; a.talents = a.talents || {}; a.talents[niv] = k; }); }

// 16/11 soir (choix de l'utilisateur) : UN SEUL NIVEAU, celui du héros (Mes héros) ; le dé personnel garde ses chiffres 1 à 6
// (pour les paires et les suites) et chaque face reçoit un BONUS +1 (2 au plus) qui compte pour frapper les sceaux « ≥ » et « Σ » ;
// 1 point de forge tous les 5 niveaux. Les faces déjà montées l'ancienne façon deviennent des bonus.
const AV_BONUS_MAX = 2, NIV_TALENT = { 2:5, 4:10, 6:20 };
// 19/11 (décision de l'utilisateur) : après le niveau 60, le dé grandit avec le RANG du héros (heros-etoiles.js) : +2 au plus par face,
// +3 au rang Élite, +4 Légendaire, +5 Mythique, +6 Ascendant, puis +1 par étoile d'Ascendant (+11 à Ascendant ★★★★★) ; toujours 1 point de forge tous les 5 niveaux
const AV_PALIERS_DE = [[3, 'Élite'], [5, 'Légendaire'], [7, 'Mythique'], [9, 'Ascendant'], [10, 'Ascendant ★'], [11, 'Ascendant ★★'], [12, 'Ascendant ★★★'], [13, 'Ascendant ★★★★'], [14, 'Ascendant ★★★★★']];
const avBonusMax = a => AV_BONUS_MAX + AV_PALIERS_DE.filter(([r]) => (typeof niveauHeros === 'function' ? niveauHeros(a.id) : 0) >= r).length;
function avNormalise(a) { if (!a.bonus) { a.bonus = (a.faces || [1, 2, 3, 4, 5, 6]).map((v, k) => Math.max(0, Math.min(AV_BONUS_MAX, v - (k + 1)))); a.faces = [1, 2, 3, 4, 5, 6]; } return a; }
function avLire() { try { return JSON.parse(localStorage.getItem(AV_CLE) || '[]').map(avNormalise); } catch (e) { return []; } }
function avEcrire(l) { try { localStorage.setItem(AV_CLE, JSON.stringify(l)); } catch (e) {} }
const avTrouve = id => avLire().find(a => a.id === id);
const avNiv = a => (typeof niveauH === 'function' ? niveauH(a.id) : 1) || 1; // le niveau du héros (Mes héros)
const avPointsForge = a => Math.max(0, Math.floor(avNiv(a) / 5) - (a.bonus || []).reduce((t, v) => t + v, 0));
function avNiveau(xp) { let n = 1; while (n < AV_MAX && xp >= AV_SEUILS[n + 1]) n++; return n; }
function avCreer(o) {
  const a = { id:'av' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), voie:o.voie, nom:String(o.nom || '').slice(0, 20) || 'Sans-nom', genre:o.genre === 'f' ? 'f' : 'h',
    couleur:o.couleur || AV_COULEURS[0], xp:0, faces:[1, 2, 3, 4, 5, 6], bonus:[0, 0, 0, 0, 0, 0], points:0, parties:0, victoires:0, cree:Date.now() };
  const l = avLire(); l.push(a); avEcrire(l); return a;
}
function avSupprime(id) { avEcrire(avLire().filter(a => a.id !== id)); }
function avMaj(id, f) { const l = avLire(), a = l.find(x => x.id === id); if (!a) return null; f(a); avEcrire(l); return a; }
// XP gagnée à la fin d'une aventure ; renvoie les niveaux gagnés
function avGagneXP(id, xp, gagne) {
  let gain = 0;
  avMaj(id, a => { const avant = avNiveau(a.xp); a.xp += xp; a.parties++; if (gagne) a.victoires++; gain = avNiveau(a.xp) - avant; a.points += gain; });
  return gain;
}
// forger une face : +1 (jusqu'à 6), un point de forge
function avForge(id, k) { let ok = false; avMaj(id, a => { if (avPointsForge(a) < 1 || a.bonus[k] >= avBonusMax(a)) return; a.bonus[k]++; ok = true; }); return ok; }
// ce que le héros apporte en jeu
function avStats(a) {
  const n = avNiv(a), base = { maelle:15, aldric:16, pip:12, oria:15, gorm:16, zephine:15 }[a.voie] || 15, paliers = [5, 10, 20, 35, 50].filter(x => n >= x).length;
  return { niveau:n, pv:base + 2 * paliers, /* 19/11 : Robuste est devenu un Passif, compté par les Chroniques */ desPlus:n >= 10 ? 1 : 0, faces:[1, 2, 3, 4, 5, 6], bonus:(a.bonus || [0, 0, 0, 0, 0, 0]).slice(), talents:avTalents(a) };
}
// le portrait : ceux de la galerie (Gemini) s'ils existent, sinon le héros modèle de la voie
const avPortrait = a => `portraits/av-${a.voie}-${a.genre}.webp`;
const avPortraitSecours = a => `portraits/${a.voie}.webp`;
const avTitre = a => VOIES[a.voie] ? VOIES[a.voie][a.genre] : '';

// =============================================================================================== L'ÉQUIPEMENT ET LA PROGRESSION (15/11 ~17 h 30 : système commun)
// Depuis l'unification, l'équipement, le niveau, le rang et l'or sont dans heros-etoiles.js (le SYSTÈME DES HÉROS, commun à tous).
// heros-etoiles.js doit être chargé AVANT ce fichier. Les anciens noms restent pour les modes qui les appellent.
function avEquipement(a) { return equipementDe(a.id); }
function avEquipe(idH, pid) { return equipePiece(idH, pid); }
function avRetire(idH, slot) { retirePiece(idH, slot); }
function avAmeliore(pid) { return amelioPiece(pid); }
function avVend(pid) { vendPiece(pid); }
function avBonusEquip(a) { const S = statsHeros(a.id); return { pv:S.pv, att:S.att, def:S.def + S.bouclier, agi:S.agi, des:S.des + S.main }; }
// avStats d'origine (expérience d'aventure : PV, dé, talents) + le système des héros (niveau, rang, équipement)
const avStatsBase = avStats;
avStats = function (a) { const s = avStatsBase(a), b = avBonusEquip(a); return Object.assign(s, { pv:s.pv + b.pv, att:b.att, def:b.def, agi:b.agi, desPlus:s.desPlus + b.des }); };
function avPuissance(a) { return puissanceHeros(a.id, avStatsBase(a).pv) + 25 * (a.bonus || []).reduce((t, v) => t + v, 0); }
