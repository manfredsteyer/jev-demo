import { choice, noul, type SystemOneResult, type TypeSafeClient, type Usage } from '@typesafe-ai/sdk';
import { CITIES, CITY_NAMES, type City } from '../cities.ts';
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
  RouteTile,
  Tile,
  TileType,
  WeatherListTile,
} from './spec.ts';

const WANTED = 0.5;

const DEFAULT_TABLE_ROWS = 30;
const DEFAULT_BOARDING_PASSES = 3;
const MAX_BOARDING_PASSES = 8;
const DEFAULT_SEARCH_FROM: City = 'Graz';
const DEFAULT_SEARCH_TO: City = 'Hamburg';

const PLACES = {
  ...CITIES,
  'NOT_DEFINED': 'No city is named for this.',
  'NOT_SUPPORTED': 'A city is named, but it is not one of the cities listed here.',
} as const;

const LIMITS = {
  '1': null, '2': null, '3': null, '4': null, '5': null,
  '6': null, '7': null, '8': null, '9': null, '10': null,
  '11': null, '12': null, '13': null, '14': null, '15': null,
  'NOT_DEFINED': 'No number is stated for this tile.',
} as const;

const CHART_TYPES = {
  'pie': 'A pie chart.',
  'bar': 'A bar chart.',
  'NOT_DEFINED': 'No kind of chart is stated for this tile.',
} as const;

const LABELS: { [T in TileType]: string } = {
  flightsTable: 'the table of all flights on a route',
  delayedFlightsTable: 'the table of only the delayed flights on a route',
  delayShareChart: 'the chart of the overall share of delayed and on-time flights on a route',
  delaysPerDayChart: 'the chart of delayed and on-time flights per day on a route',
  boardingPasses: "the boarding passes for the traveller's next booked flights",
  bookedFlightsList: 'the list of the flights the traveller has booked',
  flightSearch: 'the form to search for flights',
  rentalCars: 'the list of rental cars',
  hotels: 'the list of hotels',
  weatherList: "the list of weather forecasts for the traveller's destinations",
};

const DESCRIPTION = '`description` is what a traveller wants to see on their flight dashboard.';

function departureOf(tile: string) {
  return choice(
    `${DESCRIPTION} Which city do the flights in ${tile} depart from? A route stated once ` +
      'for several tiles applies to each of them. When the same tiles are asked for again ' +
      'in the opposite direction, answer for the direction named first.',
    PLACES,
  );
}

function destinationOf(tile: string) {
  return choice(
    `${DESCRIPTION} Which city do the flights in ${tile} arrive in? A route stated once ` +
      'for several tiles applies to each of them. When the same tiles are asked for again ' +
      'in the opposite direction, answer for the direction named first.',
    PLACES,
  );
}

function limitOf(tile: string) {
  return choice(
    `${DESCRIPTION} How many entries at most does it allow in ${tile}? Answer NOT_DEFINED ` +
      'unless it states a number for this very tile.',
    LIMITS,
  );
}

function cityOf(tile: string) {
  return choice(`${DESCRIPTION} Which city does it name for ${tile}?`, PLACES);
}

