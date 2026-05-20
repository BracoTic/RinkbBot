import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { ChatService } from './chat.service';

export interface LoginResponse {
  ok: boolean;
  user: { id_persona: number; nombre: string };
  token: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);

  private readonly TOKEN_KEY = 'rinkbot_token';
  private readonly USER_KEY = 'rinkbot_user';

  login(usuario: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBase}/login`, { usuario, password })
      .pipe(
        tap((res) => {
          if (res.ok) {
            localStorage.setItem(this.TOKEN_KEY, res.token);
            localStorage.setItem(
              this.USER_KEY,
              JSON.stringify({ ...res.user, token: res.token } satisfies User)
            );
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('rinkbot_chat_log');
    localStorage.removeItem('rinkbot_voice_log');
    localStorage.removeItem('rinkbot_tts_voice_name');
    localStorage.removeItem('rinkbot_prefs');
    this.chatService.clearMessages();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
