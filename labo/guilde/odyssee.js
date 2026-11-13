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
// ================================================================== ACTE II · L'ÎLE DU GIVRE (12/11 nuit, prototype à valider)
// Mécanique de l'île : le GIVRE ❄. Certains coups posent du Givre sur le héros ; à 3 (4 avec la Braise éternelle), il est GELÉ :
// 5 dégâts et un dé de moins au prochain tour (Handicap). Même principe que les Braises du Titan, pour que ce soit lisible.
function givre(D, n) {
  if (!D || !D.pv) return; const seuil = (D.reliques || []).includes('braise') ? 4 : 3;
  D.givre = (D.givre || 0) + (n || 1); log(`❄ Givre ${Math.min(D.givre, seuil)}/${seuil} sur ${D.nom}.`);
  if (D.givre >= seuil) { D.givre = 0; log(`❄ ${D.nom} est GELÉ : 5 dégâts et un dé de moins au prochain tour !`); degats({ J:D }, 5, true); altere(D, 'handicap'); }
}
Object.assign(MONSTRES, {
  lutin:       { nom:'Lutin du givre', titre:'le farceur', emoji:'🧝', c:'#5aa9d6', pv:15, ile:'givre', role:'Vole des PC et pose du Givre. Faible seul.', cit:'« Hi hi ! Ça pique, hein ? »',
    garde:{ n:'Pirouette', txt:'1 dé', d:'Bouclier = la moitié du dé (arrondi au-dessus).', cond:vs => vs.length === 1, val:vs => Math.ceil(vs[0] / 2), f:(J, vs) => { const b = Math.ceil(vs[0] / 2); J.gardeB += b; log(`${J.nom} : Pirouette, Bouclier ${b}.`); } },
    pouvoir:{ n:'Boule de neige', txt:'2 dés identiques', d:'3 dégâts, vole 1 PC et 1 Givre au héros.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 3); const D = adv(J); if (D.pc > 0) { D.pc--; J.pc = Math.min(6, J.pc + 1); log(`${J.nom} vole 1 PC.`); } givre(D); } },
    renforts:[] },
  loupblanc:   { nom:'Loup blanc', titre:'le chasseur', emoji:'🐺', c:'#c9d6e3', pv:16, ile:'givre', role:'Rapide, mord avec le froid. Chasse avec un louveteau.', cit:'« … »',
    garde:{ n:'Fourrure épaisse', txt:'1 dé pair', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1 && vs[0] % 2 === 0, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`${J.nom} : Fourrure épaisse, Bouclier ${vs[0]}.`); } },
    pouvoir:{ n:'Morsure glacée', txt:'3 dés de 3 ou plus', d:'6 dégâts à une cible et 1 Givre au héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 6); givre(adv(J)); } },
    renforts:[{ n:'Louveteau blanc', a:2, v:3 }] },
  esprit:      { nom:'Esprit du blizzard', titre:'le hurleur', emoji:'👻', c:'#a8c8ff', pv:16, ile:'givre', role:'Insaisissable : esquive, et son souffle glace.', cit:'« Hoouuuu… »',
    garde:{ n:'Tourbillon', txt:'1 dé impair', d:'Esquive : le prochain coup reçu est divisé par deux.', cond:vs => vs.length === 1 && vs[0] % 2 === 1, val:() => 4, f:J => { J.esquive = true; log(`${J.nom} se dissout dans la neige : Esquive.`); } },
    pouvoir:{ n:'Souffle gelé', txt:'2 dés impairs', d:'4 dégâts au héros et 1 Givre.', cond:vs => vs.length === 2 && vs.every(v => v % 2 === 1), cible:'ennemi', f:J => { degats({ J:adv(J) }, 4); givre(adv(J)); } },
    renforts:[] },
  ours:        { nom:'Ours des glaces', titre:'le colosse blanc', emoji:'🐻‍❄️', c:'#dfe9f2', pv:20, ile:'givre', role:'Lent et costaud : gros bouclier et coups lourds.', cit:'« GRRAOOO ! »',
    garde:{ n:'Dos rond', txt:'1 dé', d:'Bouclier = la valeur du dé + 2.', cond:vs => vs.length === 1, val:vs => vs[0] + 2, f:(J, vs) => { J.gardeB += vs[0] + 2; log(`${J.nom} : Dos rond, Bouclier ${vs[0] + 2}.`); } },
    pouvoir:{ n:'Coup de patte', txt:'2 dés identiques de 4 ou plus', d:'8 dégâts à une cible.', cond:vs => vs.length === 2 && vs[0] === vs[1] && vs[0] >= 4, cible:'ennemi', f:(J, vs, k) => degats(k, 8) },
    renforts:[] },
  chaman:      { nom:'Chaman du froid', titre:'le sculpteur de glace', emoji:'🧙‍♂️', c:'#4a7ac9', pv:14, ile:'givre', role:'Fait pousser des Stalagmites qui font Barrière.', cit:'« La glace obéit. »',
    garde:{ n:'Mur de neige', txt:'1 dé', d:'Bouclier 4.', cond:vs => vs.length === 1, val:() => 4, f:J => { J.gardeB += 4; log(`${J.nom} : Mur de neige, Bouclier 4.`); } },
    pouvoir:{ n:'Stalagmite', txt:'dé = 6, ou 2 dés identiques', d:'Une Stalagmite 1 / 5 Barrière (2 au plus), sinon 6 dégâts et 1 Givre.', cond:vs => (vs.length === 1 && vs[0] === 6) || (vs.length === 2 && vs[0] === vs[1]), cible:'ennemi',
      f:(J, vs, k) => { if (J.front.filter(u => u.barriere).length < 2) invoque(J, { n:'Stalagmite', a:1, v:5, barriere:true }); else { degats(k, 6); givre(adv(J)); } } },
    renforts:[{ n:'Stalagmite', a:1, v:5, barriere:true }] },
  golemglace:  { nom:'Golem de glace', titre:'le cœur gelé', emoji:'🧊', c:'#7fd3ff', pv:22, ile:'givre', role:'Le plus dangereux : chaque coup pose du Givre, et une Avalanche quand sa jauge est pleine.', cit:'« … »',
    garde:{ n:'Carapace de glace', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`${J.nom} : Carapace de glace, Bouclier ${vs[0]}.`); } },
    pouvoir:{ n:'Poing de givre', txt:'3 dés de 4 ou plus', d:'8 dégâts à une cible et 1 Givre au héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 4), cible:'ennemi', f:(J, vs, k) => { degats(k, 8); givre(adv(J)); } },
    ultime:{ n:'Avalanche', txt:'3 dés', d:'12 dégâts au héros et 2 Givre.', cond:vs => vs.length === 3, cible:'ennemi', f:J => { degats({ J:adv(J) }, 12); givre(adv(J), 2); } },
    renforts:[] },
  // --- les élites du Givre
  yeti:        { nom:'Le Yéti', titre:'la légende des cimes', emoji:'🦍', c:'#e8f1f8', pv:24, majeur:true, ile:'givre', role:'Frappe très fort, et plus il a mal, plus il cogne.', cit:'« HOUUUAAAA ! »',
    garde:{ n:'Pelage de neige', txt:'1 dé', d:'Bouclier = la valeur du dé + 1.', cond:vs => vs.length === 1, val:vs => vs[0] + 1, f:(J, vs) => { J.gardeB += vs[0] + 1; log(`${J.nom} : Pelage de neige, Bouclier ${vs[0] + 1}.`); } },
    pouvoir:{ n:'Martèlement', txt:'2 dés identiques', d:'7 dégâts à une cible (10 si le Yéti a moins de la moitié de ses PV).', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => degats(k, J.pv < J.pvMax / 2 ? 10 : 7) },
    renforts:[] },
  harpie:      { nom:'Harpie des neiges', titre:'la reine des vents', emoji:'🦅', c:'#9fb8d9', pv:22, majeur:true, ile:'givre', role:'Esquive sans cesse ; ses serres posent du Givre.', cit:'« Kriiiii ! »',
    garde:{ n:'Coup d’aile', txt:'1 dé pair', d:'Esquive : le prochain coup reçu est divisé par deux.', cond:vs => vs.length === 1 && vs[0] % 2 === 0, val:() => 5, f:J => { J.esquive = true; log(`${J.nom} s’envole : Esquive.`); } },
    pouvoir:{ n:'Serres de glace', txt:'3 dés de 3 ou plus', d:'7 dégâts à une cible et 1 Givre au héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 7); givre(adv(J)); } },
    ultime:{ n:'Blizzard', txt:'3 dés', d:'10 dégâts au héros et 2 Givre.', cond:vs => vs.length === 3, cible:'ennemi', f:J => { degats({ J:adv(J) }, 10); givre(adv(J), 2); } },
    renforts:[] },
  sentinelle:  { nom:'Sentinelle de cristal', titre:'la gardienne immobile', emoji:'💎', c:'#6fe3ff', pv:26, majeur:true, ile:'givre', role:'Deux Éclats de cristal Barrière la protègent ; ses rayons glacent.', cit:'« … »',
    garde:{ n:'Prisme', txt:'1 dé', d:'Bouclier = la valeur du dé + 2.', cond:vs => vs.length === 1, val:vs => vs[0] + 2, f:(J, vs) => { J.gardeB += vs[0] + 2; log(`${J.nom} : Prisme, Bouclier ${vs[0] + 2}.`); } },
    pouvoir:{ n:'Rayon gelé', txt:'2 dés identiques de 4 ou plus', d:'8 dégâts à une cible et 1 Givre au héros.', cond:vs => vs.length === 2 && vs[0] === vs[1] && vs[0] >= 4, cible:'ennemi', f:(J, vs, k) => { degats(k, 8); givre(adv(J)); } },
    renforts:[{ n:'Éclat de cristal', a:1, v:6, barriere:true }, { n:'Éclat de cristal', a:1, v:6, barriere:true }] },
});
// la gardienne de l'île : la Vouivre des glaces (la vouivre est un dragon-serpent des légendes de France), 3 phases comme le Titan
Object.assign(BOSS, {
  vouivre: { nom:'La Vouivre des glaces', titre:'la gardienne du nord', emoji:'🐉', c:'#7fd3ff', pv:54, boss:true, ile:'givre', role:'Trois phases. Chaque morsure pose du Givre : à trois, tu es gelé.', cit:'« Ici, même le feu a froid. »',
    phases:[
      { seuil:1, garde:{ n:'Écailles de glace', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`La Vouivre : Écailles de glace, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Morsure de givre', txt:'2 dés identiques', d:'7 dégâts et 1 Givre sur le héros.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 7); givre(adv(J)); } } },
      { seuil:2 / 3, garde:{ n:'Écailles de glace', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`La Vouivre : Écailles de glace, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Souffle polaire', txt:'3 dés de 3 ou plus', d:'7 dégâts au héros, 3 à chacune de ses créatures, et 1 Givre.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:J => { const D = adv(J); [...D.front].forEach(u => degats({ J:D, u }, 3)); degats({ J:D }, 7); givre(D); } } },
      { seuil:1 / 3, garde:{ n:'Cœur de glace', txt:'1 dé', d:'Bouclier = 2 × la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0] * 2, f:(J, vs) => { J.gardeB += vs[0] * 2; log(`La Vouivre : Cœur de glace, Bouclier ${vs[0] * 2}.`); } },
        pouvoir:{ n:'Tempête blanche', txt:'2 dés de 5 ou plus', d:'11 dégâts et 2 Givre sur le héros.', cond:vs => vs.length === 2 && vs.every(v => v >= 5), cible:'ennemi', f:(J, vs, k) => { degats(k, 11); givre(adv(J), 2); } } },
    ],
    ultime:{ n:'Hiver éternel', txt:'3 dés', d:'12 dégâts au héros et il est gelé tout de suite.', cond:vs => vs.length === 3, cible:'ennemi', f:J => { const D = adv(J); degats({ J:D }, 12); givre(D, 9); } },
    renforts:[] },
});
// les îles de l'Odyssée : ce qui change d'un acte à l'autre (monstres, élites, boss, décors des combats, textes)
const ILES = {
  brulees:{ dur:1, acte:'Acte I', nom:'les Terres brûlées', court:'Terres brûlées', boss:'titan', bossNom:'Le Titan de feu',
    pools:[['gobelin', 'loup', 'salamandre'], ['loup', 'golem', 'salamandre', 'cultiste'], ['golem', 'cultiste', 'elementaire']], elites:['chefgobelin', 'drake', 'colosse'],
    lieux:{ monstre:'cendres', fort:'lave', elite:'ruines', boss:'cratere' }, evenements:null },
  givre:{ dur:1.04, acte:'Acte II', nom:'l’île du Givre', court:'Île du Givre', boss:'vouivre', bossNom:'La Vouivre des glaces',
    pools:[['lutin', 'loupblanc', 'esprit'], ['loupblanc', 'ours', 'esprit', 'chaman'], ['ours', 'chaman', 'golemglace']], elites:['yeti', 'harpie', 'sentinelle'],
    lieux:{ monstre:'neige', fort:'glace', elite:'cristal', boss:'sommet' }, evenements:['voyageur', 'autelbrise', 'marchandambulant', 'cartographe', 'statue', 'ermite', 'lacgele', 'cabane', 'aurore', 'traineau'] },
};
const ILE = r => ILES[(r && r.acte) || 'brulees'] || ILES.brulees;

// ================================================================== ACTE III · L'ABÎME DU VIDE (12/11 nuit, prototype à valider)
// Mécanique de l'île : la CORRUPTION 🟣. Certains coups corrompent le héros ; à 3 (4 avec le Talisman de sel), le Vide le dévore :
// 4 dégâts, SILENCE (pas de Sort à son prochain tour) et l'ennemi qui l'a corrompu regagne 4 PV.
function corrompt(D, n) {
  if (!D || !D.pv) return; const seuil = (D.reliques || []).includes('sel') ? 4 : 3, A = adv(D);
  D.corruption = (D.corruption || 0) + (n || 1); log(`🟣 Corruption ${Math.min(D.corruption, seuil)}/${seuil} sur ${D.nom}.`);
  if (D.corruption >= seuil) { D.corruption = 0; log(`🟣 Le Vide dévore ${D.nom} : 4 dégâts, Silence, et ${A.nom} se nourrit (+4 PV) !`); degats({ J:D }, 4, true); D.silence = true; if (A && A.pv > 0) A.pv = Math.min(A.pvMax, A.pv + 4); }
}
Object.assign(MONSTRES, {
  ombre:       { nom:'Ombre rampante', titre:'la chuchoteuse', emoji:'👤', c:'#6b4a9a', pv:17, ile:'abime', role:'Faible, mais elle corrompt à chaque coup.', cit:'« … viens… »',
    garde:{ n:'Se fondre', txt:'1 dé impair', d:'Esquive : le prochain coup reçu est divisé par deux.', cond:vs => vs.length === 1 && vs[0] % 2 === 1, val:() => 4, f:J => { J.esquive = true; log(`${J.nom} se fond dans le noir : Esquive.`); } },
    pouvoir:{ n:'Murmure', txt:'2 dés identiques', d:'3 dégâts au héros et 1 Corruption.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:J => { degats({ J:adv(J) }, 3); corrompt(adv(J)); } },
    renforts:[] },
  rongeur:     { nom:'Rongeur du Vide', titre:'la nuée', emoji:'🦇', c:'#4a3a6a', pv:16, ile:'abime', role:'Arrive en nuée : deux petites chauves-souris l’accompagnent.', cit:'« Skriii ! »',
    garde:{ n:'Nuée', txt:'1 dé', d:'Bouclier 3.', cond:vs => vs.length === 1, val:() => 3, f:J => { J.gardeB += 3; log(`${J.nom} : Nuée, Bouclier 3.`); } },
    pouvoir:{ n:'Morsures', txt:'3 dés de 2 ou plus', d:'5 dégâts à une cible.', cond:vs => vs.length === 3 && vs.every(v => v >= 2), cible:'ennemi', f:(J, vs, k) => degats(k, 5) },
    renforts:[{ n:'Chauve-souris', a:1, v:2, charge:true }, { n:'Chauve-souris', a:1, v:2, charge:true }] },
  oeil:        { nom:'Œil flottant', titre:'le guetteur', emoji:'👁️', c:'#a855f7', pv:18, ile:'abime', role:'Son regard vide les PC et corrompt.', cit:'« Je te vois. »',
    garde:{ n:'Paupière', txt:'1 dé pair', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1 && vs[0] % 2 === 0, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`${J.nom} : Paupière, Bouclier ${vs[0]}.`); } },
    pouvoir:{ n:'Regard du néant', txt:'2 dés pairs', d:'4 dégâts, le héros perd 1 PC, et 1 Corruption.', cond:vs => vs.length === 2 && vs.every(v => v % 2 === 0), cible:'ennemi', f:J => { const D = adv(J); degats({ J:D }, 4); if (D.pc > 0) D.pc--; corrompt(D); } },
    renforts:[] },
  chevalier:   { nom:'Chevalier déchu', titre:'le serment brisé', emoji:'🛡️', c:'#5a5a7a', pv:21, ile:'abime', role:'Ancien héros de la Guilde : il pare et frappe fort.', cit:'« J’ai juré, autrefois. »',
    garde:{ n:'Parade', txt:'1 dé', d:'Bouclier = la valeur du dé + 2.', cond:vs => vs.length === 1, val:vs => vs[0] + 2, f:(J, vs) => { J.gardeB += vs[0] + 2; log(`${J.nom} : Parade, Bouclier ${vs[0] + 2}.`); } },
    pouvoir:{ n:'Lame noire', txt:'2 dés identiques de 4 ou plus', d:'8 dégâts à une cible et 1 Corruption au héros.', cond:vs => vs.length === 2 && vs[0] === vs[1] && vs[0] >= 4, cible:'ennemi', f:(J, vs, k) => { degats(k, 8); corrompt(adv(J)); } },
    renforts:[] },
  tisseuse:    { nom:'Tisseuse de vide', titre:'l’araignée d’étoiles', emoji:'🕷️', c:'#7a3aa8', pv:16, ile:'abime', role:'Tisse des Toiles qui font Barrière et entravent.', cit:'« Reste. Encore un peu. »',
    garde:{ n:'Cocon', txt:'1 dé', d:'Bouclier 4.', cond:vs => vs.length === 1, val:() => 4, f:J => { J.gardeB += 4; log(`${J.nom} : Cocon, Bouclier 4.`); } },
    pouvoir:{ n:'Toile', txt:'dé = 6, ou 2 dés identiques', d:'Une Toile 0 / 6 Barrière (deux au plus), sinon 5 dégâts et 1 Corruption.', cond:vs => (vs.length === 1 && vs[0] === 6) || (vs.length === 2 && vs[0] === vs[1]), cible:'ennemi',
      f:(J, vs, k) => { if (J.front.filter(u => u.barriere).length < 2) invoque(J, { n:'Toile', a:0, v:6, barriere:true }); else { degats(k, 5); corrompt(adv(J)); } } },
    renforts:[{ n:'Toile', a:0, v:6, barriere:true }] },
  colossevide:{ nom:'Colosse du Vide', titre:'le trou noir', emoji:'🌑', c:'#3a1a5a', pv:22, ile:'abime', role:'Le plus dangereux : il aspire la vie, et sa jauge pleine déchire tout.', cit:'« … »',
    garde:{ n:'Horizon', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`${J.nom} : Horizon, Bouclier ${vs[0]}.`); } },
    pouvoir:{ n:'Aspiration', txt:'3 dés de 4 ou plus', d:'7 dégâts au héros, il en regagne autant, et 1 Corruption.', cond:vs => vs.length === 3 && vs.every(v => v >= 4), cible:'ennemi', f:J => { const D = adv(J), a = D.pv; degats({ J:D }, 7); J.pv = Math.min(J.pvMax, J.pv + Math.max(0, a - D.pv)); corrompt(D); } },
    ultime:{ n:'Effondrement', txt:'3 dés', d:'12 dégâts au héros et 2 Corruption.', cond:vs => vs.length === 3, cible:'ennemi', f:J => { degats({ J:adv(J) }, 12); corrompt(adv(J), 2); } },
    renforts:[] },
  // --- les élites de l'Abîme
  heraut:      { nom:'Le Héraut du Vide', titre:'la voix du roi', emoji:'🎺', c:'#9b5cf6', pv:24, majeur:true, ile:'abime', role:'Il appelle des Ombres et corrompt de loin.', cit:'« Le roi vous attend. Tous. »',
    garde:{ n:'Manteau d’étoiles', txt:'1 dé', d:'Bouclier = la valeur du dé + 1.', cond:vs => vs.length === 1, val:vs => vs[0] + 1, f:(J, vs) => { J.gardeB += vs[0] + 1; log(`${J.nom} : Manteau d’étoiles, Bouclier ${vs[0] + 1}.`); } },
    pouvoir:{ n:'Appel', txt:'2 dés identiques', d:'Une Ombre 2 / 3 Charge (3 au plus), sinon 6 dégâts et 1 Corruption.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi',
      f:(J, vs, k) => { if (J.front.length < 3) invoque(J, { n:'Ombre', a:2, v:3, charge:true }); else { degats(k, 6); corrompt(adv(J)); } } },
    renforts:[{ n:'Ombre', a:2, v:3 }] },
  miroir:      { nom:'Le Miroir brisé', titre:'ton reflet', emoji:'🪞', c:'#c9b8ff', pv:22, majeur:true, ile:'abime', role:'Il renvoie les coups : Épines à chaque Garde.', cit:'« Frappe-moi. Tu te frappes. »',
    garde:{ n:'Reflet', txt:'1 ou 2 dés', d:'Bouclier = la somme, et Épines 3.', cond:vs => vs.length <= 2, val:vs => somme(vs) + 3, f:(J, vs) => { J.gardeB += somme(vs); J.gardeE += 3; log(`${J.nom} : Reflet, Bouclier ${somme(vs)} et Épines 3.`); } },
    pouvoir:{ n:'Éclat', txt:'3 dés de 3 ou plus', d:'7 dégâts à une cible et 1 Corruption au héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 7); corrompt(adv(J)); } },
    renforts:[] },
  gardien:     { nom:'Le Gardien des runes mortes', titre:'l’oublié', emoji:'🗿', c:'#6a5a8a', pv:27, majeur:true, ile:'abime', role:'Deux Runes mortes Barrière le protègent ; il écrase lentement.', cit:'« … »',
    garde:{ n:'Pierre ancienne', txt:'1 dé', d:'Bouclier = la valeur du dé + 2.', cond:vs => vs.length === 1, val:vs => vs[0] + 2, f:(J, vs) => { J.gardeB += vs[0] + 2; log(`${J.nom} : Pierre ancienne, Bouclier ${vs[0] + 2}.`); } },
    pouvoir:{ n:'Écrasement', txt:'2 dés identiques de 4 ou plus', d:'9 dégâts à une cible.', cond:vs => vs.length === 2 && vs[0] === vs[1] && vs[0] >= 4, cible:'ennemi', f:(J, vs, k) => degats(k, 9) },
    renforts:[{ n:'Rune morte', a:1, v:6, barriere:true }, { n:'Rune morte', a:1, v:6, barriere:true }] },
});
// le gardien de l'acte III : le Roi sans visage, 3 phases ; à la 3e, il vole les couleurs (Corruption 2 par coup)
Object.assign(BOSS, {
  roi: { nom:'Le Roi sans visage', titre:'le maître du Vide', emoji:'👑', c:'#a855f7', pv:62, boss:true, ile:'abime', role:'Trois phases. Sa Corruption te réduit au Silence et le nourrit.', cit:'« Je n’ai pas de visage. J’aurai le tien. »',
    phases:[
      { seuil:1, garde:{ n:'Couronne d’ombre', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Roi : Couronne d’ombre, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Sceptre du néant', txt:'2 dés identiques', d:'7 dégâts et 1 Corruption.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 7); corrompt(adv(J)); } } },
      { seuil:2 / 3, garde:{ n:'Couronne d’ombre', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Roi : Couronne d’ombre, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Cour des ombres', txt:'3 dés de 3 ou plus', d:'Deux Ombres 2 / 3 arrivent, et 5 dégâts au héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:J => { invoque(J, { n:'Ombre', a:2, v:3 }); invoque(J, { n:'Ombre', a:2, v:3 }); degats({ J:adv(J) }, 5); } } },
      { seuil:1 / 3, garde:{ n:'Manteau de néant', txt:'1 dé', d:'Bouclier = 2 × la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0] * 2, f:(J, vs) => { J.gardeB += vs[0] * 2; log(`Le Roi : Manteau de néant, Bouclier ${vs[0] * 2}.`); } },
        pouvoir:{ n:'Sans visage', txt:'2 dés de 5 ou plus', d:'10 dégâts et 2 Corruption.', cond:vs => vs.length === 2 && vs.every(v => v >= 5), cible:'ennemi', f:(J, vs, k) => { degats(k, 10); corrompt(adv(J), 2); } } },
    ],
    ultime:{ n:'Le grand Vide', txt:'3 dés', d:'12 dégâts au héros, et le Vide le dévore tout de suite.', cond:vs => vs.length === 3, cible:'ennemi', f:J => { const D = adv(J); degats({ J:D }, 12); corrompt(D, 9); } },
    renforts:[] },
});
ILES.abime = { dur:1.1, acte:'Acte III', nom:'l’Abîme du Vide', court:'Abîme du Vide', boss:'roi', bossNom:'Le Roi sans visage',
  pools:[['ombre', 'rongeur', 'oeil'], ['rongeur', 'oeil', 'chevalier', 'tisseuse'], ['chevalier', 'tisseuse', 'colossevide']], elites:['heraut', 'miroir', 'gardien'],
  lieux:{ monstre:'vide', fort:'faille', elite:'ruinesv', boss:'trone' }, evenements:['voyageur', 'autelbrise', 'marchandambulant', 'cartographe', 'statue', 'ermite', 'reflet', 'pontetoiles', 'voix', 'bibliotheque'] };

