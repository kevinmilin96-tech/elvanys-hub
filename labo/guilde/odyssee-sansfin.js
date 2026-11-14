// =============================================================================================== L'ODYSSÉE SANS FIN (14/11)
// Règles validées par l'utilisateur (sans-fin-proposition.html) : l'île se construit tuile par tuile, façon Carcassonne / Kingdomino.
// À chaque pas : 3 tuiles visibles, on en choisit une, on la tourne, on la raccorde à une sortie ouverte (les couloirs doivent
// correspondre), le héros y entre (1 huile, comme une case nouvelle). Boss : après 2 fragments, sa tuile est toujours proposée.
// Le reste (combats, salles, reliques, score) est celui de l'Odyssée : la run garde la même forme, avec r.sansfin.
const SF_DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // nord, est, sud, ouest
const SF_FORMES = { droit:[1, 0, 1, 0], virage:[1, 1, 0, 0], te:[1, 1, 0, 1], croix:[1, 1, 1, 1], salle:[0, 0, 1, 0] };
const SF_NOM_FORME = { droit:'couloir droit', virage:'virage', te:'carrefour en T', croix:'grand carrefour', salle:'salle en cul-de-sac' };
// 14/11 (l'utilisateur) : les événements qui dévoilent la carte ne servent à rien quand c'est le joueur qui la construit
const SF_SANS_EVENEMENT = ['cartographe'];
const SF_COURT = { droit:'droit', virage:'virage', te:'T', croix:'carrefour', salle:'impasse' };
const tourne = (o, n) => { let r = o.slice(); for (let i = 0; i < ((n % 4) + 4) % 4; i++) r = [r[3], r[0], r[1], r[2]]; return r; };
// la pioche : 40 tuiles (contenus de l'Odyssée), formes au hasard (les salles fortes plutôt en cul-de-sac ou en T)
function sfSac(R) {
  const contenus = [...Array(12).fill('monstre'), ...Array(3).fill('elite'), ...Array(3).fill('coffre'), ...Array(3).fill('source'), 'marchand', 'marchand', 'marchand', 'feu', 'feu', 'autel',
    ...Array(5).fill('evenement'), 'sac', 'forge', ...Array(6).fill('chemin'),
    'mimique', 'defi', 'tresor', 'fontaine']; // 14/11 : 3 marchands (l'utilisateur avait 400 or sans rien pouvoir acheter) ; 14/11 nuit : les 4 salles rares
  const rg = R.regle; // règle du jour de la partie
  if (rg === 'fievre') for (let i = 0, n = 0; i < contenus.length && n < 2; i++) if (contenus[i] === 'source') { contenus[i] = 'chemin'; n++; }
  if (rg === 'horde') contenus.push(...Array(6).fill('monstre'));
  return brasse(R, contenus).map(t => {
    const r = R(), f = t === 'chemin' ? (r < .35 ? 'droit' : r < .7 ? 'virage' : r < .9 ? 'te' : 'croix')
      : (r < .3 ? 'salle' : r < .55 ? 'te' : r < .8 ? 'virage' : r < .92 ? 'droit' : 'croix');
    return { t, f, id:Math.random().toString(36).slice(2, 8) };
  });
}
function nouvelleSansFin(heros, acte, niveau) {
  const r = nouvelleOdyssee(heros, null, acte, niveau); if (!r) return null;
  // 14/11 (l'utilisateur : « si on décide d'aller complètement à droite, il faut pouvoir, la carte ne doit pas être limitée ») : 31 × 31 cases
  const N = 31; ILE_W = N; ILE_H = N;
  const cases = Array.from({ length:N }, (_, y) => Array.from({ length:N }, (_, x) => ({ x, y, t:'roche', vu:false, visite:false, fait:false })));
  // 14/11 (l'utilisateur : « un T vers le sud ne sert à rien, il faut pouvoir tourner autour comme à Kingdomino ») : on part du CENTRE, sorties dans les 4 directions
  const dep = { x:Math.floor(ILE_W / 2), y:Math.floor(ILE_H / 2) }; Object.assign(cases[dep.y][dep.x], { t:'depart', vu:true, visite:true, ouv:[1, 1, 1, 1], pose:true });
  r.ile = cases; r.pos = { ...dep }; r.porte = null; r.bossPos = null; r.direct = null;
  const regle = regleDuJour();
  r.sansfin = { pioche:[], offre:[], poses:1, elites:0, etage:1, acte1:r.acte, regle:regle.id, primes:primesOffre(r), prime:null, debutEtage:{ victoires:0, poses:1 } };
  r.sansfin.pioche = sfSac(Object.assign(hasard(r), { regle:regle.id }));
  if (regle.id === 'des') r.relanceJour = 1;
  r.journal = [`🧩 Odyssée sans fin sur ${ILES[r.acte].nom} (${HEROS[heros].nom}) : l’île se construit tuile par tuile.`, `${regle.e} Règle du jour : ${regle.n}. ${regle.d}`];
  sfOffre(r); return r;
}
// les tuiles déjà posées sont reliées si leurs sorties se font face
function relies(cases, x, y, a, b) {
  const c = cases[y] && cases[y][x], d = cases[b] && cases[b][a]; if (!c || !d || !c.ouv || !d.ouv) return true;
  const i = SF_DIR.findIndex(([dx, dy]) => dx === a - x && dy === b - y); return i >= 0 && c.ouv[i] && d.ouv[(i + 2) % 4];
}
// 3 tuiles visibles ; dès 2 fragments, la tuile du boss est toujours parmi elles
function sfOffre(r) {
  const S = r.sansfin; while (S.offre.length < (S.regle === 'lanterne' ? 4 : 3)) { if (!S.pioche.length) S.pioche = sfSac(Object.assign(hasard(r), { regle:S.regle })); S.offre.push(S.pioche.shift()); }
  if (r.fragments >= 2 && !S.offre.some(t => t.t === 'boss') && !S.bossFait) S.offre[2] = { t:'boss', f:'salle', id:'boss' };
  // un marchand se présente si on n'en a pas croisé depuis 10 tuiles
  const dernier = S.dernierMarchand || 0; if (S.poses - dernier >= 10 && !S.offre.some(t => t.t === 'marchand')) { S.offre[1] = { t:'marchand', f:'te', id:'m' + S.poses }; S.dernierMarchand = S.poses; }
}
// où cette tuile (tournée de n quarts) peut-elle se poser ? cases vides, raccordées par au moins une sortie, sans contredire une voisine
function sfPlaces(r, tuile, n, libre) {
  const o = tourne(SF_FORMES[tuile.f], n), out = [];
  r.ile.forEach(l => l.forEach(c => {
    if (c.pose) return; let lien = 0, ok = true, voisin = false;
    SF_DIR.forEach(([dx, dy], i) => { const v = caseA(r, c.x + dx, c.y + dy); if (!v || !v.pose) return; voisin = true; const a = o[i], b = v.ouv[(i + 2) % 4];
      if (a && b) lien++; else if (a !== b && !libre) ok = false; });
    // 14/11 (l'utilisateur : « l'impasse, on ne pourra jamais la mettre si on ne peut pas aller à deux endroits ») :
    // une pose qui fermerait la DERNIÈRE sortie ouverte du donjon est refusée (sauf la porte du boss)
    if (ok && (lien || (libre && voisin)) && tuile.t !== 'boss' && sfSortiesApres(r, c, o) === 0) ok = false;
    if (ok && (lien || (libre && voisin))) out.push({ x:c.x, y:c.y });
  })); return out;
}
// combien de sorties ouvertes (vers une case vide de l'île) resteraient si on posait une tuile de sorties o sur la case c
function sfSortiesApres(r, c, o) {
  let n = 0; const vide = (x, y) => { const v = caseA(r, x, y); return v && !v.pose && !(x === c.x && y === c.y); };
  r.ile.forEach(l => l.forEach(t => { if (!t.pose) return; SF_DIR.forEach(([dx, dy], i) => { if (t.ouv[i] && vide(t.x + dx, t.y + dy)) n++; }); }));
  SF_DIR.forEach(([dx, dy], i) => { if (o[i] && vide(c.x + dx, c.y + dy)) n++; }); return n;
}
// une sortie ouverte reste-t-elle quelque part ? (sinon, éboulement : la prochaine tuile se pose librement)
const sfBloque = r => !r.sansfin.offre.some(t => [0, 1, 2, 3].some(n => sfPlaces(r, t, n).length));
// poser la tuile i de l'offre en (x, y), tournée de n quarts
function sfPose(r, i, n, x, y) {
  const S = r.sansfin, t = S.offre[i]; if (!t) return null;
  const libre = !!S.eboulement, ok = sfPlaces(r, t, n, libre).some(p => p.x === x && p.y === y); if (!ok) return null;
  const c = caseA(r, x, y), I = ILE(r), R = hasard(r);
  Object.assign(c, { t:t.t, pose:true, vu:true, ouv:tourne(SF_FORMES[t.f], n), forme:t.f });
  if (libre) { // l'éboulement ouvre le passage vers la voisine posée
    // 14/11 (bug vu par l'utilisateur : impasse posée face au mur d'une voisine = case inaccessible) : on ouvre le passage DES DEUX CÔTÉS avec chaque voisine posée
    SF_DIR.forEach(([dx, dy], k) => { const v = caseA(r, x + dx, y + dy); if (v && v.pose) { c.ouv[k] = 1; v.ouv[(k + 2) % 4] = 1; } }); S.eboulement = false; }
  S.poses++; typeof guildeEvt === 'function' && guildeEvt('tuile', 1);
  if (S.regle === 'cendres' && r.pv > 1) { r.pv--; } // règle du jour : −1 PV par tuile posée
  if (t.t === 'monstre') { c.niv = S.poses <= 10 ? 1 : S.poses <= 22 ? 2 : 3; /* 14/11 nuit : 6 / 14 avant (simulateur : 1er étage passé 18 % seulement) */ c.ennemi = tire(R, I.pools[c.niv - 1]); }
  if (t.t === 'elite') { c.niv = 2; const s = ['heros', 'monstre', 'heros'][S.elites++ % 3]; if (s === 'monstre') c.ennemi = tire(R, I.elites); else { c.ennemi = 'heros'; c.renfort = tire(R, ['pc', 'pv', 'bouclier']); } }
  if (t.t === 'evenement') { const deja = r.ile.flat().map(k => k.ev).filter(Boolean), l = EVENEMENTS.filter(e => (I.evenements ? I.evenements.includes(e.id) : !e.ile) && !deja.includes(e.id) && !SF_SANS_EVENEMENT.includes(e.id)); c.ev = (l.length ? tire(R, l) : tire(R, EVENEMENTS.filter(e => !e.ile))).id; }
  if (t.t === 'boss') { c.ennemi = I.boss; c.niv = 1; S.bossFait = true; }
  // 14/11 nuit : les salles rares. Le coffre piège cache un monstre fort ; la salle du défi, un combat à contrainte ; le trésor et la fontaine se règlent à l'écran
  if (t.t === 'mimique') { c.niv = 3; c.ennemi = tire(R, I.elites); }
  if (t.t === 'defi') { c.niv = 2; c.ennemi = tire(R, I.pools[1]); }
  if (t.t === 'marchand') S.dernierMarchand = S.poses;
  S.offre.splice(i, 1); sfOffre(r);
  r.journal.push(`🧩 ${SF_NOM_FORME[t.f]}${t.t !== 'chemin' ? ' · ' + SALLES_ODY[t.t].n : ''} posé.`);
  return c;
}
// tout repiocher contre 1 huile
function sfRepioche(r) { const S = r.sansfin; if (r.vivres < 1) return false; r.vivres--; S.pioche.push(...S.offre.filter(t => t.t !== 'boss')); S.offre = []; sfOffre(r); r.journal.push('🔄 Tu repioches les 3 tuiles (−1 huile).'); return true; }

