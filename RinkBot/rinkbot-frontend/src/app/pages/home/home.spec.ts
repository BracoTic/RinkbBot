import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { Home } from './home';

// ─────────────────────────────────────────────────────────────
describe('Home', () => {
  let fixture:   ComponentFixture<Home>;
  let component: Home;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports:   [Home],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture   = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Creación ──────────────────────────────────────────────
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  // ── Template ──────────────────────────────────────────────
  it('renders the "Iniciar sesión" button', () => {
    const btn = fixture.nativeElement.querySelector('button.btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent?.trim()).toBe('Iniciar sesión');
  });

  it('renders the hero logo image', () => {
    const img = fixture.nativeElement.querySelector('img.hero-logo') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('alt')).toBe('RinkBot');
  });

  it('renders the subtitle text', () => {
    const p = fixture.nativeElement.querySelector('p.hero-subtitle') as HTMLElement;
    expect(p).not.toBeNull();
    expect(p.textContent).toContain('HSEQ');
  });

  // ── Comportamiento ────────────────────────────────────────
  it('goToLogin() navigates to /login', () => {
    const router = TestBed.inject(Router);
    const spy    = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.goToLogin();

    expect(spy).toHaveBeenCalledWith(['/login']);
  });
});
