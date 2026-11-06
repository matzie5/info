import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-browser-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 font-sans">
      <!-- Chrome / Edge Window Frame Top -->
      <div class="bg-slate-200 dark:bg-slate-950 px-3 pt-2 pb-1 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
        <!-- Tab Strip -->
        <div class="flex items-center gap-1 overflow-x-auto max-w-[85%]">
          <div class="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-t-lg border-t border-x border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 shadow-2xs">
            <span>💧</span>
            <span class="truncate max-w-[160px]">{{ title || 'MPWiK Wrocław - Alert' }}</span>
            <span class="text-slate-400 hover:text-slate-600 text-xs cursor-pointer ml-1">✕</span>
          </div>
          <div class="px-2 py-1 text-slate-400 hover:text-slate-600 text-sm cursor-pointer">+</div>
        </div>

        <!-- Window Controls -->
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span>—</span>
          <span>▢</span>
          <span class="text-rose-500">✕</span>
        </div>
      </div>

      <!-- Browser Address Bar & Actions Bar -->
      <div class="px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
          <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">‹</button>
          <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">›</button>
          <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">⟳</button>
        </div>

        <!-- URL Address Bar with Security Inspector -->
        <div class="flex-1 relative">
          <div
            (click)="showCertInspector.set(!showCertInspector())"
            class="flex items-center gap-2 bg-white dark:bg-slate-950 border rounded-full px-3 py-1 text-xs font-mono cursor-pointer transition shadow-2xs"
            [ngClass]="showCertInspector() ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'">
            <!-- Padlock / Warning icon -->
            <span class="text-amber-500 font-bold" title="Kliknij aby sprawdzić certyfikat">⚠️</span>
            <span class="text-slate-400 select-none">https://</span>
            <span class="text-red-600 dark:text-red-400 font-bold">wroclaw-mpwik-awaria.pl</span>
            <span class="text-slate-500">.alert-security.net/komunikat</span>
          </div>

          <!-- Certificate & Domain Inspector Dropdown -->
          <div
            *ngIf="showCertInspector()"
            class="absolute left-0 top-full mt-1.5 w-80 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-30 text-xs">
            <div class="flex items-center justify-between font-bold text-amber-600 dark:text-amber-400 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span class="flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Ostrzeżenie o domenie</span>
              </span>
              <span class="cursor-pointer text-slate-400" (click)="showCertInspector.set(false)">✕</span>
            </div>
            <div class="py-2 flex flex-col gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              <div><strong>Faktyczna domena:</strong> alert-security.net</div>
              <div><strong>Subdomena (podszywanie):</strong> wroclaw-mpwik-awaria.pl</div>
              <div><strong>Właściciel:</strong> Anonimowa rejestracja (WHOIS Privacy)</div>
              <div><strong>Ważność certyfikatu:</strong> Wystawiony wczoraj</div>
            </div>
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-red-500 font-semibold">
              🚨 To nie jest oficjalna witryna Urzędu Miejskiego (mpwik.wroc.pl)!
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 text-slate-500 text-sm">
          <span class="cursor-pointer hover:text-slate-700">★</span>
          <span class="cursor-pointer hover:text-slate-700">⋮</span>
        </div>
      </div>

      <!-- Portal Webpage Content -->
      <div class="p-6 bg-slate-50 dark:bg-slate-950 min-h-[380px] flex flex-col gap-4 select-text">
        <!-- Fake Portal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xl">
              💧
            </div>
            <div>
              <div class="font-black text-sm uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji
              </div>
              <div class="text-[11px] text-slate-500">Wrocław • Biuro Bezpieczeństwa Wodnego</div>
            </div>
          </div>
          <span class="text-xs bg-red-600 text-white font-bold px-2.5 py-1 rounded-full uppercase animate-pulse">
            Pilny Alert Miejski
          </span>
        </div>

        <!-- Headline -->
        <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
          {{ title }}
        </h1>

        <div class="text-xs text-slate-500 font-mono">
          Opublikowano: dzisiaj, 14:15 • Dział Eksploatacji Sieci Wrocław
        </div>

        <!-- News Image or Alert Banner -->
        <div class="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 flex items-center gap-4">
          <div class="text-4xl">⚠️</div>
          <div>
            <div class="text-sm font-bold text-red-700 dark:text-red-300 uppercase">
              Skażenie ujęcia wody 'Mokry Dwór'
            </div>
            <div class="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Zalecenie natychmiastowej dekontaminacji w dzielnicach Krzyki, Fabryczna i Stare Miasto.
            </div>
          </div>
        </div>

        <!-- Body Text -->
        <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed" [ngClass]="{'text-lg font-medium': isSenior}">
          {{ content }}
        </p>

        <!-- Fraudulent Urgent Action Form -->
        <div class="mt-2 p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div class="text-sm font-bold text-amber-900 dark:text-amber-200">
              Pakiet Tabletek Dekontaminacyjnych (Dofinansowanie 90%)
            </div>
            <div class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Opłać koszt przesyłki ekspresowej: <strong>14.99 zł</strong> (oferta wygasa o 16:00)
            </div>
          </div>
          <button
            type="button"
            class="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md">
            Zamów i Zapłać PayU
          </button>
        </div>
      </div>

      <!-- Red Flags Tagging Bar -->
      <div *ngIf="redFlags && redFlags.length > 0" class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span>🚩 Zidentyfikuj cechy fałszywej strony:</span>
          <span class="text-emerald-600 font-mono">{{ selectedFlags.size }}/{{ redFlags.length }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let flag of redFlags"
            type="button"
            (click)="toggleFlag(flag)"
            [ngClass]="selectedFlags.has(flag) ? 'bg-amber-600 text-white border-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'"
            class="text-xs px-2.5 py-1.5 rounded-lg border font-medium transition text-left flex items-center gap-1.5 shadow-2xs">
            <span>{{ selectedFlags.has(flag) ? '✓' : '⚠' }}</span>
            <span>{{ flag }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class BrowserMockComponent {
  @Input() author: string = 'MPWiK Wrocław';
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() redFlags: string[] = [];
  @Input() isSenior: boolean = false;

  @Output() flagSelected = new EventEmitter<string[]>();

  showCertInspector = signal<boolean>(false);
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
