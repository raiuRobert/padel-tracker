import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { Session } from "@/lib/domain";

/**
 * Brings sessions written by older versions of the app up to the current shape.
 *
 * Sessions live in the browser and there's no server to run a migration against, so this happens on
 * read. It's deliberately tolerant: a session that can't be fully understood should still open with
 * whatever survived, rather than taking someone's evening of results down with it.
 */

/** How rounds were scored before games were replaced by a single winning team. */
interface LegacyResult {
  court: number;
  teamAGames?: number;
  teamBGames?: number;
  winner?: "A" | "B";
}

function migrateResult(result: LegacyResult) {
  if (result.winner === "A" || result.winner === "B") {
    return { court: result.court, winner: result.winner };
  }

  const a = result.teamAGames ?? 0;
  const b = result.teamBGames ?? 0;
  // Games used to be able to draw; there's no way to record that now, so a drawn round becomes an
  // unscored one rather than inventing a winner.
  if (a === b) return null;
  return { court: result.court, winner: a > b ? ("A" as const) : ("B" as const) };
}

export function migrateSession(session: Session): Session {
  const raw = session as Session & { gamesToWin?: number };

  const rounds = (session.rounds ?? []).map((round) => ({
    ...round,
    results: ((round.results ?? []) as unknown as LegacyResult[])
      .map(migrateResult)
      .filter((result) => result !== null),
  }));

  // Sessions predating selectable currencies were all billed in euros.
  const needsCurrency = raw.currency === undefined;
  // Sessions predating shared links have no participant snapshot; on this device the local roster
  // still resolves their names, so an empty snapshot is enough to bring the shape up to date.
  const needsParticipants = raw.participants === undefined;

  /**
   * A payer who isn't playing.
   *
   * Session setup used to keep the chosen payer even if that player was then dropped from the
   * line-up, so some stored sessions name a payer they don't contain. The cost split refuses to
   * work with one — correctly, since there's no share to charge them — but it's a stored session,
   * so refusing means every screen that totals it up throws, including the home page. Forgetting
   * who paid is recoverable in a way that a crash isn't: the session then simply has no payer, and
   * one can be set again on the costs screen.
   */
  const payerMissing = raw.paidBy !== undefined && !(session.playerIds ?? []).includes(raw.paidBy);

  const changed =
    raw.gamesToWin !== undefined ||
    needsCurrency ||
    needsParticipants ||
    payerMissing ||
    rounds.some((round, i) => round.results.length !== session.rounds[i].results.length) ||
    rounds.some((round, i) =>
      round.results.some((result, j) => result.winner !== session.rounds[i].results[j]?.winner),
    );

  if (!changed) return session;

  const migrated: Session & { gamesToWin?: number } = {
    ...raw,
    rounds,
    currency: raw.currency ?? DEFAULT_CURRENCY,
    participants: raw.participants ?? [],
  };
  delete migrated.gamesToWin;
  if (payerMissing) delete (migrated as { paidBy?: string }).paidBy;
  return migrated;
}
