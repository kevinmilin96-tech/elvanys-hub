// Hub Elvanys : affiche les applications d'une entreprise selon le profil choisi sur cet appareil.
(function () {
  'use strict';

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
  };

  // --- Entreprise : sous-domaine (blaye.elvanys.fr) ou ?e=blaye, sinon celle par défaut ---------
  var all = window.HUB_ENTREPRISES || {};
  var fromQuery = new URLSearchParams(location.search).get('e');
  var fromHost = location.hostname.split('.')[0].replace(/-hub$/, '');
  var id = (fromQuery && all[fromQuery]) ? fromQuery : (all[fromHost] ? fromHost : window.HUB_ENTREPRISE_PAR_DEFAUT);
  var ent = all[id];
  if (!ent) { document.body.textContent = 'Entreprise inconnue.'; return; }

  var $ = function (sel) { return document.querySelector(sel); };
  var root = document.documentElement;

  // --- Identité --------------------------------------------------------------------------------
  document.title = ent.nom;
  $('#nom').textContent = ent.nom;
  $('#societe').textContent = ent.societe || '';
  $('#accueil').textContent = ent.accueil || '';
  $('#contact').textContent = ent.contact || '';
  loadContact();
  if (ent.pastille) { $('#pastille').src = ent.pastille; } else { $('#pastille').remove(); }
  $('#logo').alt = ent.nom;

  // --- Contact « Besoin d'aide ? » : réglé dans Vigilys (Paramètres > Hub du magasin) ----------
  // Sans réponse du serveur (fichier ouvert en local, coupure), le message de la fiche reste affiché.
  function loadContact() {
    if (!ent.contactApi || !/^https?:$/.test(location.protocol) || !window.fetch) return;
    fetch(ent.contactApi, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c) return;
        var name = [c.prenom, c.nom].filter(Boolean).join(' ');
        if (!name && !c.email) return;
        var el = $('#contact');
        el.textContent = 'Contactez ' + (name || 'nous') + (c.email ? ' : ' : '');
        if (c.email) {
          var a = document.createElement('a');
          a.href = 'mailto:' + c.email;
          a.textContent = c.email;
          el.appendChild(a);
        }
      })
      .catch(function () { /* message par défaut conservé */ });
  }

  var date = new Date();
  var h = date.getHours();
  $('#hello').textContent = (h < 6 || h >= 18) ? 'Bonsoir' : 'Bonjour';
  var d = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#date').textContent = d.charAt(0).toUpperCase() + d.slice(1);

  // --- Thème (clair / sombre), couleurs de l'entreprise ----------------------------------------
  function applyTheme(theme) {
    root.dataset.theme = theme;
    var c = (ent.couleurs && ent.couleurs[theme === 'dark' ? 'sombre' : 'clair']) || {};
    if (c.principale) root.style.setProperty('--brand', c.principale);
    if (c.accent) root.style.setProperty('--accent', c.accent);
    var logo = ent.logo && (theme === 'dark' ? ent.logo.sombre : ent.logo.clair);
    if (logo) $('#logo').src = logo;
    $('#theme-toggle').setAttribute('aria-checked', String(theme === 'dark'));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a1622' : (c.principale || '#0e70b5'));
  }
  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  $('#theme-toggle').addEventListener('click', function () {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set('hub_theme', next);
    applyTheme(next);
  });

  // --- Icônes des applications (traits fins, comme les tuiles de la maquette) -------------------
  var ICONS = {
    boost: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="13.5"/><circle cx="24" cy="24" r="7"/></svg>',
    vigilys: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="10" y="10" width="28" height="28"/><path d="M24 4 L44 24 L24 44 L4 24 Z"/><circle cx="24" cy="24" r="8"/></svg>',
    bientot: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="24" cy="17" r="10"/><circle cx="17" cy="29" r="10"/><circle cx="31" cy="29" r="10"/></svg>',
  };

  // --- Profil (sur cet appareil) et tuiles -----------------------------------------------------
  var profils = ent.profils || [];
  var key = 'hub_profil_' + id;
  var profil = store.get(key);
  if (!profils.some(function (p) { return p.id === profil; })) profil = null;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }

  function render() {
    var current = profils.find(function (p) { return p.id === profil; });
    $('#profile-label').textContent = current ? (current.court || current.nom) : 'Choisir mon profil';
    var apps = (ent.applications || []).filter(function (a) { return !profil || a.pour.indexOf(profil) !== -1; });
    $('#apps-note').textContent = current ? 'Profil : ' + current.nom : 'Tous les profils';
    var html = apps.map(function (a, i) {
      return '<a class="tile tone-' + esc(a.couleur || 'principale') + '" href="' + esc(a.url) + '" style="--i:' + i + '">' +
        '<span class="tile-ico">' + (ICONS[a.icone] || ICONS.bientot) + '</span>' +
        '<span class="tile-name">' + esc(a.nom) + '</span>' +
        '<span class="tile-desc">' + esc(a.description) + '</span>' +
        '<span class="tile-foot"><span class="tile-chip">' + esc(a.public || '') + '</span>' +
        '<span class="tile-go">Ouvrir <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></span>' +
        '</a>';
    }).join('');
    html += '<div class="tile is-soon" style="--i:' + apps.length + '"><span class="tile-ico">' + ICONS.bientot + '</span>' +
      '<span class="tile-name">Bientôt</span><span class="tile-desc">Les prochains outils du magasin apparaîtront ici.</span></div>';
    $('#tiles').innerHTML = html;
  }

  var dialog = $('#profiles');
  function openProfiles() {
    $('#profile-list').innerHTML = profils.map(function (p) {
      return '<button type="button" class="profile-option' + (p.id === profil ? ' is-on' : '') + '" data-id="' + esc(p.id) + '">' +
        '<strong>' + esc(p.nom) + '</strong><span>' + esc(p.detail || '') + '</span></button>';
    }).join('');
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }
  $('#profile-list').addEventListener('click', function (e) {
    var b = e.target.closest('.profile-option');
    if (!b) return;
    profil = b.getAttribute('data-id');
    store.set(key, profil);
    render();
    if (dialog.close) dialog.close(); else dialog.removeAttribute('open');
  });
  $('#profile-chip').addEventListener('click', openProfiles);

  render();
  if (!profil && profils.length) setTimeout(openProfiles, 400);

  // --- Bulles (clin d'œil au logo du magasin) ---------------------------------------------------
  var bubbles = $('.bubbles');
  for (var i = 0; i < 14; i++) {
    var b = document.createElement('span');
    var size = 12 + Math.round(Math.random() * 46);
    b.style.width = b.style.height = size + 'px';
    b.style.left = Math.round(Math.random() * 100) + '%';
    b.style.animationDuration = (10 + Math.random() * 12).toFixed(1) + 's';
    b.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
    bubbles.appendChild(b);
  }
})();
