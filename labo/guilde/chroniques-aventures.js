// =============================================================================================== LES AVENTURES EN SCÈNES (15/11 soir)
// Demande de l'utilisateur : « je suis à la taverne, je vais voir un personnage de quête, il raconte l'histoire ; on sort, on arrive dans un autre monde,
// un chemin, si on avance une embuscade, on finit le chemin, on va dans une tour… que ce ne soit pas figé sur l'écran ».
// Choix (boîtes) : l'utilisateur raconte, Claude écrit les aventures ; la première est inventée par Claude ; le chemin = une CARTE DU MONDE
// où l'on voit le groupe avancer étape par étape.
// Une aventure = une suite de SCÈNES :
//   taverne  : un lieu, un personnage de quête, ses répliques une par une, puis des choix (questions, accepter)
//   recit    : une page de récit (transition)
//   carte    : une carte du monde, un chemin en étapes (route, source, événement à choix, EMBUSCADE = combat, arrivée)
//   donjon   : un donjon des Chroniques (le moteur habituel), avec les textes de l'aventure
//   fin      : la fin, la récompense
// Les combats et le donjon utilisent l'écran des Chroniques (chroniques.html) ; la vie et les sacs des héros passent d'une scène à l'autre.
const AVENTURES = {
  brumes: {
    titre:'🗝 La Clé des Brumes', resume:'Une tour est sortie du marais en une nuit, et un brouillard gris vole les couleurs du pays. Un vieux cartographe a un plan.', duree:'45-75 min',
    scenes:[
      { t:'taverne', lieu:'La taverne du Chaudron Fêlé', fond:'taverne', pnj:{ n:'Anselme, le vieux cartographe', e:'🧓', img:'pnj-anselme' },
        lignes:[
          '« Ah ! Des aventuriers. Enfin. Asseyez-vous, la soupe est tiède mais l’histoire est brûlante. »',
          '« Il y a trois nuits, une TOUR est sortie du Marais des Saules. D’un coup, comme un champignon. Depuis, un brouillard gris rampe vers nos villages… et là où il passe, les couleurs disparaissent. »',
          '« J’ai lu dans mes vieilles cartes qu’une telle tour se ferme avec la CLÉ DES BRUMES. Elle est cassée en trois fragments, cachés quelque part dans la tour. »',
          '« Le chemin passe par la Route des Saules. Méfiez-vous : des gobelins rôdent, et le brouillard rend les loups nerveux. »',
        ],
        questions:[
          { n:'« Pourquoi nous ? »', r:'« Parce que vous êtes les seuls clients qui ne dorment pas sur la table. Et parce que votre chat a l’air de savoir se battre. »' },
          { n:'« Et Moustache, il vient ? »', r:'Moustache, depuis le comptoir : « Je viens. Mais je ne porte rien, je ne mouille pas mes pattes, et je veux une part du butin. En poisson. »' },
        ],
        accepter:'Accepter la quête' },
      { t:'recit', titre:'La porte de la taverne', fond:'brume', texte:'Vous poussez la porte… et le monde a changé. Le ciel est gris, l’herbe est grise, même le soleil semble délavé. Au loin, au-dessus des saules, une tour noire perce le brouillard. Moustache frissonne : « Je déteste quand le monde perd ses couleurs. On dirait un vieux tableau. »' },
      { t:'carte', titre:'La Route des Saules', fond:'marais', etapes:[
        { t:'route', n:'Le pont de pierre', txt:'Un vieux pont de pierre enjambe un ruisseau gris. Moustache le traverse en courant, la queue en l’air. « Vite, vite, l’eau me regarde. »' },
        { t:'source', n:'La source claire', txt:'Une petite source a gardé sa couleur : un bleu vif, presque insolent. Vous buvez : chaque héros reprend 5 PV.', soin:5 },
        { t:'embuscade', n:'Les buissons qui bougent', txt:'Les buissons bougent. Trop. Des gobelins des brumes jaillissent, couteaux tirés, avec un loup qui grogne derrière eux. « Embuscade ! » crie Moustache, déjà perché sur un rocher.', monstres:['gobelin', 'gobelin', 'loup'], obstacles:8 },
        { t:'evenement', n:'Le marchand ambulant', txt:'Un marchand à la charrette grise vous fait signe. « J’ai sauvé deux choses du brouillard. Une seule pour vous, je ne suis pas riche. »',
          choix:[{ n:'🧪 Une potion de soin', sac:'potion' }, { n:'📜 Un parchemin de feu', sac:'parchemin' }, { n:'💨 Une bombe fumigène', sac:'fumee' }] },
        { t:'route', n:'Les saules pleureurs', txt:'Les saules pleurent des gouttes grises. Le brouillard s’épaissit. Moustache se colle à vos jambes : « Je ne marche pas devant. Pas parce que j’ai peur. Pour vous laisser la gloire. »' },
        { t:'embuscade', n:'La meute du marais', txt:'Des yeux jaunes dans la brume. Une meute de loups vous encercle, menée par une salamandre qui crache des étincelles grises.', monstres:['loup', 'loup', 'salamandre', 'scarabee'], obstacles:10 },
        { t:'fin', n:'Le pied de la tour', txt:'La tour est là, immense, noire, couverte de lierre gris. Sa porte est entrouverte. Une odeur de vieille pierre et de pluie en sort. « Bon, » dit Moustache, « c’est le moment où je vous attends dehors. »' },
      ] },
      { t:'donjon', scen:'labyrinthe', textes:{
        titre:'🏰 La Tour des Brumes', duree:'',
        ouverture:'« La tour est plus grande dedans que dehors. Évidemment. Quelque part, dans ces salles, dorment trois fragments de la Clé des Brumes. Fouillez les meubles, et rapportez-les à l’autel tout en haut. »',
        entree:() => '« On ne voit que ce qui est devant nous. Le brouillard cache le reste. Avancez ensemble. »',
        but:'Fouillez les meubles (un dé) pour trouver <b>3 fragments de la Clé des Brumes ✦</b>, puis portez-les à <b>l’autel</b>, au fond de la tour.',
        porter:'Portez les fragments jusqu’à l’autel ✦, au fond de la tour.',
        gagne:['🗝 La Clé des Brumes est reformée !', '« La clé tourne toute seule dans l’autel. Un grand souffle traverse la tour… et le gardien de pierre tombe en poussière. Dehors, on entend les couleurs revenir. Oui, on les entend. Ça fait comme une chanson. »'] } },
      { t:'fin', titre:'Les couleurs reviennent', fond:'aube', texte:'Quand vous sortez, le soleil est jaune, l’herbe est verte, et les saules ont repris leur air triste mais coloré. À la taverne, Anselme a déjà déplié une nouvelle carte. « Bravo. Mais regardez ça : une autre tour, au nord… » Moustache soupire : « Je commande d’abord un poisson. »', xp:150 },
    ] },
  // 26/11 : L'ALMANACH · Saison 1 « L'Hiver des runes », l'aventure « Les Cloches de givre », chapitre 1 (scénario validé : almanach-saison1-scenario.html).
  // Ouvert du 1er décembre à la fin de la saison (mode atelier : toujours). froid:1 = la règle de la saison dans les embuscades (le donjon l'a dans son scénario).
  cloches1: {
    titre:'🔔 Les Cloches de givre · Chapitre 1', resume:'La saison de Maëlle. Le blizzard qui ne s’arrête pas : les trois cloches que sa famille a fondues se sont tues le même soir.', duree:'30-45 min',
    saison:'s1', froid:1, xp:250,
    scenes:[
      { t:'taverne', lieu:'L’auberge du Col, au pied de la montagne', fond:'taverne-hiver', pnj:{ n:'Ilse, la passeuse du col', e:'🧣', img:'pnj-ilse' },
        lignes:[
          '« Fermez la porte, vite ! Le vent rentre partout. Asseyez-vous près du feu, vous en aurez besoin. »',
          '« Là-haut, sur la montagne, il y a le monastère des Veilleurs. Depuis cent ans, ils sonnent trois grandes cloches, et le son tient l’hiver à distance de la vallée. »',
          '« Ça fait des années que les hivers durent un mois de plus. Tout le monde disait : les hivers sont rudes. Cet automne, la neige est tombée en septembre, et les loups des neiges sont descendus jusqu’au village. »',
          '« Et il y a sept nuits, plus rien. Les trois cloches se sont tues. Depuis, un blizzard descend, et il ne s’arrête plus. Ça, ce n’est pas le vent. »',
          'Ilse se tourne vers la forgeronne assise près du feu : « Maëlle… ces cloches, c’est ta famille qui les a coulées. Et tous les dix ans, un forgeron de chez toi monte retremper leurs runes. Dix ans… c’est cet hiver. C’est ton tour. »',
          '« Je connais le col. Je vous mène jusqu’aux portes. Après, c’est à vous : trouvez la corde de la première cloche, et faites-la sonner. »',
        ],
        questions:[
          { n:'« Pourquoi les cloches ? »', r:'« Le son des cloches porte loin, très loin. Les Veilleurs disaient qu’il “rappelle au froid où est sa place”. Moi, je sais juste que tant qu’elles sonnaient, on avait des printemps. »' },
          { n:'« Et les Veilleurs, alors ? »', r:'« Personne n’est redescendu. Pas un. C’est pour ça que je vous parle à voix basse. »' },
          { n:'« Et Maëlle ? »', r:'Maëlle pose son marteau sur la table : « La dernière fois, c’était mon père qui montait. L’avalanche l’a pris en chemin, on n’a retrouvé que son marteau. Cette fois, c’est le mien qui monte. Je viens. »' },
          { n:'« Et Moustache, il vient ? »', r:'Moustache, roulé en boule contre la cheminée : « Je viens. Mais je proteste. Le froid, c’est une insulte faite aux chats. Quelqu’un a une écharpe ? »' },
        ],
        accepter:'Partir vers le monastère' },
      { t:'recit', titre:'La porte de l’auberge', fond:'monastere', texte:'Dehors, le monde est blanc. La neige tombe de côté, poussée par un vent qui siffle comme une bouilloire. Ilse ajuste sa lanterne et montre la montagne : tout là-haut, une silhouette sombre, le monastère. « On marche en file. On ne lâche personne. » Maëlle remonte son écharpe : « Mon père disait qu’on entendait les cloches jusqu’au village. Ce soir, on n’entend que le vent. » Moustache s’enfonce jusqu’au ventre dans la neige : « Formidable. Je vais arriver là-haut en sorbet. »' },
      { t:'carte', titre:'Le col enneigé', fond:'monastere', carte:'carte-col-enneige', etapes:[
        { t:'route', n:'Le pont de glace', txt:'Un vieux pont de bois, couvert de glace, au-dessus d’un torrent gelé. Ilse passe la première, à petits pas. Moustache traverse d’une traite en criant : « Je glisse, je glisse, je GLISSE ! » Il arrive de l’autre côté sur le dos.' },
        { t:'embuscade', n:'Les loups des neiges', txt:'Des hurlements dans le blizzard. Des loups blancs comme la neige sortent de nulle part, les yeux brillants. « Dos à dos ! » crie Ilse. Moustache, perché sur sa tête : « Moi je surveille d’en haut. »', monstres:['loupblanc', 'loupblanc', 'spectregivre'], obstacles:8 },
        { t:'source', n:'La cabane du bûcheron', txt:'Une petite cabane, un poêle encore tiède, une marmite de soupe oubliée. Vous vous réchauffez un moment : chaque héros reprend 5 PV. Moustache refuse de ressortir pendant dix bonnes minutes.', soin:5 },
        { t:'evenement', n:'La crevasse', txt:'Le sentier se sépare. Tout droit, un raccourci par une crevasse : on y voit briller un sac abandonné… et des ombres qui bougent. À gauche, le long chemin, plus sûr, qui fait le tour de la falaise.',
          choix:[{ n:'⚔ Le raccourci (un combat, mais une potion)', sac:'potion', combat:{ txt:'Dans la crevasse, le sac est bien là… mais deux spectres de givre glissent hors de la glace pour le garder. « Évidemment, » soupire Moustache.', monstres:['spectregivre', 'spectregivre', 'loupblanc'], obstacles:6 } },
                 { n:'🥾 Le long chemin (rien de spécial)' }] },
        { t:'fin', n:'Les portes du monastère', txt:'Deux grandes portes de bois cerclées de fer, à moitié enfouies sous la neige. Elles ne sont pas fermées. Ilse s’arrête : « Moi, je reste ici avec la lanterne, pour que vous retrouviez le chemin. » Moustache : « Excellente idée. Je reste avec elle. » Il vous suit quand même.' },
      ] },
      { t:'donjon', scen:'cloitre', textes:{
        titre:'🔔 Le Cloître gelé', duree:'',
        ouverture:'« Le cloître des Veilleurs. Tout est blanc, tout craque, et pas un bruit. Quelque part dans ces salles, la corde de la première cloche a été cachée. Sans elle, la cloche reste muette… et le blizzard continue. »',
        entree:() => '« Attention au froid : un dé qui fait 1 se couvre de givre ❄. Au tour suivant, il revient tel quel, à la place d’un dé neuf. »',
        but:'Fouillez les meubles (un dé) pour trouver <b>la corde de la cloche 🪢</b>, puis portez-la jusqu’à <b>la cloche gelée 🔔</b>, au fond du cloître. <b>❄ Le froid</b> : un dé qui fait 1 gèle et revient tel quel au tour suivant.',
        porter:'Portez la corde jusqu’à la cloche 🔔, au fond du cloître.',
        gagne:['🔔 La première cloche sonne !', '« DONG… Le son roule sur toute la montagne. Dehors, le blizzard faiblit un peu. Et sous nos pieds… quelque chose a répondu. Vous avez entendu ? Moi, non. Je n’ai rien entendu. Rien du tout. »'] } },
      { t:'fin', titre:'Une cloche sur trois', fond:'monastere', texte:'Quand vous ressortez, Ilse lève sa lanterne vers le ciel : entre deux rafales, on aperçoit une étoile. La première depuis sept nuits. « Une cloche sur trois… c’est un début. » Maëlle a gardé la main posée sur le bronze : « Celle-là s’était juste usée : je l’ai retrempée, comme mon père l’aurait fait. Mais au pied de la cloche, il y a des marques de lime toutes fraîches. Quelqu’un est monté ici avant nous. » Mais au même moment, très loin sous la terre, un grondement répond au son de la cloche. Long. Lent. Comme quelqu’un qui se réveille. Moustache a les poils hérissés : « Je propose qu’on rentre. Tout de suite. » <br><br><b>À suivre : chapitre 2, « Le festin des goules », le 15 décembre.</b>', xp:250 },
    ] },
  // 26/11 : chapitre 2 « Le festin des goules » (à partir du 15 décembre) : le récit qui relie, le réfectoire, la fin
  cloches2: {
    titre:'🔔 Les Cloches de givre · Chapitre 2', resume:'Le festin des goules : un réfectoire gelé, un coffre qui ment, quatre statues à tourner vers la deuxième cloche.', duree:'30-45 min',
    saison:'s1', ouvre:'2026-12-15', froid:1, xp:250,
    scenes:[
      { t:'recit', titre:'Précédemment…', fond:'monastere', texte:'La première cloche a sonné, et le blizzard a faibli. Mais sous la montagne, quelque chose a répondu. Ilse vous attend au pied du monastère, sa lanterne à la main : « La neige a recouvert vos traces. Cette fois, il faut aller plus loin : le réfectoire des Veilleurs, et la deuxième cloche. On raconte que le dernier repas y est resté servi… et que quelqu’un s’est invité. » Maëlle serre son marteau : « Au pied de la première cloche, des marques de lime toutes fraîches. Quelqu’un ne veut pas qu’elles sonnent. » Moustache, les oreilles en arrière : « Un festin ? Pour moi ? … Non. Je le sens mal. »' },
      { t:'donjon', scen:'refectoire', textes:{
        titre:'🍽 Le Réfectoire gelé', duree:'',
        ouverture:'« Les tables sont encore dressées. Les assiettes sont pleines… de glace. Et dans l’ombre, ça mâche. »',
        entree:() => '« Deux coffres gravés gardent la corde de la deuxième cloche : lisez bien leurs phrases (touchez 📋 en haut), un seul dit vrai. Et la cloche est prise dans la glace tant que les quatre statues ne la regardent pas. »',
        but:'Trouvez <b>la corde 🪢</b> dans le bon <b>coffre gravé</b> (un seul dit vrai : le mauvais libère une goule), tournez les <b>quatre statues</b> vers la cloche, puis sonnez <b>la deuxième cloche 🔔</b>. <b>❄ Le froid</b> : un dé qui fait 1 gèle et revient tel quel au tour suivant.',
        porter:'Portez la corde jusqu’à la cloche 🔔 (les quatre statues doivent la regarder).',
        gagne:['🔔 La deuxième cloche sonne !', '« Deux cloches sur trois. Les loups des neiges remontent vers la montagne… Écoutez… ça ne répond plus sous la terre. Ça PARLE. Une voix glacée : « Qui ose ? » … Et là-haut, dans une cellule, quelqu’un frappe contre les barreaux. Le dernier Veilleur est vivant ! »'] } },
      { t:'fin', titre:'Deux cloches sur trois', fond:'monastere', texte:'Dehors, le vent est tombé d’un coup. Ilse vous regarde, puis la crypte, puis vous : « Une voix sous la terre, un Veilleur enfermé… On ne l’abandonnera pas. » Au pied de la deuxième cloche, la rune a été limée, et la lime est restée là, abandonnée dans la neige. Maëlle la ramasse, et se fige : sur le manche, un poinçon qu’elle connaît par cœur. « C’est celui de mon père. » Au loin, les loups des neiges remontent vers la montagne en hurlant. Moustache s’ébroue : « Je propose qu’on le libère vite. Et qu’on parte encore plus vite. » <br><br><b>À suivre : chapitre 3, « Le dernier Veilleur », le 29 décembre.</b>', xp:250 },
    ] },
  // 27/11 : chapitre 3 « Le dernier Veilleur » (à partir du 29 décembre) : Précédemment, une petite carte, les cellules et le clocher, la fin
  cloches3: {
    titre:'🔔 Les Cloches de givre · Chapitre 3', resume:'Le dernier Veilleur : délivrer frère Aubin, libérer le Chevalier de glace, retenir l’air des cloches.', duree:'30-45 min',
    saison:'s1', ouvre:'2026-12-29', froid:1, xp:250,
    scenes:[
      { t:'recit', titre:'Précédemment…', fond:'monastere', texte:'La première cloche s’était usée toute seule : Maëlle l’a retrempée, et le blizzard a faibli. La deuxième avait été limée : dans le réfectoire gelé, il a fallu déjouer un coffre menteur et tourner quatre statues pour la faire sonner, et les loups des neiges sont remontés vers la montagne. Au pied de la cloche, une lime abandonnée portait le poinçon de Bran, le père de Maëlle, disparu il y a dix ans. Sous la terre, une voix glacée a demandé : « Qui ose ? » Et là-haut, quelqu’un frappait contre des barreaux. Ilse vous attend au pied du monastère : « C’est frère Aubin, le dernier Veilleur. Lui seul connaît l’air des cloches. Sans lui, la troisième ne sonnera jamais. » Maëlle serre la lime dans sa poche. Elle ne dit rien. Moustache non plus, et c’est bien la première fois.' },
      { t:'carte', titre:'Le chemin des Veilleurs', fond:'monastere', carte:'carte-col-enneige', etapes:[
        { t:'route', n:'L’escalier taillé dans la glace', txt:'Un escalier de pierre monte vers les cellules, chaque marche couverte de glace vive. Ilse plante sa lanterne au pied : « Je la laisse allumée. Redescendez vers elle. » Moustache monte en crabe, une patte après l’autre : « Si je tombe, je veux qu’on dise que c’était héroïque. »' },
        { t:'embuscade', n:'Les spectres de la galerie', txt:'Dans la galerie qui mène aux cellules, des silhouettes blanches se détachent des murs. « Ils cherchent le Veilleur, » souffle Maëlle. « Ils ne l’auront pas. »', monstres:['spectregivre', 'spectregivre', 'loupblanc'], obstacles:6 },
        { t:'fin', n:'Les cellules', txt:'Une longue rangée de portes à barreaux, toutes couvertes de givre. Tout au bout, une voix faible fredonne quelque chose. Trois notes, puis plus rien. Moustache tend une oreille : « C’est joli. Ça me donne envie de pleurer, et je déteste ça. »' },
      ] },
      { t:'donjon', scen:'cellules', textes:{
        titre:'🔔 Les Cellules gelées', duree:'',
        ouverture:'« Les cellules des Veilleurs. Quelque part, frère Aubin attend derrière ses barreaux. Et quelque part aussi, un chevalier tout en glace monte la garde devant le clocher. »',
        entree:() => '« Délivrez frère Aubin : ensuite il suit le héros le plus proche, et lui seul ouvre les murs fissurés. S’il tombe, relevez-le. Quand il entrera dans le clocher, il fredonnera l’air des cloches UNE SEULE FOIS : retenez bien les couleurs ! »',
        but:'Délivrez <b>frère Aubin</b> de sa cellule et escortez-le, libérez <b>le Chevalier de glace</b> de son armure de givre pour prendre <b>la clé du clocher 🗝</b>, puis tirez <b>les leviers chantants</b> dans l’ordre de l’air qu’Aubin fredonne. <b>❄ Le froid</b> : un dé qui fait 1 gèle et revient tel quel au tour suivant.',
        porter:'Tirez les leviers chantants dans l’ordre de l’air.',
        gagne:['🔔 Les trois cloches sonnent ensemble !', '« Les trois cloches sonnent ensemble… le sol tremble : la crypte s’ouvre. » Frère Aubin, tout pâle : « Il dort sous nos pieds depuis cent ans. Vous l’avez réveillé tout à fait. Désolé. »'] } },
      { t:'fin', titre:'Les trois cloches', fond:'monastere', texte:'Les trois cloches sonnent ensemble, et le son roule jusqu’au village. Puis le sol tremble : tout au fond du monastère, la dalle de la crypte se fend en deux. Frère Aubin, tout pâle : « Il dort sous nos pieds depuis cent ans. Vous l’avez réveillé tout à fait. Désolé. » Au pied de l’escalier, Bran attend, enroulé dans une couverture qu’Ilse lui a apportée. Il regarde sa fille longtemps, puis il se lève, même s’il tremble encore : « Le Roi de l’Hiver m’a pris dix ans. Cette fois, on descend ensemble. » Maëlle sourit pour la première fois depuis le col : « Ensemble. Mais c’est moi qui porte le marteau. » Moustache, la queue gonflée : « Une crypte. Bien sûr. Pourquoi pas une crypte. » <br><br><b>À suivre : chapitre 4, « Le Roi de l’Hiver », le 12 janvier.</b>', xp:250 },
    ] },
  // 27/11 : chapitre 4 « Le Roi de l'Hiver » (à partir du 12 janvier) et l'épilogue de la saison
  cloches4: {
    titre:'🔔 Les Cloches de givre · Chapitre 4', resume:'Le Roi de l’Hiver : la crypte, le reliquaire, la rune forgée par Bran. Et l’épilogue de la saison.', duree:'45-60 min',
    saison:'s1', ouvre:'2027-01-12', froid:1, xp:300,
    scenes:[
      { t:'recit', titre:'Précédemment…', fond:'monastere', texte:'Les trois cloches que la famille de Maëlle a coulées il y a cent ans s’étaient tues. La première s’était usée : Maëlle l’a retrempée. La deuxième avait été limée : il a fallu déjouer un coffre menteur et tourner quatre statues. Pour la troisième, vous avez délivré frère Aubin, le dernier Veilleur, et sous l’armure du Chevalier de glace, Maëlle a retrouvé son père, Bran, disparu depuis dix ans : le Roi de l’Hiver l’avait pris dans la glace pour limer les runes. Les trois cloches ont sonné ensemble… et la crypte s’est ouverte. Bran est descendu le premier : « L’enclume des Veilleurs est en bas. Je forgerai la rune qui le brise. » Moustache, la queue gonflée : « Une crypte. Bien sûr. »' },
      { t:'carte', titre:'L’escalier de la crypte', fond:'monastere', carte:'carte-col-enneige', etapes:[
        { t:'route', n:'Les marches de glace', txt:'Un escalier en colimaçon s’enfonce sous le monastère. Chaque marche est plus froide que la précédente. Aubin descend en comptant tout bas : « Cent marches. Les Veilleurs disaient : cent marches, et l’hiver est en dessous. »' },
        { t:'embuscade', n:'Les gardiens d’os', txt:'Sur le palier, des squelettes en armure de givre se lèvent en claquant des dents. Ils gardent la crypte depuis cent ans. « Pas de panique, » dit Moustache, « ce ne sont que des os. Des os qui veulent nous manger, d’accord. »', monstres:['osclaque', 'osclaque', 'spectregivre'], obstacles:6 },
        { t:'fin', n:'La crypte', txt:'Une immense salle voûtée, des sarcophages alignés, chacun près de sa torche. Tout au fond, un trône de glace. Et sur le trône, quelque chose qui respire lentement. Aubin murmure : « Son reliquaire est dans un des sarcophages. Les vieux livres disent : c’est là où la glace ne fond pas. »' },
      ] },
      { t:'donjon', scen:'crypte', textes:{
        titre:'👑 La Crypte du Roi', duree:'',
        ouverture:'« La crypte des Veilleurs. Des sarcophages, des torches… et le Roi de l’Hiver, endormi sur son trône. Bran vous attend à l’enclume, au fond. »',
        entree:() => '« Un seul sarcophage garde son givre malgré la torche : c’est lui qui cache le reliquaire. Quand vous entrerez dans la crypte, le Roi se réveillera : protégez Bran pendant qu’il forge la rune (trois tours), puis frappez le cœur du Roi avec elle. »',
        but:'Trouvez <b>le reliquaire</b> du Roi dans le bon <b>sarcophage</b> (là où le givre ne fond pas près de la torche) et brisez-le, puis entrez dans la crypte : <b>Bran forge la rune</b> pendant le combat (protégez-le), et <b>le Roi de l’Hiver</b> a trois phases. La dernière, son <b>cœur de glace</b>, ne se brise qu’avec la rune (ou avec les dés si le reliquaire est brisé). <b>❄ Le froid</b> : un dé qui fait 1 gèle ; pendant le blizzard, les 1 et les 2.',
        porter:'Frappez le cœur de glace du Roi avec la rune de Bran.',
        gagne:['❄ Le cœur de glace éclate !', '« Le Roi de l’Hiver se fige, se fend… et tombe en neige. Dehors, d’un coup, le blizzard s’arrête. »'] } },
      { t:'epilogue' },
      { t:'fin', titre:'Briseur de l’Hiver', fond:'aube', texte:'La Saison 1 est finie : le Roi de l’Hiver est brisé, les cloches sonnent, Bran est rentré à la forge, et Maëlle porte son manteau. Tu as gagné le titre <b>« Briseur de l’Hiver »</b>. Moustache s’étire au soleil : « Bon. Le Carnaval, maintenant. J’espère qu’il y aura du poisson. »<br><br><b>À suivre : la Saison 2, « Le Grand Carnaval », la saison de Gorm.</b>', xp:300 },
    ] },
};
// 26/11 : une aventure de saison n'est ouverte que pendant sa saison (le mode atelier l'ouvre toujours, pour les essais)
const avOuverte = a => !a.saison || localStorage.getItem('guilde-atelier') === '1' || (typeof saisonActive === 'function' && saisonActive() && saisonActive().id === a.saison && (!a.ouvre || almJour() >= a.ouvre)); // ouvre = la date du chapitre

