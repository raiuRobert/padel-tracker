"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import type { SessionRound } from "@/lib/domain";
import { formatPair } from "@/lib/format";
import type { Match, Side } from "@/lib/rotation/types";
import type { MatchResult } from "@/lib/standings";
import { Button, Card } from "./ui";

/**
 * A round, with score entry.
 *
 * A game is won outright by one team, so entering a result is a single tap on the team that won —
 * one tap per court, then save. No numbers to dial in between points.
 */

type Winners = Record<number, Side | undefined>;

function initialWinners(round: SessionRound): Winners {
  const winners: Winners = {};
  for (const match of round.matches) {
    winners[match.court] = round.results.find((r) => r.court === match.court)?.winner;
  }
  return winners;
}

const SIDE_STYLES: Record<Side, { idle: string; won: string; text: string }> = {
  A: {
    idle: "bg-raised text-team-a hover:bg-team-a/15",
    won: "bg-team-a text-canvas",
    text: "text-team-a",
  },
  B: {
    idle: "bg-raised text-team-b hover:bg-team-b/15",
    won: "bg-team-b text-canvas",
    text: "text-team-b",
  },
};

/** One big tap target per team. Tapping it declares that team the winner of the game. */
function TeamButton({
  names,
  side,
  won,
  onPick,
}: {
  names: readonly string[];
  side: Side;
  won: boolean;
  onPick: () => void;
}) {
  const { t } = useI18n();
  const label = formatPair(names);
  const styles = SIDE_STYLES[side];

  return (
    <button
      type="button"
      aria-pressed={won}
      aria-label={t("play.winnerLabel", { team: label })}
      onClick={onPick}
      // `pop-in` is applied with the won state, so picking a winner replays the squash every time —
      // including when you change your mind, which is exactly when you want the confirmation.
      className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-lg px-4 text-left
                  font-bold transition-[color,background-color,transform] duration-200 ease-out-quart
                  active:scale-[0.98] ${won ? `${styles.won} pop-in` : styles.idle}`}
    >
      <span className="text-base leading-tight tracking-tight">{label}</span>
      {won ? (
        <span aria-hidden className="badge-in eyebrow shrink-0 rounded bg-canvas/25 px-1.5 py-1">
          {t("play.won")}
        </span>
      ) : (
        // Kept in the layout so declaring a winner doesn't shift the name beside it.
        <span aria-hidden className="eyebrow shrink-0 px-1.5 py-1 opacity-0">
          {t("play.won")}
        </span>
      )}
    </button>
  );
}

export function MatchSummary({
  match,
  result,
  nameOf,
  courts,
}: {
  match: Match;
  result?: MatchResult;
  nameOf: (id: string) => string;
  courts: number;
}) {
  const line = (side: Side, players: readonly string[]) => (
    <span
      className={`truncate ${SIDE_STYLES[side].text} ${
        result ? (result.winner === side ? "font-bold" : "font-medium opacity-45") : "font-medium"
      }`}
    >
      {formatPair(players.map(nameOf))}
    </span>
  );

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      {courts > 1 ? <span className="eyebrow w-6 shrink-0 text-muted">C{match.court}</span> : null}
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {line("A", match.teamA)}
        {/*
          A lowercase "v" between two names was nearly invisible against the team colours. Set as a
          small chip it reads as a divider at a glance and gives the row a scoreboard cadence.
        */}
        <span className="shrink-0 rounded bg-raised px-1.5 py-0.5 text-[0.6rem] font-black tracking-widest text-muted">
          VS
        </span>
        {line("B", match.teamB)}
      </span>
    </div>
  );
}

export function RoundBoard({
  round,
  courts,
  nameOf,
  onSave,
  saveLabel,
}: {
  round: SessionRound;
  courts: number;
  nameOf: (id: string) => string;
  onSave: (results: MatchResult[]) => Promise<void> | void;
  saveLabel?: string;
}) {
  const { t } = useI18n();
  const [winners, setWinners] = useState<Winners>(() => initialWinners(round));
  const [saving, setSaving] = useState(false);

  const complete = round.matches.every((match) => winners[match.court] !== undefined);

  async function save() {
    if (!complete) return;
    setSaving(true);
    try {
      await onSave(round.matches.map((match) => ({ court: match.court, winner: winners[match.court]! })));
    } finally {
      setSaving(false);
    }
  }

  return (
    // The play screen keys this on the round index, so a saved round remounts the board and the
    // next one lifts in — the session visibly moves on rather than the contents swapping silently.
    <Card className="rise-in p-4">
      {round.sittingOut.length > 0 ? (
        <p className="mb-4 rounded-lg bg-raised px-3 py-2.5 text-sm">
          <span className="eyebrow mr-2 text-muted">{t("play.sittingOut")}</span>
          <span className="font-semibold">{round.sittingOut.map(nameOf).join(", ")}</span>
        </p>
      ) : null}

      <p className="eyebrow mb-3 text-muted">{t("play.tapWinner")}</p>

      <div className="space-y-5">
        {round.matches.map((match) => (
          <div key={match.court}>
            {courts > 1 ? (
              <p className="eyebrow mb-2 text-muted">{t("play.court", { number: match.court })}</p>
            ) : null}
            <div className="space-y-1.5">
              <TeamButton
                names={match.teamA.map(nameOf)}
                side="A"
                won={winners[match.court] === "A"}
                onPick={() => setWinners((current) => ({ ...current, [match.court]: "A" }))}
              />
              <TeamButton
                names={match.teamB.map(nameOf)}
                side="B"
                won={winners[match.court] === "B"}
                onPick={() => setWinners((current) => ({ ...current, [match.court]: "B" }))}
              />
            </div>
          </div>
        ))}
      </div>

      <Button className="mt-5 w-full" disabled={!complete || saving} onClick={() => void save()}>
        {saving ? t("common.saving") : (saveLabel ?? t("play.saveRound"))}
      </Button>
    </Card>
  );
}
