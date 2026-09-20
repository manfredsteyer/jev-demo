import { toImageUrl } from './public-url.ts';
import { toSeed } from './seed.ts';

export type Hotel = { name: string; stars: number; pricePerNight: number; imageUrl: string };

type Template = { name: string; stars: number; basePrice: number; image: string };

const TEMPLATES: Template[] = [
  { name: 'Grand Hotel', stars: 5, basePrice: 260, image: 'hotel-luxury.webp' },
  { name: 'Old Town Suites', stars: 4, basePrice: 170, image: 'hotel-interior.webp' },
  { name: 'Riverside Hotel', stars: 4, basePrice: 150, image: 'hotel-exterior.webp' },
  { name: 'Central Inn', stars: 3, basePrice: 95, image: 'hotel-lobby.webp' },
];

const PRICE_SPREAD = 40;

export function findHotels(city: string): Hotel[] {
  return TEMPLATES.map((template) => {
    const seed = toSeed(`${city}|${template.name}`);
    const pricePerNight = template.basePrice + (seed % PRICE_SPREAD);
    const imageUrl = toImageUrl('hotels', template.image);
    return { name: template.name, stars: template.stars, pricePerNight, imageUrl };
  });
}
