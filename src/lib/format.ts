/** Display helpers. Pure, so they're reusable and don't drag in any UI framework. */

/** Change this (or lift it into session settings) if the group plays somewhere else. */
export const CURRENCY = "€";

/** Integer cents to a display string, e.g. 1050 -> "€10.50". */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${CURRENCY}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

/** Cents to a bare decimal, for prefilling number inputs. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** "Ana & Ben" reads better than "Ana, Ben" for a padel pair. */
export function formatPair(names: readonly string[]): string {
  return names.join(" & ");
}
