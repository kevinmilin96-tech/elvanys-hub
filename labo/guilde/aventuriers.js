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
function avChoisitTalent(id, niv, k) { return !!avMaj(id, a => { if (avNiveau(a.xp) < niv) return; a.talents = a.talents || {}; a.talents[niv] = k; }); }

function avLire() { try { return JSON.parse(localStorage.getItem(AV_CLE) || '[]'); } catch (e) { return []; } }
function avEcrire(l) { try { localStorage.setItem(AV_CLE, JSON.stringify(l)); } catch (e) {} }
const avTrouve = id => avLire().find(a => a.id === id);
function avNiveau(xp) { let n = 1; while (n < AV_MAX && xp >= AV_SEUILS[n + 1]) n++; return n; }
function avCreer(o) {
  const a = { id:'av' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), voie:o.voie, nom:String(o.nom || '').slice(0, 20) || 'Sans-nom', genre:o.genre === 'f' ? 'f' : 'h',
    couleur:o.couleur || AV_COULEURS[0], xp:0, faces:[1, 2, 3, 4, 5, 6], points:0, parties:0, victoires:0, cree:Date.now() };
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
function avForge(id, k) { return !!avMaj(id, a => { if (a.points < 1 || a.faces[k] >= 6) return; a.faces[k]++; a.points--; }); }
// ce que le héros apporte en jeu
function avStats(a) {
  const n = avNiveau(a.xp), base = { maelle:15, aldric:16, pip:12, oria:15, gorm:16, zephine:15 }[a.voie] || 15;
  return { niveau:n, pv:base + 2 * (n - 1) + (avTalents(a).includes('robuste') ? 4 : 0), desPlus:n >= 4 ? 1 : 0, faces:a.faces.slice(), talents:avTalents(a) };
}
// le portrait : ceux de la galerie (Gemini) s'ils existent, sinon le héros modèle de la voie
const avPortrait = a => `portraits/av-${a.voie}-${a.genre}.webp`;
const avPortraitSecours = a => `portraits/${a.voie}.webp`;
const avTitre = a => VOIES[a.voie] ? VOIES[a.voie][a.genre] : '';

