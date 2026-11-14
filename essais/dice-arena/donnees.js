// 14/11 (l'utilisateur : « la créature cachée, je ne la vois pas, la carte qui révèle n'a rien révélé ») : la révélation se dit dans le journal
function reveleCachees(J) { const l = (adv(J).front || []).filter(u => u.cachee); l.forEach(u => { u.cachee = false; }); if (typeof log === 'function') log(l.length ? `👁 Révélé : ${l.map(u => u.n).join(', ')}.` : '👁 Aucune créature cachée à révéler.'); }
// La Guilde des Runes · DONNÉES des héros et des cartes (partagées par le Duel et la page des fiches ; plus tard PvE, coopération, auto-battler).
// Chiffres de référence : ~/perso/dice-arena/Equilibrage-personnages.md — à tenir à jour à CHAQUE changement.
// =====================================================================================================
// La Guilde des Runes · Duel (prototype v2, 09/11/2026) — 6 héros.
// Les HÉROS sont des fiches de DONNÉES (PV, couleur, garde, pouvoir, ultime, deck) séparées des RÈGLES (moteur plus bas),
// pour pouvoir les réutiliser plus tard dans d'autres modes (PvE, coopération, auto-battler).
// Chiffres de référence : ~/perso/dice-arena/Equilibrage-personnages.md (à tenir à jour à chaque changement).
// =====================================================================================================
const IMG = id => `portraits/${id}.webp`;
const FACE = (id, v) => `faces-${id}/face-${v}.webp`;
const vals = ds => ds.map(d => d.v);
const egaux = vs => vs.length > 1 && vs.every(v => v === vs[0]);
const suite = (vs, n) => { if (vs.length !== n) return false; const s = [...vs].sort((a, b) => a - b); return s.every((v, i) => i === 0 || v === s[i - 1] + 1); };
const compte = vs => { const m = {}; vs.forEach(v => m[v] = (m[v] || 0) + 1); return Object.values(m).sort((a, b) => b - a); };
const un = vs => vs.length === 1;
const pair = v => v % 2 === 0;
const somme = vs => vs.reduce((a, b) => a + b, 0);
const opp = v => 7 - v;

