// =============================================================================================== LE SYSTÈME DES HÉROS (unifié le 15/11 ~17 h 30)
// Demande de l'utilisateur : « fais l'unification, je veux un vrai système de héros » (façon AFK Arena / AFK Journey).
// UN SEUL système pour TOUS les héros : les 6 héros de la Guilde ET les héros d'aventure de la Forge.
//   • NIVEAU (1 → plafond du rang) : acheté avec de l'OR 🪙 et de la POUSSIÈRE DE RUNE 🔹 (gagnées dans tous les modes + la récolte du campement).
//   • RANG (Commun → Rare → Élite → Légendaire → Mythique → Ascendant → Ascendant ★★★★★) : monté avec les ÉCLATS du héros (ses « doubles »),
//     gagnés en jouant avec lui ; les éclats de Guilde 💠 vont sur le héros de son choix. Chaque rang relève le plafond de niveau et donne un bonus.
//   • ÉQUIPEMENT : 6 cases (arme, casque, anneau, armure, bottes, talisman), 5 raretés ; on AMÉLIORE une pièce avec de l'or ;
//     3 pièces de la même case et de la même rareté FUSIONNENT en une pièce de la rareté au-dessus. Un seul coffre pour tous les héros.
//   • RELIQUES (l'ancienne armurerie de l'Odyssée, fusion ★ → ★★★) : 3 cases, gardées telles quelles.
// La puissance gagnée ne joue QUE contre les monstres : le Duel de l'Arène reste équitable. Tout reste sur le téléphone.
const ETOILES_CLE = 'guilde-etoiles';
const RANGS = [
  { n:'Commun', c:'#a8a2c8', max:20 }, { n:'Rare', c:'#4f8bff', max:40 }, { n:'Rare +', c:'#4f8bff', max:60 },
  { n:'Élite', c:'#c084fc', max:80 }, { n:'Élite +', c:'#c084fc', max:100 }, { n:'Légendaire', c:'#f3c96b', max:120 },
  { n:'Légendaire +', c:'#f3c96b', max:140 }, { n:'Mythique', c:'#ff5a5a', max:160 }, { n:'Mythique +', c:'#ff5a5a', max:180 },
  { n:'Ascendant', c:'#ffffff', max:200 }, { n:'Ascendant ★', c:'#ffffff', max:210 }, { n:'Ascendant ★★', c:'#ffffff', max:220 },
  { n:'Ascendant ★★★', c:'#ffffff', max:230 }, { n:'Ascendant ★★★★', c:'#ffffff', max:240 }, { n:'Ascendant ★★★★★', c:'#ffffff', max:250 } ];
const RANGH_MAX = RANGS.length - 1;
const NIVEAUX_H = RANGS.map(r => r.n);  // (ancien nom, gardé pour les modes qui l'affichent)
const COUT_NIV = [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 100, 120, 150, 180]; // éclats pour passer du rang r au rang r+1
// les bonus de rang (cumulés) : [rang, icône, texte]
const BONUS_RANG = [[1, '❤', '+6 PV'], [3, '🛡', 'Bouclier 2 au début de chaque combat'], [5, '◆', '+1 PC au début de chaque combat'],
  [7, '❤', '+10 PV de plus'], [9, '🎲', 'une relance gratuite de plus à chaque tour'], [12, '🂠', 'une carte (ou un dé) de plus au début de chaque combat'],
  [14, '⚔', '+1 Attaque et bouclier +2']];
const BONUS_NIVH = [null].concat(BONUS_RANG.map(b => [b[1], b[2]])); // (ancien nom)
// ce que rapporte chaque moment fort (appelé par guildeEvt de rang.js) : éclats au héros joué, or et poussière pour tous
const ECLATS_EVT = { duel_gagne:2, elite:2, boss:5, escale:1, titan:5, etage:3, tour_etage:2 };
const GAINS_EVT = { duel_gagne:[15, 8], elite:[20, 10], boss:[50, 25], escale:[8, 4], titan:[50, 25], etage:[25, 12], tour_etage:[20, 10], salle:[4, 2], defense_vague:[5, 3] };
const ECLATS_QUETE = { jour:3, semaine:10 }, ECLATS_RANG = 5;
// la force des reliques selon leur niveau (★, ★★, ★★★)
const EQUIP_VAL = { hache:[2, 3, 4], lame:[10, 15, 20], arc:[5, 8, 11], marteau:[1, 1, 2], cuir:[4, 6, 8], cape:[6, 9, 12], cotte:[7, 10, 13], heaume:[12, 18, 24], trefle:[1, 1, 2], bourse:[12, 18, 24], griffe:[4, 6, 8], anneau:[1, 1, 2] };

