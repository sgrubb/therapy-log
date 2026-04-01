import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export function useSortableTable<K extends string>(defaultKey: K, defaultDir: "asc" | "desc" = "asc") {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);

  function handleSort(key: K) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: K) {
    if (sortKey !== key) {
      return null;
    }
    return sortDir === "asc"
      ? <ArrowUp size={12} className="ml-1 inline" />
      : <ArrowDown size={12} className="ml-1 inline" />;
  }

  return { sortKey, sortDir, handleSort, sortIndicator };
}
