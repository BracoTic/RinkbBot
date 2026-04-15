// Backend/auth.js
import pool from "./db.js";
import { generateToken } from "./middleware/auth.js";
import logger from "./logger.js";

/**
 * Valida credenciales contra PostgreSQL (pgcrypto).
 * Retorna { user, token } o null si las credenciales son inválidas.
 */
export async function login(usuario, password) {
  if (!usuario || !password) return null;

  const sql = `
    SELECT id_persona, usuario, correo, avatar_url
    FROM public.persona
    WHERE usuario = $1
      AND password_hash = crypt($2, password_hash)
      AND estado = 'activo'
    LIMIT 1;
  `;

  const r = await pool.query(sql, [String(usuario), String(password)]);

  if (!r.rows.length) return null;

  const user = r.rows[0];

  // actualiza ultimo_acceso (no bloquea el login si falla)
  try {
    await pool.query(
      `UPDATE public.persona SET ultimo_acceso = now() WHERE id_persona = $1`,
      [user.id_persona]
    );
  } catch (e) {
    logger.warn({ id_persona: user.id_persona }, "no se pudo actualizar ultimo_acceso");
  }

  const token = generateToken({
    id_persona: user.id_persona,
    usuario: user.usuario,
  });

  return {
    user: {
      id_persona: user.id_persona,
      usuario: user.usuario,
      correo: user.correo,
      avatar_url: user.avatar_url,
    },
    token,
  };
}
