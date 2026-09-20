import type { ToolCallSummary, Turn } from '../ag-ui.ts';

export type ShownFlight = { from: string; to: string; date: string };

export type Entry =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; flightsShown: ShownFlight[] };

export type State = { conversation: Entry[] };

function toShownFlights(toolCalls: ToolCallSummary[]): ShownFlight[] {
  const widgets = toolCalls.filter((call) => call.name === 'flightWidget');
  return widgets.map((call) => {
    const { from, to, date } = call.args as ShownFlight;
    return { from, to, date };
  });
}

function toEntry(turn: Turn): Entry {
  if (turn.role === 'user') {
    return turn;
  }
  const flightsShown = toShownFlights(turn.toolCalls);
  return { role: 'assistant', content: turn.content, flightsShown };
}

export function toState(turns: Turn[]): State {
  const conversation = turns.map(toEntry);
  return { conversation };
}
