import { Routes } from '@angular/router';
import { LobbyComponent } from './features/lobby/lobby.component';
import { JoinComponent } from './features/join/join.component';
import { ArenaComponent } from './features/lab-arena/arena.component';
import { AdminHudComponent } from './features/admin-hud/admin-hud.component';
import { DebriefComponent } from './features/debrief/debrief.component';

export const routes: Routes = [
  { path: '', component: LobbyComponent, pathMatch: 'full' },
  { path: 'join', component: JoinComponent },
  { path: 'arena/:sessionId', component: ArenaComponent },
  { path: 'admin/:sessionId', component: AdminHudComponent },
  { path: 'debrief/:sessionId', component: DebriefComponent },
  { path: '**', redirectTo: '' }
];
