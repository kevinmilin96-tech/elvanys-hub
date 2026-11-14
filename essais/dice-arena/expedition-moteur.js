// =============================================================================================== LES EXPÉDITIONS v2 — le moteur (13/11, règles validées par l'utilisateur)
// Page de règles : expeditions-v2-regles.html. Deux rangées (devant / derrière) + la cale ; 5 familles (bonus à 2 et 4) ; fusion ★ (3 pareilles) et ★★ (3 ★) ;
// 6 pouvoirs de capitaine ; recruteur en petites pièces (3, grosses 4, revente 1, +8 par escale, intérêts 1 par 5 gardées, 3 au plus) ;
// 6 escales : monstres (1, 3, 5), fantômes (2, 4 : l'équipage d'un autre capitaine, fabriqué par l'ordinateur), boss (6) ; 3 cœurs.
// Ce fichier ne touche pas à l'écran : expedition.html rejoue les événements du combat. Le simulateur appelle simuleExpedition().

// ----------------------------------------------------------------------------------------------- les recrues
// role : rempart (devant, Barrière) · lame (devant) · tireur (frappe depuis derrière) · soutien (agit ET frappe depuis derrière, depuis le 14/11)
const FAMILLES = {
  garde:   { n:'La Garde', e:'🛡', d2:'+3 PV et Épines 1 à tous les Gardes', d4:'+6 PV et Épines 2 à tous les Gardes' },
  ombre:   { n:'L’Ombre', e:'🌑', d2:'leur 1re attaque fait double dégât', d4:'elles esquivent aussi le 1er coup reçu' },
  clan:    { n:'Le Clan', e:'📯', d2:'+1 attaque à tout l’équipage (sauf les Soutiens)', d4:'+1 attaque à tout l’équipage, Soutiens compris' },
  clairiere:{ n:'La Clairière', e:'🌿', d2:'3 PV soignés à tous à la fin de chaque round', d4:'6 PV soignés à tous' },
  forge:   { n:'La Forge', e:'⚒', d2:'après chaque escale gagnée, +1 attaque définitive à une Forge', d4:'+1 attaque et +2 PV définitifs à toutes les Forges' },
};
const RECRUES = {
  ecuyer:    { n:'Écuyer', fam:'garde', role:'rempart', a:2, v:6, barriere:true, t:1 },
  chien:     { n:'Chien de garde', fam:'garde', role:'rempart', a:2, v:5, barriere:true, t:1 },
  guetteur:  { n:'Guetteur', fam:'garde', role:'rempart', a:2, v:7, barriere:true, t:2 },
  gardien:   { n:'Gardien de la porte', fam:'garde', role:'rempart', a:3, v:9, barriere:true, t:3, gros:true },
  eclaireuse:{ n:'Éclaireuse', fam:'ombre', role:'lame', a:3, v:5, t:1 },
  renard:    { n:'Renard du col', fam:'ombre', role:'lame', a:3, v:4, t:1 },
  lynx:      { n:'Lynx des fourrés', fam:'ombre', role:'lame', a:4, v:4, t:2 },
  homoncule: { n:'Homoncule', fam:'ombre', role:'tireur', a:2, v:5, poison:1, t:2, d:'Poison : sa cible perd 1 PV par round.' },
  milicien:  { n:'Milicien', fam:'clan', role:'lame', a:2, v:4, t:1 },
  tambour:   { n:'Tambour de clan', fam:'clan', role:'soutien', a:1, v:4, tambour:true, t:1, d:'Les autres membres de l’équipage ont +1 attaque (plusieurs Tambours ne s’additionnent pas).' },
  flute:     { n:'Joueuse de flûte', fam:'clan', role:'tireur', a:2, v:3, t:1 },
  colosse:   { n:'Colosse des collines', fam:'clan', role:'lame', a:5, v:8, charge:true, t:3, gros:true },
  faon:      { n:'Faon des clairières', fam:'clairiere', role:'soutien', a:1, v:3, soigneur:2, t:1, d:'Soigne de 2 l’allié le plus blessé à chaque round.' },
  ronces:    { n:'Pousse de ronces', fam:'clairiere', role:'rempart', a:0, v:6, barriere:true, epines:1, t:1, d:'Épines 1 : qui la frappe perd 1 PV.' },
  sanglier:  { n:'Sanglier des bois', fam:'clairiere', role:'lame', a:3, v:6, charge:true, t:2, neuf:true },
  druidesse: { n:'Druidesse', fam:'clairiere', role:'soutien', a:1, v:4, soinTous:1, t:3, neuf:true, d:'Soigne de 1 tout l’équipage à chaque round.' },
  apprenti:  { n:'Apprenti du soufflet', fam:'forge', role:'tireur', a:2, v:3, t:1 },
  forgeron:  { n:'Forgeron', fam:'forge', role:'lame', a:3, v:4, t:1, neuf:true },
  automate:  { n:'Automate', fam:'forge', role:'tireur', a:2, v:4, t:2, neuf:true },
  golem:     { n:'Golem de bronze', fam:'forge', role:'rempart', a:4, v:9, barriere:true, t:3, gros:true },
};
const ROLES = { rempart:'🛡 Rempart', lame:'⚔ Lame', tireur:'🏹 Tireur', soutien:'✚ Soutien' };
const prixRecrue = k => RECRUES[k].gros ? 4 : 3;
const CAPITAINES = {
  maelle: { n:'La forge du bord', d:'La Forge compte une recrue de plus ; chaque victoire donne +1 attaque et +2 PV à la recrue de devant la plus faible.' },
  aldric: { n:'Serment', d:'Une fois par combat, une recrue qui devrait tomber reste à 1 PV.' },
  pip:    { n:'La meute', d:'La Louve (3 / 6, Ombre) rejoint l’équipage gratuitement à l’escale 3 ; l’Ombre compte une recrue de plus.' },
  oria:   { n:'Les éclaireurs', d:'Les Tireurs gagnent +2 attaque ; le recruteur montre une recrue de plus.' },
  gorm:   { n:'Cor de guerre', d:'Pendant les 3 premiers rounds, tout l’équipage a +1 attaque.' },
  zephine:{ n:'Transmutation', d:'À chaque passage au port, change jusqu’à deux recrues contre d’autres de même prix et de ta famille la plus nombreuse (même étoile).' },
};
const ESCALES2 = [
  { n:'La Crique des gobelins', e:'🏴‍☠️', cle:'crique', type:'monstres' },
  { n:'Les Falaises hurlantes', e:'🌬', cle:'falaises', type:'fantome' },
  { n:'Le Port de Marennes', e:'⚓', cle:'port', type:'monstres' },
  { n:'La Forêt-racine', e:'🌲', cle:'foret', type:'fantome' },
  { n:'Le Cratère', e:'🌋', cle:'cratere', type:'monstres' },
  { n:'Le Nid du Titan', e:'👑', cle:'nid', type:'boss' },
];
// les monstres de chaque escale (une rangée devant, une derrière) ; DUR_EXP règle la difficulté au simulateur
const DUR_EXP = [1.35, 1.25, 1.55, 1.25, 1.9, 2.05]; // réglé au simulateur le 14/11 (avec les ordres du capitaine ; avant : 1.1, 1, 1.2, 1, 1.5, 1.55)
const MONSTRES_EXP = [
  { av:[['Gobelin', 3, 7], ['Gobelin chef', 3, 9]], ar:[['Gobelin lanceur', 2, 5, 'tireur']] },
  null,
  { av:[['Loup de braise', 4, 11], ['Louveteau', 3, 6]], ar:[['Salamandre', 3, 8, 'tireur'], ['Louveteau', 3, 6]] },
  null,
  { av:[['Élémentaire de lave', 6, 18, 'barriere'], ['Golem de scories', 4, 14, 'barriere']], ar:[['Drake de cendre', 5, 14, 'tireur'], ['Flammèche', 3, 4, 'charge'], ['Flammèche', 3, 4, 'charge']] },
  { av:[['Le Titan de feu', 8, 60, 'boss']], ar:[['Flammèche', 3, 5, 'charge'], ['Cultiste du feu', 4, 10, 'tireur'], ['Flammèche', 3, 5, 'charge']] },
];
const uid = () => Math.random().toString(36).slice(2, 9);
function nouvelleRecrue(k, star) {
  const r = RECRUES[k], m = star === 2 ? 3 : star === 1 ? 2 : 1;
  return { id:uid(), key:k, n:r.n, fam:r.fam, role:r.role, a:r.a * m, v:r.v * m, star:star || 0, bonusA:0, bonusV:0 };
}
function capitaineUnite(h) { const H = HEROS[h]; return { id:uid(), key:'capitaine', hid:h, n:H.nom, role:'capitaine', a:3, v:Math.round(H.pv * .6), star:0, bonusA:0, bonusV:0 }; }

