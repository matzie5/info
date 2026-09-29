import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LabApiService } from '../../core/services/lab-api.service';
import { FirestoreSyncService } from '../../core/services/firestore-sync.service';
import { HeartbeatService } from '../../core/services/heartbeat.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { UserRole, SessionStatus } from '../../core/models/session.model';

@Component({
  selector: 'app-admin-hud',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      <!-- Admin Header Bar -->
      <header class="glass-panel sticky top-0 z-30 border-b border-white/10 px-6 py-3">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <a routerLink="/" class="text-white font-black text-lg tracking-tight hover:opacity-80 transition-opacity">
              INFOSPHERE<span class="text-[#84AA40]">.LAB</span>
            </a>
            <span class="badge badge-amber text-xs">FACILITATOR HUD</span>
            <span class="text-xs font-mono text-slate-400">ID: {{ sessionId }}</span>
          </div>

          <!-- God Mode Control Buttons -->
          <div class="flex items-center gap-2">
            <button
              *ngIf="session()?.status === SessionStatus.LOBBY"
              (click)="startSession()"
              class="btn-primary text-xs py-1.5 px-3">
              ▶ Start Exercise
            </button>
            <button
              *ngIf="session()?.status === SessionStatus.ACTIVE"
              (click)="pauseSession()"
              class="btn-secondary text-xs py-1.5 px-3">
              ⏸ Pause
            </button>
            <button
              *ngIf="session()?.status === SessionStatus.PAUSED"
              (click)="resumeSession()"
              class="btn-primary text-xs py-1.5 px-3">
              ▶ Resume
            </button>
            <button
              (click)="forceTick()"
              class="btn-secondary text-xs py-1.5 px-3 border-amber-500/30 text-amber-300">
              ⏭ Force Tick
            </button>
            <button
              (click)="openInjectModal = true"
              class="btn-adversary text-xs py-1.5 px-3">
              ⚠️ Trigger Crisis Inject
            </button>
            <a
              [routerLink]="['/arena', sessionId]"
              class="btn-secondary text-xs py-1.5 px-3">
              Arena View
            </a>
          </div>
        </div>
      </header>

      <main class="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
        <!-- Top Metrics & Token Governor Bar -->
        <div class="grid md:grid-cols-3 gap-6">
          <!-- Exercise Clock & Status -->
          <div class="glass-panel p-5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono uppercase text-slate-400">Exercise Clock</span>
              <span
                class="badge text-[10px]"
                [class.badge-green]="session()?.status === SessionStatus.ACTIVE"
                [class.badge-amber]="session()?.status === SessionStatus.PAUSED"
                [class.badge-red]="session()?.status === SessionStatus.COMPLETED">
                {{ session()?.status }}
              </span>
            </div>
            <div class="text-3xl font-black font-mono text-white">
              T+{{ session()?.current_tick || 0 }}h / {{ session()?.max_ticks || 40 }}h
            </div>
            <p class="text-xs text-slate-400">
              1 tick = 10s real-time / 1 hour operational scenario time.
            </p>
          </div>

          <!-- Token Governor Meter -->
          <div class="glass-panel p-5 space-y-2 md:col-span-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                <span class="text-xs font-mono uppercase text-slate-400">Gemini 3.5 Flash Token Governor</span>
              </div>
              <span
                class="badge text-[10px]"
                [class.badge-green]="!session()?.token_usage?.is_throttled && !session()?.token_usage?.is_circuit_breaker_tripped"
                [class.badge-amber]="session()?.token_usage?.is_throttled"
                [class.badge-red]="session()?.token_usage?.is_circuit_breaker_tripped">
                {{ session()?.token_usage?.is_circuit_breaker_tripped ? 'CIRCUIT BREAKER' : (session()?.token_usage?.is_throttled ? 'THROTTLED' : 'NORMAL TIER') }}
              </span>
            </div>

            <!-- Progress Meter -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-mono">
                <span class="text-slate-300">
                  {{ session()?.token_usage?.total_tokens || 0 }} / {{ session()?.token_usage?.budget_limit_tokens || 300000 }} tokens
                </span>
                <span class="text-slate-400">
                  Est. Cost: <strong class="text-white">&dollar;{{ (session()?.token_usage?.cost_usd_estimated || 0).toFixed(4) }} USD</strong>
                </span>
              </div>
              <div class="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  class="h-full bg-blue-500 transition-all duration-300"
                  [style.width.%]="tokenUsagePercentage()">
                </div>
              </div>
            </div>

            <div class="text-[11px] text-slate-400 flex gap-4 pt-1">
              <span>Prompt: {{ session()?.token_usage?.prompt_tokens || 0 }}</span>
              <span>Completion: {{ session()?.token_usage?.completion_tokens || 0 }}</span>
              <span>Requests: {{ session()?.token_usage?.requests_count || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Middle Section: Participant Presence Radar & Magic Links -->
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Participant Presence Radar -->
          <div class="glass-panel p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 class="font-bold text-sm text-white uppercase tracking-wider">
                  Participant Presence Radar
                </h3>
              </div>
              <span class="badge badge-green font-mono text-[10px]">
                {{ activeParticipantCount() }} ACTIVE
              </span>
            </div>

            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
              <div *ngIf="presenceList().length === 0" class="text-xs text-slate-500 text-center py-6">
                No participants joined yet. Share invite links below.
              </div>

              <div *ngFor="let p of presenceList()" class="p-2.5 rounded bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    [class.bg-emerald-400]="p.is_active"
                    [class.bg-slate-600]="!p.is_active">
                  </span>
                  <span class="text-white font-bold">{{ p.handle }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="badge text-[9px]"
                    [class.badge-red]="p.role === UserRole.RED_TEAM"
                    [class.badge-blue]="p.role === UserRole.BLUE_TEAM"
                    [class.badge-green]="p.role === UserRole.FACILITATOR">
                    {{ p.role }}
                  </span>
                  <span class="text-[10px] text-slate-400">
                    {{ p.seconds_since_last_seen }}s ago
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Signed Magic Invite Generator -->
          <div class="glass-panel p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">🔗</span>
              <h3 class="font-bold text-sm text-white uppercase tracking-wider">
                Magic Join Token Links
              </h3>
            </div>
            <p class="text-xs text-slate-400">
              Generate signed HMAC URLs for seamless zero-auth onboarding into Red or Blue team.
            </p>

            <div class="space-y-2">
              <button
                (click)="generateInvite(UserRole.RED_TEAM)"
                class="btn-adversary w-full text-xs py-2 justify-center">
                Generate Red Team Invite URL
              </button>
              <button
                (click)="generateInvite(UserRole.BLUE_TEAM)"
                class="btn-primary w-full text-xs py-2 justify-center">
                Generate Blue Team Invite URL
              </button>
            </div>

            <div *ngIf="generatedInviteUrl" class="p-3 rounded bg-black/60 border border-white/10 space-y-1">
              <span class="text-[10px] text-slate-400 uppercase font-mono block">Signed Shareable Link</span>
              <input
                type="text"
                readonly
                [value]="generatedInviteUrl"
                (click)="copyInvite()"
                class="input-field text-xs font-mono py-1 cursor-pointer" />
              <span *ngIf="copied" class="text-[10px] text-[#A3E635] font-mono block">Copied to clipboard!</span>
            </div>
          </div>
        </div>

        <!-- Demographic Cluster Telemetry Breakdown -->
        <div class="glass-panel p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white uppercase tracking-wider">
              500-Node Demographic Cluster Telemetry
            </h3>
            <span class="text-xs text-slate-400 font-mono">Agent-Based Network Model</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead>
                <tr class="border-b border-white/10 text-slate-400">
                  <th class="py-2">Cluster</th>
                  <th class="py-2">Avg Trust</th>
                  <th class="py-2">Ideological Bias</th>
                  <th class="py-2">Outrage Sensitivity</th>
                  <th class="py-2">Prebunk Shield</th>
                  <th class="py-2">Nodes</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr *ngFor="let item of clusterMetricsList()">
                  <td class="py-2 text-white font-bold">{{ item.name }}</td>
                  <td class="py-2 text-[#A3E635]">{{ (item.avg_trust * 100).toFixed(1) }}%</td>
                  <td class="py-2" [class.text-red-400]="item.avg_bias > 0.3" [class.text-blue-400]="item.avg_bias < -0.3">
                    {{ item.avg_bias.toFixed(2) }}
                  </td>
                  <td class="py-2 text-amber-400">{{ (item.avg_outrage * 100).toFixed(1) }}%</td>
                  <td class="py-2 text-[#84AA40]">{{ (item.avg_prebunk_shield * 100).toFixed(1) }}%</td>
                  <td class="py-2 text-slate-300">{{ item.total_nodes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <!-- Emergency Crisis Inject Modal -->
      <div *ngIf="openInjectModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="glass-panel p-6 max-w-lg w-full space-y-4 border-amber-500/40">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚠️</span>
            <h3 class="text-lg font-bold text-white">Trigger Government Crisis Advisory (RCB)</h3>
          </div>
          <p class="text-xs text-slate-300">
            Broadcasting an official Government Security Centre (RCB) alert will pin a verified advisory across all feeds and immediately increase platform trust by +8-10%.
          </p>

          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Custom Advisory Statement (Optional)</label>
            <textarea
              [(ngModel)]="injectCustomText"
              rows="3"
              placeholder="Leave empty to use official pre-validated RCB advisory..."
              class="input-field text-xs font-mono">
            </textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button (click)="openInjectModal = false" class="btn-secondary text-xs">
              Cancel
            </button>
            <button (click)="submitInject()" class="btn-adversary text-xs">
              Broadcast Crisis Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminHudComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(LabApiService);
  public sync = inject(FirestoreSyncService);
  private heartbeat = inject(HeartbeatService);
  public locale = inject(LocaleService);

  public sessionId = '';
  public session = this.sync.session;
  public UserRole = UserRole;
  public SessionStatus = SessionStatus;

  public presenceList = signal<any[]>([]);
  public telemetryData = signal<any>(null);
  public generatedInviteUrl = '';
  public copied = false;
  public openInjectModal = false;
  public injectCustomText = '';

  private adminPollTimer: any = null;

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (this.sessionId) {
      this.sync.startSync(this.sessionId, 2000);
      this.heartbeat.startHeartbeat(this.sessionId);
      this.loadAdminData();
      this.adminPollTimer = setInterval(() => this.loadAdminData(), 3000);
    }
  }

  ngOnDestroy() {
    this.sync.stopSync();
    this.heartbeat.stopHeartbeat();
    if (this.adminPollTimer) clearInterval(this.adminPollTimer);
  }

  async loadAdminData() {
    try {
      const [pres, tel] = await Promise.all([
        this.api.adminGetPresence(this.sessionId),
        this.api.adminGetTelemetry(this.sessionId)
      ]);
      this.presenceList.set(pres.participants || []);
      this.telemetryData.set(tel);
    } catch (e) {
      console.warn('Could not load admin HUD telemetry:', e);
    }
  }

  tokenUsagePercentage(): number {
    const s = this.session();
    if (!s || !s.token_usage) return 0;
    return Math.min(100, (s.token_usage.total_tokens / Math.max(1, s.token_usage.budget_limit_tokens)) * 100);
  }

  activeParticipantCount(): number {
    return this.presenceList().filter(p => p.is_active).length;
  }

  clusterMetricsList(): any[] {
    const tel = this.telemetryData();
    if (!tel || !tel.cluster_metrics) return [];
    return Object.entries(tel.cluster_metrics).map(([name, data]: [string, any]) => ({
      name,
      ...data
    }));
  }

  async startSession() {
    await this.api.startSession(this.sessionId);
    this.sync.fetchData(this.sessionId);
  }

  async pauseSession() {
    await this.api.pauseSession(this.sessionId);
    this.sync.fetchData(this.sessionId);
  }

  async resumeSession() {
    await this.api.resumeSession(this.sessionId);
    this.sync.fetchData(this.sessionId);
  }

  async forceTick() {
    await this.api.adminForceTick(this.sessionId);
    this.sync.fetchData(this.sessionId);
    this.loadAdminData();
  }

  async submitInject() {
    await this.api.adminCrisisInject(this.sessionId, this.injectCustomText || undefined);
    this.openInjectModal = false;
    this.injectCustomText = '';
    this.sync.fetchData(this.sessionId);
    this.loadAdminData();
  }

  async generateInvite(role: UserRole) {
    const res = await this.api.createInvite(this.sessionId, role);
    this.generatedInviteUrl = `${window.location.origin}/join?sessionId=${this.sessionId}&token=${res.token}`;
    this.copied = false;
  }

  copyInvite() {
    navigator.clipboard.writeText(this.generatedInviteUrl);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }
}
