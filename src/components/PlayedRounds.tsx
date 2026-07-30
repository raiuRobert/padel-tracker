"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import type { SessionRound } from "@/lib/domain";
import type { MatchResult } from "@/lib/standings";
import { MatchSummary, RoundBoard } from "./RoundBoard";
import { Button, Card } from "./ui";

/**
 * The rounds already scored, each one correctable.
 *
 * Getting a result wrong is ordinary — a mis-tap, or the group disagreeing about a round once
 * they're sitting down afterwards — so a played round stays editable for as long as the session
 * exists, finished or not.
 *
 * Corrections go through the round rather than the table: the standings and the rotations each
 * player is billed for are both derived from these results, and nothing should be able to make them
 * disagree with the games people remember playing.
 */
export function PlayedRounds({
  rounds,
  courts,
  nameOf,
  onSave,
}: {
  /** Scored rounds in play order. Shown newest first. */
  rounds: readonly SessionRound[];
  courts: number;
  nameOf: (id: string) => string;
  onSave: (round: SessionRound, results: MatchResult[]) => Promise<void>;
}) {
  const { t } = useI18n();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  async function save(round: SessionRound, results: MatchResult[]) {
    await onSave(round, results);
    setEditingIndex(null);
  }

  return (
    <div className="space-y-1">
      {[...rounds].reverse().map((round) =>
        editingIndex === round.index ? (
          <div key={round.index}>
            <p className="eyebrow mb-2 text-muted">{t("play.editingRound", { number: round.index + 1 })}</p>
            <RoundBoard
              round={round}
              courts={courts}
              nameOf={nameOf}
              onSave={(results) => save(round, results)}
              saveLabel={t("play.updateRound")}
            />
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setEditingIndex(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          // Newest first, so a round that has just been scored lifts in at the top of the list.
          <Card key={round.index} className="rise-in p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="eyebrow text-muted">{t("play.round", { number: round.index + 1 })}</span>
              {/*
                A pencil rather than the bare word it used to be. Correcting a result is the thing
                people come looking for after the game, usually mid-argument, and a line of small
                grey text reads as a label rather than something you can press.
              */}
              <Button
                variant="ghost"
                className="h-8 min-h-8 gap-1.5 px-2 text-[0.65rem]"
                onClick={() => setEditingIndex(round.index)}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
                </svg>
                {t("common.edit")}
              </Button>
            </div>
            {round.matches.map((match) => (
              <MatchSummary
                key={match.court}
                match={match}
                result={round.results.find((r) => r.court === match.court)}
                nameOf={nameOf}
                courts={courts}
              />
            ))}
            {round.sittingOut.length > 0 ? (
              <p className="mt-2 text-xs text-muted">
                {t("play.benchList", { names: round.sittingOut.map(nameOf).join(", ") })}
              </p>
            ) : null}
          </Card>
        ),
      )}
    </div>
  );
}