function lireEtoiles() { let d; try { d = Object.assign({ heros:{}, libres:0, armurerie:{}, equip:{}, poussiere:0 }, JSON.parse(localStorage.getItem(ETOILES_CLE) || '{}')); } catch (e) { d = { heros:{}, libres:0, armurerie:{}, equip:{}, poussiere:0 }; }
  if (!d.v2) migreV2(d); return d; }
function ecrireEtoiles(d) { localStorage.setItem(ETOILES_CLE, JSON.stringify(d)); }
const etatHerosE = (d, id) => { const h = d.heros[id] = d.heros[id] || { e:0, n:0 }; if (h.rang == null) h.rang = 0; if (!h.niv) h.niv = 1; if (!h.gear) h.gear = {}; return h; };
// une seule fois : les anciennes étoiles (0-6) deviennent des rangs ; l'équipement des héros d'aventure passe dans le système commun
function migreV2(d) {
  Object.values(d.heros).forEach(h => { if (h.rang == null) h.rang = [0, 2, 4, 6, 7, 8, 9][h.n || 0] || 0; if (!h.niv) h.niv = 1; if (!h.gear) h.gear = {}; });
  try { (JSON.parse(localStorage.getItem('guilde-aventuriers') || '[]')).forEach(a => { const h = etatHerosE(d, a.id); if (a.equip) Object.entries(a.equip).forEach(([k, v]) => { if (v && !h.gear[k]) h.gear[k] = v; }); }); } catch (e) {}
  d.v2 = 1; try { localStorage.setItem(ETOILES_CLE, JSON.stringify(d)); } catch (e) {}
}
const etatH = id => { if (typeof localStorage === 'undefined') return { e:0, rang:0, niv:1, gear:{} }; const h = lireEtoiles().heros[id] || {}; return { e:h.e || 0, rang:h.rang || 0, niv:h.niv || 1, gear:h.gear || {} }; };
const niveauHeros = id => etatH(id).rang;               // (ancien nom : le RANG du héros)
const niveauH = id => etatH(id).niv;
const etoilesTxt = r => r <= 0 ? '' : RANGS[r].n;
const herosConnu = id => (typeof HEROS !== 'undefined' && HEROS[id] && !HEROS[id].monstre) || String(id).startsWith('av');
const nomHeros = id => { if (typeof HEROS !== 'undefined' && HEROS[id]) return HEROS[id].nom; if (typeof avTrouve === 'function') { const a = avTrouve(id); if (a) return a.nom; } return id; };
function donneEclats(id, n, silence) {
  if (typeof localStorage === 'undefined' || !n || !herosConnu(id)) return;
  const d = lireEtoiles(); etatHerosE(d, id).e += n; ecrireEtoiles(d);
  if (!silence && typeof annonceRang === 'function') annonceRang(`✨ +${n} éclat${n > 1 ? 's' : ''} de ${nomHeros(id)}`);
}
function donneLibres(n) { if (typeof localStorage === 'undefined' || !n) return; const d = lireEtoiles(); d.libres += n; ecrireEtoiles(d); if (typeof annonceRang === 'function') annonceRang(`💠 +${n} éclats de Guilde`); }
function verseLibres(id, n) { const d = lireEtoiles(); n = Math.min(n, d.libres); if (n <= 0) return false; d.libres -= n; etatHerosE(d, id).e += n; ecrireEtoiles(d); return true; }
// le rang
// 15/11 soir (l'utilisateur : « caper le rang en fonction du niveau, sinon je peux être Ascendant et niveau 1 ») : chaque rang demande un NIVEAU minimum
// (index = le rang visé). Rare 10, Rare + 20, Élite 30, Élite + 40, Légendaire 60, Légendaire + 80, Mythique 100, Mythique + 120, Ascendant 140, puis 160, 180, 200, 215, 230.
// Un héros déjà plus haut garde son rang (rien n'est retiré) ; il ne monte plus tant qu'il n'a pas le niveau.
const NIV_RANG = [0, 10, 20, 30, 40, 60, 80, 100, 120, 140, 160, 180, 200, 215, 230];
const nivPourRang = r => NIV_RANG[Math.min(r, NIV_RANG.length - 1)] || 0;
function peutPromouvoir(id) { const h = etatH(id); return h.rang < RANGH_MAX && h.e >= COUT_NIV[h.rang] && (h.niv || 1) >= nivPourRang(h.rang + 1); }
function promouvoir(id) { const d = lireEtoiles(), h = etatHerosE(d, id); if (h.rang >= RANGH_MAX || h.e < COUT_NIV[h.rang] || (h.niv || 1) < nivPourRang(h.rang + 1)) return false; h.e -= COUT_NIV[h.rang]; h.rang++; h.n = Math.min(6, (h.n || 0) + 1); ecrireEtoiles(d); return true; }
// 21/11 (décision de l'utilisateur : « les rangs montent trop vite, les niveaux trop lentement ; la conversion, j'aime bien ») :
// les éclats EN TROP (au-delà de ce que demande le prochain rang) se changent en poussière de rune, 1 éclat = 2 poussière
const ECLAT_POU = 2;
const eclatsEnTrop = id => { const h = etatH(id); return h.rang >= RANGH_MAX ? h.e : Math.max(0, h.e - COUT_NIV[h.rang]); };
function convertitEclats(id, n) { const d = lireEtoiles(), h = etatHerosE(d, id); n = Math.min(n || eclatsEnTrop(id), eclatsEnTrop(id)); if (n <= 0) return 0;
  h.e -= n; d.poussiere = (d.poussiere || 0) + n * ECLAT_POU; ecrireEtoiles(d); return n * ECLAT_POU; }