// ================================================================== 13/11 : le MODE ASCENSION (décision de l'utilisateur) : chaque victoire sur une île débloque le cran suivant
// pour cette île (10 au plus). Les crans s'ajoutent les uns aux autres.
const ASCENSION = [
  null,
  { n:'Des ennemis plus coriaces', d:'Tous les ennemis ont 10 % de PV en plus.' },
  { n:'Des élites redoutables', d:'Les élites ont encore 15 % de PV en plus.' },
  { n:'La lanterne à moitié vide', d:'Tu pars avec 4 doses d’huile de moins.' },
  { n:'Des sources tièdes', d:'Les sources rendent 15 PV au lieu de 20.' },
  { n:'Un gardien en colère', d:'Le gardien de l’île a encore 15 % de PV en plus.' },
  { n:'Un butin maigre', d:'Les combats rapportent 20 % d’or en moins.' },
  { n:'Moins de choix', d:'Après un combat, 2 cartes au choix au lieu de 3.' },
  { n:'Le mauvais œil', d:'Tu pars avec une malédiction.' },
  { n:'Des ennemis nombreux', d:'Les monstres lancent un dé de plus (5 au plus).' },
  { n:'Le dernier souffle', d:'Ton héros a 10 % de PV en moins.' },
];
const ASC_CLE = 'guilde-ascension';
const ascMax = acte => { try { return (JSON.parse(localStorage.getItem(ASC_CLE) || '{}')[acte || 'brulees']) || 0; } catch (e) { return 0; } };
const asc = (r, n) => (r && r.asc || 0) >= n;
// 13/11 : LE SAC DE MOUSTACHE (Stop ou Encore, idée n° 4 de la R&D) : on tire un dé à la fois ; 2 à 6 = autant d'or dans le pot ;
// un 1 = 💀 malédiction ; un 6 efface une malédiction ; 2 malédictions = le sac explose (pot perdu, −5 PV). S'arrêter = garder le pot. Une fois par salle.
// (Réglé au simulateur : s'arrêter vers 20 or rapporte ~16 or en moyenne, le sac explose 1 fois sur 4.) Idée notée : en faire un mode à part entière plus tard.
const SAC = { malediction:2, degats:5 };
function sacTire(r, c) {
  if (c.fait) return null; c.sac = c.sac || { pot:0, m:0, des:[] };
  const v = 1 + Math.floor(Math.random() * 6), S2 = c.sac; S2.des.push(v);
  if (v === 1) S2.m++; else { S2.pot += v; if (v === 6 && S2.m > 0) S2.m--; }
  if (S2.m >= SAC.malediction) { c.fait = true; S2.explose = true; r.pv = Math.max(1, r.pv - SAC.degats); r.journal.push(`🎲 Le sac de Moustache explose : ${S2.pot} or perdus, −${SAC.degats} PV.`); }
  return v;
}
function sacStop(r, c) { if (c.fait || !c.sac) return; c.fait = true; r.or += c.sac.pot; r.journal.push(`🎲 Le sac de Moustache : +${c.sac.pot} or.`); }
// 13/11 : LA FORGE DES DÉS (idée n° 2 de la R&D, forge-proposition.html validée) : remplacer UNE face d'un dé par une face spéciale,
// pour toute l'Odyssée en cours. run.forge[dé][face] = code. Une face spéciale vaut toujours un chiffre (+ un bonus quand elle sort).
const FACES_FORGE = {
  soleil:{ e:'☀', n:'Soleil', v:6, d:'vaut 6, et +1 PC quand il sort.' },
  ecu:{ e:'🛡', n:'Écu', v:3, d:'vaut 3, et +2 de Bouclier quand il sort.' },
  joker:{ e:'✦', n:'Joker', v:6, d:'quand il sort, tu choisis sa valeur (touche le dé).' },
  braise:{ e:'🔥', n:'Braise', v:5, d:'vaut 5 ; dans une Frappe ou une Technique, +2 dégâts.' },
  piece:{ e:'🪙', n:'Pièce', v:2, d:'vaut 2, et +5 or quand il sort.' },
};
const FORGE_PRIX = 40;
function forgeOffre(r, c) { if (!c.offre) { const l = Object.keys(FACES_FORGE).sort(() => Math.random() - .5); c.offre = l.slice(0, r.heros === 'maelle' ? 4 : 3); } return c.offre; }
function forgeApplique(r, c, de, face, code) {
  if (c.fait || !FACES_FORGE[code] || de < 0 || de > 4 || face < 1 || face > 6) return 'Choix impossible.';
  if (c.nb && r.or < FORGE_PRIX) return `Il faut ${FORGE_PRIX} or pour une deuxième face.`;
  if (c.nb) r.or -= FORGE_PRIX;
  r.forge = r.forge || [{}, {}, {}, {}, {}]; r.forge[de][face] = code; c.nb = (c.nb || 0) + 1; if (c.nb >= 2) c.fait = true;
  r.journal.push(`⚒ Forge : le ${face} du dé n° ${de + 1} devient ${FACES_FORGE[code].e} ${FACES_FORGE[code].n}.`);
}
// le feu de camp : se reposer (+30 % des PV), raviver la lanterne (+6 huile) ou retirer une carte (l'écran s'en occupe)
function feuDeCamp(r, c, option) {
  if (c.fait) return false; c.fait = true;
  if (option === 'repos') { const a = r.pv; r.pv = Math.min(r.pvMax, r.pv + Math.round(r.pvMax * .3)); r.journal.push(`🏕 Au coin du feu : +${r.pv - a} PV.`); }
  if (option === 'huile') { r.vivres += 6; r.journal.push('🏕 La lanterne se ravive au feu : +6 huile.'); }
  if (option === 'retirer') r.journal.push('🏕 Une carte brûle dans le feu de camp.');
  return true;
}

