// La Guilde des Runes — LES VOIX DES PERSONNAGES, façon Animal Crossing (ESSAI à écouter : ecoute-voix.html).
// v2 (14/11, l'utilisateur : la v1 synthétique « on dirait un robot ») : comme dans Animal Crossing, une VRAIE voix prononce chaque
// lettre en une petite syllabe (fabriquées par Piper, voix françaises siwis et tom : sons/voix/<voix>/<lettre>.mp3, « ba », « ka »,
// « la », « o »…) ; le jeu les enchaîne très vite, une par lettre du texte, accélérées (donc plus aiguës) avec un peu de variation,
// et une intonation qui monte à la fin d'une question. Le texte s'écrit dans la bulle au même rythme.
// VOIX[clé] = { n, src: voix enregistrée, r: accélération (2 = une octave plus aigu), v: variation, pas: temps entre deux lettres (s), g: volume }
const VOIX = {
  moustache:  { n:'Moustache · vif',              src:'siwis', r:2.0,  v:.12, pas:.055, g:1 },
  moustache2: { n:'Moustache · très aigu',        src:'siwis', r:2.5,  v:.16, pas:.05,  g:1 },
  moustache3: { n:'Moustache · plus doux',        src:'siwis', r:1.6,  v:.08, pas:.065, g:1 },
  moustache4: { n:'Moustache · voix d’homme',     src:'tom',   r:2.0,  v:.12, pas:.055, g:1.1 },
  gorm:       { n:'Gorm · grave',                 src:'tom',   r:1.05, v:.06, pas:.075, g:1.2 },
};
const VX_BUF = {}; let VX = null, voixArret = null;
function voixCtx() { if (!VX) { try { VX = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (VX.state === 'suspended') VX.resume(); return VX; }
const lettreSimple = c => c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function chargeVoix(src) {
  const a = voixCtx(); if (!a) return Promise.resolve({});
  if (VX_BUF[src]) return VX_BUF[src];
  const L = 'abcdefghijklmnopqrstuvwxyz'.split(''), out = {};
  return VX_BUF[src] = Promise.all(L.map(l => fetch(`sons/voix/${src}/${l}.mp3?v=1`).then(r => r.arrayBuffer()).then(b => new Promise((ok, ko) => a.decodeAudioData(b, ok, ko))).then(buf => { out[l] = buf; }).catch(() => {}))).then(() => out);
}
// dit le texte avec la voix ; ecrit(i) est appelé pour écrire la bulle au même rythme ; renvoie une promesse
async function parle(texte, cle, ecrit, vol = .45) {
  if (voixArret) voixArret(); const a = voixCtx(), voix = VOIX[cle] || VOIX.moustache; if (!a) { if (ecrit) ecrit(texte.length); return; }
  const bufs = await chargeVoix(voix.src), lettres = [...texte], question = /\?\s*$/.test(texte.trim()), temps = [];
  let t = a.currentTime + .05; const total = lettres.filter(c => /[a-z]/i.test(lettreSimple(c))).length; let k = 0;
  const sortie = a.createGain(); sortie.gain.value = vol * (voix.g || 1); sortie.connect(a.destination);
  lettres.forEach((c, i) => {
    const l = lettreSimple(c);
    if (bufs[l]) {
      const p = k / Math.max(1, total), into = question && p > .7 ? 1 + (p - .7) * .8 : (!question && p > .85 ? 1 - (p - .85) * .5 : 1);
      const s = a.createBufferSource(), g = a.createGain(); s.buffer = bufs[l];
      s.playbackRate.value = voix.r * into * (1 + (Math.random() - .5) * voix.v);
      g.gain.setValueAtTime(1, t); g.gain.setValueAtTime(1, t + voix.pas * 1.3); g.gain.linearRampToValueAtTime(0, t + voix.pas * 1.8);
      s.connect(g).connect(sortie); s.start(t); s.stop(t + voix.pas * 1.9);
      temps.push([i, t]); t += voix.pas; k++;
    } else if (/[.!?…]/.test(c)) { temps.push([i, t]); t += voix.pas * 4; }
    else if (/[,;:]/.test(c)) { temps.push([i, t]); t += voix.pas * 2.5; }
    else { temps.push([i, t]); t += voix.pas * .5; }
  });
  return new Promise(ok => {
    let arret = false;
    const boucle = () => { if (arret) return; const now = a.currentTime; let j = 0; while (j < temps.length && temps[j][1] <= now) j++;
      if (ecrit) ecrit(j >= temps.length ? lettres.length : temps[j][0]); if (j < temps.length || now < t) requestAnimationFrame(boucle); else { voixArret = null; ok(); } };
    voixArret = () => { arret = true; voixArret = null; try { sortie.disconnect(); } catch (e) {} if (ecrit) ecrit(lettres.length); ok(); };
    requestAnimationFrame(boucle);
  });
}
