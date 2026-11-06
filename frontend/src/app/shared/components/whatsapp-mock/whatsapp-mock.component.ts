import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlaybackService } from '../../../core/audio/audio-playback.service';

@Component({
  selector: 'app-whatsapp-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-[#E5DDD5] dark:bg-[#0c1317] font-sans transition-all">
      <!-- WhatsApp Top Header -->
      <div class="bg-[#075E54] dark:bg-[#1f2c34] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div class="flex items-center gap-3">
          <div class="text-lg opacity-80 cursor-pointer">‹</div>
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold overflow-hidden">
              <span *ngIf="!authorAvatar">👤</span>
              <img *ngIf="authorAvatar" [src]="authorAvatar" class="w-full h-full object-cover" alt="avatar" />
            </div>
            <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#075E54]"></div>
          </div>
          <div>
            <div class="font-semibold text-sm leading-tight flex items-center gap-1.5">
              <span>{{ author }}</span>
              <span *ngIf="verified" class="text-emerald-300 text-xs">✓</span>
            </div>
            <div class="text-[11px] text-emerald-100 dark:text-slate-400">
              {{ authorHandle || 'dzisiaj o 14:22' }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4 text-emerald-100 text-lg">
          <span class="cursor-pointer hover:text-white" title="Wideo">📹</span>
          <span class="cursor-pointer hover:text-white" title="Zadzwoń">📞</span>
          <span class="cursor-pointer hover:text-white" title="Więcej">⋮</span>
        </div>
      </div>

      <!-- Safety Notice Pill -->
      <div class="bg-amber-100 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800 px-4 py-2 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span>⚠️</span>
          <span>Ten nadawca nie znajduje się na liście Twoich kontaktów.</span>
        </div>
        <div class="flex gap-2">
          <button class="px-2 py-0.5 rounded bg-white dark:bg-slate-800 font-semibold shadow-xs">Blokuj</button>
          <button class="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold">Dodaj</button>
        </div>
      </div>

      <!-- Chat Canvas Body -->
      <div class="p-4 flex flex-col gap-3 min-h-[340px] justify-end" style="background-image: radial-gradient(#d1d7db 1px, transparent 1px); background-size: 20px 20px;">
        <!-- Timestamp Pill -->
        <div class="text-center my-1">
          <span class="px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 shadow-xs uppercase font-medium">
            Dzisiaj
          </span>
        </div>

        <!-- Forwarded Tag -->
        <div class="flex justify-start">
          <div class="max-w-[85%] bg-white dark:bg-[#1f2c34] rounded-lg rounded-tl-none p-3 shadow-sm border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col gap-2">
            <div class="text-[11px] italic text-slate-400 flex items-center gap-1">
              <span>↪</span>
              <span>Przekazana wielokrotnie</span>
            </div>

            <!-- Voice Note Player if Audio -->
            <div *ngIf="mediaUrl && (mediaType === 'AUDIO' || mediaUrl.includes('.mp3') || mediaUrl.includes('.wav'))" class="bg-emerald-50 dark:bg-slate-800/80 rounded-xl p-3 border border-emerald-200 dark:border-slate-700 flex flex-col gap-2">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  (click)="toggleAudio()"
                  class="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-xl shadow-md transition transform active:scale-95">
                  <span *ngIf="!audioService.isPlaying() || audioService.currentUrl() !== mediaUrl">▶</span>
                  <span *ngIf="audioService.isPlaying() && audioService.currentUrl() === mediaUrl">⏸</span>
                </button>

                <!-- Waveform Bar -->
                <div class="flex-1 flex flex-col gap-1">
                  <div class="flex items-center gap-1 h-8 w-full cursor-pointer" (click)="seekAudio($event)">
                    <div
                      *ngFor="let bar of waveformHeights; let idx = index"
                      class="flex-1 rounded-full transition-all duration-150"
                      [style.height.%]="bar"
                      [ngClass]="getBarClass(idx)"></div>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{{ formatTime(audioService.currentTime()) }}</span>
                    <span>🎙️ Wiadomość głosowa (0:06)</span>
                  </div>
                </div>

                <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-xs">
                  👤
                </div>
              </div>
            </div>

            <!-- Text Content -->
            <p class="text-sm leading-relaxed select-text" [ngClass]="{'font-semibold text-base': isSenior}">
              {{ content }}
            </p>

            <div class="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1">
              <span>14:24</span>
              <span class="text-sky-500 font-bold">✓✓</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive Red Flags Tagging Bar -->
      <div *ngIf="redFlags && redFlags.length > 0" class="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span>🚩 Kliknij podejrzane elementy wiadomości:</span>
          <span class="text-emerald-600 font-mono">{{ selectedFlags.size }}/{{ redFlags.length }} zaznaczone</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let flag of redFlags"
            type="button"
            (click)="toggleFlag(flag)"
            [ngClass]="selectedFlags.has(flag) ? 'bg-red-500 text-white border-red-600 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'"
            class="text-xs px-2.5 py-1.5 rounded-lg border font-medium transition text-left flex items-center gap-1.5">
            <span>{{ selectedFlags.has(flag) ? '✓' : '⚠' }}</span>
            <span>{{ flag }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class WhatsAppMockComponent {
  @Input() author: string = 'Wnuczek';
  @Input() authorHandle: string = '+48 71 892 11 02';
  @Input() authorAvatar: string = '';
  @Input() verified: boolean = false;
  @Input() content: string = '';
  @Input() mediaUrl: string = '';
  @Input() mediaType: string = 'AUDIO';
  @Input() redFlags: string[] = [];
  @Input() isSenior: boolean = false;

  @Output() flagSelected = new EventEmitter<string[]>();

  audioService = inject(AudioPlaybackService);
  selectedFlags = new Set<string>();

  waveformHeights = [30, 65, 90, 45, 80, 100, 75, 40, 85, 95, 60, 30, 70, 85, 40, 20];

  toggleAudio(): void {
    if (this.mediaUrl) {
      this.audioService.toggle(this.mediaUrl);
    }
  }

  seekAudio(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    this.audioService.seek(percent);
  }

  getBarClass(idx: number): string {
    const thresholdIdx = Math.floor((this.audioService.progressPercent() / 100) * this.waveformHeights.length);
    if (idx <= thresholdIdx && this.audioService.isPlaying()) {
      return 'bg-emerald-600 dark:bg-emerald-400';
    }
    return 'bg-slate-300 dark:bg-slate-600';
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  toggleFlag(flag: string): void {
    if (this.selectedFlags.has(flag)) {
      this.selectedFlags.delete(flag);
    } else {
      this.selectedFlags.add(flag);
    }
    this.flagSelected.emit(Array.from(this.selectedFlags));
  }
}
