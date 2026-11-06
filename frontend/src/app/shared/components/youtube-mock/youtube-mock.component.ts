import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlaybackService } from '../../../core/audio/audio-playback.service';

@Component({
  selector: 'app-youtube-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-white font-sans">
      <!-- YouTube Top Bar -->
      <div class="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <div class="w-7 h-5 bg-red-600 rounded-md flex items-center justify-center text-white text-[10px]">▶</div>
          <span class="font-bold tracking-tighter text-lg font-sans">YouTube</span>
          <span class="text-[10px] text-slate-400 font-semibold -ml-1">PL</span>
        </div>

        <div class="hidden sm:flex items-center w-1/2 border border-slate-300 dark:border-slate-700 rounded-full overflow-hidden">
          <input
            type="text"
            readonly
            value="Wrocław Roblox Magnolia kody darmowe"
            class="w-full px-4 py-1.5 text-xs bg-transparent outline-none text-slate-600 dark:text-slate-300" />
          <button class="px-4 bg-slate-100 dark:bg-slate-800 border-l border-slate-300 dark:border-slate-700 py-1.5 text-xs">
            🔍
          </button>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-sm cursor-pointer">🔔</span>
          <span class="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">K</span>
        </div>
      </div>

      <!-- Video Player Canvas Simulation -->
      <div class="relative aspect-video bg-black flex flex-col justify-between overflow-hidden group cursor-pointer" (click)="toggleAudio()">
        <!-- Center Overlay -->
        <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-transparent to-black/40">
          <button
            type="button"
            class="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center text-2xl shadow-xl transition transform group-hover:scale-110">
            <span *ngIf="!audioService.isPlaying() || audioService.currentUrl() !== mediaUrl">▶</span>
            <span *ngIf="audioService.isPlaying() && audioService.currentUrl() === mediaUrl">⏸</span>
          </button>
        </div>

        <!-- Video Badge -->
        <div class="p-3 z-10 flex justify-between items-start">
          <span class="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            PREMIERA WIDEO
          </span>
          <span class="text-xs bg-black/60 px-2 py-1 rounded text-slate-300 font-mono">
            {{ audioService.isPlaying() ? 'AI Voice Clone Active' : 'Kliknij aby odtworzyć wideo' }}
          </span>
        </div>

        <!-- Player Controls Bar -->
        <div class="p-3 z-10 bg-gradient-to-t from-black to-transparent flex flex-col gap-1.5">
          <!-- Red Progress Line -->
          <div class="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div class="h-full bg-red-600 transition-all duration-100" [style.width.%]="audioService.progressPercent()"></div>
          </div>
          <div class="flex items-center justify-between text-xs text-white">
            <div class="flex items-center gap-3">
              <span>{{ audioService.isPlaying() ? '⏸' : '▶' }}</span>
              <span class="font-mono text-[11px]">{{ formatTime(audioService.currentTime()) }} / 0:05</span>
              <span>🔊</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span>⚙️</span>
              <span>[ ]</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Video Info & Channel Details -->
      <div class="p-4 flex flex-col gap-3">
        <h2 class="text-base font-bold leading-snug">
          {{ title }}
        </h2>

        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold">
              <span>🎮</span>
            </div>
            <div>
              <div class="text-sm font-bold flex items-center gap-1">
                <span>{{ author }}</span>
                <span class="text-xs text-slate-400" title="Niezweryfikowany">⚠️</span>
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">240 tys. subskrybentów</div>
            </div>
            <button class="ml-2 px-3.5 py-1.5 rounded-full bg-red-600 text-white font-bold text-xs hover:bg-red-700">
              Subskrybuj
            </button>
          </div>

          <!-- Interaction Buttons -->
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold overflow-hidden">
              <button class="px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1">
                <span>👍</span>
                <span>45 tys.</span>
              </button>
              <button class="px-2.5 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 border-l border-slate-300 dark:border-slate-700">
                👎
              </button>
            </div>
            <button class="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold">
              ↪ Udostępnij
            </button>
          </div>
        </div>

        <!-- Description Box -->
        <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs flex flex-col gap-1.5 select-text">
          <div class="font-bold text-slate-600 dark:text-slate-300">128 412 wyświetleń • Opublikowano dzisiaj</div>
          <p class="text-slate-700 dark:text-slate-200 leading-relaxed">{{ content }}</p>
          <div class="text-red-500 dark:text-red-400 font-mono font-semibold underline mt-1">
            👉 https://magnolia-event-robux.xyz/odbierz-prezent
          </div>
        </div>
      </div>

      <!-- Red Flags Tagging Bar -->
      <div *ngIf="redFlags && redFlags.length > 0" class="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span>🚩 Wskaż manipulacje i zagrożenia:</span>
          <span class="text-emerald-600 font-mono">{{ selectedFlags.size }}/{{ redFlags.length }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let flag of redFlags"
            type="button"
            (click)="toggleFlag(flag)"
            [ngClass]="selectedFlags.has(flag) ? 'bg-red-600 text-white border-red-700' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'"
            class="text-xs px-2.5 py-1.5 rounded-lg border font-medium transition text-left flex items-center gap-1.5 shadow-2xs">
            <span>{{ selectedFlags.has(flag) ? '✓' : '⚠' }}</span>
            <span>{{ flag }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class YouTubeMockComponent {
  @Input() author: string = 'MasterGamer';
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() mediaUrl: string = '';
  @Input() redFlags: string[] = [];

  @Output() flagSelected = new EventEmitter<string[]>();

  audioService = inject(AudioPlaybackService);
  selectedFlags = new Set<string>();

  toggleAudio(): void {
    if (this.mediaUrl) {
      this.audioService.toggle(this.mediaUrl);
    }
  }

  formatTime(sec: number): string {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
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
