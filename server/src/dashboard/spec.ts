import type { City } from '../cities.ts';

export type Route = { from: City; to: City };

export type ChartType = 'pie' | 'bar';

export type FlightsTableTile = Route & { type: 'flightsTable'; maxRows: number };

export type DelayedFlightsTableTile = Route & { type: 'delayedFlightsTable'; maxRows: number };

export type DelayShareChartTile = Route & { type: 'delayShareChart'; chartType: ChartType };

export type DelaysPerDayChartTile = Route & { type: 'delaysPerDayChart' };

export type BoardingPassesTile = { type: 'boardingPasses'; count: number };

export type BookedFlightsListTile = {
  type: 'bookedFlightsList';
  showCheckInButton: boolean;
  showWeather: boolean;
  maxRows: number | null;
};

export type FlightSearchTile = { type: 'flightSearch'; defaultFrom: City; defaultTo: City };

export type RentalCarsTile = { type: 'rentalCars'; city: City | null; maxItems: number | null };

export type HotelsTile = { type: 'hotels'; city: City | null; maxItems: number | null };

export type WeatherListTile = { type: 'weatherList'; maxRows: number | null };

export type RouteTile =
  | FlightsTableTile
  | DelayedFlightsTableTile
  | DelayShareChartTile
  | DelaysPerDayChartTile;

export type Tile =
  | RouteTile
  | BoardingPassesTile
  | BookedFlightsListTile
  | FlightSearchTile
  | RentalCarsTile
  | HotelsTile
  | WeatherListTile;

export type TileType = Tile['type'];

export type DashboardSpec = { tiles: Tile[] };