// ================================================================== 13/11 : la NÉMÉSIS (inspirée de la table des Némésis du livre) et le SACRIFICE (livre : −10 PV → +2 PC)
// Un héros rival qui tue ton héros pendant une Odyssée devient sa Némésis : à la prochaine Odyssée de ce héros, il l'attend parmi les élites (😈),
// plus fort à chaque victoire (+15 % de PV par niveau, 3 au plus). Le vaincre : +60 or, une relique au choix, et la Némésis s'efface.
const NEMESIS_CLE = 'guilde-nemesis';
const lireNemesis = () => { try { return JSON.parse(localStorage.getItem(NEMESIS_CLE) || '{}'); } catch (e) { return {}; } };
function ecrireNemesis(N) { if (typeof localStorage !== 'undefined') localStorage.setItem(NEMESIS_CLE, JSON.stringify(N)); }

// ================================================================== 13/11 : les OMBRES MAJEURES et l'ANOMALIE (livre papier, pages 16-18) — combats de monstres et d'élites seulement
const OMBRES = [null,
  { n:'Égide du Vide', d:'L’ennemi ignore toutes les altérations (Poison, Saignement, Handicap…).' },
  { n:'Voile d’invisibilité', d:'L’ennemi ne prend aucun dégât avant son premier tour.' },
  { n:'Drain de vitalité', d:'L’ennemi se soigne de la moitié des dégâts qu’il inflige à ton héros.' },
  { n:'Frénésie des ténèbres', d:'L’ennemi fait +3 dégâts, mais perd 5 PV à la fin de chacun de ses tours.' },
  { n:'Peau de l’Abîme', d:'L’ennemi réduit chaque dégât reçu de 3.' },
  { n:'Double menace', d:'L’ennemi lance un dé de plus.' },
];
const ANOMALIE = [null, '+2 PC au départ', '+5 dégâts sur ses attaques', '+20 PV'];
function tireOmbre(r, cb) {
  if (cb.nemesis || cb.type === 'boss') return;
  const R = hasard(r), d = () => 1 + Math.floor(R() * 6), j = d();
  if (j === 6) { cb.ombre = d(); return; }
  if (j === 4) { cb.anomalie = 1; while (cb.anomalie < 3 && d() === 4) cb.anomalie++; }
}
const ACTES_CLE = 'guilde-actes';
const actesFaits = () => { try { return JSON.parse(localStorage.getItem(ACTES_CLE) || '{}'); } catch (e) { return {}; } };
function braiseTitan(D) { D.braiseT = (D.braiseT || 0) + 1; log(`🔥 Braise ${D.braiseT}/3 sur ${D.nom}.`); if (D.braiseT >= 3) { D.braiseT = 0; log('🔥 Les Braises explosent : 6 dégâts !'); degats({ J:D }, 6, true); } }
// la Frappe des monstres : plus faible que celle des héros (la moitié du dé, +2 par dé au-delà de la paire)
const FRAPPE_MONSTRE = { n:'Griffes', txt:'2 à 5 dés identiques', d:'Dégâts = la moitié du dé (arrondie au-dessus) + 2 par dé au-delà de la paire.', cond:vs => vs.length >= 2 && vs.every(v => v === vs[0]), cible:'ennemi',
  dg:vs => Math.ceil(vs[0] / 2) + (vs.length - 2) * 2, f:(J, vs, k) => degats(k, FRAPPE_MONSTRE.dg(vs)) };
