// Aureus — le chiffrement, entièrement sur l'appareil (15/10/2026). Rien ne part en clair vers le serveur.
//
// Trois clés :
//  1. la CLÉ DU COFFRE (256 bits, tirée au hasard) chiffre chaque fiche (AES-GCM) ;
//  2. les 12 MOTS DE SECOURS (128 bits de hasard + contrôle, norme BIP39 en français) enveloppent la clé du coffre ;
//     cette enveloppe est rangée sur le serveur : elle sert à rouvrir le coffre sur un nouvel appareil ;
//  3. le CODE de l'appareil : PBKDF2(code, sel GARDÉ SUR L'APPAREIL) donne
//       - une « preuve » envoyée au serveur (il n'en garde qu'une empreinte, 5 essais puis blocage),
//       - une moitié de clé qui, mélangée à la moitié rendue par le serveur après la bonne preuve, ouvre
//         la clé du coffre rangée sur l'appareil.
//     Le serveur seul ne peut pas deviner le code (il n'a pas le sel) ; l'appareil volé seul non plus (il lui
//     manque la moitié du serveur, qui ne se donne qu'en 5 essais).
import { MOTS } from './mots.js';

export const ITERATIONS = 600000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64 = (u8) => btoa(String.fromCharCode(...u8));
export const deb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const b64url = (u8) => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const deb64url = (s) => deb64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const hex = (u8) => [...u8].map((x) => x.toString(16).padStart(2, '0')).join('');
export const hasard = (n) => crypto.getRandomValues(new Uint8Array(n));

// --------------------------------------------------------------------------------------------- 12 mots (BIP39)

/** Sans accents, en minuscules : « éléphant » et « elephant » donnent le même mot (la liste le permet). */
export const simple = (m) => String(m || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const INDEX = new Map(MOTS.map((m, i) => [simple(m), i]));

export async function nouveauxMots() {
  const ent = hasard(16);
  const somme = new Uint8Array(await crypto.subtle.digest('SHA-256', ent));
  const bits = [...ent].map((x) => x.toString(2).padStart(8, '0')).join('') + somme[0].toString(2).padStart(8, '0').slice(0, 4);
  const mots = [];
  for (let i = 0; i < 12; i++) mots.push(MOTS[parseInt(bits.slice(i * 11, i * 11 + 11), 2)]);
  return mots;
}

/** Vérifie 12 mots tapés : chaque mot connu + le contrôle final (une faute de frappe est détectée). */
export async function verifierMots(liste) {
  const mots = liste.map(simple).filter(Boolean);
  if (mots.length !== 12) return { ok: false, message: 'Il faut exactement 12 mots.' };
  const inconnus = mots.map((m, i) => (INDEX.has(m) ? null : i + 1)).filter(Boolean);
  if (inconnus.length) return { ok: false, message: `Mot inconnu : n° ${inconnus.join(', ')}.` };
  const bits = mots.map((m) => INDEX.get(m).toString(2).padStart(11, '0')).join('');
  const ent = new Uint8Array(16);
  for (let i = 0; i < 16; i++) ent[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const somme = new Uint8Array(await crypto.subtle.digest('SHA-256', ent));
  if (somme[0].toString(2).padStart(8, '0').slice(0, 4) !== bits.slice(128)) {
    return { ok: false, message: 'Ces 12 mots ne vont pas ensemble : vérifiez l’ordre et l’orthographe.' };
  }
  return { ok: true, mots: mots.map((m) => MOTS[INDEX.get(m)]) };
}

// ------------------------------------------------------------------------------------------------ outils AES

async function cleAes(brut, usages = ['encrypt', 'decrypt']) {
  return crypto.subtle.importKey('raw', brut, { name: 'AES-GCM' }, false, usages);
}

async function chiffrer(cle, octets, aad) {
  const iv = hasard(12);
  const p = { name: 'AES-GCM', iv };
  if (aad) p.additionalData = enc.encode(aad);
  const ct = new Uint8Array(await crypto.subtle.encrypt(p, cle, octets));
  return JSON.stringify({ iv: b64(iv), ct: b64(ct) });
}

async function dechiffrer(cle, texte, aad) {
  const o = JSON.parse(texte);
  const p = { name: 'AES-GCM', iv: deb64(o.iv) };
  if (aad) p.additionalData = enc.encode(aad);
  return new Uint8Array(await crypto.subtle.decrypt(p, cle, deb64(o.ct)));
}

async function pbkdf2(secret, sel, bits) {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: ITERATIONS }, base, bits));
}

