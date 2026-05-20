import { TestBed }          from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService, LoginResponse } from './auth.service';

// ─────────────────────────────────────────────────────────────
// Constantes (mismas claves que usa el servicio)
// ─────────────────────────────────────────────────────────────
const TOKEN_KEY = 'rinkbot_token';
const USER_KEY  = 'rinkbot_user';

const mockLoginResponse: LoginResponse = {
  ok:    true,
  user:  { id_persona: 42, nombre: 'Juan Pablo' },
  token: 'jwt.test.token',
};

// ─────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service:     AuthService;
  let httpTesting: HttpTestingController;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });

    service     = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();   // falla si quedan peticiones sin consumir
    localStorage.clear();
    vi.restoreAllMocks();   // devuelve Storage.prototype a su implementación real
  });

  // ── Creación ────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── isLoggedIn() ────────────────────────────────────────────
  describe('isLoggedIn()', () => {
    it('returns false when there is no token in localStorage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      expect(service.isLoggedIn()).toBe(false);
    });

    it('returns true when a token exists in localStorage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('any-token');

      expect(service.isLoggedIn()).toBe(true);
    });
  });

  // ── getToken() ──────────────────────────────────────────────
  describe('getToken()', () => {
    it('returns null when no token is stored', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      expect(service.getToken()).toBeNull();
    });

    it('returns the stored token string', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('my-token');

      expect(service.getToken()).toBe('my-token');
    });
  });

  // ── login() ─────────────────────────────────────────────────
  describe('login()', () => {
    it('sends POST /api/login with the provided credentials', () => {
      service.login('juan', 'pass123').subscribe();

      const req = httpTesting.expectOne('/api/login');  // apiBase('/api') + '/login'

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ usuario: 'juan', password: 'pass123' });

      req.flush(mockLoginResponse);
    });

    it('persists the token to localStorage on a successful response', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      service.login('juan', 'pass123').subscribe();
      httpTesting.expectOne('/api/login').flush(mockLoginResponse);

      expect(setItemSpy).toHaveBeenCalledWith(TOKEN_KEY, 'jwt.test.token');
    });

    it('persists the user object to localStorage on a successful response', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      service.login('juan', 'pass123').subscribe();
      httpTesting.expectOne('/api/login').flush(mockLoginResponse);

      const userCall = setItemSpy.mock.calls.find(([key]) => key === USER_KEY);
      expect(userCall).toBeDefined();

      const stored = JSON.parse(userCall![1] as string);
      expect(stored.id_persona).toBe(42);
      expect(stored.nombre).toBe('Juan Pablo');
      expect(stored.token).toBe('jwt.test.token');
    });

    it('does NOT write to localStorage if ok is false', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const failResponse: LoginResponse = {
        ok: false, user: { id_persona: 0, nombre: '' }, token: '',
      };

      service.login('x', 'y').subscribe();
      httpTesting.expectOne('/api/login').flush(failResponse);

      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  // ── logout() ────────────────────────────────────────────────
  describe('logout()', () => {
    it('removes the token from localStorage', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      service.logout();

      expect(removeItemSpy).toHaveBeenCalledWith(TOKEN_KEY);
    });

    it('removes the user from localStorage', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      service.logout();

      expect(removeItemSpy).toHaveBeenCalledWith(USER_KEY);
    });

    it('navigates to /login', () => {
      service.logout();

      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  // ── getUser() ───────────────────────────────────────────────
  describe('getUser()', () => {
    it('returns null when nothing is stored', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      expect(service.getUser()).toBeNull();
    });

    it('parses and returns the stored user object', () => {
      const stored = { id_persona: 7, nombre: 'Ana', token: 'tok' };
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(stored));

      const user = service.getUser();

      expect(user?.id_persona).toBe(7);
      expect(user?.nombre).toBe('Ana');
    });

    it('returns null if the stored JSON is malformed', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{invalid json');

      expect(service.getUser()).toBeNull();
    });
  });
});
