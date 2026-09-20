import { isCheckedIn } from '../../tools/check-in.ts';
import type { Flight } from '../../tools/flights.ts';
import type { Forecast } from '../../tools/weather.ts';
import { button, column, text, ticket, type Component, type TileView } from '../a2ui.ts';
import type { BoardingPassesTile, BookedFlightsListTile, WeatherListTile } from '../spec.ts';
import type { Tools } from '../tools.ts';
import { toDay, toStatus } from './flight-tables.ts';
import { toParagraph, toTable, toTile, type Fragment } from './layout.ts';

export const CHECK_IN_ACTION = 'checkIn';

const CHECKED_IN = 'Checked in ✓';

const NO_BOOKINGS = 'You have no booked flights.';

const WEATHER_COLUMN_WEIGHTS = [3, 4, 4];

const ICONS = { Sunny: '☀️', Cloudy: '☁️', Rainy: '🌧️' };

function byDate(first: Flight, second: Flight): number {
  return first.date.localeCompare(second.date);
}

export async function findNextFlights(tools: Tools, limit: number | null): Promise<Flight[]> {
  const bookings = await tools.findBookings();
  const sorted = bookings.toSorted(byDate);
  return limit === null ? sorted : sorted.slice(0, limit);
}

function toWeather(forecast: Forecast): string {
  const icon = ICONS[forecast.condition];
  return `${icon} ${forecast.condition}, ${forecast.temperature} °C`;
}

function toPass(id: string, flight: Flight): Component {
  const delay = flight.delayed ? flight.delay : 0;
  const values = { ticketId: flight.id, from: flight.from, to: flight.to, date: flight.date, delay };
  return ticket(id, values);
}

export async function toBoardingPasses(
  id: string,
  tile: BoardingPassesTile,
  tools: Tools,
): Promise<TileView> {
  const flights = await findNextFlights(tools, tile.count);
  if (flights.length === 0) {
    const empty = toParagraph(`${id}-empty`, NO_BOOKINGS);
    return toTile(id, 'Boarding passes', [empty]);
  }

  const passes = flights.map((flight, index) => toPass(`${id}-p${index}`, flight));
  const passIds = passes.map((pass) => pass.id);
  const stack = column(id, passIds);
  return { root: id, components: [stack, ...passes], data: null };
}

async function toDetails(flight: Flight, showWeather: boolean, tools: Tools): Promise<string> {
  const day = toDay(flight);
  const status = toStatus(flight);
  if (!showWeather) {
    return `${day} · ${status}`;
  }
  const forecast = await tools.getForecast(flight.to, flight.date);
  const weather = toWeather(forecast);
  return `${day} · ${weather} · ${status}`;
}

function toEntry(id: string, extras: Component[]): Component {
  const extraIds = extras.map((extra) => extra.id);
  return column(id, [`${id}-route`, `${id}-details`, ...extraIds], 'start');
}

export function toCheckedIn(entryId: string): Component[] {
  const status = text(`${entryId}-checked-in`, CHECKED_IN, 'caption');
  const entry = toEntry(entryId, [status]);
  return [entry, status];
}

function toCheckIn(entryId: string, flight: Flight): Component[] {
  const buttonId = `${entryId}-check-in`;
  const labelId = `${buttonId}-label`;
  const label = text(labelId, 'Check in');
  const action = { name: CHECK_IN_ACTION, context: { flightId: flight.id, entry: entryId } };
  const trigger = button(buttonId, labelId, action);
  const entry = toEntry(entryId, [trigger]);
  return [entry, trigger, label];
}

function toPlainEntry(entryId: string): Component[] {
  const entry = toEntry(entryId, []);
  return [entry];
}

function toEntryParts(entryId: string, flight: Flight, showCheckInButton: boolean): Component[] {
  if (!showCheckInButton) {
    return toPlainEntry(entryId);
  }
  return isCheckedIn(flight.id) ? toCheckedIn(entryId) : toCheckIn(entryId, flight);
}

async function toBooking(
  id: string,
  flight: Flight,
  tile: BookedFlightsListTile,
  tools: Tools,
): Promise<Fragment> {
  const details = await toDetails(flight, tile.showWeather, tools);

  const route = text(`${id}-route`, `${flight.from} → ${flight.to}`, 'h4');
  const facts = text(`${id}-details`, details);
  const parts = toEntryParts(id, flight, tile.showCheckInButton);
  return { root: id, components: [...parts, route, facts] };
}

export async function toBookedFlightsList(
  id: string,
  tile: BookedFlightsListTile,
  tools: Tools,
): Promise<TileView> {
  const flights = await findNextFlights(tools, tile.maxRows);
  if (flights.length === 0) {
    const empty = toParagraph(`${id}-empty`, NO_BOOKINGS);
    return toTile(id, 'My booked flights', [empty]);
  }

  const bookings: Fragment[] = [];
  for (const [index, flight] of flights.entries()) {
    const booking = await toBooking(`${id}-f${index}`, flight, tile, tools);
    bookings.push(booking);
  }
  return toTile(id, 'My booked flights', bookings);
}

export async function toWeatherList(
  id: string,
  tile: WeatherListTile,
  tools: Tools,
): Promise<TileView> {
  const flights = await findNextFlights(tools, tile.maxRows);
  if (flights.length === 0) {
    const empty = toParagraph(`${id}-empty`, 'No upcoming destinations.');
    return toTile(id, 'Weather at your destinations', [empty]);
  }

  const rows: string[][] = [];
  for (const flight of flights) {
    const forecast = await tools.getForecast(flight.to, flight.date);
    rows.push([flight.to, forecast.date, `${forecast.condition}, ${forecast.temperature} °C`]);
  }
  const headers = ['Destination', 'Date', 'Forecast'];
  const table = toTable(`${id}-list`, headers, rows, WEATHER_COLUMN_WEIGHTS);
  return toTile(id, 'Weather at your destinations', [table]);
}
