import { A2uiRendererService, provideA2Ui, provideMarkdownRenderer } from '@a2ui/angular/v0_9';
import { Routes } from '@angular/router';
import { catalog } from '../a2ui/catalog';
import { renderPlainText } from '../a2ui/plain-text';
import { Dashboard } from './dashboard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: Dashboard,
    providers: [
      provideA2Ui({ catalogs: [catalog] }),
      provideMarkdownRenderer(renderPlainText),
      A2uiRendererService,
    ],
  },
];
