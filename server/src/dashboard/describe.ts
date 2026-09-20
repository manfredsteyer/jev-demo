import type { TypeSafeClient, Usage } from '@typesafe-ai/sdk';
import { CITY_NAMES, type City } from '../cities.ts';
import { SHOW_JEV_RESULT } from '../feature-flags.ts';
import type {
  BoardingPassesTile,
  BookedFlightsListTile,
  DashboardSpec,
  DelayedFlightsTableTile,
  DelayShareChartTile,
  DelaysPerDayChartTile,
  FlightSearchTile,
  FlightsTableTile,
  HotelsTile,
  RentalCarsTile,
  Route,
  Tile,
  TileType,
  WeatherListTile,
} from './model.ts';
import {
  LABELS,
  QUESTIONS,
  type Answers,
  type Limit,
  type Place,
  type PositionAnswer,
} from './questions.ts';

const WANTED = 0.5;

const DEFAULT_TABLE_ROWS = 30;
const DEFAULT_BOARDING_PASSES = 3;
const MAX_BOARDING_PASSES = 8;
const DEFAULT_SEARCH_FROM: City = 'Graz';
const DEFAULT_SEARCH_TO: City = 'Hamburg';

type Placed = { tile: Tile; position: number };

export type Described = { spec: DashboardSpec; notes: string[]; usage: Usage };

function toCity(place: Place): City | null {
  if (place === 'NOT_DEFINED' || place === 'NOT_SUPPORTED') {
    return null;
  }
  return place;
}

function toRoute(departure: Place, destination: Place): Route | null {
  const from = toCity(departure);
  const to = toCity(destination);
  if (from === null || to === null) {
    return null;
  }
  return { from, to };
}

function toLimit(limit: Limit): number | null {
  if (limit === 'NOT_DEFINED') {
    return null;
  }
  return Number(limit);
}

function toFlightsTable(answers: Answers): FlightsTableTile | null {
  const route = toRoute(answers.flightsTableFrom.choice, answers.flightsTableTo.choice);
  if (route === null) {
    return null;
  }
  const maxRows = toLimit(answers.flightsTableMaxRows.choice) ?? DEFAULT_TABLE_ROWS;
  return { type: 'flightsTable', ...route, maxRows };
}

function toDelayedFlightsTable(answers: Answers): DelayedFlightsTableTile | null {
  const route = toRoute(
    answers.delayedFlightsTableFrom.choice,
    answers.delayedFlightsTableTo.choice,
  );
  if (route === null) {
    return null;
  }
  const maxRows = toLimit(answers.delayedFlightsTableMaxRows.choice) ?? DEFAULT_TABLE_ROWS;
  return { type: 'delayedFlightsTable', ...route, maxRows };
}

function toDelayShareChart(answers: Answers): DelayShareChartTile | null {
  const route = toRoute(answers.delayShareChartFrom.choice, answers.delayShareChartTo.choice);
  if (route === null) {
    return null;
  }
  const stated = answers.delayShareChartType.choice;
  const chartType = stated === 'NOT_DEFINED' ? 'pie' : stated;
  return { type: 'delayShareChart', ...route, chartType };
}

function toDelaysPerDayChart(answers: Answers): DelaysPerDayChartTile | null {
  const route = toRoute(answers.delaysPerDayChartFrom.choice, answers.delaysPerDayChartTo.choice);
  if (route === null) {
    return null;
  }
  return { type: 'delaysPerDayChart', ...route };
}

function toBoardingPasses(answers: Answers): BoardingPassesTile {
  const stated = toLimit(answers.boardingPassesCount.choice) ?? DEFAULT_BOARDING_PASSES;
  const count = Math.min(stated, MAX_BOARDING_PASSES);
  return { type: 'boardingPasses', count };
}

