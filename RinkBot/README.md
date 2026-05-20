# RinkBot

Chatbot corporativo con inteligencia artificial para gestión del conocimiento interno. Integra RAG (*Retrieval-Augmented Generation*) sobre documentos de Google Drive, chat de texto, chat de voz, análisis de imágenes, historial conversacional persistente y búsqueda web como fallback.

---

## Descripción general

RinkBot es una herramienta interna desarrollada para **Serinco / área HSEQ**. Permite a los colaboradores hacer preguntas en lenguaje natural y obtener respuestas contextualizadas usando los documentos oficiales de la organización como fuente de conocimiento.

El sistema indexa automáticamente carpetas de Google Drive (PDFs, DOCX, XLSX, PPTX, Google Docs/Sheets/Slides), genera embeddings vectoriales de los contenidos y los almacena en PostgreSQL. Cuando un usuario hace una pregunta, el backend clasifica la intención del mensaje, recupera los fragmentos más relevantes de los documentos y los inyecta como contexto al modelo de lenguaje de OpenAI antes de generar la respuesta. El historial de la conversación se persiste en base de datos y se envía automáticamente en cada turno para mantener coherencia conversacional.

---

## Objetivo del proyecto  

Resolver la dispersión del conocimiento corporativo: procedimientos, políticas, formatos y normativas HSEQ estaban distribuidos en archivos de Drive sin un punto de consulta centralizado. RinkBot actúa como ese punto: un asistente que "conoce" los documentos y puede responderle a cualquier empleado en tiempo real.

---

## Tecnologías utilizadas

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22+ LTS | Runtime |
| Express | ^5.1.0 | Servidor HTTP/HTTPS |
| OpenAI SDK | ^6.9.1 | Chat completions + embeddings + visión |
| `pg` (node-postgres) | ^8.16.3 | Cliente PostgreSQL |
| Supabase | Cloud | Base de datos PostgreSQL + extensión `pgvector` |
| googleapis | ^168.0.0 | Google Drive API v3 |
| jsonwebtoken | ^9.0.3 | Autenticación JWT |
| pino | ^10.3.1 | Logging estructurado JSON |
| helmet | ^8.1.0 | Headers de seguridad HTTP |
| express-rate-limit | ^8.3.2 | Rate limiting por IP |
| compression | ^1.8.1 | Compresión gzip de respuestas |
| multer | ^2.1.1 | Subida de imágenes (memoria, sin escritura en disco) |
| mammoth | ^1.11.0 | Extracción de texto desde DOCX |
| pdf-parse | ^1.1.4 | Extracción de texto desde PDF |
| exceljs | ^4.4.0 | Extracción de texto desde XLSX |
| adm-zip | ^0.5.16 | Extracción de texto desde PPTX |
| dotenv | ^17.2.3 | Variables de entorno |

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Angular | 21.2+ | Framework SPA — componentes standalone, Signals, lazy loading por ruta |
| TypeScript | ~5.9 | Lenguaje principal del frontend |
| SCSS | — | Estilos con variables corporativas, mixins y responsive design |
| Web Speech API (SpeechRecognition) | — | Reconocimiento de voz (STT) — Chrome / Edge |
| SpeechSynthesis API | — | Síntesis de voz (TTS) en español |
| marked.js | ^18.0.2 | Renderizado de Markdown en respuestas del bot |
| DOMPurify | ^3.4.2 | Sanitización de HTML generado desde Markdown |
| Vitest | ^4.1.5 | Runner de tests unitarios (vía `@angular/build:unit-test`) |

### Servicios externos
| Servicio | Propósito |
|---|---|
| OpenAI API | Chat (`gpt-5-nano` por defecto) + embeddings (`text-embedding-3-small`) + visión de imágenes |
| Google Drive API | Lectura de documentos corporativos |
| SerpAPI | Búsqueda web como fallback (opcional, desactivada por defecto) |
| Supabase | PostgreSQL con extensión `pgvector` para búsqueda vectorial |

### Infraestructura / Despliegue
- Docker + Docker Compose (build multi-stage: Angular → Express)
- `railway.toml` configurado para Railway (builder Dockerfile, health check en `/health`, restart on failure)
- Compatible con Render o cualquier plataforma que soporte contenedores Node.js

---

## Arquitectura general

```
┌─────────────────────────────────────────┐
│              USUARIO FINAL              │
│    (navegador web — Chrome / Edge)      │
└────────────────────┬────────────────────┘
                     │ HTTP / HTTPS
                     ▼
┌─────────────────────────────────────────┐
│         EXPRESS (puerto 3000)           │
│                                         │
│  ┌──────────────────┐  ┌─────────────┐  │
│  │ Angular SPA      │  │  API REST   │  │
│  │ (build estático) │  │  /api/*     │  │
│  │ dist/browser/    │  │  JWT guard  │  │
│  └──────────────────┘  └──────┬──────┘  │
└────────────────────────────── │ ────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │  PostgreSQL  │ │  OpenAI API  │ │  Google      │
      │  (Supabase)  │ │  Chat +      │ │  Drive API   │
      │  + pgvector  │ │  Embeddings  │ │  (indexación)│
      └──────────────┘ │  + Vision    │ └──────────────┘
                       └──────────────┘
```

