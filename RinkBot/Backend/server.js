// Backend/server.js
import https from "https";
import fs from "fs";
import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import logger from "./logger.js";
import { login } from "./auth.js";
import { authMiddleware } from "./middleware/auth.js";
import { adminOnly } from "./middleware/adminOnly.js";
import { ping as dbPing } from "./db.js";
import { retrieveContext } from "./rag.js";
import { searchWeb } from "./webSearch.js";
import { syncDriveBatch, resetDriveSyncState, getDriveSyncState, reindexPendingFiles } from "./driveIndexer.js";
import { createChat, listChats, getChat, setChatFavorite, deleteChat } from "./chatStore.js";
import { getOpenAIClient } from "./openaiClient.js";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// --------------------
// SEGURIDAD: Helmet + Compression
// --------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      scriptSrc:               ["'self'", "'unsafe-inline'"],
      styleSrc:                ["'self'", "https:", "'unsafe-inline'"],
      fontSrc:                 ["'self'", "https:", "data:"],
      imgSrc:                  ["'self'", "https:", "data:", "blob:"], // https: permite avatar_url externas
      connectSrc:              ["'self'"],
      upgradeInsecureRequests: null,  // desactivado: evita conflictos en modo HTTP fallback
    },
  },
  // Permite que el HTML cargue imágenes y scripts de su mismo origen sin restricción CORP
  crossOriginResourcePolicy:   { policy: "same-site" },
  crossOriginEmbedderPolicy:   false,
}));
app.use(compression());

// --------------------
// CORS
// --------------------
const allowedOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: allowedOrigin === "*" ? "*" : allowedOrigin.split(",").map(s => s.trim()),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: allowedOrigin !== "*",
  })
);

app.use(express.json({ limit: "2mb" }));

// --------------------
// FRONTEND ESTÁTICO
// En producción Express sirve el frontend desde el mismo proceso.
// En desarrollo local puedes seguir usando `npx serve Frontend` en puerto 8080.
// --------------------
app.use(express.static(path.join(__dirname, "../rinkbot-frontend/dist/browser")));

// --------------------
// RATE LIMITING
// --------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15,                   // 15 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiados intentos de login. Intenta en 15 minutos." },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60,                  // 60 requests por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiadas solicitudes. Espera un momento." },
});

// Aplicar rate limit general a /api/*
app.use("/api/", apiLimiter);

// Log de requests para diagnóstico
app.use("/api/", (req, _res, next) => {
  logger.info({ method: req.method, path: req.path, auth: !!req.headers.authorization }, "api request");
  next();
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SYSTEM_FOLDER_ID = process.env.SYSTEM_FOLDER_ID;
const MAX_MESSAGE_CHARS = Number(process.env.MAX_MESSAGE_CHARS || 4000);
const MAX_IMAGE_BYTES = parseInt(process.env.MAX_IMAGE_BYTES || "10485760");

// --------------------
// MULTER — image uploads (memory storage, no disk writes)
// --------------------
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const _multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(Object.assign(new Error("Tipo de imagen no permitido"), { status: 400 }));
  },
});

function chatUploadMiddleware(req, res, next) {
  if (req.is("application/json")) return next();
  _multerUpload.single("imagen")(req, res, (err) => {
    if (!err) return next();
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ ok: false, error: err.message });
  });
}

// --------------------
// HEALTH CHECK (público — útil para load balancers y monitoreo)
// --------------------
app.get("/health", async (req, res) => {
  let dbOk = false;
  let dbMs = null;

  try {
    const t = Date.now();
    await dbPing();
    dbMs = Date.now() - t;
    dbOk = true;
  } catch (_) {}

  const mem = process.memoryUsage();
  const status = dbOk ? "ok" : "error";

  res.status(dbOk ? 200 : 503).json({
    status,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      database:  { status: dbOk ? "ok" : "error", latencyMs: dbMs },
      openai:    { status: process.env.OPENAI_API_KEY ? "configured" : "missing" },
      drive:     { status: SYSTEM_FOLDER_ID ? "configured" : "not_configured" },
      webSearch: { status: (process.env.WEB_SEARCH_ENABLED === "true" && process.env.SERPAPI_KEY) ? "configured" : "disabled" },
    },
    memory: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      rssMb:      Math.round(mem.rss / 1024 / 1024),
    },
  });
});

