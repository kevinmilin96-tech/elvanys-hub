// =============================================================================================== LA FORGE DES DÉS · en combat (13/11)
// Les faces forgées dans l'Odyssée (run.forge, voir odyssee.js : FACES_FORGE, forgeApplique) sortent des sacs de dés du héros.
// Chargé par duel.html ; ne fait rien hors des combats de l'Odyssée.
let FORGE_RUN = null; // la forge de l'Odyssée en cours (posée avant le premier lancer du combat)
const forgeDe = (J, d) => (typeof S !== 'undefined' && S && S.ody && J === S.J && FORGE_RUN && d && d.i !== undefined) ? FORGE_RUN[d.i] || null : null;
if (typeof lance === 'function' && typeof FACES_FORGE !== 'undefined') {
  { const st = document.createElement('style'); st.textContent = '.d { position:relative; } .d .spf { position:absolute; top:-4px; left:-4px; font-size:3.4cqw; line-height:1; filter:drop-shadow(0 0 3px #000); pointer-events:none; }'; document.head.appendChild(st); }
  const _prep = prepareCombatOdyssee;
  prepareCombatOdyssee = function (run, cb, auto) { FORGE_RUN = run && run.forge ? run.forge : null; const r = _prep(run, cb, auto); if (S && S.J) S.J.orForge = S.J.orForge || 0; return r; };
  const _lanceF = lance;
  lance = function (J, d) {
    _lanceF(J, d); d.sp = null; d.jokerFixe = false;
    const fg = forgeDe(J, d); const code = fg && fg[d.v]; if (!code) return;
    const F = FACES_FORGE[code]; d.sp = code; d.v = F.v;
    if (code === 'soleil') { J.pc = Math.min(6, J.pc + 1); log(`☀ Soleil : +1 PC.`); }
    if (code === 'ecu') { J.bouclier = (J.bouclier || 0) + 2; log(`🛡 Écu : Bouclier +2.`); }
    if (code === 'piece') { J.orForge = (J.orForge || 0) + 5; log(`🪙 Pièce : +5 or (à la fin du combat).`); }
    if (code === 'joker') log(`✦ Joker : touche le dé pour choisir sa valeur.`);
  };
  const _modifieF = modifie;
  modifie = function (J, d, v) { _modifieF(J, d, v); d.sp = null; };
  // le Joker : le premier toucher choisit sa valeur
  const _choisirDeF = choisirDe;
  choisirDe = function (i) {
    const J = S && S.J, d = J && J.des[i];
    if (d && d.sp === 'joker' && !d.jokerFixe && !d.pose && !J.aLancer && !fxOn) {
      choix('✦ Joker : quelle valeur pour ce dé ?', [1, 2, 3, 4, 5, 6].map(String), k => { d.v = k + 1; d.jokerFixe = true; log(`✦ Le Joker devient un ${k + 1}.`); rendu(); });
      return;
    }
    return _choisirDeF(i);
  };
  // la Braise : +2 dégâts par Braise posée dans une Frappe ou une Technique
  const _poseF = pose;
  pose = function (J, quoi, ds, k, im) {
    const br = (quoi === 'frappe' || quoi === 'technique') ? (ds || []).filter(d => d.sp === 'braise').length : 0;
    const r = _poseF(J, quoi, ds, k, im);
    if (br && k && !S.fini) { log(`🔥 Braise : +${2 * br} dégâts.`); degats(k, 2 * br); }
    return r;
  };
}
