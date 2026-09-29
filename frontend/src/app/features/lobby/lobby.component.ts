import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LabApiService } from '../../core/services/lab-api.service';
import { FirestoreSyncService } from '../../core/services/firestore-sync.service';
import { LocaleService, LanguageCode } from '../../core/i18n/locale.service';
import { UserRole } from '../../core/models/session.model';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#172554]/20 via-[#0B0F17] to-[#0B0F17]">
      <!-- Brand Header -->
      <div class="text-center mb-8 max-w-xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84AA40]/10 border border-[#84AA40]/30 text-[#84AA40] text-xs font-bold tracking-widest uppercase mb-4">
          Google DeepMind &bull; Information Defense Lab
        </div>
        <h1 class="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
          {{ locale.t('app.title') }}
        </h1>
        <p class="text-slate-400 text-sm md:text-base">
          {{ locale.t('app.subtitle') }}
        </p>

        <!-- Language Picker -->
        <div class="mt-4 flex justify-center gap-2">
          <button
            type="button"
            (click)="setLang('pl')"
            [class.bg-green-600]="locale.language() === 'pl'"
            [class.text-black]="locale.language() === 'pl'"
            class="px-3 py-1 rounded text-xs font-bold border border-white/10 transition-colors">
            Polski (PL)
          </button>
          <button
            type="button"
            (click)="setLang('en')"
            [class.bg-green-600]="locale.language() === 'en'"
            [class.text-black]="locale.language() === 'en'"
            class="px-3 py-1 rounded text-xs font-bold border border-white/10 transition-colors">
            English (EN)
          </button>
        </div>
      </div>

      <!-- Main Action Cards -->
      <div class="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        <!-- Card 1: Create New Session (Facilitator) -->
        <div class="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-4">
              <span class="w-3 h-3 rounded-full bg-[#84AA40]"></span>
              <h2 class="text-xl font-bold text-white">Create New Scenario</h2>
            </div>
            <p class="text-slate-400 text-sm mb-4">
              Host a new Poland Power Grid 2026 exercise. Instantiates a 500-node scale-free network graph and AI agent seed pool.
            </p>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Scenario Title</label>
                <input
                  type="text"
                  [(ngModel)]="newTitle"
                  placeholder="e.g. NATO StratCom Winter Exercise"
                  class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Max Ticks</label>
                <input
                  type="number"
                  [(ngModel)]="maxTicks"
                  class="input-field" />
              </div>
            </div>
          </div>

          <button
            type="button"
            (click)="createExercise()"
            [disabled]="loading()"
            class="btn-primary w-full justify-center mt-6">
            {{ loading() ? 'Instantiating Graph...' : 'Create & Launch Facilitator HUD' }}
          </button>
        </div>

        <!-- Card 2: Join Existing Session -->
        <div class="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-4">
              <span class="w-3 h-3 rounded-full bg-[#3B82F6]"></span>
              <h2 class="text-xl font-bold text-white">Join Active Session</h2>
            </div>
            <p class="text-slate-400 text-sm mb-4">
              Enter an exercise session ID and select your assigned operational role.
            </p>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Session ID</label>
                <input
                  type="text"
                  [(ngModel)]="joinSessionId"
                  placeholder="session-xxxxxxxx"
                  class="input-field font-mono" />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Your Call-sign / Handle</label>
                <input
                  type="text"
                  [(ngModel)]="playerHandle"
                  placeholder="e.g. Operative_07"
                  class="input-field" />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Assigned Role</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    (click)="selectedRole = UserRole.RED_TEAM"
                    [class.border-red-500]="isRole(UserRole.RED_TEAM)"
                    [class.bg-red-500]="isRole(UserRole.RED_TEAM)"
                    class="p-2 rounded border border-white/10 text-xs font-bold text-red-400 text-center">
                    Red Team (Adversary)
                  </button>
                  <button
                    type="button"
                    (click)="selectedRole = UserRole.BLUE_TEAM"
                    [class.border-blue-500]="isRole(UserRole.BLUE_TEAM)"
                    [class.bg-blue-500]="isRole(UserRole.BLUE_TEAM)"
                    class="p-2 rounded border border-white/10 text-xs font-bold text-blue-400 text-center">
                    Blue Team (Defense)
                  </button>
                  <button
                    type="button"
                    (click)="selectedRole = UserRole.OBSERVER"
                    [class.border-slate-400]="isRole(UserRole.OBSERVER)"
                    [class.bg-white]="isRole(UserRole.OBSERVER)"
                    class="p-2 rounded border border-white/10 text-xs font-bold text-slate-300 text-center">
                    Observer (Analyst)
                  </button>
                  <button
                    type="button"
                    (click)="selectedRole = UserRole.FACILITATOR"
                    [class.border-green-500]="isRole(UserRole.FACILITATOR)"
                    [class.bg-green-500]="isRole(UserRole.FACILITATOR)"
                    class="p-2 rounded border border-white/10 text-xs font-bold text-green-400 text-center">
                    Facilitator
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            (click)="joinExercise()"
            [disabled]="loading() || !joinSessionId"
            class="btn-secondary w-full justify-center mt-6">
            {{ loading() ? 'Connecting...' : 'Enter Lab Arena' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class LobbyComponent {
  public locale = inject(LocaleService);
  private api = inject(LabApiService);
  private sync = inject(FirestoreSyncService);
  private router = inject(Router);

  public newTitle = 'Poland Power Grid Exercise 2026';
  public maxTicks = 40;
  public joinSessionId = '';
  public playerHandle = '';
  public selectedRole: UserRole = UserRole.BLUE_TEAM;
  public UserRole = UserRole;

  public loading = signal<boolean>(false);

  setLang(code: LanguageCode) {
    this.locale.setLanguage(code);
  }

  isRole(role: UserRole): boolean {
    return this.selectedRole === role;
  }

  async createExercise() {
    this.loading.set(true);
    try {
      const session = await this.api.createSession(
        this.newTitle,
        this.locale.language(),
        this.maxTicks
      );
      this.sync.setCurrentUser({
        userId: 'admin_facilitator_' + Math.random().toString(36).substring(2, 6),
        role: UserRole.FACILITATOR,
        handle: 'Lead Facilitator'
      });
      this.router.navigate(['/admin', session.id]);
    } catch (e: any) {
      alert('Error creating session: ' + (e.message || e));
    } finally {
      this.loading.set(false);
    }
  }

  async joinExercise() {
    if (!this.joinSessionId) return;
    this.loading.set(true);
    try {
      const handle = this.playerHandle.trim() || `Agent_${Math.random().toString(36).substring(2, 6)}`;
      const uid = `user_${this.selectedRole.toLowerCase()}_${Math.random().toString(36).substring(2, 8)}`;
      this.sync.setCurrentUser({
        userId: uid,
        role: this.selectedRole,
        handle: handle
      });

      if (this.selectedRole === UserRole.FACILITATOR) {
        this.router.navigate(['/admin', this.joinSessionId]);
      } else {
        this.router.navigate(['/arena', this.joinSessionId]);
      }
    } catch (e: any) {
      alert('Error joining session: ' + (e.message || e));
    } finally {
      this.loading.set(false);
    }
  }
}
