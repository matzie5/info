// frontend/src/app/shared/components/youtube-mock/youtube-mock.component.ts
import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AudioPlaybackService } from '../../../core/audio/audio-playback.service';

@Component({
  selector: 'app-youtube-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f0f0f] text-slate-900 dark:text-white font-sans transition-all">
      <!-- YouTube Top Bar -->
      <div class="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121212]">
        <div class="flex items-center gap-2">
          <div class="w-7 h-5 bg-red-600 rounded-md flex items-center justify-center text-white text-[10px] shadow-sm">▶</div>
          <span class="font-bold tracking-tighter text-lg font-sans">YouTube</span>
          <span class="text-[10px] text-slate-400 font-semibold -ml-1">PL</span>
        </div>

        <div class="hidden sm:flex items-center w-1/2 border border-slate-300 dark:border-slate-700 rounded-full overflow-hidden bg-white dark:bg-[#181818] px-2">
          <input
            type="text"
            readonly
            [value]="title || 'Wrocław cyberbezpieczeństwo poradnik wideo'"
            class="w-full px-2 py-1.5 text-xs bg-transparent outline-none text-slate-600 dark:text-slate-300 truncate" />
          <button class="px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
            🔍
          </button>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-sm cursor-pointer hover:opacity-80">🔔</span>
          <span class="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {{ isSenior ? 'S' : 'U' }}
          </span>
        </div>
      </div>

      <!-- VIDEO PLAYER CONTAINER -->
      <!-- 1. Real YouTube Embedded Iframe Mode (Memoized signal prevents reload flickering) -->
      <div *ngIf="isEmbedMode()" class="relative aspect-video bg-black overflow-hidden shadow-inner flex items-center justify-center">
        <iframe
          *ngIf="safeEmbedUrl()"
          [src]="safeEmbedUrl()"
          class="w-full h-full border-0"
          title="Odtwarzacz YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>

      <!-- 2. Fallback Simulated Deepfake/Audio Player Canvas -->
      <div
        *ngIf="!isEmbedMode()"
        class="relative aspect-video bg-black flex flex-col justify-between overflow-hidden group cursor-pointer"
        (click)="toggleAudio()">
        <!-- Center Play/Pause Overlay -->
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
          <span
            [ngClass]="isAuthentic ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'"
            class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
            {{ isAuthentic ? 'MATERIAŁ EDUKACYJNY' : 'PREMIERA WIDEO' }}
          </span>
          <span class="text-xs bg-black/70 px-2 py-1 rounded text-slate-300 font-mono backdrop-blur-xs">
            {{ audioService.isPlaying() ? 'AI Voice Clone Active' : 'Kliknij aby odtworzyć dźwięk' }}
          </span>
        </div>

        <!-- Player Controls Bar -->
        <div class="p-3 z-10 bg-gradient-to-t from-black to-transparent flex flex-col gap-1.5">
          <div class="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div class="h-full bg-red-600 transition-all duration-100" [style.width.%]="audioService.progressPercent()"></div>
          </div>
          <div class="flex items-center justify-between text-xs text-white">
            <div class="flex items-center gap-3">
              <span>{{ audioService.isPlaying() ? '⏸' : '▶' }}</span>
              <span class="font-mono text-[11px]">{{ formatTime(audioService.currentTime()) }} / 0:10</span>
              <span>🔊</span>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span>⚙️</span>
              <span>[ ]</span>
            </div>
          </div>
        </div>
      </div>

      <!-- VIDEO METADATA & CHANNEL DETAILS -->
      <div class="p-4 flex flex-col gap-3">
        <!-- Title & Badges -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <span
              *ngIf="isAuthentic"
              class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span>🏛️</span>
              <span>Oficjalny materiał instruktażowy</span>
            </span>
            <span
              *ngIf="!isAuthentic"
              class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
              <span>⚠️</span>
              <span>Wideo zgłoszone do analizy</span>
            </span>
          </div>
          <h2 class="text-base sm:text-lg font-bold leading-snug">
            {{ title }}
          </h2>
        </div>

        <!-- Channel Row -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div
              [ngClass]="isAuthentic ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'"
              class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm shadow-xs border border-slate-300 dark:border-slate-700">
              <img *ngIf="authorAvatar" [src]="authorAvatar" [alt]="author" class="w-full h-full object-cover" />
              <span *ngIf="!authorAvatar">{{ isAuthentic ? '🏛️' : '👤' }}</span>
            </div>
            <div>
              <div class="text-sm font-bold flex items-center gap-1.5">
                <span>{{ author }}</span>
                <span
                  *ngIf="isAuthentic"
                  class="text-xs text-blue-500"
                  title="Zweryfikowany oficjalny kanał instytucjonalny">
                  ☑️
                </span>
                <span
                  *ngIf="!isAuthentic"
                  class="text-xs text-amber-500"
                  title="Niezweryfikowany profil zewnętrzny">
                  ⚠️
                </span>
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">
                {{ authorHandle || '@kanal_oficjalny' }} • {{ subscriberCount || '45 tys. subskrybentów' }}
              </div>
            </div>
            <button
              [ngClass]="isAuthentic ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-red-600 text-white hover:bg-red-700'"
              class="ml-2 px-3 py-1.5 rounded-full font-bold text-xs shadow-xs transition">
              {{ isAuthentic ? 'Obserwuj' : 'Subskrybuj' }}
            </button>
          </div>

          <!-- Engagement Buttons -->
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold overflow-hidden border border-slate-200 dark:border-slate-700">
              <button class="px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1">
                <span>👍</span>
                <span>{{ isAuthentic ? '12 tys.' : '45 tys.' }}</span>
              </button>
              <button class="px-2.5 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 border-l border-slate-300 dark:border-slate-700">
                👎
              </button>
            </div>
            <button class="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              ↪ Udostępnij
            </button>
          </div>
        </div>

        <!-- Description Box -->
        <div class="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs flex flex-col gap-2 select-text border border-slate-200 dark:border-slate-700/60">
          <div class="font-bold text-slate-600 dark:text-slate-300">
            {{ viewsCount || '89 400 wyświetleń' }} • Opublikowano: Wrocław
          </div>
          <p class="text-slate-800 dark:text-slate-200 leading-relaxed text-xs sm:text-sm">
            {{ content }}
          </p>

          <!-- External Links Callout -->
          <div *ngIf="!isAuthentic" class="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 font-mono text-xs flex items-center justify-between">
            <span>🔗 Link w opisie filmu: <strong>https://wroclaw-doplaty-bonus-senior.top/odbierz</strong></span>
            <span class="text-[10px] uppercase font-bold bg-red-200 dark:bg-red-800 text-red-900 dark:text-white px-1.5 py-0.5 rounded">Zewnętrzny</span>
          </div>

          <div *ngIf="isAuthentic" class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-mono text-xs flex items-center justify-between">
            <span>🌐 Oficjalne źródło: <strong>https://www.wroclaw.pl / https://policja.pl</strong></span>
            <span class="text-[10px] uppercase font-bold bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-white px-1.5 py-0.5 rounded">Zweryfikowane</span>
          </div>
        </div>
      </div>

      <!-- RED FLAGS TAGGING BAR (INTERACTIVE ANALYSIS) -->
      <div *ngIf="redFlags && redFlags.length > 0" class="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center justify-between">
          <span>🚩 Wskaż przesłanki i cechy materiału:</span>
          <span class="text-emerald-600 font-mono font-bold">{{ selectedFlags.size }}/{{ redFlags.length }} zaznaczone</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let flag of redFlags"
            type="button"
            (click)="toggleFlag(flag)"
            [ngClass]="selectedFlags.has(flag) ? 'bg-red-600 text-white border-red-700 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'"
            class="text-xs px-3 py-1.5 rounded-lg border font-medium transition text-left flex items-center gap-1.5 shadow-2xs">
            <span>{{ selectedFlags.has(flag) ? '✓' : '⚠' }}</span>
            <span>{{ flag }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class YouTubeMockComponent implements OnInit, OnChanges {
  @Input() author: string = 'Dolnośląska Policja';
  @Input() authorHandle: string = '@kanal_oficjalny';
  @Input() authorAvatar: string = '';
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() mediaUrl: string = '';
  @Input() redFlags: string[] = [];
  @Input() isAuthentic: boolean = false;
  @Input() subscriberCount: string = '';
  @Input() viewsCount: string = '';
  @Input() isSenior: boolean = false;

  @Output() flagSelected = new EventEmitter<string[]>();

  audioService = inject(AudioPlaybackService);
  sanitizer = inject(DomSanitizer);

  safeEmbedUrl = signal<SafeResourceUrl | null>(null);
  isEmbedMode = signal<boolean>(false);
  extractedVideoId = signal<string | null>(null);

  selectedFlags = new Set<string>();

  ngOnInit(): void {
    this.updateVideoEmbed();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mediaUrl']) {
      this.updateVideoEmbed();
    }
  }

  private extractYouTubeId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    const clean = urlOrId.trim();
    const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = clean.match(reg);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    return null;
  }

  private updateVideoEmbed(): void {
    const vid = this.extractYouTubeId(this.mediaUrl);
    if (vid) {
      this.extractedVideoId.set(vid);
      this.isEmbedMode.set(true);
      const embedUrl = `https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1&enablejsapi=1`;
      this.safeEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
    } else {
      this.extractedVideoId.set(null);
      this.isEmbedMode.set(false);
      this.safeEmbedUrl.set(null);
    }
  }

  toggleAudio(): void {
    if (this.mediaUrl && !this.isEmbedMode()) {
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
