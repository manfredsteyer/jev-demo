import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideCopilotKit } from '@copilotkit/angular';
import { HttpAgent } from '@ag-ui/client';
import { routes } from './app.routes';
import { DASHBOARD_AGENT_ID, dashboardAgent } from './dashboard/dashboard-agent';
import { initWidgets } from './widgets';

const AG_UI_URL = 'http://localhost:3000/agent';

const agent = new HttpAgent({ url: AG_UI_URL });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideCopilotKit({
      selfManagedAgents: { default: agent, [DASHBOARD_AGENT_ID]: dashboardAgent },
      defaultToolRendering: true,
      enableInspector: false,
    }),
    provideAppInitializer(initWidgets),
  ],
};
