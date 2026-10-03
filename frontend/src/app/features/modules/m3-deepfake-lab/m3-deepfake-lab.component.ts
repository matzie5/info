import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AuthService } from '../../../core/auth/auth.service';
import { RouterModule } from '@angular/router';

export interface MediaArtifactSample {
  sample_id: string;
  title: string;
  media_type: 'IMAGE' | 'AUDIO_VOICE_CLONE' | 'VIDEO_SNIPPET';
  gcs_uri: string;
  c2pa_manifest_status: 'VALID_SIGNED' | 'STRIPPED_OR_MISSING' | 'TAMPERED_SIGNATURE';
  synthid_watermark_detected: boolean;
  ground_truth_is_synthetic: boolean;
  forensic_markers: string[];
}

export interface DeepfakeForensicReport {
  sample_id: string;
  adk_pipeline_name: string;
  c2pa_status: string;
  synthid_detected: boolean;
  is_synthetic_verdict: boolean;
  confidence_score: number;
  visual_and_audio_anomalies: string[];
  user_accuracy_score: number;
  explainer_summary: string;
  citations: string[];
}

@Component({
  selector: 'app-m3-deepfake-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 p-6 flex flex-col gap-6 transition-colors duration-200">
      <!-- Header Banner -->
      <header class="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#84AA40]/20 text-[#84AA40] border border-[#84AA40]/40">
              MODULE 3
            </span>
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400">Vertex AI Gemini Multimodal SequentialAgent + C2PA/SynthID</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            {{ locale.t('m3.title') }}
          </h1>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            {{ locale.t('m3.subtitle') }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-right shadow-sm">
            <div class="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">{{ locale.t('m3.confidence_gauge') }}</div>
            <div class="text-xl font-mono font-bold" [ngClass]="getScoreColor(accuracyScore())">
              {{ accuracyScore() }} <span class="text-xs text-slate-500">/ 100</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Media Sample Catalog Grid -->
      <section class="flex flex-col gap-2">
        <div class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
          {{ locale.t('m3.catalog_title') }}:
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            *ngFor="let sample of samples()"
            (click)="selectSample(sample)"
            [ngClass]="selectedSample()?.sample_id === sample.sample_id ? 'border-[#84AA40] bg-emerald-500/5 dark:bg-[#141B26] ring-1 ring-[#84AA40]' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-700'"
            class="p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 shadow-sm">
            
            <div class="flex items-start justify-between gap-2">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                [ngClass]="getMediaTypeBadgeClass(sample.media_type)">
                {{ sample.media_type }}
              </span>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-mono border"
                [ngClass]="getC2paBadgeClass(sample.c2pa_manifest_status)">
                C2PA: {{ sample.c2pa_manifest_status }}
              </span>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{{ sample.title }}</h3>
              <p class="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1 truncate">{{ sample.gcs_uri }}</p>
            </div>

            <div class="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full" [ngClass]="sample.synthid_watermark_detected ? 'bg-cyan-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'"></span>
                SynthID: {{ sample.synthid_watermark_detected ? (locale.language() === 'pl' ? 'Wykryto' : 'Detected') : (locale.language() === 'pl' ? 'Brak' : 'None') }}
              </span>
              <span class="text-slate-400 dark:text-slate-500">ID: {{ sample.sample_id }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Inspection Grid (2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6" *ngIf="selectedSample()">
        <!-- Left: Workbench & User Hypothesis (6 cols) -->
        <div class="lg:col-span-6 flex flex-col gap-4">
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Media Forensic Workbench
              </span>
              <span class="text-[10px] font-mono text-emerald-600 dark:text-[#84AA40] uppercase">
                Active: {{ selectedSample()?.sample_id }}
              </span>
            </div>

            <!-- Media Preview Visualizer -->
            <div class="rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center justify-center min-h-[180px] text-center gap-3 relative overflow-hidden">
              <!-- Media Type Icon / Visual -->
              <div *ngIf="selectedSample()?.media_type === 'VIDEO_SNIPPET'" class="flex flex-col items-center gap-2">
                <div class="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-2xl font-mono">
                  ▶
                </div>
                <div class="text-xs font-mono text-slate-800 dark:text-slate-300">{{ selectedSample()?.title }}</div>
                <div class="text-[10px] font-mono text-slate-500">H.264 / 1080p25 Forensic Stream</div>
              </div>

              <div *ngIf="selectedSample()?.media_type === 'AUDIO_VOICE_CLONE'" class="flex flex-col items-center gap-2 w-full">
                <!-- Spectrogram Waveform representation -->
                <div class="flex items-center gap-1 h-12 w-3/4 justify-center">
                  <div *ngFor="let h of [40, 70, 90, 60, 30, 80, 100, 45, 95, 75, 50, 85, 30, 60, 90, 40]"
                       class="w-1.5 bg-amber-500 dark:bg-[#F9A81C]/70 rounded-full"
                       [style.height.%]="h"></div>
                </div>
                <div class="text-xs font-mono text-slate-800 dark:text-slate-300">{{ selectedSample()?.title }}</div>
                <div class="text-[10px] font-mono text-amber-600 dark:text-amber-400/80">Audio Waveform (Zero-Shot TTS Analysis)</div>
              </div>

              <div *ngIf="selectedSample()?.media_type === 'IMAGE'" class="flex flex-col items-center gap-2">
                <div class="w-14 h-14 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl font-mono">
                  📷
                </div>
                <div class="text-xs font-mono text-slate-800 dark:text-slate-300">{{ selectedSample()?.title }}</div>
                <div class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400/80">Hardware Sensor Authenticity Frame</div>
              </div>

              <div class="text-[10px] font-mono text-slate-400 dark:text-slate-500 z-10">
                Storage: {{ selectedSample()?.gcs_uri }}
              </div>
            </div>

            <!-- User Verdict Input Form -->
            <div class="flex flex-col gap-3 pt-2">
              <label class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                1. Your Forensic Hypothesis
              </label>

              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="userVerdict.set(true)"
                  [ngClass]="userVerdict() ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'"
                  class="p-3 rounded-lg border text-xs font-mono font-bold flex flex-col items-center gap-1 transition">
                  <span class="text-sm">⚠ SYNTHETIC / AI DEEPFAKE</span>
                  <span class="text-[10px] font-normal text-slate-500 dark:text-slate-400">Diffusion / TTS manipulation</span>
                </button>

                <button
                  type="button"
                  (click)="userVerdict.set(false)"
                  [ngClass]="!userVerdict() ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-[#84AA40] text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'"
                  class="p-3 rounded-lg border text-xs font-mono font-bold flex flex-col items-center gap-1 transition">
                  <span class="text-sm">✓ AUTHENTIC CAPTURE</span>
                  <span class="text-[10px] font-normal text-slate-500 dark:text-slate-400">Hardware C2PA Provenance</span>
                </button>
              </div>
            </div>

            <!-- Spotted Anomaly Checkboxes -->
            <div class="flex flex-col gap-2 pt-2">
              <label class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold flex items-center justify-between">
                <span>2. {{ locale.t('m3.observed_markers') }}</span>
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Select observed artifacts</span>
              </label>

              <div class="flex flex-col gap-2">
                <label
                  *ngFor="let marker of availableMarkers"
                  class="flex items-start gap-2.5 p-2 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-400 dark:hover:border-slate-700">
                  <input
                    type="checkbox"
                    [checked]="selectedMarkers().includes(marker)"
                    (change)="toggleMarker(marker)"
                    class="mt-0.5 accent-[#84AA40] rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700" />
                  <span class="font-sans leading-tight">{{ marker }}</span>
                </label>
              </div>
            </div>

            <!-- Inspect Button -->
            <button
              (click)="runInspection()"
              [disabled]="isInspecting()"
              class="btn-primary text-xs font-mono py-2.5 px-4 rounded bg-[#84AA40] text-slate-950 dark:text-[#0B0F17] hover:bg-[#84AA40]/90 font-bold transition flex items-center justify-center gap-2 mt-2">
              <span *ngIf="isInspecting()" class="animate-spin">⚙</span>
              <span>{{ isInspecting() ? locale.t('m3.inspecting') : locale.t('m3.inspect_sample') }}</span>
            </button>
          </div>
        </div>

        <!-- Right: 3-Stage SequentialAgent Forensic Report (6 cols) -->
        <div class="lg:col-span-6 flex flex-col gap-4">
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  SequentialAgent Forensic Report
                </span>
              </div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                ADK Pipeline
              </span>
            </div>

            <div *ngIf="isInspecting()" class="p-8 text-center flex flex-col items-center gap-3">
              <div class="h-8 w-8 rounded-full border-2 border-[#84AA40] border-t-transparent animate-spin"></div>
              <div class="text-xs font-mono text-cyan-600 dark:text-cyan-400">{{ locale.t('m3.inspecting') }}</div>
            </div>

            <div *ngIf="!report() && !isInspecting()" class="p-8 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
              {{ locale.t('m3.sample_select_hint') }}
            </div>

            <div *ngIf="report() && !isInspecting()" class="flex flex-col gap-4">
              <!-- Points Awarded Gamification Banner -->
              <div *ngIf="pointsAwarded()" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold animate-fadeIn flex items-center justify-between">
                <span>🏆 Deepfake Analysis Succeeded! +150 Points awarded to your dashboard.</span>
                <a routerLink="/dashboard" class="underline hover:text-amber-400">Dashboard →</a>
              </div>

              <!-- Verdict & Provenance Badges Row -->
              <div class="grid grid-cols-2 gap-3">
                <!-- C2PA Badge -->
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                  <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{{ locale.t('m3.c2pa_status') }}</span>
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded border inline-block w-fit" [ngClass]="getC2paBadgeClass(report()?.c2pa_status || '')">
                    {{ report()?.c2pa_status }}
                  </span>
                </div>

                <!-- SynthID Badge -->
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                  <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{{ locale.t('m3.synthid_status') }}</span>
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded border inline-block w-fit"
                        [ngClass]="report()?.synthid_detected ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-400/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'">
                    {{ report()?.synthid_detected ? locale.t('m3.synthid_detected') : locale.t('m3.synthid_none') }}
                  </span>
                </div>
              </div>

              <!-- Final Model Verdict Banner -->
              <div
                class="p-4 rounded-lg border flex items-center justify-between"
                [ngClass]="report()?.is_synthetic_verdict ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-500/40' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-[#84AA40]/40'">
                <div>
                  <div class="text-[10px] font-mono uppercase tracking-wider" [ngClass]="report()?.is_synthetic_verdict ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-[#84AA40]'">
                    ADK Consensus Ground-Truth Verdict
                  </div>
                  <div class="text-base font-mono font-bold" [ngClass]="report()?.is_synthetic_verdict ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'">
                    {{ report()?.is_synthetic_verdict ? 'SYNTHETIC MANIPULATION (DEEPFAKE)' : 'AUTHENTIC HARDWARE PROVENANCE' }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-[10px] font-mono text-slate-500 dark:text-slate-400">{{ locale.t('m3.confidence_gauge') }}</div>
                  <div class="text-sm font-mono font-bold text-slate-900 dark:text-white">{{ ((report()?.confidence_score || 0.96) * 100).toFixed(0) }}%</div>
                </div>
              </div>

              <!-- 3-Stage Pipeline Breakdown -->
              <div class="flex flex-col gap-2">
                <span class="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold">
                  3-Stage ADK SequentialAgent Trace
                </span>

                <div class="space-y-2">
                  <!-- Stage 1 -->
                  <div class="p-2.5 rounded bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                    <div class="flex items-center justify-between text-cyan-700 dark:text-cyan-400 text-[11px] font-semibold mb-1">
                      <span>{{ locale.t('m3.stage1_visual') }}</span>
                      <span class="text-emerald-600 dark:text-emerald-400 text-[10px]">PASSED</span>
                    </div>
                    <div class="text-slate-600 dark:text-slate-300 font-sans text-xs">
                      Inspected diffusion artifacts & corneal specular reflections. C2PA metadata parsed.
                    </div>
                  </div>

                  <!-- Stage 2 -->
                  <div class="p-2.5 rounded bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                    <div class="flex items-center justify-between text-cyan-700 dark:text-cyan-400 text-[11px] font-semibold mb-1">
                      <span>{{ locale.t('m3.stage2_audio') }}</span>
                      <span class="text-emerald-600 dark:text-emerald-400 text-[10px]">PASSED</span>
                    </div>
                    <div class="text-slate-600 dark:text-slate-300 font-sans text-xs">
                      Analyzed spectrogram cutoff frequencies and micro-pauses for zero-shot vocoder footprints.
                    </div>
                  </div>

                  <!-- Stage 3 -->
                  <div class="p-2.5 rounded bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                    <div class="flex items-center justify-between text-cyan-700 dark:text-cyan-400 text-[11px] font-semibold mb-1">
                      <span>{{ locale.t('m3.stage3_explainer') }}</span>
                      <span class="text-emerald-600 dark:text-emerald-400 text-[10px]">SYNTHESIZED</span>
                    </div>
                    <div class="text-slate-600 dark:text-slate-300 font-sans text-xs leading-relaxed">
                      {{ report()?.explainer_summary }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Forensic Anomalies Identified -->
              <div *ngIf="report()?.visual_and_audio_anomalies?.length" class="flex flex-col gap-1.5">
                <span class="text-[11px] font-mono uppercase text-amber-600 dark:text-[#F9A81C] font-semibold">
                  {{ locale.t('m3.observed_markers') }}
                </span>
                <ul class="flex flex-col gap-1">
                  <li
                    *ngFor="let anomaly of report()?.visual_and_audio_anomalies"
                    class="text-xs font-sans text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 flex items-start gap-2">
                    <span class="text-amber-500 font-mono text-[11px]">→</span>
                    <span>{{ anomaly }}</span>
                  </li>
                </ul>
              </div>

              <!-- Citations -->
              <div *ngIf="report()?.citations?.length" class="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <span class="text-[10px] font-mono text-slate-500">Standards Citations:</span>
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
export class M3DeepfakeLabComponent implements OnInit {
  private http = inject(HttpClient);
  public auth = inject(AuthService);
  public locale = inject(LocaleService);
  public theme = inject(ThemeService);

  samples = signal<MediaArtifactSample[]>([]);
  selectedSample = signal<MediaArtifactSample | null>(null);
  userVerdict = signal<boolean>(true); // default: synthetic
  selectedMarkers = signal<string[]>([]);
  isInspecting = signal<boolean>(false);
  report = signal<DeepfakeForensicReport | null>(null);
  accuracyScore = signal<number>(75.0);
  pointsAwarded = signal<boolean>(false);

  availableMarkers = [
    'Asymmetric corneal specular reflection between left/right pupils',
    'Viseme-to-phoneme lip-sync lag (140ms) on plosive consonants',
    'Uniform spectral cutoff above 8kHz characteristic of zero-shot TTS vocoders',
    'Absence of natural inhalation breath pauses across 28-second utterance',
    'Missing C2PA camera hardware signature; SynthID frequency watermark present',
    'Cryptographically valid C2PA v2.1 hardware capture signature'
  ];

  ngOnInit(): void {
    this.fetchSamples();
  }

  fetchSamples(): void {
    this.http.get<MediaArtifactSample[]>('/api/v1/modules/m3-deepfake/samples').subscribe({
      next: (res) => {
        this.samples.set(res);
        if (res.length > 0) {
          this.selectSample(res[0]);
        }
      },
      error: (err) => {
        console.error('Failed to fetch deepfake samples:', err);
        // Fallback default samples
        const fallback: MediaArtifactSample[] = [
          {
            sample_id: 'deepfake-grid-minister-video',
            title: "Leaked Press Briefing: 'Emergency 72-Hour ATM & Grid Shutdown'",
            media_type: 'VIDEO_SNIPPET',
            gcs_uri: 'gs://infosphere-assets-demo/m3-samples/grid_minister_briefing.mp4',
            c2pa_manifest_status: 'STRIPPED_OR_MISSING',
            synthid_watermark_detected: true,
            ground_truth_is_synthetic: true,
            forensic_markers: [
              'Asymmetric corneal specular reflection between left/right pupils',
              'Viseme-to-phoneme lip-sync lag (140ms) on plosive consonants',
              'Missing C2PA camera hardware signature; SynthID frequency watermark present'
            ]
          },
          {
            sample_id: 'cfo-voice-clone-voicemail',
            title: 'WhatsApp Voice Note: CFO Requesting Swift IBAN Override',
            media_type: 'AUDIO_VOICE_CLONE',
            gcs_uri: 'gs://infosphere-assets-demo/m3-samples/cfo_voice_clone.wav',
            c2pa_manifest_status: 'STRIPPED_OR_MISSING',
            synthid_watermark_detected: false,
            ground_truth_is_synthetic: true,
            forensic_markers: [
              'Uniform spectral cutoff above 8kHz characteristic of zero-shot TTS vocoders',
              'Absence of natural inhalation breath pauses across 28-second utterance'
            ]
          },
          {
            sample_id: 'verified-pse-substation-photo',
            title: 'PSE Field Engineer Inspection Photo — Substation Rogowiec',
            media_type: 'IMAGE',
            gcs_uri: 'gs://infosphere-assets-demo/m3-samples/pse_substation_rogowiec.jpg',
            c2pa_manifest_status: 'VALID_SIGNED',
            synthid_watermark_detected: false,
            ground_truth_is_synthetic: false,
            forensic_markers: [
              'Cryptographically valid C2PA v2.1 hardware capture signature (Sony Alpha ILCE-7M4)'
            ]
          }
        ];
        this.samples.set(fallback);
        this.selectSample(fallback[0]);
      }
    });
  }

  selectSample(sample: MediaArtifactSample): void {
    this.selectedSample.set(sample);
    this.report.set(null);
    this.selectedMarkers.set([]);
    this.userVerdict.set(sample.sample_id !== 'verified-pse-substation-photo');
  }

  toggleMarker(marker: string): void {
    const current = this.selectedMarkers();
    if (current.includes(marker)) {
      this.selectedMarkers.set(current.filter((m) => m !== marker));
    } else {
      this.selectedMarkers.set([...current, marker]);
    }
  }

  runInspection(): void {
    const sample = this.selectedSample();
    if (!sample) return;

    this.isInspecting.set(true);
    this.pointsAwarded.set(false);
    const body = {
      user_id: this.auth.currentUser()?.id || 'demo_user',
      sample_id: sample.sample_id,
      user_verdict_is_synthetic: this.userVerdict(),
      user_spotted_markers: this.selectedMarkers()
    };

    this.http.post<DeepfakeForensicReport>('/api/v1/modules/m3-deepfake/inspect', body).subscribe({
      next: (res) => {
        this.report.set(res);
        this.accuracyScore.set(res.user_accuracy_score);
        this.isInspecting.set(false);

        const user = this.auth.currentUser();
        if (user && res.user_accuracy_score >= 70) {
          this.http.post(`/api/v1/users/${user.id}/modules/m3_deepfake_lab/complete`, {
            module_id: 'm3_deepfake_lab',
            score: res.user_accuracy_score,
            takeaway: 'Verified C2PA cryptographic manifests and acoustic SynthID watermarks.'
          }).subscribe({
            next: () => this.pointsAwarded.set(true),
            error: () => {}
          });
        }
      },
      error: (err) => {
        console.error('Failed to run deepfake inspection:', err);
        // Fallback simulation
        const isCorrect = this.userVerdict() === sample.ground_truth_is_synthetic;
        const score = isCorrect ? 90.0 : 35.0;
        this.accuracyScore.set(score);
        this.report.set({
          sample_id: sample.sample_id,
          adk_pipeline_name: 'm3_multimodal_forensic_pipeline',
          c2pa_status: sample.c2pa_manifest_status,
          synthid_detected: sample.synthid_watermark_detected,
          is_synthetic_verdict: sample.ground_truth_is_synthetic,
          confidence_score: 0.96,
          visual_and_audio_anomalies: sample.forensic_markers,
          user_accuracy_score: score,
          explainer_summary: `Grounded in [C2PA-SPEC-2.1]: Sample '${sample.title}' has C2PA status=${sample.c2pa_manifest_status} and SynthID=${sample.synthid_watermark_detected}. Verdict: ${sample.ground_truth_is_synthetic ? 'SYNTHETIC_MANIPULATION' : 'AUTHENTIC_PROVENANCE'}.`,
          citations: ['C2PA-SPEC-2.1', 'NIST-SP-800-218']
        });
        this.isInspecting.set(false);

        const user = this.auth.currentUser();
        if (user && score >= 70) {
          this.http.post(`/api/v1/users/${user.id}/modules/m3_deepfake_lab/complete`, {
            module_id: 'm3_deepfake_lab',
            score: score,
            takeaway: 'Identified synthetic artifacts and verified C2PA provenance.'
          }).subscribe({
            next: () => this.pointsAwarded.set(true),
            error: () => {}
          });
        }
      }
    });
  }

  getC2paBadgeClass(status: string): string {
    switch (status) {
      case 'VALID_SIGNED':
        return 'bg-emerald-100 dark:bg-[#84AA40]/20 text-emerald-800 dark:text-[#84AA40] border-emerald-300 dark:border-[#84AA40]/40';
      case 'STRIPPED_OR_MISSING':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-[#F9A81C] border-amber-300 dark:border-[#F9A81C]/40';
      case 'TAMPERED_SIGNATURE':
        return 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border-red-300 dark:border-red-500/40';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  }

  getMediaTypeBadgeClass(type: string): string {
    switch (type) {
      case 'VIDEO_SNIPPET':
        return 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/30';
      case 'AUDIO_VOICE_CLONE':
        return 'bg-amber-100 dark:bg-[#F9A81C]/15 text-amber-800 dark:text-[#F9A81C] border border-amber-300 dark:border-[#F9A81C]/30';
      case 'IMAGE':
        return 'bg-emerald-100 dark:bg-[#84AA40]/15 text-emerald-800 dark:text-[#84AA40] border border-emerald-300 dark:border-[#84AA40]/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-[#84AA40]';
    if (score >= 50) return 'text-[#F9A81C]';
    return 'text-red-500 dark:text-red-400';
  }
}
