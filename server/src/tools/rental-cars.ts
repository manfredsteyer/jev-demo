import { toImageUrl } from './public-url.ts';
import { toSeed } from './seed.ts';

export type RentalCar = { category: string; model: string; pricePerDay: number; imageUrl: string };

type Model = { name: string; image: string };

type Template = { category: string; basePrice: number; models: Model[] };

const TEMPLATES: Template[] = [
  {
    category: 'Compact',
    basePrice: 39,
    models: [
      { name: 'VW Polo', image: 'vw-polo.webp' },
      { name: 'Opel Corsa', image: 'opel-corsa.webp' },
      { name: 'Renault Clio', image: 'renault-clio.webp' },
    ],
  },
  {
    category: 'Estate',
    basePrice: 69,
    models: [
      { name: 'Skoda Octavia', image: 'skoda-octavia.webp' },
      { name: 'VW Passat Variant', image: 'vw-passat-variant.webp' },
      { name: 'Ford Mondeo Turnier', image: 'ford-mondeo.webp' },
    ],
  },
  {
    category: 'Premium',
    basePrice: 119,
    models: [
      { name: 'BMW 5', image: 'bmw-5.webp' },
      { name: 'Mercedes E-Class', image: 'mercedes-e-class.webp' },
      { name: 'Audi A6', image: 'audi-a6.webp' },
    ],
  },
];

const PRICE_SPREAD = 15;

function toCar(city: string, template: Template): RentalCar {
  const seed = toSeed(`${city}|${template.category}`);
  const model = template.models[seed % template.models.length] ?? { name: '', image: '' };
  const pricePerDay = template.basePrice + (seed % PRICE_SPREAD);
  const imageUrl = toImageUrl('cars', model.image);
  return { category: template.category, model: model.name, pricePerDay, imageUrl };
}

export function findRentalCars(city: string): RentalCar[] {
  return TEMPLATES.map((template) => toCar(city, template));
}
