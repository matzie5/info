import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AuthService } from '../../../core/auth/auth.service';
import { RouterModule } from '@angular/router';

export interface OSINTExposureReport {
  adk_pipeline_name: string;
  exposure_risk_score: number;
  hygiene_resilience_score: number;
  discovered_pii_counts: { [key: string]: number };
  total_redactions: number;
  simulated_attacker_pretext: string;
  dlp_remediated_profile: string;
  remediation_checklist: string[];
  citations: string[];
}

@Component({
  selector: 'app-m4-osint-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 p-6 flex flex-col gap-6 transition-colors duration-200">
      <!-- Header Banner -->
      <header class="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#84AA40]/20 text-[#84AA40] border border-[#84AA40]/40">
              MODULE 4
            </span>
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400">Google Cloud Sensitive Data Protection (DLP) + HarvesterAgent Recon</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            {{ locale.t('m4.title') }}
          </h1>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            {{ locale.t('m4.subtitle') }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-right shadow-sm">
            <div class="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">{{ locale.t('m4.resilience_score') }}</div>
            <div class="text-xl font-mono font-bold" [ngClass]="getScoreColor(hygieneScore())">
              {{ hygieneScore() }} <span class="text-xs text-slate-500">/ 100</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Workbench (2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Public Profile Ingestion (5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-4">
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Public OSINT Footprint Ingestion
              </span>
              <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">Target Input</span>
            </div>

            <!-- Footprint Preset Templates -->
            <div class="flex flex-col gap-1.5">
              <span class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                {{ locale.t('m4.presets_label') }}:
              </span>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  (click)="loadPreset('scada')"
                  class="px-2.5 py-1 rounded text-xs font-mono bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-[#84AA40] text-slate-700 dark:text-slate-300 transition">
                  {{ locale.t('m4.preset_scada') }}
                </button>
                <button
                  type="button"
                  (click)="loadPreset('it')"
                  class="px-2.5 py-1 rounded text-xs font-mono bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-[#84AA40] text-slate-700 dark:text-slate-300 transition">
                  {{ locale.t('m4.preset_cloud') }}
                </button>
                <button
                  type="button"
                  (click)="loadPreset('hardened')"
                  class="px-2.5 py-1 rounded text-xs font-mono bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-[#84AA40] text-slate-700 dark:text-slate-300 transition">
                  {{ locale.t('m4.preset_hardened') }}
                </button>
              </div>
            </div>

            <!-- Public Bio & Posts Textarea -->
            <div class="flex flex-col gap-2">
              <label class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold flex items-center justify-between">
                <span>{{ locale.t('m4.footprint_label') }}</span>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Unsanitized Input</span>
              </label>
              <textarea
                [(ngModel)]="bioInput"
                rows="8"
                [placeholder]="locale.t('m4.footprint_placeholder')"
                class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#84AA40] focus:ring-1 focus:ring-[#84AA40] outline-none leading-relaxed"></textarea>
            </div>

            <!-- Scan Button -->
            <button
              (click)="runAnalysis()"
              [disabled]="isAnalyzing() || !bioInput.trim()"
              class="btn-primary text-xs font-mono py-2.5 px-4 rounded bg-[#84AA40] text-slate-950 dark:text-[#0B0F17] hover:bg-[#84AA40]/90 font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
              <span *ngIf="isAnalyzing()" class="animate-spin">⚙</span>
              <span>{{ isAnalyzing() ? locale.t('m4.analyzing') : locale.t('m4.analyze_btn') }}</span>
            </button>
          </div>
        </div>

        <!-- Right: Recon & DLP Remediated Results (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-4">
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Recon Analysis & DLP Remediation Output
              </span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                Google Cloud DLP Engine
              </span>
            </div>

            <div *ngIf="isAnalyzing()" class="p-8 text-center flex flex-col items-center gap-3">
              <div class="h-8 w-8 rounded-full border-2 border-[#84AA40] border-t-transparent animate-spin"></div>
              <div class="text-xs font-mono text-cyan-600 dark:text-cyan-400">{{ locale.t('m4.analyzing') }}</div>
            </div>

            <div *ngIf="!report() && !isAnalyzing()" class="p-8 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
              Load a preset or input your public profile details and click "Analyze Exposure" to evaluate vulnerabilities.
            </div>

            <div *ngIf="report() && !isAnalyzing()" class="flex flex-col gap-4">
              <!-- Points Awarded Gamification Banner -->
              <div *ngIf="pointsAwarded()" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold animate-fadeIn flex items-center justify-between">
                <span>🏆 Footprint Hardened! +150 Points awarded to your dashboard.</span>
                <a routerLink="/dashboard" class="underline hover:text-amber-400">Dashboard →</a>
              </div>

              <!-- Score Cards Row -->
              <div class="grid grid-cols-3 gap-3">
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                  <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{{ locale.t('m4.risk_score') }}</span>
                  <span class="text-lg font-mono font-bold" [ngClass]="getRiskColor(report()?.exposure_risk_score || 0)">
                    {{ report()?.exposure_risk_score }} <span class="text-xs text-slate-400">/ 100</span>
                  </span>
                </div>

                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                  <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{{ locale.t('m4.resilience_score') }}</span>
                  <span class="text-lg font-mono font-bold" [ngClass]="getScoreColor(report()?.hygiene_resilience_score || 0)">
                    {{ report()?.hygiene_resilience_score }} <span class="text-xs text-slate-400">/ 100</span>
                  </span>
                </div>

                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                  <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{{ locale.t('m4.total_redactions') }}</span>
                  <span class="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {{ report()?.total_redactions }} <span class="text-xs text-slate-400">items</span>
                  </span>
                </div>
              </div>

              <!-- Discovered PII Badges -->
              <div class="flex flex-col gap-2">
                <span class="text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400 font-semibold">
                  {{ locale.t('m4.discovered_pii') }}
                </span>

                <div class="flex flex-wrap items-center gap-2">
                  <ng-container *ngIf="hasPiiFindings()">
                    <span
                      *ngFor="let item of getPiiEntries()"
                      class="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
                      [ngClass]="getPiiBadgeClass(item.key)">
                      <span>{{ item.key }}</span>
                      <span class="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-900/60 text-[10px]">{{ item.value }}</span>
                    </span>
                  </ng-container>
                  <span *ngIf="!hasPiiFindings()" class="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    ✓ Clean footprint: No high-risk PII identifiers detected.
                  </span>
                </div>
              </div>

              <!-- Attacker Pretext Warning Preview -->
              <div class="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-500/40 flex flex-col gap-2">
                <div class="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 dark:text-[#F9A81C] uppercase tracking-wider">
                  <span>⚠</span>
                  <span>{{ locale.t('m4.pretext_warning') }}</span>
                </div>
                <p class="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                  {{ report()?.simulated_attacker_pretext }}
                </p>
              </div>

              <!-- DLP Remediated Profile -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-mono uppercase text-emerald-600 dark:text-[#84AA40] font-semibold">
                    {{ locale.t('m4.sanitized_profile') }}
                  </span>
                  <span class="text-[10px] font-mono text-slate-500">Automatic Scrubbing Active</span>
                </div>

                <div class="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono text-emerald-800 dark:text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                  {{ report()?.dlp_remediated_profile }}
                </div>
              </div>

              <!-- Remediation Checklist -->
              <div *ngIf="report()?.remediation_checklist?.length" class="flex flex-col gap-1.5">
                <span class="text-[11px] font-mono uppercase text-slate-600 dark:text-slate-400 font-semibold">
                  {{ locale.t('m4.remediation_checklist') }}
                </span>
                <ul class="flex flex-col gap-1.5">
                  <li
                    *ngFor="let step of report()?.remediation_checklist"
                    class="text-xs font-sans text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 flex items-start gap-2">
                    <span class="text-emerald-600 dark:text-[#84AA40] font-mono font-bold text-xs">✓</span>
                    <span>{{ step }}</span>
                  </li>
                </ul>
              </div>

              <!-- Citations -->
              <div *ngIf="report()?.citations?.length" class="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <span class="text-[10px] font-mono text-slate-500">{{ locale.t('m4.citations') }}:</span>
                <span
                  *ngFor="let cite of report()?.citations"
                  class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {{ cite }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class M4OsintLabComponent implements OnInit {
  private http = inject(HttpClient);
  public auth = inject(AuthService);
  public locale = inject(LocaleService);
  public theme = inject(ThemeService);

  bioInput = `Senior SCADA Grid Engineer at PSE Warsaw. Direct mobile: +48 601 234 567, corporate email: j.kowalski@pse-grid.pl. Photo EXIF: 52.2297° N, 21.0122° E. Reimbursement IBAN: PL61 1090 1014 0000 0712 1981 2874.`;
  isAnalyzing = signal<boolean>(false);
  report = signal<OSINTExposureReport | null>(null);
  hygieneScore = signal<number>(65.0);
  pointsAwarded = signal<boolean>(false);

  ngOnInit(): void {
    this.runAnalysis();
  }

  loadPreset(type: 'scada' | 'it' | 'hardened'): void {
    if (type === 'scada') {
      this.bioInput = `Senior SCADA Grid Engineer at PSE Warsaw. Direct mobile: +48 601 234 567, corporate email: j.kowalski@pse-grid.pl. Photo EXIF: 52.2297° N, 21.0122° E. Reimbursement IBAN: PL61 1090 1014 0000 0712 1981 2874.`;
    } else if (type === 'it') {
      this.bioInput = `Cloud Infrastructure Admin at InfoCorp Poland. Contact: p.nowak@infocorp.pl, Mobile: +48 502 999 111. Working from Warsaw Central substation hub.`;
    } else {
      this.bioInput = `Cybersecurity researcher and systems analyst at municipal energy consortium. Inquiries via corporate ticketing desk. No direct personal identifiers disclosed.`;
    }
  }

  runAnalysis(): void {
    if (!this.bioInput.trim()) return;

    this.isAnalyzing.set(true);
    this.pointsAwarded.set(false);
    const body = {
      user_id: this.auth.currentUser()?.id || 'demo_user',
      public_bio_and_posts: this.bioInput
    };

    this.http.post<OSINTExposureReport>('/api/v1/modules/m4-osint/analyze', body).subscribe({
      next: (res) => {
        this.report.set(res);
        this.hygieneScore.set(res.hygiene_resilience_score);
        this.isAnalyzing.set(false);

        const user = this.auth.currentUser();
        if (user && res.hygiene_resilience_score >= 70) {
          this.http.post(`/api/v1/users/${user.id}/modules/m4_osint_lab/complete`, {
            module_id: 'm4_osint_lab',
            score: res.hygiene_resilience_score,
            takeaway: 'Scrubbed PII footprint and verified automated DLP sanitization.'
          }).subscribe({
            next: () => this.pointsAwarded.set(true),
            error: () => {}
          });
        }
      },
      error: (err) => {
        console.error('Failed to analyze OSINT footprint:', err);
        // Fallback simulation
        const pii: { [key: string]: number } = {};
        if (this.bioInput.includes('@')) pii['EMAIL'] = 1;
        if (this.bioInput.includes('+48')) pii['PHONE'] = 1;
        if (this.bioInput.includes('PL') || this.bioInput.includes('IBAN')) pii['IBAN'] = 1;
        if (this.bioInput.includes('°')) pii['GPS_EXIF'] = 1;

        const totalRedactions = Object.values(pii).reduce((a, b) => a + b, 0);
        const risk = Math.min(100.0, 20.0 * totalRedactions);
        const hygiene = Math.max(15.0, 100.0 - (15.0 * totalRedactions));

        let sanitized = this.bioInput
          .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]')
          .replace(/\+48\s?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/g, '[REDACTED_PHONE]')
          .replace(/PL\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/g, '[REDACTED_IBAN]')
          .replace(/\d+\.\d+°\s?[N|S],\s?\d+\.\d+°\s?[E|W]/g, '[REDACTED_GPS_EXIF]');

        this.hygieneScore.set(hygiene);
        this.report.set({
          adk_pipeline_name: 'm4_osint_recon_and_dlp_pipeline',
          exposure_risk_score: risk,
          hygiene_resilience_score: hygiene,
          discovered_pii_counts: pii,
          total_redactions: totalRedactions,
          simulated_attacker_pretext: 'Attacker Pretext Preview: Combines your leaked role + GPS EXIF coordinates + mobile number to send an urgent SMS impersonating regional substation dispatch.',
          dlp_remediated_profile: sanitized,
          remediation_checklist: [
            'Strip GPS EXIF tags automatically prior to social media uploads',
            'Remove direct mobile numbers and IBAN strings from public profiles',
            'Replace personal email addresses in public repositories with role aliases'
          ],
          citations: ['NIST-SP-800-63-4', 'ENISA-THREAT-LANDSCAPE-2025']
        });
        this.isAnalyzing.set(false);
      }
    });
  }

  hasPiiFindings(): boolean {
    const report = this.report();
    return !!(report && Object.keys(report.discovered_pii_counts).length > 0);
  }

  getPiiEntries(): Array<{ key: string; value: number }> {
    const counts = this.report()?.discovered_pii_counts || {};
    return Object.entries(counts).map(([key, value]) => ({ key, value }));
  }

  getPiiBadgeClass(type: string): string {
    switch (type) {
      case 'EMAIL':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40';
      case 'PHONE':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40';
      case 'IBAN':
        return 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/40';
      case 'GPS_EXIF':
        return 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
    }
  }

  getRiskColor(risk: number): string {
    if (risk >= 60) return 'text-red-500 dark:text-red-400';
    if (risk >= 30) return 'text-amber-600 dark:text-[#F9A81C]';
    return 'text-emerald-600 dark:text-[#84AA40]';
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-600 dark:text-[#84AA40]';
    if (score >= 50) return 'text-amber-600 dark:text-[#F9A81C]';
    return 'text-red-500 dark:text-red-400';
  }
}
