import type { Flight } from './tools/flights.ts';

export type ToolCall =
  | { tool: string; result: null; reply: string }
  | { tool: string; result: Flight[]; reply: null };

function describeFlight(flight: Flight): string {
  const date = flight.date.slice(0, 16).replace('T', ' ');
  const economy = flight.prices.find((price) => price.flightClass === 'economy');
  const price = economy === undefined ? 'price unknown' : `economy ${economy.amount} EUR`;
  if (flight.delayed) {
    return `${flight.from} -> ${flight.to}, ${date} UTC, ${price}, delayed by ${flight.delay} min`;
  }
  return `${flight.from} -> ${flight.to}, ${date} UTC, ${price}`;
}

export function toHeading(call: ToolCall): string {
  if (call.result === null) {
    return call.reply;
  }

  if (call.result.length === 0) {
    if (call.tool === 'bookings') {
      return 'I do not see any booked flights for that.';
    }
    return 'I could not find any flights for that route.';
  }

  if (call.tool === 'bookings') {
    return 'Your booked flights:';
  }
  return 'Flights I found:';
}

export function toMessage(call: ToolCall): string {
  const heading = toHeading(call);

  if (call.result === null || call.result.length === 0) {
    return heading;
  }

  const lines = call.result.map((flight) => {
    const details = describeFlight(flight);
    return `  ${details}`;
  });
  const body = lines.join('\n');

  return `${heading}\n${body}`;
}
