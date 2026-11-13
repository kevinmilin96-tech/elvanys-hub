// =============================================================================================== LE PANTHÉON DES LÉGENDES (13/11, d'après le livre papier pages 10 et 24)
// Quand un héros termine l'Odyssée (victoire sur l'acte III) : il est inscrit au Tableau d'honneur, reçoit le titre « Briseur de Néant »
// et +5 PV pour toutes ses futures Odyssées ; le Roi sans visage (le « Seigneur du Vide » du livre) devient un adversaire de l'Arène.
// Le défi bonus « Brise-Miroir » (vaincre le Miroir brisé pendant l'Odyssée qu'on termine) fait choisir une récompense permanente.
const PANTHEON_CLE = 'guilde-pantheon';
const RECOMPENSES = {
  neant:    { n:'Bénédiction du Néant', e:'🌑', d:'Tous tes héros commencent chaque Odyssée avec +5 PV.' },
  savoir:   { n:'Savoir ancestral', e:'📜', d:'Ton premier achat chez le marchand de chaque Odyssée coûte 10 or de moins.' },
  maitrise: { n:'Maîtrise des dés', e:'🎲', d:'Au premier combat de chaque Odyssée, tu as 3 relances gratuites de plus.' },
};
function lirePantheon() { try { return Object.assign({ heros:{}, recompenses:[] }, JSON.parse(localStorage.getItem(PANTHEON_CLE) || '{}')); } catch (e) { return { heros:{}, recompenses:[] }; } }
function ecrirePantheon(P) { localStorage.setItem(PANTHEON_CLE, JSON.stringify(P)); }
// inscription au Tableau d'honneur ; renvoie true la première fois pour ce héros
function inscrirePantheon(id, asc) {
  const P = lirePantheon(), deja = P.heros[id];
  P.heros[id] = { quand:(deja && deja.quand) || new Date().toISOString(), fois:((deja && deja.fois) || 0) + 1, ascMax:Math.max(asc || 0, (deja && deja.ascMax) || 0) };
  ecrirePantheon(P); return !deja;
}
const recompensesRestantes = () => Object.keys(RECOMPENSES).filter(k => !lirePantheon().recompenses.includes(k));
function choisirRecompense(k) { const P = lirePantheon(); if (!RECOMPENSES[k] || P.recompenses.includes(k)) return; P.recompenses.push(k); ecrirePantheon(P); }
const aRecompense = k => lirePantheon().recompenses.includes(k);
const roiDebloque = () => Object.keys(lirePantheon().heros).length > 0;
// ce que le Panthéon donne au départ d'une Odyssée
function pantheonDepart(r) {
  if (typeof localStorage === 'undefined') return;
  const P = lirePantheon();
  if (P.heros[r.heros]) { r.pvMax += 5; r.pv += 5; r.journal.push('🏛 Briseur de Néant : +5 PV.'); }
  if (P.recompenses.includes('neant')) { r.pvMax += 5; r.pv += 5; }
  if (P.recompenses.includes('savoir')) r.remise = 10;
  if (P.recompenses.includes('maitrise')) r.maitrise = true;
}
