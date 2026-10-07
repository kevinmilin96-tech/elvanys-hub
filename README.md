# Hub Elvanys

Page d'accueil de chaque entreprise : ses applications (Boost, Vigilys…) en tuiles.

- `config/entreprises.js` : une fiche par entreprise (nom, logos, couleurs, profils, applications et liens).
- L'entreprise est choisie par l'adresse (`blaye.elvanys.fr` → `blaye`) ou `?e=blaye`.
- Les profils (Collaborateur, Agent de sécurité / Agent de maintenance, Direction) trient seulement les tuiles sur l'appareil :
  chaque application garde sa propre connexion et ses droits.
- Site statique : aucun build, il suffit de copier le dossier sur le serveur.

## Mise en ligne et nouvelle version

`index.html` contient `__VERSION__` (balise `hub-version` et `?v=` des fichiers). À chaque mise en ligne :
1. copier le dossier, remplacer `__VERSION__` par un numéro nouveau (date-heure, ex. `20261007-2330`) ;
2. écrire ce même numéro dans `version.txt` à la racine.

Le serveur ne garde pas `index.html` en cache ; les autres fichiers changent d'adresse grâce à `?v=`.
Un hub déjà ouvert lit `version.txt` (au retour sur la page et toutes les 10 min) et affiche « Nouvelle version du hub ».
