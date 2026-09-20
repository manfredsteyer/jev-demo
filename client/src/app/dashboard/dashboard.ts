import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import {
  CopilotActivity,
  CopilotKit,
  injectAgentStore,
  registerRenderActivityMessage,
} from '@copilotkit/angular';
import { a2uiActivity } from '../a2ui/a2ui-activity';
import { DASHBOARD_AGENT_ID } from './dashboard-agent';
import { isActivity, toNotes, toSteps } from './dashboard-messages';
import { EXAMPLES, type Example } from './examples';

@Component({
  imports: [CopilotActivity, FormField],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly copilotKit = inject(CopilotKit);
  private readonly store = injectAgentStore(DASHBOARD_AGENT_ID);

  protected readonly agentId = DASHBOARD_AGENT_ID;
  protected readonly examples = EXAMPLES;

  protected readonly request = signal({ description: '' });
  protected readonly requestForm = form(this.request, (path) => {
    required(path.description, { message: 'Describe the dashboard you would like to see.' });
  });

  protected readonly error = signal('');
  protected readonly isRunning = computed(() => this.store().isRunning());
  protected readonly messages = computed(() => this.store().messages());
  protected readonly activities = computed(() => this.messages().filter(isActivity));
  protected readonly notes = computed(() => toNotes(this.messages()));
  protected readonly steps = computed(() => toSteps(this.messages()));

  protected readonly status = computed(() => {
    if (!this.isRunning()) {
      return '';
    }
    const pending = this.steps().find((step) => !step.done);
    return pending ? `Running ${pending.name} …` : 'Asking Jev …';
  });

  constructor() {
    registerRenderActivityMessage(a2uiActivity);

    const subscription = this.copilotKit.core.subscribe({
      onError: ({ error, context }) => {
        const agentId: unknown = context['agentId'];
        if (agentId === undefined || agentId === DASHBOARD_AGENT_ID) {
          this.error.set(`The dashboard agent could not finish: ${error.message}`);
        }
      },
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  protected useExample(example: Example): void {
    this.request.set({ description: example.description });
    this.generate();
  }

  protected generate(): void {
    submit(this.requestForm, async () => {
      const agent = this.store().agent;
      const content = this.request().description.trim();
      const id = crypto.randomUUID();

      this.error.set('');
      agent.setMessages([]);
      agent.addMessage({ id, role: 'user', content });
      await this.copilotKit.core.runAgent({ agent });
    });
  }
}
