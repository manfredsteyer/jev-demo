import { A2uiRendererService, SurfaceComponent } from '@a2ui/angular/v0_9';
import type { A2uiClientAction, A2uiMessage } from '@a2ui/web_core/v0_9';
import type { AbstractAgent, ActivityMessage } from '@ag-ui/client';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { ActivityRenderer, RenderActivityMessageConfig } from '@copilotkit/angular';
import { z } from 'zod';

const operation = z.custom<A2uiMessage>();
const operations = z.array(operation);

const A2UI_CONTENT_SCHEMA = z.object({ a2ui_operations: operations }).passthrough();

type A2uiContent = z.infer<typeof A2UI_CONTENT_SCHEMA>;

function toSurfaceId(message: A2uiMessage | undefined): string | null {
  if (message === undefined) {
    return null;
  }
  if ('createSurface' in message) {
    return message.createSurface.surfaceId;
  }
  if ('updateComponents' in message) {
    return message.updateComponents.surfaceId;
  }
  if ('updateDataModel' in message) {
    return message.updateDataModel.surfaceId;
  }
  return null;
}

@Component({
  imports: [SurfaceComponent],
  selector: 'app-a2ui-activity',
  template: `
    @if (error()) {
      <p role="alert">This dashboard cannot be shown: {{ error() }}</p>
    } @else if (surfaceId(); as id) {
      <a2ui-v09-surface [surfaceId]="id" />
    }
    <dialog #info>
      <p>Not implemented in this demo.</p>
      <form method="dialog">
        <button>Close</button>
      </form>
    </dialog>
  `,
  styles: `
    p[role='alert'] {
      color: #b91c1c;
    }

    dialog {
      max-width: 22rem;
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 1rem;
      color: var(--color-ink);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.07);
    }

    dialog::backdrop {
      background: rgba(15, 23, 42, 0.35);
    }

    dialog p {
      margin: 0 0 1rem;
    }

    dialog button {
      padding: 0.4rem 1.1rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: #ffffff;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    dialog button:hover {
      border-color: var(--color-primary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class A2uiActivity implements ActivityRenderer<A2uiContent> {
  readonly activityType = input.required<string>();
  readonly content = input.required<A2uiContent>();
  readonly message = input.required<ActivityMessage>();
  readonly agent = input<AbstractAgent>();

  private readonly renderer = inject(A2uiRendererService);
  private readonly info = viewChild.required<ElementRef<HTMLDialogElement>>('info');

  private renderedSurfaceId: string | null = null;
  private processedOperations = 0;

  protected readonly error = signal('');
  protected readonly surfaceId = computed(() => toSurfaceId(this.content().a2ui_operations[0]));

  constructor() {
    effect(() => {
      this.render(this.content().a2ui_operations);
    });

    const subscription = this.renderer.surfaceGroup.onAction.subscribe((action) => {
      this.showNotImplemented(action);
    });

    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.release();
    });
  }

  private render(messages: A2uiMessage[]): void {
    const surfaceId = toSurfaceId(messages[0]);
    if (surfaceId === null) {
      return;
    }
    if (surfaceId !== this.renderedSurfaceId) {
      this.release();
      this.renderedSurfaceId = surfaceId;
    }

    const pending = messages.slice(this.processedOperations);
    this.processedOperations = messages.length;
    try {
      this.renderer.processMessages(pending);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.error.set(reason);
    }
  }

  private release(): void {
    if (this.renderedSurfaceId !== null) {
      this.renderer.surfaceGroup.deleteSurface(this.renderedSurfaceId);
    }
    this.renderedSurfaceId = null;
    this.processedOperations = 0;
  }

  private showNotImplemented(action: A2uiClientAction): void {
    if (action.surfaceId !== this.renderedSurfaceId) {
      return;
    }
    const dialog = this.info();
    dialog.nativeElement.showModal();
  }
}

export const a2uiActivity: RenderActivityMessageConfig<A2uiContent> = {
  activityType: 'a2ui-surface',
  content: A2UI_CONTENT_SCHEMA,
  component: A2uiActivity,
};
