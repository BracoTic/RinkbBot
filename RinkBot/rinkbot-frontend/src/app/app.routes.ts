import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    title: 'Iniciar sesión – RinkBot',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'chat',
    title: 'Chat – RinkBot',
    loadComponent: () => import('./pages/chat/chat').then((m) => m.Chat),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
