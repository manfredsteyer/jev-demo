import { choice, noul, type ChoiceResponse, type SystemOneResult } from '@typesafe-ai/sdk';
import { CITIES } from '../cities.ts';
import type { TileType } from './model.ts';

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

const POSITIONS = {
  '1': null, '2': null, '3': null, '4': null, '5': null,
  '6': null, '7': null, '8': null, '9': null, '10': null,
  '11': null, '12': null, '13': null, '14': null, '15': null,
  '16': null, '17': null, '18': null, '19': null, '20': null,
} as const;

const CHART_TYPES = {
  'pie': 'A pie chart.',
  'bar': 'A bar chart.',
  'NOT_DEFINED': 'No kind of chart is stated for this tile.',
} as const;

export const LABELS: { [T in TileType]: string } = {
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
      'for several tiles applies to each of them.',
    PLACES,
  );
}

function destinationOf(tile: string) {
  return choice(
    `${DESCRIPTION} Which city do the flights in ${tile} arrive in? A route stated once ` +
      'for several tiles applies to each of them.',
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

const ONE_AFTER_ANOTHER = 'It asks for several tiles, one after another.';

const COUNTING = '1 means it is the first tile asked for. Count only the tiles it asks for.';

function positionOf(tile: string) {
  return choice(
    `${DESCRIPTION} ${ONE_AFTER_ANOTHER} At which position does it ask for ${tile}? ${COUNTING}`,
    POSITIONS,
  );
}

export const QUESTIONS = {
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
  flightsTablePosition: positionOf(LABELS.flightsTable),

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
  delayedFlightsTablePosition: positionOf(LABELS.delayedFlightsTable),

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
  delayShareChartPosition: positionOf(LABELS.delayShareChart),

  delaysPerDayChart: noul(
    `${DESCRIPTION} Does it want a chart that breaks the delays on a route down by day?`,
  ),
  delaysPerDayChartFrom: departureOf(LABELS.delaysPerDayChart),
  delaysPerDayChartTo: destinationOf(LABELS.delaysPerDayChart),
  delaysPerDayChartPosition: positionOf(LABELS.delaysPerDayChart),

  boardingPasses: noul(
    `${DESCRIPTION} Does it ask for boarding passes or tickets for the traveller's next ` +
      'booked flights?',
  ),
  boardingPassesCount: choice(
    `${DESCRIPTION} For how many of the traveller's next booked flights does it ask for a ` +
      'boarding pass? Answer NOT_DEFINED unless it states a number for the boarding passes.',
    LIMITS,
  ),
  boardingPassesPosition: positionOf(LABELS.boardingPasses),

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
  bookedFlightsListPosition: positionOf(LABELS.bookedFlightsList),
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
  flightSearchPosition: positionOf(LABELS.flightSearch),

  rentalCars: noul(`${DESCRIPTION} Does it ask for rental cars?`),
  rentalCarsCity: cityOf(LABELS.rentalCars),
  rentalCarsMaxItems: limitOf(LABELS.rentalCars),
  rentalCarsPosition: positionOf(LABELS.rentalCars),

  hotels: noul(`${DESCRIPTION} Does it ask for hotels?`),
  hotelsCity: cityOf(LABELS.hotels),
  hotelsMaxItems: limitOf(LABELS.hotels),
  hotelsPosition: positionOf(LABELS.hotels),

  weatherList: noul(
    `${DESCRIPTION} Does it ask for weather forecasts for the places the traveller is ` +
      'flying to?',
  ),
  weatherListMaxRows: limitOf(LABELS.weatherList),
  weatherListPosition: positionOf(LABELS.weatherList),
};

export type Answers = SystemOneResult<typeof QUESTIONS>['answers'];

export type Place = keyof typeof PLACES;

export type Limit = keyof typeof LIMITS;

export type PositionAnswer = ChoiceResponse<typeof POSITIONS>;
