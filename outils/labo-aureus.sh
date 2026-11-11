#!/usr/bin/env bash
# Décision D22 (11/11/2026) : Aureus vit dans le LABO PERSO (perso.elvanys.fr). Recopie aureus/ dans labo/aureus/ en
# l'adaptant : version posée dans les adresses (le labo n'a pas d'étape « __VERSION__ »), connexion par la page du labo,
# fiche d'entreprise « perso » (labo/config/entreprises.js). À relancer après chaque changement d'Aureus, puis
# commit + push + ~/outils/perso-site.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
V=$(git log -1 --format=%h -- aureus)
rm -rf labo/aureus; mkdir -p labo/aureus labo/config
cp aureus/*.js aureus/*.html aureus/*.css aureus/*.svg labo/aureus/
rm -f labo/aureus/maquettes.html
sed -i "s/__VERSION__/$V/g; s#\.\./?rester=1#/connexion.html?retour=/aureus/index.html#g; s#Retour à l'espace magasin#Retour au laboratoire#; s#votre compte de l’espace magasin#votre compte du laboratoire#; s#Me connecter à l’espace magasin#Me connecter au laboratoire#; s#Retour à l’espace magasin#Retour au laboratoire#" labo/aureus/*
# « Retour au laboratoire » (après un message) et le logo d'en-tête ramènent à l'accueil du labo (pas à la connexion : boucle)
sed -i 's#au-btn ghost" href="/connexion.html?retour=/aureus/index.html"#au-btn ghost" href="/"#' labo/aureus/app.js
# le logo d'en-tête ramène à l'accueil du labo
sed -i 's#href="/connexion.html?retour=/aureus/index.html" title="Retour au laboratoire"#href="/" title="Retour au laboratoire"#' labo/aureus/index.html
cat > labo/config/entreprises.js <<'JS'
// Laboratoire perso (perso.elvanys.fr) : une seule « entreprise », pour Aureus (décision D22 du 11/11/2026).
// La session est celle que range la page de connexion du labo (localStorage « hub_session_perso »).
window.HUB_ENTREPRISES = { perso: { id: 'perso', nom: 'Laboratoire perso', applications: [] } };
window.HUB_ENTREPRISE_PAR_DEFAUT = 'perso';
JS
grep -l "__VERSION__\|rester=1\|espace magasin" labo/aureus/* && { echo "Il reste des liens à adapter"; exit 1; } || echo "labo/aureus prêt (version $V)"
