import type { Flight } from './flights.ts';

const BOOKED_FLIGHT_IDS = [1, 2, 3];

let bookedFlights: Promise<Flight[]> | null = null;

async function fetchFlight(id: number): Promise<Flight> {
  const response = await fetch(`https://demo.angulararchitects.io/api/flight/${id}`);
  if (!response.ok) {
    throw new Error(`Flight API answered ${response.status} for flight ${id}`);
  }
  return (await response.json()) as Flight;
}

function loadBookings(): Promise<Flight[]> {
  const flights = BOOKED_FLIGHT_IDS.map((id) => fetchFlight(id));
  return Promise.all(flights);
}

async function getBookings(): Promise<Flight[]> {
  if (bookedFlights === null) {
    bookedFlights = loadBookings();
  }
  try {
    return await bookedFlights;
  } catch (error) {
    bookedFlights = null;
    throw error;
  }
}

export async function getBookedFlights(
  from: string | null,
  to: string | null,
): Promise<Flight[]> {
  const flights = await getBookings();
  return flights.filter(
    (flight) => (from === null || flight.from === from) && (to === null || flight.to === to),
  );
}
