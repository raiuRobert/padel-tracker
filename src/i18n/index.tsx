"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LOCALES, messages, plurals, type Locale, type MessageKey, type PluralKey } from "./messages";

export * from "./messages";

const STORAGE_KEY = "padel-tracker.locale";

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

/** Stored choice wins; otherwise follow the phone's language and fall back to English. */
function readLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) return stored;
  return navigator.languages?.some((tag) => tag.toLowerCase().startsWith("ro")) ? "ro" : "en";
}

/**
 * The chosen language is browser state, not React state, so it's read through an external store.
 * That keeps the server-rendered markup and the first client render in agreement without an effect
 * that re-renders everything a beat later.
 */
const listeners = new Set<() => void>();
let snapshot: Locale | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changing the language should be picked up here too.
  const onStorage = () => {
    snapshot = readLocale();
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Locale {
  snapshot ??= readLocale();
  return snapshot;
}

/** Server and first paint always agree on English; the real choice arrives on hydration. */
function getServerSnapshot(): Locale {
  return "en";
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Look up a message, substituting any `{placeholders}`. */
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  /** A counted noun in the right form for the locale, e.g. "20 de jucători". */
  n: (key: PluralKey, count: number) => string;
  formatDate: (iso: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    snapshot = next;
    notify();
  }, []);

  const value = useMemo<I18n>(() => {
    const pluralRules = new Intl.PluralRules(locale);

    return {
      locale,
      setLocale,
      t: (key, values) => interpolate(messages[locale][key], values),
      n: (key, count) => {
        const forms = plurals[locale][key];
        const category = pluralRules.select(count) as keyof typeof forms;
        return interpolate(forms[category] ?? forms.other, { count });
      },
      formatDate: (iso) => {
        const date = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(date.getTime())) return iso;
        return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside an I18nProvider.");
  return context;
}
