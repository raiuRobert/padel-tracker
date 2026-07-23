import type { StandingsRow } from "@/lib/standings";
import { Card } from "./ui";

/**
 * Leaderboard as a list rather than a table — six numeric columns don't fit a phone, and games won
 * is the only figure anyone actually argues about. The rest is supporting detail.
 */
export function StandingsTable({
  rows,
  nameOf,
}: {
  rows: readonly StandingsRow[];
  nameOf: (id: string) => string;
}) {
  return (
    <Card className="divide-y divide-line">
      {rows.map((row, index) => (
        <div key={row.playerId} className="flex items-center gap-3 p-3.5">
          <span
            className={`w-6 shrink-0 text-center text-sm font-bold tabular-nums ${
              index === 0 ? "text-accent" : "text-muted"
            }`}
          >
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{nameOf(row.playerId)}</p>
            <p className="mt-0.5 text-xs text-muted tabular-nums">
              {row.roundsPlayed} played · {row.matchesWon}W {row.matchesLost}L
              {row.sitOuts > 0 ? ` · sat ${row.sitOuts}` : ""}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-mono text-lg leading-none font-bold tabular-nums">{row.gamesWon}</p>
            <p className="mt-1 text-xs text-muted tabular-nums">
              {row.gameDifference > 0 ? "+" : ""}
              {row.gameDifference}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}
