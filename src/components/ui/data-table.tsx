import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortDir } from "@/types/enums";

export interface Column<T> {
  key: string;
  label: string;
  sortFn?: (a: T, b: T) => number;
  render: (row: T) => React.ReactNode;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  keyFn: (row: T) => string | number;
  defaultSortKey?: string;
  defaultSortDir?: SortDir;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyFn,
  defaultSortKey,
  defaultSortDir = SortDir.Asc,
  onRowClick,
  emptyMessage = "No results found.",
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string>(defaultSortKey ?? "");
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === SortDir.Asc ? SortDir.Desc : SortDir.Asc));
    } else {
      setSortKey(key);
      setSortDir(SortDir.Asc);
    }
  }

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortFn) {
      return data;
    }
    return [...data].sort((a, b) => {
      const cmp = col.sortFn!(a, b);
      return sortDir === SortDir.Asc ? cmp : -cmp;
    });
  }, [data, columns, sortKey, sortDir]);

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "py-2 pr-4 font-medium last:pr-0",
                  col.sortFn && "hover:text-foreground cursor-pointer select-none",
                )}
                onClick={col.sortFn ? () => handleSort(col.key) : undefined}
              >
                {col.label}
                {col.sortFn && sortKey === col.key && (
                  sortDir === SortDir.Asc
                    ? <ArrowUp size={12} className="ml-1 inline" />
                    : <ArrowDown size={12} className="ml-1 inline" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={keyFn(row)}
              className={cn(
                "border-b transition-colors",
                onRowClick && "hover:bg-muted/50 cursor-pointer",
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-2 pr-4 last:pr-0">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-muted-foreground py-6 text-center">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
