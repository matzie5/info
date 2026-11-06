import { Injectable } from '@angular/core';
import { Session, FeedItem, UserRole, ActionType } from '../models/session.model';

@Injectable({
  providedIn: 'root'
})
export class LabApiService {
  private baseUrl = (window as any).__API_BASE_URL__ || '/api/v1';

  private async fetchApi(path: string, options?: RequestInit): Promise<Response> {
    const primaryUrl = `${this.baseUrl}${path}`;
    const fetchOptions: RequestInit = {
      credentials: 'include',
      ...options
    };
    try {
      const res = await fetch(primaryUrl, fetchOptions);
      const contentType = res.headers.get('content-type') || '';

      // If server returned HTML (e.g. Angular index.html when proxy is not forwarding)
      if (contentType.includes('text/html')) {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          console.warn(`[LabApiService] Endpoint ${primaryUrl} returned HTML. Falling back to direct backend at http://127.0.0.1:8000/api/v1${path}`);
          const fallbackRes = await fetch(`http://127.0.0.1:8000/api/v1${path}`, options);
          return fallbackRes;
        }
      }
      return res;
    } catch (err) {
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.warn(`[LabApiService] Request to ${primaryUrl} failed. Retrying direct backend at http://127.0.0.1:8000/api/v1${path}...`, err);
        return fetch(`http://127.0.0.1:8000/api/v1${path}`, options);
      }
      throw err;
    }
  }

  async createSession(
    title: string,
    scenarioId: string = 'poland-grid-panic-2026',
    language: string = 'pl',
    maxTicks: number = 40,
    audienceMode: string = 'professional',
    locationName?: string | null
  ): Promise<Session> {
    const res = await this.fetchApi('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        scenario_id: scenarioId,
        language,
        max_ticks: maxTicks,
        audience_mode: audienceMode,
        location_name: locationName || undefined
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Create session failed: ${res.statusText}`);
    }
    return res.json();
  }

  async getSession(sessionId: string): Promise<Session> {
    const res = await this.fetchApi(`/sessions/${sessionId}`);
    if (!res.ok) throw new Error(`Get session failed: ${res.statusText}`);
    return res.json();
  }

  async startSession(sessionId: string): Promise<Session> {
    const res = await this.fetchApi(`/sessions/${sessionId}/start`, { method: 'POST' });
    if (!res.ok) throw new Error(`Start session failed: ${res.statusText}`);
    return res.json();
  }

  async pauseSession(sessionId: string): Promise<Session> {
    const res = await this.fetchApi(`/sessions/${sessionId}/pause`, { method: 'POST' });
    if (!res.ok) throw new Error(`Pause session failed: ${res.statusText}`);
    return res.json();
  }

  async resumeSession(sessionId: string): Promise<Session> {
    const res = await this.fetchApi(`/sessions/${sessionId}/resume`, { method: 'POST' });
    if (!res.ok) throw new Error(`Resume session failed: ${res.statusText}`);
    return res.json();
  }

  async getFeed(sessionId: string): Promise<FeedItem[]> {
    const res = await this.fetchApi(`/sessions/${sessionId}/feed`);
    if (!res.ok) throw new Error(`Get feed failed: ${res.statusText}`);
    return res.json();
  }

  async submitAction(
    sessionId: string,
    action: {
      userId: string;
      team: UserRole;
      actionType: ActionType;
      targetPostId?: string;
      targetCluster?: string;
      customPrompt?: string;
      headline?: string;
      content?: string;
    }
  ): Promise<any> {
    const res = await this.fetchApi(`/sessions/${sessionId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: action.userId,
        team: action.team,
        action_type: action.actionType,
        target_post_id: action.targetPostId,
        target_cluster: action.targetCluster,
        custom_prompt: action.customPrompt,
        headline: action.headline,
        content: action.content
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Action execution failed');
    }
    return res.json();
  }

  async joinByToken(sessionId: string, token: string, requestedHandle?: string): Promise<{
    session_id: string;
    assigned_role: UserRole;
    assigned_handle: string;
    custom_auth_token: string;
  }> {
    const res = await this.fetchApi(`/sessions/${sessionId}/join-by-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        requested_handle: requestedHandle
      })
    });
    if (!res.ok) throw new Error(`Join by token failed: ${res.statusText}`);
    return res.json();
  }

  async createInvite(sessionId: string, role: UserRole, teamQuota: number = 20): Promise<{ token: string; invite_url: string }> {
    const res = await this.fetchApi(`/sessions/${sessionId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        team_quota: teamQuota
      })
    });
    if (!res.ok) throw new Error(`Create invite failed: ${res.statusText}`);
    return res.json();
  }

  async sendHeartbeat(sessionId: string, userId: string, role: UserRole, handle: string): Promise<any> {
    const res = await this.fetchApi(`/sessions/${sessionId}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        role,
        handle
      })
    });
    return res.ok;
  }

  async getActions(sessionId: string): Promise<any[]> {
    const res = await this.fetchApi(`/sessions/${sessionId}/actions`);
    if (!res.ok) throw new Error(`Get actions failed: ${res.statusText}`);
    return res.json();
  }

  // Facilitator Master HUD Admin calls
  async getScenarios(): Promise<any[]> {
    const res = await this.fetchApi('/admin/scenarios');
    if (!res.ok) throw new Error(`Get scenarios failed: ${res.statusText}`);
    return res.json();
  }

  async getScenarioArticles(sessionId: string): Promise<any[]> {
    const res = await this.fetchApi(`/admin/sessions/${sessionId}/scenario-articles`);
    if (!res.ok) throw new Error(`Get scenario articles failed: ${res.statusText}`);
    return res.json();
  }

  async createAdminPost(sessionId: string, postData: {
    headline?: string;
    content: string;
    author_name?: string;
    author_handle?: string;
    author_avatar?: string;
    media_url?: string;
    is_verified?: boolean;
    outrage_score?: number;
    bias_score?: number;
    virality_velocity?: number;
    target_cluster?: string;
  }): Promise<FeedItem> {
    const res = await this.fetchApi(`/admin/sessions/${sessionId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Create post failed: ${res.statusText}`);
    }
    return res.json();
  }

  async adminForceTick(sessionId: string): Promise<any> {
    const res = await this.fetchApi(`/admin/sessions/${sessionId}/force-tick`, { method: 'POST' });
    if (!res.ok) throw new Error(`Force tick failed: ${res.statusText}`);
    return res.json();
  }

  async adminCrisisInject(sessionId: string, statement?: string, severity: string = 'HIGH'): Promise<any> {
    const res = await this.fetchApi(`/admin/sessions/${sessionId}/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statement, severity })
    });
    if (!res.ok) throw new Error(`Crisis inject failed: ${res.statusText}`);
    return res.json();
  }

  async adminGetPresence(sessionId: string): Promise<any> {
    const res = await this.fetchApi(`/admin/sessions/${sessionId}/presence`);
    if (!res.ok) throw new Error(`Get presence failed: ${res.statusText}`);
    return res.json();
  }

  async adminGetTelemetry(sessionId: string): Promise<any> {
    const res = await this.fetchApi(`/admin/sessions/${sessionId}/telemetry`);
    if (!res.ok) throw new Error(`Get telemetry failed: ${res.statusText}`);
    return res.json();
  }
}

