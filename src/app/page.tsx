"use client";

import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, Loading, PageTitle, SectionTitle } from "@/components/ui";
import { formatDate, formatMoney, pluralise } from "@/lib/format";
import { scoredRoundCount, sessionCostSplit } from "@/lib/session";
import { useData } from "./providers";

export default function HomePage() {
  const { ready, sessions, activePlayers } = useData();

  if (!ready) return <Loading />;

  const active = sessions.find((session) => session.status === "active");
  const recent = sessions.filter((session) => session.status !== "active").slice(0, 3);

  return (
    <>
      <PageTitle title="Padel Tracker" subtitle="Fair rotations, live scores, an honest split." />

      {active ? (
        <section className="mb-8">
          <SectionTitle>In progress</SectionTitle>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{formatDate(active.date)}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {pluralise(active.playerIds.length, "player")} · {pluralise(active.courts, "court")} ·{" "}
                  <span className="capitalize">{active.mode}</span>
                </p>
              </div>
              <Badge tone="accent">{pluralise(scoredRoundCount(active), "round")} in</Badge>
            </div>
            <ButtonLink href={`/session/${active.id}`} className="mt-5 w-full">
              Continue session
            </ButtonLink>
          </Card>
        </section>
      ) : (
        <section className="mb-8">
          {activePlayers.length < 4 ? (
            <EmptyState
              icon="🎾"
              title="Add your players first"
              action={<ButtonLink href="/roster">Go to roster</ButtonLink>}
            >
              You need at least four people on the roster before you can start a session.
            </EmptyState>
          ) : (
            <Card className="p-5 text-center">
              <p className="text-lg font-bold">Ready to play</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                Pick who turned up, how many courts you have, and how you want to rotate.
              </p>
              <ButtonLink href="/session/new" className="mt-5 w-full">
                Start a session
              </ButtonLink>
            </Card>
          )}
        </section>
      )}

      <section>
        <SectionTitle
          action={
            sessions.length > 0 ? (
              <Link href="/history" className="text-sm font-semibold text-muted hover:text-ink">
                See all
              </Link>
            ) : null
          }
        >
          Recent sessions
        </SectionTitle>

        {recent.length === 0 ? (
          <EmptyState icon="📋" title="No finished sessions yet">
            Once you wrap up a session it shows here, with the final standings and who owes what.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {recent.map((session) => {
              const split = sessionCostSplit(session);
              return (
                <Link key={session.id} href={`/session/${session.id}`} className="block">
                  <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-raised">
                    <div className="min-w-0">
                      <p className="font-semibold">{formatDate(session.date)}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {pluralise(scoredRoundCount(session), "round")} ·{" "}
                        {pluralise(session.playerIds.length, "player")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-muted">
                      {formatMoney(split.grandTotalCents)}
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
