import type { PlayerId } from "../rotation/types";
import { CostSplitError, type Settlement } from "./types";

/** Currency units (12.34) to integer cents (1234). */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new CostSplitError(`Amount must be a finite number, got ${amount}.`);
  }
  // `toFixed` first, because 12.345 * 100 lands on 1234.4999999999998 and would round down.
  return Math.round(Number.parseFloat((amount * 100).toFixed(4)));
}

/** Integer cents back to currency units, for display only. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Splits `totalCents` across `weights` by the largest-remainder method: everyone gets their floor,
 * then the leftover cents go to whoever was rounded down hardest. The result always sums to exactly
 * `totalCents`, which naive rounding does not.
 *
 * With no positive weight to go on — nobody played a single rotation — it falls back to an even
 * split rather than silently charging nobody.
 */
export function allocate(totalCents: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];
  if (!Number.isInteger(totalCents)) {
    throw new CostSplitError(`Total must be an integer number of cents, got ${totalCents}.`);
  }
  if (weights.some((weight) => weight < 0 || !Number.isFinite(weight))) {
    throw new CostSplitError("Weights must be non-negative finite numbers.");
  }

  const effective = weights.some((weight) => weight > 0) ? weights : weights.map(() => 1);
  const totalWeight = effective.reduce((sum, weight) => sum + weight, 0);

  const exact = effective.map((weight) => (totalCents * weight) / totalWeight);
  const shares = exact.map(Math.floor);
  const leftover = totalCents - shares.reduce((sum, share) => sum + share, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let i = 0; i < leftover; i++) {
    shares[byRemainder[i].index] += 1;
  }
  return shares;
}

export interface Balance {
  readonly playerId: PlayerId;
  /** Positive: owes money. Negative: is owed money. */
  readonly netCents: number;
}

/**
 * Turns net balances into the actual transfers. Greedy largest-debtor-to-largest-creditor, which
 * for the usual case — one person fronted everything — collapses to "everyone pays that person".
 */
export function settle(balances: readonly Balance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ playerId: b.playerId, remaining: b.netCents }))
    .sort((a, b) => b.remaining - a.remaining || a.playerId.localeCompare(b.playerId));
  const creditors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ playerId: b.playerId, remaining: -b.netCents }))
    .sort((a, b) => b.remaining - a.remaining || a.playerId.localeCompare(b.playerId));

  const settlements: Settlement[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amountCents = Math.min(debtors[d].remaining, creditors[c].remaining);
    if (amountCents > 0) {
      settlements.push({ from: debtors[d].playerId, to: creditors[c].playerId, amountCents });
    }
    debtors[d].remaining -= amountCents;
    creditors[c].remaining -= amountCents;
    if (debtors[d].remaining === 0) d++;
    if (creditors[c].remaining === 0) c++;
  }
  return settlements;
}
