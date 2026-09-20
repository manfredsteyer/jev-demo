export type Flight = {
  id: number;
  from: string;
  to: string;
  date: string;
  delayed: boolean;
  delay: number;
  aircraft: { type: string; registration: string };
  prices: { flightClass: string; amount: number }[];
};

export async function searchFlights(from: string, to: string): Promise<Flight[]> {
  const query = new URLSearchParams({ from, to });
  const response = await fetch(`https://demo.angulararchitects.io/api/flight?${query}`);
  if (!response.ok) {
    throw new Error(`Flight API answered ${response.status}`);
  }
  return (await response.json()) as Flight[];
}
