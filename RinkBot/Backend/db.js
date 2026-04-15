// Backend/db.js
import pg from "pg";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();
const { Pool } = pg;

// SSL: configurable por entorno
const isProduction = process.env.NODE_ENV === "production";
const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== undefined
  ? process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"
  : isProduction;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: sslRejectUnauthorized },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("connect", () => logger.debug("postgresql client connected"));
pool.on("error", (err) => logger.error({ err: err.message }, "postgresql pool error"));

/** Útil para /health — lanza si la DB no responde */
export async function ping() {
  await pool.query("SELECT 1");
}

export default pool;
