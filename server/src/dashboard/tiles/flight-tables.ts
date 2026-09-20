import type { Flight } from '../../tools/flights.ts';
import type { TileView } from '../a2ui.ts';
import type { DelayedFlightsTableTile, FlightsTableTile } from '../spec.ts';
import type { Tools } from '../tools.ts';
import { toParagraph, toTable, toTile, type Fragment } from './layout.ts';

const HEADERS = ['Flight', 'Date', 'Time', 'Status'];

const COLUMN_WEIGHTS = [2, 4, 2, 3];

export function toStatus(flight: Flight): string {
  return flight.delayed ? `Delayed by ${flight.delay} min` : 'On time';
}

export function toShortStatus(flight: Flight): string {
  return flight.delayed ? `+${flight.delay} min` : 'On time';
}

export function toDay(flight: Flight): string {
  return flight.date.slice(0, 10);
}

export function toTime(flight: Flight): string {
  return flight.date.slice(11, 16);
}

function toRow(flight: Flight): string[] {
  const day = toDay(flight);
  const time = toTime(flight);
  const status = toShortStatus(flight);
  return [`#${flight.id}`, day, time, status];
}

export function toFlightList(id: string, flights: Flight[], empty: string): Fragment {
  if (flights.length === 0) {
    return toParagraph(id, empty);
  }
  const rows = flights.map(toRow);
  return toTable(id, HEADERS, rows, COLUMN_WEIGHTS);
}

export async function toFlightsTable(
  id: string,
  tile: FlightsTableTile | DelayedFlightsTableTile,
  tools: Tools,
): Promise<TileView> {
  const flights = await tools.findFlights(tile.from, tile.to);
  const onlyDelayed = tile.type === 'delayedFlightsTable';
  const wanted = onlyDelayed ? flights.filter((flight) => flight.delayed) : flights;
  const shown = wanted.slice(0, tile.maxRows);

  const kind = onlyDelayed ? 'Delayed flights' : 'Flights';
  const empty = onlyDelayed ? 'No delayed flights on this route.' : 'No flights on this route.';
  const list = toFlightList(`${id}-list`, shown, empty);
  return toTile(id, `${kind} ${tile.from} → ${tile.to}`, [list]);
}
