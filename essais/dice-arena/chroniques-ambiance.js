// 16/11 (demande de l'utilisateur : « brouillard, effets sonores, lumière… façon Foundry / Roll20 ») : les SONS D'AMBIANCE de chaque salle
// des Chroniques. Fabriqués par le téléphone (Web Audio), aucun fichier : tic-tac des rouages, gouttes de la crypte, grondement du Cœur…
// Le volume suit le réglage « Sons » (⚙️ Paramètres) ; coupés si les sons sont coupés ou si l'écran est caché.
// AMB.zone(clé) : change d'ambiance en fondu (null = silence). Clés : rouages, coeur, crypte, biblio, atelier, hall, reserve, galerie, cagibi, couloir.
const AMB = (() => {
  let ctx = null, sortie = null, filtre = null, cle = null, prochain = 0, minuterie = null, bourdon = null;
  const actif = () => localStorage.getItem('guilde-son') !== '0' && !document.hidden;
  const vol = () => +(localStorage.getItem('guilde-vol-sons') || 100) / 100;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      filtre = ctx.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 6000;
      sortie = ctx.createGain(); sortie.gain.value = 0; filtre.connect(sortie).connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // un petit bruit (clic, tic, page) : bruit blanc filtré, très court
  function bruit(t, dur, freq, q, g, type) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const e = ctx.createGain(); e.gain.value = g; s.connect(f).connect(e).connect(filtre); s.start(t);
  }
  // une note qui s'éteint (tic métallique, tock profond, goutte)
  function note(t, f0, f1, dur, g, type) {
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * .6);
    const e = ctx.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(g, t + .008); e.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(e).connect(filtre); o.start(t); o.stop(t + dur + .05);
  }
  const vent = (t, g) => bruit(t, 2.2, 300 + Math.random() * 200, .6, g, 'lowpass');
  // chaque salle : ce qu'on joue au prochain battement, et dans combien de secondes revient le suivant
  let pair = false;
  const SALLES = {
    rouages:t => { pair = !pair; bruit(t, .03, pair ? 3200 : 2400, 8, .5); if (Math.random() < .12) note(t + .1, 880, 0, 1.4, .05, 'triangle'); return .5; },
    coeur:t => { note(t, 95, 70, 1.6, .35); bruit(t, .05, 900, 4, .25); if (Math.random() < .25) note(t + .7, 1320, 0, 2.2, .025, 'triangle'); return 1.5; },
    crypte:t => { note(t, 1500 + Math.random() * 500, 700, .25, .12); if (Math.random() < .4) vent(t, .06); return 1.6 + Math.random() * 2.6; },
    biblio:t => { bruit(t, .025, 2600, 8, .14); if (Math.random() < .15) bruit(t + .3, .35, 4200, 1, .05, 'highpass'); return 1.1; },
    atelier:t => { if (Math.random() < .5) note(t, 1900 + Math.random() * 600, 0, .5, .05, 'triangle'); bruit(t, .03, 2800, 8, .2); return .9 + Math.random() * .8; },
    hall:t => { bruit(t, .03, 2000, 8, .12); if (Math.random() < .3) vent(t, .05); return 1.2; },
    reserve:t => { bruit(t, .03, 1800, 8, .1); if (Math.random() < .2) bruit(t, .12, 400, 2, .08); return 1.3; },
    galerie:t => { bruit(t, .03, 2200, 8, .09); if (Math.random() < .35) vent(t, .07); return 1.4; },
    cagibi:t => { bruit(t, .03, 2400, 8, .12); if (Math.random() < .2) note(t, 2400, 1200, .2, .03, 'square'); return 1; },
    couloir:t => { bruit(t, .03, 1600, 8, .07); if (Math.random() < .25) vent(t, .05); return 1.25; },
  };
  // le fond continu de certaines salles (bourdonnement du Cœur)
  function fond(k) {
    if (bourdon) { try { bourdon.stop(ctx.currentTime + .8); } catch (e) {} bourdon = null; }
    if (k !== 'coeur') return;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 55; const g = ctx.createGain(); g.gain.value = .05; o.connect(g).connect(filtre); o.start(); bourdon = o;
  }
  function boucle() {
    if (!ctx || !cle || !actif()) return;
    const t0 = ctx.currentTime;
    while (prochain < t0 + .25) { if (prochain < t0) prochain = t0 + .02; prochain += SALLES[cle](prochain) || 1; }
  }
  function zone(k, etouffe) {
    k = SALLES[k] ? k : null;
    if (!k || !actif()) { if (ctx && sortie) sortie.gain.setTargetAtTime(0, ctx.currentTime, .3); cle = k; return; }
    if (!ac()) return;
    filtre.frequency.setTargetAtTime(etouffe ? 900 : 6000, ctx.currentTime, .3);
    sortie.gain.setTargetAtTime(.5 * vol(), ctx.currentTime, .4);
    if (k === cle) return;
    cle = k; prochain = ctx.currentTime + .3; fond(k);
    if (!minuterie) minuterie = setInterval(boucle, 100);
  }
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) sortie.gain.setTargetAtTime(0, ctx.currentTime, .1); else if (cle) { ac(); sortie.gain.setTargetAtTime(.5 * vol(), ctx.currentTime, .4); } });
  return { zone };
})();