// ----------------------------------------------------------------------------------------------- l'expédition (l'état gardé sur le téléphone)
function nouvelleExpedition(heros, graine) {
  const X = { v:2, heros, graine:graine || uid(), escale:0, or:10, coeurs:3, plateau:{ av:[null, null, null], ar:[null, null, null] }, cale:[null, null, null],
    offre:null, gel:false, transmuOk:true, victoires:0, journal:[`Le navire de ${HEROS[heros].nom} quitte la Guilde.`], fini:null, debut:Date.now(), tirage:0 };
  X.plateau.av[1] = capitaineUnite(heros);
  nouvelleOffre(X); return X;
}
const hasardX = X => { X.tirage = (X.tirage || 0) + 1; return rngDe(X.graine + '/x/' + X.tirage); };
const tailleOffre = X => X.heros === 'oria' ? 5 : 4;
function nouvelleOffre(X) {
  const R = hasardX(X), tier = Math.min(3, 1 + Math.floor(X.escale / 2));
  const pool = Object.keys(RECRUES).filter(k => RECRUES[k].t <= tier);
  X.offre = Array.from({ length:tailleOffre(X) }, () => tire(R, pool));
}
const toutes = X => [...X.plateau.av, ...X.plateau.ar, ...X.cale].filter(Boolean);
const surPlateau = X => [...X.plateau.av, ...X.plateau.ar].filter(Boolean);
function placeLibre(X, pref) {
  const ordre = pref === 'ar' ? [['ar', 0], ['ar', 1], ['ar', 2], ['av', 0], ['av', 1], ['av', 2]] : [['av', 0], ['av', 1], ['av', 2], ['ar', 0], ['ar', 1], ['ar', 2]];
  for (const [r, i] of ordre) if (!X.plateau[r][i]) return { r, i };
  const c = X.cale.findIndex(x => !x); return c >= 0 ? { r:'cale', i:c } : null;
}
function poseA(X, p, u) { if (p.r === 'cale') X.cale[p.i] = u; else X.plateau[p.r][p.i] = u; }
function ouEst(X, id) {
  for (const r of ['av', 'ar']) { const i = X.plateau[r].findIndex(u => u && u.id === id); if (i >= 0) return { r, i }; }
  const c = X.cale.findIndex(u => u && u.id === id); return c >= 0 ? { r:'cale', i:c } : null;
}
const aEn = (X, p) => p.r === 'cale' ? X.cale[p.i] : X.plateau[p.r][p.i];
// la fusion : 3 recrues pareilles (même clé, même étoile) n'en font plus qu'une, étoilée, à la place de la mieux placée
function fusionne(X) {
  let fait = null;
  for (let s = 0; s < 2; s++) {
    const groupes = {};
    toutes(X).filter(u => u.key !== 'capitaine' && u.star === s).forEach(u => { (groupes[u.key] = groupes[u.key] || []).push(u); });
    for (const k in groupes) {
      while (groupes[k].length >= 3) {
        const trois = groupes[k].splice(0, 3), pos = trois.map(u => ouEst(X, u.id));
        const garde = pos.find(p => p.r !== 'cale') || pos[0];
        pos.forEach(p => poseA(X, p, null));
        const n = nouvelleRecrue(k, s + 1); n.bonusA = Math.max(...trois.map(u => u.bonusA)); n.bonusV = Math.max(...trois.map(u => u.bonusV));
        poseA(X, garde, n); fait = n; X.journal.push(`✨ Fusion : ${n.n} ${'★'.repeat(n.star)} !`);
      }
    }
  }
  return fait;
}
function achete(X, i) {
  const k = X.offre[i]; if (!k) return { ok:false, raison:'déjà pris' };
  const p = prixRecrue(k); if (X.or < p) return { ok:false, raison:'Pas assez de pièces.' };
  // on peut acheter même la cale pleine si ça finit une fusion
  const deja = toutes(X).filter(u => u.key === k && u.star === 0).length;
  let place = placeLibre(X, ['tireur', 'soutien'].includes(RECRUES[k].role) ? 'ar' : 'av');
  if (!place && deja < 2) return { ok:false, raison:'Plus de place : vends une recrue d’abord.' };
  X.or -= p; X.offre[i] = null; const u = nouvelleRecrue(k, 0);
  if (place) poseA(X, place, u); else { X.cale.push(u); }
  const f = fusionne(X); X.cale = X.cale.slice(0, 3).concat(Array(Math.max(0, 3 - X.cale.length)).fill(null)).slice(0, 3);
  return { ok:true, u, fusion:f };
}
function vend(X, id) { const p = ouEst(X, id); if (!p) return false; const u = aEn(X, p); if (!u || u.key === 'capitaine') return false; poseA(X, p, null); X.or += u.star ? 1 + u.star * 2 : 1; X.journal.push(`💰 ${u.n} vendu.`); return true; }
function relance(X) { if (X.or < 1) return false; X.or--; nouvelleOffre(X); X.gel = false; return true; }
function deplace(X, id, vers) { const p = ouEst(X, id); if (!p) return false; const a = aEn(X, p), b = aEn(X, vers); poseA(X, vers, a); poseA(X, p, b); return true; }
function transmute(X, id) {
  if (X.heros !== 'zephine' || !X.transmuOk) return null; if (X.transmuOk === true) X.transmuOk = 2; const p = ouEst(X, id); const u = p && aEn(X, p); if (!u || u.key === 'capitaine') return null;
  // 13/11 : la recrue transmutée rejoint la famille la plus nombreuse du plateau (sinon une recrue de même prix au hasard)
  const fam = compteFamilles(X, X.plateau), top = Object.keys(fam).sort((a, b) => fam[b] - fam[a])[0];
  const R = hasardX(X), memePrix = Object.keys(RECRUES).filter(k => k !== u.key && prixRecrue(k) === prixRecrue(u.key)), deLaFam = memePrix.filter(k => top && RECRUES[k].fam === top && RECRUES[k].fam !== u.fam);
  const choix = deLaFam.length ? deLaFam : memePrix;
  const n = nouvelleRecrue(tire(R, choix), u.star); poseA(X, p, n); X.transmuOk = X.transmuOk - 1 || false; X.journal.push(`⚗ Transmutation : ${u.n} devient ${n.n}.`); fusionne(X); return n;
}

