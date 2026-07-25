import { describe, expect, it } from "vitest";
import { LOCALES, messages, plurals, type Locale } from "./messages";

/**
 * Guards against the ways a translated string goes wrong *silently* — the kind that only shows up
 * when a real user hits a particular count and sees "1 jucători nu încap".
 *
 * TypeScript already forces both locales to define the same keys. What it can't see is whether the
 * text inside them still agrees with the numbers it will be handed, which is what these check.
 */

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholdersIn(template: string): Set<string> {
  return new Set([...template.matchAll(PLACEHOLDER)].map((m) => m[1]));
}

/** The plural categories a locale actually uses, straight from CLDR rather than assumed. */
function categoriesFor(locale: Locale): string[] {
  return new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
}

describe("message catalogue", () => {
  it("defines the same keys in every locale", () => {
    const reference = Object.keys(messages.en).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(messages[locale]).sort(), locale).toEqual(reference);
    }
  });

  /**
   * A placeholder present in one locale but not another renders as literal "{count}" on screen for
   * whichever language was missed — or silently drops the number for the other.
   */
  it("uses the same placeholders for a key in every locale", () => {
    for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
      const expected = [...placeholdersIn(messages.en[key])].sort();
      for (const locale of LOCALES) {
        expect([...placeholdersIn(messages[locale][key])].sort(), `${locale} · ${key}`).toEqual(expected);
      }
    }
  });

  it("has no empty messages", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(messages[locale])) {
        expect(value.trim(), `${locale} · ${key}`).not.toBe("");
      }
    }
  });

  /**
   * Nothing should splice a bare count into a sentence whose other words have to agree with it —
   * that's what `plurals` is for. Romanian inflects nouns *and* participles, so a message holding a
   * raw `{count}` next to a fixed noun is broken for at least one number.
   */
  it("never interpolates a bare {count} into a message", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(messages[locale])) {
        expect(placeholdersIn(value).has("count"), `${locale} · ${key} should use a plural form`).toBe(
          false,
        );
      }
    }
  });
});

describe("plural forms", () => {
  it("defines every plural category the locale actually uses", () => {
    for (const locale of LOCALES) {
      const required = categoriesFor(locale);
      for (const [key, forms] of Object.entries(plurals[locale])) {
        for (const category of required) {
          // A missing category falls back to `other`, which in Romanian means 3 would be rendered
          // with the 20+ form: "3 de jucători".
          expect(Object.hasOwn(forms, category), `${locale} · ${key} · missing "${category}"`).toBe(true);
        }
      }
    }
  });

  it("keeps the count visible in every form that isn't the singular", () => {
    for (const locale of LOCALES) {
      for (const [key, forms] of Object.entries(plurals[locale])) {
        for (const [category, template] of Object.entries(forms)) {
          if (category === "one" || template === undefined) continue;
          expect(template, `${locale} · ${key} · ${category}`).toContain("{count}");
        }
      }
    }
  });

  /** Romanian needs the linking "de" from 20 up: "20 de jucători", never "20 jucători". */
  it("uses the Romanian linking particle in the 20-and-over form", () => {
    for (const [key, forms] of Object.entries(plurals.ro)) {
      expect(forms.other, `ro · ${key}`).toMatch(/\{count\} de /);
    }
  });

  it("renders a sensible phrase at every boundary of every locale's rules", () => {
    // 1 / 2 / 19 / 20 / 101 straddle every Romanian category change, and 0 is reachable in the UI.
    const counts = [0, 1, 2, 3, 19, 20, 21, 101];
    for (const locale of LOCALES) {
      const rules = new Intl.PluralRules(locale);
      for (const [key, forms] of Object.entries(plurals[locale])) {
        for (const count of counts) {
          const category = rules.select(count) as keyof typeof forms;
          const template = forms[category] ?? forms.other;
          const rendered = template.replace("{count}", String(count));
          expect(rendered, `${locale} · ${key} · ${count}`).not.toContain("{");
          // The number has to survive into the output, including where the form hardcodes "1".
          expect(rendered, `${locale} · ${key} · ${count}`).toMatch(new RegExp(`\\b${count}\\b`));
        }
      }
    }
  });
});
