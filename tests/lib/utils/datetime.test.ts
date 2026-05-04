import { describe, it, expect } from "vitest";
import {
  startOfWeekMon,
  endOfWeekMon,
  getWeekStart,
  formatDisplayDate,
} from "@/lib/utils/datetime";

describe("startOfWeekMon", () => {
  it("returns the Monday of the same week for a Wednesday", () => {
    // 2026-02-04 is a Wednesday
    const result = startOfWeekMon(new Date("2026-02-04T15:00:00"));
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(1); // February
  });

  it("returns the same day when given a Monday", () => {
    // 2026-02-02 is a Monday
    const result = startOfWeekMon(new Date("2026-02-02T15:00:00"));
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(2);
  });

  it("returns the previous Monday when given a Sunday", () => {
    // 2026-02-08 is a Sunday — its Monday-week starts on Feb 2
    const result = startOfWeekMon(new Date("2026-02-08T15:00:00"));
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(2);
  });

  it("zeroes the time portion to midnight", () => {
    const result = startOfWeekMon(new Date("2026-02-04T15:30:45"));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe("endOfWeekMon", () => {
  it("returns the Sunday of the same week for a Wednesday", () => {
    // 2026-02-04 is a Wednesday — week ends on Sunday Feb 8
    const result = endOfWeekMon(new Date("2026-02-04T15:00:00"));
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getDate()).toBe(8);
  });

  it("returns the same day when given a Sunday", () => {
    const result = endOfWeekMon(new Date("2026-02-08T15:00:00"));
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(8);
  });

  it("ends at 23:59:59.999", () => {
    const result = endOfWeekMon(new Date("2026-02-04T15:00:00"));
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });
});

describe("getWeekStart", () => {
  it("returns the Monday of the week as a yyyy-MM-dd string", () => {
    expect(getWeekStart(new Date("2026-02-04T15:00:00"))).toBe("2026-02-02");
  });

  it("returns the same date when given a Monday", () => {
    expect(getWeekStart(new Date("2026-02-02T00:00:00"))).toBe("2026-02-02");
  });

  it("returns the previous Monday when given a Sunday", () => {
    expect(getWeekStart(new Date("2026-02-08T23:59:59"))).toBe("2026-02-02");
  });

  it("crosses month boundaries correctly", () => {
    // 2026-03-01 is a Sunday — its Monday is 2026-02-23
    expect(getWeekStart(new Date("2026-03-01T12:00:00"))).toBe("2026-02-23");
  });

  it("crosses year boundaries correctly", () => {
    // 2027-01-01 is a Friday — its Monday is 2026-12-28
    expect(getWeekStart(new Date("2027-01-01T12:00:00"))).toBe("2026-12-28");
  });
});

describe("formatDisplayDate", () => {
  it("formats a date as 'dd MMM yyyy'", () => {
    expect(formatDisplayDate(new Date("2026-02-04T15:00:00"))).toBe("04 Feb 2026");
  });

  it("pads single-digit days with a leading zero", () => {
    expect(formatDisplayDate(new Date("2026-02-04T00:00:00"))).toMatch(/^04 /);
  });

  it("uses three-letter month abbreviations", () => {
    expect(formatDisplayDate(new Date("2026-09-15T00:00:00"))).toBe("15 Sep 2026");
    expect(formatDisplayDate(new Date("2026-12-31T00:00:00"))).toBe("31 Dec 2026");
    expect(formatDisplayDate(new Date("2026-01-01T00:00:00"))).toBe("01 Jan 2026");
  });
});
