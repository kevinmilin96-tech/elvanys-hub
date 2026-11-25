// 25/11 (l'utilisateur : « les étoiles, je ne les trouve pas pertinentes » → choix : les DÉFIS DU JOUR) :
// dans les flashs (Crypte, Expéditions) et le duel éclair, ★ = gagner ; puis +★ par défi réussi.
// Chaque jour, 2 défis sont tirés dans la liste du jeu, les mêmes pour tout le monde, écrits avant de jouer.
// pool = { clé:{ e, n, ok:(état) => vrai/faux } }
function defisJourDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function defisJourTire(jeu, pool, n) {
  const cles = Object.keys(pool), out = []; let h = 2166136261;
  for (const c of defisJourDate() + '/' + jeu) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  while (out.length < (n || 2) && cles.length) { h = Math.imul(h ^ (h >>> 13), 1597334677) >>> 0; out.push(cles.splice(h % cles.length, 1)[0]); }
  return out;
}
// le texte des étoiles (avant de jouer, ou en cours avec etat pour cocher)
function defisJourTexte(pool, tire, etat, sep) {
  const l = tire.map((k, i) => { const d = pool[k], fait = etat ? !!d.ok(etat) : null; return `${fait ? '✅' : '☆'} ${d.e} ${d.n}`; });
  return `★ : gagner${sep || ' · '}+★ par défi réussi :${sep || ' '}${l.join(sep || ' · ')}`;
}
function defisJourCompte(pool, tire, etat) { return tire.filter(k => pool[k].ok(etat)).length; }
