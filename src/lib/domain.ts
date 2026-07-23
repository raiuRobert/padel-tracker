import type { CourtBooking, Extra } from "./cost/types";
import type { Match, PlayerId, RotationMode } from "./rotation/types";
import type { MatchResult } from "./standings";

/**
 * The entities the app stores. Plain data with no methods and no storage awareness, so the same
 * shapes serialise into IndexedDB today and a real backend later.
 */

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  /**
   * Removed from the roster but kept for name lookups. Someone who has played in a past session
   * can't simply be deleted, or that session's standings lose a name.
   */
  readonly archived: boolean;
  readonly createdAt: string;
}

/** A saved set of regulars, so a session doesn't start with re-typing eight names. */
export interface Group {
  readonly id: string;
  readonly name: string;
  readonly playerIds: readonly PlayerId[];
  readonly createdAt: string;
}

/** A round as stored: the fixture plus whatever score has been entered so far. */
export interface SessionRound {
  readonly index: number;
  readonly matches: readonly Match[];
  readonly sittingOut: readonly PlayerId[];
  /** One entry per court once scored. Empty while the round is still being played. */
  readonly results: readonly MatchResult[];
}

export type SessionStatus = "active" | "finished";

export interface Session {
  readonly id: string;
  /** ISO date of the outing (not the creation timestamp). */
  readonly date: string;
  readonly groupId?: string;
  readonly playerIds: readonly PlayerId[];
  readonly courts: number;
  readonly mode: RotationMode;
  /** Planned length. Free-form rather than a 2/3/4 dropdown — sessions do overrun. */
  readonly hours: number;
  /** Games that win a rotation. */
  readonly gamesToWin: number;
  readonly bookings: readonly CourtBooking[];
  /** Who fronted the court fee. */
  readonly paidBy?: PlayerId;
  readonly rounds: readonly SessionRound[];
  readonly extras: readonly Extra[];
  readonly status: SessionStatus;
  readonly createdAt: string;
}

/** Fields set when a session is created; everything else starts empty. */
export interface NewSession {
  readonly date: string;
  readonly groupId?: string;
  readonly playerIds: readonly PlayerId[];
  readonly courts: number;
  readonly mode: RotationMode;
  readonly hours: number;
  readonly gamesToWin: number;
  readonly bookings: readonly CourtBooking[];
  readonly paidBy?: PlayerId;
}

export const DEFAULT_HOURS = 2;
export const DEFAULT_GAMES_TO_WIN = 6;

/** A rotation runs roughly a quarter of an hour, so four an hour is a sensible starting point. */
export const ROUNDS_PER_HOUR = 4;

export function suggestedRoundCount(hours: number): number {
  return Math.max(1, Math.round(hours * ROUNDS_PER_HOUR));
}