// --------------------
// LOGIN (público + rate limit reforzado)
// --------------------
app.post("/api/login", loginLimiter, async (req, res) => {
  try {
    const { usuario, password } = req.body || {};

    if (!usuario || !password) {
      return res.status(400).json({
        ok: false,
        error: "Faltan campos: usuario y password",
      });
    }

    const result = await login(usuario, password);

    if (!result) {
      return res.status(401).json({ ok: false, error: "Credenciales inválidas" });
    }

    return res.json({ ok: true, user: result.user, token: result.token });
  } catch (e) {
    logger.error({ err: e?.message }, "login failed");
    return res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});

// --------------------
// SETTINGS (público - no expone datos sensibles)
// --------------------
app.get("/api/settings", (req, res) => {
  res.json({
    provider: "openai",
    model: MODEL,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    folderIdConfigured: !!SYSTEM_FOLDER_ID,
  });
});

// ===========================================================
//  TODAS LAS RUTAS DEBAJO REQUIEREN AUTENTICACIÓN
// ===========================================================
app.use("/api/", authMiddleware);

// --------------------
// DRIVE SYNC (protegido)
// --------------------
let DRIVE_SYNC_RUNNING = false;

function compactStateForApi(state) {
  if (!state) return state;
  const q = Array.isArray(state.queue) ? state.queue : [];
  return {
    done: !!state.done,
    scannedFolders: state.scannedFolders || 0,
    scannedFiles: state.scannedFiles || 0,
    indexed: state.indexed || 0,
    skipped: state.skipped || 0,
    errors: state.errors || 0,
    queueRemaining: q.length,
  };
}

app.post("/api/drive/sync", adminOnly, async (req, res) => {
  try {
    const folderId = req.body?.folderId || SYSTEM_FOLDER_ID;
    const batchFiles = Number(req.body?.batchFiles || process.env.DRIVE_SYNC_BATCH_FILES || 10);

    if (DRIVE_SYNC_RUNNING) {
      return res.status(409).json({ ok: false, error: "Sync ya está corriendo" });
    }

    DRIVE_SYNC_RUNNING = true;

    res.status(202).json({
      ok: true,
      started: true,
      folderId,
      batchFiles,
      message: "Sync started",
    });

    setImmediate(async () => {
      try {
        const out = await syncDriveBatch({ folderId, batchFiles });
        logger.info({
          done: out?.done,
          queueRemaining: out?.queueRemaining,
          state: compactStateForApi(out?.state),
        }, "drive sync batch completed");
      } catch (e) {
        logger.error({ err: e?.message }, "drive sync background error");
      } finally {
        DRIVE_SYNC_RUNNING = false;
      }
    });
  } catch (e) {
    DRIVE_SYNC_RUNNING = false;
    logger.error({ err: e?.message }, "drive sync start error");
    return res.status(500).json({ ok: false, error: "Error iniciando sync" });
  }
});

app.post("/api/drive/sync/reset", adminOnly, async (req, res) => {
  try {
    const folderId = req.body?.folderId || SYSTEM_FOLDER_ID;
    const out = await resetDriveSyncState(folderId);
    return res.json(out);
  } catch (e) {
    logger.error({ err: e?.message }, "drive sync reset error");
    return res.status(500).json({ ok: false, error: "Error reseteando sync" });
  }
});

app.post("/api/drive/reindex", adminOnly, async (req, res) => {
  try {
    const folderId = req.body?.folderId || SYSTEM_FOLDER_ID;
    const batchFiles = Number(req.body?.batchFiles || process.env.DRIVE_SYNC_BATCH_FILES || 10);
    const includeErrors = req.body?.includeErrors === true;
    res.json({ ok: true, started: true, message: "Reindex started" });
    (async () => {
      let total = { indexed: 0, skipped: 0, errors: 0 };
      while (true) {
        const r = await reindexPendingFiles({ folderId, batchFiles, includeErrors });
        total.indexed += r.indexed;
        total.skipped += r.skipped;
        total.errors += r.errors;
        if (r.pendingRemaining === 0) break;
      }
      logger.info({ ...total }, "reindex pending completed");
    })().catch((e) => logger.error({ err: e?.message }, "reindex pending error"));
  } catch (e) {
    logger.error({ err: e?.message }, "reindex pending error");
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/drive/sync/state", adminOnly, async (req, res) => {
  try {
    const folderId = req.query?.folderId || SYSTEM_FOLDER_ID;
    const st = await getDriveSyncState(folderId);

    const q = Array.isArray(st.queue) ? st.queue : [];
    return res.json({
      ok: true,
      folderId,
      state: {
        done: !!st.done,
        scannedFolders: st.scannedFolders || 0,
        scannedFiles: st.scannedFiles || 0,
        indexed: st.indexed || 0,
        skipped: st.skipped || 0,
        errors: st.errors || 0,
        queueRemaining: q.length,
      },
    });
  } catch (e) {
    logger.error({ err: e?.message }, "drive sync state error");
    return res.status(500).json({ ok: false, error: "Error obteniendo estado de sync" });
  }
});

// --------------------
// CHAT (RAG + OpenAI) — protegido, usa req.user.id_persona
// --------------------
app.post("/api/chat", chatUploadMiddleware, async (req, res) => {
  try {
    const id_persona = req.user.id_persona; // <-- del JWT, no del body
    const { message, tipo_chat = "texto", titulo = null, save = false } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ ok: false, error: "Falta 'message' (string) en el body" });
    }

    if (message.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({
        ok: false,
        error: `El mensaje excede el máximo de ${MAX_MESSAGE_CHARS} caracteres`,
      });
    }

    // -------- RAG gating --------
    let context = "";
    let sources = [];
    let bestSimilarity = null;

    const DISABLE_FOR_SMALL = (process.env.RAG_DISABLE_FOR_SMALL_QUERIES || "true") === "true";
    const MIN_QUERY_CHARS = Number(process.env.RAG_MIN_QUERY_CHARS || 25);

    const BLOCKLIST_REGEX =
      process.env.RAG_BLOCKLIST_REGEX || "contrasen|password|clave|secret|api[_-]?key|token";

    const msg = (message || "").trim();
    const looksCasual =
      msg.length < MIN_QUERY_CHARS ||
      /^(hola|buenas|hey|gracias|ok|listo|dale|perfecto|bien|qué tal)\b/i.test(msg);

    const shouldUseRag = !!SYSTEM_FOLDER_ID && !(DISABLE_FOR_SMALL && looksCasual);

    if (shouldUseRag) {
      const out = await retrieveContext({
        folderId: SYSTEM_FOLDER_ID,
        query: msg,
        blocklistRegex: BLOCKLIST_REGEX,
      });

      context = out.context;
      sources = out.sources;
      bestSimilarity = out.bestSimilarity;
    }

    // -------- Web search fallback --------
    let webResults = [];
    const WEB_SEARCH_ENABLED = (process.env.WEB_SEARCH_ENABLED || "false") === "true";

    if (WEB_SEARCH_ENABLED && !context) {
      webResults = await searchWeb(msg);
    }

    // -------- Prompt --------
    const driveSection = context
      ? `[CONTEXTO INTERNO - Google Drive]\n${context}`
      : "[CONTEXTO INTERNO - Google Drive]\nNo se encontró información relevante en los documentos.";

    const webSection = webResults.length
      ? `[CONTEXTO EXTERNO - Búsqueda Web]\n` +
        webResults.map((r) => `- ${r.title}\n  ${r.snippet}\n  Fuente: ${r.url}`).join("\n\n")
      : "[CONTEXTO EXTERNO - Búsqueda Web]\nNo se realizó búsqueda web o no hubo resultados.";

    const messages = [
      {
        role: "system",
        content:
          "Eres RinkBot. Responde la pregunta del usuario usando el siguiente contexto.\n\n" +
          driveSection + "\n\n" + webSection + "\n\n" +
          "Reglas:\n" +
          "- Si hay conflicto entre fuentes, prioriza la información web (más actualizada).\n" +
          "- Si no encuentras información relevante en ninguna fuente, dilo honestamente.\n" +
          "- Cita la fuente cuando sea posible (nombre del documento o URL).",
      },
      {
        role: "user",
        content: req.file
          ? [
              { type: "text", text: msg },
              {
                type: "image_url",
                image_url: {
                  url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
                  detail: "auto",
                },
              },
            ]
          : msg,
      },
    ];

    const r = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages,
    });

    const reply = r.choices?.[0]?.message?.content || "";

    // -------- Guardar chat --------
    let saved = null;

    if (save === true) {
      const incomingChatJson = req.body?.chat_json;

      const payloadToSave = incomingChatJson ?? {
        question: msg,
        answer: reply,
        sources,
        bestSimilarity,
        createdAt: new Date().toISOString(),
      };

      saved = await createChat({
        id_persona,
        tipo_chat,
        titulo,
        modelo_llm: MODEL,
        chat_json: payloadToSave,
        favorito: false,
      });
    }

    // -------- Append fuentes al reply --------
    const appendSources = (process.env.CHAT_APPEND_SOURCES || "false") === "true";
    const maxSourcesToShow = Number(process.env.CHAT_MAX_SOURCES_TO_SHOW || 3);

    let finalReply = reply;

    if (appendSources && sources?.length) {
      const top = sources.slice(0, maxSourcesToShow);
      const srcLines = top
        .map((s, i) => {
          const name = s?.name || s?.drive_file_id;
          const sim = Number(s?.similarity || 0).toFixed(2);
          const link = s?.web_view_link || "";
          return `${i + 1}) ${name} (sim ${sim})${link ? ` — ${link}` : ""}`;
        })
        .join("\n");

      finalReply = `${reply}\n\nFuentes:\n${srcLines}`;
    }

    return res.json({
      ok: true,
      reply: finalReply,
      response: finalReply,   // alias para Angular ChatService
      sources,
      webSources: webResults,
      bestSourceSimilarity: sources?.[0]?.similarity ?? null,
      bestSimilarity,
      saved,
    });
  } catch (e) {
    logger.error({ err: e?.message }, "chat error");
    return res.status(500).json({ ok: false, error: "Error al conectar con OpenAI" });
  }
});

