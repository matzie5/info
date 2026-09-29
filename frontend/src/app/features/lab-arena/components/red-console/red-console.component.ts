import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeamBudgets, ActionType, DemographicCluster, FeedItem } from '../../../../core/models/session.model';
import { LocaleService } from '../../../../core/i18n/locale.service';

@Component({
  selector: 'app-red-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-panel p-5 border-red-500/30 glass-panel-glow-red space-y-5">
      <!-- Header & Resource Budget -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            <h2 class="text-base font-extrabold text-white tracking-wide uppercase">
              {{ locale.t('actions.red.title') }}
            </h2>
          </div>
          <span class="badge badge-red font-mono">ADVERSARY</span>
        </div>

        <!-- Adversary Capital Meter -->
        <div class="mt-3">
          <div class="flex justify-between text-xs font-mono mb-1">
            <span class="text-slate-300 font-bold">{{ locale.t('actions.red.capital') }}</span>
            <span class="text-red-400 font-bold">{{ (budgets?.red_team_capital || 0).toFixed(0) }} / 100</span>
          </div>
          <div class="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-red-500/20">
            <div
              class="h-full bg-red-500 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              [style.width.%]="budgets?.red_team_capital || 0">
            </div>
          </div>
          <span class="text-[10px] text-slate-400 mt-1 block">+10 Capital regens every tick cycle</span>
        </div>
      </div>

      <!-- Action 1: Deploy Bot Swarm -->
      <div class="p-3.5 rounded-lg bg-red-950/20 border border-red-500/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">🤖</span>
            <span class="font-bold text-sm text-white">{{ locale.t('actions.red.deploy_swarm') }}</span>
          </div>
          <span class="badge badge-red font-mono text-[10px]">25 Cap</span>
        </div>
        <p class="text-xs text-slate-300">{{ locale.t('actions.red.deploy_swarm_desc') }}</p>

        <div class="flex gap-2 pt-1">
          <select [(ngModel)]="swarmPostId" class="input-field text-xs py-1.5 flex-1">
            <option value="">Select Target Post...</option>
            <option *ngFor="let post of posts" [value]="post.id">
              {{ post.headline || post.content.substring(0, 35) }}...
            </option>
          </select>
          <button
            (click)="executeSwarm()"
            [disabled]="isBusy() || (budgets?.red_team_capital || 0) < 25 || !swarmPostId"
            class="btn-adversary text-xs py-1.5 px-3">
            Deploy
          </button>
        </div>
      </div>

      <!-- Action 2: Synthesize AI Deepfake Article -->
      <div class="p-3.5 rounded-lg bg-red-950/20 border border-red-500/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">⚡</span>
            <span class="font-bold text-sm text-white">{{ locale.t('actions.red.deepfake') }}</span>
          </div>
          <span class="badge badge-red font-mono text-[10px]">40 Cap</span>
        </div>
        <p class="text-xs text-slate-300">{{ locale.t('actions.red.deepfake_desc') }}</p>

        <div class="space-y-2 pt-1">
          <input
            type="text"
            [(ngModel)]="deepfakePrompt"
            placeholder="Narrative directive (e.g. Kozienice substation fire)"
            class="input-field text-xs py-1.5" />
          <div class="flex gap-2">
            <select [(ngModel)]="deepfakeCluster" class="input-field text-xs py-1.5 flex-1">
              <option [value]="DemographicCluster.HYPER_PARTISAN_A">Target: Hyper-Partisan A</option>
              <option [value]="DemographicCluster.HYPER_PARTISAN_B">Target: Hyper-Partisan B</option>
              <option [value]="DemographicCluster.INSTITUTIONAL_SKEPTICS">Target: Skeptics</option>
              <option [value]="DemographicCluster.SUSCEPTIBLE_NEUTRALS">Target: Neutrals</option>
            </select>
            <button
              (click)="executeDeepfake()"
              [disabled]="isBusy() || (budgets?.red_team_capital || 0) < 40"
              class="btn-adversary text-xs py-1.5 px-3">
              Synthesize
            </button>
          </div>
        </div>
      </div>

      <!-- Action 3: Microtarget Cluster -->
      <div class="p-3.5 rounded-lg bg-red-950/20 border border-red-500/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">🎯</span>
            <span class="font-bold text-sm text-white">{{ locale.t('actions.red.microtarget') }}</span>
          </div>
          <span class="badge badge-red font-mono text-[10px]">20 Cap</span>
        </div>
        <p class="text-xs text-slate-300">{{ locale.t('actions.red.microtarget_desc') }}</p>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <select [(ngModel)]="targetPostId" class="input-field text-xs py-1.5">
            <option value="">Target Post...</option>
            <option *ngFor="let post of posts" [value]="post.id">
              {{ post.headline || post.content.substring(0, 20) }}...
            </option>
          </select>
          <select [(ngModel)]="microtargetCluster" class="input-field text-xs py-1.5">
            <option [value]="DemographicCluster.HYPER_PARTISAN_A">Partisan A</option>
            <option [value]="DemographicCluster.HYPER_PARTISAN_B">Partisan B</option>
            <option [value]="DemographicCluster.INSTITUTIONAL_SKEPTICS">Skeptics</option>
            <option [value]="DemographicCluster.SUSCEPTIBLE_NEUTRALS">Neutrals</option>
          </select>
        </div>
        <button
          (click)="executeMicrotarget()"
          [disabled]="isBusy() || (budgets?.red_team_capital || 0) < 20 || !targetPostId"
          class="btn-adversary w-full text-xs py-1.5 justify-center">
          Execute Microtarget
        </button>
      </div>

      <!-- Action 4: Astroturf Comments -->
      <div class="p-3.5 rounded-lg bg-red-950/20 border border-red-500/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">📢</span>
            <span class="font-bold text-sm text-white">{{ locale.t('actions.red.astroturf') }}</span>
          </div>
          <span class="badge badge-red font-mono text-[10px]">15 Cap</span>
        </div>
        <p class="text-xs text-slate-300">{{ locale.t('actions.red.astroturf_desc') }}</p>

        <div class="flex gap-2 pt-1">
          <select [(ngModel)]="astroturfPostId" class="input-field text-xs py-1.5 flex-1">
            <option value="">Select Target Post...</option>
            <option *ngFor="let post of posts" [value]="post.id">
              {{ post.headline || post.content.substring(0, 35) }}...
            </option>
          </select>
          <button
            (click)="executeAstroturf()"
            [disabled]="isBusy() || (budgets?.red_team_capital || 0) < 15 || !astroturfPostId"
            class="btn-adversary text-xs py-1.5 px-3">
            Flood
          </button>
        </div>
      </div>
    </div>
  `
})
export class RedConsoleComponent {
  @Input() budgets: TeamBudgets | null = null;
  @Input() posts: FeedItem[] = [];
  @Output() actionDispatched = new EventEmitter<any>();

  public isBusy = signal<boolean>(false);
  public DemographicCluster = DemographicCluster;

  public swarmPostId = '';
  public deepfakePrompt = '';
  public deepfakeCluster: DemographicCluster = DemographicCluster.HYPER_PARTISAN_A;
  public targetPostId = '';
  public microtargetCluster: DemographicCluster = DemographicCluster.HYPER_PARTISAN_A;
  public astroturfPostId = '';

  constructor(public locale: LocaleService) {}

  executeSwarm() {
    this.actionDispatched.emit({
      actionType: ActionType.DEPLOY_BOT_SWARM,
      targetPostId: this.swarmPostId
    });
  }

  executeDeepfake() {
    this.actionDispatched.emit({
      actionType: ActionType.AI_DEEPFAKE_ARTICLE,
      customPrompt: this.deepfakePrompt,
      targetCluster: this.deepfakeCluster
    });
    this.deepfakePrompt = '';
  }

  executeMicrotarget() {
    this.actionDispatched.emit({
      actionType: ActionType.MICROTARGET_CLUSTER,
      targetPostId: this.targetPostId,
      targetCluster: this.microtargetCluster
    });
  }

  executeAstroturf() {
    this.actionDispatched.emit({
      actionType: ActionType.ASTROTURF_COMMENTS,
      targetPostId: this.astroturfPostId
    });
  }
}
