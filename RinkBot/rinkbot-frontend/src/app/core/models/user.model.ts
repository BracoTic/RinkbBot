/** Respuesta de POST /api/login → campo "user" */
export interface User {
  id_persona: number;
  nombre: string;
  token: string; // JWT; también persiste en localStorage como "rinkbot_token"
}
