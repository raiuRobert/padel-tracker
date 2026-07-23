import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Small shared primitives. Everything is sized for a thumb: 44px minimum tap targets, generous
 * spacing, no hover-only affordances.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-accent";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent/90 active:bg-accent/80",
  secondary: "bg-raised text-ink hover:bg-line active:bg-line/80",
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

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-2xl border border-line bg-surface ${className}`} {...props} />;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const INPUT_CLASS =
  "w-full min-h-11 rounded-xl border border-line bg-raised px-3.5 text-base text-ink " +
  "placeholder:text-muted/60 focus:border-accent focus:outline-none";

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
      className="grid gap-2"
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
            className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${
              selected
                ? "border-accent bg-accent/15 text-accent"
                : "border-line bg-raised text-muted hover:text-ink"
            }`}
          >
            <span className="block">{option.label}</span>
            {option.sublabel ? (
              <span className="mt-0.5 block text-[0.7rem] font-normal opacity-70">{option.sublabel}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon ? <div className="mb-3 text-3xl" aria-hidden>{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      {children ? <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" }) {
  const tones = {
    muted: "border-line bg-raised text-muted",
    accent: "border-accent/40 bg-accent/15 text-accent",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="py-12 text-center text-sm text-muted">{label}</p>;
}
