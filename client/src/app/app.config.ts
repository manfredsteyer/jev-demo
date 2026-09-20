import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideCopilotKit } from '@copilotkit/angular';
import { HttpAgent } from '@ag-ui/client';
import { initWidgets } from './widgets';

const AG_UI_URL = 'http://localhost:3000/agent';

const agent = new HttpAgent({ url: AG_UI_URL });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideCopilotKit({
      selfManagedAgents: { default: agent },
      defaultToolRendering: true,
      enableInspector: false,
    }),
    provideAppInitializer(initWidgets),
  ],
};
