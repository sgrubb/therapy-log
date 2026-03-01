import { useState } from "react";

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
    if (sortKey !== key) return null;
    return <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return { sortKey, sortDir, handleSort, sortIndicator };
}