// l'or (commun à tous, même coffre que la Forge) et la poussière de rune
const AV_SAC_CLE = 'guilde-aventuriers-sac';
function avSac() { try { return Object.assign({ or:0, pieces:[] }, JSON.parse(localStorage.getItem(AV_SAC_CLE) || '{}')); } catch (e) { return { or:0, pieces:[] }; } }
function avSacEcrire(s) { try { localStorage.setItem(AV_SAC_CLE, JSON.stringify(s)); } catch (e) {} }
const poussiereH = () => lireEtoiles().poussiere || 0;
function donneRessources(or, pou, silence) {
  if (typeof localStorage === 'undefined' || (!or && !pou)) return;
  if (or) { const s = avSac(); s.or += or; avSacEcrire(s); }
  if (pou) { const d = lireEtoiles(); d.poussiere = (d.poussiere || 0) + pou; ecrireEtoiles(d); }
  if (!silence && typeof annonceRang === 'function') annonceRang(`${or ? `🪙 +${or}` : ''}${or && pou ? ' · ' : ''}${pou ? `🔹 +${pou}` : ''}`);
}
// le niveau : coût pour passer de n à n+1
const coutNiveau = n => ({ or:10 + 6 * n, pou:5 + 3 * n });
function peutMonterNiveau(id) { const h = etatH(id); if (h.niv >= RANGS[h.rang].max) return 'plafond'; const c = coutNiveau(h.niv); return avSac().or >= c.or && poussiereH() >= c.pou ? 'ok' : 'cher'; }
function monteNiveau(id, fois = 1) {
  let fait = 0;
  for (let k = 0; k < fois; k++) {
    const d = lireEtoiles(), h = etatHerosE(d, id); if (h.niv >= RANGS[h.rang].max) break;
    const c = coutNiveau(h.niv), s = avSac(); if (s.or < c.or || (d.poussiere || 0) < c.pou) break;
    s.or -= c.or; avSacEcrire(s); d.poussiere -= c.pou; h.niv++; ecrireEtoiles(d); fait++;
  }
  return fait;
}
// la récolte du campement (comme les jeux de héros : elle s'accumule pendant qu'on n'est pas là, 12 h au plus)
// 19/11 : la récolte est fondue dans le BUTIN DU CAMPEMENT du menu (rang.js) : un seul compteur, un seul endroit
function recolteDispo() { const g = typeof butinCalcule === 'function' ? butinCalcule() : { h:0, or:0, pou:0 }; return { h:g.h, or:g.or, pou:g.pou }; }
function recolter() { return typeof butinRamasse === 'function' ? butinRamasse() : { or:0, pou:0 }; }

