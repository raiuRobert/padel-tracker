"use client";

import { useParams } from "next/navigation";
import { StandingsTable } from "@/components/StandingsTable";
import { EmptyState, SectionTitle } from "@/components/ui";
import { scoredRoundCount, sessionStandings } from "@/lib/session";
import { useData } from "../../../providers";

export default function SessionStandingsPage() {
  const { id } = useParams<{ id: string }>();
  const { sessions, playerName } = useData();

  const session = sessions.find((s) => s.id === id);
  if (!session) return null;

  const played = scoredRoundCount(session);

  if (played === 0) {
    return (
      <EmptyState icon="📊" title="No scores yet">
        Play a round and enter the score — the leaderboard fills in from there.
      </EmptyState>
    );
  }

  return (
    <section>
      <SectionTitle action={<span className="text-xs text-muted">games won</span>}>
        After {played} {played === 1 ? "round" : "rounds"}
      </SectionTitle>
      <StandingsTable rows={sessionStandings(session)} nameOf={playerName} />
    </section>
  );
}
