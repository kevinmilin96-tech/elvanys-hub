// =============================================================================================== LES GUIDES DE MOUSTACHE DES NOUVEAUX MODES (15/11 ~18 h 10)
// Demande de l'utilisateur : « continuer à faire les tutos dans les nouveaux modes de jeu, important ».
// Même guide que l'Odyssée et les Expéditions (guide.js) : au premier passage, Moustache montre chaque zone une à une, le reste assombri ;
// une fois vu, il ne revient plus (⚙️ Paramètres → « Moustache vous guidera à nouveau » les remet tous).
// Chaque page charge guide.js puis ce fichier, et appelle guideMode('<clé>') après avoir dessiné son écran.
const GUIDES_MODES = {
  crypte:[
    [null, 'Bienvenue dans la <b>Crypte aux Sceaux</b> ! Un solitaire de dés : des colonnes de monstres, et toi, avec tes dés, pour briser leurs <b>sceaux</b>.'],
    ['.table', 'Les <b>colonnes de monstres</b>. Seul le monstre du dessus se combat. Brise tous ses sceaux et il tombe ; le suivant se montre. Au bout : le Gardien.'],
    ['.sceaux', 'Les <b>sceaux</b> : chacun demande un dé précis (un nombre exact, « 5 ou plus », une somme…). Touche un de tes dés, puis le sceau.'],
    ['.menace', 'La <b>menace</b> : ce que ce monstre te fera à la fin du tour s’il est encore debout. Abats d’abord les plus dangereux !'],
    ['.lancer', 'Au début du tour, tes dés sont <b>cachés</b> : touche « Lancer les dés » pour les voir rouler.'],
    ['.creuset', 'Le <b>creuset</b> : pose-y des dés identiques, ils deviennent une <b>Rune</b>, un joker très fort.'],
    ['.besace', 'La <b>besace</b> : garde un dé pour un tour suivant.'],
    ['.btn-pouv', 'Le <b>pouvoir</b> de ton héros : il se charge avec les dés que tu poses. Quand il brille, touche-le !'],
    ['.actions', 'Quand tu as posé ce que tu voulais, <b>finis ton tour</b> : les monstres du dessus frappent. Bonne chasse, miaou !'],
  ],
  descente:[
    [null, 'La <b>Descente</b> : trois étages sous la crypte, un boss au fond de chacun. Ce que tu gagnes en route te suit jusqu’en bas.'],
    ['.heros', 'Choisis ton <b>héros</b>. Sa progression (niveau, rang, équipement de « Mes héros ») compte ici aussi.'],
    ['.breloques', 'Une <b>breloque</b> à emporter : un petit avantage que tu gardes toute la descente. On en débloque de nouvelles en jouant.'],
    ['.etages', 'La <b>profondeur</b> : plus tu descends profond, plus c’est dur… et plus ça rapporte.'],
    [null, 'Ensuite, une <b>carte à embranchements</b> : tu choisis ton chemin case par case (combats, élites, marchand, feu de camp, événements, trésors). Les combats sont obligatoires sur certaines rangées.'],
  ],
  'descente-carte':[
    ['.carteD', 'Voici la <b>carte de l’étage</b>. Les cases qui <b>clignotent en vert</b> sont celles où tu peux aller ; les lignes montrent les chemins. Le boss ♛ est tout en haut.'],
    ['.salles', 'Ou touche une de ces <b>salles</b> : ⚔ combat, ★ élite (plus dur, meilleur butin), 🛒 marchand, 🔥 feu, ❓ événement, 💰 trésor.'],
    ['.sac', 'Ton <b>sac</b> : tes objets et tes consommables. Touche-les pour lire ce qu’ils font.'],
  ],
  chroniques:[
    [null, 'Les <b>Chroniques de la Guilde</b> : jusqu’à 4 héros explorent un donjon dans le noir, ouvrent des portes, fouillent des meubles et affrontent le boss du scénario.'],
    ['.choixH', 'Choisis le <b>scénario</b>, puis tes <b>héros</b> (de la Guilde, ou tes héros d’aventure de la Forge). Seul, tu peux en jouer plusieurs.'],
    [null, 'Plus bas : les <b>Aventures</b> en scènes (une vraie histoire), la <b>Campagne</b> (3 chapitres à la suite), et 🌐 <b>chacun chez soi</b> pour jouer entre amis sur vos téléphones.'],
  ],
  'chroniques-jeu':[
    ['.stats', 'En haut : le <b>sablier</b> ⌛ (il descend à chaque tour des monstres : à zéro, c’est perdu !) et ce qu’il reste à trouver.'],
    ['.but', 'Le <b>but</b> du moment. Il change quand vous avancez.'],
    ['#vue', 'Le <b>donjon</b>. Touche une case pour y aller ; une <b>porte</b> à côté s’ouvre d’un toucher. Les meubles se fouillent avec un dé.'],
    ['.equipe', 'Tes <b>héros</b>. Joue-les dans l’ordre que tu veux : touche un héros pour le prendre.'],
    ['#desH', 'Ses <b>dés</b> : d’abord cachés, touche « Lancer ». Puis un dé sert à <b>avancer</b>, <b>frapper</b> un monstre (sur ses sceaux), <b>fouiller</b>, <b>protéger</b> ou <b>soigner</b>.'],
    ['.actions', 'Quand un héros a fini, touche « … a fini ». Quand tout le monde a fini, <b>les monstres</b> jouent. Courage !'],
  ],
  'mes-heros':[
    [null, 'Voici <b>tous tes héros</b> : ceux de la Guilde et tes héros d’aventure. Ici, tu les rends plus forts contre les monstres (le Duel de l’Arène, lui, reste équitable).'],
    ['.fh-ress', 'Tes ressources : 🪙 <b>or</b>, 🔹 <b>poussière de rune</b> (pour les niveaux) et 💠 <b>éclats de Guilde</b> (pour le rang du héros de ton choix).'],
    ['.recolte', 'La <b>récolte du campement</b> : pendant que tu n’es pas là, la Guilde ramasse de l’or et de la poussière (12 h au plus). Pense à revenir la ramasser !'],
    ['.grille', 'Touche un héros pour ouvrir sa <b>fiche</b> : niveau, rang, équipement. La pastille ⬆ veut dire qu’il peut monter.'],
  ],
  'fiche-heros':[
    ['.fh-scene', 'La <b>fiche du héros</b> : au centre, le héros et son rang ; autour, ses <b>6 cases d’équipement</b>. Touche une case pour équiper ou améliorer une pièce.'],
    ['.fh-stats', 'Ses <b>caractéristiques</b>. La <b>puissance</b> ✊ résume tout en un seul chiffre.'],
    ['.fh-bloc', 'Le <b>niveau</b> se monte avec l’or et la poussière, jusqu’au plafond de son rang. Le <b>rang</b> (juste dessous) se monte avec ses éclats et relève ce plafond.'],
    [null, 'Dans le <b>coffre</b> : 3 pièces de la même case et de la même rareté <b>fusionnent</b> en une pièce plus rare. Et le <b>forgeron</b> en vend 3 nouvelles chaque jour. Miaou !'],
  ],
  forge:[
    [null, 'La <b>Forge des héros</b> : ici, tu crées TON héros d’aventure, comme dans un jeu de rôle. Une voie, un nom, un portrait, une couleur.'],
    [null, 'Il a un <b>dé personnel</b> : chaque niveau d’expérience gagné en aventure donne un point de forge pour renforcer une face. Et aux niveaux 2, 4 et 6, il choisit un <b>talent</b>.'],
    [null, 'Ses niveaux, son rang et son équipement se gèrent avec tous les autres héros dans <b>« Mes héros »</b>. Il joue dans les Chroniques et les Aventures.'],
  ],
  epreuves:[
    [null, 'Les <b>épreuves</b> : deux défis pour les héros les plus solides.'],
    ['.onglets', 'La <b>Tour des épreuves</b> : monte étage par étage, un boss tous les 5 étages (il laisse tomber de l’équipement). Et la <b>Chasse au boss</b> de la semaine : 8 tours pour lui faire le plus de mal possible.'],
    ['.heros', 'Choisis ton héros : son niveau, son rang et son équipement comptent ici. Plus il est fort, plus tu montes haut !'],
  ],
};
function guideMode(k, force) { if (typeof Guide === 'undefined' || !GUIDES_MODES[k]) return false; return Guide.lance(k, GUIDES_MODES[k], force); }
// un petit bouton « 🐱 Aide » pour revoir le guide de l'écran
const guideBouton = k => `<button onclick="guideMode('${k}', true)" style="background:#2a2350;color:#f3c96b;border:1px solid #f3c96b88;border-radius:20px;padding:4px 10px;font:inherit;font-size:.85em;cursor:pointer">🐱 Aide</button>`;
