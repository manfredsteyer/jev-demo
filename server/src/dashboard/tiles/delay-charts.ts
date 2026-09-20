import { renderBarChart, renderPieChart } from '../../tools/charts.ts';
import type { Flight } from '../../tools/flights.ts';
import { image, type TileView } from '../a2ui.ts';
import type { DelayShareChartTile, DelaysPerDayChartTile } from '../spec.ts';
import type { Tools } from '../tools.ts';
import { toDay } from './flight-tables.ts';
import { toTile, type Fragment } from './layout.ts';

const ON_TIME = { label: 'On time', color: '#5c44e4' };
const DELAYED = { label: 'Delayed', color: '#f637e3' };

type Counts = { onTime: number; delayed: number };

function count(flights: Flight[]): Counts {
  const delayed = flights.filter((flight) => flight.delayed).length;
  return { onTime: flights.length - delayed, delayed };
}

function toChart(id: string, url: string, description: string): Fragment {
  const chart = image(id, url, description);
  return { root: id, components: [chart] };
}

function renderShare(tile: DelayShareChartTile, counts: Counts): string {
  if (tile.chartType === 'bar') {
    const values = [counts.onTime, counts.delayed];
    const series = { label: 'Flights', color: ON_TIME.color, values };
    return renderBarChart([ON_TIME.label, DELAYED.label], [series]);
  }
  const onTime = { ...ON_TIME, value: counts.onTime };
  const delayed = { ...DELAYED, value: counts.delayed };
  return renderPieChart([onTime, delayed]);
}

export async function toDelayShareChart(
  id: string,
  tile: DelayShareChartTile,
  tools: Tools,
): Promise<TileView> {
  const flights = await tools.findFlights(tile.from, tile.to);
  const counts = count(flights);
  const url = renderShare(tile, counts);
  const title = `Delay share ${tile.from} → ${tile.to}`;
  const chart = toChart(`${id}-chart`, url, title);
  return toTile(id, title, [chart]);
}

function groupByDay(flights: Flight[]): Map<string, Flight[]> {
  const days = new Map<string, Flight[]>();
  for (const flight of flights) {
    const day = toDay(flight);
    const known = days.get(day) ?? [];
    days.set(day, [...known, flight]);
  }
  return days;
}

export async function toDelaysPerDayChart(
  id: string,
  tile: DelaysPerDayChartTile,
  tools: Tools,
): Promise<TileView> {
  const flights = await tools.findFlights(tile.from, tile.to);
  const byDay = groupByDay(flights);
  const keys = byDay.keys();
  const days = Array.from(keys).sort();
  const counts = days.map((day) => {
    const flightsOfDay = byDay.get(day) ?? [];
    return count(flightsOfDay);
  });

  const labels = days.map((day) => day.slice(5));
  const onTimeValues = counts.map((entry) => entry.onTime);
  const delayedValues = counts.map((entry) => entry.delayed);
  const onTime = { ...ON_TIME, values: onTimeValues };
  const delayed = { ...DELAYED, values: delayedValues };
  const url = renderBarChart(labels, [onTime, delayed]);

  const title = `Delays per day ${tile.from} → ${tile.to}`;
  const chart = toChart(`${id}-chart`, url, title);
  return toTile(id, title, [chart]);
}
