import { describe, expect, it } from "vitest";
import { courtCostCents, ratePerHourCents } from "./booking";
import type { CourtBooking } from "./types";

describe("courtCostCents", () => {
  it("multiplies the hourly rate by the hours", () => {
    expect(courtCostCents(2100, 2)).toBe(4200);
    expect(courtCostCents(1000, 1.5)).toBe(1500);
  });

  it("rounds a fractional total to whole cents", () => {
    // 3333c/hr for 1.5h is 4999.5c — has to land on a whole cent.
    expect(courtCostCents(3333, 1.5)).toBe(5000);
  });

  it("is free when the rate is zero", () => {
    expect(courtCostCents(0, 2)).toBe(0);
  });
});

describe("ratePerHourCents", () => {
  it("returns the stored rate when there is one", () => {
    const booking: CourtBooking = { court: 1, costCents: 4200, hours: 2, ratePerHourCents: 2100 };
    expect(ratePerHourCents(booking)).toBe(2100);
  });

  it("recovers the rate from the total for sessions saved before per-hour pricing", () => {
    const legacy: CourtBooking = { court: 1, costCents: 4200, hours: 2 };
    expect(ratePerHourCents(legacy)).toBe(2100);
  });

  it("treats a zero-hour booking's total as the rate rather than dividing by zero", () => {
    const booking: CourtBooking = { court: 1, costCents: 3000, hours: 0 };
    expect(ratePerHourCents(booking)).toBe(3000);
  });
});
