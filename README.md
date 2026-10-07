# Hub Elvanys

Page d'accueil de chaque entreprise : ses applications (Boost, Vigilys…) en tuiles.

- `config/entreprises.js` : une fiche par entreprise (nom, logos, couleurs, profils, applications et liens).
- L'entreprise est choisie par l'adresse (`blaye.elvanys.fr` → `blaye`) ou `?e=blaye`.
- Les profils (Collaborateur, Agent de sécurité, Direction) trient seulement les tuiles sur l'appareil :
  chaque application garde sa propre connexion et ses droits.
- Site statique : aucun build, il suffit de copier le dossier sur le serveur.
