import { Injectable, signal, inject } from '@angular/core';
import { Session, FeedItem, UserRole } from '../models/session.model';
import { LabApiService } from './lab-api.service';

@Injectable({
  providedIn: 'root'
})
export class FirestoreSyncService {
  private api = inject(LabApiService);

  public readonly session = signal<Session | null>(null);
  public readonly feed = signal<FeedItem[]>([]);
  public readonly currentUser = signal<{ userId: string; role: UserRole; handle: string } | null>(null);
  public readonly isSyncing = signal<boolean>(false);

  private pollIntervalId: any = null;
  private currentSessionId: string | null = null;

  initUserFromStorage() {
    const raw = localStorage.getItem('infosphere_user');
    if (raw) {
      try {
        this.currentUser.set(JSON.parse(raw));
      } catch (e) {
        console.warn('Could not parse stored user profile');
      }
    }
  }

  setCurrentUser(user: { userId: string; role: UserRole; handle: string }) {
    this.currentUser.set(user);
    localStorage.setItem('infosphere_user', JSON.stringify(user));
  }

  startSync(sessionId: string, intervalMs: number = 2500) {
    if (this.currentSessionId === sessionId && this.pollIntervalId) {
      return;
    }
    this.stopSync();
    this.currentSessionId = sessionId;
    this.fetchData(sessionId);

    this.pollIntervalId = setInterval(() => {
      this.fetchData(sessionId);
    }, intervalMs);
  }

  stopSync() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.currentSessionId = null;
  }

  async fetchData(sessionId: string) {
    this.isSyncing.set(true);
    try {
      const [sessionData, feedData] = await Promise.all([
        this.api.getSession(sessionId),
        this.api.getFeed(sessionId)
      ]);
      this.session.set(sessionData);
      this.feed.set(feedData);
    } catch (e) {
      console.warn('Error during sync polling:', e);
    } finally {
      this.isSyncing.set(false);
    }
  }
}