El frontend Angular se compila a archivos estáticos (`rinkbot-frontend/dist/browser/`) que Express sirve directamente. La API en `/api/*` corre en el **mismo proceso y puerto**. No se requiere servidor de frontend separado en producción.

En desarrollo, el servidor de Angular (`ng serve`) incluye un proxy que redirige `/api/*` al backend Express en el puerto 3000 (ver sección [Desarrollo local](#desarrollo-local)).

---

## Requisitos previos

- **Node.js 22+** (el proyecto usa ESM nativo — `"type": "module"`)
- **npm** (incluido con Node.js)
- **Cuenta de Supabase** con una base de datos PostgreSQL y la extensión `pgvector` habilitada
- **Cuenta de OpenAI** con acceso a la API (modelos `gpt-5-nano` y `text-embedding-3-small`)
- **Google Cloud Service Account** con permisos de lectura sobre las carpetas de Drive que se quieran indexar
- **Docker** (opcional, para despliegue en contenedor)

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/BracoTic/RinkbBot.git
cd RinkbBot
```

### 2. Instalar dependencias del backend

```bash
cd Backend
npm install
```

### 3. Instalar dependencias del frontend Angular

```bash
cd rinkbot-frontend
npm install
```

### 4. Build de producción del frontend (opcional en desarrollo)

```bash
cd rinkbot-frontend
ng build --configuration production
# Output: rinkbot-frontend/dist/browser/
```

> En desarrollo no es necesario hacer el build; basta con `ng serve` en paralelo con el backend (ver sección [Desarrollo local](#desarrollo-local)).

### 5. Configurar las credenciales de Google Drive

Las credenciales de la cuenta de servicio de Google Cloud se pasan como variable de entorno. El sistema admite dos modos (en orden de prioridad):

**Modo 1 — Variable de entorno (recomendado para producción y Railway):**

En `Backend/.env` agrega el contenido completo del JSON en una sola línea:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...todo el JSON..."}
```

Para convertir el archivo descargado a una línea válida en PowerShell:
```powershell
$obj = Get-Content "ruta\al\archivo.json" -Raw | ConvertFrom-Json
$obj | ConvertTo-Json -Depth 10 -Compress
# Copiar la salida y pegarla como valor de GOOGLE_SERVICE_ACCOUNT_JSON
```

**Modo 2 — Archivo local (alternativa para desarrollo):**

Coloca el archivo en:
```
Backend/config/service-account.json
```

> El archivo **no debe commitearse** ni incluirse en la imagen Docker. Está en `.gitignore` y `.dockerignore`.

> **Importante:** La carpeta de Google Drive debe estar compartida con el correo de la cuenta de servicio (formato `nombre@proyecto.iam.gserviceaccount.com`) con rol **Lector**. Alternativamente, si los archivos están configurados como "Cualquier usuario con el vínculo puede ver", el sistema puede reindexarlos sin acceso explícito a la carpeta usando el endpoint `/api/drive/reindex`.

### 6. Configurar las variables de entorno

```bash
cp Backend/.env.example Backend/.env
# Editar Backend/.env con tus valores reales
```

Ver sección [Configuración de entorno](#configuración-de-entorno) para detalle de cada variable.

### 7. Preparar la base de datos

El esquema de base de datos debe estar creado en Supabase antes de ejecutar el sistema. Las tablas requeridas son:

- `public.persona` — usuarios del sistema
- `public.chat` — historial de conversaciones guardadas **y sesiones activas** (`tipo_chat='session'`)
- `public.drive_files` — registro de archivos indexados desde Drive
- `public.drive_chunks` — fragmentos de texto con embeddings vectoriales
- `public.drive_sync_state` — estado de sincronización por carpeta

> **Nota:** No se incluye script SQL de creación de tablas en el repositorio. El esquema debe crearse manualmente en Supabase. Consultar el código de `Backend/chatStore.js`, `Backend/sessionStore.js`, `Backend/driveIndexer.js` y `Backend/rag.js` para inferir la estructura exacta de cada tabla.

---

## Configuración de entorno

Basada en `Backend/.env.example`. Copiar como `Backend/.env` y completar con valores reales.

### OpenAI
```env
OPENAI_API_KEY=sk-proj-...          # Clave de API de OpenAI
OPENAI_MODEL=gpt-5-nano            # Modelo de chat (debe soportar visión para análisis de imágenes)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Modelo de embeddings
OPENAI_TEMPERATURE=0.3              # Temperatura de generación (0.0–2.0)
OPENAI_MAX_TOKENS=16000             # Máximo de tokens por respuesta
```

### PostgreSQL / Supabase
```env
DB_HOST=aws-0-us-west-2.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.tu_project_ref
DB_PASSWORD=tu_password_aqui
DB_NAME=postgres
DB_SSL_REJECT_UNAUTHORIZED=false    # true en producción
```

### Google Drive
```env
SYSTEM_FOLDER_ID=id_de_la_carpeta_raiz_de_drive

# Credenciales de la cuenta de servicio (JSON completo en una sola línea)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

### JWT y Servidor
```env
JWT_SECRET=string_aleatorio_de_64_chars_minimo   # ⚠️ CAMBIAR ANTES DE PRODUCCIÓN
JWT_EXPIRES_IN=8h
PORT=3000
CORS_ORIGIN=*                        # En producción: https://tudominio.com
MAX_MESSAGE_CHARS=4000               # Límite de caracteres por mensaje de texto
MAX_IMAGE_BYTES=10485760             # Límite de tamaño de imagen (default 10 MB)
```

### RAG
```env
RAG_TOP_K=10                         # Fragmentos a recuperar por query
RAG_MIN_SIMILARITY=0.35              # Umbral mínimo de similitud coseno
RAG_HIGH_CONFIDENCE=0.45             # Si RAG supera este umbral, se suprime la búsqueda web
RAG_BLOCKLIST_REGEX=contrasen|password|clave|secret|api[_-]?key|token
```

> **Deprecated:** `RAG_DISABLE_FOR_SMALL_QUERIES` y `RAG_MIN_QUERY_CHARS` fueron reemplazados por la función `classifyIntent()` incorporada en el servidor.

### Sincronización de Drive
```env
DRIVE_SYNC_BATCH_FILES=10            # Archivos a procesar por lote
DRIVE_MAX_TEXT_CHARS=60000           # Máximo de texto extraído por archivo
DRIVE_MAX_FILE_BYTES=120000000       # Archivos mayores a 120 MB se omiten
CHUNK_MAX_CHARS=1800                 # Tamaño máximo de cada fragmento
CHUNK_OVERLAP_CHARS=250              # Solapamiento entre fragmentos
```

### Búsqueda Web (opcional)
```env
WEB_SEARCH_ENABLED=false             # Activar búsqueda web como fallback
SERPAPI_KEY=tu_clave_de_serpapi
```

### Chat
```env
CHAT_APPEND_SOURCES=true             # Añadir fuentes al final de cada respuesta
CHAT_MAX_SOURCES_TO_SHOW=3
```

### Entorno
```env
NODE_ENV=development                 # production activa nivel de log "info"
LOG_LEVEL=                           # Sobreescribe el nivel de log automático
```

---

## Ejecución del proyecto

### Desarrollo local

```bash
# Terminal 1 — backend
cd Backend
npm run dev       # --watch: reinicio automático al guardar

# Terminal 2 — frontend Angular
cd rinkbot-frontend
ng serve          # proxy automático /api/* → localhost:3000
```

El sistema queda disponible en:
- **App Angular (dev):** `http://localhost:4200`
- **Backend directo:** `http://localhost:3000`
- **Health check:** `http://localhost:3000/health`

### Producción (sin Docker)

```bash
cd Backend
npm start         # node server.js
```

### Producción con Docker Compose

```bash
docker compose up --build    # Primera vez o tras cambios en el código
docker compose up -d         # Levantamiento en background (imagen existente)
docker compose logs -f       # Ver logs en tiempo real
docker compose down          # Detener
```

### Producción con Docker (manual)

```bash
# Desde la raíz del proyecto
docker build -t rinkbot .

docker run -d \
  --name rinkbot \
  -p 3000:3000 \
  --env-file Backend/.env \
  -v $(pwd)/Backend/config/service-account.json:/app/Backend/config/service-account.json:ro \
  --restart unless-stopped \
  rinkbot
```

### HTTPS en red local (LAN)

Para habilitar el micrófono en otros PCs de la red local, el servidor puede arrancar en modo HTTPS usando un certificado autofirmado:

```bash
cd Backend
bash generate-cert.sh 192.168.X.X   # IP del servidor en la LAN
npm run dev                           # arranca en HTTPS si los certs existen
```

El servidor detecta automáticamente `Backend/certs/server.key` y `server.crt` al iniciar. Si no existen, cae en HTTP. Para forzar HTTP aunque los certs existan, establecer `HTTPS_ENABLED=false` en `.env`.

Los clientes deben instalar `Backend/certs/server.crt` en su almacén de certificados raíz (Windows: doble clic → "Instalar certificado" → Entidades de certificación raíz de confianza).

### Scripts disponibles

**Backend** — definidos en `Backend/package.json`:

| Script | Comando | Descripción |
|---|---|---|
| `npm run dev` | `node --watch server.js` | Desarrollo con hot-reload |
| `npm start` | `node server.js` | Producción |
| `npm run check` | `node --check *.js` | Verifica sintaxis de archivos principales |
| `npm run gen:cert` | `bash generate-cert.sh` | Genera certificado autofirmado para LAN |

**Frontend Angular** — definidos en `rinkbot-frontend/package.json`:

| Script | Comando | Descripción |
|---|---|---|
| `ng serve` | Angular dev server + proxy | Desarrollo en `localhost:4200` |
| `ng build` | `ng build --configuration production` | Build de producción en `dist/browser/` |
| `ng test` | Vitest vía `@angular/build:unit-test` | Tests unitarios |

**Utilidades:**

| Script | Descripción |
|---|---|
| `node Backend/clearSessions.js` | Elimina todas las filas de sesión de conversación de la tabla `public.chat` |

---

## Desarrollo local

Para trabajar en el frontend Angular sin necesidad de hacer un build de producción en cada cambio, el frontend y el backend deben correr **en paralelo en dos terminales**:

```bash
# Terminal 1 — backend Express
cd Backend
npm run dev
# Escucha en http://localhost:3000

# Terminal 2 — frontend Angular
cd rinkbot-frontend
ng serve
# Escucha en http://localhost:4200
# Redirige /api/* → http://localhost:3000 vía proxy
```

El archivo `rinkbot-frontend/proxy.conf.json` configura el proxy del dev-server de Angular:

```json
{
  "/api": { "target": "http://localhost:3000", "secure": false, "changeOrigin": true },
  "/health": { "target": "http://localhost:3000", "secure": false, "changeOrigin": true }
}
```

---

## Funcionalidades principales

### Chat de texto
- El usuario escribe una pregunta en lenguaje natural.
- El backend clasifica la intención del mensaje (`greeting`, `internal`, `general`) con `classifyIntent()`.
- Si aplica RAG (mensajes de más de ~15 caracteres y no son saludos), se recuperan los fragmentos más relevantes de los documentos indexados.
- Si RAG no alcanza el umbral `RAG_HIGH_CONFIDENCE` y el mensaje contiene palabras clave de actualidad (normas, precios, fechas), se consulta Google vía SerpAPI (si está activado).
- La respuesta del LLM se muestra con formato Markdown en el navegador.
- Opcionalmente se añaden las fuentes (nombre del documento + similitud).

### Historial conversacional
- El backend mantiene el contexto de los últimos **6 turnos** de la conversación por usuario.
- El historial se persiste en la tabla `public.chat` con `tipo_chat='session'` (upsert en cada turno).
- La sesión expira automáticamente si el usuario no interactúa durante **30 minutos**.
- El historial se descarta si supera **18.000 caracteres** (≈ 4.500 tokens) — se eliminan los turnos más antiguos primero.
- Para limpiar todas las sesiones manualmente: `node Backend/clearSessions.js`.

### Análisis de imágenes
- El usuario puede adjuntar una imagen (JPEG, PNG, GIF o WebP) junto a su mensaje.
- El frontend muestra una vista previa con barra de progreso durante la carga.
- La imagen se envía como `multipart/form-data` al endpoint `/api/chat`.
- El backend la pasa a OpenAI como input de visión en base64 (`gpt-5-nano` soporta entrada multimodal).
- Cuando hay imagen, el historial conversacional se omite para evitar contaminación de contexto.

### Chat de voz
- El usuario habla al micrófono (requiere Chrome o Edge y contexto HTTPS o localhost).
- El navegador transcribe la voz con la Web Speech API.
- La transcripción se envía al mismo endpoint `/api/chat`.
- La respuesta se reproduce automáticamente con síntesis de voz (TTS) en español.

### Historial de conversaciones guardadas
- Los chats pueden guardarse en la base de datos con título y tipo (texto / voz).
- Desde el panel lateral "Mensajes" se pueden listar, filtrar por favoritos, abrir, releer y eliminar conversaciones.
- Hay un panel "Favoritos" dedicado que filtra los chats marcados.

### Sincronización de Google Drive
- `POST /api/drive/sync` inicia la indexación escaneando la carpeta raíz de Drive.
- `POST /api/drive/reindex` reindexar archivos ya registrados en `drive_files` directamente por ID, sin necesidad de acceder a la carpeta raíz. Útil para archivos configurados como "cualquier usuario con el vínculo puede ver".
- Ambos endpoints soportan el parámetro `includeErrors: true` para reintentar archivos que fallaron previamente.
- El sistema procesa archivos en lotes configurables y soporta: PDF, DOCX, XLSX, PPTX, Google Docs, Google Sheets, Google Slides y archivos de texto plano.
- Cada archivo se divide en fragmentos con solapamiento, se generan sus embeddings y se almacenan en `drive_chunks`.
- Los archivos ya indexados y sin cambios (mismo MD5 o fecha de modificación) se omiten.
- Estados de `drive_files`: `pending` → `processing` → `indexed` / `skipped` / `error`.

### Autenticación
- Login con usuario y contraseña verificados contra `pgcrypto` en PostgreSQL.
- JWT con expiración de 8 horas (configurable).
- Todas las rutas de API excepto `/api/login`, `/api/settings` y `/health` requieren token.

---

## API — Endpoints

### Públicos (sin autenticación)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del sistema: DB, memoria, uptime, configuración de servicios |
| `POST` | `/api/login` | Autenticación. Body: `{ usuario, password }`. Devuelve `{ ok, user, token }` |
| `GET` | `/api/settings` | Configuración pública: modelo activo, embedding model, si Drive está configurado |

### Protegidos (requieren `Authorization: Bearer <token>`)

#### Chat
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/chat` | Envía un mensaje. Acepta JSON `{ message }` o `multipart/form-data` con campos `message` + `imagen` (File). Devuelve `{ ok, reply, response, sources, bestSimilarity }` |

#### Historial de chats
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/chats` | Lista los chats del usuario. Query: `?limit=20` (máximo 100) |
| `GET` | `/api/chats/:id_chat` | Devuelve el detalle completo de un chat (solo si pertenece al usuario) |
| `POST` | `/api/chats` | Guarda un chat manualmente. Body: `{ tipo_chat, titulo, chat_json, favorito? }` |
| `PATCH` | `/api/chats/:id_chat/favorite` | Marca / desmarca favorito. Body: `{ favorito: boolean }` |
| `DELETE` | `/api/chats/:id_chat` | Elimina un chat (solo si pertenece al usuario) |

#### Google Drive sync
> Requieren `rol = 'admin'` además de JWT válido. Usuarios con `rol = 'usuario'` reciben `403 Forbidden`.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/drive/sync` | Inicia sincronización escaneando la carpeta raíz. Body opcional: `{ folderId?, batchFiles? }`. Responde 202 inmediatamente |
| `GET` | `/api/drive/sync/state` | Consulta el estado actual de la sincronización. Query: `?folderId=` |
| `POST` | `/api/drive/sync/reset` | Resetea el estado de sync para volver a indexar desde cero |
| `POST` | `/api/drive/reindex` | Reindexar archivos ya conocidos en `drive_files` sin escanear la carpeta. Body: `{ folderId?, batchFiles?, includeErrors? }` |

---

## Autenticación y seguridad

### Flujo de login
1. El usuario envía `POST /api/login` con `{ usuario, password }`.
2. El backend verifica las credenciales contra `public.persona` usando `pgcrypto.crypt()`.
3. Si son válidas, genera un JWT firmado con `JWT_SECRET` y expiración `JWT_EXPIRES_IN` (default 8h).
4. El frontend guarda el token en `localStorage` como `rinkbot_token`.
5. Todas las peticiones posteriores incluyen `Authorization: Bearer <token>`.
6. El middleware `authMiddleware` en `Backend/middleware/auth.js` valida el token en cada request protegido.
7. El `id_persona` del usuario se extrae del JWT — nunca del body del request.

### Controles de seguridad activos
- **Helmet:** headers HTTP de seguridad (CSP, HSTS, X-Frame-Options, etc.)
- **Rate limiting:** 15 intentos de login por IP en 15 minutos; 60 requests/min para la API general
- **CORS:** configurable por variable de entorno (`CORS_ORIGIN`), soporta múltiples orígenes separados por coma
- **Multer:** subida de imágenes validada por tipo MIME (whitelist) y tamaño máximo configurable; almacenamiento en memoria (sin escritura en disco)
- **Logging sin datos sensibles:** Pino con `redact` sobre `Authorization`, `password` y `password_hash`
- **Sin secretos en código:** todas las claves viven en variables de entorno
- **0 vulnerabilidades npm** (auditado)
- **Control de roles:** columna `rol` en `persona` (`admin` / `usuario`). Las rutas de sincronización de Drive requieren `rol = 'admin'` — middleware `adminOnly` devuelve `403`
- **Graceful shutdown:** handlers `SIGTERM` / `SIGINT` cierran conexiones en vuelo antes de terminar (máx 10s)
- **HTTPS automático:** si existen `Backend/certs/server.key` y `server.crt`, el servidor arranca en HTTPS sin configuración adicional

---

## Base de datos

**Motor:** PostgreSQL en Supabase con extensión `pgvector` (necesaria para las búsquedas por similitud coseno).

### Tablas principales

#### `public.persona`
Usuarios del sistema.

| Columna | Tipo inferido | Descripción |
|---|---|---|
| `id_persona` | integer / serial | Identificador único |
| `usuario` | varchar | Nombre de usuario para login |
| `password_hash` | varchar | Hash bcrypt generado con `pgcrypto.crypt()` |
| `correo` | varchar | Correo electrónico |
| `avatar_url` | varchar | URL del avatar del usuario |
| `estado` | varchar | Estado de la cuenta (`activo` / otros) |
| `rol` | varchar | Rol del usuario: `admin` o `usuario` (default: `usuario`) |
| `ultimo_acceso` | timestamp | Actualizado en cada login exitoso |

#### `public.chat`
Conversaciones guardadas **y sesiones activas de conversación**.

| Columna | Tipo inferido | Descripción |
|---|---|---|
| `id_chat` | serial | Identificador único |
| `id_persona` | integer | FK a `persona` |
| `tipo_chat` | varchar | `texto`, `voz` (chats guardados) o `session` (historial conversacional activo) |
| `titulo` | varchar | Título de la conversación (`__session__` para sesiones activas) |
| `modelo_llm` | varchar | Modelo usado (ej. `gpt-5-nano`) |
| `chat_json` | jsonb | Conversación completa serializada |
| `favorito` | boolean | Si está marcado como favorito |
| `created_at` | timestamp | Fecha de creación |

> Las filas con `tipo_chat='session'` son gestionadas automáticamente por `Backend/sessionStore.js` y no deben modificarse manualmente. Para limpiarlas: `node Backend/clearSessions.js`.

#### `public.drive_files`
Registro de archivos indexados desde Google Drive.

| Columna | Tipo inferido | Descripción |
|---|---|---|
| `folder_id` | varchar | ID de la carpeta raíz de Drive |
| `drive_file_id` | varchar | ID del archivo en Google Drive |
| `name` | varchar | Nombre del archivo |
| `mime_type` | varchar | Tipo MIME del archivo |
| `web_view_link` | varchar | URL para abrir el archivo en Drive |
| `modified_time` | timestamp | Última modificación en Drive |
| `md5_checksum` | varchar | Hash para detectar cambios |
| `size_bytes` | bigint | Tamaño del archivo |
| `status` | varchar | `pending`, `processing`, `indexed`, `skipped`, `error` |
| `error_message` | text | Mensaje de error si falló |
| `updated_at` | timestamp | Última actualización del registro |

#### `public.drive_chunks`
Fragmentos de texto con embeddings vectoriales.

| Columna | Tipo inferido | Descripción |
|---|---|---|
| `folder_id` | varchar | FK a la carpeta de Drive |
| `drive_file_id` | varchar | FK al archivo de Drive |
| `chunk_index` | integer | Número de fragmento dentro del archivo |
| `content` | text | Texto del fragmento |
| `embedding` | vector | Embedding generado por OpenAI (1536 dims) |
| `metadata` | jsonb | Metadatos del archivo (nombre, mime, fecha, link) |

#### `public.drive_sync_state`
Estado de la sincronización por carpeta (para soportar procesamiento incremental por lotes).

| Columna | Tipo inferido | Descripción |
|---|---|---|
| `folder_id` | varchar | PK — ID de la carpeta de Drive |
| `state` | jsonb | Estado: cola de pendientes, contadores, flag `done` |
| `updated_at` | timestamp | Última actualización |

---

## Estructura de carpetas

```
RinkBot/
├── Dockerfile                   # Build multi-stage: compila Angular + corre Express
├── docker-compose.yml           # Orquestación para desarrollo/deploy
├── railway.toml                 # Configuración de despliegue en Railway
├── .dockerignore
├── .gitignore
│
├── Backend/
│   ├── server.js                # Entry point — Express, rutas, middleware, SPA catch-all
│   ├── auth.js                  # Lógica de login (validación DB + JWT)
│   ├── db.js                    # Pool de PostgreSQL + función ping()
│   ├── openaiClient.js          # Singleton lazy del cliente OpenAI
│   ├── logger.js                # Singleton Pino (logging estructurado JSON)
│   ├── rag.js                   # Recuperación de contexto + caché de embeddings
│   ├── sessionStore.js          # Historial conversacional persistente en DB (max 6 turnos, 30 min TTL)
│   ├── driveIndexer.js          # Indexación de archivos de Google Drive
│   ├── driveClient.js           # Cliente de la API de Google Drive
│   ├── chatStore.js             # CRUD de conversaciones en PostgreSQL
│   ├── webSearch.js             # Búsqueda web via SerpAPI (fallback)
│   ├── clearSessions.js         # Utilidad: elimina filas de sesión de public.chat
│   ├── generate-cert.sh         # Genera certificado autofirmado para HTTPS en LAN
│   ├── middleware/
│   │   ├── auth.js              # JWT: generateToken() + authMiddleware()
│   │   └── adminOnly.js         # Verifica rol='admin' — 403 si no cumple
│   ├── certs/                   # Certificados TLS autofirmados (no commiteados)
│   │   ├── server.key
│   │   └── server.crt
│   ├── package.json
│   ├── .env                     # Variables de entorno (no commiteado)
│   └── .env.example             # Plantilla de variables de entorno
│
└── rinkbot-frontend/            # Aplicación Angular
    ├── angular.json             # Configuración del workspace Angular
    ├── proxy.conf.json          # Proxy dev: /api/* → localhost:3000
    ├── tsconfig.json
    ├── package.json
    │
    └── src/
        ├── main.ts
        ├── styles.scss
        └── app/
            ├── app.config.ts
            ├── app.routes.ts
            ├── core/
            │   ├── services/
            │   │   ├── auth.service.ts           # Login, logout, JWT en localStorage
            │   │   ├── chat.service.ts           # Signals de mensajes, envío con/sin imagen
            │   │   ├── voice.service.ts          # SpeechRecognition + SpeechSynthesis
            │   │   └── user-preferences.service.ts  # Preferencias de idioma y UI
            │   ├── guards/
            │   │   └── auth.guard.ts
            │   ├── interceptors/
            │   │   └── jwt.interceptor.ts
            │   └── models/
            │       ├── user.model.ts
            │       ├── message.model.ts
            │       └── chat.model.ts
            └── pages/
                ├── home/          # Splash de bienvenida (ruta /)
                ├── login/         # Formulario de autenticación (ruta /login)
                └── chat/          # App principal: chat, voz, imagen, historial (ruta /chat)
```

---

## Flujo general de funcionamiento

```
1. ENTRADA
   Usuario abre http://tudominio.com
       → Angular Router evalúa la ruta /
       → AuthGuard: si ya hay token en localStorage → navega a /chat
       → Si no → Home (splash) → /login

2. AUTENTICACIÓN
   Usuario ingresa credenciales en /login
       → POST /api/login { usuario, password }
       → Backend: consulta public.persona con pgcrypto.crypt()
       → Si válido: genera JWT, devuelve { ok, user, token }
       → Token guardado en localStorage → navega a /chat

3. CHAT (TEXTO)
   Usuario escribe un mensaje en /chat
       → POST /api/chat { message }   (JSON)
       → classifyIntent(): greeting | internal | general
       → getHistory(): carga los últimos 6 turnos de la DB (si no expiró la sesión)
       → Si intent ≠ greeting y Drive configurado:
           embed(query) → búsqueda vectorial en drive_chunks → contexto RAG
       → Si RAG sin confianza suficiente y mensaje relevante y web search activa:
           SerpAPI → snippets web
       → Construcción del system prompt dinámico (solo secciones con contenido)
       → OpenAI: [system, ...historial, user] → respuesta
       → saveHistory(): upsert del historial en public.chat (tipo_chat='session')
       → ChatService actualiza Signal → componente re-renderiza

4. CHAT (CON IMAGEN)
   Usuario adjunta una imagen + escribe en /chat
       → POST /api/chat  multipart/form-data { message, imagen }
       → multer valida tipo MIME y tamaño
       → Historial conversacional omitido para esta petición
       → system prompt de visión
       → OpenAI recibe texto + imagen en base64 → respuesta descriptiva

5. INDEXACIÓN DE DRIVE (admin)
   POST /api/drive/sync (con JWT de admin)
       → driveIndexer recorre carpeta → extrae texto → chunks → embeddings → drive_chunks
       → Estado incremental en drive_sync_state (retomable en múltiples lotes)

6. PERSISTENCIA DE CHATS
   Usuario presiona "Guardar"
       → POST /api/chats { tipo_chat, titulo, chat_json }
       → Guardado en public.chat (diferente de la sesión activa)
       → Panel "Mensajes" / "Favoritos" muestra el historial
```

---

## Despliegue

### Estrategia recomendada (MVP)

Un único contenedor Node.js sirve el frontend Angular compilado y la API, conectándose a servicios externos (Supabase, OpenAI, Google Drive).

```
Internet → Nginx/Caddy (TLS) → Express :3000
                                  ├── Angular SPA  (dist/browser/ — archivos estáticos)
                                  ├── /api/*       (API REST protegida con JWT)
                                  ├── /health      (health check)
                                  └── * catch-all  (devuelve index.html para client-side routing)
```

El `Dockerfile` usa **build multi-stage**:
1. **Stage `builder`** — instala dependencias del frontend y ejecuta `ng build --configuration production`.
2. **Stage `runtime`** — imagen Alpine limpia con solo las dependencias de producción del backend. Copia `Backend/` y el `dist/` del stage anterior.

### Railway (opción más simple)

El repo incluye `railway.toml` preconfigurado:

1. Conectar el repositorio a Railway
2. Configurar todas las variables de entorno en el dashboard — incluyendo `GOOGLE_SERVICE_ACCOUNT_JSON` con el JSON completo en una sola línea
3. Railway detecta el `Dockerfile` automáticamente y aplica `railway.toml`
4. El health check apunta a `GET /health` con timeout de 30s

### Variables críticas a configurar en producción

```
JWT_SECRET=<64 chars aleatorios — nunca usar el valor del .env.example>
NODE_ENV=production
CORS_ORIGIN=https://tudominio.com
DB_SSL_REJECT_UNAUTHORIZED=true
```

> **Advertencia:** `JWT_SECRET` con el valor placeholder del `.env.example` es un riesgo de seguridad crítico. Generar antes de cualquier deploy:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## Estado actual del proyecto

### Funcionalidades implementadas y operativas
- ✅ Autenticación JWT completa (login, middleware, expiración, logout)
- ✅ Control de roles (`admin` / `usuario`) — middleware `adminOnly`, rutas de Drive protegidas con 403
- ✅ Chat de texto con RAG sobre Google Drive
- ✅ Clasificación de intención de mensajes (`classifyIntent`) — reemplaza flags deprecados
- ✅ Historial conversacional persistente en DB (max 6 turnos, TTL 30 min, budget 18k chars)
- ✅ Análisis de imágenes adjuntas via OpenAI Vision (`gpt-5-nano`)
- ✅ Chat de voz (STT + TTS via Web Speech API — Chrome/Edge)
- ✅ Indexación incremental de Drive (PDF, DOCX, XLSX, PPTX, Google Docs/Sheets/Slides)
- ✅ Reindexación por ID (`/api/drive/reindex`) — sin necesidad de acceso a la carpeta raíz
- ✅ Credenciales de Google Drive via variable de entorno `GOOGLE_SERVICE_ACCOUNT_JSON`
- ✅ Historial de chats guardados con favoritos y eliminación
- ✅ Búsqueda web como fallback con gating por intención y confianza RAG
- ✅ Logging estructurado JSON con Pino
- ✅ Health check con diagnóstico real de DB
- ✅ HTTPS automático en LAN (certificado autofirmado con `generate-cert.sh`)
- ✅ Graceful shutdown con `SIGTERM` / `SIGINT` (cierre ordenado de peticiones en vuelo)
- ✅ Frontend Angular servido desde Express (build de producción en `dist/browser/`)
- ✅ Contenedorización con Docker y Docker Compose
- ✅ Configuración Railway lista (`railway.toml`)

### Paneles del rail lateral sin funcionalidad implementada
Los siguientes paneles están declarados en el componente `Chat` pero muestran un placeholder:
- Panel **Soporte** — placeholder ("Adjunta audios, crea tickets o agenda una llamada")
- Panel **Notificaciones** — placeholder ("Alertas y novedades del sistema")
- Panel **Reunión** — placeholder ("Organiza o únete a una reunión")
- Panel **HSEQ** — placeholder ("Accesos rápidos a políticas, formatos y material HSEQ")
- Panel **Inicio** — placeholder ("Atajos y últimas acciones")

### Deuda técnica conocida
- No existe script SQL de inicialización del esquema de base de datos en el repositorio
- El logger Pino puede inicializarse antes de que `dotenv.config()` cargue las vars en ciertos escenarios de módulos ESM

---

## Problemas conocidos y pendientes

| Prioridad | Problema | Archivo |
|---|---|---|
| 🔴 Alta | `JWT_SECRET` debe cambiarse antes de cualquier deploy real | `Backend/.env` |
| 🟡 Media | `CORS_ORIGIN=*` y `DB_SSL_REJECT_UNAUTHORIZED=false` en `.env` de desarrollo | `Backend/.env` |
| 🟡 Media | RLS (Row Level Security) de Supabase no habilitado — acceso a tablas sin restricción a nivel DB | Supabase |
| 🟢 Baja | Esquema SQL de la DB no está incluido en el repositorio | — |
| 🟢 Baja | Columna `nombre` no existe en `persona` — el frontend muestra `usuario` como fallback | `public.persona` |
| 🟢 Baja | Las filas `tipo_chat='session'` crecen indefinidamente sin TTL automático en DB — limpiar con `clearSessions.js` periódicamente | `Backend/sessionStore.js` |

---

## Autor

Desarrollado por **BRACO ESTUDIO** para **Serinco / HSEQ**.

Repositorio: [github.com/BracoTic/RinkbBot](https://github.com/BracoTic/RinkbBot)

---

*Versión del sistema: 2.5.0 — Historial conversacional persistente, análisis de imágenes via OpenAI Vision con barra de progreso, clasificación de intención de mensajes, HTTPS automático en LAN, graceful shutdown, Railway config. Modelo de chat: `gpt-5-nano`. ~10.000 líneas de código. Documentación hecha a partir del código fuente real del repositorio.*
