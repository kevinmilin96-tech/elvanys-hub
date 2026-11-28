// =============================================================================================== L'ATELIER DES CARTES, ÉTAPE C : LES PIÈCES SPÉCIALES ET LE BUT (28/11)
// Décision de l'utilisateur (section 15) : une BIBLIOTHÈQUE de « pièces spéciales » tirées du code des scénarios écrits à la main (rien n'est
// reprogrammé : chaque pièce pose ce que le moteur pose déjà) ; on la pose sur une case avec des réglages simples ; les RÈGLES d'un scénario
// existant donnent le boss et le but ; l'histoire d'ouverture et de fin ; la vérification avant de jouer ; « ▶ Jouer cette carte » (essai).
'use strict';
let PIECE_T = null;
const NOMS_B = { rouagelin:'Rouagelin', coucou:'Coucou mécanique', page:'Page volante', archiviste:'Archiviste (élite)', gardien:'Gardien (élite)', colosse:'Colosse (élite)', gobelin:'Gobelin', chefgobelin:'Chef gobelin (porte la Clé de basalte)', loup:'Loup des cendres',
  salamandre:'Salamandre', scarabee:'Scarabée de feu', elementaire:'Élémentaire de feu (élite)', reinesal:'Salamandre reine (gardienne)', chaman:'Chaman des cendres (gardien)', golemmagma:'Golem de magma (gardien)', osclaque:'Squelette', spectregivre:'Spectre de givre', loupblanc:'Loup des neiges', goule:'Goule', mimique:'Mimique' };
