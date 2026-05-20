import { Injectable, signal, computed } from '@angular/core';

export type AppLang = 'es' | 'en';

export interface UserPrefs {
  avatarUrl:            string | null;
  lang:                 AppLang;
  darkMode:             boolean;
  notificationsEnabled: boolean;
  autoSave:             boolean;
}

const PREFS_KEY = 'rinkbot_prefs';

const DEFAULTS: UserPrefs = {
  avatarUrl:            null,
  lang:                 'es',
  darkMode:             false,
  notificationsEnabled: true,
  autoSave:             false,
};

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly _prefs = signal<UserPrefs>(this.load());

  readonly prefs     = this._prefs.asReadonly();
  readonly avatarUrl = computed(() => this._prefs().avatarUrl ?? 'assets/Avatar.png');
  readonly isDark    = computed(() => this._prefs().darkMode);
  readonly lang      = computed(() => this._prefs().lang);

  update(patch: Partial<UserPrefs>): void {
    this._prefs.update(p => ({ ...p, ...patch }));
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this._prefs())); } catch { /* cuota llena */ }
  }

  private load(): UserPrefs {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UserPrefs>) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }
}
