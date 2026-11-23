// 23/11 (testeurs simulés, décision B1 de l'utilisateur : « on ne comprend pas qu'il y a 4 portes ») : des FLÈCHES ‹ › sur les côtés du carrousel
// des portails (un toucher = le portail d'à côté), et une petite main 👆 qui « glisse » tant que le joueur n'a jamais glissé lui-même.
(function () {
  if (typeof car === 'undefined' || !car) return;
  const st = document.createElement('style');
  st.textContent = `.car-fl { position:fixed; z-index:8; width:40px; height:64px; border:0; border-radius:14px; background:#15132bb8; color:#f3c96b; font:bold 34px/64px Georgia, serif; padding:0; cursor:pointer; box-shadow:0 0 0 1px #f3c96b55, 0 4px 14px #0008; transition:opacity .25s; }
  .car-fl.non { opacity:0; pointer-events:none; }
  .car-fl:active { transform:scale(.92); }
  #car-main { position:fixed; z-index:9; font-size:44px; pointer-events:none; filter:drop-shadow(0 3px 6px #000c); animation:carGlisse 2.2s ease-in-out infinite; }
  @keyframes carGlisse { 0% { transform:translateX(40px); opacity:0; } 15% { opacity:1; } 70% { transform:translateX(-50px); opacity:1; } 100% { transform:translateX(-50px); opacity:0; } }
  body:has(#titre:not(.part)) .car-fl, body:has(#titre:not(.part)) #car-main, body:has(#propTuto) #car-main { display:none; }`;
  document.head.appendChild(st);
  const g = document.createElement('button'), d = document.createElement('button');
  g.className = d.className = 'car-fl'; g.textContent = '‹'; d.textContent = '›'; g.setAttribute('aria-label', 'Portail précédent'); d.setAttribute('aria-label', 'Portail suivant');
  g.onclick = () => { centre(Math.max(0, auCentre() - 1), true); aGlisse(); };
  d.onclick = () => { centre(Math.min(car.children.length - 1, auCentre() + 1), true); aGlisse(); };
  document.body.append(g, d);
  let main = null;
  const dejaGlisse = () => !!localStorage.getItem('guilde-a-glisse');
  function aGlisse() { if (dejaGlisse()) return; try { localStorage.setItem('guilde-a-glisse', '1'); } catch (e) {} if (main) { main.remove(); main = null; } }
  // les flèches suivent le carrousel (étages qui changent, fenêtre qui tourne, défilement)
  function place() {
    const vu = car.offsetParent !== null && car.style.display !== 'none' && car.children.length > 1, r = car.getBoundingClientRect(), c = auCentre();
    [g, d].forEach(b => b.style.display = vu ? '' : 'none');
    if (!vu) { if (main) main.style.display = 'none'; return; }
    const y = r.top + r.height / 2 - 32, el = car.children[c], er = el ? el.getBoundingClientRect() : r;
    g.style.top = d.style.top = y + 'px';
    g.style.left = Math.max(4, er.left - 46) + 'px'; d.style.left = Math.min(innerWidth - 44, er.right + 6) + 'px';
    g.classList.toggle('non', c <= 0); d.classList.toggle('non', c >= car.children.length - 1);
    if (!dejaGlisse()) {
      if (!main) { main = document.createElement('div'); main.id = 'car-main'; main.textContent = '👆'; document.body.appendChild(main); }
      main.style.display = ''; main.style.top = (r.top + r.height * .62) + 'px'; main.style.left = (innerWidth / 2 - 22) + 'px';
    }
  }
  // un vrai glissement du doigt sur le carrousel = compris : la main disparaît pour toujours
  let x0 = null;
  car.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive:true });
  car.addEventListener('touchend', e => { if (x0 != null && Math.abs(e.changedTouches[0].clientX - x0) > 30) aGlisse(); x0 = null; }, { passive:true });
  car.addEventListener('scroll', () => requestAnimationFrame(place), { passive:true });
  addEventListener('resize', place); addEventListener('hashchange', () => setTimeout(place, 120));
  setInterval(place, 700);
  place();
})();
