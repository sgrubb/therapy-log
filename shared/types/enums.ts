export const SortDir = {
  Asc: "asc",
  Desc: "desc",
} as const;
export type SortDir = (typeof SortDir)[keyof typeof SortDir];
