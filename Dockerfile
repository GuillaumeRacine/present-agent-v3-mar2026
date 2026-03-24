FROM node:20-slim AS base

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source (excluding data/ first for layer caching)
COPY . .

# Decompress pre-built catalog if .gz exists, otherwise seed from static
RUN mkdir -p data && \
    if [ -f data/catalog.db.gz ]; then \
      echo "Decompressing pre-built catalog.db.gz..."; \
      gunzip -k data/catalog.db.gz && \
      echo "Catalog: $(sqlite3 data/catalog.db 'SELECT COUNT(*) FROM products WHERE enriched=1') enriched products"; \
    elif [ -f data/catalog.db ] && [ "$(wc -c < data/catalog.db)" -gt 1000000 ]; then \
      echo "Using pre-built catalog.db"; \
    else \
      echo "No pre-built catalog — seeding from static catalog..."; \
      npx tsx scripts/seed-existing.ts; \
    fi

# Build Next.js
RUN npm run build

# Production
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
