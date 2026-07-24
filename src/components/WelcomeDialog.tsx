"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { Button } from "./ui";
import { useData } from "@/app/providers";

const WELCOME_KEY = "padel-tracker.welcomeSeen";

/**
 * A one-time welcome for first-time users, shown while the roster is still empty so they learn what
 * the app is for before being asked to add players. Dismissal is remembered, so it doesn't return
 * once they've seen it — even if they later empty the roster.
 */
export function WelcomeDialog() {
  const { ready, players } = useData();
  const { t } = useI18n();
  const router = useRouter();
  const primaryRef = useRef<HTMLButtonElement>(null);

  const [seen, setSeen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(WELCOME_KEY) === "1";
  });

  // Only meaningful once data has loaded and we know the roster is genuinely empty.
  const open = ready && players.length === 0 && !seen;

  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function dismiss() {
    window.localStorage.setItem(WELCOME_KEY, "1");
    setSeen(true);
  }

  function addPlayers() {
    dismiss();
    router.push("/roster");
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-canvas/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") dismiss();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id="welcome-title" className="text-2xl font-black tracking-tighter text-ink">
            {t("welcome.title")}
          </h2>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("welcome.close")}
            className="-mr-1.5 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
          >
            ✕
          </button>
        </div>

        <p className="mb-5 text-sm text-muted">{t("welcome.intro")}</p>

        <ul className="space-y-4">
          <Point icon="rotations" title="welcome.rotationsTitle" body="welcome.rotationsBody" />
          <Point icon="scores" title="welcome.scoresTitle" body="welcome.scoresBody" />
          <Point icon="costs" title="welcome.costsTitle" body="welcome.costsBody" />
        </ul>

        <p className="mt-6 text-sm text-muted">{t("welcome.footer")}</p>

        <div className="mt-6 flex flex-col gap-2">
          <Button ref={primaryRef} onClick={addPlayers} className="w-full">
            {t("welcome.addPlayers")}
          </Button>
          <Button variant="ghost" onClick={dismiss} className="w-full">
            {t("welcome.dismiss")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const ICONS: Record<string, ReactNode> = {
  rotations: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" />
      <path d="M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16" />
      <path d="M4 20v-4h4" />
    </>
  ),
  scores: (
    <>
      <path d="M4 13.5 9 18l11-11" />
    </>
  ),
  costs: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M14.5 9.5c-.6-.9-1.6-1.2-2.6-1.2-1.3 0-2.4.7-2.4 1.9 0 2.6 5 1.4 5 4 0 1.3-1.2 2-2.6 2-1.1 0-2.1-.4-2.7-1.3" />
    </>
  ),
};

function Point({ icon, title, body }: { icon: string; title: MessageKey; body: MessageKey }) {
  const { t } = useI18n();
  return (
    <li className="flex gap-3.5">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ICONS[icon]}
        </svg>
      </span>
      <div>
        <p className="font-bold tracking-tight text-ink">{t(title)}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{t(body)}</p>
      </div>
    </li>
  );
}
