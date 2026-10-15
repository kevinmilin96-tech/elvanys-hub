// Aureus — outils (15/10/2026) : codes 2FA (TOTP), générateur à 3 modes, solidité d'un mot de passe, empreinte SHA-1
// pour la vérification des fuites (seuls les 5 premiers caractères partent, par notre serveur).
import { MOTS } from './mots.js?v=__VERSION__';
import { hasard } from './coffre-crypto.js?v=__VERSION__';

const enc = new TextEncoder();

// ------------------------------------------------------------------------------------------- codes 2FA (TOTP)

function base32(texte) {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const propre = String(texte || '').toUpperCase().replace(/[\s=-]/g, '');
  if (!propre || /[^A-Z2-7]/.test(propre)) return null;
  let bits = '';
  for (const c of propre) bits += a.indexOf(c).toString(2).padStart(5, '0');
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}

/** Lit une clé 2FA : adresse otpauth://totp/… (QR d'un site) ou clé secrète seule. null si illisible. */
export function lireTotp(texte) {
  const t = String(texte || '').trim();
  if (!t) return null;
  if (/^otpauth:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (u.host.toLowerCase() !== 'totp') return null;
      const p = u.searchParams;
      const etiquette = decodeURIComponent(u.pathname.replace(/^\//, ''));
      const [emetteurEtiquette, compte] = etiquette.includes(':') ? etiquette.split(':') : ['', etiquette];
      const cfg = {
        secret: (p.get('secret') || '').toUpperCase().replace(/\s/g, ''),
        emetteur: p.get('issuer') || emetteurEtiquette || '',
        compte: (compte || '').trim(),
        chiffres: Math.min(8, Math.max(6, Number(p.get('digits')) || 6)),
        periode: Math.min(120, Math.max(15, Number(p.get('period')) || 30)),
        algo: ({ SHA256: 'SHA-256', SHA512: 'SHA-512' })[(p.get('algorithm') || '').toUpperCase()] || 'SHA-1',
      };
      return base32(cfg.secret) ? cfg : null;
    } catch { return null; }
  }
  const secret = t.toUpperCase().replace(/[\s-]/g, '');
  return base32(secret) && secret.length >= 16 ? { secret, emetteur: '', compte: '', chiffres: 6, periode: 30, algo: 'SHA-1' } : null;
}

/** Code du moment + secondes restantes. */
export async function codeTotp(cfg, maintenant = Date.now()) {
  const cle = base32(cfg.secret);
  if (!cle) return null;
  const pas = Math.floor(maintenant / 1000 / cfg.periode);
  const compteur = new Uint8Array(8);
  let x = pas;
  for (let i = 7; i >= 0; i--) { compteur[i] = x & 0xff; x = Math.floor(x / 256); }
  const k = await crypto.subtle.importKey('raw', cle, { name: 'HMAC', hash: cfg.algo || 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, compteur));
  const o = h[h.length - 1] & 0x0f;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  const code = String(bin % 10 ** cfg.chiffres).padStart(cfg.chiffres, '0');
  return { code, reste: cfg.periode - Math.floor(maintenant / 1000) % cfg.periode, periode: cfg.periode };
}

export const joliCode = (c) => (c.length === 6 ? `${c.slice(0, 3)} ${c.slice(3)}` : c.length === 8 ? `${c.slice(0, 4)} ${c.slice(4)}` : c);

// ------------------------------------------------------------------------------------- générateur (3 modes)

function tirage(n) { // entier au hasard dans [0, n[ sans biais
  const lim = Math.floor(0x100000000 / n) * n;
  for (;;) { const x = new Uint32Array(hasard(4).buffer)[0]; if (x < lim) return x % n; }
}

export const REGLAGES_GEN = {
  aleatoire: { longueur: 20, majuscules: true, chiffres: true, symboles: true },
  phrase: { mots: 4, separateur: '-', majuscules: true, nombre: true },
  pin: { longueur: 6 },
};

export function generer(mode, r) {
  if (mode === 'pin') return Array.from({ length: r.longueur }, () => tirage(10)).join('');
  if (mode === 'phrase') {
    const mots = Array.from({ length: r.mots }, () => {
      const m = MOTS[tirage(MOTS.length)];
      return r.majuscules ? m.charAt(0).toUpperCase() + m.slice(1) : m;
    });
    if (r.nombre) mots.push(String(tirage(90) + 10));
    return mots.join(r.separateur);
  }
  // Aléatoire, sans caractères qui se confondent (O/0, l/1/I)
  const groupes = ['abcdefghijkmnopqrstuvwxyz'];
  if (r.majuscules) groupes.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
  if (r.chiffres) groupes.push('23456789');
  if (r.symboles) groupes.push('-_!?@#%+=*&');
  const tous = groupes.join('');
  for (;;) {
    const m = Array.from({ length: r.longueur }, () => tous[tirage(tous.length)]).join('');
    if (r.longueur < groupes.length || groupes.every((g) => [...m].some((c) => g.includes(c)))) return m;
  }
}

// ------------------------------------------------------------------------------------------------ solidité

const COURANTS = ['password', 'motdepasse', 'azerty', 'qwerty', 'soleil', 'bonjour', 'marseille', 'leclerc', 'admin', 'welcome', 'loulou', 'chouchou', 'doudou'];

/** Estimation simple de la solidité (bits) → niveau 0 très faible … 4 très solide. */
export function solidite(mdp) {
  const m = String(mdp || '');
  if (!m) return { niveau: 0, bits: 0, texte: 'Vide' };
  let taille = 0;
  if (/[a-z]/.test(m)) taille += 26;
  if (/[A-Z]/.test(m)) taille += 26;
  if (/[0-9]/.test(m)) taille += 10;
  if (/[^a-zA-Z0-9]/.test(m)) taille += 20;
  let bits = m.length * Math.log2(Math.max(taille, 1));
  const bas = m.toLowerCase();
  if (COURANTS.some((c) => bas.includes(c))) bits = Math.min(bits, 28);
  if (/^(.)\1+$/.test(m) || /^(?:0123|1234|2345|3456|4567|5678|6789|abcd)/i.test(m)) bits = Math.min(bits, 15);
  if (/^\d+$/.test(m)) bits = Math.min(bits, m.length * 3.32);
  // Phrase de passe : mots séparés → on compte ~11 bits par mot de la liste
  const morceaux = m.split(/[-_. ]/).filter((x) => x.length >= 3);
  if (morceaux.length >= 3) bits = Math.max(bits, morceaux.length * 11);
  const niveau = bits < 28 ? 0 : bits < 45 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  return { niveau, bits: Math.round(bits), texte: ['Très faible', 'Faible', 'Moyen', 'Solide', 'Très solide'][niveau] };
}

// ------------------------------------------------------------------------------------------------- fuites

export async function sha1Hex(texte) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', enc.encode(texte)));
  return [...h].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Combien de fois ce mot de passe apparaît dans les fuites connues (0 = jamais vu). api(prefixe) rend le texte du service. */
export async function vuDansFuites(mdp, api) {
  const h = await sha1Hex(mdp);
  const texte = await api(h.slice(0, 5));
  if (texte == null) return null;
  for (const ligne of texte.split('\n')) {
    const [suite, n] = ligne.trim().split(':');
    if (suite === h.slice(5)) return Number(n) || 0;
  }
  return 0;
}

// ------------------------------------------------------------------------------------------- icône d'un site

export function domaine(adresse) {
  const t = String(adresse || '').trim();
  if (!t) return '';
  try { return new URL(/^[a-z]+:\/\//i.test(t) ? t : 'https://' + t).hostname.replace(/^www\./, ''); } catch { return ''; }
}

const PALETTE = ['#2a7fc1', '#7c5cff', '#2fb37a', '#f38020', '#e5262c', '#0e9fb5', '#c9962e', '#d6336c', '#495057', '#1d6f42'];
export function couleurDe(texte) {
  let h = 0;
  for (const c of String(texte || '?')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
