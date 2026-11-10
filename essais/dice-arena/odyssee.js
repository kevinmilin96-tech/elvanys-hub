// La Guilde des Runes — L'ODYSSÉE (10/11/2026) : données et règles hors combat.
// Lu par odyssee.html (l'île) ET par duel.html (les combats de l'Odyssée : monstres, boss, reliques, potions).
// Règles v1 : ~/perso/dice-arena/Odyssee-Regles-v1.md (page odyssee-regles.html). Le combat lui-même = le moteur du Duel, inchangé.

// ----------------------------------------------------------------------------------------------- hasard reproductible (graine)
function hachage(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return (h >>> 0); }
function rngDe(graine) { let a = hachage(String(graine)); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const tire = (R, l) => l[Math.floor(R() * l.length)];
function brasse(R, a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const graineDuJour = () => 'jour-' + new Date().toISOString().slice(0, 10);

// ----------------------------------------------------------------------------------------------- portraits provisoires des monstres (emoji dessiné)
const PORTRAIT = (emoji, c) => `data:image/svg+xml;utf8,` + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g" cx="50%" cy="40%"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#1a0d10"/></radialGradient></defs><rect width="100" height="100" fill="url(#g)"/><text x="50" y="66" font-size="52" text-anchor="middle">${emoji}</text></svg>`);

// ----------------------------------------------------------------------------------------------- les monstres des Terres brûlées
// Un monstre = une fiche comme un héros (le moteur du Duel le joue tel quel) MAIS sans cartes : Frappe, Technique, Garde, Pouvoir (et parfois un Ultime).
// renforts = créatures déjà posées au début du combat. niveau I / II / III : PV +0 / +6 / +12, 3 / 4 / 5 dés, créatures +0 / +1 / +2 attaque. Majeurs : 4 dés. Boss : 5 dés.
const MONSTRES = {
  gobelin:     { nom:'Gobelin des cendres', titre:'le chapardeur', emoji:'👺', c:'#b85c2a', pv:12, role:'Vole des PC. Faible seul.', cit:'« Hé hé, c’est à moi maintenant ! »',
    garde:{ n:'Esquive sournoise', txt:'1 dé', d:'Bouclier = la moitié du dé (arrondi au-dessus).', cond:vs => vs.length === 1, val:vs => Math.ceil(vs[0] / 2), f:(J, vs) => { const b = Math.ceil(vs[0] / 2); J.gardeB += b; log(`${J.nom} : Esquive sournoise, Bouclier ${b}.`); } },
    pouvoir:{ n:'Coup de sac', txt:'2 dés identiques', d:'4 dégâts à une cible et vole 1 PC au héros.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 4); const D = adv(J); if (D.pc > 0) { D.pc--; J.pc = Math.min(6, J.pc + 1); log(`${J.nom} vole 1 PC.`); } } },
    renforts:[] },
  loup:        { nom:'Loup de braise', titre:'le traqueur', emoji:'🐺', c:'#d9442a', pv:13, role:'Rapide, fait saigner. Vient avec un louveteau.', cit:'« … »',
    garde:{ n:'Bond de côté', txt:'1 dé pair', d:'Esquive : le prochain coup reçu est divisé par deux.', cond:vs => vs.length === 1 && vs[0] % 2 === 0, val:() => 4, f:J => { J.esquive = true; log(`${J.nom} bondit de côté : Esquive.`); } },
    pouvoir:{ n:'Morsure brûlante', txt:'3 dés de 3 ou plus', d:'6 dégâts à une cible et Saignement au héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 6); altere(adv(J), 'saigne'); } },
    renforts:[{ n:'Louveteau', a:2, v:3 }] },
  golem:       { nom:'Golem de scories', titre:'le lent', emoji:'🗿', c:'#6b6b7a', pv:16, role:'Lent et dur : gros bouclier, un Éclat qui fait Barrière.', cit:'« … »',
    garde:{ n:'Croûte de scories', txt:'1 dé', d:'Bouclier = la valeur du dé + 1.', cond:vs => vs.length === 1, val:vs => vs[0] + 1, f:(J, vs) => { J.gardeB += vs[0] + 1; log(`${J.nom} : Croûte de scories, Bouclier ${vs[0] + 1}.`); } },
    pouvoir:{ n:'Poing de pierre', txt:'2 dés identiques de 4 ou plus', d:'7 dégâts à une cible.', cond:vs => vs.length === 2 && vs[0] === vs[1] && vs[0] >= 4, cible:'ennemi', f:(J, vs, k) => degats(k, 7) },
    renforts:[{ n:'Éclat de scories', a:1, v:5, barriere:true }] },
  salamandre:  { nom:'Salamandre', titre:'la venimeuse', emoji:'🦎', c:'#e0892a', pv:13, role:'Empoisonne : chaque tour fait mal.', cit:'« Sssss… »',
    garde:{ n:'Peau de braise', txt:'1 dé', d:'Bouclier 3.', cond:vs => vs.length === 1, val:() => 3, f:J => { J.gardeB += 3; log(`${J.nom} : Peau de braise, Bouclier 3.`); } },
    pouvoir:{ n:'Crachat', txt:'2 dés impairs', d:'3 dégâts et Poison 2 au héros.', cond:vs => vs.length === 2 && vs.every(v => v % 2 === 1), cible:'ennemi', f:(J, vs, k) => { degats(k, 3); altere(adv(J), 'poison', 2); } },
    renforts:[] },
  cultiste:    { nom:'Cultiste du feu', titre:'l’illuminé', emoji:'🧙', c:'#9b2a6b', pv:14, role:'Invoque des flammèches, frappe fort sur un 6.', cit:'« Le feu purifie tout ! »',
    garde:{ n:'Voile de fumée', txt:'1 dé impair', d:'Bouclier 4.', cond:vs => vs.length === 1 && vs[0] % 2 === 1, val:() => 4, f:J => { J.gardeB += 4; log(`${J.nom} : Voile de fumée, Bouclier 4.`); } },
    pouvoir:{ n:'Appel des flammes', txt:'dé = 6', d:'8 dégâts à une cible, ou une Flammèche 2 / 2 Charge si la ligne est vide.', cond:vs => vs.length === 1 && vs[0] === 6, cible:'ennemi', f:(J, vs, k) => { if (!J.front.length) invoque(J, { n:'Flammèche', a:2, v:2, charge:true }); else degats(k, 8); } },
    renforts:[{ n:'Flammèche', a:2, v:2, charge:true }] },
  elementaire: { nom:'Élémentaire de lave', titre:'le brûlant', emoji:'🌋', c:'#ff4a1a', pv:20, role:'Le plus dangereux : gros dégâts, et une Coulée quand sa jauge est pleine.', cit:'« … »',
    garde:{ n:'Croûte', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`${J.nom} : Croûte, Bouclier ${vs[0]}.`); } },
    pouvoir:{ n:'Jet de lave', txt:'3 dés de 4 ou plus', d:'9 dégâts à une cible.', cond:vs => vs.length === 3 && vs.every(v => v >= 4), cible:'ennemi', f:(J, vs, k) => degats(k, 9) },
    ultime:{ n:'Coulée', txt:'3 dés', d:'14 dégâts au héros.', cond:vs => vs.length === 3, cible:'ennemi', f:(J, vs, k) => degats({ J:adv(J) }, 14) },
    renforts:[] },
  // --- les monstres majeurs (élites)
  chefgobelin: { nom:'Chef gobelin', titre:'le roi des cendres', emoji:'👹', c:'#c2411e', pv:22, majeur:true, role:'Deux gobelins l’escortent ; il vole des PC et frappe fort.', cit:'« À moi, mes vauriens ! »',
    garde:{ n:'Bouclier de ferraille', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`${J.nom} : Bouclier de ferraille ${vs[0]}.`); } },
    pouvoir:{ n:'Razzia', txt:'2 dés identiques', d:'6 dégâts à une cible et vole 2 PC.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 6); const D = adv(J); const v = Math.min(2, D.pc); D.pc -= v; J.pc = Math.min(6, J.pc + v); if (v) log(`${J.nom} vole ${v} PC.`); } },
    renforts:[{ n:'Gobelin', a:2, v:4 }, { n:'Gobelin', a:2, v:4 }] },
  drake:       { nom:'Drake de cendre', titre:'l’ailé', emoji:'🐉', c:'#8a1f1f', pv:24, majeur:true, role:'Esquive et crache le feu : Saignement à chaque souffle.', cit:'« … »',
    garde:{ n:'Envol', txt:'1 dé pair', d:'Esquive : le prochain coup est divisé par deux.', cond:vs => vs.length === 1 && vs[0] % 2 === 0, val:() => 5, f:J => { J.esquive = true; log(`${J.nom} s’envole : Esquive.`); } },
    pouvoir:{ n:'Souffle de cendre', txt:'3 dés de 4 ou plus', d:'10 dégâts à une cible et Saignement au héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 4), cible:'ennemi', f:(J, vs, k) => { degats(k, 10); altere(adv(J), 'saigne'); } },
    ultime:{ n:'Tempête de braises', txt:'3 dés', d:'12 dégâts au héros et Handicap.', cond:vs => vs.length === 3, cible:'ennemi', f:(J, vs, k) => { degats({ J:adv(J) }, 12); altere(adv(J), 'handicap'); } },
    renforts:[] },
  colosse:     { nom:'Colosse de basalte', titre:'l’inébranlable', emoji:'⛰️', c:'#4f4f66', pv:26, majeur:true, role:'Deux Éclats Barrière le protègent ; ses poings écrasent.', cit:'« … »',
    garde:{ n:'Mur de basalte', txt:'1 dé', d:'Bouclier = la valeur du dé + 2.', cond:vs => vs.length === 1, val:vs => vs[0] + 2, f:(J, vs) => { J.gardeB += vs[0] + 2; log(`${J.nom} : Mur de basalte, Bouclier ${vs[0] + 2}.`); } },
    pouvoir:{ n:'Écrasement', txt:'2 dés identiques de 4 ou plus', d:'9 dégâts à une cible.', cond:vs => vs.length === 2 && vs[0] === vs[1] && vs[0] >= 4, cible:'ennemi', f:(J, vs, k) => degats(k, 9) },
    renforts:[{ n:'Éclat de basalte', a:1, v:6, barriere:true }, { n:'Éclat de basalte', a:1, v:6, barriere:true }] },
};
// Le boss : le Titan de feu, 70 PV, 3 phases (il change d'attaques sous 2/3 puis 1/3 de ses PV). Chaque Jet de magma pose une Braise sur le héros : 3 Braises = 6 dégâts.
const BOSS = {
  titan: { nom:'Le Titan de feu', titre:'le gardien du seuil', emoji:'🔥', c:'#ff6a1a', pv:45, boss:true, role:'Trois phases. Ses Braises s’accumulent sur toi : à trois, elles explosent.', cit:'« Nul ne franchit le seuil sans brûler. »',
    phases:[
      { seuil:1, garde:{ n:'Peau de magma', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Titan : Peau de magma, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Poing de magma', txt:'2 dés identiques', d:'7 dégâts et 1 Braise sur le héros.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 7); braiseTitan(adv(J)); } } },
      { seuil:2 / 3, garde:{ n:'Peau de magma', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Titan : Peau de magma, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Souffle de fournaise', txt:'3 dés de 3 ou plus', d:'9 dégâts et 1 Braise sur le héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 9); braiseTitan(adv(J)); } } },
      { seuil:1 / 3, garde:{ n:'Carapace en fusion', txt:'1 dé', d:'Bouclier = 2 × la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0] * 2, f:(J, vs) => { J.gardeB += vs[0] * 2; log(`Le Titan : Carapace en fusion, Bouclier ${vs[0] * 2}.`); } },
        pouvoir:{ n:'Écrasement', txt:'2 dés de 5 ou plus', d:'12 dégâts et 1 Braise sur le héros.', cond:vs => vs.length === 2 && vs.every(v => v >= 5), cible:'ennemi', f:(J, vs, k) => { degats(k, 12); braiseTitan(adv(J)); } } },
    ],
    ultime:{ n:'Éruption', txt:'3 dés', d:'16 dégâts au héros.', cond:vs => vs.length === 3, cible:'ennemi', f:(J, vs, k) => degats({ J:adv(J) }, 16) },
    renforts:[] },
};
function braiseTitan(D) { D.braiseT = (D.braiseT || 0) + 1; log(`🔥 Braise ${D.braiseT}/3 sur ${D.nom}.`); if (D.braiseT >= 3) { D.braiseT = 0; log('🔥 Les Braises explosent : 6 dégâts !'); degats({ J:D }, 6, true); } }
// la Frappe des monstres : plus faible que celle des héros (la moitié du dé, +2 par dé au-delà de la paire)
const FRAPPE_MONSTRE = { n:'Griffes', txt:'2 à 5 dés identiques', d:'Dégâts = la moitié du dé (arrondie au-dessus) + 2 par dé au-delà de la paire.', cond:vs => vs.length >= 2 && vs.every(v => v === vs[0]), cible:'ennemi',
  dg:vs => Math.ceil(vs[0] / 2) + (vs.length - 2) * 2, f:(J, vs, k) => degats(k, FRAPPE_MONSTRE.dg(vs)) };
// Ajoute monstres et boss au dictionnaire des héros, pour que le moteur du Duel les joue sans rien savoir d'eux.
function installeMonstres() {
  if (typeof HEROS === 'undefined') return;
  const tous = { ...MONSTRES, ...BOSS };
  Object.keys(tous).forEach(id => { if (HEROS[id]) return; const m = tous[id];
    HEROS[id] = { ...m, monstre:true, deck:[], passif:m.role, frappe:FRAPPE_MONSTRE, img:PORTRAIT(m.emoji, m.c), ultime:m.ultime || { n:'—', txt:'jamais', d:'Ce monstre n’a pas d’Ultime.', cond:() => false },
      garde:m.garde || (m.phases && m.phases[0].garde), pouvoir:m.pouvoir || (m.phases && m.phases[0].pouvoir) }; });
}
if (typeof HEROS !== 'undefined') installeMonstres();

// ----------------------------------------------------------------------------------------------- reliques, sacoche, bénédictions, malédictions
const RELIQUES = {
  brassards: { n:'Brassards de la Guilde', e:'💪', d:'+2 dégâts sur chaque attaque de ton héros et de tes créatures.', prix:120 },
  armure:    { n:'Armure de Marennes', e:'🛡', d:'−1 sur chaque coup reçu par ton héros.', prix:120 },
  oeil:      { n:'Œil de l’ombre', e:'👁', d:'Une relance gratuite de plus à chaque tour.', prix:110 },
  souvenir:  { n:'Pierre de souvenir', e:'💎', d:'Tu commences chaque combat avec une carte de plus en main.', prix:100 },
  cor:       { n:'Cor de rassemblement', e:'📯', d:'Tes créatures arrivent avec +1 vie.', prix:100 },
  bourse:    { n:'Bourse du marchand', e:'👛', d:'+10 or à chaque victoire.', prix:90 },
};
const SACOCHE = {
  soin:     { n:'Potion de soin', e:'🧪', d:'Rend 10 PV (en combat ou sur la carte).', prix:40 },
  mana:     { n:'Potion de mana', e:'🔮', d:'+2 PC tout de suite (en combat).', prix:30 },
  antidote: { n:'Antidote', e:'🌿', d:'Retire Poison, Saignement et Handicap (en combat).', prix:20 },
  bombe:    { n:'Bombe', e:'💣', d:'8 dégâts directs au héros adverse, Garde ignorée (en combat). Ouvre aussi un mur fissuré.', prix:40 },
};
const BENEDICTIONS = {
  pcplus:   { n:'Souffle de la Guilde', d:'+1 PC au début de chaque combat.' },
  gardex2:  { n:'Première parade', d:'Ta première Garde de chaque combat est doublée.' },
  relance:  { n:'Chance du voyageur', d:'Une relance de plus par tour.' },
  vie:      { n:'Cœur vaillant', d:'+6 PV max (et +6 PV tout de suite).' },
  main:     { n:'Mémoire des runes', d:'Une carte de plus en main au début de chaque combat.' },
  bourse:   { n:'Main heureuse', d:'+15 or après chaque victoire.' },
};
const MALEDICTIONS = {
  pierrelourde: { n:'Pierre lourde', d:'Une carte inutile entre dans ton deck (0 PC, 1 dé : ne fait rien).', carte:'pierrelourde' },
  faim:         { n:'Faim', d:'Une carte « Faim » entre dans ton deck : jouée, elle te coûte 2 PV.', carte:'faim' },
  frele:        { n:'Souffle court', d:'−5 PV max.' },
  cher:         { n:'Mauvaise réputation', d:'Le marchand coûte 20 % de plus.' },
};
// les cartes propres à l'Odyssée (entrent dans le dictionnaire des cartes du Duel)
const CARTES_ODYSSEE = {
  gregeois:     { n:'Feu grégeois', t:'s', c:1, r:'c', txt:'1 dé impair', d:'4 dégâts à une cible.', cond:vs => vs.length === 1 && vs[0] % 2 === 1, cible:'ennemi', f:(J, vs, k) => degats(k, 4), ia:() => 24 },
  gourde:       { n:'Gourde de la source', t:'s', c:1, r:'c', txt:'1 dé', d:'Soigne ton héros de 4.', cond:vs => vs.length === 1, f:J => soin(J, 4), ia:J => J.pv < J.pvMax * .7 ? 26 : 3 },
  bottes:       { n:'Bottes de cendre', t:'e', c:1, r:'c', txt:'1 dé pair', d:'+1 relance ce tour, et +1 PC.', cond:vs => vs.length === 1 && vs[0] % 2 === 0, f:J => { J.relance++; J.pc = Math.min(6, J.pc + 1); }, ia:J => J.relance ? 6 : 14 },
  salamandrette:{ n:'Salamandrette', t:'u', c:2, r:'r', txt:'1 dé de 4 ou plus', d:'Créature 3 / 4, Charge.', cond:vs => vs.length === 1 && vs[0] >= 4, u:{ n:'Salamandrette', a:3, v:4, charge:true } },
  golemet:      { n:'Golemet de scories', t:'u', c:3, r:'r', txt:'2 dés identiques', d:'Créature 2 / 8, Barrière.', cond:vs => vs.length === 2 && vs[0] === vs[1], u:{ n:'Golemet', a:2, v:8, barriere:true } },
  cendres:      { n:'Pluie de cendres', t:'s', c:2, r:'r', txt:'2 dés qui se suivent', d:'6 dégâts à une cible et Handicap au héros adverse.', cond:vs => vs.length === 2 && Math.abs(vs[0] - vs[1]) === 1, cible:'ennemi', f:(J, vs, k) => { degats(k, 6); altere(adv(J), 'handicap'); }, ia:() => 40 },
  eclat:        { n:'Éclat de rune', t:'s', c:0, r:'e', txt:'dé = 6', d:'5 dégâts à une cible et +1 PC.', cond:vs => vs.length === 1 && vs[0] === 6, cible:'ennemi', f:(J, vs, k) => { degats(k, 5); J.pc = Math.min(6, J.pc + 1); }, ia:() => 36 },
  lanterneile:  { n:'Lanterne de l’île', t:'e', c:2, r:'e', txt:'1 dé', d:'Révèle les créatures Cachées et soigne tes créatures de 2.', cond:vs => vs.length === 1, f:J => { adv(J).front.forEach(u => u.cachee = false); J.front.forEach(u => { u.v = Math.min(u.vmax, u.v + 2); }); }, ia:J => J.front.length ? 18 : 4 },
  // malédictions (jamais tirées au draft)
  pierrelourde: { n:'Pierre lourde', t:'s', c:0, r:'m', txt:'1 dé', d:'Ne fait rien. Elle encombre ta main : pose un dé dessus pour t’en débarrasser ce tour.', cond:vs => vs.length === 1, f:() => {}, ia:() => 1 },
  faim:         { n:'Faim', t:'s', c:0, r:'m', txt:'1 dé', d:'Tu perds 2 PV. Elle encombre ta main.', cond:vs => vs.length === 1, f:J => { J.pv -= 2; log(`${J.nom} a faim : −2 PV.`); fin(); }, ia:() => 0 },
};
if (typeof CARTES !== 'undefined') Object.keys(CARTES_ODYSSEE).forEach(k => { if (!CARTES[k]) CARTES[k] = CARTES_ODYSSEE[k]; });
// rareté d'une carte : explicite (r) sinon d'après son coût
const rarete = k => { const c = CARTES[k]; return c.r || (c.c <= 1 ? 'c' : c.c === 2 ? 'r' : 'e'); };
const RARETE = { c:'Commune', r:'Rare', e:'Épique', m:'Malédiction' };
// toutes les cartes qu'on peut tirer (jamais les malédictions)
const cartesTirables = () => Object.keys(CARTES).filter(k => rarete(k) !== 'm');
// tirage de 3 cartes : plus la source est riche (0 monstre, 1 élite, 2 coffre), plus les rares sortent
function draft(R, richesse, deja) {
  const poids = [{ c:70, r:25, e:5 }, { c:40, r:45, e:15 }, { c:20, r:50, e:30 }][richesse] || { c:70, r:25, e:5 };
  const tirables = cartesTirables(), out = [];
  for (let n = 0; n < 60 && out.length < 3; n++) {
    const x = R() * 100, r = x < poids.c ? 'c' : x < poids.c + poids.r ? 'r' : 'e';
    const l = tirables.filter(k => rarete(k) === r && !out.includes(k) && (deja || []).filter(d => d === k).length < 2);
    if (l.length) out.push(tire(R, l));
  }
  return out;
}

// ----------------------------------------------------------------------------------------------- les événements (une courte histoire, 2 ou 3 choix)
// effet : { or, pv, vivres, pvMax, carte:'draft'|clé, relique:true, cle, malediction:true, benediction:true, sacoche:'soin'… }
const EVENEMENTS = [
  { id:'voyageur', t:'Un voyageur blessé', d:'Adossé à un rocher tiède, un voyageur de la Guilde vous fait signe. « Une potion, par pitié… je vous revaudrai ça. »', choix:[
    { t:'Lui donner une potion de soin (si tu en as)', cond:r => r.sacoche.includes('soin'), e:{ sacoche:'-soin', relique:true }, m:'Il vous tend une relique de sa besace : « Elle m’a porté chance. »' },
    { t:'Partager vos vivres (−3 vivres)', e:{ vivres:-3, or:40 }, m:'Reconnaissant, il vous glisse 40 pièces d’or.' },
    { t:'Fouiller ses affaires', e:{ or:30, malediction:true }, m:'30 pièces… et une malédiction murmurée dans votre dos.' } ] },
  { id:'autelbrise', t:'Un autel brisé', d:'Les restes d’un autel runique. Une rune brille encore faiblement entre les pierres.', choix:[
    { t:'Toucher la rune', e:{ carte:'draft1' }, m:'La rune se grave dans votre mémoire : une carte à choisir.' },
    { t:'Prier (−10 or)', cond:r => r.or >= 10, e:{ or:-10, pv:8 }, m:'Une chaleur douce : +8 PV.' },
    { t:'Passer son chemin', e:{}, m:'Vous passez sans vous retourner.' } ] },
  { id:'coffrepiege', t:'Un coffre dans la cendre', d:'Un petit coffre à moitié enterré. Pas de serrure, mais un fil tendu qui part dessous…', choix:[
    { t:'Couper le fil et ouvrir', e:{ or:50, pv:-6 }, m:'Clac ! Une flamme vous lèche le bras (−6 PV), mais 50 pièces d’or.' },
    { t:'Tirer le fil de loin', e:{ or:20 }, m:'Le coffre saute en l’air. Il reste 20 pièces éparpillées.' },
    { t:'Laisser', e:{}, m:'Trop risqué.' } ] },
  { id:'marchandambulant', t:'Un colporteur pressé', d:'Un colporteur et sa mule descendent vers la côte. « Je brade avant de partir ! »', choix:[
    { t:'Acheter 6 vivres (20 or)', cond:r => r.or >= 20, e:{ or:-20, vivres:6 }, m:'Six rations de pain noir.' },
    { t:'Acheter une bombe (25 or)', cond:r => r.or >= 25, e:{ or:-25, sacoche:'bombe' }, m:'« Faites gaffe avec ça. »' },
    { t:'Non merci', e:{}, m:'Il hausse les épaules et repart.' } ] },
  { id:'sourcechaude', t:'Une source chaude', d:'De la vapeur monte d’un bassin de pierre. L’eau sent le soufre, mais elle est bonne.', choix:[
    { t:'Se baigner', e:{ pv:10, vivres:-1 }, m:'+10 PV. Vous repartez détendu (−1 vivre, le temps passe).' },
    { t:'Remplir la gourde : +1 potion de soin', e:{ sacoche:'soin' }, m:'L’eau garde ses vertus en flacon.' } ] },
  { id:'cartographe', t:'La carte d’un disparu', d:'Un squelette serre une carte de l’île, à moitié brûlée. Oria l’aurait adorée.', choix:[
    { t:'La lire', e:{ revele:true }, m:'Vous reconnaissez les environs : les cases voisines se dévoilent plus loin.' },
    { t:'La vendre plus tard (+25 or)', e:{ or:25 }, m:'Elle ira au marchand.' } ] },
  { id:'gobelinmarchand', t:'Un gobelin qui négocie', d:'Un gobelin tremblant sort de derrière un rocher : « Pas taper ! Clé contre or ? »', choix:[
    { t:'Payer 35 or pour la clé', cond:r => r.or >= 35, e:{ or:-35, cle:1 }, m:'Il jette la clé et détale.' },
    { t:'Le chasser', e:{ or:10 }, m:'Il fuit en lâchant une bourse de 10 pièces.' } ] },
  { id:'statue', t:'La statue de la Guilde', d:'Une statue des fondateurs, noircie par la cendre. Une inscription : « Donne pour recevoir. »', choix:[
    { t:'Déposer 30 or', cond:r => r.or >= 30, e:{ or:-30, benediction:true }, m:'La statue s’éclaire : une bénédiction.' },
    { t:'Déposer une carte (retire une carte de ton deck)', e:{ retirer:true }, m:'Vous brûlez une carte : votre deck s’allège.' },
    { t:'Ne rien donner', e:{}, m:'La statue reste froide.' } ] },
  { id:'nidbraise', t:'Un nid de braises', d:'Des œufs de salamandre couvent dans la cendre chaude. Leur coquille vaut de l’or.', choix:[
    { t:'Prendre un œuf', e:{ or:45, malediction:true }, m:'45 or… mais la mère vous a vu : Mauvaise réputation sur toute l’île.' },
    { t:'Réchauffer vos mains et repartir', e:{ vivres:2 }, m:'La chaleur vous redonne du cœur : +2 vivres.' } ] },
  { id:'pontbrule', t:'Le pont brûlé', d:'Le pont de cordes est à moitié brûlé. On peut traverser vite… ou tailler un chemin dans la roche.', choix:[
    { t:'Traverser en courant', e:{ pv:-5, vivres:1 }, m:'Une corde cède, vous vous rattrapez de justesse (−5 PV). Le raccourci vous fait gagner 1 vivre.' },
    { t:'Contourner (−2 vivres)', e:{ vivres:-2 }, m:'Long, mais sûr.' } ] },
  { id:'ermite', t:'L’ermite du cratère', d:'Un vieil homme au regard clair vous observe. « Je peux affûter ton arme, ou ton esprit. »', choix:[
    { t:'Affûter l’arme (une relique au choix de l’ermite)', e:{ relique:true }, m:'Il vous tend un objet poli par des années de cendre.' },
    { t:'Affûter l’esprit (une carte épique)', e:{ carte:'epique' }, m:'Il vous enseigne une rune oubliée.' } ] },
  { id:'echo', t:'L’écho du Titan', d:'Le sol tremble. Au loin, un rugissement de fournaise. Vous sentez la peur… ou la rage.', choix:[
    { t:'La rage : +4 PV max', e:{ pvMax:4, pv:4 }, m:'Votre cœur bat plus fort.' },
    { t:'La prudence : +3 vivres', e:{ vivres:3 }, m:'Vous rationnez avec soin.' } ] },
];

// ----------------------------------------------------------------------------------------------- l'île (grille 7 × 9, tirée au sort d'après la graine)
const ILE_W = 7, ILE_H = 9;
const SALLES_ODY = {
  roche:{ e:'', n:'Roche' }, chemin:{ e:'·', n:'Chemin' }, depart:{ e:'⛵', n:'Le débarcadère' }, monstre:{ e:'⚔', n:'Monstres' }, elite:{ e:'💀', n:'Élite' },
  coffre:{ e:'🗝', n:'Coffre' }, source:{ e:'💧', n:'Source' }, marchand:{ e:'🏪', n:'Marchand' }, evenement:{ e:'❓', n:'Événement' }, autel:{ e:'🔥', n:'Autel' },
  mur:{ e:'🧱', n:'Mur fissuré' }, porte:{ e:'🚪', n:'La porte du boss' }, boss:{ e:'👑', n:'Le Titan de feu' },
};
const voisins = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && a < ILE_W && b >= 0 && b < ILE_H);
function bfs(cases, dep, marche) {
  const dist = {}; dist[dep.x + ',' + dep.y] = 0; const file = [[dep.x, dep.y]], prev = {};
  while (file.length) { const [x, y] = file.shift(); for (const [a, b] of voisins(x, y)) { const k = a + ',' + b; if (dist[k] !== undefined || !marche(cases[b][a])) continue; dist[k] = dist[x + ',' + y] + 1; prev[k] = x + ',' + y; file.push([a, b]); } }
  return { dist, prev };
}
function genereIle(graine, R0) {
  for (let essai = 0; essai < 400; essai++) {
    const R = rngDe(graine + '#' + essai);
    const cases = Array.from({ length:ILE_H }, (_, y) => Array.from({ length:ILE_W }, (_, x) => ({ x, y, t:'roche', vu:false, visite:false, fait:false })));
    const dep = { x:3, y:ILE_H - 1 }; cases[dep.y][dep.x].t = 'depart';
    let x = dep.x, y = dep.y, carve = 1, pas = 0;
    while (carve < 32 && pas < 900) {
      pas++; const r = R(); const [dx, dy] = r < .42 ? [0, -1] : r < .66 ? [1, 0] : r < .9 ? [-1, 0] : [0, 1];
      const nx = x + dx, ny = y + dy; if (nx < 0 || nx >= ILE_W || ny < 1 || ny >= ILE_H) continue;
      x = nx; y = ny; if (cases[y][x].t === 'roche') { cases[y][x].t = 'chemin'; carve++; }
    }
    // la porte = une case creusée de la rangée 1 ; le boss juste au-dessus (rangée 0), fermé sur les côtés
    const hauts = cases[1].filter(c => c.t === 'chemin'); if (!hauts.length) continue;
    const porte = tire(R, hauts); porte.t = 'porte'; const boss = cases[0][porte.x]; boss.t = 'boss';
    cases[0].forEach(c => { if (c !== boss) c.t = 'roche'; });
    const marche = c => c.t !== 'roche';
    const { dist, prev } = bfs(cases, dep, marche);
    const dp = dist[porte.x + ',' + porte.y]; if (dp === undefined || dp < 9 || dp > 13) continue;
    // chemin le plus court
    const chemin = []; let k = porte.x + ',' + porte.y; while (prev[k]) { chemin.unshift(k); k = prev[k]; } chemin.pop();
    const libres = []; cases.forEach(l => l.forEach(c => { if (c.t === 'chemin') libres.push(c); }));
    if (libres.length < 20) continue;
    const surChemin = chemin.map(s => { const [a, b] = s.split(',').map(Number); return cases[b][a]; });
    const pose = (c, t) => { c.t = t; };
    // sur le chemin direct : 2 monstres (au tiers et aux deux tiers) + 1 élite (aux trois quarts)
    const n = surChemin.length;
    pose(surChemin[Math.floor(n / 3)], 'monstre'); pose(surChemin[Math.floor(2 * n / 3)], 'monstre'); pose(surChemin[Math.min(n - 1, Math.floor(3 * n / 4) + 1)], 'elite');
    let reste = brasse(R, libres.filter(c => c.t === 'chemin'));
    const prend = (t, cond) => { const i = reste.findIndex(c => !cond || cond(c)); if (i < 0) return null; const c = reste.splice(i, 1)[0]; pose(c, t); return c; };
    const d = c => dist[c.x + ',' + c.y];
    prend('elite'); prend('elite');
    prend('marchand', c => d(c) >= 3 && d(c) <= 8); prend('coffre'); prend('coffre'); prend('source'); prend('source', c => d(c) >= 6); prend('autel');
    prend('evenement'); prend('evenement'); prend('evenement');
    // monstres ailleurs : 40 % du reste
    reste.forEach(c => { if (R() < .4) pose(c, 'monstre'); });
    // 1 ou 2 murs fissurés : une roche collée à exactement une case praticable (pas la rangée du boss)
    const murs = []; cases.forEach(l => l.forEach(c => { if (c.t !== 'roche' || c.y === 0) return; const v = voisins(c.x, c.y).filter(([a, b]) => cases[b][a].t !== 'roche' && cases[b][a].t !== 'boss'); if (v.length === 1) murs.push(c); }));
    brasse(R, murs).slice(0, 1 + (R() < .5 ? 1 : 0)).forEach(c => pose(c, 'mur'));
    // niveau des monstres selon la distance ; ennemis tirés
    const elites = brasse(R, ['heros', 'heros', 'monstre']); let ie = 0;
    const autres = typeof ORDRE !== 'undefined' ? ORDRE : ['maelle', 'aldric', 'pip', 'oria', 'gorm', 'zephine'];
    cases.forEach(l => l.forEach(c => {
      if (c.t === 'monstre') { c.niv = d(c) <= 4 ? 1 : d(c) <= 8 ? 2 : 3; const pool = c.niv === 1 ? ['gobelin', 'loup', 'salamandre'] : c.niv === 2 ? ['loup', 'golem', 'salamandre', 'cultiste'] : ['golem', 'cultiste', 'elementaire']; c.ennemi = tire(R, pool); }
      if (c.t === 'elite') { const s = elites[ie++ % 3]; c.niv = 2; if (s === 'monstre') c.ennemi = tire(R, ['chefgobelin', 'drake', 'colosse']); else { c.ennemi = 'heros'; c.renfort = tire(R, ['pc', 'pv', 'bouclier']); } }
      if (c.t === 'evenement') c.ev = null;
      if (c.t === 'boss') { c.ennemi = 'titan'; c.niv = 1; }
    }));
    // événements distincts
    const evs = brasse(R, EVENEMENTS.map(e => e.id)); let iev = 0; cases.forEach(l => l.forEach(c => { if (c.t === 'evenement') c.ev = evs[iev++ % evs.length]; }));
    cases[dep.y][dep.x].vu = cases[dep.y][dep.x].visite = true; voisins(dep.x, dep.y).forEach(([a, b]) => { cases[b][a].vu = true; });
    return { cases, dep, porte:{ x:porte.x, y:porte.y }, boss:{ x:boss.x, y:boss.y }, direct:dp, essai };
  }
  return null;
}

// ----------------------------------------------------------------------------------------------- la partie (sauvée sur le téléphone à chaque case)
const ODY_CLE = 'guilde-odyssee', COLLECTION_CLE = 'guilde-collection', RECORDS_CLE = 'guilde-odyssee-records';
const VIVRES_DEPART = 20, OR_DEPART = 30;
const DEFIS = [
  { id:'expeditif', n:'Expéditif', d:'Vaincre en 4 tours ou moins.' },
  { id:'sangfroid', n:'Sang-froid', d:'Finir le combat avec au moins 3 PC en réserve.' },
  { id:'econome', n:'Économe', d:'Ne pas utiliser de potion ni de bombe.' },
  { id:'chanceux', n:'Chanceux', d:'Poser un 6 sur ta Garde.' },
  { id:'demonstration', n:'Démonstration', d:'Achever l’ennemi avec ton Ultime.' },
  { id:'stratege', n:'Stratège', d:'Réussir une Technique de 4 dés ou plus.' },
];
function lireOdyssee() { try { return JSON.parse(localStorage.getItem(ODY_CLE) || 'null'); } catch (e) { return null; } }
function ecrireOdyssee(r) { if (r) localStorage.setItem(ODY_CLE, JSON.stringify(r)); else localStorage.removeItem(ODY_CLE); }
function lireCollection() { try { return JSON.parse(localStorage.getItem(COLLECTION_CLE) || '[]'); } catch (e) { return []; } }
function ajouteCollection(cles) { const c = lireCollection(); let n = 0; cles.forEach(k => { if (!c.includes(k) && CARTES[k] && rarete(k) !== 'm') { c.push(k); n++; } }); localStorage.setItem(COLLECTION_CLE, JSON.stringify(c)); return n; }
function lireRecords() { try { return JSON.parse(localStorage.getItem(RECORDS_CLE) || '[]'); } catch (e) { return []; } }
function nouvelleOdyssee(heros, graine) {
  graine = graine || ('ile-' + Math.random().toString(36).slice(2, 8));
  const ile = genereIle(graine); if (!ile) return null;
  const h = HEROS[heros], pv = Math.round(h.pv * 1.8); // en Odyssée le héros a 1,8 × ses PV du Duel (le papier disait 75 pour 44) : il enchaîne 5 à 6 combats sans soin automatique
  return { v:1, heros, graine, ile:ile.cases, pos:{ ...ile.dep }, porte:ile.porte, bossPos:ile.boss, direct:ile.direct, debut:Date.now(),
    pv, pvMax:pv, or:OR_DEPART, vivres:VIVRES_DEPART, deck:deckBase(heros), reliques:[], sacoche:['soin'], benes:[], males:[], fragments:0, cles:0,
    stats:{ cases:1, combats:0, victoires:0, tours:0, defis:0, cartesVues:[] }, combat:null, journal:[`Débarquement sur les Terres brûlées (${h.nom}).`] };
}
// la vie, bornée ; le deck effectif en combat = run.deck (les malédictions y sont déjà)
const pvMaxEffectif = r => r.pvMax;

// ----------------------------------------------------------------------------------------------- les règles hors combat (partagées par l'écran de l'île et les simulations)
const caseA = (r, x, y) => (r.ile[y] || [])[x];
const hasard = r => { r.tirage = (r.tirage || 0) + 1; return rngDe(r.graine + '/' + r.tirage); };
function peutAller(r, x, y) {
  const c = caseA(r, x, y); if (!c || c.t === 'roche' || !c.vu) return false;
  if (Math.abs(x - r.pos.x) + Math.abs(y - r.pos.y) !== 1) return false;
  if (c.t === 'boss') { const p = caseA(r, r.porte.x, r.porte.y); if (!p.fait) return false; }
  if (c.t === 'mur' && !c.fait) return r.sacoche.includes('bombe') || r.vivres >= 3;
  return true;
}
// se déplacer : 1 vivre par case nouvelle (revenir est gratuit) ; sans vivres, 3 PV. Révèle les voisines. Retourne la case (et ce qu'elle demande).
function deplace(r, x, y) {
  const c = caseA(r, x, y); if (!peutAller(r, x, y)) return null;
  const neuve = !c.visite;
  if (c.t === 'mur' && !c.fait) { if (r.sacoche.includes('bombe')) { r.sacoche.splice(r.sacoche.indexOf('bombe'), 1); r.journal.push('💣 La bombe ouvre le mur fissuré.'); } else { r.vivres -= 3; r.journal.push('🧱 Trois vivres pour creuser le mur fissuré.'); } }
  if (neuve) { if (r.vivres > 0) r.vivres--; else { r.pv -= 3; r.journal.push('🍞 Plus de vivres : −3 PV.'); } r.stats.cases++; }
  r.pos = { x, y }; c.visite = true; c.vu = true; voisins(x, y).forEach(([a, b]) => { caseA(r, a, b).vu = true; });
  if (r.pv <= 0) return { c, mort:true };
  return { c, neuve };
}
const prixMarchand = (r, p) => Math.round(p * (r.males.includes('cher') ? 1.2 : 1));
const PRIX_CARTE = { c:50, r:80, e:120 };
// un combat commence : on note qui, où, le défi ; l'écran du Duel lit tout ça
function lanceCombat(r, c) {
  const R = hasard(r); let ennemi = c.ennemi;
  if (ennemi === 'heros') { const autres = ORDRE.filter(h => h !== r.heros); ennemi = tire(R, autres); }
  r.combat = { id:Math.random().toString(36).slice(2), x:c.x, y:c.y, type:c.t, ennemi, niv:c.niv || 1, renfort:c.renfort || null, defi:tire(R, DEFIS).id, resultat:null };
  return r.combat;
}
// après un combat gagné : or, fragment, clé, défi, tirage de cartes. Retourne ce qu'il y a à montrer.
function recompenseCombat(r) {
  const cb = r.combat, res = cb.resultat, c = caseA(r, cb.x, cb.y); if (!res) return null;
  r.stats.combats++; r.stats.tours += res.tours; r.combat = null;
  if (!res.gagne) { r.journal.push(`💀 ${HEROS[cb.ennemi].nom} a eu raison de toi.`); return { gagne:false }; }
  c.fait = true; r.stats.victoires++;
  let or = cb.type === 'boss' ? 150 : cb.type === 'elite' ? 80 : 40;
  if (r.reliques.includes('bourse')) or += 10; if (r.benes.includes('bourse')) or += 15; if (res.defiOk) { or += 30; r.stats.defis++; }
  r.or += or;
  const out = { gagne:true, or, defiOk:res.defiOk, ennemi:HEROS[cb.ennemi].nom, type:cb.type };
  if (cb.type === 'elite') { r.fragments++; r.cles++; out.fragment = true; if (r.sacoche.length < 2) { r.sacoche.push('soin'); out.potion = true; } }
  if (cb.type === 'boss') { out.boss = true; r.journal.push(`👑 Le Titan de feu est tombé ! +${or} or.`); return out; }
  out.draft = draft(hasard(r), cb.type === 'elite' ? 1 : 0, r.deck);
  r.journal.push(`🏆 ${out.ennemi} vaincu : +${or} or${out.fragment ? ', un fragment de rune et une clé' : ''}.`);
  return out;
}
function gardeCarte(r, k) { if (!k) return; r.deck.push(k); if (!r.stats.cartesVues.includes(k)) r.stats.cartesVues.push(k); r.journal.push(`🂠 ${CARTES[k].n} rejoint ton deck.`); }
function retireCarte(r, k) { const i = r.deck.indexOf(k); if (i >= 0) { r.deck.splice(i, 1); r.journal.push(`🔥 ${CARTES[k].n} quitte ton deck.`); } }
// la boutique d'une case marchand : fabriquée à la première visite, gardée
function stockMarchand(r, c) {
  if (!c.stock) { const R = hasard(r); const cartes = []; for (let n = 0; n < 40 && cartes.length < 5; n++) { const d = draft(R, 1, []); d.forEach(k => { if (cartes.length < 5 && !cartes.includes(k)) cartes.push(k); }); }
    const rel = Object.keys(RELIQUES).filter(k => !r.reliques.includes(k)); c.stock = { cartes, relique:rel.length ? tire(R, rel) : null, retire:1, pvmax:2 }; }
  return c.stock;
}
function achete(r, c, quoi, k) {
  const st = stockMarchand(r, c); const prix = n => prixMarchand(r, n);
  if (quoi === 'carte') { const p = prix(PRIX_CARTE[rarete(k)]); if (r.or < p || !st.cartes.includes(k)) return false; r.or -= p; st.cartes.splice(st.cartes.indexOf(k), 1); gardeCarte(r, k); return true; }
  if (quoi === 'retirer') { const p = prix(60); if (r.or < p || !st.retire || !r.deck.includes(k)) return false; r.or -= p; st.retire = 0; retireCarte(r, k); return true; }
  if (quoi === 'sacoche') { const p = prix(SACOCHE[k].prix); if (r.or < p || r.sacoche.length >= 2) return false; r.or -= p; r.sacoche.push(k); r.journal.push(`🏪 ${SACOCHE[k].n} achetée.`); return true; }
  if (quoi === 'pvmax') { const p = prix(70); if (r.or < p || !st.pvmax) return false; r.or -= p; st.pvmax--; r.pvMax += 5; r.pv += 5; r.journal.push('🏪 Vitalité : +5 PV max.'); return true; }
  if (quoi === 'vivres') { const p = prix(20); if (r.or < p) return false; r.or -= p; r.vivres += 5; r.journal.push('🏪 +5 vivres.'); return true; }
  if (quoi === 'relique') { if (!st.relique || r.reliques.length >= 3) return false; const p = prix(RELIQUES[st.relique].prix); if (r.or < p) return false; r.or -= p; r.reliques.push(st.relique); r.journal.push(`🏪 ${RELIQUES[st.relique].n} achetée.`); st.relique = null; return true; }
  return false;
}
// l'autel : 3 bénédictions proposées, une malédiction tirée en échange
function autelOptions(r, c) { if (!c.offre) { const R = hasard(r); c.offre = { benes:brasse(R, Object.keys(BENEDICTIONS).filter(b => !r.benes.includes(b))).slice(0, 3), male:tire(R, Object.keys(MALEDICTIONS)) }; } return c.offre; }
function donneBenediction(r, b) { if (r.benes.includes(b)) return; r.benes.push(b); if (b === 'vie') { r.pvMax += 6; r.pv += 6; } r.journal.push(`✨ Bénédiction : ${BENEDICTIONS[b].n}.`); }
function donneMalediction(r, m) { r.males.push(m); const M = MALEDICTIONS[m]; if (M.carte) r.deck.push(M.carte); if (m === 'frele') { r.pvMax = Math.max(10, r.pvMax - 5); r.pv = Math.min(r.pv, r.pvMax); } r.journal.push(`🕯 Malédiction : ${M.n}.`); }
function autelChoisit(r, c, b) { const o = autelOptions(r, c); if (!o.benes.includes(b)) return false; donneBenediction(r, b); donneMalediction(r, o.male); c.fait = true; return true; }
function source(r, c, option) { if (c.fait) return false; c.fait = true; if (option === 'soin') { const a = r.pv; r.pv = Math.min(r.pvMax, r.pv + 20); r.journal.push(`💧 La source rend ${r.pv - a} PV.`); } else { const k = r.deck.find(x => rarete(x) === 'm'); if (k) retireCarte(r, k); } return true; }
function reliquesProposees(r, n) { const R = hasard(r); return brasse(R, Object.keys(RELIQUES).filter(k => !r.reliques.includes(k))).slice(0, n || 2); }
function prendRelique(r, k) { if (r.reliques.includes(k) || r.reliques.length >= 3) return false; r.reliques.push(k); r.journal.push(`💎 ${RELIQUES[k].n} !`); return true; }
// un événement : applique le choix ; retourne { m (message), suite:'relique'|'draft'|'retirer'|null, cartes? }
function evenementChoisit(r, c, i) {
  const ev = EVENEMENTS.find(e => e.id === c.ev), ch = ev.choix[i]; if (!ch || (ch.cond && !ch.cond(r))) return null;
  const e = ch.e, out = { m:ch.m, suite:null }; c.fait = true;
  if (e.or) r.or = Math.max(0, r.or + e.or); if (e.vivres) r.vivres = Math.max(0, r.vivres + e.vivres);
  if (e.pvMax) r.pvMax += e.pvMax; if (e.pv) r.pv = Math.max(1, Math.min(r.pvMax, r.pv + e.pv));
  if (e.cle) r.cles += e.cle;
  if (e.sacoche) { if (e.sacoche[0] === '-') { const k = e.sacoche.slice(1); const j = r.sacoche.indexOf(k); if (j >= 0) r.sacoche.splice(j, 1); } else if (r.sacoche.length < 2) r.sacoche.push(e.sacoche); else out.m += ' (sacoche pleine : la potion est perdue)'; }
  if (e.malediction) donneMalediction(r, tire(hasard(r), Object.keys(MALEDICTIONS)));
  if (e.benediction) { const l = Object.keys(BENEDICTIONS).filter(b => !r.benes.includes(b)); if (l.length) donneBenediction(r, tire(hasard(r), l)); }
  if (e.relique) { out.suite = 'relique'; out.reliques = reliquesProposees(r, 2); }
  if (e.carte === 'draft1') { out.suite = 'draft'; out.cartes = draft(hasard(r), 1, r.deck); }
  if (e.carte === 'epique') { out.suite = 'draft'; out.cartes = draft(hasard(r), 2, r.deck).filter(k => rarete(k) === 'e').slice(0, 3); if (!out.cartes.length) out.cartes = draft(hasard(r), 2, r.deck); }
  if (e.retirer) out.suite = 'retirer';
  if (e.revele) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = caseA(r, r.pos.x + dx, r.pos.y + dy); if (k && Math.abs(dx) + Math.abs(dy) <= 2) k.vu = true; } }
  r.journal.push(`❓ ${ev.t} : ${ch.t}.`);
  return out;
}
function ouvreCoffre(r, c) { if (c.fait || r.cles < 1) return null; r.cles--; c.fait = true; const R = hasard(r); const rel = Object.keys(RELIQUES).filter(k => !r.reliques.includes(k));
  if (rel.length && r.reliques.length < 3 && R() < .5) { const k = tire(R, rel); r.reliques.push(k); r.journal.push(`🗝 Le coffre contenait ${RELIQUES[k].n}.`); return { relique:k }; }
  r.journal.push('🗝 Le coffre contenait des cartes rares.'); return { draft:draft(R, 2, r.deck), deux:true }; }
function ouvrePorte(r) { const p = caseA(r, r.porte.x, r.porte.y); if (p.fait) return true; if (r.fragments >= 2) { p.fait = true; const a = r.pv; r.pv = Math.min(r.pvMax, r.pv + 15); r.journal.push(`🚪 Les deux fragments s’assemblent : la porte s’ouvre. Bivouac devant la porte : +${r.pv - a} PV.`); return true; } return false; }
// fin de l'Odyssée : score, collection, record
function finOdysseeRun(r, gagne) {
  const duree = Math.round((Date.now() - r.debut) / 60000);
  const score = r.stats.victoires * 50 + r.stats.cases * 5 + r.or + (gagne ? 300 : 0) + r.stats.defis * 30 - r.stats.tours * 2;
  const base = deckBase(r.heros), nouvelles = r.deck.filter(k => !base.includes(k) && rarete(k) !== 'm');
  const ajoutees = typeof localStorage !== 'undefined' ? ajouteCollection([...new Set([...nouvelles, ...r.stats.cartesVues])]) : 0;
  const rec = { quand:new Date().toISOString(), heros:r.heros, gagne, score, cases:r.stats.cases, combats:r.stats.combats, victoires:r.stats.victoires, tours:r.stats.tours, defis:r.stats.defis, or:r.or, duree, graine:r.graine, pv:r.pv };
  if (typeof localStorage !== 'undefined') { const l = lireRecords(); l.unshift(rec); localStorage.setItem(RECORDS_CLE, JSON.stringify(l.slice(0, 50))); ecrireOdyssee(null); }
  return { ...rec, ajoutees, nouvelles };
}

// ----------------------------------------------------------------------------------------------- pilote automatique (simulations d'équilibrage : l'ordinateur explore l'île)
// Politique simple : va vers la porte par le chemin le plus court, en passant d'abord par les 2 élites les plus proches ; s'arrête aux sources
// et au marchand sur son passage ; garde la carte la plus rare au tirage ; achète une potion de soin s'il a l'or.
function prochaineCible(r) {
  const marche = c => c.t !== 'roche' && !(c.t === 'boss');
  const { dist, prev } = bfs(r.ile, r.pos, marche);
  const vers = c => { const chemin = []; let k = c.x + ',' + c.y; while (prev[k]) { chemin.unshift(k); k = prev[k]; } return chemin.map(s => s.split(',').map(Number)); };
  const cibles = [], d = c => dist[c.x + ',' + c.y];
  // un joueur raisonnable : une source proche quand la vie baisse, un marchand proche quand il a de l'or et de la place pour une potion
  if (r.pv < r.pvMax * .55) { const src = r.ile.flat().filter(c => c.t === 'source' && !c.fait && d(c) !== undefined && d(c) <= 4 && r.vivres >= d(c)).sort((a, b) => d(a) - d(b))[0]; if (src) return vers(src); }
  if (r.or >= 40 && r.sacoche.length < 2 && r.pv < r.pvMax * .7) { const m = r.ile.flat().filter(c => c.t === 'marchand' && d(c) !== undefined && d(c) <= 3 && r.vivres >= d(c) && !c.visite).sort((a, b) => d(a) - d(b))[0]; if (m) return vers(m); }
  r.ile.flat().forEach(c => { if (d(c) === undefined) return; if (c.t === 'elite' && !c.fait && r.fragments < 2) cibles.push(c); });
  if (cibles.length) { cibles.sort((a, b) => dist[a.x + ',' + a.y] - dist[b.x + ',' + b.y]); return vers(cibles[0]); }
  if (r.fragments >= 2) { const p = caseA(r, r.porte.x, r.porte.y); return vers(p); }
  return null;
}