// ------------------------------------------------------------------------------------------- cartes
// t : u (unité), s (sort), e (équipement), r (réaction posée en Garde)
// cond(vs, ds) · f(J, vs, k, ds) · cible : ennemi | uniteE | allie | uniteA | barriereA | de · ia(J, vs) = intérêt pour l'ordinateur
const CARTES = {
  // ---- Aldric
  ecuyer:   { n:'Écuyer au pavois', t:'u', c:2, txt:'dé pair', d:'Unité 2 / 5, Barrière.', cond:vs => un(vs) && pair(vs[0]), u:{ n:'Écuyer', a:2, v:5, barriere:true } },
  lanterne: { n:'Lanterne runique', t:'s', c:1, txt:'1 dé', d:'Révèle les unités Cachées ; soigne ton héros de 2 (de la valeur si le dé est pair).', cond:un, f:(J, vs) => { reveleCachees(J); soin(J, pair(vs[0]) ? vs[0] : 2); }, ia:J => J.pv < J.pvMax * .7 ? 30 : 6 },
  serment:  { n:'Serment', t:'s', c:1, txt:'2 dés identiques', d:'Soigne ton héros de leur somme.', cond:vs => vs.length === 2 && egaux(vs), f:(J, vs) => soin(J, somme(vs)), ia:J => J.pv < J.pvMax * .7 ? 38 : 4 },
  estocade: { n:'Estocade royale', t:'s', c:2, txt:'3 dés qui se suivent', d:'9 dégâts à une cible.', cond:vs => suite(vs, 3), cible:'ennemi', f:(J, vs, k) => degats(k, 9), ia:() => 45 },
  gardien:  { n:'Gardien de la porte', t:'u', c:3, txt:'2 dés identiques', d:'Unité 3 / 7, Barrière. +1 PC quand il est attaqué.', cond:vs => vs.length === 2 && egaux(vs), u:{ n:'Gardien', a:3, v:7, barriere:true, gardien:true } },
  banniere: { n:'Bannière de l’aube', t:'e', c:2, txt:'dé pair', d:'Tes unités Barrière ont +2 attaque.', cond:vs => un(vs) && pair(vs[0]), f:J => { J.banniere = true; log(`${J.nom} lève la Bannière de l’aube.`); }, ia:J => J.banniere ? 0 : 12 + 8 * J.front.filter(u => u.barriere).length },
  contre:   { n:'Contre-attaque', t:'r', c:1, txt:'dé = 6', d:'Garde : la 1re CRÉATURE qui t’attaque subit d’abord 6 dégâts (pas le héros adverse). Dure jusqu’à ton prochain tour.', cond:vs => un(vs) && vs[0] === 6, f:J => { J.contre = true; }, ia:J => adv(J).front.length ? 26 : 2 },
  releve:   { n:'Relève de la garde', t:'s', c:0, txt:'dé ≤ 2', d:'Rends toute sa vie à une de tes unités Barrière.', cond:vs => un(vs) && vs[0] <= 2, cible:'barriereA', f:(J, vs, k) => { k.u.v = k.u.vmax; log(`${k.u.n} retrouve toute sa vie.`); }, ia:J => J.front.some(u => u.barriere && u.v < u.vmax - 2) ? 22 : 0 },
  // ---- Pip
  ronces:   { n:'Pousse de ronces', t:'u', c:1, txt:'dé ≤ 2', d:'Unité 0 / 4, Barrière, Épines 1.', cond:vs => un(vs) && vs[0] <= 2, u:{ n:'Ronces', a:0, v:4, barriere:true, epines:1 } },
  seve:     { n:'Sève guérisseuse', t:'s', c:1, txt:'dé ≤ 3', d:'Soigne 2 fois la valeur (héros ou unité).', cond:vs => un(vs) && vs[0] <= 3, cible:'allie', f:(J, vs, k) => soinCible(k, vs[0] * 2), ia:J => J.pv < J.pvMax * .7 ? 32 : 5 },
  racines:  { n:'Racines entravantes', t:'s', c:2, txt:'3 dés qui se suivent', d:'7 dégâts. Une unité touchée est Entravée.', cond:vs => suite(vs, 3), cible:'ennemi', f:(J, vs, k) => { if (k.u) k.u.entrave = true; degats(k, 7); }, ia:() => 42 },
  purif:    { n:'Purification', t:'s', c:0, txt:'1 dé', d:'Retire Saignement, Poison et Handicap de ton héros.', cond:un, f:J => { J.saigne = 0; J.poison = 0; J.souillure = 0; J.handicap = 0; log(`${J.nom} se purifie.`); }, ia:J => (J.saigne || J.poison || J.handicap) ? 30 : 0 },
  hurlement:{ n:'Hurlement', t:'s', c:1, txt:'dé = 1', d:'+1 marqueur de Meute.', cond:vs => un(vs) && vs[0] === 1, f:J => ajouteMeute(J, 1), ia:J => J.front.some(u => u.louve) ? 0 : 30 },
  faon:     { n:'Faon des clairières', t:'u', c:2, txt:'dé ≤ 3', d:'Unité 2 / 3. À son arrivée, soigne ton héros de 3.', cond:vs => un(vs) && vs[0] <= 3, u:{ n:'Faon', a:2, v:3 }, f:J => soin(J, 3) },
  lien:     { n:'Lien de la meute', t:'e', c:1, txt:'dé ≤ 2', d:'La Louve a +2 attaque. Sans Louve : +1 marqueur.', cond:vs => un(vs) && vs[0] <= 2, f:J => { const l = J.front.find(u => u.louve); if (l) { l.a += 2; log('La Louve gagne +2 attaque.'); } else ajouteMeute(J, 1); }, ia:() => 28 },
  rosee:    { n:'Rosée', t:'s', c:0, txt:'dé = 1', d:'Pioche 1 carte.', cond:vs => un(vs) && vs[0] === 1, f:J => pioche(J, 1), ia:() => 20 },
  // ---- Maëlle
  marteau:  { n:'Marteau de forge', t:'s', c:2, txt:'dé = 6', d:'10 dégâts à une cible.', cond:vs => un(vs) && vs[0] === 6, cible:'ennemi', f:(J, vs, k) => degats(k, 10), ia:() => 50 },
  lame:     { n:'Lame trempée', t:'e', c:1, txt:'dé ≥ 4', d:'Une de tes unités gagne + la valeur du dé en attaque.', cond:vs => un(vs) && vs[0] >= 4, cible:'uniteA', f:(J, vs, k) => { k.u.a += vs[0]; log(`${k.u.n} : +${vs[0]} attaque.`); }, ia:(J, vs) => J.front.length ? 20 + vs[0] * 3 : 0 },
  apprenti: { n:'Apprenti du soufflet', t:'u', c:2, txt:'1 dé', d:'Unité 2 / 3. Chaque carte jouée avec un 6 donne 1 Braise de plus.', cond:un, u:{ n:'Apprenti', a:2, v:3, apprenti:true } },
  plastron: { n:'Plastron rivé', t:'e', c:2, txt:'dé ≥ 5', d:'Une de tes unités : +5 vie et Barrière.', cond:vs => un(vs) && vs[0] >= 5, cible:'uniteA', f:(J, vs, k) => { k.u.v += 5; k.u.vmax += 5; k.u.barriere = true; log(`${k.u.n} : +5 vie et Barrière.`); }, ia:J => J.front.length ? 30 : 0 },
  etincelles:{ n:'Étincelles', t:'s', c:0, txt:'dé ≤ 2', d:'2 dégâts à chaque unité adverse.', cond:vs => un(vs) && vs[0] <= 2, f:J => { [...adv(J).front].forEach(u => degats({ J:adv(J), u }, 2)); }, ia:J => adv(J).front.length * 12 },
  golem:    { n:'Golem de bronze', t:'u', c:4, txt:'dé = 6', d:'Unité 5 / 8, Barrière.', cond:vs => un(vs) && vs[0] === 6, u:{ n:'Golem', a:5, v:8, barriere:true } },
  retremper:{ n:'Retremper', t:'s', c:1, txt:'1 dé', d:'Un autre de tes dés (tu le choisis) gagne +2 (6 au plus).', cond:un, cible:'de', f:(J, vs, k) => { const d = (k && k.d && !k.d.pose) ? k.d : J.des.filter(x => !x.pose).sort((a, b) => a.v - b.v)[0]; if (d) { const a = d.v; modifie(J, d, Math.min(6, d.v + 2)); log(`${J.nom} retrempe un dé : ${a} devient ${d.v}.`); } }, ia:() => 8 },
  fournaise:{ n:'Fournaise', t:'r', c:1, txt:'dé ≥ 5', d:'Garde : la prochaine fois que ton héros est blessé, l’adversaire perd la moitié de ces dégâts.', cond:vs => un(vs) && vs[0] >= 5, f:J => { J.fournaise = true; }, ia:() => 18 },
  // ---- Oria
  longuevue:{ n:'Longue-vue', t:'s', c:0, txt:'1 dé', d:'Pioche 1 carte. (Tu vois déjà les prochaines faces de tes dés.)', cond:un, f:J => pioche(J, 1), ia:() => 18 },
  raccourci:{ n:'Raccourci', t:'s', c:1, txt:'dé impair', d:'Relance un de tes dés libres, même si ta relance est déjà utilisée.', cond:vs => un(vs) && !pair(vs[0]), f:J => { J.relance++; log(`${J.nom} gagne une relance.`); }, ia:() => 6 },
  fleche:   { n:'Flèche de repérage', t:'s', c:1, txt:'dé impair', d:'7 dégâts à une cible et révèle les unités Cachées.', cond:vs => un(vs) && !pair(vs[0]), cible:'ennemi', f:(J, vs, k) => { reveleCachees(J); degats(k, 7); }, ia:() => 36 },
  guetteur: { n:'Guetteur du col', t:'u', c:2, txt:'dé pair', d:'Unité 2 / 6, Barrière.', cond:vs => un(vs) && pair(vs[0]), u:{ n:'Guetteur', a:2, v:6, barriere:true } },
  tresor:   { n:'Carte au trésor', t:'s', c:1, txt:'dé ≤ 3', d:'Pioche 2 cartes.', cond:vs => un(vs) && vs[0] <= 3, f:J => pioche(J, 2), ia:J => J.main.length < 5 ? 28 : 8 },
  boussole: { n:'Boussole runique', t:'e', c:2, txt:'2 dés qui se suivent', d:'Une relance de plus à chacun de tes tours.', cond:vs => suite(vs, 2), f:J => { J.boussole = true; log(`${J.nom} sort sa Boussole runique.`); }, ia:J => J.boussole ? 0 : 24 },
  eclaireuse:{ n:'Éclaireuse', t:'u', c:2, txt:'1 dé', d:'Unité 3 / 3, Cachée.', cond:un, u:{ n:'Éclaireuse', a:3, v:3, cachee:true } },
  piege:    { n:'Piège à mâchoires', t:'r', c:1, txt:'dé = 3', d:'Garde : la 1re unité qui attaque subit 3 dégâts et est Entravée.', cond:vs => un(vs) && vs[0] === 3, f:J => { J.piege = true; }, ia:J => adv(J).front.length ? 24 : 2 },
  detour:   { n:'Détour', t:'s', c:2, txt:'3 dés qui se suivent', d:'Renvoie une unité adverse dans la main de son joueur.', cond:vs => suite(vs, 3), cible:'uniteE', f:(J, vs, k) => renvoie(k), ia:J => adv(J).front.length ? 30 + Math.max(...adv(J).front.map(u => u.v)) : 0 },
  vol:      { n:'Vol de provisions', t:'s', c:1, txt:'dé = 6', d:'Vole 1 PC à l’adversaire.', cond:vs => un(vs) && vs[0] === 6, f:J => { const D = adv(J); if (D.pc) { D.pc--; J.pc = Math.min(6, J.pc + 1); log(`${J.nom} vole 1 PC.`); } }, ia:J => adv(J).pc ? 14 : 0 },
  // ---- Gorm
  grave:    { n:'Note grave', t:'s', c:1, txt:'dé pair', d:'Chacune de tes créatures gagne de la vie : la moitié du dé (6 → +3 ❤), pour toute la partie.', cond:vs => un(vs) && pair(vs[0]), f:(J, vs) => { J.front.forEach(u => { u.v += vs[0] / 2; u.vmax += vs[0] / 2; }); log('Note grave : tes unités se renforcent.'); }, ia:(J, vs) => J.front.length * vs[0] * 2 },
  aigue:    { n:'Note aiguë', t:'s', c:0, txt:'dé impair', d:'Une unité gagne + la valeur du dé en attaque ce tour.', cond:vs => un(vs) && !pair(vs[0]), cible:'uniteA', f:(J, vs, k) => { k.u.tmp = (k.u.tmp || 0) + vs[0]; log(`${k.u.n} : +${vs[0]} attaque ce tour.`); }, ia:(J, vs) => J.front.some(u => u.pret) ? 14 + vs[0] * 4 : 0 },
  echo:     { n:'Écho', t:'s', c:1, txt:'1 dé', d:'Rejoue l’effet du dernier Sort que tu as joué ce tour (pas une créature).', cond:un, f:J => { const e = J.dernierSort; if (!e || ['distil', 'precipite', 'fiole', 'chance', 'retremper'].includes(e.key)) return; log(`Écho : ${CARTES[e.key].n} une nouvelle fois.`); const c = CARTES[e.key]; const k2 = c.cible ? cibleValide(J, e.k, c.cible) : null; if (c.cible && !k2) return; c.f(J, e.vs, k2, []); }, ia:J => J.dernierSort ? 30 : 0 },
  tambour:  { n:'Tambour de clan', t:'u', c:2, txt:'dé pair', d:'Unité 2 / 4. Tes autres unités ont +1 attaque.', cond:vs => un(vs) && pair(vs[0]), u:{ n:'Tambour', a:2, v:4, tambour:true } },
  flute:    { n:'Joueuse de flûte', t:'u', c:2, txt:'dé impair', d:'Unité 3 / 3. À son arrivée, une autre de tes unités peut attaquer tout de suite.', cond:vs => un(vs) && !pair(vs[0]), u:{ n:'Flûtiste', a:3, v:3 }, f:J => { const u = J.front.find(x => !x.pret && x.n !== 'Flûtiste'); if (u) { u.pret = true; log(`${u.n} peut attaquer tout de suite.`); } } },
  colosse:  { n:'Colosse des collines', t:'u', c:4, txt:'dé = 6', d:'Unité 7 / 9, Charge.', cond:vs => un(vs) && vs[0] === 6, u:{ n:'Colosse', a:7, v:9, charge:true } },
  trancheV: { n:'Tranche-vent', t:'s', c:2, txt:'3, 4 ou 5 identiques', d:'7, 10 ou 15 dégâts à une cible.', cond:vs => vs.length >= 3 && egaux(vs), cible:'ennemi', f:(J, vs, k) => degats(k, [0, 0, 0, 7, 10, 15][vs.length]), ia:(J, vs) => 40 + vs.length * 10 },
  cor:      { n:'Cor de ralliement', t:'r', c:1, txt:'dé pair', d:'Garde : la 1re de tes unités qui devrait tomber reste à 1 vie.', cond:vs => un(vs) && pair(vs[0]), f:J => { J.cor = true; }, ia:J => J.front.length ? 16 : 0 },
  // ---- Zéphine
  fiole:    { n:'Fiole d’inversion', t:'s', c:0, txt:'1 dé', d:'Retourne un autre de tes dés sur sa face opposée.', cond:un, cible:'de', f:(J, vs, k) => { modifie(J, k.d, opp(k.d.v)); }, ia:() => 10 },
  soufre:   { n:'Poudre de soufre', t:'s', c:1, txt:'1 dé', d:'Poison égal à la valeur du dé sur le héros adverse.', cond:un, f:(J, vs) => altere(adv(J), 'poison', vs[0]), ia:(J, vs) => 10 + vs[0] * 6 },
  distil:   { n:'Distillation', t:'s', c:1, txt:'2 dés', d:'Les fond en un seul dé libre égal à leur somme (6 au plus).', cond:vs => vs.length === 2, f:(J, vs, k, ds) => { ds[0].pose = false; modifie(J, ds[0], Math.min(6, somme(vs))); }, ia:(J, vs) => somme(vs) >= 5 ? 9 : 0 },
  precipite:{ n:'Précipité', t:'s', c:1, txt:'dé = 6', d:'Coupe ce dé en deux dés libres de 3.', cond:vs => un(vs) && vs[0] === 6, f:(J, vs, k, ds) => { ds[0].pose = false; modifie(J, ds[0], 3); const n = { v:3, sac:[], pose:false, mod:true, extra:true }; J.des.push(n); }, ia:() => 4 },
  homoncule:{ n:'Homoncule', t:'u', c:2, txt:'1 dé modifié ce tour', d:'Unité 3 / 4, Cachée. Ses attaques sur le héros donnent Poison 2.', cond:(vs, ds) => un(vs) && ds && ds[0] && ds[0].mod, u:{ cachee:true, n:'Homoncule', a:3, v:4, poisonneur:true } },
  brume:    { n:'Brume aveuglante', t:'s', c:2, txt:'dé impair', d:'Handicap : l’adversaire lance 1 dé de moins à son prochain tour.', cond:vs => un(vs) && !pair(vs[0]), f:J => altere(adv(J), 'handicap'), ia:() => 32 },
  catalyseur:{ n:'Catalyseur', t:'e', c:2, txt:'dé pair', d:'Chaque fois que tu modifies un dé, 1 dégât au héros adverse.', cond:vs => un(vs) && pair(vs[0]), f:J => { J.catalyseur = true; log(`${J.nom} installe le Catalyseur.`); }, ia:J => J.catalyseur ? 0 : 24 },
  paillasse:{ n:'Paillasse renversée', t:'r', c:1, txt:'dé ≤ 2', d:'Garde : dès qu’une unité t’attaque, le héros adverse reçoit Poison 3.', cond:vs => un(vs) && vs[0] <= 2, f:J => { J.paillasse = true; }, ia:J => adv(J).front.length ? 20 : 2 },
  // ---- la Guilde (tous)
  // Duel grand public (11/11) : les anciens achats en PC « +1 / −1 » et « Premiers soins » deviennent des cartes de la Guilde
  ajuste:   { n:'Pierre d’ajustement', t:'s', c:0, txt:'1 dé', d:'Un autre de tes dés gagne +1 ou −1 (tu choisis).', cond:un, cible:'de', f:(J, vs, k) => { const a = k.d.v, v = Math.max(1, Math.min(6, a + (k.sens || 1))); modifie(J, k.d, v); log(`${J.nom} ajuste un dé : ${a} devient ${v}.`); },
    // l'ordinateur la joue si changer un autre dé de ±1 améliore nettement son meilleur coup (il retient le dé et le sens)
    ia:(J, vs, ds) => { if (typeof meilleurCoup !== 'function' || J._dansAjuste) return 0; J._dansAjuste = true; const pris = ds && ds[0]; const libres = J.des.filter(d => !d.pose && d !== pris); if (pris) pris.pose = true;
      const avant = (meilleurCoup(J) || { score:0 }).score; let mieux = null;
      libres.forEach(d => [-1, 1].forEach(sens => { const v = d.v + sens; if (v < 1 || v > 6) return; const a = d.v; d.v = v; const sc = (meilleurCoup(J) || { score:0 }).score; d.v = a; if (sc >= avant + 15 && (!mieux || sc > mieux.sc)) mieux = { d, sens, sc }; }));
      if (pris) pris.pose = false; J._dansAjuste = false; J._ajuste = mieux; return mieux ? 20 + (mieux.sc - avant) / 2 : 0; } },
  soins:    { n:'Premiers soins', t:'s', c:1, txt:'1 dé', d:'Retire Poison, Saignement et Handicap de ton héros, puis le soigne de 2.', cond:un, f:J => { J.poison = 0; J.souillure = 0; J.saigne = 0; J.handicap = 0; soin(J, 2); log(`${J.nom} : Premiers soins, plus aucune altération.`); }, ia:J => (J.poison + J.saigne * 2 + (J.handicap ? 3 : 0)) >= 4 ? 40 : 0 },
  cape:     { n:'Cape d’ombre', t:'e', c:1, txt:'dé ≤ 3', d:'Une de tes unités devient Cachée et gagne +1 attaque.', cond:vs => un(vs) && vs[0] <= 3, cible:'uniteA', f:(J, vs, k) => { if (k && k.u) { k.u.cachee = true; k.u.a += 1; log(`🌑 ${k.u.n} devient Cachée (+1 attaque) : l’adversaire ne la voit plus (carte « ? »), sa prochaine attaque fera +2 (Embuscade) et la révélera.`); } }, ia:J => J.front.some(u => !u.cachee && !u.louve) ? 20 : 0 },
  lynx:     { n:'Lynx des fourrés', t:'u', c:2, txt:'dé ≤ 3', d:'Unité 3 / 2, Cachée.', cond:vs => un(vs) && vs[0] <= 3, u:{ n:'Lynx des fourrés', a:3, v:2, cachee:true } },
  renard:   { n:'Renard du col', t:'u', c:1, txt:'1 dé', d:'Unité 2 / 3, Cachée.', cond:un, u:{ n:'Renard du col', a:2, v:3, cachee:true } },
  potion:   { n:'Potion de soin', t:'s', c:1, txt:'1 dé', d:'Soigne ton héros de la valeur + 2.', cond:un, f:(J, vs) => soin(J, vs[0] + 2), ia:J => J.pv < J.pvMax * .7 ? 30 : 4 },
  milicien: { n:'Milicien', t:'u', c:1, txt:'dé ≤ 3', d:'Unité 2 / 2.', cond:vs => un(vs) && vs[0] <= 3, u:{ n:'Milicien', a:2, v:2 } },
  chien:    { n:'Chien de garde', t:'u', c:2, txt:'1 dé', d:'Unité 2 / 3, Barrière.', cond:un, u:{ n:'Chien', a:2, v:3, barriere:true } },
  pierre:   { n:'Pierre à aiguiser', t:'e', c:1, txt:'1 dé', d:'Une de tes unités : +2 attaque.', cond:un, cible:'uniteA', f:(J, vs, k) => { k.u.a += 2; log(`${k.u.n} : +2 attaque.`); }, ia:J => J.front.length ? 20 : 0 },
  rond:     { n:'Bouclier rond', t:'s', c:0, txt:'dé pair', d:'Bouclier = la valeur du dé. Il s’ajoute à ta Garde et reste jusqu’à être usé, même après ton tour.', cond:vs => un(vs) && pair(vs[0]), f:(J, vs) => { J.bouclier += vs[0]; log(`${J.nom} : Bouclier ${vs[0]}.`); }, ia:(J, vs) => 6 + vs[0] * 2 },
  torche:   { n:'Torche', t:'s', c:1, txt:'dé ≥ 4', d:'4 dégâts à une créature adverse (pas au héros) et révèle les Cachées.', cond:vs => un(vs) && vs[0] >= 4, cible:'uniteE', f:(J, vs, k) => { reveleCachees(J); degats(k, 4); }, ia:J => adv(J).front.length ? 34 : 0 },
  chance:   { n:'Coup de chance', t:'s', c:0, txt:'dé = 1', d:'Relance tes 2 dés libres les plus faibles.', cond:vs => un(vs) && vs[0] === 1, f:J => { const l = J.des.filter(d => !d.pose).sort((a, b) => a.v - b.v).slice(0, 2); l.forEach(d => lance(J, d)); log(`${J.nom} relance ${l.length} dé(s).`); }, ia:() => 4 },
  parchemin:{ n:'Parchemin d’étude', t:'s', c:1, txt:'dé impair', d:'Pioche 1 carte et gagne 1 PC.', cond:vs => un(vs) && !pair(vs[0]), f:J => { pioche(J, 1); J.pc = Math.min(6, J.pc + 1); }, ia:() => 22 },
};
const GUILDE = ['potion', 'soins', 'chien', 'pierre', 'rond', 'torche', 'ajuste', 'parchemin', 'cape'];  // 11/11 : soins à la place du Milicien, ajuste à la place de Coup de chance

