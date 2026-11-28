// =============================================================================================== L'ATELIER DES CARTES, ÉTAPE B : LE PLAN (28/11)
// Décisions de l'utilisateur (Chroniques-Conception-cartes.md, section 15) : un GRAND PLAN quadrillé (la même grille que le jeu) ; on y fait glisser
// les salles de « Mes salles » ; on peint les COULOIRS au pinceau ; une porte qui touche un couloir ou la porte d'une autre salle est reliée toute
// seule (vert : reliée, rouge : ne mène nulle part) ; plusieurs ÉTAGES (onglets), les ESCALIERS (2 cases) relient deux étages.
// Ou une GRANDE CARTE PEINTE d'un seul tenant (comme les Terres brûlées) : son image, sa grille, les cases marquées au pinceau, les zones nommées.
// Zoom et déplacement du plan au doigt (deux doigts pour zoomer) et à la souris (molette). Tout est gardé sur l'appareil, puis envoyé au serveur.
'use strict';
let CARTE = null, ETAPE = 'A', ETAGE = 'e1', OUTIL = 'deplacer', ZOOM = 1, PAN = [10, 10], SALLE_POSE = null, PEINT_P = 'mur', MEUBLE_P = 'coffre', SEL_ROOM = null, LIEN_A = null, CARTES_L = [];
const CASE = 32, IMGP = {}; // les images du plan (réf. → adresse)
const CL = CARTES_LOCAL, CF = CARTES;
const $p = id => document.getElementById(id);
// ------------------------------------------------------------------ les étapes
function etape(e) {
  ETAPE = e; document.querySelectorAll('#onglets button').forEach(b => b.classList.toggle('on', b.dataset.e === e));
  $p('etapeA').style.display = e === 'A' ? '' : 'none'; $p('etapeBC').style.display = e === 'A' ? 'none' : '';
  if (e === 'A') { tout(); return; }
  if (!CARTE) { panneauCartes(); return; }
  rafraichitSalles(); vueBC();
}
// ------------------------------------------------------------------ mes cartes : liste, création, recopies, enregistrement (appareil puis serveur)
let attenteEnvoi = null;
function carteChange() { if (!CARTE) return; CARTE.maj = Date.now(); CL.ecrire(CARTE).catch(() => {}); etatServeur('💾 Gardée sur cet appareil'); clearTimeout(attenteEnvoi); attenteEnvoi = setTimeout(envoiAuto, 8000); }
async function envoiAuto() { if (!CARTE || !CL.maCle()) { etatServeur(CL.maCle() ? '' : '💾 Sur cet appareil seulement (crée ta carte de joueur pour l’envoyer au serveur)'); return; }
  etatServeur('📤 Envoi au serveur…'); const r = await CL.envoyer(CARTE, (i, n) => etatServeur(`📤 Envoi des images ${i}/${n}…`)).catch(e => ({ ok:false, message:'Pas de réseau.' }));
  etatServeur(r.ok ? '☁ Enregistrée sur le serveur (tous tes appareils)' : '⚠ ' + r.message); }
function etatServeur(t) { const e = $p('etatSrv'); if (e) e.textContent = t || ''; }
async function chargeCartes() { CARTES_L = await CL.liste().catch(() => []); }
async function panneauCartes() {
  await chargeCartes();
  $p('etapeBC').innerHTML = `<div class="bc"><div><div class="panneau"><h2>🗺 Mes cartes</h2><div class="lst">${CARTES_L.length ? CARTES_L.map(c => `<button onclick="ouvreCarte('${esc(c.id)}')">${c.sorte === 'peinte' ? '🖼' : '🏰'} ${esc(c.titre)} <small style="color:var(--doux)">${c._sale ? '· à envoyer' : c._srv ? '· ☁' : ''}</small></button>`).join('') : '<p class="aide">Aucune carte encore.</p>'}</div>
    <div class="ligne" style="margin-top:8px"><button class="or" onclick="nouvelleCarteFen()">＋ Nouvelle carte</button></div></div>
    <div class="panneau"><h2>📚 Les scénarios recopiés</h2><p class="aide">Les Terres brûlées et l’Horloger, recopiés dans l’atelier : tu peux les ouvrir, les regarder, en faire ta propre version (le jeu garde l’original).</p>
    ${CL.RECOPIES.map(([f, n]) => `<button style="display:block;width:100%;margin:4px 0;text-align:left" onclick="ouvreRecopie('${f}')">📖 ${esc(n)}</button>`).join('')}</div></div>
    <div class="panneau"><h2>Comment ça marche</h2><ol class="etapes"><li><b>A · Mes salles</b> : une salle à la fois (taille, portes, meubles, image Gemini).</li><li><b>B · Le plan</b> : pose les salles sur le plan, peins les couloirs, ajoute des étages et des escaliers. Les portes reliées sont en vert, celles qui ne mènent nulle part en rouge.</li><li><b>C · Pièces et but</b> : départ, meubles, monstres, boss, autel… puis les règles, l’histoire, la vérification et <b>▶ Jouer cette carte</b>.</li></ol>
    <p class="aide">Ou une <b>grande carte peinte</b> d’un seul tenant (comme les Terres brûlées) : son image, puis les cases marquées au pinceau.</p>
    <p class="aide">La carte est gardée sur cet appareil et envoyée au serveur perso : tu la retrouves sur tes autres appareils, et tes amis la reçoivent quand tu la lances dans une salle en ligne.</p></div></div>`;
}
function nouvelleCarteFen() {
  fen(`<h2>＋ Nouvelle carte</h2><label>Titre</label><input id="ncT" value="Ma carte"><label>Sorte</label><select id="ncS"><option value="salles">🏰 Des salles reliées (plan quadrillé, étages)</option><option value="peinte">🖼 Une grande carte peinte d’un seul tenant</option></select>
    <label>Taille du plan en cases (largeur × hauteur, 8 à 60)</label><div class="ligne"><input id="ncW" type="number" min="8" max="60" value="24" style="width:80px"> × <input id="ncH" type="number" min="8" max="60" value="16" style="width:80px"></div>
    <div class="ligne" style="margin-top:14px"><button class="or" onclick="creeCarte()">Créer</button><button onclick="fen('')">Annuler</button></div>`);
}
async function creeCarte() {
  const t = $p('ncT').value.trim() || 'Ma carte', so = $p('ncS').value, w = Math.max(8, Math.min(60, +$p('ncW').value || 24)), h = Math.max(8, Math.min(60, +$p('ncH').value || 16)); fen('');
  const C = CF.nouvelleCarte(so, t); C.etages[0].w = w; C.etages[0].h = h; if (C.peinte) { C.peinte.w = w; C.peinte.h = h; }
  CARTE = C; ETAGE = 'e1'; OUTIL = so === 'peinte' ? 'p-mur' : 'deplacer'; carteChange(); etape('B'); }