// ----------------------------------------------------------------------------------------------- les familles
function compteFamilles(X, plateau) {
  const c = {}; [...plateau.av, ...plateau.ar].filter(u => u && u.fam).forEach(u => { c[u.fam] = (c[u.fam] || 0) + 1; });
  if (X.heros === 'maelle') c.forge = (c.forge || 0) + ((c.forge || 0) >= 2 ? 1 : 0); // le capitaine aide à passer de 2 à 4, pas de 1 à 2
  if (X.heros === 'pip') c.ombre = (c.ombre || 0) + ((c.ombre || 0) >= 2 ? 1 : 0); // le capitaine aide à passer de 2 à 4, pas de 1 à 2
  // 13/11 : Gorm n'a plus le +1 de famille (le Clan était déjà le plus fort) ; il garde le Cor de guerre
  return c;
}
const palier = n => n >= 4 ? 2 : n >= 2 ? 1 : 0;

// ----------------------------------------------------------------------------------------------- le combat (sans écran) : renvoie { gagne, ev[] }
// camp : { heros (capitaine ou null), plateau:{av,ar} } ; chaque unité devient un combattant avec ses bonus du combat
function combattants(camp, cote) {
  const fam = camp.X ? compteFamilles(camp.X, camp.plateau) : {}, cap = camp.heros, out = [];
  const clan = palier(fam.clan || 0), garde = palier(fam.garde || 0), ombre = palier(fam.ombre || 0);
  const tambours = Math.min(1, [...camp.plateau.av, ...camp.plateau.ar].filter(u => u && u.key === 'tambour').length); // 13/11 : les Tambours ne s'additionnent pas
  ['av', 'ar'].forEach(r => camp.plateau[r].forEach((u, i) => { if (!u) return;
    const base = RECRUES[u.key] || {};
    const c = { ...u, cote, rang:r, pos:i, vmax:0, poisonSur:0, mort:false };
    // 14/11 : les Soutiens frappent avec LEUR attaque seulement (les bonus d'attaque du Clan et des Tambours vont aux autres : sinon le Clan de Gorm passait de 49 à 81 %)
    c.a = u.a + (u.bonusA || 0) + (u.role === 'soutien' ? (clan >= 2 ? 1 : 0) : (clan ? 1 : 0) + tambours) + (cap === 'oria' && u.role === 'tireur' ? (globalThis.ORIA_TIR || 2) : 0);
    c.v = u.v + (u.bonusV || 0) + (u.fam === 'garde' ? [0, 3, 6][garde] : 0);
    c.barriere = !!(base.barriere || u.barriere); c.charge = !!(base.charge || u.charge); c.epines = (base.epines || 0) + (u.fam === 'garde' ? garde : 0);
    c.poison = base.poison || 0; c.soigneur = base.soigneur || 0; c.soinTous = base.soinTous || 0;
    c.embuscade = u.fam === 'ombre' && ombre >= 1; c.esquive = u.fam === 'ombre' && ombre >= 2;
    c.tireur = u.role === 'tireur' || !!u.tireur; c.vmax = c.v; out.push(c); }));
  return { liste:out, clairiere:palier(fam.clairiere || 0), serment:cap === 'aldric', cor:cap === 'gorm', fam };
}
function combatExp(campJ, campE, R) {
  const J = combattants(campJ, 'J'), E = combattants(campE, 'E'), ev = [];
  const pr = (campJ.X && campJ.X.prochain) || {};
  if (pr.charge) J.liste.forEach(u => { if (u.rang === 'av') u.charge = true; });
  if (pr.atq) J.liste.forEach(u => { u.a += pr.atq; });
  if (pr.ennemis) E.liste.forEach(u => { u.v = u.vmax = Math.max(1, Math.round(u.v * pr.ennemis)); });
  // 14/11 : les ordres du capitaine (les dés posés sur les recrues avant l'escale) : +PV, +attaque, coup sûr ; et le bonus de la combinaison
  const od = campJ.X && campJ.X.ordres;
  if (od) { J.liste.forEach(u => { const o = od.u[u.id] || {}, t = od.tous || {}, a = (o.a || 0) + (t.a || 0), v = (o.v || 0) + (t.v || 0); u.a += a; u.v += v; u.vmax += v; if (o.sur) u.coupSur = true; }); }
  // 14/11 : l'écran affiche les forces réelles au début du combat (familles, ordres, Tambours… compris)
  ev.push({ t:'depart', l:[...J.liste, ...E.liste].map(u => ({ id:u.id, a:u.a + (u.tambourBonus || 0), v:u.v, sur:!!u.coupSur, o:od && od.u[u.id] ? 1 : 0 })) });
  const vivants = C => C.liste.filter(u => !u.mort);
  const front = C => vivants(C).filter(u => u.rang === 'av');
  // si le devant est vide, les Lames et Remparts de derrière avancent
  const avance = C => { if (front(C).length) return; vivants(C).filter(u => u.rang === 'ar' && (u.role === 'lame' || u.role === 'rempart' || u.role === 'capitaine')).forEach(u => { u.rang = 'av'; ev.push({ t:'avance', id:u.id }); }); };
  const cible = C => { avance(C); const f = front(C), l = f.length ? f : vivants(C); if (!l.length) return null; const b = l.filter(u => u.barriere); return (b.length ? b : l)[Math.floor(R() * (b.length || l.length))]; };
  const tue = (C, u) => {
    if (u.v > 0) return;
    if (C.serment && u.key !== 'capitaine' && (C.sermentFait || 0) < (C.sermentMax || 1)) { C.sermentFait = (C.sermentFait || 0) + 1; u.v = 1; ev.push({ t:'serment', id:u.id }); return; }
    u.mort = true; ev.push({ t:'mort', id:u.id });
  };
  // 14/11 (choix de l'utilisateur, comme dans les autobattlers) : les Soutiens frappent aussi depuis derrière, en plus de leur pouvoir
  // 14/11 (l'utilisateur : « on ne bloque pas le joueur, il place qui il veut où il veut ») : tout le monde frappe ; une Lame ou un Rempart de derrière frappe à moitié
  const peutFrapper = u => true;
  for (let round = 1; round <= 25; round++) {
    if (!vivants(J).length || !vivants(E).length) break;
    ev.push({ t:'round', n:round });
    const ordre = []; const ja = vivants(J), ea = vivants(E), premier = R() < .5;
    for (let i = 0; i < Math.max(ja.length, ea.length); i++) { const p = premier ? [ja[i], ea[i]] : [ea[i], ja[i]]; p.forEach(x => x && ordre.push(x)); }
    if (round === 1) ordre.sort((x, y) => (y.charge ? 1 : 0) - (x.charge ? 1 : 0));
    for (const u of ordre) {
      if (u.mort) continue; const A = u.cote === 'J' ? J : E, D = u.cote === 'J' ? E : J;
      if (!vivants(D).length) break;
      // les soins des Soutiens
      if (u.soigneur) { const b = vivants(A).filter(x => x.v < x.vmax).sort((x, y) => (x.v / x.vmax) - (y.v / y.vmax))[0]; if (b) { const n = Math.min(u.soigneur, b.vmax - b.v); b.v += n; ev.push({ t:'soin', id:b.id, n, src:u.id }); } }
      if (u.soinTous) vivants(A).forEach(b => { if (b.v < b.vmax) { b.v = Math.min(b.vmax, b.v + u.soinTous); ev.push({ t:'soin', id:b.id, n:u.soinTous, src:u.id }); } });
      if (!peutFrapper(u)) continue;
      const c = cible(D); if (!c) break;
      let dg, de, txt = '';
      if (u.role === 'capitaine') {
        const ds = [1, 2, 3].map(() => 1 + Math.floor(R() * 6)), s = [...ds].sort((a, b) => a - b);
        if (s[0] === s[2]) { dg = s[0] + 3; txt = 'Frappe ×3'; } else if (s[0] === s[1] || s[1] === s[2]) { dg = s[1]; txt = 'Frappe'; } else if (s[1] === s[0] + 1 && s[2] === s[1] + 1) { dg = 4; txt = 'Technique'; } else { dg = Math.max(1, s[2] - 2); txt = 'coup simple'; }
        if (u.coupSur && !u.coupSurFait) { u.coupSurFait = true; dg += 3; txt += ' + coup sûr'; }
        dg += u.a - 3; de = ds; if (u.rang === 'ar') { dg = Math.ceil(dg / 2); txt += ' (de derrière : moitié)'; }
      } else {
        de = 1 + Math.floor(R() * 6); if (u.coupSur && !u.coupSurFait) { u.coupSurFait = true; de = 6; } dg = de === 6 ? u.a * 2 : de === 1 ? 0 : u.a; txt = de === 6 ? 'critique' : de === 1 ? 'raté' : ''; if (dg > 0 && u.rang === 'ar' && !u.tireur && u.role !== 'soutien') { dg = Math.ceil(dg / 2); txt += (txt ? ' · ' : '') + 'de derrière : moitié'; }
      }
      if (A.cor && round <= (A.corRounds || 3) && dg > 0) dg += (A.corBonus || 1);
      if (u.embuscade && !u.embuscadeFaite && dg > 0) { dg *= 2; u.embuscadeFaite = true; txt = 'Embuscade !'; }
      if (dg > 0 && c.esquive && !c.esquiveFaite) { c.esquiveFaite = true; ev.push({ t:'esquive', src:u.id, id:c.id, de }); continue; }
      c.v -= dg; ev.push({ t:'coup', src:u.id, id:c.id, dg, de, txt, v:c.v });
      if (dg > 0 && u.poison) c.poisonSur += u.poison;
      if (dg > 0 && c.epines) { u.v -= c.epines; ev.push({ t:'epines', id:u.id, n:c.epines, v:u.v }); tue(A, u); }
      tue(D, c);
    }
    // fin du round : poison, Clairière
    [J, E].forEach(C => { vivants(C).forEach(u => { if (u.poisonSur) { u.v -= u.poisonSur; ev.push({ t:'poison', id:u.id, n:u.poisonSur, v:u.v }); tue(C, u); } });
      if (C.clairiere) vivants(C).forEach(u => { if (u.v < u.vmax) { const n = Math.min([0, 3, 6][C.clairiere], u.vmax - u.v); u.v += n; ev.push({ t:'soin', id:u.id, n }); } }); });
  }
  const gagne = vivants(E).length === 0 && vivants(J).length > 0;
  return { gagne, ev, restant:vivants(J).length, restantE:vivants(E).length };
}

