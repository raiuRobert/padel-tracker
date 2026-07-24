/**
 * Currencies the group can be billed in. Pure — no React, no DOM — so both the UI and any future
 * platform can share it.
 *
 * Every listed currency uses two minor-unit decimals, which lets the whole app keep treating money
 * as integer "cents" (hundredths) regardless of the currency chosen. A zero-decimal currency like
 * JPY or HUF would break that assumption, so those are deliberately not offered.
 */
export const CURRENCIES = [
  { code: "EUR", symbol: "€" },
  { code: "RON", symbol: "lei" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "PLN", symbol: "zł" },
  { code: "CHF", symbol: "CHF" },
  { code: "BGN", symbol: "лв" },
  { code: "MDL", symbol: "L" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

/** What the app used before currencies were selectable, so migrated sessions stay in euros. */
export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value);
}

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

/**
 * Integer cents to a display string in the given currency, formatted for the locale — so a
 * Romanian sees "12,50 lei" and an English speaker "RON 12.50". Falls back to a plain rendering if
 * the runtime doesn't know the currency.
 */
export function formatMoney(cents: number, currency: CurrencyCode, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    const sign = cents < 0 ? "-" : "";
    const absolute = Math.abs(cents);
    return `${sign}${currencySymbol(currency)}${(absolute / 100).toFixed(2)}`;
  }
}
