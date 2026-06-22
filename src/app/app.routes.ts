import { Routes } from '@angular/router';
import { TicketsComponent } from './pages/tickets/tickets.component';
import { AssetsComponent } from './pages/assets/assets.component';
import { UsersComponent } from './pages/users/users.component';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { WorkflowListComponent } from './pages/workflows/workflow-list.component';
import { WorkflowBuilderComponent } from './pages/workflows/workflow-builder.component';
import { ExecutionLogsComponent } from './pages/workflows/execution-logs.component';
import { SimulationResultsComponent } from './pages/workflows/simulation-results.component';

export const routes: Routes = [
  { path: '', redirectTo: 'workflows', pathMatch: 'full' },
  { path: 'tickets', component: TicketsComponent },
  { path: 'assets', component: AssetsComponent },
  { path: 'users', component: UsersComponent },
  { path: 'analytics', component: AnalyticsComponent },
  { path: 'settings', component: SettingsComponent },

  // Settings → Workflows
  { path: 'workflows', component: WorkflowListComponent },
  { path: 'workflows/builder', component: WorkflowBuilderComponent },
  { path: 'workflows/logs', component: ExecutionLogsComponent },
  { path: 'workflows/simulation', component: SimulationResultsComponent },
];
