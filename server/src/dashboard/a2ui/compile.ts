import { randomUUID } from 'node:crypto';
import {
  column,
  createSurface,
  updateComponents,
  updateDataModel,
  type Component,
  type Operation,
  type TileView,
} from './protocol.ts';
import type { DashboardSpec, Tile } from '../model.ts';
import type { Tools } from '../tools.ts';
import { toBoardingPasses, toBookedFlightsList, toWeatherList } from './tiles/bookings.ts';
import { toDelayShareChart, toDelaysPerDayChart } from './tiles/delay-charts.ts';
import { toFlightSearch } from './tiles/flight-search.ts';
import { toFlightsTable } from './tiles/flight-tables.ts';
import { toHotels, toRentalCars } from './tiles/offers.ts';

const ROOT_ID = 'root';

export type Dashboard = { surfaceId: string; operations: Operation[] };

function toTileView(id: string, tile: Tile, tools: Tools): Promise<TileView> | TileView {
  switch (tile.type) {
    case 'flightsTable':
    case 'delayedFlightsTable': {
      return toFlightsTable(id, tile, tools);
    }
    case 'delayShareChart': {
      return toDelayShareChart(id, tile, tools);
    }
    case 'delaysPerDayChart': {
      return toDelaysPerDayChart(id, tile, tools);
    }
    case 'boardingPasses': {
      return toBoardingPasses(id, tile, tools);
    }
    case 'bookedFlightsList': {
      return toBookedFlightsList(id, tile, tools);
    }
    case 'flightSearch': {
      return toFlightSearch(id, tile);
    }
    case 'rentalCars': {
      return toRentalCars(id, tile, tools);
    }
    case 'hotels': {
      return toHotels(id, tile, tools);
    }
    case 'weatherList': {
      return toWeatherList(id, tile, tools);
    }
  }
}

function toDataOperations(surfaceId: string, views: TileView[]): Operation[] {
  const operations: Operation[] = [];
  for (const view of views) {
    if (view.data !== null) {
      const operation = updateDataModel(surfaceId, `/${view.root}`, view.data);
      operations.push(operation);
    }
  }
  return operations;
}

export async function compile(spec: DashboardSpec, tools: Tools): Promise<Dashboard> {
  const uuid = randomUUID();
  const surfaceId = `dashboard-${uuid}`;

  const views: TileView[] = [];
  for (const [index, tile] of spec.tiles.entries()) {
    const view = await toTileView(`t${index}`, tile, tools);
    views.push(view);
  }

  const tileIds = views.map((view) => view.root);
  const root = column(ROOT_ID, tileIds);
  const tileComponents = views.flatMap((view) => view.components);
  const surface = createSurface(surfaceId);
  const components = updateComponents(surfaceId, [root, ...tileComponents]);
  const data = toDataOperations(surfaceId, views);
  return { surfaceId, operations: [surface, components, ...data] };
}
