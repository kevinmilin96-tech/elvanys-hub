// =============================================================================================== LA PROGRESSION DES HÉROS DANS LES NOUVEAUX MODES (15/11)
// Demande de l'utilisateur : « les personnages, les armures… pour que les gens reviennent ». La Crypte et la Fosse lisent ici
// ce que le héros a gagné ailleurs (étoiles et prestige de heros-etoiles.js, équipement de l'armurerie) et le traduisent en bonus simples.
// Et à la victoire, ces modes donnent des éclats (par guildeEvt) et parfois un objet pour l'armurerie.
// Chargé APRÈS heros-etoiles.js. Si heros-etoiles.js manque, tout vaut zéro (les modes marchent quand même).
// Les noms des héros pour heros-etoiles.js (donneEclats en a besoin) quand donnees.js n'est pas chargé :
if (typeof HEROS === 'undefined') {
  window.HEROS = { maelle:{ nom:'Maëlle' }, aldric:{ nom:'Sire Aldric' }, pip:{ nom:'Pip' }, oria:{ nom:'Oria' }, gorm:{ nom:'Gorm' }, zephine:{ nom:'Zéphine' } };
}
const NOMS_EQUIP = { hache:'Hache', lame:'Lame', arc:'Arc', marteau:'Marteau', cuir:'Armure de cuir', cape:'Cape', cotte:'Cotte de mailles', heaume:'Heaume', trefle:'Trèfle', bourse:'Bourse', griffe:'Griffe', anneau:'Anneau' };
// le bonus d'un héros : { pv, bouclier, relance, des, lignes:[texte…] }
function bonusMode(id) {
  const B = { pv:0, bouclier:0, relance:0, des:0, lignes:[] };
  if (typeof bonusHerosPvE !== 'function') return B;
  try {
    const n = niveauHeros(id), b = bonusHerosPvE(id);
    B.pv += b.pv; B.bouclier += b.bouclier; B.relance += b.relance; B.des += b.main;
    if (n > 0) B.lignes.push(`${etoilesTxt(n)} ${NIVEAUX_H[n]}`);
    const E = equipHeros(id);
    Object.values(E).filter(Boolean).forEach(k => {
      const v = valEquip(k);
      if (k === 'heaume') { B.pv += v; B.lignes.push(`${NOMS_EQUIP[k]} +${v} PV`); }
      else if (k === 'cuir' || k === 'cotte') { B.bouclier += v; B.lignes.push(`${NOMS_EQUIP[k]} : bouclier ${v}`); }
      else if (k === 'trefle') { B.relance += v; B.lignes.push(`${NOMS_EQUIP[k]} : +${v} relance`); }
      else B.lignes.push(`${NOMS_EQUIP[k] || k} (sans effet ici)`);
    });
    if (b.pv) B.lignes.push(`+${b.pv} PV (étoiles)`); if (b.bouclier) B.lignes.push(`bouclier ${b.bouclier} (étoiles)`);
    if (b.relance) B.lignes.push('+1 relance (prestige)'); if (b.main) B.lignes.push('+1 dé (prestige)');
  } catch (e) { console.error(e); }
  return B;
}
function texteBonus(id) {
  const B = bonusMode(id);
  const p = [B.pv && `❤ +${B.pv}`, B.bouclier && `🛡 ${B.bouclier}`, B.relance && `🎲 +${B.relance} relance`, B.des && `🎲 +${B.des} dé`].filter(Boolean);
  return p.length ? `Ta progression : ${p.join(' · ')}` : 'Fais monter ton héros (étoiles, équipement) dans la Tour des héros : il sera plus fort ici aussi.';
}
// une récompense d'armurerie à la victoire : sûre avec 3 étoiles, 1 chance sur 4 sinon. Renvoie le nom de l'objet ou null.
function butinArmurerie(etoiles, graine) {
  if (typeof lireEtoiles !== 'function' || typeof EQUIP_VAL === 'undefined') return null;
  const r = Math.abs(Math.sin(graine || Date.now())) % 1;
  if (etoiles < 3 && r > .25) return null;
  const cles = Object.keys(EQUIP_VAL), k = cles[Math.floor((r * 997) % 1 * cles.length)];
  // armurerieAjoute() d'heros-etoiles.js a besoin d'aventure.js (EQUIP) : on écrit ici directement dans l'armurerie (même clé)
  try { const d = lireEtoiles(); d.armurerie[k] = (d.armurerie[k] || 0) + 1; ecrireEtoiles(d); } catch (e) { return null; }
  return NOMS_EQUIP[k] || k;
}