// ------------------------------------------------------------------------------------------- héros (données)
const HEROS = {
  maelle: { hist:'Fille d’un forgeron des montagnes, elle a forgé son premier marteau à dix ans. Aucune arme de la Guilde ne reste cassée longtemps.', cit:'« Ce qui est forgé ne casse pas. »', role:'Frappe fort et équipe ses unités. Aime les gros dés (5 et 6).', papier:'Repris du jeu papier : les gros coups de Grom (Tranche-chair) et le « Retour » de Peau épaisse, devenu la Fournaise.', nom:'Maëlle', titre:'la forgeronne', c:'#ff8a2a', pv:44,
    deck:['marteau', 'marteau', 'lame', 'apprenti', 'apprenti', 'plastron', 'etincelles', 'etincelles', 'golem', 'golem', 'retremper', 'fournaise'],
    passif:'Métal chaud : chaque fois que tu joues une CARTE avec un dé de 6, tu gagnes 1 Braise. À 3 Braises, ta prochaine carte Équipement ne coûte rien.',
    garde:{ n:'Enclume', txt:'1 dé', d:'Bouclier égal à la valeur, +2 si c’est un 5 ou un 6.', cond:un, val:vs => vs[0] + (vs[0] >= 5 ? 2 : 0),
      f:(J, vs) => { const b = vs[0] + (vs[0] >= 5 ? 2 : 0); J.gardeB += b; log(`${J.nom} : Enclume, Bouclier ${b}.`); } },
    pouvoir:{ n:'Coup d’enclume', txt:'3 dés identiques', d:'Dégâts égaux à leur somme.', cond:vs => vs.length === 3 && egaux(vs), cible:'ennemi', f:(J, vs, k) => degats(k, somme(vs)) },
    ultime:{ n:'Le Grand Martelage', txt:'3 dés de 4 ou plus', d:'16 dégâts à une cible ; tes unités gagnent +2 attaque.', cond:vs => vs.length === 3 && vs.every(v => v >= 4), cible:'ennemi',
      f:(J, vs, k) => { degats(k, 16); J.front.forEach(u => u.a += 2); } } },
  aldric: { hist:'Dernier chevalier de la Lanterne, il garde la porte de la Guilde jour et nuit. On dit que sa flamme ne s’est jamais éteinte, même sous l’orage.', cit:'« Tant que la flamme brille, personne ne passe. »', role:'Protège : murs d’unités Barrière, boucliers, soins. Aime les paires.', papier:'Repris de Gilgamesh : Parade de fer, Mur de lumière, le jeton de Pureté et l’Ultime qui sonne l’adversaire.', nom:'Sire Aldric', titre:'le chevalier-lanterne', c:'#ffd27a', pv:47,
    deck:['ecuyer', 'ecuyer', 'lanterne', 'serment', 'serment', 'estocade', 'estocade', 'gardien', 'gardien', 'banniere', 'contre', 'releve'],
    passif:'Pureté : poser deux 6 dans le même tour donne un jeton (2 au plus) qui annule la prochaine altération.',
    garde:{ n:'Parade de fer', txt:'1 ou 2 dés', d:'Une paire : Bouclier = valeur × 2. Sinon : le plus haut dé.', cond:vs => vs.length <= 2, val:vs => vs.length === 2 && egaux(vs) ? vs[0] * 2 : Math.max(...vs),
      f:(J, vs) => { const b = vs.length === 2 && egaux(vs) ? vs[0] * 2 : Math.max(...vs); J.gardeB += b; log(`${J.nom} : Parade de fer, Bouclier ${b}.`); } },
    pouvoir:{ n:'Mur de lumière', txt:'deux paires (4 dés)', d:'Dégâts = 2 × ta plus haute paire + 1 ; tes unités gagnent Barrière, un Bouclier de cette valeur et peuvent attaquer tout de suite.', cond:vs => vs.length === 4 && compte(vs)[0] === 2 && compte(vs)[1] === 2, cible:'ennemi',
      f:(J, vs, k) => { const h = Math.max(...vs); degats(k, h * 2 + 1); J.front.forEach(u => { u.barriere = true; u.bouclier = (u.bouclier || 0) + h; u.pret = true; }); } },
    ultime:{ n:'La Lame de l’Aube', txt:'3 dés identiques', d:'16 dégâts à une cible et Handicap.', cond:vs => vs.length === 3 && egaux(vs), cible:'ennemi',
      f:(J, vs, k) => { degats(k, 16); altere(adv(J), 'handicap'); } } },
  pip: { hist:'Élevée par les arbres de la forêt, Pip a soigné une petite louve blessée un soir d’hiver. Depuis, elles ne se quittent plus.', cit:'« La forêt répond à qui l’écoute. »', role:'Soigne, bloque avec les ronces et appelle sa louve. Ses cartes aiment les petits dés (1 à 3).', papier:'Reprise de la Druidesse : la Jauge de Meute, la Louve et ses 3 dés, Sève vitale, Racines entravantes, Écorce bénie, Purification.', nom:'Pip', titre:'la druidesse et sa louve', c:'#c58bff', pv:35,
    deck:['ronces', 'ronces', 'seve', 'seve', 'racines', 'racines', 'purif', 'hurlement', 'faon', 'faon', 'lien', 'lynx'],
    passif:'L’Appel de l’Alpha : chaque 6 lancé pose un marqueur de Meute. À 3, la Louve (4 / 7) arrive et attaque seule à la fin de chacun de tes tours.',
    garde:{ n:'Écorce bénie', txt:'1 dé', d:'Un 1 ou un 2 : Épines 3. Sinon : Bouclier = la valeur.', cond:un, val:vs => vs[0] <= 2 ? 4 : vs[0],
      f:(J, vs) => { if (vs[0] <= 2) { J.gardeE += 3; log(`${J.nom} : Écorce bénie, Épines 3.`); } else { J.gardeB += vs[0]; log(`${J.nom} : Écorce bénie, Bouclier ${vs[0]}.`); } } },
    pouvoir:{ n:'Appel de la Louve', txt:'4 dés de 4 ou 5', d:'7 dégâts à une cible, Bouclier 3 et +1 marqueur de Meute.', cond:vs => vs.length === 4 && vs.every(v => v === 4 || v === 5), cible:'ennemi',
      f:(J, vs, k) => { degats(k, 7); J.bouclier += 3; ajouteMeute(J, 1); } },
    ultime:{ n:'L’Éveil du Grand Arbre', txt:'3 dés de 3 ou moins', d:'Ton héros se soigne de 15 et tes unités retrouvent toute leur vie.', cond:vs => vs.length === 3 && vs.every(v => v <= 3),
      f:J => { soin(J, 15); J.front.forEach(u => u.v = u.vmax); } } },
  oria: { hist:'Elle a dessiné la carte de chaque île de l’Odyssée. On raconte qu’elle devine où tombera un dé avant même qu’il roule.', cit:'« Je sais déjà ce qui vient. »', role:'Contrôle : voit ses prochaines faces, pioche, renvoie les unités. Aime les suites.', papier:'Repris d’Expérience 626 : la Prémonition (voir à l’avance), Téléportation qui vole des PC, et l’Ultime qui fait taire l’adversaire.', nom:'Oria', titre:'la cartographe', c:'#5ff5e6', pv:42,
    deck:['longuevue', 'fleche', 'fleche', 'tresor', 'guetteur', 'boussole', 'eclaireuse', 'eclaireuse', 'piege', 'detour', 'renard', 'vol'],
    passif:'Œil du cartographe : tu vois les 2 prochaines faces de chacun de tes dés.',
    garde:{ n:'Repli', txt:'1 dé', d:'Dé impair : Esquive (les prochains dégâts sont divisés par 2). Dé pair : Bouclier = la valeur.', cond:un, val:vs => pair(vs[0]) ? vs[0] : 6,
      f:(J, vs) => { if (pair(vs[0])) { J.gardeB += vs[0]; log(`${J.nom} : Repli, Bouclier ${vs[0]}.`); } else { J.esquive = true; log(`${J.nom} : Repli, Esquive.`); } } },
    pouvoir:{ n:'Tracé parfait', txt:'4 dés qui se suivent', d:'Choisis la prochaine face d’un de tes dés, pioche 2 cartes et inflige 12 dégâts.', cond:vs => suite(vs, 4), cible:'ennemi',
      f:(J, vs, k) => { degats(k, 12); pioche(J, 2); choisirFace(J); } },
    ultime:{ n:'La Carte du monde', txt:'3 dés qui se suivent', d:'15 dégâts à une cible et Silence (pas de Sort au prochain tour adverse).', cond:vs => suite(vs, 3), cible:'ennemi',
      f:(J, vs, k) => { degats(k, 15); adv(J).silence = true; log(`${adv(J).nom} est réduit au Silence.`); } } },
  gorm: { hist:'Ce géant au cœur tendre sonne le grand cor de la Guilde. Quand il souffle, même les plus fatigués se relèvent.', cit:'« Un souffle, et toute la guilde se lève. »', role:'Soutien : renforce toutes ses unités d’un coup. Joue sur les dés pairs ou impairs.', papier:'Repris de Grom : Cri de guerre plus fort quand on a moins de PV, Peau épaisse et son Retour, Tranche-chair devenu Tranche-vent.', nom:'Gorm', titre:'le sonneur de cor', c:'#4f8bff', pv:49,
    deck:['grave', 'grave', 'aigue', 'aigue', 'echo', 'tambour', 'tambour', 'flute', 'colosse', 'trancheV', 'trancheV', 'cor'], // 14/11 : essai d'une 2e Joueuse de flûte ANNULÉ (Gorm 58 % au simulateur) ; la main de départ garantit une créature
    passif:'Second souffle : quand tes PV sont plus bas que ceux de l’adversaire, ton Pouvoir donne +2 attaque de plus.',
    garde:{ n:'Peau épaisse', txt:'1 ou 2 dés', d:'Bouclier = somme des dés impairs ; chaque 6 donne Épines 2.', cond:vs => vs.length <= 2, val:vs => somme(vs.filter(v => !pair(v))) + 2 * vs.filter(v => v === 6).length,
      f:(J, vs) => { const b = somme(vs.filter(v => !pair(v))), e = 2 * vs.filter(v => v === 6).length; J.gardeB += b; J.gardeE += e; log(`${J.nom} : Peau épaisse${b ? `, Bouclier ${b}` : ''}${e ? `, Épines ${e}` : ''}.`); } },
    pouvoir:{ n:'Chant de guerre', txt:'4 dés tous pairs ou tous impairs', d:'10 dégâts au héros adverse ; tes unités gagnent +2 attaque ce tour (+4 si tu as moins de PV) et peuvent attaquer tout de suite.', cond:vs => vs.length === 4 && (vs.every(pair) || vs.every(v => !pair(v))),
      f:J => { const b = J.pv < adv(J).pv ? 4 : 2; degats({ J:adv(J) }, 10); J.front.forEach(u => { u.tmp = (u.tmp || 0) + b; u.pret = true; }); log(`Chant de guerre : +${b} attaque à tes unités.`); } },
    ultime:{ n:'Le Grand Souffle', txt:'3 dés tous pairs ou tous impairs', d:'14 dégâts au héros adverse et 4 à chacune de ses unités.', cond:vs => vs.length === 3 && (vs.every(pair) || vs.every(v => !pair(v))),
      f:J => { const D = adv(J); [...D.front].forEach(u => degats({ J:D, u }, 4)); degats({ J:D }, 14); } } },
  zephine: { hist:'Alchimiste un peu folle, elle transforme tout ce qu’elle touche : le plomb, les potions… et parfois même ses propres dés.', cit:'« Rien ne se perd, tout se transforme. »', role:'Transforme les dés et empoisonne. Aime tous les dés, à condition de les changer.', papier:'Repris de Blanche et de Fez : le Handicap de Vol acrobatique devient la Brume aveuglante ; l’esquive et le camouflage deviennent la Fumée.', nom:'Zéphine', titre:'l’alchimiste', c:'#ff4040', pv:44,
    deck:['fiole', 'fiole', 'soufre', 'soufre', 'distil', 'precipite', 'homoncule', 'homoncule', 'brume', 'catalyseur', 'paillasse', 'soufre'],
    passif:'Transmutation : une fois par tour, gratuitement, retourne un dé sur sa face opposée (1↔6, 2↔5, 3↔4). Et son +1 / −1 ne coûte qu’1 PC au lieu de 2.',
    action:{ n:'Transmuter', txt:'1 dé, 1 fois par tour', d:'Retourne ce dé sur sa face opposée.' },
    garde:{ n:'Fumée', txt:'1 dé', d:'Bouclier = la valeur, +3 si ce dé a été modifié ce tour.', cond:un, val:(vs, ds) => vs[0] + (ds && ds[0] && ds[0].mod ? 3 : 0),
      f:(J, vs, k, ds) => { const b = vs[0] + (ds && ds[0] && ds[0].mod ? 3 : 0); J.gardeB += b; log(`${J.nom} : Fumée, Bouclier ${b}.`); } },
    pouvoir:{ n:'Grand œuvre', txt:'5 dés tous différents', d:'6 dégâts au héros adverse, et à ton prochain tour tous tes dés montrent la valeur de ton choix.', cond:vs => vs.length === 5 && compte(vs)[0] === 1,
      f:J => { degats({ J:adv(J) }, 6); choisirOeuvre(J); } },
    ultime:{ n:'La Pierre philosophale', txt:'3 dés dont la somme fait 12', d:'12 dégâts à une cible, Poison 4, et chaque unité adverse devient 1 / 1.', cond:vs => vs.length === 3 && somme(vs) === 12, cible:'ennemi',
      f:(J, vs, k) => { const D = adv(J); degats(k, 12); altere(D, 'poison', 4); D.front.forEach(u => { const a0 = atk(D, u), v0 = u.v; u.a = 1; u.v = 1; u.vmax = 1; u.tmp = 0; if (typeof fx === 'function') fx({ t:'transforme', c:ref({ J:D, u }), txt:'⚗ 1 / 1', a0, v0 }); }); if (D.front.length) log(`⚗ Pierre philosophale : toutes les créatures de ${D.nom} deviennent 1 / 1.`); } } },
};
const ORDRE = ['maelle', 'aldric', 'pip', 'oria', 'gorm', 'zephine'];
// Jauge d'Ultime (09/11) : +parDe point par dé posé (pas vendu), +1 point tous les parDegats dégâts subis par le héros ; pleine à max.
const JAUGE = { max:20, parDe:1, parDegats:5 };
// Frappe v2.4 (09/11, choix de l'utilisateur) : la valeur compte. Dégâts = valeur d'un dé + bonus (paire +0, 3 dés +3, 4 dés +6, 5 dés +10).
const FRAPPE = { n:'Frappe', txt:'2 à 5 dés identiques', d:'Dégâts = la valeur du dé + un bonus : paire +0, 3 dés +3, 4 dés +6, 5 dés +10. Deux 6 = 6, trois 4 = 7, cinq 6 = 16.', cond:vs => vs.length >= 2 && egaux(vs), cible:'ennemi',
  dg:vs => { const m = (typeof FRAPPE_MODE !== 'undefined' ? FRAPPE_MODE : 'valeur'); return m === 'valeur' ? vs[0] + [0, 0, 0, 3, 6, 10][vs.length] : m === 'somme' ? vs.reduce((a, b) => a + b, 0) : [0, 0, 3, 6, 9, 14][vs.length]; },
  f:(J, vs, k) => degats(k, FRAPPE.dg(vs)) };