// ----------------------------------------------------------------------------------------------- les adversaires
function plateauMonstres(k) {
  const m = MONSTRES_EXP[k], mul = DUR_EXP[k] || 1, P = { av:[null, null, null], ar:[null, null, null] };
  const fait = ([n, a, v, tag]) => ({ id:uid(), key:'m', n, a, v:Math.round(v * mul), star:0, role:tag === 'tireur' ? 'tireur' : 'lame', tireur:tag === 'tireur', barriere:tag === 'barriere' || tag === 'boss', charge:tag === 'charge', boss:tag === 'boss', bonusA:0, bonusV:0 });
  m.av.forEach((x, i) => { P.av[i] = fait(x); }); m.ar.forEach((x, i) => { P.ar[i] = fait(x); });
  return P;
}
// un fantôme fabriqué : un autre capitaine qui a joué « comme un joueur » jusqu'à cette escale (même pilote que le simulateur)
function fantome(X, k) {
  const autres = ORDRE.filter(h => h !== X.heros), R = rngDe(X.graine + '/fantome/' + k), h = tire(R, autres);
  const F = nouvelleExpedition(h, X.graine + '/f' + k); F.estFantome = true;
  for (let e = 0; e < k; e++) { pilotePort(F); F.escale++; F.or += 8 + Math.min(3, Math.floor(F.or / 5)); if (h === 'zephine') F.transmuOk = true; }
  pilotePort(F);
  return { heros:h, plateau:F.plateau, X:F };
}
function adversaire(X) {
  const esc = ESCALES2[X.escale];
  if (esc.type === 'fantome') { const f = fantome(X, X.escale); return { nom:`Le navire de ${HEROS[f.heros].nom}`, camp:{ heros:f.heros, plateau:f.plateau, X:f.X }, fantome:f.heros }; }
  return { nom:esc.n, camp:{ heros:null, plateau:plateauMonstres(X.escale), X:null } };
}

