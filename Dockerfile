FROM node:20-bookworm-slim

# Dépendances de build pour better-sqlite3 (fallback si pas de binaire précompilé)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

ENV PORT=8300
ENV DB_DIR=/app/db
EXPOSE 8300

CMD ["node", "server.js"]
