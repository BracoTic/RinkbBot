# RinkBot

Chatbot corporativo con inteligencia artificial para gestión del conocimiento interno. Integra RAG (*Retrieval-Augmented Generation*) sobre documentos de Google Drive, chat de texto, chat de voz, historial persistente en base de datos y búsqueda web como fallback.

---

## Descripción general

RinkBot es una herramienta interna desarrollada para **Serinco / área HSEQ**. Permite a los colaboradores hacer preguntas en lenguaje natural y obtener respuestas contextualizadas usando los documentos oficiales de la organización como fuente de conocimiento.

El sistema indexa automáticamente carpetas de Google Drive (PDFs, DOCX, XLSX, PPTX, Google Docs/Sheets/Slides), genera embeddings vectoriales de los contenidos y los almacena en PostgreSQL. Cuando un usuario hace una pregunta, el backend recupera los fragmentos más relevantes y los inyecta como contexto al modelo de lenguaje de OpenAI antes de generar la respuesta.

---

## Objetivo del proyecto

Resolver la dispersión del conocimiento corporativo: procedimientos, políticas, formatos y normativas HSEQ estaban distribuidos en archivos de Drive sin un punto de consulta centralizado. RinkBot actúa como ese punto: un asistente que "conoce" los documentos y puede responderle a cualquier empleado en tiempo real.

---

## Tecnologías utilizadas

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22+ LTS | Runtime |
| Express | ^5.1.0 | Servidor HTTP |
| OpenAI SDK | ^6.9.1 | Chat completions + embeddings |
| `pg` (node-postgres) | ^8.16.3 | Cliente PostgreSQL |
| Supabase | Cloud | Base de datos PostgreSQL + extensión `pgvector` |
| googleapis | ^168.0.0 | Google Drive API v3 |
| jsonwebtoken | ^9.0.3 | Autenticación JWT |
| pino | ^10.3.1 | Logging estructurado JSON |
| helmet | ^8.1.0 | Headers de seguridad HTTP |
| express-rate-limit | ^8.3.2 | Rate limiting por IP |
| compression | ^1.8.1 | Compresión gzip de respuestas |
| mammoth | ^1.11.0 | Extracción de texto desde DOCX |
| pdf-parse | ^2.4.5 | Extracción de texto desde PDF |
| exceljs | ^4.4.0 | Extracción de texto desde XLSX |
| adm-zip | ^0.5.16 | Extracción de texto desde PPTX |
| dotenv | ^17.2.3 | Variables de entorno |

### Frontend
| Tecnología | Uso |
|---|---|
| HTML5 / CSS3 | Estructura y estilos |
| JavaScript vanilla (ES6+) | Lógica del cliente, sin framework ni bundler |
| Web Speech API (SpeechRecognition) | Reconocimiento de voz (STT) |
| SpeechSynthesis API | Síntesis de voz (TTS) |
| marked.js (CDN) | Renderizado de Markdown en respuestas del bot |
| localStorage | Historial de sesión local |

### Servicios externos
| Servicio | Propósito |
|---|---|
| OpenAI API | Chat (`gpt-4o-mini` por defecto) + embeddings (`text-embedding-3-small`) |
| Google Drive API | Lectura de documentos corporativos |
| SerpAPI | Búsqueda web como fallback (opcional, desactivada por defecto) |
| Supabase | PostgreSQL con extensión `pgvector` para búsqueda vectorial |

