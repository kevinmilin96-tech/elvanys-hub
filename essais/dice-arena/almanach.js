// 25/11 : L'ALMANACH, l'écran et les récompenses (le compteur et les saisons sont dans rang.js).
// Décisions de l'utilisateur (saisons-proposition.html, almanach-saison1-scenario.html) : 30 paliers de 500 XP, saison de 8 semaines ;
// or (≈ 300) ou poussière (≈ 150) en alternance ; équipement rare / épique / légendaire aux paliers 5, 15, 25 ; un titre et son cadre au 10 ;
// des dés de la saison au 20 ; un skin de la saison au 30, au choix parmi 2 héros ; ensuite un coffre tous les 1 000 XP jusqu'à la fin.
const ALM_EQUIP = { 5:1, 15:2, 25:3 };
function almRecompense(S, p) {
  if (ALM_EQUIP[p] != null) { const r = ALM_EQUIP[p]; return { e:'🛡', n:`Pièce ${typeof EQ_RARE !== 'undefined' ? EQ_RARE[r].n : ''}`, d:'Une pièce d’équipement pour un de tes héros.', genre:'equip', r }; }
  if (p === 10) return { e:'🖼', n:'Titre et cadre de la saison', d:`Le titre « ${typeof titreDe === 'function' && titreDe(S.titre) ? titreDe(S.titre)[2] : 'Veilleur de l’Hiver'} » et son cadre (atelier du profil).`, genre:'titre' };
  if (p === 20) return { e:'🎲', n:'Dés de la saison', d:'Une nouvelle apparence pour tes dés (Mon profil).', genre:'des' };
  if (p === 30) return { e:'👑', n:'Skin de la saison', d:`Un costume d’hiver pour ${S.skins.map(h => typeof HEROS !== 'undefined' && HEROS[h] ? HEROS[h].nom : h).join(' ou ')}, au choix.`, genre:'skin' };
  return p % 2 ? { e:'🪙', n:'300 d’or', d:'De quoi faire monter tes héros.', genre:'or', or:300 } : { e:'🔹', n:'150 poussière', d:'De la poussière de rune pour les niveaux de tes héros.', genre:'pou', pou:150 };
}
const ALM_COFFRE = { or:150, pou:75 };
function almPrendre(p) {
  const S = saisonActive(); if (!S) return false; const a = lireAlm(), x = almSaison(a, S.id), i = almInfo(S.id);
  if (p > i.palier || x.recup.includes(p)) return false;
  const R = almRecompense(S, p);
  if (R.genre === 'skin' && !x.skin) { almChoixSkin(p); return false; }
  if (R.genre === 'or' || R.genre === 'pou') { if (typeof donneRessources === 'function') donneRessources(R.or || 0, R.pou || 0); }
  if (R.genre === 'equip' && typeof eqNouvelle === 'function') { const s = avSac(), piece = eqNouvelle(null, R.r); s.pieces.push(piece); avSacEcrire(s); annonceRang(`🛡 ${piece.nom} (${EQ_RARE[piece.r].n}) dans ton coffre`, true); }
  if (R.genre === 'titre') annonceRang('🖼 Nouveau titre et son cadre : choisis-les dans l’atelier du profil', true);
  if (R.genre === 'des') annonceRang('🎲 Dés de la saison : choisis-les dans Mon profil', true);
  const a2 = lireAlm(); almSaison(a2, S.id).recup.push(p); localStorage.setItem(ALM_CLE, JSON.stringify(a2)); return true;
}
function almPrendreCoffre() { const S = saisonActive(); if (!S) return false; const i = almInfo(S.id); if (!i.bonusARec) return false;
  const a = lireAlm(), x = almSaison(a, S.id); x.bonus = (x.bonus || 0) + i.bonusARec; localStorage.setItem(ALM_CLE, JSON.stringify(a));
  if (typeof donneRessources === 'function') donneRessources(ALM_COFFRE.or * i.bonusARec, ALM_COFFRE.pou * i.bonusARec); return true; }