// Technique (09/11, choix de l'utilisateur : la « petite suite » du plateau papier) : commune à tous.
const TECHNIQUE = { n:'Technique', txt:'3 à 5 dés qui se suivent', d:'4 / 7 / 10 dégâts à une cible (suite de 3, 4 ou 5 dés, par exemple 2-3-4).', cond:vs => vs.length >= 3 && suite(vs, vs.length), cible:'ennemi',
  f:(J, vs, k) => degats(k, techDg(vs)) };
// 13/11 : dégâts de la Technique (la règle de la semaine « Suites généreuses » fait compter une suite de 3 comme une suite de 4)
const techDg = vs => (typeof S !== 'undefined' && S && S.salle && S.salle.id === 'sem-suites' && vs.length === 3) ? 7 : [0, 0, 0, 4, 7, 10][vs.length];
const SALLES = [
  { n:'La Cour de la caserne', d:'Les unités arrivent avec +1 vie.', id:'caserne' },
  { n:'La Salle des échos', d:'La première carte de chaque tour coûte 1 PC de moins.', id:'echos' },
  { n:'L’Autel du six', d:'Vendre un 6 rapporte 2 PC au lieu de 1.', id:'autel' },
];

// ===== Tour des héros (10/11) : profil de jeu affiché (barres de 1 à 5), équilibre mesuré par le simulateur (v2.5, 6 000 parties),
// cartes en plus que le joueur peut mettre dans son deck, et deck personnalisé (gardé sur le téléphone, jamais pour l'ordinateur).
const PROFILS = {
  maelle: { Attaque:5, Défense:3, Soin:1, Contrôle:1, Difficulté:2, style:'Frappeuse' },
  aldric: { Attaque:3, Défense:5, Soin:3, Contrôle:1, Difficulté:2, style:'Protecteur' },
  pip:    { Attaque:3, Défense:3, Soin:5, Contrôle:2, Difficulté:3, style:'Soigneuse' },
  oria:   { Attaque:3, Défense:2, Soin:1, Contrôle:5, Difficulté:4, style:'Stratège' },
  gorm:   { Attaque:4, Défense:3, Soin:1, Contrôle:2, Difficulté:3, style:'Soutien' },
  zephine:{ Attaque:3, Défense:2, Soin:1, Contrôle:4, Difficulté:5, style:'Alchimiste' },
};
const EQUILIBRE = { maelle:50, aldric:47, pip:50, oria:50, gorm:51, zephine:52 };
const POOL_PLUS = { pip:['rosee'], oria:['raccourci', 'guetteur'] };
const DECK_TAILLE = 30, DECK_MAX = 2; // 14/11 nuit : 21 → 30 (cartes nouvelles, fin de donnees.js)
const deckBase = id => HEROS[id].monstre ? [] : [...HEROS[id].deck, ...GUILDE];
// la collection : les cartes rencontrées pendant les Odyssées (gardées sur le téléphone), utilisables dans l'éditeur de deck du Duel
const collectionCartes = () => { try { return JSON.parse(localStorage.getItem('guilde-collection') || '[]').filter(k => CARTES[k]); } catch (e) { return []; } };
const poolDe = id => [...new Set([...HEROS[id].deck, ...(POOL_PLUS[id] || []), ...GUILDE, ...collectionCartes().filter(k => !CARTES[k].heros || CARTES[k].heros === id)])];
function deckValide(id, d) {
  if (!Array.isArray(d) || d.length !== DECK_TAILLE) return false; const pool = poolDe(id), n = {};
  return d.every(k => { n[k] = (n[k] || 0) + 1; return pool.includes(k) && n[k] <= DECK_MAX; });
}
function deckDe(id) {
  try { const d = JSON.parse(localStorage.getItem('guilde-deck-' + id) || 'null'); if (deckValide(id, d)) return d; } catch (e) {}
  return deckBase(id);
}