// ------------------------------------------------------------------------------------------- clé du coffre

/** Nouvelle clé du coffre : renvoie la clé utilisable + ses octets (à envelopper puis oublier). */
export async function nouvelleCleCoffre() {
  const brut = hasard(32);
  return { cle: await cleAes(brut), brut };
}

/** Enveloppe pour le serveur : clé du coffre chiffrée par les 12 mots. */
export async function envelopperParMots(mots, brut) {
  const sel = hasard(16);
  const k = await cleAes(await pbkdf2(mots.map(simple).join(' '), sel, 256));
  return { sel: b64(sel), enveloppe: await chiffrer(k, brut, 'aureus-mots'), iterations: ITERATIONS };
}

/** Ouvre l'enveloppe du serveur avec les 12 mots. Mauvais mots → erreur. */
export async function ouvrirParMots(mots, coffre) {
  const k = await cleAes(await pbkdf2(mots.map(simple).join(' '), deb64(coffre.sel), 256));
  const brut = await dechiffrer(k, coffre.enveloppe, 'aureus-mots');
  return { cle: await cleAes(brut), brut };
}

// ---------------------------------------------------------------------------------------- code de l'appareil

/** À partir du code : la preuve (pour le serveur) et la moitié de clé de l'appareil. Le sel reste ici. */
export async function deriverCode(code, sel) {
  const bits = await pbkdf2(String(code), sel, 512);
  return { preuve: hex(bits.slice(0, 32)), moitie: bits.slice(32) };
}

async function cleAppareil(moitie, secretServeur, sel) {
  const ikm = new Uint8Array([...moitie, ...enc.encode(secretServeur)]);
  const base = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: sel, info: enc.encode('aureus-appareil') },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Range sur l'appareil la clé du coffre, chiffrée par (code + moitié du serveur). */
export async function envelopperAppareil(brut, moitie, secretServeur, sel) {
  return chiffrer(await cleAppareil(moitie, secretServeur, sel), brut, 'aureus-appareil');
}

export async function ouvrirAppareil(enveloppe, moitie, secretServeur, sel) {
  const brut = await dechiffrer(await cleAppareil(moitie, secretServeur, sel), enveloppe, 'aureus-appareil');
  const cle = await cleAes(brut);
  brut.fill(0);
  return cle;
}

// --------------------------------------------------------------------------------------------------- fiches

/** Une fiche = un objet JS chiffré par la clé du coffre ; son identifiant est lié au chiffré (pas d'échange de fiches). */
export async function chiffrerFiche(cle, id, objet) {
  return chiffrer(cle, enc.encode(JSON.stringify(objet)), 'aureus-fiche:' + id);
}

export async function dechiffrerFiche(cle, id, texte) {
  return JSON.parse(dec.decode(await dechiffrer(cle, texte, 'aureus-fiche:' + id)));
}

// ------------------------------------------------------------------------------------- lien autodestructible

/** Chiffre un message avec une clé à usage unique ; la clé ne va QUE dans le lien (après le #). */
export async function chiffrerLien(texte) {
  const brut = hasard(32);
  const donnees = await chiffrer(await cleAes(brut), enc.encode(texte), 'aureus-lien');
  return { donnees, cle: b64url(brut) };
}

export async function dechiffrerLien(donnees, cle) {
  return dec.decode(await dechiffrer(await cleAes(deb64url(cle)), donnees, 'aureus-lien'));
}

/** Mot de passe tiré au hasard (sans caractères qui se confondent). */
export function motDePasse(longueur = 20) {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_!?@#%+=';
  const out = [];
  while (out.length < longueur) {
    const x = hasard(1)[0];
    if (x < 256 - (256 % a.length)) out.push(a[x % a.length]);
  }
  return out.join('');
}