function almToutPrendre() { const S = saisonActive(); if (!S) return; almInfo(S.id).aRec.filter(p => p !== 30 || almSaison(lireAlm(), S.id).skin).forEach(p => almPrendre(p)); almPrendreCoffre(); }
function almChoixSkin(p) {
  const S = saisonActive(); if (!S) return; const v = document.createElement('div'); v.id = 'alm-skin'; v.className = 'alm-voile';
  v.innerHTML = `<div class="alm-boite"><button class="x" onclick="this.closest('.alm-voile').remove()" aria-label="Fermer">✕</button><h3>👑 Ton skin de la saison</h3><p>Choisis le héros qui portera le costume d’hiver. Le choix est définitif pour cette saison.</p>
    <div class="alm-skins">${S.skins.map(h => `<button onclick="almSkin('${h}', ${p})"><img src="portraits/${h}.webp" alt=""><b>${typeof HEROS !== 'undefined' && HEROS[h] ? HEROS[h].nom : h}</b></button>`).join('')}</div>
    <p class="aide">Le costume habillera ton héros dès que son image sera peinte.</p></div>`;
  v.onclick = e => { if (e.target === v) v.remove(); }; document.body.appendChild(v); }
function almSkin(h, p) { const S = saisonActive(); if (!S) return; const a = lireAlm(), x = almSaison(a, S.id); if (!x.skin) x.skin = h; localStorage.setItem(ALM_CLE, JSON.stringify(a));
  const v = document.getElementById('alm-skin'); if (v) v.remove(); almPrendre(p); annonceRang(`👑 Skin d’hiver pour ${typeof HEROS !== 'undefined' && HEROS[h] ? HEROS[h].nom : h} !`, true); if (typeof dessine === 'function') dessine(); }
const almJoursRestants = S => Math.max(0, Math.ceil((new Date(S.fin + 'T00:00:00') - new Date()) / 864e5));

// la page (onglet 🗓️ Saison de route.html) ; S = la saison montrée, actif = elle a commencé
function almPageHTML() {
  const S = saisonActive() || saisonProchaine(); if (!S) return '<p class="aide">Pas de saison en ce moment : la prochaine arrive bientôt.</p>';
  const actif = !!saisonActive(), i = almInfo(S.id), j = actif ? almJoursRestants(S) : Math.max(0, Math.ceil((new Date(S.debut + 'T00:00:00') - new Date()) / 864e5));
  const cases = Array.from({ length:ALM_NB }, (_, k) => { const p = k + 1, R = almRecompense(S, p), pris = i.x.recup.includes(p), dispo = actif && p <= i.palier && !pris, grand = [5, 10, 15, 20, 25, 30].includes(p);
    return `<div class="acase ${pris ? 'prise' : dispo ? 'dispo' : 'verrou'}${grand ? ' grand' : ''}" id="a${p}" onclick="almDetail(${p})"><div class="rec">${pris ? '<span class="coche">✔</span>' : ''}<span class="ic">${R.e}</span><b>${R.n}</b>${dispo ? `<button class="recup" onclick="event.stopPropagation();if(almPrendre(${p}))dessine(${p})">Récupérer</button>` : !pris ? '<small>🔒</small>' : ''}</div><span class="anum">${p}</span></div>`; }).join('');
  const nb = i.aRec.length + i.bonusARec;
  return `<div class="alm"><div class="alm-tete"><h2>${S.e} Saison ${S.n} · ${S.nom}</h2>
    ${actif ? `<p class="alm-fin">Palier <b>${i.palier}</b> / ${ALM_NB} · fin dans <b>${j}</b> jour${j > 1 ? 's' : ''}</p>
    <div class="xp"><span class="barre"><i style="width:${Math.round(i.dans / i.besoin * 100)}%"></i><span>${i.dans} / ${i.besoin} XP ${i.palier >= ALM_NB ? 'vers le prochain coffre' : `vers le palier ${i.palier + 1}`}</span></span></div>`
    : `<p class="alm-fin bientot">L’Almanach ouvre le <b>1er décembre</b>${j > 0 ? ` (dans ${j} jour${j > 1 ? 's' : ''})` : ''}. Voici ce qui t’attend.</p>`}</div>
    ${nb > 1 ? `<button class="tout" onclick="almToutPrendre();dessine()">🎁 Tout récupérer (${nb})</button>` : ''}
    <div class="piste" id="apiste"><div class="rail">${cases}<div class="acase bonus ${i.bonusARec ? 'dispo' : 'verrou'}" id="a31"><div class="rec"><span class="ic">🎁</span><b>Coffres bonus</b><small>un tous les 1 000 XP après le palier 30</small>${i.bonusARec ? `<button class="recup" onclick="event.stopPropagation();if(almPrendreCoffre())dessine()">Récupérer ×${i.bonusARec}</button>` : ''}</div><span class="anum">+</span></div></div></div>
    <p class="aide">Toute l’expérience que tu gagnes pendant la saison remplit <b>en même temps</b> ton rang et l’Almanach. Touche une case pour la lire.</p>
    <details class="gains"><summary>La saison en bref</summary><ul>
      <li>Une aventure en chapitres dans les Chroniques : <b>« ${S.aventure} »</b>.</li>
      <li>La règle de la saison, <b>le froid</b> : un dé qui fait 1 gèle et ne peut pas être relancé ce tour.</li>
      <li>Fin le ${new Date(new Date(S.fin + 'T00:00:00') - 864e5).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}. Une saison finie (palier 30) te donne un Feuillet, pour rattraper plus tard ce que tu as manqué.</li></ul></details></div>`;
}
function almDetail(p) { const S = saisonActive() || saisonProchaine(); if (!S) return; const R = almRecompense(S, p), x = almInfo(S.id);
  annonceRang(`${R.e} Palier ${p} · ${R.n} : ${R.d} ${x.x.recup.includes(p) ? '✔ Récupérée.' : saisonActive() && p <= x.palier ? '🎁 À récupérer !' : '🔒'}`); }

