import type { ToolName } from './decide.ts';
import type { Flight } from '../tools/flights.ts';

export function toMessage(tool: ToolName, flights: Flight[]): string {
  if (flights.length === 0) {
    if (tool === 'findBookings') {
      return 'I do not see any booked flights for that.';
    }
    return 'I could not find any flights for that route.';
  }

  if (tool === 'findBookings') {
    return 'Your booked flights:';
  }
  return 'Flights I found:';
}
