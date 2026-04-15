// Backend/middleware/auth.js
import jwt from "jsonwebtoken";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET no configurado en .env");
  return s;
}

/**
 * Genera un JWT con el payload del usuario.
 * @param {{ id_persona: number, usuario: string }} payload
 * @returns {string}
 */
export function generateToken(payload) {
  const expiresIn = process.env.JWT_EXPIRES_IN || "8h";
  return jwt.sign(payload, getSecret(), { expiresIn });
}

/**
 * Middleware Express: valida Bearer token y adjunta req.user.
 * req.user tendrá { id_persona, usuario, iat, exp }.
 */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Token requerido" });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, getSecret());
    req.user = decoded;
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Token expirado" : "Token inválido";
    return res.status(401).json({ ok: false, error: msg });
  }
}
