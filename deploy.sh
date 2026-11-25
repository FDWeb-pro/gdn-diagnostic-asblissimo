#!/usr/bin/env bash
# Déploiement du Diagnostic numérique express (Le Guichet du Numérique)
# sur le serveur Coolify/Traefik de gdntools.be.
#
# Usage : bash deploy.sh <ADMIN_PASSWORD> [HOST] [ADMIN_USER]
#   ADMIN_PASSWORD : mot de passe du tableau de bord /admin (obligatoire)
#   HOST           : sous-domaine (défaut : diagnostic.gdntools.be)
#   ADMIN_USER     : identifiant admin (défaut : gdn)
set -euo pipefail

ADMIN_PASSWORD="${1:?Usage: bash deploy.sh <ADMIN_PASSWORD> [HOST] [ADMIN_USER]}"
HOST="${2:-diagnostic.gdntools.be}"
ADMIN_USER="${3:-gdn}"
IMAGE="diagnostic-gdn"
NAME="diagnostic-gdn"
NET="coolify"

cd "$(dirname "$0")"

echo ">> Build de l'image Docker…"
docker build -t "$IMAGE" .

echo ">> (Re)création du conteneur…"
docker rm -f "$NAME" 2>/dev/null || true
docker volume create diagnostic-gdn-db >/dev/null

docker run -d --name "$NAME" --restart unless-stopped \
  --network "$NET" \
  -v diagnostic-gdn-db:/app/db \
  -e ADMIN_USER="$ADMIN_USER" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e PORT=8300 \
  --label traefik.enable=true \
  --label traefik.docker.network="$NET" \
  --label "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https" \
  --label "traefik.http.middlewares.gzip.compress=true" \
  --label "traefik.http.routers.diag-http.entryPoints=http" \
  --label "traefik.http.routers.diag-http.rule=Host(\`$HOST\`)" \
  --label "traefik.http.routers.diag-http.middlewares=redirect-to-https" \
  --label "traefik.http.routers.diag-http.service=diag" \
  --label "traefik.http.routers.diag-https.entryPoints=https" \
  --label "traefik.http.routers.diag-https.rule=Host(\`$HOST\`)" \
  --label "traefik.http.routers.diag-https.tls=true" \
  --label "traefik.http.routers.diag-https.tls.certresolver=letsencrypt" \
  --label "traefik.http.routers.diag-https.middlewares=gzip" \
  --label "traefik.http.routers.diag-https.service=diag" \
  --label "traefik.http.services.diag.loadbalancer.server.port=8300" \
  "$IMAGE"

echo ">> Déployé : https://$HOST  (admin : https://$HOST/admin)"
