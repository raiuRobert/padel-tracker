"use client";

import { useI18n } from "@/i18n";
import type { StandingsRow } from "@/lib/standings";

/**
 * The leaderboard, read as a scoreboard: points are the loudest thing on the row and everything
 * else is supporting detail. A list rather than a table, because five numeric columns don't fit a
 * phone and only one of them ever gets argued about.
 */
export function StandingsTable({
  rows,
  nameOf,
}: {
  rows: readonly StandingsRow[];
  nameOf: (id: string) => string;
}) {
  const { t } = useI18n();
  const leader = rows[0]?.points ?? 0;

  return (
    <ol className="space-y-1">
      {rows.map((row, index) => {
        const first = index === 0 && row.points > 0;
        return (
          <li
            key={row.playerId}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 ${first ? "bg-accent/10" : "bg-surface"}`}
          >
            <span
              className={`score-figure w-5 shrink-0 text-center text-sm ${
                first ? "text-accent" : "text-muted"
              }`}
            >
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold tracking-tight">{nameOf(row.playerId)}</p>
              <p className="mt-1 text-xs text-muted tabular-nums">
                {row.sitOuts > 0
                  ? t("standings.recordWithSitOuts", {
                      played: row.roundsPlayed,
                      wins: row.points,
                      losses: row.losses,
                      sitOuts: row.sitOuts,
                    })
                  : t("standings.record", {
                      played: row.roundsPlayed,
                      wins: row.points,
                      losses: row.losses,
                    })}
              </p>
              {/* A bar makes the gap at the top of the table legible at a glance. */}
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-raised" aria-hidden>
                <div
                  className={`h-full rounded-full ${first ? "bg-accent" : "bg-muted/50"}`}
                  style={{ width: leader > 0 ? `${(row.points / leader) * 100}%` : "0%" }}
                />
              </div>
            </div>

            <span
              className={`score-figure shrink-0 text-3xl ${first ? "text-accent" : "text-ink"}`}
            >
              {row.points}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
