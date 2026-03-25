FROM node:20-slim AS base

# Install build dependencies for better-sqlite3 + curl for catalog download
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Download catalog from GitHub Release (38MB → 171K products)
# This avoids keeping the large .gz file in the git repo
ENV CATALOG_URL=https://github.com/GuillaumeRacine/present-agent-v3-mar2026/releases/download/v0.1.0/catalog.db.gz

RUN mkdir -p data && \
    if [ -f data/catalog.db ] && [ "$(wc -c < data/catalog.db)" -gt 1000000 ]; then \
      echo "Using existing catalog.db"; \
    elif [ -f data/catalog.db.gz ]; then \
      echo "Decompressing local catalog.db.gz..."; \
      gunzip -k data/catalog.db.gz; \
    else \
      echo "Downloading catalog from GitHub Release..."; \
      curl -L -o data/catalog.db.gz "$CATALOG_URL" && \
      gunzip data/catalog.db.gz && \
      echo "Downloaded catalog: $(wc -c < data/catalog.db) bytes"; \
    fi

# Build Next.js
RUN npm run build

# Production
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
