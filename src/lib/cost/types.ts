import type { PlayerId } from "../rotation/types";

/**
 * All money in this module is integer minor units (cents). Splitting a court fee across an awkward
 * number of people is exactly the case where floating point starts losing cents, and "the shares
 * must add up to the bill" is the one property that has to hold every time.
 *
 * Callers convert at the edges: `toCents` on the way in, formatting on the way out.
 */

export interface CourtBooking {
  /** 1-based court number. */
  readonly court: number;
  readonly costCents: number;
  /** Informational — two courts can be booked for different lengths of time. */
  readonly hours: number;
}

/** How much of the session a player was actually present for. */
export interface PlayerParticipation {
  readonly playerId: PlayerId;
  /** Rotations they were on court for. This is the proxy for time played. */
  readonly roundsPlayed: number;
}

/** Something bought during the session — a drink from the fridge, snacks, a tube of balls. */
export interface Extra {
  readonly id: string;
  readonly description: string;
  readonly costCents: number;
  /** Billed to these players, split evenly between them. Never implicitly everyone. */
  readonly billedTo: readonly PlayerId[];
  /** Who fronted it, if not whoever fronted the court. */
  readonly paidBy?: PlayerId;
}

export interface ExtraShare {
  readonly extraId: string;
  readonly description: string;
  readonly shareCents: number;
}

export interface PlayerCostBreakdown {
  readonly playerId: PlayerId;
  readonly roundsPlayed: number;
  /** Their slice of the court fee, proportional to rounds played. */
  readonly courtShareCents: number;
  readonly extrasCents: number;
  /** Itemised so the summary can show *why* the extras total is what it is. */
  readonly extras: readonly ExtraShare[];
  readonly totalCents: number;
  /** Money they fronted on the group's behalf — court fee and/or extras. */
  readonly paidCents: number;
  /** Positive: they owe. Negative: they're owed. */
  readonly netCents: number;
}

/** One transfer needed to square everyone up. */
export interface Settlement {
  readonly from: PlayerId;
  readonly to: PlayerId;
  readonly amountCents: number;
}

export interface CostSplit {
  readonly courtCostCents: number;
  readonly extrasCostCents: number;
  readonly grandTotalCents: number;
  readonly totalHours: number;
  readonly perPlayer: readonly PlayerCostBreakdown[];
  readonly settlements: readonly Settlement[];
}

export class CostSplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostSplitError";
  }
}
