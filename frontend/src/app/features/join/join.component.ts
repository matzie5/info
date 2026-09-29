import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LabApiService } from '../../core/services/lab-api.service';
import { FirestoreSyncService } from '../../core/services/firestore-sync.service';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6 bg-[#0B0F17]">
      <div class="glass-panel p-8 max-w-md w-full text-center">
        <div class="w-12 h-12 rounded-full bg-[#84AA40]/20 border border-[#84AA40] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg class="w-6 h-6 text-[#84AA40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>

        <h2 class="text-xl font-bold text-white mb-2">Authenticating Magic Link</h2>
        <p class="text-slate-400 text-sm mb-6">{{ statusMessage() }}</p>

        <div *ngIf="errorMessage()" class="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4">
          {{ errorMessage() }}
        </div>

        <button *ngIf="errorMessage()" (click)="goHome()" class="btn-secondary w-full justify-center">
          Return to Lobby
        </button>
      </div>
    </div>
  `
})
export class JoinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(LabApiService);
  private sync = inject(FirestoreSyncService);

  public statusMessage = signal<string>('Verifying cryptographic token signature...');
  public errorMessage = signal<string | null>(null);

  async ngOnInit() {
    const sessionId = this.route.snapshot.queryParamMap.get('sessionId');
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!sessionId || !token) {
      this.errorMessage.set('Invalid invite link: missing sessionId or cryptographic token.');
      return;
    }

    try {
      this.statusMessage.set('Signing in guest participant...');
      const res = await this.api.joinByToken(sessionId, token);

      this.sync.setCurrentUser({
        userId: res.assigned_handle,
        role: res.assigned_role,
        handle: res.assigned_handle
      });

      this.statusMessage.set('Connected! Entering arena...');
      setTimeout(() => {
        this.router.navigate(['/arena', sessionId]);
      }, 600);
    } catch (e: any) {
      this.errorMessage.set(e.message || 'Verification failed. The link may be expired or full.');
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