if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = `
  .alm .alm-tete { max-width:620px; margin:0 auto; padding:0 12px; } .alm h2 { margin:6px 0 4px; } .alm-fin { text-align:center; margin:4px 0 6px; color:#f1ecff; } .alm-fin.bientot { background:#1d1b3aee; border:1px solid #f3c96b; border-radius:12px; padding:9px; }
  .alm .acase { flex:none; width:118px; position:relative; padding-bottom:30px; } .alm .acase .rec { height:auto; min-height:150px; } .alm .acase.grand .rec { border-color:#9fdcff; box-shadow:0 0 12px #9fdcff55; }
  .alm .acase .ic { font-size:34px; display:block; margin:4px 0; } .alm .anum { position:absolute; bottom:0; left:50%; transform:translateX(-50%); background:#2a3e66; color:#fff; border:2px solid #9fdcff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font:bold 13px Georgia, serif; }
  .alm .acase.prise .anum { background:#2a6a46; border-color:#7dffb0; } .alm .acase.verrou .rec { filter:grayscale(.6) brightness(.8); } .alm .acase.dispo .rec { border-color:#f3c96b; box-shadow:0 0 18px #f3c96b88; }
  .alm .acase.bonus .rec { border-style:dashed; } .alm .gains ul { padding-left:18px; } .alm .gains { max-width:620px; margin:6px auto; padding:0 12px; }
  .alm-voile { position:fixed; inset:0; z-index:9000; background:#000a; display:flex; align-items:center; justify-content:center; padding:14px; }
  .alm-boite { position:relative; background:#1d1838; border:1px solid #f3c96b; border-radius:16px; padding:14px; max-width:420px; color:#f1ecff; font-family:Georgia, serif; text-align:center; }
  .alm-boite .x { position:absolute; top:8px; right:10px; background:none; border:0; color:#fff; font-size:20px; } .alm-skins { display:flex; gap:12px; justify-content:center; margin:10px 0; }
  .alm-skins button { background:#2a2350; border:2px solid #9fdcff; border-radius:14px; padding:8px; color:#fff; font:bold 15px Georgia, serif; } .alm-skins img { width:96px; height:96px; border-radius:50%; display:block; margin:0 auto 4px; object-fit:cover; }`;
  document.head.appendChild(st); }
