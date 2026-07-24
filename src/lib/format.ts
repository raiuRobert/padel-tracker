/** Display helpers. Pure, so they're reusable and don't drag in any UI framework. */

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
