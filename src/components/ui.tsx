import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Shared primitives, styled as a scoreboard rather than a dashboard: flat surfaces, square-ish
 * corners, all-caps section labels, and type doing the work that borders used to. Everything is
 * sized for a thumb — 44px minimum targets, no hover-only affordances.
 */

// `soft` is a positive action that isn't the screen's primary one — accent-coloured so its intent is
// obvious, but tinted rather than filled so it never competes with the solid accent button.
type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";

// `active:scale` gives the press somewhere to go. It's the cheapest possible touch feedback and on
// a phone it's the difference between a button and a picture of a button.
const BUTTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold " +
  "uppercase tracking-wide transition-[color,background-color,transform] duration-150 " +
  "ease-out-quart active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 " +
  "disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-accent";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent/90 active:bg-accent/80",
  secondary: "bg-raised text-ink hover:bg-line",
  soft: "bg-accent/12 text-accent hover:bg-accent/20",
  ghost: "text-muted hover:text-ink hover:bg-raised",
  danger: "bg-transparent text-danger hover:bg-danger/10",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />;
}

/** A flat panel. No border — the background step is enough separation on a dark canvas. */
export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-xl bg-surface ${className}`} {...props} />;
}

/** Section heading: an accent tick, an all-caps label, and optional action on the right. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="eyebrow flex items-center gap-2 text-muted">
        <span aria-hidden className="h-3.5 w-0.5 rounded-full bg-accent" />
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs leading-snug text-muted">{hint}</span> : null}
    </label>
  );
}

const INPUT_CLASS =
  "w-full min-h-12 rounded-lg bg-raised px-3.5 text-base font-medium text-ink " +
  "placeholder:font-normal placeholder:text-muted/60 outline-2 outline-transparent " +
  "focus:outline-accent";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${INPUT_CLASS} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${INPUT_CLASS} ${className}`} {...props} />;
}

/** A row of mutually exclusive choices — easier to hit than a native select on a phone. */
export function ChoiceGroup<T extends string | number>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T;
  options: readonly { value: T; label: string; sublabel?: string }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-12 rounded-lg px-2 py-2 text-sm font-bold transition-[color,background-color,transform]
                        duration-150 ease-out-quart active:scale-[0.97] ${
                          selected ? "bg-accent text-accent-ink" : "bg-raised text-muted hover:text-ink"
                        }`}
          >
            <span className="block">{option.label}</span>
            {option.sublabel ? (
              <span className="mt-0.5 block text-[0.65rem] font-semibold tracking-wide uppercase opacity-70">
                {option.sublabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rise-in rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-base font-bold tracking-tight text-ink">{title}</p>
      {children ? <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">{children}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" }) {
  const tones = {
    muted: "bg-raised text-muted",
    accent: "bg-accent/20 text-accent",
  };
  return <span className={`eyebrow rounded px-2 py-1 ${tones[tone]}`}>{children}</span>;
}

const ALERT_TONES = {
  danger: {
    box: "border-danger/50 bg-danger/15 text-danger",
    icon: <path d="M12 3.5 22 20H2L12 3.5ZM12 9.5v4.5M12 17.2v.1" />,
  },
  success: {
    box: "border-accent/50 bg-accent/12 text-accent",
    icon: <path d="M4 12.5 9.5 18 20 6.5" />,
  },
} as const;

/**
 * A prominent inline message. `danger` is a red banner for warnings — not enough players for a
 * court, and anything else that should stop someone in their tracks — so they read as warnings at a
 * glance rather than as quiet grey hints.
 */
export function Alert({ tone = "danger", children }: { tone?: keyof typeof ALERT_TONES; children: ReactNode }) {
  const { box, icon } = ALERT_TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-semibold ${box}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="mt-px size-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {icon}
      </svg>
      <span className="leading-snug">{children}</span>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-7">
      <h1 className="text-3xl font-black tracking-tighter text-ink">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function Loading({ label }: { label: string }) {
  return <p className="eyebrow py-16 text-center text-muted">{label}</p>;
}