// ----------------------------------------------------------------------------------------------- une escale : combat + suite (or, cœurs, Forge, Louve)
function joueEscale(X, R) {
  const adv = adversaire(X), res = combatExp({ heros:X.heros, plateau:X.plateau, X }, adv.camp, R || hasardX(X));
  const esc = ESCALES2[X.escale]; res.adv = adv; X.prochain = null; X.ordres = null;
  if (res.gagne) {
    X.victoires++; X.journal.push(`🏆 ${esc.n} : victoire.`);
    const fam = compteFamilles(X, X.plateau), forges = surPlateau(X).filter(u => u.fam === 'forge');
    if (palier(fam.forge || 0) === 1 && forges.length) { const f = forges.sort((a, b) => a.a - b.a)[0]; f.bonusA++; res.forge = `${f.n} +1 attaque`; }
    if (palier(fam.forge || 0) === 2) { forges.forEach(f => { f.bonusA++; f.bonusV += 2; }); res.forge = 'toutes les Forges +1 attaque et +2 PV'; }
    if (X.heros === 'maelle') { const d = X.plateau.av.filter(u => u && u.key !== 'capitaine').sort((a, b) => (a.a + a.bonusA) - (b.a + b.bonusA))[0]; if (d) { d.bonusA++; d.bonusV = (d.bonusV || 0) + (globalThis.MAELLE_PV ?? 2); res.maelle = `${d.n} +1 attaque, +${globalThis.MAELLE_PV ?? 2} PV`; } }
    if (esc.type === 'boss') { X.fini = 'gagne'; return res; }
    X.escale++;
  } else {
    X.coeurs--; X.journal.push(`💔 ${esc.n} : défaite, un cœur de moins.`);
    if (X.coeurs <= 0) { X.fini = 'perdu'; return res; }
    if (esc.type !== 'boss') X.escale++; X.or += 2;
  }
  // le port : pièces + intérêts, nouvelle offre (sauf si gelée), Louve de Pip à l'escale 3
  const interet = Math.min(3, Math.floor(X.or / 5)); X.or += 8 + interet; res.gain = 8 + interet + (res.gagne ? 0 : 2); res.interet = interet;
  if (!X.gel) nouvelleOffre(X); X.gel = false; X.transmuOk = true;
  if (X.heros === 'pip' && X.escale === 2 && !toutes(X).some(u => u.key === 'louve')) { const p = placeLibre(X, 'av'); if (p) { poseA(X, p, { id:uid(), key:'louve', n:'La Louve', fam:'ombre', role:'lame', a:3, v:6, star:0, bonusA:0, bonusV:0 }); res.louve = true; X.journal.push('🐺 La Louve rejoint l’équipage !'); } }
  return res;
}