// --------------------
// CHATS CRUD — protegido, usa req.user.id_persona
// --------------------
app.get("/api/chats", async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    const limit = Math.min(Number(req.query?.limit || 20), 100);

    const chats = await listChats({ id_persona, limit });
    return res.json({ ok: true, chats });
  } catch (e) {
    logger.error({ err: e?.message }, "list chats error");
    return res.status(500).json({ ok: false, error: "Error listando chats" });
  }
});

app.get("/api/chats/:id_chat", async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    const id_chat = Number(req.params?.id_chat);
    if (!id_chat) return res.status(400).json({ ok: false, error: "Falta id_chat" });

    const chat = await getChat({ id_persona, id_chat });
    if (!chat) return res.status(404).json({ ok: false, error: "Chat no encontrado" });

    return res.json({ ok: true, chat });
  } catch (e) {
    logger.error({ err: e?.message }, "get chat error");
    return res.status(500).json({ ok: false, error: "Error obteniendo chat" });
  }
});

app.patch("/api/chats/:id_chat/favorite", async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    const id_chat = Number(req.params?.id_chat);
    const favorito = req.body?.favorito;

    if (!id_chat || typeof favorito !== "boolean") {
      return res.status(400).json({
        ok: false,
        error: "Body requerido: { favorito: boolean }",
      });
    }

    const out = await setChatFavorite({ id_persona, id_chat, favorito });
    if (!out) return res.status(404).json({ ok: false, error: "Chat no encontrado" });

    return res.json({ ok: true, chat: out });
  } catch (e) {
    logger.error({ err: e?.message }, "favorite chat error");
    return res.status(500).json({ ok: false, error: "Error actualizando favorito" });
  }
});

