// La Guilde des Runes — LES VOIX DES PERSONNAGES, façon Animal Crossing (13/11 soir, ESSAI à écouter : ecoute-voix.html).
// Rien d'enregistré : le téléphone fabrique un babillage. Chaque voyelle du texte donne une petite syllabe chantée avec la « couleur »
// de la voyelle (formants a / é / i / o / ou), chaque consonne un petit souffle ; la hauteur suit une intonation (la fin d'une
// question monte, celle d'une phrase descend). Le texte s'écrit dans la bulle au même rythme.
// VOIX[clé] = { f: hauteur de base (Hz), v: variation, d: durée d'une syllabe (s), onde, souffle, glisse (miaou : la note glisse) }
const VOIX = {
  moustache:  { n:'Moustache · vif et miaulé', f:560, v:.18, d:.065, onde:'triangle', souffle:.25, glisse:.22 },
  moustache2: { n:'Moustache · plus doux',      f:470, v:.12, d:.075, onde:'sine',     souffle:.15, glisse:.10 },
  moustache3: { n:'Moustache · dessin animé',   f:640, v:.28, d:.055, onde:'square',   souffle:.20, glisse:.30 },
  gorm:       { n:'Gorm · grave et lent',       f:150, v:.10, d:.095, onde:'sawtooth', souffle:.30, glisse:0, g:1.8 },
};
// formants simplifiés de chaque voyelle (deux filtres)
const FORMANTS = { a:[800, 1200], e:[450, 1900], i:[300, 2300], o:[480, 850], u:[320, 800], y:[300, 1700] };
const VOYELLE = c => { c = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return 'aeiouy'.includes(c) ? c : null; };
let VX = null, voixArret = null;
function voixCtx() { if (!VX) { try { VX = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (VX.state === 'suspended') VX.resume(); return VX; }
// une syllabe chantée
function syllabe(c, t, voix, f, vol) {
  const fo = FORMANTS[c] || FORMANTS.a, o = c && VX.createOscillator(), g = VX.createGain(), sortie = VX.createGain();
  sortie.gain.value = vol * (voix.g || 1); sortie.connect(VX.destination);
  o.type = voix.onde; o.frequency.setValueAtTime(f * (1 + voix.glisse * .5), t); o.frequency.exponentialRampToValueAtTime(f, t + voix.d * .6);
  fo.forEach((ff, i) => { const bp = VX.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff * (voix.f > 400 ? 1.25 : 1); bp.Q.value = 6; const gg = VX.createGain(); gg.gain.value = i ? .55 : 1; o.connect(bp).connect(gg).connect(g); });
  g.connect(sortie); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .008); g.gain.setValueAtTime(1, t + voix.d * .65); g.gain.linearRampToValueAtTime(0, t + voix.d);
  o.start(t); o.stop(t + voix.d + .02);
}
// un petit souffle pour une consonne
function souffle(t, voix, vol) {
  const n = Math.floor(VX.sampleRate * .03), b = VX.createBuffer(1, n, VX.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = VX.createBufferSource(), f = VX.createBiquadFilter(), g = VX.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = voix.f > 400 ? 3000 : 1800;
  g.gain.value = voix.souffle * vol; s.connect(f).connect(g).connect(VX.destination); s.start(t);
}
// dit le texte avec la voix ; ecrit(i) est appelé à chaque lettre pour écrire la bulle au même rythme ; renvoie une promesse
function parle(texte, cle, ecrit, vol = .5) {
  if (voixArret) voixArret(); const a = voixCtx(), voix = VOIX[cle] || VOIX.moustache; if (!a) { if (ecrit) ecrit(texte.length); return Promise.resolve(); }
  let t = a.currentTime + .05, arret = false; const lettres = [...texte], fin = /[?]/.test(texte.trim().slice(-1)) ? 1 : -1, temps = [];
  let syl = 0; const nbSyl = Math.max(1, lettres.filter(VOYELLE).length);
  lettres.forEach((c, i) => {
    const v = VOYELLE(c);
    if (v) { const p = syl / nbSyl, f = voix.f * (1 + (Math.random() - .5) * voix.v + (p > .75 ? fin * .12 * (p - .75) * 4 : 0)); syllabe(v, t, voix, f, vol); syl++; temps.push([i, t]); t += voix.d; }
    else if (/[a-z]/i.test(c)) { if (Math.random() < .5) souffle(t, voix, vol); temps.push([i, t]); t += voix.d * .25; }
    else if (/[.!?…]/.test(c)) { temps.push([i, t]); t += voix.d * 3; }
    else if (/[,;:]/.test(c)) { temps.push([i, t]); t += voix.d * 1.6; }
    else { temps.push([i, t]); t += voix.d * .3; }
  });
  return new Promise(ok => {
    const t0 = a.currentTime;
    const boucle = () => { if (arret) return; const now = a.currentTime; let k = 0; while (k < temps.length && temps[k][1] <= now) k++;
      if (ecrit) ecrit(k >= temps.length ? lettres.length : temps[k][0]); if (now < t + .05 && k < temps.length) requestAnimationFrame(boucle); else { voixArret = null; ok(); } };
    voixArret = () => { arret = true; voixArret = null; if (ecrit) ecrit(lettres.length); try { VX.close(); } catch (e) {} VX = null; ok(); };
    requestAnimationFrame(boucle); void t0;
  });
}
