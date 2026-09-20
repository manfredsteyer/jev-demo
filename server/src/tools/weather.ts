import { toSeed } from './seed.ts';

const CONDITIONS = ['Sunny', 'Cloudy', 'Rainy'] as const;

export type Condition = (typeof CONDITIONS)[number];

export type Forecast = { city: string; date: string; condition: Condition; temperature: number };

const MIN_TEMPERATURE = 4;
const TEMPERATURE_RANGE = 24;

export function getForecast(city: string, date: string): Forecast {
  const day = date.slice(0, 10);
  const seed = toSeed(`${city}|${day}`);
  const condition = CONDITIONS[seed % CONDITIONS.length] ?? 'Sunny';
  const temperature = MIN_TEMPERATURE + (seed % TEMPERATURE_RANGE);
  return { city, date: day, condition, temperature };
}
