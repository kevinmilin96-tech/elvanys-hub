// Dessin d'une carte de la Guilde des Runes (09/11) : cadre en cristal du héros (Gemini, sans texte) + textes posés par l'appli.
// Zones mesurées sur le cadre (en % de 864 × 1216) : nom, pierre du coût, fenêtre de l'illustration, bande des dés, effet, losange du bas.
const ZONES = { nom:[11.6, 8.6, 64.2, 6.3], cout:[85.9, 11.5], fenetre:[12.7, 16.3, 75.2, 39.5], bande:[11.6, 57.6, 77, 5.1], effet:[12.5, 65.4, 75.5, 23.8], bas:[49.8, 93.3] };
const CADRE_DE = k => { for (const h of ORDRE) if (HEROS[h].deck.includes(k)) return h; return 'guilde'; };
const ICONE_SORTE = { u:'⚔', s:'✦', e:'⚒', r:'⛓' };
function carteGuilde(k, opt = {}) {
  const c = CARTES[k], h = opt.heros || CADRE_DE(k), z = ZONES, pc = (a, i) => a[i] + '%';
  const cadre = `cadres/${h}.webp?v=1`, art = opt.art || `cartes/${k}.webp?v=1`;
  return `<div class="carteG" style="--w:${opt.w || 216}px">
    <img class="cg-cadre" src="${cadre}" alt="">
    <div class="cg-art" style="left:${pc(z.fenetre, 0)};top:${pc(z.fenetre, 1)};width:${pc(z.fenetre, 2)};height:${pc(z.fenetre, 3)};background-image:url('${art}')"></div>
    <div class="cg-nom" style="left:${pc(z.nom, 0)};top:${pc(z.nom, 1)};width:${pc(z.nom, 2)};height:${pc(z.nom, 3)}"><span>${c.n}</span></div>
    <div class="cg-cout" style="left:${pc(z.cout, 0)};top:${pc(z.cout, 1)}">${opt.cout !== undefined ? opt.cout : c.c}</div>
    <div class="cg-bande" style="left:${pc(z.bande, 0)};top:${pc(z.bande, 1)};width:${pc(z.bande, 2)};height:${pc(z.bande, 3)}">🎲 ${c.txt}</div>
    <div class="cg-effet" style="left:${pc(z.effet, 0)};top:${pc(z.effet, 1)};width:${pc(z.effet, 2)};height:${pc(z.effet, 3)}">${c.d}</div>
    <div class="cg-sorte" style="left:${pc(z.bas, 0)};top:${pc(z.bas, 1)}">${ICONE_SORTE[c.t] || ''}</div>
    ${c.u ? `<div class="cg-atk">⚔ ${c.u.a}</div><div class="cg-vie">❤ ${c.u.v}</div>` : ''}
  </div>`;
}
const CSS_CARTE = `
.carteG { position:relative; width:var(--w); aspect-ratio:864/1216; font-family:Georgia, serif; container-type:inline-size; }
.carteG > * { position:absolute; box-sizing:border-box; }
.cg-cadre { inset:0; width:100%; height:100%; pointer-events:none; }
.cg-art { background-size:cover; background-position:center 30%; border-radius:1.5%; box-shadow:inset 0 0 0 1px #0006, inset 0 0 12px #0008; }
.cg-nom { display:flex; align-items:center; justify-content:center; text-align:center; color:#f6ecff; font-weight:bold; font-size:6.2cqw; line-height:1; text-shadow:0 1px 0 #000, 0 0 6px #b58cff; padding:0 2%; }
.cg-cout { transform:translate(-50%,-50%); width:13cqw; height:13cqw; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:9cqw; color:#fff; text-shadow:0 0 4px #2a7fc1, 0 2px 0 #000; }
.cg-bande { display:flex; align-items:center; justify-content:center; color:#ffe9a8; font-weight:bold; font-size:5.2cqw; text-shadow:0 1px 0 #000; }
.cg-effet { display:flex; align-items:center; justify-content:center; text-align:center; color:#efe6ff; font-size:5.4cqw; line-height:1.25; padding:3% 4%; }
.cg-sorte { transform:translate(-50%,-50%); color:#fff; font-size:5cqw; text-shadow:0 0 4px #000; }
.cg-atk, .cg-vie { bottom:3%; width:15cqw; height:15cqw; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:5.6cqw; color:#fff; border:2px solid #fff8; box-shadow:0 2px 6px #000a; }
.cg-atk { left:2%; background:radial-gradient(circle at 35% 30%, #ffb36a, #c2410c); }
.cg-vie { right:2%; background:radial-gradient(circle at 35% 30%, #8df0a0, #1f7a35); }
`;