// 14/11 : réparation d'une tuile en attente que le héros ne peut pas atteindre (parties touchées par l'ancien bug de l'éboulement)
function sfRepare(r) {
  const a = r.sansfin && r.sansfin.attente; if (!a) return false; const c = caseA(r, a.x, a.y); if (!c || c.visite) return false;
  const ok = SF_DIR.some(([dx, dy], k) => { const v = caseA(r, a.x + dx, a.y + dy); return v && v.pose && v.visite && c.ouv[k] && v.ouv[(k + 2) % 4]; });
  if (ok) return false;
  const k = SF_DIR.findIndex(([dx, dy]) => { const v = caseA(r, a.x + dx, a.y + dy); return v && v.pose && v.visite; }); if (k < 0) return false;
  const [dx, dy] = SF_DIR[k], v = caseA(r, a.x + dx, a.y + dy); c.ouv[k] = 1; v.ouv[(k + 2) % 4] = 1; r.journal.push('🪨 Un passage s’ouvre vers la tuile posée.'); return true;
}

// =============================================================================================== 14/11 nuit : les étages, les règles du jour, les primes
// (plan « Pourquoi revenir », partie 6, validé par l'utilisateur ; détails choisis par Claude, notés dans a-valider-nuit.html)
const REGLES_SF = [
  { id:'cendres', e:'🔥', n:'Cendres brûlantes', d:'Chaque tuile posée coûte 1 PV, mais l’or des combats est doublé.' },
  { id:'nuit', e:'🌑', n:'Nuit noire', d:'Tu ne vois pas le contenu des tuiles avant de les poser (seulement leurs couloirs).' },
  { id:'fievre', e:'🪙', n:'Fièvre de l’or', d:'Les coffres s’ouvrent sans clé, mais il y a moins de sources.' },
  { id:'horde', e:'⚔', n:'Horde', d:'Six monstres de plus dans la pioche ; chaque monstre vaincu rapporte 15 or de plus.' },
  { id:'lanterne', e:'🕯', n:'Lanterne fragile', d:'Chaque tuile nouvelle coûte 2 huiles, mais tu vois 4 tuiles au lieu de 3.' },
  { id:'des', e:'🎲', n:'Dés chanceux', d:'Une relance gratuite de plus à chaque tour de combat.' },
];
// la même règle pour tout le monde le même jour
function regleDuJour(d = new Date()) { const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; let h = 7; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 9973; return REGLES_SF[h % REGLES_SF.length]; }
const regleSF = r => REGLES_SF.find(x => x.id === (r.sansfin && r.sansfin.regle));
// l'île de chaque étage : on part de l'île choisie, puis Givre, Abîme… et à chaque tour complet, les ennemis ont +25 % de vie
const ACTES_SF = ['brulees', 'givre', 'abime'];
const acteEtage = (r, n) => ACTES_SF[(ACTES_SF.indexOf(r.sansfin.acte1 || 'brulees') + n - 1) % 3];
const forceEtage = r => r.sansfin ? Math.floor(((r.sansfin.etage || 1) - 1) / 3) : 0;
// les primes : un contrat par étage, choisi parmi 3 ; vérifié quand le boss de l'étage tombe
const PRIMES_SF = [
  { id:'chasseur', e:'🏹', n:'Chasseur', d:'Gagne 7 combats sur cet étage (boss compris).', ok:r => r.stats.victoires - r.sansfin.debutEtage.victoires >= 7 },
  { id:'coffres', e:'🗝', n:'Pilleur', d:'Ouvre 2 coffres sur cet étage.', ok:r => r.ile.flat().filter(c => c.t === 'coffre' && c.fait).length >= 2 },
  { id:'sansfeu', e:'🧊', n:'Sans repos', d:'Bats le boss sans t’arrêter à un feu de camp.', ok:r => !r.ile.flat().some(c => c.t === 'feu' && c.fait) },
  { id:'econome', e:'💰', n:'Économe', d:'Bats le boss avec 200 or ou plus en poche.', ok:r => r.or >= 200 },
  { id:'rapide', e:'⚡', n:'Éclair', d:'Bats le boss en posant 30 tuiles ou moins.', ok:r => r.sansfin.poses - r.sansfin.debutEtage.poses <= 30 },
  { id:'intact', e:'❤', n:'Intact', d:'Bats le boss avec plus de la moitié de tes PV.', ok:r => r.pv > r.pvMax / 2 },
  { id:'sans_marchand', e:'🙅', n:'Débrouillard', d:'Bats le boss sans rien acheter au marchand.', ok:r => !r.ile.flat().some(c => c.t === 'marchand' && c.achete) },
];
const PRIME_OR = 70, PRIME_XP = 100;
function primesOffre(r) { const R = hasard(r); return brasse(R, PRIMES_SF.map(p => p.id)).slice(0, 3); }
function choisitPrime(r, id) { const S = r.sansfin; if (!S.primes.includes(id)) return false; S.prime = id; const p = PRIMES_SF.find(x => x.id === id); r.journal.push(`🎯 Prime de l’étage ${S.etage} : ${p.n} (${p.d})`); return true; }
// le boss de l'étage est tombé : la prime est-elle remplie ?
function bilanEtage(r) {
  const S = r.sansfin, p = S.prime && PRIMES_SF.find(x => x.id === S.prime), ok = !!(p && p.ok(r));
  if (ok) { r.or += PRIME_OR; r.journal.push(`🎯 Prime « ${p.n} » remplie : +${PRIME_OR} or.`); if (typeof gagneXP === 'function') gagneXP(PRIME_XP, 'Prime remplie'); }
  else if (p) r.journal.push(`🎯 Prime « ${p.n} » manquée.`);
  return { prime:p, ok };
}
// descendre : une île neuve, on garde deck, reliques, sacoche, or, vie (avec un soin au pied de l'escalier)
function sfEtageSuivant(r) {
  const S = r.sansfin; S.etage++; r.acte = acteEtage(r, S.etage);
  const N = 31; ILE_W = N; ILE_H = N;
  r.ile = Array.from({ length:N }, (_, y) => Array.from({ length:N }, (_, x) => ({ x, y, t:'roche', vu:false, visite:false, fait:false })));
  const dep = { x:15, y:15 }; Object.assign(r.ile[dep.y][dep.x], { t:'depart', vu:true, visite:true, ouv:[1, 1, 1, 1], pose:true }); r.pos = { ...dep };
  const soin = Math.round(r.pvMax * .4), a = r.pv; r.pv = Math.min(r.pvMax, r.pv + soin); r.vivres += 8; r.fragments = 0;
  Object.assign(S, { offre:[], poses:1, elites:0, bossFait:false, dernierMarchand:0, eboulement:false, attente:null, prime:null, debutEtage:{ victoires:r.stats.victoires, poses:1 } });
  S.pioche = sfSac(Object.assign(hasard(r), { regle:S.regle })); S.primes = primesOffre(r);
  r.journal.push(`🪜 Étage ${S.etage} : ${ILES[r.acte].nom}${forceEtage(r) ? ` (ennemis +${25 * forceEtage(r)} % de vie)` : ''}. Au pied de l’escalier, une source : +${r.pv - a} PV ; +8 huile.`);
  if (typeof guildeEvt === 'function') { guildeEvt('etage', 1); guildeEvt('etage_atteint', S.etage); }
  sfOffre(r); return r;
}
// ce que montre la pioche (la Nuit noire cache le contenu)
const sfVu = (r, t) => r.sansfin && r.sansfin.regle === 'nuit' && t.t !== 'boss' && t.t !== 'chemin' ? { ...t, t:'mystere' } : t;
