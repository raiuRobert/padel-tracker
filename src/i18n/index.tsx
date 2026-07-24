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
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatMoney,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency";
import { LOCALES, messages, plurals, type Locale, type MessageKey, type PluralKey } from "./messages";

export * from "./messages";

const LOCALE_KEY = "padel-tracker.locale";
const CURRENCY_KEY = "padel-tracker.currency";

interface Prefs {
  locale: Locale;
  /** The currency new sessions default to; each session then stores its own. */
  currency: CurrencyCode;
}

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

/** Guess a currency from the phone's region, so a Romanian phone starts on lei. */
function currencyForLocale(): CurrencyCode {
  const region = navigator.languages?.find((tag) => tag.toLowerCase().startsWith("ro")) ? "RON" : "EUR";
  return isCurrencyCode(region) && CURRENCIES.some((c) => c.code === region) ? region : DEFAULT_CURRENCY;
}

/** Stored choice wins; otherwise follow the phone's language and region. */
function readPrefs(): Prefs {
  const storedLocale = window.localStorage.getItem(LOCALE_KEY);
  const storedCurrency = window.localStorage.getItem(CURRENCY_KEY);
  return {
    locale: isLocale(storedLocale)
      ? storedLocale
      : navigator.languages?.some((tag) => tag.toLowerCase().startsWith("ro"))
        ? "ro"
        : "en",
    currency: isCurrencyCode(storedCurrency) ? storedCurrency : currencyForLocale(),
  };
}

/**
 * Language and default currency are browser state, not React state, so they're read through an
 * external store. That keeps the server-rendered markup and the first client render in agreement
 * without an effect that re-renders everything a beat later.
 */
const listeners = new Set<() => void>();
let snapshot: Prefs | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changing a preference should be picked up here too.
  const onStorage = () => {
    snapshot = readPrefs();
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Prefs {
  snapshot ??= readPrefs();
  return snapshot;
}

const SERVER_PREFS: Prefs = { locale: "en", currency: DEFAULT_CURRENCY };

/** Server and first paint always agree on this; the real choice arrives on hydration. */
function getServerSnapshot(): Prefs {
  return SERVER_PREFS;
}

function set(key: string, next: string, mutate: (prefs: Prefs) => Prefs) {
  window.localStorage.setItem(key, next);
  snapshot = mutate(getSnapshot());
  notify();
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
  /** The default currency for new sessions. */
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  /** Look up a message, substituting any `{placeholders}`. */
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  /** A counted noun in the right form for the locale, e.g. "20 de jucători". */
  n: (key: PluralKey, count: number) => string;
  /** Integer cents to a display string in the given currency, formatted for the locale. */
  money: (cents: number, currency: CurrencyCode) => string;
  formatDate: (iso: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale, currency } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    set(LOCALE_KEY, next, (prefs) => ({ ...prefs, locale: next }));
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    set(CURRENCY_KEY, next, (prefs) => ({ ...prefs, currency: next }));
  }, []);

  const value = useMemo<I18n>(() => {
    const pluralRules = new Intl.PluralRules(locale);

    return {
      locale,
      setLocale,
      currency,
      setCurrency,
      t: (key, values) => interpolate(messages[locale][key], values),
      n: (key, count) => {
        const forms = plurals[locale][key];
        const category = pluralRules.select(count) as keyof typeof forms;
        return interpolate(forms[category] ?? forms.other, { count });
      },
      money: (cents, moneyCurrency) => formatMoney(cents, moneyCurrency, locale),
      formatDate: (iso) => {
        const date = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(date.getTime())) return iso;
        return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
      },
    };
  }, [locale, currency, setLocale, setCurrency]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside an I18nProvider.");
  return context;
}