const nomB = b => NOMS_B[b] || b;
function panneauC() {
  const R = CF.REGLES[CARTE.regles] || CF.REGLES.vaincre, T = CARTE.textes || (CARTE.textes = {});
  const pieces = Object.entries(CF.PIECES).map(([t, P]) => { const ok = !P.regles || P.regles.includes(CARTE.regles); return `<button class="${PIECE_T === t ? 'on' : ''} ${ok ? '' : 'gris'}" title="${esc(P.d)}${ok ? '' : ' (n’agit qu’avec les règles : ' + P.regles.map(r => CF.REGLES[r].n).join(', ') + ')'}" onclick="PIECE_T=PIECE_T==='${t}'?null:'${t}';panneauC()">${P.e} ${esc(P.n)}</button>`; }).join('');
  let h = `<div class="panneau"><h2>Étape C · Pièces et but</h2>${CARTE.sorte !== 'peinte' && CARTE.etages.length > 1 ? `<div class="etg">${CARTE.etages.map(e => `<button class="${e.id === ETAGE ? 'on' : ''}" onclick="ETAGE='${e.id}';SEL_CASE=null;panneauC();cadre()">${esc(e.nom)}</button>`).join('')}</div>` : ''}
    <label>Les règles (le boss et le but)</label><select onchange="CARTE.regles=this.value;carteChange();panneauC();rendPlan()">${Object.entries(CF.REGLES).map(([k, r]) => `<option value="${k}" ${CARTE.regles === k ? 'selected' : ''}>${esc(r.n)}</option>`).join('')}</select>
    <p class="aide">${esc(R.d)}</p>
    <label>La bibliothèque des pièces</label><div class="pal">${pieces}</div>
    <p class="aide">${PIECE_T ? `Touche une case du plan pour poser : <b>${esc(CF.PIECES[PIECE_T].n)}</b>. ${esc(CF.PIECES[PIECE_T].d)}` : 'Choisis une pièce, puis touche le plan. Sans pièce choisie : touche une pièce, un meuble ou une porte pour la régler.'}</p></div>
    <div class="panneau" id="reglageC">${reglageHTML()}</div>
    <div class="panneau"><h2>📖 L’histoire</h2><label>Le récit d’ouverture (lu au début)</label><textarea rows="3" style="width:100%" onchange="CARTE.textes.ouverture=this.value;carteChange()" placeholder="« Moustache : … »">${esc(T.ouverture || '')}</textarea>
      <label>Le but (dans 📋 les quêtes)</label><textarea rows="2" style="width:100%" onchange="CARTE.textes.but=this.value;carteChange()">${esc(T.but || '')}</textarea>
      <label>Le texte de la victoire</label><textarea rows="2" style="width:100%" onchange="CARTE.textes.gagne=this.value;carteChange()">${esc(T.gagne || '')}</textarea>
      <label>Le texte de la défaite</label><textarea rows="2" style="width:100%" onchange="CARTE.textes.perdu=this.value;carteChange()">${esc(T.perdu || '')}</textarea>
      <label>Le sablier (grains au départ ; vide = celui des règles)</label><input type="number" min="5" max="99" value="${CARTE.sablier || ''}" style="width:90px" onchange="CARTE.sablier=+this.value||null;carteChange()"></div>
    <div class="panneau"><h2>▶ Jouer</h2><label>Les héros de l’essai</label><select id="hEssai">${[['maelle', 'Maëlle seule'], ['maelle,gorm', 'Maëlle et Gorm'], ['maelle,pip,gorm', 'Maëlle, Pip et Gorm'], ['maelle,pip,gorm,oria', 'Les quatre (Maëlle, Pip, Gorm, Oria)']].map(([v, n]) => `<option value="${v}" ${v === 'maelle,gorm' ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <div class="ligne" style="margin-top:8px"><button class="or" onclick="jouerC()">▶ Jouer cette carte</button><button onclick="envoiAuto()">📤 Enregistrer sur le serveur</button></div>
      <p class="aide">L’essai ne sauvegarde rien ; « Quitter » ramène ici. Pour la vraie partie : Les Chroniques → « Une partie » ou une salle en ligne → 🗺 Mes cartes.</p></div>`;
  $p('panneauBC').innerHTML = h; }
// ---------------------------------------------------------------- ce qu'il y a sur une case (étage, x, y) : pièces, meuble, porte
const clePiece = (e, x, y) => CF.P_(CARTE.sorte === 'peinte' ? 'e1' : e, x, y);
const piecesEn = (e, x, y) => Object.keys(CARTE.pieces || {}).filter(k => k === clePiece(e, x, y) || k.startsWith(clePiece(e, x, y) + '#'));
function meubleEn(x, y) { if (CARTE.sorte === 'peinte') { const v = (CARTE.peinte.cases || {})[x + ',' + y] || ''; return v.startsWith('meuble') ? { t:v.split(':')[1] || 'coffre', nom:v.split(':')[2] } : null; }
  const r = roomEn(x, y); if (!r) return null; const v = (r.cases || {})[(x - r.x) + ',' + (y - r.y)] || ''; return v.startsWith('meuble') ? { t:v.split(':')[1] || 'coffre', nom:v.split(':')[2], salle:r } : null; }
function porteEn(x, y) { if (CARTE.sorte === 'peinte') { const v = (CARTE.peinte.cases || {})[x + ',' + y] || ''; return v.startsWith('porte'); }
  const r = roomEn(x, y); if (!r) return false; const v = (r.cases || {})[(x - r.x) + ',' + (y - r.y)] || ''; return v.startsWith('porte'); }
function debutC() { geste.t = 'pan'; }
function finC() { const g = geste; if (!g || g.bouge) return; const cs = g.cs; if (!dans(cs.x, cs.y)) return;
  if (PIECE_T) { posePiece(PIECE_T, cs.x, cs.y); return; }
  SEL_CASE = { e:ETAGE, x:cs.x, y:cs.y }; $p('reglageC').innerHTML = reglageHTML(); rendPlan(); }
function posePiece(t, x, y) {
  const P = CF.PIECES[t]; let k = clePiece(ETAGE, x, y);
  const occupe = piecesEn(ETAGE, x, y).filter(q => CARTE.pieces[q].t !== 'meuble');
  if (occupe.length && !['lave', 'lave2', 'bosspos'].includes(t) && !occupe.every(q => ['lave', 'lave2', 'bosspos'].includes(CARTE.pieces[q].t))) { msgB('Il y a déjà une pièce sur cette case : touche-la (sans pièce choisie) pour la régler ou la retirer.'); return; }
  let i = 2; while (CARTE.pieces[k]) k = clePiece(ETAGE, x, y) + '#' + i++;
  const v = { t };
  if (t === 'depart') v.n = Object.values(CARTE.pieces).filter(q => q.t === 'depart').length + 1;
  if (t === 'monstre') { v.b = CARTE.regles === 'brulees' ? 'gobelin' : CARTE.regles === 'horloger' ? 'rouagelin' : CARTE.regles === 'cloitre' ? 'spectregivre' : CARTE.regles === 'labyrinthe' ? 'osclaque' : 'gobelin'; v.nmin = 1; v.ordre = Date.now(); }
  if (t === 'statue') { v.n = Object.values(CARTE.pieces).filter(q => q.t === 'statue').length + 1; v.veut = 0; }
  if (t === 'rune') v.n = Object.values(CARTE.pieces).filter(q => q.t === 'rune').length + 1;
  if (t === 'bosspos') v.n = Object.values(CARTE.pieces).filter(q => q.t === 'bosspos').length + 1;
  CARTE.pieces[k] = v; SEL_CASE = { e:ETAGE, x, y }; carteChange(); $p('reglageC').innerHTML = reglageHTML(); rendPlan(); }
// ---------------------------------------------------------------- les réglages de la case choisie
function reglageHTML() {
  if (!SEL_CASE || SEL_CASE.e !== ETAGE) return '<h2>Réglages</h2><p class="aide">Touche une case du plan.</p>';
  const { x, y } = SEL_CASE, L = piecesEn(ETAGE, x, y), M = meubleEn(x, y), Po = porteEn(x, y); let h = `<h2>La case (${x}, ${y})</h2>`;
  L.filter(k => CARTE.pieces[k].t !== 'meuble').forEach(k => { const q = CARTE.pieces[k], P = CF.PIECES[q.t] || {}; h += `<div style="border-top:1px solid #45457a;padding-top:6px;margin-top:6px"><b>${P.e || ''} ${esc(P.n || q.t)}</b>`;
    if (q.t === 'monstre') h += `<label>Le monstre</label><select onchange="regle('${k}','b',this.value)">${CF.MONSTRES_LISTE.map(b => `<option value="${b}" ${q.b === b ? 'selected' : ''}>${esc(nomB(b))}</option>`).join('')}</select>
      <label>Il apparaît à partir de</label><select onchange="regle('${k}','nmin',+this.value)">${[1, 2, 3, 4].map(n => `<option value="${n}" ${(q.nmin || 1) === n ? 'selected' : ''}>${n === 1 ? 'toujours (1 héros)' : n + ' héros'}</option>`).join('')}</select>`;
    if (q.t === 'depart') h += `<label>Pour le héros n°</label><select onchange="regle('${k}','n',+this.value)">${[1, 2, 3, 4].map(n => `<option ${q.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    if (q.t === 'statue') h += `<label>N° dans le tour des engrenages</label><select onchange="regle('${k}','n',+this.value)">${[1, 2, 3, 4].map(n => `<option ${q.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select><label>Elle doit regarder vers</label><select onchange="regle('${k}','veut',+this.value)">${['le haut', 'la droite', 'le bas', 'la gauche'].map((n, i) => `<option value="${i}" ${(q.veut || 0) === i ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    if (q.t === 'rune') h += `<label>N° de la rune</label><select onchange="regle('${k}','n',+this.value)">${[1, 2, 3, 4].map(n => `<option ${q.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    if (q.t === 'bosspos') h += `<label>Ordre (1 = d’abord ici)</label><select onchange="regle('${k}','n',+this.value)">${[1, 2, 3, 4, 5, 6].map(n => `<option ${q.n === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    h += `<div class="ligne" style="margin-top:6px"><button onclick="retirePiece('${k}')">🗑 Retirer</button></div></div>`; });
  if (M) { const k = L.find(q => CARTE.pieces[q].t === 'meuble') || clePiece(ETAGE, x, y), q = CARTE.pieces[k] && CARTE.pieces[k].t === 'meuble' ? CARTE.pieces[k] : { t:'meuble' };
    h += `<div style="border-top:1px solid #45457a;padding-top:6px;margin-top:6px"><b>📦 Le meuble peint (${esc(M.nom || M.t)})</b>
      <label>Son nom au toucher (comme sur le dessin)</label><input value="${esc(q.nom || M.nom || '')}" onchange="regleM('${k}','nom',this.value)">
      <label>Ce qu’il cache</label><select onchange="regleM('${k}','cache',this.value)">${Object.entries(CF.CONTENUS).map(([v, n]) => `<option value="${v}" ${(q.cache || 'hasard') === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <label>Verrouillé (il faut un dé de… pour le crocheter)</label><select onchange="regleM('${k}','verrou',+this.value)">${[0, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${(+q.verrou || 0) === n ? 'selected' : ''}>${n ? n + ' ou plus' : 'pas verrouillé'}</option>`).join('')}</select></div>`; }
  if (Po) { const k = clePiece(ETAGE, x, y), T = (CARTE.portesT || {})[k] || {};
    h += `<div style="border-top:1px solid #45457a;padding-top:6px;margin-top:6px"><b>🚪 La porte</b><label>Sorte</label><select onchange="reglePorte('${k}',this.value)">${Object.entries(CF.PORTES_T).map(([v, n]) => `<option value="${v}" ${(T.t || 'bois') === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`; }
  if (!L.length && !M && !Po) h += '<p class="aide">Rien ici. Choisis une pièce dans la bibliothèque pour la poser.</p>';
  return h; }
function regle(k, c, v) { if (!CARTE.pieces[k]) return; CARTE.pieces[k][c] = v; carteChange(); rendPlan(); }
function regleM(k, c, v) { const q = CARTE.pieces[k] || (CARTE.pieces[k] = { t:'meuble' }); if (v === '' || v === 'hasard' || (c === 'verrou' && !v)) delete q[c]; else q[c] = v; if (Object.keys(q).length === 1) delete CARTE.pieces[k]; carteChange(); rendPlan(); }
function reglePorte(k, v) { CARTE.portesT = CARTE.portesT || {}; if (v === 'bois') delete CARTE.portesT[k]; else CARTE.portesT[k] = Object.assign(CARTE.portesT[k] || {}, { t:v }); carteChange(); rendPlan(); }
function retirePiece(k) { delete CARTE.pieces[k]; carteChange(); $p('reglageC').innerHTML = reglageHTML(); rendPlan(); }
// ---------------------------------------------------------------- jouer : la vérification d'abord
async function jouerC() { const V = CF.verifie(CARTE);
  if (!V.ok) { fen(`<h2>⛔ Pas encore jouable</h2><p>${V.E.map(esc).join('<br>')}</p><div class="ligne"><button class="or" onclick="fen('')">Je corrige</button></div>`); return; }
  await CL.ecrire(CARTE); const h = ($p('hEssai') || {}).value || 'maelle,gorm';
  location.href = `chroniques.html?carte=${encodeURIComponent(CARTE.id)}&essai=1&heros=${encodeURIComponent(h)}`; }