async function ouvreCarte(id) { const C = await CL.lire(id); if (!C) return; CARTE = C; ETAGE = (C.etages[0] || {}).id || 'e1'; OUTIL = C.sorte === 'peinte' ? 'p-mur' : 'deplacer'; SEL_ROOM = null; history.replaceState(null, '', '?carte=' + encodeURIComponent(id)); etape(ETAPE === 'A' ? 'B' : ETAPE); }
async function ouvreRecopie(f) {
  let C = null; try { C = await (await fetch(f, { cache:'no-store' })).json(); } catch (e) {} if (!C) return;
  ouiNon(`Faire ta propre version de « ${esc(C.titre)} » ? (une copie dans « Mes cartes » ; le jeu garde l’original)`, async () => {
    C.id = 'c' + Date.now().toString(36); C.titre = C.titre.replace(' (recopie)', '') + ' (ma version)'; CARTE = C; ETAGE = C.etages[0].id; OUTIL = C.sorte === 'peinte' ? 'p-mur' : 'deplacer'; carteChange(); etape('B'); });
}
// les salles de la carte gardent une copie de celles de « Mes salles » : mises à jour quand la salle a changé dans l'étape A
function rafraichitSalles() { if (!CARTE || CARTE.sorte === 'peinte') return; let ch = false;
  (CARTE.salles || []).forEach(r => { const s = salles.find(z => z.id === r.ref); if (!s || (r.majRef || 0) >= (s.maj || 0)) return;
    Object.assign(r, { nom:s.nom, w:s.w, h:s.h, cases:JSON.parse(JSON.stringify(s.cases || {})), decor:s.decor, lumiere:s.lumiere, son:s.son, img:s.img ? 'img:' + s.id : null, majRef:s.maj || Date.now() }); ch = true; });
  if (ch) carteChange(); }
// ------------------------------------------------------------------ la vue des étapes B et C
const etageC = () => CARTE.etages.find(e => e.id === ETAGE) || CARTE.etages[0];
const dimsPlan = () => CARTE.sorte === 'peinte' ? [CARTE.peinte.w, CARTE.peinte.h] : [etageC().w, etageC().h];
function vueBC() {
  const peinte = CARTE.sorte === 'peinte';
  $p('etapeBC').innerHTML = `<div class="bc"><div>
    <div class="panneau"><h2>🗺 ${esc(CARTE.titre)}</h2><div class="ligne"><input value="${esc(CARTE.titre)}" style="flex:1" onchange="CARTE.titre=this.value;carteChange();"><button onclick="CARTE=null;history.replaceState(null,'',location.pathname);panneauCartes()">Mes cartes</button></div></div>
    <div id="panneauBC"></div></div>
    <div><div class="planvue" id="planvue"><div class="plan" id="plan"></div><div class="zoom"><button onclick="zoomPas(1.25)">＋</button><button onclick="zoomPas(.8)">－</button><button title="Tout voir" onclick="cadre()">⟲</button></div></div>
    <div class="msgsBC" id="msgsBC"></div></div></div>`;
  installePlan(); if (ETAPE === 'B') panneauB(); else panneauC(); cadre(); }
