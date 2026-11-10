# Widget « Rapport » GPREV — éditeur LibreOffice dans Grist

Le rapport `.odt` généré par Prevarisc s'édite directement dans Grist, avec le vrai moteur LibreOffice
(ZetaOffice, compilé en WebAssembly) : mêmes tableaux, formules entre tableaux, listes déroulantes, en-têtes et pieds de page.
Chaque « Enregistrer la version » crée une version liée à l'étape du workflow.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | le widget (interface, versions, remarques, statistiques) |
| `office_thread.js` | pilotage de LibreOffice (ouvrir, enregistrer, PDF, commentaires, comparaison) |
| `zeta.js` | bibliothèque zetajs 1.2.0 (licence MIT, allotropia) |
| `isolation-sw.js` | ajoute les en-têtes d'isolation que GitHub Pages ne permet pas de définir |

## 1. Héberger sur GitHub Pages

1. Créez un dépôt (par ex. `gprev-rapport`) et déposez ces 4 fichiers **à la racine**.
2. *Settings › Pages* : source = branche `main`, dossier `/ (root)`.
3. L'adresse du widget sera `https://<votre-compte>.github.io/gprev-rapport/`.

## 2. Ajouter le widget dans Grist

1. Remplacez le code du widget de suivi par `suivi-gprev.html` (2 lignes ajoutées : il indique à Grist le dossier sélectionné).
2. Sur la même page : *Ajouter un widget › Personnalisé*, table **Dossiers**.
3. Dans le panneau de droite : *URL personnalisée* = l'adresse GitHub Pages, accès **complet**.
4. *Sélectionner par* : le widget de suivi.
5. Au premier affichage, cliquez sur **Créer les tables** : `Rapports_Versions` et `Rapports_Remarques`.

## Navigateur

- **Chrome ou Edge récents** (version 137 ou plus) : l'éditeur fonctionne dans le cadre Grist.
- Firefox et Safari ne savent pas encore isoler une page à l'intérieur d'un cadre : l'éditeur ne démarrera pas.
- Premier chargement : environ 50 Mo depuis `cdn.zetaoffice.net`, puis le cache du navigateur prend le relais.
  Le réseau du SDIS doit autoriser ce domaine. Sinon, les fichiers `soffice.*` peuvent être hébergés
  ailleurs : modifiez la constante `SOFFICE` dans `index.html`.

## Fonctionnement

- **Import** : la première fois, l'agent importe le `.odt` Prevarisc. Il devient la version 1.
- **Droits d'édition** (mêmes règles que le suivi) :
  - l'agent assigné peut éditer quand le statut est En attente agent, En cours, Attente pièces ou À reprendre ;
  - le chef de service peut éditer les dossiers de son service ;
  - le chef de groupement peut tout éditer ;
  - en Retour SAF et Clôturé, le rapport est en lecture seule.
- **Relecture** : quand un relecteur ouvre le rapport, le *suivi des modifications* de Writer s'active.
  Ses corrections apparaissent en couleur, à son nom.
- **Commentaires** : ce sont les commentaires de Writer (*Insert › Comment*, ou Ctrl+Alt+C). À chaque enregistrement :
  - ils sont relevés dans `Rapports_Remarques` ;
  - un commentaire supprimé du document est conservé dans la table avec l'état « Supprimée » ;
  - un préfixe type le commentaire automatiquement : `[presc]`, `[calcul]`, `[classement]`, `[forme]` ou `[autre]`.
- **Historique** : onglet *Versions*. Chaque version peut être consultée ou comparée à une autre
  (outil *Comparer* de Writer : ajouts et suppressions en couleur).
- **Erreurs** : onglet réservé aux chefs de service (leurs agents) et de groupement (tous les agents).
  Il compte les remarques des relecteurs par agent et par type.
  > Le widget masque l'onglet, mais les tables restent lisibles dans Grist par toute personne qui a accès au document.
  > Pour une vraie confidentialité, ajoutez des *règles d'accès* Grist sur `Rapports_Remarques`.
- **PDF** : bouton *PDF* (export LibreOffice). Le dépôt dans Prevarisc reste manuel.

## Limites connues

- L'interface de LibreOffice est en **anglais** : la version ZetaOffice ne contient pas encore le paquet français.- Le copier-coller entre LibreOffice et les autres applications peut être bloqué par le cadre Grist.
  Le copier-coller à l'intérieur du rapport fonctionne.
- Un seul éditeur à la fois par rapport : pas d'édition simultanée à plusieurs.