// =============================================================================================== 14/11 nuit : les CARTES NOUVELLES du Rang de la Guilde
// Une par héros + une de la Guilde, gagnées aux rangs 5, 9, 13, 16, 19, 22 et 26 (rang.js, ROUTE). Épiques. Elles entrent alors dans la
// collection (éditeur de deck de la Tour des héros) et peuvent sortir aux tirages de l'Odyssée. heros = réservée à ce héros.
Object.assign(CARTES, {
  n_maelle: { n:'Coup de l’enclume', t:'s', c:2, r:'e', nouv:true, heros:'maelle', txt:'2 dés de 5 ou +', d:'Dégâts égaux à leur somme à une cible (10 à 12).', cond:vs => vs.length === 2 && vs.every(v => v >= 5), cible:'ennemi', f:(J, vs, k) => degats(k, somme(vs)), ia:() => 50 },
  n_pip:    { n:'Louve blanche', t:'u', c:3, r:'e', nouv:true, heros:'pip', txt:'dé ≤ 2', d:'Unité 3 / 7, Barrière. À son arrivée, +1 marqueur de Meute.', cond:vs => un(vs) && vs[0] <= 2, u:{ n:'Louve blanche', a:3, v:7, barriere:true }, f:J => ajouteMeute(J, 1) },
  n_oria:   { n:'Carnet du cartographe', t:'s', c:1, r:'e', nouv:true, heros:'oria', txt:'2 dés qui se suivent', d:'Pioche 2 cartes et gagne une relance.', cond:vs => suite(vs, 2), f:J => { pioche(J, 2); J.relance++; log(`${J.nom} gagne une relance.`); }, ia:J => J.main.length < 5 ? 30 : 12 },
  n_aldric: { n:'Aube protectrice', t:'s', c:2, r:'e', nouv:true, heros:'aldric', txt:'2 dés pairs', d:'Ton héros gagne un Bouclier égal à leur somme.', cond:vs => vs.length === 2 && vs.every(pair), f:(J, vs) => { J.bouclier = (J.bouclier || 0) + somme(vs); log(`${J.nom} : Bouclier +${somme(vs)}.`); }, ia:J => J.pv < J.pvMax * .8 ? 34 : 14 },
  n_gorm:   { n:'Chant des ancêtres', t:'s', c:2, r:'e', nouv:true, heros:'gorm', txt:'dé pair', d:'Toutes tes créatures gagnent +2 attaque, pour toute la partie.', cond:vs => un(vs) && pair(vs[0]), f:J => { J.front.forEach(u => { u.a += 2; }); log('Chant des ancêtres : tes créatures ont +2 attaque.'); }, ia:J => J.front.length * 14 },
  n_zephine:{ n:'Élixir explosif', t:'s', c:1, r:'e', nouv:true, heros:'zephine', txt:'2 dés qui font 7', d:'Poison 4 sur le héros adverse et 3 dégâts à chaque créature adverse.', cond:vs => vs.length === 2 && somme(vs) === 7, f:J => { altere(adv(J), 'poison', 4); [...adv(J).front].forEach(u => degats({ J:adv(J), u }, 3)); }, ia:J => 26 + adv(J).front.length * 10 },
  n_guilde: { n:'Rune d’éveil', t:'s', c:0, r:'e', nouv:true, txt:'dé = 6', d:'+2 PC.', cond:vs => un(vs) && vs[0] === 6, f:J => { J.pc = Math.min(6, J.pc + 2); log(`${J.nom} : +2 PC (Rune d’éveil).`); }, ia:J => J.pc <= 3 ? 26 : 6 },
});
// une carte nouvelle n'est utilisable qu'une fois gagnée, et seulement par son héros
const carteOuverte = (k, id) => { const c = CARTES[k]; if (!c) return false; if (c.heros && id && c.heros !== id) return false; if (!c.nouv) return true; try { return JSON.parse(localStorage.getItem('guilde-collection') || '[]').includes(k); } catch (e) { return false; } };

