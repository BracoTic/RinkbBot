import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('rinkbot_token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const exp = getTokenExpiry(token);
  if (!exp || exp * 1000 < Date.now()) {
    localStorage.removeItem('rinkbot_token');
    localStorage.removeItem('rinkbot_user');
    router.navigate(['/login']);
    return false;
  }

  return true;
};