function cadre() { const V = $p('planvue'); if (!V || !CARTE) return; const [w, h] = dimsPlan(); ZOOM = Math.max(.2, Math.min(2.5, Math.min((V.clientWidth - 20) / (w * CASE), (V.clientHeight - 20) / (h * CASE)))); PAN = [(V.clientWidth - w * CASE * ZOOM) / 2, (V.clientHeight - h * CASE * ZOOM) / 2]; place(); rendPlan(); }
function place() { const P = $p('plan'); if (P) P.style.transform = `translate(${PAN[0]}px, ${PAN[1]}px) scale(${ZOOM})`; }
function zoomPas(f, cx, cy) { const V = $p('planvue'); if (!V) return; cx = cx == null ? V.clientWidth / 2 : cx; cy = cy == null ? V.clientHeight / 2 : cy; const z = Math.max(.15, Math.min(4, ZOOM * f)); PAN = [cx - (cx - PAN[0]) * z / ZOOM, cy - (cy - PAN[1]) * z / ZOOM]; ZOOM = z; place(); }
// ------------------------------------------------------------------ le dessin du plan (un étage)
const offEtage = id => { let y = 0; for (const e of CARTE.etages) { if (e.id === id) return y; y += e.h; } return 0; };
function imgRef(ref, quand) { if (!ref) return ''; ref = String(ref); if (!ref.startsWith('img:')) return ref; if (IMGP[ref] != null) return IMGP[ref];
  IMGP[ref] = ''; CL.image(ref, CARTE && CARTE.id).then(d => { IMGP[ref] = d || ''; if (d) rendPlan(); }); return ''; }
function rendPlan() {
  const P = $p('plan'); if (!P || !CARTE) return; const [W, H] = dimsPlan(), c = CASE, e = ETAGE, peinte = CARTE.sorte === 'peinte'; let h = '';
  P.style.width = W * c + 'px'; P.style.height = H * c + 'px'; P.style.setProperty('--c', c + 'px');
  const pos = (x, y) => `left:${x * c}px;top:${y * c}px`;
  if (peinte) { const u = imgRef(CARTE.peinte.img); if (u) h += `<div class="pimg" style="width:${W * c}px;height:${H * c}px;background-image:url('${u}')"></div>`;
    const op = ETAPE === 'C' ? .25 : .55;
    Object.entries(CARTE.peinte.cases || {}).forEach(([k, v]) => { const [x, y] = k.split(',').map(Number), t = v.split(':')[0]; if (t === 'sol') return; h += `<div class="pk ${t}" style="${pos(x, y)};opacity:${op}"></div>`; });
    (CARTE.zones || []).forEach(z => { const [a, b, x1, y1] = z.r; h += `<div class="pz" style="${pos(a, b)};width:${(x1 - a + 1) * c}px;height:${(y1 - b + 1) * c}px">${esc(z.nom)}</div>`; }); }
  else {
    (CARTE.salles || []).filter(r => r.etage === e && r.x != null).forEach(r => { const u = imgRef(r.img);
      h += `<div class="ps ${SEL_ROOM === r.id ? 'sel' : ''}" data-room="${esc(r.id)}" style="${pos(r.x, r.y)};width:${(r.w + 2) * c}px;height:${(r.h + 2) * c}px;${u ? `background-image:url('${u}')` : ''}">`;
      Object.entries(r.cases || {}).forEach(([k, v]) => { const [x, y] = k.split(',').map(Number), t = v.split(':')[0]; if (t === 'sol') return; h += `<div class="pk ${t}" style="${pos(x, y)};opacity:${u ? .35 : .8}"></div>`; });
      if (!u) for (let y = 0; y < r.h + 2; y++) for (let x = 0; x < r.w + 2; x++) if ((x === 0 || y === 0 || x === r.w + 1 || y === r.h + 1) && !(r.cases || {})[x + ',' + y]) h += `<div class="pk mur" style="${pos(x, y)}"></div>`;
      h += `<span class="nm">${esc(r.nom)}</span></div>`; });
    (CARTE.couloirs || []).filter(z => z.etage === e).forEach(z => z.cases.forEach(k => { const [x, y] = k.split(',').map(Number); h += `<div class="pc ${z.esc ? 'esc' : ''}" style="${pos(x, y)}" title="${esc(z.nom || '')}"></div>`; }));
    // les escaliers reliés : vers quel étage
    (CARTE.liens || []).forEach(([a, b]) => [[a, b], [b, a]].forEach(([u, v]) => { const U = CF.deP(u), V = CF.deP(v); if (U.e !== e) return; const n = (CARTE.etages.find(q => q.id === V.e) || {}).nom || '?'; h += `<span class="pl" style="${pos(U.x, U.y)};transform:translateY(-14px)">⇅ ${esc(n)}</span>`; }));
    if (LIEN_A) { const U = CF.deP(LIEN_A); if (U.e === e) h += `<div class="hl" style="${pos(U.x, U.y)}"></div>`; }
  }
  // les portes : reliées (vert) ou qui ne mènent nulle part (rouge)
  const off = peinte ? 0 : offEtage(e), Y1 = off + H;
  try { CF.etatPortes(CARTE).forEach(p => { if (p.y < off || p.y >= Y1) return; h += `<div class="pd ${p.ok ? '' : 'ko'}" style="${pos(p.x, p.y - off)}" title="${p.ok ? 'porte reliée' : 'cette porte ne mène nulle part'}"></div>`; }); } catch (err) {}
  // les pièces spéciales (étape C ; à peine visibles à l'étape B)
  Object.entries(CARTE.pieces || {}).forEach(([k, q]) => { const D = CF.deP(k); if ((peinte ? 'e1' : D.e) !== e || q.t === 'meuble') return; const T = CF.PIECES[q.t] || {}; h += `<div class="pp" style="${pos(D.x, D.y)};opacity:${ETAPE === 'C' ? 1 : .45}">${q.t === 'monstre' ? '👹' : T.e || '❔'}${q.t === 'monstre' && (q.nmin || 1) > 1 ? `<small>${q.nmin}+</small>` : q.t === 'depart' ? `<small>${q.n || ''}</small>` : ''}</div>`; });
  if (ETAPE === 'C') Object.entries(CARTE.pieces || {}).forEach(([k, q]) => { if (q.t !== 'meuble') return; const D = CF.deP(k); if ((peinte ? 'e1' : D.e) !== e) return; const ic = q.cache === 'quete' ? '⭐' : q.verrou ? '🔒' : q.cache && q.cache !== 'hasard' ? '•' : ''; if (ic) h += `<div class="pp" style="${pos(D.x, D.y)}"><small>${ic}</small></div>`; });
  if (SEL_CASE && SEL_CASE.e === e) h += `<div class="hl" style="${pos(SEL_CASE.x, SEL_CASE.y)}"></div>`;
  P.innerHTML = h; messagesBC(); }
