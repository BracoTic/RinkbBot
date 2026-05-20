import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Sólo agrega el header en peticiones al propio backend (relativas o mismo origen). */
function isInternalRequest(url: string): boolean {
  if (!url.startsWith('http')) return true;                         // URL relativa → siempre interna
  const base = environment.apiBase;
  if (base.startsWith('http')) return url.startsWith(base);         // base absoluta configurada
  return url.startsWith(window.location.origin);                    // base relativa → mismo origen
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isInternalRequest(req.url)) return next(req);

  const token = localStorage.getItem('rinkbot_token');
  if (!token) return next(req);

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
  );
};