### Infraestructura / Despliegue
- Docker + Docker Compose
- `.dockerignore` configurado
- Compatible con Railway, Render o cualquier plataforma que soporte contenedores Node.js

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
│  ┌──────────────┐  ┌─────────────────┐  │
│  │  Frontend    │  │   API REST      │  │
│  │  (estático)  │  │  /api/*         │  │
│  │  HTML/CSS/JS │  │  JWT protegido  │  │
│  └──────────────┘  └────────┬────────┘  │
└───────────────────────────  │  ─────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │  PostgreSQL  │ │  OpenAI API  │ │  Google      │
      │  (Supabase)  │ │  Chat +      │ │  Drive API   │
      │  + pgvector  │ │  Embeddings  │ │  (indexación)│
      └──────────────┘ └──────────────┘ └──────────────┘
```

El frontend y el backend corren en el **mismo proceso y puerto**. Express sirve los archivos estáticos del frontend y expone la API en `/api/*`. No hay un servidor de frontend separado en producción.

---

## Requisitos previos

- **Node.js 22+** (el proyecto usa ESM nativo — `"type": "module"`)
- **npm** (incluido con Node.js)
- **Cuenta de Supabase** con una base de datos PostgreSQL y la extensión `pgvector` habilitada
- **Cuenta de OpenAI** con acceso a la API (modelos `gpt-4o-mini` y `text-embedding-3-small`)
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

> El frontend no tiene dependencias npm — es HTML/CSS/JS estático puro.

### 3. Configurar el archivo de credenciales de Google Drive

Coloca el archivo `service-account.json` de tu cuenta de servicio de Google Cloud en:

```
Backend/config/service-account.json
```

> Este archivo **no debe commitearse** ni copiarse en la imagen Docker. Está en `.gitignore` y `.dockerignore`.

### 4. Configurar las variables de entorno

```bash
cp Backend/.env.example Backend/.env
# Editar Backend/.env con tus valores reales
```

Ver sección [Configuración de entorno](#configuración-de-entorno) para detalle de cada variable.

### 5. Preparar la base de datos

El esquema de base de datos debe estar creado en Supabase antes de ejecutar el sistema. Las tablas requeridas son:

- `public.persona` — usuarios del sistema
- `public.chat` — historial de conversaciones guardadas
- `public.drive_files` — registro de archivos indexados desde Drive
- `public.drive_chunks` — fragmentos de texto con embeddings vectoriales
- `public.drive_sync_state` — estado de sincronización por carpeta

> **Nota:** No se incluye script SQL de creación de tablas en el repositorio. El esquema debe crearse manualmente en Supabase. Consultar el código de `Backend/chatStore.js`, `Backend/driveIndexer.js` y `Backend/rag.js` para inferir la estructura exacta de cada tabla.

---

## Configuración de entorno

Basada en `Backend/.env.example`. Copiar como `Backend/.env` y completar con valores reales.

### OpenAI
```env
OPENAI_API_KEY=sk-proj-...          # Clave de API de OpenAI
OPENAI_MODEL=gpt-4o-mini            # Modelo de chat
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Modelo de embeddings
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
```

### JWT y Servidor
```env
JWT_SECRET=string_aleatorio_de_64_chars_minimo   # ⚠️ CAMBIAR ANTES DE PRODUCCIÓN
JWT_EXPIRES_IN=8h
PORT=3000
CORS_ORIGIN=*                        # En producción: https://tudominio.com
```

### RAG
```env
RAG_TOP_K=10                         # Fragmentos a recuperar por query
RAG_MIN_SIMILARITY=0.45              # Umbral mínimo de similitud coseno
RAG_DISABLE_FOR_SMALL_QUERIES=true   # No usar RAG para mensajes casuales cortos
RAG_MIN_QUERY_CHARS=25
RAG_BLOCKLIST_REGEX=contrasen|password|clave|secret|api[_-]?key|token
```

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
MAX_MESSAGE_CHARS=4000               # Límite de caracteres por mensaje
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
cd Backend
npm run dev       # Inicia con --watch (reinicio automático al guardar)
```

El sistema queda disponible en:
- **App:** `http://localhost:3000`
- **Login:** `http://localhost:3000/HTML/login.html`
- **Health check:** `http://localhost:3000/health`

> **Alternativa de desarrollo:** Si prefieres separar frontend y backend durante el desarrollo, puedes servir el frontend con `npx serve Frontend --listen 8080`. El archivo `Frontend/JavaScript/config.js` detecta automáticamente el puerto 8080 y apunta las peticiones API a `http://localhost:3000`.

### Producción (sin Docker)

```bash
cd Backend
npm start         # node server.js
```

### Producción con Docker Compose

```bash
# Asegúrate de tener Backend/config/service-account.json en su lugar

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

### Scripts disponibles

Definidos en `Backend/package.json`:

| Script | Comando | Descripción |
|---|---|---|
| `npm run dev` | `node --watch server.js` | Desarrollo con hot-reload |
| `npm start` | `node server.js` | Producción |
| `npm run check` | `node --check *.js` | Verifica sintaxis de archivos principales |

---

## Funcionalidades principales

### Chat de texto
- El usuario escribe una pregunta en lenguaje natural.
- El backend determina si la query requiere contexto RAG (se omite para saludos o mensajes cortos).
- Si RAG aplica, se recuperan los fragmentos más relevantes de los documentos indexados.
- Si no hay contexto RAG y la búsqueda web está activada, se consulta Google vía SerpAPI.
- La respuesta del LLM se muestra con formato Markdown en el navegador.
- Opcionalmente se añaden las fuentes (nombre del documento + similitud).

### Chat de voz
- El usuario habla al micrófono (requiere Chrome o Edge).
- El navegador transcribe la voz con la Web Speech API.
- La transcripción se envía al mismo endpoint `/api/chat`.
- La respuesta se reproduce automáticamente con síntesis de voz (TTS) en español, con selección de voz preferida.

### Historial de conversaciones
- Los chats pueden guardarse en la base de datos con título y tipo (texto / voz).
- Desde el panel lateral "Mensajes" se pueden listar, filtrar por favoritos, abrir, releer y eliminar conversaciones guardadas.
- Hay un historial local temporal en `localStorage` limitado a los últimos 100 mensajes por sesión.

### Sincronización de Google Drive
- El endpoint `POST /api/drive/sync` inicia la indexación de una carpeta de Drive.
- El sistema procesa archivos en lotes configurables y soporta: PDF, DOCX, XLSX, PPTX, Google Docs, Google Sheets, Google Slides y archivos de texto plano.
- Cada archivo se divide en fragmentos con solapamiento, se generan sus embeddings y se almacenan en la tabla `drive_chunks`.
- Los archivos ya indexados y sin cambios (mismo MD5 o fecha de modificación) se omiten.

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
| `POST` | `/api/chat` | Envía un mensaje. Body: `{ message, tipo_chat?, titulo?, save? }`. Devuelve la respuesta del LLM con fuentes opcionales |

#### Historial de chats
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/chats` | Lista los chats del usuario. Query: `?limit=20` |
| `GET` | `/api/chats/:id_chat` | Devuelve el detalle completo de un chat (solo si pertenece al usuario) |
| `POST` | `/api/chats` | Guarda un chat manualmente. Body: `{ tipo_chat, titulo, chat_json, favorito? }` |
| `PATCH` | `/api/chats/:id_chat/favorite` | Marca / desmarca favorito. Body: `{ favorito: boolean }` |
| `DELETE` | `/api/chats/:id_chat` | Elimina un chat (solo si pertenece al usuario) |

#### Google Drive sync
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/drive/sync` | Inicia sincronización. Body opcional: `{ folderId?, batchFiles? }`. Responde 202 inmediatamente |
| `GET` | `/api/drive/sync/state` | Consulta el estado actual de la sincronización. Query: `?folderId=` |
| `POST` | `/api/drive/sync/reset` | Resetea el estado de sync para volver a indexar desde cero |

---

## Autenticación y seguridad

### Flujo de login
1. El usuario envía `POST /api/login` con `{ usuario, password }`.
2. El backend verifica las credenciales contra `public.persona` usando `pgcrypto.crypt()` (hash bcrypt en DB).
3. Si son válidas, genera un JWT firmado con `JWT_SECRET` y expiración `JWT_EXPIRES_IN` (default 8h).
4. El frontend guarda el token en `localStorage` como `rinkbot_token`.
5. Todas las peticiones posteriores incluyen `Authorization: Bearer <token>`.
6. El middleware `authMiddleware` en `Backend/middleware/auth.js` valida el token en cada request protegido.
7. El `id_persona` del usuario se extrae del JWT — nunca del body del request.

### Controles de seguridad activos
- **Helmet:** headers HTTP de seguridad (CSP, HSTS, X-Frame-Options, etc.)
- **Rate limiting:** 15 intentos de login por IP en 15 minutos; 60 requests/min para la API general
- **CORS:** configurable por variable de entorno (`CORS_ORIGIN`)
- **Logging sin datos sensibles:** Pino con `redact` sobre `Authorization`, `password` y `password_hash`
- **Sin secretos en código:** todas las claves viven en variables de entorno
- **0 vulnerabilidades npm** (auditado en Fase 2)

### Nota técnica
> El endpoint `/api/drive/sync` está protegido por JWT pero **no verifica roles**. Cualquier usuario autenticado puede disparar una sincronización. Se recomienda añadir un campo de rol en `public.persona` y un middleware de verificación antes de exponer este endpoint a usuarios finales no administradores.

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
| `ultimo_acceso` | timestamp | Actualizado en cada login exitoso |

#### `public.chat`
Conversaciones guardadas.

| Columna | Tipo inferido | Descripción |
|---|---|---|
| `id_chat` | serial | Identificador único |
| `id_persona` | integer | FK a `persona` |
| `tipo_chat` | varchar | `texto` o `voz` |
| `titulo` | varchar | Título de la conversación |
| `modelo_llm` | varchar | Modelo usado (ej. `gpt-4o-mini`) |
| `chat_json` | jsonb | Conversación completa serializada |
| `favorito` | boolean | Si está marcado como favorito |
| `created_at` | timestamp | Fecha de creación |

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
| `status` | varchar | `processing`, `indexed`, `skipped` |
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
├── Dockerfile                   # Imagen Docker única (backend + frontend)
├── docker-compose.yml           # Orquestación para desarrollo/deploy
├── .dockerignore
├── .gitignore
│
├── Backend/
│   ├── server.js                # Entry point — Express, rutas, middleware
│   ├── auth.js                  # Lógica de login (validación DB + JWT)
│   ├── db.js                    # Pool de PostgreSQL + función ping()
│   ├── openaiClient.js          # Singleton lazy del cliente OpenAI
│   ├── logger.js                # Singleton Pino (logging estructurado JSON)
│   ├── rag.js                   # Recuperación de contexto + caché de embeddings
│   ├── driveIndexer.js          # Indexación de archivos de Google Drive
│   ├── driveClient.js           # Cliente de la API de Google Drive
│   ├── chatStore.js             # CRUD de conversaciones en PostgreSQL
│   ├── webSearch.js             # Búsqueda web via SerpAPI (fallback)
│   ├── middleware/
│   │   └── auth.js              # JWT: generateToken() + authMiddleware()
│   ├── package.json
│   ├── .env                     # Variables de entorno (no commiteado)
│   └── .env.example             # Plantilla de variables de entorno
│
└── Frontend/
    ├── index.html               # Entry point → redirect a HTML/home.html
    ├── HTML/
    │   ├── home.html            # Pantalla de inicio con branding corporativo
    │   ├── login.html           # Formulario de autenticación
    │   └── homelogin.html       # Aplicación principal (chat, paneles, voz)
    ├── CSS/
    │   ├── HomeStyles.css       # Estilos de la pantalla de inicio
    │   ├── LoginStyles.css      # Estilos del formulario de login
    │   └── HomeLoginStyles.css  # Estilos de la aplicación principal
    ├── JavaScript/
    │   ├── config.js            # API base URL (auto-detecta dev vs prod)
    │   ├── login.js             # Lógica del formulario de login
    │   ├── script.js            # Navegación del botón en home.html
    │   └── HomeLogin.js         # Lógica completa de la aplicación (~1350 líneas)
    └── Assets/
        ├── Rinko.png            # Avatar del chatbot
        ├── RinkBotGra.png       # Logo principal
        ├── RinkBotHor.png       # Logo horizontal (login)
        ├── Avatar.png           # Avatar genérico de usuario
        ├── FondoRinko1/2/3.png  # Fondos para cada pantalla
        ├── Serinco.png          # Logo Serinco
        ├── HSEQ.png / HSEQLogo.png  # Logos HSEQ
        └── RinkoEscribe/Habla/ImgGrande.png  # Ilustraciones
```

---

## Flujo general de funcionamiento

```
1. ENTRADA
   Usuario abre http://tudominio.com
       → index.html redirige a HTML/home.html (splash con branding)
       → Botón "Iniciar sesión" → HTML/login.html

2. AUTENTICACIÓN
   Usuario ingresa credenciales
       → Frontend: POST /api/login
       → Backend: consulta public.persona con pgcrypto.crypt()
       → Si válido: genera JWT, devuelve { user, token }
       → Frontend guarda en localStorage: rinkbot_user, rinkbot_token
       → Redirección a HTML/homelogin.html

3. CHAT
   Usuario escribe/habla un mensaje
       → Frontend: POST /api/chat con { message } + Authorization: Bearer <token>
       → Backend valida JWT → extrae id_persona
       → ¿Query suficientemente larga y no casual?
           SÍ → embed(query) → búsqueda vectorial en drive_chunks → contexto relevante
           NO → contexto vacío
       → ¿Sin contexto RAG y web search activada?
           SÍ → SerpAPI → snippets web
       → OpenAI gpt-4o-mini con contexto + pregunta → respuesta
       → Frontend renderiza Markdown, opcionalmente reproduce TTS

4. INDEXACIÓN DE DRIVE (operación de administración)
   POST /api/drive/sync (con JWT)
       → driveIndexer recorre carpeta en Google Drive
       → Para cada archivo nuevo/modificado:
           extrae texto (PDF/DOCX/XLSX/PPTX/Google Docs...)
           divide en chunks con solapamiento
           genera embeddings via OpenAI
           almacena en drive_chunks con vector
       → Estado incremental guardado en drive_sync_state
       → Puede retomarse en múltiples lotes

5. PERSISTENCIA DE CHATS
   Usuario presiona "Guardar"
       → Frontend: POST /api/chats con { tipo_chat, titulo, chat_json }
       → Backend guarda en public.chat vinculado al id_persona del JWT
       → Panel "Mensajes" muestra el historial desde /api/chats
```

---

## Despliegue

### Estrategia recomendada (MVP)

El diseño apunta a **un único contenedor Node.js** que sirve tanto el frontend estático como la API, conectándose a servicios externos (Supabase, OpenAI, Google Drive).

```
Internet → Nginx/Caddy (TLS) → Express :3000
                                  ├── Frontend estático
                                  ├── /api/*
                                  └── /health (health check)
```

### Railway / Render (opción más simple)
1. Conectar el repositorio a Railway o Render
2. Configurar todas las variables de entorno en el dashboard de la plataforma
3. Subir `service-account.json` como **Secret File** en la ruta `/app/Backend/config/service-account.json`
4. Apuntar el health check a `GET /health` con umbral HTTP 503
5. La plataforma detecta el `Dockerfile` automáticamente

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
- ✅ Chat de texto con RAG sobre Google Drive
- ✅ Chat de voz (STT + TTS via Web Speech API — Chrome/Edge)
- ✅ Indexación incremental de Drive (PDF, DOCX, XLSX, PPTX, Google Docs/Sheets/Slides)
- ✅ Historial de chats persistido en DB con favoritos y eliminación
- ✅ Búsqueda web como fallback (SerpAPI, desactivada por defecto)
- ✅ Logging estructurado JSON con Pino
- ✅ Health check con diagnóstico real de DB
- ✅ Frontend servido desde Express (mismo proceso y puerto)
- ✅ Contenedorización con Docker y Docker Compose

### Partes incompletas / sin implementar en el frontend
Los siguientes paneles del rail lateral están declarados en el HTML pero **sin funcionalidad implementada**:
- Panel **Soporte** — placeholder ("Adjunta audios, crea tickets o agenda una llamada")
- Panel **Notificaciones** — placeholder ("Alertas y novedades del sistema")
- Panel **Reunión** — placeholder ("Organiza o únete a una reunión")
- Panel **HSEQ** — placeholder ("Accesos rápidos a políticas, formatos y material HSEQ")
- Panel **Inicio** — placeholder ("Atajos y últimas acciones")
- Panel **Tiempo** — redirige al historial de chats (no implementa reloj/turnos)

### Deuda técnica conocida
- No existe script SQL de inicialización del esquema de base de datos en el repositorio
- Sin control de roles: cualquier usuario autenticado puede disparar sincronizaciones de Drive
- Sin graceful shutdown (`SIGTERM` handler) para cerrar el pool de DB limpiamente
- Dos imports separados de `driveIndexer.js` en `server.js` (líneas 17 y 19) — cosmético
- El logger Pino puede inicializarse antes de que `dotenv.config()` cargue las vars en ciertos escenarios de módulos ESM

---

## Problemas conocidos y pendientes

| Prioridad | Problema | Archivo |
|---|---|---|
| 🔴 Alta | `JWT_SECRET` debe cambiarse antes de cualquier deploy real | `Backend/.env` |
| 🟡 Media | Sin SIGTERM handler — peticiones en vuelo pueden cortarse al reiniciar | `Backend/server.js` |
| 🟡 Media | Sin control de roles en `/api/drive/sync` | `Backend/server.js` |
| 🟡 Media | `CORS_ORIGIN=*` y `DB_SSL_REJECT_UNAUTHORIZED=false` en `.env` de desarrollo | `Backend/.env` |
| 🟢 Baja | `limit` en `/api/chats` sin cota máxima (`?limit=999999` es válido) | `Backend/server.js` |
| 🟢 Baja | Dos líneas `import` de `driveIndexer.js` en `server.js` | `Backend/server.js:17,19` |
| 🟢 Baja | Esquema SQL de la DB no está incluido en el repositorio | — |

---

## Autor

Desarrollado por **BRACO ESTUDIO** para **Serinco / HSEQ**.

Repositorio: [github.com/BracoTic/RinkbBot](https://github.com/BracoTic/RinkbBot)

---

*Versión del sistema: 1.0.0 — Documentación generada a partir del código fuente real del repositorio.*
