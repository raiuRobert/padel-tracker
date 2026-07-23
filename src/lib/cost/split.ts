import type { PlayerId } from "../rotation/types";
import { allocate, settle, type Balance } from "./money";
import {
  CostSplitError,
  type CostSplit,
  type CourtBooking,
  type Extra,
  type ExtraShare,
  type PlayerCostBreakdown,
  type PlayerParticipation,
} from "./types";

export interface CostSplitOptions {
  /** Everyone in the session, including anyone who ended up playing zero rotations. */
  readonly players: readonly PlayerId[];
  /** One entry per booked court. Two courts booked for different lengths get one entry each. */
  readonly bookings: readonly CourtBooking[];
  readonly participation: readonly PlayerParticipation[];
  readonly extras?: readonly Extra[];
  /** Who fronted the court fee, and by default the extras too. */
  readonly paidBy?: PlayerId;
}

function assertKnownPlayer(playerId: PlayerId, known: ReadonlySet<PlayerId>, context: string): void {
  if (!known.has(playerId)) {
    throw new CostSplitError(`${context} refers to "${playerId}", who isn't in this session.`);
  }
}

function validate(options: CostSplitOptions, known: ReadonlySet<PlayerId>): void {
  if (options.players.length === 0) {
    throw new CostSplitError("A session needs at least one player to split costs between.");
  }
  if (known.size !== options.players.length) {
    throw new CostSplitError("Session contains duplicate players.");
  }

  for (const booking of options.bookings) {
    if (!Number.isInteger(booking.costCents) || booking.costCents < 0) {
      throw new CostSplitError(`Court ${booking.court} cost must be a non-negative integer of cents.`);
    }
    if (!Number.isFinite(booking.hours) || booking.hours < 0) {
      throw new CostSplitError(`Court ${booking.court} hours must be a non-negative number.`);
    }
  }

  for (const entry of options.participation) {
    assertKnownPlayer(entry.playerId, known, "Participation");
    if (!Number.isInteger(entry.roundsPlayed) || entry.roundsPlayed < 0) {
      throw new CostSplitError(`Rounds played for "${entry.playerId}" must be a non-negative integer.`);
    }
  }

  for (const extra of options.extras ?? []) {
    if (!Number.isInteger(extra.costCents) || extra.costCents < 0) {
      throw new CostSplitError(`Extra "${extra.description}" cost must be a non-negative integer of cents.`);
    }
    if (extra.billedTo.length === 0) {
      throw new CostSplitError(`Extra "${extra.description}" must be billed to at least one player.`);
    }
    if (new Set(extra.billedTo).size !== extra.billedTo.length) {
      throw new CostSplitError(`Extra "${extra.description}" bills the same player more than once.`);
    }
    for (const playerId of extra.billedTo) {
      assertKnownPlayer(playerId, known, `Extra "${extra.description}"`);
    }
    if (extra.paidBy) assertKnownPlayer(extra.paidBy, known, `Extra "${extra.description}" payer`);
  }

  if (options.paidBy) assertKnownPlayer(options.paidBy, known, "Court payer");
}

/**
 * Works out who owes what.
 *
 * The court fee is pooled across all booked courts and split in proportion to rotations played, so
 * arriving late or leaving early costs you less. Extras are billed only to the people who actually
 * had them. The two are reported separately so the summary can show why a total is what it is.
 *
 * Pooling the court fee — rather than charging each court to the four people on it — is deliberate:
 * it's one group settling one bill, and a group shouldn't pay more because their court happened to
 * be booked for longer.
 */
export function splitCosts(options: CostSplitOptions): CostSplit {
  const { players, bookings, participation, extras = [], paidBy } = options;
  const known = new Set(players);
  validate(options, known);

  const roundsByPlayer = new Map<PlayerId, number>(players.map((id) => [id, 0]));
  for (const entry of participation) {
    roundsByPlayer.set(entry.playerId, entry.roundsPlayed);
  }

  const courtCostCents = bookings.reduce((sum, booking) => sum + booking.costCents, 0);
  const totalHours = bookings.reduce((sum, booking) => sum + booking.hours, 0);

  const courtShares = allocate(
    courtCostCents,
    players.map((id) => roundsByPlayer.get(id)!),
  );

  // Each extra is split evenly between exactly the people it was billed to.
  const extraShares = new Map<PlayerId, ExtraShare[]>(players.map((id) => [id, []]));
  const paidByPlayer = new Map<PlayerId, number>(players.map((id) => [id, 0]));
  let extrasCostCents = 0;

  for (const extra of extras) {
    extrasCostCents += extra.costCents;
    const shares = allocate(
      extra.costCents,
      extra.billedTo.map(() => 1),
    );
    extra.billedTo.forEach((playerId, index) => {
      extraShares.get(playerId)!.push({
        extraId: extra.id,
        description: extra.description,
        shareCents: shares[index],
      });
    });

    const payer = extra.paidBy ?? paidBy;
    if (payer) paidByPlayer.set(payer, paidByPlayer.get(payer)! + extra.costCents);
  }

  if (paidBy) paidByPlayer.set(paidBy, paidByPlayer.get(paidBy)! + courtCostCents);

  const perPlayer: PlayerCostBreakdown[] = players.map((playerId, index) => {
    const itemised = extraShares.get(playerId)!;
    const extrasCents = itemised.reduce((sum, share) => sum + share.shareCents, 0);
    const courtShareCents = courtShares[index];
    const totalCents = courtShareCents + extrasCents;
    const paidCents = paidByPlayer.get(playerId)!;
    return {
      playerId,
      roundsPlayed: roundsByPlayer.get(playerId)!,
      courtShareCents,
      extrasCents,
      extras: itemised,
      totalCents,
      paidCents,
      netCents: totalCents - paidCents,
    };
  });

  const balances: Balance[] = perPlayer.map(({ playerId, netCents }) => ({ playerId, netCents }));

  return {
    courtCostCents,
    extrasCostCents,
    grandTotalCents: courtCostCents + extrasCostCents,
    totalHours,
    perPlayer,
    settlements: settle(balances),
  };
}
