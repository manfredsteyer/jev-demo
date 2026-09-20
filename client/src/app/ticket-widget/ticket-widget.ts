import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TicketProps } from './ticket-schema';

const BOARDING_OFFSET_MS = 30 * 60 * 1000;

function toDate(raw: string): Date | null {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

@Component({
  imports: [DatePipe],
  selector: 'app-ticket-widget',
  styleUrl: './ticket-widget.css',
  templateUrl: './ticket-widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketWidget {
  readonly props = input<TicketProps>({});
  readonly surfaceId = input.required<string>();
  readonly componentId = input.required<string>();
  readonly dataContextPath = input('/');

  protected readonly gate = 'B7';
  protected readonly seat = '14A';

  protected readonly ticketId = computed(() => this.props().ticketId?.value() ?? '');
  protected readonly from = computed(() => this.props().from?.value() ?? '');
  protected readonly to = computed(() => this.props().to?.value() ?? '');
  protected readonly delay = computed(() => this.props().delay?.value() ?? 0);

  protected readonly departure = computed(() => {
    const raw = this.props().date?.value() ?? '';
    return toDate(raw);
  });

  protected readonly boarding = computed(() => {
    const departure = this.departure();
    return departure === null ? null : new Date(departure.getTime() - BOARDING_OFFSET_MS);
  });
}
