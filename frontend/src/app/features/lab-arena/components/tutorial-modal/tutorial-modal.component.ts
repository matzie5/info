import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocaleService } from '../../../../core/i18n/locale.service';

@Component({
  selector: 'app-tutorial-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div class="glass-panel w-full max-w-3xl p-6 space-y-4 border-white/20 shadow-2xl flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">📖</span>
            <div>
              <h2 class="text-base md:text-lg font-black text-white">
                {{ locale.t('tutorial.modal_title') }}
              </h2>
              <span class="text-xs text-slate-400 font-mono">
                Simulation Briefing &bull; 500-Node Scale-Free Information Network
              </span>
            </div>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="text-slate-400 hover:text-white text-lg font-mono px-2 py-1">
            ✕
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            (click)="activeTab = 'overview'"
            [class.border-[#84AA40]]="activeTab === 'overview'"
            [class.text-[#84AA40]]="activeTab === 'overview'"
            class="pb-2 text-xs font-bold border-b-2 px-3 transition-colors border-transparent text-slate-400 hover:text-white whitespace-nowrap">
            🎯 {{ locale.t('tutorial.tab_overview') }}
          </button>
          <button
            type="button"
            (click)="activeTab = 'red'"
            [class.border-red-500]="activeTab === 'red'"
            [class.text-red-400]="activeTab === 'red'"
            class="pb-2 text-xs font-bold border-b-2 px-3 transition-colors border-transparent text-slate-400 hover:text-white whitespace-nowrap">
            🔴 {{ locale.t('tutorial.tab_red') }}
          </button>
          <button
            type="button"
            (click)="activeTab = 'blue'"
            [class.border-blue-500]="activeTab === 'blue'"
            [class.text-blue-400]="activeTab === 'blue'"
            class="pb-2 text-xs font-bold border-b-2 px-3 transition-colors border-transparent text-slate-400 hover:text-white whitespace-nowrap">
            🔵 {{ locale.t('tutorial.tab_blue') }}
          </button>
          <button
            type="button"
            (click)="activeTab = 'economy'"
            [class.border-[#84AA40]]="activeTab === 'economy'"
            [class.text-[#84AA40]]="activeTab === 'economy'"
            class="pb-2 text-xs font-bold border-b-2 px-3 transition-colors border-transparent text-slate-400 hover:text-white whitespace-nowrap">
            ⚡ {{ locale.t('tutorial.tab_economy') }}
          </button>
        </div>

        <!-- Scrollable Tab Content Area -->
        <div class="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-300 leading-relaxed">
          
          <!-- TAB 1: OVERVIEW & WIN CONDITIONS -->
          <div *ngIf="activeTab === 'overview'" class="space-y-4">
            <div class="glass-panel p-4 border-white/10 space-y-2 bg-white/[0.02]">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span>🌐</span> The Information Battlefield
              </h3>
              <p>
                In <strong>Infosphere Lab</strong>, you are competing in a live, real-time agent-based simulation modeling modern hybrid warfare and digital cognitive operations.
              </p>
              <p>
                The social graph consists of <strong>500 autonomous citizens</strong> divided into demographic clusters (Hyper-Partisan factions, Institutional Skeptics, Susceptible Neutrals, and Apolitical Youth).
              </p>
              <p>
                The simulation clock advances in <strong>10-second ticks</strong>, where each tick represents <strong>1 hour of operational crisis time</strong>.
              </p>
            </div>

            <div class="grid md:grid-cols-2 gap-3">
              <!-- Red Win Condition -->
              <div class="glass-panel p-4 border-red-500/30 bg-red-950/15 space-y-2">
                <div class="flex items-center gap-2 font-bold text-red-400 text-sm">
                  <span>🔴</span> Red Team Victory Condition
                </div>
                <ul class="list-disc list-inside space-y-1 text-slate-300">
                  <li>Drive <strong>Platform Institutional Trust below 20%</strong> (&lt;0.20)</li>
                  <li><strong>OR</strong> push <strong>Polarization Index above 85%</strong> (&gt;0.85)</li>
                  <li>Achieve cognitive breakthrough and public panic.</li>
                </ul>
              </div>

              <!-- Blue Win Condition -->
              <div class="glass-panel p-4 border-blue-500/30 bg-blue-950/15 space-y-2">
                <div class="flex items-center gap-2 font-bold text-blue-400 text-sm">
                  <span>🔵</span> Blue Team Victory Condition
                </div>
                <ul class="list-disc list-inside space-y-1 text-slate-300">
                  <li>Maintain <strong>Institutional Trust above 60%</strong> (&gt;0.60) through exercise conclusion.</li>
                  <li>Keep <strong>Polarization Index below 50%</strong>.</li>
                  <li>Inoculate vulnerable demographics against disinformation.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- TAB 2: RED TEAM PLAYBOOK -->
          <div *ngIf="activeTab === 'red'" class="space-y-3">
            <p class="text-slate-400">
              As the Adversary Cell, your objective is to disrupt social cohesion, erode trust in authorities, and engineer viral cascades of panic.
            </p>

            <div class="space-y-2.5">
              <!-- Action 1: Bot Swarm -->
              <div class="glass-panel p-3 border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white flex items-center gap-1.5">
                    <span>🤖</span> Deploy Bot Swarm
                  </span>
                  <span class="badge badge-red text-[10px]">Cost: 25 Capital &bull; CD: 1 Tick</span>
                </div>
                <p>
                  Mobilizes automated inauthentic accounts to coordinate retweets and shares on a targeted post. Boosts virality velocity and shares by <strong>+300%</strong>. Use on high-outrage posts to make them trend immediately.
                </p>
              </div>

              <!-- Action 2: Deepfake Article -->
              <div class="glass-panel p-3 border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white flex items-center gap-1.5">
                    <span>🎭</span> Synthesize AI Deepfake
                  </span>
                  <span class="badge badge-red text-[10px]">Cost: 35 Capital &bull; CD: 2 Ticks</span>
                </div>
                <p>
                  Generates a realistic fabricated news article or spoofed emergency leak. Injects an entirely new breaking event into the Pulse feed with high baseline outrage.
                </p>
              </div>

              <!-- Action 3: Microtarget Cluster -->
              <div class="glass-panel p-3 border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white flex items-center gap-1.5">
                    <span>🎯</span> Microtarget Demographic Cluster
                  </span>
                  <span class="badge badge-red text-[10px]">Cost: 20 Capital &bull; CD: 1 Tick</span>
                </div>
                <p>
                  Surgically targets a demographic cluster (e.g., Institutional Skeptics or Hyper-Partisans) with resonant wedge narratives, rapidly accelerating infection in that demographic.
                </p>
              </div>

              <!-- Action 4: Astroturf Comments -->
              <div class="glass-panel p-3 border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white flex items-center gap-1.5">
                    <span>💬</span> Astroturf Commentary
                  </span>
                  <span class="badge badge-red text-[10px]">Cost: 15 Capital &bull; CD: 1 Tick</span>
                </div>
                <p>
                  Floods a post's comment section with angry citizen replies, manufacturing false consensus and pushing undecided neutral nodes toward outrage.
                </p>
              </div>
            </div>
          </div>

          <!-- TAB 3: BLUE TEAM PLAYBOOK -->
          <div *ngIf="activeTab === 'blue'" class="space-y-3">
            <p class="text-slate-400">
              As the Defense Directorate, your mission is proactive cognitive inoculation, rapid fact verification, algorithmic friction, and authoritative crisis communications.
            </p>

            <div class="space-y-2.5">
              <!-- Action 1: Prebunk -->
              <div class="glass-panel p-3 border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white flex items-center gap-1.5">
                    <span>🛡️</span> Prebunk Campaign (Psychological Inoculation)
                  </span>
                  <span class="badge badge-blue text-[10px]">Cost: 25 Bandwidth &bull; CD: 1 Tick</span>
                </div>
                <p>
                  A proactive media literacy initiative that inoculates target demographic nodes <strong>before</strong> hostile narratives reach them. Inoculated citizens build cognitive antibodies and will refuse to reshare fake news.
                </p>
              </div>

              <!-- Action 2: Evidence Debunk -->
              <div class="glass-panel p-3 border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white flex items-center gap-1.5">
                    <span>🔍</span> Evidence Debunk (Fact-Check)
                  </span>
                  <span class="badge badge-blue text-[10px]">Cost: 20 Bandwidth &bull; CD: 1 Tick</span>
                </div>
                <p>
                  Attaches a verified debunk notice and fact-check badge to a viral post. Slashes its virality velocity by <strong>60%</strong> and restores trust among neutral clusters.
                </p>
              </div>

              <!-- Action 3: Velocity Friction -->
              <div class="glass-panel p-3 border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white flex items-center gap-1.5">
                    <span>⚡</span> Velocity Friction
                  </span>
                  <span class="badge badge-blue text-[10px]">Cost: 15 Bandwidth &bull; CD: 1 Tick</span>
                </div>
                <p>
                  Deprioritizes a viral post in the recommendation feed, introducing friction and preventing runaway viral cascades.
                </p>
              </div>

              <!-- Action 4: Crisis Advisory -->
              <div class="glass-panel p-3 border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white flex items-center gap-1.5">
                    <span>📢</span> Public Crisis Advisory
                  </span>
                  <span class="badge badge-blue text-[10px]">Cost: 30 Bandwidth &bull; CD: 3 Ticks</span>
                </div>
                <p>
                  Broadcasts an official high-priority statement from the Government Security Centre (RCB). Restores platform trust network-wide (+10%) and calms panicking demographics.
                </p>
              </div>
            </div>
          </div>

          <!-- TAB 4: RESOURCE ECONOMY & TIPS -->
          <div *ngIf="activeTab === 'economy'" class="space-y-3">
            <div class="grid md:grid-cols-2 gap-3">
              <div class="glass-panel p-3 border-white/5 space-y-2">
                <h4 class="font-bold text-white text-xs uppercase tracking-wider text-[#84AA40]">
                  💰 Budget & Regeneration
                </h4>
                <ul class="list-disc list-inside space-y-1 text-slate-300">
                  <li>Both teams start with <strong>100 budget points</strong>.</li>
                  <li>Every tick (10 seconds), <strong>+15 points regenerate</strong> automatically (capped at 100).</li>
                  <li>Manage your budget wisely; firing high-cost operations without surplus leaves you vulnerable to counter-moves.</li>
                </ul>
              </div>

              <div class="glass-panel p-3 border-white/5 space-y-2">
                <h4 class="font-bold text-white text-xs uppercase tracking-wider text-[#84AA40]">
                  ⏱️ Clock Cycles & Cooldowns
                </h4>
                <ul class="list-disc list-inside space-y-1 text-slate-300">
                  <li>Each real-world 10 seconds triggers a full network diffusion step.</li>
                  <li>Actions enter a cooldown period (1 to 3 ticks) after deployment to prevent spamming.</li>
                  <li>Coordinate with your team: sequence operations together for maximal impact.</li>
                </ul>
              </div>
            </div>

            <div class="glass-panel p-3 border-white/10 bg-white/[0.02] space-y-1.5">
              <h4 class="font-bold text-white text-xs uppercase tracking-wider text-[#84AA40]">
                💡 Strategic Pro-Tips
              </h4>
              <p>
                <strong>For Red Operatives:</strong> Target <em>Institutional Skeptics</em> and <em>Hyper-Partisans</em> early to build an unshakeable contagion base, then deploy Bot Swarms right after publishing a Deepfake leak.
              </p>
              <p>
                <strong>For Blue Defenders:</strong> Prebunking is twice as effective as debunking! Inoculate <em>Susceptible Neutrals</em> before attacks land. If a post is blowing up, combine <em>Velocity Friction</em> with an <em>Evidence Debunk</em> immediately.
              </p>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-3 border-t border-white/10">
          <button
            type="button"
            (click)="close.emit()"
            class="btn-primary py-2 px-5 bg-[#84AA40] hover:bg-[#739636] text-black font-bold">
            {{ locale.t('tutorial.close') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class TutorialModalComponent {
  public locale = inject(LocaleService);
  @Output() close = new EventEmitter<void>();

  public activeTab: 'overview' | 'red' | 'blue' | 'economy' = 'overview';
}
