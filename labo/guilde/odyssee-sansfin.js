// =============================================================================================== L'ODYSSÉE SANS FIN (14/11)
// Règles validées par l'utilisateur (sans-fin-proposition.html) : l'île se construit tuile par tuile, façon Carcassonne / Kingdomino.
// À chaque pas : 3 tuiles visibles, on en choisit une, on la tourne, on la raccorde à une sortie ouverte (les couloirs doivent
// correspondre), le héros y entre (1 huile, comme une case nouvelle). Boss : après 2 fragments, sa tuile est toujours proposée.
// Le reste (combats, salles, reliques, score) est celui de l'Odyssée : la run garde la même forme, avec r.sansfin.
const SF_DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // nord, est, sud, ouest
const SF_FORMES = { droit:[1, 0, 1, 0], virage:[1, 1, 0, 0], te:[1, 1, 0, 1], croix:[1, 1, 1, 1], salle:[0, 0, 1, 0] };
const SF_NOM_FORME = { droit:'couloir droit', virage:'virage', te:'carrefour en T', croix:'grand carrefour', salle:'salle en cul-de-sac' };
const SF_COURT = { droit:'droit', virage:'virage', te:'T', croix:'carrefour', salle:'impasse' };
const tourne = (o, n) => { let r = o.slice(); for (let i = 0; i < ((n % 4) + 4) % 4; i++) r = [r[3], r[0], r[1], r[2]]; return r; };
// la pioche : 40 tuiles (contenus de l'Odyssée), formes au hasard (les salles fortes plutôt en cul-de-sac ou en T)
function sfSac(R) {
  const contenus = [...Array(12).fill('monstre'), ...Array(3).fill('elite'), ...Array(3).fill('coffre'), ...Array(3).fill('source'), 'marchand', 'feu', 'feu', 'autel',
    ...Array(5).fill('evenement'), 'sac', 'forge', ...Array(8).fill('chemin')];
  return brasse(R, contenus).map(t => {
    const r = R(), f = t === 'chemin' ? (r < .35 ? 'droit' : r < .7 ? 'virage' : r < .9 ? 'te' : 'croix')
      : (r < .3 ? 'salle' : r < .55 ? 'te' : r < .8 ? 'virage' : r < .92 ? 'droit' : 'croix');
    return { t, f, id:Math.random().toString(36).slice(2, 8) };
  });
}
function nouvelleSansFin(heros, acte, niveau) {
  const r = nouvelleOdyssee(heros, null, acte, niveau); if (!r) return null;
  const cases = Array.from({ length:ILE_H }, (_, y) => Array.from({ length:ILE_W }, (_, x) => ({ x, y, t:'roche', vu:false, visite:false, fait:false })));
  // 14/11 (l'utilisateur : « un T vers le sud ne sert à rien, il faut pouvoir tourner autour comme à Kingdomino ») : on part du CENTRE, sorties dans les 4 directions
  const dep = { x:Math.floor(ILE_W / 2), y:Math.floor(ILE_H / 2) }; Object.assign(cases[dep.y][dep.x], { t:'depart', vu:true, visite:true, ouv:[1, 1, 1, 1], pose:true });
  r.ile = cases; r.pos = { ...dep }; r.porte = null; r.bossPos = null; r.direct = null;
  r.sansfin = { pioche:sfSac(hasard(r)), offre:[], poses:1, elites:0 };
  r.journal = [`🧩 Odyssée sans fin sur ${ILES[r.acte].nom} (${HEROS[heros].nom}) : l’île se construit tuile par tuile.`];
  sfOffre(r); return r;
}
// les tuiles déjà posées sont reliées si leurs sorties se font face
function relies(cases, x, y, a, b) {
  const c = cases[y] && cases[y][x], d = cases[b] && cases[b][a]; if (!c || !d || !c.ouv || !d.ouv) return true;
  const i = SF_DIR.findIndex(([dx, dy]) => dx === a - x && dy === b - y); return i >= 0 && c.ouv[i] && d.ouv[(i + 2) % 4];
}
// 3 tuiles visibles ; dès 2 fragments, la tuile du boss est toujours parmi elles
function sfOffre(r) {
  const S = r.sansfin; while (S.offre.length < 3) { if (!S.pioche.length) S.pioche = sfSac(hasard(r)); S.offre.push(S.pioche.shift()); }
  if (r.fragments >= 2 && !S.offre.some(t => t.t === 'boss') && !S.bossFait) S.offre[2] = { t:'boss', f:'salle', id:'boss' };
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
    SF_DIR.forEach(([dx, dy], k) => { const v = caseA(r, x + dx, y + dy); if (v && v.pose && !c.ouv[k]) { c.ouv[k] = 1; v.ouv[(k + 2) % 4] = 1; } }); S.eboulement = false; }
  S.poses++;
  if (t.t === 'monstre') { c.niv = S.poses <= 6 ? 1 : S.poses <= 14 ? 2 : 3; c.ennemi = tire(R, I.pools[c.niv - 1]); }
  if (t.t === 'elite') { c.niv = 2; const s = ['heros', 'monstre', 'heros'][S.elites++ % 3]; if (s === 'monstre') c.ennemi = tire(R, I.elites); else { c.ennemi = 'heros'; c.renfort = tire(R, ['pc', 'pv', 'bouclier']); } }
  if (t.t === 'evenement') { const deja = r.ile.flat().map(k => k.ev).filter(Boolean), l = EVENEMENTS.filter(e => (I.evenements ? I.evenements.includes(e.id) : !e.ile) && !deja.includes(e.id)); c.ev = (l.length ? tire(R, l) : tire(R, EVENEMENTS.filter(e => !e.ile))).id; }
  if (t.t === 'boss') { c.ennemi = I.boss; c.niv = 1; S.bossFait = true; }
  S.offre.splice(i, 1); sfOffre(r);
  r.journal.push(`🧩 ${SF_NOM_FORME[t.f]}${t.t !== 'chemin' ? ' · ' + SALLES_ODY[t.t].n : ''} posé.`);
  return c;
}
// tout repiocher contre 1 huile
function sfRepioche(r) { const S = r.sansfin; if (r.vivres < 1) return false; r.vivres--; S.pioche.push(...S.offre.filter(t => t.t !== 'boss')); S.offre = []; sfOffre(r); r.journal.push('🔄 Tu repioches les 3 tuiles (−1 huile).'); return true; }
