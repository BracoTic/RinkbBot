import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { Login } from './login';
import { AuthService, LoginResponse } from '../../core/services/auth.service';

// ─────────────────────────────────────────────────────────────
// Mock de AuthService
// ngOnInit llama a isLoggedIn() → lo dejamos en false para que
// no intente redirigir y no interfiera con los tests.
// ─────────────────────────────────────────────────────────────
const mockLoginResponse: LoginResponse = {
  ok:    true,
  user:  { id_persona: 1, nombre: 'Test' },
  token: 'tok',
};

const mockAuth = {
  isLoggedIn: vi.fn(() => false),
  login:      vi.fn(() => of(mockLoginResponse)),
  logout:     vi.fn(),
  getUser:    vi.fn(() => null),
  getToken:   vi.fn(() => null),
};

// ─────────────────────────────────────────────────────────────
describe('Login', () => {
  let fixture:   ComponentFixture<Login>;
  let component: Login;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports:   [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  // ── Creación ──────────────────────────────────────────────
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  // ── FormGroup ─────────────────────────────────────────────
  it('has a usuario FormControl', () => {
    expect(component.form.controls['usuario']).toBeTruthy();
  });

  it('has a password FormControl', () => {
    expect(component.form.controls['password']).toBeTruthy();
  });

  it('both controls start empty', () => {
    expect(component.form.controls['usuario'].value).toBe('');
    expect(component.form.controls['password'].value).toBe('');
  });

  it('form is invalid when both controls are empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('form is valid when both controls have values', () => {
    component.form.controls['usuario'].setValue('juan');
    component.form.controls['password'].setValue('pass123');
    expect(component.form.valid).toBe(true);
  });

  // ── Template ──────────────────────────────────────────────
  it('renders the usuario text input in the DOM', () => {
    const input = fixture.nativeElement
      .querySelector('input[formControlName="usuario"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.type).toBe('text');
  });

  it('renders the password input in the DOM', () => {
    const input = fixture.nativeElement
      .querySelector('input[formControlName="password"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.type).toBe('password');
  });

  it('renders the submit button', () => {
    const btn = fixture.nativeElement
      .querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
  });

  // ── Comportamiento ────────────────────────────────────────
  it('ngOnInit calls auth.isLoggedIn()', () => {
    // fixture.detectChanges() ya disparó ngOnInit en beforeEach
    expect(mockAuth.isLoggedIn).toHaveBeenCalled();
  });

  it('submit() calls auth.login() with the form values', () => {
    // Prevent the post-login router.navigate(['/chat']) from rejecting
    // (provideRouter([]) has no /chat route, causing an unhandled rejection)
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.form.controls['usuario'].setValue('juan');
    component.form.controls['password'].setValue('secret');

    component.submit();

    expect(mockAuth.login).toHaveBeenCalledWith('juan', 'secret');
  });
});
