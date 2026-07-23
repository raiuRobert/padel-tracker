"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, ButtonLink, EmptyState, Loading } from "@/components/ui";
import { formatDate, pluralise } from "@/lib/format";
import { scoredRoundCount } from "@/lib/session";
import { useData } from "../../providers";

/** Header and sub-navigation shared by the three views of a live session. */
export default function SessionLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const { ready, sessions } = useData();

  if (!ready) return <Loading />;

  const session = sessions.find((s) => s.id === id);
  if (!session) {
    return (
      <EmptyState icon="🤔" title="Session not found" action={<ButtonLink href="/">Back to start</ButtonLink>}>
        It may have been deleted, or stored in a different browser.
      </EmptyState>
    );
  }

  const tabs = [
    { href: `/session/${id}`, label: "Play" },
    { href: `/session/${id}/standings`, label: "Standings" },
    { href: `/session/${id}/costs`, label: "Costs" },
  ];

  return (
    <>
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{formatDate(session.date)}</h1>
            <p className="mt-1 text-sm text-muted">
              <span className="capitalize">{session.mode}</span> ·{" "}
              {pluralise(session.playerIds.length, "player")} · {pluralise(session.courts, "court")}
            </p>
          </div>
          <Badge tone={session.status === "active" ? "accent" : "muted"}>
            {session.status === "active" ? `${pluralise(scoredRoundCount(session), "round")} in` : "Finished"}
          </Badge>
        </div>

        <nav className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                  active ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}
    </>
  );
}
