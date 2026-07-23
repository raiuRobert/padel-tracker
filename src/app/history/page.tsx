"use client";

import Link from "next/link";
import { Badge, Button, ButtonLink, Card, EmptyState, Loading, PageTitle } from "@/components/ui";
import { formatDate, formatMoney, pluralise } from "@/lib/format";
import { scoredRoundCount, sessionCostSplit } from "@/lib/session";
import { useData } from "../providers";

export default function HistoryPage() {
  const { ready, sessions, groups, removeSession } = useData();

  if (!ready) return <Loading />;

  if (sessions.length === 0) {
    return (
      <>
        <PageTitle title="History" />
        <EmptyState icon="🗓️" title="No sessions yet" action={<ButtonLink href="/">Start a session</ButtonLink>}>
          Every session you play is kept here, with its standings and cost split.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageTitle title="History" subtitle={pluralise(sessions.length, "session")} />

      <div className="space-y-2">
        {sessions.map((session) => {
          const split = sessionCostSplit(session);
          const group = groups.find((g) => g.id === session.groupId);
          return (
            <Card key={session.id} className="flex items-center gap-2 p-4">
              <Link href={`/session/${session.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{formatDate(session.date)}</p>
                  {session.status === "active" ? <Badge tone="accent">live</Badge> : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {group ? `${group.name} · ` : ""}
                  <span className="capitalize">{session.mode}</span> ·{" "}
                  {pluralise(scoredRoundCount(session), "round")}
                </p>
              </Link>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-muted">
                {formatMoney(split.grandTotalCents)}
              </span>
              <Button
                variant="danger"
                className="h-9 min-h-9 shrink-0 px-2 text-sm"
                aria-label={`Delete session on ${formatDate(session.date)}`}
                onClick={() => {
                  if (window.confirm(`Delete the session on ${formatDate(session.date)}? This can't be undone.`)) {
                    void removeSession(session.id);
                  }
                }}
              >
                ✕
              </Button>
            </Card>
          );
        })}
      </div>
    </>
  );
}
