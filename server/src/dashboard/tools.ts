import { randomUUID } from 'node:crypto';
import { emitToolCall, emitToolCallResult, type Emit, type Json } from '../ag-ui.ts';
import { getBookedFlights } from '../tools/bookings.ts';
import { searchFlights, type Flight } from '../tools/flights.ts';
import { findHotels, type Hotel } from '../tools/hotels.ts';
import { findRentalCars, type RentalCar } from '../tools/rental-cars.ts';
import { getForecast, type Forecast } from '../tools/weather.ts';

export type Tools = {
  findFlights: (from: string, to: string) => Promise<Flight[]>;
  findBookings: () => Promise<Flight[]>;
  getForecast: (city: string, date: string) => Promise<Forecast>;
  findHotels: (city: string) => Promise<Hotel[]>;
  findRentalCars: (city: string) => Promise<RentalCar[]>;
};

type Tool<T> = () => Promise<T> | T;

type Summary<T> = (result: T) => unknown;

function toCount(items: unknown[]): unknown {
  return { count: items.length };
}

function asIs(result: unknown): unknown {
  return result;
}

async function announce<T>(
  name: string,
  args: Json,
  tool: Tool<T>,
  summarize: Summary<T>,
  emit: Emit,
): Promise<T> {
  const toolCallId = randomUUID();
  emitToolCall(toolCallId, name, args, emit);

  const result = await tool();

  const summary = summarize(result);
  emitToolCallResult(toolCallId, summary, emit);
  return result;
}

export function createTools(emit: Emit): Tools {
  return {
    findFlights: (from, to) => {
      const tool = () => searchFlights(from, to);
      return announce('findFlights', { from, to }, tool, toCount, emit);
    },
    findBookings: () => {
      const tool = () => getBookedFlights(null, null);
      return announce('findBookings', {}, tool, toCount, emit);
    },
    getForecast: (city, date) => {
      const day = date.slice(0, 10);
      const tool = () => getForecast(city, day);
      return announce('getForecast', { city, date: day }, tool, asIs, emit);
    },
    findHotels: (city) => {
      const tool = () => findHotels(city);
      return announce('findHotels', { city }, tool, toCount, emit);
    },
    findRentalCars: (city) => {
      const tool = () => findRentalCars(city);
      return announce('findRentalCars', { city }, tool, toCount, emit);
    },
  };
}