// ----------------------------------------------------------------------------------------------- le pilote (l'ordinateur au port) : fantômes et simulateur
const FAM_PREF = { maelle:'forge', aldric:'garde', pip:'ombre', oria:'forge', gorm:'clan', zephine:null };
function pilotePort(X) {
  const pref = X.famPref || (X.famPref = FAM_PREF[X.heros] || tire(hasardX(X), Object.keys(FAMILLES)));
  for (let tour = 0; tour < 12; tour++) {
    const libre = !!placeLibre(X), n = k => toutes(X).filter(u => u.key === k && u.star === 0).length;
    let best = -1, bs = 0;
    X.offre.forEach((k, i) => { if (!k || prixRecrue(k) > X.or) return; let s = RECRUES[k].fam === pref ? 3 : 1; if (n(k) === 2) s += 6; else if (n(k) === 1) s += 2; if (!libre && n(k) < 2) s = 0; s += RECRUES[k].t * .5; if (s > bs) { bs = s; best = i; } });
    if (best >= 0 && bs >= 2) { achete(X, best); continue; }
    if (!libre) { const faibles = toutes(X).filter(u => u.key !== 'capitaine' && u.fam !== pref && u.star === 0).sort((a, b) => (a.a + a.v) - (b.a + b.v)); if (faibles.length && X.or >= 3) { vend(X, faibles[0].id); continue; } }
    if (X.or >= 5) { relance(X); continue; }
    break;
  }
  for (let t = 0; t < 2 && X.heros === 'zephine' && X.transmuOk; t++) { const u = toutes(X).find(x => x.key !== 'capitaine' && x.fam !== pref); if (u) transmute(X, u.id); }
  rangePlateau(X);
}
// placement automatique : Remparts puis Lames devant, Tireurs et Soutiens derrière ; le capitaine devant au milieu s'il reste de la place
function rangePlateau(X) {
  const tous = [...surPlateau(X), ...X.cale.filter(Boolean)], cap = tous.find(u => u.key === 'capitaine');
  const autres = tous.filter(u => u !== cap).sort((a, b) => (b.a + b.v + b.star * 10) - (a.a + a.v + a.star * 10));
  const devant = autres.filter(u => u.role === 'rempart').concat(autres.filter(u => u.role === 'lame')), derriere = autres.filter(u => u.role === 'tireur' || u.role === 'soutien');
  const P = { av:[null, null, null], ar:[null, null, null] }, cale = [];
  const av = [], ar = [];
  devant.forEach(u => (av.length < 2 ? av : ar.length < 3 && derriere.length < 3 ? ar : cale).push(u));
  derriere.forEach(u => (ar.length < 3 ? ar : cale).push(u));
  av.splice(1, 0, cap);
  while (av.length > 3) cale.push(av.pop());
  av.forEach((u, i) => { P.av[i] = u; }); ar.slice(0, 3).forEach((u, i) => { P.ar[i] = u; }); ar.slice(3).forEach(u => cale.push(u));
  X.plateau = P; X.cale = [0, 1, 2].map(i => cale[i] || null);
}
// une expédition entière jouée par le pilote (simulateur d'équilibrage)
// 14/11 : le pilote donne aussi les ordres du capitaine (comme un joueur raisonnable) : relance les dés faibles, 5-6 sur la meilleure
// Lame de devant, 3-4 sur les attaquants, 1-2 sur le Rempart de devant (ou le capitaine). Sert à l'équilibrage.
function piloteOrdres(X, R) {
  const d = () => 1 + Math.floor(R() * 6); let ds = [d(), d(), d()];
  for (let k = 0; k < 2; k++) ds = ds.map(v => v <= 2 && R() < .7 ? d() : v);
  const crew = [...X.plateau.av.map(u => u && { u, av:true }), ...X.plateau.ar.map(u => u && { u, av:false })].filter(Boolean); if (!crew.length) { X.ordres = null; return; }
  const att = x => (x.u.a + (x.u.bonusA || 0)) * (x.av || x.u.role === 'tireur' ? 1 : .3), u = {};
  [...ds].sort((a, b) => b - a).forEach(v => { const b = v <= 2 ? { v:3 } : v <= 4 ? { a:2 } : { sur:true };
    const cible = v <= 2 ? (crew.find(x => x.av && (x.u.role === 'rempart' || x.u.key === 'capitaine')) || crew[0]) : [...crew].sort((x, y) => att(y) - att(x))[0];
    const o = u[cible.u.id] || (u[cible.u.id] = {}); if (b.a) o.a = (o.a || 0) + b.a; if (b.v) o.v = (o.v || 0) + b.v; if (b.sur) o.sur = true; });
  const s = [...ds].sort((a, b) => a - b), c = s[0] === s[2] ? { a:2 } : s[0] === s[1] || s[1] === s[2] ? { a:1 } : s[1] === s[0] + 1 && s[2] === s[1] + 1 ? { v:3 } : null;
  X.ordres = { u, tous:c ? { a:c.a || 0, v:c.v || 0 } : null };
}
function simuleExpedition(heros, graine) {
  const X = nouvelleExpedition(heros, graine);
  for (let pas = 0; pas < 12 && !X.fini; pas++) { pilotePort(X); piloteOrdres(X, hasardX(X)); joueEscale(X, hasardX(X)); }
  return { gagne:X.fini === 'gagne', coeurs:X.coeurs, escale:X.escale, victoires:X.victoires, fusions:toutes(X).filter(u => u.star).length, fam:compteFamilles(X, X.plateau) };
}

