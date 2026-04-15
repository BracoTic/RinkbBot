// Backend/logger.js
// Singleton Pino. Importar así: import logger from "./logger.js"
// Salida: JSON en producción (apta para Datadog, CloudWatch, etc.)
// En desarrollo puedes filtrar con: node server.js | npx pino-pretty
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  // Elimina campos redundantes en el payload
  base: { service: "rinkbot-backend" },
  // Nunca loguear el header Authorization
  redact: {
    paths: ["req.headers.authorization", "*.password", "*.password_hash"],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
