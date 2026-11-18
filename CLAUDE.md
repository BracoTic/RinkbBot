# CLAUDE.md — RinkBot

Chatbot corporativo (Serinco / HSEQ) con RAG sobre documentos de Google Drive, chat de texto, voz e imágenes.
Documentación completa: [RinkBot/README.md](RinkBot/README.md).

## Estructura del repositorio

La raíz git es esta carpeta; **todo el código vive en `RinkBot/`**.

- `RinkBot/Backend/` — Express 5, Node 22, ESM (`"type": "module"`). Entry point: `server.js` (rutas, middleware, `classifyIntent()`, SPA catch-all).
  - `rag.js` (búsqueda vectorial), `sessionStore.js` (historial 6 turnos / 30 min), `driveIndexer.js` + `driveClient.js` (indexación Drive), `chatStore.js` (CRUD chats), `auth.js` + `middleware/` (JWT, `adminOnly`), `webSearch.js` (SerpAPI, desactivado).
- `RinkBot/rinkbot-frontend/` — Angular 21 (standalone, Signals), SCSS, Vitest. Servicios en `src/app/core/services/`, páginas en `src/app/pages/{home,login,chat}`.
- `RinkBot/Frontend/` — **legacy** (HTML/JS plano). No se usa en producción; no editar salvo que se pida.

## Comandos

```bash
# Backend (desde RinkBot/Backend)
npm run dev      # node --watch server.js → http://localhost:3000
npm run check    # solo verificación de sintaxis (no hay tests de backend)

# Frontend (desde RinkBot/rinkbot-frontend)
ng serve         # http://localhost:4200, proxy /api y /health → :3000
ng build --configuration production
ng test          # Vitest
```

Requiere `RinkBot/Backend/.env` (plantilla: `.env.example`). Nunca commitear `.env`, `.mcp.json`, `config/service-account.json` ni `certs/`.

## Despliegue

- **Railway**, builder Dockerfile (`RinkBot/Dockerfile` + `RinkBot/railway.toml`, root directory del servicio = `RinkBot`).
- Build multi-stage: compila Angular → Express sirve `rinkbot-frontend/dist/browser` y la API en el mismo puerto (3000).
- Healthcheck `GET /health` (siempre responde 200; estado de DB va en el body).
- `app.set("trust proxy", 1)` es necesario detrás del proxy de Railway (rate limiter).
- **Un push a `master` despliega a producción.**

## Flujo de trabajo Git

- Rama principal: `master` (= producción). **Nunca commitear ni hacer push directo a `master`.**
- Cada tarea en su propia rama local (`feat/...`, `fix/...`, `docs/...`, `refactor/...`).
- Los cambios se revisan y aprueban antes de fusionar a `master` y hacer push.
- Remoto: `https://github.com/BracoTic/RinkbBot` (ojo: "Rinkb**B**ot"). No hay CI en GitHub.

## Base de datos (Supabase / PostgreSQL + pgvector)

- Tablas: `persona`, `chat` (incluye filas `tipo_chat='session'`), `drive_files`, `drive_chunks` (embedding 1536 dims), `drive_sync_state`.
- **No hay esquema SQL ni migraciones en el repo**; la estructura se infiere del código (ver README).
- El MCP de Supabase (`.mcp.json`) apunta a la **base de producción**: solo lecturas sin aprobación explícita. Nunca `apply_migration`, `DDL` ni `UPDATE/DELETE` sin confirmar con el usuario.

## Convenciones

- Backend en JS ESM (`import`), logging con `logger.js` (pino) — no usar `console.log`.
- Secretos solo por variables de entorno; la cuenta de servicio de Google va en `GOOGLE_SERVICE_ACCOUNT_JSON`.
- `id_persona` siempre sale del JWT, nunca del body.
- Textos de UI y respuestas del bot en español.
- Tras cambios: `npm run check` en backend y `ng build` en frontend antes de dar algo por terminado.

## Deuda técnica conocida

- Sin tests de backend ni CI.
- Sin RLS en Supabase.
- Filas `session` crecen sin TTL en DB (limpiar con `node Backend/clearSessions.js`).
- Paneles del rail lateral (Soporte, Notificaciones, Reunión, HSEQ, Inicio) son placeholders.
