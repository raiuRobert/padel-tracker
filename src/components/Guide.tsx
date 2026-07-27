"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useData } from "@/app/providers";
import { useI18n, type MessageKey } from "@/i18n";
import { Button } from "./ui";

const GUIDE_KEY = "padel-tracker.guideSeen";

/**
 * The introductory guide.
 *
 * It opens itself once, while the roster is still empty, and can be reopened from the header at any
 * time — a walkthrough you can only ever see once isn't much use the moment you actually have a
 * question. Six short sections rather than one screen: the two rotation modes and the way the bill
 * is split are the parts nobody guesses, and cramming them into bullets is what made the old
 * welcome dialog decorative rather than useful.
 */
const GuideContext = createContext<(() => void) | null>(null);

/** Opens the guide on demand. Available anywhere under `GuideProvider`. */
export function useGuide(): () => void {
  const open = useContext(GuideContext);
  if (!open) throw new Error("useGuide must be used inside a GuideProvider.");
  return open;
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const { ready, players } = useData();
  const [open, setOpen] = useState(false);
  const [autoShown, setAutoShown] = useState(false);

  // Show it unprompted only to someone who hasn't got started yet, and only once.
  useEffect(() => {
    if (!ready || autoShown) return;
    if (players.length > 0) return;
    if (window.localStorage.getItem(GUIDE_KEY) === "1") return;
    const id = requestAnimationFrame(() => {
      setAutoShown(true);
      setOpen(true);
    });
    return () => cancelAnimationFrame(id);
  }, [ready, players.length, autoShown]);

  const show = useCallback(() => setOpen(true), []);

  const close = useCallback(() => {
    window.localStorage.setItem(GUIDE_KEY, "1");
    setOpen(false);
  }, []);

  return (
    <GuideContext.Provider value={show}>
      {children}
      {open ? <GuideDialog onClose={close} /> : null}
    </GuideContext.Provider>
  );
}

/** A button for the header. Always available, so the guide is never a one-time thing. */
export function GuideButton() {
  const show = useGuide();
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={show}
      aria-label={t("guide.open")}
      title={t("guide.open")}
      className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors
                 hover:bg-raised hover:text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17.2v.1" />
      </svg>
    </button>
  );
}

interface Step {
  title: MessageKey;
  body: MessageKey;
  note?: MessageKey;
  icon: ReactNode;
  extra?: ReactNode;
}

const ICON = {
  wave: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M5 6.5c3 2.5 4.5 6.5 4 11M19 6.5c-3 2.5-4.5 6.5-4 11" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 6.6a3.2 3.2 0 0 1 0 6.3M17.5 14.8c2 .6 3.4 2.4 3.4 4.7" />
    </>
  ),
  rotate: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" />
      <path d="M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16" />
      <path d="M4 20v-4h4" />
    </>
  ),
  tap: (
    <>
      <path d="M9 11V6.2a2.1 2.1 0 0 1 4.2 0V13" />
      <path d="M13.2 12.4a2 2 0 0 1 4 0v1M17.2 13.4a2 2 0 0 1 4 0v3a5 5 0 0 1-5 5h-2.6a5 5 0 0 1-3.8-1.7L6 16.4a2 2 0 0 1 3-2.6" />
    </>
  ),
  coins: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M14.5 9.5c-.6-.9-1.6-1.2-2.6-1.2-1.3 0-2.4.7-2.4 1.9 0 2.6 5 1.4 5 4 0 1.3-1.2 2-2.6 2-1.1 0-2.1-.4-2.7-1.3" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" />
    </>
  ),
} as const;

/** The three things the app does, on the opening step. */
function WelcomePoints() {
  const { t } = useI18n();
  const points: MessageKey[] = ["guide.welcomeRotations", "guide.welcomeScores", "guide.welcomeCosts"];
  return (
    <ul className="mt-4 space-y-2">
      {points.map((key, i) => (
        <li
          key={key}
          style={{ "--stagger": i + 1 } as React.CSSProperties}
          className="rise-in flex gap-2.5 text-sm text-muted"
        >
          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
          {t(key)}
        </li>
      ))}
    </ul>
  );
}

