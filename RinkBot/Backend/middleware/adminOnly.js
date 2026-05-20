// Backend/middleware/adminOnly.js
export function adminOnly(req, res, next) {
  if (req.user?.rol !== "admin") {
    return res.status(403).json({ ok: false, error: "Se requieren permisos de administrador." });
  }
  next();
}
