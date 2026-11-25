# Diagnostic numérique express — Le Guichet du Numérique

Formulaire-diagnostic interactif destiné aux ASBL (salon ASBLissimo et autres événements).
En 5 questions, le participant identifie ses priorités numériques et reçoit une recommandation
personnalisée (formation, conseil, accompagnement ou combinaison), puis peut laisser ses
coordonnées. Les réponses alimentent des statistiques sur les besoins du secteur associatif.

## Stack

- **Backend** : Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend** : HTML/CSS/JS vanilla, mobile-first, charte Le Guichet du Numérique
- **Déploiement** : Docker, routé par le Traefik de `gdntools.be` (TLS Let's Encrypt automatique)

## Structure

- `content.js` — tout le contenu éditable (questions, thématiques, textes de recommandation) et le moteur de calcul
- `server.js` — serveur Express, API, base SQLite, dashboard, export CSV
- `public/` — interface (`index.html`, `styles.css`, `app.js`) et tableau de bord (`admin.html`)
- `Dockerfile` / `deploy.sh` — conteneurisation et déploiement

## API

- `GET /` — formulaire
- `GET /api/content` — contenu du questionnaire
- `POST /api/submit` — enregistre un diagnostic (statistiques anonymes) et renvoie le résultat
- `POST /api/contact` — enregistre les coordonnées (facultatif)
- `GET /admin` — tableau de bord (Basic Auth)
- `GET /api/stats` — indicateurs agrégés (Basic Auth)
- `GET /api/export.csv` — export des réponses (Basic Auth)

## Déploiement

```bash
git clone https://github.com/FDWeb-pro/gdn-diagnostic-asblissimo /opt/diagnostic-gdn
cd /opt/diagnostic-gdn
bash deploy.sh '<MOT_DE_PASSE_ADMIN>'        # défaut : diagnostic.gdntools.be
```

Variables : `ADMIN_USER` et `ADMIN_PASSWORD` protègent `/admin`. La base vit dans le volume
Docker `diagnostic-gdn-db` (persistante entre redéploiements).

## Modifier les textes

Tout le contenu affiché (questions, exemples, textes de recommandation par thématique et par
service) se trouve dans `content.js`. Il suffit d'éditer ce fichier puis de relancer `deploy.sh`.
