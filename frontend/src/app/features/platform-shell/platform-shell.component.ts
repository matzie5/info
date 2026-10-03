import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LocaleService } from '../../core/i18n/locale.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-platform-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <header class="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <!-- Platform Branding -->
        <div class="flex items-center gap-3">
          <span class="px-2.5 py-1 rounded bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 dark:border-cyan-400/40 text-cyan-600 dark:text-cyan-300 font-mono text-xs font-bold">
            {{ locale.t('app.version_tag') }}
          </span>
          <h1 class="text-sm font-semibold tracking-wide uppercase text-slate-800 dark:text-slate-200">
            {{ locale.t('app.subtitle') }}
          </h1>
        </div>

        <!-- Navigation Tabs: Dynamic based on Player vs Admin -->
        <nav class="flex items-center gap-2 text-xs font-mono">
          <!-- Player Dashboard Tab -->
          <a *ngIf="auth.isPlayer()" routerLink="/dashboard" routerLinkActive="bg-cyan-600 text-white border-cyan-600"
             class="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5">
            <span>📊</span>
            <span>{{ locale.t('nav.dashboard') || 'Dashboard' }}</span>
          </a>

          <!-- Admin Cohort Console Tab -->
          <a *ngIf="auth.isAdmin()" routerLink="/admin/cohorts" routerLinkActive="bg-purple-600 text-white border-purple-600"
             class="px-3 py-1.5 rounded border border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1.5">
            <span>⚙️</span>
            <span>{{ locale.t('nav.cohort_console') || 'Cohort Console' }}</span>
          </a>

          <a routerLink="/modules/disinfo" routerLinkActive="bg-cyan-600 text-white border-cyan-600"
             class="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-slate-700 dark:text-slate-200">
            {{ locale.t('nav.m1_disinfo') }}
          </a>
          <a routerLink="/modules/scam-lab" routerLinkActive="bg-cyan-600 text-white border-cyan-600"
             class="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-slate-700 dark:text-slate-200">
            {{ locale.t('nav.m2_scam') }}
          </a>
          <a routerLink="/modules/deepfake-lab" routerLinkActive="bg-cyan-600 text-white border-cyan-600"
             class="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-slate-700 dark:text-slate-200">
            {{ locale.t('nav.m3_deepfake') }}
          </a>
          <a routerLink="/modules/osint-exposure" routerLinkActive="bg-cyan-600 text-white border-cyan-600"
             class="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-slate-700 dark:text-slate-200">
            {{ locale.t('nav.m4_osint') }}
          </a>
          <a routerLink="/modules/echo-chamber" routerLinkActive="bg-cyan-600 text-white border-cyan-600"
             class="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-slate-700 dark:text-slate-200">
            {{ locale.t('nav.m5_echo') }}
          </a>
        </nav>

        <!-- Right Controls: User Profile, Passport, Language Switcher, Theme Switcher -->
        <div class="flex items-center gap-3">
          <!-- User Profile & Role Pill -->
          <div class="relative flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono">
            <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                  [ngClass]="auth.isAdmin() ? 'bg-purple-600' : 'bg-emerald-600'">
              {{ auth.isAdmin() ? '🛡️' : '👤' }}
            </span>
            <div class="text-[11px] leading-tight">
              <span class="font-bold text-slate-900 dark:text-slate-100 block max-w-[120px] truncate">
                {{ auth.currentUser()?.display_name || auth.currentUser()?.username }}
              </span>
              <span class="text-[10px]" [ngClass]="auth.isAdmin() ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'">
                {{ auth.currentUser()?.role || 'PLAYER' }}
              </span>
            </div>
            <!-- Points badge for Player -->
            <span *ngIf="auth.isPlayer()" class="ml-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-black text-[10px] border border-amber-500/20">
              🏆 {{ playerPoints() }}
            </span>
            <!-- Quick Role Switch Pill -->
            <div class="flex items-center gap-1 ml-1 pl-1 border-l border-slate-300 dark:border-slate-700">
              <button
                (click)="switchUser(auth.isAdmin() ? 'player1' : 'admin')"
                class="px-1.5 py-0.5 text-[10px] rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
                [title]="auth.isAdmin() ? 'Switch to Player Mode' : 'Switch to Admin Mode'"
              >
                {{ auth.isAdmin() ? '➔ Player' : '➔ Admin' }}
              </button>
              <a
                routerLink="/login"
                class="px-1.5 py-0.5 text-[10px] rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-500 dark:text-indigo-400 transition font-bold"
                title="Change Account / Sign In"
              >
                Login
              </a>
            </div>
          </div>

          <!-- Digital Hygiene Passport Badge -->
          <div class="flex items-center gap-2 text-xs font-mono bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700">
            <span class="text-slate-500 dark:text-slate-400">{{ locale.t('nav.passport_label') }}:</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ overallScore() }} / 100</span>
            <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] border border-emerald-500/20">
              {{ getLocalizedMaturityTier() }}
            </span>
          </div>

          <!-- Language Switcher -->
          <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-md border border-slate-300 dark:border-slate-700"
               [title]="locale.t('lang.select')">
            <button *ngFor="let lang of locale.availableLanguages()"
                    (click)="locale.setLanguage(lang.code)"
                    [class.bg-cyan-600]="locale.language() === lang.code"
                    [class.text-white]="locale.language() === lang.code"
                    [class.font-bold]="locale.language() === lang.code"
                    [class.text-slate-600]="locale.language() !== lang.code"
                    [class.dark:text-slate-300]="locale.language() !== lang.code"
                    class="px-2 py-1 text-xs rounded transition flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                    [attr.aria-label]="lang.nativeName">
              <span>{{ lang.flag }}</span>
              <span class="font-mono text-[11px] uppercase">{{ lang.code }}</span>
            </button>
          </div>

          <!-- Theme Switcher (Dark / Light) -->
          <button (click)="theme.toggleTheme()"
                  [title]="theme.isDark() ? locale.t('theme.switch_to_light') : locale.t('theme.switch_to_dark')"
                  class="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition flex items-center gap-1.5 text-xs font-mono"
                  aria-label="Toggle Theme">
            <span *ngIf="theme.isDark()" class="flex items-center gap-1">
              <span>🌙</span>
              <span class="hidden sm:inline">{{ locale.t('theme.dark') }}</span>
            </span>
            <span *ngIf="!theme.isDark()" class="flex items-center gap-1">
              <span>☀️</span>
              <span class="hidden sm:inline">{{ locale.t('theme.light') }}</span>
            </span>
          </button>
        </div>
      </header>

      <main class="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class PlatformShellComponent implements OnInit {
  private http = inject(HttpClient);
  public auth = inject(AuthService);
  public locale = inject(LocaleService);
  public theme = inject(ThemeService);

  overallScore = signal<number>(52.0);
  maturityTier = signal<string>('AWARE_OPERATOR');
  playerPoints = signal<number>(250);

  ngOnInit(): void {
    this.refreshPassport();
    this.refreshUserProgress();
  }

  refreshUserProgress(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.http.get<any>(`/api/v1/users/${user.id}/progress`).subscribe({
      next: (prog) => {
        if (prog && prog.total_points !== undefined) {
          this.playerPoints.set(prog.total_points);
        }
      },
      error: () => {},
    });
  }

  refreshPassport(): void {
    const user = this.auth.currentUser();
    const uid = user ? user.id : 'demo_user';
    this.http.get<any>(`/api/v1/platform/passport/${uid}`).subscribe({
      next: (res) => {
        if (res && res.overall_hygiene_index !== undefined) {
          this.overallScore.set(res.overall_hygiene_index);
        }
        if (res && res.maturity_tier) {
          this.maturityTier.set(res.maturity_tier);
        }
      },
      error: () => {},
    });
  }

  switchUser(target: 'admin' | 'player1' | 'player2'): void {
    this.auth.quickSwitchUser(target);
    this.refreshPassport();
    this.refreshUserProgress();
  }

  getLocalizedMaturityTier(): string {
    const raw = this.maturityTier();
    const localized = this.locale.t('passport.tier_' + raw);
    return localized !== 'passport.tier_' + raw ? localized : raw;
  }

  setLanguage(code: string): void {
    this.locale.setLanguage(code);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}