// ----------------------------------------------------------------------------------------------- les choix des pages d'escale (13/11, à l'échelle de la v2)
const CHOIX_EXP2 = {
  crique:   [{ t:'Débarquer en force, torches allumées', d:'Le butin des gobelins : +2 pièces tout de suite.', f:X => { X.or += 2; } },
             { t:'Se faufiler par les rochers à la nuit', d:'Les gobelins dorment à moitié : au prochain combat, ils ont 20 % de PV en moins.', f:X => { X.prochain = { ennemis:.8 }; } }],
  falaises: [{ t:'Hisser toutes les voiles', d:'On fonce sur le navire rival : la rangée de devant a Charge (frappe en premier).', f:X => { X.prochain = { charge:true }; } },
             { t:'Longer la falaise, prudemment', d:'Un nid de mouettes plein de pièces perdues : +2 pièces.', f:X => { X.or += 2; } }],
  port:     [{ t:'Passer à la caserne du port', d:'Un Milicien s’engage gratuitement (s’il reste une place).', f:X => { const p = placeLibre(X, 'av'); if (p) { poseA(X, p, nouvelleRecrue('milicien', 0)); fusionne(X); } } },
             { t:'Une soirée à la taverne', d:'Les marins paient leur tournée : +3 pièces.', f:X => { X.or += 3; } }],
  foret:    [{ t:'Demander l’aide des racines', d:'La forêt choisit ton camp : tout l’équipage +1 attaque pour ce combat.', f:X => { X.prochain = { atq:1 }; } },
             { t:'Cueillir les fruits de la forêt', d:'Ils se vendent bien au port : +2 pièces.', f:X => { X.or += 2; } }],
  cratere:  [{ t:'Contourner la coulée de lave', d:'Les monstres s’épuisent à vous suivre : ils ont 15 % de PV en moins au prochain combat, mais tu perds 2 pièces de matériel brûlé.', f:X => { X.prochain = { ennemis:.85 }; X.or = Math.max(0, X.or - 2); } },
             { t:'Foncer à travers la fumée', d:'Surprise totale : tout l’équipage +1 attaque pour ce combat.', f:X => { X.prochain = { atq:1 }; } }],
  nid:      [{ t:'Graver les runes de la Guilde sur le pont', d:'Tout l’équipage +1 attaque contre le Titan.', f:X => { X.prochain = { atq:1 }; } },
             { t:'Attendre que le Titan s’endorme', d:'Il se réveille engourdi : le Titan a 10 % de PV en moins.', f:X => { X.prochain = { ennemis:.9 }; } }],
};
