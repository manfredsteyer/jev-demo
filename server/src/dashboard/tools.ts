import { randomUUID } from 'node:crypto';
import { emitToolCall, emitToolCallResult, type Emit, type Json } from '../ag-ui.ts';
import { getBookedFlights } from '../tools/bookings.ts';
import { checkIn, type CheckIn } from '../tools/check-in.ts';
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
  checkIn: (flightId: number) => Promise<CheckIn>;
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
  const calls = new Map<string, Promise<unknown>>();

  function once<T>(name: string, args: Json, tool: Tool<T>, summarize: Summary<T>): Promise<T> {
    const key = name + JSON.stringify(args);
    const known = calls.get(key) as Promise<T> | undefined;
    if (known !== undefined) {
      return known;
    }
    const call = announce(name, args, tool, summarize, emit);
    calls.set(key, call);
    return call;
  }

  return {
    findFlights: (from, to) => {
      const tool = () => searchFlights(from, to);
      return once('findFlights', { from, to }, tool, toCount);
    },
    findBookings: () => {
      const tool = () => getBookedFlights(null, null);
      return once('findBookings', {}, tool, toCount);
    },
    getForecast: (city, date) => {
      const day = date.slice(0, 10);
      const tool = () => getForecast(city, day);
      return once('getForecast', { city, date: day }, tool, asIs);
    },
    findHotels: (city) => {
      const tool = () => findHotels(city);
      return once('findHotels', { city }, tool, toCount);
    },
    findRentalCars: (city) => {
      const tool = () => findRentalCars(city);
      return once('findRentalCars', { city }, tool, toCount);
    },
    checkIn: (flightId) => {
      const tool = () => checkIn(flightId);
      return once('checkIn', { flightId }, tool, asIs);
    },
  };
}
