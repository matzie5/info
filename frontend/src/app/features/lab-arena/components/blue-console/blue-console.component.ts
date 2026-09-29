import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeamBudgets, ActionType, DemographicCluster, FeedItem } from '../../../../core/models/session.model';
import { LocaleService } from '../../../../core/i18n/locale.service';

@Component({
  selector: 'app-blue-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-panel p-5 border-[#84AA40]/30 glass-panel-glow-green space-y-5">
      <!-- Header & Resource Budget -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-[#84AA40] animate-pulse"></span>
            <h2 class="text-base font-extrabold text-white tracking-wide uppercase">
              {{ locale.t('actions.blue.title') }}
            </h2>
          </div>
          <span class="badge badge-green font-mono">DEFENSE</span>
        </div>

        <!-- Defense Bandwidth Meter -->
        <div class="mt-3">
          <div class="flex justify-between text-xs font-mono mb-1">
            <span class="text-slate-300 font-bold">{{ locale.t('actions.blue.bandwidth') }}</span>
            <span class="text-[#A3E635] font-bold">{{ (budgets?.blue_team_bandwidth || 0).toFixed(0) }} / 100</span>
          </div>
          <div class="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#84AA40]/20">
            <div
              class="h-full bg-[#84AA40] transition-all duration-300 shadow-[0_0_10px_rgba(132,170,64,0.5)]"
              [style.width.%]="budgets?.blue_team_bandwidth || 0">
            </div>
          </div>
          <span class="text-[10px] text-slate-400 mt-1 block">+10 Bandwidth regens every tick cycle</span>
        </div>
      </div>

      <!-- Action 1: Prebunk Campaign -->
      <div class="p-3.5 rounded-lg bg-[#84AA40]/10 border border-[#84AA40]/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">🛡️</span>
            <span class="font-bold text-sm text-white">{{ locale.t('actions.blue.prebunk') }}</span>
          </div>
          <span class="badge badge-green font-mono text-[10px]">20 Bw</span>
        </div>
        <p class="text-xs text-slate-300">{{ locale.t('actions.blue.prebunk_desc') }}</p>

        <div class="flex gap-2 pt-1">
          <select [(ngModel)]="prebunkCluster" class="input-field text-xs py-1.5 flex-1">
            <option [value]="DemographicCluster.SUSCEPTIBLE_NEUTRALS">Neutrals (+0.4 Shield)</option>
            <option [value]="DemographicCluster.INSTITUTIONAL_SKEPTICS">Skeptics (+0.4 Shield)</option>
            <option [value]="DemographicCluster.APOLITICAL_YOUTH">Youth (+0.4 Shield)</option>
            <option [value]="DemographicCluster.HYPER_PARTISAN_A">Partisan A (+0.4 Shield)</option>
            <option [value]="DemographicCluster.HYPER_PARTISAN_B">Partisan B (+0.4 Shield)</option>
          </select>
          <button
            (click)="executePrebunk()"
            [disabled]="isBusy() || (budgets?.blue_team_bandwidth || 0) < 20"
            class="btn-primary text-xs py-1.5 px-3">
            Inoculate
          </button>
        </div>
      </div>

      <!-- Action 2: Evidence Debunk -->
      <div class="p-3.5 rounded-lg bg-[#84AA40]/10 border border-[#84AA40]/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">🔍</span>
            <span class="font-bold text-sm text-white">{{ locale.t('actions.blue.debunk') }}</span>
          </div>
          <span class="badge badge-green font-mono text-[10px]">25 Bw</span>
        </div>
        <p class="text-xs text-slate-300">{{ locale.t('actions.blue.debunk_desc') }}</p>

        <div class="flex gap-2 pt-1">
          <select [(ngModel)]="debunkPostId" class="input-field text-xs py-1.5 flex-1">
            <option value="">Select Target Post to Debunk...</option>
            <option *ngFor="let post of posts" [value]="post.id">
              {{ post.headline || post.content.substring(0, 35) }}...
            </option>
          </select>
          <button
            (click)="executeDebunk()"
            [disabled]="isBusy() || (budgets?.blue_team_bandwidth || 0) < 25 || !debunkPostId"
            class="btn-primary text-xs py-1.5 px-3">
            Debunk
          </button>
        </div>
      </div>

      <!-- Action 3: Velocity Friction -->
      <div class="p-3.5 rounded-lg bg-[#84AA40]/10 border border-[#84AA40]/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">⏳</span>
            <span class="font-bold text-sm text-white">{{ locale.t('actions.blue.friction') }}</span>
          </div>
          <span class="badge badge-green font-mono text-[10px]">35 Bw</span>
        </div>
        <p class="text-xs text-slate-300">{{ locale.t('actions.blue.friction_desc') }}</p>

        <div class="flex gap-2 pt-1">
          <select [(ngModel)]="frictionPostId" class="input-field text-xs py-1.5 flex-1">
            <option value="">Global Dampening (All Viral Posts)</option>
            <option *ngFor="let post of posts" [value]="post.id">
              {{ post.headline || post.content.substring(0, 35) }}...
            </option>
          </select>
          <button
            (click)="executeFriction()"
            [disabled]="isBusy() || (budgets?.blue_team_bandwidth || 0) < 35"
            class="btn-primary text-xs py-1.5 px-3">
            Apply
          </button>
        </div>
      </div>

      <!-- Action 4: Public Crisis Advisory -->
      <div class="p-3.5 rounded-lg bg-[#84AA40]/10 border border-[#84AA40]/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">📢</span>
            <span class="font-bold text-sm text-white">{{ locale.t('actions.blue.advisory') }}</span>
          </div>
          <span class="badge badge-green font-mono text-[10px]">30 Bw</span>
        </div>
        <p class="text-xs text-slate-300">{{ locale.t('actions.blue.advisory_desc') }}</p>

        <button
          (click)="executeAdvisory()"
          [disabled]="isBusy() || (budgets?.blue_team_bandwidth || 0) < 30"
          class="btn-primary w-full text-xs py-2 justify-center">
          Broadcast Official Government Advisory (+8% Trust)
        </button>
      </div>
    </div>
  `
})
export class BlueConsoleComponent {
  @Input() budgets: TeamBudgets | null = null;
  @Input() posts: FeedItem[] = [];
  @Output() actionDispatched = new EventEmitter<any>();

  public isBusy = signal<boolean>(false);
  public DemographicCluster = DemographicCluster;

  public prebunkCluster: DemographicCluster = DemographicCluster.SUSCEPTIBLE_NEUTRALS;
  public debunkPostId = '';
  public frictionPostId = '';

  constructor(public locale: LocaleService) {}

  executePrebunk() {
    this.actionDispatched.emit({
      actionType: ActionType.PREBUNK_CAMPAIGN,
      targetCluster: this.prebunkCluster
    });
  }

  executeDebunk() {
    this.actionDispatched.emit({
      actionType: ActionType.EVIDENCE_DEBUNK,
      targetPostId: this.debunkPostId
    });
  }

  executeFriction() {
    this.actionDispatched.emit({
      actionType: ActionType.VELOCITY_FRICTION,
      targetPostId: this.frictionPostId || undefined
    });
  }

  executeAdvisory() {
    this.actionDispatched.emit({
      actionType: ActionType.PUBLIC_ADVISORY
    });
  }
}
