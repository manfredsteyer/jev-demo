const checkedInFlightIds = new Set<number>();

export type CheckIn = { flightId: number; checkedIn: boolean };

export function checkIn(flightId: number): CheckIn {
  checkedInFlightIds.add(flightId);
  return { flightId, checkedIn: true };
}

export function isCheckedIn(flightId: number): boolean {
  return checkedInFlightIds.has(flightId);
}