// Ajoute monstres et boss au dictionnaire des héros, pour que le moteur du Duel les joue sans rien savoir d'eux.
// 12/11 nuit : portraits peints reçus (fichier portraits/m-<id>.webp) ; tant qu'un monstre n'y est pas, il garde son émoji dans un rond
const PORTRAITS_RECUS = [];
function installeMonstres() {
  if (typeof HEROS === 'undefined') return;
  const tous = { ...MONSTRES, ...BOSS };
  Object.keys(tous).forEach(id => { if (HEROS[id]) return; const m = tous[id];
    HEROS[id] = { ...m, monstre:true, deck:[], passif:m.role, frappe:m.frappeForte ? FRAPPE : FRAPPE_MONSTRE, img:PORTRAITS_RECUS.includes(id) ? `portraits/m-${id}.webp?v=1` : PORTRAIT(m.emoji, m.c), ultime:m.ultime || { n:'—', txt:'jamais', d:'Ce monstre n’a pas d’Ultime.', cond:() => false },
      garde:m.garde || (m.phases && m.phases[0].garde), pouvoir:m.pouvoir || (m.phases && m.phases[0].pouvoir) }; });
}
if (typeof HEROS !== 'undefined') installeMonstres();

// ----------------------------------------------------------------------------------------------- reliques, sacoche, bénédictions, malédictions
const RELIQUES = {
  fourrure:  { n:'Manteau de fourrure', e:'🧥', d:'Tu commences chaque combat avec Bouclier 3.', prix:110, ile:'givre' },
  sel:       { n:'Talisman de sel', e:'🧂', d:'La Corruption ne te dévore qu’à 4 au lieu de 3.', prix:100, ile:'abime' },
  etoile:    { n:'Étoile captive', e:'🌟', d:'+1 PC au début de chaque combat.', prix:110, ile:'abime' },
  braise:    { n:'Braise éternelle', e:'🕯', d:'Le Givre ne te gèle qu’à 4 au lieu de 3.', prix:100, ile:'givre' },
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
// 10/11 (décision de l'utilisateur) : tirage et marchand = toutes les cartes, SAUF celles qui ne marchent qu'avec un autre héros
const CARTES_LIEES = { apprenti:'maelle', hurlement:'pip', lien:'pip' };
const cartesTirables = heros => Object.keys(CARTES).filter(k => rarete(k) !== 'm' && (!CARTES_LIEES[k] || !heros || CARTES_LIEES[k] === heros));
// tirage de 3 cartes : plus la source est riche (0 monstre, 1 élite, 2 coffre), plus les rares sortent
function draft(R, richesse, deja, heros) {
  const poids = [{ c:70, r:25, e:5 }, { c:40, r:45, e:15 }, { c:20, r:50, e:30 }][richesse] || { c:70, r:25, e:5 };
  const tirables = cartesTirables(heros), out = [];
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
  // --- ceux de l'Abîme du Vide (12/11 nuit)
  { id:'reflet', ile:'abime', t:'Le reflet', d:'Une flaque d’encre immobile. Votre reflet vous sourit… une seconde trop tard.', choix:[
    { t:'Lui tendre la main (une carte épique)', e:{ carte:'epique', malediction:true }, m:'Il vous donne quelque chose. Et garde quelque chose de vous.' },
    { t:'Briser le reflet', e:{ pv:-4, or:30 }, m:'L’encre éclate (−4 PV). Au fond : 30 pièces d’or.' },
    { t:'Passer sans regarder', e:{}, m:'Le reflet vous suit des yeux.' } ] },
  { id:'pontetoiles', ile:'abime', t:'Le pont d’étoiles', d:'Un pont fait d’étoiles accrochées les unes aux autres enjambe le néant. Certaines clignotent.', choix:[
    { t:'Traverser vite (+2 huile, −5 PV)', e:{ vivres:2, pv:-5 }, m:'Une étoile s’éteint sous votre pied. Vous vous rattrapez de justesse.' },
    { t:'Cueillir une étoile (une relique)', e:{ relique:true, vivres:-2 }, m:'Elle est chaude dans la main. Le détour vous coûte 2 huile.' } ] },
  { id:'voix', ile:'abime', t:'La voix', d:'Quelqu’un vous appelle par votre nom, depuis le noir. C’est la voix de Moustache. Moustache est sur votre épaule, et il dort.', choix:[
    { t:'Répondre', e:{ benediction:true, malediction:true }, m:'La voix rit. Vous repartez plus fort… et plus lourd.' },
    { t:'Se boucher les oreilles et avancer (+6 PV max)', e:{ pvMax:6, pv:6 }, m:'Moustache : « C’était pas moi. Je dormais. Je te jure. »' } ] },
  { id:'bibliotheque', ile:'abime', t:'La bibliothèque engloutie', d:'Des rayonnages flottent dans le vide, chargés de livres de la Guilde que personne n’a jamais écrits.', choix:[
    { t:'Lire (une carte à choisir)', e:{ carte:'draft1' }, m:'Les pages se tournent toutes seules.' },
    { t:'Brûler un livre pour la lanterne (+4 huile)', e:{ vivres:4 }, m:'Il brûle d’une flamme violette.' },
    { t:'Y laisser une carte de ton deck', e:{ retirer:true }, m:'Elle trouve sa place sur une étagère.' } ] },
  // --- ceux de l'île du Givre (12/11 nuit)
  { id:'lacgele', ile:'givre', t:'Le lac gelé', d:'Un lac pris par la glace coupe le chemin. La glace craque doucement sous le vent.', choix:[
    { t:'Traverser sur la glace', e:{ pv:-6, vivres:2 }, m:'Crac ! Un pied dans l’eau glacée (−6 PV), mais le raccourci vous fait économiser 2 huile.' },
    { t:'Faire le tour par la rive (−2 huile)', e:{ vivres:-2 }, m:'Long, froid, mais sûr.' } ] },
  { id:'cabane', ile:'givre', t:'La cabane du trappeur', d:'Une cabane de rondins, la cheminée encore tiède. Personne. Une marmite, un coffre, une peau d’ours.', choix:[
    { t:'Se réchauffer au feu', e:{ pv:8, vivres:-1 }, m:'+8 PV. La lanterne a brûlé pendant ce temps (−1 huile).' },
    { t:'Ouvrir le coffre', e:{ or:35 }, m:'35 pièces d’or et un mot : « Laissez-en pour le suivant. » Oups.' },
    { t:'Emprunter la peau d’ours (une relique au choix)', e:{ relique:true, malediction:true }, m:'Bien chaud… mais voler un trappeur porte malheur.' } ] },
  { id:'aurore', ile:'givre', t:'L’aurore', d:'Le ciel se met à danser : vert, violet, or. Le froid semble reculer un instant.', choix:[
    { t:'Contempler (une bénédiction)', e:{ benediction:true, vivres:-1 }, m:'Quelque chose en vous s’allume. (−1 huile, le temps a filé.)' },
    { t:'En profiter pour avancer (+3 huile)', e:{ vivres:3 }, m:'Sous la lumière de l’aurore, la lanterne peut attendre.' } ] },
  { id:'traineau', ile:'givre', t:'Un traîneau renversé', d:'Un traîneau de la Guilde, couché dans la neige. Les chiens sont partis, la cargaison est là.', choix:[
    { t:'Fouiller la cargaison (une carte à choisir)', e:{ carte:'draft1' }, m:'Des parchemins de la Guilde, à peine mouillés.' },
    { t:'Récupérer l’huile de réserve (+5 huile)', e:{ vivres:5 }, m:'Deux fioles intactes.' } ] },
  { id:'voyageur', t:'Un voyageur blessé', d:'Adossé à un rocher tiède, un voyageur de la Guilde vous fait signe. « Une potion, par pitié… je vous revaudrai ça. »', choix:[
    { t:'Lui donner une potion de soin (si tu en as)', cond:r => r.sacoche.includes('soin'), e:{ sacoche:'-soin', relique:true }, m:'Il vous tend une relique de sa besace : « Elle m’a porté chance. »' },
    { t:'Partager votre huile (−3 huile)', e:{ vivres:-3, or:40 }, m:'Reconnaissant, il vous glisse 40 pièces d’or.' },
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
    { t:'Acheter 6 doses d’huile (20 or)', cond:r => r.or >= 20, e:{ or:-20, vivres:6 }, m:'Une fiole d’huile claire : la lanterne reprend vie.' },
    { t:'Acheter une bombe (25 or)', cond:r => r.or >= 25, e:{ or:-25, sacoche:'bombe' }, m:'« Faites gaffe avec ça. »' },
    { t:'Non merci', e:{}, m:'Il hausse les épaules et repart.' } ] },
  { id:'sourcechaude', t:'Une source chaude', d:'De la vapeur monte d’un bassin de pierre. L’eau sent le soufre, mais elle est bonne.', choix:[
    { t:'Se baigner', e:{ pv:10, vivres:-1 }, m:'+10 PV. Vous repartez détendu (−1 huile, la lanterne a brûlé pendant ce temps).' },
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
    { t:'Raviver la lanterne au feu et repartir', e:{ vivres:2 }, m:'La mèche se ranime : +2 huile.' } ] },
  { id:'pontbrule', t:'Le pont brûlé', d:'Le pont de cordes est à moitié brûlé. On peut traverser vite… ou tailler un chemin dans la roche.', choix:[
    { t:'Traverser en courant', e:{ pv:-5, vivres:1 }, m:'Une corde cède, vous vous rattrapez de justesse (−5 PV). Le raccourci vous fait économiser 1 huile.' },
    { t:'Contourner (−2 huile)', e:{ vivres:-2 }, m:'Long, mais sûr.' } ] },
  { id:'ermite', t:'L’ermite du cratère', d:'Un vieil homme au regard clair vous observe. « Je peux affûter ton arme, ou ton esprit. »', choix:[
    { t:'Affûter l’arme (une relique au choix de l’ermite)', e:{ relique:true }, m:'Il vous tend un objet poli par des années de cendre.' },
    { t:'Affûter l’esprit (une carte épique)', e:{ carte:'epique' }, m:'Il vous enseigne une rune oubliée.' } ] },
  { id:'echo', t:'L’écho du Titan', d:'Le sol tremble. Au loin, un rugissement de fournaise. Vous sentez la peur… ou la rage.', choix:[
    { t:'La rage : +4 PV max', e:{ pvMax:4, pv:4 }, m:'Votre cœur bat plus fort.' },
    { t:'La prudence : +3 huile', e:{ vivres:3 }, m:'Vous baissez la mèche pour économiser l’huile.' } ] },
];

// ----------------------------------------------------------------------------------------------- l'île (grille 7 × 9, tirée au sort d'après la graine)
const ILE_W = 7, ILE_H = 9;
const SALLES_ODY = {
  roche:{ e:'', n:'Roche' }, chemin:{ e:'·', n:'Chemin' }, depart:{ e:'⛵', n:'Le débarcadère' }, monstre:{ e:'⚔', n:'Monstres' }, elite:{ e:'💀', n:'Élite' },
  coffre:{ e:'🗝', n:'Coffre' }, source:{ e:'💧', n:'Source' }, marchand:{ e:'🏪', n:'Marchand' }, evenement:{ e:'❓', n:'Événement' }, autel:{ e:'🔥', n:'Autel' },
  mur:{ e:'🧱', n:'Mur fissuré' }, feu:{ e:'🏕', n:'Feu de camp' }, sac:{ e:'🎲', n:'Le sac de Moustache' }, forge:{ e:'⚒', n:'Forge runique' }, porte:{ e:'🚪', n:'La porte du boss' }, boss:{ e:'👑', n:'Le Titan de feu' },
};
const voisins = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && a < ILE_W && b >= 0 && b < ILE_H);
function bfs(cases, dep, marche) {
  const dist = {}; dist[dep.x + ',' + dep.y] = 0; const file = [[dep.x, dep.y]], prev = {};
  while (file.length) { const [x, y] = file.shift(); for (const [a, b] of voisins(x, y)) { const k = a + ',' + b; if (dist[k] !== undefined || !marche(cases[b][a])) continue; dist[k] = dist[x + ',' + y] + 1; prev[k] = x + ',' + y; file.push([a, b]); } }
  return { dist, prev };
}
function genereIle(graine, R0, acte) {
  const I = ILES[acte] || ILES.brulees;
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
    prend('marchand', c => d(c) >= 3 && d(c) <= 8); prend('coffre'); prend('coffre'); prend('source'); prend('source', c => d(c) >= 6); prend('autel'); prend('feu', c => d(c) >= 5); prend('sac', c => d(c) >= 2); prend('forge', c => d(c) >= 3);
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
      if (c.t === 'monstre') { c.niv = d(c) <= 4 ? 1 : d(c) <= 8 ? 2 : 3; const pool = I.pools[c.niv - 1]; c.ennemi = tire(R, pool); }
      if (c.t === 'elite') { const s = elites[ie++ % 3]; c.niv = 2; if (s === 'monstre') c.ennemi = tire(R, I.elites); else { c.ennemi = 'heros'; c.renfort = tire(R, ['pc', 'pv', 'bouclier']); } }
      if (c.t === 'evenement') c.ev = null;
      if (c.t === 'boss') { c.ennemi = I.boss; c.niv = 1; }
    }));
    // événements distincts
    const evs = brasse(R, EVENEMENTS.filter(e => I.evenements ? I.evenements.includes(e.id) : !e.ile).map(e => e.id)); let iev = 0; cases.forEach(l => l.forEach(c => { if (c.t === 'evenement') c.ev = evs[iev++ % evs.length]; }));
    cases[dep.y][dep.x].vu = cases[dep.y][dep.x].visite = true; voisins(dep.x, dep.y).forEach(([a, b]) => { cases[b][a].vu = true; voisins(a, b).forEach(([e, f]) => { cases[f][e].vu = true; }); }); // on voit à 2 cases au débarquement
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
// 13/11 : PV de départ en Odyssée héros par héros (1,8 × les PV du Duel au départ ; réglé au simulateur sur les trois îles)
const ODY_PV = { maelle:1.95, aldric:2, pip:1.6, oria:1.85, gorm:2.5, zephine:1.95 };
function nouvelleOdyssee(heros, graine, acte, niveau) {
  acte = ILES[acte] ? acte : 'brulees';
  graine = graine || ('ile-' + Math.random().toString(36).slice(2, 8));
  const ile = genereIle(graine, null, acte); if (!ile) return null;
  const h = HEROS[heros], pv = Math.round(h.pv * (ODY_PV[heros] || 1.8)); // en Odyssée le héros a 1,8 × ses PV du Duel (le papier disait 75 pour 44) : il enchaîne 5 à 6 combats sans soin automatique
  const run = { v:1, heros, graine, acte, asc:Math.max(0, Math.min(10, niveau || 0)), ile:ile.cases, pos:{ ...ile.dep }, porte:ile.porte, bossPos:ile.boss, direct:ile.direct, debut:Date.now(),
    pv, pvMax:pv, or:OR_DEPART, vivres:VIVRES_DEPART, deck:deckBase(heros), reliques:[], sacoche:['soin'], benes:[], males:[], fragments:0, cles:0,
    stats:{ cases:1, combats:0, victoires:0, tours:0, defis:0, cartesVues:[] }, combat:null, journal:[`Débarquement sur ${ILES[acte].nom} (${h.nom})${niveau ? ` · Ascension ${niveau}` : ''}.`] };
  if (asc(run, 3)) run.vivres -= 4;
  if (asc(run, 8)) donneMalediction(run, Object.keys(MALEDICTIONS)[0]);
  if (asc(run, 10)) { run.pvMax = Math.round(run.pvMax * .9); run.pv = run.pvMax; }
  if (typeof pantheonDepart === 'function') pantheonDepart(run);
  const nem = typeof localStorage !== 'undefined' ? lireNemesis()[heros] : null;
  if (nem && HEROS[nem.rival]) { const el = run.ile.flat().filter(c => c.t === 'elite'); const c = el.find(x => x.ennemi === 'heros') || el[0]; if (c) { c.nemesis = nem.rival; c.nemNiv = nem.niv; c.ennemi = nem.rival; run.journal.push(`😈 ${HEROS[nem.rival].nom}, ta Némésis, est sur l’île.`); } }
  return run;
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
  if (c.t === 'mur' && !c.fait) { if (r.sacoche.includes('bombe')) { r.sacoche.splice(r.sacoche.indexOf('bombe'), 1); r.journal.push('💣 La bombe ouvre le mur fissuré.'); } else { r.vivres -= 3; r.journal.push('🧱 Trois doses d’huile pour creuser le mur fissuré.'); } }
  if (neuve) { if (r.vivres > 0) r.vivres--; else { r.pv -= 3; r.journal.push('🪔 Lanterne éteinte : vous avancez dans le noir, −3 PV.'); } r.stats.cases++; }
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
  const L = ILE(r).lieux, lieu = c.t === 'boss' ? L.boss : c.t === 'elite' ? L.elite : (c.niv || 1) >= 3 ? L.fort : L.monstre; // le décor du combat
  r.combat = { id:Math.random().toString(36).slice(2), x:c.x, y:c.y, type:c.t, ennemi, niv:c.niv || 1, nemesis:c.nemesis ? c.nemNiv || 1 : 0, renfort:c.renfort || null, defi:tire(R, DEFIS).id, lieu, resultat:null };
  tireOmbre(r, r.combat);
  return r.combat;
}
// après un combat gagné : or, fragment, clé, défi, tirage de cartes. Retourne ce qu'il y a à montrer.
function recompenseCombat(r) {
  const cb = r.combat, res = cb.resultat, c = caseA(r, cb.x, cb.y); if (!res) return null;
  r.stats.combats++; r.stats.tours += res.tours; r.combat = null;
  if (!res.gagne) { r.journal.push(`💀 ${HEROS[cb.ennemi].nom} a eu raison de toi.`);
    let nemesis = null;
    if (typeof ORDRE !== 'undefined' && ORDRE.includes(cb.ennemi) && typeof localStorage !== 'undefined') { const N = lireNemesis(), avant = N[r.heros]; N[r.heros] = { rival:cb.ennemi, niv:avant && avant.rival === cb.ennemi ? Math.min(3, avant.niv + 1) : 1 }; ecrireNemesis(N); nemesis = N[r.heros]; }
    return { gagne:false, nemesis }; }
  c.fait = true; r.stats.victoires++;
  if (cb.ennemi === 'miroir') r.stats.miroir = true;
  let nemesisVaincue = false;
  if (cb.nemesis) { nemesisVaincue = true; r.or += 60; r.stats.nemesis = (r.stats.nemesis || 0) + 1; r.journal.push(`😈 Ta Némésis ${HEROS[cb.ennemi].nom} est vaincue : +60 or et une relique !`); if (typeof localStorage !== 'undefined') { const N = lireNemesis(); delete N[r.heros]; ecrireNemesis(N); const v = +(localStorage.getItem('guilde-nemesis-vaincues') || 0); localStorage.setItem('guilde-nemesis-vaincues', v + 1); } }
  let or = cb.type === 'boss' ? 150 : cb.type === 'elite' ? 80 : 40;
  if (r.reliques.includes('bourse')) or += 10; if (r.benes.includes('bourse')) or += 15; if (res.defiOk) { or += 30; r.stats.defis++; }
  if (asc(r, 6)) or = Math.round(or * .8);
  r.or += or;
  const out = { gagne:true, or, defiOk:res.defiOk, ennemi:HEROS[cb.ennemi].nom, type:cb.type, nemesisVaincue };
  if (cb.type === 'elite') { r.fragments++; r.cles++; out.fragment = true; if (r.sacoche.length < 2) { r.sacoche.push('soin'); out.potion = true; } }
  if (cb.ombre) { r.or += 40; out.or += 40; out.ombre = OMBRES[cb.ombre].n; r.journal.push(`🌑 Ombre majeure (${OMBRES[cb.ombre].n}) vaincue : double butin !`); }
  if (cb.anomalie) { const g = cb.anomalie === 3 ? 80 : 10 * cb.anomalie; r.or += g; out.or += g; out.anomalie = cb.anomalie; r.journal.push(`🌀 Anomalie (niveau ${cb.anomalie}) vaincue : +${g} or.`); }
  if (cb.type === 'boss') { out.boss = true; r.journal.push(`👑 ${ILE(r).bossNom} est tombé${r.acte === 'givre' ? 'e' : ''} ! +${or} or.`); return out; }
  out.draft = draft(hasard(r), cb.type === 'elite' ? 1 : 0, r.deck, r.heros); if (asc(r, 7)) out.draft = out.draft.slice(0, 2); if (cb.ombre) out.draft2 = draft(hasard(r), 1, r.deck, r.heros); if (cb.anomalie === 3) out.garde2 = true;
  r.journal.push(`🏆 ${out.ennemi} vaincu : +${or} or${out.fragment ? ', un fragment de rune et une clé' : ''}.`);
  return out;
}
function gardeCarte(r, k) { if (!k) return; r.deck.push(k); if (!r.stats.cartesVues.includes(k)) r.stats.cartesVues.push(k); r.journal.push(`🂠 ${CARTES[k].n} rejoint ton deck.`); }
function retireCarte(r, k) { const i = r.deck.indexOf(k); if (i >= 0) { r.deck.splice(i, 1); r.journal.push(`🔥 ${CARTES[k].n} quitte ton deck.`); } }
// la boutique d'une case marchand : fabriquée à la première visite, gardée
function stockMarchand(r, c) {
  if (!c.stock) { const R = hasard(r); const cartes = []; for (let n = 0; n < 40 && cartes.length < 5; n++) { const d = draft(R, 1, [], r.heros); d.forEach(k => { if (cartes.length < 5 && !cartes.includes(k)) cartes.push(k); }); }
    const rel = reliquesIle(r).filter(k => !r.reliques.includes(k)); c.stock = { cartes, relique:rel.length ? tire(R, rel) : null, retire:1, pvmax:2 }; }
  return c.stock;
}
function achete(r, c, quoi, k) {
  const st = stockMarchand(r, c); const prix = n => prixMarchand(r, n);
  if (quoi === 'carte') { const p = prix(PRIX_CARTE[rarete(k)]); if (r.or < p || !st.cartes.includes(k)) return false; r.or -= p; st.cartes.splice(st.cartes.indexOf(k), 1); gardeCarte(r, k); return true; }
  if (quoi === 'retirer') { const p = prix(60); if (r.or < p || !st.retire || !r.deck.includes(k)) return false; r.or -= p; st.retire = 0; retireCarte(r, k); return true; }
  if (quoi === 'sacoche') { const p = prix(SACOCHE[k].prix); if (r.or < p || r.sacoche.length >= 2) return false; r.or -= p; r.sacoche.push(k); r.journal.push(`🏪 ${SACOCHE[k].n} achetée.`); return true; }
  if (quoi === 'pvmax') { const p = prix(70); if (r.or < p || !st.pvmax) return false; r.or -= p; st.pvmax--; r.pvMax += 5; r.pv += 5; r.journal.push('🏪 Vitalité : +5 PV max.'); return true; }
  if (quoi === 'vivres') { const p = prix(20); if (r.or < p) return false; r.or -= p; r.vivres += 5; r.journal.push('🏪 +5 huile pour la lanterne.'); return true; }
  if (quoi === 'relique') { if (!st.relique || r.reliques.length >= 3) return false; const p = prix(RELIQUES[st.relique].prix); if (r.or < p) return false; r.or -= p; r.reliques.push(st.relique); r.journal.push(`🏪 ${RELIQUES[st.relique].n} achetée.`); st.relique = null; return true; }
  return false;
}
// le Savoir ancestral du Panthéon : 10 or rendus sur le premier achat de l'Odyssée
const _acheteOdy = achete;
achete = function (r, c, quoi, k) { const or0 = r.or, ok = _acheteOdy(r, c, quoi, k); if (ok && r.remise && r.or < or0) { const g = Math.min(r.remise, or0 - r.or); r.or += g; r.remise = 0; r.journal.push(`📜 Savoir ancestral : ${g} or de remise.`); } return ok; };
// l'autel : 3 bénédictions proposées, une malédiction tirée en échange
function autelOptions(r, c) { if (!c.offre) { const R = hasard(r); c.offre = { benes:brasse(R, Object.keys(BENEDICTIONS).filter(b => !r.benes.includes(b))).slice(0, 3), male:tire(R, Object.keys(MALEDICTIONS)) }; } return c.offre; }
function donneBenediction(r, b) { if (r.benes.includes(b)) return; r.benes.push(b); if (b === 'vie') { r.pvMax += 6; r.pv += 6; } r.journal.push(`✨ Bénédiction : ${BENEDICTIONS[b].n}.`); }
function donneMalediction(r, m) { r.males.push(m); const M = MALEDICTIONS[m]; if (M.carte) r.deck.push(M.carte); if (m === 'frele') { r.pvMax = Math.max(10, r.pvMax - 5); r.pv = Math.min(r.pv, r.pvMax); } r.journal.push(`🕯 Malédiction : ${M.n}.`); }
function autelChoisit(r, c, b) { const o = autelOptions(r, c); if (!o.benes.includes(b)) return false; donneBenediction(r, b); donneMalediction(r, o.male); c.fait = true; return true; }
function source(r, c, option) { if (c.fait) return false; c.fait = true; if (option === 'soin') { const a = r.pv; r.pv = Math.min(r.pvMax, r.pv + (asc(r, 4) ? 15 : 20)); r.journal.push(`💧 La source rend ${r.pv - a} PV.`); } else { const k = r.deck.find(x => rarete(x) === 'm'); if (k) retireCarte(r, k); } return true; }
const reliquesIle = r => Object.keys(RELIQUES).filter(k => !RELIQUES[k].ile || RELIQUES[k].ile === (r.acte || 'brulees'));
function reliquesProposees(r, n) { const R = hasard(r); return brasse(R, reliquesIle(r).filter(k => !r.reliques.includes(k))).slice(0, n || 2); }
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
  if (e.carte === 'draft1') { out.suite = 'draft'; out.cartes = draft(hasard(r), 1, r.deck, r.heros); }
  if (e.carte === 'epique') { out.suite = 'draft'; out.cartes = draft(hasard(r), 2, r.deck, r.heros).filter(k => rarete(k) === 'e').slice(0, 3); if (!out.cartes.length) out.cartes = draft(hasard(r), 2, r.deck); }
  if (e.retirer) out.suite = 'retirer';
  if (e.revele) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = caseA(r, r.pos.x + dx, r.pos.y + dy); if (k && Math.abs(dx) + Math.abs(dy) <= 2) k.vu = true; } }
  r.journal.push(`❓ ${ev.t} : ${ch.t}.`);
  return out;
}
function ouvreCoffre(r, c) { if (c.fait || r.cles < 1) return null; r.cles--; c.fait = true; const R = hasard(r); const rel = reliquesIle(r).filter(k => !r.reliques.includes(k));
  if (rel.length && r.reliques.length < 3 && R() < .5) { const k = tire(R, rel); r.reliques.push(k); r.journal.push(`🗝 Le coffre contenait ${RELIQUES[k].n}.`); return { relique:k }; }
  r.journal.push('🗝 Le coffre contenait des cartes rares.'); return { draft:draft(R, 2, r.deck, r.heros), deux:true }; }
