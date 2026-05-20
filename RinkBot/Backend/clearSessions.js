import dotenv from "dotenv";
import pg from "pg";
dotenv.config();

const { Pool } = pg;
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } }
);

const r = await pool.query("DELETE FROM public.chat WHERE tipo_chat = 'session'");
console.log(`Deleted ${r.rowCount} session row(s).`);
await pool.end();