const QUESTIONS = {
  flightsTable: noul(
    `${DESCRIPTION} Does it ask for a table or list of the flights on a route, not ` +
      'restricted to the delayed ones?',
    {
      true: 'It wants the flights between two cities listed, whether they are delayed or not.',
      false:
        "It does not. Asking only for the delayed flights does not count. The traveller's " +
        'own booked flights do not count. A form to search for flights does not count.',
    },
  ),
  flightsTableFrom: departureOf(LABELS.flightsTable),
  flightsTableTo: destinationOf(LABELS.flightsTable),
  flightsTableMaxRows: limitOf(LABELS.flightsTable),

  delayedFlightsTable: noul(
    `${DESCRIPTION} Does it ask to show the delayed flights on a route as a table or list?`,
    {
      true: 'It wants the delayed flights of a route listed, on their own or next to all flights.',
      false: 'It does not. A chart about delays does not count.',
    },
  ),
  delayedFlightsTableFrom: departureOf(LABELS.delayedFlightsTable),
  delayedFlightsTableTo: destinationOf(LABELS.delayedFlightsTable),
  delayedFlightsTableMaxRows: limitOf(LABELS.delayedFlightsTable),

  delayShareChart: noul(
    `${DESCRIPTION} Does it want a chart of the share of delayed flights on a route?`,
    {
      true: 'It wants the share or ratio of delayed flights over the whole route as a chart.',
      false: 'It does not. A chart of the delays per day does not count.',
    },
  ),
  delayShareChartFrom: departureOf(LABELS.delayShareChart),
  delayShareChartTo: destinationOf(LABELS.delayShareChart),
  delayShareChartType: choice(
    `${DESCRIPTION} Which kind of chart does it ask for to show ${LABELS.delayShareChart}?`,
    CHART_TYPES,
  ),

  delaysPerDayChart: noul(
    `${DESCRIPTION} Does it want a chart that breaks the delays on a route down by day?`,
  ),
  delaysPerDayChartFrom: departureOf(LABELS.delaysPerDayChart),
  delaysPerDayChartTo: destinationOf(LABELS.delaysPerDayChart),

  reverse: noul(
    `${DESCRIPTION} Does it ask to show the tiles about a route a second time for the ` +
      'opposite direction?',
    {
      true: 'It asks for the same tiles again with departure and destination swapped.',
      false: 'Every route is shown in one direction only.',
    },
  ),

  boardingPasses: noul(
    `${DESCRIPTION} Does it ask for boarding passes or tickets for the traveller's next ` +
      'booked flights?',
  ),
  boardingPassesCount: choice(
    `${DESCRIPTION} For how many of the traveller's next booked flights does it ask for a ` +
      'boarding pass? Answer NOT_DEFINED unless it states a number for the boarding passes.',
    LIMITS,
  ),

  bookedFlightsList: noul(
    `${DESCRIPTION} Does it ask for a list of the flights the traveller has booked?`,
    {
      true: 'It wants the booked flights listed, with or without a check-in button.',
      false:
        'It does not. Asking only for boarding passes does not count, and neither does ' +
        'asking only for weather forecasts.',
    },
  ),
  bookedFlightsListMaxRows: limitOf(LABELS.bookedFlightsList),
  bookedFlightsListWithoutCheckIn: noul(
    `${DESCRIPTION} Does it say to leave the check-in button out of ${LABELS.bookedFlightsList}?`,
  ),
  bookedFlightsListWithoutWeather: noul(
    `${DESCRIPTION} Does it say to leave the weather forecast out of ${LABELS.bookedFlightsList}?`,
  ),

  flightSearch: noul(`${DESCRIPTION} Does it ask for a form to search for flights?`, {
    true: 'It wants input fields for a departure and a destination and a way to search.',
    false: 'It does not. A table of the flights on a route does not count.',
  }),
  flightSearchFrom: choice(
    `${DESCRIPTION} It may ask for a form to search for flights, with a departure field ` +
      'and a destination field. Which city does it want in the departure field? When it ' +
      'names two cities for the form, the first one is the departure.',
    PLACES,
  ),
  flightSearchTo: choice(
    `${DESCRIPTION} It may ask for a form to search for flights, with a departure field ` +
      'and a destination field. Which city does it want in the destination field? When it ' +
      'names two cities for the form, the second one is the destination.',
    PLACES,
  ),

  rentalCars: noul(`${DESCRIPTION} Does it ask for rental cars?`),
  rentalCarsCity: cityOf(LABELS.rentalCars),
  rentalCarsMaxItems: limitOf(LABELS.rentalCars),

  hotels: noul(`${DESCRIPTION} Does it ask for hotels?`),
  hotelsCity: cityOf(LABELS.hotels),
  hotelsMaxItems: limitOf(LABELS.hotels),

  weatherList: noul(
    `${DESCRIPTION} Does it ask for weather forecasts for the places the traveller is ` +
      'flying to?',
  ),
  weatherListMaxRows: limitOf(LABELS.weatherList),
};

type Answers = SystemOneResult<typeof QUESTIONS>['answers'];

type Place = keyof typeof PLACES;

type Limit = keyof typeof LIMITS;

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

function isRouteTile(tile: Tile): tile is RouteTile {
  return 'from' in tile;
}

function toReverse(tile: RouteTile): RouteTile {
  return { ...tile, from: tile.to, to: tile.from };
}

function inOrder(tiles: Tile[], reverse: boolean): Tile[] {
  const routeTiles = tiles.filter(isRouteTile);
  const returnTiles = reverse ? routeTiles.map(toReverse) : [];
  const otherTiles = tiles.filter((tile) => !isRouteTile(tile));
  return [...routeTiles, ...returnTiles, ...otherTiles];
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

function toDescribed(answers: Answers, usage: Usage): Described {
  const tiles: Tile[] = [];
  const missing: TileType[] = [];

  for (const type of TILE_TYPES) {
    if (answers[type].noul <= WANTED) {
      continue;
    }
    const tile = READERS[type](answers);
    if (tile === null) {
      missing.push(type);
    } else {
      tiles.push(tile);
    }
  }

  const reverse = answers.reverse.noul > WANTED;
  const ordered = inOrder(tiles, reverse);
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
