// =============================================================================================== LES HÉROS D'AVENTURE PARTOUT (15/11 soir)
// Demande de l'utilisateur : « retrouver mon personnage personnalisé partout » contre les monstres (le Duel garde les 6 héros de base).
// Petit fichier SANS dépendance (il ne charge pas aventuriers.js, dont les noms gênent certains modes) : il lit la liste des héros
// d'aventure créés dans la Forge des héros (même clé 'guilde-aventuriers') et donne de quoi les proposer dans chaque mode.
// Règle commune à tous les modes :
//   - le choix d'un héros d'aventure s'écrit 'av:<son id>' ; un héros de base garde son id (maelle, gorm…) ;
//   - le MOTEUR joue la VOIE du héros (haVoie) : mêmes dés, même pouvoir, mêmes règles que le héros de base ;
//   - la PROGRESSION (bonus, éclats, butin) va à son id à lui (haProg) ;
//   - l'AFFICHAGE (portrait, nom) est le sien (haInfo) ;
//   - s'il a été supprimé entre-temps, on retombe sur le héros de base de sa voie.
const HA_CLE = 'guilde-aventuriers';
const HA_TITRES = {
  maelle:['le Forgeron', 'la Forgeronne'], aldric:['le Chevalier', 'la Chevalière'], pip:['le Druide', 'la Druidesse'],
  oria:['le Cartographe', 'la Cartographe'], gorm:['le Sonneur de cor', 'la Sonneuse de cor'], zephine:['le Tempétueux', 'la Tempétueuse'],
};
function haListe() { try { return JSON.parse(localStorage.getItem(HA_CLE) || '[]').filter(a => a && a.id && HA_TITRES[a.voie]); } catch (e) { return []; } }
const haTrouve = id => id ? haListe().find(a => a.id === id) || null : null;
const haEst = k => typeof k === 'string' && k.startsWith('av:');
const haTitre = a => (HA_TITRES[a.voie] || ['', ''])[a.genre === 'f' ? 1 : 0];
const haEsc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
// la fiche d'affichage d'un héros d'aventure (ou null si ce n'est pas un héros d'aventure, ou s'il a été supprimé)
function haInfo(k) {
  const id = haEst(k) ? k.slice(3) : (typeof k === 'string' && k.startsWith('av') ? k : null);
  const a = haTrouve(id); if (!a) return null;
  return { cle:'av:' + a.id, id:a.id, av:a.id, voie:a.voie, nom:a.nom, genre:a.genre === 'f' ? 'f' : 'h', titre:haTitre(a), couleur:a.couleur || '#f3c96b',
    img:a.img ? `portraits/${a.img}.webp?v=1` : `portraits/av-${a.voie}-${a.genre === 'f' ? 'f' : 'h'}.webp`, sec:`portraits/${a.voie}.webp` };
}
// la VOIE jouée par le moteur ; un héros d'aventure disparu → défaut
const haVoie = (k, defaut = 'maelle') => haEst(k) ? (haInfo(k) ? haInfo(k).voie : defaut) : (k || defaut);
// l'id de PROGRESSION (heros-etoiles.js) : celui du héros d'aventure, sinon celui du héros de base
const haProg = k => { const i = haInfo(k); return i ? i.id : haVoie(k); };
// un choix gardé qui ne vaut plus rien (héros supprimé, Zéphine verrouillée) → le défaut
function haValide(k, zephOk, defaut = 'maelle') {
  if (haEst(k)) { const i = haInfo(k); if (!i) return defaut; return i.voie === 'zephine' && !zephOk ? defaut : k; }
  return k === 'zephine' && !zephOk ? defaut : (k || defaut);
}
// une image de portrait qui retombe sur le héros de base de la voie si la galerie n'a pas encore l'image
const haImg = (i, style = '') => `<img src="${i.img}" onerror="this.onerror=null;this.src='${i.sec}'" alt=""${style ? ` style="${style}"` : ''}>`;
// les boutons du choix du héros : un par héros d'aventure, à mettre APRÈS les 6 héros de base.
// clic(cle) renvoie le code du onclick ; avec bord:true, la couleur du héros entoure son portrait
function haBoutons(choix, clic, zephOk, o = {}) {
  return haListe().map(a => {
    const i = haInfo('av:' + a.id), verrou = i.voie === 'zephine' && !zephOk;
    return `<button class="${choix === i.cle ? (o.on || 'on') : ''} ha" ${verrou ? 'disabled' : ''} onclick="${clic(i.cle)}">${haImg(i, o.imgStyle || `box-shadow:0 0 0 2px ${i.couleur}`)}${haEsc(i.nom)}<small class="ha-t">⚔ ${haEsc(i.titre)}</small>${verrou ? '<br>🔒 tutoriel' : ''}</button>`;
  }).join('');
}
// la petite étiquette sous le nom (style commun)
(function () {
  if (typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.textContent = `.ha-t { display:block; font-size:.78em; color:#c9b27a; font-weight:normal; margin-top:.2em; line-height:1.15; }`;
  document.head.appendChild(st);
})();
// heros-etoiles.js (nomHeros) cherche le nom d'un héros d'aventure avec avTrouve : on le prête si aventuriers.js n'est pas chargé
if (typeof avTrouve === 'undefined' && typeof window !== 'undefined') window.avTrouve = id => haTrouve(id);