function ouvrePorte(r) { const p = caseA(r, r.porte.x, r.porte.y); if (p.fait) return true; if (r.fragments >= 2) { p.fait = true; const a = r.pv; r.pv = Math.min(r.pvMax, r.pv + 15); r.journal.push(`🚪 Les deux fragments s’assemblent : la porte s’ouvre. Bivouac devant la porte : +${r.pv - a} PV.`); return true; } return false; }
// fin de l'Odyssée : score, collection, record
function finOdysseeRun(r, gagne) {
  const duree = Math.round((Date.now() - r.debut) / 60000);
  const score = r.stats.victoires * 50 + r.stats.cases * 5 + r.or + (gagne ? 300 : 0) + r.stats.defis * 30 - r.stats.tours * 2;
  const base = deckBase(r.heros), nouvelles = r.deck.filter(k => !base.includes(k) && rarete(k) !== 'm');
  const ajoutees = typeof localStorage !== 'undefined' ? ajouteCollection([...new Set([...nouvelles, ...r.stats.cartesVues])]) : 0;
  if (gagne && typeof localStorage !== 'undefined') { const a = actesFaits(); a[r.acte || 'brulees'] = true; localStorage.setItem(ACTES_CLE, JSON.stringify(a)); }
  let ascNouveau = 0, premiereFin = false, inscrit = null, briseMiroir = false;
  if (gagne && typeof localStorage !== 'undefined') {
    const A = JSON.parse(localStorage.getItem(ASC_CLE) || '{}'), k = r.acte || 'brulees', n = Math.min(10, (r.asc || 0) + 1);
    if (n > (A[k] || 0)) { A[k] = n; ascNouveau = n; localStorage.setItem(ASC_CLE, JSON.stringify(A)); }
    if (k === 'abime' && !localStorage.getItem('guilde-odyssee-finie')) { localStorage.setItem('guilde-odyssee-finie', '1'); premiereFin = true; }
    if (k === 'abime' && typeof inscrirePantheon === 'function') { inscrit = inscrirePantheon(r.heros, r.asc || 0) ? 'nouveau' : 'encore'; briseMiroir = !!r.stats.miroir && recompensesRestantes().length > 0; }
  }
  const rec = { quand:new Date().toISOString(), acte:r.acte || 'brulees', asc:r.asc || 0, heros:r.heros, gagne, score, cases:r.stats.cases, combats:r.stats.combats, victoires:r.stats.victoires, tours:r.stats.tours, defis:r.stats.defis, or:r.or, duree, graine:r.graine, pv:r.pv };
  if (typeof localStorage !== 'undefined') { const l = lireRecords(); l.unshift(rec); localStorage.setItem(RECORDS_CLE, JSON.stringify(l.slice(0, 50))); ecrireOdyssee(null); }
  return { ...rec, ajoutees, nouvelles, ascNouveau, premiereFin, inscrit, briseMiroir };
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

// ----------------------------------------------------------------------------------------------- LE CAMPEMENT (10/11 soir) : deux héros contre un boss géant
// Pas encore de serveur de partie : on joue à deux SUR LE MÊME TÉLÉPHONE (on se le passe), ou avec un compagnon joué par l'ordinateur.
// Règles proposées par Claude (à valider) : le boss joue après les deux héros et se retourne contre le DERNIER qui l'a frappé ; tous les 2 tours il
// appelle des sbires ; la COHÉSION (réserve commune, 4 au départ, 8 au plus) monte quand un héros pose 3 dés ou plus et se dépense :
// 3 = relever un héros à terre (12 PV), 2 = cri de ralliement (+2 PC chacun), 2 = soin partagé (+6 PV à l'autre). Un héros à 0 PV est à terre
// (ses créatures tombent) ; les deux à terre = défaite.
const BOSS_CAMP = {
  colosseracines: { nom:'Le Colosse des racines', titre:'le Primordial', emoji:'🌳', c:'#3f8a3a', pv:130, boss:true, frappeForte:true, role:'Un géant d’écorce. Ses racines reviennent sans cesse ; ses coups écrasent. Il se retourne contre le dernier qui l’a frappé.', cit:'« Vous avez réveillé la forêt. »',
    sbires:{ n:'Racine', a:2, v:4, barriere:true, tous:2, nb:2 },
    phases:[
      { seuil:1, garde:{ n:'Écorce', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Colosse : Écorce, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Coup de branche', txt:'2 dés identiques', d:'8 dégâts à une cible.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => degats(k, 8) } },
      { seuil:2 / 3, garde:{ n:'Écorce', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Colosse : Écorce, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Fouet de racines', txt:'3 dés de 3 ou plus', d:'10 dégâts à une cible et les créatures du héros visé sont Entravées.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:(J, vs, k) => { degats(k, 10); adv(J).front.forEach(u => u.entrave = true); } } },
      { seuil:1 / 3, garde:{ n:'Écorce épaisse', txt:'1 dé', d:'Bouclier = 2 × la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0] * 2, f:(J, vs) => { J.gardeB += vs[0] * 2; log(`Le Colosse : Écorce épaisse, Bouclier ${vs[0] * 2}.`); } },
        pouvoir:{ n:'Écrasement', txt:'2 dés de 4 ou plus', d:'14 dégâts à une cible.', cond:vs => vs.length === 2 && vs.every(v => v >= 4), cible:'ennemi', f:(J, vs, k) => degats(k, 14) } },
    ],
    ultime:{ n:'Réveil primordial', txt:'3 dés', d:'18 dégâts au héros visé et deux Racines de plus.', cond:vs => vs.length === 3, cible:'ennemi', f:(J, vs, k) => { degats({ J:adv(J) }, 18); for (let i = 0; i < 2; i++) invoque(J, { n:'Racine', a:2, v:4, barriere:true }); } },
    renforts:[{ n:'Racine', a:2, v:4, barriere:true }, { n:'Racine', a:2, v:4, barriere:true }] },
};
// 12/11 nuit : deux boss de plus pour le Campement (prototype). « Chaque héros » = les héros encore debout de l'équipe.
const debout = () => (S && S.equipe ? S.equipe.filter(h => !h.aTerre && h.pv > 0) : []);
Object.assign(BOSS_CAMP, {
  kraken: { nom:'Le Kraken des brumes', titre:'l’Abyssal', emoji:'🐙', c:'#3a6a8a', pv:150, boss:true, frappeForte:true, lieu:'brume', role:'Un monstre des profondeurs remonté dans la brume. Ses tentacules font Barrière et repoussent sans cesse ; ses vagues frappent les deux héros.', cit:'« Glouuurb. »',
    sbires:{ n:'Tentacule', a:2, v:5, barriere:true, tous:2, nb:1 },
    phases:[
      { seuil:1, garde:{ n:'Peau visqueuse', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Kraken : Peau visqueuse, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Étreinte', txt:'2 dés identiques', d:'6 dégâts à une cible et Handicap au héros visé.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 6); if (k && k.J && !k.u) altere(k.J, 'handicap'); } } },
      { seuil:2 / 3, garde:{ n:'Encre', txt:'1 dé', d:'Esquive : le prochain coup reçu est divisé par deux.', cond:vs => vs.length === 1, val:() => 5, f:J => { J.esquive = true; log('Le Kraken crache son encre : Esquive.'); } },
        pouvoir:{ n:'Vague de brume', txt:'3 dés de 3 ou plus', d:'6 dégâts à CHAQUE héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:() => debout().forEach(h => degats({ J:h }, 6)) } },
      { seuil:1 / 3, garde:{ n:'Carapace d’abysses', txt:'1 dé', d:'Bouclier = 2 × la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0] * 2, f:(J, vs) => { J.gardeB += vs[0] * 2; log(`Le Kraken : Carapace d’abysses, Bouclier ${vs[0] * 2}.`); } },
        pouvoir:{ n:'Gouffre', txt:'2 dés de 4 ou plus', d:'13 dégâts à une cible.', cond:vs => vs.length === 2 && vs.every(v => v >= 4), cible:'ennemi', f:(J, vs, k) => degats(k, 13) } },
    ],
    ultime:{ n:'Maelström', txt:'3 dés', d:'10 dégâts à chaque héros et deux Tentacules de plus.', cond:vs => vs.length === 3, cible:'ennemi', f:J => { debout().forEach(h => degats({ J:h }, 10)); for (let i = 0; i < 2; i++) invoque(J, { n:'Tentacule', a:2, v:5, barriere:true }); } },
    renforts:[{ n:'Tentacule', a:2, v:5, barriere:true }] },
  ignaros: { nom:'Ignaros, le dragon ancien', titre:'le Dernier Feu', emoji:'🐲', c:'#d9442a', pv:190, boss:true, frappeForte:true, lieu:'cratere', role:'Le plus vieux dragon de la Guilde. Ses Braises s’accumulent sur chaque héros (3 = explosion) et un dragonnet éclôt tous les 2 tours.', cit:'« J’étais là avant vos runes. »',
    sbires:{ n:'Dragonnet', a:3, v:4, charge:true, tous:2, nb:1 },
    phases:[
      { seuil:1, garde:{ n:'Écailles', txt:'1 dé', d:'Bouclier = la valeur du dé + 1.', cond:vs => vs.length === 1, val:vs => vs[0] + 1, f:(J, vs) => { J.gardeB += vs[0] + 1; log(`Ignaros : Écailles, Bouclier ${vs[0] + 1}.`); } },
        pouvoir:{ n:'Griffes ardentes', txt:'2 dés identiques', d:'9 dégâts à une cible et 1 Braise sur le héros visé.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 9); if (k && k.J && !k.u) braiseTitan(k.J); } } },
      { seuil:2 / 3, garde:{ n:'Écailles', txt:'1 dé', d:'Bouclier = la valeur du dé + 1.', cond:vs => vs.length === 1, val:vs => vs[0] + 1, f:(J, vs) => { J.gardeB += vs[0] + 1; log(`Ignaros : Écailles, Bouclier ${vs[0] + 1}.`); } },
        pouvoir:{ n:'Souffle de feu', txt:'3 dés de 3 ou plus', d:'7 dégâts et 1 Braise à CHAQUE héros.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:() => debout().forEach(h => { degats({ J:h }, 7); braiseTitan(h); }) } },
      { seuil:1 / 3, garde:{ n:'Cœur de magma', txt:'1 dé', d:'Bouclier = 2 × la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0] * 2, f:(J, vs) => { J.gardeB += vs[0] * 2; log(`Ignaros : Cœur de magma, Bouclier ${vs[0] * 2}.`); } },
        pouvoir:{ n:'Fureur', txt:'2 dés de 5 ou plus', d:'15 dégâts et 1 Braise sur le héros visé.', cond:vs => vs.length === 2 && vs.every(v => v >= 5), cible:'ennemi', f:(J, vs, k) => { degats(k, 15); if (k && k.J && !k.u) braiseTitan(k.J); } } },
    ],
    ultime:{ n:'Embrasement', txt:'3 dés', d:'10 dégâts et 1 Braise à chaque héros.', cond:vs => vs.length === 3, cible:'ennemi', f:() => debout().forEach(h => { degats({ J:h }, 10); braiseTitan(h); }) },
    renforts:[] },
});
// ================================================================== 13/11 : INVASION, ACTE I « L'ÉVEIL DE L'ABÎME » (d'après le livre papier, pages 30-35)
// Trois vagues à la suite : la Meute corrompue (3 Gobelins = une Nuée), les Gardes corrompus jumeaux (Lien d'ombre), le Nécromancien du Vide.
// Mécanique globale : la SOUILLURE (au début de son tour, le héros perd 1 PV par pile ; 6 au plus ; Premiers soins et Purification la retirent).
function souille(D, n) { if (!D || D.aTerre || D.pv <= 0) return; D.souillure = Math.min(6, (D.souillure || 0) + (n || 1)); log(`🟢 Souillure ${D.souillure} sur ${D.nom}.`); }
function volePC(J, D, n) { const v = Math.min(n, D.pc || 0); if (v) { D.pc -= v; log(`${J.nom} vole ${v} PC à ${D.nom}.`); } return v; }
const VAGUES_EVEIL = {
  meute: { nom:'La Meute corrompue', titre:'3 Gobelins, une Nuée', emoji:'👺', c:'#7a3aa8', pv:60, boss:true, ile:'invasion', role:'Trois Gobelins corrompus qui attaquent comme un seul monstre ; chacun tombe tous les 20 PV. Ils volent des PC et posent la Souillure.', cit:'« Hé hé hé… »',
    phases:[
      { seuil:1, garde:{ n:'Nuée', txt:'1 dé', d:'Bouclier = la moitié du dé.', cond:vs => vs.length === 1, val:vs => Math.ceil(vs[0] / 2), f:(J, vs) => { J.gardeB += Math.ceil(vs[0] / 2); log(`La Meute : Nuée, Bouclier ${Math.ceil(vs[0] / 2)}.`); } },
        pouvoir:{ n:'Morsure grave', txt:'3 dés identiques', d:'10 dégâts et 2 Souillures ; chaque 6 vole 1 PC.', cond:vs => vs.length === 3 && vs[0] === vs[1] && vs[1] === vs[2], cible:'ennemi', f:(J, vs, k) => { degats(k, 10); if (k && k.J && !k.u) { souille(k.J, 2); volePC(J, k.J, vs.filter(v => v === 6).length); } } } },
      { seuil:2 / 3, garde:{ n:'Nuée', txt:'1 dé', d:'Bouclier = la moitié du dé.', cond:vs => vs.length === 1, val:vs => Math.ceil(vs[0] / 2), f:(J, vs) => { J.gardeB += Math.ceil(vs[0] / 2); } },
        pouvoir:{ n:'Morsure', txt:'2 dés identiques', d:'5 dégâts et 1 Souillure (deux Gobelins encore debout) ; chaque 6 vole 1 PC.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 5); if (k && k.J && !k.u) { souille(k.J, 1); volePC(J, k.J, vs.filter(v => v === 6).length); } } } },
      { seuil:1 / 3, garde:{ n:'Nuée', txt:'1 dé', d:'Bouclier = la moitié du dé.', cond:vs => vs.length === 1, val:vs => Math.ceil(vs[0] / 2), f:(J, vs) => { J.gardeB += Math.ceil(vs[0] / 2); } },
        pouvoir:{ n:'Dernière morsure', txt:'2 dés identiques', d:'5 dégâts et 1 Souillure (le dernier Gobelin) ; il récupère 5 PV par PC volé.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 5); if (k && k.J && !k.u) { souille(k.J, 1); const v = volePC(J, k.J, 1); if (v) J.pv = Math.min(Math.ceil(J.pvMax / 3), J.pv + 5 * v); } } } },
    ],
    ultime:{ n:'—', txt:'jamais', d:'La Meute n’a pas d’Ultime.', cond:() => false }, renforts:[] },
  duo: { nom:'Les Gardes corrompus', titre:'le Duo d’acier', emoji:'🛡️', c:'#4a4a6a', pv:90, boss:true, jumeaux:true, ile:'invasion', role:'Deux Gardes de 45 PV liés par une chaîne d’ombre : les dégâts se partagent, un dé de bouclier retire 2 dégâts sur 4-5-6, et celui qui tombe se relève avec 20 PV si son jumeau est encore debout à la fin du tour. Il faut les abattre DANS LE MÊME TOUR.', cit:'« Nous sommes un. »',
    phases:[ { seuil:1, garde:{ n:'Boucliers liés', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Les Gardes : Boucliers liés, Bouclier ${vs[0]}.`); } },
      pouvoir:{ n:'Brise-Garde', txt:'3 dés identiques', d:'10 dégâts et Handicap (un dé de moins au prochain tour).', cond:vs => vs.length === 3 && vs[0] === vs[1] && vs[1] === vs[2], cible:'ennemi', f:(J, vs, k) => { degats(k, 10); if (k && k.J && !k.u) altere(k.J, 'handicap'); } } } ],
    ultime:{ n:'Poids de l’Abîme', txt:'2 dés identiques', d:'6 dégâts et le héros ne gagne pas de PC à son prochain tour.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats({ J:adv(J) }, 6); adv(J).sansPC = true; } }, renforts:[] },
  necro: { nom:'Le Nécromancien du Vide', titre:'le Maître de l’Abîme', emoji:'💀', c:'#6b2bd9', pv:130, boss:true, necro:true, ile:'invasion', role:'Son aura retire 2 PV à chaque soin, il invoque des Débris du Vide et vide vos PC. Il ne meurt jamais seul.', cit:'« Le monde ne sera plus qu’un écho. »',
    sbires:{ n:'Débris du Vide', a:2, v:3, tous:2, nb:1 },
    phases:[
      { seuil:1, garde:{ n:'Voile d’âmes', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Nécromancien : Voile d’âmes, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Explosion d’âmes', txt:'2 dés identiques', d:'7 dégâts et 1 Souillure.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 7); if (k && k.J && !k.u) souille(k.J); } } },
      { seuil:2 / 3, garde:{ n:'Voile d’âmes', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; } },
        pouvoir:{ n:'Révélation de l’Abîme', txt:'3 dés de 3 ou plus', d:'Deux Débris du Vide, 5 dégâts à chaque héros, et chacun perd tous ses PC.', cond:vs => vs.length === 3 && vs.every(v => v >= 3), cible:'ennemi', f:J => { invoque(J, { n:'Débris du Vide', a:2, v:3 }); invoque(J, { n:'Débris du Vide', a:2, v:3 }); debout().forEach(h => { degats({ J:h }, 5); h.pc = 0; }); log('Le Nécromancien vide vos PC !'); } } },
      { seuil:1 / 3, garde:{ n:'Rituel', txt:'1 dé', d:'Bouclier = 2 × la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0] * 2, f:(J, vs) => { J.gardeB += vs[0] * 2; } },
        pouvoir:{ n:'Moisson', txt:'2 dés de 4 ou plus', d:'12 dégâts et 2 Souillures.', cond:vs => vs.length === 2 && vs.every(v => v >= 4), cible:'ennemi', f:(J, vs, k) => { degats(k, 12); if (k && k.J && !k.u) souille(k.J, 2); } } },
    ],
    ultime:{ n:'Il ne meurt jamais seul', txt:'3 dés', d:'10 dégâts à chaque héros et 2 Souillures.', cond:vs => vs.length === 3, cible:'ennemi', f:() => debout().forEach(h => { degats({ J:h }, 10); souille(h, 2); }) },
    renforts:[] },
};
Object.assign(BOSS, VAGUES_EVEIL);
// l'entrée du menu du Campement : l'Acte I de l'Invasion = les trois vagues à la suite
BOSS_CAMP.eveil = { nom:'L’Éveil de l’Abîme', titre:'Invasion · Acte I (3 vagues)', emoji:'🌀', c:'#7a3aa8', pv:280, boss:true, vagues:['meute', 'duo', 'necro'],
  role:'Le livre papier : trois vagues à la suite. La Meute corrompue (Souillure, vol de PC), les Gardes jumeaux à abattre DANS LE MÊME TOUR, puis le Nécromancien du Vide.', cit:'« La marque du Vide s’étend. »',
  phases:VAGUES_EVEIL.meute.phases, ultime:VAGUES_EVEIL.meute.ultime, renforts:[] };
// ================================================================== 13/11 : INVASION, ACTE II « LE RÉVEIL DES PRIMORDIAUX » (livre papier, pages 39-47)
// La JAUGE DE SÈVE de l'Arbre-Monde (100 %) : −5 % au début de chaque tour du Titan, −10 % sur l'Onde de stase ; à 0 % le monde est pétrifié (défaite).
// Chaque héros peut soigner l'Arbre : 2 PC → +10 %. La corruption de l'Arbre aggrave le combat (≤ 49 % : le Titan réduit encore les dégâts de 1 ; ≤ 24 % : 1 dégât à chaque héros au début de son tour).
const VAGUES_REVEIL = {
  eclaireurs: { nom:'Les Éclaireurs de silex', titre:'deux sentinelles de pierre', emoji:'🗿', c:'#8a7a6a', pv:56, boss:true, ile:'invasion', role:'Deux Éclaireurs de 28 PV (l’un tombe à la moitié). Leur Poussière de pierre réduit vos prochains soins.', cit:'« Immobile. Éternel. »',
    phases:[
      { seuil:1, garde:{ n:'Croûte de silex', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Les Éclaireurs : Croûte de silex, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Lance-pierre', txt:'3 dés identiques', d:'10 dégâts, Handicap et Poussière (prochain soin −2).', cond:vs => vs.length === 3 && vs[0] === vs[1] && vs[1] === vs[2], cible:'ennemi', f:(J, vs, k) => { degats(k, 10); if (k && k.J && !k.u) { altere(k.J, 'handicap'); poussiere(k.J); } } } },
      { seuil:1 / 2, garde:{ n:'Croûte de silex', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; } },
        pouvoir:{ n:'Lacération', txt:'2 dés identiques', d:'6 dégâts et Poussière (le dernier Éclaireur).', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 6); if (k && k.J && !k.u) poussiere(k.J); } } },
    ],
    ultime:{ n:'—', txt:'jamais', d:'Pas d’Ultime.', cond:() => false }, renforts:[] },
  colosse2: { nom:'Le Colosse des racines', titre:'l’Étreinte des profondeurs', emoji:'🌳', c:'#3f8a3a', pv:55, boss:true, racines:true, ile:'invasion', role:'Lien de terre : tant qu’une Micro-racine vit, il réduit chaque coup de 3. Une racine qui meurt lui inflige un choc de 5 et repousse une fois avec 5 PV.', cit:'« Les racines tiennent le monde. »',
    phases:[
      { seuil:1, garde:{ n:'Écorce', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Colosse : Écorce, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Coup de branche', txt:'2 dés identiques', d:'8 dégâts ; chaque 6 fait Saigner.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => { degats(k, 8); if (k && k.J && !k.u) vs.filter(v => v === 6).forEach(() => altere(k.J, 'saigne')); } } } ],
    ultime:{ n:'Étreinte', txt:'3 dés identiques', d:'12 dégâts, une seule relance et pas de PC au prochain tour du héros visé.', cond:vs => vs.length === 3 && vs[0] === vs[1] && vs[1] === vs[2], cible:'ennemi', f:(J, vs, k) => { const D = k && k.J && !k.u ? k.J : adv(J); degats({ J:D }, 12); D.entrave1 = true; D.sansPC = true; } },
    renforts:[{ n:'Micro-racine', a:0, v:10, barriere:true }, { n:'Micro-racine', a:0, v:10, barriere:true }] },
  titanp: { nom:'Le Titan primordial', titre:'le Jugement de pierre', emoji:'⛰️', c:'#7a5ad9', pv:160, boss:true, granit:true, stase:true, ile:'invasion', role:'Peau de granit (−3 à chaque coup). Au début de chacun de ses tours, l’Arbre perd 5 % de Sève ; seul, il appelle un Éclaireur de silex.', cit:'« Le monde sera une statue. Parfaite. Immobile. »',
    phases:[
      { seuil:1, garde:{ n:'Peau de granit', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; log(`Le Titan : Peau de granit, Bouclier ${vs[0]}.`); } },
        pouvoir:{ n:'Éclat de quartz', txt:'2 dés identiques', d:'7 dégâts.', cond:vs => vs.length === 2 && vs[0] === vs[1], cible:'ennemi', f:(J, vs, k) => degats(k, 7) } },
      { seuil:2 / 3, garde:{ n:'Peau de granit', txt:'1 dé', d:'Bouclier = la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0], f:(J, vs) => { J.gardeB += vs[0]; } },
        pouvoir:{ n:'Onde de stase', txt:'4 dés de 4 ou 5', d:'10 dégâts et l’Arbre perd 10 % de Sève.', cond:vs => vs.length === 4 && vs.every(v => v === 4 || v === 5), cible:'ennemi', f:(J, vs, k) => { degats(k, 10); seve(-10); } } },
      { seuil:1 / 3, garde:{ n:'Granit vivant', txt:'1 dé', d:'Bouclier = 2 × la valeur du dé.', cond:vs => vs.length === 1, val:vs => vs[0] * 2, f:(J, vs) => { J.gardeB += vs[0] * 2; } },
        pouvoir:{ n:'Écrasement', txt:'3 dés identiques ou plus', d:'10 dégâts (13 avec 4 dés, 15 avec 5).', cond:vs => vs.length >= 3 && vs.every(v => v === vs[0]), cible:'ennemi', f:(J, vs, k) => degats(k, [0, 0, 0, 10, 13, 15][vs.length]) } },
    ],
    ultime:{ n:'Colère de Gaïa', txt:'3 dés', d:'20 dégâts au héros visé et Handicap.', cond:vs => vs.length === 3, cible:'ennemi', f:(J, vs, k) => { const D = k && k.J && !k.u ? k.J : adv(J); degats({ J:D }, 20); altere(D, 'handicap'); } },
    renforts:[] },
};
function poussiere(D) { if (!D) return; D.poussiere = Math.min(3, (D.poussiere || 0) + 1); log(`🪨 Poussière de pierre sur ${D.nom} : prochain soin −${D.poussiere * 2}.`); }
function seve(n) { if (!S || S.seve === undefined || S.fini) return; S.seve = Math.max(0, Math.min(100, S.seve + n)); log(`🌳 Sève de l’Arbre-Monde : ${S.seve} %.`); if (S.seve <= 0) { log('🌳 L’Arbre-Monde est pétrifié…'); S.fini = 'perdu'; } }
Object.assign(BOSS, VAGUES_REVEIL);
BOSS_CAMP.reveil = { nom:'Le Réveil des Primordiaux', titre:'Invasion · Acte II (3 vagues)', emoji:'🌳', c:'#7a5ad9', pv:271, boss:true, vagues:['eclaireurs', 'colosse2', 'titanp'], seve:true,
  role:'Le livre papier : les Éclaireurs de silex, le Colosse des racines et ses Micro-racines, puis le Titan primordial. Et la jauge de Sève de l’Arbre-Monde : à 0 %, le monde est pétrifié.', cit:'« La sève se change en quartz. »',
  phases:VAGUES_REVEIL.eclaireurs.phases, ultime:VAGUES_REVEIL.eclaireurs.ultime, renforts:[] };
const COHESION = { depart:4, max:8, relever:3, cri:2, soin:2, concertee:3 };  // 10/11 : Frappe concertée = 4 dégâts à CHAQUE créature du boss (les racines)
Object.assign(BOSS, BOSS_CAMP);
if (typeof HEROS !== 'undefined') installeMonstres();
const CAMP_CLE = 'guilde-campement';
function lireCampement() { try { return JSON.parse(localStorage.getItem(CAMP_CLE) || 'null'); } catch (e) { return null; } }
