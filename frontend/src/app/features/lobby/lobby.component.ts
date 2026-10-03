import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LabApiService } from '../../core/services/lab-api.service';
import { FirestoreSyncService } from '../../core/services/firestore-sync.service';
import { LocaleService, LanguageCode } from '../../core/i18n/locale.service';
import { UserRole } from '../../core/models/session.model';

interface ScenarioOption {
  id: string;
  title_pl: string;
  title_en: string;
  description_pl: string;
  description_en: string;
  default_ticks: number;
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#172554]/20 via-[#0B0F17] to-[#0B0F17]">
      <!-- Brand Header -->
      <div class="text-center mb-8 max-w-xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84AA40]/10 border border-[#84AA40]/30 text-[#84AA40] text-xs font-bold tracking-widest uppercase mb-4">
          Infosphere Lab &bull; Information Defense Simulation
        </div>
        <h1 class="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
          {{ locale.t('app.title') }}
        </h1>
        <p class="text-slate-400 text-sm md:text-base">
          {{ locale.t('app.subtitle') }}
        </p>

        <!-- Language Picker -->
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <button
            *ngFor="let lang of locale.availableLanguages()"
            type="button"
            (click)="setLang(lang.code)"
            [class.bg-[#84AA40]]="locale.language() === lang.code"
            [class.text-black]="locale.language() === lang.code"
            [class.text-white]="locale.language() !== lang.code"
            class="px-3 py-1 rounded text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5">
            <span>{{ lang.flag }}</span>
            <span>{{ lang.nativeName }}</span>
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
              <h2 class="text-xl font-bold text-white">{{ locale.t('lobby.host_card_title') }}</h2>
            </div>
            <p class="text-slate-400 text-sm mb-4">
              {{ locale.t('lobby.host_card_desc') }}
            </p>

            <div class="space-y-3">
              <!-- Scenario Selection Dropdown -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {{ locale.t('lobby.scenario_label') }}
                </label>
                <select
                  [(ngModel)]="selectedScenarioId"
                  (change)="onScenarioChange()"
                  class="input-field bg-slate-900 border-white/20 text-white w-full">
                  <option *ngFor="let sc of scenarios" [value]="sc.id">
                    {{ locale.language() === 'pl' ? sc.title_pl : sc.title_en }}
                  </option>
                </select>
                <p class="text-[11px] text-slate-400 mt-1 italic">
                  {{ getSelectedScenarioDesc() }}
                </p>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {{ locale.t('lobby.title_label') }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="newTitle"
                  class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {{ locale.t('lobby.max_ticks_label') }}
                </label>
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
            {{ loading() ? locale.t('lobby.creating') : locale.t('lobby.create_btn') }}
          </button>
        </div>

        <!-- Card 2: Join Existing Session -->
        <div class="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-4">
              <span class="w-3 h-3 rounded-full bg-[#3B82F6]"></span>
              <h2 class="text-xl font-bold text-white">{{ locale.t('lobby.join_card_title') }}</h2>
            </div>
            <p class="text-slate-400 text-sm mb-4">
              {{ locale.t('lobby.join_card_desc') }}
            </p>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {{ locale.t('lobby.session_id_label') }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="joinSessionId"
                  placeholder="session-xxxxxxxx"
                  class="input-field font-mono" />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {{ locale.t('lobby.handle_label') }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="playerHandle"
                  placeholder="e.g. Operative_07"
                  class="input-field" />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {{ locale.t('lobby.role_label') }}
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    (click)="selectedRole = UserRole.RED_TEAM"
                    [class.border-red-500]="isRole(UserRole.RED_TEAM)"
                    [class.bg-red-500]="isRole(UserRole.RED_TEAM)"
                    [class.text-white]="isRole(UserRole.RED_TEAM)"
                    class="p-2 rounded border border-white/10 text-xs font-bold text-red-400 text-center transition-colors">
                    {{ locale.t('roles.red_team') }}
                  </button>
                  <button
                    type="button"
                    (click)="selectedRole = UserRole.BLUE_TEAM"
                    [class.border-blue-500]="isRole(UserRole.BLUE_TEAM)"
                    [class.bg-blue-500]="isRole(UserRole.BLUE_TEAM)"
                    [class.text-white]="isRole(UserRole.BLUE_TEAM)"
                    class="p-2 rounded border border-white/10 text-xs font-bold text-blue-400 text-center transition-colors">
                    {{ locale.t('roles.blue_team') }}
                  </button>
                  <button
                    type="button"
                    (click)="selectedRole = UserRole.OBSERVER"
                    [class.border-slate-400]="isRole(UserRole.OBSERVER)"
                    [class.bg-slate-700]="isRole(UserRole.OBSERVER)"
                    [class.text-white]="isRole(UserRole.OBSERVER)"
                    class="p-2 rounded border border-white/10 text-xs font-bold text-slate-300 text-center transition-colors">
                    {{ locale.t('roles.observer') }}
                  </button>
                  <button
                    type="button"
                    (click)="selectedRole = UserRole.FACILITATOR"
                    [class.border-green-500]="isRole(UserRole.FACILITATOR)"
                    [class.bg-[#84AA40]]="isRole(UserRole.FACILITATOR)"
                    [class.text-black]="isRole(UserRole.FACILITATOR)"
                    class="p-2 rounded border border-white/10 text-xs font-bold text-green-400 text-center transition-colors">
                    {{ locale.t('roles.facilitator') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2 mt-6">
            <button
              type="button"
              (click)="joinExercise()"
              [disabled]="loading() || !joinSessionId"
              class="btn-secondary w-full justify-center">
              {{ loading() ? locale.t('lobby.connecting') : locale.t('lobby.join_btn') }}
            </button>
            <button
              *ngIf="joinSessionId"
              type="button"
              (click)="openClassroom()"
              class="w-full text-center text-xs text-slate-400 hover:text-white py-1">
              📺 {{ locale.t('classroom.title') }} ({{ locale.t('classroom.live_mode') }})
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LobbyComponent implements OnInit {
  public locale = inject(LocaleService);
  private api = inject(LabApiService);
  private sync = inject(FirestoreSyncService);
  private router = inject(Router);

  public scenarios: ScenarioOption[] = [
    {
      id: 'poland-grid-panic-2026',
      title_pl: 'Awaria Krajowej Sieci Elektroenergetycznej (PSE)',
      title_en: 'Poland Critical Power Grid Crisis 2026',
      description_pl: 'Skoordynowana operacja dezinformacyjna z fałszywymi alertami o blackoutach i wyłączeniach prądu.',
      description_en: 'Hostile disinformation campaign targeting national grid PSE with fabricated blackout alerts.',
      default_ticks: 40
    },
    {
      id: 'financial-panic-2026',
      title_pl: 'Panika Sektora Bankowego i Run na Gotówkę 2026',
      title_en: 'Banking Liquidity Panic & Cash Run 2026',
      description_pl: 'Wirusowe plotki o blokadzie kart płatniczych, limitach bankomatów i niewypłacalności banków.',
      description_en: 'Viral rumors of digital banking liquidity freezes, ATM limits, and bank insolvencies.',
      default_ticks: 40
    },
    {
      id: 'water-contamination-2026',
      title_pl: 'Kryzys Skażenia Wodociągów Miejskich 2026',
      title_en: 'Municipal Water Supply Crisis 2026',
      description_pl: 'Skoordynowane plotki o skażeniu chemicznym ujęć wody pitnej wywołujące paniczne wykupywanie zapasów.',
      description_en: 'Targeted rumors alleging toxic chemical contamination in metropolitan water reservoirs.',
      default_ticks: 40
    },
    {
      id: 'border-security-2026',
      title_pl: 'Incydent Hybrydowy na Granicy Wschodniej 2026',
      title_en: 'Eastern Border Hybrid Incident 2026',
      description_pl: 'Fałszywe doniesienia o niezidentyfikowanych dronach, zakłóceniach GPS i ewakuacji mieszkańców.',
      description_en: 'Coordinated rumors of hostile drone intrusions, GPS jamming, and village evacuations.',
      default_ticks: 40
    }
  ];

  public selectedScenarioId = 'poland-grid-panic-2026';
  public newTitle = 'Poland Critical Power Grid Crisis 2026';
  public maxTicks = 40;
  public joinSessionId = '';
  public playerHandle = '';
  public selectedRole: UserRole = UserRole.BLUE_TEAM;
  public UserRole = UserRole;

  public loading = signal<boolean>(false);

  async ngOnInit() {
    this.updateTitleForScenario();
    try {
      const serverScenarios = await this.api.getScenarios();
      if (serverScenarios && serverScenarios.length > 0) {
        this.scenarios = serverScenarios;
        this.updateTitleForScenario();
      }
    } catch (e) {
      // Fallback scenarios already set
    }
  }

  setLang(code: LanguageCode) {
    this.locale.setLanguage(code);
    this.updateTitleForScenario();
  }

  onScenarioChange() {
    this.updateTitleForScenario();
  }

  private updateTitleForScenario() {
    const sc = this.scenarios.find(s => s.id === this.selectedScenarioId);
    if (sc) {
      this.newTitle = this.locale.language() === 'pl' ? sc.title_pl : sc.title_en;
      this.maxTicks = sc.default_ticks || 40;
    }
  }

  getSelectedScenarioDesc(): string {
    const sc = this.scenarios.find(s => s.id === this.selectedScenarioId);
    if (!sc) return '';
    return this.locale.language() === 'pl' ? sc.description_pl : sc.description_en;
  }

  isRole(role: UserRole): boolean {
    return this.selectedRole === role;
  }

  async createExercise() {
    this.loading.set(true);
    try {
      const session = await this.api.createSession(
        this.newTitle,
        this.selectedScenarioId,
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

  openClassroom() {
    if (this.joinSessionId) {
      this.router.navigate(['/classroom', this.joinSessionId]);
    }
  }
}
