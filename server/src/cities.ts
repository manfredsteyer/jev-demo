export const CITIES = {
  'Berlin': null, 'Bremen': null, 'Dresden': null, 'Frankfurt': null,
  'Graz': null, 'Hamburg': null, 'Innsbruck': null, 'Linz': null,
  'London': null, 'München': null, 'Paris': null, 'Rome': null,
  'Salzburg': null, 'Stuttgart': null, 'Wien': null, 'Zürich': null,
} as const;

export type City = keyof typeof CITIES;

export const CITY_NAMES = Object.keys(CITIES) as City[];
