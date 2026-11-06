import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-facebook-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-[#F0F2F5] dark:bg-[#18191a] font-sans">
      <!-- Facebook Top Navigation Bar -->
      <div class="bg-[#1877F2] text-white px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <span class="text-2xl font-black tracking-tighter">facebook</span>
          <div class="hidden sm:flex items-center bg-white/20 rounded-full px-3 py-1 text-xs text-white placeholder-white/70">
            <span>🔍 Szukaj na Facebooku</span>
          </div>
        </div>

        <div class="flex items-center gap-3 text-lg">
          <span class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer">💬</span>
          <span class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer">🔔</span>
          <span class="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center cursor-pointer text-sm">👤</span>
        </div>
      </div>

      <!-- Main Post Card -->
      <div class="m-3 bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
        <!-- Group Header & Post Author -->
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-full bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xl font-bold overflow-hidden">
              <span *ngIf="!authorAvatar">👥</span>
              <img *ngIf="authorAvatar" [src]="authorAvatar" class="w-full h-full object-cover" alt="group" />
            </div>
            <div>
              <div class="text-sm font-bold text-slate-900 dark:text-white leading-tight hover:underline cursor-pointer">
                Mieszkańcy Wrocławia - Grupa Sąsiedzka
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span class="font-semibold text-slate-700 dark:text-slate-300">{{ author }}</span>
                <span>•</span>
                <span>2 godz. temu</span>
                <span>•</span>
                <span title="Publiczne">🌐</span>
              </div>
            </div>
          </div>

          <div class="text-slate-400 hover:text-slate-600 cursor-pointer text-lg font-bold">⋮</div>
        </div>

        <!-- Post Headline -->
        <div *ngIf="title" class="text-base font-bold text-red-600 dark:text-red-400">
          ⚠️ {{ title }}
        </div>

        <!-- Post Body Content -->
        <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed select-text" [ngClass]="{'text-lg': isSenior}">
          {{ content }}
        </p>

        <!-- Simulated Link / Image Card -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 overflow-hidden cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition">
          <div class="h-32 bg-gradient-to-r from-red-900 via-amber-900 to-slate-900 flex items-center justify-center text-white text-center p-4">
            <div>
              <div class="text-xs font-mono uppercase tracking-wider text-amber-300">ALERT SĄSIEDZKI WROCŁAW</div>
              <div class="text-sm font-bold mt-1">PILNA INFORMACJA DLA MIESZKAŃCÓW</div>
            </div>
          </div>
          <div class="p-3">
            <div class="text-[11px] font-mono uppercase text-slate-400">wroclaw-alert-mieszkancy.com.pl</div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Zarezerwuj termin kontroli online lub sprawdź komunikat</div>
          </div>
        </div>

        <!-- Reactions & Counts -->
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 py-1 border-b border-slate-200 dark:border-slate-700/60">
          <div class="flex items-center gap-1.5">
            <span class="flex -space-x-1">
              <span class="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">👍</span>
              <span class="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">❤️</span>
              <span class="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">😮</span>
            </span>
            <span>342 osoby</span>
          </div>
          <div class="flex gap-3">
            <span>89 komentarzy</span>
            <span>145 udostępnień</span>
          </div>
        </div>

        <!-- Social Action Buttons -->
        <div class="grid grid-cols-3 gap-1 pt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            (click)="liked.set(!liked())"
            [ngClass]="liked() ? 'text-blue-600 font-bold' : ''"
            class="py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition">
            <span>👍</span>
            <span>{{ liked() ? 'Polubiono' : 'Lubię to!' }}</span>
          </button>
          <button
            type="button"
            (click)="showComments.set(!showComments())"
            class="py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition">
            <span>💬</span>
            <span>Komentarz</span>
          </button>
          <button
            type="button"
            class="py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition">
            <span>↪</span>
            <span>Udostępnij</span>
          </button>
        </div>

        <!-- Comments Section -->
        <div *ngIf="showComments()" class="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
          <div class="flex gap-2.5 text-xs">
            <span class="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold">🤖</span>
            <div class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2.5">
              <span class="font-bold text-slate-800 dark:text-slate-200">Grażyna_Wroclaw</span>
              <p class="text-slate-700 dark:text-slate-300 mt-0.5">Potwierdzam, u nas na Grabiszynie już pukali! Trzeba płacić od razu.</p>
            </div>
          </div>
          <div class="flex gap-2.5 text-xs">
            <span class="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold">🔍</span>
            <div class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2.5">
              <span class="font-bold text-slate-800 dark:text-slate-200">Urząd_Miasta_Wrocław_Fanpage</span>
              <p class="text-red-500 dark:text-red-400 mt-0.5 font-semibold">To jest oszustwo! Miasto Wrocław ani Tauron nie pobierają żadnych opłat w gotówce!</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Red Flags Tagging Bar -->
      <div *ngIf="redFlags && redFlags.length > 0" class="m-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span>🚩 Zaznacz czerwone flagi w poście:</span>
          <span class="text-emerald-600 font-mono">{{ selectedFlags.size }}/{{ redFlags.length }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let flag of redFlags"
            type="button"
            (click)="toggleFlag(flag)"
            [ngClass]="selectedFlags.has(flag) ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'"
            class="text-xs px-2.5 py-1.5 rounded-lg border font-medium transition text-left flex items-center gap-1.5">
            <span>{{ selectedFlags.has(flag) ? '✓' : '⚠' }}</span>
            <span>{{ flag }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class FacebookMockComponent {
  @Input() author: string = 'Mieszkańcy Wrocławia';
  @Input() authorAvatar: string = '';
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() redFlags: string[] = [];
  @Input() isSenior: boolean = false;

  @Output() flagSelected = new EventEmitter<string[]>();

  liked = signal<boolean>(false);
  showComments = signal<boolean>(true);
  selectedFlags = new Set<string>();

  toggleFlag(flag: string): void {
    if (this.selectedFlags.has(flag)) {
      this.selectedFlags.delete(flag);
    } else {
      this.selectedFlags.add(flag);
    }
    this.flagSelected.emit(Array.from(this.selectedFlags));
  }
}