app.post("/api/chats", async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    const {
      tipo_chat = "texto",
      titulo = null,
      modelo_llm = null,
      chat_json,
      favorito = false,
    } = req.body || {};

    if (!chat_json) {
      return res.status(400).json({ ok: false, error: "Falta chat_json" });
    }

    const saved = await createChat({
      id_persona,
      tipo_chat,
      titulo,
      modelo_llm,
      chat_json,
      favorito: !!favorito,
    });

    return res.json({ ok: true, saved });
  } catch (e) {
    logger.error({ err: e?.message }, "create chat error");
    return res.status(500).json({ ok: false, error: "Error creando chat" });
  }
});

app.delete("/api/chats/:id_chat", async (req, res) => {
  try {
    const id_persona = req.user.id_persona;
    const id_chat = Number(req.params?.id_chat);

    if (!id_chat) {
      return res.status(400).json({ ok: false, error: "Falta id_chat" });
    }

    const out = await deleteChat({ id_persona, id_chat });
    if (!out) return res.status(404).json({ ok: false, error: "Chat no encontrado" });

    return res.json({ ok: true, deleted: out });
  } catch (e) {
    logger.error({ err: e?.message }, "delete chat error");
    return res.status(500).json({ ok: false, error: "Error eliminando chat" });
  }
});

