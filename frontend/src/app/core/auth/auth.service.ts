// frontend/src/app/core/auth/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AudienceMode, AudienceService } from '../audience/audience.service';

export type UserRole = 'ADMIN' | 'PLAYER';

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: UserRole;
  cohort_id?: string;
  audience_mode?: AudienceMode;
  created_at?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DemoAccount {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: UserRole;
  cohort_id: string;
  audience_mode?: AudienceMode;
  hint_password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private audience = inject(AudienceService);

  private currentToken = signal<string | null>(null);
  private userSignal = signal<User | null>(null);

  public readonly token = computed(() => this.currentToken());
  public readonly currentUser = computed(() => this.userSignal());
  public readonly isLoggedIn = computed(() => !!this.userSignal());
  public readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');
  public readonly isPlayer = computed(() => this.userSignal()?.role === 'PLAYER');
  public readonly cohortId = computed(() => this.userSignal()?.cohort_id || 'cohort_cyber_defense_2026');

  constructor() {
    this.initAuth();
  }

  private initAuth(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedToken = localStorage.getItem('infosphere_auth_token');
      const savedUserStr = localStorage.getItem('infosphere_auth_user');

      if (savedToken && savedUserStr) {
        this.currentToken.set(savedToken);
        this.userSignal.set(JSON.parse(savedUserStr));
        return;
      }
    } catch (e) {
      console.warn('LocalStorage error reading auth credentials', e);
    }

    // Default to Player 1 out-of-the-box for instant interactive play
    this.useDefaultPlayer();
  }

  public useDefaultPlayer(): void {
    const defaultUser: User = {
      id: 'user_player1',
      username: 'player1',
      email: 'alex.operative@infosphere.io',
      display_name: 'Alex Vance (Player 1)',
      role: 'PLAYER',
      cohort_id: 'cohort_cyber_defense_2026',
      audience_mode: 'professional',
    };
    this.setUserAndToken(defaultUser, 'demo_player1_token');
  }

  public useDefaultAdmin(): void {
    const adminUser: User = {
      id: 'user_admin',
      username: 'admin',
      email: 'director@infosphere.security',
      display_name: 'Security Director (Admin)',
      role: 'ADMIN',
      cohort_id: 'cohort_cyber_defense_2026',
      audience_mode: 'professional',
    };
    this.setUserAndToken(adminUser, 'demo_admin_token');
  }

  public setUserAndToken(user: User, token: string): void {
    this.userSignal.set(user);
    this.currentToken.set(token);
    if (user.audience_mode) {
      this.audience.setMode(user.audience_mode);
    }
    if (user.cohort_id) {
      this.http.get<any>(`/api/v1/cohorts/${user.cohort_id}`).subscribe({
        next: (cohort) => this.audience.applyCohortEnvironment(cohort),
        error: () => {},
      });
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('infosphere_auth_token', token);
        localStorage.setItem('infosphere_auth_user', JSON.stringify(user));
      } catch (e) {
        console.warn('LocalStorage error saving auth credentials', e);
      }
    }
  }

  public login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/v1/auth/login', { username, password })
      .pipe(
        tap((res) => {
          this.setUserAndToken(res.user, res.access_token);
        })
      );
  }

  public register(payload: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    role?: UserRole;
    cohort_id?: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/v1/auth/register', payload)
      .pipe(
        tap((res) => {
          this.setUserAndToken(res.user, res.access_token);
        })
      );
  }

  public quickSwitchUser(username: 'admin' | 'player1' | 'player2' | 'kid1' | 'senior1'): void {
    if (username === 'admin') {
      this.login('admin', 'admin123').subscribe({
        error: () => this.useDefaultAdmin(),
      });
    } else if (username === 'player2') {
      this.login('player2', 'player123').subscribe({
        error: () => {
          const user: User = {
            id: 'user_player2',
            username: 'player2',
            email: 'sam.defender@infosphere.io',
            display_name: 'Sam Carter (Player 2)',
            role: 'PLAYER',
            cohort_id: 'cohort_cyber_defense_2026',
            audience_mode: 'professional',
          };
          this.setUserAndToken(user, 'demo_player2_token');
        },
      });
    } else if (username === 'kid1') {
      this.login('kid1', 'kid1123').subscribe({
        error: () => {
          const user: User = {
            id: 'user_kid1',
            username: 'kid1',
            email: 'leo.explorer@school.edu.pl',
            display_name: 'Leo Nowak (Junior Explorer)',
            role: 'PLAYER',
            cohort_id: 'cohort_kids_explorers_2026',
            audience_mode: 'kids',
          };
          this.setUserAndToken(user, 'demo_kid1_token');
          this.audience.applyCohortEnvironment({
            audience_mode: 'kids',
            location_name: null,
            prepared_session_id: null,
          });
        },
      });
    } else if (username === 'senior1') {
      this.login('senior1', 'senior1123').subscribe({
        error: () => {
          const user: User = {
            id: 'user_senior1',
            username: 'senior1',
            email: 'marta.kowalska@senior-club.wroclaw.pl',
            display_name: 'Marta Kowalska (Senior Citizen)',
            role: 'PLAYER',
            cohort_id: 'cohort_silver_shield_2026',
            audience_mode: 'seniors',
          };
          this.setUserAndToken(user, 'demo_senior1_token');
          this.audience.applyCohortEnvironment({
            audience_mode: 'seniors',
            location_name: 'Wrocław',
          });
        },
      });
    } else {
      this.login('player1', 'player123').subscribe({
        error: () => this.useDefaultPlayer(),
      });
    }
  }

  public logout(): void {
    this.userSignal.set(null);
    this.currentToken.set(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('infosphere_auth_token');
        localStorage.removeItem('infosphere_auth_user');
      } catch (e) {
        console.warn('LocalStorage error removing auth credentials', e);
      }
    }
  }

  public getAuthHeaders(): { [header: string]: string } {
    const tok = this.currentToken();
    return tok ? { Authorization: `Bearer ${tok}` } : {};
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const setHeaders: { [header: string]: string } = {};
  if (token && !req.headers.has('Authorization')) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }
  const cloned = req.clone({
    setHeaders,
    withCredentials: true,
  });
  return next(cloned);
};
