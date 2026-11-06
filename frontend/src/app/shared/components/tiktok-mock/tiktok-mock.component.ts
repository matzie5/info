import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlaybackService } from '../../../core/audio/audio-playback.service';

@Component({
  selector: 'app-tiktok-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black text-white font-sans border-4 border-slate-900 relative aspect-[9/16] select-none flex flex-col justify-between">
      <!-- Top Status Bar & Feed Switcher -->
      <div class="pt-3 px-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent pb-6">
        <span class="text-xs font-semibold text-slate-400">LIVE</span>
        <div class="flex items-center gap-4 text-sm font-bold">
          <span class="text-slate-400 cursor-pointer">Znajomi</span>
          <span class="text-white border-b-2 border-white pb-0.5 cursor-pointer">Dla Ciebie</span>
        </div>
        <span class="text-base cursor-pointer">🔍</span>
      </div>

      <!-- Center Video Canvas Simulation -->
      <div
        class="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-rose-950 flex items-center justify-center cursor-pointer"
        (click)="toggleSound()">
        <div class="text-center p-6 flex flex-col items-center gap-3">
          <div
            class="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-3xl transition transform active:scale-90"
            [ngClass]="audioService.isPlaying() ? 'animate-pulse' : ''">
            <span *ngIf="!audioService.isPlaying() || audioService.currentUrl() !== mediaUrl">▶</span>
            <span *ngIf="audioService.isPlaying() && audioService.currentUrl() === mediaUrl">⏸</span>
          </div>
          <div class="text-xs font-mono uppercase tracking-wider text-slate-300 bg-black/40 px-3 py-1 rounded-full border border-white/10">
            {{ audioService.isPlaying() ? 'Odtwarzanie audio (Klon głosu)...' : 'Kliknij aby odtworzyć wideo i dźwięk' }}
          </div>
        </div>
      </div>

      <!-- Right Action Stack -->
      <div class="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
        <!-- Author Profile Icon with + Badge -->
        <div class="relative cursor-pointer">
          <div class="w-11 h-11 rounded-full border-2 border-white bg-slate-700 overflow-hidden flex items-center justify-center text-sm font-bold">
            <span *ngIf="!authorAvatar">🤖</span>
            <img *ngIf="authorAvatar" [src]="authorAvatar" class="w-full h-full object-cover" alt="avatar" />
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            +
          </div>
        </div>

        <!-- Heart / Like -->
        <div class="flex flex-col items-center cursor-pointer" (click)="liked.set(!liked())">
          <div class="text-2xl transition transform active:scale-125" [ngClass]="liked() ? 'text-rose-500' : 'text-white'">
            ♥
          </div>
          <span class="text-[11px] font-semibold text-slate-200">142.8K</span>
        </div>

        <!-- Comments -->
        <div class="flex flex-col items-center cursor-pointer" (click)="commentsOpen.set(!commentsOpen())">
          <div class="text-2xl text-white">💬</div>
          <span class="text-[11px] font-semibold text-slate-200">3,421</span>
        </div>

        <!-- Bookmark -->
        <div class="flex flex-col items-center cursor-pointer">
          <div class="text-2xl text-white">★</div>
          <span class="text-[11px] font-semibold text-slate-200">18.5K</span>
        </div>

        <!-- Share -->
        <div class="flex flex-col items-center cursor-pointer">
          <div class="text-2xl text-white">➦</div>
          <span class="text-[11px] font-semibold text-slate-200">52.9K</span>
        </div>

        <!-- Spinning Vinyl Record -->
        <div
          class="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-xs shadow-lg"
          [ngClass]="audioService.isPlaying() ? 'animate-spin' : ''"
          style="animation-duration: 4s;">
          📀
        </div>
      </div>

      <!-- Bottom Caption Overlay -->
      <div class="px-4 pb-4 z-20 bg-gradient-to-t from-black via-black/70 to-transparent pt-12 flex flex-col gap-1.5 max-w-[80%]">
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm tracking-wide">{{ authorHandle || '@wroc_alert_24' }}</span>
          <span *ngIf="verified" class="text-sky-400 text-xs">✓</span>
        </div>

        <p class="text-xs text-slate-100 leading-snug line-clamp-3 select-text">
          {{ content }}
        </p>

        <!-- Sound Info ticker -->
        <div class="flex items-center gap-2 text-[11px] text-slate-300 mt-1 cursor-pointer" (click)="toggleSound()">
          <span>🎵</span>
          <span class="truncate">Dźwięk oryginalny - {{ author }} (Klon AI)</span>
        </div>
      </div>

      <!-- Slide-Up Comments Drawer -->
      <div
        *ngIf="commentsOpen()"
        class="absolute inset-x-0 bottom-0 h-3/5 bg-slate-900/95 backdrop-blur-md rounded-t-3xl border-t border-slate-700 z-30 p-4 flex flex-col justify-between shadow-2xl">
        <div>
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Komentarze (3,421)</span>
            <span class="cursor-pointer text-slate-400 text-sm font-bold" (click)="commentsOpen.set(false)">✕</span>
          </div>

          <div class="flex flex-col gap-3 py-3 overflow-y-auto max-h-[170px] text-xs">
            <div class="flex gap-2.5">
              <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">🤖</span>
              <div>
                <span class="font-semibold text-slate-400">&#64;bot_user_882</span>
                <p class="text-slate-200">To prawda! Moja mama dzwoniła do sekretariatu we Wrocławiu i potwierdzili!</p>
              </div>
            </div>
            <div class="flex gap-2.5">
              <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">🕵️</span>
              <div>
                <span class="font-semibold text-slate-400">&#64;detektyw_szkolny</span>
                <p class="text-amber-300">Fake! W Librusie nie ma żadnej wiadomości, a głos dyrektora brzmi nienaturalnie.</p>
              </div>
            </div>
            <div class="flex gap-2.5">
              <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">🤖</span>
              <div>
                <span class="font-semibold text-slate-400">&#64;szkola_wroc_fan</span>
                <p class="text-slate-200">Sprawdzajcie link w opisie profilu, tam jest cała lista odwołanych lekcji!</p>
              </div>
            </div>
          </div>
        </div>

        <div class="text-[11px] text-center text-slate-400 py-1 border-t border-slate-800">
          Zwróć uwagę na podejrzane konta botów!
        </div>
      </div>
    </div>

    <!-- Red Flags Tagging Bar -->
    <div *ngIf="redFlags && redFlags.length > 0" class="w-full max-w-sm mx-auto mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
        <span>🚩 Zdemaskuj podejrzane cechy:</span>
        <span class="text-emerald-600 font-mono">{{ selectedFlags.size }}/{{ redFlags.length }}</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          *ngFor="let flag of redFlags"
          type="button"
          (click)="toggleFlag(flag)"
          [ngClass]="selectedFlags.has(flag) ? 'bg-rose-500 text-white border-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'"
          class="text-xs px-2.5 py-1.5 rounded-lg border font-medium transition text-left flex items-center gap-1">
          <span>{{ selectedFlags.has(flag) ? '✓' : '⚠' }}</span>
          <span>{{ flag }}</span>
        </button>
      </div>
    </div>
  `
})
export class TikTokMockComponent {
  @Input() author: string = 'Wrocław_Alert';
  @Input() authorHandle: string = '@wroc_alert_24';
  @Input() authorAvatar: string = '';
  @Input() verified: boolean = false;
  @Input() content: string = '';
  @Input() mediaUrl: string = '';
  @Input() redFlags: string[] = [];

  @Output() flagSelected = new EventEmitter<string[]>();

  audioService = inject(AudioPlaybackService);
  liked = signal<boolean>(false);
  commentsOpen = signal<boolean>(false);
  selectedFlags = new Set<string>();

  toggleSound(): void {
    if (this.mediaUrl) {
      this.audioService.toggle(this.mediaUrl);
    }
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
