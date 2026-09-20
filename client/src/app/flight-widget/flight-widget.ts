import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { AngularToolCall, ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

const id = z.number();
const from = z.string();
const to = z.string();
const date = z.string();
const delayed = z.boolean();

export const FLIGHT_SCHEMA = z.object({ id, from, to, date, delayed });

export type Flight = z.infer<typeof FLIGHT_SCHEMA>;

@Component({
  imports: [DatePipe],
  selector: 'app-flight-widget',
  styleUrl: './flight-widget.css',
  templateUrl: './flight-widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightWidget implements ToolRenderer<Flight> {
  readonly toolCall = input.required<AngularToolCall<Flight>>();

  protected readonly flight = computed(() => {
    const call = this.toolCall();
    return call.status === 'in-progress' ? null : call.args;
  });
}
