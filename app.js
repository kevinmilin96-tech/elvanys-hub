// Hub Elvanys : connexion au compte du magasin, puis applications autorisées pour ce compte.
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
    boost: '<svg viewBox="0 0 48 48" fill="none" stroke-width="2.2" aria-hidden="true"><circle cx="24" cy="24" r="21" stroke="#5fb84a"/><circle cx="24" cy="24" r="16.5" stroke="#f7862a"/><circle cx="24" cy="24" r="12" stroke="#2a7fc1"/><circle cx="24" cy="24" r="7.5" stroke="#e5262c"/><circle cx="24" cy="24" r="3" fill="#6b2bd9" stroke="none"/></svg>',
    vigilys: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="10" y="10" width="28" height="28"/><path d="M24 4 L44 24 L24 44 L4 24 Z"/><circle cx="24" cy="24" r="8"/></svg>',
    bientot: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="24" cy="17" r="10"/><circle cx="17" cy="29" r="10"/><circle cx="31" cy="29" r="10"/></svg>',
  };

  // --- Comptes : connexion, tuiles selon le compte, accès direct, administration -------------
  // Tout passe par les routes /api/hub/* du serveur du magasin (même adresse que le hub).
  // Copie locale (localhost) : serveur de test, réglable par localStorage « hub_api ».
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = isLocal ? (store.get('hub_api') || 'http://127.0.0.1:8098') : '';
  var SESSION_KEY = 'hub_session_' + id;
  var token = store.get(SESSION_KEY);
  var account = null;
  var profils = ent.profils || [];
  var params = new URLSearchParams(location.search);
  var stay = params.has('rester');
  // ?inscription : une appli (ex. l'Académie de Boost) envoie ici pour créer un compte
  var wantSignup = params.has('inscription');
  // ?reset=<jeton> : lien « mot de passe oublié » reçu par e-mail (retiré tout de suite de l'adresse)
  var resetToken = params.get('reset') || '';
  if (stay || wantSignup || resetToken) {
    params.delete('rester');
    params.delete('inscription');
    params.delete('reset');
    var q = params.toString();
    history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }

  function api(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = token;
    return fetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) { return { status: r.status, data: data || {} }; });
      })
      .catch(function () { return { status: 0, data: { message: 'Pas de connexion au serveur. Réessayez.' } }; });
  }

  function setSession(t) {
    token = t || null;
    if (t) store.set(SESSION_KEY, t); else { try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignoré */ } }
  }

  function profilName(pid) {
    var p = profils.find(function (x) { return x.id === pid; });
    return p ? p.nom : '';
  }
  function appById(aid) {
    return (ent.applications || []).find(function (a) { return a.id === aid; });
  }

  // Couleurs de Boost : une par lettre (Bien-être, Organisation, Optimisation, Sécurité, Travail)
  var BOOST_COLORS = ['#5fb84a', '#f7862a', '#2a7fc1', '#e5262c', '#6b2bd9'];
  function tileName(a) {
    if (a.couleur !== 'boost') return esc(a.nom);
    return String(a.nom).toUpperCase().split('').map(function (ch, i) {
      return '<span style="color:' + BOOST_COLORS[i % BOOST_COLORS.length] + '">' + esc(ch) + '</span>';
    }).join('');
  }

  // Lien vers une application, avec l'adresse du hub (bouton « Espace magasin » dans l'application)
  // et, si l'application sait le lire, un passe à usage unique (pas de seconde connexion).
  function appLink(a, code) {
    var back = location.href.split('#')[0];
    var url = a.url + (a.url.indexOf('?') === -1 ? '?' : '&') + 'hub=' + encodeURIComponent(back);
    return code ? url + '&sso=' + encodeURIComponent(code) : url;
  }
  function openApp(a) {
    if (!a.sso) { location.href = appLink(a); return; }
    api('POST', '/api/hub/sso/start', { app: a.id }).then(function (r) {
      location.href = appLink(a, r.status === 200 ? r.data.code : null);
    });
  }

  // --- Écrans ---
  function show(state) {
    $('#auth').hidden = state !== 'auth';
    $('#apps').hidden = state !== 'apps';
    $('#profile-chip').hidden = state !== 'apps';
  }

  function greet() {
    var hour = new Date().getHours();
    var base = (hour < 6 || hour >= 18) ? 'Bonsoir' : 'Bonjour';
    $('#hello').textContent = account ? base + ' ' + account.prenom : base;
  }

  function renderApps() {
    var mine = (ent.applications || []).filter(function (a) { return account.apps.indexOf(a.id) !== -1; });
    var html = mine.map(function (a, i) {
      return '<a class="tile tone-' + esc(a.couleur || 'principale') + '" href="' + esc(appLink(a)) + '" data-app="' + esc(a.id) + '" style="--i:' + i + '">' +
        '<span class="tile-ico">' + (ICONS[a.icone] || ICONS.bientot) + '</span>' +
        '<span class="tile-name">' + tileName(a) + '</span>' +
        '<span class="tile-desc">' + esc(a.description) + '</span>' +
        '<span class="tile-foot"><span class="tile-chip">' + esc(a.public || '') + '</span>' +
        '<span class="tile-go">Ouvrir <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></span>' +
        '</a>';
    }).join('');
    if (!mine.length) {
      html = '<div class="tile is-soon"><span class="tile-name">Aucune application</span><span class="tile-desc">Votre responsable n\'a pas encore ouvert d\'application pour votre compte.</span></div>';
    } else {
      html += '<div class="tile is-soon" style="--i:' + mine.length + '"><span class="tile-ico">' + ICONS.bientot + '</span>' +
        '<span class="tile-name">Bientôt</span><span class="tile-desc">Les prochains outils du magasin apparaîtront ici.</span></div>';
    }
    $('#tiles').innerHTML = html;
  }
  $('#tiles').addEventListener('click', function (e) {
    var t = e.target.closest('a.tile[data-app]');
    if (!t) return;
    var a = appById(t.getAttribute('data-app'));
    if (!a || !a.sso) return; // lien simple
    e.preventDefault();
    openApp(a);
  });

  function setBadge(pending) {
    var badge = $('#admin-badge');
    badge.hidden = !pending;
    badge.textContent = pending ? String(pending) : '';
  }

  function enter(acc, pending, fromLogin) {
    account = acc;
    greet();
    $('#profile-label').textContent = acc.prenom;
    renderApps();
    show('apps');
    $('#admin-btn').hidden = !acc.admin;
    setBadge(pending);
    // Accès direct : on part tout de suite dans l'application (sauf retour volontaire au hub)
    var direct = acc.acces_direct && appById(acc.acces_direct);
    if (direct && acc.apps.indexOf(direct.id) !== -1 && (!stay || fromLogin)) startDirect(direct);
  }

  var directTimer = null;
  function startDirect(a) {
    $('#direct-text').textContent = 'Ouverture de ' + a.nom + '…';
    $('#direct').hidden = false;
    directTimer = setTimeout(function () { openApp(a); }, 1200);
  }
  $('#direct-stay').addEventListener('click', function () {
    clearTimeout(directTimer);
    $('#direct').hidden = true;
  });

  function leave(message) {
    account = null;
    setSession(null);
    greet();
    show('auth');
    switchTab('login');
    if (message) $('#login-form .auth-msg').textContent = message;
  }

  // --- Connexion / demande de compte ---
  function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(function (b) {
      var on = b.getAttribute('data-tab') === tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    $('#login-form').hidden = tab !== 'login';
    $('#signup-form').hidden = tab !== 'signup';
    if (tab === 'signup') loadSectors();
    $('#forgot-form').hidden = true;
    $('#reset-form').hidden = true;
    $('#auth-done').hidden = true;
    document.querySelector('.auth-tabs').hidden = false;
  }
  // Écrans « mot de passe oublié » et « nouveau mot de passe » (sans les onglets)
  function showAuthForm(id) {
    ['#login-form', '#signup-form', '#forgot-form', '#reset-form', '#auth-done'].forEach(function (sel) { $(sel).hidden = sel !== id; });
    document.querySelector('.auth-tabs').hidden = true;
    var first = $(id).querySelector('input');
    if (first) first.focus();
  }
  document.querySelectorAll('.auth-tab').forEach(function (b) {
    b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); });
  });
  document.querySelectorAll('.pwd-eye').forEach(function (b) {
    b.addEventListener('click', function () {
      var input = b.parentNode.querySelector('input');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
  function doneScreen(icon, title, text) {
    $('#login-form').hidden = true;
    $('#signup-form').hidden = true;
    $('#forgot-form').hidden = true;
    $('#reset-form').hidden = true;
    document.querySelector('.auth-tabs').hidden = true;
    document.querySelector('.auth-done-ico').textContent = icon;
    $('#auth-done-title').textContent = title;
    $('#auth-done-text').textContent = text;
    $('#auth-done').hidden = false;
  }
  $('#auth-back').addEventListener('click', function () { switchTab('login'); });

  function busy(form, on) {
    var b = form.querySelector('button[type="submit"]');
    b.disabled = on;
    if (on) { b.dataset.label = b.textContent; b.textContent = 'Un instant…'; } else if (b.dataset.label) b.textContent = b.dataset.label;
  }

  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = f.querySelector('.auth-msg');
    msg.textContent = '';
    if (!f.email.value.trim() || !f.password.value) { msg.textContent = 'Indiquez votre e-mail et votre mot de passe.'; return; }
    busy(f, true);
    api('POST', '/api/hub/login', { email: f.email.value, password: f.password.value }).then(function (r) {
      busy(f, false);
      if (r.status === 200 && r.data.token) {
        setSession(r.data.token);
        unlockAdmin();
        f.reset();
        enter(r.data.meta.account, 0, true);
        refreshMe(); // compteur des demandes (administrateurs)
      } else if (r.status === 403 && r.data.code === 'en_attente') {
        doneScreen('⏳', 'Compte en attente', 'Votre compte attend encore la validation d\'un responsable du magasin.');
      } else {
        msg.textContent = r.data.message || 'Connexion impossible.';
      }
    });
  });

  // « Vos données » (formulaire Créer un compte) : la mention RGPD réglée par l'animateur de Boost (/api/hub/rgpd, public,
  // aucune donnée sur les salariés). Le détail complet est dans Boost → Profil → « Mes données ».
  (function () {
    var btn = document.getElementById('signup-rgpd-btn');
    var box = document.getElementById('signup-rgpd');
    if (!btn || !box) return;
    var TODO = 'à compléter par le magasin';
    btn.addEventListener('click', function () {
      var show = box.hidden;
      box.hidden = !show;
      btn.setAttribute('aria-expanded', show ? 'true' : 'false');
      if (!show || box.dataset.loaded) return;
      box.textContent = 'Chargement…';
      api('GET', '/api/hub/rgpd').then(function (r) {
        if (r.status !== 200) { box.textContent = 'Détail indisponible pour le moment : réessayez dans un instant.'; return; }
        var g = r.data || {};
        box.dataset.loaded = '1';
        box.innerHTML =
          '<p><b>Ce qui est gardé :</b> vos prénom, nom, e-mail et secteur, et dans Boost votre progression (points, badges), ' +
          'vos parties de Versus et les mercis envoyés. Vos réponses aux questionnaires Pulse restent <b>anonymes</b>.</p>' +
          '<p><b>Jamais utilisé</b> pour évaluer ou noter qui que ce soit : la direction ne voit que des totaux.</p>' +
          '<p><b>Durée :</b> ' + esc(g.duree_compte || TODO) + ' (activité : ' + esc(g.duree_activite || TODO) + ').</p>' +
          '<p><b>Responsable :</b> ' + esc(g.responsable || TODO) + (g.adresse ? ', ' + esc(g.adresse) : '') +
          '. <b>Contact :</b> ' + esc(g.contact || TODO) + '.</p>' +
          '<p>Vous pouvez voir vos données, les faire corriger ou demander leur suppression (Boost → Profil → « Mes données »), ' +
          'et saisir la CNIL (cnil.fr) en cas de désaccord.</p>';
      });
    });
  })();

  // Secteurs du magasin (liste publique) : le champ n'apparaît que si l'entreprise en a.
  var LATER = '__plus_tard';
  var sectorsLoaded = false;
  function loadSectors() {
    if (sectorsLoaded) return;
    sectorsLoaded = true;
    api('GET', '/api/hub/sectors').then(function (r) {
      var tree = (r.status === 200 && r.data.tree) || [];
      if (!tree.length) return;
      var html = '<option value="">Choisissez votre secteur…</option>';
      tree.forEach(function (loc) {
        if (loc.children.length) {
          html += '<optgroup label="' + esc((loc.emoji ? loc.emoji + ' ' : '') + loc.name) + '">' + loc.children.map(function (c) {
            return '<option value="' + esc(c.id) + '">' + esc((c.emoji ? c.emoji + ' ' : '') + c.name) + '</option>';
          }).join('') + '</optgroup>';
        } else {
          html += '<option value="' + esc(loc.id) + '">' + esc((loc.emoji ? loc.emoji + ' ' : '') + loc.name) + '</option>';
        }
      });
      html += '<option value="' + LATER + '">Je ne trouve pas mon secteur (je le choisirai plus tard)</option>';
      $('#signup-form').secteur.innerHTML = html;
      $('#signup-sector').hidden = false;
    });
  }

  $('#signup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = f.querySelector('.auth-msg');
    msg.textContent = '';
    if (!f.prenom.value.trim()) { msg.textContent = 'Indiquez votre prénom.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) { msg.textContent = 'Adresse e-mail invalide.'; return; }
    var sectorOn = !$('#signup-sector').hidden;
    if (sectorOn && !f.secteur.value) { msg.textContent = 'Choisissez votre secteur (ou « Je ne trouve pas mon secteur »).'; return; }
    if (f.password.value.length < 8) { msg.textContent = 'Mot de passe : 8 caractères minimum.'; return; }
    busy(f, true);
    var secteur = sectorOn && f.secteur.value !== LATER ? f.secteur.value : '';
    api('POST', '/api/hub/signup', { prenom: f.prenom.value, nom: f.nom.value, email: f.email.value, password: f.password.value, secteur: secteur }).then(function (r) {
      busy(f, false);
      if (r.status === 200) {
        f.reset();
        doneScreen('✅', 'Demande envoyée', 'Un responsable du magasin va valider votre compte. Vous pourrez ensuite vous connecter avec votre e-mail et votre mot de passe.');
      } else {
        msg.textContent = r.data.message || 'Envoi impossible.';
      }
    });
  });

  // --- Mot de passe oublié ---
  $('#forgot-open').addEventListener('click', function () {
    var mail = $('#login-form').email.value;
    showAuthForm('#forgot-form');
    if (mail) $('#forgot-form').email.value = mail;
  });
  document.querySelectorAll('[data-back-login]').forEach(function (b) {
    b.addEventListener('click', function () { switchTab('login'); });
  });
  $('#forgot-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = f.querySelector('.auth-msg');
    msg.textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) { msg.textContent = 'Adresse e-mail invalide.'; return; }
    busy(f, true);
    api('POST', '/api/hub/password/forgot', { email: f.email.value }).then(function (r) {
      busy(f, false);
      if (r.status === 200) {
        f.reset();
        doneScreen('📧', 'Regardez vos e-mails', 'Si cette adresse correspond à un compte validé, un lien vient de partir. Il marche une seule fois, pendant 30 minutes. Pensez à regarder dans les indésirables.');
      } else {
        msg.textContent = r.data.message || 'Envoi impossible.';
      }
    });
  });
  $('#reset-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = f.querySelector('.auth-msg');
    msg.textContent = '';
    if (f.password.value.length < 8) { msg.textContent = 'Mot de passe : 8 caractères minimum.'; return; }
    if (f.password.value !== f.password2.value) { msg.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
    busy(f, true);
    api('POST', '/api/hub/password/reset', { token: resetToken, password: f.password.value }).then(function (r) {
      busy(f, false);
      if (r.status === 200) {
        resetToken = '';
        f.reset();
        doneScreen('🔑', 'Mot de passe changé', 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.');
      } else {
        msg.textContent = r.data.message || 'Enregistrement impossible.';
      }
    });
  });

  // --- Mon compte ---
  function openSheet(d) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
  function closeSheet(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { closeSheet(b.closest('dialog')); });
  });

  $('#profile-chip').addEventListener('click', function () {
    if (!account) return;
    var apps = account.apps.map(function (aid) { var a = appById(aid); return a ? a.nom : aid; });
    var direct = account.acces_direct && appById(account.acces_direct);
    $('#account-card').innerHTML =
      '<strong>' + esc(account.prenom + ' ' + (account.nom || '')) + '</strong>' +
      '<span>' + esc(account.email) + '</span>' +
      '<span>' + esc(profilName(account.profil) || 'Profil non défini') + (account.admin ? ' · Administrateur' : '') + '</span>' +
      '<span>Applications : ' + esc(apps.join(', ') || 'aucune') + '</span>' +
      (direct ? '<span>Ouverture directe : ' + esc(direct.nom) + '</span>' : '');
    $('#password-form .auth-msg').textContent = '';
    openSheet($('#account-sheet'));
  });

  $('#password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = f.querySelector('.auth-msg');
    msg.classList.remove('is-ok');
    if (f.password.value.length < 8) { msg.textContent = 'Nouveau mot de passe : 8 caractères minimum.'; return; }
    busy(f, true);
    api('POST', '/api/hub/password', { current: f.current.value, password: f.password.value }).then(function (r) {
      busy(f, false);
      if (r.status === 200 && r.data.token) {
        setSession(r.data.token);
        f.reset();
        msg.textContent = 'Mot de passe modifié.';
        msg.classList.add('is-ok');
      } else {
        msg.textContent = r.data.message || 'Modification impossible.';
      }
    });
  });

  // Déconnexion partout : le serveur ferme aussi les sessions ouvertes dans les applis (Boost…).
  $('#logout-btn').addEventListener('click', function () {
    closeSheet($('#account-sheet'));
    api('POST', '/api/hub/logout').then(function () { leave(); });
  });

  // --- Administration des comptes ---
  var adminList = [];
  var adminFilter = 'en_attente';
  var FILTER_LABEL = { en_attente: 'En attente', valide: 'Validés', autres: 'Suspendus / refusés' };
  var STATUT_LABEL = { en_attente: 'En attente', valide: 'Validé', refuse: 'Refusé', suspendu: 'Suspendu' };

  function fmtDate(v) {
    if (!v) return '';
    var d = new Date(String(v).replace(' ', 'T'));
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function inFilter(a, f) {
    return f === 'autres' ? (a.statut === 'refuse' || a.statut === 'suspendu') : a.statut === f;
  }

  function loadAdmin() {
    $('#admin-list').innerHTML = '<p class="admin-empty">Chargement…</p>';
    return api('GET', '/api/hub/admin/accounts').then(function (r) {
      if (r.status !== 200) { $('#admin-list').innerHTML = '<p class="admin-empty">' + esc(r.data.message || 'Liste indisponible.') + '</p>'; return; }
      adminList = r.data;
      refreshCandCount();
      renderAdmin();
    });
  }

  // Applications prévues pour un profil (champ « pour » de la fiche entreprise)
  function appsForProfil(pid) {
    return (ent.applications || []).filter(function (app) { return (app.pour || []).indexOf(pid) !== -1; }).map(function (app) { return app.id; });
  }

  function accountForm(a) {
    // Demande : applications précochées selon le profil proposé
    var checked = a.statut === 'en_attente' && !a.apps.length ? appsForProfil(a.profil || 'collaborateur') : a.apps;
    var apps = (ent.applications || []).map(function (app) {
      return '<label class="chk"><input type="checkbox" name="apps" value="' + esc(app.id) + '"' + (checked.indexOf(app.id) !== -1 ? ' checked' : '') + '> ' + esc(app.nom) + '</label>';
    }).join('');
    var profilOpts = profils.map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (a.profil === p.id ? ' selected' : '') + '>' + esc(p.nom) + '</option>';
    }).join('');
    var directOpts = '<option value="">Non : il arrive sur l\'espace magasin</option>' + (ent.applications || []).map(function (app) {
      return '<option value="' + esc(app.id) + '"' + (a.acces_direct === app.id ? ' selected' : '') + '>Oui : ouvrir ' + esc(app.nom) + '</option>';
    }).join('');
    return '<div class="acc-fields">' +
      '<label>Profil<select name="profil">' + profilOpts + '</select></label>' +
      '<fieldset><legend>Applications</legend>' + apps + '</fieldset>' +
      '<label>Accès direct<select name="acces_direct">' + directOpts + '</select></label>' +
      '<label class="chk"><input type="checkbox" name="admin"' + (a.admin ? ' checked' : '') + (a.id === account.id ? ' disabled' : '') + '> Administrateur (gère les comptes)</label>' +
      '<label class="chk"><input type="checkbox" name="moderateur"' + (a.moderateur ? ' checked' : '') + '> Modérateur (relit les propositions des salariés ; à désigner avec la direction et le CSE)</label>' +
      '<label class="chk"><input type="checkbox" name="createur"' + (a.createur ? ' checked' : '') + '> Créateur (crée des quiz dans le Studio ; sur candidature)</label>' +
      '<label class="chk"><input type="checkbox" name="testeur"' + (a.testeur ? ' checked' : '') + '> Testeur (voit les démos express privées de Boost, pour les présentations au CSE et à la direction)</label>' +
      '<label class="chk"><input type="checkbox" name="animateur"' + (a.animateur ? ' checked' : '') + '> Animateur de Boost (entre dans l’espace animateur avec son mot de passe du hub, seulement dans les rubriques cochées)</label>' +
      animPermsBlock(a) +
      '</div>';
  }

  // Rubriques de l'espace animateur de Boost. Même liste que le serveur (boost_anim_logic.js) et Boost (App.jsx, NAV) :
  // les changer ensemble. Un administrateur a toujours toutes les rubriques.
  var ANIM_RUBRIQUES = [
    ['questionnaires', 'Questionnaires'], ['validation', 'À valider (relecture des quiz)'], ['tokens', 'Jetons'], ['results', 'Résultats'], ['messages', 'Messages'],
    ['direct', 'En direct (mur de réponses)'], ['versus', 'Versus'], ['championnat', 'Championnat'], ['escape', 'Escape game'],
    ['raid', 'Raid du magasin'], ['pronos', 'Pronostics'], ['suggestions', 'Suggestions de quiz'], ['creations', 'Quiz des créateurs et Atelier'],
    ['idees', 'Boîte à idées'], ['saviez', 'Le saviez-vous ?'], ['mercis', 'Mercis'], ['jauges', 'Jauges solidaires (montants privés)'],
    ['modules', 'Modules à débloquer'], ['sectors', 'Secteurs'], ['indicateurs', 'Indicateurs de la direction'],
    ['calendrier', 'Calendrier de l’année'], ['appearance', 'Apparence'], ['devices', 'Appareils'], ['settings', 'Réglages et « Mes données »'],
    ['testeurs', 'Testeurs (démo)'],
  ];
  var ANIM_PRESETS = {
    animateur: ['questionnaires', 'validation', 'tokens', 'results', 'messages', 'versus', 'championnat', 'escape', 'raid', 'direct', 'pronos', 'suggestions', 'creations', 'idees', 'mercis', 'saviez'],
    chef: ['direct'], // chef d'équipe : seulement de petites animations en direct (mur de réponses)
    relecteur: ['validation'], // relecteur (ex. référent sécurité) : lit les quiz en attente et laisse des remarques (décision du 12/10)
  };
  function animPermsBlock(a) {
    var mine = a.anim_perms || [];
    var boxes = ANIM_RUBRIQUES.map(function (r) {
      return '<label class="chk"><input type="checkbox" name="anim_perms" value="' + r[0] + '"' + (mine.indexOf(r[0]) !== -1 ? ' checked' : '') + '> ' + esc(r[1]) + '</label>';
    }).join('');
    return '<fieldset class="anim-perms"' + (a.animateur ? '' : ' style="display:none"') + '><legend>Rubriques de l’espace animateur</legend>' +
      (a.admin ? '<p class="journal-note">Administrateur : il a déjà toutes les rubriques.</p>' : '') +
      '<p class="anim-presets">Profil tout prêt : <button type="button" class="btn-soft" data-preset="animateur">Animateur</button> ' +
      '<button type="button" class="btn-soft" data-preset="chef">Chef d’équipe (En direct seulement)</button> ' +
      '<button type="button" class="btn-soft" data-preset="relecteur">Relecteur (À valider seulement)</button></p>' + boxes + '</fieldset>';
  }
  function setAnimPerms(card, list) {
    card.querySelectorAll('input[name="anim_perms"]').forEach(function (b) { b.checked = list.indexOf(b.value) !== -1; });
  }

  function renderAdmin() {
    document.querySelectorAll('#admin-filter button').forEach(function (b) {
      var f = b.getAttribute('data-filter');
      var n = adminList.filter(function (a) { return inFilter(a, f); }).length;
      b.classList.toggle('is-on', f === adminFilter);
      b.textContent = f === 'journal' ? 'Journal' : f === 'candidatures' ? 'Candidatures' + (candPending ? ' (' + candPending + ')' : '') : FILTER_LABEL[f] + ' (' + n + ')';
    });
    if (adminFilter === 'journal') { loadJournal(); return; }
    if (adminFilter === 'candidatures') { loadCandidatures(); return; }
    var list = adminList.filter(function (a) { return inFilter(a, adminFilter); });
    if (!list.length) {
      $('#admin-list').innerHTML = '<p class="admin-empty">' + (adminFilter === 'en_attente' ? 'Aucune demande en attente.' : 'Aucun compte ici.') + '</p>';
      return;
    }
    $('#admin-list').innerHTML = list.map(function (a) {
      var self = a.id === account.id;
      var meta = a.statut === 'en_attente' ? 'Demande du ' + fmtDate(a.created)
        : (a.valide_le ? 'Validé le ' + fmtDate(a.valide_le) + (a.valide_par ? ' par ' + a.valide_par : '') : STATUT_LABEL[a.statut]) +
          (a.dernier_acces ? ' · dernière connexion le ' + fmtDate(a.dernier_acces) : '');
      var actions;
      if (a.statut === 'en_attente') {
        actions = '<button type="button" class="btn-main" data-act="valider">Valider</button>' +
          '<button type="button" class="btn-soft" data-act="refuser">Refuser</button>';
      } else if (a.statut === 'valide') {
        actions = '<button type="button" class="btn-main" data-act="enregistrer">Enregistrer</button>' +
          (self ? '' : '<button type="button" class="btn-soft" data-act="mdp">Mot de passe provisoire</button>' +
            '<button type="button" class="btn-soft danger" data-act="suspendre">Suspendre</button>');
      } else {
        actions = '<button type="button" class="btn-main" data-act="valider">Réactiver</button>' +
          '<button type="button" class="btn-soft danger" data-act="supprimer">Supprimer</button>';
      }
      return '<article class="acc" data-id="' + esc(a.id) + '">' +
        '<div class="acc-head"><span class="acc-avatar" aria-hidden="true">' + esc((a.prenom || '?').charAt(0).toUpperCase()) + '</span>' +
        '<div><strong>' + esc(a.prenom + ' ' + (a.nom || '')) + (self ? ' <em>(vous)</em>' : '') + '</strong><span>' + esc(a.email) + '</span><small>' + esc(meta) + '</small></div></div>' +
        (a.statut === 'refuse' ? '' : accountForm(a)) +
        '<p class="acc-msg" role="status"></p>' +
        '<div class="acc-actions">' + actions + '</div>' +
        '</article>';
    }).join('');
  }

  // Changer le profil d'une demande recoche les applications prévues pour ce profil
  // Case « Animateur » : montre les rubriques ; cochée la première fois, profil « Animateur » précoché
  $('#admin-list').addEventListener('change', function (e) {
    if (e.target.name !== 'animateur') return;
    var card = e.target.closest('.acc');
    var box = card.querySelector('.anim-perms');
    if (box) box.style.display = e.target.checked ? '' : 'none';
    var any = Array.prototype.some.call(card.querySelectorAll('input[name="anim_perms"]'), function (b) { return b.checked; });
    if (e.target.checked && !any) setAnimPerms(card, ANIM_PRESETS.animateur);
  });
  $('#admin-list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-preset]');
    if (!b) return;
    setAnimPerms(b.closest('.acc'), ANIM_PRESETS[b.getAttribute('data-preset')] || []);
  });

  $('#admin-list').addEventListener('change', function (e) {
    if (e.target.name !== 'profil') return;
    var card = e.target.closest('.acc');
    var acc = adminList.find(function (x) { return x.id === card.getAttribute('data-id'); });
    if (!acc || acc.statut !== 'en_attente') return;
    var want = appsForProfil(e.target.value);
    card.querySelectorAll('input[name="apps"]').forEach(function (b) { b.checked = want.indexOf(b.value) !== -1; });
  });

  // --- Candidatures « Devenir modérateur / créateur » (envoyées depuis le Profil de Boost) ---
  // Décision avec la direction et le CSE ; accepter coche la case du compte ; un refus demande un mot d'explication.
  var candPending = 0;
  var ROLE_LABEL = { moderateur: 'Modérateur', createur: 'Créateur', testeur: 'Testeur' };
  var CAND_STATUS = { en_attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée' };
  function refreshCandCount() {
    api('GET', '/api/hub/admin/candidatures').then(function (r) {
      if (r.status !== 200) return;
      candPending = r.data.filter(function (c) { return c.status === 'en_attente'; }).length;
      var b = document.querySelector('#admin-filter button[data-filter="candidatures"]');
      if (b) b.textContent = 'Candidatures' + (candPending ? ' (' + candPending + ')' : '');
    });
  }
  function loadCandidatures() {
    $('#admin-list').innerHTML = '<p class="admin-empty">Chargement…</p>';
    api('GET', '/api/hub/admin/candidatures').then(function (r) {
      if (adminFilter !== 'candidatures') return;
      if (r.status !== 200) { $('#admin-list').innerHTML = '<p class="admin-empty">' + esc(r.data.message || 'Indisponible.') + '</p>'; return; }
      candPending = r.data.filter(function (c) { return c.status === 'en_attente'; }).length;
      var intro = '<p class="journal-note">Les salariés candidatent depuis leur Profil dans Boost. Décidez avec la direction et le CSE : accepter coche la case du compte ; refuser demande un mot d’explication, que la personne lira.</p>';
      if (!r.data.length) { $('#admin-list').innerHTML = intro + '<p class="admin-empty">Aucune candidature pour le moment.</p>'; return; }
      $('#admin-list').innerHTML = intro + r.data.map(function (c) {
        var a = c.account || {};
        var head = '<div class="acc-head"><span class="acc-avatar" aria-hidden="true">' + esc((a.prenom || '?').charAt(0).toUpperCase()) + '</span>' +
          '<div><strong>' + esc((a.prenom || '') + ' ' + (a.nom || '')) + ' · ' + esc(ROLE_LABEL[c.role] || c.role) + '</strong>' +
          '<span>' + esc(a.email || '') + (a.sector ? ' · ' + esc(a.sector) : '') + '</span>' +
          '<small>Candidature du ' + esc(fmtDate(c.created)) + (a.since ? ' · compte depuis le ' + esc(fmtDate(a.since)) : '') + '</small></div></div>';
        var body = '<p class="cand-motivation">« ' + esc(c.motivation) + ' »</p>';
        if (c.status !== 'en_attente') {
          return '<article class="acc">' + head + body + '<p class="acc-msg">' + esc(CAND_STATUS[c.status] || c.status) + (c.decided_by ? ' par ' + esc(c.decided_by) : '') + (c.note ? ' · « ' + esc(c.note) + ' »' : '') + '</p></article>';
        }
        return '<article class="acc" data-cand="' + esc(c.id) + '">' + head + body +
          '<label class="cand-note">Mot pour la personne <small>(obligatoire en cas de refus)</small><textarea rows="2" maxlength="500"></textarea></label>' +
          '<p class="acc-msg" role="status"></p>' +
          '<div class="acc-actions"><button type="button" class="btn-main" data-cand-act="acceptee">Accepter</button><button type="button" class="btn-soft" data-cand-act="refusee">Refuser</button></div></article>';
      }).join('');
    });
  }
  $('#admin-list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-cand-act]');
    if (!b) return;
    var card = b.closest('[data-cand]');
    var decision = b.getAttribute('data-cand-act');
    var note = card.querySelector('textarea').value;
    if (decision === 'acceptee' && !window.confirm('Accepter cette candidature ? La case sera cochée sur son compte.')) return;
    b.disabled = true;
    api('POST', '/api/hub/admin/candidatures/' + card.getAttribute('data-cand'), { decision: decision, note: note }).then(function (r) {
      b.disabled = false;
      if (r.status !== 200) { card.querySelector('.acc-msg').textContent = r.data.message || 'Impossible.'; return; }
      loadAdmin();
    });
  });

  // --- Journal : qui a fait quoi sur les comptes (lecture seule) ---
  var ACTION_LABEL = {
    demande: 'a demandé un compte',
    validation: 'a validé le compte de',
    reactivation: 'a réactivé le compte de',
    refus: 'a refusé la demande de',
    suspension: 'a suspendu le compte de',
    remise_en_attente: 'a remis en attente le compte de',
    droits: 'a modifié les droits de',
    mot_de_passe_provisoire: 'a donné un mot de passe provisoire à',
    mot_de_passe_modifie: 'a changé son mot de passe',
    mot_de_passe_reinitialise: 'a choisi un nouveau mot de passe (lien reçu par e-mail)',
    suppression: 'a supprimé le compte de',
    candidature: 'a envoyé une candidature',
    candidature_refusee: 'n’a pas retenu la candidature de',
    entree_animateur: 'a ouvert l’espace animateur de Boost',
  };
  var FIELD_LABEL = { statut: 'Statut', profil: 'Profil', apps: 'Applications', acces_direct: 'Accès direct', admin: 'Administrateur', moderateur: 'Modérateur', createur: 'Créateur', testeur: 'Testeur', animateur: 'Animateur', anim_perms: 'Rubriques animateur' };
  function shortName(label) { return String(label || '').replace(/s*<[^>]*>$/, '') || '(compte supprimé)'; }
  function fieldValue(k, v) {
    if (k === 'admin' || k === 'moderateur' || k === 'createur' || k === 'testeur' || k === 'animateur') return v ? 'oui' : 'non';
    if (k === 'anim_perms') {
      var ids = String(v || '').split(',').filter(Boolean);
      return ids.length ? ids.map(function (id) { var r = ANIM_RUBRIQUES.filter(function (x) { return x[0] === id; })[0]; return r ? r[1] : id; }).join(', ') : 'aucune';
    }
    if (k === 'statut') return STATUT_LABEL[v] || v;
    if (k === 'apps') return v ? String(v).split(',').map(function (id) { var x = (ent.applications || []).filter(function (a) { return a.id === id; })[0]; return x ? x.nom : id; }).join(', ') : 'aucune';
    if (k === 'profil') { var p = profils.filter(function (x) { return x.id === v; })[0]; return p ? p.nom : v; }
    if (k === 'acces_direct' && v) { var ap = (ent.applications || []).filter(function (x) { return x.id === v; })[0]; return ap ? ap.nom : v; }
    return v || 'non';
  }
  function fmtDateTime(v) {
    var d = new Date(String(v || '').replace(' ', 'T'));
    return isNaN(d) ? '' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function loadJournal() {
    $('#admin-list').innerHTML = '<p class="admin-empty">Chargement…</p>';
    api('GET', '/api/hub/admin/audit').then(function (r) {
      if (adminFilter !== 'journal') return;
      if (r.status !== 200) { $('#admin-list').innerHTML = '<p class="admin-empty">' + esc(r.data.message || 'Journal indisponible.') + '</p>'; return; }
      if (!r.data.length) { $('#admin-list').innerHTML = '<p class="admin-empty">Rien dans le journal pour le moment.</p>'; return; }
      $('#admin-list').innerHTML = '<p class="journal-note">Les 300 dernières actions. Le journal ne peut être ni modifié ni effacé depuis le hub.</p>' + r.data.map(function (l) {
        var who = l.actor ? shortName(l.actor) : (l.action === 'demande' ? shortName(l.target) : 'Sécurité');
        var verb = ACTION_LABEL[l.action] || l.action;
        var target = (l.action === 'demande' || l.action === 'mot_de_passe_modifie' || l.action === 'mot_de_passe_reinitialise' || l.action === 'entree_animateur') ? '' : ' ' + shortName(l.target);
        var det = Object.keys(l.details || {}).filter(function (k) { return FIELD_LABEL[k] && Array.isArray(l.details[k]); }).map(function (k) {
          return '<li>' + esc(FIELD_LABEL[k]) + ' : ' + esc(fieldValue(k, l.details[k][0])) + ' → <b>' + esc(fieldValue(k, l.details[k][1])) + '</b></li>';
        }).join('');
        var line = l.action === 'compte_bloque'
          ? '🔒 Compte de <b>' + esc(shortName(l.target)) + '</b> bloqué 15 min après 5 mots de passe faux'
          : '<b>' + esc(who) + '</b> ' + esc(verb) + '<b>' + esc(target) + '</b>';
        return '<div class="journal-row"><span class="journal-date">' + esc(fmtDateTime(l.created)) + '</span>' +
          '<p>' + line + '</p>' +
          (det ? '<ul>' + det + '</ul>' : '') + '</div>';
      }).join('');
    });
  }

  $('#admin-filter').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-filter]');
    if (!b) return;
    adminFilter = b.getAttribute('data-filter');
    renderAdmin();
  });

  function readForm(card) {
    var out = {};
    var profil = card.querySelector('select[name="profil"]');
    if (profil) out.profil = profil.value;
    var boxes = card.querySelectorAll('input[name="apps"]');
    if (boxes.length) out.apps = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).map(function (b) { return b.value; });
    var direct = card.querySelector('select[name="acces_direct"]');
    if (direct) out.acces_direct = direct.value;
    var adm = card.querySelector('input[name="admin"]');
    if (adm && !adm.disabled) out.admin = adm.checked;
    var mod = card.querySelector('input[name="moderateur"]');
    if (mod) out.moderateur = mod.checked;
    var crea = card.querySelector('input[name="createur"]');
    if (crea) out.createur = crea.checked;
    var tst = card.querySelector('input[name="testeur"]');
    if (tst) out.testeur = tst.checked;
    var anim = card.querySelector('input[name="animateur"]');
    if (anim) {
      out.animateur = anim.checked;
      if (anim.checked) out.anim_perms = Array.prototype.filter.call(card.querySelectorAll('input[name="anim_perms"]'), function (b) { return b.checked; }).map(function (b) { return b.value; });
    }
    return out;
  }

  // Double appui pour confirmer (pas de fenêtre système) : le bouton change de texte 4 s.
  function confirmInline(btn, label) {
    if (btn.dataset.confirm === '1') { btn.dataset.confirm = ''; return true; }
    var old = btn.textContent;
    btn.dataset.confirm = '1';
    btn.textContent = label;
    setTimeout(function () { if (btn.dataset.confirm === '1') { btn.dataset.confirm = ''; btn.textContent = old; } }, 4000);
    return false;
  }

  $('#admin-list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var card = b.closest('.acc');
    var aid = card.getAttribute('data-id');
    var acc = adminList.find(function (x) { return x.id === aid; });
    var msg = card.querySelector('.acc-msg');
    var act = b.getAttribute('data-act');
    msg.textContent = '';
    msg.classList.remove('is-ok');

    if (act === 'mdp') {
      if (!confirmInline(b, 'Confirmer ?')) return;
      api('POST', '/api/hub/admin/accounts/' + aid + '/password').then(function (r) {
        b.textContent = 'Mot de passe provisoire';
        if (r.status !== 200) { msg.textContent = r.data.message || 'Impossible.'; return; }
        msg.innerHTML = 'Mot de passe provisoire de ' + esc(acc.prenom) + ' : <code>' + esc(r.data.password) + '</code><br>Donnez-le-lui : il pourra le changer dans « Mon compte ». Il ne sera plus affiché.';
        msg.classList.add('is-ok');
      });
      return;
    }
    if (act === 'supprimer') {
      if (!confirmInline(b, 'Confirmer la suppression')) return;
      api('DELETE', '/api/hub/admin/accounts/' + aid).then(function (r) {
        if (r.status !== 200) { msg.textContent = r.data.message || 'Impossible.'; return; }
        loadAdmin().then(refreshMe);
      });
      return;
    }
    if (act === 'suspendre' && !confirmInline(b, 'Confirmer ?')) return;
    if (act === 'refuser' && !confirmInline(b, 'Confirmer le refus')) return;

    var body = act === 'refuser' ? { statut: 'refuse' } : act === 'suspendre' ? { statut: 'suspendu' } : readForm(card);
    if (act === 'valider') {
      body.statut = 'valide';
      if (!body.apps || !body.apps.length) { msg.textContent = 'Cochez au moins une application.'; return; }
    }
    b.disabled = true;
    api('POST', '/api/hub/admin/accounts/' + aid, body).then(function (r) {
      b.disabled = false;
      if (r.status !== 200) { msg.textContent = r.data.message || 'Impossible.'; return; }
      var i = adminList.findIndex(function (x) { return x.id === aid; });
      adminList[i] = r.data;
      if (aid === account.id) { account = Object.assign(account, r.data); renderApps(); }
      if (act === 'enregistrer') { msg.textContent = 'Enregistré.'; msg.classList.add('is-ok'); return; }
      renderAdmin();
      refreshMe();
    });
  });

  // --- Verrou de l'administration : mot de passe redemandé après 10 min sans activité ---
  // La dernière activité est gardée sur l'appareil : rouvrir le hub le lendemain redemande le mot de passe.
  var ADMIN_IDLE = 10 * 60 * 1000;
  var ACTIVITY_KEY = 'hub_activity_' + id;
  var lastActivity = Number(store.get(ACTIVITY_KEY)) || 0;
  var savedAt = 0;
  function markActivity() {
    var now = Date.now();
    if (now - lastActivity > ADMIN_IDLE) return; // déjà verrouillé : seule la confirmation rouvre
    lastActivity = now;
    if (now - savedAt > 15000) { savedAt = now; store.set(ACTIVITY_KEY, String(now)); }
  }
  function unlockAdmin() {
    lastActivity = Date.now();
    savedAt = lastActivity;
    store.set(ACTIVITY_KEY, String(lastActivity));
  }
  function adminLocked() { return Date.now() - lastActivity > ADMIN_IDLE; }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, markActivity, { passive: true, capture: true });
  });
  // Administration ouverte mais plus personne ne s'en sert : on la referme.
  setInterval(function () {
    if (adminLocked() && $('#admin-sheet').open) closeSheet($('#admin-sheet'));
  }, 10000);

  function openAdmin() {
    adminFilter = 'en_attente';
    openSheet($('#admin-sheet'));
    loadAdmin();
  }
  $('#admin-btn').addEventListener('click', function () {
    if (!adminLocked()) { markActivity(); openAdmin(); return; }
    var f = $('#admin-lock-form');
    f.reset();
    f.querySelector('.auth-msg').textContent = '';
    openSheet($('#admin-lock'));
  });
  $('#admin-lock-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    var msg = f.querySelector('.auth-msg');
    if (!f.password.value) { msg.textContent = 'Indiquez votre mot de passe.'; return; }
    busy(f, true);
    api('POST', '/api/hub/login', { email: account.email, password: f.password.value }).then(function (r) {
      busy(f, false);
      if (r.status === 200 && r.data.token) {
        setSession(r.data.token);
        unlockAdmin();
        closeSheet($('#admin-lock'));
        openAdmin();
      } else {
        msg.textContent = r.status === 400 ? 'Mot de passe incorrect.' : (r.data.message || 'Vérification impossible.');
      }
    });
  });

  // --- Démarrage : session existante ? ---
  function refreshMe() {
    return api('GET', '/api/hub/me').then(function (r) {
      if (r.status === 200) {
        if (!account) enter(r.data.account, r.data.pending || 0, false);
        else { account = r.data.account; setBadge(r.data.pending || 0); }
      } else if (r.status === 401 || r.status === 403) {
        leave(r.status === 403 ? r.data.message : 'Votre session a expiré, reconnectez-vous.');
      } else if (!account) {
        show('auth');
        $('#login-form .auth-msg').textContent = r.data.message || 'Serveur injoignable.';
      }
    });
  }

  greet();
  if (resetToken) {
    // Lien reçu par e-mail : on choisit le nouveau mot de passe (toutes les sessions tomberont ensuite)
    show('auth');
    showAuthForm('#reset-form');
  } else if (token) refreshMe();
  else {
    show('auth');
    if (wantSignup) {
      switchTab('signup');
      setTimeout(function () { $('#signup-form').scrollIntoView({ block: 'start' }); }, 300);
    }
  }

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

// --- Nouvelle version : le hub vérifie version.txt et propose de recharger -------------------------
// (le profil choisi et le thème restent enregistrés sur l'appareil)
(function () {
  var meta = document.querySelector('meta[name="hub-version"]');
  var current = meta ? meta.content : '';
  if (!current || current === '__VERSION__') return; // copie locale, pas encore mise en ligne
  var shown = false;

  function show() {
    if (shown) return;
    shown = true;
    var bar = document.createElement('div');
    bar.className = 'update-bar';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<span><strong>Nouvelle version du hub</strong><br>Mettez à jour, vos choix sont gardés.</span>' +
      '<button type="button">Mettre à jour</button>';
    bar.querySelector('button').addEventListener('click', function () {
      this.textContent = 'Un instant…';
      this.disabled = true;
      location.reload();
    });
    document.body.appendChild(bar);
  }

  function check() {
    fetch('version.txt?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (v) { v = (v || '').trim(); if (v && v !== current) show(); })
      .catch(function () { /* hors ligne : on réessaiera */ });
  }

  check();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  setInterval(check, 10 * 60 * 1000);
})();
