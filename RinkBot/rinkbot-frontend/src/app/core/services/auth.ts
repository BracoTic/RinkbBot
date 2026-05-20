import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  ok: boolean;
  user: User;
  token: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly TOKEN_KEY = 'rinkbot_token';
  private readonly USER_KEY = 'rinkbot_user';

  private _user$ = new BehaviorSubject<User | null>(this.loadUser());
  readonly user$ = this._user$.asObservable();

  get token(): string {
    return localStorage.getItem(this.TOKEN_KEY) ?? '';
  }

  get currentUser(): User | null {
    return this._user$.value;
  }

  get isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser;
  }

  login(usuario: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBase}/api/login`, { usuario, password })
      .pipe(
        tap((res) => {
          if (res.ok) {
            localStorage.setItem(this.TOKEN_KEY, res.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
            this._user$.next(res.user);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user$.next(null);
    this.router.navigate(['/login']);
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
