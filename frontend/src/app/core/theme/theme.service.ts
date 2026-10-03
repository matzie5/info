import { Injectable, signal, computed } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = signal<ThemeMode>('dark');

  public readonly theme = computed(() => this.currentTheme());
  public readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('infosphere_theme') as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      this.setTheme(saved);
    } else {
      // Default to dark cyber-defense theme
      this.setTheme('dark');
    }
  }

  public setTheme(mode: ThemeMode): void {
    this.currentTheme.set(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('infosphere_theme', mode);
      } catch (e) {
        console.warn('LocalStorage unavailable for theme persistence', e);
      }
      const root = document.documentElement;
      if (mode === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
      }
    }
  }

  public toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }

  public toggle(): void {
    this.toggleTheme();
  }
}
