import pool from "./db.js";

const SESSION_TIPO       = "session";
const SESSION_TITULO     = "__session__";
const MAX_TURNS          = 6;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const AVAILABLE_CHARS    = 18_000;          // ~4500 tokens × 4 chars/token

/**
 * Returns filtered history turns for this user (ready for OpenAI messages array).
 * Each element: { role: "user"|"assistant", content: string, ts: number }
 * Returns [] on first use, session expired, or any parse error.
 */
export async function getHistory(userId, db = pool) {
  const r = await db.query(
    `SELECT chat_json FROM public.chat
     WHERE id_persona = $1 AND tipo_chat = $2
     ORDER BY created_at DESC LIMIT 1`,
    [userId, SESSION_TIPO]
  );

  if (!r.rows.length) return [];

  let turns = [];
  try {
    const raw = r.rows[0].chat_json;
    turns = Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }

  if (!turns.length) return [];

  // Session expiry: discard if last turn is older than 30 minutes
  const lastTs = turns[turns.length - 1]?.ts ?? 0;
  if (Date.now() - lastTs > SESSION_TIMEOUT_MS) return [];

  // Hard cap: keep most recent 6 turns
  const recent = turns.slice(-MAX_TURNS);

  // Character budget: evict oldest turns until we fit within AVAILABLE_CHARS
  let totalChars = 0;
  const fitted = [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const charLen = (recent[i].content || "").length;
    if (totalChars + charLen > AVAILABLE_CHARS) break;
    fitted.unshift(recent[i]);
    totalChars += charLen;
  }

  return fitted;
}

/**
 * Upserts the session row with the given turns array.
 * turns: [{ role, content, ts, hadImage? }]
 */
export async function saveHistory(userId, turns, db = pool) {
  await db.query(
    `INSERT INTO public.chat (id_persona, tipo_chat, titulo, chat_json, favorito)
     VALUES ($1, $2, $3, $4::jsonb, false)
     ON CONFLICT (id_persona) WHERE tipo_chat = 'session'
     DO UPDATE SET
       chat_json  = EXCLUDED.chat_json,
       created_at = NOW()`,
    [userId, SESSION_TIPO, SESSION_TITULO, JSON.stringify(turns)]
  );
}