// ----------------------------------------------------------------------------------------------- l'équipement (6 cases, 5 raretés, amélioration, fusion)
const EQ_CASES = [
  { k:'arme', e:'🗡', n:'Arme', st:'att', noms:['Épée courte', 'Hache de guerre', 'Bâton noueux', 'Arc de frêne', 'Dague rapide', 'Masse d’armes'] },
  { k:'tete', e:'⛑', n:'Casque', st:'def', noms:['Casque de cuir', 'Heaume de fer', 'Capuche du rôdeur', 'Couronne de lierre'] },
  { k:'anneau', e:'💍', n:'Anneau', st:'att', niv:10, noms:['Anneau de cuivre', 'Bague du chasseur', 'Anneau des braises'] },
  { k:'torse', e:'🥋', n:'Armure', st:'pv', noms:['Gilet matelassé', 'Cotte de mailles', 'Cuirasse runique', 'Manteau du voyageur'] },
  { k:'pieds', e:'🥾', n:'Bottes', st:'agi', noms:['Bottes de marche', 'Bottes de vent', 'Sandales du pèlerin'] },
  { k:'talisman', e:'🧿', n:'Talisman', st:'pv', niv:25, noms:['Talisman de pierre', 'Amulette de la lune', 'Œil de la Guilde'] },
];
const EQ_RARE = [{ n:'commune', c:'#c9c1ea' }, { n:'rare', c:'#4f8bff' }, { n:'épique', c:'#c084fc' }, { n:'légendaire', c:'#f3c96b' }, { n:'mythique', c:'#ff5a5a' }];
const EQ_ST = { pv:['❤', 'PV'], att:['⚔', 'Attaque'], def:['🛡', 'Défense'], agi:['🥾', 'Agilité'], des:['🎲', 'dé de plus'] };
const eqNivMax = p => 5 * ((p.r || 0) + 1);
const EQ_NIV_MAX = 25;
function eqValeur(st, r, niv) {
  if (st === 'pv') return 2 + 2 * niv + 3 * r;
  if (st === 'def') return 1 + Math.floor((niv - 1) / 4) + (r >= 2 ? 1 : 0) + (r >= 4 ? 1 : 0);
  if (st === 'att') return 1 + (niv >= 6 ? 1 : 0) + (niv >= 16 ? 1 : 0) + (r >= 2 ? 1 : 0) + (r >= 4 ? 1 : 0);
  if (st === 'agi') return 1 + (niv >= 10 ? 1 : 0) + (r >= 3 ? 1 : 0);
  if (st === 'des') return 1;
  return 0;
}
function eqStats(p) {
  const C = EQ_CASES.find(c => c.k === p.slot), s = {}; if (!C) return s;
  s[C.st] = eqValeur(C.st, p.r, p.niv);
  if (p.slot === 'talisman' && p.r >= 2) s.des = 1;
  if (p.r >= 1 && C.st !== 'pv') s.pv = (s.pv || 0) + 2 * p.r + Math.floor(p.niv / 3);
  return s;
}
const eqTexte = p => Object.entries(eqStats(p)).map(([k, v]) => `${EQ_ST[k][0]} ${k === 'des' ? '+1 dé' : '+' + v + ' ' + EQ_ST[k][1]}`).join(' · ');
const eqPrixAmelio = p => 12 * p.niv * (1 + p.r);
const eqPrixVente = p => 8 * (1 + p.r) * p.niv; // 21/11 : 5 → 8 (« on ne gagne pas assez d'or »)
const eqPoussiereRecyclage = p => 5 * (1 + p.r) * p.niv; // 21/11 : recycler une pièce = de la poussière de rune
function eqNouvelle(slot, r) {
  const C = slot ? EQ_CASES.find(c => c.k === slot) : EQ_CASES[Math.floor(Math.random() * EQ_CASES.length)];
  if (r == null) { const x = Math.random(); r = x < .1 ? 2 : x < .4 ? 1 : 0; }
  return { id:'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), slot:C.k, nom:C.noms[Math.floor(Math.random() * C.noms.length)], r, niv:1 };
}
// gagner de l'or et des pièces (fin de scénario, fouille, boss) ; renvoie les pièces gagnées
function avGagne(or, n, meilleure) {
  const s = avSac(), gains = [];
  s.or += or || 0;
  for (let i = 0; i < (n || 0); i++) { const x = Math.random(), p = eqNouvelle(null, meilleure ? (x < .2 ? 2 : x < .6 ? 1 : 0) : null); s.pieces.push(p); gains.push(p); }
  avSacEcrire(s); return gains;
}
// qui porte une pièce ?
function porteurDe(pid) { const d = lireEtoiles(); return Object.keys(d.heros).find(id => Object.values(d.heros[id].gear || {}).includes(pid)) || null; }
// 16/11 soir (choix de l'utilisateur, comme AFK Journey) : l'amélioration reste sur la CASE du héros. Changer de pièce ne fait rien perdre :
// la pièce portée prend le niveau de la case (au plus le maximum de sa rareté) ; une pièce qui quitte la case lui laisse son niveau.
const lvCase = (id, k) => { try { const h = lireEtoiles().heros[id]; return (h && h.lv && h.lv[k]) || 0; } catch (e) { return 0; } };
const nivPorte = (id, p) => Math.min(eqNivMax(p), Math.max(p.niv, lvCase(id, p.slot)));
function equipementDe(id) { const s = avSac(), g = etatH(id).gear, E = {}; EQ_CASES.forEach(c => { const p = g[c.k] ? s.pieces.find(x => x.id === g[c.k]) || null : null; E[c.k] = p ? Object.assign({}, p, { niv:nivPorte(id, p) }) : null; }); return E; }
// une pièce quitte la case d'un héros : la case garde le niveau atteint, la pièce repart au niveau 1
function laisseNiveau(d, s, hid, slot) { const h = d.heros[hid]; if (!h || !h.gear || !h.gear[slot]) return; const p = s.pieces.find(x => x.id === h.gear[slot]); if (!p) return;
  h.lv = h.lv || {}; h.lv[slot] = Math.max(h.lv[slot] || 0, p.niv); p.niv = 1; }
function equipePiece(id, pid) {
  const s = avSac(), p = s.pieces.find(x => x.id === pid); if (!p) return 'Pièce introuvable.';
  const C = EQ_CASES.find(c => c.k === p.slot); if (C.niv && niveauH(id) < C.niv) return `Cette case s’ouvre au niveau ${C.niv}.`;
  const d = lireEtoiles(); Object.keys(d.heros).forEach(hid => { const h = d.heros[hid]; if (h.gear) Object.keys(h.gear).forEach(k => { if (h.gear[k] === pid) { laisseNiveau(d, s, hid, k); h.gear[k] = null; } }); });
  laisseNiveau(d, s, id, p.slot); etatHerosE(d, id).gear[p.slot] = pid; avSacEcrire(s); ecrireEtoiles(d); return 'ok';
}
function retirePiece(id, slot) { const d = lireEtoiles(), s = avSac(); laisseNiveau(d, s, id, slot); etatHerosE(d, id).gear[slot] = null; avSacEcrire(s); ecrireEtoiles(d); }
function amelioPiece(pid) {
  const s = avSac(), p = s.pieces.find(x => x.id === pid); if (!p) return 'Pièce introuvable.';
  const qui = porteurDe(pid), n = qui ? nivPorte(qui, p) : p.niv; // portée : c'est la CASE du héros qui monte
  if (n >= eqNivMax(p)) return 'Niveau maximum pour cette rareté : fusionne-la pour monter plus haut.'; const c = eqPrixAmelio(Object.assign({}, p, { niv:n })); if (s.or < c) return `Il faut ${c} pièces d’or.`;
  s.or -= c; p.niv = n + 1; avSacEcrire(s);
  if (qui) { const d = lireEtoiles(), h = etatHerosE(d, qui); h.lv = h.lv || {}; h.lv[p.slot] = Math.max(h.lv[p.slot] || 0, n + 1); ecrireEtoiles(d); }
  return 'ok';
}
function recyclePiece(pid) {
  const s = avSac(), i = s.pieces.findIndex(x => x.id === pid); if (i < 0) return 0; const p = s.pieces[i];
  const d = lireEtoiles(), v = eqPoussiereRecyclage(p); Object.keys(d.heros).forEach(hid => { const h = d.heros[hid]; if (h.gear && h.gear[p.slot] === pid) { laisseNiveau(d, s, hid, p.slot); h.gear[p.slot] = null; } });
  s.pieces.splice(i, 1); d.poussiere = (d.poussiere || 0) + v; avSacEcrire(s); ecrireEtoiles(d); return v;
}
function vendPiece(pid) {
  const s = avSac(), i = s.pieces.findIndex(x => x.id === pid); if (i < 0) return; const p = s.pieces[i];
  const d = lireEtoiles(), v = eqPrixVente(p); Object.keys(d.heros).forEach(hid => { const h = d.heros[hid]; if (h.gear && h.gear[p.slot] === pid) { laisseNiveau(d, s, hid, p.slot); h.gear[p.slot] = null; } }); // vendre une pièce portée : la case garde son niveau
  s.or += v; s.pieces.splice(s.pieces.indexOf(p), 1); avSacEcrire(s); ecrireEtoiles(d);
}
// la FUSION : 3 pièces de la même case et de la même rareté → 1 pièce de la rareté au-dessus (elle garde le meilleur niveau ; le porteur la garde)
function groupesFusion() { const G = {}; avSac().pieces.forEach(p => { if (p.r >= EQ_RARE.length - 1) return; const k = p.slot + ':' + p.r; (G[k] = G[k] || []).push(p); }); return Object.values(G).filter(g => g.length >= 3); }
function fusionnePiece(slot, r) {
  const s = avSac(), g = s.pieces.filter(p => p.slot === slot && p.r === r).sort((a, b) => b.niv - a.niv).slice(0, 3); if (g.length < 3 || r >= EQ_RARE.length - 1) return null;
  const d = lireEtoiles(), porteur = Object.keys(d.heros).find(id => g.some(p => (d.heros[id].gear || {})[slot] === p.id));
  const n = { id:'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), slot, nom:g[0].nom, r:r + 1, niv:Math.min(g[0].niv, 5 * (r + 2)) }; if (typeof succesCompte === 'function') succesCompte('forge_fusion'); // 22/11 : succès « Forgeron »
  s.pieces = s.pieces.filter(p => !g.includes(p)); s.pieces.push(n); avSacEcrire(s);
  Object.values(d.heros).forEach(h => { if (h.gear && g.some(p => h.gear[slot] === p.id)) h.gear[slot] = null; });
  // 22/11 (l'utilisateur : « au lieu de l'équiper directement, une validation : voulez-vous l'équiper maintenant ? ») : on garde le niveau de la case,
  // mais la nouvelle pièce n'est PAS équipée ; l'écran le propose à l'ancien porteur (n.porteur)
  if (porteur) { const h = d.heros[porteur]; h.lv = h.lv || {}; h.lv[slot] = Math.max(h.lv[slot] || 0, ...g.map(p => p.niv)); n.porteur = porteur; } ecrireEtoiles(d); return n;
}
// le forgeron : 3 pièces par jour.
// 15/11 soir (l'utilisateur : « le forgeron donne en fonction du niveau ? à Élite + et niveau 50, des équipements en fonction ? ») :
// ses pièces SUIVENT LE HÉROS dont on ouvre la fiche : la rareté avec son RANG, le niveau de la pièce avec son NIVEAU, le prix avec les deux.
//   rang Commun à Rare + → commune, rare, rare (ou épique) ; Élite / Élite + → rare, épique, épique (ou légendaire) ; Légendaire → épique… ; Mythique et plus → légendaire…
//   niveau de la pièce = niveau du héros ÷ 5 (au plus le maximum de sa rareté) : un héros niveau 50 trouve des pièces niveau 10.
const FORGE_PRIX = [25, 60, 110, 200, 350];
function forgeronStock(hid) {
  const H = hid ? etatH(hid) : { rang:0, niv:1 }, base = H.rang >= 7 ? 3 : H.rang >= 5 ? 2 : H.rang >= 3 ? 1 : 0;
  const j = new Date().toISOString().slice(0, 10); let h = 0; for (const ch of j + (hid || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const R = () => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return h / 4294967296; };
  const cases = EQ_CASES.map(c => [R(), c]).sort((a, b) => a[0] - b[0]).map(x => x[1]); // 23/11 (testeurs : « deux fois la même bague ») : 3 cases différentes
  return [0, 1, 2].map(i => { const C = cases[i % cases.length], r = Math.min(EQ_RARE.length - 1, i === 2 ? base + (R() < .35 ? 2 : 1) : base + i); // 1re : sa rareté, 2e : celle au-dessus, 3e : au-dessus ou deux au-dessus
    const niv = Math.max(1, Math.min(5 * (r + 1), Math.floor((H.niv || 1) / 5)));
    return { id:'f' + j + (hid || '') + i, slot:C.k, nom:C.noms[Math.floor(R() * C.noms.length)], r, niv, prix:FORGE_PRIX[r] + 4 * (niv - 1) * (1 + r) }; });
}
function forgeronAchete(i, hid) {
  const s = avSac(), x = forgeronStock(hid)[i]; let deja = {}; try { deja = JSON.parse(localStorage.getItem('guilde-forgeron-achats') || '{}'); } catch (e) {}
  if (!x || deja[x.id]) return 'Déjà acheté.'; if (s.or < x.prix) return `Il faut ${x.prix} pièces d’or.`;
  s.or -= x.prix; const p = Object.assign({}, x, { id:'eq' + Date.now().toString(36) + i }); delete p.prix; s.pieces.push(p); avSacEcrire(s);
  deja[x.id] = 1; try { localStorage.setItem('guilde-forgeron-achats', JSON.stringify(deja)); } catch (e) {} return 'ok';
}

// ----------------------------------------------------------------------------------------------- les caractéristiques et la puissance
// tout ce que le héros gagne (niveau + rang + équipement), contre les monstres
function statsHeros(id) {
  const h = etatH(id), r = h.rang, n = h.niv, S = { niv:n, rang:r, pv:0, att:0, def:0, agi:0, des:0, bouclier:0, pc:0, relance:0, main:0 };
  S.pv += Math.floor(n / 10);                       // niveau : +1 PV tous les 10 niveaux
  S.att += (n >= 100 ? 1 : 0) + (n >= 200 ? 1 : 0); S.def += (n >= 50 ? 1 : 0) + (n >= 150 ? 1 : 0) + (n >= 250 ? 1 : 0); S.agi += n >= 120 ? 1 : 0;
  if (r >= 1) S.pv += 6; if (r >= 3) S.bouclier += 2; if (r >= 5) S.pc += 1; if (r >= 7) S.pv += 10; if (r >= 9) S.relance += 1; if (r >= 12) S.main += 1; if (r >= 14) { S.att += 1; S.bouclier += 2; }
  if (typeof localStorage !== 'undefined') Object.values(equipementDe(id)).filter(Boolean).forEach(p => Object.entries(eqStats(p)).forEach(([k, v]) => { S[k] += v; }));
  return S;
}
const PV_BASE = { maelle:44, aldric:47, pip:35, oria:44, gorm:47, zephine:44 };
function puissanceHeros(id, pvBase) {
  const S = statsHeros(id), pv = (pvBase || (typeof HEROS !== 'undefined' && HEROS[id] && HEROS[id].pv) || PV_BASE[id] || 15) + S.pv;
  return Math.round(10 * pv + 60 * S.att + 50 * S.def + 40 * S.agi + 120 * (S.des + S.main) + 80 * S.bouclier + 150 * S.pc + 150 * S.relance + 15 * S.niv + 120 * S.rang);
}
// 15/11 soir (choix de l'utilisateur : « les ennemis qui suivent ») : LE FACTEUR DE FORCE. Contre les monstres, les ennemis prennent de la force
// selon ce que le héros a VRAIMENT gagné (PV, bouclier, défense, attaque, dés, relances, PC), ramené à ses PV de base. Ils rattrapent
// SUIVI = 70 % de ce gain : monter son héros reste utile (il garde 30 % d'avance), mais un héros très monté n'écrase plus tout.
// ACTIF dans la Crypte et la Descente (force + sceaux des monstres, réglé au simulateur : héros montés 87-89 %, débutant 82 %).
// PAS dans la Défense (mesuré : la force vient des tours ; monstres ×2 = 0 %). Odyssée et Fosse : prêts (run.fs, J.fs) mais coupés, à mesurer. Jamais en Duel.
const SUIVI = 0.7;
// 22/11 (l'utilisateur : « le mode se met au niveau de l'aventurier choisi ») : les faces FORGÉES du dé (héros d'aventure) comptent aussi, 1,5 par point
const forgeHeros = id => { try { const a = typeof avTrouve === 'function' ? avTrouve(id) : null; return a && a.bonus ? a.bonus.reduce((t, v) => t + (v | 0), 0) : 0; } catch (e) { return 0; } };
function gainHeros(id) { const S = statsHeros(id), base = PV_BASE[id] || 44; return Math.max(0, (S.pv + 1.5 * S.bouclier + 3 * S.def + 4 * S.att + 2 * S.agi + 8 * (S.des + S.main) + 5 * S.relance + 5 * S.pc + 1.5 * forgeHeros(id)) / base); }
function forceSuiveuse(id) { if (typeof localStorage === 'undefined') return 1; try { return Math.round((1 + SUIVI * gainHeros(id)) * 100) / 100; } catch (e) { return 1; } }
// (ancien nom) les bonus contre les monstres, utilisés par l'Odyssée, la Grande aventure, les épreuves…
function bonusHerosPvE(id) { const S = statsHeros(id); return { pv:S.pv, bouclier:S.bouclier + S.def, pc:S.pc, relance:S.relance, main:S.main + S.des, att:S.att, agi:S.agi }; }

// ----------------------------------------------------------------------------------------------- l'armurerie
const niveauEquip = k => { if (typeof localStorage === 'undefined') return 1; const c = lireEtoiles().armurerie[k] || 0; return c >= 5 ? 3 : c >= 3 ? 2 : 1; };
const valEquip = (k, niv) => (EQUIP_VAL[k] || [0, 0, 0])[(niv || niveauEquip(k)) - 1];
// la phrase d'un objet à son niveau (les chiffres changent avec les étoiles)
function descEquip(k, niv) {
  const v = valEquip(k, niv);
  return { hache:`+${v} PC au premier tour de chaque combat.`, lame:`L’ennemi commence chaque combat avec ${v} % de vie en moins.`, arc:`${v} dégâts à l’ennemi avant le premier tour.`,
    marteau:`${v} carte${v > 1 ? 's' : ''} de plus en main au début de chaque combat.`, cuir:`Bouclier ${v} au début de chaque combat.`, cape:`+${v} huile en arrivant sur chaque île.`,
    cotte:`Bouclier ${v} au début de chaque combat.`, heaume:`+${v} PV max tant que tu le portes.`, trefle:`${v} relance${v > 1 ? 's' : ''} gratuite${v > 1 ? 's' : ''} de plus à chaque tour.`,
    bourse:`+${v} or à chaque combat gagné.`, griffe:`Rend ${v} PV après chaque combat gagné.`, anneau:`+${v} PC au début de chaque combat.` }[k] || '';
}
function armurerieAjoute(k, silence) {
  if (typeof localStorage === 'undefined' || !EQUIP[k]) return; const d = lireEtoiles(), avant = niveauEquip(k); d.armurerie[k] = (d.armurerie[k] || 0) + 1; ecrireEtoiles(d);
  const apres = niveauEquip(k); if (!silence && typeof annonceRang === 'function') annonceRang(apres > avant ? `⚒ ${EQUIP[k][2]} fusionne : ${'★'.repeat(apres)} !` : `🎒 ${EQUIP[k][2]} rejoint ton armurerie`, apres > avant);
}
const RELIQUES_PL = { arme:'Relique d’arme', armure:'Relique d’armure', talisman:'Relique-talisman' };
const equipHeros = id => Object.assign({ arme:null, armure:null, talisman:null }, lireEtoiles().equip[id] || {});
function equipeHeros(id, pl, k) { const d = lireEtoiles(); if (k && !d.armurerie[k]) return false; d.equip[id] = Object.assign({ arme:null, armure:null, talisman:null }, d.equip[id] || {}); d.equip[id][pl] = k || null; ecrireEtoiles(d); return true; }
// prochain exemplaire pour la fusion : « 2 / 3 »
function fusionTxt(k) { const c = lireEtoiles().armurerie[k] || 0; return c >= 5 ? '★★★ (au maximum)' : c >= 3 ? `★★ · ${c} / 5 pour ★★★` : `★ · ${c} / 3 pour ★★`; }

// =============================================================================================== 19/11 (décision de l'utilisateur) : REMETTRE UN HÉROS À ZÉRO (comme le « Repos des héros » d'AFK Arena)
// Gratuit, une fois par jour (tous héros confondus). Rendu : 100 % de l'or et de la poussière dépensés en niveaux (calculés exactement avec coutNiveau),
// les éclats dépensés pour les rangs (COUT_NIV) en éclats de Guilde 💠, l'équipement porté au coffre AVEC son niveau (la case ne le garde plus : pas de double),
// les points de pouvoirs (rangs effacés) et de forge du dé. Le héros repart niveau 1, rang Commun. Ce qui ne bouge PAS : les reliques, les éclats
// pas encore dépensés du héros, les trophées, l'XP du rang de la Guilde. Un héros d'aventure garde son nom, son apparence et son histoire ; son Passif repasse à choisir.
const ZERO_CLE = 'guilde-zero-jour';
const jourZero = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const zeroDispo = () => { try { return localStorage.getItem(ZERO_CLE) !== jourZero(); } catch (e) { return false; } };
function bilanZero(id) {
  const d = lireEtoiles(), h = etatHerosE(JSON.parse(JSON.stringify(d)), id), s = avSac(); let or = 0, pou = 0, ec = 0;
  for (let n = 1; n < (h.niv || 1); n++) { const c = coutNiveau(n); or += c.or; pou += c.pou; }
  for (let r = 0; r < (h.rang || 0); r++) ec += COUT_NIV[r] || 0;
  const pieces = EQ_CASES.map(c => { const pid = (h.gear || {})[c.k]; const p = pid && s.pieces.find(x => x.id === pid); return p ? Object.assign({}, p, { niv:Math.min(eqNivMax(p), Math.max(p.niv, ((h.lv || {})[c.k]) || 0)) }) : null; }).filter(Boolean);
  const rangsPw = h.pw && h.pw.rangs ? Object.values(h.pw.rangs).reduce((t, v) => t + (v || 0), 0) : 0;
  const a = typeof avTrouve === 'function' ? avTrouve(id) : null, forge = a && a.bonus ? a.bonus.reduce((t, v) => t + v, 0) : 0;
  return { or, pou, ec, pieces, rangsPw, forge, niv:h.niv || 1, rang:h.rang || 0, rien:!or && !pou && !ec && !pieces.length && !rangsPw && !forge };
}
function remetAZero(id) {
  if (!zeroDispo()) return 'Déjà utilisé aujourd’hui : reviens demain.';
  const B = bilanZero(id); if (B.rien) return 'Ce héros est déjà au départ : rien à rendre.';
  const d = lireEtoiles(), h = etatHerosE(d, id), s = avSac();
  // l'équipement porté : au coffre avec son niveau ; la case oublie ce niveau (sinon la case ET la pièce le garderaient)
  EQ_CASES.forEach(c => { const pid = h.gear[c.k]; const p = pid && s.pieces.find(x => x.id === pid); if (p) { p.niv = Math.min(eqNivMax(p), Math.max(p.niv, (h.lv || {})[c.k] || 0)); if (h.lv) delete h.lv[c.k]; } h.gear[c.k] = null; });
  s.or += B.or; d.poussiere = (d.poussiere || 0) + B.pou; d.libres = (d.libres || 0) + B.ec;
  h.niv = 1; h.rang = 0; h.n = 0;
  if (h.pw) { h.pw.rangs = {}; if (typeof avTrouve === 'function' && avTrouve(id)) { ['groupe', 'solo'].forEach(k => { if (h.pw[k]) delete h.pw[k].passif; }); h.pw.repriseT = 1; } }
  avSacEcrire(s); ecrireEtoiles(d);
  if (typeof avMaj === 'function' && typeof avTrouve === 'function' && avTrouve(id)) avMaj(id, a => { a.bonus = [0, 0, 0, 0, 0, 0]; a.talents = {}; });
  try { localStorage.setItem(ZERO_CLE, jourZero()); } catch (e) {}
  return 'ok';
}