// SPA fallback — todas las rutas no-API sirven el index.html de Angular
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "../rinkbot-frontend/dist/browser/index.html"));
});

const PORT = Number(process.env.PORT || 3000);

// --------------------
// HTTPS si existen los certificados, HTTP como fallback
// Genera los certs con:  bash generate-cert.sh 192.168.2.3
// --------------------
const CERT_KEY  = path.join(__dirname, "certs", "server.key");
const CERT_CRT  = path.join(__dirname, "certs", "server.crt");
const certsExist = process.env.HTTPS_ENABLED !== "false" && fs.existsSync(CERT_KEY) && fs.existsSync(CERT_CRT);

logger.info({ maxImageBytes: MAX_IMAGE_BYTES }, "image upload configured");

const startInfo = {
  port: PORT,
  protocol: certsExist ? "https" : "http",
  model: MODEL,
  driveConfigured: !!SYSTEM_FOLDER_ID,
  webSearchEnabled: process.env.WEB_SEARCH_ENABLED === "true",
  env: process.env.NODE_ENV || "development",
};

let server;

if (certsExist) {
  const sslOptions = {
    key:  fs.readFileSync(CERT_KEY),
    cert: fs.readFileSync(CERT_CRT),
  };
  server = https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
    logger.info(startInfo, "server started (HTTPS)");
  });
} else {
  server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(startInfo, "server started (HTTP — certs not found, mic disabled on LAN)");
  });
}

// Graceful shutdown — Railway (y Docker) envían SIGTERM antes de detener el contenedor.
// Dejamos que las peticiones en vuelo terminen (máx 10s) antes de cerrar.
function shutdown(signal) {
  logger.info({ signal }, "shutdown signal received");
  server.close(() => {
    logger.info("server closed — exiting");
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn("forced exit after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
