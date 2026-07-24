import type { CourtBooking } from "./types";

/**
 * Court cost is entered as a per-hour rate, because that's how courts are actually priced. The
 * total the split works off is just the rate times the hours booked.
 */
export function courtCostCents(ratePerHourCents: number, hours: number): number {
  return Math.round(ratePerHourCents * hours);
}

/**
 * The per-hour rate for a booking. Prefers the stored rate; for sessions saved before per-hour
 * pricing existed, it recovers the rate from the total and the hours.
 */
export function ratePerHourCents(booking: CourtBooking): number {
  if (booking.ratePerHourCents !== undefined) return booking.ratePerHourCents;
  return booking.hours > 0 ? Math.round(booking.costCents / booking.hours) : booking.costCents;
}