// =============================================================================================== L'ÉQUIPEMENT DES HÉROS D'AVENTURE (16/11 nuit)
// Demande de l'utilisateur (captures d'AFK Journey) : « une fiche avec les équipements, augmentable, des caractéristiques par équipement ».
// Choix (boîtes) : les héros d'aventure seulement ; on trouve l'équipement en FOUILLANT les meubles, en FIN D'AVENTURE, et chez le FORGERON ;
// on l'AMÉLIORE avec de l'OR gagné en aventure.
// 6 cases : arme, casque, anneau (niveau 3), armure, bottes, talisman (niveau 5). Caractéristiques (elles comptent dans les Chroniques) :
//   ❤ PV · ⚔ Attaque (tes dés comptent + N sur les sceaux « ≥ » et « Σ ») · 🛡 Défense (un bouclier de N au début de chaque tour)
//   🥾 Agilité (+ N cases à chaque déplacement) · 🎲 un dé de plus (talisman épique seulement)
const AV_SAC_CLE = 'guilde-aventuriers-sac';
const EQ_CASES = [
  { k:'arme', e:'🗡', n:'Arme', st:'att', noms:['Épée courte', 'Hache de guerre', 'Bâton noueux', 'Arc de frêne', 'Dague rapide', 'Masse d’armes'] },
  { k:'tete', e:'⛑', n:'Casque', st:'def', noms:['Casque de cuir', 'Heaume de fer', 'Capuche du rôdeur', 'Couronne de lierre'] },
  { k:'anneau', e:'💍', n:'Anneau', st:'att', niv:3, noms:['Anneau de cuivre', 'Bague du chasseur', 'Anneau des braises'] },
  { k:'torse', e:'🥋', n:'Armure', st:'pv', noms:['Gilet matelassé', 'Cotte de mailles', 'Cuirasse runique', 'Manteau du voyageur'] },
  { k:'pieds', e:'🥾', n:'Bottes', st:'agi', noms:['Bottes de marche', 'Bottes de vent', 'Sandales du pèlerin'] },
  { k:'talisman', e:'🧿', n:'Talisman', st:'pv', niv:5, noms:['Talisman de pierre', 'Amulette de la lune', 'Œil de la Guilde'] },
];
const EQ_RARE = [{ n:'commun', c:'#c9c1ea' }, { n:'rare', c:'#4f8bff' }, { n:'épique', c:'#c084fc' }];
const EQ_ST = { pv:['❤', 'PV'], att:['⚔', 'Attaque'], def:['🛡', 'Défense'], agi:['🥾', 'Agilité'], des:['🎲', 'dé de plus'] };
const EQ_NIV_MAX = 5;
// la valeur d'une caractéristique selon la rareté (0-2) et le niveau (1-5)
function eqValeur(st, r, niv) {
  if (st === 'pv') return 2 + 2 * niv + 2 * r;
  if (st === 'def') return 1 + Math.floor((niv - 1) / 2) + (r >= 2 ? 1 : 0);
  if (st === 'att') return 1 + (niv >= 4 ? 1 : 0) + (r >= 2 ? 1 : 0);
  if (st === 'agi') return 1 + (niv >= 5 ? 1 : 0) + (r >= 2 ? 1 : 0);
  if (st === 'des') return 1;
  return 0;
}
// les caractéristiques d'une pièce (des PV en plus pour les pièces rares et épiques)
function eqStats(p) {
  const C = EQ_CASES.find(c => c.k === p.slot), s = {};
  s[C.st] = eqValeur(C.st, p.r, p.niv);
  if (p.slot === 'talisman' && p.r === 2) s.des = 1;
  if (p.r >= 1 && C.st !== 'pv') s.pv = (s.pv || 0) + 2 * p.r + (p.niv >= 3 ? 2 : 0);
  return s;
}
const eqTexte = p => Object.entries(eqStats(p)).map(([k, v]) => `${EQ_ST[k][0]} ${k === 'des' ? '+1 dé' : '+' + v + ' ' + EQ_ST[k][1]}`).join(' · ');
const eqPrixAmelio = p => 12 * p.niv * (1 + p.r);
function avSac() { try { return Object.assign({ or:0, pieces:[] }, JSON.parse(localStorage.getItem(AV_SAC_CLE) || '{}')); } catch (e) { return { or:0, pieces:[] }; } }
function avSacEcrire(s) { try { localStorage.setItem(AV_SAC_CLE, JSON.stringify(s)); } catch (e) {} }
// une nouvelle pièce au hasard (case et rareté au hasard, sauf si on les donne)
function eqNouvelle(slot, r) {
  const C = slot ? EQ_CASES.find(c => c.k === slot) : EQ_CASES[Math.floor(Math.random() * EQ_CASES.length)];
  if (r == null) { const x = Math.random(); r = x < .1 ? 2 : x < .4 ? 1 : 0; }
  return { id:'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), slot:C.k, nom:C.noms[Math.floor(Math.random() * C.noms.length)], r, niv:1 };
}
// gagner de l'or et des pièces (fin de scénario, fouille) ; renvoie les pièces gagnées
function avGagne(or, n, meilleure) {
  const s = avSac(), gains = [];
  s.or += or || 0;
  for (let i = 0; i < (n || 0); i++) { const x = Math.random(), p = eqNouvelle(null, meilleure ? (x < .2 ? 2 : x < .6 ? 1 : 0) : null); s.pieces.push(p); gains.push(p); }
  avSacEcrire(s); return gains;
}
// équiper / retirer / améliorer / vendre
function avEquipe(idH, pid) {
  const s = avSac(), p = s.pieces.find(x => x.id === pid); if (!p) return 'Pièce introuvable.';
  const a = avTrouve(idH), C = EQ_CASES.find(c => c.k === p.slot); if (!a) return 'Héros introuvable.';
  if (C.niv && avNiveau(a.xp) < C.niv) return `Cette case s’ouvre au niveau ${C.niv}.`;
  avLire().forEach(b => { if (b.id !== idH && b.equip && b.equip[p.slot] === pid) avMaj(b.id, x => { x.equip[p.slot] = null; }); }); // une pièce, un seul héros
  avMaj(idH, x => { x.equip = x.equip || {}; x.equip[p.slot] = pid; }); return 'ok';
}
function avRetire(idH, slot) { avMaj(idH, x => { x.equip = x.equip || {}; x.equip[slot] = null; }); }
function avAmeliore(pid) {
  const s = avSac(), p = s.pieces.find(x => x.id === pid); if (!p) return 'Pièce introuvable.';
  if (p.niv >= EQ_NIV_MAX) return 'Niveau maximum.'; const c = eqPrixAmelio(p); if (s.or < c) return `Il faut ${c} pièces d’or.`;
  s.or -= c; p.niv++; avSacEcrire(s); return 'ok';
}
const eqPrixVente = p => 5 * (1 + p.r) * p.niv;
function avVend(pid) {
  const s = avSac(), i = s.pieces.findIndex(x => x.id === pid); if (i < 0) return; const p = s.pieces[i];
  s.or += eqPrixVente(p); s.pieces.splice(i, 1); avSacEcrire(s);
  avLire().forEach(b => { if (b.equip && b.equip[p.slot] === pid) avMaj(b.id, x => { x.equip[p.slot] = null; }); });
}
// l'équipement porté et ses totaux
function avEquipement(a) { const s = avSac(), E = {}; EQ_CASES.forEach(c => { const id = a.equip && a.equip[c.k]; E[c.k] = id ? s.pieces.find(p => p.id === id) || null : null; }); return E; }
function avBonusEquip(a) { const t = { pv:0, att:0, def:0, agi:0, des:0 }; Object.values(avEquipement(a)).filter(Boolean).forEach(p => Object.entries(eqStats(p)).forEach(([k, v]) => { t[k] += v; })); return t; }
// le stock du forgeron : 3 pièces (une commune, une rare, une rare ou épique), qui changent chaque jour
function forgeronStock() {
  const j = new Date().toISOString().slice(0, 10); let h = 0; for (const ch of j) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const R = () => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 4294967296; };
  return [0, 1, 2].map(i => { const C = EQ_CASES[Math.floor(R() * EQ_CASES.length)], r = i === 2 ? (R() < .35 ? 2 : 1) : i; return { id:'f' + j + i, slot:C.k, nom:C.noms[Math.floor(R() * C.noms.length)], r, niv:1, prix:[25, 60, 110][r] }; });
}
function forgeronAchete(i) {
  const s = avSac(), x = forgeronStock()[i]; let deja = {}; try { deja = JSON.parse(localStorage.getItem('guilde-forgeron-achats') || '{}'); } catch (e) {}
  if (!x || deja[x.id]) return 'Déjà acheté.'; if (s.or < x.prix) return `Il faut ${x.prix} pièces d’or.`;
  s.or -= x.prix; const p = Object.assign({}, x, { id:'eq' + Date.now().toString(36) + i }); delete p.prix; s.pieces.push(p); avSacEcrire(s);
  deja[x.id] = 1; try { localStorage.setItem('guilde-forgeron-achats', JSON.stringify(deja)); } catch (e) {} return 'ok';
}
// avStats d'origine + l'équipement
const avStatsBase = avStats;
avStats = function (a) { const s = avStatsBase(a), b = avBonusEquip(a); return Object.assign(s, { pv:s.pv + b.pv, att:b.att, def:b.def, agi:b.agi, desPlus:s.desPlus + b.des }); };
// la PUISSANCE du héros (un seul chiffre, comme dans les jeux de héros)
function avPuissance(a) { const s = avStats(a); return Math.round(10 * s.pv + 60 * s.att + 50 * s.def + 40 * s.agi + 120 * s.desPlus + 30 * s.niveau + 5 * s.faces.reduce((t, v) => t + v, 0)); }
