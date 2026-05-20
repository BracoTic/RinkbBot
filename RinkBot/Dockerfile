# ──────────────────────────────────────────────────────────────
# RinkBot — imagen multi-stage
#
# Stage 1 (builder): compila el frontend Angular → dist/
# Stage 2 (runtime): Express sirve backend + dist/ de Angular
#
# Contexto de build: raíz del repositorio (donde están
#   Backend/, rinkbot-frontend/ y este Dockerfile).
#
# Node 22 LTS / Alpine (~160 MB imagen final).
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Build Angular ───────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

COPY rinkbot-frontend/package.json rinkbot-frontend/package-lock.json ./
RUN npm ci

COPY rinkbot-frontend/ ./
RUN npm run build -- --configuration production

# Output: /build/dist/rinkbot-frontend/browser/

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM node:22-alpine

# Usuario no-root para reducir superficie de ataque
RUN addgroup -S rinkbot && adduser -S rinkbot -G rinkbot

WORKDIR /app

# Dependencias de producción del backend (capa cacheada)
COPY Backend/package.json Backend/package-lock.json ./Backend/
RUN cd Backend && npm ci --omit=dev

# Código del backend
COPY Backend/ ./Backend/

# Frontend compilado desde el stage anterior
# El builder deja los assets en /build/dist/browser/
# server.js los busca en ../rinkbot-frontend/dist/browser (relativo a Backend/)
RUN mkdir -p ./rinkbot-frontend
COPY --from=builder /build/dist/ ./rinkbot-frontend/dist/

# Directorio para service-account.json (se monta en runtime, no se copia)
RUN mkdir -p /app/Backend/config && chown -R rinkbot:rinkbot /app

USER rinkbot

WORKDIR /app/Backend

EXPOSE 3000

# Health check usando el endpoint /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health | grep -q '"status":"ok"' || exit 1

CMD ["node", "server.js"]
