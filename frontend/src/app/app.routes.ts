import { Routes } from '@angular/router';
import { LobbyComponent } from './features/lobby/lobby.component';
import { JoinComponent } from './features/join/join.component';
import { ArenaComponent } from './features/lab-arena/arena.component';
import { AdminHudComponent } from './features/admin-hud/admin-hud.component';
import { DebriefComponent } from './features/debrief/debrief.component';
import { ClassroomComponent } from './features/classroom/classroom.component';
import { PlatformShellComponent } from './features/platform-shell/platform-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: PlatformShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/player-dashboard.component').then(
            (m) => m.PlayerDashboardComponent
          ),
      },
      {
        path: 'admin/cohorts',
        loadComponent: () =>
          import('./features/admin/admin-cohorts.component').then(
            (m) => m.AdminCohortsComponent
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login.component').then(
            (m) => m.LoginComponent
          ),
      },
      { path: 'modules/disinfo', component: LobbyComponent },
      { path: 'arena/:sessionId', component: ArenaComponent },
      { path: 'admin/:sessionId', component: AdminHudComponent },
      { path: 'classroom/:sessionId', component: ClassroomComponent },
      { path: 'debrief/:sessionId', component: DebriefComponent },
      {
        path: 'modules/scam-lab',
        loadComponent: () =>
          import('./features/modules/m2-scam-lab/m2-scam-lab.component').then(
            (m) => m.M2ScamLabComponent
          ),
      },
      {
        path: 'modules/deepfake-lab',
        loadComponent: () =>
          import('./features/modules/m3-deepfake-lab/m3-deepfake-lab.component').then(
            (m) => m.M3DeepfakeLabComponent
          ),
      },
      {
        path: 'modules/osint-exposure',
        loadComponent: () =>
          import('./features/modules/m4-osint-lab/m4-osint-lab.component').then(
            (m) => m.M4OsintLabComponent
          ),
      },
      {
        path: 'modules/echo-chamber',
        loadComponent: () =>
          import('./features/modules/m5-echo-lab/m5-echo-lab.component').then(
            (m) => m.M5EchoLabComponent
          ),
      },
    ],
  },
  { path: 'join', component: JoinComponent },
  { path: '**', redirectTo: '' },
];
