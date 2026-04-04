import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export const SortDir = {
  Asc: "asc",
  Desc: "desc",
} as const;
export type SortDir = (typeof SortDir)[keyof typeof SortDir];

export function useSortableTable<K extends string>(defaultKey: K, defaultDir: SortDir = SortDir.Asc) {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  function handleSort(key: K) {
    if (key === sortKey) {
      setSortDir((d) => (d === SortDir.Asc ? SortDir.Desc : SortDir.Asc));
    } else {
      setSortKey(key);
      setSortDir(SortDir.Asc);
    }
  }

  function sortIndicator(key: K) {
    if (sortKey !== key) {
      return null;
    }
    return sortDir === SortDir.Asc
      ? <ArrowUp size={12} className="ml-1 inline" />
      : <ArrowDown size={12} className="ml-1 inline" />;
  }

  return { sortKey, sortDir, handleSort, sortIndicator };
}