let SEL_CASE = null;
function messagesBC() { const M = $p('msgsBC'); if (!M || !CARTE) return; let V; try { V = CF.verifie(CARTE); } catch (err) { M.innerHTML = `<div class="ko">⛔ ${esc(err.message)}</div>`; return; }
  const n = V.E.length, nA = V.A.length;
  M.innerHTML = (ETAPE === 'B' ? V.E.filter(t => !/départ|objet|autel|monstre|Posez|règles/.test(t)) : V.E).map(t => `<div class="ko">⛔ ${esc(t)}</div>`).join('') + V.A.map(t => `<div class="av">⚠ ${esc(t)}</div>`).join('')
    + (!n ? `<div class="ok">✅ La carte est jouable${nA ? ' (avec quelques remarques)' : ''}.</div>` : ETAPE === 'B' && !V.E.some(t => !/départ|objet|autel|monstre|Posez|règles/.test(t)) ? '<div class="ok">✅ Le plan tient debout. Passe à l’étape C pour le départ, les monstres et le but.</div>' : ''); }
// ------------------------------------------------------------------ toucher le plan : la case sous le doigt, le zoom à deux doigts, le déplacement
const doigts = new Map(); let geste = null;
function caseSous(ev) { const P = $p('plan').getBoundingClientRect(); return { x:Math.floor((ev.clientX - P.left) / (CASE * ZOOM)), y:Math.floor((ev.clientY - P.top) / (CASE * ZOOM)) }; }
function dans(x, y) { const [W, H] = dimsPlan(); return x >= 0 && y >= 0 && x < W && y < H; }
function installePlan() {
  const V = $p('planvue');
  V.addEventListener('wheel', ev => { ev.preventDefault(); const r = V.getBoundingClientRect(); zoomPas(ev.deltaY < 0 ? 1.12 : .89, ev.clientX - r.left, ev.clientY - r.top); }, { passive:false });
  V.addEventListener('pointerdown', ev => { if (ev.target.closest('.zoom')) return; V.setPointerCapture(ev.pointerId); doigts.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (doigts.size === 2) { const [a, b] = [...doigts.values()]; geste = { t:'pince', d:Math.hypot(a[0] - b[0], a[1] - b[1]), z:ZOOM, pan:PAN.slice(), m:[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; return; }
    const cs = caseSous(ev); geste = { t:'?', x0:ev.clientX, y0:ev.clientY, pan:PAN.slice(), cs, bouge:false };
    if (ETAPE === 'B') debutB(ev, cs); else debutC(ev, cs); });
  V.addEventListener('pointermove', ev => { if (!doigts.has(ev.pointerId)) return; doigts.set(ev.pointerId, [ev.clientX, ev.clientY]); if (!geste) return;
    if (geste.t === 'pince' && doigts.size === 2) { const [a, b] = [...doigts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = V.getBoundingClientRect(), z = Math.max(.15, Math.min(4, geste.z * d / geste.d));
      const cx = geste.m[0] - r.left, cy = geste.m[1] - r.top; PAN = [cx - (cx - geste.pan[0]) * z / geste.z, cy - (cy - geste.pan[1]) * z / geste.z]; ZOOM = z; place(); return; }
    if (Math.hypot(ev.clientX - geste.x0, ev.clientY - geste.y0) > 6) geste.bouge = true;
    if (geste.t === 'pan') { PAN = [geste.pan[0] + ev.clientX - geste.x0, geste.pan[1] + ev.clientY - geste.y0]; place(); return; }
    if (ETAPE === 'B') bougeB(ev, caseSous(ev)); });
  const fin = ev => { if (!doigts.has(ev.pointerId)) return; doigts.delete(ev.pointerId); if (geste && geste.t !== 'pince' && doigts.size === 0) { if (ETAPE === 'B') finB(ev); else finC(ev); } if (doigts.size === 0) geste = null; };
  V.addEventListener('pointerup', fin); V.addEventListener('pointercancel', fin);
}
// ------------------------------------------------------------------ ÉTAPE B : les outils
const OUTILS_S = [['deplacer', '✋ Déplacer', 'Glisse une salle pour la déplacer, ou le vide pour bouger le plan.'], ['couloir', '🧱 Couloir', 'Peins les couloirs au doigt (glisse).'], ['gomme', '🧽 Gomme', 'Efface un couloir ; touche une salle pour la retirer du plan.'],
  ['escalier', '🪜 Escalier', 'Touche une case : un escalier de 2 cases (vers la droite, sinon vers le bas).'], ['relier', '🔗 Relier', 'Touche un escalier, change d’étage, touche l’autre escalier.']];
const OUTILS_P = [['deplacer', '✋ Déplacer', 'Bouge le plan.'], ['p-mur', '🧱 Mur', 'Une case qu’on ne traverse pas (mur peint).'], ['p-sol', '⬜ Sol', 'Efface : la case redevient du sol.'], ['p-obstacle', '🪨 Obstacle', 'Pilier, rocher, feu : on ne passe pas.'],
  ['p-porte', '🚪 Porte', 'Une case de porte (dans un mur).'], ['p-meuble', '📦 Meuble', 'Un meuble peint qu’on fouille.'], ['zone', '🏷 Zone', 'Glisse un rectangle : une salle nommée (son nom à l’écran, les embuscades des Terres brûlées).']];
function panneauB() {
  const peinte = CARTE.sorte === 'peinte', O = peinte ? OUTILS_P : OUTILS_S;
  let h = `<div class="panneau"><h2>Étape B · ${peinte ? 'La grande carte' : 'Le plan'}</h2>`;
  if (!peinte) h += `<label>Étages</label><div class="etg">${CARTE.etages.map(e => `<button class="${e.id === ETAGE ? 'on' : ''}" onclick="ETAGE='${e.id}';SEL_ROOM=null;panneauB();cadre()">${esc(e.nom)}</button>`).join('')}<button onclick="nouvelEtage()">＋</button></div>
    <div class="ligne"><input value="${esc(etageC().nom)}" style="flex:1" onchange="etageC().nom=this.value;carteChange();panneauB()"> <input type="number" min="6" max="60" value="${etageC().w}" style="width:62px" title="largeur" onchange="tailleEtage(+this.value, etageC().h)">×<input type="number" min="6" max="60" value="${etageC().h}" style="width:62px" title="hauteur" onchange="tailleEtage(etageC().w, +this.value)"></div>
    ${CARTE.etages.length > 1 ? `<div class="ligne" style="margin-top:6px"><button onclick="bougeEtage(-1)">⬆ Monter</button><button onclick="bougeEtage(1)">⬇ Descendre</button><button onclick="supprimeEtage()">🗑 Supprimer l’étage</button></div>` : ''}`;
  else h += `<div class="ligne"><button class="or" onclick="$p('fCarte').click()">🖼 Poser l’image de la carte</button><input type="file" id="fCarte" accept="image/*" style="display:none" onchange="imageCarte(this)"></div>
    <label>Grille (cases) : largeur × hauteur</label><div class="ligne"><input type="number" min="8" max="80" value="${CARTE.peinte.w}" style="width:70px" onchange="tailleCarte(+this.value, CARTE.peinte.h)"> × <input type="number" min="8" max="80" value="${CARTE.peinte.h}" style="width:70px" onchange="tailleCarte(CARTE.peinte.w, +this.value)"></div>
    <p class="aide">Cale la grille sur l’image : une case du jeu = une case peinte. Puis marque les murs, obstacles, portes et meubles.</p>`;
  h += `<label>Outils</label><div class="outils">${O.map(([v, n, d]) => `<button class="${OUTIL === v ? 'on' : ''}" title="${esc(d)}" onclick="OUTIL='${v}';LIEN_A=null;panneauB()">${n}</button>`).join('')}</div><p class="aide">${esc((O.find(o => o[0] === OUTIL) || [, , ''])[2])}</p>`;
  if (OUTIL === 'p-meuble') h += `<label>Sorte de meuble</label><select onchange="MEUBLE_P=this.value">${Object.keys(MEUBLES).map(v => `<option ${MEUBLE_P === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
  h += `</div>`;
  if (!peinte) { h += `<div class="panneau"><h2>Mes salles</h2><p class="aide">Touche une salle, puis touche le plan : elle s’y pose (son coin en haut à gauche). Glisse-la ensuite avec ✋.</p><div class="pal">${salles.map(s => `<button class="${SALLE_POSE === s.id ? 'on' : ''}" onclick="SALLE_POSE=SALLE_POSE==='${s.id}'?null:'${s.id}';OUTIL='poser';panneauB()">${s.img ? '🖼' : '▫'} ${esc(s.nom)} <small>${s.w}×${s.h}</small></button>`).join('') || '<p class="aide">Crée d’abord une salle (étape A).</p>'}</div></div>`;
    const R = SEL_ROOM && CARTE.salles.find(r => r.id === SEL_ROOM);
    if (R) h += `<div class="panneau"><h2>${esc(R.nom)}</h2><label>Ce qu’on lit en y entrant (facultatif)</label><textarea rows="3" style="width:100%" onchange="selRoom().lu=this.value;carteChange()">${esc(R.lu || '')}</textarea><div class="ligne" style="margin-top:6px"><button onclick="retireRoom('${esc(R.id)}')">Retirer du plan</button></div></div>`;
    h += `<div class="panneau"><h2>Le prompt du couloir</h2><p class="aide">Un sol qui se répète, fait à partir d’une de tes salles (joins son image à Gemini).</p><textarea class="prompt" readonly id="pCou">${esc(promptCouloir())}</textarea><button onclick="copie('pCou')">📋 Copier</button></div>`; }
  $p('panneauBC').innerHTML = h; }
const selRoom = () => CARTE.salles.find(r => r.id === SEL_ROOM);
function promptCouloir() { const s = salles.find(z => z.decor) || {}; return `Paint ONE square tile of dungeon corridor FLOOR seen STRICTLY FROM DIRECTLY ABOVE, like a printed battle map, in the same warm hand-painted fantasy board game style as the attached room image${s.decor ? ` (${s.decor})` : ''}. The tile is SEAMLESS: its left edge matches its right edge and its top edge matches its bottom edge, so it can repeat in every direction. Even, flat lighting with NO gradient and NO vignette (a gradient shows as stripes when the tile repeats). Only floor flagstones: NO wall, NO door, NO opening, NO furniture, NO object. No text, no letters, no numbers, no symbols, no characters, no monsters.`; }
function copie(id) { const t = $p(id); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } }
// ---------------------------------------------------------------- les étages
function nouvelEtage() { const n = CARTE.etages.length + 1, id = 'e' + Date.now().toString(36); CARTE.etages.push({ id, nom:`Étage ${n}`, w:etageC().w, h:etageC().h }); ETAGE = id; carteChange(); panneauB(); cadre(); }
function tailleEtage(w, h) { const E = etageC(); E.w = Math.max(6, Math.min(60, w || E.w)); E.h = Math.max(6, Math.min(60, h || E.h)); carteChange(); panneauB(); cadre(); }
function bougeEtage(d) { const i = CARTE.etages.indexOf(etageC()), j = i + d; if (j < 0 || j >= CARTE.etages.length) return; const L = CARTE.etages; [L[i], L[j]] = [L[j], L[i]]; carteChange(); panneauB(); }
function supprimeEtage() { const E = etageC(); ouiNon(`Supprimer l’étage « ${esc(E.nom)} » et tout ce qu’il contient ?`, () => {
  CARTE.etages = CARTE.etages.filter(e => e !== E); CARTE.salles = CARTE.salles.filter(r => r.etage !== E.id); CARTE.couloirs = CARTE.couloirs.filter(z => z.etage !== E.id);
  CARTE.liens = CARTE.liens.filter(([a, b]) => CF.deP(a).e !== E.id && CF.deP(b).e !== E.id); Object.keys(CARTE.pieces).forEach(k => { if (CF.deP(k).e === E.id) delete CARTE.pieces[k]; });
  ETAGE = CARTE.etages[0].id; carteChange(); panneauB(); cadre(); }); }
// ---------------------------------------------------------------- la grande carte peinte
function tailleCarte(w, h) { const P = CARTE.peinte; P.w = Math.max(8, Math.min(80, w || P.w)); P.h = Math.max(8, Math.min(80, h || P.h)); CARTE.etages[0].w = P.w; CARTE.etages[0].h = P.h; carteChange(); panneauB(); cadre(); }
function imageCarte(inp) { const f = inp.files && inp.files[0]; if (!f) return; const lu = new FileReader(); lu.onload = () => { const im = new Image(); im.onload = async () => {
  const L = Math.min(2000, im.width), c = document.createElement('canvas'); c.width = L; c.height = Math.round(im.height * L / im.width); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  let q = .85, data = c.toDataURL('image/webp', q); while (data.length > 2000000 && q > .4) { q -= .1; data = c.toDataURL('image/webp', q); }
  const nom = CARTE.id + '-carte'; await CL.imgPose(nom, data); CARTE.peinte.img = 'img:' + nom; IMGP['img:' + nom] = data; carteChange(); rendPlan(); }; im.src = lu.result; }; lu.readAsDataURL(f); }
// ---------------------------------------------------------------- toucher le plan (étape B)
const roomEn = (x, y) => (CARTE.salles || []).filter(r => r.etage === ETAGE && r.x != null).reverse().find(r => x >= r.x && y >= r.y && x < r.x + r.w + 2 && y < r.y + r.h + 2);
const dansInterieur = (x, y) => (CARTE.salles || []).some(r => r.etage === ETAGE && r.x != null && x > r.x && y > r.y && x <= r.x + r.w && y <= r.y + r.h);
const couloirEn = (x, y) => (CARTE.couloirs || []).find(z => z.etage === ETAGE && z.cases.includes(x + ',' + y));
function debutB(ev, cs) {
  const peinte = CARTE.sorte === 'peinte';
  if (OUTIL === 'deplacer') { const r = !peinte && roomEn(cs.x, cs.y); if (r) { geste.t = 'room'; geste.r = r; geste.rx = r.x; geste.ry = r.y; SEL_ROOM = r.id; } else geste.t = 'pan'; return; }
  if (OUTIL === 'poser') { geste.t = 'tap'; return; }
  if (OUTIL === 'couloir' || OUTIL === 'gomme' || OUTIL.startsWith('p-')) { geste.t = 'peint'; peintB(cs); return; }
  if (OUTIL === 'zone') { geste.t = 'zone'; return; }
  geste.t = 'tap'; }
function bougeB(ev, cs) {
  if (geste.t === 'room') { const r = geste.r, nx = geste.rx + Math.round((ev.clientX - geste.x0) / (CASE * ZOOM)), ny = geste.ry + Math.round((ev.clientY - geste.y0) / (CASE * ZOOM)); if (nx !== r.x || ny !== r.y) { r.x = nx; r.y = ny; rendPlan(); } return; }
  if (geste.t === 'peint') { peintB(cs); return; }
  if (geste.t === 'zone') { SEL_CASE = null; geste.cs2 = cs; rendPlan(); const P = $p('plan'), a = geste.cs; const x0 = Math.min(a.x, cs.x), y0 = Math.min(a.y, cs.y), x1 = Math.max(a.x, cs.x), y1 = Math.max(a.y, cs.y); P.insertAdjacentHTML('beforeend', `<div class="pz" style="left:${x0 * CASE}px;top:${y0 * CASE}px;width:${(x1 - x0 + 1) * CASE}px;height:${(y1 - y0 + 1) * CASE}px">nouvelle zone</div>`); } }
function finB(ev) {
  const g = geste, cs = g.cs;
  if (g.t === 'room') { if (g.bouge) carteChange(); panneauB(); rendPlan(); return; }
  if (g.t === 'peint') { carteChange(); rendPlan(); return; }
  if (g.t === 'zone') { const b = g.cs2 || cs; const r = [Math.min(cs.x, b.x), Math.min(cs.y, b.y), Math.max(cs.x, b.x), Math.max(cs.y, b.y)];
    fen(`<h2>🏷 Une zone</h2><label>Son nom (ce que le jeu écrit, « La grotte aux stalactites »)</label><input id="zN" value="Une salle"><div class="ligne" style="margin-top:12px"><button class="or" onclick="ajouteZone(${JSON.stringify(r)})">Ajouter</button><button onclick="fen('');rendPlan()">Annuler</button></div>`); return; }
  if (g.t !== 'tap' || g.bouge || !dans(cs.x, cs.y)) return;
  if (OUTIL === 'poser' && SALLE_POSE) { const s = salles.find(z => z.id === SALLE_POSE); if (!s) return; const id = 'r' + Date.now().toString(36);
    const [W, H] = dimsPlan(); if (cs.x + s.w + 2 > W || cs.y + s.h + 2 > H) { msgB('La salle dépasse du bord de l’étage : pose-la plus haut ou plus à gauche, ou agrandis l’étage.'); return; }
    CARTE.salles.push({ id, ref:s.id, nom:s.nom, w:s.w, h:s.h, cases:JSON.parse(JSON.stringify(s.cases || {})), decor:s.decor, lumiere:s.lumiere, son:s.son, img:s.img ? 'img:' + s.id : null, lu:'', etage:ETAGE, x:cs.x, y:cs.y, majRef:s.maj || Date.now() });
    SEL_ROOM = id; SALLE_POSE = null; OUTIL = 'deplacer'; carteChange(); panneauB(); rendPlan(); return; }
  if (OUTIL === 'escalier') { const L = [[cs.x, cs.y], [cs.x + 1, cs.y]], L2 = [[cs.x, cs.y], [cs.x, cs.y + 1]], libre = ([x, y]) => dans(x, y) && !roomEn(x, y) && !couloirEn(x, y);
    const C2 = L.every(libre) ? L : L2.every(libre) ? L2 : null; if (!C2) { msgB('Pas la place pour un escalier ici (2 cases libres, hors des salles et des couloirs).'); return; }
    CARTE.couloirs.push({ id:'X' + Date.now().toString(36), nom:'L’escalier', etage:ETAGE, cases:C2.map(([x, y]) => x + ',' + y), esc:true }); carteChange(); rendPlan(); return; }
  if (OUTIL === 'relier') { const z = couloirEn(cs.x, cs.y); if (!z || !z.esc) { msgB('Touche un escalier (les marches).'); return; }
    // le bout relié : la case de l'escalier la plus loin du couloir (celle qui n'a pas d'autre sol à côté)
    const bout = z.cases.map(k => k.split(',').map(Number)).sort((a, b) => voisinsSol(a, z) - voisinsSol(b, z))[0], p = CF.P_(ETAGE, bout[0], bout[1]);
    if (!LIEN_A) { LIEN_A = p; msgB('Escalier choisi : change d’étage et touche l’autre escalier.', true); rendPlan(); return; }
    if (CF.deP(LIEN_A).e === ETAGE) { LIEN_A = p; msgB('Il faut l’escalier d’un AUTRE étage.'); rendPlan(); return; }
    CARTE.liens = CARTE.liens.filter(([a, b]) => ![a, b].includes(LIEN_A) && ![a, b].includes(p)); CARTE.liens.push([LIEN_A, p]); LIEN_A = null; carteChange(); msgB('✅ Les deux escaliers sont reliés.', true); rendPlan(); return; }
  if (OUTIL === 'gomme') { const r = roomEn(cs.x, cs.y); if (r && !couloirEn(cs.x, cs.y)) retireRoom(r.id); } }
function voisinsSol([x, y], z) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const a = x + dx, b = y + dy; if (z.cases.includes(a + ',' + b)) return false; return !!couloirEn(a, b) || dansInterieur(a, b); }).length; }
function ajouteZone(r) { const n = ($p('zN').value || '').trim() || 'Une salle'; fen(''); CARTE.zones = CARTE.zones || []; CARTE.zones.push({ id:'z' + Date.now().toString(36), nom:n, r }); carteChange(); rendPlan(); }
function retireRoom(id) { const r = CARTE.salles.find(z => z.id === id); if (!r) return; ouiNon(`Retirer « ${esc(r.nom)} » du plan ? (elle reste dans « Mes salles »)`, () => { CARTE.salles = CARTE.salles.filter(z => z !== r); SEL_ROOM = null; carteChange(); panneauB(); rendPlan(); }); }
function peintB(cs) { if (!dans(cs.x, cs.y)) return; const k = cs.x + ',' + cs.y;
  if (CARTE.sorte === 'peinte') { const C = CARTE.peinte.cases, v = OUTIL === 'p-meuble' ? 'meuble:' + MEUBLE_P : OUTIL.slice(2); if (v === 'sol') delete C[k]; else C[k] = v; rendPlan(); return; }
  if (OUTIL === 'couloir') { if (dansInterieur(cs.x, cs.y) || couloirEn(cs.x, cs.y)) return; if (roomEn(cs.x, cs.y)) return; // pas sur le mur d'une salle (les portes y sont)
    const voisins = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => couloirEn(cs.x + dx, cs.y + dy)).filter(z => z && !z.esc);
    if (!voisins.length) CARTE.couloirs.push({ id:'K' + Date.now().toString(36) + Math.floor(Math.random() * 99), nom:'Le couloir', etage:ETAGE, cases:[k] });
    else { const z0 = voisins[0]; z0.cases.push(k); voisins.slice(1).forEach(z => { if (z !== z0) { z0.cases.push(...z.cases.filter(c => !z0.cases.includes(c))); CARTE.couloirs = CARTE.couloirs.filter(q => q !== z); } }); }
    rendPlan(); return; }
  if (OUTIL === 'gomme') { const z = couloirEn(cs.x, cs.y); if (!z) return; z.cases = z.cases.filter(c => c !== k); if (!z.cases.length || (z.esc && z.cases.length < 2)) { CARTE.couloirs = CARTE.couloirs.filter(q => q !== z); CARTE.liens = CARTE.liens.filter(l => !l.some(p => CF.deP(p).e === ETAGE && z.cases.concat([k]).includes(CF.deP(p).x + ',' + CF.deP(p).y))); } rendPlan(); } }
function msgB(t, ok) { const M = $p('msgsBC'); if (M) { messagesBC(); M.insertAdjacentHTML('afterbegin', `<div class="${ok ? 'ok' : 'ko'}">${esc(t)}</div>`); } }
// à l'ouverture : ?carte=<id> rouvre la carte (retour de « ▶ Jouer cette carte »)
(async () => { const q = new URLSearchParams(location.search).get('carte'); try { const r = await CL.synchro(); if (r && r.n) etatServeur(`☁ ${r.n} carte${r.n > 1 ? 's' : ''} recopiée${r.n > 1 ? 's' : ''} depuis le serveur`); } catch (e) {}
  if (q) { const C = await CL.lire(q); if (C) { CARTE = C; ETAGE = C.etages[0].id; ETAPE = 'C'; etape('C'); } } })();