// ------------------------------------------------------------------ l'aventure en cours
const CLE_AV = 'guilde-aventure-en-cours';
let AV = null;
const lireAV = () => { try { return JSON.parse(localStorage.getItem(CLE_AV) || 'null'); } catch (e) { return null; } };
const sauveAV = () => { try { if (AV) localStorage.setItem(CLE_AV, JSON.stringify(AV)); else localStorage.removeItem(CLE_AV); } catch (e) {} };
const sceneAV = () => AV && AVENTURES[AV.id].scenes[AV.scene];

(function () {
  const st = document.createElement('style');
  st.textContent = `
  .scn { position:relative; min-height:calc(100vh - 20px); border-radius:4cqw; overflow:hidden; padding:4cqw; animation:scnIn .7s ease-out; display:flex; flex-direction:column; }
  @keyframes scnIn { from { opacity:0; transform:scale(1.04); filter:blur(6px); } to { opacity:1; transform:none; filter:none; } }
  /* 15/11 nuit : les images reçues passent DEVANT le dégradé (avant, le dégradé opaque les cachait) */
  .scn.taverne { background:linear-gradient(180deg, #0004, #0009), url('decor/scene-taverne.webp?v=2') center/cover, radial-gradient(ellipse at 50% 30%, #6a3a12cc, #1a0d06 75%); }
  .scn.brume { background:linear-gradient(180deg, #0004, #0009), url('decor/scene-brume.webp?v=1') center/cover, radial-gradient(ellipse at 50% 40%, #8a8e9a, #2a2c34 80%); }
  .scn.taverne-hiver { background:linear-gradient(180deg, #0004, #000a), url('decor/scene-taverne-hiver.webp?v=1') center/cover, linear-gradient(#9fdcff22, #9fdcff22), url('decor/scene-taverne.webp?v=2') center/cover, #1a1420; }
  .scn.monastere { background:linear-gradient(180deg, #0003, #0009), url('decor/scene-monastere.webp?v=1') center/cover, radial-gradient(ellipse at 50% 30%, #b8cde0, #4a5a72 55%, #1a2232 95%); }
  .scn.finhiver { background:linear-gradient(180deg, #0003, #0008), url('decor/scene-fin-hiver.webp?v=1') center/cover, radial-gradient(ellipse at 50% 20%, #ffe9c4, #9fb8d8 50%, #2a3450 95%); }
  .scn.marais { background:linear-gradient(180deg, #3a4a3a, #1a221c); }
  .scn.aube { background:linear-gradient(180deg, #0004, #0009), url('decor/scene-aube.webp?v=1') center/cover, radial-gradient(ellipse at 50% 20%, #ffd27a, #ff8a4a 40%, #3a1a3a 90%); }
  .scn h2 { color:var(--or); text-align:center; margin:2cqw 0 3cqw; text-shadow:0 0 2cqw #000; }
  .scn .lieu { text-align:center; color:#ffd9a8; font-size:3.4cqw; letter-spacing:.2cqw; text-transform:uppercase; text-shadow:0 0 2cqw #000; }
  .pnj { display:flex; flex-direction:column; align-items:center; margin:3cqw 0; }
  .pnj .tete { width:30cqw; height:30cqw; border-radius:50%; border:3px solid var(--or); box-shadow:0 0 6cqw #f3c96b55; display:flex; align-items:center; justify-content:center; font-size:18cqw; background:#2a1a10; overflow:hidden; animation:respire 3s ease-in-out infinite; }
  .pnj .tete img { width:100%; height:100%; object-fit:cover; } @keyframes respire { 50% { transform:scale(1.03); } }
  .pnj b { color:var(--or); margin-top:2cqw; font-size:3.8cqw; }
  .replique { background:#1d1530ee; border:1.5px solid #6a5aa0; border-radius:3cqw; padding:3cqw 3.4cqw; font-size:3.7cqw; font-style:italic; line-height:1.45; margin:1.5cqw 0; animation:apparait .4s; }
  .replique.vieux { opacity:.5; font-size:3.2cqw; animation:none; }
  .scn .bas-s { margin-top:auto; display:grid; gap:2cqw; padding-top:3cqw; }
  .scn .bas-s button { border-radius:3.5cqw; padding:3cqw; font:bold 3.9cqw Georgia, serif; border:2px solid var(--or); background:var(--or); color:#2b1d0a; }
  .scn .bas-s button.b2 { background:#221d42cc; color:var(--texte); border-color:#6a5aa0; font-weight:normal; }
  .page-recit { background:#f3e6c8; color:#3a2a14; border-radius:2cqw; padding:5cqw; font-size:4cqw; line-height:1.55; box-shadow:0 2cqw 6cqw #000a; margin:4cqw 0; animation:feuille .8s ease-out; font-family:Georgia, serif; }
  @keyframes feuille { from { transform:perspective(80cqw) rotateY(-40deg); opacity:0; } to { transform:none; opacity:1; } }
  .carte-m { position:relative; width:100%; aspect-ratio:3/4; border-radius:3cqw; overflow:hidden; background:#d8c8a0 url('decor/carte-route-saules.webp?v=1') center/cover; box-shadow:inset 0 0 8cqw #6a4a2a; }
  .carte-m svg { position:absolute; inset:0; width:100%; height:100%; }
  .carte-m .pion { transition:transform 1.1s cubic-bezier(.45,.05,.4,1); }
  .etape-t { background:#1d1530ee; border:1.5px solid #6a5aa0; border-radius:3cqw; padding:3cqw; font-size:3.6cqw; line-height:1.45; margin-top:3cqw; animation:apparait .4s; min-height:20cqw; }
  .etape-t b { color:var(--or); }
  .groupe-pv { display:flex; justify-content:center; gap:2cqw; flex-wrap:wrap; margin:2cqw 0 0; font-size:3cqw; }
  .groupe-pv span { background:#1d1530cc; border:1px solid #4b4580; border-radius:2cqw; padding:.4cqw 1.6cqw; }
  `;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------------ commencer, reprendre
function lanceAventure(id) {
  if (!choisis.length) { bulle('Choisis d’abord tes héros', true); return; }
  AV = { id, scene:0, etape:-1, equipe:choisis.slice(), pv:{}, sacs:{}, debut:Date.now(), vu:0 };
  sauveAV(); son('portail'); joueScene();
}
function reprendAventure() { AV = lireAV(); if (!AV) return; joueScene(); }
function abandonneAventure() { if (!confirm('Abandonner cette aventure ?')) return; AV = null; sauveAV(); S = null; accueil(); }
function sceneSuivante() { AV.scene++; AV.etape = -1; AV.vu = 0; sauveAV(); son('portail'); joueScene(); }
// les PV max d'un héros de l'équipe (héros de la Guilde : un nom ; héros d'aventure : un objet avec ses PV)
const pvMaxEq = k => { const h = versMoteur(k); return h && typeof h === 'object' ? h.pv : (K.HEROS_C[k] || {}).pv || 15; };
const imgPnj = p => `<img src="portraits/${p.img}.webp" alt="" onerror="this.outerHTML='${p.e}'">`;
function pvGroupe() {
  return `<div class="groupe-pv">${AV.equipe.map((k, i) => `<span>${nomChoix(k)} ❤ ${AV.pv[i] != null ? AV.pv[i] : pvMaxEq(k)}/${pvMaxEq(k)}</span>`).join('')}</div>`;
}

// ------------------------------------------------------------------ jouer la scène en cours
function joueScene() {
  S = null; fenetre(''); const A = AVENTURES[AV.id], sc = sceneAV();
  if (!sc) { AV = null; sauveAV(); return accueil(); }
  const tete = `<div class="haut"><a href="#" onclick="if(confirm('Quitter ? L’aventure est gardée.')){AV=null;accueil()}return false">‹ Quitter</a><span class="t">${A.titre}</span><button onclick="abandonneAventure()">✕</button></div>`;
  if (sc.t === 'taverne') {
    const n = Math.min(AV.vu, sc.lignes.length - 1), finies = AV.vu >= sc.lignes.length - 1;
    $('app').innerHTML = `${tete}<div class="scn taverne"><div class="lieu">${sc.lieu}</div>
      <div class="pnj"><div class="tete">${imgPnj(sc.pnj)}</div><b>${sc.pnj.n}</b></div>
      ${sc.lignes.slice(0, n + 1).map((l, i) => `<div class="replique ${i < n ? 'vieux' : ''}">${l}</div>`).join('')}
      ${AV.reponse ? `<div class="replique">${AV.reponse}</div>` : ''}
      <div class="bas-s">${!finies ? `<button onclick="AV.vu++;AV.reponse=null;sauveAV();son('choisir');joueScene()">Suivant ▶</button>`
        : `${(sc.questions || []).map((q, k) => `<button class="b2" onclick="AV.reponse=AVENTURES[AV.id].scenes[AV.scene].questions[${k}].r;son('choisir');joueScene()">${q.n}</button>`).join('')}<button onclick="sceneSuivante()">⚔ ${sc.accepter || 'Partir'}</button>`}</div></div>`;
    return;
  }
  if (sc.t === 'recit' || sc.t === 'fin') {
    $('app').innerHTML = `${tete}<div class="scn ${sc.fond || 'brume'}"><h2>${sc.titre}</h2><div class="page-recit">${sc.texte}</div>
      <div class="bas-s"><button onclick="${sc.t === 'fin' ? 'finAventure()' : 'sceneSuivante()'}">${sc.t === 'fin' ? '🏆 Terminer l’aventure' : 'Continuer ▶'}</button></div></div>`;
    if (sc.t === 'fin') son('victoire');
    return;
  }
  if (sc.t === 'carte') return joueCarte(sc, tete);
  if (sc.t === 'donjon') return lanceDonjonAV(sc);
  if (sc.t === 'epilogue') { $('app').innerHTML = `${tete}<div class="scn aube"></div>`; return epilogueS1(() => sceneSuivante()); } // 27/11 : l'épilogue de la Saison 1
}

// ------------------------------------------------------------------ la carte du monde : le chemin en étapes, le pion qui avance
function posEtape(k, n) { const y = 124 - (112 * k / Math.max(1, n - 1)); const x = 50 + (k % 2 ? 22 : -22) * (k === 0 || k === n - 1 ? .2 : 1); return [x, y]; }
function joueCarte(sc, tete) {
  const E = sc.etapes, n = E.length, ici = Math.max(0, AV.etape), P = E.map((e, k) => posEtape(k, n));
  const chemin = P.map(([x, y], k) => (k ? 'L' : 'M') + x + ' ' + y).join(' ');
  const ICO = { route:'•', source:'💧', embuscade:'⚔', evenement:'❓', fin:'🏰' };
  const e = AV.etape >= 0 ? E[AV.etape] : null;
  let txt = '', boutons = '';
  if (!e) { txt = `<b>${sc.titre}</b> : le chemin commence ici. Avancez étape par étape ; restez sur vos gardes.`; boutons = `<button onclick="avance()">Avancer ▶</button>`; }
  else {
    txt = `<b>${e.n}</b> — ${e.txt}`;
    if (e.t === 'embuscade' && !AV.fait) boutons = `<button onclick="embuscade()">⚔ Aux armes !</button>`;
    else if (e.t === 'evenement' && !AV.fait) boutons = e.choix.map((c, k) => `<button class="b2" onclick="choixEvt(${k})">${c.n}</button>`).join('');
    else if (e.t === 'fin') boutons = `<button onclick="sceneSuivante()">🏰 Entrer</button>`;
    else boutons = `<button onclick="avance()">Avancer ▶</button>`;
    if (AV.resultat) txt += `<br><br>✨ ${AV.resultat}`;
  }
  const [px, py] = P[ici];
  $('app').innerHTML = `${tete}<div class="scn ${sc.fond || 'marais'}"><h2>🗺 ${sc.titre}</h2>
    <div class="carte-m"${sc.carte ? ` style="background-image:url('decor/${sc.carte}.webp?v=1'), url('decor/carte-route-saules.webp?v=1');"` : ''}><svg viewBox="0 0 100 133">
      <path d="${chemin}" fill="none" stroke="#6a4a2a" stroke-width="1.6" stroke-dasharray="2.4 1.6" stroke-linecap="round"/>
      ${P.map(([x, y], k) => `<g><circle cx="${x}" cy="${y}" r="${k <= ici ? 4.6 : 4}" fill="${k < ici ? '#7dbf6a' : k === ici ? '#f3c96b' : '#f3e6c8'}" stroke="#3a2a14" stroke-width=".6"/><text x="${x}" y="${y + 1.5}" font-size="4" text-anchor="middle">${ICO[E[k].t]}</text></g>`).join('')}
      <g class="pion" id="pion" style="transform:translate(${px}px, ${py - 8}px)"><circle r="4.2" fill="#2a1a10" stroke="#f3c96b" stroke-width="1"/><text y="1.6" font-size="4.6" text-anchor="middle">🛡</text></g>
    </svg></div>
    ${pvGroupe()}
    <div class="etape-t">${txt}</div>
    <div class="bas-s">${boutons}</div></div>`;
}
// le pion avance jusqu'à l'étape suivante (on le voit marcher), puis l'étape se joue
function avance() {
  const sc = sceneAV(), n = sc.etapes.length; if (AV.etape >= n - 1) return;
  const de = posEtape(Math.max(0, AV.etape), n), vers = posEtape(AV.etape + 1, n), p = $('pion');
  son('pas'); if (p) p.style.transform = `translate(${vers[0]}px, ${vers[1] - 8}px)`;
  setTimeout(() => {
    AV.etape++; AV.fait = false; AV.resultat = null;
    const e = sc.etapes[AV.etape];
    if (e.t === 'source') { AV.equipe.forEach((k, i) => { const m = pvMaxEq(k); AV.pv[i] = Math.min(m, (AV.pv[i] != null ? AV.pv[i] : m) + (e.soin || 5)); }); son('soin'); }
    if (e.t === 'embuscade') son('vague');
    sauveAV(); joueScene();
  }, p ? 1150 : 0);
}
function choixEvt(k) {
  const e = sceneAV().etapes[AV.etape], c = e.choix[k];
  if (c.sac) { AV.sacs[0] = (AV.sacs[0] || []).concat([c.sac]); AV.resultat = `${c.n.replace(/ \(.*\)$/, '')} : ${c.sac === 'potion' ? 'une potion' : 'un objet'} dans le sac de ${nomChoix(AV.equipe[0])}.`; }
  if (c.combat) { AV.combat = k; sauveAV(); return embuscade(); } // 26/11 : un choix qui coûte un combat (la crevasse du chapitre 1)
  AV.fait = true; son('pioche'); sauveAV(); joueScene();
}

// ------------------------------------------------------------------ l'embuscade et le donjon : l'écran des Chroniques
function prepareHeros() {
  S.heros.forEach((h, i) => { if (AV.pv[i] != null) h.pv = Math.max(1, Math.min(h.pvmax, AV.pv[i])); if (AV.sacs[i]) h.sac = AV.sacs[i].slice(); });
  S.aventure = AV.id; pointDePassage(); actif = 0; sel = null; centrer = true;
}
function embuscade() {
  const e0 = sceneAV().etapes[AV.etape], e = AV.combat != null && e0.choix ? Object.assign({ n:e0.n }, e0.choix[AV.combat].combat) : e0, eq = AV.equipe.map(versMoteur).filter(Boolean);
  S = K.nouvelle(eq, 'av-' + AV.debut + '-' + AV.scene + '-' + AV.etape, 'arene', { monstres:e.monstres, obstacles:e.obstacles });
  S.textes = { titre:'⚔ ' + e.n, duree:'', ouverture:e.txt, entree:() => '« Tous ensemble ! Abattez-les tous, et on reprend la route. »',
    but:'<b>Embuscade !</b> Abattez tous les monstres pour reprendre la route.', porter:'Abattez tous les monstres.', gagne:['⚔ L’embuscade est repoussée !', '« Bien joué. On souffle un peu, et on repart. Personne n’a vu mon poil se hérisser, hein ? »'] };
  if (AVENTURES[AV.id].froid) S.froid = AVENTURES[AV.id].froid; // 26/11 : le froid de la saison aussi dans les embuscades
  prepareHeros(); son('vague'); dessine(); dialogue(S.textes.titre, [e.txt]);
}
function lanceDonjonAV(sc) {
  const eq = AV.equipe.map(versMoteur).filter(Boolean);
  S = K.nouvelle(eq, 'av-' + AV.debut + '-' + AV.scene, sc.scen);
  S.textes = sc.textes; prepareHeros(); son('portail'); dessine();
  dialogue(sc.textes.titre, [sc.textes.ouverture, sc.textes.entree()]);
}
// appelé par finPartie() de chroniques.html quand le combat (ou le donjon) d'une aventure se termine
function aventureFinCombat() {
  if (!AV) AV = lireAV(); if (!AV) { S.aventure = null; return finPartie(); }
  const gagne = S.fin === 'gagne';
  if (!gagne) {
    fenetre(`<h2>☠ Le groupe est tombé…</h2><div class="moust"><img src="ui/moustache.webp" alt=""><div class="lu">« Aïe. On se relève, on secoue la poussière, et on réessaie ? »</div></div>
      <button class="go" onclick="recommence()">↺ Recommencer ce combat</button><button class="sec" onclick="fenetre('');abandonneAventure()">Abandonner l’aventure</button>`, false);
    return;
  }
  S.heros.forEach((h, i) => { AV.pv[i] = Math.min(h.pvmax, Math.max(1, h.pv) + 3); AV.sacs[i] = (h.sac || []).slice(); });
  let butin = ''; if (typeof avGagne === 'function' && !S.butinFait) { S.butinFait = true; const or = (S.orAv || 0) + 10, g = avGagne(or, S.equipTrouve || 0); butin = `<p style="text-align:center">⚒ 🪙 +${or} or pour la Forge${g.length ? ` · ${g.map(p => `<b style="color:${EQ_RARE[p.r].c}">${EQ_CASES.find(c => c.k === p.slot).e} ${p.nom}</b>`).join(', ')}` : ''}</p>`; }
  try { localStorage.removeItem(CLE_PARTIE); } catch (e) {}
  son('victoire'); const sc = sceneAV(), T = S.textes;
  fenetre(`<h2>${T.gagne[0]}</h2><div class="moust"><img src="ui/moustache.webp" alt=""><div class="lu">${T.gagne[1]}</div></div>${butin}
    <button class="go" onclick="fenetre('');${sc.t === 'carte' ? 'AV.fait=true;AV.combat=null;sauveAV();joueScene()' : 'sceneSuivante()'}">${sc.t === 'carte' ? 'Reprendre la route ▶' : AVENTURES[AV.id].saison ? 'Sortir du cloître ▶' : 'Sortir de la tour ▶'}</button>`, false);
}
function finAventure() {
  const sc = sceneAV(); let niv = [];
  AV.equipe.forEach(k => { if (k.startsWith('av:') && typeof avGagneXP === 'function') { const g = avGagneXP(k.slice(3), sc.xp || 150, true); if (g) niv.push(nomChoix(k)); } });
  if (typeof gagneXP === 'function') gagneXP(sc.xp || 150, 'Aventure des Chroniques');
  if (AVENTURES[AV.id].saison && typeof guildeEvt === 'function') guildeEvt('chapitre_saison', 1, { sansXP:true }); // 26/11 : la quête de saison « finis un chapitre »
  const o = typeof butinArmurerie === 'function' ? butinArmurerie(3, Date.now()) : null;
  const gEq = typeof avGagne === 'function' ? avGagne(60, 1, true) : [];
  try { const D = JSON.parse(localStorage.getItem(CLE) || '{}'); D.aventures = D.aventures || {}; D.aventures[AV.id] = (D.aventures[AV.id] || 0) + 1; localStorage.setItem(CLE, JSON.stringify(D)); } catch (e) {}
  AV = null; sauveAV();
  fenetre(`<h2>🏆 Aventure terminée !</h2><p style="text-align:center">+${sc.xp || 150} XP${o ? ` · 🎒 <b>${o}</b> rejoint l’armurerie` : ''}${gEq.length ? `<br>⚒ Pour la Forge : 🪙 +60 or · <b style="color:${EQ_RARE[gEq[0].r].c}">${EQ_CASES.find(c => c.k === gEq[0].slot).e} ${gEq[0].nom}</b>` : ''}${niv.length ? `<br>⬆ Niveau gagné : ${niv.join(', ')}` : ''}</p><button class="go" onclick="fenetre('');accueil()">Retour à la Guilde</button>`, false);
}
// la liste des aventures sur l'accueil des Chroniques
function aventuresHTML() {
  const g = lireAV(); let D = {}; try { D = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) {}
  return `<h3 style="color:var(--or);margin:4cqw 0 1.5cqw">📖 Les Aventures <small style="color:var(--doux);font-weight:normal">(taverne, chemin, embuscades, donjon)</small></h3>
    ${g ? `<button class="gros" style="border-color:var(--ok);color:var(--ok);background:#14322a" onclick="reprendAventure()">▶ Reprendre : ${AVENTURES[g.id].titre}<small>${g.equipe.map(nomChoix).join(', ')} · scène ${g.scene + 1}/${AVENTURES[g.id].scenes.length}</small></button>
      <button onclick="abandonneAventure()" style="display:block;margin:0 auto;background:none;border:0;color:var(--doux);font-size:3cqw;text-decoration:underline">✕ abandonner cette aventure</button>` : ''}
    ${Object.entries(AVENTURES).filter(([k, a]) => avOuverte(a) || (a.saison && typeof saisonProchaine === 'function' && saisonProchaine() && saisonProchaine().id === a.saison)).map(([k, a]) => !avOuverte(a) ? `<button class="gros" disabled style="background:#16213a;border-color:#9fdcff;color:#cfeeff">${a.titre}<small>❄ Saison 1 de l’Almanach : ouvre le ${a.ouvre ? new Date(a.ouvre + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) : '1er décembre'}</small></button>` : `<button class="gros" style="${a.saison ? 'background:#16213a;border-color:#9fdcff;color:#cfeeff' : 'background:#2a1f10;border-color:#ffb070;color:#ffd9a8'}" ${choisis.length ? '' : 'disabled'} onclick="lanceAventure('${k}')">${a.titre}<small>${a.resume} · ${a.duree}${(D.aventures || {})[k] ? ` · ✓ ${D.aventures[k]}` : ''}${choisis.length ? '' : ' · choisis tes héros plus bas'}</small></button>`).join('')}`;
}

// la page d'accueil a été dessinée avant ce fichier : on la redessine pour montrer les aventures
if (typeof S !== 'undefined' && !S && typeof accueil === 'function') accueil();

// =============================================================================================== 27/11 : L'ÉPILOGUE DE LA SAISON 1 (validé le 26/11)
// « Le chant des trois cloches » : 3 pages illustrées ; à la 2e, LA FORGE DES RUNES à jouer (3 dés à lancer, un par rune, sans échec possible) ;
// le titre « Briseur de l'Hiver » ; sur la dernière page, un ÉCLAT DE GLACE caché : 3 touchers = Zéphine dans son laboratoire + succès secret.
function briseurHiver() { try { const d = JSON.parse(localStorage.getItem('guilde-saison1') || '{}'); if (!d.briseur) { d.briseur = Date.now(); localStorage.setItem('guilde-saison1', JSON.stringify(d)); } } catch (e) {} }
const EPI_S1 = [
  { img:'decor/scene-monastere.webp', titre:'Le chant des trois cloches', texte:'Le cœur de glace se brise avec un bruit de rivière qui dégèle. Le Roi de l’Hiver tombe en neige, et la neige ne remonte plus. Dehors, d’un coup, le blizzard s’arrête. Pour la première fois depuis des semaines, on entend… le silence. Puis un oiseau.' },
  { img:'decor/scene-monastere.webp', chaud:true, titre:'La forge des Veilleurs', texte:'Au sommet du monastère, Bran et Maëlle rallument la vieille forge des Veilleurs. Trois nouvelles runes de braise, forgées à deux : celles-là tiendront bien plus de dix ans. Lance un dé pour chaque rune.', forge:true },
  { img:'decor/scene-fin-hiver.webp', titre:'L’aube', texte:'À l’aube, les trois cloches sonnent ensemble, et la vallée entière sort sur le pas des portes. Frère Aubin rouvre les grandes portes du monastère : « Il y aura de nouveau des Veilleurs. Il le faut. » Au village, Bran pose sur les épaules de Maëlle son vieux manteau de fourrure : « Il est à toi. Il a assez attendu. » (le costume d’hiver de Maëlle, au palier 30 de l’Almanach). Et dans la foule, Gorm porte son grand cor à ses lèvres : « Et maintenant… LE GRAND CARNAVAL ! »', fin:true },
];
let EPI = null;
function epilogueS1(fini) {
  briseurHiver(); EPI = { p:0, runes:[], eclat:0, fini:fini || null };
  let el = document.getElementById('epi'); if (!el) { el = document.createElement('div'); el.id = 'epi'; document.body.appendChild(el); }
  if (!document.getElementById('epi-style')) { const st = document.createElement('style'); st.id = 'epi-style'; st.textContent = `
    #epi { position:fixed; inset:0; z-index:2147483000; background:#07091a; color:#f4ead2; overflow:hidden; display:flex; flex-direction:column; }
    #epi .im { flex:0 0 38%; background-size:cover; background-position:center; position:relative; }
    #epi .im::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg, transparent 55%, #07091a); }
    #epi .tx { flex:1; padding:3vw 5vw; overflow:auto; font-size:4vw; line-height:1.45; } #epi h2 { color:#f3c96b; margin:.2em 0 .4em; font-size:6vw; text-align:center; }
    #epi .bas { padding:3vw 5vw 6vw; display:flex; gap:3vw; } #epi .bas button { flex:1; padding:3.4vw; font-size:4.2vw; border-radius:3vw; border:0; background:#f3c96b; color:#2a1a08; font-weight:bold; }
    #epi .runes { display:flex; justify-content:center; gap:4vw; margin:3vw 0; } #epi .rune { width:20vw; text-align:center; font-size:3.2vw; color:#ffcf9a; }
    #epi .rune .de { width:18vw; height:18vw; border-radius:3vw; background:#1a1430 center/cover; box-shadow:0 0 0 2px #ffb07066; margin:0 auto 1.5vw; transition:box-shadow .3s; }
    #epi .rune.ok .de { box-shadow:0 0 18px #ff9a3a, 0 0 0 2px #ffb070; }
    #epi .lancer { display:block; margin:0 auto; padding:2.6vw 6vw; border-radius:3vw; border:0; background:#ff8a2a; color:#fff; font-weight:bold; font-size:4vw; }
    #epi .titre-g { text-align:center; margin:3vw 0 0; padding:2.4vw; border:1px solid #9fdcff66; border-radius:3vw; background:#0f1a30; color:#cfeeff; }
    #epi .eclat { position:absolute; right:4vw; bottom:5vw; width:4.2vw; height:4.2vw; transform:rotate(45deg); background:linear-gradient(135deg, #fff, #9fdcff); box-shadow:0 0 8px #9fdcff; opacity:.75; animation:epiEc 2.4s infinite; cursor:pointer; }
    @keyframes epiEc { 0%, 100% { opacity:.35; } 50% { opacity:.9; } }
    #epi .zeph { position:absolute; inset:0; background:#0b0716f2; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6vw; text-align:center; }
    #epi .zeph img { width:34vw; height:34vw; border-radius:50%; object-fit:cover; border:3px solid #ff4040; box-shadow:0 0 30px #9fdcff; }`; document.head.appendChild(st); }
  epiDessine();
}
function epiDessine() {
  const el = document.getElementById('epi'), P = EPI_S1[EPI.p], n = EPI_S1.length;
  const forge = P.forge ? `<div class="runes">${[0, 1, 2].map(i => { const v = EPI.runes[i]; return `<div class="rune ${v ? 'ok' : ''}"><div class="de" id="epi-de${i}" style="background-image:url('faces-maelle/face-${v || 1}.webp')"></div>${v ? ['La rune de la première cloche', 'La rune de la deuxième', 'La rune de la troisième'][i] : '…'}</div>`; }).join('')}</div>
    ${EPI.runes.length < 3 ? `<button class="lancer" onclick="epiLance()">🎲 ${EPI.runes.length === 2 ? 'Le dernier coup, Maëlle' : 'Lancer le dé'} (rune ${EPI.runes.length + 1}/3)</button>` : `<p style="text-align:center;color:#ffcf9a">Bran a posé son marteau pour le dernier coup : « Le rite, c’est toi maintenant. » Maëlle frappe. Les trois runes brillent comme des braises.</p>`}` : '';
  el.innerHTML = `<div class="im" style="background-image:url('${P.img}?v=1')${P.chaud ? ';filter:sepia(.55) saturate(1.6) hue-rotate(-15deg) brightness(.95)' : ''}"></div><div class="tx"><h2>${P.titre}</h2><p>${P.texte}</p>${forge}
    ${P.fin ? `<div class="titre-g">❄ Titre gagné : <b>« Briseur de l’Hiver »</b> (Mon profil)</div><p style="text-align:center;color:#f3c96b;margin-top:3vw">🎭 La Saison 2, <b>Le Grand Carnaval</b>, la saison de Gorm, commence en février.</p>` : ''}</div>
    <div class="bas">${EPI.p > 0 ? '<button style="background:#2a2448;color:#f4ead2" onclick="EPI.p--;epiDessine()">‹</button>' : ''}<button ${P.forge && EPI.runes.length < 3 ? 'disabled style="opacity:.45"' : ''} onclick="${EPI.p < n - 1 ? 'EPI.p++;epiDessine()' : 'epiFin()'}">${EPI.p < n - 1 ? 'Continuer ▶' : 'Terminer'}</button></div>
    ${P.fin ? '<div class="eclat" onclick="epiEclat()" aria-label=""></div>' : ''}`;
  if (typeof son === 'function') try { son(P.fin ? 'victoire' : 'portail'); } catch (e) {}
}
function epiLance() {
  if (EPI.lance) return; EPI.lance = true; const i = EPI.runes.length, de = document.getElementById('epi-de' + i); let k = 0;
  if (typeof son === 'function') try { son('relance'); } catch (e) {}
  const t = setInterval(() => { k++; const v = 1 + Math.floor(Math.random() * 6); if (de) de.style.backgroundImage = `url('faces-maelle/face-${v}.webp')`;
    if (k >= 12) { clearInterval(t); EPI.runes.push(v); EPI.lance = false; if (typeof son === 'function') try { son('rune'); } catch (e) {} epiDessine(); } }, 70);
}
function epiEclat() {
  EPI.eclat++; if (EPI.eclat < 3) return;
  const premiere = !localStorage.getItem('guilde-eclat-zephine'); localStorage.setItem('guilde-eclat-zephine', String(Date.now()));
  const z = document.createElement('div'); z.className = 'zeph';
  z.innerHTML = `<img src="portraits/zephine.webp?v=1" alt=""><p style="font-size:4vw;line-height:1.45;margin:5vw 0">Bien plus tard, la nuit, dans un laboratoire plein de fioles. Zéphine est seule, penchée sur un petit éclat de glace posé sur sa table. Il ne fond pas. Il palpite, doucement, comme un cœur.</p><p style="font-size:5vw;color:#9fdcff"><i>« Intéressant… très intéressant. »</i></p>${premiere ? '<p style="color:#f3c96b">✨ Succès secret : « L’éclat qui ne fondait pas »</p>' : ''}<button class="lancer" onclick="this.parentElement.remove()">Fermer</button>`;
  document.getElementById('epi').appendChild(z); if (typeof son === 'function') try { son('magie'); } catch (e) {}
}
function epiFin() { const el = document.getElementById('epi'); if (el) el.remove(); const f = EPI && EPI.fini; EPI = null; if (f) f(); }
