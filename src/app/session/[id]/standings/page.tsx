"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { PlayedRounds } from "@/components/PlayedRounds";
import { StandingsTable } from "@/components/StandingsTable";
import { Button, EmptyState, SectionTitle } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { SessionRound } from "@/lib/domain";
import { isRoundScored, scoredRoundCount, sessionStandings } from "@/lib/session";
import type { MatchResult } from "@/lib/standings";
import { useData } from "../../../providers";

export default function SessionStandingsPage() {
  const { id } = useParams<{ id: string }>();
  const { sessions, playerName, recordResults } = useData();
  const { t, n } = useI18n();
  const [correcting, setCorrecting] = useState(false);

  const session = sessions.find((s) => s.id === id);
  if (!session) return null;

  const played = scoredRoundCount(session);

  if (played === 0) {
    return <EmptyState title={t("standings.noScoresTitle")}>{t("standings.noScoresBody")}</EmptyState>;
  }

  async function correct(round: SessionRound, results: MatchResult[]) {
    if (!session) return;
    await recordResults(session.id, round.index, results);
  }

  return (
    <>
      <section>
        <SectionTitle action={<span className="eyebrow text-muted">{t("standings.points")}</span>}>
          {t("standings.after", { rounds: n("round", played) })}
        </SectionTitle>
        <StandingsTable rows={sessionStandings(session)} nameOf={playerName} />
      </section>

      {/*
        Disputes surface here, not on the play screen — this is the table everyone is looking at when
        someone says they won a round the app has down the other way. Rolled up behind a prompt so it
        stays out of the way until it's wanted, since most of the time nothing is wrong.
      */}
      <section className="mt-9">
        {correcting ? (
          <>
            <SectionTitle
              action={
                <Button
                  variant="ghost"
                  className="h-9 min-h-9 px-3 text-xs"
                  onClick={() => setCorrecting(false)}
                >
                  {t("common.done")}
                </Button>
              }
            >
              {t("standings.fixTitle")}
            </SectionTitle>
            <p className="mb-3 text-xs leading-relaxed text-muted">{t("standings.fixHint")}</p>
            <PlayedRounds
              rounds={session.rounds.filter(isRoundScored)}
              courts={session.courts}
              nameOf={playerName}
              onSave={correct}
            />
          </>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setCorrecting(true)}>
            {t("standings.fixPrompt")}
          </Button>
        )}
      </section>
    </>
  );
}
