import { format, startOfWeek, endOfWeek } from "date-fns";

export const WEEK_STARTS_ON = 1 as const;

export function startOfWeekMon(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

export function endOfWeekMon(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

/** Returns the Monday-anchored week start of a date as a "yyyy-MM-dd" string. */
export function getWeekStart(date: Date): string {
  return format(startOfWeekMon(date), "yyyy-MM-dd");
}