// =============================================================================================== 40 CARTES NOUVELLES ET LE DECK DE 30 (14/11 nuit, carte blanche)
// Demande de l'utilisateur : « un build de 30-40 cartes comme Hearthstone, avec des cartes communes et des cartes spécifiques ».
// Choix de Claude : le deck passe de 21 à 30 cartes (15 du héros + 15 de la Guilde, 2 exemplaires au plus).
// Par héros, 5 cartes neuves : les 3 premières entrent dans son deck de base, les 2 dernières se TROUVENT (tirages de l'Odyssée, coffres,
// marchand) puis rejoignent la collection (éditeur de deck de la Tour des héros). La Guilde : 10 neuves, 6 dans le deck de base, 4 à trouver.
// heros = carte réservée à ce héros. Tout repose sur les mécaniques existantes (Barrière, Cachée, Charge, Épines, Poison, Entrave…).
Object.assign(CARTES, {
  // ---- Maëlle (la forge, les 6, les créatures)
  m_soufflet: { n:'Soufflet de forge', t:'s', c:1, heros:'maelle', txt:'dé de 4 ou +', d:'Un autre de tes dés libres devient un 6.', cond:vs => un(vs) && vs[0] >= 4, cible:'de', f:(J, vs, k) => { if (k && k.d) { modifie(J, k.d, 6); log(`${J.nom} attise la forge : un dé devient 6.`); } }, ia:J => J.des.some(d => !d.pose && d.v < 5) ? 22 : 0 },
  m_rivets:   { n:'Rivets d’acier', t:'e', c:1, heros:'maelle', txt:'dé pair', d:'Toutes tes créatures gagnent +2 vie.', cond:vs => un(vs) && pair(vs[0]), f:J => { J.front.forEach(u => { u.v += 2; u.vmax += 2; }); log('Rivets d’acier : tes créatures +2 vie.'); }, ia:J => J.front.length * 10 },
  m_automate: { n:'Automate de bronze', t:'u', c:3, heros:'maelle', txt:'2 dés identiques', d:'Unité 4 / 5, Charge.', cond:vs => vs.length === 2 && egaux(vs), u:{ n:'Automate', a:4, v:5, charge:true } },
  m_lingot:   { n:'Lingot rougi', t:'s', c:1, heros:'maelle', txt:'dé = 6', d:'6 dégâts à une cible ; si c’est une créature, 2 dégâts au héros adverse aussi.', cond:vs => un(vs) && vs[0] === 6, cible:'ennemi', f:(J, vs, k) => { degats(k, 6); if (k.u) degats({ J:adv(J) }, 2); }, ia:() => 40 },
  m_oeuvre:   { n:'Chef-d’œuvre', t:'e', c:3, heros:'maelle', txt:'3 dés identiques', d:'Une de tes créatures gagne +4 attaque, +4 vie et Barrière.', cond:vs => vs.length === 3 && egaux(vs), cible:'uniteA', f:(J, vs, k) => { k.u.a += 4; k.u.v += 4; k.u.vmax += 4; k.u.barriere = true; log(`${k.u.n} devient un chef-d’œuvre : +4 / +4, Barrière.`); }, ia:J => J.front.length ? 45 : 0 },
  // ---- Aldric (Barrière, soins, suites)
  a_rempart:  { n:'Rempart vivant', t:'u', c:2, heros:'aldric', txt:'dé ≤ 3', d:'Unité 1 / 7, Barrière.', cond:vs => un(vs) && vs[0] <= 3, u:{ n:'Rempart', a:1, v:7, barriere:true } },
  a_priere:   { n:'Prière de l’aube', t:'s', c:1, heros:'aldric', txt:'2 dés pairs', d:'Soigne de 3 ton héros et chacune de tes créatures.', cond:vs => vs.length === 2 && vs.every(pair), f:J => { soin(J, 3); J.front.forEach(u => soinCible({ J, u }, 3)); }, ia:J => (J.pv < J.pvMax * .8 ? 26 : 8) + J.front.filter(u => u.v < u.vmax).length * 6 },
  a_charge:   { n:'Charge de cavalerie', t:'s', c:2, heros:'aldric', txt:'4 dés qui se suivent', d:'13 dégâts à une cible.', cond:vs => suite(vs, 4), cible:'ennemi', f:(J, vs, k) => degats(k, 13), ia:() => 62 },
  a_paladin:  { n:'Paladin juré', t:'u', c:3, heros:'aldric', txt:'3 dés qui se suivent', d:'Unité 4 / 6, Barrière.', cond:vs => suite(vs, 3), u:{ n:'Paladin', a:4, v:6, barriere:true } },
  a_jugement: { n:'Jugement', t:'s', c:2, heros:'aldric', txt:'dé = 6', d:'Dégâts égaux au tiers des PV que ton héros a perdus (12 au plus).', cond:vs => un(vs) && vs[0] === 6, cible:'ennemi', f:(J, vs, k) => degats(k, Math.min(12, Math.floor((J.pvMax - J.pv) / 3))), ia:J => Math.min(12, Math.floor((J.pvMax - J.pv) / 3)) * 5 },
  // ---- Pip (la forêt, la meute, les petits dés)
  p_champi:   { n:'Cercle de champignons', t:'s', c:1, heros:'pip', txt:'dé = 1', d:'Poison 4 sur le héros adverse.', cond:vs => un(vs) && vs[0] === 1, f:J => altere(adv(J), 'poison', 4), ia:() => 30 },
  p_hibou:    { n:'Hibou des bois', t:'u', c:1, heros:'pip', txt:'dé ≤ 2', d:'Unité 2 / 3, Cachée. À son arrivée, pioche 1 carte.', cond:vs => un(vs) && vs[0] <= 2, u:{ n:'Hibou', a:2, v:3, cachee:true }, f:J => pioche(J, 1) },
  p_ours:     { n:'Ours des mousses', t:'u', c:3, heros:'pip', txt:'2 dés ≤ 3', d:'Unité 4 / 7.', cond:vs => vs.length === 2 && vs.every(v => v <= 3), u:{ n:'Ours', a:4, v:7 } },
  p_source:   { n:'Source sacrée', t:'s', c:2, heros:'pip', txt:'3 dés ≤ 3', d:'Soigne ton héros de 8 et retire ses altérations.', cond:vs => vs.length === 3 && vs.every(v => v <= 3), f:J => { J.poison = 0; J.saigne = 0; J.handicap = 0; soin(J, 8); }, ia:J => J.pv < J.pvMax * .7 ? 44 : 6 },
  p_chenes:   { n:'Réveil des chênes', t:'s', c:3, heros:'pip', txt:'4 dés', d:'Deux Ronces 0 / 4 (Barrière, Épines 1) poussent, et tes créatures gagnent +2 attaque.', cond:vs => vs.length === 4, f:J => { invoque(J, { n:'Ronces', a:0, v:4, barriere:true, epines:1 }); invoque(J, { n:'Ronces', a:0, v:4, barriere:true, epines:1 }); J.front.forEach(u => { u.a += 2; }); log('Les chênes se réveillent.'); }, ia:() => 50 },
  // ---- Oria (l'exploratrice, Cachée, impairs)
  o_fumee:    { n:'Fumigène', t:'s', c:1, heros:'oria', txt:'dé impair', d:'Toutes tes créatures deviennent Cachées.', cond:vs => un(vs) && !pair(vs[0]), f:J => { J.front.forEach(u => { u.cachee = true; }); log('Fumigène : tes créatures disparaissent.'); }, ia:J => J.front.filter(u => !u.cachee).length * 10 },
  o_dague:    { n:'Dague de lancer', t:'s', c:0, heros:'oria', txt:'dé = 5', d:'3 dégâts à une cible.', cond:vs => un(vs) && vs[0] === 5, cible:'ennemi', f:(J, vs, k) => degats(k, 3), ia:() => 24 },
  o_faucon:   { n:'Faucon messager', t:'u', c:2, heros:'oria', txt:'dé impair', d:'Unité 3 / 2, Charge.', cond:vs => un(vs) && !pair(vs[0]), u:{ n:'Faucon', a:3, v:2, charge:true } },
  o_secret:   { n:'Passage secret', t:'s', c:1, heros:'oria', txt:'2 dés impairs', d:'Gagne 2 relances.', cond:vs => vs.length === 2 && vs.every(v => !pair(v)), f:J => { J.relance += 2; log(`${J.nom} gagne 2 relances.`); }, ia:() => 10 },
  o_embuscade:{ n:'Grande embuscade', t:'s', c:3, heros:'oria', txt:'3 dés impairs', d:'8 dégâts au héros adverse, Garde et Bouclier ignorés.', cond:vs => vs.length === 3 && vs.every(v => !pair(v)), f:J => degats({ J:adv(J) }, 8, true), ia:() => 55 },
  // ---- Gorm (le chant, les créatures, les dés identiques)
  g_cornemuse:{ n:'Cornemuse', t:'s', c:1, heros:'gorm', txt:'2 dés identiques', d:'Tes créatures gagnent +1 attaque pour la partie.', cond:vs => vs.length === 2 && egaux(vs), f:J => { J.front.forEach(u => { u.a += 1; }); log('Cornemuse : tes créatures +1 attaque.'); }, ia:J => J.front.length * 12 },
  g_barde:    { n:'Barde itinérant', t:'u', c:2, heros:'gorm', txt:'dé pair', d:'Unité 2 / 3. À son arrivée, pioche 1 carte.', cond:vs => un(vs) && pair(vs[0]), u:{ n:'Barde', a:2, v:3 }, f:J => pioche(J, 1) },
  g_geant:    { n:'Géant des sommets', t:'u', c:4, heros:'gorm', txt:'3 dés identiques', d:'Unité 5 / 8, Barrière.', cond:vs => vs.length === 3 && egaux(vs), u:{ n:'Géant', a:5, v:8, barriere:true } },
  g_ballade:  { n:'Ballade héroïque', t:'s', c:2, heros:'gorm', txt:'4 dés pairs', d:'Toutes tes créatures peuvent attaquer à nouveau ce tour.', cond:vs => vs.length === 4 && vs.every(pair), f:J => { J.front.forEach(u => { u.pret = true; }); log('Ballade héroïque : tout le monde repart à l’attaque !'); }, ia:J => J.front.length * 15 },
  g_choeur:   { n:'Chœur de la montagne', t:'s', c:3, heros:'gorm', txt:'5 dés', d:'3 dégâts au héros adverse pour chacune de tes créatures.', cond:vs => vs.length === 5, f:J => { const n = J.front.length; if (n) degats({ J:adv(J) }, 3 * n); }, ia:J => J.front.length * 16 },
  // ---- Zéphine (l'alchimie, les dés modifiés, le poison)
  z_mercure:  { n:'Mercure', t:'s', c:0, heros:'zephine', txt:'1 dé', d:'Un autre de tes dés libres prend la valeur de celui-ci.', cond:un, cible:'de', f:(J, vs, k) => { if (k && k.d) modifie(J, k.d, vs[0]); }, ia:() => 8 },
  z_acide:    { n:'Fiole d’acide', t:'s', c:1, heros:'zephine', txt:'1 dé modifié', d:'7 dégâts à une cible.', cond:(vs, ds) => un(vs) && ds && ds[0] && ds[0].mod, cible:'ennemi', f:(J, vs, k) => degats(k, 7), ia:() => 42 },
  z_golem:    { n:'Golem de chair', t:'u', c:3, heros:'zephine', txt:'2 dés qui font 7', d:'Unité 4 / 6. Ses attaques sur le héros donnent Poison 2.', cond:vs => vs.length === 2 && somme(vs) === 7, u:{ n:'Golem de chair', a:4, v:6, poisonneur:true } },
  z_nuee:     { n:'Nuée toxique', t:'s', c:2, heros:'zephine', txt:'3 dés impairs', d:'Poison 2 sur le héros adverse et 2 dégâts à chaque créature adverse.', cond:vs => vs.length === 3 && vs.every(v => !pair(v)), f:J => { altere(adv(J), 'poison', 2); [...adv(J).front].forEach(u => degats({ J:adv(J), u }, 2)); }, ia:J => 24 + adv(J).front.length * 8 },
  z_elixir:   { n:'Élixir de vie', t:'s', c:2, heros:'zephine', txt:'2 dés modifiés', d:'Soigne ton héros de 10.', cond:(vs, ds) => vs.length === 2 && ds && ds.every(d => d.mod), f:J => soin(J, 10), ia:J => J.pv < J.pvMax * .7 ? 46 : 5 },
  // ---- la Guilde (tous)
  gu_epee:    { n:'Épée courte', t:'s', c:1, txt:'dé de 3 ou +', d:'3 dégâts à une cible.', cond:vs => un(vs) && vs[0] >= 3, cible:'ennemi', f:(J, vs, k) => degats(k, 3), ia:() => 20 },
  gu_milice:  { n:'Milicienne', t:'u', c:1, txt:'dé ≤ 3', d:'Unité 2 / 3.', cond:vs => un(vs) && vs[0] <= 3, u:{ n:'Milicienne', a:2, v:3 } },
  gu_pain:    { n:'Pain de route', t:'s', c:0, txt:'dé ≤ 2', d:'Soigne ton héros de 3.', cond:vs => un(vs) && vs[0] <= 2, f:J => soin(J, 3), ia:J => J.pv < J.pvMax * .9 ? 18 : 2 },
  gu_carnet:  { n:'Carnet de route', t:'s', c:1, txt:'dé pair', d:'Pioche 1 carte et soigne ton héros de 2.', cond:vs => un(vs) && pair(vs[0]), f:J => { pioche(J, 1); soin(J, 2); }, ia:() => 18 },
  gu_lance:   { n:'Lance de garde', t:'e', c:1, txt:'dé pair', d:'Une de tes créatures gagne +1 attaque et Barrière.', cond:vs => un(vs) && pair(vs[0]), cible:'uniteA', f:(J, vs, k) => { k.u.a += 1; k.u.barriere = true; log(`${k.u.n} : +1 attaque et Barrière.`); }, ia:J => J.front.length ? 18 : 0 },
  gu_filet:   { n:'Filet', t:'s', c:1, txt:'dé ≤ 3', d:'Une créature adverse est Entravée : elle n’attaquera pas à son prochain tour.', cond:vs => un(vs) && vs[0] <= 3, cible:'uniteE', f:(J, vs, k) => { k.u.entrave = true; log(`${k.u.n} est prise dans le filet.`); }, ia:J => adv(J).front.length ? 16 + Math.max(...adv(J).front.map(u => u.a)) * 3 : 0 },
  gu_bombe:   { n:'Bombe de la Guilde', t:'s', c:2, txt:'2 dés identiques', d:'5 dégâts à chaque créature adverse.', cond:vs => vs.length === 2 && egaux(vs), f:J => { [...adv(J).front].forEach(u => degats({ J:adv(J), u }, 5)); }, ia:J => adv(J).front.length * 18 },
  gu_griffon: { n:'Griffon', t:'u', c:3, txt:'2 dés de 5 ou +', d:'Unité 5 / 5, Charge.', cond:vs => vs.length === 2 && vs.every(v => v >= 5), u:{ n:'Griffon', a:5, v:5, charge:true } },
  gu_force:   { n:'Élixir de force', t:'s', c:1, txt:'dé = 6', d:'+2 PC et pioche 1 carte.', cond:vs => un(vs) && vs[0] === 6, f:J => { J.pc = Math.min(6, J.pc + 2); pioche(J, 1); }, ia:J => J.pc <= 3 ? 26 : 8 },
  gu_tour:    { n:'Tour de guet', t:'u', c:2, txt:'2 dés pairs', d:'Unité 2 / 8, Barrière.', cond:vs => vs.length === 2 && vs.every(pair), u:{ n:'Tour de guet', a:2, v:8, barriere:true } },
});
// le deck de 30 : 3 cartes neuves de plus par héros, 6 de plus pour la Guilde
// 14/11 nuit, après le simulateur (Gorm 60 %, Aldric et Zéphine 44 % ; puis Maëlle 57 % : Soufflet sorti ; Aldric 44 → 47 PV, Zéphine 41 → 44 PV) : Géant, Charge de cavalerie et Mercure sortent du deck de base (à trouver)
const NEUVES_BASE = { maelle:['lame', 'm_rivets', 'm_automate'], aldric:['a_rempart', 'a_priere', 'a_paladin'], pip:['p_champi', 'p_hibou', 'p_ours'],
  oria:['o_fumee', 'o_dague', 'o_faucon'], gorm:['g_cornemuse', 'g_barde', 'cor'], zephine:['z_nuee', 'z_acide', 'z_golem'] };
Object.entries(NEUVES_BASE).forEach(([h, l]) => { if (HEROS[h] && HEROS[h].deck.length < 15) HEROS[h].deck.push(...l); });
if (!GUILDE.includes('gu_epee')) GUILDE.push('gu_epee', 'gu_milice', 'gu_pain', 'gu_carnet', 'gu_lance', 'gu_filet');