/** The two modes side by side — the distinction is the whole point, so it gets shown, not described. */
function RotationModes() {
  const { t } = useI18n();
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {(
        [
          ["guide.rotationAmericano", "guide.rotationAmericanoBody"],
          ["guide.rotationMexicano", "guide.rotationMexicanoBody"],
        ] as [MessageKey, MessageKey][]
      ).map(([title, body], i) => (
        <div
          key={title}
          style={{ "--stagger": i + 1 } as React.CSSProperties}
          className="rise-in rounded-lg bg-raised p-3"
        >
          <p className="eyebrow text-accent">{t(title)}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{t(body)}</p>
        </div>
      ))}
    </div>
  );
}

/** A miniature of the real scoring control, so the interaction is recognised before it's met. */
function ScoringPreview() {
  return (
    <div className="mt-4 space-y-1.5" aria-hidden>
      <div className="flex items-center justify-between rounded-lg bg-team-a px-3 py-2.5 text-sm font-bold text-canvas">
        <span>Ana &amp; Ben</span>
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12.5 9.5 18 20 6.5" />
        </svg>
      </div>
      <div className="rounded-lg bg-raised px-3 py-2.5 text-sm font-bold text-team-b opacity-45">
        Cleo &amp; Dan
      </div>
    </div>
  );
}

const STEPS: Step[] = [
  { title: "guide.welcomeTitle", body: "guide.welcomeBody", icon: ICON.wave, extra: <WelcomePoints /> },
  { title: "guide.playersTitle", body: "guide.playersBody", note: "guide.playersNote", icon: ICON.people },
  { title: "guide.rotationTitle", body: "guide.rotationBody", icon: ICON.rotate, extra: <RotationModes /> },
  {
    title: "guide.scoringTitle",
    body: "guide.scoringBody",
    note: "guide.scoringNote",
    icon: ICON.tap,
    extra: <ScoringPreview />,
  },
  { title: "guide.costsTitle", body: "guide.costsBody", note: "guide.costsNote", icon: ICON.coins },
  { title: "guide.shareTitle", body: "guide.shareBody", note: "guide.shareNote", icon: ICON.share },
];

function GuideDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const first = index === 0;
  const last = index === STEPS.length - 1;

  function next() {
    if (last) {
      onClose();
      router.push("/roster");
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div
      className="fade-in fixed inset-0 z-40 flex items-end justify-center bg-canvas/85 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowRight" && !last) setIndex((i) => i + 1);
        if (e.key === "ArrowLeft" && !first) setIndex((i) => i - 1);
      }}
    >
      <div className="spring-in flex w-full max-w-md flex-col rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"
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
              {step.icon}
            </svg>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("guide.close")}
            className="-mt-1 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted
                       hover:bg-raised hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/*
          Keyed on the step so the content remounts and lifts in — the panel stays put while what's
          inside it changes, which reads as moving through one guide rather than as new dialogs.
        */}
        <div key={index} className="rise-in min-h-[13.5rem]">
          <h2 id="guide-title" className="text-xl font-black tracking-tight text-ink">
            {t(step.title)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t(step.body)}</p>
          {step.extra}
          {step.note ? (
            <p className="mt-4 rounded-lg bg-raised px-3 py-2.5 text-xs leading-relaxed text-muted">
              {t(step.note)}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex flex-1 gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-5 bg-accent" : "w-1.5 bg-line hover:bg-muted"
                }`}
              />
            ))}
          </span>
          <span className="sr-only" aria-live="polite">
            {t("guide.step", { current: index + 1, total: STEPS.length })}
          </span>

          {first ? (
            <Button variant="ghost" className="h-10 min-h-10 px-3 text-xs" onClick={onClose}>
              {t("guide.skip")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-10 min-h-10 px-3 text-xs"
              onClick={() => setIndex((i) => i - 1)}
            >
              {t("guide.back")}
            </Button>
          )}
          <Button className="h-10 min-h-10 px-4 text-xs" onClick={next}>
            {last ? t("guide.finish") : t("guide.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
