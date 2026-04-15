# ──────────────────────────────────────────────────────────────
# RinkBot — imagen única (Express sirve backend + frontend)
# Contexto de build: raíz del proyecto (directorio que contiene
#                    Backend/ y Frontend/).
#
# Node 22 LTS (recomendado para producción).
# Alpine mantiene la imagen pequeña (~150 MB final).
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine

# Usuario no-root para reducir superficie de ataque
RUN addgroup -S rinkbot && adduser -S rinkbot -G rinkbot

WORKDIR /app

# ── Dependencias primero (capa cacheada por Docker) ──────────
# Si solo cambia el código fuente, esta capa no se reconstruye.
COPY Backend/package.json Backend/package-lock.json ./Backend/
RUN cd Backend && npm ci --omit=dev

# ── Código fuente ────────────────────────────────────────────
COPY Backend/ ./Backend/
COPY Frontend/ ./Frontend/

# Directorio para service-account.json (se monta en runtime, no se copia)
RUN mkdir -p /app/Backend/config && chown -R rinkbot:rinkbot /app

USER rinkbot

WORKDIR /app/Backend

EXPOSE 3000

# Health check usando el endpoint /health de Fase 5
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health | grep -q '"status":"ok"' || exit 1

CMD ["node", "server.js"]
