import type { BoundProperty } from '@a2ui/angular/v0_9';
import { z } from 'zod';

function bound<T extends z.ZodTypeAny>(value: T) {
  const path = z.string();
  const binding = z.object({ path }).strict();
  return z.union([value, binding]);
}

const text = z.string();
const amount = z.number();
const flightId = z.union([text, amount]);
const boundDelay = bound(amount);

const ticketId = bound(flightId);
const from = bound(text);
const to = bound(text);
const date = bound(text);
const delay = boundDelay.optional();
const weight = amount.optional();

export const TICKET_SCHEMA = z.object({ ticketId, from, to, date, delay, weight }).strict();

type Ticket = Omit<z.infer<typeof TICKET_SCHEMA>, 'weight'>;

type Literal<T> = Exclude<T, { path: string } | undefined>;

export type TicketProps = { [K in keyof Ticket]?: BoundProperty<Literal<Ticket[K]>> };
