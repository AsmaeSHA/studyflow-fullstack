import { Injectable, signal } from '@angular/core';

export type UserTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'studyflow-user-theme';

  readonly theme = signal<UserTheme>(this.readSavedTheme());

  setTheme(theme: UserTheme): void {
    this.theme.set(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, theme);
    }
  }

  private readSavedTheme(): UserTheme {
    if (typeof localStorage === 'undefined') return 'light';

    const savedTheme =
      localStorage.getItem(this.storageKey) ||
      localStorage.getItem('studyflow-profile-theme');

    return savedTheme === 'dark' ? 'dark' : 'light';
  }
}
