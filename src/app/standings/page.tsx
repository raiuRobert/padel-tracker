"use client";

import { useMemo, useState } from "react";
import { StandingsTable } from "@/components/StandingsTable";
import { ButtonLink, Card, EmptyState, Loading, PageTitle, SectionTitle } from "@/components/ui";
import { pluralise } from "@/lib/format";
import { toPlayedRounds } from "@/lib/session";
import { combineStandings } from "@/lib/standings";
import { useData } from "../providers";

const ALL = "__all__";

export default function AllTimeStandingsPage() {
  const { ready, sessions, groups, playerName } = useData();
  const [groupId, setGroupId] = useState<string>(ALL);

  const scoped = useMemo(
    () => (groupId === ALL ? sessions : sessions.filter((session) => session.groupId === groupId)),
    [sessions, groupId],
  );

  const rows = useMemo(() => {
    // Everyone who has played at least once in the selected scope, so a retired regular still shows.
    const playerIds = [...new Set(scoped.flatMap((session) => session.playerIds))];
    return combineStandings(playerIds, scoped.map(toPlayedRounds));
  }, [scoped]);

  if (!ready) return <Loading />;

  if (sessions.length === 0) {
    return (
      <>
        <PageTitle title="All-time" />
        <EmptyState icon="🏆" title="No sessions yet" action={<ButtonLink href="/">Start a session</ButtonLink>}>
          Once you’ve played and scored a session, the all-time table builds itself.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageTitle title="All-time" subtitle="Every scored rotation, added up." />

      {groups.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {[{ id: ALL, name: "Everyone" }, ...groups].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={groupId === option.id}
              onClick={() => setGroupId(option.id)}
              className={`min-h-10 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                groupId === option.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-line bg-raised text-muted"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState icon="📭" title="Nothing for this group yet">
          Start a session from this group and its results will collect here.
        </EmptyState>
      ) : (
        <section>
          <SectionTitle action={<span className="text-xs text-muted">games won</span>}>
            {pluralise(scoped.length, "session")}
          </SectionTitle>
          <StandingsTable rows={rows} nameOf={playerName} />
          <Card className="mt-3 p-3 text-center text-xs text-muted">
            Ranked on games won, then game difference.
          </Card>
        </section>
      )}
    </>
  );
}
