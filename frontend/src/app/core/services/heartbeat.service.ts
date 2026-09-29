import { Injectable, inject } from '@angular/core';
import { LabApiService } from './lab-api.service';
import { FirestoreSyncService } from './firestore-sync.service';

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {
  private api = inject(LabApiService);
  private sync = inject(FirestoreSyncService);
  private timer: any = null;

  startHeartbeat(sessionId: string) {
    this.stopHeartbeat();
    this.sendPing(sessionId);

    this.timer = setInterval(() => {
      this.sendPing(sessionId);
    }, 15000); // 15 seconds
  }

  stopHeartbeat() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async sendPing(sessionId: string) {
    const user = this.sync.currentUser();
    if (!user) return;
    try {
      await this.api.sendHeartbeat(sessionId, user.userId, user.role, user.handle);
    } catch (e) {
      console.warn('Heartbeat ping failed:', e);
    }
  }
}