function toBookedFlightsList(answers: Answers): BookedFlightsListTile {
  const showCheckInButton = answers.bookedFlightsListWithoutCheckIn.noul <= WANTED;
  const showWeather = answers.bookedFlightsListWithoutWeather.noul <= WANTED;
  const maxRows = toLimit(answers.bookedFlightsListMaxRows.choice);
  return { type: 'bookedFlightsList', showCheckInButton, showWeather, maxRows };
}

function toFlightSearch(answers: Answers): FlightSearchTile {
  const defaultFrom = toCity(answers.flightSearchFrom.choice) ?? DEFAULT_SEARCH_FROM;
  const defaultTo = toCity(answers.flightSearchTo.choice) ?? DEFAULT_SEARCH_TO;
  return { type: 'flightSearch', defaultFrom, defaultTo };
}

function toRentalCars(answers: Answers): RentalCarsTile {
  const city = toCity(answers.rentalCarsCity.choice);
  const maxItems = toLimit(answers.rentalCarsMaxItems.choice);
  return { type: 'rentalCars', city, maxItems };
}

function toHotels(answers: Answers): HotelsTile {
  const city = toCity(answers.hotelsCity.choice);
  const maxItems = toLimit(answers.hotelsMaxItems.choice);
  return { type: 'hotels', city, maxItems };
}

function toWeatherList(answers: Answers): WeatherListTile {
  const maxRows = toLimit(answers.weatherListMaxRows.choice);
  return { type: 'weatherList', maxRows };
}

const READERS: { [T in TileType]: (answers: Answers) => Tile | null } = {
  flightsTable: toFlightsTable,
  delayedFlightsTable: toDelayedFlightsTable,
  delayShareChart: toDelayShareChart,
  delaysPerDayChart: toDelaysPerDayChart,
  boardingPasses: toBoardingPasses,
  bookedFlightsList: toBookedFlightsList,
  flightSearch: toFlightSearch,
  rentalCars: toRentalCars,
  hotels: toHotels,
  weatherList: toWeatherList,
};

const TILE_TYPES = Object.keys(READERS) as TileType[];

function byPosition(first: Placed, second: Placed): number {
  return first.position - second.position;
}

function toTiles(placed: Placed[]): Tile[] {
  const sorted = placed.toSorted(byPosition);
  return sorted.map((entry) => entry.tile);
}

function toNotes(missing: TileType[], tiles: Tile[]): string[] {
  if (missing.length > 0) {
    const labels = missing.map((type) => LABELS[type]);
    const leftOut = labels.join(' and ');
    const cities = CITY_NAMES.join(', ');
    return [
      `I left out ${leftOut}: I could not tell both cities of the route. ` +
        `I fly between these cities: ${cities}.`,
    ];
  }
  if (tiles.length === 0) {
    const labels = TILE_TYPES.map((type) => LABELS[type]);
    const known = labels.join('; ');
    return [`I could not find a tile I know in that description. I can show: ${known}.`];
  }
  return [];
}

function toPosition(answer: PositionAnswer): number {
  const weights = Object.entries(answer.probabilities);
  return weights.reduce((sum, [position, probability]) => sum + Number(position) * probability, 0);
}

function toDescribed(answers: Answers, usage: Usage): Described {
  const placed: Placed[] = [];
  const missing: TileType[] = [];

  for (const type of TILE_TYPES) {
    if (answers[type].noul <= WANTED) {
      continue;
    }
    const tile = READERS[type](answers);
    if (tile === null) {
      missing.push(type);
    } else {
      const position = toPosition(answers[`${type}Position`]);
      placed.push({ tile, position });
    }
  }

  const ordered = toTiles(placed);
  const notes = toNotes(missing, ordered);
  return { spec: { tiles: ordered }, notes, usage };
}

export async function describe(client: TypeSafeClient, description: string): Promise<Described> {
  const result = await client.systemOne({ state: { description }, questions: QUESTIONS });

  if (SHOW_JEV_RESULT) {
    const json = JSON.stringify(result, null, 2);
    console.log('Result from Jev: \n' + json + '\n');
  }

  return toDescribed(result.answers, result.usage);
}
