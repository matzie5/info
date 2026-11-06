// frontend/src/app/features/auth/login.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-md mx-auto my-12 p-8 bg-white/95 dark:bg-[#141B26]/95 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl backdrop-blur-md animate-fadeIn">
      <!-- Logo & Heading -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/25 mb-4">
          🛡️
        </div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {{ isRegisterMode() ? locale.t('auth.register_title') : locale.t('auth.login_title') }}
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {{ isRegisterMode() ? locale.t('auth.register_sub') : locale.t('auth.login_sub') }}
        </p>
      </div>

      <!-- Quick Switch Demo Mode Pills -->
      <div class="mb-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
          ⚡ {{ locale.t('auth.fast_eval') }}
        </span>
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            (click)="quickLogin('player1')"
            class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all text-center"
          >
            👤 Player 1
          </button>
          <button
            type="button"
            (click)="quickLogin('player2')"
            class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 transition-all text-center"
          >
            👤 Player 2
          </button>
          <button
            type="button"
            (click)="quickLogin('admin')"
            class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 transition-all text-center"
          >
            🛡️ Admin
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            (click)="quickLogin('supervisor')"
            class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-all text-center"
          >
            👑 Supervisor Studio
          </button>
          <button
            type="button"
            (click)="quickLogin('trainer')"
            class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all text-center"
          >
            🎓 Trener Wrocław
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            (click)="quickLogin('kid1')"
            class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all text-center"
          >
            🧒 Kid (Leo)
          </button>
          <button
            type="button"
            (click)="quickLogin('senior1')"
            class="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20 transition-all text-center"
          >
            👵 Senior (Marta • Wrocław)
          </button>
        </div>
      </div>

      <!-- Standard Form -->
      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{{ locale.t('auth.username') }}</label>
          <input
            type="text"
            [(ngModel)]="username"
            name="username"
            required
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. player1, admin"
          />
        </div>

        <div *ngIf="isRegisterMode()">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{{ locale.t('auth.email') }}</label>
          <input
            type="email"
            [(ngModel)]="email"
            name="email"
            required
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="operative@infosphere.io"
          />
        </div>

        <div *ngIf="isRegisterMode()">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{{ locale.t('auth.display_name') }}</label>
          <input
            type="text"
            [(ngModel)]="displayName"
            name="displayName"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Analyst John Doe"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{{ locale.t('auth.password') }}</label>
          <input
            type="password"
            [(ngModel)]="password"
            name="password"
            required
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
          />
        </div>

        <div *ngIf="errorMessage()" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
          {{ errorMessage() }}
        </div>

        <button
          type="submit"
          class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all mt-2"
        >
          {{ isRegisterMode() ? locale.t('auth.register_btn') : locale.t('auth.sign_in_btn') }}
        </button>
      </form>

      <!-- Toggle Mode -->
      <div class="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <span *ngIf="!isRegisterMode()">
          {{ locale.t('auth.need_account') }}
          <button (click)="isRegisterMode.set(true)" class="text-indigo-500 font-bold hover:underline ml-1">
            {{ locale.t('auth.register_link') }}
          </button>
        </span>
        <span *ngIf="isRegisterMode()">
          {{ locale.t('auth.have_account') }}
          <button (click)="isRegisterMode.set(false)" class="text-indigo-500 font-bold hover:underline ml-1">
            {{ locale.t('auth.login_link') }}
          </button>
        </span>
      </div>
    </div>
  `
})
export class LoginComponent {
  public auth = inject(AuthService);
  public locale = inject(LocaleService);
  private router = inject(Router);

  public isRegisterMode = signal<boolean>(false);
  public username = '';
  public email = '';
  public displayName = '';
  public password = '';
  public errorMessage = signal<string | null>(null);

  public quickLogin(role: 'admin' | 'supervisor' | 'trainer' | 'player1' | 'player2' | 'kid1' | 'senior1'): void {
    this.auth.quickSwitchUser(role);
    if (role === 'admin') {
      this.router.navigate(['/admin/cohorts']);
    } else if (role === 'supervisor') {
      this.router.navigate(['/supervisor']);
    } else if (role === 'trainer') {
      this.router.navigate(['/trainer/WROC-SENIOR-2026']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  public onSubmit(): void {
    this.errorMessage.set(null);
    if (this.isRegisterMode()) {
      this.auth.register({
        username: this.username,
        email: this.email,
        displayName: this.displayName,
        password: this.password,
      } as any).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Registration failed. Try another username.');
        }
      });
    } else {
      this.auth.login(this.username, this.password).subscribe({
        next: (res) => {
          if (res.user.role === 'ADMIN') {
            this.router.navigate(['/admin/cohorts']);
          } else if (res.user.role === 'SUPERVISOR') {
            this.router.navigate(['/supervisor']);
          } else if (res.user.role === 'TRAINER') {
            this.router.navigate(['/trainer/WROC-SENIOR-2026']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Invalid username or password.');
        }
      });
    }
  }
}
