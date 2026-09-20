import type { City } from '../../cities.ts';
import type { TileView } from '../a2ui.ts';
import type { HotelsTile, RentalCarsTile } from '../spec.ts';
import type { Tools } from '../tools.ts';
import { findNextFlights } from './bookings.ts';
import { toPhotoList, toTile } from './layout.ts';

const FALLBACK_CITY = 'Hamburg';

async function toOfferCity(city: City | null, tools: Tools): Promise<string> {
  if (city !== null) {
    return city;
  }
  const nextFlights = await findNextFlights(tools, 1);
  return nextFlights[0]?.to ?? FALLBACK_CITY;
}

function limit<T>(items: T[], max: number | null): T[] {
  return max === null ? items : items.slice(0, max);
}

export async function toHotels(id: string, tile: HotelsTile, tools: Tools): Promise<TileView> {
  const city = await toOfferCity(tile.city, tools);
  const hotels = await tools.findHotels(city);
  const shown = limit(hotels, tile.maxItems);

  const photos = shown.map((hotel) => {
    const stars = '★'.repeat(hotel.stars);
    const subtitle = `${stars} · from ${hotel.pricePerNight} € / night`;
    return { imageUrl: hotel.imageUrl, title: hotel.name, subtitle };
  });
  const list = toPhotoList(`${id}-list`, photos);
  return toTile(id, `Hotels in ${city}`, [list]);
}

export async function toRentalCars(
  id: string,
  tile: RentalCarsTile,
  tools: Tools,
): Promise<TileView> {
  const city = await toOfferCity(tile.city, tools);
  const cars = await tools.findRentalCars(city);
  const shown = limit(cars, tile.maxItems);

  const photos = shown.map((car) => {
    const subtitle = `${car.category} · from ${car.pricePerDay} € / day`;
    return { imageUrl: car.imageUrl, title: car.model, subtitle };
  });
  const list = toPhotoList(`${id}-list`, photos);
  return toTile(id, `Rent a car in ${city}`, [list]);
}
